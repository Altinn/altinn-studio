#![allow(clippy::expect_used, clippy::panic)]

mod support;

use std::{cell::RefCell, rc::Rc, time::Duration};

use agent::{
    Error,
    control_api::{
        AuthenticationApi, Client, Connection, Connector, ExecutionApi, Server, SessionApi, SshAccessApi, VncAccessApi,
    },
    control_plane::WaitPolicy,
    control_plane::{ApplyRequest, ControlPlane, Notifier, memory::InMemoryAgentStore},
    harness::ImportedAuthentication,
    resources::Changes,
};
use sandbox::LocalFuture;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    sync::Notify,
};

use support::agent;

struct IgnoreNotifications;

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
/// One `sessions.v1.prompt` as the fake saw it: prompt, wait flag, timeout.
type SentMessage = (String, bool, Option<std::time::Duration>);

#[derive(Default)]
struct UpgradeGates {
    prompt: RefCell<Option<Rc<Notify>>>,
    prompt_started: Notify,
    readiness: RefCell<Option<Rc<Notify>>>,
    readiness_started: Notify,
}

struct FakeSessions {
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

impl Notifier for IgnoreNotifications {
    fn notify(&self, _id: agent::AgentId) {}
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
        _wait: WaitPolicy,
    ) -> LocalFuture<'a, Result<agent::sessions::AttachTarget, Error>> {
        self.ensured.borrow_mut().push(request);
        Box::pin(async { Err(Error::NotFound) })
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
        _name: &'a agent::sessions::SessionName,
        prompt: &'a str,
        wait: bool,
        timeout: Option<std::time::Duration>,
    ) -> LocalFuture<'a, Result<(), Error>> {
        self.sent.borrow_mut().push((prompt.to_owned(), wait, timeout));
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
            Ok(())
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
    ) -> LocalFuture<'a, Result<agent::sessions::Session, Error>> {
        self.archived
            .borrow_mut()
            .push((agent.to_owned(), name.clone(), archived));
        Box::pin(async move {
            if agent != "worker" {
                return Err(Error::NotFound);
            }
            let session = serde_json::json!({
                "id": "00000000-0000-4000-8000-000000000001",
                "agentId": "00000000-0000-4000-8000-000000000002",
                "agent": agent,
                "name": name,
                "harness": "claudeCode",
                "createdAt": "2026-09-25T00:00:00Z",
                "archivedAt": archived.then_some("2026-09-25T00:00:01Z"),
            });
            Ok(serde_json::from_value(session).expect("archived Session"))
        })
    }

    fn delete<'a>(
        &'a self,
        agent: &'a str,
        name: &'a agent::sessions::SessionName,
    ) -> LocalFuture<'a, Result<(), Error>> {
        self.deleted.borrow_mut().push((agent.to_owned(), name.clone()));
        Box::pin(async move {
            if agent == "worker" {
                Ok(())
            } else {
                Err(Error::NotFound)
            }
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
    fn ensure<'a>(
        &'a self,
        name: &'a str,
        _wait: WaitPolicy,
    ) -> LocalFuture<'a, Result<agent::sandbox::ExecutionTarget, Error>> {
        Box::pin(async move {
            if name != "worker" {
                return Err(Error::NotFound);
            }
            Ok(agent::sandbox::ExecutionTarget {
                sandbox: agent::sandbox::Assignment::Materialized {
                    provider: agent::sandbox::ProviderId::new("memory")?,
                    id: "ca4e2f21-91d9-43f1-97c6-13f0f350fbe7"
                        .parse()
                        .map_err(|error| Error::Invalid(format!("invalid test Sandbox ID: {error}")))?,
                    harnesses: Vec::new(),
                },
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
    let control_plane = Rc::new(ControlPlane::new(
        Rc::new(InMemoryAgentStore::new()),
        Rc::new(IgnoreNotifications),
    ));
    let ensured = Rc::new(RefCell::new(Vec::new()));
    let sent = Rc::new(RefCell::new(Vec::new()));
    let deleted = Rc::new(RefCell::new(Vec::new()));
    let archived = Rc::new(RefCell::new(Vec::new()));
    let observed_errors = Rc::new(RefCell::new(Vec::new()));
    let changes = Changes::new();
    let upgrade_blockers = Rc::new(RefCell::new(Vec::new()));
    let upgrade_warnings = Rc::new(RefCell::new(Vec::new()));
    let upgrade_gates = Rc::new(UpgradeGates::default());
    let server = Rc::new(Server::new(
        control_plane,
        Rc::new(FakeAuthentication),
        Rc::new(FakeExecutions),
        Rc::new(FakeSessions {
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

struct DelayedConnector {
    inner: InProcessConnector,
}

impl Connector for DelayedConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            tokio::time::sleep(Duration::from_millis(100)).await;
            self.inner.connect().await
        })
    }
}

#[tokio::test(flavor = "local")]
async fn prompt_completion_timeout_is_unchanged_by_transit() {
    let fixture = api();
    let client = Client::new(Rc::new(DelayedConnector {
        inner: InProcessConnector {
            server: fixture.server.clone(),
        },
    }));
    client
        .prompt_session(
            "worker",
            agent::sessions::SessionName::new("s1").expect("name"),
            "go".into(),
            true,
            Some(Duration::from_millis(20)),
        )
        .await
        .expect("delivered");
    assert_eq!(
        fixture.sent.borrow().as_slice(),
        [("go".into(), true, Some(Duration::from_millis(20)))]
    );
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
    {
        let sent = fixture.sent.borrow();
        assert_eq!(sent.len(), 2);
        assert_eq!((&sent[0].0, sent[0].1), (&"do it".to_owned(), true));
        assert_eq!(sent[0].2, Some(Duration::from_secs(90)));
        assert_eq!(sent[1], ("fire and forget".to_owned(), false, None));
    }

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
    assert_eq!(daemon.protocol_version.as_deref(), Some("v4"));
    assert_eq!(daemon.build_version.as_deref(), Some(agent::build_version()));
}

#[test]
fn daemon_identity_rejects_preview_1_and_mixed_builds() {
    let extended: agent::control_api::DaemonInfo = serde_json::from_value(serde_json::json!({
        "protocolVersion": "v4",
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
            protocol_version: Some("v4".into()),
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
        .ensure_execution("worker", WaitPolicy::FirstPass)
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
            WaitPolicy::FirstPass,
        )
        .await
        .expect_err("fake Session ensure should fail after decoding parameters");
    assert!(matches!(ensure_error, Error::Rpc(error) if error.code == -32004));
    let omitted = client
        .ensure_session(
            "worker",
            agent::sessions::SessionName::new("s2").expect("Session name"),
            agent::sessions::SessionRequest::default(),
            WaitPolicy::FirstPass,
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
async fn resource_watch_returns_current_state_then_waits_for_the_next_change() {
    let fixture = api();
    let initial = fixture.client.watch_resources(None).await.expect("initial state");
    assert!(initial.agents.is_empty());
    assert!(initial.sessions.is_empty());

    let watcher = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let revision = initial.revision;
    let watch = tokio::task::spawn_local(async move { watcher.watch_resources(Some(revision)).await });
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
    let current = fixture.client.watch_resources(None).await.expect("initial state");
    let started = tokio::time::Instant::now();
    let unchanged = fixture
        .client
        .watch_resources(Some(current.revision))
        .await
        .expect("keepalive state");
    assert_eq!(unchanged, current);
    assert_eq!(started.elapsed(), Duration::from_secs(30));
}

#[tokio::test(flavor = "local")]
async fn resource_watch_neither_holds_nor_outlives_an_upgrade_drain() {
    let fixture = api();
    let current = fixture.client.watch_resources(None).await.expect("initial state");
    let watcher = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
    }));
    let watch = tokio::task::spawn_local(async move { watcher.watch_resources(Some(current.revision)).await });
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
        .ensure_execution("worker", WaitPolicy::UntilReady)
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
