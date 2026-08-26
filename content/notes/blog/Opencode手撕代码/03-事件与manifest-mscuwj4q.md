---
blog: true
title: "03-事件与Manifest"
slug: "03-事件与manifest-mscuwj4q"
summary: "树节点：03 事件与Manifest 父节点：03 Schema包组织与导出 子节点：无 概述 Opencode 采用 Event Sourcing（事件溯源） 模式管理所有状态变更。核心思想：不直接修改数据库行，而是持久化不可变的 事件（Event） ，再由 投影器（Projector） 将事件还原为当前状态。Schema 包的 event.ts 提供了事件定义的基础设施。 1. Event 基础定义 文件 : packages/sc"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "03-schema包组织与导出-mscuwj3u"
---

> 树节点：03-事件与Manifest
> 父节点：[[03-Schema包组织与导出]]
> 子节点：无

---

## 概述

Opencode 采用 **Event Sourcing（事件溯源）** 模式管理所有状态变更。核心思想：不直接修改数据库行，而是持久化不可变的 **事件（Event）**，再由 **投影器（Projector）** 将事件还原为当前状态。Schema 包的 `event.ts` 提供了事件定义的基础设施。

---

## 1. Event 基础定义

**文件**: `packages/schema/src/event.ts:1-126`

### 1.1 Event.ID

```typescript
// packages/schema/src/event.ts:9-12
export const ID = Schema.String.check(Schema.isStartsWith("evt_")).pipe(
  Schema.brand("Event.ID"),
  statics((schema) => ({ create: () => schema.make("evt_" + ascending()) })),
)
```

`evt_` 前缀 + 升序标识符，全局唯一。

### 1.2 Event.Definition（事件定义类型）

```typescript
// packages/schema/src/event.ts:15-25
export type Definition<
  Type extends string = string,
  DataSchema extends Schema.Codec<unknown, unknown> = Schema.Codec<unknown, unknown>,
> = Schema.Top & {
  readonly type: Type
  readonly durable?: {
    readonly version: number
    readonly aggregate: string
  }
  readonly data: DataSchema
}
```

每个事件定义包含：
- **type**: 唯一的字符串类型标签（如 `"session.next.prompted"`）
- **durable**（可选）: 标记为持久化事件，含版本号和聚合根字段名（如 `aggregate: "sessionID"`）
- **data**: 事件负载的 Schema Codec

### 1.3 Event.Payload（事件负载运行时形状）

```typescript
// packages/schema/src/event.ts:29-40
export type Payload<D extends Definition = Definition> = {
  readonly id: ID
  readonly type: D["type"]
  readonly data: Data<D>
  readonly durable?: { aggregateID: string; seq: number; version: number }
  readonly location?: Location.Ref
  readonly metadata?: Record<string, unknown>
}
```

持久化后的事件包含：
- `id`: 全局唯一事件 ID
- `type`: 事件类型标签
- `data`: 事件负载数据
- `durable`: 持久化元数据（aggregateID = 聚合根 ID，seq = 聚合内序号，version = schema 版本）
- `location`: 发生位置（可选）
- `metadata`: 扩展元数据

### 1.4 Event.define() — 核心工厂

```typescript
// packages/schema/src/event.ts:42-70
export function define<Type, Fields>(input: {
  readonly type: Type
  readonly durable?: { readonly version: number; readonly aggregate: string }
  readonly schema: Fields
}) {
  const data = Schema.Struct(input.schema)
  return Schema.Struct({
    id: ID,
    metadata: optional(Schema.Record(Schema.String, Schema.Unknown)),
    type: Schema.Literal(input.type),
    durable: optional(Schema.Struct({ aggregateID, seq, version })),
    location: optional(Location.Ref),
    data,
  }).annotate({ identifier: input.type })
    .pipe(statics(() => ({
      type: input.type,
      ...(input.durable === undefined ? {} : { durable: input.durable }),
      data,
    })))
}
```

`Event.define()` 自动：
1. 将 `schema` 字段包装为 `data` 子对象
2. 注入标准字段（`id`, `metadata`, `type`, `durable`, `location`）
3. 通过 `statics()` 将 `type`、`durable`、`data` 作为静态属性附加到 Schema 上
4. 返回完整的编解码 Schema，同时满足 `Definition` 类型约束

**使用示例**（来自 session-event.ts）：

```typescript
// packages/schema/src/session-event.ts:87-92
export const Prompted = Event.define({
  type: "session.next.prompted",
  ...options,  // { durable: { aggregate: "sessionID", version: 1 } }
  schema: {
    ...Base,       // { timestamp, sessionID }
    messageID: SessionMessage.ID,
    prompt: Prompt,
    delivery: Delivery,
  },
})
```

### 1.5 Event.inventory() — 事件清单

```typescript
// packages/schema/src/event.ts:72-74
export function inventory<const Definitions extends ReadonlyArray<Definition>>(
  ...definitions: Definitions
) {
  return Object.freeze(definitions)
}
```

将所有事件定义为不可变冻结数组，用于编译 manifest。

### 1.6 Event.latest() — 去重取最新版本

```typescript
// packages/schema/src/event.ts:76-92
export function latest(definitions: ReadonlyArray<Definition>) {
  return readonlyMap(
    definitions.reduce((result, definition) => {
      const existing = result.get(definition.type)
      // 同版本重复定义抛错；高版本覆盖低版本
      ...
    }, new Map<string, Definition>())
  )
}
```

当同一事件定义了多个版本（durable 迁移）时，`latest()` 按 `type` 去重保留最高版本。

### 1.7 Event.durable() — 提取持久化事件子集

```typescript
// packages/schema/src/event.ts:98-108
export function durable<const Definitions extends ReadonlyArray<Definition>>(
  definitions: Definitions
) {
  return readonlyMap(
    definitions.reduce((result, definition) => {
      if (!definition.durable) return result
      const key = versionedType(definition.type, definition.durable.version)
      result.set(key, definition)
      return result
    }, new Map())
  )
}
```

过滤掉非 durable 事件，按 `"type.version"` 键存储。Durable 事件会写入数据库，非 durable（live-only）事件仅通过 SSE 实时推送。

---

## 2. 事件 Manifest 体系

### 2.1 EventManifest（完整清单）

**文件**: `packages/schema/src/event-manifest.ts:1-85`

将所有模块的事件定义汇总为统一的 manifest：

```typescript
// packages/schema/src/event-manifest.ts:63-84
export const Definitions = Event.inventory(
  // foundation: sessionV1 durable + SessionEvent + Catalog + Integration + ModelsDev
  ...foundationDefinitions,
  // live-only V1 events (降级兼容)
  ...sessionV1LiveDefinitions,
  // feature: FileSystem, Reference, Permission, Plugin, ProjectDirectories, Pty, Question
  ...featureDefinitions,
  // other: Lsp, Mcp, Tui, Vcs, Workspace, Server, Compaction, Todo, Installation...
  ...SessionTodo.Event.Definitions,
  ...InstallationEvent.Definitions,
  ...LspEvent.Definitions,
  ...ServerEvent.Definitions,
  // ... etc
)

export const Latest = Event.latest(Definitions)
export const ServerDefinitions = Event.inventory(...) // Server 专用子集
export { Durable }
```

**分层结构**：

| 层 | 内容 |
|----|------|
| `foundationDefinitions` | SessionV1 durable + SessionEvent + Catalog + Integration + ModelsDev — 核心持久化事件 |
| `featureDefinitions` | FileSystem, Reference, Permission, Plugin, Pty, Question — 功能事件 |
| 其他模块 | Lsp, Mcp, Tui, Vcs, Workspace, Server, Compaction, Todo, Installation — 各领域事件 |
| `ServerDefinitions` | foundation + feature + Todo — Server 进程专用精简子集 |

### 2.2 DurableEventManifest（持久化事件清单）

**文件**: `packages/schema/src/durable-event-manifest.ts:1-16`

```typescript
// packages/schema/src/durable-event-manifest.ts:7-15
export const SessionDurable = {
  definitions: Event.durable(SessionEvent.DurableDefinitions),
  schema: SessionEvent.Durable,
}

export const Durable = Event.durable([
  ...SessionV1.Event.Definitions.filter(d => d.durable !== undefined),
  ...SessionEvent.DurableDefinitions,
])
```

`Durable` Map 用于数据库投影器：根据事件类型查找对应的 schema codec 进行反序列化。

---

## 3. SessionEvent（会话事件全集）

**文件**: `packages/schema/src/session-event.ts:1-522`

Session 相关的所有事件定义，是系统中最重要的事件集。

### 3.1 Durable 配置

```typescript
// packages/schema/src/session-event.ts:38-49
const options = {
  durable: { aggregate: "sessionID", version: 1 },
} as const
const stepSettlementOptions = {
  durable: { aggregate: "sessionID", version: 2 },
} as const
```

所有 Session 事件都以 `sessionID` 为聚合根（aggregate），同一 Session 的事件按 `seq` 排序。`stepSettlementOptions` 使用 version 2（表示 Step 结算事件经历过 schema 迁移）。

### 3.2 事件分类目录

#### Agent/Model 切换

| 事件类型 | 行号 | 关键字段 | 说明 |
|----------|------|---------|------|
| `session.next.agent.switched` | 54-63 | `messageID, agent` | Agent 切换 |
| `session.next.model.switched` | 65-74 | `messageID, model` | 模型切换 |

#### Session 生命周期

| 事件类型 | 行号 | 关键字段 | 说明 |
|----------|------|---------|------|
| `session.next.moved` | 76-85 | `location, subdirectory` | Session 移动到新位置 |
| `session.next.prompted` | 87-92 | `messageID, prompt, delivery` | 新 Prompt 已排入队列（可能延迟提升） |
| `session.next.prompt.admitted` | 94-99 | `messageID, prompt, delivery` | Prompt 被准入（立即加入执行） |

`prompted` vs `prompt.admitted`：
- `prompted`：Prompt 已持久化但可能还在等待（`delivery: "queue"`）
- `prompt.admitted`：Prompt 已通过准入检查，可以进入 Provider Turn

#### Context 更新

| 事件类型 | 行号 | 关键字段 | 说明 |
|----------|------|---------|------|
| `session.next.context.updated` | 101-110 | `messageID, text` | Mid-Conversation System Message 写入 |
| `session.next.synthetic` | 112-121 | `messageID, text` | 程序化合成消息 |

见 [[06-Mid-Conversation更新]]。

#### Shell 执行

| 事件类型 | 行号 | 关键字段 | 说明 |
|----------|------|---------|------|
| `session.next.shell.started` | 124-134 | `messageID, callID, command` | 终端命令开始执行 |
| `session.next.shell.ended` | 136-146 | `callID, output` | 终端命令执行完成 |

#### Step 执行

| 事件类型 | 行号 | 关键字段 | 说明 |
|----------|------|---------|------|
| `session.next.step.started` | 149-160 | `assistantMessageID, agent, model, snapshot` | Provider Turn 开始 |
| `session.next.step.ended` | 162-183 | `assistantMessageID, finish, cost, tokens, snapshot, files` | Provider Turn 正常结束 |
| `session.next.step.failed` | 185-195 | `assistantMessageID, error` | Provider Turn 异常失败 |

Step 是 Provider Turn 的持久化记录。`ended` 携带完整的 token 统计和费用，`failed` 记录错误。见 [[11-Provider-Turn完整流程]]。

#### Text 流式输出

| 事件类型 | 行号 | Durable | 说明 |
|----------|------|---------|------|
| `session.next.text.started` | 198-207 | ✅ | 文本块开始 |
| `session.next.text.delta` | 210-219 | ❌ **live-only** | 流式增量片段 |
| `session.next.text.ended` | 221-231 | ✅ | 文本块结束（含完整文本） |

**关键设计**：`delta` 事件不持久化（无 `durable` 配置），仅通过 SSE 实时推送。持久化/重放时直接使用 `ended` 事件中的完整 `text`。

#### Reasoning 流式输出

| 事件类型 | 行号 | Durable | 说明 |
|----------|------|---------|------|
| `session.next.reasoning.started` | 235-245 | ✅ | 推理块开始 |
| `session.next.reasoning.delta` | 248-258 | ❌ **live-only** | 推理增量 |
| `session.next.reasoning.ended` | 259-271 | ✅ | 推理块结束 |

与 Text 对称的设计，额外携带 `providerMetadata`（如 Anthropic 的 thinking signature）。

#### Tool 执行（最复杂的事件子集）

| 事件类型 | 行号 | Durable | 说明 |
|----------|------|---------|------|
| `session.next.tool.input.started` | 281-289 | ✅ | 工具输入流开始 |
| `session.next.tool.input.delta` | 292-299 | ❌ **live-only** | 工具输入增量 |
| `session.next.tool.input.ended` | 301-309 | ✅ | 工具输入流结束 |
| `session.next.tool.called` | 312-325 | ✅ | 工具被调用（含解析后的结构化 input） |
| `session.next.tool.progress` | 331-340 | ✅ | 工具执行中检查点（语义转换或定时） |
| `session.next.tool.success` | 342-357 | ✅ | 工具执行成功 |
| `session.next.tool.failed` | 359-373 | ✅ | 工具执行失败 |

工具生命周期：`input.started` → `input.delta*`（live-only） → `input.ended` → `called`（解析完成） → `progress*` → `success`/`failed`

`progress` 事件用于长时间运行工具的中间状态检查点，避免只记录最终结果。

#### Retry（重试）

| 事件类型 | 行号 | 说明 |
|----------|------|------|
| `session.next.retried` | 387-396 | 重试记录，携带 `attempt` 次数和 `RetryError` 详情 |

`RetryError`（行 375-385）包含 `message`、`statusCode`、`isRetryable`、响应头和响应体。

#### Compaction（压缩）

| 事件类型 | 行号 | Durable | 说明 |
|----------|------|---------|------|
| `session.next.compaction.started` | 399-408 | ✅ | 压缩开始 |
| `session.next.compaction.delta` | 410-418 | ❌ **live-only** | 压缩进度流 |
| `session.next.compaction.ended` | 420-432 | ✅ | 压缩完成（含 `text` 摘要和 `recent` 保留片段） |

#### Revert（回滚）

| 事件类型 | 行号 | 说明 |
|----------|------|------|
| `session.next.revert.staged` | 435-439 | 回滚已暂存（携带 Revert.State） |
| `session.next.revert.cleared` | 440 | 回滚清除 |
| `session.next.revert.committed` | 441-445 | 回滚已提交（关联 messageID） |

### 3.3 DurableDefinitions vs Definitions

```typescript
// packages/schema/src/session-event.ts:448-477
export const DurableDefinitions = Event.inventory(
  AgentSwitched, ModelSwitched, Moved,
  Prompted, PromptAdmitted, ContextUpdated, Synthetic,
  Shell.Started, Shell.Ended,
  Step.Started, Step.Ended, Step.Failed,
  Text.Started, Text.Ended,
  Tool.Input.Started, Tool.Input.Ended,
  Tool.Called, Tool.Progress, Tool.Success, Tool.Failed,
  Reasoning.Started, Reasoning.Ended,
  Retried,
  Compaction.Started, Compaction.Ended,
  RevertEvent.Staged, RevertEvent.Cleared, RevertEvent.Committed,
)
```

```typescript
// packages/schema/src/session-event.ts:479-512
export const Definitions = Event.inventory(
  // DurableDefinitions 中的所有事件...
  // + 额外的 live-only 事件:
  Text.Delta,           // 文本流增量
  Reasoning.Delta,      // 推理流增量
  Tool.Input.Delta,     // 工具输入流增量
  Compaction.Delta,     // 压缩进度增量
)
```

`Definitions` = `DurableDefinitions` + 4 个 live-only delta 事件。

### 3.4 Durable Union Schema

```typescript
// packages/schema/src/session-event.ts:514-521
export const Durable = Schema.Union(DurableDefinitions, { mode: "oneOf" })
  .pipe(Schema.toTaggedUnion("type"))

export const All = Schema.Union(Definitions, { mode: "oneOf" })
  .pipe(Schema.toTaggedUnion("type"))
```

分别生成 Durable 事件和全量事件的 tagged union schema，用于数据库列的类型约束和运行时解码。

---

## 4. ServerEvent（服务端事件）

**文件**: `packages/schema/src/server-event.ts:1-9`

```typescript
// packages/schema/src/server-event.ts:5-6
export const Connected = Event.define({ type: "server.connected", schema: {} })
export const Disposed = Event.define({ type: "global.disposed", schema: {} })
```

极简的两个服务器生命周期事件：
- `server.connected`：Client 连接到 Server 实例
- `global.disposed`：Server 实例销毁

均为 **live-only**（无 `durable` 标记），仅通过 `events.subscribe()` 实时推送。

---

## 5. InstallationEvent（安装事件）

**文件**: `packages/schema/src/installation-event.ts:1-21`

```typescript
// packages/schema/src/installation-event.ts:6-18
export const Updated = Event.define({
  type: "installation.updated",
  schema: { version: Schema.String },
})

export const UpdateAvailable = Event.define({
  type: "installation.update-available",
  schema: { version: Schema.String },
})
```

- `installation.updated`：安装版本变更
- `installation.update-available`：新版本可用通知

均为 live-only 事件，通过 SSE 通知客户端。

---

## 6. 事件溯源模式

### 6.1 核心流程

```
用户动作 → 产生 Event → 写入 Event Log → Projector 投影 → DB State
                                      ↘ SSE 推送 → 客户端实时更新
```

1. **事件产生**: Core 层执行业务逻辑时调用 `Event.define()` 生成的 Schema 构造事件
2. **持久化**: Durable 事件写入数据库的 event log 表（按 `aggregateID` + `seq` 排序）
3. **投影**: Projector 读取事件流，将事件还原为当前状态（如 Session 的 Info 结构）
4. **实时推送**: 所有事件（含 live-only）通过 SSE 推送给订阅客户端

### 6.2 Durable vs Live-Only 事件

| 维度 | Durable 事件 | Live-Only 事件 |
|------|-------------|---------------|
| **持久化** | 写入数据库 event log | 不写入 |
| **重放** | 可重放（Session 恢复时） | 不可重放 |
| **schema version** | 有版本号，支持迁移 | 无版本 |
| **用途** | 状态变更（创建、完成、错误） | 流式进度（delta 增量） |
| **示例** | `step.ended`, `text.ended`, `tool.success` | `text.delta`, `reasoning.delta` |
| **传输方式** | SSE + 事件流 API | 仅 SSE |

**设计原理**: 流式增量事件（delta）频率高但信息冗余（完整文本在 ended 中已包含），持久化它们会膨胀数据库。重放时只需 ended 事件即可还原完整状态。

### 6.3 聚合根模式

Session 事件以 `sessionID` 为聚合根：

```typescript
durable: { aggregate: "sessionID", version: 1 }
```

- 同一 Session 的所有事件共享 `aggregateID = sessionID`
- 事件在聚合内按 `seq`（序列号）严格有序
- 投影单 Session 状态时，按 `seq` 升序重放所有该 Session 的事件
- 聚合根保证同一 Session 的事件处理是串行的

### 6.4 事件版本迁移

`durable.version` 用于 Schema 升级：

```typescript
// v1 事件
const options = { durable: { aggregate: "sessionID", version: 1 } }

// v2 事件（字段变更后）
const stepSettlementOptions = { durable: { aggregate: "sessionID", version: 2 } }
```

`Event.latest()` 按 type 去重，保留最高版本。数据库存储时带版本号，读取时按版本选择对应 codec。旧版本事件保留在 manifest 中以兼容历史数据。

---

## 7. 事件流全景图

```
SessionEvent
├── Agent/Model 切换
│   ├── agent.switched          (durable)
│   └── model.switched          (durable)
├── 生命周期
│   ├── moved                   (durable)
│   ├── prompted                (durable)
│   └── prompt.admitted         (durable)
├── Context
│   ├── context.updated         (durable)
│   └── synthetic               (durable)
├── Shell
│   ├── shell.started           (durable)
│   └── shell.ended             (durable)
├── Step (Provider Turn)
│   ├── step.started            (durable v1)
│   ├── step.ended              (durable v2)
│   └── step.failed             (durable v2)
├── Text
│   ├── text.started            (durable)
│   ├── text.delta              (live-only)
│   └── text.ended              (durable)
├── Reasoning
│   ├── reasoning.started       (durable)
│   ├── reasoning.delta         (live-only)
│   └── reasoning.ended         (durable)
├── Tool
│   ├── tool.input.started      (durable)
│   ├── tool.input.delta        (live-only)
│   ├── tool.input.ended        (durable)
│   ├── tool.called             (durable)
│   ├── tool.progress           (durable)
│   ├── tool.success            (durable)
│   └── tool.failed             (durable)
├── Retry
│   └── retried                 (durable)
├── Compaction
│   ├── compaction.started      (durable)
│   ├── compaction.delta        (live-only)
│   └── compaction.ended        (durable)
└── Revert
    ├── revert.staged           (durable)
    ├── revert.cleared          (durable)
    └── revert.committed        (durable)

ServerEvent (live-only)
├── server.connected
└── global.disposed

InstallationEvent (live-only)
├── installation.updated
└── installation.update-available

Permission Event
├── permission.v2.asked
└── permission.v2.replied

Todo Event
└── todo.updated
```

---

## 关键总结

1. **Event.define()** 是唯一的事件工厂，自动注入标准字段并生成完整 Schema + 静态元数据
2. **Event.inventory()** 冻结事件数组，用于编译 manifest
3. **Event.latest()** 去重取最高版本，支撑 schema 迁移
4. **Event.durable()** 过滤持久化事件，构建 DB write/read 所需的事件映射表
5. **Durable vs Live-Only**: Delta 事件不持久化，ended 事件是恢复会话的完整边界
6. **聚合根**: 所有 Session 事件以 `sessionID` 分组 + `seq` 排序
7. **Manifest 分层**: `SessionDurable` → `Durable` → `Definitions` → `ServerDefinitions`，按职责范围收窄
