//! Following an Agent's provisioning from a plain terminal.
//!
//! [`Wait`] runs one Control API call while it follows the Agent's progress
//! with `agents.v1.progress` and renders it to stderr. On a terminal the
//! current phase and step live on one updating line and only work that took
//! noticeable time leaves a permanent line, so a warm ensure prints nothing.
//! Without a terminal every completion and output line is printed once.

use std::{
    cell::RefCell,
    collections::VecDeque,
    io::{self, IsTerminal as _, Write},
    pin::pin,
    time::{Duration, Instant},
};

use agent::{
    FailureKind,
    control_api::Client,
    progress::{AgentProgress, OutputPosition},
    resources::Revision,
};
use sandbox::progress::{Measurement, OperationStatus, Outcome, ProgressCursor, ProgressUnit, Update};

/// Minimum interval between redraws of the updating line.
const REDRAW_INTERVAL: Duration = Duration::from_millis(50);
/// Completed phases faster than this leave no line on a terminal.
const NOTABLE_PHASE_MS: u64 = 100;
/// Completed steps faster than this leave no line on a terminal.
const NOTABLE_STEP_MS: u64 = 500;
const FALLBACK_WIDTH: usize = 80;
/// Output lines of the failed step shown in the failure report.
const RECENT_OUTPUT_LINES: usize = 5;
/// Longest wait for the state reached when the followed call returned.
const FINAL_READ_TIMEOUT: Duration = Duration::from_millis(500);
/// Pause before following again after a failed progress read.
const RETRY_INTERVAL: Duration = Duration::from_millis(250);

/// One followed call: owns the renderer for its duration.
///
/// Ctrl-C is deliberately not handled here. The default SIGINT disposition ends
/// `agentctl` with status 130, the daemon keeps reconciling regardless, and the
/// renderer already tells the user so on the first failure. A handler would
/// outlive the wait (tokio cannot uninstall it) and every later phase of the
/// process would have to emulate the default by hand.
///
/// ```ignore
/// let wait = Wait::start();
/// let target = wait
///     .until(client, &agent, client.ensure_execution(&agent, WaitPolicy::UntilReady))
///     .await?;
/// ```
pub(crate) struct Wait {
    renderer: RefCell<Renderer>,
}

impl Wait {
    pub(crate) fn start() -> Self {
        Self {
            renderer: RefCell::new(Renderer::stderr()),
        }
    }

    /// Runs `call` to completion while rendering `agent`'s progress, then
    /// renders the final state and settles the terminal.
    pub(crate) async fn until<T>(&self, client: &Client, agent: &str, call: impl Future<Output = T>) -> T {
        let mut call = pin!(call);
        loop {
            let (after, output) = self.renderer.borrow().position();
            let follow = async {
                let progress = client.agent_progress(agent, after, output).await.ok();
                if progress.is_none() {
                    // The Agent may not be stored yet, or the daemon is restarting.
                    tokio::time::sleep(RETRY_INTERVAL).await;
                }
                progress
            };
            tokio::select! {
                biased;
                result = &mut call => {
                    let (_, output) = self.renderer.borrow().position();
                    let latest = tokio::time::timeout(FINAL_READ_TIMEOUT, client.agent_progress(agent, None, output));
                    if let Ok(Ok(progress)) = latest.await {
                        self.renderer.borrow_mut().render(&progress);
                    }
                    self.renderer.borrow_mut().finish();
                    return result;
                }
                progress = follow => {
                    if let Some(progress) = progress {
                        self.renderer.borrow_mut().render(&progress);
                    }
                }
            }
        }
    }
}

/// Where the renderer writes, which decides between an updating line and plain lines.
#[derive(Clone, Copy)]
enum Mode {
    /// An interactive terminal of the given width.
    Terminal { width: usize },
    /// A pipe or file: every completion is printed once, nothing is redrawn.
    Plain,
}

pub(crate) struct Renderer<W: Write = io::Stderr> {
    output: W,
    mode: Mode,
    active_line: bool,
    last_redraw: Option<Instant>,
    last_error: Option<String>,
    /// Consecutive failed passes with the current error.
    failures: u32,
    revision: Option<Revision>,
    /// Pass being rendered and the position in its progress.
    pass: Option<Revision>,
    cursor: ProgressCursor,
    /// Pass whose failure was already reported.
    reported_failure: Option<Revision>,
    /// A step of the current phase left a permanent line on the terminal.
    printed_step: bool,
    /// Output of the step in progress, shown when it fails.
    recent_output: VecDeque<String>,
    /// Ready condition already considered, so a standing failure is shown once.
    seen_condition: Option<String>,
    started: bool,
}

impl Renderer {
    pub(crate) fn stderr() -> Self {
        let output = io::stderr();
        let mode = if output.is_terminal() {
            Mode::Terminal {
                width: crossterm::terminal::size().map_or(FALLBACK_WIDTH, |(columns, _)| usize::from(columns)),
            }
        } else {
            Mode::Plain
        };
        Self::new(output, mode)
    }
}

impl<W: Write> Renderer<W> {
    const fn new(output: W, mode: Mode) -> Self {
        Self {
            output,
            mode,
            active_line: false,
            last_redraw: None,
            last_error: None,
            failures: 0,
            revision: None,
            pass: None,
            cursor: ProgressCursor::new(),
            reported_failure: None,
            printed_step: false,
            recent_output: VecDeque::new(),
            seen_condition: None,
            started: false,
        }
    }

    /// Revision to follow from and the output already rendered.
    fn position(&self) -> (Option<Revision>, Option<OutputPosition>) {
        let output = self.pass.map(|pass| OutputPosition {
            pass,
            sequence: self.cursor.output_sequence(),
        });
        (self.revision, output)
    }

    pub(crate) fn render(&mut self, progress: &AgentProgress) {
        let _ignored = self.render_inner(progress);
    }

    pub(crate) fn finish(&mut self) {
        let _ignored = self.clear_active_line();
    }

    const fn interactive(&self) -> bool {
        matches!(self.mode, Mode::Terminal { .. })
    }

    fn render_inner(&mut self, progress: &AgentProgress) -> io::Result<()> {
        let following_began = !self.started;
        self.revision = Some(progress.revision);
        self.condition(progress)?;
        let Some(provisioning) = &progress.provisioning else {
            return Ok(());
        };
        if self.pass != Some(provisioning.pass) {
            self.pass = Some(provisioning.pass);
            self.cursor = ProgressCursor::new();
            self.printed_step = false;
            self.recent_output.clear();
            // The latest pass may have succeeded long before following began.
            // It is history, not progress: take its position without printing it.
            if following_began && *provisioning.progress.status() == OperationStatus::Succeeded {
                let _ = self.cursor.updates(&provisioning.progress);
                return Ok(());
            }
        }
        let pass = &provisioning.progress;
        let mut latest_output = None;
        for update in self.cursor.updates(pass) {
            match update {
                Update::OutputSkipped(count) => self.skipped(count)?,
                Update::Output(line) => {
                    self.step_output(&line.text)?;
                    latest_output = Some(line.text.trim());
                }
                Update::StepFinished(step) => {
                    latest_output = None;
                    // A failed step keeps its output for the failure report.
                    if step.outcome != Outcome::Failed {
                        self.recent_output.clear();
                        self.step_completed(&step.name, step.elapsed_ms)?;
                    }
                }
                Update::PhaseFinished(phase) if phase.outcome != Outcome::Failed => {
                    self.phase_completed(&phase.phase.label, phase.outcome, phase.elapsed_ms)?;
                }
                // A failed phase is reported with its pass's failure below.
                Update::PhaseFinished(_) => {}
            }
        }
        match pass.status() {
            OperationStatus::Failed { detail } if self.reported_failure != Some(provisioning.pass) => {
                self.reported_failure = Some(provisioning.pass);
                let (phase, elapsed_ms) = pass
                    .finished()
                    .iter()
                    .rfind(|phase| phase.outcome == Outcome::Failed)
                    .map_or(("Provision Sandbox", 0), |phase| {
                        (phase.phase.label.as_ref(), phase.elapsed_ms)
                    });
                let failure = progress.status.failure.unwrap_or(FailureKind::Transient);
                self.phase_failed(phase, detail, failure, elapsed_ms)
            }
            OperationStatus::Running => {
                let Some(current) = pass.current() else {
                    return Ok(());
                };
                let mut line = format!("→ {}", current.phase.label);
                let Some(step) = pass.current_step() else {
                    return self.show_line(&line);
                };
                line.push_str(": ");
                line.push_str(&step.name);
                let detail = step
                    .measurement
                    .map(format_measurement)
                    .or_else(|| latest_output.map(str::to_owned));
                match detail {
                    Some(detail) => self.show_line_throttled(&format!("{line}: {detail}")),
                    None => self.show_line(&line),
                }
            }
            _ => Ok(()),
        }
    }

    /// Reports a transient failure recorded outside a Sandbox pass, including
    /// one that already stood when following started. Readiness itself is the
    /// command's outcome and reported by the command.
    fn condition(&mut self, progress: &AgentProgress) -> io::Result<()> {
        let started = std::mem::replace(&mut self.started, true);
        let Some(ready) = progress.status.ready_condition() else {
            return Ok(());
        };
        let detail = ready.detail();
        if self.seen_condition.as_deref() == Some(detail.as_str()) {
            return Ok(());
        }
        self.seen_condition = Some(detail.clone());
        let failing = progress.status.failure == Some(FailureKind::Transient);
        let explained_by_pass = started && progress.provisioning.is_some();
        if failing && !explained_by_pass {
            self.clear_active_line()?;
            self.error(&detail)?;
        }
        Ok(())
    }

    fn phase_completed(&mut self, label: &str, outcome: Outcome, elapsed_ms: u64) -> io::Result<()> {
        self.clear_active_line()?;
        let printed_step = std::mem::take(&mut self.printed_step);
        if !self.interactive() {
            return if outcome == Outcome::Reused {
                writeln!(self.output, "✓ {label} (reused)")
            } else {
                writeln!(self.output, "✓ {label} ({})", duration(elapsed_ms))
            };
        }
        if outcome != Outcome::Reused && (elapsed_ms >= NOTABLE_PHASE_MS || printed_step) {
            writeln!(self.output, "✓ {label} ({})", duration(elapsed_ms))?;
        }
        Ok(())
    }

    fn step_completed(&mut self, name: &str, elapsed_ms: u64) -> io::Result<()> {
        self.clear_active_line()?;
        if !self.interactive() || elapsed_ms >= NOTABLE_STEP_MS {
            self.printed_step = true;
            writeln!(self.output, "  ✓ {name} ({})", duration(elapsed_ms))?;
        }
        Ok(())
    }

    /// Closes the failed phase.
    ///
    /// An invalid configuration fails the command, which reports the error
    /// itself. A transient failure is explained once, with the failed step's
    /// last output; on a terminal further identical failures only advance a
    /// counter on the updating line, because the daemon retries every pass.
    fn phase_failed(&mut self, label: &str, detail: &str, failure: FailureKind, elapsed_ms: u64) -> io::Result<()> {
        self.clear_active_line()?;
        if failure == FailureKind::Invalid {
            return writeln!(self.output, "✗ {label} ({})", duration(elapsed_ms));
        }
        // The first failed pass this command observes is always explained in full,
        // even when the standing condition already named the error.
        let explain = self.failures == 0 || self.last_error.as_deref() != Some(detail);
        if explain {
            self.failures = 0;
            writeln!(self.output, "✗ {label} ({})", duration(elapsed_ms))?;
            self.last_error = None;
            self.error(detail)?;
            let recent = std::mem::take(&mut self.recent_output);
            let skip = recent.len().saturating_sub(RECENT_OUTPUT_LINES);
            for line in recent.iter().skip(skip) {
                writeln!(self.output, "    {line}")?;
            }
            writeln!(
                self.output,
                "  agentd keeps retrying in the background; press Ctrl-C to stop waiting"
            )?;
        }
        self.failures += 1;
        if !self.interactive() {
            if !explain {
                writeln!(self.output, "✗ {label} ({})", duration(elapsed_ms))?;
            }
            return Ok(());
        }
        let count = self.failures;
        self.show_line(&format!(
            "✗ {label} failed {count}× (last {}); waiting for the next retry",
            duration(elapsed_ms)
        ))
    }

    fn step_output(&mut self, line: &str) -> io::Result<()> {
        self.recent_output.push_back(line.trim().to_owned());
        if self.interactive() {
            return Ok(());
        }
        writeln!(self.output, "{line}")
    }

    fn skipped(&mut self, count: u64) -> io::Result<()> {
        if self.interactive() {
            return Ok(());
        }
        writeln!(self.output, "… {count} output lines skipped")
    }

    /// Prints one `error:` line, suppressing a repeat of the previous diagnostic.
    fn error(&mut self, diagnostic: &str) -> io::Result<()> {
        if self.last_error.as_deref() == Some(diagnostic) {
            return Ok(());
        }
        self.last_error = Some(diagnostic.to_owned());
        writeln!(self.output, "error: {diagnostic}")
    }

    fn show_line_throttled(&mut self, line: &str) -> io::Result<()> {
        if self.last_redraw.is_some_and(|last| last.elapsed() < REDRAW_INTERVAL) {
            return Ok(());
        }
        self.show_line(line)
    }

    /// Replaces the updating line, truncated to the terminal width; no-op without a terminal.
    fn show_line(&mut self, line: &str) -> io::Result<()> {
        let Mode::Terminal { width } = self.mode else {
            return Ok(());
        };
        let line = truncate(line, width.saturating_sub(1));
        write!(self.output, "\r\x1b[2K{line}")?;
        self.output.flush()?;
        self.active_line = true;
        self.last_redraw = Some(Instant::now());
        Ok(())
    }

    fn clear_active_line(&mut self) -> io::Result<()> {
        if self.interactive() && self.active_line {
            write!(self.output, "\r\x1b[2K")?;
            self.output.flush()?;
            self.active_line = false;
        }
        Ok(())
    }
}

fn truncate(text: &str, width: usize) -> String {
    let count = text.chars().count();
    if count <= width || width < 2 {
        return text.to_owned();
    }
    let mut kept: String = text.chars().take(width - 1).collect();
    kept.push('…');
    kept
}

pub(crate) fn format_measurement(Measurement { unit, completed, total }: Measurement) -> String {
    match (unit, total) {
        (ProgressUnit::Bytes, Some(total)) => format!("{} / {}", bytes(completed), bytes(total)),
        (ProgressUnit::Bytes, None) => bytes(completed),
        (ProgressUnit::Items, Some(total)) => format!("{completed} / {total}"),
        _ => completed.to_string(),
    }
}

fn bytes(value: u64) -> String {
    const KIB: u64 = 1_024;
    const MIB: u64 = KIB * 1_024;
    const GIB: u64 = MIB * 1_024;
    if value >= GIB {
        scaled(value, GIB, "GiB")
    } else if value >= MIB {
        scaled(value, MIB, "MiB")
    } else if value >= KIB {
        scaled(value, KIB, "KiB")
    } else {
        format!("{value} B")
    }
}

fn scaled(value: u64, unit: u64, suffix: &str) -> String {
    let whole = value / unit;
    let decimal = (value % unit).saturating_mul(10) / unit;
    format!("{whole}.{decimal} {suffix}")
}

pub(crate) fn duration(milliseconds: u64) -> String {
    if milliseconds >= 60_000 {
        format!("{}m {:02}s", milliseconds / 60_000, milliseconds % 60_000 / 1_000)
    } else if milliseconds >= 1_000 {
        let seconds = milliseconds / 1_000;
        let tenths = milliseconds % 1_000 / 100;
        format!("{seconds}.{tenths}s")
    } else {
        format!("{milliseconds}ms")
    }
}

#[cfg(test)]
mod tests {
    use std::{collections::HashMap, time::Duration};

    use agent::{Condition, ConditionStatus, Status, progress::Provisioning, resources::Changes};
    use sandbox::{OutputStream, ProgressEvent, SandboxPhase, StepId, progress::Progress};

    use super::*;

    /// Builds successive snapshots of one Agent's progress, as the daemon reports them.
    struct Daemon {
        changes: Changes,
        pass: Revision,
        progress: Progress,
        status: Status,
        steps: HashMap<&'static str, StepId>,
    }

    impl Daemon {
        fn new() -> Self {
            let changes = Changes::new();
            Self {
                pass: changes.revision(),
                changes,
                progress: Progress::new(),
                status: Status::default(),
                steps: HashMap::new(),
            }
        }

        fn apply(&mut self, event: &ProgressEvent) -> &mut Self {
            self.progress.apply(event);
            self
        }

        fn phase(&mut self, phase: SandboxPhase) -> &mut Self {
            self.apply(&ProgressEvent::PhaseStarted { phase: phase.phase() })
        }

        fn end_phase(&mut self, phase: SandboxPhase, outcome: Outcome, elapsed_ms: u64) -> &mut Self {
            self.apply(&ProgressEvent::PhaseEnded {
                phase: phase.phase(),
                outcome,
                elapsed: Duration::from_millis(elapsed_ms),
            })
        }

        fn step(&mut self, name: &'static str) -> &mut Self {
            let id = StepId::generate();
            self.steps.insert(name, id.clone());
            self.apply(&ProgressEvent::StepStarted {
                id,
                name: name.into(),
                unit: None,
                total: None,
            })
        }

        fn output(&mut self, name: &'static str, text: &str) -> &mut Self {
            let id = self.steps[name].clone();
            self.apply(&ProgressEvent::StepOutput {
                id,
                stream: OutputStream::Stderr,
                bytes: text.as_bytes().to_vec().into(),
            })
        }

        fn end_step(&mut self, name: &'static str, elapsed_ms: u64) -> &mut Self {
            let id = self.steps[name].clone();
            self.apply(&ProgressEvent::StepEnded {
                id,
                outcome: Outcome::Completed,
                elapsed: Duration::from_millis(elapsed_ms),
            })
        }

        fn fail(&mut self, detail: &str) -> &mut Self {
            self.progress.fail(detail);
            self.status.failure = Some(FailureKind::Transient);
            self.status.conditions = vec![Condition {
                kind: Condition::READY.into(),
                status: ConditionStatus::False,
                reason: "SandboxReconcileFailed".into(),
                message: detail.into(),
                last_transition_time: None,
            }];
            self
        }

        fn succeed(&mut self) -> &mut Self {
            self.progress.succeed();
            self.status.failure = None;
            self.status.conditions = vec![Condition {
                kind: Condition::READY.into(),
                status: ConditionStatus::True,
                reason: "SandboxReady".into(),
                message: String::new(),
                last_transition_time: None,
            }];
            self
        }

        fn retry(&mut self) -> &mut Self {
            self.changes.bump();
            self.pass = self.changes.revision();
            self.progress = Progress::new();
            self
        }

        fn snapshot(&self) -> AgentProgress {
            self.changes.bump();
            AgentProgress {
                revision: self.changes.revision(),
                status: self.status.clone(),
                provisioning: Some(Provisioning {
                    pass: self.pass,
                    progress: self.progress.clone(),
                }),
            }
        }
    }

    fn lines(renderer: Renderer<Vec<u8>>) -> Vec<String> {
        String::from_utf8(renderer.output)
            .expect("utf-8")
            .split(['\r', '\n'])
            .map(|part| part.trim_start_matches("\x1b[2K"))
            .filter(|part| !part.is_empty())
            .map(str::to_owned)
            .collect()
    }

    fn renderer(interactive: bool) -> Renderer<Vec<u8>> {
        let mode = if interactive {
            Mode::Terminal { width: 80 }
        } else {
            Mode::Plain
        };
        Renderer::new(Vec::new(), mode)
    }

    #[test]
    fn a_warm_ensure_leaves_no_permanent_lines_on_a_terminal() {
        let mut renderer = renderer(true);
        let mut daemon = Daemon::new();
        renderer.render(&daemon.phase(SandboxPhase::Lookup).snapshot());
        renderer.render(
            &daemon
                .end_phase(SandboxPhase::Lookup, Outcome::Reused, 0)
                .phase(SandboxPhase::Inspect)
                .snapshot(),
        );
        renderer.render(
            &daemon
                .end_phase(SandboxPhase::Inspect, Outcome::Completed, 3)
                .snapshot(),
        );
        renderer.finish();
        assert_eq!(
            lines(renderer),
            vec!["→ Look up Sandbox", "→ Inspect Sandbox"],
            "only transient redraws"
        );
    }

    #[test]
    fn noticeable_work_and_failures_leave_lines_on_a_terminal() {
        let mut renderer = renderer(true);
        let mut daemon = Daemon::new();
        daemon
            .phase(SandboxPhase::ImageResolve)
            .step("Check Docker Engine")
            .end_step("Check Docker Engine", 2)
            .step("Build Docker image");
        renderer.render(&daemon.snapshot());
        daemon
            .end_step("Build Docker image", 74_000)
            .end_phase(SandboxPhase::ImageResolve, Outcome::Completed, 87_000)
            .phase(SandboxPhase::SandboxStart)
            .step("Start Microsandbox VM")
            .output("Start Microsandbox VM", "opening disk\nno such file\n");
        renderer.render(&daemon.snapshot());
        daemon.fail("VMDK missing");
        renderer.render(&daemon.snapshot());
        daemon.retry().phase(SandboxPhase::SandboxStart).fail("VMDK missing");
        renderer.render(&daemon.snapshot());
        renderer.finish();

        let lines = lines(renderer);
        let permanent: Vec<_> = lines.iter().filter(|line| !line.starts_with('→')).collect();
        assert_eq!(
            permanent,
            vec![
                "  ✓ Build Docker image (1m 14s)",
                "✓ Resolve Sandbox Image (1m 27s)",
                "✗ Start Sandbox (0ms)",
                "error: VMDK missing",
                "    opening disk",
                "    no such file",
                "  agentd keeps retrying in the background; press Ctrl-C to stop waiting",
                "✗ Start Sandbox failed 1× (last 0ms); waiting for the next retry",
                "✗ Start Sandbox failed 2× (last 0ms); waiting for the next retry",
            ]
        );
    }

    #[test]
    fn without_a_terminal_every_completion_and_output_line_is_printed_once() {
        let mut renderer = renderer(false);
        let mut daemon = Daemon::new();
        renderer.render(&daemon.phase(SandboxPhase::Lookup).snapshot());
        daemon
            .end_phase(SandboxPhase::Lookup, Outcome::Reused, 0)
            .phase(SandboxPhase::SandboxStart)
            .step("Create Microsandbox VM")
            .output("Create Microsandbox VM", "created\n");
        renderer.render(&daemon.snapshot());
        renderer.render(&daemon.snapshot());
        daemon
            .end_step("Create Microsandbox VM", 366)
            .end_phase(SandboxPhase::SandboxStart, Outcome::Completed, 367);
        renderer.render(&daemon.snapshot());
        renderer.finish();
        assert_eq!(
            lines(renderer),
            vec![
                "✓ Look up Sandbox (reused)",
                "created",
                "  ✓ Create Microsandbox VM (366ms)",
                "✓ Start Sandbox (367ms)",
            ]
        );
    }

    #[test]
    fn a_pass_that_succeeded_before_following_began_is_not_replayed() {
        let mut renderer = renderer(false);
        let mut daemon = Daemon::new();
        daemon
            .phase(SandboxPhase::SandboxStart)
            .step("Create Microsandbox VM")
            .output("Create Microsandbox VM", "created\n")
            .end_step("Create Microsandbox VM", 366)
            .end_phase(SandboxPhase::SandboxStart, Outcome::Completed, 367)
            .succeed();
        renderer.render(&daemon.snapshot());
        renderer.render(&daemon.snapshot());
        daemon
            .retry()
            .phase(SandboxPhase::SandboxStart)
            .step("Create Microsandbox VM")
            .end_step("Create Microsandbox VM", 12)
            .end_phase(SandboxPhase::SandboxStart, Outcome::Completed, 13);
        renderer.render(&daemon.snapshot());
        renderer.finish();
        assert_eq!(
            lines(renderer),
            vec!["  ✓ Create Microsandbox VM (12ms)", "✓ Start Sandbox (13ms)"],
            "only the pass that ran while following is printed"
        );
    }

    #[test]
    fn a_standing_failure_is_reported_once_when_following_starts() {
        let mut renderer = renderer(false);
        let mut daemon = Daemon::new();
        daemon.fail("registry unavailable");
        let mut standing = daemon.snapshot();
        standing.provisioning = None;
        renderer.render(&standing);
        renderer.render(&standing);
        assert_eq!(lines(renderer), vec!["error: registry unavailable"]);
    }

    #[test]
    fn the_updating_line_is_truncated_to_the_terminal_width() {
        let mut renderer = Renderer::new(Vec::new(), Mode::Terminal { width: 24 });
        let mut daemon = Daemon::new();
        daemon.phase(SandboxPhase::ImageResolve).step("Build Docker image");
        renderer.render(&daemon.snapshot());
        let lines = lines(renderer);
        assert_eq!(lines.last().map(String::as_str), Some("→ Resolve Sandbox Imag…"));
    }

    #[test]
    fn replies_trimmed_to_unseen_output_render_nothing_twice_over_the_wire() {
        let mut renderer = renderer(false);
        let mut daemon = Daemon::new();
        daemon
            .phase(SandboxPhase::ImageResolve)
            .step("Build")
            .output("Build", "one\n")
            .end_step("Build", 700)
            .step("Import");
        renderer.render(&daemon.snapshot());
        for completed in [1_u64, 2, 3] {
            let id = daemon.steps["Import"].clone();
            daemon.apply(&ProgressEvent::StepOutput {
                id,
                stream: OutputStream::Stdout,
                bytes: format!("layer {completed}\n").into_bytes().into(),
            });
            let (_, output) = renderer.position();
            let mut reply = daemon.snapshot();
            if let (Some(provisioning), Some(output)) = (reply.provisioning.as_mut(), output) {
                provisioning.progress = provisioning.progress.output_from(output.sequence);
            }
            // Replies reach the renderer through the wire format.
            let reply = serde_json::from_value(serde_json::to_value(&reply).expect("reply JSON")).expect("reply");
            renderer.render(&reply);
            let (_, output) = renderer.position();
            let mut quiet = daemon.snapshot();
            if let (Some(provisioning), Some(output)) = (quiet.provisioning.as_mut(), output) {
                provisioning.progress = provisioning.progress.output_from(output.sequence);
            }
            let quiet = serde_json::from_value(serde_json::to_value(&quiet).expect("reply JSON")).expect("reply");
            renderer.render(&quiet);
        }
        assert_eq!(
            lines(renderer),
            vec!["one", "  ✓ Build (700ms)", "layer 1", "layer 2", "layer 3"]
        );
    }

    #[test]
    fn the_follow_position_names_the_rendered_pass_and_output() {
        let mut renderer = renderer(false);
        let mut daemon = Daemon::new();
        daemon
            .phase(SandboxPhase::ImageResolve)
            .step("Build")
            .output("Build", "one\ntwo\n");
        let snapshot = daemon.snapshot();
        renderer.render(&snapshot);
        assert_eq!(
            renderer.position(),
            (
                Some(snapshot.revision),
                Some(OutputPosition {
                    pass: daemon.pass,
                    sequence: 2
                })
            )
        );
    }
}
