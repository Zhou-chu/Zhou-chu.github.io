---
blog: true
title: "02-Layer与依赖注入"
slug: "02-layer与依赖注入-mscuwj12"
summary: "树节点：02 Layer与依赖注入 父节点：02 Effect TS核心范式 子节点：无 概述 Effect TS 的 Layer 是 服务配方的描述 ——它声明如何构造一个服务以及该服务依赖哪些其他服务，但不立即执行。Layer 的核心哲学是\"声明所需，推迟提供\"：每个模块声明它需要什么依赖，由组合器在顶层统一解决。02 Effect TS核心范式 在 Opencode 中，Layer 体系分为三个层次： 1. 服务声明 ：用 Con"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "02-fiber与scope-mscumzqz"
  - "05-session创建与状态机-mscun046"
---

> 树节点：02-Layer与依赖注入
> 父节点：[[02-Effect-TS核心范式]]
> 子节点：无

---

## 概述

Effect-TS 的 `Layer` 是**服务配方的描述**——它声明如何构造一个服务以及该服务依赖哪些其他服务，但不立即执行。Layer 的核心哲学是"声明所需，推迟提供"：每个模块声明它需要什么依赖，由组合器在顶层统一解决。[[02-Effect-TS核心范式]]

在 Opencode 中，Layer 体系分为三个层次：
1. **服务声明**：用 `Context.Service` 定义接口 + 用 `Layer.effect` 定义构造逻辑
2. **Node DAG**：用 `makeLocationNode` / `makeGlobalNode` 将 Layer 注册到类型层面的有向无环图中
3. **图编译**：`LayerNode.compile()` 将 DAG 折叠为可运行的 `Layer`

---

## 1. Layer 作为服务配方

### 定义

`Layer<A, E, R>` 描述一个**需要环境 `R`、可能失败于 `E`、成功提供 `A`** 的构造过程。它不执行任何效果——只是效果的描述。

### Layer.effect — 最常用的构造器

接受一个 `Context.Tag` 和一个返回服务实现的 `Effect`。Opencode 中 **95% 的 Layer 都使用这个构造器**。

```ts
// packages/core/src/agent.ts:45-47
const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = State.create<Data, Draft>({ ... })
    return Service.of({ ... })
  }),
)
```

### Layer.effectDiscard — 纯副作用

用于不提供任何服务的层（如工具注册、清理注册），在 18 个文件中使用：

```ts
// packages/core/src/tool-output-store.ts:209
layer: Layer.merge(layer, cleanupLayer.pipe(Layer.provide(layer)),
```

### Layer.succeed — 常量/Noop 注入

仅用于测试缝合和 noop 兼容层（5 个文件），不涉及任何效果：

```ts
// packages/core/src/session/execution.ts:26-34
export const noopLayer = Layer.succeed(
  Service,
  Service.of({
    active: Effect.succeed(new Set()),
    resume: () => Effect.void,
    wake: () => Effect.void,
    interrupt: () => Effect.void,
  }),
)
```

### Layer.scoped — 未使用

**`Layer.scoped` 在整个 Opencode 代码库中不存在。** 资源生命周期管理使用 `Effect.scoped`、`Effect.acquireRelease` 和 `Effect.addFinalizer` 在服务实现内部处理（参见 [[02-Fiber与Scope]]）。

---

## 2. Context.Service 模式

Opencode 使用的是 **Effect 3.x 的 `Context.Service`**（不是早期版本的 `Effect.Service`）。这是带类型标签的声明式模式：

### 标准三步法

**Step 1 — 接口定义**：声明服务对外暴露的方法签名

```ts
// packages/core/src/agent.ts:35-41
export interface Interface extends State.Transformable<Draft> {
  readonly get: (id: ID) => Effect.Effect<Info | undefined>
  readonly default: () => Effect.Effect<Info | undefined>
  readonly resolve: (id?: ID | string) => Effect.Effect<Info | undefined>
  readonly select: (id?: ID | string) => Effect.Effect<Selection>
  readonly all: () => Effect.Effect<Info[]>
}
```

**Step 2 — Service Class**：通过 `Context.Service<Self, Interface>()("tag")` 创建类型安全标签

```ts
// packages/core/src/agent.ts:43
export class Service extends Context.Service<Service, Interface>()("@opencode/v2/Agent") {}
```

字符串 `"@opencode/v2/Agent"` 是 Effect Context 中的稳定标识符。所有 Opencode 服务使用 `"@opencode/..."` 前缀命名空间。

**Step 3 — 实现与返回**：在 `Layer.effect` 的 `Effect.gen` 中构造，用 `Service.of({...})` 返回

```ts
// packages/core/src/agent.ts:45-107
const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    // ... 获取依赖、构造状态
    return Service.of({
      get: Effect.fn("AgentV2.get")(function* (id) { ... }),
      resolve: Effect.fn("AgentV2.resolve")(function* (id) { ... }),
      // ...
    })
  }),
)
```

### 典型服务示例

| 服务 | 文件 | 标签 | 依赖数 | 复杂度 |
|------|------|------|--------|--------|
| AgentV2 | `agent.ts:43` | `"@opencode/v2/Agent"` | 0 | 简单：纯状态管理 |
| Config | `config.ts:133` | `"@opencode/v2/Config"` | 4 | 中等：文件发现 + 策略 |
| PluginV2 | `plugin.ts:29` | `"@opencode/v2/Plugin"` | 5 | 复杂：插件生命周期管理 |
| SessionV2 | `session.ts:182` | `"@opencode/v2/Session"` | 6 | 重型：20+ 方法 |
| SessionRunner | `session/runner/index.ts:28` | `"@opencode/v2/SessionRunner"` | 1 | 接口薄：单一 `run` 方法 |

---

## 3. Layer.provide — 依赖注入

### 基本形式

`Layer.provide(otherLayer)` 表示 "用 `otherLayer` 满足当前 Layer 的需求"。在 `LayerNode.compile()` 内部，每个节点的依赖会自动转换为 `provide` 调用：

```ts
// packages/core/src/effect/layer-node.ts:265
implementation.pipe(Layer.provide(dependencies as [RuntimeLayer, ...RuntimeLayer[]]))
```

### Layer.provideMerge — 合并式注入

`provideMerge` 与 `provide` 的区别：`provide` 完全满足所需环境；`provideMerge` 保留未覆盖的需求，只合并交集部分。这是 **Node-to-Node 之间最常用的注入方式**。

```ts
// packages/core/src/config.ts:221
export const locationLayer = layer.pipe(Layer.provideMerge(Policy.locationLayer))
```

```ts
// packages/core/src/permission.ts:304
export const locationLayer = layer.pipe(Layer.provideMerge(AgentV2.locationLayer))
```

### 运行时动态注入 — Effect.provide

在 Session 执行的 drain 回调中，Location-scoped 的服务在运行时通过 `Effect.provide` 动态注入：

```ts
// packages/core/src/session/execution/local.ts:20-21
return yield* SessionRunner.Service.use((runner) => runner.run({ sessionID, force })).pipe(
  Effect.provide(locations.get(session.location)),
)
```

`locations.get(session.location)` 从 `LayerMap` 中取出对应 Location 的完整服务树 Layer——这是 [[05-Session创建与状态机]] 中每次 Session drain 获得独立服务树的关键。

---

## 4. Layer.merge — 组合多个服务

### 基本用法

`Layer.merge(a, b)` 产生一个同时提供 `a` 和 `b` 两个服务的 Layer。在 `LayerNode.compile()` 的 `reduce` 中用于将整个 DAG 折叠成一个 Layer：

```ts
// packages/core/src/effect/layer-node.ts:270
const layer = layers.reduce<RuntimeLayer>(
  (result, layer) => layer.pipe(Layer.provideMerge(result)),
  Layer.empty
)
```

### 底层组合示例

SQLite 的 Layer 组合是一个典型的嵌套 `Layer.merge` + `Layer.provide` 模式：

```ts
// packages/core/src/database/sqlite.node.ts:175
return Layer.merge(native, Layer.merge(sqliteLayer(config), drizzleLayer)
  .pipe(Layer.provide(native)))
  .pipe(Layer.provide(Reactivity.layer))
```

注意：**`Layer.mergeAll` 在整个 Opencode 核心源码中不存在** —— DAG 折叠使用 `reduce` + `provideMerge`，比 `mergeAll` 更精确地控制顺序。

---

## 5. Location-Scoped 服务

### Location 概念

Opencode 中每个项目目录是一个 **Location**。Location-scoped 服务对每个目录独立实例化，不同项目之间完全隔离。Global 服务则跨所有 Location 共享。

### buildLocationServiceMap — 按 Location 缓存服务

`buildLocationServiceMap()` 创建一个 `LayerMap`，以 `Location.Ref` 为 Key，按需生成每个 Location 的完整服务 Layer：

```ts
// packages/core/src/location-services.ts:84-112
export function buildLocationServiceMap(
  replacements: LayerNode.Replacements = [],
): Layer.Layer<LocationServiceMap.Service> {
  return Layer.effect(
    LocationServiceMap.Service,
    LayerMap.make(
      (ref: Location.Ref) => {
        const allReplacements = replacements.concat([[Location.node, Location.boundNode(ref)]])
        const location = LayerNode.hoist(locationServices, Node.tags.values.global, allReplacements)

        return LayerNode.compile(location.node).pipe(
          Layer.fresh,
          Layer.tap(() =>
            Effect.logInfo("booting location services", { ... }),
          ),
          Layer.provide(LayerNode.compile(location.hoisted)),
        )
      },
      { idleTimeToLive: "60 minutes" },
    ),
  )
}
```

关键步骤：
1. **hoist（提升）**：将 Global 节点从 Location 树中分离——Global 服务只编译一次供所有 Location 共享
2. **compile（编译）**：将分离后的 Location 节点折叠为 Layer
3. **Layer.fresh**：确保每次 boot 都是全新实例（不共享状态）
4. **60 分钟 TTL**：闲置后自动回收，节省内存

### locationServices — 主 Service 树

`locationServices` 是一个 `LayerNode.group`，包含**所有 36 个 Location-scoped 服务节点**：

```ts
// packages/core/src/location-services.ts:42-79
export const locationServices = LayerNode.group([
  Location.node, Policy.node, Config.node, AgentV2.node, CommandV2.node,
  Reference.node, Integration.node, Catalog.node, AISDK.node,
  PluginV2.node, PluginInternal.node, FileSystem.node, Watcher.node,
  Pty.node, SkillV2.node, SystemContextRegistry.node,
  SystemContextBuiltIns.node, FileMutation.node, PermissionV2.node,
  ToolOutputStore.node, ToolRegistry.node, Snapshot.node,
  SessionRunnerLLM.node, ...
])
```

---

## 6. Node 模式

### makeGlobalNode / makeLocationNode

定义在 `effect/app-node.ts` 中，是创建 Layer DAG 节点的工厂函数：

```ts
// packages/core/src/effect/app-node.ts:3-12
export const tags = LayerNode.tags({
  location: ["global"],   // Location 节点可以依赖 Global 节点
  global: [],             // Global 节点不依赖任何外部
})

export const makeGlobalNode = tags.make("global")
export const makeLocationNode = tags.make("location")
```

### Node 声明示例

每个服务模块的最后都会导出 `node`：

**Location 节点（Agent）**：
```ts
// packages/core/src/agent.ts:111
export const node = makeLocationNode({ service: Service, layer, deps: [] })
```

**Location 节点 + 二级依赖（Config）**：
```ts
// packages/core/src/config.ts:223-227
export const node = makeLocationNode({
  service: Service, layer,
  deps: [FSUtil.node, Global.node, Location.node, Policy.node],
})
```

**Global 节点（SessionExecution）**：
```ts
// packages/core/src/session/execution/local.ts:40-43
export const node = makeGlobalNode({
  service: SessionExecution.Service, layer,
  deps: [SessionStore.node, LocationServiceMap.node],
})
```

**Global 平台节点**（无需实现，直接引用 Effect 内建服务）：
```ts
// packages/core/src/effect/app-node-platform.ts:8-16
export const filesystem = makeGlobalNode({ service: FileSystem.FileSystem, layer: NodeFileSystem.layer, deps: [] })
export const path = makeGlobalNode({ service: Path.Path, layer: NodePath.layer, deps: [] })
export const httpClient = makeGlobalNode({ service: HttpClient.HttpClient, layer: FetchHttpClient.layer, deps: [] })
```

### LayerNode.unbound — 占位节点

用于实现由运行时解析的"虚节点"。例如 `Location` 的实例化依赖于具体的 `Location.Ref`：

```ts
// packages/core/src/location-service-map.ts: Node 声明
// LocationServiceMap 是一个 unbound 节点——
// 真实的实现由 buildLocationServiceMap() 在运行时提供
```

---

## 7. 依赖图组装 —— 全景

### 从 Node DAG 到运行时的编译过程

```
                    AppNodeBuilder.build()
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
    Server routes.ts   Bootstrap      Test entries
    (applicationSvc)   -runtime.ts
            │
            ▼
    LayerNode.group([...nodes...])
            │
            ▼
    LayerNode.hoist() ─── 分离 Global vs Location
            │
    ┌───────┴───────┐
    ▼               ▼
  Global          Location
  nodes           services
    │               │
    │               ▼
    │          buildLocationServiceMap()
    │          → LayerMap<Location.Ref, LocationServices>
    │               │
    └───────┬───────┘
            ▼
    LayerNode.compile()
    → layers.reduce(Layer.provideMerge)
            │
            ▼
    Runtime Layer
```

### Plugin 的 6 路 provideMerge 链

作为二级依赖链最复杂的例子：

```ts
// packages/core/src/plugin.ts:145-152
export const locationLayer = layer.pipe(
  Layer.provideMerge(AgentV2.locationLayer),
  Layer.provideMerge(AISDK.locationLayer),
  Layer.provideMerge(Catalog.locationLayer),
  Layer.provideMerge(CommandV2.locationLayer),
  Layer.provideMerge(Integration.locationLayer),
  Layer.provideMerge(Reference.locationLayer),
)
```

### 完整应用层的 Server 端组装

```ts
// packages/server/src/routes.ts:26-52
const applicationServices = LayerNode.group([
  Database.node, EventV2.node, httpClient,
  ToolOutputStore.cleanupNode, SessionV2.node,
  PermissionSaved.node, PtyTicket.node, Credential.node,
  PtyEnvironment.node, LocationServiceMap.node,
])
const serviceLayer = AppNodeBuilder.build(applicationServices,
  [[SessionExecution.node, SessionExecutionLocal.node]])
```

---

## 总结

| 概念 | Effect 构造 | Opencode 位置 | 用途 |
|------|-------------|---------------|------|
| 服务接口 | `interface Interface {...}` | 每个服务文件的顶部 | 类型契约 |
| 服务标签 | `Context.Service<S, I>()("tag")` | 如 `agent.ts:43` | Context 依赖标识 |
| 服务实现 | `Layer.effect(Service, Effect.gen(...))` | 如 `agent.ts:45-107` | 95% 的场景 |
| 无副作用注册 | `Layer.effectDiscard(...)` | 如 `tool/registry.ts` | 工具注册 |
| 测试桩 | `Layer.succeed(Service, Service.of(...))` | 如 `session/execution.ts:26` | 5 个文件 |
| Location 节点 | `makeLocationNode({...})` | 如 `agent.ts:111` | 每个 Location 重新实例化 |
| Global 节点 | `makeGlobalNode({...})` | 如 `session/execution/local.ts:40` | 全进程共享 |
| 节点组 | `LayerNode.group([...])` | `location-services.ts:42-79` | 36 个服务节点 |
| DAG 编译 | `LayerNode.compile(root)` | `layer-node.ts:250-271` | Node → Layer |
| Hoist | `LayerNode.hoist(tree, "global")` | `location-services.ts:96` | Global/Location 分离 |
| 按需缓存 | `LayerMap.make(fn, {idleTimeToLive})` | `location-services.ts:89-110` | 60 分钟 TTL |
