---
blog: true
title: "Chapter 15-ADMM"
slug: "chapter-15-admm-wa7pabv"
summary: "交替方向乘子法 ADMM：从增广拉格朗日法出发，通过对偶上升/乘子法的交替极小化，得到可分离、可实现的分布式优化算法，并给出 O(1/k) 收敛性。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

这一章是整本书的"收官实战篇"。前面我们花了 Ch3 讲次梯度、Ch4 讲共轭函数、Ch6 讲近端算子、Ch10.5 讲近端点法、Ch14 讲坐标下降——这一章把这些零件全部焊到一个极其工程友好的算法框架上：**ADMM（Alternating Direction Method of Multipliers）**。

本章的底层空间约定很干净：所有空间都是有限维欧氏空间 $\mathbb{R}^n$，带点积与 $\ell_2$ 范数。所以没有对偶范数的花活，内积直接写 $\langle \mathbf{u}, \mathbf{v}\rangle = \mathbf{u}^T\mathbf{v}$。

# 15.1 The Augmented Lagrangian Method

我们从最一般的两块可分约束问题出发。

> **Problem (15.1).** 考虑问题
> $$H_{\mathrm{opt}} = \min\bigl\{ H(\mathbf{x},\mathbf{z}) \equiv h_1(\mathbf{x}) + h_2(\mathbf{z}) : \mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z} = \mathbf{c}\bigr\},$$
> 其中 $\mathbf{A} \in \mathbb{R}^{m\times n}$，$\mathbf{B} \in \mathbb{R}^{m\times p}$，$\mathbf{c} \in \mathbb{R}^m$。暂时假设 $h_1, h_2$ 是 proper closed convex 函数。

**为什么是两块变量 + 线性等式约束**：这是 ADMM 最自然的舞台。机器学习里的"损失 + 正则"、信号处理里的"重建 + 一致性"都长这样——把"难处理的正则项"和"难处理的约束"拆进 $h_1, h_2$ 两块，再用一个等式把它们耦合起来。

## 对偶问题的构造

像 Ch3/Ch4 的套路一样，先写拉格朗日函数：

> $$L(\mathbf{x},\mathbf{z};\mathbf{y}) = h_1(\mathbf{x}) + h_2(\mathbf{z}) + \langle \mathbf{y}, \mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z} - \mathbf{c}\rangle.$$

于是**对偶函数**是

$$
\begin{aligned}
q(\mathbf{y}) &= \min_{\mathbf{x}\in\mathbb{R}^n,\mathbf{z}\in\mathbb{R}^p}\bigl\{ h_1(\mathbf{x}) + h_2(\mathbf{z}) + \langle \mathbf{y}, \mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z} - \mathbf{c}\rangle \bigr\} \\
&= -h_1^*(-\mathbf{A}^T\mathbf{y}) - h_2^*(-\mathbf{B}^T\mathbf{y}) - \langle \mathbf{c}, \mathbf{y}\rangle.
\end{aligned}
$$

**为什么能写出共轭形式**：因为对 $\mathbf{x}$ 的极小化 $\min_{\mathbf{x}}\{h_1(\mathbf{x}) + \langle \mathbf{A}^T\mathbf{y}, \mathbf{x}\rangle\} = -h_1^*(-\mathbf{A}^T\mathbf{y})$——这正是 **Ch4 的共轭函数**定义（参看 Ch4 的 Fenchel 共轭）。同理对 $\mathbf{z}$。这一步干净利落地把"对偶目标"表达成两个共轭函数的和，后面全靠它。

> **Dual problem (15.2).** 对偶问题为
> $$q_{\mathrm{opt}} = \max_{\mathbf{y}\in\mathbb{R}^m}\bigl\{-h_1^*(-\mathbf{A}^T\mathbf{y}) - h_2^*(-\mathbf{B}^T\mathbf{y}) - \langle \mathbf{c}, \mathbf{y}\rangle\bigr\},$$
> 等价地写成极小化形式（15.3）：
> $$\min_{\mathbf{y}\in\mathbb{R}^m}\bigl\{ h_1^*(-\mathbf{A}^T\mathbf{y}) + h_2^*(-\mathbf{B}^T\mathbf{y}) + \langle \mathbf{c}, \mathbf{y}\rangle\bigr\}.$$

## 从对偶近端点法反推出来一个"原问题方法"

书上的推导非常漂亮：**不直接解原问题，而是把近端点法（Ch10.5）作用在上面的对偶极小化问题 (15.3) 上**。给定 $\rho>0$，一步近端点更新是

> $$ \mathbf{y}^{k+1} = \arg\min_{\mathbf{y}\in\mathbb{R}^m}\left\{ h_1^*(-\mathbf{A}^T\mathbf{y}) + h_2^*(-\mathbf{B}^T\mathbf{y}) + \langle \mathbf{c}, \mathbf{y}\rangle + \frac{1}{2\rho}\|\mathbf{y} - \mathbf{y}^k\|^2\right\}. \tag{15.4}$$

**Fermat 最优性条件**（Ch3 的 Thm 3.63）告诉我们 (15.4) 成立当且仅当

> $$0 \in -\mathbf{A}\,\partial h_1^*(-\mathbf{A}^T\mathbf{y}^{k+1}) - \mathbf{B}\,\partial h_2^*(-\mathbf{B}^T\mathbf{y}^{k+1}) + \mathbf{c} + \frac{1}{\rho}(\mathbf{y}^{k+1} - \mathbf{y}^k). \tag{15.5}$$

然后**共轭次梯度定理（Cor 4.21）**上场：它给出 $\mathbf{y}^{k+1}$ 满足 (15.5) 当且仅当 $\mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c})$，其中

$$
\mathbf{x}^{k+1} \in \arg\min_{\mathbf{x}}\{\langle \mathbf{A}^T\mathbf{y}^{k+1}, \mathbf{x}\rangle + h_1(\mathbf{x})\},\qquad
\mathbf{z}^{k+1} \in \arg\min_{\mathbf{z}}\{\langle \mathbf{B}^T\mathbf{y}^{k+1}, \mathbf{z}\rangle + h_2(\mathbf{z})\}.
$$

把 $\mathbf{y}^{k+1}$ 的更新代回去，再利用 $h_1, h_2$ 的 proper + convex + Fermat 条件，得到等价系统

$$
\begin{aligned}
\mathbf{y}^{k+1} &= \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c}), \tag{15.6} \\
0 &\in \mathbf{A}^T(\mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c})) + \partial h_1(\mathbf{x}^{k+1}), \tag{15.7} \\
0 &\in \mathbf{B}^T(\mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c})) + \partial h_2(\mathbf{z}^{k+1}). \tag{15.8}
\end{aligned}
$$

**逐字点评**：(15.7) + (15.8) 的几何意义是——$(\mathbf{x}^{k+1},\mathbf{z}^{k+1})$ 是下面这个函数关于 $\mathbf{x},\mathbf{z}$ 的**坐标方向极小点**（coordinate-wise minimum，见 Def 14.2）：

$$
\widetilde{H}(\mathbf{x},\mathbf{z}) \equiv h_1(\mathbf{x}) + h_2(\mathbf{z}) + \frac{\rho}{2}\left\|\mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z} - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right\|^2.
$$

而由 **Lemma 14.7**，对 $\widetilde{H}$ 这种"两块变量 + $\mathbf{x},\mathbf{z}$ 在目标里可分"的结构，坐标方向极小点恰好就是全局极小点。于是我们得到原问题的"乘子法"表示——这就是**增广拉格朗日法（Augmented Lagrangian Method, ALM）**。

> **The Augmented Lagrangian Method (ALM).**
> **Initialization:** $\mathbf{y}^0 \in \mathbb{R}^m$, $\rho > 0$.
> **General step** (对 $k = 0,1,2,\dots$):
> $$(\mathbf{x}^{k+1},\mathbf{z}^{k+1}) \in \arg\min_{\mathbf{x}\in\mathbb{R}^n,\mathbf{z}\in\mathbb{R}^p}\left\{ h_1(\mathbf{x}) + h_2(\mathbf{z}) + \frac{\rho}{2}\left\|\mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z} - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right\|^2\right\}, \tag{15.9}$$
> $$\mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c}). \tag{15.10}$$

(15.9) 叫 **primal update**，(15.10) 叫 **dual update**。

**为什么叫"增广"**：看 Remark 15.1，定义

> **Remark 15.1 (augmented Lagrangian).** 与主线问题 (15.1) 关联的**增广拉格朗日函数**为
> $$L_\rho(\mathbf{x},\mathbf{z};\mathbf{y}) = h_1(\mathbf{x}) + h_2(\mathbf{z}) + \langle \mathbf{y}, \mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z} - \mathbf{c}\rangle + \frac{\rho}{2}\|\mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z} - \mathbf{c}\|^2.$$
> 显然 $L_0 = L$ 就是普通拉格朗日函数；而 $\rho>0$ 时的 $L_\rho$ 可视为"带罚项的拉格朗日"。

**逐字点评**：注意到
$$
\langle \mathbf{y}^k, \mathbf{r}\rangle + \frac{\rho}{2}\|\mathbf{r}\|^2
= \frac{\rho}{2}\left\|\mathbf{r} + \frac{1}{\rho}\mathbf{y}^k\right\|^2 - \frac{1}{2\rho}\|\mathbf{y}^k\|^2,
$$
其中 $\mathbf{r} = \mathbf{A}\mathbf{x}+\mathbf{B}\mathbf{z}-\mathbf{c}$。最后一项与 $(\mathbf{x},\mathbf{z})$ 无关，于是
$$
(\mathbf{x}^{k+1},\mathbf{z}^{k+1}) \in \arg\min_{\mathbf{x},\mathbf{z}} L_\rho(\mathbf{x},\mathbf{z};\mathbf{y}^k).
$$
这正是"增广拉格朗日法"名字的来历——每一步**同时**在极小化增广拉格朗日关于原变量、又用残差更新对偶变量。

**作者注**：ALM 其实是"对偶近端点法"披上原问题外衣。这个洞察是 Beck 在埋钩子——它告诉读者：ADMM 的收敛性最终会回到底层对偶问题的性质上（§15.3 果然如此）。

**一个值得记住的细节**：ALM 的 primal step 同时极小化 $\mathbf{x}$ 和 $\mathbf{z}$。这是它和下一节 ADMM 的根本区别，也是它"不那么实用"的根源。

# 15.2 Alternating Direction Method of Multipliers (ADMM)

ALM 漂亮，但**一般不可实现（not implementable）**。

> ALM 一般不是可实现的方法，因为原更新步 (15.9) 可能和原始问题一样难解。困难的一个来源是 $\mathbf{x}$ 与 $\mathbf{z}$ 变量之间的耦合项，其形如 $\rho \, \mathbf{x}^T\mathbf{A}^T\mathbf{B}\mathbf{z}$。

**为什么耦合项致命**：把 (15.9) 里的二次项展开，
$$
\frac{\rho}{2}\|\mathbf{A}\mathbf{x}+\mathbf{B}\mathbf{z}-\mathbf{c}\|^2
= \frac{\rho}{2}\bigl(\|\mathbf{A}\mathbf{x}\|^2 + \|\mathbf{B}\mathbf{z}\|^2 + 2\,\mathbf{x}^T\mathbf{A}^T\mathbf{B}\mathbf{z} - 2\mathbf{c}^T(\mathbf{A}\mathbf{x}+\mathbf{B}\mathbf{z}) + \|\mathbf{c}\|^2\bigr),
$$
那个 $2\rho\,\mathbf{x}^T\mathbf{A}^T\mathbf{B}\mathbf{z}$ 把 $\mathbf{x},\mathbf{z}$ 缠在一起，导致联合极小化通常没有闭式解。

ADMM 的解法是：**别联合极小化了，改成"交替极小化（alternating minimization）"——先对 $\mathbf{x}$ 极小化，固定 $\mathbf{z}$；再对 $\mathbf{z}$ 极小化，固定（新的）$\mathbf{x}$**。

> **ADMM.**
> **Initialization:** $\mathbf{x}^0\in\mathbb{R}^n$, $\mathbf{z}^0\in\mathbb{R}^p$, $\mathbf{y}^0\in\mathbb{R}^m$, $\rho>0$.
> **General step** (对 $k = 0,1,\dots$):
> (a) $\displaystyle \mathbf{x}^{k+1} \in \arg\min_{\mathbf{x}}\left\{ h_1(\mathbf{x}) + \frac{\rho}{2}\left\|\mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right\|^2\right\}$;
> (b) $\displaystyle \mathbf{z}^{k+1} \in \arg\min_{\mathbf{z}}\left\{ h_2(\mathbf{z}) + \frac{\rho}{2}\left\|\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z} - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right\|^2\right\}$;
> (c) $\displaystyle \mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c})$.

**为什么 (a) 比 (15.9) 容易**：在 (a) 里 $\mathbf{z}$ 被钉死在 $\mathbf{z}^k$，于是二次项只关于 $\mathbf{x}$ 是"二次项 + 线性项"（没有 $\mathbf{x}^T\mathbf{A}^T\mathbf{B}\mathbf{z}$ 交叉项），通常能进一步用近端算子求解。

**三种经典方法的对比**（这是全章最该记住的一张表）：

| 方法 | 原更新步 | 对偶更新 | 适用场景 |
|---|---|---|---|
| 对偶上升 (dual ascent) | 无（纯对偶） | $\mathbf{y}^{k+1}=\mathbf{y}^k+\rho(\mathbf{A}\mathbf{x}^k+\mathbf{B}\mathbf{z}^k-\mathbf{c})$ | 目标可分、约束线性，但无二次项罚 |
| 乘子法 / ALM | **联合**极小化 (15.9) | (15.10) | 强收敛但耦合，难实现 |
| **ADMM** | **交替**极小化 (a)(b) | (c) | 两块可分，工程上最实用 |

**结论**：ADMM = "乘子法的对偶更新 + 交替（而非联合）的原更新"。它牺牲了 ALM 的某些理论整洁，换来了可分离的可实现性。

## 15.2.1 Alternating Direction Proximal Method of Multipliers (AD-PMM)

书上说，其实分析的是一个**更一般**的方法 AD-PMM：在 (a)(b) 的极小化目标里各加一个二次邻近项（proximity term）。

> **AD-PMM.**
> **Initialization:** $\mathbf{x}^0$, $\mathbf{z}^0$, $\mathbf{y}^0$, $\rho>0$.
> **General step:**
> (a) $\displaystyle \mathbf{x}^{k+1} \in \arg\min_{\mathbf{x}}\left\{ h_1(\mathbf{x}) + \frac{\rho}{2}\left\|\mathbf{A}\mathbf{x} + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right\|^2 + \frac{1}{2}\|\mathbf{x}-\mathbf{x}^k\|_{\mathbf{G}}^2\right\}$;
> (b) $\displaystyle \mathbf{z}^{k+1} \in \arg\min_{\mathbf{z}}\left\{ h_2(\mathbf{z}) + \frac{\rho}{2}\left\|\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z} - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right\|^2 + \frac{1}{2}\|\mathbf{z}-\mathbf{z}^k\|_{\mathbf{Q}}^2\right\}$;
> (c) $\displaystyle \mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c})$.

其中 $\mathbf{G}\in\mathbb{S}_+^n$, $\mathbf{Q}\in\mathbb{S}_+^p$，且 $\|\mathbf{u}\|_{\mathbf{G}}^2 = \mathbf{u}^T\mathbf{G}\mathbf{u}$。

**为什么加邻近项**：因为只要巧妙选 $\mathbf{G},\mathbf{Q}$，就能把 (a)(b) 里的"二次项"线性化，从而进一步化简成**近端算子**的形式。具体选法：

$$
\mathbf{G} = \alpha\mathbf{I} - \frac{1}{\rho}\mathbf{A}^T\mathbf{A},\quad \alpha \ge \lambda_{\max}(\mathbf{A}^T\mathbf{A});\qquad
\mathbf{Q} = \beta\mathbf{I} - \frac{1}{\rho}\mathbf{B}^T\mathbf{B},\quad \beta \ge \lambda_{\max}(\mathbf{B}^T\mathbf{B}).
$$

这样 $\mathbf{G},\mathbf{Q}\succeq \mathbf{0}$ 自动成立。把 $\mathbf{G}$ 代回 (a) 的二次项，做一步配方（注意 $\|\mathbf{A}(\mathbf{x}-\mathbf{x}^k)\|^2 = \mathbf{x}^T\mathbf{A}^T\mathbf{A}\mathbf{x} - 2\mathbf{x}^T\mathbf{A}^T\mathbf{A}\mathbf{x}^k + \|\mathbf{A}\mathbf{x}^k\|^2$），交叉的 $\mathbf{A}^T\mathbf{A}$ 项恰好被抵消，得到

$$
\mathbf{x}^{k+1} = \arg\min_{\mathbf{x}}\left\{ h_1(\mathbf{x}) + \rho\langle \mathbf{A}\mathbf{x}, \mathbf{A}\mathbf{x}^k + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \tfrac{1}{\rho}\mathbf{y}^k\rangle + \frac{\alpha}{2}\|\mathbf{x}-\mathbf{x}^k\|^2\right\}. \tag{15.11}
$$

同理 (b) 变成

$$
\mathbf{z}^{k+1} = \arg\min_{\mathbf{z}}\left\{ h_2(\mathbf{z}) + \rho\langle \mathbf{B}\mathbf{z}, \mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \tfrac{1}{\rho}\mathbf{y}^k\rangle + \frac{\beta}{2}\|\mathbf{z}-\mathbf{z}^k\|^2\right\}. \tag{15.12}
$$

### 写成近端算子：AD-LPMM

关键观察：(15.11) 正好是一个近端步。因为 $\rho\langle\mathbf{A}\mathbf{x}, \mathbf{v}\rangle + \frac{\alpha}{2}\|\mathbf{x}-\mathbf{x}^k\|^2$ 配成 $\frac{1}{2\alpha}\|\mathbf{x} - (\mathbf{x}^k - \frac{1}{\alpha}\mathbf{A}^T\mathbf{v})\|^2 + \text{const}$，于是

$$
\boxed{
\mathbf{x}^{k+1} = \mathrm{prox}_{\frac{1}{\alpha}h_1}\!\left( \mathbf{x}^k - \frac{1}{\alpha}\mathbf{A}^T\!\left(\mathbf{A}\mathbf{x}^k + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right)\right)
}
$$

$$
\boxed{
\mathbf{z}^{k+1} = \mathrm{prox}_{\frac{1}{\beta}h_2}\!\left( \mathbf{z}^k - \frac{1}{\beta}\mathbf{B}^T\!\left(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right)\right)
}
$$

这就是 **AD-LPMM（Alternating Direction Linearized Proximal Method of Multipliers）**：

> **AD-LPMM.**
> **Initialization:** $\mathbf{x}^0$, $\mathbf{z}^0$, $\mathbf{y}^0$, $\rho>0$, $\alpha \ge \lambda_{\max}(\mathbf{A}^T\mathbf{A})$, $\beta \ge \lambda_{\max}(\mathbf{B}^T\mathbf{B})$.
> **General step:**
> (a) $\displaystyle \mathbf{x}^{k+1} = \mathrm{prox}_{\frac{1}{\alpha}h_1}\!\left( \mathbf{x}^k - \frac{1}{\alpha}\mathbf{A}^T\!\left(\mathbf{A}\mathbf{x}^k + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right)\right)$;
> (b) $\displaystyle \mathbf{z}^{k+1} = \mathrm{prox}_{\frac{1}{\beta}h_2}\!\left( \mathbf{z}^k - \frac{1}{\beta}\mathbf{B}^T\!\left(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \frac{1}{\rho}\mathbf{y}^k\right)\right)$;
> (c) $\displaystyle \mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} + \mathbf{B}\mathbf{z}^{k+1} - \mathbf{c})$.

**前向指针**：$\mathrm{prox}$ 的计算正是 **Ch6 近端算子**的舞台（软阈值 $T_\lambda$ 来自 Ex 6.8，最小二乘近端来自 §6.2.3）。§15.4 全部是"把不同 $h_1,h_2$ 的近端算子代进去"的实战。

**为什么 AD-LPMM 最美**：每步只需要矩阵/向量乘法 + 一次近端算子求值，**完全不涉及矩阵求逆**。这正是大规模分布式优化想要的形态。

# 15.3 Convergence Analysis of AD-PMM

这一节给出 AD-PMM 的 **$O(1/k)$ 收敛速率**。注意 ADMM 和 AD-LPMM 都是 AD-PMM 的特例（取 $\mathbf{G}=\mathbf{Q}=\mathbf{0}$ 退化为 ADMM；取上面那种特殊 $\mathbf{G},\mathbf{Q}$ 退化为 AD-LPMM）。

## Assumption 15.2

> **Assumption 15.2.**
> (A) $h_1:\mathbb{R}^n\to(-\infty,\infty]$ 与 $h_2:\mathbb{R}^p\to(-\infty,\infty]$ 是 proper closed convex 函数；
> (B) $\mathbf{A}\in\mathbb{R}^{m\times n}$, $\mathbf{B}\in\mathbb{R}^{m\times p}$, $\mathbf{c}\in\mathbb{R}^m$, $\rho>0$；
> (C) $\mathbf{G}\in\mathbb{S}_+^n$, $\mathbf{Q}\in\mathbb{S}_+^p$；
> (D) 对任意 $\mathbf{a}\in\mathbb{R}^n,\mathbf{b}\in\mathbb{R}^p$，问题
> $\min_{\mathbf{x}}\{h_1(\mathbf{x}) + \frac{\rho}{2}\|\mathbf{x}\|^2 + \frac{1}{2}\|\mathbf{x}-\mathbf{a}\|_{\mathbf{G}}^2 + \langle\mathbf{u},\mathbf{x}\rangle\}$
> 与 $\min_{\mathbf{z}}\{h_2(\mathbf{z}) + \frac{\rho}{2}\|\mathbf{z}\|^2 + \frac{1}{2}\|\mathbf{z}-\mathbf{b}\|_{\mathbf{Q}}^2 + \langle\mathbf{v},\mathbf{z}\rangle\}$ 的最优集非空；
> (E) 存在 $\bar{\mathbf{x}}\in\mathrm{ri}(\mathrm{dom}\,h_1)$, $\bar{\mathbf{z}}\in\mathrm{ri}(\mathrm{dom}\,h_2)$ 使 $\mathbf{A}\bar{\mathbf{x}}+\mathbf{B}\bar{\mathbf{z}}=\mathbf{c}$；
> (F) 问题 (15.1) 有非空最优解集 $X^*$，对应最优值 $H_{\mathrm{opt}}$。

**逐字点评**：
- (D) 保证 AD-PMM 的每一步**良定义**（有解）；
- (E) 是 Slater 型相对内点条件，用来保证**强对偶**；
- (F) 保证我们讨论"最优值有限"是有意义的。

由凸问题的强对偶定理（附录 Thm A.1），在 Assumption 15.2 下，(15.1) 与 (15.2) 之间**强对偶成立**。

> **Theorem 15.3 (强对偶).** 设 Assumption 15.2 成立，令 $H_{\mathrm{opt}}, q_{\mathrm{opt}}$ 分别为原问题 (15.1) 与对偶问题 (15.2) 的最优值。则 $H_{\mathrm{opt}} = q_{\mathrm{opt}}$，且对偶问题 (15.2) 存在一个最优解。

## Theorem 15.4：$O(1/k)$ 速率

这是全章的理论核心。

> **Theorem 15.4 ($O(1/k)$ rate of convergence of AD-PMM).** 设 Assumption 15.2 成立。令 $\{(\mathbf{x}^k,\mathbf{z}^k)\}_{k\ge 0}$ 为 AD-PMM 解 (15.1) 生成的序列。设 $(\mathbf{x}^*,\mathbf{z}^*)$ 为 (15.1) 的最优解，$\mathbf{y}^*$ 为对偶问题 (15.2) 的最优解。设 $\gamma>0$ 满足 $\gamma \ge 2\rho\|\mathbf{y}^*\|$。则对所有 $n\ge 0$，
> $$H(\mathbf{x}^{(n)},\mathbf{z}^{(n)}) - H_{\mathrm{opt}} \le \frac{\frac{1}{2}\|\mathbf{x}^0-\mathbf{x}^*\|_{\mathbf{G}}^2 + \frac{1}{2}\|\mathbf{z}^0-\mathbf{z}^*\|_{\mathbf{C}}^2 + \frac{1}{2\rho}(\gamma + \rho\|\mathbf{y}^0-\mathbf{y}^*\|)^2}{n+1}, \tag{15.13}$$
> $$\|\mathbf{A}\mathbf{x}^{(n)}+\mathbf{B}\mathbf{z}^{(n)}-\mathbf{c}\| \le \frac{\frac{1}{2}\|\mathbf{x}^0-\mathbf{x}^*\|_{\mathbf{G}}^2 + \frac{1}{2}\|\mathbf{z}^0-\mathbf{z}^*\|_{\mathbf{C}}^2 + \frac{1}{2\rho}(\gamma + \rho\|\mathbf{y}^0-\mathbf{y}^*\|)^2}{\gamma (n+1)}, \tag{15.14}$$
> 其中 $\mathbf{C} = \rho\mathbf{B}^T\mathbf{B} + \mathbf{Q}$，且
> $$\mathbf{x}^{(n)} = \frac{1}{n+1}\sum_{k=0}^{n}\mathbf{x}^{k+1},\qquad \mathbf{z}^{(n)} = \frac{1}{n+1}\sum_{k=0}^{n}\mathbf{z}^{k+1}.$$

**为什么这两条最关键**：
- (15.13) 说**目标值间隙**以 $O(1/n)$ 衰减——注意是**遍历平均** $\mathbf{x}^{(n)},\mathbf{z}^{(n)}$，不是最后一点；
- (15.14) 说**可行性残差**（约束违反程度）也以 $O(1/n)$ 衰减。ADMM 不保证每步可行，但残差趋于 0。
- $\gamma$ 只出现在 (15.14) 的分母——$\gamma$ 越大残差界越紧，但 $\gamma\ge 2\rho\|\mathbf{y}^*\|$ 把界和"最优对偶变量大小"绑死了。

### 证明思路（用自己的话走一遍）

书上的证明组合了 He–Yuan 与 Gao–Zhang 的技术。核心不是算某一点的性质，而是建立一条**对所有可行 $(\mathbf{x},\mathbf{z})$ 和任意 $\mathbf{y}$ 都成立的"通用不等式"**，再求和、取平均、最大化。

**第一步：从 Fermat 条件写出两个基础不等式。** 由 AD-PMM 的 (a)(b) 步 + Fermat（Ch3 Thm 3.63），对 $\widetilde{\mathbf{x}}^k=\mathbf{x}^{k+1},\widetilde{\mathbf{z}}^k=\mathbf{z}^{k+1}$ 有

$$
0 \in \mathbf{A}^T\!\left(\mathbf{A}\widetilde{\mathbf{x}}^k + \mathbf{B}\mathbf{z}^k - \mathbf{c} + \tfrac{1}{\rho}\mathbf{y}^k\right) + \mathbf{G}(\widetilde{\mathbf{x}}^k - \mathbf{x}^k) + \partial h_1(\widetilde{\mathbf{x}}^k), \tag{15.15}
$$
$$
0 \in \mathbf{B}^T\!\left(\mathbf{A}\widetilde{\mathbf{x}}^k + \mathbf{B}\widetilde{\mathbf{z}}^k - \mathbf{c} + \tfrac{1}{\rho}\mathbf{y}^k\right) + \mathbf{Q}(\widetilde{\mathbf{z}}^k - \mathbf{z}^k) + \partial h_2(\widetilde{\mathbf{z}}^k). \tag{15.16}
$$

引入记号 $\widetilde{\mathbf{y}}^k = \mathbf{y}^k + \rho(\mathbf{A}\widetilde{\mathbf{x}}^k + \mathbf{B}\mathbf{z}^k - \mathbf{c})$。由次梯度不等式，对任意 $\mathbf{x}\in\mathrm{dom}\,h_1,\mathbf{z}\in\mathrm{dom}\,h_2$：

$$
h_1(\mathbf{x}) \ge h_1(\widetilde{\mathbf{x}}^k) + \langle \mathbf{A}^T\widetilde{\mathbf{y}}^k + \mathbf{G}(\widetilde{\mathbf{x}}^k-\mathbf{x}^k),\, \mathbf{x}-\widetilde{\mathbf{x}}^k\rangle,
$$
$$
h_2(\mathbf{z}) \ge h_2(\widetilde{\mathbf{z}}^k) + \langle \mathbf{B}^T\widetilde{\mathbf{y}}^k + \mathbf{C}(\widetilde{\mathbf{z}}^k-\mathbf{z}^k),\, \mathbf{z}-\widetilde{\mathbf{z}}^k\rangle,
$$
其中 $\mathbf{C}=\rho\mathbf{B}^T\mathbf{B}+\mathbf{Q}$（因为 $\mathbf{B}^T(\mathbf{A}\widetilde{\mathbf{x}}^k+\mathbf{B}\widetilde{\mathbf{z}}^k-\mathbf{c}+\tfrac{1}{\rho}\mathbf{y}^k)$ 展开含 $\rho\mathbf{B}^T\mathbf{B}\widetilde{\mathbf{z}}^k$ 项，与 $\mathbf{Q}$ 合成）。

**第二步：拼成一个大矩阵不等式。** 两式相加，并用对偶更新 $ \mathbf{y}^{k+1}-\mathbf{y}^k = \rho(\mathbf{A}\widetilde{\mathbf{x}}^k+\mathbf{B}\widetilde{\mathbf{z}}^k-\mathbf{c}) $，可得到对任意 $\mathbf{x}\in\mathrm{dom}\,h_1,\mathbf{z}\in\mathrm{dom}\,h_2,\mathbf{y}\in\mathbb{R}^m$：

$$
H(\mathbf{x},\mathbf{z}) - H(\widetilde{\mathbf{x}}^k,\widetilde{\mathbf{z}}^k) + \left\langle
\begin{pmatrix}\mathbf{x}-\widetilde{\mathbf{x}}^k\\ \mathbf{z}-\widetilde{\mathbf{z}}^k\\ \mathbf{y}-\widetilde{\mathbf{y}}^k\end{pmatrix},
\begin{pmatrix}
\mathbf{G}(\mathbf{x}^k-\widetilde{\mathbf{x}}^k)\\
\mathbf{C}(\mathbf{z}^k-\widetilde{\mathbf{z}}^k)\\
\frac{1}{\rho}(\mathbf{y}^k-\mathbf{y}^{k+1})
\end{pmatrix}
\right\rangle \ge 0. \tag{15.17}
$$

**第三步：三点恒等式（telescoping 的关键）。** 对任意 PSD 矩阵 $\mathbf{P}$，有标准三点恒等式

$$
\langle \mathbf{x}-\widetilde{\mathbf{x}}^k, \mathbf{P}(\mathbf{x}^k-\widetilde{\mathbf{x}}^k)\rangle
= \frac{1}{2}\Bigl(\|\mathbf{x}-\widetilde{\mathbf{x}}^k\|_{\mathbf{P}}^2 + \|\mathbf{x}^k-\widetilde{\mathbf{x}}^k\|_{\mathbf{P}}^2 - \|\mathbf{x}-\mathbf{x}^k\|_{\mathbf{P}}^2\Bigr)
\ge \frac{1}{2}\Bigl(\|\mathbf{x}-\widetilde{\mathbf{x}}^k\|_{\mathbf{P}}^2 - \|\mathbf{x}-\mathbf{x}^k\|_{\mathbf{P}}^2\Bigr). \tag{15.18}
$$

对 $\mathbf{z}$ 同理（用 $\mathbf{C}$），对 $\mathbf{y}$ 那一项用恒等式 $2\langle\mathbf{y}-\widetilde{\mathbf{y}}^k,\mathbf{y}^k-\mathbf{y}^{k+1}\rangle = \|\mathbf{y}-\mathbf{y}^{k+1}\|^2-\|\mathbf{y}-\mathbf{y}^k\|^2+\|\mathbf{y}^k-\mathbf{y}^{k+1}\|^2-\|\widetilde{\mathbf{y}}^k-\mathbf{y}^{k+1}\|^2$，最终合并出只含 $\frac{1}{2}\|\mathbf{w}^0-\mathbf{w}^*\|_{\mathbf{H}}^2 - \frac{1}{2}\|\mathbf{w}^{k+1}-\mathbf{w}^*\|_{\mathbf{H}}^2$ 的**可 telescoping 项**（其中 $\mathbf{H}=\mathrm{diag}(\mathbf{G},\mathbf{C},\frac{1}{\rho}\mathbf{I})$）。

**第四步：定义大矩阵 $\mathbf{H},\mathbf{F}$ 并求和。** 书上把 (15.17) 整理成

$$
H(\mathbf{x},\mathbf{z}) - H(\widetilde{\mathbf{x}}^k,\widetilde{\mathbf{z}}^k) + \langle \mathbf{w}-\widetilde{\mathbf{w}}^k,\, \mathbf{F}\widetilde{\mathbf{w}}^k + \widetilde{\mathbf{c}}\rangle \le \frac{1}{2}\|\mathbf{w}^k-\mathbf{w}^*\|_{\mathbf{H}}^2 - \frac{1}{2}\|\mathbf{w}^{k+1}-\mathbf{w}^*\|_{\mathbf{H}}^2, \tag{15.21}
$$

其中 $\mathbf{w}=(\mathbf{x},\mathbf{z},\mathbf{y})^T$，$\mathbf{F}$ 是一个**反对称**矩阵

$$
\mathbf{F} =
\begin{pmatrix}
\mathbf{0} & \mathbf{0} & \mathbf{A}^T\\
\mathbf{0} & \mathbf{0} & \mathbf{B}^T\\
-\mathbf{A} & -\mathbf{B} & \mathbf{0}
\end{pmatrix},\qquad \widetilde{\mathbf{c}} = \begin{pmatrix}\mathbf{0}\\\mathbf{0}\\\mathbf{c}\end{pmatrix}.
$$

**为什么反对称矩阵是神来之笔**：因为 $\mathbf{F}^T=-\mathbf{F}$，所以 $\langle\mathbf{w}-\widetilde{\mathbf{w}}^k, \mathbf{F}(\mathbf{w}-\widetilde{\mathbf{w}}^k)\rangle=0$，于是

$$
\langle \mathbf{w}-\widetilde{\mathbf{w}}^k, \mathbf{F}\widetilde{\mathbf{w}}^k+\widetilde{\mathbf{c}}\rangle
= \langle \mathbf{w}-\widetilde{\mathbf{w}}^k, \mathbf{F}\mathbf{w}+\widetilde{\mathbf{c}}\rangle.
$$

这就把"依赖于 $k$ 的 $\widetilde{\mathbf{w}}^k$"消掉了，使得求和时交叉项能塌缩成"仅含遍历平均 $\mathbf{w}^{(n)}$"的形式。

**第五步：对 $k=0,\dots,n$ 求和 + 凸性。** 把所有不等式加起来，左侧变成

$$
(n+1)H(\mathbf{x},\mathbf{z}) - \sum_{k=0}^{n}H(\widetilde{\mathbf{x}}^k,\widetilde{\mathbf{z}}^k) + \Bigl\langle (n+1)\mathbf{w} - \sum_{k=0}^{n}\widetilde{\mathbf{w}}^k,\, \mathbf{F}\mathbf{w}+\widetilde{\mathbf{c}}\Bigr\rangle \le \frac{1}{2}\|\mathbf{w}^0-\mathbf{w}^*\|_{\mathbf{H}}^2.
$$

记 $\mathbf{w}^{(n)}=\frac{1}{n+1}\sum\widetilde{\mathbf{w}}^k$（其 $\mathbf{x},\mathbf{z}$ 分量正是 $\mathbf{x}^{(n)},\mathbf{z}^{(n)}$）。由 $H$ 的凸性（Jensen），$\frac{1}{n+1}\sum H(\widetilde{\mathbf{x}}^k,\widetilde{\mathbf{z}}^k)\ge H(\mathbf{x}^{(n)},\mathbf{z}^{(n)})$。再利用 $\mathbf{F}$ 反对称把 $\langle\mathbf{w}^{(n)},\mathbf{F}\mathbf{w}^{(n)}\rangle$ 消掉，得到对所有可行 $(\mathbf{x},\mathbf{z})$、任意 $\mathbf{y}$：

$$
H(\mathbf{x}^{(n)},\mathbf{z}^{(n)}) - H(\mathbf{x},\mathbf{z}) + \langle \mathbf{x}^{(n)}-\mathbf{x}, \mathbf{A}^T\mathbf{y}^{(n)}\rangle + \langle \mathbf{z}^{(n)}-\mathbf{z}, \mathbf{B}^T\mathbf{y}^{(n)}\rangle + \langle \mathbf{y}-\mathbf{y}^{(n)}, \mathbf{A}\mathbf{x}^{(n)}+\mathbf{B}\mathbf{z}^{(n)}-\mathbf{c}\rangle \le \frac{\|\mathbf{w}^0-\mathbf{w}^*\|_{\mathbf{H}}^2}{2(n+1)}. \tag{15.22}
$$

**第六步：代入最优解并"最大化"消掉对偶项。** 取 $(\mathbf{x}^*,\mathbf{z}^*)$ 为原问题最优解（故 $\mathbf{A}\mathbf{x}^*+\mathbf{B}\mathbf{z}^*=\mathbf{c}$，$H(\mathbf{x}^*,\mathbf{z}^*)=H_{\mathrm{opt}}$），再对右侧那个含 $\mathbf{y}$ 的线性项在 $\mathbf{y}\in\{\mathbf{0}\}\cup[0,\gamma]$ 上取最大。注意不等式对所有 $\mathbf{y}$ 成立，取最大后：
- 目标间隙那一项保留为 $H(\mathbf{x}^{(n)},\mathbf{z}^{(n)})-H_{\mathrm{opt}}$；
- $\langle \mathbf{y}, \mathbf{A}\mathbf{x}^{(n)}+\mathbf{B}\mathbf{z}^{(n)}-\mathbf{c}\rangle$ 在 $\mathbf{y}$ 方向上取最大给出 $\gamma\|\mathbf{A}\mathbf{x}^{(n)}+\mathbf{B}\mathbf{z}^{(n)}-\mathbf{c}\|$；
- 其余含 $\mathbf{y}^{(n)},\mathbf{x}^*,\mathbf{z}^*$ 的项由强对偶（Thm 15.3，且 $\gamma\ge 2\rho\|\mathbf{y}^*\|$）恰好消去。

于是直接得到 (15.13) 与 (15.14)。$\blacksquare$

**一个值得记住的细节**：整章最难的一步是"构造反对称矩阵 $\mathbf{F}$ 把耦合项吸收掉"。这是 ADMM 收敛证明的标准套路（源自Gabay–Mercier / 后来的 Chen–Teboulle、He–Yuan 工作）。看到 $\mathbf{F}^T=-\mathbf{F}$ 就想到"求和中途抵消"，是读这类证明的肌肉记忆。

# 15.4 Minimizing $f_1(\mathbf{x}) + f_2(\mathbf{A}\mathbf{x})$

这一节把框架套进一个超常见的特殊结构：只有**一个变量 $\mathbf{x}$**，但通过线性算子 $\mathbf{A}$ 耦合到第二项。

> **Problem (15.23).** 考虑模型
> $$\min_{\mathbf{x}\in\mathbb{R}^n}\{ f_1(\mathbf{x}) + f_2(\mathbf{A}\mathbf{x})\},$$
> 其中 $f_1,f_2$ 是 proper closed convex 函数，$\mathbf{A}\in\mathbb{R}^{m\times n}$，$\rho>0$ 给定。一个隐性假设是 $f_1,f_2$ 都是"可近端（proximable）"的，即对任意 $\lambda>0$，$\mathrm{prox}_{\lambda f_1}$、$\mathrm{prox}_{\lambda f_2}$ 都能高效计算。

**为什么这个模型是"万金油"**：稀疏回归、低秩、图像去噪……几乎都能写成 $f_1(\mathbf{x})+f_2(\mathbf{A}\mathbf{x})$。把 $\mathbf{A}\mathbf{x}$ 用辅助变量 $\mathbf{z}$ 替换，问题变成

$$
\min_{\mathbf{x}\in\mathbb{R}^n,\mathbf{z}\in\mathbb{R}^m}\{ f_1(\mathbf{x}) + f_2(\mathbf{z}) : \mathbf{A}\mathbf{x} - \mathbf{z} = \mathbf{0}\}. \tag{15.24}
$$

这正是 (15.1) 的特例：$h_1=f_1$，$h_2=f_2$，$\mathbf{B}=-\mathbf{I}$，$\mathbf{c}=\mathbf{0}$。

## 三个 ADMM 变体

直接套用 ADMM 得到 **Algorithm 1**：

> **Algorithm 1 [ADMM for (15.23) — version 1].**
> **Init:** $\mathbf{x}^0\in\mathbb{R}^n$, $\mathbf{z}^0,\mathbf{y}^0\in\mathbb{R}^m$, $\rho>0$.
> **Step (k≥0):**
> (a) $\displaystyle \mathbf{x}^{k+1} \in \arg\min_{\mathbf{x}}\left\{ f_1(\mathbf{x}) + \frac{\rho}{2}\left\|\mathbf{A}\mathbf{x} - \mathbf{z}^k + \frac{1}{\rho}\mathbf{y}^k\right\|^2\right\}$;
> (b) $\displaystyle \mathbf{z}^{k+1} = \mathrm{prox}_{\frac{1}{\rho}f_2}\!\left(\mathbf{A}\mathbf{x}^{k+1} + \frac{1}{\rho}\mathbf{y}^k\right)$;
> (c) $\displaystyle \mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} - \mathbf{z}^{k+1})$.

**逐字点评**：(b) 已经能写成近端算子了（因为 $\mathbf{z}$-步里目标关于 $\mathbf{z}$ 是 $f_2(\mathbf{z})+\frac{\rho}{2}\|\mathbf{z}-(\mathbf{A}\mathbf{x}^{k+1}+\frac{1}{\rho}\mathbf{y}^k)\|^2$，正是 $\mathrm{prox}$ 的定义）。但 (a) 通常**仍然难算**，因为里面有 $\frac{\rho}{2}\mathbf{x}^T\mathbf{A}^T\mathbf{A}\mathbf{x}$ 二次项。

为了得到"每步都只含近端算子、无矩阵求逆"的版本，书里给出 **Algorithm 2**（引入额外变量 $\mathbf{w}=\mathbf{x}$）和 **Algorithm 3（AD-LPMM）**：

> **Algorithm 2 [ADMM for (15.23) — version 2].**
> **Step:**
> $\displaystyle \mathbf{x}^{k+1} = (\mathbf{I}+\mathbf{A}^T\mathbf{A})^{-1}\!\left(\mathbf{A}^T\!\left(\mathbf{z}^k - \tfrac{1}{\rho}\mathbf{y}^1_k\right) + \mathbf{w}^k - \tfrac{1}{\rho}\mathbf{y}^2_k\right)$;
> $\displaystyle \mathbf{z}^{k+1} = \mathrm{prox}_{\frac{1}{\rho}f_2}\!\left(\mathbf{A}\mathbf{x}^{k+1} + \tfrac{1}{\rho}\mathbf{y}^1_k\right)$;
> $\displaystyle \mathbf{w}^{k+1} = \mathrm{prox}_{\frac{1}{\rho}f_1}\!\left(\mathbf{x}^{k+1} + \tfrac{1}{\rho}\mathbf{y}^2_k\right)$;
> $\mathbf{y}^1_{k+1}=\mathbf{y}^1_k+\rho(\mathbf{A}\mathbf{x}^{k+1}-\mathbf{z}^{k+1})$, $\mathbf{y}^2_{k+1}=\mathbf{y}^2_k+\rho(\mathbf{x}^{k+1}-\mathbf{w}^{k+1})$.

**逐字点评**：Algorithm 2 把 (a) 变成了 $(\mathbf{I}+\mathbf{A}^T\mathbf{A})^{-1}$ 的形式——闭式但**需要求逆**，大规模时仍贵。

> **Algorithm 3 [AD-LPMM for (15.23)].**
> **Init:** $\mathbf{x}^0$, $\mathbf{z}^0$, $\mathbf{y}^0$, $\rho>0$, $\alpha\ge \lambda_{\max}(\mathbf{A}^T\mathbf{A})\rho$, $\beta\ge \rho$.
> **Step:**
> $\displaystyle \mathbf{x}^{k+1} = \mathrm{prox}_{\frac{1}{\alpha}f_1}\!\left( \mathbf{x}^k - \frac{1}{\alpha}\mathbf{A}^T\!\left(\mathbf{A}\mathbf{x}^k - \mathbf{z}^k + \frac{1}{\rho}\mathbf{y}^k\right)\right)$;
> $\displaystyle \mathbf{z}^{k+1} = \mathrm{prox}_{\frac{1}{\beta}f_2}\!\left( \mathbf{z}^k + \frac{1}{\beta}\left(\mathbf{A}\mathbf{x}^{k+1} - \mathbf{z}^k + \frac{1}{\rho}\mathbf{y}^k\right)\right)$;
> $\displaystyle \mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} - \mathbf{z}^{k+1})$.

**结论**：Algorithm 3 是这一节的"终极形态"——只含矩阵/向量乘法 + 近端算子，无逆、无大系统求解。

## Example 15.5 (l1-regularized least squares)

> **Example 15.5 (l1 正则最小二乘).** 考虑问题
> $$\min_{\mathbf{x}\in\mathbb{R}^n}\left\{ \frac{1}{2}\|\mathbf{A}\mathbf{x}-\mathbf{b}\|^2_2 + \lambda\|\mathbf{x}\|_1\right\}, \tag{15.26}$$
> 其中 $\mathbf{A}\in\mathbb{R}^{m\times n}$, $\mathbf{b}\in\mathbb{R}^m$, $\lambda>0$。

它套进 (15.23)：$f_1(\mathbf{x})=\lambda\|\mathbf{x}\|_1$，$f_2(\mathbf{y})=\frac{1}{2}\|\mathbf{y}-\mathbf{b}\|_2^2$。已知（**Ch6 的 Ex 6.8**）$\mathrm{prox}_{\gamma f_1}=T_{\gamma\lambda}$（软阈值）；$\mathrm{prox}_{\gamma f_2}(\mathbf{u})=\frac{\mathbf{u}+\gamma\mathbf{b}}{\gamma+1}$（**§6.2.3**）。

**逐字点评**：Algorithm 1 的 (a) 步变成 $\arg\min_{\mathbf{x}}\{\lambda\|\mathbf{x}\|_1 + \frac{\rho}{2}\|\mathbf{A}\mathbf{x}-\mathbf{z}^k+\frac{1}{\rho}\mathbf{y}^k\|^2\}$——这本身就是另一个 l1 最小二乘问题！所以用 Algorithm 1 等于"用一个 l1-LS 序列去解 l1-LS"，**完全没用**。这正是为什么需要 Algorithm 2/3。

取 Algorithm 3 的参数 $\alpha=\lambda_{\max}(\mathbf{A}^T\mathbf{A})\rho\ (\text{记 }L=\lambda_{\max}(\mathbf{A}^T\mathbf{A}))$、$\beta=\rho$，得到

$$
\mathbf{x}^{k+1} = T_{\lambda/(L\rho)}\!\left( \mathbf{x}^k - \frac{1}{L\rho}\mathbf{A}^T\!\left(\mathbf{A}\mathbf{x}^k - \mathbf{z}^k + \frac{1}{\rho}\mathbf{y}^k\right)\right),
$$
$$
\mathbf{z}^{k+1} = \frac{\mathbf{A}\mathbf{x}^{k+1} + \mathbf{y}^k + \mathbf{b}}{\rho+1},\qquad
\mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} - \mathbf{z}^{k+1}).
$$

## Example 15.6 (robust regression)

> **Example 15.6 (鲁棒回归).** 考虑
> $$\min_{\mathbf{x}}\|\mathbf{A}\mathbf{x}-\mathbf{b}\|_1, \tag{15.27}$$
> 其中 $\mathbf{A}\in\mathbb{R}^{m\times n}$, $\mathbf{b}\in\mathbb{R}^m$。

套进 (15.23)：$f_1\equiv 0$，$f_2(\mathbf{y})=\|\mathbf{y}-\mathbf{b}\|_1$。已知 $\mathrm{prox}_{\gamma f_1}(\mathbf{u})=\mathbf{u}$，$\mathrm{prox}_{\gamma f_2}(\mathbf{u})=T_\gamma(\mathbf{u}-\mathbf{b})+\mathbf{b}$（Ex 6.8 + Thm 6.11）。Algorithm 1 化为

$$
\mathbf{x}^{k+1} = \arg\min_{\mathbf{x}}\left\|\mathbf{A}\mathbf{x} - \mathbf{z}^k + \frac{1}{\rho}\mathbf{y}^k\right\|^2,
$$
$$
\mathbf{z}^{k+1} = T_{1/\rho}\!\left(\mathbf{A}\mathbf{x}^{k+1} + \frac{1}{\rho}\mathbf{y}^k - \mathbf{b}\right) + \mathbf{b},\qquad
\mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} - \mathbf{z}^{k+1}).
$$

**一个值得记住的细节**：在 Algorithm 2 里，$\mathbf{y}^2$ 那一支会推出 $\mathbf{y}^2_{k+1}=0$（若从 $\mathbf{y}^2_0=0$ 出发则恒为 0），从而 $\mathbf{w}^k=\mathbf{x}^k$ 恒成立，算法塌缩回更简形式。这是"冗余变量"被对偶更新自动消掉的漂亮例子。

## Example 15.7 (basis pursuit)

> **Example 15.7 (基追踪).** 考虑
> $$\min \|\mathbf{x}\|_1 \quad \text{s.t.}\quad \mathbf{A}\mathbf{x}=\mathbf{b}, \tag{15.28}$$
> 其中 $\mathbf{A}\in\mathbb{R}^{m\times n}$, $\mathbf{b}\in\mathbb{R}^m$。

套进 (15.23)：$f_1(\mathbf{x})=\|\mathbf{x}\|_1$，$f_2=\delta_{\{\mathbf{b}\}}$（示性函数，见 **Ch2 的 Def 2.1**）。$\mathrm{prox}_{\gamma f_1}=T_\gamma$，$\mathrm{prox}_{\gamma f_2}=\mathrm{id}$（投影到单点 $\mathbf{b}$ 即恒等）。Algorithm 1 的 (a) 步是 $\arg\min_{\mathbf{x}}\{\|\mathbf{x}\|_1 + \frac{\rho}{2}\|\mathbf{A}\mathbf{x}-\mathbf{z}^k+\frac{1}{\rho}\mathbf{y}^k\|^2\}$，并不比原问题 (15.28) 简单。但 Algorithm 3（取 $\alpha=\lambda_{\max}(\mathbf{A}^T\mathbf{A})\rho,\beta=\rho$）塌缩成极简两步：

$$
\mathbf{x}^{k+1} = T_{1/(\rho L)}\!\left( \mathbf{x}^k - \frac{1}{\rho L}\mathbf{A}^T\!\left(\mathbf{A}\mathbf{x}^k - \mathbf{b} + \frac{1}{\rho}\mathbf{y}^k\right)\right),\qquad
\mathbf{y}^{k+1} = \mathbf{y}^k + \rho(\mathbf{A}\mathbf{x}^{k+1} - \mathbf{b}).
$$

**逐字点评**：基追踪是压缩感知的骨架。ADMM 把它变成"软阈值 + 残差对偶更新"的循环，这正是很多稀疏求解器（如 `SPGL1`、`ADMM-Lasso`）的内核。

## Example 15.8 (minimizing $\sum_{i=1}^p g_i(\mathbf{A}_i\mathbf{x})$)

> **Example 15.8.** 考虑
> $$\min_{\mathbf{x}\in\mathbb{R}^n}\sum_{i=1}^{p} g_i(\mathbf{A}_i\mathbf{x}), \tag{15.29}$$
> 其中 $g_i$ proper closed convex，$\mathbf{A}_i\in\mathbb{R}^{m_i\times n}$。

套进 (15.23)：$f_1\equiv 0$，$f_2(\mathbf{y})=\sum_i g_i(\mathbf{y}_i)$（$\mathbf{y}$ 按块拼成），$\mathbf{A}=(\mathbf{A}_1^T,\dots,\mathbf{A}_p^T)^T$。由于 $\mathrm{prox}_{\gamma f_2}(\mathbf{y})_i=\mathrm{prox}_{\gamma g_i}(\mathbf{y}_i)$（**Ch6 的 Thm 6.6** 可分性），AD-LPMM（Algorithm 3）化为

$$
\mathbf{x}^{k+1} = \mathbf{x}^k - \frac{1}{L}\sum_{i=1}^{p}\mathbf{A}_i^T\!\left(\mathbf{A}_i\mathbf{x}^k - \mathbf{z}^k_i + \frac{1}{\rho}\mathbf{y}^k_i\right),\quad
L=\lambda_{\max}\!\left(\sum_{i=1}^p\mathbf{A}_i^T\mathbf{A}_i\right)\rho,
$$
$$
\mathbf{z}^{k+1}_i = \mathrm{prox}_{\frac{1}{\rho}g_i}\!\left(\mathbf{A}_i\mathbf{x}^{k+1} + \frac{1}{\rho}\mathbf{y}^k_i\right),\quad
\mathbf{y}^{k+1}_i = \mathbf{y}^k_i + \rho(\mathbf{A}_i\mathbf{x}^{k+1} - \mathbf{z}^{k+1}_i).
$$

**前向指针**：这是"多算子单调包含"的雏形，和 Ch14 的坐标结构、Ch10 的复合梯度法一脉相承。

## 实验结果（Figure 15.1）

> **Figure 15.1.** 在 l1 正则最小二乘问题上，ISTA、FISTA、ADMM（Algorithm 2）、AD-LPMM（Algorithm 3）各跑 100 次迭代的函数值衰减曲线。

**作者注 & 我的点评**：
- ISTA 与 AD-LPMM 表现出**几乎相同**的衰减曲线（因为 AD-LPMM 每步就是一次"线性化 + 近端"，和 ISTA 同构）；
- ADMM（Algorithm 2）单步更贵（要解线性系统），曲线下降更快，但这是"不公平对比"——它每步成本远高于 ISTA/AD-LPMM；
- **最反直觉的一点**：FISTA 从约 50 次迭代起明显超过 ADMM。原因是 FISTA 有**可证明的 $O(1/k^2)$ 函数値速率**（**Ch10**），而 ADMM 只保证 $O(1/k)$。

**结论**：ADMM 的价值不在"快"，而在"能处理 ISTA/FISTA 处理不了的复杂约束与可分结构"。它是**分布式、可分、易并行**的代名词，而不是单纯比拼收敛常数。

---

## 本章速记（cheat sheet）

| 对象 | 一句话定位 |
|---|---|
| 增广拉格朗日 $L_\rho$ | 普通拉格朗日 + 二次罚项，ALM 用它做联合极小化 |
| ALM (§15.1) | 对偶近端点法披原问题外衣；primal 步**联合**极小化 (15.9) |
| ADMM (§15.2) | ALM 的 primal 步改**交替**极小化，破解 $\mathbf{x}^T\mathbf{A}^T\mathbf{B}\mathbf{z}$ 耦合 |
| AD-PMM / AD-LPMM (§15.2.1) | 加邻近项并把步写成 $\mathrm{prox}$，无矩阵求逆 |
| Thm 15.3 | 强对偶在 Assumption 15.2 下成立 |
| Thm 15.4 | 遍历平均的目标间隙与可行性残差均 $O(1/k)$；证明靠反对称矩阵 $\mathbf{F}$ 求和抵消 |
| §15.4 三个算法 | 把 $f_1(\mathbf{x})+f_2(\mathbf{A}\mathbf{x})$ 拆成可近端的两块，Algorithm 3 最实用 |
| 与 Ch6/Ch10 的关系 | $\mathrm{prox}$（Ch6）是每步心脏；FISTA 的 $O(1/k^2)$（Ch10）比 ADMM 的 $O(1/k)$ 更快但结构更受限 |

**收尾一句话**：ADMM 是"把不可分的难题，切成可并行的薄片"的典范——它牺牲了速率常数上的虚荣，换来了工程上几乎无往不利的可实现性。这也是 Beck 把整本书的零件（次梯度、共轭、近端、坐标极小、强对偶）在这里一次性点亮的原因。
