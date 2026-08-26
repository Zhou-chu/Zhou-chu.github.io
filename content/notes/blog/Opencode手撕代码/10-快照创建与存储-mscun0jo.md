---
blog: true
title: "10-快照创建与存储"
slug: "10-快照创建与存储-mscun0jo"
summary: "树节点：10 快照创建与存储 父节点：Opencode的工作原理 子节点：10 快照恢复与回滚 概述 Snapshot 模块负责 捕获 Location 范围内文件系统的内容寻址快照 ，本质是对工作区文件状态的时间点快照。底层基于 Git bare repository 存储，每次 capture 生成一个 Git Tree SHA 作为 Snapshot ID。核心用于两步对比（Provider Turn 前后）来检测文件变更，以及为"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
outgoing:
  - "10-快照恢复与回滚-mscun0jq"
---

> 树节点：10-快照创建与存储
> 父节点：[[Opencode的工作原理]]
> 子节点：[[10-快照恢复与回滚]]

---

## 概述

Snapshot 模块负责**捕获 Location 范围内文件系统的内容寻址快照**，本质是对工作区文件状态的时间点快照。底层基于 Git bare repository 存储，每次 capture 生成一个 Git Tree SHA 作为 Snapshot ID。核心用于两步对比（Provider Turn 前后）来检测文件变更，以及为 [[10-快照恢复与回滚]] 提供文件恢复的数据基础。

## Snapshot ID

Snapshot ID 是一个品牌类型字符串，底层是 Git Tree 的 SHA-1 哈希：

```ts
// packages/core/src/snapshot.ts:15-16
export const ID = Schema.String.pipe(Schema.brand("Snapshot.ID"))
export type ID = typeof ID.Type
```

Git 层的对应类型是 `Git.TreeID`：

```ts
// packages/core/src/git.ts:23-24
export const TreeID = Schema.String.pipe(Schema.brand("Git.TreeID"))
export type TreeID = typeof TreeID.Type
```

Snapshot 接口中两个 ID 通过 `ID.make(...)` / `TreeID.make(...)` 互转。

## Snapshot Interface

`Snapshot.Interface` 定义 6 个操作（`packages/core/src/snapshot.ts:43-82`）：

| 方法 | 功能 |
|------|------|
| `capture()` | 捕获当前文件系统状态，返回 `ID` 或 `undefined`（禁用/失败时） |
| `files(input)` | 比较两个快照间变更的文件名列表（无内容/patch） |
| `diff(input)` | 生成结构化的 per-file unified diff，支持 `context` 行数 |
| `preview(input)` | 预览选择性 restore 的结果（不修改 worktree） |
| `restore(input)` | 选择性恢复指定路径到对应树的文件状态 |
| `checkout(snapshot)` | 将工作区整体切换到某个快照树的全部内容 |

## 快照的创建流程

### 1. 前置条件检查

```ts
// packages/core/src/snapshot.ts:124-127
const enabled = Effect.fnUntraced(function* () {
    if (location.vcs?.type !== "git") return false
    return Config.latest(yield* config.entries(), "snapshots") !== false
})
```

快照仅在 VCS 类型为 `git` 且配置 `snapshots` 不为 `false` 时启用。禁用或非 git 项目返回 `undefined`。

### 2. Bare Git Repository 初始化

Snapshot 在全局数据目录下创建**独立的 bare Git repository** 来存储快照树，**不会污染项目自身的 `.git`**：

```ts
// packages/core/src/snapshot.ts:96-98
const gitDirectory = AbsolutePath.make(path.join(
    global.data, "snapshot", location.project.id, Hash.fast(worktree)
))
```

路径结构：`~/.opencode/data/snapshot/<project_id>/<hash(worktree)>/`

如果目录尚未初始化，则从项目的 source repo `seed` 创建：

```ts
// packages/core/src/snapshot.ts:115-122
return yield* git.repo
    .create({
        worktree,
        gitDirectory,
        seed: source,
    })
    .pipe(Effect.mapError((cause) => failure("capture", cause)))
```

### 3. 确定捕获 Scope

捕获范围通过工作区根目录与当前 Location 目录的相对路径计算：

```ts
// packages/core/src/snapshot.ts:100-105
const scope = Effect.fnUntraced(function* () {
    const relative = path.relative(worktree, location.directory)
    if (relative.startsWith("..") || path.isAbsolute(relative))
        return yield* new Error({ operation: "capture", message: "Location is outside the project" })
    return RelativePath.make(relative.replaceAll("\\", "/") || ".")
})
```

Location 必须在项目内部，否则返回错误。

### 4. 执行 capture

```ts
// packages/core/src/snapshot.ts:129-144
const capture = Effect.fn("Snapshot.capture")(function* () {
    if (!(yield* enabled())) return undefined
    return yield* Effect.gen(function* () {
        const repo = yield* repository()
        return ID.make(
            yield* git.tree.capture({
                repository: repo,
                scopes: [yield* scope()],
                ignores: source,
                maximumUntrackedFileBytes: 2 * 1024 * 1024,
            }),
        )
    }).pipe(
        Effect.catch((cause) =>
            Effect.logWarning("failed to capture snapshot", { cause })
                .pipe(Effect.as(undefined))),
    )
})
```

关键参数：
- `scopes`：限定捕获的文件范围（Location 相对路径）
- `ignores`：使用项目 source repo 的 `.gitignore` 规则过滤
- `maximumUntrackedFileBytes`：单文件最大 2MB，超限的 untracked 文件被忽略

底层 `git.tree.capture` 本质是 `git add <scope>` + `git write-tree`：

```ts
// packages/core/src/git.ts:534-548
const captureTree = Effect.fn("Git.tree.capture")(
    (input: {...}) =>
        locked(input.repository, Effect.gen(function* () {
            yield* Effect.forEach(input.scopes, (scope) =>
                refresh({ ...input, scope }),
                { discard: true })
            return yield* writeTree(input.repository)
        })),
)
```

`writeTree` 直接调用 `git write-tree` 获取 Tree SHA：

```ts
// packages/core/src/git.ts:530-531
const writeTree = Effect.fn("Git.tree.write")(function* (repository: Repository) {
    return TreeID.make((yield* repositoryOperation(
        "write_tree", repository, ["write-tree"]
    )).text.trim())
})
```

### 5. 捕获失败的容错

Capture 失败**不会中断** Provider Turn，只记录 warning 并返回 `undefined`：

```ts
Effect.catch((cause) =>
    Effect.logWarning("failed to capture snapshot", { cause })
        .pipe(Effect.as(undefined)))
```

## 触发时机：Provider Turn 的生命周期

Snapshot 在每次 Provider Turn 中采集**两次**，用于检测 LLM 工具调用对文件系统的修改：

### Turn 开始时 → startSnapshot

```ts
// packages/core/src/session/runner/llm.ts:217
const startSnapshot = yield* snapshots.capture()
```

对应事件 `SessionEvent.Step.Started`，`snapshot` 字段记录开始的树 ID（`packages/schema/src/session-event.ts:148-159`）。

### Turn 结束时 → endSnapshot + files diff

```ts
// packages/core/src/session/runner/llm.ts:318-324
const endSnapshot = yield* snapshots.capture()
const files =
    startSnapshot && endSnapshot
        ? yield* snapshots
            .files({ from: startSnapshot, to: endSnapshot })
            .pipe(Effect.catch(() => Effect.succeed(undefined)))
        : undefined
```

对应事件 `SessionEvent.Step.Ended`，包含 `snapshot`（end tree ID）和 `files`（变更文件列表）（`packages/schema/src/session-event.ts:162-183`）。

### 消息快照字段

Assistant 消息中记录 snapshots：

```ts
// packages/core/src/session/message-updater.ts:204
snapshot: event.data.snapshot ? { start: event.data.snapshot } : undefined,

// packages/core/src/session/message-updater.ts:215-220
if (event.data.snapshot || event.data.files)
    draft.snapshot = {
        ...draft.snapshot,
        end: event.data.snapshot,
        files: event.data.files ? Array.from(event.data.files) : undefined,
    }
```

每条 assistant message 携带 `snapshot: { start, end?, files? }` 结构。这是 [[10-快照恢复与回滚]] 中 `plan()` 扫描消息以确定回滚文件范围的依据。

## 文件变更比较

### files() — 仅文件名

```ts
// packages/core/src/snapshot.ts:151-159
const files = Effect.fn("Snapshot.files")(function* (input: CompareInput) {
    const comparison = yield* compare("files", input)
    const files = yield* git.tree.files(comparison)
        .pipe(Effect.mapError((cause) => failure("files", cause)))
    // 过滤掉被 .gitignore 忽略的文件
    if (!source) return files
    const ignored = yield* git.index
        .ignored({ repository: source, paths: files })
    return files.filter((file) => !ignored.has(file))
})
```

底层执行 `git diff --name-only -z <from> <to>`（`packages/core/src/git.ts:550-565`）。

### diff() — 带 unified diff patch

```ts
// packages/core/src/snapshot.ts:161-176
const diff = Effect.fn("Snapshot.diff")(function* (input: DiffInput) {
    // ... 获取文件列表、过滤 ignored ...
    return yield* git.tree.diff({
        ...comparison,
        context: input.context,
        paths: (input.paths ?? files).filter((file) => !ignored.has(file)),
    })
})
```

底层对每个文件执行 `git diff --name-status` + `git diff --numstat` + `git diff --unified=<N>`（`packages/core/src/git.ts:567-617`），返回 `File.Diff[]`。

## 文件变更跟踪（FileMutation）

`FileMutation` 模块（`packages/core/src/file-mutation.ts`）**不直接参与 snapshot 机制**——它只负责文件写入/删除的原子性与锁安全，snapshot 的变更检测完全依赖 Git tree diff。

```ts
// packages/core/src/file-mutation.ts:74-79
const layer = Layer.effect(Service, Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const locks = KeyedMutex.makeUnsafe<string>()
    const withTargetLock = (target: Target) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        locks.withLock(target.canonical)(Effect.uninterruptible(effect))
    // ...
```

操作通过 `KeyedMutex` 按 canonical path 串行化，避免同一文件的并发写冲突。提供 `write`、`writeIfUnchanged`（条件写入）、`create`（原子创建）、`remove` 四个操作。

## Snapshot 存储架构

```text
~/.opencode/data/snapshot/
  <project_id>/
    <hash(worktree)>/    ← 独立的 bare Git 仓库
      HEAD
      objects/           ← Git 对象（tree, blob）
      refs/
      index
```

- 每个 (project, worktree) 组合拥有独立的 bare Git 仓库
- 每次 `capture()` 在仓库中创建新的 tree 对象，Snapshot ID = tree SHA
- **不做** git commit —— 仅存储 tree 对象，Git 的垃圾回收不会主动清理未引用的 tree
- `noopLayer`（`packages/core/src/snapshot.ts:238-248`）提供所有操作返回空值的无操作实现，用于测试或快照禁用的场景

## 关键设计决策

1. **容错优先**：capture 失败返回 `undefined` 而非抛出错误，避免中断 Provider Turn
2. **隔离存储**：使用独立 bare Git 仓库，不污染项目 `.git` 历史
3. **Scope 限定**：仅捕获 Location 范围内的文件（如项目子目录）
4. **ignore 尊重**：通过 source repo 的 `.gitignore` 过滤不应追踪的文件
5. **大小限制**：单 untracked 文件最大 2MB，防止大文件拖慢快照

---

## 源文件引用

| 文件 | 核心内容 |
|------|---------|
| `packages/core/src/snapshot.ts:15-16` | Snapshot.ID 品牌类型 |
| `packages/core/src/snapshot.ts:18-22` | Snapshot.Error 错误类型 |
| `packages/core/src/snapshot.ts:43-82` | Snapshot Interface 定义 |
| `packages/core/src/snapshot.ts:94-98` | Bare Git 仓库路径构造 |
| `packages/core/src/snapshot.ts:107-122` | 仓库创建/复用逻辑 |
| `packages/core/src/snapshot.ts:124-127` | enabled 检查（git + 配置） |
| `packages/core/src/snapshot.ts:129-144` | capture() 核心实现 |
| `packages/core/src/snapshot.ts:151-159` | files() 变更文件列表 |
| `packages/core/src/snapshot.ts:161-176` | diff() 结构化 diff |
| `packages/core/src/snapshot.ts:219-224` | checkout() 全量切换 |
| `packages/core/src/snapshot.ts:238-248` | noopLayer 空操作实现 |
| `packages/core/src/git.ts:23-24` | Git.TreeID 品牌类型 |
| `packages/core/src/git.ts:530-531` | writeTree（git write-tree） |
| `packages/core/src/git.ts:534-548` | captureTree（git add + write-tree） |
| `packages/core/src/git.ts:550-565` | treeFiles（git diff --name-only） |
| `packages/core/src/git.ts:567-617` | treeDiff（per-file unified diff） |
| `packages/core/src/file-mutation.ts:74-79` | KeyedMutex 文件锁 |
| `packages/core/src/file-mutation.ts:54-65` | FileMutation Interface |
| `packages/core/src/session/runner/llm.ts:217` | startSnapshot capture |
| `packages/core/src/session/runner/llm.ts:318-324` | endSnapshot + files diff |
| `packages/core/src/session/message-updater.ts:204,215-220` | 消息 snapshot 字段写入 |
| `packages/schema/src/session-event.ts:148-159` | Step.Started 事件（snapshot） |
| `packages/schema/src/session-event.ts:162-183` | Step.Ended 事件（snapshot + files） |
