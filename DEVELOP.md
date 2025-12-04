# Development Guide

## Building

```sh
# Build everything (WASM + plugins + dodeca)
cargo xtask build

# Build in release mode
cargo xtask build --release

# Run ddc after building
cargo xtask run -- serve

# Install to ~/.cargo/bin
cargo xtask install
```

## CI Workflow Generation

The release workflow and installer script are generated from Rust code, not hand-written YAML.

```sh
# Regenerate .github/workflows/release.yml and install.sh
cargo xtask ci

# Check if generated files are up to date (used in CI)
cargo xtask ci --check
```

The source of truth is `xtask/src/ci.rs`. Edit that file to change:
- Build targets
- Plugin list
- Workflow steps
- Installer script

## Release Process

Releases are triggered by pushing a version tag:

```sh
git tag v0.3.0
git push origin v0.3.0
```

This will:
1. Build `ddc` + plugins for all 5 targets
2. Create archives with `ddc` and `plugins/` directory
3. Generate checksums
4. Create a GitHub release with all assets

## Installing from Release

```sh
# Install latest release
curl -fsSL https://raw.githubusercontent.com/bearcove/dodeca/main/install.sh | sh

# Install specific version
DODECA_VERSION=v0.3.0 curl -fsSL https://raw.githubusercontent.com/bearcove/dodeca/main/install.sh | sh

# Install to custom directory
DODECA_INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/bearcove/dodeca/main/install.sh | sh
```

## Plugin Architecture

Plugins are cdylib crates in `crates/dodeca-*`. They're loaded at runtime from:
1. Same directory as `ddc` executable
2. `plugins/` subdirectory next to executable
3. `target/debug` or `target/release` (for development)

To add a new plugin:
1. Create crate in `crates/dodeca-newplugin`
2. Add to `PLUGINS` array in `xtask/src/ci.rs`
3. Run `cargo xtask ci` to regenerate workflow
