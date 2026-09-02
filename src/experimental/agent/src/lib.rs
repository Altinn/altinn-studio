//! Agent automation and the local declarative control plane.
//!
//! This crate depends on the generic Sandbox crates. The reverse dependency is
//! deliberately impossible in the workspace graph.

pub mod authorization;
pub mod control_api;
pub mod control_plane;
mod controller;
pub mod harness;
pub mod local;
pub mod manifest;
pub mod persistence;
pub mod platform_api;
pub mod sandbox;
pub mod sessions;

pub use control_plane::AgentId;
pub use harness::{Harness, HarnessAuthMode, HarnessSpec};
pub use manifest::{
    API_VERSION, Agent, Condition, ConditionStatus, HomeSpec, InstructionsSpec, KIND, Metadata, MountSpec,
    NetworkAllow, NetworkMode, NetworkSpec, PlatformManifestSpec, SandboxManifestSpec, SecretSpec, Spec, Status,
};

use thiserror::Error;

/// Errors exposed by the Agent control plane.
#[derive(Debug, Error)]
pub enum Error {
    /// The Agent resource is invalid.
    #[error("invalid Agent: {0}")]
    Invalid(String),
    /// The requested Agent does not exist.
    #[error("Agent not found")]
    NotFound,
    /// An immutable desired-state field changed.
    #[error("immutable Agent field changed: {0}")]
    Immutable(&'static str),
    /// A compare-and-swap operation observed a newer generation.
    #[error("Agent resource changed concurrently")]
    Conflict,
    /// Persistent control-plane state could not be read or written.
    #[error("control-plane database failed: {0}")]
    Database(String),
    /// Immutable Agent setup failed inside a running Sandbox.
    #[error("Agent Sandbox setup failed: {0}")]
    SandboxSetup(String),
    /// A generic Sandbox operation failed.
    #[error("Sandbox operation failed: {0}")]
    Sandbox(#[from] ::sandbox::Error),
    /// Session lifecycle or attachment failed.
    #[error("Session operation failed: {0}")]
    Session(String),
    /// Persistence or an established transport failed.
    #[error("I/O operation failed: {0}")]
    Io(#[from] std::io::Error),
    /// A required daemon subsystem stopped unexpectedly.
    #[error("Agent daemon subsystem failed: {0}")]
    Daemon(String),
    /// Agent CLI configuration could not be resolved or validated.
    #[error("Agent CLI configuration failed: {0}")]
    Configuration(String),
    /// The configured Agent Control API endpoint could not be opened.
    #[error("Agent Control API endpoint {endpoint} is unavailable: {source}")]
    ControlApiUnavailable {
        /// Endpoint whose initial connection failed.
        endpoint: String,
        /// Transport error returned while opening the connection.
        #[source]
        source: std::io::Error,
    },
    /// The client and daemon use incompatible Agent Control API versions.
    #[error("Agent Control API protocol mismatch: expected {expected}, received {actual}; restart agentd")]
    ControlApiVersion {
        /// Protocol version required by this client.
        expected: &'static str,
        /// Protocol version reported by the daemon.
        actual: String,
    },
    /// A JSON protocol document was invalid.
    #[error("invalid JSON: {0}")]
    Json(#[from] serde_json::Error),
    /// A YAML manifest was invalid.
    #[error("invalid YAML: {0}")]
    Yaml(#[from] serde_yaml_ng::Error),
    /// The Agent Control API returned a protocol-level error.
    #[error("Agent Control API error: {0}")]
    Rpc(#[from] control_api::ResponseError),
}
