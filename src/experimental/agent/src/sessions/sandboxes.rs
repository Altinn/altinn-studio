//! Resolving a Session's owning Agent to its materialized Sandbox.
//!
//! The reconciler and the Session service both need "the Sandbox this
//! Session's Agent runs in"; this is the one place that lookup lives.

use std::rc::Rc;

use ::sandbox::SandboxHandle;

use crate::{AgentId, Error, control_plane::AgentRecord, control_plane::AgentStore};

/// Agent records and their Sandboxes, as one lookup.
pub struct AgentSandboxes {
    agents: Rc<dyn AgentStore>,
    sandboxes: Rc<crate::sandbox::Service>,
}

impl AgentSandboxes {
    /// Pairs the Agent store with the Sandbox service.
    #[must_use]
    pub fn new(agents: Rc<dyn AgentStore>, sandboxes: Rc<crate::sandbox::Service>) -> Self {
        Self { agents, sandboxes }
    }

    /// Gets the active Agent record by name.
    ///
    /// # Errors
    ///
    /// Returns an error when no active Agent has that name.
    pub async fn agent_by_name(&self, name: &str) -> Result<AgentRecord, Error> {
        self.agents.get_by_name(name).await
    }

    /// Gets an Agent record by identity.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent does not exist.
    pub async fn agent(&self, id: AgentId) -> Result<AgentRecord, Error> {
        self.agents.get(id).await
    }

    /// Opens the materialized Sandbox of `record`.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent has no materialized Sandbox or its
    /// Provider cannot open it.
    pub async fn open(&self, record: &AgentRecord) -> Result<SandboxHandle, Error> {
        self.sandboxes.open(record).await
    }

    /// Gets the active Agent by name and opens its Sandbox.
    ///
    /// # Errors
    ///
    /// See [`Self::agent_by_name`] and [`Self::open`].
    pub async fn open_by_name(&self, name: &str) -> Result<(AgentRecord, SandboxHandle), Error> {
        let record = self.agent_by_name(name).await?;
        let sandbox = self.open(&record).await?;
        Ok((record, sandbox))
    }
}
