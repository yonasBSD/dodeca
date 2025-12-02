//! Build script to compile the livereload WASM client
//!
//! Run `wasm-pack build --target web crates/livereload-client` before first build,
//! or this script will attempt to do it (requires wasm-pack installed).

use std::process::Command;

fn main() {
    let pkg_dir = std::path::Path::new("crates/livereload-client/pkg");

    // Re-run if the livereload-client source changes
    println!("cargo::rerun-if-changed=crates/livereload-client/src/lib.rs");
    println!("cargo::rerun-if-changed=crates/livereload-client/Cargo.toml");

    // If pkg already exists, we're good
    if pkg_dir.join("livereload_client.js").exists() {
        return;
    }

    // Try to build with wasm-pack
    let status = Command::new("wasm-pack")
        .args(["build", "--target", "web", "crates/livereload-client"])
        .status();

    match status {
        Ok(s) if s.success() => {}
        Ok(_) => println!("cargo::warning=wasm-pack build failed"),
        Err(_) => println!("cargo::warning=wasm-pack not found. Run: wasm-pack build --target web crates/livereload-client"),
    }
}
