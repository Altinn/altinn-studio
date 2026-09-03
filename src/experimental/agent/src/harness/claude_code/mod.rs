//! Claude Code harness adapter.

use crate::{
    Error,
    harness::{MediatedSecret, ProcessLaunch},
    persistence,
};
use sandbox::secret_store::SecretReference;

pub(super) mod authentication;
mod bootstrap;

const PROVIDER: &str = "claude";
const ACCESS_SECRET: &str = "claude-access-token";
const ACCESS_ENVIRONMENT: &str = "CLAUDE_CODE_OAUTH_TOKEN";
const ACCESS_PLACEHOLDER: &str = "sk-ant-oat01-agent-mediated-placeholder-not-a-real-credential";
const API_HOST: &str = "api.anthropic.com";

pub(super) async fn prepare(database: &persistence::Database) -> Result<Vec<MediatedSecret>, Error> {
    if !authentication::is_ready(database).await? {
        return Err(Error::Invalid(
            "Claude Code authentication is not ready; run `agentctl claude login`".into(),
        ));
    }
    Ok(vec![MediatedSecret {
        environment: ACCESS_ENVIRONMENT,
        placeholder: ACCESS_PLACEHOLDER,
        reference: SecretReference::from_opaque(ACCESS_SECRET),
        allowed_hosts: vec![authentication::mediated_host().into()],
    }])
}

pub(super) fn conflicts_with_managed_secret(name: &str, placeholder: Option<&str>) -> bool {
    name == ACCESS_ENVIRONMENT || placeholder == Some(ACCESS_PLACEHOLDER)
}

/// Long-lived Claude setup tokens carry this prefix.
const SETUP_TOKEN_PREFIX: &str = "sk-ant-oat";

/// Mints a long-lived Claude token on the host with `claude setup-token`.
///
/// Runs the harness CLI to completion with the terminal attached so its own
/// browser-redirect OAuth flow (and the ephemeral localhost callback it starts)
/// can finish; it is never timed out. The token is read from stdout, with a
/// paste fallback when the harness prints it only to the terminal.
///
/// # Errors
///
/// Returns an error when the harness CLI is missing, fails, or yields no token.
pub(super) fn acquire_host_token() -> Result<zeroize::Zeroizing<String>, Error> {
    use std::process::{Command, Stdio};

    eprintln!("Minting a long-lived Claude token with `claude setup-token`.");
    eprintln!("A browser window will open — approve the request, then return here.");
    let output = Command::new("claude")
        .arg("setup-token")
        .stdin(Stdio::inherit())
        .stderr(Stdio::inherit())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|error| {
            Error::Invalid(format!(
                "could not run `claude setup-token` (is Claude Code installed on this host?): {error}"
            ))
        })?
        .wait_with_output()
        .map_err(|error| Error::Invalid(format!("`claude setup-token` did not run: {error}")))?;
    if !output.status.success() {
        return Err(Error::Invalid("`claude setup-token` did not complete".into()));
    }
    if let Some(token) = String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .find(|word| word.starts_with(SETUP_TOKEN_PREFIX))
    {
        return Ok(zeroize::Zeroizing::new(token.to_owned()));
    }
    prompt_for_token()
}

/// Reads a token pasted by the user when it did not appear on stdout.
fn prompt_for_token() -> Result<zeroize::Zeroizing<String>, Error> {
    use std::io::Write as _;

    eprint!("Paste the Claude token shown above: ");
    std::io::stderr().flush().ok();
    let mut line = zeroize::Zeroizing::new(String::new());
    std::io::stdin()
        .read_line(&mut line)
        .map_err(|error| Error::Invalid(format!("could not read the pasted token: {error}")))?;
    let token = zeroize::Zeroizing::new(line.trim().to_owned());
    if token.is_empty() {
        return Err(Error::Invalid("no Claude token was provided".into()));
    }
    Ok(token)
}

pub(super) async fn bootstrap_linux(
    sandbox: &sandbox::SandboxHandle,
    home: &str,
    instructions: Option<&[u8]>,
) -> Result<(), Error> {
    bootstrap::configure_linux(sandbox, home, instructions).await
}

pub(super) async fn verify_linux(
    sandbox: &sandbox::SandboxHandle,
    expected_version: Option<&str>,
) -> Result<(), Error> {
    use sandbox::{SandboxPath, execution::ExecutionSpec};

    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/env"),
            ["claude".into(), "--version".into()],
        ))
        .await?;
    if !output.status.success() {
        return Err(Error::SandboxSetup(format!(
            "Claude Code is missing or `claude --version` exited with code {}",
            output.status.code
        )));
    }
    let stdout = std::str::from_utf8(&output.stdout)
        .map_err(|_| Error::SandboxSetup("`claude --version` returned non-UTF-8 output".into()))?;
    let installed = stdout
        .split_whitespace()
        .next()
        .ok_or_else(|| Error::SandboxSetup("`claude --version` returned no version".into()))?;
    if let Some(expected) = expected_version.filter(|expected| *expected != installed) {
        return Err(Error::SandboxSetup(format!(
            "declared Claude Code version {expected:?} does not match installed version {installed:?}"
        )));
    }
    Ok(())
}

pub(super) fn launch_linux(home: &str, resume: Option<&str>) -> ProcessLaunch {
    let config = format!("{home}/.claude");
    // The mediated setup token cannot enumerate models, so Fable 5 never appears in the /model
    // picker (same inference-only-scope limitation as the usage-credits gate handled in bootstrap).
    // Launch on Fable 5 directly; users can still switch to the listed models via /model. Revisit
    // when github.com/anthropics/claude-code#79360 ships.
    let base =
        format!("claude --dangerously-skip-permissions --model claude-fable-5 --settings {config}/agent-settings.json");
    // Claude Code currently reports UUID conversation IDs. Keep that
    // harness-specific constraint out of the generic Session reconciler.
    let resume = resume.and_then(|native| native.parse::<uuid::Uuid>().ok());
    let command = match resume {
        // SessionStart can report an ID before Claude creates its JSONL. Treat
        // the harness-owned transcript as the authority for resumability so
        // an untouched Session can still wake from Idle as a fresh Session.
        Some(native) => format!(
            "if /usr/bin/find {config}/projects -type f -name '{native}.jsonl' -print -quit 2>/dev/null \
             | /usr/bin/grep -q .; then exec {base} --resume {native}; else exec {base}; fi"
        ),
        None => base,
    };
    ProcessLaunch {
        command,
        environment: vec![("CLAUDE_CONFIG_DIR".into(), config)],
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn resume_launch_requires_a_native_transcript() {
        let native = "160cdb4b-5997-464c-9d22-602786eb45d4";
        let launch = super::launch_linux("/home/agent", Some(native));

        assert!(launch.command.contains("/home/agent/.claude/projects"));
        assert!(launch.command.contains("160cdb4b-5997-464c-9d22-602786eb45d4.jsonl"));
        assert!(launch.command.contains("--resume 160cdb4b-5997-464c-9d22-602786eb45d4"));
        assert!(launch.command.contains("else exec claude"));
    }

    #[test]
    fn non_uuid_native_id_is_not_a_claude_resume_target() {
        let launch = super::launch_linux("/home/agent", Some("opaque-harness-id"));

        assert!(!launch.command.contains("--resume"));
    }
}
