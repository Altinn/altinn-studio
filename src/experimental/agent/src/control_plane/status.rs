//! Latest-value observation of Agent status transitions.
//!
//! Readiness and failure conditions are critical to waiting requests, so they
//! travel on a per-Agent `watch` that always holds the latest value. A slow
//! observer may skip intermediate values but can never miss the current one.

use std::{cell::RefCell, collections::HashMap, rc::Rc};

use tokio::sync::watch;

use crate::{Condition, ConditionStatus, FailureKind};

use super::AgentId;

const READY: &str = "Ready";

/// Conditions recorded by the most recent reconciliation pass, with its failure class.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ObservedStatus {
    /// Normalized conditions exactly as persisted.
    pub conditions: Vec<Condition>,
    /// Classification of the pass that recorded these conditions, when it failed.
    pub failure: Option<FailureKind>,
}

impl ObservedStatus {
    /// Returns whether the Agent reported `Ready=True`.
    #[must_use]
    pub fn ready(&self) -> bool {
        self.conditions
            .iter()
            .any(|condition| condition.kind == READY && condition.status == ConditionStatus::True)
    }

    /// Returns the readiness failure detail when desired state must change before another pass can succeed.
    #[must_use]
    pub fn invalid(&self) -> Option<String> {
        if self.failure != Some(FailureKind::Invalid) {
            return None;
        }
        self.conditions
            .iter()
            .find(|condition| condition.kind == READY)
            .or_else(|| self.conditions.first())
            .map(|condition| {
                if condition.message.is_empty() {
                    condition.reason.clone()
                } else {
                    condition.message.clone()
                }
            })
    }

    /// Returns the conditions in `self` that differ from the same-typed condition in `previous`.
    pub fn changed_since<'a>(&'a self, previous: &'a Self) -> impl Iterator<Item = &'a Condition> + 'a {
        self.conditions.iter().filter(move |condition| {
            previous
                .conditions
                .iter()
                .find(|earlier| earlier.kind == condition.kind)
                != Some(*condition)
        })
    }
}

/// Per-Agent latest-value status shared between the reconciler and waiting requests.
#[derive(Clone, Default)]
pub struct StatusWatch {
    agents: Rc<RefCell<HashMap<AgentId, watch::Sender<ObservedStatus>>>>,
}

impl StatusWatch {
    /// Creates an empty watch.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Records the status observed by one reconciliation pass.
    pub fn publish(&self, id: AgentId, status: ObservedStatus) {
        self.sender(id).send_if_modified(|current| {
            if *current == status {
                false
            } else {
                *current = status;
                true
            }
        });
    }

    /// Observes an Agent's status, starting from the latest recorded value.
    ///
    /// The receiver fails once the Agent has been deleted.
    #[must_use]
    pub fn subscribe(&self, id: AgentId) -> watch::Receiver<ObservedStatus> {
        self.sender(id).subscribe()
    }

    /// Drops a deleted Agent's status so waiting observers stop.
    pub fn forget(&self, id: AgentId) {
        self.agents.borrow_mut().remove(&id);
    }

    fn sender(&self, id: AgentId) -> watch::Sender<ObservedStatus> {
        self.agents
            .borrow_mut()
            .entry(id)
            .or_insert_with(|| watch::Sender::new(ObservedStatus::default()))
            .clone()
    }
}
