//! Explicitly insecure TCP transport for the Agent Control API.

use std::{rc::Rc, time::Duration};

use futures_util::{FutureExt as _, StreamExt as _, stream::FuturesUnordered};
use sandbox::LocalFuture;

use crate::Error;

use super::{Caller, Connector, Server, TcpEndpoint, client::Connection};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const MAX_CONCURRENT_CONNECTIONS: usize = 64;
type ConnectionFuture = futures_util::future::LocalBoxFuture<'static, ()>;

pub(super) struct TcpConnector {
    endpoint: TcpEndpoint,
}

impl TcpConnector {
    pub(super) const fn new(endpoint: TcpEndpoint) -> Self {
        Self { endpoint }
    }
}

impl Connector for TcpConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            let endpoint = self.endpoint.to_string();
            let connection =
                tokio::time::timeout(CONNECT_TIMEOUT, tokio::net::TcpStream::connect(self.endpoint.address()))
                    .await
                    .map_err(|_| unavailable(endpoint.clone(), std::io::ErrorKind::TimedOut.into()))?
                    .map_err(|source| unavailable(endpoint, source))?;
            Ok(Box::new(connection) as Box<dyn Connection>)
        })
    }

    fn allows_credential_transfer(&self) -> bool {
        false
    }
}

pub(super) async fn serve(server: Rc<Server>, listener: tokio::net::TcpListener) -> Result<(), Error> {
    let mut connections = FuturesUnordered::<ConnectionFuture>::new();
    loop {
        tokio::select! {
            accepted = listener.accept(), if connections.len() < MAX_CONCURRENT_CONNECTIONS => {
                let (stream, _) = accepted?;
                let connection_server = server.clone();
                connections.push(async move {
                    if let Err(error) = connection_server
                        .serve_connection(stream, Caller::RemoteUnauthenticated)
                        .await
                    {
                        connection_server.report(&error);
                    }
                }.boxed_local());
            }
            Some(()) = connections.next(), if !connections.is_empty() => {}
        }
    }
}

const fn unavailable(endpoint: String, source: std::io::Error) -> Error {
    Error::ControlApiUnavailable { endpoint, source }
}
