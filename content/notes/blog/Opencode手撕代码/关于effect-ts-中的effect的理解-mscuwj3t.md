---
blog: true
title: "关于Effect-ts 中的Effect的理解"
slug: "关于effect-ts-中的effect的理解-mscuwj3t"
summary: "这个问题触及了 Effect TS 最核心的设计理念。让我从\"什么是 Effect\"讲到\"为什么这里要传 Effect\"。 一、Effect 是什么：一张\"菜谱\" Effect 不是 string 。它是一张 还没执行的菜谱 ——描述了\"需要做什么事来得到一个 string\"，但描述本身 不做任何事 。 类比 | | 菜谱 | 做菜 | | | | | | Effect | Effect.sync(() = 切菜() 炒菜()) | E"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "prepareonce-的四个出口-mscuwj40"
  - "system-context部分的工作原理-mscuwjpc"
---

这个问题触及了 Effect-TS 最核心的设计理念。让我从"什么是 Effect"讲到"为什么这里要传 Effect"。
## 一、Effect 是什么：一张"菜谱"

```ts
// ❌ 这是"值"——已经做好的菜
const date: string = new Date().toDateString()

// ✅ 这是 Effect——一张菜谱，描述了"怎么做出这道菜"
const dateEffect: Effect<string> = Effect.sync(() => new Date().toDateString())
```

`Effect<string>` **不是** `string`。它是一张**还没执行的菜谱**——描述了"需要做什么事来得到一个 string"，但描述本身**不做任何事**。

### 类比

| | 菜谱 | 做菜 |
|---|---|---|
| Effect | `Effect.sync(() => 切菜() + 炒菜())` | `Effect.runPromise(effect)` |
| 状态 | 一张纸，描述了步骤 | 真正开火、下锅 |
| 时机 | 现在就可以写 | 等到需要时才执行 |

**Effect 的关键特性**：它可以被**传递、组合、并发**，但在被"执行"之前，什么都不发生。

## 二、具体到这个 context 参数

看 `prepareOnce` 的签名（`packages/core/src/session/context-epoch.ts` 中 `prepareOnce` 函数）：

```ts
const prepareOnce = Effect.fnUntraced(function* (
  db: DatabaseService,
  events: EventV2.Interface,
  context: Effect.Effect<SystemContext.SystemContext>,  // ← 菜谱，不是菜
  sessionID: SessionSchema.ID,
)
```

这个 `context` 参数是一张**还没执行的菜谱**。它的"做法"是：

```
context = 
  Registry.load()           // ① 并发加载所有 Source
    .pipe(Effect.map(       // ② 
      SystemContext.combine  // ③ 合并
    ))
```

但注意——传进来的时候，这三步**一步都没执行**。只是一张纸，上面写着"到时候你要做这三件事"。

---

## 三、为什么必须传 Effect 而不是值？

看 `prepareOnce` 中的并发加载：

```ts
const [value, stored, compaction] = yield* Effect.all(
  [context, find(db, sessionID), SessionHistory.latestCompaction(db, sessionID)],
  { concurrency: "unbounded" },
)
```

`Effect.all` 接收一个 Effect 数组，**并发启动**它们（在单线程 JS 运行时上是协作式调度——多个 I/O 操作的等待可以重叠，但不是 CPU 并行执行）。

### 如果传的是值（错误做法）

```ts
// ❌ 假设传值
const loadedContext = await loadAllSources()  // 等 500ms
const stored = await db.query(...)            // 再等 200ms
const compaction = await db.query(...)        // 再等 100ms
// 总耗时：500 + 200 + 100 = 800ms
```

### 因为传的是 Effect（正确做法）

```ts
// ✅ 传 Effect
const [value, stored, compaction] = yield* Effect.all(
  [context, find(...), latestCompaction(...)],
  { concurrency: "unbounded" },
)
// Effect.all 并发启动三个操作——I/O 等待可以重叠
// 总耗时：max(500, 200, 100) = 500ms（I/O 重叠，非并行 CPU 执行）
```

```
时间线（传 Effect）：
──────────────────────────────────────────────▶
context:    ████████████████████████ 500ms
db查询1:          ████████ 200ms
db查询2:               ████ 100ms
──────────────────────────────────────────────▶
总耗时 ≈ 500ms（最长的那个）

时间线（传值）：
──────────────────────────────────────────────────────────▶
load → 等结果 → db查询1 → 等结果 → db查询2 → 等结果
 500ms            200ms             100ms
──────────────────────────────────────────────────────────▶
总耗时 = 500 + 200 + 100 = 800ms
```

> **注意**：以上时间线展示的是 I/O 重叠的理想效果。在单线程 JS 运行时上，CPU 工作是协作式调度的，只有异步 I/O（网络请求、文件读取、数据库查询）的等待阶段能真正重叠。`concurrency: "unbounded"` 允许 Effect 为所有操作创建纤程，但**不保证并行 CPU 执行**，也不保证精确的 wall-clock 时间。

---

## 四、从调用方看：Effect 是怎么传进来的 —— 两条路径

追踪调用链，`context` 参数的来源——在 Runner（`packages/core/src/session/runner/llm.ts` 中 `runTurn` 函数）：

```ts
const loadSystemContext = (agent) =>
  Effect.all([
    systemContext.load(),       // Effect<SystemContext>
    skillGuidance.load(agent),  // Effect<SystemContext>
    referenceGuidance.load(),   // Effect<SystemContext>
  ], { concurrency: "unbounded" })
  .pipe(Effect.map(SystemContext.combine))
```

`loadSystemContext(agent)` 返回的是 `Effect<SystemContext>`——**一张"如何加载系统上下文"的菜谱**，不是已经加载好的值。

然后 Runner 将这张菜谱传给 `SessionContextEpoch`，分为**两条执行路径**：

### 路径一：首个 Epoch（`initializeOnce`）

```ts
// Runner 中，首次 Epoch：
const initialized = yield* SessionContextEpoch.initialize(
  db, loadSystemContext(agent), session.id
)
```

`initialize` 内部调用 `initializeOnce`（`packages/core/src/session/context-epoch.ts` 中 `initializeOnce` 函数）：

```ts
const initializeOnce = Effect.fnUntraced(function* (db, context, sessionID) {
  if (yield* exists(db, sessionID)) return   // ← epoch 已存在，直接返回
  const generation = yield* context.pipe(     // ← 这里就执行了！
    Effect.flatMap(SystemContext.initialize)
  )
  const baselineSeq = yield* insert(db, sessionID, generation)
  return { baseline: generation.baseline, baselineSeq }
})
```

**首次运行**时，`exists` 返回 `false`（数据库里还没有这个 session 的 epoch 记录），于是执行 `context.pipe(Effect.flatMap(SystemContext.initialize))`。

**context 在这里就被执行了**——它没有等到 `Effect.all`，而是在 `initializeOnce` 内部直接通过 `Effect.flatMap` 求值。

### 路径二：已有 Epoch（`prepare` → `prepareOnce` → `Effect.all`）

当 session **已经有 epoch 记录**时（后续轮次），`initializeOnce` 的 `exists` 返回 `true`，直接 `return`，跳过了 context 求值。传给 `initialize` 的这个 context **不会被求值**。此时 `initialized` 为 `undefined`。

Runner 于是走 `??` 分支：

```ts
const system = initialized
  ?? (yield* SessionContextEpoch.prepare(
       db, events, loadSystemContext(agent), session.id  // ← 新的 Effect
     ))
```

`prepare` 调用 `prepareOnce`（`packages/core/src/session/context-epoch.ts` 中 `prepareOnce` 函数），在这里 context 终于进入 `Effect.all`：

```ts
const [value, stored, compaction] = yield* Effect.all(
  [context, find(db, sessionID), SessionHistory.latestCompaction(db, sessionID)],
  { concurrency: "unbounded" },
)
```

**只有在这条路径中**，context 才和数据库查询**并发执行**（I/O 重叠）。

### 关键总结

| 路径 | 条件 | context 在哪里求值 | 是否和 DB 查询并发 |
|------|------|-------------------|-------------------|
| `initializeOnce` | 首个 epoch（无历史记录） | `context.pipe(Effect.flatMap(...))` | **否**——串行求值 |
| `prepareOnce` | 已有 epoch（后续轮次） | `Effect.all([context, ...])` | **是**——I/O 等待重叠 |

注意两点：
1. 传入 `initialize` 的 context 在 `initializeOnce` 中被立即求值（不经过 `Effect.all`）；而当 epoch 已存在时，`initializeOnce` 提前返回，该 context **不会被求值**——Runner 随后传给 `prepare` 的 context（一个新的 Effect）才在 `Effect.all` 中执行。
2. Runner 中 `initialize` 和 `prepare` 是两个**互斥的调用点**，各自构造独立的 Effect。JavaScript `??` 操作符会**短路求值**：当 `initializeOnce` 返回非 `undefined` 值时（首个 epoch），`??` 右侧（含 `loadSystemContext(agent)` 调用）**不会执行**；只有当 `initializeOnce` 返回 `undefined` 时（已有 epoch），Runner 才会调用 `loadSystemContext(agent)`，其返回的 Effect 进入 `prepareOnce` 的 `Effect.all`。

---

## 五、Effect-TS 的核心哲学：描述与执行分离

```
┌─────────────────────────────────────────────┐
│  描述阶段（现在）                              │
│                                             │
│  const plan = Effect.sync(() => 读文件())     │
│  const plan2 = plan.pipe(Effect.map(解析))    │
│  const plan3 = Effect.all([plan2, 查数据库()]) │
│                                             │
│  此时什么都没发生——只是构建了一张"菜谱"         │
└─────────────────────────────────────────────┘
                    │
                    ▼ 只有这里才真正执行
┌─────────────────────────────────────────────┐
│  执行阶段（将来）                              │
│                                             │
│  yield* plan3     ← Effect.gen 中            │
│  await runPromise(plan3)  ← 普通代码中        │
└─────────────────────────────────────────────┘
```

**这个设计的好处**：
- **并发优化**：传 Effect 让 `Effect.all` 能并发启动它们，通过 I/O 重叠减少总耗时——如果传的是值，并发的机会就没了
- **可组合**：Effect 可以 `.pipe()` 串联，组合成更大的 Effect
- **可测试**：替换 Effect 的依赖（Layer）就能测试，不需要 mock
- **资源安全**：`Effect.acquireRelease` 保证资源一定会释放，哪怕中途出错

---

## 六、总结

| 问题 | 答案 |
|------|------|
| Effect 是什么？ | 一张"菜谱"——描述了怎么得到一个值，但描述本身不执行 |
| 为什么叫"配方"？ | 菜谱 ≠ 菜，Effect<A> ≠ A。拿到菜谱不等于吃到了菜 |
| 为什么传 Effect 不传值？ | 让 `Effect.all` 能**并发启动**它和数据库查询，通过 I/O 重叠减少总耗时。注意路径差异：首次 epoch 在 `initializeOnce` 中求值，不走 `Effect.all` |
| 什么时候执行？ | 在 `yield*` 或 `Effect.runPromise` 时——首次 epoch 在 `initializeOnce` 的 `context.pipe(Effect.flatMap(...))` 中；已有 epoch 在 `prepareOnce` 的 `yield* Effect.all(...)` 中 |

---

## 导航

- 参考章节：[05-effect-infra.md](05-effect-infra.md) — Effect-TS 在 OpenCode 中的 Node/Layer 组合模型
- 相关深潜：
  - [[prepareOnce 的四个出口]] — `prepareOnce` 的四个互斥出口
  - [[System Context部分的工作原理]] — System Context 概念总览
