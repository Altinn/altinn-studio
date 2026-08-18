//! Host-side subscription identities and proactive authentication maintenance.

use sandbox::LocalFuture;
use serde::{Deserialize, Serialize};

use crate::Error;

/// Identifies an authentication provider independently of a Harness Installation.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct ProviderId(String);

impl ProviderId {
    /// Creates a Provider identifier.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }
}

/// Identifies one host-side subscription identity.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct ProviderAccountId(String);

impl ProviderAccountId {
    /// Creates a Provider Account identifier.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }
}

/// Host-visible authentication readiness without exposing credentials or Secret References.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ProviderAccountState {
    /// Authentication is available for mediated operations.
    Ready,
    /// The user must complete host-side authentication.
    AuthenticationRequired,
    /// Token maintenance is currently in progress.
    Refreshing,
    /// Authentication or token maintenance failed.
    Failed,
}

/// Host-side subscription identity shared by Sandboxes through mediation.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ProviderAccount {
    /// Stable account identifier.
    pub id: ProviderAccountId,
    /// Authentication provider.
    pub provider: ProviderId,
    /// Current host-visible readiness.
    pub state: ProviderAccountState,
}

/// Provider Account operations owned by the Agent Control Plane.
pub trait ProviderAccountApi {
    /// Starts or resumes host-side login for a provider.
    fn login(&self, provider: ProviderId) -> LocalFuture<'_, Result<ProviderAccount, Error>>;

    /// Gets one Provider Account.
    fn get<'a>(&'a self, id: &'a ProviderAccountId) -> LocalFuture<'a, Result<ProviderAccount, Error>>;

    /// Refreshes and verifies every configured Provider Account.
    fn maintain(&self) -> LocalFuture<'_, Result<Vec<ProviderAccount>, Error>>;
}
