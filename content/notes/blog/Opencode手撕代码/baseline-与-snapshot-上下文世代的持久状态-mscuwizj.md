---
blog: true
title: "Baseline 与 Snapshot — 上下文世代的持久状态"
slug: "baseline-与-snapshot-上下文世代的持久状态-mscuwizj"
summary: "树节点：06 Baseline与Snapshot 父节点：06 Context Source与Registry 子节点：无 Baseline 与 Snapshot — 上下文世代的持久状态 这是 System Context 代数中关于 持久化 的部分：一个 Context Epoch 如何存储其不可变基线，以及如何通过 JSON 快照实现增量比较。 数据模型 session context epoch 表 packages/core/"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "05-context-epoch机制-mscuwj32"
---

> 树节点：06-Baseline与Snapshot
> 父节点：[[06-Context-Source与Registry]]
> 子节点：无

# Baseline 与 Snapshot — 上下文世代的持久状态

这是 System Context 代数中关于**持久化**的部分：一个 Context Epoch 如何存储其不可变基线，以及如何通过 JSON 快照实现增量比较。

---

## 数据模型

### session_context_epoch 表

`packages/core/src/session/sql.ts:168-176`

```ts
export const SessionContextEpochTable = sqliteTable("session_context_epoch", {
  session_id: text().$type<SessionSchema.ID>().primaryKey(),
  baseline: text().notNull(),           // 完整模型可见文本
  snapshot: text({ mode: "json" }).notNull().$type<SystemContext.Snapshot>(),
  baseline_seq: integer().notNull(),    // 基线建立时的事件序号
})
```

每 Session 一行：
- **baseline**：该 Epoch 的不可变完整系统提示文本（所有 Source 的 `baseline()` 输出由 `\n\n` 连接）
- **snapshot**：`Record<Key, SourceSnapshot>` — 每个源的当前 JSON 编码值和可选 removal 文本
- **baseline_seq**：事件序列号，标记基线在何时建立

---

## Generation — 不可变世代

`packages/core/src/system-context/index.ts:59-62`

```ts
export interface Generation {
  readonly baseline: string
  readonly snapshot: Snapshot
}
```

Generation 是一个 Epoch 的**原子单元**。一经创建，baseline 在 Epoch 期间不再改变。

### initialize() — 创建新世代

`packages/core/src/system-context/index.ts:198-206`

```ts
export function initialize(value: SystemContext): Effect<Generation, InitializationBlocked> {
  return observe(value).pipe(
    Effect.flatMap((entries) => {
      const unavailable = entries.flatMap((entry) =>
        (entry._tag === "Unavailable" ? [entry.key] : [])
      )
      if (unavailable.length > 0)
        return new InitializationBlocked({ keys: unavailable })
      return Effect.succeed(initializeObservation(entries))
    }),
  )
}
```

**关键行为**：
1. 并行观测所有源（`concurrency: "unbounded"`）
2. 任一源 `unavailable` → 抛出 `InitializationBlocked`，**整个初始化失败**
3. 全部可用 → 调用 `initializeObservation()`（`index.ts:208-215`）：
   - 每个源执行 `baseline()` → 得到 `{ text, snapshot }`
   - 所有 text 用 `"\n\n"` 连接成一个完整 baseline
   - 所有 snapshot 合并成 `Record<Key, SourceSnapshot>`

### 持久化：context-epoch.ts:initialize()

`packages/core/src/session/context-epoch.ts:23-29`

```ts
export function initialize(db, context, sessionID): Effect<Prepared | undefined> {
  return initializeOnce(db, context, sessionID)
}
```

`initializeOnce()` (`context-epoch.ts:80-89`)：
1. 若 Session 已有 context_epoch → 返回 `undefined`（幂等）
2. 否则：load context → `SystemContext.initialize()` → `insert()` 写入数据库

`insert()` (`context-epoch.ts:122-139`)：
- 获取最新事件序列号 → 作为 `baseline_seq`
- 插入 `(session_id, baseline, snapshot, baseline_seq)`

---

## reconcile() — 增量调和

`packages/core/src/system-context/index.ts:218-226`

```ts
export function reconcile(value: SystemContext, previous: Snapshot): Effect<ReconcileResult> {
  return observe(value).pipe(
    Effect.map((entries): ReconcileResult => {
      const result = reconcileObservation(entries, previous)
      if (result._tag === "Unchanged" || result._tag === "Updated") return result
      return replaceObservation(entries, previous)  // Incompatible → fall through to replace
    }),
  )
}
```

### reconcileObservation() 详细流程

`packages/core/src/system-context/index.ts:228-280`

对每个源分四种情况：

| 情况 | 处理 | snapshot 更新 |
|------|------|--------------|
| `Available` + 无历史 | 调用 `baseline()` 渲染 | 新 snapshot |
| `Available` + 有历史 + `Unchanged` | 不生成文本 | 保留旧 snapshot |
| `Available` + 有历史 + `Updated` | 调用 `compare.render()` → `update()` | 新 snapshot |
| `Available` + 有历史 + `Incompatible` | 返回 `Replace`，由调用方退化到 replace | — |
| `Unavailable` + 有历史 | stale-while-revalidate | **保留旧 snapshot** |
| `Unavailable` + 无历史 | 无动作 | 不产生条目 |
| 移除的源 + 有历史 | 使用存储的 `removed` 文本 | 不产生新条目 |

**最终**：若所有源都 `Unchanged` → 返回 `{ _tag: "Unchanged" }`
若有任何更新 → 返回 `{ _tag: "Updated", text, snapshot }`

---

## replace() — 完整替换

`packages/core/src/system-context/index.ts:283-291`

```ts
export function replace(value: SystemContext, previous: Snapshot): Effect<ReplacementResult> {
  return observe(value).pipe(Effect.map((entries) => replaceObservation(entries, previous)))
}
```

`replaceObservation()` (`index.ts:287-291`)：
- 检查：当前 `unavailable` 且**之前有 Snapshot**（即承认了这个源）→ `ReplacementBlocked`（stale-while-revalidate：等源恢复才能重建基线）
- 否则 → `ReplacementReady`，调用 `initializeObservation()` 生成新 Generation

---

## 在 Context Epoch 中的完整流程

`packages/core/src/session/context-epoch.ts:40-78`（`prepareOnce`）

```
prepareOnce(db, events, context, sessionID):
  1. 并行：加载 SystemContext + 查 DB 行 + 查最新 Compaction
  2. 若无已存储 → initialize() → insert()
  3. 若有已存储：
     a. 解码 Snapshot
     b. 若 compaction.seq > stored.baseline_seq → SystemContext.replace()
        └─ ReplacementReady → replace() 写新 baseline + snapshot
     c. 否则 → SystemContext.reconcile()
        ├─ Unchanged → 返回旧 baseline
        ├─ ReplacementBlocked → 返回旧 baseline（保持 stale）
        └─ Updated → 发布 ContextUpdated 事件（见 [[06-Mid-Conversation更新]]）
```

**关键区别**：

- **baseline 变不变**：initialize/replace 会改；reconcile 只改 snapshot，不动 baseline
- **snapshot 何时推进**：
  - Updated 路径 → `advance()`（`context-epoch.ts:161-173`），只更新 snapshot 列
  - ReplacementReady 路径 → `replace()`（`context-epoch.ts:141-159`），更新全部三列
- **compaction 触发 replace**：compaction 的 seq > 当前 baseline_seq → 完整重建 baseline

---

## stale-while-revalidate

当 `load` 返回 `unavailable` 时：

- **reconcile**：保留上次 snapshot，不生成新文本（`index.ts:251-253`）
- **initialize**：直接 `InitializationBlocked`（`index.ts:201-202`）
- **replace**：若之前承认了该源 → `ReplacementBlocked`（`index.ts:288-289`）

这保证了：
- 临时不可用不会中断运行中的 Session
- 初始化/重建基线时必须全部源可用

---

## 与 [[05-Context-Epoch机制]] 的关系

- Epoch 启动时调用 `initialize()` 建立首个 baseline
- 每次 provider turn 前通过 `prepare()` 检查是否需要 reconcile/replace
- Compaction 后的 replacement 启动新 Epoch（新 baseline）

---

## 关键文件索引

| 文件 | 行数 | 内容 |
|------|------|------|
| `packages/core/src/system-context/index.ts` | 197–291 | initialize / reconcile / replace |
| `packages/core/src/session/context-epoch.ts` | 1–174 | 持久化 + 事件衔接 |
| `packages/core/src/session/sql.ts` | 168–176 | session_context_epoch 表定义 |
