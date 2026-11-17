---
blog: true
title: "大数据技术与应用：第 6 讲 Transformer与Attention"
slug: "大数据技术与应用-第6讲-transformer与attention-bd06"
summary: "用可手算的 Q/K/V 例子建立注意力机制，核对矩阵维度和梯度，再解释多头、位置编码、FFN、因果遮罩、下一 token 训练及 MoE 参数规模。"
date: 2026-11-18
category: "大数据技术与应用"
featured: false
tags:
  - "大数据技术与应用"
  - "Transformer"
  - "Attention"
  - "语言模型"
  - "MoE"
  - "课程笔记"
outgoing:
  - "大数据技术与应用-第5讲-rnn与lstm及图神经网络-bd05"
  - "大数据技术与应用-第7讲-集成学习与随机森林-bd07"
---

# 第 6 讲：Transformer——从一次注意力计算到语言模型

读到“Michael Jordan plays the sport of”时，预测下一个词需要同时利用人物和句式。负荷预测也类似：当前时刻可能需要读取最近的变化趋势，也可能需要参考几天前的同一时刻。Attention 用可训练的匹配规则，把这些位置的信息组合到当前表示中。

## 1. Token 与 Embedding 是输入的两层表示（P3–P9）

Token 是模型处理序列的基本单位。语言里可以是子词、符号；时间序列里可以把一个多变量时间步作为一个 token。如何划分 token，是建模选择的一部分。

Embedding 将 token 转为向量。对词表，可以通过索引查找可训练的向量；对连续时序特征，可以先做线性投影。若序列长度为 $n$、模型宽度为 $d$，按行堆叠得到

$$
X\in\mathbb R^{n\times d}.
$$

初始向量主要表示当前位置的内容。同一个词在不同上下文中可能有不同含义，模型需要再借助其他位置更新它。

## 2. Q、K、V：匹配与读取分开做（P10–P14）

对位置 $i$ 的输入行向量 $x_i$，作三次投影：

$$
q_i=x_iW_Q,\qquad k_i=x_iW_K,\qquad v_i=x_iW_V.
$$

Query 表示当前位置怎样发起匹配；Key 提供被匹配的表示；Value 提供最终被组合的内容。这些角色由训练得到，不需要人工给每个维度指定语义。

设

$$
W_Q,W_K\in\mathbb R^{d\times d_k},
\qquad W_V\in\mathbb R^{d\times d_v}.
$$

一个 Query 读取整个序列分三步：

$$
s_{ij}=\frac{q_ik_j^\top}{\sqrt{d_k}},
$$

$$
\alpha_{ij}
=\frac{\exp(s_{ij})}{\sum_m\exp(s_{im})},
$$

$$
z_i=\sum_j\alpha_{ij}v_j.
$$

Softmax 在固定 Query 的一行内归一化，因此 $\sum_j\alpha_{ij}=1$。输出 $z_i$ 是 Value 的加权和；分数来自 Q/K，内容来自 V。

### 2.1 一次可以手算的读取

令 $d_k=2$，

$$
q=(1,0),\quad
k_1=(1,0),\ k_2=(0,1),\ k_3=(-1,0).
$$

缩放分数为 $(1/\sqrt2,0,-1/\sqrt2)$，Softmax 权重约为

$$
\alpha=(0.5760,\ 0.2840,\ 0.1400).
$$

若 $v_1=(1,0),v_2=(0,1),v_3=(1,1)$，则

$$
z\approx(0.7160,\ 0.4240).
$$

现在只改变 $v_2$，权重不会变，但输出会变；只改变 $k_2$，则匹配权重和输出都可能改变。

![widget|700](/obsidian-assets/a06e3fa424855836.html)

控件使用这三个 Key 和 Value。转动 Query 可以观察权重重新分配；切换因果遮罩后，当前位置看不到未来 Key，相应权重严格为零。

### 2.2 为什么除以平方根

若 Q/K 各坐标近似独立、均值为零、方差为 1，$d_k$ 项内积的方差约为 $d_k$。除以 $\sqrt{d_k}$ 后，分数的尺度不再随维度同样增大，减少 Softmax 因分数过大而过于尖锐的情况。这是尺度控制的动机，不是说所有真实 Q/K 都严格服从这些统计假设。

## 3. 矩阵写法一次完成全部 Query（P13、P18）

$$
Q=XW_Q,\quad K=XW_K,\quad V=XW_V,
$$

$$
\operatorname{Attention}(Q,K,V)
=\operatorname{softmax}_{\rm row}
\left(\frac{QK^\top}{\sqrt{d_k}}+M\right)V.
$$

这里 $M$ 取允许位置为 0、禁止位置为 $-\infty$。禁止位置取指数后变为零，因此不参与读取。

| 中间量 | 形状 | 每个元素的意义 |
|---|---|---|
| $Q,K$ | $n\times d_k$ | 每个位置的匹配向量 |
| $V$ | $n\times d_v$ | 每个位置提供的内容 |
| $S=QK^\top/\sqrt{d_k}$ | $n\times n$ | Query $i$ 对 Key $j$ 的分数 |
| $A=\mathrm{softmax}_{\rm row}(S)$ | $n\times n$ | 每个 Query 的读取权重 |
| $Z=AV$ | $n\times d_v$ | 每个位置读到的上下文 |

标准全局自注意力需要处理 $n\times n$ 的交互关系。单层内各位置可并行计算，但长序列的计算和存储仍会增长。

## 4. 多头注意力不是重复使用同一套权重（P15–P18）

第 $r$ 个头使用独立投影：

$$
\mathrm{head}_r
=\operatorname{Attention}(XW_Q^{(r)},XW_K^{(r)},XW_V^{(r)}).
$$

拼接后再混合：

$$
\operatorname{MHA}(X)
=\operatorname{Concat}(\mathrm{head}_1,\ldots,\mathrm{head}_h)W_O.
$$

不同头可以学习不同的读取模式，例如近期趋势和周期参照。它们是否分化出清楚的功能取决于训练结果，不能预先保证某个头必然负责某一种语义。

常见配置取 $d_k=d_v=d/h$，各头拼接后回到 $d$ 维。课件前面为解释单头将 $d_v$ 取为 $d$；维度选择不同，参数统计也会不同。

## 5. Attention 怎样通过任务损失学会读取（P19）

Q/K/V 是前向计算的中间量，持久保存和更新的是投影矩阵。为了看清反向路径，令 $G_Z=\partial L/\partial Z$，忽略遮罩细节：

$$
G_V=A^\top G_Z,\qquad G_A=G_ZV^\top.
$$

对第 $i$ 行 Softmax，梯度为

$$
(G_S)_{ij}
=A_{ij}\left[(G_A)_{ij}
-\sum_mA_{im}(G_A)_{im}\right].
$$

再经 $S=QK^\top/\sqrt{d_k}$：

$$
G_Q=\frac{G_SK}{\sqrt{d_k}},\qquad
G_K=\frac{G_S^\top Q}{\sqrt{d_k}}.
$$

最后如

$$
G_{W_Q}=X^\top G_Q.
$$

这说明模型不需要人为指定“该关注哪个词”；最终预测的损失会通过上述计算链更新匹配规则。这里的矩阵推导是对课件反向路径的补充展开。

## 6. 完整 Transformer 还需要什么（P21–P27）

### 6.1 顺序信息

没有位置表示的自注意力对输入置换是等变的：换一下输入顺序，输出也相应换位置，但不能仅凭内容知道谁在前谁在后。

原始 Transformer 将位置编码加到内容向量上：

$$
x_i=e_i+p_i,
$$

$$
\begin{aligned}
p_{i,2r}&=\sin\left(i/10000^{2r/d}\right),\\
p_{i,2r+1}&=\cos\left(i/10000^{2r/d}\right).
\end{aligned}
$$

不同频率的坐标共同编码位置。对负荷序列，还可以另行表示小时、星期等日历信息。

### 6.2 残差与 LayerNorm

残差将子层输入加回输出，使信息和梯度具有直接通路。按课件展示的后归一化形式：

$$
H=\operatorname{LN}(X+\operatorname{MHA}(X)).
$$

LayerNorm 对每个 token 的特征维度计算均值和方差，再应用可学习的缩放与平移；它不是把整段序列混在一起做一次归一化。

### 6.3 逐位置 FFN

$$
\operatorname{FFN}(h_i)
=\operatorname{ReLU}(h_iW_1+b_1)W_2+b_2.
$$

FFN 在每个位置共享参数，却分别处理各位置向量。Attention 混合不同位置的信息，FFN 非线性变换同一位置的特征。随后再做残差与归一化：

$$
Y=\operatorname{LN}(H+\operatorname{FFN}(H)).
$$

多次堆叠这个结构，就能反复更新上下文表示。以上对应课件和原始论文的基本结构；归一化放在子层前或后，是具体架构的选择。

## 7. Encoder、Decoder 与下一 Token 预测（P28–P32）

Encoder 的位置通常可看完整输入。Decoder-only 模型使用因果遮罩，只允许位置 $i$ 读取 $j\le i$ 的信息。

经典 Encoder–Decoder 结构还包括交叉注意力：Query 来自目标端，Key/Value 来自编码后的源序列。它与 Decoder-only 只读取目标前缀的结构不同。

语言模型把当前位置输出投影到词表，预测

$$
p_\theta(x_{t+1}\mid x_{\le t}).
$$

训练损失为

$$
L=-\sum_t\log p_\theta(x_{t+1}\mid x_{\le t}).
$$

训练时所有位置的目标都已知，因果遮罩仍确保每个位置看不到自己的答案，因此多个位置可并行计算损失。生成时则先采样下一个 token、加入前缀，再继续下一步。

## 8. 参数规模：为什么宽度影响很大（P33–P36）

对经典宽度 $d$、FFN 中间维度 $4d$ 的块，忽略偏置与归一化小项：

$$
N_{\rm attn}\approx4d^2,\qquad
N_{\rm FFN}\approx8d^2,
$$

$$
N_{\rm block}\approx12d^2.
$$

因此 $L$ 层主体约有 $12Ld^2$ 个参数，此外还有词嵌入、输出层等。课件以 GPT-3 的 $L=96,d=12288$ 为例，这个近似给出约 $173.95$B，说明宽度平方和层数共同决定规模。

MoE 将 FFN 换成多个专家，由路由器为不同 token 选择少数专家。总参数量与单个 token 激活的参数量由此分开。课件引用的 DeepSeek-V3 技术报告给出 671B 总参数、每 token 约 37B 激活参数；这是该模型报告中的配置，不代表所有 MoE 都有相同比例。[DeepSeek-V3 技术报告](https://arxiv.org/html/2412.19437v2)

一个含两条输入投影和一条输出投影的门控专家，主体参数约为 $3dd_{\rm expert}$。这与上一讲普通两矩阵 FFN 的计数不同，统计前需要先看清结构。

## 9. 用于负荷预测时，Attention 在读取什么

若每个 token 是一个时间步，Q/K 可以学到哪些历史条件与当前预测相关，V 则提供负荷、气象和日历特征的组合。预测未来时必须限制可见信息，不能把真实未来负荷或预测时尚不可得的数据放入输入。

Attention 图显示的是模型内部的读取权重。它可以辅助观察，但不能单凭一个较大的权重证明因果关系。

资料：网络学堂《大数据技术与应用》Transformer，38 页；正文对应 P3–P36，手算与梯度展开为补充。原始结构可参阅 Vaswani 等 [Attention Is All You Need](https://arxiv.org/abs/1706.03762)。


---

上一讲：[[大数据技术与应用-第5讲-RNN与LSTM及图神经网络-bd05|RNN与LSTM及图神经网络]]　·　下一讲：[[大数据技术与应用-第7讲-集成学习与随机森林-bd07|集成学习与随机森林]]
