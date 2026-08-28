//! Host-specific process launch behavior.

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
