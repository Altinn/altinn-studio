#![allow(clippy::expect_used)]

mod support;

use agent::{API_VERSION, KIND, manifest};
use sandbox::RootFilesystemMode;

#[test]
fn decodes_the_minimal_manifest() {
    let bytes = include_bytes!("../examples/minimal/agent.yaml");
    let agent = manifest::decode(bytes).expect("minimal manifest should decode");

    assert_eq!(agent.api_version, API_VERSION);
    assert_eq!(agent.kind, KIND);
    assert_eq!(agent.metadata.name, "altinn-studio");
    assert_eq!(agent.spec.sandbox.platform.os, "linux");
    assert_eq!(agent.spec.sandbox.platform.architecture, None);
    assert_eq!(agent.spec.sandbox.retention_policy, None);
    assert_eq!(
        agent.spec.sandbox.resources.root_filesystem().mode(),
        RootFilesystemMode::Layered
    );
}

#[test]
fn decodes_the_self_development_manifest() {
    let bytes = include_bytes!("../examples/self-dev/agent.yaml");
    let agent = manifest::decode(bytes).expect("self-development manifest should decode");

    assert_eq!(agent.metadata.name, "studiodev");
    assert_eq!(agent.spec.sandbox.platform.architecture, None);
    assert_eq!(agent.spec.secrets.len(), 2);
    assert_eq!(
        agent.spec.sandbox.resources.root_filesystem().mode(),
        RootFilesystemMode::Direct
    );
}

#[test]
fn self_development_image_leaves_harness_startup_to_sessions() {
    let dockerfile = include_str!("../examples/self-dev/Dockerfile");

    assert!(!dockerfile.lines().any(|line| line.trim_start().starts_with("CMD ")));
}

#[test]
fn self_development_workspace_clone_is_one_shot_and_does_not_gate_readiness_after_failure() {
    let unit = include_str!("../examples/self-dev/workspace-init.service");
    let readiness = include_str!("../examples/self-dev/image-ready.sh");
    let initialization = include_str!("../examples/self-dev/workspace-init.sh");

    assert!(!unit.contains("Restart="));
    assert!(!unit.contains("StartLimit"));
    assert!(!readiness.contains("reset-failed"));
    assert!(!readiness.contains("systemctl restart"));
    assert!(readiness.contains("workspace clone failed; a Session may retry it"));
    assert!(!initialization.contains(".clone."));
    assert!(initialization.contains("git clone --origin origin -- \"$repository\" \"$destination\""));
}

#[test]
fn rejects_removed_repository_bootstrap_configuration() {
    let bytes = br"
apiVersion: agents.platform/v1alpha1
kind: Agent
metadata:
  name: worker
spec:
  repositories: []
";
    let error = manifest::decode(bytes).expect_err("repository bootstrap should not be part of the manifest");

    assert!(error.to_string().contains("repositories"));
}

#[test]
fn rejects_an_agent_name_that_cannot_identify_its_sandbox() {
    let agent = support::agent("Worker_Name");
    let error = agent.validate().expect_err("non-portable name should be rejected");

    assert!(matches!(error, agent::Error::Invalid(message) if message.starts_with("metadata.name:")));
}
