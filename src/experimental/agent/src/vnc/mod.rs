//! VNC access to Agents.
//!
//! An Agent declaring `spec.access: [{type: vnc}]` gets a guest loopback port
//! bridged to the desktop its image already runs, and `agentctl vnc` forwards
//! that port to the person's machine.
//!
//! The split matters. A desktop Agent has a screen whether or not anyone may
//! look at it: the model drives it, so the image owns the X server, the bridge
//! to it and the browser viewer, and ships their units disabled. What the image
//! does not own is the decision to turn them on. This module reads what the
//! image declares it provides, enables those units when the Agent declares VNC
//! access and disables them when it stops, and asserts the observable result —
//! the declared ports listen afterwards, and nothing listens once access is
//! withdrawn.
//!
//! Nothing here names a socket path, a viewer program or a URL. An image that
//! serves a different viewer needs no change on this side.
//!
//! Unlike SSH there is no key material and no host-side state, because there
//! is no client configuration to generate: the transport is a plain RFB stream
//! over a forwarded loopback port, and the Sandbox boundary is what protects
//! it, exactly as it protects every other guest loopback port.

use std::{cell::RefCell, collections::BTreeMap, path::PathBuf, rc::Rc};

use ::sandbox::SandboxHandle;
use serde::{Deserialize, Serialize};

use crate::{
    AgentId, Error,
    control_plane::{AgentRecord, AgentStore},
    sandbox::platform,
};

/// Guest loopback port carrying the RFB stream.
///
/// This and [`WEB_GUEST_PORT`] are the wire contract between an image offering VNC access and the
/// platform describing it to a caller. The image declares them too and a mismatch is refused, so
/// drift is a reconcile-time error rather than a viewer that never connects.
pub const GUEST_PORT: u16 = 5900;
/// Guest loopback port serving the image's browser-based viewer over HTTP.
pub const WEB_GUEST_PORT: u16 = 6080;
/// The `type` value of a VNC access descriptor.
pub const ACCESS_TYPE: &str = "vnc";

/// Stable machine-readable description of one Agent's VNC access.
///
/// This is the seam a viewer integration consumes: everything needed to reach
/// the desktop without parsing any generated file.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AccessInfo {
    /// Access kind, always `vnc`.
    #[serde(rename = "type")]
    pub kind: String,
    /// Agent name.
    pub agent: String,
    /// Agent incarnation identity.
    pub agent_id: AgentId,
    /// Guest loopback port carrying the RFB stream.
    pub guest_port: u16,
    /// Guest loopback port serving the browser-based viewer over HTTP, when the image serves one.
    ///
    /// A browser viewer is a convenience an image may reasonably not carry, so this is absent for
    /// an image offering the RFB port alone, and until a reconciliation pass has seen what the
    /// image declares. The image decides what the port serves and where it redirects, so a caller
    /// opens the root of the forwarded port rather than a path this side would keep in step.
    pub web_guest_port: Option<u16>,
    /// Complete command forwarding the RFB port to the caller's machine.
    pub forward_command: String,
}

/// Builds the message given when the Agent's image cannot serve VNC access.
///
/// The image is immutable for the incarnation, so the message names what is
/// missing and the only fixes: an image that provides it, or withdrawing access.
#[must_use]
pub fn image_contract_missing(what: &str) -> String {
    format!(
        "the Agent's image cannot provide VNC access: {what}; re-apply the Agent with an image that declares its \
         access units in /etc/agent-access.d/vnc.conf, such as the published desktop Agent image, or remove `vnc` \
         from spec.access"
    )
}

/// Reconciles VNC access for Agents: the in-guest bridge from a loopback port
/// to the display socket the image publishes.
pub struct Access {
    agentctl: PathBuf,
    agents: Rc<dyn AgentStore>,
    /// What each Agent's image was last seen to declare.
    ///
    /// A descriptor lives in the guest, and describing an Agent must not require reaching into a
    /// running Sandbox, so what reconciliation observed is remembered here for the descriptor to
    /// report. It is deliberately not persisted: after a restart the answer is unknown until the
    /// next pass, which is the truth rather than a stale claim.
    observed: RefCell<BTreeMap<AgentId, Observation>>,
}

/// What one reconciliation pass saw an image declare.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Observation {
    web_port: Option<u16>,
}

impl Access {
    /// Creates the VNC access reconciler.
    ///
    /// `agentctl` is the absolute executable named in the forwarding command
    /// the descriptor reports.
    #[must_use]
    pub fn new(agentctl: PathBuf, agents: Rc<dyn AgentStore>) -> Self {
        Self {
            agentctl,
            agents,
            observed: RefCell::new(BTreeMap::new()),
        }
    }

    /// Describes the VNC access of a named Agent.
    ///
    /// # Errors
    ///
    /// Returns `Error::NotFound` for an unknown Agent, `Error::Conflict` while
    /// it is being deleted, and `Error::Invalid` when it declares no VNC access.
    pub async fn describe(&self, name: &str) -> Result<AccessInfo, Error> {
        let record = self.agents.get_by_name(name).await?;
        if record.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        if !record.agent.spec.vnc_access() {
            return Err(Error::Invalid(format!(
                "Agent {name:?} does not declare VNC access; add `access: [{{type: vnc}}]` to its spec and re-apply"
            )));
        }
        Ok(self.info(&record))
    }

    /// Builds the descriptor for a record without consulting the store.
    #[must_use]
    pub fn info(&self, record: &AgentRecord) -> AccessInfo {
        let name = &record.agent.metadata.name;
        AccessInfo {
            kind: ACCESS_TYPE.into(),
            agent: name.clone(),
            agent_id: record.id,
            guest_port: GUEST_PORT,
            web_guest_port: self.observed.borrow().get(&record.id).and_then(|seen| seen.web_port),
            forward_command: format!("{} port-forward agent/{name} {GUEST_PORT}", self.agentctl.display()),
        }
    }

    /// Converges VNC access for one Agent against its running Sandbox.
    ///
    /// Returns whether the Agent has VNC access after the pass. An Agent
    /// without declared access has any earlier bridge removed, which is what
    /// makes withdrawal complete: the desktop keeps running and nothing
    /// listens.
    ///
    /// # Errors
    ///
    /// Returns `Error::Invalid` when the image runs no desktop or the Sandbox
    /// operating system is unsupported, and transient errors when the guest
    /// setup cannot be written.
    pub async fn reconcile(&self, record: &AgentRecord, sandbox: &SandboxHandle) -> Result<bool, Error> {
        let os = sandbox.snapshot().image.platform.os.clone();
        if !record.agent.spec.vnc_access() {
            remove_guest_state(&os, sandbox).await?;
            self.observed.borrow_mut().remove(&record.id);
            return Ok(false);
        }
        let capability = verify_guest_capability(&os, sandbox).await?;
        grant_guest_access(&os, sandbox, &capability).await?;
        self.observed.borrow_mut().insert(
            record.id,
            Observation {
                web_port: capability.web_port,
            },
        );
        Ok(true)
    }
}

async fn verify_guest_capability(os: &str, sandbox: &SandboxHandle) -> Result<platform::linux_vnc::Capability, Error> {
    match os {
        "linux" => platform::linux_vnc::verify_capability(sandbox).await,
        os => Err(Error::Invalid(format!(
            "VNC access is not supported on Sandbox operating system {os:?}"
        ))),
    }
}

async fn grant_guest_access(
    os: &str,
    sandbox: &SandboxHandle,
    capability: &platform::linux_vnc::Capability,
) -> Result<(), Error> {
    match os {
        "linux" => platform::linux_vnc::grant(sandbox, capability).await,
        os => Err(Error::Invalid(format!(
            "VNC access is not supported on Sandbox operating system {os:?}"
        ))),
    }
}

async fn remove_guest_state(os: &str, sandbox: &SandboxHandle) -> Result<(), Error> {
    match os {
        "linux" => platform::linux_vnc::withdraw(sandbox).await,
        // Nothing was ever granted on an unsupported operating system.
        _ => Ok(()),
    }
}
