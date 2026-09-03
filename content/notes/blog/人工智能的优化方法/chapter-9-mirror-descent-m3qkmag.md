---
blog: true
title: "Chapter 9-Mirror Descent"
slug: "chapter-9-mirror-descent-m3qkmag"
summary: "镜面下降（Mirror Descent）：用 Bregman 散度替代欧氏距离，把投影次梯度法推广到非欧空间；覆盖 Bregman 距离、镜面下降迭代、与欧氏投影次梯度的关系、三点引理、基本不等式与 O(1/√N)、O(log k/√k) 收敛率，以及复合模型下的 mirror-C / 近端次梯度法。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

> 本章研究**镜面下降法（mirror descent）**及其变体，本质是**投影次梯度法（Ch8）向非欧空间的推广**。

核心问题：投影次梯度法（Ch8）凭什么只能在欧氏空间跑？答案藏在更新式里的 $\|x-x_k\|^2$——一把"欧氏尺子"。本章把它换成更一般的 **Bregman 距离**，算法就能在非欧空间量距离了。

# 9.1 From Projected Subgradient to Mirror Descent

## 问题设定与 Assumption 9.1

$$(\mathrm{P})\qquad \min\{f(\mathbf{x}) : \mathbf{x}\in C\}. \tag{9.1}$$

> **Assumption 9.1.**
> (A) $f:\mathbb{E}\to(-\infty,\infty]$ is proper closed and convex.
> (B) $C\subseteq\mathbb{E}$ is nonempty closed and convex.
> (C) $C\subseteq\mathrm{int}(\mathrm{dom}(f))$.
> (D) The optimal set of (P) is nonempty and denoted by $X^*$. The optimal value is denoted by $f_{\mathrm{opt}}$.

**逐字点评**：与 Ch8 的 Assumption 8.7 完全相同。(C) 要求 $C$ 整体落进 $f$ 定义域内部——保证每步能取次梯度、且 Bregman 距离在 $C$ 上有定义。

## 从欧氏更新式出发

Ch8 投影次梯度法更新为

$$\mathbf{x}_{k+1} = P_C(\mathbf{x}_k - t_k\mathbf{f}'(\mathbf{x}_k)), \qquad \mathbf{f}'(\mathbf{x}_k)\in\partial f(\mathbf{x}_k). \tag{9.2}$$

书的"哲学观察"：非欧时 (9.2) 有个隐患——$\mathbf{x}_k\in\mathbb{E}$ 而次梯度 $\mathbf{f}'(\mathbf{x}_k)\in\mathbb{E}^*$，本在不同空间；只是约定 $\mathbb{E}=\mathbb{E}^*$ 才勉强成立。Beck 说这是 motivation 之一——引你去想更贴合非欧的写法。

把它重新配方，欧氏范数藏在哪一目了然：

$$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in C}\left\{ f(\mathbf{x}_k) + \langle \mathbf{f}'(\mathbf{x}_k), \mathbf{x}-\mathbf{x}_k\rangle + \frac{1}{2t_k}\|\mathbf{x}-\mathbf{x}_k\|^2 \right\}. \tag{9.3}$$

(9.2) 与 (9.3) 等价因为

$$f(\mathbf{x}_k) + \langle \mathbf{f}'(\mathbf{x}_k), \mathbf{x}-\mathbf{x}_k\rangle + \frac{1}{2t_k}\|\mathbf{x}-\mathbf{x}_k\|^2 = \frac{1}{2t_k}\bigl\|\mathbf{x}-(\mathbf{x}_k-t_k\mathbf{f}'(\mathbf{x}_k))\bigr\|^2 + D,$$

$D$ 不依赖 $\mathbf{x}$——这正是 Ch6 的"投影 = 欧氏平方邻近步"，把欧氏尺子暴露无遗。**核心思想**：非欧情况下把 (9.3) 里的 $\tfrac12\|\mathbf{x}-\mathbf{y}\|^2$ 换成 Bregman 距离。

## Definition 9.2 · Bregman 距离

> **Definition 9.2 (Bregman distance).** Let $\omega:\mathbb{E}\to(-\infty,\infty]$ be a proper closed and convex function that is differentiable over $\mathrm{dom}(\partial\omega)$. The Bregman distance associated with $\omega$ is
> $$B_\omega(\mathbf{x},\mathbf{y}) = \omega(\mathbf{x}) - \omega(\mathbf{y}) - \langle \nabla\omega(\mathbf{y}), \mathbf{x}-\mathbf{y}\rangle.$$

**逐字点评**：定义域 $\mathrm{dom}(\omega)\times\mathrm{dom}(\partial\omega)$——第二个变量要求 $\omega$ **可微**。它是 $\omega$ 在 $\mathbf{y}$ 处一阶泰勒展开"剩下的残差"。

**值得记的细节**：Bregman 距离**一般不是真正的距离**！非负、$\mathbf{x}=\mathbf{y}$ 时为零，但**既不对称、也不满足三角不等式**。下一节 Lemma 9.4 把"非负 + 零当且仅当相等"钉死。

> **Assumption 9.3 (properties of $\omega$).**
> - $\omega$ is proper closed and convex.
> - $\omega$ is differentiable over $\mathrm{dom}(\partial\omega)$.
> - $C\subseteq\mathrm{dom}(\omega)$.
> - $\omega+\delta_C$ is $\sigma$-strongly convex ($\sigma>0$).

**逐字点评**：第四点是灵魂——$\omega$ 加上 $\delta_C$ 后是 $\sigma$-强凸。$\sigma$ 是后面所有收敛率分母上的强凸常数，Beck 在埋钩子。

## Lemma 9.4 · Bregman 距离的基本性质

> **Lemma 9.4 (basic properties of Bregman distances).** Suppose $C\subseteq\mathbb{E}$ nonempty closed convex and $\omega$ satisfies Assumption 9.3. Let $B_\omega$ be the associated Bregman distance. Then
> (a) $B_\omega(\mathbf{x},\mathbf{y}) \ge \dfrac{\sigma}{2}\|\mathbf{x}-\mathbf{y}\|^2$ for all $\mathbf{x}\in C,\ \mathbf{y}\in C\cap\mathrm{dom}(\partial\omega)$.
> (b) Let $\mathbf{x}\in C,\mathbf{y}\in C\cap\mathrm{dom}(\partial\omega)$. Then $B_\omega(\mathbf{x},\mathbf{y})\ge 0$; and $B_\omega(\mathbf{x},\mathbf{y})=0$ iff $\mathbf{x}=\mathbf{y}$.

### 证明

**(a)** 用 Thm 5.24(ii) 强凸一阶刻画。因 $\omega+\delta_C$ 是 $\sigma$-强凸，对 $\mathbf{x}\in C,\mathbf{y}\in C\cap\mathrm{dom}(\partial\omega)$：

$$(\omega+\delta_C)(\mathbf{x}) \ge (\omega+\delta_C)(\mathbf{y}) + \langle \nabla\omega(\mathbf{y}),\mathbf{x}-\mathbf{y}\rangle + \frac{\sigma}{2}\|\mathbf{x}-\mathbf{y}\|^2.$$

用 $\nabla\omega(\mathbf{y})$ 作为 $\omega+\delta_C$ 在 $\mathbf{y}\in C$ 处次梯度（$\omega$ 可微、$\delta_C$ 在 $C$ 上恒 0）；又 $\mathbf{x},\mathbf{y}\in C\Rightarrow\delta_C(\mathbf{x})=\delta_C(\mathbf{y})=0$，代入得 $B_\omega(\mathbf{x},\mathbf{y})\ge\tfrac{\sigma}{2}\|\mathbf{x}-\mathbf{y}\|^2$。$\blacksquare$

**(b)** 由 (a) 立得非负；$\mathbf{x}=\mathbf{y}$ 时定义式给 0；若 $B_\omega=0$ 则 $\tfrac{\sigma}{2}\|\mathbf{x}-\mathbf{y}\|^2\le 0\Rightarrow\mathbf{x}=\mathbf{y}$。$\blacksquare$

**结论**：(a) 把 Bregman 距离从下方钉死在欧氏距离平方上，凡是出现 $-B_\omega$ 都能换 $-\tfrac{\sigma}{2}\|\cdot\|^2$ 去和别的平方项抵消——这是后面一切的关键。

## 更新式的三层化简

把 (9.3) 的 $\tfrac12\|\mathbf{x}-\mathbf{x}_k\|^2$ 换成 $B_\omega(\mathbf{x},\mathbf{x}_k)$ 得 (9.4)，扔常数得

$$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in C}\left\{ \langle \mathbf{f}'(\mathbf{x}_k), \mathbf{x}\rangle + \frac{1}{t_k}B_\omega(\mathbf{x},\mathbf{x}_k) \right\}. \tag{9.5}$$

展开 Bregman 把 $\mathbf{x}$ 项拢起：

$$\begin{aligned}
\langle \mathbf{f}'(\mathbf{x}_k),\mathbf{x}\rangle + \frac{1}{t_k}B_\omega(\mathbf{x},\mathbf{x}_k)
&= \frac{1}{t_k}\Bigl[\omega(\mathbf{x})-\omega(\mathbf{x}_k)-\langle\nabla\omega(\mathbf{x}_k),\mathbf{x}-\mathbf{x}_k\rangle + \langle t_k\mathbf{f}'(\mathbf{x}_k),\mathbf{x}\rangle\Bigr]\\
&= \frac{1}{t_k}\Bigl[\langle t_k\mathbf{f}'(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_k),\mathbf{x}\rangle + \omega(\mathbf{x}) \underbrace{-\omega(\mathbf{x}_k)+\langle\nabla\omega(\mathbf{x}_k),\mathbf{x}_k\rangle}_{\text{常数}}\Bigr].
\end{aligned}$$

丢常数，最精简形式：

$$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in C}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_k),\mathbf{x}\rangle + \omega(\mathbf{x}) \right\}. \tag{9.6}$$

## The Mirror Descent Method

**Initialization:** pick $\mathbf{x}_0\in C\cap\mathrm{dom}(\partial\omega)$.
**General step:** for $k=0,1,2,\dots$ (a) pick $t_k>0$ and $\mathbf{f}'(\mathbf{x}_k)\in\partial f(\mathbf{x}_k)$; (b) set (9.6).

### Remark 9.5 · 等价写法

> **Remark 9.5.** Formula (9.5) can also be written as
> $$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in C}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k),\mathbf{x}\rangle + B_\omega(\mathbf{x},\mathbf{x}_k) \right\}. \tag{9.7}$$

**作者注**：收敛分析用 (9.7)——Bregman 距离显式留在目标里，正是 Lemma 9.13 能 telescoping 的关键。

### Remark 9.6 · "镜面"名字的来历

> **Remark 9.6.** Defining $\widetilde{\omega}=\omega+\delta_C$, (9.6) becomes
> $$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in\mathbb{E}}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_k),\mathbf{x}\rangle + \widetilde{\omega}(\mathbf{x}) \right\}. \tag{9.8}$$
> Since $\nabla\omega(\mathbf{x}_k)\in\partial\widetilde{\omega}(\mathbf{x}_k)$, write $\widetilde{\omega}'(\mathbf{x}_k)$, so
> $$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in\mathbb{E}}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k)-\widetilde{\omega}'(\mathbf{x}_k),\mathbf{x}\rangle + \widetilde{\omega}(\mathbf{x}) \right\}. \tag{9.9}$$
> By the conjugate correspondence theorem (Theorem 5.26), whose assumptions hold (properness, closedness, strong convexity of $\widetilde{\omega}$), $\widetilde{\omega}^*$ is differentiable; combined with the conjugate subgradient theorem (Corollary 4.21),
> $$\mathbf{x}_{k+1} = \nabla\widetilde{\omega}^*\bigl(\widetilde{\omega}'(\mathbf{x}_k)-t_k\mathbf{f}'(\mathbf{x}_k)\bigr).$$

**为什么这一行最关键**：这就是 "mirror" 全部含义！三步——①**上镜**：$\nabla\widetilde{\omega}$ 把 $\mathbf{x}_k$ 映射到对偶得 $\widetilde{\omega}'(\mathbf{x}_k)$；②**在对偶空间朝次梯度反方向走一步**：减 $t_k\mathbf{f}'(\mathbf{x}_k)$；③**下镜**：用 $\nabla\widetilde{\omega}^*$ 映射回原空间。Ch4 共轭函数、Ch5 共轭对应定理（Thm 5.26）在此合体。

## Lemma 9.7 · 更一般的良定性引理

> **Lemma 9.7.** Assume: $\omega$ proper closed convex, differentiable over $\mathrm{dom}(\partial\omega)$; $\psi$ proper closed convex, $\mathrm{dom}(\psi)\subseteq\mathrm{dom}(\omega)$; $\omega+\delta_{\mathrm{dom}(\psi)}$ $\sigma$-strongly convex. Then the minimizer of $\min_{\mathbf{x}\in\mathbb{E}}\{\psi(\mathbf{x})+\omega(\mathbf{x})\}$ is uniquely attained in $\mathrm{dom}(\psi)\cap\mathrm{dom}(\partial\omega)$.

### 证明

令 $\phi=\psi+\omega$。$\phi$ 闭（两闭函数和闭），$\mathrm{dom}(\phi)=\mathrm{dom}(\psi)\neq\emptyset$ 故 proper。因 $\omega+\delta_{\mathrm{dom}(\psi)}$ $\sigma$-强凸，而 $\psi+\omega+\delta_{\mathrm{dom}(\psi)}=\psi+\omega=\phi$，故 $\phi$ 是 $\sigma$-强凸的。由 Thm 5.25(a)，有**唯一**极小点 $\mathbf{x}^*\in\mathrm{dom}(\psi)$。

Fermat（Thm 3.63）给 $0\in\partial\phi(\mathbf{x}^*)$；次微分和法则（Thm 3.40）$\partial\phi(\mathbf{x}^*)=\partial\psi(\mathbf{x}^*)+\partial\omega(\mathbf{x}^*)$，故 $\partial\omega(\mathbf{x}^*)\neq\emptyset$，即 $\mathbf{x}^*\in\mathrm{dom}(\partial\omega)$。$\blacksquare$

**逐字点评**：万能钥匙——不要求约束闭。后面 Thm 9.8/9.12/9.24 全靠它一句带过。

## Theorem 9.8 · 镜面下降是 well-defined 的

> **Theorem 9.8 (mirror descent is well defined).** Suppose Assumptions 9.1 and 9.3 hold. Let $\mathbf{a}\in\mathbb{E}^*$. Then $\min_{\mathbf{x}\in C}\{\langle \mathbf{a},\mathbf{x}\rangle+\omega(\mathbf{x})\}$ has a unique minimizer in $C\cap\mathrm{dom}(\partial\omega)$.

**证明**：调 Lemma 9.7，取 $\psi(\mathbf{x})\equiv\langle\mathbf{a},\mathbf{x}\rangle+\delta_C(\mathbf{x})$。$\mathrm{dom}(\psi)=C\subseteq\mathrm{dom}(\omega)$，$\omega+\delta_{\mathrm{dom}(\psi)}=\omega+\delta_C$ 即 Assumption 9.3 的 $\sigma$-强凸。$\blacksquare$

## Example 9.9 · 平方欧氏范数（回到投影次梯度）

> **Example 9.9 (squared Euclidean norm).** Suppose Assumption 9.1 holds and $\mathbb{E}$ is Euclidean. Define $\omega(\mathbf{x})=\tfrac{1}{2}\|\mathbf{x}\|^2$. Then $\omega$ satisfies Assumption 9.3—proper closed, 1-strongly convex. Since $\nabla\omega(\mathbf{x})=\mathbf{x}$, the update reads
> $$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in C}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k)-\mathbf{x}_k,\mathbf{x}\rangle + \tfrac{1}{2}\|\mathbf{x}\|^2 \right\},$$
> which is the same as the projected subgradient update: $\mathbf{x}_{k+1}=P_C(\mathbf{x}_k-t_k\mathbf{f}'(\mathbf{x}_k))$.

**逐字点评**：一致性检验——$\omega=\tfrac12\|\mathbf{x}\|^2$ 时镜面下降**退化成 Ch8 投影次梯度法**（"of course not a surprise"）。此时 $B_\omega(\mathbf{x},\mathbf{y})=\tfrac12\|\mathbf{x}-\mathbf{y}\|^2$，又见 Ch6 欧氏邻近项。

## Example 9.10 · 单位单纯形上的负熵（KL 散度）

> **Example 9.10 (negative entropy over the unit simplex).** Suppose Assumption 9.1 holds with $\mathbb{E}=\mathbb{R}^n$ ($\ell_1$-norm), $C=\Delta_n$. Take $\omega$ the negative entropy:
> $$\omega(\mathbf{x}) = \begin{cases} \sum_{i=1}^n x_i\log x_i, & \mathbf{x}\in\mathbb{R}^n_+, \\ \infty, & \text{else}, \end{cases}$$
> with $0\log 0=0$. By Example 5.27, $\omega+\delta_{\Delta_n}$ is 1-strongly convex w.r.t. $\ell_1$. Also $\mathrm{dom}(\partial\omega)=\mathbb{R}^n_{++}$. The Bregman distance for $\mathbf{x}\in\Delta_n,\mathbf{y}\in\Delta^+_n\equiv\{\mathbf{x}\in\mathbb{R}^n_{++}:\mathbf{e}^T\mathbf{x}=1\}$ is
> $$B_\omega(\mathbf{x},\mathbf{y}) = \sum_{i=1}^n x_i\log\frac{x_i}{y_i}, \tag{9.13}$$
> the Kullback–Leibler divergence. The update is
> $$x^{k+1}_i = \frac{x^k_i e^{-t_k f'_i(\mathbf{x}_k)}}{\sum_{j=1}^n x^k_j e^{-t_k f'_j(\mathbf{x}_k)}}, \qquad i=1,\dots,n. \tag{9.14}$$

### 自己推 KL 散度

$B_\omega(\mathbf{x},\mathbf{y})=\omega(\mathbf{x})-\omega(\mathbf{y})-\langle\nabla\omega(\mathbf{y}),\mathbf{x}-\mathbf{y}\rangle$，$\nabla\omega(\mathbf{y})_i=\log y_i+1$：

$$B_\omega(\mathbf{x},\mathbf{y}) = \sum_i x_i\log x_i - \sum_i y_i\log y_i - \sum_i(\log y_i+1)(x_i-y_i) = \sum_i x_i\log\frac{x_i}{y_i} + \Bigl(\sum_i y_i-\sum_i x_i\Bigr).$$

因 $\mathbf{x},\mathbf{y}\in\Delta_n$（或 $\Delta^+_n$）都有 $\sum x_i=\sum y_i=1$，末项归零，得 $\sum_i x_i\log(x_i/y_i)$——**KL 散度**。$\blacksquare$

**逐字点评**：负熵生成的 Bregman 距离 = KL 散度。更新 (9.14) 是 **softmax / 乘性更新**：各分量先乘 $e^{-t_k f'_i}$ 再归一化，自动保持非负与归一化，无需投影——这是非欧镜面下降在单纯形上常胜出的根因（见 9.17、9.19）。

---

# 9.2 Convergence Analysis

## 9.2.1 The Toolbox

### Lemma 9.11 · 三点引理

> **Lemma 9.11 (three-points lemma).** Suppose $\omega$ proper closed convex, differentiable over $\mathrm{dom}(\partial\omega)$. Let $\mathbf{a},\mathbf{b}\in\mathrm{dom}(\partial\omega),\mathbf{c}\in\mathrm{dom}(\omega)$. Then
> $$\langle \nabla\omega(\mathbf{b})-\nabla\omega(\mathbf{a}),\mathbf{c}-\mathbf{a}\rangle = B_\omega(\mathbf{c},\mathbf{a}) + B_\omega(\mathbf{a},\mathbf{b}) - B_\omega(\mathbf{c},\mathbf{b}).$$

**证明**：直接代入三式

$$\begin{aligned}
&B_\omega(\mathbf{c},\mathbf{a})+B_\omega(\mathbf{a},\mathbf{b})-B_\omega(\mathbf{c},\mathbf{b})\\
&= \bigl[\omega(\mathbf{c})-\omega(\mathbf{a})-\langle\nabla\omega(\mathbf{a}),\mathbf{c}-\mathbf{a}\rangle\bigr]+\bigl[\omega(\mathbf{a})-\omega(\mathbf{b})-\langle\nabla\omega(\mathbf{b}),\mathbf{a}-\mathbf{b}\rangle\bigr]-\bigl[\omega(\mathbf{c})-\omega(\mathbf{b})-\langle\nabla\omega(\mathbf{b}),\mathbf{c}-\mathbf{b}\rangle\bigr]\\
&= -\langle\nabla\omega(\mathbf{a}),\mathbf{c}-\mathbf{a}\rangle-\langle\nabla\omega(\mathbf{b}),\mathbf{a}-\mathbf{b}\rangle+\langle\nabla\omega(\mathbf{b}),\mathbf{c}-\mathbf{b}\rangle = \langle\nabla\omega(\mathbf{b})-\nabla\omega(\mathbf{a}),\mathbf{c}-\mathbf{a}\rangle. \quad\blacksquare
\end{aligned}$$

**为什么这一行最关键**：整章收敛分析的扳手。把"两梯度差与某点内积"翻译成"三个 Bregman 距离组合"（源自 Chen and Teboulle [43]），Lemma 9.13 靠它把 $\langle\nabla\omega(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_{k+1}),\cdot\rangle$ 拆成能 telescoping 的三项。

### Theorem 9.12 · 非欧二阶邻近定理

> **Theorem 9.12 (non-Euclidean second prox theorem).** Let $\omega$ proper closed convex differentiable over $\mathrm{dom}(\partial\omega)$; $\psi$ proper closed convex with $\mathrm{dom}(\psi)\subseteq\mathrm{dom}(\omega)$; $\omega+\delta_{\mathrm{dom}(\psi)}$ $\sigma$-strongly convex. Assume $\mathbf{b}\in\mathrm{dom}(\partial\omega)$, and let
> $$\mathbf{a} = \arg\min_{\mathbf{x}\in\mathbb{E}}\{\psi(\mathbf{x})+B_\omega(\mathbf{x},\mathbf{b})\}. \tag{9.15}$$
> Then $\mathbf{a}\in\mathrm{dom}(\partial\omega)$ and for all $\mathbf{u}\in\mathrm{dom}(\psi)$,
> $$\langle \nabla\omega(\mathbf{b})-\nabla\omega(\mathbf{a}),\mathbf{u}-\mathbf{a}\rangle \le \psi(\mathbf{u})-\psi(\mathbf{a}). \tag{9.16}$$

**证明**：展开 $B_\omega(\mathbf{x},\mathbf{b})=\omega(\mathbf{x})-\omega(\mathbf{b})-\langle\nabla\omega(\mathbf{b}),\mathbf{x}-\mathbf{b}\rangle$，(9.15) 等价于

$$\mathbf{a} = \arg\min_{\mathbf{x}\in\mathbb{E}}\{\psi(\mathbf{x})-\langle\nabla\omega(\mathbf{b}),\mathbf{x}\rangle+\omega(\mathbf{x})\}. \tag{9.17}$$

"$\mathbf{a}\in\mathrm{dom}(\partial\omega)$" 调 Lemma 9.7（把 $\psi(\mathbf{x})-\langle\nabla\omega(\mathbf{b}),\mathbf{x}\rangle$ 当 $\psi$）。对 (9.17) 用 Fermat（Thm 3.63）：存在 $\psi'(\mathbf{a})\in\partial\psi(\mathbf{a})$ 使 $\psi'(\mathbf{a})+\nabla\omega(\mathbf{a})-\nabla\omega(\mathbf{b})=0$，即 $\nabla\omega(\mathbf{b})-\nabla\omega(\mathbf{a})=\psi'(\mathbf{a})$。由次梯度不等式：

$$\langle \nabla\omega(\mathbf{b})-\nabla\omega(\mathbf{a}),\mathbf{u}-\mathbf{a}\rangle = \langle \psi'(\mathbf{a}),\mathbf{u}-\mathbf{a}\rangle \le \psi(\mathbf{u})-\psi(\mathbf{a}). \quad\blacksquare$$

**逐字点评**：Ch6 二阶邻近定理（Thm 6.39）的非欧翻版。把"做一次 Bregman-邻近步得到的 $\mathbf{a}$"翻译成一句梯度单调性不等式 (9.16)——正是这句让 Lemma 9.13 能接进次梯度信息。结论里没有 $\|x-y\|^2$，全靠 Bregman 距离撑着。

### Lemma 9.13 · 镜面下降的基本不等式

> **Lemma 9.13 (fundamental inequality for mirror descent).** Suppose Assumptions 9.1 and 9.3 hold. Let $\{\mathbf{x}_k\}$ be generated by mirror descent with positive stepsizes. Then for any $\mathbf{x}^*\in X^*$ and $k\ge 0$,
> $$t_k\bigl(f(\mathbf{x}_k)-f_{\mathrm{opt}}\bigr) \le B_\omega(\mathbf{x}^*,\mathbf{x}_k) - B_\omega(\mathbf{x}^*,\mathbf{x}_{k+1}) + \frac{t_k^2}{2\sigma}\|\mathbf{f}'(\mathbf{x}_k)\|_*^2. \tag{9.*}$$

**证明**（全章枢纽）：对 (9.7) 的 $\mathbf{x}_{k+1}$ 用 Theorem 9.12，取 $\mathbf{b}=\mathbf{x}_k$、$\psi(\mathbf{x})\equiv t_k\langle\mathbf{f}'(\mathbf{x}_k),\mathbf{x}\rangle+\delta_C(\mathbf{x})$（故 $\mathbf{a}=\mathbf{x}_{k+1}$），得对任意 $\mathbf{u}\in C$：

$$\langle \nabla\omega(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_{k+1}),\mathbf{u}-\mathbf{x}_{k+1}\rangle \le t_k\langle \mathbf{f}'(\mathbf{x}_k),\mathbf{u}-\mathbf{x}_{k+1}\rangle. \tag{9.18}$$

三点引理取 $\mathbf{a}=\mathbf{x}_{k+1},\mathbf{b}=\mathbf{x}_k,\mathbf{c}=\mathbf{u}$ 给左边 $=B_\omega(\mathbf{u},\mathbf{x}_{k+1})+B_\omega(\mathbf{x}_{k+1},\mathbf{x}_k)-B_\omega(\mathbf{u},\mathbf{x}_k)$。代入 (9.18) 移项：

$$t_k\langle \mathbf{f}'(\mathbf{x}_k),\mathbf{x}_k-\mathbf{u}\rangle \le B_\omega(\mathbf{u},\mathbf{x}_k)-B_\omega(\mathbf{u},\mathbf{x}_{k+1})-B_\omega(\mathbf{x}_{k+1},\mathbf{x}_k)+t_k\langle \mathbf{f}'(\mathbf{x}_k),\mathbf{x}_k-\mathbf{x}_{k+1}\rangle. \tag{\ast}$$

**$(\ast)$**：Lemma 9.4(a) 给 $B_\omega(\mathbf{x}_{k+1},\mathbf{x}_k)\ge\tfrac{\sigma}{2}\|\mathbf{x}_{k+1}-\mathbf{x}_k\|^2$，故 $-B_\omega(\cdot)\le-\tfrac{\sigma}{2}\|\cdot\|^2$。**$(\ast\ast)$**：Fenchel / Young

$$t_k\langle \mathbf{f}'(\mathbf{x}_k),\mathbf{x}_k-\mathbf{x}_{k+1}\rangle \le \frac{t_k^2}{2\sigma}\|\mathbf{f}'(\mathbf{x}_k)\|_*^2 + \frac{\sigma}{2}\|\mathbf{x}_{k+1}-\mathbf{x}_k\|^2.$$

$-\tfrac{\sigma}{2}\|\cdot\|^2$ 与 $+\tfrac{\sigma}{2}\|\cdot\|^2$ **正好抵消**（这正是一切的意义！）。于是

$$t_k\langle \mathbf{f}'(\mathbf{x}_k),\mathbf{x}_k-\mathbf{u}\rangle \le B_\omega(\mathbf{u},\mathbf{x}_k)-B_\omega(\mathbf{u},\mathbf{x}_{k+1}) + \frac{t_k^2}{2\sigma}\|\mathbf{f}'(\mathbf{x}_k)\|_*^2.$$

取 $\mathbf{u}=\mathbf{x}^*$ 用次梯度不等式 $f(\mathbf{x}_k)-f_{\mathrm{opt}}\le\langle\mathbf{f}'(\mathbf{x}_k),\mathbf{x}_k-\mathbf{x}^*\rangle$ 即证。$\blacksquare$

**结论**：Ch8 Lemma 8.11 的 Bregman 推广。左是"当前函数误差乘步长"，右一、二项是 Bregman 距离差分（求和 telescoping），三项是步长平方乘次梯度对偶范数平方。所有收敛率都从它求和得到。

### Lemma 9.14 · 最优值的累加界

> **Lemma 9.14.** Suppose Assumptions 9.1 and 9.3 hold and $\|\mathbf{f}'(\mathbf{x})\|_*\le L_f$ for all $\mathbf{x}\in C$. Suppose $B_\omega(\mathbf{x},\mathbf{x}_0)$ is bounded over $C$, and let $\Theta(\mathbf{x}_0)\ge\max_{\mathbf{x}\in C}B_\omega(\mathbf{x},\mathbf{x}_0)$. Let $\{\mathbf{x}_k\}$ be generated by mirror descent with positive stepsizes. Then for any $N\ge 0$,
> $$f_{\mathrm{best}}^N - f_{\mathrm{opt}} \le \frac{\Theta(\mathbf{x}_0) + \dfrac{L_f^2}{2\sigma}\sum_{k=0}^N t_k^2}{\sum_{k=0}^N t_k}, \tag{9.20}$$
> where $f_{\mathrm{best}}^N\equiv\min_{n=0,\dots,N}f(\mathbf{x}_n)$.

**证明**：对 Lemma 9.13 在 $k=0,\dots,N$ 求和：

$$\sum_{k=0}^N t_k(f(\mathbf{x}_k)-f_{\mathrm{opt}}) \le B_\omega(\mathbf{x}^*,\mathbf{x}_0)-B_\omega(\mathbf{x}^*,\mathbf{x}_{N+1}) + \frac{1}{2\sigma}\sum_{k=0}^N t_k^2\|\mathbf{f}'(\mathbf{x}_k)\|_*^2 \le \Theta(\mathbf{x}_0) + \frac{L_f^2}{2\sigma}\sum_{k=0}^N t_k^2,$$

用了 $B_\omega(\mathbf{x}^*,\mathbf{x}_{N+1})\ge 0$ 与 $\|\mathbf{f}'\|_*\le L_f$。再因 $(\sum t_k)(f_{\mathrm{best}}^N-f_{\mathrm{opt}})\le\sum t_k(f(\mathbf{x}_k)-f_{\mathrm{opt}})$，除即得 (9.20)。$\blacksquare$

**逐字点评**：$\Theta(\mathbf{x}_0)$ 是"从初点到整个可行域的 Bregman 直径"上界，取代欧氏下 $\tfrac12\|\mathbf{x}-\mathbf{x}_0\|^2$。这一步把"如何选步长"暴露成纯代数：分子 $\Theta+$ 步长平方和，分母步长和。

## 9.2.2 Fixed Number of Iterations

### Lemma 9.15 · 最优常步长

> **Lemma 9.15.** The optimal solution of
> $$\min_{t_1,\dots,t_m>0}\ \frac{\alpha+\beta\sum_{k=1}^m t_k^2}{\sum_{k=1}^m t_k} \quad(\alpha,\beta>0)$$
> is $t_k=\sqrt{\dfrac{\alpha}{\beta m}},\ k=1,\dots,m$. The optimal value is $\dfrac{2\sqrt{\alpha\beta}}{\sqrt{m}}$.

**证明**：目标 $\phi(\mathbf{t})$ 置换对称，故若存在最优解必存在一个各分量相等的最优解（取任意最优解与所有置换的平均，凸性保证平均仍最优且各分量同）。问题退化为 $\min_{t>0}\frac{\alpha+\beta m t^2}{m t}=\min_{t>0}(\frac{\alpha}{m t}+\beta t)$。导数 $-\alpha/(m t^2)+\beta=0\Rightarrow t=\sqrt{\alpha/(\beta m)}$，代回得最优值 $2\sqrt{\alpha\beta/m}$。$\blacksquare$

**值得记的细节**：压平文本把 $t_k$ 写成 $\sqrt{\alpha\beta m}$（丢除号）——正确是 $t_k=\sqrt{\alpha/(\beta m)}$，最优值 $2\sqrt{\alpha\beta/m}$。下面 Thm 9.16 代入后正好和 (9.23) 对上，可作交叉验证。

### Theorem 9.16 · 固定迭代的 O(1/√N)

> **Theorem 9.16 ($O(1/\sqrt{N})$ rate, fixed iterations).** Under Lemma 9.14's assumptions, let $N$ be a positive integer and use
> $$t_k = \frac{\sqrt{2\Theta(\mathbf{x}_0)\sigma}}{L_f\sqrt{N+1}}, \qquad k=0,1,\dots,N. \tag{9.23}$$
> Then
> $$f_{\mathrm{best}}^N - f_{\mathrm{opt}} \le \frac{\sqrt{2\Theta(\mathbf{x}_0)}\,L_f}{\sqrt{\sigma}\,\sqrt{N+1}}.$$

**证明**：Lemma 9.14 取 $\alpha=\Theta(\mathbf{x}_0)$、$\beta=L_f^2/(2\sigma)$、$m=N+1$，由 Lemma 9.15 最优步长即 (9.23)，代回即得。$\blacksquare$

**结论**：与投影次梯度法（Ch8）一样，固定迭代下镜面下降也是 $O(1/\sqrt{N})$——非欧推广未损失收敛阶，常数换成 Bregman 直径 $\Theta$ 与对偶 Lipschitz 常数 $L_f$。

### Example 9.17 · 单纯形上的两种设定对比

> **Example 9.17 (optimization over the unit simplex).** Consider $\min\{f(\mathbf{x}):\mathbf{x}\in\Delta_n\}$, $f$ proper closed convex, $\Delta_n\subseteq\mathrm{int}(\mathrm{dom}(f))$. Two algorithms:

**欧氏设定**：$\ell_2$，$\omega=\tfrac12\|\mathbf{x}\|_2^2$（$1$-强凸），镜面下降 = 投影次梯度。取 $\mathbf{x}_0=\tfrac1n\mathbf{e}$，算出 $\max_{\Delta_n}B_\omega(\mathbf{x},\mathbf{x}_0)=\tfrac12(1-\tfrac1n)$，取 $\Theta=1$。由 Thm 9.16：

$$f_{\mathrm{best}}^N-f_{\mathrm{opt}}\le \frac{\sqrt{2}\,L_{f,2}}{\sqrt{N+1}}, \quad L_{f,2}=\max_{\Delta_n}\|\mathbf{f}'\|_2. \tag{9.24}$$

**非欧设定**：$\ell_1$，负熵，乘性更新 $x^{k+1}_i=x^k_i e^{-t_k f'_i}/\sum_j x^k_j e^{-t_k f'_j}$。取 $\mathbf{x}_0=\tfrac1n\mathbf{e}$，利用 $B_\omega=$ KL 散度得 $\max_{\Delta_n}B_\omega(\mathbf{x},\tfrac1n\mathbf{e})=\log n$，故 $\Theta=\log n$。由 Thm 9.16：

$$f_{\mathrm{best}}^N-f_{\mathrm{opt}}\le \frac{\sqrt{2\log n}\,L_{f,\infty}}{\sqrt{N+1}}, \quad L_{f,\infty}=\max_{\Delta_n}\|\mathbf{f}'\|_\infty. \tag{9.26}$$

**两种上界比值** $\rho_f=\sqrt{\log n}\,L_{f,\infty}/L_{f,2}$。因 $\|\mathbf{y}\|_\infty\le\|\mathbf{y}\|_2\le\sqrt{n}\|\mathbf{y}\|_\infty$，有 $\sqrt{\log n}/\sqrt{n}\le\rho_f\le\sqrt{\log n}$。

**结论**：非欧（md）是否优于欧氏（ps），取决于次梯度在 $\ell_\infty$ 与 $\ell_2$ 下的相对大小。次梯度"分散"时 $\rho_f<1$，熵距离镜面下降胜出；最坏 $\rho_f\le\sqrt{\log n}$，欧氏仅微弱占优。Beck 在埋钩子：单纯形 + 熵距离不是"永远更好"，而是"对的结构更好"。

## 9.2.3 Dynamic Stepsize Rule

> **作者注**：固定步长需预先知道总迭代次数 $N$——实战往往不知道。动态步长才实用，完全类比 Ch8。

### Theorem 9.18 · 动态步长收敛

> **Theorem 9.18 (convergence with dynamic stepsizes).** Suppose Assumptions 9.1 and 9.3 hold and $\|\mathbf{f}'(\mathbf{x})\|_*\le L_f$. Let $\{\mathbf{x}_k\}$ be generated with positive stepsizes, $\{f_{\mathrm{best}}^k\}$ as in (9.19).
> (a) If $\dfrac{\sum_{n=0}^k t_n^2}{\sum_{n=0}^k t_n}\to 0$, then $f_{\mathrm{best}}^k\to f_{\mathrm{opt}}$.
> (b) If $t_k$ is either (predefined) $t_k=\dfrac{\sqrt{2\sigma}}{L_f\sqrt{k+1}}$ or (adaptive)
> $$t_k=\begin{cases}\dfrac{\sqrt{2\sigma}}{\|\mathbf{f}'(\mathbf{x}_k)\|_*}\dfrac{1}{\sqrt{k+1}}, & \mathbf{f}'(\mathbf{x}_k)\neq\mathbf{0},\\[6pt] \dfrac{\sqrt{2\sigma}}{L_f\sqrt{k+1}}, & \mathbf{f}'(\mathbf{x}_k)=\mathbf{0},\end{cases}$$
> then for all $k\ge 1$,
> $$f_{\mathrm{best}}^k - f_{\mathrm{opt}} \le B_\omega(\mathbf{x}^*,\mathbf{x}_0) + \frac{L_f}{\sqrt{2\sigma}}\,\frac{1+\log(k+1)}{\sqrt{k+1}}.$$

**证明**：由 Lemma 9.13 对 $n=0,\dots,k$ 求和，并用 $B_\omega(\mathbf{x}^*,\mathbf{x}_{k+1})\ge 0$、$f(\mathbf{x}_n)\ge f_{\mathrm{best}}^k$：

$$f_{\mathrm{best}}^k-f_{\mathrm{opt}} \le \frac{B_\omega(\mathbf{x}^*,\mathbf{x}_0)+\dfrac{1}{2\sigma}\sum_{n=0}^k t_n^2\|\mathbf{f}'(\mathbf{x}_n)\|_*^2}{\sum_{n=0}^k t_n}. \tag{9.27}$$

**(a)** 若 $\sum t_n^2/\sum t_n\to 0$，右端趋于 0。$\blacksquare$ **(b)** 两种步长都满足 $t_n^2\|\mathbf{f}'(\mathbf{x}_n)\|_*^2\le 2\sigma/(n+1)$ 且 $t_n\ge\sqrt{2\sigma}/(L_f\sqrt{n+1})$。代入 (9.27)：

$$\frac{\sum t_n^2\|\mathbf{f}'\|_*^2}{\sum t_n} \le \frac{L_f}{\sqrt{2\sigma}}\,\frac{\sum\frac{1}{n+1}}{\sum\frac{1}{\sqrt{n+1}}}.$$

由 Lemma 8.27(a) 分子 $\le 1+\log(k+1)$、分母 $\ge\sqrt{k+1}$，得证。$\blacksquare$

**逐字点评**：自适应步长 $\sqrt{2\sigma}/\|\mathbf{f}'(\mathbf{x}_k)\|_*\cdot 1/\sqrt{k+1}$ 很妙——就地用当前次梯度大小缩放：梯度大步长小，为零则 fall back 到预设值。结论阶 $O(\log k/\sqrt{k})$（Bregman 直径被 $\sum t_n\sim\sqrt{k}$ 除后归入同阶），与 Ch8 动态步长一致。

### Example 9.19 · 镜面下降 vs 投影次梯度（数值）

> **Example 9.19.** Consider $\min\{\|A\mathbf{x}-\mathbf{b}\|_1:\mathbf{x}\in\Delta_n\}$ with $A\in\mathbb{R}^{n\times n},\mathbf{b}\in\mathbb{R}^n$. The values of $f(\mathbf{x}_k)-f_{\mathrm{opt}}$ and $f_{\mathrm{best}}^k-f_{\mathrm{opt}}$ are described in **Figure 9.1**.

- **投影次梯度（ps，欧氏 $\ell_2$）**：$\mathbf{x}_{k+1}=P_{\Delta_n}(\mathbf{x}_k-t_k\mathbf{f}'(\mathbf{x}_k))$，$\mathbf{f}'=A^T\mathrm{sgn}(A\mathbf{x}_k-\mathbf{b})$，自适应 $t_k=\sqrt{2}/(\|\mathbf{f}'\|_2\sqrt{k+1})$。
- **镜面下降（md，非欧 $\ell_1$+负熵）**：乘性更新，步长 $t_k=\sqrt{2}/(\|\mathbf{f}'\|_\infty\sqrt{k+1})$。两设定 $\sigma=1$。

书用 $n=100$、标准正态生成 $A,\mathbf{b}$（*See the original image for Figure 9.1, the log-scale plots of $f(\mathbf{x}_k)-f_{\mathrm{opt}}$ and $f_{\mathrm{best}}^k-f_{\mathrm{opt}}$*）。结果：**md 明显优于 ps**。直觉：$\ell_1/\ell_\infty$ 结构 + 熵距离 + 单纯形，比强行欧氏投影更贴合问题几何。

---

# 9.3 Mirror Descent for the Composite Model

> **作者注**：§9.1–9.2 假设目标就是 $f$、约束是 $C$。这节推广到复合模型 $F=f+g$（$g$ 通常不光滑但结构简单的正则项）——mirror-C 方法，和 Ch10 的**近端次梯度法**是一家。

## Assumption 9.20 & 9.21

> **Assumption 9.20 (properties of $f$ and $g$).**
> (A) $f,g:\mathbb{E}\to(-\infty,\infty]$ proper closed convex.
> (B) $\mathrm{dom}(g)\subseteq\mathrm{int}(\mathrm{dom}(f))$.
> (C) $\|\mathbf{f}'(\mathbf{x})\|_*\le L_f$ for $\mathbf{x}\in\mathrm{dom}(g)$ ($L_f>0$).
> (D) Optimal set of $F=f+g$ nonempty, denoted $X^*$; value $F_{\mathrm{opt}}$.

> **Assumption 9.21 (properties of $\omega$).**
> - $\omega$ proper closed convex, differentiable over $\mathrm{dom}(\partial\omega)$.
> - $\mathrm{dom}(g)\subseteq\mathrm{dom}(\omega)$.
> - $\omega+\delta_{\mathrm{dom}(g)}$ is $\sigma$-strongly convex.

问题：$\min_{\mathbf{x}}\{F(\mathbf{x})\equiv f(\mathbf{x})+g(\mathbf{x})\}$。与 9.3 唯一差别：$C$ 换成 $\mathrm{dom}(g)$（**没要求闭**）。

**朴素想法**（把 $f,g$ 都线性化、用 $\mathrm{dom}(g)$ 当 $C$）：

$$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}\in C}\left\{ \langle \mathbf{f}'(\mathbf{x}_k)+\mathbf{g}'(\mathbf{x}_k),\mathbf{x}\rangle + \frac{1}{t_k}B_\omega(\mathbf{x},\mathbf{x}_k) \right\}. \tag{9.30}$$

书泼冷水：①未假设 $\mathrm{dom}(g)$ 闭，argmin 可能空；②未假设 $g$ Lipschitz（只在 (C) 对 $f$ 成立），而 Lipschitz 是收敛关键；③即便 $g$ Lipschitz，$F$ 的常数可能远大于 $L_f$，而我们要效率估计**只依赖 $L_f$**。

**正确做法**：只线性化 $f$，保留 $g$：

$$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}}\left\{ \langle \mathbf{f}'(\mathbf{x}_k),\mathbf{x}\rangle + g(\mathbf{x}) + \frac{1}{t_k}B_\omega(\mathbf{x},\mathbf{x}_k) \right\}, \tag{9.31}$$

即 $\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_k),\mathbf{x}\rangle + t_k g(\mathbf{x}) + \omega(\mathbf{x}) \right\}$。

## The Mirror-C Method

**Initialization:** pick $\mathbf{x}_0\in\mathrm{dom}(g)\cap\mathrm{dom}(\partial\omega)$.
**General step:** for $k=0,1,2,\dots$ (a) pick $t_k>0$ and $\mathbf{f}'(\mathbf{x}_k)\in\partial f(\mathbf{x}_k)$; (b) set

$$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k)-\nabla\omega(\mathbf{x}_k),\mathbf{x}\rangle + t_k g(\mathbf{x}) + \omega(\mathbf{x}) \right\}. \tag{9.32}$$

### Remark 9.22 & 9.23

> **Remark 9.22.** (9.32) can be rewritten as $\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}}\left\{ \langle t_k\mathbf{f}'(\mathbf{x}_k),\mathbf{x}\rangle + t_k g(\mathbf{x}) + B_\omega(\mathbf{x},\mathbf{x}_k) \right\}$.

> **Remark 9.23 (Euclidean setting—proximal subgradient method).** When $\mathbb{E}$ is Euclidean and $\omega(\mathbf{x})=\tfrac12\|\mathbf{x}\|^2$, (9.33) reduces to
> $$\mathbf{x}_{k+1} = \arg\min_{\mathbf{x}}\left\{ t_k g(\mathbf{x}) + \tfrac12\|\mathbf{x}-[\mathbf{x}_k-t_k\mathbf{f}'(\mathbf{x}_k)]\|^2 \right\} = \mathrm{prox}_{t_k g}(\mathbf{x}_k-t_k\mathbf{f}'(\mathbf{x}_k)).$$

**为什么这一行最关键**：欧氏 + 平方范数下，mirror-C **就是近端次梯度法**——先朝次梯度反方向走一步，再做 prox。书预告："discussed extensively in Chapter 10"。**钩子**：取 $g=\delta_C$（$C$ 闭凸），mirror-C 退化回普通镜面下降——镜面下降是 mirror-C 的特例。

### Theorem 9.24 · mirror-C 是 well-defined 的

> **Theorem 9.24 (mirror-C is well defined).** Suppose Assumptions 9.20 and 9.21 hold. Let $\mathbf{a}\in\mathbb{E}^*$. Then $\min_{\mathbf{x}\in\mathbb{E}}\{\langle\mathbf{a},\mathbf{x}\rangle+g(\mathbf{x})+\omega(\mathbf{x})\}$ has a unique minimizer in $\mathrm{dom}(g)\cap\mathrm{dom}(\partial\omega)$.

**证明**：调 Lemma 9.7，取 $\psi(\mathbf{x})\equiv\langle\mathbf{a},\mathbf{x}\rangle+g(\mathbf{x})$。$\mathrm{dom}(\psi)=\mathrm{dom}(g)\subseteq\mathrm{dom}(\omega)$，$\omega+\delta_{\mathrm{dom}(\psi)}=\omega+\delta_{\mathrm{dom}(g)}$ 即 Assumption 9.21 的 $\sigma$-强凸。$\blacksquare$

### Lemma 9.25 · mirror-C 基本不等式（复合版）

> **Lemma 9.25.** Suppose Assumptions 9.20 and 9.21 hold and $g$ is nonnegative. Let $\{\mathbf{x}_k\}$ be generated by mirror-C with positive nonincreasing stepsizes. Then for any $\mathbf{x}^*\in X^*$ and $k\ge 0$,
> $$\min_{n=0,\dots,k}F(\mathbf{x}_n)-F_{\mathrm{opt}} \le \frac{t_0 g(\mathbf{x}_0)+B_\omega(\mathbf{x}^*,\mathbf{x}_0)+\dfrac{1}{2\sigma}\sum_{n=0}^k t_n^2\|\mathbf{f}'(\mathbf{x}_n)\|_*^2}{\sum_{n=0}^k t_n}. \tag{9.34}$$

**证明**（类比 Lemma 9.13）：对 (9.33) 用 Thm 9.12 取 $\mathbf{b}=\mathbf{x}_n,\mathbf{a}=\mathbf{x}_{n+1},\psi(\mathbf{x})\equiv t_n\langle\mathbf{f}'(\mathbf{x}_n),\mathbf{x}\rangle+t_n g(\mathbf{x})$ 得

$$\langle \nabla\omega(\mathbf{x}_n)-\nabla\omega(\mathbf{x}_{n+1}),\mathbf{u}-\mathbf{x}_{n+1}\rangle \le t_n\langle \mathbf{f}'(\mathbf{x}_n),\mathbf{u}-\mathbf{x}_{n+1}\rangle + t_n g(\mathbf{u})-t_n g(\mathbf{x}_{n+1}). \tag{9.35}$$

三点引理取 $\mathbf{a}=\mathbf{x}_{n+1},\mathbf{b}=\mathbf{x}_n,\mathbf{c}=\mathbf{u}$，左侧 $=B_\omega(\mathbf{u},\mathbf{x}_{n+1})+B_\omega(\mathbf{x}_{n+1},\mathbf{x}_n)-B_\omega(\mathbf{u},\mathbf{x}_n)$，代入 (9.35) 移项，再用 Lemma 9.4(a) 与 Fenchel（同 Lemma 9.13 的 $(\ast),(\ast\ast)$）得

$$t_n\langle \mathbf{f}'(\mathbf{x}_n),\mathbf{x}_n-\mathbf{u}\rangle + t_n g(\mathbf{x}_{n+1})-t_n g(\mathbf{u}) \le B_\omega(\mathbf{u},\mathbf{x}_n)-B_\omega(\mathbf{u},\mathbf{x}_{n+1}) + \frac{t_n^2}{2\sigma}\|\mathbf{f}'(\mathbf{x}_n)\|_*^2.$$

取 $\mathbf{u}=\mathbf{x}^*$ 用次梯度不等式整理为

$$t_n\bigl(f(\mathbf{x}_n)+g(\mathbf{x}_{n+1})-F_{\mathrm{opt}}\bigr) \le B_\omega(\mathbf{x}^*,\mathbf{x}_n)-B_\omega(\mathbf{x}^*,\mathbf{x}_{n+1}) + \frac{t_n^2}{2\sigma}\|\mathbf{f}'(\mathbf{x}_n)\|_*^2. \tag{\dagger}$$

对 $n=0,\dots,k$ 求和，加 $t_0 g(\mathbf{x}_0)-t_k g(\mathbf{x}_{k+1})$，用 $B_\omega\ge 0$、$g\ge 0$、$t_n\le t_{n-1}$ 整理，再除以 $\sum t_n$ 得 (9.34)。$\blacksquare$

**逐字点评**：比 Lemma 9.13 多出的 $t_0 g(\mathbf{x}_0)$ 是"保留 $g$ 未线性化"的代价——只多付初值 $g$，后续 $g$ 影响被步长结构吃掉。这正是 composite 想要的：效率估计只依赖 $f$ 的 $L_f$。

### Theorem 9.26 · mirror-C 固定迭代 O(1/√N)

> **Theorem 9.26 ($O(1/\sqrt{N})$ rate, mirror-C, fixed iterations).** Suppose Assumptions 9.20 and 9.21 hold and $g$ nonnegative. $B_\omega(\mathbf{x},\mathbf{x}_0)$ bounded over $\mathrm{dom}(g)$, $\Theta(\mathbf{x}_0)\ge\max_{\mathrm{dom}(g)}B(\mathbf{x},\mathbf{x}_0)$, $g(\mathbf{x}_0)=0$. Let $N$ be a positive integer, constant stepsize
> $$t_k=\frac{\sqrt{2\Theta(\mathbf{x}_0)\sigma}}{L_f\sqrt{N}}. \tag{9.36}$$
> Then
> $$\min_{n=0,\dots,N-1}F(\mathbf{x}_n)-F_{\mathrm{opt}} \le \frac{\sqrt{2\Theta(\mathbf{x}_0)}\,L_f}{\sqrt{\sigma}\,\sqrt{N}}.$$

**证明**：Lemma 9.25 令 $g(\mathbf{x}_0)=0$、$\|\mathbf{f}'\|_*\le L_f$、$B_\omega(\mathbf{x}^*,\mathbf{x}_0)\le\Theta$，常量步长 $t$ 共 $N$ 项得 $\min_{n=0,\dots,N-1}F(\mathbf{x}_n)-F_{\mathrm{opt}} \le (\Theta+\frac{L_f^2}{2\sigma}N t^2)/(N t)$。代入 (9.36) 即得。$\blacksquare$

**逐字点评**：分母 $\sqrt{N}$ 而非 $\sqrt{N+1}$——求和范围 $n=0,\dots,N-1$（共 $N$ 项），与 Thm 9.16 的 $N+1$ 差一个下标偏移，纯属约定。

### Theorem 9.27 · mirror-C 动态步长 O(log k/√k)

> **Theorem 9.27 ($O(\log k/\sqrt{k})$ rate, mirror-C, dynamic stepsizes).** Suppose Assumptions 9.20 and 9.21 hold and $g$ nonnegative. Use stepsizes
> $$t_k=\frac{\sqrt{2\sigma}}{L_f\sqrt{k+1}}.$$
> Then for all $k\ge 1$,
> $$\min_{n=0,\dots,k}F(\mathbf{x}_n)-F_{\mathrm{opt}} \le \frac{L_f}{\sqrt{2\sigma}}\,\frac{B_\omega(\mathbf{x}^*,\mathbf{x}_0)+\dfrac{\sqrt{2\sigma}}{L_f}g(\mathbf{x}_0)+1+\log(k+1)}{\sqrt{k+1}}.$$

**证明**：Lemma 9.25 注意 $t_0=\sqrt{2\sigma}/L_f$：

$$\min_{n=0,\dots,k}F(\mathbf{x}_n)-F_{\mathrm{opt}} \le \frac{B_\omega(\mathbf{x}^*,\mathbf{x}_0)+\dfrac{\sqrt{2\sigma}}{L_f}g(\mathbf{x}_0)+\dfrac{1}{2\sigma}\sum_{n=0}^k t_n^2\|\mathbf{f}'(\mathbf{x}_n)\|_*^2}{\sum_{n=0}^k t_n}. \tag{9.38}$$

对 $t_n=\sqrt{2\sigma}/(L_f\sqrt{n+1})$：$t_n^2\|\mathbf{f}'\|_*^2\le 2\sigma/(n+1)$ 且 $\sum t_n\ge(\sqrt{2\sigma}/L_f)\sqrt{k+1}$。于是

$$\frac{\sum t_n^2\|\mathbf{f}'\|_*^2}{\sum t_n} \le \frac{L_f}{\sqrt{2\sigma}}\,\frac{\sum\frac{1}{n+1}}{\sum\frac{1}{\sqrt{n+1}}} \le \frac{L_f}{\sqrt{2\sigma}}\,\frac{1+\log(k+1)}{\sqrt{k+1}},$$

代回 (9.38)，分母 $\sqrt{k+1}$ 提到括号外即证。$\blacksquare$

**结论**：mirror-C 动态步长 $O(\log k/\sqrt{k})$，比固定步长多 $\log$ 因子——与镜面下降/投影次梯度同构。$g(\mathbf{x}_0)$ 项"一次性"付费后被 $\sqrt{k}$ 压下去。

### Example 9.28 · 倒数正则（投影法失效，近端法可行）

> **Example 9.28.** $\mathbb{R}^n$ Euclidean $\ell_2$, $f$ convex Lipschitz over $\mathbb{R}^n$, consider
> $$\min_{\mathbf{x}\in\mathbb{R}^n_{++}}\left\{ F(\mathbf{x})\equiv f(\mathbf{x})+\sum_{i=1}^n\frac{1}{x_i} \right\}, \quad \omega(\mathbf{x})=\tfrac12\|\mathbf{x}\|_2^2.$$

**逐字点评**：投影法使不上劲——可行集若取开集 $\mathbb{R}^n_{++}$，投影回去一般不在 $C$；且 $F$ 显然不 Lipschitz，投影次梯度收敛无从谈起。但**近端次梯度法**（欧氏 mirror-C，取 $g(\mathbf{x})=\sum 1/x_i+\delta_{\mathbb{R}^n_{++}}$）完全合法：Assumptions 9.20/9.21 满足，$g\ge 0$，更新即 $\mathbf{x}_{k+1}=\mathrm{prox}_{t_k g}(\mathbf{x}_k-t_k\mathbf{f}'(\mathbf{x}_k))$，$\mathrm{prox}_{t_k g}$ 归结为 $n$ 个三次标量方程。这就是 composite 模型存在的价值——难处理的不光滑正则项留给 prox，只要求 $f$ Lipschitz。

### Example 9.29 · 投影次梯度 vs 近端次梯度（数值）

> **Example 9.29.** $\mathbb{R}^n$ Euclidean $\ell_2$, consider
> $$\min_{\mathbf{x}\in\mathbb{R}^n}\{F(\mathbf{x})\equiv \|A\mathbf{x}-\mathbf{b}\|_1+\lambda\|\mathbf{x}\|_1\}, \tag{9.39}$$
> $A\in\mathbb{R}^{m\times n},\mathbf{b}\in\mathbb{R}^m,\lambda>0$.

- **投影次梯度**直接套 (9.39)，$C=\mathbb{R}^n$：$\mathbf{x}_{k+1}=\mathbf{x}_k-t_k(A^T\mathrm{sgn}(A\mathbf{x}_k-\mathbf{b})+\lambda\,\mathrm{sgn}(\mathbf{x}))$，$t_k=1/(\|F'(\mathbf{x}_k)\|_2\sqrt{k+1})$。
- **近端次梯度**（取 $f=\|A\mathbf{x}-\mathbf{b}\|_1,g=\lambda\|\mathbf{x}\|_1$）：$\mathbf{x}_{k+1}=\mathrm{prox}_{s_k g}(\mathbf{x}_k-s_k A^T\mathrm{sgn}(A\mathbf{x}_k-\mathbf{b}))$。因 $g=\lambda\|\mathbf{x}\|_1$，prox 是软阈值算子（Example 6.8：$\mathrm{prox}_{s_k g}=T_{\lambda s_k}$）：

$$\mathbf{x}_{k+1}=T_{\lambda s_k}(\mathbf{x}_k-s_k A^T\mathrm{sgn}(A\mathbf{x}_k-\mathbf{b})), \quad s_k=1/(\|\mathbf{f}'(\mathbf{x}_k)\|_2\sqrt{k+1}).$$

**结论**：近端次梯度的效率估计只依赖 $L_f$（$f$ 的 Lipschitz），投影次梯度依赖更大的 $L_F$（$F=f+g$ 整体）。书用 $m=10,n=15$ 标准正态生成（*See the original image for Figure 9.2, the log-scale plot of $F(\mathbf{x}_k)-F_{\mathrm{opt}}$ over first 1000 iterations*），**近端次梯度好几个数量级**。印证 composite 模型动机：光滑/不光滑分开处理，效率占大便宜。

---

## 小结 · 一张表

| 对象 | 核心更新 | 距离/邻近项 | 固定步长 | 动态步长 |
|---|---|---|---|---|
| 投影次梯度 (Ch8) | $P_C(\mathbf{x}_k-t_k\mathbf{f}')$ | $\tfrac12\|\cdot\|^2$ | $O(1/\sqrt{N})$ | $O(\log k/\sqrt{k})$ |
| 镜面下降 (§9.1–9.2) | (9.6) / $\nabla\widetilde{\omega}^*(\widetilde{\omega}'-t_k\mathbf{f}')$ | Bregman $B_\omega$ | $O(1/\sqrt{N})$ | $O(\log k/\sqrt{k})$ |
| mirror-C (§9.3) | (9.32)，保留 $g$ | Bregman + 原样 $g$ | $O(1/\sqrt{N})$ | $O(\log k/\sqrt{k})$ |

**三条向后指针**：
- Bregman 强凸假设、二阶邻近定理靠 **Ch5（Thm 5.24 强凸刻画、Thm 5.26 共轭对应）**；
- 收敛证明的 Fenchel 不等式来自 **Ch4（Thm 4.6 + 共轭函数）**；
- 欧氏下 mirror-C 塌缩成 **Ch6 的 prox 算子**，并在 **Ch10 近端次梯度法**被系统展开——本章是 Ch10 的"非欧序章"。

**最后一句**：镜面下降的全部智慧，就藏在"用一把贴合问题几何的 Bregman 尺子，替代欧氏尺子"里。$\blacksquare$
