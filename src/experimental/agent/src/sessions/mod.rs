//! Durable, runtime-driven Sessions owned by the Agent daemon.

mod controller;
mod reconciler;
mod service;
mod tmux;

use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{AgentId, Error, Harness, sandbox};

pub use crate::controller::Reconcile;
pub use controller::{AgentNotifier, Controller, ErrorHandler, Wakeup};
pub use reconciler::Reconciler;
pub use service::Service;

/// Immutable identity of one Session incarnation.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct SessionId(Uuid);

impl SessionId {
    pub(crate) fn generate() -> Self {
        Self(Uuid::new_v4())
    }
}

impl std::fmt::Display for SessionId {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(formatter)
    }
}

impl std::str::FromStr for SessionId {
    type Err = uuid::Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        value.parse().map(Self)
    }
}

/// Validated persistent name of one Session.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(try_from = "String", into = "String")]
pub struct SessionName(String);

impl SessionName {
    /// Creates a validated Session name.
    ///
    /// # Errors
    ///
    /// Returns an error unless the name is 1–64 portable ASCII characters.
    pub fn new(value: impl Into<String>) -> Result<Self, Error> {
        let value = value.into();
        if value.is_empty()
            || value.len() > 64
            || !value
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
        {
            return Err(Error::Invalid(
                "Session name must be 1-64 ASCII letters, digits, '-' or '_'".into(),
            ));
        }
        Ok(Self(value))
    }

    /// Returns the name as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for SessionName {
    type Error = Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl From<SessionName> for String {
    fn from(value: SessionName) -> Self {
        value.0
    }
}

impl std::fmt::Display for SessionName {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

/// Most recently observed Session lifecycle state.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum State {
    /// The Session has not yet reached a running harness.
    #[default]
    Starting,
    /// The harness is running inside its tmux Session.
    Running,
    /// The harness was deliberately stopped after inactivity.
    Idle,
    /// Reconciliation most recently failed.
    Failed,
}

/// Most recently observed Session state.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Status {
    /// Normalized lifecycle state.
    #[serde(default)]
    pub state: State,
    /// Failure from the latest reconciliation attempt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failure: Option<String>,
    /// Harness-native conversation ID reported by the running harness.
    ///
    /// Set by the authenticated Session hook handler and cleared by the Session
    /// reconciler when its Sandbox is replaced; lifecycle status writes preserve it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub harness_session_id: Option<String>,
}

/// Durable bookkeeping for the most recent harness launch of one Session.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LaunchState {
    /// Sandbox ID the harness was launched in.
    pub sandbox: String,
    /// Launch time as Unix seconds.
    pub launched_at: i64,
    /// Consecutive launches without a sustained healthy observation.
    pub attempts: u32,
}

/// Opaque bearer token authenticating one exact harness launch.
#[derive(Clone, Eq, PartialEq)]
pub struct LaunchToken(Uuid);

impl LaunchToken {
    pub(crate) fn generate() -> Self {
        Self(Uuid::new_v4())
    }

    pub(crate) fn expose(&self) -> String {
        self.0.to_string()
    }
}

impl std::fmt::Debug for LaunchToken {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("LaunchToken([redacted])")
    }
}

impl std::str::FromStr for LaunchToken {
    type Err = uuid::Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        value.parse().map(Self)
    }
}

/// One new harness launch to persist before its external effects begin.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LaunchRecord {
    /// Per-launch bearer token expected by the Session hook endpoint.
    pub token: LaunchToken,
    /// Sandbox ID the harness is being launched in.
    pub sandbox: String,
    /// Launch time as Unix seconds.
    pub launched_at: i64,
    /// Consecutive launches without a sustained healthy observation.
    pub attempts: u32,
}

/// Persistent identity and observed state of one named Session.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Session {
    /// Immutable Session identity.
    pub id: SessionId,
    /// Immutable identity of the owning Agent incarnation.
    pub agent_id: AgentId,
    /// Owning Agent name.
    pub agent: String,
    /// User-facing name scoped to the Agent incarnation.
    pub name: SessionName,
    /// Immutable harness installation selected for this Session.
    pub harness: Harness,
    /// First time the Session was requested.
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    /// Most recently observed driver state.
    #[serde(default)]
    pub status: Status,
    /// Desired activation revision, written only by explicit Session ensure.
    #[serde(skip)]
    pub(crate) activation_generation: u64,
    /// Activation revision observed by the lifecycle reconciler.
    #[serde(skip)]
    pub(crate) observed_activation_generation: u64,
}

/// Non-secret information required for a terminal attachment.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AttachTarget {
    /// Persistent Session metadata and driver assignment.
    pub session: Session,
    // TODO: Replace this provider assignment with a daemon-owned attachment capability.
    /// Provider-qualified materialized Sandbox assignment.
    pub sandbox: sandbox::Assignment,
}

/// Persistent Session operations required by reconciliation.
pub trait SessionStore {
    /// Creates or gets one named Session for the active Agent incarnation.
    fn ensure_session<'a>(
        &'a self,
        agent: &'a str,
        name: &'a SessionName,
        harness: Harness,
    ) -> ::sandbox::LocalFuture<'a, Result<Session, Error>>;

    /// Gets one Session by immutable identity.
    fn get_session(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<Session, Error>>;

    /// Gets one named Session from the active incarnation of an Agent.
    fn get_agent_session<'a>(
        &'a self,
        agent: &'a str,
        name: &'a SessionName,
    ) -> ::sandbox::LocalFuture<'a, Result<Session, Error>>;

    /// Lists every persistent Session.
    fn list_all_sessions(&self) -> ::sandbox::LocalFuture<'_, Result<Vec<Session>, Error>>;

    /// Lists Sessions for the active incarnation of one Agent name.
    fn list_agent_sessions<'a>(&'a self, agent: &'a str) -> ::sandbox::LocalFuture<'a, Result<Vec<Session>, Error>>;

    /// Replaces lifecycle state for the desired activation revision observed by the reconciler.
    fn update_session_status(
        &self,
        id: SessionId,
        status: Status,
        observed_activation_generation: u64,
    ) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;

    /// Requests that an Idle Session become active and returns the new desired revision.
    fn activate_session(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<u64, Error>>;

    /// Resolves a ready Session into a terminal attachment target.
    fn session_attach_target(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<AttachTarget, Error>>;

    /// Replaces the harness-native conversation ID (`None` clears it).
    fn set_session_native_id(
        &self,
        id: SessionId,
        native: Option<String>,
    ) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;

    /// Sets the native ID only when `token` still identifies this exact launch.
    fn set_session_native_id_for_launch<'a>(
        &'a self,
        id: SessionId,
        token: &'a LaunchToken,
        native: &'a str,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>>;

    /// Durably records a new harness launch before its external effects begin.
    fn record_session_launch(
        &self,
        id: SessionId,
        launch: LaunchRecord,
    ) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;

    /// Reads the most recent launch bookkeeping, when one exists.
    fn session_launch_state(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<Option<LaunchState>, Error>>;

    /// Resets the consecutive-launch counter after a sustained healthy observation.
    fn reset_session_launch_attempts(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;
}

pub(crate) type SharedStore = std::rc::Rc<dyn SessionStore>;

/// Attaches a local terminal to the Session's tmux runtime.
///
/// This single entry point is the seam for a later runtime replacement; only
/// this module and `tmux` know how a Session is carried inside the Sandbox.
///
/// # Errors
///
/// Returns an error when the Session is not ready or the recorded Sandbox
/// Provider cannot carry the attachment.
pub async fn attach(home: &std::path::Path, target: &AttachTarget) -> Result<(), Error> {
    // TODO: Move attachment behind a runtime-neutral capability after a second
    // Session runtime establishes the interface tmux currently supplies.
    tmux::attach(home, target).await
}
