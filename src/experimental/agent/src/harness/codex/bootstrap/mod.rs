//! Sandbox-platform-specific Codex CLI configuration.

mod linux;

pub(super) async fn configure_linux(
    sandbox: &sandbox::SandboxHandle,
    home: &str,
    instructions: Option<&[u8]>,
) -> Result<(), crate::Error> {
    linux::configure(sandbox, home, instructions).await
}
