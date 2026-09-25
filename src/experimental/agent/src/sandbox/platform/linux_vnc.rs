//! VNC access granted and withdrawn in Linux Sandboxes: the units the image lists in
//! `/etc/agent-access.d/vnc.conf` are enabled or disabled, then the result is checked. A grant
//! waits for the declared ports to listen; a withdrawal checks that the units are inactive. The
//! ports themselves are not checked on withdrawal, because the Agent may use them.

use ::sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::Error;

use super::linux::{SYSTEMCTL, SYSTEMD_RUNNING, path_exists, run_checked, systemd_available, wait_for_systemd};

/// The image contract: what this image provides for `access: [{type: vnc}]`.
pub(crate) const DESCRIPTOR: &str = "/etc/agent-access.d/vnc.conf";
/// Reads listening sockets, so a grant can be asserted rather than assumed.
const SS: &str = "/usr/bin/ss";
/// A descriptor larger than this is not the one the contract describes.
const MAX_DESCRIPTOR_BYTES: usize = 64 * 1024;
/// More units than any one access capability has any business owning.
const MAX_UNITS: usize = 8;
/// How long an enabled unit may take to start listening. A viewer is an ordinary service that
/// systemd reports started once it has forked, before it has bound its port.
const LISTEN_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);
const LISTEN_POLL: std::time::Duration = std::time::Duration::from_millis(100);

/// What the image declares it provides.
#[derive(Debug, Eq, PartialEq)]
pub(crate) struct Capability {
    /// Units the platform enables to grant access and disables to withdraw it.
    pub(crate) units: Vec<String>,
    /// Guest loopback port carrying the RFB stream.
    pub(crate) port: u16,
    /// Guest loopback port serving the browser viewer; an image may offer the RFB port alone.
    pub(crate) web_port: Option<u16>,
}

impl Capability {
    /// The ports the image promised, which are what a grant is checked against.
    fn ports(&self) -> Vec<u16> {
        std::iter::once(self.port).chain(self.web_port).collect()
    }
}

/// Confirms the image declares VNC access and returns what it declares. A missing piece is
/// `Error::Invalid`, since retrying cannot change the image.
async fn verify_capability(sandbox: &SandboxHandle) -> Result<Capability, Error> {
    let contract = [
        ("-x", SYSTEMCTL, "systemctl is missing"),
        (
            "-d",
            SYSTEMD_RUNNING,
            "systemd is not the running init, and the access units need it",
        ),
        ("-x", SS, "ss is missing, so a grant could not be verified"),
        ("-f", DESCRIPTOR, "/etc/agent-access.d/vnc.conf is missing"),
    ];
    for (test, path, what) in contract {
        if !path_exists(sandbox, test, path).await? {
            return Err(Error::Invalid(crate::vnc::image_contract_missing(what)));
        }
    }
    parse_descriptor(&read_descriptor(sandbox).await?)
}

/// Checks the image, enables its access units and waits for the declared ports to listen.
/// Idempotent: `enable --now` leaves a running unit alone.
///
/// # Errors
///
/// Returns an error when the image declares no VNC access, a unit cannot be enabled, or a
/// declared port is not listening within [`LISTEN_TIMEOUT`].
pub(crate) async fn grant(sandbox: &SandboxHandle) -> Result<Capability, Error> {
    let capability = verify_capability(sandbox).await?;
    systemctl(sandbox, "enable", &capability).await?;
    let deadline = tokio::time::Instant::now() + LISTEN_TIMEOUT;
    for port in capability.ports() {
        while !port_is_listening(sandbox, port).await? {
            if tokio::time::Instant::now() >= deadline {
                return Err(Error::SandboxSetup(format!(
                    "the image's VNC access units were enabled but nothing is listening on guest port {port} \
                     after {}s",
                    LISTEN_TIMEOUT.as_secs()
                )));
            }
            tokio::time::sleep(LISTEN_POLL).await;
        }
    }
    Ok(capability)
}

/// Disables the image's access units, then checks that systemd reports them inactive.
///
/// # Errors
///
/// Returns an error when the units cannot be disabled, or when one is still active afterwards.
pub(crate) async fn withdraw(sandbox: &SandboxHandle) -> Result<(), Error> {
    if !systemd_available(sandbox).await? || !path_exists(sandbox, "-f", DESCRIPTOR).await? {
        // An image that declares no VNC access never had any units to turn off.
        return Ok(());
    }
    let capability = parse_descriptor(&read_descriptor(sandbox).await?)?;
    systemctl(sandbox, "disable", &capability).await?;
    let still_active = active_units(sandbox, &capability).await?;
    if still_active.is_empty() {
        return Ok(());
    }
    Err(Error::SandboxSetup(format!(
        "VNC access was withdrawn but {} still active",
        still_active.join(", ")
    )))
}

/// Returns the image's access units that systemd does not report inactive.
async fn active_units(sandbox: &SandboxHandle, capability: &Capability) -> Result<Vec<String>, Error> {
    let arguments = ["-n", SYSTEMCTL, "is-active"]
        .into_iter()
        .chain(capability.units.iter().map(String::as_str))
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    // `is-active` exits non-zero whenever a unit is not active, so its exit status says nothing
    // here; the one state line it prints per unit, in argument order, is the answer.
    let output = sandbox
        .run_execution(ExecutionSpec::command(SandboxPath::new("/usr/bin/sudo"), arguments))
        .await?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let states: Vec<&str> = stdout.lines().map(str::trim).collect();
    if states.len() != capability.units.len() {
        return Err(Error::SandboxSetup(format!(
            "`systemctl is-active` reported {} states for {} units: {}",
            states.len(),
            capability.units.len(),
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    Ok(capability
        .units
        .iter()
        .zip(states)
        .filter(|(_, state)| !matches!(*state, "inactive" | "failed"))
        .map(|(unit, state)| format!("{unit} is {state}"))
        .collect())
}

/// Runs `systemctl <action> --now` on the image's access units once systemd has booted.
async fn systemctl(sandbox: &SandboxHandle, action: &str, capability: &Capability) -> Result<(), Error> {
    wait_for_systemd(sandbox).await?;
    let arguments = ["-n", SYSTEMCTL, action, "--now"]
        .into_iter()
        .chain(capability.units.iter().map(String::as_str));
    run_checked(sandbox, "/usr/bin/sudo", arguments).await
}

async fn read_descriptor(sandbox: &SandboxHandle) -> Result<String, Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/bin/cat"),
            [DESCRIPTOR.to_owned()],
        ))
        .await?;
    if !output.status.success() {
        return Err(Error::Invalid(crate::vnc::image_contract_missing(&format!(
            "{DESCRIPTOR} could not be read: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ))));
    }
    if output.stdout.len() > MAX_DESCRIPTOR_BYTES {
        return Err(Error::Invalid(crate::vnc::image_contract_missing(&format!(
            "{DESCRIPTOR} is larger than {MAX_DESCRIPTOR_BYTES} bytes"
        ))));
    }
    String::from_utf8(output.stdout.to_vec()).map_err(|_| {
        Error::Invalid(crate::vnc::image_contract_missing(&format!(
            "{DESCRIPTOR} is not UTF-8"
        )))
    })
}

fn setting<'a>(descriptor: &'a str, key: &str) -> Option<&'a str> {
    descriptor
        .lines()
        .map(str::trim)
        .filter(|line| !line.starts_with('#'))
        .find_map(|line| {
            let (name, value) = line.split_once('=')?;
            (name.trim() == key).then(|| value.trim())
        })
}

fn missing(key: &str) -> Error {
    Error::Invalid(crate::vnc::image_contract_missing(&format!(
        "{DESCRIPTOR} does not set {key}"
    )))
}

/// Parses the descriptor, refusing unit names that are not plain units, since they reach
/// `systemctl` as arguments, and ports other than the agreed ones.
fn parse_descriptor(descriptor: &str) -> Result<Capability, Error> {
    let units: Vec<String> = setting(descriptor, "units")
        .ok_or_else(|| missing("units"))?
        .split_whitespace()
        .map(ToOwned::to_owned)
        .collect();
    if units.is_empty() || units.len() > MAX_UNITS {
        return Err(Error::Invalid(crate::vnc::image_contract_missing(&format!(
            "{DESCRIPTOR} must declare between 1 and {MAX_UNITS} units"
        ))));
    }
    for unit in &units {
        if !valid_unit_name(unit) {
            return Err(Error::Invalid(crate::vnc::image_contract_missing(&format!(
                "{unit:?} is not a systemd socket or service unit name"
            ))));
        }
    }
    let port = declared_port(descriptor, "port", crate::vnc::GUEST_PORT)?.ok_or_else(|| missing("port"))?;
    let web_port = declared_port(descriptor, "web-port", crate::vnc::WEB_GUEST_PORT)?;
    Ok(Capability { units, port, web_port })
}

/// Reads a declared port, which must be the one both sides agree on when it is declared at all.
fn declared_port(descriptor: &str, key: &str, expected: u16) -> Result<Option<u16>, Error> {
    let Some(value) = setting(descriptor, key) else {
        return Ok(None);
    };
    let parsed: u16 = value.parse().map_err(|_| {
        Error::Invalid(crate::vnc::image_contract_missing(&format!(
            "{DESCRIPTOR} sets {key} to {value:?}, which is not a port"
        )))
    })?;
    if parsed != expected {
        return Err(Error::Invalid(crate::vnc::image_contract_missing(&format!(
            "{DESCRIPTOR} sets {key} to {parsed}, but VNC access uses guest port {expected}"
        ))));
    }
    Ok(Some(parsed))
}

fn valid_unit_name(unit: &str) -> bool {
    let Some(stem) = unit.strip_suffix(".socket").or_else(|| unit.strip_suffix(".service")) else {
        return false;
    };
    // A leading `-` would reach `systemctl` as an option rather than a unit.
    !stem.is_empty()
        && !stem.starts_with('-')
        && stem.len() <= 200
        && stem
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.' | '@'))
}

async fn port_is_listening(sandbox: &SandboxHandle, port: u16) -> Result<bool, Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new(SS),
            [
                "-ltnH".to_owned(),
                "sport".to_owned(),
                "=".to_owned(),
                format!(":{port}"),
            ],
        ))
        .await?;
    if !output.status.success() {
        return Err(Error::SandboxSetup(format!(
            "`ss -ltnH sport = :{port}` exited with code {}: {}",
            output.status.code,
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    Ok(!String::from_utf8_lossy(&output.stdout).trim().is_empty())
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::{Capability, parse_descriptor, valid_unit_name};

    const VALID: &str = "# a comment\nunits=agent-vnc.socket agent-vnc-web.service\nport=5900\nweb-port=6080\n";

    #[test]
    fn the_units_and_ports_come_from_the_image_descriptor() {
        assert_eq!(
            parse_descriptor(VALID).expect("descriptor"),
            Capability {
                units: vec!["agent-vnc.socket".to_owned(), "agent-vnc-web.service".to_owned()],
                port: 5900,
                web_port: Some(6080),
            }
        );
    }

    #[test]
    fn an_image_may_offer_the_rfb_port_without_a_browser_viewer() {
        let capability = parse_descriptor("units=agent-vnc.socket\nport=5900\n").expect("descriptor");
        assert_eq!(capability.web_port, None);
        assert_eq!(capability.ports(), vec![5900], "only the declared port is promised");
    }

    #[test]
    fn a_descriptor_that_could_not_be_acted_on_is_refused() {
        for (descriptor, expected) in [
            ("port=5900\nweb-port=6080\n", "does not set units"),
            ("units=agent-vnc.socket\nweb-port=6080\n", "does not set port"),
            (
                "units=\nport=5900\nweb-port=6080\n",
                "must declare between 1 and 8 units",
            ),
            (
                "units=agent-vnc.socket --now other\nport=5900\nweb-port=6080\n",
                "is not a systemd socket or service unit name",
            ),
            (
                "units=agent-vnc.socket\nport=5901\nweb-port=6080\n",
                "but VNC access uses guest port 5900",
            ),
            (
                "units=agent-vnc.socket\nport=nope\nweb-port=6080\n",
                "which is not a port",
            ),
            (
                "# units=agent-vnc.socket\nport=5900\nweb-port=6080\n",
                "does not set units",
            ),
        ] {
            let error = parse_descriptor(descriptor).expect_err("refused");
            assert!(error.to_string().contains(expected), "{descriptor:?} -> {error}");
        }
    }

    #[test]
    fn unit_names_that_could_become_systemctl_options_are_rejected() {
        assert!(valid_unit_name("agent-vnc.socket"));
        assert!(valid_unit_name("agent-vnc-web.service"));
        assert!(valid_unit_name("getty@tty1.service"));
        for rejected in [
            "--now",
            "--now.service",
            "-H.socket",
            "-f",
            "agent-vnc",
            "agent-vnc.timer",
            ".socket",
            "a b.service",
            "../x.service",
        ] {
            assert!(!valid_unit_name(rejected), "accepted {rejected:?}");
        }
    }
}
