//! Declarative Agent manifest and observed resource status.

use std::path::{Component, Path, PathBuf};

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
/// Manifest kind used for a partial Agent configuration.
pub const VARIANT_KIND: &str = "AgentVariant";
/// Maximum number of manifests in one inheritance chain, including the complete Agent.
pub const MAX_VARIANT_CHAIN: usize = 16;

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

/// A partial Agent manifest that inherits from a sibling manifest.
///
/// `metadata` and `spec` remain YAML values until they have been merged with a
/// complete Agent. The expanded document is then decoded through [`Agent`], so
/// nested unknown fields are rejected by the same strict contract.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AgentVariant {
    /// Manifest schema version, which must match every manifest in the chain.
    pub api_version: String,
    /// Resource kind. Always [`VARIANT_KIND`].
    pub kind: String,
    /// Sibling manifest filename inherited by this variant.
    pub extends: String,
    /// Partial resource metadata. `name` is required in every variant.
    pub metadata: serde_yaml_ng::Value,
    /// Partial desired Agent configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spec: Option<serde_yaml_ng::Value>,
}

/// Validated selector identifying an `agent.<variant>.yaml` leaf.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(try_from = "String", into = "String")]
pub struct AgentVariantName(String);

impl AgentVariantName {
    /// Creates a validated Agent variant name.
    ///
    /// # Errors
    ///
    /// Returns an error unless the name matches `[a-z0-9]+(?:-[a-z0-9]+)*`.
    pub fn new(value: impl Into<String>) -> Result<Self, Error> {
        let value = value.into();
        if value.is_empty()
            || !value.split('-').all(|part| {
                !part.is_empty()
                    && part
                        .bytes()
                        .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
            })
        {
            return Err(Error::Invalid("variant must match [a-z0-9]+(?:-[a-z0-9]+)*".into()));
        }
        Ok(Self(value))
    }

    /// Returns the selector text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Returns the conventional leaf filename for this variant.
    #[must_use]
    pub fn filename(&self) -> String {
        format!("agent.{self}.yaml")
    }
}

impl TryFrom<String> for AgentVariantName {
    type Error = Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl From<AgentVariantName> for String {
    fn from(value: AgentVariantName) -> Self {
        value.0
    }
}

impl std::str::FromStr for AgentVariantName {
    type Err = Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::new(value)
    }
}

impl std::fmt::Display for AgentVariantName {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl AsRef<str> for AgentVariantName {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

/// A leaf manifest expanded to the complete Agent sent to the control plane.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResolvedManifest {
    /// Expanded and strictly validated Agent.
    pub agent: Agent,
    /// Manifest paths from the leaf through to the complete base Agent.
    pub chain: Vec<PathBuf>,
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
    /// Agent-wide guidance installed through every declared Harness Adapter, concatenated in order.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub instructions: Vec<InstructionsSpec>,
    /// Skill directories installed through every declared Harness Adapter.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub skills: Vec<SkillSpec>,
    /// Harness installations available to Sessions in this Agent.
    pub harnesses: Vec<HarnessSpec>,
    /// Deliberately selected non-secret values exposed in plaintext inside the Sandbox.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub environment: Vec<EnvironmentSpec>,
    /// Host-owned values made available only through mediated requests.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub secrets: Vec<SecretSpec>,
    /// Ways the Agent's user reaches into the Sandbox besides Sessions and `exec`.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub access: Vec<AccessSpec>,
    /// Sandbox egress mediation policy.
    pub network: NetworkSpec,
}

/// One access capability the platform provides to the Agent's user.
///
/// Access is an Agent-level capability like `harnesses` and `secrets`: the
/// platform owns the guest user, the transport and the key material, so a
/// variant carries no tunables.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub enum AccessSpec {
    /// OpenSSH access as the platform-owned guest user, reached through `agentctl ssh`.
    ///
    /// A struct variant so that `deny_unknown_fields` rejects tunables; serde
    /// does not enforce it for unit variants of an internally tagged enum.
    Ssh {},
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

    /// Returns whether the Agent declares SSH access.
    #[must_use]
    pub fn ssh_access(&self) -> bool {
        self.access.contains(&AccessSpec::Ssh {})
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
        if let Some(index) = self
            .instructions
            .iter()
            .position(|instructions| instructions.source.as_os_str().is_empty())
        {
            return Err(Error::Invalid(format!(
                "spec.instructions[{index}].source must not be empty"
            )));
        }
        self.validate_skills()?;
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
        self.validate_environment()?;
        self.validate_secrets()?;
        let mut access = std::collections::BTreeSet::new();
        if let Some(index) = self.access.iter().position(|capability| !access.insert(*capability)) {
            return Err(Error::Invalid(format!(
                "spec.access[{index}] duplicates an access capability"
            )));
        }
        if self.network.deny.iter().any(|host| !valid_host_pattern(host)) {
            return Err(Error::Invalid(
                "spec.network.deny contains an invalid host pattern".into(),
            ));
        }
        Ok(())
    }
}

impl Spec {
    fn validate_secrets(&self) -> Result<(), Error> {
        let mut environments = self
            .environment
            .iter()
            .map(|variable| variable.name.as_str())
            .collect::<std::collections::BTreeSet<_>>();
        let environment_sources = self
            .environment
            .iter()
            .map(EnvironmentSpec::source)
            .collect::<std::collections::BTreeSet<_>>();
        let mut placeholders = std::collections::BTreeSet::new();
        for (index, secret) in self.secrets.iter().enumerate() {
            let placeholder = secret.inert_value();
            if environments.contains(secret.environment.as_str()) || environment_sources.contains(secret.source()) {
                return Err(Error::Invalid(format!(
                    "spec.environment collides with spec.secrets[{index}]"
                )));
            }
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
        Ok(())
    }

    fn validate_environment(&self) -> Result<(), Error> {
        let mut names = std::collections::BTreeSet::new();
        for (index, variable) in self.environment.iter().enumerate() {
            if !valid_environment_variable(&variable.name)
                || variable
                    .source
                    .as_deref()
                    .is_some_and(|source| !valid_environment_variable(source))
                || self
                    .harnesses
                    .iter()
                    .any(|installation| harness::manages_environment(installation.kind, &variable.name))
                || !names.insert(variable.name.as_str())
            {
                return Err(Error::Invalid(format!(
                    "spec.environment[{index}] is invalid, duplicated, or managed by a declared harness"
                )));
            }
        }
        let has_git_name = names.contains("GIT_USER_NAME");
        let has_git_email = names.contains("GIT_USER_EMAIL");
        if has_git_name != has_git_email {
            return Err(Error::Invalid(
                "spec.environment must declare GIT_USER_NAME and GIT_USER_EMAIL together".into(),
            ));
        }
        Ok(())
    }

    fn validate_skills(&self) -> Result<(), Error> {
        let mut skill_names = std::collections::BTreeSet::new();
        for (index, skill) in self.skills.iter().enumerate() {
            let Some(name) = skill.name() else {
                return Err(Error::Invalid(format!(
                    "spec.skills[{index}] must declare a name or use a source ending in the skill's directory name"
                )));
            };
            if name.is_empty() || name == "." || name == ".." || name.contains('/') || name.contains('\\') {
                return Err(Error::Invalid(format!("spec.skills[{index}].name is invalid")));
            }
            if !skill_names.insert(name) {
                return Err(Error::Invalid(format!(
                    "spec.skills[{index}] duplicates skill {name:?}"
                )));
            }
        }
        Ok(())
    }
}

/// One explicitly selected non-secret value copied from the Agent environment file.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct EnvironmentSpec {
    /// Environment variable exposed inside the Sandbox.
    pub name: String,
    /// Optional variable name in the Agent environment file; defaults to `name`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

impl EnvironmentSpec {
    /// Returns the environment-file variable that supplies the plaintext value.
    #[must_use]
    pub fn source(&self) -> &str {
        self.source.as_deref().unwrap_or(&self.name)
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

/// One harness-neutral instruction file; several are concatenated in manifest order.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct InstructionsSpec {
    /// Host file, resolved relative to the manifest directory.
    pub source: std::path::PathBuf,
}

/// One skill directory installed for every declared harness.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SkillSpec {
    /// Host directory holding `SKILL.md`, resolved relative to the manifest directory.
    pub source: std::path::PathBuf,
    /// Installed skill directory name; defaults to the source directory name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

impl SkillSpec {
    /// Returns the explicit skill name or the final component of the source directory.
    #[must_use]
    pub fn name(&self) -> Option<&str> {
        self.name.as_deref().or_else(|| {
            self.source
                .file_name()?
                .to_str()
                .filter(|name| !name.is_empty() && *name != ".")
        })
    }
}

/// One host-owned value exposed to Sandbox processes only as an inert environment placeholder.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SecretSpec {
    /// Guest environment variable and stable secret binding name.
    pub environment: String,
    /// Whether a missing or empty environment-file value omits this binding.
    #[serde(default, skip_serializing_if = "is_false")]
    pub optional: bool,
    /// Optional inert value; the selected Network Backend generates one when omitted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
    /// Hosts at which this secret may be substituted.
    pub allowed_hosts: Vec<String>,
    /// Optional variable name in the manifest directory's `.env`; defaults to `environment`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[allow(clippy::trivially_copy_pass_by_ref)]
const fn is_false(value: &bool) -> bool {
    !*value
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
///
/// Unlike the rest of the manifest, unknown fields are tolerated so an older
/// client can read responses from a newer control plane; status is
/// API-managed and never authored by hand.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
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
    /// Classification of the reconciliation pass that recorded these
    /// conditions, when it failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failure: Option<crate::FailureKind>,
    /// Provisioning of the latest pass while it runs or after it failed.
    /// Projected onto API responses from the daemon's in-memory state; stores
    /// scrub it, so it is never persisted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub progress: Option<crate::progress::Provisioning>,
    /// Local origin of the desired state. Projected onto API responses from
    /// the stored Agent record; stores scrub it, so it is never persisted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provenance: Option<Provenance>,
}

impl Status {
    /// Creates reconciler-observed state; progress and provenance stay API-projected.
    #[must_use]
    pub const fn observed(
        observed_generation: u64,
        sandbox: Option<crate::sandbox::Assignment>,
        conditions: Vec<Condition>,
    ) -> Self {
        Self {
            observed_generation,
            sandbox,
            conditions,
            failure: None,
            progress: None,
            provenance: None,
        }
    }

    const fn is_empty(&self) -> bool {
        self.observed_generation == 0
            && self.sandbox.is_none()
            && self.conditions.is_empty()
            && self.failure.is_none()
            && self.progress.is_none()
            && self.provenance.is_none()
    }

    /// Carries each condition's transition time forward from `previous`, the
    /// stored status being replaced, and stamps `now` on conditions whose
    /// status or reason changed.
    ///
    /// A message-only change is not a transition, so a retry that reports a
    /// different error detail keeps the time the condition entered its state.
    pub fn stamp_transitions(&mut self, previous: &Self, now: OffsetDateTime) {
        for condition in &mut self.conditions {
            let earlier = previous
                .conditions
                .iter()
                .find(|earlier| earlier.kind == condition.kind);
            condition.last_transition_time = match earlier {
                Some(earlier) if earlier.status == condition.status && earlier.reason == condition.reason => {
                    earlier.last_transition_time
                }
                _ => Some(now),
            };
        }
    }

    /// Returns the `Ready` condition when the reconciler has reported one.
    #[must_use]
    pub fn ready_condition(&self) -> Option<&Condition> {
        Condition::find_ready(&self.conditions)
    }

    /// Returns whether the reconciler reported `Ready=True`.
    #[must_use]
    pub fn is_ready(&self) -> bool {
        Condition::any_ready(&self.conditions)
    }

    /// Returns the failure detail when desired state must change before
    /// another pass can succeed.
    #[must_use]
    pub fn invalid(&self) -> Option<String> {
        if self.failure != Some(crate::FailureKind::Invalid) {
            return None;
        }
        self.ready_condition()
            .or_else(|| self.conditions.first())
            .map(Condition::detail)
    }
}

impl Condition {
    /// Condition type summarizing whether the Agent can serve Sessions and Executions.
    pub const READY: &'static str = "Ready";
    /// Condition type for the Sandbox lifecycle underneath `Ready`.
    pub const SANDBOX_READY: &'static str = "SandboxReady";
    /// Condition type for declared SSH access underneath `Ready`.
    pub const SSH_READY: &'static str = "SshReady";

    /// Finds the `Ready` condition in a condition list.
    #[must_use]
    pub fn find_ready(conditions: &[Self]) -> Option<&Self> {
        conditions.iter().find(|condition| condition.kind == Self::READY)
    }

    /// Returns whether a condition list reports `Ready=True`.
    #[must_use]
    pub fn any_ready(conditions: &[Self]) -> bool {
        Self::find_ready(conditions).is_some_and(|condition| condition.status == ConditionStatus::True)
    }

    /// Returns `reason: message`, or whichever of the two is present, or `Unknown`.
    #[must_use]
    pub fn summary(&self) -> String {
        match (self.reason.is_empty(), self.message.is_empty()) {
            (false, false) => format!("{}: {}", self.reason, self.message),
            (false, true) => self.reason.clone(),
            (true, false) => self.message.clone(),
            (true, true) => "Unknown".to_owned(),
        }
    }

    /// Returns the human-readable message, falling back to the reason.
    #[must_use]
    pub fn detail(&self) -> String {
        if self.message.is_empty() {
            self.reason.clone()
        } else {
            self.message.clone()
        }
    }
}

/// Conventional Agent manifest filename, used when a record predates path recording.
pub const MANIFEST_FILE: &str = "agent.yaml";

/// Local origin of an Agent's desired state.
///
/// Part of [`Status`], so unknown fields are tolerated for the same reason.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provenance {
    /// Absolute directory against which manifest-relative sources are resolved.
    pub source_directory: std::path::PathBuf,
    /// Absolute path of the manifest last applied, when the client reported it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub manifest_path: Option<std::path::PathBuf>,
    /// Absolute path of the secret file, when it is not `.env` beside the manifest.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub env_file: Option<std::path::PathBuf>,
}

impl Provenance {
    /// Returns the recorded manifest path, falling back to [`MANIFEST_FILE`]
    /// in the source directory for records that predate path recording.
    #[must_use]
    pub fn manifest_or_default(&self) -> std::path::PathBuf {
        self.manifest_path
            .clone()
            .unwrap_or_else(|| self.source_directory.join(MANIFEST_FILE))
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
    /// When `status` or `reason` last changed. Stamped by the store; absent on
    /// conditions recorded before transition times were tracked, until their
    /// next transition.
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "time::serde::rfc3339::option"
    )]
    pub last_transition_time: Option<OffsetDateTime>,
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

/// Expands a complete Agent or chained Agent variant from `path`.
///
/// Variant bases are restricted to conventional sibling filenames. Mappings
/// merge recursively, arrays and scalars replace inherited values, and `null`
/// removes inherited fields.
///
/// # Errors
///
/// Returns an error when a manifest cannot be read, a variant chain is invalid,
/// or the expanded Agent does not satisfy the strict Agent contract.
pub fn resolve(path: &Path) -> Result<ResolvedManifest, Error> {
    let leaf = absolute_lexical(path)?;
    let mut chain = Vec::new();
    let mut versions = Vec::new();
    let value = resolve_value(&leaf, &mut chain, &mut versions).map_err(|error| with_chain(error, &chain))?;
    let bytes = serde_yaml_ng::to_string(&value).map_err(Error::Yaml)?;
    let agent = decode(bytes.as_bytes()).map_err(|error| manifest_error(&leaf, "expanded Agent", &error))?;
    Ok(ResolvedManifest { agent, chain })
}

/// Extracts a variant selector from a conventional leaf filename.
#[must_use]
pub fn variant_from_filename(path: &Path) -> Option<AgentVariantName> {
    let name = path.file_name()?.to_str()?;
    let variant = name.strip_prefix("agent.")?.strip_suffix(".yaml")?;
    variant.parse().ok()
}

/// Returns whether a filename is a conventional Agent or Agent variant manifest.
#[must_use]
pub fn is_manifest_filename(path: &Path) -> bool {
    path.file_name().is_some_and(|name| name == MANIFEST_FILE) || variant_from_filename(path).is_some()
}

fn resolve_value(
    path: &Path,
    chain: &mut Vec<PathBuf>,
    versions: &mut Vec<(PathBuf, String)>,
) -> Result<serde_yaml_ng::Value, Error> {
    if let Some(start) = chain.iter().position(|candidate| candidate == path) {
        let cycle = chain[start..]
            .iter()
            .map(PathBuf::as_path)
            .chain(std::iter::once(path))
            .map(display_leaf)
            .collect::<Vec<_>>()
            .join(" -> ");
        return Err(Error::Invalid(format!("variant inheritance cycle: {cycle}")));
    }
    if chain.len() == MAX_VARIANT_CHAIN {
        return Err(Error::Invalid(format!(
            "{}: variant inheritance exceeds {MAX_VARIANT_CHAIN} manifests",
            display_leaf(path)
        )));
    }

    chain.push(path.to_path_buf());

    let bytes = std::fs::read(path)
        .map_err(|error| Error::Invalid(format!("{}: could not read manifest: {error}", display_leaf(path))))?;
    let value: serde_yaml_ng::Value = serde_yaml_ng::from_slice(&bytes)
        .map_err(|error| Error::Invalid(format!("{}: {error}", display_leaf(path))))?;
    let mapping = value
        .as_mapping()
        .ok_or_else(|| Error::Invalid(format!("{}: manifest must be a mapping", display_leaf(path))))?;
    let version = string_field(mapping, "apiVersion", path)?;
    let kind = string_field(mapping, "kind", path)?;
    if let Some((version_path, expected)) = versions.first()
        && version != *expected
    {
        return Err(Error::Invalid(format!(
            "{}: apiVersion {version:?} does not match {} ({expected:?})",
            display_leaf(path),
            display_leaf(version_path)
        )));
    }
    versions.push((path.to_path_buf(), version));
    match kind.as_str() {
        KIND => {
            decode(&bytes).map_err(|error| manifest_error(path, "complete Agent", &error))?;
            Ok(value)
        }
        VARIANT_KIND => {
            if variant_from_filename(path).is_none() {
                return Err(Error::Invalid(format!(
                    "{}: AgentVariant filename must match agent.<variant>.yaml",
                    display_leaf(path)
                )));
            }
            let variant: AgentVariant = serde_yaml_ng::from_slice(&bytes)
                .map_err(|error| Error::Invalid(format!("{}: {error}", display_leaf(path))))?;
            validate_variant(&variant, path)?;
            let base = sibling_base(path, &variant.extends)?;
            let mut inherited = resolve_value(&base, chain, versions)?;
            let mut overlay = value;
            let overlay_mapping = overlay
                .as_mapping_mut()
                .ok_or_else(|| Error::Invalid(format!("{}: manifest must be a mapping", display_leaf(path))))?;
            overlay_mapping.remove(serde_yaml_ng::Value::String("extends".into()));
            overlay_mapping.insert(
                serde_yaml_ng::Value::String("kind".into()),
                serde_yaml_ng::Value::String(KIND.into()),
            );
            merge_value(&mut inherited, overlay);
            let expanded = serde_yaml_ng::to_string(&inherited).map_err(Error::Yaml)?;
            decode(expanded.as_bytes()).map_err(|error| manifest_error(path, "expanded variant", &error))?;
            Ok(inherited)
        }
        _ => Err(Error::Invalid(format!(
            "{}: kind must be {KIND:?} or {VARIANT_KIND:?}",
            display_leaf(path)
        ))),
    }
}

fn validate_variant(variant: &AgentVariant, path: &Path) -> Result<(), Error> {
    if variant.api_version != API_VERSION {
        return Err(Error::Invalid(format!(
            "{}: apiVersion must be {API_VERSION:?}",
            display_leaf(path)
        )));
    }
    if variant.kind != VARIANT_KIND {
        return Err(Error::Invalid(format!(
            "{}: kind must be {VARIANT_KIND:?}",
            display_leaf(path)
        )));
    }
    let metadata = variant
        .metadata
        .as_mapping()
        .ok_or_else(|| Error::Invalid(format!("{}: metadata must be a mapping", display_leaf(path))))?;
    let name = string_field(metadata, "name", path).map_err(|_| {
        Error::Invalid(format!(
            "{}: metadata.name must be explicitly specified",
            display_leaf(path)
        ))
    })?;
    if name.is_empty() {
        return Err(Error::Invalid(format!(
            "{}: metadata.name must be explicitly specified",
            display_leaf(path)
        )));
    }
    if let Some(spec) = &variant.spec
        && !spec.is_mapping()
    {
        return Err(Error::Invalid(format!(
            "{}: spec must be a mapping",
            display_leaf(path)
        )));
    }
    Ok(())
}

fn sibling_base(path: &Path, extends: &str) -> Result<PathBuf, Error> {
    let base = Path::new(extends);
    let one_normal_component = {
        let mut components = base.components();
        matches!(components.next(), Some(Component::Normal(_))) && components.next().is_none()
    };
    if !one_normal_component || !is_manifest_filename(base) {
        return Err(Error::Invalid(format!(
            "{}: extends must name agent.yaml or a sibling agent.<variant>.yaml",
            display_leaf(path)
        )));
    }
    let parent = path
        .parent()
        .ok_or_else(|| Error::Invalid(format!("{}: manifest path has no parent directory", display_leaf(path))))?;
    Ok(parent.join(base))
}

fn merge_value(base: &mut serde_yaml_ng::Value, patch: serde_yaml_ng::Value) {
    if let (Some(base_mapping), Some(patch_mapping)) = (base.as_mapping(), patch.as_mapping()) {
        let discriminator = serde_yaml_ng::Value::String("type".into());
        if let (Some(base_type), Some(patch_type)) = (
            base_mapping.get(&discriminator).and_then(serde_yaml_ng::Value::as_str),
            patch_mapping.get(&discriminator).and_then(serde_yaml_ng::Value::as_str),
        ) && base_type != patch_type
        {
            // Internally tagged union values are one logical scalar choice.
            // Changing the discriminator replaces the whole mapping so fields
            // belonging to the previous variant cannot leak into the new one.
            *base = patch;
            return;
        }
    }
    match (base, patch) {
        (serde_yaml_ng::Value::Mapping(base), serde_yaml_ng::Value::Mapping(patch)) => {
            for (key, value) in patch {
                if value.is_null() {
                    if base.remove(&key).is_none() {
                        // Preserve a null for fields absent from the concrete base.
                        // Known optional fields still decode successfully, while
                        // strict deserialization rejects unknown null-valued fields.
                        base.insert(key, value);
                    }
                } else if let Some(inherited) = base.get_mut(&key) {
                    merge_value(inherited, value);
                } else {
                    base.insert(key, value);
                }
            }
        }
        (base, patch) => *base = patch,
    }
}

fn string_field(mapping: &serde_yaml_ng::Mapping, field: &str, path: &Path) -> Result<String, Error> {
    mapping
        .get(serde_yaml_ng::Value::String(field.into()))
        .and_then(serde_yaml_ng::Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| Error::Invalid(format!("{}: {field} must be a string", display_leaf(path))))
}

fn absolute_lexical(path: &Path) -> Result<PathBuf, Error> {
    if path.is_absolute() {
        Ok(path.to_path_buf())
    } else {
        Ok(std::env::current_dir()?.join(path))
    }
}

fn display_leaf(path: &Path) -> String {
    path.file_name().map_or_else(
        || path.display().to_string(),
        |name| name.to_string_lossy().into_owned(),
    )
}

fn manifest_error(path: &Path, context: &str, error: &Error) -> Error {
    Error::Invalid(format!("{}: invalid {context}: {error}", display_leaf(path)))
}

fn with_chain(error: Error, chain: &[PathBuf]) -> Error {
    if chain.len() < 2 || error.to_string().contains("inheritance chain:") {
        return error;
    }
    let mut lines = chain.iter().map(|path| display_leaf(path));
    let Some(first) = lines.next() else {
        return error;
    };
    let diagnostic = std::iter::once(first)
        .chain(lines.map(|line| format!("  extends {line}")))
        .collect::<Vec<_>>()
        .join("\n");
    Error::Invalid(format!("{error}\ninheritance chain:\n{diagnostic}"))
}
