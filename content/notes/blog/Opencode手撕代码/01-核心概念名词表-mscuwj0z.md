---
blog: true
title: "01-核心概念名词表"
slug: "01-核心概念名词表-mscuwj0z"
summary: "树节点：01 核心概念名词表 父节点：01 项目架构与包结构 子节点：无 01 核心概念名词表 本文档提取 opencode dev/CONTEXT.md （225 行）中定义的全部核心术语，并补充 AGENTS.md 中的架构概念。术语定义以 CONTEXT.md 的 Language 节（ :5 86 ）和 Relationships 节（ :88 199 ）为准。 格式： English Term — 中文解释 原文定义 来源行号"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "01-项目架构与包结构-mscuwigy"
---

> 树节点：01-核心概念名词表
> 父节点：[[01-项目架构与包结构]]
> 子节点：无

# 01-核心概念名词表

本文档提取 `opencode-dev/CONTEXT.md`（225 行）中定义的全部核心术语，并补充 `AGENTS.md` 中的架构概念。术语定义以 CONTEXT.md 的 **Language** 节（`:5-86`）和 **Relationships** 节（`:88-199`）为准。

> 格式：**English Term** — 中文解释 + 原文定义 + 来源行号

---

## 核心架构术语

### System Context（系统上下文）
**中文**：呈现给模型的上下文事实的结构化集合，作为初始指令和时序更新。

> "The structured collection of contextual facts presented to the model as initial instructions and chronological updates."
> — `CONTEXT.md:7-9`

**避免称**：System prompt（CONTEXT.md:9）

### Session History（会话历史）
**中文**：经过活跃的 compaction 和 Context Epoch 截断后，为 Provider Turn 选定的投影后按时间顺序排列的对话。

> "The projected chronological conversation selected for a provider turn after applying the active compaction and Context Epoch cutoffs."
> — `CONTEXT.md:11-13`

**避免称**：Session Context（CONTEXT.md:13）

### Context Source（上下文源）
**中文**：System Context 中一个独立观察的类型化值，由稳定键、JSON 编解码器、无失败加载器、纯 baseline/update 渲染器和可选的移除渲染器表示。

> "One independently observed typed value within the System Context, represented by a stable key, JSON codec, infallible loader, pure baseline/update renderers, and an optional removal renderer for dynamic sources."
> — `CONTEXT.md:15-17`

**避免称**：Prompt fragment（CONTEXT.md:17）

### System Context Registry（系统上下文注册表）
**中文**：Location 作用域内的有序、作用域化生产者注册表，为当前 System Context 贡献源。

> "The Location-scoped registry of ordered, scoped producers that contribute to the current System Context."
> — `CONTEXT.md:19-20`

### Context Epoch（上下文纪元）
**中文**：一个跨度，在此期间一个初始渲染的 System Context 保持为不可变的 provider-cache 基线。在完成 compaction、Session 移动或需要新基线的不兼容上下文转换时结束。

> "The span during which one initially rendered System Context remains the immutable provider-cache baseline, ending at completed compaction, Session movement, or an incompatible context transition that requires a fresh baseline."
> — `CONTEXT.md:26-27`

### Baseline System Context（基线系统上下文）
**中文**：在 Context Epoch 开始时渲染的完整 System Context。持久化存储并在 Epoch 内跨进程重启复用。

> "The full System Context rendered at the start of a Context Epoch."
> — `CONTEXT.md:29-30`

**补充**（`:130-132`）："A Baseline System Context is stored durably and reused verbatim across process restarts within its Context Epoch."

**避免称**：Live system prompt（CONTEXT.md:31）

### Context Snapshot（上下文快照）
**中文**：模型隐藏的可覆盖 JSON 状态，用于比较每个 Context Source 与上次被 Provider Turn 接受的值。

> "The overwriteable model-hidden JSON state used to compare each Context Source with the value last admitted to a provider turn."
> — `CONTEXT.md:33-34`

### Mid-Conversation System Message（会话中系统消息）
**中文**：一条持久的按时间顺序的指令，告诉模型某个 Context Source 变更后的新有效状态。

> "A durable chronological instruction that tells the model the newly effective state of a changed Context Source."
> — `CONTEXT.md:22-24`

**关键行为**（`:94-97`）：
- 多个 Context Source 在一次 safe boundary 的变更合并为一条消息
- 与对应的 Context Snapshot 原子性地推进
- 即使后续 provider attempt 失败，消息仍持久保留

**避免称**：System update, system notification, raw text diff（CONTEXT.md:24）

### Safe Provider-Turn Boundary（安全 Provider-Turn 边界）
**中文**：Provider 调用前的时刻——在持久化输入提升和所有工具结算之后——此时上下文变更可以按时间顺序被接受。

> "The point immediately before a provider call, after durable input promotion and any required tool settlement, where context changes may be admitted chronologically."
> — `CONTEXT.md:39-40`

### Unavailable Context（不可用上下文）
**中文**：预期内暂时无法观察 Context Source 值的情况；运行时保留其先前的有效状态且不发出更新，或在首次成功加载前省略它。使用 stale-while-revalidate 语义。

> "An expected temporary inability to observe a Context Source value; the runtime retains its prior effective state and emits no update, or omits it until first successfully loaded."
> — `CONTEXT.md:36-37`

---

## 输入与提示术语

### Admitted Prompt（已接收入站提示）
**中文**：已持久接受到 Session 收件箱但尚未包含在 Session History 中的用户输入。是可重放的待处理输入。

> "A durable user input accepted into the Session inbox but not yet included in Session History."
> — `CONTEXT.md:42-43`

### Prompt Promotion（提示提升）
**中文**：将 Admitted Prompt 从待处理输入中移除并将其用户消息追加到 Session History 的持久化转换。

> "The durable transition that removes an Admitted Prompt from pending input and appends its user message to Session History."
> — `CONTEXT.md:45-46`

**关键行为**（`AGENTS.md:159`）：
- Steer prompt 在当前 drain 需要延续时，在下一个 safe boundary 提升
- Queue prompt 在 Session 即将空闲时才提升
- 提升任何新用户输入会重置 agent 的 provider-turn 配额

---

## 执行术语

### Provider Turn（Provider 回合）
**中文**：一次对模型提供者的请求及从该请求投影出的响应。

> "One request to a model provider and the response projected from that request."
> — `CONTEXT.md:48-49`

### Session Drain（会话排空）
**中文**：一个进程本地执行跨度，提升符合条件的输入并运行所需的 Provider Turn，直到没有立即延续。无持久化身份或转录边界。

> "One process-local execution span that promotes eligible input and runs required Provider Turns until no immediate continuation remains."
> — `CONTEXT.md:51-52`

**补充**（`AGENTS.md:158`）："A drain has no durable identity or transcript boundary."

### Model Tool Output（模型工具输出）
**中文**：Core 执行的工具结果的有界投影，持久化在 Session history 中并重放给模型。工具可以语义化地塑造此投影，但工具注册表强制执行最终大小限制。

> "The bounded projection of a Core-executed tool result persisted in Session history and replayed to the model."
> — `CONTEXT.md:54-55`

**截断规则**（`:190-192`）：
- 使用配置的最大行数或 UTF-8 字节数（先到达者为准）
- 通用截断保留文本的开头和结尾
- 工具可以在注册表执行最终限制前应用更有意义的策略

### Managed Tool Output File（受管理工具输出文件）
**中文**：在 OpenCode 共享工具输出目录下创建的临时文件，用于保留对于 Session history 过大无法容下的完整输出。

> "A temporary file created under OpenCode's shared tool-output directory to retain complete output that was too large for Session history."
> — `CONTEXT.md:57-58`

**关键属性**（`:193-198`）：
- 使用全局唯一名称，在单一扁平目录中
- 绝对路径可供普通工具读取和搜索
- 临时文件可能在保留期后过期
- 有界 Model Tool Output（非文件）是持久的可重放记录

### PTY Environment（PTY 环境）
**中文**：服务器在创建 PTY 时应用的主机提供环境覆盖，针对请求的 Location 和解析的 PTY 工作目录观察。

> "The host-supplied environment overlay applied by the server when creating a PTY."
> — `CONTEXT.md:70-71`

**合并顺序**（`:138`）：调用方值 → 主机覆盖 → Core 强制终端不变量（`TERM`、`OPENCODE_TERMINAL`）

---

## 客户端与 SDK 术语

### OpenCode Client（OpenCode 客户端）
**中文**：从公开 `HttpApi` 派生的生成 Promise 和 Effect API。Embedded OpenCode 通过内存 `HttpClient` 对相同路由和 handler 共享 Effect API。

> "The generated Promise and Effect APIs derived from the public HttpApi."
> — `CONTEXT.md:73-74`

**避免称**：Remote client（CONTEXT.md:75）

### Embedded OpenCode（嵌入式 OpenCode）
**中文**：一个作用域化的进程内 host，结构上扩展 OpenCode Client，提供内存 HTTP 传输并直接暴露额外的同进程能力。

> "A scoped in-process host that structurally extends the OpenCode Client, supplies an in-memory HTTP transport, and exposes additional same-process capabilities directly."
> — `CONTEXT.md:80-81`

**关键属性**（`:141-142`）：
- 创建是作用域化的——关闭所属 Scope 释放进程内服务器资源
- 暴露共享客户端能力和嵌入独有能力在同一对象上

**避免称**：Local implementation（CONTEXT.md:82）

### SDK Contract IR（SDK 契约中间表示）
**中文**：权威 `HttpApi` 的运行时中立编译表示，保留编码和解码的类型投影及传输元数据，使独立的 SDK 发射器可选择其公共值模型和运行时解释器。

> "The runtime-neutral compiled representation of the authoritative HttpApi."
> — `CONTEXT.md:77-78`

### Page（分页）
**中文**：包含 `items` 和不透明 `previous`/`next` 游标链接的有界有序结果，用于双向导航同一查询。

> "A bounded ordered result containing items and opaque previous and next cursor links for navigating the same query in either direction."
> — `CONTEXT.md:84-85`

**避免称**：Response envelope（CONTEXT.md:86）

---

## 模型选项术语

### Model Request Options（模型请求选项）
**中文**：provider-semantic 的模型设置，在 LLM 协议适配器为 provider 请求编码之前，从 Catalog 和活跃 Session variant 中选定。

> "Provider-semantic model settings selected from the Catalog and active Session variant before the LLM protocol adapter encodes them for a provider request."
> — `CONTEXT.md:60-62`

**避免称**：Request body, wire options（CONTEXT.md:62）

### Generation Controls（生成控制）
**中文**：provider-neutral 的采样和输出控制，在模型元数据进入 Catalog 时与 provider 语义和兼容性字段分离。

> "Provider-neutral sampling and output controls, partitioned from provider semantics and compatibility wire fields when model metadata enters the Catalog."
> — `CONTEXT.md:64-65`

### Native Continuation Metadata（原生延续元数据）
**中文**：附加到 assistant 内容的不透明协议形状数据，需要用兼容模型原生继续该内容，例如推理签名或 provider 托管的 item 标识符。

> "Opaque protocol-shaped data attached to assistant content and required to continue that content natively with a compatible model."
> — `CONTEXT.md:67-68`

**关键行为**（`:135`）：仅在精确匹配源 provider/model 时投射；失败和不同模型时省略。

---

## 系统架构关系

以下关系摘自 `CONTEXT.md:88-199`：

### System Context 关系
- System Context 是零或多个 Context Source 组成的不透明载体（`:90`）
- System Context Registry 按稳定贡献键顺序评估 producer，保持渲染结果确定（`:109`）
- `SystemContext.initialize(...)` 生成新的 Baseline 和 Snapshot（`:111`）
- `SystemContext.reconcile(...)` 返回四种行动之一：unchanged / updated / replacement ready / replacement blocked（`:112`）

### Session 与输入关系
- 首个 Provider Turn 渲染 Baseline System Context 并初始化 Snapshot，不发出冗余 Mid-Conversation System Message（`:105`）
- 初始 System Context 准备在首次 durable input promotion 之前（`:106`）
- Compaction 以新 Baseline 和新 Snapshot 开始新 Context Epoch（`:107`）
- 移动 Session 会清除其活跃 Context Epoch（`:118`）

### 工具输出关系
- 工具操作成功后，bounding Model Tool Output 和发布其持久结算构成中断安全完成区（`:195`）
- 失败保留 Managed Tool Output File 不会将成功操作变成失败（`:194`）

### 客户端契约
- 共享公共记录是 `Schema.Struct` 声明的纯对象（`:205`）
- `sessions.events(...)` 是持久化 Session 事件流，有 replay 保证（`:165`）
- `events.subscribe()` 是实例级实时流，无 replay 保证（`:166`）
- `sessions.prompt(...)` 暴露 `resume?: boolean`（`:180`）
- `sessions.create(...)` 接受可选 `location`（`:182`）

---

## AGENTS.md 中的额外架构概念

### V2 Session Core
- 持久化 prompt admission 与模型执行分离（`AGENTS.md:153`）
- `SessionExecution` 是进程全局的，基于 Session-ID（`AGENTS.md:155`）
- Session RunCoordinator 允许不同 Session 并发运行（`AGENTS.md:158`）

### System Context 代数
- System Context algebra、registry 和 built-in 位于 `src/system-context`（`AGENTS.md:161`）
- Context Source producer 与其观察域保持在一起

### Effect 设计模式
- 使用 `Effect.gen(function* () { ... })` 组合（`packages/opencode/AGENTS.md`）
- `makeRuntime` 用于所有服务；`InstanceState` 用于按目录状态
- 使用 `Effect.forkIn(scope)` fork fiber，不存在 `Effect.fork` / `Effect.forkDaemon`（v4 beta API）
