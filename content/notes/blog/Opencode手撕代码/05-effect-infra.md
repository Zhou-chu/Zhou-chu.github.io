---
blog: true
title: "05 — Effect-TS 基础设施 (Effect-TS Infrastructure)"
slug: "05-effect-ts-基础设施-effect-ts-infrastructure-mscuwj50"
summary: "05 — Effect TS 基础设施 (Effect TS Infrastructure) Effect TS 是 OpenCode 所有源码的基石 。不先理解 Service Layer Node 模式和模块自导出约定，阅读任何一个核心文件都会撞墙。本章前置：00 overview 的设计哲学。 1. 设计哲学：为什么是 Effect TS 来自 00 overview 的 Dimension 1： Effect TS 服务模型 —"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 05 — Effect-TS 基础设施 (Effect-TS Infrastructure)

Effect-TS 是 OpenCode **所有源码的基石**。不先理解 Service + Layer + Node 模式和模块自导出约定，阅读任何一个核心文件都会撞墙。本章前置：[00-overview](00-overview.md) 的设计哲学。

---

## 1. 设计哲学：为什么是 Effect-TS

来自 [00-overview](00-overview.md) 的 Dimension 1：

> **Effect-TS 服务模型** — 所有副作用通过 Effect Layer 注入，纯函数与副作用在类型层面分离。

这不是"用了 Effect 这个库"，而是一种**架构纪律**：

- 函数签名诚实声明副作用（`Effect<A, E, R>` 三个类型参数分别描述成功值、错误类型、所需环境）。
- 实现不直接访问全局状态（`process.env`、`fs.readFileSync`、`fetch`），而是**从 Layer 中请求（yield）服务**。
- 测试时注入 Mock Layer，不需要 monkey-patch 或 Jest mock。

这样做的结果是：**核心逻辑完全可测试、可组合、可移植**，无论运行在 CLI、TUI、HTTP Server 还是嵌入式宿主中。

---

## 2. Service + Layer + Node 模式

这是 OpenCode 最根本的架构模式，对应设计哲学 Dimension 1 的具体落地。

### 2.1 传统 OOP 的做法

```ts
class Database {
  query(sql: string) { /* 直连 SQLite */ }
}

// 使用时
const db = new Database()
db.query("SELECT ...")
```

问题：`Database` 类耦合了具体实现。换成测试用内存数据库？需要 mock 整个类。

### 2.2 OpenCode 的做法

三个概念逐层递进：

| 概念 | 角色 | 类比 |
|------|------|------|
| **Service** | 接口定义。声明"我需要什么能力"，不关心谁提供。 | TypeScript `interface` |
| **Layer** | 实现注入。把具体实现绑定到 Service。 | DI 容器的绑定 |
| **Node** | 依赖图节点。把 Service + Layer + 依赖打包为可组合的拓扑顶点。 | 依赖注入图的顶点 |

在 1.18.4 中，Node 是模块的**公开接口**，而 Layer 是模块的**私有实现细节**。代码形态（简化自 `packages/core/src/effect/layer-node.ts`）：

```ts
// 1. Service — 接口定义（Tag + Interface）
export interface FooInterface {
  readonly doThing: Effect.Effect<string, FooError>
}
export class FooService extends Context.Tag("@opencode/Foo")<
  FooService, FooInterface
>() {}

// 2. Layer — 实现绑定（模块私有，不导出）
const fooLayerImpl = Layer.effect(
  FooService,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return { doThing: fs.readFileString("...") }
  })
)

// 3. Node — 对外暴露的依赖图节点（模块公有）
export const node = LayerNode.make({
  service: FooService,
  layer: fooLayerImpl,
  deps: [FileSystem.node],
})

// 4. 最后：模块自导出
export * as Foo from "./foo"
```

**Consumer 使用方式**：

```ts
import { Foo } from "@/foo/foo"

// 通过 Node 获取服务，不直接接触 Layer
yield* Foo.FooService
```

### 2.3 设计意图

**接口与实现分离** — `FooService` 只是一个 Tag（类型记号），不包含任何实现。消费者只依赖 Tag，不依赖具体实现文件。这从根本上消灭了文件间的 import 耦合。

**Node 级组合** — `LayerNode.make` 将 Service、Layer、依赖节点打包为一个 Node。每个 Node 声明"我提供 X，我需要 Y 和 Z"。运行时通过 `LayerNode.compile` 自动解析拓扑顺序并编译为 Effect Layer，不再是传统的"A import B → B import C"硬编码依赖链。

**Layer 私有化** — 在 1.18.4 中，实现 Layer 是模块内部的实现细节。外部消费者通过 `import { Foo } from "..."; Foo.node` 获取 Node，而不是直接持有 Layer。这防止了消费者绕过依赖图直接拼接 Layer。

**对比 1.17.11**：旧模式是"每个模块导出 Layer（如 `export const defaultLayer = ...`），AppLayer 用 `Layer.mergeAll(defaultLayer, ...)` 扁平拼接"。新模式是"每个 Core 模块定义私有 Layer、导出公有 Node；`AppLayer` 通过 `LayerNode.group([...])` 声明式组装依赖图，最后 `compile` 为 Layer"。Core 源码中 `export const (defaultLayer|locationLayer|layer)` 从 130 处减少到约 25 处——剩余的分布在产品层旧模块与兼容性薄层中，核心组合路径已全部转向 Node。

### 2.4 LayerNode 核心 API

来源：`packages/core/src/effect/layer-node.ts`。

| API | 签名 | 作用 |
|-----|------|------|
| `LayerNode.make` | `({ service, layer, deps, tag? }) → Node<A, E, T>` | 为 Service + Layer 创建一个 Node，声明它依赖哪些其他 Node |
| `LayerNode.group` | `([...deps]) → Node<unknown, never>` | 将多个 Node 打包为一个群组 Node，不添加自身实现 |
| `LayerNode.compile` | `(root, replacements?) → Layer<A, E>` | 遍历 Node 树，将每个 Node 的实现 Layer 用其依赖注入，编译为可运行的 Effect Layer |
| `LayerNode.hoist` | `(root, tag, replacements?) → { node, hoisted }` | 从 Node 树中提取所有标记了指定 tag 的 Node，返回剥离后的树和提取出的群组 |

`hoist` 是位置感知组合的核心。OpenCode 定义了两个 tag（`packages/core/src/effect/app-node.ts`）：

```ts
export const tags = LayerNode.tags({
  location: ["global"],  // location 节点可以依赖 global 节点
  global: [],            // global 节点不依赖任何其他 tag
})

export const makeGlobalNode = tags.make("global")
export const makeLocationNode = tags.make("location")
```

- `makeGlobalNode` — 创建标记为 `global` tag 的 Node：全局单例服务（如 Ripgrep、Database），所有项目目录共享同一实例。
- `makeLocationNode` — 创建标记为 `location` tag 的 Node：按项目目录隔离的服务（如 Agent、Config、Permission），每个打开的项目目录拥有独立实例。

当 `buildLocationServiceMap` 为每个项目目录创建服务实例时，先用 `hoist(locationServices, tags.values.global, replacements)` 把全局服务提取到 `hoisted` 群组，再用 `compile(location.node)` 编译剩余的 location 特定服务，最后用 `Layer.provide(compile(hoisted))` 注入全局依赖。

`compile` 的内部流程：对 Node 树做深度优先遍历（`walk`），遇到 `kind: "layer"` 的叶子节点时，将其实现 Layer 通过 `Layer.provide` 注入其所有依赖 Node（已递归编译过的），最终产出单一的 `Layer<A, E>`。遇到 `kind: "group"` 节点时，只递归编译子节点并合并。

### 2.5 替换感知的 Hoist（Replacement-aware Hoisting）

`hoist` 的第三个参数 `replacements` 类型为 `readonly [source: Node, replacement: Node | Layer][]`，表示"遍历树时，把 source Node 替换为 replacement"。

替换在 hoist 遍历过程中生效——**不是在 hoist 之后**。原因来自源码注释（`packages/core/src/location-services.ts:92-95`）：

> "Apply replacements during hoist, not afterward: replacements can introduce new tagged dependencies (Location.boundNode depends on Project), and the hoist walk is the only pass that can still slice those back out."

翻译：替换必须在 hoist 期间应用。因为 replacement 可能引入新的 tagged 依赖（例如 `Location.boundNode` 依赖 `Project.node`，而 `Project.node` 被标记为 global），只有在 hoist 遍历中，新引入的 global 依赖才能被正确提取到 `hoisted` 群组。

替换链的内部实现（`packages/core/src/effect/layer-node.ts`）：

1. **`replacementMapFrom(replacements)`**：将替换列表编译为 `Map<name, Node>`。对每个 `[source, replacement]`，先通过 `replacementNode(source, replacement)` 将 replacement 规范化为 Node（如果传入的是裸 Layer，则用 `LayerNode.make` 包裹），再递归调用 `rewriteReplacementDependencies` 确保替换节点之间的交叉依赖也被正确重写。

2. **`rewriteReplacementDependencies(root, replacements)`**：遍历一棵 Node 树，将每个节点的 `dependencies` 列表中命中 replacement map 的条目替换为对应的替换节点，同时检测循环依赖。如果替换表为空则直接返回原树，不做任何遍历。

3. **`hoist` 的 `walk` 遍历器**：`resolve` 回调优先查找 replacement map——如果当前节点的 name 有替换，则用替换节点继续遍历。对于 `kind: "layer"` 的节点，若其 tag 匹配目标 tag，则将其加入 `hoisted` Map（经过 `rewriteReplacementDependencies` 重写依赖），并在原树中替换为空 group。

### 2.6 AppNodeBuilder 与 buildLocationServiceMap

`AppNodeBuilder.build`（`packages/core/src/effect/app-node-builder.ts`）是整个 Node 图的编译入口：

```ts
export function build<A, E>(root: LayerNode.Node<A, E, any>, replacements = []) {
  let allReplacements = replacements

  // 仅在 LocationServiceMap.node 未被绑定且未被替换时才构建
  if (LayerNode.hasUnbound(root, LocationServiceMap.node)
      && !hasReplacement(replacements, LocationServiceMap.node)) {
    const locationMap = buildLocationServiceMap(replacements)
    const locationMapNode = makeGlobalNode({
      service: LocationServiceMap.Service,
      layer: locationMap,
      deps: [],
    })
    allReplacements = replacements.concat([
      [LocationServiceMap.node, locationMapNode],
    ])
  }

  return LayerNode.compile(root, allReplacements)
}
```

核心逻辑：检查 `root` 树中是否存在未绑定的 `LocationServiceMap.node`（`kind: "unbound"` 的占位 Node），如果有且未被显式替换，则自动调用 `buildLocationServiceMap(replacements)` 构建位置服务映射，并将其包装为 global Node 替换。

**`buildLocationServiceMap`**（`packages/core/src/location-services.ts`）为每个项目目录创建独立的位置服务实例：

- 接收可选的 `replacements`，内部拼接 `[Location.node, Location.boundNode(ref)]` 替换条目——将抽象的 `Location.node`（unbound，无具体目录）替换为绑定到具体目录的节点
- 调用 `LayerNode.hoist(locationServices, tags.values.global, allReplacements)` 提取全局服务
- 编译 location 特定服务（`compile(location.node).pipe(Layer.fresh)`），确保每次都是新实例
- 用 `Layer.provide(compile(location.hoisted))` 注入全局依赖
- 使用 `LayerMap.make` 按 `Location.Ref` 做 key，`idleTimeToLive: "60 minutes"` 空闲 60 分钟后自动回收

`locationServices` 是 Core 的完整位置服务清单（38+ 个 Node），定义在 `packages/core/src/location-services.ts:42-79`。它包含 Agent、Config、Permission、ToolRegistry、SystemContext、SessionRunner 等所有按目录隔离的服务，组织为一个 `LayerNode.group([...])`。

### 2.7 AppRuntime：最终运行时组合

产品层通过 `AppNodeBuilderV1.build`（`packages/opencode/src/effect/app-node-builder-v1.ts`）在 Core 的 `AppNodeBuilder.build` 基础上追加 `InstanceBootstrap` 替换：

```ts
const bootstrapReplacement = [InstanceStore.bootstrapNode, InstanceBootstrap.node] as const

export function build(root, replacements = []) {
  return AppNodeBuilder.build(root, replacements.concat([bootstrapReplacement]))
}
```

`AppLayer`（`packages/opencode/src/effect/app-runtime.ts`）用 Node 图组装所有产品服务：

```ts
export const AppLayer = AppNodeBuilderV1.build(
  LayerNode.group([
    Npm.node, FSUtil.node, Database.node, Auth.node,
    Account.node, Config.node, Git.node, Storage.node,
    Snapshot.node, Plugin.node, ModelsDev.node, Provider.node,
    ProviderAuth.node, Agent.node, Skill.node, Discovery.node,
    Question.node, Permission.node, Todo.node, Session.node,
    SessionProjector.node, SessionStatus.node, BackgroundJob.node,
    RuntimeFlags.node, EventV2Bridge.node, SessionRunState.node,
    SessionProcessor.node, SessionCompaction.node, SessionRevert.node,
    SessionSummary.node, SessionPrompt.node, Instruction.node,
    LLM.node, LSP.node, MCP.node, McpAuth.node, Command.node,
    Truncate.node, ToolRegistry.node, Format.node, InstanceStore.node,
    Project.node, Vcs.node, Workspace.node, Worktree.node,
    Installation.node, ShareNext.node, SessionShare.node,
  ])
).pipe(
  Layer.provideMerge(AppNodeBuilderV1.build(Ripgrep.node)),
  Layer.provideMerge(Observability.layer),
)
```

`AppRuntime` 将 `AppLayer` 包装为 `ManagedRuntime`，对外暴露 `runSync`、`runPromise`、`runPromiseExit`、`runFork`、`runCallback`、`dispose`。所有业务 Effect 通过 `AppRuntime.runPromise(effect)` 执行，自动获得 `AppLayer` 中注册的全部服务。

---

## 3. 模块自导出约定

这是 OpenCode 特有的文件组织方式。来源：`packages/opencode/AGENTS.md`。

### 3.1 基本模式

每个模块文件底部都有一行自导出：

```ts
export * as Foo from "./foo"
```

效果：把 `foo.ts` 中所有顶层导出**投影为一个命名空间** `Foo`。消费者这样用：

```ts
import { Foo } from "@/foo/foo"

yield* Foo.FooService     // Service Tag
Foo.fooLayer              // Layer
Foo.makeFooNode           // Node 工厂
```

**为什么不用 `export namespace Foo { ... }`？** 因为 namespace 不是标准 ESM，阻止 tree-shaking，且破坏 Node 的原生 TypeScript 运行器。见 `AGENTS.md`。

### 3.2 单文件名空间目录

如果整个目录只有一个模块，文件命名为 `index.ts`，自导出源用 `"."`：

```ts
// src/foo/index.ts
export class FooService extends Context.Tag("@opencode/Foo")<...>() {}
export const fooLayer = Layer.effect(...)

export * as Foo from "."   // 不是 "./index"
```

### 3.3 多兄弟目录

如果目录下有多个独立模块（如 `src/session/`、`src/config/`），**禁止**添加 `index.ts` barrel 文件。消费者直接导入具体兄弟文件：

```ts
import { SessionRetry } from "@/session/retry"
import { SessionStatus } from "@/session/status"
```

**为什么禁止 barrel？** Barrel 让每个 import 都经过一个统一的 `index.ts`，而那个 `index.ts` 会 `export *` 所有兄弟文件，导致每次 import 都**评估整个目录的所有模块**。这对 tree-shaking 和模块加载性能是灾难性的。

### 3.4 命名空间内的私有函数

文件内的非导出顶层声明不会进入自导出投影，天然就是模块私有：

```ts
// foo.ts
export function publicHelper() { ... }

function privateHelper() { ... }  // 不进入 Foo.* 命名空间

export * as Foo from "./foo"
```

---

## 4. makeRuntime vs InstanceState

来源：`packages/opencode/AGENTS.md`。

### 4.1 makeRuntime（常规服务）

来自 `src/effect/run-service.ts`。返回 `{ runPromise, runFork, runCallback }`，底层共享一个 `memoMap` 自动去重 Layer。

**使用场景**：所有常规服务的运行时。同一个 Layer 被多次请求时，`memoMap` 保证只构造一次。

### 4.2 InstanceState（按目录隔离的状态）

来自 `src/effect/instance-state.ts`。使用 `ScopedCache` 按目录做 key，每个打开的项目目录拥有自己独立的实例状态，dispose 时自动清理。

**使用场景**：需要按目录隔离的服务，即**两个打开的目录不应该共享同一份服务副本**时。典型例子：项目级配置缓存、文件监视器、语言服务器实例。

**关键规则**：

| 规则 | 说明 |
|------|------|
| 直接在 `InstanceState.make` 闭包里做工作 | `ScopedCache` 自动保证 run-once。不要自己加 `started` 标志或 fiber。 |
| 在闭包内用 `Effect.addFinalizer` 做清理 | 订阅取消、进程退出等。 |
| 在闭包内用 `Effect.forkScoped` 消费后台流 | fiber 会在实例 dispose 时自动中断。 |
| `init()` 保持同步，fork 交给调用方 | `src/project/bootstrap.ts` 已用 `Effect.forkDetach` 包装每个服务的 `init()`。不要在 `InstanceState.make` 内 fork 工作，否则状态不完整。 |

**判断方法**：问自己"两个打开的目录是否应该共享这个服务的状态？"如果答案为否，则使用 `InstanceState`。

---

## 5. 编码约定

汇集自 `packages/opencode/AGENTS.md` 和根 `AGENTS.md`。

### 5.1 Effect 组合原语

```ts
// 组合用 Effect.gen
const result = yield* Effect.gen(function* () {
  const a = yield* serviceA.doThing()
  const b = yield* serviceB.process(a)
  return b
})

// 命名/追踪用 Effect.fn
const named = Effect.fn("Domain.method")(function* () {
  return yield* doSomething()
})

// 无追踪的内部 helper 用 Effect.fnUntraced
const internal = Effect.fnUntraced(function* () {
  return yield* compute()
})

// 回调 API 转 Effect
const fromCallback = Effect.callback<Event>((emit) => {
  emitter.on("event", emit)
  return Effect.void  // cleanup 时调用
})
```

### 5.2 Schema 类型

```ts
// 多字段数据 → Schema.Class
class Session extends Schema.Class<Session>("Session")({
  id: Schema.String,
  createdAt: Schema.DateTime,
}) {}

// 单值类型 → Schema.brand
const SessionID = Schema.String.pipe(Schema.brand("SessionID"))
type SessionID = Schema.Schema.Type<typeof SessionID>

// 类型化错误 → Schema.TaggedErrorClass
class FooError extends Schema.TaggedErrorClass<FooError>("FooError")({
  message: Schema.String,
  cause: Schema.Defect,   // 用 Schema.Defect 而非 unknown
}) {}
```

### 5.3 去重和回调边界

```ts
// 并发去重 → Effect.cached
const shared = yield* Effect.cached(
  expensiveComputation()
)
// 多个并发调用方共享同一个进行中的计算

// 原生回调重入 Effect → EffectBridge
// 用于 @parcel/watcher、node-pty、fs.watch、插件回调等
// 这些回调需要带着 instance/workspace 上下文重新进入 Effect 服务
```

### 5.4 推荐使用的 Effect 服务

在 Effect 化代码中，**优先 yield 已有 Effect 服务**，不要退回原始平台 API：

| 场景 | 推荐 | 避免 |
|------|------|------|
| 文件 I/O | `FileSystem.FileSystem` | `fs/promises` |
| HTTP 请求 | `HttpClient.HttpClient` | `fetch` |
| 路径操作 | `Path.Path` | `path` / `path.posix` |
| 配置读取 | `Config` | `process.env` |
| 时间获取 | `Clock` + `DateTime.nowAsDate` | `new Date()` |
| 子进程 | `ChildProcessSpawner` + `ChildProcess.make()` | 手写 spawn 包装 |
| 定时/循环 | `Effect.repeat` / `Effect.schedule` + `Effect.forkScoped` | `setInterval` |

---

## 6. 禁止模式 (Forbidden Patterns)

这些规则来自根 `AGENTS.md`，适用于整个代码库（不只是 Effect 代码）。

| 禁止 | 理由 | 替代 |
|------|------|------|
| `try` / `catch` | Effect 已有完整的错误通道 | `Effect.catchTag` / `Effect.catchAll` / `Effect.retry` |
| `any` 类型 | 破坏类型安全 | 显式类型或 `unknown` + narrowing |
| `import { foo as bar }` | 增加命名混乱 | 直接使用原名，或用模块自导出的命名空间 |
| `import * as Foo` | 无法 tree-shake | 导入模块自身的命名空间：`import { Foo } from "@/foo/foo"` |
| `else` 语句 | 增加嵌套深度 | 提前 return |
| 解构赋值 | 丢失上下文信息 | 点号访问：`obj.a`、`obj.b` |
| `let`（可避免时） | 可变性引入 bug | `const` + 三元表达式或提前 return |

### 6.1 else 示例

```ts
// Good（提前 return，flat happy path）
function foo(condition: boolean) {
  if (condition) return 1
  return 2
}

// Bad
function foo(condition: boolean) {
  if (condition) return 1
  else return 2
}
```

### 6.2 解构示例

```ts
// Good（保留上下文）
const result = session.messages
const count = session.count

// Bad（丢失 session 前缀）
const { messages, count } = session
```

### 6.3 导入示例

```ts
// Good
import { Project } from "@opencode-ai/core/project"
Project.ID   // namespace-style reference

// Bad — import alias
import { foo as bar } from "./module"

// Bad — star import
import * as Foo from "./module"
```

---

## 7. 与设计哲学 Dimension 1 的连接

本章覆盖的每一个主题都直接服务于"Effect-TS 服务模型"这一维度：

| 本章主题 | 对应 Dimension 1 原则 |
|----------|----------------------|
| Service + Layer + Node | 副作用通过 Layer 注入，不在函数体内硬编码 |
| Node 组合 (LayerNode.make/group/compile/hoist) | 声明式依赖图组装——依赖关系是 Node 的属性，不是 import 链 |
| 替换式 hoist (replacement-aware) | 编译时替换 Node，运行时零开销 |
| AppNodeBuilder + buildLocationServiceMap | 自动检测未绑定 Node 并注入位置感知服务映射 |
| AppRuntime (ManagedRuntime) | 所有服务通过统一的 Effect Runtime 提供，不暴露原始 Layer |
| 模块自导出 | 类型层面组织服务，不靠物理文件目录耦合 |
| makeRuntime / InstanceState | 运行时管理：共享去重 vs 按目录隔离 |
| Effect.gen / Effect.fn | 组合原语：纯函数与副作用在类型层面分离 |
| Schema 类型 | 数据契约先行：类型定义独立于实现 |
| 推荐 Effect 服务 | 不退回平台 API，保持 Effect 上下文完整性 |
| 禁止模式 | 保持代码库在 Effect 纪律内，不引入逃逸 |

---

## 8. 相关笔记

| 笔记 | 关系 |
|------|------|
| [00 — 项目总览](00-overview.md) | 设计哲学四维度（Dimension 1 直接对应本章） |
| [01 — System Context](01-system-context.md) | System Context 的实现在 Layer/Node 架构之上，`InstructionContext.node` 是显式依赖 |
| [04 — LLM/Provider 交互层](04-llm-interaction.md) | Provider Turn 管道全部用 Effect.gen 编排 |

---

最后更新：2026-07-24 | 来源：`packages/core/src/effect/layer-node.ts`、`packages/core/src/effect/app-node.ts`、`packages/core/src/effect/app-node-builder.ts`、`packages/core/src/location-services.ts`、`packages/opencode/src/effect/app-runtime.ts`、`packages/opencode/src/effect/app-node-builder-v1.ts`
