use std::io;

use futures_util::StreamExt as _;
use sandbox::execution::{ExecutionEvent, ExecutionEventStream};
use sandbox_host::AnyError;
use tokio::time::{Instant, sleep_until};

/// The largest number of bytes to keep from each output stream of a command.
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

    /// Tells if the stream was longer than its limit.
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

/// Reads the events of a command until it exits or the deadline comes. It continues to read after a stream reaches
/// its limit, so that a command with much output does not stop.
///
/// # Errors
///
/// Returns an error when the command does not start, or the events end before the command exits.
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

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use bytes::Bytes;
    use futures_util::{StreamExt as _, stream};
    use sandbox::execution::{ExecutionEvent, ExecutionEventStream, ExitStatus};
    use tokio::time::Instant;

    use super::{Ending, Limits, collect};

    const LIMITS: Limits = Limits { stdout: 4, stderr: 8 };

    fn events(events: Vec<ExecutionEvent>) -> ExecutionEventStream {
        Box::pin(stream::iter(events.into_iter().map(Ok)))
    }

    fn later() -> Instant {
        Instant::now() + Duration::from_mins(1)
    }

    #[tokio::test]
    async fn keeps_the_output_and_the_exit_code() -> Result<(), sandbox_host::AnyError> {
        let mut events = events(vec![
            ExecutionEvent::Started { process_id: Some(1) },
            ExecutionEvent::Stdout(Bytes::from_static(b"ok")),
            ExecutionEvent::Stderr(Bytes::from_static(b"warn")),
            ExecutionEvent::Exited(ExitStatus { code: 3 }),
        ]);

        let collected = collect(&mut events, later(), LIMITS).await?;

        assert_eq!(collected.ending, Ending::Exited(3));
        assert_eq!(collected.stdout.bytes(), b"ok");
        assert_eq!(collected.stderr.bytes(), b"warn");
        assert!(!collected.stdout.is_cut());
        Ok(())
    }

    #[tokio::test]
    async fn cuts_a_long_stream_and_reads_until_the_exit() -> Result<(), sandbox_host::AnyError> {
        let mut events = events(vec![
            ExecutionEvent::Stdout(Bytes::from_static(b"abc")),
            ExecutionEvent::Stdout(Bytes::from_static(b"def")),
            ExecutionEvent::Stdout(Bytes::from_static(b"ghi")),
            ExecutionEvent::Exited(ExitStatus { code: 0 }),
        ]);

        let collected = collect(&mut events, later(), LIMITS).await?;

        assert_eq!(collected.ending, Ending::Exited(0));
        assert_eq!(collected.stdout.bytes(), b"abcd");
        assert!(collected.stdout.is_cut());
        Ok(())
    }

    #[tokio::test(start_paused = true)]
    async fn stops_at_the_deadline_with_the_output_so_far() -> Result<(), sandbox_host::AnyError> {
        let mut events: ExecutionEventStream = Box::pin(
            stream::iter([Ok(ExecutionEvent::Stdout(Bytes::from_static(b"so far")))]).chain(stream::pending()),
        );

        let collected = collect(&mut events, Instant::now() + Duration::from_secs(5), LIMITS).await?;

        assert_eq!(collected.ending, Ending::TimedOut);
        assert_eq!(collected.stdout.bytes(), b"so f");
        Ok(())
    }

    #[tokio::test]
    async fn fails_when_the_command_does_not_start_or_the_events_end_early() {
        let mut failed = events(vec![ExecutionEvent::Failed {
            message: "no such file".to_string(),
        }]);
        let mut ended = events(vec![ExecutionEvent::Stdout(Bytes::from_static(b"x"))]);

        assert!(collect(&mut failed, later(), LIMITS).await.is_err());
        assert!(collect(&mut ended, later(), LIMITS).await.is_err());
    }
}
