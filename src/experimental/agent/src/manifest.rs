//! Declarative Agent manifest and observed resource status.

use time::OffsetDateTime;

use ::sandbox::{Platform, RetentionPolicy, SandboxName, SandboxResources, image::ImageSource, init::InitSystem};
use serde::{Deserialize, Serialize};

use crate::{Error, HarnessSpec, harness};

/// The first supported Agent manifest API version.
pub const API_VERSION: &str = "agents.platform/v1alpha1";
/// The manifest resource kind.
pub const KIND: &str = "Agent";

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
        SandboxName::new(self.metadata.name.clone())
            .map_err(|error| Error::Invalid(format!("metadata.name: {error}")))?;
        self.spec
            .sandbox
            .validate()
            .map_err(|error| Error::Invalid(format!("spec.sandbox: {error}")))?;
        self.spec.validate()
    }

    pub(crate) fn clear_managed_fields(&mut self) {
        self.metadata.generation = 0;
        self.metadata.deletion_timestamp = None;
        self.status = Status::default();
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
    pub sandbox: SandboxManifestSpec,
    /// Host directory synchronized into the sandbox user's home at bootstrap.
    pub home: HomeSpec,
    /// Harness installation and authentication behavior.
    pub harness: HarnessSpec,
    /// Host-owned values made available only through mediated requests.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub secrets: Vec<SecretSpec>,
    /// Sandbox egress mediation policy.
    pub network: NetworkSpec,
}

/// Sandbox settings as supplied by an Agent manifest.
///
/// Unlike the lower-layer [`sandbox::SandboxSpec`], this representation retains
/// an omitted architecture until the Agent creates the concrete Sandbox request.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SandboxManifestSpec {
    /// Source of the immutable Image.
    pub image: ImageSource,
    /// Desired platform constraints.
    pub platform: PlatformManifestSpec,
    /// Desired mutable compute and writable root filesystem resources.
    pub resources: SandboxResources,
    /// Process responsible for initializing the Sandbox after backend setup.
    #[serde(default)]
    pub init_system: InitSystem,
    /// Whether the Agent retains the Sandbox when releasing it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retention_policy: Option<RetentionPolicy>,
}

impl SandboxManifestSpec {
    fn validate(&self) -> Result<(), sandbox::Error> {
        self.image.validate()?;
        self.platform.validate()
    }

    /// Resolves manifest-relative sources and an omitted architecture for a concrete Provider request.
    #[must_use]
    pub fn resolve_from(&self, source_directory: &std::path::Path, default_architecture: &str) -> sandbox::SandboxSpec {
        sandbox::SandboxSpec {
            image: self.image.resolve_from(source_directory),
            platform: self.platform.resolve(default_architecture),
            resources: self.resources,
            init_system: self.init_system,
            retention_policy: self.resolved_retention_policy(),
        }
    }

    /// Returns the Agent-layer retention default used when the manifest omits it.
    #[must_use]
    pub fn resolved_retention_policy(&self) -> RetentionPolicy {
        self.retention_policy.unwrap_or(RetentionPolicy::Delete)
    }
}

/// Platform constraints retained exactly as supplied by an Agent manifest.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct PlatformManifestSpec {
    /// Operating system, such as `linux`.
    pub os: String,
    /// Optional CPU architecture; omission selects the provider's native architecture.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub architecture: Option<String>,
    /// Optional architecture variant.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant: Option<String>,
    /// Optional operating-system version constraint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub os_version: Option<String>,
    /// Required operating-system features.
    #[serde(default, skip_serializing_if = "std::collections::BTreeSet::is_empty")]
    pub os_features: std::collections::BTreeSet<String>,
}

impl PlatformManifestSpec {
    fn validate(&self) -> Result<(), sandbox::Error> {
        if self.os.is_empty() {
            return Err(sandbox::Error::invalid("platform.os", "must not be empty"));
        }
        if self.architecture.as_ref().is_some_and(String::is_empty) {
            return Err(sandbox::Error::invalid(
                "platform.architecture",
                "must not be empty when present",
            ));
        }
        if self.variant.as_ref().is_some_and(String::is_empty) {
            return Err(sandbox::Error::invalid(
                "platform.variant",
                "must not be empty when present",
            ));
        }
        if self.os_version.as_ref().is_some_and(String::is_empty) {
            return Err(sandbox::Error::invalid(
                "platform.osVersion",
                "must not be empty when present",
            ));
        }
        if self.os_features.contains("") {
            return Err(sandbox::Error::invalid(
                "platform.osFeatures",
                "must not contain an empty value",
            ));
        }
        Ok(())
    }

    fn resolve(&self, default_architecture: &str) -> Platform {
        Platform {
            os: self.os.clone(),
            architecture: self.architecture.clone().unwrap_or_else(|| default_architecture.into()),
            variant: self.variant.clone(),
            os_version: self.os_version.clone(),
            os_features: self.os_features.clone(),
        }
    }
}

impl Spec {
    fn validate(&self) -> Result<(), Error> {
        if self.home.source.as_os_str().is_empty() {
            return Err(Error::Invalid("spec.home.source must not be empty".into()));
        }
        if self.harness.version.is_empty() {
            return Err(Error::Invalid("spec.harness.version must not be empty".into()));
        }
        let mut names = std::collections::BTreeSet::new();
        let mut placeholders = std::collections::BTreeSet::new();
        for (index, secret) in self.secrets.iter().enumerate() {
            if secret.name.is_empty()
                || secret.placeholder.is_empty()
                || harness::conflicts_with_managed_secret(self.harness.kind, &secret.name, &secret.placeholder)
                || secret.source.is_empty()
                || secret.allowed_hosts.is_empty()
                || !names.insert(&secret.name)
                || !placeholders.insert(&secret.placeholder)
                || secret.allowed_hosts.iter().any(|host| !valid_host_pattern(host))
            {
                return Err(Error::Invalid(format!(
                    "spec.secrets[{index}] is invalid or duplicated"
                )));
            }
        }
        if self.network.deny.iter().any(|host| !valid_host_pattern(host)) {
            return Err(Error::Invalid(
                "spec.network.deny contains an invalid host pattern".into(),
            ));
        }
        Ok(())
    }
}

/// Host inputs synchronized into the sandbox user's home.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct HomeSpec {
    /// Host path, resolved relative to the manifest directory.
    pub source: std::path::PathBuf,
}

/// One value loaded from the manifest directory's environment file and retained on the host.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SecretSpec {
    /// Stable secret binding name.
    pub name: String,
    /// Inert value placed in sandbox-side configuration.
    pub placeholder: String,
    /// Hosts at which this secret may be substituted.
    pub allowed_hosts: Vec<String>,
    /// Environment variable name in the manifest directory's `.env` file.
    pub source: String,
}

/// Required network mediation mode.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NetworkMode {
    /// Route sandbox traffic through the trusted mediation backend.
    Mediated,
}

/// Baseline egress policy.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NetworkAllow {
    /// Permit network operations except explicitly denied hosts.
    All,
}

/// Agent-layer network policy interpreted by the host Policy Engine.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct NetworkSpec {
    /// Required mediation mode.
    pub mode: NetworkMode,
    /// Baseline egress decision.
    pub allow: NetworkAllow,
    /// Host patterns denied before the baseline decision.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub deny: Vec<String>,
}

fn valid_host_pattern(pattern: &str) -> bool {
    !pattern.is_empty()
        && !pattern.contains(['/', ':', '\\'])
        && pattern
            .strip_prefix("*.")
            .unwrap_or(pattern)
            .split('.')
            .all(|label| !label.is_empty() && label.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-'))
}

/// Most recently observed Agent state.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Status {
    /// Desired generation observed by the reconciler.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub observed_generation: u64,
    /// Sticky selected Provider and optional materialized Sandbox identity.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sandbox: Option<crate::sandbox::Assignment>,
    /// Normalized readiness conditions.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub conditions: Vec<Condition>,
}

impl Status {
    const fn is_empty(&self) -> bool {
        self.observed_generation == 0 && self.sandbox.is_none() && self.conditions.is_empty()
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

/// Decodes and validates a YAML or JSON Agent manifest.
///
/// # Errors
///
/// Returns an error when syntax, structure, or required values are invalid.
pub fn decode(bytes: &[u8]) -> Result<Agent, Error> {
    let agent: Agent = serde_yaml_ng::from_slice(bytes)?;
    agent.validate()?;
    Ok(agent)
}
