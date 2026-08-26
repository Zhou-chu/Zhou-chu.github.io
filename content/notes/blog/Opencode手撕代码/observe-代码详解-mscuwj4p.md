---
blog: true
title: "observe 代码详解"
slug: "observe-代码详解-mscuwj4p"
summary: "observe 代码详解 这个函数是 packages/core/src/system context/index.ts 中私有 const observe ——但它是\"轮询式比较\"的 执行起点 ——所有 Context Source 在这里被并发加载。 函数签名 value 的类型是 SystemContext ——还记得 make() 的返回值吗？它就是一个 { [ContextTypeId]: PackedSource[] } 。"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "system-context部分的工作原理-mscuwjpc"
  - "轮询式比较的调用链和相关代码-mscuwjpq"
---

# observe 代码详解

这个函数是 `packages/core/src/system-context/index.ts` 中私有 `const observe`——但它是"轮询式比较"的**执行起点**——所有 Context Source 在这里被并发加载。
## 函数签名
```ts
const observe = (value: SystemContext) =>
```
`value` 的类型是 `SystemContext`——还记得 `make()` 的返回值吗？它就是一个 `{ [ContextTypeId]: PackedSource[] }`。这里的 `value` 是 `combine()` 把多个 Source 拼在一起的结果，包含所有已注册的 Context Source。

这个函数是**私有的**（没有 `export`），只在 `initialize`、`reconcile`、`replace` 三个公开函数内部被调用。
## 拆出 PackedSource 数组

```ts
Effect.forEach(
  value[ContextTypeId],
```

`ContextTypeId` 是一个 `unique symbol`（`packages/core/src/system-context/index.ts` 中 `ContextTypeId` 定义）：

```ts
const ContextTypeId: unique symbol = Symbol.for("@opencode/SystemContext")
```

`value[ContextTypeId]` 取出的就是 `PackedSource[]`——在 `make()` 里通过 `context([...])` 包进去的那个数组。

**为什么用 Symbol 做 key？** TypeScript 侧的 `unique symbol` 把类型声明为不透明，外部代码无法通过类型系统访问 `SystemContext` 内部的 `PackedSource[]`。运行时使用的是 `Symbol.for("@opencode/SystemContext")`——注意 `Symbol.for` 是全局符号注册表，任何代码用相同字符串调用 `Symbol.for` 都能取回同一个 Symbol，所以它**不是安全边界**，只是约定级别的封装加上类型层面的隐藏。

---

### `Effect.forEach` 是干什么的？

```ts
Effect.forEach(
  array,        // 要遍历的数组
  callback,     // 对每个元素做什么 → 返回 Effect
  options       // 并发控制
)
```

它和 `Array.forEach` 的语义完全不同：

|     | `Array.forEach` | `Effect.forEach`                      |
| --- | --------------- | ------------------------------------- |
| 返回  | `void`          | `Effect<B[]>`——每个元素 callback 的结果组成的数组 |
| 执行  | 同步立即执行          | **描述**了对每个元素做什么，但没有执行                 |
| 并发  | 顺序执行            | 通过 `concurrency` 选项控制                 |

---

## 对每个 PackedSource 做什么

```ts
(source) =>
  source.load.pipe(
    Effect.map(
      (result): Entry =>
        result === unavailable
          ? { _tag: "Unavailable", key: source.key }
          : { _tag: "Available", key: source.key, ...result },
    ),
  ),
```

拆成三步理解。

---

### 取出 load Effect

```ts
source.load
```

`source` 是 `PackedSource`（`PackedSource` 接口定义）：

```ts
interface PackedSource {
  readonly key: Key
  readonly load: Effect.Effect<Loaded | Unavailable>
}
```

`source.load` 是在 `make()` 里构造的那个 Effect——它描述了"怎么加载这个 Source 的当前值"。注意它**还没有执行**，只是一个 Effect 值。

---

### 用 `.pipe()` 串联

```ts
.pipe(
```

`pipe` 是 Effect 的函数式组合方式。`a.pipe(b)` 等价于 `b(a)`——把 `a` 的值传给 `b` 处理。它不执行任何东西，只是在**构建更复杂的 Effect 描述**。

---

### `Effect.map` 转换加载结果

```ts
Effect.map(
  (result): Entry =>
    result === unavailable
      ? { _tag: "Unavailable", key: source.key }
      : { _tag: "Available", key: source.key, ...result },
),
```

`Effect.map` 对 Effect 的**成功值**做变换。这里的逻辑是：

| `source.load` 的结果 | `result` 的值                                     | 转换后                                             |
| ----------------- | ----------------------------------------------- | ----------------------------------------------- |
| 加载成功              | 一个 `Loaded` 对象（带 `baseline()` 和 `compare()` 闭包） | `{ _tag: "Available", key, baseline, compare }` |
| loader 返回 `unavailable` | `unavailable` 符号（loader 主动返回的哨兵值，不是 throw/defect） | `{ _tag: "Unavailable", key }`                  |

**`unavailable` 是哨兵值**：`result === unavailable` 检查的是 loader 主动返回的一个**值**。它和 Effect 的 failure channel（`Effect.fail`）或 defect（未捕获异常）是两回事。`instruction-context.ts` 的做法是：loader 内部用 `Effect.catch` 和 `Effect.catchDefect` 把真正的异常和缺陷**捕获后转换成** `unavailable` 哨兵值，这样上游的 `observe` 永远只看到一个干净的 `Available | Unavailable` 联合，不会因为一个 Source 挂了就把整个 Effect 管道炸掉。

转换后返回的是 `Entry` 类型（`Entry` 型别定义）：

```ts
type Entry = AvailableEntry | UnavailableEntry

interface AvailableEntry extends Loaded {
  readonly _tag: "Available"
  readonly key: Key
  // 继承自 Loaded: baseline(), compare()
}

interface UnavailableEntry {
  readonly _tag: "Unavailable"
  readonly key: Key
}
```

**注意 `...result` 展开**：当 `result` 是 `Loaded` 时，`...result` 把 `baseline()` 和 `compare()` 两个闭包**摊平**到 `AvailableEntry` 上。`AvailableEntry` 通过 `extends Loaded` 声明了这两个方法，展开正好对上。

---

### `_tag` 的作用

`_tag` 是 Effect Schema 生态里的**判别字段**——类似 Redux action 的 `type`。后续代码用 `entry._tag === "Unavailable"` 做类型收窄：

```ts
if (entry._tag === "Unavailable") {
  // TypeScript 知道这里 entry 是 UnavailableEntry——只有 key，没有 baseline/compare
  snapshot[entry.key] = stored  // 保留旧快照
  continue
}
// TypeScript 知道这里 entry 是 AvailableEntry
const rendered = entry.baseline()  // ✅ 可以安全调用
```

---

## 并发控制

```ts
{ concurrency: "unbounded" },
```

这是 `Effect.forEach` 的第三个参数——**并发策略**。

| 值 | 含义 |
|---|---|
| `"unbounded"` | 不限并发数——Effect 把所有 callback 都 spawn 成并发 fiber，由运行时协作式调度 |
| `1` | 顺序执行，一个完成再启动下一个 |
| `5` | 最多同时 5 个并发 fiber |

**为什么这里选 `"unbounded"`？** 因为每个 Source 的 `load` 是独立的——date Source 读系统时钟、AGENTS.md Source 读文件、skills Source 查 agent 配置——它们互不依赖、互不阻塞。用 unbounded 并发让 I/O 重叠，获得最短总耗时。

**并发 ≠ 并行**：这里用 `concurrency: "unbounded"` 是**并发 fiber**，不是并行 CPU 执行。在普通的单线程 JS 运行时里，fiber 之间是协作式调度——每个 fiber 运行到 I/O 边界时主动让出，让另一个 fiber 继续。所以多个 Source 的文件读取可以**重叠 I/O 等待**，但 CPU 计算不会真的同时跑。

```
时间线（unbounded，I/O 重叠）：
────────────────────────────────▶
date Source:        ██ 2ms
environment Source: ██ 2ms
instructions Source:     ████████ 200ms (读文件)
skills Source:           ████ 50ms
────────────────────────────────▶
总耗时 ≈ 200ms（最长的那个——I/O 等待被重叠了）
```

---

## 返回值：`Entry[]` 的类型

`observe` 的完整返回类型：

```ts
const observe: (value: SystemContext) => Effect.Effect<ReadonlyArray<Entry>>
```

注意返回值**不是** `Entry[]`，而是 `Effect<Entry[]>`——这**仍然是菜谱**，不是菜。只有在外层 `yield* observe(value)` 时，所有 Source 的 `load` 才真正并发执行。

---

## 与 `Source.load` 的区别

容易混淆的两个 `load`：

| | `Source.load` | `observe`（`packages/core/src/system-context/index.ts` 中私有 `const observe`） |
|---|---|---|
| 定义位置 | 用户定义，在 `make()` 里被包装 | `packages/core/src/system-context/index.ts`，系统内部，私有 `const observe` |
| 作用 | 加载**一个** Source 的当前值 | 加载**所有** Source 的当前值 |
| 返回 | `Effect<A \| Unavailable>` | `Effect<Entry[]>` |
| 并发 | 单 Source 自己决定 | 所有 Source 之间 `"unbounded"` |

---

## 为什么叫 `observe`？

因为它的行为和"观察"一致：**看一眼所有 Source 的当前状态，返回一个结构化的快照，但不改变任何东西。**

- 不修改数据库
- 不发布事件
- 不决定"变没变"（那是 `reconcile` 的事）
- 只是把每个 Source 的"现在是啥"采集回来

`reconcile` 拿这个 `Entry[]` 和数据库里的 `Snapshot` 比较，才决定要不要更新。

---

## 导航

- 上一级：[[System Context部分的工作原理]] — System Context 概念总览
- 相关深潜：
  - [[make函数代码详解]] — `make()` 闭包如何把 `Source<A>` 包装为 `PackedSource`
  - [[轮询式比较的调用链和相关代码]] — `observe` 如何接入五阶段 reconcile 流水线
