//! Daemon-owned transient Execution streams.

use std::rc::Rc;

use sandbox::{execution, terminal};

use crate::{Error, control_plane};

use super::{ExecutionService, ExecutionTarget, Service};

/// Starts live Executions through the daemon's configured Sandbox Providers.
pub struct RuntimeService {
    targets: Rc<ExecutionService>,
    agents: Rc<dyn control_plane::AgentStore>,
    sandboxes: Rc<Service>,
}

impl RuntimeService {
    /// Creates a daemon-owned Execution runtime.
    #[must_use]
    pub const fn new(
        targets: Rc<ExecutionService>,
        agents: Rc<dyn control_plane::AgentStore>,
        sandboxes: Rc<Service>,
    ) -> Self {
        Self {
            targets,
            agents,
            sandboxes,
        }
    }

    /// Converges an Agent and returns its exact ready Sandbox assignment.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent cannot reach a ready Sandbox.
    pub async fn ensure(&self, name: &str) -> Result<ExecutionTarget, Error> {
        self.targets.ensure(name).await
    }

    /// Starts a non-interactive Execution inside a ready Agent Sandbox.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent cannot converge or its assigned
    /// Sandbox cannot start the Execution.
    pub async fn start(
        &self,
        name: &str,
        spec: execution::ExecutionSpec,
    ) -> Result<execution::StartedExecution, Error> {
        let sandbox = self.open_ready(name).await?;
        let request = execution::StartExecutionRequest::new(spec);
        sandbox.start_execution(request).await.map_err(Error::from)
    }

    /// Starts an interactive terminal Execution inside a ready Agent Sandbox.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent cannot converge or its assigned
    /// Sandbox cannot start the terminal Execution.
    pub async fn start_terminal(
        &self,
        name: &str,
        spec: execution::ExecutionSpec,
        initial_size: terminal::TerminalSize,
    ) -> Result<terminal::StartedTerminalExecution, Error> {
        let sandbox = self.open_ready(name).await?;
        sandbox
            .start_terminal_execution(terminal::StartTerminalExecutionRequest::new(spec, initial_size))
            .await
            .map_err(Error::from)
    }

    async fn open_ready(&self, name: &str) -> Result<sandbox::SandboxHandle, Error> {
        let target = self.targets.ensure(name).await?;
        let record = self.agents.get_by_name(name).await?;
        if record.agent.status.sandbox.as_ref() != Some(&target.sandbox) {
            return Err(Error::Conflict);
        }
        self.sandboxes.open(&record).await
    }
}
