---
blog: true
title: "高等电路网络分析：形成网络方程的系统化方法"
slug: "高等电路网络分析-形成网络方程的系统化方法-hcna01"
summary: "从网络的概念出发，拆解元件特性约束与拓扑约束（KCL/KVL），引入图论基本定义与关联矩阵、回路矩阵、割集矩阵，给出系统化形成电力网络方程的方法与习题。"
date: 2026-09-15
category: "高等电路网络分析"
featured: false
tags:
  - "电路网络分析"
  - "网络拓扑"
  - "关联矩阵"
  - "电力系统"
  - "课程笔记"
---

### 1.1 网络的概念
#### 1.1.1 网络的概念
电力系统由电源、电力网络、负荷三部分组成。
电力网络包括了输电和配电线路、变压器和移相器、开关、并联和串联电容器、并联和串联电抗器等元件，按一定的形式联结成一个总体，达到输送和分配电能的目的。
电力网络包含了两个内容：**元件**以及**元件之间的联结**。电力网络的电气运行性能受到两个约束，即**元件特性的约束**和**联结关系的约束（拓扑约束）**。
**1. 元件特性的约束**
电力网络元件的电气特性在一定的条件下，可以用一条或几条等值支路来表示。例如不太长的输电线路研究其在工频下的电气特性，可以用一条支路或三条支路组成的 $\pi$ 型电路来表示。支路的参数（$R,L,C$）是元件特性的表现，它制约着支路电压 $u$ 和支路电流 $i$ 之间的关系。对支路 $j$ 来说有下列表达式：
$$
\begin{aligned}
R_j i_j &= u_j \\
\frac{\mathrm{d}L_j i_j}{\mathrm{d}t} &= u_j \\
\int_j \frac{1}{C_j} i_j \mathrm{d}t &= u_j
\end{aligned}
\tag{1-1}
$$
当参数 $R_j, L_j, C_j$ 与电量无关，则该支路为线性支路；组成该元件的支路均为线性支路，则该元件为线性元件；网络中所有元件均为线性元件，则该网络称为线性网络。若网络中至少包含了一个非线性支路，即该支路的参数是电量的函数，则该网络是非线性网络。元件特性的约束与支路的联结无关。
**2. 网络拓扑的约束**（KCL和KVL）
它反映网络中各元件，即各支路之间的联结关系。它与元件的特性，即与各支路的参数无关，因此，当不考虑网络中各支路的参数，网络可以抽象成一些抽象的支路和由它们联结成的节点。网络的拓扑约束集中表现为基尔霍夫定律（Kirchhoff's Laws）。
对于节点 $j$（包括广义节点），与节点 $j$ 相关联的各支路电流 $i$ 之间符合基尔霍夫电流
定律（Kirchhoff Current Law, KCL）：
$$
\sum_{i \in j} i_i = 0 \tag{1-2}
$$
$i \in j$ 表示所有和节点 $j$ 相关联的支路。对于闭合回路 $l$，回路中的各支路电压 $u_i$ 之间符合基尔霍夫电压定律（Kirchhoff Voltage Law, KVL）：
$$
\sum_{i \in l} u_i = 0 \tag{1-3}
$$
式中 $i \in l$ 表示所有在回路 $l$ 中的支路。
### 1.2 电力网络的拓扑约束
#### 1.2.1 图的概念和一些基本定义
我们只研究网络的拓扑约束时，与网络元件的特性，即具体的支路参数无关，可以把网络的联结关系抽象成一个图（Graph）。图的理论和应用随着计算机技术的兴起而得到很大的发展，在许多专门著作[12]中有详细的叙述。下面仅就本书中用到的一些术语作简要的介绍。
**图**（Graph）是抽象支路和节点的集合。它反映图中所包含的各支路之间的联结关系，即节点与支路之间的关系。在电气工程领域，电网图**大多是稀疏图，而且往往是或者接近平面图**
**节点**（Node），亦称**顶点**（Vertex），是支路的连接点。
**支路**（Branch），亦称**边**（Edge），一条支路有两个端点，即它与两个节点关联[不包括自回路（Self-Loop）]。
**关联**（Incident），用 $k(i, j)$ 表示，即支路 $k$ 与节点 $i, j$ 关联。
**节点的度**（Degree），节点所关联的支路数。
**路径**（Path）（实际上是简单路径），在图 G 中，从始点出发经过若干支路和节点到达终点，其中的**支路和节点均不能重复出现**，形成的一个开列边（Open Edge Train）称为路径。显然，路径中的内部顶点（Interior Vertices）的度只能是 2，而始点和终点的度为 1。
**回路**（Loop）（实际上是简单回路），即闭合的路径（Closed Path），路径中的始点和终点重合，回路中所有节点的度均为 2。
**连通图**（Connected Graph），图 G 中任何一对顶点之间至少有一条路径，则该图为连通图。
**有向图**（Oriented Graph），图 G 中的每一个支路都有规定的方向。
我们研究的电力网络一般均抽象成有向的连通图。
**子图**（Subgraph），图 $G_i$ 的边集和节点集均属于图 G 的边集和节点集，并为其子集，则图 $G_i$ 为图 G 的子图。
**树**（Tree）（这里指生成树）和**树支**（Tree Branches, Twigs），具有 $N+1$ 个节点，$b$ 条支路的连通图 G 的一个连通子图 $G_t$，它包含 G 中的所有节点，但不包含任何回路，则该连通子图 $G_t$ 称为图 G 的一棵树。树中所含的支路称为树支，它一定只有 $N$ 条，即树支数一定为 $N$。
**补树**（Cotree）和**连支**（Link），包含所有存在于图 G（有 $N+1$ 个节点，$b$ 条支路）中而不存在于其对应的树 $G_t$ 中的支路的子图称为图 G 的树 $G_t$ 的补树。补树中所含的支路称为连支，连支数一定为 $b-N$。
对于一个具体图 G 来说，其树的选定有任意性，即可以有多种选择，但一旦选定以后，则树支和连支就有确定性。
**基本回路**（Basic Loop），每一个回路必然包含不少于一条连支。只包含一条连支的回路称为基本回路。对于一个连通图 G 来说，基本回路数必然与其连支数相对应。
**割集**（Cutset）和**基本割集**（Basic Cutset），连通图 G 中的一个支路的最小集合，它把图 G 分割成两个互不连通的子图（其中一个子图可以是一个孤立的节点），这个支路集合称为图 G 的一个割集。割集是分割出来的部分与图 G 其他部分之间的联系，分割出来的部分是图 G 的一个广义节点。每一个割集至少包含一条树支。仅包含一条树支的割集称为基本割集。对于图 G 来说基本割集数必然与树支数相对应。
在网络分析中，对于包括有 $N+1$ 个节点 $b$ 条支路的图 G，为了使每个节点量有确定的意义，一定要确定一个参考节点，即图 G 的独立节点数为 $N$，称为图 G 的**秩**（Rank），因此有如下的关系：
$$
\text{独立节点数} = \text{树支数} = \text{基本割集数} = \text{秩} = N;
$$
$$
\text{基本回路数} = \text{连支数} = b - N = L_{\circ}
$$
#### 1.2.2 关联矩阵和关联矢量
网络的拓扑特性（联结关系）可以用一个图来形象表示，但为了便于应用计算机，也可以用一张表——矩阵来表示，描述网络拓扑结构的矩阵为关联矩阵（Incident Matrix）。由于可以从不同的角度、用不同的形式来说明联结关系，因此就有不同的关联矩阵。
为了叙述方便，本书中所有在矩阵下标中有运算符×的表示矩阵的阶次，例如，$A_{(N+1) \times b}$ 表示矩阵 $A$ 是 $N+1$ 行 $b$ 列矩阵。
节（点）-支（路）关联矩阵 $\bar{A}$（Node-Branch Incident Matrix），有向连通图 $G$ 有 $N+1$ 个节点，$b$ 条支路，其中第 $l$ 条支路从节点 $i$ 出发，到节点 $j$ 终止。则其 $(N+1) \times b$ 阶节-支关联矩阵 $\bar{A}$ 有如下形式：
![](/obsidian-assets/810e4627abd886c5.png)
这里只给出了第 $l$ 列中非零元素的情况。$\bar{A}$ 矩阵有 $N+1$ 个行矢量，表示每一个节点和哪些支路相关联；有 $b$ 个列矢量，表示每一条支路和哪两个节点相关联；非零元素的正负表示支路的方向；这些列矢量称为**关联矢量（Incident Vector）**。
由于每一个列矢量只有两个非零元素，每一个行矢量的非零元素数等于该节点的度，所以节-支关联矩阵 $\bar{A}$ 是非常稀疏的。另外，$N+1$ 个行矢量是线性相关的，为了使之线性无关，就要将参考节点从节-支关联矩阵中删除，我们称删除了参考节点所对应的行的节-支关联矩阵为降阶节-支关联矩阵 $A$，它是 $N \times b$ 阶矩阵。如果在支路的安排上适当地调正，把树支放在前面，连支集中在后面，则有如下的形式：
![](/obsidian-assets/7024a77b0ebfa157.png)
式中 $A_T$ 和 $A_L$ 分别表示 $A$ 矩阵中和树支有关的部分以及和连支有关的部分。由于电力网络分析中最常用是节点分析法，所以节-支关联矩阵和关联矢量用得最广泛。电力网络分析中有时也可以用回路分析法[26,27]和割集分析法，所以还有回-支关联矩阵和割-支关联矩阵。
回（基本回路）-支（路）关联矩阵 $B$（Basic Loop-Branch Incident Matrix）（回路矩阵），由于基本回路中仅包含一条连支，基本回路数等于连支数，可以加以适当的安排，上述的图 G 有下列形式的回-支关联矩阵：
$$
\boldsymbol{B}_{L \times b} =
\begin{array}{c}
\begin{array}{cc}
\text{支路} & \\
\end{array} \\
\begin{array}{c}
\text{基本回路} \\
\end{array}
\begin{array}{|c|c|}
\hline
\begin{array}{c}
1 \\
\vdots \\
\vdots \\
L
\end{array} &
\begin{array}{cc}
\boldsymbol{B}_T & \boldsymbol{B}_L \\
(L \times N) & (L \times L)
\end{array} \\
\hline
\begin{array}{cc}
\text{树支} & \text{连支}
\end{array} &
\end{array}
\end{array}
= [\boldsymbol{B}_T \quad \boldsymbol{B}_L] \tag{1-6}
$$
其中 $\boldsymbol{B}_L$ 是单位矩阵，即 $\boldsymbol{B}_L = \boldsymbol{1}$，$\boldsymbol{B}_T$ 是 $\boldsymbol{B}$ 矩阵中和树支有关的部分，所以（统一按照先树枝后连枝来排列）
$$
\boldsymbol{B} = [\boldsymbol{B}_T \quad \boldsymbol{1}] \tag{1-7}
$$
**割（基本割集）-支（路）关联矩阵 $\boldsymbol{Q}$** (Basic Cutset-Branch Incident Matrix)，由于基本割集中仅包含一条树支，基本割集数等于树支数，加以适当安排，图 G 有下列形式的割-支关联矩阵：
$$
\boldsymbol{Q}_{N \times b} =
\begin{array}{c}
\begin{array}{cc}
\text{支路} & \\
\end{array} \\
\begin{array}{c}
\text{基本割集} \\
\end{array}
\begin{array}{|c|c|}
\hline
\begin{array}{c}
1 \\
\vdots \\
\vdots \\
N
\end{array} &
\begin{array}{cc}
\boldsymbol{Q}_T & \boldsymbol{Q}_L \\
(N \times N) & (N \times L)
\end{array} \\
\hline
\begin{array}{cc}
\text{树支} & \text{连支}
\end{array} &
\end{array}
\end{array}
= [\boldsymbol{Q}_T \quad \boldsymbol{Q}_L] \tag{1-8}
$$
其中 $\boldsymbol{Q}_T$ 是 $N \times N$ 阶单位矩阵，$\boldsymbol{Q}_T = \boldsymbol{1}$，$\boldsymbol{Q}_L$ 是 $\boldsymbol{Q}$ 中和连支有关的部分，所以
$$
\boldsymbol{Q} = [\boldsymbol{1} \quad \boldsymbol{Q}_L] \tag{1-9}
$$
### 1.2.3 三种关联矩阵 $\boldsymbol{A}, \boldsymbol{B}, \boldsymbol{Q}$ 之间的关系
既然同一张图可以用不同形式的关联矩阵来表示，那么这些表示同一客体的不同形式之间必然存在着相互变换的关系，这些变换关系就为不同的网络分析方法提供了相互沟通的途径。三种关联矩阵之间的变换关系如下：
$$
\boldsymbol{A}\boldsymbol{B}^T = \boldsymbol{0}_{N \times L}, \quad \boldsymbol{B}\boldsymbol{A}^T = \boldsymbol{0}_{L \times N} \tag{1-10}
$$
前者是因为环路的+1和-1的总进出和为0，因此有
$$
[\boldsymbol{B}_T \quad \boldsymbol{1}]
\begin{bmatrix}
\boldsymbol{A}_T^T \\
\boldsymbol{A}_L^T
\end{bmatrix}
= \boldsymbol{0}
$$
$$
\boldsymbol{B}_T\boldsymbol{A}_T^T + \boldsymbol{A}_L^T = \boldsymbol{0}
$$
所以
$$
\boldsymbol{B}_T = -\boldsymbol{A}_L^T(\boldsymbol{A}_T^T)^{-1} \tag{1-11}
$$
(1-11)式给出了 $\boldsymbol{A}$ 和 $\boldsymbol{B}$ 之间的变换。同样对于广义节点，同理，也有类似的关系：
$$
\boldsymbol{Q}\boldsymbol{B}^T = \boldsymbol{0}_{N \times L}, \quad \boldsymbol{B}\boldsymbol{Q}^T = \boldsymbol{0}_{L \times N} \tag{1-12}
$$
$$
[\boldsymbol{B}_T \quad \boldsymbol{1}]
\begin{bmatrix}
\boldsymbol{1} \\
\boldsymbol{Q}_L^T
\end{bmatrix}
= \boldsymbol{0}
$$
所以
$$
\boldsymbol{B}_T = -\boldsymbol{Q}_L^T \quad \text{或} \quad \boldsymbol{Q}_L = -\boldsymbol{B}_T^T \tag{1-13}
$$
(1-13)式给出了 $\boldsymbol{B}$ 和 $\boldsymbol{Q}$ 之间的变换。它说明在一个基本割集中包括一条树支和若干条连支，那么分别由这些连支所构成的基本回路中，必然都包含着这同一条树支。
由(1-11)式和(1-13)式，可以得到
$$
\boldsymbol{Q}_L = (\boldsymbol{A}_L^T(\boldsymbol{A}_T^T)^{-1})^T = \boldsymbol{A}_T^{-1}\boldsymbol{A}_L \tag{1-14}
$$
(1-14)式给出了 $\boldsymbol{Q}$ 和 $\boldsymbol{A}$ 之间的变换。
### 1.2.4 网络拓扑约束——基尔霍夫定律的表达
对于有 $N+1$ 个节点 $b$ 条支路的连通图 G，它有：
独立节点数 = 树支数 = 基本割集数 = $N$；
基本回路数 = 连支数 = $b - N = L$
首先定义物理量：
$\boldsymbol{i}_b = [i_1 \quad i_2 \quad \cdots \quad i_b]^T$ —— 支路电流（$b$ 维）列矢量。
$\boldsymbol{u}_n = [u_1 \quad u_2 \quad \cdots \quad u_N]^T$ —— 节点电压（$N$ 维）列矢量。
$\boldsymbol{u}_b = [u'_1 \quad u'_2 \quad \cdots \quad u'_b]^T$ —— 支路电压（$b$ 维）列矢量。
$\boldsymbol{i}_l = [i^1 \quad i^2 \quad \cdots \quad i^L]^T$ —— 回路电流（$L$ 维）列矢量。
$\boldsymbol{u}_g = [u^1 \quad u^2 \quad \cdots \quad u^N]^T$ —— 割集电压（$N$ 维）列矢量。
每一个基本割集中所包含的树支的支路电压的集合定义为**割集电压**。
把所有的 $b$ 条支路分为 $N$ 条树支和 $L$ 条连支并加以适当排列，则支路电流和支路电压有如下形式：
$$
\boldsymbol{i}_b = [i_T^T \quad i_L^T]^T \tag{1-15}
$$
$$
\boldsymbol{u}_b = [u_T^T \quad u_L^T]^T \tag{1-16}
$$
其中

$$
\begin{aligned}
i_T &= [i_1 \quad i_2 \quad \cdots \quad i_N]^T \\
i_L &= [i_{N+1} \quad \cdots \quad i_b]^T \\
u_T &= [u'_1 \quad u'_2 \quad \cdots \quad u'_N]^T = \boldsymbol{u}_g  \\
u_L &= [u'_{N+1} \quad \cdots \quad u'_b]^T
\end{aligned}
$$

基尔霍夫两个定律有如下形式：
KCL
$$
\boldsymbol{A} \boldsymbol{i}_b = \boldsymbol{0} \tag{1-18}
$$
KVL
$$
\boldsymbol{B} \boldsymbol{u}_b = \boldsymbol{0} \tag{1-19}
$$
(1-18)式和(1-19)式分别表示节点电流为零和回路电压为零。
基尔霍夫定律除了上述两个基本表达式外，由于电力网络分析中经常用到其他形式的物理量和其他分析方法，因此基尔霍夫定律还有其他一些表达形式。
**1. 基尔霍夫电压定律的其他表达形式**
$$
\boldsymbol{A}^T\boldsymbol{u}_n = \boldsymbol{u}_b \tag{1-20}
$$
它建立了节点电压和支路电压之间的变换关系。
由(1-19)式 $\boldsymbol{B} \boldsymbol{u}_b = [\boldsymbol{B}_T \quad \boldsymbol{1}] \begin{bmatrix} \boldsymbol{u}_T \\ \boldsymbol{u}_L \end{bmatrix} = \boldsymbol{0}$
所以有
$$
-\boldsymbol{B}_T\boldsymbol{u}_T = \boldsymbol{u}_L \tag{1-21}
$$
并因 $-\boldsymbol{B}_T = \boldsymbol{Q}_L^T, \quad \boldsymbol{u}_T = \boldsymbol{u}_g$，所以
$$
\boldsymbol{Q}_L^T\boldsymbol{u}_T = \boldsymbol{u}_L \tag{1-22}
$$
$$
\boldsymbol{Q}_L^T\boldsymbol{u}_g = \boldsymbol{u}_L \tag{1-23}
$$
因为 $\boldsymbol{Q}_T = \boldsymbol{Q}_T^T = \boldsymbol{1}$，若将式(1-22)加以扩展，有
$$
\begin{bmatrix} \boldsymbol{Q}_T^T\boldsymbol{u}_T \\ \boldsymbol{Q}_L^T\boldsymbol{u}_T \end{bmatrix} = \begin{bmatrix} \boldsymbol{u}_T \\ \boldsymbol{u}_L \end{bmatrix} = \boldsymbol{u}_b
$$
所以
$$
\boldsymbol{Q}^T\boldsymbol{u}_T = \boldsymbol{u}_b \quad \text{或} \quad \boldsymbol{Q}^T\boldsymbol{u}_g = \boldsymbol{u}_b \tag{1-24}
$$
(1-21)式到(1-23)式说明了网络中树支的支路电压和连支的支路电压之间的关系，并且可以利用不同的关联矩阵加以变换；(1-24)式则可从已知网络树支的支路电压 $\boldsymbol{u}_T$ 扩展求得网络的支路电压 $\boldsymbol{u}_b$，它们都是 KVL 另一种表达形式。
**2. 基尔霍夫电流定律的其他表达形式**
$$
\boldsymbol{B}^T\boldsymbol{i}_l = \boldsymbol{i}_b \tag{1-25}
$$
它建立了支路电流和回路电流之间的变换关系。
由(1-18)式， $\boldsymbol{A} \boldsymbol{i}_b = [\boldsymbol{A}_T \quad \boldsymbol{A}_L] \begin{bmatrix} \boldsymbol{i}_T \\ \boldsymbol{i}_L \end{bmatrix} = \boldsymbol{0}$
$$
-\boldsymbol{A}_T\boldsymbol{i}_T = \boldsymbol{A}_L\boldsymbol{i}_L \tag{1-26}
$$
并因 $\boldsymbol{A}_T^{-1}\boldsymbol{A}_L = \boldsymbol{Q}_L$， 所以
$$
-\boldsymbol{i}_T = \boldsymbol{A}_T^{-1}\boldsymbol{A}_L\boldsymbol{i}_L = \boldsymbol{Q}_L\boldsymbol{i}_L \tag{1-27}
$$
(1-26)式和(1-27)式说明了网络中树支的支路电流和连支的支路电流之间的关系，它们是 KCL 另一种表达式。
由(1-27)式，因为 $\boldsymbol{Q}_T = \boldsymbol{1}$ 是单位矩阵，所以
$$
\boldsymbol{i}_T + \boldsymbol{Q}_L\boldsymbol{i}_L = [\boldsymbol{1} \quad \boldsymbol{Q}_L] \begin{bmatrix} \boldsymbol{i}_T \\ \boldsymbol{i}_L \end{bmatrix} = \boldsymbol{Q} \boldsymbol{i}_b = \boldsymbol{0} \tag{1-28}
$$
(1-28)式更广义地叙述了 KCL。对于一个电力网络，由一个闭合面分割出一个独立部分，穿过闭合面的所有支路组成一个割集，其所有支路的支路电流代数和为零。这一个独立部分是一个广义节点。
一个电力网络，其所有支路的支路电压与支路电流乘积的代数和为零：
$$
\boldsymbol{u}_b^T\boldsymbol{i}_b = \sum_{i \in b} u_i i_i = 0 \tag{1-29}
$$
**证明：** 由于 $\boldsymbol{u}_b = \boldsymbol{A}^T\boldsymbol{u}_n$， 所以
$$
\boldsymbol{u}_b^T\boldsymbol{i}_b = (\boldsymbol{A}^T\boldsymbol{u}_n)^T\boldsymbol{i}_b = \boldsymbol{u}_n^T\boldsymbol{A}\boldsymbol{i}_b = 0
$$

**证毕**
(1-29)式就是特勒根定理（Tellegen Theorem）。它的导出只是应用了基尔霍夫两个定律，与元件的特性无关。因此，不论元件特性是线性的或非线性的，有源的或无源的，定常的或时变的，它都是有效的。它说明网络给予各支路的功率的总和恒等于零，正说明基尔霍夫定律是能量守恒定律的一种表现形式。
### 1.3 电力网络支路特性的约束
#### 1.3.1 一般支路及其退化
一个一般的支路 $k$，如图 1.1(a) 所示。它包含有电动势源 $e_k$，以支路电流 $i_k$ 的方向为电压升的正方向；电流源 $i_{sk}$；支路的参数可以用支路阻抗 $z_k$ 或支路导纳 $y_k$ 来表示，$z_k = y_k^{-1}$；支路电压 $u_k$ 以支路电流 $i_k$ 的方向为电压降的正方向。
元件特性的约束有如下的形式，我们称之为支路方程：
$$
u_k + e_k = z_k(i_k + i_{sk}) \tag{1-30}
$$
或
$$
i_k + i_{sk} = y_k(u_k + e_k) \tag{1-31}
$$
一般支路在不同的情况下有三种退化，即在图 1.1 中：(b) 支路内没有电动势源；(c) 支路内没有电流源；(d) 支路内既无电动势源也无电流源。则其相应的支路方程有：
$$
u_k = z_k(i_k + i_{sk}), \text{ 或 } y_k u_k = i_k + i_{sk} \tag{1-32}
$$
$$
u_k + e_k = z_k i_k, \text{ 或 } y_k(u_k + e_k) = i_k \tag{1-33}
$$
$$
u_k = z_k i_k, \text{ 或 } y_k u_k = i_k \tag{1-34}
$$
![](/obsidian-assets/481f9caf33df5c79.png)
**图 1.1 一般支路及其退化**
支路电动势源 $e_k$ 和支路电流源 $i_{sk}$ 可以通过下列关系进行变换：
$$
z_k i_{sk} = -e_k \tag{1-35}
$$
$$
y_k e_k = -i_{sk} \tag{1-36}
$$
#### 1.3.2 网络支路方程和原始阻抗（导纳）矩阵
Kron 首先提出了原始阻抗矩阵（Primitive Impedance Matrix）的概念。把网络内所有支路方程集合在一起，引入电动势源矢量和电流源矢量：
$$
\begin{aligned}
\boldsymbol{e}_s &= [e_1 \quad \cdots \quad e_k \quad \cdots \quad e_b]^T \\
\boldsymbol{i}_s &= [i_{s1} \quad \cdots \quad i_{sk} \quad \cdots \quad i_{sb}]^T
\end{aligned}
$$
可以得到网络的支路方程：
$$
\boldsymbol{u}_b + \boldsymbol{e}_s = \boldsymbol{z}_b(\boldsymbol{i}_b + \boldsymbol{i}_s) \tag{1-37}
$$
或
$$
\boldsymbol{y}_b(\boldsymbol{u}_b + \boldsymbol{e}_s) = \boldsymbol{i}_b + \boldsymbol{i}_s \tag{1-38}
$$
其中 $\boldsymbol{y}_b$ 和 $\boldsymbol{z}_b$ 称为原始导纳矩阵和原始阻抗矩阵。它们是方阵，其阶数为网络的支路数，并互为逆矩阵：
$$
\boldsymbol{y}_b^{-1} = \boldsymbol{z}_b \tag{1-39}
$$
若网络内所有支路之间不存在互感，则 $\boldsymbol{z}_b$ 和 $\boldsymbol{y}_b$ 是对角线矩阵，对角线元素即是对应的支路阻抗 $z_k$ 和支路导纳 $y_k$；若支路之间存在互感，则 $\boldsymbol{z}_b$ 在相应于互感支路相关的位置上存在非对角线的非零元素。$\boldsymbol{y}_b$ 是 $\boldsymbol{z}_b$ 的逆。
由于网络的支路方程和原始阻抗（导纳）矩阵仅表达了支路电压和支路电流之间的关系，并未涉及支路之间的联结关系，所以它仅是网络支路特性约束的表达形式。
### 1.4 网络方程——网络的数学模型
由于选用的物理量和分析方法不同，网络方程的形式不是唯一的，分别叙述如下。
#### 1.4.1 节点网络方程
采用节点分析法，以节点电压 $\boldsymbol{u}_n$ 和节点注入电流 $\boldsymbol{i}_n$ 为物理量，网络参数采用导纳形式，则
网络的支路特性约束：
$$
\boldsymbol{y}_b(\boldsymbol{u}_b + \boldsymbol{e}_s) = \boldsymbol{i}_b + \boldsymbol{i}_s
$$
网络的拓扑约束：(KCL)
$$
\boldsymbol{A}\boldsymbol{i}_b = \boldsymbol{0}
$$
(KVL)
$$
\boldsymbol{A}^T\boldsymbol{u}_n = \boldsymbol{u}_b
$$
用 (1-20) 式将支路电压变换成节点电压。将 (1-20) 式代入 (1-38) 式得
$$
\boldsymbol{y}_b(\boldsymbol{A}^T\boldsymbol{u}_n + \boldsymbol{e}_s) = \boldsymbol{i}_b + \boldsymbol{i}_s
$$
两侧乘 $\boldsymbol{A}$ 有
$$
\boldsymbol{A}\boldsymbol{y}_b\boldsymbol{A}^T\boldsymbol{u}_n + \boldsymbol{A}\boldsymbol{y}_b\boldsymbol{e}_s = \boldsymbol{A}\boldsymbol{i}_b + \boldsymbol{A}\boldsymbol{i}_s
$$
考虑到 (1-18) 式，有
$$
(\boldsymbol{A}\boldsymbol{y}_b\boldsymbol{A}^T)\boldsymbol{u}_n = \boldsymbol{A}(\boldsymbol{i}_s - \boldsymbol{y}_b\boldsymbol{e}_s) \tag{1-40}
$$
将 (1-40) 式中的支路电动势源变换成支路电流源：
$$
-\boldsymbol{y}_b\boldsymbol{e}_s = \boldsymbol{i}_s' \tag{1-41}
$$
引入节点注入电流的定义，将支路电流源变换成节点注入电流 $\boldsymbol{i}_n$，得
$$
\boldsymbol{A}(\boldsymbol{i}_s + \boldsymbol{i}_s') = \boldsymbol{i}_n \tag{1-42}
$$
(1-42)式代入(1-40)式，从而得到节点网络方程
$$
\boldsymbol{Y}\boldsymbol{u}_n = \boldsymbol{i}_n \tag{1-43}
$$
其中
$$
\boldsymbol{Y} = \boldsymbol{A}\boldsymbol{y}_b\boldsymbol{A}^T \tag{1-44}
$$
称为**节点导纳矩阵**。
$\boldsymbol{A}$ 矩阵反映了网络的拓扑约束，$\boldsymbol{y}_b$ 反映了网络的支路特性约束，所以节点导纳矩阵集中了网络两种约束的全部信息。加上网络的边界条件，即节点注入电流 $\boldsymbol{i}_n$，从而构成了以节点电压 $\boldsymbol{u}_n$ 表示的网络数学模型。若网络参数以阻抗形式表示，则节点网络方程有如下形式：
$$
\boldsymbol{Z}\boldsymbol{i}_n = \boldsymbol{u}_n \tag{1-45}
$$
其中
$$
\boldsymbol{Z} = \boldsymbol{Y}^{-1} \tag{1-46}
$$
称为**节点阻抗矩阵**。
除了电力网络分析中最常用的节点网络方程外，有时也采用回路分析法[25,27]和割集（广义节点）分析法。
#### 1.4.2 回路网络方程
采用回路分析法，以回路电流 $\boldsymbol{i}_l$ 和回路电动势源 $\boldsymbol{e}_l$ 为物理量，网络参数以阻抗表示，则有网络的支路特性约束
$$
\boldsymbol{z}_b(\boldsymbol{i}_b + \boldsymbol{i}_s) = \boldsymbol{u}_b + \boldsymbol{e}_s
$$
和网络的拓扑约束：
$$
\begin{aligned}
\boldsymbol{B}\boldsymbol{u}_b &= \boldsymbol{0} \\
\boldsymbol{B}^T\boldsymbol{i}_l &= \boldsymbol{i}_b
\end{aligned}
$$
利用以上三个公式有
$$
\boldsymbol{B}\boldsymbol{z}_b\boldsymbol{B}^T\boldsymbol{i}_l = \boldsymbol{B}(\boldsymbol{e}_s - \boldsymbol{z}_b\boldsymbol{i}_s)
$$
将支路电流源变换成支路电动势源，即
$$
-\boldsymbol{z}_b\boldsymbol{i}_s = \boldsymbol{e}_s' \tag{1-47}
$$
再引入回路电动势源定义，将支路电动势源变换成回路电动势源 $\boldsymbol{e}_l$ 有
$$
\boldsymbol{B}(\boldsymbol{e}_s + \boldsymbol{e}_s') = \boldsymbol{e}_l \tag{1-48}
$$
从而得到回路网络方程
$$
\boldsymbol{Z}_l\boldsymbol{i}_l = \boldsymbol{e}_l \tag{1-49}
$$
其中
$$
\boldsymbol{Z}_l = \boldsymbol{B}\boldsymbol{z}_b\boldsymbol{B}^T \tag{1-50}
$$
称为**回路阻抗矩阵**。同样可以表示为导纳的形式：
$$
\boldsymbol{Y}_l\boldsymbol{e}_l = \boldsymbol{i}_l \tag{1-51}
$$
其中
$$
\boldsymbol{Y}_l = \boldsymbol{Z}_l^{-1} \tag{1-52}
$$
称为**回路导纳矩阵**。
#### 1.4.3 割集网络方程
采用割集分析法，以割集电压 $\boldsymbol{u}_g$ 和割集注入电流（源）$\boldsymbol{i}_g$ 为物理量，网络参数以导纳表示，可写出网络的支路特性约束和网络的拓扑约束如下：
$$
\begin{cases}
\boldsymbol{y}_b(\boldsymbol{u}_b + \boldsymbol{e}_s) = \boldsymbol{i}_b + \boldsymbol{i}_s \\
\boldsymbol{Q}\boldsymbol{i}_b = \boldsymbol{0} \\
\boldsymbol{Q}^T\boldsymbol{u}_g = \boldsymbol{u}_b
\end{cases}
$$
利用以上三个公式有
$$
\boldsymbol{Q}\boldsymbol{y}_b\boldsymbol{Q}^T\boldsymbol{u}_g = \boldsymbol{Q}(\boldsymbol{i}_s - \boldsymbol{y}_b\boldsymbol{e}_s)
$$
将支路电动势源变换成支路电流源，即利用(1-41)式
$$
-\boldsymbol{y}_b\boldsymbol{e}_s = \boldsymbol{i}_s'
$$
再引入割集注入电流源 $\boldsymbol{i}_g$，将支路电流源变换成割集注入电流源
$$
\boldsymbol{Q}(\boldsymbol{i}_s + \boldsymbol{i}_s') = \boldsymbol{i}_g \tag{1-53}
$$
从而得到割集网络方程
$$
\boldsymbol{Y}_Q\boldsymbol{u}_g = \boldsymbol{i}_g \tag{1-54}
$$
式中
$$
\boldsymbol{Y}_Q = \boldsymbol{Q}\boldsymbol{y}_b\boldsymbol{Q}^T \tag{1-55}
$$
为**割集导纳矩阵**。
### 1.5 变压器和移相器支路的数学描述
#### 1.5.1 一般无源支路的数学描述
在本章 1.2.2 节中，我们论述了用关联矩阵来表达网络的拓扑约束，用关联矢量来描述支路在网络中的联结关系。
在有 $N$ 个独立节点的网络中的正弦稳态分析中，$N$ 个节点的电压为复数矢量 $\dot{\boldsymbol{U}}$（$N \times 1$ 维），支路 $k$ 与独立节点 $i$ 和 $j$ 关联，导纳参数为 $y_k$，规定支路 $k$ 的正方向从 $i$ 指向 $j$，如图 1.2 所示。则其关联矢量为
$$
\boldsymbol{M}_k = [0 \quad \cdots \quad \underset{i}{1} \quad \cdots \quad \underset{j}{-1} \quad \cdots \quad \underset{N}{0}]^T \tag{1-56}
$$
注入节点 $i$ 和 $j$ 的电流分别为 $\dot{I}_i, \dot{I}_j$，则：
$$
[0 \quad \cdots \quad \underset{i}{\dot{I}_i} \quad \cdots \quad \underset{j}{\dot{I}_j} \quad \cdots \quad \underset{N}{0}]^T = \boldsymbol{M}_k y_k \boldsymbol{M}_k^T \dot{\boldsymbol{U}} \tag{1-57}
$$
很明显，关联矢量 $\boldsymbol{M}_k$ 描述了支路 $k$ 在网络中的联结关系，并在已知节点电压的条件下，通过网络方程，可以求得节点 $i$ 和 $j$ 的注入电流。
若支路 $k$ 是并联支路，它与独立节点 $i$ 和参考节点关联，如图 1.3 所示。则其关联矢量为
$$
\boldsymbol{M}_k = [0 \quad \cdots \quad \underset{i}{1} \quad \cdots \quad \underset{N}{0}]^T \tag{1-58}
$$
![](/obsidian-assets/7f9ffb58c2389bb9.png)![](/obsidian-assets/5c286e84b554fd78.png)
**图 1.2 一般串联支路**  **图 1.3 一般并联支路**
节点 $i$ 的注入电流矢量为
$$
\begin{bmatrix} \underset{i}{\dot{I}_i} \\ \vdots \\ \end{bmatrix} = \boldsymbol{M}_k y_k \boldsymbol{M}_k^T \dot{\boldsymbol{U}} \tag{1-59}
$$
#### 1.5.2 广义关联矢量和变压器/移相器支路的数学描述
对于有标准变比的变压器支路，在电力网络分析中，其标准变比可含在标幺值的基值之中；但对于含有非标准变比的变压器和移相器支路，则除了有支路参数外，还含有要处理的变比，如图 1.4 所示。为了说明更一般的情况，支路 $k$ 在节点 $i$ 端和节点 $j$ 端都接有理想变压器，其变比分别为 $\dot{t}_i$ 和 $\dot{t}_j$（变比用复数表示即包含了移相器的情况）。
![](/obsidian-assets/fb83922e11c6e220.png)
对于含有非标准变比的变压器支路，经常采用经过变换的 $\pi$ 型等值电路，即用三条支路来描述，把变比含在支路参数中；对于移相器支路则要用一个有源的 $\pi$ 型等值电路来描述。这种方法不简捷，也不太直观。我们将关联矢量和关联矩阵加以推广，用广义关联矢量和广义关联矩阵来描述含有非标准变比的变压器和移相器支路，可以简单明了地描述变压器/移相器支路在网络中的联结关系，而无需借助 $\pi$ 型等值电路。
根据图 1.4，其中的节点电压之间有如下关系：
$$
\dot{U}_i = \dot{t}_i \dot{U}_i' \tag{1-60}
$$
$$
\dot{U}_j = \dot{t}_j \dot{U}_j' \tag{1-61}
$$
为了保持理想变压器两侧功率不变，即 $\dot{U}_i \hat{\dot{I}}_i = \dot{U}_i' \hat{\dot{I}}_i'$ 和 $\dot{U}_j \hat{\dot{I}}_j = \dot{U}_j' \hat{\dot{I}}_j'$，$\hat{}$ 表示复数共轭，所以节点注入电流之间有如下关系：
$$
\dot{I}_i = \hat{\dot{t}}_i \dot{I}_i' \tag{1-62}
$$
$$
\dot{I}_j' = \hat{\dot{t}}_j \dot{I}_j \tag{1-63}
$$
式中变比 $\dot{t}_i$ 和 $\dot{t}_j$ 取共轭量。而
$$
\dot{I}_i' = -\dot{I}_j' = y_k(\dot{U}_i' - \dot{U}_j') \tag{1-64}
$$
所以
$$
\begin{aligned}
\dot{I}_i &= \frac{1}{\dot{t}_i} \dot{I}_i' = \frac{1}{\dot{t}_i} y_k(\dot{U}_i' - \dot{U}_j') \\
&= \frac{1}{\dot{t}_i} y_k \left( \frac{1}{\dot{t}_i} \dot{U}_i - \frac{1}{\dot{t}_j} \dot{U}_j \right)
\end{aligned}\tag{1-65}
$$
$$
\dot{I}_j = -\frac{1}{\hat{\dot{t}}_j} y_k \left( \frac{1}{\dot{t}_i} \dot{U}_i - \frac{1}{\dot{t}_j} \dot{U}_j \right) \tag{1-66}
$$
引入**广义关联矢量** $\mathring{\boldsymbol{M}}_k$
$$
\mathring{\boldsymbol{M}}_k = \left[ 0 \quad \cdots \quad \underset{i}{\frac{1}{\hat{\dot{t}}_i}} \quad \cdots \quad \underset{j}{-\frac{1}{\hat{\dot{t}}_j}} \quad \cdots \quad \underset{N}{0} \right]^T \tag{1-67}
$$
即把变比关系纳入其中，利用(1-65)式到(1-67)式，变压器（移相器）支路两端节点的注入电流有：
$$
\begin{bmatrix} \underset{i}{\dot{I}_i} \\ \underset{j}{\dot{I}_j} \end{bmatrix} = \mathring{\boldsymbol{M}}_k y_k \mathring{\boldsymbol{M}}_k^T \dot{\boldsymbol{U}} \tag{1-68}
$$
式中 $\mathring{\boldsymbol{M}}_k^T$ 是 $\mathring{\boldsymbol{M}}_k$ 的共轭转置。当支路为移相器支路，变比 $\dot{t}$ 为复数时，广义关联矢量的转置应为共轭转置。
若变压器/移相器支路仅在一端，例如在 $i$ 端，有复数非标准变比 $\dot{t}_i$，则复数广义关联矢量为
$$
\mathring{\boldsymbol{M}}_k = \left[ 0 \quad \cdots \quad \underset{i}{\frac{1}{\hat{\dot{t}}_i}} \quad \cdots \quad \underset{j}{-1} \quad \cdots \quad \underset{N}{0} \right]^T
$$
若支路为变压器支路，在 $j$ 端有实数非标准变比 $t_j$，则广义关联矢量是实数矢量为
$$
\mathring{\boldsymbol{M}}_k = \left[ 0 \quad \cdots \quad \underset{i}{1} \quad \cdots \quad \underset{j}{-\frac{1}{t_j}} \quad \cdots \quad \underset{N}{0} \right]^T
$$
对于一般的情况，从式(1-68)可以得到变压器/移相器支路的节点方程为
$$
\begin{bmatrix} \underset{i}{\dot{I}_i} \\ \underset{j}{\dot{I}_j} \end{bmatrix} = y_k \begin{bmatrix} \frac{1}{t_i^2} & -\frac{1}{\hat{\dot{t}}_i \dot{t}_j} \\ -\frac{1}{\hat{\dot{t}}_j \dot{t}_i} & \frac{1}{t_j^2} \end{bmatrix} \begin{bmatrix} \underset{i}{\dot{U}_i} \\ \underset{j}{\dot{U}_j} \end{bmatrix} \tag{1-69}
$$
式中 $t_i$ 和 $t_j$ 分别是 $\dot{t}_i$ 和 $\dot{t}_j$ 的模值。若支路是只在 $j$ 端有非标准变比 $t_j$ 的变压器支路，这是最常见的情况，则(1-69)式有如下形式
$$
\begin{bmatrix} \underset{i}{\dot{I}_i} \\ \underset{j}{\dot{I}_j} \end{bmatrix} = y_k \begin{bmatrix} 1 & -\frac{1}{t_j} \\ -\frac{1}{t_j} & \frac{1}{t_j^2} \end{bmatrix} \begin{bmatrix} \underset{i}{\dot{U}_i} \\ \underset{j}{\dot{U}_j} \end{bmatrix} \tag{1-70}
$$
可以看到这些结果和用 $\pi$ 型等值电路方法得到的结果完全一致，而采用广义关联矢量，使得描述变压器/移相器支路的过程非常简明直观。当 $\dot{t}_i$ 和 $\dot{t}_j$ 均为 1 时，就是一般的支路，$\mathring{\boldsymbol{M}}_k$ 退化为一般的关联矢量。含有广义关联矢量的矩阵称为广义关联矩阵，用符号 $\mathring{\boldsymbol{A}}$ 表示，它的非零元素有些是复数。
### 1.6 小结
本章从论述网络的概念出发，把网络归结为元件及其联结，因此网络受元件特性和几何拓扑两个约束。
进而引入了图和矩阵、矢量等与计算机相适应的数学形式，详细地讨论了形成网络方程——电力网络数学模型的系统化方法。
最后，将关联矢量加以扩展，用广义关联矢量，即把变比含于矢量元素中，描述了含有非标准变比的变压器和移相器支路在网络中的联结关系，使得变压器/移相器支路的数学描述简明、直观、统一，而无需借助 $\pi$ 型等值电路。
### 习 题
1.1 对题图 1.1 所示的 5 节点网络，选择树为支路 2,4,5,6。
(1) 写出基本回路矩阵 $\boldsymbol{B}$ 和基本割集矩阵 $\boldsymbol{Q}$，证实有 $\boldsymbol{Q}\boldsymbol{B}^T = \boldsymbol{0}$，并有 $\boldsymbol{B}_T = -\boldsymbol{Q}_L^T$。下标 $T$ 和 $L$ 分别表示树支和连支有关的部分。
(2) 选节点④为参考节点，写出节-支关联矩阵 $\tilde{\boldsymbol{A}}$ 和降阶节-支关联矩阵 $\boldsymbol{A}$，并把 $\boldsymbol{A}$ 写成 $[\boldsymbol{A}_T \quad \boldsymbol{A}_L]$。证实 $\boldsymbol{B}_T = -\boldsymbol{A}_L^T(\boldsymbol{A}_T^T)^{-1}$ 和 $\boldsymbol{Q}_L = \boldsymbol{A}_T^{-1}\boldsymbol{A}_L$。
1.2 选树支为支路 3,5,6,7，重做题 1.1。
1.3 对题图 1.3 所示的有向图，选择树支为 6,7,1,4,5。试写出 $\boldsymbol{B}$ 和 $\boldsymbol{Q}$ 矩阵，证实 $\boldsymbol{B}\boldsymbol{Q}^T = \boldsymbol{0}$。选节点⑥为参考节点，试写出降阶关联矩阵 $\boldsymbol{A}$，从 $\boldsymbol{A}$ 推导出基本回路矩阵 $\boldsymbol{B}$。
![](/obsidian-assets/95247ed4ccde416a.png)![](/obsidian-assets/b903a4303d312b55.png)
1.4 推导具有非标准变比的变压器的 $\pi$ 型等值电路，并写出其电路方程，然后用 1.5.2 节中介绍的广义关联矢量的方法所得的结果进行对比。
