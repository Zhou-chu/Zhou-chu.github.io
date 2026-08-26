---
blog: true
title: "08-输出截断与Managed-Output"
slug: "08-输出截断与managed-output-mscun0jr"
summary: "树节点：08 输出截断与Managed Output 父节点：08 工具声明与注册 子节点：无 08 输出截断与Managed Output 概述 工具执行结果可能非常庞大（数千行日志、大型 JSON），直接塞入 Session History 会挤压上下文窗口。OpenCode 的 ToolOutputStore 在工具结果被持久化到历史之前，对其进行智能截断：保留头尾预览，将完整内容写入临时文件（Managed Output Fil"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "08-工具声明与注册-mscun0k2"
---

> 树节点：08-输出截断与Managed-Output
> 父节点：[[08-工具声明与注册]]
> 子节点：无

# 08-输出截断与Managed-Output

## 概述

工具执行结果可能非常庞大（数千行日志、大型 JSON），直接塞入 Session History 会挤压上下文窗口。OpenCode 的 `ToolOutputStore` 在工具结果被持久化到历史之前，对其进行智能截断：保留头尾预览，将完整内容写入临时文件（Managed Output File），并将预览中的标记指回该文件路径。

核心实现位于 `packages/core/src/tool-output-store.ts`（212 行，单文件模块），在 CONTEXT.md 术语表中对应 **Model Tool Output** 和 **Managed Tool Output File** 两个概念。

---

## 核心概念对照（来自 CONTEXT.md）

| 术语 | 含义 |
|------|------|
| **Model Tool Output** | 截断后的有界投影（bounded projection），作为 Session History 的可回放记录保留 |
| **Managed Tool Output File** | 完整输出的临时文件，位于 `tool-output/` 目录，7 天保留期 |
| 截断策略 | 保留头尾（中间截断），同时满足行数限制和字节数限制 |

---

## 截断参数

`packages/core/src/tool-output-store.ts:13-15`：

```typescript
export const MAX_LINES = 2_000
export const MAX_BYTES = 50 * 1024  // 50KB
export const RETENTION = Duration.days(7)
```

默认限制可通过 `Config.Service` 中的 document 配置覆盖（`packages/core/src/tool-output-store.ts:119-127`）：

```typescript
// packages/core/src/tool-output-store.ts:118-127
const limits = Effect.fn("ToolOutputStore.limits")(function* () {
  if (Option.isNone(config)) return { maxLines: MAX_LINES, maxBytes: MAX_BYTES }
  const entries = yield* config.value.entries()
  const configured = Object.assign({},
    ...entries.flatMap((entry) =>
      entry.type === "document" ? [entry.info.tool_output ?? {}] : []
    ),
  )
  return { maxLines: configured.max_lines ?? MAX_LINES, maxBytes: configured.max_bytes ?? MAX_BYTES }
})
```

配置键：`tool_output.max_lines` 和 `tool_output.max_bytes`。

---

## 截断流水线

### 1. 入口：ToolRegistry 调用 bound()

在 `packages/core/src/tool/registry.ts:75`，每个工具结算后立即经过 `ToolOutputStore.bound()`：

```typescript
// packages/core/src/tool/registry.ts:73-81
const output = pending.output
const bounded = yield* resources.bound({
  sessionID: input.sessionID, toolCallID: input.call.id, output
})
const result = ToolOutput.toResultValue(bounded.output)
```

### 2. bound() 主逻辑

`packages/core/src/tool-output-store.ts:138-173` — 判断是否需要截断：

```typescript
// packages/core/src/tool-output-store.ts:138-173
const bound = Effect.fn("ToolOutputStore.bound")(function* (input) {
  const outputLimits = yield* limits()
  const media = input.output.content.filter((item) => item.type === "file")
  const text = input.output.content.filter((item) => item.type === "text")
  const contextual =
    input.output.content.length === 0
      ? yield* Effect.try({ try: () => JSON.stringify(input.output.structured, null, 2),
          catch: (cause) => new StorageError({ operation: "encode", cause }) })
      : text.map((item) => item.text).join("")

  // 如果未超限，原样返回
  if (lineCount(contextual) <= outputLimits.maxLines &&
      Buffer.byteLength(contextual, "utf-8") <= outputLimits.maxBytes)
    return { output: input.output, outputPaths: [] }

  // 超限：写入完整文件 + 生成截断预览
  const outputPath = yield* write(contextual)
  const marker = `... output truncated; full content saved to ${outputPath} ...`
  return {
    output: {
      structured: input.output.structured,
      content: [{
        type: "text",
        text: boundedPreview(contextual, marker, outputLimits.maxLines, outputLimits.maxBytes),
      }, ...media],
    },
    outputPaths: [outputPath],
  }
})
```

关键细节：
- **content 为空时**：使用 `JSON.stringify(structured)` 作为替代文本（行144-147）
- **media 内容**：`type: "file"` 的 content 直接透传，不参与截断（行140,169）
- **文本合并**：所有 `type: "text"` 的 content 拼接后再截断（行148）

### 3. preview()：头尾采样

`packages/core/src/tool-output-store.ts:74-96`：

```typescript
// packages/core/src/tool-output-store.ts:74-96
const preview = (text, maxLines, maxBytes) => {
  const lines = text.split("\n")
  const headLines = Math.ceil(maxLines / 2)
  const tailLines = Math.floor(maxLines / 2)
  // 先按行截断（取头 N/2 行 + 尾 N/2 行）
  const sampled = lines.length <= maxLines ? text : [
    lines.slice(0, headLines).join("\n"),
    ...(tailLines > 0 ? [lines.slice(lines.length - tailLines).join("\n")] : []),
  ].join("\n")
  // 若字节数还超限，转按字节截断
  if (Buffer.byteLength(sampled, "utf-8") <= maxBytes) {
    return { head: ..., tail: ... }
  }
  const headBytes = Math.ceil(maxBytes / 2)
  const tailBytes = Math.floor(maxBytes / 2)
  return { head: takePrefix(sampled, headBytes), tail: takeSuffix(sampled, tailBytes) }
}
```

截断优先级：**先按行数，再按字节数**。`takePrefix` 和 `takeSuffix` 是 UTF-8 安全的逐字符截断函数（行50-72），使用 `Buffer.byteLength` 精确计数。

### 4. boundedPreview()：插入标记

`packages/core/src/tool-output-store.ts:98-104`：

```typescript
// packages/core/src/tool-output-store.ts:98-104
const boundedPreview = (text, marker, maxLines, maxBytes) => {
  const markerBytes = Buffer.byteLength(marker, "utf-8")
  if (maxLines <= 4 || maxBytes <= markerBytes + 4) return marker  // 极端情况只返回标记
  const bounded = preview(text, maxLines - 4, maxBytes - markerBytes - 4)
  return bounded.tail
    ? `${bounded.head}\n\n${marker}\n\n${bounded.tail}`
    : `${bounded.head}\n\n${marker}`
}
```

结果格式：
```
<头部若干行>

... output truncated; full content saved to <绝对路径> ...

<尾部若干行>
```

当原始输出极短时（≤4 行或 marker 自身即超限），仅返回 marker 文本。

---

## 文件存储

`packages/core/src/tool-output-store.ts:129-136`：

```typescript
// packages/core/src/tool-output-store.ts:17,129-136
export const MANAGED_DIRECTORY = "tool-output"

const write = Effect.fn("ToolOutputStore.write")(function* (content) {
  const file = path.join(directory, `tool_${Identifier.ascending()}`)
  yield* fs.ensureDir(directory)
  yield* fs.writeFileString(file, content, { flag: "wx" })
  return file
})
```

文件命名：`tool_<递增ID>`，使用 `flag: "wx"` 确保原子写入（文件不存在时创建，存在时失败）。

存储位置：`<global-data>/tool-output/`，其中 `global-data` 来自 `Global.Service`。

---

## 清理策略

`packages/core/src/tool-output-store.ts:176-205` — 每小时运行一次清理，删除超过 7 天（`RETENTION`）的文件：

```typescript
// packages/core/src/tool-output-store.ts:176-189
const cleanup = Effect.fn("ToolOutputStore.cleanup")(function* () {
  const entries = yield* fs.readDirectory(directory)
  const cutoff = Date.now() - Duration.toMillis(RETENTION)
  for (const entry of entries) {
    if (!entry.startsWith("tool_")) continue
    const info = yield* fs.stat(file).pipe(Effect.catch(() => Effect.void))
    const modified = info?.mtime.pipe(
      Option.map((date) => date.getTime()),
      Option.getOrElse(() => 0),
    )
    if (modified !== undefined && modified < cutoff)
      yield* fs.remove(file).pipe(Effect.catch(() => Effect.void))
  }
})
```

`cleanupNode`（行207-211）作为一个全局节点注册：`Schedule.spaced(Duration.hours(1))` 定时执行。

---

## 与其他模块的关系

### ToolRegistry → ToolOutputStore

```
tool.execute() → ToolOutput { structured, content[] }
  → ToolOutputStore.bound() → { output (可能截断), outputPaths }
    → ToolOutput.toResultValue() → ToolResultValue
```

### 事件持久化

`packages/core/src/session/runner/llm.ts:259-268` — 结算结果通过 `publish()` 发布为 `SessionEvent.Tool.Success` 时，`outputPaths` 随事件持久化：

```typescript
// packages/core/src/session/runner/llm.ts:259-268
Effect.flatMap((settlement) =>
  publish(
    LLMEvent.toolResult({
      id: event.id, name: event.name,
      result: settlement.result, output: settlement.output,
    }),
    settlement.outputPaths ?? [],
  ),
)
```

### 结构化输出 vs 文本输出

当 `ToolOutput.content` 为空时（仅结构化结果），使用 `JSON.stringify(structured)` 生成文本进行截断判断（`packages/core/src/tool-output-store.ts:144-146`）。如果 JSON 超限，完整的 JSON 字符串会被写为 Managed Output File，预览中显示截断的 JSON。

文本结果（`content` 非空）直接拼接所有 `text` 类型 content 项进行截断。

---

## 源文件索引

| 文件 | 关键行 | 内容 |
|------|--------|------|
| `packages/core/src/tool-output-store.ts` | 13-15 | 默认限制常量 + 保留期 |
| `packages/core/src/tool-output-store.ts` | 17 | `MANAGED_DIRECTORY = "tool-output"` |
| `packages/core/src/tool-output-store.ts` | 19-46 | `BoundInput`, `BoundResult`, `Interface` 类型 |
| `packages/core/src/tool-output-store.ts` | 50-72 | `takePrefix()` / `takeSuffix()` UTF-8 安全截断 |
| `packages/core/src/tool-output-store.ts` | 74-96 | `preview()` 头尾采样逻辑 |
| `packages/core/src/tool-output-store.ts` | 98-104 | `boundedPreview()` 插入 marker |
| `packages/core/src/tool-output-store.ts` | 106-109 | `lineCount()` 辅助函数 |
| `packages/core/src/tool-output-store.ts` | 112-127 | Layer 初始化 + `limits()` 配置读取 |
| `packages/core/src/tool-output-store.ts` | 129-136 | `write()` 临时文件写入 |
| `packages/core/src/tool-output-store.ts` | 138-173 | `bound()` 主截断逻辑 |
| `packages/core/src/tool-output-store.ts` | 176-189 | `cleanup()` 过期文件清理 |
| `packages/core/src/tool-output-store.ts` | 200-211 | `cleanupLayer` / `cleanupNode` 定时调度 |
| `packages/core/src/tool/registry.ts` | 74-81 | 调用 `bound()` + `toResultValue()` |
| `packages/core/src/session/runner/llm.ts` | 259-268 | `outputPaths` 随事件持久化 |
