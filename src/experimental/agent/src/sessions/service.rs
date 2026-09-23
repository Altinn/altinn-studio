//! User-facing Session operations coordinated with the reconciler.

use std::{cell::RefCell, collections::HashMap, rc::Rc, time::Duration};

use ::sandbox::SandboxHandle;
use tokio::sync::Notify;

use crate::{Error, control_plane, control_plane::WaitPolicy, progress::Reporter};

use super::{
    AgentSandboxes, AttachTarget, LifecycleState, NewSession, Session, SessionId, SessionName, SessionRequest,
    SessionRuntime, SharedStore, State, Turn, Wakeup,
};

/// Ceiling for completion waiting after prompt submission.
const PROMPT_TIMEOUT_MAX: Duration = Duration::from_mins(30);

/// Polls durable activity while a caller waits for completion.
const ACTIVITY_POLL: Duration = Duration::from_millis(250);

/// Maximum time to wait for a newly launched harness to accept input.
const INPUT_READY_TIMEOUT: Duration = Duration::from_secs(15);
const INPUT_READY_POLL: Duration = Duration::from_millis(100);
const UPGRADE_SESSION_PASS_TIMEOUT: Duration = Duration::from_mins(1);
const UPGRADE_SANDBOX_INSPECTION_TIMEOUT: Duration = Duration::from_secs(5);

/// Sessions that block an upgrade and Sessions that will restart without resumption.
#[derive(Debug, Default, Eq, PartialEq)]
pub struct UpgradeReadiness {
    /// Active work or attachments that make the transition unsafe.
    pub blockers: Vec<String>,
    /// Quiescent Sessions without a harness-native conversation to resume.
    pub warnings: Vec<String>,
}

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
    /// `request` applies only when this call creates the Session. Its harness,
    /// model and effort resolve in that order of precedence: the explicit
    /// request, then the selected installation's manifest defaults, then the
    /// harness's own defaults; the resolved values are recorded with the
    /// Session. The initial prompt is handed to the harness at its first
    /// launch, so the harness starts working before this call returns.
    ///
    /// # Errors
    ///
    /// Returns an error when persistence fails, the Agent is invalid, or an
    /// explicit selection conflicts with an existing Session; with
    /// [`WaitPolicy::FirstPass`] also when the single Agent pass fails.
    pub async fn ensure(
        &self,
        agent: &str,
        name: &SessionName,
        request: SessionRequest,
        wait: WaitPolicy,
        progress: Option<Reporter>,
    ) -> Result<AttachTarget, Error> {
        let (owner, session) = self.prepare(agent, name, request).await?;
        self.convergence.converge(owner.id, wait, progress.as_ref()).await?;
        // On a brand-new Agent this is the first moment the answer exists.
        let converged = self.sandboxes.agent_by_name(agent).await?;
        Self::reject_omitted_optional_harness(&converged, session.harness)?;
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
        if timeout.is_some_and(|timeout| timeout > PROMPT_TIMEOUT_MAX) {
            return Err(Error::Invalid(format!(
                "completion timeout must not exceed {}m",
                PROMPT_TIMEOUT_MAX.as_secs() / 60
            )));
        }
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
            timeout.unwrap_or(PROMPT_TIMEOUT_MAX),
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
        self.runtime.turns(&session, &sandbox, last).await
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

    /// Refuses a Session on an optional installation this Agent's Sandbox does not carry.
    ///
    /// Reports the reason to the caller; the Session reconciler enforces it. Before the Sandbox is
    /// materialized nothing is known, so the decision is deferred to the next attach.
    fn reject_omitted_optional_harness(
        owner: &control_plane::AgentRecord,
        harness: crate::Harness,
    ) -> Result<(), Error> {
        let Some(installation) = owner.agent.spec.harness(harness) else {
            return Ok(());
        };
        let Some(crate::sandbox::Assignment::Materialized { harnesses, .. }) = &owner.agent.status.sandbox else {
            return Ok(());
        };
        if !installation.optional || harnesses.contains(&harness) {
            return Ok(());
        }
        Err(Error::Invalid(format!(
            "Agent {:?} declares harness {:?} as optional and it is not installed, because its \
             host login is absent; sign in on the host and the next Agent convergence installs it",
            owner.agent.metadata.name,
            installation.kind.as_str()
        )))
    }

    async fn prepare(
        &self,
        agent: &str,
        name: &SessionName,
        request: SessionRequest,
    ) -> Result<(control_plane::AgentRecord, Session), Error> {
        let owner = self.sandboxes.agent_by_name(agent).await?;
        if owner.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        if let Some(harness) = request.harness
            && owner.agent.spec.harness(harness).is_none()
        {
            return Err(Error::Invalid(format!(
                "Agent {agent:?} does not declare harness {:?}",
                harness.as_str()
            )));
        }
        let existing = match self.store.get_agent_session(agent, name).await {
            Ok(session) => {
                reject_conflicting_selections(name, &session, &request)?;
                Some(session)
            }
            Err(Error::NotFound) => None,
            Err(error) => return Err(error),
        };
        let harness = match (&existing, request.harness) {
            (Some(session), _) => session.harness,
            (None, Some(harness)) => harness,
            (None, None) => {
                owner
                    .agent
                    .spec
                    .default_harness()
                    .ok_or_else(|| Error::Invalid(format!("Agent {agent:?} has no default harness")))?
                    .kind
            }
        };
        // Validated before the Session is persisted: a Session name is bound to its harness for the
        // life of the Agent, so a refused attempt must not leave the name claimed.
        Self::reject_omitted_optional_harness(&owner, harness)?;
        let session = if let Some(session) = existing {
            session
        } else {
            let installation = owner.agent.spec.harness(harness).ok_or_else(|| {
                Error::Invalid(format!(
                    "Agent {agent:?} does not declare harness {:?}",
                    harness.as_str()
                ))
            })?;
            if let Some(initial_prompt) = &request.initial_prompt {
                crate::harness::validate_initial_prompt(initial_prompt)?;
            }
            let new = NewSession {
                initial_prompt: request.initial_prompt,
                ..NewSession::resolved(installation.kind, request.model_selection, &installation.defaults)
            };
            self.store.ensure_session(agent, name, new).await?
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

    /// Lists active work and terminal attachments that must finish before an upgrade.
    ///
    /// # Errors
    ///
    /// Returns an error when the durable Session or Sandbox state cannot be inspected.
    pub async fn upgrade_readiness(&self) -> Result<UpgradeReadiness, Error> {
        tokio::time::timeout(UPGRADE_SESSION_PASS_TIMEOUT, self.inspect_upgrade_readiness())
            .await
            .map_err(|_| Error::Session("timed out checking Sessions before upgrade".into()))?
    }

    async fn inspect_upgrade_readiness(&self) -> Result<UpgradeReadiness, Error> {
        let mut readiness = UpgradeReadiness::default();
        for session in self.store.list_all_sessions().await? {
            let label = format!("session/{}/{}", session.agent, session.name);
            if session.status.state == State::Working {
                readiness.blockers.push(format!("{label} (working)"));
                continue;
            }
            if session.status.state == State::Starting && session.status.reported.harness_session_id.is_some() {
                readiness.blockers.push(format!("{label} (starting)"));
                continue;
            }
            let Some(sandbox) = self.upgrade_sandbox(&session).await? else {
                if session.status.state == State::Starting {
                    readiness
                        .warnings
                        .push(format!("{label} will start a new conversation"));
                }
                continue;
            };
            match self.runtime.observe(&session, &sandbox).await? {
                super::runtime::Observation::Alive { attached: true, .. } => {
                    readiness.blockers.push(format!("{label} (terminal attached)"));
                }
                super::runtime::Observation::Alive { attached: false, .. }
                    if session.status.reported.harness_session_id.is_none() =>
                {
                    readiness
                        .warnings
                        .push(format!("{label} will start a new conversation"));
                }
                super::runtime::Observation::Missing if session.status.state == State::Starting => {
                    readiness
                        .warnings
                        .push(format!("{label} will start a new conversation"));
                }
                super::runtime::Observation::Missing | super::runtime::Observation::Alive { .. } => {}
            }
        }
        Ok(readiness)
    }

    /// Stops quiescent Session runtimes once after a software upgrade so normal
    /// reconciliation relaunches them with the current harness hooks.
    ///
    /// # Errors
    ///
    /// Returns an error, without clearing the caller-owned marker, when a
    /// running Sandbox cannot be inspected or a Session becomes attached.
    pub async fn relaunch_after_upgrade(&self) -> Result<(), Error> {
        tokio::time::timeout(UPGRADE_SESSION_PASS_TIMEOUT, self.relaunch_sessions())
            .await
            .map_err(|_| Error::Session("timed out relaunching Sessions after upgrade".into()))?
    }

    async fn relaunch_sessions(&self) -> Result<(), Error> {
        for session in self.store.list_all_sessions().await? {
            let Some(sandbox) = self.upgrade_sandbox(&session).await? else {
                self.store.reset_session_launch_attempts(session.id).await?;
                continue;
            };
            match self.runtime.observe(&session, &sandbox).await? {
                super::runtime::Observation::Missing => {
                    self.store.activate_session(session.id).await?;
                }
                super::runtime::Observation::Alive { attached: true, .. } => {
                    return Err(Error::Session(format!(
                        "Session \"{}/{}\" became attached during upgrade",
                        session.agent, session.name
                    )));
                }
                super::runtime::Observation::Alive { attached: false, .. } => {
                    // Persist the relaunch request before removing an Idle runtime.
                    self.store.activate_session(session.id).await?;
                    self.runtime.stop(&session, &sandbox).await?;
                }
            }
            self.store.reset_session_launch_attempts(session.id).await?;
        }
        Ok(())
    }

    async fn upgrade_sandbox(&self, session: &Session) -> Result<Option<SandboxHandle>, Error> {
        let owner = self.sandboxes.agent(session.agent_id).await?;
        if !matches!(
            owner.agent.status.sandbox,
            Some(crate::sandbox::Assignment::Materialized { .. })
        ) {
            return Ok(None);
        }
        let opened = tokio::time::timeout(UPGRADE_SANDBOX_INSPECTION_TIMEOUT, self.sandboxes.open(&owner))
            .await
            .map_err(|_| {
                Error::Session(format!(
                    "timed out inspecting the Sandbox for Session \"{}\"",
                    session.name
                ))
            })?;
        let sandbox = match opened {
            Ok(sandbox) => sandbox,
            Err(Error::Sandbox(error)) if error.is_not_found() => return Ok(None),
            Err(error) => return Err(error),
        };
        if sandbox.snapshot().state == ::sandbox::SandboxState::Stopped {
            return Ok(None);
        }
        Ok(Some(sandbox))
    }
}

/// An existing Session keeps its recorded harness, model and effort; only an
/// explicit, differing request is an error, so a manifest default that changed
/// after creation never conflicts with relaunching or attaching.
fn reject_conflicting_selections(name: &SessionName, session: &Session, request: &SessionRequest) -> Result<(), Error> {
    if let Some(harness) = request.harness
        && harness != session.harness
    {
        return Err(Error::Invalid(format!(
            "Session \"{name}\" already uses harness {:?}, not {:?}",
            session.harness.as_str(),
            harness.as_str()
        )));
    }
    if let Some(conflict) = session.model_selection.conflict_with(&request.model_selection) {
        return Err(Error::Invalid(format!("Session \"{name}\" {conflict}")));
    }
    Ok(())
}
