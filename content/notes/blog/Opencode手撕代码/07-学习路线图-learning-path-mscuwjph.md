---
blog: true
title: "07 — 学习路线图 (Learning Path)"
slug: "07-学习路线图-learning-path-mscuwjph"
summary: "07 — 学习路线图 (Learning Path) 一份从零到深入理解 OpenCode 核心架构的渐进式学习路线。 六阶段渐进路线 第一阶段：掌握词汇表（约 30 分钟） 目标 ：建立核心概念的直觉，不需要理解实现细节。 阅读材料 ： CONTEXT.md ，辅以00 — 总览与架构 CONTEXT.md 是 OpenCode 的术语词典。它定义了 Session History、System Context、Context Epo"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 07 — 学习路线图 (Learning Path)

> 一份从零到深入理解 OpenCode 核心架构的渐进式学习路线。

---

## 六阶段渐进路线

### 第一阶段：掌握词汇表（约 30 分钟）

**目标**：建立核心概念的直觉，不需要理解实现细节。

**阅读材料**：`CONTEXT.md`，辅以[00 — 总览与架构](00-overview.md)

`CONTEXT.md` 是 OpenCode 的术语词典。它定义了 Session History、System Context、Context Epoch、Provider Turn、Mid-Conversation System Message 等基础概念及其之间的关系。不要试图记住所有术语，重点是理解每个概念「是什么」和它「为什么存在」。读完你会知道：一个 Session 的生命周期是什么、系统上下文如何组装、Provider Turn 的流程边界在哪。

**产出**：能用自己的话解释 Session、Context Epoch、Provider Turn 三个概念。

---

### 第二阶段：理解数据形状（约 1 小时）

**目标**：建立对核心数据结构的形状感知，不做逻辑分析。

**阅读材料**：`packages/schema/src/` 目录下的以下文件

| 文件                   | 关注点             |
| -------------------- | --------------- |
| `session.ts`         | Session 的完整数据形状 |
| `session-input.ts`   | Prompt 输入的数据结构  |
| `session-message.ts` | 消息的 Schema 定义   |
| `session-event.ts`   | 事件的类型定义         |
| `prompt.ts`          | Prompt 相关的类型    |

**关键纪律**：只看类型（`Schema.Struct`、`type`、`interface`），不看实现代码。这一阶段的目的是在脑海中建立「数据长什么样」的地图。后面读核心逻辑时，你会不断回到这些 Schema 文件确认数据形状。

**产出**：能画出 Session 及其关联实体（Message、Event、Input）的 ER 图。

---

### 第三阶段：核心代数（约 1.5 小时）

**目标**：理解系统中最关键的三块逻辑。

**阅读顺序（严格按此序）**：

1. **`packages/core/src/system-context/index.ts`**

   System Context 是 OpenCode 最核心的抽象。理解 `SystemContext.make()`、`initialize()`、`reconcile()`、`replace()` 四个操作的语义。注意 `ContextSource` 如何组合、如何对比快照、如何生成 Mid-Conversation System Message。

2. **`packages/core/src/session/input.ts`**

   Prompt 的 admission 和 promotion 机制。理解 `SessionInput.admit()` 如何将用户输入持久化、`promotion` 如何将输入从 pending 转为 model-visible。这里是「用户敲下回车」到「模型看到输入」之间的完整链路。

3. **`packages/core/src/session/run-coordinator.ts`**

   Session 的执行调度器。理解它如何协调 Prompt promotion 和 Provider Turn 之间的时序关系——什么时候该继续执行、什么时候该等待新的输入。

**产出**：能画出从用户输入到 Provider Turn 被触发的完整时序。

---

### 第四阶段：追踪一次完整执行（约 2 小时）

**目标**：逐行阅读整个 AI 对话循环，理解数据如何在各个环节之间流转。

**阅读材料**：`packages/core/src/session/runner/llm.ts`

这是 OpenCode 的「大脑」。建议使用以下关键锚点逐段理解：

| 代码区域                   | 关键符号 | 关键逻辑                                           |
| ---------------------- | -------- | ---------------------------------------------- |
| `loadSystemContext`    | `prepareOnce` → `observe` → `reconcile` | 加载并准备 System Context baseline                  |
| `ContextEpoch.prepare` | `prepareOnce` 四个出口 | 初始化新的 Context Epoch                            |
| LLM 请求构造               | `runTurn` → request assembly | 组装 provider request（messages + system context） |
| 流式响应处理                 | `streamText` / streaming loop | 从 LLM 接收 streaming response                    |
| 工具调用结算                 | `settle` → tool registry | Tool call 的 settle 流程：执行工具、写入结果                |
| 外层 while 循环            | `run` outer loop | 整个 conversation loop 的循环控制                     |

阅读技巧：不要试图一次读完。每个锚点读完停下来，确认自己理解了「输入是什么、输出是什么、谁调用了它」。外层 while 循环是最后的综合——前面所有逻辑都在这个循环里被组织起来。

**产出**：能画出一次完整 Provider Turn 的流程图（从 system context 加载到 tool call settle 再到继续或退出）。

---

### 第五阶段：工具系统（约 1.5 小时）

**目标**：理解工具如何被注册、发现和调用。

**Core V2 工具系统：**

1. **`packages/core/src/tool/tool.ts`**

   `Tool.make()` 的 opaque 设计。理解工具的 Schema 定义、输入输出类型、以及「工具不可被外部构造」的设计意图。

2. **`packages/core/src/tool/registry.ts`**

   工具的注册和查找机制。理解 Tool Registry 如何根据名称解析工具、如何管理作用域。

3. **`packages/core/src/tool/AGENTS.md`**

   工具系统的设计文档。理解工具的设计哲学和扩展方式。

**Code Mode（实验性工具编排）：**

Code Mode 是 1.18.4 新增的受限 JavaScript 编排环境——模型编写小程序，在显式指定的工具树上顺序、分支、并行地调用工具，但不拥有环境权限。它由 `packages/codemode/` 提供核心解释器，再由 `packages/opencode/src/tool/code-mode.ts` 作为实验性 `execute` 工具暴露。深入阅读参考 [Code Mode 详解](Code Mode详解.md)。

**产出**：能解释一个工具从注册到被 LLM 调用执行的完整路径，以及 Code Mode 如何作为独立的工具编排层存在。

---

### 第六阶段：HTTP 层（约 30 分钟）

**目标**：理解 HTTP API 层如何组装路由、映射到核心逻辑。

**阅读材料**：

1. **`packages/protocol/src/groups/session.ts`**

   Protocol 定义 Session 端点组（`makeSessionGroup`）——包括 session 的 CRUD、prompt、events、messages 等操作。Protocol 拥有端点组、错误类型和中间件放置权；Server 通过 `HttpApiBuilder.group` 提供具体实现。

2. **`packages/server/src/handlers/session.ts`**

   Server 侧 Session 端点实现（`SessionHandler`）。理解 `POST /sessions/:id/prompt` 如何映射到 core 层的 `SessionInput.admit()` 和 run coordinator。

3. **`packages/server/src/routes.ts`**

   路由的顶层组装（`createRoutes`）。理解 Server 如何通过 `AppNodeBuilder.build` 组合 Database、EventV2、SessionV2、ToolOutputStore 等服务节点，并使用 `HttpApiBuilder.layer` 构建完整的 API 层。

**产出**：能从 HTTP 请求追踪到 core 层调用的完整路径——Protocol 定义契约 → Server 实现处理函数 → `routes.ts` 组装服务依赖。

---

## 核心文件优先级排名

按理解系统的必要性和优先级排列的前 12 个文件：

| Rank | 文件 | 为什么重要 |
|------|------|-----------|
| 1 | `packages/core/src/session/runner/llm.ts` | 大脑——整个 AI 对话循环 logic |
| 2 | `packages/core/src/system-context/index.ts` | System Context 代数——所有上下文管理的基石 |
| 3 | `packages/core/src/session/input.ts` | Prompt admission 和 promotion——用户输入的完整生命周期 |
| 4 | `packages/core/src/session/context-epoch.ts` | Context Epoch 管理——上下文版本控制的机制 |
| 5 | `packages/core/src/session/run-coordinator.ts` | 执行协调器——连接输入和 Provider Turn 的桥梁 |
| 6 | `packages/core/src/tool/registry.ts` | 工具注册和执行——Core Tool 系统的中枢 |
| 7 | `packages/core/src/session/compaction.ts` | 对话压缩——历史消息的裁剪算法 |
| 8 | `packages/core/src/session/projector.ts` | 事件溯源状态投影——Event 到 State 的转换 |
| 9 | `packages/core/src/tool/tool.ts` | `Tool.make()` 的 opaque 设计——工具抽象的基础 |
| 10 | `packages/protocol/src/groups/session.ts` | Session HTTP 端点契约——Protocol 拥有端点组定义 |
| 11 | `packages/server/src/routes.ts` | HTTP 路由组装——API 层的入口 |
| 12 | `packages/opencode/src/tool/code-mode.ts` | Code Mode 产品适配——将 codemode 库暴露为 execute 工具 |

---

## 完整学习顺序

按章节和深度探究的推荐阅读路径，共 22 篇笔记：

1. `Opencode的工作原理.md`
2. `00-overview.md`
3. `05-effect-infra.md`
4. `关于Effect-ts 中的Effect的理解.md`
5. `01-system-context.md`
6. `System Context部分的工作原理.md`
7. `make函数代码详解.md`
8. `observe代码详解.md`
9. `轮询式比较的调用链和相关代码.md`
10. `prepareOnce 的四个出口.md`
11. `02-session-lifecycle.md`
12. `会话输入与Prompt管理.md`
13. `admit()函数详解.md`
14. `projectAdmitted详解.md`
15. `run-coordinator.ts详解.md`
16. `Drain和Fiber.md`
17. `Session Runner 完整执行流程.md`
18. `03-tool-system.md`
19. `Code Mode详解.md`
20. `04-llm-interaction.md`
21. `06-client-architecture.md`
22. `07-learning-path.md`

---

## 关键心态

1. **不要试图理解一切。** OpenCode 的文件很多，但 80% 的核心行为集中在 `llm.ts`。先吃透这一个文件，其余的可以按需深挖。你不需要逐行读完每个文件才能开始理解系统。

2. **先理解 WHY 再理解 HOW。** 遇到不懂的代码，先问「这块逻辑为什么需要存在？」。大多数设计的答案都在 `CONTEXT.md` 的术语定义里。比如你看到 `reconcile()` 看不懂它为什么那么复杂，回到 CONTEXT.md 读 Context Snapshot 和 Safe Provider-Turn Boundary 的定义。

3. **Effect-TS 是基础设施，不是业务逻辑。** OpenCode 大量使用 Effect-TS 作为运行时。当你看到 `Effect.gen`、`Effect.provideService`、`Layer` 等模式时，先忽略它们。理解业务逻辑（数据怎么流转的），Effect 只是载体。读代码时关注 `yield*` 后面的实际操作，而不是 yield 本身。

4. **跟着一条数据流走。** 不要试图理解整个系统后再读代码。选一个具体场景（比如「用户输入一句话」），从 `prompt()` HTTP 端点一路追踪到 LLM 响应被 stream 回来。一条完整的端到端数据流胜过分散阅读十个文件。

---

## 完整对话流图

```
用户输入 (prompt)
      │
      ▼
┌─────────────────────────┐
│  HTTP 层                │
│  server/routes.ts       │  ← createRoutes → AppNodeBuilder.build
│  → handlers/session.ts  │    SessionHandler → HttpApiBuilder.group
│  → protocol/groups/     │    makeSessionGroup → 端点契约定义
│      session.ts         │
└─────────┬───────────────┘
          │ SessionInput.admit()
          ▼
┌─────────────────────┐
│  session/input.ts   │  ← Prompt admission: 持久化输入
│  admit()            │     生成 Admission 结果
│  promote()          │     将 pending input → model-visible message
└─────────┬───────────┘
          │
          ▼  (run coordinator 触发)
┌─────────────────────┐
│  run-coordinator.ts │  ← 判断是否应继续执行
│                     │     协调 prompt → turn 之间的时序
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  session/runner/llm.ts  (while 循环)         │
│                                              │
│  ┌──────────────────────────────┐            │
│  │ 1. loadSystemContext()       │            │
│  │    → system-context/index.ts │            │
│  │    → initialize/reconcile    │            │
│  └──────────────┬───────────────┘            │
│                 ▼                             │
│  ┌──────────────────────────────┐            │
│  │ 2. ContextEpoch.prepare()    │            │
│  │    → context-epoch.ts        │            │
│  └──────────────┬───────────────┘            │
│                 ▼                             │
│  ┌──────────────────────────────┐            │
│  │ 3. 构造 LLM Request          │            │
│  │    messages + system context  │            │
│  └──────────────┬───────────────┘            │
│                 ▼                             │
│  ┌──────────────────────────────┐            │
│  │ 4. Streaming Response        │            │
│  │    接收 LLM 流式输出          │            │
│  └──────────────┬───────────────┘            │
│                 ▼                             │
│          ┌──────┴──────┐                     │
│          │ 有 tool call?│                     │
│          └──────┬──────┘                     │
│          是     │     否                      │
│          ▼      │      ▼                      │
│  ┌───────────┐ │  ┌───────────────┐          │
│  │ 5. settle │ │  │ 返回 text     │          │
│  │  tool call│ │  │ 结束 turn     │          │
│  └─────┬─────┘ │  └───────────────┘          │
│        │       │                              │
│        ▼       │                              │
│  tool/registry  │                             │
│  .ts            │                             │
│        │       │                              │
│        ▼       │                              │
│  ┌─────────┐   │                              │
│  │ 继续循环│◄──┘                              │
│  │ (while) │                                  │
│  └─────────┘                                  │
└───────────────────────────────────────────────┘
          │
          ▼
     ┌──────────┐
     │ 返回响应  │
     │ 给用户    │
     └──────────┘
```

---

## 使用指南：如何配合源码阅读

这些笔记是源码走读的「导游手册」，不是替代品。建议使用方法：

1. **先通读**：每天开始前花 5 分钟浏览当前阶段的笔记，建立预期。
2. **打开源码**：在编辑器里用「跳转到定义」功能跟着读，不要只看笔记。
3. **做标记**：读到不理解的地方，在笔记上标注，读完后回头对照 `CONTEXT.md` 查术语定义。
4. **画图**：每读完一个阶段，用纸笔画一张自己理解的流程图。画不出来说明没读懂。
5. **交叉验证**：当你读到某段代码引用了之前读过的模块时，回到对应阶段的笔记确认理解是否一致。

---

## 笔记索引

本系列笔记共 22 篇，按推荐阅读顺序排列：

### 入口

| 编号 | 标题 | 内容 |
|------|------|------|
| — | [OpenCode 的工作原理](Opencode的工作原理.md) | 学习总控台——架构概览、模块状态、阅读路线 |

### 参考章节（8 篇）

| 编号 | 标题 | 内容 |
|------|------|------|
| [00](00-overview.md) | 总览与架构 | 项目总览、模块划分、技术栈、术语精简 |
| [01](01-system-context.md) | System Context 代数 | Context Source 组合、初始化、协调、替换 |
| [02](02-session-lifecycle.md) | Session 执行引擎 | Input admission、Run coordinator、LLM Runner、Compaction |
| [03](03-tool-system.md) | 工具系统 | Tool.make、Tool Registry、权限、Code Mode 边界 |
| [04](04-llm-interaction.md) | LLM 交互 | 请求构造、流式响应、上下文溢出、事件发布 |
| [05](05-effect-infra.md) | Effect 基础设施 | Layer/Node 组合模型、Service 注册、运行时 |
| [06](06-client-architecture.md) | 客户端架构 | Protocol/Server/Client/SDK-Next 职责与依赖 |
| **07** | 学习路线图 | 🠔 你在这里 |

### 深度探究（13 篇）

| 标题 | 内容 |
|------|------|
| [System Context 部分的工作原理](System Context部分的工作原理.md) | 类型擦除、轮询比较、baseline/snapshot 机制 |
| [make 函数代码详解](make函数代码详解.md) | `SystemContext.make` 源码走读：codec 闭包、类型擦除 |
| [observe 代码详解](observe代码详解.md) | 私有 `observe` 并发加载与 Unavailable 投影 |
| [轮询式比较的调用链和相关代码](轮询式比较的调用链和相关代码.md) | `reconcileObservation` 五阶段流程 |
| [prepareOnce 的四个出口](prepareOnce 的四个出口.md) | Context Epoch 初始化的四种互斥结果 |
| [关于 Effect-ts 中的 Effect 的理解](关于Effect-ts 中的Effect的理解.md) | Effect 描述与执行分离、ContextEpoch 双路径 |
| [会话输入与 Prompt 管理](会话输入与Prompt管理.md) | admit/promotion/projector 流程与 runner 集成 |
| [admit() 函数详解](admit()函数详解.md) | `SessionInput.admit` 源码逐行分析 |
| [projectAdmitted 详解](projectAdmitted详解.md) | 输入投影的事件写入与冲突检测 |
| [run-coordinator.ts 详解](run-coordinator.ts详解.md) | 单键串行/跨键并发状态机 |
| [Drain 和 Fiber](Drain和Fiber.md) | 进程本地 Drain 与 Effect Fiber 生命周期 |
| [Session Runner 完整执行流程](Session Runner 完整执行流程.md) | Runner 九阶段完整走读 |
| [Code Mode 详解](Code Mode详解.md) | 受限 JS 编排库：权限边界、工具树、execute 适配 |

---

最后更新：2026-07-24 | 来源：1.18.4 源码走读 + 本系列笔记
