---
blog: true
title: "08-工具选择与权限"
slug: "08-工具选择与权限-mscun0id"
summary: "08 工具选择与权限 树节点：08 工具选择与权限 父节点：08 工具声明与注册 子节点：无 1. 概览 OpenCode 的权限系统在 两个层级 运作： 定义层（materialize 时） ： whollyDisabled 过滤完全禁用的工具，决定哪些工具对 LLM 可见 执行层（settle 时） ： PermissionV2.assert() 在工具实际执行前做授权检查，支持 allow / deny / ask 三态 核心区别"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "08-工具声明与注册-mscun0k2"
---

# 08-工具选择与权限

> 树节点：08-工具选择与权限
> 父节点：[[08-工具声明与注册]]
> 子节点：无

---

## 1. 概览

OpenCode 的权限系统在**两个层级**运作：
- **定义层（materialize 时）**：`whollyDisabled` 过滤完全禁用的工具，决定哪些工具对 LLM 可见
- **执行层（settle 时）**：`PermissionV2.assert()` 在工具实际执行前做授权检查，支持 allow / deny / ask 三态

核心区别：**定义过滤是编目可见性（catalog visibility），不是执行授权**。即使工具未出现在 definitions 中，如果能以某种方式到达 settle，仍会执行。

**引用来源：**
- `packages/core/src/permission.ts:1-310` — PermissionV2 完整实现
- `packages/schema/src/permission.ts:1-65` — Permission 类型定义
- `packages/core/src/tool/registry.ts:132-135` — whollyDisabled
- `packages/core/src/tool/application-tools.ts:1-57` — 应用层工具注册
- `packages/core/src/permission/saved.ts:1-79` — 持久化的已保存权限

---

## 2. Permission 类型体系

### 2.1 Rule（规则）

定义在 `packages/schema/src/permission.ts:57-62`：

```ts
export const Rule = Schema.Struct({
  action: Schema.String,    // 工具名或通配符，如 "bash"、"edit"、"*"
  resource: Schema.String,  // 资源标识符，如 "*.ts"、"*"
  effect: Effect,           // "allow" | "deny" | "ask"
})
```

- `action`：匹配工具名或自定义 `permission` action（`tool.ts:148`）
- `resource`：匹配操作目标，支持通配符（通过 `Wildcard.match`）
- `effect`：三条效果之一

### 2.2 Effect（三态效果）

定义在 `packages/schema/src/permission.ts:54-55`：

| Effect | 含义 |
|--------|------|
| `allow` | 静默允许 |
| `deny` | 静默拒绝 |
| `ask` | 弹窗询问用户（默认效果，见 `permission.ts:79-85`） |

### 2.3 Ruleset

`Ruleset = Array<Rule>`（`packages/schema/src/permission.ts:64`），是一个有序规则列表。**规则匹配使用 `findLast`，后定义的规则覆盖先定义的**。

```ts
// packages/core/src/permission.ts:76-86
export function evaluate(action: string, resource: string, ...rulesets: Ruleset[]): Rule {
  return rulesets
    .flat()
    .findLast((rule) => Wildcard.match(action, rule.action)
                    && Wildcard.match(resource, rule.resource))
    ?? { action, resource: "*", effect: "ask" }  // 默认 ask
}
```

未匹配时返回默认 `{ effect: "ask" }`，符合最小信任原则。

---

## 3. 工具可见性过滤：whollyDisabled

`registry.ts:132-135` 中的 `whollyDisabled` 是 materialize 阶段的唯一权限检查：

```ts
function whollyDisabled(action: string, rules: PermissionV2.Ruleset) {
  const rule = rules.findLast((rule) => Wildcard.match(action, rule.action))
  return rule?.resource === "*" && rule.effect === "deny"
}
```

### 语义分析

- 只有 `{ action: 匹配, resource: "*", effect: "deny" }` 才算"完全禁用"
- `{ resource: "*.ts", effect: "deny" }` — 不触发（禁止对 .ts 文件的某操作，不意味着工具本身被完全禁用）
- `{ resource: "*", effect: "ask" }` — 不触发（询问不算禁用）

这意味着：**`* deny` 规则使工具从 LLM 定义中消失**；范围 deny（如 `bash deny`）不会隐藏工具，只是执行时拒绝。

### materialize 中的调用点（`registry.ts:112-113`）

```ts
for (const [name, registration] of registrations)
  if (whollyDisabled(permission(registration.tool, name), permissions))
    registrations.delete(name)
```

`permission(registration.tool, name)`（`tool.ts:148`）：
- 优先返回工具定义的 `runtime.permission`（如 `edit` 工具统一使用 `"edit"` action）
- 未设置时回退到 `name`

---

## 4. PermissionV2 Service — 执行时授权

### 4.1 服务接口（`permission.ts:92-99`）

```ts
export interface Interface {
  readonly ask: (input: AssertInput) => Effect<AskResult>
  readonly assert: (input: AssertInput) => Effect<void, Error>
  readonly reply: (input: ReplyInput) => Effect<void, NotFoundError>
  readonly get: (id: ID) => Effect<Request | undefined>
  readonly forSession: (sessionID) => Effect<ReadonlyArray<Request>>
  readonly list: () => Effect<ReadonlyArray<Request>>
}
```

- `ask`：非阻塞检查，返回 `{ id, effect }`，若为 `ask` 则创建 pending 请求但不等待
- `assert`：阻塞检查，若为 `ask` 则等待用户回复（通过 Deferred），deny 直接抛 `BlockedError`
- `reply`：用户回复 pending 请求（`once`/`always`/`reject`）

### 4.2 规则来源（`permission.ts:137-161`）

权限评估时汇合**三层规则**：

| 层 | 来源 | 说明 |
|----|------|------|
| **Agent 配置** | `agent.permissions`（`permission.ts:144`） | 每个 agent 有自己的 ruleset |
| **Session Saved** | `PermissionSaved` DB 持久化（`permission.ts:131-135`） | 用户"总是允许"的规则 |
| **缺失默认** | `missingAgentPermissions`（`permission.ts:15`） | `{ action: "*", resource: "*", effect: "deny" }` |

评估逻辑（`permission.ts:155-162`）：

```ts
const evaluateInput = Effect.fnUntraced(function* (input: AssertInput) {
  const rules = yield* configured(input.sessionID, input.agent)
  // 1. 先检查 agent 规则 -> 是否直接 deny
  if (denied(input, rules)) return { effect: "deny" as const, rules }
  // 2. 合并 agent 规则 + 已保存规则
  const all = [...rules, ...(yield* savedRules())]
  // 3. 逐 resource 评估
  const effects = input.resources.map((resource) =>
    evaluate(input.action, resource, all).effect
  )
  // 4. deny > ask > allow 优先级
  const effect = effects.includes("deny") ? "deny"
    : effects.includes("ask") ? "ask" : "allow"
  return { effect, rules: all }
})
```

### 4.3 ask 流程（`permission.ts:190-195`）

```ts
const ask = Effect.fn("PermissionV2.ask")(function* (input: AssertInput) {
  const result = yield* evaluateInput(input)
  const value = request(input)
  if (result.effect === "ask")
    yield* create(value, input.agent)  // 发布 Asked 事件，不等待
  return { id: value.id, effect: result.effect }
})
```

`ask` 不阻塞：即使 `effect === "ask"`，也只发布事件并返回，由调用方自行处理 UI。

### 4.4 assert 流程（`permission.ts:197-218`）

```ts
const assert = Effect.fn("PermissionV2.assert")((input: AssertInput) =>
  Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* () {
      const result = yield* evaluateInput(input)
      if (result.effect === "deny")
        return yield* new BlockedError({ rules: relevant(input, result.rules) })
      if (result.effect === "allow") return  // 直接通过
      const item = yield* create(request(input), input.agent)
      // 等待用户回复
      return yield* restore(Deferred.await(item.deferred))
    }),
  ),
)
```

`assert` **阻塞等待**用户回复——这是工具执行前的典型检查路径。

### 4.5 reply 流程（`permission.ts:220-286`）

用户回复类型：
- `"once"`：本次允许，resolve Deferred，不持久化
- `"always"`：本次允许 + 持久化到 `PermissionSaved` 表（`permission.ts:250-256`）→ 递归检查其他 pending 请求是否能自动允许（`permission.ts:261-283`）
- `"reject"`：拒绝，fail Deferred → 级联拒绝同 session 的所有 pending 请求（`permission.ts:237-247`）

级联拒绝是关键设计：拒绝一个工具调用时，同 Session 的其他 pending 请求也自动 reject（防止用户反复弹窗）。

---

## 5. Agent 模式与工具可用性

OpenCode 内置两个 agent（`README.md`）：

| Agent | 模式 | 典型权限 |
|-------|------|----------|
| **build** | 全权限开发 | 允许 bash/edit/write 等 |
| **plan** | 只读分析 | deny 文件编辑，bash 需 ask |

Agent 权限通过 `agent.permissions` 配置（`permission.ts:143-144`），若 agent 无权限配置则使用 `missingAgentPermissions`：`{ action: "*", resource: "*", effect: "deny" }`。

这意味着：**未配置权限的 agent 默认禁用所有工具**，必须显式配置 ruleset。

---

## 6. 应用工具 vs Location 工具

| 维度 | ApplicationTools | Location Tools (ToolRegistry) |
|------|------------------|-------------------------------|
| **作用域** | 进程级（全 process） | Location 级（per project） |
| **注册入口** | `opencode.tools.register()` | `Tools.Service.register()` |
| **存储** | `State<Data>` | `Map<string, Registration[]>` |
| **优先级** | 低（被 Location 覆盖） | 高（`at(-1)` 取最后） |
| **生命周期** | 进程存活期间 | Scope 范围内 |

合并规则（`registry.ts:107-110`）：Location 注册覆盖同名的 Application 注册。`at(-1)` 取最后注册的。

---

## 7. 权限检查的完整流程

```
Provider Turn 开始
  │
  ├─► materialize(permissions)
  │     └─► whollyDisabled 过滤 "* deny" 工具
  │           └─► 生成 definitions（LLM 可见工具列表）
  │
  ├─► LLM 请求工具调用
  │
  └─► settle(toolCall)
        └─► 工具执行时 PermissionV2.assert()
              ├─ deny → BlockedError（静默拒绝）
              ├─ allow → 继续执行
              └─ ask → 发布 Asked 事件 → Deferred.await
                    ├─ once → 执行
                    ├─ always → 执行 + 持久化 → 级联允许
                    └─ reject → DeclinedError → 级联拒绝同 session 请求
```

关键设计：
- `materialize` 只做工具可见性控制（`whollyDisabled`），**不依赖 PermissionV2.Service**（`registry.ts` 无需 `PermissionV2.Service` 注入）
- `settle` 也不在此层授权——工具的 `execute` 内部自行调用 `PermissionV2.assert()`
- 即使工具在 definitions 中不可见，如果调用到达 settle，满足 `advertised === registration.identity` 条件仍可执行（防止 stale 调用被误杀）（`registry.ts:60-61`）

---

## 8. Saved Permission 持久化

`packages/core/src/permission/saved.ts:1-79` 管理用户"总是允许"的持久化规则。

- 表结构：`id (per_xxx)`、`project_id`、`action`、`resource`
- `add` 使用 `onConflictDoNothing`（`saved.ts:66`）防止重复
- `list` 可过滤 `projectID`（`saved.ts:42-47`）
- `savedRules` 转换时统一 effect 为 `"allow"`（`permission.ts:133`）

---

## 9. 关键设计要点

1. **定义过滤 ≠ 执行授权**：`whollyDisabled` 仅过滤 `* deny` 规则，不影响执行时检查
2. **`evaluate` 使用 `findLast`**：后定义的规则覆盖前者，支持策略继承和覆盖
3. **默认 `ask`**：未匹配任何规则时默认询问用户（`permission.ts:79-85`）
4. **级联拒绝**：reject 一次会影响同 session 全部 pending 请求（`permission.ts:237-247`）
5. **Agent 无权限 = 全部 deny**：`missingAgentPermissions` 作为安全默认值（`permission.ts:15`）
6. **Registry 不依赖 Permission Service**：权限是工具自身的职责，registry 只做编目过滤
