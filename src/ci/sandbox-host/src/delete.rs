use std::{io, time::Duration};

use sandbox::{SandboxHandle, SandboxName, SandboxService};

use crate::AnyError;

const DELETE_TIMEOUT: Duration = Duration::from_mins(1);

/// Deletes the named Sandbox and all its files, if the Sandbox exists.
///
/// # Errors
///
/// Returns an error when the delete fails, or when it does not complete in one minute.
pub async fn delete_sandbox(service: &SandboxService, name: &SandboxName) -> Result<(), AnyError> {
    in_time(service.delete(name)).await
}

/// Deletes the Sandbox of `handle` and all its files.
///
/// # Errors
///
/// Returns an error when the delete fails, or when it does not complete in one minute.
pub async fn delete_sandbox_of(handle: SandboxHandle) -> Result<(), AnyError> {
    in_time(handle.delete()).await
}

async fn in_time(delete: impl Future<Output = Result<(), sandbox::Error>>) -> Result<(), AnyError> {
    tokio::time::timeout(DELETE_TIMEOUT, delete).await.map_or_else(
        |_| Err(io::Error::new(io::ErrorKind::TimedOut, "Sandbox deletion timed out").into()),
        |deleted| deleted.map_err(Into::into),
    )
}
