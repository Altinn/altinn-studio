//! Parsing the Claude Code JSONL transcript into runtime-neutral turns.
//!
//! Claude Code appends one JSON object per line. An operator prompt is a
//! `user` entry whose `message.content` is a string; tool results are `user`
//! entries with a `tool_result` block array; each assistant content block is
//! its own `assistant` entry sharing one `message.id`. The file also records
//! entries that are not conversation: subagent side chains, meta entries,
//! compaction summaries and text the client injects on the user's behalf
//! (slash-command echoes, background task notifications, system reminders).
//! Input the operator sends while a turn is running is not a `user` entry at
//! all: it is an `attachment` of type `queued_command` absorbed into the turn.

use std::collections::HashMap;

use serde_json::Value;

use crate::{
    Error,
    sessions::{Message, Part, Role, Turn},
};

/// Parses Claude Code JSONL into ordered turns.
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
    Ok(builder.turns)
}

#[derive(Default)]
struct Builder {
    turns: Vec<Turn>,
    /// Location of each recorded tool call by Claude's `tool_use` ID, so a
    /// later `tool_result` can mark it failed.
    tool_calls: HashMap<String, (usize, usize, usize)>,
    /// `message.id` of the assistant message the last assistant entry belongs
    /// to; consecutive entries with the same ID are one message.
    assistant_message: Option<String>,
}

impl Builder {
    fn push(&mut self, entry: &Value) {
        if flag(entry, "isSidechain") || flag(entry, "isMeta") || flag(entry, "isCompactSummary") {
            return;
        }
        match entry.get("type").and_then(Value::as_str) {
            Some("user") => {
                if let Some(message) = entry.get("message") {
                    self.push_user(message);
                }
            }
            Some("assistant") => {
                if let Some(message) = entry.get("message") {
                    self.push_assistant(message);
                }
            }
            Some("attachment") => {
                if let Some(attachment) = entry.get("attachment") {
                    self.push_attachment(attachment);
                }
            }
            _ => {}
        }
    }

    /// Operator input absorbed into the running turn joins that turn as a user
    /// message; other attachments (environment, reminders) are not conversation.
    fn push_attachment(&mut self, attachment: &Value) {
        if attachment.get("type").and_then(Value::as_str) != Some("queued_command")
            || attachment
                .get("origin")
                .and_then(|origin| origin.get("kind"))
                .and_then(Value::as_str)
                != Some("human")
        {
            return;
        }
        let Some(prompt) = attachment.get("prompt").and_then(Value::as_str) else {
            return;
        };
        self.assistant_message = None;
        self.current_turn().messages.push(Message {
            role: Role::User,
            parts: vec![Part::Text {
                text: prompt.to_owned(),
            }],
        });
    }

    fn current_turn(&mut self) -> &mut Turn {
        if self.turns.is_empty() {
            self.turns.push(Turn::default());
        }
        let last = self.turns.len() - 1;
        &mut self.turns[last]
    }

    fn push_user(&mut self, message: &Value) {
        match message.get("content") {
            Some(Value::String(text)) => self.push_prompt(text),
            Some(Value::Array(blocks)) => {
                let mut prompt = String::new();
                for block in blocks {
                    match block.get("type").and_then(Value::as_str) {
                        Some("tool_result") => self.record_tool_result(block),
                        Some("text") => {
                            if let Some(text) = block.get("text").and_then(Value::as_str) {
                                prompt.push_str(text);
                            }
                        }
                        _ => {}
                    }
                }
                if !prompt.is_empty() {
                    self.push_prompt(&prompt);
                }
            }
            _ => {}
        }
    }

    /// Starts a turn on an operator prompt; injected client text is not one.
    fn push_prompt(&mut self, text: &str) {
        if is_injected(text) {
            return;
        }
        self.assistant_message = None;
        self.turns.push(Turn {
            messages: vec![Message {
                role: Role::User,
                parts: vec![Part::Text { text: text.to_owned() }],
            }],
        });
    }

    fn record_tool_result(&mut self, block: &Value) {
        if block.get("is_error").and_then(Value::as_bool) != Some(true) {
            return;
        }
        let Some(id) = block.get("tool_use_id").and_then(Value::as_str) else {
            return;
        };
        if let Some(&(turn, message, part)) = self.tool_calls.get(id)
            && let Some(Part::ToolCall { failed, .. }) = self
                .turns
                .get_mut(turn)
                .and_then(|turn| turn.messages.get_mut(message))
                .and_then(|message| message.parts.get_mut(part))
        {
            *failed = true;
        }
    }

    fn push_assistant(&mut self, message: &Value) {
        let Some(blocks) = message.get("content").and_then(Value::as_array) else {
            return;
        };
        let id = message.get("id").and_then(Value::as_str);
        for block in blocks {
            match block.get("type").and_then(Value::as_str) {
                Some("text") => {
                    if let Some(text) = block.get("text").and_then(Value::as_str) {
                        self.append_assistant_part(id, Part::Text { text: text.to_owned() });
                    }
                }
                Some("tool_use") => {
                    if let Some(name) = block.get("name").and_then(Value::as_str) {
                        let location = self.append_assistant_part(
                            id,
                            Part::ToolCall {
                                name: name.to_owned(),
                                failed: false,
                            },
                        );
                        if let Some(tool_use) = block.get("id").and_then(Value::as_str) {
                            self.tool_calls.insert(tool_use.to_owned(), location);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    /// Appends a part to the current assistant message, opening a new message
    /// when the entry belongs to a different API response, and a new turn when
    /// the transcript starts mid-conversation.
    fn append_assistant_part(&mut self, id: Option<&str>, part: Part) -> (usize, usize, usize) {
        if self.turns.is_empty() {
            self.turns.push(Turn::default());
        }
        let turn_index = self.turns.len() - 1;
        let turn = &mut self.turns[turn_index];
        let continues = id.is_some() && id == self.assistant_message.as_deref();
        if !continues || turn.messages.last().is_none_or(|last| last.role != Role::Assistant) {
            turn.messages.push(Message {
                role: Role::Assistant,
                parts: Vec::new(),
            });
            self.assistant_message = id.map(str::to_owned);
        }
        let message_index = turn.messages.len() - 1;
        let message = &mut turn.messages[message_index];
        message.parts.push(part);
        (turn_index, message_index, message.parts.len() - 1)
    }
}

fn flag(entry: &Value, name: &str) -> bool {
    entry.get(name).and_then(Value::as_bool) == Some(true)
}

/// Recognizes the harness's local-command and notification envelopes. Ordinary
/// XML is operator input; explicitly human queued attachments bypass this filter.
fn is_injected(text: &str) -> bool {
    let trimmed = text.trim();
    [
        "command-name",
        "local-command-stdout",
        "local-command-stderr",
        "task-notification",
        "system-reminder",
    ]
    .iter()
    .any(|tag| trimmed.starts_with(&format!("<{tag}>")) && trimmed.contains(&format!("</{tag}>")))
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = include_str!("../../../tests/fixtures/claude-code-transcript.jsonl");

    #[test]
    fn recorded_transcript_yields_operator_turns_only() {
        let turns = parse(FIXTURE.as_bytes()).expect("parse");
        let prompts = turns
            .iter()
            .map(|turn| match &turn.messages[0].parts[0] {
                Part::Text { text } => text.as_str(),
                Part::ToolCall { .. } => panic!("a turn starts with the prompt"),
            })
            .collect::<Vec<_>>();
        assert_eq!(prompts, ["Rename the helper and run the tests.", "Now commit it."]);
    }

    #[test]
    fn input_absorbed_mid_turn_joins_the_running_turn() {
        let turns = parse(FIXTURE.as_bytes()).expect("parse");
        let second = &turns[1];
        let users = second
            .messages
            .iter()
            .filter(|message| message.role == Role::User)
            .map(|message| match &message.parts[0] {
                Part::Text { text } => text.as_str(),
                Part::ToolCall { .. } => panic!("user text"),
            })
            .collect::<Vec<_>>();
        assert_eq!(users, ["Now commit it.", "Use a conventional commit message."]);
        assert_eq!(turns.len(), 2, "absorbed input does not start a turn");
    }

    #[test]
    fn tool_results_mark_failures_and_the_final_message_follows_the_last_tool_call() {
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
        assert_eq!(tools, [("Edit", false), ("Bash", true), ("Bash", false)]);
        assert!(
            matches!(first.messages.last().and_then(|message| message.parts.last()), Some(Part::Text { text }) if text == "Renamed and the tests pass.")
        );
    }

    #[test]
    fn assistant_blocks_of_one_response_form_one_message() {
        let turns = parse(FIXTURE.as_bytes()).expect("parse");
        let assistant_messages = turns[0]
            .messages
            .iter()
            .filter(|message| message.role == Role::Assistant)
            .count();
        // Response 1: commentary + Edit; response 2: Bash; response 3: Bash; response 4: answer.
        assert_eq!(assistant_messages, 4);
        assert_eq!(turns[0].messages[1].parts.len(), 2);
    }

    #[test]
    fn injected_markup_is_not_a_prompt() {
        for injected in [
            "<command-name>/clear</command-name>\n<command-message>clear</command-message>",
            "<task-notification>\n<task-id>x</task-id>\n</task-notification>",
            "<system-reminder>\nnote\n</system-reminder>",
        ] {
            assert!(is_injected(injected), "{injected}");
        }
        assert!(!is_injected("<div>hi"));
        assert!(!is_injected("Compare <a> and <b>"));
        assert!(!is_injected("plain prompt"));
    }
}

#[cfg(test)]
mod input_preservation_tests {
    #[test]
    fn human_xml_prompts_survive_normal_and_queued_records() {
        let prompt = "<task>Reply exactly DONE</task>";
        let records = [
            serde_json::json!({"type":"user", "message":{"content":prompt}}),
            serde_json::json!({"type":"attachment", "attachment":{"type":"queued_command", "origin":{"kind":"human"}, "prompt":prompt}}),
        ];
        for record in records {
            let turns = super::parse(record.to_string().as_bytes()).expect("parse");
            assert_eq!(turns.len(), 1);
            assert_eq!(
                turns[0].messages[0].parts[0],
                crate::sessions::Part::Text { text: prompt.into() }
            );
        }
    }
}
