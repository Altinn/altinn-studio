//! Validated addresses for non-local Agent Control API transports.

use std::{fmt, net::SocketAddr, str::FromStr};

use crate::Error;

/// An unencrypted TCP endpoint with a host and nonzero port.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TcpEndpoint(String);

impl TcpEndpoint {
    /// Parses the `HOST:PORT` representation stored in client configuration.
    ///
    /// # Errors
    ///
    /// Returns an error when the host is empty or the port is missing, zero, or invalid.
    pub fn from_address(address: &str) -> Result<Self, Error> {
        validate_address(address)?;
        Ok(Self(address.into()))
    }

    /// Returns the host and port accepted by Tokio's TCP connector.
    #[must_use]
    pub fn address(&self) -> &str {
        &self.0
    }
}

impl FromStr for TcpEndpoint {
    type Err = Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let address = value
            .strip_prefix("tcp://")
            .ok_or_else(|| Error::Configuration("TCP endpoints must start with tcp://".into()))?;
        Self::from_address(address)
    }
}

impl fmt::Display for TcpEndpoint {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "tcp://{}", self.0)
    }
}

fn validate_address(address: &str) -> Result<(), Error> {
    if let Ok(socket) = SocketAddr::from_str(address) {
        return validate_port(socket.port());
    }

    let (host, port) = address
        .rsplit_once(':')
        .ok_or_else(|| invalid_endpoint("a port is required"))?;
    if host.is_empty()
        || host.contains(':')
        || host
            .chars()
            .any(|character| character.is_whitespace() || "/[]@?#".contains(character))
    {
        return Err(invalid_endpoint("the host is invalid"));
    }
    let port = port
        .parse::<u16>()
        .map_err(|_| invalid_endpoint("the port must be between 1 and 65535"))?;
    validate_port(port)
}

fn validate_port(port: u16) -> Result<(), Error> {
    if port == 0 {
        Err(invalid_endpoint("the port must be between 1 and 65535"))
    } else {
        Ok(())
    }
}

fn invalid_endpoint(message: &str) -> Error {
    Error::Configuration(format!("invalid TCP endpoint: {message}"))
}
