---
blog: true
title: "OpenCode 的工作原理"
slug: "opencode-的工作原理-mscuwj2k"
summary: "OpenCode 的工作原理 基于 opencode dev 源码的完整学习笔记索引。本页是 单一入口 Hub ——架构速览、模块导航、推荐阅读顺序的集中入口。 所有笔记以实际源码为第一基准，旧笔记仅供参考。 核心架构（10 秒版） OpenCode 是一个 Effect TS 多包 AI 编程助手： 一次 Provider Turn 的完整路径： 笔记树导航（38 篇 本页） 01 — 项目架构与核心概念 | 笔记 | 核心内容 | "
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "01-项目架构与包结构-mscuwigy"
  - "01-核心入口与启动流程-mscuwiz4"
  - "01-核心概念名词表-mscuwj0z"
  - "02-layer与依赖注入-mscuwj12"
  - "02-fiber与scope-mscumzqz"
  - "03-schema包组织与导出-mscuwj3u"
  - "03-标识符与品牌类型-mscuwihm"
  - "03-核心实体schema-mscun018"
  - "03-事件与manifest-mscuwj4q"
  - "05-session创建与状态机-mscun046"
  - "05-context-epoch机制-mscuwj32"
  - "07-消息结构与角色-mscun0k4"
  - "07-系统提示组装-mscun0ij"
  - "07-工具定义注入-mscun0jg"
  - "07-缓存策略-mscun0im"
  - "08-工具声明与注册-mscun0k2"
  - "08-工具选择与权限-mscun0id"
  - "08-工具执行与结算-mscun0jf"
  - "08-输出截断与managed-output-mscun0jr"
  - "09-fork与fiber生命周期-mscun0jo"
  - "09-取消与中断传播-mscun0jy"
  - "09-错误处理与supervisor-mscun0jr"
  - "10-快照创建与存储-mscun0jo"
  - "10-快照恢复与回滚-mscun0jq"
---

# OpenCode 的工作原理

> 基于 `opencode-dev` 源码的完整学习笔记索引。本页是**单一入口 Hub**——架构速览、模块导航、推荐阅读顺序的集中入口。
> 所有笔记以实际源码为第一基准，旧笔记仅供参考。

## 核心架构（10 秒版）

OpenCode 是一个 Effect-TS 多包 AI 编程助手：

```
Schema（纯数据契约）→ Core（领域逻辑）+ Protocol（HTTP 路由）
→ Server（HTTP API）→ Client（Promise + Effect SDK）→ SDK-Next（嵌入式宿主）
```

一次 Provider Turn 的完整路径：

```
用户输入 → SessionInput.admit() → RunCoordinator 调度 → SessionRunner.runTurn()
→ ContextEpoch.prepare() → SessionHistory.entriesForRunner()
→ LLM.request({ system, messages, tools }) → LLMClient.stream()
→ 工具结算 settle() → 事件发布 → 循环/结束
```

## 笔记树导航（38 篇 + 本页）

### 01 — 项目架构与核心概念

| 笔记               | 核心内容                                |
| ---------------- | ----------------------------------- |
| [[01-项目架构与包结构]]  | 36 个包的用途、依赖拓扑、设计原则                  |
| [[01-核心入口与启动流程]] | CLI / Server / TUI / Desktop 入口与启动链 |
| [[01-核心概念名词表]]   | CONTEXT.md 全部术语定义（20+ 概念）           |

### 02 — 前置知识：TypeScript 与 Effect-TS

| 笔记                    | 核心内容                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| [[02-TypeScript核心语法]] | Schema.Class、Branded Types、Discriminated Unions、Effect\<A,E,R\> 等 8 个模式 |
| [[02-Effect-TS核心范式]]  | Effect 惰性描述、Effect.gen、yield*、pipe、Stream                               |
| [[02-Layer与依赖注入]]     | Layer 配方、Effect.Service、Location-scoped 服务、Node 模式                      |
| [[02-Fiber与Scope]]    | Fiber 绿色线程、FiberSet、Scope 资源管理、Supervisor                               |

### 03 — Schema 数据契约

| 笔记 | 核心内容 |
|------|----------|
| [[03-Schema包组织与导出]] | 64 个文件的分类、barrel export、命名约定 |
| [[03-标识符与品牌类型]] | ID 品牌模式、ascending/descending 算法、5 种 ID 类型 |
| [[03-核心实体Schema]] | Session、Agent、Model、Provider、Permission、SessionMessage 等 8 组实体 |
| [[03-事件与Manifest]] | Event.define()、EventManifest、28 种 SessionEvent、事件溯源模式 |

### 04 — 整体工作链条

| 笔记 | 核心内容 |
|------|----------|
| [[04-全链路概览]] | Provider Turn 完整调用链（9 步，每步含函数名和 file:line） |
| [[04-Server请求处理]] | 路由组装、18 个 Handler、Protocol 端点、中间件 |
| [[04-LLM协议适配层]] | LLM.request、Route.make 四轴模型、6 协议适配器、12 Provider |

### 05 — Session 生命周期与执行

| 笔记 | 核心内容 |
|------|----------|
| [[05-Session创建与状态机]] | Session.Info、DB 表、生命周期状态转换、admit + wake 双阶段 |
| [[05-Context-Epoch机制]] | initialize/prepare/replace/reset 四函数、四出口决策树、baseline 不可变性 |
| [[05-Runner执行循环]] | runTurn() 双层 while 循环、10 阶段流程、toLLMMessages 翻译 |
| [[05-Compaction与历史管理]] | select() 分割、buildPrompt() 增量摘要、compactIfNeeded() 触发、entriesForRunner() 过滤 |
| [[05-会话输入与Prompt管理]] | admit() 接纳→投影→提升、Steer vs Queue、projector 事件→消息映射 |

### 06 — System Context 管理

| 笔记 | 核心内容 |
|------|----------|
| [[06-Context-Source与Registry]] | Source\<A\> 代数、make/combine/initialize/reconcile/replace、Registry、5 个内置 Source |
| [[06-Baseline与Snapshot]] | Generation、session_context_epoch 表、stale-while-revalidate、prepareOnce 流程 |
| [[06-Mid-Conversation更新]] | 6 步端到端链路：reconcile → ContextUpdated → projector → Message.system() |

### 07 — LLM 上下文构成

| 笔记 | 核心内容 |
|------|----------|
| [[07-消息结构与角色]] | 双消息系统（SessionMessage vs LLM Message）、8 种消息类型、toLLMMessage 翻译矩阵 |
| [[07-系统提示组装]] | loadSystemContext() 三源并发、agent.system + baseline 拼接、LLMRequest.system vs Message.system() |
| [[07-工具定义注入]] | materialize() 三阶段、ToolDefinition Schema、tools/toolChoice 注入 |
| [[07-缓存策略]] | CacheHint、auto 断点放置、四 Provider 行为对照、用量追踪 |

### 08 — 工具调用 Pipeline

| 笔记 | 核心内容 |
|------|----------|
| [[08-工具声明与注册]] | Tool.make() 工厂、12 个内置工具、两级注册（Location + Application） |
| [[08-工具选择与权限]] | Permission.Rule 三元组、whollyDisabled、PermissionV2.assert()、agent mode |
| [[08-工具执行与结算]] | tool_call → settle → ToolResult 五阶段、FiberSet 并行、failInterruptedTools |
| [[08-输出截断与Managed-Output]] | preview() 头尾采样、2000 行/50KB 限制、Managed Output File 7 天保留 |

### 09 — Fiber 调度与并发控制

| 笔记 | 核心内容 |
|------|----------|
| [[09-Fork与Fiber生命周期]] | fork 四元组、FiberSet 模式、RunCoordinator 单键串行/跨键并发 |
| [[09-取消与中断传播]] | interrupt 端到端传播、uninterruptibleMask 临界区、Deferred 信号 |
| [[09-错误处理与Supervisor]] | RunError union、TaggedError、catchTag/mapError、为何不用 Supervisor |

### 10 — 快照机制

| 笔记 | 核心内容 |
|------|----------|
| [[10-快照创建与存储]] | Git Tree SHA 作为 Snapshot ID、bare repo 存储、capture 流程 |
| [[10-快照恢复与回滚]] | Revert.State、stage/clear/commit 三操作、ContextEpoch.reset() |

### 11 — 内部 Pipeline 详解

| 笔记 | 核心内容 |
|------|----------|
| [[11-Provider-Turn完整流程]] | runTurn() 7 步终极拆解（每步含函数名、file:line、输入输出、副作用） |
| [[11-事件系统与持久化]] | EventBus 三层 PubSub、Durable/Live-Only、commitDurableEvent 事务、Projector 模式 |
| [[11-插件与Skill系统]] | Plugin 生命周期、7 种 Hook、3 种 Skill Source、SkillGuidance 作为 Context Source |

## 推荐阅读顺序

**第一阶段：建立全局感**
1. [[01-项目架构与包结构]] → [[01-核心概念名词表]]
2. [[04-全链路概览]]（最重要的单篇笔记）

**第二阶段：理解基础设施**
3. [[02-TypeScript核心语法]] → [[02-Effect-TS核心范式]] → [[02-Layer与依赖注入]] → [[02-Fiber与Scope]]

**第三阶段：数据契约**
4. [[03-Schema包组织与导出]] → [[03-标识符与品牌类型]] → [[03-核心实体Schema]] → [[03-事件与Manifest]]

**第四阶段：核心机制**
5. [[05-Session创建与状态机]] → [[05-Context-Epoch机制]] → [[05-Runner执行循环]]
6. [[06-Context-Source与Registry]] → [[06-Baseline与Snapshot]] → [[06-Mid-Conversation更新]]

**第五阶段：LLM 与工具**
7. [[07-消息结构与角色]] → [[07-系统提示组装]] → [[07-工具定义注入]]
8. [[08-工具声明与注册]] → [[08-工具执行与结算]] → [[08-输出截断与Managed-Output]]

**第六阶段：深入**
9. [[09-Fork与Fiber生命周期]] → [[09-取消与中断传播]] → [[09-错误处理与Supervisor]]
10. [[10-快照创建与存储]] → [[10-快照恢复与回滚]]
11. [[11-Provider-Turn完整流程]] → [[11-事件系统与持久化]] → [[11-插件与Skill系统]]

## 源码根目录

所有源码引用均相对于 `opencode-dev/`，格式为 `packages/xxx/src/yyy.ts:NN-MM`。

核心包：
- `packages/schema/src/` — 纯数据契约（64 个 .ts 文件）
- `packages/core/src/` — 领域逻辑（session、tool、system-context、event 等）
- `packages/llm/src/` — LLM 抽象层（provider、protocol、route）
- `packages/server/src/` — HTTP API 服务
- `packages/protocol/src/` — HTTP 协议定义
- `packages/client/src/` — 客户端 SDK
