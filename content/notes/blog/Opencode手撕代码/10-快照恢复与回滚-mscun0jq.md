---
blog: true
title: "10-快照恢复与回滚"
slug: "10-快照恢复与回滚-mscun0jq"
summary: "树节点：10 快照恢复与回滚 父节点：10 快照创建与存储 子节点：无 概述 Revert 机制允许用户 将对话回退到某条 assistant 消息之前的状态 ，同时恢复该消息产生的文件变更。它利用 10 快照创建与存储 中每条 assistant message 记录的 snapshot 信息来定位需要恢复的文件，通过 Snapshot.restore() 将文件内容还原，并以事件驱动方式更新 Session 的持久化状态。 核心数据"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "10-快照创建与存储-mscun0jo"
  - "05-context-epoch机制-mscuwj32"
---

> 树节点：10-快照恢复与回滚
> 父节点：[[10-快照创建与存储]]
> 子节点：无

---

## 概述

Revert 机制允许用户**将对话回退到某条 assistant 消息之前的状态**，同时恢复该消息产生的文件变更。它利用 [[10-快照创建与存储]] 中每条 assistant message 记录的 `snapshot` 信息来定位需要恢复的文件，通过 Snapshot.restore() 将文件内容还原，并以事件驱动方式更新 Session 的持久化状态。

## 核心数据结构

### Revert.State

定义在 `packages/schema/src/revert.ts:17-23`：

```ts
export const State = Schema.Struct({
    messageID: SessionMessage.ID,      // 回退边界消息 ID
    partID: Schema.String.pipe(optional),
    snapshot: Schema.String.pipe(optional),  // 原始快照 ID（用于 clear）
    diff: Schema.String.pipe(optional),      // 变更的 unified diff 文本
    files: Schema.Array(FileDiff).pipe(optional), // 结构化文件变更列表
}).annotate({ identifier: "Revert.State" })
```

### FileDiff

定义在 `packages/schema/src/revert.ts:8-14`：

```ts
export const FileDiff = Schema.Struct({
    path: RelativePath,
    status: Schema.Literals(["added", "modified", "deleted"]),
    additions: NonNegativeInt,
    deletions: NonNegativeInt,
    patch: Schema.String,
}).annotate({ identifier: "File.Diff" })
```

### Session 表字段

Revert.State 作为 JSON 存储在 `session` 表的 `revert` 列：

```ts
// packages/core/src/session/sql.ts:49
revert: text({ mode: "json" }).$type<Revert.State>(),
```

Session.Info 中对应字段：

```ts
// packages/core/src/session/info.ts:43
revert: row.revert
    ? { ...row.revert, messageID: SessionMessage.ID.make(row.revert.messageID) }
    : undefined,
```

Schema 层的 Session.Info 定义中 `revert` 为可选字段（`packages/schema/src/session.ts:43`）：

```ts
revert: Revert.State.pipe(optional),
```

## 三个核心操作

Revert 模块（`packages/core/src/session/revert.ts`）提供三个操作，每个操作对应一个持久化事件：

### 1. stage() — 暂存回退

`stage()` 是核心操作，执行文件恢复并生成 Revert.State：

```ts
// packages/core/src/session/revert.ts:60-96
export const stage = Effect.fn("SessionRevert.stage")(function* (input: {
    readonly session: SessionSchema.Info
    readonly messageID: SessionMessage.ID
    readonly files?: boolean
}) {
    const snapshot = yield* Snapshot.Service
    const events = yield* EventV2.Service

    // 记录原始快照（如已存在 revert 则用已有快照，否则新 capture）
    const original = input.session.revert?.snapshot
        ? Snapshot.ID.make(input.session.revert.snapshot)
        : yield* snapshot.capture()

    // plan() 确定需要恢复的文件 → 树映射
    const next = yield* plan({ sessionID: input.session.id, messageID: input.messageID })

    // 构建 restore 文件映射：已有 revert 的文件 + 新文件
    const restore = new Map<RelativePath, Snapshot.ID>()
    if (original) {
        for (const file of input.session.revert?.files ?? [])
            restore.set(file.path, original)
    }
    if (input.files !== false)
        for (const [file, tree] of next) restore.set(file, tree)

    // 执行文件恢复
    if (restore.size) yield* snapshot.restore({ files: restore })

    // diff 当前状态 vs 原始快照，生成 Revert.State
    const paths = input.files === false ? [] : Array.from(next.keys())
    const files = original
        ? yield* snapshot.diff({
            from: original,
            to: (yield* snapshot.capture()) ?? original,
            paths
        })
        : []

    const revert = {
        messageID: input.messageID,
        snapshot: original,
        diff: files.map((file) => file.patch).join("").trim(),
        files,
    } satisfies SessionSchema.Info["revert"]

    // 发布 Staged 事件
    yield* events.publish(SessionEvent.RevertEvent.Staged, {
        sessionID: input.session.id,
        timestamp: yield* DateTime.now,
        revert,
    })
    return revert
})
```

**流程详解**：
1. 记录 `original` 快照：已有 revert 则复用其 snapshot，否则调用 `snapshot.capture()` 保存当前文件状态
2. `plan()` 扫描消息链，找到每个被修改文件**最早出现时的 snapshot ID**（见下方 plan 详解）
3. 构建 `restore` Map：包含已有 revert 的文件（恢复到 original）+ 新消息的文件（恢复到各消息的 start snapshot）
4. 调用 `snapshot.restore()` 将文件实际恢复到目标快照中的版本
5. 执行 `snapshot.diff()` 比较当前状态与 original 快照，生成可视化的 FileDiff 数组
6. 发布 `RevertEvent.Staged` 事件持久化

### 2. clear() — 取消回退

```ts
// packages/core/src/session/revert.ts:98-111
export const clear = Effect.fn("SessionRevert.clear")(function* (session: SessionSchema.Info) {
    if (!session.revert) return
    const snapshot = yield* Snapshot.Service
    const original = session.revert.snapshot
        ? Snapshot.ID.make(session.revert.snapshot)
        : undefined
    if (original)
        yield* snapshot.restore({
            files: new Map(
                (session.revert.files ?? []).map((file) => [file.path, original])
            ),
        })
    const events = yield* EventV2.Service
    yield* events.publish(SessionEvent.RevertEvent.Cleared, {
        sessionID: session.id,
        timestamp: yield* DateTime.now,
    })
})
```

- 将 `revert.files` 中每个文件恢复到 `revert.snapshot` 对应的版本（即 stage 时的原始状态）
- 发布 `RevertEvent.Cleared` → projector 将 Session 的 `revert` 列设为 `null`

### 3. commit() — 确认回退

```ts
// packages/core/src/session/revert.ts:113-121
export const commit = Effect.fn("SessionRevert.commit")(
    function* (session: SessionSchema.Info) {
        if (!session.revert) return
        const events = yield* EventV2.Service
        yield* events.publish(SessionEvent.RevertEvent.Committed, {
            sessionID: session.id,
            messageID: session.revert.messageID,
            timestamp: yield* DateTime.now,
        })
    }
)
```

- 仅发布 `RevertEvent.Committed` 事件（事件处理器执行实际清理）
- 本身不操作文件——文件已经在 `stage()` 中恢复完毕

## plan() — 确定回退文件范围

```ts
// packages/core/src/session/revert.ts:27-58
const plan = Effect.fn("SessionRevert.plan")(function* (input: BoundaryInput) {
    const db = (yield* Database.Service).db
    // 查找边界消息的 seq
    const boundary = yield* db
        .select({ seq: SessionMessageTable.seq })
        .from(SessionMessageTable)
        .where(and(
            eq(SessionMessageTable.session_id, input.sessionID),
            eq(SessionMessageTable.id, input.messageID)
        ))
        .get().pipe(Effect.orDie)
    if (!boundary) return yield* new MessageNotFoundError(input)

    // 扫描 boundary 之后的所有 assistant 消息
    const rows = yield* db
        .select()
        .from(SessionMessageTable)
        .where(and(
            eq(SessionMessageTable.session_id, input.sessionID),
            eq(SessionMessageTable.type, "assistant"),
            gt(SessionMessageTable.seq, boundary.seq),
        ))
        .orderBy(asc(SessionMessageTable.seq))
        .all().pipe(Effect.orDie)

    // 构建 file → snapshot ID 映射（每个文件取最早出现时的 start snapshot）
    const decode = Schema.decodeUnknownEffect(SessionMessage.Message)
    const files = new Map<RelativePath, Snapshot.ID>()
    for (const row of rows) {
        const message = yield* decode({ ...row.data, id: row.id, type: row.type })
            .pipe(Effect.orDie)
        if (message.type !== "assistant" || !message.snapshot?.start) continue
        for (const file of message.snapshot.files ?? [])
            if (!files.has(file))
                files.set(file, Snapshot.ID.make(message.snapshot.start))
    }
    return files
})
```

**核心逻辑**：遍历 boundary 之后的所有 assistant 消息（按 seq 升序），对每个出现在 `snapshot.files` 中的文件，取**第一次出现时的 `snapshot.start`** 作为恢复目标。这意味着文件将被恢复到**第一个修改它的 assistant turn 之前**的状态。

## Event-Driven 持久化

Revert 的事件定义在 `packages/schema/src/session-event.ts:434-446`：

```ts
export namespace RevertEvent {
    export const Staged = Event.define({
        type: "session.next.revert.staged",
        ...options,
        schema: { ...Base, revert: Revert.State },
    })
    export const Cleared = Event.define({
        type: "session.next.revert.cleared",
        ...options,
        schema: Base,
    })
    export const Committed = Event.define({
        type: "session.next.revert.committed",
        ...options,
        schema: { ...Base, messageID: SessionMessage.ID },
    })
}
```

### Projector 处理（packages/core/src/session/projector.ts）

**Staged**：将 revert 写入 Session 表的 `revert` 列（`:396-404`）：

```ts
yield* events.project(SessionEvent.RevertEvent.Staged, (event) =>
    db.update(SessionTable)
        .set({
            revert: {
                ...event.data.revert,
                files: event.data.revert.files
                    ? [...event.data.revert.files] : undefined,
            },
            time_updated: DateTime.toEpochMillis(event.data.timestamp),
        })
        .where(eq(SessionTable.id, event.data.sessionID))
        .run()
)
```

**Cleared**：将 `revert` 设为 `null`（`:407-413`）：

```ts
yield* events.project(SessionEvent.RevertEvent.Cleared, (event) =>
    db.update(SessionTable)
        .set({ revert: null, time_updated: ... })
        .where(eq(SessionTable.id, event.data.sessionID))
        .run()
)
```

**Committed**：**删除 boundary 之后的消息和输入 + 重置 ContextEpoch**（`:415-453`）：

```ts
yield* events.project(SessionEvent.RevertEvent.Committed, (event) =>
    Effect.gen(function* () {
        // 查找 boundary 消息的 seq
        const boundary = yield* db.select({ seq: SessionMessageTable.seq })
            .from(SessionMessageTable)
            .where(and(...))
            .get().pipe(Effect.orDie)
        if (!boundary) return yield* Effect.die(...)

        // 删除 boundary 之后的所有消息
        yield* db.delete(SessionMessageTable)
            .where(and(..., gt(SessionMessageTable.seq, boundary.seq)))
            .run()

        // 删除 boundary 之后的所有输入
        yield* db.delete(SessionInputTable)
            .where(and(
                ...,
                or(
                    gt(SessionInputTable.admitted_seq, boundary.seq),
                    gt(SessionInputTable.promoted_seq, boundary.seq)
                ),
            ))
            .run()

        // 清除 revert 状态
        yield* db.update(SessionTable)
            .set({ revert: null, time_updated: ... })
            .where(eq(SessionTable.id, event.data.sessionID))
            .run()

        // 重置 ContextEpoch
        yield* SessionContextEpoch.reset(db, event.data.sessionID)
    })
)
```

## ContextEpoch.reset()

Commit 的最后一步调用 `SessionContextEpoch.reset()`（`packages/core/src/session/context-epoch.ts:111-120`）：

```ts
export const reset = Effect.fn("SessionContextEpoch.reset")(function* (
    db: DatabaseService,
    sessionID: SessionSchema.ID,
) {
    yield* db.delete(SessionContextEpochTable)
        .where(eq(SessionContextEpochTable.session_id, sessionID))
        .run()
        .pipe(Effect.orDie)
})
```

删除 `session_context_epoch` 表中对应行的全部记录。这意味着**下次 Provider Turn 时 Context Epoch 将被重新初始化**（`initialize()` → `SystemContext.initialize()`）。这会重建 Baseline System Context 和 Context Snapshot，从干净的起点开始——因为 revert 已改变了 Session 历史结构，之前的 Context Epoch 不再有效。

有关 Context Epoch 的完整流程，参见 [[05-Context-Epoch机制]]。

## 完整状态机

```text
                    stage(boundary_msg)
  [无 revert] ──────────────────────────► [Revert.State 存在]
       ▲                                        │
       │ clear()                      ┌─────────┴──────────┐
       └──────────────────────────────┘                    │
                                           commit()        │
                                          ┌────────────────┘
                                          ▼
                              [消息删除 + reset ContextEpoch]
```

- **stage**：分析 boundary 后的消息 → 恢复文件 → 生成 diff → 写入 revert 列
- **clear**：恢复文件到 stage 前的状态 → 清空 revert 列
- **commit**：删除 boundary 后的消息和输入 → 清空 revert 列 → 重置 ContextEpoch

## 与 Snapshot 模块的关系

Revert 模块强依赖 [[10-快照创建与存储]] 中记录的 `message.snapshot` 信息：

| Revert 操作 | 使用的 Snapshot 能力 |
|------------|-------------------|
| `plan()` | 遍历消息的 `snapshot.files[]` 确定变更文件，用 `snapshot.start` 作为恢复目标树 ID |
| `stage()` 的 `snapshot.capture()` | 记录当前状态为 `original`（用于 clear 回退） |
| `stage()` 的 `snapshot.restore()` | 将文件内容恢复到目标快照树 |
| `stage()` 的 `snapshot.diff()` | 生成可视化 diff（original → 恢复后） |
| `clear()` 的 `snapshot.restore()` | 将文件恢复到 stage 前的 original 状态 |

## 边界情况

1. **边界消息不存在**：`plan()` 抛出 `MessageNotFoundError`
2. **已有 revert 时再次 stage**：复用已有 `revert.snapshot` 作为 original，同时将新文件加入 restore 映射
3. **`input.files === false`**：不执行文件恢复（仅刷新 revert 的 diff）
4. **snapshot 禁用或 capture 失败**：`snapshot.capture()` 返回 `undefined` → `original` 为 `undefined` → 无法 diff，`files` 为空数组
5. **Committed 事件投影失败**：如果 boundary 消息不存在，`Effect.die` 导致 projector 死亡

---

## 源文件引用

| 文件 | 核心内容 |
|------|---------|
| `packages/schema/src/revert.ts:8-14` | FileDiff 结构定义 |
| `packages/schema/src/revert.ts:17-23` | Revert.State 结构定义 |
| `packages/schema/src/session.ts:43` | Session.Info 中 revert 字段 |
| `packages/schema/src/session-event.ts:434-446` | RevertEvent（Staged, Cleared, Committed） |
| `packages/core/src/session/revert.ts:27-58` | plan() — 扫描消息确定回退文件 |
| `packages/core/src/session/revert.ts:60-96` | stage() — 暂存回退（核心操作） |
| `packages/core/src/session/revert.ts:98-111` | clear() — 取消回退 |
| `packages/core/src/session/revert.ts:113-121` | commit() — 确认回退 |
| `packages/core/src/session/info.ts:43` | fromRow 中 revert 字段构造 |
| `packages/core/src/session/sql.ts:49` | session.revert 数据库列 |
| `packages/core/src/session/sql.ts:119-138` | SessionMessageTable 定义（seq 排序） |
| `packages/core/src/session/sql.ts:140-166` | SessionInputTable 定义 |
| `packages/core/src/session/sql.ts:168-175` | SessionContextEpochTable 定义 |
| `packages/core/src/session/projector.ts:396-404` | Staged 事件投影 |
| `packages/core/src/session/projector.ts:407-413` | Cleared 事件投影 |
| `packages/core/src/session/projector.ts:415-453` | Committed 事件投影（含 ContextEpoch.reset） |
| `packages/core/src/session/context-epoch.ts:111-120` | ContextEpoch.reset() |
| `packages/core/src/session/message-updater.ts:390-392` | message-updater 中 revert 事件处理（无操作） |
