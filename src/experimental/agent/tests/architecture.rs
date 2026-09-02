#![allow(clippy::expect_used)]

use std::path::{Path, PathBuf};

#[test]
fn harness_internals_are_contained_by_the_harness_adapter() {
    let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let harness = source.join("harness");
    let binaries = source.join("bin");
    let mut files = Vec::new();
    rust_files(&source, &mut files);

    for path in files {
        // The harness adapter owns harness internals. The `bin/` composition
        // roots legitimately name a harness to dispatch on the closed enum
        // (like `agentd` naming a Sandbox Provider), but must still not carry
        // harness implementation details — asserted separately below.
        if path.starts_with(&harness) || path.starts_with(&binaries) {
            continue;
        }
        let contents = std::fs::read_to_string(&path).expect("Agent source should be readable");
        let lowercase = contents.to_ascii_lowercase();
        for implementation_name in ["claude", "anthropic", "sk-ant", "codex", "openai"] {
            assert!(
                !lowercase.contains(implementation_name),
                "harness-specific name {implementation_name:?} leaked into {}",
                path.display()
            );
        }
    }

    let mut binary_files = Vec::new();
    rust_files(&binaries, &mut binary_files);
    for path in binary_files {
        let contents = std::fs::read_to_string(&path).expect("binary source should be readable");
        let lowercase = contents.to_ascii_lowercase();
        for implementation_detail in [
            "anthropic",
            "sk-ant",
            "setup-token",
            "oauth",
            ".credentials.json",
            "api.openai",
            "auth.json",
            "sk-agent-mediated",
        ] {
            assert!(
                !lowercase.contains(implementation_detail),
                "harness implementation detail {implementation_detail:?} leaked into {}",
                path.display()
            );
        }
    }

    let dispatch = std::fs::read_to_string(harness.join("mod.rs")).expect("harness dispatch should be readable");
    let lowercase = dispatch.to_ascii_lowercase();
    for implementation_detail in [
        "api.anthropic",
        "sk-ant",
        "/home/agent/.claude",
        "oauth",
        "access-token",
        "refresh-token",
        "api.openai",
        "auth.json",
        "sk-agent-mediated",
    ] {
        assert!(
            !lowercase.contains(implementation_detail),
            "harness implementation detail {implementation_detail:?} leaked into the generic dispatch"
        );
    }
}

#[test]
fn microsandbox_internals_are_contained_by_the_microsandbox_adapter() {
    let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let adapter = source.join("sandbox").join("microsandbox");
    let mut files = Vec::new();
    rust_files(&source, &mut files);

    for path in files {
        if path.starts_with(&adapter) {
            continue;
        }
        let contents = std::fs::read_to_string(&path).expect("Agent source should be readable");
        assert!(
            !contents.contains("sandbox_microsandbox"),
            "Microsandbox implementation leaked into {}",
            path.display()
        );
    }
}

#[test]
fn agentctl_never_opens_sandbox_runtime_operations_directly() {
    let client = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join("bin")
        .join("agentctl");
    let mut files = Vec::new();
    rust_files(&client, &mut files);

    for path in files {
        let contents = std::fs::read_to_string(&path).expect("agentctl source should be readable");
        for direct_runtime_access in [
            "MicrosandboxProvider::open",
            "sandbox::attach_terminal",
            "sandbox::guest_tcp_dialer",
            "sandbox::start_execution",
        ] {
            assert!(
                !contents.contains(direct_runtime_access),
                "direct Sandbox runtime access {direct_runtime_access:?} leaked into {}",
                path.display()
            );
        }
    }
}

#[test]
fn sandbox_operating_system_details_are_contained_by_platform_and_harness_adapters() {
    let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut files = Vec::new();
    rust_files(&source, &mut files);

    for path in files {
        if path.starts_with(source.join("sandbox").join("platform"))
            || path.starts_with(source.join("harness"))
            || path.starts_with(source.join("sandbox").join("microsandbox"))
            || path == source.join("sessions").join("tmux.rs")
        {
            continue;
        }
        let contents = std::fs::read_to_string(&path).expect("Agent source should be readable");
        for platform_detail in ["/home/agent", "/usr/bin/"] {
            assert!(
                !contents.contains(platform_detail),
                "Sandbox-platform detail {platform_detail:?} leaked into {}",
                path.display()
            );
        }
    }
}

#[test]
fn tmux_implementation_details_are_contained_by_its_session_runtime() {
    let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let runtime = source.join("sessions").join("tmux.rs");
    let mut files = Vec::new();
    rust_files(&source, &mut files);

    for path in files {
        if path == runtime {
            continue;
        }
        let contents = std::fs::read_to_string(&path).expect("Agent source should be readable");
        for implementation_detail in ["/usr/bin/tmux", "has-session", "new-session", "attach-session"] {
            assert!(
                !contents.contains(implementation_detail),
                "tmux implementation detail {implementation_detail:?} leaked into {}",
                path.display()
            );
        }
    }
}

#[test]
fn control_plane_core_does_not_reference_concrete_sandbox_or_harness_implementations() {
    let control_plane = Path::new(env!("CARGO_MANIFEST_DIR")).join("src").join("control_plane");
    let mut files = Vec::new();
    rust_files(&control_plane, &mut files);

    for path in files {
        let contents = std::fs::read_to_string(&path).expect("control-plane source should be readable");
        for concrete in ["microsandbox", "claude", "Linux", "AgentPreparation", "AgentBootstrap"] {
            assert!(
                !contents.contains(concrete),
                "concrete runtime detail {concrete:?} leaked into {}",
                path.display()
            );
        }
    }
}

fn rust_files(directory: &Path, files: &mut Vec<PathBuf>) {
    for entry in std::fs::read_dir(directory).expect("Agent source directory should be readable") {
        let path = entry.expect("Agent source entry should be readable").path();
        if path.is_dir() {
            rust_files(&path, files);
        } else if path.extension().is_some_and(|extension| extension == "rs") {
            files.push(path);
        }
    }
}
