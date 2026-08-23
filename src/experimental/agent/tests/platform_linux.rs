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

#[tokio::test(flavor = "local")]
async fn linux_setup_rewrites_configuration_without_owning_workspace_initialization() {
    let directory = TempDir::new().expect("temporary directory");
    let home = directory.path().join("home");
    std::fs::create_dir_all(&home).expect("home directory");
    std::fs::write(home.join("AGENTS.md"), "test instructions").expect("home file");
    let agent_id: AgentId = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let mut resource = support::agent("worker");
    resource.metadata.generation = 1;
    resource.spec.home.source = home;
    resource.spec.sandbox.init_system = sandbox::init::InitSystem::Image;
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

    let mut preserved = Vec::new();
    sandbox
        .read_file(&SandboxPath::new("/home/agent/.claude/.claude.json"))
        .await
        .expect("read harness-owned state")
        .read_to_end(&mut preserved)
        .await
        .expect("read state bytes");
    assert_eq!(preserved, mutable_state);

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
        2
    );
    assert_eq!(
        commands
            .iter()
            .filter(|(executable, args)| { *executable == "/usr/local/libexec/agent-image-ready" && args.is_empty() })
            .count(),
        2
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
    assert!(!commands.iter().any(|(executable, args)| {
        *executable == "/usr/bin/touch" || (*executable == "/usr/bin/sudo" && args.iter().any(|arg| arg == "-R"))
    }));
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
