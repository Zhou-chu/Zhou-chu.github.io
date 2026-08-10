---
blog: true
title: "Effect-TS 核心范式 —— 以 Opencode 源码为例"
slug: "effect-ts-核心范式-以-opencode-源码为例-mscumzrn"
summary: "树节点：02 Effect TS核心范式 父节点：02 TypeScript核心语法 子节点：02 Layer与依赖注入 | 02 Fiber与Scope Effect TS 核心范式 —— 以 Opencode 源码为例 Effect TS 是整个 Opencode 的执行框架。它不仅仅是一个\"错误处理库\"，而是一个完整的副作用建模系统。本文用 Opencode 的真实代码解释其核心概念。 1. Effect 作为惰性程序描述 定义 "
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：02-Effect-TS核心范式
> 父节点：[[02-TypeScript核心语法]]
> 子节点：[[02-Layer与依赖注入]] | [[02-Fiber与Scope]]

# Effect-TS 核心范式 —— 以 Opencode 源码为例

Effect-TS 是整个 Opencode 的执行框架。它不仅仅是一个"错误处理库"，而是一个完整的副作用建模系统。本文用 Opencode 的真实代码解释其核心概念。

---

## 1. Effect 作为惰性程序描述

### 定义

`Effect<A, E, R>` 不是一个执行中的 Promise，而是一个**不可变的程序蓝图**——它描述了"需要什么（R），可能成功返回什么（A），可能失败返回什么（E）"，但在调用 `runPromise` 之前什么都不会发生。

### 关键区别

```ts
// Promise: 创建即执行
const p = fetch("/api")  // 网络请求已发出

// Effect: 创建只是描述
const e = Http.request("/api")  // 只是蓝图，还没执行
```

### Opencode 示例

整个 Session Runner 的 `run` 函数返回 `Effect.Effect<void, RunError>`——它只是一个蓝图：

```ts
// packages/core/src/session/runner/index.ts:22-26
export interface Interface {
  readonly run: (input: {
    readonly sessionID: SessionSchema.ID
    readonly force: boolean
  }) => Effect.Effect<void, RunError>
}
```

### 为什么重要

惰性意味着可以**安全组合**、**重试**、**并发控制**、**中断传播**。Opencode 利用这个特性实现了复杂的重试逻辑、超时控制、并发工具执行和优雅的中断传播。

---

## 2. Effect.gen(function\* () { ... })

### 定义

`Effect.gen` 将 Generator 函数转换为 Effect 程序，使得异步/副作用代码可以写成**同步风格**。Generator 的 `yield*` 语法用于"等待"一个 Effect 完成并提取其成功值。

这是 Effect-TS 编写程序的主要方式。

### Opencode 示例

完整的 runner Layer 构建使用 `Effect.gen`：

```ts
// packages/core/src/session/runner/llm.ts:93-95
const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const events = yield* EventV2.Service
    const llm = yield* LLMClient.Service
    const agents = yield* AgentV2.Service
    const tools = yield* ToolRegistry.Service
    const store = yield* SessionStore.Service
    // ...
```

### 为什么重要

在 `Effect.gen` 内部，你可以像写同步代码一样编排异步逻辑：
- `yield*` 获取服务实例
- `yield*` 等待数据库查询
- `yield*` 执行 LLM 调用

这避免了 Promise 的 `.then()` 链和 async/await 的错误处理缺失问题。

---

## 3. `yield*` 用于顺序组合

### 定义

`yield*` 将当前 Effect "嵌入"到 Generator 中——暂停当前协程，等待嵌入的 Effect 完成，然后继续。
- 成功：提取值并继续
- 失败：向上传播错误（短路）
- 被中断：传播中断信号

### Opencode 示例

`SessionRunner.runTurn` 内部编排多个步骤，每个都通过 `yield*` 串联：

```ts
// packages/core/src/session/runner/llm.ts:173-197
const runTurnAttempt = Effect.fn("SessionRunner.runTurn")(function* (
  sessionID, promotion, step, recoverOverflow
) {
  const session = yield* getSession(sessionID)       // 1. 获取 session
  const agent = yield* agents.select(session.agent)    // 2. 选择 agent
  const initialized = yield* SessionContextEpoch.initialize(...)  // 3. 初始化 epoch
  const model = yield* models.resolve(session)         // 4. 解析模型
  const entries = yield* SessionHistory.entriesForRunner(...)     // 5. 加载历史
  const toolMaterialization = ... ? undefined : yield* tools.materialize(...)  // 6. 准备工具
  // ...
})
```

每一步如果失败，后面的步骤不会执行，错误会自动向上传播。

### 为什么重要

这比 async/await 更强大：`yield*` 不仅等待完成，还参与 Effect 的错误通道、依赖注入和中断传播。Promise 的 `await` 只能用 try/catch 处理错误，而 Effect 的错误是类型安全的。

---

## 4. Effect.succeed / Effect.fail / Effect.tryPromise

### 定义

三种基本的 Effect 构造器：

| 构造器 | 用途 | 签名 |
|--------|------|------|
| `Effect.succeed(value)` | 立即成功 | `() => Effect<A, never>` |
| `Effect.fail(error)` | 立即失败 | `() => Effect<never, E>` |
| `Effect.tryPromise(fn)` | 包装一个可能抛错的 Promise | 自动捕获同步和异步错误 |

### Opencode 示例

**Effect.succeed** — 在 runner/llm.ts 中用于返回无需副作用的计算结果：

```ts
// packages/core/src/session/runner/llm.ts:318-326
// 成功完成时，捕获快照
const endSnapshot = yield* snapshots.capture()
const files = startSnapshot && endSnapshot
  ? yield* snapshots.files({ from: startSnapshot, to: endSnapshot })
      .pipe(Effect.catch(() => Effect.succeed(undefined)))
  : undefined
```

如果 `snapshots.files` 计算失败，`Effect.catch` 将其恢复为 `Effect.succeed(undefined)`——一种优雅的错误降级。

**Effect.failCause** — 传播已发生的错误：

```ts
// packages/core/src/session/runner/llm.ts:342-343
if (stream._tag === "Failure") return yield* Effect.failCause(stream.cause)
if (settled._tag === "Failure" && Cause.hasInterrupts(settled.cause))
  return yield* Effect.failCause(settled.cause)
```

### 为什么重要

Effect 不允许"吞掉"错误。所有可能的失败路径都必须被类型表示为 `E` 或 `Cause`。这种设计迫使开发者在编译时就考虑所有错误情况。

---

## 5. pipe 与 fluent API

### 定义

Effect-TS 中，`pipe(value, fn1, fn2, ...)` 是函数式编程的标准组合方式：将前一个结果作为下一个函数的输入。

### Opencode 示例

**Effect.pipe 在错误处理中**：

```ts
// packages/core/src/session/runner/llm.ts:355-366
const runAfterOverflowCompaction: RunTurn = Effect.fnUntraced(function* (sessionID, promotion, step) {
  return yield* runTurnAttempt(sessionID, promotion, step).pipe(
    Effect.catchDefect(
      Effect.fnUntraced(function* (defect) {
        if (!(defect instanceof TurnTransitionError)) return yield* Effect.die(defect)
        if (defect.transition._tag === "ContinueAfterOverflowCompaction")
          return yield* Effect.die("Post-compaction provider attempt cannot recover another overflow")
        yield* Effect.yieldNow
        return yield* runAfterOverflowCompaction(sessionID, undefined, defect.transition.step)
      }),
    ),
  )
})
```

`runTurnAttempt(...).pipe(Effect.catchDefect(...))` 表示：执行 `runTurnAttempt`，如果发生 defect（非预期错误），用 `catchDefect` 处理。

**Stream.pipe 在 LLM 流式响应中**：

```ts
// packages/core/src/session/runner/llm.ts:232-275
const providerStream = llm.stream(request).pipe(
  Stream.runForEach((event) =>
    Effect.gen(function* () {
      if (LLMEvent.is.providerError(event)) { ... }
      yield* publish(event)
      if (event.type !== "tool-call" || event.providerExecuted) return
      // ...
    }),
  ),
  Effect.ensuring(withPublication(publisher.flush())),
)
```

`llm.stream(request).pipe(Stream.runForEach(...), Effect.ensuring(...))` 创建了一个流式处理管道：每个事件到达时执行回调，流结束时确保 flush。

### 为什么重要

`pipe` 是数据流从左到右的声明式组合。在 Effect 生态中，`pipe` 用于组合 Effect、Stream、Layer、Schema 转换等几乎所有操作。

---

## 6. 错误通道（E）vs 成功通道（A）vs 需求通道（R）

### 定义

Effect 的类型签名 `Effect<A, E, R>` 将三种关注点分开：

- **A**：成功通道——`yield*` 能提取到的值
- **E**：错误通道——`catchTag` 能匹配的类型化错误
- **R**：需求通道——通过 `Layer` 提供的服务

### Opencode 示例

`tool.execute` 的签名精确地区分了成功和错误：

```ts
// packages/core/src/tool/tool.ts:53-56
readonly execute: (
  input: Schema.Schema.Type<Input>,
  context: Context,
) => Effect.Effect<Schema.Schema.Type<Output>, ToolFailure>
```

此处 `Output` 是成功类型，`ToolFailure` 是错误类型。工具实现**不能**抛出任意 Error——它只能通过 `ToolFailure` 报告失败。

再看 `RunError`——它是一个精心设计的联合类型：

```ts
// packages/core/src/session/runner/index.ts:11-17
export type RunError =
  | LLMError
  | SessionRunnerModel.Error
  | MessageDecodeError
  | ContextSnapshotDecodeError
  | SystemContext.InitializationBlocked
  | ToolOutputStore.Error
```

这意味着调用 `run` 的代码可以**完全知晓**所有可能的失败场景，并使用 `Effect.catchTag` 精确匹配每种错误。

### 为什么重要

这解决了 TypeScript/JavaScript 中最大的痛点：你不知道一个函数会抛出什么错误。Effect 将错误"拉入类型系统"，消除了 `catch-all` 的坏习惯。

---

## 7. Effect.runPromise

### 定义

`Effect.runPromise` 是 Effect 程序的执行入口——它需要一个**完整的依赖环境**（通过 `provide` 提供），然后实际运行程序并返回 Promise。

### Opencode 示例

虽然 runner 内部代码主要用 `yield*` 组织，但在最外层的入口（如 CLI 或 Server 的 HTTP 处理器）会调用 `runPromise` 来触发执行。runner 本身通过 `Layer.effect` 构建，最终被装配到应用的完整 service graph 中。

```ts
// packages/core/src/session/runner/llm.ts:93-94
const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    // ...
    return Service.of({ run })
  }),
)
```

这个 layer 被上层代码通过 `Effect.runPromise(layerEffect.pipe(Effect.provide(allLayers)))` 运行。

### 为什么重要

`runPromise` 是 Effect 程序与外部世界（如 Node.js 进程、HTTP 响应、测试断言）的连接点。在它被调用之前，一切只是蓝图。

---

## 8. Stream —— LLM 流式响应

### 定义

`Stream<A, E, R>` 是 Effect 中的**响应式流**：它可以产生零个、一个或多个值（`A`），可能在任意时刻失败（`E`），并需要环境（`R`）。Stream 是惰性的——调用 `llm.stream(request)` 不会开始消费数据，直到 `runForEach` 或类似的消费者被连接。

### Opencode 示例

LLM 流式调用是 Opencode 中最关键的 Stream 使用场景：

```ts
// packages/core/src/session/runner/llm.ts:232-275
const providerStream = llm.stream(request).pipe(
  Stream.runForEach((event) =>
    Effect.gen(function* () {
      // 事件处理:
      // - providerError? 如果是 overflow 且无输出 → 记录下来
      // - tool-call? → 执行工具并在 FiberSet 中运行
      // - 文本/推理 → publish
      if (LLMEvent.is.providerError(event)) {
        if (isContextOverflowFailure(event) && !publisher.hasAssistantStarted())
          overflowFailure = event; return
      }
      yield* publish(event)
      if (event.type !== "tool-call" || event.providerExecuted) return
      // 执行工具...
    }),
  ),
  Effect.ensuring(withPublication(publisher.flush())),
)
```

`Stream.runForEach` 消费流，每次事件到达时执行 Effect。`Effect.ensuring` 确保无论成功、失败还是中断，`publisher.flush()` 都会被调用。

### 为什么重要

LLM 的响应是分 chunk 到达的（逐 token），Stream 是处理这种场景的理想抽象。它比 Node.js 的 `Readable` 或 `EventEmitter` 更强大：类型安全 + 错误传播 + 中断支持 + 资源的自动清理（通过 `Scope`）。

---

## 小结

Effect-TS 的 8 个核心概念在 Opencode 中的具体角色：

| 概念 | 在 Opencode 中的角色 |
|------|---------------------|
| Effect 作为惰性蓝图 | Session Runner 的 `run()` 返回一个程序描述，不是执行 |
| `Effect.gen` + Generator | 用同步风格编写异步编排（`packages/core/src/session/runner/llm.ts:93`） |
| `yield*` 顺序组合 | 串联 Session → Agent → Model → History → Tool 的流水线 |
| succeed / fail / tryPromise | 成功/失败的显式建模；`snapshot.capture` 失败时的 `Effect.succeed(undefined)` |
| pipe 组合 | `llm.stream(request).pipe(Stream.runForEach(...), Effect.ensuring(...))` |
| 错误通道（E） | `RunError` 联合类型显式列出所有失败可能性 |
| `runPromise` | Effect 程序与 runtime（Node.js 进程）的连接点 |
| Stream | LLM 逐 token 流式响应的类型安全抽象 |

下一步：[[02-Layer与依赖注入]] 了解如何为 Effect 程序提供其所需的环境（R），以及 [[02-Fiber与Scope]] 了解并发控制和资源生命周期管理。
