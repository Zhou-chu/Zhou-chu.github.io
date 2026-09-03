---
blog: true
title: "Chapter 14-Alternating Minimization"
slug: "chapter-14-alternating-minimization-1srrl6p"
summary: "交替最小化：把高维目标按块循环优化的朴素方法，从坐标极小点、复合模型的可行化，到凸情形下的收敛性与 O(1/k) 速率估计。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

在本书中，我们的 underlying spaces 都是**有限维**的、存在内积和范数的空间。本章进入一个朴素又常用的套路：**交替最小化（alternating minimization, AM）**——把变量切成若干块，每轮按固定顺序只优化其中一块、其余固定。它甚至不要求目标可微，但"坑"也多：会卡在坐标极小点（coordinate-wise minimum）而非驻点，且坐标极小点在凸情形下也可能不是驻点。本章先用两个反例挖坑，再在"复合模型" $f+g$（Ch11 块 prox 梯度、Ch13 块条件梯度）上加结构把 AM 救回，最后给凸情形下的收敛性与 $O(1/k)$ 速率。

# 14.1 The Method

AM 要解决的问题是把一个定义在乘积欧氏空间上的扩展实值函数最小化：

> **问题 (14.1).** 考虑问题
> $$\min_{x_1\in\mathbb{E}_1,\;x_2\in\mathbb{E}_2,\;\ldots,\;x_p\in\mathbb{E}_p} F(x_1, x_2, \ldots, x_p),$$
> 其中 $\mathbb{E}_1,\mathbb{E}_2,\ldots,\mathbb{E}_p$ 是欧氏空间，其乘积空间记为 $\mathbb{E}=\mathbb{E}_1\times\mathbb{E}_2\times\cdots\times\mathbb{E}_p$。

按 §1.9 的约定，乘积空间也是欧氏空间，配套范数取各块的 $\ell_2$ 平方和开方：

$$\left\|(u_1, u_2, \ldots, u_p)\right\|_{\mathbb{E}} = \sqrt{\sum_{i=1}^{p} \|u_i\|_{\mathbb{E}_i}^2}.$$

**作者注（一个约定细节）**：本书后文会省略范数下标——到底是哪个底层空间的范数，由上下文决定。这一条在块坐标方法里反复出现，值得一开始就记住，否则看到 $\|\cdot\|$ 混用会发懵。

眼下我们只假设 $F:\mathbb{E}\to(-\infty,\infty]$ 是 proper 的；但显然，要保证某种收敛性，还得追加额外假设。

#### 第 $i$ 块"嵌入"映射 $U_i$

为了把"只动第 $i$ 块"这件事写成线性代数，引入线性变换 $U_i:\mathbb{E}_i\to\mathbb{E}$：

$$U_i(\mathbf{d}) = (0,\ldots,0,\;\mathbf{d}\;(\text{第 }i\text{ 块}),\;0,\ldots,0),\qquad \mathbf{d}\in\mathbb{E}_i.$$

它的作用就是：在固定其它块不变的前提下，把第 $i$ 块替换成 $\mathbf{d}$。于是任意 $\mathbf{x}\in\mathbb{E}$ 都可以写成 $\mathbf{x}=(x_1,x_2,\ldots,x_p)$，也记作 $\mathbf{x}=(x_i)_{i=1}^p$。

**为什么需要 $U_i$**：AM 每一步本质是"沿着第 $i$ 个坐标方向做一次精确线/块搜索"。$U_i$ 把这条搜索路径参数化成仿射形式 $\bar{\mathbf{x}}+U_i(\mathbf{y}-\bar{x}_i)$，后面 Lemma 14.1、Thm 14.3 的子问题、以及 14.2 的坐标极小点定义，全靠它来统一写法。

#### 交替最小化方法（两种等价描述）

最原始的描述是"循环地、逐块地取精确最小点"：

> **The Alternating Minimization Method.**
> **Initialization:** 取 $\mathbf{x}^0=(x_1^0,x_2^0,\ldots,x_p^0)\in\mathrm{dom}(F)$。
> **General step:** 对 $k=0,1,2,\ldots$ 执行：
> - 对 $i=1,2,\ldots,p$，计算
> $$x_i^{k+1}\in\arg\min_{x_i\in\mathbb{E}_i} F(x_1^{k+1},\ldots,x_{i-1}^{k+1}, x_i, x_{i+1}^{k},\ldots,x_p^{k}).\tag{14.3}$$

为了分析方便，引入**辅助子序列**（每次只更新到第 $i$ 块为止的状态）：

> $$\begin{aligned}
> \mathbf{x}^{k,0}&=\mathbf{x}^k=(x_1^k, x_2^k, \ldots, x_p^k),\\
> \mathbf{x}^{k,1}&=(x_1^{k+1}, x_2^k, \ldots, x_p^k),\\
> \mathbf{x}^{k,2}&=(x_1^{k+1}, x_2^{k+1}, x_3^k, \ldots, x_p^k),\\
> &\;\vdots\\
> \mathbf{x}^{k,p}&=\mathbf{x}^{k+1}=(x_1^{k+1}, x_2^{k+1}, \ldots, x_p^{k+1}).
> \end{aligned}\tag{14.2}$$

也就是说，一次完整迭代 $k\to k+1$ 被拆成 $p$ 个"子迭代"，(14.2) 给每一次子迭代都起了名字。**这套记号是后面所有收敛证明的骨架**——凡是看到 $\mathbf{x}^{k,j}$，就是在说"第 $k$ 轮、更新完前 $j$ 块后的中间点"。

等价地，用 $U_i$ 可以把通用步重写（这也是 (14.4)）：

> - 设 $\mathbf{x}^{k,0}=\mathbf{x}^k$；
> - 对 $i=1,2,\ldots,p$，取 $\tilde{\mathbf{y}}\in\arg\min_{\mathbf{y}\in\mathbb{E}_i} F\big(\mathbf{x}^{k,i-1}+U_i(\mathbf{y}-x_i^k)\big)$，并令 $\mathbf{x}^{k,i}=\mathbf{x}^{k,i-1}+U_i(\tilde{\mathbf{y}}-x_i^k)$；
> - 令 $\mathbf{x}^{k+1}=\mathbf{x}^{k,p}$.

**两种描述的关系**：第二种只是把"替换第 $i$ 块"显式写成"沿 $U_i$ 方向走到使目标最小的那个 $\mathbf{y}$"。第一种是给读者直观，第二种是给证明用的——证明里要经常说"$\mathbf{x}^{k,i-1}+U_i(\mathbf{y}-x_i^k)$ 形式的点"，第二种正好是它的预备式。

#### Lemma 14.1（AM 是良定义的）

在谈收敛之前，先得保证每一步的子问题**真的有解**。这一条就是干这个的。

> **Lemma 14.1** (alternating minimization is well defined). 设 $F:\mathbb{E}\to(-\infty,\infty]$（$\mathbb{E}=\mathbb{E}_1\times\cdots\times\mathbb{E}_p$）是 proper 且 closed 的函数。进一步假设 $F$ 具有**有界水平集**，即对任意 $\alpha\in\mathbb{R}$，$\mathrm{Lev}(F,\alpha)=\{\mathbf{x}\in\mathbb{E}:F(\mathbf{x})\le\alpha\}$ 有界。则 $F$ 至少有一个极小点；且对任意 $\bar{\mathbf{x}}\in\mathrm{dom}(F)$ 与 $i\in\{1,\ldots,p\}$，问题
> $$\min_{\mathbf{y}\in\mathbb{E}_i} F\big(\bar{\mathbf{x}}+U_i(\mathbf{y}-\bar{x}_i)\big)\tag{14.5}$$
> 都存在一个极小点。

**证明（自己走一遍）**。取任意一个 $\tilde{\mathbf{x}}\in\mathrm{dom}(F)$。全局极小问题与"在切片 $\mathrm{Lev}(F,F(\tilde{\mathbf{x}}))$ 上的极小问题"是同一件事：
$$\arg\min_{\mathbf{x}\in\mathbb{E}}F(\mathbf{x}) = \arg\min_{\mathbf{x}\in\mathbb{E}}\{F(\mathbf{x}):\mathbf{x}\in\mathrm{Lev}(F,F(\tilde{\mathbf{x}}))\}.$$
因为 $F$ 是 closed 且有有界水平集，所以 $\mathrm{Lev}(F,F(\tilde{\mathbf{x}}))$ 是**紧集**（有界 + 闭）。由**闭函数的 Weierstrass 定理（Thm 2.12）**，在紧集上极小 proper & closed 函数必有解，于是全局极小问题有解。

对子问题 (14.5)，把 $\mathbf{y}$ 映成 $\bar{\mathbf{x}}+U_i(\mathbf{y}-\bar{x}_i)$ 是一个仿射变换，而仿射复合保持闭性（Thm 2.7(a)），所以 $\mathbf{y}\mapsto F(\bar{\mathbf{x}}+U_i(\mathbf{y}-\bar{x}_i))$ 仍是 proper & closed；它的水平集有界（由 $F$ 的水平集有界直接推出）。同一套 Weierstrass 论证，子问题也就有解。$\blacksquare$

**结论**：proper + closed + 有界水平集，是 AM 能跑起来的最低门槛。注意这里**完全没要求凸性、可微性**——这就是 AM 朴素而通用的根源。后面所有收敛结果，都是在这个门槛之上再加料。

---

# 14.2 Coordinate-wise Minima

由方法的定义可知，AM 能证收敛（如果可能的话）大概率只能收敛到**坐标极小点**——因为每一步只是在各块上分别取最小。先把这个对象正式定义出来。

> **Definition 14.2.** 向量 $\mathbf{x}^*\in\mathbb{E}$ 称为函数 $F:\mathbb{E}_1\times\cdots\times\mathbb{E}_p\to(-\infty,\infty]$ 的**坐标极小点（coordinate-wise minimum）**，如果 $\mathbf{x}^*\in\mathrm{dom}(F)$ 且
> $$F(\mathbf{x}^*)\le F\big(\mathbf{x}^*+U_i(\mathbf{y})\big),\qquad \forall\,i=1,\ldots,p,\ \forall\,\mathbf{y}\in\mathbb{E}_i.$$

**为什么这一行最关键**：坐标极小点只要求"**固定其它块时，动第 $i$ 块不会让函数值下降**"——它是对每一块分别成立的"一维最优"，但绝不要求"同时动所有块"的最优。换句话说，它比驻点（更比全局极小点）弱得多。后面两个反例就是要告诉我们：AM 收敛到的常常**只是这个弱得多的东西**。

#### Theorem 14.3（AM 收敛到坐标极小点）

> **Theorem 14.3** (convergence of alternating minimization to coordinate-wise minima). 设 $F:\mathbb{E}\to(-\infty,\infty]$（$\mathbb{E}=\mathbb{E}_1\times\cdots\times\mathbb{E}_p$）是一个 proper、closed、且在其定义域上连续的函数。假设
> **(A)** 对每个 $\bar{\mathbf{x}}\in\mathrm{dom}(F)$ 与 $i\in\{1,\ldots,p\}$，子问题 $\min_{\mathbf{y}\in\mathbb{E}_i}F(\bar{\mathbf{x}}+U_i(\mathbf{y}-\bar{x}_i))$ 有**唯一**极小点；
> **(B)** $F$ 的水平集有界，即对任意 $\alpha\in\mathbb{R}$，$\mathrm{Lev}(F,\alpha)$ 有界。
> 设 $\{\mathbf{x}^k\}_{k\ge0}$ 为 AM 生成的序列。则 $\{\mathbf{x}^k\}_{k\ge0}$ 有界，且该序列的任一极限点都是坐标极小点。

**证明（自己走一遍，三步走）**。

**第一步，证序列有界。** 由方法定义，函数值序列 $\{F(\mathbf{x}^k)\}$ 单调不增，所以
$$\{\mathbf{x}^k\}_{k\ge0}\subseteq\mathrm{Lev}(F,F(\mathbf{x}^0)).$$
由 (B) 水平集有界，得 $\{\mathbf{x}^k\}$ 有界。结合 $F$ 的闭性（下半连续），$F(\mathbf{x}^k)$ 下方有界，于是 $\{F(\mathbf{x}^k)\}$ 收敛到某个实数 $\bar{F}$。并且由于
$$F(\mathbf{x}^k)\ge F(\mathbf{x}^{k,1})\ge F(\mathbf{x}^{k+1}),$$
夹逼给出 $\{F(\mathbf{x}^{k,1})\}$ 也收敛到 $\bar{F}$——即 $\{F(\mathbf{x}^k)\}$ 与 $\{F(\mathbf{x}^{k,1})\}$ 收敛到同一值。

**第二步，对第一个块证坐标极小性。** 设 $\bar{\mathbf{x}}$ 是 $\{\mathbf{x}^k\}$ 的极限点，则有子列 $\mathbf{x}^{k_j}\to\bar{\mathbf{x}}$。$\{\mathbf{x}^{k_j,1}\}$ 也有界，再取子列可设 $\mathbf{x}^{k_j,1}\to(v,\bar{x}_2,\ldots,\bar{x}_p)$（$v\in\mathbb{E}_1$）。由方法定义，
$$F(x_1^{k_j+1}, x_2^{k_j},\ldots,x_p^{k_j})\le F(x_1, x_2^{k_j},\ldots,x_p^{k_j}),\qquad \forall\,x_1\in\mathbb{E}_1.$$
取极限 $j\to\infty$，利用 $F$ 的闭性 + 定义域上连续，得
$$F(v,\bar{x}_2,\ldots,\bar{x}_p)\le F(x_1,\bar{x}_2,\ldots,\bar{x}_p),\qquad \forall\,x_1\in\mathbb{E}_1.$$
又因为两个函数值序列收敛到同一值，有 $F(v,\bar{x}_2,\ldots,\bar{x}_p)=F(\bar{x}_1,\bar{x}_2,\ldots,\bar{x}_p)$。由假设 (A) 子问题对第一块**唯一**极小，故 $v=\bar{x}_1$。于是
$$F(\bar{x}_1,\bar{x}_2,\ldots,\bar{x}_p)\le F(x_1,\bar{x}_2,\ldots,\bar{x}_p),\qquad \forall\,x_1\in\mathbb{E}_1,$$
这正是坐标极小性的第 $i=1$ 条。

**第三步，逐块递推。** 既然已证 $\mathbf{x}^{k_j,1}\to\bar{\mathbf{x}}$，把 $\mathbf{x}^{k_j,1}$ 当作新的"第零步"，对第二块重复同样论证，得到第 $i=2$ 条；一直重复到所有 $p$ 块，即得 $\bar{\mathbf{x}}$ 满足全部坐标极小条件。$\blacksquare$

**逐字点评（两个假设的分工）**：
- **(B) 有界水平集**只用来保证序列有界——书后 Example 14.4 会点明这一点；
- **(A) 子问题唯一极小**才是"极限点的各块值被钉死"的关键：没有唯一性，$v$ 不一定等于 $\bar{x}_1$，坐标极小性就推不出来。

**一个值得记住的细节**：Thm 14.3 证明的"换块递推"套路，和 Ch2 Thm 2.6 三向循环里"找一个具体靶点"一样，是个会反复出现的模式。

#### Example 14.4（Powell 反例——AM 失效 I）

定理的假设 (A)(B) 一旦不满足，AM 可能连坐标极小点都收敛不到。Powell 的经典例子就是连 (A)(B) 都破的例子。

> **Example 14.4** (Powell's example—failure of alternating minimization I). 令
> $$\phi(x,y,z) = -xy - yz - zx + [x-1]_+^2 + [-x-1]_+^2 + [y-1]_+^2 + [-y-1]_+^2 + [z-1]_+^2 + [-z-1]_+^2,$$
> 其中 $[t]_+^2\equiv(\max\{t,0\})^2$ 为"正部的平方"（即平方铰链罚，把变量压回 $[-1,1]$）。注意 $\phi$ 可微。固定 $y,z$ 时易得
> $$\arg\min_x \phi(x,y,z) = \begin{cases} \mathrm{sgn}(y+z)\Big(1+\tfrac{1}{2}|y+z|\Big), & y+z\ne 0,\\[4pt] [-1,1], & y+z=0, \end{cases}\tag{14.6}$$
> 由对称性，(14.7)、(14.8) 给出关于 $y,z$ 的相应公式。

**这个例子在说什么**：从点 $(-1-\varepsilon,\ 1+\tfrac{1}{2}\varepsilon,\ -1-\tfrac{1}{4}\varepsilon)$ 出发，前六次迭代会"绕着"六个点循环：
$$(1,1,-1),\ (1,-1,-1),\ (1,-1,1),\ (-1,-1,1),\ (-1,1,1),\ (-1,1,-1).$$
而这六个点**全都不是 $\phi$ 的驻点**——例如
$$\nabla\phi(1,1,-1)=(0,0,-2),\quad \nabla\phi(-1,1,1)=(-2,0,0),\quad \nabla\phi(1,-1,1)=(0,-2,0),$$
等等。既然极限点不是驻点，自然也不是坐标极小点。

**为什么这不矛盾于 Thm 14.3**：两个假设都没满足——子问题 (14.6)–(14.8) 在 $y+z=0$ 时极小点是一整段 $[-1,1]$（**不唯一**，破 (A)）；而且 $\phi$ 的水平集无界，因为对 $x>1$，
$$\phi(x,x,x)=-3x^2+3(x-1)^2=-6x+3\to -\infty\quad(x\to\infty)$$
（**水平集无界**，破 (B)）。书后还补了一句：本例序列本身有界，所以失效的真正元凶是子问题的**非唯一解**——这让"极限点的块值被钉死"那一步彻底垮掉。

**结论一**：AM 连"收敛到坐标极小点"都不保证，除非 (A) 唯一性 + (B) 有界水平集齐备。**结论二**：坐标极小点 $\neq$ 驻点，这是个会要命的认知。

#### Example 14.5（AM 失效 II——连凸都不救）

更扎心的是：即便目标函数是凸的、所有假设都满足，极限点只是坐标极小点，而坐标极小点仍可能不是驻点。

> **Example 14.5** (failure of alternating minimization II). 考虑凸函数
> $$F(x_1,x_2)=|3x_1+4x_2|+|x_1-2x_2|.$$
> 它满足 Thm 14.3 的全部假设（proper、closed、连续、水平集有界、对每个变量有唯一极小点），故定理保证 AM 的极限点是坐标极小点。但函数的**唯一全局极小点是 $(0,0)$**；而**对任意 $\alpha\in\mathbb{R}$，点 $(-4\alpha,3\alpha)$ 都是坐标极小点**。

**自己验证一下 $(-4\alpha,3\alpha)$ 的坐标极小性**（以 $\alpha>0$ 为例）。固定 $x_1=-4\alpha$，关于 $x_2=t$ 的函数：
$$F(-4\alpha,t)=|4t-12\alpha|+|2t+4\alpha|=
\begin{cases}
-6t+8\alpha, & t<-2\alpha,\\
-2t+16\alpha, & -2\alpha\le t\le 3\alpha,\\
6t-8\alpha, & t>3\alpha,
\end{cases}$$
显然 $t=3\alpha$ 是极小点。固定 $x_2=3\alpha$ 同理：
$$F(t,3\alpha)=|3t+12\alpha|+|t-6\alpha|=
\begin{cases}
-4t-6\alpha, & t<-4\alpha,\\
2t+18\alpha, & -4\alpha\le t\le 6\alpha,\\
4t+6\alpha, & t>6\alpha,
\end{cases}$$
极小点是 $t=-4\alpha$。$\alpha<0$ 同理。于是 $(-4\alpha,3\alpha)$ 对任意 $\alpha$ 都是坐标极小点，而只有 $\alpha=0$ 落到了真实极小点。

**Figure 14.1.** 函数 $F(x_1,x_2)=|3x_1+4x_2|+|x_1-2x_2|$ 的等高线；加粗直线 $\{(-4\alpha,3\alpha):\alpha\in\mathbb{R}\}$ 上的每一点都是坐标极小点，只有原点 $(0,0)$ 是全局极小点。（见原书配图。）

**更狠的事实**：只要初值不含零分量，AM **一步**就卡进非最优的坐标极小点。本质原因——**驻点条件 $0\in\partial F(\mathbf{x})$ 不能按块拆开**，所以"每块分别最优"推不出"整体驻点"。

**前向指针**：坐标极小点 $\not\Rightarrow$ 驻点，是 AM 最尴尬处。下一节复合模型 $F=f+g$ 里，$g$ 的可分性让驻点条件"按块对齐"，从而把坐标极小点救成驻点——这恰是 Ch11 块 prox 梯度、Ch13 块条件梯度成功的同一套结构。

---

# 14.3 The Composite Model

从本节起，分析的主模型是**复合模型（composite model）**——它在 Ch11.2（块 prox 梯度）与 Ch13.4（块条件梯度）里都出现过：

> **模型 (14.9).**
> $$\min_{x_1\in\mathbb{E}_1,\ldots,x_p\in\mathbb{E}_p}\left\{F(x_1,\ldots,x_p)=f(x_1,\ldots,x_p)+\sum_{j=1}^{p}g_j(x_j)\right\}.$$
> 其中 $g:\mathbb{E}\to(-\infty,\infty]$ 定义为
> $$g(x_1,\ldots,x_p)\equiv\sum_{i=1}^{p}g_i(x_i).$$

即光滑（或可微）部分 $f$ 耦合所有块，而正则/约束部分 $g$ 是**各块可分**的。按 §1.9 的记号，主模型干脆写成 $\min_{\mathbf{x}\in\mathbb{E}}\{F(\mathbf{x})=f(\mathbf{x})+g(\mathbf{x})\}$，第 $i$ 块的梯度记为 $\nabla_i f$。

> **Assumption 14.6.**
> **(A)** 对每个 $i$，$g_i:\mathbb{E}_i\to(-\infty,\infty]$ 是 proper、closed、凸的，且在定义域上连续。
> **(B)** $f:\mathbb{E}\to(-\infty,\infty]$ 是 closed 函数；$\mathrm{dom}(f)$ 凸；$f$ 在 $\mathrm{int}(\mathrm{dom}(f))$ 上可微，且 $\mathrm{dom}(g)\subseteq\mathrm{int}(\mathrm{dom}(f))$。

在 (14.9) 结构下，AM 的通用步 (14.3) 可紧凑写成
$$x_i^{k+1}\in\arg\min_{x_i\in\mathbb{E}_i}\Big\{f(x_1^{k+1},\ldots,x_{i-1}^{k+1},x_i,x_{i+1}^{k},\ldots,x_p^{k})+g_i(x_i)\Big\}$$
（与第 $i$ 块无关的项 $g_j(j\ne i)$ 被略去）。

**关键钩子（为什么复合模型能救场）**：问题 (14.9) 的驻点条件是 $-\nabla f(\mathbf{x}^*)\in\partial g(\mathbf{x}^*)$（Def 3.73）；而按 Thm 11.6(a)，它等价于**逐块**条件 $-\nabla_i f(\mathbf{x}^*)\in\partial g_i(x_i^*)$，$i=1,\ldots,p$。这正好和"坐标极小点"的块结构对齐——于是理论上可能出现"坐标极小 $\Rightarrow$ 驻点"。下面 Lemma 14.7 就干成这件事。

#### Lemma 14.7（坐标极小点 $\Rightarrow$ 驻点）

> **Lemma 14.7** (coordinate-wise minimality $\Rightarrow$ stationarity). 设 Assumption 14.6 成立，且 $\mathbf{x}^*\in\mathrm{dom}(g)$ 是 $F=f+g$ 的坐标极小点。则 $\mathbf{x}^*$ 是问题 (14.9) 的驻点。

**证明（自己走一遍）**。因为 $\mathbf{x}^*$ 是坐标极小点，对每个 $i$ 有
$$x_i^*\in\arg\min_{y\in\mathbb{E}_i}\{\tilde{f}_i(y)+g_i(y)\},$$
其中 $\tilde{f}_i(y)\equiv f(\mathbf{x}^*+U_i(y-x_i^*))=f(x_1^*,\ldots,x_{i-1}^*,y,x_{i+1}^*,\ldots,x_p^*)$。也就是说，"只动第 $i$ 块"的子问题在 $y=x_i^*$ 处取最小。

由 **Thm 3.72(a)**（可微函数 + 凸函数的复合极小点的驻点条件），这给出
$$-\nabla\tilde{f}_i(x_i^*)\in\partial g_i(x_i^*).$$
而 $\tilde{f}_i$ 只是把 $f$ 的除第 $i$ 块外固定，故 $\nabla\tilde{f}_i(x_i^*)=\nabla_i f(\mathbf{x}^*)$。于是
$$-\nabla_i f(\mathbf{x}^*)\in\partial g_i(x_i^*),\qquad \forall\,i.$$
再援引 **Thm 11.6(a)**（驻点条件的块分解），得到 $-\nabla f(\mathbf{x}^*)\in\partial g(\mathbf{x}^*)$——即 $\mathbf{x}^*$ 是问题 (14.9) 的驻点。$\blacksquare$

**为什么这一行最关键**：Lemma 14.7 把 Example 14.5 的悲剧"翻转"了——只要 $g$ 可分、且 $f$ 足够光滑（满足 Assumption 14.6），"每块分别最优"就**蕴含**"整体驻点"。代价是：我们得先有坐标极小点，再谈它是驻点。

#### Corollary 14.8

把 Thm 14.3（收敛到坐标极小点）与 Lemma 14.7（坐标极小点 $\Rightarrow$ 驻点）拼起来，直接得到：

> **Corollary 14.8.** 设 Assumption 14.6 成立，且进一步假设：对每 $\bar{\mathbf{x}}\in\mathrm{dom}(F)$ 与 $i$，子问题 $\min_{\mathbf{y}\in\mathbb{E}_i}F(\bar{\mathbf{x}}+U_i(\mathbf{y}-\bar{x}_i))$ 有唯一极小点；$F$ 的水平集有界。设 $\{\mathbf{x}^k\}$ 为 AM 解 (14.9) 的序列。则 $\{\mathbf{x}^k\}$ 有界，且其任一极限点都是问题 (14.9) 的驻点。

**结论**：在复合模型下，AM 的极限点至少是驻点了——比 Thm 14.3 强一档。但停点在驻点，离"全局最优"还差一个凸性。下一节补上凸性，把驻点升级成最优解。

---

# 14.4 Convergence in the Convex Case

上一节的收敛结果卡在"子问题唯一极小"这个较强假设上。本节展示：若目标函数是凸的，这个假设可以**去掉**。

> **Theorem 14.9.** 设 Assumption 14.6 成立，且额外满足：
> - $f$ 是凸的；
> - $f$ 在 $\mathrm{int}(\mathrm{dom}(f))$ 上**连续可微**（即梯度是连续映射）；
> - $F=f+g$ 的水平集有界，即对任意 $\alpha\in\mathbb{R}$，$\mathrm{Lev}(F,\alpha)$ 有界。
> 则 AM 解 (14.9) 生成的序列有界，且其任一极限点都是问题的**最优解**。

**证明（自己走一遍，核心是把"极限点具有逐块驻点性质"传播成"整体最优"）**。

**第 0 步，有界性。** 同 Thm 14.3：$F(\mathbf{x}^k)$ 单调不增 $\Rightarrow \mathbf{x}^k\in\mathrm{Lev}(F,F(\mathbf{x}^0))$，由水平集有界得 $\{\mathbf{x}^k\}$ 有界。

**第 1 步，取极限点并建立三个性质。** 设 $\bar{\mathbf{x}}$ 是极限点，有子列 $\mathbf{x}^{k_j}\to\bar{\mathbf{x}}$；再取子列可设各辅助序列 $\mathbf{x}^{k_j,i}\to\bar{\mathbf{x}}_i\in\mathrm{dom}(g)$（$i=0,\ldots,p$）。三个性质：
- **[P1]** $\bar{\mathbf{x}}=\bar{\mathbf{x}}_0$；
- **[P2]** 对每个 $i$，$\bar{\mathbf{x}}_i$ 与 $\bar{\mathbf{x}}_{i-1}$ 只在第 $i$ 块可能不同；
- **[P3]** $F(\bar{\mathbf{x}})=F(\bar{\mathbf{x}}_i)$ 对所有 $i$（由 $F(\mathbf{x}^{k_j})\ge F(\mathbf{x}^{k_j,i})\ge F(\mathbf{x}^{k_j+1})$ 取极限，用闭性 + 定义域上连续得到）。

**第 2 步，从子问题极小点拿到逐块驻点 (14.10)。** 由方法定义，$\mathbf{x}^{k_j,i}_i$ 是子问题的极小点，按 Thm 3.72(a) 有
$$-\nabla_i f(\mathbf{x}^{k_j,i})\in\partial g_i(\mathbf{x}^{k_j,i}_i).$$
取极限并用 $\nabla f$ 连续，得
$$-\nabla_i f(\bar{\mathbf{x}}_i)\in\partial g_i(\bar{\mathbf{x}}_i).\tag{14.10}$$

**第 3 步，跨块递推拿到"对齐"的驻点 (14.11)。** 由 [P3]，$F(\bar{\mathbf{x}}_i)=F(\bar{\mathbf{x}}_{i+1})\le F(\bar{x}_1,\ldots,\bar{x}_i,x_{i+1},\bar{x}_{i+2},\ldots,\bar{x}_p)$ 对任意 $x_{i+1}\in\mathrm{dom}(g_{i+1})$。再请 Thm 3.72(a) 出马，得
$$-\nabla_{i+1}f(\bar{\mathbf{x}}_i)\in\partial g_{i+1}(\bar{\mathbf{x}}_{i+1}),\qquad i=0,\ldots,p-1.\tag{14.11}$$

**第 4–5 步，关键引理——把"第 $l$ 块看到的关于第 $i$ 块的驻点"往回传 (14.12)。** 要证对任意 $i\in\{2,\ldots,p\}$、$l\in\{1,\ldots,p-1\}$ 且 $l<i$：
$$-\nabla_i f(\bar{\mathbf{x}}_l)\in\partial g_i(\bar{\mathbf{x}}^l_i)\ \Longrightarrow\ -\nabla_i f(\bar{\mathbf{x}}_{l-1})\in\partial g_i(\bar{\mathbf{x}}^{l-1}_i).\tag{14.12}$$
设 $\boldsymbol{\eta}\in\mathbb{E}_i$，用 [P2]（两状态只第 $l$ 块不同）+ (14.10) 在 $i=l$ 处的次梯度不等式 + "$l<i$ 时 $\bar{x}^l_i=\bar{x}^{l-1}_i$"展开内积：
$$\begin{aligned}
\langle\nabla f(\bar{\mathbf{x}}_l),\bar{\mathbf{x}}_{l-1}+U_i(\boldsymbol{\eta})-\bar{\mathbf{x}}_l\rangle
&=\langle\nabla_l f(\bar{\mathbf{x}}_l),\bar{x}^l_l-\bar{x}^{l-1}_l\rangle+\langle\nabla_i f(\bar{\mathbf{x}}_l),\boldsymbol{\eta}\rangle\\
&\ge g_l(\bar{x}^l_l)-g_l(\bar{x}^{l-1}_l)+g_i(\bar{x}^l_i)-g_i(\bar{x}^{l-1}_i+\boldsymbol{\eta})\\
&= g(\bar{\mathbf{x}}_l)-g(\bar{\mathbf{x}}_{l-1}+U_i(\boldsymbol{\eta})).\tag{14.13}
\end{aligned}$$
对凸 $f$ 套梯度不等式，结合 (14.13) 与 [P3] 得
$$F(\bar{\mathbf{x}}_{l-1}+U_i(\boldsymbol{\eta}))\ge f(\bar{\mathbf{x}}_l)+\langle\nabla f(\bar{\mathbf{x}}_l),\cdot\rangle+g(\cdots)\ge F(\bar{\mathbf{x}}_l)=F(\bar{\mathbf{x}}_{l-1}),$$
于是 $\bar{x}^{l-1}_i\in\arg\min_{x_i}F(\bar{x}^{l-1}_1,\ldots,x_i,\ldots)$，即 $-\nabla_i f(\bar{\mathbf{x}}_{l-1})\in\partial g_i(\bar{\mathbf{x}}^{l-1}_i)$，(14.12) 成立。

**第 6 步，得出整体最优。** 对每个 $m$ 证 $-\nabla_m f(\bar{\mathbf{x}})\in\partial g_m(\bar{x}_m)$（(14.14)）。$m=1$ 时把 $i=0$ 代入 (14.11) 并用 [P1]。对 $m>1$，由 (14.11) 有 $-\nabla_m f(\bar{\mathbf{x}}_{m-1})\in\partial g_m(\bar{x}^{m-1}_m)$；反复套 (14.12) 把下标从 $m-1$ 一路传回 $0$，再由 [P1] $\bar{\mathbf{x}}=\bar{\mathbf{x}}_0$ 得到所有 $m$ 的驻点条件。由 Thm 11.6（驻点 $\Leftrightarrow$ 最优）+ $f$ 凸，知 $\bar{\mathbf{x}}$ 是 (14.9) 的最优解。$\blacksquare$

**逐字点评**：证明里最微妙的就是 (14.12) 的"逆向传播"——把"第 $m$ 块在较新状态处的驻点性质"一路倒推到 $\bar{\mathbf{x}}_0=\bar{\mathbf{x}}$。没有 $g$ 可分凸 + $f$ 可微凸，这步根本成立不了，这也是 Example 14.5 翻车的根因。书在取极限时还动用了"闭凸函数的次微分闭性"：若 $a_k\in\partial h(b_k)$ 且 $a_k\to\bar{a},b_k\to\bar{b}$，则 $\bar{a}\in\partial h(\bar{b})$——本质来自 liminf + 下半连续。

---

# 14.5 Rate of Convergence in the Convex Case

前面只证明了"收敛到最优解"，但没给速度。本节在凸设定下补上**次线性速率 $O(1/k)$**。先给适用于任意块数 $p$ 的一般结果，再针对 $p=2$ 给出依赖"最光滑块"的改进常数。

## 14.5.1 General $p$

> **Assumption 14.10.**
> **(A)** 对每个 $i$，$g_i:\mathbb{E}_i\to(-\infty,\infty]$ 是 proper、closed、凸的。
> **(B)** $f:\mathbb{E}\to\mathbb{R}$ 是凸的且 $L_f$-光滑（梯度全局 Lipschitz）。
> **(C)** 对任意 $\alpha>0$，存在 $R_\alpha>0$ 使得
> $$\max_{\mathbf{x},\mathbf{x}^*\in\mathbb{E}}\{\|\mathbf{x}-\mathbf{x}^*\|:F(\mathbf{x})\le\alpha,\ \mathbf{x}^*\in X^*\}\le R_\alpha.$$
> **(D)** 问题 (14.9) 的最优解集非空、记为 $X^*$，最优值记为 $F_{\mathrm{opt}}$。

> **Theorem 14.11** ($O(1/k)$ rate of convergence of alternating minimization). 设 Assumption 14.10 成立，$\{\mathbf{x}^k\}$ 为 AM 解 (14.9) 的序列。则对所有 $k\ge2$，
> $$F(\mathbf{x}^k)-F_{\mathrm{opt}}\le \max\left\{\frac{1}{2^{(k-1)/2}}\big(F(\mathbf{x}^0)-F_{\mathrm{opt}}\big),\ \frac{8L_f p^2 R^2}{k-1}\right\},\tag{14.15}$$
> 其中 $R=R_{F(\mathbf{x}^0)}$。

**证明（自己走一遍，两步套用 Ch11 的引理）**。

**第一步，块充分下降 (14.19)。** 记辅助序列 $\mathbf{x}^{k,j}$（$j=0,\ldots,p$）。由 $f$ 凸 + $L_f$-光滑（Thm 5.8 的 (i)$\Leftrightarrow$(iii)），对任意块更新有
$$\begin{aligned}
F(\mathbf{x}^{k,j})-F(\mathbf{x}^{k,j+1})
&= f(\mathbf{x}^{k,j})-f(\mathbf{x}^{k,j+1})+g(\mathbf{x}^{k,j})-g(\mathbf{x}^{k,j+1})\\
&\ge \langle\nabla f(\mathbf{x}^{k,j+1}),\mathbf{x}^{k,j}-\mathbf{x}^{k,j+1}\rangle+\frac{1}{2L_f}\|\nabla f(\mathbf{x}^{k,j})-\nabla f(\mathbf{x}^{k,j+1})\|^2\\
&\qquad +\,g(\mathbf{x}^{k,j})-g(\mathbf{x}^{k,j+1}).
\end{aligned}\tag{14.17}$$
子问题极小点满足 $-\nabla_{j+1}f(\mathbf{x}^{k,j+1})\in\partial g_{j+1}(\cdot)$（(14.18)），用次梯度不等式把 $g$ 项抵消，得
$$F(\mathbf{x}^{k,j})-F(\mathbf{x}^{k,j+1})\ge\frac{1}{2L_f}\|\nabla f(\mathbf{x}^{k,j})-\nabla f(\mathbf{x}^{k,j+1})\|^2.$$
对 $j=0,\ldots,p-1$ 求和：
$$F(\mathbf{x}^k)-F(\mathbf{x}^{k+1})\ge\frac{1}{2L_f}\sum_{j=0}^{p-1}\|\nabla f(\mathbf{x}^{k,j})-\nabla f(\mathbf{x}^{k,j+1})\|^2.\tag{14.19}$$

**第二步，上界套 Cauchy–Schwarz (14.22)。** 对凸 $f$ 用梯度不等式展开 $F(\mathbf{x}^{k+1})-F(\mathbf{x}^*)$，借 (14.18) 消去 $g$ 项：
$$F(\mathbf{x}^{k+1})-F(\mathbf{x}^*)\le\sum_{j=0}^{p-1}\|\nabla_{j+1}f(\mathbf{x}^{k+1})-\nabla_{j+1}f(\mathbf{x}^{k,j+1})\|\cdot\|\mathbf{x}^{k,j+1}_{p+1}-\mathbf{x}^*_{p+1}\|.\tag{14.21}$$
用块梯度差 $\le$ 全梯度差分之和，再平方 + Cauchy–Schwarz + (14.16)（$\|\mathbf{x}^{k+1}-\mathbf{x}^*\|\le R$）：
$$(F(\mathbf{x}^{k+1})-F(\mathbf{x}^*))^2\le p^2R^2\sum_{t=0}^{p-1}\|\nabla f(\mathbf{x}^{k,t})-\nabla f(\mathbf{x}^{k,t+1})\|^2.\tag{14.22}$$

**第三步，合成递推 + Ch11 的 $O(1/k)$ 引理。** 联立 (14.19)(14.22)：
$$(F(\mathbf{x}^{k+1})-F_{\mathrm{opt}})^2\le 2L_f p^2 R^2\big(F(\mathbf{x}^k)-F(\mathbf{x}^{k+1})\big).$$
记 $a_k=F(\mathbf{x}^k)-F_{\mathrm{opt}}$，即 $a_k-a_{k+1}\ge\frac{1}{\gamma}a_{k+1}^2$，$\gamma=2L_f p^2R^2$。套 **Lemma 11.17** 得 (14.15)。$\blacksquare$

**结论**：一般 $p$ 块时的速率常数依赖**全局** Lipschitz 常数 $L_f$——也就是被"最不光滑的那一块"拖后腿（见 Remark 14.16）。下面 $p=2$ 会改进这一点。

## 14.5.2 $p=2$

当只有两块时，可以换一套分析，把速率常数里的 $L_f$ 换成**最小的块 Lipschitz 常数** $\min\{L_1,L_2\}$。

> **Assumption 14.12.**
> **(A)** $i\in\{1,2\}$ 时 $g_i:\mathbb{E}_i\to(-\infty,\infty]$ 是 proper、closed、凸的。
> **(B)** $f:\mathbb{E}\to\mathbb{R}$ 凸，且在包含 $\mathrm{dom}(g)$ 的开集上可微。
> **(C)** 对每个 $i\in\{1,2\}$，梯度关于第 $i$ 块在 $\mathrm{dom}(g_i)$ 上 Lipschitz，常数 $L_i\in(0,\infty)$：
> $$\|\nabla_1 f(x_1+d_1,x_2)-\nabla_1 f(x_1,x_2)\|\le L_1\|d_1\|,\quad \|\nabla_2 f(x_1,x_2+d_2)-\nabla_2 f(x_1,x_2)\|\le L_2\|d_2\|.$$
> **(D)** 最优解集 $X^*$ 非空，最优值 $F_{\mathrm{opt}}$。
> **(E)** 对任意 $\alpha>0$，存在 $R_\alpha>0$ 使 $\max\{\|\mathbf{x}-\mathbf{x}^*\|:F(\mathbf{x})\le\alpha,\mathbf{x}^*\in X^*\}\le R_\alpha$。

模型即 $\min_{x_1,x_2}\{F(x_1,x_2)=f(x_1,x_2)+g_1(x_1)+g_2(x_2)\}$（(14.23)）。AM 描述略有不同——**先"白做"半步**：

> **The Alternating Minimization Method ($p=2$).**
> **Initialization:** 取 $x_1^0\in\mathrm{dom}(g_1),\ x_2^0\in\mathrm{dom}(g_2)$ 使得 $x_2^0\in\arg\min_{x_2}f(x_1^0,x_2)+g_2(x_2)$。
> **General step ($k=0,1,\ldots$):**
> $$x_1^{k+1}\in\arg\min_{x_1}f(x_1,x_2^k)+g_1(x_1),\tag{14.24}$$
> $$x_2^{k+1}\in\arg\min_{x_2}f(x_1^{k+1},x_2)+g_2(x_2).\tag{14.25}$$

并引入中间点 $\mathbf{x}^{k+1/2}=(x_1^{k+1},x_2^k)$。

**局部 prox-gradient 与梯度映射（联系 Ch11/Ch6）。**。借用 §11.3.1 的记号，对任意 $M>0$ 定义**部分 prox-gradient 映射**与**部分梯度映射**：
$$T_M^i(\mathbf{x})=\mathrm{prox}_{\frac{1}{M}g_i}\!\left(x_i-\frac{1}{M}\nabla_i f(\mathbf{x})\right),\qquad i=1,2,$$
$$G_M^i(\mathbf{x})=M\big(x_i-T_M^i(\mathbf{x})\big),\qquad i=1,2.$$
整体记为 $T_M(\mathbf{x})=(T_M^1(\mathbf{x}),T_M^2(\mathbf{x}))$、$G_M(\mathbf{x})=(G_M^1(\mathbf{x}),G_M^2(\mathbf{x}))$。由 AM 的定义，对所有 $k\ge0$ 有
$$G_{L_1}^1(\mathbf{x}^{k+1/2})=0,\qquad G_{L_2}^2(\mathbf{x}^k)=0.\tag{14.26}$$

**为什么引入这些映射**：AM 的每一步本质就是这个"部分近端梯度步"取到的驻点（梯度映射为零）。把 AM 翻译成 prox-gradient 语言后，就能直接调用 Ch11 的**块充分下降引理（Lemma 11.9）**和**块下降引理（Lemma 11.8）**，以及 Ch6 的**第二近端定理（Thm 6.39）**——这正是下面两个引理的来历。

#### Lemma 14.13（充分下降）

> **Lemma 14.13.** 设 Assumption 14.12 成立，$\{\mathbf{x}^k\}$ 为 AM 解 (14.23) 的序列。则对任意 $k\ge0$：
> $$F(\mathbf{x}^k)-F(\mathbf{x}^{k+1/2})\ge\frac{1}{2L_1}\|G_{L_1}^1(\mathbf{x}^k)\|^2,\tag{14.27}$$
> $$F(\mathbf{x}^{k+1/2})-F(\mathbf{x}^{k+1})\ge\frac{1}{2L_2}\|G_{L_2}^2(\mathbf{x}^{k+1/2})\|^2.\tag{14.28}$$

**证明（自己走一遍）**。对 $i=1$ 套用块充分下降引理（Lemma 11.9），取 $\mathbf{x}=\mathbf{x}^k$：
$$F(x_1^k,x_2^k)-F(T_{L_1}^1(\mathbf{x}^k),x_2^k)\ge\frac{1}{2L_1}\|G_{L_1}^1(x_1^k,x_2^k)\|^2.$$
而由 (14.26) 有 $T_{L_1}^1(\mathbf{x}^k)=x_1^{k+1}$ 且 $F(\mathbf{x}^{k+1/2})\le F(T_{L_1}^1(\mathbf{x}^k),x_2^k)$，即得 (14.27)。对 $i=2$ 取 $\mathbf{x}=\mathbf{x}^{k+1/2}$ 同理得 (14.28)。$\blacksquare$

#### Lemma 14.14（函数值差的上界）

> **Lemma 14.14.** 设 $\{\mathbf{x}^k\}$ 为 AM 解 (14.23) 的序列。则对任意 $\mathbf{x}^*\in X^*$ 与 $k\ge0$：
> $$F(\mathbf{x}^{k+1/2})-F(\mathbf{x}^*)\le\|G_{L_1}^1(\mathbf{x}^k)\|\cdot\|\mathbf{x}^k-\mathbf{x}^*\|,\tag{14.29}$$
> $$F(\mathbf{x}^{k+1})-F(\mathbf{x}^*)\le\|G_{L_2}^2(\mathbf{x}^{k+1/2})\|\cdot\|\mathbf{x}^{k+1/2}-\mathbf{x}^*\|.\tag{14.30}$$

**证明（自己走一遍 (14.29)）**。由 (14.26) 知 $T_{L_1}(\mathbf{x}^k)=(T_{L_1}^1(\mathbf{x}^k),x_2^k)$。套用块下降引理（Lemma 11.8）于凸 $f$，再借第二近端定理（Thm 6.39，取 $f=\frac{1}{L_1}g$、$\mathbf{x}=\mathbf{x}^k-\frac{1}{L_1}\nabla f(\mathbf{x}^k)$、$\mathbf{y}=\mathbf{x}^*$）处理 $g$ 项，沿书上放缩即：
$$\begin{aligned}
F(\mathbf{x}^{k+1/2})-F(\mathbf{x}^*)
&\le F(T_{L_1}(\mathbf{x}^k))-F(\mathbf{x}^*)\\
&\le \langle G_{L_1}(\mathbf{x}^k),\,T_{L_1}(\mathbf{x}^k)-\mathbf{x}^*\rangle+\frac{1}{2L_1}\|G_{L_1}(\mathbf{x}^k)\|^2\\
&= -\frac{1}{L_1}\|G_{L_1}(\mathbf{x}^k)\|^2+\langle G_{L_1}(\mathbf{x}^k),\mathbf{x}^k-\mathbf{x}^*\rangle+\frac{1}{2L_1}\|G_{L_1}(\mathbf{x}^k)\|^2\\
&\le \langle G_{L_1}(\mathbf{x}^k),\mathbf{x}^k-\mathbf{x}^*\rangle
\le \|G_{L_1}(\mathbf{x}^k)\|\cdot\|\mathbf{x}^k-\mathbf{x}^*\|,
\end{aligned}$$
即 (14.29)。(14.30) 同理（起点换 $(x_1^1,x_2^0)$、首更新块设为 $i=2$）。$\blacksquare$

#### Theorem 14.15（改进版 $O(1/k)$）

> **Theorem 14.15** ($O(1/k)$ rate of alternating minimization—improved result). 设 Assumption 14.12 成立，$\{\mathbf{x}^k\}$ 为 AM 解 (14.23) 的序列。则对所有 $k\ge2$：
> $$F(\mathbf{x}^k)-F_{\mathrm{opt}}\le \max\left\{\frac{1}{2^{(k-1)/2}}\big(F(\mathbf{x}^0)-F_{\mathrm{opt}}\big),\ \frac{8\min\{L_1,L_2\}R^2}{k-1}\right\},\tag{14.34}$$
> 其中 $R=R_{F(\mathbf{x}^0)}$。

**证明（自己走一遍）**。由 Lemma 14.14 + (E) 得 $F(\mathbf{x}^{k+1/2})-F_{\mathrm{opt}}\le\|G_{L_1}^1(\mathbf{x}^k)\|R$。结合 Lemma 14.13：
$$F(\mathbf{x}^k)-F(\mathbf{x}^{k+1})\ge F(\mathbf{x}^k)-F(\mathbf{x}^{k+1/2})\ge\frac{1}{2L_1}\|G_{L_1}^1(\mathbf{x}^k)\|^2\ge\frac{(F(\mathbf{x}^{k+1/2})-F_{\mathrm{opt}})^2}{2L_1R^2}\ge\frac{(F(\mathbf{x}^{k+1})-F_{\mathrm{opt}})^2}{2L_1R^2}.\tag{14.35}$$
对第二块同理（用 (14.30) 与 (14.28)）得到带 $L_2$ 的式子；两者取较好者：
$$F(\mathbf{x}^k)-F(\mathbf{x}^{k+1})\ge\frac{1}{2\min\{L_1,L_2\}R^2}(F(\mathbf{x}^{k+1})-F_{\mathrm{opt}})^2.\tag{14.36}$$
记 $a_k=F(\mathbf{x}^k)-F_{\mathrm{opt}}$，$\gamma=2\min\{L_1,L_2\}R^2$，则 $a_k-a_{k+1}\ge\frac{1}{\gamma}a_{k+1}^2$；套 Lemma 11.17 得 (14.34)。$\blacksquare$

> **Remark 14.16.** 效率估计 (14.34) 的常数依赖 $\min\{L_1,L_2\}$——即两块 AM 的收敛速率由**最光滑**（最小 Lipschitz 常数）的那一块主导。这与 Thm 14.11 对任意块数情形依赖全局 $L_f$（被"最不光滑"块拖后腿）形成鲜明对比。

**逐字点评（全章收尾）**：
- 一般 $p$ 块：速率常数被**最差块**卡住（全局 $L_f$）；
- $p=2$：速率常数由**最光滑块**决定（$\min\{L_1,L_2\}$）。
这个反差非常"Beck"——看似对称的两块结构，因为可以"先白做半步 + 用部分 Lipschitz"而获得质的改进。

---

## 本章地图（向后/向前引用一览）

| 对象 | 本章编号 | 依赖的"前驱章" | 一句话作用 |
| --- | --- | --- | --- |
| AM 良定义 | Lemma 14.1 | Ch2 Thm 2.12（闭函数 Weierstrass）、Thm 2.7(a) 仿射复合保闭 | 保证每一步子问题有解 |
| 坐标极小点 | Def 14.2 | Ch2 水平集/闭性 | AM 能收敛到的最弱目标 |
| 收敛到坐标极小点 | Thm 14.3 | Ch2 闭+连续+有界水平集 | 唯一性假设的威力 |
| 两个反例 | Ex 14.4/14.5 | — | 坐标极小点 $\neq$ 驻点，凸也不救 |
| 坐标极小 $\Rightarrow$ 驻点 | Lemma 14.7 | Ch3 Thm 3.72(a)、Ch11 Thm 11.6(a) | 复合模型救场的关键 |
| 收敛到最优 | Thm 14.9 | Ch3 Def 3.73、Ch11 Thm 11.6 | 凸性去掉唯一性假设 |
| $O(1/k)$ 一般 $p$ | Thm 14.11 | Ch5 Thm 5.8（光滑等价）、Ch11 Lemma 11.17 | 依赖全局 $L_f$ |
| $O(1/k)$ 改进 $p=2$ | Thm 14.15 | Ch6 Thm 6.39（第二近端）、Ch11 Lemma 11.8/11.9 | 依赖 $\min\{L_1,L_2\}$ |

**一句话总结**：AM 是最朴素的块坐标下降，它的"天花板"是坐标极小点而非驻点；只有在复合模型 $f+g$（$g$ 可分凸、$f$ 可微凸）下，坐标极小点才等于驻点、进而在凸设定下等于最优解；凸情形给出 $O(1/k)$ 次线性速率，且两块时常数由最光滑块决定。下一站若想看"不要求精确块极小"的更实用变体，可回看 Ch11 的块 proximal 梯度与 Ch13 的块条件梯度——它们共享本节的全部结构假设。
