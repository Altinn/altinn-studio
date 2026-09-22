//! Claude Code status-line configuration for managed Agent Sessions.

pub(super) fn script() -> &'static [u8] {
    include_bytes!("status_line.mjs")
}

pub(super) fn configuration(script_path: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "command",
        "command": format!("node {script_path}")
    })
}
