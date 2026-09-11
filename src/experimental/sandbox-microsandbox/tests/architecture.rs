#![allow(clippy::expect_used)]

use std::{fs, path::Path};

#[test]
fn microsandbox_integration_does_not_depend_on_agent_automation() {
    let manifest = fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml"))
        .expect("Microsandbox integration Cargo.toml should be readable");

    assert!(manifest.contains("sandbox ="));
    assert!(!manifest.contains("agent ="));
    assert!(!manifest.contains("agent-runtime ="));
}
