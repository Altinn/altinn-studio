use std::rc::Rc;

use sandbox::{EnsureSandboxRequest, SandboxSpec};

use crate::{Condition, ConditionStatus, Error, Status};

use super::{
    AgentRecord, AgentRuntimeBundle, AgentRuntimeBundleResolver, AgentRuntimeClient, SandboxApi, SharedAgentStore,
};

const READY: &str = "Ready";
const RUNTIME_READY: &str = "RuntimeReady";
const SANDBOX_READY: &str = "SandboxReady";

/// Converges one stored Agent generation without owning an API request.
pub struct Reconciler {
    store: SharedAgentStore,
    sandboxes: Rc<dyn SandboxApi>,
    runtime_bundles: Rc<dyn AgentRuntimeBundleResolver>,
    runtime: Rc<dyn AgentRuntimeClient>,
}

impl Reconciler {
    /// Creates an Agent reconciler from its independent storage, Sandbox, and Agent Runtime boundaries.
    #[must_use]
    pub fn new(
        store: SharedAgentStore,
        sandboxes: Rc<dyn SandboxApi>,
        runtime_bundles: Rc<dyn AgentRuntimeBundleResolver>,
        runtime: Rc<dyn AgentRuntimeClient>,
    ) -> Self {
        Self {
            store,
            sandboxes,
            runtime_bundles,
            runtime,
        }
    }

    /// Converges the latest generation of one Agent and records what it observed.
    ///
    /// # Errors
    ///
    /// Returns an error when storage, sandbox lifecycle, or agent runtime convergence fails.
    pub async fn reconcile(&self, name: &str) -> Result<(), Error> {
        let record = match self.store.get(name).await {
            Ok(record) => record,
            Err(Error::NotFound) => return Ok(()),
            Err(error) => return Err(error),
        };
        if record.agent.metadata.deletion_timestamp.is_some() {
            return self.release(&record).await;
        }

        let sandbox_spec = record.agent.spec.sandbox.resolve_from(&record.source_directory);
        let runtime_bundle = self.resolve_runtime_bundle(&record, &sandbox_spec).await?;
        let runtime_version = runtime_bundle.version.clone();
        let sandbox_name = record.agent.sandbox_name()?;
        let request = EnsureSandboxRequest::new(sandbox_name, sandbox_spec)
            .with_mounts(runtime_bundle.mounts)
            .requiring_features(runtime_bundle.required_features);
        let sandbox = match self.sandboxes.ensure(&request).await {
            Ok(sandbox) => sandbox,
            Err(error) => {
                let message = error.to_string();
                let status = Status {
                    observed_generation: record.agent.metadata.generation,
                    sandbox_id: record.agent.status.sandbox_id.clone(),
                    runtime_version: record.agent.status.runtime_version.clone(),
                    conditions: vec![
                        condition(READY, ConditionStatus::False, "SandboxReconcileFailed", &message),
                        condition(SANDBOX_READY, ConditionStatus::False, "ReconcileFailed", &message),
                    ],
                };
                self.store
                    .update_status(name, record.agent.metadata.generation, status)
                    .await?;
                return Err(error);
            }
        };

        let mut status = Status {
            observed_generation: record.agent.metadata.generation,
            sandbox_id: Some(sandbox.id.clone()),
            runtime_version: Some(runtime_version),
            conditions: vec![condition(SANDBOX_READY, ConditionStatus::True, "SandboxRunning", "")],
        };
        if let Err(error) = self.runtime.verify_ready(&record.agent, &sandbox).await {
            let message = error.to_string();
            status.conditions.extend([
                condition(
                    RUNTIME_READY,
                    ConditionStatus::False,
                    "RuntimeReconcileFailed",
                    &message,
                ),
                condition(READY, ConditionStatus::False, "RuntimeNotReady", &message),
            ]);
            self.store
                .update_status(name, record.agent.metadata.generation, status)
                .await?;
            return Err(error);
        }

        status.conditions.extend([
            condition(RUNTIME_READY, ConditionStatus::True, "RuntimeRunning", ""),
            condition(READY, ConditionStatus::True, "ComponentsReady", ""),
        ]);
        self.store
            .update_status(name, record.agent.metadata.generation, status)
            .await
    }

    async fn release(&self, record: &AgentRecord) -> Result<(), Error> {
        let name = record.agent.sandbox_name()?;
        self.sandboxes
            .release(&name, record.agent.spec.sandbox.retention_policy)
            .await?;
        self.store
            .delete(&record.agent.metadata.name, record.agent.metadata.generation)
            .await
    }

    async fn resolve_runtime_bundle(
        &self,
        record: &AgentRecord,
        sandbox_spec: &SandboxSpec,
    ) -> Result<AgentRuntimeBundle, Error> {
        match self
            .runtime_bundles
            .resolve(&sandbox_spec.platform, record.agent.status.runtime_version.as_deref())
            .await
        {
            Ok(bundle) => Ok(bundle),
            Err(error) => {
                let message = error.to_string();
                let status = Status {
                    observed_generation: record.agent.metadata.generation,
                    sandbox_id: record.agent.status.sandbox_id.clone(),
                    runtime_version: record.agent.status.runtime_version.clone(),
                    conditions: vec![
                        condition(
                            RUNTIME_READY,
                            ConditionStatus::False,
                            "RuntimeBundleResolutionFailed",
                            &message,
                        ),
                        condition(READY, ConditionStatus::False, "RuntimeNotReady", &message),
                    ],
                };
                self.store
                    .update_status(&record.agent.metadata.name, record.agent.metadata.generation, status)
                    .await?;
                Err(error)
            }
        }
    }
}

fn condition(kind: &str, status: ConditionStatus, reason: &str, message: &str) -> Condition {
    Condition {
        kind: kind.into(),
        status,
        reason: reason.into(),
        message: message.into(),
    }
}
