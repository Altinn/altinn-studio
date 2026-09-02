#![allow(clippy::expect_used)]

mod support;

use agent::{SecretSpec, authorization::AgentPolicyEngine};
use sandbox::SandboxName;
use sandbox_authorization::{
    Action, AuthorizationContext, AuthorizationDecision, AuthorizationRequest, PolicyEngine as _, Principal, Resource,
    vocabulary::{action, context, principal_kind, resource_kind},
};

#[tokio::test(flavor = "local")]
async fn allows_general_egress_but_scopes_each_secret_to_its_hosts() {
    let mut agent = support::agent("worker");
    agent.spec.network.deny.push("blocked.example".into());
    agent.spec.secrets.push(SecretSpec {
        environment: "GITHUB_TOKEN".into(),
        placeholder: None,
        allowed_hosts: vec!["github.com".into()],
        source: Some("GH_PAT".into()),
    });
    let policy = AgentPolicyEngine::new();
    let sandbox = SandboxName::new("agent-test-id").expect("Sandbox name");
    policy.set_agent(&sandbox, &agent, []);

    assert_eq!(
        evaluate(
            &policy,
            sandbox.as_str(),
            action::HTTP_REQUEST,
            "externalService",
            "github.com",
            "github.com"
        )
        .await,
        AuthorizationDecision::Allow
    );
    assert_eq!(
        evaluate(
            &policy,
            sandbox.as_str(),
            action::HTTP_REQUEST,
            "externalService",
            "blocked.example",
            "blocked.example",
        )
        .await,
        AuthorizationDecision::Deny
    );
    assert_eq!(
        evaluate(
            &policy,
            sandbox.as_str(),
            action::SECRET_USE,
            resource_kind::SECRET,
            "GITHUB_TOKEN",
            "github.com",
        )
        .await,
        AuthorizationDecision::Allow
    );
    assert_eq!(
        evaluate(
            &policy,
            sandbox.as_str(),
            action::SECRET_USE,
            resource_kind::SECRET,
            "GITHUB_TOKEN",
            "example.com",
        )
        .await,
        AuthorizationDecision::Deny
    );
}

#[tokio::test(flavor = "local")]
async fn host_destined_traffic_reaches_only_the_platform_api() {
    let agent = support::agent("worker");
    let policy = AgentPolicyEngine::new();
    let sandbox = SandboxName::new("agent-test-id").expect("Sandbox name");
    policy.set_agent(&sandbox, &agent, []);

    // Fail closed: without a registered Platform API endpoint every host-destined
    // connect is denied, even under the allow-all egress default.
    assert_eq!(
        connect(
            &policy,
            sandbox.as_str(),
            Some("host.microsandbox.internal"),
            "100.64.0.2:9999"
        )
        .await,
        AuthorizationDecision::Deny
    );

    policy.set_platform_endpoint("host.microsandbox.internal", 4_100);

    assert_eq!(
        connect(
            &policy,
            sandbox.as_str(),
            Some("host.microsandbox.internal"),
            "100.64.0.2:4100"
        )
        .await,
        AuthorizationDecision::Allow
    );
    assert_eq!(
        connect(
            &policy,
            sandbox.as_str(),
            Some("host.microsandbox.internal"),
            "100.64.0.2:8080"
        )
        .await,
        AuthorizationDecision::Deny
    );
    // A raw dial into a host-reserved range carries no hostname and is denied
    // even on the Platform API port: only the alias identifies the endpoint.
    assert_eq!(
        connect(&policy, sandbox.as_str(), None, "100.64.0.2:4100").await,
        AuthorizationDecision::Deny
    );
    assert_eq!(
        connect(&policy, sandbox.as_str(), None, "127.0.0.1:80").await,
        AuthorizationDecision::Deny
    );
    assert_eq!(
        connect(&policy, sandbox.as_str(), None, "169.254.169.254:80").await,
        AuthorizationDecision::Deny
    );
    assert_eq!(
        connect(&policy, sandbox.as_str(), None, "[fd00::2]:443").await,
        AuthorizationDecision::Deny
    );
    // Ordinary public egress is unaffected.
    assert_eq!(
        connect(&policy, sandbox.as_str(), Some("github.com"), "140.82.121.4:443").await,
        AuthorizationDecision::Allow
    );
    // Resolving the alias stays possible; it only reveals the gateway.
    assert_eq!(
        evaluate(
            &policy,
            sandbox.as_str(),
            action::DNS_QUERY,
            resource_kind::DOMAIN,
            "host.microsandbox.internal",
            "host.microsandbox.internal",
        )
        .await,
        AuthorizationDecision::Allow
    );
}

#[tokio::test(flavor = "local")]
async fn host_destined_flag_denies_the_gateway_by_number_outside_guessed_ranges() {
    let agent = support::agent("worker");
    let policy = AgentPolicyEngine::new();
    let sandbox = SandboxName::new("agent-test-id").expect("Sandbox name");
    policy.set_agent(&sandbox, &agent, []);
    policy.set_platform_endpoint("host.microsandbox.internal", 4_100);

    // The default guest pool 172.16/12 is not a guessed reserved range, so
    // before the Backend flag an HTTP dial to the gateway with a plausible but
    // spoofed authority looked like ordinary egress and reached host loopback.
    assert_eq!(
        connect_flagged(&policy, sandbox.as_str(), Some("github.com"), "172.16.0.5:4100", false).await,
        AuthorizationDecision::Allow
    );
    // Flagged host-destined by the trusted Backend, the same dial is denied:
    // the spoofed authority is not the alias, so it cannot reach host loopback.
    assert_eq!(
        connect_flagged(&policy, sandbox.as_str(), Some("github.com"), "172.16.0.5:4100", true).await,
        AuthorizationDecision::Deny
    );
    // The genuine Platform API — alias on its registered port — still succeeds.
    assert_eq!(
        connect_flagged(
            &policy,
            sandbox.as_str(),
            Some("host.microsandbox.internal"),
            "172.16.0.5:4100",
            true
        )
        .await,
        AuthorizationDecision::Allow
    );
    // Flagged host-destined on another port is denied even via the alias.
    assert_eq!(
        connect_flagged(
            &policy,
            sandbox.as_str(),
            Some("host.microsandbox.internal"),
            "172.16.0.5:8080",
            true
        )
        .await,
        AuthorizationDecision::Deny
    );
}

async fn connect(
    policy: &AgentPolicyEngine,
    agent: &str,
    hostname: Option<&str>,
    destination: &str,
) -> AuthorizationDecision {
    connect_flagged(policy, agent, hostname, destination, false).await
}

async fn connect_flagged(
    policy: &AgentPolicyEngine,
    agent: &str,
    hostname: Option<&str>,
    destination: &str,
    destination_is_host: bool,
) -> AuthorizationDecision {
    let mut authorization_context = AuthorizationContext::new()
        .with_attribute(context::SANDBOX_NAME, agent)
        .with_attribute(context::NETWORK_DESTINATION_ADDRESS, destination)
        .with_attribute(context::NETWORK_DESTINATION_IS_HOST, destination_is_host);
    if let Some(hostname) = hostname {
        authorization_context.insert(context::NETWORK_HOSTNAME, hostname);
    }
    policy
        .evaluate(AuthorizationRequest {
            principal: Principal::new(principal_kind::SANDBOX, "sandbox-id"),
            action: Action::new(action::NETWORK_CONNECT),
            resource: Resource::new(
                resource_kind::EXTERNAL_SERVICE,
                hostname.map_or_else(|| destination.into(), str::to_owned),
            ),
            context: authorization_context,
        })
        .await
        .expect("policy decision")
}

async fn evaluate(
    policy: &AgentPolicyEngine,
    agent: &str,
    operation: &str,
    resource_kind: &str,
    resource: &str,
    host: &str,
) -> AuthorizationDecision {
    policy
        .evaluate(AuthorizationRequest {
            principal: Principal::new(principal_kind::SANDBOX, "sandbox-id"),
            action: Action::new(operation),
            resource: Resource::new(resource_kind, resource),
            context: AuthorizationContext::new()
                .with_attribute(context::SANDBOX_NAME, agent)
                .with_attribute(context::HTTP_AUTHORITY, host),
        })
        .await
        .expect("policy decision")
}
