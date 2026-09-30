//! Requests converging an Agent and waiting for the outcome.
//!
//! A request records a sync on the Agent and wakes its controller. A waiter
//! then reads the stored Agent and rereads it whenever the daemon-wide
//! revision advances, until [`crate::wait::agent`] decides: the status of a
//! pass that started after the request tells the outcome, so a waiter can skip
//! intermediate states but never miss the terminal one. Progress is observed
//! separately, through the Agent's provisioning state.

use std::time::Duration;

use crate::{
    AgentId, Error,
    resources::Changes,
    wait::{self, AgentRequest, Policy, Settled},
};

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
    /// Returns once a pass that started after the request ends, with its outcome.
    FirstPass,
    /// Keeps waiting through transient failures, which the background controller
    /// retries, until the Agent is Ready, its desired state is invalid, or its
    /// Sandbox is recorded as unavailable.
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

    /// The daemon-wide change history waiters follow.
    #[must_use]
    pub const fn changes(&self) -> &Changes {
        &self.changes
    }

    /// Records a request to converge the Agent now, wakes its controller, and
    /// returns what a wait for that request must see handled.
    ///
    /// # Errors
    ///
    /// Returns `Error::Conflict` when the Agent is deleted or being deleted, or a storage error.
    pub async fn request(&self, id: AgentId) -> Result<AgentRequest, Error> {
        let sync = self.store.request_sync(id).await.map_err(deleted_as_conflict)?;
        let generation = self
            .store
            .get(id)
            .await
            .map_err(deleted_as_conflict)?
            .agent
            .metadata
            .generation;
        self.wakeup.wake(id).await?;
        Ok(AgentRequest { generation, sync })
    }

    /// Wakes convergence of one Agent and waits according to `wait`.
    ///
    /// # Errors
    ///
    /// Returns `Error::Invalid` when desired state must change,
    /// `Error::Unavailable` when its Sandbox cannot do work now, the first
    /// pass's failure under [`WaitPolicy::FirstPass`], `Error::Conflict` when the
    /// Agent is deleted while waited on, or a storage error.
    pub async fn converge(&self, id: AgentId, wait: WaitPolicy) -> Result<(), Error> {
        let request = self.request(id).await?;
        let policy = match wait {
            WaitPolicy::FirstPass => Policy::FirstPass,
            WaitPolicy::UntilReady => Policy::UntilReady,
        };
        loop {
            let revision = self.changes.revision();
            let record = self.store.get(id).await.map_err(deleted_as_conflict)?;
            if record.agent.metadata.deletion_timestamp.is_some() {
                return Err(Error::Conflict);
            }
            match wait::agent(&record.agent.status, request, policy) {
                Settled::Done => return Ok(()),
                Settled::Failed(outcome) => return Err(wait::agent_error(outcome)),
                Settled::Pending | Settled::Superseded(_) => {}
            }
            self.changes
                .changed_since(Some(revision), SETTLE, RECHECK_INTERVAL)
                .await;
        }
    }
}

fn deleted_as_conflict(error: Error) -> Error {
    match error {
        Error::NotFound => Error::Conflict,
        error => error,
    }
}
