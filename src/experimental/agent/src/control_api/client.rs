use std::{cell::Cell, rc::Rc};

use sandbox::LocalFuture;
use serde::{Serialize, de::DeserializeOwned};
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};

use crate::{Agent, Error, control_plane, harness, sessions};

use super::protocol::{
    DirectoryParams, JSON_RPC_VERSION, LoginParams, METHOD_APPLY, METHOD_AUTH_LOGIN, METHOD_DELETE,
    METHOD_EXECUTION_ENSURE, METHOD_GET, METHOD_HEALTH, METHOD_LIST, METHOD_RESOLVE_DIRECTORY, METHOD_SESSION_ENSURE,
    METHOD_SESSION_GET, METHOD_SESSION_LIST, NameParams, ReadMessage, Request, Response, SessionListParams,
    SessionParams, read_message,
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
    pub async fn health(&self) -> Result<(), Error> {
        let _result: serde_json::Value = self.call(METHOD_HEALTH, serde_json::json!({})).await?;
        Ok(())
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
        self.call(METHOD_RESOLVE_DIRECTORY, DirectoryParams { directory }).await
    }

    /// Converges an Agent and resolves its exact transient Execution target.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is missing, deleting, or fails to reach
    /// a ready materialized Sandbox.
    pub async fn ensure_execution(&self, name: &str) -> Result<crate::sandbox::ExecutionTarget, Error> {
        self.call(METHOD_EXECUTION_ENSURE, NameParams { name: name.into() })
            .await
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
    ) -> Result<harness::ImportedAuthentication, Error> {
        self.call(METHOD_AUTH_LOGIN, LoginParams { harness, credential }).await
    }

    /// Creates or resolves one named session attach target.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is not ready or the registry cannot persist the session.
    pub async fn ensure_session(
        &self,
        agent: &str,
        name: sessions::SessionName,
        harness: Option<harness::Harness>,
    ) -> Result<sessions::AttachTarget, Error> {
        self.call(
            METHOD_SESSION_ENSURE,
            SessionParams {
                agent: agent.into(),
                name,
                harness,
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
