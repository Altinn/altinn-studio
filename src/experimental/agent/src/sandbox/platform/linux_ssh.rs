//! OpenSSH server state written into Linux Sandboxes for SSH access.
//!
//! The image installs `openssh-server`, a hardened `sshd_config` and the
//! `agent-ssh.service` unit, which only starts once the host key exists. This
//! module writes that key, the client's `authorized_keys`, the SSH login
//! environment and enables the unit, or removes all of it when access is
//! withdrawn. Server state lives under `/var/lib/agent/ssh`; the login
//! environment uses OpenSSH's standard per-user file in `/home/agent/.ssh`.

use std::collections::BTreeMap;

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
/// Directory OpenSSH reads the Agent user's login environment from.
const USER_SSH_DIRECTORY: &str = "/home/agent/.ssh";
/// Effective Sandbox environment inherited by every new SSH shell or command.
pub(crate) const USER_ENVIRONMENT: &str = "/home/agent/.ssh/environment";
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
const ENVIRONMENT_PROGRAM: &str = "/usr/bin/env";
const MAX_ENVIRONMENT_ENTRIES: usize = 1000;

/// Confirms the image has the server, platform-owned configuration and unit,
/// and systemd as the running init to start it. The effective OpenSSH policy
/// is checked once the real host key has been installed.
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
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/bin/chown", "root:root", HOST_KEY, HOST_KEY_PUBLIC],
    )
    .await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/chmod", "0600", HOST_KEY]).await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/chmod", "0644", HOST_KEY_PUBLIC]).await?;
    verify_effective_policy(sandbox).await?;

    let environment = capture_login_environment(sandbox).await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "-n",
            "/usr/bin/install",
            "-d",
            "-m",
            "0700",
            "-o",
            super::linux::USER,
            "-g",
            super::linux::USER,
            USER_SSH_DIRECTORY,
        ],
    )
    .await?;
    write_if_changed(sandbox, AUTHORIZED_KEYS, material.authorized_keys.as_bytes()).await?;
    write_if_changed(sandbox, USER_ENVIRONMENT, &environment).await?;
    // StrictModes requires authorized_keys and its directory to be owned by
    // root or the user and writable by no one else.
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/bin/chown", "root:root", AUTHORIZED_KEYS, USER_ENVIRONMENT],
    )
    .await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/bin/chmod", "0644", AUTHORIZED_KEYS, USER_ENVIRONMENT],
    )
    .await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/usr/bin/systemctl", "enable", "--now", UNIT],
    )
    .await
}

/// Asks OpenSSH for the policy it will apply to the Agent's loopback connection.
///
/// The actual host key is installed before this check because `sshd -T` refuses
/// to evaluate a configuration without at least one readable host key. Login
/// state and the service are installed only after the effective policy passes.
async fn verify_effective_policy(sandbox: &SandboxHandle) -> Result<(), Error> {
    let connection = format!(
        "user={},host=localhost,addr=127.0.0.1,laddr=127.0.0.1,lport={}",
        super::linux::USER,
        crate::ssh::GUEST_PORT
    );
    let args = [
        "-n".to_owned(),
        SERVER.to_owned(),
        "-T".to_owned(),
        "-f".to_owned(),
        SERVER_CONFIG.to_owned(),
        "-C".to_owned(),
        connection,
    ];
    let output = sandbox
        .run_execution(ExecutionSpec::command(SandboxPath::new("/usr/bin/sudo"), args))
        .await?;
    if !output.status.success() {
        return Err(Error::Invalid(crate::ssh::image_contract_missing(&format!(
            "{SERVER} could not evaluate {SERVER_CONFIG}: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ))));
    }

    let policy = String::from_utf8_lossy(&output.stdout);
    for (name, value, directive) in [
        ("permituserenvironment", "yes", "PermitUserEnvironment yes"),
        ("usepam", "no", "UsePAM no"),
    ] {
        let effective = policy.lines().find_map(|line| {
            let (key, value) = line.trim().split_once(char::is_whitespace)?;
            key.eq_ignore_ascii_case(name).then_some(value.trim())
        });
        if effective != Some(value) {
            return Err(Error::Invalid(crate::ssh::image_contract_missing(&format!(
                "{SERVER_CONFIG} must effectively set {directive:?} for the platform-owned login environment"
            ))));
        }
    }
    Ok(())
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
    let state_exists = path_exists(sandbox, "-e", STATE_DIRECTORY).await?;
    let environment_exists = path_exists(sandbox, "-e", USER_ENVIRONMENT).await?;
    if !state_exists && !environment_exists {
        return Ok(());
    }
    if state_exists
        && path_exists(sandbox, "-x", SYSTEMCTL).await?
        && path_exists(sandbox, "-d", SYSTEMD_RUNNING).await?
    {
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
    if state_exists {
        run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/rm", "-rf", STATE_DIRECTORY]).await?;
    }
    if environment_exists {
        run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/rm", "-f", USER_ENVIRONMENT]).await?;
    }
    Ok(())
}

/// Captures the environment an ordinary Sandbox Execution inherits and renders
/// it in OpenSSH's `~/.ssh/environment` format. SSH supplies identity and
/// terminal variables itself; platform defaults fill the only values added by
/// `agentctl exec` and Session launch rather than the Sandbox runtime.
async fn capture_login_environment(sandbox: &SandboxHandle) -> Result<Vec<u8>, Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new(ENVIRONMENT_PROGRAM),
            ["-0".into()],
        ))
        .await?;
    if !output.status.success() {
        return Err(Error::SandboxSetup(format!(
            "command `{ENVIRONMENT_PROGRAM} -0` exited with code {}: {}",
            output.status.code,
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    let mut environment = parse_environment(&output.stdout)?;
    environment.insert("LANG".into(), super::linux::UTF8_LOCALE.into());
    environment.insert("CONTAINER_HOST".into(), super::linux::CONTAINER_HOST.into());
    render_environment(&environment)
}

fn parse_environment(bytes: &[u8]) -> Result<BTreeMap<String, String>, Error> {
    let mut environment = BTreeMap::new();
    for entry in bytes.split(|byte| *byte == 0).filter(|entry| !entry.is_empty()) {
        let text = std::str::from_utf8(entry)
            .map_err(|_| Error::Invalid("the Sandbox environment contains a non-UTF-8 value".into()))?;
        let (name, value) = text
            .split_once('=')
            .ok_or_else(|| Error::Invalid(format!("the Sandbox environment contains an invalid entry {text:?}")))?;
        if !portable_name(name) {
            return Err(Error::Invalid(format!(
                "the Sandbox environment contains an invalid variable name {name:?}"
            )));
        }
        if !ssh_supplies(name) {
            environment.insert(name.into(), value.into());
        }
    }
    Ok(environment)
}

fn render_environment(environment: &BTreeMap<String, String>) -> Result<Vec<u8>, Error> {
    if environment.len() > MAX_ENVIRONMENT_ENTRIES {
        return Err(Error::Invalid(format!(
            "the Sandbox environment has {} entries; OpenSSH accepts at most {MAX_ENVIRONMENT_ENTRIES}",
            environment.len()
        )));
    }
    let mut rendered = String::new();
    for (name, value) in environment {
        if value.contains(['\n', '\r']) {
            return Err(Error::Invalid(format!(
                "Sandbox environment variable {name:?} contains a line break that OpenSSH cannot represent"
            )));
        }
        rendered.push_str(name);
        rendered.push('=');
        rendered.push_str(value);
        rendered.push('\n');
    }
    Ok(rendered.into_bytes())
}

fn portable_name(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .enumerate()
            .all(|(index, byte)| byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit()))
}

fn ssh_supplies(name: &str) -> bool {
    matches!(
        name,
        "HOME" | "LOGNAME" | "PWD" | "SHELL" | "SHLVL" | "TERM" | "USER" | "_"
    ) || name.starts_with("SSH_")
        || name.starts_with("AGENT_SESSION_")
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

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use std::collections::BTreeMap;

    #[test]
    fn ssh_environment_preserves_values_and_excludes_process_local_state() {
        let parsed = super::parse_environment(
            b"PATH=/usr/local/bin:/usr/bin\0GIT_USER_NAME=Agent #1 \"reviewer\"\0EMPTY=\0TERM=dumb\0HOME=/image-home\0AGENT_SESSION_ID=session\0",
        )
        .expect("environment");
        assert_eq!(
            parsed,
            BTreeMap::from([
                ("EMPTY".into(), String::new()),
                ("GIT_USER_NAME".into(), "Agent #1 \"reviewer\"".into()),
                ("PATH".into(), "/usr/local/bin:/usr/bin".into()),
            ])
        );
        assert_eq!(
            super::render_environment(&parsed).expect("rendered"),
            b"EMPTY=\nGIT_USER_NAME=Agent #1 \"reviewer\"\nPATH=/usr/local/bin:/usr/bin\n"
        );
    }

    #[test]
    fn ssh_environment_rejects_values_openssh_cannot_represent() {
        let environment = BTreeMap::from([("MULTILINE".into(), "one\ntwo".into())]);
        let error = super::render_environment(&environment).expect_err("line break");
        assert!(error.to_string().contains("line break"), "{error}");
    }
}
