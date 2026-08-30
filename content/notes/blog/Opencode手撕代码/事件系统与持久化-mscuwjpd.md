---
blog: true
title: "事件系统与持久化"
slug: "事件系统与持久化-mscuwjpd"
summary: "树节点：11 事件系统与持久化 父节点：11 Provider Turn完整流程 子节点：无 事件系统与持久化 OpenCode 的事件系统遵循 Event Sourcing PubSub 模式，是整个系统实时性与持久化的枢纽。Provider Turn 中的每一步（文本生成、工具调用、上下文更新）都通过事件总线广播，由 Projector 投影到数据库。 架构概览 核心文件 ： packages/core/src/event.ts —"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：11-事件系统与持久化
> 父节点：[[11-Provider-Turn完整流程]]
> 子节点：无

# 事件系统与持久化

OpenCode 的事件系统遵循 **Event Sourcing + PubSub** 模式，是整个系统实时性与持久化的枢纽。Provider Turn 中的每一步（文本生成、工具调用、上下文更新）都通过事件总线广播，由 Projector 投影到数据库。

---

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    EventV2.Service                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ publish() │  │subscribe()│  │ subscribe(durable) │  │
│  └─────┬─────┘  └─────┬────┘  └─────────┬─────────┘  │
│        │               │                 │            │
│  ┌─────▼─────┐   ┌────▼─────┐   ┌───────▼────────┐  │
│  │ PubSub    │   │ typed    │   │ durable         │  │
│  │   .all    │   │ PubSub   │   │  PubSub map     │  │
│  └───────────┘   │  map     │   └────────────────┘  │
│                  └──────────┘                        │
│  ┌──────────────────────────────────────────────┐    │
│  │            projectors (Map<type, fn[]>)       │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
   ┌──────────┐          ┌──────────────────┐
   │ EventTable│          │ SessionProjector │
   │ + Seq    │          │  (message-updater)│
   └──────────┘          └──────────────────┘
```

**核心文件**：
- `packages/core/src/event.ts` — EventBus 实现（639 行）
- `packages/schema/src/event.ts` — Event 类型定义
- `packages/schema/src/session-event.ts` — 所有 Session 事件定义
- `packages/core/src/session/projector.ts` — Session 事件投影器
- `packages/core/src/session/message-updater.ts` — 事件 → 消息结构更新

---

## EventBus 架构

### Interface 定义

**文件**：`packages/core/src/event.ts:126-148`

```typescript
export interface Interface {
  readonly publish: <D>(definition, data, options?) => Effect<Payload<D>>
  readonly subscribe: <D>(definition) => Stream<Payload<D>>
  readonly all: () => Stream<Payload>
  readonly durable: (input: { aggregateID, after? }) => Stream<Payload>
  readonly listen: (listener) => Effect<Unsubscribe>
  readonly project: <D>(definition, projector) => Effect<void>
  readonly replay: (event, options?) => Effect<void>
  readonly replayAll: (events, options?) => Effect<string | undefined>
  readonly remove: (aggregateID) => Effect<void>
  readonly claim: (aggregateID, ownerID) => Effect<void>
}
```

### PubSub 三层结构

**文件**：`packages/core/src/event.ts:173-178`

```typescript
const pubsub = {
  all: yield* PubSub.unbounded<Payload>(),          // 全局广播
  durable: new Map<string, Set<PubSub.PubSub<void>>>(), // 按 aggregateID 唤醒
  typed: new Map<string, PubSub.PubSub<Payload>>(),     // 按事件类型订阅
}
```

| 层 | 用途 | 消费者 |
|----|------|--------|
| `all` | 接收所有类型事件 | UI 全局监听、日志 |
| `typed` | 按事件类型精确订阅 | 功能模块（如某类型 projector） |
| `durable` | 按 aggregateID 订阅持久化事件流 | Session 事件流、工作区同步 |

---

## 事件定义系统

### Event.define

**文件**：`packages/schema/src/event.ts:42-70`

```typescript
export function define<const Type extends string, const Fields>(input: {
  readonly type: Type
  readonly durable?: { readonly version: number; readonly aggregate: string }
  readonly schema: Fields
}) { ... }
```

核心概念：

| 概念 | 说明 |
|------|------|
| `type` | 事件类型标识（如 `"session.next.text.delta"`） |
| `durable` | 标记为可持久化，指定 `aggregate` 字段名和 `version` |
| `schema` | 事件的 `data` 字段的 Schema |

### Durable vs Live-Only

```typescript
// packages/schema/src/session-event.ts:448-477
export const DurableDefinitions = Event.inventory(
  AgentSwitched, ModelSwitched, Prompted, PromptAdmitted,
  ContextUpdated, Shell.Started, Shell.Ended,
  Step.Started, Step.Ended, Step.Failed,
  Text.Started, Text.Ended,
  Tool.Input.Started, Tool.Input.Ended,
  Tool.Called, Tool.Progress, Tool.Success, Tool.Failed,
  Reasoning.Started, Reasoning.Ended,
  Compaction.Started, Compaction.Ended, ...
)
// Live-Only (非持久化)
export const Definitions = Event.inventory(
  ...DurableDefinitions,
  Text.Delta,       // 流式增量不持久化
  Reasoning.Delta,  // 流式增量不持久化
  Tool.Input.Delta, // 流式增量不持久化
  Compaction.Delta, // 流式增量不持久化
)
```

| 特性 | Durable Event | Live-Only Event |
|------|---------------|-----------------|
| 写入 `EventTable` | ✅ | ❌ |
| 写入 `EventSequenceTable` | ✅ | ❌ |
| 通过 `replay()` 重放 | ✅ | ❌ |
| 通过 `subscribe()` 接收 | ✅ | ✅ |
| UI 实时更新 | 可 | ✅ |
| 重启后可恢复 | ✅ | 丢失 |

典型用法：
- **Delta 事件**（`text.delta`、`reasoning.delta`）是 live-only，仅用于 UI 实时增量显示
- **Ended 事件**（`text.ended`、`reasoning.ended`）是 durable，携带完整值用于持久化和重放

---

## publish 流程

**文件**：`packages/core/src/event.ts:419-438`

```typescript
function publish<D>(definition, data, options?) {
  return Effect.gen(function* () {
    const location = options?.location ??
      Option.getOrUndefined(yield* Effect.serviceOption(Location.Service))
    return yield* publishEvent(definition, {
      id: options?.id ?? ID.create(),
      type: definition.type,
      ...(location ? { location } : {}),
      data,
    }, options?.commit)
  })
}
```

### Durable 事件的 commitDurableEvent

**文件**：`packages/core/src/event.ts:205-366`

```
commitDurableEvent(definition, event, input?, commit?)
  1. 从 event.data 中提取 aggregateID（如 sessionID）
  2. 在 DB 事务中：
     a. 查询 EventSequenceTable 获取当前 seq
     b. 验证 seq 连续性（严格递增）
     c. 验证事件 ID 不重复
     d. 执行所有 projector（同步，在事务内）
     e. 执行 commit hook（如 advance ContextEpoch snapshot）
     f. INSERT/UPDATE EventSequenceTable
     g. INSERT EventTable（type 使用 versionedType: "type.version"）
  3. 事务提交后 → PubSub.publish 唤醒 durable 订阅者
  4. 调用 notify(event, true) 广播到 all + typed PubSub
```

### 关键持久化表

```sql
EventSequenceTable:
  aggregate_id TEXT PRIMARY KEY
  seq          INTEGER NOT NULL
  owner_id     TEXT

EventTable:
  id           TEXT PRIMARY KEY
  aggregate_id TEXT NOT NULL
  seq          INTEGER NOT NULL
  type         TEXT NOT NULL   -- "session.next.text.ended.1"（含版本号）
  data         TEXT NOT NULL   -- JSON
```

---

## Projector 模式

**文件**：`packages/core/src/session/projector.ts`

### 注册

```typescript
// projector.ts:211-455
const layer = Layer.effectDiscard(Effect.gen(function* () {
  const events = yield* EventV2.Service
  yield* events.project(SessionV1.Event.Created, (event) =>
    db.insert(SessionTable).values(sessionRow(event.data.info))...)
  yield* events.project(SessionEvent.Prompted, (event) =>
    SessionInput.projectPrompted(db, ...) + run(db, event))
  yield* events.project(SessionEvent.Step.Started, (event) => run(db, event))
  yield* events.project(SessionEvent.Text.Delta, ...) // live-only, no persistence
  ...
}))
```

### project() 实现

**文件**：`packages/core/src/event.ts:615-619`

```typescript
const project = <D>(definition, projector) =>
  Effect.sync(() => {
    const list = projectors.get(definition.type) ?? []
    list.push((event) => projector(event as Payload<D>))
    projectors.set(definition.type, list)
  })
```

Projector 在 `commitDurableEvent` 的 **事务内同步执行**（`event.ts:320-322`），确保持久化事件的投影与原事件原子写入。

### 投影职责

每个事件类型的 projector 负责：

| 事件类型 | 投影操作 |
|----------|----------|
| `Created` / `Updated` | INSERT/UPDATE `SessionTable` |
| `Moved` | UPDATE directory + reset ContextEpoch |
| `Prompted` | 写 `SessionInputTable.promoted_seq` + append user message |
| `AgentSwitched` / `ModelSwitched` | UPDATE SessionTable + append 切换消息 |
| `Step.Started` / `Step.Ended` / `Step.Failed` | 创建/更新 assistant message |
| `Text.Started` / `Text.Delta` / `Text.Ended` | 追加/更新 text content |
| `Tool.*` | 创建/更新 tool state |
| `Compaction.Ended` | append compaction message |
| `RevertEvent.Committed` | DELETE 消息 + DELETE 输入 + reset ContextEpoch |

### MessageUpdater

**文件**：`packages/core/src/session/message-updater.ts:78-395`

```typescript
export function update(adapter: Adapter, event: SessionEvent.Event) {
  return Effect.gen(function* () {
    yield* SessionEvent.All.match(event, {
      "session.next.step.started": (event) => { /* append assistant */ },
      "session.next.text.started": (event) => { /* push text block */ },
      "session.next.text.delta": (event) => { /* append delta */ },
      "session.next.text.ended": (event) => { /* finalize text */ },
      "session.next.tool.called": (event) => { /* set tool running */ },
      "session.next.tool.success": (event) => { /* set tool completed */ },
      ...
    })
  })
}
```

- 使用 `immer` 的 `produce()` 进行不可变更新
- Adapter 接口抽象了存储后端（`packages/core/src/session/message-updater.ts:10-17`）：
  ```typescript
  export interface Adapter {
    readonly getCurrentAssistant: () => Effect<Assistant | undefined>
    readonly updateAssistant: (assistant: Assistant) => Effect<void>
    readonly appendMessage: (message: Message) => Effect<void>
    ...
  }
  ```
- 提供了 `memory()` 实现（`message-updater.ts:19-76`）用于内存中的消息管理
- Projector (`projector.ts:112-191`) 实现了基于 DB 的 Adapter

---

## 实时事件流

### durable() — 持久化事件流（含重放）

**文件**：`packages/core/src/event.ts:585-604`

```typescript
const durable = (input: { aggregateID; after? }): Stream<Payload> =>
  Stream.unwrap(Effect.gen(function* () {
    const wakes = yield* subscribeDurable(input.aggregateID)
    let sequence = input.after ?? -1
    const read = Effect.suspend(() => readAfter(input.aggregateID, sequence))
    const historical = yield* read
    const live = Stream.fromSubscription(wakes).pipe(
      Stream.mapEffect(() => read),
      Stream.flattenIterable,
    )
    return Stream.concat(Stream.fromIterable(historical), live)
  }))
```

- `after`：从指定 sequence 之后开始
- 先重放历史事件（`readAfter` → DB 查询 `seq > after`）
- 然后订阅 `durable PubSub`，有新事件时增量读取

这是 `GET /api/session/{sessionID}/events?after=N` 的底层实现。

### all() / subscribe() — 实时全局流

```typescript
const streamAll = (): Stream<Payload> => Stream.fromPubSub(pubsub.all)
const subscribe = <D>(definition): Stream<Payload<D>> =>
  Stream.unwrap(getOrCreate(definition).pipe(Effect.map(
    (pubsub) => Stream.fromPubSub(pubsub))))
```

- `all()` 接收所有类型的事件
- `subscribe(definition)` 按类型过滤
- 两者都**不包含历史重放**，仅实时事件

---

## 事件版本管理

### 版本化

**文件**：`packages/schema/src/event.ts:94-96`

```typescript
export function versionedType(type: string, version: number) {
  return `${type}.${version}`
}
```

- 持久化时使用 `"session.next.step.ended.2"` 格式
- 存储在 EventTable 的 `type` 列
- Durable 事件 Manifest（`packages/schema/src/durable-event-manifest.ts`）通过 `versionedType` 查找解码器

### latest() / durable() 筛选

```typescript
// schema/src/event.ts:76-108
export function latest(definitions)  // 去重，保留每个 type 的最高版本
export function durable(definitions) // 仅筛选有 durable 标记的事件
```

---

## 客户端集成

### SSE 事件流

客户端通过 `sessions.events({ sessionID, after })` 获取 SSE 流（基于 `EventV2.durable()`）：

```
GET /api/session/{sessionID}/events?after={seq}
→ SSE: data: {"type":"session.next.text.delta","data":{...}}\n\n
```

### TUI 事件系统

TUI 插件通过 `api.event` (TuiEventBus) 与 Core EventBus 交互：

**文件**：`packages/plugin/src/tui.ts:615`

```typescript
export type TuiPluginApi = {
  ...
  event: TuiEventBus    // TUI 层事件总线
  ...
}
```

---

## 完整事件类型一览

所有类型定义在 `packages/schema/src/session-event.ts:54-446`：

| 命名空间 | 事件 | Durable | 说明 |
|----------|------|---------|------|
| — | `AgentSwitched` | ✅ | Agent 切换 |
| — | `ModelSwitched` | ✅ | 模型切换 |
| — | `Moved` | ✅ | Session 目录移动 |
| — | `Prompted` | ✅ | Prompt 被提升到历史 |
| — | `PromptAdmitted` | ✅ | Prompt 被接纳（未提升） |
| — | `ContextUpdated` | ✅ | Mid-Conversation 上下文更新 |
| — | `Synthetic` | ✅ | 合成系统消息 |
| `Shell` | `Started` / `Ended` | ✅ | Shell 命令执行 |
| `Step` | `Started` / `Ended` / `Failed` | ✅ | Provider Turn 生命周期 |
| `Text` | `Started` / `Delta` / `Ended` | Delta:❌ | 流式文本生成 |
| `Reasoning` | `Started` / `Delta` / `Ended` | Delta:❌ | 推理过程（如 o1） |
| `Tool.Input` | `Started` / `Delta` / `Ended` | Delta:❌ | 工具参数流式输入 |
| `Tool` | `Called` / `Progress` / `Success` / `Failed` | ✅ | 工具执行生命周期 |
| — | `Retried` | ✅ | Provider 重试 |
| `Compaction` | `Started` / `Delta` / `Ended` | Delta:❌ | 对话压缩 |
| `RevertEvent` | `Staged` / `Cleared` / `Committed` | ✅ | 回滚操作 |

---

## UI 实时更新链路

```
LLM Provider 流式输出
  → llm.stream() Event
    → publish(LLMEvent) → createLLMEventPublisher
      → EventV2.publish(SessionEvent.Text.Delta)
        → PubSub.publish(pubsub.all) + PubSub.publish(pubsub.typed)
          → TuiEventBus 消费 → UI 增量渲染
        → (不写 DB，live-only)
    → publish(LLMEvent.textEnd)
      → EventV2.publish(SessionEvent.Text.Ended)
        → commitDurableEvent → DB 事务 + PubSub
          → Projector → SessionMessageUpdater → DB 写入完整文本
          → durable PubSub 唤醒 → SSE 客户端收到完整事件
```

---

## 相关文件索引

| 文件 | 内容 |
|------|------|
| `packages/core/src/event.ts` | EventBus 完整实现（publish, subscribe, durable stream, projector 管理） |
| `packages/schema/src/event.ts` | `Event.define`, `Payload`, `Definition` 类型 |
| `packages/schema/src/session-event.ts` | 所有 Session 事件定义（28 种事件类型） |
| `packages/schema/src/durable-event-manifest.ts` | 持久化事件版本索引 |
| `packages/core/src/session/event.ts` | Session 事件 re-export |
| `packages/core/src/session/projector.ts` | 事件 → DB 投影器（SessionProjector layer） |
| `packages/core/src/session/message-updater.ts` | 事件 → 消息结构更新逻辑 |
| `packages/core/src/event/sql.ts` | EventTable + EventSequenceTable 表定义 |
| `packages/core/src/session/runner/publish-llm-event.ts` | LLM原始事件 → SessionEvent 发布器 |
