//! Declarative Agent manifest and observed resource status.

use time::OffsetDateTime;

use ::sandbox::{
    ByteQuantity, Platform, RetentionPolicy, SandboxName, SandboxPath, SandboxResources, image::ImageSource,
    init::InitSystem, mount::Mount,
};
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
    /// Optional Agent-wide guidance installed through every declared Harness Adapter.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<InstructionsSpec>,
    /// Harness installations available to Sessions in this Agent.
    pub harnesses: Vec<HarnessSpec>,
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
    /// Host filesystem and in-memory attachments materialized with the Sandbox.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub mounts: Vec<MountSpec>,
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

    /// Converts validated, absolute Agent Mount inputs to the generic Sandbox SDK representation.
    #[must_use]
    pub fn resolved_mounts(&self) -> Vec<Mount> {
        self.mounts.iter().map(MountSpec::to_sandbox_mount).collect()
    }
}

/// One filesystem attachment declared by an Agent builder.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(
    deny_unknown_fields,
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "type"
)]
pub enum MountSpec {
    /// A caller-host directory mapped into the Sandbox.
    Bind {
        /// Host path, resolved relative to the manifest directory at apply time.
        source: std::path::PathBuf,
        /// Absolute path inside the Sandbox.
        target: SandboxPath,
        /// Whether the Sandbox may modify the host directory.
        read_only: bool,
    },
    /// Anonymous in-memory storage with an explicit capacity.
    Tmpfs {
        /// Absolute path inside the Sandbox.
        target: SandboxPath,
        /// Maximum storage capacity.
        capacity: ByteQuantity,
    },
}

impl MountSpec {
    const fn target(&self) -> &SandboxPath {
        match self {
            Self::Bind { target, .. } | Self::Tmpfs { target, .. } => target,
        }
    }

    fn to_sandbox_mount(&self) -> Mount {
        match self {
            Self::Bind {
                source,
                target,
                read_only,
            } => Mount::Bind {
                source: source.clone(),
                target: target.clone(),
                read_only: *read_only,
            },
            Self::Tmpfs { target, capacity } => Mount::Tmpfs {
                target: target.clone(),
                capacity: *capacity,
            },
        }
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
    /// Returns the declared installation for `kind`.
    #[must_use]
    pub fn harness(&self, kind: crate::Harness) -> Option<&HarnessSpec> {
        self.harnesses.iter().find(|harness| harness.kind == kind)
    }

    /// Returns the installation selected for a new Session without an explicit harness.
    #[must_use]
    pub fn default_harness(&self) -> Option<&HarnessSpec> {
        if self.harnesses.len() == 1 {
            self.harnesses.first()
        } else {
            self.harnesses.iter().find(|harness| harness.default)
        }
    }

    fn validate(&self) -> Result<(), Error> {
        let mut mount_targets = std::collections::BTreeSet::new();
        for (index, mount) in self.sandbox.mounts.iter().enumerate() {
            if let MountSpec::Bind { source, .. } = mount
                && source.as_os_str().is_empty()
            {
                return Err(Error::Invalid(format!(
                    "spec.sandbox.mounts[{index}].source must not be empty"
                )));
            }
            let target = mount.target().as_str();
            if !valid_sandbox_path(target) || !mount_targets.insert(target) {
                return Err(Error::Invalid(format!(
                    "spec.sandbox.mounts[{index}].target must be a unique absolute normalized Sandbox path"
                )));
            }
        }
        if self.home.source.as_os_str().is_empty() {
            return Err(Error::Invalid("spec.home.source must not be empty".into()));
        }
        if self
            .instructions
            .as_ref()
            .is_some_and(|instructions| instructions.source.as_os_str().is_empty())
        {
            return Err(Error::Invalid("spec.instructions.source must not be empty".into()));
        }
        if self.harnesses.is_empty() {
            return Err(Error::Invalid("spec.harnesses must not be empty".into()));
        }
        let mut harness_kinds = std::collections::BTreeSet::new();
        let mut duplicate_harness = None;
        let mut default_count = 0;
        for (index, harness) in self.harnesses.iter().enumerate() {
            if harness.version.as_deref().is_some_and(str::is_empty) {
                return Err(Error::Invalid(format!(
                    "spec.harnesses[{index}].version must not be empty"
                )));
            }
            if !harness_kinds.insert(harness.kind) {
                duplicate_harness = Some(harness.kind);
            }
            default_count += usize::from(harness.default);
        }
        if default_count > 1 || (self.harnesses.len() > 1 && default_count != 1) {
            return Err(Error::Invalid(
                "spec.harnesses must declare exactly one default when multiple harnesses are installed".into(),
            ));
        }
        if let Some(harness) = duplicate_harness {
            return Err(Error::Invalid(format!(
                "spec.harnesses contains duplicate harness kind {:?}",
                harness.as_str()
            )));
        }
        let mut environments = std::collections::BTreeSet::new();
        let mut placeholders = std::collections::BTreeSet::new();
        for (index, secret) in self.secrets.iter().enumerate() {
            let placeholder = secret.inert_value();
            if !valid_environment_variable(&secret.environment)
                || secret
                    .source
                    .as_deref()
                    .is_some_and(|source| !valid_environment_variable(source))
                || secret.placeholder.as_ref().is_some_and(String::is_empty)
                || self.harnesses.iter().any(|installation| {
                    harness::conflicts_with_managed_secret(
                        installation.kind,
                        &secret.environment,
                        secret.placeholder.as_deref(),
                    )
                })
                || secret.allowed_hosts.is_empty()
                || !environments.insert(&secret.environment)
                || !placeholders.insert(placeholder)
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

fn valid_sandbox_path(path: &str) -> bool {
    path.starts_with('/')
        && path != "/"
        && path
            .split('/')
            .skip(1)
            .all(|component| !component.is_empty() && component != "." && component != "..")
}

/// Host inputs synchronized into the sandbox user's home.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct HomeSpec {
    /// Host path, resolved relative to the manifest directory.
    pub source: std::path::PathBuf,
}

/// Harness-neutral Agent-wide instruction source.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct InstructionsSpec {
    /// Host file, resolved relative to the manifest directory.
    pub source: std::path::PathBuf,
}

/// One host-owned value exposed to Sandbox processes only as an inert environment placeholder.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SecretSpec {
    /// Guest environment variable and stable secret binding name.
    pub environment: String,
    /// Optional inert value; the selected Network Backend generates one when omitted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
    /// Hosts at which this secret may be substituted.
    pub allowed_hosts: Vec<String>,
    /// Optional variable name in the manifest directory's `.env`; defaults to `environment`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

impl SecretSpec {
    /// Returns the host `.env` variable that supplies the secret material.
    #[must_use]
    pub fn source(&self) -> &str {
        self.source.as_deref().unwrap_or(&self.environment)
    }

    /// Returns the explicit or provider-neutral generated value exposed inside the Sandbox.
    #[must_use]
    pub fn inert_value(&self) -> String {
        self.placeholder
            .clone()
            .unwrap_or_else(|| format!("$AGENT_SECRET_{}", self.environment))
    }
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

fn valid_environment_variable(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .enumerate()
            .all(|(index, byte)| byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit()))
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
