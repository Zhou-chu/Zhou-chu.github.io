---
blog: true
title: "Chapter 7-Spectral Functions"
slug: "chapter-7-spectral-functions-31gqg57"
summary: "谱函数：只依赖矩阵特征值或奇异值的函数。借助对称/置换对称与 Fan、von Neumann 不等式，把谱函数的共轭、闭凸性、近端算子全部“降维”到其关联向量函数上计算。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

在本书中，我们的 underlying spaces 都是**有限维**的、存在内积和范数的空间。本章进入矩阵空间——但 Beck 的写法非常“偷懒”又非常优雅：他几乎不碰矩阵本身，而是把所有关于矩阵的问题**翻译成它特征值/奇异值向量上的向量问题**。这一章是 Ch4（共轭函数）和 Ch6（近端算子）在矩阵世界的“总应用”，也是后面矩阵补全、低秩模型、核范数正则化的理论地基。

全章一句话：**谱分解把“矩阵的结构”压成“向量的结构”，而对称性能保证压扁之后信息不丢。**

# 7.1 Symmetric Functions

## 7.1.1 Definition and Examples

### Definition 7.1 · Symmetric Functions

> **Definition 7.1** (symmetric functions). Let $\mathcal{A}\subseteq O_n$ be a set of orthogonal matrices. A proper function $f:\mathbb{R}^n\to(-\infty,\infty]$ is called *symmetric w.r.t.* $\mathcal{A}$ if
> $$f(A\mathbf{x})=f(\mathbf{x})\quad\text{for all }\mathbf{x}\in\mathbb{R}^n,\ A\in\mathcal{A}.$$

**为什么这一行最关键**：这里的“对称”不是通常的“关于某轴对称”，而是“被一族正交变换 $\mathcal{A}$ 的作用保持不变”。正交矩阵保持内积和范数，所以 $f$ 的值只取决于 $\mathbf{x}$ 的某种**不变量**（长度、绝对值、排序……），不取决于空间朝向。proper 条件（不取 $-\infty$、定义域非空）从一开始就钉死——后面谈共轭、近端都在 proper 函数上做文章（见 Ch2）。

下面五个例子，本质是给 $\mathcal{A}$ 换了五种选法。

### Example 7.2 · Even Functions

> **Example 7.2** (even functions). If $\mathcal{A}=\{-I\}$, then $f:\mathbb{R}^n\to(-\infty,\infty]$ is symmetric w.r.t. $\mathcal{A}$ iff $f(\mathbf{x})=f(-\mathbf{x})$ for all $\mathbf{x}\in\mathbb{R}^n$. Such functions will be called *even functions*.

$\mathcal{A}$ 退化为一个元素 $\{-I\}$：只要求对“整体取反”不变。一维里就是普通偶函数。

### Example 7.3 · Absolutely Symmetric Functions

> **Example 7.3** (absolutely symmetric functions). Take $\mathcal{A}=\{D_1,\dots,D_n\}\subseteq\mathbb{R}^{n\times n}$, where $D_i$ is the diagonal matrix whose diagonal elements are all ones except for the $(i,i)$ component which is $-1$. Then a proper $f:\mathbb{R}^n\to(-\infty,\infty]$ is symmetric w.r.t. $\mathcal{A}$ iff $f(\mathbf{x})=f(|\mathbf{x}|)$ for all $\mathbf{x}\in\mathbb{R}^n$. We call such a function an *absolutely symmetric function*. It is easy to show that $f$ is absolutely symmetric iff there exists $g:\mathbb{R}^n_+\to(-\infty,\infty]$ such that $f(\mathbf{x})=g(|\mathbf{x}|)$.

每个 $D_i$ 只翻第 $i$ 个坐标符号。要求对所有 $D_i$ 不变 $\Leftrightarrow$ 每个坐标符号都无所谓 $\Rightarrow$ $f$ 只依赖 $|\mathbf{x}|$。等价刻画 $f(\mathbf{x})=g(|\mathbf{x}|)$ 是 Beck 在埋钩子：后面 §7.3 的“绝对置换对称”就是这一条的升级版。

### Example 7.4 · Norm-Dependent Functions

> **Example 7.4** (norm-dependent functions). A proper $f:\mathbb{R}^n\to(-\infty,\infty]$ is symmetric w.r.t. $\mathcal{A}=O_n$ iff $f(\mathbf{x})=f(U\mathbf{x})$ for all $\mathbf{x}\in\mathbb{R}^n$, $U\in O_n$. This holds iff there exists a proper $g:\mathbb{R}\to(-\infty,\infty]$ such that $f(\mathbf{x})=g(\|\mathbf{x}\|_2)$. A function satisfying this is called a *norm-dependent function*.

$\mathcal{A}$ 是整个正交群 $O_n$，正交变换保 $\|\mathbf{x}\|_2$，故“对全体 $O_n$ 不变”=“只依赖长度”。这直接对接 Ch4 里 $\|\mathbf{x}\|_p$ 类的共轭公式。

### 记号：降序重排 $\mathbf{x}^\downarrow$ 与置换矩阵

对 $\mathbf{x}\in\mathbb{R}^n$，记 $\mathbf{x}^\downarrow$ 为分量**非增重排**：如 $\mathbf{x}=(2,-9,2,10)^T\Rightarrow\mathbf{x}^\downarrow=(10,2,2,-9)^T$。这是“置换对称”的语言基础。

### Definition 7.5 · Permutation Matrices

> **Definition 7.5** (permutation matrices). An $n\times n$ matrix is a *permutation matrix* if all entries are $0$ or $1$ and each row and each column has exactly one nonzero element. The set of all such matrices is denoted $\Lambda_n$.

### Definition 7.6 · Generalized Permutation Matrices

> **Definition 7.6** (generalized permutation matrices). An $n\times n$ matrix is a *generalized permutation matrix* if all entries are $0,1,$ or $-1$ and each row and column has exactly one nonzero element. The set of all such is denoted $\Lambda_n^G$.

**两个易混点**：$\Lambda_n$ 只允许 $0/1$（纯置换、不翻符号）；$\Lambda_n^G$ 允许 $-1$（置换 + 任意翻符号）。二者都是正交矩阵。对任意 $\mathbf{x}$ 存在 $P\in\Lambda_n$ 使 $P\mathbf{x}=\mathbf{x}^\downarrow$，$Q\in\Lambda_n^G$ 使 $Q\mathbf{x}=|\mathbf{x}|^\downarrow$。

### Example 7.7 · Permutation Symmetric Functions

> **Example 7.7** (permutation symmetric functions). A proper $f:\mathbb{R}^n\to(-\infty,\infty]$ is symmetric w.r.t. $\Lambda_n$ iff $f(\mathbf{x})=f(P\mathbf{x})$ for all $\mathbf{x}$, $P\in\Lambda_n$. Such a function is called *permutation symmetric*. It is easy to show $f$ is permutation symmetric iff $f(\mathbf{x})=f(\mathbf{x}^\downarrow)$ for all $\mathbf{x}$.

### Example 7.8 · Absolutely Permutation Symmetric Functions

> **Example 7.8** (absolutely permutation symmetric functions). A proper $f:\mathbb{R}^n\to(-\infty,\infty]$ is symmetric w.r.t. $\Lambda_n^G$ iff $f(\mathbf{x})=f(P\mathbf{x})$ for all $\mathbf{x}$, $P\in\Lambda_n^G$. Such a function is called *absolutely permutation symmetric*. It is easy to show $f$ is absolutely permutation symmetric iff $f(\mathbf{x})=f(|\mathbf{x}|^\downarrow)$ for all $\mathbf{x}$.

**结论**：置换对称（$f(\mathbf{x})=f(\mathbf{x}^\downarrow)$）对应 §7.2 的特征值（特征值已按非增排好，顺序无所谓）；绝对置换对称（$f(\mathbf{x})=f(|\mathbf{x}|^\downarrow)$）对应 §7.3 的奇异值（奇异值非负，只取决于绝对值排序）。

## 7.1.2 The Symmetric Conjugate Theorem

### Theorem 7.9 (symmetric conjugate theorem)

> **Theorem 7.9** (symmetric conjugate theorem). Let $f:\mathbb{R}^n\to(-\infty,\infty]$ be a proper function symmetric w.r.t. a set of orthogonal matrices $\mathcal{A}\subseteq O_n$. Then $f^*$ is symmetric w.r.t. $\mathcal{A}$.

#### 证明（自己走一遍）

固定 $A\in\mathcal{A}$，令 $h(\mathbf{x})=f(A\mathbf{x})$。由对称假设 $h=f$，故 $h^*=f^*$。由 Ch4 的 Thm 4.13（正交变换下的共轭公式，因 $A^{-1}=A^T$）：
$$h^*(\mathbf{y})=f^*((A^T)^{-1}\mathbf{y})=f^*(A\mathbf{y}).$$
于是 $f^*(\mathbf{y})=f^*(A\mathbf{y})$ 对任意 $\mathbf{y}$ 成立；而 $A\in\mathcal{A}$ 任取，故 $f^*$ 对整族 $\mathcal{A}$ 对称。$\blacksquare$

**骨架**：对称函数做正交复合后还是自己 $\Rightarrow$ 共轭也做同样正交复合 $\Rightarrow$ 共轭仍对称。真正动用的是 Ch4 Thm 4.13。这一条在 §7.2、§7.3 会被反复调用，确认谱函数的共轭 $F^*$ 也是谱函数、且关联函数对称，从而能二次套用谱共轭公式。

### Example 7.10 · Conjugate Symmetry Table

书用表核对 §4.4 那些函数的共轭也继承同样对称性（要点）：

| 类型 | $f(\mathbf{x})$ | $f^*(\mathbf{y})$ |
| --- | --- | --- |
| even | $\frac{1}{p}\|\mathbf{x}\|_p^p$ ($p>1$) | $\frac{1}{q}\|\mathbf{y}\|_q^q$ |
| even | $\frac12\mathbf{x}^TA\mathbf{x}+c$ ($A\succ0$) | $\frac12\mathbf{y}^TA^{-1}\mathbf{y}-c$ |
| perm. sym. | $\sum_i x_i\log x_i$ | $\sum_i e^{y_i}-1$ |
| perm. sym. | $\max_i x_i$ | $\delta_{\Delta_n}(\mathbf{y})$ |
| abs. perm. | $\|\mathbf{x}\|_p$ | $\delta_{B_{\|\cdot\|_q}[0,1]}(\mathbf{y})$ |
| norm-dep. | $\|\mathbf{x}\|_2$ | $\delta_{B_{\|\cdot\|_2}[0,1]}(\mathbf{y})$ |

表右列共轭全保持左列对称类型——正是 Thm 7.9 的验算。注意 $\max_i x_i$ 的共轭是单纯形 $\Delta_n$ 的示性函数（$\Delta_n$ 置换下不变）；$\|\mathbf{x}\|_p$ 的共轭是 $\ell_q$ 单位球的示性函数（绝对值置换下不变）。

# 7.2 Symmetric Spectral Functions over $S^n$

底层空间是对称矩阵空间 $S^n$。对 $X\in S^n$，特征值非增排列 $\lambda_1(X)\ge\cdots\ge\lambda_n(X)$，记特征值向量 $\lambda(X)=(\lambda_1,\dots,\lambda_n)^T$。任意 $X\in S^n$ 有谱分解 $X=U\,\mathrm{diag}(\lambda(X))\,U^T$，$U\in O_n$。

### Definition 7.11 · Spectral Functions over $S^n$

> **Definition 7.11** (spectral functions over $S^n$). A proper $g:S^n\to(-\infty,\infty]$ is a *spectral function over $S^n$* if there exists proper $f:\mathbb{R}^n\to(-\infty,\infty]$ for which $g=f\circ\lambda$.

**为什么这一行最关键**：谱函数 = “先取特征值向量 $\lambda(X)$，再套向量函数 $f$”。$g(X)$ 的值**只由特征值决定，与特征向量 $U$ 无关**。

**一个细节**：关联函数 $f$ **不一定唯一**（在 $\lambda(X)$ 取不到处随便改不影响 $g$）。我们真正关心的是“关联函数置换对称”的那一支。

### Definition 7.12 · Symmetric Spectral Functions over $S^n$

> **Definition 7.12** (symmetric spectral functions over $S^n$). A proper $g:S^n\to(-\infty,\infty]$ is a *symmetric spectral function over $S^n$* if there exists a proper permutation symmetric $f:\mathbb{R}^n\to(-\infty,\infty]$ for which $g=f\circ\lambda$.

比 Def 7.11 多要求 $f$ **置换对称**：同一矩阵的不同谱分解里特征值向量本就排好序，但我们要保证“用任意顺序写出的特征值”都给同一 $f$ 值，否则 $g(X)=f(\lambda(X))$ 会随排列而变——那就不叫“只依赖谱”了。

### Example 7.13 · Spectral Functions Dictionary

书给的“向量函数 ↔ 矩阵谱函数”字典（最该背的表之一）：

| # | $f(\mathbf{x})$ | $\mathrm{dom}(f)$ | $g=f\circ\lambda$ | $\mathrm{dom}(g)$ |
| --- | --- | --- | --- | --- |
| 1 | $\sum_i x_i$ | $\mathbb{R}^n$ | $\mathrm{Tr}(X)$ | $S^n$ |
| 2 | $\max_i x_i$ | $\mathbb{R}^n$ | $\lambda_{\max}(X)$ | $S^n$ |
| 3 | $\alpha\|\mathbf{x}\|_2$ | $\mathbb{R}^n$ | $\alpha\|X\|_F$ | $S^n$ |
| 4 | $\alpha\|\mathbf{x}\|_2^2$ | $\mathbb{R}^n$ | $\alpha\|X\|_F^2$ | $S^n$ |
| 5 | $\alpha\|\mathbf{x}\|_\infty$ | $\mathbb{R}^n$ | $\alpha\|X\|_{2,2}$ | $S^n$ |
| 6 | $\alpha\|\mathbf{x}\|_1$ | $\mathbb{R}^n$ | $\alpha\|X\|_{S_1}$ | $S^n$ |
| 7 | $-\sum_i\log x_i$ | $\mathbb{R}^n_{++}$ | $-\log\det(X)$ | $S^n_{++}$ |
| 8 | $\sum_i x_i\log x_i$ | $\mathbb{R}^n_+$ | $\sum_i\lambda_i\log\lambda_i$ | $S^n_+$ |
| 9 | $\sum_i x_i\log x_i$ | $\Delta_n$ | $\sum_i\lambda_i\log\lambda_i$ | $\Upsilon_n$ |

第 9 行定义域是谱多面体 $\Upsilon_n=\{X\in S^n_+:\mathrm{Tr}(X)=1\}$；第 6 行核范数对对称矩阵 $\|X\|_{S_1}=\sum_i|\lambda_i(X)|$。Schatten $p$-范数在 §7.3 展开。

**这张表在说什么**：迹、最大特征值、Frobenius、谱范数、核范数、负对数行列式……全都是谱函数，关联函数正是 Ch4/Ch6 算过共轭和近端的老朋友。Beck 整章的伏笔：翻译后直接查表。

### Theorem 7.14 (Fan's Inequality)

> **Theorem 7.14** (Fan's Inequality). For any $X,Y\in S^n$ it holds that $\mathrm{Tr}(XY)\le\langle\lambda(X),\lambda(Y)\rangle$, and equality holds iff there exists $V\in O_n$ for which $X=V\,\mathrm{diag}(\lambda(X))\,V^T$, $Y=V\,\mathrm{diag}(\lambda(Y))\,V^T$.

（矩阵内积 $\langle X,Y\rangle=\mathrm{Tr}(XY)$ 对对称阵成立。）

#### 证明（自己走一遍）

取谱分解 $X=U_X\mathrm{diag}(\lambda(X))U_X^T$, $Y=U_Y\mathrm{diag}(\lambda(Y))U_Y^T$。则 $\mathrm{Tr}(XY)=\mathrm{Tr}(\mathrm{diag}(\lambda(X))\,Q\,\mathrm{diag}(\lambda(Y))\,Q^T)$，$Q=U_X^TU_Y\in O_n$。这是 $\lambda(X),\lambda(Y)$ 经正交矩阵 $Q$ 加权的双线性型。由**重排不等式**：两个已排非增序列的内积在“顺序对齐”时最大，任何正交混合只拉低总和，故 $\mathrm{Tr}(XY)\le\lambda(X)^T\lambda(Y)$。等号成立当且仅当 $Q=I$ 即 $U_X=U_Y=:V$，即 $X,Y$ 同时正交对角化。$\blacksquare$

**为什么是发动机**：谱共轭公式 (Thm 7.15) 第一步 `≤` 用的就是它，把矩阵空间最大化压到向量空间最大化。

## 7.2.1 The Spectral Conjugate Formula

### Theorem 7.15 (spectral conjugate formula over $S^n$)

> **Theorem 7.15** (spectral conjugate formula over $S^n$). Let $f:\mathbb{R}^n\to(-\infty,\infty]$ be a permutation symmetric function. Then $(f\circ\lambda)^*=f^*\circ\lambda$.

#### 证明（自己走一遍，两向夹逼）

记 $F=f\circ\lambda$，对 $Y\in S^n$：

**方向一（≤）：** 用 Fan 不等式把矩阵内积换成特征值内积，
$$\begin{aligned}
F^*(Y)&=\max_{X\in S^n}\{\mathrm{Tr}(XY)-f(\lambda(X))\}\\
&\le\max_X\{\langle\lambda(X),\lambda(Y)\rangle-f(\lambda(X))\}\quad\text{(Fan)}\\
&\le\max_x\{\langle x,\lambda(Y)\rangle-f(x)\}=f^*(\lambda(Y)).
\end{aligned}$$
第二处 `≤` 是因为 $\lambda(X)$ 在 $S^n$ 上跑的范围 $\subseteq\mathbb{R}^n$，放宽到全空间只会变大。

**方向二（≥）：** 取 $Y=U\,\mathrm{diag}(\lambda(Y))\,U^T$，
$$\begin{aligned}
f^*(\lambda(Y))&=\max_x\{\langle x,\lambda(Y)\rangle-f(x)\}\\
&=\max_x\{\mathrm{Tr}(\mathrm{diag}(x)\,U^TYU)-f(x^\downarrow)\}\quad\text{(置换对称：$f(x)=f(x^\downarrow)$)}\\
&=\max_x\{\mathrm{Tr}(U\mathrm{diag}(x)U^T\,Y)-f(\lambda(U\mathrm{diag}(x)U^T))\}\\
&\le\max_Z\{\mathrm{Tr}(ZY)-f(\lambda(Z))\}=F^*(Y).
\end{aligned}$$
关键：$U\mathrm{diag}(x)U^T$ 的特征值向量正是 $x^\downarrow$（正交相似保谱，对角元排好序），配合置换对称把 $f(x)$ 写成 $f(\lambda(\cdot))$。两向夹逼得证。$\blacksquare$

**骨架**：Fan 不等式负责 `≤`，谱分解 + 置换对称负责 `≥`。结论极干净——**谱函数的共轭 = 关联函数的共轭再套 $\lambda$**。

### Example 7.16 · Spectral Conjugate Table

| # | $g(X)$ | $\mathrm{dom}(g)$ | $g^*(Y)$ | $\mathrm{dom}(g^*)$ |
| --- | --- | --- | --- | --- |
| 1 | $\mathrm{Tr}(X)$ | $S^n$ | $\delta_{\{I\}}(Y)$ | $\{I\}$ |
| 2 | $\lambda_{\max}(X)$ | $S^n$ | $\delta_{\Upsilon_n}(Y)$ | $\Upsilon_n$ |
| 3 | $\alpha\|X\|_F$ | $S^n$ | $\delta_{B_{\|\cdot\|_F}[0,\alpha]}(Y)$ | $B_{\|\cdot\|_F}[0,\alpha]$ |
| 4 | $\alpha\|X\|_F^2$ | $S^n$ | $\frac{1}{4\alpha}\|Y\|_F^2$ | $S^n$ |
| 5 | $\alpha\|X\|_{2,2}$ | $S^n$ | $\delta_{B_{\|\cdot\|_{S_1}}[0,\alpha]}(Y)$ | $B_{\|\cdot\|_{S_1}}[0,\alpha]$ |
| 6 | $\alpha\|X\|_{S_1}$ | $S^n$ | $\delta_{B_{\|\cdot\|_{2,2}}[0,\alpha]}(Y)$ | $B_{\|\cdot\|_{2,2}}[0,\alpha]$ |
| 7 | $-\log\det(X)$ | $S^n_{++}$ | $-n-\log\det(-Y)$ | $S^n_{--}$ |
| 8 | $\sum_i\lambda_i\log\lambda_i$ | $S^n_+$ | $\sum_i e^{\lambda_i(Y)}-1$ | $S^n$ |
| 9 | $\sum_i\lambda_i\log\lambda_i$ | $\Upsilon_n$ | $\log\sum_i e^{\lambda_i(Y)}$ | $S^n$ |

**值得记的一行**：核范数 $\alpha\|X\|_{S_1}$ 的共轭是谱范数单位球示性函数——这正是核范数作为低秩正则子的支撑函数身份（见 Ch2 支撑函数）。**前向指针**：低秩矩阵补全里“近端 = 奇异值软阈值”就藏在第 6 行 + Thm 7.18。

### Theorem 7.17 (closedness and convexity over $S^n$)

> **Theorem 7.17** (closedness and convexity of symmetric spectral functions over $S^n$). Let $F=f\circ\lambda$, $f$ permutation symmetric proper. Then $F$ is closed and convex iff $f$ is closed and convex.

#### 证明（自己走一遍，靠双共轭）

套路是 Ch4 标准武器：**闭凸 proper 函数 = 自己双共轭（$f^{**}=f$，Thm 4.8）；任意函数的共轭总是闭凸（Thm 4.3）**。由 Thm 7.15：$F^*=f^*\circ\lambda$；再由 Thm 7.9，$f^*$ 仍置换对称，故可再套 Thm 7.15：
$$F^{**}=(f^*\circ\lambda)^*=f^{**}\circ\lambda.\tag{7.2}$$
若 $f$ 闭凸 $\Rightarrow f^{**}=f\Rightarrow F^{**}=F$，即 $F$ 是某函数（$F^*$）的共轭，由 Thm 4.3 闭凸。反之若 $F$ 闭凸 $\Rightarrow F^{**}=F\Rightarrow f\circ\lambda=f^{**}\circ\lambda$；取对角阵 $X=\mathrm{diag}(\mathbf{x})$ 使 $\lambda(X)=\mathbf{x}^\downarrow$，得 $f(\mathbf{x}^\downarrow)=f^{**}(\mathbf{x}^\downarrow)$，由 $f,f^{**}$ 皆置换对称推出 $f(\mathbf{x})=f^{**}(\mathbf{x})$，即 $f=f^{**}$，故 $f$ 闭凸。$\blacksquare$

**为什么重要**：把“矩阵函数 $F$ 是否闭凸”彻底还原成“向量函数 $f$ 是否闭凸”——后者在 Ch2/Ch4 有整套判据（Thm 2.6 三种武器、Ch4 共轭闭凸性）。这是全章“降维”的集大成。

## 7.2.2 The Proximal Operator over $S^n$

### Theorem 7.18 (spectral prox formula over $S^n$)

> **Theorem 7.18** (spectral prox formula over $S^n$). Let $F=f\circ\lambda$, $f$ permutation symmetric proper closed and convex. Let $X=U\,\mathrm{diag}(\lambda(X))\,U^T$, $U\in O_n$. Then
> $$\mathrm{prox}_F(X)=U\,\mathrm{diag}(\mathrm{prox}_f(\lambda(X)))\,U^T.$$

即：**先谱分解，把特征值向量丢进 $\mathrm{prox}_f$，再用 $U$ 拼回。**

#### 证明（自己走一遍，两步：降维 + 证最优解对角）

回顾 $\mathrm{prox}_F(X)=\arg\min_{Z\in S^n}\{F(Z)+\frac12\|Z-X\|_F^2\}$。记 $D=\mathrm{diag}(\lambda(X))$。

**降维**：任意 $Z$，$\lambda(Z)=\lambda(U^TZU)$（正交相似保谱），且 $\|U^TZU-D\|_F=\|Z-X\|_F$。令 $W=U^TZU$，问题等价于 $\min_W\{F(W)+\frac12\|W-D\|_F^2\}$，原解 $Z=UW^*U^T$。

**证 $W^*$ 对角**：取 $V_i$ 为“只翻第 $i$ 个对角元为 $-1$”的对角正交阵，$\widetilde{W}_i=V_iW^*V_i$。因 $V_i$ 对角正交，$\lambda(\widetilde{W}_i)=\lambda(W^*)$，故 $F(\widetilde{W}_i)=F(W^*)$；范数项 $\|\widetilde{W}_i-D\|_F=\|W^*-V_i^TDV_i\|_F=\|W^*-D\|_F$（$V_i,D$ 对角，$V_i^TDV_i=D$）。故 $\widetilde{W}_i$ 也是最优解。问题强凸、最优解唯一，故 $\widetilde{W}_i=W^*$，比较第 $i$ 行得 $W^*_{ij}=0$ 对所有 $j\ne i$，即 $W^*$ 对角：$W^*=\mathrm{diag}(\mathbf{w}^*)$。

**化回向量近端**：$F(\mathrm{diag}(\mathbf{w}))=f(\mathbf{w}^\downarrow)=f(\mathbf{w})$，$\|\mathrm{diag}(\mathbf{w})-D\|_F=\|\mathbf{w}-\lambda(X)\|_2$，故 $\mathbf{w}^*=\mathrm{prox}_f(\lambda(X))$。代回得证。$\blacksquare$

**这就是 Ch6 软阈值的矩阵推广**：取 $f(\mathbf{x})=\alpha\|\mathbf{x}\|_1$，$\mathrm{prox}_F(X)=U\,\mathrm{diag}(T_\alpha(\lambda(X)))U^T$——矩阵软阈值（对称版）。详见 Ex 7.19 第 3 行、Ch6 Example 6.8。

### Example 7.19 · Spectral Prox Table

（$X=U\,\mathrm{diag}(\lambda(X))U^T$，$\alpha>0$）

| $F(X)$ | $\mathrm{prox}_F(X)$ | 参考 |
| --- | --- | --- |
| $\alpha\|X\|_F^2$ | $\frac{1}{1+2\alpha}X$ | §6.2.3 |
| $\alpha\|X\|_F$ | $\big(1-\frac{\alpha}{\max\{\|X\|_F,\alpha\}}\big)X$ | Example 6.19 |
| $\alpha\|X\|_{S_1}$ | $U\,\mathrm{diag}(T_\alpha(\lambda(X)))U^T$ | Example 6.8 |
| $\alpha\|X\|_{2,2}$ | $U\,\mathrm{diag}\big(\lambda(X)-\alpha P_{B_{\|\cdot\|_1}[0,1]}(\lambda(X)/\alpha)\big)U^T$ | Example 6.48 |
| $-\alpha\log\det(X)$ | $U\,\mathrm{diag}\big(\frac{\lambda_j+\sqrt{\lambda_j^2+4\alpha}}{2}\big)U^T$ | Example 6.9 |
| $\alpha\lambda_1(X)$ | $U\,\mathrm{diag}\big(\lambda(X)-\alpha P_{\Delta_n}(\lambda(X)/\alpha)\big)U^T$ | Example 6.49 |
| $\alpha\sum_{i=1}^k\lambda_i(X)$ | $X-\alpha U\,\mathrm{diag}(P_C(\lambda(X)/\alpha))U^T$, $C=H_{e,k}\cap\mathrm{Box}[0,e]$ | Example 6.50 |

**Figure 7.1.** 计算对称谱函数近端的流水线：谱分解 $X=U\mathrm{diag}(\lambda(X))U^T$ → 在特征值向量上跑 $\mathrm{prox}_f$ → 用同一 $U$ 拼回。*See the original image for the “diagonalize → threshold → reassemble” schematic.*

### 定义（正文）：Symmetric Spectral Set in $S^n$

> 集合 $T\subseteq S^n$ 称为**对称谱集**，如果 $\delta_T$ 是 $S^n$ 上的对称谱函数，即 $\delta_T=\delta_C\circ\lambda$，$\delta_C$ 置换对称，$C\subseteq\mathbb{R}^n$ 为关联集。

因 $\mathrm{prox}_{\delta_T}=P_T$、$\mathrm{prox}_{\delta_C}=P_C$，由谱近端公式：若 $C$ 非空闭凸，则 $P_T(X)=U\,\mathrm{diag}(P_C(\lambda(X)))U^T$。一句话：**到对称谱集的投影 = 特征值投影到关联集再拼回**。

### Example 7.20 · Orthogonal Projection onto Symmetric Spectral Sets ($S^n$)

| 集合 $T$ | $P_T(X)$ | 假设 |
| --- | --- | --- |
| $S^n_+$ | $U\,\mathrm{diag}([\lambda(X)]^+)U^T$ | — |
| $\{\ell I\preceq X\preceq uI\}$ | $U\,\mathrm{diag}(\mathbf{v})U^T$, $v_i=\min\{\max\{\lambda_i,\ell\},u\}$ | $\ell\le u$ |
| $B_{\|\cdot\|_F}[0,r]$ | $\frac{r}{\max\{\|X\|_F,r\}}X$ | $r>0$ |
| $\{\mathrm{Tr}(X)\le b\}$ | $U\,\mathrm{diag}(\lambda-\frac{[e^T\lambda-b]^+}{n}e)U^T$ | $b\in\mathbb{R}$ |
| $\Upsilon_n$ | $U\,\mathrm{diag}([\lambda-\mu^*e]^+)U^T$, $e^T[\lambda-\mu^*e]^+=1$ | — |
| $B_{\|\cdot\|_{S_1}}[0,\alpha]$ | $X$ if $\|X\|_{S_1}\le\alpha$; else $U\,\mathrm{diag}(T_{\beta^*}(\lambda))U^T$ | $\alpha>0$ |

（参考均见 Lemma 6.26 / Corollary 6.29 / Example 6.33。）**值得记的一行**：投影到半正定锥 $S^n_+$ 就是**把负特征值砍零**——Ch6 Lemma 6.26 在矩阵上的体现，半定规划最常用的一招。

# 7.3 Symmetric Spectral Functions over $\mathbb{R}^{m\times n}$

底层空间 $\mathbb{R}^{m\times n}$，记 $r=\min\{m,n\}$。奇异值非增 $\sigma_1(X)\ge\cdots\ge\sigma_r(X)\ge0$，记 $\sigma(X)=(\sigma_1,\dots,\sigma_r)^T$。算子 $\mathrm{dg}(v)$ 把 $v\in\mathbb{R}^r$ 铺成 $m\times n$ 广义对角阵（只前 $r$ 个对角位放 $v_i$）。任意 $X$ 有 SVD：$X=U\,\mathrm{dg}(\sigma(X))\,V^T$，$U\in O_m$, $V\in O_n$。

### Definition 7.21 · Spectral Functions over $\mathbb{R}^{m\times n}$

> **Definition 7.21** (spectral functions over $\mathbb{R}^{m\times n}$). A proper $g:\mathbb{R}^{m\times n}\to(-\infty,\infty]$ is a *spectral function over* $\mathbb{R}^{m\times n}$ if there exists proper $f:\mathbb{R}^r\to(-\infty,\infty]$ for which $g=f\circ\sigma$.

与 $S^n$ 的唯一差别：依赖**奇异值**而非特征值，关联函数定义在 $\mathbb{R}^r$。

### Definition 7.22 · Symmetric Spectral Functions over $\mathbb{R}^{m\times n}$

> **Definition 7.22** (symmetric spectral functions over $\mathbb{R}^{m\times n}$). A proper $g:\mathbb{R}^{m\times n}\to(-\infty,\infty]$ is a *symmetric spectral function over* $\mathbb{R}^{m\times n}$ if there exists proper absolutely permutation symmetric $f:\mathbb{R}^r\to(-\infty,\infty]$ for which $g=f\circ\sigma$.

**为什么“绝对”置换对称**：奇异值本非负，SVD 左右奇异向量可带任意符号，故关联函数必须对标量绝对值的排列不变——正是 §7.1 的 $\Lambda_n^G$ 对称。

### Example 7.23 · Schatten p-Norms

> **Example 7.23** (Schatten p-norms). For $p\in[1,\infty]$, $\|X\|_{S_p}\equiv\|\sigma(X)\|_p$. Specific examples: trace-norm (Schatten 1) $\|X\|_{S_1}=\sum_i\sigma_i(X)$; spectral norm (Schatten $\infty$) $\|X\|_{S_\infty}=\sigma_1(X)=\|X\|_{2,2}$; Frobenius (Schatten 2) $\|X\|_{S_2}=(\sum_i\sigma_i^2)^{1/2}=\sqrt{\mathrm{Tr}(X^TX)}=\|X\|_F$.

Schatten $p$-范数就是“奇异值向量取 $\ell_p$ 范数”，关联函数是 $\mathbb{R}^r$ 上 $\ell_p$（绝对置换对称）。核范数 = Schatten 1 是低秩正则化主力。

### Example 7.24 · Ky Fan k-Norms

> **Example 7.24** (Ky Fan k-norms). Let $x_{\langle i\rangle}$ be the $i$th largest absolute value component of $x$. $f_k(x)=\sum_{i=1}^k|x_{\langle i\rangle}|$ is absolutely permutation symmetric; the corresponding spectral function is the Ky Fan k-norm $\|X\|_{\langle k\rangle}=f_k(\sigma(X))=\sum_{i=1}^k\sigma_i(X)$.

Ky Fan $k$-范数 = “前 $k$ 个最大奇异值之和”。注意 $\|X\|_{\langle1\rangle}=\sigma_1$（谱范数），$\|X\|_{\langle r\rangle}=\sum\sigma_i$（核范数）。

### Theorem 7.25 (von Neumann's trace inequality)

> **Theorem 7.25** (von Neumann's trace inequality). For any $X,Y\in\mathbb{R}^{m\times n}$, $\langle X,Y\rangle\le\langle\sigma(X),\sigma(Y)\rangle$. Equality iff there exist $U\in O_m,V\in O_n$ with $X=U\,\mathrm{dg}(\sigma(X))\,V^T$, $Y=U\,\mathrm{dg}(\sigma(Y))\,V^T$.

（矩阵内积 $\langle X,Y\rangle=\mathrm{Tr}(X^TY)$。）

#### 证明（自己走一遍）

与 Fan 不等式同构，换 SVD。取 $X=U_X\mathrm{dg}(\sigma(X))V_X^T$, $Y=U_Y\mathrm{dg}(\sigma(Y))V_Y^T$，则 $\langle X,Y\rangle=\mathrm{Tr}(\mathrm{dg}(\sigma(X))\,Q\,\mathrm{dg}(\sigma(Y))\,R^T)$，$Q=U_X^TU_Y$, $R=V_X^TV_Y$ 正交。由重排不等式最大值在 $Q=R=I$（左右奇异向量对齐）时取到，上界 $\sigma(X)^T\sigma(Y)$。等号当且仅当同时 SVD。$\blacksquare$

**为什么是 §7.3 的发动机**：与 Fan 在 §7.2 的角色完全一样，负责谱共轭公式第一步 `≤`。

## 7.3.1 The Spectral Conjugate Formula

### Theorem 7.26 (spectral conjugate formula over $\mathbb{R}^{m\times n}$)

> **Theorem 7.26** (spectral conjugate formula over $\mathbb{R}^{m\times n}$). Let $f:\mathbb{R}^r\to(-\infty,\infty]$ be absolutely permutation symmetric. Then $(f\circ\sigma)^*=f^*\circ\sigma$.

#### 证明（自己走一遍，与 Thm 7.15 同构）

记 $F=f\circ\sigma$。$Y=U\,\mathrm{dg}(\sigma(Y))\,V^T$。

**方向一（≤）：** 用 von Neumann，
$$\begin{aligned}
F^*(Y)&=\max_X\{\mathrm{Tr}(X^TY)-f(\sigma(X))\}\\
&\le\max_X\{\langle\sigma(X),\sigma(Y)\rangle-f(\sigma(X))\}\le\max_x\{\langle x,\sigma(Y)\rangle-f(x)\}=f^*(\sigma(Y)).
\end{aligned}$$

**方向二（≥）：** 
$$\begin{aligned}
f^*(\sigma(Y))&=\max_x\{\langle x,\sigma(Y)\rangle-f(x)\}\\
&=\max_x\{\mathrm{Tr}(\mathrm{dg}(x)^TU^TYV)-f(x^\downarrow)\}\quad\text{(绝对置换对称：$f(x)=f(|x|^\downarrow)=f(x^\downarrow)$)}\\
&=\max_x\{\mathrm{Tr}(V\mathrm{dg}(x)^TU^TY)-f(\sigma(U\mathrm{dg}(x)V^T))\}\\
&\le\max_Z\{\mathrm{Tr}(Z^TY)-f(\sigma(Z))\}=F^*(Y).
\end{aligned}$$
关键：$U\mathrm{dg}(x)V^T$ 的奇异值向量正是 $|x|^\downarrow=x^\downarrow$（SVD 奇异值 = 对角元绝对值排好序）。两向夹逼。$\blacksquare$

**与 §7.2 唯一差别**：Fan 用正交相似（一个 $U$），von Neumann 用双侧正交（左右 $U,V$）——一般矩阵只有左右奇异向量没有“特征向量”。公式形状一模一样。

### Example 7.27 · Spectral Conjugate Table ($\mathbb{R}^{m\times n}$)

| $g(X)$ | $\mathrm{dom}(g)$ | $g^*(Y)$ | $\mathrm{dom}(g^*)$ |
| --- | --- | --- | --- |
| $\alpha\sigma_1(X)$ | $\mathbb{R}^{m\times n}$ | $\delta_{B_{\|\cdot\|_{S_1}}[0,\alpha]}(Y)$ | $B_{\|\cdot\|_{S_1}}[0,\alpha]$ |
| $\alpha\|X\|_F$ | $\mathbb{R}^{m\times n}$ | $\delta_{B_{\|\cdot\|_F}[0,\alpha]}(Y)$ | $B_{\|\cdot\|_F}[0,\alpha]$ |
| $\alpha\|X\|_F^2$ | $\mathbb{R}^{m\times n}$ | $\frac{1}{4\alpha}\|Y\|_F^2$ | $\mathbb{R}^{m\times n}$ |
| $\alpha\|X\|_{S_1}$ | $\mathbb{R}^{m\times n}$ | $\delta_{B_{\|\cdot\|_{S_\infty}}[0,\alpha]}(Y)$ | $B_{\|\cdot\|_{S_\infty}}[0,\alpha]$ |

核范数 $\alpha\|X\|_{S_1}$ 的共轭是谱范数（Schatten $\infty$）单位球示性函数——与 Ex 7.16 第 6 行一致。

### Theorem 7.28 (closedness and convexity over $\mathbb{R}^{m\times n}$)

> **Theorem 7.28** (closedness and convexity of symmetric spectral functions over $\mathbb{R}^{m\times n}$). Let $F=f\circ\sigma$, $f$ absolutely permutation symmetric proper. Then $F$ is closed and convex iff $f$ is closed and convex.

#### 证明（自己走一遍）

与 Thm 7.17 **逐字同构**，只把 $\lambda\to\sigma$、“置换对称”$\to$“绝对置换对称”、对角阵 $\mathrm{diag}(x)\to$ 广义对角阵 $\mathrm{dg}(x)$。由 Thm 7.26：$F^*=f^*\circ\sigma$；由 Thm 7.9（对 $\Lambda_n^G$）知 $f^*$ 绝对置换对称，故 $F^{**}=f^{**}\circ\sigma$。闭凸 $\Leftrightarrow f^{**}=f\Leftrightarrow F^{**}=F$；方向二取 $X=\mathrm{dg}(x)$ 使 $\sigma(X)=|x|^\downarrow$，用绝对置换对称 $f(|x|^\downarrow)=f(x)$ 还原。$\blacksquare$

### 7.3.2 The Proximal Operator over $\mathbb{R}^{m\times n}$

### Theorem 7.29 (spectral prox formula over $\mathbb{R}^{m\times n}$)

> **Theorem 7.29** (spectral prox formula over $\mathbb{R}^{m\times n}$). Let $F=f\circ\sigma$, $f$ absolutely permutation symmetric proper closed and convex. Let $X=U\,\mathrm{dg}(\sigma(X))\,V^T$, $U\in O_m,V\in O_n$. Then
> $$\mathrm{prox}_F(X)=U\,\mathrm{dg}(\mathrm{prox}_f(\sigma(X)))\,V^T.$$

#### 证明（自己走一遍，与 Thm 7.18 同构，双侧正交）

$\mathrm{prox}_F(X)=\arg\min_Z\{F(Z)+\frac12\|Z-X\|_F^2\}$。记 $D=\mathrm{dg}(\sigma(X))$。**降维**：任意 $Z$，$\sigma(Z)=\sigma(U^TZV)$、$\|U^TZV-D\|_F=\|Z-X\|_F$，令 $W=U^TZV$ 化等价问题，原解 $Z=UW^*V^T$。**证 $W^*$ 广义对角**：取 $\Sigma_i^{(1)}\in O_m,\Sigma_i^{(2)}\in O_n$ 为“只翻第 $i$ 个对角元为 $-1$”的对角正交阵，$\widetilde{W}_i=\Sigma_i^{(1)}W^*\Sigma_i^{(2)}$。双侧正交保奇异值，故 $F(\widetilde{W}_i)=F(W^*)$；范数项 $\|\widetilde{W}_i-D\|_F=\|W^*-\Sigma_i^{(1)}D\Sigma_i^{(2)}\|_F=\|W^*-D\|_F$（$D$ 对角，符号平方消去）。由唯一性 $\widetilde{W}_i=W^*$，比较第 $i$ 行与列得 $W^*$ 广义对角：$W^*=\mathrm{dg}(\mathbf{w}^*)$。**化回向量近端**：$F(\mathrm{dg}(\mathbf{w}))=f(|\mathbf{w}|^\downarrow)=f(\mathbf{w})$，$\|\mathrm{dg}(\mathbf{w})-D\|_F=\|\mathbf{w}-\sigma(X)\|_2$，故 $\mathbf{w}^*=\mathrm{prox}_f(\sigma(X))$。代回得证。$\blacksquare$

**这就是 Ch6 软阈值的完整矩阵推广（singular value thresholding）**：取 $f(\mathbf{x})=\alpha\|\mathbf{x}\|_1$，则 $\mathrm{prox}_F(X)=U\,\mathrm{dg}(T_\alpha(\sigma(X)))V^T$——SVD 后奇异值软阈值再拼回。这是矩阵补全、鲁棒 PCA 的核心算子。详见 Ex 7.30 第 3 行、Ch6 Example 6.8。

### Example 7.30 · Spectral Prox Table ($\mathbb{R}^{m\times n}$)

（$U\in O_m,V\in O_n$ 满足 $X=U\mathrm{dg}(\sigma(X))V^T$，$\alpha>0$）

| $F(X)$ | $\mathrm{prox}_F(X)$ | 参考 |
| --- | --- | --- |
| $\alpha\|X\|_F^2$ | $\frac{1}{1+2\alpha}X$ | §6.2.3 |
| $\alpha\|X\|_F$ | $\big(1-\frac{\alpha}{\max\{\|X\|_F,\alpha\}}\big)X$ | Example 6.19 |
| $\alpha\|X\|_{S_1}$ | $U\,\mathrm{dg}(T_\alpha(\sigma(X)))V^T$ | Example 6.8 |
| $\alpha\|X\|_{S_\infty}$ | $X-\alpha U\,\mathrm{dg}(P_{B_{\|\cdot\|_1}[0,1]}(\sigma(X)/\alpha))V^T$ | Example 6.48 |
| $\alpha\|X\|_{\langle k\rangle}$ | $X-\alpha U\,\mathrm{dg}(P_C(\sigma(X)/\alpha))V^T$, $C=B_{\|\cdot\|_1}[0,k]\cap B_{\|\cdot\|_\infty}[0,1]$ | Example 6.51 |

**Figure 7.2.** 一般矩阵谱近端流水线：SVD $X=U\mathrm{dg}(\sigma(X))V^T$ → 对奇异值向量跑 $\mathrm{prox}_f$ → 用左右奇异向量拼回。*See the original image for the singular-value-thresholding diagram.*

### 定义（正文）：Symmetric Spectral Set in $\mathbb{R}^{m\times n}$

> 集合 $T\subseteq\mathbb{R}^{m\times n}$ 称为**对称谱集**，如果 $\delta_T=\delta_C\circ\sigma$，$\delta_C$ 绝对置换对称，$C\subseteq\mathbb{R}^r$ 关联集。若 $C$ 非空闭凸，则 $P_T(X)=U\,\mathrm{dg}(P_C(\sigma(X)))V^T$。

### Example 7.31 · Orthogonal Projection onto Symmetric Spectral Sets ($\mathbb{R}^{m\times n}$)

| 集合 $T$ | $P_T(X)$ | 假设 |
| --- | --- | --- |
| $B_{\|\cdot\|_{S_\infty}}[0,\alpha]$ | $U\,\mathrm{dg}(\mathbf{v})V^T$, $v_i=\min\{\sigma_i(X),\alpha\}$ | $\alpha>0$ |
| $B_{\|\cdot\|_F}[0,r]$ | $\frac{r}{\max\{\|X\|_F,r\}}X$ | $r>0$ |
| $B_{\|\cdot\|_{S_1}}[0,\alpha]$ | $X$ if $\|X\|_{S_1}\le\alpha$; else $U\,\mathrm{dg}(T_{\beta^*}(\sigma(X)))V^T$ | $\alpha>0$ |

**值得记的一行**：投影到谱范数球 = 把超过 $\alpha$ 的奇异值截断到 $\alpha$；投影到核范数球 = 对奇异值做带约束软阈值——低秩/稀疏矩阵优化里最常用。

---

## 全章总结：一条流水线，两种空间

| 空间 | 不变量 | 对称群 | 核心不等式 | 共轭公式 | 近端公式 |
| --- | --- | --- | --- | --- | --- |
| $S^n$ | 特征值 $\lambda(X)$ | 置换 $\Lambda_n$ | Fan (7.14) | $(f\circ\lambda)^*=f^*\circ\lambda$ (7.15) | $U\mathrm{diag}(\mathrm{prox}_f(\lambda))U^T$ (7.18) |
| $\mathbb{R}^{m\times n}$ | 奇异值 $\sigma(X)$ | 绝对置换 $\Lambda_n^G$ | von Neumann (7.25) | $(f\circ\sigma)^*=f^*\circ\sigma$ (7.26) | $U\mathrm{dg}(\mathrm{prox}_f(\sigma))V^T$ (7.29) |

**三条主线**：① 对称性遗传给共轭（Thm 7.9）——保证谱共轭公式能二次套用，从而证闭凸（7.17/7.28）；② Fan/von Neumann 不等式是 `≤` 来源，谱分解 + 对称性是 `≥` 来源；③ 近端 = 先分解、对不变量跑关联近端、再拼回——即 Ch6 软阈值的矩阵推广。

**前向指针**：本章是后面所有矩阵优化（核范数正则、低秩补全、半定谱约束投影）的底座，与 Ch4 共轭、Ch6 近端严丝合缝接上——每个矩阵近端公式背后都是“降到向量、查 Ch6 表、升回矩阵”。**一个细节**：关联函数“不一定唯一”，但锁死“对称谱函数”（关联函数对称）就自动消去歧义——这正是 Def 7.12/7.22 比 Def 7.11/7.21 多那句对称要求的真正用意。
