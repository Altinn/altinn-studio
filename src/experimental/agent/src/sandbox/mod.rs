//! Runtime selection and lifecycle integration for Agent Sandboxes.

use std::{collections::BTreeSet, path::Path, rc::Rc};

use ::sandbox::{LocalFuture, Platform, SandboxHandle, SandboxId};
use serde::{Deserialize, Serialize};

use crate::{Error, control_plane::AgentRecord};

mod execution;
mod forward;
pub mod microsandbox;
pub mod platform;
mod runtime;

pub use execution::{ExecutionService, ExecutionTarget};
pub use forward::{PortForward, PortForwardService, PortForwardSpec, RunningPortForward};
pub use microsandbox::{GuestConnection, GuestDialer};
pub use runtime::RuntimeService;

/// Stable identity of one configured Sandbox Provider.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(try_from = "String", into = "String")]
pub struct ProviderId(String);

impl ProviderId {
    /// Creates a validated Provider identity.
    ///
    /// # Errors
    ///
    /// Returns an error when the identity is empty or not a portable identifier.
    pub fn new(value: impl Into<String>) -> Result<Self, Error> {
        let value = value.into();
        if value.is_empty()
            || !value
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
        {
            return Err(Error::Invalid(
                "Sandbox Provider ID must contain lowercase ASCII letters, digits, or '-'".into(),
            ));
        }
        Ok(Self(value))
    }

    /// Returns the identity as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for ProviderId {
    type Error = Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl From<ProviderId> for String {
    fn from(value: ProviderId) -> Self {
        value.0
    }
}

impl std::fmt::Display for ProviderId {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

/// Sticky runtime assignment for one Agent's Sandbox.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "state")]
pub enum Assignment {
    /// A Provider has been durably selected before external effects begin.
    Selected {
        /// Configured Provider identity.
        provider: ProviderId,
    },
    /// The selected Provider has materialized the Sandbox.
    Materialized {
        /// Configured Provider identity.
        provider: ProviderId,
        /// Provider-owned Sandbox identity.
        id: SandboxId,
    },
}

impl Assignment {
    /// Returns the sticky Provider selection.
    #[must_use]
    pub const fn provider(&self) -> &ProviderId {
        match self {
            Self::Selected { provider } | Self::Materialized { provider, .. } => provider,
        }
    }

    /// Returns the materialized Sandbox identity when available.
    #[must_use]
    pub const fn id(&self) -> Option<&SandboxId> {
        match self {
            Self::Selected { .. } => None,
            Self::Materialized { id, .. } => Some(id),
        }
    }
}

/// One runtime-selectable implementation of Agent Sandbox lifecycle effects.
pub trait Provider {
    /// Returns the configured Provider identity.
    fn id(&self) -> &ProviderId;

    /// Reports whether this Provider can satisfy the Agent requirements.
    fn supports<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<bool, Error>>;

    /// Idempotently ensures the Sandbox and its Provider-specific host integration.
    fn ensure<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>>;

    /// Opens the exact already-materialized Sandbox without lifecycle effects.
    fn open<'a>(&'a self, record: &'a AgentRecord, id: &'a SandboxId) -> LocalFuture<'a, Result<SandboxHandle, Error>>;

    /// Idempotently releases the Sandbox and its Provider-specific host integration.
    fn release<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>>;
}

/// Provider result retaining lifecycle information needed by dependent Sessions.
pub struct ProviderEnsureOutcome {
    pub sandbox: SandboxHandle,
    pub runtime_restarted: bool,
}

/// Materialized Sandbox identity and relevant lifecycle transition.
pub struct EnsureOutcome {
    pub id: SandboxId,
    pub runtime_restarted: bool,
}

/// Runtime-selectable setup for an operating system reported by a materialized Sandbox.
pub trait PlatformAdapter {
    /// Reports whether this adapter supports the resolved Sandbox platform.
    fn supports(&self, platform: &Platform) -> bool;

    /// Idempotently applies Agent and harness setup inside the Sandbox.
    fn setup<'a>(&'a self, record: &'a AgentRecord, sandbox: &'a SandboxHandle) -> LocalFuture<'a, Result<(), Error>>;
}

/// Resolves Agent requirements against configured Providers and dispatches lifecycle effects.
pub struct Service {
    providers: Vec<Rc<dyn Provider>>,
    platforms: Vec<Rc<dyn PlatformAdapter>>,
}

impl Service {
    /// Creates a runtime Provider registry.
    ///
    /// # Errors
    ///
    /// Returns an error when no Providers are configured or an identity is duplicated.
    pub fn new(
        providers: impl IntoIterator<Item = Rc<dyn Provider>>,
        platforms: impl IntoIterator<Item = Rc<dyn PlatformAdapter>>,
    ) -> Result<Self, Error> {
        let mut identities = BTreeSet::new();
        let mut configured = Vec::new();
        for provider in providers {
            if !identities.insert(provider.id().clone()) {
                return Err(Error::Invalid("duplicate Sandbox Provider identity".into()));
            }
            configured.push(provider);
        }
        if configured.is_empty() {
            return Err(Error::Invalid("at least one Sandbox Provider is required".into()));
        }
        let platforms = platforms.into_iter().collect::<Vec<_>>();
        if platforms.is_empty() {
            return Err(Error::Invalid(
                "at least one Sandbox platform adapter is required".into(),
            ));
        }
        Ok(Self {
            providers: configured,
            platforms,
        })
    }

    /// Selects the first configured Provider that supports the Agent requirements.
    ///
    /// # Errors
    ///
    /// Returns an error when capability discovery fails or no Provider supports the Agent.
    pub async fn resolve(&self, record: &AgentRecord) -> Result<ProviderId, Error> {
        for provider in &self.providers {
            if provider.supports(record).await? {
                return Ok(provider.id().clone());
            }
        }
        Err(Error::Invalid(format!(
            "no configured Sandbox Provider supports platform {:?}",
            record.agent.spec.sandbox.platform
        )))
    }

    /// Runs the selected Provider and resolved Sandbox-platform setup idempotently.
    ///
    /// # Errors
    ///
    /// Returns an error when the assignment is missing, its Provider is unavailable, or setup fails.
    pub async fn ensure(&self, record: &AgentRecord) -> Result<EnsureOutcome, Error> {
        let provider = self.assigned_provider(record)?;
        let outcome = provider.ensure(record).await?;
        let sandbox = outcome.sandbox;
        let resolved_platform = &sandbox.snapshot().image.platform;
        let adapter = self
            .platforms
            .iter()
            .find(|adapter| adapter.supports(resolved_platform))
            .ok_or_else(|| {
                Error::Invalid(format!(
                    "no Agent setup adapter supports resolved Sandbox platform {resolved_platform:?}"
                ))
            })?;
        adapter.setup(record, &sandbox).await?;
        Ok(EnsureOutcome {
            id: sandbox.snapshot().id.clone(),
            runtime_restarted: outcome.runtime_restarted,
        })
    }

    /// Opens the persisted materialized Sandbox without lifecycle or setup effects.
    ///
    /// # Errors
    ///
    /// Returns an error unless the assignment is materialized through a configured Provider.
    pub async fn open(&self, record: &AgentRecord) -> Result<SandboxHandle, Error> {
        let Some(Assignment::Materialized { provider, id }) = &record.agent.status.sandbox else {
            return Err(Error::Invalid("Agent has no materialized Sandbox assignment".into()));
        };
        self.provider(provider)?.open(record, id).await
    }

    /// Releases the selected Provider idempotently. An unassigned Agent has no effect to release.
    ///
    /// # Errors
    ///
    /// Returns an error when the selected Provider is unavailable or release fails.
    pub async fn release(&self, record: &AgentRecord) -> Result<(), Error> {
        let Some(assignment) = &record.agent.status.sandbox else {
            return Ok(());
        };
        self.provider(assignment.provider())?.release(record).await
    }

    fn assigned_provider(&self, record: &AgentRecord) -> Result<&dyn Provider, Error> {
        let assignment = record
            .agent
            .status
            .sandbox
            .as_ref()
            .ok_or_else(|| Error::Invalid("Agent has no Sandbox Provider assignment".into()))?;
        self.provider(assignment.provider())
    }

    fn provider(&self, id: &ProviderId) -> Result<&dyn Provider, Error> {
        self.providers
            .iter()
            .find(|provider| provider.id() == id)
            .map(Rc::as_ref)
            .ok_or_else(|| Error::Invalid(format!("assigned Sandbox Provider {id:?} is not configured")))
    }
}

/// Connects a guest TCP dialer through the recorded Sandbox Provider.
///
/// # Errors
///
/// Returns an error when the Provider is unsupported by this client or the
/// Sandbox is not running.
pub async fn guest_tcp_dialer(home: &Path, assignment: &Assignment) -> Result<GuestDialer, Error> {
    match assignment.provider().as_str() {
        microsandbox::PROVIDER_ID => microsandbox::guest_tcp_dialer(home, assignment).await,
        provider => Err(Error::Invalid(format!(
            "guest TCP forwarding is not supported through Sandbox Provider {provider:?}"
        ))),
    }
}
