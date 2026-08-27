//! Sandbox-facing Platform API endpoint.
//!
//! Harness processes inside a Sandbox reach the host through the mediated
//! Network Backend's host alias, which rewrites to host loopback. This module
//! owns the loopback listener and its one current route: per-launch session
//! reports carrying the harness-native conversation ID. The same listener is
//! the growth point for later platform tools (MCP), so nothing here assumes
//! the report route is the only one.
//!
//! Requests originate inside Sandboxes and are untrusted: parsing is bounded,
//! authentication is a per-launch bearer token, and failures return nothing
//! but a status code.

use std::{path::Path, rc::Rc};

use futures_util::{FutureExt as _, StreamExt as _, stream::FuturesUnordered};
use tokio::{
    io::{AsyncReadExt as _, AsyncWriteExt as _},
    net::{TcpListener, TcpStream},
};

use crate::{Error, sessions};

/// Upper bound for the request line and headers.
const MAX_HEAD_BYTES: usize = 8_192;

/// Upper bound for a request body.
const MAX_BODY_BYTES: usize = 4_096;

/// Time budget for one connection, request and response included.
const CONNECTION_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(5);
const MAX_CONCURRENT_CONNECTIONS: usize = 64;
const MAX_NATIVE_SESSION_ID_BYTES: usize = 1_024;
type ConnectionFuture = futures_util::future::LocalBoxFuture<'static, ()>;

/// Binds the Platform API listener on loopback, reusing the previously bound port.
///
/// The port is persisted at `port_path` so Sandbox environments composed at
/// earlier launches keep pointing at a live endpoint across daemon restarts.
/// When the persisted port is unavailable, a fresh port is bound and persisted;
/// hooks from launches before the change retry and expire harmlessly.
///
/// # Errors
///
/// Returns an error when no loopback port can be bound or the port cannot be
/// persisted.
pub async fn bind_persistent(port_path: &Path) -> Result<TcpListener, Error> {
    let preferred = match tokio::fs::read_to_string(port_path).await {
        Ok(content) => content.trim().parse::<u16>().ok(),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(Error::Io(error)),
    };
    let listener = match preferred {
        Some(port) => match TcpListener::bind(("127.0.0.1", port)).await {
            Ok(listener) => listener,
            Err(_) => TcpListener::bind(("127.0.0.1", 0)).await?,
        },
        None => TcpListener::bind(("127.0.0.1", 0)).await?,
    };
    let port = listener.local_addr()?.port();
    tokio::fs::write(port_path, format!("{port}\n")).await?;
    Ok(listener)
}

/// Serves Platform API requests from Sandboxes until the listener fails.
pub struct Server {
    sessions: Rc<dyn sessions::SessionStore>,
    on_error: Rc<dyn Fn(&Error)>,
}

impl Server {
    /// Creates a Platform API server over durable Session state.
    #[must_use]
    pub fn new(sessions: Rc<dyn sessions::SessionStore>, on_error: Rc<dyn Fn(&Error)>) -> Self {
        Self { sessions, on_error }
    }

    /// Accepts and handles connections until the listener fails.
    ///
    /// # Errors
    ///
    /// Returns an error when accepting connections fails permanently.
    pub async fn serve(self: Rc<Self>, listener: TcpListener) -> Result<(), Error> {
        let mut connections = FuturesUnordered::<ConnectionFuture>::new();
        loop {
            tokio::select! {
                accepted = listener.accept(), if connections.len() < MAX_CONCURRENT_CONNECTIONS => {
                    let (stream, _) = accepted?;
                    let server = self.clone();
                    connections.push(async move {
                        let outcome = tokio::time::timeout(CONNECTION_TIMEOUT, server.handle(stream)).await;
                        match outcome {
                            Ok(Ok(())) => {}
                            Ok(Err(error)) => (server.on_error)(&error),
                            Err(_) => {
                                (server.on_error)(&Error::Session("Platform API connection timed out".into()));
                            }
                        }
                    }.boxed_local());
                }
                Some(()) = connections.next(), if !connections.is_empty() => {}
            }
        }
    }

    async fn handle(&self, mut stream: TcpStream) -> Result<(), Error> {
        let request = match read_request(&mut stream).await {
            Ok(request) => request,
            Err(status) => return respond(&mut stream, status).await,
        };
        let status = self.dispatch(&request).await;
        respond(&mut stream, status).await
    }

    async fn dispatch(&self, request: &Request) -> u16 {
        if request.method != "POST" {
            return 405;
        }
        if request.target != "/v1/session/hooks/start" {
            return 404;
        }
        let Some(token) = request.bearer_token() else {
            return 401;
        };
        let Ok(token) = token.parse::<sessions::LaunchToken>() else {
            return 401;
        };
        let Ok(report) = serde_json::from_slice::<SessionReport>(&request.body) else {
            return 400;
        };
        self.accept_report(&token, &report).await
    }

    /// Applies one authenticated session report.
    ///
    /// The per-launch token rejects reports from earlier harness incarnations.
    /// Sessions in one Agent share a Unix identity and are not mutually
    /// isolated security principals.
    async fn accept_report(&self, token: &sessions::LaunchToken, report: &SessionReport) -> u16 {
        if report.native_session_id.is_empty() || report.native_session_id.len() > MAX_NATIVE_SESSION_ID_BYTES {
            return 400;
        }
        match self
            .sessions
            .set_session_native_id_for_launch(report.session_id, token, &report.native_session_id)
            .await
        {
            Ok(()) => 204,
            Err(Error::NotFound) => 401,
            Err(error) => {
                (self.on_error)(&error);
                500
            }
        }
    }
}

/// One per-launch session report from the harness hook.
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct SessionReport {
    session_id: sessions::SessionId,
    native_session_id: String,
    #[serde(default)]
    #[allow(dead_code, reason = "accepted for diagnostics; not used for authorization")]
    source: String,
    #[serde(default)]
    #[allow(dead_code, reason = "accepted for diagnostics; not used for authorization")]
    pane_id: String,
}

struct Request {
    method: String,
    target: String,
    authorization: Option<String>,
    body: Vec<u8>,
}

impl Request {
    fn bearer_token(&self) -> Option<&str> {
        let value = self.authorization.as_deref()?;
        let token = value
            .strip_prefix("Bearer ")
            .or_else(|| value.strip_prefix("bearer "))?;
        (!token.is_empty() && token.len() <= 128).then_some(token)
    }
}

/// Reads one bounded HTTP/1.x request; the error is the response status code.
async fn read_request(stream: &mut TcpStream) -> Result<Request, u16> {
    let mut buffer = Vec::with_capacity(1_024);
    let head_end = loop {
        if let Some(position) = find_head_end(&buffer) {
            break position;
        }
        if buffer.len() >= MAX_HEAD_BYTES {
            return Err(431);
        }
        let mut chunk = [0_u8; 1_024];
        let read = stream.read(&mut chunk).await.map_err(|_| 400_u16)?;
        if read == 0 {
            return Err(400);
        }
        buffer.extend_from_slice(&chunk[..read]);
    };

    let head = std::str::from_utf8(&buffer[..head_end]).map_err(|_| 400_u16)?;
    let mut lines = head.split("\r\n");
    let request_line = lines.next().ok_or(400_u16)?;
    let mut parts = request_line.split(' ');
    let method = parts.next().ok_or(400_u16)?.to_owned();
    let target = parts.next().ok_or(400_u16)?.to_owned();

    let mut authorization = None;
    let mut content_length = 0_usize;
    for line in lines {
        let Some((name, value)) = line.split_once(':') else {
            continue;
        };
        let value = value.trim();
        if name.eq_ignore_ascii_case("authorization") {
            authorization = Some(value.to_owned());
        } else if name.eq_ignore_ascii_case("content-length") {
            content_length = value.parse().map_err(|_| 400_u16)?;
        }
    }
    if content_length > MAX_BODY_BYTES {
        return Err(413);
    }

    let mut body = buffer[head_end + 4..].to_vec();
    if body.len() > content_length {
        return Err(400);
    }
    while body.len() < content_length {
        let mut chunk = vec![0_u8; content_length - body.len()];
        let read = stream.read(&mut chunk).await.map_err(|_| 400_u16)?;
        if read == 0 {
            return Err(400);
        }
        body.extend_from_slice(&chunk[..read]);
    }
    Ok(Request {
        method,
        target,
        authorization,
        body,
    })
}

fn find_head_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

async fn respond(stream: &mut TcpStream, status: u16) -> Result<(), Error> {
    let reason = match status {
        204 => "No Content",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        405 => "Method Not Allowed",
        413 => "Content Too Large",
        431 => "Request Header Fields Too Large",
        _ => "Internal Server Error",
    };
    let response = format!("HTTP/1.1 {status} {reason}\r\nconnection: close\r\ncontent-length: 0\r\n\r\n");
    stream.write_all(response.as_bytes()).await?;
    stream.shutdown().await?;
    Ok(())
}
