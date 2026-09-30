//! Requests converging an Agent and waiting for the outcome.
//!
//! A waiter reads readiness and failure from the stored Agent and rereads it
//! whenever the daemon-wide revision advances, so it can skip intermediate
//! states but never miss the terminal one. Progress is observed separately,
//! through the Agent's provisioning state.

use std::time::Duration;

use crate::{AgentId, Error, FailureKind, ReconcileFailure, resources::Changes};

use super::{SharedAgentStore, Wakeup};

/// Longest a waiter goes without rereading the stored Agent.
const RECHECK_INTERVAL: Duration = Duration::from_secs(30);
/// How long a waiter lets changes gather before rereading the stored Agent.
/// Every progress event of any Agent advances the revision, so a waiter
/// rereads once per burst instead of once per event.
const SETTLE: Duration = Duration::from_millis(50);

/// How long a request waits for the Agent it woke.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WaitPolicy {
    /// Returns after one reconciliation pass with that pass's outcome.
    FirstPass,
    /// Keeps waiting through transient failures, which the background controller
    /// retries, until the Agent is Ready or its desired state is invalid.
    UntilReady,
}

/// Wakes Agent convergence and lets a request wait for it.
#[derive(Clone)]
pub struct Convergence {
    wakeup: Wakeup,
    store: SharedAgentStore,
    changes: Changes,
}

impl Convergence {
    /// Pairs the controller's wake-up handle with the stored Agents and their revision.
    #[must_use]
    pub fn new(wakeup: Wakeup, store: SharedAgentStore, changes: Changes) -> Self {
        Self { wakeup, store, changes }
    }

    /// Wakes convergence of one Agent and waits according to `wait`.
    ///
    /// # Errors
    ///
    /// Returns `Error::Invalid` when desired state must change, the first pass's
    /// failure under [`WaitPolicy::FirstPass`], `Error::Conflict` when the Agent
    /// is deleted while waited on, or a storage error.
    pub async fn converge(&self, id: AgentId, wait: WaitPolicy) -> Result<(), Error> {
        match (wait, self.wakeup.reconcile(id).await) {
            (_, Ok(())) => return Ok(()),
            (WaitPolicy::FirstPass, Err(failure)) => return Err(failure.into()),
            (WaitPolicy::UntilReady, Err(failure)) if failure.kind == FailureKind::Invalid => {
                return Err(failure.into());
            }
            (WaitPolicy::UntilReady, Err(_)) => {}
        }
        loop {
            let revision = self.changes.revision();
            let record = match self.store.get(id).await {
                Ok(record) => record,
                Err(Error::NotFound) => return Err(Error::Conflict),
                Err(error) => return Err(error),
            };
            let status = &record.agent.status;
            if status.observed_generation == record.agent.metadata.generation {
                if status.is_ready() {
                    return Ok(());
                }
                if let Some(message) = status.invalid() {
                    return Err(ReconcileFailure {
                        kind: FailureKind::Invalid,
                        message,
                    }
                    .into());
                }
            }
            self.changes
                .changed_since(Some(revision), SETTLE, RECHECK_INTERVAL)
                .await;
        }
    }
}
