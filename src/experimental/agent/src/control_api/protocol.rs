use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufRead, AsyncBufReadExt as _, AsyncWrite, AsyncWriteExt as _};

/// Agent Control API version, independent of the JSON-RPC envelope.
pub const PROTOCOL_VERSION: &str = "v3";
pub(crate) const JSON_RPC_VERSION: &str = "2.0";

pub(crate) const METHOD_APPLY: &str = "agents.v1.apply";
pub(crate) const METHOD_HEALTH: &str = "control.v1.health";
pub(crate) const METHOD_GET: &str = "agents.v1.get";
pub(crate) const METHOD_LIST: &str = "agents.v1.list";
pub(crate) const METHOD_RESOLVE_DIRECTORY: &str = "agents.v1.resolveDirectory";
pub(crate) const METHOD_EXECUTION_START: &str = "executions.v1.start";
pub(crate) const METHOD_TERMINAL_EXECUTION_START: &str = "executions.v1.startTerminal";
pub(crate) const METHOD_PORT_FORWARD_START: &str = "portForwards.v1.start";
pub(crate) const METHOD_DELETE: &str = "agents.v1.delete";
pub(crate) const METHOD_AUTH_LOGIN: &str = "authentication.v1.login";
pub(crate) const METHOD_SESSION_ENSURE: &str = "sessions.v1.ensure";
pub(crate) const METHOD_SESSION_ATTACH: &str = "sessions.v1.attach";
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

pub(crate) struct MessageReader<R> {
    reader: R,
    pending: Vec<u8>,
}

impl<R> MessageReader<R> {
    pub(crate) const fn new(reader: R) -> Self {
        Self {
            reader,
            pending: Vec::new(),
        }
    }
}

impl<R: AsyncBufRead + Unpin> MessageReader<R> {
    /// Decodes one bounded stream message without losing partial reads on cancellation.
    pub(crate) async fn next_json<T: serde::de::DeserializeOwned>(&mut self) -> Result<Option<T>, crate::Error> {
        match self.next().await? {
            ReadMessage::EndOfStream => Ok(None),
            ReadMessage::TooLarge => Err(crate::Error::Invalid("Control API stream message exceeds 4 MiB".into())),
            ReadMessage::Complete(message) => Ok(Some(serde_json::from_slice(&message)?)),
        }
    }

    /// Reads one bounded newline-delimited message.
    ///
    /// Keeping the partial message on `self` makes this method cancellation
    /// safe when a streaming connection also waits for runtime events.
    pub(crate) async fn next(&mut self) -> std::io::Result<ReadMessage> {
        loop {
            let available = self.reader.fill_buf().await?;
            if available.is_empty() {
                return Ok(if self.pending.is_empty() {
                    ReadMessage::EndOfStream
                } else {
                    ReadMessage::Complete(std::mem::take(&mut self.pending))
                });
            }
            let end = available
                .iter()
                .position(|byte| *byte == b'\n')
                .map_or(available.len(), |position| position + 1);
            if self.pending.len().saturating_add(end) > MAX_MESSAGE_BYTES {
                return Ok(ReadMessage::TooLarge);
            }
            let complete = available.get(end - 1) == Some(&b'\n');
            self.pending.extend_from_slice(&available[..end]);
            self.reader.consume(end);
            if complete {
                return Ok(ReadMessage::Complete(std::mem::take(&mut self.pending)));
            }
        }
    }
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
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct SessionAttachParams {
    pub agent: String,
    pub name: crate::sessions::SessionName,
    pub rows: u16,
    pub columns: u16,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ExecutionStartParams {
    pub agent: String,
    pub command: Vec<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct TerminalExecutionStartParams {
    pub agent: String,
    pub command: Vec<String>,
    pub rows: u16,
    pub columns: u16,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct ExecutionStreamResult {
    pub execution_id: sandbox::execution::ExecutionId,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub(crate) enum TerminalClientMessage {
    Input { data: String },
    CloseInput,
    Resize { rows: u16, columns: u16 },
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub(crate) enum TerminalServerMessage {
    Output { data: String },
    Exited { code: i32 },
    Failed { message: String },
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub(crate) enum ExecutionServerMessage {
    Stdout { data: String },
    Stderr { data: String },
    Exited { code: i32 },
    Failed { message: String },
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct PortForwardStartParams {
    pub agent: String,
    pub specs: Vec<crate::sandbox::PortForwardSpec>,
}

/// One host listener bound by the daemon for a port-forward session.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct PortForwardBinding {
    /// Bound host address, including the resolved ephemeral port.
    pub local_address: std::net::SocketAddr,
    /// Guest port receiving forwarded connections.
    pub guest_port: u16,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct PortForwardStartResult {
    pub bindings: Vec<PortForwardBinding>,
}

/// A change observed for one running port forward.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub(crate) enum PortForwardServerMessage {
    /// The most recent relay error changed; `None` means it recovered.
    Status { index: u32, message: Option<String> },
    /// The daemon listener stopped serving.
    Stopped { index: u32, message: Option<String> },
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
    MessageReader::new(reader).next().await
}

pub(crate) async fn write_stream_message<W: AsyncWrite + Unpin, T: Serialize>(
    writer: &mut W,
    message: &T,
) -> Result<(), crate::Error> {
    let mut bytes = serde_json::to_vec(message)?;
    if bytes.len() >= MAX_MESSAGE_BYTES {
        return Err(crate::Error::Invalid("stream message exceeds 4 MiB".into()));
    }
    bytes.push(b'\n');
    writer.write_all(&bytes).await?;
    writer.flush().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use futures_util::poll;
    use tokio::io::{AsyncWriteExt as _, BufReader};

    use super::{MAX_MESSAGE_BYTES, MessageReader};

    #[tokio::test]
    async fn streaming_reader_preserves_a_partial_message_across_cancellation() {
        let (mut writer, reader) = tokio::io::duplex(64);
        let mut reader = MessageReader::new(BufReader::new(reader));
        writer.write_all(b"{\"value\":").await.unwrap();

        let mut pending_read = Box::pin(reader.next_json::<serde_json::Value>());
        assert!(poll!(pending_read.as_mut()).is_pending());
        drop(pending_read);

        writer.write_all(b"true}\n").await.unwrap();
        assert_eq!(
            reader.next_json::<serde_json::Value>().await.unwrap(),
            Some(serde_json::json!({"value": true}))
        );
    }

    #[tokio::test]
    async fn typed_stream_reader_keeps_buffered_messages_and_reports_eof() {
        let mut reader = MessageReader::new(BufReader::new(b"1\n2\n".as_slice()));
        assert_eq!(reader.next_json::<u32>().await.unwrap(), Some(1));
        assert_eq!(reader.next_json::<u32>().await.unwrap(), Some(2));
        assert_eq!(reader.next_json::<u32>().await.unwrap(), None);
    }

    #[tokio::test]
    async fn typed_stream_reader_rejects_invalid_and_oversized_messages() {
        let mut invalid = MessageReader::new(BufReader::new(b"invalid\n".as_slice()));
        assert!(matches!(
            invalid.next_json::<serde_json::Value>().await,
            Err(crate::Error::Json(_))
        ));
        let oversized = vec![b'x'; MAX_MESSAGE_BYTES + 1];
        let mut oversized = MessageReader::new(BufReader::new(oversized.as_slice()));
        assert!(matches!(
            oversized.next_json::<serde_json::Value>().await,
            Err(crate::Error::Invalid(_))
        ));
    }
}
