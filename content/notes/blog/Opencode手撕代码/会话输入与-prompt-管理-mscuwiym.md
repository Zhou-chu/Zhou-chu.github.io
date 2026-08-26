---
blog: true
title: "会话输入与 Prompt 管理"
slug: "会话输入与-prompt-管理-mscuwiym"
summary: "树节点：05 会话输入与Prompt管理 父节点：05 Session创建与状态机 子节点：无 会话输入与 Prompt 管理 用户消息和工具结果如何进入 Opencode 系统——从 admit() 持续化接纳，到事件投影为数据库消息，再到 Runner 的 promote() 提升为 LLM 可见的上下文。 数据模型 Prompt 输入类型 packages/schema/src/prompt input.ts:21 26 File"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "05-session创建与状态机-mscun046"
---

> 树节点：05-会话输入与Prompt管理
> 父节点：[[05-Session创建与状态机]]
> 子节点：无

# 会话输入与 Prompt 管理

用户消息和工具结果如何进入 Opencode 系统——从 `admit()` 持续化接纳，到事件投影为数据库消息，再到 Runner 的 `promote()` 提升为 LLM 可见的上下文。

---

## 数据模型

### Prompt 输入类型

`packages/schema/src/prompt-input.ts:21-26`

```typescript
export const Prompt = Schema.Struct({
  text: Schema.String,                                       // 用户文本
  files: Schema.Array(FileAttachment).pipe(optional),        // 附件
  agents: Schema.Array(AgentAttachment).pipe(optional),      // 指定 agent
})
```

`FileAttachment` (`:7-19`)：`{ uri, name?, description?, source? }` — 文件的 URI、MIME 类型、来源。

`Prompt` 类型在 `packages/core/src/session/prompt.ts:1` 中直接 re-export：
```typescript
export { AgentAttachment, FileAttachment, Prompt, Source } from "@opencode-ai/schema/prompt"
```

### Session Input — Admitted 记录

`packages/schema/src/session-input.ts:14-23`

```typescript
export const Admitted = Schema.Struct({
  admittedSeq: NonNegativeInt,        // 接纳时的 durable sequence
  id: SessionMessage.ID,              // 消息 ID
  sessionID: SessionID,               // 所属 session
  prompt: Prompt,                     // prompt 内容
  delivery: Delivery,                 // "queue" | "steer"
  timeCreated: DateTimeUtcFromMillis, // 创建时间
  promotedSeq: NonNegativeInt.pipe(optional), // 提升时的 sequence（提升前为 undefined）
})
```

**`Delivery`** 两种模式：
- `"queue"` — 普通排队消息，按 FIFO 顺序逐一处理
- `"steer"` — 转向消息，优先于 queue 处理，可插入当前 turn 中间

---

## admit() — 接纳输入

`packages/core/src/session/input.ts:41-81`

```typescript
export const admit = Effect.fn("SessionInput.admit")(function* (
  db, events,
  input: { id, sessionID, prompt, delivery },
) {
  const existing = yield* find(db, input.id)
  if (existing !== undefined) return existing     // 幂等：已存在则直接返回
  const timestamp = yield* DateTime.now
  return yield* events
    .publish(SessionEvent.PromptAdmitted, {        // 发布事件
      messageID: input.id,
      sessionID: input.sessionID,
      timestamp,
      prompt: input.prompt,
      delivery: input.delivery,
    })
    .pipe(
      Effect.flatMap((event) =>
        event.durable === undefined
          ? Effect.die("Prompt admission event is missing aggregate sequence")
          : Effect.succeed(
              Admitted.make({
                admittedSeq: event.durable.seq,    // 事件持久化后的 sequence
                id: input.id, sessionID, prompt, delivery, timeCreated: timestamp,
              }),
            ),
      ),
      // 竞态恢复：如果发布失败但已被其他并发写入，从 DB 读取
      Effect.catchDefect((defect) =>
        find(db, input.id).pipe(Effect.flatMap((stored) => (stored ? Effect.succeed(stored) : Effect.die(defect)))),
      ),
    )
})
```

**admit() 流程**：
1. 检查幂等：`find(db, id)` 已存在则直接返回
2. 发布 `SessionEvent.PromptAdmitted` 事件（事件系统分配 durable sequence）
3. 返回 `Admitted` 记录（含 `admittedSeq`，`promotedSeq` 为 `undefined`）

**注意**：此时 Prompt 已持久化到事件流，但尚未提升为 LLM 可见——`promotedSeq` 仍为 `undefined`。

---

## 事件投影 — 从事件到数据库记录

### projectAdmitted() (`:83-116`)

`PromptAdmitted` 事件投影时调用：将 Admitted 记录写入 `SessionInputTable`（`:101-115`）。

```typescript
db.insert(SessionInputTable).values({
  id, session_id, admitted_seq, prompt: encodePrompt(prompt),
  delivery, time_created,  // promoted_seq 为 null
}).onConflictDoNothing()
```

### projectPrompted() (`:118-168`)

`Prompted` 事件投影时调用：更新 `promoted_seq` 字段，将输入标记为"已提升"。

```typescript
db.update(SessionInputTable).set({ promoted_seq })
  .where(id = ? AND session_id = ? AND promoted_seq IS NULL)
```

如果 `promoted_seq` 已被设置（竞态），通过 `find()` 检查一致性；若行完全不存在（提升发生在接纳之前），执行 upsert。

### 投影注册

`packages/core/src/session/projector.ts:350-375`

```typescript
yield* events.project(SessionEvent.Prompted, (event) =>
  Effect.gen(function* () {
    yield* SessionInput.projectPrompted(db, { ... })
    yield* run(db, event)    // 将 prompt 写入 SessionMessageTable
  }),
)
yield* events.project(SessionEvent.PromptAdmitted, (event) =>
  Effect.gen(function* () {
    yield* SessionInput.projectAdmitted(db, { ... })
  }),
)
```

**关键**：`Prompted` 事件会同时调用 `projectPrompted()`（写入 SessionInputTable + 设置 promoted_seq）和 `run(db, event)`（将消息写入 SessionMessageTable）。`PromptAdmitted` 只写 SessionInputTable（`promoted_seq = null`）。

---

## promoteSteers() 与 promoteNextQueued() — 提升机制

### promoteSteers() (`packages/core/src/session/input.ts:245-266`)

```typescript
export const promoteSteers = Effect.fn("SessionInput.promoteSteers")(function* (
  db, events, sessionID, cutoff,
) {
  // 查询所有 delivery = 'steer'、未提升、admitted_seq <= cutoff 的输入
  const rows = yield* db.select().from(SessionInputTable).where(
    and(
      eq(session_id, sessionID),
      isNull(promoted_seq),
      eq(delivery, "steer"),
      lte(admitted_seq, cutoff),
    ),
  ).orderBy(asc(admitted_seq)).all()
  return yield* publish(db, events, sessionID, rows)  // 逐一发布 Prompted 事件
})
```

- 只提升 **当前 cutoff 之前** 接纳的 steer 消息
- 按 `admitted_seq` 升序处理
- 返回提升数量

### promoteNextQueued() (`:268-288`)

```typescript
export const promoteNextQueued = Effect.fn("SessionInput.promoteNextQueued")(function* (
  db, events, sessionID,
) {
  // 查询第一条 delivery = 'queue'、未提升的输入
  const row = yield* db.select().from(SessionInputTable).where(
    and(eq(session_id, sessionID), isNull(promoted_seq), eq(delivery, "queue")),
  ).orderBy(asc(admitted_seq)).limit(1).get()
  return row === undefined ? false : yield* publish(db, events, sessionID, [row]).pipe(Effect.as(true))
})
```

- 每次只提升 **一个** queued prompt（FIFO）
- 返回 `true/false`

### publish() 内部 (`:216-243`)

逐行发布 `SessionEvent.Prompted` 事件，`promotedSeq` 由事件系统的 durable sequence 分配。

---

## hasPending() — 待处理查询

`packages/core/src/session/input.ts:170-189`

```typescript
export const hasPending = Effect.fn("SessionInput.hasPending")(function* (
  db, sessionID, delivery,
) {
  const row = yield* db.select({ id }).from(SessionInputTable).where(
    and(eq(session_id, sessionID), isNull(promoted_seq), eq(delivery, delivery)),
  ).limit(1).get()
  return row !== undefined
})
```

Runner 在 `run()` 循环中使用（`llm.ts:387-389`）：
```typescript
const hasSteer = yield* SessionInput.hasPending(db, input.sessionID, "steer")
const hasQueue = hasSteer ? false : yield* SessionInput.hasPending(db, input.sessionID, "queue")
```

`hasPending("steer")` 还在每个 turn 结束后检查以触发继续迭代（`llm.ts:401`）。

---

## SessionProjector — 事件到消息的投影

`packages/core/src/session/projector.ts:112-191`

`run(db, event)` 函数是核心投影逻辑。它创建 `SessionMessageUpdater.Adapter` 然后调用 `SessionMessageUpdater.update()`。

### Adapter 接口 (`:133-188`)

```typescript
const adapter: SessionMessageUpdater.Adapter = {
  getCurrentAssistant() { ... },   // 查找当前未完成的 assistant 消息
  getAssistant(messageID) { ... }, // 按 ID 查找
  getCurrentShell(callID) { ... }, // 查找匹配 callID 的 shell 消息
  updateAssistant: updateMessage,  // 更新现有消息
  updateShell: updateMessage,      // 更新 shell 消息
  appendMessage,                   // 插入新消息
}
```

### 消息持久化

`insertMessage()` (`:193-209`)：将 event 的 durable sequence 写入 `SessionMessageTable.seq`，消息数据通过 `encodeMessage()` 序列化为 `data` JSON 列。

事件类型到消息类型的映射（`:350-395`）：
- `Prompted` / `PromptAdmitted` → user/synthetic 消息
- `ContextUpdated` → system 消息
- `Synthetic` → synthetic 消息
- `Shell.Started/Ended` → shell 消息
- `Step.Started/Ended/Failed` → assistant 消息状态
- `Text.*`, `Reasoning.*`, `Tool.*` → assistant 消息内容增量更新

---

## 完整生命周期

```
外部调用 (HTTP API / Embedded)
  │
  ├─ sessions.prompt({ text, files })  →  SessionInput.admit()
  │                                          │
  │                                          ├─ 1. find() 幂等检查
  │                                          ├─ 2. publish(PromptAdmitted)
  │                                          ├─ 3. projector → SessionInputTable (promoted_seq = NULL)
  │                                          └─ 4. 返回 Admitted
  │
  └─ Runner.run()
       │
       ├─ hasPending("steer") / hasPending("queue")
       │
       ├─ [有 pending]
       │   ├─ promoteSteers() / promoteNextQueued()
       │   │   └─ publish(Prompted) → projector:
       │   │       ├─ SessionInputTable.promoted_seq = 当前 durable seq
       │   │       └─ insertMessage() → SessionMessageTable (seq = 当前 durable seq)
       │   │
       │   └─ runTurnAttempt()
       │       └─ SessionHistory.entriesForRunner()
       │           └─ 加载 promoted 消息 → toLLMMessages() → LLM 请求
       │
       └─ [无 pending，无 force] → return（不做任何事）
```

---

## Steer vs Queue 的区别

| | Steer | Queue |
|---|---|---|
| **处理时机** | 当前 turn 期间，下一个迭代 | 当前 turn 完全结束后 |
| **数量** | 全部提升 | 每次只提升一个 |
| **cutoff** | 只提升 cutoff 之前接纳的 | 取第一条未提升的 |
| **优先级** | 高于 queue | 低于 steer |
| **典型场景** | 用户在 agent 执行中发消息 | 用户首次提问或等待结果时 |

在 `run()` 循环中 (`llm.ts:387-405`)：
- 先检查 steer，有 steer 就忽略 queue
- 第一个 turn 用 queue/steer 作为 promotion
- 后续迭代用 steer 检查（`needsContinuation = hasPending("steer")`）
- Queue 在下一次外层循环处理

---

## 关键源文件引用

| 功能 | 文件:行号 |
|---|---|
| Prompt 类型定义 | `packages/schema/src/prompt-input.ts:21-26` |
| Admitted 类型定义 | `packages/schema/src/session-input.ts:14-23` |
| `admit()` 接纳输入 | `packages/core/src/session/input.ts:41-81` |
| `projectAdmitted()` | `packages/core/src/session/input.ts:83-116` |
| `projectPrompted()` | `packages/core/src/session/input.ts:118-168` |
| `hasPending()` | `packages/core/src/session/input.ts:170-189` |
| `promoteSteers()` | `packages/core/src/session/input.ts:245-266` |
| `promoteNextQueued()` | `packages/core/src/session/input.ts:268-288` |
| `publish()` 内部发布 | `packages/core/src/session/input.ts:216-243` |
| 事件投影注册 | `packages/core/src/session/projector.ts:350-375` |
| `run(db, event)` 消息投影 | `packages/core/src/session/projector.ts:112-191` |
| `insertMessage()` | `packages/core/src/session/projector.ts:193-209` |
| Runner 中的 pending 检查 | `packages/core/src/session/runner/llm.ts:387-389` |
