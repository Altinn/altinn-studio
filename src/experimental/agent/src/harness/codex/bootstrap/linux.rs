//! Linux Sandbox configuration for mediated Codex CLI authentication.

use std::io::Cursor;

use sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::Error;

use super::super::{ACCESS_PLACEHOLDER, ACCOUNT_PLACEHOLDER, REFRESH_PLACEHOLDER};

pub(super) async fn configure(sandbox: &SandboxHandle, home: &str, instructions: Option<&[u8]>) -> Result<(), Error> {
    let config = format!("{home}/.codex");
    let hooks_path = format!("{config}/hooks");
    let auth_path = format!("{config}/auth.json");
    let hook_path = format!("{config}/hooks/session-start.mjs");
    let hooks_config_path = format!("{config}/hooks.json");
    let instructions_path = format!("{config}/AGENTS.md");

    run_checked(sandbox, "/usr/bin/mkdir", ["-p", hooks_path.as_str()]).await?;
    // Codex must believe it owns a normal ChatGPT login while the real,
    // rotating grant remains host-only. The fake JWT expiry and fresh refresh
    // timestamp suppress proactive guest refresh; a 401 can only attempt the
    // deliberately unusable placeholder refresh token.
    let last_refresh = time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .map_err(|error| Error::SandboxSetup(format!("could not format Codex refresh time: {error}")))?;
    let auth = serde_json::to_vec(&serde_json::json!({
        "auth_mode": "chatgpt",
        "OPENAI_API_KEY": null,
        "tokens": {
            "id_token": ACCESS_PLACEHOLDER,
            "access_token": ACCESS_PLACEHOLDER,
            "refresh_token": REFRESH_PLACEHOLDER,
            "account_id": ACCOUNT_PLACEHOLDER,
        },
        "last_refresh": last_refresh,
    }))?;
    sandbox
        .write_file(&SandboxPath::new(auth_path.clone()), Box::pin(Cursor::new(auth)))
        .await?;
    if let Some(instructions) = instructions {
        sandbox
            .write_file(
                &SandboxPath::new(instructions_path.clone()),
                Box::pin(Cursor::new(instructions.to_vec())),
            )
            .await?;
    }
    sandbox
        .write_file(
            &SandboxPath::new(hook_path.clone()),
            Box::pin(Cursor::new(crate::harness::session_start::HOOK.as_bytes().to_vec())),
        )
        .await?;
    let hooks = serde_json::to_vec(&serde_json::json!({
        "hooks": {
            "SessionStart": [{
                "hooks": [{
                    "type": "command",
                    "command": format!("node {hook_path}"),
                    "timeout": 2,
                }]
            }]
        }
    }))?;
    sandbox
        .write_file(
            &SandboxPath::new(hooks_config_path.clone()),
            Box::pin(Cursor::new(hooks)),
        )
        .await?;

    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "/usr/bin/chown",
            "agent:agent",
            config.as_str(),
            hooks_path.as_str(),
            auth_path.as_str(),
            hook_path.as_str(),
            hooks_config_path.as_str(),
        ],
    )
    .await?;
    run_checked(sandbox, "/usr/bin/chmod", ["600", auth_path.as_str()]).await?;
    if instructions.is_some() {
        run_checked(
            sandbox,
            "/usr/bin/sudo",
            ["/usr/bin/chown", "agent:agent", instructions_path.as_str()],
        )
        .await?;
        run_checked(sandbox, "/usr/bin/chmod", ["644", instructions_path.as_str()]).await?;
    }
    Ok(())
}

async fn run_checked<const N: usize>(sandbox: &SandboxHandle, executable: &str, args: [&str; N]) -> Result<(), Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new(executable),
            args.into_iter().map(str::to_owned),
        ))
        .await?;
    if output.status.success() {
        Ok(())
    } else {
        Err(Error::SandboxSetup(format!(
            "command {executable:?} exited with code {}",
            output.status.code
        )))
    }
}
