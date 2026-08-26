---
blog: true
title: "Runner 执行循环"
slug: "runner-执行循环-mscuwj4m"
summary: "树节点：05 Runner执行循环 父节点：05 Session创建与状态机 子节点：无 Runner 执行循环 SessionRunner 是 Opencode 的 心脏 ——它将历史记录转化为 LLM 请求，流式消费响应，持久化事件，执行工具调用，然后循环直到会话自然终止或被中断。 架构总览 Runner 由 6 个协作模块组成： | 文件 | 职责 | | | | | runner/index.ts | 定义 SessionRun"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "05-session创建与状态机-mscun046"
  - "05-context-epoch机制-mscuwj32"
  - "07-消息结构与角色-mscun0k4"
---

> 树节点：05-Runner执行循环
> 父节点：[[05-Session创建与状态机]]
> 子节点：无

# Runner 执行循环

SessionRunner 是 Opencode 的**心脏**——它将历史记录转化为 LLM 请求，流式消费响应，持久化事件，执行工具调用，然后循环直到会话自然终止或被中断。

---

## 架构总览

Runner 由 6 个协作模块组成：

| 文件 | 职责 |
|---|---|
| `runner/index.ts` | 定义 `SessionRunner.Interface`（`run()` 入口）和 `RunError` 联合类型 |
| `runner/llm.ts` (433行) | **主编排器**：外层 `run()` 循环 → 内层 `runTurn()` → `runTurnAttempt()` |
| `runner/to-llm-message.ts` (172行) | 将 V2 Session 消息翻译为 `@opencode-ai/llm` 标准消息 |
| `runner/model.ts` (219行) | 从 Catalog 解析模型、变体、认证凭证 |
| `runner/max-steps.ts` (17行) | 达到最大步数后注入的终止提示 |
| `runner/publish-llm-event.ts` (424行) | 将 LLM 流事件持久化为 Session 事件 |

---

## run() — 外层调度循环

`packages/core/src/session/runner/llm.ts:383-406`

```typescript
const run = Effect.fn("SessionRunner.run")(function* (input) {
  const hasSteer = yield* SessionInput.hasPending(db, input.sessionID, "steer")
  const hasQueue = hasSteer ? false : yield* SessionInput.hasPending(db, input.sessionID, "queue")
  if (!input.force && !hasSteer && !hasQueue) return          // :388-389
  yield* failInterruptedTools(input.sessionID)                 // :390
  let promotion: SessionInput.Delivery | undefined = ...
  let shouldRun = input.force || hasSteer || hasQueue          // :392
  while (shouldRun) {                                          // :393
    let needsContinuation = true
    let step = 1
    while (needsContinuation) {                                // :396
      const result = yield* runTurn(input.sessionID, promotion, step)
      needsContinuation = result.needsContinuation             // :398
      step = result.step + 1                                   // :399
      promotion = "steer"                                       // :400
      if (!needsContinuation)
        needsContinuation = yield* SessionInput.hasPending(db, input.sessionID, "steer") // :401
    }
    shouldRun = yield* SessionInput.hasPending(db, input.sessionID, "queue")  // :403
    promotion = shouldRun ? "queue" : undefined                 // :404
  }
})
```

**关键逻辑**：
- **外层 `while (shouldRun)`**：每次循环处理一个 queued prompt；一个 prompt 可以有多次 tool-call 迭代
- **内层 `while (needsContinuation)`**：工具调用 → 持久化 → 重新加载历史 → 下一轮 provider turn
- **`force` 参数**：即使没有待处理输入也强制执行一次 turn（用于显式运行）
- **promotion 切换**：首次用 `"queue"` 或 `"steer"`，后续迭代用 `"steer"`（steer 优先），queued prompt 结束后检查下一个 queue

---

## runTurn() — 带错误恢复的单 Turn 包装

`packages/core/src/session/runner/llm.ts:369-381`

```typescript
const runTurn: RunTurn = Effect.fnUntraced(function* (sessionID, promotion, step) {
  return yield* runTurnAttempt(sessionID, promotion, step, compaction.compactAfterOverflow).pipe(
    Effect.catchDefect(
      Effect.fnUntraced(function* (defect) {
        if (!(defect instanceof TurnTransitionError)) return yield* Effect.die(defect)
        yield* Effect.yieldNow
        if (defect.transition._tag === "ContinueAfterOverflowCompaction")
          return yield* runAfterOverflowCompaction(sessionID, undefined, defect.transition.step)
        return yield* runTurn(sessionID, undefined, defect.transition.step)  // :377
      }),
    ),
  )
})
```

使用 `TurnTransitionError`（私有 Error 子类，`:158-166`）作为控制流：
- `ContinueAfterCompaction` → 递归调用 `runTurn()` 重新开始
- `ContinueAfterOverflowCompaction` → 调用 `runAfterOverflowCompaction()`（不允许二次 overflow）

`runAfterOverflowCompaction()` (`:355-367`) 类似但更严格：overflow compaction 后如果再次 overflow，直接 die。

---

## runTurnAttempt() — 单次 Provider Turn 的完整流程

`packages/core/src/session/runner/llm.ts:173-348`

### 阶段 1：定位检查与会话加载

```typescript
const session = yield* getSession(sessionID)     // :179
if (session.location.directory !== location.directory || session.location.workspaceID !== location.workspaceID)
  return yield* Effect.interrupt                  // :180-181
```

验证当前 Location 与 Session 的 Location 一致，否则中断。

### 阶段 2：Promotion（提升输入）

```typescript
if (promotion) {                                  // :187
  const cutoff = yield* EventV2.latestSequence(db, session.id)
  if (promotion === "steer")
    promoted = yield* SessionInput.promoteSteers(db, events, session.id, cutoff)  // :190
  if (promotion === "queue") {
    promoted += Number(yield* SessionInput.promoteNextQueued(db, events, session.id)) // :192
    promoted += yield* SessionInput.promoteSteers(db, events, session.id, cutoff)     // :193
  }
  if (promoted > 0) currentStep = 1              // :195
}
```

Steer 输入在 cutoff 之前被提升；queue 模式还额外提升一个排队的 prompt。有提升时重置 `currentStep = 1`。

### 阶段 3：Context Epoch 与 System Prompt

```typescript
const system = initialized ?? (yield* SessionContextEpoch.prepare(db, events, loadSystemContext(agent), session.id)) // :197-198
```

首次运行初始化 Context Epoch baseline；后续运行调用 `prepare()` 进行 reconciliation。详见 [[05-Context-Epoch机制]]。

### 阶段 4：历史加载与消息翻译

```typescript
const entries = yield* SessionHistory.entriesForRunner(db, session.id, system.baselineSeq) // :200
const context = entries.map((entry) => entry.message)   // :201
```

只加载 compaction 边界之后的消息（或 baselineSeq 之后的 system 消息）。消息通过 `toLLMMessages()` (`llm.ts:211`) 翻译为标准 LLM 格式。详见 [[07-消息结构与角色]]。

### 阶段 5：模型解析

```typescript
const model = yield* models.resolve(session)      // :199
```

`model.ts:188-212` 中的 `resolve()`：
1. 查找 session 指定的 model（或 default）
2. 检查是否 supported（`model.ts:175-179` — 仅 `@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）
3. 加载 provider credential（`model.ts:205-211`）
4. 应用 variant 覆盖（`model.ts:104-126`，merge headers/body）
5. 组装认证（`model.ts:83-88`，API key 或 OAuth）
6. 构造 LLM package 的 `Model` 对象（`model.ts:131-169`）

### 阶段 6：步数限制

```typescript
const isLastStep = agent.info?.steps !== undefined && currentStep >= agent.info.steps // :202
const toolMaterialization = isLastStep ? undefined : yield* tools.materialize(agent.info?.permissions) // :203
```

**最后一步**：`toolMaterialization` 为 `undefined`（不提供工具定义），`toolChoice` 设为 `"none"`（`:213`），注入 `MAX_STEPS_PROMPT` 作为 assistant 消息（`:211`）。

### 阶段 7：构造 LLM 请求

```typescript
const request = LLM.request({                      // :205-214
  model,
  providerOptions: { openai: { promptCacheKey } },
  system: [agent.info?.system, system.baseline]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .map(SystemPart.make),
  messages: [...toLLMMessages(context, model), ...(isLastStep ? [Message.assistant(MAX_STEPS_PROMPT)] : [])],
  tools: toolMaterialization?.definitions ?? [],
  toolChoice: isLastStep ? "none" : undefined,
})
```

System prompt 来自两部分：agent 的 system 指令 + Context Epoch 的 baseline。

### 阶段 8：Compaction 检查

```typescript
if (yield* compaction.compactIfNeeded({ sessionID: session.id, entries, model, request }))
  return yield* Effect.die(continueAfterCompaction(currentStep)) // :215-216
```

如果 token 总量超过 context window - buffer，触发 compaction。详见 [[05-Compaction与历史管理]]。

### 阶段 9：LLM 流处理

```typescript
const startSnapshot = yield* snapshots.capture()   // :217
const publisher = createLLMEventPublisher(events, { sessionID, agent, model, snapshot }) // :218
const providerStream = llm.stream(request).pipe(    // :232
  Stream.runForEach((event) =>
    Effect.gen(function* () {
      if (overflowFailure || publisher.hasProviderError()) return  // :235
      if (LLMEvent.is.providerError(event)) {
        if (isContextOverflowFailure(event) && !publisher.hasAssistantStarted()) {
          overflowFailure = event               // :238-239  // 延迟处理
          return
        }
      }
      yield* publish(event)                     // :242
      if (event.type !== "tool-call" || event.providerExecuted) return  // :243
      // 工具调用：fire-and-forget 到 FiberSet，并行执行
      needsContinuation = true                   // :248
      const assistantMessageID = yield* publisher.assistantMessageID(event.id)
      yield* Effect.uninterruptibleMask((restore) =>
        restore(
          toolMaterialization.settle({ ... })    // :252-258  // 执行工具
        ).pipe(
          Effect.flatMap((settlement) =>
            publish(LLMEvent.toolResult({ ... }), settlement.outputPaths) // :260-268
          ),
        ),
      ).pipe(FiberSet.run(toolFibers))           // :271
    }),
  ),
  Effect.ensuring(withPublication(publisher.flush())) // :274
)
```

**核心机制**：
- 每个 LLM 事件通过 `publishLLMEvent()` (`publish-llm-event.ts:239-408`) 持久化为 Session 事件
- **工具调用**设置 `needsContinuation = true`，在 `FiberSet` 中并行 fire-and-forget
- provider-executed 工具（如 OpenAI 的 web_search）不需要本地执行

### 阶段 10：流终止处理

```typescript
return yield* Effect.uninterruptibleMask((restore) =>
  Effect.gen(function* () {
    const stream = yield* restore(providerStream).pipe(Effect.exit)  // :279
    // Overflow recovery
    if (recoverOverflow && !publisher.hasAssistantStarted() && isContextOverflowFailure(...))
      return yield* Effect.die(continueAfterOverflowCompaction(currentStep)) // :287-288
    // LLM 错误处理
    if (overflowFailure) yield* publish(overflowFailure)             // :289
    const llmFailure = failure instanceof LLMError ? failure : undefined
    if (llmFailure && !publisher.hasProviderError()) {
      yield* withPublication(publisher.failUnsettledTools("Provider did not return a tool result", true))
      yield* withPublication(publisher.failAssistant(llmFailure.reason.message))
    }                                                                 // :291-294
    // 等待工具 Fibers 完成
    const settled = yield* restore(awaitToolFibers(toolFibers)).pipe(Effect.exit) // :296
    // 用户拒绝处理
    if (settled._tag === "Failure" && isUserDeclined(settled.cause)) { ... }     // :297-301
    // 中断处理
    if ((stream._tag === "Failure" && Cause.hasInterrupts(...)) || ... ) { ... } // :302-310
    // 工具失败处理
    if (settled._tag === "Failure" && !Cause.hasInterrupts(...)) { ... }         // :311-315
    // Step 结束事件
    const stepSettlement = publisher.stepSettlement()
    if (stepSettlement && !publisher.hasProviderError()) {
      // 捕获 endSnapshot，比较文件变化，发布 SessionEvent.Step.Ended
    }                                                                 // :316-337
    // 返回 needsContinuation
    return { needsContinuation: !publisher.hasProviderError() && needsContinuation, step: currentStep } // :345
  })
)
```

---

## toLLMMessages() — 消息翻译

`packages/core/src/session/runner/to-llm-message.ts:170-171`

```typescript
export const toLLMMessages = (messages: readonly SessionMessage.Message[], model: Model) =>
  messages.flatMap((message) => toLLMMessage(message, model))
```

单条消息翻译 (`:115-167`)：

| Session 消息类型 | LLM 消息角色 | 说明 |
|---|---|---|
| `user` | `user` | 文本 + 文件附件（media content part） |
| `synthetic` | `user` | 直接映射，如 compaction checkpoint |
| `system` | `system` | 系统消息 |
| `shell` | `user` | Shell 命令及输出 |
| `assistant` | `assistant` + `tool` | 文本/推理/tool-call → content parts；已完成工具 → tool 消息 |
| `compaction` | `user` | 序列化为 `<conversation-checkpoint>` XML |
| `agent-switched`/`model-switched` | 跳过 | 不发送给 LLM |

**关键细节**：
- 同模型推理保留 `reasoning` part + `providerMetadata`（`:77-84`）
- 不同模型降级：推理文本转为普通 `text` part（`:85-87`）
- provider-executed 工具：结果由 provider 自己处理，不需要本地 tool result（`:89-94`）
- 已完成工具生成独立的 `Message.tool()` 结果消息（`:101-107`）

---

## MAX_STEPS_PROMPT

`packages/core/src/session/runner/max-steps.ts:1-16`

```typescript
export const MAX_STEPS_PROMPT = `CRITICAL - MAXIMUM STEPS REACHED
// ... 要求 LLM 仅输出文本，不得使用工具
```

当 `currentStep >= agent.info.steps` 时：
1. 该 prompt 作为 assistant 消息追加到请求中
2. 工具定义不发送（`toolMaterialization = undefined`）
3. `toolChoice = "none"`
4. LLM 必须提供文本摘要，含已完成工作、未完成任务、下一步建议

---

## runTurn() 完整流程图

```
run()
 └─ while (shouldRun)
     ├─ promotion = "queue" | "steer"
     └─ while (needsContinuation)                    ← 内层循环
         ├─ runTurn(sessionID, promotion, step)
         │   └─ runTurnAttempt()
         │       ├─ 1. 加载 Session + 验证 Location
         │       ├─ 2. promote 待处理输入 (SessionInput.promoteSteers / promoteNextQueued)
         │       ├─ 3. Context Epoch (initialize / prepare)
         │       ├─ 4. 加载历史 (SessionHistory.entriesForRunner)
         │       ├─ 5. 解析 Model (SessionRunnerModel.resolve)
         │       ├─ 6. 检查 isLastStep → toolChoice="none" / MAX_STEPS_PROMPT
         │       ├─ 7. 构造 LLM.request
         │       ├─ 8. compactIfNeeded? → ContinueAfterCompaction
         │       ├─ 9. llm.stream(request) → Stream.runForEach
         │       │   ├── text-start/delta/end → publish → SessionEvent.Text.*
         │       │   ├── reasoning → publish → SessionEvent.Reasoning.*
         │       │   ├── tool-call → toolMaterialization.settle() → FiberSet
         │       │   │               needsContinuation = true
         │       │   └── step-finish → 记录 usage
         │       ├─ 10. 等待工具 Fibers → 错误/中断处理
         │       └─ 11. return { needsContinuation, step }
         ├─ catch TurnTransitionError → 递归 runTurn()
         └─ needsContinuation || hasPending("steer") → 继续内层循环
```

---

## 关键源文件引用

| 功能 | 文件:行号 |
|---|---|
| `run()` 外层循环 | `packages/core/src/session/runner/llm.ts:383-406` |
| `runTurn()` 错误恢复 | `packages/core/src/session/runner/llm.ts:369-381` |
| `runTurnAttempt()` 核心 | `packages/core/src/session/runner/llm.ts:173-348` |
| `TurnTransitionError` 定义 | `packages/core/src/session/runner/llm.ts:158-166` |
| Promotion 阶段 | `packages/core/src/session/runner/llm.ts:187-196` |
| LLM request 构造 | `packages/core/src/session/runner/llm.ts:205-214` |
| Provider stream 处理 | `packages/core/src/session/runner/llm.ts:232-275` |
| 工具 settlement | `packages/core/src/session/runner/llm.ts:248-271` |
| 流终止处理 | `packages/core/src/session/runner/llm.ts:277-347` |
| 消息翻译 | `packages/core/src/session/runner/to-llm-message.ts:115-171` |
| 模型解析 | `packages/core/src/session/runner/model.ts:188-212` |
| MAX_STEPS_PROMPT | `packages/core/src/session/runner/max-steps.ts:1-16` |
| 事件发布 | `packages/core/src/session/runner/publish-llm-event.ts:239-408` |
