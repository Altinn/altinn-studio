//! Provisioning progress of each Agent's latest reconciliation pass.
//!
//! The reconciler folds every Sandbox and Agent progress event into the
//! Agent's [`Provisioning`]. It lives in memory only: after a daemon restart no
//! pass is running, and the durable outcome of the last pass is the Agent's
//! conditions and failure class.

use std::{
    cell::{Cell, RefCell},
    collections::HashMap,
    rc::Rc,
};

use ::sandbox::progress::{OperationStatus, Progress};

use crate::{AgentId, resources::Changes};

/// Output lines kept in the summary projected onto an Agent whose pass failed.
const FAILURE_OUTPUT_LINES: usize = 40;

/// Progress of one Agent's latest reconciliation pass that did Sandbox work.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provisioning {
    /// Number of the pass, unique within the daemon process; a new number
    /// means a new pass, so observers start their cursor over.
    pub pass: u64,
    /// The pass's progress.
    pub progress: Progress,
}

/// Latest provisioning of every Agent, shared by the reconciler and readers.
#[derive(Clone, Default)]
pub struct ProvisioningState {
    agents: Rc<RefCell<HashMap<AgentId, Provisioning>>>,
    passes: Rc<Cell<u64>>,
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
            pass: provisioning.pass,
            progress: provisioning.progress.summary(output),
        })
    }

    /// Starts a new pass, replacing what the previous one left behind.
    pub(crate) fn begin(&self, id: AgentId) {
        let pass = self.passes.get() + 1;
        self.passes.set(pass);
        self.agents.borrow_mut().insert(
            id,
            Provisioning {
                pass,
                progress: Progress::new(),
            },
        );
        self.changes.bump();
    }

    pub(crate) fn apply(&self, id: AgentId, event: &::sandbox::ProgressEvent) {
        self.update(id, |progress| progress.apply(event));
    }

    pub(crate) fn succeed(&self, id: AgentId) {
        self.update(id, Progress::succeed);
    }

    pub(crate) fn fail(&self, id: AgentId, detail: &str) {
        self.update(id, |progress| progress.fail(detail));
    }

    /// Drops a deleted Agent's state.
    pub(crate) fn forget(&self, id: AgentId) {
        if self.agents.borrow_mut().remove(&id).is_some() {
            self.changes.bump();
        }
    }

    fn update(&self, id: AgentId, change: impl FnOnce(&mut Progress)) {
        let updated = self
            .agents
            .borrow_mut()
            .get_mut(&id)
            .map(|provisioning| change(&mut provisioning.progress))
            .is_some();
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
        assert_eq!(second.pass, first.pass + 1);
        assert!(second.progress.current().is_none(), "a new pass starts empty");
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
