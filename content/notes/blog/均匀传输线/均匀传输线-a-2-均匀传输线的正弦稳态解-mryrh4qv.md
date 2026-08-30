---
blog: true
title: "均匀传输线：A-2：均匀传输线的正弦稳态解"
slug: "均匀传输线-a-2-均匀传输线的正弦稳态解-mryrh4qv"
summary: "均匀传输线的正弦稳态分析：始端电压为正弦函数时，沿线电压与电流的稳态分布规律。"
date: 2026-07-24
category: "均匀传输线"
featured: false
---

+ 现在来研究均匀传输线的始端电压是角频率 $\omega$ 的正弦时间函数时电路的稳态分析。在这种情况下，沿线各处的电压和电流也一定是同概率的正弦时间函数。这样就可以应用相量法来分析沿线的电压和电流，于是有：$$u(x,t)={\rm Im}[\sqrt{2}\dot{U}(x)e^{j\omega t}],i(x,t)={\rm Im}[\sqrt{2}\dot{I}(x)e^{j\omega t}]$$
+ $Z_0=R_0+j\omega L_0$ 是单位长度的阻抗，$Y_0=G_0+j\omega C_0$ 是单位长度的导纳
## A-2：均匀传输线的正弦稳态解
### 1. 正弦稳态下的电压和电流
现在研究均匀传输线在正弦激励下的稳态响应。设传输线始端电压是角频率为 $\omega$ 的正弦时间函数。由于均匀传输线由线性电阻、电感、电导和电容构成，因此在线路的暂态过程消失以后，沿线各处的电压和电流都是**与激励同频率**的正弦时间函数。
需要注意，沿线各处电压和电流的频率相同，但它们的有效值和初相位一般随位置 $x$ 改变。因此可写成：
$$
u(x,t)=\sqrt{2}U(x)\sin\left[\omega t+\varphi_u(x)\right]
$$
$$
i(x,t)=\sqrt{2}I(x)\sin\left[\omega t+\varphi_i(x)\right]
$$
引入电压、电流的相量：
$$
\dot U(x)=U(x)e^{j\varphi_u(x)}
$$
$$
\dot I(x)=I(x)e^{j\varphi_i(x)}
$$
则瞬时值可以表示为：
$$
\boxed{
u(x,t)={\rm Im}\left[\sqrt{2}\dot U(x)e^{j\omega t}\right]
}
$$
$$
\boxed{
i(x,t)={\rm Im}\left[\sqrt{2}\dot I(x)e^{j\omega t}\right]
}
$$
其中：
- $\dot U(x)$ 和 $\dot I(x)$ 是以有效值表示的相量；
- $\sqrt{2}$ 用于将有效值转换为正弦量的峰值；
- 采用 ${\rm Im}[\cdot]$ 表示取复数的虚部，与以正弦函数作为参考相对应；
- 若采用余弦作为参考，也可以写成 ${\rm Re}[\cdot]$，但整套推导中的参考方式必须保持一致。
这里的相量不仅包含幅值和初相位，而且是位置 $x$ 的函数。引入相量法以后，可以消去时间变量，把关于 $x$、$t$ 的偏微分方程转化为仅关于位置 $x$ 的常微分方程。
---
### 2. 单位长度阻抗和单位长度导纳
均匀传输线单位长度的四个分布参数分别为：
$$
R_0,\qquad L_0,\qquad G_0,\qquad C_0
$$
在正弦稳态下，单位长度的串联电阻和串联电感可以合并为单位长度阻抗：
$$
\boxed{
Z_0=R_0+j\omega L_0
}
$$
其单位为：
$$
[Z_0]=\Omega/{\rm m}
$$
其中：
- $R_0$ 表示单位长度导线的电阻；
- $j\omega L_0$ 表示单位长度导线的感抗。
同理，单位长度的并联电导和并联电容可以合并为单位长度导纳：
$$
\boxed{
Y_0=G_0+j\omega C_0
}
$$
其单位为：
$$
[Y_0]={\rm S}/{\rm m}
$$
其中：
- $G_0$ 表示单位长度绝缘介质的漏电导；
- $j\omega C_0$ 表示单位长度电容的容纳。
因此，长度为 ${\rm d}x$ 的传输线微元具有：
$$
\text{串联阻抗}=Z_0{\rm d}x
$$
$$
\text{并联导纳}=Y_0{\rm d}x
$$
> 注意：$Z_0$ 是单位长度阻抗，单位为 $\Omega/{\rm m}$；后面出现的 $Z_c$ 是传输线的特性阻抗，单位为 $\Omega$。二者不是同一个物理量。
### 3. 时域传输线方程
均匀传输线在时域中的电报方程为：
$$
\frac{\partial u(x,t)}{\partial x}
=
-R_0i(x,t)-L_0\frac{\partial i(x,t)}{\partial t}
$$
$$
\frac{\partial i(x,t)}{\partial x}
=
-G_0u(x,t)-C_0\frac{\partial u(x,t)}{\partial t}
$$
在正弦稳态相量法中，对时间求导相当于将相量乘以 $j\omega$，即：
$$
\frac{\partial}{\partial t}
\quad\longleftrightarrow\quad
j\omega
$$
因此：
$$
\frac{\partial i(x,t)}{\partial t}
\quad\longleftrightarrow\quad
j\omega\dot I(x)
$$
$$
\frac{\partial u(x,t)}{\partial t}
\quad\longleftrightarrow\quad
j\omega\dot U(x)
$$
而对位置 $x$ 求导仍然保留为普通微分。于是，第一条时域方程对应的相量方程为：
$$
\frac{{\rm d}\dot U(x)}{{\rm d}x}
=
-R_0\dot I(x)-j\omega L_0\dot I(x)
$$
整理得：
$$
\frac{{\rm d}\dot U(x)}{{\rm d}x}
=
-\left(R_0+j\omega L_0\right)\dot I(x)
$$
代入 $Z_0=R_0+j\omega L_0$，得到：
$$
\boxed{
\frac{{\rm d}\dot U(x)}{{\rm d}x}
=-Z_0\dot I(x)
}
$$
同理，第二条时域方程对应的相量方程为：
$$
\frac{{\rm d}\dot I(x)}{{\rm d}x}
=
-G_0\dot U(x)-j\omega C_0\dot U(x)
$$
即：
$$
\frac{{\rm d}\dot I(x)}{{\rm d}x}
=
-\left(G_0+j\omega C_0\right)\dot U(x)
$$
代入 $Y_0=G_0+j\omega C_0$，得到：
$$
\boxed{
\frac{{\rm d}\dot I(x)}{{\rm d}x}
=-Y_0\dot U(x)
}
$$
因此，均匀传输线在正弦稳态下的相量形式电报方程为：
$$
\boxed{
\begin{cases}
\displaystyle
\frac{{\rm d}\dot U(x)}{{\rm d}x}
=-Z_0\dot I(x)
\\[1em]
\displaystyle
\frac{{\rm d}\dot I(x)}{{\rm d}x}
=-Y_0\dot U(x)
\end{cases}
}
$$
这是一组一阶常系数常微分方程。
### 4. 电压相量的二阶方程
对第一条相量方程再对 $x$ 求导：
$$
\frac{{\rm d}^2\dot U(x)}{{\rm d}x^2}
=
-Z_0\frac{{\rm d}\dot I(x)}{{\rm d}x}
$$
由于均匀传输线的 $Z_0$ 不随位置 $x$ 变化，因此可以直接提出微分号外。
由第二条相量方程：
$$
\frac{{\rm d}\dot I(x)}{{\rm d}x}
=-Y_0\dot U(x)
$$
代入得：
$$
\frac{{\rm d}^2\dot U(x)}{{\rm d}x^2}
=
-Z_0\left[-Y_0\dot U(x)\right]
$$
因此：
$$
\boxed{
\frac{{\rm d}^2\dot U(x)}{{\rm d}x^2}
-Z_0Y_0\dot U(x)=0
}
$$
定义传播常数：
$$
\boxed{
\gamma=\sqrt{Z_0Y_0}
}
$$
于是电压相量满足：
$$
\boxed{
\frac{{\rm d}^2\dot U(x)}{{\rm d}x^2}
-\gamma^2\dot U(x)=0
}
$$
### 5. 电流相量的二阶方程
对第二条相量方程再对 $x$ 求导：
$$
\frac{{\rm d}^2\dot I(x)}{{\rm d}x^2}
=
-Y_0\frac{{\rm d}\dot U(x)}{{\rm d}x}
$$
由第一条相量方程：
$$
\frac{{\rm d}\dot U(x)}{{\rm d}x}
=-Z_0\dot I(x)
$$
代入得：
$$
\frac{{\rm d}^2\dot I(x)}{{\rm d}x^2}
=
-Y_0\left[-Z_0\dot I(x)\right]
$$
所以：
$$
\boxed{
\frac{{\rm d}^2\dot I(x)}{{\rm d}x^2}
-Z_0Y_0\dot I(x)=0
}
$$
又因为 $\gamma^2=Z_0Y_0$，所以：
$$
\boxed{
\frac{{\rm d}^2\dot I(x)}{{\rm d}x^2}
-\gamma^2\dot I(x)=0
}
$$
由此可见，电压相量和电流相量满足形式相同的二阶常微分方程。
### 6. 传播常数
传播常数为：
$$
\boxed{
\gamma
=
\sqrt{Z_0Y_0}
=
\sqrt{
\left(R_0+j\omega L_0\right)
\left(G_0+j\omega C_0\right)
}
}
$$
传播常数通常写成：
$$
\boxed{
\gamma=\alpha+j\beta
}
$$
其中：
- $\alpha$ 称为衰减常数，单位为 ${\rm Np}/{\rm m}$；
- $\beta$ 称为相位常数，单位为 ${\rm rad}/{\rm m}$。
对于沿 $+x$ 方向传播的因子：
$$
e^{-\gamma x}
=
e^{-(\alpha+j\beta)x}
=
e^{-\alpha x}e^{-j\beta x}
$$
其中：
- $e^{-\alpha x}$ 表示波的幅值随传播距离按指数规律衰减；
- $e^{-j\beta x}$ 表示波的相位随传播距离不断滞后。
因此，$\alpha$ 决定传输线的衰减特性，$\beta$ 决定传输线的相位变化和传播速度。
相位常数与波长之间的关系为：
$$
\boxed{
\beta=\frac{2\pi}{\lambda}
}
$$
所以：
$$
\boxed{
\lambda=\frac{2\pi}{\beta}
}
$$
相速度为：
$$
\boxed{
v_{\rm p}
=
\frac{\omega}{\beta}
}
$$
### 7. 电压相量的一般解
电压相量满足：
$$
\frac{{\rm d}^2\dot U}{{\rm d}x^2}
-\gamma^2\dot U=0
$$
其特征方程为：
$$
r^2-\gamma^2=0
$$
解得：
$$
r_1=-\gamma,\qquad r_2=\gamma
$$
因此，电压相量的一般解为：
$$
\boxed{
\dot U(x)
=
\dot U^+e^{-\gamma x}
+
\dot U^-e^{\gamma x}
}
$$
其中：
- $\dot U^+e^{-\gamma x}$ 表示沿 $+x$ 方向传播的电压波，称为入射波或正向行波；
- $\dot U^-e^{\gamma x}$ 表示沿 $-x$ 方向传播的电压波，称为反射波或反向行波；
- $\dot U^+$、$\dot U^-$ 是由始端和终端边界条件决定的复常数。
这里假设 $x$ 轴正方向由传输线始端指向终端。
### 8. 电流相量的一般解
由第一条相量形式电报方程：
$$
\frac{{\rm d}\dot U(x)}{{\rm d}x}
=-Z_0\dot I(x)
$$
可得：
$$
\dot I(x)
=
-\frac{1}{Z_0}
\frac{{\rm d}\dot U(x)}{{\rm d}x}
$$
将电压通解代入：
$$
\frac{{\rm d}\dot U(x)}{{\rm d}x}
=
-\gamma\dot U^+e^{-\gamma x}
+
\gamma\dot U^-e^{\gamma x}
$$
因此：
$$
\dot I(x)
=
-\frac{1}{Z_0}
\left[
-\gamma\dot U^+e^{-\gamma x}
+
\gamma\dot U^-e^{\gamma x}
\right]
$$
整理得：
$$
\dot I(x)
=
\frac{\gamma}{Z_0}
\dot U^+e^{-\gamma x}
-
\frac{\gamma}{Z_0}
\dot U^-e^{\gamma x}
$$
由于：
$$
\gamma=\sqrt{Z_0Y_0}
$$
所以：
$$
\frac{\gamma}{Z_0}
=
\sqrt{\frac{Y_0}{Z_0}}
$$
定义均匀传输线的特性阻抗：
$$
\boxed{
Z_c
=
\sqrt{\frac{Z_0}{Y_0}}
=
\sqrt{
\frac{R_0+j\omega L_0}
{G_0+j\omega C_0}
}
}
$$
于是：
$$
\frac{\gamma}{Z_0}=\frac{1}{Z_c}
$$
最终得到电流相量：
$$
\boxed{
\dot I(x)
=
\frac{\dot U^+}{Z_c}e^{-\gamma x}
-
\frac{\dot U^-}{Z_c}e^{\gamma x}
}
$$
电压、电流的正弦稳态通解合写为：
$$
\boxed{
\begin{cases}
\displaystyle
\dot U(x)
=
\dot U^+e^{-\gamma x}
+
\dot U^-e^{\gamma x}
\\[1em]
\displaystyle
\dot I(x)
=
\frac{\dot U^+}{Z_c}e^{-\gamma x}
-
\frac{\dot U^-}{Z_c}e^{\gamma x}
\end{cases}
}
$$

---
### 9. 特性阻抗的物理意义
对于正向行波：
$$
\dot U_{\rm i}(x)=\dot U^+e^{-\gamma x}
$$
$$
\dot I_{\rm i}(x)=\frac{\dot U^+}{Z_c}e^{-\gamma x}
$$
所以正向电压波与正向电流波之比为：
$$
\boxed{
\frac{\dot U_{\rm i}(x)}
{\dot I_{\rm i}(x)}
=Z_c
}
$$
对于反向行波：
$$
\dot U_{\rm r}(x)=\dot U^-e^{\gamma x}
$$
$$
\dot I_{\rm r}(x)
=-\frac{\dot U^-}{Z_c}e^{\gamma x}
$$
所以：
$$
\boxed{
\frac{\dot U_{\rm r}(x)}
{\dot I_{\rm r}(x)}
=-Z_c
}
$$
反向波中出现负号，是因为电流的参考方向规定为 $+x$，而反射波实际沿 $-x$ 方向传播。
特性阻抗 $Z_c$ 描述的是**单一行波的电压相量与电流相量之比**。它由传输线自身的单位长度参数和工作频率决定，与传输线的实际长度无关，也不等同于负载阻抗。
### 10. 用始端电压和电流表示沿线量
当坐标原点位于始端，即 $x=0$ 时：
$$
\dot U(0)=\dot U^++\dot U^-
$$
$$
\dot I(0)=\frac{\dot U^+-\dot U^-}{Z_c}
$$
记：
$$
\dot U(0)=\dot U_1,\qquad
\dot I(0)=\dot I_1
$$
由此解得：
$$
\dot U^+
=
\frac{1}{2}
\left(
\dot U_1+Z_c\dot I_1
\right)
$$
$$
\dot U^-
=
\frac{1}{2}
\left(
\dot U_1-Z_c\dot I_1
\right)
$$
代回电压通解，并利用：
$$
\cosh(\gamma x)
=
\frac{e^{\gamma x}+e^{-\gamma x}}{2}
$$
$$
\sinh(\gamma x)
=
\frac{e^{\gamma x}-e^{-\gamma x}}{2}
$$
得到：
$$
\boxed{
\dot U(x)
=
\dot U_1\cosh(\gamma x)
-
Z_c\dot I_1\sinh(\gamma x)
}
$$
类似地：
$$
\boxed{
\dot I(x)
=
\dot I_1\cosh(\gamma x)
-
\frac{\dot U_1}{Z_c}\sinh(\gamma x)
}
$$
这两个式子给出了已知始端电压、电流时，沿线任意位置的电压和电流。
### 11. 无损均匀传输线的正弦稳态解
对于理想无损传输线：
$$
R_0=0,\qquad G_0=0
$$
单位长度阻抗和导纳分别为：
$$
Z_0=j\omega L_0
$$
$$
Y_0=j\omega C_0
$$
传播常数为：
$$
\gamma
=
\sqrt{(j\omega L_0)(j\omega C_0)}
$$
由于 $j^2=-1$，因此：
$$
\gamma
=
j\omega\sqrt{L_0C_0}
$$
所以：
$$
\boxed{
\alpha=0
}
$$
$$
\boxed{
\beta=\omega\sqrt{L_0C_0}
}
$$
无损线没有幅值衰减，只有相位随距离发生变化。
特性阻抗为：
$$
Z_c
=
\sqrt{
\frac{j\omega L_0}{j\omega C_0}
}
$$
因此：
$$
\boxed{
Z_c=\sqrt{\frac{L_0}{C_0}}
}
$$
无损传输线的特性阻抗为纯电阻，与频率无关。
相速度为：
$$
v_{\rm p}
=
\frac{\omega}{\beta}
=
\frac{\omega}
{\omega\sqrt{L_0C_0}}
$$
所以：
$$
\boxed{
v_{\rm p}
=
\frac{1}{\sqrt{L_0C_0}}
}
$$
电压、电流相量为：
$$
\boxed{
\dot U(x)
=
\dot U^+e^{-j\beta x}
+
\dot U^-e^{j\beta x}
}
$$
$$
\boxed{
\dot I(x)
=
\frac{\dot U^+}{Z_c}e^{-j\beta x}
-
\frac{\dot U^-}{Z_c}e^{j\beta x}
}
$$
### 12. 核心结论
均匀传输线在正弦稳态下的分析过程可以概括为：
$$
\text{时域电报方程}
\longrightarrow
\text{相量形式的一阶方程}
\longrightarrow
\text{二阶常微分方程}
\longrightarrow
\text{正向波与反向波}
$$
其中最重要的三个参数是：
$$
\boxed{
Z_0=R_0+j\omega L_0
}
$$
$$
\boxed{
Y_0=G_0+j\omega C_0
}
$$
$$
\boxed{
\gamma=\sqrt{Z_0Y_0}=\alpha+j\beta
}
$$
以及特性阻抗：
$$
\boxed{
Z_c=\sqrt{\frac{Z_0}{Y_0}}
}
$$
均匀传输线上的电压和电流并不是只有时间上的正弦变化，还会随位置发生幅值和相位变化。其本质是正向传播波与反向传播波的叠加。
