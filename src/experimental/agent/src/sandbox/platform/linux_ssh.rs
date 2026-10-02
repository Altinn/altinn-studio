//! OpenSSH server state written into Linux Sandboxes for SSH access.
//!
//! The image provides OpenSSH, systemd and the platform user. This module owns
//! the complete server policy, unit, keys, client authorization and SSH login
//! environment, or removes all of it when access is withdrawn. Server state
//! lives under `/var/lib/agent/ssh`; the login environment uses OpenSSH's
//! standard per-user file in `/home/agent/.ssh`.

use std::collections::BTreeMap;

use ::sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::{Error, ssh::GuestMaterial};

use super::{
    files::write_if_changed,
    linux::{SYSTEMCTL, SYSTEMD_RUNNING, path_exists, run_checked, systemd_available, wait_for_systemd},
};

/// Directory holding every server file `agentd` writes.
pub(crate) const STATE_DIRECTORY: &str = "/var/lib/agent/ssh";
/// Host private key; also the unit's `ConditionPathExists`.
pub(crate) const HOST_KEY: &str = "/var/lib/agent/ssh/ssh_host_ed25519_key";
/// Host public key, kept beside the private key as OpenSSH expects.
pub(crate) const HOST_KEY_PUBLIC: &str = "/var/lib/agent/ssh/ssh_host_ed25519_key.pub";
/// Keys allowed to log in as the guest user.
pub(crate) const AUTHORIZED_KEYS: &str = "/var/lib/agent/ssh/authorized_keys";
/// Platform-owned policy passed to every server invocation.
pub(crate) const SERVER_CONFIG: &str = "/var/lib/agent/ssh/sshd_config";
/// OpenSSH privilege-separation directory, needed even when only evaluating policy.
const SERVER_RUNTIME_DIRECTORY: &str = "/run/sshd";
/// Directory OpenSSH reads the Agent user's login environment from.
const USER_SSH_DIRECTORY: &str = "/home/agent/.ssh";
/// Effective Sandbox environment inherited by every new SSH shell or command.
pub(crate) const USER_ENVIRONMENT: &str = "/home/agent/.ssh/environment";
/// The server executable the image must provide.
pub(crate) const SERVER: &str = "/usr/sbin/sshd";
/// The platform-owned unit running the server on the guest loopback.
pub(crate) const UNIT: &str = "agent-ssh.service";
/// Where the platform installs the unit.
pub(crate) const UNIT_FILE: &str = "/etc/systemd/system/agent-ssh.service";
const ENVIRONMENT_PROGRAM: &str = "/usr/bin/env";
const MAX_ENVIRONMENT_ENTRIES: usize = 1000;

/// Confirms the image has the server and systemd runtime needed by the
/// platform-owned configuration and unit.
///
/// systemd is one init system among several a Sandbox could boot; nothing here
/// assumes it beyond checking for it, and an image without it cannot run the
/// platform-managed unit.
///
/// # Errors
///
/// Returns `Error::Invalid` naming the missing piece: the image is immutable for
/// the incarnation, so retrying cannot change that.
pub(crate) async fn verify_server(sandbox: &SandboxHandle) -> Result<(), Error> {
    let contract = [
        ("-x", SERVER, "/usr/sbin/sshd is missing"),
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
/// Idempotent: unchanged files are not rewritten and a running server is only
/// restarted when its host key, policy or unit changes.
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
            // systemd normally creates this for the service, but `sshd -T`
            // needs it before the service can be validated or started.
            SERVER_RUNTIME_DIRECTORY,
        ],
    )
    .await?;
    let host_key_changed = write_if_changed(sandbox, HOST_KEY, &material.host_private_key).await?;
    write_if_changed(
        sandbox,
        HOST_KEY_PUBLIC,
        format!("{}\n", material.host_public_key).as_bytes(),
    )
    .await?;
    let config_changed = write_if_changed(sandbox, SERVER_CONFIG, render_server_config().as_bytes()).await?;
    let unit_changed = write_if_changed(sandbox, UNIT_FILE, render_unit().as_bytes()).await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "-n",
            "/bin/chown",
            "root:root",
            HOST_KEY,
            HOST_KEY_PUBLIC,
            SERVER_CONFIG,
            UNIT_FILE,
        ],
    )
    .await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/chmod", "0600", HOST_KEY]).await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/bin/chmod", "0644", HOST_KEY_PUBLIC, SERVER_CONFIG, UNIT_FILE],
    )
    .await?;
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
    // A prior pass can fail after writing the unit but before systemd reloads
    // it, so convergence cannot depend only on whether this pass changed it.
    run_checked(sandbox, "/usr/bin/sudo", ["-n", SYSTEMCTL, "daemon-reload"]).await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", SYSTEMCTL, "enable", UNIT]).await?;
    let action = if host_key_changed || config_changed || unit_changed {
        "restart"
    } else {
        "start"
    };
    run_checked(sandbox, "/usr/bin/sudo", ["-n", SYSTEMCTL, action, UNIT]).await
}

fn render_server_config() -> String {
    format!(
        "# Managed by agentd; changes are replaced during reconciliation.\n\
         AddressFamily inet\n\
         ListenAddress 127.0.0.1\n\
         Port {}\n\
         \n\
         HostKey {HOST_KEY}\n\
         AuthorizedKeysFile {AUTHORIZED_KEYS}\n\
         PidFile /run/agent-sshd.pid\n\
         \n\
         AllowUsers {}\n\
         PubkeyAuthentication yes\n\
         PasswordAuthentication no\n\
         KbdInteractiveAuthentication no\n\
         PermitEmptyPasswords no\n\
         PermitRootLogin no\n\
         StrictModes yes\n\
         UsePAM no\n\
         PermitUserEnvironment yes\n\
         \n\
         AllowAgentForwarding no\n\
         AllowTcpForwarding yes\n\
         GatewayPorts no\n\
         X11Forwarding no\n\
         PermitTunnel no\n\
         \n\
         AcceptEnv LANG LC_*\n\
         PrintMotd no\n\
         LogLevel INFO\n\
         Subsystem sftp internal-sftp\n",
        crate::ssh::GUEST_PORT,
        super::linux::USER
    )
}

fn render_unit() -> String {
    format!(
        "[Unit]\n\
         Description=OpenSSH server for Agent access on the guest loopback\n\
         Documentation=https://github.com/Altinn/altinn-studio/tree/main/src/experimental\n\
         ConditionPathExists={HOST_KEY}\n\
         After=network.target\n\
         \n\
         [Service]\n\
         RuntimeDirectory=sshd\n\
         RuntimeDirectoryMode=0755\n\
         ExecStartPre={SERVER} -t -f {SERVER_CONFIG}\n\
         ExecStart={SERVER} -D -e -f {SERVER_CONFIG}\n\
         ExecReload=/bin/kill -HUP $MAINPID\n\
         Restart=on-failure\n\
         RestartPreventExitStatus=255\n\
         \n\
         [Install]\n\
         WantedBy=multi-user.target\n"
    )
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
                "the platform-owned SSH policy did not effectively set {directive:?}"
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
    if state_exists && systemd_available(sandbox).await? {
        wait_for_systemd(sandbox).await?;
        let args = ["-n", SYSTEMCTL, "disable", "--now", UNIT];
        let output = sandbox
            .run_execution(ExecutionSpec::command(
                SandboxPath::new("/usr/bin/sudo"),
                args.map(str::to_owned),
            ))
            .await?;
        // A failed setup may not have loaded the unit yet; every other failure
        // means the server may still be running.
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
        run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/rm", "-f", UNIT_FILE]).await?;
        run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/rm", "-rf", STATE_DIRECTORY]).await?;
        if systemd_available(sandbox).await? {
            run_checked(sandbox, "/usr/bin/sudo", ["-n", SYSTEMCTL, "daemon-reload"]).await?;
        }
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

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use std::collections::BTreeMap;

    fn directives(text: &str) -> BTreeMap<&str, Vec<&str>> {
        let mut directives = BTreeMap::<&str, Vec<&str>>::new();
        for line in text.lines().map(str::trim) {
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((key, value)) = line.split_once(char::is_whitespace) else {
                continue;
            };
            directives.entry(key).or_default().push(value.trim());
        }
        directives
    }

    #[test]
    fn platform_owned_server_policy_is_complete_and_not_extensible() {
        let config = super::render_server_config();
        let directives = directives(&config);
        let single = |key: &str| {
            let values = directives.get(key).unwrap_or_else(|| panic!("{key} is set"));
            assert_eq!(values.len(), 1, "{key} is set once");
            values[0]
        };

        assert_eq!(single("ListenAddress"), "127.0.0.1");
        assert_eq!(single("Port"), crate::ssh::GUEST_PORT.to_string());
        assert_eq!(single("HostKey"), super::HOST_KEY);
        assert_eq!(single("AuthorizedKeysFile"), super::AUTHORIZED_KEYS);
        assert_eq!(single("AllowUsers"), super::super::linux::USER);
        assert_eq!(single("PubkeyAuthentication"), "yes");
        assert_eq!(single("PasswordAuthentication"), "no");
        assert_eq!(single("KbdInteractiveAuthentication"), "no");
        assert_eq!(single("PermitEmptyPasswords"), "no");
        assert_eq!(single("PermitRootLogin"), "no");
        assert_eq!(single("UsePAM"), "no");
        assert_eq!(single("PermitUserEnvironment"), "yes");
        assert_eq!(single("AllowAgentForwarding"), "no");
        assert_eq!(single("AllowTcpForwarding"), "yes");
        assert_eq!(single("GatewayPorts"), "no");
        assert_eq!(single("X11Forwarding"), "no");
        assert_eq!(single("PermitTunnel"), "no");
        assert_eq!(single("Subsystem"), "sftp internal-sftp");
        assert!(!directives.contains_key("Include"));
    }

    #[test]
    fn platform_owned_unit_runs_only_the_platform_policy() {
        let unit = super::render_unit();
        assert!(unit.contains(&format!("ConditionPathExists={}", super::HOST_KEY)));
        assert!(unit.contains(&format!(
            "ExecStart={} -D -e -f {}",
            super::SERVER,
            super::SERVER_CONFIG
        )));
        assert!(unit.contains("RuntimeDirectory=sshd"));
        assert!(unit.contains("WantedBy=multi-user.target"));
    }

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
