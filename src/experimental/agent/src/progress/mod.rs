//! Observable Agent provisioning progress: the wire event model, its translation
//! from Sandbox SDK events, and the lossy telemetry fan-out.
//!
//! Critical readiness and failure conditions do not travel here; they come from
//! [`crate::control_plane::StatusWatch`], and
//! [`crate::control_plane::Convergence`] joins both for one request.

mod event;
mod hub;

pub use event::{Event, OutputStream, Phase, PhaseOutcome, ProgressUnit};
pub use hub::{Hub, SandboxObserver};
pub(crate) use hub::{Receive, Subscription};

/// Synchronous event callback used at Agent-layer seams.
pub type Reporter = std::rc::Rc<dyn Fn(Event)>;

/// Callback used by Sandbox Providers to forward SDK progress.
pub type SandboxReporter = std::rc::Rc<dyn Fn(::sandbox::SandboxEvent)>;
