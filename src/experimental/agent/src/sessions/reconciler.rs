//! At-least-once convergence of one durable Session.

use std::rc::Rc;

use ::sandbox::LocalFuture;

use crate::{ConditionStatus, Error, control_plane::AgentStore};

use super::{LaunchRecord, LaunchToken, Session, SessionId, SharedStore, State, Status, tmux};

/// A launch is considered healthy after surviving this long, resetting backoff.
const HEALTHY_AFTER_SECONDS: i64 = 60;

/// Longest wait between relaunches of a repeatedly exiting harness.
const MAX_BACKOFF_SECONDS: i64 = 600;

/// Stop an unattached harness after five minutes without terminal activity.
const IDLE_AFTER_SECONDS: u64 = 5 * 60;

/// Converges persistent Sessions onto the tmux runtime in their Agent's Sandbox.
pub struct Reconciler {
    sessions: SharedStore,
    agents: Rc<dyn AgentStore>,
    sandboxes: Rc<crate::sandbox::Service>,
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
        agents: Rc<dyn AgentStore>,
        sandboxes: Rc<crate::sandbox::Service>,
        session_hook_url: String,
    ) -> Self {
        Self {
            sessions,
            agents,
            sandboxes,
            session_hook_url,
        }
    }

    async fn converge(&self, session: &Session) -> Result<Status, Error> {
        if session.status.state == State::Idle
            && session.activation_generation == session.observed_activation_generation
        {
            return Ok(idle());
        }
        let agent = self.agents.get(session.agent_id).await?;
        if agent.agent.metadata.deletion_timestamp.is_some()
            || !agent
                .agent
                .status
                .conditions
                .iter()
                .any(|condition| condition.kind == "Ready" && condition.status == ConditionStatus::True)
            || !matches!(
                agent.agent.status.sandbox,
                Some(crate::sandbox::Assignment::Materialized { .. })
            )
        {
            return Ok(Status {
                state: State::Starting,
                failure: Some(format!("Agent {:?} is not ready", agent.agent.metadata.name)),
                harness_session_id: None,
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

        if let tmux::Observation::Alive { attached, idle_seconds } = tmux::observe(session, &sandbox).await? {
            if !attached && idle_seconds >= IDLE_AFTER_SECONDS {
                tmux::stop(session, &sandbox).await?;
                self.sessions.reset_session_launch_attempts(session.id).await?;
                return Ok(idle());
            }
            if let Some(state) = &launch
                && state.attempts > 0
                && now - state.launched_at >= HEALTHY_AFTER_SECONDS
            {
                self.sessions.reset_session_launch_attempts(session.id).await?;
            }
            return Ok(running());
        }

        let mut attempts = 0;
        let mut resume = session.status.harness_session_id.clone();
        if let Some(state) = launch {
            if state.sandbox == sandbox_id {
                attempts = state.attempts;
                let wait = backoff_seconds(attempts);
                if attempts > 0 && now < state.launched_at + wait {
                    return Ok(Status {
                        state: State::Failed,
                        failure: Some(format!("harness exited; relaunching after up to {wait}s of backoff")),
                        harness_session_id: None,
                    });
                }
            } else {
                // The Sandbox was replaced, and the harness conversation state
                // lived inside it. Start a fresh conversation instead of
                // resuming an ID whose files no longer exist.
                resume = None;
                attempts = 0;
                self.sessions.set_session_native_id(session.id, None).await?;
            }
        }
        let token = LaunchToken::generate();
        self.sessions
            .record_session_launch(
                session.id,
                LaunchRecord {
                    token: token.clone(),
                    sandbox: sandbox_id,
                    launched_at: now,
                    attempts: attempts + 1,
                },
            )
            .await?;
        tmux::create(session, &sandbox, &self.session_hook_url, &token, resume.as_deref()).await?;
        Ok(running())
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
            match self.converge(&session).await {
                Ok(status) => {
                    self.sessions
                        .update_session_status(session.id, status, session.activation_generation)
                        .await
                }
                Err(error) => {
                    self.sessions
                        .update_session_status(
                            session.id,
                            Status {
                                state: State::Failed,
                                failure: Some(error.to_string()),
                                harness_session_id: None,
                            },
                            session.activation_generation,
                        )
                        .await?;
                    Err(error)
                }
            }
        })
    }
}

const fn running() -> Status {
    Status {
        state: State::Running,
        failure: None,
        // Preserved by the store; owned by the authenticated Session hook handler.
        harness_session_id: None,
    }
}

const fn idle() -> Status {
    Status {
        state: State::Idle,
        failure: None,
        harness_session_id: None,
    }
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
