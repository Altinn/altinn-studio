use std::{rc::Rc, time::Instant};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    PendingOperation, Platform, Sandbox, SandboxCapabilities, SandboxFeature, SandboxFeatureSet, SandboxName,
    SandboxPath, SandboxResources, SandboxState,
    backend::{SandboxBackend, SandboxBackendCapabilities},
    execution, file_transfer, image,
    init::InitSystem,
    mount::{Mount, MountKind},
    network,
    progress::{PendingSandbox, PhaseOutcome, SandboxEvents, SandboxPhase},
    provider::SandboxProvider,
    terminal, volume,
};

/// Errors produced by the backend-neutral Sandbox SDK.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ResourceKind {
    /// A Sandbox.
    Sandbox,
    /// An Execution.
    Execution,
    /// A Volume.
    Volume,
    /// An immutable Image or cache entry.
    Image,
    /// A regular file inside a Sandbox.
    File,
    /// A live Network Backend attachment.
    Network,
    /// Host-owned secret material.
    Secret,
}

impl std::fmt::Display for ResourceKind {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::Sandbox => "Sandbox",
            Self::Execution => "Execution",
            Self::Volume => "Volume",
            Self::Image => "Image",
            Self::File => "file",
            Self::Network => "Sandbox Network",
            Self::Secret => "secret",
        })
    }
}

/// Stable category for programmatic Sandbox error handling.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ErrorKind {
    /// A requested resource does not exist.
    NotFound,
    /// Caller input violates a generic contract.
    InvalidRequest,
    /// An immutable field changed.
    Immutable,
    /// A provider cannot support the requested operation or value.
    Unsupported,
    /// Execution start or observation failed.
    Execution,
    /// Host I/O failed.
    Io,
    /// A provider-specific operation failed.
    Backend,
}

#[derive(Debug, Error)]
#[non_exhaustive]
pub enum Error {
    /// A requested object does not exist.
    #[error("{resource} {id:?} not found")]
    NotFound {
        /// Resource category.
        resource: ResourceKind,
        /// Stable name or identifier used for lookup.
        id: String,
    },
    /// An immutable field differs from the materialized Sandbox.
    #[error("immutable Sandbox field changed: {0}")]
    Immutable(&'static str),
    /// A request violates the generic Sandbox contract.
    #[error("invalid Sandbox field {field}: {reason}")]
    Invalid {
        /// Stable field or parameter path.
        field: &'static str,
        /// Human-readable invariant that was violated.
        reason: &'static str,
    },
    /// A requested Sandbox Feature is unavailable.
    #[error("unsupported Sandbox Feature: {0:?}")]
    UnsupportedFeature(SandboxFeature),
    /// A requested Mount form is unavailable.
    #[error("unsupported Sandbox Mount kind: {0:?}")]
    UnsupportedMountKind(MountKind),
    /// A requested root filesystem mode is unavailable.
    #[error("unsupported Sandbox root filesystem mode: {0:?}")]
    UnsupportedRootFilesystemMode(crate::RootFilesystemMode),
    /// An Image Backend operation is unavailable for the requested Platform.
    #[error("unsupported Image operation: {0:?}")]
    UnsupportedImageOperation(image::ImageOperation),
    /// An Image Backend operation does not accept the requested OCI source form.
    #[error("unsupported Image Source kind {source_kind:?} for operation {operation:?}")]
    UnsupportedImageSourceKind {
        /// Operation being requested.
        operation: image::ImageOperation,
        /// OCI source form rejected by the Image Backend.
        source_kind: image::ImageSourceKind,
    },
    /// An Image Backend operation cannot materialize the requested root mode.
    #[error("unsupported root filesystem mode {mode:?} for Image operation {operation:?}")]
    UnsupportedImageRootFilesystemMode {
        /// Operation being requested.
        operation: image::ImageOperation,
        /// Root filesystem mode rejected by the Image Backend.
        mode: crate::RootFilesystemMode,
    },
    /// A Sandbox Backend cannot materialize the requested Platform.
    #[error("unsupported Sandbox Platform: {0}")]
    UnsupportedPlatform(Platform),
    /// A Sandbox Backend cannot represent a resource value exactly.
    #[error("unsupported Sandbox resource value for {resource}: {value} ({reason})")]
    UnsupportedResourceValue {
        /// Stable field name in [`SandboxResources`].
        resource: &'static str,
        /// Requested Kubernetes-style quantity.
        value: String,
        /// Backend-specific representation constraint.
        reason: &'static str,
    },
    /// A Sandbox Backend cannot apply a requested resource transition.
    #[error("unsupported Sandbox resource change for {resource}: {current} -> {requested} ({reason})")]
    UnsupportedResourceChange {
        /// Stable field name in [`SandboxResources`].
        resource: &'static str,
        /// Currently materialized quantity.
        current: String,
        /// Requested quantity.
        requested: String,
        /// Backend-specific transition constraint.
        reason: &'static str,
    },
    /// A Sandbox Backend returned an identity different from the create request.
    #[error("Sandbox Backend returned ID {actual}; expected lifecycle-assigned ID {expected}")]
    SandboxIdMismatch {
        /// ID assigned before the create call.
        expected: crate::SandboxId,
        /// ID returned by the Sandbox Backend.
        actual: crate::SandboxId,
    },
    /// The service does not contain the Network Backend attached to a Sandbox.
    #[error("configured service cannot operate Sandbox Network Backend {0}")]
    NetworkBackendUnavailable(network::NetworkBackendId),
    /// The Network Backend cannot use any endpoint offered by the Sandbox Backend.
    #[error("Network Backend {0} has no compatible Sandbox Network endpoint")]
    NetworkEndpointUnavailable(network::NetworkBackendId),
    /// A Network Backend selected an endpoint not offered by the Sandbox Backend.
    #[error("Sandbox Backend does not support selected Network endpoint {0:?}")]
    UnsupportedNetworkEndpoint(network::NetworkEndpointSelection),
    /// A Sandbox Backend opened a different endpoint than the immutable attachment.
    #[error("Sandbox Backend opened Network endpoint {actual:?}; expected {expected:?}")]
    NetworkEndpointMismatch {
        /// Endpoint recorded when the Sandbox was created.
        expected: network::NetworkEndpointSelection,
        /// Endpoint returned by the Sandbox Backend.
        actual: network::NetworkEndpointSelection,
    },
    /// A resolved Image does not support the requested Sandbox Platform.
    #[error("Image Platform {actual} does not satisfy requested Sandbox Platform {requested}")]
    ImagePlatformMismatch {
        /// Platform requested by the Sandbox specification.
        requested: Box<Platform>,
        /// Platform reported by the built Image.
        actual: Box<Platform>,
    },
    /// An asynchronous file operation failed.
    #[error("{operation}: {source}")]
    Io {
        /// The operation being performed.
        operation: &'static str,
        /// The underlying I/O error.
        #[source]
        source: std::io::Error,
    },
    /// An Execution failed before it could produce an exit status.
    #[error("Execution {id} failed: {message}")]
    ExecutionFailed {
        /// Identity assigned before dispatch.
        id: execution::ExecutionId,
        /// Backend-neutral failure description.
        message: String,
    },
    /// An Execution event stream ended without an exit status.
    #[error("Execution {id} event stream ended before completion")]
    ExecutionStreamEnded {
        /// Identity assigned before dispatch.
        id: execution::ExecutionId,
    },
    /// An observable operation ended without a value or Error.
    #[error("Sandbox operation stream ended before completion")]
    OperationStreamEnded,
    /// A Sandbox SDK component failed.
    #[error("{operation}: {source}")]
    Component {
        /// The operation that failed.
        operation: &'static str,
        /// The component error.
        #[source]
        source: Box<Self>,
    },
    /// An implementation-specific failure.
    #[error("Sandbox implementation error: {0}")]
    Backend(String),
}

impl Error {
    /// Creates a structured not-found error.
    #[must_use]
    pub fn not_found(resource: ResourceKind, id: &(impl ToString + ?Sized)) -> Self {
        Self::NotFound {
            resource,
            id: id.to_string(),
        }
    }

    /// Creates a structured invalid-request error.
    #[must_use]
    pub const fn invalid(field: &'static str, reason: &'static str) -> Self {
        Self::Invalid { field, reason }
    }

    /// Returns a stable category suitable for control-flow decisions.
    #[must_use]
    pub const fn kind(&self) -> ErrorKind {
        match self {
            Self::NotFound { .. } => ErrorKind::NotFound,
            Self::Immutable(_) | Self::SandboxIdMismatch { .. } | Self::NetworkEndpointMismatch { .. } => {
                ErrorKind::Immutable
            }
            Self::Invalid { .. } | Self::ImagePlatformMismatch { .. } => ErrorKind::InvalidRequest,
            Self::UnsupportedFeature(_)
            | Self::UnsupportedMountKind(_)
            | Self::UnsupportedRootFilesystemMode(_)
            | Self::UnsupportedImageOperation(_)
            | Self::UnsupportedImageSourceKind { .. }
            | Self::UnsupportedImageRootFilesystemMode { .. }
            | Self::UnsupportedPlatform(_)
            | Self::UnsupportedResourceValue { .. }
            | Self::UnsupportedResourceChange { .. }
            | Self::NetworkBackendUnavailable(_)
            | Self::NetworkEndpointUnavailable(_)
            | Self::UnsupportedNetworkEndpoint(_) => ErrorKind::Unsupported,
            Self::Io { .. } => ErrorKind::Io,
            Self::ExecutionFailed { .. } | Self::ExecutionStreamEnded { .. } => ErrorKind::Execution,
            Self::OperationStreamEnded | Self::Backend(_) => ErrorKind::Backend,
            Self::Component { source, .. } => source.kind(),
        }
    }

    /// Reports whether this error or its component cause is not-found.
    #[must_use]
    pub const fn is_not_found(&self) -> bool {
        matches!(self.kind(), ErrorKind::NotFound)
    }

    /// Returns the missing resource and lookup value, including through component context.
    #[must_use]
    pub fn not_found_target(&self) -> Option<(ResourceKind, &str)> {
        match self {
            Self::NotFound { resource, id } => Some((*resource, id)),
            Self::Component { source, .. } => source.not_found_target(),
            _ => None,
        }
    }

    fn component(operation: &'static str, source: Self) -> Self {
        Self::Component {
            operation,
            source: Box::new(source),
        }
    }
}

/// Controls what an owner does with a released Sandbox.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub enum RetentionPolicy {
    /// Stop the Sandbox and retain its storage for later re-adoption.
    #[default]
    Retain,
    /// Stop and delete the Sandbox.
    Delete,
}

/// Backend-neutral Sandbox configuration used by higher layers.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SandboxSpec {
    /// Source of the immutable Image.
    pub image: image::ImageSource,
    /// Desired Sandbox Platform.
    pub platform: Platform,
    /// Desired mutable compute and writable root filesystem resources.
    pub resources: SandboxResources,
    /// Process responsible for initializing the Sandbox after backend setup.
    #[serde(default)]
    pub init_system: InitSystem,
    /// Whether an owner retains the Sandbox when releasing it.
    #[serde(default)]
    pub retention_policy: RetentionPolicy,
}

impl SandboxSpec {
    /// Validates fields interpreted by the generic Sandbox layer.
    ///
    /// # Errors
    ///
    /// Returns an error when the Image Source is incomplete.
    pub fn validate(&self) -> Result<(), Error> {
        self.image.validate()?;
        self.platform.validate()?;
        Ok(())
    }

    /// Resolves relative Image Source paths against a caller-supplied directory.
    #[must_use]
    pub fn resolve_from(&self, source_directory: &std::path::Path) -> Self {
        Self {
            image: self.image.resolve_from(source_directory),
            ..self.clone()
        }
    }
}

/// Desired materialization of one named Sandbox.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EnsureSandboxRequest {
    /// Stable Sandbox name.
    name: SandboxName,
    /// Desired backend-neutral configuration.
    spec: SandboxSpec,
    /// Attachments contributed by the caller or a higher platform layer.
    mounts: Vec<Mount>,
    /// Non-secret environment contributed by the caller or a higher platform layer.
    environment: std::collections::BTreeMap<String, String>,
    /// Optional functionality required from the selected Sandbox Backend.
    required_features: SandboxFeatureSet,
}

impl EnsureSandboxRequest {
    /// Creates a request without mounts or optional feature requirements.
    #[must_use]
    pub const fn new(name: SandboxName, spec: SandboxSpec) -> Self {
        Self {
            name,
            spec,
            mounts: Vec::new(),
            environment: std::collections::BTreeMap::new(),
            required_features: SandboxFeatureSet::new(),
        }
    }

    /// Adds filesystem attachments materialized with the Sandbox.
    #[must_use]
    pub fn with_mounts(mut self, mounts: impl IntoIterator<Item = Mount>) -> Self {
        self.mounts = mounts.into_iter().collect();
        self
    }

    /// Adds non-secret environment inherited by image init and Sandbox Executions.
    #[must_use]
    pub fn with_environment(mut self, environment: impl IntoIterator<Item = (String, String)>) -> Self {
        self.environment.extend(environment);
        self
    }

    /// Adds optional Backend Features required by the caller.
    #[must_use]
    pub fn requiring_features(mut self, features: impl Into<SandboxFeatureSet>) -> Self {
        self.required_features.extend(&features.into());
        self
    }

    /// Returns the stable Sandbox name.
    #[must_use]
    pub const fn name(&self) -> &SandboxName {
        &self.name
    }

    /// Returns the desired Sandbox configuration.
    #[must_use]
    pub const fn spec(&self) -> &SandboxSpec {
        &self.spec
    }

    /// Mutably borrows the desired Sandbox configuration before dispatch.
    #[must_use]
    pub const fn spec_mut(&mut self) -> &mut SandboxSpec {
        &mut self.spec
    }

    /// Returns the desired filesystem attachments.
    #[must_use]
    pub fn mounts(&self) -> &[Mount] {
        &self.mounts
    }

    /// Returns the desired non-secret Sandbox environment.
    #[must_use]
    pub const fn environment(&self) -> &std::collections::BTreeMap<String, String> {
        &self.environment
    }

    /// Returns explicit optional Feature requirements.
    #[must_use]
    pub const fn required_features(&self) -> &SandboxFeatureSet {
        &self.required_features
    }

    fn effective_required_features(&self) -> SandboxFeatureSet {
        let mut required = self.required_features.clone();
        for mount in &self.mounts {
            match mount {
                Mount::Volume { .. } => required.insert(SandboxFeature::PersistentVolumes),
                Mount::Bind { .. } | Mount::Tmpfs { .. } => {}
            }
        }
        if self.spec.init_system == InitSystem::Image {
            required.insert(SandboxFeature::ImageInit);
        }
        required
    }
}

/// Coordinates backend-neutral Sandbox operations.
#[derive(Clone)]
pub struct SandboxService {
    provider: Rc<dyn SandboxProvider>,
    network_backend: Option<Rc<dyn network::NetworkBackend>>,
}

impl SandboxService {
    /// Creates a service from a coherently paired Sandbox provider.
    #[must_use]
    pub fn new(provider: Rc<dyn SandboxProvider>) -> Self {
        Self {
            provider,
            network_backend: None,
        }
    }

    fn backend(&self) -> &dyn SandboxBackend {
        self.provider.backend()
    }

    /// Reports consumer-visible functionality for one Sandbox Platform.
    ///
    /// # Errors
    ///
    /// Returns an error when the Provider does not support the Platform or the
    /// configured Network Backend cannot use any offered endpoint.
    pub async fn capabilities(&self, platform: &Platform) -> Result<SandboxCapabilities, Error> {
        let capabilities = self.backend_capabilities(platform).await?;
        let image_capabilities = self.image_backend_capabilities(platform).await?;
        let network_available = match &self.network_backend {
            Some(network) => {
                let backend_id = network.id();
                network
                    .select_endpoint(&capabilities.network)
                    .ok_or(Error::NetworkEndpointUnavailable(backend_id))?;
                true
            }
            None => false,
        };
        let root_filesystem_modes = if image_capabilities.resolve.is_available() {
            capabilities
                .root_filesystems
                .intersection(&image_capabilities.resolve.root_filesystem_modes)
        } else {
            crate::RootFilesystemModeSet::default()
        };
        Ok(SandboxCapabilities::new(
            capabilities.features,
            capabilities.mounts,
            root_filesystem_modes,
            image_capabilities.prepared_image_export,
            image_capabilities.prepared_image_import,
            network_available,
        ))
    }

    async fn backend_capabilities(&self, platform: &Platform) -> Result<SandboxBackendCapabilities, Error> {
        self.backend()
            .capabilities(platform)
            .await
            .map_err(|error| Error::component("discover Sandbox capabilities", error))
    }

    async fn image_backend_capabilities(&self, platform: &Platform) -> Result<image::ImageBackendCapabilities, Error> {
        self.provider
            .image_backend()
            .capabilities(platform)
            .await
            .map_err(|error| Error::component("discover Image capabilities", error))
    }

    /// Attaches every newly materialized Sandbox to this Network Backend.
    ///
    /// The selected Backend identity becomes immutable when the Sandbox is
    /// created. The Network Backend remains independently replaceable when
    /// composing a service for a different Sandbox.
    #[must_use]
    pub fn with_network_backend(mut self, network_backend: Rc<dyn network::NetworkBackend>) -> Self {
        self.network_backend = Some(network_backend);
        self
    }

    /// Creates or re-adopts a named Sandbox and returns an operation that
    /// yields progress until the Sandbox is ready or provisioning fails.
    ///
    /// Awaiting the returned value discards progress and returns the terminal
    /// result. Polling it as a stream exposes every provisioning event.
    #[must_use]
    pub fn ensure<'a>(&'a self, request: &'a EnsureSandboxRequest) -> PendingSandbox<'a> {
        PendingOperation::with_events(|events| Box::pin(async move { self.ensure_inner(request, &events).await }))
    }

    /// Exports a prepared Image into an opaque Provider-owned artifact.
    #[must_use]
    pub fn export_prepared_image<'a>(
        &'a self,
        request: &'a image::ResolveRequest,
        destination: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        PendingOperation::with_events(|events| {
            Box::pin(async move {
                request.validate()?;
                self.require_image_operation(image::ImageOperation::PreparedImageExport, request)
                    .await?;
                let prepared = self
                    .provider
                    .image_backend()
                    .export_prepared_image(request, destination)
                    .forward(&events)
                    .await?;
                prepared.validate_for(request)?;
                Ok(prepared)
            })
        })
    }

    /// Imports a prepared Image into this Provider's materialization domain.
    #[must_use]
    pub fn import_prepared_image<'a>(
        &'a self,
        request: &'a image::ResolveRequest,
        source: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        PendingOperation::with_events(|events| {
            Box::pin(async move {
                request.validate()?;
                self.require_image_operation(image::ImageOperation::PreparedImageImport, request)
                    .await?;
                let prepared = self
                    .provider
                    .image_backend()
                    .import_prepared_image(request, source)
                    .forward(&events)
                    .await?;
                prepared.validate_for(request)?;
                Ok(prepared)
            })
        })
    }

    async fn ensure_inner(
        &self,
        request: &EnsureSandboxRequest,
        events: &SandboxEvents,
    ) -> Result<SandboxHandle, Error> {
        let retention_policy = request.spec.retention_policy;
        let sandbox = self.ensure_sandbox(request, events).await?;
        Ok(SandboxHandle {
            service: self.clone(),
            sandbox,
            retention_policy,
        })
    }

    async fn ensure_sandbox(&self, request: &EnsureSandboxRequest, events: &SandboxEvents) -> Result<Sandbox, Error> {
        let started = Instant::now();
        events.phase_started(SandboxPhase::Validate).await;
        request.spec.validate()?;
        validate_environment(&request.environment)?;
        events
            .phase_completed(SandboxPhase::Validate, PhaseOutcome::Completed, started.elapsed())
            .await;

        let started = Instant::now();
        events.phase_started(SandboxPhase::Lookup).await;
        match self.backend().find(&request.name).await {
            Ok(sandbox) => {
                if !sandbox.image.platform.satisfies(&request.spec.platform) {
                    return Err(Error::Immutable("platform"));
                }
                if sandbox.image.source != request.spec.image {
                    return Err(Error::Immutable("image"));
                }
                if sandbox.resources.root_filesystem().mode() != request.spec.resources.root_filesystem().mode() {
                    return Err(Error::Immutable("resources.rootFilesystem.mode"));
                }
                if sandbox.init_system != request.spec.init_system {
                    return Err(Error::Immutable("initSystem"));
                }
                if sandbox.mounts != request.mounts {
                    return Err(Error::Immutable("mounts"));
                }
                events
                    .phase_completed(SandboxPhase::Lookup, PhaseOutcome::Reused, started.elapsed())
                    .await;
                let network = self
                    .require_backend_features_observed(&sandbox.image.platform, request, events)
                    .await?;
                if sandbox.network != network {
                    return Err(Error::Immutable("network"));
                }
                let sandbox = self.ensure_environment(sandbox, &request.environment, events).await?;
                let sandbox = self.ensure_resources(sandbox, request.spec.resources, events).await?;
                self.ensure_running(sandbox, events).await
            }
            Err(error) if error.is_not_found() => {
                events
                    .phase_completed(SandboxPhase::Lookup, PhaseOutcome::Completed, started.elapsed())
                    .await;
                self.require_backend_features_observed(&request.spec.platform, request, events)
                    .await?;
                let image = self.resolve_image(request, events).await?;
                let network = self
                    .require_backend_features_observed(&image.platform, request, events)
                    .await?;
                let started = Instant::now();
                events.phase_started(SandboxPhase::SandboxCreate).await;
                let id = crate::SandboxId::generate();
                let sandbox = self
                    .backend()
                    .create(crate::backend::CreateSandboxRequest {
                        id: id.clone(),
                        name: request.name.clone(),
                        image,
                        resources: request.spec.resources,
                        init_system: request.spec.init_system,
                        mounts: request.mounts.clone(),
                        environment: request.environment.clone(),
                        network,
                    })
                    .forward(events)
                    .await
                    .map_err(|error| Error::component("create Sandbox", error))?;
                if sandbox.id != id {
                    return Err(Error::SandboxIdMismatch {
                        expected: id,
                        actual: sandbox.id,
                    });
                }
                events
                    .phase_completed(SandboxPhase::SandboxCreate, PhaseOutcome::Completed, started.elapsed())
                    .await;
                self.ensure_running(sandbox, events).await
            }
            Err(error) => Err(Error::component("find Sandbox", error)),
        }
    }

    async fn resolve_image(
        &self,
        request: &EnsureSandboxRequest,
        events: &SandboxEvents,
    ) -> Result<image::ResolvedImage, Error> {
        let started = Instant::now();
        events.phase_started(SandboxPhase::ImageResolve).await;
        let image = self
            .provider
            .image_backend()
            .resolve(&image::ResolveRequest {
                source: request.spec.image.clone(),
                platform: request.spec.platform.clone(),
                root_filesystem_mode: request.spec.resources.root_filesystem().mode(),
            })
            .forward(events)
            .await
            .map_err(|error| Error::component("resolve Sandbox Image", error))?;
        image.validate()?;
        if !image.platform.satisfies(&request.spec.platform) {
            return Err(Error::ImagePlatformMismatch {
                requested: Box::new(request.spec.platform.clone()),
                actual: Box::new(image.platform),
            });
        }
        events
            .phase_completed(SandboxPhase::ImageResolve, PhaseOutcome::Completed, started.elapsed())
            .await;
        Ok(image)
    }

    async fn ensure_resources(
        &self,
        sandbox: Sandbox,
        resources: SandboxResources,
        events: &SandboxEvents,
    ) -> Result<Sandbox, Error> {
        let started = Instant::now();
        events.phase_started(SandboxPhase::SandboxUpdate).await;
        let (sandbox, outcome) = if sandbox.resources == resources {
            (sandbox, PhaseOutcome::Reused)
        } else {
            let sandbox = self
                .backend()
                .update_resources(&sandbox.id, resources)
                .forward(events)
                .await
                .map_err(|error| Error::component("update Sandbox resources", error))?;
            (sandbox, PhaseOutcome::Completed)
        };
        events
            .phase_completed(SandboxPhase::SandboxUpdate, outcome, started.elapsed())
            .await;
        Ok(sandbox)
    }

    async fn ensure_environment(
        &self,
        sandbox: Sandbox,
        environment: &std::collections::BTreeMap<String, String>,
        events: &SandboxEvents,
    ) -> Result<Sandbox, Error> {
        let started = Instant::now();
        events.phase_started(SandboxPhase::SandboxUpdate).await;
        let (sandbox, outcome) = if &sandbox.environment == environment {
            (sandbox, PhaseOutcome::Reused)
        } else {
            if sandbox.state != SandboxState::Stopped {
                self.backend()
                    .stop(&sandbox.id)
                    .await
                    .map_err(|error| Error::component("stop Sandbox for environment update", error))?;
                if let Some(network_backend) = self.network_backend_for(&sandbox)? {
                    network_backend
                        .stop(&sandbox.id)
                        .await
                        .map_err(|error| Error::component("stop Sandbox Network for environment update", error))?;
                }
            }
            let sandbox = self
                .backend()
                .update_environment(&sandbox.id, environment.clone())
                .forward(events)
                .await
                .map_err(|error| Error::component("update Sandbox environment", error))?;
            (sandbox, PhaseOutcome::Completed)
        };
        events
            .phase_completed(SandboxPhase::SandboxUpdate, outcome, started.elapsed())
            .await;
        Ok(sandbox)
    }

    async fn require_backend_features_observed(
        &self,
        platform: &Platform,
        request: &EnsureSandboxRequest,
        events: &SandboxEvents,
    ) -> Result<Option<network::NetworkAttachment>, Error> {
        let started = Instant::now();
        events.phase_started(SandboxPhase::FeatureDiscovery).await;
        let network = self.require_backend_features(platform, request).await?;
        events
            .phase_completed(
                SandboxPhase::FeatureDiscovery,
                PhaseOutcome::Completed,
                started.elapsed(),
            )
            .await;
        Ok(network)
    }

    async fn require_backend_features(
        &self,
        platform: &Platform,
        request: &EnsureSandboxRequest,
    ) -> Result<Option<network::NetworkAttachment>, Error> {
        let capabilities = self.backend_capabilities(platform).await?;
        for feature in request.effective_required_features().iter() {
            if !capabilities.features.contains(feature) {
                return Err(Error::UnsupportedFeature(feature));
            }
        }
        for mount in &request.mounts {
            if !capabilities.mounts.contains(mount.kind()) {
                return Err(Error::UnsupportedMountKind(mount.kind()));
            }
        }
        let root_filesystem_mode = request.spec.resources.root_filesystem().mode();
        if !capabilities.root_filesystems.contains(root_filesystem_mode) {
            return Err(Error::UnsupportedRootFilesystemMode(root_filesystem_mode));
        }
        self.require_image_operation(
            image::ImageOperation::Resolve,
            &image::ResolveRequest {
                source: request.spec.image.clone(),
                platform: platform.clone(),
                root_filesystem_mode,
            },
        )
        .await?;
        let Some(network_backend) = &self.network_backend else {
            return Ok(None);
        };
        let backend_id = network_backend.id();
        let selection = network_backend
            .select_endpoint(&capabilities.network)
            .ok_or_else(|| Error::NetworkEndpointUnavailable(backend_id.clone()))?;
        if !capabilities.network.supports(&selection) {
            return Err(Error::UnsupportedNetworkEndpoint(selection));
        }
        Ok(Some(network::NetworkAttachment {
            backend: backend_id,
            endpoint: selection,
        }))
    }

    async fn require_image_operation(
        &self,
        operation: image::ImageOperation,
        request: &image::ResolveRequest,
    ) -> Result<(), Error> {
        let capabilities = self.image_backend_capabilities(&request.platform).await?;
        let operation_capabilities = match operation {
            image::ImageOperation::Resolve => &capabilities.resolve,
            image::ImageOperation::PreparedImageExport => &capabilities.prepared_image_export,
            image::ImageOperation::PreparedImageImport => &capabilities.prepared_image_import,
        };
        if !operation_capabilities.is_available() {
            return Err(Error::UnsupportedImageOperation(operation));
        }
        let source = request.source.kind();
        if !operation_capabilities.sources.contains(source) {
            return Err(Error::UnsupportedImageSourceKind {
                operation,
                source_kind: source,
            });
        }
        if !operation_capabilities
            .root_filesystem_modes
            .contains(request.root_filesystem_mode)
        {
            return Err(Error::UnsupportedImageRootFilesystemMode {
                operation,
                mode: request.root_filesystem_mode,
            });
        }
        Ok(())
    }

    /// Returns the materialized Sandbox for a stable name.
    ///
    /// # Errors
    ///
    /// Returns an error when the Sandbox does not exist or the Backend fails.
    pub async fn inspect(&self, name: &SandboxName) -> Result<Sandbox, Error> {
        self.backend()
            .find(name)
            .await
            .map_err(|error| Error::component("find Sandbox", error))
    }

    /// Opens an effect-free Handle for an already materialized Sandbox.
    ///
    /// This never creates, starts, updates, or reconnects the Sandbox. Callers
    /// that own only in-Sandbox effects use it after a lifecycle owner has
    /// persisted the exact Sandbox identity.
    ///
    /// # Errors
    ///
    /// Returns an error when the Sandbox does not exist or cannot be inspected.
    pub async fn open(&self, id: &crate::SandboxId, retention_policy: RetentionPolicy) -> Result<SandboxHandle, Error> {
        let sandbox = self
            .backend()
            .inspect(id)
            .await
            .map_err(|error| Error::component("inspect Sandbox", error))?;
        Ok(SandboxHandle {
            service: self.clone(),
            sandbox,
            retention_policy,
        })
    }

    /// Stops and deletes a named Sandbox if it exists.
    ///
    /// # Errors
    ///
    /// Returns an error when a lifecycle component fails.
    pub async fn delete(&self, name: &SandboxName) -> Result<(), Error> {
        self.release(name, RetentionPolicy::Delete).await
    }

    /// Stops a Sandbox and retains or deletes its materialized resources.
    ///
    /// # Errors
    ///
    /// Returns an error when a lifecycle component fails.
    pub async fn release(&self, name: &SandboxName, retention: RetentionPolicy) -> Result<(), Error> {
        let sandbox = match self.backend().find(name).await {
            Ok(sandbox) => sandbox,
            Err(error) if error.is_not_found() => return Ok(()),
            Err(error) => return Err(Error::component("find Sandbox", error)),
        };
        self.release_sandbox(sandbox, retention).await
    }

    async fn release_by_id(&self, id: &crate::SandboxId, retention: RetentionPolicy) -> Result<(), Error> {
        let sandbox = match self.backend().inspect(id).await {
            Ok(sandbox) => sandbox,
            Err(error) if error.is_not_found() => return Ok(()),
            Err(error) => return Err(Error::component("inspect Sandbox", error)),
        };
        self.release_sandbox(sandbox, retention).await
    }

    async fn release_sandbox(&self, sandbox: Sandbox, retention: RetentionPolicy) -> Result<(), Error> {
        let network_backend = self.network_backend_for(&sandbox)?;

        if sandbox.state != SandboxState::Stopped {
            self.backend()
                .stop(&sandbox.id)
                .await
                .map_err(|error| Error::component("stop Sandbox", error))?;
        }
        if let Some(network_backend) = network_backend {
            network_backend
                .stop(&sandbox.id)
                .await
                .map_err(|error| Error::component("stop Sandbox Network", error))?;
        }
        if retention == RetentionPolicy::Delete {
            if let Some(network_backend) = network_backend {
                network_backend
                    .delete(&sandbox.id)
                    .await
                    .map_err(|error| Error::component("delete Sandbox Network", error))?;
            }
            self.backend()
                .delete(&sandbox.id)
                .await
                .map_err(|error| Error::component("delete Sandbox", error))?;
        }
        Ok(())
    }

    async fn ensure_running(&self, sandbox: Sandbox, events: &SandboxEvents) -> Result<Sandbox, Error> {
        if let Some(network_backend) = self.network_backend_for(&sandbox)?
            && !network_backend.is_running(&sandbox.id)
        {
            let started = Instant::now();
            events.phase_started(SandboxPhase::NetworkStart).await;
            let endpoint = self
                .backend()
                .open_network_endpoint(&sandbox.id)
                .await
                .map_err(|error| Error::component("open Sandbox Network endpoint", error))?;
            let expected = sandbox
                .network
                .as_ref()
                .ok_or(Error::invalid("network", "attachment is missing"))?
                .endpoint
                .clone();
            let actual = endpoint.selection();
            if actual != expected {
                return Err(Error::NetworkEndpointMismatch { expected, actual });
            }
            network_backend
                .start(network::StartNetworkRequest {
                    sandbox_id: sandbox.id.clone(),
                    sandbox_name: sandbox.name.clone(),
                    endpoint,
                })
                .await
                .map_err(|error| Error::component("start Sandbox Network", error))?;
            events
                .phase_completed(SandboxPhase::NetworkStart, PhaseOutcome::Completed, started.elapsed())
                .await;
        }
        let started = Instant::now();
        events.phase_started(SandboxPhase::SandboxStart).await;
        if sandbox.state != SandboxState::Running {
            self.backend()
                .start(&sandbox.id)
                .forward(events)
                .await
                .map_err(|error| Error::component("start Sandbox", error))?;
        }
        let outcome = if sandbox.state == SandboxState::Running {
            PhaseOutcome::Reused
        } else {
            PhaseOutcome::Completed
        };
        events
            .phase_completed(SandboxPhase::SandboxStart, outcome, started.elapsed())
            .await;
        let started = Instant::now();
        events.phase_started(SandboxPhase::Inspect).await;
        let sandbox = self
            .backend()
            .inspect(&sandbox.id)
            .await
            .map_err(|error| Error::component("inspect Sandbox", error))?;
        events
            .phase_completed(SandboxPhase::Inspect, PhaseOutcome::Completed, started.elapsed())
            .await;
        Ok(sandbox)
    }

    fn network_backend_for(&self, sandbox: &Sandbox) -> Result<Option<&Rc<dyn network::NetworkBackend>>, Error> {
        let Some(attachment) = &sandbox.network else {
            return Ok(None);
        };
        let backend = self
            .network_backend
            .as_ref()
            .filter(|backend| backend.id() == attachment.backend)
            .ok_or_else(|| Error::NetworkBackendUnavailable(attachment.backend.clone()))?;
        Ok(Some(backend))
    }

    /// Creates or returns a named Volume.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider cannot materialize the Volume.
    pub async fn ensure_volume(&self, request: volume::EnsureVolumeRequest) -> Result<volume::Volume, Error> {
        self.backend().ensure_volume(request).await
    }

    /// Finds a named Volume.
    ///
    /// # Errors
    ///
    /// Returns an error when the Volume does not exist or the provider fails.
    pub async fn find_volume(&self, name: &volume::VolumeName) -> Result<volume::Volume, Error> {
        self.backend().find_volume(name).await
    }

    /// Deletes a Volume by identifier.
    ///
    /// # Errors
    ///
    /// Returns an error when the Volume does not exist or the provider fails.
    pub async fn delete_volume(&self, id: &volume::VolumeId) -> Result<(), Error> {
        self.backend().delete_volume(id).await
    }
}

fn validate_environment(environment: &std::collections::BTreeMap<String, String>) -> Result<(), Error> {
    for (name, value) in environment {
        let valid_name = !name.is_empty()
            && name.bytes().enumerate().all(|(index, byte)| {
                byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit())
            });
        if !valid_name || value.contains('\0') {
            return Err(Error::invalid(
                "environment",
                "names must be portable environment variables and values must not contain NUL",
            ));
        }
    }
    Ok(())
}

/// A ready Sandbox and the operations scoped to its immutable lifecycle ID.
///
/// The Handle owns the retention policy selected during `ensure`, but dropping
/// it performs no asynchronous cleanup. Call [`Self::release`] or
/// [`Self::delete`] explicitly. Its observed Sandbox snapshot may become stale
/// and changes only when [`Self::refresh`] succeeds.
#[must_use = "release or delete the Sandbox Handle explicitly when its work is complete"]
pub struct SandboxHandle {
    service: SandboxService,
    sandbox: Sandbox,
    retention_policy: RetentionPolicy,
}

impl std::fmt::Debug for SandboxHandle {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("SandboxHandle")
            .field("sandbox", &self.sandbox)
            .field("retention_policy", &self.retention_policy)
            .finish_non_exhaustive()
    }
}

impl SandboxHandle {
    /// Returns the immutable lifecycle identifier targeted by this Handle.
    #[must_use]
    pub const fn id(&self) -> &crate::SandboxId {
        &self.sandbox.id
    }

    /// Returns the stable lookup name of this Sandbox.
    #[must_use]
    pub const fn name(&self) -> &SandboxName {
        &self.sandbox.name
    }

    /// Returns the latest observed Sandbox snapshot cached by this Handle.
    #[must_use]
    pub const fn snapshot(&self) -> &Sandbox {
        &self.sandbox
    }

    /// Refreshes and returns the Sandbox snapshot.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider cannot inspect the Sandbox.
    pub async fn refresh(&mut self) -> Result<&Sandbox, Error> {
        self.sandbox = self
            .service
            .backend()
            .inspect(&self.sandbox.id)
            .await
            .map_err(|error| Error::component("inspect Sandbox", error))?;
        Ok(&self.sandbox)
    }

    /// Starts an addressable Execution and returns its live event stream.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider cannot start the Execution.
    pub async fn start_execution(
        &self,
        request: execution::StartExecutionRequest,
    ) -> Result<execution::StartedExecution, Error> {
        self.service.backend().start_execution(&self.sandbox.id, request).await
    }

    /// Starts an addressable Execution and collects its output in memory.
    ///
    /// Use [`Self::start_execution`] to stream unbounded output.
    ///
    /// # Errors
    ///
    /// Returns an error when execution fails or its event stream ends unexpectedly.
    pub async fn run_execution(&self, spec: execution::ExecutionSpec) -> Result<execution::ExecutionOutput, Error> {
        let request = execution::StartExecutionRequest::new(spec);
        self.start_execution(request).await?.collect().await
    }

    /// Starts a terminal Execution with programmatic input and output.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider cannot start the terminal Execution.
    pub async fn start_terminal_execution(
        &self,
        request: terminal::StartTerminalExecutionRequest,
    ) -> Result<terminal::StartedTerminalExecution, Error> {
        self.service
            .backend()
            .start_terminal_execution(&self.sandbox.id, request)
            .await
    }

    /// Attaches the caller's terminal to an interactive Execution.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider cannot attach the terminal.
    pub async fn attach_terminal(
        &self,
        request: terminal::AttachTerminalRequest,
    ) -> Result<terminal::TerminalAttachOutcome, Error> {
        self.service.backend().attach_terminal(&self.sandbox.id, request).await
    }

    /// Requests graceful termination of a live Execution.
    ///
    /// # Errors
    ///
    /// Returns an error when the Execution cannot be found or terminated.
    pub async fn terminate_execution(&self, id: &execution::ExecutionId) -> Result<(), Error> {
        self.service.backend().terminate_execution(&self.sandbox.id, id).await
    }

    /// Forces a live Execution to stop.
    ///
    /// # Errors
    ///
    /// Returns an error when the Execution cannot be found or killed.
    pub async fn kill_execution(&self, id: &execution::ExecutionId) -> Result<(), Error> {
        self.service.backend().kill_execution(&self.sandbox.id, id).await
    }

    /// Opens a regular Sandbox file for streamed reading.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider cannot open the file.
    pub async fn read_file(&self, path: &SandboxPath) -> Result<file_transfer::ByteReader, Error> {
        self.service.backend().read_file(&self.sandbox.id, path).await
    }

    /// Creates or replaces a regular Sandbox file from a byte stream.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider cannot write the file.
    pub async fn write_file(&self, path: &SandboxPath, contents: file_transfer::ByteReader) -> Result<(), Error> {
        self.service
            .backend()
            .write_file(&self.sandbox.id, path, contents)
            .await
    }

    /// Stops this Sandbox and applies the retention policy used to ensure it.
    ///
    /// # Errors
    ///
    /// Returns an error when the Sandbox or its Network cannot be released.
    pub async fn release(self) -> Result<(), Error> {
        self.service
            .release_by_id(&self.sandbox.id, self.retention_policy)
            .await
    }

    /// Stops and deletes this Sandbox regardless of its retention policy.
    ///
    /// # Errors
    ///
    /// Returns an error when the Sandbox or its Network cannot be deleted.
    pub async fn delete(self) -> Result<(), Error> {
        self.service
            .release_by_id(&self.sandbox.id, RetentionPolicy::Delete)
            .await
    }
}
