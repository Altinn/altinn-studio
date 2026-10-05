#![allow(clippy::expect_used)]

mod support;

use std::{
    cell::{Cell, RefCell},
    collections::VecDeque,
    path::PathBuf,
    rc::Rc,
    time::Duration,
};

use agent::{
    AgentId, ConditionStatus, EnvironmentSpec, Error, FailureKind, MountSpec, SecretSpec, Status,
    control_plane::{
        AgentRecord, AgentStore, ControlPlane, Controller, Convergence, Notifier, Reconciler, WaitPolicy, memory,
    },
    progress::{OutputPosition, ProvisioningState, SandboxObserver},
    resources::Changes,
    sandbox::{
        ExecutionService, PlatformAdapter, Provider, ProviderEnsureOutcome, ProviderId, Service, UNRESPONSIVE_AFTER,
    },
};
use sandbox::{
    EnsureSandboxRequest, GuestHeartbeat, LocalFuture, Platform, RetentionPolicy, RootFilesystem, SandboxHandle,
    SandboxName, SandboxPath, SandboxResources, SandboxService,
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

    fn settle(&self, id: AgentId) -> LocalFuture<'_, ()> {
        self.notify(id);
        Box::pin(async {})
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
        _harnesses: &'a [agent::Harness],
        _steps: &'a sandbox::SandboxProgress,
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
    /// Stops that fail before stopping anything, as a runtime that cannot be reached does.
    failing_stops: Rc<Cell<usize>>,
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
            failing_stops: Rc::new(Cell::new(0)),
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

    fn ensure<'a>(
        &'a self,
        record: &'a AgentRecord,
        environment: std::collections::BTreeMap<String, String>,
        _progress: sandbox::ProgressReporter,
    ) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
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
            // Like Microsandbox, starting a stopped Sandbox restarts its runtime.
            let was_stopped = self
                .service
                .inspect(&record.sandbox_name()?)
                .await
                .is_ok_and(|sandbox| sandbox.state == sandbox::SandboxState::Stopped);
            let sandbox = self
                .service
                .ensure(
                    &EnsureSandboxRequest::new(record.sandbox_name()?, spec)
                        .with_hostname(record.sandbox_hostname()?)
                        .with_mounts(record.agent.spec.sandbox.resolved_mounts())
                        .with_environment(environment),
                )
                .await
                .map_err(Error::from)?;
            Ok(ProviderEnsureOutcome {
                sandbox,
                runtime_restarted: self.report_runtime_restart.replace(false) || was_stopped,
                harnesses: record
                    .agent
                    .spec
                    .harnesses
                    .iter()
                    .map(|installation| installation.kind)
                    .collect(),
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

    fn stop<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            if let Some(remaining) = self.failing_stops.get().checked_sub(1) {
                self.failing_stops.set(remaining);
                return Err(Error::Sandbox(sandbox::Error::Backend("runtime unreachable".into())));
            }
            self.service.stop(&record.sandbox_name()?).await.map_err(Error::from)
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

/// A planned Sandbox ensure failure.
///
/// A permanent failure fails every pass, as agentd's Providers do until the
/// manifest or `.env` changes. A transient failure fails only the pass that
/// takes it.
#[derive(Clone)]
enum PlannedFailure {
    Invalid(String),
    /// The Sandbox Provider rejects the request itself (an SDK `InvalidRequest`).
    Rejected,
    /// Floods telemetry past the lossy channel's capacity, then fails as invalid.
    InvalidAfterFlood(String),
    Transient(String),
    /// Fails transiently on every pass until `ended` is set.
    Outage {
        message: String,
        ended: Rc<Cell<bool>>,
    },
}

const TELEMETRY_FLOOD: usize = 4_096;

struct PlannedProvider {
    inner: MemoryProvider,
    failures: RefCell<VecDeque<PlannedFailure>>,
}

impl PlannedProvider {
    fn new(backend: Rc<sandbox_memory::Provider>, failures: impl IntoIterator<Item = PlannedFailure>) -> Self {
        Self {
            inner: MemoryProvider::new(backend),
            failures: RefCell::new(failures.into_iter().collect()),
        }
    }
}

impl Provider for PlannedProvider {
    fn id(&self) -> &ProviderId {
        self.inner.id()
    }

    fn supports<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<bool, Error>> {
        self.inner.supports(record)
    }

    fn ensure<'a>(
        &'a self,
        record: &'a AgentRecord,
        environment: std::collections::BTreeMap<String, String>,
        progress: sandbox::ProgressReporter,
    ) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
        let planned = {
            let mut failures = self.failures.borrow_mut();
            if matches!(failures.front(), Some(PlannedFailure::Outage { ended, .. }) if ended.get()) {
                failures.pop_front();
            }
            if matches!(failures.front(), Some(PlannedFailure::Transient(_))) {
                failures.pop_front()
            } else {
                failures.front().cloned()
            }
        };
        match planned {
            Some(PlannedFailure::Invalid(message)) => Box::pin(async move { Err(Error::Invalid(message)) }),
            Some(PlannedFailure::Rejected) => Box::pin(async move {
                Err(Error::Sandbox(sandbox::Error::Invalid {
                    field: "spec.resources.cpu",
                    reason: "fractional CPUs are not supported",
                }))
            }),
            Some(PlannedFailure::InvalidAfterFlood(message)) => Box::pin(async move {
                let _phase = progress.start_phase(sandbox::SandboxPhase::ImagePrepare).await;
                let step = progress
                    .steps()
                    .start_measured_step("Pull layer", sandbox::ProgressUnit::Bytes, None)
                    .await;
                for completed in 0..TELEMETRY_FLOOD {
                    step.report(completed as u64, None).await;
                }
                Err(Error::Invalid(message))
            }),
            Some(PlannedFailure::Transient(message) | PlannedFailure::Outage { message, .. }) => Box::pin(async move {
                let _phase = progress.start_phase(sandbox::SandboxPhase::SandboxStart).await;
                Err(Error::Sandbox(sandbox::Error::Backend(message)))
            }),
            None => self.inner.ensure(record, environment, progress),
        }
    }

    fn open<'a>(
        &'a self,
        record: &'a AgentRecord,
        id: &'a sandbox::SandboxId,
    ) -> LocalFuture<'a, Result<SandboxHandle, Error>> {
        self.inner.open(record, id)
    }

    fn stop<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
        self.inner.stop(record)
    }

    fn release<'a>(&'a self, record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
        self.inner.release(record)
    }
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

    fn ensure<'a>(
        &'a self,
        _record: &'a AgentRecord,
        _environment: std::collections::BTreeMap<String, String>,
        _progress: sandbox::ProgressReporter,
    ) -> LocalFuture<'a, Result<ProviderEnsureOutcome, Error>> {
        Box::pin(async { Err(Error::Invalid("unsupported Provider was selected".into())) })
    }

    fn open<'a>(
        &'a self,
        _record: &'a AgentRecord,
        _id: &'a sandbox::SandboxId,
    ) -> LocalFuture<'a, Result<SandboxHandle, Error>> {
        Box::pin(async { Err(Error::Invalid("unsupported Provider was selected".into())) })
    }

    fn stop<'a>(&'a self, _record: &'a AgentRecord) -> LocalFuture<'a, Result<(), Error>> {
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
    Reconciler::new(store, sandbox_service(provider), ProvisioningState::default())
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
    apply_request_in(name, std::env::temp_dir().join("agent-platform-source"))
}

fn apply_request_in(name: &str, source_directory: PathBuf) -> agent::control_plane::ApplyRequest {
    agent::control_plane::ApplyRequest {
        manifest_path: Some(source_directory.join("agent.yaml")),
        env_file: None,
        source_directory,
        create_only: false,
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
    let outer = apply_request_in("outer", root.clone());
    fixture.control_plane.apply(outer).await.expect("outer Agent");
    let inner = apply_request_in("inner", root.join("nested"));
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
async fn directory_resolution_selects_leaf_variants_and_prefers_the_default_manifest() {
    let fixture = fixture();
    let root = std::env::temp_dir().join("agent-platform-variant-sources");
    let default = apply_request_in("default", root.clone());
    fixture.control_plane.apply(default).await.expect("default Agent");

    let mut nested = apply_request_in("nested", root.clone());
    nested.manifest_path = Some(root.join("agent.nested.yaml"));
    fixture.control_plane.apply(nested).await.expect("nested Agent");

    assert_eq!(
        fixture
            .control_plane
            .resolve_directory(&root)
            .await
            .expect("default preference")
            .metadata
            .name,
        "default"
    );
    assert_eq!(
        fixture
            .control_plane
            .resolve_directory_variant(&root, Some(&agent::AgentVariantName::new("nested").expect("variant")))
            .await
            .expect("variant selection")
            .metadata
            .name,
        "nested"
    );

    let mut local = apply_request_in("local", root.clone());
    local.manifest_path = Some(root.join("agent.mine.yaml"));
    fixture.control_plane.apply(local).await.expect("local Agent");
    assert_eq!(
        fixture
            .control_plane
            .resolve_directory_variant(&root, Some(&agent::AgentVariantName::new("mine").expect("variant")))
            .await
            .expect("multi-level local variant selection")
            .metadata
            .name,
        "local"
    );
    assert!(matches!(
        fixture
            .control_plane
            .resolve_directory_variant(&root, Some(&agent::AgentVariantName::new("missing").expect("variant")))
            .await,
        Err(Error::Invalid(message)) if message.contains("agent.missing.yaml")
    ));
}

#[tokio::test(flavor = "local")]
async fn directory_resolution_remains_ambiguous_without_one_default_manifest() {
    let fixture = fixture();
    let root = std::env::temp_dir().join("agent-platform-ambiguous-variant-sources");
    for (name, variant) in [("nested", "nested"), ("worktree", "worktree")] {
        let mut request = apply_request_in(name, root.clone());
        request.manifest_path = Some(root.join(format!("agent.{variant}.yaml")));
        fixture.control_plane.apply(request).await.expect("variant Agent");
    }
    let error = fixture
        .control_plane
        .resolve_directory(&root)
        .await
        .expect_err("ambiguous variants");
    assert!(matches!(error, Error::Invalid(message) if message.contains("--agent or --variant")));
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
    let mut request = apply_request_in("worker", manifest);
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
async fn api_responses_carry_provenance_without_persisting_it() {
    let fixture = fixture();
    let request = apply_request("worker");
    let expected = agent::Provenance {
        source_directory: request.source_directory.clone(),
        manifest_path: request.manifest_path.clone(),
        env_file: None,
    };

    let applied = fixture.control_plane.apply(request.clone()).await.expect("apply");
    assert_eq!(applied.status.provenance.as_ref(), Some(&expected));

    let unchanged = fixture.control_plane.apply(request).await.expect("unchanged apply");
    assert_eq!(unchanged.status.provenance.as_ref(), Some(&expected));

    let fetched = fixture.control_plane.get("worker").await.expect("get");
    assert_eq!(fetched.status.provenance.as_ref(), Some(&expected));

    let listed = fixture.control_plane.list().await.expect("list");
    assert_eq!(listed[0].status.provenance.as_ref(), Some(&expected));

    let resolved = fixture
        .control_plane
        .resolve_directory(&expected.source_directory)
        .await
        .expect("resolve directory");
    assert_eq!(resolved.status.provenance.as_ref(), Some(&expected));

    let record = stored(&fixture, "worker").await;
    assert_eq!(record.agent.status.provenance, None);
    assert_eq!(record.manifest_path, expected.manifest_path);

    reconcile(&fixture, "worker").await;
    let reconciled = fixture.control_plane.get("worker").await.expect("get after reconcile");
    assert_eq!(reconciled.status.provenance.as_ref(), Some(&expected));
    assert!(!reconciled.status.conditions.is_empty());
    let record = stored(&fixture, "worker").await;
    assert_eq!(record.agent.status.provenance, None);
}

#[tokio::test(flavor = "local")]
async fn create_only_applies_reject_existing_names() {
    let fixture = fixture();
    let mut request = apply_request("worker");
    request.create_only = true;
    fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect("initial create");

    let error = fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect_err("repeated create must fail");
    assert!(matches!(error, Error::Invalid(message) if message.contains("already exists")));

    request.create_only = false;
    fixture.control_plane.apply(request).await.expect("upsert still works");
}

#[tokio::test(flavor = "local")]
async fn applies_keep_the_recorded_manifest_path_unless_a_new_one_is_reported() {
    let fixture = fixture();
    let request = apply_request("worker");
    let recorded = request.manifest_path.clone();
    fixture.control_plane.apply(request.clone()).await.expect("apply");

    let mut pathless = request.clone();
    pathless.manifest_path = None;
    fixture.control_plane.apply(pathless).await.expect("pathless apply");
    assert_eq!(stored(&fixture, "worker").await.manifest_path, recorded);

    let mut renamed = request.clone();
    renamed.manifest_path = Some(request.source_directory.join("worker.yml"));
    let applied = fixture
        .control_plane
        .apply(renamed.clone())
        .await
        .expect("renamed apply");
    assert_eq!(stored(&fixture, "worker").await.manifest_path, renamed.manifest_path);
    assert_eq!(
        applied
            .status
            .provenance
            .and_then(|provenance| provenance.manifest_path),
        renamed.manifest_path
    );

    let mut foreign = request;
    foreign.manifest_path = Some(PathBuf::from("/elsewhere/agent.yaml"));
    let error = fixture
        .control_plane
        .apply(foreign)
        .await
        .expect_err("manifest outside sourceDirectory must fail");
    assert!(matches!(error, Error::Invalid(message) if message.contains("manifestPath")));
}

#[tokio::test(flavor = "local")]
async fn changing_the_source_directory_is_rejected_by_name() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");

    let mut moved = apply_request("worker");
    moved.source_directory = std::env::temp_dir().join("agent-platform-elsewhere");
    moved.manifest_path = Some(moved.source_directory.join("agent.yaml"));
    let error = fixture
        .control_plane
        .apply(moved)
        .await
        .expect_err("directory change must fail");
    assert!(matches!(error, Error::Immutable("sourceDirectory")));
}

#[tokio::test(flavor = "local")]
async fn changing_a_mount_is_rejected_for_an_existing_agent() {
    let fixture = fixture();
    let root = TempDirectory::new("immutable-mount");
    let mut request = apply_request_in("worker", root.path().to_path_buf());
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
    assert_eq!(
        observed
            .status
            .conditions
            .iter()
            .map(|condition| (condition.kind.as_str(), condition.status))
            .collect::<Vec<_>>(),
        [
            (agent::Condition::SANDBOX_READY, ConditionStatus::True),
            // The memory backend reports no guest heartbeat.
            (agent::Condition::SANDBOX_RESPONSIVE, ConditionStatus::Unknown),
            (agent::Condition::READY, ConditionStatus::True),
        ]
    );
    let sandbox = fixture.backend.find(&materialized_name).await.expect("sandbox");
    assert_eq!(&sandbox.id, sandbox_id);
    assert_eq!(
        sandbox.image.source,
        sandbox::image::ImageSource::Build {
            context: std::env::temp_dir().join("agent-platform-source").join("image"),
            dockerfile: PathBuf::from("Dockerfile"),
            target: None,
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
    let reconciler = Reconciler::new(store.clone(), sandboxes, ProvisioningState::default());
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
    mutable_change.agent.spec.harnesses[0].version = Some("2.1.240".into());
    mutable_change.agent.spec.harnesses[0].default = true;
    let updated_request = mutable_change.clone();
    let updated = fixture
        .control_plane
        .apply(mutable_change)
        .await
        .expect("mutable update");
    assert_eq!(updated.metadata.generation, 2);
    assert_eq!(updated.spec.harnesses[0].version.as_deref(), Some("2.1.240"));
    assert!(updated.spec.harnesses[0].default);

    let mut kind_set_change = updated_request.clone();
    kind_set_change.agent.spec.harnesses[0].default = true;
    kind_set_change.agent.spec.harnesses.push(agent::HarnessSpec {
        kind: agent::Harness::Codex,
        version: Some("0.149.1".into()),
        auth: agent::HarnessAuthMode::Mediated,
        optional: false,
        default: false,
        defaults: agent::ModelSelection::default(),
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
        optional: false,
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

#[cfg(unix)]
#[tokio::test(flavor = "local")]
async fn directory_resolution_survives_a_symlinked_parent_of_a_missing_source() {
    // macOS and Windows temp directories canonicalize to a different spelling; a source
    // directory that does not exist on disk must still resolve by its literal path.
    let fixture = fixture();
    let real = tempfile::tempdir().expect("real directory");
    let link = tempfile::tempdir().expect("link holder");
    let alias = link.path().join("alias");
    std::os::unix::fs::symlink(real.path(), &alias).expect("symlink");
    let source_directory = alias.join("missing-source");
    let request = apply_request_in("worker", source_directory.clone());
    let applied = fixture.control_plane.apply(request).await.expect("apply");

    let resolved = fixture
        .control_plane
        .resolve_directory(&source_directory.join("nested"))
        .await
        .expect("a subdirectory of the literal source path resolves");

    assert_eq!(resolved.metadata.name, applied.metadata.name);
}

#[tokio::test(flavor = "local")]
async fn selected_secret_file_inside_a_bind_mount_is_rejected() {
    let fixture = fixture();
    let root = tempfile::tempdir().expect("temporary checkout");
    let source_directory = root.path().join("examples/worktree");
    std::fs::create_dir_all(&source_directory).expect("source directory");
    let mut request = apply_request_in("worker", source_directory.clone());
    request.agent.spec.secrets.push(SecretSpec {
        environment: "GITHUB_TOKEN".into(),
        optional: false,
        placeholder: None,
        allowed_hosts: vec!["github.com".into()],
        source: None,
    });
    request.agent.spec.sandbox.mounts.push(agent::MountSpec::Bind {
        source: root.path().to_path_buf(),
        target: sandbox::SandboxPath::new("/home/agent/code/checkout"),
        read_only: false,
    });

    let initial = fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect("an absent default .env does not make the mount unsafe");

    let outside = tempfile::tempdir().expect("secret directory outside the checkout");
    request.env_file = Some(outside.path().join("worker.env"));
    let applied = fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect("a secret file outside every mount is accepted");
    assert_eq!(
        applied.status.provenance.expect("provenance").env_file,
        request.env_file
    );
    assert_eq!(
        stored(&fixture, "worker").await.env_file_path(),
        outside.path().join("worker.env")
    );
    assert!(applied.metadata.generation > initial.metadata.generation);

    std::fs::write(root.path().join(".env"), "GITHUB_TOKEN=checkout-token\n").expect("environment file");
    let error = fixture
        .control_plane
        .apply(request.clone())
        .await
        .expect_err("a .env anywhere in the mount is rejected despite the external override");
    assert!(
        matches!(&error, Error::Invalid(message) if message.contains("contains .env")),
        "{error}"
    );
    std::fs::remove_file(root.path().join(".env")).expect("remove environment file");

    let mut unchanged = request.clone();
    unchanged.env_file = None;
    let reapplied = fixture
        .control_plane
        .apply(unchanged)
        .await
        .expect("omitting envFile keeps the recorded path");
    assert_eq!(reapplied.metadata.generation, applied.metadata.generation);

    let mut inside = request;
    inside.env_file = Some(root.path().join("secrets.env"));
    let error = fixture
        .control_plane
        .apply(inside)
        .await
        .expect_err("an explicit secret file inside the mount is still rejected");
    assert!(matches!(error, Error::Invalid(_)));
}

#[tokio::test(flavor = "local")]
async fn git_ignored_nested_dot_env_is_rejected_case_insensitively_without_declared_secrets() {
    let fixture = fixture();
    let checkout = tempfile::tempdir().expect("checkout");
    let relative_env = PathBuf::from("ignored").join("nested").join(".EnV");
    let ignored = checkout
        .path()
        .join(relative_env.parent().expect("environment file parent"));
    std::fs::create_dir_all(&ignored).expect("ignored directory");
    std::fs::write(checkout.path().join(".gitignore"), "ignored/\n").expect("ignore file");
    std::fs::write(checkout.path().join(&relative_env), "PRIVATE=value\n").expect("nested environment file");
    let source = tempfile::tempdir().expect("manifest directory");
    let mut request = apply_request_in("worker", source.path().to_path_buf());
    request.agent.spec.sandbox.mounts.push(agent::MountSpec::Bind {
        source: checkout.path().to_path_buf(),
        target: sandbox::SandboxPath::new("/home/agent/code/checkout"),
        read_only: false,
    });

    let error = fixture
        .control_plane
        .apply(request)
        .await
        .expect_err("ignored directories are still inspected case-insensitively for .env files");
    let expected_path = relative_env.display().to_string();
    assert!(
        matches!(&error, Error::Invalid(message)
            if message.contains("spec.sandbox.mounts[0]") && message.contains(&expected_path)),
        "{error}"
    );
}

#[tokio::test(flavor = "local")]
async fn a_directory_named_dot_env_is_allowed() {
    let fixture = fixture();
    let checkout = tempfile::tempdir().expect("checkout");
    std::fs::create_dir(checkout.path().join(".ENV")).expect("directory named .ENV");
    let source = tempfile::tempdir().expect("manifest directory");
    let mut request = apply_request_in("worker", source.path().to_path_buf());
    request.agent.spec.sandbox.mounts.push(agent::MountSpec::Bind {
        source: checkout.path().to_path_buf(),
        target: sandbox::SandboxPath::new("/home/agent/code/checkout"),
        read_only: false,
    });

    fixture
        .control_plane
        .apply(request)
        .await
        .expect("a directory named .env is not an environment file");
}

#[cfg(unix)]
#[tokio::test(flavor = "local")]
async fn a_dot_env_symlink_is_rejected() {
    let fixture = fixture();
    let checkout = tempfile::tempdir().expect("checkout");
    std::fs::write(checkout.path().join("credentials"), "PRIVATE=value\n").expect("target file");
    std::os::unix::fs::symlink("credentials", checkout.path().join(".ENV")).expect("environment symlink");
    let source = tempfile::tempdir().expect("manifest directory");
    let mut request = apply_request_in("worker", source.path().to_path_buf());
    request.agent.spec.sandbox.mounts.push(agent::MountSpec::Bind {
        source: checkout.path().to_path_buf(),
        target: sandbox::SandboxPath::new("/home/agent/code/checkout"),
        read_only: false,
    });

    fixture
        .control_plane
        .apply(request)
        .await
        .expect_err("a case-variant .env symlink still exposes a file");
}

#[tokio::test(flavor = "local")]
async fn existing_default_env_outside_bind_mount_is_allowed() {
    let fixture = fixture();
    let source = tempfile::tempdir().expect("manifest directory");
    let checkout = tempfile::tempdir().expect("mounted checkout");
    let external = tempfile::tempdir().expect("external environment directory");
    std::fs::write(source.path().join(".env"), "GITHUB_TOKEN=unmounted-token\n")
        .expect("unmounted default environment file");
    let mut request = apply_request_in("worker", source.path().to_path_buf());
    request.env_file = Some(external.path().join("worker.env"));
    request.agent.spec.secrets.push(SecretSpec {
        environment: "GITHUB_TOKEN".into(),
        optional: false,
        placeholder: None,
        allowed_hosts: vec!["github.com".into()],
        source: None,
    });
    request.agent.spec.sandbox.mounts.push(agent::MountSpec::Bind {
        source: checkout.path().to_path_buf(),
        target: sandbox::SandboxPath::new("/home/agent/code/checkout"),
        read_only: false,
    });

    fixture
        .control_plane
        .apply(request)
        .await
        .expect("an unmounted default .env is not exposed");
}

#[cfg(unix)]
#[tokio::test(flavor = "local")]
async fn secret_file_reached_through_a_symlinked_ancestor_is_still_rejected() {
    let fixture = fixture();
    let checkout = tempfile::tempdir().expect("checkout");
    let link_holder = tempfile::tempdir().expect("link holder");
    let alias = link_holder.path().join("alias");
    std::os::unix::fs::symlink(checkout.path(), &alias).expect("symlink");
    let source_directory = checkout.path().join("examples/worktree");
    std::fs::create_dir_all(&source_directory).expect("source directory");
    let mut request = apply_request_in("worker", source_directory);
    request.agent.spec.secrets.push(SecretSpec {
        environment: "GITHUB_TOKEN".into(),
        optional: false,
        placeholder: None,
        allowed_hosts: vec!["github.com".into()],
        source: None,
    });
    request.agent.spec.sandbox.mounts.push(agent::MountSpec::Bind {
        source: checkout.path().to_path_buf(),
        target: sandbox::SandboxPath::new("/home/agent/code/checkout"),
        read_only: false,
    });
    // Neither the file nor its two parent directories exist yet, and the path enters the
    // mounted checkout through a symlink.
    request.env_file = Some(alias.join("secrets/not-yet/worker.env"));

    let error = fixture
        .control_plane
        .apply(request)
        .await
        .expect_err("the secret file would land inside the mounted checkout");
    assert!(matches!(error, Error::Invalid(_)), "{error}");
}

#[tokio::test(flavor = "local")]
async fn bind_mount_exposing_another_agents_secret_file_is_rejected() {
    let fixture = fixture();
    let root = tempfile::tempdir().expect("temporary checkout");
    let with_secrets = root.path().join("agents/full");
    std::fs::create_dir_all(&with_secrets).expect("secret Agent source directory");
    let mut secret_agent = apply_request_in("full", with_secrets);
    let selected_secret_file = root.path().join("credentials.txt");
    std::fs::write(&selected_secret_file, "GITHUB_TOKEN=private\n").expect("selected environment file");
    secret_agent.env_file = Some(selected_secret_file);
    secret_agent.agent.spec.secrets.push(SecretSpec {
        environment: "GITHUB_TOKEN".into(),
        optional: false,
        placeholder: None,
        allowed_hosts: vec!["github.com".into()],
        source: None,
    });
    fixture.control_plane.apply(secret_agent).await.expect("secret Agent");

    let mounted = root.path().join("agents/worktree");
    std::fs::create_dir_all(&mounted).expect("mounted Agent source directory");
    let mut worktree = apply_request_in("worktree", mounted);
    worktree.agent.spec.sandbox.mounts.push(agent::MountSpec::Bind {
        source: root.path().to_path_buf(),
        target: sandbox::SandboxPath::new("/home/agent/code/checkout"),
        read_only: false,
    });

    let error = fixture
        .control_plane
        .apply(worktree)
        .await
        .expect_err("the mount would expose the other Agent's selected environment file");
    assert!(
        matches!(&error, Error::Invalid(message) if message.contains("Agent \"full\"")),
        "{error}"
    );
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
async fn selected_environment_converges_from_the_env_file_without_exporting_other_values() {
    let fixture = fixture();
    let source = tempfile::tempdir().expect("Agent source");
    let mut request = apply_request_in("worker", source.path().to_path_buf());
    request.agent.spec.environment = vec![
        EnvironmentSpec {
            name: "GIT_USER_NAME".into(),
            source: Some("HOST_GIT_NAME".into()),
        },
        EnvironmentSpec {
            name: "GIT_USER_EMAIL".into(),
            source: None,
        },
    ];
    std::fs::write(
        source.path().join(".env"),
        "HOST_GIT_NAME=First User\nGIT_USER_EMAIL=first@example.com\nUNSELECTED=private\n",
    )
    .expect("first environment file");
    fixture.control_plane.apply(request.clone()).await.expect("apply");
    reconcile(&fixture, "worker").await;
    let record = stored(&fixture, "worker").await;
    let first = fixture
        .backend
        .find(&sandbox_name(&record))
        .await
        .expect("Sandbox after first apply");
    assert_eq!(
        first.environment.get("GIT_USER_NAME").map(String::as_str),
        Some("First User")
    );
    assert_eq!(
        first.environment.get("GIT_USER_EMAIL").map(String::as_str),
        Some("first@example.com")
    );
    assert!(!first.environment.contains_key("UNSELECTED"));

    std::fs::write(
        source.path().join(".env"),
        "HOST_GIT_NAME=Second User\nGIT_USER_EMAIL=second@example.com\nUNSELECTED=still-private\n",
    )
    .expect("updated environment file");
    let reapplied = fixture.control_plane.apply(request).await.expect("unchanged reapply");
    assert_eq!(reapplied.metadata.generation, 1);
    reconcile(&fixture, "worker").await;
    let second = fixture
        .backend
        .find(&sandbox_name(&record))
        .await
        .expect("Sandbox after environment update");
    assert_eq!(
        second.environment.get("GIT_USER_NAME").map(String::as_str),
        Some("Second User")
    );
    assert_eq!(
        second.environment.get("GIT_USER_EMAIL").map(String::as_str),
        Some("second@example.com")
    );
    assert!(!second.environment.contains_key("UNSELECTED"));
}

#[tokio::test(flavor = "local")]
async fn selected_environment_requires_present_non_empty_values() {
    let fixture = fixture();
    let source = tempfile::tempdir().expect("Agent source");
    let mut request = apply_request_in("worker", source.path().to_path_buf());
    request.agent.spec.environment = vec![
        EnvironmentSpec {
            name: "GIT_USER_NAME".into(),
            source: None,
        },
        EnvironmentSpec {
            name: "GIT_USER_EMAIL".into(),
            source: None,
        },
    ];
    std::fs::write(source.path().join(".env"), "GIT_USER_NAME=\n").expect("incomplete environment file");
    fixture.control_plane.apply(request).await.expect("apply");
    let id = stored(&fixture, "worker").await.id;

    let error = fixture
        .reconciler
        .reconcile(id)
        .await
        .expect_err("empty selected value must fail");
    assert!(matches!(error, Error::Invalid(message) if message.contains("GIT_USER_NAME") && message.contains("empty")));

    std::fs::write(source.path().join(".env"), "GIT_USER_NAME=Ready\n").expect("missing environment value");
    let error = fixture
        .reconciler
        .reconcile(id)
        .await
        .expect_err("missing selected value must fail");
    assert!(
        matches!(error, Error::Invalid(message) if message.contains("GIT_USER_EMAIL") && message.contains("does not define"))
    );
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

/// An Agent `worker` whose Sandbox ensures fail as planned, reconciled by a
/// running controller, with a waiter over the same change history.
struct Waiting {
    store: Rc<memory::InMemoryAgentStore>,
    backend: Rc<sandbox_memory::Provider>,
    provisioning: ProvisioningState,
    execution: Rc<ExecutionService>,
    wakeup: agent::control_plane::Wakeup,
    task: tokio::task::JoinHandle<()>,
}

/// A controller interval short enough for a test to wait through background retries.
const BACKGROUND_RETRIES: Duration = Duration::from_millis(20);
/// A controller interval long enough that only a test's own wakeups reconcile.
const NO_BACKGROUND_PASSES: Duration = Duration::from_mins(1);

async fn waiting(failures: impl IntoIterator<Item = PlannedFailure>, interval: Duration) -> Waiting {
    let changes = Changes::new();
    let store = Rc::new(memory::InMemoryAgentStore::with_changes(changes.clone()));
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(PlannedProvider::new(backend.clone(), failures));
    let provisioning = ProvisioningState::new(changes.clone());
    let reconciler = Rc::new(Reconciler::new(
        store.clone(),
        sandbox_service(provider),
        provisioning.clone(),
    ));
    let (controller, wakeup) = Controller::new(store.clone(), reconciler, interval, Rc::new(|_, _| {}));
    let execution = Rc::new(ExecutionService::new(
        store.clone(),
        Convergence::new(wakeup.clone(), store.clone(), changes),
    ));
    let task = tokio::task::spawn_local(controller.run());
    tokio::task::yield_now().await;
    control_plane.apply(apply_request("worker")).await.expect("apply");
    Waiting {
        store,
        backend,
        provisioning,
        execution,
        wakeup,
        task,
    }
}

impl Waiting {
    async fn id(&self) -> AgentId {
        self.store.get_by_name("worker").await.expect("stored Agent").id
    }
}

#[tokio::test(flavor = "local")]
async fn execution_target_waits_for_agent_convergence() {
    let fixture = waiting([], NO_BACKGROUND_PASSES).await;
    let target = tokio::time::timeout(
        Duration::from_secs(1),
        fixture.execution.ensure("worker", WaitPolicy::FirstPass),
    )
    .await
    .expect("execution target should not wait for the periodic scan")
    .expect("ready execution target");

    assert_eq!(target.operating_system, "linux");
    assert_eq!(target.sandbox.provider().as_str(), "memory");
    assert!(target.sandbox.id().is_some());
    assert_eq!(fixture.backend.count(), 1);
    fixture.task.abort();
}

#[tokio::test(flavor = "local")]
async fn an_invalid_failure_fails_the_wait_immediately() {
    let fixture = waiting(
        [PlannedFailure::Invalid(
            ".env does not define required variable \"GITHUB_TOKEN\"".into(),
        )],
        NO_BACKGROUND_PASSES,
    )
    .await;
    let error = fixture
        .execution
        .ensure("worker", WaitPolicy::UntilConverged)
        .await
        .expect_err("invalid preparation must fail fast");

    assert!(matches!(error, Error::Invalid(message) if message.contains("GITHUB_TOKEN")));
    let stored = fixture.store.get(fixture.id().await).await.expect("stored Agent");
    assert_eq!(stored.agent.status.failure, Some(FailureKind::Invalid));
    let provisioning = fixture.provisioning.get(stored.id).expect("failed pass");
    assert!(matches!(
        provisioning.progress.status(),
        sandbox::progress::OperationStatus::Failed { .. }
    ));
    fixture.task.abort();
}

#[tokio::test(flavor = "local")]
async fn a_provider_rejection_is_permanent_and_fails_the_wait_immediately() {
    let fixture = waiting([PlannedFailure::Rejected], NO_BACKGROUND_PASSES).await;
    let error = tokio::time::timeout(
        Duration::from_secs(1),
        fixture.execution.ensure("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("a permanent rejection must not be waited through")
    .expect_err("rejected request fails");

    assert!(matches!(error, Error::Invalid(message) if message.contains("fractional CPUs")));
    fixture.task.abort();
}

#[tokio::test(flavor = "local")]
async fn a_flood_of_progress_does_not_stall_the_wait() {
    let fixture = waiting(
        [PlannedFailure::InvalidAfterFlood(
            ".env does not define required variable \"GITHUB_TOKEN\"".into(),
        )],
        NO_BACKGROUND_PASSES,
    )
    .await;
    let error = tokio::time::timeout(
        Duration::from_secs(1),
        fixture.execution.ensure("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("progress volume must not stall the request")
    .expect_err("invalid preparation must fail");

    assert!(matches!(error, Error::Invalid(message) if message.contains("GITHUB_TOKEN")));
    fixture.task.abort();
}

#[tokio::test(flavor = "local")]
async fn waiting_follows_background_retries_after_transient_failures() {
    let fixture = waiting(
        [
            PlannedFailure::Transient("temporary runtime failure".into()),
            PlannedFailure::Transient("temporary runtime failure".into()),
        ],
        BACKGROUND_RETRIES,
    )
    .await;
    let target = tokio::time::timeout(
        Duration::from_secs(1),
        fixture.execution.ensure("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("background retry should complete")
    .expect("eventual execution target");

    assert!(target.sandbox.id().is_some());
    let provisioning = fixture.provisioning.get(fixture.id().await).expect("latest pass");
    assert_eq!(
        provisioning.progress.status(),
        &sandbox::progress::OperationStatus::Succeeded,
        "the latest pass is the retry that succeeded"
    );
    fixture.task.abort();
}

#[tokio::test(flavor = "local")]
async fn provisioning_is_projected_but_not_stored_and_omitted_after_success() {
    let changes = Changes::new();
    let store = Rc::new(memory::InMemoryAgentStore::with_changes(changes.clone()));
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(PlannedProvider::new(
        backend,
        [PlannedFailure::Transient("temporary runtime failure".into())],
    ));
    let provisioning = ProvisioningState::new(changes.clone());
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()))
        .with_provisioning(provisioning.clone());
    let reconciler = Reconciler::new(store.clone(), sandbox_service(provider), provisioning.clone());
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("stored Agent").id;

    reconciler.reconcile(id).await.expect_err("planned transient failure");
    let failed = control_plane.get("worker").await.expect("failed Agent");
    assert_eq!(failed.status.failure, Some(FailureKind::Transient));
    let summary = failed.status.progress.expect("failed provisioning");
    assert!(matches!(
        summary.progress.status(),
        sandbox::progress::OperationStatus::Failed { detail } if detail.contains("temporary runtime failure")
    ));
    assert_eq!(
        store.get(id).await.expect("stored Agent").agent.status.progress,
        None,
        "provisioning is projected, never stored"
    );

    reconciler.reconcile(id).await.expect("retry succeeds");
    let ready = control_plane.get("worker").await.expect("ready Agent");
    assert!(ready.status.is_ready());
    assert_eq!(ready.status.failure, None);
    assert_eq!(ready.status.progress, None, "a succeeded pass is not listed");
    let finished = provisioning.get(id).expect("finished pass");
    assert_ne!(finished.pass, summary.pass, "each retry is a new pass");
    assert_eq!(
        finished.progress.status(),
        &sandbox::progress::OperationStatus::Succeeded
    );
    assert!(
        finished
            .progress
            .finished()
            .iter()
            .any(|phase| phase.phase == agent::progress::SETUP && phase.outcome == sandbox::Outcome::Completed),
        "Agent setup is reported as a phase of the pass"
    );

    let revision = changes.revision();
    reconciler.reconcile(id).await.expect("resync of a Ready Agent");
    assert_eq!(
        provisioning.get(id),
        Some(finished),
        "a resync that succeeds leaves the pass that provisioned the Agent"
    );
    let resynced = control_plane.get("worker").await.expect("resynced Agent");
    assert_eq!(resynced.status.progress, None);
    assert!(resynced.status.is_ready());
    assert_eq!(
        changes.revision(),
        revision,
        "a resync that changes nothing wakes no watcher"
    );
}

#[tokio::test(flavor = "local")]
async fn progress_trims_only_the_output_of_the_pass_the_follower_has_seen() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let provisioning = ProvisioningState::default();
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()))
        .with_provisioning(provisioning.clone());
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("stored Agent").id;
    let texts = |provisioning: &agent::progress::Provisioning| {
        provisioning
            .progress
            .output()
            .lines()
            .map(|line| line.text.clone())
            .collect::<Vec<_>>()
    };

    let first = SandboxObserver::new(id, provisioning.clone());
    let phase = first.reporter().start_phase(agent::progress::SETUP).await;
    let step = first.reporter().steps().start_step("Sync home").await;
    step.output(sandbox::OutputStream::Stdout, "one\ntwo\n").await;
    let (_, full) = control_plane.progress("worker", None).await.expect("progress");
    let full = full.expect("first pass");
    assert_eq!(texts(&full), ["one", "two"]);

    let seen = OutputPosition {
        pass: full.pass,
        sequence: 1,
    };
    let (_, trimmed) = control_plane.progress("worker", Some(seen)).await.expect("progress");
    assert_eq!(
        texts(&trimmed.expect("first pass")),
        ["two"],
        "output already seen is left out"
    );
    drop((step, phase, first));

    let second = SandboxObserver::new(id, provisioning.clone());
    let _phase = second.reporter().start_phase(agent::progress::SETUP).await;
    let step = second.reporter().steps().start_step("Sync home").await;
    step.output(sandbox::OutputStream::Stdout, "three\n").await;
    let (_, next) = control_plane.progress("worker", Some(seen)).await.expect("progress");
    let next = next.expect("second pass");
    assert_ne!(next.pass, full.pass);
    assert_eq!(texts(&next), ["three"], "a position in another pass trims nothing");
}

#[tokio::test(flavor = "local")]
async fn a_first_pass_wait_returns_its_failure_and_until_ready_waits_through_retries() {
    let fixture = waiting(
        [
            PlannedFailure::Transient("temporary runtime failure".into()),
            PlannedFailure::Transient("temporary runtime failure".into()),
        ],
        BACKGROUND_RETRIES,
    )
    .await;
    let error = fixture
        .execution
        .ensure("worker", WaitPolicy::FirstPass)
        .await
        .expect_err("first pass fails");
    assert!(matches!(error, Error::Daemon(message) if message.contains("temporary runtime failure")));

    let target = tokio::time::timeout(
        Duration::from_secs(1),
        fixture.execution.ensure("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("background retry should complete")
    .expect("eventual execution target");
    assert!(target.sandbox.id().is_some());
    fixture.task.abort();
}

#[tokio::test(flavor = "local")]
async fn dropping_a_wait_does_not_stop_background_reconciliation() {
    // Every pass fails until the wait is dropped, so the failure stays visible
    // and only a pass that starts after the drop can succeed.
    let ended = Rc::new(Cell::new(false));
    let fixture = waiting(
        [PlannedFailure::Outage {
            message: "temporary runtime failure".into(),
            ended: ended.clone(),
        }],
        BACKGROUND_RETRIES,
    )
    .await;
    let id = fixture.id().await;
    let waiting = fixture.execution.clone();
    let wait = tokio::task::spawn_local(async move { waiting.ensure("worker", WaitPolicy::UntilConverged).await });
    tokio::time::timeout(Duration::from_secs(1), async {
        while !fixture.provisioning.get(id).is_some_and(|pass| {
            matches!(
                pass.progress.status(),
                sandbox::progress::OperationStatus::Failed { .. }
            )
        }) {
            tokio::time::sleep(Duration::from_millis(1)).await;
        }
    })
    .await
    .expect("transient failure recorded");
    wait.abort();
    ended.set(true);

    tokio::time::timeout(Duration::from_secs(1), async {
        while fixture.backend.count() == 0 {
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("background controller should keep reconciling");
    let _ = fixture.wakeup;
    fixture.task.abort();
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

fn is_ssh_server_check(spec: &sandbox::execution::ExecutionSpec) -> bool {
    matches!(
        spec.program(),
        sandbox::execution::Program::Command { executable, args }
            if executable.as_str() == "/usr/bin/test" && args == &["-x", "/usr/sbin/sshd"]
    )
}

fn is_ssh_policy_check(spec: &sandbox::execution::ExecutionSpec) -> bool {
    matches!(
        spec.program(),
        sandbox::execution::Program::Command { executable, args }
            if executable.as_str() == "/usr/bin/sudo"
                && args == &[
                    "-n",
                    "/usr/sbin/sshd",
                    "-T",
                    "-f",
                    "/var/lib/agent/ssh/sshd_config",
                    "-C",
                    "user=agent,host=localhost,addr=127.0.0.1,laddr=127.0.0.1,lport=2222",
                ]
    )
}

fn exited(code: i32) -> Vec<sandbox::execution::ExecutionEvent> {
    vec![
        sandbox::execution::ExecutionEvent::Started { process_id: None },
        sandbox::execution::ExecutionEvent::Exited(sandbox::execution::ExitStatus { code }),
    ]
}

#[tokio::test(flavor = "local")]
async fn ssh_access_is_reported_underneath_ready_and_cleaned_up_on_deletion() {
    let temporary = TempDirectory::new("ssh-access");
    let home = agent::local::home::ControlPlaneHome::resolve(Some(&temporary.path().join("home"))).expect("home");
    home.prepare().expect("prepare home");
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()));
    let keys = Rc::new(agent::ssh::memory::InMemoryHostKeyStore::new());
    let ssh = Rc::new(
        agent::ssh::Access::new(
            &home,
            PathBuf::from("/usr/local/bin/agentctl"),
            keys.clone(),
            store.clone(),
        )
        .with_user_home(None),
    );
    let reconciler =
        Reconciler::new(store.clone(), sandbox_service(provider), ProvisioningState::default()).with_ssh_access(ssh);
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    let mut request = apply_request("worker");
    request.agent.spec.access = vec![agent::AccessSpec::Ssh {}];
    control_plane.apply(request).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("stored").id;

    // The image lacks a server: the Agent is not Ready and the failure is permanent.
    backend.queue_execution_events_matching(is_ssh_server_check, exited(1));
    let error = reconciler
        .reconcile(id)
        .await
        .expect_err("missing server fails the pass");
    assert_eq!(agent::ReconcileFailure::classify(&error).kind, FailureKind::Invalid);
    let status = store.get(id).await.expect("record").agent.status;
    let ready = status.ready_condition().expect("Ready condition");
    assert_eq!(ready.status, ConditionStatus::False);
    assert_eq!(ready.reason, "SshAccessFailed");
    assert!(ready.message.contains("cannot provide SSH access"));
    let ssh_ready = status
        .conditions
        .iter()
        .find(|condition| condition.kind == agent::Condition::SSH_READY)
        .expect("SshReady condition");
    assert_eq!(ssh_ready.status, ConditionStatus::False);
    assert!(
        status
            .sandbox
            .as_ref()
            .and_then(agent::sandbox::Assignment::id)
            .is_some()
    );
    assert!(!keys.contains(id));

    // A server is present: the Agent is Ready and SshReady is reported alongside SandboxReady.
    backend.queue_execution_events_matching(is_ssh_server_check, exited(0));
    backend.queue_execution_events_matching(
        is_ssh_policy_check,
        vec![
            sandbox::execution::ExecutionEvent::Started { process_id: None },
            sandbox::execution::ExecutionEvent::Stdout(b"permituserenvironment yes\nusepam no\n".as_slice().into()),
            sandbox::execution::ExecutionEvent::Exited(sandbox::execution::ExitStatus { code: 0 }),
        ],
    );
    reconciler.reconcile(id).await.expect("reconcile with a server");
    let status = store.get(id).await.expect("record").agent.status;
    assert!(status.is_ready());
    assert_eq!(
        status
            .conditions
            .iter()
            .map(|condition| (condition.kind.as_str(), condition.status))
            .collect::<Vec<_>>(),
        [
            (agent::Condition::SANDBOX_READY, ConditionStatus::True),
            (agent::Condition::SANDBOX_RESPONSIVE, ConditionStatus::Unknown),
            (agent::Condition::SSH_READY, ConditionStatus::True),
            (agent::Condition::READY, ConditionStatus::True),
        ]
    );
    assert!(keys.contains(id));
    let ssh_home = agent::ssh::SshHome::new(&home);
    assert!(ssh_home.identity_path(id).is_file());
    let known_hosts = std::fs::read_to_string(ssh_home.known_hosts_path()).expect("known_hosts");
    assert!(known_hosts.starts_with(&format!("agent-{id} ssh-ed25519 ")));
    assert!(known_hosts.contains("\nagentctl-worker ssh-ed25519 "));
    assert!(
        std::fs::read_to_string(ssh_home.config_path())
            .expect("config")
            .contains("Host agentctl-worker\n")
    );

    control_plane.delete("worker").await.expect("delete request");
    reconciler.reconcile(id).await.expect("delete");
    assert!(!keys.contains(id));
    assert!(!ssh_home.agent_directory(id).exists());
    assert_eq!(
        std::fs::read_to_string(ssh_home.known_hosts_path()).expect("known_hosts"),
        ""
    );
    assert!(
        !std::fs::read_to_string(ssh_home.config_path())
            .expect("config")
            .contains("Host ")
    );
}

/// A Linux platform whose setup can be made to wait forever, as setup does
/// when its guest stops answering Executions.
#[derive(Default)]
struct StallingPlatform {
    stall: Cell<bool>,
    /// Setup fails at once, as a command timing out inside the guest does.
    fail: Cell<bool>,
    setups: Cell<usize>,
    started: Notify,
}

impl PlatformAdapter for StallingPlatform {
    fn supports(&self, platform: &Platform) -> bool {
        platform.os == "linux"
    }

    fn setup<'a>(
        &'a self,
        _record: &'a AgentRecord,
        _sandbox: &'a SandboxHandle,
        _harnesses: &'a [agent::Harness],
        _steps: &'a sandbox::SandboxProgress,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.setups.set(self.setups.get() + 1);
            if self.fail.get() {
                return Err(Error::SandboxSetup("`codex --version` did not finish within 5s".into()));
            }
            if self.stall.get() {
                self.started.notify_one();
                std::future::pending::<()>().await;
            }
            Ok(())
        })
    }
}

/// An Agent `worker` whose guest heartbeat and setup the test controls.
struct Stalling {
    store: Rc<memory::InMemoryAgentStore>,
    backend: Rc<sandbox_memory::Provider>,
    platform: Rc<StallingPlatform>,
    reconciler: Rc<Reconciler>,
    id: AgentId,
}

async fn stalling(changes: Changes) -> Stalling {
    let store = Rc::new(memory::InMemoryAgentStore::with_changes(changes));
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()));
    let platform = Rc::new(StallingPlatform::default());
    let sandboxes =
        Rc::new(Service::new([provider], [platform.clone() as Rc<dyn PlatformAdapter>]).expect("Sandbox service"));
    let reconciler = Rc::new(Reconciler::new(store.clone(), sandboxes, ProvisioningState::default()));
    ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()))
        .apply(apply_request("worker"))
        .await
        .expect("apply");
    let id = store.get_by_name("worker").await.expect("stored Agent").id;
    Stalling {
        store,
        backend,
        platform,
        reconciler,
        id,
    }
}

impl Stalling {
    async fn record(&self) -> AgentRecord {
        self.store.get(self.id).await.expect("stored Agent")
    }

    /// Reports `sequence` as the guest's heartbeat.
    async fn beat(&self, sequence: u64) {
        let record = self.record().await;
        let sandbox = record
            .agent
            .status
            .sandbox
            .as_ref()
            .and_then(agent::sandbox::Assignment::id)
            .expect("materialized Sandbox");
        self.backend
            .set_guest_heartbeat(sandbox, Some(GuestHeartbeat::new(sequence)))
            .expect("heartbeat should be set");
    }
}

fn condition<'a>(status: &'a Status, kind: &str) -> &'a agent::Condition {
    status
        .conditions
        .iter()
        .find(|condition| condition.kind == kind)
        .expect("the condition should be recorded")
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn a_stalled_guest_ends_setup_and_its_agent_reports_it_unresponsive() {
    let fixture = stalling(Changes::new()).await;
    fixture.reconciler.reconcile(fixture.id).await.expect("first pass");
    let status = fixture.record().await.agent.status;
    assert!(status.is_ready());
    assert_eq!(
        condition(&status, agent::Condition::SANDBOX_RESPONSIVE).reason,
        "HeartbeatNotObserved"
    );
    fixture.beat(1).await;
    tokio::time::advance(Duration::from_secs(1)).await;
    fixture.beat(2).await;

    fixture.platform.stall.set(true);
    let pass = tokio::task::spawn_local({
        let reconciler = fixture.reconciler.clone();
        let id = fixture.id;
        async move { reconciler.reconcile(id).await }
    });
    fixture.platform.started.notified().await;

    // The heartbeat stays at 2, so the pass's own inspections find the stall.
    let result = pass.await.expect("the pass should not panic");
    assert!(
        matches!(result, Err(Error::SandboxUnresponsive(_))),
        "the stalled pass should end as unresponsive, got {result:?}"
    );
    let status = fixture.record().await.agent.status;
    let ready = condition(&status, agent::Condition::READY);
    assert_eq!(
        (ready.status, ready.reason.as_str()),
        (ConditionStatus::False, "SandboxUnresponsive")
    );
    let responsive = condition(&status, agent::Condition::SANDBOX_RESPONSIVE);
    assert_eq!(
        (responsive.status, responsive.reason.as_str()),
        (ConditionStatus::False, "HeartbeatStale")
    );
    assert_eq!(
        condition(&status, agent::Condition::SANDBOX_READY).status,
        ConditionStatus::True,
        "the Sandbox lifecycle is unchanged"
    );
    assert_eq!(status.failure, Some(FailureKind::Transient));

    // While the guest stays stalled, a pass does not reach into it.
    let setups = fixture.platform.setups.get();
    let result = fixture.reconciler.reconcile(fixture.id).await;
    assert!(matches!(result, Err(Error::SandboxUnresponsive(_))), "{result:?}");
    assert_eq!(fixture.platform.setups.get(), setups);

    // A heartbeat that advances again makes the Agent Ready.
    fixture.platform.stall.set(false);
    fixture.beat(3).await;
    fixture.reconciler.reconcile(fixture.id).await.expect("recovered pass");
    let status = fixture.record().await.agent.status;
    assert!(status.is_ready());
    let responsive = condition(&status, agent::Condition::SANDBOX_RESPONSIVE);
    assert_eq!(
        (responsive.status, responsive.reason.as_str()),
        (ConditionStatus::True, "HeartbeatAdvancing")
    );
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn a_failure_from_a_guest_that_stopped_beating_is_reported_as_the_stall() {
    let fixture = stalling(Changes::new()).await;
    fixture.reconciler.reconcile(fixture.id).await.expect("first pass");
    fixture.beat(1).await;
    fixture.platform.fail.set(true);

    let result = fixture.reconciler.reconcile(fixture.id).await;

    assert!(matches!(result, Err(Error::SandboxUnresponsive(_))), "{result:?}");
    let status = fixture.record().await.agent.status;
    assert_eq!(
        condition(&status, agent::Condition::READY).reason,
        "SandboxUnresponsive"
    );
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn a_failure_from_a_guest_that_still_beats_stands() {
    let fixture = stalling(Changes::new()).await;
    fixture.reconciler.reconcile(fixture.id).await.expect("first pass");
    fixture.beat(1).await;
    fixture.platform.fail.set(true);
    let beating = tokio::task::spawn_local({
        let fixture = Rc::new(fixture);
        let pass = fixture.clone();
        let beats = async move {
            let mut sequence = 1;
            loop {
                tokio::time::sleep(Duration::from_secs(1)).await;
                sequence += 1;
                fixture.beat(sequence).await;
            }
        };
        async move {
            tokio::select! {
                () = beats => unreachable!(),
                result = pass.reconciler.reconcile(pass.id) => result,
            }
        }
    });

    let result = beating.await.expect("the pass should not panic");

    assert!(
        matches!(&result, Err(Error::SandboxSetup(message)) if message.contains("codex --version")),
        "{result:?}"
    );
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn an_agent_with_a_stalled_guest_can_still_be_deleted() {
    let fixture = stalling(Changes::new()).await;
    fixture.reconciler.reconcile(fixture.id).await.expect("first pass");
    fixture.beat(1).await;
    fixture.platform.stall.set(true);
    let result = fixture.reconciler.reconcile(fixture.id).await;
    assert!(matches!(result, Err(Error::SandboxUnresponsive(_))), "{result:?}");

    ControlPlane::new(fixture.store.clone(), Rc::new(NotificationCounter::default()))
        .delete("worker")
        .await
        .expect("delete request");
    let sandbox = sandbox_name(&fixture.record().await);
    fixture.reconciler.reconcile(fixture.id).await.expect("release");

    assert!(matches!(fixture.store.get(fixture.id).await, Err(Error::NotFound)));
    let retained = fixture.backend.find(&sandbox).await.expect("retained Sandbox");
    assert_eq!(retained.state, sandbox::SandboxState::Stopped);
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn waiting_until_ready_ends_once_the_guest_is_recorded_unresponsive() {
    let changes = Changes::new();
    let fixture = stalling(changes.clone()).await;
    let (controller, wakeup) = Controller::new(
        fixture.store.clone(),
        fixture.reconciler.clone(),
        NO_BACKGROUND_PASSES,
        Rc::new(|_, _| {}),
    );
    let task = tokio::task::spawn_local(controller.run());
    let convergence = Convergence::new(wakeup, fixture.store.clone(), changes);
    convergence
        .converge("worker", WaitPolicy::UntilConverged)
        .await
        .expect("the healthy Agent should become Ready");
    fixture.beat(1).await;
    fixture.platform.stall.set(true);

    let started = tokio::time::Instant::now();
    let result = convergence.converge("worker", WaitPolicy::UntilConverged).await;

    assert!(matches!(result, Err(Error::SandboxUnresponsive(_))), "{result:?}");
    let waited = started.elapsed();
    assert!(
        waited >= UNRESPONSIVE_AFTER && waited < UNRESPONSIVE_AFTER + Duration::from_secs(3),
        "the wait ends with the pass that finds the stall, took {waited:?}"
    );
    task.abort();
}

async fn assert_stopped(store: &memory::InMemoryAgentStore, backend: &sandbox_memory::Provider, id: AgentId) {
    let record = store.get(id).await.expect("stored Agent");
    let status = &record.agent.status;
    assert!(status.is_stopped(), "{status:?}");
    assert_eq!(status.observed_generation, record.agent.metadata.generation);
    assert_eq!(status.failure, None, "a stop is not a failure");
    let ready = condition(status, agent::Condition::READY);
    assert_eq!(ready.status, ConditionStatus::False);
    assert_eq!(
        condition(status, agent::Condition::SANDBOX_READY).reason,
        agent::Condition::REASON_STOPPED
    );
    assert!(
        status
            .conditions
            .iter()
            .all(|condition| condition.kind != agent::Condition::SANDBOX_RESPONSIVE),
        "a stopped Sandbox has no guest to be responsive or not: {status:?}"
    );
    let sandbox = backend.find(&sandbox_name(&record)).await.expect("kept Sandbox");
    assert_eq!(sandbox.state, sandbox::SandboxState::Stopped);
}

#[tokio::test(flavor = "local")]
async fn a_stopped_agent_keeps_its_sandbox_stopped_across_passes_and_reapplies() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");
    reconcile(&fixture, "worker").await;
    let ready = stored(&fixture, "worker").await;
    let sandbox = ready.agent.status.sandbox.clone().expect("materialized Sandbox");

    let stopping = fixture
        .control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    assert_eq!(stopping.metadata.generation, ready.agent.metadata.generation + 1);
    assert_eq!(stopping.spec.run_state, Some(agent::RunState::Stopped));
    reconcile(&fixture, "worker").await;
    assert_stopped(&fixture.store, &fixture.backend, ready.id).await;
    let stopped = stored(&fixture, "worker").await;
    assert_eq!(
        stopped.agent.status.sandbox,
        Some(sandbox),
        "the Sandbox keeps its identity"
    );

    // A periodic pass and a repeated stop change nothing.
    reconcile(&fixture, "worker").await;
    let again = fixture
        .control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("repeated stop");
    assert_eq!(again.metadata.generation, stopped.agent.metadata.generation);
    assert_stopped(&fixture.store, &fixture.backend, ready.id).await;

    // Applying a manifest that does not set a run state keeps the Agent stopped.
    let reapplied = fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("re-apply");
    assert_eq!(reapplied.metadata.generation, stopped.agent.metadata.generation);
    assert!(reapplied.spec.is_stopped());
    let mut changed = apply_request("worker");
    changed.agent.spec.harnesses[0].version = Some("2.1.240".into());
    let changed = fixture.control_plane.apply(changed).await.expect("changed apply");
    assert!(changed.spec.is_stopped(), "a changed manifest keeps the run state too");
    reconcile(&fixture, "worker").await;
    assert_stopped(&fixture.store, &fixture.backend, ready.id).await;
    assert_eq!(fixture.backend.count(), 1);

    // A manifest that sets the run state changes it, like `agentctl start` does.
    let mut running = apply_request("worker");
    running.agent.spec.harnesses[0].version = Some("2.1.240".into());
    running.agent.spec.run_state = Some(agent::RunState::Running);
    let started = fixture.control_plane.apply(running).await.expect("apply Running");
    assert_eq!(started.spec.run_state, None, "Running is stored as omitted");
    reconcile(&fixture, "worker").await;
    assert!(stored(&fixture, "worker").await.agent.status.is_ready());
}

#[tokio::test(flavor = "local")]
async fn a_start_boots_the_same_sandbox_and_wakes_sessions() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()));
    let notifications = Rc::new(SessionNotificationCounter::default());
    let reconciler = reconciler(store.clone(), provider).with_session_notifier(notifications.clone());
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("Agent").id;
    reconciler.reconcile(id).await.expect("materialize");
    let sandbox = store.get(id).await.expect("Agent").agent.status.sandbox;

    control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    reconciler.reconcile(id).await.expect("stop pass");
    assert_stopped(&store, &backend, id).await;
    let after_stop = notifications.0.get();
    assert!(after_stop > 1, "Sessions are told their Agent is no longer Ready");

    control_plane
        .set_run_state("worker", agent::RunState::Running)
        .await
        .expect("start");
    reconciler.reconcile(id).await.expect("start pass");
    let record = store.get(id).await.expect("Agent");
    assert!(record.agent.status.is_ready());
    assert_eq!(record.agent.status.sandbox, sandbox, "the same Sandbox starts again");
    let running = backend.find(&sandbox_name(&record)).await.expect("Sandbox");
    assert_eq!(running.state, sandbox::SandboxState::Running);
    assert!(notifications.0.get() > after_stop, "Sessions wake");
    assert_eq!(backend.count(), 1);
}

#[tokio::test(flavor = "local")]
async fn a_new_agent_applied_stopped_materializes_only_once_started() {
    let fixture = fixture();
    let mut request = apply_request("worker");
    request.agent.spec.run_state = Some(agent::RunState::Stopped);
    fixture.control_plane.apply(request).await.expect("apply");
    reconcile(&fixture, "worker").await;
    let record = stored(&fixture, "worker").await;
    assert!(record.agent.status.is_stopped());
    assert_eq!(record.agent.status.sandbox, None);
    assert_eq!(fixture.backend.count(), 0);

    fixture
        .control_plane
        .set_run_state("worker", agent::RunState::Running)
        .await
        .expect("start");
    reconcile(&fixture, "worker").await;
    assert!(stored(&fixture, "worker").await.agent.status.is_ready());
    assert_eq!(fixture.backend.count(), 1);
}

#[tokio::test(flavor = "local")]
async fn a_restarted_daemon_keeps_a_stopped_agent_stopped_and_starts_a_running_one() {
    let fixture = fixture();
    for name in ["stopped", "running"] {
        fixture.control_plane.apply(apply_request(name)).await.expect("apply");
        reconcile(&fixture, name).await;
    }
    fixture
        .control_plane
        .set_run_state("stopped", agent::RunState::Stopped)
        .await
        .expect("stop");
    reconcile(&fixture, "stopped").await;
    // The host went down: every VM is gone, and a new daemon reconciles the stored Agents.
    let running = stored(&fixture, "running").await;
    fixture
        .backend
        .stop(
            running
                .agent
                .status
                .sandbox
                .as_ref()
                .and_then(agent::sandbox::Assignment::id)
                .expect("Sandbox"),
        )
        .await
        .expect("VM gone");
    let restarted = reconciler(
        fixture.store.clone(),
        Rc::new(MemoryProvider::new(fixture.backend.clone())),
    );
    for name in ["stopped", "running"] {
        restarted
            .reconcile(stored(&fixture, name).await.id)
            .await
            .expect("pass");
    }

    assert_stopped(&fixture.store, &fixture.backend, stored(&fixture, "stopped").await.id).await;
    let sandbox = fixture.backend.find(&sandbox_name(&running)).await.expect("Sandbox");
    assert_eq!(sandbox.state, sandbox::SandboxState::Running);
}

#[tokio::test(flavor = "local")]
async fn a_stopped_agent_can_be_deleted() {
    let fixture = fixture();
    fixture
        .control_plane
        .apply(apply_request("worker"))
        .await
        .expect("apply");
    reconcile(&fixture, "worker").await;
    fixture
        .control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    reconcile(&fixture, "worker").await;
    let record = stored(&fixture, "worker").await;

    fixture.control_plane.delete("worker").await.expect("delete");
    fixture.reconciler.reconcile(record.id).await.expect("release");

    assert!(matches!(fixture.store.get(record.id).await, Err(Error::NotFound)));
    // The test manifest retains its Sandbox on release.
    let retained = fixture
        .backend
        .find(&sandbox_name(&record))
        .await
        .expect("retained Sandbox");
    assert_eq!(retained.state, sandbox::SandboxState::Stopped);
    let error = fixture
        .control_plane
        .set_run_state("worker", agent::RunState::Running)
        .await
        .expect_err("a deleted Agent cannot start");
    assert!(matches!(error, Error::NotFound));
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn an_agent_with_a_stalled_guest_can_be_stopped_and_started() {
    let fixture = stalling(Changes::new()).await;
    fixture.reconciler.reconcile(fixture.id).await.expect("first pass");
    fixture.beat(1).await;
    fixture.platform.stall.set(true);
    let result = fixture.reconciler.reconcile(fixture.id).await;
    assert!(matches!(result, Err(Error::SandboxUnresponsive(_))), "{result:?}");

    let control_plane = ControlPlane::new(fixture.store.clone(), Rc::new(NotificationCounter::default()));
    control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    let setups = fixture.platform.setups.get();
    fixture
        .reconciler
        .reconcile(fixture.id)
        .await
        .expect("a stop needs no guest");
    assert_eq!(
        fixture.platform.setups.get(),
        setups,
        "the stop does not reach into the guest"
    );
    assert_stopped(&fixture.store, &fixture.backend, fixture.id).await;

    // The started guest beats from a new sequence, and the stall before the stop is forgotten.
    fixture.platform.stall.set(false);
    control_plane
        .set_run_state("worker", agent::RunState::Running)
        .await
        .expect("start");
    fixture.reconciler.reconcile(fixture.id).await.expect("start pass");
    let status = fixture.record().await.agent.status;
    assert!(status.is_ready(), "{status:?}");
    assert!(status.unresponsive().is_none());
}

#[tokio::test(flavor = "local")]
async fn commands_on_a_stopped_agent_fail_at_once_and_a_wait_ends_when_it_stops() {
    let ended = Rc::new(Cell::new(false));
    let fixture = waiting(
        [PlannedFailure::Outage {
            message: "runtime is down".into(),
            ended: ended.clone(),
        }],
        BACKGROUND_RETRIES,
    )
    .await;
    let control_plane = ControlPlane::new(fixture.store.clone(), Rc::new(fixture.wakeup.clone()));

    // A wait through an outage ends once the Agent is stopped.
    let waited = tokio::task::spawn_local({
        let execution = fixture.execution.clone();
        async move { execution.ensure("worker", WaitPolicy::UntilConverged).await }
    });
    tokio::time::sleep(BACKGROUND_RETRIES * 3).await;
    control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    let error = tokio::time::timeout(Duration::from_secs(1), waited)
        .await
        .expect("the wait ends with the stop")
        .expect("the wait does not panic")
        .expect_err("a stopped Agent never becomes Ready");
    assert!(matches!(&error, Error::Stopped(name) if name == "worker"), "{error:?}");
    assert_eq!(
        error.to_string(),
        "Agent \"worker\" is stopped; run `agentctl start agent/worker`"
    );

    // Later commands are refused before anything is woken or waited for.
    ended.set(true);
    for wait in [WaitPolicy::FirstPass, WaitPolicy::UntilConverged] {
        let error = tokio::time::timeout(Duration::from_millis(100), fixture.execution.ensure("worker", wait))
            .await
            .expect("refused without waiting")
            .expect_err("a stopped Agent runs nothing");
        assert!(matches!(error, Error::Stopped(_)), "{error:?}");
    }
    fixture.task.abort();
}

#[tokio::test(flavor = "local")]
async fn a_stop_recorded_while_an_execution_waits_refuses_it() {
    let changes = Changes::new();
    let store = Rc::new(memory::InMemoryAgentStore::with_changes(changes.clone()));
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("Agent").id;
    let started = Rc::new(Notify::new());
    let release = Rc::new(Notify::new());
    let provider: Rc<dyn Provider> = Rc::new(
        MemoryProvider::new(Rc::new(sandbox_memory::Provider::new())).with_blocking(Blocking {
            agent: id,
            calls: Rc::new(Cell::new(0)),
            started: started.clone(),
            release: release.clone(),
        }),
    );
    let (controller, wakeup) = Controller::new(
        store.clone(),
        Rc::new(reconciler(store.clone(), provider)),
        NO_BACKGROUND_PASSES,
        Rc::new(|_, _| {}),
    );
    let task = tokio::task::spawn_local(controller.run());
    started.notified().await;

    // The wait is admitted while the Agent runs, and its pass is the one after the stop.
    let execution = Rc::new(ExecutionService::new(
        store.clone(),
        Convergence::new(wakeup, store.clone(), changes),
    ));
    let waited = tokio::task::spawn_local(async move { execution.ensure("worker", WaitPolicy::FirstPass).await });
    tokio::task::yield_now().await;
    control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    release.notify_one();

    let result = tokio::time::timeout(Duration::from_secs(1), waited)
        .await
        .expect("the wait ends with the stop pass")
        .expect("the wait does not panic");
    assert!(matches!(result, Err(Error::Stopped(_))), "{result:?}");
    task.abort();
}

#[tokio::test(flavor = "local")]
async fn converging_the_run_state_waits_for_a_stop_and_for_a_start() {
    let fixture = waiting([], NO_BACKGROUND_PASSES).await;
    let convergence = Convergence::new(fixture.wakeup.clone(), fixture.store.clone(), Changes::new());
    let control_plane = ControlPlane::new(fixture.store.clone(), Rc::new(fixture.wakeup.clone()));
    let converged = tokio::time::timeout(
        Duration::from_secs(1),
        convergence.converge("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("a new Agent converges")
    .expect("Ready");
    assert!(converged.agent.status.is_ready());

    control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    let converged = tokio::time::timeout(
        Duration::from_secs(1),
        convergence.converge("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("a stop converges")
    .expect("stopped");
    assert!(converged.agent.spec.is_stopped() && converged.agent.status.is_stopped());
    assert_eq!(
        converged.agent.status.observed_generation,
        converged.agent.metadata.generation
    );

    control_plane
        .set_run_state("worker", agent::RunState::Running)
        .await
        .expect("start");
    let converged = tokio::time::timeout(
        Duration::from_secs(1),
        convergence.converge("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("a start converges")
    .expect("Ready");
    assert!(converged.agent.status.is_ready() && !converged.agent.spec.is_stopped());

    let error = convergence
        .converge("missing", WaitPolicy::UntilConverged)
        .await
        .expect_err("missing Agent");
    assert!(matches!(error, Error::NotFound), "{error:?}");
    fixture.task.abort();
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn converging_a_stopped_agent_is_not_ended_by_the_stall_it_was_stopped_for() {
    let changes = Changes::new();
    let fixture = stalling(changes.clone()).await;
    let (controller, wakeup) = Controller::new(
        fixture.store.clone(),
        fixture.reconciler.clone(),
        NO_BACKGROUND_PASSES,
        Rc::new(|_, _| {}),
    );
    let task = tokio::task::spawn_local(controller.run());
    let convergence = Convergence::new(wakeup, fixture.store.clone(), changes);
    convergence
        .converge("worker", WaitPolicy::UntilConverged)
        .await
        .expect("Ready");
    fixture.beat(1).await;
    fixture.platform.stall.set(true);
    let error = convergence
        .converge("worker", WaitPolicy::UntilConverged)
        .await
        .expect_err("a running Agent with a stalled guest cannot converge");
    assert!(matches!(error, Error::SandboxUnresponsive(_)), "{error:?}");

    ControlPlane::new(fixture.store.clone(), Rc::new(NotificationCounter::default()))
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    let stopped = convergence
        .converge("worker", WaitPolicy::UntilConverged)
        .await
        .expect("the stop converges");
    assert!(stopped.agent.status.is_stopped());
    task.abort();
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn stopping_an_agent_with_a_stalled_guest_tells_its_sessions() {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider: Rc<dyn Provider> = Rc::new(MemoryProvider::new(backend.clone()));
    let platform = Rc::new(StallingPlatform::default());
    let sandboxes =
        Rc::new(Service::new([provider], [platform.clone() as Rc<dyn PlatformAdapter>]).expect("Sandbox service"));
    let notifications = Rc::new(SessionNotificationCounter::default());
    let reconciler = Reconciler::new(store.clone(), sandboxes, ProvisioningState::default())
        .with_session_notifier(notifications.clone());
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("Agent").id;
    reconciler.reconcile(id).await.expect("first pass");
    let sandbox = store
        .get(id)
        .await
        .expect("Agent")
        .agent
        .status
        .sandbox
        .and_then(|assignment| assignment.id().cloned())
        .expect("materialized Sandbox");
    backend
        .set_guest_heartbeat(&sandbox, Some(GuestHeartbeat::new(1)))
        .expect("heartbeat should be set");
    platform.stall.set(true);
    let result = reconciler.reconcile(id).await;
    assert!(matches!(result, Err(Error::SandboxUnresponsive(_))), "{result:?}");
    // Not Ready already, so only the stop itself can tell the held Sessions.
    let before = notifications.0.get();

    control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    reconciler.reconcile(id).await.expect("stop pass");
    assert!(
        notifications.0.get() > before,
        "Sessions held by the stalled guest must learn the Agent stopped, so they go Idle"
    );
}

#[tokio::test(flavor = "local")]
async fn a_failed_stop_reads_as_stopping_and_converges_once_a_retry_stops_it() {
    let changes = Changes::new();
    let store = Rc::new(memory::InMemoryAgentStore::with_changes(changes.clone()));
    let backend = Rc::new(sandbox_memory::Provider::new());
    let provider = MemoryProvider::new(backend.clone());
    let failing_stops = provider.failing_stops.clone();
    let reconciler = Rc::new(reconciler(store.clone(), Rc::new(provider)));
    let control_plane = ControlPlane::new(store.clone(), Rc::new(NotificationCounter::default()));
    control_plane.apply(apply_request("worker")).await.expect("apply");
    let id = store.get_by_name("worker").await.expect("Agent").id;
    reconciler.reconcile(id).await.expect("Ready");

    failing_stops.set(1);
    control_plane
        .set_run_state("worker", agent::RunState::Stopped)
        .await
        .expect("stop");
    reconciler.reconcile(id).await.expect_err("the stop fails");
    let record = store.get(id).await.expect("Agent");
    let ready = condition(&record.agent.status, agent::Condition::READY);
    assert_eq!(ready.reason, agent::Condition::REASON_STOPPING);
    assert!(ready.message.contains("runtime unreachable"), "{ready:?}");
    assert_eq!(
        record.agent.status.failure,
        Some(FailureKind::Transient),
        "a failed stop is retried"
    );
    let sandbox = backend.find(&sandbox_name(&record)).await.expect("Sandbox");
    assert_eq!(sandbox.state, sandbox::SandboxState::Running, "nothing stopped yet");

    // The background controller retries, and a wait for the stop ends with it.
    let (controller, wakeup) = Controller::new(store.clone(), reconciler, BACKGROUND_RETRIES, Rc::new(|_, _| {}));
    let task = tokio::task::spawn_local(controller.run());
    failing_stops.set(1);
    let converged = tokio::time::timeout(
        Duration::from_secs(1),
        Convergence::new(wakeup, store.clone(), changes).converge("worker", WaitPolicy::UntilConverged),
    )
    .await
    .expect("a retried stop converges")
    .expect("stopped");
    assert!(converged.agent.status.is_stopped());
    assert_eq!(failing_stops.get(), 0, "the wait went through a failed retry");
    assert_stopped(&store, &backend, id).await;
    task.abort();
}
