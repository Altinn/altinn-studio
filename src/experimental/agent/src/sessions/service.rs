//! User-facing Session operations coordinated with the reconciler.

use std::{cell::RefCell, collections::HashMap, rc::Rc, time::Duration};

use ::sandbox::SandboxHandle;
use tokio::sync::Notify;

use crate::{Error, Harness, control_plane, control_plane::WaitPolicy, progress::Reporter};

use super::{
    AgentSandboxes, AttachTarget, LifecycleState, Session, SessionId, SessionName, SessionRuntime, SharedStore, State,
    Turn, Wakeup,
};

/// Ceiling for completion waiting after prompt submission.
const PROMPT_TIMEOUT_MAX: Duration = Duration::from_mins(30);

/// Polls durable activity while a caller waits for completion.
const ACTIVITY_POLL: Duration = Duration::from_millis(250);

/// Maximum time to wait for a newly launched harness to accept input.
const INPUT_READY_TIMEOUT: Duration = Duration::from_secs(15);
const INPUT_READY_POLL: Duration = Duration::from_millis(100);

/// Durable Session registry whose effects are owned by the daemon controller.
pub struct Service {
    store: SharedStore,
    sandboxes: Rc<AgentSandboxes>,
    runtime: Rc<dyn SessionRuntime>,
    convergence: control_plane::Convergence,
    wakeup: Wakeup,
    /// Sessions with a delivery in flight, each with the signal its waiters
    /// sleep on. Two concurrent prompts would interleave their keystrokes in
    /// the harness's single input line, so deliveries are serialized per Session.
    deliveries: RefCell<HashMap<SessionId, Rc<Notify>>>,
}

/// Marks one Session busy delivering for as long as it lives; dropping it,
/// including on cancellation, releases the Session and wakes the next sender.
struct Delivering<'a> {
    deliveries: &'a RefCell<HashMap<SessionId, Rc<Notify>>>,
    session: SessionId,
}

impl<'a> Delivering<'a> {
    async fn acquire(deliveries: &'a RefCell<HashMap<SessionId, Rc<Notify>>>, session: SessionId) -> Self {
        loop {
            let busy = {
                let mut map = deliveries.borrow_mut();
                if let Some(released) = map.get(&session) {
                    released.clone()
                } else {
                    map.insert(session, Rc::new(Notify::new()));
                    break;
                }
            };
            busy.notified().await;
        }
        Self { deliveries, session }
    }
}

impl Drop for Delivering<'_> {
    fn drop(&mut self) {
        if let Some(released) = self.deliveries.borrow_mut().remove(&self.session) {
            released.notify_waiters();
        }
    }
}

impl Service {
    /// Creates a Session service over durable storage, Agent Sandboxes,
    /// Agent convergence and the Session controller.
    #[must_use]
    pub fn new(
        store: SharedStore,
        sandboxes: Rc<AgentSandboxes>,
        runtime: Rc<dyn SessionRuntime>,
        convergence: control_plane::Convergence,
        wakeup: Wakeup,
    ) -> Self {
        Self {
            store,
            sandboxes,
            runtime,
            convergence,
            wakeup,
            deliveries: RefCell::default(),
        }
    }

    /// Creates or gets one named Session and waits until its driver is ready.
    ///
    /// `initial_prompt` is recorded only when this call creates the Session;
    /// the reconciler hands it to the harness at its first launch, so the
    /// harness starts working before this call returns.
    ///
    /// # Errors
    ///
    /// Returns an error when persistence fails or the Agent is invalid; with
    /// [`WaitPolicy::FirstPass`] also when the single Agent pass fails.
    pub async fn ensure(
        &self,
        agent: &str,
        name: &SessionName,
        requested_harness: Option<Harness>,
        initial_prompt: Option<&str>,
        wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> Result<AttachTarget, Error> {
        let (owner, session) = self.prepare(agent, name, requested_harness, initial_prompt).await?;
        self.convergence.converge(owner.id, wait, progress.as_ref()).await?;
        self.wakeup.reconcile(session.id).await?;
        self.store.session_attach_target(session.id).await
    }

    /// Delivers a prompt to a running Session's harness.
    ///
    /// With `wait`, snapshots the completed-turn counter before delivery and
    /// waits for it to advance with identical waiting activity in two consecutive
    /// polls, 250 ms apart. Work observed during settling requires another
    /// completion. This is a timing heuristic, not identification of an answer
    /// to this prompt.
    /// Read the conversation separately with [`Self::turns`].
    ///
    /// In both modes delivery waits for input readiness. The runtime may establish
    /// readiness before the harness reports its first conversation. The completion
    /// timeout starts after submission; queuing, readiness and delivery are excluded.
    /// Activity is polled from the local database every 250 ms.
    ///
    /// # Errors
    ///
    /// Returns an error when the Session is not running, the harness has not
    /// become ready for input within a short grace period, the input cannot be
    /// delivered, the Session fails mid-turn, or the wait exceeds `timeout`.
    pub async fn prompt(
        &self,
        agent: &str,
        name: &SessionName,
        prompt: &str,
        wait: bool,
        timeout: Option<Duration>,
    ) -> Result<(), Error> {
        let (session, sandbox) = self.open_running(agent, name).await?;
        let id = session.id;
        let delivering = Delivering::acquire(&self.deliveries, id).await;
        let session = self.ready_to_prompt(id, name, &sandbox).await?;
        let completed_before = session.status.reported.activity.turns;
        self.runtime.prompt(&session, &sandbox, prompt).await?;
        drop(delivering);
        if !wait {
            return Ok(());
        }
        tokio::time::timeout(
            timeout.unwrap_or(PROMPT_TIMEOUT_MAX).min(PROMPT_TIMEOUT_MAX),
            self.wait_for_completion(id, name, completed_before),
        ).await.map_err(|_| Error::Session(format!(
            "timed out waiting for Session \"{name}\" to complete; the prompt was submitted; inspect turns before retrying"
        )))?
    }

    async fn wait_for_completion(
        &self,
        id: SessionId,
        name: &SessionName,
        mut completed_before: u64,
    ) -> Result<(), Error> {
        let mut settling = None;
        loop {
            let current = self.store.get_session(id).await?;
            match current.status.state {
                State::Failed => {
                    return Err(Error::Session(format!(
                        "Session \"{name}\" failed while waiting for turn completion: {}",
                        current.status.lifecycle.failure.as_deref().unwrap_or("unknown error")
                    )));
                }
                State::Idle => {
                    return Err(Error::Session(format!(
                        "Session \"{name}\" was stopped while waiting for turn completion"
                    )));
                }
                State::Starting | State::Working | State::WaitingForInput => {}
            }
            let activity = &current.status.reported.activity;
            if activity.turns > completed_before && current.status.state == State::WaitingForInput {
                if settling.as_ref() == Some(activity) {
                    return Ok(());
                }
                settling = Some(activity.clone());
            } else {
                // A new turn can already be running when the previous completion
                // is observed. Its permission waits must not satisfy this wait.
                completed_before = completed_before.max(activity.turns);
                settling = None;
            }
            tokio::time::sleep(ACTIVITY_POLL).await;
        }
    }

    /// Waits for a report or runtime-observed input readiness. A harness may
    /// create its conversation only after input arrives, so the first prompt
    /// cannot depend on that conversation's start report.
    async fn ready_to_prompt(
        &self,
        id: SessionId,
        name: &SessionName,
        sandbox: &SandboxHandle,
    ) -> Result<Session, Error> {
        tokio::time::timeout(INPUT_READY_TIMEOUT, async {
            loop {
                let session = self.store.get_session(id).await?;
                match session.status.state {
                    State::Working | State::WaitingForInput => return Ok(session),
                    State::Idle | State::Failed => {
                        return Err(session.not_running_error());
                    }
                    State::Starting => {
                        if self.runtime.input_ready(&session, sandbox).await? {
                            return Ok(session);
                        }
                    }
                }
                tokio::time::sleep(INPUT_READY_POLL).await;
            }
        })
        .await
        .map_err(|_| Error::Session(format!("timed out waiting for Session \"{name}\" to accept input")))?
    }

    /// Reads the Session's conversation as ordered turns, optionally the last `last`.
    ///
    /// # Errors
    ///
    /// Returns an error when the Session or its Sandbox is unavailable or the
    /// conversation cannot be read.
    pub async fn turns(&self, agent: &str, name: &SessionName, last: Option<usize>) -> Result<Vec<Turn>, Error> {
        let session = self.store.get_agent_session(agent, name).await?;
        let owner = self.sandboxes.agent(session.agent_id).await?;
        let sandbox = self.sandboxes.open(&owner).await?;
        let session = self.store.get_session(session.id).await?;
        let mut turns = self.runtime.turns(&session, &sandbox).await?;
        if let Some(last) = last
            && turns.len() > last
        {
            turns.drain(0..turns.len() - last);
        }
        Ok(turns)
    }

    async fn open_running(&self, agent: &str, name: &SessionName) -> Result<(Session, SandboxHandle), Error> {
        let session = self.store.get_agent_session(agent, name).await?;
        if session.status.lifecycle.state != LifecycleState::Running {
            return Err(session.not_running_error());
        }
        let owner = self.sandboxes.agent(session.agent_id).await?;
        let sandbox = self.sandboxes.open(&owner).await?;
        Ok((session, sandbox))
    }

    async fn prepare(
        &self,
        agent: &str,
        name: &SessionName,
        requested_harness: Option<Harness>,
        initial_prompt: Option<&str>,
    ) -> Result<(control_plane::AgentRecord, Session), Error> {
        let owner = self.sandboxes.agent_by_name(agent).await?;
        if owner.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        if let Some(harness) = requested_harness
            && owner.agent.spec.harness(harness).is_none()
        {
            return Err(Error::Invalid(format!(
                "Agent {agent:?} does not declare harness {:?}",
                harness.as_str()
            )));
        }
        let session = match self.store.get_agent_session(agent, name).await {
            Ok(session) => {
                if let Some(harness) = requested_harness
                    && harness != session.harness
                {
                    return Err(Error::Invalid(format!(
                        "Session \"{name}\" already uses harness {:?}, not {:?}",
                        session.harness.as_str(),
                        harness.as_str()
                    )));
                }
                session
            }
            Err(Error::NotFound) => {
                let harness = requested_harness
                    .or_else(|| owner.agent.spec.default_harness().map(|installation| installation.kind))
                    .ok_or_else(|| Error::Invalid(format!("Agent {agent:?} has no default harness")))?;
                self.store.ensure_session(agent, name, harness, initial_prompt).await?
            }
            Err(error) => return Err(error),
        };
        if session.agent_id != owner.id {
            return Err(Error::Conflict);
        }
        self.store.activate_session(session.id).await?;
        Ok((owner, session))
    }

    /// Gets one durable Session from the active Agent incarnation.
    ///
    /// # Errors
    ///
    /// Returns an error when either resource is missing or persistent state cannot be read.
    pub async fn get(&self, agent: &str, name: &SessionName) -> Result<Session, Error> {
        self.store.get_agent_session(agent, name).await
    }

    /// Lists durable Sessions, optionally scoped to one active Agent incarnation.
    ///
    /// # Errors
    ///
    /// Returns an error when the scoped Agent is missing or persistent state cannot be read.
    pub async fn list(&self, agent: Option<&str>) -> Result<Vec<Session>, Error> {
        if let Some(agent) = agent {
            self.sandboxes.agent_by_name(agent).await?;
            self.store.list_agent_sessions(agent).await
        } else {
            self.store.list_all_sessions().await
        }
    }
}
