---
blog: true
title: "电力电子：第 5 讲 DC-DC 变换器（直流斩波器）学习笔记"
slug: "电力电子-第5讲-直流斩波器-dc-dc-pe1l05"
summary: "直流斩波器用开关的通断把直流电压切成脉冲，再经 LC 低通滤波得到可调的直流输出，作用相当于变比连续可调的“直流变压器”。笔记以电感伏秒平衡和电容电荷平衡为主线，逐一推导 Buck、Boost、Buck-Boost、Cuk 四种基本拓扑在连续导通下的电压比、电流比、电感电流纹波与输出电压纹波，给出连续/断续导通的临界条件与断续模式下的电压比，最后讨论全桥变换器的双极性与单极性 PWM 及其输出纹波。"
date: 2026-10-20
category: "电力电子"
featured: false
tags:
  - "电力电子"
  - "DC-DC变换"
  - "直流斩波"
  - "PWM"
  - "Buck"
  - "Boost"
  - "Buck-Boost"
  - "Cuk"
  - "全桥变换器"
  - "伏秒平衡"
  - "连续导通"
  - "断续导通"
  - "课程笔记"
---

# 电力电子 · 第 5 讲 DC-DC Converters（DC Choppers）学习笔记

> **来源课件**：`5.DC-DC_918.pdf`（Chapter 4 DC-DC Converters）
> **配图**：均为原课件截图，存于 `assets/5-DC-DC/`，图注标注页码（Pxx）。
> **已剔除**：封面、"The End" 页。
> **保留并展开**：PWM 原理、Buck / Boost / Buck-Boost / Cuk 的连续与断续导通分析、Cuk 电路的 Matlab 仿真、全桥变换器的双极性与单极性 PWM。
> **补充来源**：课程大纲（`0-1.Syllabus-2026.pdf`）、《电力电子技术基础实验指导书》3.4 节"直流斩波电路实验"。

**本讲定位**：大纲中 DC-DC Converters 为第 5 个模块，讲授 4 学时，另配 2 学时研讨和 2 学时实验（实验 3：直流斩波电路实验）。前两讲处理的是 AC-DC（整流）；本讲处理 DC-DC。输入是一个不稳定的直流（通常来自二极管整流 + 滤波电容，或者蓄电池），输出是一个电压可调、稳定的直流。所有拓扑的分析都只用两条规则：**稳态下电感电压一周期平均为零（伏秒平衡）**，**稳态下电容电流一周期平均为零（电荷平衡）**。

---

## 一、DC-DC 变换器的作用与基本原理（P2、P3）

### 1-1 系统位置（P2）

![DC-DC 变换器系统框图](/obsidian-assets/159fa2d152928562.png)

斩波器（chopper）可以看作"变比连续可调的直流变压器"：像交流变压器一样，它能把直流电压降压或升压。典型系统为：

交流电网 → 不控二极管整流 → 滤波电容（得到不稳定的直流）→ **DC-DC 变换器**（受 $v_{control}$ 调节）→ 稳定的直流 → 负载。

### 1-2 基本原理与占空比（P3）

![斩波原理与输出波形](/obsidian-assets/10dda4a0f2fd201c.png)

开关以周期 $T_s$ 重复通断：导通 $t_{on}$ 期间输出 $v_o = V_d$，关断 $t_{off}$ 期间 $v_o = 0$。输出电压平均值为

$$
V_o=\frac{1}{T_s}\int_0^{t_{on}} v_o\,dt=\frac{t_{on}}{T_s}V_d=f_s t_{on}V_d=DV_d
$$

其中 $D = t_{on}/T_s$ 称为**占空比（duty ratio）**，$0\le D\le 1$。

调节输出电压的两种方法：

1. **开关频率固定、调节导通时间**——即 **PWM（脉冲宽度调制）**，本讲只讨论这一种；
2. 频率与导通时间同时调节。

固定频率的好处是输出纹波的频谱位置固定（集中在 $f_s$ 及其倍数），滤波器容易设计。

---

## 二、换流与 PWM 基本单元（P4）

![换流与 PWM 电路基本单元](/obsidian-assets/bcd24ea17d80b003.png)

左图中，晶体管关断后电感电流 $i_L$ 不能突变，必须换到二极管续流——这就是 DC-DC 电路中的**换流（commutation）**：电流在**可控开关**与**二极管**之间来回转移。

右图是 PWM 电路的**基本单元（一个桥臂）**：上管 $T_{A+}$ 与下管 $T_{A-}$ 各自反并联二极管 $D_{A+}$、$D_{A-}$，输出点为 A。只要控制上下管的通断，A 点电压就在 $V_d$ 与 $0$ 之间切换。

- Buck 电路相当于只用上管 $T_{A+}$ 和下二极管 $D_{A-}$；
- Boost 电路相当于只用下管 $T_{A-}$ 和上二极管 $D_{A+}$（能量反向流动）；
- 两个桥臂组成全桥，即第六节的全桥变换器。

---

## 三、PWM 调制原理（P5）

![PWM 比较器与锯齿波调制](/obsidian-assets/ee05f88242f8dd8b.png)

控制电压 $v_{control}$ 与一个重复的锯齿波 $v_{st}$（峰值 $\hat V_{st}$，频率 $f_s$）送入比较器：

- $v_{control} > v_{st}$：开关导通（On）；
- $v_{control} < v_{st}$：开关关断（Off）。

锯齿波在一个周期内从 0 线性上升到 $\hat V_{st}$，$v_{st}(t)=\hat V_{st}\,t/T_s$。比较器翻转发生在 $v_{st}(t_{on}) = v_{control}$ 处，故

$$
t_{on}=\frac{v_{control}}{\hat V_{st}}T_s
\quad\Longrightarrow\quad
D=\frac{t_{on}}{T_s}=\frac{v_{control}}{\hat V_{st}}
$$

占空比与控制电压成正比，这就是用一个直流控制量连续调节输出电压的方法。

本讲的基本拓扑（P6）：

1. Buck（降压）
2. Boost（升压）
3. Buck-Boost（升降压）
4. Cuk（升降压）
5. 全桥（Full-bridge）

---

## 四、Buck 变换器（降压）（P7–P11）

### 4-1 电路与两种模态（P7）

![Buck 电路、两种模态与 voi 频谱](/obsidian-assets/ebb959c71b5aed94.png)

- **模态 1（开关导通）**：$V_d$ 经 $L$ 向 $C$ 与负载供电，二极管反偏，$v_L = V_d - V_o$；
- **模态 2（开关关断）**：电感电流经二极管续流，$v_L = -V_o$。

二极管两端电压 $v_{oi}$ 是幅值 $V_d$、占空比 $D$ 的方波。其频谱由直流分量 $V_o = DV_d$ 加上 $f_s, 2f_s, 3f_s,\dots$ 处的谐波组成。$L$、$C$ 构成**低通滤波器**，只要截止频率 $f_c = \dfrac{1}{2\pi\sqrt{LC}} \ll f_s$，开关频率谐波就被大幅衰减，输出近似只剩直流。

### 4-2 连续导通模式（CCM）的稳态分析（P8）

![Buck 连续导通波形与公式](/obsidian-assets/040535c750c09e42.png)

**两个基本假设**：

- **C1**：稳态下一个周期内电容平均电流为零（因而 $I_L = I_o$），电感平均电压为零；
- **C2**：除计算电压纹波外，认为电容电压恒定（$C$ 足够大），即 $v_o \approx V_o$。

**连续导通**指电感电流在整个周期内始终大于零。

**电压比推导（伏秒平衡）**：在 C2 下，两模态的 $v_L$ 都是常数，$i_L$ 线性变化。导通时 $i_L$ 上升 $\Delta I_L$，关断时下降 $\Delta I_L$：

$$
V_d - V_o = L\frac{\Delta I_L}{t_{on}},\qquad
-V_o = -L\frac{\Delta I_L}{t_{off}}
$$

两式消去 $\Delta I_L$：$(V_d - V_o)t_{on} = V_o t_{off}$，即图中面积 A = 面积 B。代入 $t_{on} = DT_s$、$t_{off} = (1-D)T_s$：

$$
(V_d - V_o)D = V_o(1-D)\quad\Longrightarrow\quad V_o = DV_d
$$

结果与 LC 滤波前 $v_{oi}$ 的平均值相同——理想电感对直流分量没有压降。

**电流比**：忽略损耗，输入功率等于输出功率：

$$
V_dI_d = V_oI_o\quad\Longrightarrow\quad I_d = DI_o
$$

**电感电流纹波**：由导通段的方程

$$
\Delta I_L=\frac{(V_d-V_o)\,t_{on}}{L}=\frac{(V_d-DV_d)\,DT_s}{L}=\frac{V_dD(1-D)}{f_sL}
$$

$\Delta I_L$ 在 $D = 0.5$ 时最大，为 $\dfrac{V_d}{4f_sL}$。

### 4-3 输出电压纹波（P9）

![Buck 输出电压纹波](/obsidian-assets/56340bb0e921bb36.png)

计算纹波时放弃假设 C2。电感电流 = 直流分量 $I_o$（流向负载）+ 三角波交流分量（全部流入电容）。电容电流为正的那一段（$i_L > I_o$）持续 $T_s/2$，三角形高为 $\Delta I_L/2$，充入的电荷为图中阴影面积：

$$
\Delta Q=\frac12\cdot\frac{T_s}{2}\cdot\frac{\Delta I_L}{2}=\frac{T_s\Delta I_L}{8}
$$

这部分电荷使电容电压由最低点升到最高点，所以峰峰纹波

$$
\Delta V_o=\frac{\Delta Q}{C}=\frac{T_s}{8C}\cdot\frac{V_dD(1-D)}{f_sL}=\frac{V_dD(1-D)}{8LCf_s^{2}}
$$

用相对值表示（除以 $V_o = DV_d$，并代入 $f_c = 1/(2\pi\sqrt{LC})$）：

$$
\frac{\Delta V_o}{V_o}=\frac{(1-D)}{8LCf_s^2}=\frac{\pi^2}{2}(1-D)\left(\frac{f_c}{f_s}\right)^2
$$

可见：提高开关频率、或让 LC 截止频率远低于 $f_s$，都能有效减小输出纹波。

### 4-4 断续导通模式（DCM）（P10）

![Buck 断续导通分析](/obsidian-assets/e13dc954bfa02ca3.png)

**临界条件**：负载电流减小时，$i_L$ 的最低点下降；当最低点刚好为零时处于连续与断续的边界。此时平均电流等于三角波高度的一半：

$$
I_{LB}=I_{oB}=\frac12\Delta I_L=\frac{V_dD(1-D)}{2f_sL}
$$

$I_o < I_{oB}$ 时电感电流断续。$I_{oB}$ 在 $D=0.5$ 时最大，为 $\dfrac{V_d}{8f_sL}$。

**断续时的电压比**：一个周期分三段——导通 $DT_s$（$v_L = V_d - V_o$，$i_L$ 从 0 上升），续流 $\Delta_1T_s$（$v_L = -V_o$，$i_L$ 降到 0），零电流 $\Delta_2T_s$（$v_L = 0$）。稳态下电感平均电压仍为零：

$$
(V_d - V_o)DT_s = V_o\Delta_1T_s\quad\Longrightarrow\quad
\frac{V_o}{V_d}=\frac{D}{D+\Delta_1}
$$

**求 $\Delta_1$**：电感电流峰值

$$
i_{L,peak}=\frac{V_o\Delta_1T_s}{L}
$$

$i_L$ 为三角形（底宽 $(D+\Delta_1)T_s$），其平均值等于负载电流：

$$
I_o=\frac{1}{T_s}\cdot\frac12 i_{L,peak}(D+\Delta_1)T_s=\frac{V_o\Delta_1T_s}{2L}(D+\Delta_1)
$$

代入 $V_o(D+\Delta_1) = DV_d$，得 $I_o = \dfrac{V_dD\Delta_1}{2f_sL}$，即

$$
\Delta_1=\frac{2f_sL}{V_dD}I_o
$$

断续时 $V_o/V_d$ 不再只由 $D$ 决定，还与负载电流 $I_o$ 有关：负载越轻，$\Delta_1$ 越小，$V_o$ 越高（空载时趋于 $V_d$）。连续模式的电压比与负载无关，这是两种模式的本质区别。

### 4-5 Buck 电路的特点（P11）

1. 降压；
2. 结构简单，只需一个有源（可控）器件；
3. 效率高（> 90%）；
4. 输入电流断续（开关关断时 $i_d = 0$），通常需要输入滤波器；
5. 只能输出正电压、单向电流（一象限）。

---

## 五、Boost 变换器（升压）（P12–P16）

### 5-1 电路与两种模态（P12）

![Boost 电路与两种模态](/obsidian-assets/6b8490995599b92e.png)

- **模态 1（开关导通）**：电感直接接在 $V_d$ 上储能，$v_L = V_d$；二极管反偏，负载由电容单独供电；
- **模态 2（开关关断）**：电感电流经二极管流向电容与负载，$v_L = V_d - V_o$（为负）。

### 5-2 连续导通分析（P13）

![Boost 连续导通波形与公式](/obsidian-assets/02e6ecdb834fda76.png)

假设 C1、C2 仍成立。

$$
V_d = L\frac{\Delta I_L}{t_{on}},\qquad V_d - V_o = -L\frac{\Delta I_L}{t_{off}}
$$

伏秒平衡：

$$
V_dDT_s + (V_d - V_o)(1-D)T_s = 0\quad\Longrightarrow\quad V_o=\frac{V_d}{1-D}
$$

由于 $0 \le D < 1$，$V_o \ge V_d$，故为升压电路。

功率平衡 $V_dI_d = V_oI_o$：

$$
I_d=\frac{I_o}{1-D}
$$

Boost 的电感串在输入端，所以 $I_d = I_L$，输入电流连续。

电感电流纹波（由导通段）：

$$
\Delta I_L=\frac{V_dDT_s}{L}=\frac{V_dD}{f_sL}
$$

### 5-3 输出电压纹波（P14）

![Boost 输出电压纹波](/obsidian-assets/6b5530ca9fbcdb05.png)

二极管电流 $i_D$ 只在关断期间流通，其平均值等于 $I_o$。负载电流可认为恒为 $I_o$：

- 导通期间 $i_D = 0$，电容单独向负载放电，放出电荷 $\Delta Q = I_oDT_s$（左侧阴影）；
- 关断期间 $i_D > I_o$，多余部分给电容充电，充入同样的 $\Delta Q$（右侧阴影）。

故峰峰纹波

$$
\Delta V_o=\frac{\Delta Q}{C}=\frac{I_oDT_s}{C}=\frac{I_oD}{f_sC}
$$

若负载为电阻 $R$，$I_o = V_o/R$，可写成 $\dfrac{\Delta V_o}{V_o}=\dfrac{D}{RCf_s}=D\dfrac{T_s}{\tau}$，$\tau = RC$。

与 Buck 不同，Boost 的电容电流是幅值很大的脉冲（等于 $i_D - I_o$），而不是小的三角波，所以纹波与 $\Delta Q$ 呈一阶关系（$1/f_s$），而 Buck 是二阶关系（$1/f_s^2$）。

### 5-4 断续导通（P15）

![Boost 断续导通分析](/obsidian-assets/e83e8983b7558434.png)

**临界条件**：

$$
I_{LB}=\frac12\Delta I_L=\frac{V_dD}{2f_sL},\qquad
I_{oB}=I_{LB}(1-D)
$$

第二式的原因：输出电流等于二极管电流平均值，而二极管只在 $(1-D)T_s$ 内导通，且临界时其电流波形是电感电流的下降段，故 $I_o = I_L(1-D)$。

**断续时的电压比**：一个周期内导通 $DT_s$（$v_L = V_d$），续流 $\Delta_1T_s$（$v_L = V_d - V_o$），零电流 $\Delta_2T_s$。伏秒平衡：

$$
V_dD + (V_d - V_o)\Delta_1 = 0\quad\Longrightarrow\quad
\frac{V_o}{V_d}=\frac{\Delta_1+D}{\Delta_1}
$$

**求 $\Delta_1$**：峰值 $i_{L,peak} = V_dDT_s/L$。输出电流等于二极管电流（即 $i_L$ 下降段三角形，底宽 $\Delta_1T_s$）的平均值：

$$
I_o=\frac{1}{T_s}\cdot\frac12\cdot\frac{V_dDT_s}{L}\cdot\Delta_1T_s=\frac{V_dD\Delta_1}{2f_sL}
\quad\Longrightarrow\quad
\Delta_1=\frac{2f_sL}{V_dD}I_o
$$

### 5-5 Boost 电路的特点（P16）

1. 升压；
2. 结构简单，只需一个有源器件；
3. 效率高；
4. 输入电流连续；
5. 流过滤波电容的电流有效值比 Buck 大得多，因而需要更大的滤波电容；
6. 输出电压对占空比变化非常敏感（$V_o = V_d/(1-D)$ 在 $D$ 接近 1 时斜率很大），稳压控制较难。

### 5-6 补充：D 接近 1 时的实际限制

理想公式在 $D\to1$ 时给出 $V_o\to\infty$，实际电路做不到。原因之一是电感的等效串联电阻 $r_L$（开关管导通电阻、二极管压降的作用类似）。设负载为电阻 $R$，考虑 $r_L$ 后电感平均电压为零的条件变为

$$
V_d - I_Lr_L = (1-D)V_o
$$

其中 $I_L = I_d = \dfrac{I_o}{1-D} = \dfrac{V_o}{R(1-D)}$。代入得

$$
V_d=(1-D)V_o+\frac{r_L}{R(1-D)}V_o
\quad\Longrightarrow\quad
\frac{V_o}{V_d}=\frac{1}{1-D}\cdot\frac{1}{1+\dfrac{r_L}{R(1-D)^2}}
$$

$D$ 较小时第二个因子接近 1，与理想公式一致；$D$ 接近 1 时 $(1-D)^2$ 很小，第二个因子迅速减小，电压比先升后降。令分母 $(1-D)+\dfrac{r_L}{R(1-D)}$ 对 $(1-D)$ 求极小，得 $(1-D)^2 = r_L/R$ 时电压比最大，最大值为 $\dfrac12\sqrt{R/r_L}$。此外 $D = 1$ 时开关管一直导通，电源经电感直接短路。实验指导书因此要求 Boost 的最大占空比必须限制，不允许在 $D=1$ 下工作。

---

## 六、Buck-Boost 变换器（升降压）（P17–P22）

### 6-1 由 Buck 与 Boost 级联得到（P17）

![Buck-Boost：Buck 与 Boost 的级联](/obsidian-assets/68767d9ebe760e0a.png)

把一个 Buck 和一个 Boost 串联，中间的直流电压为 $V_{o1} = DV_d$，最终输出 $V_o = \dfrac{V_{o1}}{1-D}$（两级用同一个占空比、同步开关）。

拓扑化简思路（图中棕色框与箭头）：

- 两开关同时导通（模态 1）时，前级的电感与后级的电感串联，中间电容在一个周期内平均电流为零、可以省去，两电感合并成一个；
- 两开关同时关断（模态 2）时，合并后的电感经二极管向输出端放电。

合并后得到下面只含一个开关、一个电感、一个二极管的 Buck-Boost 电路，其输出电压极性与输入相反。

### 6-2 电路与两种模态（P18）

![Buck-Boost 电路与模态](/obsidian-assets/729c7975ad63b5b9.png)

- **模态 1（导通）**：电感接在 $V_d$ 上储能，$v_L = V_d$；二极管反偏，电容向负载供电；
- **模态 2（关断）**：电感经二极管向电容和负载放电，$v_L = -V_o$（图中 $V_o$ 以下正上负为参考方向，故输出电压极性反转）。

### 6-3 连续导通分析（P19）

![Buck-Boost 连续导通波形与公式](/obsidian-assets/60324915bfd976af.png)

$$
V_d = L\frac{\Delta I_L}{t_{on}},\qquad V_o = L\frac{\Delta I_L}{t_{off}}
$$

伏秒平衡 $V_dDT_s = V_o(1-D)T_s$：

$$
V_o=\frac{D}{1-D}V_d
$$

$D < 0.5$ 时降压，$D > 0.5$ 时升压，$D = 0.5$ 时 $V_o = V_d$。

功率平衡：

$$
I_d=\frac{D}{1-D}I_o
$$

电感电流平均值：导通期间电感电流来自输入，关断期间电感电流流向输出，所以 $I_L = I_d + I_o$（波形图中已标出）。代入上式得 $I_L = \dfrac{I_o}{1-D}$。

电感电流纹波：

$$
\Delta I_L=\frac{V_dD}{f_sL}
$$

### 6-4 输出电压纹波（P20）

![Buck-Boost 输出电压纹波](/obsidian-assets/219467cb3e4de0be.png)

输出侧结构与 Boost 相同：导通期间二极管截止，电容独自给负载供电，放出电荷 $\Delta Q = I_oDT_s$：

$$
\Delta V_o=\frac{I_oD}{f_sC}
$$

### 6-5 断续导通（P21）

![Buck-Boost 断续导通分析](/obsidian-assets/54d0bb81c49cfed7.png)

**临界条件**：

$$
I_{LB}=\frac12\Delta I_L=\frac{V_dD}{2f_sL},\qquad I_{oB}=I_{LB}(1-D)
$$

（输出电流只在关断段由电感提供，理由同 Boost。）

**断续时的电压比**：

$$
V_dD = V_o\Delta_1\quad\Longrightarrow\quad\frac{V_o}{V_d}=\frac{D}{\Delta_1}
$$

**求 $\Delta_1$**：$i_{L,peak} = V_dDT_s/L$，输出电流为下降段三角形的平均值：

$$
I_o=\frac{1}{T_s}\cdot\frac12 i_{L,peak}\,\Delta_1T_s=\frac{V_dD\Delta_1}{2f_sL}
\quad\Longrightarrow\quad
\Delta_1=\frac{2f_sL}{V_dD}I_o
$$

注意 Buck、Boost、Buck-Boost 三种电路在断续时 $\Delta_1$ 的表达式形式相同，只是各自的电压比不同。

### 6-6 Buck-Boost 电路的特点（P22）

1. 既可降压也可升压；
2. 结构简单，只需一个器件；
3. 效率高；
4. 输出电压极性与输入相反；
5. 输入电流断续，且流过开关器件的峰值电流大（开关电流峰值为 $I_L + \Delta I_L/2$，而 $I_L = I_d + I_o$）。

---

## 七、Cuk 变换器（P23–P27）

### 7-1 由 Boost 与 Buck 级联得到（P23）

![Cuk：Boost 与 Buck 的级联](/obsidian-assets/9279d713e289f6ba.png)

与 Buck-Boost 相反，Cuk 电路是**先 Boost、后 Buck**：前级 Boost 的输出电容与后级 Buck 的开关合并。

- 模态 1（导通）与模态 2（关断）中，中间电容分别被接到后级和前级（棕色框）；
- 把两个开关合并为一个单刀双掷开关，再用一个晶体管 T 加一个二极管 D 实现，中间电容变成耦合电容 $C_1$。

由于前级是 Boost（输入串电感）、后级是 Buck（输出串电感），Cuk 电路的**输入、输出电流都连续**。

### 7-2 电路与模态（P24）

![Cuk 电路与两种模态](/obsidian-assets/12a300227d4705f3.png)

能量通过电容 $C_1$ 从输入侧传到输出侧（Buck、Boost、Buck-Boost 都是靠电感传递能量）。

- **模态 1（T 关断）**：D 导通。$L_1$ 中的电流经 $C_1$、D 给 $C_1$ 充电；$L_2$ 经 D 续流向负载供电。
- **模态 2（T 导通）**：D 截止。$C_1$ 经 T 向 $L_2$ 和负载放电；$L_1$ 被 $V_d$ 充磁储能。

### 7-3 连续导通分析（P25）

![Cuk 连续导通公式与波形](/obsidian-assets/9e0a616ef30399db.png)

设 $C_1$ 足够大，$v_{C1} \approx V_{c1}$；按图中参考方向，$v_{L2}$ 取"左负右正"。

**电感 $L_1$**：

$$
\text{导通：}V_d = L_1\frac{\Delta I_{L1}}{t_{on}},\qquad
\text{关断：}V_d - V_{c1} = -L_1\frac{\Delta I_{L1}}{t_{off}}
$$

伏秒平衡 $V_dD + (V_d - V_{c1})(1-D) = 0$，得

$$
V_{c1}=\frac{V_d}{1-D}
$$

（这正是前级 Boost 的输出电压。）

**电感 $L_2$**：

$$
\text{导通：}V_{c1} - V_o = L_2\frac{\Delta I_{L2}}{t_{on}},\qquad
\text{关断：}V_o = -L_2\frac{\Delta I_{L2}}{t_{off}}\ \ (\text{即 } v_{L2} = -V_o)
$$

伏秒平衡 $(V_{c1} - V_o)D - V_o(1-D) = 0$，得

$$
V_{c1}=\frac{V_o}{D}
$$

（这正是后级 Buck 的关系 $V_o = DV_{c1}$。）

**电压比**：联立两式消去 $V_{c1}$：

$$
\frac{V_d}{1-D}=\frac{V_o}{D}\quad\Longrightarrow\quad V_o=\frac{D}{1-D}V_d
$$

电压比与 Buck-Boost 相同，输出极性也相反（$V_o$ 为上负下正）。

**电流比**：功率平衡

$$
I_d=\frac{D}{1-D}I_o
$$

**电感电流纹波**：

$$
\Delta I_{L1}=\frac{V_dDT_s}{L_1}=\frac{DV_d}{f_sL_1}
$$

$$
\Delta I_{L2}=\frac{(V_{c1}-V_o)DT_s}{L_2}
$$

其中 $V_{c1} - V_o = \dfrac{V_o}{D} - V_o = \dfrac{V_o(1-D)}{D} = V_d$（利用 $V_o(1-D) = DV_d$），所以

$$
\Delta I_{L2}=\frac{DV_d}{f_sL_2}
$$

**电容 $C_1$ 的电压纹波**：T 关断期间，$C_1$ 被输入电流 $I_{L1} = I_d$ 充电，时长 $(1-D)T_s$：

$$
\Delta V_{c1}=\frac{I_d(1-D)T_s}{C_1}=\frac{I_d(1-D)}{f_sC_1}
$$

**输出电容 $C_2$ 的电压纹波**：输出级 $L_2$–$C_2$ 与 Buck 的输出 LC 完全相同，流入 $C_2$ 的是 $\Delta I_{L2}$ 的三角波交流分量，套用 4-3 的推导：

$$
\Delta V_{c2}=\frac{T_s\Delta I_{L2}}{8C_2}=\frac{DV_d}{8C_2L_2f_s^{2}}
$$

### 7-4 Cuk 电路的特点（P26）

1. 既可降压也可升压；
2. 只需一个器件；
3. 效率高；
4. 输入电流连续（输出电流同样连续）；
5. $C_1$ 的纹波电流大（$C_1$ 在关断段流过 $I_{L1}$，在导通段流过 $I_{L2}$，对电容的电流定额要求高）；
6. 需要额外的电容和电感。

### 7-5 小结（P27）

- Buck（降压）、Boost（升压）、Buck-Boost（升降压）、Cuk（Boost-Buck，升降压）；
- 掌握各拓扑及其在不同模态下的等效电路；
- 关键波形与计算，三类量：
  - 输入、输出电压与电流的直流分量；
  - 电容电压与电感电流的直流分量；
  - 电容电压与电感电流的纹波；
- 斩波器的设计（由纹波要求选 $L$、$C$）；
- 连续导通与断续导通的区别。

四种基本拓扑连续导通时的结论对照：

| 拓扑 | $V_o/V_d$ | $I_d/I_o$ | $\Delta I_L$ | $\Delta V_o$ | 输入电流 |
|---|---|---|---|---|---|
| Buck | $D$ | $D$ | $\dfrac{V_dD(1-D)}{f_sL}$ | $\dfrac{V_dD(1-D)}{8LCf_s^2}$ | 断续 |
| Boost | $\dfrac{1}{1-D}$ | $\dfrac{1}{1-D}$ | $\dfrac{V_dD}{f_sL}$ | $\dfrac{I_oD}{f_sC}$ | 连续 |
| Buck-Boost | $\dfrac{D}{1-D}$（反极性） | $\dfrac{D}{1-D}$ | $\dfrac{V_dD}{f_sL}$ | $\dfrac{I_oD}{f_sC}$ | 断续 |
| Cuk | $\dfrac{D}{1-D}$（反极性） | $\dfrac{D}{1-D}$ | $\dfrac{DV_d}{f_sL_{1,2}}$ | $\dfrac{DV_d}{8C_2L_2f_s^2}$ | 连续 |

---

## 八、Cuk 电路的 Matlab 仿真（P28–P31）

### 8-1 状态方程（P28）

![Cuk 仿真的两种模态与状态方程](/obsidian-assets/a1c85948aa984610.png)

以 $i_{L1}, i_{L2}, v_{c1}, v_{c2}$ 为状态变量，负载为纯电阻 $R$。按图中参考方向（$v_{c2}$ 为负值，实际输出 $-v_{c2}$ 为正）：

**模态 1（Q1 导通）**：

$$
\begin{cases}
\dfrac{di_{L1}}{dt}=\dfrac{V_s}{L_1}\\[2mm]
\dfrac{di_{L2}}{dt}=\dfrac{1}{L_2}(v_{c1}-v_{c2})\\[2mm]
\dfrac{dv_{c1}}{dt}=-\dfrac{i_{L2}}{C_1}\\[2mm]
\dfrac{dv_{c2}}{dt}=\dfrac{1}{C_2}\left(\dfrac{v_{c2}}{R}-i_{L2}\right)
\end{cases}
$$

**模态 2（Q1 关断，二极管 $D_m$ 导通）**：

$$
\begin{cases}
\dfrac{di_{L1}}{dt}=\dfrac{1}{L_1}(V_s-v_{c1})\\[2mm]
\dfrac{di_{L2}}{dt}=\dfrac{v_{c2}}{L_2}\\[2mm]
\dfrac{dv_{c1}}{dt}=\dfrac{i_{L1}}{C_1}\\[2mm]
\dfrac{dv_{c2}}{dt}=\dfrac{1}{C_2}\left(\dfrac{v_{c2}}{R}-i_{L2}\right)
\end{cases}
$$

每个开关周期内按 $DT_s$、$(1-D)T_s$ 交替使用两组方程，Matlab 中用 `ode23` 或 `ode45` 分段求解，前一段的终值作为下一段的初值。

### 8-2 仿真参数与结果（P29–P31）

![仿真参数与启动全过程](/obsidian-assets/abf65c309033d558.png)

参数：$V_s = 5\,\text{V}$，$C_1 = C_2 = 100\,\mu\text{F}$，$L_1 = L_2 = 0.5\,\text{mH}$，$R_{load} = 5\,\Omega$，$f_s = 10\,\text{kHz}$，$D = 0.8$。

![前五个周期](/obsidian-assets/1536467865f1c7c6.png)

启动的前五个周期：$i_{L1}$ 近似线性上升，$v_{c1}$ 呈阶梯状上升（每个关断段被 $i_{L1}$ 充电），输出 $-v_{c2}$ 从零缓慢建立。

![稳态下的五个周期](/obsidian-assets/69c2fb0fea2890d7.png)

**用 7-3 的公式核对稳态结果**：

| 量 | 公式 | 计算值 | 仿真读数 |
|---|---|---|---|
| $V_o$ | $\dfrac{D}{1-D}V_s$ | $4\times5 = 20\,\text{V}$ | $-v_{c2}\approx 20\,\text{V}$ |
| $V_{c1}$ | $\dfrac{V_s}{1-D}$ | $25\,\text{V}$ | 约 23.4–26.6 V，中心 25 V |
| $I_{L2}=I_o$ | $V_o/R$ | $4\,\text{A}$ | 约 3.6–4.4 A |
| $I_{L1}=I_d$ | $\dfrac{D}{1-D}I_o$ | $16\,\text{A}$ | 约 15.65–16.45 A |
| $\Delta I_{L1}$ | $\dfrac{DV_s}{f_sL_1}$ | $\dfrac{0.8\times5}{10^4\times5\times10^{-4}} = 0.8\,\text{A}$ | 约 0.8 A |
| $\Delta I_{L2}$ | $\dfrac{DV_s}{f_sL_2}$ | $0.8\,\text{A}$ | 约 0.8 A |
| $\Delta V_{c1}$ | $\dfrac{I_d(1-D)}{f_sC_1}$ | $\dfrac{16\times0.2}{10^4\times10^{-4}} = 3.2\,\text{V}$ | 约 3.2 V |
| $\Delta V_{c2}$ | $\dfrac{DV_s}{8C_2L_2f_s^2}$ | $\dfrac{4}{8\times10^{-4}\times5\times10^{-4}\times10^8} = 0.1\,\text{V}$ | 约 0.1 V（19.99–20.09 V） |

理论值与仿真结果吻合，说明在电容足够大、电流连续的前提下，"伏秒平衡 + 电荷平衡 + 线性纹波"这套近似分析是可靠的。另外可以看到：$C_1$ 的纹波（3.2 V）远大于输出电容的纹波（0.1 V），对应特点 5"$C_1$ 纹波电流大"。

---

## 九、全桥变换器（P32–P36）

### 9-1 电路与四象限运行（P32）

![全桥变换器与四象限](/obsidian-assets/f9e2de5429c43485.png)

两个桥臂 A、B，每臂上下两个开关并各自反并联二极管，负载接在 A、B 之间（典型为直流电机：$R_a$、$L_a$、反电势 $e_a$）。输出电压

$$
v_o = v_{AN} - v_{BN}
$$

$v_o$ 与 $i_o$ 都可正可负，所以全桥变换器可以**四象限运行**（电机正转/反转 × 电动/制动）。这一点与前面的 Buck（一象限）和晶闸管变换器（两象限）不同。

### 9-2 双极性电压开关 PWM（P33）

![双极性 PWM](/obsidian-assets/7da4b5cc9d80837b.png)

$(T_{A+}, T_{B-})$ 与 $(T_{A-}, T_{B+})$ 两组成对动作，用 $v_{control}$ 与三角波 $v_{tri}$（峰值 $\hat V_{tri}$）比较：

- $v_{control} > v_{tri}$：$T_{A+}$、$T_{B-}$ 得到导通信号，$v_{AN} = V_d$，$v_{BN} = 0$，$v_o = V_d$；
  - $i_o > 0$：$T_{A+}$、$T_{B-}$ 导电，$i_d = i_o$；
  - $i_o < 0$：$D_{A+}$、$D_{B-}$ 导电，$i_d = i_o$（能量回馈电源）。
- $v_{control} < v_{tri}$：$T_{A-}$、$T_{B+}$ 得到导通信号，$v_{AN} = 0$，$v_{BN} = V_d$，$v_o = -V_d$；
  - $i_o < 0$：$T_{A-}$、$T_{B+}$ 导电，$i_d = -i_o$；
  - $i_o > 0$：$D_{A-}$、$D_{B+}$ 导电，$i_d = -i_o$。

输出 $v_o$ 只在 $+V_d$ 与 $-V_d$ 之间跳变，故称"双极性"。

**输出电压平均值推导**：三角波从 $-\hat V_{tri}$ 到 $\hat V_{tri}$ 对称变化。在 $t=0$ 到 $T_s/4$ 段 $v_{tri} = \hat V_{tri}\cdot\dfrac{t}{T_s/4}$，与 $v_{control}$ 相交于 $t_1$：

$$
t_1=\frac{v_{control}}{\hat V_{tri}}\cdot\frac{T_s}{4}
$$

$T_{A+}$ 一周期内的导通时间为 $t_{on} = 2t_1 + T_s/2$，占空比

$$
D_1=\frac{t_{on}}{T_s}=\frac12\left(1+\frac{v_{control}}{\hat V_{tri}}\right)
$$

输出平均值

$$
V_o=D_1V_d-(1-D_1)V_d=(2D_1-1)V_d=\frac{v_{control}}{\hat V_{tri}}V_d
$$

$V_o$ 与 $v_{control}$ 成线性关系，且可在 $-V_d$ 到 $+V_d$ 之间连续调节。

### 9-3 单极性电压开关 PWM（P34、P35）

![单极性 PWM 的开关规律](/obsidian-assets/26f46ca01d701cd8.png)

两个桥臂分别控制：A 臂用 $v_{control}$ 与 $v_{tri}$ 比较，B 臂用 $-v_{control}$ 与同一个 $v_{tri}$ 比较。

- A 臂：$v_{control} > v_{tri}$ 时 $T_{A+}$ 导通（$T_{A-}$ 关断），$v_{AN} = V_d$；$v_{control} < v_{tri}$ 时 $T_{A-}$ 导通，$v_{AN} = 0$；
- B 臂：$-v_{control} > v_{tri}$ 时 $T_{B+}$ 导通，$v_{BN} = V_d$；$-v_{control} < v_{tri}$ 时 $T_{B-}$ 导通，$v_{BN} = 0$。

A 臂占空比为 $D_1$，B 臂与 A 臂对称，占空比 $D_2 = 1 - D_1$，所以

$$
V_o = D_1V_d - D_2V_d = (2D_1 - 1)V_d = \frac{v_{control}}{\hat V_{tri}}V_d
$$

平均输出与双极性相同。区别在于：$v_o$ 在 $V_o>0$ 时只在 $+V_d$ 与 $0$ 之间跳变（$V_o<0$ 时在 $0$ 与 $-V_d$ 之间），跳变幅值减半；且两臂错开动作，$v_o$ 的脉冲频率是 $2f_s$，相当于"等效地把开关频率加倍"，因此纹波更小。

![单极性 PWM 的电流路径](/obsidian-assets/67bde1a802b30251.png)

输入电流 $i_d = i_{d1} + i_{d2}$，两臂分别贡献：

- A 臂：$T_{A+}$ 导通时，$i_o > 0$ 由 $T_{A+}$ 导电，$i_o < 0$ 由 $D_{A+}$ 导电，均有 $i_{d1} = i_o$；$T_{A-}$ 导通时（$T_{A-}$ 或 $D_{A-}$ 导电），$i_{d1} = 0$；
- B 臂：$T_{B+}$ 导通时（$i_o < 0$ 由 $T_{B+}$ 导电，$i_o > 0$ 由 $D_{B+}$ 导电），$i_{d2} = -i_o$；$T_{B-}$ 导通时（$T_{B-}$ 或 $D_{B-}$ 导电），$i_{d2} = 0$。

当 $T_{A+}$、$T_{B+}$ 同时导通或 $T_{A-}$、$T_{B-}$ 同时导通时，$v_o = 0$，负载电流在上（或下）两个器件之间环流，$i_d = 0$，不与电源交换能量。

### 9-4 两种 PWM 的输出纹波比较（P36）

![全桥输出纹波：双极性与单极性](/obsidian-assets/8a00a34d4d485801.png)

图中纵轴是输出纹波电压有效值 $V_{r,rms}$ 与 $V_d$ 之比，横轴是 $V_o/V_d$。两条曲线可以直接由波形算出（纹波有效值² = 总有效值² − 直流分量²）。

**(a) 双极性**：$v_o$ 只取 $\pm V_d$，有效值恒为 $V_d$：

$$
V_{r,rms}=\sqrt{V_d^2-V_o^2}\quad\Longrightarrow\quad
\frac{V_{r,rms}}{V_d}=\sqrt{1-\left(\frac{V_o}{V_d}\right)^2}
$$

这是一个半圆，在 $V_o = 0$ 时最大，等于 1。

**(b) 单极性**：设 $m = |V_o|/V_d$，$v_o$ 在占比 $m$ 的时间内为 $\pm V_d$，其余为 0，有效值² $= mV_d^2$：

$$
V_{r,rms}=\sqrt{mV_d^2-m^2V_d^2}\quad\Longrightarrow\quad
\frac{V_{r,rms}}{V_d}=\sqrt{m(1-m)}
$$

在 $m = 0.5$ 时最大，为 0.5；在 $V_o = 0$ 和 $\pm V_d$ 处为 0。

结论：在整个调节范围内，单极性 PWM 的输出纹波都小于双极性，而且纹波频率加倍，更容易滤除。

---

## 十、与实验 3（直流斩波电路实验）的对应

实验板上有 1 只 MOSFET（STW26NM60N，600 V / 20 A）、1 只电力二极管、2 只 1 mH 电感、3 只 680 μF 电解电容，可接成 Buck、Boost、Buck-Boost 三种电路。过压保护 60 V、过流保护 3 A。主电路输入 $V_d = 25\,\text{V}$，负载为电子负载（恒流 CC 模式），PWM 驱动由信号发生器给出。

**要测的量**：MOSFET 驱动电压 $U_{GS}$（用于测实际占空比）、管压降 $U_{DS}$、二极管电压、电感电压与电感电流（电流钳，测前调零），以及输入、输出直流电压。

**Buck 实验内容与本讲公式的对应**：

1. 固定 $f_s = 10\,\text{kHz}$、$I_o = 1\,\text{A}$，改变占空比，对比 $V_o$ 实测值与 $DV_d$。$D = 50\%$ 时理论值 $12.5\,\text{V}$，指导书给出的观察值约 12 V，差值来自 MOSFET、二极管的导通压降和线路电阻。
2. 固定 $D = 50\%$，在 5–50 kHz 内改变 $f_s$。连续导通时 $V_o = DV_d$ 与 $f_s$ 无关，但 $\Delta I_L = \dfrac{V_dD(1-D)}{f_sL}$ 随 $f_s$ 升高而减小。
3. 断续导通：固定 $f_s = 5\,\text{kHz}$、$D = 50\%$，减小负载电流直到临界。用 4-4 节公式可预估临界电流：

$$
I_{oB}=\frac{V_dD(1-D)}{2f_sL}=\frac{25\times0.5\times0.5}{2\times5000\times10^{-3}}=0.625\,\text{A}
$$

同样参数下 $f_s = 10\,\text{kHz}$ 时 $I_{oB} = 0.3125\,\text{A}$，所以第 1、2 项在 1 A 负载下确实处于连续导通。再把 $D$ 减小到 30%、15%，电感电流明显断续，此时输出电压应按 $\dfrac{V_o}{V_d}=\dfrac{D}{D+\Delta_1}$、$\Delta_1=\dfrac{2f_sL}{V_dD}I_o$ 计算。断续期间开关节点电压会出现振荡，这是电感电流降为零后，电感与器件寄生电容之间的谐振，理想分析中不考虑。

**Boost 与 Buck-Boost**：Boost 实验要求 $D \le 50\%$，对应 $V_o \le V_d/(1-0.5) = 50\,\text{V}$，低于 60 V 的过压保护定值，输出电流不超过 1 A。Buck-Boost 实验在 $f_s = 10\,\text{kHz}$、$I_o = 1\,\text{A}$ 下测 $V_o/V_d$ 与 $D$ 的关系，并与 $\dfrac{D}{1-D}$ 比较；注意其输出电压极性与输入相反，电解电容必须按实际极性连接。

---

## 复习自测

1. 写出 PWM 下占空比 $D$ 与 $v_{control}$、$\hat V_{st}$ 的关系。
2. 什么是伏秒平衡？用它推导 Buck、Boost、Buck-Boost 的电压比。
3. 推导 Buck 的 $\Delta I_L$ 与 $\Delta V_o$。为什么 Buck 的 $\Delta V_o$ 与 $f_s^2$ 成反比，而 Boost 的只与 $f_s$ 成反比？
4. Buck 的临界负载电流 $I_{oB}$ 是多少？$D$ 取何值时最大？
5. 断续导通时 Buck 的 $V_o/V_d$ 为什么与负载电流有关？轻载时输出电压如何变化？
6. Boost 为何有 $I_{oB} = I_{LB}(1-D)$，而 Buck 是 $I_{oB} = I_{LB}$？
7. Buck-Boost 的电感平均电流为何等于 $I_d + I_o$？
8. Cuk 电路中 $V_{c1}$ 分别由 $L_1$ 和 $L_2$ 的伏秒平衡得到什么结果？由此如何得到 $V_o/V_d$？
9. 用仿真参数验证 Cuk 的 $\Delta I_{L1}$、$\Delta V_{c1}$、$\Delta V_{c2}$。
10. 全桥双极性与单极性 PWM 的输出电压平均值是否相同？纹波有何不同？推导两条纹波曲线。
11. 考虑电感电阻 $r_L$ 后，Boost 的电压比如何变化？最大电压比出现在什么条件下？
12. 实验 3 中 $V_d = 25\,\text{V}$、$L = 1\,\text{mH}$、$D = 0.5$，分别求 $f_s = 5\,\text{kHz}$ 和 $10\,\text{kHz}$ 时 Buck 的临界负载电流。
