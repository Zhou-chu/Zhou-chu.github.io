---
blog: true
title: "Compaction 与历史管理"
slug: "compaction-与历史管理-mscun056"
summary: "树节点：05 Compaction与历史管理 父节点：05 Session创建与状态机 子节点：无 Compaction 与历史管理 当会话消息积累到接近模型上下文窗口上限时，Opencode 自动将早期对话 压缩 为结构化摘要，保留近期消息不变。Compaction 由 SessionCompaction 模块驱动， SessionHistory 模块负责过滤后的消息加载。 配置 packages/core/src/session/c"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：05-Compaction与历史管理
> 父节点：[[05-Session创建与状态机]]
> 子节点：无
# Compaction 与历史管理
当会话消息积累到接近模型上下文窗口上限时，Opencode 自动将早期对话**压缩**为结构化摘要，保留近期消息不变。Compaction 由 `SessionCompaction` 模块驱动，`SessionHistory` 模块负责过滤后的消息加载。
## 配置
`packages/core/src/session/compaction.ts:114-126`

```typescript
const settings = (documents: readonly Config.Entry[]) => {
  const configured = documents
    .filter((entry): entry is Config.Document => entry.type === "document")
    .flatMap((entry) => (entry.info.compaction ? [entry.info.compaction] : []))
  return configured.reduce<Settings>(
    (result, current) => ({
      auto: current.auto ?? result.auto,
      buffer: current.buffer ?? result.buffer,
      tokens: current.keep?.tokens ?? result.tokens,
    }),
    { auto: true, buffer: DEFAULT_BUFFER, tokens: DEFAULT_KEEP_TOKENS },
  )
}
```

| 配置项             | 默认值             | 说明                      |
| --------------- | --------------- | ----------------------- |
| `auto`          | `true`          | 是否自动触发 compaction       |
| `buffer`        | `20_000` tokens | context window 中保留的缓冲空间 |
| `tokens` (keep) | `8_000` tokens  | 近期保留的 token 数量          |

其他常量（`:13-15`）：
- `TOOL_OUTPUT_MAX_CHARS = 2_000` — 工具输出序列化时的截断长度
- `SUMMARY_OUTPUT_TOKENS = 4_096` — 摘要生成的最大 token 数

---

## select() — 分割对话

`packages/core/src/session/compaction.ts:128-159`

```typescript
const select = (
  entries: readonly Entry[],
  tokens: number,
): { readonly head: string; readonly recent: string } | undefined => {
  const conversation = entries
    .filter((entry) => entry.message.type !== "compaction")  // 跳过已有的 compaction 消息
    .map((entry) => serialize(entry.message))
    .filter(Boolean)
  // 从末尾向前累积，直到达到 tokens 限制
  let total = 0
  let split = conversation.length
  for (let index = conversation.length - 1; index >= 0; index--) {
    const next = total + Token.estimate(conversation[index])
    if (next > tokens) {
      // 部分截断最后一条消息以精确填充
      const remaining = Math.max(0, tokens - total) * 4
      if (remaining > 0) {
        splitPrefix = conversation[index].slice(0, -remaining)
        splitSuffix = conversation[index].slice(-remaining)
        split = index + 1
      }
      break
    }
    total = next
    split = index
  }
  return { head, recent }
}
```

**分割策略**：从消息列表末尾向前累加 token 估算，达到 `keepTokens` 限制时分割：
- **head**：早期消息（需要被压缩的部分）
- **recent**：近期消息（原样保留）

分裂点可能在一条消息的内部（通过字符截断精确控制），确保 token 使用最大化。

---

## serialize() — 消息序列化

`packages/core/src/session/compaction.ts:86-112`

将消息序列化为摘要友好的文本格式：

| 消息类型 | 序列化格式 |
|---|---|
| `user` | `[User]: text\n[Attached mime: filename]` |
| `assistant` | `[Assistant]: text` / `[Assistant reasoning]: text` / `[Assistant tool call]: name(input)` / `[Tool result]: content` / `[Tool error]: message` |
| `system` | `[System update]: text` |
| `synthetic` | `[Synthetic context]: text` |
| `shell` | `[Shell]: command\noutput` |

工具输出通过 `truncate()` (`:76-77`) 截断到 `TOOL_OUTPUT_MAX_CHARS`。

---

## buildPrompt() — 摘要 Prompt 构造

`packages/core/src/session/compaction.ts:161-168`

```
[previousSummary 存在]
  Update the anchored summary below using the conversation history above.
  Preserve still-true details, remove stale details, and merge in the new facts.
  <previous-summary>...</previous-summary>

[previousSummary 不存在]
  Create a new anchored summary from the conversation history.

<template>  ← SUMMARY_TEMPLATE (:16-46)
  ## Objective
  ## Important Details
  ## Work State
    ### Completed / Active / Blocked
  ## Next Move
  ## Relevant Files
</template>

[head 内容 — 需要被压缩的早期消息]
```

**增量摘要**：如果已有 prior compaction，基于前次摘要更新（保留仍然有效的细节，移除过时信息，合并新事实）。

---

## compactIfNeeded() — 触发条件判断

`packages/core/src/session/compaction.ts:225-236`

```typescript
const compactIfNeeded = Effect.fn("SessionCompaction.compactIfNeeded")(function* (input) {
  if (!config.auto) return false
  const context = input.model.route.defaults.limits?.context
  if (context === undefined || context <= 0) return false
  const output = input.request.generation?.maxTokens ?? input.model.route.defaults.limits?.output ?? 0
  if (
    estimate({ system: input.request.system, messages: input.request.messages, tools: input.request.tools }) <=
    context - Math.max(output, config.buffer)
  )
    return false  // 还没满
  return yield* compactAfterOverflow(input)  // 触发 compaction
})
```

**触发条件**（三个必须同时满足）：
1. `config.auto === true`
2. context limit 已知且 > 0
3. `estimate(request) > context - max(output, buffer)` — 请求 token 超过剩余空间

在 runner 中调用时机：`packages/core/src/session/runner/llm.ts:215-216`，构造 LLM 请求后、发送前。

---

## compactAfterOverflow() — 执行 Compaction

`packages/core/src/session/compaction.ts:172-224`

```typescript
const compactAfterOverflow = Effect.fn("SessionCompaction.compactAfterOverflow")(function* (input) {
  const selected = select(input.entries, config.tokens)
  const previousSummary = input.entries.find((entry) => entry.message.type === "compaction")?.message
  if (!selected || (selected.head.length === 0 && previousSummary?.type !== "compaction")) return false
  const summaryPrompt = buildPrompt({
    previousSummary: previousSummary?.type === "compaction" ? previousSummary.summary : undefined,
    context: [previousSummary?.type === "compaction" ? previousSummary.recent : "", selected.head].filter(Boolean),
  })
  // 验证摘要 prompt 本身不超出 context window
  if (Token.estimate(summaryPrompt) > context - summaryOutput) return false
  // 发布 Compaction.Started 事件
  yield* dependencies.events.publish(SessionEvent.Compaction.Started, { ... })
  // 调用 LLM 生成摘要
  const summarized = yield* dependencies.llm.stream(
    LLM.request({ model: input.model, messages: [Message.user(summaryPrompt)], tools: [], generation: { maxTokens: summaryOutput } })
  ).pipe(
    Stream.runForEach((event) => {
      if (LLMEvent.is.providerError(event)) failed = true
      if (LLMEvent.is.textDelta(event)) chunks.push(event.text)
      return Effect.void
    }),
    Effect.as(true),
    Effect.catchTag("LLM.Error", () => Effect.succeed(false)),
  )
  if (!summarized || failed || !summary.trim()) return false
  // 发布 Compaction.Ended 事件（含摘要文本 + recent 消息）
  yield* dependencies.events.publish(SessionEvent.Compaction.Ended, { text: summary, recent: selected.recent, ... })
  return true
})
```

**流程**：
1. `select()` 分割消息
2. `buildPrompt()` 构造摘要请求
3. 验证摘要 prompt 不超 context window
4. 发布 `SessionEvent.Compaction.Started`
5. 调用 LLM `stream()` 生成摘要（`tools: []`，仅文本）
6. 收集所有 `textDelta` chunks
7. 发布 `SessionEvent.Compaction.Ended`（携带 `text` 摘要 + `recent` 原始消息）
8. Compaction 消息持久化后，**触发 Context Epoch replacement**（`projector.ts:395` → `SessionMessageUpdater.update` → compaction 消息写入 → 在下次 `prepare()` 时 `SystemContext.replace()`）

---

## SessionHistory — 历史加载

`packages/core/src/session/history.ts`

### latestCompaction() (`:13-22`)

```sql
SELECT seq FROM session_message
WHERE session_id = ? AND type = 'compaction'
ORDER BY seq DESC LIMIT 1
```

找到最近的 compaction 消息的 sequence 号。

### entriesForRunner() (`:90-99`)

```typescript
export const entriesForRunner = Effect.fn("SessionHistory.entriesForRunner")(function* (
  db, sessionID, baselineSeq,
) {
  const rows = yield* messageRows(db, sessionID, yield* latestCompaction(db, sessionID), baselineSeq)
  return yield* Effect.forEach(rows, (row) =>
    decodeMessageRow(row).pipe(Effect.map((message) => ({ seq: row.seq, message }))),
  )
})
```

### messageRows() (`:24-53`)

核心过滤逻辑：

```sql
WHERE session_id = ?
  AND (
    -- 如果有 compaction：只加载 compaction 之后的消息
    seq >= compaction.seq
    -- 同时加载 baseline 之后的 system 消息（即使它们在 compaction 之前）
    OR (type = 'system' AND seq > baselineSeq)
  )
  AND (
    -- 过滤掉 baseline 之前的旧 system 消息
    type != 'system' OR seq > baselineSeq
  )
ORDER BY seq ASC
```

**过滤规则**：
1. 从最近 compaction **之后**开始加载（含 compaction 消息本身）
2. system 消息只在 baseline sequence 之后才加载（旧的 system 更新已体现在 baseline 中）
3. 按 sequence 升序排列

### load() (`:66-79`)

完整的消息加载（用于 context API）：
1. 查询 Context Epoch baseline sequence
2. 查询 latest compaction
3. 加载过滤后的消息行
4. 解码每条消息

---

## Compaction 触发 Context Epoch 替换

Compaction 在 `projector.ts:395` 中投影为会话消息：

```typescript
yield* events.project(SessionEvent.Compaction.Ended, (event) => run(db, event))
```

`run()` (`projector.ts:112-191`) 将 compaction 消息写入 `SessionMessageTable`。在下次 `ContextEpoch.prepare()` 调用时（`context-epoch.ts:59`）：

```typescript
const replacementSeq = compaction !== undefined && compaction.seq > stored.baseline_seq
  ? compaction.seq : undefined
if (replacementSeq) result = yield* SystemContext.replace(value, snapshot)  // 全新 baseline
```

因为 `compaction.seq > baseline_seq`，触发 `SystemContext.replace()`，生成全新的 baseline system context，开启新的 Context Epoch。详见 [[05-Context-Epoch机制]]。

---

## 关键源文件引用

| 功能 | 文件:行号 |
|---|---|
| 默认配置常量 | `packages/core/src/session/compaction.ts:12-15` |
| SUMMARY_TEMPLATE | `packages/core/src/session/compaction.ts:16-46` |
| `settings()` 配置加载 | `packages/core/src/session/compaction.ts:114-126` |
| `select()` 消息分割 | `packages/core/src/session/compaction.ts:128-159` |
| `serialize()` 消息序列化 | `packages/core/src/session/compaction.ts:86-112` |
| `buildPrompt()` 摘要 prompt | `packages/core/src/session/compaction.ts:161-168` |
| `compactIfNeeded()` 触发判断 | `packages/core/src/session/compaction.ts:225-236` |
| `compactAfterOverflow()` 执行 | `packages/core/src/session/compaction.ts:172-224` |
| `latestCompaction()` 查找 | `packages/core/src/session/history.ts:13-22` |
| `messageRows()` 过滤逻辑 | `packages/core/src/session/history.ts:24-53` |
| `load()` 完整加载 | `packages/core/src/session/history.ts:66-79` |
| `entriesForRunner()` | `packages/core/src/session/history.ts:90-99` |
| Compaction 投影 | `packages/core/src/session/projector.ts:395` |
| Compaction 触发 epoch replace | `packages/core/src/session/context-epoch.ts:59-68` |
