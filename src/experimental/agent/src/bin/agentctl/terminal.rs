//! Local terminal plumbing for daemon-owned interactive streams.

use std::{io::IsTerminal as _, time::Duration};

use agent::{Error, control_api::AttachedTerminal};
use sandbox::terminal::{TerminalAttachOutcome, TerminalEvent, TerminalSize};
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

const RESIZE_POLL_INTERVAL: Duration = Duration::from_millis(250);

/// Returns the current terminal size after validating interactive stdio.
pub(super) fn current_size() -> Result<TerminalSize, Error> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        return Err(Error::Invalid(
            "operation requires an interactive local terminal".into(),
        ));
    }
    let (columns, rows) = crossterm::terminal::size()?;
    TerminalSize::new(rows, columns).map_err(|error| Error::Invalid(error.to_string()))
}

/// Pumps raw input, output, and resizes until the remote terminal ends.
pub(super) async fn run(terminal: AttachedTerminal) -> Result<TerminalAttachOutcome, Error> {
    let _raw_mode = RawMode::enter()?;
    let AttachedTerminal {
        mut input, mut events, ..
    } = terminal;
    let mut stdin = tokio::io::stdin();
    let mut stdout = tokio::io::stdout();
    let mut input_open = true;
    let mut input_buffer = [0_u8; 8192];
    let mut size = current_size()?;
    let mut resize = tokio::time::interval(RESIZE_POLL_INTERVAL);
    resize.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

    loop {
        tokio::select! {
            read = stdin.read(&mut input_buffer), if input_open => {
                let read = read?;
                if read == 0 {
                    input.close().await?;
                    input_open = false;
                } else {
                    input.write(&input_buffer[..read]).await?;
                }
            }
            event = events.next() => match event? {
                Some(TerminalEvent::Started { .. }) => {}
                Some(TerminalEvent::Output(data)) => {
                    stdout.write_all(&data).await?;
                    stdout.flush().await?;
                }
                Some(TerminalEvent::Exited(status)) => {
                    stdout.flush().await?;
                    return Ok(TerminalAttachOutcome::Exited(status));
                }
                Some(TerminalEvent::Failed { message }) => return Err(Error::Session(message)),
                Some(_) => return Err(Error::Session("terminal stream returned an unsupported event".into())),
                None => return Err(Error::Session("terminal stream ended without an outcome".into())),
            },
            _ = resize.tick() => {
                let current = current_size()?;
                if current != size {
                    input.resize(current).await?;
                    size = current;
                }
            }
        }
    }
}

struct RawMode;

impl RawMode {
    fn enter() -> Result<Self, Error> {
        crossterm::terminal::enable_raw_mode()?;
        Ok(Self)
    }
}

impl Drop for RawMode {
    fn drop(&mut self) {
        let _ignored = crossterm::terminal::disable_raw_mode();
    }
}
