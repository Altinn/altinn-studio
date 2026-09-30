#![allow(clippy::expect_used, clippy::panic)]

mod support;

use std::{
    cell::{Cell, RefCell},
    rc::Rc,
    time::Duration,
};

use agent::{
    Condition, ConditionStatus, Error, FailureKind, Status,
    control_api::{
        AuthenticationApi, Client, Connection, Connector, ExecutionApi, Server, SessionApi, SshAccessApi, VncAccessApi,
    },
    control_plane::{AgentStore as _, ApplyRequest, ControlPlane, Notifier, memory::InMemoryAgentStore},
    harness::ImportedAuthentication,
    resources::Changes,
    wait::Policy,
};
use sandbox::LocalFuture;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    sync::Notify,
};

use support::agent;

/// Stands in for the Agent controller: a woken Agent is reconciled at once
/// to `failure`, or to Ready without one.
struct FakeController {
    store: Rc<InMemoryAgentStore>,
    failure: RefCell<Option<(FailureKind, String)>>,
    /// Leaves a woken Agent unreconciled, as a controller still busy with it would.
    hold: Cell<bool>,
}

struct FakeAuthentication;
struct FakeSshAccess;
struct FakeVncAccess;

impl SshAccessApi for FakeSshAccess {
    fn describe<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<agent::ssh::AccessInfo, Error>> {
        Box::pin(async move {
            if name != "worker" {
                return Err(Error::NotFound);
            }
            Ok(agent::ssh::AccessInfo {
                kind: "ssh".into(),
                agent: name.into(),
                agent_id: "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID"),
                alias: "agentctl-worker".into(),
                user: "agent".into(),
                identity_file: "/home/me/.agent/ssh/38f41de4-6ff7-4679-ae46-678bc61e4dcb/id_ed25519".into(),
                known_hosts_file: "/home/me/.agent/ssh/known_hosts".into(),
                config_file: "/home/me/.agent/ssh/config".into(),
                proxy_command: "/usr/local/bin/agentctl ssh-proxy agent/worker".into(),
                working_directory: "/home/agent/code".into(),
            })
        })
    }
}

impl VncAccessApi for FakeVncAccess {
    fn describe<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<agent::vnc::AccessInfo, Error>> {
        Box::pin(async move {
            if name != "worker" {
                return Err(Error::NotFound);
            }
            Ok(agent::vnc::AccessInfo {
                kind: "vnc".into(),
                agent: name.into(),
                agent_id: "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID"),
                guest_port: 5900,
                web_guest_port: Some(6080),
                forward_command: "/usr/local/bin/agentctl port-forward agent/worker :5900".into(),
            })
        })
    }
}
struct FakeExecutions;
/// The prompt of one `sessions.v1.prompt` as the fake saw it.
type SentMessage = String;

#[derive(Default)]
struct UpgradeGates {
    prompt: RefCell<Option<Rc<Notify>>>,
    prompt_started: Notify,
    readiness: RefCell<Option<Rc<Notify>>>,
    readiness_started: Notify,
}

struct FakeSessions {
    /// The Session the last request left, as a read by identity finds it.
    recorded: RefCell<Option<agent::sessions::Session>>,
    ensured: Rc<RefCell<Vec<agent::sessions::SessionRequest>>>,
    sent: Rc<RefCell<Vec<SentMessage>>>,
    deleted: Rc<RefCell<Vec<(String, agent::sessions::SessionName)>>>,
    archived: Rc<RefCell<Vec<(String, agent::sessions::SessionName, bool)>>>,
    upgrade_blockers: Rc<RefCell<Vec<String>>>,
    upgrade_warnings: Rc<RefCell<Vec<String>>>,
    upgrade_gates: Rc<UpgradeGates>,
}

fn answered_turn(prompt: &str, answer: &str) -> agent::sessions::Turn {
    agent::sessions::Turn {
        messages: vec![
            agent::sessions::Message {
                role: agent::sessions::Role::User,
                parts: vec![agent::sessions::Part::Text { text: prompt.into() }],
            },
            agent::sessions::Message {
                role: agent::sessions::Role::Assistant,
                parts: vec![
                    agent::sessions::Part::ToolCall {
                        name: "Bash".into(),
                        failed: true,
                    },
                    agent::sessions::Part::Text { text: answer.into() },
                ],
            },
        ],
    }
}

impl Notifier for FakeController {
    fn notify(&self, _id: agent::AgentId) {}

    fn wake(&self, id: agent::AgentId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            if self.hold.get() {
                return Ok(());
            }
            let record = self.store.get(id).await?;
            let generation = record.agent.metadata.generation;
            let failure = self.failure.borrow().clone();
            let ready = Condition {
                kind: Condition::READY.into(),
                status: if failure.is_some() {
                    ConditionStatus::False
                } else {
                    ConditionStatus::True
                },
                reason: if failure.is_some() {
                    "SandboxReconcileFailed"
                } else {
                    "SandboxReady"
                }
                .into(),
                message: failure.as_ref().map(|(_, message)| message.clone()).unwrap_or_default(),
                last_transition_time: None,
            };
            let mut status = Status::observed(generation, Some(fake_assignment()?), vec![ready]);
            status.failure = failure.map(|(kind, _)| kind);
            status.sync.observed = record.agent.status.sync.requested;
            self.store.update_status(id, generation, status).await.map(drop)
        })
    }
}

fn fake_assignment() -> Result<agent::sandbox::Assignment, Error> {
    Ok(agent::sandbox::Assignment::Materialized {
        provider: agent::sandbox::ProviderId::new("memory")?,
        id: "ca4e2f21-91d9-43f1-97c6-13f0f350fbe7"
            .parse()
            .map_err(|error| Error::Invalid(format!("invalid test Sandbox ID: {error}")))?,
        harnesses: Vec::new(),
    })
}

/// A Session as the fake records it: every request handled at once, and one
/// completed turn after each prompt.
fn fake_session(
    agent: &str,
    name: &agent::sessions::SessionName,
    archived: bool,
    turns: u64,
) -> agent::sessions::Session {
    let mut session: agent::sessions::Session = serde_json::from_value(serde_json::json!({
        "id": "00000000-0000-4000-8000-000000000001",
        "agentId": "00000000-0000-4000-8000-000000000002",
        "agent": agent,
        "name": name,
        "harness": "claudeCode",
        "createdAt": "2026-09-25T00:00:00Z",
        "archivedAt": archived.then_some("2026-09-25T00:00:01Z"),
        "generation": 1,
        "observedGeneration": 1,
    }))
    .expect("fake Session");
    session.status = agent::sessions::Status::new(
        agent::sessions::Lifecycle::running(),
        agent::sessions::Reported {
            harness_session_id: Some("native".into()),
            activity: agent::sessions::Activity {
                phase: agent::sessions::Phase::WaitingForInput,
                turns,
                last_event_at: Some(time::OffsetDateTime::UNIX_EPOCH),
                ..agent::sessions::Activity::default()
            },
            ..agent::sessions::Reported::default()
        },
    );
    session
}

impl AuthenticationApi for FakeAuthentication {
    fn login<'a>(
        &'a self,
        _harness: agent::Harness,
        _token: &'a str,
        _imported: bool,
    ) -> LocalFuture<'a, Result<ImportedAuthentication, Error>> {
        Box::pin(async {
            Ok(ImportedAuthentication {
                provider: "claude".into(),
                ready: true,
            })
        })
    }
}

impl SessionApi for FakeSessions {
    fn ensure<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
        request: agent::sessions::SessionRequest,
    ) -> LocalFuture<'a, Result<agent::sessions::Requested, Error>> {
        self.ensured.borrow_mut().push(request);
        Box::pin(async { Err(Error::NotFound) })
    }

    fn attach_target(
        &self,
        _id: agent::sessions::SessionId,
    ) -> LocalFuture<'_, Result<agent::sessions::AttachTarget, Error>> {
        Box::pin(async { Err(Error::NotFound) })
    }

    fn get_by_id(&self, _id: agent::sessions::SessionId) -> LocalFuture<'_, Result<agent::sessions::Session, Error>> {
        let recorded = self.recorded.borrow().clone();
        Box::pin(async move { recorded.ok_or(Error::NotFound) })
    }

    fn get<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
    ) -> LocalFuture<'a, Result<agent::sessions::Session, Error>> {
        Box::pin(async { Err(Error::NotFound) })
    }

    fn list<'a>(&'a self, _agent: Option<&'a str>) -> LocalFuture<'a, Result<Vec<agent::sessions::Session>, Error>> {
        Box::pin(async { Ok(Vec::new()) })
    }

    fn prompt<'a>(
        &'a self,
        agent: &'a str,
        name: &'a agent::sessions::SessionName,
        prompt: &'a str,
    ) -> LocalFuture<'a, Result<agent::sessions::Delivered, Error>> {
        self.sent.borrow_mut().push(prompt.to_owned());
        let gate = self.upgrade_gates.prompt.borrow().clone();
        let upgrade_gates = self.upgrade_gates.clone();
        let blockers = self.upgrade_blockers.clone();
        Box::pin(async move {
            if agent != "worker" {
                return Err(Error::NotFound);
            }
            if let Some(gate) = gate {
                upgrade_gates.prompt_started.notify_one();
                gate.notified().await;
                blockers.borrow_mut().push("session/worker/s1 (working)".into());
            }
            let turns = self.sent.borrow().len() as u64;
            let name = name.clone();
            *self.recorded.borrow_mut() = Some(fake_session(agent, &name, false, turns));
            Ok(agent::sessions::Delivered {
                session: fake_session(agent, &name, false, turns - 1),
                turns: turns - 1,
            })
        })
    }

    fn turns<'a>(
        &'a self,
        agent: &'a str,
        _name: &'a agent::sessions::SessionName,
        last: Option<usize>,
    ) -> LocalFuture<'a, Result<Vec<agent::sessions::Turn>, Error>> {
        Box::pin(async move {
            if agent != "worker" {
                return Err(Error::NotFound);
            }
            let mut turns = vec![answered_turn("one", "1"), answered_turn("two", "2")];
            if let Some(last) = last {
                turns.drain(0..turns.len().saturating_sub(last));
            }
            Ok(turns)
        })
    }

    fn set_archived<'a>(
        &'a self,
        agent: &'a str,
        name: &'a agent::sessions::SessionName,
        archived: bool,
    ) -> LocalFuture<'a, Result<agent::sessions::Requested, Error>> {
        self.archived
            .borrow_mut()
            .push((agent.to_owned(), name.clone(), archived));
        Box::pin(async move {
            if agent != "worker" {
                return Err(Error::NotFound);
            }
            let session = fake_session(agent, name, archived, 0);
            *self.recorded.borrow_mut() = Some(session.clone());
            Ok(agent::sessions::Requested { session, generation: 1 })
        })
    }

    fn delete<'a>(
        &'a self,
        agent: &'a str,
        name: &'a agent::sessions::SessionName,
    ) -> LocalFuture<'a, Result<agent::sessions::Requested, Error>> {
        self.deleted.borrow_mut().push((agent.to_owned(), name.clone()));
        Box::pin(async move {
            if agent != "worker" {
                return Err(Error::NotFound);
            }
            // Released at once: a read by identity finds nothing.
            *self.recorded.borrow_mut() = None;
            Ok(agent::sessions::Requested {
                session: fake_session(agent, name, false, 0),
                generation: 1,
            })
        })
    }

    fn upgrade_readiness(&self) -> LocalFuture<'_, Result<agent::sessions::UpgradeReadiness, Error>> {
        let blockers = self.upgrade_blockers.borrow().clone();
        let warnings = self.upgrade_warnings.borrow().clone();
        let gate = self.upgrade_gates.readiness.borrow().clone();
        let upgrade_gates = self.upgrade_gates.clone();
        Box::pin(async move {
            if let Some(gate) = gate {
                upgrade_gates.readiness_started.notify_one();
                gate.notified().await;
            }
            Ok(agent::sessions::UpgradeReadiness { blockers, warnings })
        })
    }
}

impl ExecutionApi for FakeExecutions {
    fn target(&self, _id: agent::AgentId) -> LocalFuture<'_, Result<agent::sandbox::ExecutionTarget, Error>> {
        Box::pin(async move {
            Ok(agent::sandbox::ExecutionTarget {
                sandbox: fake_assignment()?,
                operating_system: "linux".into(),
            })
        })
    }
}

struct InProcessConnector {
    server: Rc<Server>,
}

struct ScriptedConnector {
    frames: &'static str,
}

struct ApiFixture {
    server: Rc<Server>,
    client: Client,
    controller: Rc<FakeController>,
    ensured: Rc<RefCell<Vec<agent::sessions::SessionRequest>>>,
    sent: Rc<RefCell<Vec<SentMessage>>>,
    changes: Changes,
    deleted: Rc<RefCell<Vec<(String, agent::sessions::SessionName)>>>,
    archived: Rc<RefCell<Vec<(String, agent::sessions::SessionName, bool)>>>,
    upgrade_blockers: Rc<RefCell<Vec<String>>>,
    upgrade_warnings: Rc<RefCell<Vec<String>>>,
    upgrade_gates: Rc<UpgradeGates>,
}

impl Connector for InProcessConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            let (client, server) = tokio::io::duplex(64 * 1024);
            let api = self.server.clone();
            tokio::task::spawn_local(async move {
                let _ignored = api.serve_connection(server).await;
            });
            Ok(Box::new(client) as Box<dyn Connection>)
        })
    }
}

impl Connector for ScriptedConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            let (client, server) = tokio::io::duplex(16 * 1024);
            let frames = self.frames;
            tokio::task::spawn_local(async move {
                let mut server = BufReader::new(server);
                let mut request = String::new();
                server.read_line(&mut request).await.expect("request");
                server.get_mut().write_all(frames.as_bytes()).await.expect("responses");
            });
            Ok(Box::new(client) as Box<dyn Connection>)
        })
    }
}

fn api() -> ApiFixture {
    let changes = Changes::new();
    let store = Rc::new(InMemoryAgentStore::with_changes(changes.clone()));
    let controller = Rc::new(FakeController {
        store: store.clone(),
        failure: RefCell::default(),
        hold: Cell::new(false),
    });
    let control_plane = Rc::new(ControlPlane::new(store, controller.clone()));
    let ensured = Rc::new(RefCell::new(Vec::new()));
    let sent = Rc::new(RefCell::new(Vec::new()));
    let deleted = Rc::new(RefCell::new(Vec::new()));
    let archived = Rc::new(RefCell::new(Vec::new()));
    let observed_errors = Rc::new(RefCell::new(Vec::new()));
    let upgrade_blockers = Rc::new(RefCell::new(Vec::new()));
    let upgrade_warnings = Rc::new(RefCell::new(Vec::new()));
    let upgrade_gates = Rc::new(UpgradeGates::default());
    let server = Rc::new(Server::new(
        control_plane,
        Rc::new(FakeAuthentication),
        Rc::new(FakeExecutions),
        Rc::new(FakeSessions {
            recorded: RefCell::default(),
            ensured: ensured.clone(),
            sent: sent.clone(),
            deleted: deleted.clone(),
            archived: archived.clone(),
            upgrade_blockers: upgrade_blockers.clone(),
            upgrade_warnings: upgrade_warnings.clone(),
            upgrade_gates: upgrade_gates.clone(),
        }),
        Rc::new(FakeSshAccess),
        Rc::new(FakeVncAccess),
        changes.clone(),
        Rc::new(move |error| observed_errors.borrow_mut().push(error.to_string())),
    ));
    let client = Client::new(Rc::new(InProcessConnector { server: server.clone() }));
    ApiFixture {
        server,
        client,
        controller,
        ensured,
        sent,
        changes,
        deleted,
        archived,
        upgrade_blockers,
        upgrade_warnings,
        upgrade_gates,
    }
}

#[tokio::test(flavor = "local")]
async fn a_prompt_timeout_above_the_ceiling_is_refused_before_delivery() {
    let fixture = api();
    let error = fixture
        .client
        .prompt_session(
            "worker",
            agent::sessions::SessionName::new("s1").expect("name"),
            "go".into(),
            true,
            Some(agent::control_api::PROMPT_TIMEOUT_MAX + Duration::from_secs(1)),
        )
        .await
        .expect_err("timeout above the ceiling");
    assert!(
        matches!(&error, Error::Rpc(error) if error.is_invalid_params() && error.message.contains("must not exceed 30m")),
        "{error}"
    );
    assert!(fixture.sent.borrow().is_empty(), "nothing was delivered");
}

#[tokio::test(flavor = "local")]
async fn session_send_and_turns_round_trip_with_their_parameters() {
    let fixture = api();
    let name = agent::sessions::SessionName::new("s1").expect("name");

    fixture
        .client
        .prompt_session(
            "worker",
            name.clone(),
            "do it".into(),
            true,
            Some(std::time::Duration::from_secs(90)),
        )
        .await
        .expect("send with wait");
    fixture
        .client
        .prompt_session("worker", name.clone(), "fire and forget".into(), false, None)
        .await
        .expect("send without wait");
    assert_eq!(fixture.sent.borrow().as_slice(), ["do it", "fire and forget"]);

    let last = fixture
        .client
        .session_turns("worker", name.clone(), Some(1))
        .await
        .expect("turns");
    assert_eq!(last.len(), 1);
    assert_eq!(last[0], answered_turn("two", "2"));
    assert_eq!(
        fixture
            .client
            .session_turns("worker", name.clone(), None)
            .await
            .expect("turns")
            .len(),
        2
    );
    let missing = fixture
        .client
        .prompt_session("ghost", name, "hello".into(), false, None)
        .await
        .expect_err("unknown Agent");
    match missing {
        Error::Rpc(error) => assert_eq!(error.code, -32004),
        other => panic!("unexpected error: {other}"),
    }
}

#[tokio::test(flavor = "local")]
async fn session_archive_and_unarchive_round_trip_and_report_a_missing_session() {
    let fixture = api();
    let name = agent::sessions::SessionName::new("s1").expect("name");

    let archived = fixture
        .client
        .set_session_archived("worker", name.clone(), true)
        .await
        .expect("archive Session");
    assert!(archived.is_archived());
    let unarchived = fixture
        .client
        .set_session_archived("worker", name.clone(), false)
        .await
        .expect("unarchive Session");
    assert!(!unarchived.is_archived());
    assert_eq!(
        fixture.archived.borrow().as_slice(),
        [
            ("worker".to_owned(), name.clone(), true),
            ("worker".to_owned(), name.clone(), false)
        ]
    );

    let missing = fixture
        .client
        .set_session_archived("ghost", name, true)
        .await
        .expect_err("unknown Agent");
    match missing {
        Error::Rpc(error) => assert_eq!(error.code, -32004),
        other => panic!("unexpected error: {other}"),
    }
}

#[tokio::test(flavor = "local")]
async fn session_deletion_round_trips_and_reports_a_missing_session() {
    let fixture = api();
    let name = agent::sessions::SessionName::new("s1").expect("name");

    fixture
        .client
        .delete_session("worker", name.clone())
        .await
        .expect("delete Session");
    assert_eq!(
        fixture.deleted.borrow().as_slice(),
        [("worker".to_owned(), name.clone())]
    );

    let missing = fixture
        .client
        .delete_session("ghost", name)
        .await
        .expect_err("unknown Agent");
    match missing {
        Error::Rpc(error) => assert_eq!(error.code, -32004),
        other => panic!("unexpected error: {other}"),
    }
}

#[tokio::test(flavor = "local")]
async fn login_returns_only_non_secret_readiness() {
    let fixture = api();
    let imported = fixture
        .client
        .auth_login(agent::Harness::ClaudeCode, "sk-ant-oat01-canary".into(), false)
        .await
        .expect("login");
    assert_eq!(imported.provider, "claude");
    assert!(imported.ready);
}

#[tokio::test(flavor = "local")]
async fn health_reports_a_compatible_daemon() {
    let fixture = api();
    let daemon = fixture.client.require_compatible_daemon().await.expect("health check");
    assert_eq!(
        daemon.protocol_version.as_deref(),
        Some(agent::control_api::PROTOCOL_VERSION)
    );
    assert_eq!(daemon.build_version.as_deref(), Some(agent::build_version()));
}

#[test]
fn daemon_identity_rejects_preview_1_and_mixed_builds() {
    let extended: agent::control_api::DaemonInfo = serde_json::from_value(serde_json::json!({
        "protocolVersion": agent::control_api::PROTOCOL_VERSION,
        "buildVersion": agent::build_version(),
        "futureCapability": true
    }))
    .expect("extended health response");
    extended.require_compatible().expect("compatible extended response");

    for daemon in [
        agent::control_api::DaemonInfo {
            protocol_version: Some("v1".into()),
            build_version: None,
        },
        agent::control_api::DaemonInfo {
            protocol_version: Some(agent::control_api::PROTOCOL_VERSION.into()),
            build_version: Some("another-build".into()),
        },
    ] {
        let error = daemon.require_compatible().expect_err("incompatible daemon");
        assert!(error.to_string().contains("running agentd is incompatible"));
    }
}

#[tokio::test(flavor = "local")]
async fn shutdown_reports_blocking_sessions_without_draining() {
    let fixture = api();
    fixture
        .upgrade_blockers
        .borrow_mut()
        .push("session/worker/busy (working)".into());
    let error = fixture
        .client
        .shutdown_for_upgrade()
        .await
        .expect_err("working Session blocks shutdown");
    assert!(matches!(error, Error::Rpc(error) if error.is_invalid_params()));
    fixture.client.health().await.expect("daemon remains available");
}

#[tokio::test(flavor = "local")]
async fn shutdown_returns_nonblocking_session_warnings() {
    let fixture = api();
    fixture
        .upgrade_warnings
        .borrow_mut()
        .push("session/worker/fresh will start a new conversation".into());

    assert_eq!(
        fixture.client.shutdown_for_upgrade().await.expect("shutdown"),
        ["session/worker/fresh will start a new conversation"]
    );
}

#[tokio::test(flavor = "local")]
async fn shutdown_waits_for_admitted_mutations_before_checking_sessions() {
    let fixture = api();
    let gate = Rc::new(Notify::new());
    *fixture.upgrade_gates.prompt.borrow_mut() = Some(gate.clone());
    let prompt_client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let shutdown_client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let started = fixture.upgrade_gates.prompt_started.notified();
    let prompt = tokio::task::spawn_local(async move {
        prompt_client
            .prompt_session(
                "worker",
                agent::sessions::SessionName::new("s1").expect("name"),
                "start work".into(),
                false,
                None,
            )
            .await
    });
    started.await;

    let shutdown = tokio::task::spawn_local(async move { shutdown_client.shutdown_for_upgrade().await });
    tokio::task::yield_now().await;
    assert!(!shutdown.is_finished(), "shutdown passed the pending prompt");

    gate.notify_one();
    prompt.await.expect("prompt task").expect("prompt response");
    let error = shutdown
        .await
        .expect("shutdown task")
        .expect_err("new work blocks shutdown");
    assert!(matches!(error, Error::Rpc(error) if error.is_invalid_params()));
    fixture
        .client
        .health()
        .await
        .expect("rejected shutdown restores admission");
}

#[tokio::test(flavor = "local")]
async fn shutdown_rejects_reported_work_before_waiting_for_admitted_mutations() {
    let fixture = api();
    let gate = Rc::new(Notify::new());
    *fixture.upgrade_gates.prompt.borrow_mut() = Some(gate.clone());
    let prompt_client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let shutdown_client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let started = fixture.upgrade_gates.prompt_started.notified();
    let prompt = tokio::task::spawn_local(async move {
        prompt_client
            .prompt_session(
                "worker",
                agent::sessions::SessionName::new("s1").expect("name"),
                "continue work".into(),
                true,
                Some(Duration::from_secs(10)),
            )
            .await
    });
    started.await;
    fixture
        .upgrade_blockers
        .borrow_mut()
        .push("session/worker/s1 (working)".into());

    let error = tokio::time::timeout(Duration::from_secs(1), shutdown_client.shutdown_for_upgrade())
        .await
        .expect("shutdown should inspect reported work without draining the prompt")
        .expect_err("reported work blocks shutdown");
    assert!(matches!(error, Error::Rpc(error) if error.is_invalid_params()));
    assert!(
        !prompt.is_finished(),
        "rejected shutdown must not wait for the active prompt"
    );
    fixture.client.health().await.expect("daemon remains available");

    gate.notify_one();
    prompt.await.expect("prompt task").expect("prompt response");
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn shutdown_preparation_has_one_deadline_and_restores_admission() {
    let fixture = api();
    let prompt_gate = Rc::new(Notify::new());
    let readiness_gate = Rc::new(Notify::new());
    *fixture.upgrade_gates.prompt.borrow_mut() = Some(prompt_gate.clone());
    *fixture.upgrade_gates.readiness.borrow_mut() = Some(readiness_gate);
    let prompt_client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let shutdown_client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let prompt_started = fixture.upgrade_gates.prompt_started.notified();
    let prompt = tokio::task::spawn_local(async move {
        prompt_client
            .prompt_session(
                "worker",
                agent::sessions::SessionName::new("s1").expect("name"),
                "start work".into(),
                false,
                None,
            )
            .await
    });
    prompt_started.await;

    let shutdown = tokio::task::spawn_local(async move { shutdown_client.shutdown_for_upgrade().await });
    tokio::task::yield_now().await;
    tokio::time::advance(Duration::from_secs(59)).await;
    prompt_gate.notify_one();
    prompt.await.expect("prompt task").expect("prompt response");
    fixture.upgrade_gates.readiness_started.notified().await;
    tokio::time::advance(Duration::from_secs(2)).await;

    let error = shutdown
        .await
        .expect("shutdown task")
        .expect_err("preparation exceeds its shared deadline");
    assert!(error.to_string().contains("did not finish preparing"));
    *fixture.upgrade_gates.prompt.borrow_mut() = None;
    fixture
        .client
        .prompt_session(
            "worker",
            agent::sessions::SessionName::new("s2").expect("name"),
            "still admitted".into(),
            false,
            None,
        )
        .await
        .expect("timed out shutdown restores admission");
}

fn request(name: &str) -> ApplyRequest {
    ApplyRequest {
        source_directory: std::env::temp_dir().join("agent-platform-source"),
        manifest_path: None,
        env_file: None,
        create_only: false,
        agent: agent(name),
    }
}

#[tokio::test(flavor = "local")]
async fn client_and_server_exchange_versioned_agent_operations() {
    let fixture = api();
    let client = &fixture.client;
    let applied = client.apply(request("worker")).await.expect("apply");
    let fetched = client.get("worker").await.expect("get");
    assert_eq!(applied, fetched);
    assert_eq!(client.list_agents().await.expect("list"), vec![applied.clone()]);
    assert_eq!(
        client
            .resolve_agent(request("worker").source_directory.join("nested"))
            .await
            .expect("resolve source"),
        applied
    );
    let execution = client
        .ensure_execution("worker", Policy::FirstPass)
        .await
        .expect("execution target");
    assert_eq!(execution.operating_system, "linux");
    assert_eq!(execution.sandbox.provider().as_str(), "memory");
    assert!(client.list_sessions(None).await.expect("list all Sessions").is_empty());
    let request = agent::sessions::SessionRequest {
        harness: Some(agent::Harness::ClaudeCode),
        model_selection: agent::ModelSelection {
            model: Some(agent::Model::new("claude-fable-5").expect("model")),
            effort: Some(agent::Effort::new("xhigh").expect("effort")),
        },
        initial_prompt: None,
    };
    let ensure_error = client
        .ensure_session(
            "worker",
            agent::sessions::SessionName::new("s1").expect("Session name"),
            request.clone(),
        )
        .await
        .expect_err("fake Session ensure should fail after decoding parameters");
    assert!(matches!(ensure_error, Error::Rpc(error) if error.code == -32004));
    let omitted = client
        .ensure_session(
            "worker",
            agent::sessions::SessionName::new("s2").expect("Session name"),
            agent::sessions::SessionRequest::default(),
        )
        .await
        .expect_err("fake Session ensure should fail after decoding parameters");
    assert!(matches!(omitted, Error::Rpc(error) if error.code == -32004));
    assert_eq!(
        fixture.ensured.borrow().as_slice(),
        &[request, agent::sessions::SessionRequest::default()],
        "model and effort travel as opaque values and stay absent when omitted"
    );
    let session_error = client
        .get_session("worker", agent::sessions::SessionName::new("s1").expect("Session name"))
        .await
        .expect_err("missing Session");
    assert!(matches!(session_error, Error::Rpc(error) if error.code == -32004));

    client.delete("worker").await.expect("delete request");
    let deleting = client.get("worker").await.expect("marked resource");
    assert!(deleting.metadata.deletion_timestamp.is_some());
}

#[tokio::test(flavor = "local")]
async fn an_agent_wait_ends_with_the_failure_of_the_pass_it_requested() {
    let fixture = api();
    fixture.client.apply(request("worker")).await.expect("apply");
    *fixture.controller.failure.borrow_mut() = Some((FailureKind::Invalid, "the image does not exist".into()));
    let error = fixture
        .client
        .ensure_execution("worker", Policy::UntilReady)
        .await
        .expect_err("an invalid Agent ends the wait");
    assert!(
        matches!(&error, Error::Rpc(error) if error.is_invalid_params() && error.message == "the image does not exist"),
        "the outcome reads as the daemon reported it: {error}"
    );

    *fixture.controller.failure.borrow_mut() = None;
    fixture
        .client
        .ensure_execution("worker", Policy::UntilReady)
        .await
        .expect("a later pass that succeeds ends the next wait");
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn a_wait_gives_up_once_agentd_has_been_gone_for_a_while() {
    let fixture = api();
    let applied = fixture.client.apply(request("worker")).await.expect("apply");
    // The daemon answers the first watch, then goes away.
    let client = Client::new(Rc::new(GoneAfter {
        inner: InProcessConnector {
            server: fixture.server.clone(),
        },
        calls: Cell::new(1),
    }));
    let request = agent::wait::AgentRequest {
        generation: applied.metadata.generation + 1,
        sync: 0,
    };
    let started = tokio::time::Instant::now();
    let error = client
        .wait_for_agent(applied.metadata.uid.expect("uid"), request, Policy::UntilReady)
        .await
        .expect_err("a daemon that stays away ends the wait");
    assert!(
        error
            .to_string()
            .contains("agentd stopped while this command was waiting"),
        "{error}"
    );
    assert!(started.elapsed() >= Duration::from_secs(10), "{:?}", started.elapsed());
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn a_wait_continues_on_a_restarted_agentd() {
    let fixture = api();
    let id = fixture
        .client
        .apply(request("worker"))
        .await
        .expect("apply")
        .metadata
        .uid
        .expect("uid");
    fixture.controller.hold.set(true);
    let restarted = Rc::new(Server::new(
        Rc::new(ControlPlane::new(
            fixture.controller.store.clone(),
            fixture.controller.clone(),
        )),
        Rc::new(FakeAuthentication),
        Rc::new(FakeExecutions),
        Rc::new(support::Unreachable),
        Rc::new(FakeSshAccess),
        Rc::new(FakeVncAccess),
        // A new process starts a new change history.
        Changes::new(),
        Rc::new(|_| {}),
    ));
    let connector = Rc::new(Restarting {
        before: InProcessConnector {
            server: fixture.server.clone(),
        },
        after: InProcessConnector { server: restarted },
        restarted: Cell::new(false),
        refused: Cell::new(0),
        served_after: Cell::new(0),
    });
    let client = Client::new(connector.clone());
    let wait = tokio::task::spawn_local(async move { client.ensure_execution("worker", Policy::UntilReady).await });
    tokio::time::sleep(Duration::from_secs(1)).await;
    assert!(!wait.is_finished(), "the requested pass has not run");

    // agentd drains for an upgrade, is gone for two connections, then a new
    // process answers; the requested pass runs meanwhile.
    connector.restarted.set(true);
    connector.refused.set(2);
    fixture.client.shutdown_for_upgrade().await.expect("drain");
    fixture.controller.hold.set(false);
    fixture.controller.wake(id).await.expect("the requested pass");

    let target = tokio::time::timeout(Duration::from_mins(1), wait)
        .await
        .expect("the wait ends on the new daemon")
        .expect("wait task")
        .expect("execution target");
    assert_eq!(target.operating_system, "linux");
    assert_eq!(connector.refused.get(), 0, "the wait reconnected");
    assert!(connector.served_after.get() >= 2, "the new daemon answered the wait");
}

/// Connects to `before` until `restarted`, then refuses `refused` connections
/// and connects to `after`.
struct Restarting {
    before: InProcessConnector,
    after: InProcessConnector,
    restarted: Cell<bool>,
    refused: Cell<usize>,
    served_after: Cell<usize>,
}

impl Connector for Restarting {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            if !self.restarted.get() {
                return self.before.connect().await;
            }
            if self.refused.get() > 0 {
                self.refused.set(self.refused.get() - 1);
                return Err(Error::Io(std::io::ErrorKind::ConnectionRefused.into()));
            }
            self.served_after.set(self.served_after.get() + 1);
            self.after.connect().await
        })
    }
}

/// Connects `calls` times, then fails as a stopped daemon's socket does.
struct GoneAfter {
    inner: InProcessConnector,
    calls: Cell<usize>,
}

impl Connector for GoneAfter {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            if self.calls.get() == 0 {
                return Err(Error::Io(std::io::ErrorKind::ConnectionRefused.into()));
            }
            self.calls.set(self.calls.get() - 1);
            self.inner.connect().await
        })
    }
}

#[tokio::test(flavor = "local")]
async fn resource_watch_returns_current_state_then_waits_for_the_next_change() {
    let fixture = api();
    let initial = fixture
        .client
        .watch(None, agent::resources::Selector::default())
        .await
        .expect("initial state");
    assert!(initial.agents.is_empty());
    assert!(initial.sessions.is_empty());

    let watcher = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let revision = initial.revision;
    let watch = tokio::task::spawn_local(async move {
        watcher
            .watch(Some(revision), agent::resources::Selector::default())
            .await
    });
    tokio::task::yield_now().await;
    assert!(!watch.is_finished(), "a current revision waits for a change");

    let applied = fixture.client.apply(request("worker")).await.expect("apply");
    fixture.changes.bump();
    let changed = watch.await.expect("watch task").expect("changed state");
    assert_ne!(changed.revision, revision);
    assert_eq!(changed.agents, vec![applied]);
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn resource_watch_replies_unchanged_after_the_keepalive() {
    let fixture = api();
    let current = fixture
        .client
        .watch(None, agent::resources::Selector::default())
        .await
        .expect("initial state");
    let started = tokio::time::Instant::now();
    let unchanged = fixture
        .client
        .watch(Some(current.revision), agent::resources::Selector::default())
        .await
        .expect("keepalive state");
    assert_eq!(
        (unchanged.revision, unchanged.agents, unchanged.sessions),
        (current.revision, current.agents, current.sessions)
    );
    assert!(unchanged.now >= current.now, "the reply reads the daemon's clock again");
    assert_eq!(started.elapsed(), Duration::from_secs(30));
}

#[tokio::test(flavor = "local")]
async fn resource_watch_neither_holds_nor_outlives_an_upgrade_drain() {
    let fixture = api();
    let current = fixture
        .client
        .watch(None, agent::resources::Selector::default())
        .await
        .expect("initial state");
    let watcher = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let watch = tokio::task::spawn_local(async move {
        watcher
            .watch(Some(current.revision), agent::resources::Selector::default())
            .await
    });
    tokio::task::yield_now().await;

    fixture
        .client
        .shutdown_for_upgrade()
        .await
        .expect("a pending watch is not an admitted mutation");
    let released = watch.await.expect("watch task").expect("state on drain");
    assert_eq!(released.revision, current.revision);
}

#[tokio::test(flavor = "local")]
async fn agent_progress_returns_the_status_then_waits_for_the_next_change() {
    let fixture = api();
    fixture.client.apply(request("worker")).await.expect("apply");
    let current = fixture
        .client
        .agent_progress("worker", None, None)
        .await
        .expect("current progress");
    assert!(current.provisioning.is_none(), "no pass has run");
    assert!(current.status.conditions.is_empty());

    let follower = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let revision = current.revision;
    let follow = tokio::task::spawn_local(async move { follower.agent_progress("worker", Some(revision), None).await });
    tokio::task::yield_now().await;
    assert!(!follow.is_finished(), "a current revision waits for a change");
    fixture.changes.bump();
    let changed = follow.await.expect("follow task").expect("changed progress");
    assert_ne!(changed.revision, revision);

    let missing = fixture
        .client
        .agent_progress("missing", None, None)
        .await
        .expect_err("unknown Agent");
    assert!(matches!(missing, Error::Rpc(error) if error.is_not_found()));
}

#[tokio::test(flavor = "local")]
async fn a_frame_that_is_not_the_response_fails_the_call() {
    let notification = ScriptedConnector {
        frames: concat!(r#"{"jsonrpc":"2.0","method":"progress.v1.event","params":{}}"#, "\n"),
    };
    let client = Client::new(Rc::new(notification));
    let error = client
        .ensure_execution("worker", Policy::UntilReady)
        .await
        .expect_err("a notification is not a response");
    assert!(matches!(error, Error::Json(_)), "unexpected error: {error}");
}

#[tokio::test(flavor = "local")]
async fn application_errors_keep_stable_protocol_codes() {
    let fixture = api();
    let error = fixture
        .client
        .get("missing")
        .await
        .expect_err("missing Agent should fail");

    match error {
        Error::Rpc(error) => assert_eq!(error.code, -32004),
        other => panic!("unexpected error: {other}"),
    }
}

#[tokio::test(flavor = "local")]
async fn malformed_and_idle_connections_do_not_block_other_clients() {
    let fixture = api();
    let server = fixture.server;
    let client = fixture.client;
    client.apply(request("worker")).await.expect("apply");

    let (mut malformed_client, malformed_server) = tokio::io::duplex(1024);
    let malformed_api = server.clone();
    tokio::task::spawn_local(async move {
        let _ignored = malformed_api.serve_connection(malformed_server).await;
    });
    malformed_client
        .write_all(b"{not-json}\n")
        .await
        .expect("write malformed request");
    let mut response = String::new();
    BufReader::new(&mut malformed_client)
        .read_line(&mut response)
        .await
        .expect("read parse error");
    assert!(response.contains("-32700"));

    let (_idle_client, idle_server) = tokio::io::duplex(1024);
    let idle_api = server;
    tokio::task::spawn_local(async move {
        let _ignored = idle_api.serve_connection(idle_server).await;
    });
    let fetched = tokio::time::timeout(Duration::from_secs(1), client.get("worker"))
        .await
        .expect("active client should not wait for idle connection")
        .expect("get");
    assert_eq!(fetched.metadata.name, "worker");
}

#[tokio::test(flavor = "local")]
async fn session_ensure_rejects_invalid_selections_before_reaching_the_service() {
    let fixture = api();
    let (mut raw_client, raw_server) = tokio::io::duplex(4096);
    let api = fixture.server.clone();
    tokio::task::spawn_local(async move {
        let _ignored = api.serve_connection(raw_server).await;
    });
    let mut reader = BufReader::new(&mut raw_client);
    for (id, params) in [
        (1, r#"{"agent":"worker","name":"s1","model_selection":{"model":""}}"#),
        (
            2,
            r#"{"agent":"worker","name":"s1","model_selection":{"effort":"very high"}}"#,
        ),
    ] {
        let request = format!(r#"{{"jsonrpc":"2.0","id":{id},"method":"sessions.v1.ensure","params":{params}}}"#);
        reader
            .get_mut()
            .write_all(format!("{request}\n").as_bytes())
            .await
            .expect("write request");
        let mut response = String::new();
        reader.read_line(&mut response).await.expect("read response");
        let response: serde_json::Value = serde_json::from_str(&response).expect("JSON-RPC response");
        assert_eq!(response["error"]["code"], -32602, "{response}");
        let message = response["error"]["message"].as_str().expect("message");
        assert!(
            message.contains("must be 1-128 ASCII letters"),
            "the validation failure names the rule: {message}"
        );
    }
    assert!(fixture.ensured.borrow().is_empty());
}

#[cfg(unix)]
#[tokio::test(flavor = "local")]
async fn unix_socket_transport_is_private_and_usable() {
    use std::os::unix::fs::PermissionsExt;

    let temporary = tempfile::Builder::new()
        .prefix("agent-api-")
        .tempdir()
        .expect("temporary API directory");
    let socket_path = temporary.path().join("p").join("agentd.sock");
    let fixture = api();
    let server = fixture.server;
    let served_path = socket_path.clone();
    let mut server_task = tokio::task::spawn_local(async move { server.serve_path(&served_path).await });
    let wait_for_socket = tokio::time::timeout(Duration::from_secs(1), async {
        while !socket_path.exists() {
            tokio::task::yield_now().await;
        }
    });
    tokio::select! {
        result = &mut server_task => panic!("server stopped before creating its socket: {result:?}"),
        result = wait_for_socket => result.expect("socket should be created"),
    }

    let client = Client::for_path(socket_path.clone());
    let applied = client.apply(request("worker")).await.expect("apply over Unix socket");
    assert_eq!(applied.metadata.name, "worker");

    let directory_mode = std::fs::metadata(socket_path.parent().expect("socket parent"))
        .expect("directory metadata")
        .permissions()
        .mode()
        & 0o777;
    let socket_mode = std::fs::metadata(&socket_path)
        .expect("socket metadata")
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(directory_mode, 0o700);
    assert_eq!(socket_mode, 0o600);
    client.shutdown_for_upgrade().await.expect("graceful shutdown");
    tokio::time::timeout(Duration::from_secs(1), &mut server_task)
        .await
        .expect("server should stop")
        .expect("server task")
        .expect("server result");
}
