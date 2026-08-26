---
blog: true
title: "01-项目架构与包结构"
slug: "01-项目架构与包结构-mscuwigy"
summary: "树节点：01 项目架构与包结构 父节点：Opencode的工作原理 子节点：01 核心入口与启动流程 | 01 核心概念名词表 01 项目架构与包结构 OpenCode 是一个基于 Bun monorepo（ package.json:7 ）构建的 AI 编程助手，使用 Effect TS v4 作为核心运行时框架（ packages/schema/package.json:15 ），以 Drizzle ORM+SQLite 为持久化层"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "01-核心入口与启动流程-mscuwiz4"
  - "01-核心概念名词表-mscuwj0z"
---

> 树节点：01-项目架构与包结构
> 父节点：[[Opencode的工作原理]]
> 子节点：[[01-核心入口与启动流程]] | [[01-核心概念名词表]]

# 01-项目架构与包结构

OpenCode 是一个基于 **Bun** monorepo（`package.json:7`）构建的 AI 编程助手，使用 **Effect-TS v4** 作为核心运行时框架（`packages/schema/package.json:15`），以 **Drizzle ORM+SQLite** 为持久化层（`packages/core/package.json:109`）。

## 包管理器与工具链

- **包管理器**：Bun 1.3.14（`package.json:7`）
- **构建编排**：Turbo 2.10.2（`package.json:109`），配置在 `turbo.json`
- **Lint**：oxlint 1.60.0（`package.json:105`）
- **类型检查**：`tsgo --noEmit`（TypeScript 7.0 native preview）
- **格式化**：Prettier 3.6.2（`package.json:106`）
- **Git Hooks**：Husky（`package.json:103`）

## Workspace 结构

根 `package.json:25-32` 定义了五个 workspace group：

```json
"workspaces": {
  "packages": [
    "packages/*",
    "packages/console/*",
    "packages/stats/*",
    "packages/sdk/js",
    "packages/slack"
  ]
}
```

## 完整包列表（38 个包）

### 核心层（数据 → 运行时）

| 包名                    | 定位                                                             | 内部依赖                                                                     |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `@opencode-ai/schema` | 浏览器安全的 wire/storage 合约，SDK 生成的共享类型基础。仅依赖 `effect`              | 无内部依赖                                                                    |
| `@opencode-ai/core`   | 核心运行时：Session、权限、工具、插件、Provider、文件系统、数据库、Agent 等               | `schema`, `llm`, `plugin`, `effect-drizzle-sqlite`, `effect-sqlite-node` |
| `@opencode-ai/llm`    | Effect Schema-first LLM 核心：Protocol、Route、Provider Facade、流式解析 | `schema`                                                                 |

> 依赖方向 `AGENTS.md:3`：**Schema → Core+Protocol → Server → Client → SDK-Next**

### 协议与通信层

| 包名 | 定位 | 内部依赖 |
|------|------|----------|
| `@opencode-ai/protocol` | Session 端点构造与中间件布局，纯协议不依赖 Core/Server | `schema` |
| `@opencode-ai/server` | HTTP 路由、中间件：身份认证、Location、PTY 环境、Handler 组合 | `core`, `protocol` |

### 客户端与 SDK 层

| 包名 | 定位 | 内部依赖 |
|------|------|----------|
| `@opencode-ai/client` | 生成的双入口客户端：`/`（Promise+fetch，零 Effect）、`/effect`（Effect+HttpClient） | `schema`, `protocol` |
| `@opencode-ai/sdk-next` | Effect-native 内存内 OpenCode host（将替换旧 sdk） | `client`, `core`, `server` |
| `@opencode-ai/sdk` | 旧版 JS SDK（`packages/sdk/js`），对应 `@opencode-ai/sdk` | 仅 `cross-spawn` |
| `@opencode-ai/httpapi-codegen` | 从 `HttpApi` + Effect Schema 合约生成 Promise/Effect 客户端代码 | 仅 `effect` + `prettier` |
| `@opencode-ai/http-recorder` | Effect HTTP/WebSocket 流量录制与回放（VCR） | `@effect/platform-node` |

### 入口与终端

| 包名 | 定位 | 内部依赖 |
|------|------|----------|
| `@opencode-ai/opencode` | **主 CLI 入口**（yargs 命令路由，33+ 子命令） | `core` |
| `@opencode-ai/cli` | **旧版 CLI**（Effect Command 框架）：`api`, `serve`, `service`, `debug`, `migrate` | `core`, `sdk`, `server`, `tui` |
| `@opencode-ai/tui` | **终端 UI**（SolidJS + OpenTUI）：Session 对话、主题、插件、命令面板 | `core`, `plugin`, `sdk`, `ui` |
| `@opencode-ai/desktop` | **Electron 桌面应用**：窗口管理、自动更新、WSL 集成 | `app`, `ui` |
| `@opencode-ai/app` | **Web 前端**（SolidJS + Vite）：对话 UI、Session 管理、文件浏览 | `core`, `schema`, `sdk`, `session-ui`, `ui` |

### UI 组件层

| 包名 | 定位 | 内部依赖 |
|------|------|----------|
| `@opencode-ai/ui` | 共享 UI 组件库（SolidJS）：主题、图标、Markdown 渲染、动画 | 无内部依赖 |
| `@opencode-ai/session-ui` | Session 对话组件：消息渲染、文件 diff、Markdown 流、代码高亮 | `core`, `sdk`, `ui` |
| `@opencode-ai/storybook` | UI 组件的 Storybook 开发环境 | `ui`, `session-ui` |

### 基础设施

| 包名 | 定位 | 内部依赖 |
|------|------|----------|
| `@opencode-ai/effect-drizzle-sqlite` | Drizzle ORM 的 Effect SQLite 适配器 | `drizzle-orm`, `effect` |
| `@opencode-ai/effect-sqlite-node` | Node.js 原生 SQLite 的 Effect 封装 | `effect` |
| `@opencode-ai/plugin` | 插件 SDK：Tool/TUI/Integration 接口定义 | `sdk`, `effect` |
| `@opencode-ai/codemode` | 受限代码执行沙箱（Effect-native）：Schema 化工具调用、超时、截断 | `effect` |
| `@opencode-ai/script` | 构建/发布脚本工具 | 仅 `semver` |
| `@opencode-ai/enterprise` | 企业版 Web 前端（SolidStart） | `core`, `ui`, `session-ui` |
| `@opencode-ai/function` | Cloudflare Workers function：GitHub App OAuth | `@octokit`, `hono` |
| `@opencode-ai/slack` | Slack Bot 集成 | `sdk`, `@slack/bolt` |

### Console 子包组（`packages/console/`）

| 包名 | 定位 |
|------|------|
| `@opencode-ai/console-app` | Console 管理后台（SolidStart）：订阅、账单、组织管理 |
| `@opencode-ai/console-core` | Console 业务逻辑：PlanetScale + Stripe + Drizzle ORM |
| `@opencode-ai/console-function` | Console 的 Cloudflare Workers 函数 |
| `@opencode-ai/console-mail` | 邮件模板渲染 |
| `@opencode-ai/console-resource` | SST 资源定义（AWS 基础设施） |
| `@opencode-ai/console-support` | 工单支持系统 |

### Stats 子包组（`packages/stats/`）

| 包名 | 定位 |
|------|------|
| `@opencode-ai/stats-app` | 统计分析仪表盘（SolidStart + D3） |
| `@opencode-ai/stats-core` | 统计业务逻辑：Athena 查询、PlanetScale DB、Drizzle ORM |
| `@opencode-ai/stats-server` | Lambda handler，调用 core services |

### 其他

| 包名 | 定位 |
|------|------|
| `@opencode-ai/web` | 文档站点（Astro + Starlight） |
| `@opencode-ai/docs` | 项目文档（`packages/docs/`） |
| `@opencode-ai/containers` | 容器构建配置（`base`, `bun-node`, `rust`, `tauri-linux`） |

## 依赖拓扑

```
Schema（数据合约，无内部依赖）
  ├── Core（运行时核心：Session、工具、权限、Provider）
  │     ├── llm（LLM 核心：Protocol/Route/Provider）
  │     ├── plugin（插件 SDK）
  │     ├── effect-drizzle-sqlite（Drizzle+Effect 适配器）
  │     └── effect-sqlite-node（Node SQLite 封装）
  ├── Protocol（端点构造，仅依赖 Schema）
  └── Server（HTTP 路由+中间件，依赖 Core+Protocol）
        └── Client（Promise/Effect 双入口，依赖 Schema+Protocol）
              └── SDK-Next（内存内 host，依赖 Client+Core+Server）
```

> 来源 `AGENTS.md:3`：_"Keep runtime dependencies directed from Schema to Core and Protocol, then from Core and Protocol to Server. Client runtime code may depend on Schema and Protocol but never Core or Server; `sdk-next` composes Client, Core, and Server."_

## 设计原则

从 `AGENTS.md`（161 行）和 `CONTEXT.md`（225 行）中提取的关键架构原则：

1. **单一函数原则**：不做单次使用的提取（`AGENTS.md:25-26`）
2. **避免 try/catch**：用 Effect 的错误处理替代（`AGENTS.md:27`）
3. **避免 any 类型**：严格类型（`AGENTS.md:28`）
4. **使用 Bun API**：如 `Bun.file()`（`AGENTS.md:29`）
5. **依赖类型推断**：除非导出或清晰性需要，不添加显式类型标注（`AGENTS.md:30`）
6. **函数式数组方法**：优先 `flatMap`、`filter`、`map` 而非 for 循环（`AGENTS.md:31`）
7. **Drizzle 字段使用 snake_case**（`AGENTS.md:123-139`）
8. **测试不做 mock**：测试真实实现，不重复逻辑到测试中（`AGENTS.md:142-144`）
9. **V2 Session 核心**：持久化 prompt 入站与模型执行分离；SessionExecution 是进程全局的（`AGENTS.md:152-161`）
10. **System Context 代数**：Context Source 注册、比较、更新用代数化系统管理（`AGENTS.md:161`）

## Turbo 构建任务

`turbo.json:5-31` 定义的构建任务：

- **`typecheck`**：各包独立类型检查
- **`build`**：构建输出到 `dist/`
- **`test`**：依赖 `^build`（先构建被依赖的包）
