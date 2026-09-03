---
blog: true
title: "Chapter 4-Conjugate Functions"
slug: "chapter-4-conjugate-functions-ugnf7dg"
summary: "共轭函数：把函数翻到对偶空间，得到永远凸闭的镜像；Fenchel 不等式、双共轭刻画闭凸函数、共轭运算律与下卷积对偶。"
date: 2026-09-03
category: "人工智能的优化方法"
featured: false
---

如果说 Chapter 2 把"集合"翻译成"函数"（示性函数），Chapter 3 把"凸"翻译成"上境图/次梯度"，那么 Chapter 4 干了一件更带劲的事：**把函数本身翻一个面，扔到对偶空间里再观察它**。这个翻面操作就是共轭（conjugacy）。

它的妙处后面会反复出现：原函数在自己空间里可能不凸、不闭、奇形怪状，但一旦取共轭，得到的 $f^*$ 是**无条件凸、无条件闭**的（Thm 4.3）。再翻一次面（双共轭 $f^{**}$）只在"原函数是正常闭凸"时才回到自己（Thm 4.8）。这一章是后面近端算子（Ch6 的 Moreau 分解）、Fenchel 对偶、各种一阶方法对偶推导的地基。**注**：Moreau 分解本身不在本章（在 Ch6），但本章的 Fenchel 不等式与双共轭已为它埋好钩子，相关处会顺手指路。

# 4.1 Definition and Basic Properties (定义与基本性质)

## Definition 4.1 · 共轭函数的定义

> **Definition 4.1** (conjugate functions). Let $f : \mathbb{E} \to [-\infty, \infty]$ be an extended real-valued function. The function $f^* : \mathbb{E}^* \to [-\infty, \infty]$, defined by
> $$f^*(\mathbf{y}) = \max_{\mathbf{x} \in \mathbb{E}} \bigl\{ \langle \mathbf{y}, \mathbf{x} \rangle - f(\mathbf{x}) \bigr\}, \quad \mathbf{y} \in \mathbb{E}^*,$$
> is called the **conjugate function** of $f$.

**逐字点评**：这一行是整章最核心的一行，读三遍：

- 对偶变量 $\mathbf{y}$ 是"价格向量"或"线性泛函"。给定 $\mathbf{y}$，共轭函数在问：**哪个 $\mathbf{x}$ 让"内积收益 $\langle \mathbf{y},\mathbf{x}\rangle$ 减去原函数值 $f(\mathbf{x})$"最大？** 这个最大盈余就是 $f^*(\mathbf{y})$。
- 注意是 $\max$（不是 $\sup$）。回到 Chapter 2 的注记——Beck 用 $\max/\min$ 但不保证极值真的取到，能取到才用等号。
- 共轭是函数关于原点的"勒让德式翻转"；只是 Beck 用 $\max$ 而非微分驻点（后者是经典 Legendre 变换，只适用于可微凸函数），共轭更一般。

**一个值得记住的细节**：定义里 $f$ 可取 $-\infty$，但 $f^*$ 几乎不出现 $-\infty$——Thm 4.5 会精确说明。

## Example 4.2 · 示性函数的共轭 = 支撑函数

> **Example 4.2** (conjugate of indicator functions). Let $f = \delta_C$, where $C \subseteq \mathbb{E}$ is nonempty. Then for any $\mathbf{y} \in \mathbb{E}^*$,
> $$f^*(\mathbf{y}) = \max_{\mathbf{x} \in \mathbb{E}} \bigl\{ \langle \mathbf{y}, \mathbf{x} \rangle - \delta_C(\mathbf{x}) \bigr\} = \max_{\mathbf{x} \in C} \langle \mathbf{y}, \mathbf{x} \rangle = \sigma_C(\mathbf{y}).$$
> That is, $\delta_C^* = \sigma_C$.

**为什么这一行最关键**：这正是 Chapter 2 埋的钩子兑现。Ch2 说示性函数 $\delta_C$ 把集合 $C$ 翻译成函数；现在它的共轭 $\delta_C^*$ 正好是 $C$ 的支撑函数 $\sigma_C$。示性函数与支撑函数是同一枚硬币两面，中间只隔一个共轭。**前向引用**：Example 4.9 会反着算 $\sigma_C^*$，把集合 $C$ 的"闭凸包"重新挖出；Ch2 支撑函数永闭性（Thm 2.7(c)）在此也可由 Thm 4.3（共轭永闭）直接得到，因为 $\sigma_C=\delta_C^*$ 是某函数的共轭。

## Theorem 4.3 · 共轭函数无条件凸、无条件闭

> **Theorem 4.3** (convexity and closedness of conjugate functions). Let $f : \mathbb{E} \to (-\infty, \infty]$ be an extended real-valued function. Then $f^*$ is **closed and convex**.

**证明（自己推）**。把 $f^*$ 看成一族关于 $\mathbf{y}$ 的函数的逐点最大值。固定 $\mathbf{x}_0$，定义 $\phi_{\mathbf{x}_0}(\mathbf{y}) = \langle \mathbf{y}, \mathbf{x}_0 \rangle - f(\mathbf{x}_0)$，这是关于 $\mathbf{y}$ 的仿射函数（既凸又闭）。于是
$$f^*(\mathbf{y}) = \max_{\mathbf{x} \in \mathbb{E}} \phi_{\mathbf{x}}(\mathbf{y}),$$
即 $f^*$ 是一族凸（且闭）函数的逐点最大。凸性引 Thm 2.16(c)，闭性引 Thm 2.7(c)（任意指标集），合起来 $f^*$ 闭且凸。$\blacksquare$

**结论**：本笔记全章最常被引用的"免费午餐"——**不需对 $f$ 做任何凸/闭假设**，镜像 $f^*$ 一律端正面目。

## Example 4.4 · $f(\mathbf{x}) = \tfrac{1}{2}\|\mathbf{x}\|^2 + \delta_C(\mathbf{x})$ 的共轭

> **Example 4.4** (conjugate of $\tfrac{1}{2}\|\cdot\|^2 + \delta_C$). Suppose $\mathbb{E}$ is Euclidean and $C \subseteq \mathbb{E}$ nonempty. Define $f(\mathbf{x}) = \tfrac{1}{2}\|\mathbf{x}\|^2 + \delta_C(\mathbf{x})$. Then
> $$f^*(\mathbf{y}) = \tfrac{1}{2}\|\mathbf{y}\|^2 - \tfrac{1}{2}d_C^2(\mathbf{y}).$$
> Note that while $f$ is convex only if $C$ is convex, the convexity of $f^*$ is guaranteed regardless.

**为什么这一行最关键**：这是"投影 + 共轭"第一次联手。由 Example 2.17（投影），最优 $\mathbf{x}$ 是 $C$ 中离 $\mathbf{y}$ 最近的投影点 $\mathbf{p} = \mathrm{Proj}_C(\mathbf{y})$，代入
$$\max_{\mathbf{x}\in C}\Bigl\{\langle \mathbf{y}, \mathbf{x}\rangle - \tfrac{1}{2}\|\mathbf{x}\|^2\Bigr\} = \langle \mathbf{y}, \mathbf{p}\rangle - \tfrac{1}{2}\|\mathbf{p}\|^2 = \tfrac{1}{2}\|\mathbf{y}\|^2 - \tfrac{1}{2}d_C^2(\mathbf{y}).$$
书里强调"$f$ 凸不凸取决于 $C$，但 $f^*$ 永远凸"——正是 Thm 4.3 的注脚。

## Theorem 4.5 · 正常凸函数的共轭仍然正常

> **Theorem 4.5** (properness of conjugate functions). Let $f : \mathbb{E} \to (-\infty, \infty]$ be a proper convex function. Then $f^*$ is proper.

**证明（自己推）**。proper = 不取 $-\infty$ 且定义域非空。

**第一步，证 $f^*(\mathbf{y}) > -\infty$ 对所有 $\mathbf{y}$**。因 $f$ proper，存在 $\hat{\mathbf{x}}$ 使 $f(\hat{\mathbf{x}}) < \infty$。由定义 $f^*(\mathbf{y}) \ge \langle \mathbf{y}, \hat{\mathbf{x}} \rangle - f(\hat{\mathbf{x}}) > -\infty$。

**第二步，找一个 $\mathbf{g}$ 使 $f^*(\mathbf{g}) < \infty$**。由 Cor 3.19（正常凸函数定义域内必有次梯度非空之点），取 $\mathbf{x} \in \mathrm{dom}(f)$ 使 $\partial f(\mathbf{x}) \ne \emptyset$，取 $\mathbf{g} \in \partial f(\mathbf{x})$。由次梯度定义 $f(\mathbf{z}) \ge f(\mathbf{x}) + \langle \mathbf{g}, \mathbf{z}-\mathbf{x} \rangle$，于是
$$f^*(\mathbf{g}) = \max_{\mathbf{z}} \bigl\{ \langle \mathbf{g}, \mathbf{z} \rangle - f(\mathbf{z}) \bigr\} \le \langle \mathbf{g}, \mathbf{x} \rangle - f(\mathbf{x}) < \infty.$$
两边有限，故 $f^*$ 正常。$\blacksquare$

**细节**：这步借用了 Ch3 的 Cor 3.19——整章建立在 Ch2（凸/闭）与 Ch3（次梯度）之上，不孤立。

## Theorem 4.6 · Fenchel 不等式

> **Theorem 4.6** (Fenchel's inequality). Let $f : \mathbb{E} \to (-\infty, \infty]$ be extended real-valued proper. Then for any $\mathbf{x} \in \mathbb{E}, \mathbf{y} \in \mathbb{E}^*$,
> $$f(\mathbf{x}) + f^*(\mathbf{y}) \ge \langle \mathbf{y}, \mathbf{x} \rangle.$$

**证明（自己推）**。由共轭定义 $f^*(\mathbf{y}) \ge \langle \mathbf{y}, \mathbf{x} \rangle - f(\mathbf{x})$。因 $f$ proper，$f(\mathbf{x})>-\infty$ 且 $f^*(\mathbf{y})>-\infty$（避免 $\infty-\infty$），两边加 $f(\mathbf{x})$ 即得。$\blacksquare$

**为什么这一行最关键**：Fenchel 不等式是整章"恒等式之母"：

- 它是 Thm 4.8（双共轭相等）证明里制造矛盾的那把刀；
- 它是 Thm 4.20（共轭次梯度定理）里"$\langle \mathbf{x},\mathbf{y}\rangle = f(\mathbf{x})+f^*(\mathbf{y})$"等号条件的来源；
- 它是 Ch6 Moreau 分解的远祖：Moreau 分解说到底来自 Fenchel 对偶与共轭的"平分"。

# 4.2 The Biconjugate (双共轭)

取两次共轭得 $f^{**}$；本书把 $\mathbb{E}^{**}$ 与 $\mathbb{E}$ 等同（有限维），故 $f^{**}$ 定义在原空间。

## Lemma 4.7 · 双共轭是原函数的下界

> **Lemma 4.7** ($f^{**} \le f$). Let $f : \mathbb{E} \to [-\infty, \infty]$ be extended real-valued. Then $f(\mathbf{x}) \ge f^{**}(\mathbf{x})$ for any $\mathbf{x} \in \mathbb{E}$.

**证明（自己推）**。由定义对任意 $\mathbf{x},\mathbf{y}$：$f^*(\mathbf{y}) \ge \langle \mathbf{y}, \mathbf{x} \rangle - f(\mathbf{x}) \iff f(\mathbf{x}) \ge \langle \mathbf{y}, \mathbf{x} \rangle - f^*(\mathbf{y})$。右边对 $\mathbf{y}$ 取最大值得 $f(\mathbf{x}) \ge f^{**}(\mathbf{x})$。$\blacksquare$

**结论**：$f^{**}$ 是原函数的一个**凸闭下包（convex closed envelope）**——把 $f$ 往下"拉平、拉闭"。下一定理说：若 $f$ 本就正常闭凸，这次拉平不会动它。

## Theorem 4.8 · 正常闭凸函数的双共轭等于自身

> **Theorem 4.8** ($f = f^{**}$ for proper closed convex functions). Let $f : \mathbb{E} \to (-\infty, \infty]$ be a proper closed and convex function. Then $f^{**} = f$.

**证明（骨架，用严格分离定理推，不照抄原证明长段）**。由 Lemma 4.7 已有 $f^{**} \le f$。只需证无 $\mathbf{x}$ 使 $f^{**}(\mathbf{x}) < f(\mathbf{x})$。

**反例假设**：存在 $\mathbf{x}$ 使 $f^{**}(\mathbf{x}) < f(\mathbf{x})$，即 $(\mathbf{x}, f^{**}(\mathbf{x})) \notin \mathrm{epi}(f)$。但 $f$ proper 闭凸 $\implies$ $\mathrm{epi}(f)$ 非空闭凸，用**严格分离定理（Thm 2.33）**得 $\mathbf{a}, b, c_1<c_2$ 使
$$\langle \mathbf{a}, \mathbf{z} \rangle + b s \le c_1 < c_2 \le \langle \mathbf{a}, \mathbf{x} \rangle + b\,f^{**}(\mathbf{x}), \quad \forall (\mathbf{z},s) \in \mathrm{epi}(f).$$
移项：对一切 $(\mathbf{z},s)\in\mathrm{epi}(f)$，
$$\langle \mathbf{a}, \mathbf{z}-\mathbf{x} \rangle + b\bigl(s - f^{**}(\mathbf{x})\bigr) \le c_1 - c_2 \equiv c < 0. \tag{4.2}$$

**判定 $b$ 符号**：若 $b>0$，固定 $\mathbf{z}$ 把 $s$ 取任意大，$(4.2)$ 左边 $\to+\infty$，矛盾，故 $b\le 0$。

**情形一 $b<0$**：$(4.2)$ 除以 $-b>0$，令 $\mathbf{y}=-\mathbf{a}/b$ 得
$$\langle \mathbf{y}, \mathbf{z}-\mathbf{x} \rangle - s + f^{**}(\mathbf{x}) \le \frac{c}{-b} < 0, \quad \forall (\mathbf{z},s)\in\mathrm{epi}(f).$$
取 $s=f(\mathbf{z})$（因 $(\mathbf{z},f(\mathbf{z}))\in\mathrm{epi}(f)$），对一切 $\mathbf{z}$ 有 $\langle \mathbf{y}, \mathbf{z}\rangle - f(\mathbf{z}) - \langle \mathbf{y}, \mathbf{x}\rangle + f^{**}(\mathbf{x}) \le c/(-b) < 0$。对 $\mathbf{z}$ 取最大值得 $f^*(\mathbf{y}) - \langle \mathbf{y},\mathbf{x}\rangle + f^{**}(\mathbf{x}) \le c/(-b) < 0$，即 $f^*(\mathbf{y})+f^{**}(\mathbf{x}) < \langle \mathbf{y},\mathbf{x}\rangle$，与 **Fenchel 不等式（Thm 4.6 应用于 $f^*$）** 矛盾。

**情形二 $b=0$**：除零会卡住。补救：取 $\hat{\mathbf{y}} \in \mathrm{dom}(f^*)$（存在性来自 Thm 4.5：$f^*$ proper），令 $\hat{\mathbf{a}} = \mathbf{a} + \varepsilon \hat{\mathbf{y}},\ \hat{b} = -\varepsilon$。代入 $(4.2)$ 并用 $f^*(\hat{\mathbf{y}}) = \max_{\mathbf{z}}\{\langle \hat{\mathbf{y}},\mathbf{z}\rangle - f(\mathbf{z})\}$ 放缩，得到 $\langle \hat{\mathbf{a}}, \mathbf{z}-\mathbf{x} \rangle + \hat{b}(f(\mathbf{z})-f^{**}(\mathbf{x})) \le \hat{c} < 0$，其中可挑 $\varepsilon>0$ 小使 $\hat{c}<0$。这回到**情形一结构**（系数 $\hat{b}<0$），同样除以 $-\hat{b}$ 令 $\tilde{\mathbf{y}}=-\hat{\mathbf{a}}/\hat{b}$，用 Fenchel 推出矛盾。

两情形皆矛盾，故 $f^{**}=f$。$\blacksquare$

**为什么这一行最关键**：这是共轭理论的"身份证"——正常闭凸函数在对偶空间走个来回原样回家；非凸非闭者会被修正成自己的凸闭下包 $f^{**}$。它也是一切"用对偶化简原问题"合法性的根源。

## Example 4.9 · 支撑函数的共轭 = 闭凸包的示性函数

> **Example 4.9** (conjugate of support functions). Let $C \subseteq \mathbb{E}$ be nonempty. Since $\mathrm{cl}(\mathrm{conv}(C))$ is closed and convex, $\delta_{\mathrm{cl}(\mathrm{conv}(C))}$ is closed and convex, and hence by Example 4.2 and Theorem 4.8,
> $$\sigma^*_{\mathrm{cl}(\mathrm{conv}(C))} = \bigl(\delta^*_{\mathrm{cl}(\mathrm{conv}(C))}\bigr)^* = \delta^{**}_{\mathrm{cl}(\mathrm{conv}(C))} = \delta_{\mathrm{cl}(\mathrm{conv}(C))}. \tag{4.4}$$
> By Lemma 2.35, $\sigma_C = \sigma_{\mathrm{cl}(\mathrm{conv}(C))}$, so
> $$\sigma^*_C = \delta_{\mathrm{cl}(\mathrm{conv}(C))}.$$

**逐字点评**：这是 Example 4.2 的"反函数"。$\delta_C^* = \sigma_C$，再取共轭 $\sigma_C^* = \delta_{\mathrm{cl}(\mathrm{conv}(C))}$。注意集合被"闭凸包"了一下——因为共轭永闭永凸（Thm 4.3+4.5），$\sigma_C^*$ 只能对应 $\mathrm{cl}(\mathrm{conv}(C))$ 的示性函数。这里还用了 Lemma 2.35：**支撑函数只认闭凸包**。

## Example 4.10 · 最大值函数的共轭 = 单纯形示性函数

> **Example 4.10** (conjugate of the max function). $f(\mathbf{x}) = \max\{x_1,\dots,x_n\} = \max_{\mathbf{y}\in\Delta_n}\mathbf{y}^T\mathbf{x} = \sigma_{\Delta_n}(\mathbf{x})$. Hence, using Example 4.9,
> $$f^* = \delta_{\Delta_n}.$$

**点评**：把坐标最大值写成"在单纯形上内积最大"就成了 $\Delta_n$ 的支撑函数；再 Example 4.9 得共轭为 $\delta_{\Delta_n}$（$\Delta_n$ 自己闭凸）。**最大值函数与单纯形示性函数互为共轭**。§4.4.11 的 log-sum-exp 再次用这条链路。

## Example 4.11 · $f(\mathbf{x}) = \tfrac{1}{2}\|\mathbf{x}\|^2 - \tfrac{1}{2}d_C^2(\mathbf{x})$ 的共轭

> **Example 4.11** (conjugate of $\tfrac{1}{2}\|\cdot\|^2 - \tfrac{1}{2}d_C^2$). Let $\mathbb{E}$ Euclidean, $C$ nonempty closed convex. Define $f(\mathbf{x}) = \tfrac{1}{2}\|\mathbf{x}\|^2 - \tfrac{1}{2}d_C^2(\mathbf{x})$. By Example 4.4, $f = g^*$, where $g(\mathbf{y}) = \tfrac{1}{2}\|\mathbf{y}\|^2 + \delta_C(\mathbf{y})$. Since $g$ is proper closed convex,
> $$f^*(\mathbf{y}) = g^{**}(\mathbf{y}) = g(\mathbf{y}) = \tfrac{1}{2}\|\mathbf{y}\|^2 + \delta_C(\mathbf{y}).$$

**为什么这一行最关键**：这是 Example 4.4 的"逆运算"。$g = \tfrac{1}{2}\|\cdot\|^2 + \delta_C$ 的共轭是 $\tfrac{1}{2}\|\cdot\|^2 - \tfrac{1}{2}d_C^2$；后者共轭又回 $g$（正常闭凸，Thm 4.8）。**这对"投影偶"正是 Ch6 Moreau 分解里近端算子 $\mathrm{prox}_f$ 与 $\mathrm{prox}_{f^*}$ 关系的雏形。** 记牢：

| 函数 | 共轭 |
| --- | --- |
| $\tfrac{1}{2}\|\cdot\|^2 + \delta_C$ | $\tfrac{1}{2}\|\cdot\|^2 - \tfrac{1}{2}d_C^2$ |
| $\tfrac{1}{2}\|\cdot\|^2 - \tfrac{1}{2}d_C^2$ | $\tfrac{1}{2}\|\cdot\|^2 + \delta_C$ |

# 4.3 Conjugate Calculus Rules (共轭运算律)

## Theorem 4.12 · 可分离函数的共轭 = 各分量共轭之和

> **Theorem 4.12** (conjugate of separable functions). $g(\mathbf{x}_1,\dots,\mathbf{x}_p) = \sum_{i=1}^{p} f_i(\mathbf{x}_i)$ (each $f_i$ proper). Then
> $$g^*(\mathbf{y}_1,\dots,\mathbf{y}_p) = \sum_{i=1}^{p} f_i^*(\mathbf{y}_i).$$

**证明（自己推）**。乘积空间内积拆开，各 $\mathbf{x}_i$ 独立，联合最大等于逐分量最大之和：
$$g^* = \max_{\mathbf{x}_1,\dots,\mathbf{x}_p} \sum_{i=1}^p \bigl\{\langle \mathbf{y}_i,\mathbf{x}_i\rangle - f_i(\mathbf{x}_i)\bigr\} = \sum_{i=1}^p \max_{\mathbf{x}_i}\{\langle \mathbf{y}_i,\mathbf{x}_i\rangle - f_i(\mathbf{x}_i)\} = \sum_{i=1}^p f_i^*(\mathbf{y}_i).$$
$\blacksquare$

## Theorem 4.13 · 仿射变量替换 + 加仿射项的共轭

> **Theorem 4.13** (conjugate of $f(A(\mathbf{x}-\mathbf{a})) + \langle \mathbf{b}, \mathbf{x} \rangle + c$). Let $A : \mathbb{V} \to \mathbb{E}$ be invertible linear, $\mathbf{a} \in \mathbb{V}, \mathbf{b} \in \mathbb{V}^*, c \in \mathbb{R}$. For
> $$g(\mathbf{x}) = f(A(\mathbf{x}-\mathbf{a})) + \langle \mathbf{b}, \mathbf{x} \rangle + c,$$
> $$g^*(\mathbf{y}) = f^*\bigl( (A^T)^{-1}(\mathbf{y}-\mathbf{b}) \bigr) + \langle \mathbf{a}, \mathbf{y} \rangle - c - \langle \mathbf{a}, \mathbf{b} \rangle, \quad \mathbf{y} \in \mathbb{V}^*.$$

**证明（自己推）**。换元 $\mathbf{z}=A(\mathbf{x}-\mathbf{a})$，即 $\mathbf{x}=A^{-1}\mathbf{z}+\mathbf{a}$：
$$\begin{aligned}
g^*(\mathbf{y}) &= \max_{\mathbf{z}} \bigl\{ \langle \mathbf{y}, A^{-1}\mathbf{z}+\mathbf{a} \rangle - f(\mathbf{z}) - \langle \mathbf{b}, A^{-1}\mathbf{z}+\mathbf{a} \rangle - c \bigr\} \\
&= \max_{\mathbf{z}} \bigl\{ \langle \mathbf{y}-\mathbf{b}, A^{-1}\mathbf{z} \rangle - f(\mathbf{z}) \bigr\} + \langle \mathbf{a}, \mathbf{y} \rangle - \langle \mathbf{a}, \mathbf{b} \rangle - c.
\end{aligned}$$
内积转置 $\langle \mathbf{y}-\mathbf{b}, A^{-1}\mathbf{z}\rangle = \langle (A^{-1})^T(\mathbf{y}-\mathbf{b}), \mathbf{z}\rangle$，且 $(A^{-1})^T=(A^T)^{-1}$，故第一项等于 $f^*((A^T)^{-1}(\mathbf{y}-\mathbf{b}))$。$\blacksquare$

**细节**：$A$ 必须可逆——否则换元非双射，共轭定义域会塌缩（对比 §4.4.7 PSD 二次型的正则情形）。

## Theorem 4.14 · 数乘与伸缩的共轭

> **Theorem 4.14** (conjugate of $\alpha f(\cdot)$ and $\alpha f(\cdot/\alpha)$). Let $\alpha \in \mathbb{R}_{++}$.
> (a) $g(\mathbf{x}) = \alpha f(\mathbf{x}) \implies g^*(\mathbf{y}) = \alpha f^*(\mathbf{y}/\alpha)$.
> (b) $h(\mathbf{x}) = \alpha f(\mathbf{x}/\alpha) \implies h^*(\mathbf{y}) = \alpha f^*(\mathbf{y})$.

**证明（自己推）**。(a) $g^*(\mathbf{y}) = \max_{\mathbf{x}}\{\langle \mathbf{y},\mathbf{x}\rangle - \alpha f(\mathbf{x})\} = \alpha\max_{\mathbf{x}}\{\langle \mathbf{y}/\alpha,\mathbf{x}\rangle - f(\mathbf{x})\} = \alpha f^*(\mathbf{y}/\alpha)$。(b) 令 $\mathbf{z}=\mathbf{x}/\alpha$：
$$h^*(\mathbf{y}) = \max_{\mathbf{x}} \bigl\{ \langle \mathbf{y},\mathbf{x}\rangle - \alpha f(\mathbf{x}/\alpha) \bigr\} = \max_{\mathbf{z}} \bigl\{ \alpha\langle \mathbf{y},\mathbf{z}\rangle - \alpha f(\mathbf{z}) \bigr\} = \alpha f^*(\mathbf{y}).$$
$\blacksquare$

### 四条运算律汇总表

| 原函数 $g(\mathbf{x})$ | 共轭 $g^*(\mathbf{y})$ | 出处 |
| --- | --- | --- |
| $\sum_{i=1}^p f_i(\mathbf{x}_i)$ | $\sum_{i=1}^p f_i^*(\mathbf{y}_i)$ | Thm 4.12 |
| $\alpha f(\mathbf{x})$ ($\alpha>0$) | $\alpha f^*(\mathbf{y}/\alpha)$ | Thm 4.14 |
| $\alpha f(\mathbf{x}/\alpha)$ ($\alpha>0$) | $\alpha f^*(\mathbf{y})$ | Thm 4.14 |
| $f(A(\mathbf{x}-\mathbf{a})) + \langle \mathbf{b}, \mathbf{x} \rangle + c$ | $f^*((A^T)^{-1}(\mathbf{y}-\mathbf{b})) + \langle \mathbf{a}, \mathbf{y} \rangle - c - \langle \mathbf{a}, \mathbf{b} \rangle$ | Thm 4.13 |

# 4.4 Examples (例集)

本节是"共轭函数计算大典"，把 §4.3 法则在经典凸函数上练手。§4.4.16 有汇总表。

## 4.4.1 Exponent · $f(x)=e^x$

$f^*(y)=\max_x\{xy-e^x\}$。$y<0$ 时 $x\to-\infty$ 值 $\to\infty$；$y=0$ 时最优值 $0$（不取到）；$y>0$ 驻点 $\tilde{x}=\log y$。采用 $0\log 0\equiv 0$：
$$f^*(y) = \begin{cases} y\log y - y, & y\ge 0, \\ \infty, & \text{else}. \end{cases}$$
**点评**：指数共轭是熵函数，定义域掐在 $\mathbb{R}_+$，是 §4.4.8 一维原型。

## 4.4.2 Negative Log · $f(x)=-\log x\ (x>0)$

$f^*(y)=\max_{x>0}\{xy+\log x\}$。$y\ge 0$ 时 $x\to\infty$ 值 $\to\infty$；$y<0$ 驻点 $\tilde{x}=-1/y$，值 $-1-\log(-y)$：
$$f^*(y) = \begin{cases} -1-\log(-y), & y<0, \\ \infty, & y\ge 0. \end{cases}$$

## 4.4.3 Hinge Loss · $f(x)=\max\{1-x,0\}$

$f^*(y)=\max_x\min\{(1+y)x-1,\ yx\}$。分段线性：左段斜率 $1+y$、右段斜率 $y$。要存在最大值须 $1+y\ge 0$ 且 $y\le 0$，即 $y\in[-1,0]$，此时在 $x=1$ 取到值 $y$：
$$f^*(y) = y + \delta_{[-1,0]}(y).$$
**点评**：hinge loss 共轭是"带示性帽子的最大值"，只在 $[-1,0]$ 取 $y$——SVM 对偶里会出现。

## 4.4.4 $\tfrac{1}{p}|x|^p$ ($p>1$)

驻点满足 $y-\mathrm{sgn}(\tilde{x})|\tilde{x}|^{p-1}=0$，故 $\tilde{x}=\mathrm{sgn}(y)|y|^{1/(p-1)}$，代入：
$$f^*(y) = \Bigl(1-\tfrac{1}{p}\Bigr)|y|^{p/(p-1)} = \tfrac{1}{q}|y|^q, \quad \tfrac{1}{p}+\tfrac{1}{q}=1.$$
**点评**：$p$ 与 $q$ 共轭指数互取共轭，$\tfrac{1}{p}|x|^p$ 与 $\tfrac{1}{q}|y|^q$ 互为共轭（Young 不等式的共轭版）。

## 4.4.5 $-\tfrac{x^p}{p}$ ($0<p<1,\ x\ge 0$)

$f(x)=-x^p/p\ (x\ge 0)$ 其余 $\infty$。$y\ge 0$ 时值 $\to\infty$；$y<0$ 驻点 $\tilde{x}=(-y)^{1/(p-1)}>0$，值 $-(-y)^q/q$（$q<0$ 且 $\tfrac{1}{p}+\tfrac{1}{q}=1$）：
$$f^*(y) = \begin{cases} -(-y)^q/q, & y<0, \\ \infty, & \text{else}. \end{cases}$$

## 4.4.6 Strictly Convex Quadratic · $A\succ 0$

$f(\mathbf{x})=\tfrac{1}{2}\mathbf{x}^T A\mathbf{x}+\mathbf{b}^T\mathbf{x}+c$，$A\in\mathbb{S}_{++}^n$。驻点 $\mathbf{x}=A^{-1}(\mathbf{y}-\mathbf{b})$，代入：
$$f^*(\mathbf{y}) = \tfrac{1}{2}(\mathbf{y}-\mathbf{b})^T A^{-1}(\mathbf{y}-\mathbf{b}) - c.$$

## 4.4.7 Convex Quadratic · $A\succeq 0$

$A\in\mathbb{S}_+^n$。驻点条件 $A\mathbf{x}=\mathbf{y}-\mathbf{b}$ 有解当且仅当 $\mathbf{y}\in\mathbf{b}+\mathrm{Range}(A)$。取 $\tilde{\mathbf{x}}=A^\dagger(\mathbf{y}-\mathbf{b})$，利用 $A^\dagger A A^\dagger=A^\dagger$ 得
$$f^*(\mathbf{y}) = \begin{cases} \tfrac{1}{2}(\mathbf{y}-\mathbf{b})^T A^\dagger(\mathbf{y}-\mathbf{b}) - c, & \mathbf{y}\in\mathbf{b}+\mathrm{Range}(A), \\ \infty, & \text{else}. \end{cases}$$
**点评**：半正定时共轭定义域塌成仿射子空间 $\mathbf{b}+\mathrm{Range}(A)$——Fenchel 等号可达成域的体现。

## 4.4.8 Negative Entropy · $f(\mathbf{x})=\sum x_i\log x_i\ (x\ge 0)$

可分离，标量 $g(t)=t\log t$ 驻点 $t=e^{s-1}$，共轭 $g^*(s)=e^{s-1}$。由 Thm 4.12：
$$f^*(\mathbf{y}) = \sum_{i=1}^n e^{y_i-1}.$$

## 4.4.9 Negative Sum of Logs · $f(\mathbf{x})=-\sum\log x_i\ (x>0)$

每个 $g(t)=-\log t$，由 §4.4.2 $g^*(y)=-1-\log(-y)\ (y<0)$。叠加：
$$f^*(\mathbf{y}) = \begin{cases} -n - \sum_{i=1}^n \log(-y_i), & \mathbf{y}<0\ (\text{分量均负}), \\ \infty, & \text{else}. \end{cases}$$

## 4.4.10 Negative Entropy over the Unit Simplex

$f(\mathbf{x})=\sum x_i\log x_i$ 约束 $\mathbf{x}\in\Delta_n$。由 Example 3.71（熵投影）最优 $x_i^*=e^{y_i}/\sum_j e^{y_j}$，最优值
$$f^*(\mathbf{y}) = \log\Bigl(\sum_{j=1}^n e^{y_j}\Bigr).$$
**点评**：单纯形上负熵的共轭 = **log-sum-exp**，正是下一节起点。

## 4.4.11 log-sum-exp

$g(\mathbf{x})=\log(\sum e^{x_i})$。由 §4.4.10 $g=f^*$（$f$ 为单纯形负熵），$f$ 正常闭凸 $\implies$ Thm 4.8 给 $g^*=f^{**}=f$：
$$g^*(\mathbf{y}) = \begin{cases} \sum_{i=1}^n y_i\log y_i, & \mathbf{y}\in\Delta_n, \\ \infty, & \text{else}. \end{cases}$$
**点评**：log-sum-exp 与单纯形负熵互为共轭——深度学习 softmax 熵对偶的经典结论。**前向钩子**：这对共轭在 Ch10+ 平滑化（用 log-sum-exp 逼近 max）是核心工具。

## 4.4.12 Norms · $f(\mathbf{x})=\|\mathbf{x}\|$

由 Example 2.31 $f=\sigma_{B_{\|\cdot\|^*}[0,1]}$（双对偶范数 $\|\cdot\|^{**}=\|\cdot\|$）。由 Example 4.9：
$$f^*(\mathbf{y}) = \delta_{B_{\|\cdot\|^*}[0,1]}(\mathbf{y}) = \begin{cases} 0, & \|\mathbf{y}\|_*\le 1, \\ \infty, & \text{else}. \end{cases}$$
**点评**：范数共轭是对偶单位球的示性函数。§4.6（Ex 4.22）拿它算 $\partial\|\cdot\|(0)$。

## 4.4.13 Ball-Pen · $f(\mathbf{x})=-\sqrt{1-\|\mathbf{x}\|^2}\ (\|\mathbf{x}\|\le 1)$

$$f^*(\mathbf{y}) = \max_{\alpha\in[0,1]}\bigl\{ \alpha\|\mathbf{y}\|_* + \sqrt{1-\alpha^2} \bigr\}.$$
驻点 $\tilde{\alpha}=\|\mathbf{y}\|_*/\sqrt{\|\mathbf{y}\|_*^2+1}$，代入得
$$f^*(\mathbf{y}) = \sqrt{\|\mathbf{y}\|_*^2+1}.$$
推广 $f_\alpha(\mathbf{x})=-\sqrt{\alpha^2-\|\mathbf{x}\|^2}\ (\|\mathbf{x}\|\le\alpha)$：因 $f_\alpha(\mathbf{x})=\alpha f(\mathbf{x}/\alpha)$，Thm 4.14(b) 给
$$f_\alpha^*(\mathbf{y}) = \alpha\sqrt{1+\|\mathbf{y}\|_*^2}.$$

## 4.4.14 $\sqrt{\alpha^2+\|\mathbf{x}\|^2}$ ($\alpha>0$)

$g_\alpha(\mathbf{x})=\sqrt{\alpha^2+\|\mathbf{x}\|^2}=\alpha g(\mathbf{x}/\alpha)$，$g(\mathbf{x})=\sqrt{1+\|\mathbf{x}\|^2}$。§4.4.13 中 $g=f^*$（$f(\mathbf{y})=-\sqrt{1-\|\mathbf{y}\|_*^2}$ for $\|\mathbf{y}\|_*\le 1$），$f$ 正常闭凸 $\implies g^*=f^{**}=f$。Thm 4.14(b)：
$$g_\alpha^*(\mathbf{y}) = \alpha f(\mathbf{y}) = \begin{cases} -\alpha\sqrt{1-\|\mathbf{y}\|_*^2}, & \|\mathbf{y}\|_*\le 1, \\ \infty, & \text{else}. \end{cases}$$

## 4.4.15 Squared Norm · $f(\mathbf{x})=\tfrac{1}{2}\|\mathbf{x}\|^2$

$$f^*(\mathbf{y}) = \max_{\alpha\ge 0}\bigl\{ \alpha\|\mathbf{y}\|_* - \tfrac{1}{2}\alpha^2 \bigr\} = \tfrac{1}{2}\|\mathbf{y}\|_*^2.$$
**点评**：最干净共轭对——平方范数与（对偶）平方范数互为共轭（系数 $1/2$ 对称）。这是近端梯度里"proximal of squared norm = identity"的根据。

## 4.4.16 Summary of Conjugate Computations (共轭计算汇总表)

| $f(\mathbf{x})$ | $\mathrm{dom}(f)$ | $f^*(\mathbf{y})$ | 假设 |
| --- | --- | --- | --- |
| $e^x$ | $\mathbb{R}$ | $y\log y - y$ ($\mathrm{dom}=\mathbb{R}_+$) | — |
| $-\log x$ | $\mathbb{R}_{++}$ | $-1-\log(-y)$ ($\mathrm{dom}=\mathbb{R}_{--}$) | — |
| $\max\{1-x,0\}$ | $\mathbb{R}$ | $y+\delta_{[-1,0]}(y)$ | — |
| $\tfrac{1}{p}\|x\|^p$ | $\mathbb{R}$ | $\tfrac{1}{q}\|y\|^q$ | $p>1,\ \tfrac1p+\tfrac1q=1$ |
| $-x^p/p$ | $\mathbb{R}_+$ | $-(-y)^q/q$ ($\mathrm{dom}=\mathbb{R}_{--}$) | $0<p<1,\ \tfrac1p+\tfrac1q=1$ |
| $\tfrac12\mathbf{x}^T A\mathbf{x}+\mathbf{b}^T\mathbf{x}+c$ | $\mathbb{R}^n$ | $\tfrac12(\mathbf{y}-\mathbf{b})^T A^{-1}(\mathbf{y}-\mathbf{b})-c$ | $A\succ 0$ |
| 同上 | $\mathbb{R}^n$ | $\tfrac12(\mathbf{y}-\mathbf{b})^T A^\dagger(\mathbf{y}-\mathbf{b})-c$ | $A\succeq 0,\ \mathrm{dom}=\mathbf{b}+\mathrm{Range}(A)$ |
| $\sum x_i\log x_i$ | $\mathbb{R}^n_+$ | $\sum e^{y_i-1}$ | — |
| $\sum x_i\log x_i$ | $\Delta_n$ | $\log(\sum e^{y_i})$ | — |
| $-\sum\log x_i$ | $\mathbb{R}^n_{++}$ | $-n-\sum\log(-y_i)$ ($\mathrm{dom}=\mathbb{R}^n_{--}$) | — |
| $\log(\sum e^{x_i})$ | $\mathbb{R}^n$ | $\sum y_i\log y_i$ ($\mathrm{dom}=\Delta_n$) | — |
| $\delta_C(\mathbf{x})$ | $C$ | $\sigma_C(\mathbf{y})$ | $\emptyset\ne C$ |
| $\sigma_C(\mathbf{x})$ | $\mathrm{dom}(\sigma_C)$ | $\delta_{\mathrm{cl}(\mathrm{conv}(C))}(\mathbf{y})$ | $\emptyset\ne C$ |
| $\|\mathbf{x}\|$ | $\mathbb{E}$ | $\delta_{B_{\|\cdot\|^*}[0,1]}(\mathbf{y})$ | — |
| $-\sqrt{\alpha^2-\|\mathbf{x}\|^2}$ | $B[0,\alpha]$ | $\alpha\sqrt{\|\mathbf{y}\|_*^2+1}$ | $\alpha>0$ |
| $\sqrt{\alpha^2+\|\mathbf{x}\|^2}$ | $\mathbb{E}$ | $-\alpha\sqrt{1-\|\mathbf{y}\|_*^2}$ ($\mathrm{dom}=B_{\|\cdot\|^*}[0,1]$) | $\alpha>0$ |
| $\tfrac12\|\mathbf{x}\|^2$ | $\mathbb{E}$ | $\tfrac12\|\mathbf{y}\|_*^2$ | — |
| $\tfrac12\|\mathbf{x}\|^2+\delta_C(\mathbf{x})$ | $C$ | $\tfrac12\|\mathbf{y}\|^2-\tfrac12 d_C^2(\mathbf{y})$ | $\emptyset\ne C$, Euclidean |
| $\tfrac12\|\mathbf{x}\|^2-\tfrac12 d_C^2(\mathbf{x})$ | $\mathbb{E}$ | $\tfrac12\|\mathbf{y}\|^2+\delta_C(\mathbf{y})$ | $\emptyset\ne C$ closed convex, Euclidean |

## 4.4.17 Fenchel's Duality Theorem (Fenchel 对偶定理)

> **Theorem 4.15** (Fenchel's duality theorem). Let $f,g : \mathbb{E} \to (-\infty, \infty]$ be proper convex. If $\mathrm{ri}(\mathrm{dom}(f)) \cap \mathrm{ri}(\mathrm{dom}(g)) \ne \emptyset$, then
> $$\min_{\mathbf{x}} \{f(\mathbf{x})+g(\mathbf{x})\} = \max_{\mathbf{y}} \{-f^*(\mathbf{y}) - g^*(-\mathbf{y})\},$$
> and the maximum is attained whenever finite.

**推导（自己推）**。原问题 $(P)\ \min_{\mathbf{x}}f(\mathbf{x})+g(\mathbf{x})$ 改写为 $\min_{\mathbf{x},\mathbf{z}}\{f(\mathbf{x})+g(\mathbf{z}):\mathbf{x}=\mathbf{z}\}$。Lagrangian：
$$L(\mathbf{x},\mathbf{z};\mathbf{y}) = f(\mathbf{x})+g(\mathbf{z})+\langle \mathbf{y},\mathbf{z}-\mathbf{x}\rangle = -[\langle \mathbf{y},\mathbf{x}\rangle - f(\mathbf{x})] - [\langle -\mathbf{y},\mathbf{z}\rangle - g(\mathbf{z})].$$
对偶目标 $q(\mathbf{y}) = \min_{\mathbf{x},\mathbf{z}} L = -f^*(\mathbf{y}) - g^*(-\mathbf{y})$，得 Fenchel 对偶 $(D)$。强对偶在相对内部相交条件下成立（相对 interior，Ch3，比"定义域相交"弱得多）。$\blacksquare$

**结论**：Fenchel 对偶把"两函数和最小化"翻成"共轭之差最大化"，统摄后面一堆具体对偶（LASSO、SVM 对偶）。**前向钩子**：强对偶 + 共轭次梯度定理（§4.6）是证明 KKT/最优性条件的标准武器。

# 4.5 Infimal Convolution and Conjugacy (下卷积与共轭)

下卷积 $(h_1 \square h_2)(\mathbf{x}) = \min_{\mathbf{u}}\{h_1(\mathbf{u})+h_2(\mathbf{x}-\mathbf{u})\}$。本节：**加法与下卷积在共轭下互为对偶**。

## Theorem 4.16 · 下卷积的共轭 = 共轭之和

> **Theorem 4.16** (conjugate of infimal convolution). For two proper functions $h_1, h_2$,
> $$(h_1 \square h_2)^* = h_1^* + h_2^*.$$

**证明（自己推）**。
$$\begin{aligned}
(h_1 \square h_2)^*(\mathbf{y}) &= \max_{\mathbf{x}} \max_{\mathbf{u}} \bigl\{ \langle \mathbf{y}, \mathbf{x} \rangle - h_1(\mathbf{u}) - h_2(\mathbf{x}-\mathbf{u}) \bigr\} \\
&= \max_{\mathbf{u},\mathbf{x}} \bigl\{ \langle \mathbf{y}, \mathbf{x}-\mathbf{u} \rangle + \langle \mathbf{y}, \mathbf{u} \rangle - h_1(\mathbf{u}) - h_2(\mathbf{x}-\mathbf{u}) \bigr\} \\
&= \max_{\mathbf{u}} \{\langle \mathbf{y}, \mathbf{u} \rangle - h_1(\mathbf{u})\} + \max_{\mathbf{v}} \{\langle \mathbf{y}, \mathbf{v} \rangle - h_2(\mathbf{v})\} \quad (\mathbf{v}=\mathbf{x}-\mathbf{u}) \\
&= h_1^*(\mathbf{y}) + h_2^*(\mathbf{y}).
\end{aligned}$$
$\blacksquare$

**为何关键**：这条只需 properness，不要求凸，和 Fenchel 不等式一样"便宜"。

## Theorem 4.17 · 和的共轭 = 共轭的下卷积

> **Theorem 4.17** (conjugate of sum). Let $h_1$ proper convex, $h_2 : \mathbb{E} \to \mathbb{R}$ real-valued convex. Then
> $$(h_1 + h_2)^* = h_1^* \square h_2^*.$$

**证明（自己推，用 Fenchel 对偶）**。$(h_1+h_2)^*(\mathbf{y}) = -\min_{\mathbf{x}}\{h_1(\mathbf{x})+g(\mathbf{x})\}$，其中 $g(\mathbf{x})=h_2(\mathbf{x})-\langle \mathbf{y},\mathbf{x}\rangle$。因 $h_2$ 处处有限，$\mathrm{ri}(\mathrm{dom}(h_1))\cap\mathrm{ri}(\mathrm{dom}(g))=\mathrm{ri}(\mathrm{dom}(h_1))\ne\emptyset$。引用 Thm 4.15：
$$\min_{\mathbf{x}}\{h_1(\mathbf{x})+g(\mathbf{x})\} = \max_{\mathbf{z}}\{-h_1^*(\mathbf{z})-g^*(-\mathbf{z})\}.$$
而 $g^*(\mathbf{w})=h_2^*(\mathbf{y}+\mathbf{w})$，故 $g^*(-\mathbf{z})=h_2^*(\mathbf{y}-\mathbf{z})$。于是
$$(h_1+h_2)^*(\mathbf{y}) = \min_{\mathbf{z}}\{h_1^*(\mathbf{z})+h_2^*(\mathbf{y}-\mathbf{z})\} = (h_1^* \square h_2^*)(\mathbf{y}).$$
$\blacksquare$

**点评**：这条比 4.16 深——需凸性 + 一个函数处处有限（保相对内部相交）才能用 Fenchel 对偶把 min 翻 max。

## Corollary 4.18 · 和 = 共轭下卷积再共轭

> **Corollary 4.18.** Let $h_1$ proper closed convex, $h_2$ real-valued convex. Then
> $$h_1 + h_2 = (h_1^* \square h_2^*)^*.$$

**证明（自己推）**。$h_1+h_2$ proper，且 Thm 2.7(b) 保证它闭（两项、其中 $h_2$ 连续故闭）。由 Thm 4.8 $(h_1+h_2)^{**}=h_1+h_2$；Thm 4.17 给 $(h_1+h_2)^*=h_1^*\square h_2^*$，再取共轭即得。$\blacksquare$

## Theorem 4.19 · 下卷积的共轭表示

> **Theorem 4.19** (representation of the infimal convolution by conjugates). Let $h_1$ proper convex, $h_2$ real-valued convex, and suppose $h_1 \square h_2$ is real-valued. Then
> $$h_1 \square h_2 = (h_1^* + h_2^*)^*. \tag{4.14}$$

**证明（自己推）**。Thm 4.16 给 $(h_1\square h_2)^* = h_1^*+h_2^*$。$h_1$ proper 凸、$h_2$ 实值凸 $\implies$ Thm 2.19 知 $h_1\square h_2$ 凸，且实值 $\implies$ proper 闭。Thm 4.8 给 $(h_1\square h_2)^{**}=h_1\square h_2$，对上式取共轭即得 $(4.14)$。$\blacksquare$

**点评**：Thm 4.16 与 4.19 互逆——下卷积与加法在共轭下对偶。这正是 **Moreau 分解的代数骨架**：Ch6 的 $\mathbf{x}=\mathrm{prox}_f(\mathbf{x})+\mathrm{prox}_{f^*}(\mathbf{x})$ 本质就是这对共轭关系的几何化。本章未直接讲 Moreau 分解，钩子已埋。

# 4.6 Subdifferentials of Conjugate Functions (共轭的次微分)

本节把共轭与 Ch3 次微分焊在一起，得"共轭次梯度定理"。

## Theorem 4.20 · 共轭次梯度定理

> **Theorem 4.20** (conjugate subgradient theorem). Let $f$ proper convex. For any $\mathbf{x}, \mathbf{y}$:
> (i) $\langle \mathbf{x}, \mathbf{y} \rangle = f(\mathbf{x}) + f^*(\mathbf{y})$;
> (ii) $\mathbf{y} \in \partial f(\mathbf{x})$.
> If in addition $f$ is closed, (i),(ii) equivalent to
> (iii) $\mathbf{x} \in \partial f^*(\mathbf{y})$.

**证明（自己推）**。(ii) $\iff$ (i)：$\mathbf{y}\in\partial f(\mathbf{x}) \iff f(\mathbf{z})\ge f(\mathbf{x})+\langle \mathbf{y},\mathbf{z}-\mathbf{x}\rangle\ \forall\mathbf{z} \iff \langle \mathbf{y},\mathbf{x}\rangle-f(\mathbf{x})\ge \langle \mathbf{y},\mathbf{z}\rangle-f(\mathbf{z})\ \forall\mathbf{z}$。对 $\mathbf{z}$ 取最大值得 $\langle \mathbf{y},\mathbf{x}\rangle-f(\mathbf{x})\ge f^*(\mathbf{y})$，即 $f(\mathbf{x})+f^*(\mathbf{y})\ge\langle \mathbf{x},\mathbf{y}\rangle$；Fenchel 给反向下界，故等号 ⟺ (i)。

若 $f$ 还闭，$f^{**}=f$（Thm 4.8），(i) 即 $\langle \mathbf{x},\mathbf{y}\rangle=f^*(\mathbf{y})+f^{**}(\mathbf{x})$。把等价关系用于 $g=f^*$（proper 凸），得 $\mathbf{x}\in\partial g(\mathbf{y})=\partial f^*(\mathbf{y})$ ⟺ (iii)。$\blacksquare$

**为何关键**：把"次梯度""共轭""Fenchel 等号"三件事拧成一股。口诀：**$\mathbf{y}\in\partial f(\mathbf{x})$ 当且仅当 $\mathbf{x}$ 是共轭最大化问题 $\max_{\tilde{\mathbf{x}}}\{\langle \mathbf{y},\tilde{\mathbf{x}}\rangle-f(\tilde{\mathbf{x}})\}$ 的解（且等号成立）。**

## Corollary 4.21 · 共轭次梯度定理（第二形式）

> **Corollary 4.21.** Let $f$ proper closed convex. Then for any $\mathbf{x}, \mathbf{y}$,
> $$\partial f(\mathbf{x}) = \operatorname{argmax}_{\tilde{\mathbf{y}}} \{\langle \mathbf{x}, \tilde{\mathbf{y}} \rangle - f^*(\tilde{\mathbf{y}})\}, \qquad \partial f^*(\mathbf{y}) = \operatorname{argmax}_{\tilde{\mathbf{x}}} \{\langle \mathbf{y}, \tilde{\mathbf{x}} \rangle - f(\tilde{\mathbf{x}})\}.$$
> In particular, $\partial f(\mathbf{0}) = \operatorname{argmin}_{\mathbf{y}} f^*(\mathbf{y}),\quad \partial f^*(\mathbf{0}) = \operatorname{argmin}_{\mathbf{x}} f(\mathbf{x})$.

**点评**：特别地，$\partial f(\mathbf{0})$ 等于 $f^*$ 的**最小值点集**，$\partial f^*(\mathbf{0})$ 等于 $f$ 的**最小值点集**。这一对"取零次梯度=最小化共轭/原函数"被 Thm 4.23 与 Ch5–Ch6 反复用。

## Example 4.22 · $\partial\|\cdot\|(0) =$ 对偶单位球

$f(\mathbf{x})=\|\mathbf{x}\|$ 正常闭凸，§4.4.12 给 $f^*=\delta_{B_{\|\cdot\|^*}[0,1]}$。由 Cor 4.21：
$$\partial f(\mathbf{0}) = \operatorname{argmin}_{\mathbf{y}} \delta_{B_{\|\cdot\|^*}[0,1]}(\mathbf{y}) = B_{\|\cdot\|^*}[0,1].$$
与 Example 3.3 一致（当时用次梯度定义直接算）。**点评**：同一结论，这里三行拿下——展示共轭次梯度定理的省力。

## Theorem 4.23 · Lipschitz 连续 $\iff$ 共轭定义域有界

> **Theorem 4.23** (Lipschitz continuity and boundedness of the domain of the conjugate). Let $f : \mathbb{E} \to \mathbb{R}$ be convex. For $L>0$ the following are equivalent:
> (i) $|f(\mathbf{x})-f(\mathbf{y})| \le L\|\mathbf{x}-\mathbf{y}\|$ for any $\mathbf{x},\mathbf{y}$;
> (ii) $\|\mathbf{g}\|_* \le L$ for any $\mathbf{g} \in \partial f(\mathbf{x}),\ \mathbf{x} \in \mathbb{E}$;
> (iii) $\mathrm{dom}(f^*) \subseteq B_{\|\cdot\|^*}[0, L]$.

**证明（自己推）**。(i)$\iff$(ii) 来自 Thm 3.61（Ch3 已证 Lipschitz $\iff$ 次梯度范数有界）。

**(iii) $\implies$ (ii)**：Cor 4.21 给 $\partial f(\mathbf{x})=\operatorname{argmax}_{\mathbf{y}}\{\langle \mathbf{x},\mathbf{y}\rangle-f^*(\mathbf{y})\}$，故 $\partial f(\mathbf{x})\subseteq\mathrm{dom}(f^*)$。若 (iii) 则每个次梯度 $\|\mathbf{g}\|_*\le L$。

**(i) $\implies$ (iii)**：设 $f$ Lipschitz 常数 $L$，则 $f(\mathbf{x})-f(\mathbf{0})\le L\|\mathbf{x}\|$，即 $-f(\mathbf{x})\ge -f(\mathbf{0})-L\|\mathbf{x}\|$。对任意 $\tilde{\mathbf{y}}$：
$$f^*(\tilde{\mathbf{y}}) \ge \max_{\mathbf{x}} \{\langle \mathbf{x}, \tilde{\mathbf{y}} \rangle - f(\mathbf{0}) - L\|\mathbf{x}\|\}.$$
取 $\tilde{\mathbf{y}}$ 使 $\|\tilde{\mathbf{y}}\|_*>L$。由对偶范数定义，存在 $\mathbf{y}^\dagger$ 满足 $\|\mathbf{y}^\dagger\|=1$ 且 $\langle \tilde{\mathbf{y}}, \mathbf{y}^\dagger\rangle=\|\tilde{\mathbf{y}}\|_*$。在射线 $C=\{\alpha\mathbf{y}^\dagger:\alpha\ge 0\}$ 上：
$$f^*(\tilde{\mathbf{y}}) \ge \max_{\alpha\ge 0}\{\alpha\|\tilde{\mathbf{y}}\|_* - f(\mathbf{0}) - L\alpha\} = \max_{\alpha\ge 0}\{\alpha(\|\tilde{\mathbf{y}}\|_* - L) - f(\mathbf{0})\} = \infty,$$
因 $\|\tilde{\mathbf{y}}\|_* - L > 0$。故 $\tilde{\mathbf{y}}\notin\mathrm{dom}(f^*)$，即 $\mathrm{dom}(f^*)\subseteq B[0,L]$。$\blacksquare$

**为何关键**：把"函数全局 Lipschitz"翻译成"共轭定义域被装进对偶单位球"。统一前面例子——§4.4.12 范数共轭定义域恰是单位球（对应范数全局 1-Lipschitz）；§4.4.6 严格凸二次型共轭定义域全空间（对应二次型非全局 Lipschitz）。**这是整章漂亮收尾：共轭把光滑性/正则性编码进自己定义域的形状。**

---

## 全章回顾（一页速记）

- **共轭定义**：$f^*(\mathbf{y}) = \max_{\mathbf{x}}\{\langle \mathbf{y},\mathbf{x}\rangle - f(\mathbf{x})\}$——永远凸闭（Thm 4.3），正常凸则正常（Thm 4.5）。
- **Fenchel 不等式**：$f(\mathbf{x})+f^*(\mathbf{y}) \ge \langle \mathbf{y},\mathbf{x}\rangle$（Thm 4.6）——等号即共轭对。
- **双共轭**：$f^{**}\le f$（Lemma 4.7）；正常闭凸则 $f^{**}=f$（Thm 4.8）。
- **运算律**：可分离之和（4.12）、仿射变换（4.13）、数乘/伸缩（4.14）。
- **对偶**：下卷积 $\square$ 与加法在共轭下互换（4.16/4.17/4.19）；Fenchel 对偶（4.15）。
- **次梯度**：共轭次梯度定理（4.20/4.21）——$\mathbf{y}\in\partial f(\mathbf{x}) \iff \langle\mathbf{x},\mathbf{y}\rangle=f(\mathbf{x})+f^*(\mathbf{y}) \iff \mathbf{x}\in\partial f^*(\mathbf{y})$；Lipschitz $\iff$ $\mathrm{dom}(f^*)$ 有界（4.23）。

**最该带走的一句话**：共轭是"把函数扔进对偶空间照镜子"——镜中像无条件凸闭，只有原函数自身正常闭凸时镜子才不扭曲它。这张镜像网，是后面近端算子（Ch6 的 Moreau 分解）、Fenchel 对偶与一阶方法对偶推导的全部地基。
