---
blog: true
title: "Provider Turn 完整流程"
slug: "provider-turn-完整流程-mscuwjpu"
summary: "树节点：11 Provider Turn完整流程 父节点：Opencode的工作原理 子节点：11 事件系统与持久化 | 11 插件与Skill系统 Provider Turn 完整流程 一个 Provider Turn 是 OpenCode 执行引擎的核心循环：从 Session 中取出待处理的输入 → 组装 LLM 请求 → 流式接收响应 → 结算工具调用 → 判断是否继续。本文逐步骤拆解实现细节。 总体架构 每个 Provider"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：11-Provider-Turn完整流程
> 父节点：[[Opencode的工作原理]]
> 子节点：[[11-事件系统与持久化]] | [[11-插件与Skill系统]]

# Provider Turn 完整流程

一个 Provider Turn 是 OpenCode 执行引擎的核心循环：从 Session 中取出待处理的输入 → 组装 LLM 请求 → 流式接收响应 → 结算工具调用 → 判断是否继续。本文逐步骤拆解实现细节。

---

## 总体架构

```
SessionRunner.run()                            [runner/index.ts:383-405]
  └─ 循环 while (shouldRun)
       ├─ promote            输入提升（steer > queue）    [runner/llm.ts:187-196]
       ├─ prepare            系统上下文准备/更新          [context-epoch.ts:31-78]
       ├─ entriesForRunner   历史消息加载                 [history.ts:90-98]
       ├─ LLM.request        组装 LLM 请求                [runner/llm.ts:205-214]
       ├─ llm.stream         流式发送 + 接收              [runner/llm.ts:232-274]
       ├─ settle / fail      工具结算                     [runner/llm.ts:252-271]
       └─ 循环条件判断       isLastStep / awaitFibers     [runner/llm.ts:202,141]
```

每个 Provider Turn 对应一次 `llm.stream(request)` 调用，工具结算后可能触发下一次 Turn。

---

## 步骤 1：Promote（输入提升）

**文件**：`packages/core/src/session/input.ts:245-288`
**调用位置**：`packages/core/src/session/runner/llm.ts:187-196`

### 1.1 两种 Delivery 类型

```typescript
// packages/schema/src/session-delivery.ts
export type Delivery = "steer" | "queue"
```

| Delivery | 含义 | 提升时机 |
|----------|------|----------|
| `"steer"` | 用户手动输入的转向指令（在 Assistant 回复期间插入） | 每次循环检查，优先提升 |
| `"queue"` | 排队的正常 Prompt | 仅当无 steer 且无活跃 continuation 时提升 |

### 1.2 promote 逻辑

```typescript
// packages/core/src/session/runner/llm.ts:183-196
const promotion: SessionInput.Delivery | undefined = ...
let promoted = 0
if (promotion === "steer")
  promoted = yield* SessionInput.promoteSteers(db, events, session.id, cutoff)
if (promotion === "queue") {
  promoted += Number(yield* SessionInput.promoteNextQueued(db, events, session.id))
  promoted += yield* SessionInput.promoteSteers(db, events, session.id, cutoff)
}
if (promoted > 0) currentStep = 1 // 重置步骤计数器
```

**关键实现**：
- `promoteSteers`（`input.ts:245-266`）：查询 `admitted_seq <= cutoff` 且 `delivery='steer'` 的未提升输入，按 `admitted_seq ASC` 排序，全部发布 `SessionEvent.Prompted` 事件
- `promoteNextQueued`（`input.ts:268-288`）：仅取 `delivery='queue'` 的第一条

**边效**：发布 `Prompted` 事件 → Projector 写入 `SessionInputTable.promoted_seq` → Runner 加载时可见

---

## 步骤 2：System Context 准备/更新

**调用位置**：`packages/core/src/session/runner/llm.ts:197-198`
**核心文件**：`packages/core/src/session/context-epoch.ts:31-78`

### 2.1 流程

```
SessionContextEpoch.prepare(db, events, context, sessionID)
  ├─ loadSystemContext(agent) → SystemContext     [runner/llm.ts:168-171]
  │    ├─ systemContext.load()                    [SystemContextRegistry]
  │    ├─ skillGuidance.load(agent)               [skill/guidance.ts:46-68]
  │    └─ referenceGuidance.load()                [reference/guidance]
  └─ prepareOnce()
       ├─ find(db, sessionID) → 查询已有的 Context Epoch 行
       ├─ 不存在 → SystemContext.initialize() → insert()
       ├─ 存在 + compaction → SystemContext.replace()
       └─ 存在 → SystemContext.reconcile()
            ├─ Unchanged → 复用 stored.baseline + stored.baselineSeq
            ├─ Updated → 发布 ContextUpdated 事件，advance snapshot
            └─ ReplacementBlocked → 返回旧 baseline
```

### 2.2 Context Epoch 持久化

```
SessionContextEpochTable：
  session_id  |  baseline (文本)  |  snapshot (JSON)  |  baseline_seq
```

- `baseline`：渲染后的系统提示文本，直接注入 LLM 请求
- `snapshot`：JSON 编码的 Context Snapshot，用于增量比较
- `baseline_seq`：此 Baseline 生效时的 event sequence 边界

### 2.3 Mid-Conversation 更新

当 `SystemContext.reconcile()` 返回 `Updated` 时（`context-epoch.ts:72-77`）：

```typescript
yield* events.publish(
  SessionEvent.ContextUpdated,
  { sessionID, messageID, timestamp, text: result.text },
  { commit: () => advance(db, sessionID, result.snapshot) },
)
```

- 发布持久化事件（写入 EventTable），更新 Context Epoch 的 snapshot
- `text` 字段即为 Mid-Conversation System Message，追加到历史中

---

## 步骤 3：历史消息加载

**调用位置**：`packages/core/src/session/runner/llm.ts:200-201`

```typescript
const entries = yield* SessionHistory.entriesForRunner(db, session.id, system.baselineSeq)
const context = entries.map((entry) => entry.message)
```

### 3.1 entriesForRunner 实现

**文件**：`packages/core/src/session/history.ts:90-98`

```typescript
export const entriesForRunner = Effect.fn("SessionHistory.entriesForRunner")(function* (
  db, sessionID, baselineSeq,
) {
  const rows = yield* messageRows(db, sessionID,
    yield* latestCompaction(db, sessionID), baselineSeq)
  return yield* Effect.forEach(rows, (row) =>
    decodeMessageRow(row).pipe(Effect.map((message) =>
      ({ seq: row.seq, message }))))
})
```

**查询逻辑**（`history.ts:24-53`）：
1. 找到最近一次 Compaction 消息的 `seq`
2. 加载 compaction 之后的所有消息（`seq >= compaction.seq`）
3. 加载 `baselineSeq` 之后的系统消息（作为 Mid-Conversation System Messages）
4. 按 `seq ASC` 排序

**输出**：`Array<{ seq: number, message: SessionMessage.Message }>`

---

## 步骤 4：LLM 请求组装

**调用位置**：`packages/core/src/session/runner/llm.ts:205-214`

```typescript
const request = LLM.request({
  model,
  providerOptions: { openai: { promptCacheKey } },
  system: [agent.info?.system, system.baseline]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .map(SystemPart.make),
  messages: [...toLLMMessages(context, model),
    ...(isLastStep ? [Message.assistant(MAX_STEPS_PROMPT)] : [])],
  tools: toolMaterialization?.definitions ?? [],
  toolChoice: isLastStep ? "none" : undefined,
})
```

### 4.1 消息转换

`toLLMMessages()`（`packages/core/src/session/runner/to-llm-message.ts`）将 V2 `SessionMessage` 类型转换为 `@opencode-ai/llm` 的 `Message` 格式：
- `user` → `Message.user()`
- `assistant` → `Message.assistant()` + tool call/result parts
- `system` → 保留为 system 消息
- `synthetic`、`compaction` 等上下文消息一并转换

### 4.2 工具定义

```typescript
const toolMaterialization = isLastStep
  ? undefined
  : yield* tools.materialize(agent.info?.permissions)
```

- `tools.materialize()`（`packages/core/src/tool/registry.ts`）根据 Agent 权限过滤工具集，生成 `ToolDefinition[]`
- 最后一步（`isLastStep`）不提供工具，`toolChoice: "none"`

### 4.3 原生请求适配

`LLM.request()` → `packages/opencode/src/session/llm/native-request.ts:181-194`：

```typescript
export const request = (input: RequestInput) => {
  const converted = messages(input.messages)
  return LLM.request({
    model: model(input, input.headers),
    system: [...(input.system ?? []).map(SystemPart.make), ...converted.system],
    messages: converted.messages,
    tools: tools(input.tools),
    toolChoice: input.toolChoice,
    generation: generation(input),
    providerOptions: input.providerOptions,
  })
}
```

- `model()` 选择 provider 适配器（OpenAI / Anthropic / Google / Azure / Bedrock / OpenRouter / OpenAICompatible）
- `messages()` 分离 system parts 与对话 messages
- `tools()` 将 V1 格式的工具定义转为 `ToolDefinition[]`

---

## 步骤 5：流式请求与响应

**调用位置**：`packages/core/src/session/runner/llm.ts:232-274`

```typescript
const providerStream = llm.stream(request).pipe(
  Stream.runForEach((event) =>
    Effect.gen(function* () {
      if (overflowFailure || publisher.hasProviderError()) return
      if (LLMEvent.is.providerError(event)) {
        if (isContextOverflowFailure(event) && !publisher.hasAssistantStarted()) {
          overflowFailure = event  // 上下文溢出 → 触发 overflow compaction
          return
        }
      }
      yield* publish(event)  // 持久化事件 + 发布到 EventBus
      // 工具调用结算...
    }),
  ),
  Effect.ensuring(withPublication(publisher.flush())),
)
```

### 5.1 Stream Event 类型

`@opencode-ai/llm` 流式输出的事件类型（`packages/llm/src/schema/events.ts`）：

| 事件 | 含义 | 持久化 |
|------|------|--------|
| `text-start` | 文本块开始 | → `SessionEvent.Text.Started` |
| `text-delta` | 文本增量（live-only） | → `SessionEvent.Text.Delta`（非持久化） |
| `text-end` | 文本块结束 | → `SessionEvent.Text.Ended` |
| `reasoning-start` | 推理开始 | → `SessionEvent.Reasoning.Started` |
| `reasoning-delta` | 推理增量（live-only） | → `SessionEvent.Reasoning.Delta`（非持久化） |
| `reasoning-end` | 推理结束 | → `SessionEvent.Reasoning.Ended` |
| `tool-call` | 工具调用请求 | → `SessionEvent.Tool.Called` |
| `provider-error` | Provider 错误 | → `SessionEvent.Step.Failed` |
| `finish` | 辅助响应结束 | → `SessionEvent.Step.Ended` |

### 5.2 事件发布器

`createLLMEventPublisher()`（`packages/core/src/session/runner/publish-llm-event.ts`）：
- 将 LLM 原始事件转换为 `SessionEvent` 持久化事件
- 通过 `EventV2.publish()` 写入 DB + 通知订阅者
- 通过 `Semaphore` 保证事件顺序（`withPublication`）

---

## 步骤 6：工具结算（Tool Settlement）

**调用位置**：`packages/core/src/session/runner/llm.ts:248-271`

```typescript
if (event.type !== "tool-call" || event.providerExecuted) return
needsContinuation = true
const assistantMessageID = yield* publisher.assistantMessageID(event.id)
yield* Effect.uninterruptibleMask((restore) =>
  restore(
    toolMaterialization.settle({
      sessionID: session.id,
      agent: agent.id,
      assistantMessageID,
      call: event,
    }),
  ).pipe(
    Effect.flatMap((settlement) =>
      publish(LLMEvent.toolResult({
        id: event.id, name: event.name,
        result: settlement.result,
        output: settlement.output,
      }), settlement.outputPaths ?? []),
    ),
  ),
).pipe(FiberSet.run(toolFibers))
```

### 6.1 settle 流程

`ToolRegistry.settle()` → `Tool.settle()`（`packages/core/src/tool/tool.ts:91-129`）：

1. `Schema.decodeUnknownEffect(config.input)(call.input)` — 解码工具输入
2. `config.execute(input, context)` — 执行工具逻辑（Effect）
3. `Schema.encodeEffect(config.output)(output)` — 编码输出
4. 如有 `structured` schema，再编码结构化输出
5. 生成 `ToolOutput = { structured, content }`

### 6.2 failInterruptedTools

当 Session 重新开始执行时调用（`runner/llm.ts:119-139`）：

```typescript
for (const message of yield* getContext(sessionID)) {
  if (message.type !== "assistant") continue
  for (const tool of message.content) {
    if (tool.type !== "tool") continue
    if (tool.state.status !== "pending" && tool.state.status !== "running") continue
    yield* events.publish(SessionEvent.Tool.Failed, {
      sessionID, assistantMessageID, callID,
      error: { type: "unknown", message: "Tool execution interrupted" },
      ...
    })
  }
}
```

将上一轮未完成的工具标记为 Failed，防止遗留 `pending` 状态。

### 6.3 FiberSet 并发

工具调用在 `FiberSet` 中并发执行：

```typescript
// runner/llm.ts:141-142
const awaitToolFibers = (fibers: FiberSet.FiberSet<void, ToolOutputStore.Error>) =>
  Effect.raceFirst(FiberSet.join(fibers), FiberSet.awaitEmpty(fibers))
```

- 所有工具调用同时启动（eager settlement）
- `awaitToolFibers` 等待全部完成后才继续

---

## 步骤 7：循环条件判断

**文件**：`packages/core/src/session/runner/llm.ts:383-405`

### 7.1 内层循环（step loop）

```typescript
// runner/llm.ts:396-401
while (needsContinuation) {
  const result = yield* runTurn(input.sessionID, promotion, step)
  needsContinuation = result.needsContinuation
  step = result.step + 1
  promotion = "steer"  // 后续 Turn 优先处理 steer
  if (!needsContinuation)
    needsContinuation = yield* SessionInput.hasPending(db, input.sessionID, "steer")
}
```

**停止条件**：
1. `isLastStep`：达到 Agent 配置的 `steps` 上限（`runner/llm.ts:202`）
2. `!needsContinuation`：没有更多工具调用需要结算
3. Provider 错误（非 overflow）
4. 中断（`Cause.hasInterrupts`）
5. `isUserDeclined`：权限拒绝或问题拒绝

### 7.2 外层循环（queue loop）

```typescript
// runner/llm.ts:403-404
shouldRun = yield* SessionInput.hasPending(db, input.sessionID, "queue")
promotion = shouldRun ? "queue" : undefined
```

- 内层循环结束后，检查是否有新的排队 Prompt
- 有则启动新一轮 Provider Turn

### 7.3 Compaction 恢复

```typescript
// runner/llm.ts:369-381
const runTurn: RunTurn = Effect.fnUntraced(function* (sessionID, promotion, step) {
  return yield* runTurnAttempt(sessionID, promotion, step, compaction.compactAfterOverflow).pipe(
    Effect.catchDefect(Effect.fnUntraced(function* (defect) {
      if (!(defect instanceof TurnTransitionError)) return yield* Effect.die(defect)
      if (defect.transition._tag === "ContinueAfterOverflowCompaction")
        return yield* runAfterOverflowCompaction(sessionID, undefined, defect.transition.step)
      return yield* runTurn(sessionID, undefined, defect.transition.step)
    })),
  )
})
```

- 自动 Compaction 或 Overflow Compaction 完成后，通过 `TurnTransitionError` 重启 Turn
- Overflow Compaction 后的恢复路径仅执行一次（防止无限循环）

---

## 错误处理

| 错误类型 | 来源 | 处理 |
|----------|------|------|
| `LLMError` | Provider 返回错误 | 发布 `SessionEvent.Step.Failed` |
| `ContextOverflowFailure` | Token 超限 | 触发 `compactAfterOverflow` → 裁剪历史后重试 |
| `PermissionV2.DeclinedError` | 用户拒绝权限 | 中断当前 Turn，不继续 |
| `QuestionV2.RejectedError` | 用户拒绝问题 | 中断当前 Turn |
| `Cause.interrupt` | 外部中断信号 | 清理 FiberSet，标记未完成工具为 Failed |

---

## 关键数据结构

| 结构 | 用途 | 来源 |
|------|------|------|
| `SessionInput.Delivery` | `"steer"` 或 `"queue"` | `packages/schema/src/session-delivery.ts` |
| `SessionContextEpoch.Prepared` | `{ baseline: string, baselineSeq: number }` | `packages/core/src/session/context-epoch.ts:18-21` |
| `ToolMaterialization` | `{ definitions: ToolDefinition[], settle: ... }` | `packages/core/src/tool/registry.ts` |
| `TurnTransition` | `{ _tag: "ContinueAfterCompaction" \| "ContinueAfterOverflowCompaction" }` | `packages/core/src/session/runner/llm.ts:152-157` |
| `FiberSet` | 并发工具执行集合 | Effect 标准库 |

---

## 相关文件索引

| 文件 | 内容 |
|------|------|
| `packages/core/src/session/runner/index.ts` | `Interface` 定义 + `RunError` 类型 |
| `packages/core/src/session/runner/llm.ts` | `runTurn` + `runTurnAttempt` 完整实现 |
| `packages/core/src/session/input.ts` | `admit`, `promoteSteers`, `promoteNextQueued` |
| `packages/core/src/session/context-epoch.ts` | `initialize`, `prepare`, `reset` |
| `packages/core/src/session/history.ts` | `entriesForRunner`, `loadForRunner` |
| `packages/core/src/session/runner/publish-llm-event.ts` | LLM事件 → SessionEvent 转换 |
| `packages/core/src/session/runner/to-llm-message.ts` | V2消息 → LLM消息转换 |
| `packages/opencode/src/session/llm/native-request.ts` | 原生 LLM 请求适配（provider 路由） |
| `packages/core/src/tool/tool.ts` | `make`, `settle`, `definition` |
| `packages/core/src/tool/registry.ts` | `materialize`, 权限过滤 |
| `packages/core/src/session/compaction.ts` | `compactIfNeeded`, `compactAfterOverflow` |
