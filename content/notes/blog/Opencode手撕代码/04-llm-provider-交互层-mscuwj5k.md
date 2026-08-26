---
blog: true
title: "04 — LLM/Provider 交互层"
slug: "04-llm-provider-交互层-mscuwj5k"
summary: "04 — LLM/Provider 交互层 一次 Provider Turn 从请求组装到响应投影的完整生命周期。 1. Provider Turn 生命周期 1.1 定义 📌 Provider Turn : One request to a model provider and the response projected from that request. 一次 Provider Turn 就是\"调用一次 LLM\"。包括组装请求"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 04 — LLM/Provider 交互层

一次 Provider Turn 从请求组装到响应投影的完整生命周期。

---

## 1. Provider Turn 生命周期

### 1.1 定义

> 📌 **Provider Turn**: *One request to a model provider and the response projected from that request.*

一次 Provider Turn 就是"调用一次 LLM"。包括组装请求、发送到 Provider、流式接收响应、将响应事件投射为持久化的 SessionEvent。

### 1.2 源码主循环结构

主循环分布在三个嵌套函数中（`packages/core/src/session/runner/llm.ts`）：

| 函数 | 符号 | 职责 |
|------|------|------|
| `run()` | `SessionRunner.run` | 最外层：处理 queue/steer 输入，驱动 drain 循环 |
| `runTurn()` | `SessionRunner.runTurn` | 中间层：调用 `runTurnAttempt`，捕获 compaction 异常后递归重试 |
| `runTurnAttempt()` | `SessionRunner.runTurn` (inner) | 核心层：一次完整的 Provider Turn |

### 1.3 8 步完整流程

一次 `runTurnAttempt()` 的内部流程：

```
Step 1: Location 校验
    └── 确认 Session 的 Location 与当前进程一致，否则中断

Step 2: System Context 准备
    └── SessionContextEpoch.initialize() 尝试初始化新 epoch
    └── 若已初始化则调用 SessionContextEpoch.prepare() 做 reconcile

Step 3: 输入提升（Promotion）
    └── steer 立即提升；queue 在当前 drain 将空闲时提升一条
    └── 提升任何新输入后 reset currentStep = 1

Step 4: Model 解析
    └── models.resolve(session) 解析模型/Provider/参数

Step 5: LLM 请求组装
    └── 三源合一（详见第 2 节）

Step 6: Compaction 检查
    └── compactIfNeeded() 判断是否需要压缩上下文

Step 7: 流式 Provider 调用
    └── llm.stream(request) + Stream.runForEach 逐事件处理
    └── 事件类型：text-delta, reasoning-delta, tool-call, step-finish, provider-error

Step 8: 后处理与结算
    └── 处理失败/中断/tool fiber 结算
    └── isUserDeclined() 检测用户拒绝后触发中断（详见 §1.5）
    └── 发布 SessionEvent.Step.Ended（含 snapshot diff + token 统计）
    └── 返回 needsContinuation + step 决定是否继续下一 turn
```

### 1.4 Drain 循环

```typescript
// llm.ts: SessionRunner.run — 简化逻辑
const run = function* (input) {
  while (shouldRun) {
    let needsContinuation = true
    let step = 1
    while (needsContinuation) {
      const result = yield* runTurn(sessionID, promotion, step)
      needsContinuation = result.needsContinuation  // 是否还有 tool call 需要继续
      step = result.step + 1
      promotion = "steer"
      if (!needsContinuation)
        needsContinuation = yield* hasPendingSteer()  // 检查是否有新 steer 输入
    }
    shouldRun = yield* hasPendingQueue()  // 检查是否有 queue 输入
  }
}
```

**关键点**：Drain 是进程本地的执行区间，没有持久化身份。如果进程崩溃，恢复时从持久化的 events 重放，而不是"恢复上次的 Drain"。

### 1.5 用户拒绝中断（`isUserDeclined`）

当 tool fiber 执行期间用户拒绝了权限请求，Runner 通过 `isUserDeclined()` 检测并触发中断（`packages/core/src/session/runner/llm.ts`）：

```typescript
const isUserDeclined = (cause: Cause.Cause<unknown>) =>
  cause.reasons.some(
    (reason) =>
      Cause.isDieReason(reason) &&
      (reason.defect instanceof PermissionV2.DeclinedError || reason.defect instanceof QuestionV2.RejectedError),
  )
```

调用点（llm.ts: `SessionRunner.runTurn` 的后处理分支）：
```typescript
const settled = yield* restore(awaitToolFibers(toolFibers)).pipe(Effect.exit)
if (settled._tag === "Failure" && isUserDeclined(settled.cause)) {
  yield* FiberSet.clear(toolFibers)
  yield* withPublication(publisher.failUnsettledTools("Tool execution interrupted"))
  return yield* Effect.interrupt
}
```

**行为说明**：
- 用户**拒绝**（DeclinedError）或**拒绝提问**（QuestionV2.RejectedError）均触发中断
- 中断前清理 fiber set 并发布未完成工具的失败事件
- 这避免了将用户的拒绝行为反馈给模型（V1 的做法保持不变）

---

## 2. LLM 请求组装：三源合一

### 2.1 核心代码

```typescript
// llm.ts: SessionRunner.runTurn — request 组装
const request = LLM.request({
  model,
  providerOptions: { openai: { promptCacheKey } },
  system: [agent.info?.system, system.baseline]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .map(SystemPart.make),
  messages: [...toLLMMessages(context, model), ...(isLastStep ? [Message.assistant(MAX_STEPS_PROMPT)] : [])],
  tools: toolMaterialization?.definitions ?? [],
  toolChoice: isLastStep ? "none" : undefined,
})
```

### 2.2 三源架构图

```
                        ┌─────────────────────────────────────┐
                        │         LLM.request({})             │
                        │       一次 Provider 调用的全部输入    │
                        └──────────────┬──────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
   ┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
   │  system: [...]   │    │  messages: [...]     │    │  tools: [...]       │
   │  System Prompt   │    │  Session History     │    │  Tool Definitions   │
   └────────┬────────┘    └──────────┬──────────┘    └──────────┬──────────┘
            │                        │                          │
   ┌────────▼────────┐    ┌──────────▼──────────┐    ┌──────────▼──────────┐
   │ 来源：           │    │ 来源：              │    │ 来源：              │
   │ SystemContext    │    │ SessionHistory      │    │ ToolRegistry        │
   │ Registry.load()  │    │ .entriesForRunner() │    │ .materialize()      │
   │ + agent.system   │    │ + toLLMMessages()   │    │                     │
   ├─────────────────┤    ├─────────────────────┤    ├─────────────────────┤
   │ 生命周期：        │    │ 生命周期：           │    │ 生命周期：           │
   │ ContextEpoch 级   │    │ 随对话增长           │    │ 随 agent/权限变化    │
   │ baseline 不变     │    │ compaction 后压缩    │    │ 每 turn 可能不同     │
   ├─────────────────┤    ├─────────────────────┤    ├─────────────────────┤
   │ 管理方式：        │    │ 管理方式：           │    │ 管理方式：           │
   │ reconcile 检查    │    │ 投影 + 截断          │    │ 权限过滤 + 定义生成  │
   │ 变化 → Mid-Conv   │    │ ContextEpoch cutoffs │    │ materialize =        │
   │ System Message    │    │                      │    │ definitions + settle │
   └──────────────────┘    └──────────────────────┘    └──────────────────────┘
```

### 2.3 源 #1: System Prompt（system 字段）

**来源**：`loadSystemContext()`（llm.ts: `SessionRunner.runTurn` 内部）并发加载三个 Context Source 组：

```typescript
const loadSystemContext = (agent) =>
  Effect.all([
    systemContext.load(),        // 内置 + 注册的 Context Source
    skillGuidance.load(agent),  // 当前 agent 的 skill 列表
    referenceGuidance.load(),   // AGENTS.md 等引用指引
  ]).pipe(Effect.map(SystemContext.combine))
```

**构成**（llm.ts: request 组装处）：
- `agent.info?.system` — agent 自身的 system prompt 文本（如 build agent 的构建指引）
- `system.baseline` — 当前 ContextEpoch 的 Baseline System Context（日期、环境、指令等）

两者合并为 `SystemPart[]` 数组。Baseline 在 ContextEpoch 内不变，变化通过 Mid-Conversation System Message 追加到 messages 中。

### 2.4 源 #2: Session History（messages 字段）

**来源**：`SessionHistory.entriesForRunner()` 从数据库加载**当前 ContextEpoch 之后**的所有对话消息。

**转换**：通过 `toLLMMessages()`（`packages/core/src/session/runner/to-llm-message.ts`）将 V2 的 `SessionMessage` 投影为 `@opencode-ai/llm` 的 `Message` 格式。

关键转换规则（to-llm-message.ts: `toLLMMessages`）：
- `user` → `Message.user`（带文件附件转 media part）
- `assistant` → `Message.assistant`（含文本/推理/tool call/tool result）
- `system` → `Message.system`（Mid-Conversation System Message）
- `compaction` → 包裹在 `<conversation-checkpoint>` XML 中的 `Message.user`
- `agent-switched` / `model-switched` → **跳过**（不发送给模型，仅审计用）
- `synthetic` → `Message.user`（合成上下文，如 system prompt 注入）
- `shell` → `Message.user`（shell 命令 + 输出）

**最后一步注入**（llm.ts: request 组装处）：当达到 agent 最大步数时，追加一条 `MAX_STEPS_PROMPT` assistant 消息告知模型停止调用工具。

### 2.5 源 #3: Tool Definitions（tools 字段）

**来源**：`ToolRegistry.materialize()`。仅在未达最大步数时调用；最后一步设置 `toolChoice: "none"`。

```typescript
const toolMaterialization = isLastStep
  ? undefined
  : yield* tools.materialize(agent.info?.permissions)
```

`materialize()` 返回 `{ definitions, settle }`：
- `definitions` — 权限过滤后的工具定义列表（发给模型的 JSON Schema）
- `settle` — 工具调用结算函数（执行本地工具并持久化结果）

---

## 3. 流式响应处理

### 3.1 Stream 架构

```typescript
// llm.ts: SessionRunner.runTurn — stream 处理
const providerStream = llm.stream(request).pipe(
  Stream.runForEach((event) =>
    Effect.gen(function* () {
      // 逐事件处理
    })
  ),
  Effect.ensuring(publisher.flush())
)
```

Provider 返回一个 `Stream<LLMEvent>`，通过 `Stream.runForEach` 逐事件处理。所有事件通过 `createLLMEventPublisher`（`packages/core/src/session/runner/publish-llm-event.ts`）持久化为 `SessionEvent`。

### 3.2 事件类型与处理逻辑

| LLMEvent 类型 | 处理逻辑 | 持久化为 SessionEvent |
|---------------|----------|----------------------|
| `text-start` | 开始追踪 text fragment | `SessionEvent.Text.Started` |
| `text-delta` | 追加增量文本 | `SessionEvent.Text.Delta` |
| `text-end` | flush 合并文本 | `SessionEvent.Text.Ended` |
| `reasoning-start` | 开始追踪推理 fragment | `SessionEvent.Reasoning.Started` |
| `reasoning-delta` | 追加增量推理 | `SessionEvent.Reasoning.Delta` |
| `reasoning-end` | flush 合并推理 + providerMetadata | `SessionEvent.Reasoning.Ended` |
| `tool-input-start` | 注册 tool call，开始追踪输入 | `SessionEvent.Tool.Input.Started` |
| `tool-input-delta` | 追加工具参数增量 | `SessionEvent.Tool.Input.Delta` |
| `tool-input-end` | flush 合并工具输入 | `SessionEvent.Tool.Input.Ended` |
| **`tool-call`** | **触发工具结算** | `SessionEvent.Tool.Called` |
| `tool-result` | 工具结算结果（成功/失败） | `SessionEvent.Tool.Success` / `.Failed` |
| `tool-error` | Provider 报告的工具错误 | `SessionEvent.Tool.Failed` |
| `step-finish` | 记录 finish reason + token 统计 | 暂存到 `stepSettlement`，在 Step.Ended 中使用 |
| `provider-error` | Provider 错误，标记 turn 失败 | 触发 `failAssistant()` |
| `step-start` | **忽略**（V2 自行管理） | — |
| `finish` | **忽略**（V2 使用 step-finish） | — |

### 3.3 Tool Call 结算流程

```
llm.stream 发出 tool-call event
  │
  ▼
publish(event) ──→ 持久化 SessionEvent.Tool.Called
  │
  ▼ (非 providerExecuted 时)
toolMaterialization.settle({
  sessionID, agent, assistantMessageID, call
})
  │
  ├── 执行本地工具
  ├── 持久化结果（成功 → Tool.Success / 失败 → Tool.Failed）
  └── 通过 FiberSet.run() 并发执行
  │
  ▼
返回 needsContinuation = true ──→ 触发下一个 runTurn()
```

**关键点**（llm.ts: `SessionRunner.runTurn` — tool 结算区域）：
- `providerExecuted === true` 的 tool call **不在本地执行**，结果由 Provider 自行处理
- 本地工具通过 `FiberSet` 并发执行，通过 `awaitToolFibers()` 等待全部完成
- 工具执行期间不可中断（`Effect.uninterruptibleMask`），保证结算的原子性

### 3.4 Fragment 追踪机制

`createLLMEventPublisher`（`packages/core/src/session/runner/publish-llm-event.ts`）使用 **fragment 追踪器** 处理流式增量：

```
Map<id, string[]>  — 每个 fragment（text/reasoning/tool-input）维护一个 chunks 数组

start(id)   → 创建空数组
append(id, text) → 追加 chunk
end(id)     → join 所有 chunks，发布 Ended 事件，清除追踪
flush()     → 强制结束所有未关闭的 fragment
```

这保证了即使流中断，已接收的增量也能正确合并和持久化。

### 3.5 Context Overflow 分类器

Context overflow 检测位于 `packages/llm/src/provider-error.ts`。1.18.4 新增了 **排除列表（exclusions）**，在匹配 overflow pattern 之前先排除 throttling/rate-limit 错误，避免误判。

**patterns**（24 个正则，涵盖主要 Provider 的上下文超限错误消息）：
```
/prompt is too long/i
/request_too_large/i
/exceeds the context window/i
/exceeds (?:the )?(?:model'?s )?maximum context length(?: of [\d,]+ tokens?|\s*\([\d,]+\))/i
/input token count.*exceeds the maximum/i
...
/model_context_window_exceeded/i
/too many tokens/i
/token limit exceeded/i
```

**exclusions**（3 个——不属于 context overflow 的场景）：
```typescript
const exclusions = [
  /^(throttling error|service unavailable):/i,
  /rate limit/i,
  /too many requests/i,
]
```

**核心函数**：
```typescript
export const isContextOverflow = (message: string) =>
  !exclusions.some((pattern) => pattern.test(message)) &&
  (patterns.some((pattern) => pattern.test(message)) || /^4(00|13)\s*(status code)?\s*\(no body\)/i.test(message))
```

**逻辑**：先检查是否命中排除项（throttling / rate limit / too many requests），如果命中则直接返回 `false`，不视为 context overflow。未命中的情况下才检查 patterns 和无 body 的 400/413 状态码。

**第二个入口**（`isContextOverflowFailure`）：检查 `LLMError` 的 typed classification 或 `ProviderErrorEvent` 的 `classification === "context-overflow"`，用于 runtime 已做过分类的 scenario。

---

## 4. Model Request Options vs Generation Controls

### 4.1 定义

> 📌 **Model Request Options**: *Provider-semantic model settings selected from the Catalog and active Session variant before the LLM protocol adapter encodes them for a provider request.*

> 📌 **Generation Controls**: *Provider-neutral sampling and output controls, partitioned from provider semantics and compatibility wire fields when model metadata enters the Catalog.*

### 4.2 对比

| 维度 | Model Request Options | Generation Controls |
|------|----------------------|---------------------|
| **语义层级** | Provider 相关 | Provider 无关 |
| **示例** | OpenAI 的 `promptCacheKey`、Anthropic 的 `cache_control` | `temperature`, `maxTokens`, `topP` |
| **生命周期** | 从 Catalog + Session variant 解析 | 从 Catalog 模型元数据提取 |
| **编码方** | LLM 协议适配器 | 与其他请求字段统一编码 |
| **所属包** | Provider 协议层 | Schema/Catalog 层 |

### 4.3 源码体现

在 `llm.ts: request 组装处` 中，二者统一传入 `LLM.request()`：

```typescript
const request = LLM.request({
  model,
  providerOptions: { openai: { promptCacheKey } },  // Model Request Options
  // generation controls 包含在 model 的 route.defaults 中
  system: [...],
  messages: [...],
  tools: [...],
})
```

`generation` 字段（如 `maxTokens`）在 request 中是 Provider 无关的通用字段；`providerOptions` 则是按 Provider 分组的不透明选项。

---

## 5. Native Continuation Metadata

### 5.1 定义

> 📌 **Native Continuation Metadata**: *Opaque protocol-shaped data attached to assistant content and required to continue that content natively with a compatible model, such as a reasoning signature or provider-hosted item identifier.*

### 5.2（行为规则，来源：CONTEXT.md）

- **保留**：持久化在 Session 历史中
- **包含条件**：仅在**成功的、精确匹配的** Provider/Model 下才包含在 Provider Turn 投影中
- **省略条件**：失败的 turn 和**切换了模型**后省略不透明元数据
- **降级**：非空可见推理在模型切换后降级为普通 assistant 文本

### 5.3 源码体现

在 `packages/core/src/session/runner/to-llm-message.ts` 的 `toLLMMessages` 中：

```typescript
const sameModel =
  String(message.model.providerID) === String(model.provider) &&
  String(message.model.id) === String(model.id)
const reuseProviderMetadata = sameModel && message.error === undefined
```

- `sameModel` 判断当前模型与消息被创建时的模型是否一致
- `reuseProviderMetadata` 仅在模型匹配且无错误时为 `true`
- reasoning 的 `providerMetadata` 仅在 `sameModel` 时传递
- tool call/result 的 `providerMetadata` 仅在 `reuseProviderMetadata` 时传递
- 模型不匹配时，非空推理文本降级为普通 `text` part

---

## 6. Compaction（上下文压缩）

### 6.1 定义

Compaction 是一种**自动上下文窗口管理机制**。当组装好的请求超过模型的上下文限制时，系统会将早期对话压缩为结构化摘要，释放空间给最近的对话。

### 6.2 触发条件（`packages/core/src/session/compaction.ts`: `compactIfNeeded`）

```typescript
const compactIfNeeded = function* (input: Input) {
  if (!config.auto) return false
  const context = input.model.route.defaults.limits?.context
  if (context === undefined || context <= 0) return false
  // 核心判断：当前请求 token 数超过可用空间
  if (
    estimate({ system, messages, tools }) <=
    context - max(output, config.buffer)  // buffer 默认 20_000
  )
    return false
  return yield* compactAfterOverflow(input)
}
```

**触发公式**：

```
estimate(system + messages + tools) > model.contextLimit - max(maxOutputTokens, buffer)
```

其中 `buffer` 默认 20,000 tokens，`keep.tokens` 默认 8,000 tokens（保留最近对话）。

### 6.3 1.18.4 新版 SUMMARY_TEMPLATE

`SUMMARY_TEMPLATE`（`packages/core/src/session/compaction.ts`）在 1.18.4 中重新设计了节标题和结构：

```markdown
## Objective
- [one or two brief sentences describing what the user is trying to accomplish]

## Important Details
- [constraints/preferences, decisions and why, important facts/assumptions,
   exact context needed to continue, or "(none)"]

## Work State
### Completed
- [finished work, verified facts, or changes made; otherwise "(none)"]

### Active
- [current work, partial changes, or investigation state; otherwise "(none)"]

### Blocked
- [blockers, failing commands, or unknowns; otherwise "(none)"]

## Next Move
1. [immediate concrete action, or "(none)"]
2. [next action if known, or "(none)"]

## Relevant Files (unchanged from 1.17)
- [file or directory path: why it matters, or "(none)"]
```

**Rules**（不变）：
- Keep every section, even when empty
- Use terse bullets, not prose paragraphs
- Preserve exact file paths, symbols, commands, error strings, URLs, and identifiers when known
- Do not mention the summary process or that context was compacted

**与旧版对比**：1.17.x 的模板有 7 个独立节（Goal、Constraints & Preferences、Progress 三态 Done-InProgress-Blocked、决策与下一步说明、Critical Context、Relevant Files），1.18.4 重构为 5 个节：顶层 Goal 改为 Objective，Constraints 与决策上下文合并为 Important Details，Progress 三态改为 Work State 的 Completed-Active-Blocked，Next Steps 重命名为 Next Move 并改为编号列表。Relevant Files 保持不变。

### 6.4 执行流程（`compactAfterOverflow`）

```
compactAfterOverflow(input)
  │
  ├── 步骤 1: select(entries, keepTokens)
  │   └── 从对话末尾向前扫描，保留最近 keepTokens 的对话
  │   └── 返回 { head: "需要摘要的旧对话", recent: "保留的最近对话" }
  │
  ├── 步骤 2: buildPrompt({ previousSummary, context })
  │   └── 若有旧摘要 → "更新摘要"；否则 → "创建新摘要"
  │   └── 使用 SUMMARY_TEMPLATE 模板
  │
  ├── 步骤 3: 调用 LLM 生成摘要
  │   └── 使用当前 model，maxTokens = min(output, 4096)
  │   └── 收集 text-delta 事件拼接摘要文本
  │
  ├── 步骤 4: 发布 CompactionEvent
  │   └── SessionEvent.Compaction.Started — 包含 messageID + reason: "auto"
  │   └── SessionEvent.Compaction.Ended — 包含 summary + recent context
  │
  └── 返回值：true（成功压缩）
```

### 6.5 Compaction 对 ContextEpoch 的影响

> 📌 CONTEXT.md: *Completed compaction starts a new Context Epoch on the next provider attempt, folding the current complete System Context into a fresh baseline and removing earlier Mid-Conversation System Messages from active model history.*

**效果**：
1. **新 ContextEpoch 开始**：旧的 Baseline 被替换，所有 Context Source 重新渲染
2. **Mid-Conversation System Messages 被移除**：旧 epoch 中积累的系统消息不再发送给模型（但保留在审计历史中）
3. **Compaction 消息插入对话**：摘要 + recent context 作为 `<conversation-checkpoint>` 包裹的 user message 出现在 messages 中

### 6.6 消息序列化

Compaction 需要将 `SessionMessage` 转为纯文本供摘要 LLM 使用：

```typescript
const serialize = (message) => {
  if (message.type === "user")    → "[User]: text" + [Attached files]
  if (message.type === "assistant") → "[Assistant]: text" / "[Assistant tool call]: name(input)"
  if (message.type === "system")  → "[System update]: text"
  if (message.type === "shell")   → "[Shell]: command\noutput"
  // agent-switched, model-switched, compaction 类型不参与序列化
}
```

工具结果超过 `TOOL_OUTPUT_MAX_CHARS`（2,000 字符）时会被截断并标注 `[truncated]`。

### 6.7 Compaction 恢复循环

`runTurn()` 使用 `Effect.catchDefect` 捕获 `TurnTransitionError`：

```typescript
// llm.ts: SessionRunner.runTurn — TurnTransition 状态机
type TurnTransition =
  | { _tag: "ContinueAfterCompaction" }          // 普通 compaction 后重试
  | { _tag: "ContinueAfterOverflowCompaction" }  // overflow 后重试

// 普通 compaction → 递归调用自身（可无限重试）
// overflow compaction → 调用 runAfterOverflowCompaction（只允许一次恢复）
```

三种 compaction 路径：
- `runTurn()` → compact → `ContinueAfterCompaction` → 递归 `runTurn()`（可多轮）
- `runTurn()` → compact → `ContinueAfterOverflowCompaction` → `runAfterOverflowCompaction()`（单轮）
- `runAfterOverflowCompaction()` → compact → `ContinueAfterOverflowCompaction` → **die**（不允许二次 overflow）

---

## 7. 每次 Turn 的完整事件时序

```
Safe Provider-Turn Boundary
  │
  ├── 1. Location 校验
  ├── 2. Promote 待处理输入
  ├── 3. Reconcile System Context
  │       └── 如有变化 → 生成 Mid-Conversation System Message
  │
  ▼
SessionEvent.Step.Started         ← 标记 assistantMessageID
  │
  ├── Text.Started / Text.Delta / Text.Ended
  ├── Reasoning.Started / Reasoning.Delta / Reasoning.Ended
  ├── Tool.Input.Started / Tool.Input.Delta / Tool.Input.Ended
  ├── Tool.Called                ← 工具调用开始
  ├── Tool.Success / Tool.Failed ← 工具结算结果
  │
  ▼
Step.Finished (step-finish)      ← 内部暂存 finish reason + token
  │
  ▼
SessionEvent.Step.Ended           ← 包含 snapshot diff + tokens + files
  │
  ▼
needsContinuation?
  ├── true  → 下一个 runTurn()（step++）
  └── false → drain 结束
```

---

## 8. 关键关系（来自 CONTEXT.md Relationships）

**Provider Turn 与 ContextEpoch**：
- 第一个 Provider Turn 渲染最新完整 Baseline System Context 并初始化 ContextSnapshot
- 初始 SystemContext 准备先于第一条输入提升
- Agent 和 Model 在 Provider Turn 开始时采样，该边界之后的变化应用于下一个 turn

**Compaction**：
- 完成后开始新 ContextEpoch
- 从活跃模型历史中移除 Mid-Conversation System Messages
- 跨进程重启复用 Baseline

**Native Continuation Metadata**：
- 持久化保留
- 仅精确匹配的 Provider/Model 下包含在投影中
- Model 切换导致推理降级为普通文本

**Model Request Options / Generation Controls**：
- 分区管理于 Catalog
- Provider 语义的 options 由协议适配器编码

---

## 9. 相关笔记

- [01 — System Context 子系统](01-system-context.md) — ContextEpoch / Source / Snapshot 的完整代数
- [02 — Session 生命周期](02-session-lifecycle.md) — admit → promote → drain 完整链路
- [03 — 工具系统架构](03-tool-system.md) — ToolRegistry.materialize/settle 详解

---

最后更新：2026-07-24 | 来源：CONTEXT.md + `packages/core/src/session/runner/llm.ts` + `packages/core/src/session/compaction.ts` + `packages/core/src/session/runner/to-llm-message.ts` + `packages/core/src/session/runner/publish-llm-event.ts` + `packages/llm/src/provider-error.ts`
