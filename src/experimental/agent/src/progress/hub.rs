//! Lossy in-process fan-out of provisioning telemetry.

use std::{
    cell::{Cell, RefCell},
    collections::{HashMap, VecDeque},
    rc::Rc,
    time::Instant,
};

use tokio::sync::broadcast;

use crate::{AgentId, ReconcileFailure};

use super::{Event, SandboxReporter};

const EVENT_CAPACITY: usize = 1_024;
const SNAPSHOT_CAPACITY: usize = 256;

/// Broadcasts telemetry from the reconciler to opted-in requests.
///
/// Delivery is lossy by design: a lagging subscriber skips older events. Only
/// phase, step, and byte progress travel here; conditions use the status watch.
#[derive(Clone)]
pub struct Hub {
    inner: Rc<Inner>,
}

#[derive(Clone)]
struct Envelope {
    id: AgentId,
    event: FleetEvent,
}

struct Inner {
    sender: broadcast::Sender<Envelope>,
    snapshots: RefCell<HashMap<AgentId, VecDeque<FleetEvent>>>,
}

/// One best-effort provisioning event labeled with its Agent name.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct FleetEvent {
    /// User-facing Agent identity at the time the event was emitted.
    pub agent: String,
    /// Provisioning telemetry for that Agent.
    pub event: Event,
}

pub(crate) struct Subscription {
    id: AgentId,
    receiver: broadcast::Receiver<Envelope>,
}

pub(crate) struct FleetSubscription {
    hub: Hub,
    receiver: broadcast::Receiver<Envelope>,
}

pub(crate) enum Receive {
    Event(Event),
    Lagged,
    Closed,
}

pub(crate) enum FleetReceive {
    Event(FleetEvent),
    Lagged,
    Closed,
}

impl Hub {
    /// Creates an empty hub.
    #[must_use]
    pub fn new() -> Self {
        let (sender, receiver) = broadcast::channel(EVENT_CAPACITY);
        drop(receiver);
        Self {
            inner: Rc::new(Inner {
                sender,
                snapshots: RefCell::new(HashMap::new()),
            }),
        }
    }

    pub(crate) fn subscribe(&self, id: AgentId) -> Subscription {
        Subscription {
            id,
            receiver: self.inner.sender.subscribe(),
        }
    }

    pub(crate) fn subscribe_all(&self) -> FleetSubscription {
        FleetSubscription {
            hub: self.clone(),
            receiver: self.inner.sender.subscribe(),
        }
    }

    fn begin(&self, id: AgentId) {
        self.inner.snapshots.borrow_mut().insert(id, VecDeque::new());
    }

    pub(crate) fn forget(&self, id: AgentId) {
        self.inner.snapshots.borrow_mut().remove(&id);
    }

    fn publish(&self, id: AgentId, agent: &str, event: Event) {
        let fleet = FleetEvent {
            agent: agent.into(),
            event,
        };
        let mut snapshots = self.inner.snapshots.borrow_mut();
        let snapshot = snapshots.entry(id).or_default();
        if let Some(position) = snapshot
            .iter()
            .rposition(|queued| fleet.event.supersedes(&queued.event))
        {
            snapshot[position] = fleet.clone();
        } else if !(snapshot.len() >= SNAPSHOT_CAPACITY && fleet.event.is_droppable()) {
            if snapshot.len() == SNAPSHOT_CAPACITY {
                snapshot.pop_front();
            }
            snapshot.push_back(fleet.clone());
        }
        drop(snapshots);
        let _ignored = self.inner.sender.send(Envelope { id, event: fleet });
    }

    /// Observes one Sandbox ensure for an Agent, forwarding SDK progress as telemetry.
    #[must_use]
    pub fn observe_sandbox(&self, id: AgentId, agent: String) -> SandboxObserver {
        SandboxObserver {
            hub: self.clone(),
            id,
            agent,
            started: Rc::new(Cell::new(false)),
            open_phase: Rc::new(Cell::new(None)),
        }
    }

    fn snapshot(&self) -> Vec<FleetEvent> {
        let mut events = self
            .inner
            .snapshots
            .borrow()
            .values()
            .flat_map(|events| events.iter().cloned())
            .collect::<Vec<_>>();
        events.sort_by(|left, right| left.agent.cmp(&right.agent));
        events
    }
}

/// Forwards one Sandbox ensure's SDK progress and closes its open phase on failure.
pub struct SandboxObserver {
    hub: Hub,
    id: AgentId,
    agent: String,
    started: Rc<Cell<bool>>,
    open_phase: Rc<Cell<Option<(super::Phase, String, Instant)>>>,
}

impl SandboxObserver {
    /// Returns the callback handed to the Sandbox Provider.
    #[must_use]
    pub fn reporter(&self) -> SandboxReporter {
        let hub = self.hub.clone();
        let id = self.id;
        let agent = self.agent.clone();
        let started = self.started.clone();
        let open_phase = self.open_phase.clone();
        Rc::new(move |event| {
            if let Some(event) = super::event::sandbox_event(event) {
                if !started.replace(true) {
                    hub.begin(id);
                }
                match &event {
                    Event::PhaseStarted { phase, message, .. } => {
                        open_phase.set(Some((*phase, message.clone(), Instant::now())));
                    }
                    Event::PhaseCompleted { .. } => open_phase.set(None),
                    _ => {}
                }
                hub.publish(id, &agent, event);
            }
        })
    }

    /// Reports that the ensure failed while a phase was open.
    pub fn failed(&self, failure: &ReconcileFailure) {
        if let Some((phase, message, started)) = self.open_phase.take() {
            self.hub.publish(
                self.id,
                &self.agent,
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

impl Default for Hub {
    fn default() -> Self {
        Self::new()
    }
}

impl Subscription {
    pub(crate) async fn receive(&mut self) -> Receive {
        loop {
            match self.receiver.recv().await {
                Ok(envelope) if envelope.id == self.id => return Receive::Event(envelope.event.event),
                Ok(_) => {}
                Err(broadcast::error::RecvError::Lagged(_)) => return Receive::Lagged,
                Err(broadcast::error::RecvError::Closed) => return Receive::Closed,
            }
        }
    }

    pub(crate) fn try_receive(&mut self) -> Option<Receive> {
        loop {
            match self.receiver.try_recv() {
                Ok(envelope) if envelope.id == self.id => return Some(Receive::Event(envelope.event.event)),
                Ok(_) => {}
                Err(broadcast::error::TryRecvError::Lagged(_)) => return Some(Receive::Lagged),
                Err(broadcast::error::TryRecvError::Closed) => return Some(Receive::Closed),
                Err(broadcast::error::TryRecvError::Empty) => return None,
            }
        }
    }
}

impl FleetSubscription {
    pub(crate) fn snapshot(&self) -> Vec<FleetEvent> {
        self.hub.snapshot()
    }

    pub(crate) async fn receive(&mut self) -> FleetReceive {
        match self.receiver.recv().await {
            Ok(envelope) => FleetReceive::Event(envelope.event),
            Err(broadcast::error::RecvError::Lagged(_)) => FleetReceive::Lagged,
            Err(broadcast::error::RecvError::Closed) => FleetReceive::Closed,
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    fn progress(completed: u64) -> Event {
        Event::StepProgress {
            phase: super::super::Phase::ImagePrepare,
            step_id: "layer".into(),
            message: "pulling layer".into(),
            completed,
            total: Some(100),
            unit: super::super::ProgressUnit::Bytes,
        }
    }

    #[test]
    fn fleet_snapshot_replays_the_latest_coalesced_pass() {
        let hub = Hub::new();
        let id = AgentId::generate();
        hub.begin(id);
        hub.publish(
            id,
            "worker",
            Event::PhaseStarted {
                phase: super::super::Phase::ImagePrepare,
                message: "image prepare".into(),
            },
        );
        hub.publish(id, "worker", progress(10));
        hub.publish(id, "worker", progress(90));

        let subscription = hub.subscribe_all();
        assert_eq!(
            subscription.snapshot(),
            vec![
                FleetEvent {
                    agent: "worker".into(),
                    event: Event::PhaseStarted {
                        phase: super::super::Phase::ImagePrepare,
                        message: "image prepare".into(),
                    },
                },
                FleetEvent {
                    agent: "worker".into(),
                    event: progress(90),
                },
            ]
        );

        hub.begin(id);
        assert!(
            hub.subscribe_all().snapshot().is_empty(),
            "a new pass replaces stale replay state"
        );
    }

    #[tokio::test]
    async fn fleet_subscription_reports_lag_and_can_replace_from_snapshot() {
        let hub = Hub::new();
        let id = AgentId::generate();
        hub.begin(id);
        let mut subscription = hub.subscribe_all();
        for completed in 0..=(EVENT_CAPACITY as u64) {
            hub.publish(
                id,
                "worker",
                Event::StepOutput {
                    phase: super::super::Phase::ImagePrepare,
                    step_id: "layer".into(),
                    message: "pulling layer".into(),
                    stream: super::super::OutputStream::Stderr,
                    detail: completed.to_string(),
                },
            );
        }

        assert!(matches!(subscription.receive().await, FleetReceive::Lagged));
        assert_eq!(subscription.snapshot().len(), SNAPSHOT_CAPACITY);
    }
}
