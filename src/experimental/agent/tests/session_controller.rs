#![allow(clippy::expect_used)]

mod support;

use std::{cell::Cell, path::PathBuf, rc::Rc, time::Duration};

use agent::{
    AgentId, Condition, ConditionStatus, Error, Status,
    control_plane::{AgentRecord, AgentStore as _},
    persistence,
    sandbox::{Assignment as SandboxAssignment, PlatformAdapter, Provider, ProviderEnsureOutcome, ProviderId},
    sessions::{Reconcile, SessionId, SessionName, SessionStore as _},
};
use sandbox::{
    EnsureSandboxRequest, LocalFuture, Platform, SandboxHandle, SandboxService,
    execution::{ExecutionEvent, ExitStatus, Program},
    memory as sandbox_memory,
    network::{NetworkEndpointSelection, PacketMedium},
};
use tempfile::TempDir;
use tokio::sync::Notify;

struct BlockingReconcile {
    slow: SessionId,
    slow_calls: Rc<Cell<usize>>,
    active_slow: Rc<Cell<usize>>,
    started: Rc<Notify>,
    release: Rc<Notify>,
}

fn is_session_observation(spec: &sandbox::execution::ExecutionSpec) -> bool {
    matches!(
        spec.program(),
        Program::Command { executable, args }
            if executable.as_str() == "/bin/sh"
                && args.iter().any(|argument| argument.contains("session_activity"))
    )
}

struct BlockingAgentReady {
    database: persistence::Database,
    started: Rc<Notify>,
    release: Rc<Notify>,
}

impl Reconcile<AgentId> for BlockingAgentReady {
    fn reconcile(&self, id: AgentId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.started.notify_one();
            self.release.notified().await;
            let record = self.database.get(id).await?;
            self.database
                .update_status(
                    id,
                    record.agent.metadata.generation,
                    Status {
                        observed_generation: record.agent.metadata.generation,
                        sandbox: Some(SandboxAssignment::Materialized {
                            provider: ProviderId::new("memory")?,
                            id: "3f978c33-4d43-4ea4-b58d-10b90ef166af"
                                .parse()
                                .map_err(|error| Error::Database(format!("test Sandbox ID: {error}")))?,
                        }),
                        conditions: vec![Condition {
                            kind: "Ready".into(),
                            status: ConditionStatus::True,
                            reason: "SandboxReady".into(),
                            message: String::new(),
                        }],
                    },
                )
                .await
        })
    }
}

struct MarkSessionReady(persistence::Database);

struct NoopAgentReconcile;

impl Reconcile<AgentId> for NoopAgentReconcile {
    fn reconcile(&self, _id: AgentId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async { Ok(()) })
    }
}

impl Reconcile<SessionId> for MarkSessionReady {
    fn reconcile(&self, id: SessionId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.0
                .update_session_status(
                    id,
                    agent::sessions::Status {
                        state: agent::sessions::State::Running,
                        failure: None,
                        harness_session_id: None,
                    },
                    0,
                )
                .await
        })
    }
}

struct NoopPlatform;

impl PlatformAdapter for NoopPlatform {
    fn supports(&self, platform: &Platform) -> bool {
        platform.os == "linux"
    }

    fn setup<'a>(
        &'a self,
        _record: &'a AgentRecord,
        _sandbox: &'a SandboxHandle,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async { Ok(()) })
    }
}

struct CountingProvider {
    id: ProviderId,
    service: SandboxService,
    ensure_calls: Rc<Cell<usize>>,
}

impl Provider for CountingProvider {
    fn id(&self) -> &ProviderId {
        &self.id
    }

    fn supports<'a>(&'a self, _record: &'a AgentRecord) -> LocalFuture<'a, Result<bool, Error>> {
        Box::pin(async { Ok(true) })
    }

    fn ensure<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
        Box::pin(async move {
            self.ensure_calls.set(self.ensure_calls.get() + 1);
            let spec = record
                .agent
                .spec
                .sandbox
                .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
            let sandbox = self
                .service
                .ensure(&EnsureSandboxRequest::new(record.sandbox_name()?, spec))
                .await
                .map_err(Error::from)?;
            Ok(ProviderEnsureOutcome {
                sandbox,
                runtime_restarted: false,
            })
        })
    }

    fn open<'a>(
        &'a self,
        record: &'a AgentRecord,
        id: &'a sandbox::SandboxId,
    ) -> LocalFuture<'a, Result<SandboxHandle, Error>> {
        Box::pin(async move {
            self.service
                .open(id, record.agent.spec.sandbox.resolved_retention_policy())
                .await
                .map_err(Error::from)
        })
    }

    fn release<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.service
                .release(
                    &record.sandbox_name()?,
                    record.agent.spec.sandbox.resolved_retention_policy(),
                )
                .await
                .map_err(Error::from)
        })
    }
}

impl Reconcile<SessionId> for BlockingReconcile {
    fn reconcile(&self, id: SessionId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            if id == self.slow {
                assert_eq!(self.active_slow.replace(self.active_slow.get() + 1), 0);
                let call = self.slow_calls.get() + 1;
                self.slow_calls.set(call);
                if call == 1 {
                    self.started.notify_one();
                    self.release.notified().await;
                }
                self.active_slow.set(0);
            }
            Ok(())
        })
    }
}

fn ready_record(name: &str, id: AgentId) -> AgentRecord {
    let mut resource = support::agent(name);
    resource.metadata.generation = 1;
    resource.status = Status {
        observed_generation: 1,
        sandbox: Some(SandboxAssignment::Materialized {
            provider: ProviderId::new("memory").expect("Provider ID"),
            id: "3f978c33-4d43-4ea4-b58d-10b90ef166af".parse().expect("Sandbox ID"),
        }),
        conditions: vec![Condition {
            kind: "Ready".into(),
            status: ConditionStatus::True,
            reason: "SandboxReady".into(),
            message: String::new(),
        }],
    };
    AgentRecord {
        id,
        source_directory: PathBuf::from("/source"),
        agent: resource,
    }
}

#[tokio::test(flavor = "local")]
async fn session_ensure_resolves_explicit_and_implicit_harnesses() {
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let agent_id = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let mut record = ready_record("worker", agent_id);
    record.agent.spec.harnesses[0].default = true;
    record.agent.spec.harnesses.push(agent::HarnessSpec {
        kind: agent::Harness::Codex,
        version: Some("0.149.1".into()),
        auth: agent::HarnessAuthMode::Mediated,
        default: false,
    });
    database.put(record, 0).await.expect("Agent");
    let agent_store: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
    let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let (agent_controller, agent_wakeup) = agent::control_plane::Controller::new(
        agent_store.clone(),
        Rc::new(NoopAgentReconcile),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Agent reconciliation error: {error}")),
    );
    let (session_controller, session_wakeup) = agent::sessions::Controller::new(
        session_store.clone(),
        Rc::new(MarkSessionReady(database)),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Session reconciliation error: {error}")),
    );
    let agent_task = tokio::task::spawn_local(agent_controller.run());
    let session_task = tokio::task::spawn_local(session_controller.run());
    let service = agent::sessions::Service::new(session_store, agent_store, agent_wakeup, session_wakeup);

    let explicit = service
        .ensure(
            "worker",
            &SessionName::new("explicit").expect("name"),
            Some(agent::Harness::Codex),
        )
        .await
        .expect("explicit harness Session");
    let implicit = service
        .ensure("worker", &SessionName::new("implicit").expect("name"), None)
        .await
        .expect("implicit default Session");

    assert_eq!(explicit.session.harness, agent::Harness::Codex);
    assert_eq!(implicit.session.harness, agent::Harness::ClaudeCode);

    let conflict = service
        .ensure(
            "worker",
            &SessionName::new("explicit").expect("name"),
            Some(agent::Harness::ClaudeCode),
        )
        .await
        .expect_err("an existing Session keeps its harness");
    assert!(conflict.to_string().contains("already uses harness \"codex\""));
    agent_task.abort();
    session_task.abort();
}

#[tokio::test(flavor = "local")]
async fn session_reconciliation_never_ensures_the_agent_sandbox() {
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let agent_id = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider_service =
        SandboxService::new(backend).with_network_backend(Rc::new(sandbox_memory::NetworkBackend::for_endpoint(
            "memory",
            NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
        )));
    let mut record = ready_record("worker", agent_id);
    let spec = record
        .agent
        .spec
        .sandbox
        .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
    let sandbox = provider_service
        .ensure(&EnsureSandboxRequest::new(
            record.sandbox_name().expect("Sandbox name"),
            spec,
        ))
        .await
        .expect("materialized Sandbox");
    record.agent.status.sandbox = Some(SandboxAssignment::Materialized {
        provider: ProviderId::new("memory").expect("Provider ID"),
        id: sandbox.id().clone(),
    });
    database.put(record, 0).await.expect("Agent");
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("s1").expect("name"),
            agent::Harness::ClaudeCode,
        )
        .await
        .expect("Session");

    let ensure_calls = Rc::new(Cell::new(0));
    let provider: Rc<dyn Provider> = Rc::new(CountingProvider {
        id: ProviderId::new("memory").expect("Provider ID"),
        service: provider_service,
        ensure_calls: ensure_calls.clone(),
    });
    let sandboxes = Rc::new(
        agent::sandbox::Service::new([provider], [Rc::new(NoopPlatform) as Rc<dyn PlatformAdapter>])
            .expect("Agent Sandbox service"),
    );
    let sessions: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let agents: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database);
    let reconciler = agent::sessions::Reconciler::new(sessions, agents, sandboxes, "http://platform-api".into());

    let _result = reconciler.reconcile(session.id).await;

    assert_eq!(
        ensure_calls.get(),
        0,
        "Session reconciliation must not own Sandbox ensure effects"
    );
}

#[tokio::test(flavor = "local")]
#[allow(clippy::too_many_lines)]
async fn idle_stop_uses_guest_activity_age_and_explicit_activation_relaunches() {
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let agent_id = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider_service = SandboxService::new(backend.clone()).with_network_backend(Rc::new(
        sandbox_memory::NetworkBackend::for_endpoint(
            "memory",
            NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
        ),
    ));
    let mut record = ready_record("worker", agent_id);
    let spec = record
        .agent
        .spec
        .sandbox
        .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
    let sandbox = provider_service
        .ensure(&EnsureSandboxRequest::new(
            record.sandbox_name().expect("Sandbox name"),
            spec,
        ))
        .await
        .expect("materialized Sandbox");
    record.agent.status.sandbox = Some(SandboxAssignment::Materialized {
        provider: ProviderId::new("memory").expect("Provider ID"),
        id: sandbox.id().clone(),
    });
    database.put(record, 0).await.expect("Agent");
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("idle").expect("name"),
            agent::Harness::ClaudeCode,
        )
        .await
        .expect("Session");
    let activation = database.activate_session(session.id).await.expect("activate Session");
    database
        .update_session_status(
            session.id,
            agent::sessions::Status {
                state: agent::sessions::State::Running,
                failure: None,
                harness_session_id: None,
            },
            activation,
        )
        .await
        .expect("running status");
    database
        .record_session_launch(
            session.id,
            agent::sessions::LaunchRecord {
                token: "dddddddd-dddd-4ddd-8ddd-dddddddddddd".parse().expect("launch token"),
                sandbox: sandbox.id().to_string(),
                launched_at: time::OffsetDateTime::now_utc().unix_timestamp(),
                attempts: 4,
            },
        )
        .await
        .expect("launch bookkeeping");

    backend.queue_execution_events_matching(
        is_session_observation,
        vec![
            ExecutionEvent::Started { process_id: None },
            ExecutionEvent::Stdout("0 300\n".into()),
            ExecutionEvent::Exited(ExitStatus { code: 0 }),
        ],
    );
    let provider: Rc<dyn Provider> = Rc::new(CountingProvider {
        id: ProviderId::new("memory").expect("Provider ID"),
        service: provider_service,
        ensure_calls: Rc::new(Cell::new(0)),
    });
    let sandboxes = Rc::new(
        agent::sandbox::Service::new([provider], [Rc::new(NoopPlatform) as Rc<dyn PlatformAdapter>])
            .expect("Agent Sandbox service"),
    );
    let sessions: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let agents: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
    let reconciler = agent::sessions::Reconciler::new(sessions, agents, sandboxes, "http://platform-api".into());

    reconciler.reconcile(session.id).await.expect("idle reconciliation");
    let idle = database.get_session(session.id).await.expect("Idle Session");
    assert_eq!(idle.status.state, agent::sessions::State::Idle);
    assert_eq!(
        database
            .session_launch_state(session.id)
            .await
            .expect("launch state")
            .expect("recorded launch")
            .attempts,
        0,
        "an idle stop must not contribute to crash backoff"
    );
    let after_idle = backend.execution_specs().len();
    reconciler
        .reconcile(session.id)
        .await
        .expect("stable Idle reconciliation");
    assert_eq!(
        backend.execution_specs().len(),
        after_idle,
        "periodic passes must leave Idle Sessions stopped"
    );

    database
        .activate_session(session.id)
        .await
        .expect("explicit reactivation");
    backend.queue_execution_events_matching(
        is_session_observation,
        vec![
            ExecutionEvent::Started { process_id: None },
            ExecutionEvent::Exited(ExitStatus { code: 10 }),
        ],
    );
    reconciler
        .reconcile(session.id)
        .await
        .expect("reactivation reconciliation");
    assert_eq!(
        database
            .get_session(session.id)
            .await
            .expect("running Session")
            .status
            .state,
        agent::sessions::State::Running
    );

    let commands = backend.execution_specs();
    assert!(commands.iter().any(|spec| matches!(
        spec.program(),
        Program::Command { executable, args }
            if executable.as_str() == "/bin/sh"
                && args.iter().any(|argument| {
                    argument.contains("/usr/bin/tmux list-sessions")
                        && argument.contains("/usr/bin/date +%s")
                })
    )));
    assert!(commands.iter().any(|spec| matches!(
        spec.program(),
        Program::Command { executable, args }
            if executable.as_str() == "/usr/bin/tmux"
                && args.first().is_some_and(|argument| argument == "kill-session")
    )));
    assert!(commands.iter().any(|spec| {
        matches!(
            spec.program(),
            Program::Command { executable, args }
                if executable.as_str() == "/usr/bin/tmux"
                    && args.first().is_some_and(|argument| argument == "new-session")
        ) && spec
            .working_directory()
            .is_some_and(|path| path.as_str() == "/home/agent/code")
            && spec.environment().get("LANG").map(String::as_str) == Some("C.UTF-8")
            && matches!(spec.program(), Program::Command { args, .. }
                if args.iter().any(|argument| argument == "CONTAINER_HOST=unix:///run/podman/podman.sock"))
    }));
}

#[tokio::test(flavor = "local")]
async fn session_ensure_persists_intent_before_waiting_for_agent_convergence() {
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let agent_store: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
    let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let started = Rc::new(Notify::new());
    let release = Rc::new(Notify::new());
    let agent_reconciler: Rc<dyn Reconcile<AgentId>> = Rc::new(BlockingAgentReady {
        database: database.clone(),
        started: started.clone(),
        release: release.clone(),
    });
    let session_reconciler: Rc<dyn Reconcile<SessionId>> = Rc::new(MarkSessionReady(database.clone()));
    let (agent_controller, agent_wakeup) = agent::control_plane::Controller::new(
        agent_store.clone(),
        agent_reconciler,
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Agent reconciliation error: {error}")),
    );
    let (session_controller, session_wakeup) = agent::sessions::Controller::new(
        session_store.clone(),
        session_reconciler,
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Session reconciliation error: {error}")),
    );
    let agent_task = tokio::task::spawn_local(agent_controller.run());
    let session_task = tokio::task::spawn_local(session_controller.run());
    tokio::time::sleep(Duration::from_millis(20)).await;

    let agent_id = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    let mut resource = support::agent("worker");
    resource.metadata.generation = 1;
    database
        .put(
            AgentRecord {
                id: agent_id,
                source_directory: PathBuf::from("/source"),
                agent: resource,
            },
            0,
        )
        .await
        .expect("Agent");
    let service = Rc::new(agent::sessions::Service::new(
        session_store,
        agent_store,
        agent_wakeup,
        session_wakeup,
    ));
    let ensure_service = service.clone();
    let ensure = tokio::task::spawn_local(async move {
        ensure_service
            .ensure("worker", &SessionName::new("s1").expect("name"), None)
            .await
    });

    started.notified().await;
    let sessions = database.list_agent_sessions("worker").await.expect("Sessions");
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].name.as_str(), "s1");
    assert_eq!(sessions[0].status.state, agent::sessions::State::Starting);
    release.notify_one();
    let target = ensure.await.expect("ensure task").expect("ready Session");

    assert_eq!(target.session.name.as_str(), "s1");
    assert_eq!(target.session.status.state, agent::sessions::State::Running);
    agent_task.abort();
    session_task.abort();
}

#[tokio::test(flavor = "local")]
async fn controller_is_concurrent_across_sessions_and_serial_per_session() {
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let agent_id = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    database.put(ready_record("worker", agent_id), 0).await.expect("Agent");

    let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let slow = database
        .ensure_session(
            "worker",
            &SessionName::new("slow").expect("name"),
            agent::Harness::ClaudeCode,
        )
        .await
        .expect("slow Session");
    let slow_calls = Rc::new(Cell::new(0));
    let started = Rc::new(Notify::new());
    let release = Rc::new(Notify::new());
    let reconciler: Rc<dyn Reconcile<SessionId>> = Rc::new(BlockingReconcile {
        slow: slow.id,
        slow_calls: slow_calls.clone(),
        active_slow: Rc::new(Cell::new(0)),
        started: started.clone(),
        release: release.clone(),
    });
    let (controller, wakeup) = agent::sessions::Controller::new(
        session_store,
        reconciler,
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected reconciliation error: {error}")),
    );
    let controller_task = tokio::task::spawn_local(controller.run());

    // The startup scan performs the first slow pass and blocks it.
    started.notified().await;
    let first_wakeup = wakeup.clone();
    let first = tokio::task::spawn_local(async move { first_wakeup.reconcile(slow.id).await });
    let rerun_wakeup = wakeup.clone();
    let rerun = tokio::task::spawn_local(async move { rerun_wakeup.reconcile(slow.id).await });

    let fast = database
        .ensure_session(
            "worker",
            &SessionName::new("fast").expect("name"),
            agent::Harness::ClaudeCode,
        )
        .await
        .expect("fast Session");
    tokio::time::timeout(Duration::from_secs(1), wakeup.reconcile(fast.id))
        .await
        .expect("fast Session should not wait for slow Session")
        .expect("fast reconciliation");

    release.notify_one();
    first.await.expect("first task").expect("first reconciliation");
    rerun.await.expect("rerun task").expect("rerun reconciliation");
    assert_eq!(slow_calls.get(), 2);
    controller_task.abort();
}
