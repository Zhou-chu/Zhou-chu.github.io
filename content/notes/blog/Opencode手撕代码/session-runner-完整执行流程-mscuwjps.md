---
blog: true
title: "Session Runner 完整执行流程"
slug: "session-runner-完整执行流程-mscuwjps"
summary: "父笔记 : 02 session lifecycle · 04 llm interaction 子笔记 : 会话输入与Prompt管理 · run coordinator.ts详解 · Drain和Fiber runner/llm.ts 是 OpenCode 最核心的文件——把 SystemContext 、 SessionInput 、 SessionHistory 、 SessionContextEpoch 、 Coordinato"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "run-coordinator-ts详解-mscuwjpg"
  - "drain和fiber-mscuwj4q"
---

> **父笔记**: [[02-session-lifecycle]] · [[04-llm-interaction]]
> **子笔记**: [[会话输入与Prompt管理]] · [[run-coordinator.ts详解]] · [[Drain和Fiber]]

`runner/llm.ts` 是 OpenCode 最核心的文件——把 `SystemContext`、`SessionInput`、`SessionHistory`、`SessionContextEpoch`、`Coordinator` 全部串成一条执行链。我按执行顺序拆成九个阶段。
## 架构总览
这个文件内部分配多个 Effect Service（`loadSystemContext`、`runTurnAttempt`、`runTurn`、`run`），最终通过 `node` 导出为 Effect Layer。`Coordinator` 的 `drain` 回调最终调的就是这个 `run`。调用链：
```
Coordinator.start(session, force=true)
  └─ drain(session, force)
       └─ Runner.run({ sessionID, force })
            └─ while (shouldRun)
                 └─ while (needsContinuation)
                      └─ runTurn(sessionID, promotion, step)
                           └─ runTurnAttempt(...)  ← 核心
```
## 第一阶段：`loadSystemContext`

```typescript
const loadSystemContext = (agent: AgentV2.Selection) =>
  Effect.all([systemContext.load(), skillGuidance.load(agent), referenceGuidance.load()], {
    concurrency: "unbounded",
  }).pipe(Effect.map(SystemContext.combine))
```
这把三个独立的 Context Source 并发加载，然后合并成一个 `SystemContext`：

| 来源                          | 服务                      | 内容                                                         |
| --------------------------- | ----------------------- | ---------------------------------------------------------- |
| `systemContext.load()`      | `SystemContextRegistry` | `core/environment`、`core/date`、`core/instructions` 等所有注册条目 |
| `skillGuidance.load(agent)` | `SkillGuidance`         | 当前 agent 可用的技能描述                                           |
| `referenceGuidance.load()`  | `ReferenceGuidance`     | 参考指南                                                       |
这里你看到了你学过的 `SystemContext.combine` 的实际调用——它的参数正是这三个 `SystemContext`。`concurrency: "unbounded"` 让它们以无界并发 fiber 同时加载。
## 第二阶段：`runTurnAttempt` — 签名 + 前置准备

```typescript
const runTurnAttempt = Effect.fn("SessionRunner.runTurn")(function* (
  sessionID: SessionSchema.ID,
  promotion: SessionInput.Delivery | undefined,   // "steer" | "queue" | undefined
  step: number,                                    // 当前 tool-turn 步数
  recoverOverflow?: typeof compaction.compactAfterOverflow,
) {
  const session = yield* getSession(sessionID)
  // Location 检查：如果 Session 已经不在当前进程的目录下执行 → 中断
  if (session.location.directory !== location.directory || session.location.workspaceID !== location.workspaceID)
    return yield* Effect.interrupt
  const agent = yield* agents.select(session.agent)
  const initialized = yield* SessionContextEpoch.initialize(db, loadSystemContext(agent), session.id)
```
`SessionContextEpoch.initialize` 是你刚学的——如果这是该 Session 的第一个 Epoch，它会立即求值 System Context 并返回 `Generation { baseline, snapshot }`；如果已有 Epoch，返回 `undefined`。
## 第三阶段：Promotion

这就是你在《会话输入与Prompt管理》笔记里学完的 promotion 逻辑，现在放在 runner 的上下文里看：

```typescript
let currentStep = step
if (promotion) {
  const cutoff = yield* EventV2.latestSequence(db, session.id)
  let promoted = 0
  if (promotion === "steer") promoted = yield* SessionInput.promoteSteers(...)
  if (promotion === "queue") {
    promoted += Number(yield* SessionInput.promoteNextQueued(...))
    promoted += yield* SessionInput.promoteSteers(...)
  }
  if (promoted > 0) currentStep = 1       // 有新输入 → 重置 tool-turn 计数
}
```
**为什么 `currentStep = 1`？** agent 有 `steps` 限制（最多 N 个 tool-turn）。如果用户中途插入了新输入，之前的步骤计数应该失效——因为现在是"回答新问题"，tool-turn 应该从 1 重新算。
## 第四阶段：请求组装

这是你在《Opencode的工作原理》笔记里画的五个字段的实际代码：
```typescript
// ── System Context ──
const system =
  initialized ?? (yield* SessionContextEpoch.prepare(db, events, loadSystemContext(agent), session.id))
```
`initialized` 不为 `undefined`（首个 epoch）→ 直接用。`initialized` 为 `undefined`（已有 epoch）→ `??` 短路，调用 `prepare`（你学过的 reconcile 五阶段流水线在这里执行）。
```typescript
// ── 模型 + 历史 ──
const model = yield* models.resolve(session)
const entries = yield* SessionHistory.entriesForRunner(db, session.id, system.baselineSeq)
const context = entries.map((entry) => entry.message)
```
`system.baselineSeq` 正是你在 `轮询式比较的调用链和相关代码` 笔记里学到的历史过滤参数——只有 `seq > baselineSeq` 的系统消息会被保留。
```typescript
// ── 工具 + 最后一步判断 ──
const isLastStep = agent.info?.steps !== undefined && currentStep >= agent.info.steps
const toolMaterialization = isLastStep ? undefined : yield* tools.materialize(agent.info?.permissions)
```
如果当前步数已经达到 agent 的最大步数，`toolMaterialization` 为 `undefined`——后面的流处理中会拒绝工具调用。
```typescript
// ── 组装请求 —— 五个字段 ──
const request = LLM.request({
  model,                                                  // ①
  providerOptions: { openai: { promptCacheKey } },        // ②
  system: [agent.info?.system, system.baseline]           // ③
    .filter((p): p is string => p !== undefined && p.length > 0)
    .map(SystemPart.make),
  messages: [                                              // ④
    ...toLLMMessages(context, model),
    ...(isLastStep ? [Message.assistant(MAX_STEPS_PROMPT)] : []),
  ],
  tools: toolMaterialization?.definitions ?? [],           // ⑤
  toolChoice: isLastStep ? "none" : undefined,            //  最后一步禁止工具调用
})
```
## 第五阶段：Compaction 检查 + 流发布器

```typescript
if (yield* compaction.compactIfNeeded({ sessionID, entries, model, request }))
  return yield* Effect.die(continueAfterCompaction(currentStep))
```
**在发送 LLM 请求之前**，检查是否需要 compact（压缩）。如果需要，抛出一个特殊的 `TurnTransitionError`——这个错误被外层的 `runTurn` 捕获，然后重建请求重新发送。这是一种基于 Effect 错误机制的控制流——"用 die 来实现 goto"。
```typescript
const startSnapshot = yield* snapshots.capture()      // 拍摄文件系统快照
const publisher = createLLMEventPublisher(events, {    // 创建事件发布器
  sessionID, agent: agent.id,
  model: { id: ..., providerID: ..., ... },
  snapshot: startSnapshot,
})
const withPublication = Semaphore.makeUnsafe(1).withPermit  // 串行化事件发布
```
`publisher` 负责把 LLM 的流式事件（文本块、工具调用、错误）转换成 `SessionEvent.*` 并持久化。`Semaphore(1)` 保证所有发布操作串行执行——事件的顺序就是模型输出的顺序。
## 第六阶段：流式处理

这是最核心的一块——一条 LLM stream，五种事件类型：
```typescript
const providerStream = llm.stream(request).pipe(
  Stream.runForEach((event) =>
    Effect.gen(function* () {
      if (overflowFailure || publisher.hasProviderError()) return  // 已经失败 → 跳过
```
### 事件 A：Provider Error

```typescript
if (LLMEvent.is.providerError(event)) {
  if (isContextOverflowFailure(event) && !publisher.hasAssistantStarted()) {
    overflowFailure = event
    return    // 上下文溢出 + assistant 还没开始输出 → 暂存，后面触发 overflow compaction
  }
}
```
如果不是溢出（或者 assistant 已经开始输出了）→ 正常发布为错误事件。
### 事件 B：文本 / 推理等普通事件

```typescript
yield* publish(event)    // 直接发布
```
### 事件 C：工具调用

```typescript
if (event.type !== "tool-call" || event.providerExecuted) return
if (!toolMaterialization) {
  yield* withPublication(publisher.failUnsettledTools("Tools are disabled after the maximum agent steps"))
  return
}
needsContinuation = true   // ← 有工具调用 → 这一轮跑完后还要继续
const assistantMessageID = yield* publisher.assistantMessageID(event.id)
yield* Effect.uninterruptibleMask((restore) =>
  restore(
    toolMaterialization.settle({    // 执行工具：权限检查 + 实际调用
      sessionID, agent: agent.id, assistantMessageID, call: event,
    }),
  ).pipe(
    Effect.flatMap((settlement) =>
      publish(LLMEvent.toolResult({   // 发布工具结果
        id: event.id, name: event.name,
        result: settlement.result,
        output: settlement.output,
      }), settlement.outputPaths ?? []),
    ),
  ),
).pipe(FiberSet.run(toolFibers))   // 在独立的 fiber 里执行，不阻塞 stream
```
关键设计决策：
- `providerExecuted = true` 的工具调用跳过——它已经是最终结果，不需要本地执行。
- 工具调用在**独立 fiber** 里执行（`FiberSet.run(toolFibers)`）——不阻塞后续事件的发布。但 runner 会在 stream 结束后等所有工具 fiber 完成。
## 第七阶段：Stream 结算

这段是 stream 结束后的清理和判断逻辑，用一个大的 `Effect.uninterruptibleMask` 包裹：
```typescript
return yield* Effect.uninterruptibleMask((restore) =>
  Effect.gen(function* () {
    const stream = yield* restore(providerStream).pipe(Effect.exit)  // 等待 stream 结束
    const failure = stream._tag === "Failure" ? Option.getOrUndefined(Cause.findErrorOption(stream.cause)) : undefined
```
### 溢出恢复

```typescript
if (
  recoverOverflow &&
  !publisher.hasAssistantStarted() &&
  isContextOverflowFailure(overflowFailure ?? failure) &&
  (yield* restore(recoverOverflow({ sessionID, entries, model, request })))
)
  return yield* Effect.die(continueAfterOverflowCompaction(currentStep))
if (overflowFailure) yield* publish(overflowFailure)
```
如果溢出了 assistant 还没开始输出 → 尝试 compaction → 如果成功，抛 `TurnTransitionError` 让外层重建请求。
### LLM 失败处理

```typescript
const llmFailure = failure instanceof LLMError ? failure : undefined
if (llmFailure && !publisher.hasProviderError()) {
  yield* withPublication(publisher.failUnsettledTools("Provider did not return a tool result", true))
  yield* withPublication(publisher.failAssistant(llmFailure.reason.message))
}
```
### awaitToolFibers 机制

工具调用在独立 fiber 中执行，等待它们完成用了一个巧妙的设计：

```typescript
const awaitToolFibers = (fibers: FiberSet.FiberSet<void, ToolOutputStore.Error>) =>
  Effect.raceFirst(FiberSet.join(fibers), FiberSet.awaitEmpty(fibers))
```

`Effect.raceFirst` 意味着"两个操作谁先完成就用谁的结果"——要么所有工具 fiber 正常跑完（`join`），要么 fiber 集合本身被判定为空（`awaitEmpty`，处理工具在完成前就被中断/清理的情况）。这保证了即使部分工具被中止，等待逻辑也不会永久阻塞。

### 等待工具 fiber 完成

```typescript
if (stream._tag === "Failure" && Cause.hasInterrupts(stream.cause))
  yield* FiberSet.clear(toolFibers)        // 被中断 → 清空还在排队的工具

const settled = yield* restore(awaitToolFibers(toolFibers)).pipe(Effect.exit)  // 等所有工具跑完

if (settled._tag === "Failure" && isUserDeclined(settled.cause)) {
  yield* FiberSet.clear(toolFibers)
  yield* withPublication(publisher.failUnsettledTools("Tool execution interrupted"))
  return yield* Effect.interrupt           // 用户拒绝了 → 中断整个 turn
}
```

`isUserDeclined` 检测的是 `Cause` 中是否包含 `PermissionV2.DeclinedError` 或 `QuestionV2.RejectedError`——当用户拒绝了工具执行的权限询问时触发。它捕获的是权限系统（`PermissionV2`）的拒绝决策——当用户拒绝了工具执行的权限询问时触发。

### 中断处理

```typescript
if (
  (stream._tag === "Failure" && Cause.hasInterrupts(stream.cause)) ||
  (settled._tag === "Failure" && Cause.hasInterrupts(settled.cause))
) {
  yield* FiberSet.clear(toolFibers)
  yield* withPublication(publisher.failUnsettledTools("Tool execution interrupted"))
  if (publisher.hasActiveAssistant())
    yield* withPublication(publisher.failAssistant("Provider turn interrupted"))
}
```
### Step 结束事件

```typescript
if (stepSettlement && !publisher.hasProviderError()) {
  yield* snapshots.capture()        // 拍文件系统快照（after）
  yield* snapshots.files({ from: startSnapshot, to: endSnapshot })  // 对比变化
  yield* withPublication(
    events.publish(SessionEvent.Step.Ended, {
      sessionID, timestamp, assistantMessageID,
      finish: stepSettlement.finish,
      tokens: stepSettlement.tokens,
      snapshot: endSnapshot,
      files,   // 工具修改了哪些文件
    }),
  )
}
```
### 最终返回

```typescript
if (stream._tag === "Failure") return yield* Effect.failCause(stream.cause)
if (settled._tag === "Failure" && Cause.hasInterrupts(settled.cause))
  return yield* Effect.failCause(settled.cause)
return { needsContinuation: !publisher.hasProviderError() && needsContinuation, step: currentStep }
//       ↑ "要不要继续跑下一轮 tool-turn"
```
## 第八阶段：外层包装

`runTurnAttempt` 内部用 `Effect.die(TurnTransitionError)` 实现"compaction 后重建请求"的控制流。这个错误被 `runTurn` 捕获：
```typescript
const runTurn: RunTurn = Effect.fnUntraced(function* (sessionID, promotion, step) {
  return yield* runTurnAttempt(sessionID, promotion, step, compaction.compactAfterOverflow).pipe(
    Effect.catchDefect(Effect.fnUntraced(function* (defect) {
      if (!(defect instanceof TurnTransitionError)) return yield* Effect.die(defect)
      yield* Effect.yieldNow
      if (defect.transition._tag === "ContinueAfterOverflowCompaction")
        return yield* runAfterOverflowCompaction(sessionID, undefined, defect.transition.step)
      return yield* runTurn(sessionID, undefined, defect.transition.step)  // ← 递归：重建请求重试
    })),
  )
})
```
两种 compaction 的差异：

| 类型                                | 触发条件                       | 行为                                                 |
| --------------------------------- | -------------------------- | -------------------------------------------------- |
| `ContinueAfterCompaction`         | `compactIfNeeded` 返回 true  | 递归调用 `runTurn`，用 compacted 后的历史重建请求                |
| `ContinueAfterOverflowCompaction` | LLM 返回 context overflow 错误 | 走 `runAfterOverflowCompaction`——**不允许二次 overflow** |

---

## 第九阶段：`run` — 双 while 循环

这是 Coordinator 的 `drain` 回调实际调用的函数：
```typescript
const run = Effect.fn("SessionRunner.run")(function* (input: {
  readonly sessionID, readonly force: boolean,
}) {
  // ── 检查是否有待处理工作 ──
  const hasSteer = yield* SessionInput.hasPending(db, sessionID, "steer")
  const hasQueue = hasSteer ? false : yield* SessionInput.hasPending(db, sessionID, "queue")
  if (!input.force && !hasSteer && !hasQueue) return    // 既没有 force 也没有 pending → 直接返回

  yield* failInterruptedTools(sessionID)    // 把上次中断时残留的 running/pending 工具标记为失败

  let promotion = hasSteer ? "steer" : hasQueue ? "queue" : undefined
  let shouldRun = input.force || hasSteer || hasQueue

  // ── 外层循环：drain 级别 ──
  while (shouldRun) {
    let needsContinuation = true
    let step = 1

    // ── 内层循环：tool-turn 级别 ──
    while (needsContinuation) {
      const result = yield* runTurn(sessionID, promotion, step)
      needsContinuation = result.needsContinuation    // 有工具调用 → 继续
      step = result.step + 1
      promotion = "steer"                             // 第二轮起所有 promotion 都是 steer

      // 如果 tool-turn 结束但用户在 drain 期间发了新消息 → 继续
      if (!needsContinuation)
        needsContinuation = yield* SessionInput.hasPending(db, sessionID, "steer")
    }

    // 检查是否还有排队的 queue 输入
    shouldRun = yield* SessionInput.hasPending(db, sessionID, "queue")
    promotion = shouldRun ? "queue" : undefined
  }
})
```

`failInterruptedTools` 遍历上一次 drain 残留的 pending/running 状态工具调用，将它们全部标记为 `SessionEvent.Tool.Failed`。这是 Session 恢复执行时的"清扫"步骤——确保不会有僵尸工具调用卡在中间状态。

**内外循环的含义**：
```
外循环（shouldRun）：一次 drain 可以包含多个"输入组"
  内循环（needsContinuation）：一组输入可以触发多轮 tool-turn（LLM → 工具 → LLM → 工具 → ...）

示例：
  drain 开始
    ├─ 外循环第 1 轮：用户发了 "帮我改这三个文件"
    │    ├─ 内循环第 1 轮：runTurn → LLM 说 "先改 A" → 工具执行 → needsContinuation
    │    ├─ 内循环第 2 轮：runTurn → LLM 说 "再改 B" → 工具执行 → needsContinuation
    │    └─ 内循环第 3 轮：runTurn → LLM 说 "C 也改好了，完成" → needsContinuation = false
    │    但！用户在内循环期间又发了 "还有 D" → hasPending("steer") → needsContinuation = true
    │    ├─ 内循环第 4 轮：runTurn → LLM 说 "好的，改 D" → 工具执行
    │    └─ 内循环结束
    └─ 外循环结束：没有 queue 输入了
```
## 完整的端到端时序
```
HTTP POST /session/{id}/message
  └─ SessionInput.admit()                 ← 持久化输入
  └─ SessionExecution.wake(sessionID)     ← 通知 Coordinator

Coordinator
  └─ run() / wake() → start → drain(sessionID, force)
       └─ Runner.run({ sessionID, force })

Runner.run
  ├─ hasPending("steer") → true
  ├─ failInterruptedTools()               ← 清理上次残留
  ├─ while (shouldRun)
  │    ├─ while (needsContinuation)
  │    │    └─ runTurn(sessionID, promotion, step)
  │    │         ├─ SessionContextEpoch.initialize()      ← Epoch 管理
  │    │         ├─ SessionInput.promoteSteers()/promoteNextQueued()  ← Promotion
  │    │         ├─ ContextEpoch.prepare()                ← reconcile 五阶段
  │    │         ├─ SessionHistory.entriesForRunner()     ← 历史过滤
  │    │         ├─ toLLMMessages()                       ← 消息转换
  │    │         ├─ tools.materialize()                   ← 工具权限
  │    │         ├─ LLM.request({...})                    ← 请求组装
  │    │         ├─ compactIfNeeded()                     ← 压缩检查
  │    │         ├─ llm.stream(request)                   ← 流式响应
  │    │         │    ├─ text/error → publish(event)
  │    │         │    └─ tool-call → settle → publish(toolResult)
  │    │         ├─ awaitToolFibers()                     ← 等工具完成
  │    │         ├─ isUserDeclined()                      ← 检查用户拒绝
  │    │         ├─ SessionEvent.Step.Ended               ← 发布结束事件
  │    │         └─ return { needsContinuation, step }
  │    └─ hasPending("steer") → 用户在 drain 期间发了新消息？
  └─ hasPending("queue") → 还有排队的后台输入？
```
## 和你已学知识的对应

你学过的每个模块都在这条执行链里找到了自己的位置：

| 你学过的                              | 出现在 runner/llm.ts 的位置                            |
| --------------------------------- | ----------------------------------------------- |
| `SystemContext.combine`           | `loadSystemContext` — 合并三个 Context Source        |
| `SessionContextEpoch.initialize`  | `runTurnAttempt` — Epoch 初始化和 `??` 短路            |
| `SessionContextEpoch.prepare`     | `runTurnAttempt` — reconcile 五阶段流水线              |
| `SessionHistory.entriesForRunner` | `runTurnAttempt` — baselineSeq 历史过滤              |
| `SessionInput.admit`              | 在 HTTP handler 里调用，admit 完才到 runner           |
| `SessionInput.promoteSteers`      | `runTurnAttempt` 的 promotion 分支 — Safe Boundary 晋升 |
| `SessionRunCoordinator.run`/`wake`| 外层调用者，通过 `Runner.run({ force })` 连接            |
| `isUserDeclined`                  | `runTurnAttempt` — 用户拒绝权限时中断整个 turn              |
| `awaitToolFibers`                 | `runTurnAttempt` — 等所有独立 fiber 里的工具执行完成          |
| `failInterruptedTools`            | `run` — drain 开始前清理上次残留的僵尸工具                   |

至此，`Opencode的工作原理` 笔记里的五个字段、System Context 的完整生命周期、输入从 admit → promote → LLM 可见的完整链路——全部串起来了。
