//! Bounded, coalescing queue of notifications awaiting a connection write.

use std::{cell::RefCell, collections::VecDeque, rc::Rc};

use tokio::sync::Notify;

use crate::progress::{Event, Reporter};

/// Queued events above which droppable diagnostics are discarded.
const CAPACITY: usize = 256;
/// Queued events above which the client is considered undrained and is disconnected.
const OVERFLOW: usize = 4 * CAPACITY;

/// Notifications produced by a request handler faster than the connection drains them.
///
/// Numeric step progress coalesces to the latest value per step, and step
/// output is dropped once the queue is full. Phase transitions, step start and
/// completion, and conditions are never dropped; a client that lets them pile
/// up past [`OVERFLOW`] is disconnected instead, which keeps memory bounded
/// without ever delivering a partial condition history.
#[derive(Default)]
pub(super) struct Outbox {
    queue: RefCell<VecDeque<Event>>,
    ready: Notify,
    overflowed: std::cell::Cell<bool>,
}

impl Outbox {
    pub(super) fn new() -> Rc<Self> {
        Rc::new(Self::default())
    }

    /// Creates the callback a request handler reports through.
    pub(super) fn reporter(self: &Rc<Self>) -> Reporter {
        let outbox = self.clone();
        Rc::new(move |event| outbox.push(event))
    }

    pub(super) fn push(&self, event: Event) {
        let mut queue = self.queue.borrow_mut();
        if let Some(position) = queue.iter().rposition(|queued| event.supersedes(queued)) {
            queue[position] = event;
        } else if queue.len() >= CAPACITY && event.is_droppable() {
            return;
        } else if queue.len() >= OVERFLOW {
            self.overflowed.set(true);
        } else {
            queue.push_back(event);
        }
        drop(queue);
        self.ready.notify_one();
    }

    /// Returns whether undeliverable events had to be refused because the client did not drain.
    pub(super) const fn overflowed(&self) -> bool {
        self.overflowed.get()
    }

    pub(super) fn pop(&self) -> Option<Event> {
        self.queue.borrow_mut().pop_front()
    }

    /// Waits until at least one event has been queued since the last flush.
    pub(super) async fn readied(&self) {
        self.ready.notified().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::Phase;

    fn progress(step: &str, completed: u64) -> Event {
        Event::StepProgress {
            agent: "worker".into(),
            phase: Phase::ImagePrepare,
            step_id: step.into(),
            message: "pull".into(),
            completed,
            total: Some(100),
            unit: crate::progress::ProgressUnit::Bytes,
        }
    }

    fn output(line: &str) -> Event {
        Event::StepOutput {
            agent: "worker".into(),
            phase: Phase::ImagePrepare,
            step_id: "1".into(),
            message: "pull".into(),
            stream: crate::progress::OutputStream::Stderr,
            detail: line.into(),
        }
    }

    fn drain(outbox: &Outbox) -> Vec<Event> {
        std::iter::from_fn(|| outbox.pop()).collect()
    }

    #[test]
    fn byte_progress_coalesces_to_the_latest_value_per_step() {
        let outbox = Outbox::new();
        outbox.push(progress("1", 10));
        outbox.push(progress("2", 5));
        outbox.push(progress("1", 20));
        outbox.push(progress("1", 30));

        assert_eq!(drain(&outbox), vec![progress("1", 30), progress("2", 5)]);
    }

    #[test]
    fn an_undrained_client_overflows_instead_of_growing_without_bound() {
        let outbox = Outbox::new();
        let phase = Event::PhaseStarted {
            agent: "worker".into(),
            phase: Phase::SandboxStart,
            message: "Start Sandbox".into(),
        };
        for _ in 0..OVERFLOW {
            outbox.push(phase.clone());
        }
        assert!(!outbox.overflowed());
        outbox.push(phase);
        assert!(outbox.overflowed());
        assert_eq!(drain(&outbox).len(), OVERFLOW);
    }

    #[test]
    fn conditions_and_phase_transitions_are_never_dropped() {
        let outbox = Outbox::new();
        for line in 0..(CAPACITY * 2) {
            outbox.push(output(&line.to_string()));
        }
        let phase = Event::PhaseStarted {
            agent: "worker".into(),
            phase: Phase::SandboxStart,
            message: "Start Sandbox".into(),
        };
        let condition = Event::Condition {
            agent: "worker".into(),
            condition: "Ready".into(),
            status: crate::ConditionStatus::False,
            reason: "SandboxReconcileFailed".into(),
            message: "boom".into(),
            failure: Some(crate::FailureKind::Transient),
        };
        outbox.push(phase.clone());
        outbox.push(condition.clone());
        outbox.push(progress("1", 1));

        let drained = drain(&outbox);
        assert_eq!(drained.len(), CAPACITY + 3);
        assert_eq!(&drained[CAPACITY..], &[phase, condition, progress("1", 1)]);
    }
}
