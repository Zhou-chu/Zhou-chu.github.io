---
blog: true
title: "03-Schema包组织与导出"
slug: "03-schema包组织与导出-mscuwj3u"
summary: "树节点：03 Schema包组织与导出 父节点：Opencode的工作原理 子节点：03 标识符与品牌类型 | 03 核心实体Schema | 03 事件与Manifest 概述 @opencode ai/schema 是 OpenCode 项目中 最底层的共享契约包 ，承担\"浏览器安全、可序列化、跨包共享\"的类型定义职责。它不包含任何运行行为、副作用或宿主实现——只定义结构、约束和标识符。所有上层包（Protocol、Server、C"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "03-标识符与品牌类型-mscuwihm"
  - "03-核心实体schema-mscun018"
  - "03-事件与manifest-mscuwj4q"
---

> 树节点：03-Schema包组织与导出
> 父节点：[[Opencode的工作原理]]
> 子节点：[[03-标识符与品牌类型]] | [[03-核心实体Schema]] | [[03-事件与Manifest]]

---

## 概述

`@opencode-ai/schema` 是 OpenCode 项目中**最底层的共享契约包**，承担"浏览器安全、可序列化、跨包共享"的类型定义职责。它不包含任何运行行为、副作用或宿主实现——只定义结构、约束和标识符。所有上层包（Protocol、Server、Core、SDK）单向依赖它。

依赖方向：`schema ← protocol ← server ← core/sdk`

该包使用 **Effect-TS 的 Schema 模块** 作为类型构造基础设施，即所有实体定义都是 `Schema.Struct({...})` 的产物。这保证了编译期类型检查与运行期编解码的一致性。

**源文件目录**: `packages/schema/src/` — 共计 64 个 `.ts` 文件（含 `v1/` 子目录 4 个文件）。

---

## 模块分组

### 一、核心实体（Core Entities）—— ~15 个文件

定义 OpenCode 领域模型的主要类型：

| 文件 | 导出内容 | 说明 |
|------|---------|------|
| `agent.ts` | `Agent.ID`, `Agent.Color`, `Agent.Info` | Agent 实体：ID 品牌、颜色枚举、配置信息 |
| `session.ts` | `Session.ID`, `Session.Info`, `Session.ListAnchor` | Session 实体 V2：包含 agent/model/cost/tokens/time/location 等字段 |
| `project.ts` | `Project.ID`, `Project.Info` | 项目实体：目录、git 信息等 |
| `workspace.ts` | `Workspace.Info` | 工作空间实体 |
| `integration.ts` | `Integration.Info` 等 | 第三方集成（如 AWS、GitHub）配置 |
| `permission.ts` | `Permission.ID`, `Permission.Request`, `Permission.Reply`, `Permission.Rule` | 权限系统 V2：请求/响应/规则 |
| `question.ts` | `Question.Request` 等 | 交互式提问（V2 版） |
| `prompt.ts` | `Prompt`, `FileAttachment`, `AgentAttachment` | 用户输入提示：文本 + 文件附件 + agent 附件 |
| `skill.ts` | `Skill.Info` | 技能定义 |
| `plugin.ts` | `Plugin.Info` 等 | 插件定义 |
| `model.ts` | `Model.Ref`, `Model.Info` | 模型引用和元数据 |
| `provider.ts` | `Provider.Request` | LLM 提供商请求配置 |
| `command.ts` | 命令定义 | CLI 命令的 Schema 定义 |
| `connection.ts` | 连接配置 | 连接相关类型 |
| `credential.ts` | 凭证 | 认证凭证 |
| `catalog.ts` | 目录 | 模型/提供商目录 |
| `location.ts` | `Location.Ref` | 位置信息（workspace ID + subpath） |
| `llm.ts` | `LLM.ToolContent`, `LLM.ProviderMetadata` | LLM 通用类型：工具内容、提供商元数据 |
| `reference.ts` | `Reference.Info` | 代码引用信息 |
| `revert.ts` | `Revert.State` | 文件回滚状态 |

**模块导出模式**：每个文件顶部使用自引用 namespace export：

```ts
// packages/schema/src/session.ts:1
export * as Session from "./session"
```

这允许上层通过 `import { Session } from "@opencode-ai/schema"` 导入，然后以 `Session.ID`、`Session.Info` 的形式访问成员，避免命名冲突。

### 二、标识符（Identifiers）—— 5 个文件

| 文件 | 导出内容 | 说明 |
|------|---------|------|
| `identifier.ts` | `ascending()`, `descending()`, `create()` | ID 生成算法（基于时间戳 + 随机字节） |
| `session-id.ts` | `SessionID` | 品牌类型，前缀 `ses_`，降序（descending）|
| `project-id.ts` | `ProjectID` | 品牌类型 `Project.ID`，含全局常量 `global` |
| `workspace-id.ts` | `WorkspaceID` | 品牌类型 `WorkspaceV2.ID`，前缀 `wrk_`，升序 |
| `integration-id.ts` | `IntegrationID`, `IntegrationMethodID` | 集成标识符品牌类型 |

详见 [[03-标识符与品牌类型]]。

### 三、事件系统（Event System）—— ~20 个文件

事件是 OpenCode 的核心通信机制。分为**持久化事件**（durable events）和**即时事件**（live events）。

**事件框架核心：**

| 文件 | 导出内容 | 说明 |
|------|---------|------|
| `event.ts` | `Event.define()`, `Event.inventory()`, `Event.durable()`, `Event.latest()` | 事件定义框架：创建事件类型、编目、去重取最新、持久化过滤 |
| `event-manifest.ts` | `EventManifest.Definitions`, `EventManifest.ServerDefinitions` | **中央事件注册表**：将所有事件模块汇总为 `Definitions` 数组 |

`Event.define({ type, durable?, schema })` 是定义事件的工厂函数；`Event.inventory(...)` 将多个事件冻结为只读数组；`Event.durable()` 提取带 `durable` 标记的事件（用于持久化存储）；`Event.latest()` 去重保留每个类型的最新版本。

**具体事件模块（按领域）：**

| 文件 | 事件类型 |
|------|---------|
| `session-event.ts` | Session 生命周期事件（user-admitted, assistant-step-started/stopped, tool-calls-settled, error 等），共 15+ 事件定义 |
| `session-status-event.ts` | Session 状态变更事件 |
| `session-compaction-event.ts` | Compaction（上下文压缩）事件 |
| `session-todo.ts` | Todo 相关事件 |
| `durable-event-manifest.ts` | `DurableEventManifest.SessionDurable` — 仅持久化事件的 manifest |
| `filesystem.ts` | 文件系统操作事件 |
| `filesystem-watcher.ts` | 文件监视事件 |
| `mcp-event.ts` | MCP 服务事件 |
| `lsp-event.ts` | LSP 语言服务器事件 |
| `installation-event.ts` | 安装生命周期事件 |
| `tui-event.ts` | TUI（终端 UI）事件 |
| `vcs-event.ts` | 版本控制事件 |
| `workspace-event.ts` | 工作空间事件 |
| `worktree-event.ts` | 工作树事件 |
| `server-event.ts` | 服务器事件 |
| `ide-event.ts` | IDE 集成事件 |
| `legacy-event.ts` | 兼容旧版事件 |
| `models-dev.ts` | 开发模型事件 |

详见 [[03-事件与Manifest]]。

### 四、权限系统（Permission）—— 3 个文件

| 文件 | 说明 |
|------|------|
| `permission.ts` | V2 权限：`Permission.Request`（请求）、`Permission.Reply`（once/always/reject）、`Permission.Rule`（规则）、`Permission.Effect`（allow/deny/ask） |
| `permission-v1.ts` | V1 权限事件（兼容旧协议） |
| `permission-saved.ts` | 已保存权限的状态 |

### 五、Session 相关（消息 / 输入 / 交付）—— 6 个文件

| 文件 | 说明 |
|------|------|
| `session-message.ts` | 消息结构：`User`, `Assistant`, `System`, `Shell`, `AgentSwitched`, `ModelSwitched` 等 ~20 种消息类型 |
| `session-input.ts` | Session 输入管理 |
| `session-delivery.ts` | 交付模式定义 |
| `session-v1.ts` | V1 Session 兼容层 |

> `session.ts` 和 `session-event.ts` 已在实体和事件分组中覆盖。

### 六、V1 兼容层（`v1/` 子目录）—— 4 个文件

V1 合约保留用于**活跃兼容性、持久化迁移**。明确标记 `V1` 命名：

| 文件 | 对应 V2 |
|------|---------|
| `v1/session.ts` | `session.ts` |
| `v1/permission.ts` | `permission.ts` |
| `v1/question.ts` | `question.ts` |
| `v1/legacy-event.ts` | 通用遗留事件 |

此外，V1 类型也在根目录以 `xxx-v1.ts` 形式存在（如 `permission-v1.ts`, `question-v1.ts`, `session-v1.ts`），提供兼容入口。

### 七、基础设施（Infrastructure）—— 3 个文件

| 文件 | 说明 |
|------|------|
| `schema.ts` | **基础工具集**：`optional()`, `statics()`, `PositiveInt`, `NonNegativeInt`, `RelativePath`, `AbsolutePath`, `DateTimeUtcFromMillis` |
| `identifier.ts` | ID 生成算法（被各个 ID 模块引用） |
| `index.ts` | **Barrel 导出**：聚合所有 public 合约 |

### 八、其他（6 个文件）

| 文件 | 说明 |
|------|------|
| `file-diff.ts` | 文件差异结构 |
| `project-copy.ts` | 项目复制 |
| `project-directories.ts` | 项目目录事件 |
| `pty.ts` / `pty-ticket.ts` | PTY（伪终端）事件和票据 |
| `prompt-input.ts` | 提示输入管理 |

---

## Barrel 导出：`index.ts`

```ts
// packages/schema/src/index.ts:1-27
export { Agent } from "./agent"
export { Command } from "./command"
export { Session } from "./session"
export { Permission } from "./permission"
export { Prompt, Source, FileAttachment, AgentAttachment } from "./prompt"
export * from "./schema"
// ... 共 27 行 exports
```

**导出策略**：
- **实体模块**：以命名空间方式导出（如 `export { Session } from "./session"`），导入后用 `Session.Info` / `Session.ID` 访问
- **工具模块**：`export * from "./schema"` — 裸导出所有基础工具（`optional`, `statics`, `PositiveInt`…）
- **不导出**：事件模块（`session-event.ts`、`mcp-event.ts` 等）**不在 barrel 中**，通过 `event-manifest.ts` 间接聚合；使用者直接 `import { SessionEvent } from "@opencode-ai/schema/session-event"` 按需导入

---

## `schema.ts` — 基础工具集

```ts
// packages/schema/src/schema.ts:1-30
import { DateTime, Option, Schema, SchemaGetter } from "effect"

export const PositiveInt = Schema.Int.check(Schema.isGreaterThan(0))
export const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
export const RelativePath = Schema.String.pipe(Schema.brand("RelativePath"))
export const AbsolutePath = Schema.String.pipe(Schema.brand("AbsolutePath"))
export const DateTimeUtcFromMillis = Schema.Finite.pipe(
  Schema.decodeTo(Schema.DateTimeUtc, { ... })
)
```

**核心工具函数**：

1. **`optional()`** — 包级可选字段辅助
   ```ts
   // packages/schema/src/schema.ts:12-18
   export const optional = <S extends Schema.Top>(schema: S) =>
     Schema.optionalKey(schema).pipe(
       Schema.decodeTo(Schema.optional(Schema.toType(schema)), {
         decode: SchemaGetter.passthrough({ strict: false }),
         encode: SchemaGetter.transformOptional(Option.filter((value) => value !== undefined)),
       }),
     )
   ```
   与原生 `Schema.optional` 的区别：编码时**自动省略 `undefined` 值**，确保序列化产物干净。这是全包的"默认可选行为"。

2. **`statics()`** — 静态方法注入
   ```ts
   // packages/schema/src/schema.ts:20-23
   export const statics =
     <S extends object, M extends Record<string, unknown>>(methods: (schema: S) => M) =>
     (schema: S): S & M =>
       Object.assign(schema, methods(schema))
   ```
   在 Schema 对象上附加静态方法（如 `SessionID.create()`, `Prompt.fromUserMessage()`），保持 Schema 自身是唯一的导出身份。

3. **品牌路径**：`RelativePath` / `AbsolutePath` 通过 `Schema.brand()` 区分字符串语义，防止路径类型混淆。
4. **数值约束**：`PositiveInt` / `NonNegativeInt` — 编译期 + 运行期双重校验。

---

## 命名约定

| 规则 | 示例 | 说明 |
|------|------|------|
| **Namespace export** | `export * as Session from "./session"` | 每个模块顶层自引用，导出命名空间对象 |
| **PascalCase 导出值** | `Session.ID`, `Agent.Color`, `Permission.Request` | 所有导出的 Schema 值 |
| **camelCase 函数** | `optional()`, `statics()`, `ascending()` | Schema 构造/组合函数 |
| **`V1` 后缀** | `SessionV1`, `PermissionV1` | 旧版兼容类型专用 |
| **`Ref` 用于引用** | `Model.Ref`, `Location.Ref` | 外键/引用类型约定 |
| **`Info` 用于主结构** | `Session.Info`, `Agent.Info` | 实体核心信息结构 |
| **`stable identifier`** | 所有公开 Schema 必须有稳定的 `annotate({ identifier: "Xxx.Yyy" })` | 用于调试和序列化标识 |
| **结构体用 `Schema.Struct`** | 所有实体定义 | 纯对象结构 |
| **枚举用 `Schema.Literals`** | `Schema.Literals(["once", "always", "reject"])` | 关闭的字符串枚举 |
| **联合用 `Schema.Union`** | `Schema.Union([ToolTextContent, ToolFileContent])` | 多态类型（通常配合 `taggedUnion`） |

---

## 模块边界规则

根据 `AGENTS.md`：

> Schema values should be serializable contract definitions, not service implementations or runtime registries.

- **不做**：运行时逻辑、副作用、数据库操作、文件 I/O
- **允许**：纯编解码定义、ID 生成（`identifier.ts` — 它仅含同步密码学随机数）
- **V1 临时共存**：V1 类型在独立 subtree 中，新代码不依赖它；迁移完成后整体移除
- **单向依赖**：Schema 不 import Core、Protocol、Server

---

## 文件清单（完整 64 个源文件）

```
packages/schema/src/
├── agent.ts                  # Agent 实体 (ID, Color, Info)
├── catalog.ts                # 模型/提供商目录
├── command.ts                # CLI 命令
├── connection.ts             # 连接配置
├── credential.ts             # 认证凭证
├── durable-event-manifest.ts # 持久化事件 manifest
├── event-manifest.ts         # 中央事件注册表 (汇总所有事件)
├── event.ts                  # 事件定义框架 (define, inventory, durable, latest)
├── file-diff.ts              # 文件差异
├── filesystem-watcher.ts     # 文件监视事件
├── filesystem.ts             # 文件系统事件
├── ide-event.ts              # IDE 事件
├── identifier.ts             # ID 生成算法
├── index.ts                  # Barrel 导出 (27 行)
├── installation-event.ts     # 安装事件
├── integration-id.ts         # Integration 标识符
├── integration.ts            # 集成实体
├── legacy-event.ts           # 遗留事件
├── llm.ts                    # LLM 通用类型 (ToolContent, ProviderMetadata)
├── location.ts               # 位置 (workspace + subpath)
├── lsp-event.ts              # LSP 事件
├── mcp-event.ts              # MCP 事件
├── model.ts                  # 模型定义 (Ref, Info)
├── models-dev.ts             # 开发模型事件
├── permission-saved.ts       # 已保存权限
├── permission-v1.ts          # V1 权限
├── permission.ts             # 权限系统 V2 (Request, Reply, Rule, Effect)
├── plugin.ts                 # 插件定义
├── project-copy.ts           # 项目复制
├── project-directories.ts    # 项目目录事件
├── project-id.ts             # Project ID 品牌
├── project.ts                # 项目实体
├── prompt-input.ts           # 提示输入
├── prompt.ts                 # Prompt/FileAttachment/AgentAttachment
├── provider.ts               # LLM Provider 请求配置
├── pty-ticket.ts             # PTY 票据
├── pty.ts                    # PTY 事件
├── question-v1.ts            # V1 提问
├── question.ts               # 提问实体 V2
├── reference.ts              # 代码引用
├── revert.ts                 # 文件回滚
├── schema.ts                 # 基础工具 (optional, statics, PositiveInt 等)
├── server-event.ts           # 服务器事件
├── session-compaction-event.ts  # Compaction 事件
├── session-delivery.ts       # Session 交付模式
├── session-event.ts          # Session 事件 (V2, ~520 行, 15+ 事件)
├── session-id.ts             # Session ID 品牌 (ses_)
├── session-input.ts          # Session 输入
├── session-message.ts        # 消息结构 (~213 行, 20+ 消息类型)
├── session-status-event.ts   # Session 状态事件
├── session-todo.ts           # Todo 事件
├── session-v1.ts             # V1 Session
├── session.ts                # Session 实体 V2
├── skill.ts                  # Skill 定义
├── tui-event.ts              # TUI 事件
├── vcs-event.ts              # 版本控制事件
├── workspace-event.ts        # 工作空间事件
├── workspace-id.ts           # Workspace ID 品牌 (wrk_)
├── workspace.ts              # 工作空间实体
├── worktree-event.ts         # 工作树事件
└── v1/
    ├── legacy-event.ts       # V1 遗留事件
    ├── permission.ts         # V1 权限
    ├── question.ts           # V1 提问
    └── session.ts            # V1 Session
```
