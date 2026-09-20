//! At-least-once convergence of one durable Session.

use std::{rc::Rc, time::Duration};

use ::sandbox::LocalFuture;

use crate::Error;

use super::{
    Activity, ActivityEvent, AgentSandboxes, LaunchRecord, LaunchToken, Lifecycle, LifecycleState, Phase, Session,
    SessionId, SessionRuntime, SharedStore, runtime::Observation,
};

/// A launch is considered healthy after surviving this long, resetting backoff.
const HEALTHY_AFTER_SECONDS: i64 = 60;

/// Longest wait between relaunches of a repeatedly exiting harness.
const MAX_BACKOFF_SECONDS: i64 = 600;

/// Stop an unattached harness after this long without terminal output,
/// transcript writes or reported activity.
const IDLE_AFTER_SECONDS: u64 = 30 * 60;

/// Maximum time for a resumed harness to reach its empty input prompt.
const RESUME_READY_TIMEOUT: Duration = Duration::from_secs(15);
const RESUME_READY_POLL: Duration = Duration::from_millis(100);

/// Converges persistent Sessions onto the tmux runtime in their Agent's Sandbox.
pub struct Reconciler {
    sessions: SharedStore,
    sandboxes: Rc<AgentSandboxes>,
    runtime: Rc<dyn SessionRuntime>,
    session_hook_url: String,
}

impl Reconciler {
    /// Creates a Session reconciler over durable state and the Agent Sandbox service.
    ///
    /// `session_hook_url` is the Sandbox-reachable start-hook endpoint handed to
    /// every harness launch.
    #[must_use]
    pub fn new(
        sessions: SharedStore,
        sandboxes: Rc<AgentSandboxes>,
        runtime: Rc<dyn SessionRuntime>,
        session_hook_url: String,
    ) -> Self {
        Self {
            sessions,
            sandboxes,
            runtime,
            session_hook_url,
        }
    }

    async fn converge(&self, session: &Session) -> Result<Lifecycle, Error> {
        if session.status.lifecycle.state == LifecycleState::Idle
            && session.activation_generation == session.observed_activation_generation
        {
            return Ok(Lifecycle::idle());
        }
        let agent = self.sandboxes.agent(session.agent_id).await?;
        if agent.agent.metadata.deletion_timestamp.is_some()
            || !agent.agent.status.is_ready()
            || !matches!(
                agent.agent.status.sandbox,
                Some(crate::sandbox::Assignment::Materialized { .. })
            )
        {
            let reason = format!("Agent {:?} is not ready", agent.agent.metadata.name);
            return Ok(if session.status.lifecycle.state == LifecycleState::Resuming {
                Lifecycle::resuming_with(reason)
            } else {
                Lifecycle::starting(reason)
            });
        }
        let sandbox = self.sandboxes.open(&agent).await?;
        let platform = &sandbox.snapshot().image.platform;
        // TODO: Generalize the Session runtime when a concrete non-Linux driver establishes its required contract.
        if platform.os != "linux" {
            return Err(Error::Session(format!(
                "tmux Sessions require a Linux Sandbox, but the materialized platform is {:?}",
                platform.os
            )));
        }
        let sandbox_id = sandbox.snapshot().id.to_string();
        let launch = self.sessions.session_launch_state(session.id).await?;
        let now = time::OffsetDateTime::now_utc().unix_timestamp();

        if let Observation::Alive { attached, idle_seconds } = self.runtime.observe(session, &sandbox).await? {
            if !attached
                && effective_idle_seconds(&session.status.reported.activity, idle_seconds, now) >= IDLE_AFTER_SECONDS
            {
                self.runtime.stop(session, &sandbox).await?;
                self.sessions.reset_session_launch_attempts(session.id).await?;
                return Ok(Lifecycle::idle());
            }
            if let Some(state) = &launch
                && state.attempts > 0
                && now - state.launched_at >= HEALTHY_AFTER_SECONDS
            {
                self.sessions.reset_session_launch_attempts(session.id).await?;
            }
            if session.status.lifecycle.state == LifecycleState::Resuming {
                let state = launch
                    .as_ref()
                    .ok_or_else(|| Error::Session("resumed harness has no launch record".into()))?;
                if state.sandbox != sandbox_id {
                    return Err(Error::Session("resumed harness belongs to a replaced Sandbox".into()));
                }
                self.wait_for_resumed_input(session, &sandbox, &state.token).await?;
            }
            return Ok(Lifecycle::running());
        }

        let mut attempts = 0;
        let mut resume = session.status.reported.harness_session_id.clone();
        if let Some(state) = launch {
            if state.sandbox == sandbox_id {
                attempts = state.attempts;
                let wait = backoff_seconds(attempts);
                if attempts > 0 && now < state.launched_at + wait {
                    return Ok(Lifecycle::failed(format!(
                        "harness exited; relaunching after up to {wait}s of backoff"
                    )));
                }
            } else {
                // The Sandbox was replaced, and the harness conversation state
                // lived inside it. Start a fresh conversation instead of
                // resuming an ID whose files no longer exist.
                resume = None;
                attempts = 0;
                self.sessions.clear_session_report(session.id).await?;
            }
        }
        self.launch(
            session,
            &sandbox,
            LaunchRecord {
                token: LaunchToken::generate(),
                sandbox: sandbox_id,
                launched_at: now,
                attempts: attempts + 1,
            },
            resume.as_deref(),
        )
        .await
    }

    async fn release(&self, session: &Session) -> Result<(), Error> {
        let owner = match self.sandboxes.agent(session.agent_id).await {
            Ok(owner) => owner,
            Err(Error::NotFound) => return self.sessions.complete_session_deletion(session.id).await,
            Err(error) => return Err(error),
        };
        if owner.agent.metadata.deletion_timestamp.is_some()
            || !matches!(
                owner.agent.status.sandbox,
                Some(crate::sandbox::Assignment::Materialized { .. })
            )
        {
            return self.sessions.complete_session_deletion(session.id).await;
        }
        let sandbox = self.sandboxes.open(&owner).await?;
        if matches!(
            self.runtime.observe(session, &sandbox).await?,
            Observation::Alive { .. }
        ) {
            self.runtime.stop(session, &sandbox).await?;
        }
        self.sessions.complete_session_deletion(session.id).await
    }

    /// Consumes the first prompt before launch; recovery never replays it.
    async fn launch(
        &self,
        session: &Session,
        sandbox: &::sandbox::SandboxHandle,
        record: LaunchRecord,
        resume: Option<&str>,
    ) -> Result<Lifecycle, Error> {
        let token = record.token.clone();
        let initial_prompt = self.sessions.record_session_launch(session.id, record).await?;
        if resume.is_some() {
            self.sessions
                .update_session_lifecycle(session.id, Lifecycle::resuming(), session.activation_generation)
                .await?;
        }
        self.runtime
            .start(
                session,
                sandbox,
                &self.session_hook_url,
                &token,
                resume,
                initial_prompt.as_deref().filter(|_| resume.is_none()),
            )
            .await?;
        if resume.is_some() {
            self.wait_for_resumed_input(session, sandbox, &token).await?;
        }
        Ok(Lifecycle::running())
    }

    async fn wait_for_resumed_input(
        &self,
        session: &Session,
        sandbox: &::sandbox::SandboxHandle,
        token: &LaunchToken,
    ) -> Result<(), Error> {
        let waiting = async {
            loop {
                let current = self.sessions.get_session(session.id).await?;
                let ready = match current.status.reported.activity.phase {
                    Phase::WaitingForInput => return Ok(()),
                    Phase::Unknown | Phase::Working => {
                        self.runtime.input_ready(&current, sandbox).await.unwrap_or(false)
                    }
                };
                if ready {
                    let applied = self
                        .sessions
                        .apply_session_activity_for_launch(
                            session.id,
                            token,
                            uuid::Uuid::new_v4(),
                            ActivityEvent::WaitingForInput,
                            time::OffsetDateTime::now_utc(),
                        )
                        .await?;
                    return applied.map(|_| ()).ok_or_else(|| {
                        Error::Session("resumed harness launch changed while waiting for input".into())
                    });
                }
                tokio::time::sleep(RESUME_READY_POLL).await;
            }
        };
        if let Ok(result) = tokio::time::timeout(RESUME_READY_TIMEOUT, waiting).await {
            return result;
        }
        let current = self.sessions.get_session(session.id).await?;
        self.runtime.stop(&current, sandbox).await?;
        let error = Error::Session(format!(
            "resumed harness did not become ready for input within {} seconds",
            RESUME_READY_TIMEOUT.as_secs()
        ));
        self.sessions
            .update_session_lifecycle(
                session.id,
                Lifecycle::failed(error.to_string()),
                session.activation_generation,
            )
            .await?;
        Err(error)
    }
}

impl crate::controller::Reconcile<SessionId> for Reconciler {
    fn reconcile(&self, id: SessionId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            let session = match self.sessions.get_session(id).await {
                Ok(session) => session,
                Err(Error::NotFound) => return Ok(()),
                Err(error) => return Err(error),
            };
            if session.deletion_completed_timestamp.is_some() {
                return Ok(());
            }
            if session.deletion_timestamp.is_some() {
                return Self::release(self, &session).await;
            }
            match self.converge(&session).await {
                Ok(lifecycle) => {
                    self.sessions
                        .update_session_lifecycle(session.id, lifecycle, session.activation_generation)
                        .await
                }
                Err(error) => {
                    let current = self.sessions.get_session(session.id).await?;
                    let lifecycle = if current.status.lifecycle.state == LifecycleState::Resuming {
                        Lifecycle::resuming_with(error.to_string())
                    } else {
                        Lifecycle::failed(error.to_string())
                    };
                    self.sessions
                        .update_session_lifecycle(session.id, lifecycle, session.activation_generation)
                        .await?;
                    Err(error)
                }
            }
        })
    }
}

/// Seconds a Session has been inactive, taking the smaller of runtime
/// inactivity (terminal or transcript) and time since the last reported event.
fn effective_idle_seconds(activity: &Activity, runtime_idle_seconds: u64, now: i64) -> u64 {
    activity.last_event_at.map_or(runtime_idle_seconds, |at| {
        let since_event = u64::try_from((now - at.unix_timestamp()).max(0)).unwrap_or(u64::MAX);
        runtime_idle_seconds.min(since_event)
    })
}

/// Seconds to wait after launch attempt `attempts` before relaunching.
fn backoff_seconds(attempts: u32) -> i64 {
    if attempts == 0 {
        return 0;
    }
    let exponent = (attempts - 1).min(6);
    let wait = 10_i64 << exponent;
    if wait > MAX_BACKOFF_SECONDS {
        MAX_BACKOFF_SECONDS
    } else {
        wait
    }
}

#[cfg(test)]
mod tests {
    use super::{Activity, effective_idle_seconds};

    #[test]
    fn idle_age_is_the_terminal_age_until_the_harness_reports_activity() {
        assert_eq!(effective_idle_seconds(&Activity::default(), 1_900, 10_000), 1_900);
    }

    #[test]
    fn idle_age_is_the_fresher_of_terminal_and_reported_activity() {
        let reported = Activity {
            last_event_at: Some(time::OffsetDateTime::from_unix_timestamp(9_940).expect("timestamp")),
            ..Activity::default()
        };
        assert_eq!(
            effective_idle_seconds(&reported, 1_900, 10_000),
            60,
            "a recent report counts as activity"
        );
        assert_eq!(
            effective_idle_seconds(&reported, 5, 10_000),
            5,
            "terminal output counts too"
        );
        // A report stamped ahead of the daemon clock never yields a negative age.
        assert_eq!(effective_idle_seconds(&reported, 30, 9_000), 0);
    }

    #[test]
    fn backoff_grows_and_caps() {
        assert_eq!(super::backoff_seconds(0), 0);
        assert_eq!(super::backoff_seconds(1), 10);
        assert_eq!(super::backoff_seconds(2), 20);
        assert_eq!(super::backoff_seconds(5), 160);
        assert_eq!(super::backoff_seconds(7), super::MAX_BACKOFF_SECONDS);
        assert_eq!(super::backoff_seconds(u32::MAX), super::MAX_BACKOFF_SECONDS);
    }
}
