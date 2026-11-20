use std::{io, time::Duration};

use crate::AnyError;

const DELETE_TIMEOUT: Duration = Duration::from_mins(1);

/// Waits for a Sandbox delete, such as `service.delete(name)` or `handle.delete()`, for at most one minute.
///
/// # Errors
///
/// Returns an error when the delete fails, or when it does not complete in one minute.
pub async fn delete_in_time(delete: impl Future<Output = Result<(), sandbox::Error>>) -> Result<(), AnyError> {
    tokio::time::timeout(DELETE_TIMEOUT, delete).await.map_or_else(
        |_| Err(io::Error::new(io::ErrorKind::TimedOut, "Sandbox deletion timed out").into()),
        |deleted| deleted.map_err(Into::into),
    )
}
