//! Lossy in-process fan-out of provisioning telemetry.

use std::{cell::Cell, rc::Rc, time::Instant};

use tokio::sync::broadcast;

use crate::AgentId;

use super::{Event, SandboxReporter};

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

    /// Observes one Sandbox ensure for an Agent, forwarding SDK progress as telemetry.
    #[must_use]
    pub fn observe_sandbox(&self, id: AgentId, agent: String) -> SandboxObserver {
        SandboxObserver {
            hub: self.clone(),
            id,
            agent,
            open_phase: Rc::new(Cell::new(None)),
        }
    }
}

/// Forwards one Sandbox ensure's SDK progress and closes its open phase on failure.
pub struct SandboxObserver {
    hub: Hub,
    id: AgentId,
    agent: String,
    open_phase: Rc<Cell<Option<(super::Phase, String, Instant)>>>,
}

impl SandboxObserver {
    /// Returns the callback handed to the Sandbox Provider.
    #[must_use]
    pub fn reporter(&self) -> SandboxReporter {
        let hub = self.hub.clone();
        let id = self.id;
        let agent = self.agent.clone();
        let open_phase = self.open_phase.clone();
        Rc::new(move |event| {
            if let Some(event) = super::event::sandbox_event(&agent, event) {
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

    /// Reports that the ensure failed while a phase was open.
    pub fn failed(&self, error: &crate::Error) {
        if let Some((phase, message, started)) = self.open_phase.take() {
            self.hub.publish(
                self.id,
                Event::PhaseFailed {
                    agent: self.agent.clone(),
                    phase,
                    message,
                    detail: error.to_string(),
                    failure: crate::ReconcileFailure::classify(error).kind,
                    elapsed_ms: super::event::milliseconds(started.elapsed()),
                },
            );
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
