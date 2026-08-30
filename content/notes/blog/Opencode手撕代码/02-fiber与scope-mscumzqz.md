---
blog: true
title: "02-Fiber与Scope"
slug: "02-fiber与scope-mscumzqz"
summary: "树节点：02 Fiber与Scope 父节点：02 Effect TS核心范式 子节点：无 概述 Effect TS 中的 Fiber 是轻量级绿色线程， Scope 是资源生命周期的边界。两者共同构成 Opencode 并发模型的基础：Session 执行、工具调用、插件生命周期、文件操作都通过 Fiber Scope 管理。02 Effect TS核心范式 Opencode 不使用 Effect 的 Supervisor 机制 ，也"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：02-Fiber与Scope
> 父节点：[[02-Effect-TS核心范式]]
> 子节点：无

---

## 概述

Effect-TS 中的 **Fiber** 是轻量级绿色线程，**Scope** 是资源生命周期的边界。两者共同构成 Opencode 并发模型的基础：Session 执行、工具调用、插件生命周期、文件操作都通过 Fiber + Scope 管理。[[02-Effect-TS核心范式]]

Opencode **不使用 Effect 的 Supervisor 机制**，也不使用 `forkDaemon`。所有并发都通过 `forkScoped` 绑定到 Scope，自动随 Scope 关闭而中断——这使得并发资源管理是确定性的。

---

## 1. Fiber 作为绿色线程

### 概念

Fiber 是 Effect 运行时调度的轻量级执行单元——比 OS 线程轻得多。一个 Fiber 调度器可以管理数百万个 Fiber。关键操作：

- **fork**：创建新 Fiber 并发执行
- **join**：等待 Fiber 完成并获取结果
- **interrupt**：从外部中断 Fiber
- **yieldNow**：主动让出执行权

### Opencode 中的 Fork 操作

Opencode **不使用原始 `Effect.fork`**——所有 fork 都通过 `Effect.forkScoped` 或 `FiberSet.run`，确保 Fiber 生命周期被 Scope 管理。

**forkScoped**（14 个使用点，11 个文件）——Fiber 绑定到当前 Scope，Scope 关闭时自动中断：

```ts
// packages/core/src/process.ts:223-225
const stderrFiber = yield* Effect.forkScoped(
  collectStream(handle.stderr, options?.maxErrorBytes)
    .pipe(Effect.map((x) => x.buffer.toString("utf8"))),
)
```

**forkIn**（7 个使用点，5 个文件）——将 Effect 派发到指定的 Scope 中：

```ts
// packages/core/src/background-job.ts:217
const scope = yield* Scope.fork(state.scope, "parallel")
```

```ts
// packages/core/src/integration.ts:315
Scope.close(attemptScope, Exit.void).pipe(
  Effect.forkIn(scope, { startImmediately: true }),
  Effect.asVoid
)
```

**forkDaemon——不存在。** 整个 Opencode 代码库中没有任何 `forkDaemon` 的使用。

---

## 2. FiberSet 模式 —— 批量 Fiber 管理

`FiberSet` 是 Effect 提供的批量 Fiber 管理原语，Opencode 在 Session Runner 的核心路径中使用。

### 创建与添加

```ts
// packages/core/src/session/runner/llm.ts:184
const toolFibers = yield* FiberSet.make<void, ToolOutputStore.Error>()
```

```ts
// packages/core/src/session/runner/llm.ts:271
).pipe(FiberSet.run(toolFibers))
```

每个 Provider Turn 中的工具调用都通过 `FiberSet.run` 派发到 `toolFibers` 中并发执行。

### 等待完成

```ts
// packages/core/src/session/runner/llm.ts:141-142
const awaitToolFibers = (fibers: FiberSet.FiberSet<void, ToolOutputStore.Error>) =>
  Effect.raceFirst(FiberSet.join(fibers), FiberSet.awaitEmpty(fibers))
```

`raceFirst` 确保：只要所有 Fiber 完成或 FiberSet 变空，等待立即结束。

### 中断时清理

```ts
// packages/core/src/session/runner/llm.ts:295
if (stream._tag === "Failure" && Cause.hasInterrupts(stream.cause))
  yield* FiberSet.clear(toolFibers)
```

```ts
// packages/core/src/session/runner/llm.ts:297-298
if (settled._tag === "Failure" && isUserDeclined(settled.cause)) {
  yield* FiberSet.clear(toolFibers)
  return yield* Effect.interrupt
}
```

当 Provider stream 被中断或用户拒绝工具权限时，`clear` 会中断所有正在执行的工具 Fiber。

### FiberSet.makeRuntime —— Coordinator 中的 Fiber 管理

`SessionRunCoordinator` 使用 `FiberSet.makeRuntime` 管理 Session 执行 Fiber：

```ts
// packages/core/src/session/run-coordinator.ts:29
const fork = yield* FiberSet.makeRuntime<never, void, never>()
```

Coordinator 中每个 Session 的 drain Fiber 通过 `fork()` 派发。当 Coordinator 的 Scope 关闭时，所有 drain Fiber 自动中断。

---

## 3. Fiber 生命周期管理

### Fiber.interrupt — 主动中断

```ts
// packages/core/src/session/run-coordinator.ts:94-101
const interrupt = (key: Key): Effect.Effect<void> =>
  Effect.suspend(() => {
    const entry = active.get(key)
    if (entry?.owner === undefined) return Effect.void
    entry.stopping = true
    entry.pendingWake = false
    return Fiber.interrupt(entry.owner)
  })
```

中断策略：
1. 设置 `stopping` 标志——阻止 `settle` 自动启动后续 drain
2. 清除 `pendingWake`——阻止排队的 wake 触发新的 drain
3. `Fiber.interrupt`——实际中断 Fiber。Fiber 的 `onExit` 仍然执行 → `settle` 仍然运行 → 外部 awaiters 被正确解锁

### Fiber.join — 等待结果

```ts
// packages/core/src/process.ts:234-236
const stderr = yield* Fiber.join(stderrFiber)
```

```ts
// packages/core/src/ripgrep.ts:134
const stderr = yield* Fiber.join(stderrFiber)
```

两个场景完全相同：并行 fork stderr 收集 Fiber，然后在需要错误信息时 join 获取结果。如果 Fiber 未完成，join 会阻塞等待。

### Effect.interrupt — 自身中断

当检测到不应继续的条件时主动中断：

```ts
// packages/core/src/session/runner/llm.ts:180-181
if (session.location.directory !== location.directory || 
    session.location.workspaceID !== location.workspaceID)
  return yield* Effect.interrupt
```

```ts
// packages/core/src/session/runner/llm.ts:297-300
if (settled._tag === "Failure" && isUserDeclined(settled.cause)) {
  yield* FiberSet.clear(toolFibers)
  return yield* Effect.interrupt
}
```

---

## 4. Scope —— 资源生命周期

### Scope 概念

`Scope` 是 Effect 中资源生命周期的管理边界。Scope 关闭时会按 LIFO 顺序执行所有注册的 finalizer。

Opencode 使用三种 Scope 模式：
1. **Scope 作为依赖**：服务构造时请求 `Scope.Scope`，绑定 Fiber 到该 Scope
2. **Scope.make + Scope.fork**：手动创建父子 Scope 层次
3. **Effect.scoped**：在 Effect 内部创建局部 Scope

### Scope.make + Scope.fork —— 插件系统中的多层 Scope

插件系统创建了一个根 Scope，每个插件在子 Scope 中运行：

```ts
// packages/core/src/plugin.ts:36-62
const scope = yield* Scope.make()

const add = Effect.fn("Plugin.add")(function* (id, effect) {
  // ...
  const child = yield* Scope.fork(scope)
  yield* effect(host).pipe(
    Scope.provide(child),
    Effect.withSpan("Plugin.load", { ... }),
    Effect.onExit((exit) =>
      Exit.isFailure(exit) ? Scope.close(child, exit) : Effect.void
    ),
  )
  active.set(id, child)
})
```

架构意义：每个插件在独立的子 Scope 中运行。关闭子 Scope 只影响该插件，不影响其他插件或根 Scope。插件加载失败时，子 Scope 随 Exit 关闭，自动释放该插件的所有资源。

### Scope.close —— 显式关闭

```ts
// packages/core/src/plugin.ts:94
if (current) yield* Scope.close(current, Exit.void).pipe(Effect.ignore)
```

### Scope 作为依赖 —— Coordinator 的 Scope 绑定

```ts
// packages/core/src/session/run-coordinator.ts:24-26
export const make = <Key, E>(options: {
  readonly drain: (key: Key, force: boolean) => Effect.Effect<void, E>
}): Effect.Effect<Coordinator<Key, E>, never, Scope.Scope> =>
```

`make` 要求 `Scope.Scope`——因此 Coordinator 的所有 Fiber 都绑定到调用者的 Scope。当 SessionExecutionLocal 的 Scope 关闭时，所有 Session drain Fiber 自动中断。

### Effect.scoped —— 局部 Scope

```ts
// packages/core/src/process.ts:146-147
const collect = Effect.scoped(
  Effect.gen(function* () {
    const handle = yield* spawner.spawn(command)
```

```ts
// packages/core/src/session/runner/llm.ts:348
}, Effect.scoped)
```

`Effect.scoped` 创建一个局部 Scope，其中的 `forkScoped` Fiber 在 Scope 退出时自动中断。

### Effect.acquireRelease —— 配对资源管理

用于"获取-释放"对称模式：

```ts
// packages/core/src/cross-spawn-spawner.ts:373-374
const [proc, signal] = yield* Effect.acquireRelease(
  spawn(command, { cwd: dir, env: env(...), ... }),
  // release 回调：进程退出时清理
)
```

```ts
// packages/core/src/system-context/registry.ts:26
yield* Effect.acquireRelease(
  // acquire: 注册 Context Source
  // release: 注销 Context Source
)
```

### Effect.addFinalizer —— 单方面清理

当只需要清理而不需要获取返回值时使用（12 个使用点）：

```ts
// packages/core/src/plugin.ts:128-133
yield* Effect.addFinalizer((exit) =>
  Effect.gen(function* () {
    active.clear()
    yield* State.batch(Scope.close(scope, exit))
  }),
)
```

```ts
// packages/core/src/database/sqlite.node.ts:158
yield* Effect.addFinalizer(() => Effect.sync(() => native.close()))
```

```ts
// packages/core/src/event.ts:162
yield* Effect.addFinalizer(() => Effect.all([shutdown, unsubscribe], { concurrency: "unbounded" }))
```

---

## 5. Opencode 中的 Fiber 核心应用场景

### 场景 1：Session 执行 —— RunCoordinator Fiber 序列化

`SessionRunCoordinator` 确保**同一 Session 的 drain 串行执行**，不同 Session 可以并发：

```ts
// packages/core/src/session/run-coordinator.ts:37-64
const start = (key, entry, force, successor = false) => {
  const owner = fork(
    (successor ? Effect.yieldNow : Deferred.await(ready)).pipe(
      Effect.andThen(Effect.suspend(() => options.drain(key, force))),
      Effect.onExit((exit) => Effect.sync(() => settle(key, entry, exit))),
      Effect.exit, Effect.asVoid,
    ),
  )
  entry.owner = owner
}
```

- `start`：在 Coordinator 的 FiberSet 中 fork 一个 drain Fiber
- `settle`：根据结果决定是否自动启动后继 drain（如果 `pendingWake` 为 true）
- `run`：使用 `uninterruptibleMask` 保证 entry 创建 + 启动的原子性
- `wake`：如果 drain 正在运行则仅标记 `pendingWake` = true（合并），否则启动新 drain

### 场景 2：Provider Turn —— 工具调用的 FiberSet

每个 Provider Turn 中，模型可能返回多个 tool_call。这些工具调用通过 `FiberSet` 并发执行：

```ts
// packages/core/src/session/runner/llm.ts:250-271
yield* Effect.uninterruptibleMask((restore) =>
  restore(
    toolMaterialization.settle({
      sessionID: session.id, agent: agent.id, assistantMessageID,
      call: event,
    }),
  ).pipe(
    Effect.flatMap((settlement) =>
      publish(LLMEvent.toolResult({ ... }), settlement.outputPaths ?? []),
    ),
  ),
).pipe(FiberSet.run(toolFibers))
```

每个工具结算通过 `FiberSet.run` 派发为独立 Fiber，与 Provider Stream 并发执行。`Effect.uninterruptibleMask` 确保 settlement（包括权限检查和 DB 写入）不会被中断。

### 场景 3：Session 中断传播

```ts
// packages/core/src/session.ts:361
// SessionV2.interrupt 使用 uninterruptible 确保原子性
```

中断链路：`SessionV2.interrupt` → `SessionRunCoordinator.interrupt` → `Fiber.interrupt(entry.owner)` → drain Fiber 被中断 → `settle` 运行 → `FiberSet.clear(toolFibers)` → 所有工具 Fiber 被中断。

### 场景 4：Background Job —— 并行 Scope 的独立生命周期

```ts
// packages/core/src/background-job.ts:217
const scope = yield* Scope.fork(state.scope, "parallel")
```

每个 Background Job 在独立的 `"parallel"` Scope 中运行。名字 `"parallel"` 意味着 Scope 关闭时等待所有子 Fiber 完成（而非立即中断），适合有明确完成语义的后台任务。

---

## 6. Scope 资源管理应用

### 数据库连接

```ts
// packages/core/src/database/sqlite.node.ts:158
yield* Effect.addFinalizer(() => Effect.sync(() => native.close()))
```

数据库连接在服务 Scope 关闭时通过 `addFinalizer` 自动释放。

### PTY 会话

```ts
// packages/core/src/pty.ts:127
yield* Effect.addFinalizer(() => /* PTY cleanup */)
```

### 文件监视器

```ts
// packages/core/src/filesystem/watcher.ts:110
yield* Effect.forkScoped(subscribe(...))
```

```ts
// packages/core/src/filesystem/watcher.ts:122
yield* Effect.forkScoped(subscribe(vcs, ignore))
```

文件监视器通过 `forkScoped` 派生，Scope 关闭时自动取消订阅。

### 文件锁

```ts
// packages/core/src/util/effect-flock.ts:260-265
const handle = yield* Effect.acquireRelease(
  acquireHandle(...),
  (handle) => release(handle)
)
```

### Context Source 注册

```ts
// packages/core/src/system-context/registry.ts:26
yield* Effect.acquireRelease(
  // acquire: 注册 source
  // release: 注销 source
)
```

---

## 7. Supervisor 模式

### 在 Opencode 中：不使用

**整个 Opencode 代码库中没有 `Effect.Supervisor`、`Supervisor.track` 或任何 Supervisor 的使用。** 这意味着：

- 没有集中式的 Fiber 健康监控
- 没有 Fiber 失败时的自动重启策略
- 每个子系统自行管理其 Fiber 的错误处理
- 错误通过 Effect 类型系统（`E` 通道）和 `Effect.onExit` 处理

### 错误处理替代方案

Opencode 用以下机制替代 Supervisor：

1. **`Effect.onExit`**：在每个 `start` 函数中捕获 Fiber 退出，调用 `settle`
2. **`Effect.tapCause`**：在 drain 回调中只记录非中断错误（中断被静默忽略）
3. **`Cause.hasInterruptsOnly`**：区分中断 vs 真实错误

```ts
// packages/core/src/session/execution/local.ts:22-26
Effect.tapCause((cause) =>
  Cause.hasInterruptsOnly(cause)
    ? Effect.void
    : Effect.logError("Failed to drain Session", cause)
      .pipe(Effect.annotateLogs({ sessionID })),
)
```

---

## 总结

| 概念             | Effect API                       | Opencode 核心用法               | 文件位置                                          |
| -------------- | -------------------------------- | --------------------------- | --------------------------------------------- |
| Fork 到 Scope   | `Effect.forkScoped(...)`         | 14 处：进程 stderr、监视器、心跳       | `process.ts:223`, `watcher.ts:110`            |
| Fork 到指定 Scope | `Effect.forkIn(scope)`           | 7 处：后台任务、集成 OAuth           | `background-job.ts:168`, `integration.ts:315` |
| 批量 Fork 管理     | `FiberSet.make` + `run` + `join` | Session Runner 工具执行         | `session/runner/llm.ts:184,271,142`           |
| 等待 Fiber       | `Fiber.join(fiber)`              | 进程/ripgrep stderr 收集        | `process.ts:236`, `ripgrep.ts:134`            |
| 中断 Fiber       | `Fiber.interrupt(owner)`         | Coordinator 中断              | `run-coordinator.ts:100`                      |
| 创建 Scope       | `Scope.make()`                   | 插件根 Scope                   | `plugin.ts:36`                                |
| 创建子 Scope      | `Scope.fork(scope, "parallel")`  | 插件加载、后台任务                   | `plugin.ts:58`, `background-job.ts:217`       |
| 关闭 Scope       | `Scope.close(child, exit)`       | 插件卸载、集成清理                   | `plugin.ts:56,94`                             |
| 局部 Scope       | `Effect.scoped(Effect)`          | 进程 spawn、Provider turn      | `process.ts:146`, `session/runner/llm.ts:348` |
| 资源获取-释放        | `Effect.acquireRelease(a, r)`    | 进程 spawn、文件锁、Context source | `cross-spawn-spawner.ts:373`                  |
| 单方面清理          | `Effect.addFinalizer(...)`       | 12 处：DB、PTY、Event、Watcher   | `sqlite.node.ts:158`, `plugin.ts:128`         |
| 中断保护           | `Effect.uninterruptibleMask`     | 工具结算、entry 创建               | `session/runner/llm.ts:250,277`               |
| Supervisor     | **不存在**                          | —                           | —                                             |
| forkDaemon     | **不存在**                          | —                           | —                                             |
