---
blog: true
title: "Chapter 12-Dual-Based Proximal Gradient Methods"
slug: "chapter-12-dual-based-proximal-gradient-methods-d9mmnlz"
summary: "基于对偶的近端梯度法：把 f(x)+g(Ax) 这类带线性映射的复合问题转成对偶，得到 F(y)+G(y) 这种「光滑+近端」结构，再用 DPG/FDPG/DBPG 求解，并给出 O(1/k)、O(1/k²) 收敛率。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

本章的 underlying spaces 全是有限维欧几里得空间（章首明言）。本章是前面装备的**大汇演**：Ch4 共轭函数（构造对偶）、Ch5 强凸—共轭对应（把强凸翻译成对偶的光滑）、Ch6 近端算子与 Moreau 分解（把对偶近端步还原成原端近端步）、Ch10 proximal gradient 与 FISTA（套到对偶）、Ch11 block proximal gradient（驱动 dual block）。

一句话：**原问题里 $g(A\mathbf{x})$ 的线性耦合在对偶空间被解开，非光滑项 $g$ 被隔离成一个好 proximal 的 $G=g^{*}(-\cdot)$，光滑项 $F=f^{*}(A^{T}\cdot)$ 的 Lipschitz 常数被 $\|A\|^{2}/\sigma$ 显式上界锁死。** 于是 Ch4–Ch11 的所有一阶方法能毫发无损地「搬运」到对偶，再借 Lemma 12.5 / 12.7 翻译回原端。这是 Beck 在埋钩子。

# 12.1 The Primal and Dual Models

整章围绕主模型：

$$
\phi_{\mathrm{opt}}=\min_{\mathbf{x}\in\mathbb{E}}\bigl\{f(\mathbf{x})+g(A(\mathbf{x}))\bigr\}.
\tag{12.1}
$$

> **Assumption 12.1.**
> (A) $f:\mathbb{E}\to(-\infty,+\infty]$ is proper closed and $\sigma$-strongly convex ($\sigma>0$).
> (B) $g:\mathbb{V}\to(-\infty,+\infty]$ is proper closed and convex.
> (C) $A:\mathbb{E}\to\mathbb{V}$ is a linear transformation.
> (D) There exists $\bar{\mathbf{x}}\in\mathrm{ri}(\mathrm{dom}(f))$ and $\bar{\mathbf{z}}\in\mathrm{ri}(\mathrm{dom}(g))$ such that $A(\bar{\mathbf{x}})=\bar{\mathbf{z}}$.

**为什么这组假设最关键**：$f$ 要 $\sigma$-强凸且 closed——强凸保证原问题有**唯一**解（记 $\mathbf{x}^*$），closed 保证共轭定理能用；$g$ 只需 proper closed convex——不要求光滑，正是近端梯度的用武之地；条件 (D) 是**约束品性（constraint qualification）**，强对偶能成立的命根子，它是相对内点 $\mathrm{ri}$ 相交，比「存在可行点」更强（对应 Ch2 示性函数与 Ch4 共轭定义域里那颗螺丝钉）。在此假设下 $f+g\circ A$ 是 proper closed $\sigma$-强凸，由 Thm 5.25(a) 有唯一最优解 $\mathbf{x}^*$。

为做对偶，把 $A(\mathbf{x})$ 提升成独立变量 $\mathbf{z}$，加等式约束：

$$
\min_{\mathbf{x},\mathbf{z}}\; f(\mathbf{x})+g(\mathbf{z})\quad\mathrm{s.t.}\quad A(\mathbf{x})-\mathbf{z}=\mathbf{0}.
\tag{12.2}
$$

配拉格朗日乘子 $\mathbf{y}\in\mathbb{V}$：

$$
\begin{aligned}
L(\mathbf{x},\mathbf{z};\mathbf{y})
&=f(\mathbf{x})+g(\mathbf{z})-\langle\mathbf{y},\,A(\mathbf{x})-\mathbf{z}\rangle\\
&=f(\mathbf{x})+g(\mathbf{z})-\langle A^{T}(\mathbf{y}),\mathbf{x}\rangle+\langle\mathbf{y},\mathbf{z}\rangle.
\end{aligned}
\tag{12.3}
$$

最后一行用了伴随变换（Ch1.13）$\langle\mathbf{y},A(\mathbf{x})\rangle=\langle A^{T}(\mathbf{y}),\mathbf{x}\rangle$——把对 $\mathbf{x}$ 的耦合变成线性项，后面求极小才能把 $f,g$ 干净分开。

对 $(\mathbf{x},\mathbf{z})$ 取极小得对偶（最大化）：

$$
q_{\mathrm{opt}}=\max_{\mathbf{y}\in\mathbb{V}}\;q(\mathbf{y})
\equiv f^{*}(A^{T}(\mathbf{y}))+g^{*}(-\mathbf{y}).
\tag{12.4}
$$

> **Theorem 12.2** (strong duality for the pair of problems (12.1) and (12.4)). Suppose that Assumption 12.1 holds, and let $f_{\mathrm{opt}},q_{\mathrm{opt}}$ be the optimal values of the primal and dual problems (12.1) and (12.4), respectively. Then $f_{\mathrm{opt}}=q_{\mathrm{opt}}$, and the dual problem (12.4) possesses an optimal solution.

强对偶来自凸问题强对偶定理（Appendix Thm A.1）；Assumption 12.1(D) 正是 Slater 型约束品性在扩展实值域函数上的替身——没有它整章塌。

套 proximal gradient 需要最小化形式：

$$
\min_{\mathbf{y}\in\mathbb{V}}\;\bigl\{F(\mathbf{y})+G(\mathbf{y})\bigr\},
\tag{12.5}
\qquad
F(\mathbf{y})\equiv f^{*}(A^{T}(\mathbf{y})),
\tag{12.6}
\qquad
G(\mathbf{y})\equiv g^{*}(-\mathbf{y}).
\tag{12.7}
$$

> **Lemma 12.3** (properties of $F$ and $G$). Suppose that Assumption 12.1 holds. Then
> (a) $F:\mathbb{V}\to\mathbb{R}$ is convex and $L_{F}$-smooth with $L_{F}=\dfrac{\|A\|^{2}}{\sigma}$;
> (b) $G:\mathbb{V}\to(-\infty,\infty]$ is proper closed and convex.

**自己推 (a)**：链式法则 $\nabla F(\mathbf{y})=A(\nabla f^{*}(A^{T}\mathbf{y}))$。$f$ $\sigma$-强凸 $\implies$ $f^{*}$ 是 $(1/\sigma)$-光滑（Thm 5.26(b)），故
$$
\|\nabla F(\mathbf{y}_{1})-\nabla F(\mathbf{y}_{2})\|
\le \|A\|\cdot\frac{1}{\sigma}\|A^{T}(\mathbf{y}_{1}-\mathbf{y}_{2})\|
=\frac{\|A\|^{2}}{\sigma}\|\mathbf{y}_{1}-\mathbf{y}_{2}\|,
$$
得 $L_{F}=\|A\|^{2}/\sigma$。凸性：$f^{*}$ 凸（Thm 4.3），$F$ 是凸函数复合线性映射，由 Thm 2.16 仍凸。**(b)**：$g$ proper closed convex $\implies$ $g^{*}$ proper closed convex（Thm 4.3+4.5），$G(\mathbf{y})=g^{*}(-\mathbf{y})$ 是闭凸函数复合线性映射，由 Thm 2.16 得 proper closed convex。$\blacksquare$

---

# 12.2 The Dual Proximal Gradient Method

问题 (12.5) 是「凸 $L$-光滑项 $F$ + proper closed convex 项 $G$」之和，正是 Ch10 proximal gradient 的舞台。套到对偶叫 **DPG**。

> **Dual Proximal Gradient — dual representation**
> - Init: $\mathbf{y}_{0}\in\mathbb{V}$, $L\ge L_{F}=\dfrac{\|A\|^{2}}{\sigma}$.
> - Step ($k\ge 0$): $\displaystyle\mathbf{y}_{k+1}=\mathrm{prox}_{\frac{1}{L}G}\!\left(\mathbf{y}_{k}-\frac{1}{L}\nabla F(\mathbf{y}_{k})\right).$
>   \tag{12.8}

直接调用 Thm 10.21 得对偶目标值 $O(1/k)$ 率：

> **Theorem 12.4.** Under Assumption 12.1, for DPG with $L\ge \|A\|^{2}/\sigma$ and any dual optimal $\mathbf{y}^{*}$,
> $$q_{\mathrm{opt}}-q(\mathbf{y}_{k})\le \frac{L\|\mathbf{y}_{0}-\mathbf{y}^{*}\|^{2}}{2k},\qquad k\ge 1.$$

把对偶步还原成原端步靠下面枢纽：

> **Lemma 12.5.** Let $F(\mathbf{y})=f^{*}(A^{T}(\mathbf{y})+\mathbf{b})$, $G(\mathbf{y})=g^{*}(-\mathbf{y})$, with $f,g,A$ as in Assumption 12.1 and $\mathbf{b}\in\mathbb{E}$. For any $\mathbf{y},\mathbf{v}\in\mathbb{V},L>0$,
> $$\mathbf{y}=\mathrm{prox}_{\frac{1}{L}G}\!\left(\mathbf{v}-\frac{1}{L}\nabla F(\mathbf{v})\right)$$
> holds iff
> $$\mathbf{y}=\mathbf{v}-\frac{1}{L}A(\bar{\mathbf{x}})+\frac{1}{L}\,\mathrm{prox}_{Lg}\bigl(A(\bar{\mathbf{x}})-\mathbf{b}-\mathbf{v}\bigr),$$
> where $\displaystyle\bar{\mathbf{x}}=\arg\max_{\mathbf{x}}\bigl\{\langle\mathbf{x},\,A^{T}(\mathbf{v})+\mathbf{b}\rangle-f(\mathbf{x})\bigr\}.$

**思路**：由共轭次梯度定理（Cor 4.21）$\nabla f^{*}(A^{T}\mathbf{v}+\mathbf{b})=\bar{\mathbf{x}}\in\arg\max_{\mathbf{x}}\{\langle\mathbf{x},A^{T}\mathbf{v}+\mathbf{b}\rangle-f(\mathbf{x})\}$；$f$ $\sigma$-强凸使 $f^{*}$ 可微，故 argmax 单点即为 $\bar{\mathbf{x}}$，于是 $\nabla F(\mathbf{v})=A(\bar{\mathbf{x}})$。代回 (12.9) 得 $\mathbf{y}=\mathrm{prox}_{(1/L)G}(\mathbf{v}-(1/L)A\bar{\mathbf{x}})$；再用 Thm 6.15（关于 $-I$ 的反射+缩放）与扩展 Moreau 分解（Thm 6.45）把 $g^{*}$ 的 proximal 翻回 $g$ 的 proximal，即得右端。$\blacksquare$

取 $\mathbf{b}=\mathbf{0}$ 实例化得 DPG 原端表示：

> **DPG — primal representation**
> - Init: $\mathbf{y}_{0}\in\mathbb{V}$, $L\ge \|A\|^{2}/\sigma$.
> - Step: (a) $\mathbf{x}_{k}=\arg\max_{\mathbf{x}}\bigl\{\langle\mathbf{x},A^{T}(\mathbf{y}_{k})\rangle-f(\mathbf{x})\bigr\}$;
>   (b) $\mathbf{y}_{k+1}=\mathbf{y}_{k}-\dfrac{1}{L}A(\mathbf{x}_{k})+\dfrac{1}{L}\,\mathrm{prox}_{Lg}\bigl(A(\mathbf{x}_{k})-\mathbf{y}_{k}\bigr)$.

**step (a) 其实是个梯度**：因 $f$ $\sigma$-强凸，$f^{*}$ 可微，$\mathbf{x}_{k}=\nabla f^{*}(A^{T}\mathbf{y}_{k})$；具体问题（如 $f=\tfrac12\|\cdot-\mathbf{d}\|^{2}$）能闭式解出。

> **Remark 12.6** (the primal sequence). The sequence $\{\mathbf{x}_{k}\}$ is "the primal sequence." Its elements are not necessarily feasible w.r.t. (12.1) (not guaranteed in $\mathrm{dom}(g)$), yet the sequence converges to $\mathbf{x}^{*}$.

又一颗钩子：原端序列一般不**可行**（可能掉到 $\mathrm{dom}(g)$ 外），却仍收敛到真最优解——典型的「对偶驱动」味道。

> **Lemma 12.7** (primal-dual relation). Under Assumption 12.1, let $\tilde{\mathbf{y}}\in\mathrm{dom}(G)$ and
> $$\tilde{\mathbf{x}}=\arg\max_{\mathbf{x}\in\mathbb{E}}\bigl\{\langle\mathbf{x},A^{T}(\tilde{\mathbf{y}})\rangle-f(\mathbf{x})\bigr\}.$$
> \tag{12.12}
> Then
> $$\sigma\|\tilde{\mathbf{x}}-\mathbf{x}^{*}\|^{2}\le 2\bigl(q_{\mathrm{opt}}-q(\tilde{\mathbf{y}})\bigr).$$
> \tag{12.13}

**自己推**：固定 $\tilde{\mathbf{y}}$ 时拉格朗日拆成 $L(\mathbf{x},\mathbf{z};\tilde{\mathbf{y}})=h(\mathbf{x})+s(\mathbf{z})$，$h(\mathbf{x})=f(\mathbf{x})-\langle A^{T}\tilde{\mathbf{y}},\mathbf{x}\rangle$ 是 $\sigma$-强凸且 $\tilde{\mathbf{x}}$ 为其最小点，由 Thm 5.25(b)：
$$
h(\mathbf{x})-h(\tilde{\mathbf{x}})\ge \frac{\sigma}{2}\|\mathbf{x}-\tilde{\mathbf{x}}\|^{2}.
\tag{12.15}
$$
$\tilde{\mathbf{y}}\in\mathrm{dom}(G)=\mathrm{dom}(g^{*})$ 使 $\min_{\mathbf{z}}s(\mathbf{z})=-g^{*}(-\tilde{\mathbf{y}})>-\infty$，故对任 $\varepsilon>0$ 可取 $\tilde{\mathbf{z}}_{\varepsilon}$ 使 $s(\tilde{\mathbf{z}}_{\varepsilon})\le\min s+\varepsilon$，于是
$$
L(\mathbf{x},\mathbf{z};\tilde{\mathbf{y}})-L(\tilde{\mathbf{x}},\tilde{\mathbf{z}}_{\varepsilon};\tilde{\mathbf{y}})\ge \frac{\sigma}{2}\|\mathbf{x}-\tilde{\mathbf{x}}\|^{2}-\varepsilon.
$$
取 $\mathbf{x}=\mathbf{x}^{*},\mathbf{z}=A\mathbf{x}^{*}$（可行），则 $L(\mathbf{x}^{*},A\mathbf{x}^{*};\tilde{\mathbf{y}})=\phi_{\mathrm{opt}}=q_{\mathrm{opt}}$（强对偶），且 $L(\tilde{\mathbf{x}},\tilde{\mathbf{z}}_{\varepsilon};\tilde{\mathbf{y}})\ge q(\tilde{\mathbf{y}})$，故 $q_{\mathrm{opt}}-q(\tilde{\mathbf{y}})\ge \frac{\sigma}{2}\|\mathbf{x}^{*}-\tilde{\mathbf{x}}\|^{2}-\varepsilon$，令 $\varepsilon\to0$ 得 (12.13)。$\blacksquare$

**不等式链**：$\sigma\|\tilde{\mathbf{x}}-\mathbf{x}^{*}\|^{2}\le 2(q_{\mathrm{opt}}-q(\tilde{\mathbf{y}}))\le 2(\text{对偶收敛率})$——对偶以某速率收敛，原端就以（带因子 $2/\sigma$ 的）同速率收敛。

> **Theorem 12.8** ($O(1/k)$ primal sequence rate of DPG). Under Assumption 12.1, for DPG with $L\ge\|A\|^{2}/\sigma$ and dual optimal $\mathbf{y}^{*}$,
> $$\sigma\|\mathbf{x}_{k}-\mathbf{x}^{*}\|^{2}\le \frac{2L\|\mathbf{y}_{0}-\mathbf{y}^{*}\|^{2}}{\sigma k},\qquad k\ge 1.$$
> \tag{12.18}

**证明**：Lemma 12.7 取 $\tilde{\mathbf{y}}=\mathbf{y}_{k}$ 则 $\tilde{\mathbf{x}}=\mathbf{x}_{k}$，得 $\sigma\|\mathbf{x}_{k}-\mathbf{x}^{*}\|^{2}\le 2(q_{\mathrm{opt}}-q(\mathbf{y}_{k}))$；接 Thm 12.4 即证。$\blacksquare$

---

# 12.3 Fast Dual Proximal Gradient

DPG 是 proximal gradient 套到对偶，FISTA（Ch10.7）套上去即 **FDPG**。

> **FDPG — dual representation**
> - Init: $L\ge\|A\|^{2}/\sigma$, $\mathbf{w}_{0}=\mathbf{y}_{0}\in\mathbb{V}$, $t_{0}=1$.
> - Step ($k\ge 0$): (a) $\mathbf{y}_{k+1}=\mathrm{prox}_{(1/L)G}(\mathbf{w}_{k}-(1/L)\nabla F(\mathbf{w}_{k}))$;
>   (b) $t_{k+1}=(1+\sqrt{1+4t_{k}^{2}})/2$;
>   (c) $\mathbf{w}_{k+1}=\mathbf{y}_{k+1}+((t_{k}-1)/t_{k+1})(\mathbf{y}_{k+1}-\mathbf{y}_{k})$.

即 Ch10 的 FISTA 搬到对偶，直接调用 Thm 10.34：

> **Theorem 12.9.** For FDPG with $L\ge\|A\|^{2}/\sigma$ and dual optimal $\mathbf{y}^{*}$,
> $$q_{\mathrm{opt}}-q(\mathbf{y}_{k})\le \frac{2L\|\mathbf{y}_{0}-\mathbf{y}^{*}\|^{2}}{(k+1)^{2}},\qquad k\ge 1.$$

用 Lemma 12.5（$\mathbf{b}=\mathbf{0}$）把 step (a) 翻回原端：

> **FDPG — primal representation**
> - Init: $L\ge\|A\|^{2}/\sigma$, $\mathbf{w}_{0}=\mathbf{y}_{0}$, $t_{0}=1$.
> - Step: (a) $\mathbf{u}_{k}=\arg\max_{\mathbf{u}}\{\langle\mathbf{u},A^{T}(\mathbf{w}_{k})\rangle-f(\mathbf{u})\}$;
>   (b) $\mathbf{y}_{k+1}=\mathbf{w}_{k}-\dfrac{1}{L}A(\mathbf{u}_{k})+\dfrac{1}{L}\,\mathrm{prox}_{Lg}(A(\mathbf{u}_{k})-\mathbf{w}_{k})$;
>   (c) $t_{k+1}=(1+\sqrt{1+4t_{k}^{2}})/2$;
>   (d) $\mathbf{w}_{k+1}=\mathbf{y}_{k+1}+((t_{k}-1)/t_{k+1})(\mathbf{y}_{k+1}-\mathbf{y}_{k})$.

**注意**：FDPG 的 step (a) 用外推点 $\mathbf{w}_{k}$，而收敛分析用的原端序列是另一个定义：
$$
\mathbf{x}_{k}=\arg\max_{\mathbf{x}}\bigl\{\langle\mathbf{x},A^{T}(\mathbf{y}_{k})\rangle-f(\mathbf{x})\bigr\}.
\tag{12.19}
$$

> **Theorem 12.10** ($O(1/k^{2})$ primal sequence rate of FDPG). Under Assumption 12.1, for FDPG with $L\ge\|A\|^{2}/\sigma$, with $\{\mathbf{x}_{k}\}$ from (12.19) and dual optimal $\mathbf{y}^{*}$,
> $$\sigma\|\mathbf{x}_{k}-\mathbf{x}^{*}\|^{2}\le \frac{4L\|\mathbf{y}_{0}-\mathbf{y}^{*}\|^{2}}{\sigma(k+1)^{2}},\qquad k\ge 1.$$

**证明**：与 Thm 12.8 同构——Lemma 12.7 取 $\tilde{\mathbf{y}}=\mathbf{y}_{k}$ 得 $\sigma\|\mathbf{x}_{k}-\mathbf{x}^{*}\|^{2}\le 2(q_{\mathrm{opt}}-q(\mathbf{y}_{k}))$，接 Thm 12.9。教材称「几乎是 Thm 12.8 证明的逐字重复」。$\blacksquare$

---

# 12.4 Examples I

四个例子共享同一套「代入 DPG/FDPG」套路，差异只在 $f,g,A$ 与对应的 $\arg\max$、$\mathrm{prox}$、$\|A\|$。

## 12.4.1 Orthogonal Projection onto a Polyhedral Set

$S=\{\mathbf{x}:A\mathbf{x}\le\mathbf{b}\}$，$A\in\mathbb{R}^{p\times n},\mathbf{b}\in\mathbb{R}^{p}$ 非空。到 $S$ 的正交投影：

$$
\min_{\mathbf{x}\in\mathbb{R}^{n}}\left\{\frac{1}{2}\|\mathbf{x}-\mathbf{d}\|^{2}:\;A\mathbf{x}\le\mathbf{b}\right\}.
\tag{12.20}
$$

套 (12.1)：$\mathbb{E}=\mathbb{R}^{n},\mathbb{V}=\mathbb{R}^{p}$，$f(\mathbf{x})=\tfrac12\|\mathbf{x}-\mathbf{d}\|^{2}$，$g(\mathbf{z})=\delta_{\mathrm{Box}[-\infty\mathbf{e},\mathbf{b}]}(\mathbf{z})$，$A(\mathbf{x})=A\mathbf{x}$。事实：$\arg\max_{\mathbf{x}}\{\langle\mathbf{v},\mathbf{x}\rangle-f(\mathbf{x})\}=\mathbf{v}+\mathbf{d}$；$\|A\|^{2}=\|A\|_{2,2}^{2}$；$\sigma=1$；$A^{T}(\mathbf{y})=A^{T}\mathbf{y}$；$\mathrm{prox}_{Lg}(\mathbf{z})=\min\{\mathbf{z},\mathbf{b}\}$（分量取小）。

**Algorithm 1 [DPG]**：Init $L\ge\|A\|_{2,2}^{2},\mathbf{y}_{0}\in\mathbb{R}^{p}$；(a) $\mathbf{x}_{k}=A^{T}\mathbf{y}_{k}+\mathbf{d}$；(b) $\mathbf{y}_{k+1}=\mathbf{y}_{k}-(1/L)A\mathbf{x}_{k}+(1/L)\min\{A\mathbf{x}_{k}-\mathbf{y}_{k},\mathbf{b}\}$。

**Algorithm 2 [FDPG]**：把 (a)(b) 的 $\mathbf{y}_{k},\mathbf{x}_{k}$ 换 $\mathbf{w}_{k},\mathbf{u}_{k}$，补 $t$-更新与外推 (c)(d)，同前。原端序列 $\mathbf{x}_{k}=A^{T}\mathbf{y}_{k}+\mathbf{d}$。

**点评**：这里对偶变量 $\mathbf{y}$ 就是 KKT 乘子；投影本有不等式约束，对偶法把它变无约束 DPG，每次只算一次矩阵乘 + 一次分量软投影。

## 12.4.2 Orthogonal Projection onto the Intersection of Closed Convex Sets

$p$ 个闭凸集 $C_{1},\dots,C_{p}$ 与点 $\mathbf{d}$，到交 $\cap C_{i}$ 的投影：

$$
\min_{\mathbf{x}\in\mathbb{E}}\left\{\frac{1}{2}\|\mathbf{x}-\mathbf{d}\|^{2}:\;\mathbf{x}\in\bigcap_{i=1}^{p}C_{i}\right\}.
\tag{12.21}
$$

套 (12.1)：$\mathbb{V}=\mathbb{E}^{p}$，$f=\tfrac12\|\cdot-\mathbf{d}\|^{2}$，$g(\mathbf{x}_{1},\dots,\mathbf{x}_{p})=\sum_{i}\delta_{C_{i}}(\mathbf{x}_{i})$，$A(\mathbf{z})=(\mathbf{z},\dots,\mathbf{z})$。事实：$\arg\max=\mathbf{v}+\mathbf{d}$；$\|A\|^{2}=p$；$\sigma=1$；$A^{T}(\mathbf{y})=\sum_{i}\mathbf{y}_{i}$；$\mathrm{prox}_{Lg}=(P_{C_{1}},\dots,P_{C_{p}})$。

**Algorithm 3 [DPG]**：Init $L\ge p,\mathbf{y}_{0}\in\mathbb{E}^{p}$；(a) $\mathbf{x}_{k}=\sum_{i}\mathbf{y}_{k,i}+\mathbf{d}$；(b) $\mathbf{y}_{k+1,i}=\mathbf{y}_{k,i}-(1/L)\mathbf{x}_{k}+(1/L)P_{C_{i}}(\mathbf{x}_{k}-\mathbf{y}_{k,i})$。

**Algorithm 4 [FDPG]**：(a)(b) 把 $\mathbf{y}_{k},\mathbf{x}_{k}$ 换 $\mathbf{w}_{k},\mathbf{u}_{k}$，补 (c)(d)。需 $\mathrm{ri}(\cap C_{i})=\cap\mathrm{ri}(C_{i})\neq\varnothing$。原端序列 $\mathbf{x}_{k}=\sum_{i}\mathbf{y}_{k,i}+\mathbf{d}$。

> **Example 12.11** (polyhedral set revisited). Algorithm 4 也能解多面体 $C=\{\mathbf{x}:A\mathbf{x}\le\mathbf{b}\}$，只需写成半空间交 $C_{i}=\{\mathbf{x}:\mathbf{a}_{i}^{T}\mathbf{x}\le b_{i}\}$。半空间投影（Lemma 6.26）$P_{C_{i}}(\mathbf{x})=\mathbf{x}-[\mathbf{a}_{i}^{T}\mathbf{x}-b_{i}]_{+}\mathbf{a}_{i}/\|\mathbf{a}_{i}\|^{2}$，给出 Algorithm 5（Algorithm 4 在多面体上的特化）。同一投影既可用 Algorithm 2（直接多面体形）也可用 Algorithm 4/5（半空间分解），本质等价。

> **Example 12.12** (DPG vs FDPG). FDPG 的 $O(1/k^{2})$ 理论优于 DPG 的 $O(1/k)$。把 $(0.5,1.9)^{T}$ 投影到十二边形（12 半空间交），DPG（Algorithm 3）与 FDPG（Algorithm 4/5）前 10 次迭代见 Figure 12.1。

**Figure 12.1.** First 10 iterations of DPG (Algorithm 3) and FDPG (Algorithm 4/5); initial dual $\mathbf{y}$ was zeros. *See the original image for the trajectory plot.*

**结论**：FDPG 10 步逼近投影点，DPG 还差得远，与 Thm 12.8/12.10 一致。

## 12.4.3 One-Dimensional Total Variation Denoising

带噪 $\mathbf{d}\in\mathbb{R}^{n}$，求既贴近又平滑的 $\mathbf{x}$：

$$
\min_{\mathbf{x}\in\mathbb{R}^{n}}\left\{\frac{1}{2}\|\mathbf{x}-\mathbf{d}\|^{2}+\lambda\|D\mathbf{x}\|_{1}\right\},
\tag{12.24}
$$

$\lambda>0$，$D\mathbf{x}=(x_{1}-x_{2},\dots,x_{n-1}-x_{n})^{T}$。套 (12.1)：$\mathbb{E}=\mathbb{R}^{n},\mathbb{V}=\mathbb{R}^{n-1}$，$f=\tfrac12\|\cdot-\mathbf{d}\|^{2}$，$g(\mathbf{y})=\lambda\|\mathbf{y}\|_{1}$，$A(\mathbf{x})=D\mathbf{x}$。事实：$\arg\max=\mathbf{v}+\mathbf{d}$；$\|A\|^{2}=\|D\|_{2,2}^{2}\le 4$（$\|D\mathbf{x}\|^{2}=\sum(x_{i}-x_{i+1})^{2}\le 2\sum(x_{i}^{2}+x_{i+1}^{2})\le 4\|\mathbf{x}\|^{2}$）；$\sigma=1$；$A^{T}(\mathbf{y})=D^{T}\mathbf{y}$；$\mathrm{prox}_{Lg}(\mathbf{y})=T_{\lambda L}(\mathbf{y})$（软阈值）。取 $L=4$：

**Algorithm 6 [DPG]**：Init $\mathbf{y}_{0}\in\mathbb{R}^{n-1}$；(a) $\mathbf{x}_{k}=D^{T}\mathbf{y}_{k}+\mathbf{d}$；(b) $\mathbf{y}_{k+1}=\mathbf{y}_{k}-(1/4)D\mathbf{x}_{k}+(1/4)T_{4\lambda}(D\mathbf{x}_{k}-\mathbf{y}_{k})$。**Algorithm 7 [FDPG]**：把 (b) 的 $\mathbf{y}_{k},\mathbf{x}_{k}$ 换 $\mathbf{w}_{k},\mathbf{u}_{k}$，补 (c)(d)。

> **Example 12.13.** $n=1000$，真实信号是分段阶跃（前 250 为 1，接着 250 为 3，再 250 为 0，末 250 为 2），观测加标准差 0.05 高斯噪声。100 次迭代 DPG/FDPG 结果见 Figure 12.2/12.3，FDPG 明显更好；100 步目标值 9.1667 (DPG) 与 8.4621 (FDPG)，最优 8.3031。

**Figure 12.2.** True (left) and noisy (right) signals. **Figure 12.3.** DPG vs FDPG results. *See the original images for the step-function reconstruction.*

## 12.4.4 Two-Dimensional Total Variation Denoising

带噪矩阵 $\mathbf{d}\in\mathbb{R}^{m\times n}$，解

$$
\min_{\mathbf{X}\in\mathbb{R}^{m\times n}}\left\{\frac{1}{2}\|\mathbf{X}-\mathbf{d}\|_{F}^{2}+\lambda\,\mathrm{TV}(\mathbf{X})\right\}.
\tag{12.25}
$$

isotropic TV $\mathrm{TV}_{I}(\mathbf{X})$ 为各 $(x_{i,j}-x_{i,j+1},x_{i,j}-x_{i+1,j})$ 的欧氏范数之和加边界项，anisotropic 版（换绝对值和）同理。套 (12.1)：$\mathbb{E}=\mathbb{R}^{m\times n}$，$\mathbb{V}=\mathbb{R}^{m\times(n-1)}\times\mathbb{R}^{(m-1)\times n}$，$f=\tfrac12\|\cdot-\mathbf{d}\|_{F}^{2}$，$A(\mathbf{X})=(\mathbf{p}_{\mathbf{X}},\mathbf{q}_{\mathbf{X}})$，$(\mathbf{p}_{\mathbf{X}})_{i,j}=x_{i,j}-x_{i,j+1}$，$(\mathbf{q}_{\mathbf{X}})_{i,j}=x_{i,j}-x_{i+1,j}$。$g$ 两种情形都是「绝对值或 $l_{2}$ 范数」可分离和，用 Thm 6.6、Example 6.8（$l_{1}$）、Example 6.19（欧氏范数）即可算。关键：$\|A\|^{2}\le 8$。anisotropic 取 $L=8$：

**Algorithm 8 [FDPG for (12.25), $g=\lambda\,\mathrm{TV}_{l_{1}}$]**：每步 (a) 由 $(\tilde{\mathbf{p}}_{k},\tilde{\mathbf{q}}_{k})$ 与 $\mathbf{d}$ 算 $(\mathbf{u}_{k})_{i,j}=\tilde{\mathbf{p}}_{k,i,j}+\tilde{\mathbf{q}}_{k,i,j}-\tilde{\mathbf{p}}_{k,i,j-1}-\tilde{\mathbf{q}}_{k,i-1,j}+d_{i,j}$（边界 $\mathbf{p}_{i,0}=\mathbf{p}_{i,n}=\mathbf{q}_{0,j}=\mathbf{q}_{m,j}=0$）；(b) 对每块用 $T_{8\lambda}$ 软阈值更新 $\mathbf{p},\mathbf{q}$；(c)(d) $t$-更新与外推。

**结论**：2D TV 去噪说明框架能处理「矩阵变量 + 非光滑全变分」，对偶法把它拆成「每次算差分 + 一个可分离近端」。

---

# 12.5 The Dual Block Proximal Gradient Method

## 12.5.1 Preliminaries

更一般的「多函数相加」问题：

$$
\min_{\mathbf{x}\in\mathbb{E}}\left\{f(\mathbf{x})+\sum_{i=1}^{p}g_{i}(\mathbf{x})\right\}.
\tag{12.27}
$$

> **Assumption 12.14.**
> (A) $f:\mathbb{E}\to(-\infty,+\infty]$ is proper closed and $\sigma$-strongly convex ($\sigma>0$).
> (B) $g_{i}:\mathbb{E}\to(-\infty,+\infty]$ is proper closed and convex, $i=1,\dots,p$.
> (C) $\mathrm{ri}(\mathrm{dom}(f))\cap\bigl(\cap_{i=1}^{p}\mathrm{ri}(\mathrm{dom}(g_{i}))\bigr)\neq\varnothing$.

这是 §12.4.2 的推广（$g_{i}=\delta_{C_{i}}$ 即回到那里）。套 (12.1)：$\mathbb{V}=\mathbb{E}^{p}$，$g(\mathbf{x}_{1},\dots,\mathbf{x}_{p})=\sum_{i}g_{i}(\mathbf{x}_{i})$，$A(\mathbf{z})=(\mathbf{z},\dots,\mathbf{z})$，故 $\|A\|^{2}=p$，$A^{T}(\mathbf{y})=\sum_{i}\mathbf{y}_{i}$，$\mathrm{prox}_{Lg}$ 可分离。取 $L=p/\sigma$ 套 FDPG 得：

**Algorithm 9 [FDPG for (12.27)]**：Init $\mathbf{w}_{0}=\mathbf{y}_{0}\in\mathbb{E}^{p},t_{0}=1$。(a) $\mathbf{u}_{k}=\arg\max_{\mathbf{u}}\{\langle\mathbf{u},\sum_{i}\mathbf{w}_{k,i}\rangle-f(\mathbf{u})\}$；(b) $\mathbf{y}_{k+1,i}=\mathbf{w}_{k,i}-(\sigma/p)\mathbf{u}_{k}+(\sigma/p)\,\mathrm{prox}_{(p/\sigma)g_{i}}(\mathbf{u}_{k}-(p/\sigma)\mathbf{w}_{k,i})$；(c)(d) $t$-更新与外推。原端序列 $\mathbf{x}_{k}=\arg\max_{\mathbf{x}}\{\langle\mathbf{x},\sum_{i}\mathbf{y}_{k,i}\rangle-f(\mathbf{x})\}$。

**作者注**：step (b) 步长 $\sigma/p$——块越多步长越小，这是 §12.5.2 要解决的。

## 12.5.2 The Dual Block Proximal Gradient Method

Algorithm 9 步长 $\sigma/p$，块数大时小得离谱。问：**能否步长与维数无关？**

(12.27) 的对偶利用 $A^{T}(\mathbf{y})=\sum_{i}\mathbf{y}_{i}$ 与 $g^{*}(\mathbf{y})=\sum_{i}g_{i}^{*}(-\mathbf{y}_{i})$（Thm 4.12）：

$$
q_{\mathrm{opt}}=\max_{\mathbf{y}\in\mathbb{E}^{p}}\left\{-f^{*}\Bigl(\sum_{i=1}^{p}\mathbf{y}_{i}\Bigr)-\sum_{i=1}^{p}g_{i}^{*}(-\mathbf{y}_{i})\right\}.
\tag{12.28}
$$

非光滑部分 $\sum_{i}g_{i}^{*}(-\mathbf{y}_{i})$ **按块可分**——正是 Ch11 block proximal gradient 的用武之地。最小化形式下每次只挑一块 $i$ 做 proximal gradient 步：
$$
\mathbf{y}_{k+1,i}=\mathrm{prox}_{\sigma G_{i}}\!\left(\mathbf{y}_{k,i}-\sigma\,\nabla F(\mathbf{y}_{k})\right),
$$
$G_{i}(\mathbf{y}_{i})=g_{i}^{*}(-\mathbf{y}_{i})$，步长取 $\sigma$（因 $f^{*}$ 是 $(1/\sigma)$-光滑，$F(\mathbf{y}_{1},\dots,\mathbf{y}_{p})=f^{*}(\sum_{i}\mathbf{y}_{i})$ 每块 Lipschitz 常数 $1/\sigma$）。

> **DBPG — dual representation**
> - Init: $\mathbf{y}_{0}=(\mathbf{y}_{0,1},\dots,\mathbf{y}_{0,p})\in\mathbb{E}^{p}$.
> - Step: pick $i_{k}\in\{1,\dots,p\}$; set
>   $$
>   \mathbf{y}_{k+1,j}=
>   \begin{cases}
>   \mathrm{prox}_{\sigma G_{i_{k}}}\!\bigl(\mathbf{y}_{k,i_{k}}-\sigma\,\nabla F(\mathbf{y}_{k})\bigr), & j=i_{k},\\
>   \mathbf{y}_{k,j}, & j\neq i_{k}.
>   \end{cases}
>$$

翻回原端需 Lemma 12.5 的「单块」版：

> **Lemma 12.15.** Under Assumption 12.14, let $i\in\{1,\dots,p\}$, $G_{i}(\mathbf{y}_{i})=g_{i}^{*}(-\mathbf{y}_{i})$, $L>0$. Then $\mathbf{y}_{i}\in\mathbb{E},\mathbf{v}\in\mathbb{E}^{p}$ satisfy
> $$\mathbf{y}_{i}=\mathrm{prox}_{\frac{1}{L}G_{i}}\!\left(\mathbf{v}_{i}-\frac{1}{L}\nabla f^{*}\Bigl(\sum_{j=1}^{p}\mathbf{v}_{j}\Bigr)\right)$$
> iff
> $$\mathbf{y}_{i}=\mathbf{v}_{i}-\frac{1}{L}\bar{\mathbf{x}}+\frac{1}{L}\,\mathrm{prox}_{Lg_{i}}\bigl(\bar{\mathbf{x}}-\mathbf{v}_{i}\bigr),$$
> where $\displaystyle\bar{\mathbf{x}}=\arg\max_{\mathbf{x}\in\mathbb{E}}\Bigl\{\bigl\langle\mathbf{x},\sum_{j=1}^{p}\mathbf{v}_{j}\bigr\rangle-f(\mathbf{x})\Bigr\}$.

**证明**：把 Lemma 12.5 取 $\mathbb{V}=\mathbb{E}$、$A=I$、$\mathbf{b}=\sum_{j\neq i}\mathbf{v}_{j}$、$g=g_{i}$、$\mathbf{y}=\mathbf{y}_{i}$、$\mathbf{v}=\mathbf{v}_{i}$ 即得。$\blacksquare$

套 $L=\sigma$：

> **DBPG — primal representation**
> - Init: $\mathbf{y}_{0}=(\mathbf{y}_{0,1},\dots,\mathbf{y}_{0,p})\in\mathbb{E}^{p}$.
> - Step: (a) pick $i_{k}\in\{1,\dots,p\}$; (b) $\bar{\mathbf{x}}_{k}=\arg\max_{\mathbf{x}}\{\langle\mathbf{x},\sum_{j}\mathbf{y}_{k,j}\rangle-f(\mathbf{x})\}$;
>   (c)
>   $$
>   \mathbf{y}_{k+1,j}=
>   \begin{cases}
>   \mathbf{y}_{k,i_{k}}-\dfrac{1}{\sigma}\bar{\mathbf{x}}_{k}+\dfrac{1}{\sigma}\,\mathrm{prox}_{\sigma g_{i_{k}}}\bigl(\bar{\mathbf{x}}_{k}-\mathbf{y}_{k,i_{k}}\bigr), & j=i_{k},\\[6pt]
>   \mathbf{y}_{k,j}, & j\neq i_{k}.
>   \end{cases}
>$$

**结论**：DBPG 是**函数分解方法**——每次只用 $g_{1},\dots,g_{p}$ 中的一个，且算 $f$ 的 step (b) 不牵扯其他 $g_{i}$。**对偶空间变量分解 $\iff$ 原空间函数分解**。索引策略：**Cyclic** $i_{k}=(k\bmod p)+1$；**Randomized** 均匀随机取。

## 12.5.3 Convergence Analysis

DBPG 收敛率 = Ch11 block PG 的率 + Lemma 12.7。

**Cyclic.** 记对偶最优解集 $\mathcal{Y}^{*}$，先补假设控有界性：

> **Assumption 12.16.** For any $\varepsilon>0$, $\exists R_{\varepsilon}>0$ s.t.
> $$\max_{\mathbf{y},\mathbf{y}^{*}\in\mathcal{Y}^{*}}\bigl\{\|\mathbf{y}-\mathbf{y}^{*}\|:\;q(\mathbf{y})\ge q_{\mathrm{opt}}-\varepsilon,\;\mathbf{y}^{*}\in\mathcal{Y}^{*}\bigr\}\le R_{\varepsilon},$$
> where $q(\mathbf{y})=-f^{*}(\sum_{i}\mathbf{y}_{i})-\sum_{i}g_{i}^{*}(-\mathbf{y}_{i})$.

> **Theorem 12.17** ($O(1/k)$ cyclic DBPG). Under Assumptions 12.14 and 12.16, for cyclic DBPG on (12.27) and $k\ge 2$,
> - (a) $q_{\mathrm{opt}}-q(\mathbf{y}_{pk})\le \max\!\left\{(1/2)^{(k-1)/2}(q_{\mathrm{opt}}-q(\mathbf{y}_{0})),\;\dfrac{8p(p+1)^{2}R^{2}}{\sigma(k-1)}\right\}$;
> - (b) $\sigma\|\mathbf{x}_{pk}-\mathbf{x}^{*}\|^{2}\le 2\max\!\left\{(1/2)^{(k-1)/2}(q_{\mathrm{opt}}-q(\mathbf{y}_{0})),\;\dfrac{8p(p+1)^{2}R^{2}}{\sigma(k-1)}\right\}$,

$R=R_{q(\mathbf{y}_{0})}$。**证明**：(a) 由 Thm 11.18 用于对偶 block 问题（(11.24) 常数 $L_{\max}=L_{\min}=1/\sigma$、$L_{f}=p/\sigma$）；(b) 由 Lemma 12.7 的 $\sigma\|\mathbf{x}-\mathbf{x}^{*}\|^{2}\le 2(q_{\mathrm{opt}}-q(\mathbf{y}))$ 与 (a) 相乘。$\blacksquare$

**Randomized.** 随机选块时连 Assumption 12.16 都不需要：

> **Theorem 12.18** ($O(1/k)$ randomized DBPG). Under Assumption 12.14, for randomized DBPG with $\mathcal{I}_{k}=\{i_{0},\dots,i_{k}\}$,
> - (a) $q_{\mathrm{opt}}-\mathbb{E}_{\mathcal{I}_{k}}[q(\mathbf{y}_{k+1})]\le \dfrac{p}{p+k+1}\left[\frac{1}{2\sigma}\|\mathbf{y}_{0}-\mathbf{y}^{*}\|^{2}+q_{\mathrm{opt}}-q(\mathbf{y}_{0})\right]$;
> - (b) $\mathbb{E}_{\mathcal{I}_{k}}[\sigma\|\mathbf{x}_{k+1}-\mathbf{x}^{*}\|^{2}]\le \dfrac{2p}{\sigma(p+k+1)}\left[\frac{1}{2\sigma}\|\mathbf{y}_{0}-\mathbf{y}^{*}\|^{2}+q_{\mathrm{opt}}-q(\mathbf{y}_{0})\right]$.

由 Thm 11.25 + Lemma 12.7 推出。(b) 恰是 (a) 右端乘 $2/\sigma$，与 Lemma 12.7 因子严丝合缝。

## 12.5.4 Acceleration in the Two-Block Case

确定/随机 DBPG 都非加速，仅 $O(1/k)$。但 **$p=2$** 时可用小技巧得**加速**。

$p=2$ 模型 $\min_{\mathbf{x}}\{f+g_{1}+g_{2}\}$。重写成 $\min_{\mathbf{x}}\{\bar{f}+g_{2}\}$，$\bar{f}=f+g_{1}$。若 Assumption 12.14 在 $p=2$ 成立，则 $\bar{f}$ 仍 proper closed $\sigma$-强凸、$g_{2}$ proper closed convex、约束品性满足——**Assumption 12.1 对 $f=\bar{f},g=g_{2},A=I$ 成立**。定义 **ADBPG**：在 (12.1)（$f=\bar{f},g=g_{2},A=I$）上跑 FDPG，步长取 $\sigma$（$L=1/\sigma$）。

> **The ADBPG Method**
> - Init: $\mathbf{w}_{0}=\mathbf{y}_{0}\in\mathbb{E}$, $t_{0}=1$.
> - Step: (a) $\mathbf{u}_{k}=\arg\max_{\mathbf{u}}\{\langle\mathbf{u},\mathbf{w}_{k}\rangle-f(\mathbf{u})-g_{1}(\mathbf{u})\}$;
>   (b) $\mathbf{y}_{k+1}=\mathbf{w}_{k}-\sigma\,\mathbf{u}_{k}+\sigma\,\mathrm{prox}_{g_{2}/\sigma}(\mathbf{u}_{k}-\mathbf{w}_{k})$;
>   (c) $t_{k+1}=(1+\sqrt{1+4t_{k}^{2}})/2$;
>   (d) $\mathbf{w}_{k+1}=\mathbf{y}_{k+1}+((t_{k}-1)/t_{k+1})(\mathbf{y}_{k+1}-\mathbf{y}_{k})$.

> **Theorem 12.19** ($O(1/k^{2})$ ADBPG). Under Assumption 12.14 with $p=2$, for ADBPG and dual optimal $\mathbf{y}^{*}$ of $\min_{\mathbf{y}}\{(\bar{f})^{*}(\mathbf{y})+g_{2}^{*}(-\mathbf{y})\}$,
> $$\sigma\|\mathbf{x}_{k}-\mathbf{x}^{*}\|^{2}\le \frac{4\|\mathbf{y}_{0}-\mathbf{y}^{*}\|^{2}}{\sigma^{2}(k+1)^{2}},\quad \mathbf{x}_{k}=\arg\max_{\mathbf{x}}\{\langle\mathbf{x},\mathbf{y}_{k}\rangle-f(\mathbf{x})-g_{1}(\mathbf{x})\},\;k\ge 1.$$

**证明**：Thm 12.10 在 $A=I,L=1/\sigma$ 下的实例化。$\blacksquare$

> **Remark 12.20.** When $f(\mathbf{x})=\frac12\|\mathbf{x}-\mathbf{d}\|^{2}$, step (a) becomes $\mathbf{u}_{k}=\mathrm{prox}_{g_{1}}(\mathbf{d}+\mathbf{w}_{k})$.

> **Remark 12.21.** ADBPG is not a full functional decomposition (step (a) involves $f$ and $g_{1}$), but separates $g_{1}$ from $g_{2}$. It is accelerated, and its stepsize is $\sigma$, vs. $\sigma/2$ in Algorithm 9.

**作者注**：整章最漂亮的一笔——两块时把 $f+g_{1}$ 合并成一个强凸项，绕过了「步长 $\sigma/p$ 被块数拖累」的坑，拿到 $\sigma$ 大步长 + $O(1/k^{2})$。脚注指出 ADBPG 实质是 Chambolle–Pock 加速方法的一种表述。

---

# 12.6 Examples II

## Example 12.22 (1D TV denoising, ADBPG vs Algorithm 9)

比较 ADBPG 与 Algorithm 9（都取 $p=2$，都是 FDPG，但长相不同）。1D TV 问题 (12.31)：
$$
\min_{\mathbf{x}\in\mathbb{R}^{n}}\left\{\frac{1}{2}\|\mathbf{x}-\mathbf{d}\|^{2}+\lambda\sum_{i=1}^{n/2}|x_{2i-1}-x_{2i}|+\lambda\sum_{i=1}^{n/2-1}|x_{2i}-x_{2i+1}|\right\}.
$$
拆成 $f=\tfrac12\|\cdot-\mathbf{d}\|^{2}$，$g_{1}(\mathbf{x})=\lambda\sum_{i}|x_{2i-1}-x_{2i}|$，$g_{2}(\mathbf{x})=\lambda\sum_{i}|x_{2i}-x_{2i+1}|$。由 Example 6.17，$\lambda$ 倍 $h(y,z)=|y-z|$ 的近端可闭式写出；利用 $g_{1},g_{2}$ 关于变量对的可分离性可逐对写 $\mathrm{prox}_{g_{1}},\mathrm{prox}_{g_{2}}$。两法每迭代计算量几乎相同。跑 1000 次、全零对偶起步，画 $F(\mathbf{x}_{k})-f_{\mathrm{opt}}$ 随 $k$（Figure 12.4）。

**Figure 12.4.** ADBPG vs Algorithm 9 on 1D TV denoising. *See the original image; ADBPG dominates.*

**结论**：ADBPG 明显更好，主因它用更大步长 $\sigma$（Algorithm 9 用 $\sigma/2$）。

## Example 12.23 (2D total variation denoising)

isotropic 2D TV 问题 $\min_{\mathbf{X}}\{\tfrac12\|\mathbf{X}-\mathbf{d}\|_{F}^{2}+\lambda\,\mathrm{TV}_{I}(\mathbf{X})\}$，$\mathrm{TV}_{I}$ 见 (12.26)。isotropic TV 难像 1D 拆成两个可直接 proximal 的函数，但可拆成**三个**按变量三元组可分离的函数：记 $D_{k}$ 为矩阵第 $k$ 条对角线，按 $(k+1)\bmod 3$ 分三组 $K_{1},K_{2},K_{3}$，则
$$
\mathrm{TV}_{I}(\mathbf{X})=\Gamma_{1}(\mathbf{X})+\Gamma_{2}(\mathbf{X})+\Gamma_{3}(\mathbf{X}),
$$
每个 $\Gamma_{i}$ 关于三元组 $\{x_{i,j},x_{i+1,j},x_{i,j+1}\}$ 可分离（约定 $x_{i,n+1}=x_{i,n},x_{m+1,j}=x_{m,j}$）。去噪写成
$$
\min_{\mathbf{X}}\left\{\frac{1}{2}\|\mathbf{X}-\mathbf{d}\|_{F}^{2}+\lambda\Gamma_{1}(\mathbf{X})+\lambda\Gamma_{2}(\mathbf{X})+\lambda\Gamma_{3}(\mathbf{X})\right\}.
$$

**作者注**：三块分解正好落入 DBPG（块数无限制），但**不能**用 ADBPG（只适用于两块）。DBPG 每步只需算一个 $\lambda\Gamma_{i}$ 的 prox；由可分离性归结为若干个三维函数 $\lambda h$ 的近端，$h(x,y,z)=\sqrt{(x-y)^{2}+(x-z)^{2}}$，用 Lemma 6.68（矩阵 $A=\begin{pmatrix}1&-1&0\\1&0&-1\end{pmatrix}$）计算，此处不展开。

**Figure 12.5.** Decomposition of a 16×12 Mario image into three separable functions per isotropic TV. *See the original image for the r-shaped three-pixel block partition (reprinted with permission from Elsevier).*

**细节**：此例把全章线索收尾——从对偶框架到块坐标分解，再到具体 prox 用 Lemma 6.68 闭式算出。所有武器（共轭、近端、Moreau、FISTA、block PG）在此汇合。

---

## 全章小结

| 方法 | 对偶结构 | 步长 | 原端率 | 关键假设 |
|---|---|---|---|---|
| DPG (§12.2) | 全对偶 PG | $L=\|A\|^{2}/\sigma$ | $O(1/k)$ | Assumption 12.1 |
| FDPG (§12.3) | 对偶 FISTA | $L=\|A\|^{2}/\sigma$ | $O(1/k^{2})$ | Assumption 12.1 |
| DBPG (§12.5.2) | 对偶 block PG | $\sigma$（与块数无关） | $O(1/k)$ | Assumption 12.14 |
| ADBPG (§12.5.4) | 两块合并 + 对偶 FISTA | $\sigma$ | $O(1/k^{2})$ | Assumption 12.14, $p=2$ |

**最后一句话**：原问题里 $g(A\mathbf{x})$ 的「线性耦合」在对偶空间被解开，非光滑项 $g$ 被隔离成好 proximal 的 $G=g^{*}(-\cdot)$，光滑项 $F=f^{*}(A^{T}\cdot)$ 的 Lipschitz 常数被 $\|A\|^{2}/\sigma$ 显式锁死。于是前面 Ch4–Ch11 的所有一阶方法能毫发无损地「搬运」到对偶，再借 Lemma 12.5 / 12.7 翻译回原端。这就是对偶驱动近端梯度的全部魔法。
