//! User-facing Session operations coordinated with the reconciler.

use std::{
    cell::{Cell, RefCell},
    collections::HashMap,
    rc::Rc,
    time::Duration,
};

use ::sandbox::SandboxHandle;
use tokio::sync::Notify;

use crate::{Error, Harness, control_plane, control_plane::WaitPolicy, progress::Reporter};

use super::{
    AgentSandboxes, AttachTarget, LifecycleState, Session, SessionId, SessionName, SessionObservers, SessionRuntime,
    SharedStore, State, Turn, Wakeup,
};

/// Ceiling for a single waited prompt; the caller may request a shorter one.
const PROMPT_TIMEOUT_MAX: Duration = Duration::from_mins(30);

/// Gives queued work and transcript writes a short window after completion.
const COMPLETION_SETTLE: Duration = Duration::from_millis(200);

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
    observers: SessionObservers,
    /// Sessions with a delivery in flight, each with the signal its waiters
    /// sleep on. Two concurrent prompts would interleave their keystrokes in
    /// the harness's single input line, so deliveries are serialized per Session.
    deliveries: Rc<RefCell<HashMap<SessionId, Rc<Notify>>>>,
}

/// Marks one Session busy delivering for as long as it lives; dropping it,
/// including on cancellation, releases the Session and wakes the next sender.
struct Delivering {
    deliveries: Rc<RefCell<HashMap<SessionId, Rc<Notify>>>>,
    session: SessionId,
}

impl Delivering {
    async fn acquire(deliveries: &Rc<RefCell<HashMap<SessionId, Rc<Notify>>>>, session: SessionId) -> Self {
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
        Self {
            deliveries: deliveries.clone(),
            session,
        }
    }
}

impl Drop for Delivering {
    fn drop(&mut self) {
        if let Some(released) = self.deliveries.borrow_mut().remove(&self.session) {
            released.notify_waiters();
        }
    }
}

impl Service {
    /// Creates a Session service over durable storage (which must publish its
    /// changes to `observers`), Agent Sandboxes, Agent convergence and the
    /// Session controller.
    #[must_use]
    pub fn new(
        store: SharedStore,
        sandboxes: Rc<AgentSandboxes>,
        runtime: Rc<dyn SessionRuntime>,
        convergence: control_plane::Convergence,
        wakeup: Wakeup,
        observers: SessionObservers,
    ) -> Self {
        Self {
            store,
            sandboxes,
            runtime,
            convergence,
            wakeup,
            observers,
            deliveries: Rc::default(),
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
    /// waits for it to advance and activity to settle for 200 ms. Work observed
    /// during settling requires another completion. This is a timing heuristic,
    /// not identification of an answer to this prompt.
    /// Read the conversation separately with [`Self::turns`].
    ///
    /// In both modes delivery waits for input readiness. The runtime may establish
    /// readiness before the harness reports its first conversation.
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
        let deadline = tokio::time::Instant::now() + timeout.unwrap_or(PROMPT_TIMEOUT_MAX).min(PROMPT_TIMEOUT_MAX);
        let delivery_started = Rc::new(Cell::new(false));
        tokio::time::timeout_at(
            deadline,
            self.prompt_until(agent, name, prompt, wait, deadline, delivery_started.clone()),
        )
        .await
        .map_err(|_| {
            Error::Session(if delivery_started.get() {
                format!(
                    "timed out prompting Session {name:?}; delivery may have started; inspect turns before retrying"
                )
            } else {
                format!("timed out prompting Session {name:?} before delivery")
            })
        })?
    }

    async fn prompt_until(
        &self,
        agent: &str,
        name: &SessionName,
        prompt: &str,
        wait: bool,
        deadline: tokio::time::Instant,
        delivery_started: Rc<Cell<bool>>,
    ) -> Result<(), Error> {
        let (session, sandbox) = self.open_running(agent, name).await?;
        let id = session.id;
        let sandbox = Rc::new(sandbox);
        let delivering = Delivering::acquire(&self.deliveries, session.id).await;
        // Subscribe before reading so no change can slip between them.
        let mut changes = self.observers.subscribe(session.id);
        let session = self.ready_to_prompt(id, name, &sandbox, &mut changes, deadline).await?;
        let mut completed_before = session.status.reported.activity.turns;
        if tokio::time::Instant::now() >= deadline {
            return Err(Error::Session("timed out before prompt delivery".into()));
        }
        let runtime = self.runtime.clone();
        let delivery_sandbox = sandbox.clone();
        let input = prompt.to_owned();
        delivery_started.set(true);
        // A caller deadline must not release serialization while the runtime
        // is still submitting staged input or recovering a partial delivery.
        tokio::task::spawn_local(async move {
            let _delivering = delivering;
            runtime.prompt(&session, &delivery_sandbox, &input, deadline).await
        })
        .await
        .map_err(|error| Error::Session(format!("prompt delivery task failed: {error}")))??;
        if !wait {
            return Ok(());
        }

        let mut settling = None;
        loop {
            let current = self.store.get_session(id).await?;
            match current.status.state {
                State::Failed => {
                    return Err(Error::Session(format!(
                        "Session {name:?} failed while waiting for turn completion: {}",
                        current.status.lifecycle.failure.as_deref().unwrap_or("unknown error")
                    )));
                }
                State::Idle => {
                    return Err(Error::Session(format!(
                        "Session {name:?} was stopped while waiting for turn completion"
                    )));
                }
                State::Starting | State::Working | State::WaitingForInput => {}
            }
            let activity = &current.status.reported.activity;
            let wake_at = if activity.turns > completed_before && current.status.state == State::WaitingForInput {
                let (observed, until) =
                    settling.get_or_insert_with(|| (activity.clone(), tokio::time::Instant::now() + COMPLETION_SETTLE));
                if observed != activity {
                    *observed = activity.clone();
                    *until = tokio::time::Instant::now() + COMPLETION_SETTLE;
                }
                if tokio::time::Instant::now() >= *until {
                    return Ok(());
                }
                *until
            } else {
                // A new turn can already be running when the previous completion
                // is observed. Its permission waits must not satisfy this wait.
                completed_before = completed_before.max(activity.turns);
                settling = None;
                deadline
            };
            tokio::select! {
                result = changes.changed() => result.map_err(|_| Error::Session(format!(
                    "Session {name:?} change feed closed"
                )))?,
                () = tokio::time::sleep_until(wake_at) => {},
            }
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
        changes: &mut tokio::sync::watch::Receiver<u64>,
        deadline: tokio::time::Instant,
    ) -> Result<Session, Error> {
        let ready_deadline = (tokio::time::Instant::now() + INPUT_READY_TIMEOUT).min(deadline);
        tokio::time::timeout_at(ready_deadline, async {
            loop {
                let session = self.store.get_session(id).await?;
                match session.status.state {
                    State::Working | State::WaitingForInput => return Ok(session),
                    State::Idle | State::Failed => {
                        return Err(Error::Invalid(format!("Session {name:?} is not running")));
                    }
                    State::Starting => {
                        if self.runtime.input_ready(&session, sandbox).await? {
                            return Ok(session);
                        }
                    }
                }
                // Runtime readiness can change before any report exists.
                tokio::select! {
                    result = changes.changed() => result.map_err(|_| Error::Session("Session observer closed".into()))?,
                    () = tokio::time::sleep(INPUT_READY_POLL) => {},
                }
            }
        })
        .await
        .map_err(|_| Error::Session(format!("timed out waiting for Session {name:?} to accept input")))?
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
            return Err(Error::Invalid(format!("Session {name:?} is not running")));
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
                        "Session {name:?} already uses harness {:?}, not {:?}",
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
