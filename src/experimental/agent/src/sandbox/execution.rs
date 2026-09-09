//! Transient command execution against an Agent-owned Sandbox.

use std::{path::Path, rc::Rc};

use ::sandbox::execution;
use serde::{Deserialize, Serialize};

use crate::{Error, control_plane, control_plane::WaitPolicy, progress::Reporter};

use super::Assignment;

/// Exact materialized Sandbox selected after Agent convergence.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ExecutionTarget {
    /// Sticky Provider and immutable Sandbox identity.
    pub sandbox: Assignment,
    /// Sandbox operating system used to construct the Execution.
    pub operating_system: String,
}

/// Resolves transient executions without taking ownership of Sandbox lifecycle effects.
pub struct ExecutionService {
    agents: Rc<dyn control_plane::AgentStore>,
    convergence: control_plane::Convergence,
}

impl ExecutionService {
    /// Creates an execution-target resolver over the Agent controller.
    #[must_use]
    pub const fn new(agents: Rc<dyn control_plane::AgentStore>, convergence: control_plane::Convergence) -> Self {
        Self { agents, convergence }
    }

    /// Wakes Agent convergence and returns its exact ready Sandbox assignment.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is missing, deleting, or invalid; with
    /// [`WaitPolicy::FirstPass`] also when the single pass fails or leaves the
    /// Agent without a ready materialized Sandbox.
    pub async fn ensure(
        &self,
        name: &str,
        wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> Result<ExecutionTarget, Error> {
        let record = self.load_active(name).await?;
        self.convergence.converge(record.id, wait, progress.as_ref()).await?;
        self.target(record.id, name).await
    }

    async fn load_active(&self, name: &str) -> Result<control_plane::AgentRecord, Error> {
        let record = self.agents.get_by_name(name).await?;
        if record.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        Ok(record)
    }

    async fn target(&self, id: crate::AgentId, name: &str) -> Result<ExecutionTarget, Error> {
        let record = self.agents.get(id).await?;
        if record.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        let ready = record.agent.status.ready_condition();
        if !record.agent.status.is_ready() {
            let detail = ready.map_or_else(
                || "no Ready condition was reported".to_owned(),
                crate::Condition::summary,
            );
            return Err(Error::Invalid(format!("Agent {name:?} is not Ready: {detail}")));
        }
        let sandbox = record
            .agent
            .status
            .sandbox
            .clone()
            .filter(|assignment| assignment.id().is_some())
            .ok_or_else(|| Error::Invalid(format!("Agent {name:?} has no materialized Sandbox")))?;
        Ok(ExecutionTarget {
            sandbox,
            operating_system: record.agent.spec.sandbox.platform.os,
        })
    }
}

/// Starts a non-interactive Execution through the recorded Sandbox Provider.
///
/// The returned stream belongs to the exact Sandbox lifecycle ID in `target`;
/// this function does not create, start, or otherwise reconcile a Sandbox.
///
/// # Errors
///
/// Returns an error when the Provider is unsupported by this client or the
/// exact Sandbox cannot start the Execution.
pub async fn start_execution(
    home: &Path,
    target: &ExecutionTarget,
    spec: execution::ExecutionSpec,
) -> Result<execution::StartedExecution, Error> {
    match target.sandbox.provider().as_str() {
        super::microsandbox::PROVIDER_ID => super::microsandbox::start_execution(home, &target.sandbox, spec).await,
        provider => Err(Error::Invalid(format!(
            "command execution is not supported through Sandbox Provider {provider:?}"
        ))),
    }
}
