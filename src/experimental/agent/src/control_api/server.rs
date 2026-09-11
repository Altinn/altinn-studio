use std::{cell::Cell, rc::Rc};

use sandbox::LocalFuture;
use serde::Serialize;
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::sync::Notify;

use crate::{Agent, Error, control_plane, control_plane::WaitPolicy, harness, progress::Reporter, sessions};

use super::outbox::Outbox;
use super::protocol::{
    CODE_IMMUTABLE, CODE_INTERNAL, CODE_INVALID_PARAMS, CODE_INVALID_REQUEST, CODE_METHOD_NOT_FOUND, CODE_NOT_FOUND,
    CODE_PARSE_ERROR, CODE_UPDATING, DirectoryParams, ExecutionEnsureParams, JSON_RPC_VERSION, LoginParams,
    METHOD_APPLY, METHOD_AUTH_LOGIN, METHOD_DELETE, METHOD_EXECUTION_ENSURE, METHOD_GET, METHOD_HEALTH, METHOD_LIST,
    METHOD_PROGRESS_EVENT, METHOD_RESOLVE_DIRECTORY, METHOD_SESSION_ENSURE, METHOD_SESSION_GET, METHOD_SESSION_LIST,
    METHOD_SESSION_PROMPT, METHOD_SESSION_TURNS, METHOD_SHUTDOWN, NameParams, Notification, PROTOCOL_VERSION,
    ReadMessage, Request, Response, SessionEnsureParams, SessionListParams, SessionParams, SessionPromptParams,
    SessionTurnsParams, ShutdownParams, error_response, read_message,
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
    /// Stores a credential for one harness; `imported` marks one supplied by the caller
    /// instead of minted by the host login flow.
    fn login<'a>(
        &'a self,
        harness: harness::Harness,
        credential: &'a str,
        imported: bool,
    ) -> LocalFuture<'a, Result<harness::ImportedAuthentication, Error>>;
}

impl AuthenticationApi for harness::AuthenticationManager {
    fn login<'a>(
        &'a self,
        harness: harness::Harness,
        credential: &'a str,
        imported: bool,
    ) -> LocalFuture<'a, Result<harness::ImportedAuthentication, Error>> {
        Box::pin(async move {
            self.login(harness, zeroize::Zeroizing::new(credential.to_owned()), imported)
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
        initial_prompt: Option<&'a str>,
        wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>>;

    /// Gets one named Session scoped to an Agent.
    fn get<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>>;

    /// Lists tracked Sessions, optionally scoped to one Agent.
    fn list<'a>(&'a self, agent: Option<&'a str>) -> LocalFuture<'a, Result<Vec<sessions::Session>, Error>>;

    /// Delivers a prompt to a running Session's harness, optionally waiting for
    /// a completed turn and settled activity; see [`sessions::Service::prompt`].
    fn prompt<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        prompt: &'a str,
        wait: bool,
        timeout: Option<std::time::Duration>,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Reads the harness transcript of a Session as ordered turns.
    fn turns<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        last: Option<usize>,
    ) -> LocalFuture<'a, Result<Vec<sessions::Turn>, Error>>;

    /// Lists Sessions whose work or terminal attachment prevents an upgrade.
    fn upgrade_readiness(&self) -> LocalFuture<'_, Result<sessions::UpgradeReadiness, Error>>;
}

impl SessionApi for sessions::Service {
    fn ensure<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        harness: Option<harness::Harness>,
        initial_prompt: Option<&'a str>,
        wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>> {
        Box::pin(async move { Self::ensure(self, agent, name, harness, initial_prompt, wait, progress).await })
    }

    fn prompt<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        prompt: &'a str,
        wait: bool,
        timeout: Option<std::time::Duration>,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { Self::prompt(self, agent, name, prompt, wait, timeout).await })
    }

    fn turns<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        last: Option<usize>,
    ) -> LocalFuture<'a, Result<Vec<sessions::Turn>, Error>> {
        Box::pin(async move { Self::turns(self, agent, name, last).await })
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

    fn upgrade_readiness(&self) -> LocalFuture<'_, Result<sessions::UpgradeReadiness, Error>> {
        Box::pin(Self::upgrade_readiness(self))
    }
}

/// Transient Agent Execution target resolution exposed through the local control API.
pub trait ExecutionApi {
    /// Converges an Agent and returns its exact ready Sandbox assignment.
    fn ensure<'a>(
        &'a self,
        name: &'a str,
        wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>>;
}

impl ExecutionApi for crate::sandbox::ExecutionService {
    fn ensure<'a>(
        &'a self,
        name: &'a str,
        wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>> {
        Box::pin(async move { Self::ensure(self, name, wait, progress).await })
    }
}

/// Observes an isolated connection error without terminating the daemon.
pub type ErrorHandler = Rc<dyn Fn(&Error)>;

#[derive(Clone, Copy, Default, Eq, PartialEq)]
enum LifecycleState {
    #[default]
    Running,
    Checking,
    Draining,
}

#[derive(Default)]
struct Lifecycle {
    state: Cell<LifecycleState>,
    shutdown: Notify,
}

struct ShutdownCheck<'a> {
    lifecycle: &'a Lifecycle,
    committed: bool,
}

impl ShutdownCheck<'_> {
    fn commit(mut self) {
        self.lifecycle.state.set(LifecycleState::Draining);
        self.lifecycle.shutdown.notify_waiters();
        self.committed = true;
    }
}

impl Drop for ShutdownCheck<'_> {
    fn drop(&mut self) {
        if !self.committed {
            self.lifecycle.state.set(LifecycleState::Running);
        }
    }
}

/// Serves the Agent Control API.
pub struct Server {
    agents: Rc<dyn AgentApi>,
    authentication: Rc<dyn AuthenticationApi>,
    executions: Rc<dyn ExecutionApi>,
    sessions: Rc<dyn SessionApi>,
    on_error: ErrorHandler,
    lifecycle: Lifecycle,
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
            lifecycle: Lifecycle::default(),
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
            if self.is_draining() {
                return Ok(());
            }
            let message = tokio::select! {
                message = read_message(&mut stream) => message?,
                () = self.shutdown_requested() => return Ok(()),
            };
            let line = match message {
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
            let outbox = Outbox::new();
            let mut response = std::pin::pin!(self.handle(request, outbox.reporter()));
            let response = loop {
                tokio::select! {
                    () = outbox.readied() => flush(&outbox, stream.get_mut()).await?,
                    response = &mut response => break response,
                }
            };
            flush(&outbox, stream.get_mut()).await?;
            write_response(stream.get_mut(), &response).await?;
        }
    }

    pub(crate) fn report(&self, error: &Error) {
        (self.on_error)(error);
    }

    pub(crate) fn is_draining(&self) -> bool {
        self.lifecycle.state.get() == LifecycleState::Draining
    }

    pub(crate) async fn shutdown_requested(&self) {
        if !self.is_draining() {
            self.lifecycle.shutdown.notified().await;
        }
    }

    async fn handle(&self, request: Request, progress: crate::progress::Reporter) -> Response {
        if request.jsonrpc != JSON_RPC_VERSION || request.method.is_empty() {
            return error_response(request.id, CODE_INVALID_REQUEST, "invalid JSON-RPC 2.0 request");
        }
        if self.lifecycle.state.get() != LifecycleState::Running && is_mutating(&request.method) {
            return error_response(request.id, CODE_UPDATING, "Agent daemon is preparing for an upgrade");
        }
        match request.method.as_str() {
            METHOD_APPLY => self.handle_apply(request.id, request.params).await,
            METHOD_HEALTH => result_response(
                request.id,
                Ok(serde_json::json!({
                    "protocolVersion": PROTOCOL_VERSION,
                    "buildVersion": crate::build_version()
                })),
            ),
            METHOD_SHUTDOWN => self.handle_shutdown(request.id, request.params).await,
            METHOD_GET => self.handle_get(request.id, request.params).await,
            METHOD_LIST => result_response(request.id, self.agents.list().await),
            METHOD_RESOLVE_DIRECTORY => self.handle_resolve_directory(request.id, request.params).await,
            METHOD_EXECUTION_ENSURE => self.handle_execution_ensure(request.id, request.params, progress).await,
            METHOD_DELETE => self.handle_delete(request.id, request.params).await,
            METHOD_AUTH_LOGIN => self.handle_auth_login(request.id, request.params).await,
            METHOD_SESSION_ENSURE => self.handle_session_ensure(request.id, request.params, progress).await,
            METHOD_SESSION_GET => self.handle_session_get(request.id, request.params).await,
            METHOD_SESSION_LIST => self.handle_session_list(request.id, request.params).await,
            METHOD_SESSION_PROMPT => self.handle_session_prompt(request.id, request.params).await,
            METHOD_SESSION_TURNS => self.handle_session_turns(request.id, request.params).await,
            _ => error_response(request.id, CODE_METHOD_NOT_FOUND, "method not found"),
        }
    }

    async fn handle_shutdown(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<ShutdownParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "shutdown reason is required");
        };
        if params.reason != "upgrade" {
            return error_response(id, CODE_INVALID_PARAMS, "unsupported shutdown reason");
        }
        if self.lifecycle.state.get() != LifecycleState::Running {
            return error_response(id, CODE_UPDATING, "Agent daemon is already preparing for an upgrade");
        }
        self.lifecycle.state.set(LifecycleState::Checking);
        let check = ShutdownCheck {
            lifecycle: &self.lifecycle,
            committed: false,
        };
        match self.sessions.upgrade_readiness().await {
            Ok(readiness) if readiness.blockers.is_empty() => {
                check.commit();
                result_response(id, Ok(serde_json::json!({"warnings": readiness.warnings})))
            }
            Ok(readiness) => error_response(
                id,
                CODE_INVALID_PARAMS,
                format!("active Sessions block the upgrade: {}", readiness.blockers.join(", ")),
            ),
            Err(error) => result_response::<serde_json::Value>(id, Err(error)),
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

    async fn handle_execution_ensure(&self, id: u64, value: Value, progress: crate::progress::Reporter) -> Response {
        let Ok(params) = serde_json::from_value::<ExecutionEnsureParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "name is required");
        };
        if params.name.is_empty() {
            return error_response(id, CODE_INVALID_PARAMS, "name is required");
        }
        let (wait, progress) = observation(params.follow, params.progress, progress);
        result_response(id, self.executions.ensure(&params.name, wait, progress).await)
    }

    async fn handle_auth_login(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<LoginParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "harness and credential are required");
        };
        result_response(
            id,
            self.authentication
                .login(params.harness, &params.credential, params.imported)
                .await,
        )
    }

    async fn handle_session_ensure(&self, id: u64, value: Value, progress: crate::progress::Reporter) -> Response {
        let Ok(params) = serde_json::from_value::<SessionEnsureParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent and session name are required");
        };
        let (wait, progress) = observation(params.follow, params.progress, progress);
        result_response(
            id,
            self.sessions
                .ensure(
                    &params.agent,
                    &params.name,
                    params.harness,
                    params.initial_prompt.as_deref(),
                    wait,
                    progress,
                )
                .await,
        )
    }

    async fn handle_session_prompt(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionPromptParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent, session name and prompt are required");
        };
        result_response(
            id,
            self.sessions
                .prompt(&params.agent, &params.name, &params.prompt, params.wait, params.timeout)
                .await
                .map(|()| serde_json::json!({})),
        )
    }

    async fn handle_session_turns(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionTurnsParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent and session name are required");
        };
        result_response(id, self.sessions.turns(&params.agent, &params.name, params.last).await)
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

/// Maps the request's opt-in flags to the wait policy and optional progress sink.
fn observation(follow: bool, progress: bool, reporter: Reporter) -> (WaitPolicy, Option<Reporter>) {
    let wait = if follow {
        WaitPolicy::UntilReady
    } else {
        WaitPolicy::FirstPass
    };
    (wait, progress.then_some(reporter))
}

fn is_mutating(method: &str) -> bool {
    matches!(
        method,
        METHOD_APPLY
            | METHOD_DELETE
            | METHOD_EXECUTION_ENSURE
            | METHOD_AUTH_LOGIN
            | METHOD_SESSION_ENSURE
            | METHOD_SESSION_PROMPT
    )
}

async fn flush<W: AsyncWrite + Unpin>(outbox: &Outbox, writer: &mut W) -> Result<(), Error> {
    while let Some(event) = outbox.pop() {
        write_notification(writer, &event).await?;
    }
    Ok(())
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
        Err(Error::NotFound) => error_response(id, CODE_NOT_FOUND, Error::NotFound.to_string()),
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

async fn write_notification<W: AsyncWrite + Unpin>(
    writer: &mut W,
    event: &crate::progress::Event,
) -> Result<(), Error> {
    let notification = Notification {
        jsonrpc: JSON_RPC_VERSION.into(),
        method: METHOD_PROGRESS_EVENT.into(),
        params: serde_json::to_value(event)?,
    };
    let mut bytes = serde_json::to_vec(&notification)?;
    bytes.push(b'\n');
    writer.write_all(&bytes).await?;
    writer.flush().await?;
    Ok(())
}
