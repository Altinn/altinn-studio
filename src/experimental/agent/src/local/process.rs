//! Host-specific process launch behavior.

/// Default `RUST_LOG` filter for `agentd` and every runtime process it spawns.
///
/// Runtime helpers inherit the daemon's stderr and install their own tracing
/// subscriber, so the filter travels through the environment rather than code.
pub const DAEMON_LOG_FILTER: &str = "info,microsandbox_agent_client=warn";

/// Gives a child daemon the default log filter unless the caller set `RUST_LOG`.
pub fn configure_logging(command: &mut std::process::Command) {
    if std::env::var_os("RUST_LOG").is_none() {
        command.env("RUST_LOG", DAEMON_LOG_FILTER);
    }
}

/// Configures a child daemon to run independently of the invoking terminal.
#[cfg(windows)]
pub fn configure_detached(command: &mut std::process::Command) {
    use std::os::windows::process::CommandExt as _;

    command.creation_flags(windows::CREATE_NEW_PROCESS_GROUP | windows::CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
pub const fn configure_detached(_command: &mut std::process::Command) {}

#[cfg(windows)]
pub(super) fn configure_hidden(command: &mut std::process::Command) {
    use std::os::windows::process::CommandExt as _;

    command.creation_flags(windows::CREATE_NO_WINDOW);
}

#[cfg(windows)]
mod windows {
    pub(super) const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
    pub(super) const CREATE_NO_WINDOW: u32 = 0x0800_0000;
}
