---
blog: true
title: "Chapter 8-Primal and Dual Projected Subgradient Methods"
slug: "chapter-8-primal-and-dual-projected-subgradient-methods-jadr3iq"
summary: "从梯度下降到次梯度下降，再到带投影的次梯度方法：Polyak 步长、Fejér 单调、随机/增量/对偶变体，以及 O(1/√k)、O(log k/√k)、O(1/k) 一族收敛速率。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
tags:
  - "最优化"
  - "凸优化"
  - "Beck"
  - "投影次梯度法"
---

> **Underlying Space.** In this chapter $\mathbb{E}$ is a Euclidean space, meaning a finite dimensional space endowed with an inner product $\langle\cdot,\cdot\rangle$ and the Euclidean norm $\|\cdot\|=\sqrt{\langle\cdot,\cdot\rangle}$.

这是全书的枢纽章之一：前面 §6 讲投影算子 $\mathcal{P}_C$（Thm 6.42 的非扩张性会是全章的"万能钥匙"），§3 讲次梯度与支撑函数，§5 讲强凸性。**本章把它们焊在一起**——把"朝负次梯度走一步 + 投影回可行集"变成一套可分析收敛的算法。

全章主线一句话：**次梯度方向不一定是下降方向**（这是和梯度法最本质的区别），所以整个收敛理论不能靠"函数值单调下降"来证明，而要靠"到最优集的距离不增（Fejér 单调）"这种更弱的几何不变量来兜底。

# 8.1 From Gradient Descent to Subgradient Descent

## 8.1.1 Descent Directions?

考虑无约束问题
$$(\mathrm{P})\qquad \min\{f(\mathbf{x}):\mathbf{x}\in\mathbb{E}\}.$$
若 $f$ 处处可微，经典做法就是梯度法（最速下降）：
$$\mathbf{x}_{k+1}=\mathbf{x}_k-t_k\nabla f(\mathbf{x}_k),\tag{8.1}$$
其中 $t_k>0$ 是恰当选的步长。梯度法之所以好用，是因为 $-\nabla f(\mathbf{x}_k)$ 总是一个**下降方向**。

## 定义 8.1 · 下降方向 (descent direction)
> **Definition 8.1** (descent direction). Let $f:\mathbb{E}\to(-\infty,\infty]$ be an extended real-valued function, and let $\mathbf{x}\in\mathrm{int}(\mathrm{dom}(f))$. A vector $\mathbf{0}\neq\mathbf{d}\in\mathbb{E}$ is called a **descent direction** of $f$ at $\mathbf{x}$ if the directional derivative $f'(\mathbf{x};\mathbf{d})$ exists and is negative.

**逐字点评**：下降方向的定义只看一件事——方向导数 $f'(\mathbf{x};\mathbf{d})$ 存在且 $<0$。它不要求 $f$ 可微，只要求在这个特定方向上有方向导数。**这是 Beck 在埋钩子**：把"函数在该方向能降"这个概念从"可微"里剥离出来，正是为了给后面不可微的"次梯度方向"腾位置。

**为什么要求 $\mathbf{x}\in\mathrm{int}(\mathrm{dom}(f))$**：方向导数定义里要取 $\mathbf{x}+t\mathbf{d}$，必须保证小步长后仍落在定义域内。边界点附近根本没法定义"沿所有方向的小步长"，所以这条假设是技术上的卫生条件。

## 引理 8.2 · 下降方向的局部下降性
> **Lemma 8.2** (descent property of descent directions). Let $f:\mathbb{E}\to(-\infty,\infty]$ be an extended real-valued function. Let $\mathbf{x}\in\mathrm{int}(\mathrm{dom}(f))$, and assume that $\mathbf{0}\neq\mathbf{d}\in\mathbb{E}$ is a descent direction of $f$ at $\mathbf{x}$. Then there exists $\varepsilon>0$ such that $\mathbf{x}+t\mathbf{d}\in\mathrm{dom}(f)$ and $f(\mathbf{x}+t\mathbf{d})<f(\mathbf{x})$ for any $t\in(0,\varepsilon]$.

### 自己推一遍
方向导数 $f'(\mathbf{x};\mathbf{d})=\lim_{t\downarrow 0}\frac{f(\mathbf{x}+t\mathbf{d})-f(\mathbf{x})}{t}<0$。由极限的保号性，存在 $\varepsilon>0$ 使对所有 $t\in(0,\varepsilon]$，差商 $<0$，即 $f(\mathbf{x}+t\mathbf{d})<f(\mathbf{x})$。而 $\mathbf{x}\in\mathrm{int}(\mathrm{dom}(f))$ 保证小步长时 $\mathbf{x}+t\mathbf{d}\in\mathrm{dom}(f)$。$\blacksquare$

**关键一句话**：定义只给"瞬时下降"，引理把"瞬时"放大成"一小段都下降"。这是梯度法能保证每次迭代都降的根据。

回到梯度法：只要 $\nabla f(\mathbf{x}_k)\neq\mathbf{0}$，就有
$$f'(\mathbf{x}_k;-\nabla f(\mathbf{x}_k))=\langle\nabla f(\mathbf{x}_k),-\nabla f(\mathbf{x}_k)\rangle=-\|\nabla f(\mathbf{x}_k)\|^2<0,\tag{8.2}$$
（这里用了 Thm 3.29：可微点的方向导数等于内积）。于是 $-\nabla f(\mathbf{x}_k)$ 是下降方向，由 Lemma 8.2 知道步长总能选得使函数值下降。一种保证下降的选法就是**精确线搜索 (exact line search)**：$t_k\in\arg\min_{t\ge 0}f(\mathbf{x}_k-t\nabla f(\mathbf{x}_k))$。

### 不可微时的自然推广：次梯度法
若 $f$ 不可微，式 (8.1) 没定义。在凸性假设下，自然用次梯度替掉梯度（任意取一个）：
$$\mathbf{x}_{k+1}=\mathbf{x}_k-t_k\mathbf{g}_k,\qquad \mathbf{g}_k\in\partial f(\mathbf{x}_k).\tag{8.3}$$
**梯度法和次梯度法的一个本质差别**（书上特意强调）：**负次梯度方向不一定是下降方向**。这意味着式 (8.3) 里步长不能像精确线搜索那样保证"函数值一定降"——这正是本章所有收敛理论都要绕开"单调下降"的根本原因。

## 例 8.3 · 非下降的次梯度方向 (non-descent subgradient direction)
> **Example 8.3** (non-descent subgradient direction). Consider the function $f:\mathbb{R}\times\mathbb{R}\to\mathbb{R}$ given by $f(x_1,x_2)=|x_1|+2|x_2|$. Then
> $$\partial f(1,0)=\{(1,x):|x|\le 2\}.$$
> In particular, $(1,2)\in\partial f(1,0)$.
> However, the direction $-(1,2)$ is not a descent direction.

### 自己推一遍
取 $(1,2)\in\partial f(1,0)$。沿 $-(1,2)$ 的函数值：
$$g(t)\equiv f((1,0)-t(1,2))=f(1-t,-2t)=|1-t|+4t=
\begin{cases}
1+3t, & t\in(0,1],\\
5t-1, & t\ge 1.
\end{cases}\tag{8.4}$$
于是右方向导数
$$f'((1,0);-(1,2))=g'_+(0)=3>0,$$
所以 $-(1,2)$ 不是下降方向。更狠的是由 (8.4) 直接看出 $f((1,0)-t(1,2))\ge 1=f(1,0)$ 对一切 $t>0$ 成立——整条射线上的点函数值都比起点大。

**作者注**：这个例子来自 Vandenberghe 的讲义。它的"反直觉"在于：次梯度 $(1,2)$ 在数学上完全合法（满足次梯度不等式），但它指的方向不但不降，反而一路抬高函数值。**结论**：次梯度法不能依赖"每步下降"，必须换个收敛判据——这正是 §8.2 投影次梯度法的出发点。

## 8.1.2 Wolfe's Example

为了体会"不可微性"有多阴险，回忆 Wolfe 的著名反例：对一个**处处（在迭代点上）可微**的凸函数用精确线搜索梯度法，函数值严格单调下降，序列却收敛到一个**非最优**点。

设 $\gamma>1$，函数
$$f(x_1,x_2)=
\begin{cases}
\sqrt{x_1^2+\gamma x_2^2}, & |x_2|\le x_1,\\[4pt]
\dfrac{x_1+\gamma|x_2|}{\sqrt{1+\gamma}}, & |x_2|>x_1.
\end{cases}\tag{8.5}$$
书上的 Lemma 8.5 证明 $f$ 是某个闭凸集的支撑函数，从而本身闭且凸，并给出任意点的次微分。证明要用到一个技术引理。

## 引理 8.4 · 带一个额外约束的 max 的解
> **Lemma 8.4.** Consider the problem
> $$(\mathrm{P})\qquad \max\{g(\mathbf{y}):f_1(\mathbf{y})\le 0,\ f_2(\mathbf{y})\le 0\},$$
> where $g:\mathbb{E}\to\mathbb{R}$ is concave and $f_1,f_2:\mathbb{E}\to\mathbb{R}$ are convex. Assume that the problem $\max\{g(\mathbf{y}):f_1(\mathbf{y})\le 0\}$ has a unique solution $\tilde{\mathbf{y}}$. Let $Y^*$ be the optimal set of problem $(\mathrm{P})$. Then exactly one of the following two options holds:
> (i) $f_2(\tilde{\mathbf{y}})\le 0$, and in this case $Y^*=\{\tilde{\mathbf{y}}\}$;
> (ii) $f_2(\tilde{\mathbf{y}})>0$, and in this case $Y^*=\arg\max\{g(\mathbf{y}):f_1(\mathbf{y})\le 0,\ f_2(\mathbf{y})=0\}$.

**为什么这个引理关键**：它把一个"两个不等式约束"的 max 化简成"要么原无约束解就可行、要么第二个约束必须取等号"。这是处理支撑函数 max 时切分 $|x_2|\le x_1$ 与 $|x_2|>x_1$ 两区域的工具。

## 引理 8.5 · Wolfe 函数 = 支撑函数
> **Lemma 8.5.** Let $f$ be given by (8.5). Then
> (a) $f=\sigma_C$, where
> $$C=\left\{(y_1,y_2)\in\mathbb{R}\times\mathbb{R}:\ y_1^2+\frac{y_2^2}{\gamma}\le 1,\ y_1\ge \frac{1}{\sqrt{1+\gamma}}\right\};$$
> (b) $f$ is closed and convex;
> (c)
> $$\partial f(x_1,x_2)=
> \begin{cases}
> C, & x_1=x_2=0,\\[4pt]
> \dfrac{(x_1,\gamma x_2)}{\sqrt{x_1^2+\gamma x_2^2}}, & |x_2|\le x_1,\ x_1\neq 0,\\[8pt]
> \left(\dfrac{1}{\sqrt{1+\gamma}},\ \dfrac{\gamma\,\mathrm{sgn}(x_2)}{\sqrt{1+\gamma}}\right), & |x_2|>x_1,\ x_2\neq 0,\\[8pt]
> \left\{\dfrac{1}{\sqrt{\gamma+1}}\right\}\times\left[-\dfrac{\gamma}{\sqrt{1+\gamma}},\ \dfrac{\gamma}{\sqrt{1+\gamma}}\right], & x_2=0,\ x_1<0.
> \end{cases}$$

**逐字点评**：
- (a) 把 $f$ 写成支撑函数 $\sigma_C(\mathbf{x})=\max_{\mathbf{y}\in C}\langle\mathbf{x},\mathbf{y}\rangle$。回忆 Ch2/§2.4：**非空闭凸集的支撑函数永远闭且凸**（Lemma 2.23）——所以 (b) 是 (a) 的免费副产品，这就是"Beck 在埋钩子"：用支撑函数统一解决闭性+凸性。
- (c) 的次微分形状值得记住：在 $|x_2|\le x_1$ 区域，次梯度就是归一化的 $(x_1,\gamma x_2)$；在 $|x_2|>x_1$ 区域退化成两个分量都固定的点；在 $x_1<0$ 的 $x_2=0$ 轴上是一段竖直线段（因为那里不可微）。
- 推导 (c) 调用了 **共轭次梯度定理 (Corollary 4.21)**：对支撑函数 $\partial\sigma_C(\mathbf{x})=\arg\max_{\mathbf{y}\in C}\{\langle\mathbf{x},\mathbf{y}\rangle-\delta_C^*(\mathbf{y})\}=\arg\max_{\mathbf{y}\in C}\langle\mathbf{x},\mathbf{y}\rangle$。前向引 Ch4 共轭。

**一个值得记住的细节**：由 Lemma 8.5(c) 配合 Thm 3.33 可知，$f$ 只在 $x_1$ 轴的非正半轴上不可微。也就是说——梯度法生成的点恰好都落在可微区域，这正是 Wolfe 反例"看起来绕过了不可微性"的原因。

## 引理 8.6 · Wolfe 函数上精确线搜索梯度法的"陷阱"
> **Lemma 8.6.** Let $\{(\mathbf{x}_1^{(k)},\mathbf{x}_2^{(k)})\}_{k\ge 0}$ be the sequence generated by the gradient method with exact line search employed on $f$ with initial point $(\mathbf{x}_1^{(0)},\mathbf{x}_2^{(0)})=(\gamma,1)$, where $\gamma>1$. Then for any $k\ge 0$,
> (a) $f$ is differentiable at $(\mathbf{x}_1^{(k)},\mathbf{x}_2^{(k)})$;
> (b) $|\mathbf{x}_2^{(k)}|\le\mathbf{x}_1^{(k)}$ and $\mathbf{x}_1^{(k)}\neq 0$;
> (c) $(\mathbf{x}_1^{(k)},\mathbf{x}_2^{(k)})=\left(\gamma\left(\dfrac{\gamma-1}{\gamma+1}\right)^k,\ \left(-\dfrac{\gamma-1}{\gamma+1}\right)^k\right)$.

**自己推 (c)（书上只证 (c)，(b) 由 (c) 立得，(a) 由 (b)+Lemma 8.5(c) 立得）**：
由 (b) 区域内有 $f(\mathbf{x})=\sqrt{(\mathbf{x}_1^{(k)})^2+\gamma(\mathbf{x}_2^{(k)})^2}$，且
$$\nabla f(\mathbf{x}_1^{(k)},\mathbf{x}_2^{(k)})=\frac{1}{\sqrt{(\mathbf{x}_1^{(k)})^2+\gamma(\mathbf{x}_2^{(k)})^2}}(\mathbf{x}_1^{(k)},\gamma\mathbf{x}_2^{(k)})=\alpha_k(\mathbf{x}_1^{(k)},\gamma\mathbf{x}_2^{(k)})$$
对某个 $\alpha_k>0$。令 $g(t)=f((1-t)\mathbf{x}_1^{(k)},(1-\gamma t)\mathbf{x}_2^{(k)})=\sqrt{(1-t)^2(\mathbf{x}_1^{(k)})^2+\gamma(1-\gamma t)^2(\mathbf{x}_2^{(k)})^2}$。精确线搜索的解满足两步：
- (A) 下一步点 $=(\mathbf{x}_1^{(k)},\mathbf{x}_2^{(k)})-\frac{2}{\gamma+1}(\mathbf{x}_1^{(k)},\gamma\mathbf{x}_2^{(k)})$；
- (B) $g'\!\left(\frac{2}{\gamma+1}\right)=0$。
代入 (A) 直接算得 $\mathbf{x}_1^{(k+1)}=\frac{\gamma-1}{\gamma+1}\mathbf{x}_1^{(k)}$、$\mathbf{x}_2^{(k+1)}=-\frac{\gamma-1}{\gamma+1}\mathbf{x}_2^{(k)}$；由初值 $(\gamma,1)$ 归纳即得 (c)。而 $\frac{\gamma-1}{\gamma+1}\in(0,1)$，所以序列指数级收敛到 $(0,0)$。

**这是整节最该记住的结论**：$(0,0)$ 不是 $f$ 的最小点（取 $x_2=0,x_1\to-\infty$ 时 $f\to-\infty$，实际上 $f$ 无下界），但梯度法（精确线搜索、且所有迭代点都可微）偏偏收敛到它。无约束梯度法在凸但不可微函数上**可能完全失败**——这正是为什么要引入投影、步长规则与次梯度框架。

**Figure 8.1.** Wolfe 函数在 $\gamma=16$ 时的等高线及精确线搜索梯度法的迭代点（见原书配图）。
# 8.2 The Projected Subgradient Method

本节主模型：
$$\min\{f(\mathbf{x}):\mathbf{x}\in C\},\tag{8.10}$$
其中贯穿全节的假设如下。

## 假设 8.7 (Assumption 8.7)
> **Assumption 8.7.**
> (A) $f:\mathbb{E}\to(-\infty,\infty]$ is proper closed and convex.
> (B) $C\subseteq\mathbb{E}$ is nonempty closed and convex.
> (C) $C\subseteq\mathrm{int}(\mathrm{dom}(f))$.
> (D) The optimal set of (8.10) is nonempty and denoted by $X^*$. The optimal value of the problem is denoted by $f_{\mathrm{opt}}$.

**逐字点评**：(C) 是卫生条件——保证可行集整体落在 $f$ 定义域内部，这样在 $C$ 上 $f$ 处处有次梯度（Thm 3.14）、且 Lipschitz 性质好用。对照 Ch1 的 underlying space：这里 $\mathbb{E}$ 是欧氏空间。

## 注记 8.8 · $f$ 的次可微性与 $X^*$ 的闭性
> **Remark 8.8** (subdifferentiability of $f$ and closedness of $X^*$). Since $f$ is convex and $C\subseteq\mathrm{int}(\mathrm{dom}(f))$, it follows by Theorem 3.14 that $f$ is subdifferentiable over $C$. Also, since $f$ is closed,
> $$X^*=C\cap\mathrm{Lev}(f,f_{\mathrm{opt}})$$
> is closed. This means in particular that for any $\mathbf{x}\notin X^*$ the distance $d_{X^*}(\mathbf{x})$ is positive.

**为什么重要**：后面所有"到最优集距离"的界都依赖 $d_{X^*}(\mathbf{x}_0)>0$ 有限。这里用 Thm 2.6(iii)（水平集闭）说明 $X^*$ 闭——又是一次"最优集 = 可行集 ∩ 水平集"的套路。前向引 Ch2 的水平集武器。

记号约定：以后 $f'(\mathbf{x})$ 表示在 $\partial f(\mathbf{x})$ 中**确定地**取出的某个次梯度（取法可任意但必须确定性，同一点两次取值相同）。

## 8.2.1 The Method

投影次梯度法的每次迭代 = 朝负次梯度走一步 + 正交投影回 $C$。

**Projected Subgradient Method**
- Initialization: 任取 $\mathbf{x}_0\in C$。
- General step: 对 $k=0,1,2,\dots$ 执行：
  - (a) 取步长 $t_k>0$ 与次梯度 $f'(\mathbf{x}_k)\in\partial f(\mathbf{x}_k)$；
  - (b) 令 $\mathbf{x}_{k+1}=\mathcal{P}_C(\mathbf{x}_k-t_k f'(\mathbf{x}_k))$。

生成的序列记为 $\{\mathbf{x}_k\}_{k\ge 0}$，函数值序列 $\{f(\mathbf{x}_k)\}_{k\ge 0}$ **不一定单调**（这正是次梯度法的特征）。因此还要盯着"历史最好值"序列：
$$f_{\mathrm{best}}^k\equiv\min_{n=0,1,\dots,k}f(\mathbf{x}_n).\tag{8.11}$$
显然 $\{f_{\mathrm{best}}^k\}_{k\ge 0}$ 单调不增。

## 注记 8.9 · 停止准则
> **Remark 8.9** (stopping criterion for the projected subgradient method). In actual implementations ... a stopping criterion has to be incorporated, but as a rule, we will not deal in this book with stopping criteria but rather concentrate on issues of convergence.

**作者注**：这是 Beck 的"实话说"——书只管收敛性，不管道停。做工程时要自己加准则（如 $\|f'(\mathbf{x}_k)\|$ 小或 $f_{\mathrm{best}}^k-f_{\mathrm{best}}^{k-1}$ 足够小）。

## 注记 8.10 · 零次梯度 = 已是最优
> **Remark 8.10** (zero subgradients). In the unlikely case where $f'(\mathbf{x}_k)=0$ for some $k$, then by Fermat's optimality condition (Theorem 3.63), $\mathbf{x}_k$ is a minimizer of $f$ over $\mathbb{E}$, and since $\mathbf{x}_k\in C$, it is also a minimizer of $f$ over $C$. In this situation, the method is "stuck" at the optimal solution $\mathbf{x}_k$ from iteration $k$ onward.

**逐字点评**：零次梯度触发 Fermat 条件（Thm 3.63）——这给下面 Polyak 步长"除以 $\|f'(\mathbf{x}_k)\|^2$"遇到 0 时一个干净的兜底。

## 引理 8.11 · 投影次梯度的根本不等式
> **Lemma 8.11** (fundamental inequality for projected subgradient). Suppose that Assumption 8.7 holds. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method. Then for any $\mathbf{x}^*\in X^*$ and $k\ge 0$,
> $$\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2\le \|\mathbf{x}_k-\mathbf{x}^*\|^2-2t_k(f(\mathbf{x}_k)-f_{\mathrm{opt}})+t_k^2\|f'(\mathbf{x}_k)\|^2.\tag{8.12}$$

### 自己推一遍（全章最重要的三行）
$$\begin{aligned}
\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2
&=\|\mathcal{P}_C(\mathbf{x}_k-t_kf'(\mathbf{x}_k))-\mathcal{P}_C(\mathbf{x}^*)\|^2\\
&\overset{(*)}{\le}\|\mathbf{x}_k-t_kf'(\mathbf{x}_k)-\mathbf{x}^*\|^2\\
&=\|\mathbf{x}_k-\mathbf{x}^*\|^2-2t_k\langle f'(\mathbf{x}_k),\mathbf{x}_k-\mathbf{x}^*\rangle+t_k^2\|f'(\mathbf{x}_k)\|^2\\
&\overset{(**)}{\le}\|\mathbf{x}_k-\mathbf{x}^*\|^2-2t_k(f(\mathbf{x}_k)-f_{\mathrm{opt}})+t_k^2\|f'(\mathbf{x}_k)\|^2.
\end{aligned}$$
- $(*)$：投影算子非扩张（**Thm 6.42**）——这是全章反复出现的"万能钥匙"；
- $(**)$：次梯度不等式 $f(\mathbf{x}_k)-f(\mathbf{x}^*)\ge\langle f'(\mathbf{x}_k),\mathbf{x}_k-\mathbf{x}^*\rangle$，而 $f(\mathbf{x}^*)=f_{\mathrm{opt}}$。$\blacksquare$

**为什么这一行最关键**：它把"函数值差距 $f(\mathbf{x}_k)-f_{\mathrm{opt}}$"和"到最优集距离的平方变化"焊在一起。后面所有收敛定理（Polyak、动态步长、强凸、随机、增量、对偶）都是对这个不等式做不同变形——**它是本章的发动机**。

## 8.2.2 Convergence under Polyak's Stepsize Rule

除 Assumption 8.7 外还需一条。

## 假设 8.12 (Assumption 8.12)
> **Assumption 8.12.** There exists a constant $L_f>0$ for which $\|\mathbf{g}\|\le L_f$ for all $\mathbf{g}\in\partial f(\mathbf{x})$, $\mathbf{x}\in C$.

由 Thm 3.61（结合 $C\subseteq\mathrm{int}(\mathrm{dom}(f))$）：Assumption 8.12 推出 $f$ 在 $C$ 上以 $L_f$ 为 Lipschitz 常数（$|f(\mathbf{x})-f(\mathbf{y})|\le L_f\|\mathbf{x}-\mathbf{y}\|$）。另外若 $C$ 紧，则由 Thm 3.16 自动满足 Assumption 8.12。

### Polyak 步长
从根本不等式 (8.12) 右边对 $t_k\ge 0$ 最小化，自然得到
$$t_k=\frac{f(\mathbf{x}_k)-f_{\mathrm{opt}}}{\|f'(\mathbf{x}_k)\|^2}.$$
当 $f'(\mathbf{x}_k)=\mathbf{0}$ 时上式无定义，而由 Remark 8.10 此时 $\mathbf{x}_k$ 已最优，书规定人为令 $t_k=1$（任取正数均可）。完整公式：
$$t_k=
\begin{cases}
\dfrac{f(\mathbf{x}_k)-f_{\mathrm{opt}}}{\|f'(\mathbf{x}_k)\|^2}, & f'(\mathbf{x}_k)\neq\mathbf{0},\\[8pt]
1, & f'(\mathbf{x}_k)=\mathbf{0}.
\end{cases}\tag{8.13}$$
这就是 **Polyak 步长规则**（Boris T. Polyak 提出）。

**作者注**：Polyak 步长"最优"是指它最小化根本不等式的上界——但代价是它显式用到 $f_{\mathrm{opt}}$。实际问题中 $f_{\mathrm{opt}}$ 往往未知，所以 §8.2.4 会退而求其次用不依赖 $f_{\mathrm{opt}}$ 的动态步长。这是 Beck 在埋钩子。

## 定理 8.13 · Polyak 步长下的收敛
> **Theorem 8.13** (convergence of projected subgradient with Polyak's stepsize). Suppose that Assumptions 8.7 and 8.12 hold. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method with Polyak's stepsize rule (8.13). Then
> (a) $\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2\le \|\mathbf{x}_k-\mathbf{x}^*\|^2$ for any $k\ge 0$ and $\mathbf{x}^*\in X^*$;
> (b) $f(\mathbf{x}_k)\to f_{\mathrm{opt}}$ as $k\to\infty$;
> (c) $f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le \dfrac{L_f d_{X^*}(\mathbf{x}_0)}{\sqrt{k+1}}$ for any $k\ge 0$.

### 自己推一遍
把 Polyak 步长代入 (8.12)：当 $f'(\mathbf{x}_n)\neq\mathbf{0}$，
$$\|\mathbf{x}_{n+1}-\mathbf{x}^*\|^2\le\|\mathbf{x}_n-\mathbf{x}^*\|^2-\frac{(f(\mathbf{x}_n)-f_{\mathrm{opt}})^2}{\|f'(\mathbf{x}_n)\|^2}\le\|\mathbf{x}_n-\mathbf{x}^*\|^2-\frac{(f(\mathbf{x}_n)-f_{\mathrm{opt}})^2}{L_f^2}.\tag{8.15}$$
$f'=\mathbf{0}$ 时 $f(\mathbf{x}_n)=f_{\mathrm{opt}}$ 且 $\mathbf{x}_{n+1}=\mathbf{x}_n$，(8.15) 仍成立。由 (8.15) 立刻得 (a)（距离平方单调不增）。

对 $n=0,1,\dots,k$ 求和 (8.15)：
$$\sum_{n=0}^k(f(\mathbf{x}_n)-f_{\mathrm{opt}})^2\le L_f^2\|\mathbf{x}_0-\mathbf{x}^*\|^2.$$
对任意 $\mathbf{x}^*$ 成立，取 $\mathbf{x}^*\in X^*$ 使距离最小即 $\|\mathbf{x}_0-\mathbf{x}^*\|=d_{X^*}(\mathbf{x}_0)$：
$$\sum_{n=0}^k(f(\mathbf{x}_n)-f_{\mathrm{opt}})^2\le L_f^2 d_{X^*}(\mathbf{x}_0)^2.\tag{8.16}$$
因每项 $\ge 0$，必有 $f(\mathbf{x}_n)-f_{\mathrm{opt}}\to 0$，即 (b)。

对 (c)：因 $f(\mathbf{x}_n)\ge f_{\mathrm{best}}^k$，有 $\sum_{n=0}^k(f(\mathbf{x}_n)-f_{\mathrm{opt}})^2\ge (k+1)(f_{\mathrm{best}}^k-f_{\mathrm{opt}})^2$。与 (8.16) 联立得
$$(k+1)(f_{\mathrm{best}}^k-f_{\mathrm{opt}})^2\le L_f^2 d_{X^*}(\mathbf{x}_0)^2\quad\Longrightarrow\quad f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{L_f d_{X^*}(\mathbf{x}_0)}{\sqrt{k+1}}.\ \blacksquare$$

**结论**：(a) 是 Fejér 单调（下节定义）；(c) 给出 $\mathcal{O}(1/\sqrt{k})$ 的"历史最好值"速率。注意是 $f_{\mathrm{best}}^k$ 而非 $f(\mathbf{x}_k)$ 有速率保证——单点函数值可能震荡。

## 注记 8.14 · 用实测次梯度范数代替 $L_f$
> **Remark 8.14.** Note that in the convergence result of Theorem 8.13 we can replace the constant $L_f$ with $\max_{n=0,1,\dots,k}\|f'(\mathbf{x}_n)\|$.

**逐字点评**：因为根本不等式里的 $\|f'(\mathbf{x}_n)\|$ 是实际算出来的，直接用 $\max_{n\le k}\|f'(\mathbf{x}_n)\|$ 比用全局上界 $L_f$ 更紧。前向引 Example 8.19 就用这一招把界从 $7.7287$ 改进到 $7.2111$。
## 定义 8.15 · Fejér 单调 (Fejér monotonicity)
> **Definition 8.15** (Fejér monotonicity). A sequence $\{\mathbf{x}_k\}_{k\ge 0}\subseteq\mathbb{E}$ is called **Fejér monotone** w.r.t. a set $S\subseteq\mathbb{E}$ if
> $$\|\mathbf{x}_{k+1}-\mathbf{y}\|\le\|\mathbf{x}_k-\mathbf{y}\|\quad\text{for all }k\ge 0\text{ and }\mathbf{y}\in S.$$

**逐字点评**：Fejér 单调 = "到集合 $S$ 里任一点的距离都不增"。由 Thm 8.13(a) 知投影次梯度序列对 $X^*$ 是 Fejér 单调的。因为 $\|\mathbf{x}_k-\mathbf{y}\|\le\|\mathbf{x}_0-\mathbf{y}\|$，**Fejér 单调序列一定是有界的**——这把"序列会不会跑飞"先摁死了。

## 定理 8.16 · Fejér 单调蕴含收敛
> **Theorem 8.16** (convergence under Fejér monotonicity). Let $\{\mathbf{x}_k\}_{k\ge 0}\subseteq\mathbb{E}$ be a sequence, and let $S$ be a set satisfying $D\subseteq S$, where $D$ is the set comprising all the limit points of $\{\mathbf{x}_k\}_{k\ge 0}$. If $\{\mathbf{x}_k\}_{k\ge 0}$ is Fejér monotone w.r.t. $S$, then it converges to a point in $D$.

### 自己推一遍
Fejér 单调 $\Rightarrow$ 有界 $\Rightarrow$ 有极限点。取极限点 $\tilde{\mathbf{x}}$（存在子列 $\mathbf{x}_{k_j}\to\tilde{\mathbf{x}}$）。由 $D\subseteq S$ 与 Fejér 单调，对任意 $k$：
$$\|\mathbf{x}_{k+1}-\tilde{\mathbf{x}}\|\le\|\mathbf{x}_k-\tilde{\mathbf{x}}\|.$$
故 $\{\|\mathbf{x}_k-\tilde{\mathbf{x}}\|\}_{k\ge 0}$ 单调不增、下有界（≥0），必收敛。又子列 $\|\mathbf{x}_{k_j}-\tilde{\mathbf{x}}\|\to 0$，所以整列 $\|\mathbf{x}_k-\tilde{\mathbf{x}}\|\to 0$，即 $\mathbf{x}_k\to\tilde{\mathbf{x}}\in D$。$\blacksquare$

**为什么这一条是"中间件"**：它把"距离不增"升级成"序列收敛"。下一定理只要再证明"任意极限点都在 $X^*$ 里"即可。

## 定理 8.17 · 序列收敛到最优集
> **Theorem 8.17** (convergence of the sequence generated by projected subgradient with Polyak's stepsize rule). Suppose that Assumptions 8.7 and 8.12 hold. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method with Polyak's stepsize rule (8.13). Then $\{\mathbf{x}_k\}_{k\ge 0}$ converges to a point in $X^*$.

### 自己推一遍
由 Thm 8.13(a) 知序列对 $X^*$ Fejér 单调。套 Thm 8.16，只需证任意极限点 $\tilde{\mathbf{x}}\in X^*$。取子列 $\mathbf{x}_{k_j}\to\tilde{\mathbf{x}}$：
- $C$ 闭 $\Rightarrow$ $\tilde{\mathbf{x}}\in C$；
- Thm 8.13(b) 给 $f(\mathbf{x}_{k_j})\to f_{\mathrm{opt}}$；
- 因 $\tilde{\mathbf{x}}\in C\subseteq\mathrm{int}(\mathrm{dom}(f))$，由 Thm 2.21 知 $f$ 在 $\tilde{\mathbf{x}}$ 连续，故 $f(\tilde{\mathbf{x}})=f_{\mathrm{opt}}$，即 $\tilde{\mathbf{x}}\in X^*$。$\blacksquare$

**前向引**：Thm 2.21（凸函数在定义域内部连续）在这里第二次登场——闭性 + 内部连续性把"函数值收敛到最优值"变成"点本身最优"。

## 定理 8.18 · Polyak 步长的复杂度
> **Theorem 8.18** (complexity of projected subgradient with Polyak's stepsize). Suppose that Assumptions 8.7 and 8.12 hold. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method with Polyak's stepsize rule (8.13). Then for any nonnegative integer $k$ satisfying
> $$k\ge \frac{L_f^2 d_{X^*}(\mathbf{x}_0)^2}{\varepsilon^2}-1,$$
> it holds that $f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\varepsilon$.

**逐字点评**：这是把 Thm 8.13(c) 的 $\mathcal{O}(1/\sqrt{k})$ 翻译成复杂度语言：要得到 $\varepsilon$-最优解，需要 $\mathcal{O}(1/\varepsilon^2)$ 次迭代。记 $\mathbf{x}$ 为 $\varepsilon$-最优解若 $f(\mathbf{x})-f_{\mathrm{opt}}\le\varepsilon$。

## 例 8.19 · 两范数之和的最小化
> **Example 8.19.** Consider the problem
> $$\min_{x_1,x_2}\{f(x_1,x_2)=|x_1+2x_2|+|3x_1+4x_2|\}.$$
> The optimal solution is $(x_1,x_2)=(0,0)$, optimal value $f_{\mathrm{opt}}=0$. Clearly, both Assumptions 8.7 and 8.12 hold. Since $f(\mathbf{x})=\|A\mathbf{x}\|_1$ where $A=\begin{pmatrix}1&2\\3&4\end{pmatrix}$, for any $\mathbf{x}\in\mathbb{R}^2$, $\partial f(\mathbf{x})=A^T\partial h(A\mathbf{x})$, where $h(\mathbf{x})=\|\mathbf{x}\|_1$.

### 自己推一遍（界 $L_f$）
由 Example 3.41，$\partial h(\mathbf{w})=\{\mathbf{z}\in\mathbb{R}^2:z_i=\mathrm{sgn}(w_i),\ i\in I_{\neq}(w),\ |z_j|\le 1,\ j\in I_0(w)\}$。故若 $\boldsymbol{\eta}\in\partial h(A\mathbf{x})$，则 $\boldsymbol{\eta}\in[-1,1]\times[-1,1]$，从而 $\|\boldsymbol{\eta}\|_2\le\sqrt{2}$。任意 $\mathbf{g}\in\partial f(\mathbf{x})$ 可写为 $\mathbf{g}=A^T\boldsymbol{\eta}$，于是
$$\|\mathbf{g}\|_2=\|A^T\boldsymbol{\eta}\|_2\le\|A^T\|_{2,2}\|\boldsymbol{\eta}\|_2\le\|A^T\|_{2,2}\cdot\sqrt{2}=7.7287,$$
可取 $L_f=7.7287$。

更新步取 $\mathbf{v}(\mathbf{x}_1,\mathbf{x}_2)=\big(\mathrm{sgn}(x_1+2x_2)+3\,\mathrm{sgn}(3x_1+4x_2),\ 2\,\mathrm{sgn}(x_1+2x_2)+4\,\mathrm{sgn}(3x_1+4x_2)\big)\in\partial f$。注意本书约定 $\mathrm{sgn}(0)=1$（见 §1.7.2），所以在不可微点选法确定。**四种可能方向**只有：
$$\mathbf{u}_1=\binom{-4}{-6},\ \mathbf{u}_2=\binom{2}{2},\ \mathbf{u}_3=\binom{-2}{-2},\ \mathbf{u}_4=\binom{4}{6}.$$
由 Remark 8.14，用 $\max_i\|\mathbf{u}_i\|_2=7.2111$ 代替 $7.7287$ 可得更紧的界。前 100 次迭代（初值 $(1,2)^T$）的函数值确实不单调，但明显收敛到 $f_{\mathrm{opt}}$（见原书 Figure 8.2）。

**作者注**：这个例子演示了两件事——(1) 函数值不单调是次梯度法的常态；(2) Remark 8.14 用"实际次梯度范数最大值"收紧常数。前向引 Ch3 的 Example 3.41（$\ell_1$ 次梯度）与 §1.7.2 的 $\mathrm{sgn}(0)=1$ 约定。
## 8.2.3 The Convex Feasibility Problem

设 $S_1,S_2,\dots,S_m\subseteq\mathbb{E}$ 为闭凸集，且
$$S\equiv\bigcap_{i=1}^m S_i\neq\emptyset.\tag{8.20}$$
凸可行性问题就是找一点落在交集中。可写成最小化问题：
$$\min_{\mathbf{x}}\left\{f(\mathbf{x})\equiv\max_{i=1,2,\dots,m}d_{S_i}(\mathbf{x})\right\}.\tag{8.21}$$
因交集非空，故 $f_{\mathrm{opt}}=0$、最优集就是 $S$。并且 $f$ 的 Lipschitz 常数为 1。

## 引理 8.20 · 最大距离函数的 Lipschitz 常数
> **Lemma 8.20.** Let $S_1,S_2,\dots,S_m$ be nonempty closed and convex sets. Then the function $f$ given in (8.21) is Lipschitz continuous with constant $1$.

### 自己推一遍
对任意 $i$ 与 $\mathbf{x},\mathbf{y}$：
$$d_{S_i}(\mathbf{x})=\|\mathbf{x}-\mathcal{P}_{S_i}(\mathbf{x})\|\le\|\mathbf{x}-\mathcal{P}_{S_i}(\mathbf{y})\|\le\|\mathbf{x}-\mathbf{y}\|+\|\mathbf{y}-\mathcal{P}_{S_i}(\mathbf{y})\|=\|\mathbf{x}-\mathbf{y}\|+d_{S_i}(\mathbf{y}).$$
故 $d_{S_i}(\mathbf{x})-d_{S_i}(\mathbf{y})\le\|\mathbf{x}-\mathbf{y}\|$；交换 $\mathbf{x},\mathbf{y}$ 得反向不等式，于是 $|d_{S_i}(\mathbf{x})-d_{S_i}(\mathbf{y})|\le\|\mathbf{x}-\mathbf{y}\|$。
令 $\mathbf{v}_{\mathbf{x}}=(d_{S_i}(\mathbf{x}))_{i=1}^m$，由 $\ell_\infty$ 范数三角不等式：
$$|f(\mathbf{x})-f(\mathbf{y})|=\big|\|\mathbf{v}_{\mathbf{x}}\|_\infty-\|\mathbf{v}_{\mathbf{y}}\|_\infty\big|\le\|\mathbf{v}_{\mathbf{x}}-\mathbf{v}_{\mathbf{y}}\|_\infty=\max_i|d_{S_i}(\mathbf{x})-d_{S_i}(\mathbf{y})|\le\|\mathbf{x}-\mathbf{y}\|.\ \blacksquare$$

**逐字点评**：把"到每个集合的距离"打包成向量再取 $\ell_\infty$ 范数——这招把多个投影距离的 Lipschitz 性统一成目标函数的 Lipschitz 性（常数恰为 1）。

### 贪心投影算法 (Greedy Projection Algorithm)
套用 Polyak 步长到 (8.21)：若 $\mathbf{x}_k\in S$ 直接停；否则取 $i_k\in\arg\max_i d_{S_i}(\mathbf{x}_k)$，由 Example 3.49 选次梯度 $\mathbf{g}_k=\frac{\mathbf{x}_k-\mathcal{P}_{S_{i_k}}(\mathbf{x}_k)}{d_{S_{i_k}}(\mathbf{x}_k)}$（此时 $\|\mathbf{g}_k\|=1$），Polyak 步长配合 $f_{\mathrm{opt}}=0$ 直接化简成
$$\mathbf{x}_{k+1}=\mathcal{P}_{S_{i_k}}(\mathbf{x}_k).$$
即每次把当前点投影到"最远的那一个集合"上。

**Greedy Projection Algorithm**
- Input: $m$ 个非空闭凸集 $S_1,\dots,S_m$。
- Initialization: 任取 $\mathbf{x}_0\in\mathbb{E}$。
- General step: $\mathbf{x}_{k+1}=\mathcal{P}_{S_{i_k}}(\mathbf{x}_k)$，其中 $i_k\in\arg\max_{i=1,\dots,m}d_{S_i}(\mathbf{x}_k)$。

## 定理 8.21 · 贪心投影算法的收敛
> **Theorem 8.21** (convergence of the greedy projection algorithm). Let $S_1,\dots,S_m\subseteq\mathbb{E}$ be closed and convex sets such that $S\equiv\bigcap_{i=1}^m S_i\neq\emptyset$. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the greedy projection algorithm. Then
> (a) for any $k\ge 0$, $\displaystyle\min_{n=0,1,\dots,k}\max_{i=1,\dots,m}d(\mathbf{x}_n,S_i)\le \frac{d_S(\mathbf{x}_0)}{\sqrt{k+1}}$;
> (b) there exists $\mathbf{x}^*\in S$ such that $\mathbf{x}_k\to\mathbf{x}^*$ as $k\to\infty$.

**自己推一遍**：令 $f(\mathbf{x})=\max_i d(\mathbf{x},S_i)$、$C=\mathbb{E}$。则最优集 $X^*=S$，Assumption 8.7 满足（因 $f$ 闭凸、$C=\mathbb{E}$ 闭凸且在 $\mathrm{int}(\mathrm{dom}(f))=\mathbb{E}$ 内），$X^*$ 非空，Assumption 8.12 由 Lemma 8.20 + Thm 3.61 取 $L_f=1$ 满足。贪心投影正是 Polyak 步长的投影次梯度法，故直接套 Thm 8.13(c) 得 (a)；套 Thm 8.17 得 (b)。$\blacksquare$

## 交替投影法 (Alternating Projection Method)
当 $m=2$，贪心投影退化为交替投影：
- Input: 两个非空闭凸集 $S_1,S_2$。
- Initialization: 任取 $\mathbf{x}_0\in S_2$。
- General step: $\mathbf{x}_{k+1}=\mathcal{P}_{S_2}(\mathcal{P}_{S_1}(\mathbf{x}_k))$。

若 $S_1\cap S_2\neq\emptyset$，由 Thm 8.21 序列收敛到交集中一点。

## 推论 8.22 · 交替投影的收敛
> **Corollary 8.22** (convergence of alternating projection). Let $S_1,S_2$ be closed and convex sets such that $S\equiv S_1\cap S_2\neq\emptyset$. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the alternating projection method with initial point $\mathbf{x}_0\in S_2$. Then
> (a) for any $k\ge 0$, $\displaystyle\min_{n=0,1,\dots,k}d(\mathbf{x}_n,S_1)\le \frac{d_S(\mathbf{x}_0)}{\sqrt{k+1}}$;
> (b) there exists $\mathbf{x}^*\in S$ such that $\mathbf{x}_k\to\mathbf{x}^*$ as $k\to\infty$.

## 例 8.23 · 线性可行性问题
> **Example 8.23** (solution of linear feasibility problems). Consider
> $$A\mathbf{x}=\mathbf{b},\quad \mathbf{x}\ge\mathbf{0},\tag{8.26}$$
> where $A\in\mathbb{R}^{m\times n}$ has full row rank and $\mathbf{b}\in\mathbb{R}^m$.

令 $S_1=\{\mathbf{x}:A\mathbf{x}=\mathbf{b}\}$，$S_2=\mathbb{R}_+^n$。由 Lemma 6.26 有解析投影：
$$\mathcal{P}_{S_1}(\mathbf{x})=\mathbf{x}-A^T(AA^T)^{-1}(A\mathbf{x}-\mathbf{b}),\qquad \mathcal{P}_{S_2}(\mathbf{x})=[\mathbf{x}]_+.$$
于是交替投影（Algorithm 1）为 $\mathbf{x}_{k+1}=[\mathbf{x}_k-A^T(AA^T)^{-1}(A\mathbf{x}_k-\mathbf{b})]_+$，每步要算 $(AA^T)^{-1}(A\mathbf{x}_k-\mathbf{b})$。

维度大时可用更省事的贪心投影（Algorithm 2）：把第 $i$ 行记为 $\mathbf{a}_i^T$，定义 $T_i=\{\mathbf{x}:\mathbf{a}_i^T\mathbf{x}=b_i\}$、$T_{m+1}=\mathbb{R}_+^n$。由 Lemma 6.26，$\mathcal{P}_{T_i}(\mathbf{x})=\mathbf{x}-\frac{\mathbf{a}_i^T\mathbf{x}-b_i}{\|\mathbf{a}_i\|_2^2}\mathbf{a}_i$，且 $d_{T_i}(\mathbf{x})=\frac{|\mathbf{a}_i^T\mathbf{x}-b_i|}{\|\mathbf{a}_i\|_2}$。每步只选"违反最大"的约束投影，避免解线性系统。**代价**（见原书 Figure 8.3）：在给定实例上 Algorithm 1 精度明显优于 Algorithm 2——简单不等于更好。

## 8.2.4 Projected Subgradient with Dynamic Stepsizes

Polyak 步长最优但依赖未知的 $f_{\mathrm{opt}}$。本节给出**可计算**的动态步长，仍保 $\mathcal{O}(1/\sqrt{k})$。先铺垫一个求和引理。

## 引理 8.24 · 动态步长的能量不等式
> **Lemma 8.24.** Suppose that Assumption 8.7 holds. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method with positive stepsizes $\{t_k\}_{k\ge 0}$. Then for any $\mathbf{x}^*\in X^*$ and nonnegative integer $k$,
> $$\sum_{n=0}^k t_n(f(\mathbf{x}_n)-f_{\mathrm{opt}})\le \frac{1}{2}\|\mathbf{x}_0-\mathbf{x}^*\|^2+\frac{1}{2}\sum_{n=0}^k t_n^2\|f'(\mathbf{x}_n)\|^2.\tag{8.27}$$

### 自己推一遍
由 Lemma 8.11 变形：$\frac{1}{2}\|\mathbf{x}_{n+1}-\mathbf{x}^*\|^2\le\frac{1}{2}\|\mathbf{x}_n-\mathbf{x}^*\|^2-t_n(f(\mathbf{x}_n)-f_{\mathrm{opt}})+\frac{t_n^2}{2}\|f'(\mathbf{x}_n)\|^2$。对 $n=0,\dots,k$ 求和消掉 telescoping 项，再丢 $-\frac{1}{2}\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2\ge 0$ 即得 (8.27)。$\blacksquare$

## 定理 8.25 · 步长条件保证收敛
> **Theorem 8.25** (stepsize conditions warranting convergence of projected subgradient). Suppose that Assumptions 8.7 and 8.12 hold. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method with positive stepsizes $\{t_k\}_{k\ge 0}$. If
> $$\frac{\sum_{n=0}^k t_n^2}{\sum_{n=0}^k t_n}\to 0\quad\text{as }k\to\infty,\tag{8.28}$$
> then $f_{\mathrm{best}}^k-f_{\mathrm{opt}}\to 0$ as $k\to\infty$.

### 自己推一遍
用 Lemma 8.24 与 $\|f'(\mathbf{x}_n)\|\le L_f$、$f(\mathbf{x}_n)\ge f_{\mathrm{best}}^k$：
$$\Big(\sum_{n=0}^k t_n\Big)(f_{\mathrm{best}}^k-f_{\mathrm{opt}})\le\frac{1}{2}\|\mathbf{x}_0-\mathbf{x}^*\|^2+\frac{L_f^2}{2}\sum_{n=0}^k t_n^2.$$
故 $f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{\frac{1}{2}\|\mathbf{x}_0-\mathbf{x}^*\|^2+\frac{L_f^2}{2}\sum t_n^2}{\sum t_n}$。由 (8.28) 且 (8.28) 蕴含 $\sum t_n\to\infty$，右边趋于 0。$\blacksquare$

**关键结论**：步长只要满足 $\frac{\sum t_n^2}{\sum t_n}\to 0$（如 $t_k=\frac{1}{\sqrt{k+1}}$）就够。这是"可不依赖 $f_{\mathrm{opt}}$"的第一步。

## 引理 8.26 · 求和的积分夹逼 (calculus)
> **Lemma 8.26.** Let $f:[a-1,b+1]\to\mathbb{R}$ be continuous nonincreasing over $[a-1,b+1]$, where $a,b$ are integers with $a\le b$. Then
> $$2\int_{a}^{b+1}f(t)\,dt\le \sum_{n=a}^b f(n)\le 2\int_{a-1}^{b}f(t)\,dt.$$

## 引理 8.27 · 调和与根式求和的界
> **Lemma 8.27.** Let $D\in\mathbb{R}$. Then
> (a) for any $k\ge 1$, $\displaystyle D+\frac{\sum_{n=0}^k\frac{1}{n+1}}{\sum_{n=0}^k\frac{1}{\sqrt{n+1}}}\le D+\frac{1+\log(k+1)}{\sqrt{k+1}}$;
> (b) for any $k\ge 2$, $\displaystyle D+\frac{\sum_{n=\lceil k/2\rceil}^k\frac{1}{n+1}}{\sum_{n=\lceil k/2\rceil}^k\frac{1}{\sqrt{n+1}}}\le\frac{4(D+\log 3)}{\sqrt{k+2}}$.

### 自己推一遍（(a) 的关键两步）
上界：$1+\sum_{n=1}^k\frac{1}{n+1}\le 1+\int_0^k\frac{1}{x+1}dx=1+\log(k+1)$（Lemma 8.26）。
下界：$\sum_{n=0}^k\frac{1}{\sqrt{n+1}}\ge\int_0^{k+1}\frac{1}{\sqrt{x+1}}dx=2\sqrt{k+2}-2\ge\sqrt{k+1}$（对 $k\ge 1$）。两式相除得 (a)。(b) 类似用后半段求和。$\blacksquare$

## 定理 8.28 · 动态步长的 $\mathcal{O}(\log k/\sqrt{k})$ 速率
> **Theorem 8.28** ($\mathcal{O}(\log(k)/\sqrt{k})$ rate of convergence of projected subgradient). Suppose that Assumptions 8.7 and 8.12 hold. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method with stepsizes $t_k=\dfrac{1}{\|f'(\mathbf{x}_k)\|\sqrt{k+1}}$ if $f'(\mathbf{x}_k)\neq\mathbf{0}$ and $t_k=\dfrac{1}{L_f}$ otherwise. Then
> (a) for any $k\ge 1$, $\displaystyle f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{L_f}{2}\frac{\|\mathbf{x}_0-\mathbf{x}^*\|^2+1+\log(k+1)}{\sqrt{k+1}}$;
> (b) for any $k\ge 1$, $\displaystyle f(\bar{\mathbf{x}}^{(k)})-f_{\mathrm{opt}}\le\frac{L_f}{2}\frac{\|\mathbf{x}_0-\mathbf{x}^*\|^2+1+\log(k+1)}{\sqrt{k+1}}$, where $\bar{\mathbf{x}}^{(k)}=\dfrac{\sum_{n=0}^k t_n\mathbf{x}_n}{\sum_{n=0}^k t_n}$.

**逐字点评**：(b) 是**遍历 (ergodic) 收敛**——取步长加权平均 $\bar{\mathbf{x}}^{(k)}$ 也收敛。这是 Polyak 版没有的副产物。速率 $\mathcal{O}(\log k/\sqrt{k})$ 比 Polyak 的 $\mathcal{O}(1/\sqrt{k})$ 差一个对数因子，但**不依赖 $f_{\mathrm{opt}}$**。

## 注记 8.29 · 平均序列的递推计算
> **Remark 8.29.** The sequence of averages $\bar{\mathbf{x}}^{(k)}$ can be computed adaptively: $\bar{\mathbf{x}}^{(k+1)}=\dfrac{T_k}{T_{k+1}}\bar{\mathbf{x}}^{(k)}+\dfrac{t_{k+1}}{T_{k+1}}\mathbf{x}_{k+1}$, where $T_k\equiv\sum_{n=0}^k t_n$.

## 定理 8.30 · 紧可行集下的 $\mathcal{O}(1/\sqrt{k})$ 速率
> **Theorem 8.30** ($\mathcal{O}(1/\sqrt{k})$ rate of convergence of projected subgradient). Suppose that Assumptions 8.7 and 8.12 hold and $C$ is compact. Let $\Theta$ be an upper bound on the half-squared diameter of $C$: $\Theta\ge\max_{\mathbf{x},\mathbf{y}\in C}\frac{1}{2}\|\mathbf{x}-\mathbf{y}\|^2$. Let $\{t_k\}$ be either $t_k=\dfrac{\sqrt{2\Theta}}{L_f\sqrt{k+1}}$ or $t_k=\dfrac{\sqrt{2\Theta}}{\|f'(\mathbf{x}_k)\|\sqrt{k+1}}$ (with the obvious modification when $f'(\mathbf{x}_k)=\mathbf{0}$). Then for all $k\ge 2$,
> $$f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{\delta L_f\sqrt{2\Theta}}{\sqrt{k+2}},$$
> where $\delta=2(1+\log 3)$.

**自己推一遍（要点）**：在 Lemma 8.11 上对后半段 $n=\lceil k/2\rceil,\dots,k$ 求和得 $\sum_{n}t_n(f(\mathbf{x}_n)-f_{\mathrm{opt}})\le\Theta+\Theta\sum_{n=\lceil k/2\rceil}^k\frac{1}{n+1}$（因两种步长都使 $t_n^2\|f'(\mathbf{x}_n)\|^2\le\frac{2\Theta}{n+1}$）。下界用 $t_n\ge\frac{\sqrt{2\Theta}}{L_f\sqrt{n+1}}$、配 $f(\mathbf{x}_n)\ge f_{\mathrm{best}}^k$，再套 Lemma 8.27(b)：
$$f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{L_f\sqrt{\Theta}}{\sqrt{2}}\cdot\frac{1+\sum_{n=\lceil k/2\rceil}^k\frac{1}{n+1}}{\sum_{n=\lceil k/2\rceil}^k\frac{1}{\sqrt{n+1}}}\le\frac{L_f\sqrt{\Theta}}{\sqrt{2}}\cdot\frac{4(1+\log 3)}{\sqrt{k+2}}.\ \blacksquare$$

**结论**：紧集假设换回纯 $\mathcal{O}(1/\sqrt{k})$（没有对数因子），但需已知直径上界 $\Theta$。前向引 Thm 3.16（紧集 $\Rightarrow$ Assumption 8.12 自动成立）。
## 8.2.5 The Strongly Convex Case

若 $f$ 额外强凸，$\mathcal{O}(1/\sqrt{k})$ 可提升到 $\mathcal{O}(1/k)$，步长以 $1/k$ 衰减。要用到强凸的增长性质（Thm 5.25(b)）。

## 定理 8.31 · 强凸下投影次梯度的 $\mathcal{O}(1/k)$ 速率
> **Theorem 8.31** ($\mathcal{O}(1/k)$ rate of convergence of projected subgradient for strongly convex functions). Suppose that Assumptions 8.7 and 8.12 hold. Assume in addition that $f$ is $\sigma$-strongly convex for some $\sigma>0$, and let $\mathbf{x}^*$ be its unique minimizer. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the projected subgradient method with stepsize $t_k=\dfrac{2}{\sigma(k+1)}$.
> (a) Let $\{f_{\mathrm{best}}^k\}$ be as in (8.11). Then for any $k\ge 0$,
> $$f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{2L_f^2}{\sigma(k+1)}.\tag{8.44}$$
> In addition, $\|\mathbf{x}_{i_k}-\mathbf{x}^*\|\le\dfrac{2L_f}{\sigma\sqrt{k+1}}$, where $i_k\in\arg\min_{i=0,1,\dots,k}f(\mathbf{x}_i)$.
> (b) Define the averages $\bar{\mathbf{x}}^{(k)}=\sum_{n=0}^k\alpha_k^n\mathbf{x}_n$ with $\alpha_k^n\equiv\dfrac{2n}{k(k+1)}$. Then for all $k\ge 0$, $f(\bar{\mathbf{x}}^{(k)})-f_{\mathrm{opt}}\le\dfrac{2L_f^2}{\sigma(k+1)}$. Also $\|\bar{\mathbf{x}}^{(k)}-\mathbf{x}^*\|\le\dfrac{2L_f}{\sigma\sqrt{k+1}}$.

### 自己推一遍（(a) 主轴）
重复 Lemma 8.11 的推导得 $\|\mathbf{x}_{n+1}-\mathbf{x}^*\|^2\le\|\mathbf{x}_n-t_nf'(\mathbf{x}_n)-\mathbf{x}^*\|^2=\|\mathbf{x}_n-\mathbf{x}^*\|^2-2t_n\langle f'(\mathbf{x}_n),\mathbf{x}_n-\mathbf{x}^*\rangle+t_n^2\|f'(\mathbf{x}_n)\|^2$。
由 $\sigma$-强凸（Thm 5.24）：$f(\mathbf{x}^*)\ge f(\mathbf{x}_n)+\langle f'(\mathbf{x}_n),\mathbf{x}^*-\mathbf{x}_n\rangle+\frac{\sigma}{2}\|\mathbf{x}_n-\mathbf{x}^*\|^2$，即 $\langle f'(\mathbf{x}_n),\mathbf{x}_n-\mathbf{x}^*\rangle\ge f(\mathbf{x}_n)-f_{\mathrm{opt}}+\frac{\sigma}{2}\|\mathbf{x}_n-\mathbf{x}^*\|^2$。
代入并整理、除以 $2t_n$、用 $\|f'(\mathbf{x}_n)\|\le L_f$ 得
$$f(\mathbf{x}_n)-f_{\mathrm{opt}}\le\frac{1}{2}(t_n^{-1}-\sigma)\|\mathbf{x}_n-\mathbf{x}^*\|^2-\frac{1}{2}t_n^{-1}\|\mathbf{x}_{n+1}-\mathbf{x}^*\|^2+\frac{t_n}{2}L_f^2.$$
代入 $t_n=\frac{2}{\sigma(n+1)}$ 得 $f(\mathbf{x}_n)-f_{\mathrm{opt}}\le\frac{\sigma(n-1)}{4}\|\mathbf{x}_n-\mathbf{x}^*\|^2-\frac{\sigma(n+1)}{4}\|\mathbf{x}_{n+1}-\mathbf{x}^*\|^2+\frac{L_f^2}{\sigma(n+1)}$。乘 $n$ 后对 $n=0,\dots,k$ 求和（telescoping）：
$$\sum_{n=0}^k n(f(\mathbf{x}_n)-f_{\mathrm{opt}})\le-\frac{\sigma}{4}k(k+1)\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2+\frac{L_f^2}{\sigma}\sum_{n=0}^k\frac{n}{n+1}\le\frac{L_f^2 k}{\sigma}.$$
因 $f(\mathbf{x}_n)\ge f_{\mathrm{best}}^k$ 且 $\sum_{n=0}^k n=\frac{k(k+1)}{2}$，得 $(f_{\mathrm{best}}^k-f_{\mathrm{opt}})\frac{k(k+1)}{2}\le\frac{L_f^2 k}{\sigma}$，即 (8.44)。$\blacksquare$

对 (8.45)：由 Thm 5.25(b) 用于 $f+\delta_C$（强凸 + 示性函数仍为强凸），$\frac{\sigma}{2}\|\mathbf{x}_{i_k}-\mathbf{x}^*\|^2\le f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{2L_f^2}{\sigma(k+1)}$，开方即得。$\blacksquare$

## 注记 8.32 · 平均序列的递推
> **Remark 8.32.** The averages $\bar{\mathbf{x}}^{(k)}$ can be computed adaptively: $\bar{\mathbf{x}}^{(k+1)}=\dfrac{k}{k+2}\bar{\mathbf{x}}^{(k)}+\dfrac{2}{k+2}\mathbf{x}_{k+1}$.

## 定理 8.33 · 强凸下的复杂度
> **Theorem 8.33** (complexity of projected subgradient for strongly convex functions). Under the setting of Theorem 8.31, for any nonnegative integer $k$ satisfying
> $$k\ge\frac{2L_f^2}{\sigma\varepsilon}-1,$$
> it holds that $f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\varepsilon$ and $f(\bar{\mathbf{x}}^{(k)})-f_{\mathrm{opt}}\le\varepsilon$.

**逐字点评**：强凸把复杂度从 $\mathcal{O}(1/\varepsilon^2)$ 降到 $\mathcal{O}(1/\varepsilon)$——这和多步一阶方法（如加速梯度）相比仍是慢的，但比一般凸快一倍阶。

# 8.3 The Stochastic Projected Subgradient Method

## 8.3.1 Setting and Method

仍研究模型 (8.10) 在 Assumption 8.7 下，但每步不再用真实次梯度，而用它的**随机估计** $\mathbf{g}_k$。

**The Stochastic Projected Subgradient Method**
- Initialization: 任取 $\mathbf{x}_0\in C$。
- General step: 对 $k=0,1,2,\dots$ 执行：(A) 取步长 $t_k>0$ 与随机向量 $\mathbf{g}_k\in\mathbb{E}$；(B) 令 $\mathbf{x}_{k+1}=\mathcal{P}_C(\mathbf{x}_k-t_k\mathbf{g}_k)$。

因 $\mathbf{g}_k$ 随机，$\mathbf{x}_k$ 也随机。对 $\mathbf{g}_k$ 的假设：

## 假设 8.34 (Assumption 8.34)
> **Assumption 8.34.**
> (A) (unbiasedness) For any $k\ge 0$, $\mathbb{E}(\mathbf{g}_k\mid\mathbf{x}_k)\in\partial f(\mathbf{x}_k)$.
> (B) (boundedness) There exists $\tilde{L}_f>0$ such that for any $k\ge 0$, $\mathbb{E}(\|\mathbf{g}_k\|^2\mid\mathbf{x}_k)\le\tilde{L}_f^2$.

**逐字点评**：(A) 无偏——条件也可写成 $f(\mathbf{z})\ge f(\mathbf{x}_k)+\langle\mathbb{E}(\mathbf{g}_k\mid\mathbf{x}_k),\mathbf{z}-\mathbf{x}_k\rangle$。注意 $\tilde{L}_f$ 不一定是 $f$ 的 Lipschitz 常数（与确定情形不同）。

## 8.3.2 Analysis

## 定理 8.35 · 随机投影次梯度的收敛
> **Theorem 8.35** (convergence of stochastic projected gradient). Suppose that Assumptions 8.7 and 8.34 hold. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the stochastic projected subgradient method with positive stepsizes $\{t_k\}_{k\ge 0}$, and let $\{f_{\mathrm{best}}^k\}$ be as in (8.11).
> (a) If $\dfrac{\sum_{n=0}^k t_n^2}{\sum_{n=0}^k t_n}\to 0$ as $k\to\infty$, then $\mathbb{E}(f_{\mathrm{best}}^k)\to f_{\mathrm{opt}}$ as $k\to\infty$.
> (b) Assume $C$ is compact. Let $\tilde{L}_f$ be from Assumption 8.34, and $\Theta\ge\max_{\mathbf{x},\mathbf{y}\in C}\frac{1}{2}\|\mathbf{x}-\mathbf{y}\|^2$. If $t_k=\dfrac{\sqrt{2\Theta}}{\tilde{L}_f\sqrt{k+1}}$, then for all $k\ge 2$,
> $$\mathbb{E}(f_{\mathrm{best}}^k)-f_{\mathrm{opt}}\le\frac{\delta\tilde{L}_f\sqrt{2\Theta}}{\sqrt{k+2}},\qquad \delta=2(1+\log 3).$$

### 自己推一遍（与确定情形同构，加期望）
对固定 $\mathbf{x}^*$ 取条件期望：
$$\mathbb{E}\big[\|\mathbf{x}_{n+1}-\mathbf{x}^*\|^2\mid\mathbf{x}_n\big]\le\|\mathbf{x}_n-\mathbf{x}^*\|^2-2t_n\langle\mathbb{E}(\mathbf{g}_n\mid\mathbf{x}_n),\mathbf{x}_n-\mathbf{x}^*\rangle+t_n^2\mathbb{E}(\|\mathbf{g}_n\|^2\mid\mathbf{x}_n)\le\|\mathbf{x}_n-\mathbf{x}^*\|^2-2t_n(f(\mathbf{x}_n)-f_{\mathrm{opt}})+t_n^2\tilde{L}_f^2.$$
再对 $\mathbf{x}_n$ 取全期望、对 $n$ 求和（套用 $m=0$ 或 $m=\lceil k/2\rceil$ 的半段技巧），配 Lemma 8.27(b) 即得。关键引理：$E(\min\{X_1,\dots,X_p\})\le\min_i E(X_i)$（书 footnote 44 已证）。$\blacksquare$

## 例 8.36 · 凸函数和的最小化
> **Example 8.36** (minimization of sum of convex functions). Consider
> $$(\mathrm{P})\qquad \min\left\{f(\mathbf{x})\equiv\sum_{i=1}^m f_i(\mathbf{x}):\mathbf{x}\in C\right\},$$
> where $f_1,\dots,f_m:\mathbb{E}\to(-\infty,\infty]$ are proper closed and convex. Suppose Assumption 8.7 holds and $C$ is compact (hence Assumption 8.12 with some $L_f$). For each $i$, assume $\|\mathbf{g}\|\le L_{f_i}$ for all $\mathbf{g}\in\partial f_i(\mathbf{x})$, $\mathbf{x}\in C$.

**两种解法对比**：
- **Algorithm 1（全次梯度）**：每步算 $\sum_{i=1}^m f'_i(\mathbf{x}_k)$，步长 $t_k=\frac{\sqrt{2\Theta}}{\|\sum_i f'_i(\mathbf{x}_k)\|\sqrt{k+1}}$。由 Thm 8.30 得 $f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{\delta L_f\sqrt{2\Theta}}{\sqrt{k+2}}$；为达 $\varepsilon$-最优需 $N_1=\max\!\left\{\dfrac{2\delta^2 L_f^2\Theta}{\varepsilon^2}-2,\ 2\right\}$ 次迭代。
- **Algorithm 2（随机单函数）**：每步均匀随机选 $i_k\in\{1,\dots,m\}$，取 $\mathbf{g}_k=m\,f'_{i_k}(\mathbf{x}_k)$。则 $\mathbb{E}(\mathbf{g}_k\mid\mathbf{x}_k)=\sum_i f'_i(\mathbf{x}_k)\in\partial f(\mathbf{x}_k)$（次微分求和规则 Corollary 3.38），且 $\mathbb{E}(\|\mathbf{g}_k\|^2\mid\mathbf{x}_k)\le m\sum_i L_{f_i}^2\equiv\tilde{L}_f^2$。步长 $t_k=\frac{\sqrt{2\Theta}\,m}{\tilde{L}_f\sqrt{k+1}}$。由 Thm 8.35(b) 得 $\mathbb{E}(f_{\mathrm{best}}^k)-f_{\mathrm{opt}}\le\frac{\delta\sqrt{m\sum_i L_{f_i}^2}\sqrt{2\Theta}}{\sqrt{k+2}}$；需 $N_2=\max\!\left\{\dfrac{2\delta^2 m\Theta\sum_i L_{f_i}^2}{\varepsilon^2}-2,\ 2\right\}$ 次迭代。

**两种算法的迭代次数比**（忽略与 $\varepsilon$ 无关的常数）：$\frac{N_2}{N_1}\approx\frac{m\sum_i L_{f_i}^2}{L_f^2}\equiv\beta$。对实例 $f_i(\mathbf{x})=|\mathbf{a}_i^T\mathbf{x}+b_i|$，可取 $L_{f_i}=\|\mathbf{a}_i\|_2$；由 Example 3.44 取 $L_f=\sqrt{m}\|A^T\|_{2,2}$，于是 $\beta=\frac{\|A^T\|_F^2}{\|A^T\|_{2,2}^2}=\frac{\sum_i\lambda_i(AA^T)}{\lambda_1(AA^T)}\in[1,m]$。

**作者注（含修正说明）**：提取文本中 Example 8.36 的求和上限在压扁后易误读；数学上 $f(\mathbf{x})=\sum_{i=1}^m f_i(\mathbf{x})$ 是对 $i=1,\dots,m$ 的完整求和，且 $N_1,N_2$ 的 "$-2$" 来自 Thm 8.30 分母的 $(k+2)$ 而非 "$-1$"，已按数学正确性还原。**一个值得记住的细节**：$\beta$ 接近 1 当 $A$ 近似秩 1（各 $\mathbf{a}_i$ 几乎共线，次梯度方向相似），此时随机法精度与全梯度法相当却便宜 $m$ 倍；$\beta=m$ 时随机法需 $m$ 倍迭代——这正是"每步少算 $m$ 倍次梯度、但可能多 $m$ 倍迭代"的公平交易。
## 8.3.3 Stochastic Projected Subgradient—The Strongly Convex Case

## 定理 8.37 · 强凸随机投影次梯度的 $\mathcal{O}(1/k)$ 速率
> **Theorem 8.37** (convergence of stochastic projected subgradient for strongly convex functions). Suppose that Assumptions 8.7 and 8.34 hold. Let $\tilde{L}_f$ be from Assumption 8.34. Assume in addition that $f$ is $\sigma$-strongly convex for some $\sigma>0$. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the stochastic projected subgradient method with stepsizes $t_k=\dfrac{2}{\sigma(k+1)}$.
> (a) For any $k\ge 0$, $\displaystyle\mathbb{E}(f_{\mathrm{best}}^k)-f_{\mathrm{opt}}\le\frac{2\tilde{L}_f^2}{\sigma(k+1)}$.
> (b) Define $\bar{\mathbf{x}}^{(k)}=\sum_{n=0}^k\alpha_k^n\mathbf{x}_n$ with $\alpha_k^n\equiv\dfrac{2n}{k(k+1)}$. Then $\mathbb{E}(f(\bar{\mathbf{x}}^{(k)}))-f_{\mathrm{opt}}\le\dfrac{2\tilde{L}_f^2}{\sigma(k+1)}$.

**自己推一遍（与 Thm 8.31 同构，加期望）**：
固定 $\mathbf{x}^*$ 取条件期望：
$$\mathbb{E}\big[\|\mathbf{x}_{n+1}-\mathbf{x}^*\|^2\mid\mathbf{x}_n\big]\le\|\mathbf{x}_n-\mathbf{x}^*\|^2-2t_n\langle\mathbb{E}(\mathbf{g}_n\mid\mathbf{x}_n),\mathbf{x}_n-\mathbf{x}^*\rangle+t_n^2\mathbb{E}(\|\mathbf{g}_n\|^2\mid\mathbf{x}_n).$$
由强凸（Thm 5.24(ii)）：$\langle\mathbb{E}(\mathbf{g}_n\mid\mathbf{x}_n),\mathbf{x}_n-\mathbf{x}^*\rangle\ge f(\mathbf{x}_n)-f_{\mathrm{opt}}+\frac{\sigma}{2}\|\mathbf{x}_n-\mathbf{x}^*\|^2$。代入 $t_n=\frac{2}{\sigma(n+1)}$、用 $\mathbb{E}(\|\mathbf{g}_n\|^2\mid\mathbf{x}_n)\le\tilde{L}_f^2$，乘 $n$ 后求和：
$$\sum_{n=0}^k n\big(\mathbb{E}(f(\mathbf{x}_n))-f_{\mathrm{opt}}\big)\le-\frac{\sigma}{4}k(k+1)\mathbb{E}(\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2)+\frac{\tilde{L}_f^2}{\sigma}\sum_{n=0}^k\frac{n}{n+1}\le\frac{\tilde{L}_f^2 k}{\sigma}.$$
因 $\mathbb{E}(f(\mathbf{x}_n))\ge\mathbb{E}(f_{\mathrm{best}}^k)$ 且 $\sum n=\frac{k(k+1)}{2}$，得 (a)。(b) 用 Jensen 不等式（权重 $\alpha_k^n\in\Delta_{k+1}$）：$\mathbb{E}(f(\bar{\mathbf{x}}^{(k)}))-f_{\mathrm{opt}}\le\sum\alpha_k^n(\mathbb{E}(f(\mathbf{x}_n))-f_{\mathrm{opt})\le\frac{2\tilde{L}_f^2}{\sigma(k+1)}$。$\blacksquare$

**逐字点评**：把 Thm 8.35 的随机框架套进 Thm 8.31 的强凸分析即可——书说"证明几乎相同"，此处的价值是"完整写出以免留空"。

# 8.4 The Incremental Projected Subgradient Method

考虑 $f(\mathbf{x})=\sum_{i=1}^m f_i(\mathbf{x})$。Example 8.36 中随机选下标；本节改成**确定性的循环顺序**选下标（增量法），分析更难但速率类似（常数更差）。

## 假设 8.38 (Assumption 8.38)
> **Assumption 8.38.**
> (a) $f_i$ is proper closed and convex for any $i=1,2,\dots,m$.
> (b) There exists $L>0$ for which $\|\mathbf{g}\|\le L$ for any $\mathbf{g}\in\partial f_i(\mathbf{x})$, $i=1,2,\dots,m$, $\mathbf{x}\in C$.

**The Incremental Projected Subgradient Method**
- Initialization: 任取 $\mathbf{x}_0\in C$。
- General step: 对 $k=0,1,2,\dots$：
  - (a) 令 $\mathbf{x}_{k,0}=\mathbf{x}_k$，取步长 $t_k>0$；
  - (b) 对 $i=0,1,\dots,m-1$：$\mathbf{x}_{k,i+1}=\mathcal{P}_C(\mathbf{x}_{k,i}-t_k\mathbf{g}_{k,i})$，其中 $\mathbf{g}_{k,i}\in\partial f_{i+1}(\mathbf{x}_{k,i})$；
  - (c) 令 $\mathbf{x}_{k+1}=\mathbf{x}_{k,m}$。

即每次大迭代内部做 $m$ 次"子迭代"，依次用 $f_1,\dots,f_m$ 的次梯度投影。

## 引理 8.39 · 增量法的根本不等式
> **Lemma 8.39** (fundamental inequality for the incremental projected subgradient method). Suppose that Assumptions 8.7 and 8.38 hold, and let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the incremental projected subgradient method with positive stepsizes $\{t_k\}_{k\ge 0}$. Then for any $k\ge 0$,
> $$\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2\le \|\mathbf{x}_k-\mathbf{x}^*\|^2-2t_k(f(\mathbf{x}_k)-f_{\mathrm{opt}})+t_k^2 m^2 L^2.\tag{8.58}$$

### 自己推一遍（核心：子迭代距离累积）
对每个子步 $i$：$\|\mathbf{x}_{k,i+1}-\mathbf{x}^*\|^2\le\|\mathbf{x}_{k,i}-\mathbf{x}^*\|^2-2t_k(f_{i+1}(\mathbf{x}_{k,i})-f_{i+1}(\mathbf{x}^*))+t_k^2L^2$（投影非扩张 + 次梯度不等式 + Assumption 8.38(b)）。对 $i=0,\dots,m-1$ 求和，注意 $\mathbf{x}_{k,0}=\mathbf{x}_k,\mathbf{x}_{k,m}=\mathbf{x}_{k+1}$：
$$\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2\le\|\mathbf{x}_k-\mathbf{x}^*\|^2-2t_k\sum_{i=0}^{m-1}(f_{i+1}(\mathbf{x}_{k,i})-f_{i+1}(\mathbf{x}^*))+t_k^2mL^2.$$
把差拆成 $\sum(f_{i+1}(\mathbf{x}_k)-f_{i+1}(\mathbf{x}^*))+\sum(f_{i+1}(\mathbf{x}_{k,i})-f_{i+1}(\mathbf{x}_k))=f(\mathbf{x}_k)-f_{\mathrm{opt}}+\sum(\cdots)$。后一项用 Lipschitz（Thm 3.61）：
$$|f_{i+1}(\mathbf{x}_{k,i})-f_{i+1}(\mathbf{x}_k)|\le L\|\mathbf{x}_{k,i}-\mathbf{x}_k\|.$$
关键估计 $\|\mathbf{x}_{k,i}-\mathbf{x}_k\|\le t_k i L$（归纳：子迭代投影非扩张，$\|\mathbf{x}_{k,1}-\mathbf{x}_k\|\le t_k\|g_{k,0}\|\le t_kL$，逐层叠加）。故
$$2t_k\sum_{i=0}^{m-1}L\|\mathbf{x}_{k,i}-\mathbf{x}_k\|\le 2t_k^2L^2\sum_{i=0}^{m-1}i=t_k^2L^2m(m-1).$$
代回得 $\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2\le\|\mathbf{x}_k-\mathbf{x}^*\|^2-2t_k(f(\mathbf{x}_k)-f_{\mathrm{opt}})+t_k^2L^2m(m-1)+t_k^2mL^2$，即 $t_k^2m^2L^2$。$\blacksquare$

**为什么比 Lemma 8.11 多一个 $m^2$**：循环扫一遍 $m$ 个函数，误差累积了 $m$ 倍。这正是"确定循环"相比"全梯度"的代价。

## 定理 8.40 · 增量投影次梯度的收敛
> **Theorem 8.40** (convergence of incremental projected subgradient). Suppose that Assumptions 8.7 and 8.38 hold. Let $\{\mathbf{x}_k\}_{k\ge 0}$ be the sequence generated by the incremental projected subgradient method with positive stepsizes $\{t_k\}_{k\ge 0}$, and let $\{f_{\mathrm{best}}^k\}$ be as in (8.11).
> (a) If $\dfrac{\sum_{n=0}^k t_n^2}{\sum_{n=0}^k t_n}\to 0$ as $k\to\infty$, then $f_{\mathrm{best}}^k\to f_{\mathrm{opt}}$ as $k\to\infty$.
> (b) Assume $C$ is compact. Let $\Theta\ge\max_{\mathbf{x},\mathbf{y}\in C}\frac{1}{2}\|\mathbf{x}-\mathbf{y}\|^2$. If $t_k=\dfrac{\sqrt{\Theta}}{Lm\sqrt{k+1}}$, then for all $k\ge 2$,
> $$f_{\mathrm{best}}^k-f_{\mathrm{opt}}\le\frac{\delta mL\sqrt{\Theta}}{\sqrt{k+2}},\qquad \delta=2(2+\log 3).$$

### 自己推一遍（要点）
由 Lemma 8.39 对 $n=p,\dots,k$ 求和：$\sum_{n=p}^k t_n(f(\mathbf{x}_n)-f_{\mathrm{opt})\le\frac{1}{2}\|\mathbf{x}_p-\mathbf{x}^*\|^2+\frac{L^2m^2}{2}\sum t_n^2$。取 $p=0$ 套定理 8.25 思路得 (a)；取 $p=\lceil k/2\rceil$ 并用 $t_n=\frac{\sqrt{\Theta}}{Lm\sqrt{n+1}}$（使 $t_n^2L^2m^2\le\frac{\Theta}{n+1}$）、配 Lemma 8.27(b)（此处 $D=2$）得 (b)。$\blacksquare$

**逐字点评**：速率仍是 $\mathcal{O}(1/\sqrt{k})$，但常数里多了 $m$（来自 $m^2$ 累乘后开方）且 $\delta=2(2+\log 3)$（比 Thm 8.30 的 $2(1+\log 3)$ 大——半段求和起点不同）。前向引 §8.2.4 的同款推导。
# 8.5 The Dual Projected Subgradient Method

## 8.5.1 The Dual Problem

考虑带约束问题
$$f_{\mathrm{opt}}=\min f(\mathbf{x})\quad\text{s.t.}\quad \mathbf{g}(\mathbf{x})\le\mathbf{0},\ \mathbf{x}\in X,\tag{8.62}$$
其中假设：

## 假设 8.41 (Assumption 8.41)
> **Assumption 8.41.**
> (A) $X\subseteq\mathbb{E}$ is convex.
> (B) $f:\mathbb{E}\to\mathbb{R}$ is convex.
> (C) $\mathbf{g}(\cdot)=(g_1(\cdot),\dots,g_m(\cdot))^T$, with $g_1,\dots,g_m:\mathbb{E}\to\mathbb{R}$ convex.
> (D) The problem has a finite optimal value $f_{\mathrm{opt}}$, and the optimal set $X^*$ is nonempty.
> (E) There exists $\bar{\mathbf{x}}\in X$ for which $\mathbf{g}(\bar{\mathbf{x}})<\mathbf{0}$ (Slater 条件).
> (F) For any $\boldsymbol{\lambda}\in\mathbb{R}_+^m$, $\min_{\mathbf{x}\in X}\{f(\mathbf{x})+\boldsymbol{\lambda}^T\mathbf{g}(\mathbf{x})\}$ has an optimal solution.

**Lagrange 对偶函数**：
$$q(\boldsymbol{\lambda})=\min_{\mathbf{x}\in X}\big\{L(\mathbf{x};\boldsymbol{\lambda})\equiv f(\mathbf{x})+\boldsymbol{\lambda}^T\mathbf{g}(\mathbf{x})\big\}.\tag{8.63}$$
由 (F) 该 min 有解，故 $q(\boldsymbol{\lambda})$ 对所有 $\boldsymbol{\lambda}\ge\mathbf{0}$ 有限。注意 $q$ 是凹的（作为仿射函数族的最小值，见 Thm 2.7(c) 思路）。**对偶问题**：
$$q_{\mathrm{opt}}=\max\{q(\boldsymbol{\lambda}):\boldsymbol{\lambda}\in\mathbb{R}_+^m\}.\tag{8.64}$$
由 Thm A.1 与 Assumption 8.41 知**强对偶**成立：$f_{\mathrm{opt}}=q_{\mathrm{opt}}$ 且对偶最优解可达，对偶最优集记为 $\Lambda^*$。对偶空间取 $\mathbb{R}^m$ 配点积与 $\ell_2$ 范数。

## 定理 8.42 · 对偶目标函数上水平集有界
> **Theorem 8.42** (boundedness of superlevel sets of the dual objective function). Suppose that Assumption 8.41 holds. Let $\bar{\mathbf{x}}\in X$ satisfy $\mathbf{g}(\bar{\mathbf{x}})<\mathbf{0}$ (from (E)). Let $\mu\in\mathbb{R}$. Then for any $\boldsymbol{\lambda}\in S_\mu\equiv\{\boldsymbol{\lambda}\in\mathbb{R}_+^m:q(\boldsymbol{\lambda})\ge\mu\}$,
> $$\|\boldsymbol{\lambda}\|_2\le\frac{f(\bar{\mathbf{x}})-\mu}{\min_{j=1,\dots,m}\{-g_j(\bar{\mathbf{x}})\}}.$$

### 自己推一遍
因 $\boldsymbol{\lambda}\in S_\mu$：$\mu\le q(\boldsymbol{\lambda})\le f(\bar{\mathbf{x}})+\boldsymbol{\lambda}^T\mathbf{g}(\bar{\mathbf{x}})=f(\bar{\mathbf{x}})+\sum_j\lambda_j g_j(\bar{\mathbf{x}})$。移项：
$$-\sum_j\lambda_j g_j(\bar{\mathbf{x}})\le f(\bar{\mathbf{x}})-\mu.$$
因 $\lambda_j\ge 0$ 且 $g_j(\bar{\mathbf{x}})<0$，每项 $-\lambda_j g_j(\bar{\mathbf{x}})\ge 0$，故 $\sum_j\lambda_j(-g_j(\bar{\mathbf{x}}))\le f(\bar{\mathbf{x}})-\mu$，即
$$\sum_j\lambda_j\le\frac{f(\bar{\mathbf{x}})-\mu}{\min_j\{-g_j(\bar{\mathbf{x}})\}}.$$
又 $\boldsymbol{\lambda}\ge\mathbf{0}$ 时 $\|\boldsymbol{\lambda}\|_2\le\sum_j\lambda_j$，得证。$\blacksquare$

**为什么重要**：对偶最优集有界——这给后面 Lemma 8.47 证明"对偶迭代序列有界"埋了伏笔。

## 推论 8.43 · 对偶最优集有界
> **Corollary 8.43** (boundedness of the optimal dual set). Suppose that Assumption 8.41 holds, and let $\Lambda^*$ be the optimal set of the dual problem (8.64). Let $\bar{\mathbf{x}}\in X$ satisfy $\mathbf{g}(\bar{\mathbf{x}})<\mathbf{0}$. Then for any $\boldsymbol{\lambda}\in\Lambda^*$,
> $$\|\boldsymbol{\lambda}\|_2\le\frac{f(\bar{\mathbf{x}})-f_{\mathrm{opt}}}{\min_{j=1,\dots,m}\{-g_j(\bar{\mathbf{x}})\}}.$$

**逐字点评**：取 $\mu=f_{\mathrm{opt}}=q_{\mathrm{opt}}$，则 $S_\mu=\Lambda^*$，直接套 Thm 8.42。定义 $\alpha\equiv\frac{f(\bar{\mathbf{x}})-f_{\mathrm{opt}}}{\min_j\{-g_j(\bar{\mathbf{x}})\}}$——这个数后面 Thm 8.46/8.48 反复出现，是"Slater 间隙"量化出的对偶变量上界。

## 8.5.2 The Dual Projected Subgradient Method

先回顾 $-q$ 的次梯度怎么算（Example 3.7）：若对给定 $\boldsymbol{\lambda}\ge\mathbf{0}$，定义 $q(\boldsymbol{\lambda})$ 的 min 在 $\mathbf{x}_\boldsymbol{\lambda}\in X$ 取到，即 $q(\boldsymbol{\lambda})=f(\mathbf{x}_\boldsymbol{\lambda})+\boldsymbol{\lambda}^T\mathbf{g}(\mathbf{x}_\boldsymbol{\lambda})$，则 $-\mathbf{g}(\mathbf{x}_\boldsymbol{\lambda})\in\partial(-q)(\boldsymbol{\lambda})$。

**The Dual Projected Subgradient Method**
- Initialization: 任取 $\boldsymbol{\lambda}_0\in\mathbb{R}_+^m$。
- General step: 对 $k=0,1,2,\dots$：
  - (a) 取正数 $\gamma_k$；
  - (b) 算 $\mathbf{x}_k\in\arg\min_{\mathbf{x}\in X}\{f(\mathbf{x})+(\boldsymbol{\lambda}_k)^T\mathbf{g}(\mathbf{x})\}$；
  - (c) 若 $\mathbf{g}(\mathbf{x}_k)=\mathbf{0}$ 则输出 $\mathbf{x}_k$ 并终止；否则 $\boldsymbol{\lambda}_{k+1}=\left[\boldsymbol{\lambda}_k+\gamma_k\dfrac{\mathbf{g}(\mathbf{x}_k)}{\|\mathbf{g}(\mathbf{x}_k)\|^2}\right]_+$。

步长 $\gamma_k/\|\mathbf{g}(\mathbf{x}_k)\|^2$ 形式与 §8.2.4 的归一化步长一致。$\mathbf{g}(\mathbf{x}_k)=\mathbf{0}$ 即原始可行且 KKT 满足——下面引理说明它就是最优。

## 引理 8.44 · 原始可行 + 对偶最优 ⇒ 原始最优
> **Lemma 8.44.** Suppose that Assumption 8.41 holds. Let $\bar{\boldsymbol{\lambda}}\in\mathbb{R}_+^m$, and let $\bar{\mathbf{x}}\in X$ satisfy $\bar{\mathbf{x}}\in\arg\min_{\mathbf{x}\in X}\{f(\mathbf{x})+\bar{\boldsymbol{\lambda}}^T\mathbf{g}(\mathbf{x})\}$ and $\mathbf{g}(\bar{\mathbf{x}})=\mathbf{0}$. Then $\bar{\mathbf{x}}$ is an optimal solution of problem (8.62).

### 自己推一遍
任取 (8.62) 的可行点 $\mathbf{x}$（即 $\mathbf{x}\in X,\mathbf{g}(\mathbf{x})\le\mathbf{0}$）：
$$f(\mathbf{x})\ge f(\mathbf{x})+\bar{\boldsymbol{\lambda}}^T\mathbf{g}(\mathbf{x})\ [\mathbf{g}(\mathbf{x})\le\mathbf{0},\bar{\boldsymbol{\lambda}}\ge\mathbf{0}]\ge f(\bar{\mathbf{x}})+\bar{\boldsymbol{\lambda}}^T\mathbf{g}(\bar{\mathbf{x}})\ [\bar{\mathbf{x}}\text{ 最小化}]=f(\bar{\mathbf{x}})\ [\mathbf{g}(\bar{\mathbf{x}})=\mathbf{0}].$$
故 $\bar{\mathbf{x}}$ 最优。$\blacksquare$

**逐字点评**：这就是 KKT/鞍点条件的原始表述——一旦找到"原始可行且拉格朗日子问题极小点"，就锁死了原始最优解。这是整个对偶方法能"终止并输出"的理论依据。
## 8.5.3 Convergence Analysis

证明对偶目标值序列 $\{q(\boldsymbol{\lambda}_k)\}$ 收敛已在前面各节完成；更有意思的问题是**原始序列如何收敛**——答案出人意料：迭代的 $\{\mathbf{x}_k\}$ 本身不是"正确的"原始序列，要用**平均**。

两种平均定义：
- **Full averaging（全平均）**：$\mathbf{x}^{(k)}=\sum_{n=0}^k\mu_k^n\mathbf{x}_n$，其中 $\mu_k^n=\dfrac{\gamma_n/\|\mathbf{g}(\mathbf{x}_n)\|^2}{\sum_{j=0}^k\gamma_j/\|\mathbf{g}(\mathbf{x}_j)\|^2}$。
- **Partial averaging（半段平均）**：$\mathbf{x}^{\langle k\rangle}=\sum_{n=\lceil k/2\rceil}^k\eta_k^n\mathbf{x}_n$，其中 $\eta_k^n=\dfrac{\gamma_n/\|\mathbf{g}(\mathbf{x}_n)\|^2}{\sum_{j=\lceil k/2\rceil}^k\gamma_j/\|\mathbf{g}(\mathbf{x}_j)\|^2}$。

假设方法未终止（即 $\mathbf{g}(\mathbf{x}_k)\neq\mathbf{0}$ 对所有 $k$）。

## 引理 8.45 · 对偶平均的原始界
> **Lemma 8.45.** Suppose that Assumption 8.41 holds, and assume further that there exists $L>0$ such that $\|\mathbf{g}(\mathbf{x})\|_2\le L$ for any $\mathbf{x}\in X$. Let $\rho>0$, and let $\{\mathbf{x}_k\}_{k\ge 0},\{\boldsymbol{\lambda}_k\}_{k\ge 0}$ be the dual projected subgradient sequences. Then for any $k\ge 2$,
> $$f(\mathbf{x}^{(k)})-f_{\mathrm{opt}}+\rho\|[\mathbf{g}(\mathbf{x}^{(k)})]_+\|^2\le\frac{L}{2}(\|\boldsymbol{\lambda}_0\|^2+\rho)^2+\frac{\sum_{n=0}^k\gamma_n^2}{\sum_{n=0}^k\gamma_n},\tag{8.70}$$
> and
> $$f(\mathbf{x}^{\langle k\rangle})-f_{\mathrm{opt}}+\rho\|[\mathbf{g}(\mathbf{x}^{\langle k\rangle})]_+\|^2\le\frac{L}{2}(\|\boldsymbol{\lambda}_{\lceil k/2\rceil}\|^2+\rho)^2+\frac{\sum_{n=\lceil k/2\rceil}^k\gamma_n^2}{\sum_{n=\lceil k/2\rceil}^k\gamma_n}.\tag{8.71}$$

**自己推一遍（要点）**：用投影非扩张（Thm 6.42(b)）展开 $\|\boldsymbol{\lambda}_{n+1}-\bar{\boldsymbol{\lambda}}\|^2$ 并对 $n=p,\dots,k$ 求和，得 $\sum_{n=p}^k\frac{\gamma_n}{\|\mathbf{g}(\mathbf{x}_n)\|^2}\mathbf{g}(\mathbf{x}_n)^T(\bar{\boldsymbol{\lambda}}-\boldsymbol{\lambda}_n)\le\frac{L}{2}\|\boldsymbol{\lambda}_p-\bar{\boldsymbol{\lambda}}\|^2+\frac{\sum\gamma_n^2}{\sum\gamma_n}$（用到 $\|\mathbf{g}\|\le L$）。把 $\mathbf{x}_{k,p}=\sum\alpha_{k,p}^n\mathbf{x}_n$ 代入、用 Jensen（凸性）与次梯度不等式 $-\boldsymbol{\lambda}_n^T\mathbf{g}(\mathbf{x}_n)\ge f(\mathbf{x}_n)-f_{\mathrm{opt}}$，得 $f(\mathbf{x}_{k,p})-f_{\mathrm{opt}}+\bar{\boldsymbol{\lambda}}^T\mathbf{g}(\mathbf{x}_{k,p})\le\frac{L}{2}(\|\boldsymbol{\lambda}_p\|^2+\|\bar{\boldsymbol{\lambda}}\|^2)+\frac{\sum\gamma^2}{\sum\gamma}$。最后取 $\bar{\boldsymbol{\lambda}}=\rho[\mathbf{g}(\mathbf{x}_{k,p})]_+/\|\lbrack\mathbf{g}(\mathbf{x}_{k,p})]_+\|^2$，则 $\bar{\boldsymbol{\lambda}}^T\mathbf{g}(\mathbf{x}_{k,p})=\rho\|[\mathbf{g}]_+\|^2$，即得 (8.70)/(8.71)。$\blacksquare$

## 定理 8.46 · 全平均序列的 $\mathcal{O}(\log k/\sqrt{k})$ 速率
> **Theorem 8.46** ($\mathcal{O}(\log(k)/\sqrt{k})$ rate of convergence of the full averaging sequence). Suppose that Assumption 8.41 holds, and assume further that $\|\mathbf{g}(\mathbf{x})\|_2\le L$ for any $\mathbf{x}\in X$. Let $\{\mathbf{x}_k\}_{k\ge 0},\{\boldsymbol{\lambda}_k\}_{k\ge 0}$ be the dual projected subgradient sequences with $\gamma_k=\dfrac{1}{\sqrt{k+1}}$. Then for any $k\ge 1$, with $\alpha=\dfrac{f(\bar{\mathbf{x}})-f_{\mathrm{opt}}}{\min_j\{-g_j(\bar{\mathbf{x}})\}}$,
> $$f(\mathbf{x}^{(k)})-f_{\mathrm{opt}}\le R_k,\qquad \|[\mathbf{g}(\mathbf{x}^{(k)})]_+\|^2\le\frac{R_k}{2\alpha},$$
> where $\displaystyle R_k\equiv\frac{L}{2}(\|\boldsymbol{\lambda}_0\|^2+2\alpha)^2+\frac{1+\log(k+1)}{\sqrt{k+1}}$.

**自己推一遍**：Lemma 8.45 取 $\rho=2\alpha$、$\gamma_n=1/\sqrt{n+1}$ 得 $f(\mathbf{x}^{(k)})-f_{\mathrm{opt}}+2\alpha\|[\mathbf{g}]_+\|^2\le\frac{L}{2}(\|\boldsymbol{\lambda}_0\|^2+2\alpha)^2+\frac{\sum\frac{1}{n+1}}{\sum\frac{1}{\sqrt{n+1}}}$。套 Lemma 8.27(a) 把分式放成 $\frac{1+\log(k+1)}{\sqrt{k+1}}$，记整体为 $R_k$。于是由 $f-f_{\mathrm{opt}}\le R_k$ 且 $2\alpha\|[\mathbf{g}]_+\|^2\le R_k$ 得两条界。再用 Corollary 8.43（$2\alpha$ 是对偶最优 $\ell_2$ 范数上界的两倍）配合 Thm 3.60 把组合式拆成两条独立不等式。$\blacksquare$

## 引理 8.47 · 对偶迭代序列有界
> **Lemma 8.47.** Suppose that Assumption 8.41 holds and $\|\mathbf{g}(\mathbf{x})\|_2\le L$ for any $\mathbf{x}\in X$. Let $\{\mathbf{x}_k\},\{\boldsymbol{\lambda}_k\}$ be the dual projected subgradient sequences with positive stepsizes $\gamma_k\le\gamma_0$. Then $\|\boldsymbol{\lambda}_k\|_2\le M$, where
> $$M=\max\!\left\{\|\boldsymbol{\lambda}_0\|^2+2\alpha,\ \frac{f(\bar{\mathbf{x}})-q_{\mathrm{opt}}}{\beta}+\frac{\gamma_0L}{2\beta}+2\alpha+\gamma_0\right\},$$
> with $\alpha=\dfrac{f(\bar{\mathbf{x}})-f_{\mathrm{opt}}{\min_j\{-g_j(\bar{\mathbf{x}})\}},\ \beta=\min_j\{-g_j(\bar{\mathbf{x}})\}$.

**自己推一遍（要点）**：归纳证明 $\|\boldsymbol{\lambda}_k-\boldsymbol{\lambda}^*\|^2\le\max\{\|\boldsymbol{\lambda}_0-\boldsymbol{\lambda}^*\|^2,\ \frac{f(\bar{\mathbf{x}})-q_{\mathrm{opt}}}{\beta}+\frac{\gamma_0L}{2\beta}+\|\boldsymbol{\lambda}^*\|^2+\gamma_0\}$。分两种情况：若 $q(\boldsymbol{\lambda}_k)\ge q_{\mathrm{opt}}-\gamma_kL/2$，由 Thm 8.42 直接界 $\|\boldsymbol{\lambda}_k\|$；否则用 $-\mathbf{g}(\mathbf{x}_k)\in\partial(-q)(\boldsymbol{\lambda}_k)$（Example 3.7）的次梯度不等式推出 $\|\boldsymbol{\lambda}_{k+1}-\boldsymbol{\lambda}^*\|^2<\|\boldsymbol{\lambda}_k-\boldsymbol{\lambda}^*\|^2$。最后加 $\|\boldsymbol{\lambda}^*\|^2\le\alpha^2$ 得 $M$。$\blacksquare$

## 定理 8.48 · 半段平均序列的 $\mathcal{O}(1/\sqrt{k})$ 速率
> **Theorem 8.48** ($\mathcal{O}(1/\sqrt{k})$ rate of convergence of the partial averaging sequence). Suppose that Assumption 8.41 holds and $\|\mathbf{g}(\mathbf{x})\|_2\le L$ for any $\mathbf{x}\in X$. Let $\{\mathbf{x}_k\},\{\boldsymbol{\lambda}_k\}$ be the dual projected subgradient sequences with $\gamma_k=\dfrac{1}{\sqrt{k+1}}$. Then for any $k\ge 2$, with $\alpha$ as in Thm 8.46,
> $$f(\mathbf{x}^{\langle k\rangle})-f_{\mathrm{opt}}\le R'_k,\qquad \|[\mathbf{g}(\mathbf{x}^{\langle k\rangle})]_+\|^2\le\frac{R'_k}{2\alpha},$$
> where $\displaystyle R'_k\equiv\frac{2L\big((M+2\alpha)^2+\log 3\big)}{\sqrt{k+2}}$.

**自己推一遍**：Lemma 8.45 取 $p=\lceil k/2\rceil$、$\rho=2\alpha$，$\gamma_n=1/\sqrt{n+1}$，用 Lemma 8.47 把 $\|\boldsymbol{\lambda}_{\lceil k/2\rceil}\|^2$ 换成 $M^2$，再套 Lemma 8.27(b)（$\frac{\sum_{n=\lceil k/2\rceil}^k\frac{1}{n+1}}{\sum_{n=\lceil k/2\rceil}^k\frac{1}{\sqrt{n+1}}}\le\frac{4}{\sqrt{k+2}}$）得 $f+2\alpha\|[\mathbf{g}]_+\|^2\le\frac{L}{2}(M+2\alpha)^2+\frac{4}{\sqrt{k+2}}$。配 Thm 3.60 拆成 $R'_k=\frac{2L((M+2\alpha)^2+\log 3)}{\sqrt{k+2}}$ 的两条界。$\blacksquare$

**结论**：半段平均比全平均少一个对数因子（因为 Lemma 8.27(b) 比 (a) 好），且对偶变量有界（Lemma 8.47）是其关键——原书 Figure 8.4 也显示半段平均实战更优。

## 推论 8.49 · 对偶法的 $\mathcal{O}(1/\varepsilon^2)$ 复杂度
> **Corollary 8.49** ($\mathcal{O}(1/\varepsilon^2)$ complexity result for the dual projected subgradient method). Under the setting of Theorem 8.48, if $k\ge 2$ satisfies
> $$k\ge\frac{4L^2\big((M+2\alpha)^2+\log 3\big)^2}{\min\{\alpha^2,1\}\,\varepsilon^2}-2,$$
> then $f(\mathbf{x}^{\langle k\rangle})-f_{\mathrm{opt}}\le\varepsilon$ and $\|[\mathbf{g}(\mathbf{x}^{\langle k\rangle})]_+\|^2\le\varepsilon$.

**逐字点评**：因为原始平均序列**不一定可行**（$g(\mathbf{x})\le\mathbf{0}$ 未必满足），所以不能直接谈"$\varepsilon$-最优解"，而谈**$\varepsilon$-最优且可行解**：同时满足 $f(\mathbf{x})-f_{\mathrm{opt}}\le\varepsilon$ 与 $\|[\mathbf{g}(\mathbf{x})]_+\|^2\le\varepsilon$。需要 $\mathcal{O}(1/\varepsilon^2)$ 次迭代。

## 例 8.50 · 线性规划例子
> **Example 8.50** (linear programming example). Consider
> $$(\mathrm{LP})\qquad \min\ \mathbf{c}^T\mathbf{x}\quad\text{s.t.}\quad A\mathbf{x}\le\mathbf{b},\ \mathbf{x}\in\Delta_n,$$
> where $\mathbf{c}\in\mathbb{R}^n$, $A\in\mathbb{R}^{m\times n}$, $\mathbf{b}\in\mathbb{R}^m$.

对偶法取 $X=\Delta_n$、$\mathbf{g}(\mathbf{x})\equiv A\mathbf{x}-\mathbf{b}$。子问题 $\mathbf{x}_k\in\arg\min_{\mathbf{x}\in\Delta_n}(\mathbf{c}+A^T\boldsymbol{\lambda}_k)^T\mathbf{x}$ 的最优解就是单位向量 $\mathbf{e}_{i_k}$，其中 $i_k$ 使 $(\mathbf{c}+A^T\boldsymbol{\lambda}_k)_i$ 最小。故算法（$\gamma_k=1/\sqrt{k+1}$）：
- $i_k\in\arg\min_{i=1,\dots,n}v_i$，$v=\mathbf{c}+A^T\boldsymbol{\lambda}_k$；
- $\mathbf{x}_k=\mathbf{e}_{i_k}$；
- $\boldsymbol{\lambda}_{k+1}=\left[\boldsymbol{\lambda}_k+\dfrac{1}{\sqrt{k+1}}\dfrac{A\mathbf{x}_k-\mathbf{b}}{\|A\mathbf{x}_k-\mathbf{b}\|^2}\right]_+$。

**作者注**：这正说明 $\{\mathbf{x}_k\}$ 不是正确原始序列——每一步 $\mathbf{x}_k$ 都是单位向量，而 LP 最优解（如实例 (8.90) 的最优解 $(\tfrac12,0,\tfrac12)$）通常不是单位向量。正确收敛的是**平均序列** $\mathbf{x}^{(k)}$ 或 $\mathbf{x}^{\langle k\rangle}$。具体实例 (8.90) 在 $\lambda_0=\mathbf{0}$ 下，前 100 次迭代半段平均明显优于全平均（见原书 Figure 8.4）。

## 8.5.4 Example—Network Utility Maximization

考虑网络有源集合 $S=\{1,\dots,\mathcal{S}\}$、链路集合 $L=\{1,\dots,\mathcal{L}\}$，链路 $\ell$ 容量 $c_\ell$。源 $s$ 用链路集 $L(s)$，链路 $\ell$ 被源集 $S(\ell)$ 使用。源 $s$ 有凹效用函数 $u_s$，速率限制在 $I_s=[0,M_s]$。网络效用最大化（NUM）：
$$\max\sum_{s\in S}u_s(x_s)\quad\text{s.t.}\quad\sum_{s\in S(\ell)}x_s\le c_\ell\ (\ell\in L),\ x_s\in I_s\ (s\in S).\tag{8.91}$$
写成最小化问题即主模型 (8.62)，其中
$$\mathbf{g}(\mathbf{x})=\begin{pmatrix}\sum_{s\in S(\ell)}x_s-c_\ell\end{pmatrix}_{\ell=1,\dots,\mathcal{L}},\quad X=I_1\times\cdots\times I_{\mathcal{S}},\quad f(\mathbf{x})=-\sum_{s=1}^{\mathcal{S}}u_s(x_s).$$
迭代 $k$ 取 $\mathbf{x}_k\in\arg\min_{\mathbf{x}\in X}\{f(\mathbf{x})+(\boldsymbol{\lambda}_k)^T\mathbf{g}(\mathbf{x})\}$，问题对各 $x_s$ 可分离，故第 $s$ 个分量：
$$\mathbf{x}_k^s\in\arg\max_{x_s\in I_s}\left\{u_s(x_s)-\Big(\sum_{\ell\in L(s)}\lambda_k^\ell\Big)x_s\right\}.\tag{8.92}$$
链路价格更新：
$$\lambda_{k+1}^\ell=\left[\lambda_k^\ell+\alpha_k\Big(\sum_{s\in S(\ell)}x_k^s-c_\ell\Big)\right]_+,\quad \ell\in L.$$
$\lambda_k^\ell$ 可解释为链路价格。该算法**可分布式实现**：每个源只用自己的效用与所用链路的价格解 (8.92)；每条链路只根据本链路上各源的速率更新价格。源与链路局部通信即可协同求最优——这是分布式优化的经典范例。

**全章小结**：从梯度法的"负梯度必下降"出发，到"负次梯度未必下降"逼出投影 + Fejér 单调；Polyak 步长给 $\mathcal{O}(1/\sqrt{k})$、动态步长给不依赖 $f_{\mathrm{opt}}$ 的 $\mathcal{O}(\log k/\sqrt{k})$、强凸给 $\mathcal{O}(1/k)$；随机/增量变体处理大规模求和；最后对偶投影次梯度法用平均序列处理带约束原问题。所有收敛都归结为一个根本不等式 + 投影非扩张（Thm 6.42），这是贯穿全章的脊梁。
