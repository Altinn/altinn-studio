//! Host-dialed TCP streams into a running Microsandbox guest.
//!
//! The Microsandbox agent relay multiplexes `TcpConnect` streams over the
//! Sandbox's host socket, so a host process can open TCP connections that are
//! dialed from inside the guest network namespace without any configuration
//! on the Sandbox itself.

use std::{cell::Cell, sync::Arc};

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
        GuestTcpStream::open(Arc::clone(&self.client), host, port).await
    }
}

impl GuestTcpStream {
    async fn open(client: Arc<AgentClient>, host: &str, port: u16) -> Result<Self, Error> {
        let request = TcpConnect {
            host: host.to_owned(),
            port,
        };
        let (id, mut receiver) = client
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
                Ok(Self { id, client, receiver })
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
    /// Pipes bytes between a host socket and the guest connection until both
    /// directions have closed; dropping the stream releases the guest session.
    ///
    /// # Errors
    ///
    /// Returns an error when a host socket read or write fails, or a relay
    /// message cannot be sent or decoded.
    pub async fn relay(mut self, stream: tokio::net::TcpStream) -> Result<(), Error> {
        let (mut host_reader, mut host_writer) = stream.into_split();
        let client = Arc::clone(&self.client);
        let id = self.id;
        let host_closed = Cell::new(false);
        let guest_closed = Cell::new(false);

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
                    host_closed.set(true);
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
                        guest_closed.set(true);
                        if host_closed.get() {
                            return Ok(());
                        }
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
        // response, so the relay ends when the guest side has closed too.
        // Neither end sends a terminal frame after a mutual half-close, so
        // waiting for one here would pin the closed socket forever.
        tokio::pin!(guest_to_host);
        tokio::select! {
            result = &mut guest_to_host => result,
            result = host_to_guest => match result {
                Ok(()) if guest_closed.get() => Ok(()),
                Ok(()) => guest_to_host.await,
                Err(error) => Err(error),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used, clippy::panic)]

    use std::{sync::Arc, time::Duration};

    use microsandbox::{
        agent::AgentClient,
        protocol::{
            codec,
            core::Ready,
            message::{Message, MessageType},
            tcp::{TcpConnected, TcpEof},
        },
    };
    use tokio::{
        io::{AsyncReadExt as _, AsyncWriteExt as _, DuplexStream},
        net::{TcpListener, TcpStream},
    };

    use super::GuestTcpStream;

    const RELAY_ID_MIN: u32 = 1;
    const RELAY_ID_MAX: u32 = 1 << 20;

    /// The guest end of the agent relay, driven by the test one frame at a time.
    struct FakeGuestAgent {
        wire: DuplexStream,
        pending: Vec<u8>,
    }

    impl FakeGuestAgent {
        async fn handshake() -> (Arc<AgentClient>, Self) {
            let (host, guest) = tokio::io::duplex(64 * 1024);
            let mut agent = Self {
                wire: guest,
                pending: Vec::new(),
            };
            agent
                .wire
                .write_all(&RELAY_ID_MIN.to_be_bytes())
                .await
                .expect("write relay id range start");
            agent
                .wire
                .write_all(&RELAY_ID_MAX.to_be_bytes())
                .await
                .expect("write relay id range end");
            agent
                .write(&Message::with_payload(MessageType::Ready, 0, &Ready::default()).expect("ready frame"))
                .await;
            let client = AgentClient::connect_stream_with_timeout(host, Duration::from_secs(5))
                .await
                .expect("relay handshake");
            (Arc::new(client), agent)
        }

        async fn write(&mut self, message: &Message) {
            let mut frame = Vec::new();
            codec::encode_to_buf(message, &mut frame).expect("encode frame");
            self.wire.write_all(&frame).await.expect("write frame");
        }

        async fn expect(&mut self, expected: MessageType) -> Message {
            loop {
                if let Some(message) = codec::try_decode_from_buf(&mut self.pending).expect("decode frame") {
                    assert_eq!(message.t, expected, "unexpected frame from the host relay");
                    return message;
                }
                let mut chunk = [0u8; 4096];
                let read = self.wire.read(&mut chunk).await.expect("read frame");
                assert!(read > 0, "host closed the relay before sending {expected:?}");
                self.pending.extend_from_slice(&chunk[..read]);
            }
        }
    }

    #[tokio::test(flavor = "local")]
    async fn relay_ends_once_both_directions_have_closed() {
        let (client, mut agent) = FakeGuestAgent::handshake().await;
        let (opened, ()) = tokio::join!(GuestTcpStream::open(client, "127.0.0.1", 80), async {
            let connect = agent.expect(MessageType::TcpConnect).await;
            agent
                .write(
                    &Message::with_payload(MessageType::TcpConnected, connect.id, &TcpConnected {})
                        .expect("connected frame"),
                )
                .await;
        });
        let stream = opened.expect("guest connect should succeed");
        let session = stream.id;

        let listener = TcpListener::bind(("127.0.0.1", 0)).await.expect("bind host listener");
        let mut browser = TcpStream::connect(listener.local_addr().expect("listener address"))
            .await
            .expect("connect browser side");
        let (forwarded, _) = listener.accept().await.expect("accept forwarded connection");
        let relay = tokio::task::spawn_local(stream.relay(forwarded));

        browser.shutdown().await.expect("half-close the browser side");
        agent.expect(MessageType::TcpEof).await;

        agent
            .write(&Message::with_payload(MessageType::TcpEof, session, &TcpEof {}).expect("eof frame"))
            .await;
        let mut sink = [0u8; 1];
        let read = browser
            .read(&mut sink)
            .await
            .expect("read guest EOF on the browser side");
        assert_eq!(read, 0, "guest EOF should half-close the browser side");

        tokio::time::timeout(Duration::from_secs(2), relay)
            .await
            .expect("relay should finish once both directions have closed")
            .expect("relay task should not panic")
            .expect("relay should end cleanly");
        let close = agent.expect(MessageType::TcpClose).await;
        assert_eq!(
            close.id, session,
            "dropping the finished relay should release the guest session"
        );
    }
}
