---
blog: true
title: "Mid-Conversation System Message — 对话中期系统更新"
slug: "mid-conversation-system-message-对话中期系统更新-mscun05b"
summary: "树节点：06 Mid Conversation更新 父节点：06 Context Source与Registry 子节点：无 Mid Conversation System Message — 对话中期系统更新 当 System Context 在 Session 运行期间发生变化（如日期跨天、AGENTS.md 被编辑、技能列表变更），OpenCode 通过 持久化的 Mid Conversation System Message 将"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：06-Mid-Conversation更新
> 父节点：[[06-Context-Source与Registry]]
> 子节点：无

# Mid-Conversation System Message — 对话中期系统更新

当 System Context 在 Session 运行期间发生变化（如日期跨天、AGENTS.md 被编辑、技能列表变更），OpenCode 通过**持久化的 Mid-Conversation System Message** 将变化注入到 LLM 的对话历史中。这不仅是一个"通知模型"的动作，更是一条完整链路：从检测变化 → 持久化事件 → 投影为会话消息 → 翻译为 LLM 消息。

---

## 端到端链路

### Step 1: reconcile() 检测变化

`packages/core/src/system-context/index.ts:218-226`

在 `prepareOnce()` 中（见 [[06-Baseline与Snapshot]]），当 `reconcile()` 返回 `Updated` 时，执行如下代码：

`packages/core/src/session/context-epoch.ts:71-77`

```ts
// 位于 prepareOnce() 内部
yield* events.publish(
  SessionEvent.ContextUpdated,
  {
    sessionID,
    messageID: SessionMessage.ID.create(),
    timestamp: yield* DateTime.now,
    text: result.text,
  },
  {
    commit: () => advance(db, sessionID, result.snapshot).pipe(Effect.orDie),
  },
)
```

**关键点**：
- `result.text` 是 reconcile 阶段拼装的**所有变化源的渲染文本**（多个 `update()` / `baseline()` / `removed()` 输出用 `"\n\n"` 连接）
- `commit` 回调：事件持久后 → `advance()` 更新数据库中的 snapshot 列
- 这是一个**原子操作**：事件不成功则 snapshot 不推进

---

### Step 2: ContextUpdated 事件定义

`packages/schema/src/session-event.ts:101-110`

```ts
export const ContextUpdated = Event.define({
  type: "session.next.context.updated",
  schema: {
    ...Base,                              // sessionID + timestamp
    messageID: SessionMessage.ID,          // 新分配的 msg_xxx ID
    text: Schema.String,                  // 模型可见的变化文本
  },
})
```

- 事件类型：`"session.next.context.updated"`
- 携带一个 `messageID`——这个 ID 后续会被用作 SessionMessage.System 的 ID
- `text` 就是 reconcile 输出的完整变化描述

---

### Step 3: message-updater 创建 SessionMessage.System

`packages/core/src/session/message-updater.ts:140-148`

```ts
"session.next.context.updated": (event) =>
  adapter.appendMessage(
    SessionMessage.System.make({
      id: event.data.messageID,
      type: "system",
      text: event.data.text,
      time: { created: event.data.timestamp },
    }),
  ),
```

- 事件类型匹配 → 调用 `appendMessage()`
- 创建一条 `SessionMessage.System` 记录，**类型为 `"system"`**
- ID 复用事件的 `messageID`

SessionMessage.System 的 Schema 定义：

`packages/schema/src/session-message.ts:61-66`

```ts
export const System = Schema.Struct({
  ...Base,
  type: Schema.Literal("system"),
  text: Schema.String,
})
```

---

### Step 4: projector 保存到数据库

`packages/core/src/session/projector.ts:377`

```ts
yield* events.project(SessionEvent.ContextUpdated, (event) => run(db, event))
```

`run()` 函数（`projector.ts:112-131`）：将消息编码后 INSERT 到 `SessionMessageTable`，存入 `type: "system"` 的行。

---

### Step 5: runner 翻译为 LLM Message

`packages/core/src/session/runner/to-llm-message.ts:134-135`

```ts
case "system":
  return [Message.system(message.text)]
```

Session 历史中每条 `type: "system"` 的 SessionMessage 被翻译为一条 `Message.system(text)`。

---

### Step 6: Message.system() — LLM 层的角色定义

`packages/llm/src/schema/messages.ts:212-218`

```ts
/**
 * Add an operator-authored instruction at this chronological point in the
 * conversation. This is distinct from the initial `LLMRequest.system`
 * prompt. Keep raw retrieved, tool, and web content out of privileged system
 * updates; pass that untrusted content through ordinary user/tool channels.
 */
export const system = (content: SystemContentInput) => make({ role: "system", content })
```

- 创建 `role: "system"` 的 LLM Message
- 作为 `LLMRequest.messages` 数组中的一条插入到对话的**时间顺序位置**

---

## 与 LLMRequest.system 的本质区别

| 特性 | `LLMRequest.system` | `Message.system()` |
|------|---------------------|--------------------|
| 位置 | 请求的**特权前缀**，不在 messages 中 | 在 `LLMRequest.messages` 数组内部 |
| 语义 | 初始系统提示，定义 agent 行为 | 对话中期的操作员指令 |
| 持久性 | 不持久化（每次 turn 重建） | 作为 SessionMessage 持久存储 |
| 变化感知 | 不感知（每次是同一条） | 仅当 Source 变化时才出现 |

来自 `packages/llm/src/schema/messages.ts:212-218` 的注释明确指出：`Message.system()` 是"对话中**此时间点**的操作员指令"，不要把检索到的文档、工具输出等不受信内容放入 system 更新。

---

## Mid-Conversation System Message 的持久化语义

根据 [[Opencode的工作原理]] 中的概念定义：

> **Mid-Conversation System Message**：一条持久的时序指令，告诉模型一个变更的 Context Source 的新生效状态。
> 一旦准入，Mid-Conversation System Message 保持持久，即使后续的 provider 尝试失败并在重试时原样重放。

具体在代码中的体现：

1. **持久化到 SessionMessageTable**：`projector.ts:377` → `appendMessage()` → INSERT
2. **在历史回放中保持不变**：`to-llm-message.ts:134-135` 每次构建 provider request 时重放
3. **Compaction 后可能被移除**：Compaction 启动新 Epoch → 旧的 Mid-Conversation 消息从模型历史中折叠，但**数据库记录保留**（用于审计）

---

## 一个完整示例

假设当前日期从 7/26 变为 7/27，且 AGENTS.md 被编辑：

1. `core/date` 的 `load` 返回 `"Mon Jul 27 2026"`，与上次 snapshot 的 `"Sat Jul 26 2026"` 不同
2. `compare()` → `Updated`，调用 `update("Sat Jul 26 2026", "Mon Jul 27 2026")` → `"Today's date is now: Mon Jul 27 2026"`
3. `core/instructions` 同理，`compare()` → `Updated`，渲染为 `"These instructions replace all previously loaded ambient instructions..."`
4. `reconcileObservation()` 将两者 join 为一条 text → `"Today's date is now: ... \n\n These instructions replace ..."`
5. `ContextUpdated` 事件发布 + commit → `advance()` 更新 snapshot
6. message-updater 创建 `SessionMessage.System`
7. 下一个 provider turn 时，`to-llm-message.ts` 将 case `"system"` 转为 `Message.system()`
8. LLM 在对话历史中按序看到这条 `role: "system"` 消息

---

## 关键文件索引

| 文件 | 行数 | 步骤 |
|------|------|------|
| `packages/core/src/system-context/index.ts` | 218–226 | reconcile 检测变化 |
| `packages/core/src/session/context-epoch.ts` | 71–77 | 发布 ContextUpdated 事件 |
| `packages/schema/src/session-event.ts` | 101–110 | ContextUpdated 事件定义 |
| `packages/core/src/session/message-updater.ts` | 140–148 | 事件 → SessionMessage.System |
| `packages/schema/src/session-message.ts` | 61–66 | System 消息 Schema |
| `packages/core/src/session/projector.ts` | 377 | 投影持久化 |
| `packages/core/src/session/runner/to-llm-message.ts` | 134–135 | 翻译为 Message.system() |
| `packages/llm/src/schema/messages.ts` | 212–218 | Message.system() 定义 |
| `packages/core/src/instruction-context.ts` | 22–91 | AGENTS.md 指令源示例 |
