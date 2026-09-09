//! Claude Code's hook events and what each one tells the platform.

use crate::{harness::hook_script::HookScript, sessions::ActivityEvent};

/// Every Claude Code hook event the platform folds. `SessionStart` also carries
/// the native session ID and transcript location; the rest are activity signals
/// that keep a working Session from looking idle and let an orchestrator wait.
const EVENTS: &[(&str, ActivityEvent)] = &[
    ("SessionStart", ActivityEvent::SessionStart),
    ("UserPromptSubmit", ActivityEvent::TurnStarted),
    ("PreToolUse", ActivityEvent::ToolStarted),
    ("PostToolUse", ActivityEvent::ToolFinished),
    ("PostToolUseFailure", ActivityEvent::ToolFinished),
    ("Stop", ActivityEvent::TurnCompleted),
    ("PermissionRequest", ActivityEvent::WaitingForInput),
    ("Notification", ActivityEvent::WaitingForInput),
];

/// `Notification` types that mean Claude Code is blocked on the operator;
/// authentication and dialog notifications carry no activity signal.
const WAITING_NOTIFICATIONS: &[&str] = &["permission_prompt", "idle_prompt"];

/// `SessionStart` sources that begin a conversation the platform tracks.
const SESSION_START_MATCHER: &str = "startup|resume|clear|compact";

const SCRIPT: HookScript<'static> = HookScript {
    events: EVENTS,
    waiting_notifications: WAITING_NOTIFICATIONS,
};

/// Renders Claude Code's activity hook script.
///
/// # Errors
///
/// Returns an error when the event table cannot be encoded.
pub(super) fn script() -> Result<String, serde_json::Error> {
    SCRIPT.render()
}

/// The `hooks` value of Claude Code's settings, registering the script for
/// exactly the events in the table.
pub(super) fn configuration(hook_path: &str) -> serde_json::Value {
    let command = serde_json::json!({ "type": "command", "command": format!("node {hook_path}") });
    let hooks = SCRIPT
        .event_names()
        .map(|event| {
            let mut entry = serde_json::json!({ "hooks": [command] });
            if event == "SessionStart" {
                entry["matcher"] = SESSION_START_MATCHER.into();
            }
            (event.to_owned(), serde_json::Value::Array(vec![entry]))
        })
        .collect::<serde_json::Map<_, _>>();
    serde_json::Value::Object(hooks)
}

#[cfg(test)]
mod tests {
    use super::{EVENTS, configuration, script};
    use crate::harness::hook_script::embedded_events;

    #[test]
    fn the_script_embeds_the_table_and_the_configuration_registers_it() {
        let script = script().expect("script renders");
        let embedded = embedded_events(&script);
        assert_eq!(embedded.len(), EVENTS.len());
        for (name, event) in EVENTS {
            assert!(embedded.iter().any(|(n, e)| n == name && e == event), "{name}");
        }
        assert!(script.contains(r#"const WAITING_NOTIFICATIONS = ["permission_prompt","idle_prompt"];"#));

        let configuration = configuration("/home/agent/.claude/hooks/activity-hook.mjs");
        let registered = configuration.as_object().expect("hooks object");
        assert_eq!(registered.len(), EVENTS.len());
        for (name, _) in EVENTS {
            let entry = &registered[*name][0];
            assert_eq!(
                entry["hooks"][0]["command"],
                "node /home/agent/.claude/hooks/activity-hook.mjs"
            );
            assert_eq!(entry.get("matcher").is_some(), *name == "SessionStart");
        }
    }
}
