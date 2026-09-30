//! Waiting for the outcome of a request, in the client.
//!
//! A request returns once the daemon has recorded it, with the counter a wait
//! for it must see handled. The waits here follow the requested resource with
//! `resources.v1.watch`, selected by identity, and decide with the checks in
//! [`crate::wait`]: the watch is level-triggered, so a waiter can skip
//! intermediate states but never miss the one that decides. A wait reports
//! the outcome that ended it as the daemon would have, so its text and error
//! class are the same as when the daemon waited.

use std::time::Duration;

use tokio::time::Instant;

use crate::{
    Agent, AgentId, Error,
    resources::{Resources, Selector},
    sessions::{self, Session, SessionName},
    wait::{self, Expected, Settled, Turn},
};

use super::{Client, protocol::response_error};

/// Ceiling for waiting for a prompt's turn.
pub const PROMPT_TIMEOUT_MAX: Duration = Duration::from_mins(30);
/// How long a wait keeps reconnecting to a daemon that went away.
const RECONNECT_BUDGET: Duration = Duration::from_secs(10);
const RECONNECT_INTERVAL: Duration = Duration::from_millis(250);

impl Client {
    /// Requests an Agent converged, waits according to `policy`, and resolves
    /// its exact transient Execution target.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is missing or deleted, its desired
    /// state is invalid, its Sandbox is unavailable, a pass fails under
    /// [`wait::Policy::FirstPass`], or the daemon stops.
    pub async fn ensure_execution(
        &self,
        name: &str,
        policy: wait::Policy,
    ) -> Result<crate::sandbox::ExecutionTarget, Error> {
        let agent = self.sync_and_wait(name, policy).await?;
        self.execution_target(agent_id(&agent)?).await
    }

    /// Requests an Agent converged and waits according to `policy` for a
    /// pass that handled the request.
    ///
    /// # Errors
    ///
    /// As [`Self::ensure_execution`].
    pub async fn sync_and_wait(&self, name: &str, policy: wait::Policy) -> Result<Agent, Error> {
        let agent = self.get(name).await?;
        if agent.metadata.deletion_timestamp.is_some() {
            return Err(daemon_error(Error::Conflict));
        }
        let id = agent_id(&agent)?;
        let request = self.sync_agent(id).await?;
        self.wait_for_agent(id, request, policy).await
    }

    /// Waits until a pass that handled `request` left the Agent Ready.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent is deleted while waited on, its desired
    /// state is invalid, its Sandbox is unavailable, a pass fails under
    /// [`wait::Policy::FirstPass`], or the daemon stops.
    pub async fn wait_for_agent(
        &self,
        id: AgentId,
        request: wait::AgentRequest,
        policy: wait::Policy,
    ) -> Result<Agent, Error> {
        let mut watch = Watch::new(self, Selector::agent(id));
        loop {
            let agent = match watch.next().await {
                Ok(resources) => only(resources.agents, |agent| agent.metadata.uid == Some(id))?,
                Err(error) if is_not_found(&error) => return Err(daemon_error(Error::Conflict)),
                Err(error) => return Err(error),
            };
            if agent.metadata.deletion_timestamp.is_some() {
                return Err(daemon_error(Error::Conflict));
            }
            match wait::agent(&agent.status, request, policy) {
                Settled::Done => return Ok(agent),
                Settled::Failed(outcome) => return Err(daemon_error(wait::outcome_error(outcome))),
                Settled::Pending | Settled::Superseded(_) => {}
            }
        }
    }

    /// Creates or gets one named Session, waits until its harness runs, and
    /// resolves its attach target. The request also asks the Agent to
    /// converge, and the Session is held until the Agent has, so a stopped
    /// Sandbox is started before the Session launches in it.
    ///
    /// # Errors
    ///
    /// Returns an error when the request is refused, or the Session pass that
    /// handled it ended without a running harness: its Agent is invalid,
    /// being deleted or unavailable, the harness is not installed, or the
    /// launch failed.
    pub async fn ensure_session(
        &self,
        agent: &str,
        name: SessionName,
        request: sessions::SessionRequest,
    ) -> Result<sessions::AttachTarget, Error> {
        let requested = self.request_session(agent, name, request).await?;
        let session = match self.follow_session(&requested, Expected::Running).await? {
            Ended::Done(session) => session,
            Ended::Gone => return Err(daemon_error(Error::NotFound)),
            Ended::Failed(session, outcome) => return Err(daemon_error(wait::session_error(&session, outcome))),
            Ended::Superseded(session) => return Err(daemon_error(session.not_running_error())),
        };
        self.session_attach_target(session.id).await
    }

    /// Delivers a prompt to a running Session's harness. With `wait`, waits
    /// for a turn after it to complete; see [`wait::turn`]. The timeout bounds
    /// only that wait, not delivery. Conversation output is read separately
    /// with [`Self::session_turns`].
    ///
    /// # Errors
    ///
    /// Returns an error when the timeout exceeds [`PROMPT_TIMEOUT_MAX`], the
    /// Session is not running, the input cannot be delivered, the Session
    /// stops before the turn completes, or the wait times out.
    pub async fn prompt_session(
        &self,
        agent: &str,
        name: SessionName,
        prompt: String,
        wait: bool,
        timeout: Option<Duration>,
    ) -> Result<(), Error> {
        if timeout.is_some_and(|timeout| timeout > PROMPT_TIMEOUT_MAX) {
            return Err(daemon_error(Error::Invalid(format!(
                "completion timeout must not exceed {}m",
                PROMPT_TIMEOUT_MAX.as_secs() / 60
            ))));
        }
        let delivered = self.deliver_prompt(agent, name.clone(), prompt).await?;
        if !wait {
            return Ok(());
        }
        tokio::time::timeout(timeout.unwrap_or(PROMPT_TIMEOUT_MAX), self.wait_for_turn(&name, delivered))
            .await
            .map_err(|_| {
                daemon_error(Error::Session(format!(
                    "timed out waiting for Session \"{name}\" to complete; the prompt was submitted; inspect turns before retrying"
                )))
            })?
    }

    /// Requests release of one Session and waits until it is gone: its
    /// harness is stopped and its name is free again.
    ///
    /// # Errors
    ///
    /// Returns an error when either resource is missing, or the release
    /// failed; the Session stays marked and the release is retried.
    pub async fn delete_session(&self, agent: &str, name: SessionName) -> Result<(), Error> {
        let requested = self.request_session_deletion(agent, name.clone()).await?;
        match self.follow_session(&requested, Expected::Deleted).await? {
            Ended::Gone => Ok(()),
            Ended::Failed(_, outcome) => Err(daemon_error(Error::Session(format!(
                "Session \"{name}\" is marked for deletion and will be retried; stopping its harness failed: {}",
                outcome.message
            )))),
            // A deleted Session never matches, and its only final outcome is a failed release.
            Ended::Done(session) | Ended::Superseded(session) => Err(daemon_error(Error::Session(format!(
                "Session \"{name}\" is marked for deletion but reports {:?}",
                session.status.state
            )))),
        }
    }

    /// Requests one Session archived or unarchived, waits for the pass that
    /// handled it, and returns the Session as that pass left it. Archiving
    /// returns once the harness is stopping; a turn in progress finishes first.
    ///
    /// # Errors
    ///
    /// Returns an error when either resource is missing, the harness could not
    /// be stopped (the archive is retried), or a later request changed the
    /// Session first.
    pub async fn set_session_archived(&self, agent: &str, name: SessionName, archived: bool) -> Result<Session, Error> {
        let requested = self.request_session_archived(agent, name.clone(), archived).await?;
        let expected = if archived {
            Expected::Archived
        } else {
            Expected::Unarchived
        };
        match self.follow_session(&requested, expected).await? {
            Ended::Done(session) => Ok(session),
            Ended::Gone => Err(daemon_error(Error::NotFound)),
            Ended::Failed(_, outcome) => Err(daemon_error(wait::outcome_error(outcome))),
            Ended::Superseded(session) => Err(daemon_error(Error::Session(format!(
                "Session \"{name}\" was changed by a later request and is {:?}",
                session.status.state
            )))),
        }
    }

    /// Follows a Session until the pass that handled `requested` decides it.
    async fn follow_session(&self, requested: &sessions::Requested, expected: Expected) -> Result<Ended, Error> {
        let mut watch = Watch::new(self, Selector::session(requested.session.id));
        loop {
            let session = match watch.next().await {
                Ok(resources) => only(resources.sessions, |session| session.id == requested.session.id)?,
                Err(error) if is_not_found(&error) => return Ok(Ended::Gone),
                Err(error) => return Err(error),
            };
            // Only a delete waits through the deletion mark.
            if session.is_deleting() && expected != Expected::Deleted {
                return Ok(Ended::Gone);
            }
            match wait::session(&session, requested.generation, expected) {
                Settled::Pending => {}
                Settled::Done => return Ok(Ended::Done(session)),
                Settled::Failed(outcome) => return Ok(Ended::Failed(session, outcome)),
                Settled::Superseded(_) => return Ok(Ended::Superseded(session)),
            }
        }
    }

    async fn wait_for_turn(&self, name: &SessionName, delivered: sessions::Delivered) -> Result<(), Error> {
        let mut before = delivered.turns;
        let mut watch = Watch::new(self, Selector::session(delivered.session.id));
        let mut recheck = None;
        loop {
            let resources = watch.next_within(recheck).await.map_err(|error| {
                if is_not_found(&error) {
                    daemon_error(Error::NotFound)
                } else {
                    error
                }
            })?;
            let now = resources.now;
            let session = only(resources.sessions, |session| session.id == delivered.session.id)?;
            recheck = match wait::turn(&mut before, &session, now) {
                Turn::Completed => return Ok(()),
                Turn::Pending { recheck_at } => recheck_at.map(|at| (at - now).unsigned_abs()),
                Turn::Ended(sessions::State::Failed) => {
                    return Err(daemon_error(Error::Session(format!(
                        "Session \"{name}\" failed while waiting for turn completion: {}",
                        session.status.lifecycle.failure.as_deref().unwrap_or("unknown error")
                    ))));
                }
                Turn::Ended(sessions::State::Archived) => {
                    return Err(daemon_error(Error::Session(format!(
                        "Session \"{name}\" was archived while waiting for turn completion"
                    ))));
                }
                Turn::Ended(_) => {
                    return Err(daemon_error(Error::Session(format!(
                        "Session \"{name}\" was stopped while waiting for turn completion"
                    ))));
                }
            };
        }
    }
}

/// How the pass that handled a Session request decided it.
enum Ended {
    Done(Session),
    /// The Session is gone, or marked for deletion when that was not requested.
    Gone,
    Failed(Session, wait::Outcome),
    Superseded(Session),
}

/// Long-polls the selected resources from one revision to the next.
struct Watch<'a> {
    client: &'a Client,
    selector: Selector,
    after: Option<crate::resources::Revision>,
}

impl<'a> Watch<'a> {
    const fn new(client: &'a Client, selector: Selector) -> Self {
        Self {
            client,
            selector,
            after: None,
        }
    }

    /// The selected resources, at once the first time and then after the next change.
    async fn next(&mut self) -> Result<Resources, Error> {
        self.read(self.after).await
    }

    /// Like [`Self::next`], but rereads after `recheck` even when nothing changed.
    async fn next_within(&mut self, recheck: Option<Duration>) -> Result<Resources, Error> {
        let Some(recheck) = recheck else {
            return self.next().await;
        };
        let changed = tokio::select! {
            resources = self.read(self.after) => Some(resources),
            () = tokio::time::sleep(recheck) => None,
        };
        match changed {
            Some(resources) => resources,
            None => self.read(None).await,
        }
    }

    /// Reconnects to a daemon that went away for up to [`RECONNECT_BUDGET`].
    /// A reply from a new daemon process must come from this client's
    /// counterpart; the resources are then decided afresh, as their counters
    /// are durable.
    async fn read(&mut self, after: Option<crate::resources::Revision>) -> Result<Resources, Error> {
        let started = Instant::now();
        loop {
            match self.client.watch(after, self.selector).await {
                Ok(resources) => {
                    if self.after.is_some_and(|seen| !seen.same_history(&resources.revision)) {
                        self.client.require_compatible_daemon().await?;
                    }
                    self.after = Some(resources.revision);
                    return Ok(resources);
                }
                Err(Error::Io(_)) if started.elapsed() < RECONNECT_BUDGET => {
                    tokio::time::sleep(RECONNECT_INTERVAL).await;
                }
                Err(Error::Io(_)) => {
                    return Err(Error::Daemon("agentd stopped while this command was waiting".into()));
                }
                Err(error) => return Err(error),
            }
        }
    }
}

fn agent_id(agent: &Agent) -> Result<AgentId, Error> {
    agent
        .metadata
        .uid
        .ok_or_else(|| Error::Invalid("agentd did not report the Agent's identity".into()))
}

/// The single resource a selector named, which must be the one selected.
fn only<T>(resources: Vec<T>, selected: impl Fn(&T) -> bool) -> Result<T, Error> {
    let mut resources = resources.into_iter();
    match (resources.next(), resources.next()) {
        (Some(resource), None) if selected(&resource) => Ok(resource),
        _ => Err(Error::Invalid("invalid Agent Control API response".into())),
    }
}

const fn is_not_found(error: &Error) -> bool {
    matches!(error, Error::Rpc(error) if error.is_not_found())
}

/// Reports an error decided by the client as the daemon reports it.
fn daemon_error(error: Error) -> Error {
    Error::Rpc(response_error(error))
}
