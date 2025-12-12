# 数学

このページでは、通常の文章の中で $a+b=c$、$e^{i\pi}+1=0$、$x^2+y^2=r^2$、$f(x)=\sin x$ のようなインライン数式を扱う例を示します。

文脈中のインライン数式: もし $x\in\mathbb{R}$ かつ $x\neq 0$ なら、$\frac{1}{x}$ は定義され、さらに $\left|x\right|\ge 0$ です。ベクトルも $\vec v=\langle v_1,v_2,v_3\rangle$ のように書けますし、ノルムも $\lVert v\rVert_2=\sqrt{v^\top v}$ のように書けます。

さらにインラインの例: $\alpha,\beta,\gamma$、$\nabla f$、$\partial_x u$、$\sum_{k=1}^n k=\frac{n(n+1)}{2}$、$\prod_{k=1}^n k=n!$、$\log(ab)=\log a+\log b$、$\lim_{x\to 0}\frac{\sin x}{x}=1$。

## リスト内のインライン数式

- 算術: $7\cdot 6=42$、$2^8=256$、$1+2+\cdots+n=\frac{n(n+1)}{2}$。
- 分数: $\frac{a}{b}$、$\dfrac{1}{1+x}$、$\tfrac{1}{2}$。
- 集合: $A\cap B$、$A\cup B$、$A\setminus B$、$x\in A$、$x\notin B$。
- 論理: $p\Rightarrow q$、$p\Leftrightarrow q$、$\forall x\,\exists y$、$\neg(p\land q)$。
- 確率: $P(A\mid B)=\frac{P(A\cap B)}{P(B)}$、$\mathbb{E}[X]$、$\mathrm{Var}(X)$。

## ブロック数式

二次方程式の解の公式:

$$
x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}
$$

行列とベクトル:

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

区分的な定義:

$$
f(x)=
\begin{cases}
x^2, & x\ge 0\\
-x, & x<0
\end{cases}
$$

積分と級数:

$$
\int_0^1 x^p(1-x)^q\,dx=\frac{\Gamma(p+1)\Gamma(q+1)}{\Gamma(p+q+2)},
\qquad
\sum_{n=0}^{\infty}\frac{x^n}{n!}=e^x
$$

微積分の恒等式:

$$
\nabla\cdot(\nabla f)=\Delta f
$$

## `math` フェンスコードブロック（リテラル内容）

```math
E = mc^2
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
\sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6}
```

```math
\text{Argmin example:}\quad
\hat\theta=\arg\min_{\theta\in\Theta}\sum_{i=1}^{N}\left(y_i - f_\theta(x_i)\right)^2
```

## インライン + ブロックの混在

$\theta$ や $\hat\theta$ をインラインで参照し、その後で正規方程式を示します:

$$
X^\top X\,\hat\beta = X^\top y
$$
