use std::rc::Rc;

use crate::{Condition, ConditionStatus, Error, FailureKind, ReconcileFailure, Status};

use super::{AgentRecord, ObservedStatus, SharedAgentStore, StatusWatch};

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
    progress: crate::progress::Hub,
    statuses: StatusWatch,
}

impl Reconciler {
    /// Creates an Agent reconciler over persistent resources and runtime-resolved Sandboxes.
    #[must_use]
    pub fn new(
        store: SharedAgentStore,
        sandboxes: Rc<crate::sandbox::Service>,
        progress: crate::progress::Hub,
        statuses: StatusWatch,
    ) -> Self {
        Self {
            store,
            sandboxes,
            sessions: None,
            progress,
            statuses,
        }
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
            self.update_status(&record, status.clone(), None).await?;
            record.agent.status = status;
        }

        let observer = self
            .progress
            .observe_sandbox(record.id, record.agent.metadata.name.clone());
        let ensured = match self.sandboxes.ensure(&record, observer.reporter()).await {
            Ok(ensured) => ensured,
            Err(error) => {
                let failure = ReconcileFailure::classify(&error);
                observer.failed(&failure);
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
                self.update_status(&record, status, Some(failure.kind)).await?;
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

        let status = Status::observed(
            record.agent.metadata.generation,
            Some(crate::sandbox::Assignment::Materialized {
                provider,
                id: ensured.id,
            }),
            vec![
                condition(Condition::SANDBOX_READY, ConditionStatus::True, "SandboxRunning", ""),
                condition(Condition::READY, ConditionStatus::True, "SandboxReady", ""),
            ],
        );
        self.update_status(&record, status, None).await?;
        if ensured.runtime_restarted {
            self.notify_sessions(record.id);
        }
        Ok(())
    }

    async fn release(&self, record: &AgentRecord) -> Result<(), Error> {
        self.sandboxes.release(record).await?;
        self.notify_sessions(record.id);
        self.store
            .finalize_deletion(record.id, record.agent.metadata.generation)
            .await?;
        self.statuses.forget(record.id);
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
    }

    async fn update_status(
        &self,
        record: &AgentRecord,
        status: Status,
        failure: Option<FailureKind>,
    ) -> Result<(), Error> {
        let notify = session_relevant_transition(&record.agent.status, &status);
        let observed = ObservedStatus {
            conditions: status.conditions.clone(),
            failure,
        };
        self.store
            .update_status(record.id, record.agent.metadata.generation, status)
            .await?;
        self.statuses.publish(record.id, observed);
        if notify {
            self.notify_sessions(record.id);
        }
        Ok(())
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
    }
}

fn session_relevant_transition(previous: &Status, current: &Status) -> bool {
    previous.is_ready() != current.is_ready()
        || previous.sandbox.as_ref().and_then(crate::sandbox::Assignment::id)
            != current.sandbox.as_ref().and_then(crate::sandbox::Assignment::id)
}
