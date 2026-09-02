//! User-facing port-forward argument parsing.

use std::{cell::RefCell, net::IpAddr, rc::Rc};

use agent::{
    Error,
    control_api::{Client, PortForwardEvent},
};

/// One requested host-to-guest port mapping.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ForwardSpec {
    /// Host interface address accepting connections.
    pub(crate) address: IpAddr,
    /// Host port to bind; zero selects an ephemeral port.
    pub(crate) local_port: u16,
    /// Guest port that receives forwarded connections.
    pub(crate) guest_port: u16,
}

impl ForwardSpec {
    /// Parses `GUEST`, `LOCAL:GUEST`, or `ADDRESS:LOCAL:GUEST`.
    ///
    /// An empty local port (`:GUEST`) selects an ephemeral port.
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

    pub(crate) fn into_runtime(self) -> Result<agent::sandbox::PortForwardSpec, agent::Error> {
        agent::sandbox::PortForwardSpec::new(self.address, self.local_port, self.guest_port)
    }
}

/// UI-owned handle keeping one daemon port forward alive.
pub(crate) struct PortForward {
    spec: ForwardSpec,
    local_address: std::net::SocketAddr,
    task: tokio::task::JoinHandle<()>,
    status: Rc<RefCell<Option<String>>>,
}

impl PortForward {
    /// Starts one daemon-owned forward through the selected Connector.
    pub(crate) async fn start(client: &Client, agent: &str, spec: ForwardSpec) -> Result<Self, Error> {
        let runtime_spec = spec.clone().into_runtime()?;
        let mut session = client.start_port_forwards(agent, vec![runtime_spec]).await?;
        let binding = session
            .bindings
            .pop()
            .ok_or_else(|| Error::Invalid("port-forward response omitted its binding".into()))?;
        if !session.bindings.is_empty() {
            return Err(Error::Invalid("port-forward response returned extra bindings".into()));
        }
        let status = Rc::new(RefCell::new(None));
        let task_status = status.clone();
        let task = tokio::task::spawn_local(async move {
            loop {
                match session.events.next().await {
                    Ok(Some(PortForwardEvent::Status { index: 0, message })) => {
                        *task_status.borrow_mut() = message;
                    }
                    Ok(Some(PortForwardEvent::Stopped { index: 0, message })) => {
                        *task_status.borrow_mut() = Some(message.unwrap_or_else(|| "listener stopped".into()));
                        return;
                    }
                    Ok(Some(_)) => {
                        *task_status.borrow_mut() = Some("port-forward event has an invalid index".into());
                        return;
                    }
                    Ok(None) => {
                        *task_status.borrow_mut() = Some("port-forward stream ended".into());
                        return;
                    }
                    Err(error) => {
                        *task_status.borrow_mut() = Some(error.to_string());
                        return;
                    }
                }
            }
        });
        Ok(Self {
            spec,
            local_address: binding.local_address,
            task,
            status,
        })
    }

    pub(crate) const fn spec(&self) -> &ForwardSpec {
        &self.spec
    }

    pub(crate) const fn local_address(&self) -> std::net::SocketAddr {
        self.local_address
    }

    pub(crate) fn status(&self) -> Option<String> {
        self.status.borrow().clone()
    }
}

impl Drop for PortForward {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn parse_port(text: &str) -> Result<u16, String> {
    text.parse::<u16>().map_err(|_| format!("{text:?} is not a port"))
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
