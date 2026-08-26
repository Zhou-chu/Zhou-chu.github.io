---
blog: true
title: "Chapter 1-Vector Spaces"
slug: "chapter-1-vector-spaces-msn1gxzx"
summary: "1.1 Definition 一个定义在实数 $\\mathbb{R}$ 上的向量空间 $\\mathbb{E}$（或称为“实向量空间”），是指由称为 向量 (vectors) 的元素组成的集合，且满足以下条件： (A) 对于 $\\mathbb{E}$ 中任意两个向量 $\\mathbf{x}, \\mathbf{y}$，都存在一个对应的向量 $\\mathbf{x} + \\mathbf{y}$，称为 $\\mathbf{x}$ 和 $\\mathb"
date: 2026-08-10
category: "人工智能的优化方法"
featured: false
---

## 1.1 Definition
一个定义在实数 $\mathbb{R}$ 上的向量空间 $\mathbb{E}$（或称为“实向量空间”），是指由称为**向量 (vectors)** 的元素组成的集合，且满足以下条件：
**(A)** 对于 $\mathbb{E}$ 中任意两个向量 $\mathbf{x}, \mathbf{y}$，都存在一个对应的向量 $\mathbf{x} + \mathbf{y}$，称为 $\mathbf{x}$ 和 $\mathbf{y}$ 的**和 (sum)**，并满足以下性质：
1. $\mathbf{x} + \mathbf{y} = \mathbf{y} + \mathbf{x}$，对任意 $\mathbf{x}, \mathbf{y} \in \mathbb{E}$ 成立。
2. $\mathbf{x} + (\mathbf{y} + \mathbf{z}) = (\mathbf{x} + \mathbf{y}) + \mathbf{z}$，对任意 $\mathbf{x}, \mathbf{y}, \mathbf{z} \in \mathbb{E}$ 成立。
3. 在 $\mathbb{E}$ 中存在唯一的向量 $\mathbf{0}$（称为**零向量 (zeros vector)**），使得对任意 $\mathbf{x}$ 有 $\mathbf{x} + \mathbf{0} = \mathbf{x}$。
4. 对任意 $\mathbf{x} \in \mathbb{E}$，在 $\mathbb{E}$ 中存在一个向量 $-\mathbf{x}$，使得 $\mathbf{x} + (-\mathbf{x}) = \mathbf{0}$。
**(B)** 对任意实数（也称为**标量 (scalar)**） $\alpha \in \mathbb{R}$ 和 $\mathbf{x} \in \mathbb{E}$，都存在一个对应的向量 $\alpha\mathbf{x}$，称为 $\alpha$ 和 $\mathbf{x}$ 的**数乘 (scalar multiplication)**，并满足以下性质：
5. $\alpha(\beta\mathbf{x}) = (\alpha\beta)\mathbf{x}$，对任意 $\alpha, \beta \in \mathbb{R}$ 和 $\mathbf{x} \in \mathbb{E}$ 成立。
6. $1\mathbf{x} = \mathbf{x}$，对任意 $\mathbf{x} \in \mathbb{E}$ 成立。
**(C)** 这两种运算（求和与数乘）满足以下性质：
7. $\alpha(\mathbf{x} + \mathbf{y}) = \alpha\mathbf{x} + \alpha\mathbf{y}$，对任意 $\alpha \in \mathbb{R}$ 和 $\mathbf{x}, \mathbf{y} \in \mathbb{E}$ 成立。
8. $(\alpha + \beta)\mathbf{x} = \alpha\mathbf{x} + \beta\mathbf{x}$，对任意 $\alpha, \beta \in \mathbb{R}$ 和 $\mathbf{x} \in \mathbb{E}$ 成立。
## 1.2 Dimension

向量空间 $\mathbb{E}$ 中的向量集合 $\{ \mathbf{v}_1, \mathbf{v}_2, \ldots, \mathbf{v}_n\}$ 被称为**线性无关 (linearly independent)** 或简称**无关 (independent)**，如果线性方程组

$$
\sum_{i=1}^{n} \alpha_i \mathbf{v}_i = \mathbf{0}
$$

意味着 $\alpha_1 = \alpha_2 = \cdots = \alpha_n = 0$。换言之，不存在等于零向量的非平凡线性组合。向量集合 $\{\mathbf{v}_1, \mathbf{v}_2, \ldots, \mathbf{v}_n\}$ 被称为**张成 (span)** 空间 $\mathbb{E}$，如果对任意 $\mathbf{x} \in \mathbb{E}$，都存在 $\beta_1, \beta_2, \ldots, \beta_n \in \mathbb{R}$ 使得

$$
\mathbf{x} = \sum_{i=1}^{n} \beta_i \mathbf{v}_i.
$$

向量空间 $\mathbb{E}$ 的**基 (basis)** 是一个线性无关且张成 $\mathbb{E}$ 的向量集合。众所周知，向量空间 $\mathbb{E}$ 的所有基中的向量数量是相同的；这个数字被称为该空间的**维数 (dimension)**，并记作 $\dim(\mathbb{E})$。在本书中，我们只讨论具有有限维数的向量空间，即**有限维向量空间 (finite-dimensional vector spaces)**。

## 1.3 Norms

向量空间 $\mathbb{E}$ 上的**范数 (norm)** 是一个函数 $\|\cdot\| : \mathbb{E} \to \mathbb{R}$，它满足以下性质：

1. **(非负性 nonnegativity)** 对任意 $\mathbf{x} \in \mathbb{E}$ 有 $\|\mathbf{x}\| \ge 0$，并且 $\|\mathbf{x}\| = 0$ 当且仅当 $\mathbf{x} = \mathbf{0}$。
2. **(正齐次性 positive homogeneity)** 对任意 $\mathbf{x} \in \mathbb{E}$ 和 $\lambda \in \mathbb{R}$ 有 $\|\lambda \mathbf{x}\| = |\lambda| \cdot \|\mathbf{x}\|$。
3. **(三角不等式 triangle inequality)** 对任意 $\mathbf{x}, \mathbf{y} \in \mathbb{E}$ 有 $\|\mathbf{x} + \mathbf{y}\| \le \|\mathbf{x}\| + \|\mathbf{y}\|$。

有时我们会将空间 $\mathbb{E}$ 的范数记为 $\|\cdot\|_\mathbb{E}$，以强调该空间的身份并与其他范数区分开来。以 $\mathbf{c} \in \mathbb{E}$ 为中心、半径 $r > 0$ 的**开球 (open ball)** 记作 $B(\mathbf{c}, r)$，定义为

$$
B(\mathbf{c}, r) = \{ \mathbf{x} \in \mathbb{E} : \|\mathbf{x} - \mathbf{c}\| < r \}.
$$

以 $\mathbf{c} \in \mathbb{E}$ 为中心、半径 $r > 0$ 的**闭球 (closed ball)** 记作 $B[\mathbf{c}, r]$，定义为

$$
B[\mathbf{c}, r] = \{ \mathbf{x} \in \mathbb{E} : \|\mathbf{x} - \mathbf{c}\| \le r \}.
$$

有时我们会使用符号 $B_{\|\cdot\|}[\mathbf{c}, r]$ 或 $B_{\|\cdot\|}(\mathbf{c}, r)$ 来标识所使用的特定范数。

## 1.4 Inner Products
An *inner product* of a real vector space $\mathbb{E}$ is a function that associates to each pair of vectors $\mathbf{x}, \mathbf{y}$ a real number, which is denoted by $\langle \mathbf{x}, \mathbf{y} \rangle$ and satisfies the following properties:
1. (**commutativity**) $\langle \mathbf{x}, \mathbf{y} \rangle = \langle \mathbf{y}, \mathbf{x} \rangle$ for any $\mathbf{x}, \mathbf{y} \in \mathbb{E}$.
2. (**linearity**) $\langle \alpha_1 \mathbf{x}_1 + \alpha_2 \mathbf{x}_2, \mathbf{y} \rangle = \alpha_1 \langle \mathbf{x}_1, \mathbf{y} \rangle + \alpha_2 \langle \mathbf{x}_2, \mathbf{y} \rangle$ for any $\alpha_1, \alpha_2 \in \mathbb{R}$ and $\mathbf{x}_1, \mathbf{x}_2, \mathbf{y} \in \mathbb{E}$.
3. (**positive definiteness**) $\langle \mathbf{x}, \mathbf{x} \rangle \ge 0$ for any $\mathbf{x} \in \mathbb{E}$ and $\langle \mathbf{x}, \mathbf{x} \rangle = 0$ if and only if $\mathbf{x} = \mathbf{0}$.
A vector space endowed with an inner product is also called an *inner product space*. At this point we would like to make the following important note:

> **Underlying Spaces:** In this book the underlying vector spaces, usually denoted by $\mathbb{V}$ or $\mathbb{E}$, are always finite dimensional real inner product spaces with endowed inner product $\langle \cdot, \cdot \rangle$ and endowed norm $\|\cdot\|$.

## 1.5 Affine Sets and Convex Sets

Given a real vector space $\mathbb{E}$, a set $S \subseteq \mathbb{E}$ is called **affine** if for any $\mathbf{x}, \mathbf{y} \in S$ and $\lambda \in \mathbb{R}$, the inclusion $\lambda \mathbf{x} + (1 - \lambda)\mathbf{y} \in S$ holds. For a set $S \subseteq \mathbb{E}$, the **affine hull** of $S$, denoted by $\text{aff}(S)$, is the intersection of all affine sets containing $S$. Clearly, $\text{aff}(S)$ is by itself an affine set, and it is the smallest affine set containing $S$ (w.r.t. inclusion). A **hyperplane** is a subset of $\mathbb{E}$ given by

$$
H_{\mathbf{a},b} = \{ \mathbf{x} \in \mathbb{E} : \langle \mathbf{a}, \mathbf{x} \rangle = b \},
$$

where $\mathbf{a} \in \mathbb{E}$ and $b \in \mathbb{R}$. It is an easy exercise to show that hyperplanes are affine sets.

A set $C \subseteq \mathbb{E}$ is called **convex** if for any $\mathbf{x}, \mathbf{y} \in C$ and $\lambda \in [0, 1]$ it holds that $\lambda \mathbf{x} + (1 - \lambda)\mathbf{y} \in C$. Evidently, affine sets are always convex. Open and closed balls are always convex regardless of the choice of norm. For given $\mathbf{x}, \mathbf{y} \in \mathbb{E}$, the **closed line segment** between $\mathbf{x}$ and $\mathbf{y}$ is a subset of $\mathbb{E}$ denoted by $[\mathbf{x}, \mathbf{y}]$ and defined as

$$
[\mathbf{x}, \mathbf{y}] = \{ \alpha \mathbf{x} + (1 - \alpha)\mathbf{y} : \alpha \in [0, 1] \}.
$$

The **open line segment** $(\mathbf{x}, \mathbf{y})$ is similarly defined as

$$
(\mathbf{x}, \mathbf{y}) = \{ \alpha \mathbf{x} + (1 - \alpha)\mathbf{y} : \alpha \in (0, 1) \}
$$

when $\mathbf{x} \neq \mathbf{y}$ and is the empty set $\emptyset$ when $\mathbf{x} = \mathbf{y}$. Closed and open line segments are convex sets. Another example of convex sets are **half-spaces**, which are sets of the form

$$
H_{\mathbf{a},b}^- = \{ \mathbf{x} \in \mathbb{E} : \langle \mathbf{a}, \mathbf{x} \rangle \le b \},
$$

where $\mathbf{a} \in \mathbb{E}$ and $b \in \mathbb{R}$.

## 1.6 Euclidean Spaces
**Definition**: A finite dimensional real vector space equipped with an inner product $\langle \cdot, \cdot \rangle$ is called a *Euclidean space* if it is endowed with the norm $\|\mathbf{x}\| = \sqrt{\langle \mathbf{x}, \mathbf{x} \rangle}$, which is referred to as the *Euclidean norm*.

## 1.7 The Space $\mathbb{R}^n$

The vector space $\mathbb{R}^n$ ($n$ being a positive integer) is the set of $n$-dimensional column vectors with real components endowed with the component-wise addition operator,

$$
\begin{pmatrix} x_1 \\ x_2 \\ \vdots \\ x_n \end{pmatrix} + \begin{pmatrix} y_1 \\ y_2 \\ \vdots \\ y_n \end{pmatrix} = \begin{pmatrix} x_1 + y_1 \\ x_2 + y_2 \\ \vdots \\ x_n + y_n \end{pmatrix},
$$

and the scalar-vector product,

$$
\lambda \begin{pmatrix} x_1 \\ x_2 \\ \vdots \\ x_n \end{pmatrix} = \begin{pmatrix} \lambda x_1 \\ \lambda x_2 \\ \vdots \\ \lambda x_n \end{pmatrix},
$$

where in the above $x_1, x_2, \dots, x_n, \lambda$ are real numbers. We will denote the standard basis of $\mathbb{R}^n$ by $\mathbf{e}_1, \mathbf{e}_2, \dots, \mathbf{e}_n$, where $\mathbf{e}_i$ is the $n$-length column vector whose $i$th component is one while all the others are zeros. The column vectors of all ones and all zeros will be denoted by $\mathbf{e}$ and $\mathbf{0}$, respectively, where the length of the vectors will be clear from the context.

By far the most used inner product in $\mathbb{R}^n$ is the *dot product* defined by

$$
\langle \mathbf{x}, \mathbf{y} \rangle = \sum_{i=1}^{n} x_i y_i.
$$

> **Inner Product in $\mathbb{R}^n$**: In this book, unless otherwise stated, the endowed inner product in $\mathbb{R}^n$ is the dot product.

Of course, the dot product is not the only possible inner product that can be defined over $\mathbb{R}^n$. Another useful option is the $\mathbf{Q}$-inner product, which is defined as

$$
\langle \mathbf{x}, \mathbf{y} \rangle_{\mathbf{Q}} = \mathbf{x}^T \mathbf{Q} \mathbf{y},
$$

where $\mathbf{Q}$ is a positive definite $n \times n$ matrix. Obviously, the $\mathbf{Q}$-inner product amounts to the dot product when $\mathbf{Q} = \mathbf{I}$. If $\mathbb{R}^n$ is endowed with the dot product, then the associated Euclidean norm is the $l_2$-norm

$$
\|\mathbf{x}\|_2 = \sqrt{\langle \mathbf{x}, \mathbf{x} \rangle} = \sqrt{\sum_{i=1}^{n} x_i^2}.
$$

If $\mathbb{R}^n$ is endowed with the $\mathbf{Q}$-inner product, then the associated Euclidean norm is the $\mathbf{Q}$-norm

$$
\|\mathbf{x}\|_{\mathbf{Q}} = \sqrt{\mathbf{x}^T \mathbf{Q} \mathbf{x}}.
$$
For a given $p \ge 1$, the $l_p$-norm on $\mathbb{R}^n$ is given by the formula

$$
\|\mathbf{x}\|_p = \sqrt[p]{\sum_{i=1}^{n} |x_i|^p}.
$$

The $l_\infty$-norm on $\mathbb{R}^n$ is defined by

$$
\|\mathbf{x}\|_\infty = \max_{i=1,2,\dots,n} |x_i|.
$$


### 1.7.1 Subsets of $\mathbb{R}^n$

The *nonnegative orthant* is the subset of $\mathbb{R}^n$ consisting of all vectors in $\mathbb{R}^n$ with nonnegative components and is denoted by $\mathbb{R}_+^n$:

$$
\mathbb{R}_+^n = \left\{ (x_1, x_2, \dots, x_n)^T : x_1, x_2, \dots, x_n \ge 0 \right\}.
$$

Similarly, the *positive orthant* consists of all the vectors in $\mathbb{R}^n$ with positive components and is denoted by $\mathbb{R}_{++}^n$:

$$
\mathbb{R}_{++}^n = \left\{ (x_1, x_2, \dots, x_n)^T : x_1, x_2, \dots, x_n > 0 \right\}.
$$

The *unit simplex*, denoted by $\Delta_n$, is the subset of $\mathbb{R}^n$ comprising all nonnegative vectors whose components sum up to one:

$$
\Delta_n = \left\{ \mathbf{x} \in \mathbb{R}^n : \mathbf{x} \ge \mathbf{0}, \mathbf{e}^T \mathbf{x} = 1 \right\}.
$$

Given two vectors $\boldsymbol{\ell}, \mathbf{u} \in \mathbb{R}^n$ that satisfy $\boldsymbol{\ell} \le \mathbf{u}$, the *box* with lower bounds $\boldsymbol{\ell}$ and upper bounds $\mathbf{u}$ is denoted by $\text{Box}[\boldsymbol{\ell}, \mathbf{u}]$ and defined as

$$
\text{Box}[\boldsymbol{\ell}, \mathbf{u}] = \left\{ \mathbf{x} \in \mathbb{R}^n : \boldsymbol{\ell} \le \mathbf{x} \le \mathbf{u} \right\}.
$$

Thus, for example, $\text{Box}[-\mathbf{e}, \mathbf{e}] = [-1, 1]^n$.


### 1.7.2 Operations on Vectors in $\mathbb{R}^n$

There are several operations on vectors in $\mathbb{R}^n$ that will be frequently used in the book. For a given vector $\mathbf{x} \in \mathbb{R}^n$, the vector $[\mathbf{x}]_+$ is the *nonnegative part* of $\mathbf{x}$ defined by $[\mathbf{x}]_+ = (\max\{x_i, 0\})_{i=1}^n$. For a given $\mathbf{x} \in \mathbb{R}^n$, the vector $|\mathbf{x}|$ is the vector of component-wise absolute values $(|x_i|)_{i=1}^n$, and the vector $\text{sgn}(\mathbf{x})$ is defined as

$$
\text{sgn}(\mathbf{x})_i = \begin{cases}
    1, & x_i \ge 0, \\
    -1, & x_i < 0.
\end{cases}
$$

For two vectors $\mathbf{a}, \mathbf{b} \in \mathbb{R}^n$, their *Hadamard product*, denoted by $\mathbf{a} \odot \mathbf{b}$, is the vector comprising the component-wise products: $\mathbf{a} \odot \mathbf{b} = (a_i b_i)_{i=1}^n$.
## 1.8 The Space $\mathbb{R}^{m \times n}$

The set of all real-valued $m \times n$ matrices is denoted by $\mathbb{R}^{m \times n}$. This is a vector space with the component-wise addition as the summation operation and the component-wise scalar multiplication as the "scalar-vector multiplication" operation. The *dot product* in $\mathbb{R}^{m \times n}$ is defined by

$$
\langle \mathbf{A}, \mathbf{B} \rangle = \text{Tr}(\mathbf{A}^T\mathbf{B}) = \sum_{i=1}^{m} \sum_{j=1}^{n} A_{ij}B_{ij}, \quad \mathbf{A}, \mathbf{B} \in \mathbb{R}^{m \times n}.
$$

The space $\mathbb{R}^{m \times n}$ is sometimes associated with the space $\mathbb{R}^{mn}$ in the sense that each matrix in $\mathbb{R}^{m \times n}$ corresponds to the $mn$-length vector constructed by stacking the columns of the matrix. Unless otherwise stated, we will assume that the inner product in $\mathbb{R}^{m \times n}$ is the dot product.

> **Inner Product in $\mathbb{R}^{m \times n}$:** In this book, unless otherwise stated, the endowed inner product in $\mathbb{R}^{m \times n}$ is the dot product.


### 1.8.1 Subsets of $\mathbb{R}^{n \times n}$
The set of all $n \times n$ symmetric matrices is denoted by $\mathbb{S}^n$:

$$
\mathbb{S}^n = \{ \mathbf{A} \in \mathbb{R}^{n \times n} : \mathbf{A} = \mathbf{A}^T \}.
$$

Note that $\mathbb{S}^n$ is also a vector space with the same summation and scalar multiplication operations as in $\mathbb{R}^{n \times n}$. The inner product in $\mathbb{S}^n$, unless otherwise stated, is the dot product.
The set of all $n \times n$ positive semidefinite matrices is denoted by $\mathbb{S}^n_+$:

$$
\mathbb{S}^n_+ = \{ \mathbf{A} \in \mathbb{R}^{n \times n} : \mathbf{A} \succeq \mathbf{0} \}.
$$

The set of all $n \times n$ positive definite matrices is denoted by $\mathbb{S}^n_{++}$:

$$
\mathbb{S}^n_{++} = \{ \mathbf{A} \in \mathbb{R}^{n \times n} : \mathbf{A} \succ \mathbf{0} \}.
$$

Obviously, the inclusion $\mathbb{S}^n_{++} \subseteq \mathbb{S}^n_+ \subseteq \mathbb{S}^n$ holds. Similarly, $\mathbb{S}^n_-$ is the set of all $n \times n$ negative semidefinite matrices, and $\mathbb{S}^n_{--}$ is the set of all $n \times n$ negative definite matrices:
$$
\mathbb{S}^n_- = \{ \mathbf{A} \in \mathbb{R}^{n \times n} : \mathbf{A} \preceq \mathbf{0} \},
$$
$$
\mathbb{S}^n_{--} = \{ \mathbf{A} \in \mathbb{R}^{n \times n} : \mathbf{A} \prec \mathbf{0} \}.
$$
The set of all $n \times n$ orthogonal matrices is denoted by $\mathbb{O}^n$:
$$
\mathbb{O}^n = \{ \mathbf{A} \in \mathbb{R}^{n \times n} : \mathbf{A}\mathbf{A}^T = \mathbf{A}^T\mathbf{A} = \mathbf{I} \}.
$$


### 1.8.2 Norms in $\mathbb{R}^{m \times n}$

If $\mathbb{R}^{m \times n}$ is endowed with the dot product, then the corresponding Euclidean norm is the *Frobenius norm* defined by

$$
\|\mathbf{A}\|_F = \sqrt{\text{Tr}(\mathbf{A}^T\mathbf{A})} = \sqrt{\sum_{i=1}^{m} \sum_{j=1}^{n} A_{ij}^2}, \quad \mathbf{A} \in \mathbb{R}^{m \times n}.
$$
Many examples of matrix norms are generated by using the concept of induced norms, which we now describe. Given a matrix $\mathbf{A} \in \mathbb{R}^{m \times n}$ and two norms $\|\cdot\|_a$ on $\mathbb{R}^n$ and $\|\cdot\|_b$ on $\mathbb{R}^m$, respectively, the *induced matrix norm* $\|\mathbf{A}\|_{a,b}$ is defined by

$$
\|\mathbf{A}\|_{a,b} = \max_{\mathbf{x}} \{ \|\mathbf{Ax}\|_b : \|\mathbf{x}\|_a \le 1 \}.
$$

It can be easily shown that the above definition implies that for any $\mathbf{x} \in \mathbb{R}^n$, the inequality

$$
\|\mathbf{Ax}\|_b \le \|\mathbf{A}\|_{a,b}\|\mathbf{x}\|_a
$$

holds. We refer to the matrix norm $\|\cdot\|_{a,b}$ as the $(a,b)$-norm. When $a = b$, we will simply refer to it as an $a$-norm and omit one of the subscripts in its notation, that is, use the notation $\|\cdot\|_a$ instead of $\|\cdot\|_{a,a}$.
#### Example 1.1 (spectral norm)

If $\|\cdot\|_a = \|\cdot\|_b = \|\cdot\|_2$, then the induced norm of a matrix $\mathbf{A} \in \mathbb{R}^{m \times n}$ is the maximum singular value of $\mathbf{A}$:

$$
\|\mathbf{A}\|_2 = \|\mathbf{A}\|_{2,2} = \sqrt{\lambda_{\max}(\mathbf{A}^T\mathbf{A})} \equiv \sigma_{\max}(\mathbf{A}).
$$
#### Example 1.2 (1-norm)

When $\|\cdot\|_a = \|\cdot\|_b = \|\cdot\|_1$, the induced matrix norm of a matrix $\mathbf{A} \in \mathbb{R}^{m \times n}$ is given by
$$
\|\mathbf{A}\|_1 = \max_{j=1,2,\dots,n} \sum_{i=1}^{m} |A_{i,j}|.
$$
This norm is also called the *maximum absolute column sum norm*. 
#### Example 1.3 ($\infty$-norm)
When $\|\cdot\|_a = \|\cdot\|_b = \|\cdot\|_{\infty}$, the induced matrix norm of a matrix $\mathbf{A} \in \mathbb{R}^{m \times n}$ is given by

$$
\|\mathbf{A}\|_{\infty} = \max_{i=1,2,\dots,m} \sum_{j=1}^{n} |A_{i,j}|.
$$

This norm is also called the *maximum absolute row sum norm*. 

## 1.9 Cartesian Product of Vector Spaces

Given $m$ vector spaces $\mathbb{E}_1, \mathbb{E}_2, \dots, \mathbb{E}_m$ equipped with inner products $\langle \cdot, \cdot \rangle_{\mathbb{E}_i}$, their Cartesian product $\mathbb{E}_1 \times \mathbb{E}_2 \times \dots \times \mathbb{E}_m$ is the vector space of all $m$-tuples $(\mathbf{v}_1, \mathbf{v}_2, \dots, \mathbf{v}_m)$ equipped with the component-wise addition between vectors:

$$
(\mathbf{v}_1, \mathbf{v}_2, \dots, \mathbf{v}_m) + (\mathbf{w}_1, \mathbf{w}_2, \dots, \mathbf{w}_m) = (\mathbf{v}_1 + \mathbf{w}_1, \mathbf{v}_2 + \mathbf{w}_2, \dots, \mathbf{v}_m + \mathbf{w}_m)
$$

and the scalar-vector multiplication operation given by

$$
\alpha(\mathbf{v}_1, \mathbf{v}_2, \dots, \mathbf{v}_m) = (\alpha\mathbf{v}_1, \alpha\mathbf{v}_2, \dots, \alpha\mathbf{v}_m).
$$

The inner product in the Cartesian product space is defined as

$$
\langle (\mathbf{v}_1, \mathbf{v}_2, \dots, \mathbf{v}_m), (\mathbf{w}_1, \mathbf{w}_2, \dots, \mathbf{w}_m) \rangle_{\mathbb{E}_1 \times \mathbb{E}_2 \times \dots \times \mathbb{E}_m} = \sum_{i=1}^{m} \langle \mathbf{v}_i, \mathbf{w}_i \rangle_{\mathbb{E}_i} \tag{1.1}
$$
The space $\mathbb{R} \times \mathbb{R}$, for example, consists of all two-dimensional row vectors, so in that respect it is different than $\mathbb{R}^2$, which comprises all two-dimensional *column* vectors. However, with only a slight abuse of notation, we will occasionally refer to $\mathbb{R} \times \mathbb{R}$ as $\mathbb{R}^2$.

Suppose that $\mathbb{E}_1, \mathbb{E}_2, \dots, \mathbb{E}_m$ are vector spaces with endowed norms $\|\cdot\|_{\mathbb{E}_1}, \|\cdot\|_{\mathbb{E}_2}, \dots, \|\cdot\|_{\mathbb{E}_m}$, respectively. There are many ways to define a norm on the Cartesian product space $\mathbb{E}_1 \times \mathbb{E}_2 \times \dots \times \mathbb{E}_m$. For example, for any $p \ge 1$, we can define the composite $l_p$-norm as

$$
\| (\mathbf{u}_1, \mathbf{u}_2, \dots, \mathbf{u}_m) \| = \sqrt[p]{\sum_{i=1}^{m} \| \mathbf{u}_i \|_{\mathbb{E}_i}^p}.
$$

Another norm is a composite weighted $l_2$-norm:

$$
\| (\mathbf{u}_1, \mathbf{u}_2, \dots, \mathbf{u}_m) \| = \sqrt{\sum_{i=1}^{m} \omega_i \| \mathbf{u}_i \|_{\mathbb{E}_i}^2},
$$

where $\omega_1, \omega_2, \dots, \omega_m$ are given positive real numbers.

We will use the convention that if $\mathbb{E}_1, \mathbb{E}_2, \dots, \mathbb{E}_m$ are Euclidean spaces, then $\mathbb{E}_1 \times \mathbb{E}_2 \times \dots \times \mathbb{E}_m$ is also a Euclidean space, and consequently, by the definition (1.1) of the inner product in product spaces,

$$
\| (\mathbf{u}_1, \mathbf{u}_2, \dots, \mathbf{u}_m) \|_{\mathbb{E}_1 \times \mathbb{E}_2 \times \dots \times \mathbb{E}_m} = \sqrt{\sum_{i=1}^{m} \| \mathbf{u}_i \|_{\mathbb{E}_i}^2}.
$$
## 1.10 Linear Transformations
Given two vector spaces $\mathbb{E}$ and $\mathbb{V}$, a function $\mathcal{A} : \mathbb{E} \to \mathbb{V}$ is called a *linear transformation* if the following property holds for any $\mathbf{x}, \mathbf{y} \in \mathbb{E}$ and $\alpha, \beta \in \mathbb{R}$:
$$
\mathcal{A}(\alpha\mathbf{x} + \beta\mathbf{y}) = \alpha\mathcal{A}(\mathbf{x}) + \beta\mathcal{A}(\mathbf{y}).
$$
All linear transformations from $\mathbb{R}^n$ to $\mathbb{R}^m$ have the form
$$
\mathcal{A}(\mathbf{x}) = \mathbf{A}\mathbf{x}
$$
for some matrix $\mathbf{A} \in \mathbb{R}^{m \times n}$. All linear transformations from $\mathbb{R}^{m \times n}$ to $\mathbb{R}^k$ have the form
$$
\mathcal{A}(\mathbf{X}) = \begin{pmatrix} \operatorname{Tr}(\mathbf{A}_1^T\mathbf{X}) \\ \operatorname{Tr}(\mathbf{A}_2^T\mathbf{X}) \\ \vdots \\ \operatorname{Tr}(\mathbf{A}_k^T\mathbf{X}) \end{pmatrix}
$$
for some $\mathbf{A}_1, \mathbf{A}_2, \dots, \mathbf{A}_k \in \mathbb{R}^{m \times n}$. The *identity transformation*, denoted by $\mathcal{I}$, is defined by the relation $\mathcal{I}(\mathbf{x}) = \mathbf{x}$ for all $\mathbf{x} \in \mathbb{E}$.
## 1.11 The Dual Space
A *linear functional* on a vector space $\mathbb{E}$ is a linear transformation from $\mathbb{E}$ to $\mathbb{R}$. Given a vector space $\mathbb{E}$, the set of all linear functionals on $\mathbb{E}$ is called the *dual space* and is denoted by $\mathbb{E}^*$. For inner product spaces, it is known that given a linear functional $f \in \mathbb{E}^*$, there always exists $\mathbf{v} \in \mathbb{E}$ such that

$$
f(\mathbf{x}) = \langle \mathbf{v}, \mathbf{x} \rangle. \tag{1.2}
$$

For the sake of simplicity of notation, we will represent the linear functional $f$ given in (1.2) by the vector $\mathbf{v}$. This correspondence between linear functionals and elements in $\mathbb{E}$ leads us to consider the elements in $\mathbb{E}^*$ as exactly the same as those in $\mathbb{E}$. The inner product in $\mathbb{E}^*$ is the same as the inner product in $\mathbb{E}$. Essentially, the only difference between $\mathbb{E}$ and $\mathbb{E}^*$ will be in the choice of norms of each of the spaces. Suppose that $\mathbb{E}$ is endowed with a norm $\|\cdot\|$. Then the norm of the dual space, called the *dual norm*, is given by

$$
\|\mathbf{y}\|_* = \max_{\mathbf{x}} \{ \langle \mathbf{y}, \mathbf{x} \rangle : \|\mathbf{x}\| \le 1 \}, \quad \mathbf{y} \in \mathbb{E}^*. \tag{1.3}
$$

It is not difficult to show that the dual norm is indeed a norm. A useful property is that the maximum in (1.3) can be taken over the unit sphere rather than over the unit ball, meaning that the following formula is valid:

$$
\|\mathbf{y}\|_* = \max_{\mathbf{x}} \{ \langle \mathbf{y}, \mathbf{x} \rangle : \|\mathbf{x}\| = 1 \}, \quad \mathbf{y} \in \mathbb{E}^*.
$$

The definition of the dual norm readily implies the following generalized version of the Cauchy-Schwarz inequality.

**Lemma 1.4 (generalized Cauchy-Schwarz inequality).** *Let $\mathbb{E}$ be an inner product vector space endowed with a norm $\|\cdot\|$. Then*

$$

|\langle \mathbf{y}, \mathbf{x} \rangle| \le \|\mathbf{y}\|_* \|\mathbf{x}\| \text{ for any } \mathbf{y} \in \mathbb{E}^*, \mathbf{x} \in \mathbb{E}. \tag{1.4}

$$

***Proof.*** If $\mathbf{x} = \mathbf{0}$, the inequality is trivially satisfied. Otherwise, take $\tilde{\mathbf{x}} = \frac{\mathbf{x}}{\|\mathbf{x}\|}$. Obviously, $\|\tilde{\mathbf{x}}\| = 1$, and hence, by the definition of the dual norm, we have

$$
\|\mathbf{y}\|_* \ge \langle \mathbf{y}, \tilde{\mathbf{x}} \rangle = \frac{1}{\|\mathbf{x}\|} \langle \mathbf{y}, \mathbf{x} \rangle,
$$

showing that $\langle \mathbf{y}, \mathbf{x} \rangle \le \|\mathbf{y}\|_* \|\mathbf{x}\|$. Plugging $-\mathbf{x}$ instead of $\mathbf{x}$ in the latter inequality, we obtain that $\langle \mathbf{y}, \mathbf{x} \rangle \ge -\|\mathbf{y}\|_* \|\mathbf{x}\|$, thus showing the validity of inequality (1.4). ■

Another important result is that Euclidean norms are self-dual, meaning that $\|\cdot\| = \|\cdot\|_*$. Here of course we use our convention that the elements in the dual space $\mathbb{E}^*$ are the same as the elements in $\mathbb{E}$. We can thus write, in only a slight abuse of notation, [^1] that for any Euclidean space $\mathbb{E}$, $\mathbb{E} = \mathbb{E}^*$.

[^1]: Disregarding the fact that the members of $\mathbb{E}^*$ are actually linear functionals on $\mathbb{E}$.

## 1.12 The Bidual Space

Given a vector space $\mathbb{E}$, the dual space $\mathbb{E}^*$ is also a vector space, and we can also consider its dual space, namely, $\mathbb{E}^{**}$. This is the so-called *bidual* space. **In the setting of finite dimensional spaces, the bidual space is the same as the original space** (under our convention that the elements in the dual space are the same as the elements in the original space), and the corresponding norm (bidual norm) is the same as the original norm.

## 1.13 Adjoint Transformations

Given two inner product vector spaces $\mathbb{E}, \mathbb{V}$ and a linear transformation $\mathcal{A}$ from $\mathbb{V}$ to $\mathbb{E}$, the *adjoint transformation*, denoted by $\mathcal{A}^T$, is a transformation from $\mathbb{E}^*$ to $\mathbb{V}^*$ defined by the relation

$$
\langle \mathbf{y}, \mathcal{A}(\mathbf{x}) \rangle = \langle \mathcal{A}^T(\mathbf{y}), \mathbf{x} \rangle
$$

for any $\mathbf{x} \in \mathbb{V}, \mathbf{y} \in \mathbb{E}^*$. When $\mathbb{V} = \mathbb{R}^n, \mathbb{E} = \mathbb{R}^m$ (endowed with the dot product), and $\mathcal{A}(\mathbf{x}) = \mathbf{A}\mathbf{x}$ for some matrix $\mathbf{A} \in \mathbb{R}^{m \times n}$, then the adjoint transformation is given by $\mathcal{A}^T(\mathbf{x}) = \mathbf{A}^T\mathbf{x}$.

**Example 1.8 (adjoint of a transformation from $\mathbb{R}^{m \times n}$ to $\mathbb{R}^k$).** Consider now a linear transformation from the space $\mathbb{R}^{m \times n}$ to $\mathbb{R}^k$. As was already mentioned in Section 1.10, such a transformation has the form

$$
\mathcal{A}(\mathbf{X}) =
\begin{pmatrix}
\mathrm{Tr}(\mathbf{A}_1^T \mathbf{X}) \\
\mathrm{Tr}(\mathbf{A}_2^T \mathbf{X}) \\
\vdots \\
\mathrm{Tr}(\mathbf{A}_k^T \mathbf{X})
\end{pmatrix},
$$

where $\mathbf{A}_i \in \mathbb{R}^{m \times n}$ are given matrices. The adjoint transformation $\mathcal{A}^T$ will be a transformation from $\mathbb{R}^k$ to $\mathbb{R}^{m \times n}$. To find it, let us write the defining relation of the adjoint operator:

$$
\langle \mathbf{y}, \mathcal{A}(\mathbf{X}) \rangle = \langle \mathcal{A}^T(\mathbf{y}), \mathbf{X} \rangle \text{ for all } \mathbf{X} \in \mathbb{R}^{m \times n}, \mathbf{y} \in \mathbb{R}^k,
$$

which is the same as (recall that unless otherwise stated, the inner products in $\mathbb{R}^{m \times n}$ and $\mathbb{R}^k$ are the dot products)

$$
\sum_{i=1}^k y_i \mathrm{Tr}(\mathbf{A}_i^T \mathbf{X}) = \langle \mathcal{A}^T(\mathbf{y}), \mathbf{X} \rangle \text{ for all } \mathbf{X} \in \mathbb{R}^{m \times n}, \mathbf{y} \in \mathbb{R}^k,
$$

that is,

$$
\mathrm{Tr}\left( \left[ \sum_{i=1}^k y_i \mathbf{A}_i \right]^T \mathbf{X} \right) = \langle \mathcal{A}^T(\mathbf{y}), \mathbf{X} \rangle \text{ for all } \mathbf{X} \in \mathbb{R}^{m \times n}, \mathbf{y} \in \mathbb{R}^k.
$$

Obviously, the above relation implies that the adjoint transformation is given by


$$
\mathcal{A}^T(\mathbf{y}) = \sum_{i=1}^k y_i \mathbf{A}_i. \quad \blacksquare
$$


The adjoint of the adjoint transformation is the original transformation: $(\mathcal{A}^T)^T = \mathcal{A}$. It also holds that whenever $\mathcal{A}$ is an invertible transformation,

$$
(\mathcal{A}^T)^{-1} = (\mathcal{A}^{-1})^T.
$$
## 1.14 Norms of Linear Transformations

Let $\mathcal{A} : \mathbb{E} \to \mathbb{V}$ be a linear transformation from a vector space $\mathbb{E}$ to a vector space $\mathbb{V}$. Assume that $\mathbb{E}$ and $\mathbb{V}$ are endowed with the norms $\|\cdot\|_{\mathbb{E}}$ and $\|\cdot\|_{\mathbb{V}}$, respectively. The norm of the linear transformation is defined by

$$
\|\mathcal{A}\| \equiv \max\{ \|\mathcal{A}(\mathbf{x})\|_{\mathbb{V}} : \|\mathbf{x}\|_{\mathbb{E}} \le 1 \}.
$$

It is not difficult to show that $\|\mathcal{A}\| = \|\mathcal{A}^T\|$. There is a close connection between the notion of induced norms discussed in Section 1.8.2 and norms of linear transformations. Specifically, suppose that $\mathcal{A}$ is a linear transformation from $\mathbb{R}^n$ to $\mathbb{R}^m$ given by

$$
\mathcal{A}(\mathbf{x}) = \mathbf{Ax} \quad (1.5)
$$

where $\mathbf{A} \in \mathbb{R}^{m \times n}$, and assume that $\mathbb{R}^n$ and $\mathbb{R}^m$ are endowed with the norms $\|\cdot\|_a$ and $\|\cdot\|_b$, respectively. Then $\|\mathcal{A}\| = \|\mathbf{A}\|_{a,b}$, meaning that the induced norm of a matrix is actually the norm of the corresponding linear transformation given by the relation (1.5).
