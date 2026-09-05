mod forward;

pub use forward::{PortForwardEvent, PortForwardSession};

use std::{cell::Cell, rc::Rc};

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use sandbox::LocalFuture;
use serde::{Serialize, de::DeserializeOwned};
use tokio::io::{AsyncRead, AsyncWrite, BufReader};

use crate::{Agent, Error, control_plane, harness, sessions};

use super::protocol::{
    CODE_CALLER_NOT_PERMITTED, DirectoryParams, ExecutionServerMessage, ExecutionStartParams, ExecutionStreamResult,
    JSON_RPC_VERSION, LoginParams, MESSAGE_CALLER_NOT_PERMITTED, METHOD_APPLY, METHOD_AUTH_LOGIN, METHOD_DELETE,
    METHOD_EXECUTION_START, METHOD_GET, METHOD_HEALTH, METHOD_LIST, METHOD_PORT_FORWARD_START,
    METHOD_RESOLVE_DIRECTORY, METHOD_SESSION_ATTACH, METHOD_SESSION_ENSURE, METHOD_SESSION_GET, METHOD_SESSION_LIST,
    METHOD_TERMINAL_EXECUTION_START, MessageReader, NameParams, PortForwardStartParams, PortForwardStartResult,
    ReadMessage, Request, Response, ResponseError, SessionAttachParams, SessionListParams, SessionParams,
    TerminalClientMessage, TerminalExecutionStartParams, TerminalServerMessage, read_message, write_stream_message,
};

/// A byte stream usable by the Agent Control API client.
pub trait Connection: AsyncRead + AsyncWrite + Unpin {}

impl<T: AsyncRead + AsyncWrite + Unpin> Connection for T {}

/// Opens one connection for one Agent Control API call.
pub trait Connector {
    /// Connects to the configured control plane.
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>>;

    /// Reports whether this transport may carry host credentials.
    #[must_use]
    fn allows_credential_transfer(&self) -> bool {
        true
    }
}

/// Calls an Agent control plane over a replaceable stream transport.
#[derive(Clone)]
pub struct Client {
    connector: Rc<dyn Connector>,
    next_id: Cell<u64>,
}

/// One daemon-owned non-interactive Execution stream.
pub struct AttachedExecution {
    /// Backend-neutral Execution identity assigned by the daemon.
    pub id: sandbox::execution::ExecutionId,
    /// Standard output, standard error, and completion events.
    pub events: ExecutionEvents,
}

/// One daemon-owned terminal attachment split into independent input and event halves.
pub struct AttachedTerminal {
    /// Backend-neutral Execution identity assigned by the daemon.
    pub id: sandbox::execution::ExecutionId,
    /// Terminal input and resize controls.
    pub input: TerminalInput,
    /// Terminal output and completion events.
    pub events: TerminalEvents,
}

type BufferedConnection = BufReader<Box<dyn Connection>>;
type TerminalWriter = tokio::io::WriteHalf<BufferedConnection>;
type TerminalReader = BufReader<tokio::io::ReadHalf<BufferedConnection>>;

/// Input and resize controls for an attached terminal.
pub struct TerminalInput {
    writer: TerminalWriter,
    closed: bool,
}

/// Events from a daemon-owned non-interactive Execution.
pub struct ExecutionEvents {
    reader: MessageReader<BufferedConnection>,
}

impl ExecutionEvents {
    /// Reads the next Execution event, or `None` after a clean stream close.
    ///
    /// # Errors
    ///
    /// Returns an error when a stream message is missing, oversized, or invalid.
    pub async fn next(&mut self) -> Result<Option<sandbox::execution::ExecutionEvent>, Error> {
        let Some(message) = self.reader.next_json::<ExecutionServerMessage>().await? else {
            return Ok(None);
        };
        Ok(Some(match message {
            ExecutionServerMessage::Stdout { data } => {
                let data = decode_stream_data(data, "standard output")?;
                sandbox::execution::ExecutionEvent::Stdout(data.into())
            }
            ExecutionServerMessage::Stderr { data } => {
                let data = decode_stream_data(data, "standard error")?;
                sandbox::execution::ExecutionEvent::Stderr(data.into())
            }
            ExecutionServerMessage::Exited { code } => {
                sandbox::execution::ExecutionEvent::Exited(sandbox::execution::ExitStatus { code })
            }
            ExecutionServerMessage::Failed { message } => sandbox::execution::ExecutionEvent::Failed { message },
        }))
    }
}

impl TerminalInput {
    /// Writes raw terminal input bytes.
    ///
    /// # Errors
    ///
    /// Returns an error when the stream cannot encode or deliver the input.
    pub async fn write(&mut self, data: &[u8]) -> Result<(), Error> {
        if self.closed {
            return Err(Error::Invalid("terminal input is closed".into()));
        }
        if data.is_empty() {
            return Ok(());
        }
        write_stream_message(
            &mut self.writer,
            &TerminalClientMessage::Input {
                data: BASE64.encode(data),
            },
        )
        .await
    }

    /// Sends end-of-file to the attached process.
    ///
    /// # Errors
    ///
    /// Returns an error when the control message cannot be delivered.
    pub async fn close(&mut self) -> Result<(), Error> {
        if self.closed {
            return Ok(());
        }
        write_stream_message(&mut self.writer, &TerminalClientMessage::CloseInput).await?;
        self.closed = true;
        Ok(())
    }

    /// Changes the remote terminal dimensions.
    ///
    /// # Errors
    ///
    /// Returns an error when the size is invalid or cannot be delivered.
    pub async fn resize(&mut self, size: sandbox::terminal::TerminalSize) -> Result<(), Error> {
        write_stream_message(
            &mut self.writer,
            &TerminalClientMessage::Resize {
                rows: size.rows(),
                columns: size.columns(),
            },
        )
        .await
    }
}

/// Output and completion events for an attached terminal.
pub struct TerminalEvents {
    reader: MessageReader<TerminalReader>,
}

impl TerminalEvents {
    /// Reads the next terminal event, or `None` after a clean stream close.
    ///
    /// # Errors
    ///
    /// Returns an error when a stream message is missing, oversized, or invalid.
    pub async fn next(&mut self) -> Result<Option<sandbox::terminal::TerminalEvent>, Error> {
        let Some(message) = self.reader.next_json::<TerminalServerMessage>().await? else {
            return Ok(None);
        };
        Ok(Some(match message {
            TerminalServerMessage::Output { data } => {
                let data = BASE64
                    .decode(data)
                    .map_err(|error| Error::Invalid(format!("terminal output is not valid base64: {error}")))?;
                sandbox::terminal::TerminalEvent::Output(data.into())
            }
            TerminalServerMessage::Exited { code } => {
                sandbox::terminal::TerminalEvent::Exited(sandbox::execution::ExitStatus { code })
            }
            TerminalServerMessage::Failed { message } => sandbox::terminal::TerminalEvent::Failed { message },
        }))
    }
}

impl Client {
    /// Creates a client with a replaceable stream Connector.
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

    /// Creates a client for an unauthenticated and unencrypted TCP endpoint.
    #[must_use]
    pub fn for_tcp(endpoint: super::TcpEndpoint) -> Self {
        Self::new(Rc::new(super::tcp::TcpConnector::new(endpoint)))
    }

    /// Checks whether the daemon speaks the expected Control API.
    ///
    /// # Errors
    ///
    /// Returns an error when the daemon is unavailable or protocol-incompatible.
    pub async fn health(&self) -> Result<(), Error> {
        let result: Health = self.call(METHOD_HEALTH, serde_json::json!({})).await?;
        if result.protocol_version == super::PROTOCOL_VERSION {
            Ok(())
        } else {
            Err(Error::ControlApiVersion {
                expected: super::PROTOCOL_VERSION,
                actual: result.protocol_version,
            })
        }
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

    /// Starts a daemon-owned non-interactive Execution stream.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent cannot converge, its Sandbox rejects
    /// the Execution, or the streaming protocol cannot be established.
    pub async fn start_execution(&self, agent: &str, command: Vec<String>) -> Result<AttachedExecution, Error> {
        let (result, stream): (ExecutionStreamResult, _) = self
            .open_call(
                METHOD_EXECUTION_START,
                ExecutionStartParams {
                    agent: agent.into(),
                    command,
                },
            )
            .await?;
        Ok(AttachedExecution {
            id: result.execution_id,
            events: ExecutionEvents {
                reader: MessageReader::new(stream),
            },
        })
    }

    /// Starts a daemon-owned interactive terminal Execution stream.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent cannot converge, its Sandbox rejects
    /// the Execution, or the streaming protocol cannot be established.
    pub async fn start_terminal_execution(
        &self,
        agent: &str,
        command: Vec<String>,
        initial_size: sandbox::terminal::TerminalSize,
    ) -> Result<AttachedTerminal, Error> {
        let (result, stream): (ExecutionStreamResult, _) = self
            .open_call(
                METHOD_TERMINAL_EXECUTION_START,
                TerminalExecutionStartParams {
                    agent: agent.into(),
                    command,
                    rows: initial_size.rows(),
                    columns: initial_size.columns(),
                },
            )
            .await?;
        Ok(attached_terminal(result, stream))
    }

    /// Starts daemon-owned host listeners which forward into an Agent Sandbox.
    ///
    /// The listeners remain active until the returned session is dropped or
    /// every daemon listener stops.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent cannot converge, a listener cannot
    /// bind, or the streaming protocol cannot be established.
    pub async fn start_port_forwards(
        &self,
        agent: &str,
        specs: Vec<crate::sandbox::PortForwardSpec>,
    ) -> Result<PortForwardSession, Error> {
        let expected_bindings = specs.len();
        let (result, stream): (PortForwardStartResult, _) = self
            .open_call(
                METHOD_PORT_FORWARD_START,
                PortForwardStartParams {
                    agent: agent.into(),
                    specs,
                },
            )
            .await?;
        PortForwardSession::new(result.bindings, expected_bindings, stream)
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
        if !self.connector.allows_credential_transfer() {
            return Err(Error::Rpc(ResponseError {
                code: CODE_CALLER_NOT_PERMITTED,
                message: MESSAGE_CALLER_NOT_PERMITTED.into(),
            }));
        }
        self.call(METHOD_AUTH_LOGIN, LoginParams { harness, credential }).await
    }

    /// Creates or resolves one named Session.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is not ready or the registry cannot persist the session.
    pub async fn ensure_session(
        &self,
        agent: &str,
        name: sessions::SessionName,
        harness: Option<harness::Harness>,
    ) -> Result<sessions::Session, Error> {
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

    /// Opens a daemon-owned terminal attachment to one ready Session.
    ///
    /// # Errors
    ///
    /// Returns an error when the Session cannot be attached or the streaming
    /// protocol cannot be established.
    pub async fn attach_session(
        &self,
        agent: &str,
        name: sessions::SessionName,
        initial_size: sandbox::terminal::TerminalSize,
    ) -> Result<AttachedTerminal, Error> {
        let (result, stream): (ExecutionStreamResult, _) = self
            .open_call(
                METHOD_SESSION_ATTACH,
                SessionAttachParams {
                    agent: agent.into(),
                    name,
                    rows: initial_size.rows(),
                    columns: initial_size.columns(),
                },
            )
            .await?;
        Ok(attached_terminal(result, stream))
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
        self.open_call(method, params).await.map(|(result, _stream)| result)
    }

    async fn open_call<P: Serialize, R: DeserializeOwned>(
        &self,
        method: &str,
        params: P,
    ) -> Result<(R, BufReader<Box<dyn Connection>>), Error> {
        let id = self.next_id.get().wrapping_add(1);
        self.next_id.set(id);
        let request = Request {
            jsonrpc: JSON_RPC_VERSION.into(),
            method: method.into(),
            params: serde_json::to_value(params)?,
            id,
        };
        let mut stream = self.connector.connect().await?;
        write_stream_message(&mut stream, &request).await?;

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
        let result = serde_json::from_value(
            response
                .result
                .ok_or_else(|| Error::Invalid("Agent Control API response has no result".into()))?,
        )
        .map_err(Error::from)?;
        Ok((result, stream))
    }
}

fn attached_terminal(result: ExecutionStreamResult, stream: BufReader<Box<dyn Connection>>) -> AttachedTerminal {
    let (reader, writer) = tokio::io::split(stream);
    AttachedTerminal {
        id: result.execution_id,
        input: TerminalInput { writer, closed: false },
        events: TerminalEvents {
            reader: MessageReader::new(BufReader::new(reader)),
        },
    }
}

fn decode_stream_data(data: String, stream: &str) -> Result<Vec<u8>, Error> {
    BASE64
        .decode(data)
        .map_err(|error| Error::Invalid(format!("Execution {stream} is not valid base64: {error}")))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct Health {
    protocol_version: String,
}
