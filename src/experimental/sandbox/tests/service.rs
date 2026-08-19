#![allow(clippy::expect_used)]

use std::{future::poll_fn, io::Cursor, path::PathBuf, pin::Pin, rc::Rc};

use bytes::Bytes;
use futures_core::Stream as _;
use sandbox::{
    ByteQuantity, CpuQuantity, EnsureSandboxRequest, Error, OperationEvent, PendingOperation, Platform,
    RetentionPolicy, RootFilesystem, SandboxEvent, SandboxFeature, SandboxName, SandboxPath, SandboxPhase,
    SandboxResources, SandboxService, SandboxSpec,
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
        platform: Platform::new("linux", "amd64"),
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
    let platform = Platform::new("linux", "amd64");
    let without_network = SandboxService::new(Rc::new(memory::Provider::new()))
        .capabilities(&platform)
        .await
        .expect("Provider capabilities should be available");
    assert!(without_network.features().contains(SandboxFeature::Execution));
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

struct IncompatibleImageResolver;

impl image::Resolver for IncompatibleImageResolver {
    fn resolve<'a>(&'a self, request: &'a image::ResolveRequest) -> PendingOperation<'a, image::ResolvedImage> {
        PendingOperation::run(SandboxPhase::ImageResolve, move |_progress| {
            Box::pin(async move {
                Ok(image::ResolvedImage {
                    source: request.source.clone(),
                    platform: Platform::new("windows", "amd64"),
                    digest: "sha256:incompatible".into(),
                })
            })
        })
    }
}

struct IncompatibleProvider {
    backend: memory::Provider,
    resolver: IncompatibleImageResolver,
}

impl sandbox::provider::SandboxProvider for IncompatibleProvider {
    fn backend(&self) -> &dyn sandbox::backend::SandboxBackend {
        &self.backend
    }

    fn image_resolver(&self) -> &dyn image::Resolver {
        &self.resolver
    }
}

#[tokio::test(flavor = "local")]
async fn ensure_rejects_an_image_that_does_not_satisfy_the_requested_platform() {
    let provider = Rc::new(IncompatibleProvider {
        backend: memory::Provider::with_platforms(Platform::new("linux", "amd64"), [Platform::new("windows", "amd64")]),
        resolver: IncompatibleImageResolver,
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
async fn platform_is_immutable_after_materialization() {
    let linux = Platform::new("linux", "amd64");
    let windows = Platform::new("windows", "amd64");
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
