//! VNC access to Agents.
//!
//! The image runs the desktop and ships the units that bridge it to guest ports, disabled, and
//! lists them in `/etc/agent-access.d/vnc.conf`. When an Agent declares `access: [{type: vnc}]`
//! this module enables those units, and disables them when it stops. Nothing here names a socket,
//! viewer or URL, so an image with a different viewer needs no change here.
//!
//! This decides what the platform offers; it is not an isolation boundary. The Agent has `sudo`
//! and could enable the units itself. The Sandbox boundary, and forwarding that only the host can
//! start, protect the desktop, as they do every guest loopback port.

use std::{cell::RefCell, collections::BTreeMap, path::PathBuf, rc::Rc};

use ::sandbox::SandboxHandle;
use serde::{Deserialize, Serialize};

use crate::{
    AgentId, Error,
    control_plane::{AgentRecord, AgentStore},
    sandbox::platform,
};

/// Guest loopback port carrying the RFB stream. The image declares the same ports, and a mismatch
/// is refused when reconciling.
pub const GUEST_PORT: u16 = 5900;
/// Guest loopback port serving the image's browser-based viewer over HTTP.
pub const WEB_GUEST_PORT: u16 = 6080;
/// The `type` value of a VNC access descriptor.
pub const ACCESS_TYPE: &str = "vnc";

/// Machine-readable description of one Agent's VNC access.
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
    /// Guest loopback port serving the browser viewer, whose root the caller opens. Absent when
    /// the image serves none, and until a pass has seen what the image declares.
    pub web_guest_port: Option<u16>,
    /// Complete command forwarding the RFB port to the caller's machine.
    pub forward_command: String,
}

/// Builds the message given when the Agent's image cannot serve VNC access. The image cannot
/// change for the incarnation, so it names the only fixes.
#[must_use]
pub fn image_contract_missing(what: &str) -> String {
    format!(
        "the Agent's image cannot provide VNC access: {what}; re-apply the Agent with an image that declares its \
         access units in /etc/agent-access.d/vnc.conf, such as the published desktop Agent image, or remove `vnc` \
         from spec.access"
    )
}

/// Reconciles VNC access for Agents by enabling or disabling the units their image declares.
pub struct Access {
    agentctl: PathBuf,
    agents: Rc<dyn AgentStore>,
    /// What the last successful pass left in each Agent's guest, so that describing an Agent needs
    /// no call into its Sandbox and a resync can skip a withdrawal that already succeeded. Not
    /// persisted: after a restart it is unknown until the next pass.
    applied: RefCell<BTreeMap<AgentId, Applied>>,
}

/// What one successful reconciliation pass left in an Agent's guest.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Applied {
    /// The image's units are enabled, with the browser viewer port it declared.
    Granted { web_port: Option<u16> },
    /// The units are disabled, or the image declares none.
    Withdrawn,
}

impl Access {
    /// Creates the VNC access reconciler; `agentctl` is the executable the forwarding command names.
    #[must_use]
    pub fn new(agentctl: PathBuf, agents: Rc<dyn AgentStore>) -> Self {
        Self {
            agentctl,
            agents,
            applied: RefCell::new(BTreeMap::new()),
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
            web_guest_port: match self.applied.borrow().get(&record.id) {
                Some(Applied::Granted { web_port }) => *web_port,
                Some(Applied::Withdrawn) | None => None,
            },
            // `:PORT` binds a free local port, as `agentctl vnc` does: 5900 is often taken locally.
            forward_command: format!("{} port-forward agent/{name} :{GUEST_PORT}", self.agentctl.display()),
        }
    }

    /// Converges VNC access for one Agent and returns whether it has access afterwards. Without
    /// declared access the units are disabled, leaving the desktop running with nothing
    /// listening; a withdrawal that succeeded is not repeated for the same incarnation.
    ///
    /// # Errors
    ///
    /// Returns `Error::Invalid` when the image runs no desktop or the Sandbox
    /// operating system is unsupported, and transient errors when the guest
    /// setup cannot be applied.
    pub async fn reconcile(&self, record: &AgentRecord, sandbox: &SandboxHandle) -> Result<bool, Error> {
        if !record.agent.spec.vnc_access() && self.applied.borrow().get(&record.id) == Some(&Applied::Withdrawn) {
            return Ok(false);
        }
        match self.apply(record, sandbox).await {
            Ok(applied) => {
                self.applied.borrow_mut().insert(record.id, applied);
                Ok(applied != Applied::Withdrawn)
            }
            Err(error) => {
                // A failed pass can leave the guest between states, so nothing is known until a
                // pass succeeds again.
                self.applied.borrow_mut().remove(&record.id);
                Err(error)
            }
        }
    }

    async fn apply(&self, record: &AgentRecord, sandbox: &SandboxHandle) -> Result<Applied, Error> {
        let os = sandbox.snapshot().image.platform.os.clone();
        if record.agent.spec.vnc_access() {
            let capability = grant_guest_access(&os, sandbox).await?;
            Ok(Applied::Granted {
                web_port: capability.web_port,
            })
        } else {
            remove_guest_state(&os, sandbox).await?;
            Ok(Applied::Withdrawn)
        }
    }

    /// Forgets what was applied to a deleted Agent incarnation.
    pub fn forget(&self, id: AgentId) {
        self.applied.borrow_mut().remove(&id);
    }
}

async fn grant_guest_access(os: &str, sandbox: &SandboxHandle) -> Result<platform::linux_vnc::Capability, Error> {
    match os {
        "linux" => platform::linux_vnc::grant(sandbox).await,
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
