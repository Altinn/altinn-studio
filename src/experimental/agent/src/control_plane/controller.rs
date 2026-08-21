use std::{rc::Rc, time::Duration};

use tokio::{
    sync::mpsc,
    time::{Instant, MissedTickBehavior},
};

use crate::Error;

use super::{Notifier, Reconciler, SharedAgentStore};

const DEFAULT_RECONCILE_INTERVAL: Duration = Duration::from_secs(30);

/// Observes recoverable reconciliation errors without stopping the controller.
pub type ErrorHandler = Rc<dyn Fn(&Error)>;

/// A non-blocking handle that coalesces reconcile requests.
#[derive(Clone)]
pub struct Wakeup {
    sender: mpsc::Sender<()>,
}

impl Notifier for Wakeup {
    fn notify(&self) {
        let _ignored = self.sender.try_send(());
    }
}

/// Continuously reconciles stored Agents after changes and on a repair interval.
pub struct Controller {
    store: SharedAgentStore,
    reconciler: Rc<Reconciler>,
    receiver: mpsc::Receiver<()>,
    interval: Duration,
    on_error: ErrorHandler,
}

impl Controller {
    /// Creates a controller and its independently shareable wake-up handle.
    #[must_use]
    pub fn new(
        store: SharedAgentStore,
        reconciler: Rc<Reconciler>,
        interval: Duration,
        on_error: ErrorHandler,
    ) -> (Self, Wakeup) {
        let (sender, receiver) = mpsc::channel(1);
        (
            Self {
                store,
                reconciler,
                receiver,
                interval: if interval.is_zero() {
                    DEFAULT_RECONCILE_INTERVAL
                } else {
                    interval
                },
                on_error,
            },
            Wakeup { sender },
        )
    }

    /// Reconciles existing resources immediately and then continuously.
    pub async fn run(mut self) {
        let mut ticker = tokio::time::interval_at(Instant::now() + self.interval, self.interval);
        ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);
        self.reconcile_all().await;
        loop {
            tokio::select! {
                wake = self.receiver.recv() => {
                    if wake.is_none() {
                        return;
                    }
                    self.reconcile_all().await;
                }
                _ = ticker.tick() => self.reconcile_all().await,
            }
        }
    }

    async fn reconcile_all(&self) {
        let records = match self.store.list().await {
            Ok(records) => records,
            Err(error) => {
                (self.on_error)(&error);
                return;
            }
        };
        for record in records {
            if let Err(error) = self.reconciler.reconcile(&record.agent.metadata.name).await {
                (self.on_error)(&error);
            }
        }
    }
}
