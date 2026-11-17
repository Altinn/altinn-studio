use std::io;

use futures_util::StreamExt as _;
use sandbox::execution::{ExecutionEvent, ExecutionEventStream};
use sandbox_hosting::AnyError;
use tokio::time::{Instant, sleep_until};

/// The maximum number of bytes that the operator runner keeps from each output stream of a command.
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub stdout: usize,
    pub stderr: usize,
}

/// The start of an output stream, up to its limit.
#[derive(Debug, Default)]
pub struct Captured {
    bytes: Vec<u8>,
    cut: bool,
}

impl Captured {
    #[must_use]
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }

    /// Returns `true` if the stream was longer than its limit.
    #[must_use]
    pub const fn is_cut(&self) -> bool {
        self.cut
    }

    fn push(&mut self, chunk: &[u8], limit: usize) {
        let kept = chunk.len().min(limit.saturating_sub(self.bytes.len()));
        self.bytes.extend_from_slice(&chunk[..kept]);
        self.cut |= kept < chunk.len();
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Ending {
    Exited(i32),
    TimedOut,
}

#[derive(Debug)]
pub struct Collected {
    pub ending: Ending,
    pub stdout: Captured,
    pub stderr: Captured,
}

/// Reads the events of a command until the command exits, or until the deadline. It continues to read after a stream
/// reaches its limit, so that a command with much output does not block.
///
/// # Errors
///
/// Returns an error when the command does not start, or when the events stop before the command exits.
pub async fn collect(
    events: &mut ExecutionEventStream,
    deadline: Instant,
    limits: Limits,
) -> Result<Collected, AnyError> {
    let mut stdout = Captured::default();
    let mut stderr = Captured::default();
    let ending = loop {
        let event = tokio::select! {
            event = events.next() => event,
            () = sleep_until(deadline) => break Ending::TimedOut,
        };
        match event {
            Some(Ok(ExecutionEvent::Stdout(chunk))) => stdout.push(&chunk, limits.stdout),
            Some(Ok(ExecutionEvent::Stderr(chunk))) => stderr.push(&chunk, limits.stderr),
            Some(Ok(ExecutionEvent::Exited(status))) => break Ending::Exited(status.code),
            Some(Ok(ExecutionEvent::Failed { message })) => {
                return Err(io::Error::other(format!("the command did not start: {message}")).into());
            }
            Some(Ok(_)) => {}
            Some(Err(error)) => return Err(error.into()),
            None => return Err(io::Error::other("the command output ended before the command exited").into()),
        }
    };
    Ok(Collected { ending, stdout, stderr })
}
