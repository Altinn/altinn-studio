//! Host-dialed TCP streams into a running Microsandbox guest.
//!
//! The Microsandbox agent relay multiplexes `TcpConnect` streams over the
//! Sandbox's host socket, so a host process can open TCP connections that are
//! dialed from inside the guest network namespace without any configuration
//! on the Sandbox itself.

use std::sync::Arc;

use microsandbox::{
    agent::AgentClient,
    protocol::{
        message::{Message, MessageType},
        tcp::{TcpClose, TcpConnect, TcpConnected, TcpData, TcpEof, TcpFailed},
    },
};
use sandbox::{Error, SandboxId};
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

use crate::{MicrosandboxProvider, error};

const RELAY_READ_BUFFER_BYTES: usize = 32 * 1024;

/// Dials TCP connections from inside one running Sandbox.
///
/// The dialer keeps a single multiplexed agent connection, so opening many
/// concurrent streams through one dialer is cheap. It stops working when the
/// Sandbox runtime restarts; create a replacement through
/// [`MicrosandboxProvider::guest_tcp_dialer`] when a connect fails.
pub struct GuestTcpDialer {
    client: Arc<AgentClient>,
    // Keeps the connected runtime handle (and its relay session) alive.
    _sandbox: microsandbox::Sandbox,
}

/// One open TCP stream dialed from inside the guest.
pub struct GuestTcpStream {
    id: u32,
    client: Arc<AgentClient>,
    receiver: tokio::sync::mpsc::Receiver<Message>,
}

impl MicrosandboxProvider {
    /// Connects a TCP dialer to one running Sandbox.
    ///
    /// # Errors
    ///
    /// Returns an error when the Sandbox is unknown, not running, or its
    /// runtime predates agent-relay TCP support.
    pub async fn guest_tcp_dialer(&self, id: &SandboxId) -> Result<GuestTcpDialer, Error> {
        let record = self.state.sandbox_by_id(id).await?;
        let sandbox = self.connect_running(&record).await?;
        let client = sandbox.client_arc();
        if !client.supports(MessageType::TcpConnect) {
            return Err(Error::Backend(
                "Sandbox runtime does not support agent-relay TCP forwarding; restart the Sandbox".into(),
            ));
        }
        Ok(GuestTcpDialer {
            client,
            _sandbox: sandbox,
        })
    }
}

impl GuestTcpDialer {
    /// Opens one TCP connection dialed from inside the guest.
    ///
    /// # Errors
    ///
    /// Returns an error when the relay stream cannot be opened or the guest
    /// dial is rejected.
    pub async fn connect(&self, host: &str, port: u16) -> Result<GuestTcpStream, Error> {
        let request = TcpConnect {
            host: host.to_owned(),
            port,
        };
        let (id, mut receiver) = self
            .client
            .stream(MessageType::TcpConnect, &request)
            .await
            .map_err(error::backend)?;
        let Some(first) = receiver.recv().await else {
            return Err(Error::Backend(
                "Sandbox agent closed the TCP stream before replying to connect".into(),
            ));
        };
        match first.t {
            MessageType::TcpConnected => {
                let _: TcpConnected = first.payload().map_err(error::backend)?;
                Ok(GuestTcpStream {
                    id,
                    client: Arc::clone(&self.client),
                    receiver,
                })
            }
            MessageType::TcpFailed => {
                let failed: TcpFailed = first.payload().map_err(error::backend)?;
                Err(Error::Backend(format!(
                    "guest TCP connect to {host}:{port} failed: {}",
                    failed.error
                )))
            }
            other => Err(Error::Backend(format!(
                "unexpected Sandbox agent reply {:?} to guest TCP connect",
                other.as_str()
            ))),
        }
    }
}

impl Drop for GuestTcpStream {
    /// Releases the guest socket and its agent session on every path — normal
    /// completion, an error, and a cancelled relay task alike.
    fn drop(&mut self) {
        let client = Arc::clone(&self.client);
        let id = self.id;
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            handle.spawn(async move {
                let _ = client.send(id, MessageType::TcpClose, &TcpClose {}).await;
            });
        }
    }
}

impl GuestTcpStream {
    /// Pipes bytes between a host socket and the guest connection until either
    /// side closes; dropping the stream releases the guest session.
    ///
    /// # Errors
    ///
    /// Returns an error when a host socket read or write fails, or a relay
    /// message cannot be sent or decoded.
    pub async fn relay(mut self, stream: tokio::net::TcpStream) -> Result<(), Error> {
        let (mut host_reader, mut host_writer) = stream.into_split();
        let client = Arc::clone(&self.client);
        let id = self.id;

        let host_to_guest = async {
            let mut buffer = vec![0u8; RELAY_READ_BUFFER_BYTES];
            loop {
                let read = host_reader
                    .read(&mut buffer)
                    .await
                    .map_err(|source| error::io("read forwarded host connection", source))?;
                if read == 0 {
                    client
                        .send(id, MessageType::TcpEof, &TcpEof {})
                        .await
                        .map_err(error::backend)?;
                    return Ok::<(), Error>(());
                }
                let data = TcpData {
                    data: buffer[..read].to_vec(),
                };
                client
                    .send(id, MessageType::TcpData, &data)
                    .await
                    .map_err(error::backend)?;
            }
        };

        let guest_to_host = async {
            while let Some(message) = self.receiver.recv().await {
                match message.t {
                    MessageType::TcpData => {
                        let data: TcpData = message.payload().map_err(error::backend)?;
                        host_writer
                            .write_all(&data.data)
                            .await
                            .map_err(|source| error::io("write forwarded host connection", source))?;
                    }
                    MessageType::TcpEof => {
                        host_writer
                            .shutdown()
                            .await
                            .map_err(|source| error::io("shut down forwarded host connection", source))?;
                    }
                    MessageType::TcpClosed => return Ok::<(), Error>(()),
                    other => {
                        return Err(Error::Backend(format!(
                            "unexpected Sandbox agent message {:?} on a guest TCP stream",
                            other.as_str()
                        )));
                    }
                }
            }
            Ok(())
        };

        // A host-side EOF is a half-close: the guest may still be writing its
        // response, so only a guest-side completion or an error ends the relay.
        tokio::pin!(guest_to_host);
        tokio::select! {
            result = &mut guest_to_host => result,
            result = host_to_guest => match result {
                Ok(()) => guest_to_host.await,
                Err(error) => Err(error),
            },
        }
    }
}
