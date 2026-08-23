//! Harness-specific adapters behind the closed Agent manifest harness selection.

use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::{Error, persistence};

mod claude_code;

/// Supported harnesses.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Harness {
    /// Anthropic Claude Code.
    ClaudeCode,
}

/// Supported harness authentication modes.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HarnessAuthMode {
    /// Credentials remain on the host and are injected into authorized requests.
    Mediated,
}

/// Harness installation selected for an Agent.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct HarnessSpec {
    /// Closed harness family identifier.
    #[serde(rename = "type")]
    pub kind: Harness,
    /// Version installed by the Agent image.
    pub version: String,
    /// Authentication delivery mode.
    pub auth: HarnessAuthMode,
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
    claude_code: claude_code::authentication::Authentication,
}

impl AuthenticationManager {
    /// Creates the harness authentication manager over the shared database owner.
    #[must_use]
    pub fn new(database: persistence::Database) -> Self {
        Self {
            claude_code: claude_code::authentication::Authentication::new(database),
        }
    }

    /// Stores a host-minted long-lived token for the selected harness.
    ///
    /// # Errors
    ///
    /// Returns an error when the harness is unsupported, or the token is invalid or cannot be persisted.
    pub async fn login(&self, harness: Harness, token: Zeroizing<String>) -> Result<ImportedAuthentication, Error> {
        match harness {
            Harness::ClaudeCode => self.claude_code.login(token).await,
        }
    }
}

/// Mints a long-lived host token for the selected harness, interactively.
///
/// Runs on the client host, where a terminal and browser are available; the
/// harness-specific login mechanism lives behind the closed harness enum.
///
/// # Errors
///
/// Returns an error when the harness login tool is missing, fails, or yields no token.
pub fn acquire_host_token(harness: Harness) -> Result<Zeroizing<String>, Error> {
    match harness {
        Harness::ClaudeCode => claude_code::acquire_host_token(),
    }
}

pub(crate) async fn prepare(harness: Harness, database: &persistence::Database) -> Result<Vec<MediatedSecret>, Error> {
    match harness {
        Harness::ClaudeCode => claude_code::prepare(database).await,
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
    }
}

/// Verifies that the declared harness installation exists at the exact version.
pub(crate) async fn verify_linux(
    harness: Harness,
    sandbox: &sandbox::SandboxHandle,
    expected_version: &str,
) -> Result<(), Error> {
    match harness {
        Harness::ClaudeCode => claude_code::verify_linux(sandbox, expected_version).await,
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
    }
}
