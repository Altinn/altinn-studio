//! Observes the guests of materialized Agent Sandboxes between reconciliation passes.
//!
//! Reconciliation records `SandboxResponsive`, but a guest can stall while no
//! pass runs. This monitor inspects every materialized Sandbox on a short
//! interval, without a round trip to its guest, and wakes an Agent's
//! reconciliation whenever its guest becomes unresponsive or recovers, so the
//! recorded conditions follow within one interval.

use std::{collections::HashSet, rc::Rc, time::Duration};

use tokio::time::{Instant, MissedTickBehavior};

use super::{SharedAgentStore, Wakeup};
use crate::sandbox::Responsiveness;

/// How often every materialized Sandbox is inspected.
pub const OBSERVATION_INTERVAL: Duration = Duration::from_secs(2);

/// A tick this late means the monitor itself did not run, such as while the
/// host slept, so heartbeat ages restart instead of counting that time.
const SUSPENDED_AFTER: Duration = Duration::from_secs(3 * OBSERVATION_INTERVAL.as_secs());

/// Periodically records guest heartbeats and wakes Agents whose guest stalls or recovers.
pub struct ResponsivenessMonitor {
    store: SharedAgentStore,
    sandboxes: Rc<crate::sandbox::Service>,
    wakeup: Wakeup,
}

impl ResponsivenessMonitor {
    /// Observes the Sandboxes of stored Agents through the reconciler's Sandbox service.
    #[must_use]
    pub fn new(store: SharedAgentStore, sandboxes: Rc<crate::sandbox::Service>, wakeup: Wakeup) -> Self {
        Self {
            store,
            sandboxes,
            wakeup,
        }
    }

    /// Observes continuously; never returns.
    pub async fn run(self) {
        let mut ticker = tokio::time::interval(OBSERVATION_INTERVAL);
        ticker.set_missed_tick_behavior(MissedTickBehavior::Delay);
        let mut previous: Option<Instant> = None;
        loop {
            let now = ticker.tick().await;
            if previous.is_some_and(|previous| now.saturating_duration_since(previous) >= SUSPENDED_AFTER) {
                self.sandboxes.resume_observation(now);
            }
            previous = Some(now);
            self.observe(now).await;
        }
    }

    /// Inspects every materialized Sandbox once.
    pub async fn observe(&self, now: Instant) {
        let records = match self.store.list().await {
            Ok(records) => records,
            Err(error) => {
                tracing::warn!(%error, "could not list Agents to observe their Sandboxes");
                return;
            }
        };
        let mut observed = HashSet::new();
        for record in records {
            let Some(id) = record
                .agent
                .status
                .sandbox
                .as_ref()
                .and_then(crate::sandbox::Assignment::id)
                .cloned()
            else {
                continue;
            };
            if record.agent.metadata.deletion_timestamp.is_some() {
                continue;
            }
            // Kept even when this inspection fails, so a transient failure
            // does not forget a stall.
            observed.insert(id);
            match self.sandboxes.observe(&record, now).await {
                Ok((id, replaced)) => {
                    let current = self.sandboxes.responsiveness(&id);
                    if replaced.is_some_and(|replaced| {
                        replaced == Responsiveness::Unresponsive || current == Responsiveness::Unresponsive
                    }) {
                        tracing::info!(agent = %record.agent.metadata.name, ?current, "Sandbox guest responsiveness changed");
                        self.wakeup.notify(record.id);
                    }
                }
                Err(error) => {
                    tracing::debug!(%error, agent = %record.agent.metadata.name, "could not observe the Agent's Sandbox");
                }
            }
        }
        self.sandboxes.retain_observed(&observed);
    }
}
