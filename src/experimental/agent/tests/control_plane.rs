#![allow(clippy::expect_used)]

mod support;

use std::{cell::Cell, path::PathBuf, rc::Rc, time::Duration};

use agent::{
    ConditionStatus, Error, Status,
    control_plane::{AgentRuntimeBundle, AgentStore, ControlPlane, Controller, Notifier, Reconciler, memory},
};
use sandbox::{
    Platform, RetentionPolicy, SandboxName, SandboxPath, SandboxService,
    backend::SandboxBackend as _,
    memory as sandbox_memory,
    mount::Mount,
    network::{NetworkEndpointSelection, PacketMedium},
};

use support::agent;

#[derive(Default)]
struct NotificationCounter(Cell<usize>);

impl Notifier for NotificationCounter {
    fn notify(&self) {
        self.0.set(self.0.get() + 1);
    }
}

struct Fixture {
    store: Rc<memory::InMemoryAgentStore>,
    backend: Rc<sandbox_memory::Provider>,
    runtime_bundles: Rc<memory::InMemoryAgentRuntimeBundleResolver>,
    runtime: Rc<memory::InMemoryAgentRuntimeClient>,
    control_plane: ControlPlane,
    reconciler: Reconciler,
}

fn fixture() -> Fixture {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let sandbox_service = Rc::new(SandboxService::new(backend.clone()).with_network_backend(Rc::new(
        sandbox_memory::NetworkBackend::for_endpoint(
            "memory",
            NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
        ),
    )));
    let runtime_bundles = Rc::new(memory::InMemoryAgentRuntimeBundleResolver::new());
    runtime_bundles.resolve_with(AgentRuntimeBundle::new("runtime-v1"));
    let runtime = Rc::new(memory::InMemoryAgentRuntimeClient::new());
    Fixture {
        control_plane: ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default())),
        reconciler: Reconciler::new(store.clone(), sandbox_service, runtime_bundles.clone(), runtime.clone()),
        store,
        backend,
        runtime_bundles,
        runtime,
    }
}

fn apply_request(name: &str) -> agent::control_plane::ApplyRequest {
    agent::control_plane::ApplyRequest {
        source_directory: std::env::temp_dir().join("agent-platform-source"),
        agent: agent(name),
    }
}

fn sandbox_name() -> SandboxName {
    SandboxName::new("worker").expect("test Sandbox name should be valid")
}

#[tokio::test(flavor = "local")]
async fn apply_stores_desired_state_without_running_inline() {
    let fixture = fixture();
    let applied = fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");

    assert_eq!(applied.metadata.generation, 1);
    assert_eq!(fixture.backend.count(), 0);
    assert!(applied.status.conditions.is_empty());
}

#[tokio::test(flavor = "local")]
async fn reconcile_resolves_sources_and_reports_both_layers_ready() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");
    fixture.reconciler.reconcile("worker").await.expect("reconcile");

    let observed = fixture.control_plane.get("worker").await.expect("get");
    let sandbox_id = observed.status.sandbox_id.expect("sandbox id");
    assert_eq!(observed.status.observed_generation, 1);
    assert_eq!(observed.status.conditions.len(), 3);
    assert!(
        observed
            .status
            .conditions
            .iter()
            .all(|condition| condition.status == ConditionStatus::True)
    );
    let sandbox = fixture.backend.find(&sandbox_name()).await.expect("sandbox");
    assert!(fixture.runtime.is_ready(&sandbox_id));
    assert_eq!(fixture.runtime_bundles.platform(), Some(sandbox.image.platform.clone()));
    assert_eq!(
        sandbox.image.source,
        sandbox::image::ImageSource::Build {
            context: std::env::temp_dir().join("agent-platform-source").join("image"),
            dockerfile: PathBuf::from("Dockerfile"),
        }
    );
}

#[tokio::test(flavor = "local")]
async fn platform_specific_runtime_bundle_is_part_of_sandbox_materialization() {
    let fixture = fixture();
    let runtime_mount = Mount::Bind {
        source: std::env::temp_dir().join("agent-runtime-v1"),
        target: SandboxPath::new("/opt/agent/runtime"),
        read_only: true,
    };
    let mut runtime_v1 = AgentRuntimeBundle::new("runtime-v1");
    runtime_v1.mounts.push(runtime_mount.clone());
    fixture.runtime_bundles.resolve_with(runtime_v1);
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");

    fixture.reconciler.reconcile("worker").await.expect("reconcile");

    let sandbox = fixture.backend.find(&sandbox_name()).await.expect("sandbox");
    assert_eq!(sandbox.mounts, vec![runtime_mount.clone()]);
    let observed = fixture.control_plane.get("worker").await.expect("get");
    assert_eq!(observed.status.runtime_version.as_deref(), Some("runtime-v1"));

    let mut runtime_v2 = AgentRuntimeBundle::new("runtime-v2");
    runtime_v2.mounts.push(Mount::Bind {
        source: std::env::temp_dir().join("agent-runtime-v2"),
        target: SandboxPath::new("/opt/agent/runtime"),
        read_only: true,
    });
    fixture.runtime_bundles.resolve_with(runtime_v2);
    fixture
        .reconciler
        .reconcile("worker")
        .await
        .expect("reconcile pinned runtime");
    let sandbox = fixture.backend.find(&sandbox_name()).await.expect("sandbox");
    assert_eq!(sandbox.mounts, vec![runtime_mount]);
}

#[tokio::test(flavor = "local")]
async fn repeated_apply_is_idempotent_and_immutable_fields_are_rejected() {
    let fixture = fixture();
    let request = apply_request("worker");
    let first = fixture.control_plane.apply(request.clone()).await.expect("first apply");
    let second = fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect("second apply");
    assert_eq!(first.metadata.generation, second.metadata.generation);

    let mut mutable_change = request.clone();
    mutable_change.agent.spec.sandbox.retention_policy = RetentionPolicy::Delete;
    let updated = fixture
        .control_plane
        .apply(mutable_change)
        .await
        .expect("mutable update");
    assert_eq!(updated.metadata.generation, 2);

    let mut immutable_change = request;
    immutable_change.agent.spec.sandbox.platform = Platform::new("linux", "arm64");
    let error = fixture
        .control_plane
        .apply(immutable_change)
        .await
        .expect_err("Sandbox Platform should be immutable");
    assert!(matches!(error, Error::Immutable("spec.sandbox.platform")));
}

#[tokio::test(flavor = "local")]
async fn apply_requires_an_absolute_source_directory() {
    let fixture = fixture();
    let mut request = apply_request("worker");
    request.source_directory = PathBuf::from("relative");

    let error = fixture
        .control_plane
        .apply(request)
        .await
        .expect_err("relative source should fail");
    assert!(matches!(error, Error::Invalid(_)));
}

#[tokio::test(flavor = "local")]
async fn runtime_failure_is_observed_without_reporting_ready() {
    let fixture = fixture();
    fixture.runtime.fail_with("installation failed");
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");

    let error = fixture
        .reconciler
        .reconcile("worker")
        .await
        .expect_err("reconcile should fail");
    assert!(matches!(error, Error::Runtime(_)));
    let observed = fixture.control_plane.get("worker").await.expect("get");
    let ready = observed
        .status
        .conditions
        .iter()
        .find(|condition| condition.kind == "Ready")
        .expect("Ready condition");
    assert_eq!(ready.status, ConditionStatus::False);
}

#[tokio::test(flavor = "local")]
async fn runtime_bundle_failure_prevents_sandbox_materialization() {
    let fixture = fixture();
    fixture.runtime_bundles.fail_with("no bundle for Platform");
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");

    let error = fixture
        .reconciler
        .reconcile("worker")
        .await
        .expect_err("bundle resolution should fail");

    assert!(matches!(error, Error::Runtime(_)));
    assert_eq!(fixture.backend.count(), 0);
    let observed = fixture.control_plane.get("worker").await.expect("get");
    assert!(observed.status.conditions.iter().any(|condition| {
        condition.kind == "RuntimeReady"
            && condition.status == ConditionStatus::False
            && condition.reason == "RuntimeBundleResolutionFailed"
    }));
}

#[tokio::test(flavor = "local")]
async fn retained_sandbox_is_re_adopted_and_delete_policy_removes_it() {
    let fixture = fixture();
    let request = apply_request("worker");
    fixture.control_plane.apply(request.clone()).await.expect("apply");
    fixture.reconciler.reconcile("worker").await.expect("reconcile");
    let original_id = fixture.backend.find(&sandbox_name()).await.expect("sandbox").id;

    fixture.control_plane.delete("worker").await.expect("delete request");
    fixture.reconciler.reconcile("worker").await.expect("release");
    assert!(matches!(
        fixture.control_plane.get("worker").await,
        Err(Error::NotFound)
    ));

    fixture.control_plane.apply(request.clone()).await.expect("re-apply");
    fixture.reconciler.reconcile("worker").await.expect("re-adopt");
    assert_eq!(
        fixture.backend.find(&sandbox_name()).await.expect("sandbox").id,
        original_id
    );

    let mut delete_request = request;
    delete_request.agent.spec.sandbox.retention_policy = RetentionPolicy::Delete;
    fixture
        .control_plane
        .apply(delete_request)
        .await
        .expect("update retention");
    fixture.control_plane.delete("worker").await.expect("delete request");
    fixture.reconciler.reconcile("worker").await.expect("delete sandbox");
    assert_eq!(fixture.backend.count(), 0);
}

#[tokio::test(flavor = "local")]
async fn controller_reconciles_after_a_wakeup() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let sandbox_service = Rc::new(SandboxService::new(backend.clone()));
    let runtime_bundles = Rc::new(memory::InMemoryAgentRuntimeBundleResolver::new());
    runtime_bundles.resolve_with(AgentRuntimeBundle::new("runtime-v1"));
    let reconciler = Rc::new(Reconciler::new(
        store.clone(),
        sandbox_service,
        runtime_bundles,
        Rc::new(memory::InMemoryAgentRuntimeClient::new()),
    ));
    let (controller, wakeup) = Controller::new(store.clone(), reconciler, Duration::from_mins(1), Rc::new(|_| {}));
    let control_plane = ControlPlane::new(store, Rc::new(wakeup));
    let task = tokio::task::spawn_local(controller.run());

    control_plane.apply(apply_request("worker")).await.expect("apply");
    tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            if backend.count() == 1 {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("controller should reconcile");
    task.abort();
}

#[tokio::test(flavor = "local")]
async fn stale_status_write_is_rejected() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");
    let mut changed = apply_request("worker");
    changed.agent.spec.sandbox.retention_policy = RetentionPolicy::Delete;
    fixture.control_plane.apply(changed).await.expect("second generation");

    let error = fixture
        .store
        .update_status("worker", 1, Status::default())
        .await
        .expect_err("stale status should fail");
    assert!(matches!(error, Error::Conflict));
}
