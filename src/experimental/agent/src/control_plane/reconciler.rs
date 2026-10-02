use std::rc::Rc;

use crate::{Condition, ConditionStatus, Error, FailureKind, ReconcileFailure, Status};

use super::{AgentRecord, SharedAgentStore};
use crate::progress::{ProvisioningState, SandboxObserver};
use crate::sandbox::responsiveness::stall_detail;

/// Receives low-latency hints when an Agent transition affects its Sessions.
pub trait SessionNotifier {
    /// Wakes every durable Session owned by the Agent incarnation.
    fn notify(&self, id: crate::AgentId);

    /// Reconciles every durable Session owned by the Agent incarnation and
    /// completes once each has finished a pass that began after this call.
    fn settle(&self, id: crate::AgentId) -> ::sandbox::LocalFuture<'_, ()>;
}

/// Converges one stored Agent generation without owning an API request.
pub struct Reconciler {
    store: SharedAgentStore,
    sandboxes: Rc<crate::sandbox::Service>,
    sessions: Option<Rc<dyn SessionNotifier>>,
    ssh: Option<Rc<crate::ssh::Access>>,
    vnc: Option<Rc<crate::vnc::Access>>,
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
            vnc: None,
            provisioning,
        }
    }

    /// Reconciles declared SSH access after the Sandbox is set up.
    #[must_use]
    pub fn with_ssh_access(mut self, ssh: Rc<crate::ssh::Access>) -> Self {
        self.ssh = Some(ssh);
        self
    }

    /// Reconciles declared VNC access after the Sandbox is set up.
    #[must_use]
    pub fn with_vnc_access(mut self, vnc: Rc<crate::vnc::Access>) -> Self {
        self.vnc = Some(vnc);
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
        if record.agent.spec.is_stopped() {
            return self.stop(&record).await;
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

        if recorded_by_stop(&record.agent.status) {
            let starting = not_ready(&record, Condition::REASON_STARTING, "");
            record.agent.status = self.update_status(&record, starting, None).await?;
        }

        let status = &record.agent.status;
        let observer = if status.is_ready() && status.observed_generation == record.agent.metadata.generation {
            SandboxObserver::resync(record.id, self.provisioning.clone())
        } else {
            SandboxObserver::new(record.id, self.provisioning.clone())
        };
        let ensured = match self.sandboxes.ensure(&record, observer.reporter()).await {
            Ok(ensured) => ensured,
            Err(error @ Error::SandboxUnresponsive(_)) => {
                let assignment = record.agent.status.sandbox.clone();
                return self.record_unresponsive(&record, assignment, &observer, error).await;
            }
            Err(error) => return self.record_ensure_failure(&record, &observer, error).await,
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
        self.reconcile_declared_access(&record, &ensured.sandbox, &assignment, &mut conditions, &observer)
            .await?;
        conditions.insert(
            1,
            responsive_condition(self.sandboxes.reports_heartbeat(&ensured.sandbox.snapshot().id)),
        );
        conditions.push(condition(Condition::READY, ConditionStatus::True, "SandboxReady", ""));
        let status = Status::observed(record.agent.metadata.generation, Some(assignment), conditions);
        // As on failure, readiness is stored before followers see the pass end.
        self.update_status(&record, status, None).await?;
        observer.succeeded();
        if ensured.runtime_restarted {
            self.notify_sessions(record.id);
        }
        Ok(())
    }

    /// Reconciles every access capability the platform offers, in order.
    async fn reconcile_declared_access(
        &self,
        record: &AgentRecord,
        sandbox: &::sandbox::SandboxHandle,
        assignment: &crate::sandbox::Assignment,
        conditions: &mut Vec<Condition>,
        observer: &SandboxObserver,
    ) -> Result<(), Error> {
        let id = &sandbox.snapshot().id;
        if let Some(ssh) = &self.ssh {
            let pass = self.sandboxes.guard_guest(record, id, ssh.reconcile(record, sandbox));
            self.reconcile_access(SSH, pass, record, assignment, conditions, observer)
                .await?;
        }
        if let Some(vnc) = &self.vnc {
            let pass = self.sandboxes.guard_guest(record, id, vnc.reconcile(record, sandbox));
            self.reconcile_access(VNC, pass, record, assignment, conditions, observer)
                .await?;
        }
        Ok(())
    }

    /// Runs one access capability's pass and appends its condition. A failure
    /// is recorded as the Agent's `Ready=False` before it is returned.
    async fn reconcile_access(
        &self,
        kind: AccessKind,
        pass: impl Future<Output = Result<bool, Error>>,
        record: &AgentRecord,
        assignment: &crate::sandbox::Assignment,
        conditions: &mut Vec<Condition>,
        observer: &SandboxObserver,
    ) -> Result<(), Error> {
        let phase = if (kind.declared)(&record.agent.spec) {
            Some(observer.reporter().start_phase(kind.phase).await)
        } else {
            None
        };
        match pass.await {
            Ok(true) => {
                if let Some(phase) = phase {
                    phase.complete().await;
                }
                conditions.push(condition(kind.condition, ConditionStatus::True, kind.ready_reason, ""));
                Ok(())
            }
            Ok(false) => Ok(()),
            Err(error @ Error::SandboxUnresponsive(_)) => {
                conditions.clear();
                self.record_unresponsive(record, Some(assignment.clone()), observer, error)
                    .await
            }
            Err(error) => {
                let failure = ReconcileFailure::classify(&error);
                conditions.push(condition(
                    kind.condition,
                    ConditionStatus::False,
                    "ReconcileFailed",
                    &failure.message,
                ));
                conditions.push(condition(
                    Condition::READY,
                    ConditionStatus::False,
                    kind.failed_reason,
                    &failure.message,
                ));
                let status = Status::observed(
                    record.agent.metadata.generation,
                    Some(assignment.clone()),
                    std::mem::take(conditions),
                );
                let stored = self.update_status(record, status, Some(failure.kind)).await;
                observer.failed(&failure);
                stored?;
                Err(error)
            }
        }
    }

    /// Records a failed Sandbox ensure or setup as the Agent's `Ready=False` and returns `error`.
    async fn record_ensure_failure(
        &self,
        record: &AgentRecord,
        observer: &SandboxObserver,
        error: Error,
    ) -> Result<(), Error> {
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
        let stored = self.update_status(record, status, Some(failure.kind)).await;
        observer.failed(&failure);
        stored?;
        Err(error)
    }

    /// Records that the Sandbox's guest stopped responding and returns `error`.
    ///
    /// A stall is only found in work after the Sandbox started, so the Sandbox
    /// itself is running; only the guest inside it has stopped.
    async fn record_unresponsive(
        &self,
        record: &AgentRecord,
        assignment: Option<crate::sandbox::Assignment>,
        observer: &SandboxObserver,
        error: Error,
    ) -> Result<(), Error> {
        let failure = ReconcileFailure::classify(&error);
        let mut conditions = vec![condition(
            Condition::SANDBOX_READY,
            ConditionStatus::True,
            "SandboxRunning",
            "",
        )];
        conditions.push(condition(
            Condition::SANDBOX_RESPONSIVE,
            ConditionStatus::False,
            "HeartbeatStale",
            &stall_detail(),
        ));
        conditions.push(condition(
            Condition::READY,
            ConditionStatus::False,
            "SandboxUnresponsive",
            &failure.message,
        ));
        let status = Status::observed(record.agent.metadata.generation, assignment, conditions);
        let stored = self.update_status(record, status, Some(failure.kind)).await;
        observer.failed(&failure);
        stored?;
        Err(error)
    }

    /// Stops the Sandbox of an Agent whose run state is Stopped and records it
    /// as stopped. The Sandbox keeps its identity, storage and assignment, so a
    /// start boots the same disk. Nothing reaches into the guest, so a guest
    /// that stopped responding cannot hold the stop up.
    async fn stop(&self, record: &AgentRecord) -> Result<(), Error> {
        let current = record.agent.status.observed_generation == record.agent.metadata.generation;
        let already_stopped = current && record.agent.status.is_stopped();
        if !(current && recorded_by_stop(&record.agent.status)) {
            // Not Ready before the VM goes away, so Sessions are told and go Idle first.
            let stopping = not_ready(record, Condition::REASON_STOPPING, "");
            self.update_status(record, stopping, None).await?;
        }
        let observer = if already_stopped {
            SandboxObserver::resync(record.id, self.provisioning.clone())
        } else {
            SandboxObserver::new(record.id, self.provisioning.clone())
        };
        let phase = observer.reporter().start_phase(crate::progress::SANDBOX_STOP).await;
        if let Err(error) = self.sandboxes.stop(record).await {
            let failure = ReconcileFailure::classify(&error);
            let stored = self.record_failure(record, Condition::REASON_STOPPING, &failure).await;
            observer.failed(&failure);
            stored?;
            return Err(error);
        }
        phase.complete().await;
        let hint = format!("run `agentctl start agent/{}` to start it", record.agent.metadata.name);
        let stopped = Status::observed(
            record.agent.metadata.generation,
            record.agent.status.sandbox.clone(),
            vec![
                condition(
                    Condition::SANDBOX_READY,
                    ConditionStatus::False,
                    Condition::REASON_STOPPED,
                    "",
                ),
                condition(
                    Condition::READY,
                    ConditionStatus::False,
                    Condition::REASON_STOPPED,
                    &hint,
                ),
            ],
        );
        self.update_status(record, stopped, None).await?;
        if !already_stopped && let Some(sessions) = &self.sessions {
            // The next pass, such as a start, waits until every Session has seen
            // the stop, so a Session pass that began before it cannot relaunch
            // its harness in the started VM.
            sessions.settle(record.id).await;
        }
        observer.succeeded();
        Ok(())
    }

    async fn release(&self, record: &AgentRecord) -> Result<(), Error> {
        self.sandboxes.release(record).await?;
        if let Some(ssh) = &self.ssh {
            ssh.remove(record).await?;
        }
        if let Some(vnc) = &self.vnc {
            vnc.forget(record.id);
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
        self.update_status(record, not_ready(record, reason, &failure.message), Some(failure.kind))
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
        // A resync that observes what is already stored writes nothing, so it
        // advances no revision and wakes no watcher.
        let stored = Status {
            progress: None,
            provenance: None,
            ..record.agent.status.clone()
        };
        let mut unchanged = status.clone();
        unchanged.stamp_transitions(&stored, time::OffsetDateTime::UNIX_EPOCH);
        if unchanged == stored {
            return Ok(stored);
        }
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

/// How one access capability reports its pass in progress and conditions.
struct AccessKind {
    declared: fn(&crate::Spec) -> bool,
    phase: ::sandbox::Phase,
    condition: &'static str,
    ready_reason: &'static str,
    failed_reason: &'static str,
}

const SSH: AccessKind = AccessKind {
    declared: crate::Spec::ssh_access,
    phase: crate::progress::SSH_ACCESS,
    condition: Condition::SSH_READY,
    ready_reason: "ServerRunning",
    failed_reason: "SshAccessFailed",
};

const VNC: AccessKind = AccessKind {
    declared: crate::Spec::vnc_access,
    phase: crate::progress::VNC_ACCESS,
    condition: Condition::VNC_READY,
    ready_reason: "BridgeListening",
    failed_reason: "VncAccessFailed",
};

fn condition(kind: &str, status: ConditionStatus, reason: &str, message: &str) -> Condition {
    Condition {
        kind: kind.into(),
        status,
        reason: reason.into(),
        message: message.into(),
        last_transition_time: None,
    }
}

/// Reports the guest's heartbeat after a pass whose guest work finished. A
/// Sandbox that reports no heartbeat gives no evidence either way.
fn responsive_condition(reports_heartbeat: bool) -> Condition {
    if reports_heartbeat {
        condition(
            Condition::SANDBOX_RESPONSIVE,
            ConditionStatus::True,
            "HeartbeatAdvancing",
            "",
        )
    } else {
        condition(
            Condition::SANDBOX_RESPONSIVE,
            ConditionStatus::Unknown,
            "HeartbeatNotObserved",
            "",
        )
    }
}

/// A status with only `Ready=False` for `reason`, keeping the record's Sandbox assignment.
fn not_ready(record: &AgentRecord, reason: &str, message: &str) -> Status {
    Status::observed(
        record.agent.metadata.generation,
        record.agent.status.sandbox.clone(),
        vec![condition(Condition::READY, ConditionStatus::False, reason, message)],
    )
}

/// Whether `status` was recorded by a pass that stopped, or tried to stop, the Sandbox.
fn recorded_by_stop(status: &Status) -> bool {
    status
        .ready_condition()
        .is_some_and(|ready| ready.reason == Condition::REASON_STOPPED || ready.reason == Condition::REASON_STOPPING)
}

fn session_relevant_transition(previous: &Status, current: &Status) -> bool {
    previous.is_ready() != current.is_ready()
        || recorded_by_stop(previous) != recorded_by_stop(current)
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
