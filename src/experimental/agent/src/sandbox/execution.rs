//! Transient command execution against an Agent-owned Sandbox.

use std::rc::Rc;

use sandbox::{execution, terminal};

use crate::{ConditionStatus, Error, control_plane};

use super::Service;

/// Converges Agents and starts commands through their configured Sandbox Providers.
pub struct ExecutionService {
    agents: Rc<dyn control_plane::AgentStore>,
    wakeup: control_plane::Wakeup,
    sandboxes: Rc<Service>,
}

impl ExecutionService {
    /// Creates the daemon-owned Execution service.
    #[must_use]
    pub fn new(
        agents: Rc<dyn control_plane::AgentStore>,
        wakeup: control_plane::Wakeup,
        sandboxes: Rc<Service>,
    ) -> Self {
        Self {
            agents,
            wakeup,
            sandboxes,
        }
    }

    /// Starts a command with the Agent's platform-specific environment.
    ///
    /// # Errors
    ///
    /// Returns an error when the command is invalid, convergence fails, or the
    /// assigned Sandbox cannot start the Execution.
    pub async fn start(&self, name: &str, command: &[String]) -> Result<execution::StartedExecution, Error> {
        let (sandbox, spec) = self.prepare(name, command, false).await?;
        sandbox
            .start_execution(execution::StartExecutionRequest::new(spec))
            .await
            .map_err(Error::from)
    }

    /// Starts an interactive command with the Agent's platform-specific environment.
    ///
    /// # Errors
    ///
    /// Returns an error when the command is invalid, convergence fails, or the
    /// assigned Sandbox cannot start the terminal Execution.
    pub async fn start_terminal(
        &self,
        name: &str,
        command: &[String],
        initial_size: terminal::TerminalSize,
    ) -> Result<terminal::StartedTerminalExecution, Error> {
        let (sandbox, spec) = self.prepare(name, command, true).await?;
        sandbox
            .start_terminal_execution(terminal::StartTerminalExecutionRequest::new(spec, initial_size))
            .await
            .map_err(Error::from)
    }

    async fn prepare(
        &self,
        name: &str,
        command: &[String],
        terminal: bool,
    ) -> Result<(sandbox::SandboxHandle, execution::ExecutionSpec), Error> {
        if command.is_empty() {
            return Err(Error::Invalid("command is required".into()));
        }
        let record = self.ensure(name).await?;
        let spec = super::platform::execution_spec(&record.agent.spec.sandbox.platform.os, command, terminal)?;
        Ok((self.sandboxes.open(&record).await?, spec))
    }

    /// Resolves the same Agent incarnation after its controller has converged.
    pub(super) async fn ensure(&self, name: &str) -> Result<control_plane::AgentRecord, Error> {
        let record = self.agents.get_by_name(name).await?;
        if record.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        self.wakeup.reconcile(record.id).await?;
        let record = self.agents.get(record.id).await?;
        if record.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        let ready = record
            .agent
            .status
            .conditions
            .iter()
            .find(|condition| condition.kind == "Ready");
        if !ready.is_some_and(|condition| condition.status == ConditionStatus::True) {
            let detail = ready.map_or_else(
                || "no Ready condition was reported".to_owned(),
                |condition| {
                    if condition.message.is_empty() {
                        condition.reason.clone()
                    } else {
                        format!("{}: {}", condition.reason, condition.message)
                    }
                },
            );
            return Err(Error::Invalid(format!("Agent {name:?} is not Ready: {detail}")));
        }
        Ok(record)
    }
}
