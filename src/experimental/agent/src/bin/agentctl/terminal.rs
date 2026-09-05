//! Local terminal plumbing for daemon-owned interactive streams.

#[cfg(unix)]
mod unix;
#[cfg(any(windows, test))]
mod windows;

#[cfg(unix)]
use unix::LocalEvents;
#[cfg(windows)]
use windows::LocalEvents;

use std::io::IsTerminal as _;

use agent::{
    Error, Harness,
    control_api::{AttachedTerminal, Client},
    sessions::SessionName,
};
use sandbox::terminal::{TerminalAttachOutcome, TerminalEvent, TerminalSize};
use tokio::io::AsyncWriteExt as _;

const DETACH: u8 = 0x1d; // Ctrl+], matching the former Microsandbox attachment default.

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

/// Shared CLI/TUI workflow for preparing and attaching to a Session.
pub(super) async fn attach_session(
    client: &Client,
    agent: &str,
    session: SessionName,
    harness: Option<Harness>,
) -> Result<(), Error> {
    eprintln!(
        "Ensuring Agent {agent:?} and Session {name:?}; initial provisioning can take several minutes...",
        name = session.as_str()
    );
    client.ensure_session(agent, session.clone(), harness).await?;
    let initial_size = current_size()?;
    let terminal = client.attach_session(agent, session, initial_size).await?;
    match run(terminal).await? {
        TerminalAttachOutcome::Exited(status) if status.success() => Ok(()),
        TerminalAttachOutcome::Detached => Ok(()),
        TerminalAttachOutcome::Exited(status) => Err(Error::Session(format!(
            "tmux attachment exited with code {}",
            status.code
        ))),
        _ => Err(Error::Session(
            "terminal attachment returned an unsupported outcome".into(),
        )),
    }
}

/// Pumps raw input, output, and resizes until the remote terminal ends.
pub(super) async fn run(terminal: AttachedTerminal) -> Result<TerminalAttachOutcome, Error> {
    let _raw_mode = RawMode::enter()?;
    let AttachedTerminal {
        input: mut remote_input,
        mut events,
        ..
    } = terminal;
    #[cfg(unix)]
    let mut local_events = LocalEvents::open()?;
    #[cfg(windows)]
    let mut local_events = LocalEvents::open();
    let mut stdout = tokio::io::stdout();

    loop {
        tokio::select! {
            event = local_events.next(), if local_events.is_open() => {
                match event? {
                    LocalInput::Bytes(data) => {
                        let (forward, detached) = before_detach(&data);
                        remote_input.write(forward).await?;
                        if detached {
                            return Ok(TerminalAttachOutcome::Detached);
                        }
                    }
                    LocalInput::Resize(size) => remote_input.resize(size).await?,
                    LocalInput::Close => {
                        remote_input.close().await?;
                        local_events.close();
                    }
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
        }
    }
}

#[derive(Debug, Eq, PartialEq)]
enum LocalInput {
    Bytes(Vec<u8>),
    Resize(TerminalSize),
    Close,
}

fn before_detach(data: &[u8]) -> (&[u8], bool) {
    data.iter()
        .position(|byte| *byte == DETACH)
        .map_or((data, false), |detach| (&data[..detach], true))
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

#[cfg(test)]
mod tests {
    use super::before_detach;

    #[test]
    fn raw_input_is_preserved_until_the_detach_byte() {
        assert_eq!(before_detach(b"\x1b[>1uhello"), (b"\x1b[>1uhello".as_slice(), false));
        assert_eq!(before_detach(b"hello\x1dignored"), (b"hello".as_slice(), true));
    }
}
