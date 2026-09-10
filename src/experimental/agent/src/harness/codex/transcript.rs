//! Parsing the Codex rollout JSONL into runtime-neutral turns.
//!
//! A rollout records `event_msg` lines that delimit turns (`task_started`,
//! `task_complete`, `turn_aborted`) and `response_item` lines with the model
//! conversation. Codex injects context as `user`-role messages ahead of the
//! operator's prompt (AGENTS.md, environment details), so a user message is
//! never a turn boundary here: the turn markers are, and within a turn the last
//! user message before the model's first output is the operator's prompt.

use std::collections::HashMap;

use serde_json::Value;

use crate::{
    Error,
    sessions::{Message, Part, Role, Turn},
};

/// Codex prefixes a bundled context-and-request user message with this marker.
const REQUEST_MARKER: &str = "## My request for Codex:";

// Codex 0.153 keeps success as internal metadata. Command results persist their
// exit code in the tool's output header instead (core/src/tools/{mod,context}.rs).
// Inspect only recognized command headers, never arbitrary command stdout.
fn command_failed(name: &str, output: Option<&Value>) -> bool {
    let Some(output) = output.and_then(|output| {
        output
            .as_str()
            .or_else(|| output.as_array()?.first()?.get("text")?.as_str())
    }) else {
        return false;
    };
    let prefix = match name {
        "shell" | "shell_command" => "Exit code: ",
        "exec_command" | "write_stdin" => "Process exited with code ",
        _ => return false,
    };
    output
        .lines()
        .take_while(|line| *line != "Output:")
        .filter_map(|line| line.strip_prefix(prefix))
        .filter_map(|code| code.parse::<i32>().ok())
        .any(|code| code != 0)
}

/// Parses Codex rollout JSONL into ordered turns.
///
/// # Errors
///
/// Returns an error when the transcript is not UTF-8. Lines that are not JSON
/// objects are skipped, so a partially written trailing line never fails a read.
pub(crate) fn parse(bytes: &[u8]) -> Result<Vec<Turn>, Error> {
    let text =
        std::str::from_utf8(bytes).map_err(|error| Error::Session(format!("transcript is not UTF-8: {error}")))?;
    let mut builder = Builder::default();
    for line in text.lines().map(str::trim).filter(|line| !line.is_empty()) {
        if let Ok(entry) = serde_json::from_str::<Value>(line) {
            builder.push(&entry);
        }
    }
    Ok(builder.finish())
}

#[derive(Default)]
struct Builder {
    turns: Vec<Turn>,
    /// Candidate prompt: the latest user message seen before the model's first
    /// output in the current turn. Earlier candidates were injected context.
    pending_prompt: Option<String>,
    /// Whether the current turn has recorded model output yet.
    answered: bool,
    /// Location of each recorded tool call by `call_id`.
    tool_calls: HashMap<String, (usize, usize, usize)>,
}

impl Builder {
    fn push(&mut self, entry: &Value) {
        let Some(payload) = entry.get("payload") else {
            return;
        };
        match entry.get("type").and_then(Value::as_str) {
            Some("event_msg") => match payload.get("type").and_then(Value::as_str) {
                Some("task_started" | "turn_started") => self.start_turn(),
                Some("task_complete" | "turn_complete" | "turn_aborted") => self.flush_prompt(),
                Some("patch_apply_end") => {
                    if payload.get("success").and_then(Value::as_bool) == Some(false) {
                        self.mark_tool_failed(payload);
                    }
                }
                Some("mcp_tool_call_end")
                    if payload.pointer("/result/Err").is_some()
                        || payload.pointer("/result/Ok/isError").and_then(Value::as_bool) == Some(true) =>
                {
                    self.mark_tool_failed(payload);
                }
                _ => {}
            },
            Some("response_item") => self.push_item(payload),
            _ => {}
        }
    }

    fn start_turn(&mut self) {
        self.flush_prompt();
        if self.turns.last().is_none_or(|turn| !turn.messages.is_empty()) {
            self.turns.push(Turn::default());
        }
        self.answered = false;
    }

    fn push_item(&mut self, payload: &Value) {
        match payload.get("type").and_then(Value::as_str) {
            Some("message") => {
                let text = payload
                    .get("content")
                    .and_then(Value::as_array)
                    .map(|parts| {
                        parts
                            .iter()
                            .filter_map(|part| part.get("text").and_then(Value::as_str))
                            .collect::<String>()
                    })
                    .unwrap_or_default();
                match payload.get("role").and_then(Value::as_str) {
                    Some("user") => self.push_user(text),
                    Some("assistant") if !text.is_empty() => {
                        self.push_output(Message {
                            role: Role::Assistant,
                            parts: vec![Part::Text { text }],
                        });
                    }
                    // Developer and system messages are harness context, not conversation.
                    _ => {}
                }
            }
            Some("function_call" | "custom_tool_call") => {
                let Some(name) = payload.get("name").and_then(Value::as_str) else {
                    return;
                };
                let location = self.push_output(Message {
                    role: Role::Assistant,
                    parts: vec![Part::ToolCall {
                        name: name.to_owned(),
                        failed: false,
                    }],
                });
                if let Some(call_id) = payload.get("call_id").and_then(Value::as_str) {
                    self.tool_calls.insert(call_id.to_owned(), location);
                }
            }
            Some("function_call_output" | "custom_tool_call_output") => {
                if let Some(Part::ToolCall { name, failed }) = self.tool_part(payload) {
                    *failed |= command_failed(name, payload.get("output"));
                }
            }
            _ => {}
        }
    }

    fn tool_part(&mut self, payload: &Value) -> Option<&mut Part> {
        let call_id = payload.get("call_id")?.as_str()?;
        let &(turn, message, part) = self.tool_calls.get(call_id)?;
        self.turns.get_mut(turn)?.messages.get_mut(message)?.parts.get_mut(part)
    }

    fn mark_tool_failed(&mut self, payload: &Value) {
        if let Some(Part::ToolCall { failed, .. }) = self.tool_part(payload) {
            *failed = true;
        }
    }

    fn push_user(&mut self, text: String) {
        let request = text
            .strip_prefix("<environment_context>")
            .and_then(|context| context.split_once("</environment_context>"))
            .and_then(|(_, suffix)| suffix.trim_start().strip_prefix(REQUEST_MARKER))
            .map(|request| request.trim().to_owned());
        let text = request.unwrap_or(text);
        if self.answered {
            // Operator input injected mid-turn (steering) is conversation.
            self.current_turn().messages.push(Message {
                role: Role::User,
                parts: vec![Part::Text { text }],
            });
        } else {
            self.pending_prompt = Some(text);
        }
    }

    fn push_output(&mut self, message: Message) -> (usize, usize, usize) {
        self.flush_prompt();
        self.answered = true;
        let turn_index = self.turns.len().saturating_sub(1);
        let turn = self.current_turn();
        turn.messages.push(message);
        let message_index = turn.messages.len() - 1;
        (turn_index, message_index, turn.messages[message_index].parts.len() - 1)
    }

    /// Commits the surviving prompt candidate as the turn's operator message.
    fn flush_prompt(&mut self) {
        if let Some(text) = self.pending_prompt.take() {
            self.current_turn().messages.push(Message {
                role: Role::User,
                parts: vec![Part::Text { text }],
            });
        }
    }

    fn current_turn(&mut self) -> &mut Turn {
        if self.turns.is_empty() {
            self.turns.push(Turn::default());
        }
        let last = self.turns.len() - 1;
        &mut self.turns[last]
    }

    fn finish(mut self) -> Vec<Turn> {
        self.flush_prompt();
        self.turns.retain(|turn| !turn.messages.is_empty());
        self.turns
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = include_str!("../../../tests/fixtures/codex-rollout.jsonl");

    fn prompts(turns: &[Turn]) -> Vec<&str> {
        turns
            .iter()
            .map(|turn| match &turn.messages[0].parts[0] {
                Part::Text { text } => text.as_str(),
                Part::ToolCall { .. } => panic!("a turn starts with the prompt"),
            })
            .collect()
    }

    #[test]
    fn recorded_rollout_yields_operator_turns_and_drops_injected_context() {
        let turns = parse(FIXTURE.as_bytes()).expect("parse");
        assert_eq!(
            prompts(&turns),
            ["Measure the desk and draw it.", "Make the top bar slimmer."]
        );
        assert!(
            turns
                .iter()
                .flat_map(|turn| &turn.messages)
                .flat_map(|message| &message.parts)
                .all(|part| !matches!(part, Part::Text { text } if text.contains("AGENTS.md"))),
            "AGENTS.md context is not conversation"
        );
    }

    #[test]
    fn tool_calls_failures_and_final_message_are_recorded() {
        let turns = parse(FIXTURE.as_bytes()).expect("parse");
        let first = &turns[0];
        let tools = first
            .messages
            .iter()
            .flat_map(|message| &message.parts)
            .filter_map(|part| match part {
                Part::ToolCall { name, failed } => Some((name.as_str(), *failed)),
                Part::Text { .. } => None,
            })
            .collect::<Vec<_>>();
        assert_eq!(tools, [("exec_command", false), ("shell", true)]);
        assert!(
            matches!(first.messages.last().and_then(|message| message.parts.last()), Some(Part::Text { text }) if text == "Drawn to scale.")
        );
    }

    #[test]
    fn failures_use_command_headers_and_native_patch_and_mcp_results() {
        for (name, output, event, expected) in [
            (
                "exec_command",
                "Chunk ID: abc\nWall time: 0.1 seconds\nProcess exited with code 2\nOutput:\nmissing file",
                serde_json::Value::Null,
                true,
            ),
            (
                "exec_command",
                "Chunk ID: abc\nWall time: 0.1 seconds\nProcess exited with code 0\nOutput:\nProcess exited with code 2",
                serde_json::Value::Null,
                false,
            ),
            (
                "exec_command",
                "Chunk ID: abc\nWall time: 0.1 seconds\nProcess running with session ID 123\nOutput:\n",
                serde_json::Value::Null,
                false,
            ),
            (
                "apply_patch",
                "",
                serde_json::json!({"type":"patch_apply_end", "call_id":"c", "success":false, "status":"failed"}),
                true,
            ),
            (
                "mcp__example__read",
                "",
                serde_json::json!({"type":"mcp_tool_call_end", "call_id":"c", "result":{"Err":"connection closed"}}),
                true,
            ),
            (
                "mcp__example__read",
                "",
                serde_json::json!({"type":"mcp_tool_call_end", "call_id":"c", "result":{"Ok":{"content":[], "isError":true}}}),
                true,
            ),
        ] {
            let lines = [
                serde_json::json!({"type":"response_item", "payload":{"type":"function_call", "call_id":"c", "name":name}}),
                serde_json::json!({"type":"response_item", "payload":{"type":"function_call_output", "call_id":"c", "output":output}}),
                serde_json::json!({"type":"event_msg", "payload":event}),
            ];
            let transcript = lines.iter().map(ToString::to_string).collect::<Vec<_>>().join("\n");
            let turns = parse(transcript.as_bytes()).expect("parse");
            assert!(
                matches!(&turns[0].messages[0].parts[0], Part::ToolCall { failed, .. } if *failed == expected),
                "{name}: {transcript}"
            );
        }
    }

    #[test]
    fn a_bundled_request_keeps_only_the_operator_text() {
        let jsonl = concat!(
            r#"{"type":"event_msg","payload":{"type":"task_started"}}"#,
            "\n",
            r#"{"type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"<environment_context>x</environment_context>\n\n## My request for Codex:\nhello"}]}}"#,
            "\n",
            r#"{"type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"hi"}]}}"#,
            "\n",
            r#"{"type":"event_msg","payload":{"type":"task_complete"}}"#,
            "\n",
        );
        let turns = parse(jsonl.as_bytes()).expect("parse");
        assert_eq!(prompts(&turns), ["hello"]);
        assert!(
            matches!(turns[0].messages.last().and_then(|message| message.parts.last()), Some(Part::Text { text }) if text == "hi")
        );
    }

    #[test]
    fn an_aborted_turn_closes_and_the_next_prompt_starts_a_new_one() {
        let jsonl = concat!(
            r#"{"type":"event_msg","payload":{"type":"task_started"}}"#,
            "\n",
            r#"{"type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"first"}]}}"#,
            "\n",
            r#"{"type":"event_msg","payload":{"type":"turn_aborted"}}"#,
            "\n",
            r#"{"type":"event_msg","payload":{"type":"task_started"}}"#,
            "\n",
            r#"{"type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"second"}]}}"#,
            "\n",
        );
        let turns = parse(jsonl.as_bytes()).expect("parse");
        assert_eq!(prompts(&turns), ["first", "second"]);
    }
}

#[cfg(test)]
mod input_preservation_tests {
    #[test]
    fn a_literal_request_heading_does_not_truncate_operator_input() {
        let prompt = "Explain this heading: ## My request for Codex: keep all of this";
        let record = serde_json::json!({"type":"response_item", "payload":{"type":"message", "role":"user", "content":[{"type":"input_text", "text":prompt}]}});
        let turns = super::parse(record.to_string().as_bytes()).expect("parse");
        assert_eq!(
            turns[0].messages[0].parts[0],
            crate::sessions::Part::Text { text: prompt.into() }
        );
    }
}
