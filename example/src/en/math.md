# Math

This page demonstrates inline math like $a+b=c$, $e^{i\pi}+1=0$, $x^2+y^2=r^2$, and $f(x)=\sin x$ inside normal sentences.

Inline math in context: if $x\in\mathbb{R}$ and $x\neq 0$, then $\frac{1}{x}$ is defined, and $\left|x\right|\ge 0$. You can also write vectors $\vec v=\langle v_1,v_2,v_3\rangle$ and norms $\lVert v\rVert_2=\sqrt{v^\top v}$.

More inline examples: $\alpha,\beta,\gamma$, $\nabla f$, $\partial_x u$, $\sum_{k=1}^n k=\frac{n(n+1)}{2}$, $\prod_{k=1}^n k=n!$, $\log(ab)=\log a+\log b$, and $\lim_{x\to 0}\frac{\sin x}{x}=1$.

## Inline math in lists

- Arithmetic: $7\cdot 6=42$, $2^8=256$, $1+2+\cdots+n=\frac{n(n+1)}{2}$.
- Fractions: $\frac{a}{b}$, $\dfrac{1}{1+x}$, $\tfrac{1}{2}$.
- Sets: $A\cap B$, $A\cup B$, $A\setminus B$, $x\in A$, $x\notin B$.
- Logic: $p\Rightarrow q$, $p\Leftrightarrow q$, $\forall x\,\exists y$, $\neg(p\land q)$.
- Probability: $P(A\mid B)=\frac{P(A\cap B)}{P(B)}$, $\mathbb{E}[X]$, $\mathrm{Var}(X)$.

## Block math

Quadratic formula:

$$
x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}
$$

A matrix and a vector:

$$
A=
\begin{bmatrix}
1 & 2 & 3\\
0 & 1 & 4\\
0 & 0 & 1
\end{bmatrix},
\quad
\mathbf{x}=
\begin{bmatrix}
x_1\\
x_2\\
x_3
\end{bmatrix},
\quad
A\mathbf{x}=\mathbf{b}
$$

A piecewise definition:

$$
f(x)=
\begin{cases}
x^2, & x\ge 0\\
-x, & x<0
\end{cases}
$$

An integral and a series:

$$
\int_0^1 x^p(1-x)^q\,dx=\frac{\Gamma(p+1)\Gamma(q+1)}{\Gamma(p+q+2)},
\qquad
\sum_{n=0}^{\infty}\frac{x^n}{n!}=e^x
$$

A calculus identity:

$$
\nabla\cdot(\nabla f)=\Delta f
$$

## `math` fenced code blocks (literal content)

```math
E = mc^2
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
\sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6}
```

```math
\text{Argmin example:}\quad
\hat\theta=\arg\min_{\theta\in\Theta}\sum_{i=1}^{N}\left(y_i - f_\theta(x_i)\right)^2
```

## Mixed inline + block

We can refer to $\theta$ and $\hat\theta$ inline, then show the normal equations:

$$
X^\top X\,\hat\beta = X^\top y
$$
