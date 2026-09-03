---
blog: true
title: "Chapter 13-The Generalized Conditional Gradient Method"
slug: "chapter-13-the-generalized-conditional-gradient-method-by1fx8x"
summary: "广义条件梯度法（Frank–Wolfe 的复合推广）：线性预言、条件梯度范数作为最优性度量、非凸/凸/强凸三档收敛性，以及与近端结合的分块随机版本。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

在本书中，本章所有 underlying spaces 都是**有限维欧氏空间**，默认范数即欧氏范数 $\|\cdot\|=\sqrt{\langle\cdot,\cdot\rangle}$。这一章是 Frank–Wolfe / 条件梯度法（CGM）的"全家桶"：从朴素 Frank–Wolfe 推广到复合问题 $f+g$，再分"非凸、凸、强凸（含负结果）"三档收敛分析，最后给分块随机版本。

读这一章要和 **Ch10 的投影 / 近端梯度法**对照：CGM 的卖点是**不投影**——用"在可行集上求一个线性极小化（线性预言 / linear oracle）"代替 $P_C$。当投影很贵、线性预言很便宜时（单纯形、结构化约束），CGM 更香。§13.2.2 的 **conditional gradient norm** 在精神上等价于 Ch10 §10.3.2 的**梯度映射**，但长得完全不一样。

# 13.1 The Frank–Wolfe / Conditional Gradient Method

> Consider the problem
> $$\min\{f(\mathbf{x}) : \mathbf{x}\in C\}, \tag{13.1}$$
> where $C\subseteq \mathbb{E}$ is a nonempty convex and compact set and $f:\mathbb{E}\to(-\infty,\infty]$ is a convex function satisfying $C\subseteq \mathrm{dom}(f)$. We further assume that $\mathrm{dom}(f)$ is open and that $f$ is differentiable over $\mathrm{dom}(f)$.

**逐字点评**：和 Ch10.2 投影梯度法是同一个问题 $\min_{\mathbf{x}\in C}f(\mathbf{x})$。投影梯度更新是 $\mathbf{x}_{k+1}=P_C(\mathbf{x}_k-t_k\nabla f(\mathbf{x}_k))$。**CGM 的动机**是：在很多情形下对 $C$ 求正交投影 $P_C$ 很贵，但"在 $C$ 上极小化一个线性函数"却很便宜。

The Conditional Gradient Method
- **Initialization**: pick $\mathbf{x}_0\in C$.
- **General step**: for any $k=0,1,2,\dots$:
  - (a) compute $\mathbf{p}_k\in \arg\min_{\mathbf{p}\in C}\langle \nabla f(\mathbf{x}_k),\mathbf{p}\rangle$;
  - (b) choose $t_k\in[0,1]$ and set $\mathbf{x}_{k+1}=\mathbf{x}_k+t_k(\mathbf{p}_k-\mathbf{x}_k)$.

**关键直觉**：$\arg\min_{\mathbf{p}\in C}\langle\nabla f(\mathbf{x}_k),\mathbf{p}\rangle$ 是在可行集上找"让线性化方向下降最多"的点（**Ch1 §1.11 对偶范数 / 支撑函数**思想的特例）。更新 $\mathbf{x}_{k+1}=(1-t_k)\mathbf{x}_k+t_k\mathbf{p}_k$ 是 $C$ 的凸组合，因 $C$ 凸且紧，整个序列天然留在 $C$ 内——**连投影都不需要**，这是 CGM 最重要的结构优势。

> **前向指针**：当 $g=\delta_C$（Ch2 的示性函数）时，下面 §13.2 的广义方法就退化回这个朴素 Frank–Wolfe。

# 13.2 The Generalized Conditional Gradient Method

## 13.2.1 Model and Method

> Consider the composite problem
> $$\min \{F(\mathbf{x})\equiv f(\mathbf{x})+g(\mathbf{x})\}, \tag{13.2}$$
> where we assume the following set of properties.

> **Assumption 13.1.** (A) $g:\mathbb{E}\to(-\infty,\infty]$ is proper closed and convex and $\mathrm{dom}(g)$ is compact. (B) $f:\mathbb{E}\to(-\infty,\infty]$ is $L_f$-smooth over $\mathrm{dom}(f)$ ($L_f>0$), an open convex set satisfying $\mathrm{dom}(g)\subseteq \mathrm{dom}(f)$. (C) The optimal set of (13.2) is nonempty, denoted $X^*$; the optimal value is $F_{\mathrm{opt}}$.

**逐字点评**：(A) 的 $g$ 是 Ch2 意义上的**正常、闭、凸**且定义域紧，不要求光滑（示性函数、稀疏罚都行）；(B) 的 $f$ 是 **$L_f$-光滑**（Ch5 的 descent lemma, Lemma 5.7 前提）；(C) 其实被 (A)(B) 推出——$\mathrm{dom}(g)$ 紧 + $f$ 连续 + $g$ 正常闭凸，Weierstrass 型结论保证最优集非空。

The Generalized Conditional Gradient Method
- **Initialization**: pick $\mathbf{x}_0\in \mathrm{dom}(g)$.
- **General step**: for any $k=0,1,2,\dots$:
  - (a) compute $\mathbf{p}_k\in \arg\min_{\mathbf{p}\in \mathbb{E}}\bigl\{\langle \nabla f(\mathbf{x}_k),\mathbf{p}\rangle+g(\mathbf{p})\bigr\}$;
  - (b) choose $t_k\in[0,1]$ and set $\mathbf{x}_{k+1}=\mathbf{x}_k+t_k(\mathbf{p}_k-\mathbf{x}_k)$.

**"广义"二字的真意**：朴素版在 $C$ 上极小化 $\langle\nabla f(\mathbf{x}_k),\mathbf{p}\rangle$（纯线性）；广义版在**全空间**极小化"线性化后的 $f$ + 原封不动的 $g$"。当 $g=\delta_C$ 时，对 $C$ 外罚 $\infty$，于是 $\arg\min_{\mathbf{p}}\{\langle\nabla f(\mathbf{x}_k),\mathbf{p}\rangle+\delta_C(\mathbf{p})\}=\arg\min_{\mathbf{p}\in C}\langle\nabla f(\mathbf{x}_k),\mathbf{p}\rangle$，立刻退回朴素版。

## 13.2.2 The Conditional Gradient Norm

> Of course, $\mathbf{p}(\mathbf{x})$ is not uniquely defined... We assume that there exists some rule for choosing an optimal solution whenever the optimal set of (13.3) is not a singleton...

记
$$\mathbf{p}(\mathbf{x})\in \arg\min_{\mathbf{p}}\bigl\{\langle \nabla f(\mathbf{x}),\mathbf{p}\rangle+g(\mathbf{p})\bigr\}. \tag{13.3}$$
不唯一时按固定规则选，迭代里的 $\mathbf{p}_k$ 取同一规则下的 $\mathbf{p}(\mathbf{x}_k)$。

> **Definition 13.2** (conditional gradient norm). Suppose $f,g$ satisfy (A),(B) of Assumption 13.1. The conditional gradient norm is $S:\mathrm{dom}(f)\to\mathbb{R}$ defined by
> $$S(\mathbf{x})=\langle \nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}(\mathbf{x})\rangle+g(\mathbf{x})-g\bigl(\mathbf{p}(\mathbf{x})\bigr).$$

**为什么这一行最关键**：Ch10 近端梯度法用"梯度映射"当最优性度量；CGM 没法用投影，改用 $S(\mathbf{x})$。它量的是"若只往线性预言方向走一步能下降多少"——$\langle\nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}(\mathbf{x})\rangle$ 是光滑部分潜在下降，$g(\mathbf{x})-g(\mathbf{p}(\mathbf{x}))$ 是非光滑部分潜在下降。

> **Remark 13.3.** The conditional gradient norm depends on $f$ and $g$, so a more precise notation would be $S_{f,g}(\mathbf{x})$... we keep $S(\mathbf{x})$.

> **Remark 13.4.** By definition of $\mathbf{p}(\mathbf{x})$ (13.3), we can also write
> $$S(\mathbf{x})=\max_{\mathbf{p}\in\mathbb{E}}\bigl\{\langle \nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}\rangle+g(\mathbf{x})-g(\mathbf{p})\bigr\}. \tag{13.4}$$

**逐字点评**：(13.4) 把"$\mathbf{p}(\mathbf{x})$ 是极小点"翻成"对任意 $\mathbf{p}$ 都不比它好"。后面证定理时反复用这个 max 形式。

> **Lemma 13.5.** Suppose $f,g$ satisfy (A),(B) of Assumption 13.1. Then for any $\mathbf{x}\in \mathrm{dom}(f)$,
> $$S(\mathbf{x})=\langle \nabla f(\mathbf{x}),\mathbf{x}\rangle+g(\mathbf{x})+g^*\bigl(-\nabla f(\mathbf{x})\bigr). \tag{13.5}$$

**证明（自己走一遍）**。从 (13.4)：
$$\begin{aligned}
S(\mathbf{x})
&=\max_{\mathbf{p}}\bigl\{\langle \nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}\rangle+g(\mathbf{x})-g(\mathbf{p})\bigr\} \\
&=\langle \nabla f(\mathbf{x}),\mathbf{x}\rangle+g(\mathbf{x})+\max_{\mathbf{p}}\bigl\{\langle -\nabla f(\mathbf{x}),\mathbf{p}\rangle-g(\mathbf{p})\bigr\}.
\end{aligned}$$
按共轭定义 $g^*(\mathbf{y})=\max_{\mathbf{p}}\{\langle\mathbf{y},\mathbf{p}\rangle-g(\mathbf{p})\}$，取 $\mathbf{y}=-\nabla f(\mathbf{x})$ 得最后一项 $=g^*(-\nabla f(\mathbf{x}))$。合起来即 (13.5)。$\blacksquare$

**结论**：$S(\mathbf{x})$ 是个"非负 + 在驻点为零"的量——因为 (13.5) 里 $g^*(-\nabla f(\mathbf{x}))$ 与 $\langle\nabla f(\mathbf{x}),\mathbf{x}\rangle+g(\mathbf{x})$ 之间正好是 Fenchel 对偶间隙（**Ch4 的 Fenchel 不等式，Thm 4.6**）。

> **Theorem 13.6** (conditional gradient norm as an optimality measure). Suppose $f,g$ satisfy (A),(B) of Assumption 13.1. Then
> (a) $S(\mathbf{x})\ge 0$ for any $\mathbf{x}\in \mathrm{dom}(f)$;
> (b) $S(\mathbf{x}^*)=0$ iff $-\nabla f(\mathbf{x}^*)\in \partial g(\mathbf{x}^*)$, i.e. $\mathbf{x}^*$ is a stationary point of (13.2).

**证明（自己走一遍）**。(a) 套 (13.5) 与 Fenchel 不等式（Thm 4.6：$g^*(\mathbf{y})\ge\langle\mathbf{y},\mathbf{x}\rangle-g(\mathbf{x})$）：
$$g^*(-\nabla f(\mathbf{x}))\ge -\langle\nabla f(\mathbf{x}),\mathbf{x}\rangle-g(\mathbf{x})\;\Rightarrow\;S(\mathbf{x})\ge 0.$$
(b) 由 (a)，$S(\mathbf{x}^*)=0\iff$ 对所有 $\mathbf{p}$ 有 $\langle\nabla f(\mathbf{x}^*),\mathbf{x}^*-\mathbf{p}\rangle+g(\mathbf{x}^*)-g(\mathbf{p})\le 0$，即 $g(\mathbf{p})\ge g(\mathbf{x}^*)+\langle\nabla f(\mathbf{x}^*),\mathbf{p}-\mathbf{x}^*\rangle$——正是次梯度不等式 $-\nabla f(\mathbf{x}^*)\in\partial g(\mathbf{x}^*)$（见 **Ch3 的 Def 3.73 驻点定义**）。$\blacksquare$

> **Lemma 13.7** (fundamental inequality). Suppose $f,g$ satisfy (A),(B). Let $\mathbf{x}\in \mathrm{dom}(g)$, $t\in[0,1]$. Then
> $$F\bigl(\mathbf{x}+t(\mathbf{p}(\mathbf{x})-\mathbf{x})\bigr)\le F(\mathbf{x})-tS(\mathbf{x})+\frac{t^2L_f}{2}\|\mathbf{p}(\mathbf{x})-\mathbf{x}\|^2. \tag{13.6}$$

**证明（自己走一遍）**。记 $\mathbf{p}^+=\mathbf{p}(\mathbf{x})$，用 descent lemma（**Ch5 Lemma 5.7**）放缩 $f$、用 $g$ 凸性把 $g((1-t)\mathbf{x}+t\mathbf{p}^+)\le(1-t)g(\mathbf{x})+tg(\mathbf{p}^+)$（Ch2 Thm 2.7(b)"凸函数保持凸组合上界"那一招）：
$$\begin{aligned}
F(\mathbf{x}+t(\mathbf{p}^+-\mathbf{x}))
&\le f(\mathbf{x})-t\langle \nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}^+\rangle+\frac{t^2L_f}{2}\|\mathbf{p}^+-\mathbf{x}\|^2+(1-t)g(\mathbf{x})+tg(\mathbf{p}^+) \\
&=F(\mathbf{x})-t\bigl(\langle \nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}^+\rangle+g(\mathbf{x})-g(\mathbf{p}^+)\bigr)+\frac{t^2L_f}{2}\|\mathbf{p}^+-\mathbf{x}\|^2 \\
&=F(\mathbf{x})-tS(\mathbf{x})+\frac{t^2L_f}{2}\|\mathbf{p}^+-\mathbf{x}\|^2.
\end{aligned}$$
$\blacksquare$

## 13.2.3 Convergence Analysis in the Nonconvex Case

本节**不假设 $f$ 凸**，收敛只能证到驻点。先列三种步长：
- **Predefined diminishing**: $t_k=\dfrac{2}{k+2}$.
- **Adaptive**: $t_k=\min\left\{1,\ \dfrac{S(\mathbf{x}_k)}{L_f\|\mathbf{x}_k-\mathbf{p}_k\|^2}\right\}$.
- **Exact line search**: $t_k\in \arg\min_{t\in[0,1]}F(\mathbf{x}_k+t(\mathbf{p}_k-\mathbf{x}_k))$.

> **Lemma 13.8** (sufficient decrease). Suppose $f,g$ satisfy (A),(B), and $\{\mathbf{x}_k\}$ uses adaptive or exact line search. Then for any $k\ge 0$,
> $$F(\mathbf{x}_k)-F(\mathbf{x}_{k+1})\ge \frac{1}{2}\min\left\{S(\mathbf{x}_k),\ \frac{S^2(\mathbf{x}_k)}{L_f D^2}\right\}, \tag{13.7}$$
> where $D\ge \max_{\mathbf{x},\mathbf{y}\in\mathrm{dom}(g)}\|\mathbf{x}-\mathbf{y}\|$.

**证明（自己走一遍）**。令 $\widetilde{\mathbf{x}}_k=\mathbf{x}_k+s_k(\mathbf{p}_k-\mathbf{x}_k)$，$s_k=\min\{1,S/(L_f\|\mathbf{x}_k-\mathbf{p}_k\|^2)\}$。由 (13.6) 取 $t=s_k$：
$$F(\mathbf{x}_k)-F(\widetilde{\mathbf{x}}_k)\ge s_kS-\frac{s_k^2L_f}{2}\|\mathbf{x}_k-\mathbf{p}_k\|^2. \tag{13.8}$$
两种情形：① 若 $S/(L_f\|\cdot\|^2)\le 1$，则 $s_k=S/(L_f\|\cdot\|^2)$，代入得 $\ge S^2/(2L_f\|\cdot\|^2)\ge S^2/(2L_fD^2)$；② 若 $S/(L_f\|\cdot\|^2)\ge 1$，则 $s_k=1$，(13.8) 给 $\ge S-\frac{L_f}{2}\|\cdot\|^2\overset{(13.9)}{\ge}\frac12 S$。合起来均有 (13.7)。adaptive 时 $\widetilde{\mathbf{x}}_k=\mathbf{x}_{k+1}$；exact line search 时 $F(\mathbf{x}_{k+1})\le F(\widetilde{\mathbf{x}}_k)$，故 (13.7) 成立。$\blacksquare$

> **Theorem 13.9** (convergence of the generalized conditional gradient). Suppose Assumption 13.1 holds, $\{\mathbf{x}_k\}$ uses adaptive or exact line search. Then
> (a) for any $k\ge 0$, $F(\mathbf{x}_k)\ge F(\mathbf{x}_{k+1})$, and $F(\mathbf{x}_k)>F(\mathbf{x}_{k+1})$ if $\mathbf{x}_k$ not stationary;
> (b) $S(\mathbf{x}_k)\to 0$ as $k\to\infty$;
> (c) for any $k\ge 0$,
> $$\min_{n=0,1,\dots,k}S(\mathbf{x}_n)\le \max\left\{\frac{2(F(\mathbf{x}_0)-F_{\mathrm{opt}})}{k+1},\ \sqrt{\frac{2L_f D^2(F(\mathbf{x}_0)-F_{\mathrm{opt}})}{k+1}}\right\}; \tag{13.11}$$
> (d) all limit points of $\{\mathbf{x}_k\}$ are stationary points of (13.2).

**作者注（关于 (c) 的符号）**：原书此处把 (13.11) 印成了带负号的"下界"形式（一份已知排版勘误）。从证明 (13.13) 实际推出的是上面的**上界**：前 $k$ 个迭代里"最好的那一个"的 $S$ 不超过这两个量，即 $S(\mathbf{x}_k)\to 0$ 的 $O(1/\sqrt{k})$ 速率（根号项在大 $k$ 主导）。下面证明只用正确版本。

**证明（自己走一遍）**。(a) 单调性来自 (13.7) 与 $S\ge 0$（Thm 13.6(a)）；非驻点时 $S>0$（Thm 13.6(b)）故严格下降。(b) $\{F(\mathbf{x}_k)\}$ 单调不增有下界 $F_{\mathrm{opt}}$ 故收敛，$F(\mathbf{x}_k)-F(\mathbf{x}_{k+1})\to 0$；由 (13.7) 得 $\min\{S,S^2/(L_fD^2)\}\to 0$，故 $S(\mathbf{x}_k)\to 0$。(c) 对 $n=0,\dots,k$ 用 (13.7) 求和：
$$F(\mathbf{x}_0)-F(\mathbf{x}_{k+1})\ge \frac12\sum_{n=0}^k\min\left\{S(\mathbf{x}_n),\frac{S^2(\mathbf{x}_n)}{L_fD^2}\right\}. \tag{13.13}$$
用 $F(\mathbf{x}_{k+1})\le F_{\mathrm{opt}}$ 与求和 $\ge (k+1)\min_n(\cdots)$，得 $\min_n\min\{S,S^2/(L_fD^2)\}\le 2\Delta/(k+1)$（$\Delta:=F(\mathbf{x}_0)-F_{\mathrm{opt}}$）。设 $m_k=\min_{n\le k}S(\mathbf{x}_n)$，则 $\min\{m_k,m_k^2/(L_fD^2)\}\le 2\Delta/(k+1)$，推出 $m_k\le 2\Delta/(k+1)$ 且 $m_k\le\sqrt{2L_fD^2\Delta/(k+1)}$，即 (13.11)。(d) 设 $\bar{\mathbf{x}}$ 是极限点，取子列 $\mathbf{x}_{k_j}\to\bar{\mathbf{x}}$。由 $S(\cdot)$ 定义（任取 $\mathbf{v}$）$S(\mathbf{x}_{k_j})\ge \langle \nabla f(\mathbf{x}_{k_j}),\mathbf{x}_{k_j}-\mathbf{v}\rangle+g(\mathbf{x}_{k_j})-g(\mathbf{v})$。令 $j\to\infty$，用 $S(\mathbf{x}_{k_j})\to 0$（(b)）、$\nabla f$ 连续、$g$ 下半连续（Ch2 的 lsc），得对任意 $\mathbf{v}$ 有 $0\ge \langle \nabla f(\bar{\mathbf{x}}),\bar{\mathbf{x}}-\mathbf{v}\rangle+g(\bar{\mathbf{x}})-g(\mathbf{v})$，即 $-\nabla f(\bar{\mathbf{x}})\in\partial g(\bar{\mathbf{x}})$——驻点。$\blacksquare$

> **Example 13.10** (optimization over the unit ball). $\min\{f(\mathbf{x}):\|\mathbf{x}\|\le 1\}$, $f$ $L_f$-smooth. Fits (13.2) with $g=\delta_{B[0,1]}$, so the method amounts to CGM with $C=B[0,1]$.

**自己推 $S(\mathbf{x})$**。线性预言 $\mathbf{p}(\mathbf{x})=\arg\min_{\|\mathbf{p}\|\le 1}\langle\nabla f(\mathbf{x}),\mathbf{p}\rangle=-\nabla f(\mathbf{x})/\|\nabla f(\mathbf{x})\|$（$\nabla f=\mathbf{0}$ 时取 $\mathbf{0}$），于是对任意 $\mathbf{x}\in B[0,1]$，
$$S(\mathbf{x})=\langle \nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}(\mathbf{x})\rangle=\langle \nabla f(\mathbf{x}),\mathbf{x}\rangle+\|\nabla f(\mathbf{x})\|. \tag{13.15}$$
由 Thm 13.6 非负、为零当且仅当 $\mathbf{x}$ 是 (13.14) 驻点（即 $\nabla f(\mathbf{x})=\mathbf{0}$ 或 $\nabla f(\mathbf{x})=\lambda\mathbf{x},\lambda\ge 0$，见 [10, Example 9.6]）。更新：
$$\mathbf{x}_{k+1}=(1-t_k)\mathbf{x}_k-t_k\frac{\nabla f(\mathbf{x}_k)}{\|\nabla f(\mathbf{x}_k)\|}.$$

> **Example 13.11** (the power method). $\max_{\mathbf{x}\in\mathbb{R}^n}\{\frac12\mathbf{x}^T\mathbf{A}\mathbf{x}:\|\mathbf{x}\|_2\le 1\}$, $\mathbf{A}\in\mathbb{S}^n_+$. Fits (13.14) with $f(\mathbf{x})=-\frac12\mathbf{x}^T\mathbf{A}\mathbf{x}$.

**自己推**。$\nabla f(\mathbf{x})=-\mathbf{A}\mathbf{x}$，线性预言 $\mathbf{p}(\mathbf{x})=\arg\max_{\|\mathbf{p}\|\le 1}\langle\mathbf{A}\mathbf{x},\mathbf{p}\rangle=\mathbf{A}\mathbf{x}/\|\mathbf{A}\mathbf{x}\|$。非驻点时 CGM 更新
$$\mathbf{x}_{k+1}=(1-t_k)\mathbf{x}_k+t_k\frac{\mathbf{A}\mathbf{x}_k}{\|\mathbf{A}\mathbf{x}_k\|}. \tag{13.17}$$
exact line search 下，因 $f$ 凹，一维问题最优解在端点 $0$ 或 $1$；又由 Thm 13.9(a) 非驻点时 $t_k\neq 0$，故取 $t_k=1$，(13.17) 退化为 $\mathbf{x}_{k+1}=\mathbf{A}\mathbf{x}_k/\|\mathbf{A}\mathbf{x}_k\|$——**这正是求 $\mathbf{A}$ 最大特征值对应特征向量的幂法（power method）**。Thm 13.9 保证极限点是 (13.16) 的驻点，即 $\mathbf{A}$ 对应非负特征值的特征向量。（Luss 与 Teboulle [85] 指出了这层联系。）

## 13.2.4 Convergence Analysis in the Convex Case

额外假设 $f$ 凸。此时 (13.2) 的驻点都是最优点（**Ch3 的 Thm 3.72(b)**），还要证明**函数值**的 $O(1/k)$。

> **Lemma 13.12.** Suppose Assumption 13.1 holds and $f$ is convex. Then for any $\mathbf{x}\in \mathrm{dom}(g)$,
> $$S(\mathbf{x})\ge F(\mathbf{x})-F_{\mathrm{opt}}.$$

**证明（自己走一遍）**。取 $\mathbf{x}^*\in X^*$：
$$\begin{aligned}
S(\mathbf{x})
&=\langle \nabla f(\mathbf{x}),\mathbf{x}\rangle+g(\mathbf{x})-\bigl(\langle \nabla f(\mathbf{x}),\mathbf{p}(\mathbf{x})\rangle+g(\mathbf{p}(\mathbf{x}))\bigr) \\
&\ge \langle \nabla f(\mathbf{x}),\mathbf{x}\rangle+g(\mathbf{x})-\bigl(\langle \nabla f(\mathbf{x}),\mathbf{x}^*\rangle+g(\mathbf{x}^*)\bigr) &&\text{[}\mathbf{p}(\mathbf{x})\text{ 极小性]}\\
&=\langle \nabla f(\mathbf{x}),\mathbf{x}-\mathbf{x}^*\rangle+g(\mathbf{x})-g(\mathbf{x}^*) \\
&\ge f(\mathbf{x})-f(\mathbf{x}^*)+g(\mathbf{x})-g(\mathbf{x}^*) &&\text{[}f\text{ 凸]}\\
&=F(\mathbf{x})-F_{\mathrm{opt}}.
\end{aligned}$$
$\blacksquare$

> **Lemma 13.13.** Let $p$ be a positive integer, $\{a_k\},\{b_k\}$ nonnegative satisfying for any $k\ge 0$
> $$a_{k+1}\le (1-\gamma_k)a_k+\frac{A}{2}w_k^2, \tag{13.19}$$
> where $w_k=\dfrac{2}{k+2p}$ and $A>0$. Suppose $a_k\le b_k$ for all $k$. Then
> (a) $a_k\le \dfrac{2\max\{A,(p-1)a_0\}}{k+2p-2}$ for $k\ge 1$;
> (b) for $k\ge 3$, $\displaystyle\min_{n=\lceil k/2\rceil+2,\dots,k}b_n\le \dfrac{8\max\{A,(p-1)a_0\}}{k-2}$.

**证明（给骨架）**。核心是反复展开 (13.19) 成乘积。由 $a_k\le b_k$：
$$a_k\le a_0\prod_{s=0}^{k-1}(1-\gamma_s)+\frac{A}{2}\sum_{u=0}^{k-1}\left(\prod_{s=u+1}^{k-1}(1-\gamma_s)\right)w_u^2. \tag{13.20}$$
代入 $\gamma_s=\frac{2s+2p-2}{s+2p}$（$w_s=2/(s+2p)$ 使 $1-\gamma_s=\frac{s+2p-2}{s+2p}$）。第一部分乘积 $=a_0\frac{(2p-2)(2p-1)}{(k+2p-2)(k+2p-1)}$；第二部分放缩后 $\le \frac{2Ak}{(k+2p-2)(k+2p-1)}$。合起来得 (a)。(b) 把 $b_n$ 在 $n=j,\dots,k$ 求和、用 (a) 控制和、再裂项 $\frac{1}{(n+2p-1)(n+2p)}=\frac{1}{n+2p-1}-\frac{1}{n+2p}$，取 $j=\lceil k/2\rceil+2$ 得 $8\max\{\cdot\}/(k-2)$。$\blacksquare$

**为什么需要它**：这是 Ch4 的 Lemma 4.4（Bach [4]）的推广，专门处理"每步下降量既依赖 $a_k$ 又带随步数衰减的噪声项 $w_k^2$"的递推。Thm 13.14 与 Thm 13.29 都靠它榨出 $O(1/k)$。

> **Theorem 13.14.** Suppose Assumption 13.1 holds and $f$ convex. Let $\{\mathbf{x}_k\}$ use predefined $t_k=\frac{2}{k+2}$, adaptive, or exact line search. Let $D\ge \max_{\mathbf{x},\mathbf{y}\in\mathrm{dom}(g)}\|\mathbf{x}-\mathbf{y}\|$. Then
> (a) $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le \dfrac{2L_fD^2}{k}$ for $k\ge 1$;
> (b) $\displaystyle\min_{n=\lceil k/2\rceil+2,\dots,k}S(\mathbf{x}_n)\le \dfrac{8L_fD^2}{k-2}$ for $k\ge 3$.

**证明（自己走一遍）**。对 (13.6) 取 $t=t_k$ 减 $F_{\mathrm{opt}}$ 得 (13.25)。predefined $t_k=\gamma_k=2/(k+2)$ 直接给 (13.26)；exact line search 由 $u_k$ 定义有 $F(\mathbf{x}_k+u_k(\cdots))\le F(\mathbf{x}_k+\gamma_k(\cdots))$，套 (13.26) 得 (13.27)；adaptive $v_k$ 是二次函数极小点，对应项不超过 predefined。三种步长统一给出
$$F(\mathbf{x}_{k+1})-F_{\mathrm{opt}}\le F(\mathbf{x}_k)-F_{\mathrm{opt}}-\gamma_k S(\mathbf{x}_k)+\frac{\gamma_k^2L_fD^2}{2},$$
用了 $\|\mathbf{x}_k-\mathbf{p}_k\|\le D$。令 $a_k=F(\mathbf{x}_k)-F_{\mathrm{opt}}$、$b_k=S(\mathbf{x}_k)$、$A=L_fD^2$、$p=1$，由 Lemma 13.12 知 $a_k\le b_k$，套 Lemma 13.13 即得。$\blacksquare$

**结论**：凸情形 CGM 函数值收敛率 **$O(1/k)$**——和投影/近端梯度法同阶，但只用线性预言（回应 Ch10 的钩子：不投影也能拿一样快的 $O(1/k)$）。

# 13.3 The Strongly Convex Case

聚焦 $g=\delta_C$（$C$ 紧凸），即朴素 Frank–Wolfe。先失望再拍案：**即使目标强凸，Frank–Wolfe 一般也拿不到线性收敛；线性收敛要靠"可行集强凸"**。

## 13.3.1 The Negative Result of Canon and Cullum

> **Lemma 13.15.** Let $\{a_n\}_{n\ge 0}$ satisfy $\sum_{n=0}^\infty |a_n|$ diverges. Then for every $\varepsilon>0$, for infinitely many $k$,
> $$\sum_{n=k}^\infty a_n^2\ge \frac{1}{k^{1+\varepsilon}}.$$

**证明（反证骨架）**。假设存在 $\varepsilon>0,K$ 使对所有 $k\ge K$ 有 $\sum_{n=k}^\infty a_n^2<1/k^{1+2\varepsilon}$。由 Cauchy–Schwarz：
$$\sum_{n=1}^\infty |a_n|=\sum |a_n|n^{(1+\varepsilon)/2}n^{-(1+\varepsilon)/2}\le \left(\sum n^{1+\varepsilon}a_n^2\right)^{1/2}\left(\sum n^{-(1+\varepsilon)}\right)^{1/2}.$$
后一级数收敛，只需证前者收敛。对每个 $m\ge K$ 交换求和序得 $\frac{1}{1+\varepsilon}\sum_{n=K}^m(n^{1+\varepsilon}-(K-1)^{1+\varepsilon})a_n^2\le\sum_{k=K}^m 1/k^{1+\varepsilon}$，右端收敛故 $\sum n^{1+\varepsilon}a_n^2$ 收敛，从而 $\sum|a_n|$ 收敛，与前提矛盾。$\blacksquare$

> **Lemma 13.16** (see [75, Chapter VII, Theorem 4]). Let $\{b_n\}$ satisfy $0\le b_n<1$. Then $\prod_{n=0}^m(1-b_n)\to 0$ as $m\to\infty$ iff $\sum_{n=0}^\infty b_n$ diverges.

**标准无穷乘积结论**：$\prod(1-b_n)$ 收敛到正数 $\iff \sum b_n$ 收敛（因 $\log(1-b_n)\sim -b_n$）。

> **Assumption 13.17.** $\mathrm{int}(D)\neq\varnothing$ and the optimal solution $\mathbf{x}^*$ of (13.32) is on the boundary of $D$ and is not an extreme point of $D$.

> $$f_{\mathrm{opt}}=\min_{\mathbf{x}\in\mathbb{R}^n}\left\{f_q(\mathbf{x})\equiv \tfrac12\mathbf{x}^T\mathbf{Q}\mathbf{x}+\mathbf{b}^T\mathbf{x}:\mathbf{x}\in D\right\}, \tag{13.32}$$
> where $\mathbf{Q}\in\mathbb{S}^n_{++}$, $\mathbf{b}\in\mathbb{R}^n$, and $D=\mathrm{conv}\{\mathbf{a}_1,\dots,\mathbf{a}_l\}$.

Frank–Wolfe 配 exact line search 的具体形式：选 $i_k\in\arg\min_i\langle\mathbf{a}_i,\nabla f_q(\mathbf{x}_k)\rangle$；定义 $\mathbf{d}_k=\mathbf{a}_{i_k}-\mathbf{x}_k$ (13.33)；若 $\langle\mathbf{d}_k,\nabla f_q(\mathbf{x}_k)\rangle\ge 0$ 则已最优，否则 $\mathbf{x}_{k+1}=\mathbf{x}_k+t_k\mathbf{d}_k$，其中
$$t_k=\min\{\lambda_k,1\},\quad \lambda_k=-\frac{\langle\mathbf{d}_k,\nabla f_q(\mathbf{x}_k)\rangle}{\mathbf{d}_k^T\mathbf{Q}\mathbf{d}_k}. \tag{13.34}$$

> **Assumption 13.18.** $f_q(\mathbf{x}_0)<\min_i f_q(\mathbf{a}_i)$ and $\mathbf{x}_0=\mathbf{A}\mathbf{v}_0\in D$, where $\mathbf{v}_0\in\Delta_l\cap\mathbb{R}^l_{++}$. In particular $\mathbf{x}_0\in\mathrm{int}(D)$.

> **Lemma 13.19.** Suppose Assumptions 13.17, 13.18 hold and $\{\mathbf{x}_k\}$ is CG with exact line search. Let $\mathbf{d}_k,\lambda_k$ be (13.33),(13.34). Then
> (a) $\mathbf{x}_k\in\mathrm{int}(D)$ and $t_k=\lambda_k<1$ for all $k$;
> (b) $f_q(\mathbf{x}_{k+1})=f_q(\mathbf{x}_k)-\frac12(\mathbf{d}_k^T\mathbf{Q}\mathbf{d}_k)\lambda_k^2$;
> (c) $\sum_{k=0}^\infty \lambda_k=\infty$;
> (d) $\exists\beta>0$: $(\mathbf{d}_k^T\mathbf{Q}\mathbf{d}_k)\ge \beta$ for all $k$.

**证明（挑关键）**。(a) 若某步 $t_k=1$ 则 $\mathbf{x}_{k+1}=\mathbf{a}_{i_k}$，但 $f_q(\mathbf{a}_{i_k})>f_q(\mathbf{x}_0)$（起点比所有顶点好），与 Thm 13.9(a) 单调矛盾，故 $t_k=\lambda_k<1$。$\mathbf{x}_k\in\mathrm{int}(D)$ 归纳：若 $\mathbf{x}_k$ 在内部且 $t_k<1$，由**线段原理（Ch5 Lemma 5.23）**$\mathbf{x}_{k+1}=(1-t_k)\mathbf{x}_k+t_k\mathbf{a}_{i_k}\in\mathrm{int}(D)$。(b) 代二次展开，用 $\lambda_k$ 定义 $\mathbf{d}_k^T(\mathbf{Q}\mathbf{x}_k+\mathbf{b})=-\lambda_k(\mathbf{d}_k^T\mathbf{Q}\mathbf{d}_k)$，得 $f_q(\mathbf{x}_{k+1})=f_q(\mathbf{x}_k)-\frac12(\mathbf{d}_k^T\mathbf{Q}\mathbf{d}_k)\lambda_k^2$。(c) 反证：若 $\sum\lambda_k<\infty$，由 Lemma 13.16 知 $\prod(1-\lambda_k)\to c>0$；又 $\mathbf{v}_{k+1}=(1-\lambda_k)\mathbf{v}_k+\lambda_k\mathbf{e}_{i_k}$ 推出 $\mathbf{v}_k\ge c\mathbf{v}_0$，极限点 $\mathbf{x}^*=\mathbf{A}\mathbf{v}^*$ 满足 $\mathbf{v}^*\ge c\mathbf{v}_0\in\mathbb{R}^l_{++}$，故 $\mathbf{x}^*\in\mathrm{int}(D)$——与 Assumption 13.17 矛盾。(d) 由 $\mathbf{Q}\succ 0$ 有 $\mathbf{d}_k^T\mathbf{Q}\mathbf{d}_k\ge \lambda_{\min}(\mathbf{Q})\|\mathbf{d}_k\|^2$；又 $\mathbf{x}^*\notin\{\mathbf{a}_i\}$，故对充分大 $k$ 有 $\|\mathbf{d}_k\|$ 离 0 有正下界（前有限步取最小值），于是 $(\mathbf{d}_k^T\mathbf{Q}\mathbf{d}_k)\ge\beta>0$。$\blacksquare$

> **Theorem 13.20** (Canon and Cullum's negative result). Under the same assumptions, for every $\varepsilon>0$,
> $$f_q(\mathbf{x}_k)-f_{\mathrm{opt}}\ge \frac{1}{k^{1+\varepsilon}}$$
> for infinitely many $k$'s.

**证明（自己走一遍）**。由 Lemma 13.19(b)，对任意 $K\ge k$：
$$f_q(\mathbf{x}_K)-f_{\mathrm{opt}}=f_q(\mathbf{x}_k)-f_{\mathrm{opt}}-\frac12\sum_{n=k}^{K-1}(\mathbf{d}_n^T\mathbf{Q}\mathbf{d}_n)\lambda_n^2.$$
令 $K\to\infty$，用 $f_q(\mathbf{x}_K)\to f_{\mathrm{opt}}$ 与 Lemma 13.19(d)：
$$f_q(\mathbf{x}_k)-f_{\mathrm{opt}}=\frac12\sum_{n=k}^\infty(\mathbf{d}_n^T\mathbf{Q}\mathbf{d}_n)\lambda_n^2\ge \frac{\beta}{2}\sum_{n=k}^\infty \lambda_n^2. \tag{13.37}$$
由 Lemma 13.19(c) $\sum\lambda_n=\infty$，套 Lemma 13.15 得对无穷多个 $k$ 有 $\sum_{n=k}^\infty\lambda_n^2\ge 1/k^{1+\varepsilon}$；代回 (13.37) 即证。$\blacksquare$

**作者注**：负结果很刺痛——即使目标是**强凸二次**的，朴素 Frank–Wolfe 也**不可能线性收敛**，对无穷多个 $k$ 间隙至少是 $1/k^{1+\varepsilon}$。根因：最优解在边界但不在极点，迭代点永远在内部"贴边界慢慢爬"，步长 $\lambda_k\to 0$。

> **Example 13.21.** $\min\{f_q(x_1,x_2)\equiv x_1^2+x_2^2:(x_1,x_2)\in\mathrm{conv}\{(-1,0),(1,0),(0,1)\}\}$. Assumption 13.17 满足：可行集有非空内部，最优解 $(0,0)$ 在边界但非极点。起点 $\mathbf{x}_0=(0,\tfrac12)$ 满足 Assumption 13.18，因为 $f_q(\mathbf{x}_0)=\tfrac14<1=\min\{f_q\text{ of vertices}\}$ 且 $\mathbf{x}_0=\frac14(-1,0)+\frac14(1,0)+\frac12(0,1)$。

**Figure 13.1.** First 100 iterations of the conditional gradient method on Example 13.21.
*See the original image for the zig-zag path hugging the triangle's boundary while crawling toward the origin.*

（图里可见经典"之字形"：迭代点沿三角形三边来回逼近原点却始终不落极点——负结果的几何写照。）

## 13.3.2 Linear Rate under Strong Convexity of the Feasible Set

要拿到线性收敛，得换假设——不是目标强凸，而是**可行集强凸**。

> **Definition 13.22** (strongly convex set). A nonempty set $C\subseteq\mathbb{E}$ is $\sigma$-strongly convex ($\sigma>0$) if for any $\mathbf{x},\mathbf{y}\in C$, $\lambda\in[0,1]$ the inclusion
> $$B\left[\lambda\mathbf{x}+(1-\lambda)\mathbf{y},\ \frac{\sigma}{2}\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2\right]\subseteq C$$
> holds. Strongly convex if $\sigma$-strongly convex for some $\sigma>0$.

**直觉**：普通凸只要求"两点连线在集内"；$\sigma$-强凸要求"连线中点附近还要塞进一个半径正比于 $\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2$ 的球"。欧氏球就是典型。

> **Theorem 13.23** (strong convexity of level sets). Suppose $g:\mathbb{E}\to\mathbb{R}_+$ is nonnegative, $L_g$-smooth, and $\sigma_g$-strongly convex. Let $\alpha>0$. Then
> $$C_\alpha=\{x\in\mathbb{E}:g(\mathbf{x})\le \alpha\}$$
> is $\dfrac{\sigma_g}{2\alpha L_g}$-strongly convex.

**证明（抓主链）**。取 $\mathbf{x},\mathbf{y}\in C_\alpha$,$\lambda$,记 $\mathbf{x}_\lambda=\lambda\mathbf{x}+(1-\lambda)\mathbf{y}$。要证对任意单位 $\mathbf{u}$、$r=\frac{\tilde\sigma}{2}\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2$（$\tilde\sigma=\sigma_g/(2\alpha L_g)$）有 $g(\mathbf{x}_\lambda+r\mathbf{u})\le\alpha$。由 descent lemma（Ch5 Lemma 5.7）与 $g\ge 0$：
$$g(\mathbf{x}_\lambda)\le \frac{1}{2L_g}\|\nabla g(\mathbf{x}_\lambda)\|^2. \tag{13.39}$$
由 $\sigma_g$-强凸且 $g(\mathbf{x}),g(\mathbf{y})\le 0$：
$$g(\mathbf{x}_\lambda)\le \frac{\sigma_g}{2}\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2\equiv \beta. \tag{13.40}$$
对 $g(\mathbf{x}_\lambda+r\mathbf{u})$ 用 descent lemma 加 Cauchy–Schwarz，再代入 (13.39)：
$$g(\mathbf{x}_\lambda+r\mathbf{u})\le \left(\sqrt{g(\mathbf{x}_\lambda)}+\sqrt{\frac{L_g}{2}}\,r\right)^2.$$
代入 (13.40) 与 $r$ 表达式、用平方根凹性放缩，最终推出 $\le\alpha$。$\blacksquare$

> **Example 13.24** (strong convexity of Euclidean balls). $C=B[\mathbf{c},r]$. Note $C=\mathrm{Lev}(g,r^2)$ where $g(\mathbf{x})=\|\mathbf{x}-\mathbf{c}\|^2$. Since $L_g=\sigma_g=2$, $\alpha=r^2$, the strong convexity parameter is $\frac{2}{2\cdot 2\cdot r^2}=\frac{1}{r}$.

**结论**：闭球 $B[\mathbf{c},r]$ 是 $(1/r)$-强凸集，半径越小越强凸。

> **Assumption 13.25.** (A) $C$ nonempty, compact, $\sigma$-strongly convex. (B) $f$ convex $L_f$-smooth over open convex $\mathrm{dom}(f)\supseteq C$. (C) $\exists M>0$: $\|\nabla f(\mathbf{x})\|\le M$ for $\mathbf{x}\in C$. (D) optimal set nonempty $X^*$, value $f_{\mathrm{opt}}$.

问题回到 $\min_{\mathbf{x}\in C}f(\mathbf{x})$（$g=\delta_C$）。记 $\mathbf{p}(\mathbf{x})=\arg\min_{\mathbf{p}\in C}\langle\nabla f(\mathbf{x}),\mathbf{p}\rangle$，$S(\mathbf{x})=\langle\nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}(\mathbf{x})\rangle$。

> **Lemma 13.26.** Suppose Assumption 13.25 holds. Then for any $\mathbf{x}\in C$,
> $$S(\mathbf{x})\ge \frac{\sigma M}{4}\|\mathbf{x}-\mathbf{p}(\mathbf{x})\|^2. \tag{13.43}$$

**证明（自己走一遍）**。定义
$$\mathbf{z}=\frac{\mathbf{x}+\mathbf{p}(\mathbf{x})}{2}-\frac{\sigma}{8\|\nabla f(\mathbf{x})\|}\nabla f(\mathbf{x})\,\|\mathbf{x}-\mathbf{p}(\mathbf{x})\|^2.$$
显然 $\mathbf{z}\in B[\frac{\mathbf{x}+\mathbf{p}(\mathbf{x})}{2},\frac{\sigma}{8}\|\mathbf{x}-\mathbf{p}(\mathbf{x})\|^2]$，由 $C$ 的 $\sigma$-强凸性知 $\mathbf{z}\in C$，于是
$$\langle \nabla f(\mathbf{x}),\mathbf{z}\rangle\le \langle \nabla f(\mathbf{x}),\mathbf{p}(\mathbf{x})\rangle. \tag{13.44}$$
拆 $S(\mathbf{x})=\langle\nabla f(\mathbf{x}),\mathbf{x}-\mathbf{p}(\mathbf{x})\rangle=2\langle\nabla f(\mathbf{x}),\frac{\mathbf{x}+\mathbf{p}}{2}-\mathbf{p}\rangle$：
$$\begin{aligned}
S(\mathbf{x})
&=2\langle \nabla f(\mathbf{x}),\mathbf{z}-\mathbf{p}\rangle+2\left\langle \nabla f(\mathbf{x}),\frac{\sigma}{8\|\nabla f\|}\nabla f\,\|\mathbf{x}-\mathbf{p}\|^2\right\rangle \\
&\ge 2\cdot\frac{\sigma}{8\|\nabla f\|}\|\nabla f\|^2\|\mathbf{x}-\mathbf{p}\|^2 &&\text{[用 (13.44)]} \\
&=\frac{\sigma}{4}\|\nabla f(\mathbf{x})\|\,\|\mathbf{x}-\mathbf{p}\|^2 \\
&\ge \frac{\sigma M}{4}\|\mathbf{x}-\mathbf{p}(\mathbf{x})\|^2 &&\text{[Assumption 13.25(C)]}.
\end{aligned}$$
$\blacksquare$

> **Theorem 13.27.** Suppose Assumption 13.25 holds, $\{\mathbf{x}_k\}$ uses adaptive or exact line search. Then for any $k\ge 0$,
> (a) $f(\mathbf{x}_{k+1})-f_{\mathrm{opt}}\le (1-\nu)(f(\mathbf{x}_k)-f_{\mathrm{opt}})$, where $\nu=\min\left\{\frac{\sigma M}{8L_f},\ \frac12\right\}$; (13.45)
> (b) $f(\mathbf{x}_k)-f_{\mathrm{opt}}\le (1-\nu)^k(f(\mathbf{x}_0)-f_{\mathrm{opt}})$.

**证明（自己走一遍）**。取自适应步长 $s_k=\min\{1,S/(L_f\|\mathbf{x}_k-\mathbf{p}_k\|^2)\}$。由 Lemma 13.7（$g=0$）：
$$f(\mathbf{x}_k)-f(\widetilde{\mathbf{x}}_k)\ge s_kS-\frac{s_k^2L_f}{2}\|\mathbf{x}_k-\mathbf{p}_k\|^2. \tag{13.46}$$
两情形：① $s_k=1$ 则 $S\le L_f\|\cdot\|^2$，(13.46) 给 $\ge \frac12 S$；② $s_k=S/(L_f\|\cdot\|^2)$ 则 $\ge S^2/(2L_f\|\cdot\|^2)$，套 Lemma 13.26 得 $\ge \frac{\sigma M}{8L_f}S$。合起来 $f(\mathbf{x}_k)-f(\widetilde{\mathbf{x}}_k)\ge \nu S(\mathbf{x}_k)$。adaptive 时 $\widetilde{\mathbf{x}}_k=\mathbf{x}_{k+1}$；exact line search 时 $f(\mathbf{x}_{k+1})\le f(\widetilde{\mathbf{x}}_k)$，故两种步长都有 (13.49)。又由 Lemma 13.12（$g=0$）有 $f(\mathbf{x}_k)-f_{\mathrm{opt}}\le S(\mathbf{x}_k)$，即 $\nu(f(\mathbf{x}_k)-f_{\mathrm{opt}})\le (f(\mathbf{x}_k)-f_{\mathrm{opt}})-(f(\mathbf{x}_{k+1})-f_{\mathrm{opt}})$，整理得 (a)；连乘得 (b)。$\blacksquare$

**结论**：在"可行集强凸 + 梯度有界"下 Frank–Wolfe 拿到**线性收敛 $(1-\nu)^k$**！负结果与正结果合起来说明：线性收敛靠的是**可行域的几何**，不是目标的光滑/强凸。

# 13.4 The Randomized Generalized Block Conditional Gradient Method

最后把广义 CGM 推广到**分块**情形，对应 **Ch11 §11.2 分块近端梯度法**。

模型：
$$\min_{x_1\in E_1,\dots,x_p\in E_p}\left\{F(\mathbf{x})=f(x_1,\dots,x_p)+\sum_{j=1}^p g_j(x_j)\right\}, \tag{13.51}$$
$E_1,\dots,E_p$ 欧氏，乘积空间 $E=E_1\times\cdots\times E_p$ 带范数 $\|(u_1,\dots,u_p)\|=\sqrt{\sum_{i=1}^p\|u_i\|_{E_i}^2}$（Ch1 §1.9）。令 $g(\mathbf{x})=\sum_i g_i(x_i)$，$\mathrm{dom}(g)=\prod_i\mathrm{dom}(g_i)$。第 $i$ 块梯度 $\nabla_i f$（映到 $E_i$），$\nabla f=(\nabla_1 f,\dots,\nabla_p f)$。$U_i(\mathbf{d})=(0,\dots,\mathbf{d},\dots,0)$。

> **Assumption 13.28.** (A) $g_i$ proper closed convex, compact $\mathrm{dom}(g_i)$. (B) $f$ convex differentiable over open convex $\mathrm{dom}(f)\supseteq\mathrm{dom}(g)$. (C) $\exists L_1,\dots,L_p>0$: $\|\nabla_i f(\mathbf{x})-\nabla_i f(\mathbf{x}+U_i(\mathbf{d}))\|\le L_i\|\mathbf{d}\|$. (D) optimal set nonempty $X^*$, value $F_{\mathrm{opt}}$.

对每块：
$$\mathbf{p}_i(\mathbf{x})\in \arg\min_{\mathbf{v}\in E_i}\bigl\{\langle \mathbf{v},\nabla_i f(\mathbf{x})\rangle+g_i(\mathbf{v})\bigr\}, \tag{13.52}$$
$$S_i(\mathbf{x})=\max_{\mathbf{v}\in E_i}\bigl\{\langle \nabla_i f(\mathbf{x}),x_i-\mathbf{v}\rangle+g_i(x_i)-g_i(\mathbf{v})\bigr\}=\langle \nabla_i f(\mathbf{x}),x_i-\mathbf{p}_i(\mathbf{x})\rangle+g_i(x_i)-g_i(\mathbf{p}_i(\mathbf{x})).$$
显然 $S(\mathbf{x})=\sum_{i=1}^p S_i(\mathbf{x})$；取 $\mathbf{p}(\mathbf{x})=(\mathbf{p}_1(\mathbf{x}),\dots,\mathbf{p}_p(\mathbf{x}))$（确是 (13.3) 的极小点）。

**The Randomized Generalized Block Conditional Gradient (RGBCG) Method**
- **Initialization**: pick $\mathbf{x}_0=(x_0^1,\dots,x_0^p)\in\mathrm{dom}(g)$.
- **General step**: pick $i_k\in\{1,\dots,p\}$ uniformly at random and $t_k\in[0,1]$; set $\mathbf{x}_{k+1}=\mathbf{x}_k+t_k U_{i_k}\bigl(\mathbf{p}_{i_k}(\mathbf{x}_k)-x_k^{i_k}\bigr)$.

额外记号：加权范数 $\|\mathbf{u}\|_L=\sqrt{\sum_i L_i\|u_i\|^2}$；$\mathcal{F}_{k-1}=\{i_0,\dots,i_{k-1}\}$ 为随机历史。

> **Theorem 13.29.** Suppose Assumption 13.28 holds, $\{\mathbf{x}_k\}$ uses $t_k=\dfrac{2p}{k+2p}$. Let $D\ge \max_{\mathbf{x},\mathbf{y}\in\mathrm{dom}(g)}\|\mathbf{x}-\mathbf{y}\|_L$ (13.54). Then
> (a) for $k\ge 1$, $\displaystyle\mathbb{E}_{\mathcal{F}_{k-1}}(F(\mathbf{x}_k))-F_{\mathrm{opt}}\le \frac{2\max\{(p-1)(F(\mathbf{x}_0)-F_{\mathrm{opt}}),\,pD^2\}}{k+2p-2}$; (13.55)
> (b) for $k\ge 3$, $\displaystyle\min_{n=\lceil k/2\rceil+2,\dots,k}\mathbb{E}_{\mathcal{F}_{n-1}}(S(\mathbf{x}_n))\le \frac{8\max\{(p-1)(F(\mathbf{x}_0)-F_{\mathrm{opt}}),\,pD^2\}}{k-2}$. (13.56)

**证明（自己走一遍）**。用分块 descent lemma（**Ch11 Lemma 11.8**）与 $g_{i_k}$ 凸性：
$$\begin{aligned}
F(\mathbf{x}_{k+1})
&\le f(\mathbf{x}_k)-t_k\langle \nabla_{i_k}f(\mathbf{x}_k),x_k^{i_k}-\mathbf{p}_k^{i_k}\rangle+\frac{t_k^2L_{i_k}}{2}\|\mathbf{x}_k^{i_k}-\mathbf{p}_k^{i_k}\|^2+g(\mathbf{x}_k)-g_{i_k}(x_k^{i_k})+g_{i_k}((1-t_k)x_k^{i_k}+t_k\mathbf{p}_k^{i_k}) \\
&\le F(\mathbf{x}_k)-t_kS_{i_k}(\mathbf{x}_k)+\frac{t_k^2L_{i_k}}{2}\|\mathbf{x}_k^{i_k}-\mathbf{p}_k^{i_k}\|^2.
\end{aligned}$$
对随机指标 $i_k$ 取期望（均匀）：
$$\mathbb{E}_{i_k}(F(\mathbf{x}_{k+1}))\le F(\mathbf{x}_k)-\frac{t_k}{p}S(\mathbf{x}_k)+\frac{t_k^2}{2p}\sum_{i=1}^p L_i\|x_k^i-\mathbf{p}_k^i\|^2=F(\mathbf{x}_k)-\frac{t_k}{p}S(\mathbf{x}_k)+\frac{t_k^2}{2p}\|\mathbf{x}_k-\mathbf{p}_k\|_L^2.$$
再对 $\mathcal{F}_{k-1}$ 取期望、用 $\|\cdot\|_L\le D$，得
$$\mathbb{E}_{\mathcal{F}_k}(F(\mathbf{x}_{k+1}))-F_{\mathrm{opt}}\le \mathbb{E}_{\mathcal{F}_{k-1}}(F(\mathbf{x}_k))-F_{\mathrm{opt}}-\frac{t_k}{p}\mathbb{E}_{\mathcal{F}_{k-1}}(S(\mathbf{x}_k))+\frac{p\tilde\gamma_k^2}{2}D^2,$$
其中 $\tilde\gamma_k=t_k/p=2/(k+2p)$。这正是 Lemma 13.13 的递推，取 $a_k=\mathbb{E}_{\mathcal{F}_{k-1}}(F(\mathbf{x}_k))-F_{\mathrm{opt}}$、$b_k=\mathbb{E}_{\mathcal{F}_{k-1}}(S(\mathbf{x}_k))$、$A=pD^2$、$p$（块数）；由 Lemma 13.12 知 $a_k\le b_k$，套 Lemma 13.13 得 (13.55)(13.56)。$\blacksquare$

**结论**：分块随机版保留确定性 $O(1/k)$（期望意义），步长 $2p/(k+2p)$ 比确定性版 $2/(k+2)$ 多因子 $p$——"每步只更新一个随机块"的代价。它与 Ch11 分块近端梯度法对照：都用块光滑常数 $L_i$，这里用加权范数 $\|\cdot\|_L$ 打包进 $A=pD^2$。

---

## 全章小结（一张表收尾）

| 情形 | 关键假设 | 收敛性结论 | 核心工具 |
|---|---|---|---|
| 非凸 (§13.2.3) | $f$ 仅 $L_f$-光滑 | $S(\mathbf{x}_k)\to 0$，极限点驻点；$O(1/\sqrt{k})$ | Lemma 13.7 + 13.8 充分下降 |
| 凸 (§13.2.4) | $f$ 凸 | $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le 2L_fD^2/k$ | Lemma 13.12 + 13.13 |
| 强凸目标 (§13.3.1) | $f$ 强凸二次 | **负结果**：不可能线性收敛 | Canon–Cullum (Thm 13.20) |
| 强凸可行集 (§13.3.2) | $C$ $\sigma$-强凸，$\|\nabla f\|\le M$ | 线性率 $(1-\nu)^k$ | Lemma 13.26 + 13.27 |
| 分块随机 (§13.4) | 块光滑 $L_i$，凸 | 期望 $O(1/k)$ | Lemma 11.8 + 13.13 |

**作者注（收尾）**：本章把 Ch10 的"投影 vs. 线性预言"权衡讲透。Frank–Wolfe 用**线性预言**换掉**投影**，代价是收敛一般更慢（凸情形 $O(1/k)$ 而非近端梯度的 $O(1/k^2)$），但当投影极贵、线性预言极便宜时它反而是唯一现实选择；它能不能加速到线性收敛，取决于**可行集的曲率**而非目标光滑度——这是 Canon–Cullum 负结果与 §13.3.2 正结果共同给出的反直觉结论。
