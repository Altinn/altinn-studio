#![allow(clippy::expect_used)]

use std::{cell::RefCell, panic::AssertUnwindSafe, rc::Rc};

use futures_util::FutureExt as _;
use sandbox::{
    ByteQuantity, CpuQuantity, EnsureSandboxRequest, Platform, RetentionPolicy, RootFilesystem, SandboxHandle,
    SandboxName, SandboxResources, SandboxService, SandboxSpec, backend::SandboxBackend as _, execution::ExecutionSpec,
    image::ImageSource, memory::MemorySecretStore, secret_store::SecretStore as _,
};
use sandbox_authorization::{AuthorizationDecision, AuthorizationRequest, LocalFuture, PolicyEngine};
use sandbox_microsandbox::{MicrosandboxNetworkBackend, MicrosandboxProvider, SecretBinding};

struct RecordingPolicy {
    denied_action: RefCell<Option<String>>,
    requests: RefCell<Vec<AuthorizationRequest>>,
}

impl RecordingPolicy {
    const fn allow_all() -> Self {
        Self {
            denied_action: RefCell::new(None),
            requests: RefCell::new(Vec::new()),
        }
    }

    fn deny(&self, action: &str) {
        self.denied_action.replace(Some(action.to_string()));
    }
}

impl PolicyEngine for RecordingPolicy {
    fn evaluate(
        &self,
        request: AuthorizationRequest,
    ) -> LocalFuture<'_, Result<AuthorizationDecision, sandbox_authorization::Error>> {
        let decision = if self.denied_action.borrow().as_deref() == Some(request.action.as_str()) {
            AuthorizationDecision::Deny
        } else {
            AuthorizationDecision::Allow
        };
        self.requests.borrow_mut().push(request);
        Box::pin(async move { Ok(decision) })
    }
}

#[tokio::test(flavor = "local")]
#[ignore = "requires Internet access, a Docker Engine API, Microsandbox host runtime and hardware virtualization"]
async fn controlled_network_authorizes_dns_tcp_and_http_and_fails_closed() {
    let temporary = tempfile::tempdir().expect("temporary integration home should be created");
    let backend = Rc::new(
        MicrosandboxProvider::open(temporary.path().join("control-plane"))
            .await
            .expect("Backend should open"),
    );
    let policy = Rc::new(RecordingPolicy::allow_all());
    let secrets = Rc::new(MemorySecretStore::default());
    let token = secrets
        .set("provider-token", b"integration-secret")
        .await
        .expect("integration secret should be stored");
    let network = Rc::new(MicrosandboxNetworkBackend::new(policy.clone()).with_secret_store(secrets.clone()));
    let sandbox_name = SandboxName::new("controlled-network").expect("test Sandbox name should be valid");
    network
        .set_secret_bindings(
            sandbox_name.clone(),
            vec![
                SecretBinding::with_placeholder("PROVIDER_TOKEN", "$MEDIATED_TOKEN", token)
                    .expect("integration secret binding should be valid"),
            ],
        )
        .expect("secret mediation should be configured");
    let service = SandboxService::new(backend.clone()).with_network_backend(network);
    let request = EnsureSandboxRequest::new(
        sandbox_name,
        SandboxSpec {
            image: ImageSource::Reference {
                reference: "docker.io/library/alpine:3.22".to_string(),
            },
            platform: native_linux_platform(),
            resources: resources(),
            init_system: sandbox::init::InitSystem::Backend,
            retention_policy: RetentionPolicy::Delete,
        },
    );
    let sandbox = service.ensure(&request).await.expect("controlled Sandbox should start");

    let test_result = AssertUnwindSafe(async {
        let allowed = sandbox
            .run_execution(shell("wget -T 10 -qO- http://example.com"))
            .await
            .expect("allowed request should execute");
        assert!(allowed.status.success(), "allowed request failed: {allowed:?}");
        {
            let requests = policy.requests.borrow();
            assert_action(&requests, "dns.query");
            assert_action(&requests, "network.connect");
            assert_http_request(&requests, "example.com", "http");
        }

        backend.stop(sandbox.id()).await.expect("Sandbox should stop");
        backend.start(sandbox.id()).await.expect("Sandbox should restart");
        let requests_before_restart = policy.requests.borrow().len();
        let after_restart = sandbox
            .run_execution(shell("wget -T 10 -qO- https://example.net"))
            .await
            .expect("request after runtime restart should execute");
        assert!(
            after_restart.status.success(),
            "controller should accept a fresh runtime session"
        );
        {
            let requests = policy.requests.borrow();
            assert_http_request(&requests[requests_before_restart..], "example.net", "https");
        }

        assert_mediated_secret_enforcement(&sandbox, policy.as_ref()).await;

        let requests_before_denial = policy.requests.borrow().len();
        policy.deny("http.request");
        let denied = sandbox
            .run_execution(shell("wget -T 5 -qO- https://example.org"))
            .await
            .expect("denied request should still produce an exit status");
        assert!(
            !denied.status.success(),
            "http.request denial unexpectedly allowed egress"
        );
        {
            let requests = policy.requests.borrow();
            let denied_requests = &requests[requests_before_denial..];
            assert_action(denied_requests, "network.connect");
            assert_action(denied_requests, "http.request");
        }
    })
    .catch_unwind()
    .await;
    service
        .delete(request.name())
        .await
        .expect("controlled Sandbox should delete");
    if let Err(payload) = test_result {
        std::panic::resume_unwind(payload);
    }
}

async fn assert_mediated_secret_enforcement(sandbox: &SandboxHandle, policy: &RecordingPolicy) {
    let requests_before_secret = policy.requests.borrow().len();
    let mediated = sandbox
        .run_execution(shell(
            "wget -T 10 -qO /dev/null --header='Authorization: Bearer $MEDIATED_TOKEN' https://example.net",
        ))
        .await
        .expect("mediated request should execute");
    assert!(mediated.status.success(), "mediated HTTPS request should succeed");
    {
        let requests = policy.requests.borrow();
        let mediated_requests = &requests[requests_before_secret..];
        assert_action(mediated_requests, "http.request");
        let secret_use = mediated_requests
            .iter()
            .find(|request| request.action.as_str() == "secret.use")
            .expect("secret use should be authorized independently");
        assert_eq!(secret_use.resource.kind, "secret");
        assert_eq!(secret_use.resource.id, "PROVIDER_TOKEN");
        assert_eq!(
            secret_use.context.attributes["http.authority"].as_str(),
            Some("example.net")
        );
        assert_eq!(
            secret_use.context.attributes["secret.locations"]
                .as_strings()
                .expect("locations should be a list"),
            ["header"]
        );
    }

    policy.deny("secret.use");
    let denied = sandbox
        .run_execution(shell(
            "wget -T 5 -qO /dev/null --header='Authorization: Bearer $MEDIATED_TOKEN' https://example.net",
        ))
        .await
        .expect("denied secret request should still produce an exit status");
    assert!(!denied.status.success(), "secret.use denial allowed egress");
}

fn assert_action(requests: &[AuthorizationRequest], action: &str) {
    assert!(
        requests.iter().any(|request| request.action.as_str() == action),
        "expected {action} authorization request"
    );
}

fn assert_http_request(requests: &[AuthorizationRequest], authority: &str, scheme: &str) {
    let request = requests
        .iter()
        .find(|request| request.action.as_str() == "http.request")
        .expect("HTTP request should be authorized independently");
    assert_eq!(request.resource.kind, "externalService");
    assert_eq!(request.resource.id, authority);
    assert_eq!(request.context.attributes["http.scheme"].as_str(), Some(scheme));
    assert_eq!(request.context.attributes["http.method"].as_str(), Some("GET"));
    assert_eq!(request.context.attributes["http.path"].as_str(), Some("/"));
    assert_eq!(request.context.attributes["http.version"].as_str(), Some("http1"));
}

fn shell(script: &str) -> ExecutionSpec {
    ExecutionSpec::command(
        sandbox::SandboxPath::new("/bin/sh"),
        ["-c".to_string(), script.to_string()],
    )
}

fn resources() -> SandboxResources {
    SandboxResources::new(
        "1".parse::<CpuQuantity>().expect("test CPU should be valid"),
        "512Mi".parse::<ByteQuantity>().expect("test memory should be valid"),
        RootFilesystem::layered("2Gi".parse::<ByteQuantity>().expect("root filesystem should be valid")),
    )
}

fn native_linux_platform() -> Platform {
    Platform::new(
        "linux",
        match std::env::consts::ARCH {
            "x86_64" => "amd64",
            "aarch64" => "arm64",
            architecture => architecture,
        },
    )
}
