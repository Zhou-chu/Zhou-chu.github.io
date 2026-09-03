---
blog: true
title: "Chapter 10-The Proximal Gradient Method"
slug: "chapter-10-the-proximal-gradient-method-aifd8bf"
summary: "近端梯度法：复合模型 min f(x)+g(x) 的梯度步+近端步迭代、梯度映射、非凸/凸/强凸收敛率，以及 FISTA 加速、平滑化与非欧方法。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

本章进入"**非光滑但结构化**"的优化世界。前面 Chapter 6 的近端算子、Chapter 9 的镜下降都是铺垫。核心对象是非常自然的复合模型

$$\min_{\mathbf{x}\in\mathbb{E}}\{F(\mathbf{x})\equiv f(\mathbf{x})+g(\mathbf{x})\},$$

其中光滑部分 `f` 可微、非光滑部分 `g`（`l1`、示性函数）用近端算子处理。近端梯度法 = "先走一步梯度，再做一次近端映射"。最精彩的果实是 **FISTA**：同样单步代价，把收敛率从 `O(1/k)` 加速到 `O(1/k²)`。

# 10.1 The Composite Model

$$\min_{\mathbf{x}\in\mathbb{E}}\{F(\mathbf{x})\equiv f(\mathbf{x})+g(\mathbf{x})\}.\tag{10.1}$$

> **Assumption 10.1.** (A) $g:\mathbb{E}\to(-\infty,\infty]$ is proper closed and convex. (B) $f:\mathbb{E}\to(-\infty,\infty]$ is proper and closed, $\mathrm{dom}(f)$ convex, $\mathrm{dom}(g)\subseteq\mathrm{int}(\mathrm{dom}(f))$, and $f$ is $L_f$-smooth over $\mathrm{int}(\mathrm{dom}(f))$. (C) The optimal set $X^*$ is nonempty, optimal value $F_{\mathrm{opt}}$.

**逐字点评**：`(B)` 里 `dom(g)⊆int(dom(f))` 与 `f` 在 `int(dom(f))` 上 `L_f`-光滑，保证在当前点能对 `f` 做线性化+二次上界（descent lemma，Ch5 Lemma 5.7）。`f` 本身允许取 `∞` 且**不必凸**，于是 §10.3 把"非凸+非光滑"也纳入分析。`g` 闭凸是因为要进近端算子（Ch6）。

## Example 10.2 (三种特例)

> **Example 10.2.** • Smooth unconstrained: $g\equiv 0,\ \mathrm{dom}(f)=\mathbb{E}\ \Rightarrow\ \min f(\mathbf{x})$, $f$ $L_f$-smooth. • Convex constrained: $g=\delta_C$ ($C$ closed convex) $\Rightarrow$ $\min_{\mathbf{x}\in C}f(\mathbf{x})$. • $\ell_1$-regularized: $g(\mathbf{x})=\lambda\|\mathbf{x}\|_1$ $\Rightarrow$ $\min\{f(\mathbf{x})+\lambda\|\mathbf{x}\|_1\}$.

**为什么关键**：三块试金石。(1) `g≡0` 时退化成普通梯度法——验证公式的基准。(2) `g=δ_C` 即投影梯度法，因 `prox_{δ_C}=P_C`（Ch6），它是近端梯度法的特例不是并列。(3) `l1` 即 **ISTA**（Example 10.3 点名）。第三块中 `f` 全空间光滑，因 `dom(g)=E`，为 FISTA 加速铺路。

# 10.2 The Proximal Gradient Method

投影梯度法 $\mathbf{x}_{k+1}=P_C(\mathbf{x}_k-t_k\nabla f(\mathbf{x}_k))$ 可等价写成
$$\mathbf{x}_{k+1}=\mathrm{argmin}_{\mathbf{x}\in C}\left\{f(\mathbf{x}_k)+\langle\nabla f(\mathbf{x}_k),\mathbf{x}-\mathbf{x}_k\rangle+\frac{1}{2t_k}\|\mathbf{x}-\mathbf{x}_k\|^2\right\}.$$
把 $C$ 换成一般 `g`，自然得到
$$\mathbf{x}_{k+1}=\mathrm{argmin}_{\mathbf{x}\in\mathbb{E}}\left\{f(\mathbf{x}_k)+\langle\nabla f(\mathbf{x}_k),\mathbf{x}-\mathbf{x}_k\rangle+g(\mathbf{x})+\frac{1}{2t_k}\|\mathbf{x}-\mathbf{x}_k\|^2\right\}.\tag{10.3}$$

> After algebraic manipulation: $\mathbf{x}_{k+1}=\mathrm{prox}_{\frac{1}{L_k}g}\!\left(\mathbf{x}_k-\frac{1}{L_k}\nabla f(\mathbf{x}_k)\right).$

**为什么这一行最关键**：整个方法的灵魂公式。配方去掉与 `x` 无关的常数，把二次项系数对齐到 `‖x-(x_k-t_k∇f(x_k))‖²`，对照近端定义 `prox_h(y)=argmin_x{h(x)+½‖x-y‖²}`，取 `t_k=1/L_k` 即得。引入 **prox-grad 算子** $T_L^{f,g}(\mathbf{x})=\mathrm{prox}_{\frac{1}{L}g}(\mathbf{x}-\frac{1}{L}\nabla f(\mathbf{x}))$，更新即 $\mathbf{x}_{k+1}=T_{L_k}^{f,g}(\mathbf{x}_k)$。

## Example 10.3 (显式更新 / ISTA)

> **Example 10.3.** | Model | Update | Method | |---|---|---| | $\min f(\mathbf{x})$ | $\mathbf{x}_{k+1}=\mathbf{x}_k-t_k\nabla f(\mathbf{x}_k)$ | gradient | | $\min_{\mathbf{x}\in C}f(\mathbf{x})$ | $\mathbf{x}_{k+1}=P_C(\mathbf{x}_k-t_k\nabla f(\mathbf{x}_k))$ | projected gradient | | $\min\{f+\lambda\|\mathbf{x}\|_1\}$ | $\mathbf{x}_{k+1}=T_{\lambda t_k}(\mathbf{x}_k-t_k\nabla f(\mathbf{x}_k))$ | ISTA |

> The third is the iterative shrinkage-thresholding algorithm (ISTA), since each iteration performs a soft-thresholding (shrinkage) operation.

**逐字点评**：脚注 `prox_{t_k g_0}=I`、`prox_{t_k δ_C}=P_C`、`prox_{t_k λ‖·‖₁}=T_{λt_k}`。第三块 `T_{λt_k}` 是软阈值（Ch6），ISTA 即"迭代收缩阈值算法"，每步把小分量压成 0（稀疏性来源）。

# 10.3 Analysis—The Nonconvex Case

**不假设 `f` 凸**。所有结论建在 Assumption 10.1 上。

## 10.3.1 Sufficient Decrease

### Lemma 10.4 (sufficient decrease lemma)

> **Lemma 10.4.** Let $F=f+g$, $T_L\equiv T_L^{f,g}$. For any $\mathbf{x}\in\mathrm{int}(\mathrm{dom}(f))$ and $L\in[\tfrac{L_f}{2},\infty)$,
> $$F(\mathbf{x})-F(T_L(\mathbf{x}))\ge \frac{L-L_f}{2L^2}\left\|G_L^{f,g}(\mathbf{x})\right\|^2,\tag{10.4}$$
> where $G_L^{f,g}(\mathbf{x})=L(\mathbf{x}-T_L(\mathbf{x}))$.

**为什么关键**：整章收敛的"发动机"。注意 `L≥L_f/2` 比通常 descent lemma 的 `L≥L_f` 宽松——prox 项带来额外负二次项抵消了一部分。右侧 `G_L` 即 §10.3.2 的梯度映射。

**证明**。令 `x⁺=T_L(x)`。由 descent lemma（Ch5 Lemma 5.7）：
$$f(\mathbf{x}^+)\le f(\mathbf{x})+\langle\nabla f(\mathbf{x}),\mathbf{x}^+-\mathbf{x}\rangle+\frac{L_f}{2}\|\mathbf{x}-\mathbf{x}^+\|^2.\tag{10.5}$$
由第二近端定理（Ch6 Thm 6.39），因 `x⁺=prox_{g/L}(x-∇f(x)/L)`：
$$\left\langle \mathbf{x}-\frac{1}{L}\nabla f(\mathbf{x})-\mathbf{x}^+,\ \mathbf{x}-\mathbf{x}^+\right\rangle\le \frac{1}{L}g(\mathbf{x})-\frac{1}{L}g(\mathbf{x}^+),$$
整理得 $\langle\nabla f(\mathbf{x}),\mathbf{x}^+-\mathbf{x}\rangle\le -L\|\mathbf{x}^+-\mathbf{x}\|^2+g(\mathbf{x})-g(\mathbf{x}^+)$。代入 (10.5)：
$$f(\mathbf{x}^+)+g(\mathbf{x}^+)\le f(\mathbf{x})+g(\mathbf{x})+\left(-L+\frac{L_f}{2}\right)\|\mathbf{x}-\mathbf{x}^+\|^2.$$
而 $\mathbf{x}-\mathbf{x}^+=G_L(\mathbf{x})/L$，故 $\|\mathbf{x}-\mathbf{x}^+\|^2=\|G_L\|^2/L^2$，移项即得 (10.4)。$\blacksquare$

### Definition 10.5 (gradient mapping)

> **Definition 10.5.** $G_L^{f,g}:\mathrm{int}(\mathrm{dom}(f))\to\mathbb{E},\ G_L^{f,g}(\mathbf{x})\equiv L(\mathbf{x}-T_L^{f,g}(\mathbf{x}))$.

**逐字点评**：梯度映射是"梯度"在非光滑复合问题下的推广。更新步可写成 $\mathbf{x}_{k+1}=\mathbf{x}_k-\frac{1}{L_k}G_{L_k}(\mathbf{x}_k)$，和普通梯度法同构，只是 `∇f` 换成 `G_L`。

### Corollary 10.6

> **Corollary 10.6.** $F(\mathbf{x})-F(T_{L_f}(\mathbf{x}))\ge \frac{1}{2L_f}\|G_{L_f}(\mathbf{x})\|^2.$

**结论**：`L=L_f` 代入 (10.4)，是凸情形 O(1/k) 的起点。

## 10.3.2 The Gradient Mapping

### Theorem 10.7

> **Theorem 10.7.** (a) $G_L^{f,g_0}(\mathbf{x})=\nabla f(\mathbf{x})$ when $g_0\equiv 0$; (b) for $\mathbf{x}^*\in\mathrm{int}(\mathrm{dom}(f))$, $G_L^{f,g}(\mathbf{x}^*)=0$ iff $\mathbf{x}^*$ is a stationary point of (10.1).

**为什么关键**：(a) 验证推广合理——`g≡0` 时退化为普通梯度；(b) 把"梯度映射为零"和"驻点"画等号。回顾 Ch3 Def 3.73/Thm 3.72：驻点条件即 $-\nabla f(\mathbf{x}^*)\in\partial g(\mathbf{x}^*)$。

**证明**。(a) `prox_{g_0/L}=I` 故 `G_L=L(x-(x-∇f(x)/L))=∇f(x)`。(b) `G_L(x*)=0 ⇔ x*=prox_{g/L}(x*-∇f(x*)/L)`，由第二近端定理等价于 `x*-(x*-∇f(x*)/L)∈(1/L)∂g(x*)`，即 $-\nabla f(\mathbf{x}^*)\in\partial g(\mathbf{x}^*)$。$\blacksquare$

### Corollary 10.8

> **Corollary 10.8.** If $f$ convex, then $G_L(\mathbf{x}^*)=0$ iff $\mathbf{x}^*$ optimal.

### Theorem 10.9 (梯度映射关于 $L$ 的单调性)

> **Theorem 10.9.** For $L_1\ge L_2>0$: $\|G_{L_1}(\mathbf{x})\|\ge \|G_{L_2}(\mathbf{x})\|$ and $\dfrac{\|G_{L_1}(\mathbf{x})\|}{L_1}\le \dfrac{\|G_{L_2}(\mathbf{x})\|}{L_2}$.

**证明草图**。由第二近端定理不等式（交换 `v,w` 两次相加）得
$$\frac{1}{L_1}\|G_{L_1}\|^2+\frac{1}{L_2}\|G_{L_2}\|^2\le\left(\frac{1}{L_1}+\frac{1}{L_2}\right)\langle G_{L_1},G_{L_2}\rangle\le\left(\frac{1}{L_1}+\frac{1}{L_2}\right)\|G_{L_1}\|\|G_{L_2}\|.$$
若 $G_{L_2}=0$ 平凡；否则令 $t=\|G_{L_1}\|/\|G_{L_2}\|$ 得 $t^2-(1+L_1/L_2)t+L_1/L_2\le 0$，根为 $1,L_1/L_2$，故 $1\le t\le L_1/L_2$。$\blacksquare$

### Lemma 10.10 (Lipschitz 连续性)

> **Lemma 10.10.** (a) $\|G_L(\mathbf{x})-G_L(\mathbf{y})\|\le (2L+L_f)\|\mathbf{x}-\mathbf{y}\|$; (b) $\|G_{L_f}(\mathbf{x})-G_{L_f}(\mathbf{y})\|\le 3L_f\|\mathbf{x}-\mathbf{y}\|$.

**证明**。`G_L(x)=L(x-prox_{g/L}(x-∇f(x)/L))`，用 prox 非扩张（Ch6 Thm 6.42(b)）与 `f` 的 `L_f`-光滑：
$$\|G_L(x)-G_L(y)\|\le L\|x-y\|+L\Big\|\Big(x-\frac{\nabla f(x)}{L}\Big)-\Big(y-\frac{\nabla f(y)}{L}\Big)\Big\|\le 2L\|x-y\|+\|\nabla f(x)-\nabla f(y)\|\le (2L+L_f)\|x-y\|.$$
取 $L=L_f$ 得 (b)。$\blacksquare$

### Lemma 10.11 ($(3/(4L_f))G_{L_f}$ 的 firm 非扩张)

> **Lemma 10.11.** If $f$ convex $L_f$-smooth, $g$ proper closed convex: (a) $\langle G_{L_f}(x)-G_{L_f}(y),x-y\rangle\ge \frac{3}{4L_f}\|G_{L_f}(x)-G_{L_f}(y)\|^2$; (b) $\|G_{L_f}(x)-G_{L_f}(y)\|\le \frac{4L_f}{3}\|x-y\|$.

**证明核心**。由 prox 的 firm 非扩张（Ch6 Thm 6.42(a)）与 $T_L=I-(1/L)G_L$ 推出
$$\langle G(x)-G(y),x-y\rangle\ge \frac{1}{L}\|G(x)-G(y)\|^2+\langle \nabla f(x)-\nabla f(y),x-y\rangle-\frac{1}{L}\langle G(x)-G(y),\nabla f(x)-\nabla f(y)\rangle.$$
用 `f` 的 `L`-光滑等价刻画（Ch5 Thm 5.8）：$\langle\nabla f(x)-\nabla f(y),x-y\rangle\ge \frac{1}{L}\|\nabla f(x)-\nabla f(y)\|^2$。整理后用 Cauchy–Schwarz：
$$L\langle G(x)-G(y),x-y\rangle\ge \|G\|^2+\|\nabla f(x)-\nabla f(y)\|^2-\|G\|\|\nabla f(x)-\nabla f(y)\|.$$
令 $\alpha=\|G\|,\beta=\|\nabla f(x)-\nabla f(y)\|$，右边 $=\alpha^2+\beta^2-\alpha\beta=\frac{3}{4}\alpha^2+\frac{(\alpha-2\beta)^2}{4}\ge\frac{3}{4}\alpha^2$。即得 (a)。(b) 由 (a)+Cauchy–Schwarz。$\blacksquare$

### Lemma 10.12 (梯度映射范数在 prox-grad 步后不增)

> **Lemma 10.12.** If $f$ convex $L_f$-smooth, $g$ proper closed convex: $\|G_{L_f}(T_{L_f}(\mathbf{x}))\|\le \|G_{L_f}(\mathbf{x})\|$.

**证明草图**。由 `f` 强单调（Thm 5.8）：$\|\nabla f(x^+)-\nabla f(x)\|^2\le L_f\langle\nabla f(x^+)-\nabla f(x),x^+-x\rangle$。令 $a=\nabla f(x^+)-\nabla f(x)$、$b=x^+-x$ 化成 $\|a/L_f-b\|\le\|b\|/2$，进而 $\|a/L_f-b+b/2\|\le\|b\|/2\Rightarrow\|a/L_f-b/2+b/2\|$... 再借 prox 非扩张把 $G_{L_f}(T_{L_f}(x))$ 写成 $L_f\|T(x)-T(x^+)\|$，最终 $\le L_f\|x^+-x\|=\|G_{L_f}(x)\|$。$\blacksquare$

## 10.3.3 Convergence—Nonconvex Case

步长：常数 $L_k=\bar L\in(L_f/2,\infty)$；回溯 **B1**（参数 $(s,\gamma,\eta)$），选最小 $i_k$ 使 $F(\mathbf{x}_k)-F(T_{s\eta^{i_k}}(\mathbf{x}_k))\ge \frac{\gamma}{s\eta^{i_k}}\|G_{s\eta^{i_k}}(\mathbf{x}_k)\|^2$。

### Remark 10.13 (B1 有限 + 上界)

> **Remark 10.13.** B1 is finite; $L_k\le\max\{s,\frac{\eta L_f}{2(1-\gamma)}\}$.

**理由**：把 $x=x_k$ 代入 (10.4)，当 $L\ge L_f/(2(1-\gamma))$ 时 $F(x_k)-F(T_L(x_k))\ge(\gamma/L)\|G_L\|^2$，回溯必在此阈值前停。

### Lemma 10.14 (序列充分下降)

> **Lemma 10.14.** $F(\mathbf{x}_k)-F(\mathbf{x}_{k+1})\ge M\|G_d(\mathbf{x}_k)\|^2$, with $M=\begin{cases}(\bar L-L_f/2)/\bar L^2,&\text{const.}\\\gamma/\max\{s,\eta L_f/(2(1-\gamma))\},&\text{B1}\end{cases}$, $d=\begin{cases}\bar L,&\text{const.}\\ s,&\text{B1.}\end{cases}$

### Theorem 10.15 (非凸收敛)

> **Theorem 10.15.** (a) $\{F(\mathbf{x}_k)\}$ nonincreasing; $F(\mathbf{x}_{k+1})<F(\mathbf{x}_k)$ iff $\mathbf{x}_k$ not stationary; (b) $G_d(\mathbf{x}_k)\to 0$; (c) $\min_{n\le k}\|G_d(\mathbf{x}_n)\|\le\sqrt{\frac{F(\mathbf{x}_0)-F_{\mathrm{opt}}}{M(k+1)}}$; (d) all limit points stationary.

**证明**。(a) Lemma 10.14 直接给非增；非驻点则 $G_d\neq 0$（Thm 10.7(b)）故严格降，驻点则 $G=0\Rightarrow x_{k+1}=x_k$。(b) 序列非增下有界故收敛，$F(x_k)-F(x_{k+1})\to 0$ 推 $\|G_d\|\to 0$。(c) 对 $n=0..k$ 求和：$F(x_0)-F(x_{k+1})\ge M(k+1)\min\|G_d\|^2$，用 $F(x_{k+1})\ge F_{\mathrm{opt}}$。(d) 极限点 $\bar x$，子列 $x_{k_j}\to\bar x$，由 Lemma 10.10 Lipschitz：$\|G_d(\bar x)\|\le(2d+L_f)\|x_{k_j}-\bar x\|+\|G_d(x_{k_j})\|\to 0$，Thm 10.7(b) 知 $\bar x$ 驻点。$\blacksquare$

# 10.4 Analysis—The Convex Case

加假设 `f` 凸。核心工具：

## 10.4.1 Fundamental Prox-Grad Inequality

### Theorem 10.16

> **Theorem 10.16.** For any $\mathbf{x}\in\mathbb{E}$, $\mathbf{y}\in\mathrm{int}(\mathrm{dom}(f))$, $L>0$ satisfying
> $$f(T_L(\mathbf{y}))\le f(\mathbf{y})+\langle\nabla f(\mathbf{y}),T_L(\mathbf{y})-\mathbf{y}\rangle+\frac{L}{2}\|T_L(\mathbf{y})-\mathbf{y}\|^2,\tag{10.20}$$
> it holds
> $$F(\mathbf{x})-F(T_L(\mathbf{y}))\ge \frac{L}{2}\|\mathbf{x}-T_L(\mathbf{y})\|^2-\frac{L}{2}\|\mathbf{x}-\mathbf{y}\|^2+\ell_f(\mathbf{x},\mathbf{y}),\tag{10.21}$$
> where $\ell_f(\mathbf{x},\mathbf{y})=f(\mathbf{x})-f(\mathbf{y})-\langle\nabla f(\mathbf{y}),\mathbf{x}-\mathbf{y}\rangle$.

**为什么关键**：凸情形所有 O(1/k)、Fejér、线性率的"母不等式"。(10.20) 是 descent lemma 的放宽，凸步长规则下总成立。

**证明**。令 $\phi(u)=f(y)+\langle\nabla f(y),u-y\rangle+g(u)+(L/2)\|u-y\|^2$。$\phi$ 是 $L$-强凸，$T_L(y)=\mathrm{argmin}\,\phi(u)$，由 Ch5 Thm 5.25(b) 得 $\phi(x)-\phi(T_L(y))\ge\frac{L}{2}\|x-T_L(y)\|^2$。又由 (10.20)，$\phi(T_L(y))\ge f(T_L(y))+g(T_L(y))=F(T_L(y))$。于是 $\phi(x)-F(T_L(y))\ge\frac{L}{2}\|x-T_L(y)\|^2$；展开 $\phi(x)$ 即得 (10.21)。$\blacksquare$

### Remark 10.17

> **Remark 10.17.** By the descent lemma, (10.20) holds for $L=L_f$; hence $F(\mathbf{x})-F(T_{L_f}(\mathbf{y}))\ge \frac{L_f}{2}\|\mathbf{x}-T_{L_f}(\mathbf{y})\|^2-\frac{L_f}{2}\|\mathbf{x}-\mathbf{y}\|^2+\ell_f(\mathbf{x},\mathbf{y})$.

### Corollary 10.18 (充分下降第二版)

> **Corollary 10.18.** For any $\mathbf{x}\in\mathrm{int}(\mathrm{dom}(f))$ satisfying (10.20) with $L$: $F(\mathbf{x})-F(T_L(\mathbf{x}))\ge \frac{1}{2L}\|G_L(\mathbf{x})\|^2$.

**结论**：`y=x` 代入 (10.21)，用 $\ell_f(x,x)=0$ 与 $\|x-T_L(x)\|=\|G_L\|/L$。

## 10.4.2 Stepsize Strategies

凸情形步长：常数 $L_k=L_f$；回溯 **B2**（参数 $(s,\eta)$，初值 $L_{-1}=s$），选最小 $i_k$ 使 $f(T_{L_{k-1}\eta^{i_k}}(x_k))\le f(x_k)+\langle\nabla f(x_k),T-x_k\rangle+\frac{L_{k-1}\eta^{i_k}}{2}\|T-x_k\|^2$。

### Remark 10.19 (B2 上下界)

> **Remark 10.19.** $s\le L_k\le\max\{\eta L_f,s\}$; equivalently $\beta L_f\le L_k\le\alpha L_f$ with $\alpha=1$ (const.) or $\max\{\eta,s/L_f\}$ (B2), $\beta=1$ or $s/L_f$.

### Remark 10.20 (单调性)

> **Remark 10.20.** $F(\mathbf{x}_k)-F(\mathbf{x}_{k+1})\ge \frac{L_k}{2}\|\mathbf{x}_k-\mathbf{x}_{k+1}\|^2$, so $\{F(\mathbf{x}_k)\}$ is nonincreasing.

## 10.4.3 Convergence Analysis—Convex

### Theorem 10.21 (O(1/k))

> **Theorem 10.21.** If $f$ convex, with $L_k\equiv L_f$ or B2, for any $\mathbf{x}^*\in X^*$, $k\ge 0$:
> $$F(\mathbf{x}_k)-F_{\mathrm{opt}}\le \frac{\alpha L_f\|\mathbf{x}_0-\mathbf{x}^*\|^2}{2k},\quad \alpha=1\text{ (const.) or }\max\{\eta,s/L_f\}\text{ (B2)}.$$

**证明**。对 $n=0..k-1$ 在 (10.21) 取 $L=L_n,x=x^*,y=x_n$，由 `f` 凸 $\ell_f(x^*,x_n)\ge 0$：
$$\frac{2}{L_n}(F(x^*)-F(x_{n+1}))\ge \|x^*-x_{n+1}\|^2-\|x^*-x_n\|^2.$$
求和，用 $L_n\le\alpha L_f$：
$$\frac{2}{\alpha L_f}\sum_{n=0}^{k-1}(F_{\mathrm{opt}}-F(x_{n+1}))\ge \|x^*-x_k\|^2-\|x^*-x_0\|^2\ge -\|x^*-x_0\|^2.$$
由序列非增，$k(F(x_k)-F_{\mathrm{opt}})\le\sum(F(x_{n+1})-F_{\mathrm{opt}})$，得结论。$\blacksquare$

### Remark 10.22

> **Remark 10.22.** B2's monotonicity of $\{L_k\}$ is not needed—any backtracking with (10.23) and $L_k\le\alpha L_f$ gives the same rate.

### Theorem 10.23 (Fejér 单调)

> **Theorem 10.23.** $\|\mathbf{x}_{k+1}-\mathbf{x}^*\|\le \|\mathbf{x}_k-\mathbf{x}^*\|$.

### Theorem 10.24 (序列收敛到最优)

> **Theorem 10.24.** The sequence $\{\mathbf{x}_k\}$ converges to an optimal solution.

**证明**：由 Thm 10.23 对 $X^*$ Fejér 单调（Ch8 Thm 8.16），取极限点 $\tilde x$，子列 $x_{k_j}\to\tilde x$；Thm 10.21 给 $F(x_{k_j})\to F_{\mathrm{opt}}$。`F` 闭故下半连续，$F(\tilde x)\le F_{\mathrm{opt}}$，即 $\tilde x\in X^*$。$\blacksquare$

### Theorem 10.25 (复杂度)

> **Theorem 10.25.** For $k\ge \dfrac{\alpha L_f R^2}{2\varepsilon}$ ($R$ bounds $\|\mathbf{x}^*-\mathbf{x}_0\|$), $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le\varepsilon$.

**结论**：`O(1/ε)` 次迭代，而投影次梯度需 `O(1/ε²)`（Ch8 Thm 8.18）——光滑+近端带来的量级加速。

### Theorem 10.26 (梯度映射最小范数 O(1/k))

> **Theorem 10.26.** $\min_{n=0..k}\|G_{\alpha L_f}(\mathbf{x}_n)\|\le \dfrac{2\alpha^{1.5}L_f\|\mathbf{x}_0-\mathbf{x}^*\|}{\sqrt{\beta}\,k}$, $\alpha=\beta=1$ (const.) or $\alpha=\max\{\eta,s/L_f\},\beta=s/L_f$ (B2).

### Theorem 10.27 (常数步长梯度映射范数单调降)

> **Theorem 10.27.** With $L_k\equiv L_f$ and $f$ $L_f$-smooth over $\mathbb{E}$: (a) $\|G_{L_f}(\mathbf{x}_{k+1})\|\le\|G_{L_f}(\mathbf{x}_k)\|$; (b) $\|G_{L_f}(\mathbf{x}_k)\|\le \dfrac{2L_f\|\mathbf{x}_0-\mathbf{x}^*\|}{k+1}$.

# 10.5 The Proximal Point Method

`min g(x)`（即 `f≡0`）是复合模型特例。取 $L_k=1/c$ 得**近端点法**：

> **The proximal point method.** $\mathbf{x}_{k+1}=\mathrm{prox}_{c g}(\mathbf{x}_k)$.

### Theorem 10.28

> **Theorem 10.28.** Let $g$ proper closed convex with nonempty $X^*$, optimal $g_{\mathrm{opt}}$. With $c>0$: (a) $g(\mathbf{x}_k)-g_{\mathrm{opt}}\le \dfrac{\|\mathbf{x}_0-\mathbf{x}^*\|^2}{2ck}$; (b) $\{\mathbf{x}_k\}$ converges to a point in $X^*$.

**结论**：通常非实用（每步与原问题同难），但作 $f\equiv 0$（0-光滑）套 Thm 10.21/10.24 得经典 O(1/k)。

# 10.6 Strongly Convex Case

`f` 为 $\sigma$-强凸（$\sigma>0$），次线性率升级为线性率 $O(q^k)$，记唯一最优解 $x^*$。

### Theorem 10.29 (线性率)

> **Theorem 10.29.** With const. $L_k\equiv L_f$ or B2, $\alpha=1$ or $\max\{\eta,s/L_f\}$: (a) $\|\mathbf{x}_{k+1}-\mathbf{x}^*\|^2\le (1-\frac{\sigma}{\alpha L_f})\|\mathbf{x}_k-\mathbf{x}^*\|^2$; (b) $\|\mathbf{x}_k-\mathbf{x}^*\|^2\le (1-\frac{\sigma}{\alpha L_f})^k\|\mathbf{x}_0-\mathbf{x}^*\|^2$; (c) $F(\mathbf{x}_{k+1})-F_{\mathrm{opt}}\le \frac{\alpha L_f}{2}(1-\frac{\sigma}{\alpha L_f})^{k+1}\|\mathbf{x}_0-\mathbf{x}^*\|^2$.

**证明**。(10.21) 取 $L=L_k,x=x^*,y=x_k$，用 `f` 的 $\sigma$-强凸（Ch5 Thm 5.24(ii)）$\ell_f(x^*,x_k)\ge(\sigma/2)\|x_k-x^*\|^2$：
$$F(x^*)-F(x_{k+1})\ge \frac{L_k}{2}\|x^*-x_{k+1}\|^2-\frac{L_k-\sigma}{2}\|x^*-x_k\|^2.$$
因 $x^*$ 最优左边 $\le 0$，故 $\|x_{k+1}-x^*\|^2\le(1-\sigma/L_k)\|x_k-x^*\|^2\le(1-\sigma/(\alpha L_f))\|x_k-x^*\|^2$。(b)(c) 递推放缩。$\blacksquare$

### Theorem 10.30 (强凸复杂度)

> **Theorem 10.30.** For $k\ge \alpha\kappa\log(1/\varepsilon)+\alpha\kappa\log(\alpha L_f R^2/2)$, $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le\varepsilon$, $\kappa=L_f/\sigma$.

**结论**：`O(κ log(1/ε))`，对比非强凸的 `O(1/ε)` 又是 log 级飞跃。

# 10.7 FISTA

普通近端梯度法 `O(1/k)`，本节**加速**到 `O(1/k²)`——**FISTA**（fast iterative shrinkage-thresholding algorithm）。

## 10.7.1 The Method

### Assumption 10.31

> **Assumption 10.31.** (A) $g$ proper closed convex; (B) $f:\mathbb{E}\to\mathbb{R}$ $L_f$-smooth and convex; (C) $X^*$ nonempty.

> **FISTA.** Init $\mathbf{y}_0=\mathbf{x}_0,\ t_0=1$. General step: (a) pick $L_k>0$; (b) $\mathbf{x}_{k+1}=\mathrm{prox}_{\frac{1}{L_k}g}(\mathbf{y}_k-\frac{1}{L_k}\nabla f(\mathbf{y}_k))$; (c) $t_{k+1}=\frac{1+\sqrt{1+4t_k^2}}{2}$; (d) $\mathbf{y}_{k+1}=\mathbf{x}_{k+1}+\frac{t_k-1}{t_{k+1}}(\mathbf{x}_{k+1}-\mathbf{x}_k)$.

**为什么关键**：比普通法只多了外推步 (d)——沿 $(x_{k+1}-x_k)$ 前冲得 $y_{k+1}$，下一步在 $y_k$ 处做 prox-grad。每步代价（一次梯度+一次 prox）完全相同，收敛率却翻倍。步长可常数 $L_k=L_f$ 或回溯 **B3**（同 B2，作用在 $y_k$）。

### Remark 10.32

> **Remark 10.32.** B3 identical to B2 (on $\mathbf{y}_k$), so $\beta L_f\le L_k\le\alpha L_f$ of Remark 10.19 hold.

## 10.7.2 Convergence Analysis

### Lemma 10.33

> **Lemma 10.33.** $t_0=1,\ t_{k+1}=\frac{1+\sqrt{1+4t_k^2}}{2}\ \Rightarrow\ t_k\ge\frac{k+2}{2}$.

**证明**（归纳）。$k=0$：$1\ge 1$。归纳步：$t_{k+1}\ge(1+\sqrt{(k+2)^2})/2=(k+3)/2$。$\blacksquare$

### Theorem 10.34 (FISTA 的 O(1/k²))

> **Theorem 10.34.** Under Assumption 10.31, const. or B3: $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le \dfrac{2\alpha L_f\|\mathbf{x}_0-\mathbf{x}^*\|^2}{(k+1)^2}$, $\alpha=1$ or $\max\{\eta,s/L_f\}$.

**证明核心**。在 (10.21) 取 $L=L_k,\ x=t_k^{-1}x^*+(1-t_k^{-1})x_k,\ y=y_k$，配合 (10.39) 与 `f` 凸得
$$F(t_k^{-1}x^*+(1-t_k^{-1})x_k)-F(x_{k+1})\ge \frac{L_k}{2t_k^2}\|t_k x_{k+1}-(x^*+(t_k-1)x_k)\|^2-\frac{L_k}{2t_k^2}\|t_k y_k-(x^*+(t_k-1)x_k)\|^2.$$
由 `F` 凸：$F(t_k^{-1}x^*+(1-t_k^{-1})x_k)\le t_k^{-1}F_{\mathrm{opt}}+(1-t_k^{-1})F(x_k)$。记 $v_n=F(x_n)-F_{\mathrm{opt}}$、$u_n=t_{n-1}x_n-(x^*+(t_{n-1}-1)x_{n-1})$，用 $y_k=x_k+\frac{t_{k-1}-1}{t_k}(x_k-x_{k-1})$ 推得 $\|t_k y_k-(x^*+(t_k-1)x_k)\|=\|u_k\|$。关键 $t_k^2-t_k=t_{k-1}^2$（递推直接验证）。整理累加得 $\|u_k\|^2+\frac{2}{L_{k-1}}t_{k-1}^2v_{k-1}$ 单调不增，$\le\|x_0-x^*\|^2$（$k=0$ 初始化）。再用 $L_{k-1}\le\alpha L_f$ 与 Lemma 10.33 得结论。$\blacksquare$

### Remark 10.35

> **Remark 10.35.** Result holds for any $\{t_k\}$ with (a) $t_k\ge\frac{k+2}{2}$; (b) $t_{k+1}^2-t_{k+1}\le t_k^2$. In particular $t_k=\frac{k+2}{2}$ works.

### Remark 10.36

> **Remark 10.36.** FISTA $O(1/k^2)$ vs proximal gradient $O(1/k)$, with the same per-iteration cost (one gradient + one prox).

## 10.7.3 Examples

### Example 10.37 (ISTA 与 FISTA 的 l1 模型)

> **Example 10.37.** $\min\{f(\mathbf{x})+\lambda\|\mathbf{x}\|_1\}$, $f$ convex $L_f$-smooth. Proximal gradient (const. $1/L_f$): $\mathbf{x}_{k+1}=T_{\lambda/L_f}(\mathbf{x}_k-\frac{1}{L_f}\nabla f(\mathbf{x}_k))$ = ISTA. Accelerated: (a) $\mathbf{x}_{k+1}=T_{\lambda/L_f}(\mathbf{y}_k-\frac{1}{L_f}\nabla f(\mathbf{y}_k))$; (b) $t_{k+1}=\frac{1+\sqrt{1+4t_k^2}}{2}$; (c) $\mathbf{y}_{k+1}=\mathbf{x}_{k+1}+\frac{t_k-1}{t_{k+1}}(\mathbf{x}_{k+1}-\mathbf{x}_k)$.

**逐字点评**：FISTA 缩写由此坐实——ISTA 的加速版（每步一次软阈值）。

### Example 10.38 (l1-正则最小二乘)

> **Example 10.38.** $\min\frac{1}{2}\|A\mathbf{x}-\mathbf{b}\|_2^2+\lambda\|\mathbf{x}\|_1$, $L_f=\|A^TA\|_{2,2}=\lambda_{\max}(A^TA)$ (Ex 5.2). FISTA: (a) $\mathbf{x}_{k+1}=T_{\lambda/L_k}(\mathbf{y}_k-\frac{1}{L_k}A^T(A\mathbf{y}_k-\mathbf{b}))$; (b)(c) as above.

**Figure 10.1/10.2.** 书上 `m=100,n=110` 实例 200 次迭代的函数值距离与解向量对比，FISTA 远超 ISTA——`1/k²` 对 `1/k` 的直观体现。

## 10.7.4 MFISTA

### Remark 10.39

> **Remark 10.39.** FISTA is not monotone. MFISTA enforces $F(\mathbf{x}_{k+1})\le\min\{F(\mathbf{z}_k),F(\mathbf{x}_k)\}$ while keeping the same rate; a simple rule is $\mathbf{x}_{k+1}\in\mathrm{argmin}\{F(\mathbf{x}):\mathbf{x}=\mathbf{x}_k,\mathbf{z}_k\}$.

### Theorem 10.40

> **Theorem 10.40.** (O(1/k²) rate of MFISTA) Under Assumption 10.31, MFISTA satisfies $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le \frac{2\alpha L_f\|\mathbf{x}_0-\mathbf{x}^*\|^2}{(k+1)^2}$.

**结论**：单调版 FISTA，证明为 Thm 10.34 小幅调整（用 $F(x_{k+1})\le F(z_k)$），速率不变。

## 10.7.5 Weighted FISTA

`E=R^n` 但内积取 Q-内积 $\langle x,y\rangle_Q=x^TQy$（$Q\in\mathbb{S}^n_{++}$）。梯度变 $\nabla f(x)=Q^{-1}Df(x)$（Ch3 Rem 3.32），Lipschitz 常数是相对 Q-范数的 $L_f^Q$。FISTA 只把梯度换成 $Q^{-1}Df$、prox 换成 Q-范数意义，收敛率写成 $F(x_k)-F_{\mathrm{opt}}\le 2L_f^Q\|x_0-x^*\|_Q^2/(k+1)^2$。

## 10.7.6 Restarting FISTA (强凸)

普通近端梯度法强凸下线性率 `O(κ log(1/ε))`（Thm 10.30），FISTA 原版仍 `O(1/k²)`。惊喜：**周期重启 FISTA** 拿 `O(√κ log(1/ε))`。

> **Restarted FISTA.** Init $\mathbf{z}_{-1}\in\mathbb{E}$, integer $N$. $\mathbf{z}_0=T_{L_f}(\mathbf{z}_{-1})$. General: run $N$ FISTA iterations (const. stepsize) from $\mathbf{z}_k$ to get $\{\mathbf{x}_n\}_{n=0}^N$; $\mathbf{z}_{k+1}=\mathbf{x}_N$.

### Theorem 10.41

> **Theorem 10.41.** If $f$ $\sigma$-strongly convex, $N=\lceil\sqrt{8\kappa-1}\rceil$, $\kappa=L_f/\sigma$, $R$ bounds $\|\mathbf{z}_{-1}-\mathbf{x}^*\|$: (a) $F(\mathbf{z}_k)-F_{\mathrm{opt}}\le\frac{L_f R^2}{2}(1/2)^k$; (b) after $k$ FISTA iterations with $k\ge\frac{\sqrt{8\kappa}(\log(1/\varepsilon)+\log(L_f R^2)/\log 2)}{\log 2}$, $\varepsilon$-optimal.

**证明核心**。每 cycle 用 Thm 10.34：$F(z_{n+1})-F_{\mathrm{opt}}\le 2L_f\|z_n-x^*\|^2/(N+1)^2$；强凸给 $F(z_n)-F_{\mathrm{opt}}\ge(\sigma/2)\|z_n-x^*\|^2$，合并得 $F(z_{n+1})-F_{\mathrm{opt}}\le 4\kappa(F(z_n)-F_{\mathrm{opt}})/(N+1)^2$。取 $N\ge\sqrt{8\kappa}-1$ 使 $4\kappa/(N+1)^2\le 1/2$，每 cycle 误差减半。$\blacksquare$

## 10.7.7 V-FISTA

> **V-FISTA.** Init $\mathbf{y}_0=\mathbf{x}_0,\ t_0=1,\ \kappa=L_f/\sigma$. (a) $\mathbf{x}_{k+1}=\mathrm{prox}_{\frac{1}{L_f}g}(\mathbf{y}_k-\frac{1}{L_f}\nabla f(\mathbf{y}_k))$; (b) $\mathbf{y}_{k+1}=\mathbf{x}_{k+1}+\frac{\sqrt{\kappa}-1}{\sqrt{\kappa}+1}(\mathbf{x}_{k+1}-\mathbf{x}_k)$.

### Theorem 10.42

> **Theorem 10.42.** Under Assumption 10.31 with $f$ $\sigma$-strongly convex: $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le \left(1-\frac{1}{\sqrt{\kappa}}\right)^k\left(F(\mathbf{x}_0)-F_{\mathrm{opt}}+\frac{\sigma}{2}\|\mathbf{x}_0-\mathbf{x}^*\|^2\right)$, $\kappa=L_f/\sigma$.

**结论**：V-FISTA 用固定动量系数 $(\sqrt\kappa-1)/(\sqrt\kappa+1)$ 取代 $t_k$，**无需重启**即得线性率，$1-1/\sqrt\kappa$ 比重启版 $1-1/(\alpha\kappa)$ 通常更优。证明为 Thm 10.34 在强凸下的变体。

# 10.8 Smoothing

动机：Ch8/9 非光滑方法 `O(1/ε²)`，FISTA 对 (10.58) `O(1/√ε)`。本节用 FISTA 解**三项模型** $\min\{f(x)+h(x)+g(x)\}$，对难算 prox 的 `h` 做**平滑近似**，达 `O(1/ε)`。

## 10.8.2 Smoothable Functions

### Definition 10.43

> **Definition 10.43.** A convex $h:\mathbb{E}\to\mathbb{R}$ is $(\alpha,\beta)$-smoothable ($\alpha,\beta>0$) if for any $\mu>0$ there is convex differentiable $h_\mu$ with: (a) $h_\mu(\mathbf{x})\le h(\mathbf{x})\le h_\mu(\mathbf{x})+\beta\mu$; (b) $h_\mu$ is $\frac{\alpha}{\mu}$-smooth. $h_\mu$ is a $\frac{1}{\mu}$-smooth approximation with params $(\alpha,\beta)$.

**逐字点评**：(a) 近似从下方夹住误差 $\le\beta\mu$（$\mu\to 0$ 任意精确）；(b) Lipschitz 常数与 $1/\mu$ 同阶——正是 FISTA 所需。

### Example 10.44 (∥x∥₂ 的平滑)

> **Example 10.44.** $h(\mathbf{x})=\|\mathbf{x}\|_2$, $h_\mu(\mathbf{x})=\sqrt{\|\mathbf{x}\|_2^2+\mu^2}-\mu$. Then $h$ is $(1,1)$-smoothable.

**验证**：$\sqrt{r^2+\mu^2}-\mu\le r=h(x)$；$\sqrt{r^2+\mu^2}\le r+\mu\Rightarrow h(x)\le h_\mu+\mu$。$\alpha=1$ 由 Ch5 Ex 5.14。

### Example 10.45 (maxᵢ{xᵢ} 的平滑)

> **Example 10.45.** $h(\mathbf{x})=\max\{x_1,\dots,x_n\}$, $h_\mu(\mathbf{x})=\mu\log(\sum e^{x_i/\mu})-\mu\log n$. Then $h$ is $(1,\log n)$-smoothable.

**验证**：$\max_i e^{x_i/\mu}\le\sum e^{x_i/\mu}\le n\max_i e^{x_i/\mu}$，取对数得 $h\le h_\mu+\mu\log n$ 且 $h_\mu\le h$；$\alpha=1$ 由 Ch5 Ex 5.15。

### Theorem 10.46 (平滑演算)

> **Theorem 10.46.** (a) If $h_{i,\mu}$ is $\frac{1}{\mu}$-approx of $h_i$ with $(\alpha_i,\beta_i)$, then $\gamma_1h_{1,\mu}+\gamma_2h_{2,\mu}$ is $\frac{1}{\mu}$-approx of $\gamma_1h_1+\gamma_2h_2$ with $(\gamma_1\alpha_1+\gamma_2\alpha_2,\gamma_1\beta_1+\gamma_2\beta_2)$. (b) If $q(\mathbf{x})=h(A\mathbf{x}+\mathbf{b})$, then $q_\mu(\mathbf{x})=h_\mu(A\mathbf{x}+\mathbf{b})$ is $\frac{1}{\mu}$-approx of $q$ with $(\alpha\|A\|^2,\beta)$.

**证明草图**。(a) 凸性、夹逼、光滑常数对非负系数线性保持。(b) $\|\nabla q_\mu(x)-\nabla q_\mu(y)\|=\|A^T(\nabla h_\mu(Ax+b)-\nabla h_\mu(Ay+b))\|\le(\alpha/\mu)\|A\|^2\|x-y\|$（用 $\|A^T\|=\|A\|$，Ch1 §1.14）。$\blacksquare$

### Corollary 10.47 (保持平滑性的运算)

> **Corollary 10.47.** Nonnegative linear combinations preserve smoothability (params summed); affine $q(\mathbf{x})=h(A\mathbf{x}+\mathbf{b})$ preserves it with $(\alpha\|A\|^2,\beta)$.

### Example 10.48 (∥Ax+b∥₂ 的平滑)

> **Example 10.48.** $q(\mathbf{x})=\|A\mathbf{x}+\mathbf{b}\|_2$. By Ex 10.44+Thm 10.46(b): $q_\mu=\sqrt{\|A\mathbf{x}+\mathbf{b}\|_2^2+\mu^2}-\mu$, params $(\|A\|_{2,2}^2,1)$.

### Example 10.49 (分段仿射 maxᵢ{aᵢᵀx+bᵢ})

> **Example 10.49.** $q(\mathbf{x})=\max_i\{\mathbf{a}_i^T\mathbf{x}+b_i\}$. $q_\mu=\mu\log(\sum e^{(\mathbf{a}_i^T\mathbf{x}+b_i)/\mu})-\mu\log m$, params $(\|A\|_{2,2}^2,\log m)$, $A$ rows $\mathbf{a}_i^T$.

### Example 10.50 (平滑参数紧性)

> **Example 10.50.** For $q(x)=|x|$: Ex 10.44 gives $(\sqrt{x^2+\mu^2}-\mu,(1,1))$; Ex 10.49 via $q(x)=\max\{x,-x\}$ gives $(2,\log 2)$ with $A=\binom{1}{-1}$. But $q_1''(x)=4/(e^x+e^{-x})^2\le 1$ shows $q_1$ is 1-smooth, so a $(1,\log 2)$ approx exists — $\alpha$ from max-formula not tight, $\beta$ is.

## 10.8.3 Moreau Envelope Revisited

回顾 Ch6 §6.7：$M_\mu^h(x)=\min_u\{h(u)+\frac{1}{2\mu}\|x-u\|^2\}$。当 `h` Lipschitz 时它自身就是 $1/\mu$-平滑近似。

### Theorem 10.51

> **Theorem 10.51.** If $h$ convex and $|h(x)-h(y)|\le\ell_h\|x-y\|$, then for any $\mu>0$, $M_\mu^h$ is a $\frac{1}{\mu}$-smooth approx of $h$ with params $(1,\ell_h^2/2)$.

**证明**。$M_\mu^h$ 是 $1/\mu$-光滑（Ch6 Thm 6.60）。显然 $M_\mu^h(x)\le h(x)$（取 $u=x$）。取 $g_x\in\partial h(x)$，由 Lipschitz 得 $\|g_x\|\le\ell_h$（Ch3 Thm 3.61）：
$$M_\mu^h(x)-h(x)=\min_u\{h(u)-h(x)+\tfrac{1}{2\mu}\|u-x\|^2\}\ge\min_u\{\langle g_x,u-x\rangle+\tfrac{1}{2\mu}\|u-x\|^2\}=-\frac{\mu}{2}\|g_x\|^2\ge-\frac{\ell_h^2}{2}\mu.$$
故 $h(x)\le M_\mu^h(x)+(\ell_h^2/2)\mu$。$\blacksquare$

### Corollary 10.52

> **Corollary 10.52.** $h$ convex Lipschitz $\ell_h$ $\Rightarrow$ $h$ is $(1,\ell_h^2/2)$-smoothable.

### Example 10.53 (l₂ 的 Moreau 平滑 — Huber)

> **Example 10.53.** $h(\mathbf{x})=\|\mathbf{x}\|_2$ Lipschitz $\ell_h=1$. $M_\mu^h=H_\mu(\mathbf{x})=\begin{cases}\frac{1}{2\mu}\|\mathbf{x}\|_2^2,&\|\mathbf{x}\|_2\le\mu\\\|\mathbf{x}\|_2-\frac{\mu}{2},&\|\mathbf{x}\|_2>\mu\end{cases}$, params $(1,1/2)$.

### Example 10.54 (l₁ 的 Moreau 平滑)

> **Example 10.54.** $h(\mathbf{x})=\|\mathbf{x}\|_1$ Lipschitz $\ell_h=\sqrt{n}$. $M_\mu^h(\mathbf{x})=\sum_{i=1}^n H_\mu(x_i)$, params $(1,n/2)$.

### Example 10.55 (绝对值三种近似对比)

> **Example 10.55.** $h(x)=|x|$: • $\sqrt{x^2+\mu^2}-\mu$, $(1,1)$; • $\mu\log(e^{x/\mu}+e^{-x/\mu})-\mu\log 2$, $(1,\log 2)$; • $H_\mu(x)$ (Huber), $(1,1/2)$.

**结论**：三者 $\alpha$ 同，$\beta$ 最小的是 Huber（Figure 10.3 印证）——最好的 $1/\mu$-平滑近似。

## 10.8.4 S-FISTA

### Assumption 10.56

> **Assumption 10.56.** (A) $f$ $L_f$-smooth; (B) $h$ $(\alpha,\beta)$-smoothable, $h_\mu$ a $\frac{1}{\mu}$-approx; (C) $g$ proper closed convex; (D) $H$ bounded level sets; (E) optimal set $X^*$ nonempty.

**思路**：把 `h` 换成 $h_\mu$，对光滑部分 $F_\mu=f+h_\mu$、非光滑 $g$ 跑 FISTA（步长 $1/(L_f+\alpha/\mu)$）。

> **S-FISTA.** Init $\mathbf{x}_0\in\mathrm{dom}(g),\mu>0$; $\mathbf{y}_0=\mathbf{x}_0,t_0=1$; $F_\mu=f+h_\mu$, $\tilde L=L_f+\alpha/\mu$. General: (a) $\mathbf{x}_{k+1}=\mathrm{prox}_{\frac{1}{\tilde L}g}(\mathbf{y}_k-\frac{1}{\tilde L}\nabla F_\mu(\mathbf{y}_k))$; (b) $t_{k+1}=\frac{1+\sqrt{1+4t_k^2}}{2}$; (c) $\mathbf{y}_{k+1}=\mathbf{x}_{k+1}+\frac{t_k-1}{t_{k+1}}(\mathbf{x}_{k+1}-\mathbf{x}_k)$.

### Theorem 10.57 (S-FISTA 的 O(1/ε))

> **Theorem 10.57.** With $\mu=\dfrac{\sqrt{\alpha\beta\,\varepsilon}}{\sqrt{\alpha\beta}+\sqrt{\alpha\beta+L_f\varepsilon}}$ and $k\ge\sqrt{2\Gamma\alpha\beta}+\sqrt{2\Gamma L_f\varepsilon}\,/\,\varepsilon$ ($\Gamma=(R_{H(x_0)+\bar\varepsilon/2}+\|x_0\|)^2$), $H(\mathbf{x}_k)-H_{\mathrm{opt}}\le\varepsilon$.

**证明草图**。FISTA 在 (10.65) 上给 $H_\mu(x_k)-H_{\mu,\mathrm{opt}}\le 2(L_f+\alpha/\mu)\Lambda/(k+1)^2$（$\Lambda=\|x_0-x_\mu^*\|^2$）。夹逼 $H(x)\le H_\mu(x)+\beta\mu$ 推出 $H(x_k)-H_{\mathrm{opt}}\le 2L_f\Lambda/k^2+(2\alpha\Lambda/k^2)(1/\mu)+\beta\mu$。对固定 $k=K$ 关于 $\mu$ 最小化得最优 $\mu\propto 1/K$，代回 $\le 2L_f\Lambda/K^2+2\sqrt{2\alpha\beta\Lambda}/K$；令 $\le\varepsilon$ 解出 $K$，用 $\Lambda\le\Gamma$ 换入即得 $\mu$ 与 $k$ 界。$\blacksquare$

### Remark 10.58

> **Remark 10.58.** The smoothing parameter in Thm 10.57 does not depend on $\Gamma$, though the iteration count does.

### Example 10.59 (约束光滑问题 minₓ∈C h(x))

> **Example 10.59.** $\min_{\mathbf{x}\in C}h(\mathbf{x})$ fits (10.64) with $f\equiv 0,g=\delta_C$. Take $h_\mu=M_\mu^h$ (params $(1,\ell_h^2/2)$). S-FISTA reduces to $\mathbf{x}_{k+1}=P_C(\mathrm{prox}_{\mu h}(\mathbf{y}_k))$ with $\mu=\varepsilon/\ell_h^2$, $\tilde L=\ell_h^2/\varepsilon$.

### Example 10.60 (½‖Ax−b‖₂² + ‖Dx‖₁ + λ‖x‖₁)

> **Example 10.60.** $f=\frac{1}{2}\|A\mathbf{x}-\mathbf{b}\|_2^2$ ($L_f=\|A\|_{2,2}^2$), $h(\mathbf{x})=\|D\mathbf{x}\|_1$, $g=\lambda\|\mathbf{x}\|_1$. From Ex 10.54+10.46(b), $h_\mu=M_\mu^q(D\mathbf{x})$ with $(\|D\|_{2,2}^2,p/2)$. S-FISTA uses $\mu=\frac{2\|D\|_{2,2}\sqrt{p}\,\varepsilon}{\sqrt{\|D\|_{2,2}^2 p}+\sqrt{\|D\|_{2,2}^2 p+2\|A\|_{2,2}^2\varepsilon}}$ and $\nabla F_\mu=\nabla f+\frac{1}{\mu}D^T(D\mathbf{x}-T_\mu(D\mathbf{x}))$.

# 10.9 Non-Euclidean Proximal Gradient Methods

**本节（且仅本节）**底空间**不**假设欧氏。两种处理：用"原始对偶对应"改造梯度法；或用 Bregman 距离替换欧氏距离（对接 Ch9 镜下降）。

## 10.9.1 The Non-Euclidean Gradient Method

### Lemma 10.61 (原始对应集)

> **Lemma 10.61.** Let $\mathbf{a}\in\mathbb{E}^*$. (a) If $\mathbf{a}\ne 0$, $\|\mathbf{a}^\dagger\|=1$ for any $\mathbf{a}^\dagger\in\Lambda_\mathbf{a}$; (b) if $\mathbf{a}=0$, $\Lambda_\mathbf{a}=B_{[\mathbf{0},1]}$; (c) $\langle\mathbf{a},\mathbf{a}^\dagger\rangle=\|\mathbf{a}\|_*$, where $\Lambda_\mathbf{a}=\mathrm{argmax}_{\mathbf{v}\in\mathbb{E}}\{\langle\mathbf{a},\mathbf{v}\rangle:\|\mathbf{v}\|\le 1\}$.

**逐字点评**：$\Lambda_a$ 是"在范数球上把 $a$ 内积取到最大"的 $v$。(c) 由对偶范数定义；(a) 非零时取到最大的 $v$ 在单位球面。$\Lambda_a=\partial\|\cdot\|_*$（Ch4 Cor 4.21）。

### Example 10.62/10.63/10.64

> **Example 10.62.** $\ell_2$: $\Lambda_\mathbf{a}=\{\mathbf{a}/\|\mathbf{a}\|_2\}$. **Example 10.63.** $\ell_1$: $\Lambda_\mathbf{a}=\partial\|\cdot\|_\infty(\mathbf{a})=\{\sum_{i\in I(\mathbf{a})}\lambda_i\mathrm{sgn}(a_i)\mathbf{e}_i:\sum\lambda_i=1\}$ ($I(\mathbf{a})=\mathrm{argmax}_i|a_i|$). **Example 10.64.** $\ell_\infty$: $\Lambda_\mathbf{a}=\partial\|\cdot\|_1(\mathbf{a})=\{z:z_i=\mathrm{sgn}(a_i)(i\in I_{\ne0}),|z_j|\le 1(j\in I_0)\}$.

> **The Non-Euclidean Gradient Method.** Init $\mathbf{x}_0$. General: (a) pick $\nabla f(\mathbf{x}_k)^\dagger\in\Lambda_{\nabla f(\mathbf{x}_k)}$, $L_k>0$; (b) $\mathbf{x}_{k+1}=\mathbf{x}_k-\frac{\|\nabla f(\mathbf{x}_k)\|_*}{L_k}\nabla f(\mathbf{x}_k)^\dagger$.

### Lemma 10.65 (非欧梯度法充分下降)

> **Lemma 10.65.** $f(\mathbf{x}_k)-f(\mathbf{x}_{k+1})\ge \frac{L_k-L_f}{2L_k^2}\|\nabla f(\mathbf{x}_k)\|_*^2$.

**证明**。descent lemma 代入 $x_{k+1}-x_k=-(\|\nabla f\|_*/L_k)\nabla f^\dagger$，由 Lemma 10.61(c) $\langle\nabla f,\nabla f^\dagger\rangle=\|\nabla f\|_*$，且 $\|x_{k+1}-x_k\|=\|\nabla f\|_*/L_k$：
$$f(x_{k+1})\le f(x_k)-\frac{\|\nabla f\|_*^2}{L_k}+\frac{L_f}{2}\frac{\|\nabla f\|_*^2}{L_k^2}.$$
整理即 (10.77)。$\blacksquare$

步长三选一：常数 $L_k=\bar L\in(L_f/2,\infty)$；回溯 **B4**（同 B1 用 $\|\nabla f\|_*$ 与 $\nabla f^\dagger$）；精确线搜索 $L_k\in\mathrm{argmin}_{L>0}f(x_k-(\|\nabla f\|_*/L)\nabla f^\dagger)$。上界同 (10.78) $L_k\le\max\{s,\eta L_f/(2(1-\gamma))\}$。

### Lemma 10.66

> **Lemma 10.66.** $f(\mathbf{x}_k)-f(\mathbf{x}_{k+1})\ge M\|\nabla f(\mathbf{x}_k)\|_*^2$, $M=\begin{cases}(\bar L-L_f/2)/\bar L^2,&\text{const.}\\\gamma/\max\{s,\eta L_f/(2(1-\gamma))\},&\text{B4}\\1/(2L_f),&\text{exact.}\end{cases}$

### Theorem 10.67 (非欧梯度法—非凸收敛)

> **Theorem 10.67.** (a) $\{f(\mathbf{x}_k)\}$ nonincreasing; $f(x_{k+1})<f(x_k)$ iff $\nabla f(x_k)\ne 0$; (b) if bounded below, $\nabla f(x_k)\to 0$; (c) $\min_{n\le k}\|\nabla f(x_n)\|_*\le\sqrt{(f(x_0)-f_{\mathrm{opt}})/(M(k+1))}$; (d) all limit points stationary.

**证明**：与 Thm 10.15 同构，把 $G_d$ 换 $\nabla f$，用 Lemma 10.66 与非欧 Lipschitz $\|\nabla f(\bar x)\|_*\le L_f\|\bar x-x_{k_j}\|+\|\nabla f(x_{k_j})\|_*$。$\blacksquare$

### Assumption 10.68

> **Assumption 10.68.** (A) $f$ $L_f$-smooth and convex; (B) $X^*$ nonempty; (C) for any $\alpha>0$, $\max\{\|\mathbf{x}^*-\mathbf{x}\|:f(\mathbf{x})\le\alpha,\mathbf{x}^*\in X^*\}\le R_\alpha$.

### Lemma 10.69 (凸情形二次型下降)

> **Lemma 10.69.** $f(\mathbf{x}_k)-f(\mathbf{x}_{k+1})\ge \frac{1}{C}(f(\mathbf{x}_k)-f_{\mathrm{opt}})^2$, $C=\begin{cases}R_\alpha^2\bar L^2/(\bar L-L_f/2),&\text{const.}\\R_\alpha^2\gamma\max\{s,\eta L_f/(2(1-\gamma))\}^{-1},&\text{B4}\\2R_\alpha^2L_f,&\text{exact.}\end{cases}$

**证明核心**。Lemma 10.66 给 $f(x_k)-f(x_{k+1})\ge M\|\nabla f\|_*^2$；梯度不等式+广义 Cauchy–Schwarz（Ch1 Lemma 1.4）：$f(x_k)-f_{\mathrm{opt}}\le\langle\nabla f,x_k-x^*\rangle\le\|\nabla f\|_*\|x_k-x^*\|\le R_\alpha\|\nabla f\|_*$。合并得 $f(x_k)-f(x_{k+1})\ge(M/R_\alpha^2)(f(x_k)-f_{\mathrm{opt}})^2$。$\blacksquare$

### Lemma 10.70 / Theorem 10.71

> **Lemma 10.70.** If $a_k-a_{k+1}\ge\frac{1}{\gamma}a_k^2$ and $a_k\ge 0$, then $a_k\le\frac{\gamma}{k}$ for $k\ge 1$.
> **Theorem 10.71.** Under Lemma 10.69, $f(\mathbf{x}_k)-f_{\mathrm{opt}}\le\frac{C}{k}$.

**证明**：令 $a_k=f(x_k)-f_{\mathrm{opt}}$，由 Lemma 10.69 $a_k-a_{k+1}\ge a_k^2/C$，套 Lemma 10.70 得 $a_k\le C/k$。$\blacksquare$

### Remark 10.72

> **Remark 10.72.** Const. stepsize $1/L_f$: $f(x_k)-f_{\mathrm{opt}}\le\frac{2R_\alpha^2L_f}{k}$, analogous to Euclidean Thm 10.21.

### Example 10.73 (l₁ 范数下的非欧梯度法)

> **Example 10.73.** $\ell_1$-norm, pick $i_k\in\mathrm{argmax}_i|\partial f(x_k)/\partial x_i|$; $\mathbf{x}_{k+1}=\mathbf{x}_k-\frac{\|\nabla f\|_\infty}{L_k}\mathrm{sgn}(\partial f(x_k)/\partial x_{i_k})\mathbf{e}_{i_k}$. Only one coordinate changes — a coordinate descent variant.

### Example 10.74/10.75/10.76 (欧氏 vs 非欧 lₚ 比较)

> **Example 10.74.** $\min\frac{1}{2}\mathbf{x}^TA\mathbf{x}+\mathbf{b}^T\mathbf{x}$, $A\in\mathbb{S}^n_{++}$, under $\ell_p$: $L_f^{(p)}=\|A\|_{p,q}$ ($1/p+1/q=1$). $p=2$: G2 (Euclidean). $p=1$: G1 (coordinate). By Thm 10.71, $f(x_k)-f_{\mathrm{opt}}\le\frac{2L_f^{(p)}R_{f(x_0)}^2}{k}$.
> **Remark 10.75.** G2 costs $O(n^2)$/iter; G1 only $O(n)$/iter (update $g_{k+1}=g_k-\frac{A_{i_k}x_k+b_{i_k}}{L_f^{(1)}}A\mathbf{e}_{i_k}$). Count $n$ G1 iters as one "meta-iteration."
> **Example 10.76.** $A(d)=J+dI$, $\rho_f=L_f^{(2)}/L_f^{(1)}=(d+n)/(d+1)$. As $n$ grows G1 dominates G2 — confirmed by Figures 10.4/10.5 ($n=10,100$).

## 10.9.2 The Non-Euclidean Proximal Gradient Method

回到复合模型 (10.92) $\min\{f(x)+g(x)\}$，底范数非欧氏。用 **Bregman 距离** $B_\omega$ 替换欧氏二次项。

### Assumption 10.77

> **Assumption 10.77.** (A) $g$ proper closed convex; (B) $f$ proper closed convex; $\mathrm{dom}(g)\subseteq\mathrm{int}(\mathrm{dom}(f))$, $f$ $L_f$-smooth over $\mathrm{int}(\mathrm{dom}(f))$; (C) $X^*$ nonempty.

### Assumption 10.78 (ω 的性质)

> **Assumption 10.78.** $\omega$ proper closed convex; differentiable over $\mathrm{dom}(\partial\omega)$; $\mathrm{dom}(g)\subseteq\mathrm{dom}(\omega)$; $\omega+\delta_{\mathrm{dom}(g)}$ is 1-strongly convex.

> **The Non-Euclidean Proximal Gradient Method.** Init $\mathbf{x}_0\in\mathrm{dom}(g)\cap\mathrm{dom}(\partial\omega)$. General: (a) pick $L_k>0$; (b) $\mathbf{x}_{k+1}=\mathrm{argmin}_{\mathbf{x}}\{\langle\frac{1}{L_k}\nabla f(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_k),\mathbf{x}\rangle+\frac{1}{L_k}g(\mathbf{x})+\omega(\mathbf{x})\}$.

步长：常数 $L_k=L_f$，或回溯 **B5**（同 B2 作用在 $V_L(x_k)=\mathrm{argmin}\{\dots\}$）。Remark 10.79 保证 $f(x_{k+1})\le f(x_k)+\langle\nabla f(x_k),x_{k+1}-x_k\rangle+\frac{L_k}{2}\|x_{k+1}-x_k\|^2$；Remark 10.80 给 $L_k\le\alpha L_f$。

### Theorem 10.81 (非欧近端梯度法 O(1/k))

> **Theorem 10.81.** Under Assumptions 10.77 & 10.78, const. or B5: (a) $\{F(\mathbf{x}_k)\}$ nonincreasing; (b) for $k\ge 1,\mathbf{x}^*\in X^*$: $F(\mathbf{x}_k)-F_{\mathrm{opt}}\le\dfrac{\alpha L_f B_\omega(\mathbf{x}^*,\mathbf{x}_0)}{k}$, $\alpha=1$ or $\max\{\eta,s/L_f\}$.

**证明**（对接 Ch9 镜下降）。(a) 记 $m(x,y)=f(y)+\langle\nabla f(y),x-y\rangle$。由 $V_L$ 最优性，结合 $\omega+\delta_{\mathrm{dom}(g)}$ 的 1-强凸：
$$F(x_{n+1})=f(x_{n+1})+g(x_{n+1})\le m(x_{n+1},x_n)+g(x_{n+1})+L_n B_\omega(x_{n+1},x_n)\le F(x_n)$$
（因 $x_{n+1}=\mathrm{argmin}$ 使该项 $\le$ 在 $x=x_n$ 的值）。(b) 用非欧第二近端定理（Ch9 Thm 9.12）与三点引理（Ch9 Lemma 9.11）推出 $F(x_{n+1})-F(x^*)\le L_n B_\omega(x^*,x_n)-L_n B_\omega(x^*,x_{n+1})$。除以 $L_n\le\alpha L_f$ 对 $n=0..k-1$ 求和，$B_\omega$ 相消得 $k(F(x_k)-F_{\mathrm{opt}})\le\alpha L_f B_\omega(x^*,x_0)$。$\blacksquare$

**本章总结**：复合模型 $\min\{f+g\}$ 上，普通近端梯度法把"梯度步+近端步"焊在一起，借**梯度映射**把非光滑最优条件翻译成"映射为零"。非凸只保证到驻点（梯度映射范数 $O(1/\sqrt{k})$），凸情形借基本 prox-grad 不等式拿函数值 $O(1/k)$ 与 Fejér 单调，强凸升级线性率。FISTA 用外推把 $O(1/k)$ 翻成 $O(1/k²)$，重启/V-FISTA 在强凸下拿 $O(\sqrt\kappa\log(1/\varepsilon))$ / $O((1-1/\sqrt\kappa)^k)$。平滑技术（Moreau 包络等）把三项模型压成 $O(1/\varepsilon)$。最后非欧情形用原始对偶对应或 Bregman 距离，把整套路推广到任意范数空间。
