---
blog: true
title: "05-Session创建与状态机"
slug: "05-session创建与状态机-mscun046"
summary: "树节点：05 Session创建与状态机 父节点：Opencode的工作原理 子节点：05 Context Epoch机制 | 05 Runner执行循环 | 05 Compaction与历史管理 | 05 会话输入与Prompt管理 1. Session 概述 Session 是 OpenCode 中最核心的持久化实体，代表一次完整的对话会话。每个 Session 拥有独立的 ID、project 归属、location（文件系统位置"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：05-Session创建与状态机
> 父节点：[[Opencode的工作原理]]
> 子节点：[[05-Context-Epoch机制]] | [[05-Runner执行循环]] | [[05-Compaction与历史管理]] | [[05-会话输入与Prompt管理]]

---

## 1. Session 概述

Session 是 OpenCode 中最核心的持久化实体，代表一次完整的对话会话。每个 Session 拥有独立的 ID、project 归属、location（文件系统位置）、消息历史和 Context Epoch 状态。

## 2. Session 数据模型

### 2.1 Schema 定义 (`Session.Info`)

`packages/schema/src/session.ts:19-44` 定义了 Session 的公共契约：

```ts
export const Info = Schema.Struct({
  id: ID,                           // 唯一标识
  parentID: ID.pipe(optional),      // 父 Session（fork 场景）
  projectID: Project.ID,            // 所属项目
  agent: Agent.ID.pipe(optional),   // 当前选中的 agent
  model: Model.Ref.pipe(optional),  // 当前选中的 model
  cost: Schema.Finite,              // 累计 cost
  tokens: Schema.Struct({           // token 统计
    input: Schema.Finite,
    output: Schema.Finite,
    reasoning: Schema.Finite,
    cache: Schema.Struct({ read: Schema.Finite, write: Schema.Finite }),
  }),
  time: Schema.Struct({
    created: DateTimeUtcFromMillis,
    updated: DateTimeUtcFromMillis,
    archived: DateTimeUtcFromMillis.pipe(optional),
  }),
  title: Schema.String,
  location: Location.Ref,           // 文件系统位置
  subpath: RelativePath.pipe(optional),
  revert: Revert.State.pipe(optional),
})
```

### 2.2 数据库表 (`session`)

`packages/core/src/session/sql.ts:22-66` 定义 Drizzle SQLite 表结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | text PK | Session 唯一标识 `SessionSchema.ID` |
| `project_id` | text FK → ProjectTable | 所属项目 |
| `workspace_id` | text | 工作区 ID |
| `parent_id` | text | 父 Session ID（fork） |
| `slug` | text | URL 友好简短标识 |
| `directory` | text | 文件系统目录（`DatabasePath.directoryColumn`） |
| `path` | text | 相对于 project 的子路径 |
| `title` | text | 会话标题 |
| `version` | text | OpenCode 安装版本 |
| `model` | json | 选中的模型 `{id, providerID, variant}` |
| `agent` | text | 选中的 agent |
| `cost` | real | 累计成本 |
| `tokens_*` | integer | 各类 token 计数 |
| `revert` | json | Revert 状态 |
| `permission` | json | 权限规则集 |
| `time_archived` | integer | 归档时间 |
| `time_compacting` | integer | 上次 compaction 时间 |

索引：`session_project_idx`、`session_workspace_idx`、`session_parent_idx`。

### 2.3 Row → Domain 映射

`packages/core/src/session/info.ts:14-49` 的 `fromRow()` 将数据库行映射为 `SessionSchema.Info`：

```ts
// info.ts:14-16
export function fromRow(row: typeof SessionTable.$inferSelect): SessionSchema.Info {
  return SessionSchema.Info.make({
    id: SessionSchema.ID.make(row.id),
    // ... 品牌类型封装、时间转换等
  })
}
```

## 3. Session 持久化层 (`SessionStore`)

`packages/core/src/session/store.ts:14-24` 定义了 Store 接口：

```ts
export interface Interface {
  readonly get: (sessionID) => Effect.Effect<SessionSchema.Info | undefined>
  readonly context: (sessionID) => Effect.Effect<SessionMessage.Message[], MessageDecodeError>
  readonly runnerContext: (sessionID, baselineSeq) => Effect.Effect<...>
  readonly message: (messageID) => Effect.Effect<{ sessionID; message } | undefined>
}
```

- **`get()`** (`store.ts:35-38`): 通过 `db.select().from(SessionTable).where(eq(...)).get()` 查询单行，不存在返回 `undefined`
- **`context()`** (`store.ts:39-41`): 委托给 `SessionHistory.load(db, sessionID)`，加载上下文消息
- **`runnerContext()`** (`store.ts:42-44`): 委托给 `SessionHistory.loadForRunner(db, sessionID, baselineSeq)`，Runner 专用
- **`message()`** (`store.ts:45-58`): 按 `messageID` 跨 Session 查询，返回 sessionID + 解码后的 message

`store.ts:28` 注册为全局 Layer Node：`const layer = Layer.effect(Service, ...)`，`store.ts:63` 导出：`export const node = makeGlobalNode({ service: Service, layer, deps: [Database.node] })`

## 4. Session 生命周期

### 4.1 创建 (Create)

`packages/core/src/session.ts:208-262` 的 `create()`:

1. **生成 ID** (`session.ts:209`): `input.id ?? SessionSchema.ID.create()`
2. **幂等检查** (`session.ts:210-211`): 如果 ID 已存在，直接返回已有 Session
3. **解析 Project** (`session.ts:212`): 通过 `projects.resolve(input.location.directory)` 找到所属项目
4. **写入 Project** (`session.ts:213-218`): `INSERT ... ON CONFLICT DO NOTHING` 确保 project 行存在
5. **构建 SessionInfo** (`session.ts:219-240`): 组装 `SessionV1.SessionInfo`
6. **发布事件** (`session.ts:241-258`): `events.publish(SessionV1.Event.Created, ...）`，若并发冲突返回已有 Session

### 4.2 状态机

Session 不存储显式状态字段（如 "running" / "idle"）。状态由 **进程内执行注册表** (`SessionExecution`) 决定：

`packages/core/src/session/execution.ts:9-18`:

```ts
export interface Interface {
  readonly active: Effect.Effect<ReadonlySet<SessionSchema.ID>>  // 进程内活跃 Session
  readonly resume: (sessionID) => Effect.Effect<void, RunError>  // 启动/加入执行
  readonly wake: (sessionID) => Effect.Effect<void>              // 注册新工作（可合并）
  readonly interrupt: (sessionID) => Effect.Effect<void>         // 中断活跃工作
}
```

**状态转换**：
```
create → [idle]
   ↓ prompt()
[idle] → wake() → [pending] → resume() → [running]
   ↓ compaction 完成 / 执行完成
[running] → [idle]
   ↓ interrupt()
[running] → [idle]（中断传播）
```

- **idle**: 无活跃 drain，`SessionExecution.active` 不包含该 Session
- **running**: 有活跃 drain，在 `active` 集合中
- **pending**: 有未提升的 prompt，通过 `wake()` 触发 drain

### 4.3 Prompt 提交

`packages/core/src/session.ts:360-386` 的 `prompt()`:

```ts
prompt: Effect.fn("V2Session.prompt")((input) =>
  Effect.uninterruptible(
    Effect.gen(function* () {
      yield* result.get(input.sessionID)              // 验证 Session 存在
      const messageID = input.id ?? SessionMessage.ID.create()
      const delivery = input.delivery ?? "steer"      // steer 或 queue
      const admitted = yield* SessionInput.admit(...)  // 持久化输入行
      if (!SessionInput.equivalent(admitted, expected)) // 验证一致性
        return yield* new PromptConflictError(...)
      if (input.resume !== false) yield* execution.wake(admitted.sessionID) // 唤醒执行
      return admitted
    }),
  ),
),
```

`input.resume` 默认为 `true`（prompt + 自动唤醒），传 `false` 实现 "admit-only"。

### 4.4 中断 (Interrupt)

`packages/core/src/session.ts:430-432`:

```ts
interrupt: Effect.fn("V2Session.interrupt")((sessionID) =>
  Effect.uninterruptible(execution.interrupt(sessionID)),
),
```

中断是幂等的：idle Session 的中断是 no-op；仅中断本进程拥有的活跃 Session。

### 4.5 列出 (List)

`packages/core/src/session.ts:268-303` 的 `list()` 支持：

- **按目录**: `eq(SessionTable.directory, input.directory)`
- **按 workspace**: `eq(SessionTable.workspace_id, ...)`
- **按 project + subpath**: `eq(SessionTable.project_id, ...)`
- **搜索**: `like(SessionTable.title, ...)`
- **游标分页**: `ListAnchor`（`{ id, time, direction }`），按 `time_created` + `id` 排序
- **方向反转**: `direction === "previous"` 时反转排序并反转结果

## 5. Session 输入管理

`packages/core/src/session/input.ts` 管理 `session_input` 表：

`packages/core/src/session/sql.ts:140-166` 的表结构：

| 字段 | 说明 |
|------|------|
| `id` | PK，消息 ID |
| `session_id` | FK → SessionTable |
| `prompt` | JSON，Prompt 内容 |
| `delivery` | `"steer"` 或 `"queue"` |
| `admitted_seq` | 持久化时的 event sequence |
| `promoted_seq` | 提升为可见消息时的 sequence（null = 未提升） |
| `time_created` | 创建时间戳 |

**关键操作**：

- **`admit()`** (`input.ts:41-81`): 通过 `events.publish(SessionEvent.PromptAdmitted, ...)` 持久化输入，返回 `Admitted`（含 `admittedSeq`）
- **`hasPending()`** (`input.ts:170-189`): 查询是否有未提升的特定 delivery 类型的输入
- **`promoteSteers()`** (`input.ts:245-266`): 批量提升所有 `delivery="steer"` 且 `admitted_seq ≤ cutoff` 的未提升输入
- **`promoteNextQueued()`** (`input.ts:268-288`): 提升下一个 `delivery="queue"` 的输入（一次一个）

## 6. 关键关联

- **[[05-Context-Epoch机制]]**: Session 持有 `session_context_epoch` 行，epoch 随 compaction 替换
- **[[05-Runner执行循环]]**: `SessionExecution.resume()` 触发 Runner drain
- **[[05-会话输入与Prompt管理]]**: Prompt 的 admit / promote 机制
- **[[10-快照创建与存储]]**: Revert / Snapshot 功能
- **[[11-Provider-Turn完整流程]]**: Session 是 Provider Turn 的容器
