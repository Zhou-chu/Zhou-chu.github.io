---
blog: true
title: "01-核心入口与启动流程"
slug: "01-核心入口与启动流程-mscuwiz4"
summary: "树节点：01 核心入口与启动流程 父节点：01 项目架构与包结构 子节点：无 01 核心入口与启动流程 OpenCode 有四个主要入口： CLI 主命令 （ @opencode ai/opencode ）、 旧版 CLI （ @opencode ai/cli ）、 TUI （ @opencode ai/tui ）和 Desktop （ @opencode ai/desktop ），全部指向相同的 Server Core。 入口总览 1"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "01-项目架构与包结构-mscuwigy"
---

> 树节点：01-核心入口与启动流程
> 父节点：[[01-项目架构与包结构]]
> 子节点：无

# 01-核心入口与启动流程

OpenCode 有四个主要入口：**CLI 主命令**（`@opencode-ai/opencode`）、**旧版 CLI**（`@opencode-ai/cli`）、**TUI**（`@opencode-ai/tui`）和 **Desktop**（`@opencode-ai/desktop`），全部指向相同的 Server Core。

## 入口总览

```
opencode CLI (yargs) ──→ packages/opencode/src/index.ts
   ├── run     → TUI 启动
   ├── serve   → HTTP Server 启动
   ├── web     → Web 前端代理
   └── ...28+ 其他命令

旧版 CLI (Effect) ──→ packages/cli/src/index.ts
   ├── api     → API Server
   ├── serve   → 应用服务
   └── service → Daemon 管理

Desktop (Electron) ──→ packages/desktop/src/main/index.ts
   └── 启动 Sidecar Server + 加载 Web 前端

Web App (SolidJS) ──→ packages/app/src/entry.tsx
   └── 连接到本地或远程 Server API
```

## 1. CLI 主入口 (`@opencode-ai/opencode`)

文件：`packages/opencode/src/index.ts:33-141`

使用 **yargs** 构建命令行，注册 33+ 子命令：

```ts
// packages/opencode/src/index.ts:45-103
const cli = yargs(args)
  .scriptName("opencode")
  .command(RunCommand)      // run: 启动交互式 TUI
  .command(ServeCommand)    // serve: 启动 HTTP 服务
  .command(WebCommand)      // web: Web 前端代理
  .command(GenerateCommand) // generate: 代码生成
  .command(AcpCommand)      // acp: Agent Communication Protocol
  .command(AgentCommand)    // agent: Agent 管理
  .command(ModelsCommand)   // models: 模型列表
  .command(UpgradeCommand)  // upgrade: 版本升级
  .command(UninstallCommand)// uninstall: 卸载
  .command(SessionCommand)  // session: 会话管理
  .command(PluginCommand)   // plugin: 插件管理
  .command(McpCommand)      // mcp: MCP 服务器管理
  .command(ExportCommand)   // export: 导出
  .command(ImportCommand)   // import: 导入
  .command(DebugCommand)    // debug: 调试
  .command(GithubCommand)   // github: GitHub 集成
  .command(PrCommand)       // pr: Pull Request
  .command(StatsCommand)    // stats: 统计
  .command(DbCommand)       // db: 数据库操作
  // ... 更多命令
  .fail((msg, err) => { ... })
  .strict()
```

启动流程（`packages/opencode/src/index.ts:126-127`）：
1. `hideBin(process.argv)` 解析参数
2. yargs 中间件设置环境变量：`OPENCODE_PRINT_LOGS`, `OPENCODE_LOG_LEVEL`, `OPENCODE_PURE`（`:66-71`）
3. 设置 `process.env.AGENT = "1"` 和 `process.env.OPENCODE = "1"`（`:75-76`）
4. `Heap.start()` 启动堆监控（`:73`）
5. 各命令通过 `RunCommand` 等模块执行

子命令实现位于 `packages/opencode/src/cli/cmd/`：
- `run.ts` → TUI 线程启动（`TuiThreadCommand`）
- `serve.ts` → HTTP 服务器
- `web.ts` → Web 代理
- `acp.ts` → ACP 协议
- 等等

## 2. 旧版 CLI (`@opencode-ai/cli`)

文件：`packages/cli/src/index.ts:1-32`

使用 **Effect Command 框架**（`effect/unstable/cli/Command`）：

```ts
// packages/cli/src/index.ts:10-26
const Handlers = Runtime.handlers(Commands, {
  $: () => import("./commands/handlers/default"),        // 默认命令
  api: () => import("./commands/handlers/api"),          // API Server
  debug: { agents: () => import("./commands/handlers/debug/agents") },
  migrate: () => import("./commands/handlers/migrate"),  // 数据迁移
  service: {
    start: () => import("./commands/handlers/service/start"),
    restart: () => import("./commands/handlers/service/restart"),
    status: () => import("./commands/handlers/service/status"),
    stop: () => import("./commands/handlers/service/stop"),
    password: () => import("./commands/handlers/service/password"),
  },
  serve: () => import("./commands/handlers/serve"),      // 应用服务
})
```

启动流程（`:27-31`）：
1. `Runtime.run(Commands, Handlers, { version: "local" })`
2. 提供 `Daemon.layer` + `NodeServices.layer`
3. `Effect.scoped` → `NodeRuntime.runMain`

TUI 启动（`packages/cli/src/tui.ts:7-18`）：
```ts
export function runTui(transport) {
  const config = TuiConfig.resolve({}, { terminalSuspend: false })
  return run({ ...transport, args: {}, config, fetch: gracefulFetch, pluginHost })
    .pipe(Effect.provide(AppNodeBuilder.build(Global.node)))
}
```

## 3. Server 启动

### API 定义

文件：`packages/server/src/api.ts:1-8`

```ts
// packages/server/src/api.ts:5-8
export const Api = makeDefaultApi({
  locationMiddleware: LocationMiddleware,
  sessionLocationMiddleware: SessionLocationMiddleware,
})
```

`makeDefaultApi` 来自 `@opencode-ai/protocol/api`，生成完整的 Effect `HttpApi`。

### 路由组装

文件：`packages/server/src/routes.ts:39-63`

路由组装过程：

1. **应用服务层**（`:26-37`）：
```ts
const applicationServices = LayerNode.group([
  Database.node,          // SQLite 数据库
  EventV2.node,           // 事件系统
  httpClient,             // HTTP 客户端
  ToolOutputStore.cleanupNode,  // 工具输出存储
  SessionV2.node,         // V2 Session 核心
  PermissionSaved.node,   // 权限持久化
  PtyTicket.node,         // PTY ticket 管理
  Credential.node,        // 凭证管理
  PtyEnvironment.node,    // PTY 环境
  LocationServiceMap.node,// Location 服务映射
])
```

2. **Handler 合并**（`packages/server/src/handlers.ts:21-39`）：18 个 handler 合并为一层：
   `Health`, `Location`, `Agent`, `Session`, `Message`, `Model`, `Provider`, `Integration`, `Credential`, `Permission`, `FileSystem`, `Command`, `Skill`, `Event`, `Pty`, `Question`, `Reference`, `ProjectCopy`

3. **路由构建**（`routes.ts:51-62`）：
```ts
function makeRoutes(auth) {
  return HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(handlers),
    Layer.provide(sessionLocationLayer),
    Layer.provide(locationLayer),
    Layer.provide(authorizationLayer),
    Layer.provide(schemaErrorLayer),
    Layer.provide(auth),
    Layer.provide(serviceLayer),
  )
}
```

4. **嵌入式路由**（`:47-48`）：`createEmbeddedRoutes()` 创建无需密码认证的路由，供 SDK-Next 内存内执行使用。

5. **Web Handler**（`:67-68`）：`webHandler()` 将路由转为标准 Web Handler，供 Bun/Hono/Node 使用。

## 4. TUI 启动 (`@opencode-ai/tui`)

入口：`packages/tui/src/index.tsx:1` → 导出 `app.tsx` 的 `run` 和 `TuiInput`

`packages/tui/src/app.tsx:1-1134` 的核心结构：

1. **TuiInput 类型**（`:142-152`）：
```ts
export type TuiInput = {
  url: string           // Server API URL
  args: Args            // 启动参数
  config: TuiConfig.Resolved  // TUI 配置
  directory?: string    // 工作目录
  fetch?: typeof fetch  // 自定义 fetch
  headers?: RequestInit["headers"]
  events?: EventSource  // Server-Sent Events
  pluginHost: TuiPluginHost
}
```

2. **启动链**：`run()` → `render()` → `AppBaseProviders` → `AppInterface`
   - `SDKProvider`：创建与 Server 的连接
   - `ProjectProvider`：加载项目信息
   - `RouteProvider`：路由（Home / Session）
   - `PluginRuntimeProvider`：插件运行时
   - `ThemeProvider`：主题
   - `KeymapProvider`：快捷键绑定

3. **热键绑定**（`:92-140`）：定义全局和局部命令绑定，如 `session.list`, `model.list`, `agent.cycle`, `theme.switch` 等

## 5. Desktop 启动 (`@opencode-ai/desktop`)

文件：`packages/desktop/src/main/index.ts:1-399`

Desktop 是基于 **Electron** 的桌面应用。

启动流程（`main/index.ts:113-399`）：

1. **应用初始化**（`:139-147`）：
   - 设置 app 名称和 AppUserModelId
   - 初始化日志和崩溃报告
   - 加载系统 CA 证书

2. **安全设置**（`:189-194`）：
   - `ensureLoopbackNoProxy()`：确保 NO_PROXY 包含 localhost
   - 启用代理环境
   - 非打包模式下开启远程调试端口 9222

3. **单实例锁**（`:196-199`）：`app.requestSingleInstanceLock()`

4. **Sidecar Server 启动**（`:315-362`）：
   - 分配随机空闲端口（`:321-337`）
   - 生成随机密码
   - `spawnLocalServer(hostname, port, password)` 启动子进程（`:349-356`）
   - 设置 `ServerReadyData`（url, username, password）
   - 等待 health check（`:368-375`）

5. **IPC 处理器注册**（`:273-301`）：
   - `killSidecar` / `relaunch` / `awaitInitialization`
   - Deep link 处理 / Updater
   - WSL 集成

6. **自动更新**（`:272, 304-306`）：使用 `electron-updater`，每 10 分钟检查更新

7. **WSL 支持**（`:150-164, 302`）：`createWslServersController` 管理 WSL 内的 sidecar instances

8. **窗口恢复**（`:382`）：`restoreMainWindows()` 恢复上次的窗口状态

## 6. Web App 启动 (`@opencode-ai/app`)

文件：`packages/app/src/entry.tsx:1-182`

SolidJS 前端应用，连接 Server API：

1. **语言检测**（`:16-24`）：自动检测 `zh` / `en`
2. **Server URL 获取**（`:14`）：从 `localStorage` 读取 `opencode.settings.dat:defaultServerUrl`
3. **渲染**：`render()` → `PlatformProvider` → `ServerConnection` → `AppBaseProviders` → `AppInterface`

## 启动顺序总结

```
1. 用户执行 opencode CLI
2. yargs 解析命令 → 对应命令模块加载（懒加载）
3. 典型流程：
   ├── opencode run     → TuiThreadCommand → TUI App 启动 → 连接本地/远程 Server
   ├── opencode serve   → ServeCommand → HTTP Server 启动 → 监听端口
   ├── opencode web     → WebCommand → 前端代理 → 浏览器打开
   └── Desktop App     → Electron main → Sidecar Server → Web 前端加载
4. Server 层统一：
   - routes.ts 组装 Layer（数据库 → 事件 → 中间件 → Handler）
   - api.ts 定义 HttpApi
   - handlers.ts 合并 18 个领域 Handler
5. TUI/Web 通过 HTTP API 与 Server 通信
```
