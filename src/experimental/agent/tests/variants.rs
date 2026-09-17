#![allow(clippy::expect_used)]

mod support;

use std::path::Path;

use agent::{AgentVariantName, manifest};

fn agent_directory() -> support::TempDirectory {
    let directory = support::TempDirectory::new("variants");
    let yaml = serde_yaml_ng::to_string(&support::agent("base")).expect("base YAML");
    std::fs::write(directory.path().join("agent.yaml"), yaml).expect("base manifest");
    directory
}

fn write(directory: &Path, name: &str, body: &str) {
    std::fs::write(directory.join(name), body).expect("variant manifest");
}

fn variant(extends: &str, name: &str, spec: &str) -> String {
    format!(
        "apiVersion: agents.platform/v1alpha1\nkind: AgentVariant\nextends: {extends}\nmetadata:\n  name: {name}\n{spec}"
    )
}

#[test]
fn resolves_one_level_and_multilevel_variants_from_the_base_outward() {
    let directory = agent_directory();
    write(
        directory.path(),
        "agent.nested.yaml",
        &variant(
            "agent.yaml",
            "nested",
            "spec:\n  sandbox:\n    resources:\n      cpu: '1'\n      memory: 2Gi\n",
        ),
    );
    write(
        directory.path(),
        "agent.mine.yaml",
        &variant(
            "agent.nested.yaml",
            "mine",
            "spec:\n  sandbox:\n    resources:\n      cpu: '3'\n",
        ),
    );

    let resolved = manifest::resolve(&directory.path().join("agent.mine.yaml")).expect("resolved variant");
    let value = serde_json::to_value(&resolved.agent).expect("Agent JSON");
    assert_eq!(resolved.agent.metadata.name, "mine");
    assert_eq!(value["spec"]["sandbox"]["resources"]["cpu"], "3");
    assert_eq!(value["spec"]["sandbox"]["resources"]["memory"], "2Gi");
    assert_eq!(
        resolved
            .chain
            .iter()
            .filter_map(|path| path.file_name().and_then(|name| name.to_str()))
            .collect::<Vec<_>>(),
        ["agent.mine.yaml", "agent.nested.yaml", "agent.yaml"]
    );
}

#[test]
fn mappings_merge_while_arrays_replace_and_empty_arrays_clear() {
    let directory = agent_directory();
    write(
        directory.path(),
        "agent.arrays.yaml",
        &variant(
            "agent.yaml",
            "arrays",
            "spec:\n  sandbox:\n    mounts:\n      - type: tmpfs\n        target: /tmp\n        capacity: 2Gi\n  instructions: []\n  harnesses:\n    - type: codex\n      auth: mediated\n",
        ),
    );

    let agent = manifest::resolve(&directory.path().join("agent.arrays.yaml"))
        .expect("array variant")
        .agent;
    assert_eq!(agent.spec.sandbox.mounts.len(), 1);
    assert!(agent.spec.instructions.is_empty());
    assert_eq!(agent.spec.harnesses.len(), 1);
    assert_eq!(agent.spec.harnesses[0].kind, agent::Harness::Codex);
    assert_eq!(agent.spec.home.source, Path::new("home"));
}

#[test]
fn changing_a_tagged_mapping_type_replaces_the_previous_variant() {
    let directory = agent_directory();
    write(
        directory.path(),
        "agent.reference.yaml",
        &variant(
            "agent.yaml",
            "reference",
            "spec:\n  sandbox:\n    image:\n      type: reference\n      reference: example.invalid/agent:latest\n",
        ),
    );

    let agent = manifest::resolve(&directory.path().join("agent.reference.yaml"))
        .expect("tagged mapping replacement")
        .agent;
    assert!(matches!(
        agent.spec.sandbox.image,
        sandbox::image::ImageSource::Reference { .. }
    ));
}

#[test]
fn null_removes_optional_fields_and_required_removal_fails_final_validation() {
    let directory = agent_directory();
    write(
        directory.path(),
        "agent.optional.yaml",
        &variant(
            "agent.yaml",
            "optional",
            "spec:\n  sandbox:\n    retentionPolicy: null\n",
        ),
    );
    let optional = manifest::resolve(&directory.path().join("agent.optional.yaml")).expect("optional removal");
    assert_eq!(optional.agent.spec.sandbox.retention_policy, None);

    write(
        directory.path(),
        "agent.required.yaml",
        &variant("agent.yaml", "required", "spec:\n  sandbox:\n    resources: null\n"),
    );
    let error = manifest::resolve(&directory.path().join("agent.required.yaml")).expect_err("required removal");
    assert!(error.to_string().contains("resources"));
    assert!(error.to_string().contains("agent.required.yaml"));
}

#[test]
fn rejects_unknown_variant_fields_even_when_null() {
    let directory = agent_directory();
    for (name, spec) in [
        ("unknown", "spec:\n  mystery: null\n"),
        (
            "nested-unknown",
            "spec:\n  sandbox:\n    resources:\n      mystery: null\n",
        ),
    ] {
        let filename = format!("agent.{name}.yaml");
        write(directory.path(), &filename, &variant("agent.yaml", name, spec));
        let error = manifest::resolve(&directory.path().join(filename)).expect_err("unknown field");
        assert!(error.to_string().contains("unknown field"), "{error}");
    }
}

#[test]
fn rejects_missing_bases_cross_directory_paths_and_absolute_paths() {
    let directory = agent_directory();
    for (name, extends, expected) in [
        ("missing", "agent.absent.yaml", "could not read"),
        ("parent", "../agent.yaml", "extends must name"),
        ("absolute", "/tmp/agent.yaml", "extends must name"),
    ] {
        let filename = format!("agent.{name}.yaml");
        write(directory.path(), &filename, &variant(extends, name, ""));
        let error = manifest::resolve(&directory.path().join(filename)).expect_err("invalid base");
        assert!(error.to_string().contains(expected), "{error}");
    }
}

#[test]
fn reports_the_complete_cycle() {
    let directory = agent_directory();
    write(
        directory.path(),
        "agent.one.yaml",
        &variant("agent.two.yaml", "one", ""),
    );
    write(
        directory.path(),
        "agent.two.yaml",
        &variant("agent.one.yaml", "two", ""),
    );
    let error = manifest::resolve(&directory.path().join("agent.one.yaml")).expect_err("cycle");
    assert!(
        error
            .to_string()
            .contains("agent.one.yaml -> agent.two.yaml -> agent.one.yaml"),
        "{error}"
    );
}

#[test]
fn base_errors_include_the_complete_inheritance_chain() {
    let directory = agent_directory();
    write(
        directory.path(),
        "agent.parent.yaml",
        &variant("agent.missing.yaml", "parent", ""),
    );
    write(
        directory.path(),
        "agent.leaf.yaml",
        &variant("agent.parent.yaml", "leaf", ""),
    );

    let error = manifest::resolve(&directory.path().join("agent.leaf.yaml")).expect_err("missing base");
    let message = error.to_string();
    assert!(message.contains("inheritance chain:"), "{message}");
    assert!(message.contains("agent.leaf.yaml\n  extends agent.parent.yaml\n  extends agent.missing.yaml"));
}

#[test]
fn limits_inheritance_to_sixteen_manifests() {
    let directory = agent_directory();
    for index in 1..=16 {
        let extends = if index == 16 {
            "agent.yaml".to_owned()
        } else {
            format!("agent.v{}.yaml", index + 1)
        };
        write(
            directory.path(),
            &format!("agent.v{index}.yaml"),
            &variant(&extends, &format!("v{index}"), ""),
        );
    }
    let error = manifest::resolve(&directory.path().join("agent.v1.yaml")).expect_err("depth limit");
    assert!(error.to_string().contains("exceeds 16 manifests"), "{error}");
}

#[test]
fn requires_names_and_matching_api_versions_in_every_variant() {
    let directory = agent_directory();
    write(
        directory.path(),
        "agent.nameless.yaml",
        "apiVersion: agents.platform/v1alpha1\nkind: AgentVariant\nextends: agent.yaml\nmetadata: {}\n",
    );
    let error = manifest::resolve(&directory.path().join("agent.nameless.yaml")).expect_err("name required");
    assert!(error.to_string().contains("metadata.name"));

    write(
        directory.path(),
        "agent.version.yaml",
        "apiVersion: agents.platform/v2\nkind: AgentVariant\nextends: agent.yaml\nmetadata:\n  name: version\n",
    );
    let error = manifest::resolve(&directory.path().join("agent.version.yaml")).expect_err("version mismatch");
    assert!(error.to_string().contains("apiVersion"));
}

#[test]
fn validates_filename_grammar() {
    let nested_build: AgentVariantName = "nested-build".parse().expect("variant name");
    assert_eq!(nested_build.as_str(), "nested-build");
    assert_eq!(nested_build.filename(), "agent.nested-build.yaml");
    assert_eq!(
        serde_json::to_string(&nested_build).expect("serialized name"),
        r#""nested-build""#
    );
    assert_eq!(
        serde_json::from_str::<AgentVariantName>(r#""nested-build""#).expect("deserialized name"),
        nested_build
    );

    for accepted in [
        "agent.nested.yaml",
        "agent.nested-build.yaml",
        "agent.worktree.yaml",
        "agent.mine.yaml",
        "agent.large-local.yaml",
    ] {
        assert!(manifest::is_manifest_filename(Path::new(accepted)), "{accepted}");
    }
    assert!(manifest::is_manifest_filename(Path::new("agent.yaml")));
    for rejected in [
        "agent-copy.yaml",
        "agent..yaml",
        "agent.Nested.yaml",
        "my-agent.yaml",
        "agent.yaml.bak",
        "agent.trailing-.yaml",
    ] {
        assert!(!manifest::is_manifest_filename(Path::new(rejected)), "{rejected}");
    }
    for rejected in ["", "Nested", "nested_build", "nested-", "../nested"] {
        assert!(rejected.parse::<AgentVariantName>().is_err(), "{rejected}");
    }
}
