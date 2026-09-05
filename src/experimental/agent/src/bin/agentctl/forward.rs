//! User-facing port-forward argument parsing.

use std::{cell::RefCell, net::IpAddr, rc::Rc};

use agent::{Error, control_api::Client, sandbox::PortForwardSpec};

/// Parses `GUEST`, `LOCAL:GUEST`, or `ADDRESS:LOCAL:GUEST`.
///
/// An empty local port (`:GUEST`) selects an ephemeral port.
pub(crate) fn parse_spec(text: &str) -> Result<PortForwardSpec, String> {
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
    PortForwardSpec::new(address, local_port, parse_port(guest)?).map_err(|error| error.to_string())
}

/// UI-owned handle keeping one daemon port forward alive.
pub(crate) struct PortForward {
    spec: PortForwardSpec,
    local_address: std::net::SocketAddr,
    task: tokio::task::JoinHandle<()>,
    status: Rc<RefCell<Option<String>>>,
}

impl PortForward {
    /// Starts one daemon-owned forward through the selected Connector.
    pub(crate) async fn start(client: &Client, agent: &str, spec: PortForwardSpec) -> Result<Self, Error> {
        let mut session = client.start_port_forwards(agent, vec![spec.clone()]).await?;
        let local_address = session.bindings()[0].local_address;
        let status = Rc::new(RefCell::new(None));
        let task_status = status.clone();
        let task = tokio::task::spawn_local(async move {
            loop {
                match session.next().await {
                    Ok(Some(event)) => {
                        let mut status = task_status.borrow_mut();
                        *status = event.message;
                        if event.stopped {
                            status.get_or_insert_with(|| "listener stopped".into());
                            return;
                        }
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
            local_address,
            task,
            status,
        })
    }

    pub(crate) const fn spec(&self) -> &PortForwardSpec {
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
        for (text, address, local, guest) in [
            ("80", [127, 0, 0, 1], 80, 80),
            ("9090:80", [127, 0, 0, 1], 9090, 80),
            ("0.0.0.0:80:80", [0, 0, 0, 0], 80, 80),
            (":80", [127, 0, 0, 1], 0, 80),
        ] {
            assert_eq!(
                parse_spec(text).expect("valid port mapping"),
                PortForwardSpec::new(address.into(), local, guest).expect("valid spec"),
            );
        }
        for invalid in ["web:80", "1:2:3:4", "8080:0", "65536:80"] {
            assert!(parse_spec(invalid).is_err(), "{invalid} must be rejected");
        }
    }
}
