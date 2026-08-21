#![allow(clippy::expect_used)]

use std::{fs, path::Path};

#[test]
fn sandbox_crate_has_no_higher_layer_or_concrete_backend_dependencies() {
    let manifest = fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml"))
        .expect("sandbox Cargo.toml should be readable");

    assert!(!manifest.contains("agent ="));
    assert!(!manifest.contains("agent-runtime ="));
    assert!(!manifest.contains("sandbox-microsandbox ="));
}
