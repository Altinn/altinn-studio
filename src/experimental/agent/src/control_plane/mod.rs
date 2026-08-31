//! Declarative Agent storage, reconciliation, and continuous repair.

mod controller;
pub mod memory;
mod reconciler;
mod resource;
mod service;

use std::rc::Rc;

use ::sandbox::LocalFuture;

use crate::{Error, Status};

pub use controller::{Controller, ErrorHandler, Wakeup};
pub use reconciler::{Reconciler, SessionNotifier};
pub use resource::{AgentId, AgentRecord};
pub use service::{ApplyRequest, ControlPlane, Notifier};

/// Separates desired-state writes from reconciler status writes using generation checks.
pub trait AgentStore {
    /// Gets an active Agent record by immutable identity.
    fn get(&self, id: AgentId) -> LocalFuture<'_, Result<AgentRecord, Error>>;

    /// Gets an active Agent record by its user-facing name.
    fn get_by_name<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>>;

    /// Lists an independent snapshot of every record.
    fn list(&self) -> LocalFuture<'_, Result<Vec<AgentRecord>, Error>>;

    /// Creates or replaces desired state if the stored generation still matches.
    fn put(&self, record: AgentRecord, expected_generation: u64) -> LocalFuture<'_, Result<(), Error>>;

    /// Replaces observed state if the reconciled generation is still current.
    fn update_status(&self, id: AgentId, generation: u64, status: Status) -> LocalFuture<'_, Result<(), Error>>;

    /// Atomically records the first deletion request.
    fn mark_deleting<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>>;

    /// Finalizes a soft-deleted record if its desired generation has not changed.
    fn finalize_deletion(&self, id: AgentId, generation: u64) -> LocalFuture<'_, Result<(), Error>>;
}

pub(crate) type SharedAgentStore = Rc<dyn AgentStore>;
