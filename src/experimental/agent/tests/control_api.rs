#![allow(clippy::expect_used, clippy::panic)]

mod support;

use std::{cell::RefCell, rc::Rc, time::Duration};

use agent::{
    Error,
    control_api::{AuthenticationApi, Client, Connection, Connector, ExecutionApi, Server, SessionApi},
    control_plane::{ApplyRequest, ControlPlane, Notifier, memory::InMemoryAgentStore},
    harness::ImportedAuthentication,
};
use sandbox::LocalFuture;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use support::agent;

struct IgnoreNotifications;

struct FakeAuthentication;
struct FakeExecutions;
struct FakeSessions {
    ensured_harnesses: Rc<RefCell<Vec<Option<agent::Harness>>>>,
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
}

struct InProcessConnector {
    server: Rc<Server>,
}

struct ApiFixture {
    server: Rc<Server>,
    client: Client,
    ensured_harnesses: Rc<RefCell<Vec<Option<agent::Harness>>>>,
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

fn api() -> ApiFixture {
    let control_plane = Rc::new(ControlPlane::new(
        Rc::new(InMemoryAgentStore::new()),
        Rc::new(IgnoreNotifications),
    ));
    let ensured_harnesses = Rc::new(RefCell::new(Vec::new()));
    let observed_errors = Rc::new(RefCell::new(Vec::new()));
    let server = Rc::new(Server::new(
        control_plane,
        Rc::new(FakeAuthentication),
        Rc::new(FakeExecutions),
        Rc::new(FakeSessions {
            ensured_harnesses: ensured_harnesses.clone(),
        }),
        Rc::new(move |error| observed_errors.borrow_mut().push(error.to_string())),
    ));
    let client = Client::new(Rc::new(InProcessConnector { server: server.clone() }));
    ApiFixture {
        server,
        client,
        ensured_harnesses,
    }
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
}

#[tokio::test(flavor = "local")]
async fn health_reports_a_compatible_daemon() {
    let fixture = api();
    fixture.client.health().await.expect("health check");
    assert_eq!(agent::control_api::PROTOCOL_VERSION, "v1");
}

fn request(name: &str) -> ApplyRequest {
    ApplyRequest {
        source_directory: std::env::temp_dir().join("agent-platform-source"),
        manifest_path: None,
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
    server_task.abort();
}
