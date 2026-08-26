---
blog: true
title: "prepareOnce 的四个出口"
slug: "prepareonce-的四个出口-mscuwj40"
summary: "这个问题问得很准——它触及了 prepareOnce 的 完整控制流 。让我把四个 return 路径全部标出来，你就知道 Updated 分支什么时候命中。 prepareOnce 的四个出口 从 packages/core/src/session/context epoch.ts 中 prepareOnce 函数，一共有 4 个 return 语句 ，它们互斥： 出口 4 的命中条件 ReconcileResult 的联合类型是 U"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "轮询式比较的调用链和相关代码-mscuwjpq"
  - "关于effect-ts-中的effect的理解-mscuwj3t"
  - "drain和fiber-mscuwj4q"
---

这个问题问得很准——它触及了 `prepareOnce` 的**完整控制流**。让我把四个 return 路径全部标出来，你就知道 Updated 分支什么时候命中。

---

## `prepareOnce` 的四个出口

从 `packages/core/src/session/context-epoch.ts` 中 `prepareOnce` 函数，一共有 **4 个 return 语句**，它们互斥：

```ts
const prepareOnce = Effect.fnUntraced(function* (...) {

  // ① 并发获取三样东西
  const [value, stored, compaction] = yield* Effect.all([...])

  // ══════════ 出口 1：首次调用 ══════════
  if (!stored) {
    const generation = yield* SystemContext.initialize(value)
    const baselineSeq = yield* insert(db, sessionID, generation)
    return { baseline: generation.baseline, baselineSeq }  // ← RETURN ①
  }

  // 解码快照 + 决定走 replace 还是 reconcile
  const snapshot = yield* Schema.decodeUnknownEffect(...)(stored.snapshot)
  const replacementSeq = compaction !== undefined && compaction.seq > stored.baseline_seq
    ? compaction.seq : undefined
  const result = replacementSeq
    ? yield* SystemContext.replace(value, snapshot)
    : yield* SystemContext.reconcile(value, snapshot)

  // ══════════ 出口 2：没变化 或 暂时不能换 ══════════
  if (result._tag === "Unchanged" || result._tag === "ReplacementBlocked") {
    return { baseline: stored.baseline, baselineSeq: stored.baseline_seq }  // ← RETURN ②
  }

  // ══════════ 出口 3：全量重建 ══════════
  if (result._tag === "ReplacementReady") {
    const baselineSeq = replacementSeq ?? (yield* EventV2.latestSequence(db, sessionID))
    yield* replace(db, sessionID, baselineSeq, result.generation)
    return { baseline: result.generation.baseline, baselineSeq }  // ← RETURN ③
  }

  // ══════════ 出口 4：增量更新 ══════════
  // 调用 events.publish，整个持久化链在 ONE db.transaction 内原子完成：
  //
   //  events.publish(SessionEvent.ContextUpdated, ...)
   //    → commitDurableEvent (packages/core/src/event.ts:commitDurableEvent)
   //      包裹在 Effect.uninterruptible + db.transaction({ behavior: "immediate" })：
  //        (1) projectors 执行 → SessionMessageUpdater 写 SessionMessage.System 行
  //        (2) commit 回调 → advance() 更新 snapshot
  //        (3) EventSequenceTable UPSERT
  //        (4) EventTable INSERT
  //      事务提交后 → pubsub.durable 通知 + notify 推送给 live 订阅者
  //
  yield* events.publish(
    SessionEvent.ContextUpdated,
    { sessionID, messageID: SessionMessage.ID.create(), timestamp, text: result.text },
    { commit: () => advance(db, sessionID, result.snapshot).pipe(Effect.orDie) },
  )
  return { baseline: stored.baseline, baselineSeq: stored.baseline_seq }  // ← RETURN ④
})
```

---

## 出口 4 的命中条件

`ReconcileResult` 的联合类型是 `Unchanged | Updated | ReplacementReady | ReplacementBlocked`（`packages/core/src/system-context/index.ts:ReconcileResult`）。

出口 2 过滤了 `Unchanged` 和 `ReplacementBlocked`，出口 3 过滤了 `ReplacementReady`。**剩余的唯一可能**就是 `Updated`。

所以出口 4 执行的条件是：

```
stored 存在                           ← 不是首次 Provider Turn
  AND 不需要 replace（compaction 没发生）  ← 不是 compaction 后
  AND reconcile 返回 Updated           ← 至少一个 Source 变了
```

---

## 具体场景

| 场景                        | stored? | 走哪个函数                            | 返回什么                        | 出口    |
| ------------------------- | ------- | -------------------------------- | --------------------------- | ----- |
| Session 第一个 Provider Turn | 无       | `initialize`                     | 全新 baseline                 | ①     |
| 日常，所有 Source 都没变          | 有       | `reconcile` → `Unchanged`        | 旧 baseline                  | ②     |
| 日常，date 变了（7/7→7/8）       | 有       | `reconcile` → `Updated`          | 旧 baseline + system message | **④** |
| 日常，AGENTS.md 改了           | 有       | `reconcile` → `Updated`          | 旧 baseline + system message | **④** |
| Compaction 发生             | 有       | `replace` → `ReplacementReady`   | 新 baseline                  | ③     |
| Compaction 后某 Source 不可用  | 有       | `replace` → `ReplacementBlocked` | 旧 baseline（等待）              | ②     |

---

## 出口 2 vs 出口 4：都返回旧 baseline，区别在哪？

两者都 `return { baseline: stored.baseline, baselineSeq: stored.baseline_seq }`，但：

|              | 出口 2（Unchanged） | 出口 4（Updated）                                          |
| ------------ | --------------- | ------------------------------------------------------ |
| **副作用**      | 无               | `events.publish(ContextUpdated)` 触发完整持久化链            |
| **DB 事务**    | 无               | 所有写入在 **同一个** `db.transaction`（`Effect.uninterruptible` 包裹）内原子完成 |
| **快照更新**     | 无               | 事务内：`advance(db, sessionID, snapshot)` 更新 Context Epoch 的 snapshot 列 |
| **消息写入**     | 无               | 事务内：projector → `SessionMessageUpdater` → 写入 `SessionMessage.System` 行 |
| **事件表写入**    | 无               | 事务内：`EventSequenceTable` UPSERT + `EventTable` INSERT |
| **通知时机**     | 无               | 事务提交**后** → `pubsub.durable` 唤醒 + `notify` 推送给 live 订阅者 |
| **模型看到**     | 和上次完全一样         | 下个 Provider Turn 收到一条 system message："Today's date is now: Jul 08 2026" |
| **baseline** | 复用              | 复用 |

**关键**：出口 4 的 `return` 值和出口 2 一模一样——`{ baseline: stored.baseline, baselineSeq: stored.baseline_seq }`。baseline 文本不变。

变化通过**副作用**传递给下游：`events.publish(SessionEvent.ContextUpdated, ...)` 把更新文本发布为持久化事件。`commitDurableEvent` 在 `Effect.uninterruptible` 包裹的 `db.transaction` 内依次执行 projector（写 `SessionMessage.System`）、`commit` 回调（`advance` 更新 snapshot）、以及事件序列表和事件表的写入。事务提交后，durable pubsub 和 live 订阅者收到通知。整个过程是原子的：不会出现"消息写入了但 snapshot 没更新"的中间状态。

---

## 出口 4 的持久化事务逐层追踪

当你看到 `events.publish(SessionEvent.ContextUpdated, ...)` 这一行时，它背后发生了以下调用链（所有步骤在**同一个 SQLite 事务**内原子完成）：

### 1. `events.publish`（`packages/core/src/event.ts` 中 `publish` 方法）

接收 `definition`、`data`、以及 `{ commit }` 选项，委托给 `publishEvent`。

### 2. `publishEvent`（`packages/core/src/event.ts` 中 `publishEvent` 函数）

因为 `ContextUpdated` 是 durable 事件（`definition.durable` 存在），所以调用 `commitDurableEvent`。成功后给 event 附加 `durable.{aggregateID, seq, version}`，然后 `notify(event, true)` 推送到 live 订阅者。

### 3. `commitDurableEvent`（`packages/core/src/event.ts` 中 `commitDurableEvent` 函数）

这是核心。整个 body 包裹在 **`Effect.uninterruptible`** 内，防止 Effect 中断导致事务半途而废。内部打开一个 **`db.transaction({ behavior: "immediate" })`**。

事务内的执行顺序：

```
db.transaction
├─ (a) for (const projector of list) { projector(committed) }
│      └─ Session projector（`packages/core/src/session/projector.ts` 中 projector 注册）
│           └─ SessionMessageUpdater → adapter.appendMessage(
│                SessionMessage.System.make({ id, type: "system", text, time }))
│              写入 session_message 行，type = "system"
│
├─ (b) commit(seq)  → advance(db, sessionID, snapshot)
│      └─ UPDATE SessionContextEpoch SET snapshot = <新值> WHERE session_id = ...
│
├─ (c) EventSequenceTable UPSERT (seq 自增或重放校验)
│
└─ (d) EventTable INSERT (id, aggregate_id, seq, type, data)
```

事务提交后：

- `pubsub.durable` 唤醒等待者（`packages/core/src/event.ts:354-360`）
- 回到 `publishEvent`：`notify(event, true)` 推送 live PubSub

### 为什么用 `Effect.uninterruptible`？

Effect 的 `interrupt`（例如 session 被取消）可以在任何 `yield*` 点生效。如果不在 uninterruptible 区域，事务可能被中断在 (a) 和 (b) 之间，造成 projector 写入了消息但 snapshot 没有 advance 的不一致状态。`Effect.uninterruptible` 保证整个事务体不能被外部中断，与 `db.transaction` 配合形成双重保护。

### 为什么是同一个事务？

projector 写 `SessionMessage.System` 行和 `advance` 更新 snapshot 必须在同一个事务内，否则一旦出现 crash，可能出现：
- 消息已写入但 snapshot 还是旧值 → 下次 `reconcile` 看不到变化，不会重新触发 update
- snapshot 已更新但消息丢失 → 模型看不到 ContextUpdated 的文本

同一事务保证两者要么一起成功，要么一起回滚。

---

## 出口 4 的 unavailable 行为

当某个 Context Source 加载失败时，`reconcile` 返回 `Updated`（信号不含 unavailable 源），还是 `Unchanged`（含 unavailable 源保持旧值），取决于该源在上一轮 snapshot 中是否已出现。

详细规则见 [[轮询式比较的调用链和相关代码]] 中关于 `Unavailable` 行为的章节。

---

## 为什么 Updated 之后不修改 baseline？

这是整个设计的精髓。对比两种做法：

```
❌ 事件驱动式（每次变化都改 System Prompt）：
Turn 1: System Prompt = "日期 7/7"     → 如果提供商支持 cache，prefix 可以被缓存
Turn 2: System Prompt = "日期 7/8"     → cache 失效！因为 System Prompt 变了
Turn 3: System Prompt = "日期 7/9"     → cache 又失效！

✅ 轮询 + Baseline 不变（OpenCode）：
Turn 1: System Prompt = "日期 7/7"     → 如果提供商支持 cache，prefix 可以被缓存
Turn 2: System Prompt = "日期 7/7"     → baseline 前缀不变，cacheable prefix 可能 HIT + system msg "日期现在是 7/8"
Turn 3: System Prompt = "日期 7/7"     → baseline 前缀不变，cacheable prefix 可能 HIT + system msg "日期现在是 7/9"
```

**在一个 Context Epoch 内，System Prompt 永远不变。** 变化以 system 消息的形式追加。这样 LLM provider 的 prompt cache 在整个 Epoch 内都有机会命中——这就是轮询式 + Baseline 不变设计的核心价值。

注意：具体是否命中 cache 取决于 LLM provider 的 cache 实现（部分提供商缓存 prefix，部分缓存全 prompt，部分不支持）。OpenCode 的做法是**创造条件**让 cache 尽可能命中，而不是保证命中。

---

## 导航

- 上一级：[轮询式比较的调用链和相关代码](轮询式比较的调用链和相关代码.md) — 五阶段 reconcile 流水线
- 相关深潜：
  - [[关于Effect-ts 中的Effect的理解]] — Effect 的"描述与执行分离"如何支撑并发设计
  - [[Drain和Fiber]] — Session Drain 与 Effect Fiber 的关系
