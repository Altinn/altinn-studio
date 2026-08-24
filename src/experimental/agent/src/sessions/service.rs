//! User-facing Session operations coordinated with the reconciler.

use crate::{Error, Harness, control_plane};

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
    pub async fn ensure(
        &self,
        agent: &str,
        name: &SessionName,
        requested_harness: Option<Harness>,
    ) -> Result<AttachTarget, Error> {
        let owner = self.agents.get_by_name(agent).await?;
        if owner.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        if let Some(harness) = requested_harness
            && owner.agent.spec.harness(harness).is_none()
        {
            return Err(Error::Invalid(format!(
                "Agent {agent:?} does not declare harness {:?}",
                harness.as_str()
            )));
        }
        let session = match self.store.get_agent_session(agent, name).await {
            Ok(session) => {
                if let Some(harness) = requested_harness
                    && harness != session.harness
                {
                    return Err(Error::Invalid(format!(
                        "Session {name:?} already uses harness {:?}, not {:?}",
                        session.harness.as_str(),
                        harness.as_str()
                    )));
                }
                session
            }
            Err(Error::NotFound) => {
                let harness = requested_harness
                    .or_else(|| owner.agent.spec.default_harness().map(|installation| installation.kind))
                    .ok_or_else(|| Error::Invalid(format!("Agent {agent:?} has no default harness")))?;
                self.store.ensure_session(agent, name, harness).await?
            }
            Err(error) => return Err(error),
        };
        self.store.activate_session(session.id).await?;
        self.agent_wakeup.reconcile(owner.id).await?;
        self.wakeup.reconcile(session.id).await?;
        self.store.session_attach_target(session.id).await
    }

    /// Gets one durable Session from the active Agent incarnation.
    ///
    /// # Errors
    ///
    /// Returns an error when either resource is missing or persistent state cannot be read.
    pub async fn get(&self, agent: &str, name: &SessionName) -> Result<Session, Error> {
        self.store.get_agent_session(agent, name).await
    }

    /// Lists durable Sessions, optionally scoped to one active Agent incarnation.
    ///
    /// # Errors
    ///
    /// Returns an error when the scoped Agent is missing or persistent state cannot be read.
    pub async fn list(&self, agent: Option<&str>) -> Result<Vec<Session>, Error> {
        if let Some(agent) = agent {
            self.agents.get_by_name(agent).await?;
            self.store.list_agent_sessions(agent).await
        } else {
            self.store.list_all_sessions().await
        }
    }
}
