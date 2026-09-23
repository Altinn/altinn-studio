//! Provisioning progress of each Agent's latest provisioning pass.
//!
//! The reconciler folds every Sandbox and Agent progress event into the
//! Agent's [`Provisioning`]. It lives in memory only: after a daemon restart no
//! pass is running, and the durable outcome of the last pass is the Agent's
//! conditions and failure class.
//!
//! A resync, a pass that only reconfirms a Ready Agent at its current
//! generation, is folded out of sight and published only if it fails. The
//! periodic resync would otherwise replace the pass that provisioned the Agent
//! within seconds, and show a healthy Agent as provisioning while it runs.

use std::{cell::RefCell, collections::HashMap, rc::Rc};

use ::sandbox::progress::{OperationStatus, Progress};

use crate::{
    AgentId,
    resources::{Changes, Revision},
};

/// Output lines kept in the summary projected onto an Agent whose pass failed.
const FAILURE_OUTPUT_LINES: usize = 40;

/// Progress of one Agent's latest pass that created, changed or retried its
/// Sandbox, or of a resync that failed.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provisioning {
    /// Identity of the pass: the revision at which it was published, unique
    /// across daemon processes. A new identity means a new pass, so observers
    /// start their cursor over.
    pub pass: Revision,
    /// The pass's progress.
    pub progress: Progress,
}

/// Latest provisioning of every Agent, shared by the reconciler and readers.
#[derive(Clone, Default)]
pub struct ProvisioningState {
    agents: Rc<RefCell<HashMap<AgentId, Provisioning>>>,
    resyncs: Rc<RefCell<HashMap<AgentId, Progress>>>,
    changes: Changes,
}

impl ProvisioningState {
    /// Creates empty state whose every change advances `changes`.
    #[must_use]
    pub fn new(changes: Changes) -> Self {
        Self {
            changes,
            ..Self::default()
        }
    }

    /// Returns the complete progress of the Agent's latest pass.
    #[must_use]
    pub fn get(&self, id: AgentId) -> Option<Provisioning> {
        self.agents.borrow().get(&id).cloned()
    }

    /// Returns a summary of a pass that is running or failed, for listings.
    ///
    /// A succeeded pass is omitted: the Agent's conditions report it.
    #[must_use]
    pub fn summary(&self, id: AgentId) -> Option<Provisioning> {
        let agents = self.agents.borrow();
        let provisioning = agents.get(&id)?;
        let output = match provisioning.progress.status() {
            OperationStatus::Succeeded => return None,
            OperationStatus::Failed { .. } => FAILURE_OUTPUT_LINES,
            OperationStatus::Running => 0,
        };
        Some(Provisioning {
            progress: provisioning.progress.summary(output),
            ..provisioning.clone()
        })
    }

    /// Starts a new pass, replacing what the previous one left behind.
    pub(crate) fn begin(&self, id: AgentId) {
        self.resyncs.borrow_mut().remove(&id);
        self.publish(id, Progress::new());
    }

    /// Starts a resync, which leaves the latest pass in place unless it fails.
    pub(crate) fn begin_resync(&self, id: AgentId) {
        self.resyncs.borrow_mut().insert(id, Progress::new());
    }

    pub(crate) fn apply(&self, id: AgentId, event: &::sandbox::ProgressEvent) {
        if let Some(progress) = self.resyncs.borrow_mut().get_mut(&id) {
            progress.apply(event);
            return;
        }
        self.update(id, |provisioning| provisioning.progress.apply(event));
    }

    pub(crate) fn succeed(&self, id: AgentId) {
        if self.resyncs.borrow_mut().remove(&id).is_some() {
            return;
        }
        self.update(id, |provisioning| provisioning.progress.succeed());
    }

    pub(crate) fn fail(&self, id: AgentId, detail: &str) {
        let resync = self.resyncs.borrow_mut().remove(&id);
        if let Some(mut progress) = resync {
            progress.fail(detail);
            self.publish(id, progress);
            return;
        }
        self.update(id, |provisioning| provisioning.progress.fail(detail));
    }

    /// Drops a deleted Agent's state.
    pub(crate) fn forget(&self, id: AgentId) {
        self.resyncs.borrow_mut().remove(&id);
        if self.agents.borrow_mut().remove(&id).is_some() {
            self.changes.bump();
        }
    }

    fn publish(&self, id: AgentId, progress: Progress) {
        self.changes.bump();
        let pass = self.changes.revision();
        self.agents.borrow_mut().insert(id, Provisioning { pass, progress });
    }

    fn update(&self, id: AgentId, change: impl FnOnce(&mut Provisioning)) {
        let updated = self.agents.borrow_mut().get_mut(&id).map(change).is_some();
        if updated {
            self.changes.bump();
        }
    }
}

#[cfg(test)]
mod tests {
    use ::sandbox::{ProgressEvent, SandboxPhase};

    use super::*;

    fn started() -> ProgressEvent {
        ProgressEvent::PhaseStarted {
            phase: SandboxPhase::ImageResolve.phase(),
        }
    }

    #[test]
    fn each_pass_gets_a_new_number_and_every_change_advances_the_revision() {
        let changes = Changes::new();
        let state = ProvisioningState::new(changes.clone());
        let id = AgentId::generate();
        let before = changes.revision();
        state.apply(id, &started());
        assert_eq!(changes.revision(), before, "no pass has begun");

        state.begin(id);
        state.apply(id, &started());
        let first = state.get(id).expect("first pass");
        assert!(first.progress.current().is_some());
        assert_ne!(changes.revision(), before);

        state.begin(id);
        let second = state.get(id).expect("second pass");
        assert_ne!(second.pass, first.pass);
        assert!(second.progress.current().is_none(), "a new pass starts empty");

        let other = ProvisioningState::new(Changes::new());
        other.begin(id);
        assert_ne!(
            other.get(id).expect("pass of another daemon").pass,
            first.pass,
            "passes of another daemon process never compare as the same pass"
        );
    }

    #[test]
    fn a_resync_stays_out_of_sight_unless_it_fails() {
        let changes = Changes::new();
        let state = ProvisioningState::new(changes.clone());
        let id = AgentId::generate();
        state.begin(id);
        state.apply(id, &started());
        state.succeed(id);
        let provisioned = state.get(id).expect("provisioning pass");

        let before = changes.revision();
        state.begin_resync(id);
        state.apply(id, &started());
        state.succeed(id);
        assert_eq!(
            changes.revision(),
            before,
            "a resync that succeeds changes nothing observable"
        );
        assert_eq!(state.get(id), Some(provisioned.clone()), "the provisioning pass stays");
        assert!(state.summary(id).is_none());

        state.begin_resync(id);
        state.apply(id, &started());
        state.fail(id, "Sandbox stopped");
        let failed = state.get(id).expect("failed resync");
        assert_ne!(
            failed.pass, provisioned.pass,
            "a failed resync is published as a new pass"
        );
        assert!(
            failed
                .progress
                .finished()
                .iter()
                .any(|phase| phase.phase.id == SandboxPhase::ImageResolve.phase().id)
        );
        assert!(
            matches!(state.summary(id), Some(summary) if matches!(summary.progress.status(), OperationStatus::Failed { .. }))
        );
        assert_ne!(changes.revision(), before);
    }

    #[test]
    fn listings_show_running_and_failed_passes_but_not_succeeded_ones() {
        let state = ProvisioningState::default();
        let id = AgentId::generate();
        state.begin(id);
        state.apply(id, &started());
        assert!(state.summary(id).is_some());

        state.fail(id, "pull failed");
        let failed = state.summary(id).expect("failed pass");
        assert_eq!(
            failed.progress.status(),
            &OperationStatus::Failed {
                detail: "pull failed".into()
            }
        );

        state.begin(id);
        state.succeed(id);
        assert!(state.summary(id).is_none());
        assert!(state.get(id).is_some(), "followers still read the finished pass");

        state.forget(id);
        assert!(state.get(id).is_none());
    }
}
