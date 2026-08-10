---
blog: true
title: "07-缓存策略"
slug: "07-缓存策略-mscun0im"
summary: "树节点：07 缓存策略 父节点：07 消息结构与角色 子节点：无 概述 Opencode 的 prompt caching 默认开启（ cache: \"auto\" ），在请求编译阶段自动注入 cache breakpoints 到支持内联标记的 protocol（Anthropic Messages、Bedrock Converse），以最少配置获得 tool use 循环中的大幅 token 成本减免。 1. CacheHint 类型"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "07-消息结构与角色-mscun0k4"
  - "07-系统提示组装-mscun0ij"
---

> 树节点：07-缓存策略
> 父节点：[[07-消息结构与角色]]
> 子节点：无

---

## 概述

Opencode 的 prompt caching 默认开启（`cache: "auto"`），在请求编译阶段自动注入 cache breakpoints 到支持内联标记的 protocol（Anthropic Messages、Bedrock Converse），以最少配置获得 tool-use 循环中的大幅 token 成本减免。

---

## 1. CacheHint 类型

`CacheHint`（`packages/llm/src/schema/options.ts:245-248`）：

```ts
// packages/llm/src/schema/options.ts:245-248
export class CacheHint extends Schema.Class<CacheHint>("LLM.CacheHint")({
  type: Schema.Literals(["ephemeral", "persistent"]),
  ttlSeconds: Schema.optional(Schema.Number),
}) {}
```

- **`type: "ephemeral"`**：短期缓存（默认 5 分钟）
- **`type: "persistent"`**：持久缓存（需要 provider 支持）
- **`ttlSeconds`**：自定义 TTL，≥3600 映射为 1h（Anthropic/Bedrock），否则 5m

`CacheHint` 可附加到 `SystemPart`、`TextPart`、`ToolResultPart`、`ToolDefinition` 四种内容片段上，通过其各自的 `cache` 可选字段。

---

## 2. CachePolicy 三级控制

`CachePolicy`（`packages/llm/src/schema/options.ts:275`）：

```ts
// packages/llm/src/schema/options.ts:275
export const CachePolicy = Schema.Union([Schema.Literal("auto"), Schema.Literal("none"), CachePolicyObject])
```

### 2.1 `"auto"`（默认）

```ts
// packages/llm/src/cache-policy.ts:18-22
const AUTO: CachePolicyObject = {
  tools: true,
  system: true,
  messages: "latest-user-message",
}
```

未指定或设为 `"auto"` 时，自动在三个位置注入 breakpoint：
1. **最后一条 tool definition**：tools 列表的末尾
2. **最后一个 system part**：system 数组的末尾
3. **最新一条 user message**：消息历史中最后的 `role: "user"` 消息

第三个位置是核心设计：在 tool-use 循环中，一条 user 消息触发多轮 assistant/tool 往返，缓存 user message 之前的 prefix 让所有 intra-turn API 调用复用同一缓存。

### 2.2 `"none"`

```ts
// packages/llm/src/cache-policy.ts:24
const NONE: CachePolicyObject = {}
```

完全禁用自动缓存。手动 `CacheHint` 仍然生效。

### 2.3 细粒度对象

```ts
// packages/llm/src/schema/options.ts:261-273
export const CachePolicyObject = Schema.Struct({
  tools: Schema.optional(Schema.Boolean),
  system: Schema.optional(Schema.Boolean),
  messages: Schema.optional(
    Schema.Union([
      Schema.Literal("latest-user-message"),
      Schema.Literal("latest-assistant"),
      Schema.Struct({ tail: Schema.Number }),
    ]),
  ),
  ttlSeconds: Schema.optional(Schema.Number),
})
```

控制每个维度：
- `tools` / `system`：布尔开关
- `messages`：`"latest-user-message"` / `"latest-assistant"` / `{ tail: N }`（最近 N 条）
- `ttlSeconds`：自定义缓存存活时间

---

## 3. Auto Breakpoint 注入机制

`applyCachePolicy()`（`packages/llm/src/cache-policy.ts:99-111`）是策略应用入口：

```ts
// packages/llm/src/cache-policy.ts:99-111
export const applyCachePolicy = (request: LLMRequest): LLMRequest => {
  if (!RESPECTS_INLINE_HINTS.has(request.model.route.id)) return request
  const policy = resolve(request.cache)
  if (!policy.tools && !policy.system && !policy.messages) return request
  const hint = makeHint(policy.ttlSeconds)
  const tools = policy.tools ? markLastTool(request.tools, hint) : request.tools
  const system = policy.system ? markLastSystem(request.system, hint) : request.system
  const messages = policy.messages ? markMessages(request.messages, policy.messages, hint) : request.messages
  if (tools === request.tools && system === request.system && messages === request.messages) return request
  return LLMRequest.update(request, { tools, system, messages })
}
```

**流程**：
1. 检查 route 是否属于 `RESPECTS_INLINE_HINTS`（第 100 行）：只有 `"anthropic-messages"` 和 `"bedrock-converse"` 走这条路径（`cache-policy.ts:42`）
2. 解析 cache policy（第 101 行）：`undefined` → `"auto"`，`"auto"` → `AUTO` 对象，`"none"` → `NONE`
3. 依次标记 tools（`markLastTool`）、system（`markLastSystem`）、messages（`markMessages`）
4. 每个标记函数在注入前检查目标片段是否已有手动 `CacheHint`（如 `tools[last]!.cache` 检查），已有则不覆盖
5. 返回更新过的 `LLMRequest`（通过 `LLMRequest.update` 不可变更新）

---

## 4. Provider 行为对照

| Protocol | `cache: "auto"` 行为 | `packages/llm/README.md:84-89` |
|---|---|---|
| Anthropic Messages | 注入 ≤3 个 `cache_control` 标记（受 4-breakpoint cap 约束） | `cache_control` on wire |
| Bedrock Converse | 注入 ≤3 个 `cachePoint` 块（受 4-breakpoint cap 约束） | `cachePoint` on wire |
| OpenAI Chat / Responses | **no-op**（输入 >1024 tokens 时隐式缓存） | 不发射内联标记 |
| Gemini | **no-op**（2.5+ 隐式缓存；显式 `CachedContent` 为 out-of-band） | 不发射内联标记 |

对于 OpenAI 和 Gemini，`applyCachePolicy` 在 `RESPECTS_INLINE_HINTS` 检查时直接返回原 request（`cache-policy.ts:100`），不产生任何标记。

---

## 5. 手动 CacheHint 覆盖

在任意 text / system / tool / tool-result content part 上内联 `CacheHint` 会覆盖自动策略：

```ts
// packages/llm/README.md:70-79 (参考)
system: [
  { type: "text", text: "stable system prompt", cache: { type: "ephemeral" } },
],
```

`applyCachePolicy` 的三个标记函数（`markLastTool`、`markLastSystem`、`markMessages`）在注入前都检查目标是否已有 cache 字段，已有则跳过该位置的自动注入：

```ts
// packages/llm/src/cache-policy.ts:50-51
if (tools[last]!.cache) return tools
return tools.map((tool, i) => (i === last ? new ToolDefinition({ ...tool, cache: hint }) : tool))
```

---

## 6. 用量追踪

所有 provider 统一通过 `response.usage` 回传缓存用量：

- **`cacheReadInputTokens`**：从缓存读取命中的 input token 数
- **`cacheWriteInputTokens`**：新写入缓存的 input token 数

这两个字段由各 protocol 的 stream parser 从 provider 原生 usage 字段中提取并归一化到 `LLMEvent` 的 `usage` 对象中，确保跨 provider 的一致性。

---

## 7. 成本模型

默认 `"auto"` 的策略有明确的数学依据（`cache-policy.ts:26-29` 注释）：

- Anthropic 5 分钟缓存：**写入 = 1.25× base price**，**读取 = 0.1× base price**
- Tool-use 循环中同一 prefix 被多次复用（一条 user prompt 产生 N 轮 assistant/tool）
- 单次复用即回本。低于 model minimum-cacheable-token 阈值的请求在协议层静默 no-op，无副作用

---

## 相关笔记

- [[07-系统提示组装]] — system parts 缓存
- [[07-消息结构与角色]] — `LLMRequest` 中的 cache 字段
- [[11-Provider-Turn完整流程]] — cache policy 在哪一步应用
- [[04-LLM协议适配层]] — 各 protocol 如何降低 CacheHint 到 wire format
