//! Transient command execution against an Agent-owned Sandbox.

use std::{path::Path, rc::Rc};

use ::sandbox::execution;
use serde::{Deserialize, Serialize};

use crate::{ConditionStatus, Error, control_plane};

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
    wakeup: control_plane::Wakeup,
}

impl ExecutionService {
    /// Creates an execution-target resolver over the Agent controller.
    #[must_use]
    pub fn new(agents: Rc<dyn control_plane::AgentStore>, wakeup: control_plane::Wakeup) -> Self {
        Self { agents, wakeup }
    }

    /// Wakes Agent convergence and returns its exact ready Sandbox assignment.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is missing, deleting, fails convergence,
    /// or does not have a ready materialized Sandbox after the pass.
    pub async fn ensure(&self, name: &str) -> Result<ExecutionTarget, Error> {
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
