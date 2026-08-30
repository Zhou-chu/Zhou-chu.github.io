---
blog: true
title: "06 — 客户端架构与包依赖 (Client Architecture & Package Dependencies)"
slug: "06-客户端架构与包依赖-client-architecture-package-dependencies-mscuwjph"
summary: "06 — 客户端架构与包依赖 (Client Architecture & Package Dependencies) OpenCode 的客户端层采用双轨策略（网络 SDK 嵌入式宿主），由四层单向依赖约束驱动，通过代码生成保持一致性。 1. 四层单向依赖 (Four Layer Unidirectional Dependency) OpenCode 的包之间遵循严格的菱形依赖拓扑：Schema 是唯一的数据契约根基，Core 和 P"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 06 — 客户端架构与包依赖 (Client Architecture & Package Dependencies)

OpenCode 的客户端层采用双轨策略（网络 SDK + 嵌入式宿主），由四层单向依赖约束驱动，通过代码生成保持一致性。

---

## 1. 四层单向依赖 (Four-Layer Unidirectional Dependency)

OpenCode 的包之间遵循严格的菱形依赖拓扑：Schema 是唯一的数据契约根基，Core 和 Protocol 各自独立依赖 Schema，互不依赖对方；Server 同时依赖 Core 和 Protocol；Client 仅依赖 Schema 和 Protocol（绝不依赖 Core 或 Server）；sdk-next 是唯一同时组合 Client、Core 和 Server 的包。

📌 *"Keep runtime dependencies directed from Schema to Core and Protocol, then from Core and Protocol to Server. Client runtime code may depend on Schema and Protocol but never Core or Server; sdk-next composes Client, Core, and Server."* — `opencode-dev-new/AGENTS.md`

### 1.1 依赖图

```
                        ┌──────────────────┐
                        │     schema        │  ← 纯数据契约（零副作用）
                        │  (共享类型定义)    │
                        └──┬───────────┬───┘
                           │           │
              ┌────────────┘           └────────────┐
              ▼                                     ▼
   ┌──────────────────────┐            ┌──────────────────────┐
   │         core          │            │       protocol        │
   │    (领域逻辑中枢)      │            │  (HTTP 路由 + 错误)   │
   │ 依赖：schema+protocol │            │ 依赖：schema（仅）    │
   │       +llm+plugin     │            │ 拥有：endpoint groups │
   │ Session/工具/权限/DB  │            │       错误类型/游标    │
   └──────────┬───────────┘            └──────────┬───────────┘
              │                                   │
              │        ┌──────────────────────────┘
              │        │
              ▼        ▼
   ┌──────────────────────────────────────────────────────┐
   │                      server                          │
   │          依赖：core + protocol（钻石合流点）           │
   │          拥有：concrete handlers / routes             │
   │                middleware keys / runtime wiring       │
   └─────┬────────────────────┬──────────────────────┬────┘
         │                    │                      │
         ▼                    ▼                      ▼
   ┌───────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ opencode   │    │     client       │    │    sdk-next      │
   │(CLI/TUI)   │    │ (Promise+Effect) │    │  (嵌入式宿主)    │
   │依赖：      │    │ 依赖：           │    │ 依赖：           │
   │server+core │    │ schema+protocol  │    │ client+core      │
   │+llm+client │    │ (零 Core/Server) │    │ +server          │
   └───────────┘    └──────────────────┘    └──────────────────┘
                                              ↑ 唯一组合三者

依赖方向：上 → 下（上层依赖下层，反向禁止）
关键约束：
  Schema  →  Core         （Core 消费 Schema 类型）
  Schema  →  Protocol      （Protocol 消费 Schema 类型，不依赖 Core）
  Core + Protocol  →  Server  （Server 同时组合两者——菱形合流）
  Schema + Protocol  →  client   （Client 零 Core 依赖，浏览器安全）
  client + Core + Server  →  sdk-next  （唯一同时组合三者的包）
```

### 1.2 各层职责

**第 1 层：Schema（`@opencode-ai/schema`）**

| 维度 | 说明 |
|------|------|
| 定位 | 纯数据契约，零运行时副作用，浏览器安全 |
| 内容 | Session、Permission、Question 等共享 Schema 类型 |
| 依赖 | 仅 `effect`（Effect-TS 的 Schema 模块） |
| 约束 | 不执行 I/O，不读取文件，不访问数据库 |
| 示例类型 | `SessionId`、`AgentInfo`、`PermissionRule`、`Location` |

📌 *"Semantic values that mean the same thing internally and publicly live in the lightweight Schema leaf. Core consumes Schema for domain behavior; Protocol composes Schema values into paths, payloads, envelopes, errors, cursors, and streams."*

**第 2 层：Protocol（`@opencode-ai/protocol`）**

| 维度 | 说明 |
|------|------|
| 定位 | HTTP 路由定义层，组合 Schema 值到 HTTP 语义 |
| 内容 | 18 个 endpoint group 定义（`packages/protocol/src/groups/`）——session、message、model、provider、permission、skill、event、agent、health、pty、question、reference、location、integration、credential、command、fs、project-copy；共享错误类型（`packages/protocol/src/errors.ts`）——`SessionNotFoundError`、`MessageNotFoundError`、`InvalidCursorError` 等 11 个 tagged error；游标、流、信封包装定义 |
| 依赖 | 仅 Schema + `effect`（不依赖 Core） |
| 约束 | 拥有端点构造和中间件布置（middleware placement），但不实现具体处理逻辑 |

📌 *"Protocol owns middleware placement, while Server injects concrete keys so Core service identities stay downstream."* — `packages/protocol/src/api.ts`

**第 3 层：Core（`@opencode-ai/core`）**

| 维度 | 说明 |
|------|------|
| 定位 | 领域逻辑中枢 |
| 内容 | Session 生命周期、System Context 代数、工具注册与结算、权限检查、数据库持久化（Drizzle + SQLite）、文件系统管理、PTY 管理 |
| 依赖 | Schema + Protocol + LLM + Plugin |
| 约束 | 包含所有副作用实现（DB、FS、PTY），但不启动 HTTP 服务 |

📌 *"Core consumes Schema for domain behavior. Shared public records are plain objects declared with Schema.Struct."*

**第 4 层：Server（`@opencode-ai/server`）**

| 维度 | 说明 |
|------|------|
| 定位 | HTTP API 实现，组装 Protocol 路由与 Core 服务 |
| 内容 | 18 个 concrete handler 实现（`packages/server/src/handlers/`）——每个 Protocol group 对应一个 handler；`packages/server/src/api.ts` 调用 Protocol 的 `makeDefaultApi(...)` 注入 concrete middleware keys；`packages/server/src/routes.ts` 将 handlers + services + auth layers 组装为 `HttpApiBuilder.layer` |
| 依赖 | Core + Protocol |
| 约束 | 作为权威 `HttpApi` 供 Client 代码生成；不拥有 endpoint group 定义（归 Protocol） |

📌 *"Server supplies concrete middleware keys to produce the authoritative build-time API; the client projection supplies transport-only keys without importing Core or Server at runtime."*

### 1.3 关键约束：Client 的依赖边界

这是整个架构中最关键的约束：

📌 *"Keep additional public schemas in Schema and additional network groups in Protocol; neither package may transitively load databases, Drizzle, Session execution, providers, watchers, native modules, or WASM."*

```
Client 运行时依赖：
  ✅ Schema   — 纯类型和数据契约
  ✅ Protocol — HTTP 路由和载荷结构
  ❌ Core     — 不允许（包含 DB、FS、PTY 等副作用）
  ❌ Server   — 不允许（包含 HTTP 服务器实现）
  ❌ Drizzle  — 不允许（数据库驱动器，非浏览器安全）
  ❌ Native   — 不允许（原生模块，非浏览器安全）
```

这保证了 `@opencode-ai/client` 可以打包为**纯浏览器安全**的 npm 包，零 Node.js 原生依赖。

**代码生成边界**：Client 在 `devDependencies` 中依赖 Core、Server 和 `@opencode-ai/httpapi-codegen`，但这些是**纯构建时依赖**——代码生成器读取 Server 的权威 `HttpApi` 生成 Client，生成的运行时代码仅从 Schema 和 Protocol 导入。通过 `import-boundaries` 测试验证 Client 不导入 Core/Server 运行时模块。

---

## 2. Client vs SDK-Next 双轨策略

OpenCode 提供两种消费模式：网络客户端和嵌入式宿主。

### 2.1 对比总览

| 维度 | Client (`@opencode-ai/client`) | SDK-Next (`@opencode-ai/sdk-next`) |
|------|-------------------------------|-------------------------------------|
| **传输方式** | 网络 HTTP（fetch） | 内存 HTTP（`HttpClient` 抽象） |
| **运行时** | 浏览器 + Node.js | Node.js（Effect 原生） |
| **依赖范围** | Schema + Protocol | Client + Core + Server |
| **依赖 Effect** | 仅 `/effect` 导出 | 全量 Effect |
| **入口模式** | 双入口：根（零 Effect）+ `/effect` | 单一入口 |
| **网络 I/O** | 真实 HTTP 请求 | 无网络 I/O（内存路由） |
| **服务启动** | 不启动服务 | 在内存中执行 Server 的 `HttpRouter` |
| **额外能力** | 无 | 同进程能力（文件系统、PTY 等） |

### 2.2 Client：纯网络客户端

📌 *"OpenCode Client: The generated Promise and Effect APIs derived from the public HttpApi; Embedded OpenCode shares the Effect API through an in-memory HttpClient against the same router and handlers."*

Client 从 Server 的权威 `HttpApi` 代码生成，暴露两大入口：

```
@opencode-ai/client          ← 根入口：Promise API，零 Effect 依赖
@opencode-ai/client/effect   ← /effect 入口：Effect API，依赖 Effect + Schema + Protocol
```

📌 *"The root Promise client remains zero-Effect, /effect depends on Effect plus Schema and Protocol, and @opencode-ai/sdk-next composes the scoped in-process host above Client, Core, and Server."*

**公共 API 操作**（两个入口共享的操作语义）：

| 操作 | 签名 | 说明 |
|------|------|------|
| `sessions.create({ location? })` | → `Session` | 创建 Session，可选指定 Location |
| `sessions.prompt({ sessionID, ... }, { resume? })` | → `Admission` | 提交 prompt；`resume: false` 仅持久化不唤醒 |
| `sessions.list(...)` | → `Page<Session>` | 分页列出 Session |
| `sessions.messages({ sessionID, ... })` | → `Page<Message>` | 分页获取 Session 消息 |
| `sessions.message({ sessionID, messageID })` | → `Message` | 资源查找；不存在时抛 `MessageNotFoundError` |
| `sessions.context({ sessionID })` | → `Message[]` | 获取当前上下文消息 |
| `sessions.switchAgent({ sessionID, agent })` | → `void` | 切换 Agent |
| `sessions.switchModel({ sessionID, model })` | → `void` | 切换 Model |
| `sessions.active()` | → `Record<SessionID, { type: "running" }>` | 当前进程活跃 drain 快照 |
| `sessions.interrupt({ sessionID })` | → `void` | 中断 Session（幂等） |
| `sessions.events({ sessionID, after? })` | → `Stream<Event>` | 持久 Session 事件流 |
| `events.subscribe()` | → `Stream<Event>` | 实例级实时事件流 |

另有辅助 API 组：`agents`、`models`、`providers`、`permissions`、`files`、`skills`、`ptys`、`questions`、`integrations`、`credentials`、`commands`、`references`、`projectCopies`、`health`、`location`——共 17 个 API 组，映射自 Server 的 17 个 client 可见 group（contract.ts 定义映射规则）。

### 2.3 SDK-Next：嵌入式宿主

📌 *"Embedded OpenCode: A scoped in-process host that structurally extends the OpenCode Client, supplies an in-memory HTTP transport, and exposes additional same-process capabilities directly."*

SDK-Next 是整个架构中**唯一同时组合 Client、Core 和 Server 的包**：

```
SDK-Next 组合关系：
  sdk-next
    ├── 复用 Client 的公共 API（通过内存 HttpClient）
    ├── 组合 Core 的领域逻辑（Session 生命周期、System Context 等）
    └── 嵌入 Server 的 HttpRouter（不开端口，不走网络）
```

📌 *"SDK executes Server's assembled HttpRouter in memory. It opens no listener and performs no network I/O, while preserving Server routing, middleware, codecs, handlers, and errors."*

**内存路由模式**（`src/opencode.ts`）：

```
1. 构建真实 Server 路由 → createEmbeddedRoutes() from @opencode-ai/server
2. 转为 Web Handler         → HttpRouter.toWebHandler()（不开端口，不进行网络 I/O）
3. 创建本地 fetch           → 路由到内存中的 web handler
4. 包装网络 Client           → OpenCode.make({ baseUrl }) 但注入本地 fetch
5. 扩展 API                 → 附加 tools.register(...) 能力
```

结果：所有标准 HTTP 操作（`sessions.create`、`sessions.events` 等）经过**完全相同的路由、中间件、codec、处理器和错误**——只是不走 socket。

**关键特性**：
- `tools.register(...)` — 仅有的网络 Client 不具备的额外能力。取代了旧的 `@opencode-ai/core/public` facade。
  📌 *"It also exports Tool and exposes local-only tools.register(...), replacing the former @opencode-ai/core/public facade."* — `packages/sdk-next/README.md`
  工具通过 Core 的主机级 `ApplicationTools` 服务注册，跨所有 Location 共享
- `OpenCode.layer` — Effect Layer 形式暴露，支持依赖注入
- 作用域化资源管理 — 关闭 Effect Scope 时释放路由资源、Location 服务、fiber 和作用域工具注册
- `import-boundaries` 测试验证 sdk-next 确实从 Client、Core 和 Server 三个包拉取源码

---

## 3. Promise vs Effect 发射器

代码生成系统支持两种目标运行时，共享同一份 SDK Contract IR。

### 3.1 架构对比

```
                  ┌─────────────────────┐
                  │   HttpApi (Server)   │  ← 权威源
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   SDK Contract IR    │  ← 编译中间表示
                  └──────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   ┌──────────────────┐          ┌──────────────────┐
   │  Promise Emitter  │          │  Effect Emitter  │
   │  (零 Effect 依赖)  │          │  (全 Effect 类型) │
   └──────────────────┘          └──────────────────┘
              │                             │
              ▼                             ▼
   @opencode-ai/client         @opencode-ai/client/effect
   (根入口，浏览器安全)          (/effect 入口)
```

### 3.2 Promise 客户端

📌 *"Promise client construction is synchronous and network-free. It requires baseUrl, defaults to globalThis.fetch, accepts client-level headers, and merges them with per-call header overrides."*

| 特性 | 行为 |
|------|------|
| **构造** | 同步构造，无网络请求。接受 `baseUrl` + 可选 headers |
| **类型安全** | 解析响应语法，信任生成的类型。不做运行时结构校验 |
| **错误模型** | 声明的领域错误 + `ClientError`（基础设施错误） |
| **流式传输** | 返回 lazy `AsyncIterable`，非 Promise 包裹的流对象 |
| **取消** | 通过 `AbortSignal` 控制 |
| **依赖** | 零 Effect，零 Core，浏览器安全 |

📌 *"The first Promise emitter parses response syntax and trusts its generated structural types; it does not perform runtime structural validation. Malformed payload syntax fails, while a syntactically valid shape mismatch is not detected at the SDK boundary."*

**Promise 错误分类**：

```
声明的领域错误（tagged structural wire values）
  ├── SessionNotFoundError
  ├── MessageNotFoundError
  └── ...（其他业务错误）

基础设施错误（ClientError）
  ├── transport failure
  ├── unexpected status
  ├── unsupported content type
  └── malformed response
```

📌 *"Promise methods reject with either a tagged declared domain failure or ClientError, matching the Effect client's conceptual domain/infrastructure error division."*

**流式 API**：

📌 *"Promise streaming methods return a lazy AsyncIterable directly rather than a Promise-wrapped stream object. Iteration opens the connection, AbortSignal cancels it, and ending iteration closes the underlying request."*

`AsyncIterable` 的 SSE 连接在第一次 `next()` 调用时建立，在迭代结束时关闭。不会自动重连，消费者负责刷新和重新订阅。

### 3.3 Effect 客户端

📌 *"Effect client construction accepts an explicit baseUrl and obtains HttpClient.HttpClient from the Effect environment. It does not install fetch or duplicate per-call transport policy; callers transform/provide the client for headers, tracing, retries, recording, and tests, while fiber interruption owns cancellation."*

| 特性 | 行为 |
|------|------|
| **构造** | 接受 `baseUrl`，`HttpClient` 来自 Effect 环境 |
| **类型安全** | 运行时 Schema 解码，捕获结构不匹配 |
| **错误模型** | Effect 领域错误 + 基础设施错误（`Effect` 类型） |
| **流式传输** | 返回 `Stream` 类型 |
| **取消** | 通过 fiber interruption 控制 |
| **测试** | 调用方变换/提供 `HttpClient` 进行测试、记录、重试 |

📌 *"The rich Effect emitter regenerates private executable schemas when the SDK Contract IR proves that their transport semantics can be reproduced exactly."*

**关键差异**：

| 维度 | Promise | Effect |
|------|---------|--------|
| 运行时校验 | 信任类型 | Schema 解码 |
| 取消机制 | `AbortSignal` | Fiber interruption |
| 传输抽象 | `globalThis.fetch` | `HttpClient` from environment |
| 流类型 | `AsyncIterable` | `Stream` |
| Effect 依赖 | 无（根入口） | 完整 Effect |

---

## 4. Page / Cursor 分页模型

OpenCode 的所有列表 API 统一使用 Page 分页模型。

### 4.1 Page 定义

📌 *"Page: A bounded ordered result containing items and opaque previous and next cursor links for navigating the same query in either direction."*

```typescript
// 概念模型
type Page<T> = {
  items: T[]           // 当前页的结果列表
  previous?: Cursor    // 前向游标（不透明）
  next?: Cursor        // 后向游标（不透明）
}
```

### 4.2 游标语义

📌 *"Session list cursors are opaque branded values carrying continuation query and ordering state. Consumers pass them back unchanged and do not inspect storage anchors or encoded filter fields."*

```
初始查询阶段：
  输入：scope, filters, ordering, page size（全部显式指定）
  输出：Page { items, previous?, next? }

续接阶段：
  输入：仅游标（cursor 携带全部查询状态）
  输出：Page { items, previous?, next? }
```

**规则**：

1. 游标是**不透明的品牌化值**（opaque branded value）
2. 消费者**不得**检查游标内部的存储锚点或编码的过滤字段
3. 使用光标进行续接时，**不需要**重新提供 scope、filters、ordering、page size
4. 一个 Session 的游标不能用于另一个 Session（`invalid`）

📌 *"A Session list continuation accepts only its opaque cursor. Scope, filters, ordering, and page size are fixed by the initial query and carried by that cursor."*

### 4.3 适用 API

`Page` 模型适用两个列表端点：

| API | Page 元素类型 | 特殊说明 |
|-----|--------------|---------|
| `sessions.list(...)` | `Session` 元数据 | 游标携带查询和排序状态 |
| `sessions.messages(...)` | `Message` | 消息游标携带 ordering、page size、direction 和 message anchor |

📌 *"sessions.messages(...) returns a Page and uses the same cursor discipline as sessions.list(...): the initial request supplies sessionID, ordering, and page size; continuation supplies sessionID plus only an opaque branded message cursor carrying ordering, page size, direction, and message anchor."*

---

## 5. 事件流 (Events Stream)

OpenCode 提供两种事件流，具有**不同的 Schema、重放保证、游标、生命周期事件和失败行为**。

### 5.1 对比总览

| 维度 | `sessions.events()` | `events.subscribe()` |
|------|---------------------|----------------------|
| **范围** | 单个 Session | 整个 OpenCode 实例 |
| **持久性** | 持久事件（可重放） | 实时事件（不可重放） |
| **游标支持** | `after` 参数（aggregate sequence） | 无 |
| **生命周期事件** | 无 | connection、heartbeat、disposal |
| **传输** | SSE | SSE |
| **断开行为** | 消费者用最后一个 sequence 重新订阅 | 刷新权威状态后打开新订阅 |

### 5.2 sessions.events()：持久 Session 事件流

📌 *"sessions.events({ sessionID, after }) is a public durable Session event stream. It verifies the Session, replays durable events after the optional aggregate sequence, continues with newly committed durable events, excludes live-only fragments, and is transported as SSE in both networked and embedded modes."*

```
行为模型：

  订阅 events({ sessionID, after: seq42 })
    │
    ├── 验证 Session 存在（不存在 → SessionNotFoundError）
    │
    ├── 重放 seq42 之后的所有持久事件
    │
    ├── 继续推送新提交的持久事件
    │
    └── 不包含 live-only fragment（瞬态事件）
```

**重连策略**（消费者侧）：

📌 *"Callers may compose an explicit resuming stream above it by retaining the last observed durable sequence and opening a new subscription with after; any reusable resume helper remains a separate API design question."*

```
1. 传输断开 → AsyncIterable/Stream 失败（ClientError）
2. 记录最后观察到的 durable sequence
3. 打开新订阅：events({ sessionID, after: lastSequence })
4. 系统重放断开期间错过的持久事件
5. 继续接收新事件
```

### 5.3 events.subscribe()：实例级实时事件流

📌 *"events.subscribe() is a distinct public instance-wide live stream for Session and non-Session activity. It has no replay guarantee and includes connection, heartbeat, and instance-disposal lifecycle events; consumers recover from disconnection by refreshing authoritative state."*

```
行为模型：

  订阅 subscribe()
    │
    ├── 接收当前实例上的实时事件（Session 活动 + 非 Session 活动）
    │
    ├── 包含生命周期事件：
    │   ├── connection 建立
    │   ├── heartbeat 心跳
    │   └── disposal 实例关闭
    │
    └── 断开后：刷新权威状态 → 显式打开新订阅
```

📌 *"events.subscribe() does not automatically reconnect after transport loss. The live-only stream fails with ClientError; consumers refresh authoritative state before explicitly opening a new subscription because events missed during disconnection cannot be replayed."*

### 5.4 两者的根本区别

📌 *"A Session ID is not an optional filter on events.subscribe(): instance-wide live events and durable Session events have different schemas, replay guarantees, cursors, lifecycle events, and failure behavior."*

`sessions.events` 和 `events.subscribe` 是**两个独立的公共端点**，不是同一端点加不同过滤器的关系。它们从设计上就有不同的 Schema 结构和语义。

---

## 6. SDK Contract IR

代码生成的中间表示是 Client 双入口一致性的保证。

### 6.1 定义

📌 *"SDK Contract IR: The runtime-neutral compiled representation of the authoritative HttpApi, preserving encoded and decoded type projections plus transport metadata so independent SDK emitters can choose their own public value model and runtime interpreter."*

```
管道模型：

  Server (HttpApi)                ← 权威源（唯一真实实现）
      │
      ▼
  SDK Contract IR                 ← 编译中间表示
      │                              运行时中立
      │                              保留编码/解码类型投射
      │                              保留传输元数据
      │
      ├──→ Promise Emitter        → @opencode-ai/client（根）
      │      零 Effect 依赖
      │      信任生成类型
      │      AsyncIterable 流
      │
      └──→ Effect Emitter         → @opencode-ai/client/effect
            全 Effect 类型
            Schema 运行时解码
            Stream 流
```

📌 *"SDK generation reflects the public HttpApi once into an SDK Contract IR. Promise and Effect emitters share endpoint structure and transport metadata without being required to expose identical public values: an emitter may select encoded wire types, decoded domain types, compile-time brands, runtime validation, and its own execution abstraction independently."*

### 6.2 发射器独立性

每个发射器拥有自己生成的公共类型模块：

📌 *"Promise and Effect emitters each own their generated public type modules. The SDK Contract IR, not a physically shared generated type package, is the common source; this permits zero-Effect wire types and rich decoded Effect types to evolve independently."*

这意味着：

- **Promise 发射器**生成的结构类型不需要 `effect/Schema` 导入（零 Effect 依赖）
- **Effect 发射器**可以生成带有运行时校验的完整 `Schema` 类型
- 两个发射器从同一份 IR 派生，但输出的类型模块是独立维护的

### 6.3 丰富的 Effect 发射器

📌 *"The first Effect emitter is the rich projection: it exposes decoded Effect-native values, preserves brands and schema transformations, performs runtime schema decoding, and delegates transport interpretation to HttpApiClient."*

当 IR 证明传输语义可以精确重现时，丰富发射器重新生成私有可执行 Schema；当权威源使用自定义转换时，使用基于导入的 Effect 发射器。

### 6.4 代码生成工作流

生成管线由 `@opencode-ai/httpapi-codegen` 包驱动：

```
Server 的 HttpApi (contract.ts)
  │
  ▼
httpapi-codegen 包
  │  读取 contract.ts 中的 17 个 server group → 17 个 client group 映射
  │  处理 10 个端点重命名（如 session.messages → messages.list）
  │  跳过 3 个省略端点（fs.read, pty.connect, pty.connectToken）
  │
  ├──→ 生成 packages/client/src/generated/         (Promise 发射器)
  │     ├── client.ts  — OpenCode.make() 工厂
  │     ├── types.ts   — 类型、错误、输入/输出
  │     └── index.ts   — barrel 重导出
  │
  └──→ 生成 packages/client/src/generated-effect/  (Effect 发射器)
        ├── client.ts  — OpenCode.make() 工厂（HttpApiClient）
        ├── types.ts   — Schema 类型、Effect 错误
        └── index.ts   — barrel 重导出
```

**构建命令**：
- `bun run generate` — HttpApi 变更后重新生成 Client
- `bun run check:generated` — 验证生成输出与 contract 一致

**contract.ts 映射规则**：`contract.ts` 定义了从 Server 的权威 `HttpApi` 到 Client 公共 API 的转换——包括端点重命名（使 API 更语义化）、省略不适合客户端消费的端点，以及按逻辑分组组织 API 模块。

---

## 7. CONTEXT.md 客户端合约节选

以下节选来自 CONTEXT.md 的 "Client contract architecture" 章节。

### 7.1 共享记录

📌 *"Shared public records are plain objects declared with Schema.Struct. A same-name inferred interface gives object records readable TypeScript signatures without constructors, prototypes, or nominal identity; unions retain explicit type aliases."*

### 7.2 路由归属

📌 *"Keep concrete Location middleware keys in Server while Protocol owns their placement. Client projections may supply transport-only keys, but must prove generated equivalence with Server's concrete API."*

### 7.3 Page 转型

📌 *"Project the existing list response envelope to the stable client Page shape and enforce separate initial-query and cursor-continuation inputs without changing the hosted V2 wire contract."*

### 7.4 操作命名

📌 *"Preserve V2 route paths, operation IDs, codecs, errors, middleware behavior, and OpenAPI output while making this change."*

### 7.5 浏览器安全

📌 *"Preserve browser-safe @opencode-ai/client and @opencode-ai/client/effect packages through import-boundary tests."*

### 7.6 嵌入约束

📌 *"Define embedded-host placement before supporting multiple hosts over one database. Hosts that share durable Session storage must also share process-local Session execution coordination, or each host must receive isolated storage explicitly."*

### 7.7 请求作用域

📌 *"Keep an embedded request scope alive until any streamed response body finishes."*

### 7.8 消息查找

📌 *"sessions.message({ sessionID, messageID }) is a required resource lookup. An unknown Session fails with SessionNotFoundError; a known Session with an absent or differently owned message fails with MessageNotFoundError without disclosing cross-Session ownership. Absence is not represented as undefined across the public HTTP boundary."*

### 7.9 中断幂等

📌 *"sessions.interrupt({ sessionID }) first verifies that the durable Session exists, failing with SessionNotFoundError otherwise. For a known Session, interruption is idempotent: idle, already-settled, or locally unowned execution is a no-op."*

### 7.10 活跃快照

📌 *"sessions.active() snapshots the current process's foreground Session drain registry as a record of Session IDs to { type: 'running' }. Missing IDs are inactive; background subagents and tasks do not make their parent Session active, and process restart clears the registry."*

### 7.11 Context 端点

📌 *"sessions.context({ sessionID }) preserves the existing message-only operation. It returns projected conversational messages selected as Session context; it does not include or represent the complete provider request context, whose baseline system context and other contributions remain separate."*

---

## 8. 关键术语

📌 **OpenCode Client** — 从公共 `HttpApi` 派生的生成式 Promise 和 Effect API。Promise 根零 Effect、零 Core 依赖；`/effect` 入口依赖 Effect + Schema + Protocol。网络和嵌入式 OpenCode 使用相同的 `HttpApi` 路由和处理器。

📌 **Embedded OpenCode** — 作用域内的进程内宿主，在结构上扩展 OpenCode Client。通过内存 HTTP 传输提供相同路由和处理器，同时暴露额外的同进程能力。创建是作用域化的；关闭其拥有 Scope 时释放进程内服务器资源。

📌 **SDK Contract IR** — 权威 `HttpApi` 的运行时中立编译表示，保留编码和解码类型投射及传输元数据，使独立的 SDK 发射器可以选择自己的公共值模型和运行时解释器。

📌 **Page** — 一个有界有序结果，包含 `items` 和不透明 `previous` / `next` 游标链接，用于前后导航同一查询。Session 列表和消息列表都使用 Page 模型。

📌 **PTY Environment** — 服务器创建 PTY 时应用的、由宿主提供的环境覆盖。合并调用方值、宿主覆盖和 Core 强制终端不变量（`TERM`、`OPENCODE_TERMINAL`）。PTY 创建时合并这些层，Core 不直接定义 PTY 环境。

📌 **Session Drain** — 一次进程本地的执行跨度，推广符合条件的输入并运行所需的 Provider Turn，直到没有立即继续的需要。`sessions.active()` 快照当前进程的活跃 drain 注册表。

---

## 9. 相关笔记

- [00 — 项目总览](00-overview.md) — 四层依赖图、包地图、术语词汇表、设计哲学
- [05 — Effect Effect-TS 基础设施](05-effect-infra.md) — Effect Layer/Node/Scope 运行时组合模型

---

*最后更新：2026-07-07 | 来源：CONTEXT.md + 设计哲学 Dimension 2*
