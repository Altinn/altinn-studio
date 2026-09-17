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
/// The image-owned server policy the unit runs with.
pub(crate) const SERVER_CONFIG: &str = "/etc/agent/sshd_config";
/// Where the image installs the unit.
pub(crate) const UNIT_FILE: &str = "/etc/systemd/system/agent-ssh.service";
/// `systemctl`, the only supported guest service manager today.
const SYSTEMCTL: &str = "/usr/bin/systemctl";
/// Present exactly when systemd is the running init; the marker systemd documents for this purpose.
const SYSTEMD_RUNNING: &str = "/run/systemd/system";

/// Confirms the image satisfies the whole SSH access contract: the server, the
/// platform's policy and unit, and systemd as the running init to start it.
///
/// systemd is one init system among several a Sandbox could boot; nothing here
/// assumes it beyond checking for it, and an image without it cannot run the
/// unit it would otherwise have to ship.
///
/// # Errors
///
/// Returns `Error::Invalid` naming the missing piece: the image is immutable for
/// the incarnation, so retrying cannot change that.
pub(crate) async fn verify_server(sandbox: &SandboxHandle) -> Result<(), Error> {
    let contract = [
        ("-x", SERVER, "/usr/sbin/sshd is missing"),
        ("-f", SERVER_CONFIG, "/etc/agent/sshd_config is missing"),
        ("-f", UNIT_FILE, "the agent-ssh.service unit is missing"),
        ("-x", SYSTEMCTL, "systemctl is missing"),
        (
            "-d",
            SYSTEMD_RUNNING,
            "systemd is not the running init, and the unit needs it",
        ),
    ];
    for (test, path, what) in contract {
        if !path_exists(sandbox, test, path).await? {
            return Err(Error::Invalid(crate::ssh::image_contract_missing(what)));
        }
    }
    Ok(())
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
/// The state is removed only after the server is confirmed stopped, so a
/// failed stop is retried on the next pass instead of leaving a running server
/// behind an empty directory. Without systemd as the running init nothing
/// could have started the unit, so only the files are removed.
///
/// # Errors
///
/// Returns an error when the state cannot be inspected, the server cannot be
/// stopped, or the state cannot be removed.
pub(crate) async fn remove_server_state(sandbox: &SandboxHandle) -> Result<(), Error> {
    if !path_exists(sandbox, "-e", STATE_DIRECTORY).await? {
        return Ok(());
    }
    if path_exists(sandbox, "-x", SYSTEMCTL).await? && path_exists(sandbox, "-d", SYSTEMD_RUNNING).await? {
        wait_for_systemd(sandbox).await?;
        let args = ["-n", SYSTEMCTL, "disable", "--now", UNIT];
        let output = sandbox
            .run_execution(ExecutionSpec::command(
                SandboxPath::new("/usr/bin/sudo"),
                args.map(str::to_owned),
            ))
            .await?;
        // An image that never shipped the unit has nothing to stop; every other
        // failure means the server may still be running.
        if !output.status.success() && !unit_is_missing(&output) {
            return Err(Error::SandboxSetup(format!(
                "command `/usr/bin/sudo {}` exited with code {}: {}",
                args.join(" "),
                output.status.code,
                String::from_utf8_lossy(&output.stderr).trim()
            )));
        }
    }
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/rm", "-rf", STATE_DIRECTORY]).await
}

/// Recognizes systemd's report that a unit file does not exist.
fn unit_is_missing(output: &::sandbox::execution::ExecutionOutput) -> bool {
    let stderr = String::from_utf8_lossy(&output.stderr);
    stderr.contains("does not exist") || stderr.contains("not found") || stderr.contains("No such file")
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
