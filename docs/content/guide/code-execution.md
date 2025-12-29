+++
title = "Code Execution"
description = "Automatic code sample validation"
weight = 45
+++

dodeca can run code samples found in your Markdown files and report failures.

This feature requires the code execution helper binary (`ddc-cell-code-execution`). If it isn't present, code blocks will not be executed.

## How it works

Code execution is **opt-in**. Add `,test` to your fenced code block to have it executed:

````markdown
```rust,test
let name = "Alice";
println!("Hello, {}!", name);
```
````

dodeca will extract the code during your build and run it using `cargo`.

Behavior by command:
- `ddc build`: execution failures fail the build.
- `ddc serve`: execution failures are reported as warnings.

## What gets executed

Only fenced blocks marked with `rust,test` (or `rs,test`) are executed. Plain `rust` blocks are syntax-highlighted but not run.

### Simple examples

```rust,test
let x = 5 + 3;
println!("Result: {}", x);
```

This gets wrapped in a `main()` function automatically.

### Complete programs

```rust,test
fn greet(name: &str) {
    println!("Hello, {}!", name);
}

fn main() {
    greet("World");
}
```

This runs as-is.

## Display-only code

Plain `rust` blocks are not executed - use them for pseudo-code, incomplete examples, or code you don't want validated:

````markdown
```rust
// This won't be executed - just displayed
let broken_code = does_not_compile();
```
````

You can also disable code execution globally by setting `DODECA_NO_CODE_EXEC=1` in the environment.

## When builds fail

If your code doesn't work, the build stops:

```
✗ Code execution failed in content/tutorial.md:42 (rust): Process exited with code: Some(1)
  stderr: error[E0425]: cannot find value `typo_variable`
```

Fix the code and rebuild. In development mode (`ddc serve`), failures are reported as warnings instead of hard failures.

## Configuration

There is a `code_execution { ... }` section in the config schema, but it is not fully applied by the build yet (defaults are used). If you need to control execution today, use:

- `DODECA_NO_CODE_EXEC=1` to disable globally
- Use plain `rust` (without `,test`) for blocks you don't want executed

## Best practices

**Keep examples focused:**
- Show one concept per code block
- Avoid complex setup code
- Use minimal but realistic examples

**Test your docs:**
- Run `ddc build` before publishing
- Update examples when APIs change

**For complex examples:**
- Break into smaller pieces
- Link to a full example project instead of embedding a large program in a single page

That's it! Your documentation examples now stay working automatically.
