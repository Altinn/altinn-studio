//! SSH access to Agents.
//!
//! An Agent declaring `spec.access: [{type: ssh}]` gets an OpenSSH server
//! inside its Sandbox, listening on the guest loopback only, and an OpenSSH
//! client configuration on the host that reaches it through
//! `agentctl ssh-proxy`. The platform owns every moving part: the guest user
//! is `agent`, the host key is generated per Agent incarnation and kept in
//! the owner-protected database, the client key pair lives under the
//! control-plane home and its private half never enters the guest.
//!
//! The image owns the installed server and its static units and
//! configuration; `agentd` owns the per-Agent state written at setup, exactly
//! as for Podman. Nothing here is a security boundary beyond the Sandbox
//! itself: the guest user has passwordless `sudo`, so the server hardening is
//! hygiene, and Sessions and SSH logins share one trust boundary.

mod client_config;
mod keys;
pub mod memory;

use std::{
    path::{Path, PathBuf},
    rc::Rc,
};

use ::sandbox::{LocalFuture, SandboxHandle};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::{
    AgentId, Error,
    control_plane::{AgentRecord, AgentStore},
    local::home::ControlPlaneHome,
    sandbox::platform,
};

pub use client_config::{
    CommandShell, HostEntry, IncludeOutcome, install_include, remove_known_host, render_config, render_include,
    render_path, render_proxy_command, upsert_known_host,
};
pub use keys::KeyPair;

/// Guest user every SSH login becomes: the platform-owned Sandbox user the Linux adapter defines.
pub const GUEST_USER: &str = platform::USER;
/// Guest loopback port the Agent's server listens on.
pub const GUEST_PORT: u16 = 2222;
/// The `type` value of an SSH access descriptor.
pub const ACCESS_TYPE: &str = "ssh";

/// Returns the OpenSSH `Host` alias for an Agent name.
#[must_use]
pub fn alias(agent: &str) -> String {
    format!("agentctl-{agent}")
}

/// Returns the `HostKeyAlias` keying `known_hosts` by the stable incarnation.
#[must_use]
pub fn host_key_alias(id: AgentId) -> String {
    format!("agent-{id}")
}

/// Host-side SSH paths below one control-plane home.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SshHome(PathBuf);

impl SshHome {
    /// Locates the SSH directory of a control-plane home.
    #[must_use]
    pub fn new(home: &ControlPlaneHome) -> Self {
        Self(home.ssh_directory())
    }

    /// Returns the directory itself.
    #[must_use]
    pub fn root(&self) -> &Path {
        &self.0
    }

    /// Returns the generated OpenSSH client configuration.
    #[must_use]
    pub fn config_path(&self) -> PathBuf {
        self.0.join("config")
    }

    /// Returns the `known_hosts` file pre-seeded with every Agent's host key.
    #[must_use]
    pub fn known_hosts_path(&self) -> PathBuf {
        self.0.join("known_hosts")
    }

    /// Returns the directory holding one Agent incarnation's client key pair.
    #[must_use]
    pub fn agent_directory(&self, id: AgentId) -> PathBuf {
        self.0.join(id.to_string())
    }

    /// Returns one Agent incarnation's private client key.
    #[must_use]
    pub fn identity_path(&self, id: AgentId) -> PathBuf {
        self.agent_directory(id).join("id_ed25519")
    }

    /// Returns one Agent incarnation's public client key.
    #[must_use]
    pub fn public_identity_path(&self, id: AgentId) -> PathBuf {
        self.agent_directory(id).join("id_ed25519.pub")
    }
}

/// Stable machine-readable description of one Agent's SSH access.
///
/// This is the seam an IDE integration consumes: everything needed to open a
/// connection without parsing the generated configuration.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AccessInfo {
    /// Access kind, always `ssh`.
    #[serde(rename = "type")]
    pub kind: String,
    /// Agent name.
    pub agent: String,
    /// Agent incarnation identity the key material belongs to.
    pub agent_id: AgentId,
    /// OpenSSH `Host` alias in the generated configuration.
    pub alias: String,
    /// Guest user.
    pub user: String,
    /// Absolute private client key path.
    pub identity_file: PathBuf,
    /// Absolute `known_hosts` path holding the Agent's host key.
    pub known_hosts_file: PathBuf,
    /// Absolute path of the generated OpenSSH client configuration.
    pub config_file: PathBuf,
    /// Complete `ProxyCommand` value dialing the Agent through `agentctl`.
    pub proxy_command: String,
}

/// Persists each Agent incarnation's SSH host key.
pub trait HostKeyStore {
    /// Loads the stored OpenSSH private host key, if one exists.
    fn load_host_key(&self, id: AgentId) -> LocalFuture<'_, Result<Option<Zeroizing<Vec<u8>>>, Error>>;

    /// Stores the OpenSSH private host key.
    fn store_host_key(&self, id: AgentId, key: Zeroizing<Vec<u8>>) -> LocalFuture<'_, Result<(), Error>>;

    /// Deletes the stored host key; a missing key is not an error.
    fn delete_host_key(&self, id: AgentId) -> LocalFuture<'_, Result<(), Error>>;
}

/// Files the guest server needs, produced on the host for one pass.
pub struct GuestMaterial {
    /// OpenSSH private host key.
    pub host_private_key: Zeroizing<Vec<u8>>,
    /// Public host key entry, without a trailing newline.
    pub host_public_key: String,
    /// Complete `authorized_keys` content.
    pub authorized_keys: String,
}

/// Builds the message given when the Agent's image cannot serve SSH access.
///
/// The image is immutable for the incarnation, so the message names what is
/// missing and the only fixes: an image that provides it, or withdrawing access.
#[must_use]
pub fn image_contract_missing(what: &str) -> String {
    format!(
        "the Agent's image cannot provide SSH access: {what}; re-apply the Agent with a newer image that installs \
         openssh-server with the platform's agent-ssh unit, or remove `ssh` from spec.access"
    )
}

/// Reconciles SSH access for Agents: host key material, client configuration
/// and the in-guest server state.
pub struct Access {
    home: SshHome,
    agentctl: PathBuf,
    user_home: Option<PathBuf>,
    keys: Rc<dyn HostKeyStore>,
    agents: Rc<dyn AgentStore>,
}

impl Access {
    /// Creates the SSH access reconciler.
    ///
    /// `agentctl` is the absolute executable the generated `ProxyCommand` runs.
    #[must_use]
    pub fn new(
        home: &ControlPlaneHome,
        agentctl: PathBuf,
        keys: Rc<dyn HostKeyStore>,
        agents: Rc<dyn AgentStore>,
    ) -> Self {
        Self {
            home: SshHome::new(home),
            agentctl,
            user_home: crate::local::home::user_home_directory(),
            keys,
            agents,
        }
    }

    /// Overrides the user home used to shorten paths to `~/...`; tests pin it.
    #[must_use]
    pub fn with_user_home(mut self, user_home: Option<PathBuf>) -> Self {
        self.user_home = user_home;
        self
    }

    /// Returns the host-side SSH paths.
    #[must_use]
    pub const fn home(&self) -> &SshHome {
        &self.home
    }

    /// Describes the SSH access of a named Agent.
    ///
    /// # Errors
    ///
    /// Returns `Error::NotFound` for an unknown Agent, `Error::Conflict` while
    /// it is being deleted, and `Error::Invalid` when it declares no SSH access.
    pub async fn describe(&self, name: &str) -> Result<AccessInfo, Error> {
        let record = self.agents.get_by_name(name).await?;
        if record.agent.metadata.deletion_timestamp.is_some() {
            return Err(Error::Conflict);
        }
        if !record.agent.spec.ssh_access() {
            return Err(Error::Invalid(format!(
                "Agent {name:?} does not declare SSH access; add `access: [{{type: ssh}}]` to its spec and re-apply"
            )));
        }
        self.info(&record)
    }

    /// Builds the descriptor for a record without consulting the store.
    ///
    /// # Errors
    ///
    /// Returns an error when the `agentctl` path cannot be rendered into a `ProxyCommand`.
    pub fn info(&self, record: &AgentRecord) -> Result<AccessInfo, Error> {
        let name = &record.agent.metadata.name;
        Ok(AccessInfo {
            kind: ACCESS_TYPE.into(),
            agent: name.clone(),
            agent_id: record.id,
            alias: alias(name),
            user: GUEST_USER.into(),
            identity_file: self.home.identity_path(record.id),
            known_hosts_file: self.home.known_hosts_path(),
            config_file: self.home.config_path(),
            proxy_command: render_proxy_command(&self.agentctl, name, CommandShell::host())?,
        })
    }

    /// Converges SSH access for one Agent against its running Sandbox.
    ///
    /// Returns whether the Agent has SSH access after the pass. An Agent
    /// without declared access has any earlier server state removed.
    ///
    /// # Errors
    ///
    /// Returns `Error::Invalid` when the image lacks an OpenSSH server or the
    /// Sandbox operating system is unsupported, and transient errors when key
    /// material or guest setup cannot be written.
    pub async fn reconcile(&self, record: &AgentRecord, sandbox: &SandboxHandle) -> Result<bool, Error> {
        let os = sandbox.snapshot().image.platform.os.clone();
        if !record.agent.spec.ssh_access() {
            // Guest first: while a stop can still fail, the host key and known_hosts must
            // keep matching the server that may still be running.
            remove_guest_state(&os, sandbox).await?;
            self.remove_host_material(record).await?;
            return Ok(false);
        }
        verify_guest_server(&os, sandbox).await?;
        let material = self.ensure_host_material(record).await?;
        install_guest_state(&os, sandbox, &material).await?;
        Ok(true)
    }

    /// Removes every host-side trace of a deleted Agent incarnation.
    ///
    /// # Errors
    ///
    /// Returns an error when key files or configuration cannot be rewritten.
    pub async fn remove(&self, record: &AgentRecord) -> Result<(), Error> {
        self.remove_host_material(record).await
    }

    async fn ensure_host_material(&self, record: &AgentRecord) -> Result<GuestMaterial, Error> {
        let id = record.id;
        let name = record.agent.metadata.name.as_str();
        let host_key = if let Some(stored) = self.keys.load_host_key(id).await? {
            KeyPair::from_openssh(&stored)?
        } else {
            let generated = KeyPair::generate_ed25519(&host_key_alias(id))?;
            self.keys
                .store_host_key(id, Zeroizing::new(generated.private.as_bytes().to_vec()))
                .await?;
            generated
        };
        let home = self.home.clone();
        let client_key = tokio::task::spawn_blocking({
            let name = name.to_owned();
            move || ensure_client_key(&home, id, &name)
        })
        .await
        .map_err(|error| Error::Daemon(format!("SSH client key task failed: {error}")))??;
        // `HostKeyAlias` keys the entry by the incarnation for OpenSSH; a second entry under the
        // `Host` alias serves clients that parse the configuration but ignore `HostKeyAlias`,
        // such as JetBrains IDEs, and is replaced when a re-applied name gets a new host key.
        let known_hosts = self.home.known_hosts_path();
        upsert_known_host(&known_hosts, &host_key_alias(id), &host_key.public)?;
        upsert_known_host(&known_hosts, &alias(name), &host_key.public)?;
        self.rewrite_config().await?;
        Ok(GuestMaterial {
            host_private_key: Zeroizing::new(host_key.private.as_bytes().to_vec()),
            host_public_key: host_key.public,
            authorized_keys: format!("{client_key}\n"),
        })
    }

    async fn remove_host_material(&self, record: &AgentRecord) -> Result<(), Error> {
        let id = record.id;
        self.keys.delete_host_key(id).await?;
        let directory = self.home.agent_directory(id);
        if directory.exists() {
            std::fs::remove_dir_all(&directory)?;
        }
        let known_hosts = self.home.known_hosts_path();
        remove_known_host(&known_hosts, &host_key_alias(id))?;
        // The name alias belongs to whichever incarnation currently owns the name.
        let owned_by_another = matches!(
            self.agents.get_by_name(&record.agent.metadata.name).await,
            Ok(current) if current.id != id && current.agent.spec.ssh_access()
        );
        if !owned_by_another {
            remove_known_host(&known_hosts, &alias(&record.agent.metadata.name))?;
        }
        self.rewrite_config().await
    }

    /// Rewrites the generated client configuration from every active Agent with SSH access.
    async fn rewrite_config(&self) -> Result<(), Error> {
        let mut entries = self
            .agents
            .list()
            .await?
            .into_iter()
            .filter(|record| record.agent.metadata.deletion_timestamp.is_none() && record.agent.spec.ssh_access())
            .map(|record| {
                Ok(HostEntry {
                    alias: alias(&record.agent.metadata.name),
                    user: GUEST_USER.into(),
                    proxy_command: render_proxy_command(
                        &self.agentctl,
                        &record.agent.metadata.name,
                        CommandShell::host(),
                    )?,
                    host_key_alias: host_key_alias(record.id),
                    identity_file: self.home.identity_path(record.id),
                    known_hosts_file: self.home.known_hosts_path(),
                })
            })
            .collect::<Result<Vec<_>, Error>>()?;
        entries.sort_by(|left, right| left.alias.cmp(&right.alias));
        prepare_directory(self.home.root())?;
        let text = render_config(&entries, self.user_home.as_deref());
        client_config::write_private_file(&self.home.config_path(), text.as_bytes())
    }
}

/// Chooses the `agentctl` path the generated `ProxyCommand` runs.
///
/// `sibling` is `agentctl` beside the running `agentd`, which on an installed
/// release is a versioned directory that a later `agentctl self update`
/// replaces. When a `PATH` entry resolves to the same executable, that stable
/// spelling, such as `~/.local/bin/agentctl`, is preferred so the configuration
/// survives upgrades between reconciliation passes.
#[must_use]
pub fn stable_agentctl_path(sibling: &Path, path_variable: Option<&std::ffi::OsStr>) -> PathBuf {
    let Ok(target) = std::fs::canonicalize(sibling) else {
        return sibling.to_path_buf();
    };
    let file_name = sibling.file_name().map(std::ffi::OsStr::to_owned);
    path_variable
        .into_iter()
        .flat_map(std::env::split_paths)
        .filter(|directory| directory.is_absolute())
        .filter_map(|directory| Some(directory.join(file_name.as_ref()?)))
        .find(|candidate| std::fs::canonicalize(candidate).is_ok_and(|resolved| resolved == target))
        .unwrap_or_else(|| sibling.to_path_buf())
}

/// Creates the client key pair for an incarnation when missing and returns its public entry.
fn ensure_client_key(home: &SshHome, id: AgentId, agent: &str) -> Result<String, Error> {
    prepare_directory(home.root())?;
    prepare_directory(&home.agent_directory(id))?;
    let identity = home.identity_path(id);
    let pair = match std::fs::read(&identity) {
        Ok(private) => KeyPair::from_openssh(&private)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            let generated = KeyPair::generate_ed25519(&format!("{}@{agent}", host_key_alias(id)))?;
            client_config::write_private_file(&identity, generated.private.as_bytes())?;
            generated
        }
        Err(error) => return Err(error.into()),
    };
    let public_path = home.public_identity_path(id);
    let public_line = format!("{}\n", pair.public);
    if std::fs::read_to_string(&public_path).ok().as_deref() != Some(public_line.as_str()) {
        client_config::write_private_file(&public_path, public_line.as_bytes())?;
    }
    Ok(pair.public)
}

fn prepare_directory(path: &Path) -> Result<(), Error> {
    if !path.is_dir() {
        std::fs::create_dir_all(path)?;
    }
    crate::local::home::secure_directory(path)
}

async fn verify_guest_server(os: &str, sandbox: &SandboxHandle) -> Result<(), Error> {
    match os {
        "linux" => platform::linux_ssh::verify_server(sandbox).await,
        os => Err(Error::Invalid(format!(
            "SSH access is not supported on Sandbox operating system {os:?}"
        ))),
    }
}

async fn install_guest_state(os: &str, sandbox: &SandboxHandle, material: &GuestMaterial) -> Result<(), Error> {
    match os {
        "linux" => platform::linux_ssh::install_server_state(sandbox, material).await,
        os => Err(Error::Invalid(format!(
            "SSH access is not supported on Sandbox operating system {os:?}"
        ))),
    }
}

async fn remove_guest_state(os: &str, sandbox: &SandboxHandle) -> Result<(), Error> {
    match os {
        "linux" => platform::linux_ssh::remove_server_state(sandbox).await,
        // Nothing was ever installed on an unsupported operating system.
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::stable_agentctl_path;

    #[test]
    fn proxy_command_prefers_a_path_entry_resolving_to_the_same_agentctl() {
        let directory = tempfile::tempdir().expect("temporary directory");
        let releases = directory.path().join("releases").join("v1");
        let bin = directory.path().join("bin");
        std::fs::create_dir_all(&releases).expect("release directory");
        std::fs::create_dir_all(&bin).expect("bin directory");
        let sibling = releases.join("agentctl");
        std::fs::write(&sibling, "#!/bin/sh\n").expect("release agentctl");
        std::fs::write(bin.join("agentctl"), "#!/bin/sh\n").expect("unrelated agentctl");

        let unrelated = std::env::join_paths([&bin]).expect("PATH");
        assert_eq!(stable_agentctl_path(&sibling, Some(&unrelated)), sibling);
        assert_eq!(stable_agentctl_path(&sibling, None), sibling);

        #[cfg(unix)]
        {
            let stable = directory.path().join("stable");
            std::fs::create_dir_all(&stable).expect("stable directory");
            std::os::unix::fs::symlink(&sibling, stable.join("agentctl")).expect("symlink");
            let path = std::env::join_paths([&bin, &stable]).expect("PATH");
            assert_eq!(stable_agentctl_path(&sibling, Some(&path)), stable.join("agentctl"));
        }
    }
}
