---
blog: true
title: "08-工具执行与结算"
slug: "08-工具执行与结算-mscun0jf"
summary: "树节点：08 工具执行与结算 父节点：08 工具声明与注册 子节点：无 08 工具执行与结算 概述 工具执行与结算（Settlement）是从 LLM 返回 tool call 事件开始，到工具结果被持久化为 SessionEvent 的完整流水线。核心由三个模块协作完成： packages/core/src/tool/tool.ts （单工具执行）、 packages/core/src/tool/registry.ts （查找+权限+"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "08-工具声明与注册-mscun0k2"
---

> 树节点：08-工具执行与结算
> 父节点：[[08-工具声明与注册]]
> 子节点：无

# 08-工具执行与结算

## 概述

工具执行与结算（Settlement）是从 LLM 返回 `tool_call` 事件开始，到工具结果被持久化为 SessionEvent 的完整流水线。核心由三个模块协作完成：`packages/core/src/tool/tool.ts`（单工具执行）、`packages/core/src/tool/registry.ts`（查找+权限+截断）、`packages/core/src/session/runner/llm.ts`（编排+并行+事件）。

---

## 工具生命周期状态机

工具调用在 Session 消息中经历四个状态（`packages/schema/src/session-message.ts:82-118`）：

| 状态 | 含义 | 关键字段 |
|------|------|----------|
| **pending** | LLM 已声明，输入流还未结束 | `input: string`（原始 JSON） |
| **running** | 输入解析完毕，正在执行 | `input` 变为 `Record<string, unknown>`，含 `content` 和 `structured` |
| **completed** | 执行成功 | `structured`, `content`, `outputPaths`, `result`（可选） |
| **error** | 执行失败或中断 | `error: UnknownError`, `content`, `structured` |

```typescript
// packages/schema/src/session-message.ts:116-118
export const ToolState = Schema.Union([
  ToolStatePending, ToolStateRunning, ToolStateCompleted, ToolStateError
]).pipe(Schema.toTaggedUnion("status"))
```

---

## 整体流程：从 tool_call 到 ToolResult

### 1. LLM 层产生 tool-call 事件

`packages/llm/src/protocols/utils/tool-stream.ts` 管理流式工具调用解析：
- `inputStart` → `inputDelta` → `inputEnd` → `toolCall`
- `finish()` / `finishAll()` 解析累积的原始 JSON 并为每个工具发出最终的 `tool-call` 事件

```typescript
// packages/llm/src/protocols/utils/tool-stream.ts:164-175
export const finish = <K extends StreamKey>(route: string, tools: State<K>, key: K) =>
  Effect.gen(function* () {
    const tool = tools[key]
    if (!tool) return { tools }
    return {
      tools: withoutTool(tools, key),
      events: [
        LLMEvent.toolInputEnd({ ... }),
        yield* toolCall(route, tool),
      ],
    }
  })
```

### 2. Runner 接收并匹配工具

`packages/core/src/session/runner/llm.ts:243-271` — `runTurn` 的 stream 处理器：

```typescript
// packages/core/src/session/runner/llm.ts:243-271
if (event.type !== "tool-call" || event.providerExecuted) return
// ...
needsContinuation = true
const assistantMessageID = yield* publisher.assistantMessageID(event.id)
yield* Effect.uninterruptibleMask((restore) =>
  restore(
    toolMaterialization.settle({
      sessionID: session.id, agent: agent.id,
      assistantMessageID, call: event,
    }),
  ).pipe(
    Effect.flatMap((settlement) =>
      publish(LLMEvent.toolResult({ ... }), settlement.outputPaths ?? []),
    ),
  ),
).pipe(FiberSet.run(toolFibers))
```

### 3. ToolRegistry.settleWith：查找→执行→截断→转换

`packages/core/src/tool/registry.ts:50-82`：

```typescript
// packages/core/src/tool/registry.ts:50-82
const settleWith = Effect.fn("ToolRegistry.settle")(function* (input, advertised?) {
  const registration = local.get(input.call.name)?.at(-1)?.registration
    ?? applications.entries().get(input.call.name)
  if (!registration)
    return { result: { type: "error", value: `Unknown tool: ${input.call.name}` } }
  // ... 从 registry 查找 tool，调用 settle() 执行
  const pending = yield* settle(registration.tool, input.call, { ... })
  // ... 捕获 ToolFailure → 转为 error result
  const output = pending.output
  const bounded = yield* resources.bound({ sessionID, toolCallID, output })
  const result = ToolOutput.toResultValue(bounded.output)
  // ... 返回 Settlement { result, output, outputPaths }
})
```

### 4. Tool.settle()：单工具执行核心

`packages/core/src/tool/tool.ts:91-129` — `make()` 内部的 `settle` 闭包：

1. **输入解码**：`Schema.decodeUnknownEffect(config.input)(call.input)` — 将 raw JSON 转为类型化输入
2. **执行**：`config.execute(input, context)` — 调用工具实现（返回 Effect）
3. **输出编码**：`Schema.encodeEffect(config.output)(output)` — 类型化结果转为 JSON
4. **可选结构化输出**：`config.toStructuredOutput?.()` → 可单独定义 structured schema
5. **模型输出格式化**：`config.toModelOutput` 回调或默认 `[{ type: "text", text: output }]`

```typescript
// packages/core/src/tool/tool.ts:91-129 (关键路径)
settle: (call, context) =>
  Schema.decodeUnknownEffect(config.input)(call.input).pipe(
    Effect.mapError((error) => new ToolFailure({ ... })),
    Effect.flatMap((input) =>
      config.execute(input, context).pipe(
        Effect.flatMap((output) =>
          Schema.encodeEffect(config.output)(output).pipe(/* ... */)
        ),
        Effect.map(({ output, structured }) => ({
          structured,
          content: config.toModelOutput?.({ input, output }) ?? (
            typeof output === "string" ? [{ type: "text", text: output }] : []
          ),
        })),
      ),
    ),
  ),
```

### 5. 结果为 ToolResultPart 并入消息

`packages/core/src/session/runner/to-llm-message.ts:39-67` — 将已结算的 `AssistantTool` 转为 LLM 层的 `ToolResultPart`：

```typescript
// packages/core/src/session/runner/to-llm-message.ts:39-53
const toolResult = (tool: AssistantTool, providerMetadata) => {
  if (tool.state.status === "completed") {
    const result = tool.provider?.executed === true && tool.state.result !== undefined
      ? tool.state.result
      : ToolOutput.toResultValue({ structured: tool.state.structured, content: tool.state.content })
    return ToolResultPart.make({ id: tool.id, name: tool.name, result, ... })
  }
  if (tool.state.status === "error") {
    return ToolResultPart.make({ id: tool.id, name: tool.name,
      result: { error: tool.state.error, content: tool.state.content, structured: tool.state.structured },
      resultType: "error", ... })
  }
}
```

`ToolResultPart` 定义于 `packages/llm/src/schema/messages.ts:138-166`，包含 `type`, `id`, `name`, `result: ToolResultValue`。

---

## 并行工具执行（FiberSet）

所有工具调用在同一 turn 内并行执行。`runTurn` 使用 Effect 的 `FiberSet` 实现：

```typescript
// packages/core/src/session/runner/llm.ts:184,141-142,271
const toolFibers = yield* FiberSet.make<void, ToolOutputStore.Error>()

// 每个 tool-call 事件到达时：
// ... FiberSet.run(toolFibers)  // 行 271

// 等待所有工具：
const awaitToolFibers = (fibers) =>
  Effect.raceFirst(FiberSet.join(fibers), FiberSet.awaitEmpty(fibers))
```

`FiberSet.join` 等待所有 fiber 完成（成功或失败），`awaitEmpty` 用于已清理的空集合。`raceFirst` 确保两者之一即可。

---

## 中断与错误处理

### failInterruptedTools

`packages/core/src/session/runner/llm.ts:119-139` — 在 `run()` 开始时调用（行 390），扫描上下文中的 pending/running 工具并标记为失败：

```typescript
// packages/core/src/session/runner/llm.ts:119-139
const failInterruptedTools = Effect.fn("SessionRunner.failInterruptedTools")(function* (sessionID) {
  for (const message of yield* getContext(sessionID)) {
    if (message.type !== "assistant") continue
    for (const tool of message.content) {
      if (tool.type !== "tool" ||
          (tool.state.status !== "pending" && tool.state.status !== "running")) continue
      yield* events.publish(SessionEvent.Tool.Failed, {
        sessionID, timestamp: yield* DateTime.now,
        assistantMessageID: message.id, callID: tool.id,
        error: { type: "unknown", message: "Tool execution interrupted" },
        provider: { executed: tool.provider?.executed === true, ... },
      })
    }
  }
})
```

### 用户拒绝（DeclinedError / RejectedError）

`packages/core/src/session/runner/llm.ts:145-150,297-301` — 如果 Fiber 因权限拒绝或问题拒绝而失败，会清理 fiber 集并中断整个 turn：

```typescript
// packages/core/src/session/runner/llm.ts:145-150
const isUserDeclined = (cause) =>
  cause.reasons.some((reason) =>
    Cause.isDieReason(reason) &&
    (reason.defect instanceof PermissionV2.DeclinedError ||
     reason.defect instanceof QuestionV2.RejectedError))
```

### failUnsettledTools

`packages/core/src/session/runner/publish-llm-event.ts:213-232` — 在 LLM 失败或流中断时，将未结算工具标记为失败：

```typescript
// packages/core/src/session/runner/publish-llm-event.ts:213-232
const failUnsettledTools = Effect.fn("SessionRunner.failUnsettledTools")(function* (message, hostedOnly = false) {
  for (const [callID, tool] of tools) {
    if (tool.settled || (hostedOnly && !tool.providerExecuted)) continue
    tool.settled = true
    yield* events.publish(SessionEvent.Tool.Failed, {
      sessionID, assistantMessageID: tool.assistantMessageID,
      callID, error: { type: "unknown", message }, ...
    })
  }
})
```

---

## 事件持久化流水线

`packages/core/src/session/runner/publish-llm-event.ts` 管理整个 turn 的事件持久化：

| LLMEvent | SessionEvent |
|----------|-------------|
| `tool-input-start` | `SessionEvent.Tool.Input.Started` |
| `tool-input-delta` | `SessionEvent.Tool.Input.Delta` |
| `tool-input-end` | `SessionEvent.Tool.Input.Ended` |
| `tool-call` | `SessionEvent.Tool.Called` |
| `tool-result` (success) | `SessionEvent.Tool.Success` |
| `tool-result` (error) | `SessionEvent.Tool.Failed` |
| `tool-error` | `SessionEvent.Tool.Failed` |

Step 完成后，`publisher.stepSettlement()` 生成 `SessionEvent.Step.Ended`（`llm.ts:316-337`）。

---

## 源文件索引

| 文件 | 关键行 | 内容 |
|------|--------|------|
| `packages/core/src/tool/tool.ts` | 62-67 | Runtime type 定义：permission, definition, settle |
| `packages/core/src/tool/tool.ts` | 71-131 | `make()`：工具创建 + settle 闭包 |
| `packages/core/src/tool/tool.ts` | 148-150 | `permission()`, `definition()`, `settle()` 导出 |
| `packages/core/src/tool/registry.ts` | 29-38 | Materialization / Settlement 接口 |
| `packages/core/src/tool/registry.ts` | 50-82 | `settleWith()`：查找+执行+截断+转 ResultValue |
| `packages/core/src/tool/registry.ts` | 106-122 | `materialize()`：权限过滤+定义+settle |
| `packages/core/src/session/runner/llm.ts` | 119-139 | `failInterruptedTools()` |
| `packages/core/src/session/runner/llm.ts` | 141-142 | `awaitToolFibers` |
| `packages/core/src/session/runner/llm.ts` | 173-347 | `runTurnAttempt()` 完整 turn 流程 |
| `packages/core/src/session/runner/llm.ts` | 243-271 | tool-call 事件处理：settle + 发布 |
| `packages/core/src/session/runner/to-llm-message.ts` | 39-67 | `toolResult()`：状态→ToolResultPart |
| `packages/core/src/session/runner/publish-llm-event.ts` | 165-232 | 工具事件持久化（start → end → call → result） |
| `packages/core/src/session/runner/publish-llm-event.ts` | 337-375 | tool-result / tool-error → SessionEvent |
| `packages/llm/src/tool-runtime.ts` | 23-35 | `dispatch()`：LLM 层独立工具执行 |
| `packages/llm/src/tool-runtime.ts` | 37-61 | `decodeAndExecute()`：decode→execute→encode→project |
| `packages/llm/src/schema/messages.ts` | 80-111 | `ToolOutput` 定义 + `toResultValue` / `fromResultValue` |
| `packages/llm/src/schema/messages.ts` | 138-166 | `ToolResultPart` 定义 |
| `packages/schema/src/session-message.ts` | 82-118 | `ToolState` 状态机（pending/running/completed/error） |
| `packages/core/src/session/run-coordinator.ts` | 24-104 | `Coordinator`：串行化执行+interrupt+wake |
