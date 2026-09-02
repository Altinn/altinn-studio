//! Context-aware authorization contracts for sandbox-originated operations.
//!
//! Trusted enforcement points construct requests, policy engines make decisions,
//! and the component performing an operation enforces the result. This crate does
//! not perform operations or depend on an enforcement implementation.

use std::{collections::BTreeMap, future::Future, pin::Pin};

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Stable vocabulary shared by trusted authorization request producers.
pub mod vocabulary {
    /// Built-in Sandbox-originated Actions.
    pub mod action {
        /// Resolve a DNS name.
        pub const DNS_QUERY: &str = "dns.query";
        /// Send a complete HTTP request.
        pub const HTTP_REQUEST: &str = "http.request";
        /// Open a transport connection.
        pub const NETWORK_CONNECT: &str = "network.connect";
        /// Use host-owned secret material at an authorized location.
        pub const SECRET_USE: &str = "secret.use";
        // Spawn another session in-sandbox
        pub const SESSION_SPAWN: &str = "session.spawn";
        // Spawn another session in a different sandbox
        pub const AGENT_SPAWN: &str = "agent.spawn";
    }

    /// Built-in Principal kinds.
    pub mod principal_kind {
        /// One materialized Sandbox.
        pub const SANDBOX: &str = "sandbox";
    }

    /// Built-in Resource kinds.
    pub mod resource_kind {
        /// A DNS domain name.
        pub const DOMAIN: &str = "domain";
        /// An external network service.
        pub const EXTERNAL_SERVICE: &str = "externalService";
        /// Host-owned secret material.
        pub const SECRET: &str = "secret";
    }

    /// Built-in trusted Context attribute names.
    pub mod context {
        /// Stable Sandbox name supplied by its trusted Network Backend.
        pub const SANDBOX_NAME: &str = "sandbox.name";
        /// DNS record type.
        pub const DNS_RECORD_TYPE: &str = "dns.recordType";
        /// DNS resolver socket address.
        pub const DNS_RESOLVER: &str = "dns.resolver";
        /// HTTP authority.
        pub const HTTP_AUTHORITY: &str = "http.authority";
        /// HTTP method.
        pub const HTTP_METHOD: &str = "http.method";
        /// HTTP path without query data.
        pub const HTTP_PATH: &str = "http.path";
        /// HTTP scheme.
        pub const HTTP_SCHEME: &str = "http.scheme";
        /// HTTP/2 stream identifier.
        pub const HTTP_STREAM_ID: &str = "http.streamId";
        /// HTTP protocol version.
        pub const HTTP_VERSION: &str = "http.version";
        /// Network destination socket address.
        pub const NETWORK_DESTINATION_ADDRESS: &str = "network.destinationAddress";
        /// Whether the destination is the host, reported by the trusted Network
        /// Backend when it rewrites a gateway-bound flow to host loopback.
        pub const NETWORK_DESTINATION_IS_HOST: &str = "network.destinationIsHost";
        /// Network hostname supplied by a trusted parser.
        pub const NETWORK_HOSTNAME: &str = "network.hostname";
        /// Network source socket address.
        pub const NETWORK_SOURCE_ADDRESS: &str = "network.sourceAddress";
        /// Network transport protocol.
        pub const NETWORK_TRANSPORT: &str = "network.transport";
        /// Authorized secret injection locations.
        pub const SECRET_LOCATIONS: &str = "secret.locations";
    }
}

/// A non-`Send` future executed by a Tokio local runtime.
pub type LocalFuture<'a, T> = Pin<Box<dyn Future<Output = T> + 'a>>;

/// Authenticated sandbox entity on whose authority an Action is requested.
#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Principal {
    /// Principal category, such as `agent`, `sandbox`, `session`, or `execution`.
    pub kind: String,
    /// Stable identifier within that category.
    pub id: String,
}

impl Principal {
    /// Creates a Principal from trusted identity information.
    #[must_use]
    pub fn new(kind: impl Into<String>, id: impl Into<String>) -> Self {
        Self {
            kind: kind.into(),
            id: id.into(),
        }
    }
}

/// Stable name of a requested operation.
#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(transparent)]
pub struct Action(String);

impl Action {
    /// Creates an Action name.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Returns the stable Action name.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for Action {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// Target against which an Action is requested.
#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Resource {
    /// Resource category, such as `externalService`, `secret`, `repository`, or `tool`.
    pub kind: String,
    /// Stable identifier within that category.
    pub id: String,
}

impl Resource {
    /// Creates a Resource identifier.
    #[must_use]
    pub fn new(kind: impl Into<String>, id: impl Into<String>) -> Self {
        Self {
            kind: kind.into(),
            id: id.into(),
        }
    }
}

/// One typed trusted Context value.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(untagged)]
#[non_exhaustive]
pub enum AuthorizationValue {
    /// Textual value.
    String(String),
    /// Signed integer value.
    Integer(i64),
    /// Boolean value.
    Boolean(bool),
    /// Ordered textual values whose boundaries must be preserved.
    Strings(Vec<String>),
}

impl AuthorizationValue {
    /// Returns a textual value.
    #[must_use]
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::String(value) => Some(value),
            Self::Integer(_) | Self::Boolean(_) | Self::Strings(_) => None,
        }
    }

    /// Returns an integer value.
    #[must_use]
    pub const fn as_integer(&self) -> Option<i64> {
        match self {
            Self::Integer(value) => Some(*value),
            Self::String(_) | Self::Boolean(_) | Self::Strings(_) => None,
        }
    }

    /// Returns a Boolean value.
    #[must_use]
    pub const fn as_bool(&self) -> Option<bool> {
        match self {
            Self::Boolean(value) => Some(*value),
            Self::String(_) | Self::Integer(_) | Self::Strings(_) => None,
        }
    }

    /// Returns an ordered string-list value.
    #[must_use]
    pub fn as_strings(&self) -> Option<&[String]> {
        match self {
            Self::Strings(values) => Some(values),
            Self::String(_) | Self::Integer(_) | Self::Boolean(_) => None,
        }
    }
}

impl From<String> for AuthorizationValue {
    fn from(value: String) -> Self {
        Self::String(value)
    }
}

impl From<&str> for AuthorizationValue {
    fn from(value: &str) -> Self {
        Self::String(value.to_string())
    }
}

impl From<i64> for AuthorizationValue {
    fn from(value: i64) -> Self {
        Self::Integer(value)
    }
}

impl From<u32> for AuthorizationValue {
    fn from(value: u32) -> Self {
        Self::Integer(i64::from(value))
    }
}

impl From<bool> for AuthorizationValue {
    fn from(value: bool) -> Self {
        Self::Boolean(value)
    }
}

impl From<Vec<String>> for AuthorizationValue {
    fn from(value: Vec<String>) -> Self {
        Self::Strings(value)
    }
}

/// Trusted facts relevant to an authorization decision.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AuthorizationContext {
    /// Extensible attributes established by trusted enforcement components.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub attributes: BTreeMap<String, AuthorizationValue>,
}

impl AuthorizationContext {
    /// Creates an empty Context.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            attributes: BTreeMap::new(),
        }
    }

    /// Adds one trusted attribute.
    #[must_use]
    pub fn with_attribute(mut self, name: impl Into<String>, value: impl Into<AuthorizationValue>) -> Self {
        self.attributes.insert(name.into(), value.into());
        self
    }

    /// Inserts or replaces one trusted attribute.
    pub fn insert(&mut self, name: impl Into<String>, value: impl Into<AuthorizationValue>) {
        self.attributes.insert(name.into(), value.into());
    }

    /// Returns one trusted attribute.
    #[must_use]
    pub fn get(&self, name: &str) -> Option<&AuthorizationValue> {
        self.attributes.get(name)
    }
}

/// Complete input evaluated by an Authorization Policy Engine.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AuthorizationRequest {
    /// Authenticated sandbox authority behind the request.
    pub principal: Principal,
    /// Requested operation.
    pub action: Action,
    /// Target of the operation.
    pub resource: Resource,
    /// Trusted facts relevant to this request.
    pub context: AuthorizationContext,
}

/// Result of policy evaluation before domain-specific enforcement.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AuthorizationDecision {
    /// The Action may proceed.
    Allow,
    /// The Action must not proceed.
    Deny,
}

/// Policy-evaluation failures, distinct from an intentional deny decision.
#[derive(Debug, Error)]
pub enum Error {
    /// The configured engine could not evaluate a request.
    #[error("authorization policy engine failed: {0}")]
    Engine(String),
}

/// Evaluates Authorization Requests without performing their Actions.
pub trait PolicyEngine {
    /// Evaluates one request.
    fn evaluate(&self, request: AuthorizationRequest) -> LocalFuture<'_, Result<AuthorizationDecision, Error>>;
}

/// Deterministic policy engine for local wiring and tests.
pub struct StaticPolicy {
    decision: AuthorizationDecision,
}

impl StaticPolicy {
    /// Creates a policy that allows every request.
    #[must_use]
    pub const fn allow_all() -> Self {
        Self {
            decision: AuthorizationDecision::Allow,
        }
    }

    /// Creates a policy that denies every request.
    #[must_use]
    pub const fn deny_all() -> Self {
        Self {
            decision: AuthorizationDecision::Deny,
        }
    }
}

impl PolicyEngine for StaticPolicy {
    fn evaluate(&self, _request: AuthorizationRequest) -> LocalFuture<'_, Result<AuthorizationDecision, Error>> {
        Box::pin(async move { Ok(self.decision) })
    }
}
