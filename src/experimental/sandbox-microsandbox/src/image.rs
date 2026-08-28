use std::{
    collections::HashSet,
    fs::File,
    path::{Path, PathBuf},
    time::Instant,
};

use bollard::{
    Docker,
    query_parameters::{BuildImageOptionsBuilder, BuilderVersion, TagImageOptionsBuilder},
};
use futures_util::StreamExt as _;
use ignore::gitignore::{Gitignore, GitignoreBuilder};
use sandbox::progress::{ProgressStep, SandboxProgress};
use sandbox::{
    Error, LocalFuture, OutputStream, PendingOperation, ProgressUnit, RootFilesystemMode, SandboxPhase, image,
};
use sha2::{Digest as _, Sha256};
use tokio::io::AsyncWriteExt as _;
use tokio_util::codec::{BytesCodec, FramedRead};
use uuid::Uuid;

use crate::{client::Client, encoding::lower_hex, error, platform};

const CHECK_DOCKER: &str = "Check Docker Engine";
const PREPARE_CONTEXT: &str = "Prepare Docker build context";
const BUILD_IMAGE: &str = "Build Docker image";
const PULL_IMAGE: &str = "Pull OCI image";
const LOOKUP_IMPORTED_IMAGE: &str = "Look up imported Microsandbox image";
const EXPORT_IMAGE: &str = "Export Docker image";
const IMPORT_IMAGE: &str = "Import Microsandbox image";
const RETAIN_BUILD_CACHE: &str = "Retain Docker build cache";
const REMOVE_TEMPORARY_IMAGE: &str = "Remove temporary Docker image";
const EXPORT_PREPARED_ROOT: &str = "Export prepared root";
const IMPORT_PREPARED_ROOT: &str = "Import prepared root";
const EXPORT_PROGRESS_INTERVAL: u64 = 32 * 1024 * 1024;
const CACHE_REPOSITORY: &str = "sandbox-microsandbox-cache";
const IMPORT_CACHE_REPOSITORY: &str = "sandbox-microsandbox-import";

/// Resolves Dockerfile builds and OCI references into the Microsandbox cache
/// used by its paired Backend.
pub(crate) struct MicrosandboxImageBackend {
    client: Client,
    docker: Result<Docker, String>,
    registry_authentication: Option<sandbox::image::RegistryAuthentication>,
}

impl MicrosandboxImageBackend {
    pub(crate) fn new(client: Client, registry_authentication: Option<sandbox::image::RegistryAuthentication>) -> Self {
        Self {
            client,
            docker: Docker::connect_with_defaults().map_err(|failure| failure.to_string()),
            registry_authentication,
        }
    }

    fn docker(&self) -> Result<&Docker, Error> {
        self.docker.as_ref().map_err(|failure| Error::Backend(failure.clone()))
    }

    async fn build_image(
        &self,
        request: &image::ResolveRequest,
        context: &Path,
        dockerfile: &Path,
        progress: &SandboxProgress,
    ) -> Result<image::ResolvedImage, Error> {
        let platform = platform::require_supported(&request.platform)?;
        self.check_docker(progress).await?;
        let prepared = Self::prepare_context(context, dockerfile, &request.platform, progress).await?;
        let build_id = Uuid::new_v4().simple().to_string();
        let temporary_tag = format!("sandbox-microsandbox-build:{build_id}");
        self.build_docker_image(&prepared, &temporary_tag, &build_id, &platform, progress)
            .await?;
        let resolution = self
            .resolve_built_image(
                &temporary_tag,
                &prepared.cache_tag,
                &request.platform,
                &platform,
                progress,
            )
            .await;
        let cleanup = self.remove_temporary_image(&temporary_tag, progress).await;
        let (manifest_digest, actual) = resolution?;
        cleanup?;

        Ok(image::ResolvedImage {
            source: request.source.clone(),
            platform: actual,
            manifest_digest,
        })
    }

    async fn check_docker(&self, progress: &SandboxProgress) -> Result<(), Error> {
        let started = Instant::now();
        let step = progress.start_step(CHECK_DOCKER).await;
        self.docker()?.ping().await.map_err(error::backend)?;
        step.complete(started.elapsed()).await;
        Ok(())
    }

    async fn prepare_context(
        source_context: &Path,
        source_dockerfile: &Path,
        platform: &sandbox::Platform,
        progress: &SandboxProgress,
    ) -> Result<PreparedBuild, Error> {
        let started = Instant::now();
        let step = progress.start_step(PREPARE_CONTEXT).await;
        let context = tokio::fs::canonicalize(source_context)
            .await
            .map_err(|source| error::io("resolve Docker build context", source))?;
        let dockerfile = tokio::fs::canonicalize(context.join(source_dockerfile))
            .await
            .map_err(|source| error::io("resolve Dockerfile", source))?;
        let relative_dockerfile = dockerfile
            .strip_prefix(&context)
            .map_err(|_| Error::invalid("image.dockerfile", "must stay within image.context"))?
            .to_path_buf();
        let dockerfile_parameter = archive_path(&relative_dockerfile)?;

        let cache_tag = cache_tag(&context, &dockerfile_parameter, platform);
        let archive = create_context_archive(context, relative_dockerfile).await?;
        step.complete(started.elapsed()).await;
        Ok(PreparedBuild {
            archive,
            dockerfile: dockerfile_parameter,
            cache_tag,
        })
    }

    async fn build_docker_image(
        &self,
        prepared: &PreparedBuild,
        temporary_tag: &str,
        build_id: &str,
        platform: &sandbox::Platform,
        progress: &SandboxProgress,
    ) -> Result<(), Error> {
        let context_file = tokio::fs::File::open(&prepared.archive)
            .await
            .map_err(|source| error::io("open Docker build context archive", source))?;
        let context_stream = FramedRead::new(context_file, BytesCodec::new())
            .map(|result| result.map(tokio_util::bytes::BytesMut::freeze));
        let options = BuildImageOptionsBuilder::default()
            .dockerfile(&prepared.dockerfile)
            .t(temporary_tag)
            .platform(&platform.to_string())
            .version(BuilderVersion::BuilderBuildKit)
            .session(build_id)
            .rm(true)
            .forcerm(true)
            .build();

        let started = Instant::now();
        let step = progress.start_step(BUILD_IMAGE).await;
        let mut completed_vertices = HashSet::new();
        let mut responses = self
            .docker()?
            .build_image(options, None, Some(bollard::body_try_stream(context_stream)));
        while let Some(response) = responses.next().await {
            let response = response.map_err(error::backend)?;
            if let Some(detail) = response.error_detail {
                return Err(Error::Backend(
                    detail
                        .message
                        .unwrap_or_else(|| "Docker image build failed".to_string()),
                ));
            }
            if let Some(stream) = response.stream {
                step.output(OutputStream::Stdout, stream).await;
            }
            if let Some(status) = response.status {
                let output = response.id.map_or_else(
                    || format!("{status}\n"),
                    |identifier| format!("{identifier}: {status}\n"),
                );
                step.output(OutputStream::Stdout, output).await;
            }
            if let Some(detail) = response.progress_detail
                && let Some(completed) = detail.current.and_then(|value| u64::try_from(value).ok())
            {
                let total = detail.total.and_then(|value| u64::try_from(value).ok());
                step.progress(completed, total, ProgressUnit::Bytes).await;
            }
            if let Some(aux) = response.aux {
                report_buildkit_status(&step, &mut completed_vertices, aux).await?;
            }
        }
        step.complete(started.elapsed()).await;
        Ok(())
    }

    async fn resolve_built_image(
        &self,
        temporary_tag: &str,
        cache_tag: &str,
        requested: &sandbox::Platform,
        platform: &sandbox::Platform,
        progress: &SandboxProgress,
    ) -> Result<(String, sandbox::Platform), Error> {
        let started = Instant::now();
        let step = progress.start_step(RETAIN_BUILD_CACHE).await;
        self.retain_build_cache(temporary_tag, cache_tag).await?;
        step.complete(started.elapsed()).await;

        let import_reference = self.import_cache_reference(temporary_tag).await?;
        if let Some(resolved) = self
            .cached_import(&import_reference, requested, platform, progress)
            .await?
        {
            return Ok(resolved);
        }

        let image_archive = self.export_image_observed(temporary_tag, progress).await?;
        self.import_image(&image_archive, &import_reference, requested, platform, progress)
            .await
    }

    async fn export_image_observed(
        &self,
        temporary_tag: &str,
        progress: &SandboxProgress,
    ) -> Result<tempfile::TempPath, Error> {
        let started = Instant::now();
        let step = progress.start_step(EXPORT_IMAGE).await;
        let archive = self.export_image(temporary_tag, &step).await?;
        step.complete(started.elapsed()).await;
        Ok(archive)
    }

    async fn remove_temporary_image(&self, temporary_tag: &str, progress: &SandboxProgress) -> Result<(), Error> {
        let started = Instant::now();
        let step = progress.start_step(REMOVE_TEMPORARY_IMAGE).await;
        self.docker()?
            .remove_image(
                temporary_tag,
                None::<bollard::query_parameters::RemoveImageOptions>,
                None,
            )
            .await
            .map_err(error::backend)?;
        step.complete(started.elapsed()).await;
        Ok(())
    }

    async fn retain_build_cache(&self, image: &str, cache_tag: &str) -> Result<(), Error> {
        let (repository, tag) = cache_tag
            .split_once(':')
            .ok_or(Error::invalid("image.cacheTag", "must contain a repository and tag"))?;
        self.docker()?
            .tag_image(
                image,
                Some(TagImageOptionsBuilder::default().repo(repository).tag(tag).build()),
            )
            .await
            .map_err(error::backend)
    }

    async fn import_cache_reference(&self, image: &str) -> Result<String, Error> {
        let image_id = self
            .docker()?
            .inspect_image(image)
            .await
            .map_err(error::backend)?
            .id
            .ok_or_else(|| Error::Backend("Docker did not report the built image ID".to_string()))?;
        Ok(format!(
            "{IMPORT_CACHE_REPOSITORY}:docker-{}",
            lower_hex(&Sha256::digest(image_id.as_bytes()))
        ))
    }

    async fn cached_import(
        &self,
        reference: &str,
        requested: &sandbox::Platform,
        platform: &sandbox::Platform,
        progress: &SandboxProgress,
    ) -> Result<Option<(String, sandbox::Platform)>, Error> {
        let started = Instant::now();
        let step = progress.start_step(LOOKUP_IMPORTED_IMAGE).await;
        let handle = match microsandbox::Image::get_local(self.client.local(), reference).await {
            Ok(handle) => Some(handle),
            Err(microsandbox::MicrosandboxError::ImageNotFound(_)) => None,
            Err(failure) => return Err(error::microsandbox(failure)),
        };
        step.complete(started.elapsed()).await;
        handle
            .map(|handle| resolve_image_handle(&handle, requested, platform))
            .transpose()
    }

    async fn import_image(
        &self,
        image_archive: &Path,
        import_reference: &str,
        requested: &sandbox::Platform,
        platform: &sandbox::Platform,
        progress: &SandboxProgress,
    ) -> Result<(String, sandbox::Platform), Error> {
        let started = Instant::now();
        let step = progress.start_step(IMPORT_IMAGE).await;
        let (mut import_events, import_progress) = microsandbox_image::progress_channel();
        let cache_dir = self.client.local().cache_dir();
        let load = microsandbox_image::load_archive(
            &cache_dir,
            image_archive,
            microsandbox_image::ImageLoadOptions {
                tags: vec![import_reference.to_string()],
                progress: Some(import_progress),
            },
        );
        let report = async {
            while let Some(event) = import_events.recv().await {
                report_image_progress(&step, event).await;
            }
        };
        let (loaded, ()) = tokio::join!(load, report);
        let loaded = loaded.map_err(error::backend)?;
        let image = loaded
            .into_iter()
            .find(|image| image.reference == import_reference)
            .ok_or_else(|| Error::Backend(format!("Microsandbox did not return imported image {import_reference}")))?;
        microsandbox::Image::persist(self.client.local(), &image.reference, image.metadata)
            .await
            .map_err(error::microsandbox)?;
        let handle = microsandbox::Image::get_local(self.client.local(), &image.reference)
            .await
            .map_err(error::microsandbox)?;
        let resolved = resolve_image_handle(&handle, requested, platform)?;
        step.complete(started.elapsed()).await;
        Ok(resolved)
    }

    async fn export_image(&self, reference: &str, step: &ProgressStep) -> Result<tempfile::TempPath, Error> {
        let archive = tempfile::NamedTempFile::new()
            .map_err(|source| error::io("create Docker image archive", source))?
            .into_temp_path();
        let mut file = tokio::fs::File::create(&archive)
            .await
            .map_err(|source| error::io("open Docker image archive", source))?;
        let mut chunks = self.docker()?.export_image(reference);
        let mut written = 0_u64;
        let mut reported = 0_u64;
        while let Some(chunk) = chunks.next().await {
            let chunk = chunk.map_err(error::backend)?;
            let chunk_length = u64::try_from(chunk.len())
                .map_err(|_| Error::Backend("Docker image export exceeded the supported size".to_string()))?;
            file.write_all(&chunk)
                .await
                .map_err(|source| error::io("write Docker image archive", source))?;
            written = written.saturating_add(chunk_length);
            if written.saturating_sub(reported) >= EXPORT_PROGRESS_INTERVAL {
                step.progress(written, None, ProgressUnit::Bytes).await;
                reported = written;
            }
        }
        step.progress(written, Some(written), ProgressUnit::Bytes).await;
        file.sync_all()
            .await
            .map_err(|source| error::io("sync Docker image archive", source))?;
        Ok(archive)
    }

    async fn resolve_reference(
        &self,
        request: &image::ResolveRequest,
        reference: &str,
        progress: &SandboxProgress,
    ) -> Result<image::ResolvedImage, Error> {
        let fallback = platform::require_supported(&request.platform)?;
        let parsed: microsandbox_image::Reference = reference
            .parse()
            .map_err(|failure| Error::Backend(format!("invalid OCI image reference '{reference}': {failure}")))?;
        let started = Instant::now();
        let step = progress.start_step(PULL_IMAGE).await;
        let cache = microsandbox_image::GlobalCache::new(&self.client.local().cache_dir()).map_err(error::backend)?;
        let options = microsandbox_image::PullOptions {
            pull_policy: reference_pull_policy(&parsed),
            force: false,
            materialization: match request.root_filesystem_mode {
                RootFilesystemMode::Layered => microsandbox_image::RootfsMaterialization::Layered,
                RootFilesystemMode::Direct => microsandbox_image::RootfsMaterialization::Flat,
                mode => {
                    return Err(Error::UnsupportedImageRootFilesystemMode {
                        operation: image::ImageOperation::Resolve,
                        mode,
                    });
                }
            },
        };

        let metadata = if let Some((_, metadata)) =
            microsandbox_image::Registry::pull_cached(&cache, &parsed, &options).map_err(error::backend)?
        {
            metadata
        } else {
            let config = self.client.local().config();
            let authentication = match &self.registry_authentication {
                Some(sandbox::image::RegistryAuthentication::Anonymous) => microsandbox_image::RegistryAuth::Anonymous,
                Some(sandbox::image::RegistryAuthentication::Basic { username, password }) => {
                    microsandbox_image::RegistryAuth::Basic {
                        username: username.clone(),
                        password: password.clone(),
                    }
                }
                None => config
                    .resolve_registry_auth(parsed.registry())
                    .map_err(error::microsandbox)?,
            };
            let registry =
                microsandbox_image::Registry::builder(microsandbox_image::Platform::host_linux(), cache.clone())
                    .auth(authentication)
                    .extra_ca_certs(config.resolve_ca_certs().await.map_err(error::microsandbox)?)
                    .add_insecure_registries(config.insecure_registries())
                    .build()
                    .map_err(error::backend)?;
            let (mut events, sender) = microsandbox_image::progress_channel();
            let pull = registry.pull_with_sender(&parsed, &options, sender);
            let report = async {
                while let Some(event) = events.recv().await {
                    report_image_progress(&step, event).await;
                }
            };
            let (result, ()) = tokio::join!(pull, report);
            result.map_err(error::backend)?.map_err(error::backend)?;
            cache
                .read_image_metadata(&parsed)
                .map_err(error::backend)?
                .ok_or_else(|| Error::Backend("Microsandbox did not retain pulled image metadata".to_string()))?
        };

        microsandbox::Image::persist(self.client.local(), reference, metadata)
            .await
            .map_err(error::microsandbox)?;
        let handle = microsandbox::Image::get_local(self.client.local(), reference)
            .await
            .map_err(error::microsandbox)?;
        let (manifest_digest, actual) = resolve_image_handle(&handle, &request.platform, &fallback)?;
        step.complete(started.elapsed()).await;
        Ok(image::ResolvedImage {
            source: request.source.clone(),
            platform: actual,
            manifest_digest,
        })
    }

    async fn export_prepared_root(
        &self,
        request: &image::ResolveRequest,
        destination: &Path,
        progress: &SandboxProgress,
    ) -> Result<image::PreparedImage, Error> {
        let operation = image::ImageOperation::PreparedImageExport;
        require_direct_prepared_root(request, operation)?;
        let reference = prepared_root_reference(request, operation)?;
        let resolved = self
            .resolve_reference(request, &reference.to_string(), progress)
            .await?;
        let cache = microsandbox_image::GlobalCache::new(&self.client.local().cache_dir()).map_err(error::backend)?;
        let started = Instant::now();
        let step = progress.start_step(EXPORT_PREPARED_ROOT).await;
        let prepared = microsandbox_image::export_prepared_root(
            &cache,
            &reference,
            &microsandbox_image::Platform::host_linux(),
            destination,
        )
        .await
        .map_err(error::backend)?;
        step.complete(started.elapsed()).await;
        Ok(prepared_root(resolved, &prepared))
    }

    async fn import_prepared_root(
        &self,
        request: &image::ResolveRequest,
        source: &Path,
        progress: &SandboxProgress,
    ) -> Result<image::PreparedImage, Error> {
        let operation = image::ImageOperation::PreparedImageImport;
        require_direct_prepared_root(request, operation)?;
        let actual = platform::require_supported(&request.platform)?;
        let reference = prepared_root_reference(request, operation)?;
        let cache = microsandbox_image::GlobalCache::new(&self.client.local().cache_dir()).map_err(error::backend)?;
        let started = Instant::now();
        let step = progress.start_step(IMPORT_PREPARED_ROOT).await;
        let prepared = microsandbox_image::import_prepared_root(
            &cache,
            &reference,
            &microsandbox_image::Platform::host_linux(),
            source,
        )
        .await
        .map_err(error::backend)?;
        step.complete(started.elapsed()).await;
        Ok(prepared_root(
            image::ResolvedImage {
                source: request.source.clone(),
                platform: actual,
                manifest_digest: prepared.image.manifest_digest.clone(),
            },
            &prepared,
        ))
    }
}

fn require_direct_prepared_root(
    request: &image::ResolveRequest,
    operation: image::ImageOperation,
) -> Result<(), Error> {
    if request.root_filesystem_mode == RootFilesystemMode::Direct {
        Ok(())
    } else {
        Err(Error::UnsupportedImageRootFilesystemMode {
            operation,
            mode: request.root_filesystem_mode,
        })
    }
}

fn reference_pull_policy(reference: &microsandbox_image::Reference) -> microsandbox_image::PullPolicy {
    if reference.digest().is_some() {
        microsandbox_image::PullPolicy::IfMissing
    } else {
        // A tag is mutable. Refresh its manifest when creating a Sandbox while
        // retaining content-addressed layers and rootfs artifacts in the cache.
        microsandbox_image::PullPolicy::Always
    }
}

fn prepared_root_reference(
    request: &image::ResolveRequest,
    operation: image::ImageOperation,
) -> Result<microsandbox_image::Reference, Error> {
    let image::ImageSource::Reference { reference } = &request.source else {
        return Err(Error::UnsupportedImageSourceKind {
            operation,
            source_kind: request.source.kind(),
        });
    };
    let reference = reference
        .parse::<microsandbox_image::Reference>()
        .map_err(error::backend)?;
    if reference.digest().is_none() {
        return Err(Error::invalid(
            "image.reference",
            "prepared roots require an immutable digest-pinned OCI reference",
        ));
    }
    Ok(reference)
}

fn prepared_root(
    image: image::ResolvedImage,
    prepared: &microsandbox_image::PreparedRootMetadata,
) -> image::PreparedImage {
    image::PreparedImage {
        image,
        root_filesystem_mode: RootFilesystemMode::Direct,
        artifact_digest: prepared.root.artifact_digest.clone(),
        virtual_size_bytes: prepared.root.virtual_size_bytes,
    }
}

struct PreparedBuild {
    archive: tempfile::TempPath,
    dockerfile: String,
    cache_tag: String,
}

fn cache_tag(context: &Path, dockerfile: &str, platform: &sandbox::Platform) -> String {
    let mut digest = Sha256::new();
    let platform = platform.to_string();
    for component in [
        context.as_os_str().as_encoded_bytes(),
        dockerfile.as_bytes(),
        platform.as_bytes(),
    ] {
        digest.update(component);
        digest.update([0]);
    }
    format!("{CACHE_REPOSITORY}:{}", lower_hex(&digest.finalize()))
}

fn resolve_image_handle(
    handle: &microsandbox::ImageHandle,
    requested: &sandbox::Platform,
    fallback: &sandbox::Platform,
) -> Result<(String, sandbox::Platform), Error> {
    let manifest_digest = handle
        .manifest_digest()
        .ok_or_else(|| Error::Backend("Microsandbox did not report the image manifest digest".to_string()))?
        .to_string();
    let actual = sandbox::Platform::new(
        handle.os().unwrap_or(fallback.os.as_str()),
        handle.architecture().unwrap_or(fallback.architecture.as_str()),
    );
    if !actual.satisfies(requested) {
        return Err(Error::ImagePlatformMismatch {
            requested: Box::new(requested.clone()),
            actual: Box::new(actual),
        });
    }
    Ok((manifest_digest, actual))
}

async fn report_buildkit_status(
    step: &ProgressStep,
    completed_vertices: &mut HashSet<String>,
    aux: bollard::models::BuildInfoAux,
) -> Result<(), Error> {
    let bollard::models::BuildInfoAux::BuildKit(status) = aux else {
        return Ok(());
    };
    for vertex in status.vertexes {
        if !vertex.error.is_empty() {
            return Err(Error::Backend(vertex.error));
        }
        if vertex.completed.is_some() && completed_vertices.insert(vertex.digest) {
            let outcome = if vertex.cached { "CACHED" } else { "DONE" };
            step.output(OutputStream::Stdout, format!("{outcome} {}\n", vertex.name))
                .await;
        }
    }
    for log in status.logs {
        let stream = if log.stream == 2 {
            OutputStream::Stderr
        } else {
            OutputStream::Stdout
        };
        step.output(stream, log.msg).await;
    }
    for warning in status.warnings {
        let mut message = warning.short;
        for detail in warning.detail {
            message.extend_from_slice(b"\n");
            message.extend(detail);
        }
        message.extend_from_slice(b"\n");
        step.output(OutputStream::Stderr, message).await;
    }
    Ok(())
}

async fn report_image_progress(step: &ProgressStep, event: microsandbox_image::PullProgress) {
    match event {
        microsandbox_image::PullProgress::Resolved { layer_count, .. } => {
            step.progress(0, u64::try_from(layer_count).ok(), ProgressUnit::Items)
                .await;
        }
        microsandbox_image::PullProgress::LayerMaterializeProgress {
            bytes_read,
            total_bytes,
            ..
        } => {
            step.progress(bytes_read, Some(total_bytes), ProgressUnit::Bytes).await;
        }
        microsandbox_image::PullProgress::LayerMaterializeComplete { layer_index, .. } => {
            step.progress(
                u64::try_from(layer_index.saturating_add(1)).unwrap_or(u64::MAX),
                None,
                ProgressUnit::Items,
            )
            .await;
        }
        microsandbox_image::PullProgress::Complete { layer_count, .. } => {
            let completed = u64::try_from(layer_count).unwrap_or(u64::MAX);
            step.progress(completed, Some(completed), ProgressUnit::Items).await;
        }
        microsandbox_image::PullProgress::Resolving { .. }
        | microsandbox_image::PullProgress::LayerDownloadProgress { .. }
        | microsandbox_image::PullProgress::LayerDownloadComplete { .. }
        | microsandbox_image::PullProgress::LayerDownloadVerifying { .. }
        | microsandbox_image::PullProgress::LayerMaterializeStarted { .. }
        | microsandbox_image::PullProgress::LayerMaterializeWriting { .. }
        | microsandbox_image::PullProgress::StitchMergingTrees { .. }
        | microsandbox_image::PullProgress::StitchWritingFsmeta
        | microsandbox_image::PullProgress::StitchWritingVmdk
        | microsandbox_image::PullProgress::StitchComplete => {}
    }
}

impl image::ImageBackend for MicrosandboxImageBackend {
    fn capabilities<'a>(
        &'a self,
        platform: &'a sandbox::Platform,
    ) -> LocalFuture<'a, Result<image::ImageBackendCapabilities, Error>> {
        Box::pin(async move {
            platform::require_supported(platform)?;
            // TODO: Add prepared-image transport for Microsandbox's layered
            // EROFS/VMDK representation. The current artifact format packages
            // only the flat ext4 representation used by direct roots.
            let prepared = image::ImageOperationCapabilities::new(
                [image::ImageSourceKind::Reference].into(),
                [RootFilesystemMode::Direct].into(),
            );
            Ok(image::ImageBackendCapabilities::new(
                image::ImageOperationCapabilities::new(
                    [image::ImageSourceKind::Build, image::ImageSourceKind::Reference].into(),
                    [RootFilesystemMode::Layered, RootFilesystemMode::Direct].into(),
                ),
                prepared.clone(),
                prepared,
            ))
        })
    }

    fn resolve<'a>(&'a self, request: &'a image::ResolveRequest) -> PendingOperation<'a, image::ResolvedImage> {
        PendingOperation::run(SandboxPhase::ImageResolve, move |progress| {
            Box::pin(async move {
                match &request.source {
                    image::ImageSource::Build { context, dockerfile } => {
                        self.build_image(request, context, dockerfile, &progress).await
                    }
                    image::ImageSource::Reference { reference } => {
                        self.resolve_reference(request, reference, &progress).await
                    }
                }
            })
        })
    }

    fn export_prepared_image<'a>(
        &'a self,
        request: &'a image::ResolveRequest,
        destination: &'a Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        PendingOperation::run(SandboxPhase::ImagePrepare, move |progress| {
            Box::pin(async move { self.export_prepared_root(request, destination, &progress).await })
        })
    }

    fn import_prepared_image<'a>(
        &'a self,
        request: &'a image::ResolveRequest,
        source: &'a Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        PendingOperation::run(SandboxPhase::ImagePrepare, move |progress| {
            Box::pin(async move { self.import_prepared_root(request, source, &progress).await })
        })
    }
}

async fn create_context_archive(context: PathBuf, dockerfile: PathBuf) -> Result<tempfile::TempPath, Error> {
    tokio::task::spawn_blocking(move || {
        let archive = tempfile::NamedTempFile::new()?;
        let path = archive.into_temp_path();
        let file = File::create(&path)?;
        let ignore = dockerignore(&context)?;
        let mut builder = tar::Builder::new(file);
        append_directory(&mut builder, &context, &context, &dockerfile, &ignore)?;
        builder.finish()?;
        Ok::<_, std::io::Error>(path)
    })
    .await
    .map_err(error::backend)?
    .map_err(|source| error::io("create Docker build context archive", source))
}

fn dockerignore(context: &Path) -> Result<Gitignore, std::io::Error> {
    let mut builder = GitignoreBuilder::new(context);
    let path = context.join(".dockerignore");
    if path.is_file()
        && let Some(source) = builder.add(path)
    {
        return Err(std::io::Error::other(source));
    }
    builder.build().map_err(std::io::Error::other)
}

fn append_directory(
    archive: &mut tar::Builder<File>,
    context: &Path,
    directory: &Path,
    dockerfile: &Path,
    ignore: &Gitignore,
) -> Result<(), std::io::Error> {
    let mut entries = std::fs::read_dir(directory)?.collect::<Result<Vec<_>, _>>()?;
    entries.sort_by_key(std::fs::DirEntry::file_name);

    for entry in entries {
        let path = entry.path();
        let relative = path.strip_prefix(context).map_err(std::io::Error::other)?;
        let metadata = std::fs::symlink_metadata(&path)?;
        let is_directory = metadata.is_dir();
        let forced = relative == dockerfile || relative == Path::new(".dockerignore");
        let excluded = ignore.matched_path_or_any_parents(relative, is_directory).is_ignore();

        if is_directory {
            if !excluded {
                archive.append_dir(relative, &path)?;
            }
            append_directory(archive, context, &path, dockerfile, ignore)?;
        } else if forced || !excluded {
            archive.append_path_with_name(&path, relative)?;
        }
    }
    Ok(())
}

fn archive_path(path: &Path) -> Result<String, Error> {
    path.to_str()
        .map(|value| value.replace('\\', "/"))
        .ok_or(Error::invalid("image.dockerfile", "must be valid Unicode"))
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use std::{fs, path::Path};

    #[test]
    fn mutable_references_refresh_registry_metadata_while_digest_pins_reuse_the_cache() {
        let tagged = "ghcr.io/altinn/agent:latest"
            .parse()
            .expect("tagged reference should parse");
        let pinned = format!("ghcr.io/altinn/agent@sha256:{}", "0".repeat(64))
            .parse()
            .expect("digest-pinned reference should parse");

        assert_eq!(
            super::reference_pull_policy(&tagged),
            microsandbox_image::PullPolicy::Always
        );
        assert_eq!(
            super::reference_pull_policy(&pinned),
            microsandbox_image::PullPolicy::IfMissing
        );
    }

    #[tokio::test(flavor = "local")]
    async fn context_archive_applies_dockerignore_and_keeps_build_inputs() {
        let context = tempfile::tempdir().expect("temporary context should be created");
        fs::create_dir(context.path().join("nested")).expect("nested directory should be created");
        fs::write(context.path().join("Dockerfile"), "FROM scratch\n").expect("Dockerfile should be written");
        fs::write(
            context.path().join(".dockerignore"),
            "Dockerfile\nignored.txt\nnested/*\n!nested/included.txt\n",
        )
        .expect("Dockerignore should be written");
        fs::write(context.path().join("included.txt"), "included").expect("included file should be written");
        fs::write(context.path().join("ignored.txt"), "ignored").expect("ignored file should be written");
        fs::write(context.path().join("nested/included.txt"), "included").expect("re-included file should be written");
        fs::write(context.path().join("nested/ignored.txt"), "ignored").expect("nested ignored file should be written");

        let archive =
            super::create_context_archive(context.path().to_path_buf(), Path::new("Dockerfile").to_path_buf())
                .await
                .expect("context archive should be created");
        let file = fs::File::open(archive).expect("context archive should open");
        let entries = tar::Archive::new(file)
            .entries()
            .expect("archive entries should be readable")
            .map(|entry| {
                entry
                    .expect("archive entry should be readable")
                    .path()
                    .expect("archive path should be readable")
                    .into_owned()
            })
            .collect::<Vec<_>>();

        assert!(entries.contains(&Path::new("Dockerfile").to_path_buf()));
        assert!(entries.contains(&Path::new(".dockerignore").to_path_buf()));
        assert!(entries.contains(&Path::new("included.txt").to_path_buf()));
        assert!(entries.contains(&Path::new("nested/included.txt").to_path_buf()));
        assert!(!entries.contains(&Path::new("ignored.txt").to_path_buf()));
        assert!(!entries.contains(&Path::new("nested/ignored.txt").to_path_buf()));
    }

    #[test]
    fn dockerfile_paths_use_archive_separators() {
        assert_eq!(
            super::archive_path(Path::new("nested\\Dockerfile")).expect("path should be valid"),
            "nested/Dockerfile"
        );
    }

    #[test]
    fn docker_cache_tags_are_stable_per_source_and_platform() {
        let context = Path::new("/workspace/project");
        let platform = sandbox::Platform::new("linux", "amd64");
        let tag = super::cache_tag(context, "Dockerfile", &platform);

        assert_eq!(tag, super::cache_tag(context, "Dockerfile", &platform));
        assert_ne!(
            tag,
            super::cache_tag(Path::new("/workspace/other"), "Dockerfile", &platform)
        );
        assert_ne!(tag, super::cache_tag(context, "nested/Dockerfile", &platform));
        assert_ne!(
            tag,
            super::cache_tag(context, "Dockerfile", &sandbox::Platform::new("linux", "arm64"))
        );
    }
}
