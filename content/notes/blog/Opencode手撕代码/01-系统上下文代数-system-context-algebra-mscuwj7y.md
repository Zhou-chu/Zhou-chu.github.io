---
blog: true
title: "01 — 系统上下文代数 (System Context Algebra)"
slug: "01-系统上下文代数-system-context-algebra-mscuwj7y"
summary: "01 — 系统上下文代数 (System Context Algebra) 设计意图 OpenCode 的系统提示符需要回答一个看似简单的问题： 模型当前看到的\"系统上下文\"是什么？ 传统方案走的是字符串拼接路线：各处代码把自己想注入的文本片段 push 进一个全局数组，组装时 join(\"\\n\\n\") 一把梭。这套方案有三个致命问题。 问题一：无法比较。 每次轮到 provider turn，你无法知道某个片段到底变了没有。只能每次都"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 01 — 系统上下文代数 (System Context Algebra)

## 设计意图

OpenCode 的系统提示符需要回答一个看似简单的问题：*模型当前看到的"系统上下文"是什么？*

传统方案走的是字符串拼接路线：各处代码把自己想注入的文本片段 `push` 进一个全局数组，组装时 `join("\n\n")` 一把梭。这套方案有三个致命问题。

**问题一：无法比较。** 每次轮到 provider turn，你无法知道某个片段到底变了没有。只能每次都重拼一次全量文本，无法发出增量的 Mid-Conversation System Message。

**问题二：无法持久化。** 上下文被拼成纯文本后就丢了结构。当 Session 跨进程重启，你没法还原"上次看到的快照"来跟"此刻的真相"逐个比较。

**问题三：无法组合。** 环境变量、当前日期、AGENTS.md 指令、选中的 agent skill 列表……这些来源的加载方式不同（同步、异步、需要 location、需要文件系统），但在拼接层全部坍缩成了同质的字符串。

OpenCode 的答案是对系统上下文施加一个**代数结构**：把每个上下文来源建模为带类型的 `Source<A>`，用 `make()` 擦除类型后统一组合成 `SystemContext`，再通过内部的私有 `const observe` 并发加载、`reconcile()` 逐个比较、最终产出两类文本产物。对外暴露的公开 API 只有五个操作：`SystemContext.make`、`SystemContext.combine`、`SystemContext.initialize`、`SystemContext.reconcile`、`SystemContext.replace`。

```
┌──────────────────────────────────────────────────────────────┐
│  传统方案                                                      │
│                                                              │
│  EnvSource ─┐                                                │
│  DateSource ─┤──→ push_str() ──→ String[] ──→ join("\n\n")   │
│  AGENTS.md ─┘                  (类型已丢失)   (每次全量)       │
│                                                              │
│  ─ VS ─                                                      │
│                                                              │
│  OpenCode 代数                                                │
│                                                              │
│  Source<A> ──→ make() ──→ SystemContext ──→ (私有 observe)  │
│                                               │              │
│                    ┌──────────────────────────┘              │
│                    ▼                                         │
│              Snapshot (持久化的 JSON 快照)                     │
│                    │                                         │
│                    ▼                                         │
│              reconcile(now, previous.snapshot)               │
│              逐个 source 比较 JSON 值                          │
│                    │                                         │
│         ┌──────────┼──────────┐                              │
│         ▼          ▼          ▼                              │
│     Unchanged   Updated   ReplacementReady                   │
│     (无变化)   (增量文本)  (全新 baseline)                     │
│                    │                                         │
│                    ▼                                         │
│           Mid-Conversation System Message                    │
│           (仅 changed 片段的渲染文本)                          │
└──────────────────────────────────────────────────────────────┘
```

核心思想可归纳为一句话：**独立加载，隐藏类型，并发观测，逐源比较，精确渲染。**

每个 `Source<A>` 自己管自己的加载和渲染。组合层 (`SystemContext`) 是一个不透明载体，不知道里面有什么类型。解释器（内部的 `const observe` → `reconcile`）并发拉取所有值，然后对照上一份 `Snapshot` 逐个比较 JSON 编码，只把真正变化的源重新渲染成文本。这就是"代数"的含义：操作定义在抽象载体上，具体类型被隐藏，组合与比较的规则不依赖具体类型。

---

## 五层架构

```
Layer 5  Runner 消费者
         ┌──────────────────────────────────────────────────┐
         │  SessionRunner / Provider Turn                    │
         │  在 Safe Provider-Turn Boundary 处:                 │
         │  prepareOnce() → initialize/reconcile/replace     │
         │  发 ContextUpdated Event → 写 Mid-Conversation    │
         │  System Message → 组合 Prompt                     │
         └──────────────────┬───────────────────────────────┘
                            │
Layer 4  ContextEpoch 持久化桥
         ┌──────────────────────────────────────────────────┐
         │  SessionContextEpoch `packages/core/src/session/context-epoch.ts:40-78`     │
         │  DB (baseline + snapshot) ←→ SystemContext API   │
         │  prepareOnce(): concurrent fetch → initialize/   │
         │  reconcile/replace → persist snapshot            │
         │  compaction 感知: compaction.seq > baseline_seq?  │
         │  触发 replacement                                 │
         └──────────────────┬───────────────────────────────┘
                            │
Layer 3  SystemContextRegistry 注册表
         ┌──────────────────────────────────────────────────┐
         │  Registry `packages/core/src/system-context/registry.ts:19-49`                     │
         │  私有: const layer (Layer.effect)                 │
         │  公开: export const node (makeLocationNode)       │
         │  Scope 管理的动态注册/注销                          │
         │  register(entry) → acquireRelease                 │
         │  load() → 并发加载所有 entry → combine()           │
         │  key 排序: toSorted((a,b) => a.key < b.key)       │
         └──────────────────┬───────────────────────────────┘
                            │
Layer 2  Producers 生产者
         ┌──────────────────────────────────────────────────┐
         │  Builtins `packages/core/src/system-context/builtins.ts:12-50`                     │
         │  私有: const builtIns (Layer.effectDiscard)       │
         │  公开: export const node                           │
         │  依赖: Location.node, SystemContextRegistry.node,  │
         │        InstructionContext.node, FSUtil.node,      │
         │        Global.node                                │
         │  ├── core/environment: 环境字符串                   │
         │  └── core/date:      当前日期字符串                 │
         │                                                    │
         │  InstructionContext 层                            │
         │  私有: const observe (InstructionContext.observe)  │
         │  公开: export const node                           │
         │  ├── global/instructions: ~/.opencode/AGENTS.md   │
         │  └── project/instructions: 项目 AGENTS.md          │
         │                                                    │
         │  插件定义的 Context Source (planned)               │
         └──────────────────┬───────────────────────────────┘
                            │
Layer 1  SystemContext 代数定义
         ┌──────────────────────────────────────────────────┐
         │  packages/core/src/system-context/index.ts: Source<A>, make(), combine(),          │
         │  initialize(), reconcile(), replace()             │
         │  私有: const observe, reconcileObservation,       │
         │        replaceObservation, initializeObservation  │
         │  数据结构: Snapshot, Generation, Updated           │
         │  内部三层: PackedSource → Loaded → Rendered        │
         └──────────────────────────────────────────────────┘
```

---

## 源码走读: packages/core/src/system-context/index.ts

该文件是 System Context 子系统的核心模块。不依赖数据库，不依赖 Session，纯 Effect 纯函数。

### Source&lt;A&gt; 接口 `packages/core/src/system-context/index.ts:32-39`

```typescript
export interface Source<A> {
  readonly key: Key
  readonly codec: Schema.Codec<A, Schema.Json, never, never>
  readonly load: Effect.Effect<A | Unavailable>
  readonly baseline: (current: A) => string
  readonly update: (previous: A, current: A) => string
  readonly removed?: (previous: A) => string
}
```

六个字段，各司其职：

- **`key`** (`packages/core/src/system-context/index.ts:22-30`): 命名空间化的稳定标识符，格式 `/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*$/`，例 `core/environment`, `core/date`, `project/instructions`。
- **`codec`** (`packages/core/src/system-context/index.ts:32-39`): Effect Schema 的 JSON codec，用于值的序列化（存入 Snapshot）和反序列化（从 Snapshot 恢复后比较）。这是"逐源比较"的唯一手段，比较的是 JSON 等价性 (`Schema.toEquivalence`)。
- **`load`** (`packages/core/src/system-context/index.ts:32-39`): 返回 `A | Unavailable`。`Unavailable` 是一个 Symbol 标记 (`packages/core/src/system-context/index.ts:27-29`)，表示"暂时加载失败"，与"源被移除"是不同语义。
- **`baseline`** (`packages/core/src/system-context/index.ts:32-39`): 纯函数，`A → string`。在 epoch 启动时渲染，产出的文本进入 Baseline System Context。
- **`update`** (`packages/core/src/system-context/index.ts:32-39`): 纯函数，`(A, A) → string`。在 reconcile 发现值变化时渲染，上一次的值和当前值都传入，允许渲染出对比式文本。
- **`removed`** (`packages/core/src/system-context/index.ts:32-39`): 可选。当某个 source 从 registry 中被注销后，用它上次的值渲染一条"该上下文不再适用"的消息。

### make() 类型隐藏 `packages/core/src/system-context/index.ts:135-173`

```typescript
export function make<A>(source: Source<A>): SystemContext
```

这是"代数"的关键操作。`make` 把带类型参数 `A` 的 `Source<A>` 封闭成一个不透明的 `SystemContext`。内部经过三层嵌套：

```
Source<A> (公开)
  └─→ PackedSource `packages/core/src/system-context/index.ts:99-102`: load 的返回值被包了一层，
      变成 Effect<Loaded | Unavailable>，类型 A 消失。

Loaded `packages/core/src/system-context/index.ts:104-107`:
  - baseline: () => Rendered       ← 惰性求值，只有需要时才渲染
  - compare: (previous: Json) → Compared

Rendered `packages/core/src/system-context/index.ts:109-112`:
  - text: string
  - snapshot: SourceSnapshot

Compared `packages/core/src/system-context/index.ts:114-117`:
  - Incompatible  ← 旧 snapshot 无法 decode 为新类型（schema 变更）
  - Unchanged     ← JSON 等价，无需重新渲染
  - Updated       ← 值变了，render() 惰性生成新文本 + 新快照
```

关键实现细节 (`packages/core/src/system-context/index.ts:154-167`):

```typescript
compare: (previous): Compared =>
  Option.match(decode(previous), {
    onNone: (): Compared => ({ _tag: "Incompatible" }),
    onSome: (decoded): Compared =>
      equivalent(decoded, value)  // JSON 等价性比较
        ? { _tag: "Unchanged" }
        : {
            _tag: "Updated",
            render: () => ({       // 惰性渲染
              text: requireText(source.key, "update", source.update(decoded, value)),
              snapshot: snapshot(),
            }),
          },
  }),
```

关于"惰性"的含义：`compare` 返回 `Unchanged` 时不调用任何 render 函数。只有 `Updated` 时，外部代码调用 `compared.render()` 才会触发 `source.update(decoded, value)` 渲染增量文本。这避免了对未变化 source 的无意义渲染。

`requireText` (`packages/core/src/system-context/index.ts:309-311`) 保证渲染出的文本非空，空文本直接 throw，避免静默吞掉重要上下文。

### combine() 简单性 `packages/core/src/system-context/index.ts:176-180`

```typescript
export function combine(values: ReadonlyArray<SystemContext>): SystemContext {
  const sources = values.flatMap((value) => value[ContextTypeId])
  assertUniqueKeys(sources)
  return context(sources)
}
```

`flatMap` 把所有 `SystemContext` 的内部 `PackedSource[]` 拍平成一个数组，然后做去重检查 (`assertUniqueKeys`, `packages/core/src/system-context/index.ts:314-319`)。key 冲突直接 throw `DuplicateKeyError` (`packages/core/src/system-context/index.ts:91-97`)。不排序，不合并，不展开，就是拍平加去重。这正是代数组合子应有的简单性。

### `const observe` — 私有并发加载 `packages/core/src/system-context/index.ts:182-195`

`observe` 是一个**不导出的私有常量**（`const observe`），仅在 `initialize`、`reconcile`、`replace` 内部使用。它不是公开 API 的一部分。

```typescript
const observe = (value: SystemContext) =>
  Effect.forEach(
    value[ContextTypeId],
    (source) => source.load.pipe(Effect.map(...)),
    { concurrency: "unbounded" },
  )
```

所有 `PackedSource` 的 `load` 以无限并发 (`unbounded`) 执行。结果标记为 `Available` 或 `Unavailable`——后者不是错误，而是合法状态。

### initialize() → initializeObservation() `packages/core/src/system-context/index.ts:198-215`

```typescript
export function initialize(value: SystemContext): Effect.Effect<Generation, InitializationBlocked>
```

`initialize` 调用私有的 `observe`，然后：

1. 如果有任何 source 返回 `Unavailable`，直接 throw `InitializationBlocked` (`packages/core/src/system-context/index.ts:82-89`)，附带所有不可用的 key 列表。使用者会收到清晰的错误信息。
2. 全部可用时，调用私有函数 `initializeObservation` (`packages/core/src/system-context/index.ts:208-215`): 对每个 source 调用 `baseline()` 生成 `Rendered`，然后 `render()` (`packages/core/src/system-context/index.ts:297-299`) 将所有文本用 `"\n\n"` 连接成 `baseline` 字符串，同时用 `Object.fromEntries` 构建 `Snapshot`。

产出 `Generation` (`packages/core/src/system-context/index.ts:59-62`):
```typescript
export interface Generation {
  readonly baseline: string   // 模型页面看到的全量文本
  readonly snapshot: Snapshot // 持久化的比较基准
}
```

### reconcile() → reconcileObservation() `packages/core/src/system-context/index.ts:218-280`

```typescript
export function reconcile(value: SystemContext, previous: Snapshot):
  Effect.Effect<ReconcileResult>
```

`ReconcileResult` (`packages/core/src/system-context/index.ts:79-80`) 有四种可能:

| 状态 | 含义 | 行为 |
|------|------|------|
| `Unchanged` | 所有 source 的值都没变 | 什么都不做 |
| `Updated` | 至少一个 source 值变了 | 产出增量文本 (Mid-Conversation System Message) |
| `ReplacementReady` | 需要全新 baseline | 重新生成 Generation |
| `ReplacementBlocked` | 有 previously-known source 暂时不可用 | 阻塞，等下次 |

`reconcile` 调用私有的 `observe`，然后将结果交给私有的命名函数 `reconcileObservation` (`packages/core/src/system-context/index.ts:228-280`) 逐源比较：

1. **Set comparison** (`packages/core/src/system-context/index.ts:232-245`): 遍历所有当前 source，找到在 previous Snapshot 中存在的 key 进行比较。任何 `Incompatible` 直接触发 `Replace`。如果 previous 中有当前不存在的 key 且没有 `removed` 渲染函数，也触发 `Replace`。
2. **逐源处理** (`packages/core/src/system-context/index.ts:249-271`): 对每个 source:
   - `Unavailable` 且之前存在 → 保留旧 snapshot (stale-while-revalidate)
   - 新出现的 source (之前不存在) → 调用 `baseline()` 生成完整文本
   - 未变化的 source → 直接复用旧的 `stored` snapshot
   - 变化的 source → 调用 `compared.render()` 获得增量文本
3. **已移除的 source** (`packages/core/src/system-context/index.ts:272-277`): 对于只存在于 previous 中、不在当前 registry 中的 key，使用其 `removed` 文本。
4. `render(updates)` 把所有变化片段的文本拼在一起，作为此次更新的 message 文本。

### replace() → replaceObservation() `packages/core/src/system-context/index.ts:283-291`

```typescript
export function replace(value: SystemContext, previous: Snapshot):
  Effect.Effect<ReplacementResult>
```

`replace` 调用私有的 `observe` 后委托给私有函数 `replaceObservation` (`packages/core/src/system-context/index.ts:287-291`)。与 `initialize` 不同，`replace` 接受一个 `previous` Snapshot 作为"已知上下文"引用。如果有任何 source 在 previous 中存在但当前返回 `Unavailable`，则 `ReplacementBlocked` (阻止静默丢失已承诺的上下文)。否则，重新生成完整的 `Generation`。

这处理两个场景: (1) 某个 source 的 schema 变更导致 `Incompatible`，强制重建 `baseline`; (2) compaction 完成后需要新 `baseline`。

---

## 源码走读: packages/core/src/system-context/builtins.ts

`builtins.ts` 定义了两个内建的 context source（环境、日期），并注册到 `SystemContextRegistry`。1.18.4 的重构将实现层 (`const builtIns`) 从公开导出 (`export const node`) 中分离，依赖图通过 `makeLocationNode` 显式声明。

### 私有实现层: const builtIns `packages/core/src/system-context/builtins.ts:12-44`

```typescript
// `packages/core/src/system-context/builtins.ts:12-44`
const builtIns = Layer.effectDiscard(
  Effect.gen(function* () {
    const location = yield* Location.Service
    const registry = yield* SystemContextRegistry.Service
    const environment = [
      "<env>",
      `  Working directory: ${location.directory}`,
      `  Workspace root folder: ${location.project.directory}`,
      `  Is directory a git repo: ${location.vcs?.type === "git" ? "yes" : "no"}`,
      `  Platform: ${process.platform}`,
      "</env>",
    ].join("\n")
    const context = SystemContext.combine([
      SystemContext.make({
        key: SystemContext.Key.make("core/environment"),
        codec: Schema.toCodecJson(Schema.String),
        load: Effect.succeed(environment),
        baseline: (environment) => [...],
        update: (_previous, environment) => [...],
      }),
      SystemContext.make({
        key: SystemContext.Key.make("core/date"),
        codec: Schema.toCodecJson(Schema.String),
        load: DateTime.nowAsDate.pipe(Effect.map((date) => date.toDateString())),
        baseline: (date) => `Today's date: ${date}`,
        update: (_previous, date) => `Today's date is now: ${date}`,
      }),
    ])
    yield* registry.register({
      key: SystemContext.Key.make("core/builtins"),
      load: Effect.succeed(context)
    })
  }),
)
```

两个静态 source，体现三种模式差异:

| Source | 加载模式 | 变化频率 | 渲染策略 |
|--------|----------|----------|----------|
| `core/environment` | `Effect.succeed` (同步) | 会话内不变 | baseline 生成完整 env 块; update 也重生成 |
| `core/date` | `DateTime.nowAsDate` (Effectful) | 每天可能变 | baseline/update 都只显示日期字符串 |

`core/environment` 的 `codec` 是 `Schema.String`。这是最简单但也是最典型的用法: 比较的是整个环境字符串的 JSON 等价性。环境字符串不变，JSON 比较就返回 `Unchanged`，渲染管道完全不触发。

`core/date` 的 `load` 是 `DateTime.nowAsDate`——注意这是一个 Effect，每次 `observe()` 都重新执行，获得当前日期。日期变了，JSON 比较 (`"Mon Jul 07 2026"` vs `"Sun Jul 06 2026"`) 就返回 `Updated`，增量文本 "Today's date is now: Mon Jul 07 2026" 进入 Mid-Conversation System Message。

最后通过 `registry.register()` 以 `core/builtins` 为 key 组成一个复合 `SystemContext` 注册。这个注册利用 `Effect.acquireRelease` 绑定到 Scope 生命周期。

### 公开 Node 导出: export const node `packages/core/src/system-context/builtins.ts:46-49`

```typescript
// `packages/core/src/system-context/builtins.ts:46-49`
export const node = makeLocationNode({
  name: "system-context-builtins",
  layer: builtIns,
  deps: [Location.node, SystemContextRegistry.node, InstructionContext.node, FSUtil.node, Global.node],
})
```

`builtIns` 是私有的 (`const builtIns`)，不直接导出。公开的 `node` 通过 `makeLocationNode` 打包 layer 和依赖：

- **`Location.node`**: 获取工作目录、项目根目录、VCS 信息来构建环境字符串。
- **`SystemContextRegistry.node`**: 提供 `register()` / `load()` 接口来注册和查询 context source。
- **`InstructionContext.node`**: 显式依赖 — `builtIns` 本身不直接调用 `InstructionContext`，但 `InstructionContext` 也注册了自己的 source（`AGENTS.md` 指令）到同一个 registry。Node 依赖图确保 `InstructionContext` 在 `builtIns` 之前初始化，这样其 context source 在 `registry.load()` 时已可用。这不是 `builtIns` 移除的行为，而是显式声明的拓扑依赖。
- **`FSUtil.node`** / **`Global.node`**: 提供文件系统和全局配置路径解析。

关键设计决策：1.18.4 的 Node 组合模型用 `deps` 数组替代了隐式的 Layer 依赖链。`builtIns` 需要 `InstructionContext.node` 不是因为它的代码直接调用它，而是因为它依赖的 `SystemContextRegistry` 在 `load()` 时需要所有已注册的 source 就绪。Node 依赖图保证了这个初始化顺序。

---

## 源码走读: packages/core/src/system-context/registry.ts

### 私有实现层: const layer `packages/core/src/system-context/registry.ts:19-47`

```typescript
// `packages/core/src/system-context/registry.ts:19-47`
const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const entries = yield* Ref.make<ReadonlyArray<Entry>>([])

    return Service.of({
      register: Effect.fn("SystemContextRegistry.register")(function* (entry) {
        yield* Effect.acquireRelease(
          Ref.modify(entries, (current) => {
            if (current.some((item) => item.key === entry.key)) return [false, current]
            return [true, [...current, entry]]
          }).pipe(
            Effect.flatMap((added) =>
              added ? Effect.void : Effect.die(`Duplicate system context entry key: ${entry.key}`),
            ),
            Effect.as(entry),
          ),
          (entry) => Ref.update(entries, (current) => current.filter((item) => item !== entry)),
        )
      }),
      load: Effect.fn("SystemContextRegistry.load")(function* () {
        const current = (yield* Ref.get(entries)).toSorted(
          (a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
        )
        return SystemContext.combine(
          yield* Effect.forEach(current, (entry) => entry.load, { concurrency: "unbounded" }),
        )
      }),
    })
  }),
)
```

核心设计决策:

1. **`Ref<ReadonlyArray<Entry>>`** (`packages/core/src/system-context/registry.ts:19-47`): 可变引用持有注册表。不是 Map 而是数组，因为最终顺序由 `toSorted` 确定。

2. **`register` 使用 `acquireRelease`** (`packages/core/src/system-context/registry.ts:26-37`): 注册和注销绑定到 Effect 的 Scope 生命周期。Scope 关闭时，release 回调自动从数组中移除该 entry。这意味着插件激活时注册 source，插件关闭时自动清理——无需手动管理生命周期。Key 冲突直接 `Effect.die` (非可恢复错误)，因为同 key 注册两次是配置错误。

3. **`load()` 并发 + 排序** (`packages/core/src/system-context/registry.ts:39-44`):
   - `toSorted` 按 key 字母序排列，保证每次组合结果确定性
   - `Effect.forEach(..., { concurrency: "unbounded" })` 并发加载所有 entry
   - `SystemContext.combine(...)` 合并所有加载结果

这个设计的关键好处是"热插拔": registry 是动态的，`load()` 每次执行时反映当前 Scope 内所有活跃的 entry。不需要显式的事件系统通知"source 变化了"，因为下一次 `prepareOnce()` 自然就会重新加载所有 source 并进行比较。

### 公开 Node 导出: export const node (`packages/core/src/system-context/registry.ts:46-49`)

```typescript
// `packages/core/src/system-context/registry.ts:46-49`
export const node = makeLocationNode({ service: Service, layer, deps: [] })
```

`layer` 是私有的 (`const layer`)，不直接导出。公开的 `node` 通过 `makeLocationNode` 将 service + layer 打包为 Location-scoped 的依赖节点。`deps: []` 表示 registry 是叶子节点——它不依赖其他 node，但其他模块（如 `builtIns`、`instruction-context`）通过 `SystemContextRegistry.node` 将其纳入自己的依赖图。

`makeLocationNode` 的 `{ service: Service, layer, deps: [] }` 签名与 `builtIns` 的 `{ name, layer, deps: [...] }` 不同。registry 直接提供 `Service`（因为其他模块通过 `yield* SystemContextRegistry.Service` 获取它），所以不需要 `name` 参数；而 `builtIns` 使用 `name` 作为 Service identifier。

---

## 源码走读: packages/core/src/session/context-epoch.ts

文件位置: `packages/core/src/session/context-epoch.ts`，不是 `system-context/` 目录下。

公开导出的入口:
- **`initialize(db, context, sessionID)`** (`packages/core/src/session/context-epoch.ts:23-29`): 轻量包装，调用私有函数 `initializeOnce`。只在 Session 还没有 epoch 记录时才做首次上下文准备和 DB 写入。已存在则返回 `undefined`。
- **`prepare(db, events, context, sessionID)`** (`packages/core/src/session/context-epoch.ts:31-38`): 每次 provider turn 前调用的主入口。调用私有函数 `prepareOnce`。

私有核心: **`const prepareOnce`** (`packages/core/src/session/context-epoch.ts:40-78`):

```typescript
// `packages/core/src/session/context-epoch.ts:40-78`
const prepareOnce = Effect.fnUntraced(function* (
  db: DatabaseService,
  events: EventV2.Interface,
  context: Effect.Effect<SystemContext.SystemContext>,
  sessionID: SessionSchema.ID,
) {
  const [value, stored, compaction] = yield* Effect.all(
    [context, find(db, sessionID), SessionHistory.latestCompaction(db, sessionID)],
    { concurrency: "unbounded" },
  )
  if (!stored) {
    const generation = yield* SystemContext.initialize(value)
    const baselineSeq = yield* insert(db, sessionID, generation)
    return { baseline: generation.baseline, baselineSeq }
  }

  const snapshot = yield* Schema.decodeUnknownEffect(SystemContext.Snapshot)(stored.snapshot)
  const replacementSeq = compaction !== undefined && compaction.seq > stored.baseline_seq
    ? compaction.seq : undefined
  const result = replacementSeq
    ? yield* SystemContext.replace(value, snapshot)
    : yield* SystemContext.reconcile(value, snapshot)
  if (result._tag === "Unchanged" || result._tag === "ReplacementBlocked") {
    return { baseline: stored.baseline, baselineSeq: stored.baseline_seq }
  }
  if (result._tag === "ReplacementReady") {
    const baselineSeq = replacementSeq ?? (yield* EventV2.latestSequence(db, sessionID))
    yield* replace(db, sessionID, baselineSeq, result.generation)
    return { baseline: result.generation.baseline, baselineSeq }
  }

  yield* events.publish(
    SessionEvent.ContextUpdated,
    { sessionID, messageID: SessionMessage.ID.create(),
      timestamp: yield* DateTime.now, text: result.text },
    { commit: () => advance(db, sessionID, result.snapshot).pipe(Effect.orDie) },
  )
  return { baseline: stored.baseline, baselineSeq: stored.baseline_seq }
})
```

完整流程图:

```
prepareOnce(db, events, context, sessionID)
│
├─→ Effect.all([context, find(db,sessionID), latestCompaction(db,sessionID)])
│   并发获取三样东西: 当前上下文、DB 中已持久化的 epoch、最新 compaction 记录
│
├─→ !stored?
│   ├─ YES → initialize → insert(DB) → return Generation
│   │        全新 Session, 第一次 baseline
│   │
│   └─ NO  → decode snapshot from DB
│             │
│             ├─ compaction.seq > baseline_seq?
│             │   YES → SystemContext.replace()
│             │         compaction 重置了 timeline,
│             │         需要全新 baseline
│             │   NO  → SystemContext.reconcile()
│             │         正常增量比较
│             │
│             └─ result._tag?
│                 ├─ Unchanged         → return stored baseline
│                 ├─ ReplacementBlocked → return stored baseline (等下次)
│                 ├─ ReplacementReady  → replace DB + return new baseline
│                 └─ Updated           → publish ContextUpdated event
│                                        + advance DB snapshot
│                                        + return stored baseline
│                                        (baseline 不变, 只发增量消息)
```

关键决策:

1. **Compaction 感知** (`packages/core/src/session/context-epoch.ts:59-61`): 如果 compaction 发生在 baseline_seq 之后，强制走 `replace` 路径，生成全新 baseline。这是因为 compaction 改变了 Session History 的起点，"旧的" baseline 需要重述全部上下文。

2. **`Updated` 不改 baseline** (`packages/core/src/session/context-epoch.ts:63-78`): 当 reconcile 检测到变化时，不更新 DB 中的 baseline 文本。baseline 保持 epoch 开始时的样子，只把增量消息 (Mid-Conversation System Message) 作为 Session Event 发布，同时把新的 snapshot 写入 DB (`advance`)。下一次 reconcile 还是对照更新后的 snapshot 比较。

3. **`ContextUpdated` Event** (`packages/core/src/session/context-epoch.ts:72-76`): 发布到 EventV2 总线，附带新的 snapshot 作为 commit 回调。这是 Mid-Conversation System Message 的持久化形式。

4. **`initialize()` vs `prepare()`** (`packages/core/src/session/context-epoch.ts:23-38`): `initialize()` 是一个轻量包装，调用 `initializeOnce` 只在 session 还没有 epoch 记录时才做。用于 Session 创建时的首次上下文准备。`prepare()` 才是每次 provider turn 前调用的主入口，内部调用 `prepareOnce`。两者都是公开导出，但核心逻辑都在私有函数中。

---

## CONTEXT.md 术语对照

以下是 CONTEXT.md 中定义的术语，配上原文引用:

### 📌 Context Source

> "One independently observed typed value within the **System Context**, represented by a stable key, JSON codec, infallible loader, pure baseline/update renderers, and an optional removal renderer for dynamic sources."
> *Avoid*: Prompt fragment

即代码中的 `Source<A>` 接口 (`packages/core/src/system-context/index.ts:32-39`)。每个 source 是一个独立可观测的带类型值。

---

### 📌 System Context

> "The structured collection of contextual facts presented to the model as initial instructions and chronological updates."
> *Avoid*: System prompt

即代码中的 `SystemContext` 类型 (`packages/core/src/system-context/index.ts:44-46`)。它是一个不透明载体 (opaque carrier)，内部持有 `PackedSource[]`。对外暴露的不是文本，而是代数操作 (`initialize`, `reconcile`, `replace`)。

---

### 📌 System Context Registry

> "The Location-scoped registry of ordered, scoped producers that contribute to the current **System Context**."

即 `SystemContextRegistry` (`packages/core/src/system-context/registry.ts:12-15`)。作用域绑定到 Location，每个 Location 有自己的 registry 实例。注册和注销通过 Scope 管理生命周期。

---

### 📌 Baseline System Context

> "The full **System Context** rendered at the start of a **Context Epoch**."
> *Avoid*: Live system prompt

即 `Generation.baseline` (`packages/core/src/system-context/index.ts:59-62`) 字段。一个 Epoch 期间不变的文本，在此 Epoch 内的所有 provider turn 共享。

---

### 📌 Context Snapshot

> "The overwriteable model-hidden JSON state used to compare each **Context Source** with the value last admitted to a provider turn."

即 `Snapshot` 类型 (`packages/core/src/system-context/index.ts:56-57`): `Schema.Record(Key, SourceSnapshot)`。每个 source key 映射到一个 `{ value: Schema.Json, removed?: string }`。JSON 比较的基准。

---

### 📌 Mid-Conversation System Message

> "A durable chronological instruction that tells the model the newly effective state of a changed **Context Source**."
> *Avoid*: System update, system notification, raw text diff

即 `Updated.text` (`packages/core/src/system-context/index.ts:66`) 字段。在 reconcile 检测到变化后，通过 `ContextUpdated` Event (`packages/core/src/session/context-epoch.ts:72-76`) 发布，最终作为一条 chronologically ordered message 进入模型的上下文。

---

### 📌 Context Epoch

> "The span during which one initially rendered **Baseline System Context** remains the immutable provider-cache baseline, ending at completed compaction, Session movement, or an incompatible context transition that requires a fresh baseline."

在代码中体现为 `SessionContextEpoch` 模块 (`context-epoch.ts`) 管理的持久化状态: DB 中的 `baseline` + `snapshot` + `baseline_seq`。Epoch 结束时 (compaction 触发 `replace`)，新 Generation 写入 DB，旧 epoch 结束。

---

### 📌 Unavailable Context

> "An expected temporary inability to observe a **Context Source** value; the runtime retains its prior effective state and emits no update, or omits it until first successfully loaded."

即 `unavailable` Symbol (`packages/core/src/system-context/index.ts:28`) 和 `UnavailableEntry` 内部类型 (`packages/core/src/system-context/index.ts:124-127`)。在 `reconcileObservation` 中，当 source 返回 Unavailable 但之前有快照时，保留旧快照 (`packages/core/src/session/context-epoch.ts:251-253`)，不触发更新。

---

## 概念纠正 #1: System Context 是 opaque carrier，不是文本

一个常见的直觉是把 System Context 想象成"一个长字符串"。但实际上:

> **System Context 是一个不透明载体 (opaque carrier)**，它对外暴露的不是文本，而是代数操作 (`initialize`, `reconcile`, `replace`)。

它产生两种文本产物:

| 文本产物 | 产生时机 | 持久化 |
|----------|----------|--------|
| **Baseline System Context** | Epoch 开始时 (initialize 或 replace) | 写入 DB `baseline` 列 |
| **Mid-Conversation System Message** | reconcile 检测到变化时 | 作为 SessionEvent 发布 |

这两个文本的语义完全不同。Baseline 是"从零开始的全景叙述"，Mid-Conversation System Message 是"自上次以来的增量变化"。混淆这两个产物会导致错误地把 increment message 当成 baseline — 或者反过来。

代码层面的体现: `Generation` (`packages/core/src/system-context/index.ts:59-62`) 是 baseline + snapshot，而 `Updated` (`packages/core/src/system-context/index.ts:64-68`) 是 text + snapshot。两者都是 `SystemContext` 解释器产生的值，但 `SystemContext` 本身不是任何一个。

---

## 概念纠正 #3: Context Source 是轮询制 (polling)，不是事件驱动

这是一个容易被误解的设计决策。

直觉上，"当环境变了就应该发事件通知"似乎是更自然的模型。但 OpenCode 刻意选择了轮询制，原因如下:

| 维度 | 事件驱动 (Event-driven) | 轮询制 (Polling) — OpenCode 的选择 |
|------|-------------------------|-------------------------------------|
| **触发时机** | Source 变化时主动 push | Safe Provider-Turn Boundary 时才 pull |
| **检测方法** | 事件总线广播 | `observe()` 并发加载 → JSON codec 等价性比较 |
| **采样频率** | 每次变化都触发 (可能高频) | 每次 provider turn 前一次 (自然限流) |
| **跨进程持久化** | 需要事件日志回放 | 只需一个 `Snapshot` (JSON blob) 写入 DB |
| **启动恢复** | 需要重建事件状态 | 从 DB 读取 `Snapshot`，直接比较 |
| **信号丢失处理** | 事件丢失 = 上下文不一致 | 轮询 + 比较 = 天然 self-healing |
| **实现复杂度** | 高 (事件定义、序列化、回放、去重) | 低 (一个 Effect + JSON compare) |
| **顺序保证** | 需要因果序 | `toSorted` 按 key 排序，确定性 |

从 `packages/core/src/session/context-epoch.ts:40-49` 可以看到，每次 `prepareOnce()` 执行时:

```typescript
const [value, stored, compaction] = yield* Effect.all(
  [context, find(db, sessionID), SessionHistory.latestCompaction(db, sessionID)],
  { concurrency: "unbounded" },
)
```

`context` 是通过 `SystemContextRegistry.load()` 从 registry 中并发拉取所有 source 的当前值。这个拉取发生在 Safe Provider-Turn Boundary——不是 source 变化时，而是"模型即将需要上下文时"。然后拿这个当前值去对照 DB 中保存的上一次 `Snapshot` 做比较。

**轮询制的核心优势: "lazy at boundary"**。CONTEXT.md 的描述精确捕捉了这一点:

> "Context source changes never wake idle sessions; the next naturally scheduled **Safe Provider-Turn Boundary** loads and compares current values lazily."

空闲的 Session 不会因为日期变了就被唤醒。只有用户发了一条新消息 (promoted to Session inbox)，触发 provider turn，在 turn 开始前的 Safe Boundary 处，系统才懒加载所有 source，比较 snapshot，决定是发 Mid-Conversation System Message 还是什么都不做。

这也解释了为什么 Snapshot 设计为 `Schema.Json` 记录 (`packages/core/src/system-context/index.ts:49-52`)——它不存"上次的纯文本"，而是存"上次的编码后的值"。这样每次比较只需要一个 JSON 等价性检查，不需要重新渲染文本做字符串 diff。

---

## 关联笔记

**参考章节:**
- [00 — 架构总览](00-overview.md)
- [02 — 会话生命周期](02-session-lifecycle.md)
- [05 — Effect 基础设施](05-effect-infra.md)

**System Context 深度解析:**
- [System Context部分的工作原理](System Context部分的工作原理.md)
- [make函数代码详解](make函数代码详解.md)
- [observe代码详解](observe代码详解.md)
- [轮询式比较的调用链和相关代码](轮询式比较的调用链和相关代码.md)
- [prepareOnce 的四个出口](prepareOnce 的四个出口.md)

---

最后更新：2026-07-24 | 来源：opencode-dev-new 1.18.4 源码走读 + CONTEXT.md 术语对照 + 设计哲学 + 概念纠正
