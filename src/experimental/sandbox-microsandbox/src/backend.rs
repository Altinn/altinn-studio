use std::{
    cell::RefCell,
    collections::{BTreeMap, HashMap},
    path::{Path, PathBuf},
    rc::Rc,
    time::Instant,
};

use microsandbox::sandbox::{PullPolicy, SandboxStatus};
use sandbox::progress::SandboxProgress;
use sandbox::{
    Error, LocalFuture, PendingOperation, Platform, ResourceKind, RootFilesystemMode, RootFilesystemModeSet, Sandbox,
    SandboxFeature, SandboxId, SandboxName, SandboxPhase, SandboxResources, SandboxState,
    backend::{CreateSandboxRequest, SandboxBackend, SandboxBackendCapabilities},
    execution, file_transfer,
    mount::{Mount, MountKind, MountKindSet},
    network,
    provider::SandboxProvider,
    terminal, volume,
};

use crate::{
    client::{Client, RuntimeResources},
    error,
    execution::ExecutionControls,
    image::MicrosandboxImageBackend,
    network_endpoint, platform,
    state::{SandboxRecord, StateStore},
};

const RECORD_SANDBOX: &str = "Record Sandbox state";
const INSTALL_RUNTIME: &str = "Install Microsandbox runtime";
const RESOLVE_RUNTIME_INPUTS: &str = "Resolve Microsandbox runtime inputs";
const MATERIALIZE_DIRECT_ROOT_IMAGE: &str = "Materialize direct root image";
const CREATE_RUNTIME: &str = "Create Microsandbox VM";
const START_RUNTIME: &str = "Start Microsandbox VM";
const UPDATE_RUNTIME_RESOURCES: &str = "Update Microsandbox VM resources";
const UPDATE_RUNTIME_ENVIRONMENT: &str = "Update Microsandbox environment";

/// Microsandbox Provider pairing its Sandbox Backend with its Image Backend.
pub struct MicrosandboxProvider {
    pub(crate) client: Client,
    image_backend: MicrosandboxImageBackend,
    pub(crate) state: StateStore,
    pub(crate) executions: ExecutionControls,
}

/// Configures the host storage used by a [`MicrosandboxProvider`].
pub struct MicrosandboxProviderBuilder {
    home: PathBuf,
    cache_directory: Option<PathBuf>,
    registry_authentication: Option<sandbox::image::RegistryAuthentication>,
    runtime_bundle: Option<RuntimeBundle>,
}

#[derive(Clone)]
pub(crate) struct RuntimeBundle {
    pub(crate) path: PathBuf,
    pub(crate) sha256: String,
}

impl MicrosandboxProvider {
    /// Configures a Microsandbox Provider below its private data directory.
    #[must_use]
    pub fn builder(home: impl Into<PathBuf>) -> MicrosandboxProviderBuilder {
        MicrosandboxProviderBuilder {
            home: home.into(),
            cache_directory: None,
            registry_authentication: None,
            runtime_bundle: None,
        }
    }

    /// Opens an isolated Microsandbox Provider below its data directory.
    ///
    /// # Errors
    ///
    /// Returns an error when the home cannot be initialized or Microsandbox
    /// cannot open its local runtime.
    pub async fn open(home: impl AsRef<Path>) -> Result<Self, Error> {
        Self::builder(home.as_ref().to_path_buf()).open().await
    }

    async fn open_configured(
        home: PathBuf,
        cache_directory: Option<PathBuf>,
        registry_authentication: Option<sandbox::image::RegistryAuthentication>,
        runtime_bundle: Option<RuntimeBundle>,
    ) -> Result<Self, Error> {
        if home.as_os_str().is_empty() {
            return Err(Error::invalid("provider.home", "must not be empty"));
        }
        if cache_directory.as_ref().is_some_and(|path| path.as_os_str().is_empty()) {
            return Err(Error::invalid("provider.cacheDirectory", "must not be empty"));
        }
        if let Some(bundle) = &runtime_bundle {
            if !bundle.path.is_file() {
                return Err(Error::invalid(
                    "provider.runtimeBundle.path",
                    "must identify a regular file",
                ));
            }
            if bundle.sha256.len() != 64 || !bundle.sha256.bytes().all(|byte| byte.is_ascii_hexdigit()) {
                return Err(Error::invalid(
                    "provider.runtimeBundle.sha256",
                    "must be a 64-character hexadecimal SHA-256 digest",
                ));
            }
        }
        let state = StateStore::open(home.join("state")).await?;
        let client = Client::open(home.join("runtime"), cache_directory, runtime_bundle).await?;
        let image_backend = MicrosandboxImageBackend::new(client.clone(), registry_authentication);
        Ok(Self {
            client,
            image_backend,
            state,
            executions: Rc::new(RefCell::new(HashMap::new())),
        })
    }

    async fn create_record(&self, request: CreateSandboxRequest) -> Result<Sandbox, Error> {
        platform::require_supported(&request.image.platform)?;
        RuntimeResources::try_from(request.resources)?;
        if let Some(network) = &request.network
            && !is_network_control(&network.endpoint)
        {
            return Err(Error::UnsupportedNetworkEndpoint(network.endpoint.clone()));
        }
        match self.state.sandbox_by_name(&request.name).await {
            Ok(_) => return Err(Error::Backend(format!("Sandbox '{}' already exists", request.name))),
            Err(error) if error.is_not_found() => {}
            Err(error) => return Err(error),
        }
        self.cached_image_reference(&request.image.manifest_digest).await?;

        let record = SandboxRecord::new(request);
        self.state.save_sandbox(&record).await?;
        Ok(record.to_sandbox(SandboxState::Stopped))
    }

    async fn inspect_record(&self, record: &SandboxRecord) -> Result<Sandbox, Error> {
        let state = self
            .runtime_handle(&record.runtime_name)
            .await?
            .map_or(SandboxState::Stopped, |handle| map_state(handle.status_snapshot()));
        Ok(record.to_sandbox(state))
    }

    async fn update_sandbox_resources(
        &self,
        id: &SandboxId,
        resources: SandboxResources,
        progress: &SandboxProgress,
    ) -> Result<Sandbox, Error> {
        let mut record = self.state.sandbox_by_id(id).await?;
        if record.resources == resources {
            return self.inspect_record(&record).await;
        }
        if record.resources.root_filesystem().mode() != resources.root_filesystem().mode() {
            return Err(Error::Immutable("resources.rootFilesystem.mode"));
        }

        let desired = RuntimeResources::try_from(resources)?;

        if let Some(handle) = self.runtime_handle(&record.runtime_name).await? {
            let config = handle.config().map_err(error::microsandbox)?;
            let recorded_root_filesystem_mib = RuntimeResources::try_from(record.resources)?.root_filesystem_mib;
            let current_root_filesystem_mib = config
                .spec
                .image
                .oci_root_disk()
                .and_then(microsandbox::sandbox::RootDisk::size_mib)
                .unwrap_or(recorded_root_filesystem_mib);
            if desired.root_filesystem_mib < current_root_filesystem_mib {
                return Err(Error::UnsupportedResourceChange {
                    resource: "rootFilesystem",
                    current: format!("{current_root_filesystem_mib}Mi"),
                    requested: resources.root_filesystem().capacity().to_string(),
                    reason: "Microsandbox layered and direct root filesystems can only grow",
                });
            }

            let mut modification = handle.modify();
            let mut runtime_change = config.spec.resources.cpus != desired.cpus;
            if runtime_change {
                modification = modification
                    .cpus(desired.cpus)
                    .max_cpus(config.spec.resources.max_cpus.max(desired.cpus));
            }
            if config.spec.resources.memory_mib != desired.memory_mib {
                modification = modification
                    .memory_mib(desired.memory_mib)
                    .max_memory_mib(config.spec.resources.max_memory_mib.max(desired.memory_mib));
                runtime_change = true;
            }
            if current_root_filesystem_mib < desired.root_filesystem_mib {
                modification = modification.root_disk_size_mib(desired.root_filesystem_mib);
                runtime_change = true;
            }
            if runtime_change {
                let started = Instant::now();
                let step = progress.start_step(UPDATE_RUNTIME_RESOURCES).await;
                modification.restart().apply().await.map_err(error::microsandbox)?;
                step.complete(started.elapsed()).await;
            }
        }

        record.resources = resources;
        self.state.update_sandbox(&record).await?;
        self.inspect_record(&record).await
    }

    async fn update_sandbox_environment(
        &self,
        id: &SandboxId,
        environment: BTreeMap<String, String>,
        progress: &SandboxProgress,
    ) -> Result<Sandbox, Error> {
        let mut record = self.state.sandbox_by_id(id).await?;
        if record.environment == environment {
            return self.inspect_record(&record).await;
        }
        let sandbox = self.inspect_record(&record).await?;
        if sandbox.state != SandboxState::Stopped {
            return Err(Error::invalid("sandbox.state", "must be stopped"));
        }

        if let Some(handle) = self.runtime_handle(&record.runtime_name).await? {
            let mut modification = handle.modify().next_start();
            for name in record.environment.keys() {
                if !environment.contains_key(name) {
                    modification = modification.remove_env(name);
                }
            }
            for (name, value) in &environment {
                modification = modification.env(name, value);
            }
            let started = Instant::now();
            let step = progress.start_step(UPDATE_RUNTIME_ENVIRONMENT).await;
            modification.apply().await.map_err(error::microsandbox)?;
            step.complete(started.elapsed()).await;
        }

        record.environment = environment;
        self.state.update_sandbox(&record).await?;
        self.inspect_record(&record).await
    }

    async fn start_sandbox(&self, id: &SandboxId, progress: &SandboxProgress) -> Result<(), Error> {
        let started = Instant::now();
        let step = progress.start_step(INSTALL_RUNTIME).await;
        self.client.ensure_installed().await?;
        step.complete(started.elapsed()).await;
        let record = self.state.sandbox_by_id(id).await?;
        self.client.local().set_network_controlled(
            &record.runtime_name,
            record
                .network
                .as_ref()
                .is_some_and(|network| is_network_control(&network.endpoint)),
        );
        let _running = match self.runtime_handle(&record.runtime_name).await? {
            Some(handle) if map_state(handle.status_snapshot()) == SandboxState::Running => return Ok(()),
            Some(handle) => {
                let started = Instant::now();
                let step = progress.start_step(START_RUNTIME).await;
                let running = handle.start_detached().await.map_err(error::microsandbox)?;
                step.complete(started.elapsed()).await;
                running
            }
            None => Box::pin(self.create_runtime(&record, progress)).await?,
        };
        Ok(())
    }

    async fn stop_sandbox(&self, id: &SandboxId) -> Result<(), Error> {
        let record = self.state.sandbox_by_id(id).await?;
        if let Some(handle) = self.runtime_handle(&record.runtime_name).await?
            && map_state(handle.status_snapshot()) == SandboxState::Running
        {
            handle.stop().await.map_err(error::microsandbox)?;
        }
        self.executions
            .borrow_mut()
            .retain(|(sandbox_id, _), _| sandbox_id != id);
        Ok(())
    }

    async fn delete_sandbox(&self, id: &SandboxId) -> Result<(), Error> {
        let record = self.state.sandbox_by_id(id).await?;
        self.stop_sandbox(id).await?;
        if let Some(handle) = self.runtime_handle(&record.runtime_name).await? {
            handle.remove().await.map_err(error::microsandbox)?;
        }
        self.client.local().set_network_controlled(&record.runtime_name, false);
        self.state.remove_sandbox(&record).await
    }

    async fn runtime_handle(&self, name: &str) -> Result<Option<microsandbox::sandbox::SandboxHandle>, Error> {
        match self.client.scope(microsandbox::Sandbox::get(name)).await {
            Ok(handle) => Ok(Some(handle)),
            Err(microsandbox::MicrosandboxError::SandboxNotFound(_)) => Ok(None),
            Err(error) => Err(error::microsandbox(error)),
        }
    }

    pub(crate) async fn connect_running(&self, record: &SandboxRecord) -> Result<microsandbox::Sandbox, Error> {
        let handle = self
            .runtime_handle(&record.runtime_name)
            .await?
            .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, &record.id))?;
        handle.connect().await.map_err(error::microsandbox)
    }

    async fn create_runtime(
        &self,
        record: &SandboxRecord,
        progress: &SandboxProgress,
    ) -> Result<microsandbox::Sandbox, Error> {
        let started = Instant::now();
        let step = progress.start_step(RESOLVE_RUNTIME_INPUTS).await;
        let mounts = self.resolve_mounts(&record.mounts).await?;
        let image = self.cached_image_reference(&record.image.manifest_digest).await?;
        step.complete(started.elapsed()).await;
        if record.resources.root_filesystem().mode() == RootFilesystemMode::Direct {
            let started = Instant::now();
            let step = progress.start_step(MATERIALIZE_DIRECT_ROOT_IMAGE).await;
            self.materialize_direct_root_image(&image).await?;
            step.complete(started.elapsed()).await;
        }
        let mut builder =
            Client::sandbox_builder(&record.runtime_name, image, record.resources)?.pull_policy(PullPolicy::Never);
        builder = builder.envs(record.environment.clone());
        if record
            .network
            .as_ref()
            .is_some_and(|network| is_network_control(&network.endpoint))
        {
            builder =
                builder.network(|network| network.policy(microsandbox::NetworkPolicy::allow_all()).tls(|tls| tls));
        }
        if record.init_system == sandbox::init::InitSystem::Image {
            builder = builder.init("auto");
        }
        for mount in mounts {
            builder = mount.apply(builder);
        }
        let started = Instant::now();
        let step = progress.start_step(CREATE_RUNTIME).await;
        let runtime = Box::pin(self.client.scope(builder.create_detached()))
            .await
            .map_err(error::microsandbox)?;
        step.complete(started.elapsed()).await;
        Ok(runtime)
    }

    async fn cached_image_reference(&self, manifest_digest: &str) -> Result<String, Error> {
        let images = microsandbox::Image::list_local(self.client.local())
            .await
            .map_err(error::microsandbox)?;
        images
            .iter()
            .find(|image| image.manifest_digest() == Some(manifest_digest))
            .map(|image| image.reference().to_string())
            .ok_or_else(|| {
                Error::Backend(format!(
                    "image manifest digest {manifest_digest} is not present in this Microsandbox cache"
                ))
            })
    }

    // Image resolution prepares Microsandbox's layered cache, while a direct root
    // filesystem requires a cached flat ext4 artifact. PullPolicy::Never will only
    // consume that artifact during sandbox creation, so materialize it here first;
    // Microsandbox then clones it into the sandbox-owned root disk.
    async fn materialize_direct_root_image(&self, reference: &str) -> Result<(), Error> {
        let reference = reference
            .parse::<microsandbox_image::Reference>()
            .map_err(error::backend)?;
        let cache = microsandbox_image::GlobalCache::new(&self.client.local().cache_dir()).map_err(error::backend)?;
        let metadata = cache
            .read_image_metadata(&reference)
            .map_err(error::backend)?
            .ok_or_else(|| Error::Backend(format!("Microsandbox image metadata is missing for {reference}")))?;
        let manifest_digest = metadata.manifest_digest.parse().map_err(error::backend)?;
        let layer_diff_ids = metadata
            .layers
            .iter()
            .map(|layer| layer.diff_id.parse().map_err(error::backend))
            .collect::<Result<Vec<_>, _>>()?;
        let registry = microsandbox_image::Registry::new(microsandbox_image::Platform::host_linux(), cache)
            .map_err(error::backend)?;
        registry
            .materialize_flat_rootfs(&manifest_digest, &layer_diff_ids, false)
            .await
            .map_err(error::backend)?;
        Ok(())
    }

    async fn resolve_mounts(&self, mounts: &[Mount]) -> Result<Vec<RuntimeMount>, Error> {
        let mut resolved = Vec::with_capacity(mounts.len());
        for mount in mounts {
            resolved.push(match mount {
                Mount::Volume { id, target, read_only } => {
                    let volume = self.state.volume_by_id(id).await?;
                    self.ensure_volume_runtime(&volume).await?;
                    RuntimeMount::Volume {
                        name: volume.runtime_name,
                        target: target.as_str().to_string(),
                        read_only: *read_only,
                    }
                }
                Mount::Bind {
                    source,
                    target,
                    read_only,
                } => RuntimeMount::Bind {
                    source: source.clone(),
                    target: target.as_str().to_string(),
                    read_only: *read_only,
                },
                Mount::Tmpfs { target, capacity } => RuntimeMount::Tmpfs {
                    target: target.as_str().to_string(),
                    capacity_mib: crate::client::exact_mib("mount.tmpfs.capacity", *capacity)?,
                },
            });
        }
        Ok(resolved)
    }
}

impl MicrosandboxProviderBuilder {
    /// Places reusable Microsandbox cache artifacts in this directory.
    ///
    /// Separate Provider instances may share this directory. Sandbox state,
    /// writable roots and other mutable runtime data remain below the private
    /// Provider home.
    #[must_use]
    pub fn cache_directory(mut self, path: impl Into<PathBuf>) -> Self {
        self.cache_directory = Some(path.into());
        self
    }

    /// Supplies transient credentials used to resolve OCI registry references.
    #[must_use]
    pub fn registry_authentication(mut self, authentication: sandbox::image::RegistryAuthentication) -> Self {
        self.registry_authentication = Some(authentication);
        self
    }

    /// Installs the Microsandbox host runtime from a verified local release bundle.
    ///
    /// The path must identify a platform-compatible Microsandbox `tar.gz`
    /// runtime bundle. The expected digest is checked before extraction.
    #[must_use]
    pub fn runtime_bundle(mut self, path: impl Into<PathBuf>, sha256: impl Into<String>) -> Self {
        self.runtime_bundle = Some(RuntimeBundle {
            path: path.into(),
            sha256: sha256.into(),
        });
        self
    }

    /// Opens the configured Microsandbox Provider.
    ///
    /// # Errors
    ///
    /// Returns an error when a configured path is empty or cannot be
    /// initialized by the Microsandbox runtime.
    pub async fn open(self) -> Result<MicrosandboxProvider, Error> {
        MicrosandboxProvider::open_configured(
            self.home,
            self.cache_directory,
            self.registry_authentication,
            self.runtime_bundle,
        )
        .await
    }
}

impl SandboxProvider for MicrosandboxProvider {
    fn backend(&self) -> &dyn SandboxBackend {
        self
    }

    fn image_backend(&self) -> &dyn sandbox::image::ImageBackend {
        &self.image_backend
    }
}

impl SandboxBackend for MicrosandboxProvider {
    fn capabilities<'a>(
        &'a self,
        platform: &'a Platform,
    ) -> LocalFuture<'a, Result<SandboxBackendCapabilities, Error>> {
        Box::pin(async move {
            platform::require_supported(platform)?;
            Ok(SandboxBackendCapabilities::new(
                [
                    SandboxFeature::Execution,
                    SandboxFeature::TerminalExecution,
                    SandboxFeature::TerminalAttach,
                    SandboxFeature::FileTransfer,
                    SandboxFeature::PersistentVolumes,
                    SandboxFeature::NestedContainers,
                    SandboxFeature::ImageInit,
                ]
                .into(),
                MountKindSet::from([MountKind::Volume, MountKind::Bind, MountKind::Tmpfs]),
                RootFilesystemModeSet::from([RootFilesystemMode::Layered, RootFilesystemMode::Direct]),
                network::NetworkEndpointCapabilities::new().with_control_protocol(
                    network::NetworkControlProtocolId::new(microsandbox_network::control::NETWORK_CONTROL_PROTOCOL),
                ),
            ))
        })
    }

    fn create(&self, request: CreateSandboxRequest) -> PendingOperation<'_, Sandbox> {
        PendingOperation::run(SandboxPhase::SandboxCreate, move |progress| {
            Box::pin(async move {
                let started = Instant::now();
                let step = progress.start_step(RECORD_SANDBOX).await;
                let sandbox = self.create_record(request).await?;
                step.complete(started.elapsed()).await;
                Ok(sandbox)
            })
        })
    }

    fn update_resources<'a>(&'a self, id: &'a SandboxId, resources: SandboxResources) -> PendingOperation<'a, Sandbox> {
        PendingOperation::run(SandboxPhase::SandboxUpdate, move |progress| {
            Box::pin(async move { self.update_sandbox_resources(id, resources, &progress).await })
        })
    }

    fn update_environment<'a>(
        &'a self,
        id: &'a SandboxId,
        environment: BTreeMap<String, String>,
    ) -> PendingOperation<'a, Sandbox> {
        PendingOperation::run(SandboxPhase::SandboxUpdate, move |progress| {
            Box::pin(async move { self.update_sandbox_environment(id, environment, &progress).await })
        })
    }

    fn find<'a>(&'a self, name: &'a SandboxName) -> LocalFuture<'a, Result<Sandbox, Error>> {
        Box::pin(async move {
            let record = self.state.sandbox_by_name(name).await?;
            self.inspect_record(&record).await
        })
    }

    fn inspect<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<Sandbox, Error>> {
        Box::pin(async move {
            let record = self.state.sandbox_by_id(id).await?;
            self.inspect_record(&record).await
        })
    }

    fn start<'a>(&'a self, id: &'a SandboxId) -> PendingOperation<'a, ()> {
        PendingOperation::run(SandboxPhase::SandboxStart, move |progress| {
            Box::pin(async move { self.start_sandbox(id, &progress).await })
        })
    }

    fn stop<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(self.stop_sandbox(id))
    }

    fn delete<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(self.delete_sandbox(id))
    }

    fn open_network_endpoint<'a>(
        &'a self,
        id: &'a SandboxId,
    ) -> LocalFuture<'a, Result<network::NetworkEndpoint, Error>> {
        Box::pin(async move {
            let record = self.state.sandbox_by_id(id).await?;
            match record.network {
                Some(attachment) if is_network_control(&attachment.endpoint) => {
                    self.client.local().set_network_controlled(&record.runtime_name, true);
                    let controller = self.client.bind_network_controller(&record.runtime_name).await?;
                    network_endpoint::open(controller).map(network::NetworkEndpoint::Control)
                }
                Some(attachment) => Err(Error::UnsupportedNetworkEndpoint(attachment.endpoint)),
                None => Err(Error::invalid("network", "Sandbox has no attachment")),
            }
        })
    }

    fn start_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: execution::StartExecutionRequest,
    ) -> LocalFuture<'a, Result<execution::StartedExecution, Error>> {
        Box::pin(self.start_execution_stream(sandbox_id, request))
    }

    fn start_terminal_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: terminal::StartTerminalExecutionRequest,
    ) -> LocalFuture<'a, Result<terminal::StartedTerminalExecution, Error>> {
        Box::pin(self.start_terminal_execution_stream(sandbox_id, request))
    }

    fn attach_terminal<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: terminal::AttachTerminalRequest,
    ) -> LocalFuture<'a, Result<terminal::TerminalAttachOutcome, Error>> {
        Box::pin(self.attach_terminal_to_runtime(sandbox_id, request))
    }
    fn terminate_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        execution_id: &'a execution::ExecutionId,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(self.control_execution(sandbox_id, execution_id, false))
    }

    fn kill_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        execution_id: &'a execution::ExecutionId,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(self.control_execution(sandbox_id, execution_id, true))
    }

    fn read_file<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        path: &'a sandbox::SandboxPath,
    ) -> LocalFuture<'a, Result<file_transfer::ByteReader, Error>> {
        Box::pin(self.read_file_stream(sandbox_id, path))
    }

    fn write_file<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        path: &'a sandbox::SandboxPath,
        contents: file_transfer::ByteReader,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(self.write_file_stream(sandbox_id, path, contents))
    }

    fn ensure_volume(&self, request: volume::EnsureVolumeRequest) -> LocalFuture<'_, Result<volume::Volume, Error>> {
        Box::pin(self.ensure_volume_record(request))
    }

    fn find_volume<'a>(&'a self, name: &'a volume::VolumeName) -> LocalFuture<'a, Result<volume::Volume, Error>> {
        Box::pin(async move { Ok(self.state.volume_by_name(name).await?.to_volume()) })
    }

    fn delete_volume<'a>(&'a self, id: &'a volume::VolumeId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(self.delete_volume_record(id))
    }
}

impl SandboxRecord {
    fn to_sandbox(&self, state: SandboxState) -> Sandbox {
        Sandbox {
            image: self.image.clone(),
            init_system: self.init_system,
            id: self.id.clone(),
            name: self.name.clone(),
            resources: self.resources,
            state,
            mounts: self.mounts.clone(),
            environment: self.environment.clone(),
            network: self.network.clone(),
        }
    }
}

enum RuntimeMount {
    Volume {
        name: String,
        target: String,
        read_only: bool,
    },
    Bind {
        source: std::path::PathBuf,
        target: String,
        read_only: bool,
    },
    Tmpfs {
        target: String,
        capacity_mib: u32,
    },
}

impl RuntimeMount {
    fn apply(self, builder: microsandbox::sandbox::SandboxBuilder) -> microsandbox::sandbox::SandboxBuilder {
        match self {
            Self::Volume {
                name,
                target,
                read_only,
            } => builder.volume(target, |mount| {
                let mount = mount.named(name);
                if read_only { mount.readonly() } else { mount }
            }),
            Self::Bind {
                source,
                target,
                read_only,
            } => builder.volume(target, |mount| {
                let mount = mount.bind(source);
                if read_only { mount.readonly() } else { mount }
            }),
            Self::Tmpfs { target, capacity_mib } => builder.volume(target, |mount| mount.tmpfs().size(capacity_mib)),
        }
    }
}

const fn map_state(status: SandboxStatus) -> SandboxState {
    match status {
        SandboxStatus::Starting | SandboxStatus::Running | SandboxStatus::Draining | SandboxStatus::Paused => {
            SandboxState::Running
        }
        SandboxStatus::Created | SandboxStatus::Stopped | SandboxStatus::Crashed => SandboxState::Stopped,
    }
}

fn is_network_control(selection: &network::NetworkEndpointSelection) -> bool {
    matches!(
        selection,
        network::NetworkEndpointSelection::Control(protocol)
            if protocol.as_str() == microsandbox_network::control::NETWORK_CONTROL_PROTOCOL
    )
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use microsandbox::sandbox::VolumeMount;

    use super::RuntimeMount;

    #[tokio::test(flavor = "local")]
    async fn tmpfs_capacity_maps_to_microsandbox() {
        let config = RuntimeMount::Tmpfs {
            target: "/tmp".to_string(),
            capacity_mib: 4096,
        }
        .apply(microsandbox::sandbox::SandboxBuilder::new("sandbox").image("alpine"))
        .build()
        .await
        .expect("Sandbox configuration should build");

        assert!(matches!(
            config.spec.mounts.as_slice(),
            [VolumeMount::Tmpfs {
                guest,
                size_mib: Some(4096),
                ..
            }] if guest == "/tmp"
        ));
    }
}
