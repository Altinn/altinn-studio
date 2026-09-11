//! Requests converging an Agent and observing that convergence.
//!
//! The reconciler publishes through [`Observers`]; requests wake and follow
//! through [`Convergence`]. Readiness and failure travel on the per-Agent
//! latest-value [`StatusWatch`] so no waiter can miss a terminal transition,
//! while lossy phase and step telemetry fans out through the progress hub.

use tokio::sync::watch;

use crate::{
    AgentId, Error, FailureKind, ReconcileFailure,
    progress::{Event, Hub, Receive, Reporter, SandboxObserver, Subscription},
};

use super::{ObservedStatus, StatusWatch, Wakeup};

/// How long a request waits for the Agent it woke.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WaitPolicy {
    /// Returns after one reconciliation pass with that pass's outcome.
    FirstPass,
    /// Keeps waiting through transient failures, which the background controller
    /// retries, until the Agent is Ready or its desired state is invalid.
    UntilReady,
}

/// Publishing side of Agent observation, held by the reconciler.
#[derive(Clone, Default)]
pub struct Observers {
    telemetry: Hub,
    statuses: StatusWatch,
}

impl Observers {
    /// Creates empty observers.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    pub(crate) fn observe_sandbox(&self, id: AgentId) -> SandboxObserver {
        self.telemetry.observe_sandbox(id)
    }

    pub(crate) fn publish_status(&self, id: AgentId, status: ObservedStatus) {
        self.statuses.publish(id, status);
    }

    pub(crate) fn forget(&self, id: AgentId) {
        self.statuses.forget(id);
    }
}

/// Wakes Agent convergence and lets a request follow it.
#[derive(Clone)]
pub struct Convergence {
    wakeup: Wakeup,
    observers: Observers,
}

impl Convergence {
    /// Pairs the controller's wake-up handle with the reconciler's observers.
    #[must_use]
    pub const fn new(wakeup: Wakeup, observers: Observers) -> Self {
        Self { wakeup, observers }
    }

    /// Wakes convergence of one Agent and waits according to `wait`, reporting
    /// telemetry and condition transitions to `progress` when given.
    ///
    /// A standing failure is reported when observation starts. Conditions are
    /// diffed from the latest watched status, so a terminal transition is never
    /// lost even when telemetry lagged.
    ///
    /// # Errors
    ///
    /// Returns `Error::Invalid` when desired state must change, the first pass's
    /// failure under [`WaitPolicy::FirstPass`], `Error::Conflict` when the Agent
    /// is deleted while observed, or a daemon error when observation stops.
    pub async fn converge(&self, id: AgentId, wait: WaitPolicy, progress: Option<&Reporter>) -> Result<(), Error> {
        if wait == WaitPolicy::FirstPass && progress.is_none() {
            return self.wakeup.reconcile(id).await.map_err(Error::from);
        }
        self.follow(id, wait, progress).await
    }

    async fn follow(&self, id: AgentId, wait: WaitPolicy, reporter: Option<&Reporter>) -> Result<(), Error> {
        let mut observer = Observer {
            reporter,
            telemetry: self.observers.telemetry.subscribe(id),
            statuses: self.observers.statuses.subscribe(id),
            last: ObservedStatus::default(),
        };
        // A failure that is already recorded when observation starts is what the
        // user came to see; a standing Ready is not worth a line.
        let current = observer.statuses.borrow_and_update().clone();
        if current.failure.is_some() {
            observer.emit(&current);
        }
        observer.last = current;

        let mut reconcile = std::pin::pin!(self.wakeup.reconcile(id));
        let first_pass = loop {
            tokio::select! {
                biased;
                event = observer.telemetry.receive() => observer.forward(event)?,
                changed = observer.statuses.changed() => observer.status_changed(changed)?,
                result = &mut reconcile => break result,
            }
        };
        observer.drain()?;
        match (wait, first_pass) {
            (_, Ok(())) => return Ok(()),
            (WaitPolicy::FirstPass, Err(failure)) => return Err(failure.into()),
            (WaitPolicy::UntilReady, Err(failure)) if failure.kind == FailureKind::Invalid => {
                return Err(failure.into());
            }
            (WaitPolicy::UntilReady, Err(_)) => {}
        }
        loop {
            if observer.last.ready() {
                return Ok(());
            }
            if let Some(message) = observer.last.invalid() {
                return Err(ReconcileFailure {
                    kind: FailureKind::Invalid,
                    message,
                }
                .into());
            }
            tokio::select! {
                biased;
                event = observer.telemetry.receive() => observer.forward(event)?,
                changed = observer.statuses.changed() => observer.status_changed(changed)?,
            }
        }
    }
}

struct Observer<'a> {
    reporter: Option<&'a Reporter>,
    telemetry: Subscription,
    statuses: watch::Receiver<ObservedStatus>,
    last: ObservedStatus,
}

impl Observer<'_> {
    fn forward(&self, event: Receive) -> Result<(), Error> {
        match event {
            Receive::Event(event) => {
                if let Some(reporter) = self.reporter {
                    reporter(event);
                }
            }
            Receive::Lagged => {}
            Receive::Closed => return Err(Error::Daemon("Agent progress observation stopped".into())),
        }
        Ok(())
    }

    fn status_changed(&mut self, changed: Result<(), watch::error::RecvError>) -> Result<(), Error> {
        changed.map_err(|_| Error::Conflict)?;
        let current = self.statuses.borrow_and_update().clone();
        self.emit(&current);
        self.last = current;
        Ok(())
    }

    fn emit(&self, current: &ObservedStatus) {
        let Some(reporter) = self.reporter else {
            return;
        };
        for condition in current.changed_since(&self.last) {
            reporter(Event::condition(condition, current.failure));
        }
    }

    fn drain(&mut self) -> Result<(), Error> {
        while let Some(event) = self.telemetry.try_receive() {
            self.forward(event)?;
        }
        if self.statuses.has_changed().map_err(|_| Error::Conflict)? {
            self.status_changed(Ok(()))?;
        }
        Ok(())
    }
}
