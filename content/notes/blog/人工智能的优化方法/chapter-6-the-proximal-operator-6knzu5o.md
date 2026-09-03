---
blog: true
title: "Chapter 6-The Proximal Operator"
slug: "chapter-6-the-proximal-operator-6knzu5o"
summary: "近端算子：把“最小化一个函数+一个最小二乘正则”封装成一个算子，串起存在唯一性、各种显式例子、与投影/Moreau 包络/共轭的关系。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

在本书中，我们的 underlying space 仍然是**有限维欧氏空间** $\mathbb{E}$（带内积 $\langle\cdot,\cdot\rangle$ 和欧氏范数 $\|\mathbf{x}\|=\sqrt{\langle\mathbf{x},\mathbf{x}\rangle}$）。这一章是全书真正的“发动机”——前面五章把凸分析、次梯度、共轭、强凸性都备齐了，从这一章起我们开始造**算法积木**。

> **Underlying Space:** In this chapter $\mathbb{E}$ is a Euclidean space, meaning a finite dimensional space endowed with an inner product $\langle\cdot,\cdot\rangle$ and the Euclidean norm $\|\cdot\|=\sqrt{\langle\cdot,\cdot\rangle}$.

这个积木就是 **proximal mapping（近端算子）**，最早由 Moreau 系统研究，所以也叫 **Moreau's proximal mapping**。一句话剧透：它把“最小化函数 $f$ 但别离当前点 $\mathbf{x}$ 太远”封装成一个算子；后面几乎所有一阶近端算法（ISTA、FISTA、ADMM 的近端正步、 primal-dual 等）都建立在这一章的公式库上。

# 6.1 Definition, Existence, and Uniqueness

## Definition 6.1 · 近端映射

> **Definition 6.1** (proximal mapping). Given a function $f:\mathbb{E}\to(-\infty,\infty]$, the proximal mapping of $f$ is the operator given by
> $$\mathrm{prox}_{f}(\mathbf{x})=\operatorname{argmin}_{\mathbf{u}\in\mathbb{E}}\left\{f(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right\}$$
> for any $\mathbf{x}\in\mathbb{E}$.

**逐字点评**：这个公式就是整章的“圣经”。它长得很像“在 $\mathbf{x}$ 附近求 $f$ 的最小化”，但比单纯最小化多了一个 $\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^2$ 的**二次惩罚项**——它逼着最优解 $\mathbf{u}$ 不能离 $\mathbf{x}$ 太远。系数 $1/2$ 只是为了后面求导时凑出漂亮的 $+1$ 而不是 $+2$（你会在 §6.5 看到这个甜头）。

**为什么这一行最关键**：注意 $\mathrm{prox}_f(\mathbf{x})$ 的返回值**不是一个数，而是一个集合**（subset of $\mathbb{E}$），它可能空、可能是单点、也可能多点。这一点和被 argmin 的语义完全一致——argmin 返回的是“达到最小值的那些点”。所以 canonical 写法应该是 $\mathrm{prox}_f(\mathbf{x})=\{\mathbf{u}^*\}$，但本书在确认唯一性后会把它当单值映射写 $\mathrm{prox}_f(\mathbf{x})=\mathbf{u}^*$。

**作者注**：书里随即说“We will often use the term 'prox' instead of 'proximal'.”——这是 Beck 在埋钩子，后面满篇都是 $\mathrm{prox}$ 缩写。

## Example 6.2 · 三兄弟 $g_1,g_2,g_3$（看集合可能长什么样）

> **Example 6.2.** Consider the following three functions from $\mathbb{R}$ to $\mathbb{R}$:
> $$g_1(x)\equiv 0,\qquad g_2(x)=\begin{cases}0,&x\neq 0,\\-\lambda,&x=0,\end{cases}\qquad g_3(x)=\begin{cases}0,&x\neq 0,\\ \lambda,&x=0,\end{cases}$$
> where $\lambda>0$ is a given constant.

$g_1$ 是平凡的：目标函数就是 $\frac{1}{2}(u-x)^2$，最小化在 $u=x$ 取到，故 $\mathrm{prox}_{g_1}(x)=\{x\}$。

$g_2$ 和 $g_3$ 才是重点。它们的结构是“在 $0$ 处挖一个坑（或堆一个尖）”。书里给的结果：
$$\mathrm{prox}_{g_2}(x)=\begin{cases}\{0\},&|x|<\sqrt{2\lambda},\\ \{x\},&|x|>\sqrt{2\lambda},\\ \{0,x\},&|x|=\sqrt{2\lambda},\end{cases}$$
$$\mathrm{prox}_{g_3}(x)=\begin{cases}\{x\},&x\neq 0,\\ \emptyset,&x=0.\end{cases}$$

**为什么这个例子值得记一辈子**：它用三个具体函数把 $\mathrm{prox}_f(\mathbf{x})$ 三种可能性（单点 / 空集 / 多点）一次性演示完了。书里还配了 **Figure 6.1**：*See the original image for the plots of the functions $g_2$ and $g_3$ with $\lambda=0.5$ from Example 6.2.* 从图上看，$g_2$ 在原点处是 $-\lambda$ 的“陷阱”，所以 $\mathbf{x}$ 离原点够近时，甘愿跳到 $0$ 吃这个坑；当 $|\mathbf{x}|$ 足够大，坑的吸引力敌不过距离惩罚，就停在 $u=x$。$g_3$ 相反，原点是个 $+\lambda$ 的尖刺，平时都避开它；只有 $\mathbf{x}=0$ 时，距离惩罚为零，但此时坑在原点上方一点，所以**没有**有限点能赢（空集）。

**几何直觉 / 一个值得记住的细节**：对 $g_2$，临界距离 $\sqrt{2\lambda}$ 来自比较“跳到原点的代价 $-\lambda$”与“停在原地 $u=x$ 的距离惩罚 $0$”——实际上判据是 $0\ ?\ -\lambda+\frac{x^2}{2}$，即 $|x|\ ?\ \sqrt{2\lambda}$，这就是公式里 $\sqrt{2\lambda}$ 的来历（书里 §6.2.4 会再次用到这个常数）。

## Theorem 6.3 · 第一近端定理（存在唯一性）

> **Theorem 6.3** (first prox theorem). Let $f:\mathbb{E}\to(-\infty,\infty]$ be a proper closed and convex function. Then $\mathrm{prox}_{f}(\mathbf{x})$ is a singleton for any $\mathbf{x}\in\mathbb{E}$.

这是整章的“安心丸”：只要 $f$ 是 proper closed convex（PCC），近端映射**处处唯一**。注意 Example 6.2 里只有 $g_1$ 满足 PCC（proper、闭、凸——常数函数当然全满足），所以它处处单点；而 $g_2,g_3$ 在 $0$ 处不连续（不闭），于是出现空集/多点。

### 证明：自己走一遍（三个引用拼起来）
固定 $\mathbf{x}$，记
$$\tilde{f}(\mathbf{u},\mathbf{x})\equiv f(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^2.$$
我们要证 $\tilde{f}(\cdot,\mathbf{x})$ 在 $\mathbb{E}$ 上有唯一最小点。

- **强凸性**：$\frac{1}{2}\|\cdot-\mathbf{x}\|^2$ 是强凸的（Hessian $=I\succ 0$），而 $f$ 是凸的。两者相加，由 **Lemma 5.20**（强凸+凸=强凸）得到 $\tilde{f}(\cdot,\mathbf{x})$ 强凸。
- **闭性**：$\frac{1}{2}\|\cdot-\mathbf{x}\|^2$ 连续（当然闭），加上 $f$ 闭，由 **Thm 2.7(b)**（非负有限和保闭）得 $\tilde{f}(\cdot,\mathbf{x})$ 闭。
- **properness**：$\tilde{f}$ 的 properness 直接继承自 $f$ 的 properness。

于是 $\tilde{f}(\cdot,\mathbf{x})$ 是 proper closed strongly convex。由 **Thm 5.25(a)**（闭强凸函数有唯一最小点），最小化问题有唯一解。$\blacksquare$

**逐字点评**：证明骨架是“强凸保唯一 + 闭保存在”。书上一句话带过，但真正工作全砸在 Lemma 5.20、Thm 2.7(b)、Thm 5.25 三个引用上——这正是前五章“工具箱”的回报时刻。

## Theorem 6.4 · 闭 + 强制性 → 非空

> **Theorem 6.4** (nonemptiness of the prox under closedness and coerciveness). Let $f:\mathbb{E}\to(-\infty,\infty]$ be a proper closed function, and assume that the following condition is satisfied:
> $$\text{the function }\mathbf{u}\mapsto f(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\text{ is coercive for any }\mathbf{x}\in\mathbb{E}.\tag{6.2}$$
> Then $\mathrm{prox}_{f}(\mathbf{x})$ is nonempty for any $\mathbf{x}\in\mathbb{E}$.

**为什么重要**：第一近端定理要“凸”，这条把“凸”换成更弱的“闭 + 强制（coercive）”，只保证**非空**（不一定唯一）。注意 $\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^2$ 本身已经强制，所以多数正常函数都满足 (6.2)。

### 证明（书上的，极短）
$h(\mathbf{u})\equiv f(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^2$ 是两个闭函数之和，故闭；又由前提强制。由 **Thm 2.14**（ coercive 闭函数的极小点集非空）直接得 $\mathrm{prox}_f(\mathbf{x})$ 非空。$\blacksquare$

**一个值得记住的细节**：Example 6.2 其实是这条定理的反面教材——$g_2,g_3$ 都满足 (6.2) 的强制性，但只有 $g_2$ 闭，所以 $g_2$ 处处非空、而 $g_3$ 在 $x=0$ 处出现空集，这“不 surprising”（书原话）。

---

# 6.2 First Set of Examples of Proximal Mappings

装备好定义后，先算几个 PCC 函数的近端“热身”。这些结果后面会反复当积木用。

## §6.2.1 Constant — 恒等映射

> If $f\equiv c$ for some $c\in\mathbb{R}$, then $\mathrm{prox}_{f}(\mathbf{x})=\mathbf{x}$ is the identity mapping.

因为常数不影响 argmin，$\min_{\mathbf{u}}\{c+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^2\}$ 的解就是 $\mathbf{u}=\mathbf{x}$。

## §6.2.2 Affine — 平移映射

> Let $f(\mathbf{x})=\langle\mathbf{a},\mathbf{x}\rangle+b$, where $\mathbf{a}\in\mathbb{E}$ and $b\in\mathbb{R}$. Then $\mathrm{prox}_{f}(\mathbf{x})=\mathbf{x}-\mathbf{a}$ is a translation mapping.

配方即可：目标函数（去掉与 $\mathbf{u}$ 无关的 $\langle\mathbf{a},\mathbf{x}\rangle+b$）
$$\langle\mathbf{a},\mathbf{u}\rangle+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}
=\frac{1}{2}\|\mathbf{u}-(\mathbf{x}-\mathbf{a})\|^{2}+\langle\mathbf{a},\mathbf{x}\rangle+b-\frac{1}{2}\|\mathbf{a}\|^{2}.$$
最小化在 $\mathbf{u}=\mathbf{x}-\mathbf{a}$。**记住 affine 的近端是把输入往 $-\mathbf{a}$ 方向推一格**——这是 §6.3 二次扰动定理的特例。

## §6.2.3 Convex Quadratic — 矩阵求逆

> Let $f:\mathbb{R}^{n}\to\mathbb{R}$ be given by $f(\mathbf{x})=\frac{1}{2}\mathbf{x}^{T}\mathbf{A}\mathbf{x}+\mathbf{b}^{T}\mathbf{x}+c$, where $\mathbf{A}\in\mathbb{S}_{+}^{n}$, $\mathbf{b}\in\mathbb{R}^{n}$, $c\in\mathbb{R}$. Then $\mathrm{prox}_{f}(\mathbf{x})=(\mathbf{A}+\mathbf{I})^{-1}(\mathbf{x}-\mathbf{b})$.

对目标函数令梯度为零：
$$\nabla_{\mathbf{u}}\left[\frac{1}{2}\mathbf{u}^{T}\mathbf{A}\mathbf{u}+\mathbf{b}^{T}\mathbf{u}+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right]=\mathbf{A}\mathbf{u}+\mathbf{b}+\mathbf{u}-\mathbf{x}=0,$$
即 $(\mathbf{A}+\mathbf{I})\mathbf{u}=\mathbf{x}-\mathbf{b}$。因 $\mathbf{A}\succeq 0$，有 $\mathbf{A}+\mathbf{I}\succ 0$，可逆。$\blacksquare$

**为什么重要**：当 $f$ 是二次时近端是**显式线性变换** $(\mathbf{A}+\mathbf{I})^{-1}(\mathbf{x}-\mathbf{b})$——这是 proximal Newton 类方法的雏形。

## §6.2.4 Lemma 6.5 · 一维函数近端全家福

> **Lemma 6.5.** The following are pairs of proper closed and convex functions and their prox mappings:
> $$\begin{aligned}
> g_1(x)&=\begin{cases}\mu x,&x\ge 0,\\\infty,&x<0,\end{cases}&\mathrm{prox}_{g_1}(x)&=[x-\mu]_+,\\
> g_2(x)&=\lambda|x|,&\mathrm{prox}_{g_2}(x)&=[|x|-\lambda]_+\operatorname{sgn}(x),\\
> g_3(x)&=\begin{cases}\lambda x^{3},&x\ge 0,\\\infty,&x<0,\end{cases}&\mathrm{prox}_{g_3}(x)&=\frac{-1+\sqrt{1+12\lambda[x]_+}}{6\lambda},\\
> g_4(x)&=\begin{cases}-\lambda\log x,&x>0,\\\infty,&x\le 0,\end{cases}&\mathrm{prox}_{g_4}(x)&=\frac{x+\sqrt{x^{2}+4\lambda}}{2},\\
> g_5(x)&=\delta_{[0,\eta]\cap\mathbb{R}}(x),&\mathrm{prox}_{g_5}(x)&=\min\{\max\{x,0\},\eta\},
> \end{aligned}$$
> where $\lambda\in\mathbb{R}_{+}$, $\eta\in[0,\infty]$, and $\mu\in\mathbb{R}$.

**证明套路（书原话归纳）**：对凸函数，验证极小点只用两条 trivial arguments：
(i) 若 $f'(u)=0$ 则 $u$ 是极小点候选；
(ii) 若凸函数极小点不在任何可微点取到，则必在某个不可微点取到。
下面只推两个最有代表性的，其余同理。

**[g1]** 定义域是 $[0,\infty)$，内部目标 $f_1(u)=\mu u+\frac{1}{2}(u-x)^2$，导数零点 $u=x-\mu$。若 $x>\mu$ 则 $x-\mu>0$ 落在定义域内，得 $\mathrm{prox}_{g_1}(x)=x-\mu$；若 $x\le\mu$ 则导数零点在定义域外，极小点只能落在唯一不可微点 $0$，故为 $0$。合起来 $[x-\mu]_+$。$\blacksquare$

**[g3]** 正部目标 $s(u)=\lambda u^3+\frac{1}{2}(u-x)^2$，导数零点满足 $3\lambda\tilde{u}^2+\tilde{u}-x=0$。该二次式有正根当且仅当 $x>0$，此时正根 $\tilde{u}=\frac{-1+\sqrt{1+12\lambda x}}{6\lambda}$；若 $x\le 0$ 则极小点在不可微点 $0$。用 $[x]_+$ 包起来即得公式。$\blacksquare$

**[g4]** 在 $\mathbb{R}_{++}$ 上，导数零点 $-\lambda/\tilde{u}+(\tilde{u}-x)=0\Rightarrow \tilde{u}^2-\tilde{u}x-\lambda=0$，取正根 $\frac{x+\sqrt{x^2+4\lambda}}{2}$。$\blacksquare$

**[g5]** 在 $[0,\eta]$ 上最小化 $\frac{1}{2}(u-x)^2$，就是“把 $x$ 截断到 $[0,\eta]$”——$\min\{\max\{x,0\},\eta\}$。$\blacksquare$

**一个值得记住的细节**：Lemma 6.5 是后面 §6.3 分离性、§6.4 投影、§6.7 Moreau 包络的“元件库”。$g_2$（绝对值）的近端就是著名的**软阈值**，下一节专门展开。

---

# 6.3 Prox Calculus Rules

这一节是“近端微积分”——给定简单函数的近端，怎么组合出复杂函数的近端。注意有些结果**不要求**凸/闭。

## Theorem 6.6 · 分离函数的近端 = 各分量近端之积

> **Theorem 6.6** (prox of separable functions). Suppose that $f:\mathbb{E}_{1}\times\mathbb{E}_{2}\times\cdots\times\mathbb{E}_{m}\to(-\infty,\infty]$ is given by
> $$f(x_1,x_2,\ldots,x_m)=\sum_{i=1}^{m}f_i(x_i)$$
> for any $x_i\in\mathbb{E}_{i}$. Then for any $x_1\in\mathbb{E}_{1},\ldots,x_m\in\mathbb{E}_{m}$,
> $$\mathrm{prox}_{f}(x_1,\ldots,x_m)=\mathrm{prox}_{f_1}(x_1)\times\cdots\times\mathrm{prox}_{f_m}(x_m).\tag{6.3}$$

### 证明：自己走一遍
$$\begin{aligned}
\mathrm{prox}_f(x_1,\ldots,x_m)
&=\operatorname{argmin}_{y_1,\ldots,y_m}\sum_{i=1}^{m}\left\{\frac{1}{2}\|y_i-x_i\|^{2}+f_i(y_i)\right\}\\
&=\prod_{i=1}^{m}\operatorname{argmin}_{y_i}\left\{\frac{1}{2}\|y_i-x_i\|^{2}+f_i(y_i)\right\}
=\prod_{i=1}^{m}\mathrm{prox}_{f_i}(x_i).
\end{aligned}$$
关键观察：目标函数已经按分量**完全分离**，所以联合最小化 = 各分量独立最小化。$\blacksquare$

**为什么重要**：这告诉我们“维度可以拆开算”。后面 $\ell_1$、$\ell_0$、负对数和全是逐分量求和，立刻能用这条。

## Remark 6.7 · 向量写法

> **Remark 6.7.** If $f:\mathbb{R}^{n}\to\mathbb{R}$ is proper closed convex and separable, $f(\mathbf{x})=\sum_{i=1}^{n}f_i(x_i)$, then $\mathrm{prox}_{f}(\mathbf{x})=(\mathrm{prox}_{f_i}(x_i))_{i=1}^{n}$.

## Example 6.8 · $\ell_1$-范数 → 软阈值（全书最高频公式）

> **Example 6.8** (l1-norm). Suppose that $g:\mathbb{R}^{n}\to\mathbb{R}$ is given by $g(\mathbf{x})=\lambda\|\mathbf{x}\|_{1}$, where $\lambda>0$. Then $g(\mathbf{x})=\sum_{i=1}^{n}\phi(x_i)$ where $\phi(t)=\lambda|t|$. By Lemma 6.5, $\mathrm{prox}_{\phi}(s)=T_{\lambda}(s)$, where
> $$T_{\lambda}(y)=[|y|-\lambda]_{+}\operatorname{sgn}(y)=\begin{cases}y-\lambda,&y\ge\lambda,\\ 0,&|y|<\lambda,\\ y+\lambda,&y\le-\lambda.\end{cases}$$

**Figure 6.2.** *The soft thresholding function $T_{1}$.*

由 Thm 6.6，
$$\mathrm{prox}_{g}(\mathbf{x})=(T_{\lambda}(x_j))_{j=1}^{n}=[|\mathbf{x}|-\lambda\mathbf{e}]_{+}\odot\operatorname{sgn}(\mathbf{x}),$$
即逐分量软阈值。写成向量：$T_{\lambda}(\mathbf{x})\equiv(T_{\lambda}(x_j))_{j=1}^{n}$。

**为什么这一行最关键**：软阈值 $T_{\lambda}$ 是 lasso、ISTA、稀疏重构的命根子。它干的事是“把每个分量朝零压缩 $\lambda$，但别压过零”——这正是 $\ell_1$ 正则诱导稀疏的近端解释。

## Example 6.9 · 负对数和

> **Example 6.9** (negative sum of logs). Let $g(\mathbf{x})=\begin{cases}-\lambda\sum_{j=1}^{n}\log x_j,&\mathbf{x}>0,\\\infty,&\text{else},\end{cases}$ where $\lambda>0$. Then by Lemma 6.5 (g4),
> $$\mathrm{prox}_{g}(\mathbf{x})=\left(\frac{x_j+\sqrt{x_j^{2}+4\lambda}}{2}\right)_{j=1}^{n}.$$

逐分量套用 $g_4$ 的近端即可（注意定义域正部，故整个向量需 $\mathbf{x}>0$ 才有单点解）。

## Example 6.10 · $\ell_0$-范数 → 硬阈值

> **Example 6.10** (l0-norm). Let $f(\mathbf{x})=\lambda\|\mathbf{x}\|_{0}$, $\lambda>0$, where $\|\mathbf{x}\|_{0}=\#\{i:x_i\neq 0\}$. Then $f(\mathbf{x})=\sum_{i=1}^{n}I(x_i)$ with
> $$I(t)=\begin{cases}\lambda,&t\neq 0,\\ 0,&t=0.\end{cases}$$

**硬阈值的关键技巧**：注意 $I(\cdot)=J(\cdot)+\lambda$，其中 $J(t)=\begin{cases}0,&t\neq 0\\-\lambda,&t=0\end{cases}$。多加一个常数 $\lambda$ 不改 argmin，所以 $\mathrm{prox}_{I}=\mathrm{prox}_{J}$。而 $J$ 正是 Example 6.2 里 $g_2$ 的模样，故（用 §6.1 的符号）
$$\mathrm{prox}_{J}(s)=H_{\sqrt{2\lambda}}(s),\qquad H_{\alpha}(s)=\begin{cases}\{0\},&|s|<\alpha,\\\{s\},&|s|>\alpha,\\\{0,s\},&|s|=\alpha.\end{cases}$$
于是
$$\mathrm{prox}_{g}(\mathbf{x})=H_{\sqrt{2\lambda}}(x_1)\times\cdots\times H_{\sqrt{2\lambda}}(x_n).$$

**为什么重要**：$\ell_0$ 不是凸的，所以近端可能多点（$|x_i|=\sqrt{2\lambda}$ 时返回 $\{0,x_i\}$）——这就是“硬阈值”和软阈值的本质区别，也是 §6.8.3 投影到稀疏集的伏笔。

## Theorem 6.11 · 缩放与平移

> **Theorem 6.11** (scaling and translation). Let $g:\mathbb{E}\to(-\infty,\infty]$ be proper, $\lambda\neq 0$, $\mathbf{a}\in\mathbb{E}$. Define $f(\mathbf{x})=g(\lambda\mathbf{x}+\mathbf{a})$. Then
> $$\mathrm{prox}_{f}(\mathbf{x})=\frac{1}{\lambda}\Big(\mathrm{prox}_{\lambda^{2}g}(\lambda\mathbf{x}+\mathbf{a})-\mathbf{a}\Big).\tag{6.6}$$

### 证明：自己走一遍
$$\begin{aligned}
\mathrm{prox}_f(\mathbf{x})
&=\operatorname{argmin}_{\mathbf{u}}\left\{g(\lambda\mathbf{u}+\mathbf{a})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right\}.\end{aligned}$$
换元 $\mathbf{z}=\lambda\mathbf{u}+\mathbf{a}$（即 $\mathbf{u}=(\mathbf{z}-\mathbf{a})/\lambda$）：
$$\begin{aligned}
\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}
&=\frac{1}{2}\left\|\frac{\mathbf{z}-\mathbf{a}}{\lambda}-\mathbf{x}\right\|^{2}
=\frac{1}{2\lambda^{2}}\|\mathbf{z}-(\lambda\mathbf{x}+\mathbf{a})\|^{2}
=\frac{1}{\lambda^{2}}\left(\lambda^{2}g(\mathbf{z})+\frac{1}{2}\|\mathbf{z}-(\lambda\mathbf{x}+\mathbf{a})\|^{2}\right)-\frac{1}{\lambda^{2}}\lambda^{2}g(\mathbf{z})... \end{aligned}$$
更干净地写成：目标 $\propto \lambda^{2}g(\mathbf{z})+\frac{1}{2}\|\mathbf{z}-(\lambda\mathbf{x}+\mathbf{a})\|^{2}$。其极小点是 $\mathbf{z}^{*}=\mathrm{prox}_{\lambda^{2}g}(\lambda\mathbf{x}+\mathbf{a})$，代回 $\mathbf{u}=(\mathbf{z}^{*}-\mathbf{a})/\lambda$ 即得 (6.6)。$\blacksquare$

**一个值得记住的细节**：缩放参数 $\lambda$ 在换元时平方成 $\lambda^{2}$ 跑进 prox 的下标——这是范数齐次性的体现。

## Theorem 6.12 · $\lambda g(\mathbf{x}/\lambda)$ 的近端

> **Theorem 6.12** (prox of $\lambda g(\cdot/\lambda)$). Let $g$ be proper, $\lambda\neq 0$. Define $f(\mathbf{x})=\lambda g(\mathbf{x}/\lambda)$. Then
> $$\mathrm{prox}_{f}(\mathbf{x})=\lambda\,\mathrm{prox}_{g/\lambda}(\mathbf{x}/\lambda).$$

### 证明
$$\begin{aligned}
\mathrm{prox}_f(\mathbf{x})
&=\operatorname{argmin}_{\mathbf{u}}\left\{\lambda g(\mathbf{u}/\lambda)+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right\}.\end{aligned}$$
换元 $\mathbf{z}=\mathbf{u}/\lambda$（$\mathbf{u}=\lambda\mathbf{z}$），则 $\frac{1}{2}\|\lambda\mathbf{z}-\mathbf{x}\|^{2}=\lambda^{2}\left(\frac{1}{\lambda}g(\mathbf{z})+\frac{1}{2}\|\mathbf{z}-\mathbf{x}/\lambda\|^{2}\right)$，极小点 $\mathbf{z}^{*}=\mathrm{prox}_{g/\lambda}(\mathbf{x}/\lambda)$，故 $\mathbf{u}^{*}=\lambda\mathbf{z}^{*}$。$\blacksquare$

## Theorem 6.13 · 二次扰动（最常用变形之一）

> **Theorem 6.13** (quadratic perturbation). Let $g$ be proper, and let $f(\mathbf{x})=g(\mathbf{x})+\frac{c}{2}\|\mathbf{x}\|^{2}+\langle\mathbf{a},\mathbf{x}\rangle+\gamma$, where $c>0$, $\mathbf{a}\in\mathbb{E}$, $\gamma\in\mathbb{R}$. Then
> $$\mathrm{prox}_{f}(\mathbf{x})=\mathrm{prox}_{\frac{1}{c+1}g}\!\left(\frac{\mathbf{x}-\mathbf{a}}{c+1}\right).$$

### 证明：自己走一遍（配方）
目标里关于 $\mathbf{u}$ 的部分：
$$\frac{c}{2}\|\mathbf{u}\|^{2}+\langle\mathbf{a},\mathbf{u}\rangle+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}
=\frac{c+1}{2}\left\|\mathbf{u}-\frac{\mathbf{x}-\mathbf{a}}{c+1}\right\|^{2}+\text{(与 $\mathbf{u}$ 无关的常数项)}.$$
于是最小化 $\Leftrightarrow$ 最小化 $\frac{1}{c+1}g(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\frac{\mathbf{x}-\mathbf{a}}{c+1}\|^{2}$，即 $\mathrm{prox}_{\frac{1}{c+1}g}\big((\mathbf{x}-\mathbf{a})/(c+1)\big)$。$\blacksquare$

**为什么重要**：这条把“函数 + 二次项”的近端还原成“原函数缩放后的近端”。§6.2.2 仿射是 $c=0$ 的退化（但那里 $c$ 不要求 $>0$，注意书里 Thm 6.13 要求 $c>0$，而 Example 6.14 用 $c=0$ 的 affine 情形）。

## Example 6.14 · 截断仿射

> **Example 6.14.** $f(x)=\begin{cases}\mu x,&0\le x\le\alpha,\\\infty,&\text{else},\end{cases}$ where $\mu\in\mathbb{R}$, $\alpha\in[0,\infty]$. Write $f=\delta_{[0,\alpha]}+\mu x$. By Lemma 6.5, $\mathrm{prox}_{\delta_{[0,\alpha]}}(x)=\min\{\max\{x,0\},\alpha\}$. Thus with Thm 6.13 ($c=0,a=\mu,\gamma=0$),
> $$\mathrm{prox}_{f}(x)=\min\{\max\{x-\mu,0\},\alpha\}.$$

## Theorem 6.15 · 复合仿射映射（需正交条件）

> **Theorem 6.15** (composition with an affine mapping). Let $g:\mathbb{R}^{m}\to(-\infty,\infty]$ be proper closed convex, $f(\mathbf{x})=g(\mathcal{A}(\mathbf{x})+\mathbf{b})$, where $\mathbf{b}\in\mathbb{R}^{m}$ and $\mathcal{A}:\mathbb{V}\to\mathbb{R}^{m}$ satisfies $\mathcal{A}\circ\mathcal{A}^{T}=\alpha\mathbf{I}$ for some $\alpha>0$. Then for any $\mathbf{x}\in\mathbb{V}$,
> $$\mathrm{prox}_{f}(\mathbf{x})=\mathbf{x}+\frac{1}{\alpha}\mathcal{A}^{T}\big(\mathrm{prox}_{\alpha g}(\mathcal{A}(\mathbf{x})+\mathbf{b})-\mathcal{A}(\mathbf{x})-\mathbf{b}\big).$$

**为什么这条受限**：书里明说“Unfortunately, there is no useful calculus rule for computing the prox of a composition with a general affine mapping.”——一般情况没有简洁公式；只有 $\mathcal{A}\mathcal{A}^{T}=\alpha\mathbf{I}$（即 $\mathcal{A}$ 是“缩放正交”的，例如 $\mathcal{A}$ 行正交或 $\mathcal{A}\mathbf{x}=\sum x_i$）才有封闭解。

### 证明：自己走一遍（KKT + 强对偶）
原问题 $\min_{\mathbf{u}}\{g(\mathcal{A}\mathbf{u}+\mathbf{b})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\}$ 写成约束形式
$$\min_{\mathbf{u},\mathbf{z}}\left\{g(\mathbf{z})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\ :\ \mathbf{z}=\mathcal{A}\mathbf{u}+\mathbf{b}\right\}.$$
记最优解 $(\tilde{\mathbf{z}},\tilde{\mathbf{u}})$。固定 $\mathbf{z}=\tilde{\mathbf{z}}$，则 $\tilde{\mathbf{u}}$ 是 $\min_{\mathbf{u}}\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\ \text{s.t.}\ \mathcal{A}\mathbf{u}=\tilde{\mathbf{z}}-\mathbf{b}$ 的解。由强对偶（Thm A.1）+ KKT（Thm A.2）存在 $\mathbf{y}$ 使
$$\tilde{\mathbf{u}}\in\operatorname{argmin}_{\mathbf{u}}\left\{\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}+\langle\mathbf{y},\mathcal{A}\mathbf{u}-\tilde{\mathbf{z}}+\mathbf{b}\rangle\right\}.$$
令梯度为零：$\tilde{\mathbf{u}}=\mathbf{x}-\mathcal{A}^{T}(\mathbf{y})$。代入约束 $\mathcal{A}\tilde{\mathbf{u}}=\tilde{\mathbf{z}}-\mathbf{b}$ 得 $\mathcal{A}(\mathbf{x}-\mathcal{A}^{T}\mathbf{y})=\tilde{\mathbf{z}}-\mathbf{b}$，即 $\alpha\mathbf{y}=\mathcal{A}(\mathbf{x})+\mathbf{b}-\tilde{\mathbf{z}}$（用了 $\mathcal{A}\mathcal{A}^{T}=\alpha\mathbf{I}$）。于是
$$\tilde{\mathbf{u}}=\mathbf{x}+\frac{1}{\alpha}\mathcal{A}^{T}(\tilde{\mathbf{z}}-\mathcal{A}(\mathbf{x})-\mathbf{b}).$$
再求 $\tilde{\mathbf{z}}$：代回原问题，对 $\mathbf{z}$ 最小化 $g(\mathbf{z})+\frac{1}{2\alpha^{2}}\|\mathcal{A}^{T}(\mathbf{z}-\mathcal{A}\mathbf{x}-\mathbf{b})\|^{2}$，用 $\mathcal{A}\mathcal{A}^{T}=\alpha\mathbf{I}$ 把 $\|\mathcal{A}^{T}(\cdot)\|^{2}$ 化成 $\alpha\|\cdot\|^{2}$（因 $\|\mathcal{A}^{T}\mathbf{w}\|^{2}=\mathbf{w}^{T}\mathcal{A}\mathcal{A}^{T}\mathbf{w}=\alpha\|\mathbf{w}\|^{2}$），得到 $\alpha g(\mathbf{z})+\frac{1}{2}\|\mathbf{z}-\mathcal{A}\mathbf{x}-\mathbf{b}\|^{2}$，其极小点正是 $\tilde{\mathbf{z}}=\mathrm{prox}_{\alpha g}(\mathcal{A}\mathbf{x}+\mathbf{b})$。代入即证。$\blacksquare$

## Example 6.16 · 和函数的近端

> **Example 6.16.** $f(x_1,\ldots,x_m)=g(x_1+\cdots+x_m)$. Take $\mathcal{A}(\mathbf{x})=\sum_i x_i$. Then $\mathcal{A}^{T}(x)=(x,\ldots,x)$ and $\mathcal{A}\mathcal{A}^{T}=m$, so $\alpha=m$, $\mathbf{b}=0$. Hence
> $$\mathrm{prox}_{f}(x_1,\ldots,x_m)_j=x_j+\frac{1}{m}\left(\mathrm{prox}_{mg}\!\left(\sum_{i=1}^{m}x_i\right)-\sum_{i=1}^{m}x_i\right).$$

**为什么重要**：这是“共识/平均”结构的近端——分布式优化里 $f(\mathbf{x})=g(\frac{1}{m}\sum x_i)$ 的同款套路，所有分量被拉向“整体均值经 $\mathrm{prox}_{mg}$ 处理”的方向。

## Example 6.17 · $|a^T x|$ 的近端

> **Example 6.17.** $f(\mathbf{x})=|a^{T}\mathbf{x}|$, write $f(\mathbf{x})=g(a^{T}\mathbf{x})$ with $g(t)=|t|$. By Lemma 6.5, $\mathrm{prox}_{\lambda g}=T_{\lambda}$. Invoking Thm 6.15 with $\alpha=\|a\|^{2}$, $\mathbf{b}=0$, $\mathcal{A}:\mathbf{x}\mapsto a^{T}\mathbf{x}$:
> $$\mathrm{prox}_{f}(\mathbf{x})=\mathbf{x}+\frac{1}{\|a\|^{2}}\big(T_{\|a\|^{2}}(a^{T}\mathbf{x})-a^{T}\mathbf{x}\big)\mathbf{a}.$$

## Theorem 6.18 · 范数复合 $f(\mathbf{x})=g(\|\mathbf{x}\|)$

> **Theorem 6.18** (norm composition). Let $f(\mathbf{x})=g(\|\mathbf{x}\|)$ where $g:\mathbb{R}\to(-\infty,\infty]$ is proper closed convex with $\mathrm{dom}(g)\subseteq[0,\infty)$. Then
> $$\mathrm{prox}_{f}(\mathbf{x})=\begin{cases}\mathrm{prox}_{g}(\|\mathbf{x}\|)\dfrac{\mathbf{x}}{\|\mathbf{x}\|},&\mathbf{x}\neq 0,\\[1.2ex]\{\mathbf{u}\in\mathbb{E}:\|\mathbf{u}\|=\mathrm{prox}_{g}(0)\},&\mathbf{x}=0.\end{cases}\tag{6.16}$$

### 证明：自己走一遍（球坐标降维）
对 $\mathbf{x}\neq 0$，把问题按半径 $\alpha=\|\mathbf{u}\|$ 和方向上的条件极小化拆开：
$$\min_{\mathbf{u}}\left\{g(\|\mathbf{u}\|)+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right\}
=\min_{\alpha\ge 0}\min_{\|\mathbf{u}\|=\alpha}\left\{g(\alpha)+\frac{1}{2}\alpha^{2}-\langle\mathbf{u},\mathbf{x}\rangle+\frac{1}{2}\|\mathbf{x}\|^{2}\right\}.$$
内层：固定 $\alpha$，由 Cauchy–Schwarz，$-\langle\mathbf{u},\mathbf{x}\rangle$ 在 $\mathbf{u}=\alpha\frac{\mathbf{x}}{\|\mathbf{x}\|}$ 处最小，最小值为 $-\alpha\|\mathbf{x}\|$。于是外层目标变成 $g(\alpha)+\frac{1}{2}(\alpha-\|\mathbf{x}\|)^{2}$，其极小点 $\alpha^{*}=\mathrm{prox}_{g}(\|\mathbf{x}\|)$。故 $\mathbf{u}^{*}=\alpha^{*}\frac{\mathbf{x}}{\|\mathbf{x}\|}$。
对 $\mathbf{x}=0$：问题退化为 $\min_{\mathbf{u}}\{g(\|\mathbf{u}\|)+\frac{1}{2}\|\mathbf{u}\|^{2}\}$，令 $w=\|\mathbf{u}\|$ 得 $\min_{w\ge 0}\{g(w)+\frac{1}{2}w^{2}\}$，最优半径 $\mathrm{prox}_g(0)$，方向任意。$\blacksquare$

**为什么重要**：这条把“任意范数 $g(\|\mathbf{x}\|)$”的近端降成一维 $g$ 的近端再乘方向——§6.4.1 投影、§6.6.1 支撑函数都靠它反复调用。

## Example 6.19 · 欧氏范数的近端（软阈值向量版）

> **Example 6.19** (prox of Euclidean norm). $f(\mathbf{x})=\lambda\|\mathbf{x}\|$, $\lambda>0$. Then $f(\mathbf{x})=g(\|\mathbf{x}\|)$ with $g(t)=\begin{cases}\lambda t,&t\ge 0,\\\infty,&t<0.\end{cases}$ By Lemma 6.5, $\mathrm{prox}_{g}(t)=[t-\lambda]_{+}$. Thus
> $$\mathrm{prox}_{\lambda\|\cdot\|}(\mathbf{x})=\begin{cases}\dfrac{[\|\mathbf{x}\|-\lambda]_{+}}{\|\mathbf{x}\|}\mathbf{x},&\mathbf{x}\neq 0,\\ 0,&\mathbf{x}=0.\end{cases}$$

紧凑写法（把 $\mathbf{x}=0$ 也包进去）：
$$\boxed{\mathrm{prox}_{\lambda\|\cdot\|}(\mathbf{x})=\left(1-\frac{\lambda}{\max\{\|\mathbf{x}\|,\lambda\}}\right)\mathbf{x}.}$$

**几何直觉**：这是“把向量朝原点收缩，但至少缩到零就不反方向推”——当 $\|\mathbf{x}\|\le\lambda$ 时整体归零（被范数惩罚吃光），否则按比例 $\frac{\|\mathbf{x}\|-\lambda}{\|\mathbf{x}\|}$ 收缩。这就是**向量软阈值**。

## Example 6.20 · 三次欧氏范数

> **Example 6.20.** $f(\mathbf{x})=\lambda\|\mathbf{x}\|^{3}$. By Thm 6.18 with $g(t)=t^{3}$ ($t\ge 0$), $\mathrm{prox}_{g}(t)=\frac{-1+\sqrt{1+12\lambda[t]_{+}}}{6\lambda}$. Hence
> $$\mathrm{prox}_{\lambda\|\cdot\|^{3}}(\mathbf{x})=\begin{cases}\dfrac{-1+\sqrt{1+12\lambda\|\mathbf{x}\|}}{6\lambda}\dfrac{\mathbf{x}}{\|\mathbf{x}\|},&\mathbf{x}\neq 0,\\ 0,&\mathbf{x}=0,\end{cases}$$
> which compactly equals $\displaystyle \mathrm{prox}_{\lambda\|\cdot\|^{3}}(\mathbf{x})=\frac{2}{1+\sqrt{1+12\lambda\|\mathbf{x}\|}}\mathbf{x}$.

（验证紧凑式：分母有理化 $\frac{-1+\sqrt{1+12r}}{6\lambda}\cdot\frac{1}{\sqrt r}$ 与 $\frac{2}{1+\sqrt{1+12r}}$ 在 $r=\|\mathbf{x}\|$ 处相等——交叉相乘即 $2\cdot 6\lambda\sqrt r=(-1+\sqrt{1+12r})(1+\sqrt{1+12r})=12r$，成立。）

## Example 6.21 · 负欧氏范数（非凸）

> **Example 6.21.** $f(\mathbf{x})=-\lambda\|\mathbf{x}\|$, $\lambda>0$ (not convex). By Thm 6.4 the prox set is nonempty. With $g(t)=-\lambda t$ ($t\ge 0$), $\mathrm{prox}_{g}(t)=[t+\lambda]_{+}$. Thus
> $$\mathrm{prox}_{-\lambda\|\cdot\|}(\mathbf{x})=\begin{cases}\left(1+\frac{\lambda}{\|\mathbf{x}\|}\right)\mathbf{x},&\mathbf{x}\neq 0,\\ \{\mathbf{u}:\|\mathbf{u}\|=\lambda\},&\mathbf{x}=0.\end{cases}$$

**为什么重要**：非凸时近端不是单值——$\mathbf{x}=0$ 时返回整个球面 $\{\mathbf{u}:\|\mathbf{u}\|=\lambda\}$。这是 Thm 6.3 失效的反例（函数不凸）。

## Example 6.22 · 对称区间上的绝对值

> **Example 6.22.** $f(x)=\begin{cases}\lambda|x|,&|x|\le\alpha,\\\infty,&\text{else}.\end{cases}$ Write $f(x)=g(|x|)$ with $g(x)=\begin{cases}\lambda x,&0\le x\le\alpha,\\\infty,&\text{else}.\end{cases}$ By Example 6.14, $\mathrm{prox}_{g}(x)=\min\{\max\{x-\lambda,0\},\alpha\}$. Combined with Thm 6.18:
> $$\mathrm{prox}_{\lambda|\cdot|+\delta_{[-\alpha,\alpha]}}(x)=\min\{\max\{|x|-\lambda,0\},\alpha\}\operatorname{sgn}(x).$$

## Example 6.23 · 盒上的加权 $\ell_1$

> **Example 6.23** (prox of weighted l1 over a box). $f(\mathbf{x})=\begin{cases}\sum_i\omega_i|x_i|,&-\boldsymbol{\alpha}\le\mathbf{x}\le\boldsymbol{\alpha},\\\infty,&\text{else},\end{cases}$ with $\boldsymbol{\omega}\in\mathbb{R}_{+}^{n}$, $\boldsymbol{\alpha}\in[0,\infty]^{n}$. By Example 6.22 + Thm 6.6:
> $$\mathrm{prox}_{f}(\mathbf{x})=\big(\min\{\max\{|x_i|-\omega_i,0\},\alpha_i\}\operatorname{sgn}(x_i)\big)_{i=1}^{n}.$$

### 近端微积分规则汇总表

| $f(\mathbf{x})$ | $\mathrm{prox}_{f}(\mathbf{x})$ | 假设 | 来源 |
|---|---|---|---|
| $\sum_i f_i(x_i)$ | $\prod_i \mathrm{prox}_{f_i}(x_i)$ | 分离 | Thm 6.6 |
| $g(\lambda\mathbf{x}+\mathbf{a})$ | $\frac{1}{\lambda}(\mathrm{prox}_{\lambda^{2}g}(\lambda\mathbf{x}+\mathbf{a})-\mathbf{a})$ | $\lambda\neq 0$ | Thm 6.11 |
| $\lambda g(\mathbf{x}/\lambda)$ | $\lambda\,\mathrm{prox}_{g/\lambda}(\mathbf{x}/\lambda)$ | $\lambda\neq 0$ | Thm 6.12 |
| $g+\frac{c}{2}\|\cdot\|^{2}+\langle\mathbf{a},\cdot\rangle+\gamma$ | $\mathrm{prox}_{\frac{1}{c+1}g}\!\big(\frac{\mathbf{x}-\mathbf{a}}{c+1}\big)$ | $c>0$ | Thm 6.13 |
| $g(\mathcal{A}\mathbf{x}+\mathbf{b})$ | $\mathbf{x}+\frac{1}{\alpha}\mathcal{A}^{T}(\mathrm{prox}_{\alpha g}(\mathcal{A}\mathbf{x}+\mathbf{b})-\mathcal{A}\mathbf{x}-\mathbf{b})$ | $\mathcal{A}\mathcal{A}^{T}=\alpha\mathbf{I}$ | Thm 6.15 |
| $g(\|\mathbf{x}\|)$ | $\mathrm{prox}_{g}(\|\mathbf{x}\|)\frac{\mathbf{x}}{\|\mathbf{x}\|}$ ($\mathbf{x}\neq 0$) | $\mathrm{dom}(g)\subseteq[0,\infty)$ | Thm 6.18 |

---

# 6.4 Prox of Indicators—Orthogonal Projections

这一节把指示器函数的近端和**正交投影**画等号，瞬间把全书前几章的投影公式全收编成近端公式库。

## §6.4.1 The First Projection Theorem

> **Theorem 6.24.** Let $C\subseteq\mathbb{E}$ be nonempty. Then $\mathrm{prox}_{\delta_C}(\mathbf{x})=P_C(\mathbf{x})$ for any $\mathbf{x}\in\mathbb{E}$.

因为 $\delta_C(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}$ 在 $\mathbf{u}\notin C$ 时是 $\infty$，在 $\mathbf{u}\in C$ 时是 $\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}$，所以
$$\mathrm{prox}_{\delta_C}(\mathbf{x})=\operatorname{argmin}_{\mathbf{u}\in C}\|\mathbf{u}-\mathbf{x}\|^{2}=P_C(\mathbf{x}).$$

> **Theorem 6.25** (first projection theorem). Let $C\subseteq\mathbb{E}$ be a nonempty closed convex set. Then $P_C(\mathbf{x})$ is a singleton for any $\mathbf{x}\in\mathbb{E}$.

**为什么重要**：这是 Thm 6.3 的特例（$\delta_C$ 在 $C$ 闭凸时 PCC）。它告诉我们“到闭凸集的正交投影唯一存在”——这是 projection 方法的数学基石，后面 §6.4.2–§6.4.5 全是它的应用。

## §6.4.2 Lemma 6.26 · $\mathbb{R}^n$ 上几类集合的投影

> **Lemma 6.26** (projection onto subsets of $\mathbb{R}^{n}$). Following are pairs of nonempty closed and convex sets and their orthogonal projections:
> $$\begin{aligned}
> C_1&=\mathbb{R}_{+}^{n},&P_{C_1}(\mathbf{x})&=[\mathbf{x}]_{+},\\
> C_2&=\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}],&P_{C_2}(\mathbf{x})_i&=\min\{\max\{x_i,\ell_i\},u_i\},\\
> C_3&=\{\mathbf{x}:\mathbf{A}\mathbf{x}=\mathbf{b}\},&P_{C_3}(\mathbf{x})&=\mathbf{x}-\mathbf{A}^{T}(\mathbf{A}\mathbf{A}^{T})^{-1}(\mathbf{A}\mathbf{x}-\mathbf{b}),\\
> C_4&=B_{\|\cdot\|_{2}}[\mathbf{c},r],&P_{C_4}(\mathbf{x})&=\mathbf{c}+\frac{r}{\max\{\|\mathbf{x}-\mathbf{c}\|_{2},r\}}(\mathbf{x}-\mathbf{c}),\\
> C_5&=\{\mathbf{x}:a^{T}\mathbf{x}\le\alpha\},&P_{C_5}(\mathbf{x})&=\mathbf{x}-\frac{[a^{T}\mathbf{x}-\alpha]_{+}}{\|a\|^{2}}\mathbf{a}.
> \end{aligned}$$

（$\mathbf{A}$ 行满秩，$\mathbf{c}\in\mathbb{R}^{n}$, $r>0$, $a\neq 0$。）

**逐字点评**：这些公式都是经典结论。$C_4$ 的写法把“球内不变、球外径向缩到球面”用 $\max\{\|\mathbf{x}-\mathbf{c}\|,r\}$ 一行包掉（和 Example 6.19 同款套路）。$C_5$ 半空间投影就是“超出边界的部分沿法向 $a$ 推回”——后面 Example 6.32 会用到。书里把 box 定义扩展到允许 $\ell_i=-\infty,u_i=\infty$（如 $\mathrm{Box}[0,\infty\mathbf{e}]=\mathbb{R}_{+}^{n}$）。

## §6.4.3 Theorem 6.27 · 超平面 ∩ 盒的投影

> **Theorem 6.27** (projection onto the intersection of a hyperplane and a box). Let $C=H_{\mathbf{a},b}\cap\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}]=\{\mathbf{x}:a^{T}\mathbf{x}=b,\ \boldsymbol{\ell}\le\mathbf{x}\le\mathbf{u}\}$, $\mathbf{a}\neq 0$. Assume $C\neq\emptyset$. Then
> $$P_C(\mathbf{x})=P_{\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}]}(\mathbf{x}-\mu^{*}\mathbf{a}),$$
> where $\mu^{*}$ is a solution of $a^{T}P_{\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}]}(\mathbf{x}-\mu\mathbf{a})=b$.

### 证明：自己走一遍（Lagrangian + KKT）
投影问题是 $\min_{\mathbf{y}}\frac{1}{2}\|\mathbf{y}-\mathbf{x}\|^{2}\ \text{s.t.}\ a^{T}\mathbf{y}=b,\ \boldsymbol{\ell}\le\mathbf{y}\le\mathbf{u}$。Lagrangian
$$L(\mathbf{y};\mu)=\frac{1}{2}\|\mathbf{y}-\mathbf{x}\|^{2}+\mu(a^{T}\mathbf{y}-b)=\frac{1}{2}\|\mathbf{y}-(\mathbf{x}-\mu\mathbf{a})\|^{2}-\frac{\mu^{2}}{2}\|a\|^{2}+\mu(a^{T}\mathbf{x}-b).$$
强对偶成立（Thm A.1），由 KKT（Thm A.2）最优 $\mathbf{y}^{*}$ 满足 $\mathbf{y}^{*}\in\operatorname{argmin}_{\boldsymbol{\ell}\le\mathbf{y}\le\mathbf{u}}L(\mathbf{y};\mu^{*})$，即 $\mathbf{y}^{*}=P_{\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}]}(\mathbf{x}-\mu^{*}\mathbf{a})$；可行性 $a^{T}\mathbf{y}^{*}=b$ 给出等式 $a^{T}P_{\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}]}(\mathbf{x}-\mu^{*}\mathbf{a})=b$。$\blacksquare$

> **Remark 6.28.** The function $\phi(\mu)=a^{T}P_{\mathrm{Box}}(\mathbf{x}-\mu\mathbf{a})-b$ is nonincreasing in $\mu$, so its root can be found efficiently (e.g. by bisection).

## Corollary 6.29 · 单位单纯形的投影

> **Corollary 6.29** (orthogonal projection onto the unit simplex). For any $\mathbf{x}\in\mathbb{R}^{n}$,
> $$P_{\Delta_n}(\mathbf{x})=[\mathbf{x}-\mu^{*}\mathbf{e}]_{+},$$
> where $\mu^{*}$ is a root of $e^{T}[\mathbf{x}-\mu^{*}\mathbf{e}]_{+}-1=0$.

**为什么重要**：套 Thm 6.27 取 $a=e,b=1,\ell_i=0,u_i=\infty$（此时 $P_{\mathrm{Box}}=[\cdot]_{+}$）。单纯形投影是 softmax/概率归一化的近端核心，投影到单纯形常被当作“稀疏 + 单纯形约束”的解算器。

## §6.4.4 Theorem 6.30 · 水平集上的投影

> **Theorem 6.30** (orthogonal projection onto level sets). Let $C=\mathrm{Lev}(f,\alpha)=\{\mathbf{x}:f(\mathbf{x})\le\alpha\}$, $f$ proper closed convex, and assume $\exists\hat{\mathbf{x}}$ with $f(\hat{\mathbf{x}})<\alpha$. Then
> $$P_C(\mathbf{x})=\begin{cases}P_{\mathrm{dom}(f)}(\mathbf{x}),&f(P_{\mathrm{dom}(f)}(\mathbf{x}))\le\alpha,\\ \mathrm{prox}_{\lambda^{*}f}(\mathbf{x}),&\text{else},\end{cases}\tag{6.24}$$
> where $\lambda^{*}$ is any positive root of $\phi(\lambda)\equiv f(\mathrm{prox}_{\lambda f}(\mathbf{x}))-\alpha=0$. In addition, $\phi$ is nonincreasing.

**为什么重要**：这是把“水平集投影”翻译成“某个 $\lambda$ 的近端”——$P_{\mathrm{Lev}(f,\alpha)}$ 等于在边界处取 $\mathrm{prox}_{\lambda^{*}f}$。后面 Example 6.33（$\ell_1$ 球）、6.34、6.35 全靠它。

### 证明：自己走一遍
问题 $\min_{\mathbf{y}}\frac{1}{2}\|\mathbf{y}-\mathbf{x}\|^{2}\ \text{s.t.}\ f(\mathbf{y})\le\alpha,\ \mathbf{y}\in X=\mathrm{dom}(f)$。Lagrangian $L(\mathbf{y};\lambda)=\frac{1}{2}\|\mathbf{y}-\mathbf{x}\|^{2}+\lambda(f(\mathbf{y})-\alpha)$，$\lambda\ge 0$。Slater 条件满足（有 $\hat{\mathbf{x}}$ 使严格可行），强对偶成立。KKT：最优 $\mathbf{y}^{*}$ 满足
$$\mathbf{y}^{*}\in\operatorname{argmin}_{\mathbf{y}\in X}L(\mathbf{y};\lambda^{*}),\quad f(\mathbf{y}^{*})\le\alpha,\quad \lambda^{*}(f(\mathbf{y}^{*})-\alpha)=0.$$
- 若 $P_X(\mathbf{x})$ 存在且 $f(P_X(\mathbf{x}))\le\alpha$：取 $\lambda^{*}=0$ 即满足（此时 $\mathbf{y}^{*}=P_X(\mathbf{x})$）。
- 否则 $\lambda^{*}>0$，互补松弛逼出 $f(\mathbf{y}^{*})=\alpha$，且 $\mathbf{y}^{*}=\mathrm{prox}_{\lambda^{*}f}(\mathbf{x})$。得 (6.24)。

**$\phi$ 单调不增的证明**：取 $0\le\lambda_1<\lambda_2$，记 $v_i=\mathrm{prox}_{\lambda_i f}(\mathbf{x})$。用 $\lambda_2$ 的最优性对比 $\lambda_1$ 的目标，再反过来用 $\lambda_1$ 的最优性对比 $\lambda_2$，两式相加可得 $(\lambda_2-\lambda_1)(f(v_2)-f(v_1))\le 0$，因 $\lambda_2>\lambda_1$ 得 $f(v_2)\le f(v_1)$，即 $\phi(\lambda_2)\le\phi(\lambda_1)$。$\blacksquare$

> **Remark 6.31.** In Thm 6.30 $f$ is closed but $\mathrm{dom}(f)$ need not be closed; if $P_{\mathrm{dom}(f)}(\mathbf{x})$ does not exist, formula (6.24) reduces to $P_C(\mathbf{x})=\mathrm{prox}_{\lambda^{*}f}(\mathbf{x})$.

## Example 6.32 · 半空间 ∩ 盒

> **Example 6.32.** $C=H^{-}_{\mathbf{a},b}\cap\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}]=\{\mathbf{x}:a^{T}\mathbf{x}\le b,\ \boldsymbol{\ell}\le\mathbf{x}\le\mathbf{u}\}$. Write $C=\mathrm{Lev}(f,b)$ with $f(\mathbf{x})=a^{T}\mathbf{x}+\delta_{\mathrm{Box}}(\mathbf{x})$. For any $\lambda>0$, $\mathrm{prox}_{\lambda f}(\mathbf{x})=\mathrm{prox}_{\delta_{\mathrm{Box}}}(\mathbf{x}-\lambda\mathbf{a})=P_{\mathrm{Box}}(\mathbf{x}-\lambda\mathbf{a})$ (using Thm 6.13). Thus
> $$P_C(\mathbf{x})=\begin{cases}P_{\mathrm{Box}}(\mathbf{x}),&a^{T}P_{\mathrm{Box}}(\mathbf{x})\le b,\\ P_{\mathrm{Box}}(\mathbf{x}-\lambda^{*}\mathbf{a}),&a^{T}P_{\mathrm{Box}}(\mathbf{x})>b,\end{cases}$$
> where $\lambda^{*}$ roots $\phi(\lambda)=a^{T}P_{\mathrm{Box}}(\mathbf{x}-\lambda\mathbf{a})-b$.

## Example 6.33 · $\ell_1$ 球的投影（对比软阈值）

> **Example 6.33** (projection onto the l1 ball). $C=B_{\|\cdot\|_{1}}[0,\alpha]=\{\|\mathbf{x}\|_{1}\le\alpha\}$, $\alpha>0$. $C=\mathrm{Lev}(f,\alpha)$ with $f=\|\cdot\|_{1}$. By Example 6.8, $\mathrm{prox}_{\lambda f}=T_{\lambda}$. Thus
> $$P_{B_{\|\cdot\|_{1}}[0,\alpha]}(\mathbf{x})=\begin{cases}\mathbf{x},&\|\mathbf{x}\|_{1}\le\alpha,\\ T_{\lambda^{*}}(\mathbf{x}),&\|\mathbf{x}\|_{1}>\alpha,\end{cases}$$
> where $\lambda^{*}$ roots $\phi(\lambda)=\|T_{\lambda}(\mathbf{x})\|_{1}-\alpha$.

**为什么重要**：投影到 $\ell_1$ 球 = “软阈值到某个 $\lambda^{*}$ 使 $\ell_1$ 范数刚好等于 $\alpha$”。这是 Duchi 的 SLEP / 投影梯度法的经典结果。

紧接着书引入**双边软阈值**算子：
$$S_{\mathbf{a},\mathbf{b}}(\mathbf{x})=\big(\min\{\max\{|x_i|-a_i,0\},b_i\}\operatorname{sgn}(x_i)\big)_{i=1}^{n},$$
显然 $S_{\lambda\mathbf{e},\infty\mathbf{e}}=T_{\lambda}$。*See Figure 6.3 for the plot of $t\mapsto S_{1,2}(t)$.*

## Example 6.34 · 加权 $\ell_1$ 球 ∩ 盒

> **Example 6.34.** $C=\{\boldsymbol{\omega}^{T}|\mathbf{x}|\le\beta,\ -\boldsymbol{\alpha}\le\mathbf{x}\le\boldsymbol{\alpha}\}$. Then $C=\mathrm{Lev}(f,\beta)$ with $f(\mathbf{x})=\boldsymbol{\omega}^{T}|\mathbf{x}|+\delta_{\mathrm{Box}[-\boldsymbol{\alpha},\boldsymbol{\alpha}]}(\mathbf{x})$. By Example 6.23, $\mathrm{prox}_{\lambda f}=S_{\lambda\boldsymbol{\omega},\boldsymbol{\alpha}}$. Hence
> $$P_C(\mathbf{x})=\begin{cases}P_{\mathrm{Box}[-\boldsymbol{\alpha},\boldsymbol{\alpha}]}(\mathbf{x}),&\boldsymbol{\omega}^{T}|P_{\mathrm{Box}}(\mathbf{x})|\le\beta,\\ S_{\lambda^{*}\boldsymbol{\omega},\boldsymbol{\alpha}}(\mathbf{x}),&\text{else},\end{cases}$$
> where $\lambda^{*}$ roots $\phi(\lambda)=\boldsymbol{\omega}^{T}|S_{\lambda\boldsymbol{\omega},\boldsymbol{\alpha}}(\mathbf{x})|-\beta$.

## Example 6.35 · 负对数和的水平集（定义域不闭）

> **Example 6.35.** $C=\{\mathbf{x}\in\mathbb{R}_{++}^{n}:\prod_i x_i\ge\alpha\}$, $\alpha>0$. Rewrite as $C=\mathrm{Lev}(f,-\log\alpha)$ with $f(\mathbf{x})=-\sum_i\log x_i$ ($\mathbf{x}>0$). By Example 6.9, $\mathrm{prox}_{\lambda f}(\mathbf{x})=\big(\frac{x_j+\sqrt{x_j^{2}+4\lambda}}{2}\big)_{j=1}^{n}$. Since $\mathrm{dom}(f)$ is not closed, for $\mathbf{x}\notin\mathbb{R}_{++}^{n}$ only the second branch applies: $P_C(\mathbf{x})=\mathrm{prox}_{\lambda^{*}f}(\mathbf{x})$; for $\mathbf{x}\in C$, $P_C(\mathbf{x})=\mathbf{x}$.

## §6.4.5 Theorem 6.36 · 上境图上的投影

> **Theorem 6.36** (orthogonal projection onto epigraphs). Let $C=\mathrm{epi}(g)=\{(\mathbf{x},t):g(\mathbf{x})\le t\}$, $g:\mathbb{E}\to\mathbb{R}$ convex. Then
> $$P_C((\mathbf{x},s))=\begin{cases}(\mathbf{x},s),&g(\mathbf{x})\le s,\\ (\mathrm{prox}_{\lambda^{*}g}(\mathbf{x}),\,s+\lambda^{*}),&g(\mathbf{x})>s,\end{cases}$$
> where $\lambda^{*}$ is any positive root of $\psi(\lambda)=g(\mathrm{prox}_{\lambda g}(\mathbf{x}))-\lambda-s$. In addition, $\psi$ is nonincreasing.

### 证明：自己走一遍
定义 $f(\mathbf{x},t)=g(\mathbf{x})-t$。则 $\mathrm{epi}(g)=\mathrm{Lev}(f,0)$，可直接套 Thm 6.30。先算 $\mathrm{prox}_{\lambda f}(\mathbf{x},s)$：目标在 $\mathbf{y},t$ 上分离，
$$\min_{\mathbf{y},t}\left\{\frac{1}{2}\|\mathbf{y}-\mathbf{x}\|^{2}+\frac{1}{2}(t-s)^{2}+\lambda(g(\mathbf{y})-t)\right\}=\big(\mathrm{prox}_{\lambda g}(\mathbf{x}),\ \mathrm{prox}_{\lambda h}(s)\big),$$
其中 $h(t)=-t$。由 §6.2.2（线性函数近端），$\mathrm{prox}_{\lambda h}(z)=z+\lambda$。故 $\mathrm{prox}_{\lambda f}(\mathbf{x},s)=(\mathrm{prox}_{\lambda g}(\mathbf{x}),s+\lambda)$。代入 Thm 6.30（$\mathrm{dom}(f)=\mathbb{E}$）得证。$\blacksquare$

## Example 6.37 · Lorentz 锥的投影

> **Example 6.37** (projection onto the Lorentz cone). $L_n=\{(\mathbf{x},t):\|\mathbf{x}\|_{2}\le t\}$. Invoking Thm 6.36 with $g=\|\cdot\|_{2}$ and Example 6.19:
> $$P_{L_n}(\mathbf{x},s)=\begin{cases}\left(\dfrac{\|\mathbf{x}\|_{2}+s}{2\|\mathbf{x}\|_{2}}\mathbf{x},\ \dfrac{\|\mathbf{x}\|_{2}+s}{2}\right),&\|\mathbf{x}\|_{2}\ge|s|,\\ (0,0),&s<\|\mathbf{x}\|_{2}<-s,\\ (\mathbf{x},s),&\|\mathbf{x}\|_{2}\le s.\end{cases}$$

**逐字点评**：Lorentz 锥（二阶锥）投影在 SOCP、锥规划里是基本件。书的推导通过把 $\psi(\lambda)=\|\mathrm{prox}_{\lambda\|\cdot\|_2}(\mathbf{x})\|_{2}-\lambda-s$ 分两段解出 $\lambda^{*}$，再代回得到上面的显式三段式。

## Example 6.38 · $\ell_1$-范数上境图的投影

> **Example 6.38.** $C=\{(\mathbf{y},t):\|\mathbf{y}\|_{1}\le t\}$. By Thm 6.36 + Example 6.8 ($\mathrm{prox}_{\lambda\|\cdot\|_{1}}=T_{\lambda}$):
> $$P_C((\mathbf{x},s))=\begin{cases}(\mathbf{x},s),&\|\mathbf{x}\|_{1}\le s,\\ (T_{\lambda^{*}}(\mathbf{x}),\,s+\lambda^{*}),&\|\mathbf{x}\|_{1}>s,\end{cases}$$
> where $\lambda^{*}$ roots $\phi(\lambda)=\|T_{\lambda}(\mathbf{x})\|_{1}-\lambda-s$.

## §6.4.6 Table 6.1 · 正交投影公式总表

| 集合 $C$ | $P_C(\mathbf{x})$ | 来源 |
|---|---|---|
| $\mathbb{R}_{+}^{n}$ | $[\mathbf{x}]_{+}$ | Lemma 6.26 |
| $\mathrm{Box}[\boldsymbol{\ell},\mathbf{u}]$ | $(\min\{\max\{x_i,\ell_i\},u_i\})$ | Lemma 6.26 |
| $B_{\|\cdot\|_{2}}[\mathbf{c},r]$ | $\mathbf{c}+\frac{r}{\max\{\|\mathbf{x}-\mathbf{c}\|,r\}}(\mathbf{x}-\mathbf{c})$ | Lemma 6.26 |
| $\{\mathbf{A}\mathbf{x}=\mathbf{b}\}$ | $\mathbf{x}-\mathbf{A}^{T}(\mathbf{A}\mathbf{A}^{T})^{-1}(\mathbf{A}\mathbf{x}-\mathbf{b})$ | Lemma 6.26 |
| $\{a^{T}\mathbf{x}\le b\}$ | $\mathbf{x}-\frac{[a^{T}\mathbf{x}-b]_{+}}{\|a\|^{2}}a$ | Lemma 6.26 |
| $\Delta_n$ | $[\mathbf{x}-\mu^{*}\mathbf{e}]_{+}$, $e^{T}[\mathbf{x}-\mu^{*}\mathbf{e}]_{+}=1$ | Cor 6.29 |
| $H_{\mathbf{a},b}\cap\mathrm{Box}$ | $P_{\mathrm{Box}}(\mathbf{x}-\mu^{*}\mathbf{a})$, $a^{T}P_{\mathrm{Box}}(\mathbf{x}-\mu^{*}\mathbf{a})=b$ | Thm 6.27 |
| $B_{\|\cdot\|_{1}}[0,\alpha]$ | $\mathbf{x}$ if $\|\mathbf{x}\|_{1}\le\alpha$ else $T_{\lambda^{*}}(\mathbf{x})$ | Ex 6.33 |
| $\{(\mathbf{x},t):\|\mathbf{x}\|_{2}\le t\}$ | 三段式 (见 Ex 6.37) | Ex 6.37 |
| $\{(\mathbf{x},t):\|\mathbf{x}\|_{1}\le t\}$ | $(\mathbf{x},s)$ or $(T_{\lambda^{*}}(\mathbf{x}),s+\lambda^{*})$ | Ex 6.38 |

---

# 6.5 The Second Prox Theorem

用 Fermat 最优性条件（Thm 3.63）把近端算子和**次梯度**焊在一起。

## Theorem 6.39 · 第二近端定理（核心恒等式）

> **Theorem 6.39** (second prox theorem). Let $f:\mathbb{E}\to(-\infty,\infty]$ be proper closed and convex. Then for any $\mathbf{x},\mathbf{u}\in\mathbb{E}$, the following are equivalent:
> (i) $\mathbf{u}=\mathrm{prox}_{f}(\mathbf{x})$;
> (ii) $\mathbf{x}-\mathbf{u}\in\partial f(\mathbf{u})$;
> (iii) $\langle\mathbf{x}-\mathbf{u},\mathbf{y}-\mathbf{u}\rangle\le f(\mathbf{y})-f(\mathbf{u})$ for any $\mathbf{y}\in\mathbb{E}$.

### 证明：自己走一遍
(i) $\Leftrightarrow$ (ii)：$\mathbf{u}=\mathrm{prox}_f(\mathbf{x})$ 等价于 $\mathbf{u}$ 最小化 $f(\mathbf{v})+\frac{1}{2}\|\mathbf{v}-\mathbf{x}\|^{2}$。由 Fermat 条件（Thm 3.63）+ 次微分和法则（Thm 3.40）：
$$0\in\partial\left(f(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right)=\partial f(\mathbf{u})+\mathbf{u}-\mathbf{x},$$
即 $\mathbf{x}-\mathbf{u}\in\partial f(\mathbf{u})$。
(ii) $\Leftrightarrow$ (iii)：由次梯度定义，$\mathbf{x}-\mathbf{u}\in\partial f(\mathbf{u})$ 等价于对所有 $\mathbf{y}$ 有 $f(\mathbf{y})\ge f(\mathbf{u})+\langle\mathbf{x}-\mathbf{u},\mathbf{y}-\mathbf{u}\rangle$。$\blacksquare$

**为什么这一行最关键**：(ii) 是整章最重要的一个等价式——它说“近端就是次梯度包含 $\mathbf{x}-\mathbf{u}\in\partial f(\mathbf{u})$ 的解”。后面 Moreau 分解、firm nonexpansivity、距离函数近端全部从它出发。

## Corollary 6.40 · 不动点 = 极小点

> **Corollary 6.40.** Let $f$ be proper closed convex. Then $\mathbf{x}$ is a minimizer of $f$ iff $\mathbf{x}=\mathrm{prox}_{f}(\mathbf{x})$.

**证明**：$\mathbf{x}$ 极小 $\Leftrightarrow 0\in\partial f(\mathbf{x})\Leftrightarrow \mathbf{x}-\mathbf{x}\in\partial f(\mathbf{x})\Leftrightarrow \mathbf{x}=\mathrm{prox}_f(\mathbf{x})$（用 Thm 6.39 的 (i)$\Leftrightarrow$(ii)）。$\blacksquare$

**为什么重要**：这把“求 $f$ 的极小点”转化成“求 proximal 算子的不动点”——这正是 proximal point algorithm（Martinet/Rockafellar）的理论依据。

## Theorem 6.41 · 第二投影定理

> **Theorem 6.41** (second projection theorem). Let $C\subseteq\mathbb{E}$ be nonempty closed convex, $\mathbf{u}\in C$. Then $\mathbf{u}=P_C(\mathbf{x})$ iff $\langle\mathbf{x}-\mathbf{u},\mathbf{y}-\mathbf{u}\rangle\le 0$ for any $\mathbf{y}\in C$.

这是 Thm 6.39 (i)$\Leftrightarrow$(iii) 在 $f=\delta_C$ 时的特例（因 $\delta_C(\mathbf{u})=0$ 且当 $\mathbf{y}\in C$ 时 $\delta_C(\mathbf{y})=0$）。**几何意义**：投影点的“误差向量” $\mathbf{x}-\mathbf{u}$ 与集合内任一方向都成钝角——这就是“正交”二字的来历。

## Theorem 6.42 · 近端的固有无扩张性

> **Theorem 6.42** (firm nonexpansivity of the prox operator). Let $f$ be proper closed convex. Then for any $\mathbf{x},\mathbf{y}\in\mathbb{E}$:
> (a) (firm nonexpansivity) $\langle\mathbf{x}-\mathbf{y},\ \mathrm{prox}_{f}(\mathbf{x})-\mathrm{prox}_{f}(\mathbf{y})\rangle\ge\|\mathrm{prox}_{f}(\mathbf{x})-\mathrm{prox}_{f}(\mathbf{y})\|^{2}$;
> (b) (nonexpansivity) $\|\mathrm{prox}_{f}(\mathbf{x})-\mathrm{prox}_{f}(\mathbf{y})\|\le\|\mathbf{x}-\mathbf{y}\|$.

### 证明：自己走一遍
记 $u=\mathrm{prox}_f(\mathbf{x})$, $v=\mathrm{prox}_f(\mathbf{y})$。由 Thm 6.39 (ii)：$\mathbf{x}-u\in\partial f(u)$, $\mathbf{y}-v\in\partial f(v)$。由次梯度不等式：
$$f(v)\ge f(u)+\langle\mathbf{x}-u,v-u\rangle,\qquad f(u)\ge f(v)+\langle\mathbf{y}-v,u-v\rangle.$$
两式相加：$0\ge\langle\mathbf{y}-\mathbf{x}+u-v,u-v\rangle$，即 $\langle\mathbf{x}-\mathbf{y},u-v\rangle\ge\|u-v\|^{2}$，即 (a)。
(b)：若 $u=v$ 显然；否则用 (a) + Cauchy–Schwarz：
$$\|u-v\|^{2}\le\langle\mathbf{x}-\mathbf{y},u-v\rangle\le\|\mathbf{x}-\mathbf{y}\|\cdot\|u-v\|,$$
两边除以 $\|u-v\|$ 得 $\|u-v\|\le\|\mathbf{x}-\mathbf{y}\|$。$\blacksquare$

**为什么重要**：firm nonexpansivity 比 nonexpansivity 更强，它是 FISTA、 Douglas–Rachford 等算法收敛性证明的“发动机”——后面 Ch 7/10 的加速方法都吃这个性质。

## Lemma 6.43 · 距离函数的近端

> **Lemma 6.43** (prox of the distance function). Let $C$ be nonempty closed convex, $\lambda>0$. Then for any $\mathbf{x}\in\mathbb{E}$,
> $$\mathrm{prox}_{\lambda d_C}(\mathbf{x})=\begin{cases}(1-\theta)\mathbf{x}+\theta P_C(\mathbf{x}),&d_C(\mathbf{x})>\lambda,\\ P_C(\mathbf{x}),&d_C(\mathbf{x})\le\lambda,\end{cases}\tag{6.32}$$
> where $\theta=\dfrac{\lambda}{d_C(\mathbf{x})}$.

**为什么重要**：这是“把点朝投影点线性插值”的公式——当 $\mathbf{x}$ 离集合够远（$d_C(\mathbf{x})>\lambda$），近端是 $\mathbf{x}$ 与 $P_C(\mathbf{x})$ 之间比例为 $\theta$ 的内分点；够近时直接落到投影点。

### 证明：自己走一遍（用第二近端定理）
令 $u=\mathrm{prox}_{\lambda d_C}(\mathbf{x})$。由 Thm 6.39：$\mathbf{x}-u\in\lambda\partial d_C(u)$。
**Case I: $u\notin C$**。由 Example 3.49（距离函数次梯度），$\partial d_C(u)=\frac{u-P_C(u)}{d_C(u)}$，故 $\mathbf{x}-u=\lambda\frac{u-P_C(u)}{d_C(u)}$。记 $\alpha=\lambda/d_C(u)$，得 $u=\frac{1}{\alpha+1}\mathbf{x}+\frac{\alpha}{\alpha+1}P_C(u)$，即 $\mathbf{x}-P_C(u)=(\alpha+1)(u-P_C(u))$。用第二投影定理（Thm 6.41）可证 $P_C(u)=P_C(\mathbf{x})$（验证 $\langle\mathbf{x}-P_C(u),\mathbf{y}-P_C(u)\rangle\le 0$ 对所有 $\mathbf{y}\in C$ 成立）。于是 $d_C(\mathbf{x})=(\alpha+1)d_C(u)=d_C(u)+\lambda$，推出 $1/(\alpha+1)=1-\theta$，得 $u=(1-\theta)\mathbf{x}+\theta P_C(\mathbf{x})$。
**Case II: $u\in C$**。则对所有 $\mathbf{v}\in C$ 有 $\lambda d_C(u)+\frac{1}{2}\|u-\mathbf{x}\|^{2}\le\lambda d_C(\mathbf{v})+\frac{1}{2}\|\mathbf{v}-\mathbf{x}\|^{2}$；因 $d_C(u)=d_C(\mathbf{v})=0$ 得 $\|u-\mathbf{x}\|\le\|\mathbf{v}-\mathbf{x}\|$，即 $u=P_C(\mathbf{x})$。此时由最优性还有 $\frac{\mathbf{x}-P_C(\mathbf{x})}{\lambda}\in N_C(u)\cap B[0,1]$，推出 $d_C(\mathbf{x})\le\lambda$。两段合起来即 (6.32)。$\blacksquare$

---

# 6.6 Moreau Decomposition

把近端算子与**共轭**联姻，得到本章最优雅的恒等式。

## Theorem 6.44 · Moreau 分解

> **Theorem 6.44** (Moreau decomposition). Let $f:\mathbb{E}\to(-\infty,\infty]$ be proper closed convex. Then for any $\mathbf{x}\in\mathbb{E}$,
> $$\mathrm{prox}_{f}(\mathbf{x})+\mathrm{prox}_{f^{*}}(\mathbf{x})=\mathbf{x}.$$

### 证明：自己走一遍
记 $u=\mathrm{prox}_f(\mathbf{x})$。由 Thm 6.39 (ii)：$\mathbf{x}-u\in\partial f(u)$。由**共轭次梯度定理（Thm 4.20）**，这等价于 $u\in\partial f^{*}(\mathbf{x}-u)$。再用一次 Thm 6.39（这次对 $f^{*}$，把 $\mathbf{x}$ 看作输入、$\mathbf{x}-u$ 看作输出）：得 $\mathbf{x}-u=\mathrm{prox}_{f^{*}}(\mathbf{x})$。于是 $\mathrm{prox}_f(\mathbf{x})+\mathrm{prox}_{f^{*}}(\mathbf{x})=u+(\mathbf{x}-u)=\mathbf{x}$。$\blacksquare$

**为什么这一行最关键**：它把 $\mathrm{prox}_f$ 和 $\mathrm{prox}_{f^{*}}$ 互补成恒等——算出一个就等于算出另一个。后面支撑函数近端（Thm 6.46）就是直接套它。

## Theorem 6.45 · 扩展 Moreau 分解

> **Theorem 6.45** (extended Moreau decomposition). Let $f$ be proper closed convex, $\lambda>0$. Then for any $\mathbf{x}\in\mathbb{E}$,
> $$\mathrm{prox}_{\lambda f}(\mathbf{x})+\lambda\,\mathrm{prox}_{\lambda^{-1}f^{*}}(\mathbf{x}/\lambda)=\mathbf{x}.\tag{6.39}$$

### 证明
由 Thm 6.44：$\mathrm{prox}_{\lambda f}(\mathbf{x})=\mathbf{x}-\mathrm{prox}_{(\lambda f)^{*}}(\mathbf{x})$。再由 **Thm 4.14(a)**（共轭的缩放）：$(\lambda f)^{*}(\mathbf{y})=\lambda f^{*}(\mathbf{y}/\lambda)$，故 $\mathrm{prox}_{(\lambda f)^{*}}(\mathbf{x})=\mathrm{prox}_{\lambda f^{*}(\cdot/\lambda)}(\mathbf{x})$。套 **Thm 6.12**（$f$ 取 $\lambda f^{*}(\cdot/\lambda)$ 的形式）：$\mathrm{prox}_{\lambda f^{*}(\cdot/\lambda)}(\mathbf{x})=\lambda\,\mathrm{prox}_{\lambda^{-1}f^{*}}(\mathbf{x}/\lambda)$。代回得 (6.39)。$\blacksquare$

## §6.6.1 Support Functions · 支撑函数的近端

> **Theorem 6.46** (prox of support functions). Let $C\subseteq\mathbb{E}$ be nonempty closed convex, $\lambda>0$. Then for any $\mathbf{x}\in\mathbb{E}$,
> $$\mathrm{prox}_{\lambda\sigma_C}(\mathbf{x})=\mathbf{x}-\lambda P_C(\mathbf{x}/\lambda).\tag{6.41}$$

**证明**：直接套扩展 Moreau 分解 (6.39) + **Example 4.9**（支撑函数的共轭是示性函数：$(\sigma_C)^{*}=\delta_C$）。于是 $\mathrm{prox}_{\lambda\sigma_C}(\mathbf{x})=\mathbf{x}-\lambda\,\mathrm{prox}_{\delta_C}(\mathbf{x}/\lambda)=\mathbf{x}-\lambda P_C(\mathbf{x}/\lambda)$（用 Thm 6.24）。$\blacksquare$

**为什么重要**：支撑函数的近端 = “原向量减去它在某集合上的投影的 $\lambda$ 倍”——这是把投影算子当积木去造更复杂近端的范例。

## Example 6.47 · 任意范数的近端

> **Example 6.47** (prox of norms). $f(\mathbf{x})=\lambda\|\mathbf{x}\|_{\alpha}$, $\lambda>0$, $\|\cdot\|_{\alpha}$ any norm. By Example 2.31, $\|\mathbf{x}\|_{\alpha}=\sigma_C(\mathbf{x})$ with $C=B_{\|\cdot\|_{\alpha,*}}[0,1]$. Invoking Thm 6.46:
> $$\mathrm{prox}_{\lambda\|\cdot\|_{\alpha}}(\mathbf{x})=\mathbf{x}-\lambda P_{B_{\|\cdot\|_{\alpha,*}}[0,1]}(\mathbf{x}/\lambda).$$

**一个值得记住的细节**：这里 $\|\cdot\|_{\alpha}$ 不必是欧氏范数（只是 underlying space 的 endow norm 是欧氏的）。任意范数的近端被化到它对偶范数单位球的投影——Example 6.19 是 $\alpha=2$ 的特例（单位球投影即欧氏投影，最终回到软阈值）。

## Example 6.48 · $\ell_{\infty}$ 范数的近端

> **Example 6.48.** By Example 6.47, $\mathrm{prox}_{\lambda\|\cdot\|_{\infty}}(\mathbf{x})=\mathbf{x}-\lambda P_{B_{\|\cdot\|_{1}}[0,1]}(\mathbf{x}/\lambda)$. The projection onto the $\ell_1$ unit ball is by Example 6.33.

## Example 6.49 · max 函数的近端

> **Example 6.49** (prox of the max function). $g(\mathbf{x})=\max(\mathbf{x})\equiv\max\{x_1,\ldots,x_n\}=\sigma_{\Delta_n}(\mathbf{x})$. Thus $\mathrm{prox}_{\lambda\max(\cdot)}(\mathbf{x})=\mathbf{x}-\lambda P_{\Delta_n}(\mathbf{x}/\lambda)$ (by Thm 6.46 + Cor 6.29).

## Example 6.50 · 前 $k$ 大之和的近端

> **Example 6.50.** $f(\mathbf{x})=x_{[1]}+\cdots+x_{[k]}$ ($x_{[i]}$ 第 $i$ 大). Then $f=\sigma_C$ with $C=\{\mathbf{y}:e^{T}\mathbf{y}=k,\ 0\le\mathbf{y}\le e\}$. Hence $\mathrm{prox}_{\lambda f}(\mathbf{x})=\mathbf{x}-\lambda P_C(\mathbf{x}/\lambda)$.

## Example 6.51 · 前 $k$ 大绝对值之和的近端

> **Example 6.51.** $f(\mathbf{x})=\sum_{i=1}^{k}|x_{\langle i\rangle}|$ ($|x_{\langle i\rangle}|$ 第 $i$ 大绝对值). Then $f=\sigma_C$ with $C=\{\mathbf{z}:\|\mathbf{z}\|_{1}\le k,\ -e\le\mathbf{z}\le e\}$. Hence $\mathrm{prox}_{\lambda f}(\mathbf{x})=\mathbf{x}-\lambda P_C(\mathbf{x}/\lambda)$ (projection by Example 6.34).

---

# 6.7 The Moreau Envelope

## §6.7.1 Definition and Basic Properties

> **Definition 6.52** (Moreau envelope). Given proper closed convex $f:\mathbb{E}\to(-\infty,\infty]$ and $\mu>0$, the Moreau envelope of $f$ is
> $$M^{\mu}_{f}(\mathbf{x})=\min_{\mathbf{u}\in\mathbb{E}}\left\{f(\mathbf{u})+\frac{1}{2\mu}\|\mathbf{x}-\mathbf{u}\|^{2}\right\}.\tag{6.42}$$
> The parameter $\mu$ is called the smoothing parameter.

**为什么重要**：与近端只差一个 $1/\mu$ 系数，且由 Thm 6.3 最小化有唯一解 $\mathrm{prox}_{\mu f}(\mathbf{x})$，故
$$M^{\mu}_{f}(\mathbf{x})=f(\mathrm{prox}_{\mu f}(\mathbf{x}))+\frac{1}{2\mu}\|\mathbf{x}-\mathrm{prox}_{\mu f}(\mathbf{x})\|^{2}.$$

## Example 6.53 · 指示器函数的 Moreau 包络 = 距离平方

> **Example 6.53** (Moreau envelope of indicators). $f=\delta_C$, $C$ nonempty closed convex. By Thm 6.24, $\mathrm{prox}_{\mu f}=P_C$. Thus
> $$M^{\mu}_{\delta_C}(\mathbf{x})=\frac{1}{2\mu}d_C^{2}(\mathbf{x}).$$

**为什么重要**：这把“到集合距离的平方”解释为指示器的 Moreau 包络——后面 Example 6.61/6.65 会反复用它。

## Example 6.54 · Huber 函数

> **Example 6.54** (Huber function). $f(\mathbf{x})=\|\mathbf{x}\|$. By Example 6.19, $\mathrm{prox}_{\mu f}(\mathbf{x})=\big(1-\frac{\mu}{\max\{\|\mathbf{x}\|,\mu\}}\big)\mathbf{x}$. Therefore
> $$M^{\mu}_{\|\cdot\|}(\mathbf{x})=\begin{cases}\dfrac{1}{2\mu}\|\mathbf{x}\|^{2},&\|\mathbf{x}\|\le\mu,\\ \|\mathbf{x}\|-\dfrac{\mu}{2},&\|\mathbf{x}\|>\mu,\end{cases}=H_{\mu}(\mathbf{x}).$$

即欧氏范数的 Moreau 包络是 **Huber 函数** $H_{\mu}$。*See Figure 6.4 for the plots of $H_{0.1},H_1,H_4$ — the function becomes smoother as $\mu$ increases.*

## Theorem 6.55 · 包络 = 下卷积，且凸实值

> **Theorem 6.55.** Let $f$ proper closed convex, $\omega_{\mu}(\mathbf{x})=\frac{1}{2\mu}\|\mathbf{x}\|^{2}$. Then
> (a) $M^{\mu}_{f}=f\square\omega_{\mu}$ (infimal convolution);
> (b) $M^{\mu}_{f}:\mathbb{E}\to\mathbb{R}$ is real-valued and convex.

**证明**：(a) 直接由定义，$M^{\mu}_f(\mathbf{x})=\inf_{\mathbf{u}}\{f(\mathbf{u})+\omega_{\mu}(\mathbf{x}-\mathbf{u})\}=(f\square\omega_{\mu})(\mathbf{x})$。(b) 由 **Thm 2.19**（下卷积保凸，在 $f,\omega_{\mu}$ proper closed convex 时），得凸；实值性来自 Thm 6.3 保证极小点取到且有限。$\blacksquare$

## Corollary 6.56 · 包络的共轭

> **Corollary 6.56.** $(M^{\mu}_{f})^{*}=f^{*}+\omega_{1/\mu}$.

**证明**：由 (a) + **Thm 4.16**（下卷积的共轭 = 共轭之和）：$(f\square\omega_{\mu})^{*}=f^{*}+\omega_{\mu}^{*}$。而 $\omega_{\mu}^{*}(\mathbf{y})=\omega_{1/\mu}(\mathbf{y})$（由 Thm 4.14 缩放）。$\blacksquare$

## Lemma 6.57 · 包络的齐次性

> **Lemma 6.57.** Let $\lambda,\mu>0$. Then $\lambda M^{\mu}_{f}(\mathbf{x})=M^{\mu/\lambda}_{\lambda f}(\mathbf{x})$.

**证明**：$\lambda\min_{\mathbf{u}}\{f(\mathbf{u})+\frac{1}{2\mu}\|\mathbf{u}-\mathbf{x}\|^{2}\}=\min_{\mathbf{u}}\{\lambda f(\mathbf{u})+\frac{1}{2(\mu/\lambda)}\|\mathbf{u}-\mathbf{x}\|^{2}\}$。$\blacksquare$

## Theorem 6.58 · 分离函数的包络 = 包络之和

> **Theorem 6.58** (Moreau envelope of separable functions). If $f(\mathbf{x}_1,\ldots,\mathbf{x}_m)=\sum_i f_i(x_i)$, then $M^{\mu}_{f}(\mathbf{x}_1,\ldots,\mathbf{x}_m)=\sum_i M^{\mu}_{f_i}(x_i)$.

**证明**：目标与范数平方都按分量分离，联合极小 = 各分量极小之和。$\blacksquare$

## Example 6.59 · $\ell_1$ 的 Moreau 包络

> **Example 6.59.** $f(\mathbf{x})=\|\mathbf{x}\|_{1}=\sum_i|x_i|$. By Example 6.54 ($M^{\mu}_{|\cdot|}=H_{\mu}$) + Thm 6.58: $M^{\mu}_{\|\cdot\|_{1}}(\mathbf{x})=\sum_{i=1}^{n}H_{\mu}(x_i)$.

## §6.7.2 Differentiability of the Moreau Envelope

> **Theorem 6.60** (smoothness of the Moreau envelope). Let $f$ proper closed convex, $\mu>0$. Then $M^{\mu}_{f}$ is $\frac{1}{\mu}$-smooth over $\mathbb{E}$, and
> $$\nabla M^{\mu}_{f}(\mathbf{x})=\frac{1}{\mu}\big(\mathbf{x}-\mathrm{prox}_{\mu f}(\mathbf{x})\big).$$

**为什么这一行最关键**：Moreau 包络是 $f$ 的**光滑化**——哪怕 $f$ 非光滑（如 $\|\cdot\|_1$、$\delta_C$），它的包络却 $\frac{1}{\mu}$-光滑，且梯度恰好是“原向量减去其近端”再除 $\mu$。这正是 Nesterov 光滑化技巧的理论内核。

### 证明：自己走一遍
由 Thm 6.55(a)，$M^{\mu}_f=f\square\omega_{\mu}$ 其中 $\omega_{\mu}=\frac{1}{2\mu}\|\cdot\|^{2}$。套 **Thm 5.30**（下卷积的光滑性，取 $\omega=\omega_{\mu}$, $L=1/\mu$）：因 $\omega_{\mu}$ 是 $1/\mu$-smooth，故 $M^{\mu}_f$ 是 $1/\mu$-smooth。且 Thm 5.30 给出梯度 $\nabla M^{\mu}_f(\mathbf{x})=\nabla\omega_{\mu}(\mathbf{x}-u(\mathbf{x}))$，其中 $u(\mathbf{x})=\mathrm{prox}_{\mu f}(\mathbf{x})$。于是 $\nabla M^{\mu}_f(\mathbf{x})=\frac{1}{\mu}(\mathbf{x}-\mathrm{prox}_{\mu f}(\mathbf{x}))$。$\blacksquare$

## Example 6.61 · $\frac{1}{2}d_C^{2}$ 的梯度

> **Example 6.61** (1-smoothness of $\frac{1}{2}d_C^{2}$). By Example 6.53, $\frac{1}{2}d_C^{2}=M^{1}_{\delta_C}$. By Thm 6.60, it is 1-smooth and $\nabla(\frac{1}{2}d_C^{2})(\mathbf{x})=\mathbf{x}-P_C(\mathbf{x})$.

## Example 6.62 · Huber 的光滑性

> **Example 6.62.** $H_{\mu}=M^{\mu}_{\|\cdot\|}$. By Thm 6.60, $H_{\mu}$ is $\frac{1}{\mu}$-smooth and
> $$\nabla H_{\mu}(\mathbf{x})=\frac{1}{\mu}\left(\mathbf{x}-\left(1-\frac{\mu}{\max\{\|\mathbf{x}\|,\mu\}}\right)\mathbf{x}\right)=\begin{cases}\frac{1}{\mu}\mathbf{x},&\|\mathbf{x}\|\le\mu,\\ \frac{\mathbf{x}}{\|\mathbf{x}\|},&\|\mathbf{x}\|>\mu.\end{cases}$$

## §6.7.3 Prox of the Moreau Envelope

> **Theorem 6.63** (prox of Moreau envelope). Let $f$ proper closed convex, $\mu>0$. Then for any $\mathbf{x}\in\mathbb{E}$,
> $$\mathrm{prox}_{M^{\mu}_{f}}(\mathbf{x})=\mathbf{x}+\frac{1}{\mu+1}\big(\mathrm{prox}_{(\mu+1)f}(\mathbf{x})-\mathbf{x}\big).$$

### 证明：自己走一遍
$$\min_{\mathbf{u}}\left\{M^{\mu}_{f}(\mathbf{u})+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right\}
=\min_{\mathbf{u}}\min_{\mathbf{y}}\left\{f(\mathbf{y})+\frac{1}{2\mu}\|\mathbf{u}-\mathbf{y}\|^{2}+\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}\right\}.$$
交换极小顺序，先对 $\mathbf{u}$ 极小：令梯度为零 $\frac{1}{\mu}(\mathbf{u}-\mathbf{y})+(\mathbf{u}-\mathbf{x})=0\Rightarrow \mathbf{u}=\frac{\mu\mathbf{x}+\mathbf{y}}{\mu+1}\equiv u_{\mu}$。代回得目标变成 $f(\mathbf{y})+\frac{1}{2(\mu+1)}\|\mathbf{x}-\mathbf{y}\|^{2}$。故外层 $\mathbf{y}^{*}=\mathrm{prox}_{(\mu+1)f}(\mathbf{x})$，最终 $\mathrm{prox}_{M^{\mu}_{f}}(\mathbf{x})=u_{\mu}=\frac{1}{\mu+1}(\mu\mathbf{x}+\mathrm{prox}_{(\mu+1)f}(\mathbf{x}))=\mathbf{x}+\frac{1}{\mu+1}(\mathrm{prox}_{(\mu+1)f}(\mathbf{x})-\mathbf{x})$。$\blacksquare$

## Corollary 6.64 · 缩放版

> **Corollary 6.64.** $\mathrm{prox}_{\lambda M^{\mu}_{f}}(\mathbf{x})=\mathbf{x}+\frac{\lambda}{\mu+\lambda}\big(\mathrm{prox}_{(\mu+\lambda)f}(\mathbf{x})-\mathbf{x}\big)$.

**证明**：用 Lemma 6.57 把 $\mathrm{prox}_{\lambda M^{\mu}_{f}}=\mathrm{prox}_{M^{\mu/\lambda}_{\lambda f}}$ 再套 Thm 6.63。$\blacksquare$

## Example 6.65 · $\frac{\lambda}{2}d_C^{2}$ 的近端

> **Example 6.65.** $f=\frac{1}{2}d_C^{2}=M^{1}_{\delta_C}$ (with $g=\delta_C$). By Cor 6.64:
> $$\mathrm{prox}_{\lambda f}(\mathbf{x})=\mathbf{x}+\frac{\lambda}{\lambda+1}(P_C(\mathbf{x})-\mathbf{x})=\frac{\lambda}{\lambda+1}P_C(\mathbf{x})+\frac{1}{\lambda+1}\mathbf{x}.$$

## Example 6.66 · Huber 的近端

> **Example 6.66.** $f=\lambda H_{\mu}$ with $H_{\mu}=M^{\mu}_{\|\cdot\|}$. By Cor 6.64 + Example 6.19:
> $$\mathrm{prox}_{\lambda H_{\mu}}(\mathbf{x})=\left(1-\frac{\lambda}{\max\{\|\mathbf{x}\|,\mu+\lambda\}}\right)\mathbf{x}.$$

## Theorem 6.67 · Moreau 包络分解

> **Theorem 6.67** (Moreau envelope decomposition). Let $f$ proper closed convex, $\mu>0$. Then for any $\mathbf{x}\in\mathbb{E}$,
> $$M^{\mu}_{f}(\mathbf{x})+M^{1/\mu}_{f^{*}}(\mathbf{x}/\mu)=\frac{1}{2\mu}\|\mathbf{x}\|^{2}.$$

**证明**：用 Fenchel 对偶（Thm 4.15）把 $M^{\mu}_f(\mathbf{x})=\min_u\{f(u)+\frac{1}{2\mu}\|u-\mathbf{x}\|^{2}\}$ 对偶成 $\max_v\{-f^{*}(v)-\psi^{*}(-v)\}$，其中 $\psi(\mathbf{u})=\frac{1}{2\mu}\|\mathbf{u}-\mathbf{x}\|^{2}$。由 Thm 4.14，$\psi^{*}(\mathbf{v})=\frac{\mu}{2}\|\mathbf{v}\|^{2}+\langle\mathbf{x},\mathbf{v}\rangle$。整理后得 $M^{\mu}_f(\mathbf{x})=\frac{1}{2\mu}\|\mathbf{x}\|^{2}-M^{1/\mu}_{f^{*}}(\mathbf{x}/\mu)$。$\blacksquare$

**为什么重要**：这是 Moreau 分解在“包络层面”的对应——函数与其共轭的包络互为补，合起来是纯二次型。和 Thm 6.44/6.45 形成二重奏。

---

# 6.8 Miscellaneous Prox Computations

## §6.8.1 Lemma 6.68 · 线性变换范数的近端

> **Lemma 6.68.** $f(\mathbf{x})=\|\mathbf{A}\mathbf{x}\|_{2}$, $\mathbf{A}\in\mathbb{R}^{m\times n}$ full row rank, $\lambda>0$. Then
> $$\mathrm{prox}_{\lambda f}(\mathbf{x})=\begin{cases}\mathbf{x}-\mathbf{A}^{T}(\mathbf{A}\mathbf{A}^{T})^{-1}\mathbf{A}\mathbf{x},&\|(\mathbf{A}\mathbf{A}^{T})^{-1}\mathbf{A}\mathbf{x}\|_{2}\le\lambda,\\ \mathbf{x}-\mathbf{A}^{T}(\mathbf{A}\mathbf{A}^{T}+\alpha^{*}\mathbf{I})^{-1}\mathbf{A}\mathbf{x},&\|(\mathbf{A}\mathbf{A}^{T})^{-1}\mathbf{A}\mathbf{x}\|_{2}>\lambda,\end{cases}$$
> where $\alpha^{*}$ is the unique positive root of $g(\alpha)=\|(\mathbf{A}\mathbf{A}^{T}+\alpha\mathbf{I})^{-1}\mathbf{A}\mathbf{x}\|_{2}^{2}-\lambda^{2}$.

**证明骨架**：原问题写成约束 $\min_{\mathbf{u},\mathbf{z}}\{\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}+\lambda\|\mathbf{z}\|_{2}:\mathbf{z}=\mathbf{A}\mathbf{u}\}$。Lagrangian 分离得对偶问题 $\max_{\|\mathbf{y}\|_{2}\le\lambda}\{-\frac{1}{2}\mathbf{y}^{T}\mathbf{A}\mathbf{A}^{T}\mathbf{y}-(\mathbf{A}\mathbf{x})^{T}\mathbf{y}\}$。强对偶下由 KKT 分两种情况：$\alpha^{*}=0$（对应第一段，直接投影到 $\mathbf{A}$ 的零空间方向）或 $\alpha^{*}>0$（对应第二段，由互补松弛 $\|\mathbf{y}\|_{2}=\lambda$ 解出 $\alpha^{*}$）。$\blacksquare$

## §6.8.2 Squared l1-Norm

> **Lemma 6.69** (variational representation of $\|\cdot\|_{1}^{2}$). For any $\mathbf{x}\in\mathbb{R}^{n}$,
> $$\min_{\boldsymbol{\lambda}\in\Delta_n}\sum_{j=1}^{n}\phi(x_j,\lambda_j)=\|\mathbf{x}\|_{1}^{2},$$
> where $\phi(s,t)=\begin{cases}s^{2}/t,&t>0,\\0,&s=t=0,\\\infty,&\text{else},\end{cases}$ and an optimal $\tilde{\lambda}_j=\frac{|x_j|}{\|\mathbf{x}\|_{1}}$ (or $1/n$ if $\mathbf{x}=0$).

**证明骨架**：在紧集 $\Delta_n$ 上最小化闭凸函数，由 Weierstrass（Thm 2.12）有最优解 $\boldsymbol{\lambda}^{*}$。用 Cauchy–Schwarz 证 $\sum\phi(x_j,\lambda_j^{*})\ge\|\mathbf{x}\|_{1}^{2}$；再用 $\tilde{\lambda}$ 代入证等号可达。$\blacksquare$

> **Lemma 6.70** (prox of $\|\cdot\|_{1}^{2}$). $f(\mathbf{x})=\|\mathbf{x}\|_{1}^{2}$, $\rho>0$. Then
> $$\mathrm{prox}_{\rho f}(\mathbf{x})=\begin{cases}\left(\dfrac{\lambda_i x_i}{\lambda_i+2\rho}\right)_{i=1}^{n},&\mathbf{x}\neq 0,\\ 0,&\mathbf{x}=0,\end{cases}$$
> where $\lambda_i=\big(\frac{\sqrt{\rho}|x_i|}{\sqrt{\mu^{*}}}-2\rho\big)_{+}$ and $\mu^{*}$ is any positive root of $\psi(\mu)=\sum_i\big(\frac{\sqrt{\rho}|x_i|}{\sqrt{\mu}}-2\rho\big)_{+}-1$.

**证明骨架**：用 Lemma 6.69 把 $\|\mathbf{u}\|_{1}^{2}$ 写成关于 $\boldsymbol{\lambda}\in\Delta_n$ 的变分形式，问题变成 $\min_{\mathbf{u},\boldsymbol{\lambda}}\{\frac{1}{2}\|\mathbf{u}-\mathbf{x}\|^{2}+\rho\sum\phi(u_i,\lambda_i)\}$。先对 $\mathbf{u}$ 极小得 $u_i=\frac{\lambda_i x_i}{\lambda_i+2\rho}$，再对 $\boldsymbol{\lambda}$ 用 Lagrange 乘子 $\mu$ 解出 $\lambda_i^{*}=(\frac{\sqrt{\rho}|x_i|}{\sqrt{\mu}}-2\rho)_{+}$，$\mu^{*}$ 由 $\sum\lambda_i^{*}=1$ 定。$\blacksquare$

**为什么重要**：平方 $\ell_1$ 的近端比 $\ell_1$ 复杂得多（需要解一个一维根），但仍在多项式时间内可算——这是组 Lasso、稀疏 PCA 的近端部品。

## §6.8.3 Lemma 6.71 · 投影到 $s$-稀疏集

> **Lemma 6.71** (projection onto $C_s$). Let $C_s=\{\mathbf{x}:\|\mathbf{x}\|_{0}\le s\}$. Then
> $$P_{C_s}(\mathbf{x})=\{U_S\mathbf{x}_S:\ |S|=s,\ \sum_{i\in S}|x_i|=\sum_{i=1}^{s}|x_{\langle i\rangle}|\}.$$

**为什么重要**：$C_s$ **非凸**（书里给 $n=2$ 的反例：$(0,1),(1,0)\in C_1$ 但中点不在），所以投影未必单点——可能有多个“取前 $s$ 大绝对值分量、其余置零”的选择。这正是 Example 6.10 硬阈值多点性的几何来源（§6.9 也会列出）。

### 证明：自己走一遍
$C_s=\bigcup_{|S|=s}A_S$，其中 $A_S=\{\mathbf{x}:\mathbf{x}_{S^{c}}=0\}$。投影必落在某个 $A_S$ 的投影里。对固定 $S$，$P_{A_S}(\mathbf{x})$ 是 $\min_{\mathbf{y}}\{\|\mathbf{y}-\mathbf{x}\|^{2}:\mathbf{y}_{S^{c}}=0\}$，显然 $\mathbf{y}_S=\mathbf{x}_S,\mathbf{y}_{S^{c}}=0$ 即 $U_S\mathbf{x}_S$，残差 $\|\mathbf{x}_{S^{c}}\|^{2}$。要全局最小，就选使 $\|\mathbf{x}_{S^{c}}\|^{2}$ 最小的 $S$——等价于选 $s$ 个绝对值最大的分量。$\blacksquare$

> **Example 6.72.** $P_{C_2}((2,3,-2,1)^{T})=\{(2,3,0,0)^{T},(0,3,-2,0)^{T}\}$ (two choices of the two largest-absolute-value components).

---

# 6.9 Summary of Prox Computations

书末给出一张巨型速查表，把全书近端公式（含 §6.2–§6.8）汇成一行行的 $(f,\mathrm{prox}_f,\text{假设},\text{来源})$。这里只挑几条最具代表性的列出，其余请回看正文对应小节：

| $f(\mathbf{x})$ | $\mathrm{prox}_{f}(\mathbf{x})$ | 来源 |
|---|---|---|
| $\frac{1}{2}\mathbf{x}^{T}\mathbf{A}\mathbf{x}+b^{T}\mathbf{x}+c$ | $(\mathbf{A}+\mathbf{I})^{-1}(\mathbf{x}-\mathbf{b})$ | §6.2.3 |
| $\lambda\|\mathbf{x}\|_{1}$ | $[|\mathbf{x}|-\lambda\mathbf{e}]_{+}\odot\operatorname{sgn}(\mathbf{x})$ | Ex 6.8 |
| $\lambda\|\mathbf{x}\|$ (欧氏) | $\big(1-\frac{\lambda}{\max\{\|\mathbf{x}\|,\lambda\}}\big)\mathbf{x}$ | Ex 6.19 |
| $-\lambda\|\mathbf{x}\|$ | $(1+\frac{\lambda}{\|\mathbf{x}\|})\mathbf{x}$ ($\mathbf{x}\neq 0$) | Ex 6.21 |
| $\lambda\|\mathbf{x}\|_{0}$ | $H_{\sqrt{2\lambda}}(x_1)\times\cdots\times H_{\sqrt{2\lambda}}(x_n)$ | Ex 6.10 |
| $\delta_C(\mathbf{x})$ | $P_C(\mathbf{x})$ | Thm 6.24 |
| $\lambda\sigma_C(\mathbf{x})$ | $\mathbf{x}-\lambda P_C(\mathbf{x}/\lambda)$ | Thm 6.46 |
| $\lambda\|\mathbf{x}\|_{\alpha}$ | $\mathbf{x}-\lambda P_{B_{\|\cdot\|_{\alpha,*}}[0,1]}(\mathbf{x}/\lambda)$ | Ex 6.47 |
| $\lambda d_C(\mathbf{x})$ | $\mathbf{x}+\min\{\frac{\lambda}{d_C(\mathbf{x})},1\}(P_C(\mathbf{x})-\mathbf{x})$ | Lem 6.43 |
| $\frac{\lambda}{2}d_C^{2}(\mathbf{x})$ | $\frac{\lambda}{\lambda+1}P_C(\mathbf{x})+\frac{1}{\lambda+1}\mathbf{x}$ | Ex 6.65 |
| $\rho\|\mathbf{x}\|_{1}^{2}$ | $(\frac{v_i x_i}{v_i+2\rho})$, $v=(\frac{\sqrt{\rho}|\mathbf{x}|}{\sqrt{\mu^{*}}}-2\rho)_{+}$, $e^{T}v=1$ | Lem 6.70 |
| $\lambda\|\mathbf{A}\mathbf{x}\|_{2}$ | $\mathbf{x}-\mathbf{A}^{T}(\mathbf{A}\mathbf{A}^{T}+\alpha^{*}\mathbf{I})^{-1}\mathbf{A}\mathbf{x}$ | Lem 6.68 |

---

## 收尾：这一章在整本书的位置

- **定义层**：Definition 6.1 把“近端”定义清楚；Example 6.2 演示了集合可能空/单/多三种状态。
- **存在唯一性**：Thm 6.3（PCC → 单点）与 Thm 6.4（闭+强制 → 非空）是地基。
- **计算工具箱**：§6.2 一维元件 + §6.3 微积分规则（分离、缩放、二次扰动、范数复合、仿射复合）。
- **投影即近端**：§6.4 把指示器函数的近端与正交投影等同，且把水平集/上境图投影翻译成某个 $\lambda$ 的近端（Thm 6.30/6.36）。
- **结构恒等式**：§6.5 第二近端定理（与次梯度等价）、§6.6 Moreau 分解（与共轭互补）、§6.7 Moreau 包络（光滑化）。
- **前向钩子**：下一章（Ch 7）会在近端算子上构建**近端梯度法 / 加速法（FISTA）**，而 firm nonexpansivity（Thm 6.42）与 Moreau 包络的光滑性（Thm 6.60）正是那些算法收敛性与加速的理论燃料；再往后 Ch 10 的 Douglas–Rachford / ADMM、Ch 13 的锥规划都会回头调用本节的距离函数近端（Lem 6.43）与支撑函数近端（Thm 6.46）。

可以毫不夸张地说：**Chapter 6 是整本《First-Order Methods in Optimization》从“凸分析”跨到“算法”的桥**。把这张速查表背熟，后面五章的阅读会顺畅一个数量级。
