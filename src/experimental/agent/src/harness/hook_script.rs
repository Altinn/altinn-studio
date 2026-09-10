//! Renderer for the harness activity report hook.
//!
//! Both supported harnesses run hook commands with a JSON description of the
//! event on stdin, so one script shape serves both. Everything harness-specific
//! (which `hook_event_name`s exist, what each one means to the platform, which
//! notification types matter) is a table the adapter owns and hands to
//! [`HookScript::render`]; this module knows only the wire contract with the
//! Platform API.

use crate::sessions::ActivityEvent;

/// The harness-specific table an activity hook script is rendered from.
pub(super) struct HookScript<'a> {
    /// Harness hook event names and the platform signal each one carries.
    pub(super) events: &'a [(&'a str, ActivityEvent)],
    /// `Notification` types that mean the harness is blocked on the operator;
    /// other notifications carry no signal. Empty when the harness has no
    /// notification hook.
    pub(super) waiting_notifications: &'a [&'a str],
}

const TEMPLATE: &str = r#"import { randomUUID } from "node:crypto";

const url = process.env.AGENT_SESSION_HOOK_URL;
const token = process.env.AGENT_SESSION_TOKEN;
const sessionId = process.env.AGENT_SESSION_ID;

// Harness hook event -> platform activity signal. Rendered from the adapter's
// table; events not listed carry no signal and are ignored.
const EVENTS = __EVENTS__;
const WAITING_NOTIFICATIONS = __WAITING_NOTIFICATIONS__;

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
const event = EVENTS[input.hook_event_name];
if (!event) process.exit(0);
// A nested Agent's own reports carry an agent_id; never forward those.
if (input.agent_id) process.exit(0);
// Only notifications that block on the operator are activity.
if (
  input.hook_event_name === "Notification" &&
  typeof input.notification_type === "string" &&
  !WAITING_NOTIFICATIONS.includes(input.notification_type)
) {
  process.exit(0);
}

const body = { sessionId, eventId: randomUUID(), event, source: typeof input.source === "string" ? input.source : "" };
if (event === "sessionStart") {
  if (typeof input.session_id !== "string" || input.session_id === "") process.exit(0);
  body.nativeSessionId = input.session_id;
  if (typeof input.transcript_path === "string" && input.transcript_path !== "") {
    body.transcriptPath = input.transcript_path;
  }
}
const payload = JSON.stringify(body);

// Start and terminal reports unblock callers, so they retry within a strict budget.
// The payload keeps the same event ID across retries, including a lost response.
// Frequent per-tool events use one short best-effort attempt so hook latency
// never dominates a turn.
const retryable = ["sessionStart", "turnCompleted", "waitingForInput"].includes(event);
const attempts = retryable ? 3 : 1;
const budget = retryable ? 1500 : 300;
const perAttempt = retryable ? 450 : 250;
const deadline = Date.now() + budget;
for (let attempt = 0; attempt < attempts; attempt += 1) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) break;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: payload,
      signal: AbortSignal.timeout(Math.min(perAttempt, remaining)),
    });
    if (response.ok) break;
  } catch {}
  if (attempt < attempts - 1) {
    const pause = Math.min(75, deadline - Date.now());
    if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
  }
}
process.exit(0);
"#;

impl HookScript<'_> {
    /// Renders the hook script with the adapter's tables embedded.
    ///
    /// # Errors
    ///
    /// Returns an error when the tables cannot be encoded as JSON.
    pub(super) fn render(&self) -> Result<String, serde_json::Error> {
        let events = self
            .events
            .iter()
            .map(|(name, event)| Ok(((*name).to_owned(), serde_json::to_value(event)?)))
            .collect::<Result<serde_json::Map<_, _>, serde_json::Error>>()?;
        let events = serde_json::to_string(&serde_json::Value::Object(events))?;
        let waiting = serde_json::to_string(self.waiting_notifications)?;
        Ok(TEMPLATE
            .replace("__EVENTS__", &events)
            .replace("__WAITING_NOTIFICATIONS__", &waiting))
    }

    /// Hook event names the adapter registers: exactly the table's keys.
    pub(super) fn event_names(&self) -> impl Iterator<Item = &str> {
        self.events.iter().map(|(name, _)| *name)
    }
}

/// Parses the event table back out of a rendered script, in the wire format
/// the Platform API reads; adapters use it to prove their table round-trips.
#[cfg(test)]
pub(super) fn embedded_events(script: &str) -> Vec<(String, ActivityEvent)> {
    let start = script.find("const EVENTS = ").expect("table") + "const EVENTS = ".len();
    let end = script[start..].find(";\n").expect("terminator") + start;
    let table: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&script[start..end]).expect("embedded JSON");
    table
        .into_iter()
        .map(|(name, value)| (name, serde_json::from_value(value).expect("wire value parses")))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{HookScript, embedded_events};
    use crate::sessions::ActivityEvent;

    #[test]
    fn renders_the_given_tables_verbatim() {
        let script = HookScript {
            events: &[
                ("Begin", ActivityEvent::TurnStarted),
                ("End", ActivityEvent::TurnCompleted),
            ],
            waiting_notifications: &["ask"],
        }
        .render()
        .expect("script renders");
        assert_eq!(
            embedded_events(&script),
            [
                ("Begin".to_owned(), ActivityEvent::TurnStarted),
                ("End".to_owned(), ActivityEvent::TurnCompleted),
            ]
        );
        assert!(script.contains(r#"const WAITING_NOTIFICATIONS = ["ask"];"#));
        assert!(!script.contains("__EVENTS__"));
    }

    #[test]
    fn session_start_carries_identity_and_retries_within_one_budget() {
        let script = HookScript {
            events: &[("SessionStart", ActivityEvent::SessionStart)],
            waiting_notifications: &[],
        }
        .render()
        .expect("script renders");
        assert!(script.contains("body.nativeSessionId = input.session_id;"));
        assert!(script.contains("body.transcriptPath = input.transcript_path;"));
        assert!(script.contains("retryable ? 3 : 1"));
        assert!(script.contains("retryable ? 1500 : 300"));
    }
}
