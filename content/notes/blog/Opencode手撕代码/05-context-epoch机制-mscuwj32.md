---
blog: true
title: "05-Context-Epoch机制"
slug: "05-context-epoch机制-mscuwj32"
summary: "树节点：05 Context Epoch机制 父节点：05 Session创建与状态机 子节点：无 1. 概念：什么是 Context Epoch？ Context Epoch 是 OpenCode 中 System Context 的不可变代数 。一个 Epoch 内， baseline （发送给 LLM 的完整系统提示文本）始终不变；只有 snapshot （每个 Context Source 的 durable 对比状态）可以渐进"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "05-session创建与状态机-mscun046"
---

> 树节点：05-Context-Epoch机制
> 父节点：[[05-Session创建与状态机]]
> 子节点：无

---

## 1. 概念：什么是 Context Epoch？

Context Epoch 是 OpenCode 中 **System Context 的不可变代数**。一个 Epoch 内，`baseline`（发送给 LLM 的完整系统提示文本）始终不变；只有 `snapshot`（每个 Context Source 的 durable 对比状态）可以渐进更新。当 Epoch 被替换（如 compaction 后），新 baseline 重新渲染。

**核心不变式**：在一个 Epoch 的生命周期内，`baseline` 是不可变的。对 Context Source 的变化通过 `Mid-Conversation System Message`（"Updated" 路径）增量通知 LLM，而不改变 baseline。

## 2. 数据库表 `session_context_epoch`

`packages/core/src/session/sql.ts:168-176`:

```ts
export const SessionContextEpochTable = sqliteTable("session_context_epoch", {
  session_id: text().$type<SessionSchema.ID>().primaryKey()
    .references(() => SessionTable.id, { onDelete: "cascade" }),
  baseline: text().notNull(),                           // 完整系统提示文本（不可变）
  snapshot: text({ mode: "json" }).notNull()            // SystemContext.Snapshot（JSON）
    .$type<SystemContext.Snapshot>(),
  baseline_seq: integer().notNull(),                    // baseline 建立时的 event sequence
})
```

三个字段：
- **`baseline`**: 当前 Epoch 的完整组装系统提示文本。**整个 Epoch 内不可变**。
- **`snapshot`**: `Record<Key, SourceSnapshot>`，每个 Context Source 的 durable JSON 对比状态。在 "Updated" 时前进，在 "Replacement" 时完全重建。
- **`baseline_seq`**: 这个 Epoch 的 baseline 建立时对应的 event aggregate sequence。用于判断 compaction 是否应触发 epoch 替换。

## 3. SystemContext 类型体系

`packages/core/src/system-context/index.ts` 定义了核心类型：

### 3.1 Key (`index.ts:22-25`)

```ts
export const Key = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*$/)
).pipe(Schema.brand("SystemContext.Key"))
```

稳定的命名空间标识符，如 `"builtin/date"`、`"instruction/project"`。

### 3.2 SourceSnapshot (`index.ts:49-52`)

```ts
export const SourceSnapshot = Schema.Struct({
  value: Schema.Json,                          // 编码后的当前值
  removed: Schema.optional(Schema.NonEmptyString), // 可选的移除文本
})
```

### 3.3 Snapshot (`index.ts:56-57`)

```ts
export const Snapshot = Schema.Record(Key, SourceSnapshot)
```

整个 epoch 的对比状态：`{ "builtin/date": { value: ... }, "instruction/project": { value: ... }, ... }`。

### 3.4 Generation (`index.ts:59-62`)

```ts
export interface Generation {
  readonly baseline: string       // 组装好的完整系统提示文本
  readonly snapshot: Snapshot      // 初始 snapshot
}
```

### 3.5 Reconcile/Replace 结果 (`index.ts:64-80`)

```ts
export interface Updated {              // 增量更新
  readonly _tag: "Updated"
  readonly text: string                  // Mid-Conversation System Message 文本
  readonly snapshot: Snapshot            // 更新后的 snapshot
}
export interface ReplacementReady {     // 可以替换
  readonly _tag: "ReplacementReady"
  readonly generation: Generation        // 新的 Generation
}
export interface ReplacementBlocked {   // 替换被阻塞
  readonly _tag: "ReplacementBlocked"    // 有 unavailable 的 admitted source
}
export type ReconcileResult =
  | { readonly _tag: "Unchanged" }
  | Updated
  | ReplacementResult
```

## 4. 四大函数详解

`packages/core/src/session/context-epoch.ts`（174 行）暴露四个公开函数：

### 4.1 `initialize()` — 首次建立 Epoch

`context-epoch.ts:23-29` → 内部 `initializeOnce()` (`context-epoch.ts:80-89`):

```ts
export function initialize(
  db, context, sessionID,
): Effect.Effect<Prepared | undefined, SystemContext.InitializationBlocked>
```

**逻辑** (`context-epoch.ts:80-89`):

1. **检查是否已存在** (`context-epoch.ts:85`): `yield* exists(db, sessionID)` — 如果该 session 已有 epoch 行，直接 return（幂等）
2. **初始化 SystemContext** (`context-epoch.ts:86`): `context.pipe(Effect.flatMap(SystemContext.initialize))`
   - `SystemContext.initialize()` (`system-context/index.ts:198-206`) 并行加载所有 source，任一 unavailable 则抛 `InitializationBlocked`
3. **写入数据库** (`context-epoch.ts:87-88`): `yield* insert(db, sessionID, generation)`
4. 返回 `{ baseline, baselineSeq }`

**`insert()` 内部** (`context-epoch.ts:122-139`):

```ts
const insert = Effect.fnUntraced(function* (db, sessionID, generation) {
  const baselineSeq = yield* EventV2.latestSequence(db, sessionID) // 获取当前最大 seq
  yield* db.insert(SessionContextEpochTable).values({
    session_id: sessionID,
    baseline: generation.baseline,
    snapshot: generation.snapshot,
    baseline_seq: baselineSeq,
  }).run()
  return baselineSeq
})
```

`baselineSeq` 由 `EventV2.latestSequence()` 获取 (`event.ts:21-32`)，即该 session 的 aggregate event sequence 的最大值（若无事件则返回 `-1`）。

**初始化失败（`InitializationBlocked`）**: 当任一 Context Source 的 `load` 返回 `unavailable` 且该 source 之前未被 admitted 时。此时 `SystemContext.initialize()` 抛错，`initialize()` 向上传播该错误。Session 的首个 prompt 将保持 pending，直到所有 source 可用。

### 4.2 `prepare()` — 每次 Provider Turn 前的准备

`context-epoch.ts:31-38` → 内部 `prepareOnce()` (`context-epoch.ts:40-78`):

```ts
export function prepare(
  db, events, context, sessionID,
): Effect.Effect<Prepared, SystemContext.InitializationBlocked | ContextSnapshotDecodeError>
```

**这是最核心的函数，有 4 种可能结果。整个逻辑如下：**

#### Step 1: 并行加载三样数据 (`context-epoch.ts:46-49`)

```ts
const [value, stored, compaction] = yield* Effect.all(
  [context, find(db, sessionID), SessionHistory.latestCompaction(db, sessionID)],
  { concurrency: "unbounded" },
)
```

- `value`: 重新 observe 所有 Context Source 的最新值（`SystemContext`）
- `stored`: 数据库中当前的 epoch 行（`session_context_epoch` 表）
- `compaction`: 最新的 compaction 消息的 seq（`session_message` 表中 `type="compaction"` 的最大 seq）

#### Step 2: 分支 — 无存储行 (`context-epoch.ts:50-53`)

```ts
if (!stored) {
  const generation = yield* SystemContext.initialize(value)
  const baselineSeq = yield* insert(db, sessionID, generation)
  return { baseline: generation.baseline, baselineSeq }
}
```

**结果：首次初始化**。等同于 `initialize()`，但发生在 `prepare()` 路径中（例如数据库迁移后 epoch 行丢失）。

#### Step 3: 有存储行 — 解码 snapshot (`context-epoch.ts:56-58`)

```ts
const snapshot = yield* Schema.decodeUnknownEffect(SystemContext.Snapshot)(stored.snapshot).pipe(
  Effect.mapError((error) => new ContextSnapshotDecodeError({ sessionID, details: String(error) })),
)
```

将数据库中的 JSON snapshot 解码为 `SystemContext.Snapshot` 类型。若解码失败，抛 `ContextSnapshotDecodeError`。

#### Step 4: 判断是否需要替换 (`context-epoch.ts:59-62`)

```ts
const replacementSeq = compaction !== undefined && compaction.seq > stored.baseline_seq
  ? compaction.seq
  : undefined
const result = replacementSeq
  ? yield* SystemContext.replace(value, snapshot)
  : yield* SystemContext.reconcile(value, snapshot)
```

**关键判断**：当前最新的 compaction seq **大于** baseline 建立时的 seq，则意味着 compaction 已完成且需要新 epoch → 调用 `SystemContext.replace()`；否则只做增量 reconcile → 调用 `SystemContext.reconcile()`。

`SessionHistory.latestCompaction()` (`history.ts:13-22`) 查询的是 `session_message` 表中 `type="compaction"` 且 `seq` 最大的行。

#### 四种结果

##### 结果 1: `Unchanged` 或 `ReplacementBlocked` (`context-epoch.ts:63-65`)

```ts
if (result._tag === "Unchanged" || result._tag === "ReplacementBlocked") {
  return { baseline: stored.baseline, baselineSeq: stored.baseline_seq }
}
```

- **Unchanged**: 所有 Context Source 值与 snapshot 一致，无需任何变更
- **ReplacementBlocked**: 需要替换但存在 unavailable 的 admitted source（`replaceObservation()` 检测到之前 admitted 的 source 现在 unavailable 且 snapshot 中有该 key）→ 保持旧 baseline 不变，等待 source 恢复

两种情况都**直接返回存储的 baseline 和 baselineSeq**。

##### 结果 2: `ReplacementReady` (`context-epoch.ts:66-70`)

```ts
if (result._tag === "ReplacementReady") {
  const baselineSeq = replacementSeq ?? (yield* EventV2.latestSequence(db, sessionID))
  yield* replace(db, sessionID, baselineSeq, result.generation)
  return { baseline: result.generation.baseline, baselineSeq }
}
```

**触发条件**：compaction 后的首次 prepare，且所有 admitted source 可用。

- 使用 `replacementSeq`（compaction seq）或 latest sequence 作为新 `baselineSeq`
- 调用内部 `replace()` (`context-epoch.ts:141-159`)：`UPDATE session_context_epoch SET baseline, snapshot, baseline_seq WHERE session_id`
- 返回**全新的 baseline 和 baselineSeq**

**重要**：此时写入 `session_context_epoch` 的是全新的行，baseline 文本完全重新渲染。旧的 baseline 不再使用。

##### 结果 3: `Updated` (`context-epoch.ts:72-77`)

```ts
yield* events.publish(
  SessionEvent.ContextUpdated,
  { sessionID, messageID: SessionMessage.ID.create(), timestamp: yield* DateTime.now, text: result.text },
  { commit: () => advance(db, sessionID, result.snapshot).pipe(Effect.orDie) },
)
return { baseline: stored.baseline, baselineSeq: stored.baseline_seq }
```

**触发条件**：无 compaction 替换需求 + 有 Context Source 值改变。

- 发布 `SessionEvent.ContextUpdated` 事件，**attach commit hook**
- `commit` hook 调用 `advance()` 更新 snapshot
- 事件本身携带 `text`（Mid-Conversation System Message），通知 LLM 上下文已变化
- 返回的 baseline **仍是旧的存储 baseline**（不变式！）

**`advance()` 内部** (`context-epoch.ts:161-173`):

```ts
const advance = Effect.fnUntraced(function* (db, sessionID, snapshot) {
  const updated = yield* db
    .update(SessionContextEpochTable)
    .set({ snapshot })        // 只更新 snapshot，不更新 baseline！
    .where(eq(SessionContextEpochTable.session_id, sessionID))
    .returning(...).get()
  if (!updated) return yield* Effect.die("Context Epoch not found")
})
```

**关键观察**：`advance()` **只更新 `snapshot` 列**，`baseline` 和 `baseline_seq` 保持不变。这确保了 Epoch 内 baseline 不可变。

#### 完整决策树

```
prepare()
  ├── stored == null → initialize() → [首次建立]
  └── stored != null
      ├── compaction seq > baseline_seq
      │   └── SystemContext.replace()
      │       ├── ReplacementBlocked → [返回旧 baseline]
      │       └── ReplacementReady → [替换新 baseline, snapshot]
      └── compaction seq ≤ baseline_seq (或无 compaction)
          └── SystemContext.reconcile()
              ├── Unchanged → [返回旧 baseline]
              ├── Updated → [发 ContextUpdated 事件 + advance snapshot]
              └── (若有 incompatible) → 走 SystemContext.replace()
                  ├── ReplacementBlocked → [返回旧 baseline]
                  └── ReplacementReady → [替换]
```

### 4.3 `replace()` — 内部替换

`context-epoch.ts:141-159`（私有函数）：

```ts
const replace = Effect.fnUntraced(function* (db, sessionID, baselineSeq, generation) {
  const updated = yield* db
    .update(SessionContextEpochTable)
    .set({
      baseline: generation.baseline,    // 全新 baseline
      snapshot: generation.snapshot,    // 全新 snapshot
      baseline_seq: baselineSeq,        // 新 baseline_seq
    })
    .where(eq(SessionContextEpochTable.session_id, sessionID))
    .returning(...).get()
  if (!updated) return yield* Effect.die("Context Epoch not found")
})
```

在 `ReplacementReady` 时调用，用 `SystemContext.initialize()` 产生的全新 `Generation` 替换 epoch 行。

### 4.4 `reset()` — 删除 Epoch

`context-epoch.ts:111-120`:

```ts
export const reset = Effect.fn("SessionContextEpoch.reset")(function* (db, sessionID) {
  yield* db
    .delete(SessionContextEpochTable)
    .where(eq(SessionContextEpochTable.session_id, sessionID))
    .run()
})
```

删除该 session 的 epoch 行。用于 Session 移动（move）等场景，因为新的 Location 需要全新的 baseline。

## 5. 与 Compaction 的联动

Compaction 触发 Epoch 替换的链条：

1. **Compaction 完成** → 写入 `session_message` 表中 `type="compaction"` 的行，`seq` 递增
2. **下次 Provider Turn 前** → `prepare()` 被调用
3. **检测条件** `context-epoch.ts:59`: `compaction.seq > stored.baseline_seq` → `true`
4. **走 `SystemContext.replace()` 路径** → 渲染新 baseline + 新 snapshot
5. **新 baseline 的 `baseline_seq` = compaction.seq** → 确保下次不再触发

## 6. `SystemContext.reconcile()` 的增量逻辑

`packages/core/src/system-context/index.ts:218-280` 的 `reconcileObservation()`:

1. **遍历所有 source** (`index.ts:234-241`): 对每个 entry 与 stored snapshot 比较
   - `Incompatible` → 立即 `return { _tag: "Replace" }`（schema 不兼容，需要重建）
   - `Unchanged` → 保持 stored snapshot
   - `Updated` → 生成 update 文本
2. **检测 removed sources** (`index.ts:242-245`): snapshot 中有但当前 context 中没有的 key → 若该 source 无 `removed` 渲染器 → `return { _tag: "Replace" }`；否则追加 removal 文本
3. **处理 Unavailable** (`index.ts:251-254`): 若 source 当前 unavailable 但 snapshot 中存在 → 保留 stored 值，不产生更新
4. **无任何变化** (`index.ts:278`): `return { _tag: "Unchanged" }`
5. **有变化** (`index.ts:279`): `return { _tag: "Updated", text: render(updates), snapshot }`

## 7. `SystemContext.replace()` 与 `ReplacementBlocked`

`packages/core/src/system-context/index.ts:287-291`:

```ts
function replaceObservation(entries, previous): ReplacementResult {
  if (entries.some(
    (entry) => entry._tag === "Unavailable" && getSnapshot(previous, entry.key) !== undefined
  ))
    return { _tag: "ReplacementBlocked" }
  return { _tag: "ReplacementReady", generation: initializeObservation(entries) }
}
```

**ReplacementBlocked 的语义**：当一个之前被 admitted 的 Context Source（在 snapshot 中有记录）现在 `unavailable` 时，不能创建不完整的新 baseline。必须等待该 source 恢复。这防止了因暂时的不可用而丢失上下文信息。

与 `InitializationBlocked` 的区别：
- `InitializationBlocked`: 首次初始化时 source unavailable → 阻止
- `ReplacementBlocked`: replacement 时之前 admitted 的 source 现在 unavailable → 阻止

## 8. `SessionHistory` 如何使用 Epoch

`packages/core/src/session/history.ts` 的 `load()` (`history.ts:66-80`):

```ts
const [epoch, compaction] = yield* Effect.all([
  db.select({ baselineSeq: ... }).from(SessionContextEpochTable).where(eq(...)).get(),
  latestCompaction(db, sessionID),
])
return yield* Effect.forEach(
  yield* messageRows(db, sessionID, compaction, epoch?.baselineSeq),
  decodeMessageRow
)
```

`messageRows()` (`history.ts:24-53`) 使用 `baselineSeq` 过滤消息：
- 排除 `seq ≤ baselineSeq` 的 system 类型消息（它们已包含在 baseline 中）
- 保留所有非 system 消息和 `seq > baselineSeq` 的 system 消息

`loadForRunner()` (`history.ts:82-88`) 直接使用传入的 `baselineSeq` 参数，从 `prepare()` 的结果中获取。

## 9. 关联

- **[[06-Baseline与Snapshot]]**: `baseline` 和 `snapshot` 的详细结构、渲染和编码
- **[[06-Mid-Conversation更新]]**: `ContextUpdated` 事件如何注入 Mid-Conversation System Message
- **[[05-Compaction与历史管理]]**: Compaction 如何触发 epoch 替换
- **[[05-Runner执行循环]]**: Runner 在每次 Provider Turn 前调用 `prepare()`
- **[[06-Context-Source与Registry]]**: Context Source 的注册、加载和比较机制
