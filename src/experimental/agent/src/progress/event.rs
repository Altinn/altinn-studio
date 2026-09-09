//! Wire-level provisioning events and their translation from Sandbox SDK progress.

use crate::{ConditionStatus, FailureKind};

/// One provisioning event rendered by opted-in clients.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub enum Event {
    /// A stable Sandbox lifecycle phase started.
    PhaseStarted {
        /// Stable phase identifier.
        phase: Phase,
        /// Human-readable phase label.
        message: String,
    },
    /// A stable Sandbox lifecycle phase completed.
    PhaseCompleted {
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
        /// Stable containing phase.
        phase: Phase,
        /// Opaque step correlation identity.
        step_id: String,
        /// Human-readable step label.
        message: String,
    },
    /// Numeric progress for an implementation-specific step.
    StepProgress {
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
    pub(crate) fn condition(condition: &crate::Condition, failure: Option<FailureKind>) -> Self {
        Self::Condition {
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
}

/// How a successful phase reached its desired state.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PhaseOutcome {
    Completed,
    Reused,
}

/// Unit attached to numeric progress.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ProgressUnit {
    Bytes,
    Items,
}

/// Output stream associated with a provisioning step.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum OutputStream {
    Stdout,
    Stderr,
}

pub(super) fn milliseconds(duration: std::time::Duration) -> u64 {
    u64::try_from(duration.as_millis()).unwrap_or(u64::MAX)
}

/// Translates one SDK event; values this build does not know are skipped rather
/// than surfaced, since the SDK and its consumers are versioned together.
pub(super) fn sandbox_event(event: ::sandbox::SandboxEvent) -> Option<Event> {
    Some(match event {
        ::sandbox::SandboxEvent::PhaseStarted { phase } => Event::PhaseStarted {
            phase: phase_of(phase)?,
            message: phase.to_string(),
        },
        ::sandbox::SandboxEvent::PhaseCompleted {
            phase,
            outcome,
            elapsed,
        } => Event::PhaseCompleted {
            phase: phase_of(phase)?,
            message: phase.to_string(),
            outcome: outcome_of(outcome)?,
            elapsed_ms: milliseconds(elapsed),
        },
        ::sandbox::SandboxEvent::StepStarted { phase, id, name } => Event::StepStarted {
            phase: phase_of(phase)?,
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
            phase: phase_of(phase)?,
            step_id: id.to_string(),
            message: name,
            completed,
            total,
            unit: unit_of(unit)?,
        },
        ::sandbox::SandboxEvent::StepOutput {
            phase,
            id,
            name,
            stream,
            bytes,
        } => Event::StepOutput {
            phase: phase_of(phase)?,
            step_id: id.to_string(),
            message: name,
            stream: stream_of(stream)?,
            detail: String::from_utf8_lossy(&bytes).into_owned(),
        },
        ::sandbox::SandboxEvent::StepCompleted {
            phase,
            id,
            name,
            elapsed,
        } => Event::StepCompleted {
            phase: phase_of(phase)?,
            step_id: id.to_string(),
            message: name,
            elapsed_ms: milliseconds(elapsed),
        },
        _ => return None,
    })
}

const fn phase_of(value: ::sandbox::SandboxPhase) -> Option<Phase> {
    Some(match value {
        ::sandbox::SandboxPhase::Validate => Phase::Validate,
        ::sandbox::SandboxPhase::Lookup => Phase::Lookup,
        ::sandbox::SandboxPhase::FeatureDiscovery => Phase::FeatureDiscovery,
        ::sandbox::SandboxPhase::ImageResolve => Phase::ImageResolve,
        ::sandbox::SandboxPhase::ImagePrepare => Phase::ImagePrepare,
        ::sandbox::SandboxPhase::SandboxCreate => Phase::SandboxCreate,
        ::sandbox::SandboxPhase::SandboxUpdate => Phase::SandboxUpdate,
        ::sandbox::SandboxPhase::NetworkStart => Phase::NetworkStart,
        ::sandbox::SandboxPhase::SandboxStart => Phase::SandboxStart,
        ::sandbox::SandboxPhase::Inspect => Phase::Inspect,
        _ => return None,
    })
}

const fn outcome_of(value: ::sandbox::PhaseOutcome) -> Option<PhaseOutcome> {
    Some(match value {
        ::sandbox::PhaseOutcome::Completed => PhaseOutcome::Completed,
        ::sandbox::PhaseOutcome::Reused => PhaseOutcome::Reused,
        _ => return None,
    })
}

const fn unit_of(value: ::sandbox::ProgressUnit) -> Option<ProgressUnit> {
    Some(match value {
        ::sandbox::ProgressUnit::Bytes => ProgressUnit::Bytes,
        ::sandbox::ProgressUnit::Items => ProgressUnit::Items,
        _ => return None,
    })
}

const fn stream_of(value: ::sandbox::OutputStream) -> Option<OutputStream> {
    Some(match value {
        ::sandbox::OutputStream::Stdout => OutputStream::Stdout,
        ::sandbox::OutputStream::Stderr => OutputStream::Stderr,
        _ => return None,
    })
}
