use std::{cell::Cell, rc::Rc};

use sandbox::LocalFuture;
use serde::{Serialize, de::DeserializeOwned};
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};

use crate::{Agent, Error, control_plane, control_plane::WaitPolicy, harness, sessions};

use super::protocol::{
    DaemonInfo, DirectoryParams, ExecutionEnsureParams, JSON_RPC_VERSION, LoginParams, METHOD_APPLY, METHOD_AUTH_LOGIN,
    METHOD_DELETE, METHOD_EXECUTION_ENSURE, METHOD_GET, METHOD_HEALTH, METHOD_LIST, METHOD_PROGRESS,
    METHOD_RESOLVE_DIRECTORY, METHOD_RESOURCES_WATCH, METHOD_SESSION_ENSURE, METHOD_SESSION_GET, METHOD_SESSION_LIST,
    METHOD_SESSION_PROMPT, METHOD_SESSION_TURNS, METHOD_SHUTDOWN, METHOD_SSH_ACCESS, NameParams, ProgressParams,
    ReadMessage, Request, ResourcesWatchParams, Response, SessionEnsureParams, SessionListParams, SessionParams,
    SessionPromptParams, SessionTurnsParams, ShutdownParams, ShutdownResult, read_message,
};

/// A byte stream usable by the Agent Control API client.
pub trait Connection: AsyncRead + AsyncWrite + Unpin {}

impl<T: AsyncRead + AsyncWrite + Unpin> Connection for T {}

/// Opens one connection for one local API call.
pub trait Connector {
    /// Connects to the local control plane.
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>>;
}

/// Calls an Agent control plane over a local stream transport.
pub struct Client {
    connector: Rc<dyn Connector>,
    next_id: Cell<u64>,
}

impl Client {
    /// Creates a client with a replaceable local connector.
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

    /// Checks whether the local daemon speaks the expected Control API.
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
            .call(
                METHOD_SHUTDOWN,
                ShutdownParams {
                    reason: "upgrade".into(),
                },
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
        self.call(
            METHOD_EXECUTION_ENSURE,
            ExecutionEnsureParams {
                name: name.into(),
                follow: wait == WaitPolicy::UntilReady,
            },
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
        self.call(
            METHOD_PROGRESS,
            ProgressParams {
                name: name.into(),
                after,
                output,
            },
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
        self.call(METHOD_RESOURCES_WATCH, ResourcesWatchParams { after }).await
    }

    /// Describes how to reach an Agent over SSH.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is unknown, deleting, or declares no SSH access.
    pub async fn ssh_access(&self, name: &str) -> Result<crate::ssh::AccessInfo, Error> {
        self.call(METHOD_SSH_ACCESS, NameParams { name: name.into() }).await
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
        self.call(
            METHOD_SESSION_ENSURE,
            SessionEnsureParams {
                agent: agent.into(),
                name,
                harness: request.harness,
                model_selection: request.model_selection,
                initial_prompt: request.initial_prompt,
                follow: wait == WaitPolicy::UntilReady,
            },
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
            .call(
                METHOD_SESSION_PROMPT,
                SessionPromptParams {
                    agent: agent.into(),
                    name,
                    prompt,
                    wait,
                    timeout,
                },
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
        stream.write_all(&bytes).await?;
        stream.flush().await?;

        let mut stream = BufReader::new(stream);
        let line = match read_message(&mut stream).await? {
            ReadMessage::Complete(line) => line,
            ReadMessage::EndOfStream | ReadMessage::TooLarge => {
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
