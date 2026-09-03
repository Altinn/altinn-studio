//! Guest TCP dialing transport for the Microsandbox Backend.

use std::rc::Rc;

use ::sandbox::{LocalFuture, SandboxId};
use sandbox_microsandbox::{GuestTcpDialer, GuestTcpStream, MicrosandboxProvider};

use crate::{
    Error,
    sandbox::{GuestTcpConnection, GuestTcpDialer as GuestTcpDialerApi},
};

struct MicrosandboxGuestDialer(GuestTcpDialer);

struct MicrosandboxGuestConnection(GuestTcpStream);

impl GuestTcpDialerApi for MicrosandboxGuestDialer {
    fn connect<'a>(&'a self, host: &'a str, port: u16) -> LocalFuture<'a, Result<Box<dyn GuestTcpConnection>, Error>> {
        Box::pin(async move {
            self.0
                .connect(host, port)
                .await
                .map(|connection| Box::new(MicrosandboxGuestConnection(connection)) as Box<dyn GuestTcpConnection>)
                .map_err(Error::from)
        })
    }
}

impl GuestTcpConnection for MicrosandboxGuestConnection {
    fn relay(self: Box<Self>, stream: tokio::net::TcpStream) -> LocalFuture<'static, Result<(), Error>> {
        Box::pin(async move { self.0.relay(stream).await.map_err(Error::from) })
    }
}

pub(super) async fn guest_tcp_dialer(
    provider: &MicrosandboxProvider,
    id: &SandboxId,
) -> Result<Rc<dyn GuestTcpDialerApi>, Error> {
    provider
        .guest_tcp_dialer(id)
        .await
        .map(|dialer| Rc::new(MicrosandboxGuestDialer(dialer)) as Rc<dyn GuestTcpDialerApi>)
        .map_err(Error::from)
}
