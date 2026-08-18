#![allow(clippy::expect_used)]

mod support;

use agent::{API_VERSION, KIND, manifest};
use sandbox::{Platform, RootFilesystemMode};

#[test]
fn decodes_the_example_manifest() {
    let bytes = include_bytes!("../examples/agent.yaml");
    let agent = manifest::decode(bytes).expect("example manifest should decode");

    assert_eq!(agent.api_version, API_VERSION);
    assert_eq!(agent.kind, KIND);
    assert_eq!(agent.metadata.name, "altinn-studio");
    assert_eq!(agent.spec.sandbox.platform, Platform::new("linux", "amd64"));
    assert_eq!(
        agent.spec.sandbox.resources.root_filesystem().mode(),
        RootFilesystemMode::Layered
    );
}

#[test]
fn rejects_an_agent_name_that_cannot_identify_its_sandbox() {
    let agent = support::agent("Worker_Name");
    let error = agent.validate().expect_err("non-portable name should be rejected");

    assert!(matches!(error, agent::Error::Invalid(message) if message.starts_with("metadata.name:")));
}
