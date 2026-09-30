//! Streaming command execution inside a running Sandbox.

use std::{collections::BTreeMap, future::poll_fn, pin::Pin};

use bytes::{Bytes, BytesMut};
use futures_core::Stream;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{Error, SandboxPath};

/// Identifies a live Execution within a Sandbox.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct ExecutionId(Uuid);

impl ExecutionId {
    pub(crate) fn generate() -> Self {
        Self(Uuid::new_v4())
    }

    /// Returns the UUID representation.
    #[must_use]
    pub const fn as_uuid(&self) -> &Uuid {
        &self.0
    }
}

impl std::fmt::Display for ExecutionId {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(formatter)
    }
}

impl std::str::FromStr for ExecutionId {
    type Err = uuid::Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        value.parse().map(Self)
    }
}

/// Program selection for an Execution.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Program {
    /// Use the default OCI entrypoint and command from the Image.
    ImageEntrypoint,
    /// Run one executable with explicit arguments.
    Command {
        /// Executable path inside the Sandbox.
        executable: SandboxPath,
        /// Arguments passed directly to the executable.
        args: Vec<String>,
    },
}

/// Desired command and process environment.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ExecutionSpec {
    /// Program to run.
    program: Program,
    /// Working directory inside the Sandbox, or the Image default when absent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    working_directory: Option<SandboxPath>,
    /// Environment additions for the process.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    environment: BTreeMap<String, String>,
}

impl ExecutionSpec {
    /// Creates a process specification from a program selection.
    #[must_use]
    pub const fn new(program: Program) -> Self {
        Self {
            program,
            working_directory: None,
            environment: BTreeMap::new(),
        }
    }

    /// Uses the Image's default OCI entrypoint and command.
    #[must_use]
    pub const fn image_entrypoint() -> Self {
        Self::new(Program::ImageEntrypoint)
    }

    /// Runs one executable with explicit arguments.
    #[must_use]
    pub fn command(executable: SandboxPath, args: impl IntoIterator<Item = String>) -> Self {
        Self::new(Program::Command {
            executable,
            args: args.into_iter().collect(),
        })
    }

    /// Sets the working directory inside the Sandbox.
    #[must_use]
    pub fn with_working_directory(mut self, path: SandboxPath) -> Self {
        self.working_directory = Some(path);
        self
    }

    /// Adds environment variables for the process.
    #[must_use]
    pub fn with_environment(mut self, values: impl IntoIterator<Item = (String, String)>) -> Self {
        self.environment.extend(values);
        self
    }

    /// Returns the selected program.
    #[must_use]
    pub const fn program(&self) -> &Program {
        &self.program
    }

    /// Returns the optional working directory.
    #[must_use]
    pub const fn working_directory(&self) -> Option<&SandboxPath> {
        self.working_directory.as_ref()
    }

    /// Returns process environment additions.
    #[must_use]
    pub const fn environment(&self) -> &BTreeMap<String, String> {
        &self.environment
    }
}

/// Starts an Execution in a running Sandbox.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StartExecutionRequest {
    /// Backend-neutral identity assigned before dispatch.
    id: ExecutionId,
    /// Desired command and process environment.
    spec: ExecutionSpec,
}

impl StartExecutionRequest {
    /// Creates a request with a freshly assigned Execution identifier.
    #[must_use]
    pub fn new(spec: ExecutionSpec) -> Self {
        Self {
            id: ExecutionId::generate(),
            spec,
        }
    }

    /// Returns the assigned Execution identifier.
    #[must_use]
    pub const fn id(&self) -> &ExecutionId {
        &self.id
    }

    /// Returns the desired command and process environment.
    #[must_use]
    pub const fn spec(&self) -> &ExecutionSpec {
        &self.spec
    }

    /// Decomposes the request for a Backend implementation.
    #[must_use]
    pub fn into_parts(self) -> (ExecutionId, ExecutionSpec) {
        (self.id, self.spec)
    }
}

/// Process exit status reported by a Sandbox Backend.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ExitStatus {
    /// Process exit code.
    pub code: i32,
}

impl ExitStatus {
    /// Reports whether the process exited with code zero.
    #[must_use]
    pub const fn success(self) -> bool {
        self.code == 0
    }
}

/// One event from a live Execution.
#[derive(Clone, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ExecutionEvent {
    /// The process started.
    Started {
        /// Backend-reported process identifier, when available.
        process_id: Option<u32>,
    },
    /// Raw standard-output bytes.
    Stdout(Bytes),
    /// Raw standard-error bytes.
    Stderr(Bytes),
    /// The process exited.
    Exited(ExitStatus),
    /// The process could not be started.
    Failed {
        /// Backend-neutral failure description.
        message: String,
    },
}

/// A non-`Send` stream of events from one live Execution.
pub type ExecutionEventStream = Pin<Box<dyn Stream<Item = Result<ExecutionEvent, Error>>>>;

/// A newly started, addressable Execution and its transient event stream.
pub struct StartedExecution {
    /// Identifier used for Execution control operations.
    pub id: ExecutionId,
    /// Events emitted until the Execution exits or fails.
    pub events: ExecutionEventStream,
}

/// Collected output from a completed Execution.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionOutput {
    /// Addressable Execution identifier.
    pub id: ExecutionId,
    /// Process exit status.
    pub status: ExitStatus,
    /// Complete raw standard output.
    pub stdout: Bytes,
    /// Complete raw standard error.
    pub stderr: Bytes,
}

impl StartedExecution {
    /// Consumes the live event stream and collects all process output in memory.
    ///
    /// Callers expecting unbounded output should consume [`Self::events`]
    /// directly.
    ///
    /// # Errors
    ///
    /// Returns an error when the process cannot start or the event stream ends
    /// without an exit status.
    pub async fn collect(mut self) -> Result<ExecutionOutput, Error> {
        let execution_id = self.id.clone();
        let mut stdout = BytesMut::new();
        let mut stderr = BytesMut::new();

        while let Some(event) = poll_fn(|context| self.events.as_mut().poll_next(context)).await {
            match event? {
                ExecutionEvent::Started { .. } => {}
                ExecutionEvent::Stdout(chunk) => stdout.extend_from_slice(&chunk),
                ExecutionEvent::Stderr(chunk) => stderr.extend_from_slice(&chunk),
                ExecutionEvent::Exited(status) => {
                    return Ok(ExecutionOutput {
                        id: execution_id,
                        status,
                        stdout: stdout.freeze(),
                        stderr: stderr.freeze(),
                    });
                }
                ExecutionEvent::Failed { message } => {
                    return Err(Error::ExecutionFailed {
                        id: execution_id,
                        message,
                    });
                }
            }
        }

        Err(Error::ExecutionStreamEnded { id: execution_id })
    }
}
