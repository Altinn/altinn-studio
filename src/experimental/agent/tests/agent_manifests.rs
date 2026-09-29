#![allow(clippy::expect_used)]

use std::path::{Path, PathBuf};

use agent::{Agent, Harness, MountSpec, manifest};
use sandbox::image::ImageSource;

fn repository_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn resolved(path: &Path) -> Agent {
    manifest::resolve(path).expect("manifest should resolve").agent
}

fn assert_inputs_exist(agent: &Agent, directory: &Path) {
    // Naming the path matters: CI checks these out sparsely, so a source outside the
    // checkout fails here and nowhere else, and the path is the whole diagnosis.
    let home = directory.join(&agent.spec.home.source);
    assert!(home.is_dir(), "home source {} is not a directory", home.display());
    for instruction in &agent.spec.instructions {
        let source = directory.join(&instruction.source);
        assert!(
            source.is_file(),
            "instruction source {} is not a file",
            source.display()
        );
    }
    for skill in &agent.spec.skills {
        let source = directory.join(&skill.source);
        assert!(
            source.join("SKILL.md").is_file(),
            "skill source {} has no SKILL.md",
            source.display()
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
    for (agent, target) in [("full", "full"), ("minimal", "minimal"), ("desktop", "desktop")] {
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
        assert_published_skills(&default, agent);
        // The image owns the harness version, here as much as in the examples: a published
        // manifest that named one would have to be edited for every image bump.
        for variant in [&default, &nested, &worktree, &nested_build] {
            for harness in &variant.spec.harnesses {
                assert_eq!(
                    harness.version, None,
                    "{} pins a version for {:?}; the image owns it",
                    variant.metadata.name, harness.kind
                );
            }
        }

        assert_published_harnesses(&default);

        assert_eq!(default.spec.secrets.len(), 5);
        let azure_devops_pat = default
            .spec
            .secrets
            .iter()
            .find(|secret| secret.environment == "AZURE_DEVOPS_PAT")
            .expect("Azure DevOps PAT is declared as a mediated secret");
        assert_eq!(azure_devops_pat.source(), "AZURE_DEVOPS_PAT");
        assert!(azure_devops_pat.optional);
        assert_eq!(azure_devops_pat.allowed_hosts, ["dev.azure.com"]);
        assert_eq!(azure_devops_pat.inert_value(), "$AGENT_SECRET_AZURE_DEVOPS_PAT");
        for (environment, host) in [
            ("STUDIO_PROD_API_KEY", "altinn.studio"),
            ("STUDIO_STAGING_API_KEY", "staging.altinn.studio"),
            ("STUDIO_DEV_API_KEY", "dev.altinn.studio"),
        ] {
            let secret = default
                .spec
                .secrets
                .iter()
                .find(|secret| secret.environment == environment)
                .expect("Studio API key is declared as a mediated secret");
            assert_eq!(secret.source(), environment);
            assert!(secret.optional);
            assert_eq!(secret.allowed_hosts, [host]);
            assert_eq!(secret.inert_value(), format!("$AGENT_SECRET_{environment}"));
        }

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
    assert!(!dockerfile.contains("src/experimental/agent/install.sh"));
    assert!(!dockerfile.contains("agentctl --version"));
    assert!(dockerfile.contains("FROM base AS minimal"));
    assert!(dockerfile.contains("FROM base AS full"));
    assert!(dockerfile.contains("FROM full AS desktop"));
    assert!(!dockerfile.contains("cargo build"));
}

#[test]
fn agent_images_install_the_pinned_gh_stack_extension() {
    let root = repository_root();
    for dockerfile in [
        root.join("agents/Dockerfile"),
        root.join("src/experimental/agent/examples/minimal/Dockerfile"),
        root.join("src/experimental/agent/examples/self-dev/Dockerfile"),
    ] {
        let text = std::fs::read_to_string(&dockerfile).expect("Agent Dockerfile");
        assert!(
            text.contains("ARG GH_STACK_VERSION="),
            "{} pins gh-stack",
            dockerfile.display()
        );
        assert!(
            text.contains("github/gh-stack/releases/download/v${GH_STACK_VERSION}"),
            "{} downloads gh-stack from its official releases",
            dockerfile.display()
        );
        assert!(
            text.contains("/home/agent/.local/share/gh/extensions/gh-stack/gh-stack"),
            "{} installs gh-stack for the agent user",
            dockerfile.display()
        );
    }
}

#[test]
fn every_agent_ignores_local_variants() {
    let root = repository_root();
    for directory in [
        root.join("agents/full"),
        root.join("agents/minimal"),
        root.join("agents/desktop"),
        root.join("src/experimental/agent/examples/self-dev"),
    ] {
        let ignore = std::fs::read_to_string(directory.join(".gitignore")).expect("Agent .gitignore");
        assert!(ignore.lines().any(|line| line == "agent.*.yaml"));
    }
}

/// Claude Code is required and the default; Codex is optional, so an Agent is created without it
/// on a host that has no Codex login rather than refusing to be created at all.
fn assert_published_harnesses(agent: &Agent) {
    let claude = agent
        .spec
        .harness(Harness::ClaudeCode)
        .expect("published manifests install Claude Code");
    assert!(!claude.optional);
    assert!(claude.default);
    let codex = agent
        .spec
        .harness(Harness::Codex)
        .expect("published manifests install Codex");
    assert!(codex.optional);
    assert!(!codex.default);
}

/// Every repository-wide Skill is installed for every published Agent, and for every harness.
///
/// They live in `.claude/skills/`, where Claude Code discovers them in a plain checkout, and the
/// manifests reach across so an Agent installs them for every harness as well. A Skill added there
/// and not added here reaches a local checkout only, which is the failure this guards. The desktop
/// Agent adds the Skill for driving its screen.
fn assert_published_skills(agent: &Agent, directory: &str) {
    let mut expected = vec!["altinn-studio-app-development", "pr-evidence"];
    if directory == "desktop" {
        expected.push("computer-use");
    }
    expected.extend(["tekstforfatter-docs", "text-content-review"]);
    assert_eq!(
        agent
            .spec
            .skills
            .iter()
            .filter_map(|skill| skill.name())
            .collect::<Vec<_>>(),
        expected
    );
}
