use std::{
    cell::RefCell,
    collections::{BTreeMap, HashMap},
    path::{Path, PathBuf},
    rc::Rc,
};

use microsandbox::sandbox::{PullPolicy, SandboxStatus};
use sandbox::progress::SandboxProgress;
use sandbox::{
    Error, LocalFuture, PendingOperation, Platform, ResourceKind, RootFilesystemMode, RootFilesystemModeSet, Sandbox,
    SandboxFeature, SandboxId, SandboxName, SandboxResources, SandboxState,
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
    heartbeat,
    image::MicrosandboxImageBackend,
    image_cache::ImageCache,
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

/// How long a stopping runtime may take to shut its guest down before it is
/// killed. Microsandbox's own `stop` waits indefinitely, so a wedged guest
/// would otherwise block stopping and deleting the Sandbox.
const STOP_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

/// Microsandbox Provider pairing its Sandbox Backend with its Image Backend.
pub struct MicrosandboxProvider {
    pub(crate) client: Client,
    images: ImageCache,
    image_backend: MicrosandboxImageBackend,
    pub(crate) state: StateStore,
    pub(crate) executions: ExecutionControls,
}

/// Configures the host storage used by a [`MicrosandboxProvider`].
pub struct MicrosandboxProviderBuilder {
    home: PathBuf,
    cache_directory: Option<PathBuf>,
    unused_image_retention: Option<std::time::Duration>,
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
            unused_image_retention: None,
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
        unused_image_retention: Option<std::time::Duration>,
        registry_authentication: Option<sandbox::image::RegistryAuthentication>,
        runtime_bundle: Option<RuntimeBundle>,
    ) -> Result<Self, Error> {
        if home.as_os_str().is_empty() {
            return Err(Error::invalid("provider.home", "must not be empty"));
        }
        if cache_directory.as_ref().is_some_and(|path| path.as_os_str().is_empty()) {
            return Err(Error::invalid("provider.cacheDirectory", "must not be empty"));
        }
        if let Some(retention) = unused_image_retention {
            if cache_directory.is_some() {
                return Err(Error::invalid(
                    "provider.unusedImageRetention",
                    "cannot be combined with a cache directory, which other Providers may share",
                ));
            }
            if retention < crate::image_cache::MINIMUM_RETENTION {
                return Err(Error::invalid(
                    "provider.unusedImageRetention",
                    "must be at least an hour, to cover the time between resolving an image and creating its Sandbox",
                ));
            }
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
        let images = ImageCache::new(client.clone(), state.clone(), unused_image_retention);
        let image_backend = MicrosandboxImageBackend::new(client.clone(), images.clone(), registry_authentication);
        let provider = Self {
            client,
            images,
            image_backend,
            state,
            executions: Rc::new(RefCell::new(HashMap::new())),
        };
        if unused_image_retention.is_some() {
            if let Err(error) = Box::pin(provider.migrate_images()).await {
                tracing::warn!(%error, "failed to migrate the Microsandbox image catalog; retrying when the Provider next opens");
            }
            Box::pin(provider.images.remove_unused()).await;
        }
        Ok(provider)
    }

    /// Migrates a catalog recorded before Sandboxes held their images, while the Provider opens
    /// and before anything else runs. Every Sandbox holds its image; one with a runtime whose
    /// image the old catalog lost fetches it again by digest. Image versions nothing holds are
    /// then removed, but only once every Sandbox's image is protected from that removal, which
    /// a Sandbox that never started, or whose first start was interrupted, is not. Until then
    /// each open tries again.
    async fn migrate_images(&self) -> Result<(), Error> {
        if !self.images.migration_pending().await {
            return Ok(());
        }
        let mut every_image_pinned = true;
        for record in self.state.sandbox_records().await? {
            let held = if self.runtime_handle(&record.runtime_name).await?.is_some() {
                match self.hold_image(&record).await {
                    Ok(_) => true,
                    Err(error) => {
                        tracing::warn!(sandbox = %record.id, %error, "failed to hold a Sandbox's image");
                        false
                    }
                }
            } else {
                self.images.hold(&record).await?.is_some()
            };
            every_image_pinned &= held && self.images.is_pinned(&record).await?;
        }
        if !every_image_pinned {
            tracing::info!("keeping image versions from before this release until every Sandbox's image is protected");
            return Ok(());
        }
        self.images.finish_migration().await
    }

    /// Makes a Sandbox hold its image and returns the name to create its runtime from. An image
    /// no longer in the cache is fetched again from its registry by digest.
    pub(crate) async fn hold_image(&self, record: &SandboxRecord) -> Result<String, Error> {
        use sandbox::image::ImageBackend as _;

        if let Some(entry) = self.images.hold(record).await? {
            return Ok(entry);
        }
        let manifest_digest = &record.image.manifest_digest;
        if let sandbox::image::ImageSource::Reference { reference } = &record.image.source {
            let reference = reference
                .parse::<microsandbox_image::Reference>()
                .map_err(error::backend)?;
            let pinned = microsandbox_image::Reference::with_digest(
                reference.registry().to_string(),
                reference.repository().to_string(),
                manifest_digest.clone(),
            );
            self.image_backend
                .resolve(&sandbox::image::ResolveRequest {
                    source: sandbox::image::ImageSource::Reference {
                        reference: pinned.to_string(),
                    },
                    platform: record.image.platform.clone(),
                    root_filesystem_mode: record.resources.root_filesystem().mode(),
                })
                .await?;
            if let Some(entry) = self.images.hold(record).await? {
                return Ok(entry);
            }
        }
        Err(Error::Backend(format!(
            "image manifest digest {manifest_digest} is not present in this Microsandbox cache"
        )))
    }

    /// Removes unused images now, as the Provider also does when it opens, after each image is
    /// resolved or imported and after each Sandbox is deleted. Only a Provider opened with
    /// [`MicrosandboxProviderBuilder::remove_unused_images_after`] removes any.
    pub async fn remove_unused_images(&self) {
        self.images.remove_unused().await;
    }

    #[cfg(test)]
    pub(crate) const fn images(&self) -> &ImageCache {
        &self.images
    }

    async fn create_record(&self, request: CreateSandboxRequest) -> Result<Sandbox, Error> {
        platform::require_supported(&request.image.platform)?;
        RuntimeResources::try_from(request.resources)?;
        RuntimeNetwork::for_attachment(request.network.as_ref())?;
        match self.state.sandbox_by_name(&request.name).await {
            Ok(_) => return Err(Error::Backend(format!("Sandbox '{}' already exists", request.name))),
            Err(error) if error.is_not_found() => {}
            Err(error) => return Err(error),
        }
        let record = SandboxRecord::new(request);
        self.state.save_sandbox(&record).await?;
        // The record comes first, so an image entry without a record is always a deleted
        // Sandbox's, which removal passes clean up.
        if let Err(error) = self.hold_image(&record).await {
            if let Err(cleanup) = self.state.remove_sandbox(&record).await {
                tracing::warn!(sandbox = %record.id, error = %cleanup, "failed to remove the record of a Sandbox without its image");
            }
            return Err(error);
        }
        Ok(record.to_sandbox(SandboxState::Stopped))
    }

    async fn inspect_record(&self, record: &SandboxRecord) -> Result<Sandbox, Error> {
        let Some(handle) = self.runtime_handle(&record.runtime_name).await? else {
            return Ok(record.to_sandbox(SandboxState::Stopped));
        };
        let status = handle.status_snapshot();
        // A starting, draining or paused guest is not expected to beat, so its
        // stale heartbeat is no evidence either way.
        let guest_heartbeat = if status == SandboxStatus::Running {
            heartbeat::read(&self.runtime_directory(&record.runtime_name)).await
        } else {
            None
        };
        Ok(Sandbox {
            guest_heartbeat,
            ..record.to_sandbox(map_state(status))
        })
    }

    /// Host-side directory the runtime shares with its guest.
    fn runtime_directory(&self, runtime_name: &str) -> PathBuf {
        self.client.local().sandboxes_dir().join(runtime_name).join("runtime")
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
                    .memory(desired.memory_mib)
                    .max_memory(config.spec.resources.max_memory_mib.max(desired.memory_mib));
                runtime_change = true;
            }
            if current_root_filesystem_mib < desired.root_filesystem_mib {
                modification = modification.root_disk_size(desired.root_filesystem_mib);
                runtime_change = true;
            }
            if runtime_change {
                self.prepare_runtime_network(&record)?;
                let step = progress.start_step(UPDATE_RUNTIME_RESOURCES).await;
                // A running VM is restarted here rather than by Microsandbox,
                // whose restart stops without a deadline and relaunches with
                // whatever runtime the home holds. The change is persisted for
                // the next start first, so a rejected change leaves the VM
                // running, and the root disk grows before that start boots.
                // The runtime is installed first, since a resource change can
                // come before the first start after an upgrade.
                let running = map_state(handle.status_snapshot()) == SandboxState::Running;
                if running {
                    self.client.ensure_installed().await?;
                    modification = modification.next_start();
                }
                modification.apply().await.map_err(error::microsandbox)?;
                if running {
                    stop_runtime(&handle, &record.runtime_name).await?;
                    self.runtime_handle(&record.runtime_name)
                        .await?
                        .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, &record.id))?
                        .start_detached()
                        .await
                        .map_err(error::microsandbox)?;
                }
                step.complete().await;
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
            let step = progress.start_step(UPDATE_RUNTIME_ENVIRONMENT).await;
            modification.apply().await.map_err(error::microsandbox)?;
            step.complete().await;
        }

        record.environment = environment;
        self.state.update_sandbox(&record).await?;
        self.inspect_record(&record).await
    }

    async fn start_sandbox(&self, id: &SandboxId, progress: &SandboxProgress) -> Result<(), Error> {
        let record = self.state.sandbox_by_id(id).await?;
        self.prepare_runtime_network(&record)?;
        let step = progress.start_step(INSTALL_RUNTIME).await;
        self.client.ensure_installed().await?;
        step.complete().await;
        let _running = match self.runtime_handle(&record.runtime_name).await? {
            Some(handle) if map_state(handle.status_snapshot()) == SandboxState::Running => return Ok(()),
            Some(handle) => {
                let step = progress.start_step(START_RUNTIME).await;
                let running = handle.start_detached().await.map_err(error::microsandbox)?;
                step.complete().await;
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
            stop_runtime(&handle, &record.runtime_name).await?;
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
        // Releasing first keeps a removal pass from taking the image as left behind before its
        // cache entry is refreshed.
        self.images.release(&record).await;
        self.state.remove_sandbox(&record).await?;
        self.images.remove_unused().await;
        Ok(())
    }

    /// Tells Microsandbox whether this runtime must start under host network
    /// control. Call it before every operation that can start the runtime: the
    /// setting lives only in this process, while a runtime can outlive the
    /// process that started it.
    fn prepare_runtime_network(&self, record: &SandboxRecord) -> Result<RuntimeNetwork, Error> {
        let network = RuntimeNetwork::for_attachment(record.network.as_ref())?;
        self.client
            .local()
            .set_network_controlled(&record.runtime_name, network == RuntimeNetwork::Controlled);
        Ok(network)
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
        // Applying the attachment here, not trusting a caller's decision, keeps
        // a runtime from being created with the controlled network policy but
        // without host network control.
        let network = self.prepare_runtime_network(record)?;
        let step = progress.start_step(RESOLVE_RUNTIME_INPUTS).await;
        let mounts = self.resolve_mounts(&record.mounts).await?;
        // Holding the image again also covers a record saved before it held its image, and an
        // image the cache no longer has.
        let image = self.hold_image(record).await?;
        step.complete().await;
        if record.resources.root_filesystem().mode() == RootFilesystemMode::Direct {
            let step = progress.start_step(MATERIALIZE_DIRECT_ROOT_IMAGE).await;
            self.materialize_direct_root_image(&image).await?;
            step.complete().await;
        }
        let mut builder = Client::sandbox_builder(&record.runtime_name, image, record.resources)?
            .pull_policy(PullPolicy::Never)
            .hostname(record.hostname().as_str());
        builder = builder.envs(record.environment.clone());
        if network == RuntimeNetwork::Controlled {
            builder =
                builder.network(|network| network.policy(microsandbox::NetworkPolicy::allow_all()).tls(|tls| tls));
        }
        if record.init_system == sandbox::init::InitSystem::Image {
            builder = builder.init("auto");
        }
        for mount in mounts {
            builder = mount.apply(builder);
        }
        let step = progress.start_step(CREATE_RUNTIME).await;
        let runtime = Box::pin(self.client.scope(builder.create_detached()))
            .await
            .map_err(error::microsandbox)?;
        step.complete().await;
        Ok(runtime)
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

    /// Removes cached images no Sandbox uses once `retention`, at least an hour, has passed
    /// since each was last resolved, imported or released by a deleted Sandbox. A Sandbox keeps
    /// its image until it is deleted, running or not.
    ///
    /// Enable this only for the Provider that owns its home. It cannot be combined with
    /// [`Self::cache_directory`], since another Provider may use a shared cache.
    #[must_use]
    pub const fn remove_unused_images_after(mut self, retention: std::time::Duration) -> Self {
        self.unused_image_retention = Some(retention);
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
            self.unused_image_retention,
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
        PendingOperation::run(move |progress| {
            Box::pin(async move {
                let step = progress.start_step(RECORD_SANDBOX).await;
                let sandbox = self.create_record(request).await?;
                step.complete().await;
                Ok(sandbox)
            })
        })
    }

    fn update_resources<'a>(&'a self, id: &'a SandboxId, resources: SandboxResources) -> PendingOperation<'a, Sandbox> {
        PendingOperation::run(move |progress| {
            Box::pin(async move { self.update_sandbox_resources(id, resources, &progress).await })
        })
    }

    fn update_environment<'a>(
        &'a self,
        id: &'a SandboxId,
        environment: BTreeMap<String, String>,
    ) -> PendingOperation<'a, Sandbox> {
        PendingOperation::run(move |progress| {
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
        PendingOperation::run(move |progress| Box::pin(async move { self.start_sandbox(id, &progress).await }))
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
            match self.prepare_runtime_network(&record)? {
                RuntimeNetwork::Controlled => {
                    let controller = self.client.bind_network_controller(&record.runtime_name).await?;
                    network_endpoint::open(controller).map(network::NetworkEndpoint::Control)
                }
                RuntimeNetwork::Unattached => Err(Error::invalid("network", "Sandbox has no attachment")),
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
            hostname: self.hostname(),
            resources: self.resources,
            state,
            guest_heartbeat: None,
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

/// Stops a running VM gracefully, killing it after [`STOP_TIMEOUT`].
async fn stop_runtime(handle: &microsandbox::sandbox::SandboxHandle, name: &str) -> Result<(), Error> {
    match handle.stop_with_timeout(STOP_TIMEOUT).await {
        Ok(()) => Ok(()),
        Err(microsandbox::MicrosandboxError::StopTimeout { .. }) => {
            tracing::warn!(
                sandbox = %name,
                timeout = ?STOP_TIMEOUT,
                "Microsandbox VM did not stop in time; killing it"
            );
            handle.kill().await.map_err(error::microsandbox)
        }
        Err(error) => Err(error::microsandbox(error)),
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

/// How a runtime's network is wired, decided once from the Sandbox's immutable
/// Network attachment.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RuntimeNetwork {
    /// No Network Backend is attached; the runtime keeps Microsandbox's own network.
    Unattached,
    /// The attached Network Backend authorizes traffic through the control
    /// protocol this build implements.
    Controlled,
}

impl RuntimeNetwork {
    /// Refuses every attachment this build cannot enforce. Microsandbox only
    /// offers its own control protocol, so any other recorded endpoint, such as
    /// a control protocol from a different version, would otherwise start
    /// without host network control.
    fn for_attachment(attachment: Option<&network::NetworkAttachment>) -> Result<Self, Error> {
        match attachment.map(|attachment| &attachment.endpoint) {
            None => Ok(Self::Unattached),
            Some(network::NetworkEndpointSelection::Control(protocol))
                if protocol.as_str() == microsandbox_network::control::NETWORK_CONTROL_PROTOCOL =>
            {
                Ok(Self::Controlled)
            }
            Some(endpoint) => Err(Error::UnsupportedNetworkEndpoint(endpoint.clone())),
        }
    }
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use std::{collections::BTreeMap, path::PathBuf};

    use microsandbox::sandbox::VolumeMount;
    use sandbox::{
        ByteQuantity, CpuQuantity, Error, Hostname, Platform, RootFilesystem, SandboxId, SandboxName, SandboxResources,
        backend::{CreateSandboxRequest, SandboxBackend as _},
        image,
        init::InitSystem,
        network::{
            NetworkAttachment, NetworkBackendId, NetworkControlProtocolId, NetworkEndpointSelection, PacketMedium,
        },
    };

    use super::{MicrosandboxProvider, RuntimeMount, RuntimeNetwork};
    use crate::state::SandboxRecord;

    fn record_with_network(id: &str, endpoint: NetworkEndpointSelection) -> SandboxRecord {
        SandboxRecord::new(CreateSandboxRequest {
            id: id.parse::<SandboxId>().expect("test Sandbox ID should be a UUID"),
            name: SandboxName::new("worker").expect("test Sandbox name should be valid"),
            hostname: Hostname::new("worker").expect("test hostname should be valid"),
            image: image::ResolvedImage {
                source: image::ImageSource::Reference {
                    reference: "docker.io/library/alpine:3.22".to_string(),
                },
                platform: Platform::new("linux", "amd64"),
                manifest_digest: "sha256:1234".to_string(),
            },
            resources: SandboxResources::new(
                "1".parse::<CpuQuantity>().expect("test CPU should be valid"),
                "512Mi".parse::<ByteQuantity>().expect("test memory should be valid"),
                RootFilesystem::layered(
                    "4Gi"
                        .parse::<ByteQuantity>()
                        .expect("test root filesystem should be valid"),
                ),
            ),
            init_system: InitSystem::Backend,
            mounts: Vec::new(),
            environment: BTreeMap::new(),
            network: Some(NetworkAttachment {
                backend: NetworkBackendId::new("microsandbox"),
                endpoint,
            }),
        })
    }

    #[test]
    fn only_an_absent_attachment_or_this_builds_control_protocol_is_accepted() {
        assert_eq!(
            RuntimeNetwork::for_attachment(None).ok(),
            Some(RuntimeNetwork::Unattached)
        );
        let controlled = record_with_network(
            "00000000-0000-4000-8000-000000000010",
            NetworkEndpointSelection::Control(NetworkControlProtocolId::new(
                microsandbox_network::control::NETWORK_CONTROL_PROTOCOL,
            )),
        );
        assert_eq!(
            RuntimeNetwork::for_attachment(controlled.network.as_ref()).ok(),
            Some(RuntimeNetwork::Controlled)
        );
    }

    // A persisted attachment that this build cannot enforce must never reach
    // the runtime, where it would start without host network control.
    #[tokio::test(flavor = "local")]
    async fn start_refuses_a_recorded_endpoint_this_build_cannot_control() {
        let home = tempfile::tempdir().expect("temporary home should be created");
        let provider = MicrosandboxProvider::open(PathBuf::from(home.path()).join("microsandbox"))
            .await
            .expect("Provider should open without starting a VM");
        let endpoints = [
            NetworkEndpointSelection::Control(NetworkControlProtocolId::new("microsandbox.network-control.v0")),
            NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
            NetworkEndpointSelection::Intercepted,
        ];
        for (index, endpoint) in endpoints.into_iter().enumerate() {
            let mut record =
                record_with_network(&format!("00000000-0000-4000-8000-00000000000{}", index + 1), endpoint);
            record.name = SandboxName::new(format!("worker-{index}")).expect("test Sandbox name should be valid");
            provider
                .state
                .save_sandbox(&record)
                .await
                .expect("record should be saved");

            let result = provider.start(&record.id).await;

            let expected = &record
                .network
                .as_ref()
                .expect("record should have an attachment")
                .endpoint;
            assert!(
                matches!(&result, Err(Error::UnsupportedNetworkEndpoint(actual)) if actual == expected),
                "starting a Sandbox recorded with {expected:?} should be refused, got {result:?}"
            );
        }
        drop(provider);
    }

    #[tokio::test(flavor = "local")]
    async fn tmpfs_capacity_maps_to_microsandbox() {
        let config = Box::pin(crate::client::build_in_client_scope(
            RuntimeMount::Tmpfs {
                target: "/tmp".to_string(),
                capacity_mib: 4096,
            }
            .apply(microsandbox::sandbox::SandboxBuilder::new("sandbox").image("alpine")),
        ))
        .await;

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
