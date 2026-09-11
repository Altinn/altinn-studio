#![allow(clippy::expect_used, clippy::panic)]

mod support;

use std::{
    cell::{Cell, RefCell},
    rc::Rc,
    time::Duration,
};

use agent::{
    Error,
    control_api::{AuthenticationApi, Client, Connection, Connector, ExecutionApi, Server, SessionApi},
    control_plane::WaitPolicy,
    control_plane::{ApplyRequest, ControlPlane, Notifier, memory::InMemoryAgentStore},
    harness::ImportedAuthentication,
    progress::Reporter,
};
use sandbox::LocalFuture;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use support::agent;

struct IgnoreNotifications;

struct FakeAuthentication;
struct FakeExecutions {
    progress_ensures: Rc<Cell<usize>>,
}
/// One `sessions.v1.prompt` as the fake saw it: prompt, wait flag, timeout.
type SentMessage = (String, bool, Option<std::time::Duration>);

struct FakeSessions {
    ensured_harnesses: Rc<RefCell<Vec<Option<agent::Harness>>>>,
    sent: Rc<RefCell<Vec<SentMessage>>>,
    upgrade_blockers: Rc<RefCell<Vec<String>>>,
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
        harness: Option<agent::Harness>,
        _initial_prompt: Option<&'a str>,
        _wait: WaitPolicy,
        _progress: Option<Reporter>,
    ) -> LocalFuture<'a, Result<agent::sessions::AttachTarget, Error>> {
        self.ensured_harnesses.borrow_mut().push(harness);
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
        Box::pin(async move {
            if agent != "worker" {
                return Err(Error::NotFound);
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

    fn upgrade_blockers(&self) -> LocalFuture<'_, Result<Vec<String>, Error>> {
        let blockers = self.upgrade_blockers.borrow().clone();
        Box::pin(async move { Ok(blockers) })
    }
}

impl ExecutionApi for FakeExecutions {
    fn ensure<'a>(
        &'a self,
        name: &'a str,
        _wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> LocalFuture<'a, Result<agent::sandbox::ExecutionTarget, Error>> {
        if let Some(progress) = progress {
            self.progress_ensures.set(self.progress_ensures.get() + 1);
            progress(agent::progress::Event::PhaseStarted {
                phase: agent::progress::Phase::ImagePrepare,
                message: "Prepare Sandbox Image".into(),
            });
        }
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
    ensured_harnesses: Rc<RefCell<Vec<Option<agent::Harness>>>>,
    sent: Rc<RefCell<Vec<SentMessage>>>,
    progress_ensures: Rc<Cell<usize>>,
    upgrade_blockers: Rc<RefCell<Vec<String>>>,
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
    let ensured_harnesses = Rc::new(RefCell::new(Vec::new()));
    let sent = Rc::new(RefCell::new(Vec::new()));
    let observed_errors = Rc::new(RefCell::new(Vec::new()));
    let progress_ensures = Rc::new(Cell::new(0));
    let upgrade_blockers = Rc::new(RefCell::new(Vec::new()));
    let server = Rc::new(Server::new(
        control_plane,
        Rc::new(FakeAuthentication),
        Rc::new(FakeExecutions {
            progress_ensures: progress_ensures.clone(),
        }),
        Rc::new(FakeSessions {
            ensured_harnesses: ensured_harnesses.clone(),
            sent: sent.clone(),
            upgrade_blockers: upgrade_blockers.clone(),
        }),
        Rc::new(move |error| observed_errors.borrow_mut().push(error.to_string())),
    ));
    let client = Client::new(Rc::new(InProcessConnector { server: server.clone() }));
    ApiFixture {
        server,
        client,
        ensured_harnesses,
        sent,
        progress_ensures,
        upgrade_blockers,
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
    assert_eq!(daemon.protocol_version.as_deref(), Some("v2"));
    assert_eq!(daemon.build_version.as_deref(), Some(agent::build_version()));
}

#[test]
fn daemon_identity_rejects_preview_1_and_mixed_builds() {
    for daemon in [
        agent::control_api::DaemonInfo {
            protocol_version: Some("v1".into()),
            build_version: None,
        },
        agent::control_api::DaemonInfo {
            protocol_version: Some("v2".into()),
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
        .ensure_execution("worker", WaitPolicy::FirstPass, None)
        .await
        .expect("execution target");
    assert_eq!(fixture.progress_ensures.get(), 0);
    assert_eq!(execution.operating_system, "linux");
    assert_eq!(execution.sandbox.provider().as_str(), "memory");
    assert!(client.list_sessions(None).await.expect("list all Sessions").is_empty());
    let ensure_error = client
        .ensure_session(
            "worker",
            agent::sessions::SessionName::new("s1").expect("Session name"),
            Some(agent::Harness::ClaudeCode),
            None,
            WaitPolicy::FirstPass,
            None,
        )
        .await
        .expect_err("fake Session ensure should fail after decoding parameters");
    assert!(matches!(ensure_error, Error::Rpc(error) if error.code == -32004));
    assert_eq!(
        fixture.ensured_harnesses.borrow().as_slice(),
        &[Some(agent::Harness::ClaudeCode)]
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
async fn opted_in_ensure_routes_notifications_before_the_matching_response() {
    let fixture = api();
    let events = Rc::new(RefCell::new(Vec::new()));
    let observed = events.clone();
    let target = fixture
        .client
        .ensure_execution(
            "worker",
            WaitPolicy::UntilReady,
            Some(&mut |event| observed.borrow_mut().push(event)),
        )
        .await
        .expect("streaming execution target");

    assert_eq!(target.operating_system, "linux");
    assert_eq!(fixture.progress_ensures.get(), 1);
    assert_eq!(
        events.borrow().as_slice(),
        &[agent::progress::Event::PhaseStarted {
            phase: agent::progress::Phase::ImagePrepare,
            message: "Prepare Sandbox Image".into(),
        }]
    );
}

#[tokio::test(flavor = "local")]
async fn unknown_notifications_are_skipped_but_malformed_frames_fail_the_call() {
    let unknown = ScriptedConnector {
        frames: concat!(
            r#"{"jsonrpc":"2.0","method":"progress.v1.event","params":{"type":"fromTheFuture"}}"#,
            "\n",
            r#"{"jsonrpc":"2.0","method":"telemetry.v2.sample","params":{}}"#,
            "\n",
            r#"{"jsonrpc":"2.0","id":1,"result":{"sandbox":{"state":"materialized","provider":"memory","id":"ca4e2f21-91d9-43f1-97c6-13f0f350fbe7"},"operatingSystem":"linux"}}"#,
            "\n",
        ),
    };
    let client = Client::new(Rc::new(unknown));
    let mut event_count = 0;
    let target = client
        .ensure_execution("worker", WaitPolicy::UntilReady, Some(&mut |_| event_count += 1))
        .await
        .expect("response after unknown notifications");
    assert_eq!(event_count, 0);
    assert_eq!(target.operating_system, "linux");

    let malformed = ScriptedConnector {
        frames: concat!(r#"{"jsonrpc":"2.0","method":"progress.v1.event","params":{"#, "\n"),
    };
    let client = Client::new(Rc::new(malformed));
    let error = client
        .ensure_execution("worker", WaitPolicy::UntilReady, Some(&mut |_| {}))
        .await
        .expect_err("corrupted frame is a protocol error");
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
