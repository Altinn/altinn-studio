//! Linux Sandbox configuration for mediated Claude Code authentication.

use sandbox::SandboxHandle;

use crate::{
    Error,
    sandbox::platform::{files::write_if_changed, run_checked},
};

use super::super::ACCESS_PLACEHOLDER;

pub(super) async fn configure(
    sandbox: &SandboxHandle,
    home: &str,
    instructions: Option<&[u8]>,
    skills: &[crate::harness::Skill],
) -> Result<(), Error> {
    let skills_path = format!("{home}/.claude/skills");
    let config = format!("{home}/.claude");
    let hooks_path = format!("{config}/hooks");
    let credentials_path = format!("{config}/.credentials.json");
    let hook_path = format!("{config}/hooks/activity-hook.mjs");
    let settings_path = format!("{config}/agent-settings.json");
    let status_line_path = format!("{config}/status-line.mjs");
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
    write_if_changed(sandbox, &credentials_path, &credentials).await?;
    if let Some(instructions) = instructions {
        write_if_changed(sandbox, &instructions_path, instructions).await?;
    }
    write_if_changed(sandbox, &hook_path, super::super::hooks::script()?.as_bytes()).await?;
    write_if_changed(sandbox, &status_line_path, super::super::status_line::script()).await?;
    // HACK: the mediated setup token is inference-only, so Claude Code cannot read the account's
    // plan entitlement and gates Fable behind a usage-credits prompt. Declaring the subscription
    // type and rate-limit tier in the settings env satisfies the client-side plan-inclusion check
    // (the literal "max" tier is what the check looks for, regardless of the real plan); the server
    // still authorizes inference independently. Both are required — the type alone unblocks Max
    // models but not Fable. Remove when github.com/anthropics/claude-code#79360 ships.
    let settings = serde_json::to_vec(&serde_json::json!({
        "env": {
            "CLAUDE_CODE_SUBSCRIPTION_TYPE": "max",
            "CLAUDE_CODE_RATE_LIMIT_TIER": "default_claude_max_5x"
        },
        "hooks": super::super::hooks::configuration(&hook_path),
        "statusLine": super::super::status_line::configuration(&status_line_path)
    }))?;
    write_if_changed(sandbox, &settings_path, &settings).await?;
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
            status_line_path.as_str(),
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
    crate::harness::skills::install_linux(sandbox, &skills_path, skills).await
}
