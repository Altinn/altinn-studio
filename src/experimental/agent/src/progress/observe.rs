//! Joins telemetry and status observation for one opted-in request.

use tokio::sync::watch;

use crate::{
    AgentId, Error, FailureKind,
    control_plane::{ObservedStatus, StatusWatch, Wakeup},
};

use super::{
    Event, Hub, Reporter,
    hub::{Receive, Subscription},
};

/// Wakes convergence and reports progress until the Agent is Ready or invalid.
///
/// The first pass's `Invalid` failure returns immediately. Transient failures
/// keep observing while the background controller retries; conditions are
/// diffed from the latest watched status, so a terminal transition is never lost.
pub(crate) async fn observe_agent(
    telemetry: &Hub,
    statuses: &StatusWatch,
    wakeup: &Wakeup,
    id: AgentId,
    agent: &str,
    reporter: &Reporter,
) -> Result<(), Error> {
    let mut observer = Observer {
        agent,
        reporter,
        telemetry: telemetry.subscribe(id),
        statuses: statuses.subscribe(id),
        last: ObservedStatus::default(),
    };
    // A failure that is already recorded when observation starts is what the
    // user came to see; a standing Ready is not worth a line.
    let current = observer.statuses.borrow_and_update().clone();
    if current.failure.is_some() {
        observer.emit(&current);
    }
    observer.last = current;

    let mut reconcile = std::pin::pin!(wakeup.reconcile(id));
    let first_pass = loop {
        tokio::select! {
            biased;
            event = observer.telemetry.receive() => observer.forward(event)?,
            changed = observer.statuses.changed() => observer.status_changed(changed)?,
            result = &mut reconcile => break result,
        }
    };
    observer.drain()?;
    match first_pass {
        Ok(()) => return Ok(()),
        Err(failure) if failure.kind == FailureKind::Invalid => return Err(failure.into()),
        Err(_) => {}
    }
    loop {
        if observer.last.ready() {
            return Ok(());
        }
        if let Some(message) = observer.last.invalid() {
            return Err(Error::Invalid(message));
        }
        tokio::select! {
            biased;
            event = observer.telemetry.receive() => observer.forward(event)?,
            changed = observer.statuses.changed() => observer.status_changed(changed)?,
        }
    }
}

struct Observer<'a> {
    agent: &'a str,
    reporter: &'a Reporter,
    telemetry: Subscription,
    statuses: watch::Receiver<ObservedStatus>,
    last: ObservedStatus,
}

impl Observer<'_> {
    fn forward(&self, event: Receive) -> Result<(), Error> {
        match event {
            Receive::Event(event) => (self.reporter)(event),
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
        for condition in current.changed_since(&self.last) {
            (self.reporter)(Event::condition(self.agent, condition, current.failure));
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
