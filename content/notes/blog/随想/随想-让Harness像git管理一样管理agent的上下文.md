---
blog: true
title: "让 Harness 像 git 一样管理 Agent 的上下文"
slug: "harness-git-style-agent-context"
summary: "把 Git 的版本管理哲学搬到 Agent 的上下文管理里，做 Context as Code——一些随想与延伸。"
date: 2026-09-05
category: "随想"
featured: false
tags:
  - "Harness"
  - "Agent"
  - "上下文管理"
  - "随想"
---

这个想法很有意思，把 Git 的版本管理哲学搬到 Agent 的上下文管理里，本质上是在做 **“Context as Code”**。下面是我的一些随想和延伸，尽量保持脑暴的开放感。


---
## 1. 核心隐喻：把 Agent 上下文当作一个代码仓库

Git 管的是文件和目录，Harness 管的可以是：

- 消息历史（messages）
- 工具调用与结果（tool calls / observations）
- 长期记忆（memory / knowledge）
- 系统提示、人设、约束
- 世界模型 / 状态变量
- 甚至 Token 预算、模型参数等元信息

这些共同构成一个 **ContextState**。
每一次 Agent 的“观察-思考-行动”循环，都可以看作一次对 ContextState 的修改，自动产生一个 commit。


---
## 2. 能力映射表


| Git 概念 | 对应到 Agent 上下文 |
|---------|------------------|
| commit | 上下文快照，记录某一步前后的变化 |
| branch | 不同探索路径 / 假设空间 |
| merge | 合并多个分支的发现、记忆或工具结果 |
| diff | 查看上下文在两次步骤间的语义变化 |
| stash | 暂存当前上下文，切换去试别的思路 |
| tag | 标记关键节点，如“任务完成”“模型切换前” |
| log | 审计上下文演变历史 |
| cherry-pick | 只把某个分支里的某条工具结果或记忆应用到当前 |
| rebase | 把实验分支重新放到主线最新状态上，保持历史线性 |
| remote | 共享上下文仓库，支持多 Agent 协作 |
| blame | 查看某条上下文信息是谁、哪一步引入的 |


---
## 3. 一些可能的工作流


### 3.1 多策略探索

```
main:    c0 → c1 → c2
                   \
strategy-A:         c3 → c4 (用工具A查询，得到结果)
strategy-B:         c5 → c6 (用工具B查询，得到结果)
                   /
main:    c0 → c1 → c2 → c7 (merge A 和 B 的有用信息)
```

Agent 可以先在 `strategy-A` 上尝试一种工具，如果效果不好，切回 `main` 再开 `strategy-B`。最后合并时，保留两个分支中有效的工具结果，丢弃重复或冲突的记忆。


### 3.2 回滚与重试

Agent 执行到一半发现方向错了，可以：

```python
ctx.checkout("last_good_state")
ctx.branch("new_attempt")
```

从历史某个安全点重新开始，而不需要手动清理上下文。


### 3.3 多 Agent 协作

每个 Agent 在自己的分支上工作，定期 push 到远程上下文仓库。
主 Agent 或人类负责 review 和 merge，类似 PR 流程。

```python
agent_a.push("origin/feature/web-search")
agent_b.push("origin/feature/code-analysis")
main_agent.merge("origin/feature/web-search")
main_agent.merge("origin/feature/code-analysis")
```

---
## 4. 设计原则


### 4.1 不可变性与内容寻址

像 Git 的 objects 一样，每个 ContextState 都应该有唯一哈希。
相同的上下文快照指向同一个对象，避免重复存储。


### 4.2 事件溯源 + 定期快照

不必每次都存完整快照，可以存储“事件”：

```
事件: add_message(role=assistant, content=...)
事件: update_memory(key="user_name", value="Alice")
事件: tool_result(tool="search", output=...)
```

状态可以从事件重放得到。
为了性能，定期做快照（checkpoint），事件日志可以压缩。


### 4.3 可插拔的合并策略

上下文合并不像代码 merge 那样有明确的行级冲突。需要针对不同字段定义策略：

- 消息列表：通常是追加，但可能去重
- 记忆键值对：冲突时可选“新值覆盖”“保留双方”“LLM 仲裁”
- 工具结果：按工具名和查询参数判断是否等价
- 自由文本：可以用语义相似度判断是否重复

合并策略可以做成插件，比如：

```python
ctx.merge("exp-1", strategy={
    "messages": "append_dedup",
    "memory": "llm_arbitrate",
    "tools": "union_by_tool_name"
})
```

### 4.4 语义 Diff

传统 Git diff 是行级文本 diff，但上下文变化可能是：

- “用户偏好从‘简洁回答’变为‘详细解释’”
- “新增了一条关于项目的记忆”
- “工具调用结果从失败变为成功”

所以需要一个 **语义 diff** 层，能生成人类可读的变更摘要，而不是展示 JSON 差异。


---
## 5. 技术难点与可能解法


### 5.1 上下文规模大

如果每次 commit 都存完整快照，存储开销会爆炸。
解法：
- 增量存储，只保存变更事件
- 使用内容寻址去重
- 对长文本/向量做摘要存储，需要时再展开


### 5.2 合并冲突

两个分支可能同时修改同一个记忆键，或者生成了语义相似但表达不同的知识。
解法：
- 字段级合并规则
- 引入 LLM 作为合并仲裁者，输入三方版本，输出合并结果
- 保留冲突标记，让人类或主 Agent 后续处理


### 5.3 非确定性

同一个上下文状态下，LLM 可能给出不同输出，所以版本化并不能保证完全可复现。
解法：
- 记录模型版本、温度、随机种子等元信息
- 把“非确定性”本身也作为上下文的一部分，比如记录多个候选输出


### 5.4 自动提交的粒度

如果每一步都自动 commit，历史会非常嘈杂；如果粒度太粗，又失去了回滚能力。
解法：
- 按“逻辑步骤”自动提交，例如一次完整的工具调用循环
- 支持手动 commit，Agent 或用户标记重要节点
- 可以设置规则：当上下文变化超过某个阈值（如新增信息量）才自动提交


---
## 6. 一个最小可行实现（MVP）的草图

```python
class ContextRepo:
    def __init__(self):
        self.objects = {}      # hash -> ContextState
        self.refs = {}         # branch_name -> commit_hash
        self.head = None       # 当前 commit_hash
        self.events = []       # 事件日志

    def snapshot(self) -> str:
        """对当前状态做快照，返回 hash"""
        state_hash = hash(self.current_state)
        self.objects[state_hash] = deepcopy(self.current_state)
        return state_hash

    def commit(self, message: str, author: str = "agent"):
        """保存当前状态为一个 commit"""
        parent = self.head
        new_hash = self.snapshot()
        self.commits[new_hash] = Commit(parent=parent, message=message, author=author)
        self.refs[self.current_branch] = new_hash
        self.head = new_hash
        return new_hash

    def branch(self, name: str):
        self.refs[name] = self.head

    def checkout(self, name: str):
        self.head = self.refs[name]
        self.restore_state(self.objects[self.head])

    def merge(self, other_branch: str, strategy: dict):
        base = self.find_merge_base(self.current_branch, other_branch)
        ours = self.objects[self.head]
        theirs = self.objects[self.refs[other_branch]]
        merged = merge_strategy(ours, theirs, base, strategy)
        new_hash = self.save_state(merged)
        self.head = new_hash
        self.refs[self.current_branch] = new_hash
```

这只是一个非常粗的骨架，真正的难点在 `merge_strategy` 和 `restore_state` 上。


---
## 7. 扩展想象：从“上下文 Git”到“ContextOps”

如果 Harness 真的像 Git 一样管理上下文，那很多 Git 生态的玩法都可以搬过来：

- **Context CI**：每次 commit 后自动运行评估流水线，检查上下文是否引入了有害内容、信息丢失、逻辑矛盾
- **Context Review**：像 code review 一样 review 上下文变更，尤其在多 Agent 协作时
- **Context Marketplace**：把优秀的上下文模板（例如“客服 Agent 上下文”“代码审查 Agent 上下文”）打包成仓库，供他人 clone
- **Context Blame**：当 Agent 给出错误答案时，追踪到是哪一步引入了错误信息
- **Context GC**：定期清理旧的、不再引用的上下文快照，回收存储


---
## 8. 开放问题

- 上下文状态应该设计成什么样的 schema，才能最大化可合并性和可 diff 性？
- 自动 commit 的触发条件是什么？如何避免历史噪音？
- 合并冲突时，LLM 仲裁的成本和延迟是否可以接受？有没有更轻量的规则？
- 如何保证上下文仓库的安全性？比如敏感信息的访问控制、历史版本的脱敏
- 是否需要一个“上下文索引”，能快速检索历史上出现过的某条信息？


---

这个方向如果做深，可能会催生出一类新的 Agent 基础设施，让 Agent 的开发、调试、协作和审计都变得像现代软件开发一样可追溯、可回滚、可并行。值得继续挖。
## 问答2
+ git自身是开源的吗？我可以这样理解：把git视为“人类自己就是agent”的开发，人类自己的开发，开发过程中的日志记录往往远不如agent清晰和详细，我能不能做出来一个基于git的扩展工具，在git的基础上引入分支路径上的agent日志，然后合并、回滚等等采用特定的某些上下文处理机制，甚至于采纳cordis插件系统，把这些节点的上下文处理机制交给社区开发者
	+ git 本身是开源的，采用 GPL v2 许可证，最初由 Linus Torvalds 在 2005 年为了管理 Linux 内核开发而创建，现在由全球社区共同维护。所以从法律和工程上，你完全可以基于 git 做二次开发和扩展。

你提出的这个类比很有意思：**把 git 看作“人类自己作为 agent”的开发记录工具**。人类在写代码时，git 主要记录的是“结果快照”和简短的提交信息，而思考过程、尝试性修改、推理依据、失败的分支探索，大部分都丢失在脑海或临时的编辑器操作里。相比之下，一个 AI agent 在执行任务时，理论上可以自动、完整地记录下每一步的推理轨迹、工具调用、状态变化、外部反馈等。如果把这些日志系统地嵌入 git 的分支模型中，确实可以让 git 从“代码版本控制”升级为“agent 行为与上下文版本控制”。

你的想法——**基于 git 做一个扩展工具，在分支路径上引入 agent 日志，并让合并、回滚等操作采用可插拔的上下文处理机制，甚至用 Cordis 这样的插件系统交给社区开发者**——是完全可行的，而且我认为方向很有价值。下面展开说说我的理解和一些实现思路。


---
### 1. git 的底层能力恰好适合作为存储和分支基础

git 的本质是一个内容寻址的文件系统，它存储的是对象（blob、tree、commit），并且天然支持分支、合并、回滚、标签、分布式协作。这些能力可以直接复用：

- **快照**：agent 的每一个关键状态（对话历史、工具调用结果、内存变量、知识库引用等）可以序列化成一个 tree 或 blob，然后用一个 commit 指向它。
- **分支**：从任意 commit 创建新分支，让 agent 探索不同推理路径，互不干扰。
- **回滚**：`git reset` 或 `git checkout` 就能回到之前的健康状态。
- **历史追溯**：`git log` 可以展示 agent 执行过程的提交链，配合详细的 commit message 或 notes，形成审计轨迹。

你不需要重新发明版本控制，只需要定义好“上下文状态”如何映射到 git 对象。


### 2. 如何把 agent 日志嵌入 git

一个直接的办法是使用 **git notes**。git notes 允许你给任意 commit 附加额外的元数据，而不改变 commit 本身。你可以把每个 commit 对应的 agent 详细日志（推理步骤、工具输入输出、模型参数、环境快照等）作为一个 note 存储。这样：

- 原有的 git 历史仍然干净，不影响代码 diff 和协作。
- 日志可以单独推送到远程，也可以按需拉取。
- 合并时，notes 的处理可以交给自定义策略。

另一个办法是使用 **自定义 refs**，比如 `refs/agent-context/<branch>`，专门存储上下文状态和日志，与代码 refs 分离。这样更灵活，甚至可以在同一个仓库里同时管理多个 agent 的上下文轨迹。


### 3. 合并与回滚的“上下文处理机制”需要插件化

git 原生对文本文件的合并有一套算法（基于行），但对结构化 JSON、对话历史、向量索引等并不适用。所以你需要定义**自定义合并驱动（custom merge driver）**，或者干脆在 git 之外做合并，然后把结果写回 git。

这正是你提到 Cordis 插件系统可以发挥作用的地方。Cordis（来自 Koishi 生态）提供了一套依赖注入、事件、生命周期管理的插件框架，非常适合构建可扩展的工具。你可以设计一个核心系统，暴露以下扩展点：

- **上下文序列化/反序列化插件**：不同 agent 框架、不同数据类型（对话、工具调用、知识库）如何转换成 git 对象。
- **合并策略插件**：当两个分支的上下文发生冲突时，如何处理？例如：
  - 对话历史：保留用户消息，合并不同分支的 assistant 回复。
  - 工具结果：如果双方读取了不同数据，可能需要合并结果集。
  - 变量状态：采用时间戳最新、或用户自定义优先级。
  - 可以让社区开发者实现针对特定场景的合并算法。
- **回滚策略插件**：回滚到某个 commit 后，是否需要触发环境重建？是否需要清理外部资源？
- **日志摘要插件**：自动为每个 commit 生成有意义的描述，而不是简单地记录“checkpoint”。
- **冲突检测插件**：判断两个分支的上下文是否可以自动合并，或者需要人工/LLM 介入。

Cordis 的生命周期管理可以让这些插件按需加载、互相通信，并且方便社区贡献。


### 4. 一个可能的架构草图

```
+-------------------+
|   CLI / API       |  用户通过命令或代码操作
+-------------------+
        |
+-------------------+
|  Core Engine      |  负责调用 git 底层、管理 refs、触发插件
+-------------------+
   |        |        |
   |        |        +-- 插件系统（Cordis）
   |        |             |
   |        |             +-- 序列化插件
   |        |             +-- 合并策略插件
   |        |             +-- 回滚插件
   |        |             +-- 日志生成插件
   |        |             +-- ...
   |        |
   v        v
+-------------------+
|  Git Object Store |  实际存储上下文快照和日志
+-------------------+
```

你可以让这个工具独立于现有的 git 工作流，作为一个单独的命令（比如 `actx`），它内部调用 git 命令或使用 git 库（如 go-git、libgit2）。这样不会破坏用户现有的仓库，也更容易控制。


### 5. 需要面对的挑战

- **非确定性**：LLM 的输出每次可能不同。即使从同一个 commit 出发，再次执行也可能产生不同结果。你需要在日志中记录模型版本、温度、随机种子、提示词等环境信息，才能尽量可复现。这会让快照的“相等”定义变得复杂。
- **存储膨胀**：agent 日志可能包含大量非结构化文本，频繁 commit 会导致仓库迅速变大。你需要设计增量存储、压缩、或把大型日志外置到对象存储（如 S3）而只在 git 中存引用。
- **合并语义的模糊性**：自然语言对话的合并很难像代码行那样“三路合并”。你可能需要引入 LLM 辅助合并，或者定义一套基于 JSON Patch 的操作，只合并可交换的部分，其余留给用户手动解决。
- **与现有 agent 框架的集成**：Harness 或其他框架需要暴露上下文状态和事件钩子，你的工具才能捕获到“提交点”。这可能需要定义一套标准接口，或者为流行框架写适配器插件。


### 6. 我的建议

这个想法很值得做一个小型原型。可以从最简单的场景开始：

1. 选择一个你熟悉的 agent 框架，在关键步骤（如每次工具调用后）把完整上下文序列化为 JSON 文件，放进一个 git 仓库。
2. 每次状态变化后自动 `git add` 和 `git commit`，提交信息由 LLM 自动生成一句话摘要。
3. 尝试从不同分支出发，分别跑不同的 prompt，看看合并时会发生什么。
4. 把合并策略写成可插拔的 Python/TypeScript 函数，验证 Cordis 或类似插件系统的必要性。

一旦原型跑通，你就能更清楚地知道哪些部分需要标准化、哪些可以交给社区。

**总结**：你的类比很准确——git 是人类开发过程的“结果记录”，而 agent 可以记录更丰富的“过程轨迹”。基于 git 构建一个支持 agent 日志、分支合并和插件化上下文处理的工具，在技术上完全可行，而且很可能成为 agent 开发流程中缺失的一环。Cordis 这样的插件框架能帮助你把生态做起来。如果感兴趣，可以进一步讨论具体的技术选型和数据模型设计。
