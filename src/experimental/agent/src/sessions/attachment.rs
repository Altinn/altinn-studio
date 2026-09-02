//! Daemon-owned terminal attachment to a ready Session.

use std::rc::Rc;

use sandbox::terminal::{StartTerminalExecutionRequest, StartedTerminalExecution, TerminalSize};

use crate::{Error, control_plane};

use super::{SessionName, SessionStore, State, tmux};

/// Opens terminal streams through the daemon's configured Sandbox Providers.
pub struct AttachmentService {
    sessions: Rc<dyn SessionStore>,
    agents: Rc<dyn control_plane::AgentStore>,
    sandboxes: Rc<crate::sandbox::Service>,
}

impl AttachmentService {
    /// Creates the daemon-owned Session attachment service.
    #[must_use]
    pub const fn new(
        sessions: Rc<dyn SessionStore>,
        agents: Rc<dyn control_plane::AgentStore>,
        sandboxes: Rc<crate::sandbox::Service>,
    ) -> Self {
        Self {
            sessions,
            agents,
            sandboxes,
        }
    }

    /// Starts a terminal Execution which attaches to a ready tmux Session.
    ///
    /// # Errors
    ///
    /// Returns an error when the Session is not ready, its Agent incarnation
    /// changed, or the assigned Sandbox cannot start a terminal Execution.
    pub async fn attach(
        &self,
        agent: &str,
        name: &SessionName,
        initial_size: TerminalSize,
    ) -> Result<StartedTerminalExecution, Error> {
        let session = self.sessions.get_agent_session(agent, name).await?;
        if session.status.state != State::Running {
            return Err(Error::Invalid(format!("Session {} is not ready", session.id)));
        }
        let owner = self.agents.get_by_name(agent).await?;
        if owner.id != session.agent_id {
            return Err(Error::NotFound);
        }
        let sandbox = self.sandboxes.open(&owner).await?;
        sandbox
            .start_terminal_execution(StartTerminalExecutionRequest::new(
                tmux::attach_spec(&session),
                initial_size,
            ))
            .await
            .map_err(Error::from)
    }
}
