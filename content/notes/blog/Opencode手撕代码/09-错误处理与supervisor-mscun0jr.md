---
blog: true
title: "09-错误处理与Supervisor"
slug: "09-错误处理与supervisor-mscun0jr"
summary: "树节点：09 错误处理与Supervisor 父节点：09 Fork与Fiber生命周期 子节点：无 OpenCode 使用 Effect 的类型化错误通道（E channel） 和 Schema.TaggedError 模式进行错误处理。整个系统不使用 Effect Supervisor，而是通过 FiberSet 管理并发 + 显式的错误传播链来实现容错。 Effect 错误通道（E Channel） 每个 Effect 有三个类型"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "09-fork与fiber生命周期-mscun0jo"
---

> 树节点：09-错误处理与Supervisor
> 父节点：[[09-Fork与Fiber生命周期]]
> 子节点：无

OpenCode 使用 **Effect 的类型化错误通道（E channel）** 和 **Schema.TaggedError** 模式进行错误处理。整个系统不使用 Effect Supervisor，而是通过 FiberSet 管理并发 + 显式的错误传播链来实现容错。

---

## Effect 错误通道（E Channel）

每个 `Effect<A, E, R>` 有三个类型参数：
- **A**: 成功值类型
- **E**: 错误类型（可以有多个具体错误类型）
- **R**: 依赖类型

```ts
// 例如 SessionRunner.run 的错误类型
// execution/local.ts:17
SessionRunCoordinator.make<SessionSchema.ID, SessionRunner.RunError>({ ... })
```

`RunError` 作为 Effect 的 `E` 参数，编译期确保所有可能的错误都被处理或传播。

## RunError 联合类型

`packages/core/src/session/runner/index.ts:11-17`：

```ts
// runner/index.ts:11-17
export type RunError =
  | LLMError
  | SessionRunnerModel.Error
  | MessageDecodeError
  | ContextSnapshotDecodeError
  | SystemContext.InitializationBlocked
  | ToolOutputStore.Error
```

这是一个 **联合类型（union type）**，涵盖了 Runner 执行过程中所有可能的失败路径：

| 错误类型 | 来源 | 含义 |
|----------|------|------|
| `LLMError` | `@opencode-ai/llm` | Provider 调用失败（认证、限流、传输等） |
| `Model.Error` | `runner/model.ts:67-72` | 模型选择/解析失败 |
| `MessageDecodeError` | `session/error.ts:5-12` | 消息解码失败 |
| `ContextSnapshotDecodeError` | `session/error.ts:14-24` | Context Snapshot 解码失败 |
| `InitializationBlocked` | SystemContext | Context Epoch 初始化阻塞 |
| `ToolOutputStore.Error` | tool-output-store | 工具输出存储失败 |

## Schema.TaggedError 模式

OpenCode 广泛使用 Effect 的 `Schema.TaggedErrorClass` 定义具名错误。每个错误自描述：

```ts
// session/error.ts:5-12
export class MessageDecodeError extends Schema.TaggedErrorClass<MessageDecodeError>()("Session.MessageDecodeError", {
  sessionID: SessionSchema.ID,
  messageID: SessionMessage.ID,
}) {
  override get message() {
    return `Failed to decode message ${this.messageID} in session ${this.sessionID}`
  }
}
```

同样的模式在 `runner/model.ts:18-66` 定义了四种模型错误：

```ts
// model.ts:18-27
export class ModelNotSelectedError extends Schema.TaggedErrorClass<ModelNotSelectedError>()(
  "SessionRunnerModel.ModelNotSelectedError",
  { sessionID: SessionSchema.ID },
) { override get message() { return `No model is available for session ${this.sessionID}` } }

// model.ts:29-38
export class ModelUnavailableError extends Schema.TaggedErrorClass<ModelUnavailableError>()(
  "SessionRunnerModel.ModelUnavailableError",
  { providerID: ProviderV2.ID, modelID: ModelV2.ID },
) { override get message() { return `Model unavailable: ${this.providerID}/${this.modelID}` } }

// model.ts:41-51
export class VariantUnavailableError extends Schema.TaggedErrorClass<VariantUnavailableError>()(...)
// model.ts:54-64
export class UnsupportedApiError extends Schema.TaggedErrorClass<UnsupportedApiError>()(...)
```

以及 `@opencode-ai/llm` 中的 `LLMError` (`packages/llm/src/schema/errors.ts:174-192`)：

```ts
// errors.ts:174-192
export class LLMError extends Schema.TaggedErrorClass<LLMError>()("LLM.Error", {
  module: Schema.String,
  method: Schema.String,
  reason: LLMErrorReason,  // 联合类型: InvalidRequest | RateLimit | Transport | ...
}) {
  override readonly cause = this.reason
  get retryable() { return this.reason.retryable }
  // ...
}
```

`LLMError.reason` 是一个 tagged union，通过 `_tag` 字段区分 Authentication、RateLimit、Transport 等具体原因。

## catchTag / catchAll / mapError

### catchTag：按 tag 捕获

`packages/core/src/session/compaction.ts:211`：

```ts
// compaction.ts:211
Effect.catchTag("LLM.Error", () => Effect.succeed(false))
```

按 `_tag` 字段精确捕获 `LLM.Error` 类型的错误，将其转换为成功值 `false`，其他错误继续传播。

### catchAll：捕获全部错误

```ts
Effect.catchAll((error) => Effect.succeed(defaultValue))
```

捕获所有 `E` 通道错误（不论类型），适用于"任何错误都用默认值替代"的场景。

### mapError：转换错误类型

`packages/core/src/session/context-epoch.ts:57`：

```ts
// context-epoch.ts:57
Effect.mapError((error) => new ContextSnapshotDecodeError({ sessionID, details: String(error) }))
```

`packages/core/src/session/history.ts:56-63`：

```ts
// history.ts:56-63
const decodeMessageRow = (row) =>
  decode({ ...row.data, id: row.id, type: row.type }).pipe(
    Effect.mapError(
      () => new MessageDecodeError({
        sessionID: SessionSchema.ID.make(row.session_id),
        messageID: SessionMessage.ID.make(row.id),
      }),
    ),
  )
```

将底层错误映射为有语义的上层错误，保持错误链的类型安全。

## 为什么 Opencode 不使用 Effect Supervisor

Effect 提供了 `Supervisor` 工具用于监控 fiber 的启动/结束/失败。在 `packages/core/src/` 中搜索 `Supervisor` 结果为 **零**。

替代方案：
1. **FiberSet 管理并发生命周期**：所有并发任务通过 `FiberSet` 创建和追踪（`run-coordinator.ts`, `llm.ts`）。FiberSet 提供 `join`、`clear`、`awaitEmpty` 等方法精确控制。
2. **显式的错误处理链**：每个 Effect 调用通过 `Effect.catchTag`、`Effect.mapError`、`matchCauseEffect` 等方式显式处理或传播错误。
3. **Settle 回调 + Deferred**：`run-coordinator.ts:51-65` 的 `settle()` 函数在 drain 完成后通过 `Deferred.doneUnsafe(entry.done, exit)` 将完成/错误信号传递给等待者。

这种设计的优势：
- **可追溯**：每个错误路径都有明确的代码位置
- **可控**：中断和错误传播的每一步都是显式的，不依赖全局 hook
- **可测试**：没有隐式的 Supervisor 副作用，函数行为完全由类型决定

## 源头追踪

| 源码位置 | 关键内容 |
|----------|---------|
| `packages/core/src/session/error.ts:5-12` | MessageDecodeError (TaggedErrorClass) |
| `packages/core/src/session/error.ts:14-24` | ContextSnapshotDecodeError |
| `packages/core/src/session/runner/index.ts:11-17` | RunError 联合类型 |
| `packages/core/src/session/runner/model.ts:18-27` | ModelNotSelectedError |
| `packages/core/src/session/runner/model.ts:29-38` | ModelUnavailableError |
| `packages/core/src/session/runner/model.ts:41-51` | VariantUnavailableError |
| `packages/core/src/session/runner/model.ts:54-64` | UnsupportedApiError |
| `packages/core/src/session/runner/model.ts:67-72` | Model.Error 联合类型 |
| `packages/llm/src/schema/errors.ts:174-192` | LLMError (TaggedErrorClass + tagged union reason) |
| `packages/llm/src/schema/errors.ts:160-171` | LLMErrorReason 联合类型 |
| `packages/core/src/session/compaction.ts:211` | catchTag("LLM.Error") |
| `packages/core/src/session/context-epoch.ts:57` | mapError → ContextSnapshotDecodeError |
| `packages/core/src/session/history.ts:56-63` | mapError → MessageDecodeError |
| `packages/core/src/session/run-coordinator.ts:51-65` | settle + Deferred.doneUnsafe |
| `packages/core/src/session/runner/llm.ts:277` | uninterruptibleMask 保护错误处理区域 |
