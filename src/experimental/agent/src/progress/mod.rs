//! Observable Agent provisioning progress.
//!
//! The Sandbox SDK reports progress as events and defines what they mean as a
//! folded [`::sandbox::progress::Progress`]. The reconciler folds every event of
//! a pass into the Agent's [`Provisioning`] in [`ProvisioningState`]; readers
//! see its current value, and a daemon-wide revision tells them when it
//! changed. Durable readiness and failure are the Agent's stored conditions.

mod observer;
mod state;

pub use observer::SandboxObserver;
pub use state::{Provisioning, ProvisioningState};

/// One Agent's stored status and the progress of its latest pass, as of one
/// revision, returned by `agents.v1.progress`.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AgentProgress {
    /// Revision to follow from next.
    pub revision: crate::resources::Revision,
    /// Stored status: conditions and failure class.
    pub status: crate::Status,
    /// Progress of the latest pass, with the output the caller has not seen.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provisioning: Option<Provisioning>,
}

/// Where a follower is in one pass's output.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct OutputPosition {
    /// Pass the position belongs to.
    pub pass: u64,
    /// First output line the follower has not seen.
    pub sequence: u64,
}
