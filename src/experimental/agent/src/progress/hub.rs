//! Lossy in-process fan-out of provisioning telemetry.

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

    /// Creates the callback a Sandbox Provider reports SDK progress through.
    #[must_use]
    pub fn sandbox_reporter(&self, id: AgentId, agent: String) -> SandboxReporter {
        let hub = self.clone();
        std::rc::Rc::new(move |event| {
            if let Some(event) = super::event::sandbox_event(&agent, event) {
                hub.publish(id, event);
            }
        })
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
