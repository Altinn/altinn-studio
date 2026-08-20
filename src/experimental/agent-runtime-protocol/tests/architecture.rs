#![allow(clippy::expect_used)]

use std::{fs, path::Path};

#[test]
fn runtime_protocol_does_not_depend_on_host_agent_automation() {
    let manifest = fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml"))
        .expect("Agent Runtime Protocol Cargo.toml should be readable");

    assert!(!manifest.contains("agent ="));
    assert!(!manifest.contains("sandbox ="));
    assert!(!manifest.contains("sandbox-microsandbox ="));
}
