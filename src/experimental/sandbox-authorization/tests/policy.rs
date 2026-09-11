#![allow(clippy::expect_used)]

use sandbox_authorization::{
    Action, AuthorizationContext, AuthorizationDecision, AuthorizationRequest, PolicyEngine as _, Principal, Resource,
    StaticPolicy,
};

#[tokio::test(flavor = "local")]
async fn static_policy_returns_its_configured_decision() {
    evaluate(&StaticPolicy::allow_all(), AuthorizationDecision::Allow).await;
    evaluate(&StaticPolicy::deny_all(), AuthorizationDecision::Deny).await;
}

async fn evaluate(policy: &StaticPolicy, expected: AuthorizationDecision) {
    let request = AuthorizationRequest {
        principal: Principal::new("agent", "worker"),
        action: Action::new("network.connect"),
        resource: Resource::new("externalService", "api.github.com"),
        context: AuthorizationContext::default(),
    };
    let decision = policy.evaluate(request).await.expect("policy evaluation");
    assert_eq!(decision, expected);
}
