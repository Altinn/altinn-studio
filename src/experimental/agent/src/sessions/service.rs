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
    AgentSandboxes, AttachTarget, LifecycleState, Part, Role, Session, SessionId, SessionName, SessionObservers,
    SessionRuntime, SharedStore, State, Turn, Wakeup,
};

/// Ceiling for a single waited prompt; the caller may request a shorter one.
const ANSWER_WAIT_MAX: Duration = Duration::from_mins(30);

/// Re-read gap while waiting for the harness to flush its final message after
/// the turn-complete signal, and the window after which an unanswered
/// completion is taken to belong to an earlier turn.
const TRANSCRIPT_FLUSH_POLL: Duration = Duration::from_millis(300);
const TRANSCRIPT_SETTLE: Duration = Duration::from_secs(2);

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
    /// With `wait`, blocks until the conversation contains the prompt with an
    /// assistant final message after it, and returns the turns from the one
    /// holding the prompt onward, so an orchestrator gets the answer in one
    /// call. Harnesses treat input delivered mid-turn differently (some steer
    /// the running turn, others queue it as the next turn); matching the prompt
    /// by content covers both. Without `wait`, returns immediately with no turns.
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
    ) -> Result<Vec<Turn>, Error> {
        let deadline = tokio::time::Instant::now() + timeout.unwrap_or(ANSWER_WAIT_MAX).min(ANSWER_WAIT_MAX);
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
    ) -> Result<Vec<Turn>, Error> {
        let (session, sandbox) = self.open_running(agent, name).await?;
        let sandbox = Rc::new(sandbox);
        let delivering = Delivering::acquire(&self.deliveries, session.id).await;
        // Subscribe before reading so no change can slip between them.
        let mut changes = self.observers.subscribe(session.id);
        let session = self
            .ready_to_prompt(agent, name, &sandbox, &mut changes, deadline)
            .await?;
        // Snapshot the open turn while delivery is serialized. Only user parts
        // appended after this boundary can belong to this invocation.
        let baseline = self.runtime.turns(&session, &sandbox).await?;
        let boundary = PromptBoundary::after(&baseline);
        let mut completed_before = session.status.reported.activity.turns;
        if tokio::time::Instant::now() >= deadline {
            return Err(Error::Session("timed out before prompt delivery".into()));
        }
        let runtime = self.runtime.clone();
        let delivery_sandbox = sandbox.clone();
        let input = prompt.to_owned();
        delivery_started.set(true);
        // A caller deadline must not release serialization while external input
        // delivery is still being cancelled. The runtime owns that cleanup.
        tokio::task::spawn_local(async move {
            let _delivering = delivering;
            runtime.prompt(&session, &delivery_sandbox, &input, deadline).await
        })
        .await
        .map_err(|error| Error::Session(format!("prompt delivery task failed: {error}")))??;
        if !wait {
            return Ok(Vec::new());
        }

        loop {
            let current = self.store.get_agent_session(agent, name).await?;
            match current.status.state {
                State::Failed => {
                    return Err(Error::Session(format!(
                        "Session {name:?} failed while waiting for the answer: {}",
                        current.status.lifecycle.failure.as_deref().unwrap_or("unknown error")
                    )));
                }
                State::Idle => {
                    return Err(Error::Session(format!(
                        "Session {name:?} was stopped while waiting for the answer"
                    )));
                }
                State::Starting | State::Working | State::WaitingForInput => {}
            }
            let activity = &current.status.reported.activity;
            if activity.turns > completed_before && current.status.state == State::WaitingForInput {
                if let Some(turns) = self
                    .answered_turns(agent, name, &sandbox, prompt, boundary, deadline)
                    .await?
                {
                    return Ok(turns);
                }
                // The completed turn was not the one answering this prompt
                // (queued input starts the next turn); wait for that one.
                completed_before = activity.turns;
            }
            await_change(name, &mut changes, deadline, "to answer").await?;
        }
    }

    /// Waits for a report or runtime-observed input readiness. A harness may
    /// create its conversation only after input arrives, so the first prompt
    /// cannot depend on that conversation's start report.
    async fn ready_to_prompt(
        &self,
        agent: &str,
        name: &SessionName,
        sandbox: &SandboxHandle,
        changes: &mut tokio::sync::watch::Receiver<u64>,
        deadline: tokio::time::Instant,
    ) -> Result<Session, Error> {
        let ready_deadline = (tokio::time::Instant::now() + INPUT_READY_TIMEOUT).min(deadline);
        tokio::time::timeout_at(ready_deadline, async {
            loop {
                let session = self.store.get_agent_session(agent, name).await?;
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

    /// After a turn completed, reads the conversation and returns the turns from
    /// the one holding `prompt` onward once that turn answers it, or `None` when
    /// the completed turn was not the answer.
    ///
    /// Only input appended after `boundary` counts, and only while the
    /// Session is still waiting for input on the same read: a queued prompt
    /// that has just started its own turn writes commentary after the prompt,
    /// and that is not an answer. The completion signal can fire a moment
    /// before the harness flushes its final message, so this re-reads briefly
    /// (bounded by the settle window and `deadline`) before concluding.
    async fn answered_turns(
        &self,
        agent: &str,
        name: &SessionName,
        sandbox: &SandboxHandle,
        prompt: &str,
        boundary: PromptBoundary,
        deadline: tokio::time::Instant,
    ) -> Result<Option<Vec<Turn>>, Error> {
        let settle_until = (tokio::time::Instant::now() + TRANSCRIPT_SETTLE).min(deadline);
        loop {
            let session = self.store.get_agent_session(agent, name).await?;
            let mut turns = self.runtime.turns(&session, sandbox).await?;
            if session.status.state != State::WaitingForInput {
                return Ok(None);
            }
            let start = boundary.turn.min(turns.len());
            if let Some(offset) = turns[start..].iter().enumerate().position(|(offset, turn)| {
                answers(
                    turn,
                    prompt,
                    if start + offset == boundary.turn {
                        boundary.parts
                    } else {
                        0
                    },
                )
            }) {
                return Ok(Some(turns.split_off(start + offset)));
            }
            if tokio::time::Instant::now() >= settle_until {
                return Ok(None);
            }
            tokio::time::sleep(TRANSCRIPT_FLUSH_POLL).await;
        }
    }

    /// Reads the Session's conversation as ordered turns, optionally the last `last`.
    ///
    /// # Errors
    ///
    /// Returns an error when the Session or its Sandbox is unavailable or the
    /// conversation cannot be read.
    pub async fn turns(&self, agent: &str, name: &SessionName, last: Option<usize>) -> Result<Vec<Turn>, Error> {
        let session = self.store.get_agent_session(agent, name).await?;
        let (_, sandbox) = self.sandboxes.open_by_name(agent).await?;
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
        let (_, sandbox) = self.sandboxes.open_by_name(agent).await?;
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

/// Waits for the next durable change to the Session, or fails at `deadline`.
async fn await_change(
    name: &SessionName,
    changes: &mut tokio::sync::watch::Receiver<u64>,
    deadline: tokio::time::Instant,
    waiting_for: &str,
) -> Result<(), Error> {
    tokio::select! {
        outcome = changes.changed() => {
            if outcome.is_err() {
                return Err(Error::Session(format!("Session {name:?} change feed closed")));
            }
            Ok(())
        }
        () = tokio::time::sleep_until(deadline) => Err(Error::Session(format!(
            "timed out waiting for Session {name:?} {waiting_for}"
        ))),
    }
}

/// The position immediately after the transcript's last existing content part.
#[derive(Clone, Copy)]
struct PromptBoundary {
    turn: usize,
    parts: usize,
}

impl PromptBoundary {
    fn after(turns: &[Turn]) -> Self {
        Self {
            turn: turns.len().saturating_sub(1),
            parts: turns
                .last()
                .map_or(0, |turn| turn.messages.iter().map(|message| message.parts.len()).sum()),
        }
    }
}

/// Whether `turn` contains the operator `prompt` and an assistant final
/// message after it: assistant text after the prompt with no tool call
/// following, so commentary before a tool call and answers to earlier input do
/// not count.
fn answers(turn: &Turn, prompt: &str, skip_parts: usize) -> bool {
    let wanted = prompt.trim();
    let mut seen = false;
    let mut answered = false;
    for part in turn
        .messages
        .iter()
        .flat_map(|entry| entry.parts.iter().map(move |part| (entry.role, part)))
        .skip(skip_parts)
    {
        match part {
            (Role::User, Part::Text { text }) if text.trim() == wanted => {
                seen = true;
                answered = false;
            }
            (Role::Assistant, Part::Text { .. }) if seen => answered = true,
            (Role::Assistant, Part::ToolCall { .. }) => answered = false,
            _ => {}
        }
    }
    answered
}

#[cfg(test)]
mod tests {
    use super::answers;
    use crate::sessions::{Message, Part, Role, Turn};

    fn user(text: &str) -> Message {
        Message {
            role: Role::User,
            parts: vec![Part::Text { text: text.into() }],
        }
    }

    fn assistant(parts: Vec<Part>) -> Message {
        Message {
            role: Role::Assistant,
            parts,
        }
    }

    fn text(value: &str) -> Part {
        Part::Text { text: value.into() }
    }

    fn tool() -> Part {
        Part::ToolCall {
            name: "Bash".into(),
            failed: false,
        }
    }

    #[test]
    fn a_turn_answers_when_final_text_follows_the_prompt() {
        let queued = Turn {
            messages: vec![user("second"), assistant(vec![text("working"), tool(), text("2")])],
        };
        assert!(
            answers(&queued, "second\n", 0),
            "trailing newline from a file is not a difference"
        );
        assert!(!answers(&queued, "first", 0), "another turn's prompt");

        let steered = Turn {
            messages: vec![
                user("first"),
                assistant(vec![text("1")]),
                user("second"),
                assistant(vec![text("2")]),
            ],
        };
        assert!(answers(&steered, "second", 0));
        assert!(answers(&steered, "first", 0), "the earlier input is also answered");
    }

    #[test]
    fn a_turn_does_not_answer_yet_while_a_tool_call_or_nothing_follows() {
        let pending = Turn {
            messages: vec![
                user("first"),
                assistant(vec![text("1")]),
                user("second"),
                assistant(vec![tool()]),
            ],
        };
        assert!(
            !answers(&pending, "second", 0),
            "steered input is still being worked on"
        );
        let unflushed = Turn {
            messages: vec![user("second")],
        };
        assert!(!answers(&unflushed, "second", 0));
        let earlier_answer_only = Turn {
            messages: vec![user("first"), assistant(vec![text("1")]), user("second")],
        };
        assert!(
            !answers(&earlier_answer_only, "second", 0),
            "text before the prompt is not its answer"
        );
    }
}
