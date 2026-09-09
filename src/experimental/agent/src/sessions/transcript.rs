//! Runtime-neutral conversation turns read from a Session.

use serde::{Deserialize, Serialize};

/// One operator prompt and everything the harness produced in response.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Turn {
    /// Messages that make up the turn, in order.
    pub messages: Vec<Message>,
}

/// One message inside a [`Turn`].
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Message {
    /// Who authored the message.
    pub role: Role,
    /// Ordered content parts.
    pub parts: Vec<Part>,
}

/// Author of a [`Message`].
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Role {
    /// The operator (or an upstream orchestrator).
    User,
    /// The harness model.
    Assistant,
}

/// One content part of a [`Message`], shaped after AHP chat parts.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Part {
    /// Plain assistant or operator text.
    Text {
        /// The text content.
        text: String,
    },
    /// A tool invocation and, when known, whether it failed.
    ToolCall {
        /// Harness-native tool name.
        name: String,
        /// Whether the recorded result was an error.
        #[serde(default, skip_serializing_if = "std::ops::Not::not")]
        failed: bool,
    },
}

impl Turn {
    /// Returns the assistant's final message of the turn: the last assistant
    /// text with no tool call after it. Commentary written before a tool call
    /// is not the answer, and a turn whose last recorded part is still a tool
    /// call has not flushed its answer yet.
    #[must_use]
    pub fn final_assistant_message(&self) -> Option<&str> {
        let mut last = None;
        for message in &self.messages {
            if message.role != Role::Assistant {
                continue;
            }
            for part in &message.parts {
                match part {
                    Part::Text { text } => last = Some(text.as_str()),
                    Part::ToolCall { .. } => last = None,
                }
            }
        }
        last
    }
}

#[cfg(test)]
mod tests {
    use super::{Message, Part, Role, Turn};

    fn text(role: Role, text: &str) -> Message {
        Message {
            role,
            parts: vec![Part::Text { text: text.into() }],
        }
    }

    fn tool(name: &str) -> Message {
        Message {
            role: Role::Assistant,
            parts: vec![Part::ToolCall {
                name: name.into(),
                failed: false,
            }],
        }
    }

    #[test]
    fn final_message_is_the_last_assistant_text_not_followed_by_a_tool_call() {
        let turn = Turn {
            messages: vec![
                text(Role::User, "do it"),
                text(Role::Assistant, "Looking..."),
                tool("Bash"),
                text(Role::Assistant, "Done."),
            ],
        };
        assert_eq!(turn.final_assistant_message(), Some("Done."));
    }

    #[test]
    fn a_turn_ending_in_a_tool_call_has_no_final_message_yet() {
        let turn = Turn {
            messages: vec![
                text(Role::User, "do it"),
                text(Role::Assistant, "Looking..."),
                tool("Bash"),
            ],
        };
        assert_eq!(turn.final_assistant_message(), None);
        assert_eq!(Turn::default().final_assistant_message(), None);
    }
}
