//! Records one reconciliation pass's progress.

use std::cell::Cell;

use ::sandbox::ProgressReporter;

use crate::{AgentId, ReconcileFailure};

use super::ProvisioningState;

/// One reconciliation pass of an Agent, folded into the Agent's provisioning.
///
/// The pass ends as succeeded or failed. A pass dropped without either, when
/// reconciliation returns an error first, ends as failed.
pub struct SandboxObserver {
    state: ProvisioningState,
    id: AgentId,
    ended: Cell<bool>,
}

impl SandboxObserver {
    /// Starts recording a new pass for an Agent.
    #[must_use]
    pub fn new(id: AgentId, state: ProvisioningState) -> Self {
        state.begin(id);
        Self {
            state,
            id,
            ended: Cell::new(false),
        }
    }

    /// Starts recording a resync of a Ready Agent, which replaces the Agent's
    /// latest pass only if it fails.
    #[must_use]
    pub fn resync(id: AgentId, state: ProvisioningState) -> Self {
        state.begin_resync(id);
        Self {
            state,
            id,
            ended: Cell::new(false),
        }
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
        self.ended.set(true);
        self.state.succeed(self.id);
    }

    /// Records that the pass failed.
    pub fn failed(&self, failure: &ReconcileFailure) {
        self.ended.set(true);
        self.state.fail(self.id, &failure.message);
    }
}

impl Drop for SandboxObserver {
    fn drop(&mut self) {
        if !self.ended.get() {
            self.state.fail(
                self.id,
                "reconciliation stopped before the pass finished; agentd retries it",
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use ::sandbox::progress::OperationStatus;

    use super::*;

    #[test]
    fn a_pass_dropped_without_an_outcome_ends_as_failed() {
        let state = ProvisioningState::default();
        let id = AgentId::generate();
        drop(SandboxObserver::new(id, state.clone()));
        assert!(matches!(
            state.get(id).expect("pass").progress.status(),
            OperationStatus::Failed { .. }
        ));

        let observer = SandboxObserver::new(id, state.clone());
        observer.succeeded();
        drop(observer);
        assert_eq!(
            state.get(id).expect("pass").progress.status(),
            &OperationStatus::Succeeded
        );

        drop(SandboxObserver::resync(id, state.clone()));
        assert!(
            matches!(
                state.get(id).expect("pass").progress.status(),
                OperationStatus::Failed { .. }
            ),
            "a resync that stops early is published as failed"
        );
    }
}
