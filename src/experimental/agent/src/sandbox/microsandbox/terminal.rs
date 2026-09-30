//! Terminal attachment transport for the Microsandbox Backend.

use sandbox::{
    provider::SandboxProvider as _,
    terminal::{AttachTerminalRequest, TerminalAttachOutcome},
};
use sandbox_microsandbox::MicrosandboxProvider;

use crate::{Error, sandbox::Assignment};

/// Attaches the caller's terminal to an Execution in a materialized Sandbox.
///
/// # Errors
///
/// Returns an error when the Microsandbox cannot be inspected or attached.
pub async fn attach_terminal(
    home: &std::path::Path,
    assignment: &Assignment,
    request: AttachTerminalRequest,
) -> Result<TerminalAttachOutcome, Error> {
    // TODO: Route attachment through the daemon once it can proxy an interactive terminal stream.
    let provider = MicrosandboxProvider::open(home.join("microsandbox")).await?;
    let Assignment::Materialized { id, .. } = assignment else {
        return Err(Error::Invalid("Session target Sandbox is not materialized".into()));
    };
    let sandbox = provider.backend().inspect(id).await?;
    let outcome = provider.backend().attach_terminal(&sandbox.id, request).await?;
    Ok(outcome)
}
