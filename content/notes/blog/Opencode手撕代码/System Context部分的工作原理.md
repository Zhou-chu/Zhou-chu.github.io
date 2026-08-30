---
blog: true
title: "System Context部分的工作原理"
slug: "system-context部分的工作原理-mscuwjpc"
summary: "这一部分主要内容就是负责整理环境信息，处理得到System Prompt，进而将其作为Baseline，在整个Epoch内部这个System Prompt都不变。 好，这个问题的答案正是 OpenCode 设计中最精妙的地方。让我从\"朴素做法的问题\"讲起，再逐步展开 OpenCode 的机制。 这一部分对应的原码有： packages/core/src/system context/builtins.ts packages/core/s"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "make函数代码详解-mscuwj2f"
  - "轮询式比较的调用链和相关代码-mscuwjpq"
  - "prepareonce-的四个出口-mscuwj40"
---

这一部分主要内容就是负责整理环境信息，处理得到System Prompt，进而将其作为Baseline，在整个Epoch内部这个System Prompt都不变。
好，这个问题的答案正是 OpenCode 设计中最精妙的地方。让我从"朴素做法的问题"讲起，再逐步展开 OpenCode 的机制。
这一部分对应的原码有：
+ `packages/core/src/system-context/builtins.ts`
+ `packages/core/src/system-context/index.ts`
## 一、朴素的 System Prompt：一根大字符串
几乎所有 AI 应用的做法都一样——在调 LLM 之前，把环境信息拼成一个字符串塞进 `system` 字段：
```ts
// ❌ 朴素做法
function buildSystemPrompt() {
  return `
    You are on ${os.platform()}.
    Working directory: ${cwd}.
    Today's date: ${new Date().toDateString()}.
    Available tools: bash, read, write, grep.
    ${readFile("AGENTS.md")}
  `.trim()
}

// 每次调 LLM 前调用一次
const request = { system: buildSystemPrompt(), messages: [...] }
```
**这会产生什么问题？**

| 问题            | 为什么                                                                         |
| ------------- | --------------------------------------------------------------------------- |
| **文本不可比较**    | 你不知道"什么变了"——日期变了？目录变了？还是 AGENTS.md 改了？只能把整段文本重新发给模型                         |
| **LLM 缓存失效**  | 哪怕只是一个字母变了（比如日期从 "Jul 07" 变成 "Jul 08"），整个 System Prompt 的 prompt cache 全部作废 |
| **没有增量更新**    | 你想告诉模型"刚才说的那个东西变了"，只能在 Messages 里手动插入 system 消息——但你没有机制判断"有没有变"             |
| **无法跨进程/跨重启** | 进程重启后，你不知道上次发给模型的是什么状态                                                      |
| **硬编码耦合**     | 每增加一种上下文来源（skills、reference、plugin context），就要修改拼接代码                        |

## 二、OpenCode 的做法：把上下文建模为"可比较的值"
OpenCode 的核心思路是：**不关心上下文的内容是什么，只关心三个操作——如何获取、如何比较、如何渲染**。
```
ContextSource<A>  →  SystemContext  →  Snapshot（JSON快照）
    │                    │                    │
    │ .load()            │ combine()          │ reconcile(当前值, JSON快照)
    │ .baseline()        │ initialize()       │ → Unchanged / Updated
    │ .update()          │ reconcile()
```
### 2.1 一个 Context Source 长什么样

从源码 `packages/core/src/system-context/index.ts` 中 `Source<A>` 接口定义：

```ts
interface Source<A> {
  readonly key: Key           // ① 唯一标识，如 "core/date"
  readonly codec: Codec<A>    // ② JSON 编解码器——用于"比较"
  readonly load: Effect.Effect<A | Unavailable>    // ③ 获取当前值；返回 Unavailable 时触发 stale-while-revalidate
  readonly baseline: (current: A) => string   // ④ 首次出现时怎么渲染
  readonly update: (previous: A, current: A) => string  // ⑤ 变化时怎么渲染
  readonly removed?: (previous: A) => string  // ⑥ 被移除时怎么渲染
}
```

每一个 Source 是**自描述的**——它知道自己的值怎么获取、怎么比较、变化了怎么告诉模型。

这里需要区分两层概念：

- **`Source<A>`（公开契约）**：Source 的编写者（如 `builtins.ts`）只需提供如何 `load`、`baseline`、`update`、`removed`。`load` 可以返回 `A`（正常值）或 `Unavailable` —— 一个 Sentinel 符号，表示"暂时读不到，但不要当删除处理"。
- **`PackedSource`（内部封装）**：`make()` 把 `Source<A>` 包裹后，`load` 内部变成 `Effect.Effect<Loaded | Unavailable>`。`Loaded` 携带了 `baseline()` 和 `compare(prev)` 方法 —— 这是 `Source<A>` 看不到的内部表示，比较逻辑由 `codec` 自动生成。

**公开契约**只管"获取一个值"，**内部封装**才负责"和上次比有什么变化"。

另外，重复 key 的检测有两层：

1. **Registry 条目 key**：注册时如果已有同名 key → 直接 `Effect.die`，因为同一个作用域不应该注册两次同一个条目。
2. **Source key（`combine()` 内）**：合并多个 `SystemContext` 时，如果两个 `PackedSource` 携带相同的 key → 抛出 `DuplicateKeyError`。这两个检查保护的是不同层面 —— 一个是注册表的唯一性，一个是运行时组合的唯一性。

### 2.2 具体例子：date Source

在 `packages/core/src/system-context/builtins.ts` 中，`builtIns` 包含 date Source 的定义：

```ts
SystemContext.make({
  key: "core/date",
  codec: Schema.toCodecJson(Schema.String),   // 值类型是 string
  load: DateTime.nowAsDate.pipe(Effect.map(d => d.toDateString())),  // "Jul 07 2026"
  baseline: (date) => `Today's date: ${date}`,          // 首次渲染
  update: (_prev, date) => `Today's date is now: ${date}`,  // 变化渲染
})
```

---

## 三、机制一：类型擦除——不同 Source 可以统一组合

这是 `make()` 函数做的最关键的事（`packages/core/src/system-context/index.ts` 中 `make` 函数）。
[[make函数代码详解]]
```typescript
/** Closes a typed source into a context that composes with differently typed sources. */
export function make<A>(source: Source<A>): SystemContext {
  const decode = Schema.decodeUnknownOption(source.codec)//JSON -> A
  const encode = Schema.encodeSync(source.codec)// A -> JSON
  const equivalent = Schema.toEquivalence(source.codec)// A = A ?
  return context([
    {
      key: source.key,
      load: source.load.pipe(
        Effect.map((value) => {
          if (isUnavailable(value)) return value
          const snapshot = (): SourceSnapshot => ({
            value: encode(value),
            ...(source.removed ? { removed: requireText(source.key, "removal", source.removed(value)) } : {}),
          })
          return {
            baseline: (): Rendered => ({
              text: requireText(source.key, "baseline", source.baseline(value)),
              snapshot: snapshot(),
            }),
            compare: (previous): Compared =>
              Option.match(decode(previous), {
                onNone: (): Compared => ({ _tag: "Incompatible" }),
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
              }),
          }
        }),
      ),
    },
  ])
}
```
`Source<string>` (date) 和 `Source<File[]>` (AGENTS.md) 是不同的类型——你没法把它们放进同一个数组。但 `make()` 把它们都变成了**相同的不透明类型** `SystemContext`：

```
Source<string>  ──make()──▶  PackedSource { key, load: Effect<Loaded | Unavailable> }
Source<File[]>  ──make()──▶  PackedSource { key, load: Effect<Loaded | Unavailable> }
                                   │
                                   ▼
                          SystemContext.combine([...])
                                   │
                                   ▼
                        一个统一的 SystemContext（外部看不到里面有什么）
```

`make()` 内部构建了一个三层嵌套：

```
PackedSource { key, load: Effect<Loaded | Unavailable> }
     │
     └── load 执行后变成 ──→
     
Loaded { baseline: () => Rendered, compare: (prev: JSON) => Compared }
     │
     ├── baseline() → Rendered { text, snapshot }
     │
     └── compare(prev) → Compared
           ├── Unchanged
           ├── Updated { render: () => Rendered }
           └── Incompatible → 触发 replace
```

**关键**：`compare` 接收的是 `JSON`（不是 `A`），内部通过 `codec.decode(prev)` 还原为 `A`，再用 `Schema.toEquivalence(codec)` 比较。比较逻辑被封装在闭包里，外层完全不知道值类型。

---

## 四、机制二：轮询式比较（不是事件驱动）
[[轮询式比较的调用链和相关代码]]
这是最容易被误解的地方。Context Source **不会主动通知**"我变了"。它只是在 Safe Provider-Turn Boundary 被**惰性采样**。

从 `packages/core/src/session/context-epoch.ts` 中 `prepareOnce`：

```ts
const [value, stored, compaction] = yield* Effect.all(
  [context, find(db, sessionID), latestCompaction(db, sessionID)],
  { concurrency: "unbounded" }  // 三个操作并发执行
)

// 首次调用：initialize 生成全新 baseline
if (!stored) {
  const generation = yield* SystemContext.initialize(value)
  const baselineSeq = yield* insert(db, sessionID, generation)
  return { baseline: generation.baseline, baselineSeq }
}

// 日常调用：reconcile 比较当前值和数据库快照
const result = yield* SystemContext.reconcile(value, snapshot)
```

`reconcile()` 做的事（`packages/core/src/system-context/index.ts` 中 `reconcileObservation`）：遍历每一个 Source，取出它的当前 `Loaded.compare(快照中的 JSON 值)`：

- **Unchanged** → 什么也不做
- **Updated** → 调用 `source.update(old, new)` 渲染增量文本，拼入 Mid-Conversation System Message
- **Incompatible** → 旧快照无法解码（schema 变了），触发完整 Replace
- **Source 是新的**（快照里没有）→ 调用 `source.baseline()` 渲染首次文本
- **Source 被移除** → 调用 `source.removed()` 渲染移除消息

### 为什么是轮询式而不是事件驱动？

| | 事件驱动 | 轮询式（OpenCode 的做法） |
|---|---|---|
| 触发时机 | 值变化时立即通知 | Safe Provider-Turn Boundary 惰性检查 |
| 中间状态 | 产生大量中间更新（如目录反复切换） | 只在"马上要调 LLM"时取一次快照 |
| 一致性 | 多次变化可能发送不一致的状态序列 | 保证发给模型的是一致、最新的状态 |

### 处理 Unavailable：三种操作的不可用策略

当 Source 的 `load` 返回 `Unavailable` 时，`initialize`、`reconcile`、`replace` 的行为各不相同：

| 操作 | 新 Source（无历史快照）返回 Unavailable | 已有 Source（存在历史快照）返回 Unavailable |
|---|---|---|
| **initialize** | `InitializationBlocked` —— 首次生成 baseline 不允许有任何 Source 不可用 | 同左（initialize 只看当前，不确定有无历史） |
| **reconcile** | 静默跳过 —— 不渲染增量文本，也不写入 snapshot | **保留旧快照**（stale-while-revalidate）—— 不产生变化消息 |
| **replace** | 静默跳过 —— 新 baseline 中不包含该 Source | **`ReplacementBlocked`** —— 之前承认过的 Source 突然不可用，不允许用不完整的 baseline 覆盖 |

这里的关键区分是：**一个新的、从未被承认的 Source 暂时不可用，不应该阻止系统继续运行；但一个已经被承认过的 Source 突然不可用，说明环境发生了变化，不应该悄无声息地丢弃它。**

（`replace` 的这个"新 vs 已有"判断来自 `replaceObservation`：`entry._tag === "Unavailable" && getSnapshot(previous, entry.key) !== undefined`。）

### 指令上下文（`core/instructions`）的特殊行为

`core/instructions` 是 `SystemContextRegistry` 的一个注册条目，由 `InstructionContext` 实现（`instruction-context.ts`）。它的 `observe` 扫描 `AGENTS.md` 文件时有三种情况：

- **零个文件** → 返回 `SystemContext.empty`，渲染为移除消息 "Previously loaded instructions no longer apply."
- **发现文件但不可读** → 返回 `SystemContext.unavailable`，触发上方表格的 Unavailable 策略
- **生产者错误/缺陷** → `Effect.catch` 和 `Effect.catchDefect` 将异常转换为 `unavailable`，确保错误不会使整个 Session 崩溃

---

## 五、机制三：Baseline vs Mid-Conversation Message——利用缓存前缀的增量更新

这是 OpenCode 上下文管理**最精妙的设计决策**。

```
Context Epoch 开始
  │
  ├─ SystemContext.initialize()
  │   → 所有 Source 调用 baseline()
  │   → 拼成 Baseline System Context（全量文本）
  │   → 作为 System Prompt 发给 LLM
  │   → 写入 session_context_epoch 表（baseline + snapshot）
  │
  │  ═══════════ Epoch 内，baseline 不变 ═══════════
  │
  ├─ Safe Boundary #1: reconcile → Updated
  │   → Source.update(old, new) → 渲染一句话
  │   → 作为 Mid-Conversation System Message 插入 Messages 流
  │   → LLM 看到: "Today's date is now: Jul 08 2026"
  │   → ⚡ Baseline 不变 —— 对于支持 prompt caching 的提供商，缓存前缀可以继续命中
  │
  ├─ Safe Boundary #2: reconcile → Unchanged
  │   → 什么都不做
  │
  │  ═══════════ Compaction 发生 ═══════════
  │
  └─ 新 Context Epoch 开始
      → SystemContext.replace()
      → 所有 Source 重新 baseline() → 新的全量文本
      → 新的 System Prompt
```

**关键**：在一个 Epoch 内，System Prompt 永远不变。变化以 system 消息的形式追加到对话流中。对于支持 prompt caching 的提供商，稳定的 baseline 允许缓存前缀被复用。只有当 Compaction（对话压缩）发生后，才生成全新的 baseline。

从 `packages/core/src/session/context-epoch.ts` 中 `prepareOnce` 的 compaction 感知逻辑：

```ts
const replacementSeq = compaction !== undefined 
  && compaction.seq > stored.baseline_seq 
  ? compaction.seq : undefined

const result = replacementSeq
  ? yield* SystemContext.replace(value, snapshot)  // compaction 后 → 替换 baseline
  : yield* SystemContext.reconcile(value, snapshot) // 日常 → 增量比较
```

---

## 六、机制四：Snapshot——持久化的比较基准

Snapshot 不是给模型看的，它是**比较基准**。存储在 `session_context_epoch` 表的 `snapshot` 字段：

```ts
// 格式：Record<Key, { value: JSON, removed?: string }>
{
  "core/environment": { "value": "\"<env>\\n  Working directory: /project\\n</env>\"" },
  "core/date":        { "value": "\"Jul 07 2026\"" },
  "core/instructions": { "value": "[{\"path\":\"...\",\"content\":\"...\"}]", "removed": "Previously loaded instructions no longer apply." }
}
```

**为什么存 JSON 而不是原始值？**
- JSON 可以**跨进程**比较（数据库里的值 vs 当前进程加载的值）
- JSON 可以**跨重启**比较（进程重启后从数据库读出，和当前值 reconcile）
- 不需要泛型——`Snapshot` 是 `Record<string, {value: Json}>`，任何 Source 的快照格式都一样

---

## 七、完整机制串联：一次 LLM 请求的上下文准备

```
Runner（llm.ts）
  │
  ├─ loadSystemContext(agent)
  │   ├─ registry.load()       → 所有注册的 ContextSource（含 core/environment、core/date、core/instructions 及其他条目）
  │   ├─ SkillGuidance.load()  → 当前 agent 的 skills（由 Runner 单独组装）
  │   ├─ ReferenceGuidance.load() → 项目引用（由 Runner 单独组装）
  │   └─ SystemContext.combine(三个结果)
  │
  ├─ ContextEpoch.prepare(context, sessionID)
  │   ├─ 并发获取: context值 + 数据库stored + latestCompaction
  │   ├─ stored 不存在?
  │   │   → initialize → 全新 baseline + snapshot → insert DB
  │   ├─ compaction 之后?
  │   │   → replace → 新 baseline + 新 snapshot → update DB
  │   ├─ 日常: reconcile
  │   │   ├─ Unchanged → 返回旧 baseline（对于支持 prompt caching 的提供商，缓存前缀可复用）
  │   │   └─ Updated → 发 ContextUpdated 事件（生成 system message）+ 返回旧 baseline
  │   └─ 返回 { baseline, baselineSeq }
  │
  ├─ LLM.request({
  │   system: [agent.system, baseline],    ← baseline 作为 System Prompt
  │   messages: [...filteredHistory],       ← 过滤后的对话（含 system message）
  │   tools: [...toolDefinitions]
  │ })
  │
  └─ baselineSeq → 过滤 history 中已被合入 baseline 的旧 system 消息
```

---

## 八、总结：朴素做法 vs OpenCode

| 维度        | 朴素做法               | OpenCode                             |
| --------- | ------------------ | ------------------------------------ |
| **上下文来源** | 硬编码拼接              | 每个 Source 独立注册，自描述                   |
| **变化检测**  | 无——每次都是新的          | JSON codec 比较 + reconcile            |
| **更新方式**  | 全量替换 System Prompt | Baseline 不变 + system 消息增量            |
| **缓存友好**  | 否——任何变化都破坏 cache   | 取决于提供商——Epoch 内 baseline 不变，支持 prompt caching 的提供商可以利用这一点 |
| **跨进程**   | 无状态                | Snapshot 持久化到 SQLite                 |
| **扩展性**   | 加来源 = 改拼接代码        | 加来源 = 注册一个 ContextSource             |
| **失败处理**  | 无                  | Unavailable → stale-while-revalidate |
| **可测试**   | 难以隔离               | 每个 Source 独立，替换 Layer 即可测试           |

> **一句话**：OpenCode 把"拼字符串"变成了"管理一组类型化键值对的代数"——每个键值对知道如何获取自己、如何比较自己、如何向模型描述自己的变化。组合它们不需要知道它们是什么类型，比较它们不需要理解它们的内容。

---

## 导航

- 上一级：[01-system-context.md](01-system-context.md) — System Context 参考架构
- 相关深潜：
  - [[make函数代码详解]] — `make()` 的类型擦除与闭包预编译
  - [[observe代码详解]] — 并发加载所有 Source
  - [[轮询式比较的调用链和相关代码]] — 五阶段 reconcile 流水线
  - [[prepareOnce 的四个出口]] — Context Epoch 准备阶段的四个出口
