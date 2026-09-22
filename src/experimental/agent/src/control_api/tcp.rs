use std::{rc::Rc, str::FromStr, time::Duration};

use sandbox::LocalFuture;
use tokio::net::{TcpListener, TcpStream};

use super::{Caller, Connection, Connector, Server};
use crate::Error;

/// An unauthenticated, unencrypted `tcp://HOST:PORT` Control API connector.
#[derive(Clone, Debug)]
pub struct TcpConnector {
    address: String,
}

impl FromStr for TcpConnector {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let invalid = || {
            "endpoint must be tcp://HOST:PORT with a nonzero port and no credentials, path, query, or fragment"
                .to_owned()
        };
        let address = value.strip_prefix("tcp://").ok_or_else(invalid)?;
        let (host, port) = address.rsplit_once(':').ok_or_else(invalid)?;
        if port.parse::<std::num::NonZeroU16>().is_err() || !port.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err(invalid());
        }
        // Bracketed IPv6 literals and ordinary DNS/IPv4 hosts are passed to
        // Tokio unchanged. Reject URL components rather than silently ignoring them.
        let valid_host = if host.starts_with('[') {
            host.strip_prefix('[')
                .and_then(|host| host.strip_suffix(']'))
                .is_some_and(|host| host.parse::<std::net::Ipv6Addr>().is_ok())
        } else {
            !host.is_empty()
                && host
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-'))
        };
        if !valid_host {
            return Err(invalid());
        }
        Ok(Self {
            address: address.into(),
        })
    }
}

impl Connector for TcpConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            let stream = tokio::time::timeout(Duration::from_secs(10), TcpStream::connect(self.address.as_str()))
                .await
                .map_err(|_| Error::Connect(std::io::ErrorKind::TimedOut.into()))?
                .map_err(Error::Connect)?;
            Ok(Box::new(stream) as Box<dyn Connection>)
        })
    }
}

pub(super) async fn serve(server: Rc<Server>, listener: TcpListener) -> Result<(), Error> {
    if !listener.local_addr()?.ip().is_loopback() {
        return Err(Error::Invalid(
            "the unauthenticated Control API listener must bind to loopback".into(),
        ));
    }
    super::socket::serve_listener(server, Caller::RemoteUnauthenticated, || async {
        Ok(listener.accept().await?.0)
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn endpoint_requires_an_explicit_tcp_authority() {
        for value in [
            "tcp://localhost:9000",
            "tcp://127.0.0.1:1",
            "tcp://host.docker.internal:65535",
            "tcp://[::1]:9000",
        ] {
            assert!(value.parse::<TcpConnector>().is_ok(), "{value}");
        }
        for value in [
            "",
            "localhost:9000",
            "http://localhost:9000",
            "tcp://localhost",
            "tcp://:9000",
            "tcp://localhost:0",
            "tcp://localhost:65536",
            "tcp://localhost:+1",
            "tcp://localhost:abc",
            "tcp://user@localhost:9000",
            "tcp://localhost:9000/path",
            "tcp://localhost:9000?query",
            "tcp://localhost:9000#fragment",
            " tcp://localhost:9000",
            "tcp://local host:9000",
            "tcp://::1:9000",
            "tcp://[not-ipv6]:9000",
        ] {
            assert!(value.parse::<TcpConnector>().is_err(), "{value}");
        }
    }
}
