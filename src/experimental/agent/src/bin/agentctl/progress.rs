use std::io::{self, IsTerminal as _, Write as _};

use agent::progress::{Event, PhaseOutcome, ProgressUnit};

pub(crate) struct Renderer {
    output: io::Stderr,
    interactive: bool,
    active_line: bool,
    last_error: Option<String>,
}

impl Renderer {
    pub(crate) fn stderr() -> Self {
        let output = io::stderr();
        let interactive = output.is_terminal();
        Self {
            output,
            interactive,
            active_line: false,
            last_error: None,
        }
    }

    pub(crate) fn render(&mut self, event: Event) {
        let _ignored = self.render_inner(event);
    }

    pub(crate) fn finish(&mut self) {
        let _ignored = self.clear_active_line();
    }

    fn render_inner(&mut self, event: Event) -> io::Result<()> {
        match event {
            Event::PhaseStarted { message, .. } => {
                self.clear_active_line()?;
                writeln!(self.output, "→ {message}")
            }
            Event::PhaseCompleted {
                message,
                outcome,
                elapsed_ms,
                ..
            } => {
                self.clear_active_line()?;
                let reused = if outcome == PhaseOutcome::Reused { "Reused " } else { "" };
                writeln!(self.output, "✓ {reused}{message} ({})", duration(elapsed_ms))
            }
            Event::StepStarted { message, .. } => {
                if self.interactive {
                    self.render_active(&message)
                } else {
                    writeln!(self.output, "  → {message}")
                }
            }
            Event::StepProgress {
                message,
                completed,
                total,
                unit,
                ..
            } => {
                let progress = format_progress(completed, total, unit);
                if self.interactive {
                    self.render_active(&format!("{message}: {progress}"))
                } else {
                    writeln!(self.output, "  {message}: {progress}")
                }
            }
            Event::StepOutput { detail, .. } => {
                if self.interactive || detail.is_empty() {
                    Ok(())
                } else {
                    self.output.write_all(detail.as_bytes())?;
                    if !detail.ends_with('\n') {
                        writeln!(self.output)?;
                    }
                    self.output.flush()
                }
            }
            Event::StepCompleted {
                message, elapsed_ms, ..
            } => {
                self.clear_active_line()?;
                writeln!(self.output, "  ✓ {message} ({})", duration(elapsed_ms))
            }
            Event::Condition {
                condition,
                status,
                reason,
                message,
                failure,
                ..
            } => {
                self.clear_active_line()?;
                if failure.is_some() {
                    let diagnostic = if message.is_empty() {
                        reason.clone()
                    } else {
                        message.clone()
                    };
                    if self.last_error.as_ref() == Some(&diagnostic) {
                        return Ok(());
                    }
                    self.last_error = Some(diagnostic);
                    if message.is_empty() {
                        writeln!(self.output, "error: {reason}")
                    } else {
                        writeln!(self.output, "error: {reason}: {message}")
                    }
                } else if condition == "Ready" && status == agent::ConditionStatus::True {
                    writeln!(self.output, "✓ Agent ready")
                } else {
                    Ok(())
                }
            }
        }
    }

    fn render_active(&mut self, message: &str) -> io::Result<()> {
        write!(self.output, "\r\x1b[2K{message}")?;
        self.output.flush()?;
        self.active_line = true;
        Ok(())
    }

    fn clear_active_line(&mut self) -> io::Result<()> {
        if self.interactive && self.active_line {
            write!(self.output, "\r\x1b[2K")?;
            self.output.flush()?;
            self.active_line = false;
        }
        Ok(())
    }
}

fn format_progress(completed: u64, total: Option<u64>, unit: ProgressUnit) -> String {
    match (unit, total) {
        (ProgressUnit::Bytes, Some(total)) => format!("{} / {}", bytes(completed), bytes(total)),
        (ProgressUnit::Bytes, None) => bytes(completed),
        (ProgressUnit::Items | ProgressUnit::Unknown, Some(total)) => format!("{completed} / {total}"),
        (ProgressUnit::Items | ProgressUnit::Unknown, None) => completed.to_string(),
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
