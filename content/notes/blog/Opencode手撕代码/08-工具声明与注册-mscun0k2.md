---
blog: true
title: "08-工具声明与注册"
slug: "08-工具声明与注册-mscun0k2"
summary: "08 工具声明与注册 树节点：08 工具声明与注册 父节点：Opencode的工作原理 子节点：08 工具选择与权限 | 08 工具执行与结算 | 08 输出截断与Managed Output 1. 概览 OpenCode 的工具系统采用 三层架构 ：声明层（ Tool.make ）→ 注册层（ ToolRegistry / ApplicationTools ）→ 执行层（ settle ）。每层职责清晰，独立可测。 核心概念： Too"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "08-工具选择与权限-mscun0id"
  - "08-工具执行与结算-mscun0jf"
  - "08-输出截断与managed-output-mscun0jr"
---

# 08-工具声明与注册

> 树节点：08-工具声明与注册
> 父节点：[[Opencode的工作原理]]
> 子节点：[[08-工具选择与权限]] | [[08-工具执行与结算]] | [[08-输出截断与Managed-Output]]

---

## 1. 概览

OpenCode 的工具系统采用**三层架构**：声明层（`Tool.make`）→ 注册层（`ToolRegistry` / `ApplicationTools`）→ 执行层（`settle`）。每层职责清晰，独立可测。

核心概念：

- **`Tool.make()`** 创建一个不透明（opaque）的工具值，封装了 input schema、output schema、execute 函数、toModelOutput 工厂
- **`Tools.Service`** 是只暴露 `register` 的窄接口，供 Location 级生产者注册工具
- **`ToolRegistry.Service`** 是完整的 Location 级注册表，负责 `materialize`（生成 LLM 定义列表 + settle 函数）
- **`ApplicationTools.Service`** 是进程级注册表，供用户通过 `opencode.tools.register()` 注册应用层工具

**引用来源：**
- `packages/core/src/tool/tool.ts:1-162` — Tool 定义与 make 工厂
- `packages/core/src/tool/registry.ts:1-147` — ToolRegistry 完整实现
- `packages/core/src/tool/tools.ts:1-13` — Tools 窄接口
- `packages/core/src/tool/application-tools.ts:1-57` — 应用层工具注册
- `packages/core/src/tool/builtins.ts:1-48` — 内置工具清单
- `packages/core/src/tool/AGENTS.md` — 架构说明

---

## 2. Tool.make() — 工具工厂

`Tool.make()` 接收一个 `Config` 对象，返回一个**不透明的冻结对象**（`Object.freeze({})`），其内部运行时通过 `WeakMap` 关联。

### Config 结构（`tool.ts:40-61`）

```ts
type Config<Input, Output, Structured> = {
  description: string          // 工具描述，给 LLM 看的
  input: Input                 // 输入 schema（Effect Schema）
  output: Output               // 输出 schema（Effect Schema）
  structured?: Structured      // 可选的结构化输出 schema
  toStructuredOutput?: (ctx) => Structured  // 输出转换器
  execute: (input, context) => Effect<Output, ToolFailure>  // 执行函数
  toModelOutput?: (ctx) => ReadonlyArray<Content>  // 模型输出格式化
}
```

关键点：
- `input` 和 `output` 都是 **Effect Schema Codec**（`Schema.Codec<A, any, never, never>`，`tool.ts:16`），既能 decode 也能 encode
- `execute` 返回 `Effect`，天然支持依赖注入和错误处理
- `Context` 包含 `sessionID`、`agent`、`assistantMessageID`、`toolCallID`（`tool.ts:9-14`）
- `toModelOutput` 控制如何把工具输出呈现给 LLM（文本 / 文件 base64）

### 内部 Runtime（`tool.ts:63-67, 69`）

```ts
type Runtime = {
  permission?: string                    // 可选的自定义权限 action 名
  definition: (name) => ToolDefinition   // 生成 LLM 工具定义
  settle: (call, context) => Effect<ToolOutput, ToolFailure>  // 执行工具
}
const runtimes = new WeakMap<AnyTool, Runtime>()
```

`make()` 创建 tool → 存入 `runtimes` WeakMap → 工具值对外是不透明的，只能通过 `definition()`、`settle()`、`permission()` 三个访问函数操作。

### make() 执行流程（`tool.ts:71-132`）

1. 创建冻结空对象作为 tool 标识
2. 缓存 `ToolDefinition`（按 name 缓存，`tool.ts:79-89`）
3. `settle` 闭包：
   - `Schema.decodeUnknownEffect(input)` 解码 LLM 传参（`tool.ts:92`）
   - 调用 `config.execute(input, context)`（`tool.ts:95`）
   - `Schema.encodeEffect(output)` 编码输出（`tool.ts:97`）
   - 可选：`toStructuredOutput` → `encodeEffect(structured)`（`tool.ts:99-103`）
   - `toModelOutput` 格式化（`tool.ts:116-124`）

---

## 3. 内置工具清单

所有内置工具定义在 `builtins.ts:18-48`，通过 `makeLocationNode` 组合为一个 Location 节点（`node`），统一注入到 `ToolRegistry`。

| 工具名 | 源文件 | 说明 |
|--------|--------|------|
| `bash` | `packages/core/src/tool/bash.ts` | 执行 shell 命令 |
| `read` | `packages/core/src/tool/read.ts` | 读取文件 |
| `write` | `packages/core/src/tool/write.ts` | 写入文件 |
| `edit` | `packages/core/src/tool/edit.ts` | 精确字符串替换编辑 |
| `apply_patch` | `packages/core/src/tool/apply-patch.ts` | 应用 patch |
| `glob` | `packages/core/src/tool/glob.ts` | 文件名匹配查找 |
| `grep` | `packages/core/src/tool/grep.ts` | 文件内容正则搜索 |
| `webfetch` | `packages/core/src/tool/webfetch.ts` | 获取网页内容 |
| `websearch` | `packages/core/src/tool/websearch.ts` | 搜索引擎查询 |
| `question` | `packages/core/src/tool/question.ts` | 向用户提问 |
| `todowrite` | `packages/core/src/tool/todowrite.ts` | 创建/管理任务列表 |
| `skill` | `packages/core/src/tool/skill.ts` | 加载 skill |

> 另有进程级工具 `read-filesystem`、`http-body` 等由用户/插件通过 `ApplicationTools` 注册。`builtins.ts:26-29` 标注了待迁移的工具：`edit fuzzy parity`、`task`、`LSP`、`repo_clone`、`repo_overview`、`plan_exit`。

---

## 4. 注册机制

### 4.1 两层注册

| 层 | 服务 | 作用域 | 接口 |
|----|------|--------|------|
| **Location** | `ToolRegistry.Service` | Location 级（每个 project/location 独立） | `materialize()` + `register()` |
| **Application** | `ApplicationTools.Service` | 进程级（所有 Location 共享） | `register()` + `entries()` |

**来源**：`registry.ts:42-125`、`application-tools.ts:28-57`

### 4.2 Location 注册（`registry.ts:85-105`）

```ts
register: Effect.fn("ToolRegistry.register")(function* (tools) {
  const entries = Object.entries(tools)
  if (entries.length === 0) return
  yield* Effect.forEach(entries, ([name]) => validateName(name), { discard: true })
  yield* Effect.uninterruptible(
    Effect.gen(function* () {
      const token = {}
      for (const [name, tool] of entries)
        local.set(name, [...(local.get(name) ?? []), { token, registration: { identity: {}, tool } }])
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          // Scope 关闭时移除本次注册的全部工具
          for (const [name] of entries) {
            const registrations = local.get(name)?.filter(r => r.token !== token) ?? []
            if (registrations.length > 0) local.set(name, registrations)
            else local.delete(name)
          }
        }),
      )
    }),
  )
})
```

关键机制（`registry.ts:48`）：
- 同一个 name 可以有多个注册，**最后一个生效**（`local.get(name)?.at(-1)`）
- 注册通过 `Scope` 管理生命周期：scope 关闭时自动清理
- `validateName` 强制工具名满足 `/^[A-Za-z][A-Za-z0-9_-]{0,63}$/`（`tool.ts:134-137`）
- `Effect.uninterruptible` 保证注册原子性（`registry.ts:89`）

### 4.3 Application 注册（`application-tools.ts:43-51`）

```ts
register: Effect.fn("ApplicationTools.register")(function* (tools) {
  const entries = Object.entries(tools)
  if (entries.length === 0) return
  yield* Effect.forEach(entries, ([name]) => Tool.validateName(name), { discard: true })
  const registrations = entries.map(([name, tool]) => [name, { identity: {}, tool }] as const)
  yield* state.transform((draft) => {
    for (const [name, entry] of registrations) draft.set(name, entry)
  })
})
```

与 Location 注册的区别：
- 使用 `State`（`application-tools.ts:33`）管理状态而非 `Map`
- 无 Scope 自动清理（进程级持久）
- 无多次覆盖（直接 set）

### 4.4 Tools.Service 窄接口（`tools.ts:1-13`）

```ts
export interface Interface {
  readonly register: (
    tools: Readonly<Record<string, Tool.AnyTool>>,
  ) => Effect.Effect<void, Tool.RegistrationError, Scope.Scope>
}
```

`Tools.Service` 只暴露 `register`，隐藏了 `materialize` / `settle` 等内部能力。内置工具通过 `Tools.Service.register(...)` 注册，应用工具通过 `ApplicationTools.Service.register(...)` 注册。

---

## 5. materialize — 工具物化

`materialize()` 是 ToolRegistry 的核心操作（`registry.ts:106-122`），产生两个产物：

```ts
interface Materialization {
  readonly definitions: ReadonlyArray<ToolDefinition>   // 给 LLM 的工具声明列表
  readonly settle: (input: ExecuteInput) => Effect<Settlement, ...>  // 执行工具的函数
}
```

### 合并顺序（`registry.ts:107-111`）

1. 先取 `applications.entries()` 作为基础
2. 用 `local`（Location 注册）覆盖同 name 的 application 工具
3. 对每个工具，调用 `whollyDisabled()` 检查权限筛选

### 权限筛选（`registry.ts:112-113, 132-135`）

```ts
for (const [name, registration] of registrations)
  if (whollyDisabled(permission(registration.tool, name), permissions))
    registrations.delete(name)

function whollyDisabled(action: string, rules: PermissionV2.Ruleset) {
  const rule = rules.findLast((rule) => Wildcard.match(action, rule.action))
  return rule?.resource === "*" && rule.effect === "deny"
}
```

`whollyDisabled` 只检查 `resource: "*"` 且 `effect: "deny"` 的规则——这是"完全禁用"语义（`* deny`），不是执行授权。详见 [[08-工具选择与权限]]。

> 注意：`permission(registration.tool, name)`（`tool.ts:148`）优先使用工具的 `runtime.permission`，未设置时回退到 `name`。`edit`、`write`、`apply_patch` 三个工具共享 `edit` action（见 `AGENTS.md` 说明）。

### 生成 LLM 定义（`registry.ts:115`）

```ts
definitions: Array.from(registrations, ([name, reg]) => definition(name, reg.tool))
```

`definition()` → `runtime.definition(name)`（`tool.ts:149, 79-89`）→ 创建 `ToolDefinition` 对象，包含：`name`、`description`、`inputSchema`（JSON Schema）、`outputSchema`。

### 生成 settle（`registry.ts:116-120`）

返回闭包，查找注册的工具并调用 `settleWith()`。`settleWith` 做：
1. `settle(registration.tool, input.call, context)` — 实际执行工具（`registry.ts:62`）
2. `resources.bound(...)` — 应用输出截断（`registry.ts:75`）
3. `ToolOutput.toResultValue(bounded.output)` — 转换为结果值（`registry.ts:76`）

详细输出处理见 [[08-输出截断与Managed-Output]]。

---

## 6. 节点组合

`builtins.ts:31-47` 将 12 个内置工具组合为 `node`：

```ts
export const node = makeLocationNode({
  name: "built-in-tools",
  layer: Layer.empty,
  deps: [
    ApplyPatchTool.node, BashTool.node, EditTool.node,
    GlobTool.node, GrepTool.node, QuestionTool.node,
    ReadTool.node, SkillTool.node, TodoWriteTool.node,
    WebFetchTool.node, WebSearchTool.node, WriteTool.node,
  ],
})
```

每个内置工具独立定义自己的 `node`（包含自己的 Layer、依赖、权限注入），`makeLocationNode` 将它们组合为统一的 Location 节点注入到 ToolRegistry。

`registry.ts:137-147` 暴露两个节点：
- `toolRegistryNode` — 完整 ToolRegistry.Service
- `toolsNode` — 窄接口 Tools.Service（只含 register）

---

## 7. 注册 → 执行的完整生命周期

```
1. 构建阶段
   BuiltInTools.node → ToolRegistry 注入 Layer
   ↓
2. 启动时
   ToolRegistry layer 初始化 local Map（空）
   ApplicationTools layer 初始化 State
   ↓
3. 工具注册（Location scope 内）
   Tools.Service.register({ tool: ... }) → local.set(name, tool)
   ↓
4. materialize（每次 provider turn）
   合并 application + local → 权限筛选 → 生成 definitions + settle
   ↓
5. LLM 调用工具
   definitions 注入 system prompt → LLM 返回 tool_call
   ↓
6. 工具执行
   settle(input) → validate input → execute → validate output → bound output
   ↓
7. Scope 关闭
   自动注销 local 注册的工具
```
