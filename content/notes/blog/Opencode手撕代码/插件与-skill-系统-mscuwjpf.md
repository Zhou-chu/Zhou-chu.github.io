---
blog: true
title: "插件与 Skill 系统"
slug: "插件与-skill-系统-mscuwjpf"
summary: "树节点：11 插件与Skill系统 父节点：11 Provider Turn完整流程 子节点：无 插件与 Skill 系统 Plugin 是 OpenCode 的扩展机制，Skill 是 AI Agent 的能力注入机制。两者在架构层面协同工作：Plugin 提供基础设施扩展（如 Provider、Agent、Command），Skill 提供 AI 可调用的知识和指令。 架构概览 Plugin 系统 核心接口 文件 ： package"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：11-插件与Skill系统
> 父节点：[[11-Provider-Turn完整流程]]
> 子节点：无

# 插件与 Skill 系统

Plugin 是 OpenCode 的扩展机制，Skill 是 AI Agent 的能力注入机制。两者在架构层面协同工作：Plugin 提供基础设施扩展（如 Provider、Agent、Command），Skill 提供 AI 可调用的知识和指令。

---

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    Plugin System                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ PluginV2.Service                             │   │
│  │  add() / remove() / wait()                   │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│  ┌──────────────────▼───────────────────────────┐   │
│  │ Plugin Host (PluginHost.make)                 │   │
│  │  → Agent Hook, AISDK Hook, Catalog Hook,     │   │
│  │    Command Hook, Integration Hook,            │   │
│  │    Reference Hook, Skill Hook                  │   │
│  └──────────────────┬───────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                    Skill System                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ SkillV2.Service                              │   │
│  │  sources() / list() / transform()              │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│  ┌──────────────────▼───────────────────────────┐   │
│  │ SkillGuidance.Service                         │   │
│  │  load(agent) → SystemContext                   │   │
│  │  (注册为 Context Source)                       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Plugin 系统

### 核心接口

**文件**：`packages/core/src/plugin.ts:23-27`

```typescript
export interface Interface {
  readonly add: (id: ID, effect: PluginRuntime["effect"]) => Effect<void>
  readonly remove: (id: ID) => Effect<void>
  readonly wait: (id: ID) => Effect<void>
}
```

三个简单操作：添加、移除、等待加载完成。

### Plugin 生命周期

**文件**：`packages/core/src/plugin.ts:31-143`

```
1. add(id, effect)
   ├─ KeyedMutex.withLock(id) — 防止并发冲突
   ├─ State.batch() — 批量状态更新
   │   ├─ 移除同 ID 的旧 Scope（如有）
   │   ├─ Scope.fork(scope) — 创建子 Scope
   │   ├─ effect(host) — 执行 Plugin 的 Effect 函数
   │   └─ events.publish(Event.Added, { id })
   ├─ 成功 → active.set(id, child)
   │         Deferred.succeed 通知所有 waiter
   └─ 失败 → failures.set(id, exit)
             Deferred.done(waiter, exit) 传递错误

2. wait(id)
   ├─ KeyedMutex.withLock(id)
   ├─ 已 active → 立即返回
   ├─ 已失败 → 返回 failure exit
   └─ 加载中 → Deferred.await(waiter) 等待

3. remove(id)
   ├─ KeyedMutex.withLock(id)
   └─ Scope.close(current, Exit.void)
```

### Plugin Host

**文件**：`packages/core/src/plugin/host.ts`

Plugin Host 为 Plugin 的 `effect()` 函数提供注入目标：

```typescript
export interface PluginRuntime {
  effect: (host: PluginHost) => Effect<void>
}
```

Host 暴露的 Hooks（来自 `packages/plugin/src/v2/effect/registration.ts:11`）：

```typescript
export type Hooks<Spec> = {
  readonly [Name in keyof Spec]:
    (callback: (input: Spec[Name]) => Promise<void> | void)
      => Promise<Registration>
}
```

### 可用 Hook 类型

| Hook | 用途 | 文件 |
|------|------|------|
| `AgentHooks` | 注册自定义 Agent | `packages/plugin/src/v2/effect/agent.ts` |
| `AISDKHooks` | AI SDK 中间件注入 | `packages/plugin/src/v2/effect/aisdk.ts` |
| `CatalogHooks` | 模型目录扩展 | `packages/plugin/src/v2/effect/catalog.ts` |
| `CommandHooks` | 注册命令（如 `/skill-name`） | `packages/plugin/src/v2/effect/command.ts` |
| `SkillHooks` | 注册 Skill 来源 | `packages/plugin/src/v2/effect/skill.ts` |
| `IntegrationHooks` | 第三方集成 | `packages/plugin/src/v2/effect/integration.ts` |
| `ReferenceHooks` | 参考文档注入 | `packages/plugin/src/v2/effect/reference.ts` |

### Plugin 通过 Hook 扩展 Tool Registry

Plugin 注册的 Agent 和 Command 间接触发工具注入：

1. Plugin 通过 `AgentHooks` 注册 Agent 定义（含 `permissions`）
2. Plugin 通过 `CatalogHooks` 注册模型
3. Plugin 通过 `CommandHooks` 注册命令 → 命令自动映射为 Agent 可调用的工具
4. Runner 加载时调用 `tools.materialize(agent.permissions)` 过滤可用工具

### Plugin Schema

**文件**：`packages/schema/src/plugin.ts`

```typescript
export const ID = Schema.String.pipe(Schema.brand("Plugin.ID"))

const Added = define({
  type: "plugin.added",
  schema: { id: ID },
})
export const Event = { Added, Definitions: inventory(Added) }
```

Plugin 本身极简——ID 标识 + `Added` 事件。所有能力通过 Hook 注入。

### TUI Plugin 集成

**文件**：`packages/opencode/src/plugin/tui/runtime.ts`

TUI Plugin 是 Plugin 系统的消费者，提供前端层面的扩展：

```typescript
export type TuiPluginApi = {
  app: TuiApp,
  attention: TuiAttention,
  keymap: TuiKeymap,
  route: { register, navigate, current },
  ui: { Dialog, toast, Prompt, ... },
  kv: TuiKV,
  state: TuiState,
  theme: TuiTheme,
  client: OpencodeClient,
  event: TuiEventBus,
  plugins: { list, activate, deactivate, add, install },
  lifecycle: TuiLifecycle,
}
```

---

## Skill 系统

### Skill Schema

**文件**：`packages/schema/src/skill.ts`

```typescript
// 三种来源类型
export const DirectorySource = Schema.Struct({
  type: Schema.Literal("directory"),
  path: AbsolutePath,
})
export const UrlSource = Schema.Struct({
  type: Schema.Literal("url"),
  url: Schema.String,
})
export const EmbeddedSource = Schema.Struct({
  type: Schema.Literal("embedded"),
  skill: Schema.suspend(() => Info),
})

// Skill 信息
export const Info = Schema.Struct({
  name: Schema.String,
  description: Schema.String.pipe(optional),
  slash: Schema.Boolean.pipe(optional),  // 是否为 slash 命令
  location: AbsolutePath,                 // SKILL.md 文件路径
  content: Schema.String,                 // Markdown 正文内容
})

// 联合 Source 类型，附带 equals / key 工具方法
export const Source = Object.assign(
  Schema.Union([DirectorySource, UrlSource, EmbeddedSource]),
  {
    equals: (a, b) => a.type === b.type
      ? a.type === "directory" ? a.path === b.path
      : a.type === "url" ? a.url === b.url
      : a.skill.name === b.skill.name
      : false,
    key: (source) => source.type === "directory"
      ? `directory:${source.path}`
      : source.type === "url"
      ? `url:${source.url}`
      : `embedded:${source.skill.name}`,
  },
)
```

### 三种 Skill Source

| Source 类型 | 含义 | 示例 |
|-------------|------|------|
| `directory` | 本地目录中的 `*.md` / `SKILL.md` 文件 | `~/.config/opencode/skills/` |
| `url` | 远程 Git 仓库，通过 `SkillDiscovery.pull()` 拉取 | `https://github.com/user/skills` |
| `embedded` | 直接内嵌的 Skill 定义 | Plugin 内硬编码的 Skill |

### Skill 发现与加载

**文件**：`packages/core/src/skill.ts:73-105`

```typescript
const load = Effect.fn("SkillV2.load")(function* (source: Source) {
  const skills: Info[] = []
  if (source.type === "embedded") return [source.skill]
  const directories = source.type === "directory"
    ? [source.path]
    : yield* discovery.pull(source.url)  // Git clone/pull
  for (const directory of directories) {
    const files = yield* fs.glob("{*.md,**/SKILL.md}", {
      cwd: directory, absolute: true, include: "file", symlink: true, dot: true,
    })
    for (const filepath of files.toSorted()) {
      const content = yield* fs.readFileStringSafe(filepath)
      if (!content) continue
      const markdown = ConfigMarkdown.parseOption(content)
      if (!markdown) continue
      const frontmatter = decodeFrontmatter(markdown.data).valueOrUndefined
      if (!frontmatter) continue
      const name = frontmatter.name !== undefined
        ? frontmatter.name
        : path.dirname(filepath) === directory
          ? path.basename(filepath, ".md")
          : undefined
      if (!name) continue
      skills.push({ name, description: frontmatter.description,
        slash: frontmatter.slash, location: AbsolutePath.make(filepath),
        content: markdown.content })
    }
  }
  return skills
})
```

**发现规则**：
1. 扫描目录下所有 `*.md` 和 `**/SKILL.md` 文件
2. 解析 Frontmatter（`name`, `description`, `slash`）
3. `name` 可来自 frontmatter 或文件名
4. `slash: true` 表示可被作为 `/skill-name` 命令调用

### 缓存与列表

```typescript
// packages/core/src/skill.ts:109-118
const cache = new Map<string, Info[]>()
const list = Effect.fn("SkillV2.list")(function* () {
  const skills = new Map<string, Info>()
  for (const source of state.get().sources) {
    const key = Source.key(source)
    const loaded = cache.get(key) ?? (yield* load(source))
    cache.set(key, loaded)
    for (const skill of loaded) skills.set(skill.name, skill)
  }
  return Array.from(skills.values())
})
```

- 每个 Source 的加载结果按 key 缓存在内存中
- 同名 Skill 去重（后者覆盖前者）

### 权限过滤

```typescript
// packages/core/src/skill.ts:30-31
export const available = (skills: ReadonlyArray<Info>, agent: AgentV2.Info) =>
  skills.filter((skill) =>
    PermissionV2.evaluate("skill", skill.name, agent.permissions).effect !== "deny")
```

---

## Skill Guidance — 作为 Context Source

### 架构桥接

Skill 系统通过 `SkillGuidance` 注册为 **System Context Source**，使 AI 在每个 Provider Turn 都能看到可用 Skill 列表。

**文件**：`packages/core/src/skill/guidance.ts`

```typescript
export interface Interface {
  readonly load: (agent: AgentV2.Selection) => Effect<SystemContext.SystemContext>
}
```

### load() 实现

```typescript
// packages/core/src/skill/guidance.ts:46-68
load: Effect.fn("SkillGuidance.load")(function* (selection) {
  const agent = selection.info
  if (!agent) return SystemContext.empty
  const permitted = SkillV2.available(yield* skills.list(), agent)
  if (permitted.length === 0 &&
      PermissionV2.evaluate("skill", "*", agent.permissions).effect === "deny")
    return SystemContext.empty
  const available = permitted
    .flatMap((skill) => skill.description === undefined
      ? [] : [{ name: skill.name, description: skill.description }])
    .toSorted((a, b) => a.name.localeCompare(b.name))
  return SystemContext.make({
    key: SystemContext.Key.make("core/skill-guidance"),
    codec: Schema.toCodecJson(Schema.Array(Summary)),
    load: Effect.succeed(available),
    baseline: render,
    update: (_previous, current) =>
      ["The available skills have changed...", render(current)].join("\n"),
    removed: () => "Skill guidance is no longer available...",
  })
})
```

### 渲染格式

```typescript
// packages/core/src/skill/guidance.ts:16-32
const render = (skills: ReadonlyArray<Summary>) =>
  [
    "Skills provide specialized instructions and workflows for specific tasks.",
    "Use the skill tool to load a skill when a task matches its description.",
    ...(skills.length === 0
      ? ["No skills are currently available."]
      : [
          "<available_skills>",
          ...skills.flatMap((skill) => [
            "  <skill>",
            `    <name>${skill.name}</name>`,
            `    <description>${skill.description}</description>`,
            "  </skill>",
          ]),
          "</available_skills>",
        ]),
  ].join("\n")
```

渲染为 XML 格式注入系统提示：

```xml
<available_skills>
  <skill>
    <name>skill-name</name>
    <description>This skill does X</description>
  </skill>
</available_skills>
```

### 集成到 Provider Turn

在 `runTurnAttempt` 中加载（`runner/llm.ts:168-171`）：

```typescript
const loadSystemContext = (agent: AgentV2.Selection) =>
  Effect.all([
    systemContext.load(),       // 全局 Context Sources
    skillGuidance.load(agent), // Skill Guidance（动态）
    referenceGuidance.load(),  // 参考文档
  ], { concurrency: "unbounded" })
    .pipe(Effect.map(SystemContext.combine))
```

- `skillGuidance.load(agent)` 是**每个 Turn 都重新计算的动态 Context Source**
- Agent 切换时自动刷新（因为 agent 参数变化）
- Skill 列表变化 → `SystemContext.reconcile()` 检测到 change → 发布 `ContextUpdated` 事件

---

## Plugin vs Skill 对比

| 维度 | Plugin | Skill |
|------|--------|-------|
| **本质** | 代码级别的扩展（运行 Effect/Promise） | 声明式的知识与指令（Markdown 文件） |
| **扩展范围** | Provider、Agent、Command、AISDK 中间件 | AI 可调用的专项知识和行为指令 |
| **生命周期** | `add()` → Scope 管理 → `remove()` | 文件系统中的 SKILL.md 加载与缓存 |
| **注入方式** | Plugin Host Hooks → 注册到对应 Service | SkillGuidance → SystemContext → 系统提示 |
| **对 AI 可见性** | 间接（通过注册的 Agent/Commands） | 直接（作为 `<available_skills>` 注入提示） |
| **触发方式** | 后台自动生效 | AI 判断匹配后调用 `skill.load(name)` |
| **持久化** | 通过 Plugin 配置（opencode.json） | 通过 Skill Source（目录/URL/嵌入） |
| **可热加载** | ✅（Scope 重建） | ✅（Source 变化后重建） |

### 协同工作

1. Plugin 通过 `SkillHooks` 注册 Skill Source：
   ```typescript
   // packages/plugin/src/v2/effect/skill.ts:9
   export type SkillHooks = Hooks<{
     transform: SkillDraft  // source() / list()
   }>
   ```
2. Plugin 的 `effect(host)` 函数调用 `host.skill.transform(callback)`
3. Callback 通过 `draft.source(source)` 添加 Skill 来源
4. `SkillV2.Service` 的 `transform` 方法累积所有 Plugin 贡献的 Skill Source
5. `SkillGuidance.load()` 将这些 Source 解析为 `Info[]` 并渲染为 Context

---

## 状态管理（Skill）

**文件**：`packages/core/src/skill.ts:62-71`

```typescript
const state = State.create<Data, Draft>({
  initial: () => ({ sources: [] }),
  draft: (draft) => ({
    source: (source) => {
      if (draft.sources.some((item) => Source.equals(item, source))) return
      draft.sources.push(source as Types.DeepMutable<Source>)
    },
    list: () => draft.sources as Source[],
  }),
})
```

- 使用 `State.create`（`packages/core/src/state.ts`）提供可转换的状态管理
- `transform` 方法允许 Plugin 在 Draft 阶段追加 Source
- 完成后通过 `reload` 使缓存失效

---

## 相关文件索引

| 文件 | 内容 |
|------|------|
| `packages/core/src/plugin.ts` | PluginV2 核心：add/remove/wait + Scope 管理 |
| `packages/core/src/plugin/host.ts` | PluginHost：暴露 Hooks 给 Plugin effect |
| `packages/plugin/src/v2/effect/skill.ts` | SkillHooks 接口定义 |
| `packages/plugin/src/v2/effect/agent.ts` | AgentHooks |
| `packages/plugin/src/v2/effect/registration.ts` | Hooks 泛型 + Registration 接口 |
| `packages/schema/src/plugin.ts` | Plugin ID + Event 定义 |
| `packages/schema/src/skill.ts` | Skill Source、Info、EmbeddedSource Schema |
| `packages/core/src/skill.ts` | SkillV2 Service：sources/list/transform + 文件发现 |
| `packages/core/src/skill/guidance.ts` | SkillGuidance：将 Skill 转为 Context Source |
| `packages/core/src/skill/discovery.ts` | 远程 Skill 仓库拉取 |
| `packages/core/src/state.ts` | State 管理（transform/draft 模式） |
| `packages/opencode/src/plugin/tui/runtime.ts` | TUI Plugin 运行时 |
| `packages/plugin/src/tui.ts` | TuiPluginApi 类型定义 |
