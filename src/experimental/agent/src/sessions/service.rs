//! User-facing Session operations coordinated with the reconciler.

use crate::{Error, control_plane};

use super::{AttachTarget, Session, SessionName, SharedStore, Wakeup};

/// Durable Session registry whose effects are owned by the daemon controller.
pub struct Service {
    store: SharedStore,
    agents: std::rc::Rc<dyn control_plane::AgentStore>,
    agent_wakeup: control_plane::Wakeup,
    wakeup: Wakeup,
}

impl Service {
    /// Creates a Session service over durable storage and controller wake-ups.
    #[must_use]
    pub fn new(
        store: SharedStore,
        agents: std::rc::Rc<dyn control_plane::AgentStore>,
        agent_wakeup: control_plane::Wakeup,
        wakeup: Wakeup,
    ) -> Self {
        Self {
            store,
            agents,
            agent_wakeup,
            wakeup,
        }
    }

    /// Creates or gets one named Session and waits until its driver is ready.
    ///
    /// # Errors
    ///
    /// Returns an error when persistence or convergence fails.
    pub async fn ensure(&self, agent: &str, name: &SessionName) -> Result<AttachTarget, Error> {
        let owner = self.agents.get_by_name(agent).await?;
        if owner.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        let session = self.store.ensure_session(agent, name).await?;
        self.store.activate_session(session.id).await?;
        self.agent_wakeup.reconcile(owner.id).await?;
        self.wakeup.reconcile(session.id).await?;
        self.store.session_attach_target(session.id).await
    }

    /// Lists durable Sessions for the active Agent incarnation.
    ///
    /// # Errors
    ///
    /// Returns an error when persistent state cannot be read.
    pub async fn list(&self, agent: &str) -> Result<Vec<Session>, Error> {
        self.store.list_agent_sessions(agent).await
    }
}
