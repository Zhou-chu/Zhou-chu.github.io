---
blog: true
title: "09-Fork与Fiber生命周期"
slug: "09-fork与fiber生命周期-mscun0jo"
summary: "树节点：09 Fork与Fiber生命周期 父节点：Opencode的工作原理 子节点：09 取消与中断传播 | 09 错误处理与Supervisor OpenCode 基于 Effect 运行时构建，其并发模型的核心是 Fiber （轻量级虚拟线程）与 Fork （创建 Fiber 的操作）。理解 Fork 的变体与 Fiber 的生命周期管理，是掌握 05 Runner执行循环 和 08 工具执行与结算 的前提。 Effect.fo"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "09-取消与中断传播-mscun0jy"
  - "09-错误处理与supervisor-mscun0jr"
  - "08-工具执行与结算-mscun0jf"
  - "02-fiber与scope-mscumzqz"
---

> 树节点：09-Fork与Fiber生命周期
> 父节点：[[Opencode的工作原理]]
> 子节点：[[09-取消与中断传播]] | [[09-错误处理与Supervisor]]

OpenCode 基于 Effect 运行时构建，其并发模型的核心是 **Fiber**（轻量级虚拟线程）与 **Fork**（创建 Fiber 的操作）。理解 Fork 的变体与 Fiber 的生命周期管理，是掌握 [[05-Runner执行循环]] 和 [[08-工具执行与结算]] 的前提。

---

## Effect.fork 四变体

Effect 提供四种 fork 策略，OpenCode 在不同场景各有使用：

| API | 语义 | OpenCode 使用场景 |
|-----|------|-------------------|
| `Effect.fork` | 返回 `Effect<Fiber>`, 父 Scope 关闭时一起中断 | 一般并发任务 |
| `Effect.forkDaemon` | 返回 `Effect<Fiber>`, 不受父 Scope 影响 | （未使用） |
| `Effect.forkScoped` | 返回 `Effect<Fiber>`, fiber 生命周期绑定到当前 Scope | （未使用） |
| `Effect.forkIn` | 返回 `Effect<Fiber>`, 绑定到指定的 `Scope` | BackgroundJob, [[02-Fiber与Scope]] |

### forkIn 的实际使用：BackgroundJob

`packages/core/src/background-job.ts:173-188` 是 `forkIn` 的直接应用：

```ts
// background-job.ts:173-188
const fork = Effect.fn("BackgroundJob.fork")(function* (
  scope: Scope.Scope,
  id: string,
  token: object,
  sequence: number,
  run: Effect.Effect<string, unknown>,
) {
  return yield* run.pipe(
    Effect.matchCauseEffect({
      onSuccess: (output) => settle(id, token, sequence, Exit.succeed(output)),
      onFailure: (cause) => settle(id, token, sequence, Exit.failCause(cause)),
    }),
    Effect.asVoid,
    Effect.forkIn(scope, { startImmediately: true }),
  )
})
```

每个 BackgroundJob 启动时通过 `Scope.fork(state.scope, "parallel")` 创建子 Scope (`background-job.ts:217`)，后续任务通过 `Effect.forkIn(scope)` 绑定到该 Scope。当 cancel 发生时 (`background-job.ts:337-358`)，调用 `Scope.close(result.scope, Exit.void)` 即可一次性终止该 Scope 内所有 fork 出的 fiber。

---

## FiberSet 模式：批量并发管理

FiberSet 是 Effect 提供的高层并发容器，核心操作：

| 操作 | 语义 |
|------|------|
| `FiberSet.make()` | 创建一个空集合，受当前 Scope 管理 |
| `FiberSet.makeRuntime()` | 创建集合 + 获取一个 fork 函数 |
| `FiberSet.run(set)(effect)` | 将 effect fork 到集合中 |
| `FiberSet.join(set)` | 等待集合中所有 fiber **结束**（包含结果） |
| `FiberSet.awaitEmpty(set)` | 等待集合变为空（不关心结果） |
| `FiberSet.clear(set)` | 中断集合中所有 fiber |

### RunCoordinator 中的 FiberSet.makeRuntime

`packages/core/src/session/run-coordinator.ts:27-29`：

```ts
// run-coordinator.ts:27-29
const active = new Map<Key, Entry<E>>()
const fork = yield* FiberSet.makeRuntime<never, void, never>()
```

`makeRuntime` 返回的 `fork` 函数在 `start()` 中调用 (`run-coordinator.ts:39-46`)，将 drain 协程 fork 到集合中：

```ts
// run-coordinator.ts:37-48
const start = (key: Key, entry: Entry<E>, force: boolean, successor = false) => {
  const ready = Deferred.makeUnsafe<void>()
  const owner = fork(
    (successor ? Effect.yieldNow : Deferred.await(ready)).pipe(
      Effect.andThen(Effect.suspend(() => options.drain(key, force))),
      Effect.onExit((exit) => Effect.sync(() => settle(key, entry, exit))),
      Effect.exit,
      Effect.asVoid,
    ),
  )
  entry.owner = owner
  if (!successor) Deferred.doneUnsafe(ready, Effect.void)
}
```

FiberSet 的 Scope 由 `make` 的调用者持有 — 当整个 Coordinator 的 Scope 关闭时，所有 drain fiber 自动被中断。

### 工具执行的并行 FiberSet

`packages/core/src/session/runner/llm.ts:184,271`：

```ts
// llm.ts:184
const toolFibers = yield* FiberSet.make<void, ToolOutputStore.Error>()

// llm.ts:271 - 每个工具调用作为独立 fiber 运行
).pipe(FiberSet.run(toolFibers))

// llm.ts:141-142 - 等待所有工具完成或集合为空
const awaitToolFibers = (fibers: FiberSet.FiberSet<void, ToolOutputStore.Error>) =>
  Effect.raceFirst(FiberSet.join(fibers), FiberSet.awaitEmpty(fibers))
```

在一个 provider turn 中，多个本地工具调用的 settlement 通过 `FiberSet.run` 并行执行，然后用 `Effect.raceFirst(FiberSet.join(fibers), FiberSet.awaitEmpty(fibers))` 等待全部完成。`raceFirst` 确保任一条件满足即继续：要么所有 fiber 完成了 join（有结果），要么集合为空（没有待执行的工具）。

---

## RunCoordinator：单键串行 / 跨键并发

`packages/core/src/session/run-coordinator.ts` 实现了 Coordinator 抽象，核心设计：

```
> 树节点：09-Fork与Fiber生命周期
> 父节点：[[Opencode的工作原理]]
> 子节点：[[09-取消与中断传播]] | [[09-错误处理与Supervisor]]
```

**串行语义（同 key）**：通过 `active` Map 和 `Deferred` 实现。`run(key)` 方法 (`run-coordinator.ts:67-79`) 检查 key 是否已有运行的 entry — 有则 `Deferred.await(entry.done)` 等待其完成（join 语义）；无则创建新 entry 并启动 drain。`wake(key)` (`run-coordinator.ts:81-92`) 通过 `pendingWake` 标记实现合并：drain 完成后若 `pendingWake=true`，自动启动 successor drain。

**并发语义（不同 key）**：不同 key 有独立的 entry，各自 drain fiber 独立运行。Root fork 发生在 `execution/local.ts:16-29`：

```ts
// execution/local.ts:16-29
const coordinator = yield* SessionRunCoordinator.make<SessionSchema.ID, SessionRunner.RunError>({
  drain: Effect.fnUntraced(function* (sessionID, force) {
    const session = yield* store.get(sessionID)
    if (!session) return yield* Effect.die(`Session not found: ${sessionID}`)
    return yield* SessionRunner.Service.use((runner) => runner.run({ sessionID, force })).pipe(
      Effect.provide(locations.get(session.location)),
      Effect.tapCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.void
          : Effect.logError("Failed to drain Session", cause).pipe(Effect.annotateLogs({ sessionID })),
      ),
    )
  }),
})
```

---

## 源头追踪

| 源码位置 | 关键内容 |
|----------|---------|
| `packages/core/src/session/run-coordinator.ts:3` | Deferred, Fiber, FiberSet, Scope 导入 |
| `packages/core/src/session/run-coordinator.ts:27-29` | FiberSet.makeRuntime |
| `packages/core/src/session/run-coordinator.ts:37-48` | start() — fork drain fiber |
| `packages/core/src/session/run-coordinator.ts:51-65` | settle() — drain 后清理或 successor |
| `packages/core/src/session/run-coordinator.ts:67-79` | run() — 单键串行 |
| `packages/core/src/session/run-coordinator.ts:81-92` | wake() — 合并唤醒 |
| `packages/core/src/session/runner/llm.ts:184` | 工具 FiberSet.make |
| `packages/core/src/session/runner/llm.ts:271` | FiberSet.run 并行执行工具 |
| `packages/core/src/session/runner/llm.ts:141-142` | awaitToolFibers raceFirst |
| `packages/core/src/session/runner/llm.ts:295-298` | 中断时 FiberSet.clear |
| `packages/core/src/session/execution/local.ts:16-29` | Root fork 到 Coordinator |
| `packages/core/src/background-job.ts:173-188` | forkIn 模式 |
| `packages/core/src/background-job.ts:217` | Scope.fork 创建子 Scope |
| `packages/core/src/background-job.ts:337-358` | cancel — Scope.close |
