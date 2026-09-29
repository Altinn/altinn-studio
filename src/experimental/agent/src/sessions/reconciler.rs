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

/// A turn whose terminal and transcript stay quiet this long is not waited for
/// when archiving: the harness is stuck, gone, or was never prompted.
const ARCHIVE_TURN_QUIET_SECONDS: u64 = 60;

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

    /// Stops the harness of a Session marked for release and then removes it.
    ///
    /// A Sandbox that is gone, unmaterialized or stopped took the harness
    /// process with it, so there is nothing left to stop; anything else is an
    /// error, and the Session stays marked until a later pass can release it.
    async fn release(&self, session: &Session) -> Result<(), Error> {
        if let Some(sandbox) = self.release_sandbox(session).await? {
            self.runtime.stop(session, &sandbox).await?;
        }
        self.sessions.finalize_session_deletion(session.id).await
    }

    /// The Sandbox still holding this Session's harness, if one does.
    async fn release_sandbox(&self, session: &Session) -> Result<Option<::sandbox::SandboxHandle>, Error> {
        let agent = match self.sandboxes.agent(session.agent_id).await {
            Ok(agent) => agent,
            Err(Error::NotFound) => return Ok(None),
            Err(error) => return Err(error),
        };
        if agent.agent.metadata.deletion_timestamp.is_some()
            || !matches!(
                agent.agent.status.sandbox,
                Some(crate::sandbox::Assignment::Materialized { .. })
            )
        {
            return Ok(None);
        }
        let sandbox = match self.sandboxes.open(&agent).await {
            Ok(sandbox) => sandbox,
            Err(Error::Sandbox(error)) if error.is_not_found() => return Ok(None),
            Err(error) => return Err(error),
        };
        if sandbox.snapshot().state == ::sandbox::SandboxState::Stopped {
            return Ok(None);
        }
        Ok(Some(sandbox))
    }

    /// Stops the harness of an archived Session and keeps it stopped.
    ///
    /// A turn in progress is waited for, so archiving never cuts one short; a
    /// later pass retries. A turn waiting for approval is not waited for, as
    /// nobody answers an archived Session. A Sandbox that is gone, stopped or
    /// unmaterialized has no harness left to stop.
    async fn converge_archive(&self, session: &Session) -> Result<Lifecycle, Error> {
        if session.status.lifecycle.state == LifecycleState::Archived && session.status.lifecycle.failure.is_none() {
            return Ok(Lifecycle::archived());
        }
        if let Some(sandbox) = self.release_sandbox(session).await? {
            if self.mid_turn(session, &sandbox).await? {
                return Ok(session.status.lifecycle.clone());
            }
            self.runtime.stop(session, &sandbox).await?;
        }
        self.sessions.reset_session_launch_attempts(session.id).await?;
        Ok(Lifecycle::archived())
    }

    /// Whether the harness is visibly working on a turn: it reports working, or
    /// has not reported yet, is still running, and its terminal or transcript
    /// moved recently. The report alone can be stale, for example after a crash.
    ///
    /// The harness's own report decides, not the derived state, which reads
    /// Archived once an earlier archive pass has failed.
    async fn mid_turn(&self, session: &Session, sandbox: &::sandbox::SandboxHandle) -> Result<bool, Error> {
        if !matches!(session.status.reported.activity.phase, Phase::Working | Phase::Unknown) {
            return Ok(false);
        }
        let Observation::Alive { idle_seconds, .. } = self.runtime.observe(session, sandbox).await? else {
            return Ok(false);
        };
        let now = time::OffsetDateTime::now_utc().unix_timestamp();
        Ok(effective_idle_seconds(&session.status.reported.activity, idle_seconds, now) < ARCHIVE_TURN_QUIET_SECONDS)
    }

    /// Settles a Session unarchived before its archive could stop the harness:
    /// a harness still running is adopted, otherwise the Session is Idle.
    /// Nothing is launched until the next attach.
    async fn settle_unarchived(&self, session: &Session) -> Result<Lifecycle, Error> {
        if let Some(sandbox) = self.release_sandbox(session).await?
            && matches!(
                self.runtime.observe(session, &sandbox).await?,
                Observation::Alive { .. }
            )
        {
            return Ok(Lifecycle::running());
        }
        Ok(Lifecycle::idle())
    }

    async fn converge(&self, session: &Session) -> Result<Lifecycle, Error> {
        if session.activation_generation == session.observed_activation_generation {
            // An unarchived Session stays stopped, like an Idle one, until it is attached.
            match (&session.status.lifecycle.state, &session.status.lifecycle.failure) {
                (LifecycleState::Idle, _) | (LifecycleState::Archived, None) => return Ok(Lifecycle::idle()),
                (LifecycleState::Archived, Some(_)) => return self.settle_unarchived(session).await,
                _ => {}
            }
        }
        let agent = self.sandboxes.agent(session.agent_id).await?;
        if let Some(held) = launch_blocked(&agent, session) {
            return Ok(held);
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
            if session.is_deleting() {
                return self.release(&session).await;
            }
            let converged = if session.is_archived() {
                self.converge_archive(&session).await
            } else {
                self.converge(&session).await
            };
            match converged {
                Ok(lifecycle) => {
                    self.sessions
                        .update_session_lifecycle(session.id, lifecycle, session.activation_generation)
                        .await
                }
                Err(error) => {
                    let current = self.sessions.get_session(session.id).await?;
                    let lifecycle = if current.is_archived() {
                        // A failed archive stays archived, so unarchiving never relaunches the harness.
                        Lifecycle::archived_with(error.to_string())
                    } else if current.status.lifecycle.state == LifecycleState::Resuming {
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

/// Holds a Session short of launching while its Agent cannot run it.
///
/// The image ships every harness binary, so launching one convergence never installed starts a
/// process that sits at a login prompt nobody can answer and reports the Session as running.
fn launch_blocked(agent: &crate::control_plane::AgentRecord, session: &Session) -> Option<Lifecycle> {
    let installed = agent
        .agent
        .status
        .sandbox
        .as_ref()
        .and_then(crate::sandbox::Assignment::installed_harnesses);
    let reason = if agent.agent.metadata.deletion_timestamp.is_some() || !agent.agent.status.is_ready() {
        format!("Agent {:?} is not ready", agent.agent.metadata.name)
    } else if !installed.is_some_and(|installed| installed.contains(&session.harness)) {
        format!(
            "Agent {:?} does not carry harness {:?}; sign in on the host and the next Agent \
             convergence installs it",
            agent.agent.metadata.name,
            session.harness.as_str()
        )
    } else {
        return None;
    };
    Some(if session.status.lifecycle.state == LifecycleState::Resuming {
        Lifecycle::resuming_with(reason)
    } else {
        Lifecycle::starting(reason)
    })
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
