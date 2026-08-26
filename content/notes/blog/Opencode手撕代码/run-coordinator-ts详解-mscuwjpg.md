---
blog: true
title: "run-coordinator.ts详解"
slug: "run-coordinator-ts详解-mscuwjpg"
summary: "父笔记 : 会话输入与Prompt管理 · 02 session lifecycle 子笔记 : Drain和Fiber run coordinator.ts 是 OpenCode 里最精妙的状态机之一。我从类型到执行流程逐层拆解。 SessionRunCoordinator — 逐行详解 公共接口 四个操作，一个原则： 同一个 Key 串行，不同 Key 并发。 对于 OpenCode， Key 就是 SessionSchema.ID"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "drain和fiber-mscuwj4q"
---

> **父笔记**: [[会话输入与Prompt管理]] · [[02-session-lifecycle]]
> **子笔记**: [[Drain和Fiber]]

`run-coordinator.ts` 是 OpenCode 里最精妙的状态机之一。我从类型到执行流程逐层拆解。

---

## `SessionRunCoordinator` — 逐行详解

### 公共接口

```typescript
export interface Coordinator<Key, E> {
  readonly active: Effect.Effect<ReadonlySet<Key>>   // 当前哪些 key 有活跃的 drain
  readonly run: (key: Key) => Effect.Effect<void, E> // 启动或加入执行
  readonly wake: (key: Key) => Effect.Effect<void>   // 通知有新工作
  readonly interrupt: (key: Key) => Effect.Effect<void> // 中断当前执行
}
```

四个操作，一个原则：**同一个 Key 串行，不同 Key 并发。** 对于 OpenCode，`Key` 就是 `SessionSchema.ID`——同一个 Session 不会同时跑两个 drain，但不同 Session 可以并行。

---

### 内部状态：`Entry<E>`

```typescript
type Entry<E> = {
  readonly done: Deferred.Deferred<void, E>   // run() 的调用者等这个
  owner?: Fiber.Fiber<void, never>            // 正在执行的 fiber
  pendingWake: boolean                         // 执行期间有新工作到达
  stopping: boolean                            // 正在被中断
}
```

每个 key 在 `Map<Key, Entry>` 里占一个槽。Entry 的生命周期就是一次 drain 的生命周期——从 `run()` 或 `wake()` 创建开始，到 drain 结束且没有 pending wake 时被删除。
核心状态转换：
```
IDLE（不在 Map 里）
  │  run(key) 或 wake(key)
  ▼
RUNNING（在 Map 里，owner 存在）
  │  wake(key) 被调用
  ▼
RUNNING + pendingWake
  │  drain 成功结束，pendingWake = true，stopping = false
  ▼
CHAIN（同一个 entry，启动 successor drain）
  │  drain 结束，pendingWake = false
  ▼
IDLE（从 Map 删除，done Deferred 被 resolve）
```
---
### 构造函数（`SessionRunCoordinator.make`）
```typescript
export const make = <Key, E>(options: {
  readonly drain: (key: Key, force: boolean) => Effect.Effect<void, E>
}): Effect.Effect<Coordinator<Key, E>, never, Scope.Scope> =>
  Effect.gen(function* () {
    const active = new Map<Key, Entry<E>>()
    const fork = yield* FiberSet.makeRuntime<never, void, never>()
```
`drain` 是外部注入的执行函数——Coordinator 不关心 drain 里具体做什么，只负责**编排时机**。`force` 参数：`true` 表示 run（强制启动），`false` 表示 wake（"如果有工作就做，没有就停"）。
`FiberSet` 是一个 fiber 池：所有 drain 都以独立 fiber 运行在同一个 Scope 下。Scope 关闭时，所有未完成的 fiber 都会被中断。
### 启动 drain：`start`
```typescript
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
分两种情况：

| 参数 | 谁调用的 | 行为 |
|---|---|---|
| `successor = false` | `run()` 或 `wake()`——首次启动 | 创建 `ready` Deferred → 启动 fiber **等待** ready → `start` 返回后**立即** signal ready → fiber 开始执行 drain |
| `successor = true` | `settle()`——链式续跑 | 跳过 Deferred，改用 `Effect.yieldNow` → fiber 在下一个 microtick 开始执行 |

**为什么 successor 用 `yieldNow`？** `settle` 是在当前 fiber 的 `onExit` 回调里同步调用的。如果不 yield，successor 的 drain 会在当前 fiber 还没完全退出时就开始执行——可能导致 reentrancy。`yieldNow` 把 successor 推迟到当前 fiber 完全退出之后。
fiber 的执行链：
```
等待 ready / yieldNow → suspend(() => drain(key, force)) → onExit → settle(key, entry, exit)
```
`Effect.suspend` 保证了每次链式续跑都重新求值 `drain`（而不是复用旧的闭包）。
### 结算器：`settle`
```typescript
const settle = (key: Key, entry: Entry<E>, exit: Exit.Exit<void, E>) => {
  // ── 分支 A：成功 + 没被中断 + 有 pending wake → 链式续跑 ──
  if (Exit.isSuccess(exit) && !entry.stopping && entry.pendingWake) {
    entry.pendingWake = false
    start(key, entry, false, true)   // force=false, successor=true
    return                           // ← 关键：不调 Deferred.doneUnsafe！run() 的调用方继续等
  }

  // ── 分支 B：真正结束（失败 / 被中断 / 没有 pending wake）──
  const successor = entry.pendingWake ? makeEntry() : undefined
  if (successor === undefined) active.delete(key)
  else {
    active.set(key, successor)
    start(key, successor, false, true)
  }
  Deferred.doneUnsafe(entry.done, exit)   // ← 释放 run() 的调用方
}
```
这是整个 Coordinator 最精妙的部分。两个分支的语义完全不同：
**分支 A：链式续跑（不释放调用方）**
条件：drain **成功**结束 + 没被中断 + 在执行期间有人调了 `wake()`。
选择了"**不**让 `run()` 返回"——`Deferred.doneUnsafe` 不被调用，所以 `run()` 的调用方继续阻塞。同时用**同一个 entry** 启动 successor drain，这样后续的 `settle` 还会操作同一个 entry。
这保证了：只要 wakes 不断到达 + drain 持续成功，`run()` 就永远不会返回——它把多次 drain 合并成一次连续的"会话"。
**分支 B：真正完结（释放调用方）**
走到这里说明 drain 失败了、被中断了、或者没有 pending wake。
- 如果 `pendingWake` 还存在（在 drain 失败或被中断的瞬间到达了 wake）→ 创建**新 entry** 启动 successor drain，同时 resolve 旧 entry 的 Deferred。这样原先 `run()` 的调用方返回，新 drain 独立运行。
- 如果没有 `pendingWake` → 从 Map 删除 key（回到 IDLE），resolve Deferred。
### 外部 API：`run`
```typescript
const run = (key: Key): Effect.Effect<void, E> =>
  Effect.uninterruptibleMask((restore) => {
    const entry = active.get(key)
    // ── 情况 1：已在执行中 ──
    if (entry !== undefined) {
      if (entry.stopping) 
        return restore(Deferred.await(entry.done).pipe(Effect.andThen(run(key))))
      return restore(Deferred.await(entry.done))
    }
    // ── 情况 2：空闲 → 启动新 drain ──
    const next = makeEntry()
    active.set(key, next)
    start(key, next, true)    // force=true
    return restore(Deferred.await(next.done))
  })
```
三种场景：

| 场景 | 行为 |
|---|---|
| Key 空闲 | 创建 entry，`start(force=true)` 启动 drain，阻塞等待完成 |
| Key 正在跑 | 加入等待队列——阻塞在 `entry.done` 上。多条 `run()` 调用排队等同一个 Deferred |
| Key 正在被中断（`stopping = true`） | 等当前 drain 完成后**递归重试** `run(key)`，因为中断完成后 key 可能空闲或被 successor 接管 |
`Effect.uninterruptibleMask` 保证了"查询 Map + 设置 entry + 启动 fiber"这一段是原子的——不会被外部中断打断。
### 外部 API：`wake`
```typescript
const wake = (key: Key) =>
  Effect.sync(() => {
    const entry = active.get(key)
    if (entry !== undefined) {
      entry.pendingWake = true   // 标记 "有新工作"
      return                     // 不启动新的——当前 drain 结束后 settle 会处理
    }
    // Key 空闲 → 立即启动 drain（force=false）
    const next = makeEntry()
    active.set(key, next)
    start(key, next, false)     // force=false: "如果有工作就做，没有就停"
  })
```
`wake` 本身是同步的（`Effect.sync`）——它只修改状态或启动 fiber，不阻塞调用方。关键设计：
- **Key 正在跑**：只设 `pendingWake = true`。不打断当前 drain。当前 drain 的 `settle` 会在结束时看到这个标志并自动续跑。
- **Key 空闲**：直接启动 drain（`force=false`）。因为空闲状态说明没有人在等——wake 是"嘿，有新工作了，有空的话处理一下"。
`force=false` 的含义：wake 启动的 drain 不像 `run()` 那样"必须跑完"——它更像是"看看有没有待处理的工作，有就做，没有就停"。在 runner 里，`force=false` 意味着 drain 会检查 `hasPending`，如果没有待 promote 的输入就直接返回。
### 外部 API：`interrupt`

```typescript
const interrupt = (key: Key): Effect.Effect<void> =>
  Effect.suspend(() => {
    const entry = active.get(key)
    if (entry?.owner === undefined) return Effect.void
    entry.stopping = true
    entry.pendingWake = false      // 清除：中断优先于续跑
    return Fiber.interrupt(entry.owner)
  })
```
设置 `stopping = true`，清除 `pendingWake`（因为中断的优先级高于"有新工作"），然后中断 fiber。`settle` 看到 `stopping = true` 时会走分支 B（真正完结），不会链式续跑。
### 完整时序示例
假设用户快速连续发了三条消息（steer），我们用图来跟踪状态变化：

```
时间线
│
├─ run(session) 被调用
│   Map: {} → { session: entry1 }    start(session, entry1, force=true)
│   run() 的调用方阻塞在 entry1.done
│
├─ drain 正在执行...
│   │
│   ├─ wake(session) 被调用（第二条消息到达）
│   │   entry1.pendingWake = true
│   │
│   ├─ wake(session) 被调用（第三条消息到达）
│   │   entry1.pendingWake = true（已经是 true，无变化）
│   │
│   └─ drain 成功结束
│       settle(session, entry1, successExit)
│       → Exit.isSuccess ✓, !stopping ✓, pendingWake ✓
│       → 分支 A：start(session, entry1, force=false, successor=true)  链式续跑！
│       → run() 继续阻塞（Deferred.doneUnsafe 没被调）
│
├─ 第二次 drain 执行...（处理了第二条和第三条消息）
│   drain 成功结束，这次没有新的 wake
│   settle(session, entry1, successExit)
│   → pendingWake = false
│   → 分支 B：active.delete(session)
│   → Deferred.doneUnsafe(entry1.done, successExit)
│
└─ run() 返回 ✓
```

**三次消息，一次 `run()` 调用，两次 drain 执行，中途不返回。** 这就是 "coalesce"（合并）的精髓——Coordinator 把多次 wake 合并成一次连续的 `run()` 调用。
### 和 OpenCode 其他模块的衔接

```
HTTP handler 收到 POST /session/{id}/message
  └─ SessionInput.admit()       ← 持久化输入
  └─ SessionExecution.wake(id)  ← 通知 Coordinator "有新工作"
       └─ Coordinator.wake(id)
            ├─ 如果 Session 正在跑 → pendingWake = true（静默标记）
            └─ 如果 Session 空闲 → 启动 drain (force=false)
                 └─ Runner.drain() → promote → prepareOnce → LLM.request → stream...
```

Coordinator 在整个架构里的位置：它是 HTTP 层（外部事件）和 Runner 层（执行逻辑）之间的**调度胶水**——把"用户发了一条消息"这个外部事件，转译成"要不要跑 drain、怎么排队"的内部调度决策。
## 带注释的源代码
```typescript
export * as SessionRunCoordinator from "./run-coordinator"
import { Deferred, Effect, Exit, Fiber, FiberSet, Scope } from "effect"
/** Serializes execution for each key while allowing different keys to run concurrently. */
export interface Coordinator<Key, E> {
   /** Snapshots keys with an execution owned by this coordinator. */
   readonly active: Effect.Effect<ReadonlySet<Key>> // 当前哪些 key 有活跃的 drain
   /** Starts execution while idle or joins the active execution. */
   readonly run: (key: Key) => Effect.Effect<void, E>// 启动或加入执行
   /** Registers one coalesced follow-up after newly recorded work. */
   readonly wake: (key: Key) => Effect.Effect<void>// 通知有新工作
   /** Stops active execution and waits for its cleanup. */
   readonly interrupt: (key: Key) => Effect.Effect<void>// 中断当前执行
}
//四个操作，一个原则：同一个 Key 串行，不同 Key 并发。 对于 OpenCode，Key 就是 SessionSchema.ID——同一个 Session 不会同时跑两个 drain，但不同 Session 可以并行。
type Entry<E> = {
   readonly done: Deferred.Deferred<void, E>  // run() 的调用者等这个
   owner?: Fiber.Fiber<void, never> // 正在执行的 fiber
   pendingWake: boolean  // 执行期间有新工作到达
   stopping: boolean  // 正在被中断
}
export const make = <Key, E>(options: {
   readonly drain: (key: Key, force: boolean) => Effect.Effect<void, E>
}): Effect.Effect<Coordinator<Key, E>, never, Scope.Scope> =>
   Effect.gen(function* () {
     const active = new Map<Key, Entry<E>>()
     const fork = yield* FiberSet.makeRuntime<never, void, never>()
     const makeEntry = (): Entry<E> => ({
       done: Deferred.makeUnsafe<void, E>(),
       pendingWake: false,
       stopping: false,  
     })
     //根据是否为首个任务，选择立即执行或延迟执行一个"排空"操作，并将该操作的纤程句柄绑定到条目上，同时注册清理回调，是并发任务队列（或流处理）中启动工作单元的核心组件
     const start = (key: Key, entry: Entry<E>, force: boolean, successor = false) => {
       const ready = Deferred.makeUnsafe<void>()
       const owner = fork(
         //- 如果 successor 为 true：立即让出当前执行权（Effect.yieldNow），然后立即进入下一步（即不等待）。
         // - 如果为 false：等待 ready 被 resolve 后才继续。
         (successor ? Effect.yieldNow : Deferred.await(ready)).pipe(
           Effect.andThen(Effect.suspend(() => options.drain(key, force))),//执行真正的核心任务：调用 options.drain(key, force)（通常用于"排空"队列或处理一批数据）, suspend 确保该调用是惰性的（在纤程运行时才执行）。
           Effect.onExit((exit) => Effect.sync(() => settle(key, entry, exit))),//当上述任务结束（成功或失败）时，触发 settle 函数，用于更新 entry 的状态（例如标记完成、释放资源或处理错误）。
           Effect.exit,
           Effect.asVoid,//  将结果转为 Exit 类型（便于错误处理），然后忽略结果（返回 void），因为该纤程只关注副作用。
         ),
       )//fork 返回一个纤程句柄（Fiber）（通常是一个 Fiber.Runtime 或类似对象），赋值给 entry.owner，以便后续可以取消或等待该纤程。
       entry.owner = owner//将纤程句柄保存在 entry 中，使得外部可以通过 entry 来监控或终止该任务。
       if (!successor) Deferred.doneUnsafe(ready, Effect.void)//如果 successor 为 false（即非后继任务），则立即 resolve ready，使得第②步的 Deferred.await(ready) 立刻通过，纤程得以继续执行 drain。
     }
     //在某个任务（纤程）完成（成功或失败）后被触发，用于处理任务结束后的收尾工作，包括：
     //决定是否自动启动下一个任务（链式延续）
     //更新全局任务集合 active
     //通知等待该任务的消费者（通过完成 entry.done）
     //它是整个并发任务管理器中的"任务完结处理器"，负责维持任务队列的连续性。
     const settle = (key: Key, entry: Entry<E>, exit: Exit.Exit<void, E>) => {// exit: 任务执行结果（成功/失败）, Exit.Exit<void, E> 是函数式编程中表示"执行结果"的类型，要么成功（void），要么失败（错误类型 E）
       if (Exit.isSuccess(exit) && !entry.stopping && entry.pendingWake) {// 本条目执行成功，没有停止，有待唤醒标记
         entry.pendingWake = false
         start(key, entry, false, true)//那就接着干活
         return
       }
       //否则
       const successor = entry.pendingWake ? makeEntry() : undefined //如果有待唤醒标记，创建一个新的条目作为后继任务，否则 successor 为 undefined
       if (successor === undefined) active.delete(key) //没有后继任务，直接从 active 中移除该 key
       else {
         active.set(key, successor) // 有后继，则用新条目覆盖该 key 的映射，并立即调用 start(key, successor, false, true) 启动新条目的执行（同样以 successor = true 方式）。
         start(key, successor, false, true)
       }
       Deferred.doneUnsafe(entry.done, exit)
     }
     // 返回一个 Effect（效果），用于确保与给定 key 关联的任务正在运行，并等待其完成。它是整个任务管理系统的外部调用入口，外部只需调用 run(key) 即可触发或等待该 key 对应的任务完成。
     const run = (key: Key): Effect.Effect<void, E> =>
       Effect.uninterruptibleMask((restore) => { //创建一个不可中断的"掩码"区域，其内部的 Effect 不会被外部中断（如取消信号）打断。保证了从 active 集合中读取条目到后续操作之间的原子性，防止在关键步骤中被中断导致状态不一致。
         const entry = active.get(key) // 尝试从 active 获取已有条目
         if (entry !== undefined) {// 条目已存在
           if (entry.stopping) return restore(Deferred.await(entry.done).pipe(Effect.andThen(run(key))))// entry 正在被中断，等待其完成后再重新调用 run(key) 以确保任务继续执行。
           return restore(Deferred.await(entry.done)) // entry 正在执行，等待其完成。使用 restore 确保等待过程是可中断的。
         }
         // 条目不存在
         const next = makeEntry()
         active.set(key, next)
         start(key, next, true)
         return restore(Deferred.await(next.done))// 等待 next.done 完成（可中断地等待）
       })
     const wake = (key: Key) =>//打唤醒标记
       Effect.sync(() => {
         const entry = active.get(key)
         if (entry !== undefined) {//确实有条目，就打上标记了事
           entry.pendingWake = true
           return
         }
         const next = makeEntry()// 没有条目，创建一个新的条目并立即启动执行
         active.set(key, next)
         start(key, next, false)
       })
     // 主动停止与给定 key 关联的正在运行的任务（纤程）。它返回一个 Effect，执行后会尝试中断该任务，并清理相关状态。
     const interrupt = (key: Key): Effect.Effect<void> =>
       Effect.suspend(() => { // 将内部操作包装为惰性 Effect，只有在实际运行时才会执行函数体，避免在定义时立即执行副作用。
         const entry = active.get(key)
         if (entry?.owner === undefined) return Effect.void// 若不存在对应条目，或存在但 entry.owner 为空（可能任务尚未启动或已结束），则无需中断，直接返回空 Effect。
         entry.stopping = true
         entry.pendingWake = false
         return Fiber.interrupt(entry.owner)// entry.owner 是先前通过 fork 启动的纤程句柄（Fiber）。Fiber.interrupt 会向该纤程发送中断信号，尝试取消其执行。
       })
     return { active: Effect.sync(() => new Set(active.keys())), run, wake, interrupt }
   })
```
