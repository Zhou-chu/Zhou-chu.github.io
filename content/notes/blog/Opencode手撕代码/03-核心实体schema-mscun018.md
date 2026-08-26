---
blog: true
title: "03-核心实体Schema"
slug: "03-核心实体schema-mscun018"
summary: "树节点：03 核心实体Schema 父节点：03 Schema包组织与导出 子节点：无 概述 packages/schema/src/ 目录定义了 Opencode 所有核心实体的 Effect Schema 类型。Schema 包是轻量级的共享类型层，被 Core、Server 和 Client 共同依赖。所有实体通过 Schema.Struct 定义，自动生成编解码器和类型推断。 索引导出见 packages/schema/src/"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "03-schema包组织与导出-mscuwj3u"
  - "09-fork与fiber生命周期-mscun0jo"
  - "10-快照创建与存储-mscun0jo"
  - "08-工具选择与权限-mscun0id"
  - "08-工具执行与结算-mscun0jf"
  - "03-事件与manifest-mscuwj4q"
---

> 树节点：03-核心实体Schema
> 父节点：[[03-Schema包组织与导出]]
> 子节点：无

---

## 概述

`packages/schema/src/` 目录定义了 Opencode 所有核心实体的 Effect Schema 类型。Schema 包是轻量级的共享类型层，被 Core、Server 和 Client 共同依赖。所有实体通过 `Schema.Struct` 定义，自动生成编解码器和类型推断。

索引导出见 `packages/schema/src/index.ts:1-29`，涵盖 Agent、Session、Model、Provider、Permission、Prompt、SessionMessage 等模块。

---

## 1. Session 实体

**文件**: `packages/schema/src/session.ts:18-51`

### SessionID

```typescript
// packages/schema/src/session-id.ts:5-13
export const SessionID = Schema.String.check(Schema.isStartsWith("ses")).pipe(
  Schema.brand("SessionID"),
  statics((schema) => ({
    create: () => schema.make("ses_" + descending()),
  })),
)
```

SessionID 是品牌类型（branded type），格式 `ses_` + 降序标识符字符串，确保类型安全——不能用任意字符串代替。

### Info（Session 摘要）

```typescript
// packages/schema/src/session.ts:18-44
export const Info = Schema.Struct({
  id: ID,                          // SessionID
  parentID: ID.pipe(optional),     // 父子关系（Fork）
  projectID: Project.ID,           // 所属项目
  agent: Agent.ID.pipe(optional),  // 当前 Agent
  model: Model.Ref.pipe(optional), // 当前 Model 引用
  cost: Schema.Finite,             // 累计费用
  tokens: { input, output, reasoning, cache: { read, write } },
  time: { created, updated, archived (optional) },
  title: Schema.String,
  location: Location.Ref,
  subpath: RelativePath,
  revert: Revert.State.pipe(optional),
})
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | SessionID | 唯一标识，`ses_` 前缀品牌类型 |
| `parentID` | SessionID? | Fork 父 Session，支撑 [[09-Fork与Fiber生命周期]] |
| `projectID` | Project.ID | 所属项目 |
| `agent` | Agent.ID? | 当前选中的 Agent（可在运行时切换） |
| `model` | Model.Ref? | 当前选中的模型引用 |
| `cost` | Finite | 累计 token 费用 |
| `tokens` | struct | 输入/输出/推理/缓存读写 token 统计 |
| `time.created` | DateTimeUtcFromMillis | 创建时间 |
| `time.updated` | DateTimeUtcFromMillis | 最后更新时间 |
| `time.archived` | DateTimeUtcFromMillis? | 归档时间 |
| `title` | string | 会话标题 |
| `location` | Location.Ref | 工作目录位置 |
| `subpath` | RelativePath? | 相对子路径 |
| `revert` | Revert.State? | 代码回滚状态（文件 diff 快照） |

### Revert.State

```typescript
// packages/schema/src/revert.ts:17-23
export const State = Schema.Struct({
  messageID: SessionMessage.ID,
  partID: Schema.String.pipe(optional),
  snapshot: Schema.String.pipe(optional),
  diff: Schema.String.pipe(optional),
  files: Schema.Array(FileDiff).pipe(optional),
})
```

支撑 [[10-快照创建与存储]] 中的回滚能力，记录修改前的文件状态和 diff。

### ListAnchor（分页游标）

```typescript
// packages/schema/src/session.ts:46-50
export const ListAnchor = Schema.Struct({
  id: ID,
  time: Schema.Finite,
  direction: Schema.Literals(["previous", "next"]),
})
```

Session 列表分页的 opaque cursor，消费者只需原样传递，不解析内部结构。

---

## 2. Agent 实体

**文件**: `packages/schema/src/agent.ts:1-39`

### Agent.ID

```typescript
// packages/schema/src/agent.ts:10-11
export const ID = Schema.String.pipe(Schema.brand("AgentV2.ID"))
```

品牌化的字符串标识符。

### Agent.Info

```typescript
// packages/schema/src/agent.ts:19-38
export const Info = Schema.Struct({
  id: ID,
  model: Model.Ref.pipe(optional),         // 可选模型覆盖
  request: Provider.Request,               // 请求头/体配置
  system: Schema.String.pipe(optional),     // 自定义 system prompt
  description: Schema.String.pipe(optional),
  mode: Schema.Literals(["subagent", "primary", "all"]),
  hidden: Schema.Boolean,                  // UI 中是否隐藏
  color: Color.pipe(optional),             // 十六进制色值或语义色名
  steps: PositiveInt.pipe(optional),       // 步数限制
  permissions: Permission.Ruleset,         // 权限规则集
})
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | AgentV2.ID | Agent 唯一标识 |
| `model` | Model.Ref? | 覆盖默认模型（可选） |
| `request` | Provider.Request | 请求级别的 headers + body 配置 |
| `system` | string? | System prompt 内容，覆盖默认值 |
| `mode` | "subagent"\|"primary"\|"all" | Agent 运行模式：子代理 / 主代理 / 通用 |
| `hidden` | boolean | 是否在 UI 选择器中隐藏 |
| `color` | Color? | `#xxxxxx` 格式或语义色名（primary/accent 等） |
| `steps` | PositiveInt? | 最大执行步数限制 |
| `permissions` | Permission.Ruleset | 工具权限规则列表 |

### Agent.Color

```typescript
// packages/schema/src/agent.ts:13-16
export const Color = Schema.Union([
  Schema.String.check(Schema.isPattern(/^#[0-9a-fA-F]{6}$/)),
  Schema.Literals(["primary", "secondary", "accent", "success", "warning", "error", "info"]),
])
```

支持精确十六进制色值或框架语义色名。

---

## 3. Model 实体

**文件**: `packages/schema/src/model.ts:1-107`

### 核心类型

```typescript
// packages/schema/src/model.ts:8-18
export const ID = Schema.String.pipe(Schema.brand("ModelV2.ID"))
export const VariantID = Schema.String.pipe(Schema.brand("VariantID"))

export const Ref = Schema.Struct({
  id: ID,
  providerID: Provider.ID,
  variant: VariantID.pipe(optional),
})
```

`Model.Ref` 是跨实体的引用结构，包含模型 ID、所属 Provider ID、可选 variant（变体）。

### Model.Info

```typescript
// packages/schema/src/model.ts:60-106
export const Info = Schema.Struct({
  id: ID,
  providerID: Provider.ID,
  family: Family.pipe(optional),     // 模型族（如 "claude"、"gpt"）
  name: Schema.String,
  api: Api,                          // AISDK 或 Native 协议
  capabilities: Capabilities,
  request: { ...Provider.Request.fields, variant },
  variants: Array<{ id: VariantID, ...Provider.Request.fields }>,
  time: { released: Schema.Finite },
  cost: Schema.Array(Cost),          // 多 tier 费用表
  status: "alpha" | "beta" | "deprecated" | "active",
  enabled: Schema.Boolean,
  limit: { context: Int, input?: Int, output: Int },
})
```

**关键字段**：

| 字段 | 说明 |
|------|------|
| `providerID` | 关联的 Provider，见 [[#4. Provider 实体]] |
| `family` | 模型族标签，如 claude、gpt |
| `api` | 协议类型 tagged union（`aisdk` / `native`） |
| `capabilities` | `{tools, input, output}`：支持工具调用、支持的输入/输出格式 |
| `variants` | 模型变体列表（不同参数配置） |
| `cost` | 多级费用表（按 context 大小分 tier） |
| `status` | 生命周期：alpha → beta → active → deprecated |
| `limit` | 上下文窗口大小和最大输出 token |

### Model.Api（Tagged Union）

```typescript
// packages/schema/src/model.ts:45-57
export const Api = Schema.Union([
  Schema.Struct({ id: ID, ...Provider.AISDK.fields }),   // type: "aisdk"
  Schema.Struct({ id: ID, ...Provider.Native.fields }),   // type: "native"
]).pipe(Schema.toTaggedUnion("type"))
```

通过 `type` 字段区分 AI SDK 协议和 Native 协议，对应 [[04-LLM协议适配层]] 中的不同适配路径。

### Model.Capabilities

```typescript
// packages/schema/src/model.ts:25-29
export const Capabilities = Schema.Struct({
  tools: Schema.Boolean,
  input: Schema.Array(Schema.String),
  output: Schema.Array(Schema.String),
})
```

声明模型能力：是否支持 tool calling、支持的输入/输出 MIME 类型。

---

## 4. Provider 实体

**文件**: `packages/schema/src/provider.ts:1-73`

### Provider.ID

```typescript
// packages/schema/src/provider.ts:8-23
export const ID = Schema.String.pipe(
  Schema.brand("ProviderV2.ID"),
  statics((schema) => ({
    opencode: schema.make("opencode"),
    anthropic: schema.make("anthropic"),
    openai: schema.make("openai"),
    google: schema.make("google"),
    // ... google-vertex, github-copilot, amazon-bedrock, azure, openrouter, mistral, gitlab
  })),
)
```

预定义所有支持的 Provider 常量，品牌化类型防止混淆。

### Provider.Info

```typescript
// packages/schema/src/provider.ts:52-72
export const Info = Schema.Struct({
  id: ID,
  integrationID: Integration.ID.pipe(optional),  // 关联集成服务
  name: Schema.String,                             // 显示名
  disabled: Schema.Boolean.pipe(optional),         // 是否禁用
  api: Api,                                        // 协议类型
  request: Request,                                // 请求配置
})
```

### Provider.Api（Tagged Union）

```typescript
// packages/schema/src/provider.ts:26-44
export const AISDK = Schema.Struct({
  type: Schema.Literal("aisdk"),
  package: Schema.String,       // npm 包名（如 "@anthropic-ai/sdk"）
  url: Schema.String?,           // 可选自定义 endpoint
  settings: Record<string, unknown>,  // 额外设置
})

export const Native = Schema.Struct({
  type: Schema.Literal("native"),
  url: Schema.String?,
  settings: Record<string, unknown>,
})
```

- **AISDK**：通过第三方 AI SDK 调用（Vercel AI SDK 生态）
- **Native**：通过 Opencode 自带的 LLM 协议层调用，见 [[04-LLM协议适配层]]

---

## 5. Permission 实体

**文件**: `packages/schema/src/permission.ts:1-66`

### Permission 事件

权限使用事件驱动模型：

```typescript
// packages/schema/src/permission.ts:43-46
const Asked = define({ type: "permission.v2.asked", schema: Request.fields })
const Replied = define({
  type: "permission.v2.replied",
  schema: { sessionID, requestID: ID, reply: Reply },
})
```

### 核心类型

```typescript
// packages/schema/src/permission.ts:54-65
export const Effect = Schema.Literals(["allow", "deny", "ask"])
// "allow" - 自动允许, "deny" - 自动拒绝, "ask" - 每次询问

export const Rule = Schema.Struct({
  action: Schema.String,    // 动作名（如 "bash"、"write"）
  resource: Schema.String,  // 资源匹配模式
  effect: Effect,           // allow / deny / ask
})

export const Ruleset = Schema.Array(Rule)
```

**Permission.Request**（权限请求）：

| 字段 | 说明 |
|------|------|
| `id` | `per_` 前缀品牌 ID |
| `sessionID` | 所属 Session |
| `action` | 触发的工具名称 |
| `resources` | 涉及的文件/资源路径列表 |
| `save` | 可选的保存配置 |
| `source` | 来源（当前仅支持 `tool` 类型，含 messageID + callID） |

**Permission.Source** 标识权限请求的触发点：工具调用中的某个 message 和 call。用于追溯谁在什么上下文中触发了权限检查。

**Reply**: `"once" | "always" | "reject"` — 用户对权限询问的三种回复。

权限系统与 [[08-工具选择与权限]] 协同工作，每次工具调用都会经过 Ruleset 匹配。

---

## 6. Prompt 实体

**文件**: `packages/schema/src/prompt.ts:1-58`

### Prompt

```typescript
// packages/schema/src/prompt.ts:40-57
export const Prompt = Schema.Struct({
  text: Schema.String,                        // 用户输入文本
  files: Schema.Array(FileAttachment).pipe(optional),   // 附件文件
  agents: Schema.Array(AgentAttachment).pipe(optional), // 附件 Agent 引用
})
```

### FileAttachment

```typescript
// packages/schema/src/prompt.ts:12-32
export const FileAttachment = Schema.Struct({
  uri: Schema.String,             // 文件 URI
  mime: Schema.String,            // MIME 类型
  name: Schema.String?,           // 文件名
  description: Schema.String?,    // 描述
  source: Source.pipe(optional),  // 文本来源范围 {start, end, text}
})
```

### AgentAttachment

```typescript
// packages/schema/src/prompt.ts:34-38
export const AgentAttachment = Schema.Struct({
  name: Schema.String,
  source: Source.pipe(optional),
})
```

### SessionInput.Admitted（已准入的输入）

```typescript
// packages/schema/src/session-input.ts:14-23
export const Admitted = Schema.Struct({
  admittedSeq: NonNegativeInt,    // 准入序号
  id: SessionMessage.ID,          // 对应消息 ID
  sessionID: SessionID,
  prompt: Prompt,
  delivery: Delivery,             // "steer" | "queue"
  timeCreated: DateTimeUtcFromMillis,
  promotedSeq: NonNegativeInt?,   // 提升序号
})
```

`Admitted` 记录已准入但可能尚未提升（promoted）到 Provider Turn 的输入，见 [[05-会话输入与Prompt管理]]。

`Delivery` 为 `"steer"`（立即注入当前 Turn）或 `"queue"`（等待下一个 Turn）。

---

## 7. SessionMessage 实体（全消息类型）

**文件**: `packages/schema/src/session-message.ts:1-214`

这是最核心的类型体系。所有消息共享 `Base` 字段：

```typescript
// packages/schema/src/session-message.ts:24-28
const Base = {
  id: ID,                                          // msg_ 前缀品牌 ID
  metadata: Record<string, unknown>?,               // 扩展元数据
  time: { created: DateTimeUtcFromMillis },         // 创建时间
}
```

### 7.1 消息 ID

```typescript
// packages/schema/src/session-message.ts:12-15
export const ID = Schema.String.check(Schema.isStartsWith("msg_")).pipe(
  Schema.brand("Session.Message.ID"),
  statics((schema) => ({ create: () => schema.make("msg_" + ascending()) })),
)
```

`msg_` 前缀 + 升序标识符，确保全局唯一和时序。

### 7.2 User（用户消息）

```typescript
// packages/schema/src/session-message.ts:44-51
export const User = Schema.Struct({
  ...Base,
  text: Prompt.fields.text,
  files: Prompt.fields.files,
  agents: Prompt.fields.agents,
  type: Schema.Literal("user"),
})
```

复用 Prompt 的三个字段：文本、文件附件、Agent 引用。这是会话的入口消息。

### 7.3 Assistant（助手消息）

```typescript
// packages/schema/src/session-message.ts:164-189
export const Assistant = Schema.Struct({
  ...Base,
  type: Schema.Literal("assistant"),
  agent: Schema.String,              // 执行的 Agent 名
  model: Model.Ref,                  // 使用的模型引用
  content: AssistantContent[],       // 混合内容数组
  snapshot: {                        // 代码快照信息
    start: string?,
    end: string?,
    files: RelativePath[]?
  },
  finish: string?,                   // 结束原因
  cost: Finite?,                     // 费用
  tokens: { input, output, reasoning, cache: {read, write} }?,
  error: UnknownError?,              // 错误信息
  time: { created, completed? },
})
```

Assistant 消息是最复杂的类型，其 `content` 是混合数组：

#### AssistantContent（Tagged Union）

```
AssistantContent = AssistantText | AssistantReasoning | AssistantTool
```

**AssistantText**（纯文本块，行 140-145）：
```typescript
{ type: "text", id: string, text: string }
```

**AssistantReasoning**（推理块，行 147-157）：
```typescript
{
  type: "reasoning", id: string, text: string,
  providerMetadata?: ProviderMetadata,
  time?: { created, completed? }
}
```
承载模型的 "thinking" 过程（如 Claude 的 extended thinking）。

**AssistantTool**（工具调用，行 121-138）：
```typescript
{
  type: "tool", id: string, name: string,
  provider: { executed: boolean, metadata?, resultMetadata? },
  state: ToolState,
  time: { created, ran?, completed?, pruned? }
}
```

#### ToolState（工具状态机）

```typescript
// packages/schema/src/session-message.ts:81-119
ToolState = Pending | Running | Completed | Error
```

| 状态 | status | 关键字段 | 说明 |
|------|--------|---------|------|
| **Pending** | `"pending"` | `input: string`（原始输入文本） | 工具调用已发出，输入流还未完成 |
| **Running** | `"running"` | `input: Record`, `structured: Record`, `content: ToolContent[]` | 工具正在执行 |
| **Completed** | `"completed"` | 含 `outputPaths`, `structured`, `result` | 工具执行成功 |
| **Error** | `"error"` | `error: UnknownError`, `result?` | 工具执行失败 |

详见 [[08-工具执行与结算]]。

### 7.4 System（系统消息）

```typescript
// packages/schema/src/session-message.ts:61-66
export const System = Schema.Struct({
  ...Base,
  type: Schema.Literal("system"),
  text: Schema.String,
})
```

存储 **Mid-Conversation System Message**，即运行时上下文变化通知（如 Agent 切换、日期变化），见 [[06-Mid-Conversation更新]]。

### 7.5 Synthetic（合成消息）

```typescript
// packages/schema/src/session-message.ts:53-59
export const Synthetic = Schema.Struct({
  ...Base,
  sessionID: SessionID,
  text: Schema.String,
  type: Schema.Literal("synthetic"),
})
```

程序化生成的消息（非用户或模型产出），带 sessionID 关联。用于注入系统级指令或中间状态。

### 7.6 Shell（终端命令消息）

```typescript
// packages/schema/src/session-message.ts:68-79
export const Shell = Schema.Struct({
  ...Base,
  type: Schema.Literal("shell"),
  callID: Schema.String,
  command: Schema.String,
  output: Schema.String,
  time: { created, completed? },
})
```

记录终端命令执行：命令文本、输出、执行时间。与 [[08-工具执行与结算]] 中的 Bash 工具协同。

### 7.7 Compaction（压缩消息）

```typescript
// packages/schema/src/session-message.ts:191-198
export const Compaction = Schema.Struct({
  type: Schema.Literal("compaction"),
  reason: Schema.Literals(["auto", "manual"]),
  summary: Schema.String,
  recent: Schema.String,
  ...Base,
})
```

当对话历史过长时触发的压缩操作记录：
- `reason`: `"auto"`（自动触发）或 `"manual"`（用户手动触发）
- `summary`: 压缩后的摘要
- `recent`: 保留的最近消息片段

详见 [[05-Compaction与历史管理]]。

### 7.8 AgentSwitched（Agent 切换）

```typescript
// packages/schema/src/session-message.ts:30-35
export const AgentSwitched = Schema.Struct({
  ...Base,
  type: Schema.Literal("agent-switched"),
  agent: Schema.String,
})
```

记录 Agent 切换事件（作为消息持久化），是 Mid-Conversation System Message 的一种来源。

### 7.9 ModelSwitched（模型切换）

```typescript
// packages/schema/src/session-message.ts:37-42
export const ModelSwitched = Schema.Struct({
  ...Base,
  type: Schema.Literal("model-switched"),
  model: Model.Ref,
})
```

记录模型切换事件，携带新模型的完整引用。

### 7.10 消息 Union 一览

```typescript
// packages/schema/src/session-message.ts:200-213
export const Message = Schema.Union([
  AgentSwitched, ModelSwitched, User, Synthetic,
  System, Shell, Assistant, Compaction,
]).pipe(Schema.toTaggedUnion("type"))
```

所有消息通过 `type` 字段判别（tagged union），消费端根据 `type` 做 exhaustive match。

---

## 8. SessionTodo 实体

**文件**: `packages/schema/src/session-todo.ts:1-26`

### Todo Info

```typescript
// packages/schema/src/session-todo.ts:7-15
export const Info = Schema.Struct({
  content: Schema.String,    // 任务简述
  status: Schema.String,     // pending | in_progress | completed | cancelled
  priority: Schema.String,   // high | medium | low
})
```

Todo 不使用独立 ID，而是作为 Session 的附属列表存在。更新通过事件传播。

### Todo 事件

```typescript
// packages/schema/src/session-todo.ts:18-25
const Updated = define({
  type: "todo.updated",
  schema: { sessionID: SessionID, todos: Schema.Array(Info) },
})
```

`todo.updated` 事件携带完整的 todos 数组（全量替换语义），Session 每次更新 todo 时触发。

---

## 实体关系图谱

```
Session
  ├── id: SessionID (ses_xxx)
  ├── agent ────────────── Agent.ID
  ├── model ────────────── Model.Ref ──────── Provider.ID
  │                          ├── providerID ──┘
  │                          └── variant: VariantID
  ├── location ─────────── Location.Ref
  └── revert ───────────── Revert.State
                              └── messageID ── SessionMessage.ID

Agent
  ├── id: AgentV2.ID
  ├── model ────────────── Model.Ref (可选覆盖)
  ├── request ──────────── Provider.Request
  └── permissions ──────── Permission.Ruleset
                              └── Rule[] : {action, resource, effect}

SessionMessage (8 variants)
  ├── User       ─── text + files + agents (Prompt fields)
  ├── Assistant  ─── content: [Text|Reasoning|Tool]
  │                    └── Tool.state: Pending|Running|Completed|Error
  ├── System     ─── text (Mid-Conversation)
  ├── Synthetic  ─── sessionID + text
  ├── Shell      ─── callID + command + output
  ├── Compaction ─── summary + recent
  ├── AgentSwitched ─ agent: string
  └── ModelSwitched ─ model: Model.Ref
```

---

## 关键设计模式

1. **Branded Types**: ID 类型全部品牌化（`Schema.brand("...")`），防止不同类型的 ID 混用。如 `SessionID`、`AgentV2.ID`、`ModelV2.ID` 各自独立。

2. **Tagged Union**: 多态类型使用 `Schema.toTaggedUnion("type")`，如 `Message`、`Api`、`ToolState`，消费端通过 `type` 字段分发。

3. **Reference Pattern**: `Model.Ref` 并非嵌套整个 Model.Info，而是用 `{id, providerID, variant}` 轻量引用，需要完整信息时再通过 providerID 查询。

4. **Static Methods**: 通过 `statics()` 附加工厂方法到 Schema 上，如 `Model.Info.empty()`、`Permission.ID.create()`，实现类型安全的构造器。

5. **Event-Sourced State**: SessionTodo 和部分实体状态通过事件更新（`define(...)`），而非直接 CRUD，见 [[03-事件与Manifest]]。
