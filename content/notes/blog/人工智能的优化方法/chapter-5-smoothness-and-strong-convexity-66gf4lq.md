---
blog: true
title: "Chapter 5-Smoothness and Strong Convexity"
slug: "chapter-5-smoothness-and-strong-convexity-66gf4lq"
summary: "光滑性（Lipschitz 梯度）与强凸性：一阶方法的两条核心正则假设，含下降引理、等价刻画、二阶刻画、强凸最优性以及共轭对应定理。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

在 §3 我们学会「可微 / 次梯度 / 凸」，§4 拿到共轭函数。但真到设计**一阶方法**并分析收敛速度时，仅「凸 + 可微」不够。这一章 Beck 立起两个贯穿全书的**正则性假设**：

- **光滑性（smoothness）**：梯度 Lipschitz，记作 $L$-smooth；
- **强凸性（strong convexity）**：函数在任意两点间「比仿射还往下弯」一个二次量，记作 $\sigma$-strongly convex。

$L$ 管住「不能太扭」，$\sigma$ 管住「不能太平」。之后「梯度下降 $O(1/k)$、强凸 + 光滑 $O(1/k^2)$、条件数 $\kappa=L/\sigma$」的根都扎在这一章。下面严格按 §X.Y 顺序走，全部定义 / 例子 / 定理 / 推论 / 注记一个不漏。

# 5.1 L-Smooth Functions (L-光滑函数)

## 定义 5.1 · L-光滑性 (L-Smoothness)

> **Definition 5.1** (L-smoothness). Let $L \ge 0$. A function $f : \mathbb{E} \to (-\infty,\infty]$ is said to be $L$-smooth over a set $D \subseteq \mathbb{E}$ if it is differentiable over $D$ and satisfies
> $$\|\nabla f(\mathbf{x}) - \nabla f(\mathbf{y})\|_* \le L\|\mathbf{x} - \mathbf{y}\| \quad \text{for all } \mathbf{x}, \mathbf{y} \in D.$$
> The constant $L$ is called the smoothness parameter.

**逐字点评**：全章起点公理——梯度映射 $\nabla f$ 在所用量 $\|\cdot\|$ 下 Lipschitz 连续，常数正是 $L$。注意左边是**对偶范数** $\|\cdot\|_*$（$\nabla f(\mathbf{x})\in\mathbb{E}^*$），右边原空间范数，对上 §1.11。在整空间 $E$ 上 $L$-smooth 时直接叫「$L$-smooth」；这类函数记作 $C_{L}^{1,1}(D)$（$C^{1,1}$ = 一阶导自身 Lipschitz）。由可微性自动推出 $D\subseteq\mathrm{int}(\mathrm{dom}\,f)$。另外 $L_1$-smooth $\Rightarrow$ $L_2$-smooth for $L_2\ge L_1$，我们真正关心**最小**那个 $L$。

## 例 5.2 · 二次函数的光滑性 (smoothness of quadratic functions)

> **Example 5.2** (smoothness of quadratic functions). $f(\mathbf{x}) = \tfrac12\mathbf{x}^T\mathbf{A}\mathbf{x} + \mathbf{b}^T\mathbf{x} + c$, $\mathbf{A}\in\mathbb{S}^n$, with $\ell_p$-norm. Then
> $$\|\nabla f(\mathbf{x}) - \nabla f(\mathbf{y})\|_q = \|\mathbf{A}(\mathbf{x}-\mathbf{y})\|_q \le \|\mathbf{A}\|_{p,q}\,\|\mathbf{x}-\mathbf{y}\|_p,$$
> where $\|\mathbf{A}\|_{p,q} = \max\{\|\mathbf{A}\mathbf{x}\|_q : \|\mathbf{x}\|_p\le 1\}$, $1/p+1/q=1$. So $f$ is $\|\mathbf{A}\|_{p,q}$-smooth, and this is smallest possible.

**为什么关键**：把「抽象 Lipschitz 梯度」翻译成**矩阵诱导范数** $\|\mathbf{A}\|_{p,q}$。梯度差即 $\mathbf{A}(\mathbf{x}-\mathbf{y})$，其放大倍数就是诱导范数。最小性用一行卡出：若 $f$ 是 $L$-smooth，取 $\tilde{\mathbf{x}}$ 使 $\|\tilde{\mathbf{x}}\|_p=1$ 且 $\|\mathbf{A}\tilde{\mathbf{x}}\|_q=\|\mathbf{A}\|_{p,q}$，则 $\|\mathbf{A}\|_{p,q}=\|\nabla f(\tilde{\mathbf{x}})-\nabla f(\mathbf{0})\|_q\le L$。$\blacksquare$

## 例 5.3 · 仿射函数的 0-光滑性 (0-smoothness of affine functions)

> **Example 5.3** (0-smoothness of affine functions). $f(\mathbf{x}) = \langle \mathbf{b}, \mathbf{x}\rangle + c$, $\mathbf{b}\in\mathbb{E}^*$. Then $\|\nabla f(\mathbf{x})-\nabla f(\mathbf{y})\|_*=0\le 0\cdot\|\mathbf{x}-\mathbf{y}\|$, so affine functions are 0-smooth.

**结论**：$L=0$ 是光滑参数下界——最平的函数就是仿射 / 线性函数。

## 定理 5.4 · 投影算子的非扩张 / 强非扩张性

> **Theorem 5.4**. Let $\mathbb{E}$ be Euclidean, $C\subseteq\mathbb{E}$ nonempty closed convex. Then
> (a) (firm nonexpansiveness) $\langle P_C(\mathbf{v})-P_C(\mathbf{w}),\, \mathbf{v}-\mathbf{w}\rangle \ge \|P_C(\mathbf{v})-P_C(\mathbf{w})\|^2.$ (5.1)
> (b) (nonexpansiveness) $\|P_C(\mathbf{v})-P_C(\mathbf{w})\| \le \|\mathbf{v}-\mathbf{w}\|.$ (5.2)

**为什么在 §5.1 出现**：它不是光滑性定义，却是接下来两个例子的发动机。正交投影 $P_C$ 把点映到闭凸集 $C$ 最近点。(a)「强非扩张」说投影把向量差往自己方向压；(b) 由 (a) 取 Cauchy–Schwarz 推出。**作者注**：投影性质来自 Ch3 Example 3.31 和更一般 Thm 6.42——Beck 先借结论，后面补严格证明（埋钩子）。

## 例 5.5 · $\tfrac12 d_C^2$ 的 1-光滑性

> **Example 5.5** (1-smoothness of $\tfrac12 d_C^2$). $\phi_C(\mathbf{x}) = \tfrac12 d_C^2(\mathbf{x})$, $\nabla\phi_C(\mathbf{x}) = \mathbf{x} - P_C(\mathbf{x})$ (Example 3.31). Show $\phi_C$ is 1-smooth.

**证明（自己走）**：对任意 $\mathbf{x},\mathbf{y}$，
$$\|\nabla\phi_C(\mathbf{x})-\nabla\phi_C(\mathbf{y})\|^2 = \|\mathbf{x}-\mathbf{y}-(P_C(\mathbf{x})-P_C(\mathbf{y}))\|^2 = \|\mathbf{x}-\mathbf{y}\|^2 - 2\langle P_C(\mathbf{x})-P_C(\mathbf{y}),\mathbf{x}-\mathbf{y}\rangle + \|P_C(\mathbf{x})-P_C(\mathbf{y})\|^2.$$
用 Thm 5.4(a) 把中间内积项放成 $\le -2\|P_C(\mathbf{x})-P_C(\mathbf{y})\|^2$，得 $\le \|\mathbf{x}-\mathbf{y}\|^2-\|P_C(\mathbf{x})-P_C(\mathbf{y})\|^2\le \|\mathbf{x}-\mathbf{y}\|^2$，开根即 1-smooth。$\blacksquare$

## 例 5.6 · $\tfrac12\|\cdot\|^2 - \tfrac12 d_C^2$ 的 1-光滑性

> **Example 5.6** (1-smoothness of $\tfrac12\|\cdot\|^2 - \tfrac12 d_C^2$). $\psi_C(\mathbf{x}) = \tfrac12\|\mathbf{x}\|^2 - \tfrac12 d_C^2(\mathbf{x})$, convex by Example 2.17. Show it is 1-smooth.

**证明**：$\nabla\psi_C(\mathbf{x}) = \mathbf{x}-(\mathbf{x}-P_C(\mathbf{x})) = P_C(\mathbf{x})$，1-光滑性直接来自 Thm 5.4(b)：$\|\nabla\psi_C(\mathbf{x})-\nabla\psi_C(\mathbf{y})\| = \|P_C(\mathbf{x})-P_C(\mathbf{y})\| \le \|\mathbf{x}-\mathbf{y}\|$。$\blacksquare$ 这个函数在 Ch13（Dykstra、交替投影）和近端类算法反复现身。

## 5.1.1 The Descent Lemma (下降引理)

## Lemma 5.7 · 下降引理 (descent lemma)

> **Lemma 5.7** (descent lemma). Let $f$ be $L$-smooth ($L\ge 0$) over a convex set $D$. Then for any $\mathbf{x},\mathbf{y}\in D$,
> $$f(\mathbf{y}) \le f(\mathbf{x}) + \langle \nabla f(\mathbf{x}), \mathbf{y}-\mathbf{x}\rangle + \frac{L}{2}\|\mathbf{x}-\mathbf{y}\|^2. \tag{5.3}$$

**为什么「extremely useful」**：把「梯度 Lipschitz」翻译成**二次函数上界（quadratic majorant）**——任意点 $\mathbf{x}$ 处函数被「仿射项 + 二次项」从上方罩住，是后面梯度法收敛分析的发动机。*See the original image for the plot of the quadratic majorant bowl $f(\mathbf{y})\le f(\mathbf{x})+\langle\nabla f(\mathbf{x}),\mathbf{y}-\mathbf{x}\rangle+\frac{L}{2}\|\mathbf{y}-\mathbf{x}\|^2$ lying above the graph of $f$.*

**证明（自己推）**：路径 $\mathbf{x}+t(\mathbf{y}-\mathbf{x})$ 用 FTC，
$$f(\mathbf{y})-f(\mathbf{x}) = \langle \nabla f(\mathbf{x}), \mathbf{y}-\mathbf{x}\rangle + \int_0^1 \langle \nabla f(\mathbf{x}+t(\mathbf{y}-\mathbf{x})) - \nabla f(\mathbf{x}), \mathbf{y}-\mathbf{x}\rangle\,dt.$$
取绝对值 + 广义 Cauchy–Schwarz（Lem 1.4）+ 沿线段 $L$-smooth（$\|\nabla f(\mathbf{x}+t(\mathbf{y}-\mathbf{x}))-\nabla f(\mathbf{x})\|_*\le tL\|\mathbf{y}-\mathbf{x}\|$）：
$$|f(\mathbf{y})-f(\mathbf{x})-\langle\nabla f(\mathbf{x}),\mathbf{y}-\mathbf{x}\rangle| \le \int_0^1 tL\|\mathbf{y}-\mathbf{x}\|^2\,dt = \frac{L}{2}\|\mathbf{y}-\mathbf{x}\|^2,$$
即 (5.3)。$\blacksquare$ 只要求 $D$ 凸；等号取到当 $f$ 是 $\tfrac{L}{2}\|\cdot\|^2$ 加仿射项。

## 5.1.2 Characterizations of L-Smooth Functions

## 定理 5.8 · L-光滑性的等价刻画 (characterizations of L-smoothness)

> **Theorem 5.8** (characterizations of L-smoothness). $f : \mathbb{E}\to\mathbb{R}$ convex, differentiable over $\mathbb{E}$, $L>0$. Equivalent:
> (i) $f$ is $L$-smooth.
> (ii) $f(\mathbf{y}) \le f(\mathbf{x}) + \langle \nabla f(\mathbf{x}), \mathbf{y}-\mathbf{x}\rangle + \frac{L}{2}\|\mathbf{x}-\mathbf{y}\|^2$.
> (iii) $f(\mathbf{y}) \ge f(\mathbf{x}) + \langle \nabla f(\mathbf{x}), \mathbf{y}-\mathbf{x}\rangle + \frac{1}{2L}\|\nabla f(\mathbf{x})-\nabla f(\mathbf{y})\|_*^2$.
> (iv) $\langle \nabla f(\mathbf{x})-\nabla f(\mathbf{y}),\, \mathbf{x}-\mathbf{y}\rangle \ge \frac{1}{L}\|\nabla f(\mathbf{x})-\nabla f(\mathbf{y})\|_*^2$.
> (v) $f(\lambda\mathbf{x}+(1-\lambda)\mathbf{y}) \ge \lambda f(\mathbf{x}) + (1-\lambda)f(\mathbf{y}) - \frac{L}{2}\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2$.

**为什么枢纽**：把「梯度 Lipschitz」等价成四种语言：

| 编号 | 语言 | 直觉 |
| --- | --- | --- |
| (i) | 梯度 Lipschitz | 原始定义 |
| (ii) | 二次**上界** | 下降引理 |
| (iii) | 二次**下界**（含梯度差） | 离仿射也不远 |
| (iv) | cocoercivity | 梯度 $\tfrac1L$-强单调 |
| (v) | 凸 + 二次修正 | 比普通凸多弯 |

**证明（自己推关键方向）**：**(i)⇒(ii)** 即下降引理。**(ii)⇒(iii)** 固定 $\mathbf{x}$ 令 $g_{\mathbf{x}}(\mathbf{y})=f(\mathbf{y})-f(\mathbf{x})-\langle\nabla f(\mathbf{x}),\mathbf{y}-\mathbf{x}\rangle$；先证 $g_{\mathbf{x}}$ 也满足 (ii) 型上界（代入 $\nabla g_{\mathbf{x}}=\nabla f-\nabla f(\mathbf{x})$），故 $\nabla g_{\mathbf{x}}(\mathbf{x})=0$ 且 $g_{\mathbf{x}}$ 凸 $\implies \mathbf{x}$ 全局极小。取 $\mathbf{v}$ 使 $\|\mathbf{v}\|=1$、$\langle\nabla g_{\mathbf{x}}(\mathbf{y}),\mathbf{v}\rangle=\|\nabla g_{\mathbf{x}}(\mathbf{y})\|_*$，令 $z=\mathbf{y}-\frac{\|\nabla g_{\mathbf{x}}(\mathbf{y})\|_*}L\mathbf{v}$，代上界得 $0\le g_{\mathbf{x}}(\mathbf{y})-\frac{1}{2L}\|\nabla g_{\mathbf{x}}(\mathbf{y})\|_*^2$，即 (iii)。**(iii)⇒(iv)** 写在点对 $(\mathbf{x},\mathbf{y})$ 与 $(\mathbf{y},\mathbf{x})$ 上相加，仿射项抵消。**(iv)⇒(i)** 配广义 Cauchy–Schwarz 约去 $\|\nabla f(\mathbf{x})-\nabla f(\mathbf{y})\|_*$。**(ii)⇔(v)** 令 $\mathbf{x}_\lambda=\lambda\mathbf{x}+(1-\lambda)\mathbf{y}$，用 (ii) 在 $\mathbf{x}_\lambda$ 处对 $\mathbf{x},\mathbf{y}$ 展开、乘 $\lambda,1-\lambda$ 相加得 (v)；反向取 $\lambda\to1^-$ 用 $f'(\mathbf{x};\mathbf{y}-\mathbf{x})=\langle\nabla f(\mathbf{x}),\mathbf{y}-\mathbf{x}\rangle$（Thm 3.29）得 (ii)。（书在 (ii)⇒(v) 推导中把结论误标成 "(iv)"，应为 (v)。）$\blacksquare$

## 注记 5.9 · Thm 5.8 中凸性的必要性 (necessity of convexity)

> **Remark 5.9**. The convexity assumption is essential. $f(\mathbf{x}) = -\tfrac12\|\mathbf{x}\|_2^2$ is 1-smooth w.r.t. $\ell_2$ but not $L$-smooth for $L<1$. Yet $f$ is concave, hence $f(\mathbf{y}) \le f(\mathbf{x}) + \langle \nabla f(\mathbf{x}), \mathbf{y}-\mathbf{x}\rangle$, so (ii) holds with $L=0$, although $f$ is not 0-smooth.

**为什么记一辈子**：说明 Thm 5.8 等价严格依赖凸性。凹函数 $f=-\tfrac12\|\mathbf{x}\|_2^2$ 满足 (ii) 取 $L=0$（凹=图像在切线下方），但根本不是 0-smooth（梯度 $-\mathbf{x}$，差模不 $\le0$）。「(ii) 对某 $L$ 成立」**推不出**「$L$-smooth」——除非加凸。下降引理 (ii) 是 $L$-smooth 的必要非充分条件（无凸时）。

## 定理 5.10 · 线性近似定理 (linear approximation theorem)

> **Theorem 5.10**. $f : U\to\mathbb{R}$ twice continuously differentiable over open $U\subseteq\mathbb{R}^n$, $\mathbf{x}\in U$, $B(\mathbf{x},r)\subseteq U$. Then $\forall \mathbf{y}\in B(\mathbf{x},r)\ \exists \boldsymbol{\xi}\in[\mathbf{x},\mathbf{y}]$:
> $$f(\mathbf{y}) = f(\mathbf{x}) + \nabla f(\mathbf{x})^T(\mathbf{y}-\mathbf{x}) + \tfrac12(\mathbf{y}-\mathbf{x})^T\nabla^2 f(\boldsymbol{\xi})(\mathbf{y}-\mathbf{x}).$$

**为什么需要**：二阶刻画（§5.1.3）和 Ex 5.11/5.15 的「带 Hessian 余项的泰勒展开」。余项 $\boldsymbol{\xi}$ 落在线段上（非固定点），只能得「存在某点」，要配 Hessian 上界才推全局光滑。

## 例 5.11 · 半平方 $\ell_p$ 范数的 $(p-1)$-光滑性

> **Example 5.11** ($(p-1)$-smoothness of the half-squared $\ell_p$-norm). $f(\mathbf{x}) = \tfrac12\|\mathbf{x}\|_p^2 = \tfrac12(\sum_i |x_i|^p)^{2/p}$, $p\in[2,\infty)$, with $\ell_p$-norm. Then $f$ is $(p-1)$-smooth w.r.t. $\ell_p$.

**为什么重要**：非欧几何下光滑参数的经典计算（Ben-Tal–Margalit–Nemirovski）。$p=2$ 退化为 Ex 5.2（$L=1$）；$p>2$ 时 $L=p-1$。**证明（自己走关键步）**：一阶导对 $\mathbf{x}\ne\mathbf{0}$ 为 $\frac{\partial f}{\partial x_i}=\frac{\mathrm{sgn}(x_i)|x_i|^{p-1}}{\|\mathbf{x}\|_p^{p-2}}$（$\mathbf{0}$ 处取 0），连续保证可微。二阶导对角项 $\frac{(p-1)|x_i|^{p-2}}{\|\mathbf{x}\|_p^{p-2}}+\frac{(2-p)|x_i|^{2p-2}}{\|\mathbf{x}\|_p^{2p-2}}$，非对角 $\frac{(2-p)\mathrm{sgn}(x_i)\mathrm{sgn}(x_j)|x_i|^{p-1}|x_j|^{p-1}}{\|\mathbf{x}\|_p^{2p-2}}$。对线段不含原点处用 Thm 5.10，可不妨设 $\|\boldsymbol{\xi}\|_p=1$。任意 $\mathbf{d}$：
$$\mathbf{d}^T\nabla^2 f(\boldsymbol{\xi})\mathbf{d} \le (p-1)\sum_i |\xi_i|^{p-2}d_i^2 \le (p-1)\|\mathbf{d}\|_p^2$$
（$p>2$ 使交叉项系数为负可直接丢掉，第二项用广义 Cauchy–Schwarz）。取 $\mathbf{d}=\mathbf{x}-\mathbf{y}$ 代回余项得 (ii) 型不等式，由 Thm 5.8 的 (i)⇔(ii) 推出 $(p-1)$-smooth；含原点情形用连续性延拓。$\blacksquare$

## 5.1.3 Second-Order Characterization

## 定理 5.12 · 光滑性与 Hessian 有界性 (L-smoothness and boundedness of the Hessian)

> **Theorem 5.12**. $f : \mathbb{R}^n\to\mathbb{R}$ twice continuously differentiable. For $L\ge 0$ equivalent:
> (i) $f$ is $L$-smooth w.r.t. $\ell_p$-norm ($p\in[1,\infty]$).
> (ii) $\|\nabla^2 f(\mathbf{x})\|_{p,q}\le L$ for all $\mathbf{x}$, $1/p+1/q=1$.

**为什么优雅**：二阶可微时光滑性 = 曲率处处被 $L$ 管住。**证明**：**(ii)⇒(i)** 由 FTC，$\nabla f(\mathbf{y})=\nabla f(\mathbf{x})+(\int_0^1\nabla^2 f(\mathbf{x}+t(\mathbf{y}-\mathbf{x}))\,dt)(\mathbf{y}-\mathbf{x})$，取诱导范数 $\le L\|\mathbf{y}-\mathbf{x}\|_p$。**(i)⇒(ii)** 对 $\mathbf{d},\alpha>0$ 有 $\nabla f(\mathbf{x}+\alpha\mathbf{d})-\nabla f(\mathbf{x})=\int_0^\alpha\nabla^2 f(\mathbf{x}+t\mathbf{d})\mathbf{d}\,dt$，取范数后用 (i) 得 $\le\alpha L\|\mathbf{d}\|_p$，除以 $\alpha$ 令 $\alpha\to0^+$ 得 $\|\nabla^2 f(\mathbf{x})\mathbf{d}\|_q\le L\|\mathbf{d}\|_p$。$\blacksquare$

## 推论 5.13 · Euclidean：$L \iff \lambda_{\max}(\nabla^2 f)\le L$

> **Corollary 5.13**. $f : \mathbb{R}^n\to\mathbb{R}$ twice continuously differentiable and convex. Then $f$ is $L$-smooth w.r.t. $\ell_2$ iff $\lambda_{\max}(\nabla^2 f(\mathbf{x}))\le L$ for all $\mathbf{x}$.

**证明**：凸性 $\implies\nabla^2 f(\mathbf{x})\succeq0$，故 $\|\nabla^2 f(\mathbf{x})\|_{2,2}=\lambda_{\max}(\nabla^2 f(\mathbf{x}))$，配 Thm 5.12 即。$\blacksquare$ 这正是「步长 $\eta\le1/L$」的来源。

## 例 5.14 · $\sqrt{1+\|\mathbf{x}\|_2^2}$ 的 1-光滑性

> **Example 5.14** (1-smoothness of $\sqrt{1+\|\mathbf{x}\|_2^2}$ w.r.t. $\ell_2$). $f(\mathbf{x}) = \sqrt{1+\|\mathbf{x}\|_2^2}$ is 1-smooth w.r.t. $\ell_2$.

**证明**：$\nabla f(\mathbf{x}) = \frac{\mathbf{x}}{\sqrt{\|\mathbf{x}\|_2^2+1}}$，$\nabla^2 f(\mathbf{x}) = \frac{1}{\sqrt{\|\mathbf{x}\|_2^2+1}}\mathbf{I} - \frac{\mathbf{x}\mathbf{x}^T}{(\|\mathbf{x}\|_2^2+1)^{3/2}}\preceq \frac{1}{\sqrt{\|\mathbf{x}\|_2^2+1}}\mathbf{I}\preceq\mathbf{I}$，故 $\lambda_{\max}\le1$，Cor 5.13 给 1-smooth。$\blacksquare$ 这是 $\|\mathbf{x}\|_2$ 的平滑版（原点不尖），做近端 / 正则化时常当替代。

## 例 5.15 · log-sum-exp 的 1-光滑性（w.r.t. $\ell_2$ 与 $\ell_\infty$）

> **Example 5.15** (1-smoothness of log-sum-exp w.r.t. $\ell_2,\ell_\infty$). $f(\mathbf{x}) = \log(e^{x_1}+\cdots+e^{x_n})$ is 1-smooth w.r.t. both $\ell_2$ and $\ell_\infty$.

**证明**：偏导 $w_i=e^{x_i}/\sum_k e^{x_k}$，Hessian $\nabla^2 f = \mathrm{diag}(\mathbf{w}) - \mathbf{w}\mathbf{w}^T$。对 $\ell_2$：$\nabla^2 f\preceq\mathrm{diag}(\mathbf{w})\preceq\mathbf{I}$ $\implies$ Cor 5.13 给 1-smooth。对 $\ell_\infty$：任意 $\mathbf{d}$，$\mathbf{d}^T\nabla^2 f\mathbf{d}\le\sum_i w_i d_i^2\le\|\mathbf{d}\|_\infty^2\sum_i w_i=\|\mathbf{d}\|_\infty^2$；用 Thm 5.10 配余项得 $f(\mathbf{y})\le f(\mathbf{x})+\nabla f(\mathbf{x})^T(\mathbf{y}-\mathbf{x})+\tfrac12\|\mathbf{y}-\mathbf{x}\|_\infty^2$，由 Thm 5.8 的 (i)⇔(ii) 推出对 $\ell_\infty$ 也 1-smooth。$\blacksquare$

## 5.1.4 Summary of Smoothness Parameter Computations

| $f(\mathbf{x})$ | $\mathrm{dom}$ | $L$ | 范数 | 出处 |
| --- | --- | --- | --- | --- |
| $\tfrac12\mathbf{x}^T\mathbf{A}\mathbf{x}+\mathbf{b}^T\mathbf{x}+c$ | $\mathbb{R}^n$ | $\|\mathbf{A}\|_{p,q}$ | $\ell_p$ | Ex 5.2 |
| $\langle\mathbf{b},\mathbf{x}\rangle + c$ | $\mathbb{E}$ | $0$ | 任意 | Ex 5.3 |
| $\tfrac12\|\mathbf{x}\|_p^2$, $p\in[2,\infty)$ | $\mathbb{R}^n$ | $p-1$ | $\ell_p$ | Ex 5.11 |
| $\sqrt{1+\|\mathbf{x}\|_2^2}$ | $\mathbb{R}^n$ | $1$ | $\ell_2$ | Ex 5.14 |
| $\log(\sum_i e^{x_i})$ | $\mathbb{R}^n$ | $1$ | $\ell_2,\ell_\infty$ | Ex 5.15 |
| $\tfrac12 d_C^2(\mathbf{x})$ | $\mathbb{E}$ | $1$ | Euclidean | Ex 5.5 |
| $\tfrac12\|\mathbf{x}\|^2-\tfrac12 d_C^2(\mathbf{x})$ | $\mathbb{E}$ | $1$ | Euclidean | Ex 5.6 |
| $H_\mu(\mathbf{x})$ ($\mu>0$) | $\mathbb{E}$ | $1/\mu$ | Euclidean | Ex 6.62 |

**经验法则**：距离平方 / 范数平方 / 投影相关先验 $L=1$（Euclidean）；二次型算矩阵诱导范数；非欧 $\ell_p$ 小心多 $p-1$ 因子。

# 5.2 Strong Convexity (强凸性)

## 定义 5.16 · 强凸性 (strong convexity)

> **Definition 5.16** (strong convexity). $f : \mathbb{E}\to(-\infty,\infty]$ is $\sigma$-strongly convex ($\sigma>0$) if $\mathrm{dom}(f)$ convex and for any $\mathbf{x},\mathbf{y}\in\mathrm{dom}(f)$, $\lambda\in[0,1]$:
> $$f(\lambda\mathbf{x}+(1-\lambda)\mathbf{y}) \le \lambda f(\mathbf{x}) + (1-\lambda)f(\mathbf{y}) - \frac{\sigma}{2}\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2. \tag{5.13}$$

**为什么这一行最关键**：强凸 = 「普通凸 + 一个负的二次修正」——比仿射还往下弯 $\tfrac{\sigma}{2}\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2$。**$\sigma$ 依赖范数**（参考 Rem 5.18），常写「w.r.t. $\|\cdot\|$ 的强凸参数」。令 $\sigma\to0^+$ 得 Jensen 不等式，故强凸函数必凸。同 $L$-smooth，$\sigma_1$-strong $\Rightarrow$ $\sigma_2$-strong for $\sigma_2\in(0,\sigma_1)$，关心最大那个。

## 定理 5.17 · Euclidean 空间的等价刻画

> **Theorem 5.17**. Let $\mathbb{E}$ be Euclidean. Then $f$ is $\sigma$-strongly convex iff $f(\cdot) - \tfrac{\sigma}{2}\|\cdot\|^2$ is convex.

**证明（自己推）**：设 $g(\mathbf{x})=f(\mathbf{x})-\tfrac{\sigma}{2}\|\mathbf{x}\|^2$。$g$ 凸 $\iff$ 对 $\lambda\in[0,1]$，$g(\lambda\mathbf{x}+(1-\lambda)\mathbf{y})\le\lambda g(\mathbf{x})+(1-\lambda)g(\mathbf{y})$，右边多出 $\tfrac{\sigma}{2}(\lambda\|\mathbf{x}\|^2+(1-\lambda)\|\mathbf{y}\|^2-\|\lambda\mathbf{x}+(1-\lambda)\mathbf{y}\|^2)$。用平行四边形律 $\|\lambda\mathbf{x}+(1-\lambda)\mathbf{y}\|^2=\lambda\|\mathbf{x}\|^2+(1-\lambda)\|\mathbf{y}\|^2-\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2$，括号内恰为 $\lambda(1-\lambda)\|\mathbf{x}-\mathbf{y}\|^2$，于是 $g$ 凸等价于 (5.13)。$\blacksquare$ 这是强凸最常用工作定义：证强凸性质时先减 $\tfrac{\sigma}{2}\|\cdot\|^2$ 再套凸性。

## 注记 5.18 · Euclidean 假设不可省

> **Remark 5.18**. The Euclidean assumption is essential. The negative-entropy $f(\mathbf{x})=\sum_i x_i\log x_i$ on $\Delta_n$ (else $\infty$) is 1-strongly convex w.r.t. $\ell_1$ (Example 5.27). Yet $g(\mathbf{x})=f(\mathbf{x})-\alpha\|\mathbf{x}\|_1^2$ is convex for any $\alpha>0$ (since $\|\mathbf{x}\|_1=1$ on $\Delta_n$); a function cannot be $\alpha$-strongly convex for every $\alpha>0$. So Thm 5.17 fails for general norms.

**为什么值得记**：非欧范数下「$f-\tfrac{\sigma}{2}\|\cdot\|^2$ 凸」**不**等价于强凸。单位单纯形上 $\|\mathbf{x}\|_1\equiv1$，减 $\alpha\|\mathbf{x}\|_1^2$ 等于减常数，当然仍凸；但负熵不可能对所有 $\alpha$ 强凸。Thm 5.17 优雅等价**只在 Euclidean 成立**，并预告 Ex 5.27。

## 例 5.19 · 二次函数的强凸性

> **Example 5.19** (strong convexity of quadratic functions). $f(\mathbf{x}) = \tfrac12\mathbf{x}^T\mathbf{A}\mathbf{x}+\mathbf{b}^T\mathbf{x}+c$ on $\ell_2$. By Thm 5.17, $f$ is $\sigma$-strongly convex iff $\mathbf{A}-\sigma\mathbf{I}\succeq 0$, i.e. $\lambda_{\min}(\mathbf{A})\ge\sigma$. So $f$ is strongly convex iff $\mathbf{A}\succ0$, and $\lambda_{\min}(\mathbf{A})$ is its largest parameter.

**证明**：$f$ $\sigma$-强凸 $\iff f(\mathbf{x})-\tfrac{\sigma}{2}\|\mathbf{x}\|_2^2$ 凸 $\iff \mathbf{A}-\sigma\mathbf{I}\succeq0$。$\blacksquare$ 二次型强凸参数 = Hessian 最小特征值，与 Ex 5.2 光滑参数 = 最大特征值**完美对称**——预告 §5.3 共轭对应。

## Lemma 5.20 · 强凸 + 凸 = 强凸

> **Lemma 5.20**. $f$ $\sigma$-strongly convex ($\sigma>0$), $g$ convex. Then $f+g$ is $\sigma$-strongly convex.

**证明**：$\mathrm{dom}(f+g)=\mathrm{dom}(f)\cap\mathrm{dom}(g)$ 凸。对 $\mathbf{x},\mathbf{y}\in\mathrm{dom}(f+g)$、$\lambda\in[0,1]$，把 $f$ 强凸与 $g$ 凸的不等式相加即得。$\blacksquare$ 用途：给凸问题加 $\tfrac{\mu}{2}\|\mathbf{x}\|^2$ 正则项即强行获强凸——近端 / 正则化基石。

## 例 5.21 · $\tfrac12\|\cdot\|^2+\delta_C$ 的强凸性

> **Example 5.21** (strong convexity of $\tfrac12\|\cdot\|^2+\delta_C$). Euclidean $\mathbb{E}$, $C$ nonempty convex. $\tfrac12\|\mathbf{x}\|^2$ is 1-strongly convex (Ex 5.19), $\delta_C$ convex. By Lemma 5.20, $\tfrac12\|\mathbf{x}\|^2+\delta_C(\mathbf{x})$ is 1-strongly convex.

**结论**：约束集 $C$ 上的「平方范数 + 示性函数」是 1-强凸——把带约束最小化变强凸问题，投影梯度法有唯一解、线性收敛可期。

## Lemma 5.22 · 次梯度的中值定理 (mean-value theorem)

> **Lemma 5.22**. $f : \mathbb{R}\to(-\infty,\infty]$ closed convex, $[a,b]\subseteq\mathrm{dom}(f)$ ($a<b$). Then $f(b)-f(a) = \int_a^b h(t)\,dt$, where $h(t)\in\partial f(t)$ for $t\in(a,b)$.

**为什么需要**：证明强凸一阶刻画（Thm 5.24）要沿直线积分次梯度。它是单维闭凸函数的「牛顿-莱布尼茨」，但被积函数取**任意次梯度**（一元闭凸可能不可导，次梯度处处在）。

## Lemma 5.23 · 线段原理 (line segment principle)

> **Lemma 5.23** (line segment principle). $C$ convex. If $\mathbf{x}\in\mathrm{ri}(C)$, $\mathbf{y}\in\mathrm{cl}(C)$, $\lambda\in(0,1]$, then $\lambda\mathbf{x}+(1-\lambda)\mathbf{y}\in\mathrm{ri}(C)$.

**为什么需要**：Thm 5.24 把「相对内点 + 边界点」凸组合拉回相对内点，保证次微分非空（Ch3 Thm 3.18：相对内点处次微分非空）。

## 定理 5.24 · 强凸的一阶刻画 (first-order characterizations)

> **Theorem 5.24** (first-order characterizations of strong convexity). $f$ proper closed convex. For $\sigma>0$ equivalent:
> (i) $f$ is $\sigma$-strongly convex.
> (ii) $f(\mathbf{y}) \ge f(\mathbf{x}) + \langle \mathbf{g}, \mathbf{y}-\mathbf{x}\rangle + \frac{\sigma}{2}\|\mathbf{y}-\mathbf{x}\|^2$ for any $\mathbf{x}\in\mathrm{dom}(\partial f)$, $\mathbf{y}\in\mathrm{dom}(f)$, $\mathbf{g}\in\partial f(\mathbf{x})$.
> (iii) $\langle \mathbf{g}_x-\mathbf{g}_y,\, \mathbf{x}-\mathbf{y}\rangle \ge \sigma\|\mathbf{x}-\mathbf{y}\|^2$ for any $\mathbf{x},\mathbf{y}\in\mathrm{dom}(\partial f)$, $\mathbf{g}_x\in\partial f(\mathbf{x})$, $\mathbf{g}_y\in\partial f(\mathbf{y})$.

**为什么第二枢纽**：把「强凸」翻译成次梯度语言——(ii) 是「次梯度支撑超平面离函数下方恰有 $\tfrac{\sigma}{2}\|\cdot\|^2$ 间隙」，(iii) 是「次梯度算子 $\sigma$-强单调」。

**证明（自己推三方向）**：**(ii)⇒(i)** 取 $\mathbf{z}\in\mathrm{ri}(\mathrm{dom} f)$，令 $\tilde{\mathbf{x}}=(1-\alpha)\mathbf{x}+\alpha\mathbf{z}$，线段原理 $\implies\partial f(\tilde{\mathbf{x}})\ne\emptyset$。记 $\mathbf{x}_\lambda=\lambda\tilde{\mathbf{x}}+(1-\lambda)\mathbf{y}$，取 $\mathbf{g}\in\partial f(\mathbf{x}_\lambda)$，由 (ii) 写 $\tilde{\mathbf{x}}$ 与 $\mathbf{y}$ 处两式、乘 $\lambda,1-\lambda$ 相加得关于 $\alpha$ 的一维不等式；令 $\alpha\to0^+$ 用 Thm 2.22（一元闭凸连续）取极限即得 (i)。**(i)⇒(iii)** 取 $\mathbf{x}_\lambda=\lambda\mathbf{x}+(1-\lambda)\mathbf{y}$，由 (i) 与 $\mathbf{g}_x\in\partial f(\mathbf{x})$ 得 $\frac{f(\mathbf{x}_\lambda)-f(\mathbf{x})}{1-\lambda}\le f(\mathbf{y})-f(\mathbf{x})-\tfrac{\sigma}{2}\lambda\|\mathbf{x}-\mathbf{y}\|^2$ 且 $\ge\langle\mathbf{g}_x,\mathbf{y}-\mathbf{x}\rangle$；合并令 $\lambda\to1^-$ 得 $\langle\mathbf{g}_x,\mathbf{y}-\mathbf{x}\rangle\le f(\mathbf{y})-f(\mathbf{x})-\tfrac{\sigma}{2}\|\mathbf{x}-\mathbf{y}\|^2$；交换 $x,y$ 相加得 (iii)。**(iii)⇒(ii)** 取 $\tilde{\mathbf{y}}=(1-\alpha)\mathbf{y}+\alpha\mathbf{z}\in\mathrm{ri}(\mathrm{dom} f)$。一维 $\phi(\lambda)=f(\mathbf{x}_\lambda)$，由 Lem 5.22 $f(\tilde{\mathbf{y}})-f(\mathbf{x})=\int_0^1\langle\mathbf{g}_\lambda,\tilde{\mathbf{y}}-\mathbf{x}\rangle d\lambda$；由 (iii) 用于 $\mathbf{g}_\lambda,\mathbf{g}$ 得被积 $\ge\langle\mathbf{g},\tilde{\mathbf{y}}-\mathbf{x}\rangle+\sigma\lambda\|\tilde{\mathbf{y}}-\mathbf{x}\|^2$，积分后令 $\alpha\to0^+$ 用 Thm 2.22 连续性得 (ii)。$\blacksquare$ **(iii) 强单调性**与 Thm 5.8 的 (iv) cocoercivity 是**对偶双胞胎**——一个管强凸次梯度，一个管光滑梯度，正是 §5.3 共轭对应深层原因。

## 定理 5.25 · 闭强凸函数极小元的存在唯一性与增长性

> **Theorem 5.25** (existence and uniqueness of a minimizer). $f$ proper closed $\sigma$-strongly convex ($\sigma>0$). Then
> (a) $f$ has a unique minimizer;
> (b) $f(\mathbf{x})-f(\mathbf{x}^*) \ge \frac{\sigma}{2}\|\mathbf{x}-\mathbf{x}^*\|^2$ for all $\mathbf{x}\in\mathrm{dom}(f)$, $\mathbf{x}^*$ unique minimizer.

**为什么是强凸的 reward**：强凸直接换来极小点唯一 + 函数值以二次速度离开极小点（quadratic growth / 误差界）——一阶方法线性 / 加速收敛根本保证。**证明**：**(a) 唯一性** 设 $\tilde{\mathbf{x}},\hat{\mathbf{x}}$ 极小点，$f_{\mathrm{opt}}=f(\tilde{\mathbf{x}})=f(\hat{\mathbf{x}})$。$\lambda=\tfrac12$ 用强凸：$f_{\mathrm{opt}}\le f(\tfrac12\tilde{\mathbf{x}}+\tfrac12\hat{\mathbf{x}})\le f_{\mathrm{opt}}-\tfrac{\sigma}{8}\|\tilde{\mathbf{x}}-\hat{\mathbf{x}}\|^2$，故 $\tilde{\mathbf{x}}=\hat{\mathbf{x}}$。**(a) 存在性** 取 $\mathbf{x}_0\in\mathrm{ri}(\mathrm{dom} f)$（Thm 3.17），$\partial f(\mathbf{x}_0)\ne\emptyset$（Thm 3.18），取 $\mathbf{g}\in\partial f(\mathbf{x}_0)$。由 (ii)：$f(\mathbf{x})\ge f(\mathbf{x}_0)+\langle\mathbf{g},\mathbf{x}-\mathbf{x}_0\rangle+\tfrac{\sigma}{2}\|\mathbf{x}-\mathbf{x}_0\|^2$。有限维范数等价，配方得 $\mathrm{Lev}(f,f(\mathbf{x}_0))$ 被某 Euclidean 闭球包含 $\implies$ 有界；又 $f$ 闭 $\implies$ 水平集闭（Thm 2.6）故紧；闭函数版 Weierstrass（Thm 2.12）给极小点存在。**(b)** 由 Fermat（Thm 3.63）$0\in\partial f(\mathbf{x}^*)$，对 $\mathbf{x}$ 用 (ii) 取 $\mathbf{g}=0$ 得 $f(\mathbf{x})\ge f(\mathbf{x}^*)+\tfrac{\sigma}{2}\|\mathbf{x}-\mathbf{x}^*\|^2$。$\blacksquare$

# 5.3 Smoothness and Strong Convexity Correspondence

## 5.3.1 The Conjugate Correspondence Theorem

## 定理 5.26 · 共轭对应定理 (conjugate correspondence theorem)

> **Theorem 5.26** (conjugate correspondence theorem). Let $\sigma>0$.
> (a) If $f : \mathbb{E}\to\mathbb{R}$ is $\frac{1}{\sigma}$-smooth convex, then $f^*$ is $\sigma$-strongly convex w.r.t. dual norm $\|\cdot\|_*$.
> (b) If $f : \mathbb{E}\to(-\infty,\infty]$ is proper closed $\sigma$-strongly convex, then $f^* : \mathbb{E}^*\to\mathbb{R}$ is $\frac{1}{\sigma}$-smooth.

**为什么最高潮**：光滑与强凸通过**共轭**互换——$f$ 是 $(1/\sigma)$-smooth 凸 $\iff$ $f^*$ $\sigma$-强凸；反过来 $f$ 闭 $\sigma$-强凸 $\iff$ $f^*$ $(1/\sigma)$-smooth。这正是 Ex 5.2 / Ex 5.19 那对「最大 / 最小特征值」对称的深层解释。**证明（依赖 Ch4 共轭次梯度定理）**：**(a)** 取 $\mathbf{y}_1,\mathbf{y}_2\in\mathrm{dom}(\partial f^*)$，由 Thm 4.20 配合 $f$ proper/closed/凸得 $\mathbf{y}_1\in\partial f(\mathbf{v}_1)$；$f$ 可微故 $\mathbf{y}_1=\nabla f(\mathbf{v}_1)$（Thm 3.33）。用 Thm 5.8 的 (i)⇔(iv) 得 $\langle\mathbf{y}_1-\mathbf{y}_2,\mathbf{v}_1-\mathbf{v}_2\rangle\ge\sigma\|\mathbf{y}_1-\mathbf{y}_2\|_*^2$，由 Thm 5.24 的 (i)⇔(iii)（空间 $E^*$、范数 $\|\cdot\|_*$）推出 $f^*$ $\sigma$-强凸。**(b)** 由 Cor 4.21，$\partial f^*(\mathbf{y})=\mathrm{argmax}_{\mathbf{x}}\{\langle\mathbf{x},\mathbf{y}\rangle-f(\mathbf{x})\}$。$f$ 强凸+闭+Thm 5.25(a) $\implies$ argmax 唯一 $\implies$ $f^*$ 整空间可微（Thm 3.33）。取 $\mathbf{v}_1=\nabla f^*(\mathbf{y}_1)$，由共轭次梯度 $\mathbf{y}_1\in\partial f(\mathbf{v}_1)$；用 Thm 5.24 的 (i)⇔(iii) 得 $\langle\mathbf{y}_1-\mathbf{y}_2,\mathbf{v}_1-\mathbf{v}_2\rangle\ge\sigma\|\mathbf{v}_1-\mathbf{v}_2\|^2$。配广义 Cauchy–Schwarz 约去得 $\|\nabla f^*(\mathbf{y}_1)-\nabla f^*(\mathbf{y}_2)\|\le\frac1\sigma\|\mathbf{y}_1-\mathbf{y}_2\|_*$，即 $f^*$ $(1/\sigma)$-smooth。$\blacksquare$

## 5.3.2 Examples of Strongly Convex Functions

## 例 5.27 · 单位单纯形上的负熵

> **Example 5.27** (negative entropy over the unit simplex). $f(\mathbf{x})=\sum_i x_i\log x_i$ on $\Delta_n$ (else $\infty$). By Section 4.4.10 conjugate is log-sum-exp $f^*(\mathbf{y})=\log(\sum_i e^{y_i})$, which by Example 5.15 is 1-smooth w.r.t. both $\ell_\infty,\ell_2$. Hence by conjugate correspondence, $f$ is 1-strongly convex w.r.t. both $\ell_1$ and $\ell_2$.

**为什么漂亮**：负熵「自己长得怪」，但其共轭正是刚证过双重 1-smooth 的 log-sum-exp，共轭对应定理一键给出强凸性，免去直接算。也兑现 Rem 5.18 预告。

## 例 5.28 · 平方 $p$-范数，$p\in(1,2]$

> **Example 5.28** (squared $p$-norm for $p\in(1,2]$). $f(\mathbf{x}) = \tfrac12\|\mathbf{x}\|_p^2$. By Section 4.4.15, $f^*(\mathbf{y}) = \tfrac12\|\mathbf{y}\|_q^2$ ($1/p+1/q=1$). By Example 5.11, $f^*$ is $(q-1)$-smooth w.r.t. $\ell_q$, so by conjugate correspondence $f$ is $\frac{1}{q-1}$-strongly convex w.r.t. $\ell_p$. Since $\frac{1}{q-1}=p-1$, $f$ is $(p-1)$-strongly convex w.r.t. $\ell_p$.

**结论**：Ex 5.11 的「对偶版」——平方 $\ell_p$ 范数在 $p>2$ 时光滑参数 $p-1$，在 $p<2$ 时强凸参数 $p-1$。光滑与强凸在 $p$ 轴上镜像对称，正是共轭对应体现。

## 例 5.29 · $\ell_2$ 球罚函数 (ball-pen function)

> **Example 5.29** (l2 ball-pen function). $f(\mathbf{x}) = -\sqrt{1-\|\mathbf{x}\|_2^2}$ for $\|\mathbf{x}\|_2\le1$ (else $\infty$). By Section 4.4.13 conjugate is $f^*(\mathbf{y}) = \sqrt{\|\mathbf{y}\|_2^2+1}$, which by Example 5.14 is 1-smooth w.r.t. $\ell_2$. Hence by conjugate correspondence $f$ is 1-strongly convex w.r.t. $\ell_2$.

强凸函数汇总：

| $f(\mathbf{x})$ | $\mathrm{dom}$ | $\sigma$ | 范数 | 出处 |
| --- | --- | --- | --- | --- |
| $\tfrac12\mathbf{x}^T\mathbf{A}\mathbf{x}+\mathbf{b}^T\mathbf{x}+c$ ($\mathbf{A}\in\mathbb{S}^{n}_{++}$) | $\mathbb{R}^n$ | $\lambda_{\min}(\mathbf{A})$ | $\ell_2$ | Ex 5.19 |
| $\tfrac12\|\mathbf{x}\|^2+\delta_C(\mathbf{x})$ | $C$ | $1$ | Euclidean | Ex 5.21 |
| $-\sqrt{1-\|\mathbf{x}\|_2^2}$ | $B_{[\cdot]_2}[0,1]$ | $1$ | $\ell_2$ | Ex 5.29 |
| $\tfrac12\|\mathbf{x}\|_p^2$, $p\in(1,2]$ | $\mathbb{R}^n$ | $p-1$ | $\ell_p$ | Ex 5.28 |
| $\sum_i x_i\log x_i$ | $\Delta_n$ | $1$ | $\ell_2$ 或 $\ell_1$ | Ex 5.27 |

## 5.3.3 Smoothness and Differentiability of the Infimal Convolution

## 定理 5.30 · 下卷积的光滑性 (smoothness of the infimal convolution)

> **Theorem 5.30** (smoothness of the infimal convolution). $f$ proper closed convex, $\omega : \mathbb{E}\to\mathbb{R}$ $L$-smooth convex. Assume $f\square\omega$ is real-valued. Then:
> (a) $f\square\omega$ is $L$-smooth.
> (b) Let $\mathbf{u}(\mathbf{x})$ minimize $\min_{\mathbf{u}}\{f(\mathbf{u})+\omega(\mathbf{x}-\mathbf{u})\}$. Then $\nabla(f\square\omega)(\mathbf{x}) = \nabla\omega(\mathbf{x}-\mathbf{u}(\mathbf{x}))$.

**为什么是共轭对应的实战**：下卷积（Ch4 定义）是「两函数折积」式平滑（Moreau 包络、距离平方 $\phi_C$ 都是特例）。结果也被 $L$-smooth 且梯度显式可写——近端类算法可微性全靠它。**证明**：**(a)** 由 Thm 4.19，$(f\square\omega)^*=f^*+\omega^*$。$f,\omega$ proper closed convex $\implies f^*,\omega^*$ 也是（Thm 4.3/4.5）。共轭对应 (Thm 5.26) 给 $\omega^*$ $(1/L)$-强凸；Lem 5.20 给 $f^*+\omega^*$ $(1/L)$-强凸（闭函数和仍闭；Thm 4.16 配合 $f\square\omega$ proper convex 知 proper）。再用共轭对应 (b) 推回 $(f\square\omega)=(f^*+\omega^*)^*$ 是 $L$-smooth。**(b)** 设 $\mathbf{u}(\mathbf{x})$ 极小，记 $\mathbf{z}=\nabla\omega(\mathbf{x}-\mathbf{u})$。考察 $\varphi(\boldsymbol{\xi})=(f\square\omega)(\mathbf{x}+\boldsymbol{\xi})-(f\square\omega)(\mathbf{x})-\langle\boldsymbol{\xi},\mathbf{z}\rangle$。由上卷积定义 $\le\omega(\mathbf{x}+\boldsymbol{\xi}-\mathbf{u})-\omega(\mathbf{x}-\mathbf{u})-\langle\boldsymbol{\xi},\mathbf{z}\rangle\le\langle\boldsymbol{\xi},\nabla\omega(\mathbf{x}+\boldsymbol{\xi}-\mathbf{u})-\mathbf{z}\rangle\le\|\boldsymbol{\xi}\|\,\|\nabla\omega(\cdots)-\nabla\omega(\mathbf{x}-\mathbf{u})\|_*\le L\|\boldsymbol{\xi}\|^2$（上卷积定义、$\omega$ 梯度不等式、Cauchy–Schwarz、$L$-smooth）。还需 $\varphi(\boldsymbol{\xi})\ge-L\|\boldsymbol{\xi}\|^2$：$f\square\omega$ 凸 $\implies\varphi$ 凸且 $\varphi(0)=0\implies\varphi(\boldsymbol{\xi})\ge-\varphi(-\boldsymbol{\xi})\ge-L\|\boldsymbol{\xi}\|^2$。于是 $|\varphi(\boldsymbol{\xi})|\le L\|\boldsymbol{\xi}\|^2$，即 $\mathbf{z}$ 为梯度。$\blacksquare$

## 例 5.31 · 再证 $\tfrac12 d_C^2$ 的 1-光滑性（第二证法）

> **Example 5.31** (revisiting the 1-smoothness of $\tfrac12 d_C^2$). $\phi_C = \delta_C \square h$, $h(\mathbf{x})=\tfrac12\|\mathbf{x}\|^2$. Since $h$ is real-valued 1-smooth convex and $\delta_C$ proper closed convex, Theorem 5.30 implies $\phi_C$ is 1-smooth.

**为什么给第二证法**：Ex 5.5 用投影算子强非扩张硬算，这里用下卷积光滑性一行到位，殊途同归，验证 Thm 5.30 威力。代入 Thm 5.30(b) 还可得 $\nabla\phi_C(\mathbf{x})=\nabla h(\mathbf{x}-P_C(\mathbf{x}))=\mathbf{x}-P_C(\mathbf{x})$，与 Example 3.31 一致——前后呼应闭环。

---

**全章收束**：§5.1 用「梯度 Lipschitz」定义光滑性，配下降引理、五条等价刻画、二阶 Hessian 刻画；§5.2 用「凸 + 二次修正」定义强凸，配 Euclidean 刻画、一阶次梯度刻画、极小点唯一性；§5.3 用共轭对应定理把两者对偶，再一键生成一批强凸函数并证下卷积光滑性。记住两头两个量：$L$（扭曲上限）与 $\sigma$（平坦下限），其比值 $\kappa=L/\sigma$ 是下一章起所有一阶方法收敛速度的主角。
