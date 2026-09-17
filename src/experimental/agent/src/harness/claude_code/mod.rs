//! Claude Code harness adapter.

use std::fmt::Write as _;

use crate::{
    Error,
    harness::{LaunchRequest, MediatedSecret, ProcessLaunch, shell_single_quoted},
    persistence,
};
use sandbox::secret_store::SecretReference;

pub(super) mod authentication;
mod bootstrap;
mod hooks;
pub(super) mod transcript;

const PROVIDER: &str = "claude";
const ACCESS_SECRET: &str = "claude-access-token";
const ACCESS_ENVIRONMENT: &str = "CLAUDE_CODE_OAUTH_TOKEN";
const ACCESS_PLACEHOLDER: &str = "sk-ant-oat01-agent-mediated-placeholder-not-a-real-credential";
/// Second binding on the same credential, under a name the harness does not
/// scrub. Claude Code removes `CLAUDE_CODE_OAUTH_TOKEN` from every process it
/// spawns, so a Session cannot read its own placeholder to hand to a nested
/// `agentd`; this name survives, as the Codex one already does.
const NESTED_ENVIRONMENT: &str = "AGENT_CLAUDE_ACCESS_TOKEN";
/// A binding needs its own placeholder, and one placeholder may not contain
/// another, so this is not a spelling of `ACCESS_PLACEHOLDER`. A nested Agent
/// therefore sends this value outward and the outer mediation resolves it to
/// the same stored credential.
const NESTED_PLACEHOLDER: &str = "sk-ant-oat01-agent-mediated-nested-placeholder-not-a-real-credential";
const API_HOST: &str = "api.anthropic.com";
/// The model recorded for Sessions that predate recorded selections. The adapter
/// launched every Session on this alias from preview 2 until selections arrived,
/// because the mediated setup token cannot enumerate models and Fable never
/// appeared in the `/model` picker. Preview 1 Sessions ran on Claude Code's own
/// default; recording the alias for them too keeps every earlier conversation on
/// one known model instead of whatever the harness defaults to next. Manifests
/// now declare the default for new Sessions.
pub(super) const MODEL_LAUNCHED_BEFORE_SELECTION: &str = "fable";

pub(super) async fn prepare(database: &persistence::Database) -> Result<Vec<MediatedSecret>, Error> {
    if !authentication::is_ready(database).await? {
        return Err(Error::Invalid(
            "Claude Code authentication is not ready; run `agentctl claude login`".into(),
        ));
    }
    Ok(vec![
        MediatedSecret {
            environment: ACCESS_ENVIRONMENT,
            placeholder: ACCESS_PLACEHOLDER,
            reference: SecretReference::from_opaque(ACCESS_SECRET),
            allowed_hosts: vec![authentication::mediated_host().into()],
        },
        MediatedSecret {
            environment: NESTED_ENVIRONMENT,
            placeholder: NESTED_PLACEHOLDER,
            reference: SecretReference::from_opaque(ACCESS_SECRET),
            allowed_hosts: vec![authentication::mediated_host().into()],
        },
    ])
}

pub(super) fn conflicts_with_managed_secret(name: &str, placeholder: Option<&str>) -> bool {
    matches!(name, ACCESS_ENVIRONMENT | NESTED_ENVIRONMENT)
        || matches!(placeholder, Some(ACCESS_PLACEHOLDER | NESTED_PLACEHOLDER))
}

pub(super) fn manages_environment(name: &str) -> bool {
    matches!(
        name,
        ACCESS_ENVIRONMENT | NESTED_ENVIRONMENT | "CLAUDE_CONFIG_DIR" | "DISABLE_AUTOUPDATER"
    )
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
    skills: &[crate::harness::Skill],
) -> Result<(), Error> {
    bootstrap::configure_linux(sandbox, home, instructions, skills).await
}

pub(super) async fn verify_linux(
    sandbox: &sandbox::SandboxHandle,
    expected_version: Option<&str>,
) -> Result<(), Error> {
    let output = super::version_output(sandbox, "claude").await?;
    if !output.status.success() {
        let message = format!("`claude --version` exited with code {}", output.status.code);
        // 126/127 mean the image does not provide the harness; retrying cannot change that.
        // Any other failure this early in the guest's life may be transient.
        return Err(if matches!(output.status.code, 126 | 127) {
            Error::Invalid(format!("Claude Code is missing: {message}"))
        } else {
            Error::SandboxSetup(message)
        });
    }
    let stdout = std::str::from_utf8(&output.stdout)
        .map_err(|_| Error::SandboxSetup("`claude --version` returned non-UTF-8 output".into()))?;
    let installed = stdout
        .split_whitespace()
        .next()
        .ok_or_else(|| Error::SandboxSetup("`claude --version` returned no version".into()))?;
    if let Some(expected) = expected_version.filter(|expected| *expected != installed) {
        return Err(Error::Invalid(format!(
            "declared Claude Code version {expected:?} does not match installed version {installed:?}"
        )));
    }
    Ok(())
}

pub(super) fn launch_linux(request: &LaunchRequest<'_>) -> ProcessLaunch {
    let config = format!("{}/.claude", request.home);
    let mut base = format!("claude --dangerously-skip-permissions --settings {config}/agent-settings.json");
    // Claude Code takes a model alias (`fable`, `opus`) or full model name, and one of its own
    // effort levels. Both are opaque here and apply to fresh and resumed conversations alike.
    if let Some(model) = &request.model_selection.model {
        let _infallible = write!(base, " --model {}", shell_single_quoted(model.as_str()));
    }
    if let Some(effort) = &request.model_selection.effort {
        let _infallible = write!(base, " --effort {}", shell_single_quoted(effort.as_str()));
    }
    // A fresh conversation may start on a positional prompt; `--` keeps a prompt
    // that begins with `-` from being read as an option.
    let fresh = request.initial_prompt.map_or_else(
        || base.clone(),
        |message| format!("{base} -- {}", shell_single_quoted(message)),
    );
    // Claude Code currently reports UUID conversation IDs. Keep that
    // harness-specific constraint out of the generic Session reconciler.
    let resume = request.resume.and_then(|native| native.parse::<uuid::Uuid>().ok());
    let command = match resume {
        // SessionStart can report an ID before Claude creates its JSONL. Treat
        // the harness-owned transcript as the authority for resumability so
        // an untouched Session can still wake from Idle as a fresh Session.
        Some(native) => format!(
            "if /usr/bin/find {config}/projects -type f -name '{native}.jsonl' -print -quit 2>/dev/null \
             | /usr/bin/grep -q .; then exec {base} --resume {native}; else exec {fresh}; fi"
        ),
        None => fresh,
    };
    ProcessLaunch {
        command,
        // Launch-only override keeps the tmux session non-interactive without
        // depending on image ENV propagating into it.
        environment: vec![
            ("CLAUDE_CONFIG_DIR".into(), config),
            ("DISABLE_AUTOUPDATER".into(), "1".into()),
        ],
    }
}

#[cfg(test)]
mod tests {
    use crate::harness::{Effort, LaunchRequest, Model, ModelSelection};

    const UNSELECTED: ModelSelection = ModelSelection {
        model: None,
        effort: None,
    };

    fn request<'a>(resume: Option<&'a str>, initial_prompt: Option<&'a str>) -> LaunchRequest<'a> {
        LaunchRequest {
            home: "/home/agent",
            resume,
            initial_prompt,
            model_selection: &UNSELECTED,
        }
    }

    #[test]
    fn the_nested_binding_is_a_distinct_unambiguous_setup_token() {
        // The Network Backend rejects bindings whose placeholders repeat or contain one another.
        assert_ne!(super::ACCESS_PLACEHOLDER, super::NESTED_PLACEHOLDER);
        assert!(!super::ACCESS_PLACEHOLDER.contains(super::NESTED_PLACEHOLDER));
        assert!(!super::NESTED_PLACEHOLDER.contains(super::ACCESS_PLACEHOLDER));
        // `agentctl claude login` only accepts a setup token, so a nested Agent can chain on this.
        assert!(super::NESTED_PLACEHOLDER.starts_with(super::SETUP_TOKEN_PREFIX));
    }

    #[test]
    fn a_manifest_cannot_redeclare_either_claude_binding() {
        for name in [super::ACCESS_ENVIRONMENT, super::NESTED_ENVIRONMENT] {
            assert!(super::manages_environment(name));
            assert!(super::conflicts_with_managed_secret(name, None));
        }
        for placeholder in [super::ACCESS_PLACEHOLDER, super::NESTED_PLACEHOLDER] {
            assert!(super::conflicts_with_managed_secret("UNRELATED", Some(placeholder)));
        }
    }

    #[test]
    fn resume_launch_requires_a_native_transcript() {
        let native = "160cdb4b-5997-464c-9d22-602786eb45d4";
        let launch = super::launch_linux(&request(Some(native), None));

        assert!(launch.command.contains("/home/agent/.claude/projects"));
        assert!(launch.command.contains("160cdb4b-5997-464c-9d22-602786eb45d4.jsonl"));
        assert!(launch.command.contains("--resume 160cdb4b-5997-464c-9d22-602786eb45d4"));
        assert!(launch.command.contains("else exec claude"));
        assert!(launch.environment.contains(&("DISABLE_AUTOUPDATER".into(), "1".into())));
    }

    #[test]
    fn non_uuid_native_id_is_not_a_claude_resume_target() {
        let launch = super::launch_linux(&request(Some("opaque-harness-id"), None));

        assert!(!launch.command.contains("--resume"));
    }

    #[test]
    fn a_fresh_launch_passes_the_first_prompt_as_one_quoted_argument() {
        let launch = super::launch_linux(&request(None, Some("fix it's\nbroken")));

        assert!(
            // `--` keeps a prompt that starts with `-` or names a subcommand positional.
            launch.command.ends_with(" -- 'fix it'\\''s\nbroken'"),
            "{}",
            launch.command
        );
        assert!(!launch.command.contains("--resume"));
    }

    #[test]
    fn launches_select_no_model_or_effort_unless_the_session_carries_them() {
        let launch = super::launch_linux(&request(None, None));

        assert!(!launch.command.contains("--model"));
        assert!(!launch.command.contains("--effort"));
    }

    #[test]
    fn model_and_effort_apply_to_fresh_and_resumed_conversations() {
        let selection = ModelSelection {
            model: Some(Model::new("fable").expect("model")),
            effort: Some(Effort::new("xhigh").expect("effort")),
        };
        let launch = super::launch_linux(&LaunchRequest {
            model_selection: &selection,
            ..request(Some("160cdb4b-5997-464c-9d22-602786eb45d4"), Some("go"))
        });

        assert_eq!(
            launch.command.matches("--model 'fable' --effort 'xhigh'").count(),
            2,
            "{}",
            launch.command
        );
        assert!(launch.command.contains("--effort 'xhigh' --resume 160cdb4b"));
        assert!(launch.command.contains("--effort 'xhigh' -- 'go'"));
    }
}
