---
blog: true
title: "均匀传输线：A-1：均匀传输线及其方程"
slug: "均匀传输线-a-1-均匀传输线及其方程-mryrh50s"
summary: "从分布参数电路视角理解均匀传输线：单位长度的电阻、电感、电导、电容，以及与集总参数电路的对比。"
date: 2026-07-24
category: "均匀传输线"
featured: false
---

### 1. 均匀传输线的概念
均匀传输线是指沿线路长度方向，各处的结构、材料和电气参数都相同的传输线路。例如，横截面不变、导线间距不变、介质均匀的双导线、同轴电缆等。
“均匀”意味着单位长度的参数在任意位置相同：
$$R_0,\quad L_0,\quad G_0,\quad C_0$$

分别表示单位长度的电阻、电感、电导和电容。它们不是集中在某一个元件上的参数，而是连续分布在整条线路上，因此均匀传输线属于**分布参数电路**。
### 2. 与集总参数电路相比的特点
在通常的低频电路中，常把电阻、电感、电容等视为集中在某些元件上；导线只负责连接，认为导线上任意一点的电压和电流在同一时刻近似相同。这就是集总参数电路模型。
这种近似成立的前提是：电路的几何尺寸远小于工作信号的波长，即
$$l\ll \lambda$$
其中，$l$ 是电路或导线的特征长度，$\lambda$ 是电磁波在该线路中的波长。
当线路长度与波长可以相比时，信号从线路一端传播到另一端需要不可忽略的时间。此时同一时刻，线路不同位置的电压、电流可能不同，不能再把整段线路简单视为一根“理想导线”。
传输线相对于集总参数电路的主要特点为：
- 电阻、电感、电导和电容沿线路连续分布；
- 电压 $u(x,t)$ 和电流 $i(x,t)$ 不仅与时间 $t$ 有关，也与在线路上的位置 $x$ 有关；
- 电压和电流以电磁波形式在线路上传播，存在传播延时；
- 在线路终端、接头或特性阻抗发生变化的位置，可能产生反射波；
- 线路上的电压、电流分布可能出现行波或驻波现象。
因此，均匀传输线不能仅用普通的代数电路方程描述，而需要建立关于位置和时间的偏微分方程，即后续要学习的**传输线方程（电报方程）**。
### 3. 工频 $50\,\text{Hz}$ 下的波长
电磁波波长、传播速度和频率的关系为：

$$\lambda=\frac{v}{f}$$
其中：

$$\lambda：\text{波长（m）}$$
$$v：\text{电磁波在传输线中的传播速度（m/s）}$$
$$\quad f：\text{频率（Hz）}$$
在空气架空线中，传播速度通常接近真空光速：
$$v\approx c=3\times10^8\ \text{m/s}$$
对于 $50\,\text{Hz}$ 工频信号：
$$\lambda=\frac{3\times10^8}{50} =6\times10^6\ \text{m}$$
即：
$$\boxed{\lambda\approx 6000\ \text{km}}$$
这说明 50 Hz 工频的波长极长。
例如，若一段输电线路长度为 $100\ \text{km}$，则：
$$\frac{l}{\lambda} =\frac{100}{6000} \approx 0.0167$$
线路长度只约为波长的 \(1/60\)。从电磁波传播角度看，通常可以近似为集总参数电路；但对于超高压、远距离输电线路，线路的分布电容、电感和波过程仍会明显影响运行特性，因此仍常采用长线路模型分析。
> 注意：在实际电缆中，由于绝缘介质的相对介电常数大于 1，传播速度低于光速，波长也会相应变短。
---
### 4. 长线的判据
当线路长度 \(l\) 与工作波长 \(\lambda\) 可以相比，或者线路传播时间不能忽略时，该线路称为**长线**。
工程上常用的经验判据是：
$$l\gtrsim \frac{\lambda}{10}$$
此时线路上的相位变化、传播延时和反射效应已经不能忽略，必须采用分布参数传输线理论进行分析。
更本质的判断方式是比较线路传播时间与信号变化时间：
$$\tau=\frac{l}{v}$$
若传播时间 $\tau$ 相对于信号周期 $T=1/f$ 不可忽略，则应按传输线处理。由于

$$\frac{\tau}{T} =\frac{l/v}{1/f} =\frac{l}{\lambda}$$

所以“线路长度与波长的关系”本质上反映了“传播延时与信号周期的关系”。
### 5. 例子：低频电路与高频数字信号
同样是一根 $1\,\text{m}$ 长的导线，它是否是长线，取决于信号频率。
对于 $50\,\text{Hz}$ 工频：
$$\lambda\approx 6000\ \text{km} $$$$ \frac{l}{\lambda} =\frac{1}{6\times10^6}$$
因此 $1\,\text{m}$ 导线远小于波长，可按普通集总参数导线处理。
若信号频率为 $100\,\text{MHz}$，并近似取传播速度 $v=3\times10^8\,\text{m/s}$，则：

$$\lambda=\frac{3\times10^8}{10^8}=3\ \text{m}$$
这时 $1\,\text{m}$ 已经是波长的：
$$\frac{l}{\lambda}=\frac{1}{3}$$
线路两端存在显著相位差，且终端不匹配时会产生明显反射。因此，\(1\,\text{m}\) 导线必须按传输线处理。
**结论：线路是否为长线不是由其绝对长度决定，而是由线路长度相对于信号波长的大小决定。**
### 6. 均匀传输线的电路模型
均匀传输线的分布参数并不是集中在某个位置，而是沿线路连续分布。为了沿用电路原理中的基尔霍夫定律，可以把整条线路设想为由大量长度为 ${\rm d}x$ 的微小线段级联而成；当 ${\rm d}x\to 0$ 时，这个模型就能准确描述实际传输线。
设传输线的单位长度参数为：

| 参数    | 含义                            | 微元 ${\rm d}x$ 对应参数 |
| ----- | ----------------------------- | ------------------ |
| $R_0$ | 单位长度串联电阻，单位 $\Omega/{\rm m}$  | $R_0{\rm d}x$      |
| $L_0$ | 单位长度串联电感，单位 ${\rm H}/{\rm m}$ | $L_0{\rm d}x$      |
| $G_0$ | 单位长度并联电导，单位 ${\rm S}/{\rm m}$ | $G_0{\rm d}x$      |
| $C_0$ | 单位长度并联电容，单位 ${\rm F}/{\rm m}$ | $C_0{\rm d}x$      |
其中，$R_0$ 和 $L_0$ 描述两根导线本身的串联效应；$G_0$ 和 $C_0$ 描述两根导线之间的介质效应。$G_0$ 反映绝缘介质并不完全理想所产生的漏电流，$C_0$ 则反映两导线间的电场储能作用。
下图表示位于 $x$ 到 $x+{\rm d}x$ 之间的传输线微元。规定电流 $i(x,t)$ 的正方向为从左向右，电压 $u(x,t)$ 为上导线相对下导线的电压。
<!-- 缺失图片: 均匀传输线-1784460356906.webp（源文件遗失，可从备份恢复后放回 attachments 并改回此行） -->
#### 6.1 串联支路的电压关系
考察长度为 ${\rm d}x$ 的微元。沿电流方向，从 $x$ 走到 $x+{\rm d}x$，要经过串联电阻和串联电感，因此电压会下降。
根据基尔霍夫电压定律：
$$ u(x,t)-u(x+{\rm d}x,t) = R_0{\rm d}x\cdot i(x,t) + L_0{\rm d}x\cdot \frac{\partial i(x,t)}{\partial t} $$
右侧两项分别是：

$$ \text{电阻压降}=R_0{\rm d}x\cdot i(x,t) $$$$ \text{电感压降}=L_0{\rm d}x\cdot \frac{\partial i(x,t)}{\partial t} $$

将上式两边同除以 ${\rm d}x$，得：

$$ \frac{u(x,t)-u(x+{\rm d}x,t)}{{\rm d}x} = R_0i(x,t)+L_0\frac{\partial i(x,t)}{\partial t} $$

当 ${\rm d}x\to 0$ 时，左侧就是电压对位置的负偏导数：

$$ \lim_{{\rm d}x\to 0} \frac{u(x,t)-u(x+{\rm d}x,t)}{{\rm d}x} = -\frac{\partial u(x,t)}{\partial x} $$

因此得到第一条传输线方程：

$$ \boxed{ \frac{\partial u(x,t)}{\partial x} = -R_0i(x,t) -L_0\frac{\partial i(x,t)}{\partial t} } $$

它说明：线路电压沿 $x$ 方向的变化，来源于串联电阻的损耗和串联电感的储能作用。
#### 6.2 并联支路的电流关系
在微元内，流入左端的电流 $i(x,t)$ 分为两部分：
1. 一部分继续流向右端，成为 $i(x+{\rm d}x,t)$；
2. 另一部分流过两导线之间的并联电导和并联电容支路。
根据基尔霍夫电流定律：
$$ i(x,t)-i(x+{\rm d}x,t) = i_G+i_C $$
其中，流过并联电导的漏电流为：
$$ i_G=G_0{\rm d}x\cdot u(x,t) $$
流过并联电容的电流为：
$$ i_C=C_0{\rm d}x\cdot \frac{\partial u(x,t)}{\partial t} $$
所以：
$$ i(x,t)-i(x+{\rm d}x,t) = G_0{\rm d}x\cdot u(x,t) + C_0{\rm d}x\cdot \frac{\partial u(x,t)}{\partial t} $$
两边同除以 ${\rm d}x$：
$$ \frac{i(x,t)-i(x+{\rm d}x,t)}{{\rm d}x} = G_0u(x,t) + C_0\frac{\partial u(x,t)}{\partial t} $$
令 ${\rm d}x\to0$，可得：
$$ \boxed{ \frac{\partial i(x,t)}{\partial x} = -G_0u(x,t) -C_0\frac{\partial u(x,t)}{\partial t} } $$
它说明：线路电流沿 $x$ 方向的变化，来源于介质漏电和导线间电容充、放电。
#### 6.3 均匀传输线方程（电报方程）
将上述两式合并，得到时域中的均匀传输线方程：
$$ \boxed{ \begin{cases} \displaystyle \frac{\partial u(x,t)}{\partial x} = -R_0i(x,t) -L_0\frac{\partial i(x,t)}{\partial t} \\[1.2em] \displaystyle \frac{\partial i(x,t)}{\partial x} = -G_0u(x,t) -C_0\frac{\partial u(x,t)}{\partial t} \end{cases} } $$

这组方程也称为**电报方程**。与集总参数电路中“一个元件对应一个电压、电流”的代数方程不同，这里 $u(x,t)$、$i(x,t)$ 都是位置和时间的函数，因此为偏微分方程。
#### 6.4 由一阶方程得到电压波动方程
对第一条方程两边再对 $x$ 求偏导：
$$ \frac{\partial^2 u}{\partial x^2} = -R_0\frac{\partial i}{\partial x} -L_0\frac{\partial}{\partial t} \left( \frac{\partial i}{\partial x} \right) $$
代入第二条传输线方程：

$$ \frac{\partial i}{\partial x} = -G_0u-C_0\frac{\partial u}{\partial t} $$
得到：
$$ \frac{\partial^2 u}{\partial x^2} = -R_0\left( -G_0u-C_0\frac{\partial u}{\partial t} \right) -L_0\frac{\partial}{\partial t} \left( -G_0u-C_0\frac{\partial u}{\partial t} \right) $$
整理可得电压的二阶方程：
$$ \boxed{ \frac{\partial^2u}{\partial x^2} = L_0C_0\frac{\partial^2u}{\partial t^2} + (R_0C_0+L_0G_0)\frac{\partial u}{\partial t} + R_0G_0u } $$
同理，电流也满足：
$$ \boxed{ \frac{\partial^2i}{\partial x^2} = L_0C_0\frac{\partial^2i}{\partial t^2} + (R_0C_0+L_0G_0)\frac{\partial i}{\partial t} + R_0G_0i } $$
这表明电压和电流会以波的形式沿线路传播；其中 $L_0$ 与 $C_0$ 决定传播和储能特性，$R_0$ 与 $G_0$ 则导致能量损耗与波的衰减。
#### 6.5 理想无损传输线的特例
若忽略导线电阻和介质漏电，即：
$$ R_0=0,\qquad G_0=0 $$
则称为无损传输线。电报方程化为：
$$ \begin{cases} \displaystyle \frac{\partial u}{\partial x} = -L_0\frac{\partial i}{\partial t} \\[0.8em] \displaystyle \frac{\partial i}{\partial x} = -C_0\frac{\partial u}{\partial t} \end{cases} $$
相应的电压、电流方程变为标准波动方程：
$$ \boxed{ \frac{\partial^2u}{\partial x^2} = L_0C_0\frac{\partial^2u}{\partial t^2} } $$$$ \boxed{ \frac{\partial^2i}{\partial x^2} = L_0C_0\frac{\partial^2i}{\partial t^2} } $$
由标准波动方程可以看出，无损线上的波速为：
$$ \boxed{ v=\frac{1}{\sqrt{L_0C_0}} } $$
这也说明：在传输线中传播的不是“电压本身”或“电流本身”，而是由电场能和磁场能相互转化、共同构成的电磁波。
