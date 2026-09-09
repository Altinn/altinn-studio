#![allow(clippy::expect_used)]

mod support;

use std::path::PathBuf;

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
    let bytes = include_bytes!("../examples/self-dev/worktree/agent.yaml");
    let agent = manifest::decode(bytes).expect("self-development manifest should decode");

    assert_eq!(agent.metadata.name, "agent-dev-worktree");
    assert_eq!(agent.spec.sandbox.platform.architecture, None);
    assert_eq!(agent.spec.secrets.len(), 1);
    assert_eq!(agent.spec.secrets[0].environment, "GITHUB_TOKEN");
    assert_eq!(agent.spec.secrets[0].source(), "GITHUB_TOKEN");
    assert_eq!(
        agent.spec.secrets[0].placeholder.as_deref(),
        Some("github_pat_AGENT_MEDIATED_GITHUB_TOKEN")
    );
    assert!(
        agent.spec.secrets[0]
            .allowed_hosts
            .iter()
            .any(|host| host == "uploads.github.com")
    );
    assert_eq!(agent.spec.skills.len(), 1);
    assert_eq!(agent.spec.skills[0].name(), Some("pr-evidence"));
    assert_eq!(agent.spec.harnesses.len(), 2);
    assert!(agent.spec.harnesses[0].default);
    assert_eq!(agent.spec.harnesses[0].kind, Harness::ClaudeCode);
    assert_eq!(agent.spec.harnesses[0].version, None);
    assert_eq!(agent.spec.harnesses[1].kind, Harness::Codex);
    assert!(!agent.spec.harnesses[1].default);
    assert_eq!(
        agent.spec.sandbox.resources.root_filesystem().mode(),
        RootFilesystemMode::Direct
    );
}

#[test]
fn self_development_mounts_the_host_checkout_instead_of_cloning() {
    let bytes = include_bytes!("../examples/self-dev/worktree/agent.yaml");
    let agent = manifest::decode(bytes).expect("self-development manifest should decode");
    let dockerfile = include_str!("../examples/self-dev/Dockerfile");

    let mounts = agent.spec.sandbox.mounts;
    assert_eq!(mounts.len(), 1);
    assert!(matches!(
        &mounts[0],
        manifest::MountSpec::Bind { source, target, read_only }
            if source == std::path::Path::new("../../../../../..")
                && target.as_str() == "/home/agent/code/altinn-studio"
                && !read_only
    ));
    assert!(!dockerfile.contains("gh repo clone"));

    let checkout = manifest::decode(include_bytes!("../examples/self-dev/checkout/agent.yaml"))
        .expect("checkout manifest should decode");
    assert_eq!(checkout.metadata.name, "agent-dev");
    assert!(checkout.spec.sandbox.mounts.is_empty());
    let nested = manifest::decode(include_bytes!("../examples/self-dev/nested/agent.yaml"))
        .expect("nested manifest should decode");
    assert_eq!(nested.metadata.name, "agent-dev-nested");
    assert!(nested.spec.sandbox.mounts.is_empty());
    assert!(nested.spec.sandbox.resources.memory() < agent.spec.sandbox.resources.memory());
}

#[test]
fn self_development_image_leaves_harness_startup_to_sessions() {
    let dockerfile = include_str!("../examples/self-dev/Dockerfile");

    assert!(!dockerfile.lines().any(|line| line.trim_start().starts_with("CMD ")));
    assert!(dockerfile.contains("podman"));
    assert!(dockerfile.contains("podman-docker"));
    assert!(dockerfile.contains("nftables"));
    assert!(dockerfile.contains("rustup"));
    assert!(dockerfile.contains("cargo-machete"));
    assert!(dockerfile.contains("ENV DOCKER_HOST=unix:///run/podman/podman.sock"));
    assert!(dockerfile.contains("ENV CARGO_TARGET_DIR="));
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

#[test]
fn status_tolerates_unknown_fields_inside_provenance() {
    let status: agent::Status = serde_json::from_value(serde_json::json!({
        "observedGeneration": 1,
        "futureField": true,
        "provenance": {
            "sourceDirectory": "/source",
            "manifestPath": "/source/worker.yml",
            "futureField": "ignored"
        }
    }))
    .expect("newer status should decode");
    let provenance = status.provenance.expect("provenance");
    assert_eq!(provenance.source_directory, std::path::Path::new("/source"));
    assert_eq!(
        provenance.manifest_path.as_deref(),
        Some(std::path::Path::new("/source/worker.yml"))
    );
}

#[test]
fn rejects_skills_without_a_directory_name_or_with_duplicate_names() {
    let mut agent = support::agent("worker");
    agent.spec.skills = vec![agent::SkillSpec {
        source: PathBuf::from("skills/.."),
    }];
    let error = agent.validate().expect_err("a source ending in .. has no skill name");
    assert!(matches!(error, agent::Error::Invalid(message) if message.starts_with("spec.skills[0].source")));

    agent.spec.skills = vec![
        agent::SkillSpec {
            source: PathBuf::from("skills/evidence"),
        },
        agent::SkillSpec {
            source: PathBuf::from("../shared/evidence/"),
        },
    ];
    let error = agent
        .validate()
        .expect_err("two skills with the same directory name collide");
    assert!(
        matches!(error, agent::Error::Invalid(message) if message == "spec.skills[1] duplicates skill \"evidence\"")
    );

    agent.spec.skills.pop();
    agent.validate().expect("one named skill is valid");
    assert_eq!(agent.spec.skills[0].name(), Some("evidence"));
}
