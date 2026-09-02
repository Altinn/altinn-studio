//! Microsandbox integration for the Agent layer.

use std::{path::Path, rc::Rc};

use ::sandbox::{EnsureSandboxRequest, ErrorKind, LocalFuture, Platform, SandboxHandle, SandboxService, SandboxState};
use sandbox_microsandbox::{MicrosandboxNetworkBackend, MicrosandboxProvider};

use crate::{Error, authorization::AgentPolicyEngine, control_plane::AgentRecord, persistence};

mod execution;
mod forward;
mod preparation;
mod terminal;

pub(super) use execution::start_execution;
pub(super) use forward::guest_tcp_dialer;
pub use forward::{GuestConnection, GuestDialer};
pub use terminal::attach_terminal;

use preparation::Preparation;

use super::{Provider, ProviderEnsureOutcome, ProviderId};

pub(super) const PROVIDER_ID: &str = "microsandbox";

/// Sandbox-resolvable name of the Microsandbox Network Backend's host alias.
///
/// The Backend's DNS answers this name with the per-Sandbox gateway address
/// and rewrites gateway-bound connections to host loopback at dial time, so
/// this is how processes inside a Sandbox reach the Platform API endpoint.
pub const HOST_ALIAS: &str = "host.microsandbox.internal";

/// Runtime-selectable Agent adapter for a Microsandbox Provider.
pub struct Adapter {
    id: ProviderId,
    service: SandboxService,
    preparation: Preparation,
    default_architecture: String,
    platform_port: u16,
}

impl Adapter {
    /// Opens one configured Microsandbox Provider and its mediated Network Backend.
    ///
    /// # Errors
    ///
    /// Returns an error when Provider state cannot be opened.
    pub async fn open(
        home: &Path,
        database: persistence::Database,
        secret_store: Rc<dyn ::sandbox::secret_store::SecretStore>,
        policy: Rc<AgentPolicyEngine>,
        platform_port: u16,
    ) -> Result<Self, Error> {
        let provider = Rc::new(MicrosandboxProvider::open(home.join("microsandbox")).await?);
        let network = Rc::new(MicrosandboxNetworkBackend::new(policy.clone()).with_secret_store(secret_store));
        let service = SandboxService::new(provider).with_network_backend(network.clone());
        policy.set_platform_endpoint(HOST_ALIAS, platform_port);
        Ok(Self {
            id: ProviderId::new(PROVIDER_ID)?,
            service,
            preparation: Preparation::new(database, policy, network),
            default_architecture: Platform::native("linux").architecture,
            platform_port,
        })
    }

    /// Resolves a platform route to the URL reachable from this Provider's Sandboxes.
    ///
    /// # Errors
    ///
    /// Returns an error unless `path` is an absolute HTTP path.
    pub fn platform_url(&self, path: &str) -> Result<String, Error> {
        if !path.starts_with('/') || path.starts_with("//") {
            return Err(Error::Invalid(
                "platform endpoint path must start with exactly one '/'".into(),
            ));
        }
        Ok(format!("http://{HOST_ALIAS}:{}{path}", self.platform_port))
    }

    fn sandbox_spec(&self, record: &AgentRecord) -> ::sandbox::SandboxSpec {
        record
            .agent
            .spec
            .sandbox
            .resolve_from(&record.source_directory, &self.default_architecture)
    }

    fn sandbox_mounts(record: &AgentRecord) -> Vec<::sandbox::mount::Mount> {
        record.agent.spec.sandbox.resolved_mounts()
    }
}

impl Provider for Adapter {
    fn id(&self) -> &ProviderId {
        &self.id
    }

    fn supports<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<bool, Error>> {
        Box::pin(async move {
            match self.service.capabilities(&self.sandbox_spec(record).platform).await {
                Ok(capabilities) => Ok(Self::sandbox_mounts(record)
                    .iter()
                    .all(|mount| capabilities.mount_kinds().contains(mount.kind()))),
                Err(error) if error.kind() == ErrorKind::Unsupported => Ok(false),
                Err(error) => Err(error.into()),
            }
        })
    }

    fn ensure<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
        Box::pin(async move {
            let running_before = record
                .agent
                .status
                .sandbox
                .as_ref()
                .and_then(super::Assignment::id)
                .is_some_and(|id| self.preparation.network_is_running(id));
            let prepared = self.preparation.prepare(record).await?;
            let sandbox_name = record.sandbox_name()?;
            let runtime_restarted = match self.service.inspect(&sandbox_name).await {
                Ok(sandbox) => sandbox.state == SandboxState::Running && sandbox.environment != prepared.environment,
                Err(error) if error.is_not_found() => false,
                Err(error) => return Err(error.into()),
            };
            let request = EnsureSandboxRequest::new(sandbox_name, self.sandbox_spec(record))
                .with_mounts(Self::sandbox_mounts(record))
                .with_environment(prepared.environment);
            let mut sandbox = self.service.ensure(&request).await?;
            if prepared.bindings_changed && running_before {
                self.preparation.restart_network(&sandbox).await?;
                // Re-ensure starts the stopped Network with the replacement handshake bindings.
                sandbox = self.service.ensure(&request).await?;
            }
            Ok(ProviderEnsureOutcome {
                sandbox,
                runtime_restarted,
            })
        })
    }

    fn open<'a>(
        &'a self,
        record: &'a AgentRecord,
        id: &'a ::sandbox::SandboxId,
    ) -> LocalFuture<'a, Result<SandboxHandle, Error>> {
        Box::pin(async move {
            self.service
                .open(id, record.agent.spec.sandbox.resolved_retention_policy())
                .await
                .map_err(Error::from)
        })
    }

    fn release<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            let name = record.sandbox_name()?;
            self.service
                .release(&name, record.agent.spec.sandbox.resolved_retention_policy())
                .await?;
            self.preparation.remove(&name);
            Ok(())
        })
    }
}
