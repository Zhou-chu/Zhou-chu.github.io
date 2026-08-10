---
blog: true
title: "07-消息结构与角色"
slug: "07-消息结构与角色-mscun0k4"
summary: "树节点：07 消息结构与角色 父节点：Opencode的工作原理 子节点：07 系统提示组装 | 07 工具定义注入 | 07 缓存策略 07 消息结构与角色 OpenCode 存在 两套消息系统 ：内部持久化的 SessionMessage （Schema 层定义）和 LLM 协议层的 Message （ @opencode ai/llm 包）。两者通过 toLLMMessage() 翻译层桥接。 一、SessionMessage —"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "07-系统提示组装-mscun0ij"
  - "07-工具定义注入-mscun0jg"
  - "07-缓存策略-mscun0im"
---

> 树节点：07-消息结构与角色
> 父节点：[[Opencode的工作原理]]
> 子节点：[[07-系统提示组装]] | [[07-工具定义注入]] | [[07-缓存策略]]

# 07-消息结构与角色

OpenCode 存在**两套消息系统**：内部持久化的 `SessionMessage`（Schema 层定义）和 LLM 协议层的 `Message`（`@opencode-ai/llm` 包）。两者通过 `toLLMMessage()` 翻译层桥接。

---

## 一、SessionMessage —— 内部会话消息

定义于 `packages/schema/src/session-message.ts:1-213`，是所有会话状态的核心持久化模型。

### 消息类型总览

```typescript
// session-message.ts:200-212
export const Message = Schema.Union([
  AgentSwitched,  // agent 切换通知
  ModelSwitched,  // model 切换通知
  User,           // 用户输入
  Synthetic,      // 合成消息（队列/延迟输入）
  System,         // Mid-Conversation System Message
  Shell,          // Shell 命令执行记录
  Assistant,      // 模型回复
  Compaction,     // 压缩摘要标记
])
```

| 类型 | 说明 | 关键字段 |
|------|------|----------|
| `user` | 用户输入 | `text`, `files`, `agents` |
| `assistant` | 模型回复 | `content[]`, `agent`, `model`, `tokens`, `cost`, `finish`, `error` |
| `system` | 上下文变更通知（Mid-Conversation） | `text` |
| `synthetic` | 排队/延迟的用户输入 | `text`, `sessionID` |
| `shell` | Shell 命令执行 | `command`, `output`, `callID` |
| `compaction` | 上下文压缩 | `reason` (auto/manual), `summary`, `recent` |
| `agent-switched` | Agent 切换 | `agent` |
| `model-switched` | Model 切换 | `model` |

### Assistant 消息的内容结构

Assistant 消息的 `content` 字段是三种 part 的 tagged union：

```typescript
// session-message.ts:159-162
export const AssistantContent = Schema.Union([
  AssistantText,      // { type: "text", id, text }
  AssistantReasoning, // { type: "reasoning", id, text, providerMetadata?, time? }
  AssistantTool,      // { type: "tool", id, name, provider?, state, time }
])
```

- **`AssistantText`**（L140-145）：纯文本块
- **`AssistantReasoning`**（L147-157）：模型思维链，带 `providerMetadata` 和 time
- **`AssistantTool`**（L121-138）：工具调用，含 `provider?.executed` 标识是否为 provider 原地执行，内嵌 `ToolState`

### 工具状态机（ToolState）

```typescript
// session-message.ts:81-119
ToolStatePending   → { status: "pending",   input: string }
ToolStateRunning   → { status: "running",   input, structured, content[] }
ToolStateCompleted → { status: "completed", input, attachments?, content[], outputPaths?, structured, result? }
ToolStateError     → { status: "error",     input, content[], structured, error, result? }
```

状态迁移：**pending**（工具调用刚发出） → **running**（正在执行） → **completed** | **error**（终态）。

---

## 二、Message —— LLM 协议层消息

定义于 `packages/llm/src/schema/messages.ts:183-222`，是发送给提供商的标准化消息格式。

### 消息类

```typescript
// messages.ts:183-189
export class Message extends Schema.Class<Message>("LLM.Message")({
  id: Schema.optional(Schema.String),
  role: MessageRole,           // "user" | "assistant" | "system" | "tool"
  content: Schema.Array(ContentPart),
  metadata: Schema.optional(...),
  native: Schema.optional(...), // 提供商原生元数据
}) {}
```

### 工厂方法

```typescript
// messages.ts:208-222
Message.user(content)       // role: "user"
Message.assistant(content)  // role: "assistant"
Message.system(content)     // role: "system" —— 时间线上的特权指令
Message.tool(result)        // role: "tool" —— 工具返回结果
```

**关键区分**：`Message.system()` 是**时间线中的** operator 消息（区别于 `LLMRequest.system` 的初始特权前缀，见下文）。

### ContentPart 类型

```typescript
// messages.ts:178-181
export const ContentPart = Schema.Union([
  TextPart,        // { type: "text", text, cache?, metadata?, providerMetadata? }
  MediaPart,       // { type: "media", mediaType, data, filename? }
  ToolCallPart,    // { type: "tool-call", id, name, input, providerExecuted? }
  ToolResultPart,  // { type: "tool-result", id, name, result, providerExecuted? }
  ReasoningPart,   // { type: "reasoning", text, encrypted?, providerMetadata? }
])
```

### LLMRequest —— 完整的 LLM 请求

```typescript
// messages.ts:271-284
export class LLMRequest extends Schema.Class<LLMRequest>("LLM.Request")({
  model, system,        // system: SystemPart[] —— 初始特权前缀
  messages, tools,      // messages: Message[] —— 历史对话
  toolChoice, generation,
  providerOptions, http,
  responseFormat, cache, metadata,
}) {}
```

---

## 三、两套消息的翻译：`toLLMMessage()`

定义于 `packages/core/src/session/runner/to-llm-message.ts:115-167`。

### 翻译矩阵

| SessionMessage | → LLM Message 策略 |
|----------------|-------------------|
| `user` | `Message.make({ role: "user", content: [text] + files.map(media) })` |
| `synthetic` | `Message.make({ role: "user", content })` |
| `system` | `Message.system(text)` —— 时间线中的系统变更 |
| `shell` | `Message.make({ role: "user", content: "Shell command: ...\n\n..." })` |
| `agent-switched` / `model-switched` | **跳过（返回 []）** —— 这些是元事件，不进 LLM 上下文 |
| `assistant` | 调用 `assistant()` 函数（L70-113），展开 content，处理 tool call/result，按 model 匹配性决定是否携带 providerMetadata |
| `compaction` | `Message.make({ role: "user", content: "<conversation-checkpoint>...<summary>...<recent-context>..." })` |

### Assistant 翻译细节（L70-113）

- **text 块**：直接映射为 `{ type: "text", text }`
- **reasoning 块**：同模型保留 `reasoning` 类型 + `providerMetadata`，非同模型降级为 `text`（L77-87）
- **tool 块**：展开为 `ToolCallPart` + 可选 `ToolResultPart`（`providerExecuted` 工具不展开 result，L89-94）
- 每个本地工具还会额外追加独立的 `Message.tool(result)` 作为 tool 角色消息（L101-113）

### 导出入口

```typescript
// to-llm-message.ts:170-171
export const toLLMMessages = (messages, model) =>
  messages.flatMap((message) => toLLMMessage(message, model))
```

---

## 四、LLMRequest.system vs Message.system()

这是最容易被混淆的两个字段：

| | `LLMRequest.system` | `Message.system()` |
|---|---|---|
| **位置** | `LLMRequest` 顶层字段 | `LLMRequest.messages[]` 数组中 |
| **语义** | **初始特权前缀**，对整个对话生效 | **时间线上的特权更新**，从该位置起生效 |
| **类型** | `SystemPart[]` | `Message` (role: "system") |
| **内容** | agent 静态 system + context baseline | 上下文变更通知（Mid-Conversation） |
| **来源** | `agent.info?.system` + `system.baseline` | `SessionContextEpoch.reconcile()` 产生的更新 |

初始 system prompt 定义在 `packages/core/src/session/runner/llm.ts:208-210`：

```typescript
// llm.ts:208-210
system: [agent.info?.system, system.baseline]
  .filter((part): part is string => part !== undefined && part.length > 0)
  .map(SystemPart.make),
```

时间线上的 `Message.system()` 由 reconciler 在上下文源变更时插入，作为对话历史中的一条消息——详见 [[07-系统提示组装]]。

---

## 五、关键设计决策

1. **SessionMessage 是真相来源（source of truth）**：所有会话状态持久化为 SessionMessage；LLM Message 是每次 provider turn 前的临时投影
2. **元事件不进 LLM 上下文**：agent-switched / model-switched 消息在 `toLLMMessage` 中丢弃（L117-119），仅用于会话审计
3. **Compaction 是 user 角色**：摘要以 `<conversation-checkpoint>` 包裹作为 user 消息发送，让 compact/continue 对话透明（L148-165）
4. **Shell 命令是 user 角色**：执行历史作为普通文本注入，不暴露为独立角色类型（L138-144）
5. **Tool state 持久化**：每个 tool call 的完整生命周期（pending→running→completed/error）都在 SessionMessage 中保留，LLM 投影只取终态
