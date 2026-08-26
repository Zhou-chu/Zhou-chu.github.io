---
blog: true
title: "03 — 工具系统 (Tool System)"
slug: "03-工具系统-tool-system-mscuwj48"
summary: "03 — 工具系统 (Tool System) 工具系统承担两个核心职责：告诉 LLM 当前有哪些工具可用（materialize），以及在 LLM 调用工具时执行并管理输出（settle）。OpenCode 1.18.4 的 Core V2 工具系统采用 私有 Layer + 公开 Node 的组装模型 ：每个模块内部定义私有的 const layer （Effect Layer），对外只暴露 export const node （ "
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 03 — 工具系统 (Tool System)

工具系统承担两个核心职责：告诉 LLM 当前有哪些工具可用（materialize），以及在 LLM 调用工具时执行并管理输出（settle）。OpenCode 1.18.4 的 Core V2 工具系统采用**私有 Layer + 公开 Node 的组装模型**：每个模块内部定义私有的 `const layer`（Effect Layer），对外只暴露 `export const node`（`makeLocationNode` / `makeGlobalNode`）作为依赖图的连接点。Code Mode（`execute` 工具）是独立于 Core 工具系统的**实验性工具编排层**，详见 [[Code Mode详解.md]]。

---

## 1. 设计意图

工具系统的架构围绕一条主线展开：

```
materialize() → 向 LLM 暴露可用工具列表（definitions）
settle()     → 执行工具 → 输出截断 → 持久化 → 返回给模型
```

这两步是"可用的工具集合"与"具体的一次调用"之间的关系。`materialize()` 在每次 Provider Turn 开始时按权限规则过滤出当前可用的工具定义；`settle()` 在 LLM 发起 tool call 时执行对应工具，对输出做容量限制，并将结果写入 Session 历史。

核心约束：工具值本身是**不透明的**，外部代码无法直接访问其 codec、executor、定义派生逻辑或权限声明。

---

## 2. `Tool.make()` 不透明设计

源码：`packages/core/src/tool/tool.ts`: `Tool.make`

### 2.1 构造接口

```ts
Tool.make({
  description: string,           // 工具描述（展示给 LLM）
  input: SchemaType<Input>,      // 输入 schema（Effect Schema）
  output: SchemaType<Output>,    // 输出 schema
  structured?: Structured,       // 可选的 structured output schema
  toStructuredOutput?: (ctx) => Structured,  // optional transform
  execute: (input, context) => Effect<Output, ToolFailure>,  // 核心执行
  toModelOutput?: (ctx) => Content[]        // 可选：自定义模型输出形状
})
```

### 2.2 不透明实现

`Tool.make()` 返回一个 `Definition<Input, Structured>` 对象，它是通过 `Object.freeze({})` 创建的空对象，类型系统通过 `declare const TypeId: unique symbol` 赋予其品牌类型。

所有的运行时数据存放在一个模块级的 `WeakMap<AnyTool, Runtime>` 中：

```ts
const runtimes = new WeakMap<AnyTool, Runtime>()

type Runtime = {
  readonly permission?: string
  readonly definition: (name: string) => ToolDefinition
  readonly settle: (call: ToolCall, context: Context) => Effect<ToolOutput, ToolFailure>
}
```

**不透明是关键设计决策。** 工具的 codec、executor、定义推导逻辑、权限声明都是私有运行时细节。外部代码只能通过以下 4 个公开函数间接访问：

| 函数 | 作用 |
|------|------|
| `Tool.definition(name, tool)` | 从 tool 值派生出 LLM 可见的 `ToolDefinition` |
| `Tool.settle(tool, call, context)` | 解码 input → 执行 → 编码 output → 构建 content |
| `Tool.permission(tool, name)` | 返回权限 action 字符串 |
| `Tool.validateName(name)` | 校验工具名格式（`/^[A-Za-z][A-Za-z0-9_-]{0,63}$/`） |

`withPermission(tool, permission)` 函数创建一个新的不透明工具值，内部 runtime 共享原工具的 definition/settle 但覆盖 permission 字段：

```ts
export const withPermission = (tool, permission) => {
  const decorated = Object.freeze({})
  runtimes.set(decorated, { ...runtimeOf(tool), permission })
  return decorated
}
```

### 2.3 execute 流水线

`settle()` 内部的执行流水线（`Tool.make` 内部的 `settle` 闭包，`packages/core/src/tool/tool.ts`）：

```
call.input → Schema.decodeUnknownEffect(config.input)
  → config.execute(input, context)
    → Schema.encodeEffect(config.output)
      → (optional) config.toStructuredOutput → Schema.encodeEffect(config.structured)
        → config.toModelOutput({ input, output })
        → ToolOutput { structured, content }
```

错误处理策略：只将预期内的类型错误转化为 `ToolFailure`。中断（interruption）和缺陷（defect）直接穿透，不使用 `catchCause`。这是有意为之，因为 interruption 和 defect 必须向上传播。

### 2.4 JSON Schema 派生

`definition()` 函数使用 `Schema.toJsonSchemaDocument()` 将 Effect Schema 转换为 LLM 可理解的 JSON Schema。如果 schema 有 `$defs`，则将其内联到顶层：

```ts
function toJsonSchema(schema: Schema.Top): JsonSchema.JsonSchema {
  const document = Schema.toJsonSchemaDocument(schema)
  if (Object.keys(document.definitions).length === 0) return document.schema
  return { ...document.schema, $defs: document.definitions }
}
```

---

## 3. 双层注册模型（私有 Layer + 公开 Node 组装）

工具系统存在两个注册层，分别面向不同的消费者。1.18.4 的组装模式是每个模块内部定义**私有的 `const layer`**（Effect Layer），对外只暴露 **`export const node`**（`makeLocationNode` 或 `makeGlobalNode`）作为依赖图的连接点。消费者不直接依赖 `Layer`，而是通过 `node` 组成的 `deps` 数组声明依赖关系。

### 3.1 进程级注册：`ApplicationTools.Service`

源码：`packages/core/src/tool/application-tools.ts`: `ApplicationTools.node`

- **作用域**：进程级（process-scoped），所有 Location 共享。全局唯一实例。
- **消费者**：外部应用，通过 `opencode.tools.register(...)` 公开接口注册应用级工具。
- **实现**：基于 `State.create()` 的简单状态管理，内部维护 `Map<string, Entry>`。
- **语义**：同名工具的后一次注册覆盖前一次。

源码中通过 `makeGlobalNode` 标记为全局唯一：

```ts
export const node = makeGlobalNode({ service: Service, layer, deps: [] })
```

### 3.2 Location 级注册：`Tools.Service`

源码：`packages/core/src/tool/tools.ts`: `Tools.Service`

- **作用域**：Location 级（Location-scoped）。每个 Location 拥有独立的 `Tools.Service` 实例。
- **消费者**：Location 内的内置工具层（built-in layers）。各 Location 的 built-in 通过 `Tools.Service.register(...)` 注册本 Location 专属的工具。
- **接口**：极简，只有 `register` 一个方法。对外只暴露注册能力，不暴露查询能力。

```ts
export class Service extends Context.Service<Service, Interface>()("@opencode/v2/Tools") {}
```

### 3.3 Registry 如何合并

`ToolRegistry.Service`（`registry.ts`）在初始化时注入 `ApplicationTools.Service`，并在其内部维护一个额外的 `local: Map<string, Array<{ token, registration }>>` 用于存放 Location 级注册。

在 `ToolRegistry.materialize`（`packages/core/src/tool/registry.ts`）中，合并顺序为：

```ts
materialize: Effect.fn("ToolRegistry.materialize")(function* (permissions = []) {
  const registrations = new Map(applications.entries())  // 1) 先取 Application 注册
  for (const [name, entries] of local) {
    const registration = entries.at(-1)?.registration    // 2) Location 注册覆盖同名
    if (registration) registrations.set(name, registration)
  }
  // 3) whole-tool permission 过滤
  ...
})
```

覆盖规则（来自 `AGENTS.md`）：

1. **Location 注册优先于 Application 注册**：同名工具，Location 层的注册会覆盖 Application 层。
2. **最新注册优先**：同一层（Location 或 Application）内同名工具，后注册的覆盖先注册的。
3. **Scope 关闭只移除自身**：关闭一个 Scope 时只移除该 Scope 内注册的工具，暴露前一个活跃注册（可能是同一层的旧注册，或 Application 层的同名注册）。
4. **settle 时捕获快照**：调用开始时的 `settle()` 函数捕获当时的有效工具映射，执行期间不受后续注册变更影响。

### 3.4 注册的 Scope 管理

Location 级注册在 `ToolRegistry.register`（`packages/core/src/tool/registry.ts`）中实现：

```ts
register: Effect.fn("ToolRegistry.register")(function* (tools) {
  const entries = Object.entries(tools)
  yield* Effect.uninterruptible(
    Effect.gen(function* () {
      const token = {}
      for (const [name, tool] of entries)
        local.set(name, [...(local.get(name) ?? []), { token, registration: { identity: {}, tool } }])
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          for (const [name] of entries) {
            const registrations = local.get(name)?.filter(r => r.token !== token) ?? []
            if (registrations.length > 0) local.set(name, registrations)
            else local.delete(name)
          }
        }),
      )
    }),
  )
}),
```

关键点：
- 一次注册调用中的所有工具共享同一个 `token`（`const token = {}`）。
- `Effect.addFinalizer()` 在 Scope 关闭时自动触发：遍历注册表，移除所有关联此 token 的注册。
- `Effect.uninterruptible` 确保注册和 finalizer 设置是原子的。

### 3.5 Node 依赖拓扑

1.18.4 的公开 Node 导出和依赖关系：

```
ApplicationTools.node (makeGlobalNode, process-scoped)
         ↓ (deps)
  ToolRegistry.node (makeLocationNode, Location-scoped)
         ↓ (deps)
  ToolOutputStore.node (makeLocationNode, Location-scoped)
```

另外还有两个额外的 Node 导出：
- **`ToolRegistry.toolsNode`**：只暴露 `Tools.Service`（窄化注册视图）给 Location 内的内置工具层
- **`Builtins.node`**（`packages/core/src/tool/builtins.ts`）：组合所有内置工具 node，提供 `layer: Layer.empty`（纯依赖集合）

`Tools.Service` 本质上只是 `ToolRegistry.Service.register` 的一个窄化视图，不暴露 materialize 和 settle。内部的 `Tools.Service` 提供通过私有的 `const layer` 实现（`packages/core/src/tool/registry.ts`）：

```ts
// 私有实现，对外不暴露 Layer
const layer = Layer.effect(
  Tools.Service,
  Service.use((registry) => Effect.succeed(Tools.Service.of({ register: registry.register }))),
).pipe(Layer.provideMerge(registryLayer))
```

---

## 4. Registry 核心源码走读

源码：`packages/core/src/tool/registry.ts`: `ToolRegistry.node`

### 4.1 接口定义

```ts
export interface Interface {
  readonly materialize: (
    permissions?: PermissionV2.Ruleset
  ) => Effect.Effect<Materialization>
  readonly register: (
    tools: Readonly<Record<string, AnyTool>>
  ) => Effect.Effect<void, RegistrationError, Scope.Scope>
}
```

### 4.2 `Materialization` 类型

```ts
export interface Materialization {
  readonly definitions: ReadonlyArray<ToolDefinition>  // LLM 可见的工具列表
  readonly settle: (input: ExecuteInput) => Effect<Settlement, ToolOutputStore.Error>
}

export interface Settlement {
  readonly result: ToolResultValue     // 给模型的结果（success/error）
  readonly output?: ToolOutput         // 有界投影（可能被截断）
  readonly outputPaths?: ReadonlyArray<string>  // 溢出文件绝对路径
}

export type ExecuteInput = {
  readonly sessionID: SessionSchema.ID
  readonly agent: AgentV2.ID
  readonly assistantMessageID: SessionMessage.ID
  readonly call: ToolCall
}
```

### 4.3 `materialize()` 流程

```
1. 从 ApplicationTools 获取进程级注册表
2. 用 Location 级注册（local Map）覆盖同名工具
3. 对每个工具计算 permission action → 应用 whollyDisabled 过滤
4. 遍历剩余工具 → 调用 Tool.definition() 生成 ToolDefinition[]
5. 返回 Materialization { definitions, settle }
```

`settle` 是闭包——它捕获了本次 materialize 时的注册表快照和 `advertised` identity 引用，用于在执行时校验工具未被注销或替换（stale tool call 检测）。

### 4.4 `settle()` 流程

```
settleWith(input, advertised)
  1. 查找工具: local 栈顶 || application entries
  2. 未找到 → 返回 error result
  3. identity 不匹配（stale call） → 返回 error result
  4. 调用 Tool.settle() 执行工具
  5. catch ToolFailure → 返回 error result
  6. 成功后 → 调用 ToolOutputStore.bound() 做容量限制
  7. 转换为 ToolResultValue
  8. 根据 outputPaths 有无决定返回形状
```

> 📌 **Safe Provider-Turn Boundary**: *The point immediately before a provider call, after durable input promotion and any required tool settlement, where context changes may be admitted chronologically.*

工具 settlement 发生在 Safe Provider-Turn Boundary 之前。settlement 完成后，工具的 bounded output 被写入 Session History，成为下一次 Provider Turn 的上下文。

---

## 5. 输出管理

### 5.1 两层输出概念

| 概念 | 说明 |
|------|------|
| 工具内部输出 | 工具 execute() 返回的完整验证结果（不受 Registry 限制） |
| 📌 **Model Tool Output** | Registry 对工具输出做容量限制后的有界投影，**持久化到 Session History** 中并用于模型回放 |

### 5.2 容量限制规则

来自 `tool-output-store.ts` 的默认值：

```ts
export const MAX_LINES = 2_000
export const MAX_BYTES = 50 * 1024    // 50KB
export const RETENTION = Duration.days(7)
```

规则（来自 CONTEXT.md）：

> 📌 *One tool settlement receives one aggregate textual limit, using the configured maximum lines or UTF-8 bytes, whichever is reached first. The limit is provider-independent; token pressure belongs to context assembly and compaction.*

- 限制是 **provider-independent** 的。不同 provider 的 token 压力由 context assembly 和 compaction 处理。Registry 只关心行数和字节数。
- 可配置。通过 Config 中的 `tool_output.max_lines` 和 `tool_output.max_bytes` 覆盖默认值（`MAX_LINES` = 2000, `MAX_BYTES` = 50KB）。

### 5.3 截断策略

在 `boundedPreview()` 中实现：

```
1. 先计算 marker 文本和字节
2. 如果剩余空间不足最小保留量或 marker 本身已占满 → 只返回 marker
3. 否则: preview(text) 计算前一半和后一半
   - line-aligned: 取前 ceil(maxLines/2) 行 + 后 floor(maxLines/2) 行
   - 如果拼接后超过 maxBytes → 改用 byte-aligned: 前 ceil(maxBytes/2) + 后 floor(maxBytes/2)
4. 最终格式: head + marker + tail
```

> 📌 *Generic truncation preserves the beginning and end of textual output. Tools may apply a more meaningful strategy before the Tool Registry enforces the final limit.*

工具可以在 `toModelOutput()` 中做自定义 shaping（例如 bash 工具在自身层面报告 stdout/stderr 截断），Registry 在此之上再应用通用限制。

### 5.4 📌 Managed Tool Output File

当输出超出限制时，完整内容被写入一个临时文件：

> 📌 *A temporary file created under OpenCode's shared tool-output directory to retain complete output that was too large for Session history.*

文件命名：`tool_{Identifier.ascending()}`，存放在 `{global.data}/tool-output/` 目录下。

- 使用 `flag: "wx"` 确保写入唯一新文件（写时排他）。
- **绝对路径对工具可读**：普通工具（bash, read 等）可以读取输出文件路径。
- 7 天自动清理：`cleanup()` 每小时运行一次，删除超过 7 天的文件。

### 5.5 原子 Settlement

> 📌 *Once a tool operation succeeds, bounding its* **Model Tool Output** *and publishing its one durable settlement form an interruption-safe completion region. Raw oversized success is never published before a later correction.*

工具执行成功 → 输出截断 → 写入 Session History 是一个**原子区域**。不存在"先发布原始大输出，后面再修正"的路径。这保证了中断场景下的一致性：要么操作完全完成，要么完全不做。

### 5.6 存储故障的容错

> 📌 *Failure to retain a* **Managed Tool Output File** *does not change a successful tool operation into a failed one. The Session records an explicitly lossy bounded output without a path, while operators receive diagnostics for the storage failure.*

- **成功工具 ≠ 文件写入成功**。如果工具执行成功但输出文件写入失败，工具仍然是成功的，只是 Session 中记录的是无 path 的有损 bounded output。
- 文件写入失败时抛出 `ToolOutputStore.StorageError`，但 settlement 流水线不将其转化为工具失败。

### 5.7 Structured Output 的保护

> 📌 *When a structured-only result would exceed the* **Model Tool Output** *limit, its validated structured value remains unchanged for Session consumers while model replay uses a bounded textual JSON preview and optional managed output path.*

- 当工具没有 content（即只有 structured result，没有 `toModelOutput` 定义的文本内容）且 structured JSON 超过限制时：
  - **Session consumer** 拿到的是完整的、未修改的 `structured` 值。
  - **模型回放** 拿到的是有界文本预览（JSON.stringify 的截断版）。
  - 两个视图不互相影响。

---

## 6. 权限模型

### 6.1 Registry 不依赖 PermissionV2

> *The registry has no `PermissionV2.Service` dependency and performs no execution authorization.*

Registry 的唯一权限相关行为是在 `materialize()` 中做 **whole-tool 定义过滤**。

### 6.2 执行时权限错误

实际的工具执行授权由 `PermissionV2.assert`（`packages/core/src/permission.ts`）处理，它抛出两种 tagged error：

| 错误 | 含义 |
|------|------|
| `PermissionV2.DeclinedError` | 用户拒绝了权限请求 |
| `PermissionV2.BlockedError` | 权限规则明确阻止，携带 `rules: Permission.Ruleset` |

这些错误在 Session Runner 的工具结算阶段被捕获和转换（`packages/core/src/session/runner/llm.ts`: `isUserDeclined`），不影响 Registry 的 catalog 过滤行为。

### 6.3 whole-tool filtering vs execution authorization

`whollyDisabled()` 函数检查一个工具是否被整个禁用：

```ts
function whollyDisabled(action: string, rules: PermissionV2.Ruleset) {
  const rule = rules.findLast((rule) => Wildcard.match(action, rule.action))
  return rule?.resource === "*" && rule.effect === "deny"
}
```

如果一个权限规则匹配工具对应的 action，且 resource 为 `*` 且 effect 为 `deny`，则该工具从 definitions 中移除。LLM 根本不会看到它。

**定义过滤是 catalog visibility，不是 execution authorization。** 即使一个工具出现在 definitions 中，实际执行时的鉴权也不是 Registry 的职责。当 tool call 到达 settlement 阶段后，执行的是 captured leaf policy。

### 6.4 权限 Action 声明

- **内置工具声明**：通过内部函数 `Tool.withPermission()` 为每个工具声明 action。
- **默认行为**：大多数工具的 action 等于其注册名（如 `read`、`bash`）。
- **共享 action**：`edit`、`write`、`apply_patch` 声明为同一个共享 action `"edit"`。

权限源构造（来自 `AGENTS.md`）：
```ts
const source = {
  type: "tool" as const,
  messageID: context.assistantMessageID,
  callID: context.toolCallID,
}
```

---

## 7. CONTEXT.md 中的关键术语

| 术语 | 📌 定义 |
|------|--------|
| **Model Tool Output** | *The bounded projection of a Core-executed tool result persisted in Session history and replayed to the model. A tool may shape this projection semantically, but the Tool Registry enforces the final size limit.* |
| **Managed Tool Output File** | *A temporary file created under OpenCode's shared tool-output directory to retain complete output that was too large for Session history.* |
| **Safe Provider-Turn Boundary** | *The point immediately before a provider call, after durable input promotion and any required tool settlement, where context changes may be admitted chronologically.* |

---

## 8. 关键关系

```
LLM 发起 tool call
  → SessionRunner 调用 ToolRegistry.materialize().settle(input)
    → Registry 查找工具（Location > Application）
    → Tool.settle() 执行 execute(input, context)
      → 解码 input → 执行 → 编码 output → toModelOutput()
    → ToolOutputStore.bound() 容量限制
      → 超出限制？写入 Managed Tool Output File
    → 返回 Settlement { result, output?, outputPaths? }
    → 写入 Session History 作为 Model Tool Output
  → 下一次 Provider Turn 时 LLM 看到 bounded output
```

**隔离边界**：
- **Tool.make() vs Registry**: Tool 只是静态定义，Registry 管理注册和查找。
- **Registry vs Permission**: Registry 做 catalog 可见性过滤，不做执行授权。
- **Registry vs ToolOutputStore**: Registry 做工具执行，ToolOutputStore 只做输出限制。
- **Producer capture limits vs Registry limits**: Bash 等工具自身的 `maxOutputBytes` 是工具层面的限制，Registry 的 lines/bytes 是模型输出层面的独立限制。

---

## 9. 当前待办

来自 `AGENTS.md` 的 Current Gaps：

1. **Plugin 注册重构**：Plugin boot 尚未重新设计为通过 `Tools.Service` 注册 canonical tools。不要作为 leaf migration 的一部分进行。
2. **MCP / Session-scoped 注册**：MCP 和未来的 Session-scoped 注册需要明确的 canonical registration 设计。
3. **outputPaths 封装**：公开的 Session result shape 目前暴露 managed `outputPaths`，完整的存储封装需要未来的 opaque managed-output reference 设计。

---

## 10. Code Mode：独立的工具编排层

OpenCode 1.18.4 引入了 **Code Mode**——一个由 `@opencode-ai/codemode` 包提供的受限 JavaScript 编排环境，通过 `packages/opencode/src/tool/code-mode.ts` 作为实验性 `execute` 工具暴露给模型。

### Code Mode vs Core 工具系统

| 方面 | Core 工具系统 | Code Mode（execute 工具） |
|------|-------------|--------------------------|
| 包 | `@opencode-ai/core` | `@opencode-ai/codemode` + `@opencode-ai/opencode` |
| 启用方式 | 始终可用 | 实验性，需 `OPENCODE_EXPERIMENTAL_CODE_MODE=true` |
| 工具注册 | Core Tool.make() → ApplicationTools / Tools.Service → ToolRegistry | CodeMode.Tool.make() → 工具树（命名空间） |
| 执行模式 | Session Runner 逐工具调用 | 解释器在一次 execute 中顺序/分支/并行调用多个工具 |
| 权限 | PermissionV2.DeclinedError / BlockedError | 宿主侧 `ctx.ask` + `Permission.visibleTools`，库本身无权限模型 |
| 消费者 | Session Runner 通过 `ToolRegistry.materialize().settle()` | 模型编写的 JS 程序 + CodeMode 解释器 |

关键隔离：
- CodeMode **不替代也不修改** Core 工具注册。`execute` 工具通过 OpenCode 产品层的 ToolRegistry（`packages/opencode/src/tool/registry.ts`）注册，与其他内置工具并列出现在模型工具列表中。
- CodeMode 只在有 MCP 工具可见时才真正暴露给模型（`describeCodeMode` 逻辑：`if (Object.keys(tools).length === 0) return`）。
- 所有认证、授权、持久化由宿主（OpenCode）拥有，CodeMode 库只负责解析和解释受限 JS 子集。

详见 [[Code Mode详解.md]]。

## 11. 相关笔记

- [[02-session-lifecycle|02 — 会话系统 (Session Lifecycle)]]
- [[04-llm-interaction|04 — LLM/Provider 交互层]]
- [[Code Mode详解|Code Mode 详解]]：独立的工具编排层（实验性 `execute` 工具）

---

最后更新：2026-07-24 | 来源：`packages/core/src/tool/tool.ts` + `packages/core/src/tool/registry.ts` + `packages/core/src/tool/application-tools.ts` + `packages/core/src/tool/tools.ts` + `packages/core/src/tool/builtins.ts` + `packages/core/src/tool-output-store.ts` + `packages/core/src/permission.ts` + `packages/opencode/src/tool/registry.ts` + `packages/opencode/src/tool/code-mode.ts` + CONTEXT.md
