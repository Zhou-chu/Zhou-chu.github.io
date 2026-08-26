---
blog: true
title: "09-取消与中断传播"
slug: "09-取消与中断传播-mscun0jy"
summary: "树节点：09 取消与中断传播 父节点：09 Fork与Fiber生命周期 子节点：无 OpenCode 的中断系统建立在 Effect 的 Fiber.interrupt 之上，从 HTTP API 层一直传播到工具执行层。整体链路为： 用户请求 → SessionExecution → RunCoordinator.interrupt → Fiber.interrupt → tool cleanup 。 中断入口：SessionExe"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "09-fork与fiber生命周期-mscun0jo"
---

> 树节点：09-取消与中断传播
> 父节点：[[09-Fork与Fiber生命周期]]
> 子节点：无

OpenCode 的中断系统建立在 Effect 的 `Fiber.interrupt` 之上，从 HTTP API 层一直传播到工具执行层。整体链路为：**用户请求 → SessionExecution → RunCoordinator.interrupt → Fiber.interrupt → tool cleanup**。

---

## 中断入口：SessionExecution.interrupt

`packages/core/src/session/execution.ts:16-17` 定义了接口：

```ts
// execution.ts:16-17
/** Interrupt active work owned by this process. Idle interruption is a no-op. */
readonly interrupt: (sessionID: SessionSchema.ID) => Effect.Effect<void>
```

在 `execution/local.ts:33`，直接委托给 Coordinator：

```ts
interrupt: coordinator.interrupt,
```

## RunCoordinator.interrupt：传播给 drain fiber

`packages/core/src/session/run-coordinator.ts:94-101`：

```ts
// run-coordinator.ts:94-101
const interrupt = (key: Key): Effect.Effect<void> =>
  Effect.suspend(() => {
    const entry = active.get(key)
    if (entry?.owner === undefined) return Effect.void
    entry.stopping = true
    entry.pendingWake = false
    return Fiber.interrupt(entry.owner)
  })
```

关键步骤：
1. 查找该 Session ID 对应的 active entry
2. 若没有运行的 drain fiber（`entry.owner === undefined`），**幂等返回** — 空闲中断是 no-op
3. 设置 `stopping = true`，阻止 drain 完成后自动 successor
4. 清除 `pendingWake`，阻止合并的后续任务
5. 调用 `Fiber.interrupt(entry.owner)` 中断 drain fiber

## 中断在 drain fiber 中的传播

`Fiber.interrupt` 导致 drain fiber 内部的 `Effect.interrupt` 被抛出。在 `llm.ts` 中发生中断时有两条路径：

### 路径 1：stream 阶段中断 (`llm.ts:277-310`)

```ts
// llm.ts:294-310
if (stream._tag === "Failure" && Cause.hasInterrupts(stream.cause)) yield* FiberSet.clear(toolFibers)
const settled = yield* restore(awaitToolFibers(toolFibers)).pipe(Effect.exit)
// ...
if (
  (stream._tag === "Failure" && Cause.hasInterrupts(stream.cause)) ||
  (settled._tag === "Failure" && Cause.hasInterrupts(settled.cause))
) {
  yield* FiberSet.clear(toolFibers)
  yield* withPublication(publisher.failUnsettledTools("Tool execution interrupted"))
  // ...
}
```

- **第 295 行**: 若 provider stream 因中断失败 → 立即 `FiberSet.clear(toolFibers)` 清理所有正在执行/等待的工具
- **第 296 行**: 用 `restore(awaitToolFibers(...))` 等待工具 settlement；`restore` 在 `uninterruptibleMask` 中恢复可中断状态
- **第 302-310 行**: 若 stream 或 settled 因中断失败，再次 clear + 发布 "Tool execution interrupted"

### 路径 2：工具执行完成后的中断 (`llm.ts:297-301`)

```ts
// llm.ts:297-301
if (settled._tag === "Failure" && isUserDeclined(settled.cause)) {
  yield* FiberSet.clear(toolFibers)
  yield* withPublication(publisher.failUnsettledTools("Tool execution interrupted"))
  return yield* Effect.interrupt
}
```

用户拒绝权限 (`PermissionV2.DeclinedError`) 或被拒绝的问题 (`QuestionV2.RejectedError`) 也会触发中断。

## uninterruptibleMask：保护关键区域

`llm.ts:277` 使用了 `Effect.uninterruptibleMask`：

```ts
// llm.ts:277
return yield* Effect.uninterruptibleMask((restore) =>
```

`uninterruptibleMask` 创建一个不可中断区域，通过 `restore` 回调在特定点恢复可中断性。OpenCode 用此保护：

1. **工具 settlement 写入** (`llm.ts:250-271`): 工具调用一旦开始执行，其 `FiberSet.run` 在 `restore` 内运行，允许工具执行被中断；但 settlement 的结果发布（`publish(...)`）在 `uninterruptible` 区域完成
2. **stream 结束后的清理** (`llm.ts:277-310`): stream 结束后的清理逻辑不可中断

## failInterruptedTools：启动时故障恢复

`llm.ts:119-139`:

```ts
// llm.ts:119-139
const failInterruptedTools = Effect.fn("SessionRunner.failInterruptedTools")(function* (
  sessionID: SessionSchema.ID,
) {
  for (const message of yield* getContext(sessionID)) {
    if (message.type !== "assistant") continue
    for (const tool of message.content) {
      if (tool.type !== "tool" || (tool.state.status !== "pending" && tool.state.status !== "running")) continue
      yield* events.publish(SessionEvent.Tool.Failed, {
        sessionID,
        timestamp: yield* DateTime.now,
        assistantMessageID: message.id,
        callID: tool.id,
        error: { type: "unknown", message: "Tool execution interrupted" },
        // ...
      })
    }
  }
})
```

每次 drain 启动时 (`llm.ts:390`)，`failInterruptedTools` 扫描历史消息中所有 `pending` 或 `running` 状态的工具调用，将它们标记为失败。这处理了上次运行被中断后未清理的工具状态。

## Deferred 模式与中断信号

`run-coordinator.ts` 使用 `Deferred` 作为同步原语：

```ts
// run-coordinator.ts:31-35
const makeEntry = (): Entry<E> => ({
  done: Deferred.makeUnsafe<void, E>(),
  pendingWake: false,
  stopping: false,
})
```

- **done Deferred**：调用者通过 `Deferred.await(entry.done)` 等待 drain 完成
- **stopping 标记**：中断时设为 `true`，`settle()` 函数（第 52 行）检查此标记决定是否启动 successor

---

## 源头追踪

| 源码位置 | 关键内容 |
|----------|---------|
| `packages/core/src/session/execution.ts:17` | interrupt 接口定义 |
| `packages/core/src/session/execution/local.ts:33` | 委托给 coordinator.interrupt |
| `packages/core/src/session/run-coordinator.ts:94-101` | interrupt — Fiber.interrupt(entry.owner) |
| `packages/core/src/session/run-coordinator.ts:52` | settle() 检查 stopping |
| `packages/core/src/session/runner/llm.ts:119-139` | failInterruptedTools — 恢复中断的工具状态 |
| `packages/core/src/session/runner/llm.ts:277` | uninterruptibleMask 保护 |
| `packages/core/src/session/runner/llm.ts:294-310` | 中断时 FiberSet.clear + failUnsettledTools |
| `packages/core/src/session/runner/llm.ts:297-301` | 用户拒绝 → 中断 |
| `packages/core/src/session/runner/llm.ts:390` | drain 启动时调用 failInterruptedTools |
