use std::{cell::Cell, rc::Rc, time::Duration};

use sandbox::LocalFuture;
use serde::{Serialize, de::DeserializeOwned};
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};

use crate::{Agent, Error, control_plane, control_plane::WaitPolicy, harness, sessions};

use super::protocol::{
    DaemonInfo, DirectoryParams, ExecutionEnsureParams, JSON_RPC_VERSION, LoginParams, METHOD_APPLY, METHOD_AUTH_LOGIN,
    METHOD_DELETE, METHOD_EXECUTION_ENSURE, METHOD_GET, METHOD_HEALTH, METHOD_LIST, METHOD_PROGRESS,
    METHOD_RESOLVE_DIRECTORY, METHOD_RESOURCES_WATCH, METHOD_SESSION_ARCHIVE, METHOD_SESSION_DELETE,
    METHOD_SESSION_ENSURE, METHOD_SESSION_GET, METHOD_SESSION_LIST, METHOD_SESSION_PROMPT, METHOD_SESSION_TURNS,
    METHOD_SESSION_UNARCHIVE, METHOD_SHUTDOWN, METHOD_SSH_ACCESS, METHOD_VNC_ACCESS, NameParams, ProgressParams,
    ReadMessage, Request, ResourcesWatchParams, Response, SessionEnsureParams, SessionListParams, SessionParams,
    SessionPromptParams, SessionTurnsParams, ShutdownParams, ShutdownResult, read_message,
};

const RESPONSE_TIMEOUT: Duration = Duration::from_secs(30);
// Allow the daemon's 30-second watch keepalive plus transport latency.
const WATCH_RESPONSE_TIMEOUT: Duration = Duration::from_secs(60);

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
        self.call(METHOD_HEALTH, serde_json::json!({})).await
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
        self.call(METHOD_APPLY, request).await
    }

    /// Gets an Agent resource by name.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or the control-plane operation fails.
    pub async fn get(&self, name: &str) -> Result<Agent, Error> {
        self.call(METHOD_GET, NameParams { name: name.into() }).await
    }

    /// Lists every active Agent.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or storage fails.
    pub async fn list_agents(&self) -> Result<Vec<Agent>, Error> {
        self.call(METHOD_LIST, serde_json::json!({})).await
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
        self.call(METHOD_RESOLVE_DIRECTORY, DirectoryParams { directory, variant })
            .await
    }

    /// Converges an Agent and resolves its exact transient Execution target.
    ///
    /// `wait` decides whether the call returns after one reconciliation pass or
    /// waits through background retries until Ready. Follow progress alongside
    /// with [`Self::agent_progress`].
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is missing, deleting, invalid, or fails to
    /// reach a ready materialized Sandbox.
    pub async fn ensure_execution(
        &self,
        name: &str,
        wait: WaitPolicy,
    ) -> Result<crate::sandbox::ExecutionTarget, Error> {
        self.call_with_timeout(
            METHOD_EXECUTION_ENSURE,
            ExecutionEnsureParams {
                name: name.into(),
                follow: wait == WaitPolicy::UntilReady,
            },
            None,
        )
        .await
    }

    /// Waits for a change after `after`, then returns the Agent's stored status
    /// and the progress of its latest pass. Without a revision, or with one
    /// from an earlier daemon process, it returns at once; with a current one
    /// it may return the unchanged state after a keepalive interval. When
    /// `output` names the latest pass, only output after it is included.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is missing or the call fails.
    pub async fn agent_progress(
        &self,
        name: &str,
        after: Option<crate::resources::Revision>,
        output: Option<crate::progress::OutputPosition>,
    ) -> Result<crate::progress::AgentProgress, Error> {
        self.call_with_timeout(
            METHOD_PROGRESS,
            ProgressParams {
                name: name.into(),
                after,
                output,
            },
            Some(WATCH_RESPONSE_TIMEOUT),
        )
        .await
    }

    /// Waits for an Agent or Session to change after `after`, then returns
    /// every Agent and Session. Without a revision, or with one from an earlier
    /// daemon process, it returns the current state at once; with a current
    /// revision it may return the unchanged state after a keepalive interval.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or daemon reads fail.
    pub async fn watch_resources(
        &self,
        after: Option<crate::resources::Revision>,
    ) -> Result<crate::resources::Resources, Error> {
        self.call_with_timeout(
            METHOD_RESOURCES_WATCH,
            ResourcesWatchParams { after },
            Some(WATCH_RESPONSE_TIMEOUT),
        )
        .await
    }

    /// Describes how to reach an Agent over SSH.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is unknown, deleting, or declares no SSH access.
    pub async fn ssh_access(&self, name: &str) -> Result<crate::ssh::AccessInfo, Error> {
        self.call(METHOD_SSH_ACCESS, NameParams { name: name.into() }).await
    }

    /// Describes how to reach an Agent's desktop over VNC.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is unknown, deleting, or declares no VNC access.
    pub async fn vnc_access(&self, name: &str) -> Result<crate::vnc::AccessInfo, Error> {
        self.call(METHOD_VNC_ACCESS, NameParams { name: name.into() }).await
    }

    /// Requests deletion of an Agent and its owned sandbox.
    ///
    /// # Errors
    ///
    /// Returns an error when transport, protocol validation, or the control-plane operation fails.
    pub async fn delete(&self, name: &str) -> Result<(), Error> {
        let _result: serde_json::Value = self.call(METHOD_DELETE, NameParams { name: name.into() }).await?;
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
        )
        .await
    }

    /// Creates or resolves one named session attach target.
    ///
    /// `request` selects the harness, model, effort and first prompt of a
    /// Session this call creates; see [`sessions::Service::ensure`] for the
    /// precedence against manifest defaults. `wait` decides whether the call
    /// returns after one Agent reconciliation pass or waits through background
    /// retries until Ready. Follow progress alongside with [`Self::agent_progress`].
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
    ) -> Result<sessions::AttachTarget, Error> {
        self.call_with_timeout(
            METHOD_SESSION_ENSURE,
            SessionEnsureParams {
                agent: agent.into(),
                name,
                harness: request.harness,
                model_selection: request.model_selection,
                initial_prompt: request.initial_prompt,
                follow: wait == WaitPolicy::UntilReady,
            },
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
        )
        .await
    }

    /// Requests release of one Session: its harness is stopped and the Session
    /// is removed, freeing its name.
    ///
    /// # Errors
    ///
    /// Returns an error when either resource is missing, or the release pass fails.
    pub async fn delete_session(&self, agent: &str, name: sessions::SessionName) -> Result<(), Error> {
        let _result: serde_json::Value = self
            .call(
                METHOD_SESSION_DELETE,
                SessionParams {
                    agent: agent.into(),
                    name,
                    harness: None,
                },
            )
            .await?;
        Ok(())
    }

    /// Archives or unarchives one Session and returns it as recorded. Archiving
    /// stops its harness until it is unarchived; the Session keeps its name and
    /// conversation.
    ///
    /// # Errors
    ///
    /// Returns an error when either resource is missing or the pass fails.
    pub async fn set_session_archived(
        &self,
        agent: &str,
        name: sessions::SessionName,
        archived: bool,
    ) -> Result<sessions::Session, Error> {
        self.call(
            if archived {
                METHOD_SESSION_ARCHIVE
            } else {
                METHOD_SESSION_UNARCHIVE
            },
            SessionParams {
                agent: agent.into(),
                name,
                harness: None,
            },
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
        )
        .await
    }

    async fn call<P: Serialize, R: DeserializeOwned>(&self, method: &str, params: P) -> Result<R, Error> {
        self.call_with_timeout(method, params, Some(RESPONSE_TIMEOUT)).await
    }

    /// Connection establishment has its own connector-owned deadline. Ordinary
    /// replies have one deadline, not reset by partial frames.
    /// Provisioning and prompt delivery keep their caller/server wait policies.
    async fn call_with_timeout<P: Serialize, R: DeserializeOwned>(
        &self,
        method: &str,
        params: P,
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

        let response = Self::read_response(stream, id);
        if let Some(timeout) = response_timeout {
            tokio::time::timeout(timeout, response)
                .await
                .map_err(|_| timeout_error(method, "waiting for a response"))?
        } else {
            response.await
        }
    }

    async fn read_response<R: DeserializeOwned>(stream: Box<dyn Connection>, id: u64) -> Result<R, Error> {
        let mut stream = BufReader::new(stream);
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
        let response: Response = serde_json::from_slice(&line)?;
        if response.jsonrpc != JSON_RPC_VERSION || response.id != id {
            return Err(Error::Invalid("invalid Agent Control API response".into()));
        }
        if let Some(error) = response.error {
            return Err(Error::Rpc(error));
        }
        serde_json::from_value(
            response
                .result
                .ok_or_else(|| Error::Invalid("Agent Control API response has no result".into()))?,
        )
        .map_err(Error::from)
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
            let result = client.call::<_, serde_json::Value>(method, ()).await;
            assert!(matches!(result, Err(Error::Io(ref error)) if error.kind() == std::io::ErrorKind::TimedOut));
            let message = result.expect_err("response deadline").to_string();
            assert!(message.contains(method));
            assert!(message.contains("operation may still complete"));
            assert_eq!(started.elapsed(), connector.connect_delay + RESPONSE_TIMEOUT);
            assert_eq!(connector.calls.get(), 1, "never replay a possibly completed mutation");
        }
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn partial_frames_do_not_reset_the_response_deadline() {
        let client = Client::new(Rc::new(ScriptedConnector {
            frames: vec![
                (Duration::from_secs(20), b"{\"jsonrpc\":"),
                (Duration::from_secs(5), b"\"2.0\",\"id\":"),
            ],
            ..Default::default()
        }));
        let started = tokio::time::Instant::now();
        assert!(matches!(client.health().await, Err(Error::Io(error)) if error.kind() == std::io::ErrorKind::TimedOut));
        assert_eq!(started.elapsed(), RESPONSE_TIMEOUT);
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn watch_calls_allow_keepalives_but_still_time_out_on_silent_peers() {
        for progress in [false, true] {
            for replies in [false, true] {
                let connector = Rc::new(ScriptedConnector {
                    frames: if replies {
                        vec![(
                            Duration::from_secs(35),
                            b"{\"jsonrpc\":\"2.0\",\"id\":1,\"error\":{\"code\":-32004,\"message\":\"not found\"}}\n",
                        )]
                    } else {
                        Vec::new()
                    },
                    ..Default::default()
                });
                let client = Client::new(connector.clone());
                let started = tokio::time::Instant::now();
                let result = if progress {
                    client.agent_progress("test", None, None).await.map(|_| ())
                } else {
                    client.watch_resources(None).await.map(|_| ())
                };
                if replies {
                    assert!(matches!(result, Err(Error::Rpc(_))));
                    assert_eq!(started.elapsed(), Duration::from_secs(35));
                } else {
                    assert!(matches!(result, Err(Error::Io(error)) if error.kind() == std::io::ErrorKind::TimedOut));
                    assert_eq!(started.elapsed(), WATCH_RESPONSE_TIMEOUT);
                }
                assert_eq!(connector.calls.get(), 1);
            }
        }
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
                    .ensure_execution("test", WaitPolicy::UntilReady)
                    .await
                    .map(|_| ()),
                1 => client
                    .ensure_session(
                        "test",
                        session,
                        sessions::SessionRequest::default(),
                        WaitPolicy::UntilReady,
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
