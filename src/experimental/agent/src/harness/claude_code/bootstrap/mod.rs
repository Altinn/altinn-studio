//! Sandbox-platform-specific Claude Code configuration.

mod linux;

pub(super) async fn configure_linux(sandbox: &sandbox::SandboxHandle, home: &str) -> Result<(), crate::Error> {
    linux::configure(sandbox, home).await
}
