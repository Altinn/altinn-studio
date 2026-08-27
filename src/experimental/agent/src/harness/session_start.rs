//! Shared platform `SessionStart` report hook used by harness adapters.

/// Reports a harness-native session ID through the authenticated platform hook.
///
/// Both supported harnesses currently expose the fields used here with the
/// same names. The adapters remain responsible for installing the script in
/// their harness-specific hook configuration.
pub(super) const HOOK: &str = r#"const url = process.env.AGENT_SESSION_HOOK_URL;
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

#[cfg(test)]
mod tests {
    #[test]
    fn retries_within_one_total_budget() {
        assert!(super::HOOK.contains("const deadline = Date.now() + 1500;"));
        assert!(super::HOOK.contains("for (let attempt = 0; attempt < 3; attempt += 1)"));
        assert!(super::HOOK.contains("Math.min(450, remaining)"));
    }
}
