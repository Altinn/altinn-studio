//! Lossy in-process fan-out of provisioning telemetry.

use std::{cell::Cell, rc::Rc, time::Instant};

use tokio::sync::broadcast;

use crate::{AgentId, ReconcileFailure};

use super::{Event, ProvisioningState, SandboxReporter};

const EVENT_CAPACITY: usize = 1_024;

/// Broadcasts telemetry from the reconciler to opted-in requests.
///
/// Delivery is lossy by design: a lagging subscriber skips older events. Only
/// phase, step, and byte progress travel here; conditions use the status watch.
#[derive(Clone)]
pub struct Hub {
    sender: broadcast::Sender<Envelope>,
}

#[derive(Clone)]
struct Envelope {
    id: AgentId,
    event: Event,
}

pub(crate) struct Subscription {
    id: AgentId,
    receiver: broadcast::Receiver<Envelope>,
}

pub(crate) enum Receive {
    Event(Event),
    Lagged,
    Closed,
}

impl Hub {
    /// Creates an empty hub.
    #[must_use]
    pub fn new() -> Self {
        let (sender, receiver) = broadcast::channel(EVENT_CAPACITY);
        drop(receiver);
        Self { sender }
    }

    pub(crate) fn subscribe(&self, id: AgentId) -> Subscription {
        Subscription {
            id,
            receiver: self.sender.subscribe(),
        }
    }

    pub(crate) fn publish(&self, id: AgentId, event: Event) {
        let _ignored = self.sender.send(Envelope { id, event });
    }

    /// Observes one Sandbox ensure for an Agent, folding SDK progress into the
    /// Agent's provisioning state and forwarding it as telemetry.
    #[must_use]
    pub fn observe_sandbox(&self, id: AgentId, state: ProvisioningState) -> SandboxObserver {
        SandboxObserver {
            hub: self.clone(),
            state,
            id,
            started: Rc::new(Cell::new(false)),
            open_phase: Rc::new(Cell::new(None)),
        }
    }
}

/// Forwards one Sandbox ensure's SDK progress and closes its open phase on failure.
pub struct SandboxObserver {
    hub: Hub,
    state: ProvisioningState,
    id: AgentId,
    started: Rc<Cell<bool>>,
    open_phase: Rc<Cell<Option<(super::Phase, String, Instant)>>>,
}

impl SandboxObserver {
    /// Returns the callback handed to the Sandbox Provider.
    #[must_use]
    pub fn reporter(&self) -> SandboxReporter {
        let hub = self.hub.clone();
        let state = self.state.clone();
        let id = self.id;
        let started = self.started.clone();
        let open_phase = self.open_phase.clone();
        let translator = std::cell::RefCell::new(super::event::Translator::default());
        Rc::new(move |event| {
            if !started.replace(true) {
                state.begin(id);
            }
            state.apply(id, &event);
            if let Some(event) = translator.borrow_mut().translate(event) {
                match &event {
                    Event::PhaseStarted { phase, message, .. } => {
                        open_phase.set(Some((*phase, message.clone(), Instant::now())));
                    }
                    Event::PhaseCompleted { .. } => open_phase.set(None),
                    _ => {}
                }
                hub.publish(id, event);
            }
        })
    }

    /// Records that the ensure succeeded.
    pub fn succeeded(&self) {
        self.begin_once();
        self.state.succeed(self.id);
    }

    /// Reports that the ensure failed, closing the phase that was open.
    pub fn failed(&self, failure: &ReconcileFailure) {
        self.begin_once();
        self.state.fail(self.id, &failure.message);
        if let Some((phase, message, started)) = self.open_phase.take() {
            self.hub.publish(
                self.id,
                Event::PhaseFailed {
                    phase,
                    message,
                    detail: failure.message.clone(),
                    failure: failure.kind,
                    elapsed_ms: super::event::milliseconds(started.elapsed()),
                },
            );
        }
    }
}

impl SandboxObserver {
    /// Starts this pass's record unless an event already started it, so an
    /// outcome never lands on the previous pass.
    fn begin_once(&self) {
        if !self.started.replace(true) {
            self.state.begin(self.id);
        }
    }
}

impl Default for Hub {
    fn default() -> Self {
        Self::new()
    }
}

impl Subscription {
    pub(crate) async fn receive(&mut self) -> Receive {
        loop {
            match self.receiver.recv().await {
                Ok(envelope) if envelope.id == self.id => return Receive::Event(envelope.event),
                Ok(_) => {}
                Err(broadcast::error::RecvError::Lagged(_)) => return Receive::Lagged,
                Err(broadcast::error::RecvError::Closed) => return Receive::Closed,
            }
        }
    }

    pub(crate) fn try_receive(&mut self) -> Option<Receive> {
        loop {
            match self.receiver.try_recv() {
                Ok(envelope) if envelope.id == self.id => return Some(Receive::Event(envelope.event)),
                Ok(_) => {}
                Err(broadcast::error::TryRecvError::Lagged(_)) => return Some(Receive::Lagged),
                Err(broadcast::error::TryRecvError::Closed) => return Some(Receive::Closed),
                Err(broadcast::error::TryRecvError::Empty) => return None,
            }
        }
    }
}
