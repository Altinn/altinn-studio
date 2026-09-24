//! VNC access granted and withdrawn in Linux Sandboxes.
//!
//! The image owns the desktop, the bridge to it and the browser viewer, and ships their units
//! disabled. This module reads what the image declares in `/etc/agent-access.d/vnc.conf`, turns
//! those units on when the Agent declares VNC access and off when it stops, and asserts the
//! observable result: the declared ports listen afterwards, and nothing listens once access is
//! withdrawn.
//!
//! Nothing here names a socket path, a viewer program or a URL. Those belong to the image, which
//! is where changing the viewer and changing the unit that serves it are one commit.

use ::sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::Error;

use super::linux::{SYSTEMCTL, SYSTEMD_RUNNING, path_exists, run_checked, systemd_available, wait_for_systemd};

/// The image contract: what this image provides for `access: [{type: vnc}]`.
pub(crate) const DESCRIPTOR: &str = "/etc/agent-access.d/vnc.conf";
/// Reads listening sockets, so withdrawal can be asserted rather than assumed.
const SS: &str = "/usr/bin/ss";
/// A descriptor larger than this is not the one the contract describes.
const MAX_DESCRIPTOR_BYTES: usize = 64 * 1024;
/// More units than any one access capability has any business owning.
const MAX_UNITS: usize = 8;

/// What the image declares it provides.
#[derive(Debug, Eq, PartialEq)]
pub(crate) struct Capability {
    /// Units the platform enables to grant access and disables to withdraw it.
    pub(crate) units: Vec<String>,
    /// Guest loopback port carrying the RFB stream.
    pub(crate) port: u16,
    /// Guest loopback port serving the browser-based viewer, when the image serves one.
    ///
    /// Optional because a browser viewer is a convenience an image may reasonably not carry; one
    /// that omits it offers the RFB port alone and `agentctl vnc --web` says so.
    pub(crate) web_port: Option<u16>,
}

impl Capability {
    /// The ports the image promised, which are what a grant and a withdrawal are checked against.
    fn ports(&self) -> Vec<u16> {
        std::iter::once(self.port).chain(self.web_port).collect()
    }
}

/// Confirms the image declares VNC access and returns what it declares.
///
/// # Errors
///
/// Returns `Error::Invalid` naming the missing piece: the image is immutable for the incarnation,
/// so retrying cannot change that.
pub(crate) async fn verify_capability(sandbox: &SandboxHandle) -> Result<Capability, Error> {
    let contract = [
        ("-x", SYSTEMCTL, "systemctl is missing"),
        (
            "-d",
            SYSTEMD_RUNNING,
            "systemd is not the running init, and the access units need it",
        ),
        ("-x", SS, "ss is missing, so withdrawal could not be verified"),
        ("-f", DESCRIPTOR, "/etc/agent-access.d/vnc.conf is missing"),
    ];
    for (test, path, what) in contract {
        if !path_exists(sandbox, test, path).await? {
            return Err(Error::Invalid(crate::vnc::image_contract_missing(what)));
        }
    }
    parse_descriptor(&read_descriptor(sandbox).await?)
}

/// Enables the image's access units, then asserts the declared ports are listening.
///
/// Idempotent: `enable --now` on an already-running unit converges rather than restarts, and the
/// units are the image's, so nothing is written here.
///
/// # Errors
///
/// Returns an error when a unit cannot be enabled, or when the ports the image declared are not
/// listening once it has been.
pub(crate) async fn grant(sandbox: &SandboxHandle, capability: &Capability) -> Result<(), Error> {
    systemctl(sandbox, "enable", capability).await?;
    for port in capability.ports() {
        if !port_is_listening(sandbox, port).await? {
            return Err(Error::SandboxSetup(format!(
                "the image's VNC access units were enabled but nothing is listening on guest port {port}"
            )));
        }
    }
    Ok(())
}

/// Disables the image's access units, then asserts the declared ports are free.
///
/// The assertion is the point: it is what turns "the image opens no port of its own" from a claim
/// in a comment into something the platform checks, on the pass where it matters.
///
/// # Errors
///
/// Returns an error when the units cannot be disabled, or when something is still listening on a
/// declared port afterwards.
pub(crate) async fn withdraw(sandbox: &SandboxHandle) -> Result<(), Error> {
    if !systemd_available(sandbox).await? || !path_exists(sandbox, "-f", DESCRIPTOR).await? {
        // An image that declares no VNC access never had any units to turn off.
        return Ok(());
    }
    let capability = parse_descriptor(&read_descriptor(sandbox).await?)?;
    systemctl(sandbox, "disable", &capability).await?;
    for port in capability.ports() {
        if port_is_listening(sandbox, port).await? {
            return Err(Error::SandboxSetup(format!(
                "VNC access was withdrawn but guest port {port} is still listening; the image is \
                 publishing the desktop outside its access units"
            )));
        }
    }
    Ok(())
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

/// Reads the descriptor, refusing anything that could not be acted on safely.
///
/// Unit names reach `systemctl` as arguments and ports are compared against the contract both
/// sides agree on, so an image that declares something else is refused with the mismatch named
/// rather than silently serving a desktop the caller cannot be told how to reach.
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
    !stem.is_empty()
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
