use std::io;

use tokio::signal::unix::{Signal, SignalKind, signal};

/// SIGINT and SIGTERM, which tell a workload to stop its Sandbox and exit.
pub struct ShutdownSignals {
    interrupt: Signal,
    terminate: Signal,
}

impl ShutdownSignals {
    /// The exit status of a workload that a signal stopped: 128 + 15, the usual shell exit status for SIGTERM. A
    /// workload exits with it also after SIGINT.
    pub const EXIT_CODE: u8 = 143;

    /// Listens for the signals from now on.
    ///
    /// # Errors
    ///
    /// Returns an error when the process cannot listen for one of the signals.
    pub fn new() -> Result<Self, io::Error> {
        Ok(Self {
            interrupt: signal(SignalKind::interrupt())?,
            terminate: signal(SignalKind::terminate())?,
        })
    }

    /// Completes when the process receives SIGINT or SIGTERM.
    pub async fn receive(&mut self) {
        tokio::select! {
            _ = self.interrupt.recv() => {}
            _ = self.terminate.recv() => {}
        }
    }
}
