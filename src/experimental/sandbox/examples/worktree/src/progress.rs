use std::{
    error::Error as StdError,
    future::Future,
    io::{self, IsTerminal as _},
    pin::pin,
    time::{Duration, Instant},
};

use futures_util::StreamExt as _;
use sandbox::{
    Error, OperationEvent, Outcome, PendingSandbox, ProgressUnit, SandboxHandle,
    progress::{Measurement, Progress, ProgressCursor, Update},
};
use tokio::time::{MissedTickBehavior, interval};

const SPINNER_INTERVAL: Duration = Duration::from_millis(80);
const SPINNER_FRAMES: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
/// Output lines shown when an operation fails in an interactive terminal.
const FAILURE_OUTPUT_LINES: usize = 40;

pub(crate) async fn wait_for_sandbox(mut pending: PendingSandbox<'_>) -> Result<SandboxHandle, Box<dyn StdError>> {
    let mut display = ProgressDisplay::stderr();
    let mut progress = Progress::new();
    let mut ticker = spinner_ticker();

    loop {
        tokio::select! {
            event = pending.next() => match event {
                Some(Ok(OperationEvent::Progress(event))) => {
                    progress.apply(&event);
                    display.show(&progress)?;
                }
                Some(Ok(OperationEvent::Ready(sandbox))) => {
                    progress.succeed();
                    display.show(&progress)?;
                    display.ready()?;
                    return Ok(sandbox);
                }
                Some(Ok(_)) => {}
                Some(Err(error)) => {
                    progress.fail(error.to_string());
                    display.failed(&progress)?;
                    return Err(error.into());
                }
                None => {
                    progress.fail(Error::OperationStreamEnded.to_string());
                    display.failed(&progress)?;
                    return Err(Error::OperationStreamEnded.into());
                }
            },
            _ = ticker.tick() => display.tick(&progress)?,
        }
    }
}

pub(crate) async fn wait_for_operation<T, E>(
    label: &str,
    operation: impl Future<Output = Result<T, E>>,
) -> Result<T, Box<dyn StdError>>
where
    E: StdError + 'static,
{
    let mut display = ProgressDisplay::stderr();
    display.start(label)?;
    let started = Instant::now();
    let mut operation = pin!(operation);
    let mut ticker = spinner_ticker();

    loop {
        tokio::select! {
            result = &mut operation => {
                let elapsed = started.elapsed();
                return match result {
                    Ok(value) => {
                        display.operation_completed(label, elapsed)?;
                        Ok(value)
                    }
                    Err(error) => {
                        display.operation_failed(label, elapsed)?;
                        Err(Box::new(error))
                    }
                };
            }
            _ = ticker.tick() => display.tick_label(label)?,
        }
    }
}

fn spinner_ticker() -> tokio::time::Interval {
    let mut ticker = interval(SPINNER_INTERVAL);
    ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);
    ticker
}

struct ProgressDisplay<W> {
    output: W,
    interactive: bool,
    cursor: ProgressCursor,
    /// Phase and steps already announced in plain output.
    announced: Option<(String, Vec<String>)>,
    frame: usize,
    line_visible: bool,
}

impl ProgressDisplay<io::Stderr> {
    fn stderr() -> Self {
        let output = io::stderr();
        let interactive = output.is_terminal();
        Self::new(output, interactive)
    }
}

impl<W: io::Write> ProgressDisplay<W> {
    fn new(output: W, interactive: bool) -> Self {
        Self {
            output,
            interactive,
            cursor: ProgressCursor::default(),
            announced: None,
            frame: 0,
            line_visible: false,
        }
    }

    /// Prints what finished since the last call, then the activity in progress.
    fn show(&mut self, progress: &Progress) -> io::Result<()> {
        let updates = self.cursor.updates(progress);
        if !updates.is_empty() {
            self.clear_line()?;
        }
        for update in updates {
            match update {
                Update::OutputSkipped(count) if !self.interactive => {
                    writeln!(self.output, "    … {count} lines skipped")?;
                }
                Update::Output(line) if !self.interactive => writeln!(self.output, "    {}", line.text)?,
                Update::StepFinished(step) if !self.interactive => {
                    let elapsed = Duration::from_millis(step.elapsed_ms);
                    match (step.outcome, step.measurement) {
                        (Outcome::Failed, _) => writeln!(self.output, "  ✗ {} ({})", step.name, duration(elapsed))?,
                        (_, Some(measurement)) => writeln!(
                            self.output,
                            "  ✓ {}: {} ({})",
                            step.name,
                            format_measurement(measurement),
                            duration(elapsed)
                        )?,
                        _ => writeln!(self.output, "  ✓ {} ({})", step.name, duration(elapsed))?,
                    }
                }
                Update::PhaseFinished(phase) => {
                    let elapsed = duration(Duration::from_millis(phase.elapsed_ms));
                    match phase.outcome {
                        Outcome::Reused => writeln!(self.output, "✓ Reused {} ({elapsed})", phase.phase.label)?,
                        Outcome::Failed => writeln!(self.output, "✗ {} ({elapsed})", phase.phase.label)?,
                        _ => writeln!(self.output, "✓ {} ({elapsed})", phase.phase.label)?,
                    }
                }
                Update::OutputSkipped(_) | Update::Output(_) | Update::StepFinished(_) => {}
            }
        }
        if self.interactive {
            self.render(progress)
        } else {
            self.announce(progress)
        }
    }

    /// Names a newly started phase or step in plain output.
    fn announce(&mut self, progress: &Progress) -> io::Result<()> {
        let Some(current) = progress.current() else {
            return Ok(());
        };
        if self
            .announced
            .as_ref()
            .is_none_or(|(phase, _)| *phase != current.phase.id)
        {
            writeln!(self.output, "→ {}", current.phase.label)?;
            self.announced = Some((current.phase.id.to_string(), Vec::new()));
        }
        if let Some((_, steps)) = &mut self.announced {
            for step in &current.steps {
                let id = step.id.to_string();
                if !steps.contains(&id) {
                    writeln!(self.output, "  → {}", step.name)?;
                    steps.push(id);
                }
            }
        }
        Ok(())
    }

    fn ready(&mut self) -> io::Result<()> {
        self.clear_line()?;
        writeln!(self.output, "✓ Sandbox ready")
    }

    fn failed(&mut self, progress: &Progress) -> io::Result<()> {
        self.show(progress)?;
        self.clear_line()?;
        if self.interactive && !progress.output().is_empty() {
            writeln!(self.output, "  Backend output:")?;
            for line in progress.output().tail(FAILURE_OUTPUT_LINES) {
                writeln!(self.output, "    {}", line.text)?;
            }
        }
        Ok(())
    }

    fn operation_completed(&mut self, label: &str, elapsed: Duration) -> io::Result<()> {
        self.clear_line()?;
        writeln!(self.output, "✓ {label} ({})", duration(elapsed))
    }

    fn operation_failed(&mut self, label: &str, elapsed: Duration) -> io::Result<()> {
        self.clear_line()?;
        writeln!(self.output, "✗ {label} ({})", duration(elapsed))
    }

    fn start(&mut self, label: &str) -> io::Result<()> {
        if self.interactive {
            self.render_line(label)
        } else {
            writeln!(self.output, "→ {label}")
        }
    }

    fn tick(&mut self, progress: &Progress) -> io::Result<()> {
        if !self.interactive || progress.current().is_none() {
            return Ok(());
        }
        self.frame = (self.frame + 1) % SPINNER_FRAMES.len();
        self.render(progress)
    }

    fn tick_label(&mut self, label: &str) -> io::Result<()> {
        if !self.interactive {
            return Ok(());
        }
        self.frame = (self.frame + 1) % SPINNER_FRAMES.len();
        self.render_line(label)
    }

    fn render(&mut self, progress: &Progress) -> io::Result<()> {
        let Some(current) = progress.current() else {
            return Ok(());
        };
        let mut line = current.phase.label.to_string();
        if let Some(step) = progress.current_step() {
            line.push_str(" · ");
            line.push_str(&step.name);
            if let Some(measurement) = step.measurement {
                line.push_str(": ");
                line.push_str(&format_measurement(measurement));
            }
        }
        self.render_line(&line)
    }

    fn render_line(&mut self, line: &str) -> io::Result<()> {
        write!(self.output, "\r\x1b[2K{} {line}", SPINNER_FRAMES[self.frame])?;
        self.output.flush()?;
        self.line_visible = true;
        Ok(())
    }

    fn clear_line(&mut self) -> io::Result<()> {
        if self.interactive && self.line_visible {
            write!(self.output, "\r\x1b[2K")?;
            self.output.flush()?;
            self.line_visible = false;
        }
        Ok(())
    }
}

fn format_measurement(measurement: Measurement) -> String {
    format_progress(measurement.completed, measurement.total, measurement.unit)
}

fn format_progress(completed: u64, total: Option<u64>, unit: ProgressUnit) -> String {
    match (unit, total) {
        (ProgressUnit::Bytes, Some(total)) => format!("{} / {}", bytes(completed), bytes(total)),
        (ProgressUnit::Bytes, None) => bytes(completed),
        (ProgressUnit::Items, Some(total)) => format!("{completed} / {total}"),
        _ => completed.to_string(),
    }
}

fn bytes(value: u64) -> String {
    const KIB: u64 = 1024;
    const MIB: u64 = KIB * 1024;
    const GIB: u64 = MIB * 1024;
    if value >= GIB {
        scaled_bytes(value, GIB, "GiB")
    } else if value >= MIB {
        scaled_bytes(value, MIB, "MiB")
    } else if value >= KIB {
        scaled_bytes(value, KIB, "KiB")
    } else {
        format!("{value} B")
    }
}

fn scaled_bytes(value: u64, unit: u64, suffix: &str) -> String {
    let whole = value / unit;
    let decimal = (value % unit).saturating_mul(10) / unit;
    format!("{whole}.{decimal} {suffix}")
}

fn duration(value: Duration) -> String {
    if value.as_secs() >= 60 {
        format!("{}m {:02}s", value.as_secs() / 60, value.as_secs() % 60)
    } else if value.as_secs() > 0 {
        format!("{:.1}s", value.as_secs_f64())
    } else {
        format!("{}ms", value.as_millis())
    }
}
