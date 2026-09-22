use std::{cell::Cell, rc::Rc, time::Duration};

use sandbox::LocalFuture;
use serde::{Serialize, de::DeserializeOwned};
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};

use crate::{Agent, Error, control_plane, control_plane::WaitPolicy, harness, sessions};

use super::protocol::{
    DaemonInfo, DirectoryParams, ExecutionEnsureParams, JSON_RPC_VERSION, LoginParams, METHOD_APPLY, METHOD_AUTH_LOGIN,
    METHOD_DELETE, METHOD_EXECUTION_ENSURE, METHOD_GET, METHOD_HEALTH, METHOD_LIST, METHOD_PROGRESS_EVENT,
    METHOD_RESOLVE_DIRECTORY, METHOD_SESSION_ENSURE, METHOD_SESSION_GET, METHOD_SESSION_LIST, METHOD_SESSION_PROMPT,
    METHOD_SESSION_TURNS, METHOD_SHUTDOWN, METHOD_SSH_ACCESS, NameParams, Notification, ReadMessage, Request, Response,
    SessionEnsureParams, SessionListParams, SessionParams, SessionPromptParams, SessionTurnsParams, ShutdownParams,
    ShutdownResult, read_message,
};

const RESPONSE_TIMEOUT: Duration = Duration::from_secs(30);

/// A byte stream usable by the Agent Control API client.
pub trait Connection: AsyncRead + AsyncWrite + Unpin {}

impl<T: AsyncRead + AsyncWrite + Unpin> Connection for T {}

/// Opens one connection for one API call.
pub trait Connector {
    /// Connects to the control plane.
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>>;
}

/// Calls an Agent control plane over a replaceable stream transport.
pub struct Client {
    connector: Rc<dyn Connector>,
    next_id: Cell<u64>,
}

impl Client {
    /// Creates a client with a replaceable connector.
    #[must_use]
    pub fn new(connector: Rc<dyn Connector>) -> Self {
        Self {
            connector,
            next_id: Cell::new(0),
        }
    }

    /// Creates a client for the platform local socket at `path`.
    #[must_use]
    pub fn for_path(path: std::path::PathBuf) -> Self {
        Self::new(Rc::new(super::socket::PathConnector::new(path)))
    }

    /// Returns the daemon's Control API and build versions.
    ///
    /// # Errors
    ///
    /// Returns an error when the daemon is unavailable or protocol-incompatible.
    pub async fn health(&self) -> Result<DaemonInfo, Error> {
        self.call(METHOD_HEALTH, serde_json::json!({}), None).await
    }

    /// Requires a daemon built with this client's application protocol and version.
    ///
    /// # Errors
    ///
    /// Returns an error with both identities when a daemon is reachable but incompatible.
    pub async fn require_compatible_daemon(&self) -> Result<DaemonInfo, Error> {
        let daemon = self.health().await?;
        daemon.require_compatible()?;
        Ok(daemon)
    }

    /// Requests a graceful daemon shutdown for an upgrade.
    ///
    /// # Errors
    ///
    /// Returns an error when active Sessions block the transition or the daemon
    /// cannot drain its listeners and in-flight calls.
    pub async fn shutdown_for_upgrade(&self) -> Result<Vec<String>, Error> {
        let result: ShutdownResult = self
            .call_with_timeout(
                METHOD_SHUTDOWN,
                ShutdownParams {
                    reason: "upgrade".into(),
                },
                None,
                Some(Duration::from_secs(90)),
            )
            .await?;
        Ok(result.warnings)
    }

    /// Creates or updates an Agent resource.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or the control-plane operation fails.
    pub async fn apply(&self, request: control_plane::ApplyRequest) -> Result<Agent, Error> {
        self.call(METHOD_APPLY, request, None).await
    }

    /// Gets an Agent resource by name.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or the control-plane operation fails.
    pub async fn get(&self, name: &str) -> Result<Agent, Error> {
        self.call(METHOD_GET, NameParams { name: name.into() }, None).await
    }

    /// Lists every active Agent.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or storage fails.
    pub async fn list_agents(&self) -> Result<Vec<Agent>, Error> {
        self.call(METHOD_LIST, serde_json::json!({}), None).await
    }

    /// Resolves the closest persisted Agent source directory containing `directory`.
    ///
    /// # Errors
    ///
    /// Returns an error when no unique Agent matches or the API call fails.
    pub async fn resolve_agent(&self, directory: std::path::PathBuf) -> Result<Agent, Error> {
        self.resolve_agent_variant(directory, None).await
    }

    /// Resolves the closest persisted Agent by directory and optional leaf variant.
    ///
    /// # Errors
    ///
    /// Returns an error when no unique Agent matches or the API call fails.
    pub async fn resolve_agent_variant(
        &self,
        directory: std::path::PathBuf,
        variant: Option<crate::AgentVariantName>,
    ) -> Result<Agent, Error> {
        self.call(METHOD_RESOLVE_DIRECTORY, DirectoryParams { directory, variant }, None)
            .await
    }

    /// Converges an Agent and resolves its exact transient Execution target.
    ///
    /// `wait` decides whether the call returns after one reconciliation pass or
    /// follows background retries until Ready; a progress sink independently
    /// opts in to streamed provisioning events.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is missing, deleting, invalid, or fails to
    /// reach a ready materialized Sandbox.
    pub async fn ensure_execution(
        &self,
        name: &str,
        wait: WaitPolicy,
        progress: Option<&mut dyn FnMut(crate::progress::Event)>,
    ) -> Result<crate::sandbox::ExecutionTarget, Error> {
        self.call_with_timeout(
            METHOD_EXECUTION_ENSURE,
            ExecutionEnsureParams {
                name: name.into(),
                progress: progress.is_some(),
                follow: wait == WaitPolicy::UntilReady,
            },
            progress,
            None,
        )
        .await
    }

    /// Describes how to reach an Agent over SSH.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is unknown, deleting, or declares no SSH access.
    pub async fn ssh_access(&self, name: &str) -> Result<crate::ssh::AccessInfo, Error> {
        self.call(METHOD_SSH_ACCESS, NameParams { name: name.into() }, None)
            .await
    }

    /// Requests deletion of an Agent and its owned sandbox.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or the control-plane operation fails.
    pub async fn delete(&self, name: &str) -> Result<(), Error> {
        let _result: serde_json::Value = self.call(METHOD_DELETE, NameParams { name: name.into() }, None).await?;
        Ok(())
    }

    /// Stores a host-acquired harness credential in the daemon.
    ///
    /// # Errors
    ///
    /// Returns an error when the credential is invalid, rejected, or cannot be persisted.
    pub async fn auth_login(
        &self,
        harness: harness::Harness,
        credential: String,
        imported: bool,
    ) -> Result<harness::ImportedAuthentication, Error> {
        self.call(
            METHOD_AUTH_LOGIN,
            LoginParams {
                harness,
                credential,
                imported,
            },
            None,
        )
        .await
    }

    /// Creates or resolves one named session attach target.
    ///
    /// `request` selects the harness, model, effort and first prompt of a
    /// Session this call creates; see [`sessions::Service::ensure`] for the
    /// precedence against manifest defaults. `wait` decides whether the call
    /// returns after one Agent reconciliation pass or follows background
    /// retries until Ready; a progress sink independently opts in to streamed
    /// provisioning events.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is not ready, a selection conflicts with
    /// an existing Session, or the registry cannot persist the session.
    pub async fn ensure_session(
        &self,
        agent: &str,
        name: sessions::SessionName,
        request: sessions::SessionRequest,
        wait: WaitPolicy,
        progress: Option<&mut dyn FnMut(crate::progress::Event)>,
    ) -> Result<sessions::AttachTarget, Error> {
        self.call_with_timeout(
            METHOD_SESSION_ENSURE,
            SessionEnsureParams {
                agent: agent.into(),
                name,
                harness: request.harness,
                model_selection: request.model_selection,
                initial_prompt: request.initial_prompt,
                progress: progress.is_some(),
                follow: wait == WaitPolicy::UntilReady,
            },
            progress,
            None,
        )
        .await
    }

    /// Delivers a prompt to a running Session's harness. With `wait`, waits for
    /// its completed-turn counter to advance with identical waiting activity in
    /// two consecutive polls, 250 ms apart.
    /// Work observed during settling requires another completion.
    /// The timeout bounds completion waiting after submission, excluding setup and delivery.
    /// Conversation output is read separately with [`Self::session_turns`].
    ///
    /// # Errors
    ///
    /// Returns an error when the Session is not running or the input cannot be delivered.
    pub async fn prompt_session(
        &self,
        agent: &str,
        name: sessions::SessionName,
        prompt: String,
        wait: bool,
        timeout: Option<std::time::Duration>,
    ) -> Result<(), Error> {
        let _result: serde_json::Value = self
            .call_with_timeout(
                METHOD_SESSION_PROMPT,
                SessionPromptParams {
                    agent: agent.into(),
                    name,
                    prompt,
                    wait,
                    timeout,
                },
                None,
                None,
            )
            .await?;
        Ok(())
    }

    /// Reads the harness transcript of a Session as ordered turns.
    ///
    /// # Errors
    ///
    /// Returns an error when the Session or its transcript cannot be read.
    pub async fn session_turns(
        &self,
        agent: &str,
        name: sessions::SessionName,
        last: Option<usize>,
    ) -> Result<Vec<sessions::Turn>, Error> {
        self.call(
            METHOD_SESSION_TURNS,
            SessionTurnsParams {
                agent: agent.into(),
                name,
                last,
            },
            None,
        )
        .await
    }

    /// Gets one named Session scoped to an Agent.
    ///
    /// # Errors
    ///
    /// Returns an error when either resource is missing or the registry cannot be read.
    pub async fn get_session(&self, agent: &str, name: sessions::SessionName) -> Result<sessions::Session, Error> {
        self.call(
            METHOD_SESSION_GET,
            SessionParams {
                agent: agent.into(),
                name,
                harness: None,
            },
            None,
        )
        .await
    }

    /// Lists tracked Sessions, optionally scoped to one Agent.
    ///
    /// # Errors
    ///
    /// Returns an error when the scoped Agent is missing or the registry cannot be read.
    pub async fn list_sessions(&self, agent: Option<&str>) -> Result<Vec<sessions::Session>, Error> {
        self.call(
            METHOD_SESSION_LIST,
            SessionListParams {
                agent: agent.map(str::to_owned),
            },
            None,
        )
        .await
    }

    async fn call<P: Serialize, R: DeserializeOwned>(
        &self,
        method: &str,
        params: P,
        progress: Option<&mut dyn FnMut(crate::progress::Event)>,
    ) -> Result<R, Error> {
        self.call_with_timeout(method, params, progress, Some(RESPONSE_TIMEOUT))
            .await
    }

    /// Connection establishment has its own connector-owned deadline. Ordinary
    /// replies have one deadline, not reset by notifications or partial frames.
    /// Provisioning and prompt delivery keep their caller/server wait policies.
    async fn call_with_timeout<P: Serialize, R: DeserializeOwned>(
        &self,
        method: &str,
        params: P,
        progress: Option<&mut dyn FnMut(crate::progress::Event)>,
        response_timeout: Option<Duration>,
    ) -> Result<R, Error> {
        let id = self.next_id.get().wrapping_add(1);
        self.next_id.set(id);
        let request = Request {
            jsonrpc: JSON_RPC_VERSION.into(),
            method: method.into(),
            params: serde_json::to_value(params)?,
            id,
        };
        let mut stream = self.connector.connect().await?;
        let mut bytes = serde_json::to_vec(&request)?;
        bytes.push(b'\n');
        tokio::time::timeout(RESPONSE_TIMEOUT, async {
            stream.write_all(&bytes).await?;
            stream.flush().await
        })
        .await
        .map_err(|_| timeout_error(method, "sending the request"))??;

        let response = Self::read_response(stream, id, progress);
        if let Some(timeout) = response_timeout {
            tokio::time::timeout(timeout, response)
                .await
                .map_err(|_| timeout_error(method, "waiting for a response"))?
        } else {
            response.await
        }
    }

    async fn read_response<R: DeserializeOwned>(
        stream: Box<dyn Connection>,
        id: u64,
        mut progress: Option<&mut dyn FnMut(crate::progress::Event)>,
    ) -> Result<R, Error> {
        let mut stream = BufReader::new(stream);
        loop {
            let line = match read_message(&mut stream).await? {
                ReadMessage::Complete(line) => line,
                ReadMessage::EndOfStream => {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::UnexpectedEof,
                        "Agent Control API connection closed before a response",
                    )
                    .into());
                }
                ReadMessage::TooLarge => {
                    return Err(Error::Invalid("invalid Agent Control API response".into()));
                }
            };
            let value: serde_json::Value = serde_json::from_slice(&line)?;
            if value.get("id").is_none() {
                // A well-formed notification this client does not understand is
                // skipped: rendering is best effort and must never fail the call.
                let notification: Notification = serde_json::from_value(value)?;
                if notification.jsonrpc == JSON_RPC_VERSION
                    && notification.method == METHOD_PROGRESS_EVENT
                    && let Ok(event) = serde_json::from_value(notification.params)
                    && let Some(progress) = progress.as_deref_mut()
                {
                    progress(event);
                }
                continue;
            }
            let response: Response = serde_json::from_value(value)?;
            if response.jsonrpc != JSON_RPC_VERSION || response.id != id {
                return Err(Error::Invalid("invalid Agent Control API response".into()));
            }
            if let Some(error) = response.error {
                return Err(Error::Rpc(error));
            }
            return serde_json::from_value(
                response
                    .result
                    .ok_or_else(|| Error::Invalid("Agent Control API response has no result".into()))?,
            )
            .map_err(Error::from);
        }
    }
}

fn timeout_error(method: &str, phase: &str) -> Error {
    std::io::Error::new(
        std::io::ErrorKind::TimedOut,
        format!("Agent Control API {method} timed out {phase}; the operation may still complete on the daemon"),
    )
    .into()
}

#[cfg(test)]
mod tests {
    use tokio::io::{AsyncBufReadExt as _, AsyncReadExt as _};

    use super::*;

    #[derive(Default)]
    struct ScriptedConnector {
        connect_delay: Duration,
        frames: Vec<(Duration, &'static [u8])>,
        calls: Cell<usize>,
    }

    impl Connector for ScriptedConnector {
        fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
            Box::pin(async move {
                self.calls.set(self.calls.get() + 1);
                tokio::time::sleep(self.connect_delay).await;
                let (client, server) = tokio::io::duplex(4096);
                let frames = self.frames.clone();
                tokio::task::spawn_local(async move {
                    let mut server = BufReader::new(server);
                    server.read_line(&mut String::new()).await.expect("request");
                    for (delay, frame) in frames {
                        tokio::time::sleep(delay).await;
                        if server.get_mut().write_all(frame).await.is_err() {
                            return;
                        }
                    }
                    // Keep a silent peer connected until the client closes it.
                    server.read_to_end(&mut Vec::new()).await.expect("client closed");
                });
                Ok(Box::new(client) as Box<dyn Connection>)
            })
        }
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn ordinary_calls_time_out_after_connect_without_replaying_mutations() {
        for method in [METHOD_HEALTH, METHOD_GET, METHOD_APPLY, METHOD_SESSION_TURNS] {
            let connector = Rc::new(ScriptedConnector {
                connect_delay: Duration::from_secs(9),
                ..Default::default()
            });
            let client = Client::new(connector.clone());
            let started = tokio::time::Instant::now();
            let result = client.call::<_, serde_json::Value>(method, (), None).await;
            assert!(matches!(result, Err(Error::Io(ref error)) if error.kind() == std::io::ErrorKind::TimedOut));
            let message = result.expect_err("response deadline").to_string();
            assert!(message.contains(method));
            assert!(message.contains("operation may still complete"));
            assert_eq!(started.elapsed(), connector.connect_delay + RESPONSE_TIMEOUT);
            assert_eq!(connector.calls.get(), 1, "never replay a possibly completed mutation");
        }
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn notifications_and_partial_frames_do_not_reset_the_response_deadline() {
        let client = Client::new(Rc::new(ScriptedConnector {
            frames: vec![
                (
                    Duration::from_secs(20),
                    b"{\"jsonrpc\":\"2.0\",\"method\":\"ignored\",\"params\":{}}\n",
                ),
                (Duration::from_secs(5), b"{\"jsonrpc\":"),
            ],
            ..Default::default()
        }));
        let started = tokio::time::Instant::now();
        assert!(matches!(client.health().await, Err(Error::Io(error)) if error.kind() == std::io::ErrorKind::TimedOut));
        assert_eq!(started.elapsed(), RESPONSE_TIMEOUT);
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn provisioning_prompt_and_shutdown_keep_their_longer_wait_policies() {
        for operation in 0..4 {
            let client = Client::new(Rc::new(ScriptedConnector {
                frames: vec![(
                    Duration::from_secs(61),
                    b"{\"jsonrpc\":\"2.0\",\"id\":1,\"error\":{\"code\":-32004,\"message\":\"operation failed\"}}\n",
                )],
                ..Default::default()
            }));
            let session = sessions::SessionName::new("test").expect("session");
            let result = match operation {
                0 => client
                    .ensure_execution("test", WaitPolicy::UntilReady, None)
                    .await
                    .map(|_| ()),
                1 => client
                    .ensure_session(
                        "test",
                        session,
                        sessions::SessionRequest::default(),
                        WaitPolicy::UntilReady,
                        None,
                    )
                    .await
                    .map(|_| ()),
                2 => {
                    client
                        .prompt_session("test", session, "prompt".into(), true, Some(Duration::from_secs(120)))
                        .await
                }
                _ => client.shutdown_for_upgrade().await.map(|_| ()),
            };
            assert!(
                matches!(result, Err(Error::Rpc(_))),
                "long-running operation {operation}: {result:?}"
            );
        }
    }
}
