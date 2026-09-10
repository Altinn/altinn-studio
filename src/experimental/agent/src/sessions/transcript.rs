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
