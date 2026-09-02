//! Daemon-owned host listeners forwarding TCP connections into Agent Sandboxes.

use std::{cell::RefCell, net::IpAddr, path::PathBuf, rc::Rc};

use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;

use crate::Error;

use super::{Assignment, ExecutionService, GuestDialer};

/// One requested host-to-guest port mapping.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct PortForwardSpec {
    address: IpAddr,
    local_port: u16,
    guest_port: u16,
}

impl PortForwardSpec {
    /// Creates a validated port-forward mapping.
    ///
    /// # Errors
    ///
    /// Returns an error when the guest port is zero.
    pub fn new(address: IpAddr, local_port: u16, guest_port: u16) -> Result<Self, Error> {
        if guest_port == 0 {
            return Err(Error::Invalid("guest port must not be zero".into()));
        }
        Ok(Self {
            address,
            local_port,
            guest_port,
        })
    }

    /// Returns the host interface address which accepts connections.
    #[must_use]
    pub const fn address(&self) -> IpAddr {
        self.address
    }

    /// Returns the requested host port; zero requests an ephemeral port.
    #[must_use]
    pub const fn local_port(&self) -> u16 {
        self.local_port
    }

    /// Returns the guest port receiving forwarded connections.
    #[must_use]
    pub const fn guest_port(&self) -> u16 {
        self.guest_port
    }
}

/// A bound host listener and its guest relay tasks.
pub struct PortForward {
    spec: PortForwardSpec,
    local: std::net::SocketAddr,
    task: tokio::task::JoinHandle<()>,
    status: Rc<RefCell<Option<String>>>,
}

/// Observable lifetime and status of one daemon-owned host listener.
pub trait RunningPortForward {
    /// Returns the requested mapping.
    fn spec(&self) -> &PortForwardSpec;

    /// Returns the bound host address, with an ephemeral port resolved.
    fn local_address(&self) -> std::net::SocketAddr;

    /// Returns the most recent relay failure, when one occurred.
    fn status(&self) -> Option<String>;

    /// Reports whether the listener has stopped serving.
    fn finished(&self) -> bool;
}

impl PortForward {
    async fn start(home: PathBuf, assignment: Assignment, spec: PortForwardSpec) -> Result<Self, Error> {
        let listener = TcpListener::bind((spec.address, spec.local_port)).await?;
        let local = listener.local_addr()?;
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
    #[must_use]
    pub const fn spec(&self) -> &PortForwardSpec {
        &self.spec
    }

    /// Returns the bound host address, with an ephemeral port resolved.
    #[must_use]
    pub const fn local_address(&self) -> std::net::SocketAddr {
        self.local
    }

    /// Returns the most recent relay failure, when one occurred.
    #[must_use]
    pub fn status(&self) -> Option<String> {
        self.status.borrow().clone()
    }

    /// Reports whether the listener has stopped serving.
    #[must_use]
    pub fn finished(&self) -> bool {
        self.task.is_finished()
    }
}

impl Drop for PortForward {
    fn drop(&mut self) {
        self.task.abort();
    }
}

impl RunningPortForward for PortForward {
    fn spec(&self) -> &PortForwardSpec {
        self.spec()
    }

    fn local_address(&self) -> std::net::SocketAddr {
        self.local_address()
    }

    fn status(&self) -> Option<String> {
        self.status()
    }

    fn finished(&self) -> bool {
        self.finished()
    }
}

/// Starts port forwards after converging their owning Agent.
pub struct PortForwardService {
    home: PathBuf,
    executions: Rc<ExecutionService>,
}

impl PortForwardService {
    /// Creates the daemon-owned port-forward service.
    #[must_use]
    pub const fn new(home: PathBuf, executions: Rc<ExecutionService>) -> Self {
        Self { home, executions }
    }

    /// Starts every requested mapping against one exact ready Sandbox.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent cannot converge or any listener cannot
    /// bind. Already-started listeners are stopped if a later bind fails.
    pub async fn start(
        &self,
        agent: &str,
        specs: Vec<PortForwardSpec>,
    ) -> Result<Vec<Rc<dyn RunningPortForward>>, Error> {
        if specs.is_empty() {
            return Err(Error::Invalid("at least one port mapping is required".into()));
        }
        let target = self.executions.ensure(agent).await?;
        let mut forwards = Vec::with_capacity(specs.len());
        for spec in specs {
            if spec.guest_port == 0 {
                return Err(Error::Invalid("guest port must not be zero".into()));
            }
            let forward = PortForward::start(self.home.clone(), target.sandbox.clone(), spec).await?;
            forwards.push(Rc::new(forward) as Rc<dyn RunningPortForward>);
        }
        Ok(forwards)
    }
}

async fn accept_loop(
    home: PathBuf,
    assignment: Assignment,
    guest_port: u16,
    listener: TcpListener,
    status: Rc<RefCell<Option<String>>>,
) {
    let mut dialer: Option<Rc<GuestDialer>> = None;
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
            match super::guest_tcp_dialer(&home, &assignment).await {
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
