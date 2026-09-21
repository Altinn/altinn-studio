use std::{
    error::Error as StdError,
    future::Future,
    io::{self, IsTerminal as _},
    pin::pin,
    time::{Duration, Instant},
};

use futures_util::StreamExt as _;
use sandbox::{
    Error, OperationEvent, PendingSandbox, PhaseOutcome, ProgressUnit, SandboxEvent, SandboxHandle, SandboxPhase,
};
use tokio::time::{MissedTickBehavior, interval};

const SPINNER_INTERVAL: Duration = Duration::from_millis(80);
const SPINNER_FRAMES: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FAILURE_OUTPUT_LIMIT: usize = 64 * 1024;

pub(crate) async fn wait_for_sandbox(mut pending: PendingSandbox<'_>) -> Result<SandboxHandle, Box<dyn StdError>> {
    let mut display = ProgressDisplay::stderr();
    let mut ticker = spinner_ticker();

    loop {
        tokio::select! {
            event = pending.next() => match event {
                Some(Ok(OperationEvent::Progress(SandboxEvent::PhaseStarted { phase }))) => display.phase_started(phase)?,
                Some(Ok(OperationEvent::Progress(SandboxEvent::PhaseCompleted { phase, outcome, elapsed }))) => {
                    display.phase_completed(phase, outcome, elapsed)?;
                }
                Some(Ok(OperationEvent::Progress(SandboxEvent::StepStarted { name, .. }))) => display.step_started(&name)?,
                Some(Ok(OperationEvent::Progress(SandboxEvent::StepProgress { name, completed, total, unit, .. }))) => {
                    display.step_progress(&name, completed, total, unit);
                }
                Some(Ok(OperationEvent::Progress(SandboxEvent::StepOutput { bytes, .. }))) => display.step_output(&bytes)?,
                Some(Ok(OperationEvent::Progress(SandboxEvent::StepCompleted { name, elapsed, .. }))) => {
                    display.step_completed(&name, elapsed)?;
                }
                Some(Ok(OperationEvent::Ready(sandbox))) => {
                    display.ready()?;
                    return Ok(sandbox);
                }
                Some(Ok(_)) => {}
                Some(Err(error)) => {
                    display.failed()?;
                    return Err(error.into());
                }
                None => {
                    display.failed()?;
                    return Err(Error::OperationStreamEnded.into());
                }
            },
            _ = ticker.tick() => display.tick()?,
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
            _ = ticker.tick() => display.tick()?,
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
    active: Option<ActiveStatus>,
    frame: usize,
    line_visible: bool,
    raw_line_open: bool,
}

struct ActiveStatus {
    label: String,
    step: Option<String>,
    progress: Option<String>,
    failure_output: Vec<u8>,
}

impl ProgressDisplay<io::Stderr> {
    fn stderr() -> Self {
        let output = io::stderr();
        let interactive = output.is_terminal();
        Self::new(output, interactive)
    }
}

impl<W: io::Write> ProgressDisplay<W> {
    const fn new(output: W, interactive: bool) -> Self {
        Self {
            output,
            interactive,
            active: None,
            frame: 0,
            line_visible: false,
            raw_line_open: false,
        }
    }

    fn phase_started(&mut self, phase: SandboxPhase) -> io::Result<()> {
        self.start(&phase.to_string())
    }

    fn phase_completed(&mut self, phase: SandboxPhase, outcome: PhaseOutcome, elapsed: Duration) -> io::Result<()> {
        let label = phase.to_string();
        self.active = None;
        self.finish_raw_line()?;
        self.clear_line()?;
        match outcome {
            PhaseOutcome::Reused => writeln!(self.output, "✓ Reused {label} ({})", duration(elapsed)),
            _ => writeln!(self.output, "✓ {label} ({})", duration(elapsed)),
        }
    }

    fn step_started(&mut self, name: &str) -> io::Result<()> {
        if let Some(active) = &mut self.active {
            active.step = Some(name.to_string());
            active.progress = None;
        }
        if self.interactive {
            self.render()
        } else {
            self.finish_raw_line()?;
            writeln!(self.output, "  → {name}")
        }
    }

    fn step_progress(&mut self, name: &str, completed: u64, total: Option<u64>, unit: ProgressUnit) {
        if let Some(active) = &mut self.active {
            active.step = Some(name.to_string());
            active.progress = Some(format_progress(completed, total, unit));
        }
    }

    fn step_output(&mut self, bytes: &[u8]) -> io::Result<()> {
        if bytes.is_empty() {
            return Ok(());
        }
        if self.interactive {
            if let Some(active) = &mut self.active {
                retain_tail(&mut active.failure_output, bytes);
            }
            return Ok(());
        }
        self.output.write_all(bytes)?;
        self.output.flush()?;
        self.raw_line_open = bytes.last() != Some(&b'\n');
        Ok(())
    }

    fn step_completed(&mut self, name: &str, elapsed: Duration) -> io::Result<()> {
        let final_progress = self.active.as_ref().and_then(|active| active.progress.clone());
        if !self.interactive {
            self.finish_raw_line()?;
            if let Some(value) = final_progress {
                writeln!(self.output, "  ✓ {name}: {value} ({})", duration(elapsed))?;
            } else {
                writeln!(self.output, "  ✓ {name} ({})", duration(elapsed))?;
            }
        }
        if let Some(active) = &mut self.active {
            active.step = None;
            active.progress = None;
        }
        Ok(())
    }

    fn ready(&mut self) -> io::Result<()> {
        self.active = None;
        self.finish_raw_line()?;
        self.clear_line()?;
        writeln!(self.output, "✓ Sandbox ready")
    }

    fn failed(&mut self) -> io::Result<()> {
        let Some(active) = self.active.take() else {
            return Ok(());
        };
        self.finish_raw_line()?;
        self.clear_line()?;
        writeln!(self.output, "✗ {}", active.label)?;
        if !active.failure_output.is_empty() {
            writeln!(self.output, "  Backend output:")?;
            self.output.write_all(&active.failure_output)?;
            if active.failure_output.last() != Some(&b'\n') {
                writeln!(self.output)?;
            }
        }
        Ok(())
    }

    fn operation_completed(&mut self, label: &str, elapsed: Duration) -> io::Result<()> {
        self.active = None;
        self.clear_line()?;
        writeln!(self.output, "✓ {label} ({})", duration(elapsed))
    }

    fn operation_failed(&mut self, label: &str, elapsed: Duration) -> io::Result<()> {
        self.active = None;
        self.clear_line()?;
        writeln!(self.output, "✗ {label} ({})", duration(elapsed))
    }

    fn start(&mut self, label: &str) -> io::Result<()> {
        self.finish_raw_line()?;
        self.active = Some(ActiveStatus {
            label: label.to_string(),
            step: None,
            progress: None,
            failure_output: Vec::new(),
        });
        if self.interactive {
            self.render()
        } else {
            writeln!(self.output, "→ {label}")
        }
    }

    fn tick(&mut self) -> io::Result<()> {
        if !self.interactive || self.active.is_none() {
            return Ok(());
        }
        self.frame = (self.frame + 1) % SPINNER_FRAMES.len();
        self.render()
    }

    fn render(&mut self) -> io::Result<()> {
        let Some(active) = &self.active else {
            return Ok(());
        };
        write!(self.output, "\r\x1b[2K{} {}", SPINNER_FRAMES[self.frame], active.label)?;
        if let Some(step) = &active.step {
            write!(self.output, " · {step}")?;
        }
        if let Some(progress) = &active.progress {
            write!(self.output, ": {progress}")?;
        }
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

    fn finish_raw_line(&mut self) -> io::Result<()> {
        if self.raw_line_open {
            writeln!(self.output)?;
            self.raw_line_open = false;
        }
        Ok(())
    }
}

fn retain_tail(buffer: &mut Vec<u8>, bytes: &[u8]) {
    if bytes.len() >= FAILURE_OUTPUT_LIMIT {
        buffer.clear();
        buffer.extend_from_slice(&bytes[bytes.len() - FAILURE_OUTPUT_LIMIT..]);
        return;
    }
    let overflow = buffer
        .len()
        .saturating_add(bytes.len())
        .saturating_sub(FAILURE_OUTPUT_LIMIT);
    if overflow > 0 {
        buffer.copy_within(overflow.., 0);
        buffer.truncate(buffer.len() - overflow);
    }
    buffer.extend_from_slice(bytes);
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
