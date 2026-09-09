//! Direct transient Execution transport for the Microsandbox Backend.

use sandbox::{execution, provider::SandboxProvider as _};
use sandbox_microsandbox::MicrosandboxProvider;

use crate::{Error, sandbox::Assignment};

/// Starts an Execution in an already-materialized Microsandbox.
///
/// # Errors
///
/// Returns an error when the assignment is not materialized or the exact
/// Microsandbox cannot be inspected or start the Execution.
pub(crate) async fn start_execution(
    home: &std::path::Path,
    assignment: &Assignment,
    spec: execution::ExecutionSpec,
) -> Result<execution::StartedExecution, Error> {
    let provider = MicrosandboxProvider::open(home.join("microsandbox")).await?;
    let Assignment::Materialized { id, .. } = assignment else {
        return Err(Error::Invalid("Execution target Sandbox is not materialized".into()));
    };
    provider.backend().inspect(id).await?;
    provider
        .backend()
        .start_execution(id, execution::StartExecutionRequest::new(spec))
        .await
        .map_err(Error::from)
}
