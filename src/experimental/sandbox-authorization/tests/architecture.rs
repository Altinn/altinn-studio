#![allow(clippy::expect_used)]

use std::{fs, path::Path};

#[test]
fn sandbox_authorization_contracts_do_not_depend_on_enforcement_points() {
    let manifest = fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml"))
        .expect("Sandbox Authorization Cargo.toml should be readable");

    assert!(!manifest.contains("agent ="));
    assert!(!manifest.contains("sandbox ="));
}
