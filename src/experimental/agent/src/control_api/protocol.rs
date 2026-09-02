use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufRead, AsyncBufReadExt as _};

/// Agent Control API version, independent of the JSON-RPC envelope.
pub const PROTOCOL_VERSION: &str = "v1";
pub(crate) const JSON_RPC_VERSION: &str = "2.0";

pub(crate) const METHOD_APPLY: &str = "agents.v1.apply";
pub(crate) const METHOD_HEALTH: &str = "control.v1.health";
pub(crate) const METHOD_GET: &str = "agents.v1.get";
pub(crate) const METHOD_LIST: &str = "agents.v1.list";
pub(crate) const METHOD_RESOLVE_DIRECTORY: &str = "agents.v1.resolveDirectory";
pub(crate) const METHOD_EXECUTION_ENSURE: &str = "agents.v1.ensureExecution";
pub(crate) const METHOD_DELETE: &str = "agents.v1.delete";
pub(crate) const METHOD_AUTH_LOGIN: &str = "authentication.v1.login";
pub(crate) const METHOD_SESSION_ENSURE: &str = "sessions.v1.ensure";
pub(crate) const METHOD_SESSION_GET: &str = "sessions.v1.get";
pub(crate) const METHOD_SESSION_LIST: &str = "sessions.v1.list";

pub(crate) const CODE_PARSE_ERROR: i32 = -32700;
pub(crate) const CODE_INVALID_REQUEST: i32 = -32600;
pub(crate) const CODE_METHOD_NOT_FOUND: i32 = -32601;
pub(crate) const CODE_INVALID_PARAMS: i32 = -32602;
pub(crate) const CODE_INTERNAL: i32 = -32603;
pub(crate) const CODE_AGENT_NOT_FOUND: i32 = -32004;
pub(crate) const CODE_IMMUTABLE: i32 = -32009;
pub(crate) const CODE_CALLER_NOT_PERMITTED: i32 = -32010;
pub(crate) const MESSAGE_CALLER_NOT_PERMITTED: &str = "operation not permitted for this caller";
pub(crate) const MAX_MESSAGE_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug)]
pub(crate) enum ReadMessage {
    EndOfStream,
    Complete(Vec<u8>),
    TooLarge,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Request {
    pub jsonrpc: String,
    pub method: String,
    #[serde(default)]
    pub params: serde_json::Value,
    pub id: u64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Response {
    pub jsonrpc: String,
    pub id: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ResponseError>,
}

/// JSON-RPC error returned by the Agent control plane.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, thiserror::Error)]
#[error("{message}")]
pub struct ResponseError {
    /// Stable JSON-RPC or application error code.
    pub code: i32,
    /// Human-readable error message.
    pub message: String,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NameParams {
    pub name: String,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SessionParams {
    pub agent: String,
    pub name: crate::sessions::SessionName,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub harness: Option<crate::Harness>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct DirectoryParams {
    pub directory: std::path::PathBuf,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SessionListParams {
    #[serde(default)]
    pub agent: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct LoginParams {
    pub harness: crate::harness::Harness,
    pub credential: String,
}

pub(crate) fn error_response(id: u64, code: i32, message: impl Into<String>) -> Response {
    Response {
        jsonrpc: JSON_RPC_VERSION.into(),
        id,
        result: None,
        error: Some(ResponseError {
            code,
            message: message.into(),
        }),
    }
}

pub(crate) async fn read_message<R: AsyncBufRead + Unpin>(reader: &mut R) -> std::io::Result<ReadMessage> {
    let mut message = Vec::new();
    loop {
        let available = reader.fill_buf().await?;
        if available.is_empty() {
            return Ok(if message.is_empty() {
                ReadMessage::EndOfStream
            } else {
                ReadMessage::Complete(message)
            });
        }
        let end = available
            .iter()
            .position(|byte| *byte == b'\n')
            .map_or(available.len(), |position| position + 1);
        if message.len().saturating_add(end) > MAX_MESSAGE_BYTES {
            return Ok(ReadMessage::TooLarge);
        }
        let complete = available.get(end - 1) == Some(&b'\n');
        message.extend_from_slice(&available[..end]);
        reader.consume(end);
        if complete {
            return Ok(ReadMessage::Complete(message));
        }
    }
}
