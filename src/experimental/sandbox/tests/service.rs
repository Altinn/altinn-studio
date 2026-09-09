#![allow(clippy::expect_used)]

use std::{future::poll_fn, io::Cursor, path::PathBuf, pin::Pin, rc::Rc};

use bytes::Bytes;
use futures_core::Stream as _;
use sandbox::{
    ByteQuantity, CpuQuantity, EnsureSandboxRequest, Error, OperationEvent, PendingOperation, Platform,
    RetentionPolicy, RootFilesystem, RootFilesystemMode, SandboxEvent, SandboxFeature, SandboxName, SandboxPath,
    SandboxPhase, SandboxResources, SandboxService, SandboxSpec,
    execution::{ExecutionEvent, ExecutionSpec, ExitStatus, StartExecutionRequest},
    image::{self, ImageSource},
    memory,
    network::{NetworkAttachment, NetworkBackend as _, NetworkBackendId, NetworkEndpointSelection, PacketMedium},
    terminal::{StartTerminalExecutionRequest, TerminalEvent, TerminalSize},
    volume::{EnsureVolumeRequest, VolumeName},
};
use tokio::io::AsyncReadExt as _;

fn spec() -> SandboxSpec {
    SandboxSpec {
        image: ImageSource::Build {
            context: PathBuf::from("."),
            dockerfile: PathBuf::from("Dockerfile"),
        },
        platform: Platform::native("linux"),
        resources: resources("2", "1Gi", "4Gi"),
        init_system: sandbox::init::InitSystem::Backend,
        retention_policy: RetentionPolicy::Retain,
    }
}

fn request() -> EnsureSandboxRequest {
    EnsureSandboxRequest::new(sandbox_name(), spec())
}

fn sandbox_name() -> SandboxName {
    SandboxName::new("worker").expect("test Sandbox name should be valid")
}

fn resources(cpu: &str, memory: &str, root_filesystem: &str) -> SandboxResources {
    SandboxResources::new(
        cpu.parse::<CpuQuantity>().expect("test CPU should be valid"),
        memory.parse::<ByteQuantity>().expect("test memory should be valid"),
        RootFilesystem::layered(
            root_filesystem
                .parse::<ByteQuantity>()
                .expect("test root filesystem should be valid"),
        ),
    )
}

#[tokio::test(flavor = "local")]
async fn ensure_is_idempotent_and_runs_one_sandbox() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend.clone());
    let request = request();

    let first = service.ensure(&request).await.expect("first ensure");
    let second = service.ensure(&request).await.expect("second ensure");

    assert_eq!(first.snapshot(), second.snapshot());
    assert!(first.snapshot().network.is_none());
    assert_eq!(backend.count(), 1);
}

#[tokio::test(flavor = "local")]
async fn component_errors_preserve_stable_kind_and_resource_identity() {
    let service = SandboxService::new(Rc::new(memory::Provider::new()));
    let name = SandboxName::new("missing").expect("test Sandbox name should be valid");

    let error = service.inspect(&name).await.expect_err("Sandbox should be absent");

    assert_eq!(error.kind(), sandbox::ErrorKind::NotFound);
    assert_eq!(
        error.not_found_target(),
        Some((sandbox::ResourceKind::Sandbox, "missing"))
    );
}

#[tokio::test(flavor = "local")]
async fn capabilities_describe_the_configured_consumer_surface() {
    let platform = Platform::native("linux");
    let without_network = SandboxService::new(Rc::new(memory::Provider::new()))
        .capabilities(&platform)
        .await
        .expect("Provider capabilities should be available");
    assert!(without_network.features().contains(SandboxFeature::Execution));
    assert!(without_network.prepared_image_export().sources.iter().next().is_none());
    assert!(without_network.prepared_image_import().sources.iter().next().is_none());
    assert!(!without_network.network_available());

    let with_network = SandboxService::new(Rc::new(memory::Provider::new())).with_network_backend(Rc::new(
        memory::NetworkBackend::for_endpoint("network-a", NetworkEndpointSelection::Packet(PacketMedium::Ethernet)),
    ));
    assert!(
        with_network
            .capabilities(&platform)
            .await
            .expect("compatible Network should be discoverable")
            .network_available()
    );
}

#[tokio::test(flavor = "local")]
async fn memory_provider_rejects_prepared_image_transport_with_typed_errors() {
    let service = SandboxService::new(Rc::new(memory::Provider::new()));
    let spec = spec();
    let request = image::ResolveRequest {
        source: spec.image,
        platform: spec.platform,
        root_filesystem_mode: spec.resources.root_filesystem().mode(),
    };

    let export_error = service
        .export_prepared_image(&request, std::path::Path::new("unused"))
        .await
        .expect_err("memory Image Backend should not export prepared images");
    assert!(matches!(
        export_error,
        Error::UnsupportedImageOperation(image::ImageOperation::PreparedImageExport)
    ));

    let import_error = service
        .import_prepared_image(&request, std::path::Path::new("unused"))
        .await
        .expect_err("memory Image Backend should not import prepared images");
    assert!(matches!(
        import_error,
        Error::UnsupportedImageOperation(image::ImageOperation::PreparedImageImport)
    ));
}

struct PreparedImageBackend {
    prepared: image::PreparedImage,
}

impl image::ImageBackend for PreparedImageBackend {
    fn capabilities<'a>(
        &'a self,
        _platform: &'a Platform,
    ) -> sandbox::LocalFuture<'a, Result<image::ImageBackendCapabilities, Error>> {
        Box::pin(async {
            let operation = image::ImageOperationCapabilities::new(
                [image::ImageSourceKind::Build].into(),
                [RootFilesystemMode::Layered].into(),
            );
            Ok(image::ImageBackendCapabilities::new(
                operation.clone(),
                operation.clone(),
                operation,
            ))
        })
    }

    fn resolve<'a>(&'a self, _request: &'a image::ResolveRequest) -> PendingOperation<'a, image::ResolvedImage> {
        let image = self.prepared.image.clone();
        PendingOperation::run(SandboxPhase::ImageResolve, move |_progress| {
            Box::pin(async move { Ok(image) })
        })
    }

    fn export_prepared_image<'a>(
        &'a self,
        _request: &'a image::ResolveRequest,
        _destination: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        completed_prepared_image(self.prepared.clone())
    }

    fn import_prepared_image<'a>(
        &'a self,
        _request: &'a image::ResolveRequest,
        _source: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        completed_prepared_image(self.prepared.clone())
    }
}

fn completed_prepared_image(prepared: image::PreparedImage) -> PendingOperation<'static, image::PreparedImage> {
    PendingOperation::run(SandboxPhase::ImagePrepare, move |_progress| {
        Box::pin(async move { Ok(prepared) })
    })
}

struct PreparedImageProvider {
    sandbox_backend: memory::Provider,
    image_backend: PreparedImageBackend,
}

impl sandbox::provider::SandboxProvider for PreparedImageProvider {
    fn backend(&self) -> &dyn sandbox::backend::SandboxBackend {
        &self.sandbox_backend
    }

    fn image_backend(&self) -> &dyn image::ImageBackend {
        &self.image_backend
    }
}

#[tokio::test(flavor = "local")]
async fn service_accepts_prepared_image_metadata_coherent_with_the_request() {
    let spec = spec();
    let request = image::ResolveRequest {
        source: spec.image,
        platform: spec.platform,
        root_filesystem_mode: spec.resources.root_filesystem().mode(),
    };
    let prepared = image::PreparedImage {
        image: image::ResolvedImage {
            source: request.source.clone(),
            platform: request.platform.clone(),
            manifest_digest: "sha256:resolved-oci-manifest".into(),
        },
        root_filesystem_mode: request.root_filesystem_mode,
        artifact_digest: "sha256:opaque-artifact".into(),
        virtual_size_bytes: 4096,
    };
    let service = SandboxService::new(Rc::new(PreparedImageProvider {
        sandbox_backend: memory::Provider::new(),
        image_backend: PreparedImageBackend {
            prepared: prepared.clone(),
        },
    }));

    let exported = service
        .export_prepared_image(&request, std::path::Path::new("unused"))
        .await
        .expect("coherent exported metadata should be accepted");
    let imported = service
        .import_prepared_image(&request, std::path::Path::new("unused"))
        .await
        .expect("coherent imported metadata should be accepted");

    assert_eq!(exported, prepared);
    assert_eq!(imported, prepared);
}

#[tokio::test(flavor = "local")]
async fn ensure_stream_yields_progress_then_exactly_one_ready_sandbox() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend);
    let request = request();
    let mut pending = service.ensure(&request);
    let mut events = Vec::new();

    loop {
        let event = poll_fn(|context| Pin::new(&mut pending).poll_next(context))
            .await
            .expect("provisioning should produce a terminal event")
            .expect("provisioning should succeed");
        let ready = matches!(event, OperationEvent::Ready(_));
        events.push(event);
        if ready {
            break;
        }
    }

    assert!(matches!(
        events.first(),
        Some(OperationEvent::Progress(SandboxEvent::PhaseStarted {
            phase: SandboxPhase::Validate
        }))
    ));
    assert!(events.iter().any(|event| {
        matches!(
            event,
            OperationEvent::Progress(SandboxEvent::PhaseStarted {
                phase: SandboxPhase::ImageResolve
            })
        )
    }));
    assert!(matches!(events.last(), Some(OperationEvent::Ready(_))));
    assert!(
        poll_fn(|context| Pin::new(&mut pending).poll_next(context))
            .await
            .is_none()
    );
}

#[tokio::test(flavor = "local")]
async fn ensure_stream_yields_exactly_one_terminal_error() {
    let backend = Rc::new(memory::Provider::with_platforms(Platform::new("linux", "amd64"), []));
    let service = SandboxService::new(backend);
    let mut request = request();
    request.spec_mut().platform = Platform::new("windows", "amd64");
    let mut pending = service.ensure(&request);

    let error = loop {
        let event = poll_fn(|context| Pin::new(&mut pending).poll_next(context))
            .await
            .expect("provisioning should produce a terminal event");
        if let Err(error) = event {
            break error;
        }
    };

    assert!(matches!(
        error,
        Error::Component { source, .. } if matches!(*source, Error::UnsupportedPlatform(_))
    ));
    assert!(
        poll_fn(|context| Pin::new(&mut pending).poll_next(context))
            .await
            .is_none()
    );
}

#[tokio::test(flavor = "local")]
async fn independent_network_backend_follows_the_sandbox_lifecycle() {
    let sandbox_backend = Rc::new(memory::Provider::new());
    let network_backend = Rc::new(memory::NetworkBackend::for_endpoint(
        "network-a",
        NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
    ));
    let service = SandboxService::new(sandbox_backend.clone()).with_network_backend(network_backend.clone());
    let request = request();

    let sandbox = service.ensure(&request).await.expect("create attached Sandbox");
    assert_eq!(
        sandbox.snapshot().network,
        Some(NetworkAttachment {
            backend: NetworkBackendId::new("network-a"),
            endpoint: NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
        })
    );
    assert!(network_backend.is_attached(sandbox.id()));
    assert!(network_backend.is_running(sandbox.id()));

    service
        .release(request.name(), RetentionPolicy::Retain)
        .await
        .expect("retain attached Sandbox");
    assert!(network_backend.is_attached(sandbox.id()));
    assert!(!network_backend.is_running(sandbox.id()));

    let adopted = service.ensure(&request).await.expect("reconnect retained Network");
    assert_eq!(adopted.id(), sandbox.id());
    assert!(network_backend.is_running(sandbox.id()));

    let other_network = Rc::new(memory::NetworkBackend::for_endpoint(
        "network-b",
        NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
    ));
    let incompatible_service = SandboxService::new(sandbox_backend).with_network_backend(other_network);
    let error = incompatible_service
        .ensure(&request)
        .await
        .expect_err("Network Backend attachment should be immutable");
    assert!(matches!(error, Error::Immutable("network")));

    service.delete(request.name()).await.expect("delete attached Sandbox");
    assert!(!network_backend.is_attached(sandbox.id()));
    assert!(!network_backend.is_running(sandbox.id()));
}

#[tokio::test(flavor = "local")]
async fn endpoint_negotiation_rejects_an_incompatible_network_backend() {
    let sandbox_backend = Rc::new(memory::Provider::new());
    let network_backend = Rc::new(memory::NetworkBackend::for_endpoint(
        "intercepted",
        NetworkEndpointSelection::Intercepted,
    ));
    let service = SandboxService::new(sandbox_backend).with_network_backend(network_backend);

    let error = service
        .ensure(&request())
        .await
        .expect_err("memory Sandbox Backend offers only packet endpoints");

    assert!(matches!(error, Error::NetworkEndpointUnavailable(_)));
}

#[tokio::test(flavor = "local")]
async fn endpoint_negotiation_is_not_coupled_to_ethernet() {
    let sandbox_backend = Rc::new(memory::Provider::new());
    let network_backend = Rc::new(memory::NetworkBackend::for_endpoint(
        "ip-network",
        NetworkEndpointSelection::Packet(PacketMedium::Ip),
    ));
    let service = SandboxService::new(sandbox_backend).with_network_backend(network_backend);

    let sandbox = service
        .ensure(&request())
        .await
        .expect("IP endpoint should be compatible");

    assert_eq!(
        sandbox.snapshot().network,
        Some(NetworkAttachment {
            backend: NetworkBackendId::new("ip-network"),
            endpoint: NetworkEndpointSelection::Packet(PacketMedium::Ip),
        })
    );
}

#[tokio::test(flavor = "local")]
async fn image_is_immutable_after_materialization() {
    let service = SandboxService::new(Rc::new(memory::Provider::new()));
    let mut request = request();
    let _ = service.ensure(&request).await.expect("first ensure");
    request.spec_mut().image = ImageSource::Reference {
        reference: "example.test/other:latest".to_string(),
    };

    let error = service.ensure(&request).await.expect_err("image change should fail");
    assert!(matches!(error, Error::Immutable("image")));
}

#[tokio::test(flavor = "local")]
async fn ensure_reconciles_mutable_resources() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend);
    let mut request = request();
    let first = service.ensure(&request).await.expect("first ensure");
    request.spec_mut().resources = resources("4", "2Gi", "8Gi");

    let updated = service.ensure(&request).await.expect("resource update");

    assert_eq!(updated.id(), first.id());
    assert_eq!(updated.snapshot().resources, request.spec().resources);
}

#[tokio::test(flavor = "local")]
async fn ensure_reconciles_environment_by_restarting_the_sandbox_and_network() {
    let backend = Rc::new(memory::Provider::new());
    let network = Rc::new(memory::NetworkBackend::for_endpoint(
        "network-a",
        NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
    ));
    let service = SandboxService::new(backend).with_network_backend(network.clone());
    let first_request = request().with_environment([("API_TOKEN".into(), "placeholder-one".into())]);
    let first = service.ensure(&first_request).await.expect("first ensure");

    let second_request = request().with_environment([("API_TOKEN".into(), "placeholder-two".into())]);
    let updated = service.ensure(&second_request).await.expect("environment update");

    assert_eq!(updated.id(), first.id());
    assert_eq!(updated.snapshot().state, sandbox::SandboxState::Running);
    assert_eq!(updated.snapshot().environment, second_request.environment().clone());
    assert!(network.is_running(updated.id()));
}

#[tokio::test(flavor = "local")]
async fn ensure_rejects_invalid_environment_before_materialization() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend.clone());
    let request = request().with_environment([("NOT-AN-ENV".into(), "placeholder".into())]);

    let error = service
        .ensure(&request)
        .await
        .expect_err("invalid environment should fail at the SDK boundary");

    assert!(matches!(
        error,
        Error::Invalid {
            field: "environment",
            ..
        }
    ));
    assert_eq!(backend.count(), 0);
}

#[tokio::test(flavor = "local")]
async fn root_filesystem_mode_is_immutable() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend);
    let mut request = request();
    let _ = service.ensure(&request).await.expect("first ensure");
    request.spec_mut().resources = SandboxResources::new(
        request.spec().resources.cpu(),
        request.spec().resources.memory(),
        sandbox::RootFilesystem::direct(request.spec().resources.root_filesystem().capacity()),
    );

    let error = service
        .ensure(&request)
        .await
        .expect_err("root filesystem mode change should fail");

    assert!(matches!(error, Error::Immutable("resources.rootFilesystem.mode")));
}

#[tokio::test(flavor = "local")]
async fn release_retains_by_default_and_delete_is_idempotent() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend.clone());
    let request = request();
    let first = service.ensure(&request).await.expect("ensure");

    service
        .release(request.name(), RetentionPolicy::Retain)
        .await
        .expect("retain");
    let adopted = service.ensure(&request).await.expect("re-adopt");
    assert_eq!(first.id(), adopted.id());

    service.delete(request.name()).await.expect("delete");
    service.delete(request.name()).await.expect("idempotent delete");
    assert_eq!(backend.count(), 0);
}

#[tokio::test(flavor = "local")]
async fn recreating_a_name_assigns_a_new_backend_neutral_id() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend);
    let request = request();
    let first = service.ensure(&request).await.expect("first materialization");

    service
        .delete(request.name())
        .await
        .expect("delete first materialization");
    let second = service.ensure(&request).await.expect("second materialization");

    assert_ne!(first.id(), second.id());
    assert_eq!(first.name(), second.name());
    assert_eq!(first.id().as_uuid().get_version_num(), 4);
    assert_eq!(second.id().as_uuid().get_version_num(), 4);
}

#[tokio::test(flavor = "local")]
async fn a_stale_handle_cannot_delete_a_new_materialization_with_the_same_name() {
    let service = SandboxService::new(Rc::new(memory::Provider::new()));
    let request = request();
    let stale = service.ensure(&request).await.expect("first materialization");

    service
        .delete(request.name())
        .await
        .expect("delete first materialization");
    let current = service.ensure(&request).await.expect("second materialization");
    stale.delete().await.expect("stale deletion should be idempotent");

    assert_eq!(
        service
            .inspect(request.name())
            .await
            .expect("current Sandbox should remain")
            .id,
        current.id().clone()
    );
}

#[tokio::test(flavor = "local")]
async fn service_and_handle_expose_execution_and_volume_operations() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend.clone());
    let sandbox = service.ensure(&request()).await.expect("ensure");

    let volume_name = VolumeName::new("home").expect("valid Volume name");
    let volume_request = EnsureVolumeRequest::new(volume_name.clone());
    let expected_volume_id = volume_request.id().clone();
    let volume = service.ensure_volume(volume_request).await.expect("create Volume");
    assert_eq!(volume.id, expected_volume_id);
    assert_eq!(volume.id.as_uuid().get_version_num(), 4);
    assert_eq!(service.find_volume(&volume_name).await.expect("find Volume"), volume);

    backend.queue_execution_events(vec![
        ExecutionEvent::Started { process_id: Some(42) },
        ExecutionEvent::Stdout(Bytes::from_static(b"output")),
        ExecutionEvent::Stderr(Bytes::from_static(b"warning")),
        ExecutionEvent::Exited(ExitStatus { code: 7 }),
    ]);
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/example"),
            ["--check".into()],
        ))
        .await
        .expect("run Execution");

    assert_eq!(output.status.code, 7);
    assert!(!output.status.success());
    assert_eq!(output.stdout, Bytes::from_static(b"output"));
    assert_eq!(output.stderr, Bytes::from_static(b"warning"));
    assert_eq!(backend.execution_specs().len(), 1);
    assert_eq!(
        backend.execution_specs()[0].program(),
        &sandbox::execution::Program::Command {
            executable: SandboxPath::new("/usr/bin/example"),
            args: vec!["--check".into()],
        }
    );

    let execution = sandbox
        .start_execution(StartExecutionRequest::new(ExecutionSpec::image_entrypoint()))
        .await
        .expect("start addressable Execution");
    assert_eq!(execution.id.as_uuid().get_version_num(), 4);
    sandbox
        .terminate_execution(&execution.id)
        .await
        .expect("terminate Execution");

    backend.queue_terminal_events(vec![
        TerminalEvent::Started { process_id: Some(43) },
        TerminalEvent::Output(Bytes::from_static(b"terminal output")),
        TerminalEvent::Exited(ExitStatus { code: 0 }),
    ]);
    let mut terminal = sandbox
        .start_terminal_execution(StartTerminalExecutionRequest::new(
            ExecutionSpec::image_entrypoint(),
            TerminalSize::new(40, 120).expect("valid terminal size"),
        ))
        .await
        .expect("start terminal Execution");
    assert_eq!(terminal.id.as_uuid().get_version_num(), 4);
    terminal
        .control
        .write_input(Bytes::from_static(b"input"))
        .await
        .expect("write terminal input");
    terminal
        .control
        .resize(TerminalSize::new(50, 140).expect("valid terminal size"))
        .await
        .expect("resize terminal");
    assert!(matches!(
        poll_fn(|context| terminal.events.as_mut().poll_next(context)).await,
        Some(Ok(TerminalEvent::Started { process_id: Some(43) }))
    ));
}

#[tokio::test(flavor = "local")]
async fn memory_provider_matches_execution_responses_without_fifo_coupling() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend.clone());
    let sandbox = service.ensure(&request()).await.expect("ensure");
    backend.queue_execution_events_matching(
        |spec| {
            matches!(
                spec.program(),
                sandbox::execution::Program::Command { executable, .. }
                    if executable.as_str() == "/usr/bin/matched"
            )
        },
        vec![
            ExecutionEvent::Started { process_id: None },
            ExecutionEvent::Exited(ExitStatus { code: 23 }),
        ],
    );

    let unrelated = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/unrelated"),
            Vec::<String>::new(),
        ))
        .await
        .expect("unrelated Execution");
    let matched = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/matched"),
            Vec::<String>::new(),
        ))
        .await
        .expect("matched Execution");

    assert!(unrelated.status.success());
    assert_eq!(matched.status.code, 23);
    assert_eq!(backend.execution_specs().len(), 2);
}

#[tokio::test(flavor = "local")]
async fn sandbox_backend_streams_files_in_both_directions() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend.clone());
    let sandbox = service.ensure(&request()).await.expect("ensure");
    let path = SandboxPath::new("/home/sandbox/code/input.bin");

    sandbox
        .write_file(&path, Box::pin(Cursor::new(vec![0, 1, 2, 0xff])))
        .await
        .expect("write Sandbox file");
    let mut reader = sandbox.read_file(&path).await.expect("read Sandbox file");
    let mut contents = Vec::new();
    reader
        .read_to_end(&mut contents)
        .await
        .expect("consume Sandbox file stream");

    assert_eq!(contents, vec![0, 1, 2, 0xff]);
    assert!(
        service
            .capabilities(&sandbox.snapshot().image.platform)
            .await
            .expect("Platform capabilities")
            .features()
            .contains(SandboxFeature::FileTransfer)
    );
}

#[tokio::test(flavor = "local")]
async fn ensure_rejects_an_unsupported_platform() {
    let backend = Rc::new(memory::Provider::with_platforms(Platform::new("linux", "amd64"), []));
    let service = SandboxService::new(backend.clone());
    let mut request = request();
    request.spec_mut().platform = Platform::new("windows", "amd64");

    let error = service
        .ensure(&request)
        .await
        .expect_err("Platform should be unsupported");

    assert!(matches!(
        error,
        Error::Component { source, .. } if matches!(*source, Error::UnsupportedPlatform(_))
    ));
    assert_eq!(backend.count(), 0);
}

struct IncompatibleImageBackend;

impl image::ImageBackend for IncompatibleImageBackend {
    fn capabilities<'a>(
        &'a self,
        _platform: &'a Platform,
    ) -> sandbox::LocalFuture<'a, Result<image::ImageBackendCapabilities, Error>> {
        Box::pin(async {
            Ok(image::ImageBackendCapabilities::new(
                image::ImageOperationCapabilities::new(
                    [image::ImageSourceKind::Build, image::ImageSourceKind::Reference].into(),
                    [RootFilesystemMode::Layered].into(),
                ),
                image::ImageOperationCapabilities::default(),
                image::ImageOperationCapabilities::default(),
            ))
        })
    }

    fn resolve<'a>(&'a self, request: &'a image::ResolveRequest) -> PendingOperation<'a, image::ResolvedImage> {
        PendingOperation::run(SandboxPhase::ImageResolve, move |_progress| {
            Box::pin(async move {
                Ok(image::ResolvedImage {
                    source: request.source.clone(),
                    platform: Platform::new("windows", "amd64"),
                    manifest_digest: "sha256:incompatible".into(),
                })
            })
        })
    }

    fn export_prepared_image<'a>(
        &'a self,
        _request: &'a image::ResolveRequest,
        _destination: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        unsupported_prepared_image(image::ImageOperation::PreparedImageExport)
    }

    fn import_prepared_image<'a>(
        &'a self,
        _request: &'a image::ResolveRequest,
        _source: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        unsupported_prepared_image(image::ImageOperation::PreparedImageImport)
    }
}

fn unsupported_prepared_image<'a>(operation: image::ImageOperation) -> PendingOperation<'a, image::PreparedImage> {
    PendingOperation::run(SandboxPhase::ImagePrepare, move |_progress| {
        Box::pin(async move { Err(Error::UnsupportedImageOperation(operation)) })
    })
}

struct IncompatibleProvider {
    backend: memory::Provider,
    image_backend: IncompatibleImageBackend,
}

impl sandbox::provider::SandboxProvider for IncompatibleProvider {
    fn backend(&self) -> &dyn sandbox::backend::SandboxBackend {
        &self.backend
    }

    fn image_backend(&self) -> &dyn image::ImageBackend {
        &self.image_backend
    }
}

#[tokio::test(flavor = "local")]
async fn ensure_rejects_an_image_that_does_not_satisfy_the_requested_platform() {
    let provider = Rc::new(IncompatibleProvider {
        backend: memory::Provider::with_platforms(Platform::native("linux"), [Platform::new("windows", "amd64")]),
        image_backend: IncompatibleImageBackend,
    });
    let service = SandboxService::new(provider.clone());

    let error = service
        .ensure(&request())
        .await
        .expect_err("Image Platform should be incompatible");

    assert!(matches!(error, Error::ImagePlatformMismatch { .. }));
    assert_eq!(provider.backend.count(), 0);
}

#[tokio::test(flavor = "local")]
async fn ensure_rejects_a_root_mode_the_image_backend_cannot_materialize() {
    let provider = Rc::new(IncompatibleProvider {
        backend: memory::Provider::new(),
        image_backend: IncompatibleImageBackend,
    });
    let service = SandboxService::new(provider.clone());
    let mut request = request();
    request.spec_mut().resources = SandboxResources::new(
        "2".parse::<CpuQuantity>().expect("test CPU should be valid"),
        "1Gi".parse::<ByteQuantity>().expect("test memory should be valid"),
        RootFilesystem::direct(
            "4Gi"
                .parse::<ByteQuantity>()
                .expect("test root filesystem should be valid"),
        ),
    );

    let capabilities = service
        .capabilities(&request.spec().platform)
        .await
        .expect("Provider capabilities should be available");
    assert!(
        capabilities
            .root_filesystem_modes()
            .contains(RootFilesystemMode::Layered)
    );
    assert!(
        !capabilities
            .root_filesystem_modes()
            .contains(RootFilesystemMode::Direct)
    );

    let error = service
        .ensure(&request)
        .await
        .expect_err("Image Backend should reject direct materialization");

    assert!(matches!(
        error,
        Error::UnsupportedImageRootFilesystemMode {
            operation: image::ImageOperation::Resolve,
            mode: RootFilesystemMode::Direct,
        }
    ));
    assert_eq!(provider.backend.count(), 0);
}

#[tokio::test(flavor = "local")]
async fn platform_is_immutable_after_materialization() {
    let linux = Platform::native("linux");
    let windows = Platform::native("windows");
    let backend = Rc::new(memory::Provider::with_platforms(linux.clone(), [windows.clone()]));
    let service = SandboxService::new(backend);
    let linux_request = request();
    let _ = service.ensure(&linux_request).await.expect("first ensure");
    let windows_request = EnsureSandboxRequest::new(
        linux_request.name().clone(),
        SandboxSpec {
            platform: windows,
            ..linux_request.spec().clone()
        },
    );

    let error = service
        .ensure(&windows_request)
        .await
        .expect_err("Platform change should fail");

    assert!(matches!(error, Error::Immutable("platform")));
}

#[tokio::test(flavor = "local")]
async fn init_system_is_immutable_after_materialization() {
    let backend = Rc::new(memory::Provider::new());
    let service = SandboxService::new(backend);
    let backend_init = request();
    let _ = service.ensure(&backend_init).await.expect("first ensure");
    let image_init = EnsureSandboxRequest::new(
        backend_init.name().clone(),
        SandboxSpec {
            init_system: sandbox::init::InitSystem::Image,
            ..backend_init.spec().clone()
        },
    );

    let error = service
        .ensure(&image_init)
        .await
        .expect_err("init system change should fail");

    assert!(matches!(error, Error::Immutable("initSystem")));
}
