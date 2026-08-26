---
blog: true
title: "Drain和Fiber"
slug: "drain和fiber-mscuwj4q"
summary: "父笔记 : run coordinator.ts详解 · 02 session lifecycle · 会话输入与Prompt管理 两个概念一个来自 Effect 并发模型，一个来自 OpenCode 的执行模型。 Fiber Fiber 是 Effect 运行时里的 并发执行单元 。放在 JS 语境下最好理解：它不是线程（OS 线程），不是进程，而是类似协程的轻量实体。 它是什么 关键特性： | 特性 | 含义 | | | | | 协"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "run-coordinator-ts详解-mscuwjpg"
---

> **父笔记**: [[run-coordinator.ts详解]] · [[02-session-lifecycle]] · [[会话输入与Prompt管理]]

两个概念一个来自 Effect 并发模型，一个来自 OpenCode 的执行模型。

---

## Fiber

Fiber 是 Effect 运行时里的**并发执行单元**。放在 JS 语境下最好理解：它不是线程（OS 线程），不是进程，而是类似协程的轻量实体。

### 它是什么

```
一个 Effect 程序（"菜谱"）→ Effect 运行时解释执行 → 在一个 Fiber 上跑
```

关键特性：

| 特性        | 含义                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **协作式调度** | Fiber 在 I/O 边界（等数据库查询、读文件、等网络响应）主动让出，另一个 fiber 继续。不是抢占式，是"你干完了等 I/O 的那段就该我了"。                                                                   |
| **单线程并发** | 所有 fiber 跑在同一个 JS 线程上。没有"两个 fiber 同时执行 CPU 指令"。只有 I/O 等待阶段可以重叠——你在 System Context 笔记里看到的就是这个：`{ concurrency: "unbounded" }` 起的是一堆 fiber，不是一堆线程。 |
| **可中断**   | `Fiber.interrupt(fiber)` 可以取消一个正在运行的 fiber。Coordinator 的 `interrupt()` 方法就是干这个。                                                                 |
| **有生命周期** | 创建（`fork`）→ 运行 → 完成（`Exit.Success`）或失败（`Exit.Failure`）。Coordinator 的 `settle` 就在监听这个生命周期。                                                       |

### 在 run-coordinator 里怎么用

```typescript
const fork = yield* FiberSet.makeRuntime<never, void, never>()
//                    ↑ FiberSet 是一个 fiber 池——管理所有 fork 出来的 fiber

const owner = fork(
  // 这里面的代码跑在一个新的 fiber 上
  (successor ? Effect.yieldNow : Deferred.await(ready)).pipe(
    Effect.andThen(Effect.suspend(() => options.drain(key, force))),
    Effect.onExit((exit) => Effect.sync(() => settle(key, entry, exit))),
    ...
  ),
)
entry.owner = owner   // 把 fiber 存起来——后面 interrupt 要用
```

一个 fiber = 一次 drain 的执行载体。Coordinator 通过 `entry.owner` 持有这个 fiber 的引用，这样可以在需要时调用 `Fiber.interrupt(entry.owner)` 终止它。

---

## Drain

Drain 是 OpenCode 对 **"一次连续的对话处理周期"** 的抽象。

### 它是什么

来自 CONTEXT.md 的定义：

> **Session Drain**：One process-local execution span that promotes eligible input and runs required Provider Turns until no immediate continuation remains. A Session Drain has no persistent identifier or transcript boundary.

翻译成人话：**从"开始处理用户输入"到"没什么需要立刻处理的了"之间的一切。**

### 一个 drain 里发生什么

```
DRAIN 开始
  │
  ├─ ① Promotion：检查 SessionInputTable 里有没有 promoted_seq IS NULL 的输入
  │     有 → publish(Prompted) → projectPrompted → 输入变成模型可见
  │
  ├─ ② Context Epoch：prepareOnce → initialize / reconcile / replace
  │     → 得到 baseline system context
  │
  ├─ ③ 历史消息：entriesForRunner → toLLMMessages → 加载对话历史
  │
  ├─ ④ LLM 请求：LLM.request({ system, messages, tools, ... })
  │
  ├─ ⑤ 流式响应：stream → 模型回复文本 + 工具调用
  │
  ├─ ⑥ 工具结算：执行工具、写入结果
  │     如果有工具调用结果 → 回到步骤 ②（同一个 drain 继续）
  │
  └─ 没有更多工具调用 → DRAIN 结束
```

### drain 和 fiber 的关系

```
Drain 是"做什么"（业务逻辑）
Fiber 是"在哪跑"（执行载体）

一次 drain = 一个 fiber = Coordinator 里的一个 entry
```

Coordinator 不关心 drain 内部做了什么——它只控制**何时启动**、**何时等待**、**何时续跑**、**何时中断**。

### 为什么 drain 不持久化

drain 是一个**进程内（process-local）**的概念。
概念要点：没有 durable identity。如果进程崩溃重启，没有"恢复上一次 drain"这回事——恢复的是 Session 的持久化状态（消息历史、Context Epoch、SessionInputTable），然后从这些状态出发启动**新的** drain。drain 本身不持久化，不编号，不是数据库里的一行。

具体来说：
- **没有 durable drain ID**：Coordinator 的 `active` Map 是内存结构，不在数据库里
- **没有 transcript boundary**：drain 的开始和结束不会在会话历史中留下特殊标记
- **process-local 协调**：`run`、`wake`、`interrupt` 都在当前进程的 Coordinator 实例内完成

### 一个关键例子

```
用户发了一条消息："帮我改写这个函数"
  │
  ├─ admit() → 持久化输入
  ├─ wake(session) → Coordinator 启动 drain
  │
  └─ DRAIN 内部：
        promote 用户输入 → initialize Context Epoch → LLM 请求 →
        模型回复了一个工具调用 task("请 Oracle 审查代码") →
        tool settle → Oracle 执行完返回结果 →
        再次 prepareOnce(reconcile) → 再次 LLM 请求 →
        模型回复："重写完成，这是新版本..." →
        没有更多工具调用 → DRAIN 结束
```

**一个 drain，两次 Provider Turn。** drain 是外层容器，Provider Turn 是内层循环。用户的交互看起来是一个回合，但 drain 内部可能经历了多轮 LLM 调用和工具执行。

---

## 总结

```
Fiber = Effect 的协程    → "在哪跑"
Drain = OpenCode 的会话执行周期 → "做什么"
Coordinator = Fiber 和 Drain 之间的调度器 → "什么时候跑"

一个 Session = 一组 drain（串行，通过 Coordinator 排队）
一次 drain = 一个 fiber = 一次或多次 Provider Turn
```
