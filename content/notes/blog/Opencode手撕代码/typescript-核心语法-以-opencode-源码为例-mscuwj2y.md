---
blog: true
title: "TypeScript 核心语法 —— 以 Opencode 源码为例"
slug: "typescript-核心语法-以-opencode-源码为例-mscuwj2y"
summary: "树节点：02 TypeScript核心语法 父节点：Opencode的工作原理 子节点：02 Effect TS核心范式 | 02 Layer与依赖注入 | 02 Fiber与Scope TypeScript 核心语法 —— 以 Opencode 源码为例 本文面向有编程经验但刚接触 TypeScript 的开发者。以 Opencode 项目的真实代码为案例，逐一解释 TS 中最重要的类型系统特性及其使用场景。 1. Schema.Cl"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "02-layer与依赖注入-mscuwj12"
  - "02-fiber与scope-mscumzqz"
---

> 树节点：02-TypeScript核心语法
> 父节点：[[Opencode的工作原理]]
> 子节点：[[02-Effect-TS核心范式]] | [[02-Layer与依赖注入]] | [[02-Fiber与Scope]]
# TypeScript 核心语法 —— 以 Opencode 源码为例
本文面向有编程经验但刚接触 TypeScript 的开发者。以 Opencode 项目的真实代码为案例，逐一解释 TS 中最重要的类型系统特性及其使用场景。
## 1. Schema.Class / Schema.Struct / Schema.TaggedError
### 定义
这三种结构是 Effect/Schema 提供的运行时 + 类型定义方式：
- **Schema.Struct**：定义 plain object 的结构（运行时数据校验 + TypeScript 类型推导）
- **Schema.Class**：定义带构造器的 class 式 schema（除了 Struct 的能力，还会生成 class 实例）
- **Schema.TaggedErrorClass**：定义带 `_tag` 字段的错误类，用于 Effect 的错误通道
### Opencode 示例
**Schema.Struct** — 最常用的数据定义方式：
```ts
// packages/schema/src/session.ts:19-44
export const Info = Schema.Struct({
  id: ID,
  title: Schema.String,
  location: Location.Ref,
  tokens: Schema.Struct({
    input: Schema.Finite,
    output: Schema.Finite,
  }),
}).annotate({ identifier: "SessionV2.Info" })
```
`annotate` 为 schema 添加稳定标识符，方便调试和序列化。
**Schema.Struct + statics** — 给 schema 附加静态方法：
```ts
// packages/schema/src/agent.ts:19-37
export const Info = Schema.Struct({
  id: ID,
  model: Model.Ref.pipe(optional),
  mode: Schema.Literals(["subagent", "primary", "all"]),
  permissions: Permission.Ruleset,
})
  .annotate({ identifier: "AgentV2.Info" })
  .pipe(
    statics((schema) => ({
      empty: (id: ID) =>
        schema.make({ id, request: { headers: {}, body: {} }, mode: "all", hidden: false, permissions: [] }),
    })),
  )
```
`statics` 来自 `packages/schema/src/schema.ts:20-23`，使用 `Object.assign` 将静态方法附加到 schema 对象上。
**Schema.Class** — 需要 class 构造器时：
```ts
// packages/schema/src/location.ts:14-21
export class Info extends Schema.Class<Info>("Location.Info")({
  directory: AbsolutePath,
  workspaceID: optional(WorkspaceID),
  project: Schema.Struct({
    id: ProjectID,
    directory: AbsolutePath,
  }),
}) {}
```
**Schema.TaggedErrorClass** — 声明带 `_tag` 的类型化错误：
```ts
// packages/core/src/session/runner/model.ts:18-27
export class ModelNotSelectedError extends Schema.TaggedErrorClass<ModelNotSelectedError>()(
  "SessionRunnerModel.ModelNotSelectedError",
  {
    sessionID: SessionSchema.ID,
  },
) {
  override get message() {
    return `No model is available for session ${this.sessionID}`
  }
}
```
### 为什么重要
Opencode 中所有跨网络、跨存储、跨 SDK 的数据都使用 Schema.Struct 定义。这种模式同时提供 TypeScript 编译时类型检查 + 运行时 JSON 编解码 + schema 元数据。它比普通 `interface` 强大得多——运行时也能干活。
## 2. Branded Types（品牌类型）
### 定义
TypeScript 默认使用**结构类型**：两个 `string` 是可互相赋值的。Brand type 通过添加一个虚拟的 "品牌" 属性（编译时存在，运行时不存在），将同构的类型区分为不可互换的类型。
### Opencode 示例
```ts
// packages/schema/src/session-id.ts:5-14
export const SessionID = Schema.String.check(Schema.isStartsWith("ses")).pipe(
  Schema.brand("SessionID"),
  statics((schema) => {
    const create = () => schema.make("ses_" + descending())
    return { create, descending: (id?: string) => (id === undefined ? create() : schema.make(id)) }
  }),
)
```

```ts
// packages/schema/src/agent.ts:10-11
export const ID = Schema.String.pipe(Schema.brand("AgentV2.ID"))
```

```ts
// packages/schema/src/model.ts:8-9
export const ID = Schema.String.pipe(Schema.brand("ModelV2.ID"))
```

```ts
// packages/schema/src/project-id.ts:4-7
export const ProjectID = Schema.String.pipe(
  Schema.brand("Project.ID"),
  statics((schema) => ({ global: schema.make("global") })),
)
```
每个 ID 类型都是一个带品牌的 `string`：`SessionID`、`AgentV2.ID`、`ModelV2.ID`、`Project.ID` 虽然底层都是字符串，但**不能互相赋值**。`Schema.isStartsWith("ses")` 额外加了运行时校验。
### 为什么重要
Opencode 中有几十种 ID 类型。如果没有 brand type，很容易把 `SessionID` 传给一个期望 `AgentV2.ID` 的函数，编译器不会报错。Brand type 让这种错误变成编译期错误。
## 3. Discriminated Unions（标签联合）
### 定义
一种联合类型，其中每种 variant 都有共同的 `type`（或 `status`）字段作为"判别键"。TypeScript 在 `switch` 或 `if` 中检查该字段后，能自动缩小类型范围。
### Opencode 示例
**消息类型联合**（`packages/schema/src/session-message.ts:200-211`）：
```ts
export const Message = Schema.Union([
  AgentSwitched,   // type: "agent-switched"
  ModelSwitched,   // type: "model-switched"
  User,            // type: "user"
  Synthetic,       // type: "synthetic"
  System,          // type: "system"
  Shell,           // type: "shell"
  Assistant,       // type: "assistant"
  Compaction,      // type: "compaction"
])
  .pipe(Schema.toTaggedUnion("type"))
```

每个 variant 都有 `type` 字段作为判别键：
```ts
// packages/schema/src/session-message.ts:44-51
export const User = Schema.Struct({
  ...Base,
  text: Prompt.fields.text,
  files: Prompt.fields.files,
  agents: Prompt.fields.agents,
  type: Schema.Literal("user"),
})
```

**工具状态联合**（`packages/schema/src/session-message.ts:116-119`）：
```ts
export const ToolState = Schema.Union([ToolStatePending, ToolStateRunning, ToolStateCompleted, ToolStateError]).pipe(
  Schema.toTaggedUnion("status"),
)
```

**Provider API 类型**（`packages/schema/src/provider.ts:41-43`）：
```ts
export const Api = Schema.Union([AISDK, Native])
  .pipe(Schema.toTaggedUnion("type"))
```

### 为什么重要
`Schema.toTaggedUnion("type")` 告诉 Effect/Schema 用哪个字段做判别。运行时反序列化时，能根据 `type` 字段自动选择正确的 variant schema 进行校验。代码中写 `if (message.type === "user")` 后，TS 就知道 `message.text` 存在。
## 4. Effect\<A, E, R\> 三重泛型
### 定义
Effect-TS 的核心类型 `Effect<A, E, R>` 有三个泛型参数：

| 参数                 | 含义         | 类比                              |
| ------------------ | ---------- | ------------------------------- |
| `A` （Success）      | 成功时的返回值类型  | Promise 的 resolve 类型            |
| `E` （Error）        | 失败时抛出的错误类型 | Promise 的 reject 类型，但是**类型安全**的 |
| `R` （Requirements） | 需要的依赖服务类型  | 依赖注入的"需要什么"                     |

### Opencode 示例
```ts
// packages/core/src/session/runner/index.ts:22-26
export interface Interface {
  readonly run: (input: {
    readonly sessionID: SessionSchema.ID
    readonly force: boolean
  }) => Effect.Effect<void, RunError>
}
```

这里 `Effect<void, RunError>` 表示：成功不返回值，失败抛出 `RunError`（一个联合类型），不需要额外依赖（R 被省略 = `never`）。
`RunError` 的定义在同文件 `:11-17`
```ts
export type RunError =
  | LLMError
  | SessionRunnerModel.Error
  | MessageDecodeError
  | ContextSnapshotDecodeError
  | SystemContext.InitializationBlocked
  | ToolOutputStore.Error
```

再看一个带 R 参数的例子—— `Tool.make` 中 `execute` 函数：

```ts
// packages/core/src/tool/tool.ts:53-56
readonly execute: (
  input: Schema.Schema.Type<Input>,
  context: Context,
) => Effect.Effect<Schema.Schema.Type<Output>, ToolFailure>
```

这里 `ToolFailure` 是 E，`Output` 是 A，R 隐式包含执行工具所需的所有服务。

### 为什么重要

这是理解 Opencode 执行模型的基础。整个 Session Runner 的核心类型就是 `Effect.Effect<void, RunError>` ——它是一个描述"如何运行"的程序，而不是立即执行的函数。详见 [[02-Effect-TS核心范式]]。

---

## 5. `as const` 断言

### 定义

`as const` 将 TypeScript 的类型推导从最宽泛收紧为最窄的**字面量类型**。`{ x: "hello" }` 的类型默认是 `{ x: string }`；而 `{ x: "hello" } as const` 的类型是 `{ readonly x: "hello" }`。

### Opencode 示例

```ts
// packages/schema/src/session-event.ts:38-49
const options = {
  durable: {
    aggregate: "sessionID",
    version: 1,
  },
} as const

const stepSettlementOptions = {
  durable: {
    aggregate: "sessionID",
    version: 2,
  },
} as const
```

不使用 `as const`，`options.durable.version` 的类型是 `number`，可以赋值给任何 number 参数。使用 `as const` 后，`version` 的类型是字面量 `1` 和 `2`，只有指定版本号的接口才会接受正确的 option。

```ts
// packages/schema/src/durable-event-manifest.ts:7-10
export const SessionDurable = {
  definitions: Event.durable(SessionEvent.DurableDefinitions),
  schema: SessionEvent.Durable,
} as const
```

### 为什么重要

Opencode 通过 `as const` 锁定配置对象的精确类型，使得 `Event.define()` 能根据传入的 `type` 字面量推导出正确的 payload 类型。没有 `as const`，`type: "session.next.agent.switched"` 会被推导为 `type: string`，失去所有类型安全。

---

## 6. `satisfies` 算子

### 定义

`satisfies` 在 TypeScript 4.9+ 中引入，用于**验证**一个表达式满足某个类型，但**不改变**其推导类型。区别于 `: Type` 注解——类型注解会**扩大**推导结果。

### Opencode 示例

```ts
// packages/schema/src/event.ts:52-69
export function define<
  const Type extends string,
  const Fields extends Readonly<Record<PropertyKey, Schema.Codec<unknown, unknown>>>,
>(input: {
  readonly type: Type
  readonly schema: Fields
  ...
}) {
  const data = Schema.Struct(input.schema)
  return Schema.Struct({
    id: ID,
    type: Schema.Literal(input.type),
    data,
  })
    .annotate({ identifier: input.type })
    .pipe(
      statics(() => ({
        type: input.type,
        data,
      })),
    ) satisfies Definition<Type, typeof data>
}
```

此处 `satisfies Definition<Type, typeof data>` 验证返回的 schema 符合 `Definition` 约束，但**保留**具体的字面量类型（如 `"session.next.agent.switched"`）和精确的 `data` 类型。如果用 `: Definition` 类型注解，`data` 的类型会被扩大为 `Schema.Codec<unknown, unknown>`，丢失所有字段信息。

### 为什么重要

`satisfies` 完美配合 `as const`：`as const` 将值收窄到字面量，`satisfies` 在不扩大的前提下验证它符合某个 interface。两者组合让 Opencode 的事件系统在保持类型精确的同时又能被约束检查。

---

## 7. Template Literal Types（模板字面量类型）

### 定义

TypeScript 4.1+ 引入了模板字面量类型：`type A = `${number}-${string}``。允许在类型层面拼接字符串，常与联合类型组合使用。

### Opencode 示例

```ts
// packages/stats/core/src/honeycomb-backfill.ts:30-37
type Grain = "day" | "week"
type MetricDimension = "model" | "provider" | "geo" | "geo-model"
type LookupDimension = "model-provider-model" | "geo-continent"
type ImportKey = `${MetricDimension | LookupDimension}-${Grain}`
type ImportOptions = {
  importFlag: `--${ImportKey}`
  files: Partial<Record<ImportKey, string[]>>
  ...
}
```

这里 `ImportKey` 的类型是模板字面量的笛卡尔积：

```
"model-day" | "model-week" | "provider-day" | "provider-week" | ...
```

`importFlag` 的类型则是 `"--model-day" | "--model-week" | ...`。

### 为什么重要

虽然 Opencode 主体代码中模板字面量类型使用较少（主要集中在 stats 包），但这是理解 TypeScript 类型系统完整性的关键语法。在构建 CLI 参数、API 端点、配置键等字符串模式时非常有用。

---

## 8. Generic Constraints（泛型约束）

### 定义

`<T extends SomeType>` 限定泛型参数必须满足某个类型约束。`extends` 在此表示"是…的子类型"或"满足…的形状"。

### Opencode 示例

**对 Schema 类型的约束**：

```ts
// packages/schema/src/schema.ts:12-18
export const optional = <S extends Schema.Top>(schema: S) =>
  Schema.optionalKey(schema).pipe(
    Schema.decodeTo(Schema.optional(Schema.toType(schema)), { ... }),
  )
```

`<S extends Schema.Top>` 约束 S 必须是某个 Schema 类型，而不能是任意值。这样 `optional` 函数内部可以安全调用 `.pipe` 等方法。

**对工具定义的约束**：

```ts
// packages/core/src/tool/tool.ts:20-25
export interface Definition<Input extends SchemaType<any>, Output extends SchemaType<any>> {
  readonly [TypeId]: {
    readonly _Input: Input
    readonly _Output: Output
  }
}
```

**对事件泛型的约束**：

```ts
// packages/schema/src/event.ts:15-25
export type Definition<
  Type extends string = string,
  DataSchema extends Schema.Codec<unknown, unknown> = Schema.Codec<unknown, unknown>,
> = Schema.Top & {
  readonly type: Type
  readonly data: DataSchema
}
```

**条件类型 + 泛型**（核心事件系统）：

```ts
// packages/core/src/event.ts:18
export type Subscriber<D extends Definition = Definition> = (event: Payload<D>) => Effect.Effect<void>
```

### 为什么重要

泛型约束确保传入的类型有特定的属性和方法可用。Opencode 的 Schema 辅助函数（如 `optional`、`statics`）完全建立在泛型约束之上——它们必须只接受 Schema 类型而非任意值。

---

## 小结

以上 8 个模式相互配合，构成了 Opencode 类型系统的基础：

| 特性 | 在 Opencode 中的角色 |
|------|---------------------|
| Schema.Struct/Class/TaggedError | 所有数据契约的单一真理源 |
| Branded Types | 区分同构但语义不同的 ID 类型 |
| Discriminated Unions | 类型安全的 variant 消息/事件/状态 |
| Effect\<A, E, R\> | 所有副作用的描述模型 |
| `as const` | 锁定配置/选项的字面量类型 |
| `satisfies` | 验证但不扩大的类型检查 |
| Template Literal Types | 字符串模式的类型安全 |
| Generic Constraints | 泛型函数和类型的边界保证 |

下一步阅读 [[02-Effect-TS核心范式]] 了解 Effect 的执行模型，或 [[02-Layer与依赖注入]] 了解依赖管理。
