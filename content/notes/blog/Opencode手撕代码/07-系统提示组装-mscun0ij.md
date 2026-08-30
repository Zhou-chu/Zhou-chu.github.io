---
blog: true
title: "07-系统提示组装"
slug: "07-系统提示组装-mscun0ij"
summary: "树节点：07 系统提示组装 父节点：07 消息结构与角色 子节点：无 07 系统提示组装 OpenCode 的 system prompt 由 两部分拼接 而成：Agent 的静态 system 文本 动态的上下文基线（baseline）。上下文基线由多个 Context Source 并行加载后合并生成。 一、组装入口： loadSystemContext() 三个输入 并发加载 （ concurrency: \"unbounded\" "
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "07-消息结构与角色-mscun0k4"
---

> 树节点：07-系统提示组装
> 父节点：[[07-消息结构与角色]]
> 子节点：无

# 07-系统提示组装

OpenCode 的 system prompt 由**两部分拼接**而成：Agent 的静态 system 文本 + 动态的上下文基线（baseline）。上下文基线由多个 Context Source 并行加载后合并生成。

---

## 一、组装入口：`loadSystemContext()`

```typescript
// packages/core/src/session/runner/llm.ts:168-171
const loadSystemContext = (agent: AgentV2.Selection) =>
  Effect.all([systemContext.load(), skillGuidance.load(agent), referenceGuidance.load()], {
    concurrency: "unbounded",
  }).pipe(Effect.map(SystemContext.combine))
```

三个输入**并发加载**（`concurrency: "unbounded"`），然后通过 `SystemContext.combine` 合并为一个 `SystemContext`：

| 序号 | 来源 | 接口 | 文件位置 |
|------|------|------|----------|
| 1 | `systemContext.load()` | 全局 System Context Registry | `packages/core/src/system-context/registry.ts` |
| 2 | `skillGuidance.load(agent)` | 当前 Agent 的可用 Skill 列表 | `packages/core/src/skill/guidance.ts:46-69` |
| 3 | `referenceGuidance.load()` | 项目 References 列表 | `packages/core/src/reference/guidance.ts:40-62` |

### SystemContext.combine 实现

```typescript
// packages/core/src/system-context/index.ts:176-180
export function combine(values: ReadonlyArray<SystemContext>): SystemContext {
  const sources = values.flatMap((value) => value[ContextTypeId])
  assertUniqueKeys(sources)  // 拒绝重复 key
  return context(sources)
}
```

简单地将所有 context carriers 的 packed source 数组平铺合并，检查 key 唯一性后返回。

---

## 二、进入 LLMRequest

组装后的 `SystemContext` 经过 `SessionContextEpoch.initialize()` 产生 `Generation { baseline, snapshot }`，最终进入 `LLMRequest`：

```typescript
// packages/core/src/session/runner/llm.ts:197-214
const system =
  initialized ?? (yield* SessionContextEpoch.prepare(db, events, loadSystemContext(agent), session.id))

const request = LLM.request({
  model,
  system: [agent.info?.system, system.baseline]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .map(SystemPart.make),
  messages: [...toLLMMessages(context, model), ...],
  tools: toolMaterialization?.definitions ?? [],
  ...
})
```

关键逻辑：
- `agent.info?.system`：Agent 定义的**静态 system prompt**，来自配置文件
- `system.baseline`：所有 Context Source 的 **baseline 文本拼接**（见下文）
- 两者通过 `.filter(falsy)` + `.map(SystemPart.make)` 转为 `SystemPart[]` 数组
- 最终作为 `LLMRequest.system` —— **初始特权前缀**（区别于 `Message.system()` 的时间线版本）

---

## 三、Agent 的静态 System Prompt

Agent 定义在 `packages/core/src/agent.ts`，其 `Info` 类型（来自 `@opencode-ai/schema/agent`）包含 `system` 字段：

```typescript
// agent.ts:14
export const Info = Agent.Info
export type Info = Agent.Info
```

`Agent.Info` 是 Schema 层的完整 Agent 定义，包含 `system: string` 字段。这个字段来自用户配置（`opencode.json` 或内置 agent 定义），是开发者/用户为 Agent 编写的静态指令。

运行时通过 `agents.select(session.agent)` 查询：

```typescript
// agent.ts:39
readonly select: (id?: ID | string) => Effect.Effect<Selection>
```

返回 `Selection { id, info }`，其中 `info` 可能为 `undefined`（agent 未配置时）。

---

## 四、Context Source 如何贡献 Baseline

每个 Context Source 定义自己的 `baseline` 渲染函数（`packages/core/src/system-context/index.ts:36`）：

```typescript
export interface Source<A> {
  readonly key: Key
  readonly baseline: (current: A) => string  // 将当前值渲染为模型可见文本
  readonly update: (previous: A, current: A) => string  // 变更时渲染更新文本
  readonly removed?: (previous: A) => string  // 源被移除时渲染通知
}
```

初始化时，`initialize()` 函数并发加载所有 source，将每个 source 的 `baseline()` 输出拼接：

```typescript
// system-context/index.ts:208-215
function initializeObservation(entries): Generation {
  const available = entries.filter(entry._tag === "Available")
  const rendered = available.map(entry => [entry.key, entry.baseline()])
  return {
    baseline: render(rendered.map(([, result]) => result.text)),  // 拼接所有 baseline 文本
    snapshot: Object.fromEntries(rendered.map(([key, result]) => [key, result.snapshot])),
  }
}
```

### Skill Guidance 的渲染（示例）

```typescript
// packages/core/src/skill/guidance.ts:57-61
return SystemContext.make({
  key: SystemContext.Key.make("core/skill-guidance"),
  load: Effect.succeed(available),
  baseline: render,  // 将 skill 列表渲染为 XML 引导文本
  update: (_previous, current) =>
    ["The available skills have changed...", render(current)].join("\n"),
})
```

类似的，`referenceGuidance`（`packages/core/src/reference/guidance.ts:50-61`）渲染项目内的 reference 文档列表，key 为 `"core/reference-guidance"`。

---

## 五、两条 System 路径的完整对比

```
                         Agent system (静态)
                              │
                    ┌─────────┴─────────┐
                    │                   │
               LLMRequest.system    (不经过)
              (初始特权前缀)          时间线
                    │
             ┌──────┴──────┐
             │             │
    agent.info?.system  system.baseline
                             │
                    Context Source 基线
                    (systemContext + skillGuidance + referenceGuidance)

─────────────────────────────────────────────────────

                    Context Source 变更
                         │
              SessionContextEpoch.reconcile()
                         │
              Mid-Conversation System Message
              → Message.system(text)
                         │
               LLMRequest.messages[]
              (时间线中的特权更新)
```

| 维度 | `LLMRequest.system` (初始前缀) | `Message.system()` (时间线) |
|------|-------------------------------|---------------------------|
| **数据结构** | `SystemPart[]` | `Message { role: "system", content }` |
| **生效时机** | 整个对话开始前，恒定不变 | 对话中途，某个时间点起生效 |
| **内容来源** | Agent 静态 prompt + Context Source baseline | Context Source 变更时的 update 渲染 |
| **持久化** | 不在 SessionHistory 中（Epoch 管理） | 作为 SessionMessage（type: "system"）持久化 |
| **LLM 协议降级** | 所有 route 原生支持 | 仅 Anthropic Claude Opus 4.8 原生；其他 route 降级为 `<system-update>` 包裹的 user 文本 |

时间线 system 消息的 LLM 降级说明见 `packages/llm/AGENTS.md`：

> Native chronological system messages are route/model-specific. Other routes intentionally lower the update in place into ordinary user-compatible text using this stable escaped representation: `<system-update>...</system-update>`

---

## 六、关键设计要点

1. **并发加载**：三个 context source 通过 `Effect.all` 并发加载，性能无损
2. **Key 唯一性保证**：`combine()` 通过 `assertUniqueKeys` 拒绝重复 key，避免冲突
3. **Agent 与 Agent 无关的分离**：`systemContext` 全局、`skillGuidance` 依赖 agent 选择、`referenceGuidance` 全局——合并时按顺序平铺
4. **Epoch 管理**：`SessionContextEpoch.initialize()` 只在 Epoch 开始时计算 baseline；后续通过 `prepare()` 复用基线，通过 `reconcile()` 检测变更产生 Mid-Conversation 更新
5. **空值过滤**：`[agent.info?.system, system.baseline].filter(...)` 确保两个部分可能为空时不发送垃圾数据
