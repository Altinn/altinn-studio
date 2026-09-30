use std::{cell::Cell, rc::Rc, time::Duration};

use sandbox::LocalFuture;
use serde::Serialize;
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::sync::Notify;

use crate::{
    Agent, Error, control_plane, control_plane::WaitPolicy, harness, progress::AgentProgress, resources::Changes,
    sessions,
};

use super::protocol::{
    CODE_IMMUTABLE, CODE_INTERNAL, CODE_INVALID_PARAMS, CODE_INVALID_REQUEST, CODE_METHOD_NOT_FOUND, CODE_NOT_FOUND,
    CODE_PARSE_ERROR, CODE_UPDATING, DirectoryParams, ExecutionEnsureParams, Following, JSON_RPC_VERSION, LoginParams,
    METHOD_APPLY, METHOD_AUTH_LOGIN, METHOD_DELETE, METHOD_EXECUTION_ENSURE, METHOD_EXECUTION_FOLLOW, METHOD_GET,
    METHOD_HEALTH, METHOD_LIST, METHOD_PROGRESS, METHOD_RESOLVE_DIRECTORY, METHOD_RESOURCES_WATCH,
    METHOD_SESSION_ARCHIVE, METHOD_SESSION_AWAIT_TURN, METHOD_SESSION_DELETE, METHOD_SESSION_ENSURE,
    METHOD_SESSION_FOLLOW, METHOD_SESSION_GET, METHOD_SESSION_LIST, METHOD_SESSION_PROMPT, METHOD_SESSION_TURNS,
    METHOD_SESSION_UNARCHIVE, METHOD_SHUTDOWN, METHOD_SSH_ACCESS, METHOD_VNC_ACCESS, NameParams, PROTOCOL_VERSION,
    ProgressParams, PromptReceipt, ReadMessage, Request, ResourcesWatchParams, Response, SessionAwaitTurnParams,
    SessionEnsureParams, SessionListParams, SessionParams, SessionPromptParams, SessionTurnsParams, ShutdownParams,
    error_response, read_message,
};

/// Quiet period after a change before a progress reply, so a burst of byte
/// progress costs one reply.
const PROGRESS_SETTLE: Duration = Duration::from_millis(50);
/// Quiet period after a resource change before a watch replies, so a burst of
/// changes, such as byte progress during an image pull, costs one reply.
const WATCH_SETTLE: Duration = Duration::from_millis(150);
/// Longest one request waits: a watch without a change, whose unchanged reply
/// tells the watcher the daemon is still there, or one poll of a wait that
/// the client follows up. No request outlives it, so a client that has gone
/// away frees its connection by itself.
const LONG_POLL: Duration = Duration::from_secs(30);

/// Agent operations exposed through the Agent Control API.
pub trait AgentApi {
    /// Creates or updates desired Agent state.
    fn apply(&self, request: control_plane::ApplyRequest) -> LocalFuture<'_, Result<Agent, Error>>;

    /// Gets an Agent by name.
    fn get<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<Agent, Error>>;

    /// Lists every active Agent.
    fn list(&self) -> LocalFuture<'_, Result<Vec<Agent>, Error>>;

    /// Resolves an Agent from its persisted source directory.
    fn resolve_directory<'a>(
        &'a self,
        directory: &'a std::path::Path,
        variant: Option<&'a crate::AgentVariantName>,
    ) -> LocalFuture<'a, Result<Agent, Error>>;

    /// Requests asynchronous deletion.
    fn delete<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<(), Error>>;

    /// Reads an Agent's stored status and its latest pass's progress, with
    /// only the output after `output` when it names the same pass.
    fn progress<'a>(
        &'a self,
        name: &'a str,
        output: Option<crate::progress::OutputPosition>,
    ) -> LocalFuture<'a, Result<(crate::Status, Option<crate::progress::Provisioning>), Error>>;
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

    fn resolve_directory<'a>(
        &'a self,
        directory: &'a std::path::Path,
        variant: Option<&'a crate::AgentVariantName>,
    ) -> LocalFuture<'a, Result<Agent, Error>> {
        Box::pin(async move { self.resolve_directory_variant(directory, variant).await })
    }

    fn delete<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { Self::delete(self, name).await })
    }

    fn progress<'a>(
        &'a self,
        name: &'a str,
        output: Option<crate::progress::OutputPosition>,
    ) -> LocalFuture<'a, Result<(crate::Status, Option<crate::progress::Provisioning>), Error>> {
        Box::pin(async move { Self::progress(self, name, output).await })
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
    /// Creates or resolves one named session attach target; see [`sessions::Service::ensure`].
    fn ensure<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        request: sessions::SessionRequest,
        wait: WaitPolicy,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>>;

    /// Gets one named Session scoped to an Agent.
    fn get<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>>;

    /// Lists tracked Sessions, optionally scoped to one Agent.
    fn list<'a>(&'a self, agent: Option<&'a str>) -> LocalFuture<'a, Result<Vec<sessions::Session>, Error>>;

    /// Creates or gets one named Session without waiting; see [`sessions::Service::create`].
    fn create<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        request: sessions::SessionRequest,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Waits for an existing Session's attach target; see [`sessions::Service::follow`].
    fn follow<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        wake: bool,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>>;

    /// Delivers a prompt to a running Session's harness and returns its
    /// completed-turn count from before delivery; see [`sessions::Service::prompt`].
    fn prompt<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        prompt: &'a str,
    ) -> LocalFuture<'a, Result<u64, Error>>;

    /// Waits up to `bound` for a completed turn past `after`; see [`sessions::Service::await_turn`].
    fn await_turn<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        after: u64,
        bound: Duration,
    ) -> LocalFuture<'a, Result<sessions::TurnWait, Error>>;

    /// Reads the harness transcript of a Session as ordered turns.
    fn turns<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        last: Option<usize>,
    ) -> LocalFuture<'a, Result<Vec<sessions::Turn>, Error>>;

    /// Requests release of one Session; see [`sessions::Service::delete`].
    fn delete<'a>(&'a self, agent: &'a str, name: &'a sessions::SessionName) -> LocalFuture<'a, Result<(), Error>>;

    /// Archives or unarchives one Session; see [`sessions::Service::set_archived`].
    fn set_archived<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        archived: bool,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>>;

    /// Lists Sessions whose work or terminal attachment prevents an upgrade.
    fn upgrade_readiness(&self) -> LocalFuture<'_, Result<sessions::UpgradeReadiness, Error>>;
}

impl SessionApi for sessions::Service {
    fn ensure<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        request: sessions::SessionRequest,
        wait: WaitPolicy,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>> {
        Box::pin(async move { Self::ensure(self, agent, name, request, wait).await })
    }

    fn create<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        request: sessions::SessionRequest,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { Self::create(self, agent, name, request).await })
    }

    fn follow<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        wake: bool,
    ) -> LocalFuture<'a, Result<sessions::AttachTarget, Error>> {
        Box::pin(async move { Self::follow(self, agent, name, wake).await })
    }

    fn prompt<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        prompt: &'a str,
    ) -> LocalFuture<'a, Result<u64, Error>> {
        Box::pin(async move { Self::prompt(self, agent, name, prompt).await })
    }

    fn await_turn<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        after: u64,
        bound: Duration,
    ) -> LocalFuture<'a, Result<sessions::TurnWait, Error>> {
        Box::pin(async move { Self::await_turn(self, agent, name, after, bound).await })
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

    fn set_archived<'a>(
        &'a self,
        agent: &'a str,
        name: &'a sessions::SessionName,
        archived: bool,
    ) -> LocalFuture<'a, Result<sessions::Session, Error>> {
        Box::pin(async move { Self::set_archived(self, agent, name, archived).await })
    }

    fn delete<'a>(&'a self, agent: &'a str, name: &'a sessions::SessionName) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { Self::delete(self, agent, name).await })
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
    ) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>>;

    /// Waits, without waking convergence, for the Agent's ready Sandbox assignment.
    fn follow<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>>;
}

impl ExecutionApi for crate::sandbox::ExecutionService {
    fn ensure<'a>(
        &'a self,
        name: &'a str,
        wait: WaitPolicy,
    ) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>> {
        Box::pin(async move { Self::ensure(self, name, wait).await })
    }

    fn follow<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::sandbox::ExecutionTarget, Error>> {
        Box::pin(async move { Self::follow(self, name).await })
    }
}

/// SSH access descriptors exposed through the local control API.
pub trait SshAccessApi {
    /// Describes the SSH access of a named Agent.
    fn describe<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::ssh::AccessInfo, Error>>;
}

impl SshAccessApi for crate::ssh::Access {
    fn describe<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::ssh::AccessInfo, Error>> {
        Box::pin(async move { Self::describe(self, name).await })
    }
}

/// VNC access descriptors exposed through the local control API.
pub trait VncAccessApi {
    /// Describes the VNC access of a named Agent.
    fn describe<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::vnc::AccessInfo, Error>>;
}

impl VncAccessApi for crate::vnc::Access {
    fn describe<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<crate::vnc::AccessInfo, Error>> {
        Box::pin(async move { Self::describe(self, name).await })
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
    active_mutations: Cell<usize>,
    mutations_idle: Notify,
    shutdown: Notify,
}

impl Lifecycle {
    fn admit_mutation(&self) -> Option<MutationGuard<'_>> {
        if self.state.get() != LifecycleState::Running {
            return None;
        }
        self.active_mutations.set(self.active_mutations.get() + 1);
        Some(MutationGuard { lifecycle: self })
    }

    async fn wait_for_mutations(&self) {
        loop {
            let notified = self.mutations_idle.notified();
            if self.active_mutations.get() == 0 {
                return;
            }
            notified.await;
        }
    }
}

struct MutationGuard<'a> {
    lifecycle: &'a Lifecycle,
}

impl Drop for MutationGuard<'_> {
    fn drop(&mut self) {
        let remaining = self.lifecycle.active_mutations.get() - 1;
        self.lifecycle.active_mutations.set(remaining);
        if remaining == 0 {
            self.lifecycle.mutations_idle.notify_waiters();
        }
    }
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
    ssh: Rc<dyn SshAccessApi>,
    vnc: Rc<dyn VncAccessApi>,
    changes: Changes,
    on_error: ErrorHandler,
    lifecycle: Lifecycle,
}

impl Server {
    /// Creates an Agent Control API server.
    #[must_use]
    #[allow(
        clippy::too_many_arguments,
        reason = "each API the server dispatches to is wired explicitly at the daemon boundary"
    )]
    pub fn new(
        agents: Rc<dyn AgentApi>,
        authentication: Rc<dyn AuthenticationApi>,
        executions: Rc<dyn ExecutionApi>,
        sessions: Rc<dyn SessionApi>,
        ssh: Rc<dyn SshAccessApi>,
        vnc: Rc<dyn VncAccessApi>,
        changes: Changes,
        on_error: ErrorHandler,
    ) -> Self {
        Self {
            agents,
            authentication,
            executions,
            sessions,
            ssh,
            vnc,
            changes,
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
            let response = self.handle(request).await;
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

    async fn handle(&self, request: Request) -> Response {
        if request.jsonrpc != JSON_RPC_VERSION || request.method.is_empty() {
            return error_response(request.id, CODE_INVALID_REQUEST, "invalid JSON-RPC 2.0 request");
        }
        let mutation = if is_mutating(&request.method) {
            let Some(mutation) = self.lifecycle.admit_mutation() else {
                return error_response(request.id, CODE_UPDATING, "Agent daemon is preparing for an upgrade");
            };
            Some(mutation)
        } else {
            None
        };
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
            METHOD_PROGRESS => self.handle_progress(request.id, request.params).await,
            METHOD_RESOURCES_WATCH => self.handle_resources_watch(request.id, request.params).await,
            METHOD_RESOLVE_DIRECTORY => self.handle_resolve_directory(request.id, request.params).await,
            METHOD_EXECUTION_ENSURE => self.handle_execution_ensure(request.id, request.params, mutation).await,
            METHOD_EXECUTION_FOLLOW => self.handle_execution_follow(request.id, request.params).await,
            METHOD_DELETE => self.handle_delete(request.id, request.params).await,
            METHOD_SSH_ACCESS => self.handle_ssh_access(request.id, request.params).await,
            METHOD_VNC_ACCESS => self.handle_vnc_access(request.id, request.params).await,
            METHOD_AUTH_LOGIN => self.handle_auth_login(request.id, request.params).await,
            METHOD_SESSION_ENSURE => self.handle_session_ensure(request.id, request.params, mutation).await,
            METHOD_SESSION_FOLLOW => self.handle_session_follow(request.id, request.params).await,
            METHOD_SESSION_GET => self.handle_session_get(request.id, request.params).await,
            METHOD_SESSION_LIST => self.handle_session_list(request.id, request.params).await,
            METHOD_SESSION_PROMPT => self.handle_session_prompt(request.id, request.params).await,
            METHOD_SESSION_AWAIT_TURN => self.handle_session_await_turn(request.id, request.params).await,
            METHOD_SESSION_TURNS => self.handle_session_turns(request.id, request.params).await,
            METHOD_SESSION_DELETE => self.handle_session_delete(request.id, request.params).await,
            METHOD_SESSION_ARCHIVE => self.handle_session_archive(request.id, request.params, true).await,
            METHOD_SESSION_UNARCHIVE => self.handle_session_archive(request.id, request.params, false).await,
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
        let readiness = tokio::time::timeout(Duration::from_mins(1), async {
            let readiness = self.sessions.upgrade_readiness().await?;
            if !readiness.blockers.is_empty() {
                return Ok(readiness);
            }
            self.lifecycle.wait_for_mutations().await;
            self.sessions.upgrade_readiness().await
        })
        .await;
        match readiness {
            Ok(Ok(readiness)) if readiness.blockers.is_empty() => {
                check.commit();
                result_response(id, Ok(serde_json::json!({"warnings": readiness.warnings})))
            }
            Ok(Ok(readiness)) => error_response(
                id,
                CODE_INVALID_PARAMS,
                format!("active Sessions block the upgrade: {}", readiness.blockers.join(", ")),
            ),
            Ok(Err(error)) => result_response::<serde_json::Value>(id, Err(error)),
            Err(_) => error_response(id, CODE_UPDATING, "Agent did not finish preparing for an upgrade"),
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
        result_response(
            id,
            self.agents
                .resolve_directory(&params.directory, params.variant.as_ref())
                .await,
        )
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

    async fn handle_ssh_access(&self, id: u64, value: Value) -> Response {
        let params = match name_params(value) {
            Ok(params) => params,
            Err(response) => return response_with_id(id, response),
        };
        result_response(id, self.ssh.describe(&params.name).await)
    }

    /// Long-polls for a change after the caller's revision, then returns the
    /// Agent's status and progress. Draining returns at once so an upgrade is
    /// never held by a follower.
    async fn handle_progress(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<ProgressParams>(value) else {
            return error_response(
                id,
                CODE_INVALID_PARAMS,
                "name is required, and after must be a revision",
            );
        };
        tokio::select! {
            _changed = self.changes.changed_since(params.after, PROGRESS_SETTLE, LONG_POLL) => {}
            () = self.shutdown_requested() => {}
        }
        let revision = self.changes.revision();
        let progress = self
            .agents
            .progress(&params.name, params.output)
            .await
            .map(|(status, provisioning)| AgentProgress {
                revision,
                status,
                provisioning,
            });
        result_response(id, progress)
    }

    /// Long-polls for a resource change after the caller's revision, then
    /// returns every Agent and Session. Draining returns at once so an upgrade
    /// is never held by a watcher.
    async fn handle_resources_watch(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<ResourcesWatchParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "after must be a resource revision");
        };
        tokio::select! {
            _changed = self.changes.changed_since(params.after, WATCH_SETTLE, LONG_POLL) => {}
            () = self.shutdown_requested() => {}
        }
        let revision = self.changes.revision();
        let resources = async {
            Ok(crate::resources::Resources {
                revision,
                agents: self.agents.list().await?,
                sessions: self.sessions.list(None).await?,
            })
        };
        result_response(id, resources.await)
    }

    async fn handle_vnc_access(&self, id: u64, value: Value) -> Response {
        let params = match name_params(value) {
            Ok(params) => params,
            Err(response) => return response_with_id(id, response),
        };
        result_response(id, self.vnc.describe(&params.name).await)
    }

    async fn handle_execution_ensure(&self, id: u64, value: Value, mutation: Option<MutationGuard<'_>>) -> Response {
        let Ok(params) = serde_json::from_value::<ExecutionEnsureParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "name is required");
        };
        if params.name.is_empty() {
            return error_response(id, CODE_INVALID_PARAMS, "name is required");
        }
        if !params.follow {
            return result_response(id, self.executions.ensure(&params.name, WaitPolicy::FirstPass).await);
        }
        // Admission refused new work during a drain; waiting records nothing,
        // so it must not hold one.
        drop(mutation);
        result_response(
            id,
            self.poll(self.executions.ensure(&params.name, WaitPolicy::UntilReady))
                .await,
        )
    }

    async fn handle_execution_follow(&self, id: u64, value: Value) -> Response {
        let params = match name_params(value) {
            Ok(params) => params,
            Err(response) => return response_with_id(id, response),
        };
        result_response(id, self.poll(self.executions.follow(&params.name)).await)
    }

    /// Waits for one long-poll at most, or until the daemon drains, then
    /// replies [`Following::Pending`] so the client asks again.
    ///
    /// Dropping `wait` must leave nothing half done: it may only wake
    /// reconciliation and read.
    async fn poll<T>(&self, wait: impl Future<Output = Result<T, Error>>) -> Result<Following<T>, Error> {
        tokio::select! {
            result = wait => result.map(Following::Done),
            () = tokio::time::sleep(LONG_POLL) => Ok(Following::Pending),
            () = self.shutdown_requested() => Ok(Following::Pending),
        }
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

    async fn handle_session_ensure(&self, id: u64, value: Value, mutation: Option<MutationGuard<'_>>) -> Response {
        let params = match serde_json::from_value::<SessionEnsureParams>(value) {
            Ok(params) => params,
            // The selections carry their own validation, so name the decoding failure
            // instead of blaming the two required fields.
            Err(error) => {
                return error_response(
                    id,
                    CODE_INVALID_PARAMS,
                    format!("agent and session name are required, and selections must be valid: {error}"),
                );
            }
        };
        let request = sessions::SessionRequest {
            harness: params.harness,
            model_selection: params.model_selection,
            initial_prompt: params.initial_prompt,
        };
        if !params.follow {
            return result_response(
                id,
                self.sessions
                    .ensure(&params.agent, &params.name, request, WaitPolicy::FirstPass)
                    .await,
            );
        }
        // The Session is recorded before the bounded wait, so a reply that
        // ends the wait never cuts creating it short.
        if let Err(error) = self.sessions.create(&params.agent, &params.name, request).await {
            return result_response::<()>(id, Err(error));
        }
        // The recorded Session is the only change; waiting must not hold a drain.
        drop(mutation);
        result_response(
            id,
            self.poll(self.sessions.follow(&params.agent, &params.name, true)).await,
        )
    }

    async fn handle_session_follow(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent and session name are required");
        };
        result_response(
            id,
            self.poll(self.sessions.follow(&params.agent, &params.name, false))
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
                .prompt(&params.agent, &params.name, &params.prompt)
                .await
                .map(|turns| PromptReceipt { turns }),
        )
    }

    async fn handle_session_await_turn(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionAwaitTurnParams>(value) else {
            return error_response(
                id,
                CODE_INVALID_PARAMS,
                "agent, session name and turn count are required",
            );
        };
        // The wait bounds itself, so the turn count it may have raised survives.
        let waited = tokio::select! {
            waited = self.sessions.await_turn(&params.agent, &params.name, params.after, LONG_POLL) => waited,
            () = self.shutdown_requested() => Ok(sessions::TurnWait::Pending { after: params.after }),
        };
        result_response(id, waited)
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

    async fn handle_session_delete(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent and session name are required");
        };
        result_response(
            id,
            self.sessions
                .delete(&params.agent, &params.name)
                .await
                .map(|()| serde_json::json!({})),
        )
    }

    async fn handle_session_archive(&self, id: u64, value: Value, archived: bool) -> Response {
        let Ok(params) = serde_json::from_value::<SessionParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "agent and session name are required");
        };
        result_response(
            id,
            self.sessions.set_archived(&params.agent, &params.name, archived).await,
        )
    }

    async fn handle_session_list(&self, id: u64, value: Value) -> Response {
        let Ok(params) = serde_json::from_value::<SessionListParams>(value) else {
            return error_response(id, CODE_INVALID_PARAMS, "invalid Session list parameters");
        };
        result_response(id, self.sessions.list(params.agent.as_deref()).await)
    }
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
            | METHOD_SESSION_DELETE
            | METHOD_SESSION_ARCHIVE
            | METHOD_SESSION_UNARCHIVE
    )
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
