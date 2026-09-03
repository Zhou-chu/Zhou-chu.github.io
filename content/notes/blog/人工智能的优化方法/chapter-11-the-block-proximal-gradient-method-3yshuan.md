---
blog: true
title: "Chapter 11-The Block Proximal Gradient Method"
slug: "chapter-11-the-block-proximal-gradient-method-3yshuan"
summary: "块坐标分解的近端梯度法：把复合模型按变量分块，逐块做 prox-grad 步，给出串行（CBPG）与并行随机（RBPG）两种更新及其收敛性。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

前面 Chapter 10 讲了**单个**复合模型 $\min f(x)+g(x)$ 的 proximal gradient 方法，$f$ 和 $g$ 被**整体**一起处理。到了 Chapter 11，主角换成**变量分块**——决策变量被切成 $p$ 块 $(x_1,\dots,x_p)$，只有一块在每一步被更新。这就是 **variables decomposition method**。

> **Underlying Spaces:** In this chapter, all the underlying spaces are Euclidean (see the details in Section 11.2).

和全书一样，默认工作在有限维欧氏空间上。

# 11.1 Decomposition Methods

作者把全书出现过的分解方法分成两大类：

- **Functional decomposition（函数分解）**：问题的"数据"由若干函数组成，每步只处理其中一两个。例 8.36 的随机投影次梯度法 $x_{k+1}=P_C(x_k-t_k f'_{i_k}(x_k))$、§8.4 的增量投影次梯度法（cyclic order 轮流挑 $i_k$）都属此类；而 **proximal gradient 本身也是一种函数分解**——它先把 $f$ 的梯度步、再把 $g$ 的 prox 分开算（见 Chapter 10）。
- **Variables decomposition（变量分解）**：每步只改**一部分决策变量**。例 10.73（在 $\mathbb{R}^n$ 上最小化可微函数、用 $l_1$-范数下的 non-Euclidean 梯度法）一次只挑一个变量做梯度步。

**作者注**：本章研究变量分解的"加强版"——一次挑**一整块**变量并对其做**块近端梯度步**。这是 Beck 在埋钩子：把 Chapter 10 的 prox-grad 从"整变量"推广到"分块变量"。

# 11.2 Model and Assumptions

本章的主模型是带**块可分结构 (block separable structure)** 的复合问题：

> **(11.1)** $\displaystyle \min_{x_1\in\mathbb{E}_1,\dots,x_p\in\mathbb{E}_p}\Biggl\{F(x_1,\dots,x_p)=f(x_1,\dots,x_p)+\sum_{j=1}^{p}g_j(x_j)\Biggr\},$

其中 $\mathbb{E}_1,\dots,\mathbb{E}_p$ 都是欧氏空间，乘积空间 $\mathbb{E}=\mathbb{E}_1\times\cdots\times\mathbb{E}_p$。沿用 §1.9 的约定，其范数为
$$\|(u_1,\dots,u_p)\|_{\mathbb{E}}=\sqrt{\sum_{i=1}^{p}\|u_i\|_{\mathbb{E}_i}^2}.$$

函数 $g:\mathbb{E}\to(-\infty,\infty]$ 被定义成
$$g(x_1,\dots,x_p)\equiv\sum_{i=1}^{p}g_i(x_i),$$
即**逐块可加**。第 $i$ 块梯度记作 $\nabla_i f$；当 $f$ 可微时 $\nabla f(x)=(\nabla_1 f(x),\dots,\nabla_p f(x))$。

**为什么这是全章最重要的一个设定**：把 $g$ 写成 $\sum g_i(x_i)$ 后，它的 prox 就能**逐块并行计算**（Theorem 6.6 的结论，后面 Lemma 11.5 会用到），这是块方法"分而治之"的根本。

作者引入把第 $i$ 个空间嵌回总空间的线性变换：
$$U_i(d)=(0,\dots,0,\overset{i\text{th}}{d},0,\dots,0),\qquad d\in\mathbb{E}_i.$$
并约定 $x=(x_1,\dots,x_p)=(x_i)_{i=1}^p$。于是主模型 (11.1) 可缩写为
$$\min_{x\in\mathbb{E}}\{F(x)=f(x)+g(x)\}.$$

## Assumption 11.1

> **Assumption 11.1.**
> (A) $g_i:\mathbb{E}_i\to(-\infty,\infty]$ is proper, closed and convex for any $i\in\{1,\dots,p\}$.
> (B) $f:\mathbb{E}\to(-\infty,\infty]$ is proper and closed, and $\mathrm{dom}(f)$ is convex; $\mathrm{dom}(g)\subseteq\mathrm{int}(\mathrm{dom}(f))$, and $f$ is differentiable over $\mathrm{int}(\mathrm{dom}(f))$.
> (C) $f$ is $L_f$-smooth over $\mathrm{int}(\mathrm{dom}(f))$ ($L_f>0$).
> (D) There exist $L_1,L_2,\dots,L_p>0$ such that for any $i\in\{1,\dots,p\}$ it holds that
> $$\|\nabla_i f(x)-\nabla_i f(x+U_i(d))\|\le L_i\|d\| \tag{11.2}$$
> for all $x\in\mathrm{int}(\mathrm{dom}(f))$ and $d\in\mathbb{E}_i$ for which $x+U_i(d)\in\mathrm{int}(\mathrm{dom}(f))$.
> (E) The optimal set of problem (11.1) is nonempty and denoted by $X^*$. The optimal value is denoted by $F_{\mathrm{opt}}$.

**逐字点评**：这五条假设几乎是 Chapter 10 的"分块翻版"。(A)(B) 保证 $g$ 和 $f$ 良态；(C) 是全局 Lipschitz 梯度；(D) 是**块 Lipschitz** 条件——只要求沿第 $i$ 块方向扰动时，第 $i$ 块梯度变化被 $L_i\|d\|$ 控制，比 (C) 弱得多（不要求跨块耦合梯度平滑）。

## Remark 11.2 (block/global Lipschitz constants)

> **Remark 11.2** (block/global Lipschitz constants). The constant $L_f$ will be called the "global Lipschitz constant," while the constants $L_1,L_2,\dots,L_p$ are the "block Lipschitz constants." Obviously, we can choose $L_i=L_f$ for all $i$ since by the definition of $L_f$, (11.2) holds for $L_i=L_f$. However, the block Lipschitz constants can be significantly smaller than the global Lipschitz constant—a fact that might have significant influence on the performance of the derived algorithms, as well as their convergence rate.

**一个值得记住的细节**：全局 $L_f$ 永远可作每块 $L_i$ 的"安全上界"，但分块常数往往**远小于** $L_f$（如 $f(x)=\frac12\|Ax\|^2$ 当 $A$ 块对角占优时）。用更小的 $L_i$ 意味着每块步长更大、收敛更快——这是块方法常碾压"整体 prox-grad"的原因。

# 11.3 The Toolbox

## 11.3.1 The Partial Gradient Mapping

回忆 Chapter 10 的梯度映射 (gradient mapping)：给定 $f,g$ 和常数 $L>0$，
$$G_{f,g,L}(x)=L\bigl(x-T_{f,g,L}(x)\bigr),$$
其中 prox-grad 映射
$$T_{f,g,L}(x)=\mathrm{prox}_{\frac1L g}\!\left(x-\frac1L\nabla f(x)\right).$$
从本节起作者**省略上标**，直接写 $T_L$ 和 $G_L$。在块变量分解的语境下，需要"部分"版本。

### 定义 11.3 · 部分 prox-grad 映射

> **Definition 11.3** (partial prox-grad mapping). Suppose that $f$ and $g_1,\dots,g_p$ satisfy properties (A) and (B) of Assumption 11.1, $L>0$, and let $i\in\{1,\dots,p\}$. Then the $i$th partial prox-grad mapping is the operator $T_L^i:\mathrm{int}(\mathrm{dom}(f))\to\mathbb{E}_i$ defined by
> $$T_L^i(x)=\mathrm{prox}_{\frac1L g_i}\!\left(x_i-\frac1L\nabla_i f(x)\right).$$

### 定义 11.4 · 部分梯度映射

> **Definition 11.4** (partial gradient mapping). Suppose that $f$ and $g_1,\dots,g_p$ satisfy properties (A) and (B) of Assumption 11.1, $L>0$, and let $i\in\{1,\dots,p\}$. Then the $i$th partial gradient mapping is the operator $G_L^i:\mathrm{int}(\mathrm{dom}(f))\to\mathbb{E}_i$ defined by
> $$G_L^i(x)=L\bigl(x_i-T_L^i(x)\bigr).$$

**为什么这两行最关键**：整体梯度映射 $G_L(x)$ 在第 $i$ 个分量上**恰好等于** $G_L^i(x)$。换句话说，把整变量的 prox-grad "切片"开来，每一片就是一个只动第 $i$ 块的局部算子。后面所有收敛性都建立在"局部步 $\to$ 全局量"的这条桥上。

补充一个特例：若某个 $g_i\equiv 0$，则 $T_L^i(x)=x_i-\frac1L\nabla_i f(x)$，于是 $G_L^i(x)=\nabla_i f(x)$——此时部分梯度映射就退化成普通的块梯度。

### Lemma 11.5 · 整体映射 = 部分映射的堆叠

> **Lemma 11.5.** Suppose that $f$ and $g_1,\dots,g_p$ satisfy properties (A) and (B) of Assumption 11.1, $L>0$, and let $i\in\{1,\dots,p\}$. Then for any $x\in\mathrm{int}(\mathrm{dom}(f))$,
> $$T_L(x)=\bigl(T_L^1(x),T_L^2(x),\dots,T_L^p(x)\bigr),\quad G_L(x)=\bigl(G_L^1(x),G_L^2(x),\dots,G_L^p(x)\bigr). \tag{11.3}$$

**证明（自己走一遍）**。关键在于 $g$ 的块可分性 + Theorem 6.6（可分离函数的 prox 也能分块）。对任意 $y\in\mathrm{dom}(f)$，
$$\mathrm{prox}_{\frac1L g}(y)=\bigl(\mathrm{prox}_{\frac1L g_i}(y_i)\bigr)_{i=1}^p.$$
于是取 $y=x-\frac1L\nabla f(x)$，有
$$\begin{aligned}
T_L(x)&=\mathrm{prox}_{\frac1L g}\!\left(x-\frac1L\nabla f(x)\right)\\
&=\left(\mathrm{prox}_{\frac1L g_i}\!\left(x_i-\frac1L\nabla_i f(x)\right)\right)_{i=1}^p\\
&=\bigl(T_L^i(x)\bigr)_{i=1}^p.
\end{aligned}$$
第二式顺理成章：
$$\begin{aligned}
G_L(x)&=L\bigl(x-T_L(x)\bigr)=L\Bigl((x_i)_{i=1}^p-\bigl(T_L^i(x)\bigr)_{i=1}^p\Bigr)\\
&=\Bigl(L(x_i-T_L^i(x))\Bigr)_{i=1}^p=\bigl(G_L^i(x)\bigr)_{i=1}^p.\quad\blacksquare
\end{aligned}$$

**结论**：(11.3) 把"整变量梯度映射"彻底拆成了 $p$ 个"块梯度映射"的笛卡尔积。这是后面 Lemma 11.11、Theorem 11.14 能把"每块的充分下降"加总成"整步充分下降"的代数基础。

### Theorem 11.6 · 平稳性条件的分块分解

> **Theorem 11.6.** Suppose that $f$ and $g_1,\dots,g_p$ satisfy properties (A) and (B) of Assumption 11.1. Then
> (a) $x^*\in\mathrm{dom}(g)$ is a stationary point of problem (11.1) if and only if
> $$-\nabla_i f(x^*)\in\partial g_i(x_i^*),\qquad i=1,2,\dots,p; \tag{11.4}$$
> (b) for any $p$ positive numbers $M_1,\dots,M_p>0$, $x^*\in\mathrm{dom}(g)$ is a stationary point of problem (11.1) if and only if
> $$G_{M_i}^i(x^*)=0,\qquad i=1,2,\dots,p.$$

**证明（自己走一遍）**。
(a) 按定义（见 Definition 3.73），$x^*\in\mathrm{dom}(g)$ 是平稳点 $\iff -\nabla f(x^*)\in\partial g(x^*)$。由于 $g(x)=\sum g_i(x_i)$ 是块可分的，其次微分也分块（乘积法则）：
$$\partial g(x^*)=\partial g_1(x_1^*)\times\cdots\times\partial g_p(x_p^*).$$
再结合 $\nabla f(x^*)=(\nabla_1 f(x^*),\dots,\nabla_p f(x^*))$，于是
$$-(\nabla_1 f(x^*),\dots,\nabla_p f(x^*))\in\partial g_1(x_1^*)\times\cdots\times\partial g_p(x_p^*)$$
等价于逐块成立 $-\nabla_i f(x^*)\in\partial g_i(x_i^*)$，即 (11.4)。

(b) 由部分梯度映射定义，
$$G_{M_i}^i(x^*)=0\iff x_i^*=T_{M_i}^i(x^*)=\mathrm{prox}_{\frac1{M_i}g_i}\!\left(x_i^*-\frac1{M_i}\nabla_i f(x^*)\right).$$
套用**第二 prox 定理 (Theorem 6.39)**，这等价于
$$\left(x_i^*-\frac1{M_i}\nabla_i f(x^*)\right)-x_i^*\in\frac1{M_i}\partial g_i(x_i^*)\;\Longleftrightarrow\;-\nabla_i f(x^*)\in\partial g_i(x_i^*).$$
因此"所有 $i$ 都有 $G_{M_i}^i(x^*)=0$" $\iff$ "所有 $i$ 都满足 (11.4)" $\iff$ 由 (a) 知 $x^*$ 平稳。$\blacksquare$

**一个值得记住的细节**：(b) 里每个块可以用**不同的** $M_i$！这就是为什么后面 CBPG/RBPG 能"每块用自己的 Lipschitz 常数 $L_i$ 当步长"——每块梯度映射归零即对应那一块的平稳性。

### Theorem 11.7 · 部分梯度映射对参数的单调性

> **Theorem 11.7** (monotonicity of the partial gradient mapping). Suppose that $f$ and $g_1,\dots,g_p$ satisfy properties (A) and (B) of Assumption 11.1, and let $i\in\{1,\dots,p\}$. Suppose that $L_1\ge L_2>0$. Then
> $$\|G_{L_1}^i(x)\|\ge\|G_{L_2}^i(x)\|\quad\text{and}\quad \frac{\|G_{L_1}^i(x)\|}{L_1}\le\frac{\|G_{L_2}^i(x)\|}{L_2}$$
> for any $x\in\mathrm{int}(\mathrm{dom}(f))$.

**作者注**：这一定理教材**没有给证明**，只说"几乎是 Theorem 10.9 的字面重复"——把 $i$ 固定、其余块视作常数，论证与整体梯度映射的单调性平行。后面 Lemma 11.13、Theorem 11.14 会用到其核心推论：$\|G_{L_{\min}}^i(x)\|\le\|G_{L_i}^i(x)\|$（步长更小不会让块梯度映射变大）。

## 11.3.2 The Block Descent Lemma

这是 Chapter 5 的 descent lemma (Lemma 5.7) 的**块状版本**，证明也几乎一模一样。

### Lemma 11.8 · 块下降引理

> **Lemma 11.8** (block descent lemma). Let $f:\mathbb{E}_1\times\cdots\times\mathbb{E}_p\to(-\infty,\infty]$ be a proper function whose domain $\mathrm{dom}(f)$ is convex. Assume that $f$ is differentiable over $\mathrm{int}(\mathrm{dom}(f))$. Let $i\in\{1,\dots,p\}$. Suppose that there exists $L_i>0$ for which
> $$\|\nabla_i f(y)-\nabla_i f(y+U_i(d))\|\le L_i\|d\|$$
> for any $y\in\mathrm{int}(\mathrm{dom}(f))$ and $d\in\mathbb{E}_i$ for which $y+U_i(d)\in\mathrm{int}(\mathrm{dom}(f))$. Then
> $$f(x+U_i(d))\le f(x)+\langle\nabla_i f(x),d\rangle+\frac{L_i}{2}\|d\|^2 \tag{11.*}$$
> for any $x\in\mathrm{int}(\mathrm{dom}(f))$ and $d\in\mathbb{E}_i$ for which $x+U_i(d)\in\mathrm{int}(\mathrm{dom}(f))$.

**证明（自己走一遍）**。令 $x(t)=x+tU_i(d)$，$g(t)=f(x(t))$。由微积分基本定理，
$$\begin{aligned}
f(x(1))-f(x)&=\int_0^1\langle\nabla f(x(t)),\,U_i(d)\rangle\,dt
=\int_0^1\langle\nabla_i f(x(t)),\,d\rangle\,dt\\
&=\langle\nabla_i f(x),d\rangle+\int_0^1\langle\nabla_i f(x(t))-\nabla_i f(x),\,d\rangle\,dt.
\end{aligned}$$
于是（用 Cauchy–Schwarz 与块 Lipschitz $\|\nabla_i f(x(t))-\nabla_i f(x)\|\le tL_i\|d\|$）
$$\begin{aligned}
\bigl|f(x(1))-f(x)-\langle\nabla_i f(x),d\rangle\bigr|
&\le\int_0^1\|\nabla_i f(x(t))-\nabla_i f(x)\|\cdot\|d\|\,dt\\
&\le\int_0^1 tL_i\|d\|^2\,dt=\frac{L_i}{2}\|d\|^2.
\end{aligned}$$
去掉绝对值即得 (11.*)。$\blacksquare$

**一句话总结**：只沿第 $i$ 块走一步 $U_i(d)$，函数值二次上界仅由第 $i$ 块 Lipschitz 常数 $L_i$ 决定——再次印证"分块 Lipschitz 比全局 Lipschitz 省钱"。

## 11.3.3 Sufficient Decrease

所有本章方法的基本一步，都是对**某一给定块**做一次 prox-grad 步。给定 $x\in\mathbb{E}$ 和块指标 $i$，新向量 $x^+$ 满足
$$x^+_j=\begin{cases}x_j,&j\ne i,\\ T_{L_i}^i(x),&j=i,\end{cases}$$
紧凑地写为
$$x^+=x+U_i\bigl(T_{L_i}^i(x)-x_i\bigr).$$
这就是块充分下降引理的舞台。

### Lemma 11.9 · 块充分下降引理

> **Lemma 11.9** (block sufficient decrease lemma). Suppose that $f$ and $g_1,\dots,g_p$ satisfy properties (A) and (B) of Assumption 11.1. Let $i\in\{1,\dots,p\}$. Suppose that there exists $L_i>0$ for which
> $$\|\nabla_i f(y)-\nabla_i f(y+U_i(d))\|\le L_i\|d\|$$
> for any $y\in\mathrm{int}(\mathrm{dom}(f))$ and $d\in\mathbb{E}_i$ for which $y+U_i(d)\in\mathrm{int}(\mathrm{dom}(f))$. Then
> $$F(x)-F\bigl(x+U_i(T_{L_i}^i(x)-x_i)\bigr)\ge\frac{1}{2L_i}\bigl\|G_{L_i}^i(x)\bigr\|^2 \tag{11.6}$$
> for all $x\in\mathrm{int}(\mathrm{dom}(f))$.

**证明（自己走一遍）**。记 $x^+=x+U_i(T_{L_i}^i(x)-x_i)$。先用块下降引理 (Lemma 11.8)：
$$f(x^+)\le f(x)+\langle\nabla_i f(x),\,T_{L_i}^i(x)-x_i\rangle+\frac{L_i}{2}\|T_{L_i}^i(x)-x_i\|^2. \tag{11.7}$$
再用**第二 prox 定理 (Theorem 6.39)**：因 $T_{L_i}^i(x)=\mathrm{prox}_{\frac1{L_i}g_i}(x_i-\frac1{L_i}\nabla_i f(x))$，
$$\left\langle x_i-\frac1{L_i}\nabla_i f(x)-T_{L_i}^i(x),\,x_i-T_{L_i}^i(x)\right\rangle\le\frac1{L_i}g_i(x_i)-\frac1{L_i}g_i(T_{L_i}^i(x)),$$
即
$$\langle\nabla_i f(x),\,T_{L_i}^i(x)-x_i\rangle\le -L_i\|T_{L_i}^i(x)-x_i\|^2+g_i(x_i)-g_i(x^+_i).$$
代回 (11.7)，并加上"其余块没动" $\sum_{j\ne i}g_j(x^+_j)=\sum_{j\ne i}g_j(x_j)$，得
$$F(x^+)\le F(x)-\frac{L_i}{2}\|T_{L_i}^i(x)-x_i\|^2. \tag{11.8}$$
用部分梯度映射定义 $G_{L_i}^i(x)=L_i(x_i-T_{L_i}^i(x))$，代入 (11.8) 即得 (11.6)。$\blacksquare$

### Remark 11.10

> **Remark 11.10.** Under the setting of Lemma 11.9, if we denote $x^+=x+U_i(T_{L_i}^i(x)-x_i)$, then the sufficient decrease condition (11.6) can be written in the following form:
> $$F(x)-F(x^+)\ge\frac{L_i}{2}\|x-x^+\|^2.$$

**为什么这一行很漂亮**：它把"只改一块"的步长 $\|T_{L_i}^i(x)-x_i\|^2$ 翻译成了"整步位移" $\|x-x^+\|^2$。注意 $x-x^+$ 只有第 $i$ 块非零，所以 $\|x-x^+\|^2=\|T_{L_i}^i(x)-x_i\|^2$。后面做 CBPG 时，要把一个迭代内 $p$ 个子步的下降量加总，用这个整步形式特别顺手。

# 11.4 The Cyclic Block Proximal Gradient Method

在 **cyclic block proximal gradient (CBPG)** 里，块按**固定循环顺序** $1,2,\dots,p,1,2,\dots$ 依次更新，每块做一次 prox-grad 步。第 $k$ 次迭代记作 $x^k=(x_1^k,\dots,x_p^k)$，每迭代含 $p$ 个"子迭代"，引入辅助子序列：

$$\begin{aligned}
x^{k,0}&=x^k=(x_1^k,x_2^k,\dots,x_p^k),\\
x^{k,1}&=(x_1^{k+1},x_2^k,\dots,x_p^k),\\
x^{k,2}&=(x_1^{k+1},x_2^{k+1},x_3^k,\dots,x_p^k),\\
&\ \vdots\\
x^{k,p}&=x^{k+1}=(x_1^{k+1},\dots,x_p^{k+1}).
\end{aligned}$$

通用公式（"已更新块"与"未更新块"分开）：
$$x^{k,i}=\sum_{j=1}^{i}U_j(x_j^{k+1})+\sum_{j=i+1}^{p}U_j(x_j^k). \tag{11.8}$$

## The CBPG Method

> **The Cyclic Block Proximal Gradient (CBPG) Method**
> **Initialization:** pick $x^0=(x_1^0,\dots,x_p^0)\in\mathrm{int}(\mathrm{dom}(f))$.
> **General step:** for any $k=0,1,2,\dots$ execute the following steps:
> - set $x^{k,0}=x^k$;
> - for $i=1,2,\dots,p$, compute
>   $$x^{k,i}=x^{k,i-1}+U_i\bigl(T_{L_i}^i(x^{k,i-1})-x_i^{k,i-1}\bigr);$$
> - set $x^{k+1}=x^{k,p}$.

**逐字点评**：循环顺序让每块在一个外迭代里**恰好被更新一次**，且每块用自己的 $L_i$ 当步长（Remark 11.2 的"块 Lipschitz 更小、步更大"）。

## 11.4.1 Convergence Analysis of the CBPG Method—The Nonconvex Case

### Lemma 11.11 · CBPG 的充分下降（版本 I）

> **Lemma 11.11** (sufficient decrease of the CBPG method—version I). Suppose that Assumption 11.1 holds, and let $\{x^k\}_{k\ge0}$ be the sequence generated by the CBPG method for solving problem (11.1) with the auxiliary sequences defined in (11.8). Then
> (a) for all $k\ge0$ and $j\in\{0,1,\dots,p-1\}$ it holds that
> $$F(x^{k,j})-F(x^{k,j+1})\ge\frac{1}{2L_{j+1}}\|G_{L_{j+1}}^{j+1}(x^{k,j})\|^2, \tag{11.9}$$
> or equivalently,
> $$F(x^{k,j})-F(x^{k,j+1})\ge\frac{L_{j+1}}{2}\|x^{k,j}-x^{k,j+1}\|^2; \tag{11.10}$$
> (b) for all $k\ge0$,
> $$F(x^k)-F(x^{k+1})\ge\frac{L_{\min}}{2}\|x^k-x^{k+1}\|^2, \tag{11.11}$$
> where $L_{\min}=\min_{i=1,\dots,p}L_i$.

**证明（自己走一遍）**。
(a) 在子步 $(k,j)\to(k,j+1)$ 里，被更新的是第 $j+1$ 块，且用的是 $x^{k,j}$ 处的状态。直接套 Lemma 11.9（取 $x=x^{k,j}$、取 $i=j+1$）即得 (11.9)。(11.10) 由恒等式 $\|x^{k,j}-x^{k,j+1}\|^2=\|T_{L_{j+1}}^{j+1}(x^{k,j})-x_{j+1}^{k,j+1}\|^2=\frac1{L_{j+1}^2}\|G_{L_{j+1}}^{j+1}(x^{k,j})\|^2$ 推出。

(b) 把 (11.10) 对 $j=0,\dots,p-1$ 求和：
$$\begin{aligned}
F(x^k)-F(x^{k+1})&=\sum_{j=0}^{p-1}\bigl(F(x^{k,j})-F(x^{k,j+1})\bigr)\\
&\ge\sum_{j=0}^{p-1}\frac{L_{j+1}}{2}\|x_j^{k+1}-x_{j+1}^{k+1}\|^2\\
&\ge\frac{L_{\min}}{2}\sum_{j=0}^{p-1}\|x_{j+1}^{k+1}-x_{j+1}^{k+1}\|^2\\
&=\frac{L_{\min}}{2}\|x^k-x^{k+1}\|^2.\quad\blacksquare
\end{aligned}$$

**结论**：一个外迭代的总下降，被"最小块 Lipschitz 常数 $L_{\min}$" 乘上"整步位移平方"控制。这把局部下降升级成了全局下降。

### Corollary 11.12 · 函数值单调不增

> **Corollary 11.12** (monotonicity of the sequence generated by the CBPG method). Under the setting of Lemma 11.11, for any $k\ge0$, $F(x^{k+1})\le F(x^k)$, and equality holds if and only if $x^k=x^{k+1}$.

这是 Lemma 11.11(b) 的直接推论：若 $F(x^{k+1})=F(x^k)$ 则 $\|x^k-x^{k+1}\|=0$，即 $x^k=x^{k+1}$；反之亦然。

### Lemma 11.13 · CBPG 的充分下降（版本 II，用整体梯度映射）

> **Lemma 11.13** (sufficient decrease of the CBPG method—version II). Suppose that Assumption 11.1 holds, and let $\{x^k\}_{k\ge0}$ be the sequence generated by the CBPG method for solving problem (11.1). Then for any $k\ge0$,
> $$F(x^k)-F(x^{k+1})\ge\frac{C}{p}\|G_{L_{\min}}(x^k)\|^2, \tag{11.12}$$
> where
> $$C=\frac{L_{\min}}{2\bigl(L_f+2L_{\max}+\sqrt{L_{\min}L_{\max}}\bigr)^2} \tag{11.13}$$
> and $L_{\min}=\min_i L_i,\;L_{\max}=\max_i L_i$.

**证明（自己走一遍，结构版）**。对任意 $i\in\{0,\dots,p-1\}$，由 (11.9) 与 (11.14)：
$$F(x^k)-F(x^{k+1})\ge F(x^{k,i})-F(x^{k,i+1})\ge\frac{1}{2L_{i+1}}\|G_{L_{i+1}}^{i+1}(x^{k,i})\|^2. \tag{11.14}$$
把 $\|G_{L_{i+1}}^{i+1}(x^k)\|$ 与 $\|G_{L_{i+1}}^{i+1}(x^{k,i})\|$ 用三角不等式 + (11.3) + Lemma 10.10(a) 连起来：
$$\begin{aligned}
\|G_{L_{i+1}}^{i+1}(x^k)\|
&\le\|G_{L_{i+1}}(x^k)-G_{L_{i+1}}(x^{k,i})\|+\|G_{L_{i+1}}^{i+1}(x^{k,i})\|\\
&\le(2L_{i+1}+L_f)\|x^k-x^{k,i}\|+\|G_{L_{i+1}}^{i+1}(x^{k,i})\|.
\end{aligned}$$
又因 $\|x^k-x^{k,i}\|^2\le\|x^k-x^{k+1}\|^2$，且由 (11.11)、(11.14) 可分别把 $\|x^k-x^{k+1}\|$ 和 $\|G_{L_{i+1}}^{i+1}(x^{k,i})\|$ 都控制成 $\sqrt{F(x^k)-F(x^{k+1})}$ 的倍数。合并后得到形如
$$\|G_{L_{i+1}}^{i+1}(x^k)\|\le K\cdot\sqrt{F(x^k)-F(x^{k+1})},\qquad K=\frac{L_f+2L_{\max}+\sqrt{L_{\min}L_{\max}}}{\sqrt{L_{\min}}}.$$
（系数里的 $2$ 来自 (11.11) 与 (11.14) 两处 $\tfrac12$ 的协同，最终常数精确为 (11.13) 给出的 $C$。）

由于 $L_{\min}\le L_{i+1}$，由 Theorem 11.7 的单调性，$\|G_{L_{\min}}^{i+1}(x^k)\|\le\|G_{L_{i+1}}^{i+1}(x^k)\|$。于是
$$\begin{aligned}
\|G_{L_{\min}}(x^k)\|^2&=\sum_{i=0}^{p-1}\|G_{L_{\min}}^{i+1}(x^k)\|^2
\le\sum_{i=0}^{p-1}\|G_{L_{i+1}}^{i+1}(x^k)\|^2\\
&\le p\cdot\frac{\bigl(L_f+2L_{\max}+\sqrt{L_{\min}L_{\max}}\bigr)^2}{L_{\min}}\bigl(F(x^k)-F(x^{k+1})\bigr).
\end{aligned}$$
反解即得 (11.12)。$\blacksquare$

**一个值得记住的细节**：版本 I (11.11) 用位移 $\|x^k-x^{k+1}\|^2$，版本 II (11.12) 用梯度映射 $\|G_{L_{\min}}(x^k)\|^2$。后者关键在"梯度映射归零 $\iff$ 平稳点"（Theorem 10.7(b)），直接连通收敛到平稳点。

### Theorem 11.14 · CBPG 非凸情形收敛

> **Theorem 11.14** (convergence of the CBPG method—nonconvex case). Suppose that Assumption 11.1 holds, and let $\{x^k\}_{k\ge0}$ be the sequence generated by the CBPG method for solving problem (11.1). Denote $L_{\min}=\min_i L_i$, $L_{\max}=\max_i L_i$, and let $C$ be given in (11.13). Then
> (a) $G_{L_{\min}}(x^k)\to0$ as $k\to\infty$;
> (b) $\displaystyle\min_{n=0,1,\dots,k}\|G_{L_{\min}}(x^n)\|\le\frac{\sqrt{p(F(x^0)-F_{\mathrm{opt}})}}{\sqrt{C}\,(k+1)}$;
> (c) all limit points of the sequence $\{x^k\}_{k\ge0}$ are stationary points of problem (11.1).

**证明（自己走一遍）**。
(a) 由 Corollary 11.12，$\{F(x^k)\}$ 单调不增；又由 Assumption 11.1(E) 下有界（$F_{\mathrm{opt}}$ 是下界），故收敛。于是 $F(x^k)-F(x^{k+1})\to0$。结合 (11.12) 立即得 $\|G_{L_{\min}}(x^k)\|\to0$。

(b) 由 Lemma 11.13，$F(x^n)-F(x^{n+1})\ge\frac{C}{p}\|G_{L_{\min}}(x^n)\|^2$。对 $n=0,\dots,k$ 求和：
$$F(x^0)-F(x^{k+1})\ge\frac{C}{p}\sum_{n=0}^{k}\|G_{L_{\min}}(x^n)\|^2\ge\frac{C}{p}(k+1)\min_{n=0,\dots,k}\|G_{L_{\min}}(x^n)\|^2.$$
用 $F(x^{k+1})\ge F_{\mathrm{opt}}$ 并开方即得 (b)。

(c) 设 $\bar x$ 是 $\{x^k\}$ 的一个极限点，取子列 $x^{k_j}\to\bar x$。对任意 $j$：
$$\|G_{L_{\min}}(\bar x)\|\le\|G_{L_{\min}}(x^{k_j})-G_{L_{\min}}(\bar x)\|+\|G_{L_{\min}}(x^{k_j})\|\le(2L_{\min}+L_f)\|x^{k_j}-\bar x\|+\|G_{L_{\min}}(x^{k_j})\|,$$
其中最后一步用了 Lemma 10.10(a)。令 $j\to\infty$，右边第一项 $\to0$（因 $x^{k_j}\to\bar x$），第二项 $\to0$（由 (a)），故 $\|G_{L_{\min}}(\bar x)\|=0$。据 Theorem 10.7(b)，这等价于 $\bar x$ 是问题 (11.1) 的平稳点。$\blacksquare$

**结论**：即使 $f$ 不凸，CBPG 也保证函数值单调下降、梯度映射趋于零、任何聚点都是平稳点。(b) 是**次优性**的 $O(1/\sqrt{k})$ 界（最小梯度映射范数），非函数值 $O(1/k)$——那是凸情形才有的，见下节。

## 11.4.2 Convergence Analysis of the CBPG Method—The Convex Case

本节在 $f$ 凸、且 $F$ 的水平集相对 $X^*$ 有界的前提下，拿到函数值的 $O(1/k)$ 速率。

### Assumption 11.15

> **Assumption 11.15.**
> (A) $f$ is convex.
> (B) For any $\alpha>0$, there exists $R_\alpha>0$ such that
> $$\max_{x,x^*\in\mathbb{E}}\{\|x-x^*\|:F(x)\le\alpha,\ x^*\in X^*\}\le R_\alpha.$$

**逐字点评**：(B) 是说"在任一有限目标值水平以下，解与最优集的距离有统一上界"。这不是平凡条件——它排除了"水平集无界且最优集在无穷远"的退化情形。它比"水平集有界"略弱，但够用了。

### Lemma 11.16 · 凸情形下的递归不等式

> **Lemma 11.16.** Suppose that Assumptions 11.1 and 11.15 hold. Let $\{x^k\}_{k\ge0}$ be the sequence generated by the CBPG method for solving problem (11.1). Then for any $k\ge0$,
> $$F(x^k)-F(x^{k+1})\ge\frac{L_{\min}}{2p(L_f+L_{\max})^2R^2}(F(x^{k+1})-F_{\mathrm{opt}})^2,$$
> where $R=R_{F(x^0)}$, $L_{\max}=\max_j L_j$, and $L_{\min}=\min_j L_j$.

**证明（自己走一遍，结构版）**。取 $x^*\in X^*$。对 CBPG 的每一步 $j$，由第二 prox 定理可证（代入 $y=x_j^*$）：
$$g_j(x_j^*)\ge g_j(x_j^{k+1})+L_j\left\langle x_j^k-\frac1{L_j}\nabla_j f(x^{k,j-1})-x_j^{k+1},\,x_j^*-x_j^{k+1}\right\rangle.$$
对 $j=1,\dots,p$ 求和得到 (11.17)。再用 $f$ 的凸性把 $F(x^{k+1})-F(x^*)$ 上界成块量内积和，借 $f$ 的全局 $L_f$-smooth 与块 $L_{\max}$ 把梯度差控制在 $(L_f+L_{\max})\|x^{k+1}-x^k\|$，经 Cauchy–Schwarz + 三角不等式推出
$$\begin{aligned}
(F(x^{k+1})-F(x^*))^2&\le p(L_f+L_{\max})^2\|x^{k+1}-x^k\|^2\sum_{j=1}^{p}\|x_j^{k+1}-x_j^*\|^2\\
&=p(L_f+L_{\max})^2\|x^{k+1}-x^k\|^2\|x^{k+1}-x^*\|^2\\
&\le p(L_f+L_{\max})^2R^2\|x^{k+1}-x^k\|^2,
\end{aligned}$$
最后一步用 Assumption 11.15(B)（单调性与 $R=R_{F(x^0)}$）。再结合 (11.11) 消去 $\|x^{k+1}-x^k\|^2$ 即得 Lemma 11.16。$\blacksquare$

### Lemma 11.17 · 标量递归不等式的通用引理

> **Lemma 11.17.** Let $\{a_k\}_{k\ge0}$ be a nonnegative sequence of real numbers satisfying
> $$a_k-a_{k+1}\ge\frac{1}{\gamma}a_{k+1}^2,\qquad k=0,1,\dots, \tag{11.19}$$
> for some $\gamma>0$. Then for any $n\ge2$,
> $$a_n\le\max\left\{\left(\frac12\right)^{(n-1)/2}a_0,\ \frac{4\gamma}{n-1}\right\}. \tag{11.20}$$
> In addition, for any $\varepsilon>0$, if $n\ge2$ satisfies
> $$n\ge\max\left\{\frac{2}{\log(2)}\bigl(\log(a_0)+\log(1/\varepsilon)\bigr),\ \frac{4\gamma}{\varepsilon}\right\}+1,$$
> then $a_n\le\varepsilon$.

**证明（自己走一遍）**。若 $a_n=0$ 则平凡。否则 $a_1,\dots,a_{n-1}>0$。对任意 $k$：
$$\frac1{a_{k+1}}-\frac1{a_k}=\frac{a_k-a_{k+1}}{a_k a_{k+1}}\ge\frac{(1/\gamma)a_{k+1}^2}{a_k a_{k+1}}=\frac1\gamma\frac{a_{k+1}}{a_k}.$$
对每个 $k$ 分两种情况：
- (i) $\frac{a_{k+1}}{a_k}\le\frac12$；
- (ii) $\frac{a_{k+1}}{a_k}>\frac12$，此时 $\frac1{a_{k+1}}-\frac1{a_k}\ge\frac1{2\gamma}$。

若 $n$ 为偶数且至少有 $n/2$ 个下标落入 (ii)，则
$$\frac1{a_n}-\frac1{a_0}\ge\frac{n}{2}\cdot\frac1{2\gamma}=\frac{n}{4\gamma}\;\Longrightarrow\;a_n\le\frac{4\gamma}{n}.$$
否则至少有 $n/2$ 个下标落入 (i)，从而 $a_n\le(1/2)^{n/2}a_0$。故对偶数 $n$：
$$a_n\le\max\left\{(1/2)^{n/2}a_0,\ \frac{4\gamma}{n}\right\}.$$
对奇数 $n\ge3$，$a_n\le a_{n-1}$，从而换成 $(n-1)/2$ 与 $n-1$ 的版本，得到 (11.20)。要使 $a_n\le\varepsilon$，只需 (11.20) 右端 $\le\varepsilon$，即 $(1/2)^{(n-1)/2}a_0\le\varepsilon$ 且 $4\gamma/(n-1)\le\varepsilon$，解得 $n$ 的两条下界，取 max 加 1 即可。$\blacksquare$

**一个值得记住的细节**：这个引理和 Lemma 10.70 是"亲兄弟"，只是递归式从 $a_k-a_{k+1}\ge c\,a_{k+1}$ 换成了 $a_k-a_{k+1}\ge c\,a_{k+1}^2$。平方让收敛从线性变成 $O(1/k)$。

### Theorem 11.18 · CBPG 的 $O(1/k)$ 速率

> **Theorem 11.18** ($O(1/k)$ rate of convergence of CBPG). Suppose that Assumptions 11.1 and 11.15 hold. Let $\{x^k\}_{k\ge0}$ be the sequence generated by the CBPG method for solving problem (11.1). For any $k\ge2$,
> $$F(x^k)-F_{\mathrm{opt}}\le\max\left\{\left(\frac12\right)^{(k-1)/2}(F(x^0)-F_{\mathrm{opt}}),\ \frac{8p(L_f+L_{\max})^2R^2}{L_{\min}(k-1)}\right\}. \tag{11.24}$$
> In addition, if $n\ge2$ satisfies
> $$n\ge\max\left\{\frac{2}{\log(2)}\bigl(\log(F(x^0)-F_{\mathrm{opt}})+\log(1/\varepsilon)\bigr),\ \frac{8p(L_f+L_{\max})^2R^2}{L_{\min}\varepsilon}\right\}+1,$$
> then $F(x^n)-F_{\mathrm{opt}}\le\varepsilon$.

**证明（自己走一遍）**。令 $a_k=F(x^k)-F_{\mathrm{opt}}$。由 Lemma 11.16，
$$a_k-a_{k+1}\ge\frac{1}{D}a_{k+1}^2,\qquad D=\frac{2p(L_f+L_{\max})^2R^2}{L_{\min}}.$$
直接套 Lemma 11.17（取 $\gamma=D$）即得 (11.24) 与复杂度声明。$\blacksquare$

**结论**：凸情形拿到的是函数值的 $O(1/k)$ 次优性界——这是一阶方法的"标准成绩"。注意常数里 $R^2$（水平集直径）和 $(L_f+L_{\max})^2$ 都平方出现，所以条件数差时常数会很难看。

### Remark 11.19 · 指标顺序

> **Remark 11.19** (index order). The analysis of the CBPG method was done under the assumption that the index selection strategy is cyclic. However, it is easy to see that the same analysis, and consequently the main results (Theorems 11.14 and 11.18), hold for any index selection strategy in which each block is updated exactly once between consecutive iterations. One example of such an index selection strategy is the "cyclic shuffle" order in which the order of blocks is picked at the beginning of each iteration by a random permutation; in a sense, this is a "quasi-randomized" strategy. In the next section we will study a fully randomized approach.

**作者注**：这是 Beck 在埋钩子——循环顺序不是本质的，"每块每轮恰好更新一次"才是。下一节就是把"每轮更新哪一块"彻底随机化。

### Theorem 11.20 · 块 Lipschitz $\Rightarrow$ 全局 $L$-smooth（可微凸情形）

> **Theorem 11.20.** Let $\varphi:\mathbb{E}\to\mathbb{R}$ ($\mathbb{E}=\mathbb{E}_1\times\cdots\times\mathbb{E}_p$) be a convex function satisfying the following assumptions:
> (A) $\varphi$ is differentiable over $\mathbb{E}$;
> (B) there exist $L_1,\dots,L_p>0$ such that for any $i\in\{1,\dots,p\}$ it holds that
> $$\|\nabla_i\varphi(x)-\nabla_i\varphi(x+U_i(d))\|\le L_i\|d\|$$
> for all $x\in\mathbb{E}$ and $d\in\mathbb{E}_i$.
> Then $\varphi$ is $L$-smooth with $L=L_1+\cdots+L_p$.

**证明（自己走一遍）**。对固定 $y\in\mathbb{E}$ 定义
$$f(x)=\varphi(x)-\varphi(y)-\langle\nabla\varphi(y),x-y\rangle. \tag{11.25}$$
$f$ 同样满足 (A)(B)，且由 $\varphi$ 凸知 $f$ 凸且非负。套 Lemma 11.9（取全部 $g_i\equiv0$）：对所有 $i$ 与 $x$，
$$f(x)-f\!\left(x-\frac1{L_i}U_i(\nabla_i f(x))\right)\ge\frac1{2L_i}\|\nabla_i f(x)\|^2.$$
结合 $f\ge0$ 得 $f(x)\ge\frac1{2L_i}\|\nabla_i f(x)\|^2$。对 $i$ 取最大（再取平均）可推出
$$f(x)\ge\frac{1}{2(\sum_j L_j)}\|\nabla f(x)\|^2=\frac{1}{2(\sum_j L_j)}\|\nabla\varphi(x)-\nabla\varphi(y)\|^2.$$
代回 (11.25) 的表达式：
$$\varphi(x)\ge\varphi(y)+\langle\nabla\varphi(y),x-y\rangle+\frac{1}{2(\sum_j L_j)}\|\nabla\varphi(x)-\nabla\varphi(y)\|^2.$$
这对任意 $x,y$ 成立，据 **Theorem 5.8**（平滑性等价条件 (i)$\iff$(iii)）即知 $\varphi$ 是 $(\sum_j L_j)$-smooth。$\blacksquare$

**前向指针 / 一个值得记住的细节**：这告诉我们——当 $f$ 是**全空间可微凸**时，块 Lipschitz 条件 (D) 已经**蕴含**全局 $L_f$-smooth (C)，其中 $L_f=\sum L_i$。所以在这种情况下 Assumption 11.1(C) 可以**直接删掉**。这是块结构送给我们的"免费午餐"。

# 11.5 The Randomized Block Proximal Gradient Method

本节把"每轮更新哪一块"彻底随机化：每块以均匀分布被选中做一次 prox-grad 步。分析在 Assumption 11.21 下进行（注意这里 $f$ 被假设为凸）。

### Assumption 11.21

> **Assumption 11.21.**
> (A) $g_i:\mathbb{E}_i\to(-\infty,\infty]$ is proper, closed and convex for any $i\in\{1,\dots,p\}$.
> (B) $f:\mathbb{E}\to(-\infty,\infty]$ is proper, closed and convex, $\mathrm{dom}(g)\subseteq\mathrm{int}(\mathrm{dom}(f))$, and $f$ is differentiable over $\mathrm{int}(\mathrm{dom}(f))$.
> (C) There exist $L_1,\dots,L_p>0$ such that for any $i\in\{1,\dots,p\}$ it holds that
> $$\|\nabla_i f(x)-\nabla_i f(x+U_i(d))\|\le L_i\|d\|$$
> for all $x\in\mathrm{int}(\mathrm{dom}(f))$ and $d\in\mathbb{E}_i$ for which $x+U_i(d)\in\mathrm{int}(\mathrm{dom}(f))$.
> (D) The optimal set of problem (11.1) is nonempty and denoted by $X^*$. The optimal value is denoted by $F_{\mathrm{opt}}$.

**逐字点评**：与 Assumption 11.1 唯一本质区别是 (B) 里 $f$ **必须凸**（随机方法靠期望递推，凸性绕不开）。

## The RBPG Method

> **The Randomized Block Proximal Gradient (RBPG) Method**
> **Initialization:** pick $x^0=(x_1^0,\dots,x_p^0)\in\mathrm{int}(\mathrm{dom}(f))$.
> **General step:** for any $k=0,1,2,\dots$ execute the following steps:
> (a) pick $i_k\in\{1,\dots,p\}$ randomly via a uniform distribution;
> (b) $x^{k+1}=x^k+U_{i_k}\bigl(T_{i_k}^{L_{i_k}}(x^k)-x_{i_k}^k\bigr)$.

### Remark 11.22

> **Remark 11.22.** Step (b) of the algorithm can also be written as
> $$x^{k+1}=x^k-\frac1{L_{i_k}}U_{i_k}\bigl(G_{L_{i_k}}^{i_k}(x^k)\bigr).$$

**为什么这一行最关键**：它把 RBPG 的一步显式写成"沿第 $i_k$ 块方向、步长 $1/L_{i_k}$、方向是块梯度映射 $G$"。和第 11.3.1 的定义完美呼应——随机方法只是把"选哪块"交给了骰子。

### Theorem 11.23 · RBPG 的充分下降

> **Theorem 11.23** (sufficient decrease of the RBPG method). Suppose that Assumption 11.21 holds, and let $\{x^k\}_{k\ge0}$ be the sequence generated by the RBPG method. Then for any $k\ge0$,
> $$F(x^k)-F(x^{k+1})\ge\frac{1}{2L_{i_k}}\|G_{L_{i_k}}^{i_k}(x^k)\|^2.$$

**证明（自己走一遍）**。直接套 Lemma 11.9，取 $x=x^k$、取 $i=i_k$ 即得。$\blacksquare$

### Remark 11.24

> **Remark 11.24.** A direct consequence of Theorem 11.23 is that the sequence of function values $\{F(x^k)\}_{k\ge0}$ generated by the RBPG method is nonincreasing. As a result, it is also correct that the sequence of expected function values $\{\mathbb{E}_{i_0,\dots,i_{k-1}}(F(x^k))\}_{k\ge0}$ is nonincreasing.

**一个值得记住的细节**：随机方法的"函数值单调不增"是**逐样本**成立的（不仅仅在期望上），这比很多随机梯度法（如 SGD）强得多——因为每一步都是一次完整的块 prox-grad 步，不是有偏梯度估计。

## 记号与加权范数

分析 RBPG 需要一套新工具：

- $\xi_{k-1}\equiv\{i_0,i_1,\dots,i_{k-1}\}$ 是多重随机变量；
- 在基础欧氏范数之外，定义**加权范数**及其对偶：
  $$\|x\|_L\equiv\sqrt{\sum_{i=1}^{p}L_i\|x_i\|^2},\qquad \|x\|_{L,*}\equiv\sqrt{\sum_{i=1}^{p}\frac1{L_i}\|x_i\|^2};$$
- 定义一种"混合梯度映射"
  $$K_G(x)=\bigl(G_{L_1}^1(x),G_{L_2}^2(x),\dots,G_{L_p}^p(x)\bigr). \tag{11.26}$$
  显然若 $L_1=\cdots=L_p=L$，则 $K_G(x)=G_L(x)$。

**逐字点评**：加权范数 $\|x\|_L$ 把每块按自己的 $L_i$ 加权——这正是"每块步长不同"在几何上的忠实体现。它的对偶 $\|x\|_{L,*}$ 会在后面取期望时自然出现。

### Theorem 11.25 · RBPG 的 $O(1/k)$ 速率

> **Theorem 11.25** ($O(1/k)$ rate of convergence of the RBPG method). Suppose that Assumption 11.21 holds and that $f$ is convex. Let $\{x^k\}_{k\ge0}$ be the sequence generated by the RBPG method for solving problem (11.1). Let $x^*\in X^*$. Then for any $k\ge0$,
> $$\mathbb{E}_{\xi_k}(F(x^{k+1}))-F_{\mathrm{opt}}\le\frac{p}{p+k+1}\left[\frac12\|x^0-x^*\|_L^2+F(x^0)-F_{\mathrm{opt}}\right]. \tag{11.27}$$

**证明（自己走一遍，结构版）**。记 $r_k\equiv\|x^k-x^*\|_L$。由 Remark 11.22 的更新式：
$$\begin{aligned}
r_{k+1}^2&=\left\|x^k-\frac1{L_{i_k}}U_{i_k}\!\bigl(G_{L_{i_k}}^{i_k}(x^k)\bigr)-x^*\right\|_L^2\\
&=\|x^k-x^*\|_L^2-2\left\langle G_{L_{i_k}}^{i_k}(x^k),\,x_{i_k}^k-x_{i_k}^*\right\rangle+\frac1{L_{i_k}}\|G_{L_{i_k}}^{i_k}(x^k)\|^2\\
&=r_k^2-2\langle G_{L_{i_k}}^{i_k}(x^k),\,x_{i_k}^k-x_{i_k}^*\rangle+\frac1{L_{i_k}}\|G_{L_{i_k}}^{i_k}(x^k)\|^2.
\end{aligned}$$
对随机指标 $i_k$ 取期望（用 $i_k$ 均匀、且 (11.26) 的定义），得到
$$\mathbb{E}_{i_k}\!\left[\frac12 r_{k+1}^2\right]=\frac12 r_k^2-\frac1p\langle K_G(x^k),x^k-x^*\rangle+\frac1{2p}\|K_G(x^k)\|_{L,*}^2. \tag{11.28}$$
另一方面，由块下降引理 (Lemma 11.8) 与第二 prox 定理可得（类似 Lemma 11.13 的推导，但加期望）：
$$\mathbb{E}_{i_k}(F(x^{k+1}))\le f(x^k)-\frac1p\sum_{i=1}^p\frac1{L_i}\langle\nabla_i f(x^k),G_{L_i}^i(x^k)\rangle+\frac1{2p}\|K_G(x^k)\|_{L,*}^2+\mathbb{E}_{i_k}(g(x^{k+1})). \tag{11.29}$$
把第二 prox 定理对随机块求和，再与 (11.29) 合并，并利用 $f$ 凸的梯度不等式 $\langle\nabla f(x^k),x^*-x^k\rangle\le f(x^*)-f(x^k)$，最终整理出递推：
$$\mathbb{E}_{i_k}\!\left[\frac12 r_{k+1}^2+F(x^{k+1})-F_{\mathrm{opt}}\right]\le\left[\frac12 r_k^2+F(x^k)-F_{\mathrm{opt}}\right]-\frac1p\bigl(F(x^k)-F_{\mathrm{opt}}\bigr). \tag{11.33}$$
对 $\xi_{k-1}$ 取全期望并递推到 $0$：
$$\mathbb{E}_{\xi_k}(F(x^{k+1}))-F_{\mathrm{opt}}\le\frac12 r_0^2+F(x^0)-F_{\mathrm{opt}}-\frac1p\sum_{j=0}^{k}\bigl[\mathbb{E}_{\xi_j}(F(x^j))-F_{\mathrm{opt}}\bigr].$$
由于期望函数值序列单调不增（Remark 11.24），右端最后一项至少含 $\frac{k+1}{p}$ 倍的 $\mathbb{E}_{\xi_k}(F(x^{k+1}))-F_{\mathrm{opt}}$，移项即得 (11.27)。$\blacksquare$

**结论**：RBPG 拿到**期望函数值**的 $O(1/k)$ 界，且界里没有 $R^2$（不像 CBPG 凸情形 Lemma 11.16），代价是出现初值到最优解的加权距离 $\|x^0-x^*\|_L^2$——随机方法用"初值散布"换掉了"水平集有界"假设。

**两种更新的对比**（收个尾）：

| 方法 | 选块方式 | $f$ 是否需凸 | 收敛结论 | 关键假设 |
|---|---|---|---|---|
| CBPG (§11.4.1) | 循环，每块每轮一次 | 不必凸 | 非凸：梯度映射 $\to0$、聚点平稳；次优 $O(1/\sqrt{k})$ | Assumption 11.1 |
| CBPG (§11.4.2) | 循环 | 必须凸 | 函数值 $O(1/k)$ | + Assumption 11.15 |
| RBPG (§11.5) | 均匀随机 | 必须凸 | 期望函数值 $O(1/k)$ | Assumption 11.21 |

**向后引用**：本章是 Chapter 10 proximal gradient 的"分块推广"——梯度映射 (§10.3.2)、充分下降 (Lemma 10.4)、下降引理 (Lemma 5.7)、第二 prox 定理 (Theorem 6.39)、可分离 prox (Theorem 6.6)、平稳点定义 (Definition 3.73) 全被复用。块 Lipschitz 与全局 $L_f$-smooth 的关系（Theorem 11.20）又回扣 Chapter 5 的平滑性等价 (Theorem 5.8)。应用（矩阵分解、字典学习等）教材在 §11.6 及之后展开，留待后续笔记。

**收尾提醒**：本章所有常数（$C$、速率里的 $p$、$(L_f+L_{\max})^2$）都随块数 $p$ 与条件数膨胀——实际用块方法时，"怎么分块"往往比调步长更关键。
