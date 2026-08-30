---
blog: true
title: "Chapter 3-Subgradients"
slug: "chapter-3-subgradients-stgsfkvt"
summary: "次梯度的定义与初步示例：凸函数在不可导点处的次梯度，及其全局托举性质。"
date: 2026-08-30
category: "人工智能的优化方法"
featured: false
---

## 3.1 定义与初步示例 (Definitions and First Examples)
### 定义 3.1：次梯度 (Subgradient)
令 $f: \mathbb{E} \to (-\infty, \infty]$ 是一个正常函数，且 $\mathbf{x} \in \text{dom}(f)$。如果向量 $\mathbf{g} \in \mathbb{E}^*$ 满足以下不等式，则称其为 $f$ 在点 $\mathbf{x}$ 处的**次梯度**：
$$
f(\mathbf{y}) \ge f(\mathbf{x}) + \langle \mathbf{g}, \mathbf{y} - \mathbf{x} \rangle \quad \text{对于所有 } \mathbf{y} \in \mathbb{E}.
\tag{3.1}
$$

**注意，在本书研究的凸函数中，梯度和次梯度都是有“全局托举”性质的，没这个性质的那就不是凸函数了**

---
### 补充说明与约定
> **注（关于空间与范数）：** 回忆 1.11 节中的约定，本书中 $\mathbb{E}^*$ 的元素与 $\mathbb{E}$ 的元素完全相同，星号 (*) 仅表明 $\mathbb{E}^*$ 上赋予的范数是 **对偶范数** $\|\cdot\|_*$，而不是 $\mathbb{E}$ 上赋予的范数 $\|\cdot\|$。

> **几何解释：** 不等式 (3.1) 也被称为**次梯度不等式**。它实际上说明每个次梯度都对应着一个**欠估计的仿射函数**，该函数在点 $\mathbf{x}$ 处与函数曲面相切。由于当 $\mathbf{y} \notin \text{dom}(f)$ 时，次梯度不等式 (3.1) 是平凡成立的，因此它经常被限制在定义域 $\text{dom}(f)$ 内的点，并写为：
> $$

f(\mathbf{y}) \ge f(\mathbf{x}) + \langle \mathbf{g}, \mathbf{y} - \mathbf{x} \rangle \quad \text{对于所有 } \mathbf{y} \in \text{dom}(f).
$$

---
### 定义 3.2：次微分 (Subdifferential)
给定一点 $\mathbf{x} \in \text{dom}(f)$，$f$ 在 $\mathbf{x}$ 处可能存在多个次梯度。所有这些次梯度的集合被称为函数 $f$ 在 $\mathbf{x}$ 处的**次微分**，记作 $\partial f(\mathbf{x})$：
$$
\partial f(\mathbf{x}) \equiv \{ \mathbf{g} \in \mathbb{E}^* : f(\mathbf{y}) \ge f(\mathbf{x}) + \langle \mathbf{g}, \mathbf{y} - \mathbf{x} \rangle \text{ 对于所有 } \mathbf{y} \in \mathbb{E} \}.
$$

 次微分实际上是一个在不可微的状态下的一个拓展，将本来确定的梯度，在这种求不出梯度的点，变成了一个托起函数 $f$ 的“梯度集合”
---
### 定义域外的次微分
当点 $\mathbf{x} \notin \text{dom}(f)$ 时，我们定义 $\partial f(\mathbf{x}) = \emptyset$（空集）。
> 实际上，对于正常函数来说，这是次微分集合定义的直接推论，因为当 $\mathbf{x} \notin \text{dom}f$ 且 $\mathbf{y} \in \text{dom}f$ 时，次梯度不等式 (3.1) 并不成立。

---
### 示例 3.3：范数在 0 处的次微分 (Subdifferential of norms at $\mathbf{0}$)
令 $f : \mathbb{E} \to \mathbb{R}$ 由 $f(\mathbf{x}) = \|\mathbf{x}\|$ 给出，其中 $\|\cdot\|$ 是 $\mathbb{E}$ 上赋予的范数。接下来将证明，函数 $f$ 在点 $\mathbf{x} = \mathbf{0}$ 处的次微分即为**对偶范数单位球**。
为了证明公式 (3.2)：
$$
\partial f(\mathbf{0}) = B_{\|\cdot\|_*}[\mathbf{0}, 1] = \{ \mathbf{g} \in \mathbb{E}^* : \|\mathbf{g}\|_* \le 1 \}. \tag{3.2}
$$

> 我们需注意，$\mathbf{g} \in \partial f(\mathbf{0})$ 当且仅当对于所有 $\mathbf{y} \in \mathbb{E}$ 都满足 $f(\mathbf{y}) \ge f(\mathbf{0}) + \langle \mathbf{g}, \mathbf{y} - \mathbf{0} \rangle$。
> 因为 $f(\mathbf{0})=0$，所以这等价于：
> $$

\|\mathbf{y}\| \ge \langle \mathbf{g}, \mathbf{y} \rangle \quad \text{对于所有 } \mathbf{y} \in \mathbb{E}. \tag{3.3}
$$

接下来证明 (3.3) 成立的充分必要条件正是 $\|\mathbf{g}\|_* \le 1$：

*   **若 $\|\mathbf{g}\|_* \le 1$：** 根据广义柯西-施瓦茨不等式（引理 1.4），我们有：
    $$
\langle \mathbf{g}, \mathbf{y} \rangle \le \|\mathbf{g}\|_* \|\mathbf{y}\| \le \|\mathbf{y}\| \quad \text{对于任意 } \mathbf{y} \in \mathbb{E}.
$$
    这直接意味着 (3.3) 成立。

*   **若 (3.3) 成立（证明反方向）：** 对 (3.3) 式两边，在所有满足 $\|\mathbf{y}\| \le 1$ 的向量 $\mathbf{y}$ 上取最大值：
    $$
\|\mathbf{g}\|_* = \max_{\mathbf{y}: \|\mathbf{y}\| \le 1} \langle \mathbf{g}, \mathbf{y} \rangle \le \max_{\mathbf{y}: \|\mathbf{y}\| \le 1} \|\mathbf{y}\| = 1.
$$

因此，我们证明了 (3.3) 与不等式 $\|\mathbf{g}\|_* \le 1$ 等价，这就证明了结果 (3.2)。■


---
### 示例 3.4：$\ell_1$ 范数在 0 处的次微分 (Subdifferential of the $\ell_1$-norm at 0)
设 $f : \mathbb{R}^n \to \mathbb{R}$ 为 $f(\mathbf{x}) = \|\mathbf{x}\|_1$。由于 $\ell_1$ 范数的对偶范数是 $\ell_\infty$ 范数，根据示例 3.3 中的结论，可得：
$$
\partial f(\mathbf{0}) = B_{\|\cdot\|_\infty}[\mathbf{0}, 1] = [-1, 1]^n.
$$

特别地，当 $n=1$ 时，即 $f(x) = |x|$，我们有：
$$
\partial f(0) = [-1, 1].
$$
> 此时，对应斜率为 $-0.8$、$-0.3$ 和 $0.7$ 的直线（即线性下估计量，$y=gx$）都属于 $f(x)=|x|$ 的次微分 $\partial f(0)$，因为它们是对原点的全局下切线。■

**结论**：任意范数在零点处的次梯度集合，正好是该范数的**对偶范数单位球**。

---
### 补充定义：法锥 (Normal Cone)
在进入下一个示例前，我们需要定义**法锥**。给定一个集合 $S \subset \mathbb{E}$ 和点 $\mathbf{x} \in S$，定义 $S$ 在 $\mathbf{x}$ 处的法锥为：
$$
N_S(\mathbf{x}) = \{ \mathbf{y} \in \mathbb{E}^* : \langle \mathbf{y}, \mathbf{z} - \mathbf{x} \rangle \le 0 \quad \text{对于任意 } \mathbf{z} \in S \}.
$$
> 法锥不仅是锥体，还是**闭凸锥**，可以看作是半空间的交集。当 $\mathbf{x} \notin S$ 时，我们定义 $N_S(\mathbf{x}) = \emptyset$。


---
### 示例 3.5：指示函数的次微分 (Subdifferential of indicator functions)
假设 $S \subset \mathbb{E}$ 是非空集合，考虑其**指示函数** $\delta_S$（当 $\mathbf{x} \in S$ 时 $\delta_S(\mathbf{x})=0$，否则为 $+\infty$）。
对于任意 $\mathbf{x} \in S$，如果 $\mathbf{y} \in \partial \delta_S(\mathbf{x})$，根据次梯度定义，对于所有 $\mathbf{z} \in S$ 有：
$$
\delta_S(\mathbf{z}) \ge \delta_S(\mathbf{x}) + \langle \mathbf{y}, \mathbf{z} - \mathbf{x} \rangle.
$$

由于在定义域 $S$ 内指示函数值为 $0$，上式等价于：
$$
0 \ge \langle \mathbf{y}, \mathbf{z} - \mathbf{x} \rangle \quad \text{对于所有 } \mathbf{z} \in S.
$$

> 对比法锥的定义即可得出：指示函数的次微分，正是其定义域集合在该点的**法锥**（即 $\partial \delta_S(\mathbf{x}) = N_S(\mathbf{x})$）。■

### Figure 3.1 (Visual representation of Example 3.4)
*See the original image for the plot of $y=|x|$.*
**Figure 3.1.** The linear underestimators of $|x|$ corresponding to $-0.8, -0.3, 0.7 \in \partial f(0)$; see Example 3.4.


---
### Formal Result (Equation 3.4)
We formally summarize the conclusion from the previous example into the following identity:（**指示函数的次微分即该点的法锥**）
$$
\partial \delta_S(\mathbf{x}) = N_S(\mathbf{x}) \quad \text{for all } \mathbf{x} \in S. \tag{3.4}
$$

For $\mathbf{x} \notin S$, by convention, both sets are defined as empty sets ($\partial \delta_S(\mathbf{x}) = N_S(\mathbf{x}) = \emptyset$). Therefore, the identity (3.4) holds for all $\mathbf{x}$, regardless of whether $\mathbf{x}$ is in the domain $S$ or not. ■


---
### Example 3.6: Subdifferential of the indicator function of the unit ball
As a special case of Example 3.5, let the set $S$ be the **unit ball** defined as:
$$
S = B[\mathbf{0}, 1] = \{ \mathbf{x} \in \mathbb{E} : \|\mathbf{x}\| \le 1 \}.
$$
From the previous derivation, we know that $\partial \delta_S(\mathbf{x}) = N_S(\mathbf{x})$, where $N_S(\mathbf{x})$ is given by:
$$
N_S(\mathbf{x}) = \{ \mathbf{y} \in \mathbb{E}^* : \langle \mathbf{y}, \mathbf{z} - \mathbf{x} \rangle \le 0 \ \text{for all } \mathbf{z} \in S \}.
$$
**Goal:** Find a more explicit representation for $N_S(\mathbf{x})$.
*   If $\mathbf{x} \notin S$, then $N_S(\mathbf{x}) = \emptyset$.
*   Now suppose that $\|\mathbf{x}\| \le 1$. A vector $\mathbf{y} \in \mathbb{E}^*$ satisfies $\mathbf{y} \in N_S(\mathbf{x})$ if and only if:
    $$
\langle \mathbf{y}, \mathbf{z} - \mathbf{x} \rangle \le 0 \quad \text{for any } \mathbf{z} \text{ satisfying } \|\mathbf{z}\| \le 1.
$$
This inequality is equivalent to:
$$
\langle \mathbf{y}, \mathbf{z} \rangle \le \langle \mathbf{y}, \mathbf{x} \rangle.
$$
By taking the maximum over all $\mathbf{z}$ satisfying $\|\mathbf{z}\| \le 1$ on the left-hand side, we obtain:
$$
\max_{\mathbf{z}: \|\mathbf{z}\| \le 1} \langle \mathbf{y}, \mathbf{z} \rangle \le \langle \mathbf{y}, \mathbf{x} \rangle.
$$
Using the definition of the dual norm, the left-hand side can be rewritten as:
$$
\|\mathbf{y}\|_* \le \langle \mathbf{y}, \mathbf{x} \rangle.
$$
Therefore,
**The explicit subdifferential of the indicator function of the unit ball $B[\mathbf{0},1]$ can be expressed concisely as follows:**
$$
\partial \delta_{B[\mathbf{0},1]}(\mathbf{x}) = N_{B[\mathbf{0},1]}(\mathbf{x}) =
\begin{cases}
\{ \mathbf{y} \in \mathbb{E}^* : \|\mathbf{y}\|_* \le \langle \mathbf{y}, \mathbf{x} \rangle \}, & \|\mathbf{x}\| \le 1 \\
\emptyset, & \|\mathbf{x}\| > 1
\end{cases}
$$
这上面这个式子似乎“自相矛盾”，因为dual norm的定义看上去就让它很难成立，但其实要满足要求，就只能$\|y\|_* = \langle y, x \rangle$
+ 因此，对于这个单位球的法锥，当 $x$ 在球内部的时候，法锥只有0向量；当 $x$ 在球面上的时候，法锥只有和 $x$ 同方向的 $y$ （这里说的 $y$ 没有区分 $\mathbb{E}$ 和 $\mathbb{E}^*$，因为实际上可以说明 $\mathbb{E}^*$ 中的 $y$ 在 $\mathbb{E}$ 中有一个唯一映射的向量与之对应，所以我们很多时候不区分它们）
---
### Example 3.7 (Subgradient of the dual function)
这一部分是Lagrange乘子法的加强版本，看这个[[Lagrange乘子法推广来看]]
Consider the following minimization problem:
$$
\min \{ f(\mathbf{x}) : \mathbf{g}(\mathbf{x}) \le \mathbf{0}, \mathbf{x} \in X \}, \tag{3.5}
$$
where $\emptyset \neq X \subseteq \mathbb{E}$, $f : \mathbb{E} \to \mathbb{R}$, and $\mathbf{g} : \mathbb{E} \to \mathbb{R}^m$ is a vector-valued function. The Lagrangian dual objective function is given by:
$$
q(\boldsymbol{\lambda}) = \min_{\mathbf{x} \in X} \left\{ L(\mathbf{x}; \boldsymbol{\lambda}) \equiv f(\mathbf{x}) + \boldsymbol{\lambda}^T \mathbf{g}(\mathbf{x}) \right\}.
$$

The dual problem consists of maximizing $q$ over its effective domain, which is given by:
$$
\text{dom}(-q) = \{ \boldsymbol{\lambda} \in \mathbb{R}^m_+ : q(\boldsymbol{\lambda}) > -\infty \}.
$$

No matter whether the primal problem (3.5) is convex or not, the dual problem
$$
\max_{\boldsymbol{\lambda} \in \mathbb{R}^m_+} \{ q(\boldsymbol{\lambda}) : \boldsymbol{\lambda} \in \text{dom}(-q) \}
$$
is always convex, meaning that $q$ is a concave function and $\text{dom}(-q)$ is a convex set.

Let $\boldsymbol{\lambda}_0 \in \text{dom}(-q)$ and assume that the minimum in the minimization problem defining $q(\boldsymbol{\lambda}_0)$,
$$
q(\boldsymbol{\lambda}_0) = \min_{\mathbf{x} \in X} \left\{ f(\mathbf{x}) + \boldsymbol{\lambda}_0^T \mathbf{g}(\mathbf{x}) \right\},
$$
is attained at $\mathbf{x}_0 \in X$, that is,
$$
L(\mathbf{x}_0; \boldsymbol{\lambda}_0) = f(\mathbf{x}_0) + \boldsymbol{\lambda}_0^T \mathbf{g}(\mathbf{x}_0) = q(\boldsymbol{\lambda}_0).
$$

We seek to find a subgradient of the convex function $-q$ at $\boldsymbol{\lambda}_0$. For that, note that for any $\boldsymbol{\lambda} \in \text{dom}(-q)$,
$$
\begin{aligned}
q(\boldsymbol{\lambda}) &= \min_{\mathbf{x} \in X} \left\{ f(\mathbf{x}) + \boldsymbol{\lambda}^T \mathbf{g}(\mathbf{x}) \right\} \\
&\le f(\mathbf{x}_0) + \boldsymbol{\lambda}^T \mathbf{g}(\mathbf{x}_0) \\
&= f(\mathbf{x}_0) + \boldsymbol{\lambda}_0^T \mathbf{g}(\mathbf{x}_0) + (\boldsymbol{\lambda} - \boldsymbol{\lambda}_0)^T \mathbf{g}(\mathbf{x}_0) \\
&= q(\boldsymbol{\lambda}_0) + \mathbf{g}(\mathbf{x}_0)^T (\boldsymbol{\lambda} - \boldsymbol{\lambda}_0).
\end{aligned}
$$

Thus,
$$
-q(\boldsymbol{\lambda}) \ge -q(\boldsymbol{\lambda}_0) + (-\mathbf{g}(\mathbf{x}_0))^T (\boldsymbol{\lambda} - \boldsymbol{\lambda}_0) \quad \text{for any } \boldsymbol{\lambda} \in \text{dom}(-q),
$$
concluding that:
$$
\boxed{-\mathbf{g}(\mathbf{x}_0) \in \partial(-q)(\boldsymbol{\lambda}_0).}
$$
