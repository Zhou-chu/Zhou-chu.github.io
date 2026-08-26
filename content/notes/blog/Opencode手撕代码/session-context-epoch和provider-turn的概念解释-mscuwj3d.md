---
blog: true
title: "Session、Context Epoch和Provider Turn的概念解释"
slug: "session-context-epoch和provider-turn的概念解释-mscuwj3d"
summary: "1. Session — 持久对话身份 Session 是 OpenCode 的 最外层容器 ——一次用户与 AI 交互的完整生命周期。 关键特性： 拥有稳定 ID（ ses 前缀），持久化在 session 表中 同一 Session 内，Agent/Model 可以切换，但历史消息保留 不同 Session 并发运行 （Coordinator 按 sessionID 做 Key 串行，不同 Session 互不阻塞） 📌 pack"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

## 1. Session — 持久对话身份

Session 是 OpenCode 的**最外层容器**——一次用户与 AI 交互的完整生命周期。

```
Session
├── 消息历史 (SessionHistory)
├── System Context 代数
├── 选定的 Agent + Model
├── 待处理输入队列 (SessionInput)
└── 执行协调器 (RunCoordinator)
```

**关键特性：**
- 拥有稳定 ID（`ses_` 前缀），持久化在 `session` 表中
- 同一 Session 内，Agent/Model 可以切换，但历史消息保留
- 不同 Session **并发运行**（Coordinator 按 `sessionID` 做 Key 串行，不同 Session 互不阻塞）

> 📌 `packages/core/src/session/sql.ts` — `SessionTable` 定义

---

## 2. Context Epoch — System Prompt 的版本周期

Context Epoch 解决一个现实问题：**System Prompt 什么时候变？**

直觉做法是每次调 LLM 前重新拼一串环境信息。但这样做，即使只是一个字母变了（比如日期从 7/23→7/24），LLM 的 prompt cache 就全部作废，白白浪费 token。

**Epoch 的机制：**

```
Provider Turn 前
  └→ prepareOnce()  ─→ 三选一：
        ├─ initialize()  首次，无历史快照
        ├─ reconcile()   有历史，逐一比较所有 Context Source
        └─ replace()     Compaction 后全量重建
```

每个 Context Source（日期、工作目录、AGENTS.md 指令、可用技能……）都对自己的值做**轮询**——系统"采样"它，不是它"通知"系统。`reconcileObservation()` 逐项比较：不变的跳过，变了的才生成一条 Mid-Conversation System Message 发给模型。

**Epoch 的边界：**
- **开始** — 首次 Provider Turn 或 Compaction 后
- **结束** — 下一次 Compaction 或 Session 移动到新目录

一个 Epoch 内，Baseline System Context（组装好的 System Prompt）**完全不变**，LLM prompt cache 持续有效。

> 📌 `packages/core/src/session/context-epoch.ts:40` — `prepareOnce`；`packages/core/src/system-context/index.ts:228` — `reconcileObservation`

---

## 3. Provider Turn — 一次完整的 LLM 调用周期

Provider Turn 是 OpenCode 的**最小执行单元**——一次"发送请求 → 接收流式响应 → 执行工具 → 结算"的完整循环。

```
runTurn(sessionID, promotion, step)
  │
  ├─ 1. 加载 System Context（agent system prompt + skill guidance + reference guidance）
  ├─ 2. ContextEpoch.prepare() → 按需生成 system message
  ├─ 3. 提升待处理输入（promoteSteers / promoteNextQueued）
  ├─ 4. 构建 LLM 请求（system + messages + tools）
  ├─ 5. llm.stream(request) → 流式接收
  ├─ 6. 工具调用结算（FiberSet 并发执行，awaitToolFibers 等待）
  └─ 7. 发布 Step.Ended 事件，返回 { needsContinuation, step }
```

**两层 while 循环：**
- **内层**（steer 循环）：用户主动输入驱动的连续 tool-call 链。每轮后检查是否有新 steer。
- **外层**（queue 循环）：当 steer 循环停止后，逐条提升排队任务。

**关键：** 如果用户在工具执行期间拒绝（`DeclinedError`），`isUserDeclined()` 检测到后清理 tool fiber set，中断当前 turn。

> 📌 `packages/core/src/session/runner/llm.ts:173` — `runTurn`；`packages/core/src/session/runner/llm.ts:378` — `run`（双层循环入口）

---

## 三者关系

```
Session  ──────────────────────────────────────────────── (持久身份)
  ├── Context Epoch 1  ──── (System Prompt v1 不变)
  │     ├── Provider Turn 1
  │     ├── Provider Turn 2
  │     └── ...
  ├── Compaction ──→ Epoch 结束
  ├── Context Epoch 2  ──── (System Prompt v2)
  │     ├── Provider Turn 3
  │     └── ...
  └── Session 结束
```

**一句话总结：** Session 是"谁在说话"，Context Epoch 是"System Prompt 这个版本什么时候过期"，Provider Turn 是"这一轮具体说了什么"。
