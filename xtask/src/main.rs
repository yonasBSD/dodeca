//! Build tasks for dodeca
//!
//! Usage:
//!   cargo xtask build [--release]
//!   cargo xtask wasm

use std::env;
use std::process::{Command, ExitCode};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();

    match args.first().map(|s| s.as_str()) {
        Some("build") => {
            let release = args.iter().any(|a| a == "--release" || a == "-r");
            if !build_wasm() {
                return ExitCode::FAILURE;
            }
            if !build_dodeca(release) {
                return ExitCode::FAILURE;
            }
            ExitCode::SUCCESS
        }
        Some("wasm") => {
            if build_wasm() {
                ExitCode::SUCCESS
            } else {
                ExitCode::FAILURE
            }
        }
        _ => {
            eprintln!("Usage:");
            eprintln!("  cargo xtask build [--release]  Build WASM + dodeca");
            eprintln!("  cargo xtask wasm               Build WASM only");
            ExitCode::FAILURE
        }
    }
}

fn build_wasm() -> bool {
    eprintln!("Building livereload-client WASM...");

    let status = Command::new("wasm-pack")
        .args(["build", "--target", "web", "crates/livereload-client"])
        .status();

    match status {
        Ok(s) if s.success() => {
            eprintln!("WASM build complete");
            true
        }
        Ok(s) => {
            eprintln!("wasm-pack failed with status: {s}");
            false
        }
        Err(e) => {
            eprintln!("Failed to run wasm-pack: {e}");
            eprintln!("Install with: cargo install wasm-pack");
            false
        }
    }
}

fn build_dodeca(release: bool) -> bool {
    eprintln!("Building dodeca{}...", if release { " (release)" } else { "" });

    let mut cmd = Command::new("cargo");
    cmd.args(["build", "--package", "dodeca"]);
    if release {
        cmd.arg("--release");
    }

    match cmd.status() {
        Ok(s) if s.success() => {
            eprintln!("Build complete");
            true
        }
        Ok(s) => {
            eprintln!("cargo build failed with status: {s}");
            false
        }
        Err(e) => {
            eprintln!("Failed to run cargo: {e}");
            false
        }
    }
}
