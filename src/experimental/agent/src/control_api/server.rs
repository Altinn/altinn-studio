mod streams;

use streams::{serve_execution, serve_port_forwards, serve_terminal};

use std::{rc::Rc, time::Duration};

use sandbox::LocalFuture;
use serde::Serialize;
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncWrite, BufReader};

use crate::{Agent, Error, control_plane, harness, sessions};

use super::protocol::{
    CODE_AGENT_NOT_FOUND, CODE_CALLER_NOT_PERMITTED, CODE_IMMUTABLE, CODE_INTERNAL, CODE_INVALID_PARAMS,
    CODE_INVALID_REQUEST, CODE_METHOD_NOT_FOUND, CODE_PARSE_ERROR, DirectoryParams, ExecutionStartParams,
    JSON_RPC_VERSION, LoginParams, MESSAGE_CALLER_NOT_PERMITTED, METHOD_APPLY, METHOD_AUTH_LOGIN, METHOD_DELETE,
    METHOD_EXECUTION_START, METHOD_GET, METHOD_HEALTH, METHOD_LIST, METHOD_PORT_FORWARD_START,
    METHOD_RESOLVE_DIRECTORY, METHOD_SESSION_ATTACH, METHOD_SESSION_ENSURE, METHOD_SESSION_GET, METHOD_SESSION_LIST,
    METHOD_TERMINAL_EXECUTION_START, NameParams, PROTOCOL_VERSION, PortForwardStartParams, PortForwardStartResult,
    ReadMessage, Request, Response, SessionAttachParams, SessionListParams, SessionParams,
    TerminalExecutionStartParams, error_response, read_message, write_stream_message,
};

const REMOTE_REQUEST_IDLE_TIMEOUT: Duration = Duration::from_secs(30);

/// Agent operations exposed through the Agent Control API.
pub trait AgentApi {
    /// Creates or updates desired Agent state.
    fn apply(&self, request: control_plane::ApplyRequest) -> LocalFuture<'_, Result<Agent, Error>>;

    /// Gets an Agent by name.
    fn get<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<Agent, Error>>;

    /// Lists every active Agent.
    fn list(&self) -> LocalFuture<'_, Result<Vec<Agent>, Error>>;

    /// Resolves an Agent from its persisted source directory.
    fn resolve_directory<'a>(&'a self, directory: &'a std::path::Path) -> LocalFuture<'a, Result<Agent, Error>>;

    /// Requests asynchronous deletion.
    fn delete<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<(), Error>>;
}

impl AgentApi for control_plane::ControlPlane {
    fn apply(&self, request: control_plane::ApplyRequest) -> LocalFuture<'_, Result<Agent, Error>> {
        Box::pin(async move { Self::apply(self, request).await })
    }

    fn get<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<Agent, Error>> {
        Box::pin(async move { Self::get(self, name).await })
    }

    fn list(&self) -> LocalFuture<'_, Result<Vec<Agent>, Error>> {
        Box::pin(async move { Self::list(self).await })
    }

    fn resolve_directory<'a>(&'a self, directory: &'a std::path::Path) -> LocalFuture<'a, Result<Agent, Error>> {
        Box::pin(async move { Self::resolve_directory(self, directory).await })
    }

    fn delete<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { Self::delete(self, name).await })
    }
}

/// Host-side authentication operations exposed through the Agent Control API.
pub trait AuthenticationApi {
    /// Stores a host-acquired credential for one harness.
    fn login<'a>(
        &'a self,
        harness: harness::Harness,
        credential: &'a str,
    ) -> LocalFuture<'a, Result<harness::ImportedAuthentication, Error>>;
}

impl AuthenticationApi for harness::AuthenticationManager {
    fn login<'a>(
        &'a self,
        harness: harness::Harness,
        credential: &'a str,
    ) -> LocalFuture<'a, Result<harness::ImportedAuthentication, Error>> {
        Box::pin(async move {
            self.login(harness, zeroize::Zeroizing::new(credential.to_owned()))
                .await
        })
    }
}

/// Host-tracked Session operations exposed through the Agent Control API.
pub trait SessionApi {
    /// Creates or resolves one named Session.
    fn ensure<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        harness: Option<harness::Harness>,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>>;

    /// Gets one named Session scoped to an Agent.
    fn get<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>>;

    /// Lists tracked Sessions, optionally scoped to one Agent.
    fn list<'a>(&'a self, agent: Option<&'a str>) -> LocalFuture<'a, Result<Vec<sessions::Session>, Error>>;
}

/// Daemon-owned interactive Session attachment operations.
pub trait AttachmentApi {
    /// Starts a terminal stream attached to one ready Session.
    fn attach<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        initial_size: sandbox::terminal::TerminalSize,
    ) -> LocalFuture<'a, Result<sandbox::terminal::StartedTerminalExecution, Error>>;
}

impl AttachmentApi for sessions::AttachmentService {
    fn attach<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        initial_size: sandbox::terminal::TerminalSize,
    ) -> LocalFuture<'a, Result<sandbox::terminal::StartedTerminalExecution, Error>> {
        Box::pin(async move { Self::attach(self, agent, name, initial_size).await })
    }
}

impl SessionApi for sessions::Service {
    fn ensure<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        harness: Option<harness::Harness>,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>> {
        Box::pin(async move {
            Self::ensure(self, agent, name, harness)
                .await
                .map(|target| target.session)
        })
    }

    fn get<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>> {
        Box::pin(async move { Self::get(self, agent, name).await })
    }

    fn list<'a>(&'a self, agent: Option<&'a str>) -> LocalFuture<'a, Result<Vec<sessions::Session>, Error>> {
        Box::pin(async move { Self::list(self, agent).await })
    }
}

/// Transient Agent Execution operations exposed through the Agent Control API.
pub trait ExecutionApi {
    /// Starts one non-interactive Execution and returns its event stream.
    fn start<'a>(
        &'a self,
        name: &'a str,
        command: Vec<String>,
    ) -> LocalFuture<'a, Result<sandbox::execution::StartedExecution, Error>>;

    /// Starts one interactive terminal Execution and returns its stream.
    fn start_terminal<'a>(
        &'a self,
        name: &'a str,
        command: Vec<String>,
        initial_size: sandbox::terminal::TerminalSize,
    ) -> LocalFuture<'a, Result<sandbox::terminal::StartedTerminalExecution, Error>>;
}

impl ExecutionApi for crate::sandbox::ExecutionService {
    fn start<'a>(
        &'a self,
        name: &'a str,
        command: Vec<String>,
    ) -> LocalFuture<'a, Result<sandbox::execution::StartedExecution, Error>> {
        Box::pin(async move { Self::start(self, name, &command).await })
    }

    fn start_terminal<'a>(
        &'a self,
        name: &'a str,
        command: Vec<String>,
        initial_size: sandbox::terminal::TerminalSize,
    ) -> LocalFuture<'a, Result<sandbox::terminal::StartedTerminalExecution, Error>> {
        Box::pin(async move { Self::start_terminal(self, name, &command, initial_size).await })
    }
}

/// Daemon-owned host-to-Sandbox port-forward operations.
pub trait PortForwardApi {
    /// Binds host listeners and starts relaying them into one Agent Sandbox.
    fn start<'a>(
        &'a self,
        agent: &'a str,
        specs: Vec<crate::sandbox::PortForwardSpec>,
    ) -> LocalFuture<'a, Result<Vec<Rc<dyn crate::sandbox::RunningPortForward>>, Error>>;
}

impl PortForwardApi for crate::sandbox::PortForwardService {
    fn start<'a>(
        &'a self,
        agent: &'a str,
        specs: Vec<crate::sandbox::PortForwardSpec>,
    ) -> LocalFuture<'a, Result<Vec<Rc<dyn crate::sandbox::RunningPortForward>>, Error>> {
        Box::pin(async move { Self::start(self, agent, specs).await })
    }
}

/// Observes an isolated connection error without terminating the daemon.
pub type ErrorHandler = Rc<dyn Fn(&Error)>;

/// Trust level established by the transport accepting a Control API connection.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Caller {
    /// Current OS user authenticated by local socket permissions.
    Local,
    /// Caller on the explicitly insecure TCP listener.
    RemoteUnauthenticated,
}

impl Caller {
    const fn request_idle_timeout(self) -> Option<Duration> {
        match self {
            Self::Local => None,
            Self::RemoteUnauthenticated => Some(REMOTE_REQUEST_IDLE_TIMEOUT),
        }
    }
}

/// Serves the Agent Control API.
pub struct Server {
    agents: Rc<dyn AgentApi>,
    authentication: Rc<dyn AuthenticationApi>,
    attachments: Rc<dyn AttachmentApi>,
    executions: Rc<dyn ExecutionApi>,
    port_forwards: Rc<dyn PortForwardApi>,
    sessions: Rc<dyn SessionApi>,
    on_error: ErrorHandler,
}

impl Server {
    /// Creates an Agent Control API server.
    #[must_use]
    pub fn new(
        agents: Rc<dyn AgentApi>,
        authentication: Rc<dyn AuthenticationApi>,
        attachments: Rc<dyn AttachmentApi>,
        executions: Rc<dyn ExecutionApi>,
        port_forwards: Rc<dyn PortForwardApi>,
        sessions: Rc<dyn SessionApi>,
        on_error: ErrorHandler,
    ) -> Self {
        Self {
            agents,
            authentication,
            attachments,
            executions,
            port_forwards,
            sessions,
            on_error,
        }
    }

    /// Listens on the platform's local socket implementation.
    ///
    /// # Errors
    ///
    /// Returns an error when the endpoint cannot be secured, bound, or served.
    pub async fn serve_path(self: Rc<Self>, path: &std::path::Path) -> Result<(), Error> {
        super::socket::serve(self, path).await
    }

    /// Serves the explicitly insecure Control API on a pre-bound TCP listener.
    ///
    /// # Errors
    ///
    /// Returns an error when accepting or serving TCP connections fails.
    pub async fn serve_tcp(self: Rc<Self>, listener: tokio::net::TcpListener) -> Result<(), Error> {
        super::tcp::serve(self, listener).await
    }

    /// Serves one JSON object per line until the client closes its stream.
    ///
    /// # Errors
    ///
    /// Returns an error when a message is malformed, exceeds the limit, or cannot be read or written.
    pub async fn serve_connection<S>(&self, stream: S, caller: Caller) -> Result<(), Error>
    where
        S: AsyncRead + AsyncWrite + Unpin,
    {
        let mut stream = BufReader::new(stream);
        loop {
            let line = match read_message_with_timeout(&mut stream, caller.request_idle_timeout()).await? {
                ReadMessage::EndOfStream => return Ok(()),
                ReadMessage::Complete(line) => line,
                ReadMessage::TooLarge => {
                    write_stream_message(
                        stream.get_mut(),
                        &error_response(0, CODE_PARSE_ERROR, "JSON-RPC request exceeds 4 MiB"),
                    )
                    .await?;
                    return Err(Error::Invalid("Agent Control API request exceeds 4 MiB".into()));
                }
            };

            let request = match serde_json::from_slice::<Request>(&line) {
                Ok(request) => request,
                Err(error) => {
                    write_stream_message(
                        stream.get_mut(),
                        &error_response(0, CODE_PARSE_ERROR, "invalid JSON-RPC request"),
                    )
                    .await?;
                    return Err(Error::Json(error));
                }
            };
            if request.jsonrpc == JSON_RPC_VERSION && is_streaming_method(&request.method) {
                return self.serve_stream_request(stream, request, caller).await;
            }
            let response = self.handle(request, caller).await;
            write_stream_message(stream.get_mut(), &response).await?;
        }
    }

    pub(crate) fn report(&self, error: &Error) {
        (self.on_error)(error);
    }

    async fn serve_stream_request<S>(&self, stream: BufReader<S>, request: Request, caller: Caller) -> Result<(), Error>
    where
        S: AsyncRead + AsyncWrite + Unpin,
    {
        let Request { method, params, id, .. } = request;
        match method.as_str() {
            METHOD_SESSION_ATTACH => serve_terminal(stream, id, self.start_session_attachment(params).await).await,
            METHOD_TERMINAL_EXECUTION_START => {
                serve_terminal(stream, id, self.start_terminal_execution(params).await).await
            }
            METHOD_EXECUTION_START => serve_execution(stream, id, self.start_execution(params).await).await,
            METHOD_PORT_FORWARD_START => self.handle_port_forward_stream(stream, id, params, caller).await,
            _ => Err(Error::Invalid("unknown streaming Control API method".into())),
        }
    }

    async fn handle(&self, request: Request, caller: Caller) -> Response {
        if request.jsonrpc != JSON_RPC_VERSION || request.method.is_empty() {
            return error_response(request.id, CODE_INVALID_REQUEST, "invalid JSON-RPC 2.0 request");
        }
        match request.method.as_str() {
            METHOD_APPLY => self.handle_apply(request.id, request.params).await,
            METHOD_HEALTH => result_response(
                request.id,
                Ok(serde_json::json!({
                    "protocolVersion": PROTOCOL_VERSION
                })),
            ),
            METHOD_GET => self.handle_get(request.id, request.params).await,
            METHOD_LIST => result_response(request.id, self.agents.list().await),
            METHOD_RESOLVE_DIRECTORY => self.handle_resolve_directory(request.id, request.params).await,
            METHOD_DELETE => self.handle_delete(request.id, request.params).await,
            METHOD_AUTH_LOGIN if caller == Caller::RemoteUnauthenticated => {
                error_response(request.id, CODE_CALLER_NOT_PERMITTED, MESSAGE_CALLER_NOT_PERMITTED)
            }
            METHOD_AUTH_LOGIN => self.handle_auth_login(request.id, request.params).await,
            METHOD_SESSION_ENSURE => self.handle_session_ensure(request.id, request.params).await,
            METHOD_SESSION_GET => self.handle_session_get(request.id, request.params).await,
            METHOD_SESSION_LIST => self.handle_session_list(request.id, request.params).await,
            _ => error_response(request.id, CODE_METHOD_NOT_FOUND, "method not found"),
        }
    }

    async fn handle_apply(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<control_plane::ApplyRequest>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "invalid apply parameters");
        };
        result_response(id, self.agents.apply(params).await)
    }

    async fn handle_get(&self, id: u64, value: Value) -> Response {
        let params = match name_params(value) {
            Ok(params) => params,
            Err(response) => return response_with_id(id, response),
        };
        result_response(id, self.agents.get(&params.name).await)
    }

    async fn handle_resolve_directory(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<DirectoryParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "directory is required");
        };
        result_response(id, self.agents.resolve_directory(&params.directory).await)
    }

    async fn handle_delete(&self, id: u64, value: Value) -> Response {
        let params = match name_params(value) {
            Ok(params) => params,
            Err(response) => return response_with_id(id, response),
        };
        result_response(
            id,
            self.agents.delete(&params.name).await.map(|()| serde_json::json!({})),
        )
    }

    async fn handle_auth_login(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<LoginParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "harness and credential are required");
        };
        result_response(id, self.authentication.login(params.harness, &params.credential).await)
    }

    async fn handle_session_ensure(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent and session name are required");
        };
        result_response(
            id,
            self.sessions.ensure(&params.agent, &params.name, params.harness).await,
        )
    }

    async fn handle_session_get(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent and session name are required");
        };
        result_response(id, self.sessions.get(&params.agent, &params.name).await)
    }

    async fn handle_session_list(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionListParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "invalid Session list parameters");
        };
        result_response(id, self.sessions.list(params.agent.as_deref()).await)
    }

    async fn start_session_attachment(
        &self,
        value: Value,
    ) -> Result<sandbox::terminal::StartedTerminalExecution, Error> {
        let params = serde_json::from_value::<SessionAttachParams>(value)
            .map_err(|_| Error::Invalid("agent, session name, rows, and columns are required".into()))?;
        let size = sandbox::terminal::TerminalSize::new(params.rows, params.columns)
            .map_err(|error| Error::Invalid(error.to_string()))?;
        self.attachments.attach(&params.agent, &params.name, size).await
    }

    async fn start_execution(&self, value: Value) -> Result<sandbox::execution::StartedExecution, Error> {
        let params = serde_json::from_value::<ExecutionStartParams>(value)
            .map_err(|_| Error::Invalid("agent and command are required".into()))?;
        self.executions.start(&params.agent, params.command).await
    }

    async fn start_terminal_execution(
        &self,
        value: Value,
    ) -> Result<sandbox::terminal::StartedTerminalExecution, Error> {
        let params = serde_json::from_value::<TerminalExecutionStartParams>(value)
            .map_err(|_| Error::Invalid("agent, command, rows, and columns are required".into()))?;
        let size = sandbox::terminal::TerminalSize::new(params.rows, params.columns)
            .map_err(|error| Error::Invalid(error.to_string()))?;
        self.executions
            .start_terminal(&params.agent, params.command, size)
            .await
    }

    async fn handle_port_forward_stream<S>(
        &self,
        mut stream: BufReader<S>,
        id: u64,
        value: Value,
        caller: Caller,
    ) -> Result<(), Error>
    where
        S: AsyncRead + AsyncWrite + Unpin,
    {
        let Ok(params) = serde_json::from_value::<PortForwardStartParams>(value) else {
            write_stream_message(
                stream.get_mut(),
                &result_response::<PortForwardStartResult>(
                    id,
                    Err(Error::Invalid("agent and port-forward specs are required".into())),
                ),
            )
            .await?;
            return Ok(());
        };
        if caller == Caller::RemoteUnauthenticated && params.specs.iter().any(|spec| !spec.address().is_loopback()) {
            write_stream_message(
                stream.get_mut(),
                &error_response(id, CODE_CALLER_NOT_PERMITTED, MESSAGE_CALLER_NOT_PERMITTED),
            )
            .await?;
            return Ok(());
        }
        let forwards = self.port_forwards.start(&params.agent, params.specs).await;
        serve_port_forwards(stream, id, forwards).await
    }
}

fn is_streaming_method(method: &str) -> bool {
    matches!(
        method,
        METHOD_SESSION_ATTACH | METHOD_TERMINAL_EXECUTION_START | METHOD_EXECUTION_START | METHOD_PORT_FORWARD_START
    )
}

async fn read_message_with_timeout<R>(reader: &mut R, timeout: Option<Duration>) -> Result<ReadMessage, Error>
where
    R: tokio::io::AsyncBufRead + Unpin,
{
    match timeout {
        Some(timeout) => tokio::time::timeout(timeout, read_message(reader))
            .await
            .map_err(|_| {
                Error::Io(std::io::Error::new(
                    std::io::ErrorKind::TimedOut,
                    "Agent Control API request read timed out",
                ))
            })?
            .map_err(Error::from),
        None => read_message(reader).await.map_err(Error::from),
    }
}

fn name_params(value: Value) -> Result<NameParams, Response> {
    serde_json::from_value::<NameParams>(value)
        .ok()
        .filter(|params| !params.name.is_empty())
        .ok_or_else(|| error_response(0, CODE_INVALID_PARAMS, "name is required"))
}

const fn response_with_id(id: u64, mut response: Response) -> Response {
    response.id = id;
    response
}

fn result_response<T: Serialize>(id: u64, result: Result<T, Error>) -> Response {
    match result {
        Ok(value) => serde_json::to_value(value).map_or_else(
            |_| error_response(id, CODE_INTERNAL, "encode response result"),
            |result| Response {
                jsonrpc: JSON_RPC_VERSION.into(),
                id,
                result: Some(result),
                error: None,
            },
        ),
        Err(Error::NotFound) => error_response(id, CODE_AGENT_NOT_FOUND, Error::NotFound.to_string()),
        Err(Error::Immutable(field)) => error_response(id, CODE_IMMUTABLE, Error::Immutable(field).to_string()),
        Err(Error::Conflict) => error_response(id, CODE_IMMUTABLE, Error::Conflict.to_string()),
        Err(Error::Invalid(message)) => error_response(id, CODE_INVALID_PARAMS, message),
        Err(error) => error_response(id, CODE_INTERNAL, error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;
    use tokio::io::AsyncWriteExt as _;

    #[tokio::test(flavor = "local")]
    async fn incomplete_request_reads_have_a_configurable_idle_deadline() {
        let (mut client, server) = tokio::io::duplex(64);
        client.write_all(b"{").await.expect("write incomplete request");
        let mut server = BufReader::new(server);

        let error = read_message_with_timeout(&mut server, Some(Duration::from_millis(10)))
            .await
            .expect_err("incomplete request should time out");

        assert!(matches!(error, Error::Io(error) if error.kind() == std::io::ErrorKind::TimedOut));
    }
}
