//! Linux Sandbox configuration for mediated Claude Code authentication.

use std::io::Cursor;

use sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::Error;

use super::super::ACCESS_PLACEHOLDER;

/// Session-start hook installed into the Agent-owned Claude configuration.
///
/// It reports the harness-native session ID for the current launch to the
/// platform hook endpoint, authenticated by the per-launch token from the
/// Session environment. It never writes to stdout (`SessionStart` hook stdout
/// becomes model context) and always exits successfully.
const SESSION_START_HOOK: &str = r#"const url = process.env.AGENT_SESSION_HOOK_URL;
const token = process.env.AGENT_SESSION_TOKEN;
const sessionId = process.env.AGENT_SESSION_ID;

async function read(stream) {
  let data = "";
  stream.setEncoding("utf8");
  for await (const chunk of stream) {
    data += chunk;
    if (data.length > 1048576) return null;
  }
  return data;
}

const raw = await read(process.stdin);
if (!url || !token || !sessionId || raw === null) process.exit(0);
let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}
if (input.hook_event_name !== "SessionStart") process.exit(0);
if (typeof input.session_id !== "string" || input.session_id === "") process.exit(0);
if (input.agent_id) process.exit(0);

const body = JSON.stringify({
  sessionId,
  nativeSessionId: input.session_id,
  source: typeof input.source === "string" ? input.source : "",
  paneId: process.env.TMUX_PANE ?? "",
});
// SessionStart hooks block the harness until they exit. Retry transient
// failures, but keep all attempts inside one strict total budget.
const deadline = Date.now() + 1500;
for (let attempt = 0; attempt < 3; attempt += 1) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) break;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body,
      signal: AbortSignal.timeout(Math.min(450, remaining)),
    });
    if (response.ok) break;
  } catch {}
  if (attempt < 2) {
    const pause = Math.min(75, deadline - Date.now());
    if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
  }
}
process.exit(0);
"#;

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
            Box::pin(Cursor::new(SESSION_START_HOOK.as_bytes().to_vec())),
        )
        .await?;
    let settings = serde_json::to_vec(&serde_json::json!({
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

#[cfg(test)]
mod tests {
    #[test]
    fn session_start_hook_retries_within_one_total_budget() {
        assert!(super::SESSION_START_HOOK.contains("const deadline = Date.now() + 1500;"));
        assert!(super::SESSION_START_HOOK.contains("for (let attempt = 0; attempt < 3; attempt += 1)"));
        assert!(super::SESSION_START_HOOK.contains("Math.min(450, remaining)"));
    }
}
