//! OpenSSH server state written into Linux Sandboxes for SSH access.
//!
//! The image installs `openssh-server`, a hardened `sshd_config` and the
//! `agent-ssh.service` unit, which only starts once the host key exists. This
//! module writes that key, the client's `authorized_keys` and enables the unit,
//! or removes all of it when access is withdrawn. Everything lives under
//! `/var/lib/agent/ssh`, on the persistent root filesystem: `/run` is a tmpfs
//! and setup does not rerun on a guest reboot.

use ::sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::{Error, ssh::GuestMaterial};

use super::{
    files::write_if_changed,
    linux::{run_checked, wait_for_systemd},
};

/// Directory holding every server file `agentd` writes.
pub(crate) const STATE_DIRECTORY: &str = "/var/lib/agent/ssh";
/// Host private key; also the unit's `ConditionPathExists`.
pub(crate) const HOST_KEY: &str = "/var/lib/agent/ssh/ssh_host_ed25519_key";
/// Host public key, kept beside the private key as OpenSSH expects.
pub(crate) const HOST_KEY_PUBLIC: &str = "/var/lib/agent/ssh/ssh_host_ed25519_key.pub";
/// Keys allowed to log in as the guest user.
pub(crate) const AUTHORIZED_KEYS: &str = "/var/lib/agent/ssh/authorized_keys";
/// The server executable the image must provide.
pub(crate) const SERVER: &str = "/usr/sbin/sshd";
/// The image-owned unit running the server on the guest loopback.
pub(crate) const UNIT: &str = "agent-ssh.service";

/// Confirms the image provides an OpenSSH server.
///
/// # Errors
///
/// Returns `Error::Invalid` when the server is missing: the image is immutable
/// for the incarnation, so retrying cannot change that.
pub(crate) async fn verify_server(sandbox: &SandboxHandle) -> Result<(), Error> {
    if path_exists(sandbox, "-x", SERVER).await? {
        Ok(())
    } else {
        Err(Error::Invalid(crate::ssh::SERVER_MISSING.into()))
    }
}

/// Writes the host key and `authorized_keys`, then enables and starts the server.
///
/// Idempotent: the files are rewritten with identical content on every pass and
/// `systemctl enable --now` leaves a running unit alone.
///
/// # Errors
///
/// Returns an error when a file cannot be written or a setup command fails.
pub(crate) async fn install_server_state(sandbox: &SandboxHandle, material: &GuestMaterial) -> Result<(), Error> {
    wait_for_systemd(sandbox).await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "-n",
            "/usr/bin/install",
            "-d",
            "-m",
            "0755",
            "-o",
            "root",
            "-g",
            "root",
            STATE_DIRECTORY,
        ],
    )
    .await?;
    write_if_changed(sandbox, HOST_KEY, &material.host_private_key).await?;
    write_if_changed(
        sandbox,
        HOST_KEY_PUBLIC,
        format!("{}\n", material.host_public_key).as_bytes(),
    )
    .await?;
    write_if_changed(sandbox, AUTHORIZED_KEYS, material.authorized_keys.as_bytes()).await?;
    // sshd refuses a host key readable by anyone but root, and StrictModes
    // requires authorized_keys and its directory to be owned by root or the
    // user and writable by no one else.
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "-n",
            "/bin/chown",
            "root:root",
            HOST_KEY,
            HOST_KEY_PUBLIC,
            AUTHORIZED_KEYS,
        ],
    )
    .await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/chmod", "0600", HOST_KEY]).await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/bin/chmod", "0644", HOST_KEY_PUBLIC, AUTHORIZED_KEYS],
    )
    .await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/usr/bin/systemctl", "enable", "--now", UNIT],
    )
    .await
}

/// Stops and disables the server and removes its state, when any exists.
///
/// # Errors
///
/// Returns an error when the state cannot be inspected or removed.
pub(crate) async fn remove_server_state(sandbox: &SandboxHandle) -> Result<(), Error> {
    if !path_exists(sandbox, "-e", STATE_DIRECTORY).await? {
        return Ok(());
    }
    wait_for_systemd(sandbox).await?;
    // An image without the unit has nothing to disable; the key removal below
    // is what keeps any other server from starting.
    let _ignored = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/sudo"),
            ["-n", "/usr/bin/systemctl", "disable", "--now", UNIT].map(str::to_owned),
        ))
        .await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/rm", "-rf", STATE_DIRECTORY]).await
}

async fn path_exists(sandbox: &SandboxHandle, test: &str, path: &str) -> Result<bool, Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/test"),
            [test.to_owned(), path.to_owned()],
        ))
        .await?;
    match output.status.code {
        0 => Ok(true),
        1 => Ok(false),
        code => Err(Error::SandboxSetup(format!(
            "presence check `test {test} {path}` exited with code {code}"
        ))),
    }
}
