//! Bidirectional terminal execution inside a running Sandbox.

use std::{fmt, pin::Pin, rc::Rc};

use bytes::Bytes;
use futures_core::Stream;

use crate::{Error, LocalFuture, execution};

/// Character-cell dimensions of a terminal.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TerminalSize {
    rows: u16,
    columns: u16,
}

impl TerminalSize {
    /// Conventional terminal size used when the host cannot report one.
    pub const DEFAULT: Self = Self { rows: 24, columns: 80 };

    /// Creates non-zero terminal dimensions.
    ///
    /// # Errors
    ///
    /// Returns an error when either dimension is zero.
    pub const fn new(rows: u16, columns: u16) -> Result<Self, InvalidTerminalSize> {
        if rows == 0 || columns == 0 {
            return Err(InvalidTerminalSize);
        }
        Ok(Self { rows, columns })
    }

    /// Returns the terminal height in character cells.
    #[must_use]
    pub const fn rows(self) -> u16 {
        self.rows
    }

    /// Returns the terminal width in character cells.
    #[must_use]
    pub const fn columns(self) -> u16 {
        self.columns
    }
}

impl Default for TerminalSize {
    fn default() -> Self {
        Self::DEFAULT
    }
}

/// A terminal size contained a zero dimension.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct InvalidTerminalSize;

impl fmt::Display for InvalidTerminalSize {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("terminal rows and columns must both be non-zero")
    }
}

impl std::error::Error for InvalidTerminalSize {}

/// Starts a terminal-backed Execution in a running Sandbox.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StartTerminalExecutionRequest {
    /// Backend-neutral identity assigned before dispatch.
    id: execution::ExecutionId,
    /// Desired command and process environment.
    spec: execution::ExecutionSpec,
    /// Dimensions assigned before the process starts.
    initial_size: TerminalSize,
}

impl StartTerminalExecutionRequest {
    /// Creates a request with a freshly assigned Execution identifier.
    #[must_use]
    pub fn new(spec: execution::ExecutionSpec, initial_size: TerminalSize) -> Self {
        Self {
            id: execution::ExecutionId::generate(),
            spec,
            initial_size,
        }
    }

    /// Returns the assigned Execution identifier.
    #[must_use]
    pub const fn id(&self) -> &execution::ExecutionId {
        &self.id
    }

    /// Returns the desired command and process environment.
    #[must_use]
    pub const fn spec(&self) -> &execution::ExecutionSpec {
        &self.spec
    }

    /// Returns the terminal dimensions assigned before process start.
    #[must_use]
    pub const fn initial_size(&self) -> TerminalSize {
        self.initial_size
    }

    /// Decomposes the request for a Backend implementation.
    #[must_use]
    pub fn into_parts(self) -> (execution::ExecutionId, execution::ExecutionSpec, TerminalSize) {
        (self.id, self.spec, self.initial_size)
    }
}

/// Attaches the caller's terminal to an interactive Execution in a running Sandbox.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttachTerminalRequest {
    spec: execution::ExecutionSpec,
}

impl AttachTerminalRequest {
    /// Creates a terminal attachment request.
    #[must_use]
    pub const fn new(spec: execution::ExecutionSpec) -> Self {
        Self { spec }
    }

    /// Returns the desired command and process environment.
    #[must_use]
    pub const fn spec(&self) -> &execution::ExecutionSpec {
        &self.spec
    }

    /// Decomposes the request for a Backend implementation.
    #[must_use]
    pub fn into_spec(self) -> execution::ExecutionSpec {
        self.spec
    }
}

/// Terminal condition observed when an attachment ends.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum TerminalAttachOutcome {
    /// The attached Execution exited.
    Exited(execution::ExitStatus),
    /// The caller detached before an Execution exit was observed.
    Detached,
}

/// Input and terminal controls tied to one live addressable terminal Execution.
pub trait TerminalControl {
    /// Writes raw terminal input bytes, applying backend transport backpressure.
    fn write_input(&self, bytes: Bytes) -> LocalFuture<'_, Result<(), Error>>;

    /// Closes the input stream and sends end-of-file to the process.
    fn close_input(&self) -> LocalFuture<'_, Result<(), Error>>;

    /// Changes the terminal's character-cell dimensions.
    fn resize(&self, size: TerminalSize) -> LocalFuture<'_, Result<(), Error>>;
}

/// One event from a live terminal Execution.
#[derive(Clone, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum TerminalEvent {
    /// The process started.
    Started {
        /// Backend-reported process identifier, when available.
        process_id: Option<u32>,
    },
    /// Raw terminal output bytes. A terminal combines standard output and error.
    Output(Bytes),
    /// The process exited.
    Exited(execution::ExitStatus),
    /// The process could not be started.
    Failed {
        /// Backend-neutral failure description.
        message: String,
    },
}

/// A non-`Send` stream of events from one live terminal Execution.
pub type TerminalEventStream = Pin<Box<dyn Stream<Item = Result<TerminalEvent, Error>>>>;

/// A newly started, addressable terminal Execution.
pub struct StartedTerminalExecution {
    /// Identifier accepted by the common Execution termination operations.
    pub id: execution::ExecutionId,
    /// Bidirectional controls for the transient terminal connection.
    pub control: Rc<dyn TerminalControl>,
    /// Events emitted until the Execution exits or fails.
    pub events: TerminalEventStream,
}

impl fmt::Debug for StartedTerminalExecution {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("StartedTerminalExecution")
            .field("id", &self.id)
            .finish_non_exhaustive()
    }
}
