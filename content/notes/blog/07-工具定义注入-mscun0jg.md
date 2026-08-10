---
blog: true
title: "07-工具定义注入"
slug: "07-工具定义注入-mscun0jg"
summary: "树节点：07 工具定义注入 父节点：07 消息结构与角色 子节点：无 概述 工具定义注入是 Core → LLM 层的桥梁 ：将 ToolRegistry 中注册的所有工具（built in + application + Location scoped）materialize 为 LLM 层可消费的 ToolDefinition[] ，随每个 LLMRequest 下发给模型。整个过程分三个阶段：注册（registration）、ma"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：07-工具定义注入
> 父节点：[[07-消息结构与角色]]
> 子节点：无

---

## 概述

工具定义注入是 **Core → LLM 层的桥梁**：将 `ToolRegistry` 中注册的所有工具（built-in + application + Location-scoped）materialize 为 LLM 层可消费的 `ToolDefinition[]`，随每个 `LLMRequest` 下发给模型。整个过程分三个阶段：注册（registration）、materialize（物化）、请求注入。

---

## 1. 工具注册

Core 层通过 `Tool.make()` 创建工具（`packages/core/src/tool/tool.ts:71-131`），内部维护一个 `WeakMap<AnyTool, Runtime>` 存储每个工具的运行时能力：`definition(name)` 生成 LLM 层 `ToolDefinition`，`settle(call, context)` 执行工具调用。

```ts
// packages/core/src/tool/tool.ts:79-90
definition: (name) => {
  const cached = definitions.get(name)
  if (cached) return cached
  const definition = new ToolDefinition({
    name,
    description: config.description,
    inputSchema: toJsonSchema(config.input),
    outputSchema: toJsonSchema(config.structured ?? config.output),
  })
  definitions.set(name, definition)
  return definition
},
```

工具注册到 `ToolRegistry` 分两条路径：
- **Application 注册**：通过 `ApplicationTools.Service`（进程级，所有 Location 共享）
- **Location 注册**：通过 `Tools.Service.register()` 调用 `ToolRegistry.register()`（Location 作用域，覆盖同名 application 工具）

```ts
// packages/core/src/tool/tools.ts:6-9
export interface Interface {
  readonly register: (
    tools: Readonly<Record<string, Tool.AnyTool>>,
  ) => Effect.Effect<void, Tool.RegistrationError, Scope.Scope>
}
```

---

## 2. materialize() 流程

`ToolRegistry.materialize()`（`packages/core/src/tool/registry.ts:106-122`）是核心物化方法：

```ts
// packages/core/src/tool/registry.ts:106-122
materialize: Effect.fn("ToolRegistry.materialize")(function* (permissions = []) {
  const registrations = new Map(applications.entries())
  for (const [name, entries] of local) {
    const registration = entries.at(-1)?.registration
    if (registration) registrations.set(name, registration)
  }
  for (const [name, registration] of registrations)
    if (whollyDisabled(permission(registration.tool, name), permissions)) registrations.delete(name)
  return {
    definitions: Array.from(registrations, ([name, registration]) => definition(name, registration.tool)),
    settle: (input) => { /* ... */ },
  }
}),
```

**三步流程：**

1. **合并注册表**（107-111行）：先收集所有 application 工具，再用 Location 工具覆盖同名的（`at(-1)` 取最新注册）
2. **权限过滤**（112-113行）：检查 `permission` action 是否被 `whollyDisabled` 规则匹配（`resource === "*"` 且 `effect === "deny"`），被禁用的工具从 `<definitions>` 中移除
3. **导出定义数组**（114行）：对每个幸存工具调用 `definition(name, tool)` → `runtimeOf(tool).definition(name)`，生成 `ToolDefinition` 对象

---

## 3. ToolDefinition 结构

LLM 层的 `ToolDefinition`（`packages/llm/src/schema/messages.ts:224-232`）：

```ts
// packages/llm/src/schema/messages.ts:224-232
export class ToolDefinition extends Schema.Class<ToolDefinition>("LLM.ToolDefinition")({
  name: Schema.String,
  description: Schema.String,
  inputSchema: JsonSchema,
  outputSchema: Schema.optional(JsonSchema),
  cache: Schema.optional(CacheHint),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  native: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
}) {}
```

每个工具定义包含：
- **name**：工具名称（来自注册表 key）
- **description**：工具用途描述（来自 `Tool.make` 的 config）
- **inputSchema**：参数的 JSON Schema（由 `toJsonSchema(config.input)` 从 Effect Schema 转换）
- **outputSchema**：可选，输出的 JSON Schema
- **cache**：可选 `CacheHint`，用于 prompt caching 策略

---

## 4. 注入 LLMRequest

`LLM.request()` 构建请求时接收 `tools` 参数（`packages/llm/src/llm.ts:53-75`）：

```ts
// packages/llm/src/llm.ts:53-75
export const request = (input: RequestInput) => {
  const { system: requestSystem, prompt, messages, tools, toolChoice, ... } = input
  return new LLMRequest({
    ...rest,
    system: SystemPart.content(requestSystem),
    messages: [...(messages?.map(Message.make) ?? []), ...(prompt === undefined ? [] : [Message.user(prompt)])],
    tools: tools?.map(ToolDefinition.make) ?? [],
    toolChoice: requestToolChoice ? ToolChoice.make(requestToolChoice) : undefined,
    // ...
  })
}
```

`tools` 参数接受 `ToolDefinition.Input` 数组（第38行类型），在 69 行通过 `tools?.map(ToolDefinition.make)` 规范化为 `ToolDefinition` 实例。`LLMRequest` 实例化后 `tools` 字段存储为 `Schema.Array(ToolDefinition)`（`messages.ts:276`）。

**调用链**：Core 的 `Materialization.definitions` → Session Runner → `LLM.request({ tools: [...] })` → protocol body builder 将 `ToolDefinition` 转换为各 provider 的原生 tool schema 格式。

---

## 5. toolChoice 参数

`ToolChoice`（`packages/llm/src/schema/messages.ts:241-262`）控制模型如何选择工具：

```ts
// packages/llm/src/schema/messages.ts:241-244
export class ToolChoice extends Schema.Class<ToolChoice>("LLM.ToolChoice")({
  type: Schema.Literals(["auto", "none", "required", "tool"]),
  name: Schema.optional(Schema.String),
}) {}
```

| 模式 | 含义 |
|------|------|
| `"auto"` | 模型自行决定是否调用工具（默认） |
| `"none"` | 禁止调用任何工具 |
| `"required"` | 强制调用某个工具（由模型选择） |
| `"tool"` | 强制调用指定名称的工具（配合 `name` 字段） |

`ToolChoice.named("toolName")` 生成 `{ type: "tool", name: "toolName" }`，用于强制指定工具调用（如 `generateObject` 内部）。每个 protocol route 通过 `matchToolChoice()` 将 `LLMRequest.toolChoice` 降低为 provider 原生格式。

---

## 6. materialize 返回值与 Session 集成

`Materialization` 接口（`registry.ts:29-32`）返回两个值：
- **`definitions`**：`ReadonlyArray<ToolDefinition>`，注入 `LLMRequest`
- **`settle`**：`(input: ExecuteInput) => Effect.Effect<Settlement>`，工具调用执行闭包

Session Runner 在每轮 Provider Turn 前调用 `materialize(permissions)`，将 definitions 注入请求，并用返回的 settle 闭包处理模型的 tool-call 事件。这确保了每轮请求的工具列表反映最新的注册状态和权限变化。

---

## 相关笔记

- [[07-消息结构与角色]] — `LLMRequest` 消息组装
- [[05-Runner执行循环]] — Session Runner 中的 tool-call 调度
- [[08-工具声明与注册]] — 工具注册与构建
- [[08-工具执行与结算]] — settle 执行流程
- [[10-快照创建与存储]] — materialize 与权限快照关系
