//! Observable progress for Sandbox operations.
//!
//! Implementations report through phase spans and step tokens, and consumers
//! read the events folded into a [`Progress`]. A step belongs to the phase in
//! progress and reports at most one quantity, in the unit it started with.
//! Every phase and step ends once, as completed, reused or failed: a
//! producer ends the ones it finishes, and the fold ends whatever is still
//! open when the operation ends.

use std::{
    borrow::Cow,
    fmt,
    future::{IntoFuture, poll_fn},
    pin::Pin,
    rc::Rc,
    task::{Context, Poll},
    time::{Duration, Instant},
};

use bytes::Bytes;
use futures_core::{Stream, stream::FusedStream};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::{Error, LocalFuture, SandboxHandle};

mod fold;

pub use fold::{
    ActivePhase, ActiveStep, FinishedPhase, FinishedStep, Measurement, OperationStatus, OutputLine, OutputLog,
    Progress, ProgressCursor, Update,
};

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

impl SandboxPhase {
    /// Returns the stable identifier and label reported for this phase.
    #[must_use]
    pub const fn phase(self) -> Phase {
        let (id, label) = match self {
            Self::Validate => ("validate", "Validate Sandbox request"),
            Self::Lookup => ("lookup", "Look up Sandbox"),
            Self::FeatureDiscovery => ("featureDiscovery", "Discover Sandbox Capabilities"),
            Self::ImageResolve => ("imageResolve", "Resolve Sandbox Image"),
            Self::ImagePrepare => ("imagePrepare", "Prepare Sandbox Image"),
            Self::SandboxCreate => ("sandboxCreate", "Create Sandbox"),
            Self::SandboxUpdate => ("sandboxUpdate", "Update Sandbox"),
            Self::NetworkStart => ("networkStart", "Start Sandbox Network"),
            Self::SandboxStart => ("sandboxStart", "Start Sandbox"),
            Self::Inspect => ("inspect", "Inspect Sandbox"),
        };
        Phase::new(id, label)
    }
}

impl fmt::Display for SandboxPhase {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.phase().label)
    }
}

/// Identity of one reported phase: a stable machine identifier and a label.
///
/// Sandbox phases come from [`SandboxPhase`]; callers that extend an operation
/// with work of their own report it under identifiers of their own.
#[derive(Clone, Debug, Eq, Hash, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct Phase {
    /// Stable identifier, such as `imageResolve`.
    pub id: Cow<'static, str>,
    /// Human-readable label.
    pub label: Cow<'static, str>,
}

impl Phase {
    /// Creates a phase identity from static text.
    #[must_use]
    pub const fn new(id: &'static str, label: &'static str) -> Self {
        Self {
            id: Cow::Borrowed(id),
            label: Cow::Borrowed(label),
        }
    }
}

impl From<SandboxPhase> for Phase {
    fn from(phase: SandboxPhase) -> Self {
        phase.phase()
    }
}

/// Correlates the events of one step occurrence independently of its name.
#[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd, serde::Deserialize, serde::Serialize)]
#[serde(transparent)]
pub struct StepId(Uuid);

impl StepId {
    /// Creates a new unique step identity.
    #[must_use]
    pub fn generate() -> Self {
        Self(Uuid::new_v4())
    }
}

impl fmt::Display for StepId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

/// How a phase or step ended.
#[derive(Clone, Copy, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub enum Outcome {
    /// The work was performed.
    Completed,
    /// Existing materialized state already satisfied it.
    Reused,
    /// It did not finish: the operation failed or the work was abandoned.
    Failed,
}

/// Unit of a measured step's quantity.
#[derive(Clone, Copy, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub enum ProgressUnit {
    /// A byte count.
    Bytes,
    /// A count of discrete items.
    Items,
}

/// Output stream of one step.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub enum OutputStream {
    /// Normal diagnostic output.
    Stdout,
    /// Warning or error diagnostic output.
    Stderr,
}

/// One non-terminal event emitted while an operation is running.
#[derive(Clone, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ProgressEvent {
    /// A phase started.
    PhaseStarted {
        /// Phase being performed.
        phase: Phase,
    },
    /// A phase ended.
    PhaseEnded {
        /// Phase that ended.
        phase: Phase,
        /// How it ended.
        outcome: Outcome,
        /// Time spent in the phase.
        elapsed: Duration,
    },
    /// An implementation-specific step started within the phase in progress.
    StepStarted {
        /// Correlation identity for this step occurrence.
        id: StepId,
        /// Human-readable step name. It is not a stable identifier.
        name: String,
        /// Unit of the step's quantity, for a measured step.
        unit: Option<ProgressUnit>,
        /// Total quantity, when it is known at the start.
        total: Option<u64>,
    },
    /// The quantity of a measured step advanced.
    StepProgress {
        /// Step being measured.
        id: StepId,
        /// Work completed so far, in the step's unit.
        completed: u64,
        /// Total work, when it is known.
        total: Option<u64>,
    },
    /// Raw diagnostic output from a step.
    StepOutput {
        /// Step producing the output.
        id: StepId,
        /// Stream the output was produced on.
        stream: OutputStream,
        /// Raw output bytes; not necessarily whole lines.
        bytes: Bytes,
    },
    /// A step ended.
    StepEnded {
        /// Step that ended.
        id: StepId,
        /// How it ended.
        outcome: Outcome,
        /// Time spent in the step.
        elapsed: Duration,
    },
}

/// One item yielded by a [`PendingOperation`].
#[derive(Clone, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum OperationEvent<T> {
    /// Non-terminal observable progress.
    Progress(ProgressEvent),
    /// Successful terminal result.
    Ready(T),
}

/// Reports the steps of the phase in progress.
///
/// Sandbox and Image Backend implementations obtain one from
/// [`PendingOperation::run`]; a caller that extends an operation with work of
/// its own gets one from [`ProgressReporter::steps`].
#[derive(Clone)]
pub struct SandboxProgress {
    reporter: ProgressReporter,
}

impl SandboxProgress {
    /// Starts a step without a quantity and returns its reporting token.
    pub async fn start_step(&self, name: impl Into<String>) -> ProgressStep {
        self.start(name.into(), None, None).await
    }

    /// Starts a step that reports one quantity in `unit`.
    pub async fn start_measured_step(
        &self,
        name: impl Into<String>,
        unit: ProgressUnit,
        total: Option<u64>,
    ) -> MeasuredStep {
        MeasuredStep {
            step: self.start(name.into(), Some(unit), total).await,
        }
    }

    async fn start(&self, name: String, unit: Option<ProgressUnit>, total: Option<u64>) -> ProgressStep {
        let id = StepId::generate();
        self.reporter
            .emit(ProgressEvent::StepStarted {
                id: id.clone(),
                name,
                unit,
                total,
            })
            .await;
        ProgressStep {
            reporter: self.reporter.clone(),
            id,
            started: Instant::now(),
        }
    }
}

/// Reporting token for one in-flight step.
///
/// A step that is never completed ends as failed when its operation ends.
#[must_use = "a step that is never completed ends as failed"]
pub struct ProgressStep {
    reporter: ProgressReporter,
    id: StepId,
    started: Instant,
}

impl ProgressStep {
    /// Reports raw output from the step.
    pub async fn output(&self, stream: OutputStream, bytes: impl Into<Bytes>) {
        self.reporter
            .emit(ProgressEvent::StepOutput {
                id: self.id.clone(),
                stream,
                bytes: bytes.into(),
            })
            .await;
    }

    /// Ends the step as completed.
    pub async fn complete(self) {
        self.reporter
            .emit(ProgressEvent::StepEnded {
                id: self.id,
                outcome: Outcome::Completed,
                elapsed: self.started.elapsed(),
            })
            .await;
    }
}

/// Reporting token for one in-flight step that measures a single quantity.
#[must_use = "a step that is never completed ends as failed"]
pub struct MeasuredStep {
    step: ProgressStep,
}

impl MeasuredStep {
    /// Reports the quantity completed so far and the total, when known.
    pub async fn report(&self, completed: u64, total: Option<u64>) {
        self.step
            .reporter
            .emit(ProgressEvent::StepProgress {
                id: self.step.id.clone(),
                completed,
                total,
            })
            .await;
    }

    /// Reports raw output from the step.
    pub async fn output(&self, stream: OutputStream, bytes: impl Into<Bytes>) {
        self.step.output(stream, bytes).await;
    }

    /// Ends the step as completed.
    pub async fn complete(self) {
        self.step.complete().await;
    }
}

/// One started phase. A phase that is never ended ends as failed when its
/// operation ends.
#[must_use = "a phase that is never ended ends as failed"]
pub struct PhaseSpan {
    reporter: ProgressReporter,
    phase: Phase,
    started: Instant,
}

impl PhaseSpan {
    /// Ends the phase with `outcome`.
    pub async fn end(self, outcome: Outcome) {
        self.reporter
            .emit(ProgressEvent::PhaseEnded {
                phase: self.phase,
                outcome,
                elapsed: self.started.elapsed(),
            })
            .await;
    }

    /// Ends the phase as completed.
    pub async fn complete(self) {
        self.end(Outcome::Completed).await;
    }
}

/// An observable operation that terminates with either one value or an Error.
///
/// Polling this value as a [`Stream`] drives the operation and exposes its
/// progress. Awaiting it through [`IntoFuture`] drains progress and returns
/// only the terminal result. Dropping it cancels the in-flight future.
///
/// Phases and steps still open when it terminates are ended by the fold of
/// its events; see [`Progress::fail`] and [`Progress::succeed`].
pub struct PendingOperation<'a, T> {
    events: mpsc::Receiver<ProgressEvent>,
    driver: Option<LocalFuture<'a, Result<T, Error>>>,
    result: Option<Result<T, Error>>,
    terminated: bool,
}

/// An operation that terminates with a ready, operable Sandbox handle.
pub type PendingSandbox<'a> = PendingOperation<'a, SandboxHandle>;

impl<'a, T> PendingOperation<'a, T> {
    /// Creates an observable operation whose steps belong to the phase its
    /// caller has in progress.
    ///
    /// The operation owns its progress reporter. Consumers only receive the
    /// returned stream/future and cannot inject a sink.
    pub fn run<F>(operation: F) -> Self
    where
        F: FnOnce(SandboxProgress) -> LocalFuture<'a, Result<T, Error>>,
    {
        let (events, receiver) = ProgressReporter::channel();
        let progress = events.steps();
        drop(events);
        Self::new(receiver, operation(progress))
    }

    pub(crate) fn with_events<F>(operation: F) -> Self
    where
        F: FnOnce(ProgressReporter) -> LocalFuture<'a, Result<T, Error>>,
    {
        let (events, receiver) = ProgressReporter::channel();
        let driver = operation(events);
        Self::new(receiver, driver)
    }

    fn new(events: mpsc::Receiver<ProgressEvent>, driver: LocalFuture<'a, Result<T, Error>>) -> Self {
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

    /// Drives the operation to completion while reporting its progress to `events`.
    ///
    /// # Errors
    ///
    /// Returns the terminal operation Error, or an invariant error if the
    /// operation ends without producing a value or Error.
    pub async fn forward(mut self, events: &ProgressReporter) -> Result<T, Error> {
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

/// Where progress events go: the stream of a [`PendingOperation`], or a
/// caller's callback.
#[derive(Clone)]
pub struct ProgressReporter {
    sink: Sink,
}

#[derive(Clone)]
enum Sink {
    Operation(mpsc::Sender<ProgressEvent>),
    Callback(Rc<dyn Fn(ProgressEvent)>),
}

impl ProgressReporter {
    /// Reports to `callback`. Whoever folds the events ends the work that is
    /// still open when the operation ends, as [`Progress::succeed`] and
    /// [`Progress::fail`] do.
    pub fn from_callback(callback: impl Fn(ProgressEvent) + 'static) -> Self {
        Self {
            sink: Sink::Callback(Rc::new(callback)),
        }
    }

    fn channel() -> (Self, mpsc::Receiver<ProgressEvent>) {
        let (sender, receiver) = mpsc::channel(EVENT_CAPACITY);
        (
            Self {
                sink: Sink::Operation(sender),
            },
            receiver,
        )
    }

    /// Starts a phase.
    pub async fn start_phase(&self, phase: impl Into<Phase>) -> PhaseSpan {
        let phase = phase.into();
        self.emit(ProgressEvent::PhaseStarted { phase: phase.clone() }).await;
        PhaseSpan {
            reporter: self.clone(),
            phase,
            started: Instant::now(),
        }
    }

    /// Returns the reporter for steps of the phase in progress.
    #[must_use]
    pub fn steps(&self) -> SandboxProgress {
        SandboxProgress { reporter: self.clone() }
    }

    async fn emit(&self, event: ProgressEvent) {
        match &self.sink {
            Sink::Operation(sender) => {
                let _ = sender.send(event).await;
            }
            Sink::Callback(callback) => callback(event),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Drives an operation and folds its events, as a consumer does.
    async fn fold<T>(mut operation: PendingOperation<'_, T>) -> Progress {
        let mut progress = Progress::new();
        while let Some(item) = poll_fn(|context| Pin::new(&mut operation).poll_next(context)).await {
            match item {
                Ok(OperationEvent::Progress(event)) => progress.apply(&event),
                Ok(OperationEvent::Ready(_)) => {
                    progress.succeed();
                    break;
                }
                Err(error) => {
                    progress.fail(error.to_string());
                    break;
                }
            }
        }
        progress
    }

    #[tokio::test]
    async fn a_failed_operation_leaves_no_phase_or_step_open() {
        let operation = PendingOperation::<()>::with_events(|events| {
            Box::pin(async move {
                let _span = events.start_phase(SandboxPhase::ImageResolve).await;
                let step = events
                    .steps()
                    .start_measured_step("Pull", ProgressUnit::Bytes, Some(10))
                    .await;
                step.report(4, Some(10)).await;
                Err(Error::Backend("registry unavailable".into()))
            })
        });
        let progress = fold(operation).await;
        assert!(progress.current().is_none());
        let phase = &progress.finished()[0];
        assert_eq!(phase.outcome, Outcome::Failed);
        assert_eq!(phase.steps[0].outcome, Outcome::Failed);
        assert_eq!(
            phase.steps[0].measurement.map(|measurement| measurement.completed),
            Some(4)
        );
    }

    #[tokio::test]
    async fn steps_belong_to_the_phase_in_progress_and_an_abandoned_one_fails() {
        let operation = PendingOperation::<()>::with_events(|events| {
            Box::pin(async move {
                let span = events.start_phase(SandboxPhase::SandboxUpdate).await;
                let backend = PendingOperation::run(|progress| {
                    Box::pin(async move {
                        drop(progress.start_step("Abandoned").await);
                        progress.start_step("Finished").await.complete().await;
                        Ok(())
                    })
                });
                backend.forward(&events).await?;
                span.end(Outcome::Reused).await;
                Ok(())
            })
        });
        let progress = fold(operation).await;
        let [phase] = progress.finished() else {
            panic!("one phase: {progress:?}");
        };
        assert_eq!(phase.phase, SandboxPhase::SandboxUpdate.phase());
        assert_eq!(phase.outcome, Outcome::Reused);
        let steps = phase
            .steps
            .iter()
            .map(|step| (step.name.as_str(), step.outcome))
            .collect::<Vec<_>>();
        assert_eq!(
            steps,
            [("Finished", Outcome::Completed), ("Abandoned", Outcome::Failed)]
        );
    }
}
