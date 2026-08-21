//! Declarative Agent storage, reconciliation, and continuous repair.

mod controller;
pub mod memory;
mod reconciler;
mod service;

use std::rc::Rc;

use sandbox::{
    EnsureSandboxRequest, LocalFuture, Platform, RetentionPolicy, Sandbox, SandboxFeatureSet, SandboxName,
    SandboxService, mount::Mount,
};

use crate::{Agent, Error, Status};

pub use controller::{Controller, ErrorHandler, Wakeup};
pub use reconciler::Reconciler;
pub use service::{ApplyRequest, ControlPlane, Notifier};

/// Stored desired and observed Agent state plus local source provenance.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgentRecord {
    /// Absolute directory against which manifest-relative sources are resolved.
    pub source_directory: std::path::PathBuf,
    /// Desired state and most recently observed status.
    pub agent: Agent,
}

/// Separates desired-state writes from reconciler status writes using generation checks.
pub trait AgentStore {
    /// Gets an Agent record by name.
    fn get<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>>;

    /// Lists an independent snapshot of every record.
    fn list(&self) -> LocalFuture<'_, Result<Vec<AgentRecord>, Error>>;

    /// Creates or replaces desired state if the stored generation still matches.
    fn put(&self, record: AgentRecord, expected_generation: u64) -> LocalFuture<'_, Result<(), Error>>;

    /// Replaces observed state if the reconciled generation is still current.
    fn update_status<'a>(
        &'a self,
        name: &'a str,
        generation: u64,
        status: Status,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Atomically records the first deletion request.
    fn mark_deleting<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>>;

    /// Removes a record if its desired generation has not changed.
    fn delete<'a>(&'a self, name: &'a str, generation: u64) -> LocalFuture<'a, Result<(), Error>>;
}

/// Narrow generic Sandbox SDK behavior required by Agent reconciliation.
pub trait SandboxApi {
    /// Ensures a desired Sandbox is running.
    fn ensure<'a>(&'a self, request: &'a EnsureSandboxRequest) -> LocalFuture<'a, Result<Sandbox, Error>>;

    /// Releases a materialized Sandbox according to its retention policy.
    fn release<'a>(&'a self, name: &'a SandboxName, retention: RetentionPolicy) -> LocalFuture<'a, Result<(), Error>>;
}

impl SandboxApi for SandboxService {
    fn ensure<'a>(&'a self, request: &'a EnsureSandboxRequest) -> LocalFuture<'a, Result<Sandbox, Error>> {
        Box::pin(async move {
            Self::ensure(self, request)
                .await
                .map(|handle| handle.snapshot().clone())
                .map_err(Error::from)
        })
    }

    fn release<'a>(&'a self, name: &'a SandboxName, retention: RetentionPolicy) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { Self::release(self, name, retention).await.map_err(Error::from) })
    }
}

/// Materialized inputs for one internally selected Agent Runtime bundle.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgentRuntimeBundle {
    /// Immutable bundle version reported by the Agent Runtime handshake.
    pub version: String,
    /// Read-only runtime bind and any related Sandbox attachments.
    pub mounts: Vec<Mount>,
    /// Sandbox Features required by this runtime bundle.
    pub required_features: SandboxFeatureSet,
}

impl AgentRuntimeBundle {
    /// Creates an empty materialized bundle with one immutable version.
    #[must_use]
    pub fn new(version: impl Into<String>) -> Self {
        Self {
            version: version.into(),
            mounts: Vec::new(),
            required_features: SandboxFeatureSet::new(),
        }
    }
}

/// Selects the control-plane-owned Agent Runtime bundle for a requested Sandbox Platform.
pub trait AgentRuntimeBundleResolver {
    /// Resolves a platform-specific bundle, preserving `pinned_version` when present.
    fn resolve<'a>(
        &'a self,
        platform: &'a Platform,
        pinned_version: Option<&'a str>,
    ) -> LocalFuture<'a, Result<AgentRuntimeBundle, Error>>;
}

/// Communicates with the sandbox-resident Agent Runtime over its versioned protocol.
pub trait AgentRuntimeClient {
    /// Verifies that the Agent Runtime is ready after the Sandbox has started.
    fn verify_ready<'a>(&'a self, agent: &'a Agent, sandbox: &'a Sandbox) -> LocalFuture<'a, Result<(), Error>>;
}

pub(crate) type SharedAgentStore = Rc<dyn AgentStore>;
