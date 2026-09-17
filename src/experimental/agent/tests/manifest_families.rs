#![allow(clippy::expect_used)]

use std::path::{Path, PathBuf};

use agent::{Agent, MountSpec, manifest};
use sandbox::image::ImageSource;

fn repository_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn resolved(path: &Path) -> Agent {
    manifest::resolve(path)
        .unwrap_or_else(|error| panic!("{}: {error}", path.display()))
        .agent
}

fn assert_inputs_exist(agent: &Agent, family: &Path) {
    assert!(family.join(&agent.spec.home.source).is_dir(), "home source exists");
    for instruction in &agent.spec.instructions {
        assert!(family.join(&instruction.source).is_file(), "instruction source exists");
    }
    for skill in &agent.spec.skills {
        assert!(
            family.join(&skill.source).join("SKILL.md").is_file(),
            "skill source exists"
        );
    }
    if let ImageSource::Build { context, dockerfile } = &agent.spec.sandbox.image {
        let context = family.join(context);
        assert!(context.is_dir(), "image build context exists");
        assert!(
            context.join(dockerfile).is_file(),
            "Dockerfile is inside its build context"
        );
    }
}

#[test]
fn self_development_variants_are_local_independent_builds() {
    let family = repository_root().join("src/experimental/agent/examples/self-dev");
    let default = resolved(&family.join("agent.yaml"));
    let nested = resolved(&family.join("agent.nested.yaml"));
    let worktree = resolved(&family.join("agent.worktree.yaml"));

    for agent in [&default, &nested, &worktree] {
        assert_eq!(
            agent.spec.sandbox.image,
            ImageSource::Build {
                context: PathBuf::from("."),
                dockerfile: PathBuf::from("Dockerfile"),
            }
        );
        assert_inputs_exist(agent, &family);
    }
    assert!(nested.spec.sandbox.resources.cpu() < default.spec.sandbox.resources.cpu());
    assert!(nested.spec.sandbox.resources.memory() < default.spec.sandbox.resources.memory());
    assert!(
        nested.spec.sandbox.resources.root_filesystem().capacity()
            < default.spec.sandbox.resources.root_filesystem().capacity()
    );
    assert!(matches!(
        &worktree.spec.sandbox.mounts[..],
        [MountSpec::Bind { source, target, read_only: false }, MountSpec::Tmpfs { .. }]
            if source == Path::new("../../../../..")
                && target.as_str() == "/home/agent/code/altinn-studio"
    ));
    let dockerfile = std::fs::read_to_string(family.join("Dockerfile")).expect("self-dev Dockerfile");
    assert!(!dockerfile.contains("ghcr.io/altinn/altinn-studio/agent"));
    for manifest in ["agent.yaml", "agent.nested.yaml", "agent.worktree.yaml"] {
        let text = std::fs::read_to_string(family.join(manifest)).expect(manifest);
        assert!(!text.contains("agents/"), "{manifest} does not consume the Altinn tree");
    }
}

#[test]
fn altinn_variants_inherit_the_family_policy_and_select_expected_images() {
    let family = repository_root().join("agents/full");
    let default = resolved(&family.join("agent.yaml"));
    let nested = resolved(&family.join("agent.nested.yaml"));
    let nested_build = resolved(&family.join("agent.nested-build.yaml"));
    let worktree = resolved(&family.join("agent.worktree.yaml"));

    let published = ImageSource::Reference {
        reference: "ghcr.io/altinn/altinn-studio/agent-full:latest".into(),
    };
    assert_eq!(default.spec.sandbox.image, published);
    assert_eq!(nested.spec.sandbox.image, published);
    assert_eq!(worktree.spec.sandbox.image, published);
    assert_eq!(
        nested_build.spec.sandbox.image,
        ImageSource::Build {
            context: PathBuf::from(".."),
            dockerfile: PathBuf::from("Dockerfile"),
        }
    );
    assert_inputs_exist(&nested_build, &family);

    let mut comparable_build = nested_build.clone();
    comparable_build.metadata.name = nested.metadata.name.clone();
    comparable_build.spec.sandbox.image = nested.spec.sandbox.image.clone();
    assert_eq!(comparable_build, nested, "nested-build changes only name and image");

    assert!(matches!(
        &worktree.spec.sandbox.mounts[..],
        [MountSpec::Bind { source, target, read_only: false }, MountSpec::Tmpfs { .. }]
            if source == Path::new("../..") && target.as_str() == "/home/agent/code/altinn-studio"
    ));
    for inherited in [&nested, &nested_build, &worktree] {
        assert_eq!(inherited.spec.harnesses, default.spec.harnesses);
        assert_eq!(inherited.spec.instructions, default.spec.instructions);
        assert_eq!(inherited.spec.skills, default.spec.skills);
        assert_eq!(inherited.spec.access, default.spec.access);
        assert_eq!(inherited.spec.secrets, default.spec.secrets);
        assert_eq!(inherited.spec.network, default.spec.network);
    }
    let dockerfile = std::fs::read_to_string(repository_root().join("agents/Dockerfile")).expect("Altinn Dockerfile");
    assert!(dockerfile.contains("ARG AGENT_VERSION="));
    assert!(dockerfile.contains("AGENT_SHA256="));
    assert!(!dockerfile.contains("src/experimental"));
}

#[test]
fn every_manifest_family_ignores_local_variants() {
    let root = repository_root();
    for family in [
        root.join("agents/full"),
        root.join("agents/minimal"),
        root.join("src/experimental/agent/examples/self-dev"),
    ] {
        let ignore = std::fs::read_to_string(family.join(".gitignore")).expect("family .gitignore");
        assert!(ignore.lines().any(|line| line == "agent.*.yaml"));
    }
}
