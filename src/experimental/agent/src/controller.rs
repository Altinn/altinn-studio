//! Generic keyed at-least-once reconciliation scheduling.

use std::{
    collections::{BTreeMap, BTreeSet},
    rc::Rc,
    time::Duration,
};

use futures_util::{FutureExt as _, StreamExt as _, stream::FuturesUnordered};
use tokio::{
    sync::{mpsc, oneshot},
    time::{Instant, MissedTickBehavior},
};

use crate::Error;

const MAX_CONCURRENT_RECONCILES: usize = 16;
const WAKEUP_QUEUE_CAPACITY: usize = 1_024;

/// One at-least-once convergence pass over a durable resource key.
pub trait Reconcile<Key> {
    /// Converges one resource and records its observed state.
    fn reconcile(&self, key: Key) -> ::sandbox::LocalFuture<'_, Result<(), Error>>;
}

/// Lists durable resource keys for startup and repair scans.
pub(crate) trait Source<Key> {
    fn list_keys(&self) -> ::sandbox::LocalFuture<'_, Result<Vec<Key>, Error>>;
}

/// Observes recoverable reconciliation errors without stopping the controller.
pub(crate) type ErrorHandler<Key> = Rc<dyn Fn(Option<Key>, &Error)>;

struct Request<Key> {
    key: Key,
    response: Option<oneshot::Sender<Result<(), ReconcileFailure>>>,
}

/// Whether a failed reconciliation pass can succeed later without operator action.
#[derive(Clone, Copy, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FailureKind {
    /// Desired state must change before another pass can succeed.
    Invalid,
    /// A later pass may succeed without any change to desired state.
    Transient,
}

/// One classified reconciliation failure.
#[derive(Clone, Debug)]
pub struct ReconcileFailure {
    /// Classification decided once at the reconcile boundary.
    pub kind: FailureKind,
    /// Human-readable failure detail.
    pub message: String,
}

impl ReconcileFailure {
    /// Classifies a reconciliation error by its variant, never by its message.
    ///
    /// Invalid desired state, an immutable field that changed, and a Sandbox
    /// request the Provider rejects or cannot support are permanent until the
    /// operator changes something; everything else is retried.
    #[must_use]
    pub fn classify(error: &Error) -> Self {
        let permanent = match error {
            Error::Invalid(_) | Error::Immutable(_) => true,
            Error::Sandbox(sandbox) => matches!(
                sandbox.kind(),
                ::sandbox::ErrorKind::InvalidRequest
                    | ::sandbox::ErrorKind::Immutable
                    | ::sandbox::ErrorKind::Unsupported
            ),
            _ => false,
        };
        Self {
            kind: if permanent {
                FailureKind::Invalid
            } else {
                FailureKind::Transient
            },
            message: match error {
                Error::Invalid(message) => message.clone(),
                error => error.to_string(),
            },
        }
    }
}

impl std::fmt::Display for ReconcileFailure {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl From<ReconcileFailure> for Error {
    fn from(failure: ReconcileFailure) -> Self {
        match failure.kind {
            FailureKind::Invalid => Self::Invalid(failure.message),
            FailureKind::Transient => Self::Daemon(failure.message),
        }
    }
}

/// A handle for requesting immediate keyed convergence.
pub struct Wakeup<Key> {
    sender: mpsc::Sender<Request<Key>>,
    resource: &'static str,
}

impl<Key> Clone for Wakeup<Key> {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
            resource: self.resource,
        }
    }
}

impl<Key> Wakeup<Key> {
    /// Queues convergence and waits for the resulting reconciliation pass.
    ///
    /// # Errors
    ///
    /// Returns the pass's classified failure, or a transient failure when the controller stops.
    pub async fn reconcile(&self, key: Key) -> Result<(), ReconcileFailure> {
        let (response, receiver) = oneshot::channel();
        self.sender
            .send(Request {
                key,
                response: Some(response),
            })
            .await
            .map_err(|_| transient(format!("{} controller stopped", self.resource)))?;
        receiver
            .await
            .map_err(|_| transient(format!("{} controller dropped a response", self.resource)))?
    }

    /// Provides a best-effort low-latency hint for already-durable state.
    pub fn notify(&self, key: Key) {
        let _ignored = self.sender.try_send(Request { key, response: None });
    }
}

type Response = oneshot::Sender<Result<(), ReconcileFailure>>;
type ReconcileResult<Key> = (Key, Vec<Response>, Result<(), Error>);
type ReconcileFuture<Key> = futures_util::future::LocalBoxFuture<'static, ReconcileResult<Key>>;

/// Continuously schedules independent reconciliations keyed by durable identity.
///
/// At most one reconciliation runs for a key. A wakeup received during a pass
/// schedules a subsequent pass, and waiters complete only after the pass that
/// observed their request.
pub(crate) struct Controller<Key> {
    source: Rc<dyn Source<Key>>,
    reconciler: Rc<dyn Reconcile<Key>>,
    receiver: mpsc::Receiver<Request<Key>>,
    interval: Duration,
    on_error: ErrorHandler<Key>,
}

impl<Key> Controller<Key>
where
    Key: Copy + Ord + 'static,
{
    pub(crate) fn new(
        source: Rc<dyn Source<Key>>,
        reconciler: Rc<dyn Reconcile<Key>>,
        interval: Duration,
        resource: &'static str,
        on_error: ErrorHandler<Key>,
    ) -> (Self, Wakeup<Key>) {
        assert!(!interval.is_zero(), "reconciliation interval must be non-zero");
        let (sender, receiver) = mpsc::channel(WAKEUP_QUEUE_CAPACITY);
        (
            Self {
                source,
                reconciler,
                receiver,
                interval,
                on_error,
            },
            Wakeup { sender, resource },
        )
    }

    pub(crate) async fn run(mut self) {
        let mut ticker = tokio::time::interval_at(Instant::now() + self.interval, self.interval);
        ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);
        let mut pending = BTreeMap::<Key, Vec<Response>>::new();
        let mut running = BTreeSet::new();
        let mut reconciliations = FuturesUnordered::<ReconcileFuture<Key>>::new();
        self.enqueue_all(&mut pending).await;

        loop {
            self.start_pending(&mut pending, &mut running, &reconciliations);
            tokio::select! {
                biased;
                request = self.receiver.recv() => {
                    let Some(request) = request else { return; };
                    enqueue(request, &mut pending);
                    while let Ok(request) = self.receiver.try_recv() {
                        enqueue(request, &mut pending);
                    }
                }
                _ = ticker.tick() => self.enqueue_all(&mut pending).await,
                Some((key, responses, result)) = reconciliations.next(), if !reconciliations.is_empty() => {
                    running.remove(&key);
                    if let Err(error) = &result {
                        (self.on_error)(Some(key), error);
                    }
                    let response = result.as_ref().copied().map_err(ReconcileFailure::classify);
                    for sender in responses {
                        let _ignored = sender.send(response.clone());
                    }
                }
            }
        }
    }

    async fn enqueue_all(&self, pending: &mut BTreeMap<Key, Vec<Response>>) {
        match self.source.list_keys().await {
            Ok(keys) => {
                for key in keys {
                    pending.entry(key).or_default();
                }
            }
            Err(error) => (self.on_error)(None, &error),
        }
    }

    fn start_pending(
        &self,
        pending: &mut BTreeMap<Key, Vec<Response>>,
        running: &mut BTreeSet<Key>,
        reconciliations: &FuturesUnordered<ReconcileFuture<Key>>,
    ) {
        while running.len() < MAX_CONCURRENT_RECONCILES {
            let Some(key) = pending.keys().find(|key| !running.contains(key)).copied() else {
                break;
            };
            let responses = pending.remove(&key).unwrap_or_default();
            running.insert(key);
            let reconciler = self.reconciler.clone();
            reconciliations.push(async move { (key, responses, reconciler.reconcile(key).await) }.boxed_local());
        }
    }
}

const fn transient(message: String) -> ReconcileFailure {
    ReconcileFailure {
        kind: FailureKind::Transient,
        message,
    }
}

fn enqueue<Key: Ord>(request: Request<Key>, pending: &mut BTreeMap<Key, Vec<Response>>) {
    let responses = pending.entry(request.key).or_default();
    if let Some(response) = request.response {
        responses.push(response);
    }
}
