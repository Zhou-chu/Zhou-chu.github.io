---
blog: true
title: "Chapter 2-Extended Real-Valued Functions"
slug: "chapter-2-extended-real-valued-functions-iernkzyd"
summary: "在本书中，我们的underlying spaces都是 有限维 的、存在内积和范数的空间 2.1 Extended Real Valued Functions and Closedness + 我们考虑在实数 $\\mathbb{R}$ 的基础上，扩充引入 $\\infty$ 和 $ \\infty$，它们有这样的运算律 + !390 + 直觉上，其中唯一“不自然”的就是这个 $0\\cdot \\infty=0$ ，但是在我们讨论的范围呢，这个"
date: 2026-08-30
category: "人工智能的优化方法"
featured: false
---

在本书中，我们的underlying spaces都是**有限维**的、存在内积和范数的空间
## 2.1 Extended Real-Valued Functions and Closedness
+ 我们考虑在实数 $\mathbb{R}$ 的基础上，扩充引入 $\infty$ 和 $-\infty$，它们有这样的运算律
+ ![](/obsidian-assets/cee2f054e19670ce.png)
+ 直觉上，其中唯一“不自然”的就是这个 $0\cdot \infty=0$ ，但是在我们讨论的范围呢，这个定义是符合一致性的。我们还有：$$\infty>a(-\infty\leq a<\infty),-\infty<a(-\infty<a\leq \infty)$$
+ 对扩展实值函数 $f : \mathbb{E} \to [-\infty, \infty]$，其**有效定义域**（effective domain），简称**定义域**，是
$$\mathrm{dom}(f) = \{\mathbf{x} \in \mathbb{E} : f(\mathbf{x}) < \infty\}.$$
+ **符号约定的两个细微处**（书中随即说明）：
	- "$f : \mathbb{E} \to [-\infty, \infty]$" 仅表示 `f` 允许取到 $\pm\infty$（扩展实值），**不**保证真的取到；
	- "$f : \mathbb{E} \to (-\infty, \infty]$" 表示 `f` 是扩展实值的**且**不再取 $-\infty$（但仍可取 $+\infty$）。
### 例 2.1 · 示性函数
最简单也最重要的扩展实值函数是**示性函数**。
> **例 2.1**（示性函数 indicator functions）。对任意子集 $C \subseteq \mathbb{E}$，集合 $C$ 的示性函数定义为如下扩展实值函数：

> $\delta_C(\mathbf{x}) = \begin{cases} 0, & \mathbf{x} \in C, \\ \infty, & \mathbf{x} \notin C. \end{cases}$
显然
$$\mathrm{dom}(\delta_C) = C.$$
**为什么这一行最关键**：书的下一句几乎没强调，但它值得记一辈子——
**$\delta_C$ 把集合 $C$ "原样"翻译成函数**。$\mathrm{dom}$ 的等号左是函数 $\delta_C$，等号右是集合 $C$。$C$ 不闭？$\delta_C$ 不闭。$C$ 凸？$\delta_C$ 凸。$C$ 的任何结构，都一一对应到 $\delta_C$ 的结构上。
这是为什么最优化的核心手段是"用函数做约束"——因为**集合论和函数论是同一件事的两套语法**。
### Epigraph · 上境图
为了把"函数性质"翻译成"集合性质"，引入一个比"定义域"更重要的概念。
> 扩展实值函数 $f : \mathbb{E} \to [-\infty, \infty]$ 的**上境图**（epigraph）定义为

> $\mathrm{epi}(f) = \{ (\mathbf{x}, y) : f(\mathbf{x}) \le y,\ \mathbf{x} \in \mathbb{E},\ y \in \mathbb{R} \}.$
**两点容易混的细节**：
- 上境图是 $\mathbb{E} \times \mathbb{R}$ 的子集——纵轴是 $y$（实数），不是别的；
- 若 $(\mathbf{x}, y) \in \mathrm{epi}(f)$，则显然 $\mathbf{x} \in \mathrm{dom}(f)$（因为 $f(\mathbf{x}) \le y$ 是有限实数，所以 $f(\mathbf{x}) < \infty$）。
**几何直观**：把函数图像（$f$ 在 $\mathbb{E}$ 上方）"灌满"——点 $(\mathbf{x}, y)$ 在图像**正上方**就算入。$\delta_C$ 的图像是 $C$ 上"高度为 0"的水平面，往上无限延伸，所以 $\mathrm{epi}(\delta_C)$ 是一个**没有顶盖的"屋顶"**——下一节会算出它的精确形状。
### Proper · 正常函数
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
### 定义 2.2 · 闭函数
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
### 例 2.4 · $f(x) = 1/x$（说明闭函数的定义域一般不必闭）
> **例 2.4.** 考虑函数 $f : \mathbb{R} \to [-\infty, \infty]$，定义为

> $f(x) = \begin{cases} \dfrac{1}{x}, & x > 0, \\ \infty, & \text{else}. \end{cases}$

> 该函数的定义域是开区间 $(0, \infty)$，显然**不是闭集**；但这个函数**是闭的**，因为它的上境图

> $\mathrm{epi}(f) = \{(x, y) : xy \ge 1,\ x > 0\}$

> 是闭集。见图 2.1。
> 		![](/obsidian-assets/ec99054d59f5c2dd.png)
#### 上境图这个式子是怎么来的
按定义逐点代：
$\mathrm{epi}(f) = \{(x, y) : f(x) \le y,\ x \in \mathbb{R},\ y \in \mathbb{R}\}$
分两种情况讨论：
- **$x > 0$ 时**：$f(x) = 1/x$，条件是 $1/x \le y$。因为 $x > 0$，两边同乘 $x$ 不变号，得 $xy \ge 1$；
- **$x \le 0$ 时**：$f(x) = \infty$，条件是 $\infty \le y$——对任何实数 $y$ 都不成立，所以**竖线 $x \le 0$ 上没有任何点进入上境图**。
合起来就是 $\mathrm{epi}(f) = \{(x, y) : xy \ge 1,\ x > 0\}$。
#### 1.3 为什么它是闭集
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
**这就是整个反例的核心**：定义域的「缺口」被函数值在该处爆到 $+\infty$ 给「补」上了。上境$图没有漏，所以函数闭。
### 定义 2.5 · 下半连续
> **定义 2.5**（下半连续性 lower semicontinuity）。称函数 $f : \mathbb{E} \to [-\infty, \infty]$ 在点 $\mathbf{x} \in \mathbb{E}$ **下半连续**，如果
> $$f(\mathbf{x}) \le \liminf_{n \to \infty} f(\mathbf{x}_n)$$
> 对任意满足 $\mathbf{x}_n \to \mathbf{x}\ (n \to \infty)$ 的序列 $\{\mathbf{x}_n\}_{n \ge 1} \subseteq \mathbb{E}$ 成立。称 $f$ 下半连续，如果它在 $\mathbb{E}$ 中每一点都下半连续。即要求 $f(x)$ 小于等于这个序列的下极限

这也就是说，**下半连续性**要求函数可以连续、可以不连续且有向下的突变，但是**不允许不连续且有向上的突变**，即任何一个函数的断裂处，断裂位置自己的取值一定是突变的较小的那个值，这个位置出发向左向右走一个小量，都只会使得值不变小
#### 和上境图的联系（提前剧透）
「向上凸起」为什么不被允许？因为那会在上境图上戳出一个**不闭合的缺口**。
仍用上面的反例：$f(0) = 1$，$f(x) = 0\ (x \ne 0)$。则
- 点 $(0,\ 0.5) \notin \mathrm{epi}(f)$，因为 $f(0) = 1 > 0.5$；
- 但 $(1/n,\ 0.5) \in \mathrm{epi}(f)$ 对所有 $n$ 成立，因为 $f(1/n) = 0 \le 0.5$；
- 而 $(1/n,\ 0.5) \to (0,\ 0.5)$。
$(0, 0.5)$ 是上境图的极限点却不在上境图里 ⟹ 上境图不闭。
#### 一个技术注记
定义是用**序列**写的，不是用邻域/开集写的。在有限维空间（本书的全部设定）里，序列刻画与拓扑刻画完全等价，因为有限维空间是第一可数的。到了无穷维的一般拓扑空间，序列就不够用了，得换成网（net）或邻域基——**本书不涉及**，可以不管。

---
### 水平集
> 对任意 $\alpha \in \mathbb{R}$，函数 $f : \mathbb{E} \to [-\infty, \infty]$ 的 $\alpha$-**水平集**（level set）是集合

> $\mathrm{Lev}(f, \alpha) = \{\mathbf{x} \in \mathbb{E} : f(\mathbf{x}) \le \alpha\}.$

**注意是 $\le$，不是 $\ge$**。这是**下**水平集（sublevel set），不是上水平集。
这个方向的选择不是随便的：我们做的是**最小化**，关心的是「函数值不超过某个门槛的点有哪些」。换句话说，水平集是等高线**及以内**的区域。后面 Weierstrass 定理、强制性、次水平集有界性，全部建立在这个方向上。

---
### Thm 2.6
书页 15 结尾预告了一个定理，说「闭性、下半连续、所有水平集闭」三者等价。书页 16 就是这个定理——**Thm 2.6**，全章的枢纽。
它值得单独一页不只是因为它**核心**，更因为它的**证明结构**是一个漂亮的三向循环，每一环用到的论证技巧都不同：序列放缩、取极限在集合内、最后那个最微妙的**反证 + 子列**。
#### 定理陈述
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
#### 证明：三个方向
##### 方向 1：(i) ⇒ (ii) · 序列放缩
> 假设 $f$ 下半连续。要证 $\mathrm{epi}(f)$ 闭。
取 $\mathrm{epi}(f)$ 中任意收敛序列 $(\mathbf{x}_n, y_n) \to (\mathbf{x}^*, y^*)$。要证 $(\mathbf{x}^*, y^*) \in \mathrm{epi}(f)$，即 $f(\mathbf{x}^*) \le y^*$。
由定义，$f(\mathbf{x}_n) \le y_n$ 对所有 $n$ 成立。
由下半连续（注意「$\le$」+ liminf 这个配方）：
$f(\mathbf{x}^*) \le \liminf_{n \to \infty} f(\mathbf{x}_n) \le \liminf_{n \to \infty} y_n = y^*.$
第一步用了 $f$ 在 $\mathbf{x}^*$ 处下半连续，第二步用了 $f(\mathbf{x}_n) \le y_n$ 取 liminf 保序，第三步用了 $y_n \to y^*$。
得 $(\mathbf{x}^*, y^*) \in \mathrm{epi}(f)$，所以 $\mathrm{epi}(f)$ 闭。$\blacksquare$
**这一招就是「T2 序列 + liminf 技巧」**。后面证明里还会再出现几次。
##### 方向 2：(ii) ⇒ (iii) · 极限点留在集合内
> 假设 $\mathrm{epi}(f)$ 闭。要证每个 $\mathrm{Lev}(f, \alpha)$ 闭（$\alpha \in \mathbb{R}$ 任意）。
若 $\mathrm{Lev}(f, \alpha) = \emptyset$，自然是闭的。否则取序列 $\{\mathbf{x}_n\}_{n \ge 1} \subseteq \mathrm{Lev}(f, \alpha)$ 收敛到某 $\bar{\mathbf{x}}$。
关键观察：$f(\mathbf{x}_n) \le \alpha$ 意味着 $(\mathbf{x}_n, \alpha) \in \mathrm{epi}(f)$。
由 $\mathrm{epi}(f)$ 闭，且 $(\mathbf{x}_n, \alpha) \to (\bar{\mathbf{x}}, \alpha)$，得 $(\bar{\mathbf{x}}, \alpha) \in \mathrm{epi}(f)$，即 $f(\bar{\mathbf{x}}) \le \alpha$，即 $\bar{\mathbf{x}} \in \mathrm{Lev}(f, \alpha)$。
所以 $\mathrm{Lev}(f, \alpha)$ 闭。$\blacksquare$

**这一招把「水平集闭」翻译成「epi 闭」**：水平集的元素配上坐标 $\alpha$ 就变成了 epi 里的点。这是个**降维**操作——在 epi 这个 $\mathbb{E} \times \mathbb{R}$ 的子集上看问题。
##### 方向 3：(iii) ⇒ (i) · 反证 + 子列（最微妙的一步）
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
#### 注记 1：作者对 max/min 用法的提醒
定理 2.6 证明之后，作者专门加了一段（不在书页 16 的截图里，但紧接其后）：
> 在本书中我们不用 $\inf$/$\sup$ 记号，而只用 $\min$/$\max$，**且 $\min$/$\max$ 的使用不意味着极值能取到**。
翻译：以后看到 $\min_x f(x)$ 不要自动假设它能取到最小值（可能只 inf 但不 min）。**这条提醒对后面 Thm 2.12 Weierstrass 极为重要**——那个定理就是说：在什么条件下「min」能真正取到。
