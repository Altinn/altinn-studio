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

/// Translates SDK events into this API's events, which name each step's phase
/// and label on every event. Values this build does not know are skipped
/// rather than surfaced, since the SDK and its consumers are versioned together.
#[derive(Default)]
pub(super) struct Translator {
    phase: Option<Phase>,
    steps: std::collections::HashMap<::sandbox::StepId, (Phase, String, Option<ProgressUnit>)>,
}

impl Translator {
    pub(super) fn translate(&mut self, event: ::sandbox::ProgressEvent) -> Option<Event> {
        Some(match event {
            ::sandbox::ProgressEvent::PhaseStarted { phase } => {
                let id = phase_of(&phase)?;
                self.phase = Some(id);
                Event::PhaseStarted {
                    phase: id,
                    message: phase.label.into_owned(),
                }
            }
            ::sandbox::ProgressEvent::PhaseEnded {
                phase,
                outcome,
                elapsed,
            } => Event::PhaseCompleted {
                phase: phase_of(&phase)?,
                message: phase.label.into_owned(),
                outcome: outcome_of(outcome)?,
                elapsed_ms: milliseconds(elapsed),
            },
            ::sandbox::ProgressEvent::StepStarted { id, name, unit, .. } => {
                let phase = self.phase?;
                self.steps
                    .insert(id.clone(), (phase, name.clone(), unit.and_then(unit_of)));
                Event::StepStarted {
                    phase,
                    step_id: id.to_string(),
                    message: name,
                }
            }
            ::sandbox::ProgressEvent::StepProgress { id, completed, total } => {
                let (phase, name, unit) = self.steps.get(&id)?;
                Event::StepProgress {
                    phase: *phase,
                    step_id: id.to_string(),
                    message: name.clone(),
                    completed,
                    total,
                    unit: (*unit)?,
                }
            }
            ::sandbox::ProgressEvent::StepOutput { id, stream, bytes } => {
                let (phase, name, _) = self.steps.get(&id)?;
                Event::StepOutput {
                    phase: *phase,
                    step_id: id.to_string(),
                    message: name.clone(),
                    stream: stream_of(stream)?,
                    detail: String::from_utf8_lossy(&bytes).into_owned(),
                }
            }
            ::sandbox::ProgressEvent::StepEnded { id, outcome, elapsed } => {
                let (phase, name, _) = self.steps.remove(&id)?;
                if outcome == ::sandbox::Outcome::Failed {
                    return None;
                }
                Event::StepCompleted {
                    phase,
                    step_id: id.to_string(),
                    message: name,
                    elapsed_ms: milliseconds(elapsed),
                }
            }
            _ => return None,
        })
    }
}

fn phase_of(value: &::sandbox::Phase) -> Option<Phase> {
    Some(match value.id.as_ref() {
        "validate" => Phase::Validate,
        "lookup" => Phase::Lookup,
        "featureDiscovery" => Phase::FeatureDiscovery,
        "imageResolve" => Phase::ImageResolve,
        "imagePrepare" => Phase::ImagePrepare,
        "sandboxCreate" => Phase::SandboxCreate,
        "sandboxUpdate" => Phase::SandboxUpdate,
        "networkStart" => Phase::NetworkStart,
        "sandboxStart" => Phase::SandboxStart,
        "inspect" => Phase::Inspect,
        _ => return None,
    })
}

/// A failed phase is reported by the reconciler, which knows the failure.
const fn outcome_of(value: ::sandbox::Outcome) -> Option<PhaseOutcome> {
    Some(match value {
        ::sandbox::Outcome::Completed => PhaseOutcome::Completed,
        ::sandbox::Outcome::Reused => PhaseOutcome::Reused,
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
