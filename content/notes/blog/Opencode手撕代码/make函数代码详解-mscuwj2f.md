---
blog: true
title: "make函数代码详解"
slug: "make函数代码详解-mscuwj2f"
summary: "好的，这是整个 packages/core/src/system context/index.ts 里最核心的函数—— SystemContext.make ，它做了类型擦除、闭包预编译、三层数据结构嵌套三件事。我逐行讲解。 函数签名 泛型 ：调用者传入的 Source 有自己的值类型（ string 、 File[] 、 Skill[] ……）， A 就是这个类型 入参 ：一个完整的 Source ——包含 key、codec、loa"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "system-context部分的工作原理-mscuwjpc"
  - "轮询式比较的调用链和相关代码-mscuwjpq"
---

好的，这是整个 `packages/core/src/system-context/index.ts` 里最核心的函数——`SystemContext.make`，它做了类型擦除、闭包预编译、三层数据结构嵌套三件事。我逐行讲解。
## 函数签名
```ts
export function make<A>(source: Source<A>): SystemContext {
```
- **泛型 `<A>`**：调用者传入的 Source 有自己的值类型（`string`、`File[]`、`Skill[]`……），`A` 就是这个类型
- **入参**：一个完整的 `Source<A>`——包含 key、codec、load、baseline、update、removed
- **返回**：`SystemContext`——一个不透明类型。**`A` 消失了**，外部再也看不到这个 Source 的值是什么类型
## 预编译三个操作

```ts
const decode = Schema.decodeUnknownOption(source.codec)  // JSON → Option<A>
const encode = Schema.encodeSync(source.codec)            // A → JSON
const equivalent = Schema.toEquivalence(source.codec)     // (A, A) → boolean
```
**为什么要在函数开头做？** 因为一旦进了 `Effect.map` 的闭包，`source.codec` 还在作用域里，但这里把它"预编译"成三个纯函数，后续只调用它们，不碰 `codec`。这样做的效果是：三个辅助函数在每次 `make` 调用时派生一次，然后被下游闭包捕获——后续 `snapshot()`、`baseline()` 和 `compare()` 的每次调用都直接使用已派生好的函数，无需再接触 `codec`。

| 变量           | 类型                       | 作用                              |
| ------------ | ------------------------ | ------------------------------- |
| `decode`     | `(unknown) => Option<A>` | 把快照中的 JSON 还原为带类型的值，失败返回 `None` |
| `encode`     | `(A) => Json`            | 把当前值序列化为 JSON，存入快照              |
| `equivalent` | `(A, A) => boolean`      | 判断两个值是否"相等"                     |
## 包装成数组传给 `context()`
```ts
return context([
```
`context()` 是文件底部的私有函数 `context`：

```ts
function context(sources: ReadonlyArray<PackedSource>): SystemContext {
  return { [ContextTypeId]: sources }
}
```

它只是把 `PackedSource[]` 塞进一个对象，用 `Symbol` 做 key。**这就是"不透明类型"的实现方式**。`ContextTypeId` 实际是 `Symbol.for("@opencode/SystemContext")`，标注为 `unique symbol` 类型。

`unique symbol` 的作用是 **TypeScript 类型层面的隐藏**：不导出这个 symbol 的话，外部 TypeScript 代码无法在类型上引用它，也就无法直接构造 `SystemContext` 对象。但在运行时，任何代码都可以通过 `Symbol.for("@opencode/SystemContext")` 拿到完全相同的 symbol——`Symbol.for` 是一个全局注册表，用同一个字符串 key 就能检索到同一个 symbol 实例。因此这不是安全边界，而是**约定式的封装**：外部代码被引导通过 `combine`、`initialize`、`reconcile` 这些函数来操作 `SystemContext`，而不是直接构造。
## PackedSource 的第一个字段
```ts
{
  key: source.key,
```
`PackedSource` 的结构（`PackedSource` 接口定义）：

```ts
interface PackedSource {
  readonly key: Key
  readonly load: Effect.Effect<Loaded | Unavailable>
}
```
- `key` 直接透传——标识符不变
- `load` 是接下来要构造的核心：一个 Effect，执行后返回 `Loaded`（可比较的状态）或 `unavailable`（暂时获取不到）
## Effect 管道——load 然后 map
```ts
load: source.load.pipe(
  Effect.map((value) => {
```
- `source.load` 是用户定义的 `Effect<A | Unavailable>`
- `.pipe(Effect.map(...))` 对 load 的结果做变换
- `value` 是 load 的产出——要么是 `A`（正常值），要么是 `unavailable` 符号
## 如果获取失败，直接透传
```ts
if (isUnavailable(value)) return value
```

```ts
isUnavailable 函数：
function isUnavailable(value: unknown): value is Unavailable {
  return value === unavailable
}
```
如果 load 返回了 `unavailable` 符号，不做任何处理，直接原样返回。后续 `observe` 函数（`packages/core/src/system-context/index.ts` 中私有 `const observe`）会识别它为 `UnavailableEntry`，在 reconcile 时保留旧快照、不更新。

**这就是 stale-while-revalidate 的实现起点**——获取失败不是错误，只是"这次不更新"。
 
## 构造 `snapshot` 闭包

```ts
const snapshot = (): SourceSnapshot => ({
  value: encode(value),
  ...(source.removed ? { removed: requireText(source.key, "removal", source.removed(value)) } : {}),
})
```

这是一个**惰性求值的闭包**——不是在 `make()` 时执行，而是在后续 `baseline()` 或 `compare().render()` 被调用时才执行。

**做了什么**：
1. `encode(value)` — 把当前值序列化为 JSON，作为快照的 `value` 字段
2. 如果 Source 定义了 `removed` 渲染函数 → 预渲染移除消息文本，存入 `removed` 字段
3. 如果没定义 `removed` → 不包含 `removed` 字段（`SourceSnapshot` 中它是 optional 的）
**为什么要预渲染 `removed`？** 因为当 Source 被移除时，`load` 不会再返回它的值——所以必须在**它还活着的时候**提前渲染好"如果我被移除，告诉模型什么"。
`requireText`（`packages/core/src/system-context/index.ts` 中私有 `requireText` 函数）是一个安全检查——不允许渲染空字符串，防止把空内容发给模型。

## 构造 `baseline` 闭包——首次渲染

```ts
return {
  baseline: (): Rendered => ({
    text: requireText(source.key, "baseline", source.baseline(value)),
    snapshot: snapshot(),
  }),
```

`return` 的是什么？注意之后 `return { baseline: ... }` ——它返回的是一个 `Loaded` 对象（`Loaded` 接口定义）：

```ts
interface Loaded {
  readonly baseline: () => Rendered
  readonly compare: (previous: Schema.Json) => Compared
}
```

`baseline` 是一个**惰性求值闭包**：
- 调用 `source.baseline(value)` 把当前值渲染为模型可读的文本
- 同时调用 `snapshot()` 生成快照
- 返回 `{ text, snapshot }` ——文本给模型看，快照存数据库

**为什么 baseline 和 snapshot 要一起生成？** 因为它们必须对应同一个时刻的状态。不能出现 baseline 文本说"今天是 7/8"但快照里存的是"7/7"的情况。

---

## 构造 `compare` 闭包——比较逻辑

```ts
compare: (previous): Compared =>
  Option.match(decode(previous), {
```

`compare` 接收一个参数 `previous`：从数据库快照中取出的 **JSON 值**（不是 `A`）。

`decode(previous)` — 尝试把 JSON 还原为 `Option<A>`：
- 解码成功 → `Some<A>`
- 解码失败 → `None`（schema 变了）

---

## 解码失败 → 格式不兼容

```ts
onNone: (): Compared => ({ _tag: "Incompatible" }),
```

如果快照里的 JSON 无法解码为 `A`（比如 date 格式从 `"Jul 08"` 变成了 `"2026-07-08"`），返回 `Incompatible`。

**这会触发什么？** 在 `reconcileObservation()` 中：

```ts
if (compared._tag === "Incompatible") return { _tag: "Replace" }
```

`Incompatible` 会直接导致整轮 reconcile 返回 `Replace`，进而触发完整 baseline 重建，而不是增量更新。这是**schema 迁移的安全网**——宁可重建整个 System Prompt，也不要把格式错乱的数据发给模型。

---

## 解码成功 → 比较新旧值

```ts
onSome: (decoded): Compared =>
  equivalent(decoded, value)
    ? { _tag: "Unchanged" }
    : {
        _tag: "Updated",
        render: () => ({
          text: requireText(source.key, "update", source.update(decoded, value)),
          snapshot: snapshot(),
        }),
      },
```

- `decoded` — 从快照还原的旧值（类型 `A`）
- `value` — 当前 load 返回的新值（类型 `A`，在闭包中捕获）
- `equivalent(decoded, value)` — 判断是否相等

**两个分支**：

| 结果 | 含义 | 后续行为 |
|------|------|---------|
| `Unchanged` | 新旧值相等，什么都没变 | `reconcileObservation` 继续检查下一个 Source |
| `Updated` | 值变了 | 返回 `{ _tag: "Updated", render }` |

注意 `Updated` 里的 `render` 又是一个**惰性闭包**——只有在 reconcile 确认所有 Source 都比较完毕、确定要生成更新文本时，才调用 `render()`。此时：

1. `source.update(decoded, value)` — 渲染"从 A_old 变成 A_new"的文本
2. `snapshot()` — 生成新快照（用当前值）

---

## 闭合所有括号

```ts
              }),
          }
        }),
      ),
    },
  ])
}
```

结构和之前分析的一样——`context([{ key, load }])` 包装返回。

---

## 完整数据流示意

```
Source<A> ──make()──▶ SystemContext (A 消失了)
  │
  ├── key  →  直接透传
  ├── codec → 预编译: decode, encode, equivalent
  └── load  →  Effect.map 闭包捕获 value
                │
                ├─ unavailable → 透传（不处理）
                └─ A 类型的 value →
                     │
                     ├─ snapshot() 闭包:   encode(value) → JSON快照
                     ├─ baseline() 闭包:   source.baseline(value) → 文本 + 快照
                     └─ compare(prev) 闭包:
                          ├─ decode(prev) → None → Incompatible
                          └─ decode(prev) → Some(decoded) →
                               ├─ equivalent === true → Unchanged
                               └─ equivalent === false → Updated {
                                    render(): source.update(decoded, value) → 文本 + 快照
                                  }
```

## 总结：make() 做的三件事

| 做的事 | 怎么做的 | 为什么 |
|--------|---------|--------|
| **类型擦除** | `context([{...}])` 包装进 `{ [Symbol]: PackedSource[] }` | 不同类型 Source 可以放入同一个数组 |
| **闭包预编译** | `decode`/`encode`/`equivalent` 在函数开头闭包捕获 | 后续调用不需要碰 codec，纯函数调用 |
| **惰性渲染** | `baseline()` 和 `render()` 都是 thunk | 只有在"确定要生成文本"时才调用，避免浪费 |

---

## 导航

- 上一级：[[System Context部分的工作原理]] — System Context 概念总览
- 相关深潜：
  - [[observe代码详解]] — 并发加载所有 Source，产出 `Entry[]`
  - [[轮询式比较的调用链和相关代码]] — 五阶段 reconcile 流水线
