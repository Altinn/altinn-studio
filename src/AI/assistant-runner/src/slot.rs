use std::{cell::Cell, pin::pin, rc::Rc};

use tokio::sync::Notify;

/// Room for one VM. The runner starts a VM only when it holds the slot, so that one pod runs one VM at a time.
#[derive(Clone, Default)]
pub struct Slot(Rc<State>);

#[derive(Default)]
struct State {
    taken: Cell<bool>,
    freed: Notify,
}

/// Frees the slot when it is dropped.
pub struct SlotGuard(Slot);

impl Slot {
    /// Takes the slot, or returns `None` if it is already taken.
    #[must_use]
    pub fn take(&self) -> Option<SlotGuard> {
        (!self.0.taken.replace(true)).then(|| SlotGuard(self.clone()))
    }

    /// Waits until no one holds the slot.
    pub async fn wait_until_free(&self) {
        loop {
            let mut freed = pin!(self.0.freed.notified());
            freed.as_mut().enable();
            if !self.0.taken.get() {
                return;
            }
            freed.await;
        }
    }
}

impl Drop for SlotGuard {
    fn drop(&mut self) {
        self.0.0.taken.set(false);
        self.0.0.freed.notify_waiters();
    }
}

#[cfg(test)]
mod tests {
    use super::Slot;

    #[test]
    fn gives_the_slot_to_one_holder_at_a_time() {
        let slot = Slot::default();
        let first = slot.take();
        assert!(first.is_some());
        assert!(slot.take().is_none());
        drop(first);
        assert!(slot.take().is_some());
    }

    #[tokio::test(flavor = "local")]
    async fn wakes_a_waiter_when_the_slot_is_freed() {
        let slot = Slot::default();
        let guard = slot.take();
        let waiter = slot.clone();
        let waiting = tokio::task::spawn_local(async move { waiter.wait_until_free().await });
        tokio::task::yield_now().await;
        assert!(!waiting.is_finished());
        drop(guard);
        assert!(waiting.await.is_ok());
    }
}
