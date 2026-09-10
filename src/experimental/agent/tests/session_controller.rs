#![allow(clippy::expect_used, clippy::panic)]

mod support;

use std::{
    cell::{Cell, RefCell},
    path::PathBuf,
    rc::Rc,
    time::Duration,
};

use agent::{
    AgentId, Condition, ConditionStatus, Error, Status,
    control_plane::{AgentRecord, AgentStore as _, Convergence, Observers, WaitPolicy},
    persistence,
    sandbox::{Assignment as SandboxAssignment, PlatformAdapter, Provider, ProviderEnsureOutcome, ProviderId},
    sessions::{Reconcile, SessionId, SessionName, SessionReports as _, SessionStore as _},
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
                    Status::observed(
                        record.agent.metadata.generation,
                        Some(SandboxAssignment::Materialized {
                            provider: ProviderId::new("memory")?,
                            id: "3f978c33-4d43-4ea4-b58d-10b90ef166af"
                                .parse()
                                .map_err(|error| Error::Database(format!("test Sandbox ID: {error}")))?,
                        }),
                        vec![Condition {
                            kind: "Ready".into(),
                            status: ConditionStatus::True,
                            reason: "SandboxReady".into(),
                            message: String::new(),
                        }],
                    ),
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
                .update_session_lifecycle(id, agent::sessions::Lifecycle::running(), 0)
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

    fn ensure<'a>(
        &'a self,
        record: &'a AgentRecord,
        _progress: agent::progress::SandboxReporter,
    ) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
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
    resource.status = Status::observed(
        1,
        Some(SandboxAssignment::Materialized {
            provider: ProviderId::new("memory").expect("Provider ID"),
            id: "3f978c33-4d43-4ea4-b58d-10b90ef166af".parse().expect("Sandbox ID"),
        }),
        vec![Condition {
            kind: "Ready".into(),
            status: ConditionStatus::True,
            reason: "SandboxReady".into(),
            message: String::new(),
        }],
    );
    AgentRecord {
        id,
        source_directory: PathBuf::from("/source"),
        manifest_path: None,
        env_file: None,
        agent: resource,
    }
}

/// A throwaway Sandbox service and tmux runtime for Session Service tests that
/// never reach the runtime (they resolve with `WaitPolicy::FirstPass`).
fn unused_sandboxes() -> Rc<agent::sandbox::Service> {
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(CountingProvider {
        id: ProviderId::new("memory").expect("Provider ID"),
        service: SandboxService::new(backend),
        ensure_calls: Rc::new(Cell::new(0)),
    });
    Rc::new(
        agent::sandbox::Service::new([provider], [Rc::new(NoopPlatform) as Rc<dyn PlatformAdapter>])
            .expect("Agent Sandbox service"),
    )
}

fn tmux_runtime() -> Rc<dyn agent::sessions::SessionRuntime> {
    Rc::new(agent::sessions::Tmux)
}

/// A scripted Session runtime: records deliveries and launches, serves a
/// conversation the test appends to.
struct FakeRuntime {
    /// Whether the harness process is present; a launch is expected when it is not.
    present: Cell<bool>,
    fail_start: Cell<bool>,
    delivery_delay: Cell<Duration>,
    fail_transcript: Cell<bool>,
    delivered: Notify,
    hold_completion: Cell<bool>,
    release_completion: Notify,
    ready_without_report: Cell<bool>,
    conversation: RefCell<Vec<agent::sessions::Turn>>,
    sent: RefCell<Vec<String>>,
    launches: RefCell<Vec<(Option<String>, Option<String>)>>,
}

impl Default for FakeRuntime {
    fn default() -> Self {
        Self {
            present: Cell::new(true),
            fail_start: Cell::new(false),
            delivery_delay: Cell::new(Duration::ZERO),
            fail_transcript: Cell::new(false),
            delivered: Notify::new(),
            hold_completion: Cell::new(false),
            release_completion: Notify::new(),
            ready_without_report: Cell::new(false),
            conversation: RefCell::default(),
            sent: RefCell::default(),
            launches: RefCell::default(),
        }
    }
}

fn user_turn(text: &str) -> agent::sessions::Turn {
    agent::sessions::Turn {
        messages: vec![agent::sessions::Message {
            role: agent::sessions::Role::User,
            parts: vec![agent::sessions::Part::Text { text: text.into() }],
        }],
    }
}

fn assistant_text(text: &str) -> agent::sessions::Message {
    agent::sessions::Message {
        role: agent::sessions::Role::Assistant,
        parts: vec![agent::sessions::Part::Text { text: text.into() }],
    }
}

impl agent::sessions::SessionRuntime for FakeRuntime {
    fn observe<'a>(
        &'a self,
        _session: &'a agent::sessions::Session,
        _sandbox: &'a SandboxHandle,
    ) -> LocalFuture<'a, Result<agent::sessions::Observation, Error>> {
        let observation = if self.present.get() {
            agent::sessions::Observation::Alive {
                attached: false,
                idle_seconds: 0,
            }
        } else {
            agent::sessions::Observation::Missing
        };
        Box::pin(async move { Ok(observation) })
    }

    fn start<'a>(
        &'a self,
        _session: &'a agent::sessions::Session,
        _sandbox: &'a SandboxHandle,
        _session_hook_url: &'a str,
        _token: &'a agent::sessions::LaunchToken,
        resume: Option<&'a str>,
        initial_prompt: Option<&'a str>,
    ) -> LocalFuture<'a, Result<(), Error>> {
        self.launches
            .borrow_mut()
            .push((resume.map(str::to_owned), initial_prompt.map(str::to_owned)));
        let fail = self.fail_start.get();
        self.present.set(!fail);
        Box::pin(async move {
            if fail {
                Err(Error::Session("injected uncertain launch".into()))
            } else {
                Ok(())
            }
        })
    }

    fn stop<'a>(
        &'a self,
        _session: &'a agent::sessions::Session,
        _sandbox: &'a SandboxHandle,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async { Ok(()) })
    }

    fn input_ready<'a>(
        &'a self,
        _session: &'a agent::sessions::Session,
        _sandbox: &'a SandboxHandle,
    ) -> LocalFuture<'a, Result<bool, Error>> {
        Box::pin(async { Ok(self.ready_without_report.get()) })
    }

    fn prompt<'a>(
        &'a self,
        _session: &'a agent::sessions::Session,
        _sandbox: &'a SandboxHandle,
        prompt: &'a str,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            tokio::time::sleep(self.delivery_delay.get()).await;
            self.sent.borrow_mut().push(prompt.to_owned());
            self.conversation.borrow_mut().push(user_turn(prompt));
            self.delivered.notify_one();
            if self.hold_completion.get() {
                self.release_completion.notified().await;
            }
            Ok(())
        })
    }

    fn turns<'a>(
        &'a self,
        _session: &'a agent::sessions::Session,
        _sandbox: &'a SandboxHandle,
    ) -> LocalFuture<'a, Result<Vec<agent::sessions::Turn>, Error>> {
        let turns = self.conversation.borrow().clone();
        Box::pin(async move {
            if self.fail_transcript.get() {
                return Err(Error::Session("transcript unavailable".into()));
            }
            Ok(turns)
        })
    }

    fn attach<'a>(
        &'a self,
        _home: &'a std::path::Path,
        _target: &'a agent::sessions::AttachTarget,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async { Err(Error::Invalid("no terminal in tests".into())) })
    }
}

/// A database, a materialized memory Sandbox for Agent `worker`, and one
/// Running Session `s1` launched with `token`; with `started`, its harness has
/// already reported its start (native ID and conversation location).
async fn running_session(
    directory: &TempDir,
    token: &str,
    started: bool,
) -> (
    persistence::Database,
    Rc<agent::sandbox::Service>,
    agent::sessions::Session,
) {
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
    let provider: Rc<dyn Provider> = Rc::new(CountingProvider {
        id: ProviderId::new("memory").expect("Provider ID"),
        service: provider_service,
        ensure_calls: Rc::new(Cell::new(0)),
    });
    let sandboxes = Rc::new(
        agent::sandbox::Service::new([provider], [Rc::new(NoopPlatform) as Rc<dyn PlatformAdapter>])
            .expect("Agent Sandbox service"),
    );
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("s1").expect("name"),
            agent::Harness::ClaudeCode,
            None,
        )
        .await
        .expect("Session");
    let activation = database.activate_session(session.id).await.expect("activate");
    database
        .update_session_lifecycle(session.id, agent::sessions::Lifecycle::running(), activation)
        .await
        .expect("running");
    database
        .record_session_launch(
            session.id,
            agent::sessions::LaunchRecord {
                token: token.parse().expect("launch token"),
                sandbox: sandbox.id().to_string(),
                launched_at: time::OffsetDateTime::now_utc().unix_timestamp(),
                attempts: 1,
            },
        )
        .await
        .expect("launch bookkeeping");
    if started {
        let token: agent::sessions::LaunchToken = token.parse().expect("launch token");
        database
            .record_session_start_for_launch(
                session.id,
                &token,
                uuid::Uuid::new_v4(),
                "native-0",
                Some("/home/agent/conversation.jsonl"),
                time::OffsetDateTime::now_utc() - time::Duration::seconds(5),
            )
            .await
            .expect("start report");
    }
    let session = database.get_session(session.id).await.expect("Session");
    (database, sandboxes, session)
}

#[tokio::test(flavor = "local")]
#[allow(clippy::too_many_lines)]
async fn prompt_waits_for_completion_and_turns_are_read_separately() {
    const TOKEN: &str = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    let directory = TempDir::new().expect("temporary directory");
    let (database, sandboxes, session) = running_session(&directory, TOKEN, true).await;
    let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let agent_store: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
    let runtime = Rc::new(FakeRuntime::default());
    // An earlier exchange the hook counter never saw (it was folded before a
    // relaunch); it remains available through the separate turns operation.
    let mut earlier = user_turn("earlier prompt");
    earlier.messages.push(assistant_text("earlier answer"));
    runtime.conversation.borrow_mut().push(earlier);
    let (agent_controller, agent_wakeup) = agent::control_plane::Controller::new(
        agent_store.clone(),
        Rc::new(NoopAgentReconcile),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Agent reconciliation error: {error}")),
    );
    let (session_controller, session_wakeup) = agent::sessions::Controller::new(
        session_store.clone(),
        Rc::new(MarkSessionReady(database.clone())),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Session reconciliation error: {error}")),
    );
    let agent_task = tokio::task::spawn_local(agent_controller.run());
    let session_task = tokio::task::spawn_local(session_controller.run());
    let service = Rc::new(agent::sessions::Service::new(
        session_store.clone(),
        Rc::new(agent::sessions::AgentSandboxes::new(agent_store, sandboxes)),
        runtime.clone(),
        Convergence::new(agent_wakeup, Observers::new()),
        session_wakeup,
    ));
    let name = SessionName::new("s1").expect("name");

    let sending_service = service.clone();
    let sending_name = name.clone();
    let send = tokio::task::spawn_local(async move {
        sending_service
            .prompt(
                "worker",
                &sending_name,
                "do the thing",
                true,
                Some(Duration::from_secs(10)),
            )
            .await
    });
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert_eq!(runtime.sent.borrow().as_slice(), ["do the thing"]);
    assert!(
        !send.is_finished(),
        "the wait blocks until the harness reports the turn complete"
    );

    // The harness works, then reports the turn complete through the hook; the
    // Platform API folds it durably for the service to poll.
    let token: agent::sessions::LaunchToken = TOKEN.parse().expect("token");
    database
        .apply_session_activity_for_launch(
            session.id,
            &token,
            uuid::Uuid::new_v4(),
            agent::sessions::ActivityEvent::TurnStarted,
            time::OffsetDateTime::now_utc(),
        )
        .await
        .expect("fold");
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert!(!send.is_finished(), "working is not done");
    runtime
        .conversation
        .borrow_mut()
        .last_mut()
        .expect("the sent turn")
        .messages
        .push(assistant_text("did the thing"));
    database
        .apply_session_activity_for_launch(
            session.id,
            &token,
            uuid::Uuid::new_v4(),
            agent::sessions::ActivityEvent::TurnCompleted,
            time::OffsetDateTime::now_utc(),
        )
        .await
        .expect("fold");

    send.await.expect("send task").expect("turn completed");

    // Without wait the delivery returns immediately and reads nothing.
    service
        .prompt("worker", &name, "and another", false, None)
        .await
        .expect("send");
    assert_eq!(runtime.sent.borrow().len(), 2);

    // `turns` reads the whole conversation; `last` trims it.
    let all = service.turns("worker", &name, None).await.expect("turns");
    assert_eq!(all.len(), 3);
    let last = service.turns("worker", &name, Some(1)).await.expect("turns");
    assert_eq!(last.len(), 1);
    agent_task.abort();
    session_task.abort();
}

#[tokio::test(flavor = "local")]
async fn prompt_wait_reports_a_failed_session_instead_of_hanging() {
    const TOKEN: &str = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    let directory = TempDir::new().expect("temporary directory");
    let (database, sandboxes, session) = running_session(&directory, TOKEN, true).await;
    let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let agent_store: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
    let (agent_controller, agent_wakeup) = agent::control_plane::Controller::new(
        agent_store.clone(),
        Rc::new(NoopAgentReconcile),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Agent reconciliation error: {error}")),
    );
    let (session_controller, session_wakeup) = agent::sessions::Controller::new(
        session_store.clone(),
        Rc::new(MarkSessionReady(database.clone())),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Session reconciliation error: {error}")),
    );
    let agent_task = tokio::task::spawn_local(agent_controller.run());
    let session_task = tokio::task::spawn_local(session_controller.run());
    let service = Rc::new(agent::sessions::Service::new(
        session_store.clone(),
        Rc::new(agent::sessions::AgentSandboxes::new(agent_store, sandboxes)),
        Rc::new(FakeRuntime::default()),
        Convergence::new(agent_wakeup, Observers::new()),
        session_wakeup,
    ));
    let name = SessionName::new("s1").expect("name");

    let sending_service = service.clone();
    let sending_name = name.clone();
    let send = tokio::task::spawn_local(async move {
        sending_service
            .prompt(
                "worker",
                &sending_name,
                "do the thing",
                true,
                Some(Duration::from_mins(1)),
            )
            .await
    });
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert!(!send.is_finished());
    // No activity report arrives; the lifecycle write itself wakes the wait.
    session_store
        .update_session_lifecycle(session.id, agent::sessions::Lifecycle::failed("harness exited"), 1)
        .await
        .expect("failed");
    let error = send
        .await
        .expect("send task")
        .expect_err("a failed Session ends the wait");
    assert!(error.to_string().contains("harness exited"), "{error}");
    agent_task.abort();
    session_task.abort();
}

#[tokio::test(flavor = "local")]
#[allow(clippy::too_many_lines)]
async fn prompt_wait_handles_mid_turn_input_after_a_late_start_report() {
    const TOKEN: &str = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    let directory = TempDir::new().expect("temporary directory");
    let (database, sandboxes, session) = running_session(&directory, TOKEN, false).await;
    let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let agent_store: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
    let runtime = Rc::new(FakeRuntime::default());
    let (agent_controller, agent_wakeup) = agent::control_plane::Controller::new(
        agent_store.clone(),
        Rc::new(NoopAgentReconcile),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Agent reconciliation error: {error}")),
    );
    let (session_controller, session_wakeup) = agent::sessions::Controller::new(
        session_store.clone(),
        Rc::new(MarkSessionReady(database.clone())),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Session reconciliation error: {error}")),
    );
    let agent_task = tokio::task::spawn_local(agent_controller.run());
    let session_task = tokio::task::spawn_local(session_controller.run());
    let service = Rc::new(agent::sessions::Service::new(
        session_store.clone(),
        Rc::new(agent::sessions::AgentSandboxes::new(agent_store, sandboxes)),
        runtime.clone(),
        Convergence::new(agent_wakeup, Observers::new()),
        session_wakeup,
    ));
    let name = SessionName::new("s1").expect("name");
    let token: agent::sessions::LaunchToken = TOKEN.parse().expect("token");

    // The Session has launched but its harness has not reported its start:
    // nothing is delivered until it does.
    let sending_service = service.clone();
    let sending_name = name.clone();
    let send = tokio::task::spawn_local(async move {
        sending_service
            .prompt(
                "worker",
                &sending_name,
                "steer left",
                true,
                Some(Duration::from_secs(10)),
            )
            .await
    });
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert!(runtime.sent.borrow().is_empty(), "no delivery before the start report");

    // The harness starts on its first prompt and is mid-turn when it reports.
    runtime.conversation.borrow_mut().push(user_turn("first prompt"));
    database
        .record_session_start_for_launch(
            session.id,
            &token,
            uuid::Uuid::new_v4(),
            "native-1",
            Some("/home/agent/t.jsonl"),
            time::OffsetDateTime::now_utc(),
        )
        .await
        .expect("start report");
    // The event is stamped in the past so the input-readiness grace is over.
    database
        .apply_session_activity_for_launch(
            session.id,
            &token,
            uuid::Uuid::new_v4(),
            agent::sessions::ActivityEvent::TurnStarted,
            time::OffsetDateTime::now_utc() - time::Duration::seconds(5),
        )
        .await
        .expect("fold");
    tokio::time::timeout(Duration::from_secs(1), runtime.delivered.notified())
        .await
        .expect("delivery after the readiness poll");
    assert_eq!(
        runtime.sent.borrow().as_slice(),
        ["steer left"],
        "delivered once the start is reported"
    );
    // The fake appended the steering input as a new turn; a real harness folds
    // it into the running turn, so model that: merge it back.
    let steer = runtime.conversation.borrow_mut().pop().expect("steer turn");
    runtime
        .conversation
        .borrow_mut()
        .last_mut()
        .expect("running turn")
        .messages
        .extend(steer.messages);
    runtime
        .conversation
        .borrow_mut()
        .last_mut()
        .expect("running turn")
        .messages
        .push(assistant_text("went left"));
    database
        .apply_session_activity_for_launch(
            session.id,
            &token,
            uuid::Uuid::new_v4(),
            agent::sessions::ActivityEvent::TurnCompleted,
            time::OffsetDateTime::now_utc(),
        )
        .await
        .expect("fold");

    send.await.expect("send task").expect("turn completed");
    agent_task.abort();
    session_task.abort();
}

/// A Session service over a started `s1` with a fake runtime, with a database
/// the test writes harness reports through.
struct ServiceHarness {
    database: persistence::Database,
    runtime: Rc<FakeRuntime>,
    service: Rc<agent::sessions::Service>,
    session: agent::sessions::Session,
    token: agent::sessions::LaunchToken,
    tasks: Vec<tokio::task::JoinHandle<()>>,
}

impl ServiceHarness {
    async fn start(directory: &TempDir, token: &str) -> Self {
        let (database, sandboxes, session) = running_session(directory, token, true).await;
        let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
        let agent_store: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
        let runtime = Rc::new(FakeRuntime::default());
        let (agent_controller, agent_wakeup) = agent::control_plane::Controller::new(
            agent_store.clone(),
            Rc::new(NoopAgentReconcile),
            Duration::from_mins(1),
            Rc::new(|_, error| panic!("unexpected Agent reconciliation error: {error}")),
        );
        let (session_controller, session_wakeup) = agent::sessions::Controller::new(
            session_store.clone(),
            Rc::new(MarkSessionReady(database.clone())),
            Duration::from_mins(1),
            Rc::new(|_, error| panic!("unexpected Session reconciliation error: {error}")),
        );
        let tasks = vec![
            tokio::task::spawn_local(agent_controller.run()),
            tokio::task::spawn_local(session_controller.run()),
        ];
        let service = Rc::new(agent::sessions::Service::new(
            session_store,
            Rc::new(agent::sessions::AgentSandboxes::new(agent_store, sandboxes)),
            runtime.clone(),
            Convergence::new(agent_wakeup, Observers::new()),
            session_wakeup,
        ));
        Self {
            database,
            runtime,
            service,
            session,
            token: token.parse().expect("token"),
            tasks,
        }
    }

    /// Reports one activity event for the current launch, as the Platform API would.
    async fn report(&self, event: agent::sessions::ActivityEvent) {
        self.database
            .apply_session_activity_for_launch(
                self.session.id,
                &self.token,
                uuid::Uuid::new_v4(),
                event,
                time::OffsetDateTime::now_utc(),
            )
            .await
            .expect("fold")
            .expect("current launch");
    }

    fn append_to_last_turn(&self, message: agent::sessions::Message) {
        self.runtime
            .conversation
            .borrow_mut()
            .last_mut()
            .expect("a turn")
            .messages
            .push(message);
    }

    fn prompt(&self, text: &'static str) -> tokio::task::JoinHandle<Result<(), Error>> {
        let service = self.service.clone();
        tokio::task::spawn_local(async move {
            service
                .prompt(
                    "worker",
                    &SessionName::new("s1").expect("name"),
                    text,
                    true,
                    Some(Duration::from_secs(10)),
                )
                .await
        })
    }

    async fn await_delivery(&self, answer: &mut tokio::task::JoinHandle<Result<(), Error>>) {
        tokio::time::timeout(Duration::from_secs(5), async {
            tokio::select! {
                () = self.runtime.delivered.notified() => {},
                result = answer => panic!("prompt finished before delivery acknowledgement: {result:?}"),
            }
        })
        .await
        .expect("prompt delivery acknowledgement");
    }

    fn finish(self) {
        for task in self.tasks {
            task.abort();
        }
        drop(self.database);
    }
}

#[tokio::test(flavor = "local")]
async fn prompt_waits_for_one_more_completion_without_reading_the_transcript() {
    let directory = TempDir::new().expect("directory");
    let harness = ServiceHarness::start(&directory, "11111111-1111-4111-8111-111111111111").await;
    harness.runtime.fail_transcript.set(true);
    // A previous completion does not satisfy this invocation. Neither does a
    // permission wait in the current turn.
    harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
    let mut waiting = harness.prompt("continue");
    harness.await_delivery(&mut waiting).await;
    for event in [
        agent::sessions::ActivityEvent::TurnStarted,
        agent::sessions::ActivityEvent::WaitingForInput,
    ] {
        harness.report(event).await;
    }
    assert!(
        tokio::time::timeout(Duration::from_millis(50), &mut waiting)
            .await
            .is_err()
    );
    harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
    tokio::time::timeout(Duration::from_secs(2), waiting)
        .await
        .expect("completion reports")
        .expect("task")
        .expect("prompt");
    harness.finish();
}

#[tokio::test(flavor = "local")]
async fn prompt_waits_for_a_turn_that_started_before_delivery_finished() {
    let directory = TempDir::new().expect("directory");
    let harness = ServiceHarness::start(&directory, "22222222-2222-4222-8222-222222222222").await;
    harness.runtime.fail_transcript.set(true);
    harness.runtime.hold_completion.set(true);
    harness.report(agent::sessions::ActivityEvent::TurnStarted).await;
    let mut waiting = harness.prompt("queued input");
    harness.await_delivery(&mut waiting).await;
    // The current turn finishes and queued input starts before delivery returns.
    harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
    harness.report(agent::sessions::ActivityEvent::TurnStarted).await;
    assert!(!waiting.is_finished(), "delivery must finish first");
    harness.runtime.release_completion.notify_one();
    assert!(
        tokio::time::timeout(Duration::from_millis(300), &mut waiting)
            .await
            .is_err()
    );
    harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
    tokio::time::timeout(Duration::from_secs(2), waiting)
        .await
        .expect("completion reports")
        .expect("task")
        .expect("prompt");
    harness.finish();
}

#[tokio::test(flavor = "local")]
async fn prompt_settles_after_completion_and_follows_turns_started_in_the_window() {
    let directory = TempDir::new().expect("directory");
    let harness = ServiceHarness::start(&directory, "22222222-2222-4222-8222-222222222222").await;
    harness.runtime.fail_transcript.set(true);
    let mut waiting = harness.prompt("steer or queue");
    harness.await_delivery(&mut waiting).await;
    harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
    for _ in 0..2 {
        assert!(
            tokio::time::timeout(Duration::from_millis(20), &mut waiting)
                .await
                .is_err(),
            "a completion must settle before returning"
        );
        harness.report(agent::sessions::ActivityEvent::TurnStarted).await;
        assert!(
            tokio::time::timeout(Duration::from_millis(300), &mut waiting)
                .await
                .is_err(),
            "a turn started during settling must complete"
        );
        harness.report(agent::sessions::ActivityEvent::WaitingForInput).await;
        assert!(
            tokio::time::timeout(Duration::from_millis(300), &mut waiting)
                .await
                .is_err(),
            "a permission wait does not complete the new turn"
        );
        harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
    }
    assert!(
        tokio::time::timeout(Duration::from_millis(20), &mut waiting)
            .await
            .is_err()
    );
    tokio::time::timeout(Duration::from_secs(2), waiting)
        .await
        .expect("settled completion")
        .expect("task")
        .expect("prompt");
    harness.finish();
}

#[tokio::test(flavor = "local")]
async fn the_first_prompt_can_start_an_unreported_conversation() {
    for wait in [false, true] {
        let directory = TempDir::new().expect("temporary directory");
        let harness = ServiceHarness::start(&directory, "44444444-4444-4444-8444-444444444444").await;
        harness
            .database
            .clear_session_report(harness.session.id)
            .await
            .expect("no conversation yet");
        harness.runtime.ready_without_report.set(true);
        let service = harness.service.clone();
        let mut answer = tokio::task::spawn_local(async move {
            service
                .prompt(
                    "worker",
                    &SessionName::new("s1").expect("name"),
                    "first input",
                    wait,
                    Some(Duration::from_secs(10)),
                )
                .await
        });
        tokio::time::timeout(Duration::from_secs(5), harness.runtime.delivered.notified())
            .await
            .expect("first input must not wait for its own start report");
        if wait {
            assert!(!answer.is_finished(), "delivery alone is not turn completion");
            harness
                .database
                .record_session_start_for_launch(
                    harness.session.id,
                    &harness.token,
                    uuid::Uuid::new_v4(),
                    "new-conversation",
                    Some("/new.jsonl"),
                    time::OffsetDateTime::now_utc(),
                )
                .await
                .expect("start report");
            harness.append_to_last_turn(assistant_text("first answer"));
            harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
        }
        (&mut answer).await.expect("task").expect("prompt");
        harness.finish();
    }
}

#[tokio::test(flavor = "local")]
async fn a_prompt_without_wait_still_waits_for_the_harness_to_report_in() {
    let directory = TempDir::new().expect("temporary directory");
    let (database, sandboxes, session) =
        running_session(&directory, "33333333-3333-4333-8333-333333333333", false).await;
    let session_store: Rc<dyn agent::sessions::SessionStore> = Rc::new(database.clone());
    let agent_store: Rc<dyn agent::control_plane::AgentStore> = Rc::new(database.clone());
    let runtime = Rc::new(FakeRuntime::default());
    let (agent_controller, agent_wakeup) = agent::control_plane::Controller::new(
        agent_store.clone(),
        Rc::new(NoopAgentReconcile),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Agent reconciliation error: {error}")),
    );
    let (session_controller, session_wakeup) = agent::sessions::Controller::new(
        session_store.clone(),
        Rc::new(MarkSessionReady(database.clone())),
        Duration::from_mins(1),
        Rc::new(|_, error| panic!("unexpected Session reconciliation error: {error}")),
    );
    let agent_task = tokio::task::spawn_local(agent_controller.run());
    let session_task = tokio::task::spawn_local(session_controller.run());
    let service = Rc::new(agent::sessions::Service::new(
        session_store,
        Rc::new(agent::sessions::AgentSandboxes::new(agent_store, sandboxes)),
        runtime.clone(),
        Convergence::new(agent_wakeup, Observers::new()),
        session_wakeup,
    ));
    let fire_and_forget = {
        let service = service.clone();
        tokio::task::spawn_local(async move {
            service
                .prompt("worker", &SessionName::new("s1").expect("name"), "go", false, None)
                .await
        })
    };
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert!(
        runtime.sent.borrow().is_empty(),
        "nothing is pasted into a harness that has not reported in"
    );
    let token: agent::sessions::LaunchToken = "33333333-3333-4333-8333-333333333333".parse().expect("token");
    database
        .record_session_start_for_launch(
            session.id,
            &token,
            uuid::Uuid::new_v4(),
            "native-1",
            None,
            time::OffsetDateTime::now_utc() - time::Duration::seconds(5),
        )
        .await
        .expect("start report");
    fire_and_forget.await.expect("task").expect("delivered");
    assert_eq!(runtime.sent.borrow().as_slice(), ["go"]);
    agent_task.abort();
    session_task.abort();
}

#[tokio::test(flavor = "local")]
async fn a_failed_initial_launch_recovers_without_replaying_the_prompt() {
    let directory = TempDir::new().expect("temporary directory");
    let (database, sandboxes, _) = running_session(&directory, "ffffffff-ffff-4fff-8fff-ffffffffffff", true).await;
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("uncertain").expect("name"),
            agent::Harness::ClaudeCode,
            Some("perform once"),
        )
        .await
        .expect("Session");
    database.activate_session(session.id).await.expect("activate");
    let runtime = Rc::new(FakeRuntime::default());
    runtime.present.set(false);
    runtime.fail_start.set(true);
    let reconciler = agent::sessions::Reconciler::new(
        Rc::new(database.clone()),
        Rc::new(agent::sessions::AgentSandboxes::new(
            Rc::new(database.clone()),
            sandboxes,
        )),
        runtime.clone(),
        "http://platform-api".into(),
    );
    reconciler.reconcile(session.id).await.expect_err("failed launch");
    assert_eq!(
        runtime.launches.borrow().as_slice(),
        [(None, Some("perform once".into()))]
    );
    database
        .reset_session_launch_attempts(session.id)
        .await
        .expect("reset backoff");
    runtime.fail_start.set(false);
    reconciler.reconcile(session.id).await.expect("automatic recovery");
    assert_eq!(
        runtime.launches.borrow().as_slice(),
        [(None, Some("perform once".into())), (None, None)]
    );
    assert_eq!(
        database
            .get_session(session.id)
            .await
            .expect("Session")
            .status
            .lifecycle
            .state,
        agent::sessions::LifecycleState::Running
    );
}

#[tokio::test(flavor = "local")]
async fn a_fresh_launch_carries_the_first_prompt_and_a_resume_does_not() {
    const TOKEN: &str = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    let directory = TempDir::new().expect("temporary directory");
    let (database, sandboxes, existing) = running_session(&directory, TOKEN, true).await;
    let sandbox_id = database
        .session_launch_state(existing.id)
        .await
        .expect("launch state")
        .expect("recorded launch")
        .sandbox;
    let prompted = database
        .ensure_session(
            "worker",
            &SessionName::new("prompted").expect("name"),
            agent::Harness::ClaudeCode,
            Some("start here"),
        )
        .await
        .expect("Session");
    database.activate_session(prompted.id).await.expect("activate");
    let runtime = Rc::new(FakeRuntime::default());
    runtime.present.set(false);
    let reconciler = agent::sessions::Reconciler::new(
        Rc::new(database.clone()),
        Rc::new(agent::sessions::AgentSandboxes::new(
            Rc::new(database.clone()),
            sandboxes,
        )),
        runtime.clone(),
        "http://platform-api".into(),
    );

    reconciler.reconcile(prompted.id).await.expect("first launch");
    assert_eq!(
        runtime.launches.borrow().as_slice(),
        [(None, Some("start here".to_owned()))],
        "the first launch starts on the first prompt"
    );
    // A fresh conversation later (nothing reported to resume) starts empty.
    // Clear the crash backoff the first launch armed so the pass relaunches now.
    database
        .reset_session_launch_attempts(prompted.id)
        .await
        .expect("reset attempts");
    runtime.present.set(false);
    reconciler.reconcile(prompted.id).await.expect("fresh relaunch");
    assert_eq!(
        runtime.launches.borrow().last().expect("second launch"),
        &(None, None),
        "a Sandbox replacement does not replay the task"
    );

    // Once the harness has reported a conversation, a relaunch resumes it and
    // does not repeat the prompt.
    let token: agent::sessions::LaunchToken = "abababab-abab-4bab-8bab-abababababab".parse().expect("token");
    database
        .record_session_launch(
            prompted.id,
            agent::sessions::LaunchRecord {
                token: token.clone(),
                sandbox: sandbox_id,
                launched_at: 0,
                attempts: 1,
            },
        )
        .await
        .expect("launch bookkeeping");
    database
        .record_session_start_for_launch(
            prompted.id,
            &token,
            uuid::Uuid::new_v4(),
            "native-1",
            Some("/home/agent/t.jsonl"),
            time::OffsetDateTime::now_utc(),
        )
        .await
        .expect("start report");
    runtime.present.set(false);
    reconciler.reconcile(prompted.id).await.expect("relaunch");
    assert_eq!(
        runtime.launches.borrow().last().expect("third launch"),
        &(Some("native-1".to_owned()), None)
    );
    let relaunched = database.get_session(prompted.id).await.expect("Session");
    assert_eq!(
        relaunched.status.reported.harness_transcript_path.as_deref(),
        Some("/home/agent/t.jsonl"),
        "a relaunch in the same Sandbox keeps the reported conversation"
    );
    assert_eq!(
        relaunched.status.state,
        agent::sessions::State::Starting,
        "a relaunch is Starting until the new process reports, whatever the old launch reported"
    );
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
    let service = agent::sessions::Service::new(
        session_store,
        Rc::new(agent::sessions::AgentSandboxes::new(agent_store, unused_sandboxes())),
        tmux_runtime(),
        Convergence::new(agent_wakeup, Observers::new()),
        session_wakeup,
    );

    let explicit = service
        .ensure(
            "worker",
            &SessionName::new("explicit").expect("name"),
            Some(agent::Harness::Codex),
            None,
            WaitPolicy::FirstPass,
            None,
        )
        .await
        .expect("explicit harness Session");
    let implicit = service
        .ensure(
            "worker",
            &SessionName::new("implicit").expect("name"),
            None,
            None,
            WaitPolicy::FirstPass,
            None,
        )
        .await
        .expect("implicit default Session");

    assert_eq!(explicit.session.harness, agent::Harness::Codex);
    assert_eq!(implicit.session.harness, agent::Harness::ClaudeCode);

    let conflict = service
        .ensure(
            "worker",
            &SessionName::new("explicit").expect("name"),
            Some(agent::Harness::ClaudeCode),
            None,
            WaitPolicy::FirstPass,
            None,
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
            None,
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
    let reconciler = agent::sessions::Reconciler::new(
        sessions,
        Rc::new(agent::sessions::AgentSandboxes::new(agents, sandboxes)),
        tmux_runtime(),
        "http://platform-api".into(),
    );

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
            None,
        )
        .await
        .expect("Session");
    let activation = database.activate_session(session.id).await.expect("activate Session");
    database
        .update_session_lifecycle(session.id, agent::sessions::Lifecycle::running(), activation)
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
            ExecutionEvent::Stdout("0 1900\n".into()),
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
    let reconciler = agent::sessions::Reconciler::new(
        sessions,
        Rc::new(agent::sessions::AgentSandboxes::new(agents, sandboxes)),
        tmux_runtime(),
        "http://platform-api".into(),
    );

    reconciler.reconcile(session.id).await.expect("idle reconciliation");
    let idle = database.get_session(session.id).await.expect("Idle Session");
    assert_eq!(idle.status.lifecycle.state, agent::sessions::LifecycleState::Idle);
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
            .lifecycle
            .state,
        agent::sessions::LifecycleState::Running
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
                manifest_path: None,
                env_file: None,
                agent: resource,
            },
            0,
        )
        .await
        .expect("Agent");
    let service = Rc::new(agent::sessions::Service::new(
        session_store,
        Rc::new(agent::sessions::AgentSandboxes::new(agent_store, unused_sandboxes())),
        tmux_runtime(),
        Convergence::new(agent_wakeup, Observers::new()),
        session_wakeup,
    ));
    let ensure_service = service.clone();
    let ensure = tokio::task::spawn_local(async move {
        ensure_service
            .ensure(
                "worker",
                &SessionName::new("s1").expect("name"),
                None,
                None,
                WaitPolicy::FirstPass,
                None,
            )
            .await
    });

    started.notified().await;
    let sessions = database.list_agent_sessions("worker").await.expect("Sessions");
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].name.as_str(), "s1");
    assert_eq!(
        sessions[0].status.lifecycle.state,
        agent::sessions::LifecycleState::Starting
    );
    release.notify_one();
    let target = ensure.await.expect("ensure task").expect("ready Session");

    assert_eq!(target.session.name.as_str(), "s1");
    assert_eq!(
        target.session.status.lifecycle.state,
        agent::sessions::LifecycleState::Running
    );
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
            None,
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
            None,
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

#[tokio::test(flavor = "local")]
async fn prompt_wait_does_not_follow_a_replacement_session_with_the_same_name() {
    let directory = TempDir::new().expect("directory");
    let harness = ServiceHarness::start(&directory, "44444444-4444-4444-8444-444444444444").await;
    let mut waiting = harness.prompt("continue");
    harness.await_delivery(&mut waiting).await;
    // Ensure the waiter will reread on its next activity poll.
    harness.report(agent::sessions::ActivityEvent::TurnCompleted).await;
    tokio::time::sleep(Duration::from_millis(50)).await;
    harness.database.mark_deleting("worker").await.expect("delete");
    harness
        .database
        .finalize_deletion(harness.session.agent_id, 1)
        .await
        .expect("finalize");
    harness
        .database
        .put(
            ready_record(
                "worker",
                "f50fbec8-03a9-43ea-b65d-c15a86e9eb65".parse().expect("Agent ID"),
            ),
            0,
        )
        .await
        .expect("replacement");
    let replacement = harness
        .database
        .ensure_session("worker", &harness.session.name, agent::Harness::ClaudeCode, None)
        .await
        .expect("Session");
    harness
        .database
        .update_session_lifecycle(replacement.id, agent::sessions::Lifecycle::running(), 0)
        .await
        .expect("running");
    let error = tokio::time::timeout(Duration::from_secs(1), waiting)
        .await
        .expect("original Session removal ends wait")
        .expect("task")
        .expect_err("original Session disappeared");
    assert!(matches!(error, Error::NotFound));
    harness.finish();
}

#[tokio::test(flavor = "local")]
async fn completion_timeout_starts_after_delivery() {
    let directory = TempDir::new().expect("directory");
    let harness = ServiceHarness::start(&directory, "44444444-4444-4444-8444-444444444444").await;
    harness.runtime.delivery_delay.set(Duration::from_millis(300));
    let started = tokio::time::Instant::now();
    let error = harness
        .service
        .prompt(
            "worker",
            &harness.session.name,
            "go",
            true,
            Some(Duration::from_millis(100)),
        )
        .await
        .expect_err("completion timeout");
    assert!(error.to_string().contains("prompt was submitted"));
    assert!(started.elapsed() >= Duration::from_millis(400));
    assert_eq!(harness.runtime.sent.borrow().as_slice(), ["go"]);
    harness.finish();
}

#[tokio::test(flavor = "local")]
async fn queued_deliveries_do_not_expire_and_remain_serialized() {
    let directory = TempDir::new().expect("directory");
    let harness = ServiceHarness::start(&directory, "44444444-4444-4444-8444-444444444444").await;
    harness.runtime.hold_completion.set(true);
    let send = |text| {
        let service = harness.service.clone();
        let name = harness.session.name.clone();
        tokio::task::spawn_local(async move {
            service
                .prompt("worker", &name, text, false, Some(Duration::from_millis(50)))
                .await
        })
    };
    let mut first = send("first");
    harness.await_delivery(&mut first).await;
    let second = send("second");
    tokio::time::sleep(Duration::from_millis(100)).await;
    assert!(!first.is_finished());
    assert!(!second.is_finished());
    assert_eq!(harness.runtime.sent.borrow().as_slice(), ["first"]);
    harness.runtime.hold_completion.set(false);
    harness.runtime.release_completion.notify_one();
    first.await.expect("task").expect("first delivery");
    second.await.expect("task").expect("second delivery");
    assert_eq!(harness.runtime.sent.borrow().as_slice(), ["first", "second"]);
    harness.finish();
}
