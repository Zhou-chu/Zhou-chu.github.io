---
blog: true
title: "00 — 项目总览 (Project Overview)"
slug: "00-项目总览-project-overview-mscuwj2z"
summary: "00 — 项目总览 (Project Overview) OpenCode = AI 编程助手的 Effect TS 多包架构：Schema 层定义纯数据契约，Core 承载领域逻辑，Protocol 定义 HTTP 路由，Server 实现 HTTP API，Client 生成双入口 SDK，SDK Next 提供嵌入式宿主，Code Mode 提供受限代码执行。 1. 包依赖图 (Package Dependency Diagram"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 00 — 项目总览 (Project Overview)

**OpenCode** = AI 编程助手的 Effect-TS 多包架构：Schema 层定义纯数据契约，Core 承载领域逻辑，Protocol 定义 HTTP 路由，Server 实现 HTTP API，Client 生成双入口 SDK，SDK-Next 提供嵌入式宿主，Code Mode 提供受限代码执行。

---

## 1. 包依赖图 (Package Dependency Diagram)

```
┌─────────────────────────────────────────────────────────┐
│                      opencode                           │
│                   (CLI / TUI 产品入口)                    │
│              依赖所有包 + @opencode-ai/codemode           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │  client   │    │sdk-next  │    │    codemode       │  │
│  │(Promise + │◄───│(嵌入式   │    │ (受限代码执行)     │  │
│  │ Effect)   │    │ 宿主)    │    │ host-neutral      │  │
│  └──┬───┬────┘    └──┬───┬───┘    └────────┬─────────┘  │
│     │   │            │   │                 │            │
│     │   │   ┌────────┘   └──────────┐      │            │
│     │   │   │                       │      │            │
├─────┼───┼───┼───────────────────────┼──────┼────────────┤
│     ▼   ▼   ▼                       ▼      │            │
│  ┌──────────────┐            ┌──────────────┐          │
│  │    server     │            │     core      │          │
│  │  (HTTP 实现)  │            │  (领域逻辑)    │          │
│  │ 依赖 core +   │            │  依赖 schema + │          │
│  │   protocol    │            │  llm + plugin  │          │
│  └───┬──────┬────┘            └──┬───────┬─────┘          │
│      │      │                    │       │                │
│      │      ▼                    ▼       ▼                │
│      │  ┌──────────┐    ┌──────────┐ ┌──────────┐        │
│      │  │ protocol  │    │   llm    │ │  plugin   │        │
│      │  │(路由定义) │    │(LLM 核心)│ │(插件系统) │        │
│      │  └─────┬─────┘    └────┬─────┘ └──────────┘        │
│      │        │               │                           │
│      ▼        ▼               ▼                           │
│  ┌──────────────────────────────────────┐                │
│  │              schema                   │                │
│  │           (纯数据契约)                 │                │
│  └──────────────────────────────────────┘                │
│                                                         │
└─────────────────────────────────────────────────────────┘

依赖方向：上→下（上层依赖下层，反向禁止）
              opencode → 所有包
              sdk-next → client + core + server
              server → core + protocol
              core → schema + llm + plugin
              client → schema + protocol
              llm → schema
              protocol → schema
              schema → effect（唯一外部运行时依赖）
              codemode → effect + acorn（独立于 OpenCode 其他包）
```

**核心原则**：

1. Schema 是惟一的跨包数据契约层，不依赖任何其他 workspace 包。所有包都可以依赖 Schema，但反向禁止。

2. Core 和 Protocol 是平行的：Core 不依赖 Protocol，Protocol 不依赖 Core。Server 是它们唯一的共同消费者。

3. Client 运行时只依赖 Schema 和 Protocol，绝不依赖 Core 或 Server。SDK-Next（`@opencode-ai/sdk-next`）是惟一同时组合 Client、Core 和 Server 的包——它执行 Server 的 `HttpRouter` 于进程内，不开启网络监听。

4. Code Mode（`@opencode-ai/codemode`）是一个独立于 OpenCode 其他包的 host-neutral 库。它只依赖 `effect` 和 `acorn`（JavaScript 解析器），不依赖 Schema、Protocol、Core 或任何上层包。产品层（`packages/opencode/src/tool/code-mode.ts`）将其适配为权限可见的 MCP 工具 `execute`，受 `experimentalCodeMode` 标志控制。

---

## 2. 包地图 (Package Map)

| 包路径 | npm 名称 | 角色定位 | 运行时依赖 |
|--------|----------|----------|-----------|
| `packages/schema` | `@opencode-ai/schema` | 纯数据契约层。定义 Session、Permission、Event、Question 等共享 Schema 类型。零运行时行为，零副作用。浏览器安全。 | `effect` |
| `packages/protocol` | `@opencode-ai/protocol` | HTTP 路由定义层。将 Schema 值组合为路径、载荷、信封、错误、游标和流。拥有端点构造和中间件布置，Server 注入具体中间件键。 | `schema` + `effect` |
| `packages/llm` | `@opencode-ai/llm` | Effect Schema-first LLM 核心。定义 `LLMRequest` / `LLMEvent` / `LLMResponse` 通用数据模型；Route = Protocol + Endpoint + Auth + Framing 四轴组合。支持 OpenAI Chat/Responses、Anthropic Messages、Gemini、Bedrock Converse 等协议。 | `schema` + `effect` |
| `packages/core` | `@opencode-ai/core` | 领域逻辑中枢。Session 生命周期、System Context 代数（`initialize`/`reconcile`/`replace`）、工具注册与结算、权限检查（`DeclinedError`/`BlockedError`）、Drizzle + SQLite 持久化、文件系统、PTY 管理、Layer/Node 组合。 | `schema` + `llm` + `plugin` |
| `packages/server` | `@opencode-ai/server` | HTTP API 实现。使用 Protocol 的 `makeDefaultApi` 组装路由，注入具体 Location/SessionLocation 中间件键，作为权威 `HttpApi` 供 Client 代码生成。 | `core` + `protocol` |
| `packages/client` | `@opencode-ai/client` | Promise + Effect 双网络 SDK。从 Server 的权威 `HttpApi` 代码生成。根入口零 Effect，`/effect` 入口依赖 Effect + Schema + Protocol。浏览器安全。 | `schema` + `protocol` |
| `packages/sdk-next` | `@opencode-ai/sdk-next` | Effect 原生嵌入式宿主。在内存中执行 Server 的 `HttpRouter`，不开监听端口，不进行网络 I/O。导出 `OpenCode.create()` 和 `tools.register(...)`，替代原 `@opencode-ai/core/public` 门面。 | `client` + `core` + `server` |
| `packages/codemode` | `@opencode-ai/codemode` | Effect 原生受限代码执行。解析并解释 JavaScript 受限子集，仅通过显式 schema-described 工具暴露能力。主机拥有授权和持久化；Code Mode 拥有解析、沙箱边界和诊断。 | `effect` + `acorn` |
| `packages/opencode` | `opencode` | CLI / TUI 产品入口。组装所有包为可执行产品，包括交互式终端 UI（SolidJS + OpenTUI）。将 Code Mode 适配为 `execute` 工具，通过 MCP 工具目录暴露给模型。 | 所有上层包 + `codemode` |

> 版本：`packages/core/package.json` → `"version": "1.18.4"`，所有 workspace 包共享此版本。

---

## 3. 术语词汇表 (Term Glossary)

以下术语来自 CONTEXT.md 语言定义章节及关联关系章节，按字母序排列。

📌 **Admitted Prompt** — 已接受进 Session 收件箱但尚未对模型可见的持久用户输入。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Agent** — 为一次 Provider Turn 选定的 AI 角色，决定可用技能集和权限策略。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Agent Switch** — 切换 Session 的当前 Agent。如果改变了可用技能指导，则产生一条 Mid-Conversation System Message，但保持当前 Baseline System Context 不变。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Baseline System Context** — 在一个 Context Epoch 开始时渲染的完整 System Context，作为活跃的 provider-cache 前缀不变地复用。（→ [01-system-context](01-system-context.md)）

📌 **Compaction** — 启动新 Context Epoch 的操作。将当前完整 System Context 折叠进新的 baseline，从活跃模型历史中移除先前的 Mid-Conversation System Messages。（→ [01-system-context](01-system-context.md)）

📌 **Context Epoch** — 一段跨度，在此期间一个初始渲染的 System Context 保持为不可变的 provider-cache 基线。在 Compaction 完成、Session 移动或不兼容的上下文转换时结束。（→ [01-system-context](01-system-context.md)）

📌 **Context Epoch Clearing** — 移动 Session 时清除活跃 Context Epoch。目的地必须初始化完整基线后才能再推广 prompt。（→ [01-system-context](01-system-context.md)）

📌 **Context Snapshot** — 可覆盖的、模型隐藏的 JSON 状态，用于将每个 Context Source 与上次摄入 Provider Turn 的值进行比较。（→ [01-system-context](01-system-context.md)）

📌 **Context Source** — System Context 内一个独立观察的具类型值，由稳定键、JSON codec、无懈可击的加载器、纯基线/更新渲染器组成。（→ [01-system-context](01-system-context.md)）

📌 **Context Source Producer** — System Context Registry 中注册的、参与当前 System Context 组合的有序作用域贡献者。（→ [01-system-context](01-system-context.md)）

📌 **Date Context Source** — 最初保留宿主本地日历日期行为的 Context Source。可配置时区替换默认行为。（→ [01-system-context](01-system-context.md)）

📌 **Effect Layer / Node** — Effect-TS 依赖注入机制。1.18.4 引入 `LayerNode` 组合模型：模块暴露公开 `node`，内部使用私有实现 layer；`LayerNode.make/group/hoist/compile` 管理替换感知的组合。`export const layer` 仍存在于不相关模块，但核心系统已迁移至 Node 模型。（→ [05-effect-infra](05-effect-infra.md)）

📌 **Embedded OpenCode** — 作用域内的进程内宿主，在结构上扩展 OpenCode Client。通过 SDK-Next 的内存 HTTP 传输提供相同路由和处理器，同时暴露额外的同进程能力（如 `tools.register(...)`）。（→ [06-client-architecture](06-client-architecture.md)）

📌 **Generation Controls** — 与提供商无关的采样和输出控制（maxTokens、temperature、topP、topK、penalties、seed、stop），从提供商语义和兼容性字段中分离。（→ [04-llm-interaction](04-llm-interaction.md)）

📌 **HttpClient (Effect)** — Effect 环境提供的 HTTP 客户端抽象。Public API 返回 Effect 或 Stream 类型，不直接使用 web fetch。（→ [05-effect-infra](05-effect-infra.md)）

📌 **Instruction Discovery** — 发现全局和向上项目 `AGENTS.md` 文件的过程。发现的指令在下一个 Safe Provider-Turn Boundary 被持久摄入。（→ [01-system-context](01-system-context.md)）

📌 **LLM Protocol** — LLM 包中的语义 API 契约。拥有请求体构建（`body.from`）、体 schema（`body.schema`）、流式事件 schema（`stream.event`）和事件到 `LLMEvent` 的状态机（`stream.step`）。（→ [04-llm-interaction](04-llm-interaction.md)）

📌 **LLM Route** — Protocol + Endpoint + Auth + Framing 的四轴组合。每个提供商部署是一个简短的 `Route.make(...)` 调用，重用共享的 Protocol。（→ [04-llm-interaction](04-llm-interaction.md)）

📌 **Location** — Session 解析的作用域。决定文件系统权限、工具注册和解析的 PTY 工作目录。（→ [05-effect-infra](05-effect-infra.md)）

📌 **Location Service Map** — 按 Location 解析的服务注册表，用于在 Session drain 开始时发现放置位置。`buildLocationServiceMap` 在 hoist 时应用替换。（→ [05-effect-infra](05-effect-infra.md)）

📌 **Managed Tool Output File** — 在 OpenCode 共享 tool-output 目录下创建的临时文件，用于保留超出 Session History 大小限制的完整工具输出。（→ [03-tool-system](03-tool-system.md)）

📌 **Message Projection** — 为一次 Provider Turn 选定的模型可见会话历史，是完整 Session History 的一个投影子集。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Mid-Conversation System Message** — 一条持久的按时间顺序的指令，告知模型一个已变化的 Context Source 的新有效状态。一旦摄入即耐久保留。（→ [01-system-context](01-system-context.md)）

📌 **Model** — 一次 Provider Turn 选定的提供商模型。携带模型 ID、提供商 ID 和可执行 LLM Route。（→ [04-llm-interaction](04-llm-interaction.md)）

📌 **Model Request Options** — 从 Catalog 中选定的、提供商语义的模型设置。在 LLM 协议适配器编码为提供商请求前，先映射到提供商选项命名空间。（→ [04-llm-interaction](04-llm-interaction.md)）

📌 **Model Switch** — 切换选定的模型/提供商。保持当前 Context Epoch 和按时间顺序的对话历史。（→ [04-llm-interaction](04-llm-interaction.md)）

📌 **Model Tool Output** — Core 执行工具结果的有界投影，持久化在 Session History 中并回放给模型。（→ [03-tool-system](03-tool-system.md)）

📌 **Native Continuation Metadata** — 附加到助手内容的不透明协议形状数据。需要原生继续该内容的兼容模型才能使用（如推理签名或提供商托管的项目标识符）。（→ [04-llm-interaction](04-llm-interaction.md)）

📌 **OpenCode Client** — 从公共 `HttpApi` 派生的生成式 Promise 和 Effect API。Promise 根零 Effect、零 Core 依赖；`/effect` 入口依赖 Effect + Schema + Protocol。（→ [06-client-architecture](06-client-architecture.md)）

📌 **Page** — 一个有界有序结果，包含 `items` 和不透明 `previous` / `next` 游标链接，用于前后导航同一查询。（→ [06-client-architecture](06-client-architecture.md)）

📌 **Prompt Promotion** — 持久转换，将 Admitted Prompt 从 pending input 中移除，并将其用户消息追加到 Session History。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Provider Turn** — 一次对模型提供商的请求及该请求投射出的响应。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Provider-Turn Allowance** — 一次 Provider Turn 的许可计数器。推广任何新的用户输入会重置所选 Agent 的 Provider-Turn Allowance。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **PTY Environment** — 服务器创建 PTY 时应用的、由宿主提供的环境覆盖。合并调用方值、宿主覆盖和 Core 强制终端不变量（`TERM`、`OPENCODE_TERMINAL`）。（→ [05-effect-infra](05-effect-infra.md)）

📌 **Queued Prompt** — 一种显式排队输入，保持 pending 状态直到 Session 本应空闲。在空闲边界推广一条，然后重新评估是否需要继续。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Safe Provider-Turn Boundary** — 紧接提供商调用之前的时刻点，在持久输入推广和所需工具结算之后，上下文变化可在此按时间顺序摄入。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **SDK Contract IR** — 权威 `HttpApi` 的运行时中立编译表示，保留编码和解码类型投射及传输元数据，使独立的 SDK 发射器可以选择自己的公共值模型。（→ [06-client-architecture](06-client-architecture.md)）

📌 **Session** — 持久对话身份。拥有消息历史、选定的 Agent 和 Model、System Context 状态以及执行协调。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Session Drain** — 一次进程本地的执行跨度，推广符合条件的输入并运行所需的 Provider Turn，直到没有立即继续的需要。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Session Execution** — 进程本地的 Session 所有权协调。其本地实现拥有进程本地的 Session 协调器，仅在 drain 开始时通过 SessionStore + LocationServiceMap 发现放置位置。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Session History** — 为一次 Provider Turn 选定的投射式按时间顺序的对话。包含投射的对话消息和摄入的 Mid-Conversation System Messages。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Session ID** — Session 的稳定持久标识符。通过前缀 `ses_` 验证，在创建时生成。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Session Input** — Session 收件箱中一条持久的输入记录。Promotion 将其转换为模型可见的用户消息。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Session Run Coordinator** — 加入显式同 Session 续接的协调器，合并 prompt 唤醒，并允许不同 Session 并发运行。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **Skill** — 可加载的专门化指令体。为 Agent 提供特定任务的工作流和知识。在权限检查的 `skill` 工具中暴露。（→ [01-system-context](01-system-context.md)）

📌 **Skill Guidance** — 作为 Context Source 暴露的选定 Agent 可用技能指导。只列出该 Agent 允许的技能名称和描述。（→ [01-system-context](01-system-context.md)）

📌 **Steering Prompt** — 默认交付模式（steer）。在活跃 Session Drain 仍需继续时，于下一个 Safe Provider-Turn Boundary 推广。（→ [02-session-lifecycle](02-session-lifecycle.md)）

📌 **System Context** — 呈现给模型的结构化上下文事实集合。由 Context Sources 组合而成，在 Context Epoch 开始时渲染为不可变基线。（→ [01-system-context](01-system-context.md)）

📌 **System Context Registry** — Location 作用域的有序、作用域化生产者注册表，贡献当前 System Context。基于稳定贡献键组合。（→ [01-system-context](01-system-context.md)）

📌 **SystemContext.initialize** — 观察组合后的 System Context 一次，生成带有 Context Snapshot 的新鲜 Baseline System Context。（→ [01-system-context](01-system-context.md)）

📌 **SystemContext.reconcile** — 观察组合后的 System Context 一次，返回恰好一个下一步动作：不变、已更新、替换就绪或替换被阻止。（→ [01-system-context](01-system-context.md)）

📌 **SystemContext.replace** — 在 Compaction 完成或其他基线替换转换后渲染新的一代。（→ [01-system-context](01-system-context.md)）

📌 **Tool Output Bounding** — 对 Model Tool Output 施加大小限制的机制。保留文本输出的开始和结束部分到 Session History，完整文本移至 Managed Tool Output File。（→ [03-tool-system](03-tool-system.md)）

📌 **Tool Registry** — 强制执行 Model Tool Output 最终大小限制的注册表。工具可先施加自定义截断策略，再由 Registry 强制执行最终限制。（→ [03-tool-system](03-tool-system.md)）

📌 **Tool Settlement** — 一次工具操作完成后，对其 Model Tool Output 施加大小限制并发布一条持久结算形式的过程。这是中断安全的完成区域。（→ [03-tool-system](03-tool-system.md)）

📌 **Unavailable Context** — 对暂时无法观察 Context Source 值的预期。运行时保留其先前有效状态且不发出更新，或在首次成功加载前省略它。（→ [01-system-context](01-system-context.md)）

---

## 4. 术语分类索引 (Term Classification Index)

每个深层笔记覆盖的术语范围：

| 笔记 | 文件 | 覆盖术语 |
|------|------|----------|
| 01 | [notes/01-system-context.md](01-system-context.md) | System Context, Context Source, System Context Registry, Context Source Producer, SystemContext.initialize, SystemContext.reconcile, SystemContext.replace, Mid-Conversation System Message, Instruction Discovery, Skill Guidance, Skill, Date Context Source, Unavailable Context, Context Epoch, Baseline System Context, Context Snapshot, Compaction, Context Epoch Clearing |
| 02 | [notes/02-session-lifecycle.md](02-session-lifecycle.md) | Session, Session History, Session ID, Session Input, Session Drain, Session Execution, Session Run Coordinator, Provider Turn, Safe Provider-Turn Boundary, Admitted Prompt, Prompt Promotion, Steering Prompt, Queued Prompt, Provider-Turn Allowance, Message Projection, Agent, Agent Switch |
| 03 | [notes/03-tool-system.md](03-tool-system.md) | Model Tool Output, Managed Tool Output File, Tool Registry, Tool Settlement, Tool Output Bounding |
| 04 | [notes/04-llm-interaction.md](04-llm-interaction.md) | LLM Protocol, LLM Route, Model Request Options, Generation Controls, Native Continuation Metadata, Model Switch, Model |
| 05 | [notes/05-effect-infra.md](05-effect-infra.md) | Effect Layer / Node, LayerNode, Hoist, Replacement, AppNodeBuilder, buildLocationServiceMap, PTY Environment, Location, Location Service Map, HttpClient (Effect) |
| 06 | [notes/06-client-architecture.md](06-client-architecture.md) | OpenCode Client, Embedded OpenCode, SDK-Next, SDK Contract IR, Page |

---

## 5. 关键文件快速参考 (Key Files Quick Reference)

| 文件路径 | 角色 |
|----------|------|
| `packages/core/src/system-context/index.ts` | `SystemContext.make/combine/initialize/reconcile/replace`：核心代数；私有 `const observe`, `reconcileObservation` |
| `packages/core/src/session.ts` | `SessionV2`：Session 领域模型，生命周期与状态转换 |
| `packages/core/src/session/runner/llm.ts` | `runTurn`, `isUserDeclined`：LLM 执行管道，从 Session 到 Provider Turn 的完整编排 |
| `packages/core/src/session/compaction.ts` | `SUMMARY_TEMPLATE`, `compactIfNeeded`：Compaction 摘要模板与触发逻辑 |
| `packages/core/src/permission.ts` | `DeclinedError`, `BlockedError`, `assert`：权限分类：用户拒绝 vs 规则阻止 |
| `packages/llm/src/route/client.ts` | `Route.make`, `LLMClient.prepare/stream/generate`：LLM 路由客户端核心 API |
| `packages/llm/src/provider-error.ts` | `patterns`, `exclusions`, `isContextOverflow`：上下文溢出分类器（排除限流/429 误判） |
| `packages/protocol/src/api.ts` | `makeDefaultApi`, `makeApiFromGroup`：Protocol 拥有端点组和中间件布置 |
| `packages/server/src/api.ts` | `Api`：Server 注入具体中间件键，调用 Protocol 的 `makeDefaultApi` |
| `packages/codemode/src/codemode.ts` | `CodeMode.execute`, `CodeMode.make`：受限代码执行核心——解析、沙箱、工具调度、诊断 |
| `packages/opencode/src/tool/code-mode.ts` | `CODE_MODE_TOOL`, `CodeModeTool`：产品层适配器，将 MCP 工具暴露给 Code Mode |
| `packages/sdk-next/src/index.ts` | `OpenCode.create`, `tools.register`：嵌入式宿主，替代原 `@opencode-ai/core/public` 门面 |

---

## 6. 设计哲学 (Design Philosophy)

OpenCode 沿以下维度组织：

1. **Effect-TS 服务模型** — 所有副作用通过 Effect Layer/Node 注入，纯函数与副作用在类型层面分离。`Effect.gen` / `Effect.fn` 作为组合原语。1.18.4 引入 `LayerNode` 模型，使用公开 `node` 导出替代直接的 `export const layer` 门面。

2. **菱形依赖拓扑** — Schema 是底层契约，Core 和 Protocol 平行独立，Server 汇聚二者，Client 只接触 Schema + Protocol。SDK-Next 是唯一同时组合 Client + Core + Server 的包。Code Mode 是完全独立的 host-neutral 包。

3. **Session 原子单元** — Session 是持久对话的最小完整单元。每个 Session 拥有独立的消息历史、Agent/Model 选择、System Context 状态和执行协调。

4. **System Context 代数** — 模型上下文通过 immutable baseline + lazy reconciliation 管理。`SystemContext.initialize` → `reconcile` → `replace` 三操作构成完整的上下文生命周期。私有 `const observe`（文件内轮询）在模块外部不可访问。

---

*最后更新：2026-07-24 | 来源：`opencode-dev-new/AGENTS.md` + 各包 `package.json` 依赖 + 源代码探索*
