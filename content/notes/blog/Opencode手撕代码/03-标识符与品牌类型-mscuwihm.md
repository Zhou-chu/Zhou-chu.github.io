---
blog: true
title: "03-标识符与品牌类型"
slug: "03-标识符与品牌类型-mscuwihm"
summary: "树节点：03 标识符与品牌类型 父节点：03 Schema包组织与导出 子节点：无 概述 OpenCode 使用 Effect TS 的 Brand （品牌类型）机制为所有领域标识符创建类型安全的字符串别名。核心思路：ID 在运行时是 string ，但在编译期被赋予唯一的品牌标记，编译器能阻止将 SessionID 误传给期望 ProjectID 的函数。 相关文件： packages/schema/src/identifier.ts"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "03-schema包组织与导出-mscuwj3u"
---

> 树节点：03-标识符与品牌类型
> 父节点：[[03-Schema包组织与导出]]
> 子节点：无

---

## 概述

OpenCode 使用 Effect-TS 的 **Brand**（品牌类型）机制为所有领域标识符创建类型安全的字符串别名。核心思路：ID 在运行时是 `string`，但在编译期被赋予唯一的品牌标记，编译器能阻止将 `SessionID` 误传给期望 `ProjectID` 的函数。

```ts
// 仅凭类型签名，编译器可拒绝此类错误：
function getSession(id: SessionID): Session
getSession(projectId)  // ❌ 编译错误：ProjectID ≠ SessionID
```

相关文件：`packages/schema/src/identifier.ts`（ID 生成算法）、`session-id.ts`、`project-id.ts`、`workspace-id.ts`、`integration-id.ts`（品牌定义），以及 `packages/core/src/id/id.ts`（Core 层 ID 工厂）。

---

## 品牌模式（Branding Pattern）

### 基础语法

```ts
// 最简形式：纯品牌（无前缀校验）
// packages/schema/src/integration-id.ts:3
export const IntegrationID = Schema.String.pipe(Schema.brand("Integration.ID"))

// 带前缀校验：
// packages/schema/src/session-id.ts:5-6
export const SessionID = Schema.String.check(Schema.isStartsWith("ses")).pipe(
  Schema.brand("SessionID"),
)
```

Effect-TS 的 `Schema.brand("XxxID")` 在类型系统中创建一个**名义类型**（nominal type），使得 `SessionID` 和 `ProjectID` 虽然底层都是 `string`，但类型系统视它们为不兼容。

### 带静态方法的品牌（`statics` 模式）

ID Schema 不仅是验证器，还通过 `statics()` 函数附加构造器方法：

```ts
// packages/schema/src/session-id.ts:5-14
export const SessionID = Schema.String.check(Schema.isStartsWith("ses")).pipe(
  Schema.brand("SessionID"),
  statics((schema) => {
    const create = () => schema.make("ses_" + descending())
    return {
      create,
      descending: (id?: string) => (id === undefined ? create() : schema.make(id)),
    }
  }),
)
```

**模式分析**：
1. `Schema.String.check(...)` — 运行期校验（字符串必须以 `ses` 开头）
2. `Schema.brand("SessionID")` — 编译期名义类型标记
3. `statics(...)` — 注入 `create()` 和 `descending()` 两个静态方法
4. `schema.make(value)` — 跳过校验直接构造（因为内部生成保证合规），返回品牌类型实例

**为什么需要 `schema.make()` 而不直接用字面量？** — 因为品牌类型的 TypeScript 类型是 opaque 的：你不能 `"ses_xxx" as SessionID`，必须通过 Schema 管道构造。

---

## ID 生成算法：`identifier.ts`

```ts
// packages/schema/src/identifier.ts:1-29
const length = 26
const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
let lastTimestamp = 0
let counter = 0

export function ascending() { return create(false) }
export function descending() { return create(true) }

export function create(descending: boolean, timestamp = Date.now()) {
  if (timestamp !== lastTimestamp) { lastTimestamp = timestamp; counter = 0 }
  counter++
  const current = BigInt(timestamp) * 0x1000n + BigInt(counter)
  const value = descending ? ~current : current
  const time = Array.from({ length: 6 }, (_, i) =>
    Number((value >> BigInt(40 - 8 * i)) & 0xffn).toString(16).padStart(2, "0"),
  ).join("")
  const bytes = crypto.getRandomValues(new Uint8Array(length - 12))
  return time + Array.from(bytes, (byte) => chars[byte % 62]).join("")
}
```

### 算法细节

| 步骤 | 操作 | 说明 |
|------|------|------|
| **时间编码** | `BigInt(timestamp) * 0x1000n + BigInt(counter)` | 毫秒时间戳左移 12 位后加上同毫秒内递增值（支持每毫秒 4096 个 ID） |
| **降序处理** | `descending ? ~current : current` | 按位取反使 ID 字典序与时间序相反（用于 Tailwind-like 排序） |
| **时间十六进制** | 6 字节 → 12 位 hex 字符 | 取编码后高 48 位，每 8 位一组转 hex |
| **随机后缀** | `getRandomValues(length - 12)` → base62 | 26 - 12 = 14 字节随机数，映射到 62 进制字符集 |
| **总长度** | 12 hex + 14 base62 = 26 字符 | 固定长度，无分隔符 |

**升序 vs 降序**：
- **升序**（`ascending`）：时间部分正常排列，新 ID 在字典序中靠后 → 适合需要时间排序的场景（如 WorkspaceID）
- **降序**（`descending`）：时间部分按位取反，新 ID 在字典序中靠前 → 适合需要最新项排最前的场景（如 SessionID）

---

## 各 ID 品牌详细

### SessionID — `session-id.ts`

```ts
// packages/schema/src/session-id.ts:1-15
import { Schema } from "effect"
import { descending } from "./identifier"
import { statics } from "./schema"

export const SessionID = Schema.String.check(Schema.isStartsWith("ses")).pipe(
  Schema.brand("SessionID"),
  statics((schema) => {
    const create = () => schema.make("ses_" + descending())
    return {
      create,
      descending: (id?: string) => (id === undefined ? create() : schema.make(id)),
    }
  }),
)
export type SessionID = typeof SessionID.Type
```

| 属性 | 值 |
|------|-----|
| 前缀 | `ses_` |
| 排序方向 | **descending**（降序）— 最新 session 排最前 |
| 品牌名 | `SessionID` |
| 静态方法 | `SessionID.create()` — 生成新 ID；`SessionID.descending(id?)` — 生成或接受已有 ID |
| 前缀校验 | `Schema.isStartsWith("ses")` |

> `Session.descending()` 接受可选参数 `id`：传入已有 ID 字符串时跳过生成直接用 `schema.make()` 包装为品牌类型。

### ProjectID — `project-id.ts`

```ts
// packages/schema/src/project-id.ts:1-8
import { Schema } from "effect"
import { statics } from "./schema"

export const ProjectID = Schema.String.pipe(
  Schema.brand("Project.ID"),
  statics((schema) => ({ global: schema.make("global") })),
)
export type ProjectID = typeof ProjectID.Type
```

| 属性 | 值 |
|------|-----|
| 前缀 | 无（任意字符串） |
| 品牌名 | `Project.ID` |
| 特殊值 | `ProjectID.global` — 表示全局项目（固定字符串 `"global"`） |
| 生成逻辑 | ProjectID 不由程序生成，由外部传入（目录路径哈希等） |

> `ProjectID` 是最简单的品牌示例：无前缀校验，无 ID 生成。唯一特殊值是 `global`。它仅利用品牌区分防止与 SessionID 等混淆。

### WorkspaceID — `workspace-id.ts`

```ts
// packages/schema/src/workspace-id.ts:1-19
import { Schema } from "effect"
import { ascending } from "./identifier"
import { statics } from "./schema"

export const WorkspaceID = Schema.String.check(Schema.isStartsWith("wrk")).pipe(
  Schema.brand("WorkspaceV2.ID"),
  statics((schema) => {
    const create = () => schema.make("wrk_" + ascending())
    return {
      ascending: (id?: string) => {
        if (!id) return create()
        if (!id.startsWith("wrk")) throw new Error(`ID ${id} does not start with wrk`)
        return schema.make(id)
      },
      create,
    }
  }),
)
export type WorkspaceID = typeof WorkspaceID.Type
```

| 属性 | 值 |
|------|-----|
| 前缀 | `wrk_` |
| 排序方向 | **ascending**（升序）— 按时间先后排列 |
| 品牌名 | `WorkspaceV2.ID` |
| 静态方法 | `WorkspaceID.create()` — 生成新 ID；`WorkspaceID.ascending(id?)` — 生成或校验已有 ID |
| 前缀校验 | 运行期双重：`Schema.isStartsWith("wrk")` + `ascending()` 中手动 `startsWith` 检查 |

> `WorkspaceID.ascending()` 的防御性更强：它不仅依赖 Schema 校验，还在静态方法中手动检查前缀并在不合规时抛出可读错误消息。

### IntegrationID / IntegrationMethodID — `integration-id.ts`

```ts
// packages/schema/src/integration-id.ts:1-7
import { Schema } from "effect"

export const IntegrationID = Schema.String.pipe(Schema.brand("Integration.ID"))
export type IntegrationID = typeof IntegrationID.Type

export const IntegrationMethodID = Schema.String.pipe(Schema.brand("Integration.MethodID"))
export type IntegrationMethodID = typeof IntegrationMethodID.Type
```

| 属性 | 值 |
|------|-----|
| 前缀 | 无 |
| 生成方法 | 无静态工厂 — ID 由外部系统提供 |
| 品牌名 | `Integration.ID` / `Integration.MethodID` |

> 最简洁的品牌定义——仅通过 `Schema.brand()` 声明类型边界，无额外约束。ID 值来自第三方集成系统（如 AWS ARN、GitHub installation ID 等）。

---

## Core 层 ID 工厂：`packages/core/src/id/id.ts`

Schema 层定义品牌和生成算法，Core 层提供**统一的带前缀的 ID 工厂**：

```ts
// packages/core/src/id/id.ts:1-14,35-37
const prefixes = {
  job: "job", event: "evt", session: "ses", message: "msg",
  permission: "per", question: "que", part: "prt",
  pty: "pty", tool: "tool", workspace: "wrk",
} as const

export function ascending(prefix: keyof typeof prefixes, given?: string) {
  return generateID(prefix, "ascending", given)
}

export function descending(prefix: keyof typeof prefixes, given?: string) {
  return generateID(prefix, "descending", given)
}

export function create(prefix: string, direction: "descending" | "ascending", timestamp?: number): string {
  return prefix + "_" + createIdentifier(direction === "descending", timestamp)
}
```

**设计意图**：
- **高层封装**：Core 不直接调用 `identifier.ts`，而是通过 `create()` 函数统一注入前缀
- **前缀注册表**：`prefixes` 对象集中管理所有 ID 前缀（10 种），防止散落各处
- **时间戳提取**：`timestamp()` 函数可从升序 ID 中反向提取时间戳，用于排序和调试
- **方向语义**：`ascending()` / `descending()` 提供自文档化的方向控制

---

## 为什么品牌类型（Branding）重要

### 问题场景：无品牌类型

```ts
// ❌ 无品牌：所有 ID 都是 string，类型系统无法区分
function archiveSession(sessionId: string) {}
function deleteProject(projectId: string) {}

const id = "ses_abc123"
archiveSession(id)      // 类型OK，但如果是 projectId 就错了
deleteProject(id)       // 类型OK，同样可能传错
```

### 解决方案：品牌类型

```ts
// ✅ 品牌类型：编译器阻止误传
function archiveSession(sessionId: SessionID) {}
function deleteProject(projectId: ProjectID) {}

// SessionID 和 ProjectID 是不兼容类型，编译器直接报错
```

### 效果总结

| 维度 | 无品牌 | 有品牌 |
|------|--------|--------|
| 编译期安全 | ❌ `string` = `string` | ✅ `SessionID ≠ ProjectID` |
| 运行期校验 | ❌ 无 | ✅ `isStartsWith("ses")` |
| 自文档化 | ❌ 类型签名不说明意图 | ✅ `getSession(id: SessionID)` 一目了然 |
| 重构安全 | ❌ 全局替换 `string` 时容易误改 | ✅ 仅品牌类型影响范围 |

### OpenCode 使用的品牌命名约定

| Schema 命名 | 前缀 | 方向 | 语义 |
|------------|------|------|------|
| `SessionID` | `ses_` | descending | Session 标识 |
| `Project.ID` | 无 | — | 项目标识（含 `global` 常量）|
| `WorkspaceV2.ID` | `wrk_` | ascending | 工作空间标识 |
| `Integration.ID` | 无 | — | 集成标识（外部提供）|
| `Integration.MethodID` | 无 | — | 集成方法标识 |
| `AgentV2.ID` | 无 | — | Agent 标识 |
| `PermissionV2.ID` | `per_` | ascending | 权限请求标识 |
| `Event.ID` | `evt_` | ascending | 事件标识 |
| `Session.Message.ID` | `msg_` | ascending | 消息标识 |
| `RelativePath` | 无 | — | 相对路径（非 ID 类）|
| `AbsolutePath` | 无 | — | 绝对路径（非 ID 类）|

---

## ID 全链路：从定义到使用

```
Schema 层                          Core 层
┌──────────────────┐              ┌───────────────────────┐
│ identifier.ts    │              │ id/id.ts              │
│  create()        │──────────────│  create("ses", "desc")│
│  ascending()     │   import     │  → "ses_" + hex+base62│
│  descending()    │              │                       │
│  26-char string  │              │  timestamp()提取时间   │
└────────┬─────────┘              └───────────────────────┘
         │
    ┌────▼────────────┐
    │ session-id.ts   │
    │  SessionID =    │  品牌标记 + 静态方法
    │  String.check(  │
    │    startsWith   │
    │    ("ses")      │
    │  ).pipe(        │
    │    brand(       │
    │    "SessionID") │
    │  ).pipe(        │
    │    statics(..)  │
    │  )              │
    └─────────────────┘
         │
    ┌────▼──────────────────┐
    │ session.ts             │
    │  Session.ID = SessionID│  实体层引用
    │  Session.Info = Struct.{│
    │    id: ID,             │
    │    ...                 │
    │  }                     │
    └────────────────────────┘
```

**核心设计原则**：
- **Schema 层**：定义品牌类型 — 纯契约，不含副作用
- **Core 层**：封装生成逻辑 — 提供统一工厂，管理前缀注册表
- **实体层**：消费品牌类型 — 通过 `Session.ID = SessionID` 引用
