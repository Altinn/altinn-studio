//! Agent automation and the local declarative control plane.
//!
//! This crate depends on the generic sandbox crate. The reverse dependency is
//! deliberately impossible in the workspace graph.

pub mod control_api;
pub mod control_plane;
pub mod home;
pub mod manifest;
pub mod provider_account;
pub mod session_api;

pub use agent_runtime_protocol as runtime_protocol;

use time::OffsetDateTime;

use sandbox::{SandboxId, SandboxName, SandboxSpec};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// The first supported Agent manifest API version.
pub const API_VERSION: &str = "agents.platform/v1alpha1";
/// The manifest resource kind.
pub const KIND: &str = "Agent";

/// Errors exposed by the agent control plane.
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
    /// A generic sandbox operation failed.
    #[error("sandbox operation failed: {0}")]
    Sandbox(#[from] sandbox::Error),
    /// Agent runtime automation failed.
    #[error("agent runtime operation failed: {0}")]
    Runtime(String),
    /// Local persistence or transport failed.
    #[error("I/O operation failed: {0}")]
    Io(#[from] std::io::Error),
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

/// Declarative resource accepted by the agent control plane.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Agent {
    /// Manifest schema version.
    pub api_version: String,
    /// Resource kind.
    pub kind: String,
    /// Resource identity and API-managed metadata.
    pub metadata: Metadata,
    /// Desired agent and sandbox configuration.
    pub spec: Spec,
    /// Most recently observed state.
    #[serde(default, skip_serializing_if = "Status::is_empty")]
    pub status: Status,
}

impl Agent {
    /// Validates fields required at every API boundary.
    ///
    /// # Errors
    ///
    /// Returns an error when the resource version, kind, name, or sandbox specification is invalid.
    pub fn validate(&self) -> Result<(), Error> {
        if self.api_version != API_VERSION {
            return Err(Error::Invalid(format!("apiVersion must be {API_VERSION:?}")));
        }
        if self.kind != KIND {
            return Err(Error::Invalid(format!("kind must be {KIND:?}")));
        }
        self.sandbox_name()?;
        self.spec
            .sandbox
            .validate()
            .map_err(|error| Error::Invalid(format!("spec.sandbox: {error}")))
    }

    pub(crate) fn clear_managed_fields(&mut self) {
        self.metadata.generation = 0;
        self.metadata.deletion_timestamp = None;
        self.status = Status::default();
    }

    pub(crate) fn sandbox_name(&self) -> Result<SandboxName, Error> {
        SandboxName::new(self.metadata.name.clone()).map_err(|error| Error::Invalid(format!("metadata.name: {error}")))
    }
}

/// Agent resource identity and API-managed metadata.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Metadata {
    /// Stable resource name.
    pub name: String,
    /// Desired-state revision managed by the control plane.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub generation: u64,
    /// Time at which asynchronous deletion was requested.
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "time::serde::rfc3339::option"
    )]
    pub deletion_timestamp: Option<OffsetDateTime>,
}

/// Desired agent settings and exactly one generic sandbox specification.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Spec {
    /// Generic sandbox configuration mapped to the lower-layer SDK.
    pub sandbox: SandboxSpec,
}

/// Most recently observed Agent state.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Status {
    /// Desired generation observed by the reconciler.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub observed_generation: u64,
    /// Materialized sandbox identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sandbox_id: Option<SandboxId>,
    /// Agent Runtime bundle version pinned to the materialized Sandbox.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime_version: Option<String>,
    /// Normalized readiness conditions.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub conditions: Vec<Condition>,
}

impl Status {
    const fn is_empty(&self) -> bool {
        self.observed_generation == 0
            && self.sandbox_id.is_none()
            && self.runtime_version.is_none()
            && self.conditions.is_empty()
    }
}

/// One aspect of observed Agent state.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Condition {
    /// Stable condition type.
    #[serde(rename = "type")]
    pub kind: String,
    /// Normalized truth value.
    pub status: ConditionStatus,
    /// Stable machine-readable reason.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub reason: String,
    /// Optional human-readable detail.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub message: String,
}

/// Truth value of an Agent condition.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum ConditionStatus {
    /// The condition is satisfied.
    True,
    /// The condition is not satisfied.
    False,
    /// The control plane cannot determine the value.
    Unknown,
}

#[allow(clippy::trivially_copy_pass_by_ref)]
const fn is_zero(value: &u64) -> bool {
    *value == 0
}
