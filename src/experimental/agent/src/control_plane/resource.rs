//! Internal identity and persisted representation of an Agent resource.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{Agent, Error};

/// Immutable identity of one Agent incarnation.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct AgentId(Uuid);

impl AgentId {
    pub(crate) fn generate() -> Self {
        Self(Uuid::new_v4())
    }

    /// Returns the underlying UUID.
    #[must_use]
    pub const fn as_uuid(&self) -> &Uuid {
        &self.0
    }
}

impl std::fmt::Display for AgentId {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(formatter)
    }
}

impl std::str::FromStr for AgentId {
    type Err = uuid::Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        value.parse().map(Self)
    }
}

/// Stored desired and observed Agent state plus local source provenance.
#[derive(Clone, Debug, Eq, PartialEq, Deserialize, Serialize)]
pub struct AgentRecord {
    /// Immutable identity of this Agent incarnation.
    pub id: AgentId,
    /// Absolute directory against which manifest-relative sources are resolved.
    pub source_directory: std::path::PathBuf,
    /// Absolute path of the manifest last applied, when the client reported it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub manifest_path: Option<std::path::PathBuf>,
    /// Absolute path of the secret file, when it is not [`ENV_FILE`] beside the manifest.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub env_file: Option<std::path::PathBuf>,
    /// Desired state and most recently observed status.
    pub agent: Agent,
}

/// Default secret file name, resolved in the source directory.
pub const ENV_FILE: &str = ".env";

impl AgentRecord {
    /// Returns the host file that supplies manifest secret values.
    #[must_use]
    pub fn env_file_path(&self) -> std::path::PathBuf {
        self.env_file
            .clone()
            .unwrap_or_else(|| self.source_directory.join(ENV_FILE))
    }

    /// Derives the Provider-independent Sandbox name for this Agent incarnation.
    ///
    /// # Errors
    ///
    /// Returns an error only if the stable Agent identity cannot form a valid Sandbox name.
    pub fn sandbox_name(&self) -> Result<::sandbox::SandboxName, Error> {
        ::sandbox::SandboxName::new(format!("agent-{}", self.id))
            .map_err(|error| Error::Database(format!("Agent ID cannot identify its Sandbox: {error}")))
    }

    /// Derives the hostname the Sandbox reports: the Agent name.
    ///
    /// # Errors
    ///
    /// Returns an error only if the validated Agent name cannot form a hostname.
    pub fn sandbox_hostname(&self) -> Result<::sandbox::Hostname, Error> {
        ::sandbox::Hostname::new(self.agent.metadata.name.clone())
            .map_err(|error| Error::Database(format!("Agent name cannot be its Sandbox hostname: {error}")))
    }
}
