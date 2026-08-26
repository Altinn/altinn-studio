#![allow(clippy::expect_used)]

mod support;

use std::{cell::Cell, path::PathBuf, rc::Rc, time::Duration};

use agent::{
    AgentId, ConditionStatus, Error, MountSpec, SecretSpec, Status,
    control_plane::{AgentRecord, AgentStore, ControlPlane, Controller, Notifier, Reconciler, memory},
    sandbox::{ExecutionService, PlatformAdapter, Provider, ProviderEnsureOutcome, ProviderId, Service},
};
use sandbox::{
    EnsureSandboxRequest, LocalFuture, Platform, RetentionPolicy, RootFilesystem, SandboxHandle, SandboxName,
    SandboxPath, SandboxResources, SandboxService,
    backend::SandboxBackend as _,
    init::InitSystem,
    memory as sandbox_memory,
    network::{NetworkEndpointSelection, PacketMedium},
};
use tokio::sync::Notify;

use support::{TempDirectory, agent};

#[derive(Default)]
struct NotificationCounter(Cell<usize>);

impl Notifier for NotificationCounter {
    fn notify(&self, _id: AgentId) {
        self.0.set(self.0.get() + 1);
    }
}

#[derive(Default)]
struct SessionNotificationCounter(Cell<usize>);

impl agent::control_plane::SessionNotifier for SessionNotificationCounter {
    fn notify(&self, _id: AgentId) {
        self.0.set(self.0.get() + 1);
    }
}

struct NoopPlatform;

impl PlatformAdapter for NoopPlatform {
    fn supports(&self, platform: &Platform) -> bool {
        platform.os == "linux"
    }

    fn setup<'a>(
        &'a self,
        _record: &'a AgentRecord,
        _sandbox: &'a SandboxHandle,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async { Ok(()) })
    }
}

struct Blocking {
    agent: AgentId,
    calls: Rc<Cell<usize>>,
    started: Rc<Notify>,
    release: Rc<Notify>,
}

struct MemoryProvider {
    id: ProviderId,
    service: SandboxService,
    default_architecture: String,
    blocking: Option<Blocking>,
    report_runtime_restart: Rc<Cell<bool>>,
}

impl MemoryProvider {
    fn new(backend: Rc<sandbox_memory::Provider>) -> Self {
        Self {
            id: ProviderId::new("memory").expect("Provider ID"),
            service: SandboxService::new(backend).with_network_backend(Rc::new(
                sandbox_memory::NetworkBackend::for_endpoint(
                    "memory",
                    NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
                ),
            )),
            default_architecture: Platform::native("linux").architecture,
            blocking: None,
            report_runtime_restart: Rc::new(Cell::new(false)),
        }
    }

    fn with_blocking(mut self, blocking: Blocking) -> Self {
        self.blocking = Some(blocking);
        self
    }
}

impl Provider for MemoryProvider {
    fn id(&self) -> &ProviderId {
        &self.id
    }

    fn supports<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<bool, Error>> {
        Box::pin(async move { Ok(record.agent.spec.sandbox.platform.os == "linux") })
    }

    fn ensure<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
        Box::pin(async move {
            if let Some(blocking) = &self.blocking
                && record.id == blocking.agent
            {
                let call = blocking.calls.get() + 1;
                blocking.calls.set(call);
                if call == 1 {
                    blocking.started.notify_one();
                    blocking.release.notified().await;
                }
            }
            let spec = record
                .agent
                .spec
                .sandbox
                .resolve_from(&record.source_directory, &self.default_architecture);
            let sandbox = self
                .service
                .ensure(
                    &EnsureSandboxRequest::new(record.sandbox_name()?, spec)
                        .with_mounts(record.agent.spec.sandbox.resolved_mounts()),
                )
                .await
                .map_err(Error::from)?;
            Ok(ProviderEnsureOutcome {
                sandbox,
                runtime_restarted: self.report_runtime_restart.replace(false),
            })
        })
    }

    fn open<'a>(
        &'a self,
        record: &'a AgentRecord,
        id: &'a sandbox::SandboxId,
    ) -> LocalFuture<'a, Result<SandboxHandle, Error>> {
        Box::pin(async move {
            self.service
                .open(id, record.agent.spec.sandbox.resolved_retention_policy())
                .await
                .map_err(Error::from)
        })
    }

    fn release<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.service
                .release(
                    &record.sandbox_name()?,
                    record.agent.spec.sandbox.resolved_retention_policy(),
                )
                .await
                .map_err(Error::from)
        })
    }
}

struct UnsupportedProvider {
    id: ProviderId,
}

impl UnsupportedProvider {
    fn new() -> Self {
        Self {
            id: ProviderId::new("unsupported").expect("Provider ID"),
        }
    }
}

impl Provider for UnsupportedProvider {
    fn id(&self) -> &ProviderId {
        &self.id
    }

    fn supports<'a>(&'a self, _record: &'a AgentRecord) -> LocalFuture<'a, Result<bool, Error>> {
        Box::pin(async { Ok(false) })
    }

    fn ensure<'a>(&'a self, _record: &'a AgentRecord) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
        Box::pin(async { Err(Error::Invalid("unsupported Provider was selected".into())) })
    }

    fn open<'a>(
        &'a self,
        _record: &'a AgentRecord,
        _id: &'a sandbox::SandboxId,
    ) -> LocalFuture<'a, Result<SandboxHandle, Error>> {
        Box::pin(async { Err(Error::Invalid("unsupported Provider was selected".into())) })
    }

    fn release<'a>(&'a self, _record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async { Err(Error::Invalid("unsupported Provider was selected".into())) })
    }
}

fn sandbox_service(provider: Rc<dyn Provider>) -> Rc<Service> {
    Rc::new(Service::new([provider], [Rc::new(NoopPlatform) as Rc<dyn PlatformAdapter>]).expect("Sandbox service"))
}

fn reconciler(store: Rc<dyn AgentStore>, provider: Rc<dyn Provider>) -> Reconciler {
    Reconciler::new(store, sandbox_service(provider))
}

struct Fixture {
    store: Rc<memory::InMemoryAgentStore>,
    backend: Rc<sandbox_memory::Provider>,
    control_plane: ControlPlane,
    reconciler: Reconciler,
}

fn fixture() -> Fixture {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()));
    Fixture {
        control_plane: ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default())),
        reconciler: reconciler(store.clone(), provider),
        store,
        backend,
    }
}

fn apply_request(name: &str) -> agent::control_plane::ApplyRequest {
    agent::control_plane::ApplyRequest {
        source_directory: std::env::temp_dir().join("agent-platform-source"),
        agent: agent(name),
    }
}

fn sandbox_name(record: &AgentRecord) -> SandboxName {
    SandboxName::new(format!("agent-{}", record.id)).expect("Agent ID should form a valid Sandbox name")
}

async fn stored(fixture: &Fixture, name: &str) -> AgentRecord {
    fixture.store.get_by_name(name).await.expect("stored Agent")
}

async fn reconcile(fixture: &Fixture, name: &str) {
    let id = stored(fixture, name).await.id;
    fixture.reconciler.reconcile(id).await.expect("reconcile");
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
    assert_eq!(
        applied.spec.sandbox.platform.architecture,
        Some(Platform::native("linux").architecture)
    );
    assert_eq!(fixture.backend.count(), 0);
    assert!(applied.status.conditions.is_empty());
}

#[tokio::test(flavor = "local")]
async fn lists_agents_and_resolves_the_nearest_unique_source_directory() {
    let fixture = fixture();
    let root = std::env::temp_dir().join("agent-platform-sources");
    let mut outer = apply_request("outer");
    outer.source_directory = root.clone();
    fixture.control_plane.apply(outer).await.expect("outer Agent");
    let mut inner = apply_request("inner");
    inner.source_directory = root.join("nested");
    fixture.control_plane.apply(inner).await.expect("inner Agent");

    let listed = fixture.control_plane.list().await.expect("list Agents");
    assert_eq!(
        listed
            .iter()
            .map(|agent| agent.metadata.name.as_str())
            .collect::<Vec<_>>(),
        vec!["inner", "outer"]
    );
    let resolved = fixture
        .control_plane
        .resolve_directory(&root.join("nested/worktree"))
        .await
        .expect("nearest Agent source");
    assert_eq!(resolved.metadata.name, "inner");
}

#[tokio::test(flavor = "local")]
async fn bind_mounts_resolve_from_the_manifest_and_drive_directory_inference_and_materialization() {
    let fixture = fixture();
    let temporary = TempDirectory::new("bind-mount");
    let physical_root = temporary.path().join("physical");
    std::fs::create_dir_all(&physical_root).expect("physical workspace directory");
    #[cfg(unix)]
    let root = {
        let alias = temporary.path().join("alias");
        std::os::unix::fs::symlink(&physical_root, &alias).expect("workspace alias");
        alias
    };
    #[cfg(not(unix))]
    let root = physical_root.clone();
    let manifest = root.join("agents/worktree");
    let nested = root.join("src/feature");
    std::fs::create_dir_all(&manifest).expect("manifest directory");
    std::fs::create_dir_all(&nested).expect("nested workspace directory");
    let mut request = apply_request("worker");
    request.source_directory = manifest;
    request.agent.spec.sandbox.mounts.push(MountSpec::Bind {
        source: PathBuf::from("../.."),
        target: SandboxPath::new("/home/agent/code/altinn-studio"),
        read_only: false,
    });

    let applied = fixture.control_plane.apply(request).await.expect("apply");
    let MountSpec::Bind { source, .. } = &applied.spec.sandbox.mounts[0] else {
        panic!("expected bind Mount");
    };
    assert_eq!(source, &std::fs::canonicalize(&root).expect("canonical workspace"));
    assert_eq!(
        fixture
            .control_plane
            .resolve_directory(&nested)
            .await
            .expect("infer Agent")
            .metadata
            .name,
        "worker"
    );

    reconcile(&fixture, "worker").await;
    let record = stored(&fixture, "worker").await;
    let materialized = fixture
        .backend
        .find(&sandbox_name(&record))
        .await
        .expect("materialized Sandbox");
    assert_eq!(materialized.mounts, record.agent.spec.sandbox.resolved_mounts());
}

#[tokio::test(flavor = "local")]
async fn changing_a_mount_is_rejected_for_an_existing_agent() {
    let fixture = fixture();
    let root = TempDirectory::new("immutable-mount");
    let mut request = apply_request("worker");
    request.source_directory = root.path().to_path_buf();
    request.agent.spec.sandbox.mounts.push(MountSpec::Bind {
        source: PathBuf::from("."),
        target: SandboxPath::new("/home/agent/code/first"),
        read_only: false,
    });
    fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect("initial apply");
    request.agent.spec.sandbox.mounts[0] = MountSpec::Bind {
        source: PathBuf::from("."),
        target: SandboxPath::new("/home/agent/code/second"),
        read_only: false,
    };

    let error = fixture
        .control_plane
        .apply(request)
        .await
        .expect_err("Mounts are immutable");

    assert!(matches!(error, Error::Immutable("spec.sandbox.mounts")));
}

#[tokio::test(flavor = "local")]
async fn directory_resolution_rejects_shared_sources_instead_of_guessing() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("first"))
        .await
        .expect("first Agent");
    fixture
        .control_plane
        .apply(apply_request("second"))
        .await
        .expect("second Agent");

    let error = fixture
        .control_plane
        .resolve_directory(&std::env::temp_dir().join("agent-platform-source/worktree"))
        .await
        .expect_err("shared source must be ambiguous");
    assert!(matches!(error, Error::Invalid(message) if message.contains("multiple Agents")));
}

#[tokio::test(flavor = "local")]
async fn reconcile_resolves_an_omitted_architecture_without_changing_desired_state() {
    let fixture = fixture();
    let mut request = apply_request("worker");
    request.agent.spec.sandbox.platform.architecture = None;
    fixture.control_plane.apply(request).await.expect("apply");

    reconcile(&fixture, "worker").await;

    let desired = fixture.control_plane.get("worker").await.expect("get");
    assert_eq!(desired.spec.sandbox.platform.architecture, None);
    let sandbox = fixture
        .backend
        .find(&sandbox_name(&stored(&fixture, "worker").await))
        .await
        .expect("sandbox");
    assert_eq!(sandbox.image.platform, Platform::native("linux"));
}

#[tokio::test(flavor = "local")]
async fn reconcile_resolves_sources_and_reports_sandbox_ready() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");
    reconcile(&fixture, "worker").await;

    let observed = fixture.control_plane.get("worker").await.expect("get");
    let materialized_name = sandbox_name(&stored(&fixture, "worker").await);
    let sandbox_id = observed
        .status
        .sandbox
        .as_ref()
        .and_then(agent::sandbox::Assignment::id)
        .expect("sandbox id");
    assert_eq!(observed.status.observed_generation, 1);
    assert_eq!(observed.status.conditions.len(), 2);
    assert!(
        observed
            .status
            .conditions
            .iter()
            .all(|condition| condition.status == ConditionStatus::True)
    );
    let sandbox = fixture.backend.find(&materialized_name).await.expect("sandbox");
    assert_eq!(&sandbox.id, sandbox_id);
    assert_eq!(
        sandbox.image.source,
        sandbox::image::ImageSource::Build {
            context: std::env::temp_dir().join("agent-platform-source").join("image"),
            dockerfile: PathBuf::from("Dockerfile"),
        }
    );
}

#[tokio::test(flavor = "local")]
async fn reconciliation_resolves_provider_capabilities_and_persists_the_assignment() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let providers: [Rc<dyn Provider>; 2] = [
        Rc::new(UnsupportedProvider::new()),
        Rc::new(MemoryProvider::new(backend.clone())),
    ];
    let sandboxes =
        Rc::new(Service::new(providers, [Rc::new(NoopPlatform) as Rc<dyn PlatformAdapter>]).expect("Sandbox service"));
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    let reconciler = Reconciler::new(store.clone(), sandboxes);
    control_plane.apply(apply_request("worker")).await.expect("apply");

    reconciler
        .reconcile(store.get_by_name("worker").await.expect("record").id)
        .await
        .expect("reconcile");

    let assignment = store
        .get_by_name("worker")
        .await
        .expect("record")
        .agent
        .status
        .sandbox
        .expect("assignment");
    assert_eq!(assignment.provider().as_str(), "memory");
    assert!(assignment.id().is_some());
    assert_eq!(backend.count(), 1);
}

#[tokio::test(flavor = "local")]
async fn repeated_reconciliation_reuses_the_same_sandbox() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");

    reconcile(&fixture, "worker").await;
    let first = fixture.control_plane.get("worker").await.expect("first status");
    reconcile(&fixture, "worker").await;
    let second = fixture.control_plane.get("worker").await.expect("second status");

    assert_eq!(fixture.backend.count(), 1);
    assert_eq!(first.status.sandbox, second.status.sandbox);
}

#[tokio::test(flavor = "local")]
async fn agent_transitions_notify_sessions_without_repeated_ready_noise() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend));
    let notifications = Rc::new(SessionNotificationCounter::default());
    let reconciler = reconciler(store.clone(), provider).with_session_notifier(notifications.clone());
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("Agent").id;

    reconciler.reconcile(id).await.expect("materialize");
    assert_eq!(notifications.0.get(), 1);
    reconciler.reconcile(id).await.expect("steady ready pass");
    assert_eq!(notifications.0.get(), 1);
    control_plane.delete("worker").await.expect("delete");
    reconciler.reconcile(id).await.expect("release");
    assert_eq!(notifications.0.get(), 2);
}

#[tokio::test(flavor = "local")]
async fn sandbox_runtime_restart_notifies_sessions_without_an_identity_change() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider = MemoryProvider::new(backend);
    let restart = provider.report_runtime_restart.clone();
    let provider: Rc<dyn Provider> = Rc::new(provider);
    let notifications = Rc::new(SessionNotificationCounter::default());
    let reconciler = reconciler(store.clone(), provider).with_session_notifier(notifications.clone());
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("Agent").id;

    reconciler.reconcile(id).await.expect("materialize");
    assert_eq!(notifications.0.get(), 1);
    restart.set(true);
    reconciler.reconcile(id).await.expect("restart-backed reconcile");

    assert_eq!(notifications.0.get(), 2);
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
    mutable_change.agent.spec.sandbox.retention_policy = Some(RetentionPolicy::Delete);
    mutable_change.agent.spec.harnesses[0].version = "2.1.240".into();
    mutable_change.agent.spec.harnesses[0].default = true;
    let updated_request = mutable_change.clone();
    let updated = fixture
        .control_plane
        .apply(mutable_change)
        .await
        .expect("mutable update");
    assert_eq!(updated.metadata.generation, 2);
    assert_eq!(updated.spec.harnesses[0].version, "2.1.240");
    assert!(updated.spec.harnesses[0].default);

    let mut kind_set_change = updated_request.clone();
    kind_set_change.agent.spec.harnesses[0].default = true;
    kind_set_change.agent.spec.harnesses.push(agent::HarnessSpec {
        kind: agent::Harness::Codex,
        version: "0.149.1".into(),
        auth: agent::HarnessAuthMode::Mediated,
        default: false,
    });
    let error = fixture
        .control_plane
        .apply(kind_set_change)
        .await
        .expect_err("harness kind set should be immutable");
    assert!(matches!(error, Error::Immutable("spec.harnesses.type")));

    let mut immutable_change = updated_request.clone();
    immutable_change.agent.spec.sandbox.platform.architecture = Some(
        if Platform::native("linux").architecture == "amd64" {
            "arm64"
        } else {
            "amd64"
        }
        .into(),
    );
    let error = fixture
        .control_plane
        .apply(immutable_change)
        .await
        .expect_err("Sandbox Platform should be immutable");
    assert!(matches!(error, Error::Immutable("spec.sandbox.platform")));

    let mut init_system_change = updated_request.clone();
    init_system_change.agent.spec.sandbox.init_system = InitSystem::Image;
    let error = fixture
        .control_plane
        .apply(init_system_change)
        .await
        .expect_err("Sandbox init system should be immutable");
    assert!(matches!(error, Error::Immutable("spec.sandbox.initSystem")));

    let mut root_mode_change = updated_request;
    let resources = root_mode_change.agent.spec.sandbox.resources;
    root_mode_change.agent.spec.sandbox.resources = SandboxResources::new(
        resources.cpu(),
        resources.memory(),
        RootFilesystem::direct(resources.root_filesystem().capacity()),
    );
    let error = fixture
        .control_plane
        .apply(root_mode_change)
        .await
        .expect_err("Sandbox root filesystem mode should be immutable");
    assert!(matches!(
        error,
        Error::Immutable("spec.sandbox.resources.rootFilesystem.mode")
    ));
}

#[tokio::test(flavor = "local")]
async fn secret_binding_definitions_are_mutable_desired_state() {
    let fixture = fixture();
    let request = apply_request("worker");
    fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect("initial apply");

    let mut changed = request;
    changed.agent.spec.secrets.push(SecretSpec {
        environment: "GITHUB_TOKEN".into(),
        placeholder: None,
        allowed_hosts: vec!["github.com".into()],
        source: Some("GH_PAT".into()),
    });
    let applied = fixture
        .control_plane
        .apply(changed)
        .await
        .expect("secret binding update");

    assert_eq!(applied.metadata.generation, 2);
    assert_eq!(applied.spec.secrets.len(), 1);
}

#[tokio::test(flavor = "local")]
async fn unchanged_apply_still_requests_immediate_reconciliation() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let notifications = Rc::new(NotificationCounter::default());
    let control_plane = ControlPlane::new(store, notifications.clone());
    let request = apply_request("worker");

    control_plane.apply(request.clone()).await.expect("first apply");
    control_plane.apply(request).await.expect("unchanged apply");

    assert_eq!(notifications.0.get(), 2);
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
async fn retained_sandbox_is_not_inherited_by_a_reused_agent_name() {
    let fixture = fixture();
    let request = apply_request("worker");
    fixture.control_plane.apply(request.clone()).await.expect("apply");
    let first_record = stored(&fixture, "worker").await;
    reconcile(&fixture, "worker").await;
    let first_sandbox_name = sandbox_name(&first_record);
    let original_id = fixture.backend.find(&first_sandbox_name).await.expect("sandbox").id;

    fixture.control_plane.delete("worker").await.expect("delete request");
    fixture.reconciler.reconcile(first_record.id).await.expect("release");
    assert!(matches!(
        fixture.control_plane.get("worker").await,
        Err(Error::NotFound)
    ));

    fixture.control_plane.apply(request.clone()).await.expect("re-apply");
    let second_record = stored(&fixture, "worker").await;
    assert_ne!(first_record.id, second_record.id);
    reconcile(&fixture, "worker").await;
    let second_id = fixture
        .backend
        .find(&sandbox_name(&second_record))
        .await
        .expect("new sandbox")
        .id;
    assert_ne!(second_id, original_id);
    assert_eq!(fixture.backend.count(), 2);

    let mut delete_request = request;
    delete_request.agent.spec.sandbox.retention_policy = Some(RetentionPolicy::Delete);
    fixture
        .control_plane
        .apply(delete_request)
        .await
        .expect("update retention");
    fixture.control_plane.delete("worker").await.expect("delete request");
    reconcile(&fixture, "worker").await;
    assert_eq!(fixture.backend.count(), 1);
    assert_eq!(
        fixture
            .backend
            .find(&first_sandbox_name)
            .await
            .expect("retained sandbox")
            .id,
        original_id
    );
}

#[tokio::test(flavor = "local")]
async fn omitted_retention_deletes_the_sandbox() {
    let fixture = fixture();
    let mut request = apply_request("worker");
    request.agent.spec.sandbox.retention_policy = None;
    let applied = fixture.control_plane.apply(request).await.expect("apply");
    assert_eq!(applied.spec.sandbox.retention_policy, None);
    reconcile(&fixture, "worker").await;
    let id = stored(&fixture, "worker").await.id;
    fixture.control_plane.delete("worker").await.expect("delete request");
    fixture.reconciler.reconcile(id).await.expect("delete sandbox");
    assert_eq!(fixture.backend.count(), 0);
}

#[tokio::test(flavor = "local")]
async fn controller_reconciles_after_a_wakeup() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()));
    let reconciler = Rc::new(reconciler(store.clone(), provider));
    let (controller, wakeup) = Controller::new(store.clone(), reconciler, Duration::from_mins(1), Rc::new(|_, _| {}));
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
async fn execution_target_waits_for_agent_convergence() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("worker")).await.expect("apply");

    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()));
    let reconciler = Rc::new(reconciler(store.clone(), provider));
    let (controller, wakeup) = Controller::new(store.clone(), reconciler, Duration::from_mins(1), Rc::new(|_, _| {}));
    let execution = ExecutionService::new(store, wakeup);
    let task = tokio::task::spawn_local(controller.run());

    let target = tokio::time::timeout(Duration::from_secs(1), execution.ensure("worker"))
        .await
        .expect("execution target should not wait for the periodic scan")
        .expect("ready execution target");

    assert_eq!(target.operating_system, "linux");
    assert_eq!(target.sandbox.provider().as_str(), "memory");
    assert!(target.sandbox.id().is_some());
    assert_eq!(backend.count(), 1);
    task.abort();
}

#[tokio::test(flavor = "local")]
async fn controller_runs_agents_concurrently_and_serializes_reruns_per_id() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("slow")).await.expect("slow Agent");
    control_plane.apply(apply_request("fast")).await.expect("fast Agent");
    let slow = store.get_by_name("slow").await.expect("slow record").id;

    let backend = Rc::new(sandbox_memory::Provider::new());
    let started = Rc::new(Notify::new());
    let release = Rc::new(Notify::new());
    let slow_calls = Rc::new(Cell::new(0));
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()).with_blocking(Blocking {
        agent: slow,
        calls: slow_calls.clone(),
        started: started.clone(),
        release: release.clone(),
    }));
    let reconciler = Rc::new(reconciler(store.clone(), provider));
    let (controller, wakeup) = Controller::new(store.clone(), reconciler, Duration::from_mins(1), Rc::new(|_, _| {}));
    let task = tokio::task::spawn_local(controller.run());

    tokio::time::timeout(Duration::from_secs(1), started.notified())
        .await
        .expect("slow reconciliation should start");
    let selected = store.get(slow).await.expect("selected slow Agent");
    assert!(matches!(
        selected.agent.status.sandbox,
        Some(agent::sandbox::Assignment::Selected { .. })
    ));
    wakeup.notify(slow);
    wakeup.notify(slow);
    wakeup.notify(slow);
    tokio::time::timeout(Duration::from_secs(1), async {
        while backend.count() != 1 {
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("fast Agent should finish while the slow Agent is blocked");

    release.notify_one();
    tokio::time::timeout(Duration::from_secs(1), async {
        while backend.count() != 2 || slow_calls.get() != 2 {
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("queued notifications should coalesce into one serialized rerun");
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
    changed.agent.spec.sandbox.retention_policy = Some(RetentionPolicy::Delete);
    fixture.control_plane.apply(changed).await.expect("second generation");

    let error = fixture
        .store
        .update_status(stored(&fixture, "worker").await.id, 1, Status::default())
        .await
        .expect_err("stale status should fail");
    assert!(matches!(error, Error::Conflict));
}
