//! Backend-neutral sandbox lifecycle building blocks.
//!
//! This crate deliberately contains no agent automation. Higher layers may
//! compose these primitives without making CI users depend on agent code.

pub mod backend;
pub mod execution;
mod feature;
pub mod file_transfer;
pub mod image;
pub mod init;
pub mod memory;
pub mod mount;
mod name;
pub mod network;
mod path;
mod platform;
pub mod progress;
pub mod provider;
pub mod resource;
mod root_filesystem;
pub mod secret_store;
mod service;
pub mod terminal;
pub mod volume;

pub use backend::{LocalFuture, Sandbox, SandboxId, SandboxResources, SandboxState};
pub use feature::{SandboxCapabilities, SandboxFeature, SandboxFeatureSet};
pub use name::{InvalidSandboxName, MAX_SANDBOX_NAME_BYTES, SandboxName};
pub use path::SandboxPath;
pub use platform::Platform;
pub use progress::{
    OperationEvent, OutputStream, PendingOperation, PendingSandbox, PhaseOutcome, ProgressUnit, SandboxEvent,
    SandboxPhase, StepId,
};
pub use resource::{ByteQuantity, CpuQuantity, ParseQuantityError};
pub use root_filesystem::{RootFilesystem, RootFilesystemMode, RootFilesystemModeSet};
pub use service::{
    EnsureSandboxRequest, Error, ErrorKind, ResourceKind, RetentionPolicy, SandboxHandle, SandboxService, SandboxSpec,
};
