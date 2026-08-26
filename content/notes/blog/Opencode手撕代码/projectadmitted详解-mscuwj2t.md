---
blog: true
title: "projectAdmitted详解"
slug: "projectadmitted详解-mscuwj2t"
summary: "父笔记 : 会话输入与Prompt管理 · 02 session lifecycle 调用链：谁调了 projectAdmitted？ 先搞清楚它在整个流程中的位置： admit() 只负责 发布事件 ，不写库。 projectAdmitted 是事件系统在事件持久化 之后 调用的投影回调，负责把事件内容 投影 到业务表里。这和你在 System Context 模块看到的 ContextUpdated → 投影器写 SessionMe"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> **父笔记**: [[会话输入与Prompt管理]] · [[02-session-lifecycle]]

## 调用链：谁调了 projectAdmitted？

先搞清楚它在整个流程中的位置：

```
admit()
  └─ events.publish(SessionEvent.PromptAdmitted, {...})
       │
       ├─ ① 事件写入 durable event stream（EventSequenceTable）
       │
       └─ ② 投影器被触发
            └─ projectAdmitted(db, eventPayload)
                 └─ INSERT INTO SessionInputTable (...)
```

`admit()` 只负责**发布事件**，不写库。`projectAdmitted` 是事件系统在事件持久化**之后**调用的投影回调，负责把事件内容**投影**到业务表里。这和你在 System Context 模块看到的 `ContextUpdated` → 投影器写 `SessionMessage.System` 是一模一样的架构。

事件定义在 `packages/schema/src/session-event.ts` 的 `SessionEvent.PromptAdmitted`：

```typescript
export const PromptAdmitted = Event.define({
  type: "session.next.prompt.admitted",
  schema: PromptFields,    // { messageID, sessionID, timestamp, prompt, delivery }
})
```

投影器注册在 `packages/core/src/session/projector.ts`，通过 `events.project(SessionEvent.PromptAdmitted, ...)` 把 `projectAdmitted` 注册为这个事件类型的投影回调。

---

## 逐行解析 projectAdmitted

**文件**：`packages/core/src/session/input.ts`
**符号**：`SessionInput.projectAdmitted`

```typescript
export const projectAdmitted = Effect.fn("SessionInput.projectAdmitted")(function* (
  db: DatabaseService,
  input: {
    readonly admittedSeq: number        // 事件在持久化流中的序号
    readonly id: SessionMessage.ID
    readonly sessionID: SessionSchema.ID
    readonly prompt: Prompt
    readonly delivery: Delivery
    readonly timeCreated: DateTime.Utc
  },
) {
```

输入完全来自事件 payload + 事件系统自动附加的 `admittedSeq`。

### SessionMessageTable 冲突检查

```typescript
const message = yield* db
  .select({ id: SessionMessageTable.id })
  .from(SessionMessageTable)
  .where(eq(SessionMessageTable.id, input.id))
  .get()
  .pipe(Effect.orDie)
if (message !== undefined)
  return yield* Effect.die(new LifecycleConflict({ id: input.id }))
```

**这个检查的含义**：去 `SessionMessageTable`（消息主表）查有没有这个 ID。

- **如果有** → `LifecycleConflict`。说明这个 ID 已经被提升为一条真正的会话消息了（promotion 已发生），不应该再以"admitted 但未 promoted"的身份写入 `SessionInputTable`。这是一个生命周期错误——同一个 ID 不可能同时处于"已 admit"和"已 promote"两个阶段。
- **如果没有** → 正常，继续。

> `SessionInputTable` 和 `SessionMessageTable` 是两张不同的表。前者存"已 admit 但可能还没 promote"的输入；后者存"已 promote、模型可见"的消息。同一个 ID 会先后出现在两张表里——先 InputTable，promotion 时再 MessageTable。

### 写入 SessionInputTable

```typescript
const stored = yield* db
  .insert(SessionInputTable)
  .values({
    id: input.id,
    session_id: input.sessionID,
    admitted_seq: input.admittedSeq,           // ← 事件序列号
    prompt: encodePrompt(input.prompt),         // JSON 编码后的 prompt
    delivery: input.delivery,
    time_created: DateTime.toEpochMillis(input.timeCreated),
  })
  .onConflictDoNothing()                        // ← 幂等保护
  .returning({ id: SessionInputTable.id })
  .get()
  .pipe(Effect.orDie)
if (!stored) return yield* Effect.die(new LifecycleConflict({ id: input.id }))
```

做的事：

| 步骤 | 说明 |
|---|---|
| `insert(...).values({...})` | 插入一行到 `SessionInputTable` |
| `onConflictDoNothing()` | 如果这个 ID 已经存在（主键冲突）→ 静默跳过，不报错 |
| `.returning({ id })` | 返回插入的行的 ID |
| `.get()` | 取第一行结果 |
| `if (!stored)` | 如果没拿到行（说明 `onConflictDoNothing` 跳过了，且没有其他行被返回）→ `LifecycleConflict` |

注意 `promoted_seq` **不在 VALUES 里**——它保持 NULL。这意味着这一行代表"已 admit，尚未 promote"。后面 `SessionInput.projectPrompted` 会把 `promoted_seq` 更新为一个具体值。

---

### 为什么需要 SessionMessageTable 的检查？

一个自然的疑问：直接用 `onConflictDoNothing` 不就已经幂等了吗？为什么还要先查 `SessionMessageTable`？

因为同一个 ID 存在两种合法的数据库状态：

| 状态 | SessionInputTable | SessionMessageTable | 含义 |
|---|---|---|---|
| 刚 admit | ✅ 有行（promoted_seq = NULL） | ❌ 没有 | 已持久化，模型还没看到 |
| 已 promote | ✅ 有行（promoted_seq = 数字） | ✅ 有行 | 已提升为模型可见消息 |
| 重放 admit | ❓ | ❓ | 取决于当前状态 |

如果这个 ID **已经 promotion 过了**（`SessionMessageTable` 里有一行），再重放 `projectAdmitted`：

- 没有 `SessionMessageTable` 检查 → `onConflictDoNothing` 会静默跳过，**看起来成功了**。但实际上这个 ID 已经以"已 promote"状态存在于 `SessionInputTable`（`promoted_seq` 不为 NULL），再写一行"未 promote"状态会造成数据不一致。
- **有了检查** → 立刻 `LifecycleConflict`，事件投影失败，整个事件回滚。

这个检查保证了 **admit → promote 的严格时序**：不能在 promotion 之后再次 admit 同一个 ID。

---

### 总结：projectAdmitted 做了什么

```
SessionMessageTable 里已经有这个 ID？
  ├─ YES → LifecycleConflict（时序错误——已 promote 的 ID 不能再 admit）
  └─ NO  → INSERT INTO SessionInputTable
            ├─ 写入：id, session_id, admitted_seq, prompt, delivery, time_created
            ├─ promoted_seq 保持 NULL（尚未 promotion）
            ├─ onConflictDoNothing（幂等——同 ID 重复插入不报错）
            └─ 返回结果
                 ├─ stored = 有行 → 成功，投影完成
                 └─ stored = 无行 → LifecycleConflict（冲突）
```

它回答的问题就是一句话：**"把用户输入持久化到输入表，标记为'已承认但模型还没看到'。"** 至于什么时候被模型看到——那是 `SessionInput.projectPrompted` 的活了。
