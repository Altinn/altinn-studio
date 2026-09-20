//! Durable, runtime-driven Sessions owned by the Agent daemon.

mod activity;
mod controller;
mod reconciler;
mod runtime;
mod sandboxes;
mod service;
mod transcript;

use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{AgentId, Error, Harness, ModelSelection, sandbox};

pub use crate::controller::Reconcile;
pub use activity::{Activity, ActivityEvent, Phase};
pub use controller::{AgentNotifier, Controller, ErrorHandler, Wakeup};
pub use reconciler::Reconciler;
pub use runtime::{Observation, SessionRuntime, Tmux};
pub use sandboxes::AgentSandboxes;
pub use service::{Service, UpgradeReadiness};
pub use transcript::{Message, Part, Role, Turn};

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

/// Lifecycle state observed by the Session reconciler: whether the harness
/// process is meant to be, and is, running.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LifecycleState {
    /// The Session has not yet reached a running harness.
    #[default]
    Starting,
    /// A resumed harness is running but has not reached its input prompt.
    Resuming,
    /// The harness process is running in its Sandbox.
    Running,
    /// The harness was deliberately stopped after inactivity.
    Idle,
    /// Reconciliation most recently failed.
    Failed,
}

/// The one Session state operators and orchestrators read.
///
/// Derived from the reconciler's lifecycle and the harness's reports; the two
/// halves it is computed from stay available for diagnosis.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum State {
    /// The current launch has not reported in yet: not launched, or booting.
    #[default]
    Starting,
    /// The harness is mid-turn.
    Working,
    /// The harness is idle at its prompt or blocked on the operator.
    WaitingForInput,
    /// The harness was deliberately stopped after inactivity.
    Idle,
    /// Reconciliation most recently failed.
    Failed,
}

/// Most recently observed Session state.
///
/// Two writers own two halves: the lifecycle reconciler writes [`Lifecycle`]
/// and the harness's own reports write [`Reported`]. Persistence stores
/// them in separate columns, so a lifecycle write can never clobber a report.
/// [`Status::state`] is derived from both at read time.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Status {
    /// Derived Session state; see [`State`].
    #[serde(default)]
    pub state: State,
    /// Lifecycle observed by the reconciler.
    #[serde(default)]
    pub lifecycle: Lifecycle,
    /// Facts the running harness reported about itself.
    #[serde(default)]
    pub reported: Reported,
}

impl Status {
    /// Combines the two halves and derives the Session state.
    #[must_use]
    pub const fn new(lifecycle: Lifecycle, reported: Reported) -> Self {
        let state = match lifecycle.state {
            LifecycleState::Failed => State::Failed,
            LifecycleState::Idle => State::Idle,
            LifecycleState::Starting | LifecycleState::Resuming => State::Starting,
            // A start report always folds to `Working`, so an `Unknown` phase means
            // the current launch has not reported yet, even when an earlier launch
            // left a native ID behind for resumption.
            LifecycleState::Running if reported.harness_session_id.is_none() => State::Starting,
            LifecycleState::Running => match reported.activity.phase {
                Phase::Unknown => State::Starting,
                Phase::WaitingForInput => State::WaitingForInput,
                Phase::Working => State::Working,
            },
        };
        Self {
            state,
            lifecycle,
            reported,
        }
    }
}

/// Lifecycle half of [`Status`], written only by the Session reconciler.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Lifecycle {
    /// Normalized lifecycle state.
    #[serde(default)]
    pub state: LifecycleState,
    /// Failure from the latest reconciliation attempt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failure: Option<String>,
}

impl Lifecycle {
    /// A running harness with no failure.
    #[must_use]
    pub const fn running() -> Self {
        Self {
            state: LifecycleState::Running,
            failure: None,
        }
    }

    /// A deliberately stopped harness.
    #[must_use]
    pub const fn idle() -> Self {
        Self {
            state: LifecycleState::Idle,
            failure: None,
        }
    }

    /// A resumed harness waiting to reach its input prompt.
    #[must_use]
    pub const fn resuming() -> Self {
        Self {
            state: LifecycleState::Resuming,
            failure: None,
        }
    }

    /// A resumed harness whose latest readiness attempt was interrupted.
    pub fn resuming_with(failure: impl Into<String>) -> Self {
        Self {
            state: LifecycleState::Resuming,
            failure: Some(failure.into()),
        }
    }

    /// Not yet running, with the reason.
    pub fn starting(failure: impl Into<String>) -> Self {
        Self {
            state: LifecycleState::Starting,
            failure: Some(failure.into()),
        }
    }

    /// The latest reconciliation failed, with the reason.
    pub fn failed(failure: impl Into<String>) -> Self {
        Self {
            state: LifecycleState::Failed,
            failure: Some(failure.into()),
        }
    }
}

/// Report half of [`Status`]: what the running harness said about itself.
///
/// Recorded only for the current launch (see [`SessionReports`]) and cleared
/// by the reconciler when the Sandbox carrying the conversation is replaced.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Reported {
    /// Harness-native conversation ID reported by the running harness.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub harness_session_id: Option<String>,
    /// Harness-native transcript location inside the Sandbox, when the harness
    /// reports one. Opaque to everything but the Session runtime.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub harness_transcript_path: Option<String>,
    /// Harness activity folded from its reports.
    #[serde(default)]
    pub activity: Activity,
}

/// Durable bookkeeping for the most recent harness launch of one Session.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LaunchState {
    /// Bearer token authenticating reports from this launch.
    pub(crate) token: LaunchToken,
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
    /// Per-launch bearer token a harness report must carry to be accepted.
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
    /// Immutable model and effort level resolved when the Session was created:
    /// the caller's request, then the installation's manifest defaults. Every
    /// launch of the harness applies it; an unselected field leaves the harness default.
    #[serde(default, skip_serializing_if = "ModelSelection::is_empty")]
    pub model_selection: ModelSelection,
    /// First time the Session was requested.
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    /// Time deletion was requested; deleting Sessions disappear from user lists
    /// while the controller stops their runtime and removes durable state.
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "time::serde::rfc3339::option"
    )]
    pub deletion_timestamp: Option<OffsetDateTime>,
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

impl Session {
    /// Describes why an operation cannot use this Session's running harness.
    pub(crate) fn not_running_error(&self) -> Error {
        let detail = self
            .status
            .lifecycle
            .failure
            .as_deref()
            .unwrap_or(match self.status.lifecycle.state {
                LifecycleState::Starting => "its lifecycle is starting",
                LifecycleState::Resuming => "its harness is resuming",
                LifecycleState::Idle => "its lifecycle is idle",
                LifecycleState::Failed => "its lifecycle failed without a recorded reason",
                LifecycleState::Running => "its harness has not reported readiness",
            });
        Error::Invalid(format!("Session \"{}\" is not running: {detail}", self.name))
    }
}

/// What a caller may choose when ensuring a Session. Every field is optional.
///
/// The selections apply only when the call creates the Session: an omitted
/// harness, model or effort falls back to the Agent's default installation and
/// that installation's manifest defaults, and the resolved values become the
/// Session's immutable properties. For an existing Session, an explicit value
/// that differs from the recorded one is rejected; omitted ones are ignored.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct SessionRequest {
    /// Harness installation to bind.
    pub harness: Option<Harness>,
    /// Model and effort level the harness launches with.
    pub model_selection: ModelSelection,
    /// First prompt, handed to the harness at its first launch without replay.
    pub initial_prompt: Option<String>,
}

/// Resolved, immutable selections recorded when a Session is created.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NewSession {
    /// Harness installation the Session binds to.
    pub harness: Harness,
    /// Model and effort level the harness launches with, as requested or defaulted.
    pub model_selection: ModelSelection,
    /// The part of [`Self::model_selection`] the caller chose explicitly. When the
    /// Session already exists, only these fields may conflict with what it recorded.
    pub requested: ModelSelection,
    /// First prompt, handed to the harness at its first launch without replay.
    pub initial_prompt: Option<String>,
}

impl NewSession {
    /// A Session bound to `harness` with every other selection left to the harness.
    #[must_use]
    pub const fn for_harness(harness: Harness) -> Self {
        Self {
            harness,
            model_selection: ModelSelection {
                model: None,
                effort: None,
            },
            requested: ModelSelection {
                model: None,
                effort: None,
            },
            initial_prompt: None,
        }
    }

    /// Resolves `requested` against an installation's manifest `defaults`.
    #[must_use]
    pub fn resolved(harness: Harness, requested: ModelSelection, defaults: &ModelSelection) -> Self {
        Self {
            harness,
            model_selection: requested.clone().or(defaults),
            requested,
            initial_prompt: None,
        }
    }
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
pub trait SessionStore: SessionReports {
    /// Creates or gets one named Session for the active Agent incarnation.
    ///
    /// `new` is recorded only when the Session is created: its harness, model and
    /// effort become the Session's immutable properties, and its initial prompt is
    /// handed to the harness at the first launch attempt, without automatic replay.
    /// An existing Session is returned as recorded, unless `new` names another
    /// harness or its explicitly requested model or effort differs, so concurrent
    /// creations cannot silently drop one caller's choice.
    fn ensure_session<'a>(
        &'a self,
        agent: &'a str,
        name: &'a SessionName,
        new: NewSession,
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

    /// Atomically marks one named Session for asynchronous deletion.
    fn mark_session_deleting<'a>(
        &'a self,
        agent: &'a str,
        name: &'a SessionName,
    ) -> ::sandbox::LocalFuture<'a, Result<Session, Error>>;

    /// Removes a marked Session and its launch/report bookkeeping.
    fn finalize_session_deletion(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;

    /// Replaces the lifecycle half of the status for the desired activation
    /// revision observed by the reconciler; the reported half is untouched.
    fn update_session_lifecycle(
        &self,
        id: SessionId,
        lifecycle: Lifecycle,
        observed_activation_generation: u64,
    ) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;

    /// Requests that an Idle Session become active and returns the new desired revision.
    fn activate_session(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<u64, Error>>;

    /// Resolves a ready Session into a terminal attachment target.
    fn session_attach_target(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<AttachTarget, Error>>;

    /// Clears everything the previous harness incarnation reported: the native
    /// conversation ID, its transcript location and the folded activity.
    fn clear_session_report(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;

    /// Durably records a new harness launch and consumes its initial prompt atomically.
    /// Returns the consumed prompt for this attempt. It is never restored, even
    /// if launch fails; recovery can therefore start an empty conversation.
    /// The previous launch's activity is reset so the Session reads as
    /// [`State::Starting`] until this launch reports; the native ID and
    /// transcript location survive because a resumed conversation keeps them.
    fn record_session_launch(
        &self,
        id: SessionId,
        launch: LaunchRecord,
    ) -> ::sandbox::LocalFuture<'_, Result<Option<String>, Error>>;

    /// Reads the most recent launch bookkeeping, when one exists.
    fn session_launch_state(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<Option<LaunchState>, Error>>;

    /// Resets the consecutive-launch counter after a sustained healthy observation.
    fn reset_session_launch_attempts(&self, id: SessionId) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;
}

/// What a running harness reports about itself, recorded for its exact launch.
///
/// This is the only write capability the harness-facing surface holds: it can
/// say what a launch reported, and nothing else about a Session. How the
/// reports travel (today, harness hooks posting to the Platform API) is a
/// transport detail below this trait.
pub trait SessionReports {
    /// Atomically records start identity, transcript location and activity for
    /// this launch. Duplicate event IDs return `None`; stale tokens return `Error::NotFound`.
    fn record_session_start_for_launch<'a>(
        &'a self,
        id: SessionId,
        token: &'a LaunchToken,
        event_id: uuid::Uuid,
        native: &'a str,
        transcript_path: Option<&'a str>,
        at: time::OffsetDateTime,
    ) -> ::sandbox::LocalFuture<'a, Result<Option<crate::sessions::Activity>, Error>>;

    /// Folds one activity event into the Session's activity, only when `token`
    /// still identifies this exact launch, and returns the folded activity.
    /// A stale token or duplicate event ID is a no-op that returns `None`.
    fn apply_session_activity_for_launch<'a>(
        &'a self,
        id: SessionId,
        token: &'a LaunchToken,
        event_id: uuid::Uuid,
        event: ActivityEvent,
        at: OffsetDateTime,
    ) -> ::sandbox::LocalFuture<'a, Result<Option<Activity>, Error>>;
}

pub(crate) type SharedStore = std::rc::Rc<dyn SessionStore>;

/// Attaches a local terminal to the Session's runtime.
///
/// Delegates to the M0 [`Tmux`] runtime through the [`SessionRuntime`] seam;
/// only the runtime knows how a Session is carried inside the Sandbox.
///
/// # Errors
///
/// Returns an error when the Session is not ready or the recorded Sandbox
/// Provider cannot carry the attachment.
pub async fn attach(home: &std::path::Path, target: &AttachTarget) -> Result<(), Error> {
    runtime::Tmux.attach(home, target).await
}

#[cfg(test)]
mod tests {
    use super::{Activity, Lifecycle, LifecycleState, Phase, Reported, State, Status};

    #[test]
    fn state_is_derived_from_both_halves() {
        let reported = |phase: Phase| Reported {
            harness_session_id: Some("native".into()),
            harness_transcript_path: None,
            activity: Activity {
                phase,
                ..Activity::default()
            },
        };
        let cases = [
            (Lifecycle::default(), Reported::default(), State::Starting),
            (Lifecycle::resuming(), Reported::default(), State::Starting),
            (Lifecycle::running(), Reported::default(), State::Starting),
            (Lifecycle::running(), reported(Phase::Working), State::Working),
            (Lifecycle::running(), reported(Phase::Unknown), State::Starting),
            (
                Lifecycle::running(),
                reported(Phase::WaitingForInput),
                State::WaitingForInput,
            ),
            (Lifecycle::idle(), reported(Phase::WaitingForInput), State::Idle),
            (Lifecycle::failed("boom"), reported(Phase::Working), State::Failed),
            (
                Lifecycle::starting("not ready"),
                reported(Phase::Working),
                State::Starting,
            ),
        ];
        for (lifecycle, reported, expected) in cases {
            let status = Status::new(lifecycle.clone(), reported);
            assert_eq!(status.state, expected, "{lifecycle:?}");
            assert_eq!(status.lifecycle, lifecycle);
        }
        assert_eq!(Lifecycle::idle().state, LifecycleState::Idle);
    }
}
