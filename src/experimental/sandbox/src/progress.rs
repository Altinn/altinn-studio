//! Observable progress for Sandbox operations.

use std::{
    fmt,
    future::{IntoFuture, poll_fn},
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use bytes::Bytes;
use futures_core::{Stream, stream::FusedStream};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::{Error, LocalFuture, SandboxHandle};

const EVENT_CAPACITY: usize = 64;

/// One stable phase of ensuring that a Sandbox is ready.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[non_exhaustive]
pub enum SandboxPhase {
    /// Validate the backend-neutral request.
    Validate,
    /// Look up an existing Sandbox with the requested name.
    Lookup,
    /// Discover and verify required Backend Features.
    FeatureDiscovery,
    /// Resolve the immutable Image.
    ImageResolve,
    /// Export or import a prepared Image.
    ImagePrepare,
    /// Materialize the Sandbox around the resolved Image.
    SandboxCreate,
    /// Reconcile mutable Sandbox configuration.
    SandboxUpdate,
    /// Start or reconnect the independently selected Network Backend.
    NetworkStart,
    /// Start the Sandbox.
    SandboxStart,
    /// Inspect the resulting Sandbox state.
    Inspect,
}

impl fmt::Display for SandboxPhase {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Validate => "Validate Sandbox request",
            Self::Lookup => "Look up Sandbox",
            Self::FeatureDiscovery => "Discover Sandbox Capabilities",
            Self::ImageResolve => "Resolve Sandbox Image",
            Self::ImagePrepare => "Prepare Sandbox Image",
            Self::SandboxCreate => "Create Sandbox",
            Self::SandboxUpdate => "Update Sandbox",
            Self::NetworkStart => "Start Sandbox Network",
            Self::SandboxStart => "Start Sandbox",
            Self::Inspect => "Inspect Sandbox",
        })
    }
}

/// Correlates progress for one implementation-specific step independently of its label.
#[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct StepId(Uuid);

impl fmt::Display for StepId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

/// How a successful provisioning phase reached its desired state.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum PhaseOutcome {
    /// The phase performed work.
    Completed,
    /// Existing materialized state already satisfied the phase.
    Reused,
}

/// Unit attached to a numeric progress update.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ProgressUnit {
    /// A byte count.
    Bytes,
    /// A count of discrete items.
    Items,
}

/// Output stream associated with one provisioning step.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum OutputStream {
    /// Normal diagnostic output.
    Stdout,
    /// Warning or error diagnostic output.
    Stderr,
}

/// One non-terminal event emitted while a Sandbox operation is running.
#[derive(Clone, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum SandboxEvent {
    /// A stable lifecycle phase started.
    PhaseStarted {
        /// Phase being performed.
        phase: SandboxPhase,
    },
    /// A stable lifecycle phase completed successfully.
    PhaseCompleted {
        /// Phase that completed.
        phase: SandboxPhase,
        /// Whether the phase performed work or reused existing state.
        outcome: PhaseOutcome,
        /// Time spent in this phase.
        elapsed: Duration,
    },
    /// One implementation-specific step started within a stable phase.
    StepStarted {
        /// Stable phase containing the step.
        phase: SandboxPhase,
        /// Opaque correlation identifier for this step occurrence.
        id: StepId,
        /// Human-readable step name. Consumers must not interpret it as a stable identifier.
        name: String,
    },
    /// Numeric progress for one implementation-specific step.
    StepProgress {
        /// Stable phase containing the step.
        phase: SandboxPhase,
        /// Opaque correlation identifier for this step occurrence.
        id: StepId,
        /// Human-readable step name. Consumers must not interpret it as a stable identifier.
        name: String,
        /// Work completed so far.
        completed: u64,
        /// Total work, when it is known.
        total: Option<u64>,
        /// Unit used by the numeric values.
        unit: ProgressUnit,
    },
    /// Raw diagnostic output from one implementation-specific step.
    StepOutput {
        /// Stable phase containing the step.
        phase: SandboxPhase,
        /// Opaque correlation identifier for this step occurrence.
        id: StepId,
        /// Human-readable step name. Consumers must not interpret it as a stable identifier.
        name: String,
        /// Stream on which the output was produced.
        stream: OutputStream,
        /// Raw output bytes.
        bytes: Bytes,
    },
    /// One implementation-specific step completed successfully.
    StepCompleted {
        /// Stable phase containing the step.
        phase: SandboxPhase,
        /// Opaque correlation identifier for this step occurrence.
        id: StepId,
        /// Human-readable step name. Consumers must not interpret it as a stable identifier.
        name: String,
        /// Time spent in this step.
        elapsed: Duration,
    },
}

/// One item yielded by a [`PendingOperation`].
#[derive(Clone, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum OperationEvent<T> {
    /// Non-terminal observable progress.
    Progress(SandboxEvent),
    /// Successful terminal result.
    Ready(T),
}

/// Reports progress from inside one implementation-owned operation.
///
/// Callers receive [`PendingOperation`] instead of constructing or passing a
/// reporter. Sandbox and Image Backend implementations obtain this reporter from
/// [`PendingOperation::run`].
#[derive(Clone)]
pub struct SandboxProgress {
    events: SandboxEvents,
    phase: SandboxPhase,
}

impl SandboxProgress {
    /// Returns the stable phase containing implementation-specific steps.
    #[must_use]
    pub const fn phase(&self) -> SandboxPhase {
        self.phase
    }

    /// Starts an implementation-specific step and returns its reporting token.
    pub async fn start_step(&self, name: impl Into<String>) -> ProgressStep {
        let name = name.into();
        let id = StepId(Uuid::new_v4());
        self.events
            .emit(SandboxEvent::StepStarted {
                phase: self.phase,
                id: id.clone(),
                name: name.clone(),
            })
            .await;
        ProgressStep {
            events: self.events.clone(),
            phase: self.phase,
            id,
            name,
        }
    }
}

/// Reporting token for one in-flight implementation-specific step.
#[must_use = "a started progress step should be reported through its token"]
pub struct ProgressStep {
    events: SandboxEvents,
    phase: SandboxPhase,
    id: StepId,
    name: String,
}

impl ProgressStep {
    /// Reports numeric progress for an implementation-specific step.
    pub async fn progress(&self, completed: u64, total: Option<u64>, unit: ProgressUnit) {
        self.events
            .emit(SandboxEvent::StepProgress {
                phase: self.phase,
                id: self.id.clone(),
                name: self.name.clone(),
                completed,
                total,
                unit,
            })
            .await;
    }

    /// Reports raw output from one implementation-specific step.
    pub async fn output(&self, stream: OutputStream, bytes: impl Into<Bytes>) {
        self.events
            .emit(SandboxEvent::StepOutput {
                phase: self.phase,
                id: self.id.clone(),
                name: self.name.clone(),
                stream,
                bytes: bytes.into(),
            })
            .await;
    }

    /// Reports that an implementation-specific step completed successfully.
    pub async fn complete(self, elapsed: Duration) {
        self.events
            .emit(SandboxEvent::StepCompleted {
                phase: self.phase,
                id: self.id,
                name: self.name,
                elapsed,
            })
            .await;
    }
}

/// An observable operation that terminates with either one value or an Error.
///
/// Polling this value as a [`Stream`] drives the operation and exposes its
/// progress. Awaiting it through [`IntoFuture`] drains progress and returns
/// only the terminal result. Dropping it cancels the in-flight future.
pub struct PendingOperation<'a, T> {
    events: mpsc::Receiver<SandboxEvent>,
    driver: Option<LocalFuture<'a, Result<T, Error>>>,
    result: Option<Result<T, Error>>,
    terminated: bool,
}

/// An operation that terminates with a ready, operable Sandbox handle.
pub type PendingSandbox<'a> = PendingOperation<'a, SandboxHandle>;

impl<'a, T> PendingOperation<'a, T> {
    /// Creates an observable operation implemented by one stable phase.
    ///
    /// The operation owns its progress reporter. Consumers only receive the
    /// returned stream/future and cannot inject a mismatched phase or sink.
    pub fn run<F>(phase: SandboxPhase, operation: F) -> Self
    where
        F: FnOnce(SandboxProgress) -> LocalFuture<'a, Result<T, Error>>,
    {
        let (events, receiver) = SandboxEvents::channel();
        let progress = events.progress(phase);
        drop(events);
        Self::new(receiver, operation(progress))
    }

    pub(crate) fn with_events<F>(operation: F) -> Self
    where
        F: FnOnce(SandboxEvents) -> LocalFuture<'a, Result<T, Error>>,
    {
        let (events, receiver) = SandboxEvents::channel();
        let driver = operation(events);
        Self::new(receiver, driver)
    }

    fn new(events: mpsc::Receiver<SandboxEvent>, driver: LocalFuture<'a, Result<T, Error>>) -> Self {
        Self {
            events,
            driver: Some(driver),
            result: None,
            terminated: false,
        }
    }

    /// Drives the operation to completion while discarding progress events.
    ///
    /// # Errors
    ///
    /// Returns the terminal operation Error, or an invariant error if the
    /// operation ends without producing a value or Error.
    pub async fn finish(mut self) -> Result<T, Error> {
        while let Some(event) = poll_fn(|context| Pin::new(&mut self).poll_next(context)).await {
            match event? {
                OperationEvent::Ready(value) => return Ok(value),
                OperationEvent::Progress(_) => {}
            }
        }
        Err(Error::OperationStreamEnded)
    }

    pub(crate) async fn forward(mut self, events: &SandboxEvents) -> Result<T, Error> {
        while let Some(event) = poll_fn(|context| Pin::new(&mut self).poll_next(context)).await {
            match event? {
                OperationEvent::Progress(event) => events.emit(event).await,
                OperationEvent::Ready(value) => return Ok(value),
            }
        }
        Err(Error::OperationStreamEnded)
    }
}

impl<T> Unpin for PendingOperation<'_, T> {}

impl<T> Stream for PendingOperation<'_, T> {
    type Item = Result<OperationEvent<T>, Error>;

    fn poll_next(mut self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if self.terminated {
            return Poll::Ready(None);
        }

        if let Poll::Ready(Some(event)) = self.events.poll_recv(context) {
            return Poll::Ready(Some(Ok(OperationEvent::Progress(event))));
        }

        if self.result.is_none()
            && let Some(driver) = self.driver.as_mut()
            && let Poll::Ready(result) = driver.as_mut().poll(context)
        {
            self.driver = None;
            self.result = Some(result);
        }

        if let Poll::Ready(Some(event)) = self.events.poll_recv(context) {
            return Poll::Ready(Some(Ok(OperationEvent::Progress(event))));
        }

        if let Some(result) = self.result.take() {
            self.terminated = true;
            return Poll::Ready(Some(result.map(OperationEvent::Ready)));
        }

        Poll::Pending
    }
}

impl<T> FusedStream for PendingOperation<'_, T> {
    fn is_terminated(&self) -> bool {
        self.terminated
    }
}

impl<'a, T: 'a> IntoFuture for PendingOperation<'a, T> {
    type Output = Result<T, Error>;
    type IntoFuture = LocalFuture<'a, Self::Output>;

    fn into_future(self) -> Self::IntoFuture {
        Box::pin(self.finish())
    }
}

#[derive(Clone)]
pub(crate) struct SandboxEvents {
    sender: mpsc::Sender<SandboxEvent>,
}

impl SandboxEvents {
    fn channel() -> (Self, mpsc::Receiver<SandboxEvent>) {
        let (sender, receiver) = mpsc::channel(EVENT_CAPACITY);
        (Self { sender }, receiver)
    }

    fn progress(&self, phase: SandboxPhase) -> SandboxProgress {
        SandboxProgress {
            events: self.clone(),
            phase,
        }
    }

    pub(crate) async fn phase_started(&self, phase: SandboxPhase) {
        self.emit(SandboxEvent::PhaseStarted { phase }).await;
    }

    pub(crate) async fn phase_completed(&self, phase: SandboxPhase, outcome: PhaseOutcome, elapsed: Duration) {
        self.emit(SandboxEvent::PhaseCompleted {
            phase,
            outcome,
            elapsed,
        })
        .await;
    }

    async fn emit(&self, event: SandboxEvent) {
        let _ = self.sender.send(event).await;
    }
}
