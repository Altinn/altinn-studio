#![allow(clippy::expect_used, clippy::panic)]

mod support;

use std::{
    cell::{Cell, RefCell},
    rc::Rc,
    time::Duration,
};

use agent::{
    Error,
    control_api::{
        AttachmentApi, AuthenticationApi, Caller, Client, Connection, Connector, ExecutionApi, PortForwardApi, Server,
        SessionApi, TcpEndpoint,
    },
    control_plane::{ApplyRequest, ControlPlane, Notifier, memory::InMemoryAgentStore},
    harness::ImportedAuthentication,
};
use sandbox::{LocalFuture, terminal::TerminalControl};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use support::agent;

struct IgnoreNotifications;

struct FakeAuthentication {
    login_count: Rc<Cell<usize>>,
}
struct FakeExecutions;
struct FakeAttachments;
struct FakePortForwards;
struct FakeSessions {
    ensured_harnesses: Rc<RefCell<Vec<Option<agent::Harness>>>>,
}

struct NoopTerminalControl;

struct FinishedPortForward {
    spec: agent::sandbox::PortForwardSpec,
    local_address: std::net::SocketAddr,
}

impl agent::sandbox::RunningPortForward for FinishedPortForward {
    fn spec(&self) -> &agent::sandbox::PortForwardSpec {
        &self.spec
    }

    fn local_address(&self) -> std::net::SocketAddr {
        self.local_address
    }

    fn status(&self) -> Option<String> {
        Some("listener stopped for test".into())
    }

    fn finished(&self) -> bool {
        true
    }
}

impl PortForwardApi for FakePortForwards {
    fn start<'a>(
        &'a self,
        _agent: &'a str,
        specs: Vec<agent::sandbox::PortForwardSpec>,
    ) -> LocalFuture<'a, Result<Vec<Rc<dyn agent::sandbox::RunningPortForward>>, Error>> {
        Box::pin(async move {
            specs
                .into_iter()
                .enumerate()
                .map(|(index, spec)| {
                    let offset = u16::try_from(index).map_err(|_| Error::Invalid("too many test forwards".into()))?;
                    let port = 54_321_u16
                        .checked_add(offset)
                        .ok_or_else(|| Error::Invalid("too many test forwards".into()))?;
                    Ok(Rc::new(FinishedPortForward {
                        spec,
                        local_address: std::net::SocketAddr::from(([127, 0, 0, 1], port)),
                    }) as Rc<dyn agent::sandbox::RunningPortForward>)
                })
                .collect()
        })
    }
}

impl TerminalControl for NoopTerminalControl {
    fn write_input(&self, _bytes: bytes::Bytes) -> LocalFuture<'_, Result<(), sandbox::Error>> {
        Box::pin(async { Ok(()) })
    }

    fn close_input(&self) -> LocalFuture<'_, Result<(), sandbox::Error>> {
        Box::pin(async { Ok(()) })
    }

    fn resize(&self, _size: sandbox::terminal::TerminalSize) -> LocalFuture<'_, Result<(), sandbox::Error>> {
        Box::pin(async { Ok(()) })
    }
}

struct EchoAttachments {
    requests: Rc<RefCell<Vec<(String, agent::sessions::SessionName, sandbox::terminal::TerminalSize)>>>,
    resizes: Rc<RefCell<Vec<sandbox::terminal::TerminalSize>>>,
}

struct EchoTerminalControl {
    events: tokio::sync::mpsc::UnboundedSender<Result<sandbox::terminal::TerminalEvent, sandbox::Error>>,
    resizes: Rc<RefCell<Vec<sandbox::terminal::TerminalSize>>>,
}

impl TerminalControl for EchoTerminalControl {
    fn write_input(&self, bytes: bytes::Bytes) -> LocalFuture<'_, Result<(), sandbox::Error>> {
        Box::pin(async move {
            self.events
                .send(Ok(sandbox::terminal::TerminalEvent::Output(bytes)))
                .map_err(|_| sandbox::Error::Backend("test terminal event receiver closed".into()))
        })
    }

    fn close_input(&self) -> LocalFuture<'_, Result<(), sandbox::Error>> {
        Box::pin(async move {
            self.events
                .send(Ok(sandbox::terminal::TerminalEvent::Exited(
                    sandbox::execution::ExitStatus { code: 0 },
                )))
                .map_err(|_| sandbox::Error::Backend("test terminal event receiver closed".into()))
        })
    }

    fn resize(&self, size: sandbox::terminal::TerminalSize) -> LocalFuture<'_, Result<(), sandbox::Error>> {
        self.resizes.borrow_mut().push(size);
        Box::pin(async { Ok(()) })
    }
}

impl AttachmentApi for EchoAttachments {
    fn attach<'a>(
        &'a self,
        agent: &'a str,
        name: &'a agent::sessions::SessionName,
        initial_size: sandbox::terminal::TerminalSize,
    ) -> LocalFuture<'a, Result<sandbox::terminal::StartedTerminalExecution, Error>> {
        self.requests
            .borrow_mut()
            .push((agent.into(), name.clone(), initial_size));
        let resizes = self.resizes.clone();
        Box::pin(async move {
            let (events, receiver) = tokio::sync::mpsc::unbounded_channel();
            let stream = futures_util::stream::unfold(receiver, |mut receiver| async move {
                receiver.recv().await.map(|event| (event, receiver))
            });
            Ok(sandbox::terminal::StartedTerminalExecution {
                id: "8203fc76-986b-4b53-a953-14cbc80f84e9"
                    .parse()
                    .map_err(|error| Error::Invalid(format!("invalid test Execution ID: {error}")))?,
                control: Rc::new(EchoTerminalControl { events, resizes }),
                events: Box::pin(stream),
            })
        })
    }
}

impl AttachmentApi for FakeAttachments {
    fn attach<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
        _initial_size: sandbox::terminal::TerminalSize,
    ) -> LocalFuture<'a, Result<sandbox::terminal::StartedTerminalExecution, Error>> {
        Box::pin(async { Err(Error::NotFound) })
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
    ) -> LocalFuture<'a, Result<ImportedAuthentication, Error>> {
        self.login_count.set(self.login_count.get() + 1);
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
    ) -> LocalFuture<'a, Result<agent::sessions::Session, Error>> {
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
}

impl ExecutionApi for FakeExecutions {
    fn ensure<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<agent::sandbox::ExecutionTarget, Error>> {
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

    fn start<'a>(
        &'a self,
        name: &'a str,
        _spec: sandbox::execution::ExecutionSpec,
    ) -> LocalFuture<'a, Result<sandbox::execution::StartedExecution, Error>> {
        Box::pin(async move {
            if name != "worker" {
                return Err(Error::NotFound);
            }
            Ok(sandbox::execution::StartedExecution {
                id: "4bb35a5a-0d9d-4614-a8ad-8c847594e606"
                    .parse()
                    .map_err(|error| Error::Invalid(format!("invalid test Execution ID: {error}")))?,
                events: Box::pin(futures_util::stream::iter([
                    Ok(sandbox::execution::ExecutionEvent::Stdout(bytes::Bytes::from_static(
                        b"out\n",
                    ))),
                    Ok(sandbox::execution::ExecutionEvent::Stderr(bytes::Bytes::from_static(
                        b"err\n",
                    ))),
                    Ok(sandbox::execution::ExecutionEvent::Exited(
                        sandbox::execution::ExitStatus { code: 7 },
                    )),
                ])),
            })
        })
    }

    fn start_terminal<'a>(
        &'a self,
        name: &'a str,
        _spec: sandbox::execution::ExecutionSpec,
        _initial_size: sandbox::terminal::TerminalSize,
    ) -> LocalFuture<'a, Result<sandbox::terminal::StartedTerminalExecution, Error>> {
        Box::pin(async move {
            if name != "worker" {
                return Err(Error::NotFound);
            }
            Ok(sandbox::terminal::StartedTerminalExecution {
                id: "5ace9a78-aec8-488f-a48e-5e38b0a211da"
                    .parse()
                    .map_err(|error| Error::Invalid(format!("invalid test Execution ID: {error}")))?,
                control: Rc::new(NoopTerminalControl),
                events: Box::pin(futures_util::stream::iter([Ok(
                    sandbox::terminal::TerminalEvent::Exited(sandbox::execution::ExitStatus { code: 0 }),
                )])),
            })
        })
    }
}

struct InProcessConnector {
    server: Rc<Server>,
    caller: Caller,
}

struct VersionConnector {
    protocol_version: &'static str,
}

struct ApiFixture {
    server: Rc<Server>,
    client: Client,
    ensured_harnesses: Rc<RefCell<Vec<Option<agent::Harness>>>>,
    login_count: Rc<Cell<usize>>,
}

impl Connector for InProcessConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            let (client, server) = tokio::io::duplex(64 * 1024);
            let api = self.server.clone();
            let caller = self.caller;
            tokio::task::spawn_local(async move {
                let _ignored = api.serve_connection(server, caller).await;
            });
            Ok(Box::new(client) as Box<dyn Connection>)
        })
    }
}

impl Connector for VersionConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            let (client, server) = tokio::io::duplex(4096);
            let protocol_version = self.protocol_version;
            tokio::task::spawn_local(async move {
                let mut server = BufReader::new(server);
                let mut request = String::new();
                server.read_line(&mut request).await.expect("read health request");
                let request: serde_json::Value = serde_json::from_str(&request).expect("decode health request");
                let response = serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": request["id"],
                    "result": { "protocolVersion": protocol_version }
                });
                server
                    .get_mut()
                    .write_all(format!("{response}\n").as_bytes())
                    .await
                    .expect("write health response");
            });
            Ok(Box::new(client) as Box<dyn Connection>)
        })
    }
}

fn api() -> ApiFixture {
    api_with_attachments(Rc::new(FakeAttachments))
}

fn api_with_attachments(attachments: Rc<dyn AttachmentApi>) -> ApiFixture {
    let control_plane = Rc::new(ControlPlane::new(
        Rc::new(InMemoryAgentStore::new()),
        Rc::new(IgnoreNotifications),
    ));
    let ensured_harnesses = Rc::new(RefCell::new(Vec::new()));
    let login_count = Rc::new(Cell::new(0));
    let observed_errors = Rc::new(RefCell::new(Vec::new()));
    let server = Rc::new(Server::new(
        control_plane,
        Rc::new(FakeAuthentication {
            login_count: login_count.clone(),
        }),
        attachments,
        Rc::new(FakeExecutions),
        Rc::new(FakePortForwards),
        Rc::new(FakeSessions {
            ensured_harnesses: ensured_harnesses.clone(),
        }),
        Rc::new(move |error| observed_errors.borrow_mut().push(error.to_string())),
    ));
    let client = Client::new(Rc::new(InProcessConnector {
        server: server.clone(),
        caller: Caller::Local,
    }));
    ApiFixture {
        server,
        client,
        ensured_harnesses,
        login_count,
    }
}

#[tokio::test(flavor = "local")]
async fn terminal_attachment_streams_input_output_completion_and_resizes() {
    let requests = Rc::new(RefCell::new(Vec::new()));
    let captured_sizes = Rc::new(RefCell::new(Vec::new()));
    let fixture = api_with_attachments(Rc::new(EchoAttachments {
        requests: requests.clone(),
        resizes: captured_sizes.clone(),
    }));
    let client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server,
        caller: Caller::RemoteUnauthenticated,
    }));
    let initial_size = sandbox::terminal::TerminalSize::new(42, 120).expect("initial terminal size");
    let mut terminal = client
        .attach_session(
            "worker",
            agent::sessions::SessionName::new("main").expect("Session name"),
            initial_size,
        )
        .await
        .expect("attach terminal");

    terminal.input.write(b"hello\n").await.expect("write input");
    assert_eq!(
        terminal.events.next().await.expect("output event"),
        Some(sandbox::terminal::TerminalEvent::Output(bytes::Bytes::from_static(
            b"hello\n"
        )))
    );
    let requested_size = sandbox::terminal::TerminalSize::new(50, 160).expect("resized terminal size");
    terminal.input.resize(requested_size).await.expect("resize terminal");
    terminal.input.close().await.expect("close terminal input");
    assert_eq!(
        terminal.events.next().await.expect("exit event"),
        Some(sandbox::terminal::TerminalEvent::Exited(
            sandbox::execution::ExitStatus { code: 0 }
        ))
    );
    assert_eq!(
        requests.borrow().as_slice(),
        &[(
            "worker".into(),
            agent::sessions::SessionName::new("main").expect("Session name"),
            initial_size,
        )]
    );
    assert_eq!(captured_sizes.borrow().as_slice(), &[requested_size]);
}

#[tokio::test(flavor = "local")]
async fn login_returns_only_non_secret_readiness() {
    let fixture = api();
    let imported = fixture
        .client
        .auth_login(agent::Harness::ClaudeCode, "sk-ant-oat01-canary".into())
        .await
        .expect("login");
    assert_eq!(imported.provider, "claude");
    assert!(imported.ready);
    assert_eq!(fixture.login_count.get(), 1);
}

#[tokio::test(flavor = "local")]
async fn unauthenticated_remote_callers_cannot_store_credentials() {
    let fixture = api();
    let client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server.clone(),
        caller: Caller::RemoteUnauthenticated,
    }));

    let error = client
        .auth_login(agent::Harness::ClaudeCode, "must-not-be-imported".into())
        .await
        .expect_err("remote login should fail");
    assert!(matches!(error, Error::Rpc(error) if error.code == -32010));
    assert_eq!(fixture.login_count.get(), 0);
}

#[tokio::test(flavor = "local")]
async fn tcp_clients_reject_credentials_before_connecting() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind TCP listener");
    let address = listener.local_addr().expect("TCP listener address").to_string();
    let client = Client::for_tcp(TcpEndpoint::from_address(&address).expect("TCP endpoint"));

    let error = client
        .auth_login(agent::Harness::ClaudeCode, "must-not-be-transmitted".into())
        .await
        .expect_err("TCP credential transfer should fail");

    assert!(matches!(error, Error::Rpc(error) if error.code == -32010));
    assert!(
        tokio::time::timeout(Duration::from_millis(50), listener.accept())
            .await
            .is_err(),
        "the TCP client must reject credentials before opening a connection"
    );
}

#[tokio::test(flavor = "local")]
async fn health_reports_a_compatible_daemon() {
    let fixture = api();
    fixture.client.health().await.expect("health check");
    assert_eq!(agent::control_api::PROTOCOL_VERSION, "v2");
}

#[tokio::test(flavor = "local")]
async fn health_reports_a_distinct_protocol_version_error() {
    let client = Client::new(Rc::new(VersionConnector { protocol_version: "v1" }));

    assert!(matches!(
        client.health().await.expect_err("version mismatch should fail"),
        Error::ControlApiVersion { expected: "v2", actual } if actual == "v1"
    ));
}

fn request(name: &str) -> ApplyRequest {
    ApplyRequest {
        source_directory: std::env::temp_dir().join("agent-platform-source"),
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
    let execution = client.ensure_execution("worker").await.expect("execution target");
    assert_eq!(execution.operating_system, "linux");
    assert_eq!(execution.sandbox.provider().as_str(), "memory");
    assert!(client.list_sessions(None).await.expect("list all Sessions").is_empty());
    let ensure_error = client
        .ensure_session(
            "worker",
            agent::sessions::SessionName::new("s1").expect("Session name"),
            Some(agent::Harness::ClaudeCode),
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
async fn execution_streams_are_connector_independent() {
    let fixture = api();
    let client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server,
        caller: Caller::RemoteUnauthenticated,
    }));
    let spec = sandbox::execution::ExecutionSpec::command(sandbox::SandboxPath::new("/bin/true"), Vec::<String>::new());
    let mut execution = client
        .start_execution("worker", spec.clone())
        .await
        .expect("start Execution");
    assert_eq!(
        execution.events.next().await.expect("stdout event"),
        Some(sandbox::execution::ExecutionEvent::Stdout(bytes::Bytes::from_static(
            b"out\n"
        )))
    );
    assert_eq!(
        execution.events.next().await.expect("stderr event"),
        Some(sandbox::execution::ExecutionEvent::Stderr(bytes::Bytes::from_static(
            b"err\n"
        )))
    );
    assert_eq!(
        execution.events.next().await.expect("exit event"),
        Some(sandbox::execution::ExecutionEvent::Exited(
            sandbox::execution::ExitStatus { code: 7 }
        ))
    );

    let size = sandbox::terminal::TerminalSize::new(24, 80).expect("terminal size");
    let mut terminal = client
        .start_terminal_execution("worker", spec, size)
        .await
        .expect("start terminal Execution");
    assert_eq!(
        terminal.events.next().await.expect("terminal exit"),
        Some(sandbox::terminal::TerminalEvent::Exited(
            sandbox::execution::ExitStatus { code: 0 }
        ))
    );
}

#[tokio::test(flavor = "local")]
async fn port_forwards_are_connector_independent_and_daemon_owned() {
    let fixture = api();
    let client = Client::new(Rc::new(InProcessConnector {
        server: fixture.server,
        caller: Caller::RemoteUnauthenticated,
    }));
    let specs = vec![
        agent::sandbox::PortForwardSpec::new(std::net::IpAddr::from([127, 0, 0, 1]), 0, 3000)
            .expect("port-forward spec"),
    ];
    let mut forwards = client
        .start_port_forwards("worker", specs)
        .await
        .expect("start port forward");

    assert_eq!(forwards.bindings.len(), 1);
    assert_eq!(
        forwards.bindings[0],
        agent::control_api::PortForwardBinding {
            local_address: std::net::SocketAddr::from(([127, 0, 0, 1], 54_321)),
            guest_port: 3000,
        }
    );
    assert_eq!(
        forwards.events.next().await.expect("stopped event"),
        Some(agent::control_api::PortForwardEvent::Stopped {
            index: 0,
            message: Some("listener stopped for test".into()),
        })
    );
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
        let _ignored = malformed_api.serve_connection(malformed_server, Caller::Local).await;
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
        let _ignored = idle_api.serve_connection(idle_server, Caller::Local).await;
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
    server_task.abort();
}

#[tokio::test(flavor = "local")]
async fn tcp_transport_is_usable() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind TCP listener");
    let address = listener.local_addr().expect("TCP listener address").to_string();
    let fixture = api_with_attachments(Rc::new(EchoAttachments {
        requests: Rc::new(RefCell::new(Vec::new())),
        resizes: Rc::new(RefCell::new(Vec::new())),
    }));
    let server = fixture.server;
    let server_task = tokio::task::spawn_local(async move { server.serve_tcp(listener).await });
    let client = Client::for_tcp(TcpEndpoint::from_address(&address).expect("TCP endpoint"));

    client.health().await.expect("health over TCP");
    let applied = client.apply(request("worker")).await.expect("apply over TCP");
    assert_eq!(applied.metadata.name, "worker");
    let size = sandbox::terminal::TerminalSize::new(24, 80).expect("terminal size");
    let mut attachment = client
        .attach_session(
            "worker",
            agent::sessions::SessionName::new("main").expect("Session name"),
            size,
        )
        .await
        .expect("attach Session over TCP");
    attachment
        .input
        .write(b"over TCP")
        .await
        .expect("terminal input over TCP");
    assert_eq!(
        attachment.events.next().await.expect("terminal output over TCP"),
        Some(sandbox::terminal::TerminalEvent::Output(bytes::Bytes::from_static(
            b"over TCP"
        )))
    );
    attachment.input.close().await.expect("close terminal input over TCP");
    assert!(matches!(
        attachment.events.next().await.expect("terminal exit over TCP"),
        Some(sandbox::terminal::TerminalEvent::Exited(_))
    ));
    let spec = sandbox::execution::ExecutionSpec::command(sandbox::SandboxPath::new("/bin/true"), Vec::<String>::new());
    let mut execution = client
        .start_execution("worker", spec.clone())
        .await
        .expect("start Execution over TCP");
    assert!(matches!(
        execution.events.next().await.expect("Execution event over TCP"),
        Some(sandbox::execution::ExecutionEvent::Stdout(_))
    ));
    let mut terminal = client
        .start_terminal_execution("worker", spec, size)
        .await
        .expect("start terminal over TCP");
    assert!(matches!(
        terminal.events.next().await.expect("terminal event over TCP"),
        Some(sandbox::terminal::TerminalEvent::Exited(_))
    ));
    let mut forwards = client
        .start_port_forwards(
            "worker",
            vec![
                agent::sandbox::PortForwardSpec::new(std::net::IpAddr::from([127, 0, 0, 1]), 0, 8080)
                    .expect("port-forward spec"),
            ],
        )
        .await
        .expect("start port forward over TCP");
    assert!(matches!(
        forwards.events.next().await.expect("port-forward event over TCP"),
        Some(agent::control_api::PortForwardEvent::Stopped { index: 0, .. })
    ));
    let error = client
        .auth_login(agent::Harness::ClaudeCode, "must-not-be-imported".into())
        .await
        .expect_err("remote login should fail");
    assert!(matches!(error, Error::Rpc(error) if error.code == -32010));

    server_task.abort();
}

#[tokio::test(flavor = "local")]
async fn unavailable_local_socket_has_a_distinct_error() {
    let temporary = tempfile::Builder::new()
        .prefix("agent-api-missing-")
        .tempdir()
        .expect("temporary API directory");
    let client = Client::for_path(temporary.path().join("missing.sock"));

    assert!(matches!(
        client.health().await.expect_err("missing socket should fail"),
        Error::ControlApiUnavailable { .. }
    ));
}
