//! Following an Agent ensure from a plain terminal.
//!
//! [`Wait`] runs one Control API call with streamed progress rendered to
//! stderr and stops on Ctrl-C. On a terminal the current phase and step live
//! on one updating line and only work that took noticeable time leaves a
//! permanent line, so a warm ensure prints nothing. Without a terminal every
//! completion is printed once.

use std::{
    cell::RefCell,
    io::{self, IsTerminal as _, Write},
    time::{Duration, Instant},
};

use agent::{
    FailureKind,
    progress::{Event, PhaseOutcome, ProgressUnit},
};

/// Minimum interval between redraws of the updating line.
const REDRAW_INTERVAL: Duration = Duration::from_millis(50);
/// Completed phases faster than this leave no line on a terminal.
const NOTABLE_PHASE_MS: u64 = 100;
/// Completed steps faster than this leave no line on a terminal.
const NOTABLE_STEP_MS: u64 = 500;
const FALLBACK_WIDTH: usize = 80;
/// Output lines kept per step for the failure report.
const RECENT_OUTPUT_LINES: usize = 5;

/// The user stopped waiting; the daemon keeps reconciling the Agent.
#[derive(Debug, thiserror::Error)]
#[error("stopped waiting; agentd keeps reconciling Agent {agent:?} in the background")]
pub(crate) struct Interrupted {
    agent: String,
}

/// One followed ensure: owns the renderer for its duration.
///
/// ```ignore
/// let wait = Wait::start(&agent);
/// let target = wait
///     .until(client.ensure_execution(&agent, WaitPolicy::UntilReady, Some(&mut wait.sink())))
///     .await??;
/// ```
pub(crate) struct Wait<'a> {
    agent: &'a str,
    renderer: RefCell<Renderer>,
}

impl<'a> Wait<'a> {
    pub(crate) fn start(agent: &'a str) -> Self {
        Self {
            agent,
            renderer: RefCell::new(Renderer::stderr()),
        }
    }

    /// Returns the progress sink to hand to the client call.
    pub(crate) fn sink(&self) -> impl FnMut(Event) + '_ {
        move |event| self.renderer.borrow_mut().render(event)
    }

    /// Runs the ensure call until it completes or the user presses Ctrl-C.
    ///
    /// Awaiting Ctrl-C installs a process-wide handler that outlives this call,
    /// so a command that afterwards runs something the user must be able to
    /// interrupt, and that does not watch Ctrl-C itself, calls
    /// [`exit_on_next_interrupt`].
    ///
    /// # Errors
    ///
    /// Returns [`Interrupted`] when the user pressed Ctrl-C before the call completed.
    pub(crate) async fn until<T>(&self, ensure: impl Future<Output = T>) -> Result<T, Interrupted> {
        let waited = tokio::select! {
            biased;
            result = ensure => Some(result),
            _ = tokio::signal::ctrl_c() => None,
        };
        self.renderer.borrow_mut().finish();
        waited.ok_or_else(|| Interrupted {
            agent: self.agent.to_owned(),
        })
    }
}

/// Gives the next Ctrl-C its default meaning again: exit with status 130.
pub(crate) fn exit_on_next_interrupt() {
    tokio::task::spawn_local(async {
        let _ignored = tokio::signal::ctrl_c().await;
        std::process::exit(130);
    });
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
    phase: Option<String>,
    step: Option<String>,
    printed_step: bool,
    last_redraw: Option<Instant>,
    last_error: Option<String>,
    /// Consecutive failed passes with the current error.
    failures: u32,
    /// Most recent output lines of the current step, shown when the step fails.
    recent_output: std::collections::VecDeque<String>,
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
            phase: None,
            step: None,
            printed_step: false,
            last_redraw: None,
            last_error: None,
            failures: 0,
            recent_output: std::collections::VecDeque::new(),
        }
    }

    pub(crate) fn render(&mut self, event: Event) {
        let _ignored = self.render_inner(event);
    }

    pub(crate) fn finish(&mut self) {
        let _ignored = self.clear_active_line();
    }

    const fn interactive(&self) -> bool {
        matches!(self.mode, Mode::Terminal { .. })
    }

    fn render_inner(&mut self, event: Event) -> io::Result<()> {
        match event {
            Event::PhaseStarted { message, .. } => {
                self.phase = Some(message);
                self.step = None;
                self.printed_step = false;
                self.show_active(None)
            }
            Event::PhaseCompleted {
                message,
                outcome,
                elapsed_ms,
                ..
            } => self.phase_completed(&message, outcome, elapsed_ms),
            Event::PhaseFailed {
                message,
                detail,
                failure,
                elapsed_ms,
                ..
            } => self.phase_failed(&message, &detail, failure, elapsed_ms),
            Event::StepStarted { message, .. } => {
                self.step = Some(message);
                self.recent_output.clear();
                self.show_active(None)
            }
            Event::StepProgress {
                completed, total, unit, ..
            } => {
                if self.interactive() {
                    self.show_active_throttled(&format_progress(completed, total, unit))
                } else {
                    Ok(())
                }
            }
            Event::StepOutput { detail, .. } => self.step_output(&detail),
            Event::StepCompleted {
                message, elapsed_ms, ..
            } => {
                self.clear_active_line()?;
                self.step = None;
                if !self.interactive() || elapsed_ms >= NOTABLE_STEP_MS {
                    self.printed_step = true;
                    writeln!(self.output, "  ✓ {message} ({})", duration(elapsed_ms))?;
                }
                self.show_active(None)
            }
            // Readiness is the command's outcome and reported by the command itself.
            Event::Condition {
                reason,
                message,
                failure: Some(FailureKind::Transient),
                ..
            } => {
                self.clear_active_line()?;
                let diagnostic = if message.is_empty() { reason } else { message };
                self.error(&diagnostic)
            }
            Event::Condition { .. } => Ok(()),
        }
    }

    fn phase_completed(&mut self, message: &str, outcome: PhaseOutcome, elapsed_ms: u64) -> io::Result<()> {
        self.clear_active_line()?;
        self.phase = None;
        if !self.interactive() {
            return if outcome == PhaseOutcome::Reused {
                writeln!(self.output, "✓ {message} (reused)")
            } else {
                writeln!(self.output, "✓ {message} ({})", duration(elapsed_ms))
            };
        }
        if outcome != PhaseOutcome::Reused && (elapsed_ms >= NOTABLE_PHASE_MS || self.printed_step) {
            writeln!(self.output, "✓ {message} ({})", duration(elapsed_ms))?;
        }
        Ok(())
    }

    /// Closes the failed phase.
    ///
    /// An invalid configuration fails the command, which reports the error
    /// itself. A transient failure is explained once, with the failed step's
    /// last output; on a terminal further identical failures only advance a
    /// counter on the updating line, because the daemon retries every pass.
    fn phase_failed(&mut self, message: &str, detail: &str, failure: FailureKind, elapsed_ms: u64) -> io::Result<()> {
        self.clear_active_line()?;
        self.phase = None;
        if failure == FailureKind::Invalid {
            return writeln!(self.output, "✗ {message} ({})", duration(elapsed_ms));
        }
        // The first failed pass this command observes is always explained in full,
        // even when the standing condition already named the error.
        let explain = self.failures == 0 || self.last_error.as_deref() != Some(detail);
        if explain {
            self.failures = 0;
            writeln!(self.output, "✗ {message} ({})", duration(elapsed_ms))?;
            self.error(detail)?;
            for line in std::mem::take(&mut self.recent_output) {
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
                writeln!(self.output, "✗ {message} ({})", duration(elapsed_ms))?;
            }
            return Ok(());
        }
        let count = self.failures;
        self.show_line(&format!(
            "✗ {message} failed {count}× (last {}); waiting for the next retry",
            duration(elapsed_ms)
        ))
    }

    fn step_output(&mut self, detail: &str) -> io::Result<()> {
        for line in detail.lines().map(str::trim).filter(|line| !line.is_empty()) {
            if self.recent_output.len() == RECENT_OUTPUT_LINES {
                self.recent_output.pop_front();
            }
            self.recent_output.push_back(line.to_owned());
        }
        if self.interactive() {
            return detail
                .lines()
                .rev()
                .map(str::trim)
                .find(|line| !line.is_empty())
                .map_or(Ok(()), |line| self.show_active_throttled(line));
        }
        if detail.is_empty() {
            return Ok(());
        }
        self.output.write_all(detail.as_bytes())?;
        if !detail.ends_with('\n') {
            writeln!(self.output)?;
        }
        self.output.flush()
    }

    /// Prints one `error:` line, suppressing a repeat of the previous diagnostic.
    fn error(&mut self, diagnostic: &str) -> io::Result<()> {
        if self.last_error.as_deref() == Some(diagnostic) {
            return Ok(());
        }
        self.last_error = Some(diagnostic.to_owned());
        writeln!(self.output, "error: {diagnostic}")
    }

    fn show_active_throttled(&mut self, detail: &str) -> io::Result<()> {
        if self.last_redraw.is_some_and(|last| last.elapsed() < REDRAW_INTERVAL) {
            return Ok(());
        }
        self.show_active(Some(detail))
    }

    /// Redraws the updating line as `→ phase: step: detail`.
    fn show_active(&mut self, detail: Option<&str>) -> io::Result<()> {
        let Some(phase) = &self.phase else {
            return Ok(());
        };
        let mut line = format!("→ {phase}");
        if let Some(step) = &self.step {
            line.push_str(": ");
            line.push_str(step);
        }
        if let Some(detail) = detail {
            line.push_str(": ");
            line.push_str(detail);
        }
        self.show_line(&line)
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

fn format_progress(completed: u64, total: Option<u64>, unit: ProgressUnit) -> String {
    match (unit, total) {
        (ProgressUnit::Bytes, Some(total)) => format!("{} / {}", bytes(completed), bytes(total)),
        (ProgressUnit::Bytes, None) => bytes(completed),
        (ProgressUnit::Items, Some(total)) => format!("{completed} / {total}"),
        (ProgressUnit::Items, None) => completed.to_string(),
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

fn duration(milliseconds: u64) -> String {
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
    use agent::progress::Phase;

    use super::*;

    fn started(message: &str) -> Event {
        Event::PhaseStarted {
            phase: Phase::SandboxStart,
            message: message.into(),
        }
    }

    fn completed(message: &str, outcome: PhaseOutcome, elapsed_ms: u64) -> Event {
        Event::PhaseCompleted {
            phase: Phase::SandboxStart,
            message: message.into(),
            outcome,
            elapsed_ms,
        }
    }

    fn step_completed(message: &str, elapsed_ms: u64) -> Event {
        Event::StepCompleted {
            phase: Phase::SandboxStart,
            step_id: "1".into(),
            message: message.into(),
            elapsed_ms,
        }
    }

    fn failed(message: &str, detail: &str) -> Event {
        Event::PhaseFailed {
            phase: Phase::SandboxStart,
            message: message.into(),
            detail: detail.into(),
            failure: FailureKind::Transient,
            elapsed_ms: 0,
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

    fn render(interactive: bool, events: impl IntoIterator<Item = Event>) -> Vec<String> {
        let mode = if interactive {
            Mode::Terminal { width: 80 }
        } else {
            Mode::Plain
        };
        let mut renderer = Renderer::new(Vec::new(), mode);
        for event in events {
            renderer.render(event);
        }
        renderer.finish();
        lines(renderer)
    }

    #[test]
    fn a_warm_ensure_leaves_no_permanent_lines_on_a_terminal() {
        let lines = render(
            true,
            [
                started("Look up Sandbox"),
                completed("Look up Sandbox", PhaseOutcome::Reused, 0),
                started("Inspect Sandbox"),
                completed("Inspect Sandbox", PhaseOutcome::Completed, 3),
            ],
        );
        assert_eq!(
            lines,
            vec!["→ Look up Sandbox", "→ Inspect Sandbox"],
            "only transient redraws"
        );
    }

    #[test]
    fn noticeable_work_and_failures_leave_lines_on_a_terminal() {
        let lines = render(
            true,
            [
                started("Resolve Sandbox Image"),
                step_completed("Check Docker Engine", 2),
                step_completed("Build Docker image", 74_000),
                completed("Resolve Sandbox Image", PhaseOutcome::Completed, 87_000),
                started("Start Sandbox"),
                Event::StepStarted {
                    phase: Phase::SandboxStart,
                    step_id: "1".into(),
                    message: "Start Microsandbox VM".into(),
                },
                Event::StepOutput {
                    phase: Phase::SandboxStart,
                    step_id: "1".into(),
                    message: "Start Microsandbox VM".into(),
                    stream: agent::progress::OutputStream::Stderr,
                    detail: "opening disk\nno such file\n".into(),
                },
                failed("Start Sandbox", "VMDK missing"),
                started("Start Sandbox"),
                failed("Start Sandbox", "VMDK missing"),
            ],
        );
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
    fn without_a_terminal_every_completion_is_printed_once() {
        let lines = render(
            false,
            [
                started("Look up Sandbox"),
                completed("Look up Sandbox", PhaseOutcome::Reused, 0),
                started("Start Sandbox"),
                step_completed("Create Microsandbox VM", 366),
                completed("Start Sandbox", PhaseOutcome::Completed, 367),
            ],
        );
        assert_eq!(
            lines,
            vec![
                "✓ Look up Sandbox (reused)",
                "  ✓ Create Microsandbox VM (366ms)",
                "✓ Start Sandbox (367ms)",
            ]
        );
    }

    #[test]
    fn the_updating_line_is_truncated_to_the_terminal_width() {
        let mut renderer = Renderer::new(Vec::new(), Mode::Terminal { width: 24 });
        renderer.render(started("Resolve Sandbox Image"));
        renderer.render(Event::StepStarted {
            phase: Phase::ImageResolve,
            step_id: "1".into(),
            message: "Build Docker image".into(),
        });
        let lines = lines(renderer);
        assert_eq!(lines.last().map(String::as_str), Some("→ Resolve Sandbox Imag…"));
    }
}
