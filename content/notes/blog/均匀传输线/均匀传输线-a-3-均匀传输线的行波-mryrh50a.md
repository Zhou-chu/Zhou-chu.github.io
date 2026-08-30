---
blog: true
title: "均匀传输线：A-3：均匀传输线的行波"
slug: "均匀传输线-a-3-均匀传输线的行波-mryrh50a"
summary: "行波的概念：为什么高频信号在传输线上表现为波的传播，以及行波的关键物理性质。"
date: 2026-07-24
category: "均匀传输线"
featured: false
---

## A-3：均匀传输线的行波
### 1. 行波的概念
在普通集总参数电路中，通常认为电压和电流的变化可以瞬间传遍整个电路。但在传输线上，电压和电流的变化需要一定时间才能从一个位置传播到另一个位置。
这种沿传输线传播的电压、电流变化称为**行波**。
均匀传输线的正弦稳态解为：
$$
\dot U(x)
=
\dot U^+e^{-\gamma x}
+
\dot U^-e^{\gamma x}
$$
$$
\dot I(x)
=
\frac{\dot U^+}{Z_c}e^{-\gamma x}
-
\frac{\dot U^-}{Z_c}e^{\gamma x}
$$
其中：
$$
\gamma=\alpha+j\beta
$$
式中：
- $\dot U^+e^{-\gamma x}$ 是沿 $+x$ 方向传播的电压行波；
- $\dot U^-e^{\gamma x}$ 是沿 $-x$ 方向传播的电压行波；
- $\alpha$ 是衰减常数；
- $\beta$ 是相位常数；
- $Z_c$ 是传输线的特性阻抗。
因此，传输线上的总电压和总电流通常是两个传播方向相反的行波叠加而成的。
---
### 2. 正向电压行波
取正向电压波的相量：
$$
\dot U_{\rm i}(x)
=
\dot U^+e^{-\gamma x}
$$
这里的下标 ${\rm i}$ 表示入射波。由于：
$$
\gamma=\alpha+j\beta
$$
所以：
$$
\dot U_{\rm i}(x)
=
\dot U^+e^{-(\alpha+j\beta)x}
$$
即：
$$
\dot U_{\rm i}(x)
=
\dot U^+e^{-\alpha x}e^{-j\beta x}
$$
设正向波在 $x=0$ 处的电压相量为：
$$
\dot U^+=U^+e^{j\varphi^+}
$$
其中 $U^+$ 为电压有效值，$\varphi^+$ 为初相位。于是：
$$
\dot U_{\rm i}(x)
=
U^+e^{-\alpha x}
e^{j(\varphi^+-\beta x)}
$$
根据相量与瞬时值的关系：
$$
u(x,t)
=
{\rm Im}
\left[
\sqrt{2}\dot U(x)e^{j\omega t}
\right]
$$
得到正向电压行波的瞬时值：
$$
\boxed{
u_{\rm i}(x,t)
=
\sqrt{2}U^+e^{-\alpha x}
\sin\left(\omega t-\beta x+\varphi^+\right)
}
$$
这个表达式包含行波的两个基本特征：
- 波的幅值随传播距离按 $e^{-\alpha x}$ 衰减；
- 波的相位随传播距离按 $-\beta x$ 变化。
### 3. 正向行波的传播方向
正向电压行波的相位为：
$$
\omega t-\beta x+\varphi^+
$$
考察波形上某一个固定相位点，例如某个波峰。对于固定相位点，应满足：
$$
\omega t-\beta x+\varphi^+=\text{常数}
$$
两边对时间 $t$ 求导：
$$
\omega-\beta\frac{{\rm d}x}{{\rm d}t}=0
$$
因此：
$$
\frac{{\rm d}x}{{\rm d}t}
=
\frac{\omega}{\beta}
$$
定义相速度：
$$
\boxed{
v_{\rm p}=\frac{\omega}{\beta}
}
$$
由于 $\omega>0$、$\beta>0$，所以：
$$
\frac{{\rm d}x}{{\rm d}t}>0
$$
这说明固定相位点随时间向 $x$ 增大的方向移动。因此，含有相位项：
$$
\omega t-\beta x
$$
的波是沿 $+x$ 方向传播的正向行波。

---
### 4. 正向电流行波
正向电压行波对应的电流相量为：
$$
\boxed{
\dot I_{\rm i}(x)
=
\frac{\dot U^+}{Z_c}e^{-\gamma x}
}
$$
正向行波的电压与电流之比为：
$$
\frac{\dot U_{\rm i}(x)}
{\dot I_{\rm i}(x)}
=
\frac{\dot U^+e^{-\gamma x}}
{\dfrac{\dot U^+}{Z_c}e^{-\gamma x}}
$$
因此：
$$
\boxed{
\frac{\dot U_{\rm i}(x)}
{\dot I_{\rm i}(x)}
=
Z_c
}
$$
由此可见，对于单独存在的正向行波，沿线任意位置的电压相量与电流相量之比始终等于特性阻抗 $Z_c$。
若：
$$
Z_c=|Z_c|e^{j\theta_c}
$$
则正向电流行波为：
$$
\dot I_{\rm i}(x)
=
\frac{U^+}{|Z_c|}
e^{-\alpha x}
e^{j(\varphi^+-\theta_c-\beta x)}
$$
对应的瞬时值为：
$$
\boxed{
i_{\rm i}(x,t)
=
\frac{\sqrt{2}U^+}{|Z_c|}
e^{-\alpha x}
\sin\left(
\omega t-\beta x+\varphi^+-\theta_c
\right)
}
$$
其中：
$$
\theta_c=\arg Z_c
$$
因此，一般有损传输线的正向电压行波与电流行波之间存在相位差 $\theta_c$。
对于无损传输线，$Z_c$ 为正实数，所以：
$$
\theta_c=0
$$
此时正向电压波和正向电流波同相。

---
### 5. 反向电压行波
反向电压波的相量为：
$$
\dot U_{\rm r}(x)
=
\dot U^-e^{\gamma x}
$$
下标 ${\rm r}$ 表示反射波。将传播常数写成：
$$
\gamma=\alpha+j\beta
$$
可得：
$$
\dot U_{\rm r}(x)
=
\dot U^-e^{\alpha x}e^{j\beta x}
$$
设：
$$
\dot U^-=U^-e^{j\varphi^-}
$$
则：
$$
\dot U_{\rm r}(x)
=
U^-e^{\alpha x}
e^{j(\varphi^-+\beta x)}
$$
反向电压行波的瞬时值为：
$$
\boxed{
u_{\rm r}(x,t)
=
\sqrt{2}U^-e^{\alpha x}
\sin\left(
\omega t+\beta x+\varphi^-
\right)
}
$$
它的相位为：
$$
\omega t+\beta x+\varphi^-
$$
对于固定相位点：
$$
\omega t+\beta x+\varphi^-=\text{常数}
$$
两边对时间求导：
$$
\omega+\beta\frac{{\rm d}x}{{\rm d}t}=0
$$
因此：
$$
\frac{{\rm d}x}{{\rm d}t}
=
-\frac{\omega}{\beta}
$$
即：
$$
\boxed{
v_{\rm r}=-\frac{\omega}{\beta}
}
$$
负号说明该波沿 $x$ 减小的方向传播。因此，含有相位项：
$$
\omega t+\beta x
$$
的波是沿 $-x$ 方向传播的反向行波。

---
### 6. 为什么反向波中出现 $e^{\alpha x}$
反向电压波写成：
$$
\dot U_{\rm r}(x)=\dot U^-e^{\alpha x}e^{j\beta x}
$$
从形式上看，其幅值似乎随 $x$ 增大而增大：
$$
|\dot U_{\rm r}(x)|=U^-e^{\alpha x}
$$
但这并不意味着传输线会使反向波的能量增加。
原因在于反向波实际沿 $-x$ 方向传播。若反向波在终端 $x=l$ 处产生，则它从终端传播到位置 $x$ 所经过的距离为：
$$
d=l-x
$$
以终端处的反射波相量 $\dot U_{\rm r}(l)$ 为参考，反向波可写为：
$$
\boxed{
\dot U_{\rm r}(x)
=
\dot U_{\rm r}(l)e^{-\gamma(l-x)}
}
$$
其幅值为：
$$
|\dot U_{\rm r}(x)|
=
|\dot U_{\rm r}(l)|e^{-\alpha(l-x)}
$$
随着反向波从 $x=l$ 向较小的 $x$ 传播，传播距离 $l-x$ 不断增加，波的幅值仍然按照 $e^{-\alpha(l-x)}$ 衰减。
所以，$e^{\alpha x}$ 只是由坐标原点和待定系数的选取造成的数学形式，并不表示反向波在传播过程中被放大。

---
### 7. 反向电流行波
反向电压波对应的电流相量为：
$$
\boxed{
\dot I_{\rm r}(x)
=
-\frac{\dot U^-}{Z_c}e^{\gamma x}
}
$$
因此，反向电压波与反向电流波之比为：
$$
\frac{\dot U_{\rm r}(x)}
{\dot I_{\rm r}(x)}
=
\frac{\dot U^-e^{\gamma x}}
{-\dfrac{\dot U^-}{Z_c}e^{\gamma x}}
$$
所以：
$$
\boxed{
\frac{\dot U_{\rm r}(x)}
{\dot I_{\rm r}(x)}
=
-Z_c
}
$$
这里的负号十分重要。它来源于电流参考方向的规定：
- 线路总电流的参考方向规定为 $+x$；
- 反向波的实际传播方向为 $-x$；
- 因此，反向电流波相对于规定的 $+x$ 参考方向带有负号。
若以反向波自身的传播方向作为电流正方向，则电压波与电流波之比仍然为 $Z_c$。

---
### 8. 总电压和总电流
传输线上的总电压是正向电压波与反向电压波之和：
$$
\boxed{
\dot U(x)
=
\dot U_{\rm i}(x)
+
\dot U_{\rm r}(x)
}
$$
即：
$$
\boxed{
\dot U(x)
=
\dot U^+e^{-\gamma x}
+
\dot U^-e^{\gamma x}
}
$$
总电流也是正向电流波与反向电流波之和：
$$
\dot I(x)
=
\dot I_{\rm i}(x)
+
\dot I_{\rm r}(x)
$$
因此：
$$
\boxed{
\dot I(x)
=
\frac{\dot U^+}{Z_c}e^{-\gamma x}
-
\frac{\dot U^-}{Z_c}e^{\gamma x}
}
$$
电压表达式中两个行波相加，而电流表达式中反向波前出现负号。这是由于正向波和反向波的电流传播方向相反。

---
### 9. 行波在不同位置之间的关系
对于正向行波，设线路上两个位置分别为 $x_1$ 和 $x_2$，并且：
$$
x_2>x_1
$$
正向电压波分别为：
$$
\dot U_{\rm i}(x_1)
=
\dot U^+e^{-\gamma x_1}
$$
$$
\dot U_{\rm i}(x_2)
=
\dot U^+e^{-\gamma x_2}
$$
两式相除：
$$
\frac{\dot U_{\rm i}(x_2)}
{\dot U_{\rm i}(x_1)}
=
e^{-\gamma(x_2-x_1)}
$$
因此：
$$
\boxed{
\dot U_{\rm i}(x_2)
=
\dot U_{\rm i}(x_1)
e^{-\gamma(x_2-x_1)}
}
$$
将 $\gamma=\alpha+j\beta$ 代入：
$$
\dot U_{\rm i}(x_2)
=
\dot U_{\rm i}(x_1)
e^{-\alpha(x_2-x_1)}
e^{-j\beta(x_2-x_1)}
$$
因此，正向行波从 $x_1$ 传播到 $x_2$ 后：
- 幅值变为原来的 $e^{-\alpha(x_2-x_1)}$；
- 相位滞后 $\beta(x_2-x_1)$；
- 传播时间为：
$$
\boxed{
\tau=\frac{x_2-x_1}{v_{\rm p}}
}
$$
对于无损传输线，$\alpha=0$，所以行波在传播过程中幅值保持不变，只发生相位滞后。
---
### 10. 波长、相位常数和相速度
正向行波的相位为：
$$
\omega t-\beta x+\varphi^+
$$
固定时刻下，当位置增加一个波长 $\lambda$ 时，波的相位应改变 $2\pi$：
$$
\beta\lambda=2\pi
$$
所以：
$$
\boxed{
\lambda=\frac{2\pi}{\beta}
}
$$
又因为：
$$
\omega=2\pi f
$$
所以相速度为：
$$
v_{\rm p}
=
\frac{\omega}{\beta}
=
\frac{2\pi f}{2\pi/\lambda}
$$
得到：
$$
\boxed{
v_{\rm p}=f\lambda
}
$$
因此：
$$
\boxed{
\lambda=\frac{v_{\rm p}}{f}
}
$$
这与一般电磁波的波长公式一致。

---
### 11. 无损传输线上的行波
对于无损均匀传输线：
$$
R_0=0,\qquad G_0=0
$$
传播常数为：
$$
\gamma=j\beta
$$
其中：
$$
\beta=\omega\sqrt{L_0C_0}
$$
特性阻抗为：
$$
Z_c=\sqrt{\frac{L_0}{C_0}}
$$
相速度为：
$$
v_{\rm p}
=
\frac{1}{\sqrt{L_0C_0}}
$$
正向电压、电流行波为：
$$
\boxed{
\dot U_{\rm i}(x)
=
\dot U^+e^{-j\beta x}
}
$$
$$
\boxed{
\dot I_{\rm i}(x)
=
\frac{\dot U^+}{Z_c}e^{-j\beta x}
}
$$
对应的瞬时值为：
$$
\boxed{
u_{\rm i}(x,t)
=
\sqrt{2}U^+
\sin\left(
\omega t-\beta x+\varphi^+
\right)
}
$$
$$
\boxed{
i_{\rm i}(x,t)
=
\frac{\sqrt{2}U^+}{Z_c}
\sin\left(
\omega t-\beta x+\varphi^+
\right)
}
$$
可见，无损线上的正向电压波和正向电流波：
- 以相同速度向 $+x$ 方向传播；
- 传播过程中幅值不变；
- 电压和电流同相；
- 电压与电流之比恒等于 $Z_c$。
反向电压、电流行波为：
$$
\boxed{
\dot U_{\rm r}(x)
=
\dot U^-e^{j\beta x}
}
$$
$$
\boxed{
\dot I_{\rm r}(x)
=
-\frac{\dot U^-}{Z_c}e^{j\beta x}
}
$$
对应的瞬时值为：
$$
u_{\rm r}(x,t)
=
\sqrt{2}U^-
\sin\left(
\omega t+\beta x+\varphi^-
\right)
$$
$$
i_{\rm r}(x,t)
=
-\frac{\sqrt{2}U^-}{Z_c}
\sin\left(
\omega t+\beta x+\varphi^-
\right)
$$
---
### 12. 行波携带的平均功率
行波不仅传播电压和电流的变化，还会沿传输线传递电磁能量。
对于无损传输线的正向行波，由于电压和电流同相，且相量采用有效值表示，所以正向行波传输的平均功率为：
$$
P_{\rm i}
=
{\rm Re}
\left[
\dot U_{\rm i}(x)
\dot I_{\rm i}^*(x)
\right]
$$
代入：
$$
\dot I_{\rm i}(x)
=
\frac{\dot U_{\rm i}(x)}{Z_c}
$$
由于无损线的 $Z_c$ 为正实数，所以：
$$
\boxed{
P_{\rm i}
=
\frac{|\dot U_{\rm i}(x)|^2}{Z_c}
}
$$
正向行波的功率沿 $+x$ 方向传输。
反向行波沿 $-x$ 方向传输功率，其功率大小为：
$$
\boxed{
P_{\rm r}
=
\frac{|\dot U_{\rm r}(x)|^2}{Z_c}
}
$$
如果把 $+x$ 方向规定为功率的正方向，则线路上的净平均功率为：
$$
\boxed{
P
=
\frac{|\dot U_{\rm i}(x)|^2}{Z_c}
-
\frac{|\dot U_{\rm r}(x)|^2}{Z_c}
}
$$
即：
$$
\boxed{
P=P_{\rm i}-P_{\rm r}
}
$$
这说明反射波会把一部分能量从负载方向送回信号源。

---
### 13. 只有正向行波的条件
如果传输线终端负载阻抗等于特性阻抗：
$$
\boxed{
Z_L=Z_c
}
$$
则入射波到达负载后不会发生反射，因此：
$$
\dot U^-=0
$$
此时线路上只有正向行波：
$$
\dot U(x)=\dot U^+e^{-\gamma x}
$$
$$
\dot I(x)=\frac{\dot U^+}{Z_c}e^{-\gamma x}
$$
沿线任意位置的输入阻抗均为：
$$
\frac{\dot U(x)}{\dot I(x)}=Z_c
$$
这种状态称为**阻抗匹配状态**。
因此，特性阻抗也可以理解为：当传输线终端接入数值等于 $Z_c$ 的负载时，传输线上只存在向负载方向传播的行波，不会产生反射波。

---
### 14. 行波与驻波的区别
单独的正向波或反向波都是行波，其波峰和波谷会随时间沿线路移动。
当传输线上同时存在正向波和反向波时，总电压和总电流是两个行波的叠加。叠加结果取决于两个波的幅值和相位：
- 若只有正向波，则线路上是纯行波状态；
- 若反向波小于正向波，则形成行波和驻波共同存在的混合状态；
- 若反向波与正向波幅值相等，则形成纯驻波。
行波与驻波最根本的区别在于：
- 行波的波峰、波谷沿线路移动，并向前传输平均功率；
- 驻波的波腹、波节位置固定，纯驻波不向终端传输净平均功率。
---
### 15. 行波的物理本质
传输线上的电压和电流并不是两个彼此独立传播的量。它们分别反映传输线周围的电场和磁场：
- 两导线之间的电压与电场强度有关；
- 导线中的电流与周围的磁场强度有关；
- 电场能量主要储存在分布电容 $C_0$ 中；
- 磁场能量主要储存在分布电感 $L_0$ 中。
传输过程中，电场能和磁场能不断相互转换，使电磁能量沿传输线向前传播。因此，从电路角度看是电压波和电流波，从电磁场角度看则是沿传输线传播的电磁波。
---
### 16. 核心结论
均匀传输线上的正向行波为：
$$
\boxed{
\begin{cases}
\displaystyle
\dot U_{\rm i}(x)
=
\dot U^+e^{-\gamma x}
\\[0.8em]
\displaystyle
\dot I_{\rm i}(x)
=
\frac{\dot U^+}{Z_c}e^{-\gamma x}
\end{cases}
}
$$
反向行波为：
$$
\boxed{
\begin{cases}
\displaystyle
\dot U_{\rm r}(x)
=
\dot U^-e^{\gamma x}
\\[0.8em]
\displaystyle
\dot I_{\rm r}(x)
=
-\frac{\dot U^-}{Z_c}e^{\gamma x}
\end{cases}
}
$$
正向波和反向波的判断规律为：
$$
\boxed{
\omega t-\beta x
\quad\Rightarrow\quad
\text{沿 }+x\text{ 方向传播}
}
$$
$$
\boxed{
\omega t+\beta x
\quad\Rightarrow\quad
\text{沿 }-x\text{ 方向传播}
}
$$
相速度和波长分别为：
$$
\boxed{
v_{\rm p}=\frac{\omega}{\beta}
}
$$
$$
\boxed{
\lambda=\frac{2\pi}{\beta}
=\frac{v_{\rm p}}{f}
}
$$
行波的主要特征可以概括为：**幅值随传播距离衰减，相位随传播距离变化，并以有限速度沿传输线传播电磁能量。**
