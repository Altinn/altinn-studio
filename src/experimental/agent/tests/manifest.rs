#![allow(clippy::expect_used)]

mod support;

use agent::{API_VERSION, Harness, KIND, SecretSpec, manifest};
use sandbox::RootFilesystemMode;

#[test]
fn decodes_sandbox_mount_primitives() {
    let bytes = br#"
apiVersion: agents.platform/v1alpha1
kind: Agent
metadata:
  name: worker
spec:
  sandbox:
    image:
      type: reference
      reference: example.invalid/agent:latest
    platform:
      os: linux
    resources:
      cpu: "2"
      memory: "1Gi"
      rootFilesystem:
        capacity: "4Gi"
        mode: layered
    mounts:
      - type: bind
        source: ../..
        target: /home/agent/code/altinn-studio
        readOnly: false
      - type: tmpfs
        target: /tmp
        capacity: "1Gi"
  home:
    source: home
  harnesses:
    - type: claudeCode
      version: "2.1.239"
      auth: mediated
  network:
    mode: mediated
    allow: all
"#;

    let agent = manifest::decode(bytes).expect("manifest with Sandbox Mounts should decode");
    let value = serde_json::to_value(agent).expect("Agent JSON");

    assert_eq!(value["spec"]["sandbox"]["platform"]["os"], "linux");
    assert_eq!(value["spec"]["sandbox"]["mounts"][0]["source"], "../..");
    assert_eq!(value["spec"]["sandbox"]["mounts"][1]["capacity"], "1Gi");
}

#[test]
fn decodes_a_harness_without_a_declared_version() {
    let bytes = br#"
apiVersion: agents.platform/v1alpha1
kind: Agent
metadata:
  name: worker
spec:
  sandbox:
    image:
      type: reference
      reference: example.invalid/agent:latest
    platform:
      os: linux
    resources:
      cpu: "2"
      memory: "1Gi"
      rootFilesystem:
        capacity: "4Gi"
        mode: layered
  home:
    source: home
  harnesses:
    - type: claudeCode
      auth: mediated
  network:
    mode: mediated
    allow: all
"#;

    let agent = manifest::decode(bytes).expect("manifest without a harness version should decode");
    assert_eq!(agent.spec.harnesses[0].version, None);

    let value = serde_json::to_value(agent).expect("Agent JSON");
    assert!(value["spec"]["harnesses"][0].get("version").is_none());
}

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
    assert_eq!(agent.spec.harnesses.len(), 1);
    assert!(!agent.spec.harnesses[0].default);
    assert_eq!(
        agent.spec.default_harness().map(|harness| harness.kind),
        Some(Harness::ClaudeCode)
    );
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
    assert_eq!(agent.spec.secrets[0].environment, "GITHUB_TOKEN");
    assert_eq!(agent.spec.secrets[0].source(), "GITHUB_TOKEN");
    assert_eq!(agent.spec.secrets[0].placeholder, None);
    assert_eq!(agent.spec.harnesses.len(), 2);
    assert!(agent.spec.harnesses[0].default);
    assert_eq!(agent.spec.harnesses[0].kind, Harness::ClaudeCode);
    assert_eq!(agent.spec.harnesses[1].kind, Harness::Codex);
    assert!(!agent.spec.harnesses[1].default);
    assert_eq!(
        agent.spec.sandbox.resources.root_filesystem().mode(),
        RootFilesystemMode::Direct
    );
}

#[test]
fn self_development_image_leaves_harness_startup_to_sessions() {
    let dockerfile = include_str!("../examples/self-dev/Dockerfile");

    assert!(!dockerfile.lines().any(|line| line.trim_start().starts_with("CMD ")));
    assert!(dockerfile.contains("podman"));
    assert!(dockerfile.contains("podman-docker"));
    assert!(dockerfile.contains("podman-compose"));
    assert!(dockerfile.contains("nftables"));
}

#[test]
fn self_development_workspace_clone_is_a_simple_one_shot() {
    let unit = include_str!("../examples/self-dev/workspace-init.service");
    let initialization = include_str!("../examples/self-dev/workspace-init.sh");

    assert!(!unit.contains("Restart="));
    assert!(!unit.contains("StartLimit"));
    assert!(unit.contains("PassEnvironment=GITHUB_TOKEN"));
    assert!(!unit.contains("MSB_GITHUB_TOKEN"));
    assert!(!initialization.contains(".clone."));
    assert!(!initialization.contains("GITHUB_TOKEN"));
    assert!(!initialization.contains("agent-github-token-placeholder"));
    assert!(initialization.contains("getent ahosts github.com"));
    assert!(initialization.contains("remaining=$((remaining - 1))"));
    assert_eq!(
        initialization
            .matches("gh repo clone \"$repository\" \"$destination\"")
            .count(),
        1
    );
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

#[test]
fn rejects_a_custom_placeholder_that_collides_with_a_generated_one() {
    let mut agent = support::agent("worker");
    agent.spec.secrets = vec![
        SecretSpec {
            environment: "FIRST_TOKEN".into(),
            placeholder: None,
            allowed_hosts: vec!["example.com".into()],
            source: None,
        },
        SecretSpec {
            environment: "SECOND_TOKEN".into(),
            placeholder: Some("$AGENT_SECRET_FIRST_TOKEN".into()),
            allowed_hosts: vec!["example.com".into()],
            source: None,
        },
    ];

    let error = agent
        .validate()
        .expect_err("effective placeholders must remain unambiguous");

    assert!(matches!(error, agent::Error::Invalid(message) if message.contains("spec.secrets[1]")));
}

#[test]
fn validates_harness_installation_cardinality_and_defaults() {
    let mut empty = support::agent("worker");
    empty.spec.harnesses.clear();
    assert!(matches!(
        empty.validate(),
        Err(agent::Error::Invalid(message)) if message.contains("spec.harnesses must not be empty")
    ));

    let installation = support::agent("worker").spec.harnesses.remove(0);
    let mut duplicate = support::agent("worker");
    let mut explicit_default = installation.clone();
    explicit_default.default = true;
    duplicate.spec.harnesses = vec![explicit_default, installation.clone()];
    assert!(matches!(
        duplicate.validate(),
        Err(agent::Error::Invalid(message)) if message.contains("duplicate harness kind")
    ));

    let mut codex = installation.clone();
    codex.kind = Harness::Codex;
    codex.version = Some("0.149.1".into());

    let mut no_default = support::agent("worker");
    no_default.spec.harnesses = vec![installation.clone(), codex.clone()];
    assert!(matches!(
        no_default.validate(),
        Err(agent::Error::Invalid(message)) if message.contains("exactly one default")
    ));

    let mut multiple_defaults = support::agent("worker");
    let mut first = installation;
    first.default = true;
    let mut second = codex;
    second.default = true;
    multiple_defaults.spec.harnesses = vec![first, second];
    assert!(matches!(
        multiple_defaults.validate(),
        Err(agent::Error::Invalid(message)) if message.contains("exactly one default")
    ));
}

#[test]
fn rejects_manifest_secrets_owned_by_a_declared_harness() {
    let mut agent = support::agent("worker");
    let mut codex = agent.spec.harnesses[0].clone();
    codex.kind = Harness::Codex;
    codex.version = Some("0.149.1".into());
    codex.default = false;
    agent.spec.harnesses[0].default = true;
    agent.spec.harnesses.push(codex);
    agent.spec.secrets.push(SecretSpec {
        environment: "AGENT_CODEX_ACCESS_TOKEN".into(),
        placeholder: None,
        allowed_hosts: vec!["chatgpt.com".into()],
        source: None,
    });

    assert!(matches!(
        agent.validate(),
        Err(agent::Error::Invalid(message)) if message.contains("spec.secrets[0]")
    ));
}
