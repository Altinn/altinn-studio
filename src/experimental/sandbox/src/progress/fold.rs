//! What an operation's progress means: its events folded into one value.
//!
//! Renderers and observers read a [`Progress`] instead of interpreting events
//! themselves. A [`ProgressCursor`] yields what finished and what was printed
//! since it last looked, so a late or slow observer reads the same value as
//! one that saw every event.

use std::collections::{HashMap, VecDeque};

use time::OffsetDateTime;

use super::{Outcome, OutputStream, Phase, ProgressEvent, ProgressUnit, StepId};

/// Output lines retained per operation.
const OUTPUT_LINES: usize = 1_000;
/// Output text retained per operation, so that a serialized [`Progress`]
/// stays small enough to send in one message even when escaping multiplies it.
const OUTPUT_BYTES: usize = 512 * 1_024;
/// Finished steps retained per phase.
const FINISHED_STEPS: usize = 64;
/// Longest retained output line; longer output is split.
const LINE_BYTES: usize = 4_096;

/// Progress of one operation, folded from its events.
#[derive(Clone, Debug, Default, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    finished: Vec<FinishedPhase>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    current: Option<ActivePhase>,
    #[serde(default, skip_serializing_if = "OutputLog::is_unused")]
    output: OutputLog,
    #[serde(default)]
    status: OperationStatus,
}

/// Whether the operation is still running and how it ended.
#[derive(Clone, Debug, Default, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum OperationStatus {
    /// The operation has not ended.
    #[default]
    Running,
    /// The operation produced its result.
    Succeeded,
    /// The operation failed.
    Failed {
        /// Failure detail.
        detail: String,
    },
}

/// A phase that ended.
#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishedPhase {
    /// Phase identity.
    pub phase: Phase,
    /// How it ended.
    pub outcome: Outcome,
    /// Time spent in the phase, in milliseconds.
    pub elapsed_ms: u64,
    /// The phase's most recent finished steps.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub steps: Vec<FinishedStep>,
    /// Earlier finished steps no longer retained.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub omitted_steps: u64,
    /// Output lines produced before the phase ended, which orders it among them.
    pub output_sequence: u64,
}

/// The phase in progress.
#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivePhase {
    /// Phase identity.
    pub phase: Phase,
    /// When the phase started.
    #[serde(with = "time::serde::rfc3339")]
    pub started_at: OffsetDateTime,
    /// Steps in progress, in the order they started.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub steps: Vec<ActiveStep>,
    /// The phase's most recent finished steps.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub finished_steps: Vec<FinishedStep>,
    /// Earlier finished steps no longer retained.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub omitted_steps: u64,
}

/// A step in progress.
#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveStep {
    /// Step occurrence identity.
    pub id: StepId,
    /// Human-readable step name.
    pub name: String,
    /// When the step started.
    #[serde(with = "time::serde::rfc3339")]
    pub started_at: OffsetDateTime,
    /// The step's quantity, for a measured step once it has reported one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub measurement: Option<Measurement>,
    /// Unit of a measured step, fixed when it started.
    #[serde(skip)]
    unit: Option<ProgressUnit>,
}

/// A step that ended.
#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishedStep {
    /// Human-readable step name.
    pub name: String,
    /// How it ended.
    pub outcome: Outcome,
    /// Time spent in the step, in milliseconds.
    pub elapsed_ms: u64,
    /// The step's final quantity, for a measured step that reported one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub measurement: Option<Measurement>,
    /// Output lines produced before the step ended, which orders it among them.
    pub output_sequence: u64,
}

/// The single quantity a measured step reports.
#[derive(Clone, Copy, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Measurement {
    /// Unit, fixed when the step started.
    pub unit: ProgressUnit,
    /// Work completed so far.
    pub completed: u64,
    /// Total work, when known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total: Option<u64>,
}

/// The most recent output lines of an operation, numbered in the order produced.
#[derive(Clone, Debug, Default, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputLog {
    lines: VecDeque<OutputLine>,
    next_sequence: u64,
    #[serde(skip)]
    bytes: usize,
    #[serde(skip)]
    partial: HashMap<(StepId, OutputStream), Partial>,
}

/// One complete line of step output.
#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputLine {
    /// Position in the operation's output.
    pub sequence: u64,
    /// Name of the step that produced it.
    pub step: String,
    /// Stream it was produced on.
    pub stream: OutputStream,
    /// Line text without its terminator.
    pub text: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct Partial {
    step: String,
    stream: OutputStream,
    bytes: Vec<u8>,
}

/// Something that happened since a [`ProgressCursor`] last looked.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Update<'a> {
    /// Output lines were no longer retained when the cursor caught up.
    OutputSkipped(u64),
    /// One new output line.
    Output(&'a OutputLine),
    /// A step finished.
    StepFinished(&'a FinishedStep),
    /// A phase finished.
    PhaseFinished(&'a FinishedPhase),
}

/// Position of an observer in one [`Progress`].
///
/// A cursor that is ahead of the progress it reads, as happens when a new
/// operation starts, starts over.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressCursor {
    phases: usize,
    steps: u64,
    output: u64,
}

impl Progress {
    /// Creates the progress of an operation that has not reported anything yet.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Phases that ended, in order.
    #[must_use]
    pub fn finished(&self) -> &[FinishedPhase] {
        &self.finished
    }

    /// The phase in progress.
    #[must_use]
    pub const fn current(&self) -> Option<&ActivePhase> {
        self.current.as_ref()
    }

    /// The operation's retained output.
    #[must_use]
    pub const fn output(&self) -> &OutputLog {
        &self.output
    }

    /// Whether the operation is running, succeeded or failed.
    #[must_use]
    pub const fn status(&self) -> &OperationStatus {
        &self.status
    }

    /// The newest step in progress, which renderers show as the current activity.
    #[must_use]
    pub fn current_step(&self) -> Option<&ActiveStep> {
        self.current.as_ref().and_then(|phase| phase.steps.last())
    }

    /// A smaller copy for listings: finished phases keep their outcome but not
    /// their steps, and only the last `output_lines` lines are kept.
    #[must_use]
    pub fn summary(&self, output_lines: usize) -> Self {
        let finished = self
            .finished
            .iter()
            .map(|phase| FinishedPhase {
                steps: Vec::new(),
                omitted_steps: phase.omitted_steps + phase.steps.len() as u64,
                ..phase.clone()
            })
            .collect();
        let current = self.current.as_ref().map(|phase| ActivePhase {
            finished_steps: Vec::new(),
            omitted_steps: phase.omitted_steps + phase.finished_steps.len() as u64,
            ..phase.clone()
        });
        Self {
            finished,
            current,
            output: OutputLog::retained(self.output.tail(output_lines).cloned(), self.output.next_sequence),
            status: self.status.clone(),
        }
    }

    /// A copy without the output lines before `sequence`, for an observer that
    /// already has them.
    #[must_use]
    pub fn output_from(&self, sequence: u64) -> Self {
        Self {
            output: OutputLog::retained(
                self.output
                    .lines
                    .iter()
                    .filter(|line| line.sequence >= sequence)
                    .cloned(),
                self.output.next_sequence,
            ),
            ..self.clone()
        }
    }

    /// Folds one event into the progress.
    pub fn apply(&mut self, event: &ProgressEvent) {
        match event {
            ProgressEvent::PhaseStarted { phase } => self.start_phase(phase.clone()),
            ProgressEvent::PhaseEnded {
                phase,
                outcome,
                elapsed,
            } => {
                if self.current.as_ref().is_some_and(|current| current.phase == *phase) {
                    self.end_phase(*outcome, milliseconds(*elapsed));
                }
            }
            ProgressEvent::StepStarted { id, name, unit, total } => {
                // A step outside any phase breaks the contract and is not shown.
                if let Some(current) = &mut self.current {
                    current.steps.push(ActiveStep {
                        id: id.clone(),
                        name: name.clone(),
                        started_at: OffsetDateTime::now_utc(),
                        // A figure is shown once there is one: a step that never
                        // reports its quantity shows none rather than zero.
                        measurement: unit.zip(*total).map(|(unit, total)| Measurement {
                            unit,
                            completed: 0,
                            total: Some(total),
                        }),
                        unit: *unit,
                    });
                }
            }
            ProgressEvent::StepProgress { id, completed, total } => {
                if let Some(step) = self.active_step_mut(id)
                    && let Some(unit) = step.unit
                {
                    let previous = step.measurement.and_then(|measurement| measurement.total);
                    step.measurement = Some(Measurement {
                        unit,
                        completed: *completed,
                        total: total.or(previous),
                    });
                }
            }
            ProgressEvent::StepOutput { id, stream, bytes } => {
                if let Some(step) = self.active_step(id).map(|step| step.name.clone()) {
                    self.output.append(id, &step, *stream, bytes);
                }
            }
            ProgressEvent::StepEnded { id, outcome, elapsed } => {
                self.output.flush(Some(id));
                self.end_step(id, *outcome, Some(milliseconds(*elapsed)));
            }
        }
    }

    /// Records that the operation produced its result.
    pub fn succeed(&mut self) {
        self.close(Outcome::Completed);
        self.status = OperationStatus::Succeeded;
    }

    /// Records that the operation failed.
    pub fn fail(&mut self, detail: impl Into<String>) {
        self.close(Outcome::Failed);
        self.status = OperationStatus::Failed { detail: detail.into() };
    }

    fn close(&mut self, outcome: Outcome) {
        self.output.flush(None);
        if self.current.is_some() {
            let elapsed = self.current.as_ref().map_or(0, |current| since(current.started_at));
            self.end_phase(outcome, elapsed);
        }
    }

    fn start_phase(&mut self, phase: Phase) {
        if self.current.is_some() {
            self.close(Outcome::Failed);
        }
        self.current = Some(ActivePhase {
            phase,
            started_at: OffsetDateTime::now_utc(),
            steps: Vec::new(),
            finished_steps: Vec::new(),
            omitted_steps: 0,
        });
    }

    fn end_phase(&mut self, outcome: Outcome, elapsed_ms: u64) {
        let open = self
            .current
            .as_ref()
            .map(|current| current.steps.iter().map(|step| step.id.clone()).collect::<Vec<_>>())
            .unwrap_or_default();
        for id in open {
            self.output.flush(Some(&id));
            self.end_step(&id, Outcome::Failed, None);
        }
        if let Some(current) = self.current.take() {
            self.finished.push(FinishedPhase {
                phase: current.phase,
                outcome,
                elapsed_ms,
                steps: current.finished_steps,
                omitted_steps: current.omitted_steps,
                output_sequence: self.output.next_sequence,
            });
        }
    }

    fn end_step(&mut self, id: &StepId, outcome: Outcome, elapsed_ms: Option<u64>) {
        let Some(current) = &mut self.current else {
            return;
        };
        let Some(position) = current.steps.iter().position(|step| step.id == *id) else {
            return;
        };
        let step = current.steps.remove(position);
        if current.finished_steps.len() == FINISHED_STEPS {
            current.finished_steps.remove(0);
            current.omitted_steps += 1;
        }
        current.finished_steps.push(FinishedStep {
            elapsed_ms: elapsed_ms.unwrap_or_else(|| since(step.started_at)),
            name: step.name,
            outcome,
            measurement: step.measurement,
            output_sequence: self.output.next_sequence,
        });
    }

    fn active_step(&self, id: &StepId) -> Option<&ActiveStep> {
        self.current.as_ref()?.steps.iter().find(|step| step.id == *id)
    }

    fn active_step_mut(&mut self, id: &StepId) -> Option<&mut ActiveStep> {
        self.current.as_mut()?.steps.iter_mut().find(|step| step.id == *id)
    }
}

impl OutputLog {
    /// Retained lines, oldest first.
    #[must_use]
    pub fn lines(&self) -> impl ExactSizeIterator<Item = &OutputLine> {
        self.lines.iter()
    }

    /// Whether no line has been retained.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.lines.is_empty()
    }

    /// The most recent `count` lines, oldest first.
    pub fn tail(&self, count: usize) -> impl Iterator<Item = &OutputLine> {
        self.lines.iter().skip(self.lines.len().saturating_sub(count))
    }

    /// Whether no line was ever produced; only then can the log be omitted,
    /// since its next sequence tells an observer where the output stands.
    const fn is_unused(&self) -> bool {
        self.next_sequence == 0
    }

    fn retained(lines: impl Iterator<Item = OutputLine>, next_sequence: u64) -> Self {
        let lines = lines.collect::<VecDeque<_>>();
        Self {
            bytes: lines.iter().map(|line| line.text.len()).sum(),
            lines,
            next_sequence,
            partial: HashMap::new(),
        }
    }

    fn first_sequence(&self) -> u64 {
        self.lines.front().map_or(self.next_sequence, |line| line.sequence)
    }

    fn append(&mut self, id: &StepId, step: &str, stream: OutputStream, bytes: &[u8]) {
        let key = (id.clone(), stream);
        let mut partial = self.partial.remove(&key).unwrap_or_else(|| Partial {
            step: step.to_owned(),
            stream,
            bytes: Vec::new(),
        });
        for &byte in bytes {
            if byte == b'\n' {
                self.push(&partial.step, partial.stream, &std::mem::take(&mut partial.bytes));
            } else {
                partial.bytes.push(byte);
                if partial.bytes.len() == LINE_BYTES {
                    self.push(&partial.step, partial.stream, &std::mem::take(&mut partial.bytes));
                }
            }
        }
        if !partial.bytes.is_empty() {
            self.partial.insert(key, partial);
        }
    }

    /// Ends unterminated lines of one step, or of every step.
    fn flush(&mut self, id: Option<&StepId>) {
        let keys = self
            .partial
            .keys()
            .filter(|(step, _)| id.is_none_or(|id| step == id))
            .cloned()
            .collect::<Vec<_>>();
        for key in keys {
            if let Some(partial) = self.partial.remove(&key) {
                self.push(&partial.step, partial.stream, &partial.bytes);
            }
        }
    }

    fn push(&mut self, step: &str, stream: OutputStream, bytes: &[u8]) {
        let text = String::from_utf8_lossy(bytes);
        let text = text.trim_end();
        if text.trim_start().is_empty() {
            return;
        }
        while self.lines.len() >= OUTPUT_LINES || (!self.lines.is_empty() && self.bytes + text.len() > OUTPUT_BYTES) {
            if let Some(line) = self.lines.pop_front() {
                self.bytes -= line.text.len();
            }
        }
        self.bytes += text.len();
        self.lines.push_back(OutputLine {
            sequence: self.next_sequence,
            step: step.to_owned(),
            stream,
            text: text.to_owned(),
        });
        self.next_sequence += 1;
    }
}

impl ProgressCursor {
    /// Creates a cursor at the start of an operation.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            phases: 0,
            steps: 0,
            output: 0,
        }
    }

    /// Sequence number of the first output line not yet returned.
    #[must_use]
    pub const fn output_sequence(&self) -> u64 {
        self.output
    }

    /// Returns what happened since the last call, in the order it happened,
    /// and moves past it.
    pub fn updates<'a>(&mut self, progress: &'a Progress) -> Vec<Update<'a>> {
        if self.phases > progress.finished.len() || self.output > progress.output.next_sequence {
            *self = Self::default();
        }
        let mut finished = Vec::new();
        for phase in &progress.finished[self.phases..] {
            push_steps(&mut finished, &phase.steps, phase.omitted_steps, self.steps);
            finished.push((phase.output_sequence, Update::PhaseFinished(phase)));
            self.steps = 0;
        }
        self.phases = progress.finished.len();
        if let Some(current) = &progress.current {
            push_steps(
                &mut finished,
                &current.finished_steps,
                current.omitted_steps,
                self.steps,
            );
            self.steps = current.omitted_steps + current.finished_steps.len() as u64;
        }

        let mut updates = Vec::new();
        let first = progress.output.first_sequence();
        if self.output < first {
            updates.push(Update::OutputSkipped(first - self.output));
            self.output = first;
        }
        let mut finished = finished.into_iter().peekable();
        for line in progress.output.lines.iter().filter(|line| line.sequence >= self.output) {
            while let Some((_, update)) = finished.next_if(|(before, _)| *before <= line.sequence) {
                updates.push(update);
            }
            updates.push(Update::Output(line));
        }
        updates.extend(finished.map(|(_, update)| update));
        self.output = progress.output.next_sequence;
        updates
    }
}

/// Adds the steps not yet seen, each with the output position it ended at.
fn push_steps<'a>(finished: &mut Vec<(u64, Update<'a>)>, steps: &'a [FinishedStep], omitted: u64, seen: u64) {
    let skip = usize::try_from(seen.saturating_sub(omitted)).unwrap_or(usize::MAX);
    finished.extend(
        steps
            .iter()
            .skip(skip)
            .map(|step| (step.output_sequence, Update::StepFinished(step))),
    );
}

fn milliseconds(duration: std::time::Duration) -> u64 {
    u64::try_from(duration.as_millis()).unwrap_or(u64::MAX)
}

fn since(started_at: OffsetDateTime) -> u64 {
    u64::try_from((OffsetDateTime::now_utc() - started_at).whole_milliseconds()).unwrap_or(0)
}

#[allow(clippy::trivially_copy_pass_by_ref)]
const fn is_zero(value: &u64) -> bool {
    *value == 0
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;
    use crate::SandboxPhase;

    fn phase_started() -> ProgressEvent {
        ProgressEvent::PhaseStarted {
            phase: SandboxPhase::ImageResolve.phase(),
        }
    }

    fn step_started(id: &StepId, name: &str, unit: Option<ProgressUnit>) -> ProgressEvent {
        ProgressEvent::StepStarted {
            id: id.clone(),
            name: name.into(),
            unit,
            total: None,
        }
    }

    fn output(id: &StepId, text: &str) -> ProgressEvent {
        ProgressEvent::StepOutput {
            id: id.clone(),
            stream: OutputStream::Stdout,
            bytes: text.as_bytes().to_vec().into(),
        }
    }

    fn ended(id: &StepId) -> ProgressEvent {
        ProgressEvent::StepEnded {
            id: id.clone(),
            outcome: Outcome::Completed,
            elapsed: Duration::from_millis(5),
        }
    }

    #[test]
    fn a_measured_step_shows_no_figure_until_it_reports_one() {
        let mut progress = Progress::new();
        let build = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&build, "Build", Some(ProgressUnit::Bytes)));
        assert_eq!(progress.current_step().expect("step").measurement, None);

        let export = StepId::generate();
        progress.apply(&step_started(&export, "Export", Some(ProgressUnit::Bytes)));
        progress.apply(&ProgressEvent::StepProgress {
            id: export.clone(),
            completed: 7,
            total: None,
        });
        progress.apply(&ended(&build));
        progress.apply(&ended(&export));
        progress.succeed();

        let steps = &progress.finished()[0].steps;
        assert_eq!(steps[0].measurement, None, "a step that never reported has no figure");
        assert_eq!(
            steps[1].measurement,
            Some(Measurement {
                unit: ProgressUnit::Bytes,
                completed: 7,
                total: None,
            })
        );
    }

    #[test]
    fn retained_output_is_bounded_by_bytes_as_well_as_lines() {
        let mut progress = Progress::new();
        let step = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&step, "Build", None));
        let long = "x".repeat(LINE_BYTES - 1);
        for _ in 0..OUTPUT_LINES {
            progress.apply(&output(&step, &format!("{long}\n")));
        }

        let retained = progress
            .output()
            .tail(usize::MAX)
            .map(|line| line.text.len())
            .sum::<usize>();
        assert!(retained <= OUTPUT_BYTES, "{retained} bytes retained");
        assert_eq!(
            progress.output().tail(usize::MAX).count(),
            OUTPUT_BYTES / (LINE_BYTES - 1),
            "the oldest lines make room"
        );
        assert_eq!(
            progress.output().next_sequence,
            OUTPUT_LINES as u64,
            "every line is still numbered"
        );
        let from = progress.output_from(0);
        assert_eq!(
            from.output().tail(usize::MAX).count(),
            progress.output().tail(usize::MAX).count()
        );
    }

    #[test]
    fn folds_phases_measured_steps_and_line_output() {
        let mut progress = Progress::new();
        let pull = StepId::generate();
        progress.apply(&ProgressEvent::PhaseStarted {
            phase: SandboxPhase::ImageResolve.phase(),
        });
        progress.apply(&step_started(&pull, "Pull", Some(ProgressUnit::Bytes)));
        progress.apply(&ProgressEvent::StepProgress {
            id: pull.clone(),
            completed: 40,
            total: Some(100),
        });
        progress.apply(&output(&pull, "layer 1 do"));
        progress.apply(&output(&pull, "ne\nlayer 2 done\npartial"));

        let step = progress.current_step().expect("step in progress");
        assert_eq!(
            step.measurement,
            Some(Measurement {
                unit: ProgressUnit::Bytes,
                completed: 40,
                total: Some(100),
            })
        );
        let lines = progress
            .output()
            .lines()
            .map(|line| line.text.as_str())
            .collect::<Vec<_>>();
        assert_eq!(lines, ["layer 1 done", "layer 2 done"]);

        progress.apply(&ended(&pull));
        progress.apply(&ProgressEvent::PhaseEnded {
            phase: SandboxPhase::ImageResolve.phase(),
            outcome: Outcome::Completed,
            elapsed: Duration::from_millis(9),
        });
        progress.succeed();
        assert_eq!(
            progress.output().lines().last().map(|line| line.text.as_str()),
            Some("partial")
        );
        assert_eq!(progress.finished()[0].steps[0].name, "Pull");
        assert_eq!(progress.status(), &OperationStatus::Succeeded);
    }

    #[test]
    fn failing_ends_open_work_and_keeps_the_detail() {
        let mut progress = Progress::new();
        let build = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&build, "Build", None));
        progress.fail("build failed");
        assert!(progress.current().is_none());
        let phase = &progress.finished()[0];
        assert_eq!(phase.outcome, Outcome::Failed);
        assert_eq!(phase.steps[0].outcome, Outcome::Failed);
        assert_eq!(
            progress.status(),
            &OperationStatus::Failed {
                detail: "build failed".into()
            }
        );
    }

    #[test]
    fn a_cursor_yields_each_line_and_finished_step_once_and_reports_skipped_output() {
        let mut progress = Progress::new();
        let mut cursor = ProgressCursor::default();
        let step = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&step, "Build", None));
        progress.apply(&output(&step, "one\n"));
        assert_eq!(cursor.updates(&progress).len(), 1);
        assert!(cursor.updates(&progress).is_empty(), "nothing new");

        for line in 0..(OUTPUT_LINES + 5) {
            progress.apply(&output(&step, &format!("{line}\n")));
        }
        progress.apply(&ended(&step));
        let updates = cursor.updates(&progress);
        assert_eq!(updates[0], Update::OutputSkipped(5));
        assert!(matches!(
            updates.last(),
            Some(Update::StepFinished(step)) if step.name == "Build"
        ));
        assert_eq!(
            updates
                .iter()
                .filter(|update| matches!(update, Update::Output(_)))
                .count(),
            OUTPUT_LINES
        );

        progress.succeed();
        assert!(
            matches!(cursor.updates(&progress).as_slice(), [Update::PhaseFinished(_)]),
            "the phase's step was already reported"
        );
    }

    #[test]
    fn a_late_cursor_sees_the_whole_retained_history_and_a_stale_one_starts_over() {
        let mut progress = Progress::new();
        let step = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&step, "Build", None));
        progress.apply(&ended(&step));
        progress.succeed();
        let mut cursor = ProgressCursor::default();
        assert_eq!(cursor.updates(&progress).len(), 2);

        let fresh = Progress::new();
        assert!(cursor.updates(&fresh).is_empty());
        assert_eq!(cursor, ProgressCursor::default());
    }

    #[test]
    fn a_summary_keeps_outcomes_and_the_output_tail() {
        let mut progress = Progress::new();
        let step = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&step, "Build", None));
        progress.apply(&output(&step, "one\ntwo\nthree\n"));
        progress.apply(&ended(&step));
        progress.fail("build failed");
        let summary = progress.summary(2);
        assert!(summary.finished()[0].steps.is_empty());
        assert_eq!(summary.finished()[0].omitted_steps, 1);
        assert_eq!(summary.finished()[0].outcome, Outcome::Failed);
        let lines = summary
            .output()
            .lines()
            .map(|line| line.text.as_str())
            .collect::<Vec<_>>();
        assert_eq!(lines, ["two", "three"]);
        assert_eq!(summary.status(), progress.status());
    }

    #[test]
    fn output_from_keeps_later_lines_and_a_cursor_reads_them_as_new() {
        let mut progress = Progress::new();
        let step = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&step, "Build", None));
        progress.apply(&output(&step, "one\ntwo\n"));
        let mut cursor = ProgressCursor::default();
        assert_eq!(cursor.updates(&progress.output_from(0)).len(), 2);
        progress.apply(&output(&step, "three\n"));
        let trimmed = progress.output_from(2);
        assert_eq!(trimmed.output().lines().count(), 1);
        assert!(matches!(
            cursor.updates(&trimmed).as_slice(),
            [Update::Output(line)] if line.text == "three"
        ));
    }

    #[test]
    fn updates_keep_output_and_endings_in_the_order_they_happened() {
        let mut progress = Progress::new();
        let first = StepId::generate();
        let second = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&first, "First", None));
        progress.apply(&output(&first, "first output\n"));
        progress.apply(&ended(&first));
        progress.apply(&step_started(&second, "Second", None));
        progress.apply(&output(&second, "second output\n"));
        let order = ProgressCursor::new()
            .updates(&progress)
            .into_iter()
            .map(|update| match update {
                Update::Output(line) => line.text.clone(),
                Update::StepFinished(step) => format!("end {}", step.name),
                other => format!("{other:?}"),
            })
            .collect::<Vec<_>>();
        assert_eq!(order, ["first output", "end First", "second output"]);
    }

    #[test]
    fn progress_round_trips_through_json_without_partial_lines() {
        let mut progress = Progress::new();
        let step = StepId::generate();
        progress.apply(&phase_started());
        progress.apply(&step_started(&step, "Build", Some(ProgressUnit::Items)));
        progress.apply(&ProgressEvent::StepProgress {
            id: step.clone(),
            completed: 1,
            total: Some(2),
        });
        progress.apply(&output(&step, "done\nhalf"));
        let json = serde_json::to_value(&progress).expect("progress JSON");
        assert_eq!(json["current"]["phase"]["id"], "imageResolve");
        assert_eq!(json["current"]["steps"][0]["measurement"]["unit"], "items");
        assert_eq!(json["status"]["state"], "running");
        let decoded: Progress = serde_json::from_value(json).expect("progress from JSON");
        assert_eq!(decoded.output().lines().count(), 1);

        let trimmed = serde_json::to_value(progress.output_from(1)).expect("trimmed progress JSON");
        let decoded: Progress = serde_json::from_value(trimmed).expect("trimmed progress from JSON");
        assert_eq!(decoded.output().lines().count(), 0);
        assert_eq!(
            decoded.output().next_sequence,
            1,
            "an observer that has every line still learns where the output stands"
        );
    }
}
