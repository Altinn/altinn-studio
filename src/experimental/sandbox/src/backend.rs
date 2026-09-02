//! Interfaces implemented by Sandbox Providers.
//!
//! Application code normally provisions through [`crate::SandboxService`] and
//! operates the resulting [`crate::SandboxHandle`].

use std::{collections::BTreeMap, future::Future, pin::Pin};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub use crate::feature::SandboxBackendCapabilities;

use crate::{
    Error, PendingOperation, Platform, RootFilesystem, SandboxName, SandboxPath, execution, file_transfer, image,
    init::InitSystem,
    mount::Mount,
    network,
    resource::{ByteQuantity, CpuQuantity},
    terminal, volume,
};

/// A non-`Send` future executed by a Tokio local runtime.
pub type LocalFuture<'a, T> = Pin<Box<dyn Future<Output = T> + 'a>>;

/// Identifies one materialization independently of backend-specific identifiers.
///
/// The Sandbox lifecycle service assigns a fresh ID before calling a Backend's
/// create operation. Deleting and recreating the same [`SandboxName`] produces
/// a different ID.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct SandboxId(Uuid);

impl SandboxId {
    pub(crate) fn generate() -> Self {
        Self(Uuid::new_v4())
    }

    /// Returns the UUID representation.
    #[must_use]
    pub const fn as_uuid(&self) -> &Uuid {
        &self.0
    }
}

impl std::fmt::Display for SandboxId {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(formatter)
    }
}

impl std::str::FromStr for SandboxId {
    type Err = uuid::Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        value.parse().map(Self)
    }
}

/// The lifecycle state reported by a sandbox backend.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SandboxState {
    /// The Sandbox exists but is not running.
    Stopped,
    /// The Sandbox is running.
    Running,
}

/// Desired compute and writable root filesystem resources assigned to one Sandbox.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SandboxResources {
    cpu: CpuQuantity,
    memory: ByteQuantity,
    root_filesystem: RootFilesystem,
}

impl SandboxResources {
    /// Creates a positive, normalized resource assignment.
    #[must_use]
    pub const fn new(cpu: CpuQuantity, memory: ByteQuantity, root_filesystem: RootFilesystem) -> Self {
        Self {
            cpu,
            memory,
            root_filesystem,
        }
    }

    /// Returns the desired CPU quantity.
    #[must_use]
    pub const fn cpu(self) -> CpuQuantity {
        self.cpu
    }

    /// Returns the desired Sandbox memory quantity.
    #[must_use]
    pub const fn memory(self) -> ByteQuantity {
        self.memory
    }

    /// Returns the desired writable root filesystem capacity.
    #[must_use]
    pub const fn root_filesystem(self) -> RootFilesystem {
        self.root_filesystem
    }
}

/// Materialized inputs passed to a sandbox backend.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreateSandboxRequest {
    /// Backend-neutral identity assigned by the lifecycle owner.
    pub id: SandboxId,
    /// The resolved image to run.
    pub image: image::ResolvedImage,
    /// The stable caller-provided name.
    pub name: SandboxName,
    /// Desired mutable compute and writable root filesystem resources.
    pub resources: SandboxResources,
    /// Process responsible for initializing the Sandbox after backend setup.
    pub init_system: InitSystem,
    /// Filesystem attachments materialized when the Sandbox is created.
    pub mounts: Vec<Mount>,
    /// Non-secret environment inherited by image init and Sandbox Executions.
    pub environment: BTreeMap<String, String>,
    /// Immutable Network attachment selected by the caller.
    pub network: Option<network::NetworkAttachment>,
}

/// A backend-neutral view of a materialized sandbox.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Sandbox {
    /// The image used to create this Sandbox.
    pub image: image::ResolvedImage,
    /// The stable backend-neutral identifier.
    pub id: SandboxId,
    /// The caller-provided name.
    pub name: SandboxName,
    /// Current desired compute and writable root filesystem resources.
    pub resources: SandboxResources,
    /// Process responsible for initializing the Sandbox after backend setup.
    pub init_system: InitSystem,
    /// The current lifecycle state.
    pub state: SandboxState,
    /// Filesystem attachments materialized in the Sandbox.
    pub mounts: Vec<Mount>,
    /// Non-secret environment inherited by image init and Sandbox Executions.
    pub environment: BTreeMap<String, String>,
    /// Immutable Network attachment materialized with the Sandbox.
    pub network: Option<network::NetworkAttachment>,
}

/// Provides core Sandbox lifecycle, execution, runtime file transfer, storage,
/// and mount behavior.
///
/// Network enforcement and agent automation intentionally remain outside this
/// interface. A Backend reports and opens data-plane endpoints that an
/// independently implemented [`network::NetworkBackend`] can consume.
pub trait SandboxBackend {
    /// Reports functionality implemented for a supported Platform.
    ///
    /// An offered endpoint must be the exclusive path for Sandbox egress. The
    /// Backend blocks traffic not represented by the selected endpoint rather
    /// than allowing it to bypass the Network Backend.
    fn capabilities<'a>(&'a self, platform: &'a Platform)
    -> LocalFuture<'a, Result<SandboxBackendCapabilities, Error>>;

    /// Creates a stopped Sandbox.
    fn create(&self, request: CreateSandboxRequest) -> PendingOperation<'_, Sandbox>;

    /// Reconciles the mutable resource assignment of an existing Sandbox.
    fn update_resources<'a>(&'a self, id: &'a SandboxId, resources: SandboxResources) -> PendingOperation<'a, Sandbox>;

    /// Replaces the non-secret environment of a stopped Sandbox.
    fn update_environment<'a>(
        &'a self,
        id: &'a SandboxId,
        environment: BTreeMap<String, String>,
    ) -> PendingOperation<'a, Sandbox>;

    /// Finds a Sandbox by its stable caller-provided name.
    fn find<'a>(&'a self, name: &'a SandboxName) -> LocalFuture<'a, Result<Sandbox, Error>>;

    /// Inspects a Sandbox by identifier.
    fn inspect<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<Sandbox, Error>>;

    /// Starts a Sandbox.
    fn start<'a>(&'a self, id: &'a SandboxId) -> PendingOperation<'a, ()>;

    /// Stops a Sandbox.
    fn stop<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>>;

    /// Deletes a Sandbox.
    fn delete<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>>;

    /// Opens the data-plane endpoint for the Sandbox's immutable Network attachment.
    fn open_network_endpoint<'a>(
        &'a self,
        id: &'a SandboxId,
    ) -> LocalFuture<'a, Result<network::NetworkEndpoint, Error>>;

    /// Starts an Execution with its SDK-assigned identity and opens its transient event stream.
    fn start_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: execution::StartExecutionRequest,
    ) -> LocalFuture<'a, Result<execution::StartedExecution, Error>>;

    /// Starts a terminal Execution with its SDK-assigned identity and bidirectional input and output.
    fn start_terminal_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: terminal::StartTerminalExecutionRequest,
    ) -> LocalFuture<'a, Result<terminal::StartedTerminalExecution, Error>>;

    /// Attaches the caller's terminal to an interactive Execution.
    fn attach_terminal<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: terminal::AttachTerminalRequest,
    ) -> LocalFuture<'a, Result<terminal::TerminalAttachOutcome, Error>>;

    /// Requests graceful termination of a live Execution.
    fn terminate_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        execution_id: &'a execution::ExecutionId,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Forces a live Execution to stop.
    fn kill_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        execution_id: &'a execution::ExecutionId,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Opens one regular file in a running Sandbox for streamed reading.
    fn read_file<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        path: &'a SandboxPath,
    ) -> LocalFuture<'a, Result<file_transfer::ByteReader, Error>>;

    /// Creates or replaces one regular file in a running Sandbox from a byte stream.
    fn write_file<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        path: &'a SandboxPath,
        contents: file_transfer::ByteReader,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Creates or returns a named Volume, using the SDK-assigned identity when materializing it.
    fn ensure_volume(&self, request: volume::EnsureVolumeRequest) -> LocalFuture<'_, Result<volume::Volume, Error>>;

    /// Finds a Volume by name.
    fn find_volume<'a>(&'a self, name: &'a volume::VolumeName) -> LocalFuture<'a, Result<volume::Volume, Error>>;

    /// Deletes a Volume.
    fn delete_volume<'a>(&'a self, id: &'a volume::VolumeId) -> LocalFuture<'a, Result<(), Error>>;
}
