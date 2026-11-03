---
blog: true
title: "电力系统分析：第3章 第9讲 极坐标牛顿法与 P-Q 分解法"
slug: "电力系统分析-第3章-第9讲-极坐标牛顿法与pq分解法-pwr3l09"
summary: "第 3 章第 9 讲笔记：极坐标下牛顿法的修正方程与雅可比矩阵；P-Q 分解法的三步简化（R≪X 解耦、相角差小、Q≪U²B）与常系数修正方程；两节点算例（含被课件略过的低电压解）与 4 节点系统的 P-Q 分解法迭代、最终潮流和网损。"
date: 2026-10-26
category: "电力系统分析"
featured: false
tags:
  - "电力系统分析"
  - "电力系统"
  - "潮流计算"
  - "牛顿拉夫逊法"
  - "雅可比矩阵"
  - "PQ分解法"
  - "课程笔记"
---

# 第 3 章 电力系统潮流分析与计算（第 9 讲：极坐标牛顿法与 P-Q 分解法）学习笔记

> 课件：*Chapter 3: Power Flow Analysis and Calculation（Lecture 4: N-R Method and PQ Decomposition Method）*，29 页。

## 0. 本讲提纲

1. 极坐标下的牛顿法怎么写？
2. 什么是 P-Q 分解法？
3. 怎样推导 P-Q 分解法？
4. 怎样理解 P-Q 分解法的机理？

上一讲在直角坐标下讲了牛顿法：它收敛快，但每次迭代都要重新计算并求解高阶、不对称的雅可比矩阵，计算量大。本讲要在不影响计算精度的前提下，让修正方程变得简单。路线分两步：

1. **换成极坐标。** 直角坐标的 $e$、$f$ 把电压幅值和相角混在一起，看不出第 6 讲的规律（有功主要由相角差决定，无功主要由电压差决定）；极坐标下相角和幅值是分开的变量，才能表达这个规律；
2. **利用这个规律简化雅可比矩阵**：高压电网满足几个条件，雅可比矩阵可以降阶、常数化，得到 P-Q 分解法。

## 1. 极坐标下的牛顿法（P3–P8）

### 1.1 方程与未知量（P3）

PQ 节点 $n-1-r$ 个，PV 节点 $r$ 个。未知量是除平衡节点外所有节点的相角 $\delta$（$n-1$ 个），加上 PQ 节点的电压幅值 $U$（$n-1-r$ 个），共 $2(n-1)-r$ 个。对应的方程：

$$
\begin{aligned}
\Delta P_i &= P_i^{sp} - U_i\sum_{j=1}^{n}U_j\left(G_{ij}\cos\delta_{ij}+B_{ij}\sin\delta_{ij}\right)=0 && \text{PQ、PV 节点，共 } n-1 \text{ 个}\\
\Delta Q_i &= Q_i^{sp} - U_i\sum_{j=1}^{n}U_j\left(G_{ij}\sin\delta_{ij}-B_{ij}\cos\delta_{ij}\right)=0 && \text{PQ 节点，共 } n-1-r \text{ 个}
\end{aligned}
$$

与直角坐标相比，PV 节点的 $U_i$ 直接是已知量，**不需要额外的电压方程**，方程少了 $r$ 个。

### 1.2 修正方程（P4–P5）

> 记号提醒：本讲的 $\boldsymbol H$、$\boldsymbol N$、$\boldsymbol M$、$\boldsymbol L$ 是**极坐标**下的雅可比子矩阵，与上一讲直角坐标下的同名矩阵含义不同（那里是对 $e$、$f$ 求偏导）。

![极坐标修正方程：J 中对 U 的偏导乘以 U，ΔU 除以 U](/obsidian-assets/8c8342f6bb73194a.png)

先写出一般形式，再做一个变换：雅可比矩阵中对 $U$ 求偏导的两列都**乘以 $U$**，相应的未知量换成 $\Delta U/U$。

$$
\begin{bmatrix}\Delta\boldsymbol P\\ \Delta\boldsymbol Q\end{bmatrix}
= -\begin{bmatrix}\boldsymbol H & \boldsymbol N\\ \boldsymbol M & \boldsymbol L\end{bmatrix}
\begin{bmatrix}\Delta\boldsymbol\delta\\ \Delta\boldsymbol U/\boldsymbol U\end{bmatrix},
\qquad
H=\frac{\partial\Delta P}{\partial\delta^T},\ N=\frac{\partial\Delta P}{\partial U^T}U,\ M=\frac{\partial\Delta Q}{\partial\delta^T},\ L=\frac{\partial\Delta Q}{\partial U^T}U
$$

$H$ 为 $(n-1)\times(n-1)$，$N$ 为 $(n-1)\times(n-1-r)$，$M$ 为 $(n-1-r)\times(n-1)$，$L$ 为 $(n-1-r)\times(n-1-r)$。

为什么要乘以 $U$：功率方程里电压总以 $U_iU_j$ 的形式出现，$\dfrac{\partial}{\partial U_j}(\cdots)\,U_j$ 正好把 $U_j$"还原"回来，于是四个子块的表达式长得几乎一样（下面的表格），也便于后面的简化。

### 1.3 雅可比矩阵元素（P6–P7）

元素的推导只用到三角函数的求导。记 $\delta_{ij}=\delta_i-\delta_j$，则对 $\delta_j$（$j\ne i$）求导时 $\partial\delta_{ij}/\partial\delta_j=-1$，所以

$$
\frac{\partial\cos\delta_{ij}}{\partial\delta_j}=\sin\delta_{ij},\qquad
\frac{\partial\sin\delta_{ij}}{\partial\delta_j}=-\cos\delta_{ij}
$$

**非对角元（$j\ne i$）。** 只有第 $j$ 项含 $\delta_j$、$U_j$：

$$
H_{ij}=\frac{\partial\Delta P_i}{\partial\delta_j}=-U_iU_j\left(G_{ij}\sin\delta_{ij}-B_{ij}\cos\delta_{ij}\right)
$$

$$
N_{ij}=\frac{\partial\Delta P_i}{\partial U_j}U_j=-U_iU_j\left(G_{ij}\cos\delta_{ij}+B_{ij}\sin\delta_{ij}\right)
$$

$M_{ij}$、$L_{ij}$ 对 $\Delta Q_i$ 同样求导，可得 $M_{ij}=-N_{ij}$、$L_{ij}=H_{ij}$（见下表）。

**对角元（$j=i$）。** 这时 $\delta_i$ 出现在所有 $\delta_{ij}$（$j\ne i$）里，要把求和里的各项都求导。以 $H_{ii}$ 为例：

$$
H_{ii}=\frac{\partial\Delta P_i}{\partial\delta_i}=U_i\sum_{j\ne i}U_j\left(G_{ij}\sin\delta_{ij}-B_{ij}\cos\delta_{ij}\right)
$$

而 $Q_i=U_i\sum_jU_j(G_{ij}\sin\delta_{ij}-B_{ij}\cos\delta_{ij})$ 中 $j=i$ 的那一项是 $-U_i^2B_{ii}$（$\delta_{ii}=0$），所以上式的求和恰好等于 $Q_i+U_i^2B_{ii}$：

$$
H_{ii}=Q_i+U_i^2B_{ii}
$$

对角元就这样用节点自身的 $P_i$、$Q_i$ 和 $U_i^2G_{ii}$、$U_i^2B_{ii}$ 表示，不必再对求和逐项计算。$N_{ii}$、$M_{ii}$、$L_{ii}$ 的做法相同。这里的 $P_i$、$Q_i$ 是用当前电压**算出**的注入功率。

注意课件的 $\boldsymbol J$ 是**不平衡量** $\Delta P$、$\Delta Q$ 的偏导（所以修正方程前面有负号），下表各元素与"计算功率的偏导"正好差一个负号。

![H 的推导](/obsidian-assets/3cc97895a6640672.png)

![N、M、L 的推导](/obsidian-assets/f21ce172c6732419.png)

| 子块 | 非对角元（$j\ne i$） | 对角元 |
| --- | --- | --- |
| $H$ | $H_{ij}=-U_iU_j(G_{ij}\sin\delta_{ij}-B_{ij}\cos\delta_{ij})$ | $H_{ii}=Q_i+U_i^2B_{ii}$ |
| $N$ | $N_{ij}=-U_iU_j(G_{ij}\cos\delta_{ij}+B_{ij}\sin\delta_{ij})$ | $N_{ii}=-P_i-U_i^2G_{ii}$ |
| $M$ | $M_{ij}=U_iU_j(G_{ij}\cos\delta_{ij}+B_{ij}\sin\delta_{ij})=-N_{ij}$ | $M_{ii}=-P_i+U_i^2G_{ii}$ |
| $L$ | $L_{ij}=-U_iU_j(G_{ij}\sin\delta_{ij}-B_{ij}\cos\delta_{ij})=H_{ij}$ | $L_{ii}=-Q_i+U_i^2B_{ii}$ |

记法：

- 非对角元只有两种：$H_{ij}=L_{ij}$，$M_{ij}=-N_{ij}$；
- 对角元等于"把求和中 $j=i$ 那一项拿出来"：以 $H_{ii}$ 为例，$\partial P_i/\partial\delta_i=U_i\sum_{j\ne i}U_j(-G_{ij}\sin\delta_{ij}+B_{ij}\cos\delta_{ij})$，而 $Q_i$ 的表达式里 $j\ne i$ 部分恰好是它的相反数，$j=i$ 部分是 $-U_i^2B_{ii}$，所以能写成 $Q_i+U_i^2B_{ii}$ 这种只含节点自身量的形式。这里 $P_i$、$Q_i$ 是用当前电压**算出**的注入功率。

### 1.4 讨论（P8–P9）

- $\boldsymbol J$ 为 $2n-2-r$ 阶，比直角坐标的 $2(n-1)$ 阶少 $r$ 阶；
- 不对称，元素随迭代变化，每次都要重算，计算量大；
- 初值取 $U^{(0)}=1$、$\delta^{(0)}=0$（标幺制的好处）；
- 修正：$\delta^{(r+1)}=\delta^{(r)}+\Delta\delta^{(r)}$，$U^{(r+1)}=U^{(r)}+\Delta U^{(r)}$（$\Delta U$ 由解出的 $\Delta U/U$ 乘以 $U$ 得到）；
- 其余步骤与直角坐标相同。

牛顿法收敛性好，但每次迭代都要重新计算并求解 $\boldsymbol J$，内存和计算量都大。1970 年代 Stott 对极坐标牛顿法做了**合理简化**——降阶、常数化，得到 P-Q 分解法，计算快到可以在线运行。

## 2. P-Q 分解法：三步简化（P9–P14）

先看有哪些事实可以利用。高压输电网有三个特点：

- $R\ll X$，所以导纳中 $G_{ij}\ll B_{ij}$；
- 线路两端的相角差不大，通常不超过 $10^\circ\sim20^\circ$，所以 $\cos\delta_{ij}\approx1$，$\sin\delta_{ij}\approx\delta_{ij}$（弧度，数值在 0.2～0.3 以内）；
- 各节点电压都在 1.0 附近，对角元里 $Q_i\ll U_i^2B_{ii}$（2.3 节解释）。

下面三步依次用这些事实：2.1 节忽略 $N$、$M$，使修正方程降阶；2.2、2.3 节把 $H$、$L$ 变成常数。

### 2.1 第一步：$R\ll X$，有功与无功解耦——降阶（P10）

![第一步：忽略 N、M](/obsidian-assets/5edc1f6d16900335.png)

先比较 $H$ 与 $N$ 的非对角元。由本节开头列出的前提，$G_{ij}\ll B_{ij}$、$\cos\delta_{ij}\approx1$、$\sin\delta_{ij}\approx\delta_{ij}$：

$$
H_{ij}=-U_iU_j\left(G_{ij}\sin\delta_{ij}-B_{ij}\cos\delta_{ij}\right)\approx U_iU_jB_{ij},
\qquad
N_{ij}=-U_iU_j\left(G_{ij}\cos\delta_{ij}+B_{ij}\sin\delta_{ij}\right)\approx-U_iU_j\left(G_{ij}+B_{ij}\delta_{ij}\right)
$$

$H_{ij}$ 是 $B_{ij}$ 的量级；$N_{ij}$ 里的 $G_{ij}$ 和 $B_{ij}\delta_{ij}$ 都比 $B_{ij}$ 小一个量级，所以 $N$ 远小于 $H$。同理 $M$ 远小于 $L$。这说明相角的变化主要影响有功 $P$，电压幅值的变化主要影响无功 $Q$。注意这一步同时用到了 $R\ll X$ 和相角差小，缺一个，$N$、$M$ 都不能忽略。

忽略非对角子块 $N$、$M$：

$$
\Delta\boldsymbol P=-\boldsymbol H\,\Delta\boldsymbol\delta,\qquad
\Delta\boldsymbol Q=-\boldsymbol L\,\Delta\boldsymbol U/\boldsymbol U
$$

一个 $2n-2-r$ 阶方程拆成了 $n-1$ 阶和 $n-1-r$ 阶两个小方程——这就是"降阶"。这正是第 6 讲两条结论（相角差决定有功、电压差决定无功）在算法上的体现。

但 $H$、$L$ 仍随迭代变化。怎样把它们变成常数？先看非对角元，再看对角元。

### 2.2 第二步：相角差小（P11）

用上面的结果：相角差不大且 $G_{ij}\ll B_{ij}$，于是 $\cos\delta_{ij}\approx1$，$G_{ij}\sin\delta_{ij}\ll B_{ij}\cos\delta_{ij}$，非对角元简化为

$$
H_{ij}=L_{ij}\approx U_iU_jB_{ij}
$$

### 2.3 第三步：$Q_i\ll U_i^2B_{ii}$（P12–P13）

对角元 $H_{ii}=Q_i+U_i^2B_{ii}$，$L_{ii}=-Q_i+U_i^2B_{ii}$。课件问：$Q_i$ 和 $U_i^2B_{ii}$ 哪个大？

![Q_i 与 U_i²B_ii 的物理意义对比](/obsidian-assets/f72aa528a28e88a7.png)

看它们的物理意义：$Q_i$ 是正常运行时节点 $i$ 流出的无功；$U_i^2B_{ii}$（的绝对值）是**其余所有节点都接地**时，从节点 $i$ 流出的无功——相当于节点 $i$ 周围全部短路时的短路无功。后者当然远大于前者，所以

$$
H_{ii}\approx L_{ii}\approx U_i^2B_{ii}
$$

### 2.4 合起来：$H$、$L\approx UBU$（P14）

![H、L ≈ UBU](/obsidian-assets/b349d02df0ed68b2.png)

非对角元 $U_iU_jB_{ij}$、对角元 $U_i^2B_{ii}$，正好可以写成

$$
\boldsymbol H,\ \boldsymbol L\approx \boldsymbol U\boldsymbol B\boldsymbol U,\qquad \boldsymbol U=\operatorname{diag}(U_1,U_2,\dots)
$$

区别只在维数：$H$ 对应 $n-1$ 个节点（去掉平衡节点），$L$ 只对应 $n-1-r$ 个 PQ 节点。

## 3. P-Q 分解法的修正方程与特点（P15–P18）

### 3.1 修正方程（P15）

![P-Q 分解法修正方程](/obsidian-assets/0969dcc7efbdae33.png)

把 $\boldsymbol H\approx\boldsymbol{UBU}$ 代入 $\Delta\boldsymbol P=-\boldsymbol H\Delta\boldsymbol\delta$，两边左乘 $\boldsymbol U^{-1}$：

$$
\Delta\boldsymbol P/\boldsymbol U = -\boldsymbol B'\,\boldsymbol U\Delta\boldsymbol\delta,\qquad
\Delta\boldsymbol Q/\boldsymbol U = -\boldsymbol B''\,\Delta\boldsymbol U
$$

（$L$ 那一式中 $\boldsymbol{UBU}\cdot\Delta\boldsymbol U/\boldsymbol U=\boldsymbol{UB}\Delta\boldsymbol U$，左乘 $\boldsymbol U^{-1}$ 即得。）再令右边的 $U\approx1$，最终形式为

$$
\boxed{\;\Delta\boldsymbol P/\boldsymbol U = -\boldsymbol B'\,\Delta\boldsymbol\delta,\qquad
\Delta\boldsymbol Q/\boldsymbol U = -\boldsymbol B''\,\Delta\boldsymbol U\;}
$$

$\boldsymbol B'$ 是导纳矩阵虚部去掉平衡节点后的 $(n-1)$ 阶方阵（P$\delta$ 修正），$\boldsymbol B''$ 是只保留 PQ 节点的 $(n-1-r)$ 阶方阵（QV 修正）。

### 3.2 特点（P16）

- 修正方程是**常系数**线性方程；
- $\boldsymbol B'$、$\boldsymbol B''$ 是导纳矩阵的虚部，**稀疏、对称、实数**，迭代中不变，只需分解一次；
- Stott 的快速分解法对 $\boldsymbol B'$、$\boldsymbol B''$ 还有专门的取法（课件只点到为止）：常见的做法是 $\boldsymbol B'$ 只用支路电抗 $1/x$ 形成、不计对地电容等并联支路，$\boldsymbol B''$ 则保留对地支路——对地电容只影响无功和电压，不影响有功；
- 优点：内存小、计算量小，能用于在线分析。

### 3.3 迭代格式（P17）

![P-Q 分解法迭代格式](/obsidian-assets/c9dbee059cdc8d86.png)

$$
\Delta\boldsymbol\delta^{(r)}=-\boldsymbol B'^{-1}(\Delta\boldsymbol P/\boldsymbol U)^{(r)}
\ \to\ \boldsymbol\delta^{(r+1)}=\boldsymbol\delta^{(r)}+\Delta\boldsymbol\delta^{(r)}
\ \to\ \Delta\boldsymbol U^{(r)}=-\boldsymbol B''^{-1}(\Delta\boldsymbol Q/\boldsymbol U)^{(r)}
\ \to\ \boldsymbol U^{(r+1)}=\boldsymbol U^{(r)}+\Delta\boldsymbol U^{(r)}
$$

然后检查 $\lvert\Delta P\rvert$、$\lvert\Delta Q\rvert<\varepsilon$，不满足就 $r+1\to r$ 继续。有功、无功两组方程**交替**求解，算 $\Delta Q$ 时用的已经是刚更新过的相角。

课件总结的四点：

- **适用条件**：三个简化——$R\ll X$、$\delta_{ij}$ 小、$U_i^2B_{ii}\gg Q_i$。超高压输电网满足；$R/X$ 较大的配电网不满足，收敛会变差甚至不收敛；
- **精度只取决于 $\varepsilon$**：简化的只是修正方程（"往哪走、走多远"），误差 $\Delta P$、$\Delta Q$ 仍用完整的功率方程计算。只要收敛，结果与牛顿法一样精确。简化影响的是迭代次数，不影响结果；
- **线性收敛**，迭代次数比牛顿法多；
- 但每次迭代快得多，**总体比牛顿法快**。

### 3.4 几何解释（P18）

![P-Q 分解法的几何解释](/obsidian-assets/39ba3d63d8345b5f.png)

牛顿法每一步用当前点的**切线**找下一个近似值，切线斜率随点变化；P-Q 分解法用的是一条**固定斜率**的直线（常数矩阵），每一步都沿同样的斜率往横轴走。斜率与真实切线有偏差，所以每步走得不那么准，要多走几步；但最终停在 $f(x)=0$ 的同一个根上——精度相同、收敛较慢、每步很快，回答了课件的三个问题。

上一讲 4.1 节 $x^2-2=0$ 的例子已经显示了这一点：每步更新斜率的牛顿法，3 步误差就到 $10^{-6}$；把斜率固定在初值处（$f'(x_0)=2$），每步误差只乘以 0.4 左右，5 步后还有 $2.7\times10^{-3}$。P-Q 分解法的"固定斜率"不是取初值处的斜率，而是由网络参数直接得到的常数矩阵 $\boldsymbol B'$、$\boldsymbol B''$，不依赖当前电压，也就不必每步重算，迭代次数只是适度增加（本讲 4 节点算例 5 次对 3 次）。

## 4. 练习：两节点系统（P19–P22）

![两节点系统](/obsidian-assets/220c195c8f9ad5ec.png)

已知（标幺值）：$\dot S_{D1}=20+j10$，$\dot S_{D2}=19+j10$，$\dot S_{G2}=15+j10$，$\dot U_1=1\angle0^\circ$。线路串联导纳 $-j10$（即 $x=0.1$），两端对地导纳各 $j0.1$。

**节点类型**：节点 1 的电压幅值和相角都给定，是 Vδ 节点；节点 2 的 $P$、$Q$ 都给定（$P_2=P_{G2}-P_{D2}=-4$，$Q_2=Q_{G2}-Q_{D2}=0$），是 PQ 节点。

**导纳矩阵**：$Y_{11}=Y_{22}=-j10+j0.1=-j9.9$，$Y_{12}=Y_{21}=j10$。$G=0$，$B_{11}=B_{22}=-9.9$，$B_{12}=10$。

**潮流方程**：$G=0$ 时功率方程只剩 $B$ 项，取 $\delta_1=0$、$\delta_2=\delta_{21}$：

$$
\begin{cases}
\Delta P_2 = -4 - 10U_2\sin\delta_2 = 0\\
\Delta Q_2 = -9.9U_2^2 + 10U_2\cos\delta_2 = 0
\end{cases}
$$

**解析解**：由第二式 $\cos\delta_2=0.99U_2$，第一式 $\sin\delta_2=-0.4/U_2$，平方相加：

$$
0.9801U_2^4 - U_2^2 + 0.16 = 0
\ \Rightarrow\
U_2^2=\frac{1\pm\sqrt{1-0.627}}{1.960}=0.822\ \text{或}\ 0.199
$$

课件取的是 $U_2=0.906$、$\delta_2=-26.2^\circ$。方程其实还有**第二个解** $U_2=0.446$、$\delta_2=-63.8^\circ$（课件没有提）：数学上同样满足潮流方程，但电压低得离谱，是物理上不可行的"低电压解"。这正是上一讲提纲里"物理可行的潮流解"的含义：潮流方程是非线性的，解可能不止一个；从平启动 $U=1$ 出发，牛顿法会收敛到靠近额定电压的那个高电压解。

**牛顿法与 P-Q 分解法的维数**（课件追问）：未知量 $\delta_2$、$U_2$，牛顿法 $\boldsymbol J$ 为 $2\times2$；P-Q 分解法 $\boldsymbol B'$、$\boldsymbol B''$ 都是 $1\times1$（$B_{22}=-9.9$；按 Stott 的取法 $\boldsymbol B'$ 不计对地支路，为 $-10$）。

**节点 1 的注入功率与网损**（P22）：

![节点 1 的功率与网损](/obsidian-assets/226cb37136e81479.png)

$$
P_1=U_2B_{12}\sin(-\delta_2)=10\times0.906\times\sin26.2^\circ=4.0,\qquad
Q_1=-\sum_jU_jB_{1j}\cos\delta_{1j}=9.9-10\times0.906\times\cos26.2^\circ\approx1.77
$$

$P_{G1}=P_1+P_{D1}=24$，$Q_{G1}=Q_1+Q_{D1}\approx11.77$。有功网损 $\Delta P_L=P_1+P_2=4-4=0$（线路没有电阻）。

> 课件写 $Q_1=1.73$，按上式精确计算应为 1.77 左右。可以用无功平衡核对：线路电抗消耗 $\lvert\dot U_1-\dot U_2\rvert^2/x=0.4414^2/0.1=1.95$，两端电容发出 $0.1\times(1^2+0.906^2)=0.18$，两者之差 1.77 必须由节点 1 送出（节点 2 的 $Q_2=0$）。

**改成 PV 节点**：$U_2=0.906$ 偏低。若节点 2 的发电机能调无功，就放开 $Q_{G2}$（变为未知量），给定 $U_2=1$，节点 2 由 PQ 变为 PV。课件留的问题：此时极坐标下有几个方程？$\boldsymbol J$ 几阶？$\boldsymbol B'$、$\boldsymbol B''$ 呢？——未知量只剩 $\delta_2$，1 个方程，$\boldsymbol J$ 为 $1\times1$，$\boldsymbol B'$ 为 $1\times1$，$\boldsymbol B''$ 为空（没有 PQ 节点）。顺手算出结果（课件之外）：$10\sin\delta_2=-4$，$\delta_2=-23.6^\circ$；$Q_2=9.9-10\cos23.6^\circ=0.735$，即 $Q_{G2}=10.735$，节点 2 的发电机要多发 0.735 的无功才能把电压撑到 1.0。

## 5. 4 节点系统的 P-Q 分解法迭代（P23–P29）

与上一讲牛顿法算例是同一个系统：节点 1、2 为 PQ 负荷（$-0.3-j0.18$、$-0.55-j0.13$），节点 3 为 PV（$P_3=0.5$、$U_3=1.1$），节点 4 为平衡节点（$1.05\angle0^\circ$），$\varepsilon=10^{-4}$。课件 P-Q 分解法的初值中节点 3 直接取给定的 $U_3=1.1$。

| 迭代 | $\Delta\dot S_1$ | $\Delta\dot S_2$ | $\Delta P_3$ | 节点 1 / 2 / 3 电压 |
| --- | --- | --- | --- | --- |
| $r=0$ | $-0.277-j0.0454$ | $-0.526+j0.132$ | $0.5$ | $1\angle0^\circ$ / $1\angle0^\circ$ / $1.1\angle0^\circ$ |
| $r=1$ | $0.041+j0.002$ | $0.014+j0.0015$ | $-0.035$ | $0.984\angle-0.74^\circ$ / $0.964\angle-6.74^\circ$ / $1.1\angle7.0^\circ$ |
| $r=2$ | $-0.0006-j0.0002$ | $-0.001-j0.0002$ | $-0.0007$ | $0.985\angle-0.47^\circ$ / $0.965\angle-6.42^\circ$ / $1.1\angle6.77^\circ$ |
| $r=3$ | $0.0003+j0.0002$ | $\approx0$ | $-0.0003$ | $0.985\angle-0.50^\circ$ / $0.965\angle-6.45^\circ$ / $1.1\angle6.73^\circ$ |
| $r=4$ | $-0.0004-j0.0001$ | $\approx0$ | $-0.0002$ | $0.985\angle-0.49^\circ$ / $0.965\angle-6.44^\circ$ / $1.1\angle6.75^\circ$ |
| $r=5$ | 0 | 0 | 0 | 收敛 |

与牛顿法对比：

- **初值与第 0 次误差**：两讲课件的平启动初值不同（上一讲节点 3 取 $1+j0$，本讲取给定的 $1.1$），第 0 次的无功误差因此对不上（上一讲 $\Delta\dot S_1=-0.277-j0.417$、$\Delta\dot S_2=-0.526+j0.0196$，本讲为 $-0.277-j0.0454$、$-0.526+j0.132$）；有功误差则完全一致。课件没有给出线路参数，这里只引用课件数字，无法复核；
- **结果相同**：收敛后节点 1、2、3 的电压与上一讲牛顿法的结果（$0.985\angle-0.5^\circ$、$0.965\angle-6.4^\circ$、$1.1\angle6.73^\circ$）一致，印证"精度只取决于 $\varepsilon$"；
- **迭代次数更多**：牛顿法 3 次，P-Q 分解法 5 次；
- **线性收敛的样子**：$r=2$ 以后误差停在 $10^{-4}$ 量级附近来回摆动（$r=3$ 为 $3\times10^{-4}$，$r=4$ 反而是 $4\times10^{-4}$），不像牛顿法那样每步平方缩小。

### 5.1 最终潮流与网损

![P-Q 分解法收敛后的潮流分布](/obsidian-assets/0f336da5f1238497.png)

图上每条支路两端各标了一个功率（流入支路为正）：

| 支路 | 送端功率 | 受端功率 | 支路损耗 |
| --- | --- | --- | --- |
| 4 → 2 | $0.320+j0.160$ | $-0.31-j0.14$ | $0.010+j0.020$ |
| 4 → 1 | $0.048+j0.105$ | $-0.046-j0.136$ | $0.002-j0.031$ |
| 1 → 2 | $0.246-j0.015$ | $-0.234+j0.011$ | $0.012-j0.004$ |
| 3 → 1（变压器） | $0.5+j0.093$ | $-0.5-j0.029$ | $0+j0.064$ |

几个可以读出来的规律：

- **节点功率平衡**：流入节点 2 的有功 $0.31+0.234=0.544\approx0.55$，正好是负荷；节点 1 收到 $0.046+0.5$、送出 $0.246$，净得 $0.30$，也等于负荷。
- **平衡节点出力**：$\dot S_4=(0.320+0.048)+j(0.160+0.105)=0.368+j0.265$。
- **全网损耗**（回答上一讲 P39 的问题）：发电 $P=0.368+0.5=0.868$，负荷 $0.85$，有功网损约 $0.018$；无功发电 $0.265+0.093=0.358$，负荷 $0.31$，净无功损耗约 $0.048$。这些网损在计算前是未知的，平衡节点的出力 $0.368+j0.265$ 是算出来的，正好把它们补上——这正是需要平衡节点的原因。
- **有功顺着相角往下流**：节点 3（$6.73^\circ$）→ 1（$-0.5^\circ$）→ 2（$-6.45^\circ$），节点 4（$0^\circ$）也向 1、2 送电。
- **4→1 线路的受端无功比送端还大**（$0.136>0.105$），损耗为负：这条线路轻载，对地电容发出的充电无功超过了电抗消耗的无功（第 6 讲 3.3 节）。
- **变压器没有有功损耗**（算例中忽略了电阻），但吸收了 $0.064$ 的无功。

## 6. 交互控件：牛顿法与 P-Q 分解法对比

3 节点系统，控件里实际跑了极坐标牛顿法和 P-Q 分解法。把"线路电阻倍数"调大，就能看到第 3.3 节说的适用条件：$R/X$ 接近 1 时 P-Q 分解法迭代次数明显增多，牛顿法几乎不受影响。

![widget|520](/obsidian-assets/4a4c27828967209a.html)

下面的控件对应第 4 节的两节点系统：拖动节点 2 的负荷，看潮流方程两个解的变化。负荷增大时高、低两个电压解互相靠近，在"鼻尖"处合并，再加负荷就无解——这条曲线就是电压稳定分析里的 P-U 曲线。

![widget|560](/obsidian-assets/36f8cb77dae76f61.html)

## 7. 小结

| 对比 | 牛顿法（极坐标） | P-Q 分解法 |
| --- | --- | --- |
| 修正方程 | $[\Delta P;\Delta Q]=-\begin{bmatrix}H&N\\M&L\end{bmatrix}[\Delta\delta;\Delta U/U]$ | $\Delta P/U=-B'\Delta\delta$，$\Delta Q/U=-B''\Delta U$ |
| 系数矩阵 | $2n-2-r$ 阶，不对称，每次迭代重算 | $n-1$ 阶和 $n-1-r$ 阶，对称、常数，只分解一次 |
| 收敛 | 二阶，次数少（算例 3 次） | 线性，次数多（算例 5 次） |
| 每次迭代 | 慢 | 快 |
| 精度 | 由 $\varepsilon$ 决定 | 由 $\varepsilon$ 决定，与牛顿法相同 |
| 适用 | 通用 | 要求 $R\ll X$、$\delta_{ij}$ 小、$Q_i\ll U_i^2B_{ii}$（高压输电网） |

## 8. 第 3 章回顾与下一讲

第 3 章从手算走到了计算机算法，每一讲都是为了解决上一讲留下的问题：

| 讲 | 要解决的问题 | 做法 | 留下的问题 |
| --- | --- | --- | --- |
| 6 | 简单网络怎么手算潮流 | 电压降落、损耗公式，开式网逐段递推 | 复杂网络没法统一处理 |
| 7 | 怎样用统一形式描述任意网络 | 节点导纳矩阵，功率方程 | 变量比方程多，方程非线性 |
| 8 | 哪些量给定；怎样求解 | 节点类型；高斯法、牛顿法 | 牛顿法每步要重算、求解雅可比矩阵 |
| 9 | 怎样让牛顿法更快 | 极坐标 + 三步简化，P-Q 分解法 | — |

潮流计算的结果会显示运行状态：某些节点电压越限，某些发电机无功到顶，线路过载。第 4 章转向"怎样控制运行方式"。下一讲从其中最常见的问题开始：电压偏离额定值时，无功功率与电压之间是什么关系，怎样把电压调回允许范围。
