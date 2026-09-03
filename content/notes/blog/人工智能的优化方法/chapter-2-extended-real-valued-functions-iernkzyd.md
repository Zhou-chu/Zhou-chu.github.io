---
blog: true
title: "Chapter 2-Extended Real-Valued Functions"
slug: "chapter-2-extended-real-valued-functions-iernkzyd"
summary: "扩展实值函数与闭性：把实数扩充上 ∞ 与 −∞，讨论有效定义域、示性函数等凸分析的基础对象。"
date: 2026-08-30
category: "人工智能的优化方法"
featured: false
---

在本书中，我们的underlying spaces都是**有限维**的、存在内积和范数的空间
# 2.1 Extended Real-Valued Functions and Closedness
+ 我们考虑在实数 $\mathbb{R}$ 的基础上，扩充引入 $\infty$ 和 $-\infty$，它们有这样的运算律
+ ![](/obsidian-assets/cee2f054e19670ce.png)
+ 直觉上，其中唯一“不自然”的就是这个 $0\cdot \infty=0$ ，但是在我们讨论的范围呢，这个定义是符合一致性的。我们还有：$$\infty>a(-\infty\leq a<\infty),-\infty<a(-\infty<a\leq \infty)$$
+ 对扩展实值函数 $f : \mathbb{E} \to [-\infty, \infty]$，其**有效定义域**（effective domain），简称**定义域**，是
$$\mathrm{dom}(f) = \{\mathbf{x} \in \mathbb{E} : f(\mathbf{x}) < \infty\}.$$
+ **符号约定的两个细微处**（书中随即说明）：
	- "$f : \mathbb{E} \to [-\infty, \infty]$" 仅表示 $f$ 允许取到 $\pm\infty$（扩展实值），**不**保证真的取到；
	- "$f : \mathbb{E} \to (-\infty, \infty]$" 表示 $f$ 是扩展实值的**且**不再取 $-\infty$（但仍可取 $+\infty$）。
## 例 2.1 · 示性函数
最简单也最重要的扩展实值函数是**示性函数**。
> **例 2.1**（示性函数 indicator functions）。对任意子集 $C \subseteq \mathbb{E}$，集合 $C$ 的示性函数定义为如下扩展实值函数：

> $\delta_C(\mathbf{x}) = \begin{cases} 0, & \mathbf{x} \in C, \\ \infty, & \mathbf{x} \notin C. \end{cases}$
显然
$$\mathrm{dom}(\delta_C) = C.$$
**为什么这一行最关键**：书的下一句几乎没强调，但它值得记一辈子——
**$\delta_C$ 把集合 $C$ "原样"翻译成函数**。$\mathrm{dom}$ 的等号左是函数 $\delta_C$，等号右是集合 $C$。$C$ 不闭？$\delta_C$ 不闭。$C$ 凸？$\delta_C$ 凸。$C$ 的任何结构，都一一对应到 $\delta_C$ 的结构上。
这是为什么最优化的核心手段是"用函数做约束"——因为**集合论和函数论是同一件事的两套语法**。
## Epigraph · 上境图
为了把"函数性质"翻译成"集合性质"，引入一个比"定义域"更重要的概念。
> 扩展实值函数 $f : \mathbb{E} \to [-\infty, \infty]$ 的**上境图**（epigraph）定义为

> $\mathrm{epi}(f) = \{ (\mathbf{x}, y) : f(\mathbf{x}) \le y,\ \mathbf{x} \in \mathbb{E},\ y \in \mathbb{R} \}.$
**两点容易混的细节**：
- 上境图是 $\mathbb{E} \times \mathbb{R}$ 的子集——纵轴是 $y$（实数），不是别的；
- 若 $(\mathbf{x}, y) \in \mathrm{epi}(f)$，则显然 $\mathbf{x} \in \mathrm{dom}(f)$（因为 $f(\mathbf{x}) \le y$ 是有限实数，所以 $f(\mathbf{x}) < \infty$）。
**几何直观**：把函数图像（$f$ 在 $\mathbb{E}$ 上方）"灌满"——点 $(\mathbf{x}, y)$ 在图像**正上方**就算入。$\delta_C$ 的图像是 $C$ 上"高度为 0"的水平面，往上无限延伸，所以 $\mathrm{epi}(\delta_C)$ 是一个**没有顶盖的"屋顶"**——下一节会算出它的精确形状。
## Proper · 正常函数
> 函数 $f : \mathbb{E} \to [-\infty, \infty]$ 称为 **proper**（正常），如果：
> 1. 它**不**取 $-\infty$；
> 2. 存在至少一个 $\mathbf{x} \in \mathbb{E}$ 使 $f(\mathbf{x}) < \infty$，即 $\mathrm{dom}(f)$ 非空。
**为什么需要"正常"这个条件**？把两条分开看：
- 不取 $-\infty$：如果函数能取 $-\infty$，那 $\inf f = -\infty$，最优化问题从一开始就是退化的。排除这种情况，才能谈"最优值有限"；
- 定义域非空：不然连"在哪里最小"都没意义。
**一个有用的等价说法**：proper = "这个函数值得被优化"。
注意 proper **不**要求 $\mathrm{dom}$ 闭——这一点下一节会埋下一颗反例种子。
> **作者注**："The notion of closedness will play an important role in much of the analysis in this book."
> 闭性将在本书很多分析中扮演重要角色。
——这是 Beck 在埋钩子。后面会知道为什么。
## 定义 2.2 · 闭函数
> **定义 2.2**（闭函数 closed functions）。函数 $f : \mathbb{E} \to [-\infty, \infty]$ 称为**闭的**，如果其**上境图 $\mathrm{epi}(f)$ 是闭的**。
只有一行，但这是整章最核心的一句话。**用集合性质定义函数性质**——之后我们讨论函数"闭"、"凸"、"可微"时，都可以先把它翻译成 $\mathrm{epi}(f)$ 的某种集合性质，再利用成熟的集合论工具来研究。
这种"翻译"的全名是 **epigraph 技巧**，是本书证明方法论的脊梁之一（见核心知识库 T1）。
**把开页的两个概念焊在一起的命题**：
> **命题 2.3**（闭集合示性函数的闭性 closedness of indicators of closed sets）。示性函数 $\delta_C$ 闭，**当且仅当** $C$ 是闭集。
**证明**. $\delta_C$ 的上境图是
$\mathrm{epi}(\delta_C) = \{ (\mathbf{x}, y) \in \mathbb{E} \times \mathbb{R} : \delta_C(\mathbf{x}) \le y \} = C \times \mathbb{R}_+,$
其中 $\mathbb{R}_+ = \{y \in \mathbb{R} : y \ge 0\}$。上式显然闭当且仅当 $C$ 闭。$\blacksquare$
**逐字点评**：
- "$C \times \mathbb{R}_+$"：外积，集合 $C$ 配上半直线 $\mathbb{R}_+$。几何上是一个**没有顶盖的半无限长方体**——横向是 $C$ 的形状，纵向是 $y \ge 0$ 的全部；
- "$C \times \mathbb{R}_+$ 闭 $\iff$ $C$ 闭"：因为 $\mathbb{R}_+$ 闭（标准实数结论），两个闭集的外积闭。这是集合论的基本事实；
- 证明只有一行——这就是把 $\delta_C$ 的闭性问题"还原"成 $C$ 的闭性问题的**力量**。没有 epigraph 翻译，你得去证"$f$ 的图像之上没有漏掉任何极限点"——而那要复杂得多。
**Prop 2.3 的两个直接推论**：
1. **闭的 $\delta_C$ 必然定义域是闭集**。因为 $\mathrm{dom}(\delta_C) = C$，所以 $C$ 闭，定义域就闭。
2. **但反过来不成立**——闭函数的定义域一般不必闭。这是个反直觉的事实，作者明确预告"下一节会给一个经典反例"。
## 例 2.4 · $f(x) = 1/x$（说明闭函数的定义域一般不必闭）
> **例 2.4.** 考虑函数 $f : \mathbb{R} \to [-\infty, \infty]$，定义为

> $f(x) = \begin{cases} \dfrac{1}{x}, & x > 0, \\ \infty, & \text{else}. \end{cases}$

> 该函数的定义域是开区间 $(0, \infty)$，显然**不是闭集**；但这个函数**是闭的**，因为它的上境图

> $\mathrm{epi}(f) = \{(x, y) : xy \ge 1,\ x > 0\}$

> 是闭集。见图 2.1。
> 		![](/obsidian-assets/ec99054d59f5c2dd.png)
### 上境图这个式子是怎么来的
按定义逐点代：
$\mathrm{epi}(f) = \{(x, y) : f(x) \le y,\ x \in \mathbb{R},\ y \in \mathbb{R}\}$
分两种情况讨论：
- **$x > 0$ 时**：$f(x) = 1/x$，条件是 $1/x \le y$。因为 $x > 0$，两边同乘 $x$ 不变号，得 $xy \ge 1$；
- **$x \le 0$ 时**：$f(x) = \infty$，条件是 $\infty \le y$——对任何实数 $y$ 都不成立，所以**竖线 $x \le 0$ 上没有任何点进入上境图**。
合起来就是 $\mathrm{epi}(f) = \{(x, y) : xy \ge 1,\ x > 0\}$。
### 为什么它是闭集
书上只说「显然是闭集」，但值得自己走一遍，因为这是本书第一次用到「取列 + 看极限点」的论证。
取 $\mathrm{epi}(f)$ 中任意收敛序列 $(x_n, y_n) \to (x^*, y^*)$，其中 $x_n > 0$ 且 $x_n y_n \ge 1$。要证 $(x^*, y^*) \in \mathrm{epi}(f)$，即证 $x^* > 0$ 且 $x^* y^* \ge 1$。
**第一步，证 $x^* > 0$。**
因为每个 $x_n > 0$，所以 $x^* \ge 0$。假设 $x^* = 0$，即 $x_n \to 0^+$。由 $x_n y_n \ge 1$ 得
$y_n \ge \dfrac{1}{x_n} \to +\infty,$
于是 $y_n \to +\infty$，与 $y_n \to y^*$（有限实数）矛盾。故 $x^* \ne 0$，结合 $x^* \ge 0$ 得 $x^* > 0$。
**第二步，证 $x^* y^* \ge 1$。**
$(x_n, y_n) \to (x^*, y^*)$ 且乘法连续，故 $x_n y_n \to x^* y^*$。又每个 $x_n y_n \ge 1$，数列极限保序性给出 $x^* y^* \ge 1$。
两步合起来，$(x^*, y^*) \in \mathrm{epi}(f)$。$\blacksquare$
**几何直觉**：当 $x \to 0^+$ 时 $f(x) \to +\infty$，图像「往无穷高跑了」。所以上境图虽然在直线 $x = 0$ 上方「断掉」，但**没有任何极限点落在那条线上**——想靠近它就得爬到无穷高，而 $y$ 坐标必须是有限实数，爬不上去。
**这就是整个反例的核心**：定义域的「缺口」被函数值在该处爆到 $+\infty$ 给「补」上了。上境图没有漏，所以函数闭。
## 定义 2.5 · 下半连续
> **定义 2.5**（下半连续性 lower semicontinuity）。称函数 $f : \mathbb{E} \to [-\infty, \infty]$ 在点 $\mathbf{x} \in \mathbb{E}$ **下半连续**，如果
> $$f(\mathbf{x}) \le \liminf_{n \to \infty} f(\mathbf{x}_n)$$
> 对任意满足 $\mathbf{x}_n \to \mathbf{x}\ (n \to \infty)$ 的序列 $\{\mathbf{x}_n\}_{n \ge 1} \subseteq \mathbb{E}$ 成立。称 $f$ 下半连续，如果它在 $\mathbb{E}$ 中每一点都下半连续。即要求 $f(x)$ 小于等于这个序列的下极限

这也就是说，**下半连续性**要求函数可以连续、可以不连续且有向下的突变，但是**不允许不连续且有向上的突变**，即任何一个函数的断裂处，断裂位置自己的取值一定是突变的较小的那个值，这个位置出发向左向右走一个小量，都只会使得值不变小
### 和上境图的联系（提前剧透）
「向上凸起」为什么不被允许？因为那会在上境图上戳出一个**不闭合的缺口**。
仍用上面的反例：$f(0) = 1$，$f(x) = 0\ (x \ne 0)$。则
- 点 $(0,\ 0.5) \notin \mathrm{epi}(f)$，因为 $f(0) = 1 > 0.5$；
- 但 $(1/n,\ 0.5) \in \mathrm{epi}(f)$ 对所有 $n$ 成立，因为 $f(1/n) = 0 \le 0.5$；
- 而 $(1/n,\ 0.5) \to (0,\ 0.5)$。
$(0, 0.5)$ 是上境图的极限点却不在上境图里 ⟹ 上境图不闭。
### 一个技术注记
定义是用**序列**写的，不是用邻域/开集写的。在有限维空间（本书的全部设定）里，序列刻画与拓扑刻画完全等价，因为有限维空间是第一可数的。到了无穷维的一般拓扑空间，序列就不够用了，得换成网（net）或邻域基——**本书不涉及**，可以不管。

---
## 水平集
> 对任意 $\alpha \in \mathbb{R}$，函数 $f : \mathbb{E} \to [-\infty, \infty]$ 的 $\alpha$-**水平集**（level set）是集合

> $\mathrm{Lev}(f, \alpha) = \{\mathbf{x} \in \mathbb{E} : f(\mathbf{x}) \le \alpha\}.$

**注意是 $\le$，不是 $\ge$**。这是**下**水平集（sublevel set），不是上水平集。
这个方向的选择不是随便的：我们做的是**最小化**，关心的是「函数值不超过某个门槛的点有哪些」。换句话说，水平集是等高线**及以内**的区域。后面 Weierstrass 定理、强制性、次水平集有界性，全部建立在这个方向上。

---
## Thm 2.6
书页 15 结尾预告了一个定理，说「闭性、下半连续、所有水平集闭」三者等价。书页 16 就是这个定理——**Thm 2.6**，全章的枢纽。
它值得单独一页不只是因为它**核心**，更因为它的**证明结构**是一个漂亮的三向循环，每一环用到的论证技巧都不同：序列放缩、取极限在集合内、最后那个最微妙的**反证 + 子列**。
### 定理陈述
> **定理 2.6**（闭性、下半连续、水平集闭的等价性）。设 $f : \mathbb{E} \to [-\infty, \infty]$。则以下三条等价：
> (i) $f$ 下半连续；
> (ii) $f$ 闭（即 $\mathrm{epi}(f)$ 闭）；
> (iii) 对任意 $\alpha \in \mathbb{R}$，水平集 $\mathrm{Lev}(f, \alpha) = \{\mathbf{x} \in \mathbb{E} : f(\mathbf{x}) \le \alpha\}$ 闭。

它给了你**三种武器**证明「$f$ 是闭的」——挑最好用的那个：

| 武器                         | 视角   | 适合场合                                                                        |
| -------------------------- | ---- | --------------------------------------------------------------------------- |
| (ii) 证 $\mathrm{epi}(f)$ 闭 | 几何   | $f$ 的结构允许直接刻画上境图时（例 2.4 用的就是）                                               |
| (i) 证下半连续                  | 序列分析 | 想用「取列 + liminf」的套路时                                                         |
| (iii) 证所有水平集闭              | 集合论  | $f$ 的水平集一眼就闭时（**书页 19 的 $\ell_0$ 范数用的就是这个**——$\ell_0$ 的 epi 难直接证闭，但水平集一眼就闭） |

读这本书遇到「证 $f$ 闭」时，**先停下来问一句：哪种武器最快？** 不要无脑去证 epi 闭。
### 证明：三个方向
#### 方向 1：(i) ⇒ (ii) · 序列放缩
> 假设 $f$ 下半连续。要证 $\mathrm{epi}(f)$ 闭。
取 $\mathrm{epi}(f)$ 中任意收敛序列 $(\mathbf{x}_n, y_n) \to (\mathbf{x}^*, y^*)$。要证 $(\mathbf{x}^*, y^*) \in \mathrm{epi}(f)$，即 $f(\mathbf{x}^*) \le y^*$。
由定义，$f(\mathbf{x}_n) \le y_n$ 对所有 $n$ 成立。
由下半连续（注意「$\le$」+ liminf 这个配方）：
$f(\mathbf{x}^*) \le \liminf_{n \to \infty} f(\mathbf{x}_n) \le \liminf_{n \to \infty} y_n = y^*.$
第一步用了 $f$ 在 $\mathbf{x}^*$ 处下半连续，第二步用了 $f(\mathbf{x}_n) \le y_n$ 取 liminf 保序，第三步用了 $y_n \to y^*$。
得 $(\mathbf{x}^*, y^*) \in \mathrm{epi}(f)$，所以 $\mathrm{epi}(f)$ 闭。$\blacksquare$
**这一招就是「T2 序列 + liminf 技巧」**。后面证明里还会再出现几次。
#### 方向 2：(ii) ⇒ (iii) · 极限点留在集合内
> 假设 $\mathrm{epi}(f)$ 闭。要证每个 $\mathrm{Lev}(f, \alpha)$ 闭（$\alpha \in \mathbb{R}$ 任意）。
若 $\mathrm{Lev}(f, \alpha) = \emptyset$，自然是闭的。否则取序列 $\{\mathbf{x}_n\}_{n \ge 1} \subseteq \mathrm{Lev}(f, \alpha)$ 收敛到某 $\bar{\mathbf{x}}$。
关键观察：$f(\mathbf{x}_n) \le \alpha$ 意味着 $(\mathbf{x}_n, \alpha) \in \mathrm{epi}(f)$。
由 $\mathrm{epi}(f)$ 闭，且 $(\mathbf{x}_n, \alpha) \to (\bar{\mathbf{x}}, \alpha)$，得 $(\bar{\mathbf{x}}, \alpha) \in \mathrm{epi}(f)$，即 $f(\bar{\mathbf{x}}) \le \alpha$，即 $\bar{\mathbf{x}} \in \mathrm{Lev}(f, \alpha)$。
所以 $\mathrm{Lev}(f, \alpha)$ 闭。$\blacksquare$

**这一招把「水平集闭」翻译成「epi 闭」**：水平集的元素配上坐标 $\alpha$ 就变成了 epi 里的点。这是个**降维**操作——在 epi 这个 $\mathbb{E} \times \mathbb{R}$ 的子集上看问题。
#### 方向 3：(iii) ⇒ (i) · 反证 + 子列（最微妙的一步）
> 假设所有 $\mathrm{Lev}(f, \alpha)$ 闭。要证 $f$ 下半连续。

用反证法。假设 $f$ 在某点 $\mathbf{x}^*$ 处不 lsc，那就存在序列 $\mathbf{x}_n \to \mathbf{x}^*$，使
$\liminf_{n \to \infty} f(\mathbf{x}_n) < f(\mathbf{x}^*).$
**取 $\alpha$ 卡在中间**（式 2.1）：
$\liminf_{n \to \infty} f(\mathbf{x}_n) < \alpha < f(\mathbf{x}^*).$
> 这样一个 $\alpha$ **一定存在**：因为开区间 $(\liminf f(\mathbf{x}_n),\ f(\mathbf{x}^*))$ 不空。
由 $\liminf$ 的定义，存在子列 $\{f(\mathbf{x}_{n_k})\}_{k \ge 1}$ 满足 $f(\mathbf{x}_{n_k}) \le \alpha$ 对所有 $k$——
> 这就是「liminf 必取得到」的形式：$\liminf = \lim_{n \to \infty} \inf_{k \ge n} a_k$。因为这个下降极限的极限 $\le$ 它的每一项（用 $\inf$ 的下界），所以存在子列每项都 $\le$ 这个下极限的任意上界 $\alpha$。
——**这一步必须用子列**。全序列不一定每项都 $\le \alpha$，但一定能挑出子列每项都 $\le \alpha$。
于是 $\mathbf{x}_{n_k} \in \mathrm{Lev}(f, \alpha)$ 对所有 $k$ 成立，且 $\mathbf{x}_{n_k} \to \mathbf{x}^*$。
由 $\mathrm{Lev}(f, \alpha)$ 闭，得 $\mathbf{x}^* \in \mathrm{Lev}(f, \alpha)$，即 $f(\mathbf{x}^*) \le \alpha$。
**但这与 (2.1) 中 $\alpha < f(\mathbf{x}^*)$ 矛盾。**
所以 $f$ 必然下半连续。$\blacksquare$

---
#### 三向循环的总结

| 方向           | 思路                    | 关键工具           |
| ------------ | --------------------- | -------------- |
| (i) ⇒ (ii)   | 取列放缩到 $y^*$           | liminf 保序      |
| (ii) ⇒ (iii) | 水平集元素配 $\alpha$ 进 epi | 闭集对极限点封闭       |
| (iii) ⇒ (i)  | 反证 + 卡 $\alpha$ + 子列  | $\liminf$ 必取得到 |
**一个值得记住的细节**：三向循环不是「必然」——证明方向的选择有讲究。前两方向是「自然的」（顺着定义推），第三个是「反过来的」（反证 + 找一个具体的 $\alpha$ 切断）。这种「三向循环，最后一个用反证」的模式，在后面 Thm 2.7 保闭运算、Lem 2.34 等地方会再出现。
### 注记 1：作者对 max/min 用法的提醒
定理 2.6 证明之后，作者专门加了一段：
> 在本书中我们不用 $\inf$/$\sup$ 记号，而只用 $\min$/$\max$，**且 $\min$/$\max$ 的使用不意味着极值能取到**。
翻译：以后看到 $\min_x f(x)$ 不要自动假设它能取到最小值（可能只 inf 但不 min）。**这条提醒对后面 Thm 2.12 Weierstrass 极为重要**——那个定理就是说：在什么条件下「min」能真正取到。

## Thm2.7： **闭函数经过几种常见运算后，什么时候仍然闭？**
定理 2.7 给出三种保闭运算：

$$
\boxed{
\begin{aligned}
\text{(a)}\quad &g(\mathbf{x})=f(A\mathbf{x}+\mathbf{b}),\\
\text{(b)}\quad &f(\mathbf{x})=\sum_{i=1}^m\alpha_i f_i(\mathbf{x}),\\
\text{(c)}\quad &f(\mathbf{x})=\max_{i\in I}f_i(\mathbf{x}).
\end{aligned}}
$$

其中，(b) 要求有限项、$\alpha_i\ge0$；(c) 的指标集 $I$ 可以是任意集合，甚至不可数。
### 证明：
#### 1. (a) 仿射复合保持闭性
设

$$
g(\mathbf{x})=f(A\mathbf{x}+\mathbf{b}),
$$

其中 $A:\mathbb{E}\to\mathbb{V}$ 是线性变换，$\mathbf{b}\in\mathbb{V}$。
证明的关键不是直接研究 $g$，而是把 $g$ 的上境图翻译成 $f$ 的上境图：
$$
(\mathbf{x},y)\in\operatorname{epi}(g)
\iff
g(\mathbf{x})\le y
\iff
f(A\mathbf{x}+\mathbf{b})\le y
$$

也就是
$$
(\mathbf{x},y)\in\operatorname{epi}(g)
\iff
(A\mathbf{x}+\mathbf{b},y)\in\operatorname{epi}(f).
$$

现在取
$$
(\mathbf{x}_n,y_n)\in\operatorname{epi}(g),
\qquad
(\mathbf{x}_n,y_n)\to(\mathbf{x}^*,y^*).
$$

因为每个 $(\mathbf{x}_n,y_n)$ 都在 $\operatorname{epi}(g)$ 中，所以
$$
(A\mathbf{x}_n+\mathbf{b},y_n)\in\operatorname{epi}(f).
$$

又因为有限维空间中的线性变换连续，
$$
A\mathbf{x}_n+\mathbf{b}
\to
A\mathbf{x}^*+\mathbf{b}.
$$

而 $f$ 是闭函数，所以 $\operatorname{epi}(f)$ 闭，极限点必须仍然属于它：
$$
(A\mathbf{x}^*+\mathbf{b},y^*)\in\operatorname{epi}(f).
$$
因此
$$
f(A\mathbf{x}^*+\mathbf{b})\le y^*,
$$
即
$$
(\mathbf{x}^*,y^*)\in\operatorname{epi}(g).
$$
所以 $g$ 闭。
**用到了哪一假设：**
- $f$ 闭：保证 $\operatorname{epi}(f)$ 含有极限点；
- $A$ 线性：在有限维空间中保证 $A$ 连续；
- $\mathbf{b}$：只是平移，不会破坏连续性。
所以 (a) 的真正骨架是：
$$
\text{闭函数}
\xrightarrow{\text{连续仿射变换}}
\text{仍然闭}.
$$
严格说，证明中真正需要的是映射连续；线性只是一个方便而强的充分条件。
#### 2. (b) 有限非负线性组合保持闭性
现在有 $m$ 个闭函数 $f_1,\ldots,f_m$，以及非负系数

$$
\alpha_i\ge0.
$$

定义

$$
f(\mathbf{x})=\sum_{i=1}^m\alpha_i f_i(\mathbf{x}).
$$

这次作者没有直接研究 $\operatorname{epi}(f)$，而是切换到 Thm 2.6：

$$
\text{闭}
\iff
\text{下半连续}.
$$

取任意序列 $\mathbf{x}_n\to\mathbf{x}^*$。由于每个 $f_i$ 都闭，也都下半连续，所以

$$
f_i(\mathbf{x}^*)
\le
\liminf_{n\to\infty}f_i(\mathbf{x}_n).
$$

乘以 $\alpha_i\ge0$：

$$
\alpha_i f_i(\mathbf{x}^*)
\le
\liminf_{n\to\infty}
\alpha_i f_i(\mathbf{x}_n).
$$

然后对有限个 $i$ 求和，得到

$$
\left(\sum_{i=1}^m\alpha_i f_i\right)(\mathbf{x}^*)
\le
\sum_{i=1}^m
\liminf_{n\to\infty}
\alpha_i f_i(\mathbf{x}_n).
$$

接下来使用有限个序列的 liminf 次可加性：

$$
\sum_{i=1}^m
\liminf_{n\to\infty}a_{i,n}
\le
\liminf_{n\to\infty}
\sum_{i=1}^m a_{i,n}.
$$

于是

$$
\left(\sum_{i=1}^m\alpha_i f_i\right)(\mathbf{x}^*)
\le
\liminf_{n\to\infty}
\left(\sum_{i=1}^m\alpha_i f_i\right)(\mathbf{x}_n).
$$

这正是 $f$ 下半连续的定义，因此 $f$ 闭。
**这里有三个假设不能漏**
**第一，$\alpha_i\ge0$。**如果乘以负数，不等号方向会翻转，lsc 一般不能保留。
**第二，只允许有限项。** 作者用的是
$$
\liminf a_n+\liminf b_n
\le
\liminf(a_n+b_n),
$$
然后通过归纳推广到有限项。无限和不能直接靠这个有限归纳得到。
**第三，$f_i$ 不取 $-\infty$。** 所以定理中写的是
$$
f_i:\mathbb{E}\to(-\infty,\infty],
$$
而不是允许取 $-\infty$ 的完整扩展实值函数。这样有限个函数相加时不会出现类似
$$
(+\infty)+(-\infty)
$$
这种没有定义的表达式。

#### 3. (c) 任意多个函数取最大值
设 $\{f_i\}_{i\in I}$ 是任意一族闭函数，定义

$$
f(\mathbf{x})=\max_{i\in I}f_i(\mathbf{x}).
$$

这一条的证明会在下一页继续，但核心恒等式已经可以先看懂：

$$
\operatorname{epi}\left(\max_{i\in I}f_i\right)
=
\bigcap_{i\in I}\operatorname{epi}(f_i).
$$

展开验证：

$$
\begin{aligned}
(\mathbf{x},y)\in\operatorname{epi}(f)
&\iff
\max_{i\in I}f_i(\mathbf{x})\le y\\
&\iff
f_i(\mathbf{x})\le y,\quad \forall i\in I\\
&\iff
(\mathbf{x},y)\in\bigcap_{i\in I}\operatorname{epi}(f_i).
\end{aligned}
$$

每个 $\operatorname{epi}(f_i)$ 都是闭集，而闭集的**任意交**仍然是闭集，所以

$$
\operatorname{epi}(f)
$$

闭，从而 $f$ 闭。

### (b) 和 (c) 为什么不对称？
这是整页最值得记的地方：

| 运算 | 允许的规模 | 证明工具 |
|---|---:|---|
| 非负求和 $\sum_{i=1}^m\alpha_i f_i$ | 只能保证有限项 | lsc + liminf 次可加性 |
| 逐点最大 $\max_{i\in I}f_i$ | 任意指标集 | epi 与闭集交 |

本质区别是：

$$
\text{闭集对任意交封闭}
$$

但 liminf 的求和证明只能直接处理有限项。

这也解释了后面为什么支撑函数永远闭：

$$
\sigma_C(\mathbf{y})
=
\max_{\mathbf{x}\in C}\langle\mathbf{y},\mathbf{x}\rangle.
$$

这里的 $C$ 可以是无限集，甚至不可数集。支撑函数是**一族仿射函数的逐点最大值**，所以由 (c) 直接得到闭性。

### 总结
不要把 Thm 2.7 只背成三条结论，应该记成三种证明套路：
1. **仿射复合**：把 epi 点送进另一个 epi；
2. **非负有限和**：切换到 lsc，使用 liminf 次可加性；
3. **逐点最大**：把 epi 变成闭集的交。

其中第三条最漂亮：

$$
\boxed{
\operatorname{epi}(\max_i f_i)
=
\bigcap_i\operatorname{epi}(f_i)
}
$$

它会在后面反复出现，尤其是：
- Ch2 的支撑函数；
- Thm 2.16 的保凸运算；
- Ch4 的共轭函数；
- Ch13 Frank–Wolfe 的线性 oracle。

# 2.2 Closedness versus Continuity
## Thm 2.8
>  **定理2.8**： 给定一个在其定义域 $dom(f)$ 上连续的扩展实值函数 $f:\mathbb{E}\to (-\infty,+\infty]$ ，如果 $dom(f)$ 封闭，那么 f 就是封闭的
### Proof
要证明 $epi(f$)是封闭的（这等价于说 $f$ 是封闭的），我们考虑取序列：$$\{(\mathbf{x}_n,y_n)_{n\geq 1}\subset_= epi(f)\},(\mathbf{x}_n,y_n)\to(\mathbf{x}^{*},y^{*})\quad as\quad n\to\infty$$
由 epi 上测图的定义可知，$f(x_n)\leq y_n,n\geq 1$。又因为 $f$ 在 $dom(f)$ 上连续，所以在 $x^*$ 连续，因此：$$f(x^*)\leq y^*$$说明了 $(x^*,y^*)\in epi(f)$，于是证明了 $epi(f)$ 是封闭的
## Cor2.9 ： $f:\mathbb{E}\to \mathbb{R}$ 如果是连续的，那它就是封闭的
## 例 2.10 · 闭 $\ne$ 连续（$f_\alpha$ 家族）
> 上述结果表明连续性与闭性之间存在联系。然而，这两个概念并不相同，下面的例子说明了这一点。
> **例 2.10.** 考虑函数 $f_\alpha : \mathbb{R} \to (-\infty, \infty]$，定义为 $f_\alpha(x) = \begin{cases} \alpha, & x = 0, \\ x, & 0 < x \le 1, \\ \infty, & \text{else}. \end{cases}$
> 该函数闭 **当且仅当** $\alpha \le 0$；它在定义域上连续 **当且仅当** $\alpha = 0$。因此图 2.2 中画出的函数 $f_{-0.1}$ 是闭的，但在其定义域上不连续。
![](/obsidian-assets/0d4bcbff121c314a.png)
### 证明
书上没给证明，只给了结论。下面自己补——而且**两种武器都走一遍**，正好练一下 Thm 2.6 的"选武器"。
#### 先看定义域
$\mathrm{dom}(f_\alpha) = [0, 1]$ ——**闭区间**。这一点很关键：它意味着 Thm 2.8 的"定义域闭"这一半永远满足，所以这个例子整个是在检验另一半（连续性）。
#### 武器 (ii) · 直接画上境图
按定义逐段展开 $\mathrm{epi}(f_\alpha) = \{(x,y) : f_\alpha(x) \le y\}$：
- **$x = 0$**：条件是 $\alpha \le y$，得到一条竖射线 $\{(0, y) : y \ge \alpha\}$；
- **$0 < x \le 1$**：条件是 $x \le y$，得到线段 $y = x$（$x \in (0,1]$）**及其上方**的区域；
- **其他 $x$**：$f = \infty$，不进上境图。

合起来： $\mathrm{epi}(f_\alpha) = \underbrace{\{(0, y) : y \ge \alpha\}}_{S_1} \ \cup \ \underbrace{\{(x, y) : 0 < x \le 1,\ y \ge x\}}_{S_2}$

几何上：$S_2$ 是一个"斜屋顶"，底边在 $y = x$ 上、从 $x$ 略大于 $0$ 一直盖到 $x = 1$，往上无限延伸；$S_1$ 是竖轴上的一条射线，起点高度 $\alpha$。

**$S_1$ 本身是闭的**（$\mathbb{R}^2$ 中的闭射线），所以整个上境图闭不闭，只取决于 $S_2$ 的**闭包**有没有把新点漏在外面。

**$S_2$ 的闭包是什么？** $S_2$ 唯一"缺"的地方在 $x = 0$ 这条竖线上（$S_2$ 只取 $x > 0$）。点 $(0, y)$ 属于 $\mathrm{cl}(S_2)$ 当且仅当存在 $x_n \to 0^+$、$y_n \ge x_n$、$y_n \to y$——这等价于 $y \ge 0$。所以 $\mathrm{cl}(S_2) = \{(x, y) : 0 \le x \le 1,\ y \ge x\},$ 新增的部分是 $\{(0, y) : y \ge 0\}$。

**闭 $\iff$ $\alpha \le 0$**：
- 若 $\alpha \le 0$：所有 $y \ge 0$ 都满足 $y \ge 0 \ge \alpha$，所以新增的$\{(0,y): y\ge 0\} \subseteq S_1$。闭包没漏点，$\mathrm{epi}$ 闭；
- 若 $\alpha > 0$：点 $(0, 0) \in \mathrm{cl}(S_2)$（取 $x_n = 1/n$，$y_n = 1/n$），但 $(0,0) \notin S_1$（因为 $0 < \alpha$），且 $(0,0) \notin S_2$（$S_2$ 要 $x>0$）。**极限点漏在外面**，$\mathrm{epi}$ 不闭。
$\blacksquare$
#### 武器 (i) · 用 lsc（更快）
其实这题用 lsc 只要三步，值得对比一下：

**除了 $x = 0$ 之外，$f_\alpha$ 处处 lsc。**
- $x \in (0, 1)$：邻域内 $f_\alpha \equiv x$，连续，当然 lsc；
- $x = 1$：定义域内的序列只能从左边逼近，$f_\alpha(x_n) = x_n \to 1 = f_\alpha(1)$；
- $x \notin [0,1]$：$f_\alpha(x) = \infty$，而任何 $\mathbf{x}_n \to x$ 最终也都在 $[0,1]$ 外（$[0,1]$ 闭），故 $f_\alpha(x_n) = \infty$，$\liminf = \infty$，不等式成立。

**所以唯一可能出问题的就是 $x = 0$。** 取 $x_n = 1/n \to 0$，有 $f_\alpha(x_n) = 1/n \to 0$，故 $\liminf = 0$。lsc 要求$f_\alpha(0) = \alpha \le \liminf_{n \to \infty} f_\alpha(1/n) = 0,$ 即 $\alpha \le 0$。反过来，若 $\alpha \le 0$，上面已验证其他点都 lsc，故 $f_\alpha$ lsc。

**闭 $\iff$ lsc $\iff$ $\alpha \le 0$。** $\blacksquare$

###### 两种武器的对比

|   |   |   |   |
|---|---|---|---|
|武器|步数|难度|适合|
|(i) lsc|3 步|低（只需定位"唯一可疑点"）|**这题推荐**|
|(ii) 上境图几何|5 步|中（要算闭包）|想看图、想和 Figure 2.2 对上时|

lsc 快的根本原因：**这个函数的"病灶"只有一处**（$x=0$），而且你能一眼看出它在哪。上境图方法是"全局"的，不管病灶在哪都得整体算一遍。

**经验法则**：$f$ 由几段光滑函数拼起来时，先找拼接点，只在拼接点上验 lsc。这个套路后面验 $\|\cdot\|_0$（书页 19）、验各种罚函数时会反复用。

#### 连续 $\iff$ $\alpha = 0$
$\mathrm{dom}(f_\alpha) = [0,1]$，在定义域上连续只需要检查定义域内的序列。同样地，除 $x = 0$ 外处处连续，所以还是只看 $x = 0$：

取 $x_n = 1/n \in \mathrm{dom}$，$x_n \to 0 \in \mathrm{dom}$，有 $f_\alpha(x_n) = 1/n \to 0$。连续要求 $f_\alpha(x_n) \to f_\alpha(0) = \alpha$，故必须 $\alpha = 0$。

反之 $\alpha = 0$ 时 $f_0(x) = x$ 在 $[0,1]$ 上，就是恒等函数，处处连续。$\blacksquare$

#### 这个例子在说什么

|                       |              |              |              |
| --------------------- | ------------ | ------------ | ------------ |
|                       | $\alpha < 0$ | $\alpha = 0$ | $\alpha > 0$ |
| 闭？                    |              |              |              |
| 在 $\mathrm{dom}$ 上连续？ |              |              |              |
**结论一：闭 $\supsetneq$ 连续。** 书上画的是 $f_{-0.1}$：闭，但不连续。所以 Thm 2.8 **不能反推**——即使 $\mathrm{dom}$ 闭（这里 $\mathrm{dom} = [0,1]$ 闭得很彻底），闭性也不给出连续性。

**结论二：和 lsc 的口诀完全对上了。** 回到定义 2.5 那句"允许向下凹陷，不允许向上凸起"：
- $\alpha \le 0$：在 $x = 0$ 处 $f(0) = \alpha \le 0 = \lim_{x \to 0^+} f(x)$，是**向下凹陷**（或持平），允许 ⟹ 闭；
- $\alpha > 0$：$f(0) = \alpha > 0 = \lim$，是**向上凸起**，不允许 ⟹ 不闭。

上境图语言说的是同一件事：向下凹陷时，$S_1$ 的射线起点被压低到 $\alpha \le 0$，恰好"接住"了 $S_2$ 逼近 $x=0$ 时滑下来的所有极限点；向上凸起时，射线起点被抬到 $\alpha > 0$，$(0, 0)$ 就从缝隙里漏出去了。

**结论三（值得记牢的一个不等式链）**：

$$\text{连续} \ \subsetneq\ \text{闭} \ = \ \text{lsc} \ \subsetneq\ \text{所有函数}$$

而且"闭"这一档比"连续"宽出来的那部分，恰恰是**最优化真正需要的那部分**——压缩感知里的 $\ell_0$、稀疏罚、示性函数、各种非光滑正则项，全在里面。这就是为什么 Beck 一上来要用整整一节（§2.1 + §2.2）把"闭"而不是"连续"立为核心概念。

**前向指针**：闭性比连续性弱多少？这个问题在**凸**的情形下有漂亮的答案——书页 25 的 **Thm 2.22** 会说：一元闭凸函数在定义域的内部必连续。也就是说，加上凸性之后，闭性几乎把连续性"还"回来了（只剩边界上可能差一点）。到那里再回头看这个例子，会更清楚。

---
## 例 2.11 · $\ell_0$ 范数（不连续但闭）
> **例 2.11**（$\ell_0$-norm）。考虑函数 $f : \mathbb{R}^n \to \mathbb{R}$：
> $$f(\mathbf{x}) = \|\mathbf{x}\|_0 \equiv \#\{i : x_i \ne 0\}.$$
> 它表示向量中非零元素的个数。
+ 先吐槽一个名字：$\ell_0$ **实际上不是范数**。它不满足齐次性，因为一般有
> $$\|\alpha\mathbf{x}\|_0 = \|\mathbf{x}\|_0 \ne |\alpha|\|\mathbf{x}\|_0$$
> （只要 $\alpha \ne 0,1$ 且 $\mathbf{x} \ne 0$）。但这个术语在文献里已经广泛使用，所以作者沿用它。
+ $\ell_0$ 范数**显然不连续**。例如取
> $$\mathbf{x}_k = \frac{1}{k}\mathbf{e}_1 \to \mathbf{0},$$
> 其中 $\mathbf{e}_1$ 是第一个标准基向量。则
> $$\|\mathbf{x}_k\|_0 = 1 \quad\text{而}\quad \|\mathbf{0}\|_0 = 0.$$
> 所以在 $\mathbf{0}$ 点，函数值从 $0$ 突然跳到 $1$，不连续。

+ 但它是**闭函数**。这正好再次说明：连续性比闭性强，闭性才是优化中更适合使用的条件。
#### 把 $\ell_0$ 拆成坐标函数
定义一元函数 $I : \mathbb{R} \to \{0,1\}$：
$$I(y) = \begin{cases} 0, & y = 0, \\ 1, & y \ne 0. \end{cases}$$
则
$$f(\mathbf{x}) = \sum_{i=1}^n I(x_i).$$
**为什么这样拆**：这一步把一个看起来不连续的整体函数，拆成了 $n$ 个简单的一元函数，然后可以调用刚刚学过的 **Thm 2.7(b)**。
#### 用水平集证明 $I$ 闭
根据 **Thm 2.6(iii)**，证明 $I$ 闭，只需要证明对任意 $\alpha \in \mathbb{R}$，水平集
$$\operatorname{Lev}(I,\alpha) = \{y \in \mathbb{R} : I(y) \le \alpha\}$$
是闭集。分情况：
$$\operatorname{Lev}(I,\alpha) = \begin{cases}

\emptyset, & \alpha < 0, \\

\{0\}, & 0 \le \alpha < 1, \\

\mathbb{R}, & \alpha \ge 1.

\end{cases}$$
+ $\alpha < 0$ 时，$I(y)$ 永远不小于 $0$，所以水平集为空集；
+ $0 \le \alpha < 1$ 时，只有 $I(0)=0$ 能满足 $I(y)\le\alpha$，水平集是 $\{0\}$；
+ $\alpha \ge 1$ 时，$I(y)$ 的取值只有 $0$ 和 $1$，所有点都满足条件，水平集是 $\mathbb{R}$。

这三个集合 $\emptyset$、$\{0\}$、$\mathbb{R}$ 都是闭集，所以 $I$ 闭。

最后，由 **Thm 2.7(b)**，有限个闭函数的非负和仍然闭。因此

$$f(\mathbf{x}) = \sum_{i=1}^n I(x_i)$$
是闭函数。$\blacksquare$

**这一页的核心不是 $\ell_0$ 本身**，而是证明策略：
$$

\text{整体函数难证闭}

\ \longrightarrow\

\text{拆成坐标函数}

\ \longrightarrow\

\text{证每个水平集闭}

\ \longrightarrow\

\text{调用 Thm 2.7(b)}.

$$
这就是 **Thm 2.6 的第三种武器（水平集法）**第一次正式出场。$\ell_0 的上境图不太好直接画，但它的水平集只有三种形状，一眼就能看出闭。
**和稀疏优化的连接**：$\|\mathbf{x}\|_0$ 统计非零坐标数，所以最小化它会倾向于寻找稀疏解。它虽然不连续、也不是凸函数，但它是闭的；因此在适当的紧性或强制性条件下，后面的存在性定理仍然能使用。
### Thm 2.12 · 闭函数版本的 Weierstrass 定理
> **定理 2.12**（闭函数的 Weierstrass 定理 Weierstrass theorem for closed functions）。设 $f : \mathbb{E} \to (-\infty,\infty]$ 是 proper 闭函数，且 $C$ 是满足
> $$C \cap \operatorname{dom}(f) \ne \emptyset$$
> 的紧集。那么：
> (a) $f$ 在 $C$ 上有下界；
> (b) $f$ 在 $C$ 上能取到最小值。

+ 经典 Weierstrass 定理说：连续函数在非空紧集上能取到最小值。
  - Beck 把连续性换成了更弱的闭性（等价于 lsc），所以这个结论仍然成立。
  - 这正是前面一直铺垫的理由：**优化真正需要的不是连续，而是下半连续。**
#### 先抠清楚定理的三个条件
**第一，$f$ proper。**
$f : \mathbb{E} \to (-\infty,\infty]$ 已经排除了 $-\infty$，所以不可能出现某个点的函数值就是 $-\infty$。这是证明 (a) 反证时的最后一堵墙。
**第二，$f$ 闭。**
由 Thm 2.6，闭等价于 lsc。证明全程真正用到的是
$$f(\bar{\mathbf{x}}) \le \liminf f(\mathbf{x}_{n_k}).$$
所以这个定理的本质是：**lsc + 紧性 $\Longrightarrow$ 下界和极小值存在。**
**第三，$C \cap \operatorname{dom}(f) \ne \emptyset$。**
这保证 $C$ 中至少有一个点让 $f$ 取有限值。于是最小值不会是 $+\infty$，后面才能取一列逼近一个有限的最优值 $f_{\mathrm{opt}}$。
#### (a) 有下界：反证 + 紧性 + lsc
假设 $f$ 在 $C$ 上没有下界。则可以取序列 $\{\mathbf{x}_n\}\subseteq C$，使
$$f(\mathbf{x}_n) \to -\infty. \tag{2.3}$$
因为 $C$ 紧，根据 Bolzano–Weierstrass 定理，这个序列存在收敛子列 $\{\mathbf{x}_{n_k}\}$，并且
$$\mathbf{x}_{n_k} \to \bar{\mathbf{x}} \in C.$$
由于 $f$ 闭，由 Thm 2.6 知道 $f$ lsc，于是
$$f(\bar{\mathbf{x}}) \le \liminf_{k\to\infty} f(\mathbf{x}_{n_k}).$$
而原序列的函数值已经趋于 $-\infty，所以子列也趋于 $-\infty$：
$$\liminf_{k\to\infty} f(\mathbf{x}_{n_k}) = -\infty.$$
因此
$$f(\bar{\mathbf{x}}) \le -\infty,$$
只能说明 $f(\bar{\mathbf{x}})=-\infty$。但 $f$ 的值域是 $(-\infty,\infty]$，不允许取 $-\infty$，矛盾。
所以 $f$ 在 $C$ 上必然有下界。$\blacksquare$

#### (b) 最小值能取到：最小化序列 + 紧性 + lsc
记 $f$ 在 $C$ 上的下确界为 $f_{\mathrm{opt}}$。按照本书的约定，作者写 $\min$ 不代表已经知道极值能取到，所以这里先把 $f_{\mathrm{opt}}$ 理解为下确界。
由下确界的定义，存在一列 $\{\mathbf{x}_n\}\subseteq C$，使
$$f(\mathbf{x}_n) \to f_{\mathrm{opt}}.$$
这叫**最小化序列**（minimizing sequence）。再次利用 $C$ 的紧性，取子列满足
$$\mathbf{x}_{n_k} \to \bar{\mathbf{x}} \in C.$$
由 $f$ 的下半连续性：
$$f(\bar{\mathbf{x}})
\le
\liminf_{k\to\infty}f(\mathbf{x}_{n_k})
=
 f_{\mathrm{opt}}.$$
但 $f_{\mathrm{opt}}$ 是 $C$ 上的下确界，所以对任何 $\bar{\mathbf{x}}\in C$ 都有
$$f_{\mathrm{opt}}\le f(\bar{\mathbf{x}}).$$
两边合起来：
$$f(\bar{\mathbf{x}})=f_{\mathrm{opt}}.$$
因此 $\bar{\mathbf{x}}$ 是 $f$ 在 $C$ 上的最小点，最小值确实被取到。$\blacksquare$
#### 定理 2.12 的证明骨架
$$
\boxed{
\text{无界/不取到}
\ \longrightarrow\
\text{取序列}
\ \longrightarrow\
\text{紧集取收敛子列}
\ \longrightarrow\
\text{lsc 把极限点留在正确的函数值一侧}
}
$$
+ (a) 如果函数值能一路掉到 $-\infty$，lsc 会逼出函数取 $-\infty$，与 proper 矛盾；
+ (b) 如果最小值不一定取到，先取最小化序列，紧性给收敛子列，lsc 再把极限点变成真正的最小点。
**为什么这是本章的转折点**：前面一直在讨论"什么叫闭"、"怎么证明闭"；从 Thm 2.12 开始，闭性第一次兑现成一个优化结论——**最小值存在**。
### 定义 2.13 · 强制性
> 当 $C$ 不紧时，Weierstrass 定理本身不能保证最小值能取到。不过，如果用闭性替代紧性，同时函数具有一种叫作**强制性**（coerciveness）的性质，仍然可以保证最小值存在。
> **定义 2.13**（强制性 coerciveness）。proper 函数 $f : \mathbb{E} \to (-\infty,\infty]$ 称为**强制的**，如果
> $$\lim_{\|\mathbf{x}\|\to\infty}f(\mathbf{x})=\infty.$$
+ 直觉是：$\|\mathbf{x}\|\to\infty$ 时，函数值也被迫升到 $+\infty$。
+ 低函数值区域不可能无限向外逃跑；它们会被困在某个足够大的球里。
+ 典型例子是


> $$f(\mathbf{x})=\frac12\|\mathbf{x}\|^2,$$


> 它满足 $\|\mathbf{x}\|\to\infty$ 时 $f(\mathbf{x})\to+\infty$，因此是强制的。
**注意强制性不是连续性，也不是凸性。** 它只描述函数在无穷远处的增长行为；一个函数可以不连续、非凸，但仍然强制。
### Thm 2.14 · 强制性保证闭集上的最小值存在
> **定理 2.14**（强制性下的取值 attainment under coerciveness）。设 $f : \mathbb{E} \to (-\infty,\infty]$ 是 proper、闭且强制的函数，且 $S\subseteq\mathbb{E}$ 是非空闭集，满足
> $$S \cap \operatorname{dom}(f) \ne \emptyset.$$
> 则 $f$ 在 $S$ 上能取到最小值。
这比 Thm 2.12 更强：

| 定理 | 对集合 $C/S$ 的要求 | 对函数的额外要求 |
|---|---|---|
| Thm 2.12 | 紧 | proper + 闭 |
| Thm 2.14 | 只需非空闭 | proper + 闭 + 强制 |

#### 完整证明（书页 21）
**思路骨架**（先记牢，再逐句展开）：

$$

\boxed{

\text{取一个有限值的参照点}

\ \longrightarrow\

\text{强制性把所有更优的点困在有界球内}

\ \longrightarrow\

\text{把问题截断到闭集 ∩ 闭球 = 紧集}

\ \longrightarrow\

\text{调用 Thm 2.12}

}

$$

**第一步：取一个有限值的参照点。**
由 $S \cap \mathrm{dom}(f) \ne \emptyset$，取 $\mathbf{x}_0 \in S \cap \mathrm{dom}(f)$。这个点的函数值 $f(\mathbf{x}_0)$ 是**有限实数**——它就成了接下来所有比较的「标杆」。
**第二步：强制性把所有不差于 $\mathbf{x}_0$ 的点困在有界球内。**
由 $f$ 强制性，存在 $M > 0$，使得  
$$f(\mathbf{x}) > f(\mathbf{x}_0) \quad \text{对所有满足}\ \|\mathbf{x}\| > M\ \text{的}\ \mathbf{x} \in \mathbb{E}. \tag{2.4}$$
**第三步：截断到 $S \cap B[\mathbf{0}, M]$。**
设 $\mathbf{x}^* \in S$ 是 $f$ 在 $S$ 上的任意一个最小点（暂时还不确定存在），则 $f(\mathbf{x}^*) \le f(\mathbf{x}_0)$。结合 (2.4) 知 $\|\mathbf{x}^*\| \le M$，即 $\mathbf{x}^* \in B[\mathbf{0}, M]$。
所以 $f$ 在 $S$ 上的最小点集合 = $f$ 在 $S \cap B[\mathbf{0}, M]$ 上的最小点集合。
**第四步：$S \cap B[\mathbf{0}, M]$ 紧，调 Thm 2.12。**
- $S$ 闭 + $B[\mathbf{0}, M]$ 闭 ⟹ 交集闭（两个闭集的交是闭集）；
- $B[\mathbf{0}, M]$ 有界 ⟹ 交集有界；
- 闭 + 有界 = 紧 ⟹ $S \cap B[\mathbf{0}, M]$ 紧；
- 由 $\mathbf{x}_0 \in S \cap B[\mathbf{0}, M]$ 知 $S \cap B[\mathbf{0}, M] \ne \emptyset$；
- 同时 $S \cap B[\mathbf{0}, M] \subseteq \mathrm{dom}(f)$，所以 $(S \cap B[\mathbf{0}, M]) \cap \mathrm{dom}(f) \ne \emptyset$。
**Thm 2.12 的所有前提都满足**——$f$ 在 $S \cap B[\mathbf{0}, M]$ 上取到最小值 $\bar{\mathbf{x}}$，而 $\bar{\mathbf{x}} \in S$，所以它也是 $f$ 在 $S$ 上的最小值点。$\blacksquare$
#### 证明的两条经验
**经验 1**：当一个极值定理里出现 "强制" 两个字时，**第一时间想到 "球"**。强制性的全部威力就是把无穷远处的可能性一刀切掉——具体方式是用一个足够大的有限半径球把所有"还算合格"的候选点圈起来。
**经验 2**：**闭集 + 闭球 = 紧集**。这是把 "闭集" 转化为 "紧集" 的标准变形。后面 Thm 2.18 部分最小化、Thm 2.21 局部 Lipschitz、§2.4 支撑函数的闭性证明，全靠这招。
**前向指针**：Thm 2.14 的模式在 §3.5 共轭函数的存在性里会**反过来用**——给定一个 proper 闭凸函数，我们要证明它的共轭也存在，那时就把"闭集"换成"约束 + 强制"再调用本定理。

---
## 2.3 Convex Functions
书页 21 中段，作者用一节标题宣告新主题：
> **2.3 Convex Functions**
子节标题：
> **2.3.1 Definition and Basic Properties**
导言一句话：「与闭性一样，扩展实值函数的凸性也可以用 epigraph 来写。」——这是 **epigraph 技巧**的第二次正式出场（第一次是 Def 2.2 闭函数），后面 §2.4 还会用第三次（支撑函数 $\sigma_C$ 永远闭凸）。
**学完 §2.2 后的全局视角**：§2.1–2.2 把"闭"立为核心；§2.3 在"闭"之上叠加"凸"。凸性的引入与闭性走的是**同一条路**：用 $\mathrm{epi}(f)$ 的集合性质定义函数性质。
### 定义 2.15 · 凸函数 = 上境图凸
> **定义 2.15**（凸函数 convex functions）。扩展实值函数 $f : \mathbb{E} \to [-\infty, \infty]$ 称为**凸的**，如果 $\mathrm{epi}(f)$ 是一个凸集。
**又是只用一行就把整个概念焊死**。和 Def 2.2 闭函数的写法一模一样——再确认一次「epigraph 翻译」是本书函数论的脊梁。
#### 一个推论式等价刻画
书页 21 紧接着给出的等价条件：
> 一个 proper 扩展实值函数 $f : \mathbb{E} \to (-\infty,\infty]$ 是凸的，**当且仅当**：
> 1. $\mathrm{dom}(f)$ 是凸集；
> 2. $f$ 在 $\mathrm{dom}(f)$ 上的限制是定义在凸域上的**实值凸函数**（即对所有 $\mathbf{x}, \mathbf{y} \in \mathrm{dom}(f)$ 和 $\lambda \in [0,1]$ 满足 Jensen 不等式）。
这就是说：**凸函数 = 凸定义域 + 凸限制**。把 proper 这条拆成 dom 凸（域形状）+ 限制凸（域内行为），两件事子互相正交。
#### 用公式表达凸性（式 2.5）
proper 凸函数 $f : \mathbb{E} \to (-\infty, \infty]$ 等价于：
$$

f(\lambda \mathbf{x} + (1-\lambda)\mathbf{y}) \le \lambda f(\mathbf{x}) + (1-\lambda) f(\mathbf{y}) \quad \text{对所有}\ \mathbf{x}, \mathbf{y} \in \mathbb{E},\ \lambda \in [0,1]. \tag{2.5}
$$

注意式 (2.5) **不要求** $\mathbf{x}, \mathbf{y} \in \mathrm{dom}(f)$——只要 $f$ 是 proper 且凸，不等式对 $\mathbf{x}, \mathbf{y} \in \mathbb{E}$ 也成立，但若其中一点不在 $\mathrm{dom}(f)$ 则 $f(\cdot) = +\infty$，不等式自动满足（$\infty \le \cdot$ 平凡成立）。所以真正常用的还是 $\mathbf{x}, \mathbf{y} \in \mathrm{dom}(f)$ 这一版。
### Jensen 不等式 · 凸函数的最核心性质
> **Jensen 不等式**（Jensen's inequality）。设 $f : \mathbb{E} \to (-\infty, \infty]$ 是凸函数，$\mathbf{x}_1, \mathbf{x}_2, \ldots, \mathbf{x}_k \in \mathbb{E}$，$\lambda = (\lambda_1, \ldots, \lambda_k) \in \Delta_k$（即 $\lambda_i \ge 0$、$\sum_i \lambda_i = 1$）。则  
> $$f\!\left(\sum_{i=1}^k \lambda_i \mathbf{x}_i\right) \le \sum_{i=1}^k \lambda_i f(\mathbf{x}_i). \tag{Jensen}$$
**两点必须记住**：
+ $\Delta_k$ 是**概率单纯形**：所有分量非负且和为 1 的 $k$ 维向量。"凸组合"的系数就是 $\Delta_k$ 里的元素；
+ (2.5) 是 Jensen 的 $k=2$ 特殊情形。归纳即得：$\Delta_k$ 上的 Jensen 等价于"任意二元凸组合满足"。
**Jensen 的几何读法**：左边的 $f$ 作用在"凸组合后的点"上，右边是"凸组合后的函数值"——凸性保证"先合再算"比"先算再合"小（函数值更低）。**凸函数 = "运算顺序无所谓，混着算更划算"。**
**前向指针**：Jensen 是 §3 共轭函数、Fenchel–Young 不等式、Ch7 谱函数全书的根。不等式 $f(\mathbf{x}) + f^*(\mathbf{x}^*) \ge \mathbf{x}^\top \mathbf{x}^*$ 就是 Jensen 的特殊情形（凸 + 凹共轭），Ch4 会回扣这里。
### Thm 2.16 · 保凸运算（开始）
> **定理 2.16**（保持凸性的运算 operations preserving convexity）。
> (a) 设 $A : \mathbb{E} \to \mathbb{V}$ 是线性变换（$\mathbb{E}, \mathbb{V}$ 是两个 underlying vector spaces），$\mathbf{b} \in \mathbb{V}$，且 $f : \mathbb{V} \to (-\infty, \infty]$ 是扩展实值凸函数。则由  
> $g(\mathbf{x}) = f(A(\mathbf{x}) + \mathbf{b})$  
> 定义的 $g : \mathbb{E} \to (-\infty, \infty]$ 是凸的。

**书页 21 只到 (a) 的陈述开头；**(b)、(c) 在书页 22 给出。**这一节只走 (a) 的证明轮廓与思路类比。**
(a) 的证明套路与 Thm 2.7(a) **完全平行**——仿射复合保凸。区别只是把「闭集」换成「凸集」。具体：
- 设 $\mathbf{x}, \mathbf{y} \in \mathbb{E}$，$\lambda \in [0,1]$；
- $g(\lambda \mathbf{x} + (1-\lambda)\mathbf{y}) = f(A(\lambda \mathbf{x} + (1-\lambda)\mathbf{y}) + \mathbf{b}) = f(\lambda(A(\mathbf{x})+\mathbf{b}) + (1-\lambda)(A(\mathbf{y})+\mathbf{b}))$，其中用了 $A$ 的线性；
- 由 $f$ 凸，$\le \lambda f(A(\mathbf{x})+\mathbf{b}) + (1-\lambda) f(A(\mathbf{y})+\mathbf{b}) = \lambda g(\mathbf{x}) + (1-\lambda) g(\mathbf{y})$。
**关键差异：Thm 2.7(a) vs Thm 2.16(a)**：

| 定理 | 保的属性 | 需要的函数性质 |
|---|---|---|
| Thm 2.7(a) | 闭性（epi 闭） | $f$ 闭（不要求 proper） |
| Thm 2.16(a) | 凸性（epi 凸） | $f$ 凸（且 proper） |

两个定理是**正交关系**——一个保"闭"，一个保"凸"，不要混用。Thm 2.7(a) 允许 $f$ 取 $-\infty$，Thm 2.16(a) 要求 $f$ 是 proper（值域 $(-\infty, \infty]$，不取 $-\infty$）。

---
（书页 22，待续：Thm 2.16(b)(c) 保凸 / 距离函数 / Ex 2.17 φ_C 恒凸 / Thm 2.18 部分最小化保凸）
