---
blog: true
title: "04-Server请求处理：HTTP → Core 的桥接层"
slug: "04-server请求处理-http-core-的桥接层-mscuwizn"
summary: "树节点：04 Server请求处理 父节点：04 全链路概览 子节点：无 04 Server请求处理：HTTP → Core 的桥接层 Server 包负责将 HTTP 请求路由到 Core 层的领域操作，使用 Effect HttpApi 框架定义类型安全的 API 端点。 一、路由组装 — routes.ts 文件 : packages/server/src/routes.ts (64 行) 两个入口 ( :39 49 )： cre"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：04-Server请求处理
> 父节点：[[04-全链路概览]]
> 子节点：无

# 04-Server请求处理：HTTP → Core 的桥接层

Server 包负责将 HTTP 请求路由到 Core 层的领域操作，使用 Effect HttpApi 框架定义类型安全的 API 端点。

---

## 一、路由组装 — routes.ts

**文件**: `packages/server/src/routes.ts` (64 行)

```ts
// routes.ts:39-65
function makeRoutes(auth) {
  const serviceLayer = AppNodeBuilder.build(applicationServices, [
    [SessionExecution.node, SessionExecutionLocal.node]
  ])

  return HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(handlers),          // 18 个 handler 实现
    Layer.provide(sessionLocationLayer),  // Session → Location 解析中间件
    Layer.provide(locationLayer),     // Location 中间件
    Layer.provide(authorizationLayer),    // Basic Auth 中间件
    Layer.provide(schemaErrorLayer),  // Schema 错误 → HTTP 400 中间件
    Layer.provide(auth),              // Auth 配置（密码或空凭证）
    Layer.provide(serviceLayer),      // 所有 Core 服务
  )
}
```

**两个入口** (`:39-49`)：
- `createRoutes(password?)` — 网络 Server 模式，可选 Basic Auth
- `createEmbeddedRoutes()` — 嵌入式 Server 模式，无认证（`password: Option.none()`）

**服务层** (`:26-37`)：注册了 `Database`、`EventV2`、`SessionV2`、`PermissionSaved`、`PtyTicket`、`Credential`、`ToolOutputStore.cleanupNode` 等核心服务节点。

---

## 二、API 定义 — api.ts

**文件**: `packages/server/src/api.ts` (8 行) → 委托给 `packages/protocol/src/api.ts`

```ts
// api.ts:5-8
export const Api = makeDefaultApi({
  locationMiddleware: LocationMiddleware,
  sessionLocationMiddleware: SessionLocationMiddleware,
})
```

**`makeDefaultApi()`** (`protocol/src/api.ts:78-86`) 调用 `makeApiFromGroup()` (`:26-64`)，该函数按顺序添加所有 Group：

| Group | 中间件 | 用途 |
|-------|--------|------|
| `HealthGroup` | - | `/api/health` |
| `LocationGroup` | location | 位置信息 |
| `SessionGroup` | sessionLocation | Session CRUD、prompt、switchAgent/Model、compact、wait、interrupt |
| `MessageGroup` | sessionLocation | 消息列表/单条/上下文 |
| `ModelGroup` | location | 模型列表/解析 |
| `ProviderGroup` | location | 提供商信息 |
| `IntegrationGroup` | location | 集成（OAuth 等） |
| `CredentialGroup` | location | 凭证管理 |
| `PermissionGroup` | location + sessionLocation | 权限请求 |
| `FileSystemGroup` | location | 文件浏览/操作 |
| `CommandGroup` | location | 命令支持 |
| `SkillGroup` | location | 技能/插件 |
| `EventGroup` | - | 事件流（SSE） |
| `PtyGroup` | location | 终端连接 |
| `QuestionGroup` | location + sessionLocation | 用户确认请求 |
| `ReferenceGroup` | location | 参考文件 |
| `ProjectCopyGroup` | location | 项目复制 |

全局中间件：`Authorization`（Basic Auth）和 `SchemaErrorMiddleware`（Schema 错误 → 400）。

---

## 三、Handlers 文件清单

**文件**: `packages/server/src/handlers.ts` (40 行)

`handlers` 常量使用 `Layer.mergeAll()` 合并 18 个 handler layer：

| Handler 文件 | 包内路径 | 关键端点 |
|-------------|---------|---------|
| `health.ts` | `handlers/` | `GET /api/health` |
| `location.ts` | `handlers/` | 当前 Location 信息 |
| `agent.ts` | `handlers/` | Agent 列表/选择 |
| `session.ts` | `handlers/` | CRUD、`prompt`、`switchAgent`、`switchModel`、`compact`、`wait`、`interrupt`、`context`、`fork` |
| `message.ts` | `handlers/` | 消息分页列表 (`session.messages`)、单条 (`session.message`) |
| `model.ts` | `handlers/` | 模型解析 |
| `provider.ts` | `handlers/` | 提供商配置 |
| `integration.ts` | `handlers/` | OAuth 集成 |
| `credential.ts` | `handlers/` | 凭证 CRUD |
| `permission.ts` | `handlers/` | 权限请求响应 |
| `fs.ts` | `handlers/` | 文件系统操作 |
| `command.ts` | `handlers/` | 命令建议 |
| `skill.ts` | `handlers/` | 技能列表 |
| `event.ts` | `handlers/` | SSE 事件流 |
| `pty.ts` | `handlers/` | PTY 终端 |
| `question.ts` | `handlers/` | 用户确认 |
| `reference.ts` | `handlers/` | 参考上下文 |
| `project-copy.ts` | `handlers/` | 项目快照 |

### 核心 Handler 详解

**SessionHandler** (`handlers/session.ts:19-385`)：
- `session.list` (:24-66)：分页列表，支持 cursor、workspace 过滤
- `session.create` (:67-79)：创建新 Session
- `session.get` (:91-106)：获取单个 Session 详情
- `session.switchAgent` (:108-122)：切换 Agent → `SessionV2.switchAgent()`
- `session.switchModel` (:124-138)：切换 Model → `SessionV2.switchModel()`
- `session.prompt` (:140-171)：**核心端点**，调用 `session.prompt()` → `SessionInput.admit()` + `SessionExecution.wake()`
- `session.compact` (:173-195)：手动触发压缩
- `session.wait` (:197-218)：阻塞直到 Session 空闲
- `session.interrupt` (:219-233)：中断活跃的 drain
- `session.context` (:234-248)：获取上下文消息列表
- `session.fork` (:249-263)：Fork Session
- `session.events` (:264-...)：SSE 事件流

**MessageHandler** (`handlers/message.ts:27-80`)：
- `session.messages` (:32-79)：分页消息列表，支持 cursor 翻页
- `session.message` (:81)（在文件末尾）

所有 handler 都使用 `Effect.fn()` 包装，返回 `HttpApiBuilder.group(Api, ...)` 注册的 Effect 程序。

---

## 四、协议定义 — Protocol 包

**目录**: `packages/protocol/src/`

Protocol 包定义 HTTP API 的**类型契约**（不包含实现），由 Server 和 SDK 两端共享。

### 分组文件 (`groups/`)

每个 Group 使用 Effect HttpApi 的 `HttpApiGroup.make()` 定义端点：

| 分组文件 | 主要端点 ID |
|---------|-----------|
| `session.ts` | `session.list`, `.create`, `.get`, `.switchAgent`, `.switchModel`, `.prompt`, `.compact`, `.wait`, `.interrupt`, `.context`, `.fork`, `.events` |
| `message.ts` | `session.messages`, `session.message` |
| `model.ts` | `model.list`, `model.resolve` |
| `provider.ts` | `provider.list` |
| `event.ts` | `session.events.subscribe`（SSE 端点） |
| `fs.ts` | `fs.stat`, `.read`, `.list`, `.search`, `.write`, `.createDir` |
| `command.ts` | `command.list`, `.autocomplete` |
| `skill.ts` | `skill.list` |
| `health.ts` | `health.check` |
| `pty.ts` | `pty.connect` |
| `question.ts` | `question.get`, `.answer` |
| `permission.ts` | `permission.list`, `.grant`, `.deny` |
| `integration.ts` | `integration.get` |
| `credential.ts` | `credential.list`, `.get` |
| `agent.ts` | `agent.list` |
| `project-copy.ts` | `project-copy.create` |
| `reference.ts` | `reference.list` |
| `location.ts` | `location.get` |

### Session Group 详解 (`groups/session.ts`)

**端点定义** (`:100+`)：
- `session.prompt` 的 Schema：
  - Path: `sessionID`
  - Body (payload): `PromptInput`，包含 `id`、`prompt`、`delivery`、`resume`
  - Query: `directory`、`workspace`
  - Errors: `SessionNotFoundError`、`InvalidRequestError`、`UnauthorizedError`

**SessionsCursor** (`:65-81`)：不透明分页游标，内部编码了 `directory`/`project`/`workspace` 过滤条件 + 锚点。只通过 Base64Url 编码传输，消费者不解析内部结构。

### 错误定义 (`errors.ts`)

`packages/protocol/src/errors.ts` (111 行) — 使用 Effect Schema 的 `TaggedErrorClass`：

| 错误类 | HTTP 状态码 | 用途 |
|--------|-----------|------|
| `InvalidRequestError` | 400 | 参数验证失败 |
| `UnauthorizedError` | 401 | 认证失败 |
| `ForbiddenError` | 403 | 权限不足 |
| `SessionNotFoundError` | 404 | Session 不存在 |
| `MessageNotFoundError` | 404 | Message 不存在 |
| `ProviderNotFoundError` | 404 | Provider 不存在 |
| `PermissionNotFoundError` | 404 | 权限请求不存在 |
| `QuestionNotFoundError` | 404 | 确认请求不存在 |
| `PtyNotFoundError` | 404 | PTY 不存在 |
| `InvalidCursorError` | 400 | 游标无效 |
| `ConflictError` | 409 | 资源冲突（如 prompt ID 冲突） |
| `ServiceUnavailableError` | 503 | 操作不可用 |
| `UnknownError` | 500 | 未分类错误 |

---

## 五、中间件系统

**目录**: `packages/server/src/middleware/`

### Authorization (`authorization.ts`)

`packages/server/src/middleware/authorization.ts` (58 行)

- 实现 Basic Auth 验证（也支持 `?auth_token=` query 参数）
- 当 `ServerAuth.required(config)` 为 false（嵌入式模式）→ 直接放行
- PTY WebSocket 升级请求（带 ticket URL）跳过认证
- 失败时返回 `UnauthorizedError`，设置 `WWW-Authenticate` 头

### Session Location (`session-location.ts`)

`packages/server/src/middleware/session-location.ts` (67 行)

- 解析路由参数中的 `sessionID`
- 查询 `SessionTable` 获取 Session 的 `directory` 和 `workspaceID`
- 通过 `LocationServiceMap` 获取 Session 所在 Location 的服务层
- 将 Location 服务注入到后续 handler 的 Effect 环境中

**这是关键中间件**：它确保 session 操作（prompt、switch、compact 等）在正确的 Location（目录）上下文中执行，使 Runner 可以通过 `Location.Service` 获取当前目录的配置。

### Schema Error (`schema-error.ts`)

将 Schema 解码错误映射为 HTTP 400 `InvalidRequestError`。

---

## 六、HTTP → Core 的映射关系

```
HTTP Request                              Core 操作
────────────────────────                ──────────────────
POST /session/{id}/message    →  SessionV2.Service.prompt()
                               →  SessionInput.admit(db, events, {...})
                               →  SessionExecution.wake(sessionID)
                               →  SessionRunCoordinator.wake()

POST /session/{id}/switchAgent → SessionV2.Service.switchAgent()
POST /session/{id}/switchModel → SessionV2.Service.switchModel()
POST /session/{id}/compact     → SessionV2.Service.compact()
POST /session/{id}/wait        → SessionV2.Service.wait()
POST /session/{id}/interrupt   → SessionExecution.interrupt() → RunCoordinator.interrupt()
GET  /session/{id}/context     → SessionStore.context() → SessionHistory.load()

GET  /session/events           → EventV2 stream (SSE)
GET  /api/health               → 进程 ID + 健康状态
```

---

## 七、关键文件索引

| 文件 | 行数 | 说明 |
|------|------|------|
| `packages/server/src/routes.ts` | 64 | 路由组装 + 服务依赖注入 |
| `packages/server/src/api.ts` | 8 | API 实例创建 |
| `packages/server/src/handlers.ts` | 40 | Handler 合并 |
| `packages/server/src/handlers/session.ts` | 385 | Session 全部端点 |
| `packages/server/src/handlers/message.ts` | 81 | 消息端点 |
| `packages/server/src/middleware/authorization.ts` | 58 | Basic Auth |
| `packages/server/src/middleware/session-location.ts` | 67 | Session → Location 解析 |
| `packages/protocol/src/api.ts` | 86 | Group 注册 |
| `packages/protocol/src/errors.ts` | 111 | 错误类型定义 |
| `packages/protocol/src/groups/session.ts` | 379 | Session 端点 Schema |
| `packages/protocol/src/groups/message.ts` | - | Message 端点 Schema |
| `packages/protocol/src/groups/event.ts` | - | SSE 端点 Schema |
