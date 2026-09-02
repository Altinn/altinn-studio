//! Agent implementation of `sandbox_authorization::PolicyEngine`.

use std::{cell::RefCell, collections::BTreeMap};

use sandbox_authorization::{
    AuthorizationDecision, AuthorizationRequest, PolicyEngine,
    vocabulary::{action, context, principal_kind},
};

use crate::Agent;
use sandbox::SandboxName;

/// Live policy registry keyed by stable Agent/Sandbox name.
#[derive(Default)]
pub struct AgentPolicyEngine {
    agents: RefCell<BTreeMap<String, AgentPolicy>>,
    platform_endpoint: RefCell<Option<PlatformEndpoint>>,
}

struct PlatformEndpoint {
    host: String,
    port: u16,
}

impl AgentPolicyEngine {
    /// Creates an empty, fail-closed policy registry.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Registers the one Sandbox-reachable host endpoint exposed by the platform.
    ///
    /// Host-destined traffic (the Network Backend's host alias, and raw dials
    /// into host-reserved address ranges) is denied except for exactly this
    /// endpoint; without a registered endpoint it is denied entirely.
    pub fn set_platform_endpoint(&self, host: impl Into<String>, port: u16) {
        *self.platform_endpoint.borrow_mut() = Some(PlatformEndpoint {
            host: host.into(),
            port,
        });
    }

    /// Replaces the policy for one desired Agent generation.
    pub fn set_agent(
        &self,
        sandbox: &SandboxName,
        agent: &Agent,
        managed_secrets: impl IntoIterator<Item = (String, Vec<String>)>,
    ) {
        let secrets = agent
            .spec
            .secrets
            .iter()
            .map(|secret| (secret.environment.clone(), secret.allowed_hosts.clone()))
            .chain(managed_secrets)
            .collect();
        self.agents.borrow_mut().insert(
            sandbox.as_str().into(),
            AgentPolicy {
                denied_hosts: agent.spec.network.deny.clone(),
                secrets,
            },
        );
    }

    /// Removes policy for a released Agent.
    pub fn remove_agent(&self, sandbox: &SandboxName) {
        self.agents.borrow_mut().remove(sandbox.as_str());
    }
}

struct AgentPolicy {
    denied_hosts: Vec<String>,
    secrets: BTreeMap<String, Vec<String>>,
}

impl PolicyEngine for AgentPolicyEngine {
    fn evaluate(
        &self,
        request: AuthorizationRequest,
    ) -> sandbox_authorization::LocalFuture<'_, Result<AuthorizationDecision, sandbox_authorization::Error>> {
        Box::pin(async move { Ok(self.evaluate_request(&request)) })
    }
}

impl AgentPolicyEngine {
    fn evaluate_request(&self, request: &AuthorizationRequest) -> AuthorizationDecision {
        if request.principal.kind != principal_kind::SANDBOX {
            return AuthorizationDecision::Deny;
        }
        let Some(agent_name) = request
            .context
            .get(context::SANDBOX_NAME)
            .and_then(|value| value.as_str())
        else {
            return AuthorizationDecision::Deny;
        };
        let agents = self.agents.borrow();
        let Some(policy) = agents.get(agent_name) else {
            return AuthorizationDecision::Deny;
        };
        let host = request_host(request);
        if let Some(host_destined) = self.host_destined_decision(request, host) {
            return host_destined;
        }
        match request.action.as_str() {
            action::NETWORK_CONNECT | action::DNS_QUERY | action::HTTP_REQUEST => host
                .map_or(AuthorizationDecision::Deny, |host| {
                    decision(!policy.denied_hosts.iter().any(|pattern| host_matches(pattern, host)))
                }),
            action::SECRET_USE => {
                let Some(host) = host else {
                    return AuthorizationDecision::Deny;
                };
                decision(
                    policy
                        .secrets
                        .get(&request.resource.id)
                        .is_some_and(|patterns| patterns.iter().any(|pattern| host_matches(pattern, host))),
                )
            }
            _ => AuthorizationDecision::Deny,
        }
    }
}

impl AgentPolicyEngine {
    /// Decides host-destined traffic: the Network Backend rewrites its host
    /// alias (and only its gateway addresses) to host loopback, so anything
    /// aimed at the host must match the registered Platform API endpoint exactly.
    ///
    /// The trusted Network Backend reports host-destined flows through the
    /// `network.destinationIsHost` attribute, set from the same gateway-to-
    /// loopback rewrite it applies at dial time — this is the authoritative
    /// signal. The host-reserved range check is kept as defense in depth for
    /// requests that predate the flag or arrive without it. Returns `None` for
    /// traffic that is not host-destined.
    fn host_destined_decision(
        &self,
        request: &AuthorizationRequest,
        host: Option<&str>,
    ) -> Option<AuthorizationDecision> {
        let action = request.action.as_str();
        if !matches!(
            action,
            action::NETWORK_CONNECT | action::DNS_QUERY | action::HTTP_REQUEST
        ) {
            return None;
        }
        let endpoint = self.platform_endpoint.borrow();
        let alias = endpoint
            .as_ref()
            .zip(host)
            .is_some_and(|(endpoint, host)| host.eq_ignore_ascii_case(&endpoint.host));
        let destination = destination_address(request);
        let flagged = request
            .context
            .get(context::NETWORK_DESTINATION_IS_HOST)
            .and_then(sandbox_authorization::AuthorizationValue::as_bool)
            .unwrap_or(false);
        let reserved = destination.is_some_and(|address| is_host_reserved(address.ip()));
        if !alias && !flagged && !reserved {
            return None;
        }
        if action == action::DNS_QUERY {
            // Resolving the alias only reveals the gateway address.
            return Some(AuthorizationDecision::Allow);
        }
        let port = destination
            .map(|address| address.port())
            .or_else(|| authority_port(request));
        let allowed = alias && endpoint.as_ref().is_some_and(|endpoint| port == Some(endpoint.port));
        Some(decision(allowed))
    }
}

/// Destination socket address reported by the Network Backend, when present.
fn destination_address(request: &AuthorizationRequest) -> Option<std::net::SocketAddr> {
    request
        .context
        .get(context::NETWORK_DESTINATION_ADDRESS)
        .and_then(|value| value.as_str())
        .and_then(|value| value.parse().ok())
}

/// Port carried by the HTTP authority, when present.
fn authority_port(request: &AuthorizationRequest) -> Option<u16> {
    request
        .context
        .get(context::HTTP_AUTHORITY)
        .and_then(|value| value.as_str())
        .and_then(|authority| authority.rsplit_once(':'))
        .and_then(|(_, port)| port.parse().ok())
}

/// Address ranges that can carry the Network Backend's gateway, plus ranges
/// that never name a legitimate upstream from inside a Sandbox.
const fn is_host_reserved(address: std::net::IpAddr) -> bool {
    match address {
        std::net::IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_link_local()
                || v4.is_unspecified()
                // CGNAT 100.64.0.0/10 carries the per-Sandbox gateway.
                || (v4.octets()[0] == 100 && (v4.octets()[1] & 0b1100_0000) == 64)
        }
        std::net::IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_unspecified()
                // ULA fc00::/7 carries the per-Sandbox gateway.
                || (v6.octets()[0] & 0b1111_1110) == 0xfc
                // Link-local fe80::/10.
                || (v6.octets()[0] == 0xfe && (v6.octets()[1] & 0b1100_0000) == 0x80)
        }
    }
}

fn request_host(request: &AuthorizationRequest) -> Option<&str> {
    request
        .context
        .get(context::HTTP_AUTHORITY)
        .and_then(|value| value.as_str())
        .or_else(|| {
            request
                .context
                .get(context::NETWORK_HOSTNAME)
                .and_then(|value| value.as_str())
        })
        .or_else(|| (request.action.as_str() == action::DNS_QUERY).then_some(request.resource.id.as_str()))
        .map(without_port)
}

fn without_port(authority: &str) -> &str {
    if let Some(bracketed) = authority.strip_prefix('[')
        && let Some(end) = bracketed.find(']')
    {
        return &bracketed[..end];
    }
    authority
        .rsplit_once(':')
        .filter(|(_, port)| !port.is_empty() && port.bytes().all(|byte| byte.is_ascii_digit()))
        .map_or(authority, |(host, _)| host)
}

fn host_matches(pattern: &str, host: &str) -> bool {
    let pattern = pattern.to_ascii_lowercase();
    let host = host.trim_end_matches('.').to_ascii_lowercase();
    pattern.strip_prefix("*.").map_or_else(
        || host == pattern,
        |suffix| {
            host.len() > suffix.len()
                && host.ends_with(suffix)
                && host.as_bytes()[host.len() - suffix.len() - 1] == b'.'
        },
    )
}

const fn decision(allowed: bool) -> AuthorizationDecision {
    if allowed {
        AuthorizationDecision::Allow
    } else {
        AuthorizationDecision::Deny
    }
}
