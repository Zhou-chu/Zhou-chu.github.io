---
blog: true
title: "04-全链路概览：一次 Provider Turn 的完整追踪"
slug: "04-全链路概览-一次-provider-turn-的完整追踪-mscuwj4e"
summary: "树节点：04 全链路概览 父节点：Opencode的工作原理 子节点：04 Server请求处理 | 04 LLM协议适配层 04 全链路概览：一次 Provider Turn 的完整追踪 本文追踪一次用户输入从 HTTP 请求 → 数据库记录 → Runner 执行 → LLM 调用 → 工具结算 → 事件发布的 完整调用链 。 一、整体架构流 二、逐阶段详解 阶段 1：用户输入到达 — HTTP 层 入口 : packages/se"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：04-全链路概览
> 父节点：[[Opencode的工作原理]]
> 子节点：[[04-Server请求处理]] | [[04-LLM协议适配层]]

# 04-全链路概览：一次 Provider Turn 的完整追踪

本文追踪一次用户输入从 HTTP 请求 → 数据库记录 → Runner 执行 → LLM 调用 → 工具结算 → 事件发布的**完整调用链**。

---

## 一、整体架构流

```
HTTP POST /session/{id}/message
  │
  ▼
Server: session.prompt handler    ← [[04-Server请求处理]]
  │
  ▼
SessionV2.prompt()                ← [[05-会话输入与Prompt管理]]
  │
  ├── SessionInput.admit()        → 写入 session_input 表
  └── SessionExecution.wake()     → 唤醒 RunCoordinator
                                       │
                                       ▼
                              SessionRunCoordinator.drain()
                                       │
                                       ▼ (scoped loop)
                          ┌── SessionRunner.runTurn()
                          │       │
                          │       ├── loadSystemContext()
                          │       ├── ContextEpoch.initialize/prepare()
                          │       ├── SessionHistory.entriesForRunner()
                          │       ├── LLM.request()
                          │       ├── LLMClient.stream(request)
                          │       └── ToolRegistry.materialize().settle()
                          │
                          ▼ (loop until !needsContinuation)
```

---

## 二、逐阶段详解

### 阶段 1：用户输入到达 — HTTP 层

**入口**: `packages/server/src/handlers/session.ts:140-171`

HTTP 请求 `/session/{sessionID}/message` 被 Effect HttpApi 路由到 `session.prompt` handler：

```ts
// session.ts:140-171
"session.prompt" → session.prompt({
  sessionID, id: ctx.payload.id,
  prompt: ctx.payload.prompt,
  delivery: ctx.payload.delivery,     // "steer" | "queue"
  resume: ctx.payload.resume,
})
```

Handler 委托给 `SessionV2.Service.prompt()`，它接收 `PromptInput`（含 `prompt`、`delivery`）。

**路由定义**: `packages/protocol/src/groups/session.ts` 中的 `makeSessionGroup()` 定义端点路径 `/session/{sessionID}/message`。

---

### 阶段 2：Prompt 持久化 — Durable Admission

**入口**: `packages/core/src/session/input.ts:41-81` — `SessionInput.admit()`

```ts
// input.ts:41-81
const admit = Effect.fn("SessionInput.admit")(function*(db, events, input) {
  // 1. 先查是否已存在（幂等）
  const existing = yield* find(db, input.id)
  if (existing !== undefined) return existing

  // 2. 发布 PromptAdmitted 事件
  yield* events.publish(SessionEvent.PromptAdmitted, { ... })

  // 3. 事件的 durable seq 成为 admittedSeq
  Admitted.make({ admittedSeq: event.durable.seq, ... })
})
```

关键概念：
- `delivery` 类型：`"steer"`（立即提升）或 `"queue"`（等待空闲时提升）
- `admittedSeq`：事件持久化序列号，标记输入在 Session 时间线中的位置
- `projectAdmitted()` (`input.ts:83-116`) 将 Admitted 数据写入 `session_input` 表
- `promoteSteers()` / `promoteNextQueued()` 负责在安全边界将输入提升为可见消息

**数据库表**: `SessionInputTable`（`packages/core/src/session/sql.ts`）

---

### 阶段 3：协调器调度 — RunCoordinator

**入口**: `packages/core/src/session/run-coordinator.ts:24-104` — `SessionRunCoordinator.make()`

```ts
// run-coordinator.ts:24-25
make({ drain: (key, force) => Effect.Effect<void, E> })
```

`Coordinator<Key, E>` 提供四个方法：

| 方法 | 行为 | 行号 |
|------|------|------|
| `run(key)` | 空闲时启动执行，活跃时**等待 join** | :67-79 |
| `wake(key)` | 标记 pendingWake，若空闲则启动 | :81-92 |
| `interrupt(key)` | Fiber.interrupt 活跃 drain | :94-101 |
| `active()` | 返回当前活跃的 Key 集合 | :103 |

**核心 settle 逻辑** (`run-coordinator.ts:51-65`)：
- drain 成功且有 `pendingWake` → 立即重启（successor fiber）
- drain 成功且无 pendingWake → 删除 entry，resolve done
- 有 pendingWake 但无活跃 owner → 创建新 entry 立即启动

协作者用 `SessionID` 作为 Key，保证同 Session 串行、不同 Session 并发执行。

---

### 阶段 4：Runner 执行循环 — SessionRunner

**入口**: `packages/core/src/session/runner/llm.ts:383-406` — `SessionRunner.run()`

```ts
// llm.ts:383-406
const run = Effect.fn("SessionRunner.run")(function*(input) {
  // 检查是否有 steered / queued 输入
  const hasSteer = yield* SessionInput.hasPending(db, sessionID, "steer")
  const hasQueue = yield* SessionInput.hasPending(db, sessionID, "queue")

  // 先处理 interrupted tools（上次未完成的工具调用标记为失败）
  yield* failInterruptedTools(sessionID)

  // 外层循环：新的 queued 输入可以启动新一轮 turns
  while (shouldRun) {
    // 内层循环：连续 provider turns（steer + tool continuation）
    while (needsContinuation) {
      const result = yield* runTurn(sessionID, promotion, step)
      needsContinuation = result.needsContinuation
      step = result.step + 1
    }
    // 检查是否有 queued 输入等待处理
    shouldRun = yield* SessionInput.hasPending(db, sessionID, "queue")
  }
})
```

**两层循环逻辑**：
- **外层** (`while (shouldRun)`)：每个 queued 输入启动一轮新的 provider turn 序列
- **内层** (`while (needsContinuation)`)：同一轮中的连续 turns（工具调用 → LLM → 更多工具调用...），steer 输入可在任意内层迭代中途被提升

**关键设计**：`promotion` 在第一次 turn 后固定为 `"steer"`，使后续循环中到达的新用户输入也自动提升加入。

---

### 阶段 5：单次 Turn 执行 — runTurn

**入口**: `packages/core/src/session/runner/llm.ts:173-348` — `runTurnAttempt()`

```ts
// llm.ts:173-348 (简化)
const runTurnAttempt = Effect.fn("SessionRunner.runTurn")(function*(sessionID, promotion, step, recoverOverflow?) {
  // 5a) 验证 Location
  if (session.location.directory !== location.directory) return Effect.interrupt

  // 5b) 初始化 / 准备 Context Epoch
  const initialized = yield* SessionContextEpoch.initialize(db, loadSystemContext(agent), session.id)
  const system = initialized ?? (yield* SessionContextEpoch.prepare(db, events, loadSystemContext(agent), session.id))

  // 5c) 加载历史消息
  const entries = yield* SessionHistory.entriesForRunner(db, session.id, system.baselineSeq)
  const context = entries.map(e => e.message)

  // 5d) 工具集材料化（含权限过滤）
  const toolMaterialization = isLastStep ? undefined : yield* tools.materialize(agent.info?.permissions)

  // 5e) 构建 LLM Request
  const request = LLM.request({
    model, system: [...], messages: toLLMMessages(context, model),
    tools: toolMaterialization?.definitions ?? [],
    toolChoice: isLastStep ? "none" : undefined,
  })

  // 5f) Compaction check（若上下文过大则压缩）
  if (yield* compaction.compactIfNeeded({ sessionID, entries, model, request }))
    return Effect.die(continueAfterCompaction(currentStep))

  // 5g) Stream 到 LLM + 工具执行
  const providerStream = llm.stream(request).pipe(
    Stream.runForEach((event) => {
      // 处理 text, reasoning, tool-call, provider-error 等事件
      // 对每个本地 tool-call: toolMaterialization.settle() → FiberSet.run
    })
  )

  // 5h) 后处理：overflow 恢复、错误处理、Fiber 等待、Step.Ended 事件
  ...
})
```

**`runTurnAttempt` 的 TurnTransition 错误**（`:152-167`）：用于 compaction 触发的自动重试，抛 `defect` 被外层 catch 捕获后重新进入 loop。

---

### 阶段 6：Context 准备 — Context Epoch + System Context

**文件**: `packages/core/src/session/context-epoch.ts`, `packages/core/src/system-context/index.ts`

**`SessionContextEpoch.initialize()`** (`context-epoch.ts:80-89`)：首次调用时：
1. 调用 `SystemContext.initialize()` → 观察所有 Context Source，生成 `Generation { baseline, snapshot }`
2. 写入 `session_context_epoch` DB 行
3. 返回 `{ baseline, baselineSeq }`

**`SessionContextEpoch.prepare()`** (`context-epoch.ts:40-78`)：后续调用时：
1. 加载已存储的 epoch 行
2. 调用 `SystemContext.reconcile()`：比较当前 source 值与上次 snapshot
3. 若 `Updated` → 发布 `SessionEvent.ContextUpdated` 事件（Mid-Conversation 更新）
4. 若 `ReplacementReady`（compaction 后）→ 用 `replace()` 写入新 baseline

**`loadSystemContext()`** (`runner/llm.ts:168-171`)：并行加载三个 context source：
```ts
[systemContext.load(), skillGuidance.load(agent), referenceGuidance.load()]
  → SystemContext.combine()
```

Context Epoch 的 `baselineSeq` 用于后续历史加载时**过滤掉不属于当前 epoch 的 system 消息**。

---

### 阶段 7：历史加载 — SessionHistory

**文件**: `packages/core/src/session/history.ts:90-99`

```ts
// history.ts:90-99
entriesForRunner(db, sessionID, baselineSeq) {
  // 1. 找到最新 compaction 的 seq
  const compaction = latestCompaction(db, sessionID)

  // 2. 加载消息：从 compaction 点之后 + 排除 baselineSeq 前的 system 消息
  const rows = messageRows(db, sessionID, compaction, baselineSeq)

  // 3. Schema 解码 + 附加 seq
  return Effect.forEach(rows, row => decodeMessageRow(row).pipe(Effect.map(msg => ({ seq: row.seq, message: msg }))))
}
```

**过滤策略**（`:24-53`）：
- `compaction` 存在 → 加载 `>= compaction.seq` 的消息 + `baselineSeq` 后的 system 消息
- `baselineSeq` 存在 → 排除 `<= baselineSeq` 的 system 类型消息（避免重复注入已在 baseline 中的 context）

---

### 阶段 8：LLM Request 组装

**入口**: `packages/llm/src/llm.ts:53-75` — `LLM.request()`

```ts
// llm.ts:53-75
const request = (input: RequestInput) => new LLMRequest({
  system: SystemPart.content(requestSystem),         // agent system prompt + baseline
  messages: [ ...messages, ...prompt ? [Message.user(prompt)] : [] ],
  tools: tools?.map(ToolDefinition.make) ?? [],
  toolChoice, generation, providerOptions, http, cache, ...
})
```

**消息转换**: `packages/core/src/session/runner/to-llm-message.ts` 将 V2 Session 消息（`user`/`assistant`/`tool`/`system`）翻译为 `@opencode-ai/llm` 的 `Message` 类。

`LLMRequest` Schema 定义见 `packages/llm/src/schema/messages.ts:271-284`，包含 `model`、`system`、`messages`、`tools`、`toolChoice`、`generation` 等全部字段。

---

### 阶段 9：Stream 执行 — LLMClient

**入口**: `packages/llm/src/route/client.ts:374-401`

```ts
// client.ts:344-359 — compile
const compile = (request) => {
  const resolved = applyCachePolicy(resolveRequestOptions(request))  // 合并 route/model/request 级别 options
  const body = yield* route.body.from(resolved)                       // 构建 provider-native body
  const prepared = yield* route.prepareTransport(body, resolved)      // 准备 HTTP transport
}
```

流程:
1. **`compile()`**：合并 route/model/request 三级选项 → 构建 protocol body → 准备 transport
2. **`streamRequestWith(runtime)(request)`**：compile → `route.streamPrepared(prepared, request, runtime)`：
   - Transport frames 流 → `decodeEvent`（解码每帧）→ `terminal ? takeUntil`（可选的流终止信号）→ `mapAccumEffect(initial, step)`（状态机翻译提供商事件 → 通用 `LLMEvent`）
3. **`generateWith(stream)`**：`stream → runFold(empty, reduce) → complete`（收集 stream 事件成 `LLMResponse`）

详见 [[04-LLM协议适配层]]。

---

### 阶段 10：事件发布

**入口**: `packages/core/src/session/runner/publish-llm-event.ts`

`createLLMEventPublisher(events, { sessionID, agent, model, snapshot })` 返回：

| LLM 事件 | 持久化操作 |
|----------|-----------|
| `text-delta` / `reasoning-delta` | 积累增量，flush 时合并写入 assistant 消息 |
| `tool-call` | 写入 `session_event` (Tool.Called)，本地调用 → 触发 `materialize.settle()` |
| `tool-result` | 写入 `session_event` (Tool.Succeeded / Tool.Failed) |
| `finish` | 写入 `session_event` (Step.Ended)，含 token 用量、snapshot、文件变更 |
| `provider-error` | 写入错误事件 |

**事件定义**: `packages/schema/src/session-event.ts` — 所有 V2 事件使用 `Event.define({ type, durable: {...}, schema })` 模式，通过 `EventV2.publish()` 持久化。

---

### 阶段 11：工具结算 — Tool Settlement

**入口**: `packages/core/src/tool/registry.ts:50+` — `Materialization.settle()`

```ts
// registry.ts:23-38
interface Materialization {
  definitions: ReadonlyArray<ToolDefinition>   // 给 LLM 的工具列表
  settle: (input: ExecuteInput) => Effect.Effect<Settlement, ToolOutputStore.Error>
}
interface Settlement {
  result: ToolResultValue        // 纯数据结果（JSON）
  output?: ToolOutput            // 格式化输出（含截断）
  outputPaths?: ReadonlyArray<string>   // 超长输出的 managed file 路径
}
```

执行流程：
1. 从 Registry 查找工具（Location 注册优先于 Application 注册）
2. 检查权限（`PermissionV2.Service`）
3. 执行工具 `execute()` 闭包
4. 结果 → `ToolOutputStore.bound()` → 若超限则写入 managed output file

**输出管理**: `packages/core/src/tool-output-store.ts` — `bound()` 将输出截断至 `MAX_LINES=2000 / MAX_BYTES=50KB`，超长部分写入 `tool-output/` 目录的临时文件，返回 `{ output, outputPaths }`。

---

## 三、Compaction 恢复流

当上下文接近模型限制时，compaction 触发自动恢复：

```
runTurnAttempt()
  │
  ├── compactIfNeeded() → 上下文过大？
  │   └── YES → throw continueAfterCompaction(step)  (defect)
  │
  ├── 被外层 catchDefect 捕获
  │   └── yieldNow → runTurn() 重新进入，step 保持
  │
  └── 重新执行时 history 从 compaction 点加载
       → Context Epoch 可能触发 ReplacementReady → 新 baseline
```

**overflow 恢复**：`runTurnAttempt` 的 `recoverOverflow` 参数在第一次运行时传入 `compaction.compactAfterOverflow`，若 overflow 发生在第二个 attempt 则直接 die。

---

## 四、关键文件索引

| 模块 | 文件 | 行号范围 |
|------|------|----------|
| 输入持久化 | `packages/core/src/session/input.ts` | :41-81 (admit), :83-116 (projectAdmitted), :245-288 (promote) |
| 协调器 | `packages/core/src/session/run-coordinator.ts` | :24-104 (全文件) |
| Runner 入口 | `packages/core/src/session/runner/index.ts` | :20-28 |
| Runner 执行 | `packages/core/src/session/runner/llm.ts` | :383-406 (run), :173-348 (runTurnAttempt) |
| Context Epoch | `packages/core/src/session/context-epoch.ts` | :23-89 (initialize/prepare) |
| 历史加载 | `packages/core/src/session/history.ts` | :24-99 |
| LLM Request 构建 | `packages/llm/src/llm.ts` | :53-75 |
| LLM Stream/Generate | `packages/llm/src/route/client.ts` | :344-408 |
| 工具结算 | `packages/core/src/tool/registry.ts` | :50+ (settleWith) |
| 输出管理 | `packages/core/src/tool-output-store.ts` | :50-211 |
| 事件发布 | `packages/core/src/session/runner/publish-llm-event.ts` | 全文件 |
| 事件定义 | `packages/schema/src/session-event.ts` | :54+ |
| System Context | `packages/core/src/system-context/index.ts` | :198-291 |
| 消息 Schema | `packages/llm/src/schema/messages.ts` | :271-309 |
| Compaction | `packages/core/src/session/compaction.ts` | compactIfNeeded, compactAfterOverflow |
