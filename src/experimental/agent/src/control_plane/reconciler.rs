use std::rc::Rc;

use crate::{Condition, ConditionStatus, Error, FailureKind, ReconcileFailure, Status};

use super::{AgentRecord, SharedAgentStore};
use crate::progress::{ProvisioningState, SandboxObserver};

/// Receives low-latency hints when an Agent transition affects its Sessions.
pub trait SessionNotifier {
    /// Wakes every durable Session owned by the Agent incarnation.
    fn notify(&self, id: crate::AgentId);
}

/// Converges one stored Agent generation without owning an API request.
pub struct Reconciler {
    store: SharedAgentStore,
    sandboxes: Rc<crate::sandbox::Service>,
    sessions: Option<Rc<dyn SessionNotifier>>,
    ssh: Option<Rc<crate::ssh::Access>>,
    provisioning: ProvisioningState,
}

impl Reconciler {
    /// Creates an Agent reconciler over persistent resources and runtime-resolved Sandboxes.
    #[must_use]
    pub fn new(
        store: SharedAgentStore,
        sandboxes: Rc<crate::sandbox::Service>,
        provisioning: ProvisioningState,
    ) -> Self {
        Self {
            store,
            sandboxes,
            sessions: None,
            ssh: None,
            provisioning,
        }
    }

    /// Reconciles declared SSH access after the Sandbox is set up.
    #[must_use]
    pub fn with_ssh_access(mut self, ssh: Rc<crate::ssh::Access>) -> Self {
        self.ssh = Some(ssh);
        self
    }

    /// Wakes dependent Sessions when readiness or Sandbox identity changes.
    #[must_use]
    pub fn with_session_notifier(mut self, sessions: Rc<dyn SessionNotifier>) -> Self {
        self.sessions = Some(sessions);
        self
    }

    /// Converges the latest generation of one Agent and records what it observed.
    ///
    /// # Errors
    ///
    /// Returns an error when storage or sandbox lifecycle convergence fails.
    pub async fn reconcile(&self, id: crate::AgentId) -> Result<(), Error> {
        let mut record = match self.store.get(id).await {
            Ok(record) => record,
            Err(Error::NotFound) => return Ok(()),
            Err(error) => return Err(error),
        };
        if record.agent.metadata.deletion_timestamp.is_some() {
            return self.release(&record).await;
        }

        if record.agent.status.sandbox.is_none() {
            let provider = match self.sandboxes.resolve(&record).await {
                Ok(provider) => provider,
                Err(error) => {
                    self.record_failure(&record, "ProviderResolutionFailed", &ReconcileFailure::classify(&error))
                        .await?;
                    return Err(error);
                }
            };
            let status = Status::observed(
                record.agent.metadata.generation,
                Some(crate::sandbox::Assignment::Selected { provider }),
                vec![condition(
                    Condition::READY,
                    ConditionStatus::False,
                    "ProviderSelected",
                    "Sandbox provisioning has not completed",
                )],
            );
            record.agent.status = self.update_status(&record, status, None).await?;
        }

        let observer = SandboxObserver::new(record.id, self.provisioning.clone());
        let ensured = match self.sandboxes.ensure(&record, observer.reporter()).await {
            Ok(ensured) => {
                observer.succeeded();
                ensured
            }
            Err(error) => {
                let failure = ReconcileFailure::classify(&error);
                let message = error.to_string();
                let status = Status::observed(
                    record.agent.metadata.generation,
                    record.agent.status.sandbox.clone(),
                    vec![
                        condition(
                            Condition::READY,
                            ConditionStatus::False,
                            "SandboxReconcileFailed",
                            &message,
                        ),
                        condition(
                            Condition::SANDBOX_READY,
                            ConditionStatus::False,
                            "ReconcileFailed",
                            &message,
                        ),
                    ],
                );
                // The failure class is stored before followers see the pass fail.
                let stored = self.update_status(&record, status, Some(failure.kind)).await;
                observer.failed(&failure);
                stored?;
                return Err(error);
            }
        };

        let provider = record
            .agent
            .status
            .sandbox
            .as_ref()
            .ok_or_else(|| Error::Database("persisted Sandbox Provider assignment disappeared".into()))?
            .provider()
            .clone();

        let assignment = crate::sandbox::Assignment::Materialized {
            provider,
            id: ensured.id,
            harnesses: ensured.harnesses.clone(),
        };
        let mut conditions = vec![condition(
            Condition::SANDBOX_READY,
            ConditionStatus::True,
            "SandboxRunning",
            "",
        )];
        self.reconcile_ssh(&record, &ensured.sandbox, &assignment, &mut conditions)
            .await?;
        conditions.push(condition(Condition::READY, ConditionStatus::True, "SandboxReady", ""));
        let status = Status::observed(record.agent.metadata.generation, Some(assignment), conditions);
        self.update_status(&record, status, None).await?;
        if ensured.runtime_restarted {
            self.notify_sessions(record.id);
        }
        Ok(())
    }

    /// Reconciles declared SSH access and appends its condition. A failure is
    /// recorded as the Agent's `Ready=False` before it is returned.
    async fn reconcile_ssh(
        &self,
        record: &AgentRecord,
        sandbox: &::sandbox::SandboxHandle,
        assignment: &crate::sandbox::Assignment,
        conditions: &mut Vec<Condition>,
    ) -> Result<(), Error> {
        let Some(ssh) = &self.ssh else {
            return Ok(());
        };
        match ssh.reconcile(record, sandbox).await {
            Ok(true) => {
                conditions.push(condition(
                    Condition::SSH_READY,
                    ConditionStatus::True,
                    "ServerRunning",
                    "",
                ));
                Ok(())
            }
            Ok(false) => Ok(()),
            Err(error) => {
                let failure = ReconcileFailure::classify(&error);
                conditions.push(condition(
                    Condition::SSH_READY,
                    ConditionStatus::False,
                    "ReconcileFailed",
                    &failure.message,
                ));
                conditions.push(condition(
                    Condition::READY,
                    ConditionStatus::False,
                    "SshAccessFailed",
                    &failure.message,
                ));
                let status = Status::observed(
                    record.agent.metadata.generation,
                    Some(assignment.clone()),
                    std::mem::take(conditions),
                );
                self.update_status(record, status, Some(failure.kind)).await?;
                Err(error)
            }
        }
    }

    async fn release(&self, record: &AgentRecord) -> Result<(), Error> {
        self.sandboxes.release(record).await?;
        if let Some(ssh) = &self.ssh {
            ssh.remove(record).await?;
        }
        self.notify_sessions(record.id);
        self.store
            .finalize_deletion(record.id, record.agent.metadata.generation)
            .await?;
        self.provisioning.forget(record.id);
        Ok(())
    }

    async fn record_failure(
        &self,
        record: &AgentRecord,
        reason: &str,
        failure: &ReconcileFailure,
    ) -> Result<(), Error> {
        self.update_status(
            record,
            Status::observed(
                record.agent.metadata.generation,
                record.agent.status.sandbox.clone(),
                vec![condition(
                    Condition::READY,
                    ConditionStatus::False,
                    reason,
                    &failure.message,
                )],
            ),
            Some(failure.kind),
        )
        .await
        .map(drop)
    }

    /// Records the pass's observed status and failure class and returns it as stored.
    async fn update_status(
        &self,
        record: &AgentRecord,
        mut status: Status,
        failure: Option<FailureKind>,
    ) -> Result<Status, Error> {
        status.failure = failure;
        let notify = session_relevant_transition(&record.agent.status, &status);
        let stored = self
            .store
            .update_status(record.id, record.agent.metadata.generation, status)
            .await?;
        if notify {
            self.notify_sessions(record.id);
        }
        Ok(stored)
    }

    fn notify_sessions(&self, id: crate::AgentId) {
        if let Some(sessions) = &self.sessions {
            sessions.notify(id);
        }
    }
}

impl crate::controller::Reconcile<crate::AgentId> for Reconciler {
    fn reconcile(&self, id: crate::AgentId) -> ::sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move { Self::reconcile(self, id).await })
    }
}

fn condition(kind: &str, status: ConditionStatus, reason: &str, message: &str) -> Condition {
    Condition {
        kind: kind.into(),
        status,
        reason: reason.into(),
        message: message.into(),
        last_transition_time: None,
    }
}

fn session_relevant_transition(previous: &Status, current: &Status) -> bool {
    previous.is_ready() != current.is_ready()
        || previous.sandbox.as_ref().and_then(crate::sandbox::Assignment::id)
            != current.sandbox.as_ref().and_then(crate::sandbox::Assignment::id)
        || previous
            .sandbox
            .as_ref()
            .and_then(crate::sandbox::Assignment::installed_harnesses)
            != current
                .sandbox
                .as_ref()
                .and_then(crate::sandbox::Assignment::installed_harnesses)
}
