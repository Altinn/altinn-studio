//! Client-owned port forwards into Agent sandboxes.
//!
//! Forwards follow the k9s model: they live in this process, accept
//! connections on a local listener, and dial the guest through the Sandbox
//! agent relay. They end when the process exits or the forward is stopped.

use std::{cell::RefCell, net::IpAddr, path::PathBuf, rc::Rc};

use agent::{
    Error,
    sandbox::{Assignment, GuestDialer},
};
use tokio::net::TcpListener;

/// One requested local-to-guest port mapping.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ForwardSpec {
    /// Local interface address accepting connections.
    pub(crate) address: IpAddr,
    /// Local port to bind; zero selects an ephemeral port.
    pub(crate) local_port: u16,
    /// Guest port that receives forwarded connections.
    pub(crate) guest_port: u16,
}

impl ForwardSpec {
    /// Parses `GUEST`, `LOCAL:GUEST`, or `ADDRESS:LOCAL:GUEST`.
    ///
    /// An empty local port (`:GUEST`) selects an ephemeral local port.
    pub(crate) fn parse(text: &str) -> Result<Self, String> {
        let parts = text.split(':').collect::<Vec<_>>();
        let (address, local, guest) = match parts.as_slice() {
            [guest] => (None, *guest, *guest),
            [local, guest] => (None, *local, *guest),
            [address, local, guest] => (Some(*address), *local, *guest),
            _ => return Err(format!("{text:?} is not GUEST, LOCAL:GUEST, or ADDRESS:LOCAL:GUEST")),
        };
        let address = match address {
            None => IpAddr::from([127, 0, 0, 1]),
            Some(text) => text
                .parse::<IpAddr>()
                .map_err(|_| format!("{text:?} is not a local IP address"))?,
        };
        let local_port = if local.is_empty() { 0 } else { parse_port(local)? };
        let guest_port = parse_port(guest)?;
        if guest_port == 0 {
            return Err("guest port must not be zero".into());
        }
        Ok(Self {
            address,
            local_port,
            guest_port,
        })
    }
}

fn parse_port(text: &str) -> Result<u16, String> {
    text.parse::<u16>().map_err(|_| format!("{text:?} is not a port"))
}

/// One running forward with its local listener task.
pub(crate) struct PortForward {
    spec: ForwardSpec,
    local: std::net::SocketAddr,
    task: tokio::task::JoinHandle<()>,
    status: Rc<RefCell<Option<String>>>,
}

impl PortForward {
    /// Binds the local listener and serves connections until stopped.
    ///
    /// # Errors
    ///
    /// Returns an error when the local address cannot be bound.
    pub(crate) async fn start(home: PathBuf, assignment: Assignment, spec: ForwardSpec) -> Result<Self, Error> {
        let listener = TcpListener::bind((spec.address, spec.local_port))
            .await
            .map_err(Error::from)?;
        let local = listener.local_addr().map_err(Error::from)?;
        let status = Rc::new(RefCell::new(None));
        let task = tokio::task::spawn_local(accept_loop(
            home,
            assignment,
            spec.guest_port,
            listener,
            Rc::clone(&status),
        ));
        Ok(Self {
            spec,
            local,
            task,
            status,
        })
    }

    /// Returns the requested mapping.
    pub(crate) const fn spec(&self) -> &ForwardSpec {
        &self.spec
    }

    /// Returns the bound local address, with any ephemeral port resolved.
    pub(crate) const fn local_address(&self) -> std::net::SocketAddr {
        self.local
    }

    /// Returns the most recent connection failure, when one occurred.
    pub(crate) fn status(&self) -> Option<String> {
        self.status.borrow().clone()
    }

    /// Reports whether the listener task has ended and stopped serving.
    pub(crate) fn finished(&self) -> bool {
        self.task.is_finished()
    }

    /// Stops the listener and drops in-flight relays.
    pub(crate) fn stop(&self) {
        self.task.abort();
    }
}

impl Drop for PortForward {
    fn drop(&mut self) {
        self.stop();
    }
}

async fn accept_loop(
    home: PathBuf,
    assignment: Assignment,
    guest_port: u16,
    listener: TcpListener,
    status: Rc<RefCell<Option<String>>>,
) {
    // The dialer multiplexes streams over one agent connection; it is replaced
    // when a connect fails, which re-reaches a Sandbox whose runtime restarted.
    let mut dialer: Option<Rc<GuestDialer>> = None;
    // Relays live in the accept task's JoinSet, so aborting the accept task
    // drops the set and aborts every in-flight connection with it.
    let mut relays = tokio::task::JoinSet::new();
    loop {
        while relays.try_join_next().is_some() {}
        let stream = match listener.accept().await {
            Ok((stream, _)) => stream,
            Err(error) => {
                *status.borrow_mut() = Some(format!("accept failed: {error}"));
                return;
            }
        };
        if dialer.is_none() {
            match agent::sandbox::guest_tcp_dialer(&home, &assignment).await {
                Ok(connected) => dialer = Some(Rc::new(connected)),
                Err(error) => {
                    *status.borrow_mut() = Some(error.to_string());
                    continue;
                }
            }
        }
        let Some(connected) = &dialer else { continue };
        match connected.connect("127.0.0.1", guest_port).await {
            Ok(guest) => {
                *status.borrow_mut() = None;
                let status = Rc::clone(&status);
                relays.spawn_local(async move {
                    if let Err(error) = guest.relay(stream).await {
                        *status.borrow_mut() = Some(error.to_string());
                    }
                });
            }
            Err(error) => {
                *status.borrow_mut() = Some(error.to_string());
                dialer = None;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    #[test]
    fn specs_follow_kubectl_shapes() {
        assert_eq!(
            ForwardSpec::parse("80").expect("guest-only spec"),
            ForwardSpec {
                address: IpAddr::from([127, 0, 0, 1]),
                local_port: 80,
                guest_port: 80,
            }
        );
        assert_eq!(
            ForwardSpec::parse("9090:80").expect("local and guest spec"),
            ForwardSpec {
                address: IpAddr::from([127, 0, 0, 1]),
                local_port: 9090,
                guest_port: 80,
            }
        );
        assert_eq!(
            ForwardSpec::parse("0.0.0.0:80:80").expect("address spec"),
            ForwardSpec {
                address: IpAddr::from([0, 0, 0, 0]),
                local_port: 80,
                guest_port: 80,
            }
        );
        assert_eq!(
            ForwardSpec::parse(":80").expect("ephemeral local port"),
            ForwardSpec {
                address: IpAddr::from([127, 0, 0, 1]),
                local_port: 0,
                guest_port: 80,
            }
        );
        assert!(ForwardSpec::parse("web:80").is_err());
        assert!(ForwardSpec::parse("1:2:3:4").is_err());
        assert!(ForwardSpec::parse("8080:0").is_err());
    }
}
