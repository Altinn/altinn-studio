#![allow(clippy::expect_used)]

mod support;

use std::{io::Cursor, path::PathBuf, rc::Rc};

use agent::{
    AgentId,
    control_plane::AgentRecord,
    sandbox::{PlatformAdapter as _, platform::Linux},
};
use sandbox::{
    EnsureSandboxRequest, Platform, SandboxPath, SandboxService,
    execution::{ExecutionEvent, ExitStatus, Program},
    memory,
};
use tempfile::TempDir;
use tokio::io::AsyncReadExt as _;

fn is_claude_version(spec: &sandbox::execution::ExecutionSpec) -> bool {
    matches!(
        spec.program(),
        Program::Command { executable, args }
            if executable.as_str() == "/usr/bin/env" && args == &["claude", "--version"]
    )
}

fn is_codex_version(spec: &sandbox::execution::ExecutionSpec) -> bool {
    matches!(
        spec.program(),
        Program::Command { executable, args }
            if executable.as_str() == "/usr/bin/env" && args == &["codex", "--version"]
    )
}

fn is_podman_presence_check(spec: &sandbox::execution::ExecutionSpec) -> bool {
    matches!(
        spec.program(),
        Program::Command { executable, args }
            if executable.as_str() == "/usr/bin/test" && args == &["-x", "/usr/bin/podman"]
    )
}

fn completed(code: i32) -> Vec<ExecutionEvent> {
    vec![
        ExecutionEvent::Started { process_id: None },
        ExecutionEvent::Exited(ExitStatus { code }),
    ]
}

const PODMAN_CONTAINERS_CONF: &[u8] = br#"[containers]
env = [
  "SSL_CERT_FILE=/run/agent/tls/ca-bundle.pem",
  "CURL_CA_BUNDLE=/run/agent/tls/ca-bundle.pem",
  "REQUESTS_CA_BUNDLE=/run/agent/tls/ca-bundle.pem",
  "NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem",
  "GIT_SSL_CAINFO=/run/agent/tls/ca-bundle.pem",
  "NPM_CONFIG_CAFILE=/run/agent/tls/ca-bundle.pem",
]
"#;
const PODMAN_RUNTIME_CONF: &[u8] = b"[engine]\ncgroup_manager = \"cgroupfs\"\ncompat_api_enforce_docker_hub = true\n";
const PODMAN_REGISTRIES_CONF: &[u8] =
    b"unqualified-search-registries = [\"docker.io\"]\nshort-name-mode = \"enforcing\"\n";
const PODMAN_MOUNTS_CONF: &[u8] = br"/etc/ssl/certs/ca-certificates.crt:/run/agent/tls/ca-bundle.pem
/etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt
/etc/ssl/certs/ca-certificates.crt:/etc/pki/tls/certs/ca-bundle.crt
/etc/ssl/certs/ca-certificates.crt:/etc/ssl/cert.pem
";
const PODMAN_SOCKET_DROP_IN: &[u8] = b"[Socket]\nDirectoryMode=0755\nSocketGroup=agent\nSocketMode=0660\n";

async fn read_file(sandbox: &sandbox::SandboxHandle, path: &str) -> Vec<u8> {
    let mut bytes = Vec::new();
    sandbox
        .read_file(&SandboxPath::new(path))
        .await
        .expect("read file")
        .read_to_end(&mut bytes)
        .await
        .expect("read file bytes");
    bytes
}

fn assert_podman_setup_commands(executions: &[sandbox::execution::ExecutionSpec]) {
    let count = |expected: &[&str]| {
        executions
            .iter()
            .filter(|spec| match spec.program() {
                Program::Command { executable, args } => {
                    executable.as_str() == "/usr/bin/sudo"
                        && args.iter().map(String::as_str).eq(expected.iter().copied())
                }
                Program::ImageEntrypoint => false,
            })
            .count()
    };
    assert_eq!(count(&["-n", "/usr/bin/systemctl", "daemon-reload"]), 2);
    assert_eq!(
        count(&["-n", "/usr/bin/systemctl", "enable", "--now", "podman.socket"]),
        2
    );
    assert_eq!(count(&["-n", "/usr/bin/install", "-d", "-m", "0755", "/run/podman"]), 2);
    assert!(!executions.iter().any(|spec| {
        match spec.program() {
            Program::Command { args, .. } => args
                .iter()
                .any(|argument| matches!(argument.as_str(), "agent-containers" | "/dev/net/tun")),
            Program::ImageEntrypoint => false,
        }
    }));
}

#[tokio::test(flavor = "local")]
#[allow(clippy::too_many_lines)]
async fn linux_setup_rewrites_configuration_without_owning_workspace_initialization() {
    let directory = TempDir::new().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(&home).expect("home directory");
    std::fs::write(directory.path().join("instructions.md"), "test instructions").expect("instruction file");
    let agent_id: AgentId = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let mut resource = support::agent("worker");
    resource.metadata.generation = 1;
    resource.spec.home.source = home;
    resource.spec.harnesses[0].default = true;
    resource.spec.harnesses.push(agent::HarnessSpec {
        kind: agent::Harness::Codex,
        version: Some("0.149.1".into()),
        auth: agent::HarnessAuthMode::Mediated,
        default: false,
    });
    let record = AgentRecord {
        id: agent_id,
        source_directory: directory.path().to_path_buf(),
        agent: resource,
    };

    let backend = Rc::new(memory::Provider::new());
    for _ in 0..2 {
        backend.queue_execution_events_matching(
            is_claude_version,
            vec![
                ExecutionEvent::Started { process_id: None },
                ExecutionEvent::Stdout("2.1.239 (Claude Code)\n".into()),
                ExecutionEvent::Exited(ExitStatus { code: 0 }),
            ],
        );
        backend.queue_execution_events_matching(
            is_codex_version,
            vec![
                ExecutionEvent::Started { process_id: None },
                ExecutionEvent::Stdout("codex-cli 0.149.1\n".into()),
                ExecutionEvent::Exited(ExitStatus { code: 0 }),
            ],
        );
        backend.queue_execution_events_matching(is_podman_presence_check, completed(1));
    }
    let service = SandboxService::new(backend.clone());
    let spec = record
        .agent
        .spec
        .sandbox
        .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
    let sandbox = service
        .ensure(&EnsureSandboxRequest::new(
            record.sandbox_name().expect("Sandbox name"),
            spec,
        ))
        .await
        .expect("Sandbox");
    let platform = Linux;

    platform.setup(&record, &sandbox).await.expect("first setup");
    let mutable_state = br#"{"theme":"light","projects":{"/home/agent/code/example":{"hasTrustDialogAccepted":true}}}"#;
    sandbox
        .write_file(
            &SandboxPath::new("/home/agent/.claude/.claude.json"),
            Box::pin(Cursor::new(mutable_state.to_vec())),
        )
        .await
        .expect("write harness-owned state");
    platform.setup(&record, &sandbox).await.expect("second setup");

    let preserved = read_file(&sandbox, "/home/agent/.claude/.claude.json").await;
    assert_eq!(preserved, mutable_state);
    let instructions = read_file(&sandbox, "/home/agent/.claude/CLAUDE.md").await;
    assert_eq!(instructions, b"test instructions");
    let codex_instructions = read_file(&sandbox, "/home/agent/.codex/AGENTS.md").await;
    assert_eq!(codex_instructions, b"test instructions");
    let codex_auth: serde_json::Value =
        serde_json::from_slice(&read_file(&sandbox, "/home/agent/.codex/auth.json").await).expect("Codex auth JSON");
    assert_eq!(codex_auth["auth_mode"], "chatgpt");
    assert_eq!(
        codex_auth["tokens"]["account_id"],
        "agent-mediated-codex-account-placeholder"
    );
    assert_eq!(codex_auth["tokens"]["access_token"], codex_auth["tokens"]["id_token"]);
    assert!(codex_auth["last_refresh"].is_string());
    let codex_hooks: serde_json::Value =
        serde_json::from_slice(&read_file(&sandbox, "/home/agent/.codex/hooks.json").await).expect("Codex hooks JSON");
    assert_eq!(
        codex_hooks["hooks"]["SessionStart"][0]["hooks"][0]["command"],
        "node /home/agent/.codex/hooks/session-start.mjs"
    );
    assert!(codex_hooks["hooks"]["SessionStart"][0].get("matcher").is_none());

    let executions = backend.execution_specs();
    let commands = executions
        .iter()
        .filter_map(|spec| match spec.program() {
            Program::Command { executable, args } => Some((executable.as_str(), args.as_slice())),
            Program::ImageEntrypoint => None,
        })
        .collect::<Vec<_>>();
    assert_eq!(
        commands
            .iter()
            .filter(|(executable, _)| *executable == "/usr/bin/env")
            .count(),
        4
    );
    assert_eq!(
        commands
            .iter()
            .filter(|(executable, _)| *executable == "/usr/bin/tar")
            .count(),
        2
    );
    assert_eq!(
        commands
            .iter()
            .filter(|(executable, args)| {
                *executable == "/usr/bin/install" && args == &["-d", "-m", "0755", "/home/agent/code"]
            })
            .count(),
        2
    );
    assert!(!commands.iter().any(|(executable, _)| *executable == "/usr/bin/git"));
    assert!(
        !commands.iter().any(|(executable, args)| {
            *executable == "/usr/bin/sudo" && args.iter().any(|arg| arg == "podman.socket")
        })
    );
    assert!(!commands.iter().any(|(executable, args)| {
        *executable == "/usr/bin/touch" || (*executable == "/usr/bin/sudo" && args.iter().any(|arg| arg == "-R"))
    }));
}

#[tokio::test(flavor = "local")]
async fn linux_setup_convergently_configures_podman_container_trust() {
    let directory = TempDir::new().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(&home).expect("home directory");
    std::fs::write(directory.path().join("instructions.md"), "test instructions").expect("instruction file");
    let agent_id: AgentId = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let mut resource = support::agent("worker");
    resource.metadata.generation = 1;
    resource.spec.home.source = home;
    let record = AgentRecord {
        id: agent_id,
        source_directory: directory.path().to_path_buf(),
        agent: resource,
    };
    let backend = Rc::new(memory::Provider::new());
    for _ in 0..2 {
        backend.queue_execution_events_matching(
            is_claude_version,
            vec![
                ExecutionEvent::Started { process_id: None },
                ExecutionEvent::Stdout("2.1.239 (Claude Code)\n".into()),
                ExecutionEvent::Exited(ExitStatus { code: 0 }),
            ],
        );
        backend.queue_execution_events_matching(is_podman_presence_check, completed(0));
    }
    let service = SandboxService::new(backend.clone());
    let spec = record
        .agent
        .spec
        .sandbox
        .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
    let sandbox = service
        .ensure(&EnsureSandboxRequest::new(
            record.sandbox_name().expect("Sandbox name"),
            spec,
        ))
        .await
        .expect("Sandbox");

    Linux.setup(&record, &sandbox).await.expect("first setup");
    sandbox
        .write_file(
            &SandboxPath::new("/etc/containers/containers.conf.d/50-agent-ca.conf"),
            Box::pin(Cursor::new(b"stale\n".to_vec())),
        )
        .await
        .expect("replace managed configuration");
    Linux.setup(&record, &sandbox).await.expect("second setup");

    assert_eq!(
        read_file(&sandbox, "/etc/containers/containers.conf.d/50-agent-ca.conf").await,
        PODMAN_CONTAINERS_CONF
    );
    assert_eq!(
        read_file(&sandbox, "/etc/containers/containers.conf.d/51-agent-runtime.conf").await,
        PODMAN_RUNTIME_CONF
    );
    assert_eq!(
        read_file(&sandbox, "/etc/containers/mounts.conf").await,
        PODMAN_MOUNTS_CONF
    );
    assert_eq!(
        read_file(&sandbox, "/etc/containers/registries.conf.d/50-agent-docker-hub.conf").await,
        PODMAN_REGISTRIES_CONF
    );
    assert_eq!(
        read_file(&sandbox, "/etc/systemd/system/podman.socket.d/50-agent-access.conf").await,
        PODMAN_SOCKET_DROP_IN
    );

    assert_podman_setup_commands(&backend.execution_specs());
}

#[tokio::test(flavor = "local")]
async fn linux_setup_accepts_any_installed_version_when_none_is_declared() {
    let directory = TempDir::new().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(&home).expect("home directory");
    std::fs::write(directory.path().join("instructions.md"), "test instructions").expect("instruction file");
    let agent_id: AgentId = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let mut resource = support::agent("worker");
    resource.metadata.generation = 1;
    resource.spec.home.source = home;
    resource.spec.harnesses[0].version = None;
    let record = AgentRecord {
        id: agent_id,
        source_directory: PathBuf::from(directory.path()),
        agent: resource,
    };
    let backend = Rc::new(memory::Provider::new());
    backend.queue_execution_events_matching(
        is_claude_version,
        vec![
            ExecutionEvent::Started { process_id: None },
            ExecutionEvent::Stdout("2.1.258 (Claude Code)\n".into()),
            ExecutionEvent::Exited(ExitStatus { code: 0 }),
        ],
    );
    backend.queue_execution_events_matching(is_podman_presence_check, completed(1));
    let service = SandboxService::new(backend.clone());
    let spec = record
        .agent
        .spec
        .sandbox
        .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
    let sandbox = service
        .ensure(&EnsureSandboxRequest::new(
            record.sandbox_name().expect("Sandbox name"),
            spec,
        ))
        .await
        .expect("Sandbox");

    Linux
        .setup(&record, &sandbox)
        .await
        .expect("setup without a declared version");

    assert_eq!(
        backend
            .execution_specs()
            .iter()
            .filter(|spec| is_claude_version(spec))
            .count(),
        1,
        "the installation is still checked for presence"
    );
}

#[tokio::test(flavor = "local")]
async fn linux_setup_rejects_a_declared_harness_version_mismatch_before_injection() {
    let directory = TempDir::new().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(&home).expect("home directory");
    let agent_id: AgentId = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let mut resource = support::agent("worker");
    resource.metadata.generation = 1;
    resource.spec.home.source = home;
    let record = AgentRecord {
        id: agent_id,
        source_directory: PathBuf::from(directory.path()),
        agent: resource,
    };
    let backend = Rc::new(memory::Provider::new());
    backend.queue_execution_events_matching(
        is_claude_version,
        vec![
            ExecutionEvent::Started { process_id: None },
            ExecutionEvent::Stdout("2.1.240 (Claude Code)\n".into()),
            ExecutionEvent::Exited(ExitStatus { code: 0 }),
        ],
    );
    let service = SandboxService::new(backend.clone());
    let spec = record
        .agent
        .spec
        .sandbox
        .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
    let sandbox = service
        .ensure(&EnsureSandboxRequest::new(
            record.sandbox_name().expect("Sandbox name"),
            spec,
        ))
        .await
        .expect("Sandbox");

    let error = Linux.setup(&record, &sandbox).await.expect_err("version mismatch");

    assert!(error.to_string().contains("does not match installed version"));
    assert_eq!(
        backend.execution_specs().len(),
        1,
        "verification must happen before injection"
    );
}
