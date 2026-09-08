//! Guest TCP dialing transport for the Microsandbox Backend.

use sandbox_microsandbox::{GuestTcpDialer, GuestTcpStream, MicrosandboxProvider};

use crate::{Error, sandbox::Assignment};

/// Dials TCP connections from inside one Agent Sandbox.
///
/// The dialer multiplexes streams over a single Sandbox connection, so opening
/// many concurrent connections through one dialer is cheap. It stops working
/// when the Sandbox runtime restarts; create a replacement when a connect fails.
pub struct GuestDialer(GuestTcpDialer);

/// One open TCP stream dialed from inside an Agent Sandbox.
pub struct GuestConnection(GuestTcpStream);

impl GuestDialer {
    /// Opens one TCP connection dialed from inside the guest.
    ///
    /// # Errors
    ///
    /// Returns an error when the stream cannot be opened or the guest dial is
    /// rejected.
    pub async fn connect(&self, host: &str, port: u16) -> Result<GuestConnection, Error> {
        Ok(GuestConnection(self.0.connect(host, port).await?))
    }
}

impl GuestConnection {
    /// Pipes bytes between a host socket and the guest connection until either
    /// side closes.
    ///
    /// # Errors
    ///
    /// Returns an error when either side of the relay fails.
    pub async fn relay(self, stream: tokio::net::TcpStream) -> Result<(), Error> {
        self.0.relay(stream).await.map_err(Error::from)
    }
}

/// Connects a TCP dialer to an already-materialized Microsandbox.
///
/// # Errors
///
/// Returns an error when the assignment is not materialized or the exact
/// Microsandbox is not running.
pub(crate) async fn guest_tcp_dialer(home: &std::path::Path, assignment: &Assignment) -> Result<GuestDialer, Error> {
    let provider = MicrosandboxProvider::open(home.join("microsandbox")).await?;
    let Assignment::Materialized { id, .. } = assignment else {
        return Err(Error::Invalid("forward target Sandbox is not materialized".into()));
    };
    provider
        .guest_tcp_dialer(id)
        .await
        .map(GuestDialer)
        .map_err(Error::from)
}
