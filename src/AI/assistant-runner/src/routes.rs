use std::{cell::Cell, rc::Rc, time::Duration};

use hyper::{
    HeaderMap, Method, Request, Response, StatusCode,
    body::Incoming,
    header::{CONNECTION, HeaderValue, UPGRADE},
};
use serde::Serialize;

use crate::{
    http::{Body, empty, json, problem},
    ssh::{SshAccess, SshVms},
};

const VMS_PATH: &str = "/api/v1/vms";
const SSH_PROTOCOL: &str = "ssh";

/// The HTTP API of the runner.
pub struct Routes {
    vms: Rc<dyn SshVms>,
    stopping: Rc<Cell<bool>>,
    /// The address of this pod, so that all calls for a VM come to the pod that has it.
    base_url: String,
    /// The runner deletes a VM at the end of this time, also when the client does not.
    vm_lifetime: Duration,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreatedVm {
    url: String,
    lifetime_seconds: u64,
    #[serde(flatten)]
    access: SshAccess,
}

impl Routes {
    #[must_use]
    pub fn new(vms: Rc<dyn SshVms>, stopping: Rc<Cell<bool>>, base_url: String, vm_lifetime: Duration) -> Self {
        Self {
            vms,
            stopping,
            base_url,
            vm_lifetime,
        }
    }

    pub async fn handle(&self, request: Request<Incoming>) -> Response<Body> {
        let path = request.uri().path().to_string();
        let vm_route = path
            .strip_prefix(VMS_PATH)
            .and_then(|rest| rest.strip_prefix('/'))
            .map(|rest| rest.split_once('/').unwrap_or((rest, "")));
        match (request.method(), path.as_str(), vm_route) {
            (&Method::GET, "/health", _) => self.health(),
            (&Method::POST, VMS_PATH, _) => self.create().await,
            (&Method::GET, _, Some((id, SSH_PROTOCOL))) => self.relay(request, id),
            (&Method::DELETE, _, Some((id, ""))) => self.delete(id).await,
            _ => problem(StatusCode::NOT_FOUND, "No such route."),
        }
    }

    /// A stopping pod is not ready, so that Kubernetes sends new requests to another pod.
    fn health(&self) -> Response<Body> {
        empty(if self.stopping.get() {
            StatusCode::SERVICE_UNAVAILABLE
        } else {
            StatusCode::OK
        })
    }

    async fn create(&self) -> Response<Body> {
        if self.stopping.get() {
            return problem(StatusCode::SERVICE_UNAVAILABLE, "The runner stops. Try again.");
        }
        match self.vms.start().await {
            Ok(Some(access)) => {
                self.delete_at_end_of_lifetime(access.id.clone());
                let created = CreatedVm {
                    url: format!("{}{VMS_PATH}/{}", self.base_url, access.id),
                    lifetime_seconds: self.vm_lifetime.as_secs(),
                    access,
                };
                json(StatusCode::CREATED, &created)
            }
            Ok(None) => problem(
                StatusCode::SERVICE_UNAVAILABLE,
                "The runner has a VM. Try again after a short time.",
            ),
            Err(error) => {
                tracing::error!(%error, "could not start a VM");
                problem(StatusCode::INTERNAL_SERVER_ERROR, &error.to_string())
            }
        }
    }

    fn delete_at_end_of_lifetime(&self, id: String) {
        let vms = self.vms.clone();
        let lifetime = self.vm_lifetime;
        tokio::task::spawn_local(async move {
            tokio::time::sleep(lifetime).await;
            if vms.delete(&id).await {
                tracing::warn!(vm = %id, "deleted a VM at the end of its lifetime");
            }
        });
    }

    /// Answers 101, and then copies bytes between the client and sshd in the VM.
    fn relay(&self, mut request: Request<Incoming>, id: &str) -> Response<Body> {
        if !asks_for_ssh(request.headers()) {
            return problem(StatusCode::BAD_REQUEST, "The request must ask for an upgrade to ssh.");
        }
        if !self.vms.contains(id) {
            return problem(StatusCode::NOT_FOUND, "No VM has this id.");
        }
        let upgrade = hyper::upgrade::on(&mut request);
        let vms = self.vms.clone();
        let id = id.to_string();
        tokio::task::spawn_local(async move {
            let relayed = match upgrade.await {
                Ok(client) => vms.relay(&id, client).await,
                Err(error) => Err(error.into()),
            };
            if let Err(error) = relayed {
                tracing::warn!(%error, vm = %id, "the SSH relay ended with an error");
            }
        });
        let mut response = empty(StatusCode::SWITCHING_PROTOCOLS);
        let headers = response.headers_mut();
        headers.insert(CONNECTION, HeaderValue::from_static("upgrade"));
        headers.insert(UPGRADE, HeaderValue::from_static(SSH_PROTOCOL));
        response
    }

    async fn delete(&self, id: &str) -> Response<Body> {
        if self.vms.delete(id).await {
            empty(StatusCode::NO_CONTENT)
        } else {
            problem(StatusCode::NOT_FOUND, "No VM has this id.")
        }
    }
}

fn asks_for_ssh(headers: &HeaderMap) -> bool {
    headers
        .get(UPGRADE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|protocol| protocol.eq_ignore_ascii_case(SSH_PROTOCOL))
}

#[cfg(test)]
mod tests {
    use std::{
        cell::{Cell, RefCell},
        future, io,
        net::SocketAddr,
        rc::Rc,
        time::Duration,
    };

    use hyper::upgrade::Upgraded;
    use hyper_util::rt::TokioIo;
    use sandbox_authorization::LocalFuture;
    use sandbox_host::AnyError;
    use serde_json::Value;
    use tokio::{
        io::{AsyncReadExt as _, AsyncWriteExt as _},
        net::{TcpListener, TcpStream},
    };

    use super::Routes;
    use crate::{
        http,
        ssh::{SshAccess, SshVms},
    };

    const CREATE: &str = "POST /api/v1/vms HTTP/1.1\r\nHost: runner\r\nContent-Length: 0\r\n\r\n";

    /// Starts one VM at a time, and echoes the bytes that the client sends to sshd.
    #[derive(Default)]
    struct FakeVms {
        running: RefCell<Option<String>>,
        started: Cell<u32>,
        deleted: RefCell<Vec<String>>,
    }

    impl SshVms for FakeVms {
        fn start(&self) -> LocalFuture<'_, Result<Option<SshAccess>, AnyError>> {
            Box::pin(async move {
                if self.running.borrow().is_some() {
                    return Ok(None);
                }
                self.started.set(self.started.get() + 1);
                let id = format!("vm{}", self.started.get());
                *self.running.borrow_mut() = Some(id.clone());
                Ok(Some(SshAccess {
                    id,
                    host_key: "ssh-ed25519 AAAA host".to_string(),
                    client_key: "PRIVATE KEY\n".to_string(),
                    user: "app-build",
                }))
            })
        }

        fn contains(&self, id: &str) -> bool {
            self.running.borrow().as_deref() == Some(id)
        }

        fn relay<'a>(&'a self, _id: &'a str, client: Upgraded) -> LocalFuture<'a, Result<(), AnyError>> {
            Box::pin(async move {
                let (mut reader, mut writer) = tokio::io::split(TokioIo::new(client));
                tokio::io::copy(&mut reader, &mut writer).await?;
                Ok(())
            })
        }

        fn delete<'a>(&'a self, id: &'a str) -> LocalFuture<'a, bool> {
            Box::pin(async move {
                if !self.contains(id) {
                    return false;
                }
                *self.running.borrow_mut() = None;
                self.deleted.borrow_mut().push(id.to_string());
                true
            })
        }
    }

    struct Runner {
        address: SocketAddr,
        vms: Rc<FakeVms>,
        stopping: Rc<Cell<bool>>,
    }

    async fn start(vm_lifetime: Duration) -> io::Result<Runner> {
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let address = listener.local_addr()?;
        let vms = Rc::new(FakeVms::default());
        let stopping = Rc::new(Cell::new(false));
        let routes = Routes::new(
            vms.clone(),
            stopping.clone(),
            "http://10.0.0.7:8080".to_string(),
            vm_lifetime,
        );
        tokio::task::spawn_local(http::serve(listener, Rc::new(routes), future::pending()));
        Ok(Runner { address, vms, stopping })
    }

    async fn send(address: SocketAddr, request: &str) -> io::Result<(u16, String)> {
        let mut stream = TcpStream::connect(address).await?;
        stream.write_all(request.as_bytes()).await?;
        let mut response = String::new();
        stream.read_to_string(&mut response).await?;
        let status = response
            .get(9..12)
            .and_then(|status| status.parse().ok())
            .unwrap_or_default();
        let body = response
            .split_once("\r\n\r\n")
            .map(|(_, body)| body.to_string())
            .unwrap_or_default();
        Ok((status, body))
    }

    /// Asks for the SSH relay of the first VM, and returns the stream and the head of the answer.
    async fn open_relay(address: SocketAddr) -> io::Result<(TcpStream, Vec<u8>)> {
        let mut stream = TcpStream::connect(address).await?;
        stream
            .write_all(
                b"GET /api/v1/vms/vm1/ssh HTTP/1.1\r\nHost: runner\r\nConnection: Upgrade\r\nUpgrade: ssh\r\n\r\n",
            )
            .await?;
        let mut head = Vec::new();
        while !head.ends_with(b"\r\n\r\n") {
            head.push(stream.read_u8().await?);
        }
        Ok((stream, head))
    }

    #[tokio::test(flavor = "local")]
    async fn creates_a_vm_and_answers_with_its_address_and_keys() -> Result<(), AnyError> {
        let runner = start(Duration::from_mins(13)).await?;

        let (status, body) = send(runner.address, CREATE).await?;

        assert_eq!(status, 201);
        let created: Value = serde_json::from_str(&body)?;
        assert_eq!(
            created,
            serde_json::json!({
                "url": "http://10.0.0.7:8080/api/v1/vms/vm1",
                "lifetimeSeconds": 780,
                "id": "vm1",
                "hostKey": "ssh-ed25519 AAAA host",
                "clientKey": "PRIVATE KEY\n",
                "user": "app-build",
            })
        );
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_second_vm_and_is_not_ready_while_it_stops() -> io::Result<()> {
        let runner = start(Duration::from_mins(13)).await?;
        send(runner.address, CREATE).await?;

        let (busy, _) = send(runner.address, CREATE).await?;
        runner.stopping.set(true);
        let (health, _) = send(runner.address, "GET /health HTTP/1.1\r\nHost: runner\r\n\r\n").await?;

        assert_eq!((busy, health), (503, 503));
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn deletes_a_vm_once() -> io::Result<()> {
        let runner = start(Duration::from_mins(13)).await?;
        send(runner.address, CREATE).await?;
        let delete = "DELETE /api/v1/vms/vm1 HTTP/1.1\r\nHost: runner\r\n\r\n";

        let (first, _) = send(runner.address, delete).await?;
        let (second, _) = send(runner.address, delete).await?;

        assert_eq!((first, second), (204, 404));
        assert_eq!(*runner.vms.deleted.borrow(), ["vm1"]);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn deletes_a_vm_at_the_end_of_its_lifetime() -> io::Result<()> {
        let runner = start(Duration::from_millis(20)).await?;
        send(runner.address, CREATE).await?;

        for _ in 0..100 {
            if !runner.vms.deleted.borrow().is_empty() {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }

        assert_eq!(*runner.vms.deleted.borrow(), ["vm1"]);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn relays_the_bytes_after_the_upgrade_to_ssh() -> io::Result<()> {
        let runner = start(Duration::from_mins(13)).await?;
        send(runner.address, CREATE).await?;
        let (mut stream, head) = open_relay(runner.address).await?;

        stream.write_all(b"SSH-2.0-test\r\n").await?;
        let mut echoed = [0_u8; 14];
        stream.read_exact(&mut echoed).await?;

        assert!(head.starts_with(b"HTTP/1.1 101"));
        assert_eq!(&echoed, b"SSH-2.0-test\r\n");
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_relay_without_an_upgrade_or_to_an_unknown_vm() -> io::Result<()> {
        let runner = start(Duration::from_mins(13)).await?;
        send(runner.address, CREATE).await?;

        let (no_upgrade, _) = send(
            runner.address,
            "GET /api/v1/vms/vm1/ssh HTTP/1.1\r\nHost: runner\r\n\r\n",
        )
        .await?;
        let (unknown, _) = send(
            runner.address,
            "GET /api/v1/vms/other/ssh HTTP/1.1\r\nHost: runner\r\nConnection: Upgrade\r\nUpgrade: ssh\r\n\r\n",
        )
        .await?;

        assert_eq!((no_upgrade, unknown), (400, 404));
        Ok(())
    }
}
