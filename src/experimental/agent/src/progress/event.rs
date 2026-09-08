//! Wire-level provisioning events and their translation from Sandbox SDK progress.

use crate::{ConditionStatus, FailureKind};

/// One provisioning event rendered by opted-in clients.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub enum Event {
    /// A stable Sandbox lifecycle phase started.
    PhaseStarted {
        /// User-facing Agent name.
        agent: String,
        /// Stable phase identifier.
        phase: Phase,
        /// Human-readable phase label.
        message: String,
    },
    /// A stable Sandbox lifecycle phase completed.
    PhaseCompleted {
        /// User-facing Agent name.
        agent: String,
        /// Stable phase identifier.
        phase: Phase,
        /// Human-readable phase label.
        message: String,
        /// Whether work was performed or existing state was reused.
        outcome: PhaseOutcome,
        /// Phase duration in milliseconds.
        elapsed_ms: u64,
    },
    /// The Sandbox operation failed inside a stable lifecycle phase.
    ///
    /// The reconciler records the failure as a condition; this event closes
    /// the open phase for renderers and fires on every failed pass.
    PhaseFailed {
        /// User-facing Agent name.
        agent: String,
        /// Stable phase identifier.
        phase: Phase,
        /// Human-readable phase label.
        message: String,
        /// Failure detail.
        detail: String,
        /// Whether desired state must change before another pass can succeed.
        failure: FailureKind,
        /// Time spent in the phase before it failed, in milliseconds.
        elapsed_ms: u64,
    },
    /// An implementation-specific step started inside a phase.
    StepStarted {
        /// User-facing Agent name.
        agent: String,
        /// Stable containing phase.
        phase: Phase,
        /// Opaque step correlation identity.
        step_id: String,
        /// Human-readable step label.
        message: String,
    },
    /// Numeric progress for an implementation-specific step.
    StepProgress {
        /// User-facing Agent name.
        agent: String,
        /// Stable containing phase.
        phase: Phase,
        /// Opaque step correlation identity.
        step_id: String,
        /// Human-readable step label.
        message: String,
        /// Work completed so far.
        completed: u64,
        /// Total work when known.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        total: Option<u64>,
        /// Numeric unit.
        unit: ProgressUnit,
    },
    /// Diagnostic output from an implementation-specific step.
    StepOutput {
        /// User-facing Agent name.
        agent: String,
        /// Stable containing phase.
        phase: Phase,
        /// Opaque step correlation identity.
        step_id: String,
        /// Human-readable step label.
        message: String,
        /// Source output stream.
        stream: OutputStream,
        /// Lossy UTF-8 diagnostic output.
        detail: String,
    },
    /// An implementation-specific step completed.
    StepCompleted {
        /// User-facing Agent name.
        agent: String,
        /// Stable containing phase.
        phase: Phase,
        /// Opaque step correlation identity.
        step_id: String,
        /// Human-readable step label.
        message: String,
        /// Step duration in milliseconds.
        elapsed_ms: u64,
    },
    /// One durable Agent condition changed.
    Condition {
        /// User-facing Agent name.
        agent: String,
        /// Stable condition type.
        condition: String,
        /// Current condition status.
        status: ConditionStatus,
        /// Stable machine-readable reason.
        reason: String,
        /// Human-readable detail.
        message: String,
        /// Classification of the failed reconciliation pass that recorded this condition.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        failure: Option<FailureKind>,
    },
}

impl Event {
    /// Returns the Agent name associated with this event.
    #[must_use]
    pub fn agent(&self) -> &str {
        match self {
            Self::PhaseStarted { agent, .. }
            | Self::PhaseCompleted { agent, .. }
            | Self::PhaseFailed { agent, .. }
            | Self::StepStarted { agent, .. }
            | Self::StepProgress { agent, .. }
            | Self::StepOutput { agent, .. }
            | Self::StepCompleted { agent, .. }
            | Self::Condition { agent, .. } => agent,
        }
    }

    pub(crate) fn condition(agent: &str, condition: &crate::Condition, failure: Option<FailureKind>) -> Self {
        Self::Condition {
            agent: agent.into(),
            condition: condition.kind.clone(),
            status: condition.status,
            reason: condition.reason.clone(),
            message: condition.message.clone(),
            failure,
        }
    }

    /// Returns whether this event coalesces with `other`: both are numeric progress for the same step.
    pub(crate) fn supersedes(&self, other: &Self) -> bool {
        match (self, other) {
            (
                Self::StepProgress { phase, step_id, .. },
                Self::StepProgress {
                    phase: other_phase,
                    step_id: other_step_id,
                    ..
                },
            ) => phase == other_phase && step_id == other_step_id,
            _ => false,
        }
    }

    /// Returns whether this event is diagnostic output that may be dropped under backpressure.
    pub(crate) const fn is_droppable(&self) -> bool {
        matches!(self, Self::StepOutput { .. })
    }
}

/// Stable Sandbox phase identifier used by the Agent Control API.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Validate,
    Lookup,
    FeatureDiscovery,
    ImageResolve,
    ImagePrepare,
    SandboxCreate,
    SandboxUpdate,
    NetworkStart,
    SandboxStart,
    Inspect,
    /// A phase introduced by a newer SDK.
    Unknown,
}

/// How a successful phase reached its desired state.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PhaseOutcome {
    Completed,
    Reused,
    /// An outcome introduced by a newer SDK.
    Unknown,
}

/// Unit attached to numeric progress.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ProgressUnit {
    Bytes,
    Items,
    /// A unit introduced by a newer SDK.
    Unknown,
}

/// Output stream associated with a provisioning step.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum OutputStream {
    Stdout,
    Stderr,
    /// A stream introduced by a newer SDK.
    Unknown,
}

pub(super) fn milliseconds(duration: std::time::Duration) -> u64 {
    u64::try_from(duration.as_millis()).unwrap_or(u64::MAX)
}

pub(super) fn sandbox_event(agent: &str, event: ::sandbox::SandboxEvent) -> Option<Event> {
    Some(match event {
        ::sandbox::SandboxEvent::PhaseStarted { phase } => Event::PhaseStarted {
            agent: agent.into(),
            phase: phase.into(),
            message: phase.to_string(),
        },
        ::sandbox::SandboxEvent::PhaseCompleted {
            phase,
            outcome,
            elapsed,
        } => Event::PhaseCompleted {
            agent: agent.into(),
            phase: phase.into(),
            message: phase.to_string(),
            outcome: outcome.into(),
            elapsed_ms: milliseconds(elapsed),
        },
        ::sandbox::SandboxEvent::StepStarted { phase, id, name } => Event::StepStarted {
            agent: agent.into(),
            phase: phase.into(),
            step_id: id.to_string(),
            message: name,
        },
        ::sandbox::SandboxEvent::StepProgress {
            phase,
            id,
            name,
            completed,
            total,
            unit,
        } => Event::StepProgress {
            agent: agent.into(),
            phase: phase.into(),
            step_id: id.to_string(),
            message: name,
            completed,
            total,
            unit: unit.into(),
        },
        ::sandbox::SandboxEvent::StepOutput {
            phase,
            id,
            name,
            stream,
            bytes,
        } => Event::StepOutput {
            agent: agent.into(),
            phase: phase.into(),
            step_id: id.to_string(),
            message: name,
            stream: stream.into(),
            detail: String::from_utf8_lossy(&bytes).into_owned(),
        },
        ::sandbox::SandboxEvent::StepCompleted {
            phase,
            id,
            name,
            elapsed,
        } => Event::StepCompleted {
            agent: agent.into(),
            phase: phase.into(),
            step_id: id.to_string(),
            message: name,
            elapsed_ms: milliseconds(elapsed),
        },
        _ => return None,
    })
}

impl From<::sandbox::SandboxPhase> for Phase {
    fn from(value: ::sandbox::SandboxPhase) -> Self {
        match value {
            ::sandbox::SandboxPhase::Validate => Self::Validate,
            ::sandbox::SandboxPhase::Lookup => Self::Lookup,
            ::sandbox::SandboxPhase::FeatureDiscovery => Self::FeatureDiscovery,
            ::sandbox::SandboxPhase::ImageResolve => Self::ImageResolve,
            ::sandbox::SandboxPhase::ImagePrepare => Self::ImagePrepare,
            ::sandbox::SandboxPhase::SandboxCreate => Self::SandboxCreate,
            ::sandbox::SandboxPhase::SandboxUpdate => Self::SandboxUpdate,
            ::sandbox::SandboxPhase::NetworkStart => Self::NetworkStart,
            ::sandbox::SandboxPhase::SandboxStart => Self::SandboxStart,
            ::sandbox::SandboxPhase::Inspect => Self::Inspect,
            _ => Self::Unknown,
        }
    }
}

impl From<::sandbox::PhaseOutcome> for PhaseOutcome {
    fn from(value: ::sandbox::PhaseOutcome) -> Self {
        match value {
            ::sandbox::PhaseOutcome::Completed => Self::Completed,
            ::sandbox::PhaseOutcome::Reused => Self::Reused,
            _ => Self::Unknown,
        }
    }
}

impl From<::sandbox::ProgressUnit> for ProgressUnit {
    fn from(value: ::sandbox::ProgressUnit) -> Self {
        match value {
            ::sandbox::ProgressUnit::Bytes => Self::Bytes,
            ::sandbox::ProgressUnit::Items => Self::Items,
            _ => Self::Unknown,
        }
    }
}

impl From<::sandbox::OutputStream> for OutputStream {
    fn from(value: ::sandbox::OutputStream) -> Self {
        match value {
            ::sandbox::OutputStream::Stdout => Self::Stdout,
            ::sandbox::OutputStream::Stderr => Self::Stderr,
            _ => Self::Unknown,
        }
    }
}
