use std::rc::Rc;

use sandbox::LocalFuture;
use serde::Serialize;
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};

use crate::{Agent, Error, control_plane, harness, sessions};

use super::protocol::{
    CODE_AGENT_NOT_FOUND, CODE_IMMUTABLE, CODE_INTERNAL, CODE_INVALID_PARAMS, CODE_INVALID_REQUEST,
    CODE_METHOD_NOT_FOUND, CODE_PARSE_ERROR, DirectoryParams, JSON_RPC_VERSION, LoginParams, METHOD_APPLY,
    METHOD_AUTH_LOGIN, METHOD_DELETE, METHOD_EXECUTION_ENSURE, METHOD_GET, METHOD_HEALTH, METHOD_LIST,
    METHOD_RESOLVE_DIRECTORY, METHOD_SESSION_ENSURE, METHOD_SESSION_GET, METHOD_SESSION_LIST, NameParams,
    PROTOCOL_VERSION, ReadMessage, Request, Response, SessionListParams, SessionParams, error_response, read_message,
};

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

/// Host-side authentication operations exposed through the local control API.
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

/// Host-tracked session operations exposed through the local control API.
pub trait SessionApi {
    /// Creates or resolves one named session attach target.
    fn ensure<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        harness: Option<harness::Harness>,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>>;

    /// Gets one named Session scoped to an Agent.
    fn get<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>>;

    /// Lists tracked Sessions, optionally scoped to one Agent.
    fn list<'a>(&'a self, agent: Option<&'a str>) -> LocalFuture<'a, Result<Vec<sessions::Session>, Error>>;
}

impl SessionApi for sessions::Service {
    fn ensure<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        harness: Option<harness::Harness>,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>> {
        Box::pin(async move { Self::ensure(self, agent, name, harness).await })
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

/// Transient Agent Execution target resolution exposed through the local control API.
pub trait ExecutionApi {
    /// Converges an Agent and returns its exact ready Sandbox assignment.
    fn ensure<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>>;
}

impl ExecutionApi for crate::sandbox::ExecutionService {
    fn ensure<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>> {
        Box::pin(async move { Self::ensure(self, name).await })
    }
}

/// Observes an isolated connection error without terminating the daemon.
pub type ErrorHandler = Rc<dyn Fn(&Error)>;

/// Serves the Agent Control API.
pub struct Server {
    agents: Rc<dyn AgentApi>,
    authentication: Rc<dyn AuthenticationApi>,
    executions: Rc<dyn ExecutionApi>,
    sessions: Rc<dyn SessionApi>,
    on_error: ErrorHandler,
}

impl Server {
    /// Creates an Agent Control API server.
    #[must_use]
    pub fn new(
        agents: Rc<dyn AgentApi>,
        authentication: Rc<dyn AuthenticationApi>,
        executions: Rc<dyn ExecutionApi>,
        sessions: Rc<dyn SessionApi>,
        on_error: ErrorHandler,
    ) -> Self {
        Self {
            agents,
            authentication,
            executions,
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

    /// Serves one JSON object per line until the client closes its stream.
    ///
    /// # Errors
    ///
    /// Returns an error when a message is malformed, exceeds the limit, or cannot be read or written.
    pub async fn serve_connection<S>(&self, stream: S) -> Result<(), Error>
    where
        S: AsyncRead + AsyncWrite + Unpin,
    {
        let mut stream = BufReader::new(stream);
        loop {
            let line = match read_message(&mut stream).await? {
                ReadMessage::EndOfStream => return Ok(()),
                ReadMessage::Complete(line) => line,
                ReadMessage::TooLarge => {
                    write_response(
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
                    write_response(
                        stream.get_mut(),
                        &error_response(0, CODE_PARSE_ERROR, "invalid JSON-RPC request"),
                    )
                    .await?;
                    return Err(Error::Json(error));
                }
            };
            let response = self.handle(request).await;
            write_response(stream.get_mut(), &response).await?;
        }
    }

    pub(crate) fn report(&self, error: &Error) {
        (self.on_error)(error);
    }

    async fn handle(&self, request: Request) -> Response {
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
            METHOD_EXECUTION_ENSURE => self.handle_execution_ensure(request.id, request.params).await,
            METHOD_DELETE => self.handle_delete(request.id, request.params).await,
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

    async fn handle_execution_ensure(&self, id: u64, value: Value) -> Response {
        let params = match name_params(value) {
            Ok(params) => params,
            Err(response) => return response_with_id(id, response),
        };
        result_response(id, self.executions.ensure(&params.name).await)
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

async fn write_response<W: AsyncWrite + Unpin>(writer: &mut W, response: &Response) -> Result<(), Error> {
    let mut bytes = serde_json::to_vec(response)?;
    bytes.push(b'\n');
    writer.write_all(&bytes).await?;
    writer.flush().await?;
    Ok(())
}
