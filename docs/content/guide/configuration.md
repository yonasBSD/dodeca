+++
title = "Configuration"
description = "Configuring dodeca"
weight = 30
+++

Configuration lives in `.config/dodeca.kdl` in your project root.

## Basic settings

```kdl
content "content"
output "public"
```

## Link checking

`ddc build` checks all internal and external links, failing the build if any are broken.

### Configuration options

```kdl
link_check rate_limit_ms=1500 {
    skip_domain "linkedin.com"
    skip_domain "twitter.com"
    skip_domain "x.com"
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rate_limit_ms` | integer | `1000` | Minimum delay between requests to the same domain (milliseconds) |
| `skip_domain` | string (multiple) | none | Domains to skip checking entirely |

### When to skip domains

Some sites aggressively block automated requests. Consider skipping:

- **Social media**: `linkedin.com`, `twitter.com`, `x.com`, `facebook.com`
- **Sites with CAPTCHAs**: Some documentation sites require JavaScript
- **Rate-limited APIs**: Sites that return 429 errors frequently

### Example with multiple skip domains

```kdl
link_check rate_limit_ms=2000 {
    skip_domain "linkedin.com"
    skip_domain "twitter.com"
    skip_domain "x.com"
    skip_domain "facebook.com"
    skip_domain "instagram.com"
}
```

Internal links (links to other pages in your site) are always checked and cannot be skipped.

## Code execution

If the code execution helper is available (`ddc-cell-code-execution`), Rust code blocks can be executed as part of the build.

At the moment, `.config/dodeca.kdl` contains a `code_execution { ... }` section, but it is not fully wired through to the build yet (defaults are used). If you need to disable code execution, use the environment variable `DODECA_NO_CODE_EXEC=1`.

## Stable assets

Some assets (like favicons) should keep stable URLs for caching:

```kdl
stable_assets {
    path "favicon.svg"
    path "robots.txt"
}
```

## Full example

```kdl
content "content"
output "public"

link_check rate_limit_ms=1000 {
    skip_domain "example.com"
}

stable_assets {
    path "favicon.svg"
}
```
