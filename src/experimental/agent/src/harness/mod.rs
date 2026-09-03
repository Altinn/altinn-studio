//! Harness-specific adapters behind the closed Agent manifest harness selection.

use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::{Error, persistence};

mod claude_code;
mod codex;
mod session_start;

/// Supported harnesses.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Harness {
    /// Anthropic Claude Code.
    ClaudeCode,
    /// `OpenAI` Codex CLI.
    Codex,
}

impl Harness {
    /// Returns the manifest and CLI spelling of this harness family.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ClaudeCode => "claudeCode",
            Self::Codex => "codex",
        }
    }
}

impl std::fmt::Display for Harness {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl std::str::FromStr for Harness {
    type Err = Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "claudeCode" => Ok(Self::ClaudeCode),
            "codex" => Ok(Self::Codex),
            _ => Err(Error::Invalid(format!("unsupported harness {value:?}"))),
        }
    }
}

/// Supported harness authentication modes.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HarnessAuthMode {
    /// Credentials remain on the host and are injected into authorized requests.
    Mediated,
}

/// One harness installation declared for an Agent.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct HarnessSpec {
    /// Closed harness family identifier.
    #[serde(rename = "type")]
    pub kind: Harness,
    /// Exact version installed by the Agent image; omitted when the image owns the version, so image bumps need no manifest change.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    /// Authentication delivery mode.
    pub auth: HarnessAuthMode,
    /// Whether new Sessions select this installation when no harness is specified.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub default: bool,
}

/// Non-secret result of importing a host harness login.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ImportedAuthentication {
    /// Authentication provider identifier.
    pub provider: String,
    /// Whether usable credentials were imported.
    pub ready: bool,
}

/// Dispatches host-side authentication to the selected harness adapter.
pub struct AuthenticationManager {
    database: persistence::Database,
    claude_code: claude_code::authentication::Authentication,
    codex: codex::authentication::Authentication,
}

impl AuthenticationManager {
    /// Creates the harness authentication manager over the shared database owner.
    #[must_use]
    pub fn new(database: persistence::Database) -> Self {
        Self {
            database: database.clone(),
            claude_code: claude_code::authentication::Authentication::new(database.clone()),
            codex: codex::authentication::Authentication::new(database),
        }
    }

    /// Stores a host-acquired credential for the selected harness.
    ///
    /// # Errors
    ///
    /// Returns an error when the credential is invalid or cannot be persisted.
    pub async fn login(
        &self,
        harness: Harness,
        credential: Zeroizing<String>,
    ) -> Result<ImportedAuthentication, Error> {
        match harness {
            Harness::ClaudeCode => self.claude_code.login(credential).await,
            Harness::Codex => self.codex.login(credential).await,
        }
    }
}

impl sandbox::secret_store::SecretStore for AuthenticationManager {
    fn set<'a>(
        &'a self,
        name: &'a str,
        value: &'a [u8],
    ) -> sandbox::LocalFuture<'a, Result<sandbox::secret_store::SecretReference, sandbox::Error>> {
        sandbox::secret_store::SecretStore::set(&self.database, name, value)
    }

    fn resolve<'a>(
        &'a self,
        reference: &'a sandbox::secret_store::SecretReference,
    ) -> sandbox::LocalFuture<'a, Result<sandbox::secret_store::SecretMaterial, sandbox::Error>> {
        Box::pin(async move {
            if codex::owns_secret(reference) {
                self.codex.resolve_access().await
            } else {
                sandbox::secret_store::SecretStore::resolve(&self.database, reference).await
            }
        })
    }
}

/// Acquires a host credential for the selected harness, interactively.
///
/// Runs on the client host, where a terminal and browser are available; the
/// harness-specific login mechanism lives behind the closed harness enum.
///
/// # Errors
///
/// Returns an error when the harness login tool is missing, fails, or yields no credential.
pub fn acquire_host_credential(
    harness: Harness,
    control_plane_home: &std::path::Path,
) -> Result<Zeroizing<String>, Error> {
    match harness {
        Harness::ClaudeCode => claude_code::acquire_host_token(),
        Harness::Codex => codex::acquire_host_credential(control_plane_home),
    }
}

pub(crate) async fn prepare(harness: Harness, database: &persistence::Database) -> Result<Vec<MediatedSecret>, Error> {
    match harness {
        Harness::ClaudeCode => claude_code::prepare(database).await,
        Harness::Codex => codex::prepare(database).await,
    }
}

pub(crate) struct MediatedSecret {
    pub(crate) environment: &'static str,
    pub(crate) placeholder: &'static str,
    pub(crate) reference: sandbox::secret_store::SecretReference,
    pub(crate) allowed_hosts: Vec<String>,
}

pub(crate) fn conflicts_with_managed_secret(harness: Harness, name: &str, placeholder: Option<&str>) -> bool {
    match harness {
        Harness::ClaudeCode => claude_code::conflicts_with_managed_secret(name, placeholder),
        Harness::Codex => codex::conflicts_with_managed_secret(name, placeholder),
    }
}

pub(crate) async fn bootstrap_linux(
    harness: Harness,
    sandbox: &sandbox::SandboxHandle,
    home: &str,
    instructions: Option<&[u8]>,
) -> Result<(), Error> {
    match harness {
        Harness::ClaudeCode => claude_code::bootstrap_linux(sandbox, home, instructions).await,
        Harness::Codex => codex::bootstrap_linux(sandbox, home, instructions).await,
    }
}

/// Verifies that the declared harness installation exists, at the exact version when one is declared.
pub(crate) async fn verify_linux(
    harness: Harness,
    sandbox: &sandbox::SandboxHandle,
    expected_version: Option<&str>,
) -> Result<(), Error> {
    match harness {
        Harness::ClaudeCode => claude_code::verify_linux(sandbox, expected_version).await,
        Harness::Codex => codex::verify_linux(sandbox, expected_version).await,
    }
}

/// Harness-specific process and environment used by the Session runtime.
pub struct ProcessLaunch {
    /// Shell command used to launch the harness.
    pub command: String,
    /// Environment added to the generic Agent session environment.
    pub environment: Vec<(String, String)>,
}

/// Resolves the selected harness's terminal launch configuration.
///
/// A `resume` value continues the given harness-native conversation instead of
/// starting a fresh one.
#[must_use]
pub fn launch_linux(harness: Harness, home: &str, resume: Option<&str>) -> ProcessLaunch {
    match harness {
        Harness::ClaudeCode => claude_code::launch_linux(home, resume),
        Harness::Codex => codex::launch_linux(home, resume),
    }
}

#[cfg(test)]
pub(crate) const fn test_harness() -> Harness {
    Harness::ClaudeCode
}
