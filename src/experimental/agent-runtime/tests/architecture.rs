#![allow(clippy::expect_used)]

use std::{fs, path::Path};

#[test]
fn agent_runtime_does_not_depend_on_control_plane_or_sandbox_implementation() {
    let manifest = fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml"))
        .expect("Agent Runtime Cargo.toml should be readable");

    assert!(!manifest.contains("agent ="));
    assert!(!manifest.contains("sandbox-microsandbox ="));
}
