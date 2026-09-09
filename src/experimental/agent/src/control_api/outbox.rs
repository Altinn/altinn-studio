//! Bounded, coalescing queue of notifications awaiting a connection write.

use std::{cell::RefCell, collections::VecDeque, rc::Rc};

use tokio::sync::Notify;

use crate::progress::{Event, Reporter};

/// Queued events above which droppable diagnostics are discarded.
const CAPACITY: usize = 256;

/// Notifications produced by a request handler faster than the connection drains them.
///
/// Numeric step progress coalesces to the latest value per step, and step
/// output is dropped once the queue is full. Phase transitions, step start and
/// completion, and conditions are never dropped.
///
/// Depth is bounded structurally: the handler that pushes and the writer that
/// flushes are arms of one `select!` in one task, so events accumulate only
/// during a single poll of the handler and are flushed before the next. A slow
/// client back-pressures the handler through the socket write, not through
/// this queue.
#[derive(Default)]
pub(super) struct Outbox {
    queue: RefCell<VecDeque<Event>>,
    ready: Notify,
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
        } else {
            queue.push_back(event);
        }
        drop(queue);
        self.ready.notify_one();
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
    fn conditions_and_phase_transitions_are_never_dropped() {
        let outbox = Outbox::new();
        for line in 0..(CAPACITY * 2) {
            outbox.push(output(&line.to_string()));
        }
        let phase = Event::PhaseStarted {
            phase: Phase::SandboxStart,
            message: "Start Sandbox".into(),
        };
        let condition = Event::Condition {
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
