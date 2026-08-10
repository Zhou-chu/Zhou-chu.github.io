---
blog: true
title: "Code Mode 详解"
slug: "code-mode-详解-mscuwjps"
summary: "Code Mode 详解 Code Mode 是 OpenCode 1.18.4 引入的 受限 JavaScript 编排环境 ——让模型编写小程序，在显式指定的工具树上顺序、分支、并行地调用工具，但不拥有任何环境权限。它由 @opencode ai/codemode 包（ packages/codemode/ ）提供核心解释器，再由 OpenCode 产品层（ packages/opencode/src/tool/code mode."
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# Code Mode 详解

Code Mode 是 OpenCode 1.18.4 引入的**受限 JavaScript 编排环境**——让模型编写小程序，在显式指定的工具树上顺序、分支、并行地调用工具，但不拥有任何环境权限。它由 `@opencode-ai/codemode` 包（`packages/codemode/`）提供核心解释器，再由 OpenCode 产品层（`packages/opencode/src/tool/code-mode.ts`）作为实验性 `execute` 工具暴露给模型。

> 阅读前提：理解 [[03-tool-system|工具系统的基础架构]]（Core V2 的不透明 Tool.make() 和 Registry）。Code Mode 是独立的工具编排层，不替代也不修改 Core 工具注册。

---

## 1. 宿主中立库边界 — Authority Boundary

`@opencode-ai/codemode` 是一个**私有的 workspace 包**（`packages/codemode/package.json`），只依赖 `acorn`（解析 JS 源码）和 `effect`。它不包含 Session、Agent、数据库、MCP、网络客户端等 OpenCode 概念。

CodeMode 将程序限制在提供的工具树上，但它**不决定这些工具能做什么**。

边界划分：

| 宿主（OpenCode）拥有 | CodeMode 库拥有 |
|---|---|
| 认证和授权 | 解析和解释受限 JS 子集 |
| 工具选择与不可变作用域 | 工具调用周围的 Schema 边界 |
| 凭据和网络客户端 | 纯数据拷贝和原型成员拦截 |
| 持久化、审批、副作用 | 资源限制、调用计数、标准化诊断 |
| 日志和脱敏策略 | 面向模型的工具发现和指令生成 |

CodeMode 只约束**程序不能做什么**（没有 `eval`、没有网络、没有文件系统）。它**不决定工具能做什**——如果宿主授予了一个能读写磁盘的工具，CodeMode 不会拦截。因此，不要暴露范围过宽的工具然后期望 prompt 去约束。

---

## 2. 工具树：`Tool.make()` 与 Schema 描述

### 2.1 Tool.make()

CodeMode 的工具通过 `Tool.make()` 定义（`packages/codemode/src/tool.ts`）：

```ts
Tool.make({
  description: string,      // 模型可见的一行描述
  input: SchemaType,        // Effect Schema 或 JSON Schema
  output?: SchemaType,      // 可选；省略则 Promise<unknown>
  run: (input) => Effect,   // 宿主 Effect 实现
})
```

**两种 Schema 模式**：

- **Effect Schema**（`Schema.Struct(...)`）：CodeMode 在执行 `run` 前先解码输入，`run` 返回后对输出编码→解码→拷贝。输入类型错误直接拒绝为 `InvalidToolInput`。
- **JSON Schema 文档**（纯 `{ type: "object", properties: {...}, required: [...] }`）：只用于生成模型可见的 TypeScript 签名，**不验证**。这是适配器提供工具的自然形态（如 MCP 定义）。值仍经过纯数据边界拷贝。

`output` 是可选的。省略时工具的签名为 `Promise<unknown>`，宿主结果原样暴露（仅跨纯数据边界）。

### 2.2 工具树结构

宿主将工具组织为**命名空间树**——一个嵌套对象，叶子是 `Tool.make()` 返回的 `Definition`：

```ts
CodeMode.make({
  tools: {
    orders: { lookup: lookupOrder, cancel: cancelOrder },
    github: { list_issues: listIssues },
  },
})
```

程序内部通过 `tools.orders.lookup({ id: "..." })` 调用。顶层命名空间 `$codemode` 被保留（用于运行时搜索工具），宿主不能定义它。

### 2.3 与 Core Core 工具的对比

| 方面 | Core `Tool.make()` | CodeMode `Tool.make()` |
|---|---|---|
| 包 | `@opencode-ai/core` | `@opencode-ai/codemode` |
| 不透明性 | `WeakMap` + `Object.freeze({})` | 公开 `_tag: "CodeModeTool"` |
| Schema | 仅 Effect Schema | Effect Schema 或 JSON Schema |
| 权限 | `withPermission(tool, p)` | 无内置权限；宿主在 `run` 中处理 |
| 消费者 | Session Runner 通过 Registry settle | CodeMode 解释器 + 模型编写的 JS |

---

## 3. 受限 JavaScript 子集

CodeMode 执行一个**刻意限定的 JavaScript 子集**。它不是通用沙箱——它是编排语言，不是通用 JavaScript 运行时。

### 3.1 实现原理

解释器收到源码后，先通过 TypeScript 编译器（`ts.transpileModule`）**异步包装为 `async function __codemode__() { ... }`**，然后通过 `acorn` 解析为 AST 并在自定义的 `Interpreter` 类上逐节点执行。

这意味着：
- 所有 `return` / `await` 对外表现为隐式 async 函数——`return tools.ns.tool(...)` 自动 resolve。
- 程序返回 `undefined` 时结果归一化为 `null`；嵌套 `undefined` 同理。
- `throw value` 和 `throw new Error(...)` 转为 `ExecutionFailure`。

### 3.2 支持的特性

- **数据**：字面量、属性访问、赋值、解构、可选链、空值合并、模板字符串、展开运算符
- **控制流**：`if`/`switch`/`for`/`for...of`/`for...in`/`while`/`do...while`
- **函数**：箭头函数、函数声明、闭包、默认参数、剩余参数、解构参数
- **数组/字符串/数字**：`push`/`pop`/`shift`/`unshift`/`splice`/`fill`/`copyWithin`、slice/includes/indexOf/map/reduce/filter；字符串 split/slice/replace/match/matchAll/trim/normalize；数字常量
- **Object/Math/JSON**：`Object.keys`（也接受数组和工具引用）、`Object.values`/`Object.entries`；`Math.*`；`JSON.parse`/`JSON.stringify`
- **Date**：`Date.now()`/`Date.parse()`/`Date.UTC()`、`new Date(...)`、getter 方法、时间值算术；`toString()` 输出 ISO 格式以保证跨时区确定性
- **RegExp**：字面量 `/pattern/flags` 和 `new RegExp(...)`、`test`/`exec`、字符串 `match`/`matchAll`/`replace`/`replaceAll`/`split`/`search`；错误时提示缺少 `g` 标志等修复建议
- **Map/Set**：构造、`get`/`set`/`add`/`has`/`delete`/`clear`/`size`/`forEach`；`keys`/`values`/`entries` 返回**数组**（不是迭代器）
- **URL/URI**：`URL`、`URLSearchParams`、`URL.canParse`/`URL.parse`、`encodeURI`/`encodeURIComponent`/`decodeURI`/`decodeURIComponent`
- **Promise**：`await` 工具调用、`Promise.all`/`Promise.allSettled`/`Promise.race`/`Promise.resolve`/`Promise.reject`；最多 8 个工具调用并发

### 3.3 不暴露的能力

`eval`、动态 `import`、模块、class、generator、timer（`setTimeout`/`setInterval`）、宿主全局变量、原型变更、`new Promise`、`Promise.then/.catch/.finally`（替代：`await` + `try/catch`）。

不支持语法返回 `UnsupportedSyntax` 诊断项。

---

## 4. 纯数据边界和归一化

在沙箱内部，标准库值保持"活的"——`Date` 可以调 `.getTime()`，`Map` 可以调 `.has()`。程序内部的 `Object.*` 辅助函数、展开、强制类型转换等 checkpoint 保留其实例。

但在跨宿主边界（最终返回值、工具参数、`JSON.stringify`）时，值序列化为 JSON 等价物：

| 类型 | 边界序列化 |
|---|---|
| Date、URL | ISO 字符串（无效 Date 变为 `null`） |
| RegExp、Map、Set、URLSearchParams | `{}` |
| Promise（未 await） | 拒绝为 `InvalidDataValue`（提示 await） |
| NaN、Infinity | `null` |
| `undefined`（嵌套） | `null` |

这个边界由 `copyIn`（`packages/codemode/src/tool-runtime.ts`）实现，也检查最大嵌套深度（32 层）、循环引用、阻塞属性（`__proto__`/`constructor`/`prototype`）。

---

## 5. 执行限制（Execution Limits）& 诊断（Diagnostics）

### 5.1 Execution Limits —— 三个限制参数

```ts
CodeMode.make({
  limits: {
    timeoutMs: 60_000,    // 壁钟时间（毫秒），省略 = 无超时
    maxToolCalls: 20,     // 允许的调用次数，省略 = 无限
    maxOutputBytes: 8192, // 模型输出截断阈值（UTF-8 字节），省略 = 不截断
  },
})
```

**所有限制默认不启用**——执行预算是宿主策略，不是库策略。
- 能中断 execution fiber 的宿主（如 OpenCode 用户取消）可以不设 `timeoutMs`。
- 有自己工具输出截断机制的宿主可以不设 `maxOutputBytes`。
- 两者都没有的宿主**必须**设 `maxOutputBytes`，否则超大结果会无声涌入模型上下文。

超出 `maxOutputBytes` **不失败**执行：结果值替换为截断后的序列化文本 + 解释标记，日志从起始保留直到字节预算耗尽，结果带有 `truncated: true`。

超时中断所有 in-flight 工具 Effect（包括未 await 的调用），解释器在步骤间协作式让步，所以 `while (true) {}` 纯忙循环也会中断。

### 5.2 两个固定常数

- **并发上限**：同时间最多 8 个工具调用运行
- **深度上限**：跨数据边界值最多嵌套 32 层（超出为 `InvalidDataValue`）

两者都不是公开可配置的——前者防止解释器饥饿，后者产生比原生栈溢出错误更清晰的诊断。

### 5.3 Diagnostics —— 诊断分类

| 诊断 | 含义 |
|---|---|
| `ParseError` | 源码为空或无法解析 |
| `UnsupportedSyntax` | 使用了不支持的子集外的语法 |
| `UnknownTool` | 程序引用了宿主未提供的工具 |
| `InvalidToolInput` | 工具输入 Schema 解码或数据拷贝失败 |
| `InvalidToolOutput` | 工具输出 Schema 解码或数据拷贝失败 |
| `InvalidDataValue` | 违反了纯数据契约（深度/循环/阻塞属性/非数据值） |
| `ToolCallLimitExceeded` | 超出 `maxToolCalls` |
| `TimeoutExceeded` | 超出 `timeoutMs` |
| `ToolFailure` | 工具拒绝或执行失败（仅安全消息可被模型看到） |
| `ExecutionFailure` | 程序抛出未捕获异常或其他执行错误 |

未知的宿主失败、defect、无效输出等都会被 sanitize。工具要返回安全的拒绝操作，使用 `toolError(message)`（`packages/codemode/src/tool-error.ts`）——只有提供的 `message` 是模型可见的，可选的 `cause` 绝不会出现在 `CodeMode.Result` 中。

---

## 6. 工具发现：预算目录 & 搜索

### 6.1 预算目录

`runtime.instructions()` 生成的模型可见文本使用**预算驱动的渐进式目录**：

- 每个命名空间始终列出工具总数
- 用一个统一预算（默认 ~2000 estimated tokens，chars/4）来 inline 完整的 TypeScript 签名
- 选取策略是跨命名空间**轮询公平**：每轮（字母序）各命名空间尝试放入次便宜的行，放不下的退出
- 指令精确标注全面性：`COMPLETE list` vs `PARTIAL - N of M shown`；每个命名空间 `(3 tools)` / `(3 tools, 1 shown)` / `(3 tools, none shown)`

示例签名：
```ts
tools.github.list_issues(input: {
  /** Repository owner */
  owner: string,
  /**
   * Results per page
   * @default 30
   */
  perPage?: number,
}): Promise<unknown>
```

### 6.2 `$codemode.search`

当 inline 目录不完整时，运行时搜索工具也会暴露给模型：

```ts
const matches = await tools.$codemode.search({
  query: "issue search",      // 意图+关键词
  namespace: "github",         // 可选：限定命名空间
  limit: 10,                   // 默认 10
  offset: 0,
})
// { items: [...], remaining: N, next: { offset: 10 } | null }
```

搜索执行**确定性、加性的字段加权匹配**：精确路径或路径段匹配（20） > 路径子串（8） > 描述子串（4） > 可搜索文本子串（2）——可搜索文本也包括输入 Schema 的属性名和描述。每个词还附加单数变体（去掉尾部 `s`/`es`）。按分数降序、字母序平局断定排序。

---

## 7. OpenAPI 适配器

`OpenAPI.fromSpec`（`packages/codemode/src/openapi/index.ts`）将 OpenAPI 3.x 文档转为 CodeMode 工具子树——**一个操作一个工具**：

```ts
import { CodeMode, OpenAPI } from "@opencode-ai/codemode"
import { FetchHttpClient } from "effect/unstable/http"

const api = OpenAPI.fromSpec({
  spec: await Bun.file("openapi.json").json(),
  auth: {
    resolve: ({ name, scopes, operation }) =>
      name === "BearerAuth" ? Effect.succeed({ type: "bearer", token }) : Effect.succeed(undefined),
  },
})

const runtime = CodeMode.make({ tools: { opencode: api.tools } })
```

要点：
- `fromSpec` 是同步的，返回 `{ tools, skipped }`。
- 生成工具需要 `HttpClient.HttpClient` 环境（通过 `FetchHttpClient.layer`）。
- 支持参数编码：query `form`/`deepObject`、path/header `simple`、JSON 请求体、JSON 响应、文本响应。
- **认证从不模型可见**：所有安全决策在宿主侧通过 `auth.resolve` 回调完成。
- 非 2xx 响应变为安全的工具失败，携带状态码和摘要。
- 响应限制 50 MiB。

---

## 8. OpenCode 的实验性 `execute` 适配器

OpenCode 通过 `packages/opencode/src/tool/code-mode.ts` 将 CodeMode 挂载为工具 ID `CODE_MODE_TOOL`（值为 `"execute"`）——一个**实验性工具**，仅当 `OPENCODE_EXPERIMENTAL_CODE_MODE` 环境变量开启时可用。

### 8.1 启用控制

`RuntimeFlags.experimentalCodeMode`（`packages/opencode/src/effect/runtime-flags.ts`）：

```
OPENCODE_EXPERIMENTAL_CODE_MODE=true
# 或
OPENCODE_EXPERIMENTAL=true
```

ToolRegistry 在初始化时检测此标志（`packages/opencode/src/tool/registry.ts`）：

```ts
const codeMode = flags.experimentalCodeMode
  ? yield* Effect.promise(() => import("./code-mode"))
  : undefined
const codeModeTool = codeMode ? yield* codeMode.CodeModeTool : undefined
```

然后通过展开运算符加入 builtin 数组（`packages/opencode/src/tool/registry.ts`: `const codeMode = flags.experimentalCodeMode ? yield* Effect.promise(() => import("./code-mode")) : undefined`），并**仅在有 MCP 工具可见时**才真正返回给模型（`registry.ts`: `describeCodeMode` 逻辑中 `if (Object.keys(tools).length === 0) return`）。

### 8.2 执行流程（`code-mode.ts`）

`CodeModeTool` 是一个 `Tool.define` 包装的 Effect generator，执行流程为：

```
1. 权限过滤
   ├── Permission.merge(agent.permission, session.permission)
   └── Permission.visibleTools(mcp.tools(), ruleset)
        → 只有权限规则允许的 MCP 工具才暴露

2. 构建工具树
   └── groupByServer(visibleTools, servers)
        → 按 MCP 服务器分组，每个工具转为 Tool.make({
              description: tool.def.description,
              input: tool.def.inputSchema as JsonSchema,
              output: tool.def.outputSchema as JsonSchema,
              run: callTool(entry)
           })
        → callTool 闭包处理子调用计数、invokeChildTool、MCP 结果投映

3. 创建 CodeMode runtime
   └── CodeMode.make({ tools: toolTree(catalog, callTool) })
        → 注册 onToolCallStart / onToolCallEnd 挂钩
        → 启动时/结束时通过 ctx.metadata() 发布进度

4. 执行
   └── Effect.raceFirst(
          runtime.execute(params.code),
          abort.pipe(Effect.map(cancelled))
        )
        → 程序完成 vs 用户取消（通过 ctx.abort 事件竞争）

5. 结果投映
   ├── 成功: result.value → JSON.stringify → output
   ├── 失败且在 abort 中: "Execution cancelled."
   └── 失败: 拼接 error.message + suggestions → ToolFailure
```

### 8.3 子调用挂钩与安顿

每个 MCP 工具的 `callTool` 函数（`packages/opencode/src/tool/code-mode.ts`: `const callTool = (entry: CatalogEntry) => (input: unknown) => ...`）：

1. 递增 `childCalls` 计数，生成唯一 `callID`（`${ctx.callID ?? entry.key}/${childCalls}`）
2. 调用 `invokeChildTool`（`packages/opencode/src/tool/code-mode.ts`: `invokeChildTool` 函数）：
   - 触发 `plugin.trigger("tool.execute.before", ...)` 钩子
   - 调用 `ctx.ask({ permission: entry.key, ... })`——执行时权限检查
   - 通过 `entry.tool.client.callTool(name, args, schema, options)` 执行 MCP 调用
   - 触发 `plugin.trigger("tool.execute.after", ...)` 钩子
3. `projectMcpResult`（`packages/opencode/src/tool/code-mode.ts`: `projectMcpResult` 函数）处理 MCP 响应：
   - `text` 块：直接拼接
   - `image`/`audio` 块：转为 data URL 附件
   - `resource` 块：有 `text` 的取文本，否则转为 data URL 附件
   - `resource_link`：转为 `name: URI` 文本
   - `structuredContent` 优先级最高，作为结构化结果返回
4. 失败处理（`packages/opencode/src/tool/code-mode.ts`: `Effect.catchCause` 分支）：纯中断向上传播，其他错误包装为 `toolError` 返回给解释器

### 8.4 附件投映

程序执行成功时，附件的 `Attachment[]` 直接挂在 `Tool.ExecuteResult` 上（`packages/opencode/src/tool/code-mode.ts`: `result` 返回中的 `attachments` 字段），这样宿主（TUI/Web）可以渲染图片和文件。

### 8.5 目录描述

`describeCatalog`（`packages/opencode/src/tool/code-mode.ts`: `describeCatalog` 函数）在 Registry 的 `describeCodeMode` 函数中调用（`packages/opencode/src/tool/registry.ts`: `describeCodeMode` 函数），为 LLM 生成面向模型的工具可用性文本：

```ts
CodeMode.make({
  tools: toolTree([...catalog], () => () => Effect.fail(toolError("Tool preview is not executable."))),
}).instructions()
```

这里工具使用 `toolError` 存根，因为目录描述是纯预览——不能真正执行。

---

## 9. 关键关系总结

```
宿主(OpenCode)仓库
├── packages/codemode/          ← Code Mode 核心库（宿主中立）
│   ├── src/codemode.ts         ← CodeMode.make/execute、诊断、限制类型
│   ├── src/tool.ts             ← Tool.make（Schema 描述的工具定义）
│   ├── src/tool-runtime.ts     ← 工具解析、数据边界、搜索、指令生成
│   ├── src/interpreter/runtime.ts  ← AST 解释器（acorn+ts）
│   ├── src/interpreter/model.ts    ← AST 模型、运行时引用
│   ├── src/stdlib/             ← 受限标准库实现（12 个模块）
│   ├── src/values.ts           ← 沙箱值类型（SandboxDate/Map/Set/URL...）
│   ├── src/tool-error.ts       ← toolError 安全失败通道
│   └── src/openapi/            ← OpenAPI → 工具树适配器
│
└── packages/opencode/src/
    ├── tool/code-mode.ts       ← execute 工具、MCP 适配、子调用、附件投映
    ├── tool/registry.ts        ← experimentalCodeMode 开关、describeCodeMode
    └── effect/runtime-flags.ts ← experimentalCodeMode 环境变量
```

**与 Core 工具系统（[[03-tool-system]]）的关系**：
- Core `Tool.make()` 服务 Session Runner 的 `settle/materialize` 流程——一对一工具调用。
- CodeMode `Tool.make()` 服务**解释器**——一次执行中调多个工具，支持顺序/分支/并行。
- OpenCode 的 `execute` 工具通过 Core 的 `Tool.define()` 注册，所以它和其他工具（read/shell/grep...）并列出现在模型的工具列表中。
- CodeMode 没有权限模型——权限完全在宿主侧（`ctx.ask`、`Permission.visibleTools`）处理。

---

## 10. 相关笔记

- [[03-tool-system|03 — 工具系统 (Tool System)]]：Core V2 的不透明 Tool.make() 和 Registry
- [[Session Runner 完整执行流程]]：execute 工具在 Session Runner 中如何被调用和安顿
- [[00-overview|00 — 项目总览]]：包依赖关系图（codemode 独立于 Core/Protocol/Server）

---

最后更新：2026-07-24 | 来源：`packages/codemode/README.md` + `packages/codemode/AGENTS.md` + `packages/codemode/src/` 源码走读 + `packages/opencode/src/tool/code-mode.ts` + `packages/opencode/src/tool/registry.ts`
