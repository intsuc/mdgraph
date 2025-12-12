# Type system

## What is a type system?

A **type system** is a set of rules that assigns *types* to expressions, variables, functions, and program constructs.
Its main goals are:

- Detecting errors (e.g., adding a number and a string).
- Documenting intent (e.g., “this function never returns null”).
- Enabling optimizations (e.g., avoiding runtime checks).

Formally, a type system defines a *typing judgment* like:

> Γ ⊢ e : T

Meaning: under assumptions Γ (the context), expression `e` has type `T`.

---

## Static vs dynamic typing

### Static typing

Types are checked **at compile time**.

- Examples: Haskell, Rust, Java, TypeScript (with compilation).
- Pros:
  - Many errors caught before running the program.
  - Better tooling (refactoring, autocompletion).
  - Often better performance.
- Cons:
  - More up-front annotations (unless inference is strong).
  - Some valid programs may be rejected.

### Dynamic typing

Types are checked **at runtime**.

- Examples: Python, JavaScript, Ruby.
- Pros:
  - Less ceremony and fewer annotations.
  - Flexible metaprogramming patterns.
- Cons:
  - Errors surface only when the code path executes.
  - Harder to optimize and refactor safely.

Many languages mix both (e.g., gradual typing in TypeScript, Python with type hints).

---

## Strong vs weak typing

The exact definitions vary, but informally:

- **Strong typing**: the language prevents operations that make no sense between types without explicit conversion.
  - Example: you cannot add a string and an integer without converting one.
- **Weak typing**: the language implicitly coerces values between types.
  - Example: `"1" + 2` becomes `"12"` or `3` depending on the language.

“Strong/weak” is less precise than “static/dynamic” and is often used informally.

---

## Type soundness and safety

A type system is **sound** if:

> “Well-typed programs do not go wrong.”

More formally:

- **Progress**: a well-typed program either is a value or can make a step of evaluation.
- **Preservation**: if a well-typed program takes a step, the result is also well-typed.

A sound type system guarantees that certain runtime errors (e.g., “call a non-function”) cannot happen in well-typed programs.

Some systems trade soundness for convenience, e.g., `any` in TypeScript, raw pointers in systems languages, or `unsafe` blocks.

---

## Nominal vs structural typing

### Nominal typing

Types are compatible if they have the **same name** or an explicit declaration of relationship.

- Examples: Java classes, Rust structs.
- Pros:
  - Clear, explicit APIs and boundaries.
- Cons:
  - More boilerplate to make similar types compatible.

### Structural typing

Types are compatible if their **shapes match**.

- Examples: TypeScript interfaces, Go interfaces (implicitly), many record calculi.
- Pros:
  - Very flexible; makes composition and refactoring easier.
- Cons:
  - Accidental compatibility (two types match “by accident”).
  - Error messages can be more complex.

---

## Subtyping and polymorphism

A type system often supports **subtyping**:

- If `S` is a subtype of `T` (`S <: T`), a value of type `S` can be used where `T` is expected.
- Example: `Circle <: Shape`.

Subtyping interacts with **polymorphism**:

- **Parametric polymorphism** (generics): functions or data structures abstract over types.
  - Example: `List<T>`, `fn id<T>(x: T) -> T`.
- **Ad-hoc polymorphism** (overloading, type classes): behavior varies by type.

Variance (covariant, contravariant, invariant) describes how type constructors behave under subtyping, e.g., whether `List<Circle>` can be used where `List<Shape>` is expected.

---

## Type inference

**Type inference** automatically deduces types, often from local usage.

- Lets users omit most annotations while staying statically typed.
- Example: Hindley–Milner inference in ML/Haskell, local inference in Rust.

Trade-offs:

- More powerful inference can make error messages harder to understand.
- Some systems restrict inference (e.g., no higher-rank inference) to remain decidable and fast.

---

## Summary

A type system:

- Assigns types to program constructs via formal rules.
- Can be static or dynamic, strong or weak, nominal or structural.
- May provide soundness guarantees about the absence of certain runtime errors.
- Often supports subtyping, polymorphism, and inference to make programs safer and more expressive.

Different languages make different design choices to balance safety, performance, expressiveness, and ergonomics.
