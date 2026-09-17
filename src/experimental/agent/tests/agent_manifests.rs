#![allow(clippy::expect_used)]

use std::path::{Path, PathBuf};

use agent::{Agent, MountSpec, manifest};
use sandbox::image::ImageSource;

fn repository_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn resolved(path: &Path) -> Agent {
    manifest::resolve(path).expect("manifest should resolve").agent
}

fn assert_inputs_exist(agent: &Agent, directory: &Path) {
    assert!(directory.join(&agent.spec.home.source).is_dir(), "home source exists");
    for instruction in &agent.spec.instructions {
        assert!(
            directory.join(&instruction.source).is_file(),
            "instruction source exists"
        );
    }
    for skill in &agent.spec.skills {
        assert!(
            directory.join(&skill.source).join("SKILL.md").is_file(),
            "skill source exists"
        );
    }
    if let ImageSource::Build {
        context, dockerfile, ..
    } = &agent.spec.sandbox.image
    {
        let context = directory.join(context);
        assert!(context.is_dir(), "image build context exists");
        assert!(
            context.join(dockerfile).is_file(),
            "Dockerfile is inside its build context"
        );
    }
}

#[test]
fn self_development_variants_are_local_independent_builds() {
    let directory = repository_root().join("src/experimental/agent/examples/self-dev");
    let default = resolved(&directory.join("agent.yaml"));
    let nested = resolved(&directory.join("agent.nested.yaml"));
    let worktree = resolved(&directory.join("agent.worktree.yaml"));

    for agent in [&default, &nested, &worktree] {
        assert_eq!(
            agent.spec.sandbox.image,
            ImageSource::Build {
                context: PathBuf::from("."),
                dockerfile: PathBuf::from("Dockerfile"),
                target: None,
            }
        );
        assert_inputs_exist(agent, &directory);
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
    let dockerfile = std::fs::read_to_string(directory.join("Dockerfile")).expect("self-dev Dockerfile");
    assert!(!dockerfile.contains("ghcr.io/altinn/altinn-studio/agent"));
    for manifest in ["agent.yaml", "agent.nested.yaml", "agent.worktree.yaml"] {
        let text = std::fs::read_to_string(directory.join(manifest)).expect(manifest);
        assert!(!text.contains("agents/"), "{manifest} does not consume the Altinn tree");
    }
}

#[test]
fn altinn_variants_inherit_agent_policy_and_select_expected_images() {
    for (agent, target) in [("full", "full"), ("minimal", "minimal")] {
        let directory = repository_root().join("agents").join(agent);
        let default = resolved(&directory.join("agent.yaml"));
        let nested = resolved(&directory.join("agent.nested.yaml"));
        let nested_build = resolved(&directory.join("agent.nested-build.yaml"));
        let worktree = resolved(&directory.join("agent.worktree.yaml"));

        let published = ImageSource::Reference {
            reference: format!("ghcr.io/altinn/altinn-studio/agent-{agent}:latest"),
        };
        assert_eq!(default.spec.sandbox.image, published);
        assert_eq!(nested.spec.sandbox.image, published);
        assert_eq!(worktree.spec.sandbox.image, published);
        assert_eq!(
            nested_build.spec.sandbox.image,
            ImageSource::Build {
                context: PathBuf::from(".."),
                dockerfile: PathBuf::from("Dockerfile"),
                target: Some(target.into()),
            }
        );
        assert_inputs_exist(&nested_build, &directory);

        let mut comparable_build = nested_build.clone();
        comparable_build.metadata.name = nested.metadata.name.clone();
        comparable_build.spec.sandbox.image = nested.spec.sandbox.image.clone();
        assert_eq!(comparable_build, nested, "nested-build changes only name and image");

        assert!(nested.spec.sandbox.resources.cpu() < default.spec.sandbox.resources.cpu());
        assert!(nested.spec.sandbox.resources.memory() < default.spec.sandbox.resources.memory());
        assert!(
            nested.spec.sandbox.resources.root_filesystem().capacity()
                < default.spec.sandbox.resources.root_filesystem().capacity()
        );
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
    }
    let dockerfile = std::fs::read_to_string(repository_root().join("agents/Dockerfile")).expect("Altinn Dockerfile");
    assert!(!dockerfile.contains("AGENT_VERSION"));
    assert!(dockerfile.contains("AGENT_INSTALL_MODE=standalone"));
    assert!(dockerfile.contains("/main/src/experimental/agent/install.sh"));
    assert!(dockerfile.contains("USER agent"));
    assert!(dockerfile.contains("FROM base AS minimal"));
    assert!(dockerfile.contains("FROM base AS full"));
    assert!(!dockerfile.contains("cargo build"));
}

#[test]
fn every_agent_ignores_local_variants() {
    let root = repository_root();
    for directory in [
        root.join("agents/full"),
        root.join("agents/minimal"),
        root.join("src/experimental/agent/examples/self-dev"),
    ] {
        let ignore = std::fs::read_to_string(directory.join(".gitignore")).expect("Agent .gitignore");
        assert!(ignore.lines().any(|line| line == "agent.*.yaml"));
    }
}
