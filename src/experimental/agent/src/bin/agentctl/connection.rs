use std::{path::Path, rc::Rc, time::Duration};

use agent::{
    Error,
    control_api::{Client, TcpConnector},
    local::home::ControlPlaneHome,
};

use super::{CommandError, CommandResult};

/// A selected daemon and, only for the default local connection, its host resources.
pub(super) struct ControlConnection {
    pub(super) client: Client,
    pub(super) home: Option<ControlPlaneHome>,
}

impl ControlConnection {
    pub(super) fn new(home: Option<&Path>, endpoint: Option<TcpConnector>) -> Result<Self, Error> {
        if let Some(endpoint) = endpoint {
            eprintln!(
                "WARNING: the TCP Control API has no authentication or encryption; use only a trusted development connection. Requests and responses may contain secrets."
            );
            Ok(Self {
                client: Client::new(Rc::new(endpoint)),
                home: None,
            })
        } else {
            let home = ControlPlaneHome::resolve(home)?;
            Ok(Self {
                client: Client::for_path(home.socket_path()),
                home: Some(home),
            })
        }
    }

    pub(super) fn local_home(&self) -> CommandResult<&ControlPlaneHome> {
        self.home.as_ref().ok_or_else(|| {
            CommandError::Message("this command requires the default local endpoint; omit --endpoint".into())
        })
    }

    pub(super) async fn ensure_daemon(&self) -> Result<(), Error> {
        if let Some(home) = &self.home {
            super::ensure_daemon(home, &self.client).await
        } else {
            // An explicitly selected daemon must already be running. Never
            // repair, upgrade, or start a daemon on the client's machine.
            tokio::time::timeout(Duration::from_secs(10), self.client.require_compatible_daemon())
                .await
                .map_err(|_| Error::Daemon("timed out checking the selected daemon; start agentd on its host and check endpoint reachability".into()))??;
            Ok(())
        }
    }
}
