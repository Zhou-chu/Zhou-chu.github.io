---
blog: true
title: "System Context Algebra — 系统上下文的代数模型"
slug: "system-context-algebra-系统上下文的代数模型-mscun0ij"
summary: "树节点：06 Context Source与Registry 父节点：Opencode的工作原理 子节点：06 Baseline与Snapshot | 06 Mid Conversation更新 System Context Algebra — 系统上下文的代数模型 System Context 是 OpenCode 用于管理 可独立刷新、类型安全的系统上下文源 的代数模型。它解决了 LLM agent 一个核心问题：如何让对话中的环境"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：06-Context-Source与Registry
> 父节点：[[Opencode的工作原理]]
> 子节点：[[06-Baseline与Snapshot]] | [[06-Mid-Conversation更新]]

# System Context Algebra — 系统上下文的代数模型

System Context 是 OpenCode 用于管理**可独立刷新、类型安全的系统上下文源**的代数模型。它解决了 LLM agent 一个核心问题：如何让对话中的环境信息（日期、项目路径、可用技能、AGENTS.md 指令等）在变化时被**增量感知**，而不是每次全文重发。

---

## 核心设计理念

- **Source\<A\>**：描述一个域类型的"如何观测、比较、渲染"。
- **SystemContext**：关闭类型参数后的**不透明载体**，不同类型 Source 可以通过 `combine` 统一组合。
- **Snapshot**：每个 Source 的**持久比较状态**（JSON 编码后的值 + 可选的 removal 文本），用于增量检测变化。
- **Generation**：一个 Context Epoch 的完整**不可变基线**。

文件：`packages/core/src/system-context/index.ts:1-19`（模块文档注释）

---

## Key — 命名空间键

`packages/core/src/system-context/index.ts:21-25`

```ts
export const Key = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*$/)
).pipe(Schema.brand("SystemContext.Key"))
```

- 格式：`namespace/name`，如 `core/environment`、`core/date`、`core/instructions`、`core/skill-guidance`
- 由 `Key.make("core/environment")` 构造
- 注册表据此去重——同 Key 不可重复注册

---

## unavailable 符号

`packages/core/src/system-context/index.ts:28-29`

```ts
export const unavailable = Symbol.for("@opencode/SystemContext.Unavailable")
```

`load` 可返回 `A | Unavailable`。返回 `unavailable` 表示**暂时无法观测**（如 AGENTS.md 读到一半），与源被移除不同：
- **Reconcile 时**：保留上次 Snapshot，不做变更（stale-while-revalidate）
- **Initialize / Replace 时**：阻塞等待

---

## Source\<A\> 接口

`packages/core/src/system-context/index.ts:32-39`

```ts
export interface Source<A> {
  readonly key: Key
  readonly codec: Schema.Codec<A, Schema.Json, never, never>
  readonly load: Effect.Effect<A | Unavailable>
  readonly baseline: (current: A) => string
  readonly update: (previous: A, current: A) => string
  readonly removed?: (previous: A) => string
}
```

| 字段 | 作用 |
|------|------|
| `key` | 唯一标识，用于去重与快照匹配 |
| `codec` | JSON 编解码器，用于 Snapshot 持久化 + 等价比较 |
| `load` | Effectful 加载，可返回不可用 |
| `baseline(current)` | 首次渲染：当前值 → 模型可见文本 |
| `update(previous, current)` | 增量渲染：旧值 + 新值 → 模型可见文本 |
| `removed(previous)?` | 移除渲染：旧值 → 告知模型的移除消息 |

**关键约束** (`index.ts:309-312`)：所有渲染文本不得为空字符串。

---

## SystemContext — 不透明载体

`packages/core/src/system-context/index.ts:43-46`

```ts
export interface SystemContext {
  readonly [ContextTypeId]: ReadonlyArray<PackedSource>
}
```

它是 `PackedSource[]` 的标记包装，内部结构仅 `make` / `combine` / `observe` 访问。

---

## make\<A\>(source) — 关闭类型

`packages/core/src/system-context/index.ts:135-173`

核心流程：
1. 从 `codec` 派生出 `decode`、`encode`、`equivalent` 三个工具
2. `load` 被 map：若 `unavailable` 则透传；否则构建 `Loaded` 对象
3. `Loaded` 包含 `baseline()` 和 `compare(previous)`：
   - `compare`：用 `decode(previous)` 反序列化 → `equivalent` 比较 → 返回 `Unchanged` / `Incompatible` / `Updated`
   - `Updated` 时调用 `source.update(decoded, value)` 生成增量文本

---

## combine(values) — 合并上下文

`packages/core/src/system-context/index.ts:176-180`

```ts
export function combine(values: ReadonlyArray<SystemContext>): SystemContext {
  const sources = values.flatMap((value) => value[ContextTypeId])
  assertUniqueKeys(sources)
  return context(sources)
}
```

- 展平所有 source → 去重键检查
- 重复 Key → 抛出 `DuplicateKeyError`（`index.ts:91-97`）

---

## 内部状态机

### PackedSource → Entry → 多分支处理

`packages/core/src/system-context/index.ts:99-129`

```
PackedSource { key, load }
  → observe() → Entry
    AvailableEntry { _tag: "Available", key, baseline(), compare() }
    UnavailableEntry { _tag: "Unavailable", key }

compare(previous) → Compared
  { _tag: "Incompatible" }  // decode 失败 → 触发 full replacement
  { _tag: "Unchanged" }     // 等价 → 保留旧 snapshot
  { _tag: "Updated", render } // 已变化 → 调用 render() 生成新文本
```

---

## initialize() / reconcile() / replace()

见 [[06-Baseline与Snapshot]]

---

## 注册表 — SystemContextRegistry

`packages/core/src/system-context/registry.ts:1-49`

```ts
export interface Interface {
  readonly register: (entry: Entry) => Effect<void, never, Scope>
  readonly load: () => Effect<SystemContext>
}
```

- 基于 `Ref<Entry[]>` 的动态列表
- `register`：Scope 绑定，自动 acquire/release
- `load`：按 Key 排序 → `SystemContext.combine(...)` 组合所有已注册源

---

## 内置源 — core/environment + core/date

`packages/core/src/system-context/builtins.ts:1-50`

以 `"core/builtins"` 为注册 Key，内含两个 Source：

| Key | 内容 | baseline 示例 |
|-----|------|--------------|
| `core/environment` | 工作目录、项目根、git 状态、平台 | `<env> Working directory: /xxx ...</env>` |
| `core/date` | `DateTime.nowAsDate` | `Today's date: Mon Jul 27 2026` |

---

## core/instructions — AGENTS.md 发现

`packages/core/src/instruction-context.ts:1-101`

- Key：`"core/instructions"`
- `observe()` (`instruction-context.ts:40-74`)：
  1. 从 `location.directory` 向上到 `location.project.directory` 发现 `AGENTS.md`
  2. 同时读取 `global.config/AGENTS.md`
  3. 若 project 内文件读到中途失败 → 返回 `unavailable`（stale-while-revalidate）
- `render()`：格式为 `Instructions from: <path>\n<content>`
- `update()`：`"These instructions replace all previously loaded ambient instructions.\n\n..."`
- `removed()`：`"Previously loaded instructions no longer apply."`

---

## core/skill-guidance — 可用技能列表

`packages/core/src/skill/guidance.ts:1-76`

- Key：`"core/skill-guidance"`
- 动态：根据 Agent selection 的 permissions 过滤可用技能
- 若所有技能被 deny → 返回 `SystemContext.empty`

---

## core/reference-guidance — 项目引用

`packages/core/src/reference/guidance.ts:1-69`

- Key：`"core/reference-guidance"`
- 仅列出有 description 的 reference
- 空列表 → 返回 `SystemContext.empty`

---

## 关键文件索引

| 文件 | 行数 | 内容 |
|------|------|------|
| `packages/core/src/system-context/index.ts` | 1–320 | 核心代数 |
| `packages/core/src/system-context/registry.ts` | 1–49 | 动态注册表 |
| `packages/core/src/system-context/builtins.ts` | 1–50 | core/environment + core/date |
| `packages/core/src/instruction-context.ts` | 1–101 | AGENTS.md 发现 |
| `packages/core/src/skill/guidance.ts` | 1–76 | 技能引导 |
| `packages/core/src/reference/guidance.ts` | 1–69 | 引用引导 |
