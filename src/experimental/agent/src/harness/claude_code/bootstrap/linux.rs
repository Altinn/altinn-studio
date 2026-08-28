//! Linux Sandbox configuration for mediated Claude Code authentication.

use std::io::Cursor;

use sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::Error;

use super::super::ACCESS_PLACEHOLDER;

pub(super) async fn configure(sandbox: &SandboxHandle, home: &str, instructions: Option<&[u8]>) -> Result<(), Error> {
    let config = format!("{home}/.claude");
    let hooks_path = format!("{config}/hooks");
    let credentials_path = format!("{config}/.credentials.json");
    let hook_path = format!("{config}/hooks/session-start.mjs");
    let settings_path = format!("{config}/agent-settings.json");
    let instructions_path = format!("{config}/CLAUDE.md");
    run_checked(sandbox, "/usr/bin/mkdir", ["-p", hooks_path.as_str()]).await?;
    let credentials = serde_json::to_vec(&serde_json::json!({
        "claudeAiOauth": {
            "accessToken": ACCESS_PLACEHOLDER,
            "refreshToken": "agent-mediated-refresh-placeholder-not-a-real-credential",
            "expiresAt": 4_102_444_800_000_i64,
            "refreshTokenExpiresAt": 4_102_444_800_000_i64,
            "scopes": ["user:inference"]
        }
    }))?;
    sandbox
        .write_file(
            &SandboxPath::new(credentials_path.clone()),
            Box::pin(Cursor::new(credentials)),
        )
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
    // HACK: the mediated setup token is inference-only, so Claude Code cannot read the account's
    // plan entitlement and gates Fable 5 behind a usage-credits prompt. Declaring the subscription
    // type and rate-limit tier in the settings env satisfies the client-side plan-inclusion check
    // (the literal "max" tier is what the check looks for, regardless of the real plan); the server
    // still authorizes inference independently. Both are required — the type alone unblocks Max
    // models but not Fable. Remove when github.com/anthropics/claude-code#79360 ships.
    let settings = serde_json::to_vec(&serde_json::json!({
        "env": {
            "CLAUDE_CODE_SUBSCRIPTION_TYPE": "max",
            "CLAUDE_CODE_RATE_LIMIT_TIER": "default_claude_max_5x"
        },
        "hooks": {
            "SessionStart": [{
                "matcher": "startup|resume|clear|compact",
                "hooks": [{ "type": "command", "command": format!("node {hook_path}") }]
            }]
        }
    }))?;
    sandbox
        .write_file(
            &SandboxPath::new(settings_path.clone()),
            Box::pin(Cursor::new(settings)),
        )
        .await?;
    // Runtime file transfer writes as the Sandbox supervisor (root), while
    // executions run as the image user. Correct only the directories and files
    // managed above: recursive ownership walks would traverse the growing
    // harness state tree on every reconciliation pass.
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "/usr/bin/chown",
            "agent:agent",
            config.as_str(),
            hooks_path.as_str(),
            credentials_path.as_str(),
            hook_path.as_str(),
            settings_path.as_str(),
        ],
    )
    .await?;
    run_checked(sandbox, "/usr/bin/chmod", ["600", credentials_path.as_str()]).await?;
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
