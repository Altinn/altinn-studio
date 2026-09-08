//! Observable Agent provisioning progress.
//!
//! Lossy telemetry (phases, steps, byte progress) fans out through [`Hub`];
//! critical readiness and failure conditions come from
//! [`crate::control_plane::StatusWatch`]. [`observe_agent`] joins both for one
//! opted-in request.

mod event;
mod hub;
mod observe;

pub use event::{Event, OutputStream, Phase, PhaseOutcome, ProgressUnit};
pub use hub::{Hub, SandboxObserver};
pub(crate) use observe::observe_agent;

/// Synchronous event callback used at Agent-layer seams.
pub type Reporter = std::rc::Rc<dyn Fn(Event)>;

/// Callback used by Sandbox Providers to forward SDK progress.
pub type SandboxReporter = std::rc::Rc<dyn Fn(::sandbox::SandboxEvent)>;

/// How an ensure request waits for Agent convergence.
#[derive(Clone)]
pub enum Observation {
    /// Waits for one reconciliation pass and returns that pass's outcome.
    OnePass,
    /// Reports every event to the callback and waits through transient failures
    /// until the Agent is Ready or its desired state is invalid.
    Follow(Reporter),
}
