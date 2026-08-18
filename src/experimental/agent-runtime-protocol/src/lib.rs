//! Versioned contracts shared by the Agent Control Plane and sandbox-resident Agent Runtime.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

/// First Agent Runtime Protocol version.
pub const PROTOCOL_VERSION: &str = "v1alpha1";

/// Stable JSON-RPC method names for the Agent Runtime Protocol.
pub mod method {
    /// Perform the runtime handshake.
    pub const HANDSHAKE: &str = "runtime.v1alpha1.handshake";
    /// Create a Session.
    pub const SESSION_CREATE: &str = "runtime.v1alpha1.sessions.create";
    /// Get one Session.
    pub const SESSION_GET: &str = "runtime.v1alpha1.sessions.get";
    /// List Sessions.
    pub const SESSION_LIST: &str = "runtime.v1alpha1.sessions.list";
    /// Stop a Session.
    pub const SESSION_STOP: &str = "runtime.v1alpha1.sessions.stop";
    /// Start or resume a retained Session.
    pub const SESSION_START: &str = "runtime.v1alpha1.sessions.start";
    /// Queue a Run.
    pub const RUN_CREATE: &str = "runtime.v1alpha1.runs.create";
    /// Get one Run.
    pub const RUN_GET: &str = "runtime.v1alpha1.runs.get";
    /// List Runs in one Session.
    pub const RUN_LIST: &str = "runtime.v1alpha1.runs.list";
    /// Cancel a queued or active Run.
    pub const RUN_CANCEL: &str = "runtime.v1alpha1.runs.cancel";
    /// Steer the active Run.
    pub const RUN_STEER: &str = "runtime.v1alpha1.runs.steer";
    /// Observe events after a cursor.
    pub const EVENTS_LIST: &str = "runtime.v1alpha1.events.list";
}

/// Identifies a Session within one Agent Runtime.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct SessionId(String);

impl SessionId {
    /// Creates a Session identifier.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }
}

/// Identifies an installed harness executable and version.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct HarnessInstallationId(String);

impl HarnessInstallationId {
    /// Creates a Harness Installation identifier.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }
}

/// Identifies a supported harness family independently of an installation.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct HarnessId(String);

impl HarnessId {
    /// Creates a Harness identifier.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }
}

/// Optional behavior available for Sessions using a Harness Installation.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SessionFeature {
    /// Stream the underlying terminal when the Session Driver provides one.
    TerminalStreaming,
}

/// Deterministic set of optional Session Features.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(transparent)]
pub struct SessionFeatureSet(BTreeSet<SessionFeature>);

impl SessionFeatureSet {
    /// Reports whether one Session Feature is available.
    #[must_use]
    pub fn contains(&self, feature: SessionFeature) -> bool {
        self.0.contains(&feature)
    }
}

impl<const N: usize> From<[SessionFeature; N]> for SessionFeatureSet {
    fn from(features: [SessionFeature; N]) -> Self {
        Self(features.into_iter().collect())
    }
}

/// One installed harness executable and the Adapter that supports its version.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct HarnessInstallation {
    /// Stable identifier selected when creating Sessions.
    pub id: HarnessInstallationId,
    /// Harness family, such as `codex` or `claude-code`.
    pub harness: HarnessId,
    /// Installed harness version.
    pub version: String,
    /// Optional Session behavior supported by this installation and Adapter.
    pub session_features: SessionFeatureSet,
}

/// Normalized lifecycle of a long-lived harness work context.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SessionState {
    /// The Agent Runtime is creating the Session.
    Starting,
    /// The Session can accept queued Runs and steering.
    Ready,
    /// The Session is retained without a running harness process.
    Stopped,
    /// The Session cannot currently be operated.
    Failed,
}

/// Sandbox-owned, harness-backed work context.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Session {
    /// Session identifier within one Agent Runtime.
    pub id: SessionId,
    /// Harness Installation selected when the Session was created.
    pub harness_installation: HarnessInstallationId,
    /// Normalized lifecycle state independent of active Run state.
    pub state: SessionState,
}

/// Creates a Session inside one Agent Runtime.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateSessionRequest {
    /// Harness Installation to use.
    pub harness_installation: HarnessInstallationId,
}

/// Identifies one addressable Run within a Session.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct RunId(String);

impl RunId {
    /// Creates a Run identifier.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }
}

/// Initial input that creates a Run.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Prompt {
    /// Text supplied to the harness.
    pub text: String,
}

/// Normalized state of one queued prompt execution.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RunState {
    /// The Run is waiting behind earlier work in its Session.
    Queued,
    /// The harness is processing the Run.
    Running,
    /// The Run completed successfully.
    Succeeded,
    /// The Run ended unsuccessfully.
    Failed,
    /// The Run was cancelled before successful completion.
    Cancelled,
}

/// One addressable prompt execution within a Session.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Run {
    /// Run identifier.
    pub id: RunId,
    /// Session that owns the Run.
    pub session_id: SessionId,
    /// Initial input that created the Run.
    pub prompt: Prompt,
    /// Current normalized Run state.
    pub state: RunState,
}

/// Queues a Prompt as a new Run.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateRunRequest {
    /// Session in which to queue the Run.
    pub session_id: SessionId,
    /// Initial input.
    pub prompt: Prompt,
}

/// Additional input sent to the active Run.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SteerRunRequest {
    /// Session that owns the active Run.
    pub session_id: SessionId,
    /// Active Run receiving the input.
    pub run_id: RunId,
    /// Additional harness input.
    pub input: String,
}

/// Monotonic event sequence within one Agent Runtime.
pub type EventSequence = u64;

/// Observable state change emitted by the Agent Runtime.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Event {
    /// Monotonic sequence used as an observation cursor.
    pub sequence: EventSequence,
    /// Session associated with the event.
    pub session_id: SessionId,
    /// Run associated with the event, when applicable.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run_id: Option<RunId>,
    /// Stable event name.
    pub kind: String,
    /// Event-specific data.
    pub data: serde_json::Value,
}

/// Identifies one exclusive Control Lease.
#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(transparent)]
pub struct ControlLeaseId(String);

impl ControlLeaseId {
    /// Creates a Control Lease identifier.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }
}

/// Exclusive right for one outer client to steer a Session.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ControlLease {
    /// Lease identifier.
    pub id: ControlLeaseId,
    /// Session controlled by this lease.
    pub session_id: SessionId,
    /// Stable outer-client identifier.
    pub holder: String,
}

/// Agent Runtime identity reported during handshake.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RuntimeIdentity {
    /// Agent resource owning the Agent Runtime.
    pub agent_name: String,
    /// Sandbox bound to the transport endpoint.
    pub sandbox_id: String,
}

/// Agent Runtime Protocol handshake document.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Handshake {
    /// Protocol version spoken by the Agent Runtime.
    pub protocol_version: String,
    /// Immutable Agent Runtime bundle version.
    pub runtime_version: String,
    /// Identity reported by the Agent Runtime.
    pub identity: RuntimeIdentity,
    /// Harness Installations available for new Sessions.
    pub harness_installations: Vec<HarnessInstallation>,
}
