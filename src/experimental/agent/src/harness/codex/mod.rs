//! `OpenAI` Codex CLI harness adapter.

use std::io::Read as _;

use sandbox::secret_store::SecretReference;

use crate::{
    Error,
    harness::{MediatedSecret, ProcessLaunch},
    persistence,
};

pub(super) mod authentication;
mod bootstrap;

const PROVIDER: &str = "codex";
const ACCESS_SECRET: &str = "codex-access-token";
const REFRESH_SECRET: &str = "codex-refresh-token";
const ACCOUNT_SECRET: &str = "codex-account-id";
const ACCESS_ENVIRONMENT: &str = "AGENT_CODEX_ACCESS_TOKEN";
const ACCOUNT_ENVIRONMENT: &str = "AGENT_CODEX_ACCOUNT_ID";
const ACCESS_PLACEHOLDER: &str = concat!(
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.",
    "eyJleHAiOjQxMDI0NDQ4MDAsImh0dHBzOi8vYXBpLm9wZW5haS5jb20vYXV0aCI6eyJjaGF0Z3B0X2FjY291bnRfaWQiOiJhZ2VudC1tZWRpYXRlZC1jb2RleC1hY2NvdW50LXBsYWNlaG9sZGVyIn19.",
    "agent"
);
const ACCOUNT_PLACEHOLDER: &str = "agent-mediated-codex-account-placeholder";
const REFRESH_PLACEHOLDER: &str = "agent-mediated-codex-refresh-placeholder-not-a-real-token";
const CHATGPT_HOST: &str = "chatgpt.com";

pub(super) fn owns_secret(reference: &SecretReference) -> bool {
    reference.as_str() == ACCESS_SECRET
}

pub(super) async fn prepare(database: &persistence::Database) -> Result<Vec<MediatedSecret>, Error> {
    if !authentication::is_ready(database).await? {
        return Err(Error::Invalid(
            "Codex authentication is not ready; run `agentctl codex login`".into(),
        ));
    }
    Ok(vec![
        MediatedSecret {
            environment: ACCESS_ENVIRONMENT,
            placeholder: ACCESS_PLACEHOLDER,
            reference: SecretReference::from_opaque(ACCESS_SECRET),
            allowed_hosts: vec![CHATGPT_HOST.into()],
        },
        MediatedSecret {
            environment: ACCOUNT_ENVIRONMENT,
            placeholder: ACCOUNT_PLACEHOLDER,
            reference: SecretReference::from_opaque(ACCOUNT_SECRET),
            allowed_hosts: vec![CHATGPT_HOST.into()],
        },
    ])
}

pub(super) fn conflicts_with_managed_secret(name: &str, placeholder: Option<&str>) -> bool {
    matches!(name, ACCESS_ENVIRONMENT | ACCOUNT_ENVIRONMENT)
        || matches!(placeholder, Some(ACCESS_PLACEHOLDER | ACCOUNT_PLACEHOLDER))
}

/// Creates a separate `ChatGPT` login grant without reading the user's Codex home.
pub(super) fn acquire_host_credential(
    control_plane_home: &std::path::Path,
) -> Result<zeroize::Zeroizing<String>, Error> {
    let temporary_root = control_plane_home.join("tmp");
    std::fs::create_dir_all(&temporary_root)?;
    crate::local::home::secure_directory(&temporary_root)?;
    remove_stale_login_homes(&temporary_root);
    let home = tempfile::Builder::new()
        .prefix("codex-login-")
        .tempdir_in(temporary_root)?;
    let status = std::process::Command::new("codex")
        .env("CODEX_HOME", home.path())
        .env_remove("CODEX_ACCESS_TOKEN")
        .env_remove("CODEX_API_KEY")
        .env_remove("OPENAI_API_KEY")
        .args([
            "-c",
            "cli_auth_credentials_store=\"file\"",
            "-c",
            "forced_login_method=\"chatgpt\"",
            "login",
        ])
        .status()
        .map_err(|error| Error::Invalid(format!("could not start `codex login`: {error}")))?;
    if !status.success() {
        return Err(Error::Invalid(format!("`codex login` exited with {status}")));
    }

    let path = home.path().join("auth.json");
    if !std::fs::symlink_metadata(&path)?.file_type().is_file() {
        return Err(Error::Invalid(
            "`codex login` did not create a regular auth.json file".into(),
        ));
    }
    let mut credential = zeroize::Zeroizing::new(String::new());
    std::fs::File::open(path)?.read_to_string(&mut credential)?;
    if credential.trim().is_empty() {
        return Err(Error::Invalid("`codex login` created an empty auth.json file".into()));
    }
    Ok(credential)
}

fn remove_stale_login_homes(temporary_root: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(temporary_root) else {
        return;
    };
    for entry in entries.flatten() {
        if entry
            .file_name()
            .to_str()
            .is_some_and(|name| name.starts_with("codex-login-"))
            && entry.file_type().is_ok_and(|kind| kind.is_dir())
        {
            let _ignored = std::fs::remove_dir_all(entry.path());
        }
    }
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
            ["codex".into(), "--version".into()],
        ))
        .await?;
    if !output.status.success() {
        return Err(Error::SandboxSetup(format!(
            "Codex is missing or `codex --version` exited with code {}",
            output.status.code
        )));
    }
    let stdout = std::str::from_utf8(&output.stdout)
        .map_err(|_| Error::SandboxSetup("`codex --version` returned non-UTF-8 output".into()))?;
    let installed = stdout
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| Error::SandboxSetup("`codex --version` returned no version".into()))?;
    if let Some(expected) = expected_version.filter(|expected| *expected != installed) {
        return Err(Error::SandboxSetup(format!(
            "declared Codex version {expected:?} does not match installed version {installed:?}"
        )));
    }
    Ok(())
}

pub(super) fn launch_linux(home: &str, resume: Option<&str>) -> ProcessLaunch {
    let config = format!("{home}/.codex");
    let flags = "--dangerously-bypass-approvals-and-sandbox --dangerously-bypass-hook-trust";
    // Launch-only overrides keep adapter-owned authentication and the fixed
    // Session root non-interactive without overwriting builder config.toml.
    let configuration = format!(
        "-c 'cli_auth_credentials_store=\"file\"' -c 'projects.{}.trust_level=\"trusted\"'",
        crate::sandbox::platform::WORKING_DIRECTORY
    );
    let base = format!("codex {flags} {configuration}");
    let resume = resume.and_then(|native| native.parse::<uuid::Uuid>().ok());
    let command = match resume {
        Some(native) => format!(
            "if /usr/bin/find {config}/sessions -type f \\( \
             -name 'rollout-*-{native}.jsonl' -o -name 'rollout-*-{native}.jsonl.zst' \\) \
             -print -quit 2>/dev/null | /usr/bin/grep -q .; \
             then exec codex resume {flags} {configuration} {native}; else exec {base}; fi"
        ),
        None => base,
    };
    ProcessLaunch {
        command,
        environment: vec![
            ("CODEX_HOME".into(), config),
            (
                "CODEX_CA_CERTIFICATE".into(),
                "/etc/ssl/certs/ca-certificates.crt".into(),
            ),
        ],
    }
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    #[test]
    fn stale_private_login_homes_are_removed_without_touching_other_files() {
        let root = TempDir::new().expect("temporary directory");
        let stale = root.path().join("codex-login-stale");
        std::fs::create_dir(&stale).expect("stale login home");
        std::fs::write(stale.join("auth.json"), "refresh-canary").expect("stale credential");
        let unrelated = root.path().join("other-state");
        std::fs::create_dir(&unrelated).expect("unrelated state");

        super::remove_stale_login_homes(root.path());

        assert!(!stale.exists());
        assert!(unrelated.exists());
    }

    #[test]
    fn resume_launch_requires_a_native_rollout() {
        let native = "160cdb4b-5997-464c-9d22-602786eb45d4";
        let launch = super::launch_linux("/home/agent", Some(native));

        assert!(launch.command.contains("/home/agent/.codex/sessions"));
        assert!(
            launch
                .command
                .contains("rollout-*-160cdb4b-5997-464c-9d22-602786eb45d4.jsonl'")
        );
        assert!(
            launch
                .command
                .contains("rollout-*-160cdb4b-5997-464c-9d22-602786eb45d4.jsonl.zst'")
        );
        assert!(!launch.command.contains("_*.jsonl"));
        assert!(!launch.command.contains(".jsonl*"));
        assert!(
            launch
                .command
                .contains("codex resume --dangerously-bypass-approvals-and-sandbox")
        );
        assert!(launch.command.contains("cli_auth_credentials_store=\"file\""));
        assert!(
            launch
                .command
                .contains("projects./home/agent/code.trust_level=\"trusted\"")
        );
        assert!(launch.command.contains(native));
        assert!(launch.command.contains("else exec codex"));
    }

    #[test]
    fn non_uuid_native_id_is_not_a_codex_resume_target() {
        let launch = super::launch_linux("/home/agent", Some("opaque-harness-id"));

        assert!(!launch.command.contains("codex resume"));
    }
}
