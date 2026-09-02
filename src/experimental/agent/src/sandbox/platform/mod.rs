//! Sandbox operating-system-specific adapters.

mod linux;

use ::sandbox::execution::ExecutionSpec;

use crate::Error;

pub use linux::Linux;
pub(crate) use linux::{CONTAINER_HOST, HOME, WORKING_DIRECTORY};

/// Builds the Agent-conventional Execution environment for one Sandbox OS.
///
/// # Errors
///
/// Returns an error when the command is empty or the Sandbox operating system
/// has no Agent execution adapter.
pub fn execution_spec(os: &str, command: &[String], terminal: bool) -> Result<ExecutionSpec, Error> {
    match os {
        "linux" => linux::execution_spec(command, terminal),
        os => Err(Error::Invalid(format!(
            "command execution is not supported on Sandbox operating system {os:?}"
        ))),
    }
}
