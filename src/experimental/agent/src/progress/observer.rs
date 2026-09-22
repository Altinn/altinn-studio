//! Records one reconciliation pass's progress.

use ::sandbox::ProgressReporter;

use crate::{AgentId, ReconcileFailure};

use super::ProvisioningState;

/// One reconciliation pass of an Agent: its progress is folded into the
/// Agent's provisioning, and it ends as succeeded or failed.
pub struct SandboxObserver {
    state: ProvisioningState,
    id: AgentId,
}

impl SandboxObserver {
    /// Starts recording a new pass for an Agent.
    #[must_use]
    pub fn new(id: AgentId, state: ProvisioningState) -> Self {
        state.begin(id);
        Self { state, id }
    }

    /// Returns the reporter for the pass's progress.
    #[must_use]
    pub fn reporter(&self) -> ProgressReporter {
        let state = self.state.clone();
        let id = self.id;
        ProgressReporter::from_callback(move |event| state.apply(id, &event))
    }

    /// Records that the pass succeeded.
    pub fn succeeded(&self) {
        self.state.succeed(self.id);
    }

    /// Records that the pass failed.
    pub fn failed(&self, failure: &ReconcileFailure) {
        self.state.fail(self.id, &failure.message);
    }
}
