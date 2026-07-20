export type PublicNote = {
  id: string | number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  publishedAt: string;
  featured?: number | boolean;
  readMinutes?: number;
  sourcePath?: string;
  outgoing?: string[];
  backlinks?: string[];
};

export const sampleNotes: PublicNote[] = [
  {
    id: "c1",
    slug: "explain-complex-systems-clearly",
    title: "把复杂系统讲清楚：我的技术写作方法",
    summary: "从混乱草稿走向清晰文章的可复用流程，以及三个自检问题。",
    category: "写作",
    publishedAt: "2026-07-08",
    featured: true,
    content: `# 把复杂系统讲清楚

技术写作不是把知道的全部倒出来，而是替读者设计一条阻力足够小的理解路径。

## 先找到文章的唯一任务

动笔前，先问：读者读完后应该能够做什么？如果一句话无法回答，文章通常还没有真正聚焦。

## 让结构承担解释工作

- 先给出读者熟悉的场景
- 再指出真正的矛盾或限制
- 最后给出可以验证的解决方案

> 清晰不是信息更少，而是每条信息都出现在恰当的位置。

写完以后，我会删掉所有不能帮助读者继续前进的段落。好文章并不展示作者走过的全部弯路，只保留读者真正需要走的那条路。`,
  },
  {
    id: "c2",
    slug: "building-a-second-brain",
    title: "构建第二大脑：从收集到创造",
    summary: "让旧想法在正确时刻，重新进入新的工作与创造。",
    category: "方法",
    publishedAt: "2026-06-26",
    featured: true,
    content: `# 构建第二大脑

真正有用的第二大脑，不是一座资料仓库，而是一套让旧想法持续参与新工作的机制。

## 收集不是终点

只有当一条信息与正在推进的问题发生联系，它才从“收藏”变成了“知识”。因此我更关心笔记下一次会在哪里出现，而不是它应该被放进哪个完美分类。

## 一个轻量流程

1. 记录当下真正触动自己的内容
2. 用自己的语言补上一句解释
3. 把笔记连接到正在进行的项目
4. 定期把多个小片段组合成文章

系统越轻，越容易长期使用。`,
  },
  {
    id: "c3",
    slug: "three-principles-of-react-state",
    title: "React 状态设计的三个朴素原则",
    summary: "减少重复状态，让数据来源保持唯一。",
    category: "技术",
    publishedAt: "2026-06-03",
    featured: true,
    content: `# React 状态设计

能计算出来的数据，就不要重复保存。状态越少，组件之间需要保持同步的关系也越少。

## 三个原则

1. 为每一份状态确定唯一所有者
2. 派生数据在渲染时计算
3. 用事件描述发生了什么，而不是直接编排多个状态变化

\`useMemo\` 可以优化昂贵计算，但它不应该被用来修复数据模型本身的混乱。先让状态关系正确，再讨论性能。`,
  },
  {
    id: "c4",
    slug: "the-use-of-useless-time",
    title: "在日常里保留无用之用",
    summary: "散步、发呆与漫无目的的阅读。",
    category: "随想",
    publishedAt: "2026-06-12",
    content: `# 无用之用

有些时间看起来没有产出，却在恢复我们感知世界的能力。

当日程被目标填满，注意力会越来越擅长筛选，却越来越不容易惊讶。散步、发呆和漫无目的的阅读，给偶然性留出了位置。

我开始刻意保留一些不被衡量的时间。它们没有待办事项，也不需要在结束时交付结果。很多重要想法，恰好从这些缝隙中长出来。`,
  },
  {
    id: "c5",
    slug: "what-remains-after-reading",
    title: "读完一本书后，我会留下什么",
    summary: "一份轻量但可持续的读书笔记模板。",
    category: "阅读",
    publishedAt: "2026-05-18",
    content: `# 读完一本书后

读书笔记不是缩短版原书，而是一次与作者观点的真实交锋。

## 我只留下四件事

- 这本书试图回答的问题
- 最改变我看法的一条论证
- 我仍然不同意的地方
- 接下来可以实践的一个动作

记录不是为了证明自己读过，而是让阅读在合上书之后仍然继续发生。`,
  },
];
