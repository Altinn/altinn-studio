//! Harness-specific adapters behind the closed Agent manifest harness selection.

use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::{Error, persistence};

mod claude_code;
mod codex;
mod hook_script;
mod skills;

const VERSION_PROBE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(5);
const MAX_INITIAL_PROMPT_ARGUMENT_BYTES: usize = 64 * 1024;
const MAX_SELECTION_CHARACTERS: usize = 128;

pub(crate) use skills::{Skill, SkillFile};

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

/// Declares a validated, provider-owned launch selection carried as an opaque string.
///
/// Model names and effort levels belong to the harness vendor: they differ between
/// harnesses and gain new values without a platform release, so the platform only
/// checks that a value can travel safely to the harness command line.
macro_rules! launch_selection {
    ($(#[$doc:meta])* $name:ident, $label:literal) => {
        $(#[$doc])*
        #[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
        #[serde(try_from = "String", into = "String")]
        pub struct $name(String);

        impl $name {
            /// Creates a validated selection.
            ///
            /// # Errors
            ///
            /// Returns an error unless the value is 1–128 ASCII letters, digits or
            /// `-`, `_`, `.`, `:`, `/`, `@`, `+`.
            pub fn new(value: impl Into<String>) -> Result<Self, Error> {
                let value = value.into();
                validate_selection($label, &value)?;
                Ok(Self(value))
            }

            /// Returns the selection as the text handed to the harness.
            #[must_use]
            pub fn as_str(&self) -> &str {
                &self.0
            }
        }

        impl TryFrom<String> for $name {
            type Error = Error;

            fn try_from(value: String) -> Result<Self, Self::Error> {
                Self::new(value)
            }
        }

        impl From<$name> for String {
            fn from(value: $name) -> Self {
                value.0
            }
        }

        impl std::str::FromStr for $name {
            type Err = Error;

            fn from_str(value: &str) -> Result<Self, Self::Err> {
                Self::new(value)
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str(&self.0)
            }
        }
    };
}

launch_selection! {
    /// Harness-owned model selection, such as a Claude Code alias or a Codex model name.
    Model, "model"
}

launch_selection! {
    /// Harness-owned effort or reasoning level, such as `high`.
    Effort, "effort"
}

/// A harness's model and effort level, each optional and provider-owned.
///
/// Declared on a harness installation as the defaults for its new Sessions,
/// requested when a Session is created, and recorded with the Session as the
/// selection every launch of its harness applies.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ModelSelection {
    /// Model name in the harness's own spelling; `None` leaves the harness default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<Model>,
    /// Effort level in the harness's own spelling; `None` leaves the harness default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effort: Option<Effort>,
}

impl ModelSelection {
    /// Whether neither a model nor an effort level is selected.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.model.is_none() && self.effort.is_none()
    }

    /// Fills each unselected field from `defaults`, field by field.
    #[must_use]
    pub fn or(self, defaults: &Self) -> Self {
        Self {
            model: self.model.or_else(|| defaults.model.clone()),
            effort: self.effort.or_else(|| defaults.effort.clone()),
        }
    }

    /// Returns the model as text, when selected.
    #[must_use]
    pub fn model_str(&self) -> Option<&str> {
        self.model.as_ref().map(Model::as_str)
    }

    /// Returns the effort level as text, when selected.
    #[must_use]
    pub fn effort_str(&self) -> Option<&str> {
        self.effort.as_ref().map(Effort::as_str)
    }
}

fn validate_selection(label: &str, value: &str) -> Result<(), Error> {
    if value.is_empty()
        || value.chars().count() > MAX_SELECTION_CHARACTERS
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':' | b'/' | b'@' | b'+'))
    {
        return Err(Error::Invalid(format!(
            "{label} must be 1-{MAX_SELECTION_CHARACTERS} ASCII letters, digits or '-', '_', '.', ':', '/', '@', '+'"
        )));
    }
    Ok(())
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
    /// Model and effort level for new Sessions of this installation that do not
    /// select their own. Omitted, the harness picks its own defaults.
    #[serde(default, skip_serializing_if = "ModelSelection::is_empty")]
    pub defaults: ModelSelection,
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

    /// Stores a credential for the selected harness.
    ///
    /// `imported` marks a credential supplied by the caller rather than minted by the host login
    /// flow; adapters whose host grant must stay isolated only accept mediated placeholders that way.
    ///
    /// # Errors
    ///
    /// Returns an error when the credential is invalid or cannot be persisted.
    pub async fn login(
        &self,
        harness: Harness,
        credential: Zeroizing<String>,
        imported: bool,
    ) -> Result<ImportedAuthentication, Error> {
        match harness {
            Harness::ClaudeCode => self.claude_code.login(credential).await,
            Harness::Codex => self.codex.login(credential, imported).await,
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

pub(crate) fn manages_environment(harness: Harness, name: &str) -> bool {
    match harness {
        Harness::ClaudeCode => claude_code::manages_environment(name),
        Harness::Codex => codex::manages_environment(name),
    }
}

pub(crate) async fn bootstrap_linux(
    harness: Harness,
    sandbox: &sandbox::SandboxHandle,
    home: &str,
    instructions: Option<&[u8]>,
    skills: &[Skill],
) -> Result<(), Error> {
    match harness {
        Harness::ClaudeCode => claude_code::bootstrap_linux(sandbox, home, instructions, skills).await,
        Harness::Codex => codex::bootstrap_linux(sandbox, home, instructions, skills).await,
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

async fn version_output(
    sandbox: &sandbox::SandboxHandle,
    executable: &str,
) -> Result<sandbox::execution::ExecutionOutput, Error> {
    use sandbox::{SandboxPath, execution::ExecutionSpec};

    let started = sandbox
        .start_execution(sandbox::execution::StartExecutionRequest::new(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/env"),
            [executable.to_owned(), "--version".into()],
        )))
        .await?;
    let execution_id = started.id.clone();
    match tokio::time::timeout(VERSION_PROBE_TIMEOUT, started.collect()).await {
        Ok(output) => output.map_err(Error::from),
        Err(_elapsed) => {
            let _ignored = sandbox.kill_execution(&execution_id).await;
            Err(Error::SandboxSetup(format!(
                "`{executable} --version` did not finish within {}s",
                VERSION_PROBE_TIMEOUT.as_secs()
            )))
        }
    }
}

/// Harness-specific process and environment used by the Session runtime.
pub struct ProcessLaunch {
    /// Shell command used to launch the harness.
    pub command: String,
    /// Environment added to the generic Agent session environment.
    pub environment: Vec<(String, String)>,
}

/// Harness-neutral inputs of one Session launch.
#[derive(Clone, Copy, Debug)]
pub struct LaunchRequest<'a> {
    /// Guest home directory holding the harness configuration.
    pub home: &'a str,
    /// Harness-native conversation to continue instead of starting a fresh one.
    pub resume: Option<&'a str>,
    /// First prompt of a fresh conversation, passed as the harness's positional
    /// prompt argument so it starts working immediately; ignored when resuming.
    pub initial_prompt: Option<&'a str>,
    /// Model and effort level the Session was created with.
    pub model_selection: &'a ModelSelection,
}

/// Resolves the selected harness's terminal launch configuration.
///
/// Each adapter spells the request's model and effort in its own launch
/// vocabulary; both apply to fresh and resumed conversations alike.
#[must_use]
pub fn launch_linux(harness: Harness, request: &LaunchRequest<'_>) -> ProcessLaunch {
    match harness {
        Harness::ClaudeCode => claude_code::launch_linux(request),
        Harness::Codex => codex::launch_linux(request),
    }
}

/// Model every Session of `harness` launched with before Sessions recorded a
/// model, when the adapter hardcoded one. Persistence records it for existing
/// Sessions when it adopts the Session selection columns.
pub(crate) const fn model_launched_before_selection(harness: Harness) -> Option<&'static str> {
    match harness {
        Harness::ClaudeCode => Some(claude_code::MODEL_LAUNCHED_BEFORE_SELECTION),
        Harness::Codex => None,
    }
}

/// Quotes `value` as one POSIX shell word, safe for any content.
pub(crate) fn shell_single_quoted(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

/// Validates an initial prompt before it is persisted for an argv-based launch.
pub(crate) fn validate_initial_prompt(prompt: &str) -> Result<(), Error> {
    if prompt.contains('\0') {
        return Err(Error::Invalid("initial prompt must not contain NUL".into()));
    }
    let quoted_bytes = prompt
        .len()
        .saturating_add(prompt.bytes().filter(|byte| *byte == b'\'').count().saturating_mul(3))
        .saturating_add(2);
    if quoted_bytes > MAX_INITIAL_PROMPT_ARGUMENT_BYTES {
        return Err(Error::Invalid(format!(
            "initial prompt is too large; its encoded launch argument must not exceed {} KiB",
            MAX_INITIAL_PROMPT_ARGUMENT_BYTES / 1024
        )));
    }
    Ok(())
}

/// Recognizes an initialized input line before a harness reports its conversation.
/// The runtime supplies the visible cursor line and pane title.
pub(crate) fn input_ready_without_report(harness: Harness, cursor_line: &str, title: &str) -> bool {
    match harness {
        Harness::ClaudeCode => false,
        Harness::Codex => codex::input_ready_without_report(cursor_line, title),
    }
}

/// Parses harness transcript bytes into ordered, runtime-neutral turns.
///
/// # Errors
///
/// Returns an error when the transcript cannot be decoded.
pub(crate) fn parse_transcript(harness: Harness, bytes: &[u8]) -> Result<Vec<crate::sessions::Turn>, Error> {
    match harness {
        Harness::ClaudeCode => claude_code::transcript::parse(bytes),
        Harness::Codex => codex::transcript::parse(bytes),
    }
}

/// Trims a transcript suffix to its first complete harness turn.
pub(crate) fn trim_partial_transcript(harness: Harness, bytes: &[u8]) -> &[u8] {
    match harness {
        Harness::ClaudeCode => claude_code::transcript::trim_partial(bytes),
        Harness::Codex => codex::transcript::trim_partial(bytes),
    }
}

#[cfg(test)]
pub(crate) const fn test_harness() -> Harness {
    Harness::ClaudeCode
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn launch_selections_are_opaque_but_command_line_safe() {
        for value in [
            "fable",
            "claude-fable-5",
            "gpt-5.4-codex",
            "us.anthropic.claude-v1:0",
            "org/model@2",
            "xhigh",
        ] {
            assert_eq!(Model::new(value).expect("valid model").as_str(), value);
            assert_eq!(Effort::new(value).expect("valid effort").as_str(), value);
        }
        for value in [
            "",
            " ",
            "fable ",
            "a b",
            "it's",
            "quote\"d",
            "back\\slash",
            "tab\t",
            "ø",
        ] {
            assert!(Model::new(value).is_err(), "{value:?}");
            assert!(Effort::new(value).is_err(), "{value:?}");
        }
        assert!(Model::new("m".repeat(MAX_SELECTION_CHARACTERS)).is_ok());
        assert!(Model::new("m".repeat(MAX_SELECTION_CHARACTERS + 1)).is_err());
        let error = Effort::new("").expect_err("empty effort");
        assert!(error.to_string().contains("effort must be 1-128"));
        assert!(serde_json::from_str::<Model>("\"\"").is_err());
        assert_eq!(
            serde_json::to_string(&Model::new("fable").expect("model")).expect("JSON"),
            "\"fable\""
        );
    }

    #[test]
    fn initial_prompt_validation_measures_the_shell_quoted_argument() {
        validate_initial_prompt(&"a".repeat(MAX_INITIAL_PROMPT_ARGUMENT_BYTES - 2)).expect("boundary prompt");

        let expanded = "'".repeat(MAX_INITIAL_PROMPT_ARGUMENT_BYTES / 4);
        assert!(validate_initial_prompt(&expanded).is_err());
        assert!(validate_initial_prompt("before\0after").is_err());
    }
}
