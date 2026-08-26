---
blog: true
title: "02 — 会话生命周期 (Session Lifecycle)"
slug: "02-会话生命周期-session-lifecycle-mscuwj31"
summary: "02 — 会话生命周期 (Session Lifecycle) 设计意图：Admission ≠ Execution OpenCode V2 的会话生命周期围绕一个核心原则构建： Prompt 的持久化准入 (Admission) 与模型执行 (Execution) 是分离的 。 为什么要分离 | 理由 | 说明 | | | | | 崩溃安全 (Persistence first) | 即使进程在 Provider Turn 中途崩溃，"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

# 02 — 会话生命周期 (Session Lifecycle)

## 设计意图：Admission ≠ Execution

OpenCode V2 的会话生命周期围绕一个核心原则构建：**Prompt 的持久化准入 (Admission) 与模型执行 (Execution) 是分离的**。

```
用户输入
   │
   ▼
SessionInput.admit()          ← 持久化写入（崩溃安全）
   │  ┌─────────────────────────┐
   │  │ session_input 表行       │
   │  │ id, prompt, delivery,    │
   │  │ admitted_seq, promoted   │
   │  └─────────────────────────┘
   │
   ▼
SessionExecution.wake()       ← 触发进程内调度（可合并，不会丢）
   │
   ▼
SessionRunCoordinator         ← 同 Session 串行、不同 Session 并发
   │
   ▼
SessionRunner.run()           ← 主循环：steer → queue → idle
```

### 为什么要分离

| 理由 | 说明 |
|------|------|
| **崩溃安全 (Persistence-first)** | 即使进程在 Provider Turn 中途崩溃，admit 过的 prompt 不会丢失，重启后 Session Drain 从持久化输入恢复 |
| **Steer vs Queue 并发模型** | Steering prompt 在下一个 Safe Provider-Turn Boundary 立即提升；Queue prompt 只在 Session 将要 idle 时才提升一条。两者在 `session_input` 表中共存但提升时机不同 |
| **Drain 不是事务** | Session Drain 是进程本地的协调概念，没有持久化身份。重试、恢复由持久化的 `session_input` 行驱动，不由 Drain 边界驱动 |

> 📌 **CONTEXT.md**: "Keep durable prompt admission separate from model execution."

---

## 源码走读：`session/input.ts`

文件：`packages/core/src/session/input.ts`

### 核心概念：Admitted Prompt 与 Delivery 模式

每条用户输入在 `session_input` 表中对应一行，核心字段：

| 字段 | 含义 |
|------|------|
| `admitted_seq` | 准入时的全局事件序号 |
| `id` | prompt message 的唯一 ID |
| `prompt` | 编码后的 Prompt 对象 |
| `delivery` | `"steer"` 或 `"queue"` |
| `promoted_seq` | 提升时的全局事件序号（null = 尚未提升） |
| `time_created` | 创建时间戳 |

### `SessionInput.admit` — 持久化准入

📌 `SessionInput.admit` 幂等地将一条 prompt 持久化到 `session_input` 表。

```
admit(db, events, { id, sessionID, prompt, delivery })
  │
  ├─ find(db, id) → 已存在? 直接返回 (幂等)
  │
  └─ events.publish(PromptAdmitted, ...)
       │
       ├─ 发布 PromptAdmitted 事件
       ├─ projector 通过 projectAdmitted() 写入 session_input 行
       └─ 返回 Admitted 对象（含 admittedSeq）
```

关键实现细节（参见 `SessionInput.admit` 函数体）：
- 先检查 `find(db, input.id)` 是否已存在 — 保证幂等性
- 通过事件系统 `events.publish(SessionEvent.PromptAdmitted, ...)` 发布准入事件
- Projector 消费事件后调用 `projectAdmitted()` 执行实际 DB 写入
- 如果 `projectAdmitted()` 在 DB 写入前崩溃，`catchDefect` 回退到 `find()` 检查是否已持久化 (double-check)

### `Delivery` 类型 — steer vs queue

📌 **CONTEXT.md**: "Prompts steer by default and promote at the next safe provider-turn boundary while the current drain requires continuation. An explicit queue input remains pending until the Session would otherwise become idle."

| 属性 | `"steer"` | `"queue"` |
|------|-----------|-----------|
| 默认值 | 是 | 否（需显式指定） |
| 提升时机 | 下一个 Safe Provider-Turn Boundary（只要 Drain 需要继续） | Session 将要 idle 时，逐条提升 |
| 并发行为 | 一批 steer 一起提升，重置 agent 步数限制一次 | 提升一条后重新评估是否需要继续 |
| 典型场景 | 用户主动输入、子任务补充 | 批量排队的后台任务 |

### `SessionInput.find` — 查询已准入的 input

简单的单行查询，按 `id` 查找 `session_input` 行，返回 `Admitted | undefined`。

### Promote 生命周期

```
admit()                     → admitted_seq 赋值，promoted_seq = null
        ↓
promoteSteers() / promoteNextQueued()
        ↓                   → promoted_seq 赋值
        ↓
SessionHistory               → 作为 user message 出现在对话历史中
```

- **`SessionInput.promoteSteers`**：查询 `delivery = "steer"` 且 `promoted_seq IS NULL` 且 `admitted_seq ≤ cutoff` 的所有行，按 `admitted_seq` 排序后批量发布 `Prompted` 事件
- **`SessionInput.promoteNextQueued`**：查询 `delivery = "queue"` 且 `promoted_seq IS NULL` 的第一行（最小 `admitted_seq`），发布 `Prompted` 事件

- **`SessionInput.projectPrompted`**：更新 `promoted_seq`。如果行不存在（可能因为 projector 滞后），执行 upsert 写入完整行
- **`SessionInput.hasPending`**：检查是否有未提升的指定 delivery 类型的输入

### LifecycleConflict 错误

当 projection 不匹配时抛出。例如：admit 相同的 message ID 但 prompt 内容不同，或 delivery 模式不同。

---

## 源码走读：`session/run-coordinator.ts`

文件：`packages/core/src/session/run-coordinator.ts`

### `Coordinator<Key, E>` 泛型模式

📌 Coordinator 是 OpenCode 的并发控制原语：**同 Key 串行执行，不同 Key 并发执行**。

```
Coordinator<Key, E>
  │
  ├─ active   : 返回当前执行中 Key 的集合（快照）
  ├─ run(key) : key 空闲时启动执行；key 忙碌时等待加入（join 已有执行）
  ├─ wake(key): 注册一次合并的后续执行 (coalesced follow-up)
  └─ interrupt(key): 中断当前执行并等待清理

内部状态：
  active: Map<Key, Entry<E>>  ← 每 Key 一个 Entry
```

### Entry 状态机 (`run-coordinator.ts`)

```typescript
type Entry<E> = {
  done: Deferred.Deferred<void, E>    // 执行完成信号
  owner?: Fiber.Fiber<void, never>    // 执行 Fiber 引用
  pendingWake: boolean                // 有新的 wake 等待合并执行
  stopping: boolean                   // 正在中断
}
```

**状态转换：**

```
[创建] makeEntry()
  │ done=未完成, owner=无, pendingWake=false, stopping=false
  │
  ├─ run() 或 wake() 触发
  │    │
  │    ▼ start(key, entry, force, successor?)
  │    │   fork(drain(key, force)) → entry.owner = fiber
  │    │
  │    ▼ drain 完成 → settle(key, entry, exit)
  │      │
  │      ├─ 成功 + !stopping + pendingWake → 立即 successor 执行（合并）
  │      ├─ pendingWake 但被中断 → 创建新 Entry，启动 successor
  │      └─ 无 pendingWake → 从 active Map 中删除
  │
  └─ interrupt(key)
       entry.stopping = true
       entry.pendingWake = false
       Fiber.interrupt(entry.owner)
```

### 关键方法详解

**`active`**：`Effect.sync(() => new Set(active.keys()))` — 纯快照，不阻塞。

**`run(key)`**：`Effect.uninterruptibleMask` 保证原子性：
1. 如果 `active.get(key)` 存在且 `entry.stopping` → 等待其 done，然后递归 `run(key)`
2. 如果 `active.get(key)` 存在且不停止 → 直接等待 done（join 已有执行）
3. 如果 key 不在 active 中 → 创建新 Entry，以 `force=true` 启动 drain，等待完成

**`wake(key)`**：
1. 如果 key 已在 active 中 → 设置 `entry.pendingWake = true`（当前 drain 结束时自动合并执行）
2. 如果 key 不在 active 中 → 创建新 Entry，以 `force=false` 启动 drain

**`interrupt(key)`**：
1. 如果 key 不在 active 或 `entry.owner === undefined` → 无操作
2. 否则设置 `stopping = true`、`pendingWake = false`，调用 `Fiber.interrupt(entry.owner)`

**`settle()`**：执行完成后的清理逻辑：
- 成功 & !stopping & pendingWake → 同一 Entry 中立即启动 successor drain（合并优化）
- pendingWake 但需要新建 Entry → 从 active 删除旧 Entry，创建新 Entry 启动 successor
- 无 pendingWake → 从 active 删除，完成 Deferred

### `SessionRunCoordinator.make` 工厂函数

接受 `drain: (key: Key, force: boolean) => Effect<void, E>` 回调，返回 `Coordinator<Key, E>`。生命周期受 `Scope` 管理。

---

## 源码走读：`session/runner/llm.ts`

文件：`packages/core/src/session/runner/llm.ts`。`runner/` 目录包含以下文件：

| 文件 | 职责 |
|------|------|
| `index.ts` | Service 接口定义、RunError 类型 |
| `llm.ts` | **主循环** — 本文件 |
| `model.ts` | 模型解析 |
| `to-llm-message.ts` | V2 Message → LLM Message 转换 |
| `publish-llm-event.ts` | LLM 事件发布器 |
| `max-steps.ts` | 超出步数限制时的提示 |

### 主循环结构

`SessionRunner.run` 是入口 (参见 `SessionRunner.run` 函数体)：

```
run({ sessionID, force })
  │
  ├─ hasSteer = hasPending(db, sessionID, "steer")
  ├─ hasQueue = hasSteer ? false : hasPending(db, sessionID, "queue")
  │             ↑ steer 优先（有 steer 时不看 queue）
  ├─ promotion = hasSteer ? "steer" : hasQueue ? "queue" : undefined
  │
  └─ outer while (shouldRun)          ← queue 循环
       │
       └─ inner while (needsContinuation)  ← steer 循环（单次 drain）
            │   runTurn(sessionID, promotion, step)
            │   needsContinuation = result.needsContinuation
            │   step++
            │   promotion = "steer"        ← 后续 turn 总是 steer 模式
            │   if (!needsContinuation)
            │      needsContinuation = hasPending(db, sessionID, "steer")  ← 检查新 steer
            │
            └─ inner 结束
       │
       ├─ shouldRun = hasPending(db, sessionID, "queue")  ← 检查下一条 queue
       └─ promotion = "queue"
```

**两层 while 循环的设计原因：**
- **内层 (steer 循环)**：处理用户主动输入驱动的连续 tool call → 响应循环。每次 provider turn 后检查是否有新的 steer 输入。
- **外层 (queue 循环)**：当 steer 循环停止（无新 steer 且无 tool call 继续），检查是否有排队任务。每次只提升一条 queue，然后重新进入 steer 循环。

### `SessionRunner.runTurn` 单次 Provider Turn

核心职责：执行一次完整的 "请求 LLM → 流式接收 → 工具执行 → 结算" 循环。

**关键阶段：**

1. **加载 System Context**：`loadSystemContext(agent)` → 组合 agent system prompt + skill guidance + reference guidance → `SystemContext.combine()`

2. **ContextEpoch 初始化/准备**：
   ```typescript
   const initialized = yield* SessionContextEpoch.initialize(db, loadSystemContext(agent), session.id)
   // 后续 turn:
   const system = initialized ?? (yield* SessionContextEpoch.prepare(db, events, loadSystemContext(agent), session.id))
   ```

3. **Prompt 提升**：根据 `promotion` 参数提升 steers 或 queue。如果提升了任何 prompt，`currentStep` 重置为 1。

4. **LLM 请求构建**：
   ```typescript
   const request = LLM.request({
     model,
     providerOptions: { openai: { promptCacheKey } },
     system: [agent.info?.system, system.baseline]     ← 两个独立来源
       .filter(...)
       .map(SystemPart.make),
     messages: [...toLLMMessages(context, model), ...],  ← 来自 SessionHistory
     tools: toolMaterialization?.definitions ?? [],       ← 来自 ToolRegistry
     toolChoice: isLastStep ? "none" : undefined,
   })
   ```

5. **Compaction 检查**：如果上下文接近模型限制，触发 `SessionCompaction.compactIfNeeded`

6. **流式处理和工具执行**：
   ```typescript
   llm.stream(request).pipe(
     Stream.runForEach((event) => ...)
   )
   ```
   流中的每个事件：
   - `providerError` → 检查是否 context overflow
   - `tool-call` (非 providerExecuted) → 调用 `toolMaterialization.settle({...})` 执行本地工具，结果通过 FiberSet 并发执行

7. **Turn 结算**：`Effect.uninterruptibleMask` 包裹：
   - 等待流完成 + 所有 tool fibers 完成
   - **用户拒绝中断 (User-Declined Interruption)**：如果 tool fibers 执行失败且 `isUserDeclined` 检测到 `PermissionV2.DeclinedError` 或 `QuestionV2.RejectedError`，清理未完成的工具并中断当前 turn。`isUserDeclined` 函数体位于 `packages/core/src/session/runner/llm.ts`，它检查 `Cause.die` 原因是否包含这两种错误类型。
   - **权限拒绝语义**：`PermissionV2.DeclinedError` 替代了 1.17 中处理用户拒绝的多个错误变体（现已统一为单一的 DeclinedError），明确表示用户拒绝了权限请求（对应 UI 中的 "Reject" 操作）。`PermissionV2.BlockedError` 表示自动阻止（未经用户交互）。两者定义在 `packages/core/src/permission.ts`。
   - 发布 `SessionEvent.Step.Ended`
   - 返回 `{ needsContinuation, step }`

8. **Compaction 恢复**：通过 `TurnTransitionError` (die) 跳出当前 turn，外层 `catchDefect` 捕获后重建请求重新执行。`runTurn` 处理普通 compaction 和 overflow compaction；`runAfterOverflowCompaction` 不允许再次 overflow。

---

## 源码走读：`session/context-epoch.ts` — 简要

文件：`packages/core/src/session/context-epoch.ts`

详细解析见 [01 — System Context](01-system-context.md)。这里仅简述与 Runner 的接口：

- **`SessionContextEpoch.initialize`**：首次 provider turn 前，加载 System Context 并写入 `session_context_epoch` 表的 baseline
- **`SessionContextEpoch.prepare`**：后续 provider turn 时，加载当前 System Context，与存储的 snapshot 比较：
  - `Unchanged` → 返回现有 baseline
  - `Updated` → 发布 `ContextUpdated` mid-conversation system message，更新 snapshot
  - `ReplacementReady` → compaction 后替换整个 baseline
  - `ReplacementBlocked` → 等待条件满足

---

## 其他核心文件

### `session/compaction.ts`

文件：`packages/core/src/session/compaction.ts`

📌 LLM 驱动的对话压缩。当上下文接近模型限制时自动触发。

**核心接口：**
- `SessionCompaction.compactIfNeeded`：检查 `estimate(system + messages + tools)` 是否超过 `context - max(output, buffer)`，若超过则触发 compact
- `SessionCompaction.compactAfterOverflow`：执行实际的压缩：
  1. `select(entries, tokens)` — 保留最近 N tokens 的对话，其余作为 "head" 发送给 LLM 总结
  2. 调用 `buildPrompt()` — 用 `SUMMARY_TEMPLATE` 构造总结 prompt
  3. 流式调用 LLM 生成结构化总结（以下 5 个 section）
  4. 发布 `Compaction.Ended` 事件（含 summary + recent context）

**1.18.4 总结模板 (SUMMARY_TEMPLATE)：**

```
## Objective
- [one or two brief sentences describing what the user is trying to accomplish]

## Important Details
- [constraints/preferences, decisions and why, important facts/assumptions,
   exact context needed to continue, or "(none)"]

## Work State
### Completed
- [finished work, verified facts, or changes made; otherwise "(none)"]

### Active
- [current work, partial changes, or investigation state; otherwise "(none)"]

### Blocked
- [blockers, failing commands, or unknowns; otherwise "(none)"]

## Next Move
1. [immediate concrete action, or "(none)"]
2. [next action if known, or "(none)"]

## Relevant Files (unchanged from 1.17)
- [file or directory path: why it matters, or "(none)"]
```

**1.18.4 模板结构：** 总 section 从 8 个精简为 5 个：用户目标说明、约束/决策/事实汇总、工作状态（已完成/进行中/阻塞）、下一步行动（有序编号）、相关文件。模板更聚焦于可操作信息而非分类罗列。

**关键设计：** Compaction 结果以 `compaction` 类型 message 出现在 Session History 中，`toLLMMessage()` 将其转为 `<conversation-checkpoint>` XML 格式的 user message。

### `session/projector.ts`

文件：`packages/core/src/session/projector.ts`

📌 事件溯源 (Event Sourcing) 的状态物化器。将所有 Session 事件投影为 SQL 表行。

**1.18.4 架构变化：** Projector 使用私有 `const layer` 作为内部实现层，对外导出 `export const node = makeGlobalNode({ name: "session-projector", layer, deps: [EventV2.node, Database.node] })` — 符合 V2 的私有 Layer + 公开 Node 组合模式。

**核心职责：**
- 订阅 `EventV2.Interface`，为每种 `SessionEvent` 注册投影处理函数
- V1 兼容：投影 `SessionV1.Event.*` 到 `SessionTable`、`MessageTable`、`PartTable`
- V2 主流程：投影 `PromptAdmitted` → `SessionInputTable`、`Prompted` → promoted_seq 更新 + `SessionMessageTable`
- 各类事件（`Step.*`, `Tool.*`, `Shell.*`, `Text.*`, `Reasoning.*`）→ `SessionMessageTable`
- `AgentSwitched` / `ModelSwitched` → `SessionTable` 更新 + message 投影
- `RevertEvent.Committed` → 按 seq 边界清理 message 和 input 行 + 重置 Context Epoch
- 使用 `SessionMessageUpdater.update(adapter, event)` 作为增量消息更新策略

---

## 📌 CONTEXT.md 术语对照

### Session History

> 📌 "Session History contains projected conversational messages and admitted Mid-Conversation System Messages"

Session History 是经过投影的会话消息序列（来自 `SessionMessageTable`），**不等于**发给 LLM 的完整请求。详见下方 [概念纠正 #2](#概念纠正-2)。

### Session Drain

> 📌 "A Session Drain is process-local coordination rather than a durable domain entity. Durable recovery must reason from prompts, projected history, provider attempts, and tool state rather than inventing an enclosing execution identity."

Session Drain 是一个进程本地的执行跨度，没有持久化 ID。其生命周期由 `SessionRunCoordinator` 管理，恢复由 `session_input` 表中的未提升行驱动。

### Admitted Prompt

> 📌 "An Admitted Prompt is replayable pending input, not yet model-visible Session History."

在 `session_input` 表中持久化，但尚未提升为 user message 的 prompt。存在于两个状态之间：`admitted_seq` 已赋值，`promoted_seq` 为 null。

### Prompt Promotion

> 📌 "Prompt Promotion atomically consumes the pending inbox entry and appends its model-visible user message."

将 `Admitted Prompt` 提升为 Session History 中的 user message 的原子操作。由 `promoteSteers()` 或 `promoteNextQueued()` 触发，通过发布 `Prompted` 事件驱动 projector 更新 `promoted_seq` 和写入 `SessionMessageTable`。

### Safe Provider-Turn Boundary

> 📌 "The point immediately before a provider call, after durable input promotion and any required tool settlement, where context changes may be admitted chronologically."

在 `SessionRunner.runTurn` 中体现为：加载 System Context → 提升 prompt → 构建 LLM 请求 这一序列。所有 steer prompt 在下一个 provider turn 前被原子批次提升。

### Provider Turn

> 📌 "One request to a model provider and the response projected from that request."

在代码中对应一次 `SessionRunner.runTurn` 调用：一次 `llm.stream(request)` 及其完整的工具执行和结算。

### `active`, `interrupt`, `prompt`, `switchAgent`

| 操作 | 📌 语义 |
|------|--------|
| `sessions.active()` | "snapshots the current process's foreground Session drain registry as a record of Session IDs to { type: 'running' }" |
| `sessions.interrupt({ sessionID })` | "first verifies that the durable Session exists... For a known Session, interruption is idempotent: idle, already-settled, or locally unowned execution is a no-op." → 内部调用 `Coordinator.interrupt(key)` |
| `sessions.prompt(...)` | "exposes `resume?: boolean`. Omitting it preserves durable admission followed by an advisory execution wake; `resume: false` requests durable admit-only behavior." |
| `sessions.switchAgent({ sessionID, agent })` | "affects subsequent Session activity and fails with SessionNotFoundError for an unknown Session." → 发布 `AgentSwitched` 事件，projector 更新 `SessionTable.agent` |

---

## Steer vs Queue 对比

| 维度 | Steer | Queue |
|------|-------|-------|
| **默认值** | 是（`prompt()` 不指定时） | 否 |
| **提升时机** | 下一个 Safe Provider-Turn Boundary（Drain 需要继续时） | Session 将要 idle 时，逐条提升 |
| **批次行为** | 多个新 steer 在一次 boundary 批量提升 | 每次只提升一条，提升后立即重新进入 steer 循环 |
| **步数重置** | 任意新 steer 提升 → agent 步数限制重置（一批只重置一次） | 每条 queue 提升 → 步数重置 |
| **并发** | steer 和 queue 不能同时提升（steer 优先） | 有 steer pending 时跳过 queue |
| **循环位置** | 内层 while 循环（连续执行） | 外层 while 循环（逐条调度） |
| **存储** | 同一个 `session_input` 表，通过 `delivery` 字段区分 | |
| **典型场景** | 用户实时交互 | 后台排队任务、异步提交 |

---

## 概念纠正 #2

### Session History ≠ 发给 LLM 的完整请求

📌 OpenCode 发给 LLM 的完整请求由 **三个独立来源** 组装，它们分别有各自的生命周期：

```
                    发给 LLM 的完整请求
                    ═══════════════════
┌─────────────────────────────────────────────────────┐
│                                                     │
│  System Prompt          Messages           Tools    │
│  (System 指令)          (对话消息)         (工具定义) │
│       │                    │                  │      │
│       ▼                    ▼                  ▼      │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐ │
│  │ 来源:     │       │ 来源:     │       │ 来源:     │ │
│  │ System    │       │ Session   │       │ Tool      │ │
│  │ Context   │       │ History   │       │ Registry  │ │
│  │ Baseline  │       │ (Messages)│       │           │ │
│  └──────────┘       └──────────┘       └──────────┘ │
│       │                    │                  │      │
│  生命周期:             生命周期:           生命周期:  │
│  Context Epoch        每次 turn 前         每次 turn  │
│  跨 turn 不变         从 DB 投影           按 agent    │
│  compaction 时        最新消息             权限解析    │
│  整体替换                                       │      │
│                                                 │      │
│  变更触发:             变更触发:            变更触发:  │
│  ContextUpdated        Prompt 提升           agent     │
│  Mid-Conversation      工具结果             切换、    │
│  System Message        LLM 响应             插件变更   │
└─────────────────────────────────────────────────────┘
```

**代码中的体现** (`SessionRunner.runTurn` 请求构建阶段)：

```typescript
const request = LLM.request({
  model,
  system: [agent.info?.system, system.baseline]    // ← System Context (来自 ContextEpoch)
    .filter(...)
    .map(SystemPart.make),
  messages: [...toLLMMessages(context, model), ...], // ← Session History (来自 SessionHistory.entriesForRunner)
  tools: toolMaterialization?.definitions ?? [],      // ← Tool Registry (来自 tools.materialize)
})
```

### 为什么这个区分重要

1. **Session History 只有 Messages**：`SessionHistory.entriesForRunner` 只返回 `session_message` 表中的消息序列。它不包含 system prompt 和 tools。

2. **System Prompt 有独立的 Epoch 管理**：System Context 在 Context Epoch 中缓存，只在 compaction 或 context 变更时才更新。它不随每次 turn 重建。

3. **Tools 按 agent 动态解析**：每次 turn 根据当前 agent 的权限过滤可用工具。agent 切换时 tools 自动变化，但 Messages 和 System Context 不受影响。

4. **`sessions.context()` 返回的是 Messages**：API 的 `sessions.context({ sessionID })` 返回 "projected conversational messages selected as Session context"，即 Session History 部分，不包含 system prompt 和 tools。

---

## Session 生命周期全景

```
                     ┌─ 用户/API 输入 ─┐
                     │                 │
                     ▼                 ▼
              ┌──────────┐    ┌──────────────┐
              │  prompt() │    │ prompt()     │
              │  (steer)  │    │  (queue)     │
              └────┬─────┘    └──────┬───────┘
                   │                 │
                   ▼                 ▼
              ┌─────────────────────────────┐
              │   SessionInput.admit()      │  ← 持久化准入（幂等）
              │   → session_input 表         │
              │   → PromptAdmitted 事件      │
              └─────────────┬───────────────┘
                            │
              ┌─────────────▼───────────────┐
              │  SessionExecution.wake()    │  ← 进程内调度信号
              │  → Coordinator.wake(key)    │     (最佳努力，不丢数据)
              └─────────────┬───────────────┘
                            │
              ┌─────────────▼───────────────┐
              │  SessionRunCoordinator      │  ← 并发控制
              │  · 同 Session 串行           │
              │  · 不同 Session 并发         │
              │  · pendingWake 合并          │
              │  · interrupt 支持            │
              └─────────────┬───────────────┘
                            │
              ┌─────────────▼───────────────┐
              │  SessionRunner.run()        │  ← 主循环
              │                             │
              │  ┌─ outer while ──────────┐ │
              │  │  queue: 逐条提升         │ │
              │  │  ┌─ inner while ──────┐ │ │
              │  │  │  steer: 连续执行     │ │ │
              │  │  │                    │ │ │
              │  │  │  runTurn():        │ │ │
              │  │  │  1. loadSystemCtx  │ │ │
              │  │  │  2. ContextEpoch   │ │ │
              │  │  │  3. promote prompt │ │ │
              │  │  │  4. build request  │ │ │
              │  │  │  5. compact?       │ │ │
              │  │  │  6. llm.stream()   │ │ │
              │  │  │  7. settle tools   │ │ │
              │  │  │  8. isUserDeclined │ │ │
              │  │  │  9. publish events │ │ │
              │  │  └────────────────────┘ │ │
              │  └─────────────────────────┘ │
              └─────────────────────────────┘
                            │
                            ▼
                     Session 进入 idle
                    （等待下一个 wake）
```

**关键路径上的文件调用链：**

```
session/prompt.ts
  → SessionInput.admit()
  → SessionExecution.wake()
      → Coordinator.wake() or Coordinator.run()
          → SessionRunner.run()
              → SessionInput.hasPending()
              → SessionInput.promoteSteers() / promoteNextQueued()
              → SessionContextEpoch.initialize() / prepare()
              → SessionHistory.entriesForRunner()
              → SessionCompaction.compactIfNeeded()
              → llm.stream(request) + toolMaterialization.settle()
              → isUserDeclined() 检查权限拒绝
              → SessionEvent.* (持久化)
                  → SessionProjector.node (物化到 SQL)
```

---

## 相关笔记

- [01 — System Context](01-system-context.md): System Context 代数、Baseline 管理、Mid-Conversation System Message
- [03 — Tool System](03-tool-system.md): ToolRegistry、工具授权、settlement 生命周期
- [会话输入与Prompt管理](会话输入与Prompt管理.md): SessionInput 深度解析、admit/promote 生命周期
- [Session Runner 完整执行流程](Session Runner 完整执行流程.md): runTurn 九阶段详细走读
- [run-coordinator.ts详解](run-coordinator.ts详解.md): Coordinator 状态机、并发控制

---

最后更新：2026-07-24 | 来源：opencode-dev-new 1.18.4 源码 + CONTEXT.md + 设计哲学 + 概念纠正
