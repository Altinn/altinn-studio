#![allow(clippy::expect_used)]

use std::{io::Cursor, path::PathBuf, rc::Rc};

use bytes::Bytes;
use futures_util::StreamExt as _;
use sandbox::{
    ByteQuantity, CpuQuantity, EnsureSandboxRequest, Hostname, OperationEvent, Platform, ProgressEvent,
    RetentionPolicy, RootFilesystem, Sandbox, SandboxName, SandboxResources, SandboxService, SandboxSpec, SandboxState,
    backend::SandboxBackend as _,
    execution::{self, ExecutionSpec, StartExecutionRequest},
    image::ImageSource,
    mount::Mount,
    terminal::{StartTerminalExecutionRequest, TerminalEvent, TerminalSize},
    volume::{EnsureVolumeRequest, VolumeName},
};
use sandbox_microsandbox::MicrosandboxProvider;
use sha2::{Digest as _, Sha256};
use tokio::io::AsyncReadExt as _;

#[tokio::test(flavor = "local")]
#[ignore = "requires a Docker Engine API, Microsandbox host runtime and hardware virtualization"]
async fn retained_lifecycle_execution_files_and_volumes() {
    let temporary = RetainedOnFailureTempDir::new();
    let backend_home = temporary.path().join("control-plane");
    let reference_backend_home = temporary.path().join("reference-control-plane");
    let backend = Rc::new(
        MicrosandboxProvider::open(&backend_home)
            .await
            .expect("Backend should open"),
    );
    let home = backend
        .ensure_volume(EnsureVolumeRequest::new(
            VolumeName::new("home").expect("valid Volume name"),
        ))
        .await
        .expect("retained volume should be created");
    let service = SandboxService::new(backend.clone());
    let mut request = EnsureSandboxRequest::new(
        SandboxName::new("integration-worker").expect("test Sandbox name should be valid"),
        SandboxSpec {
            image: ImageSource::Build {
                context: PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/runtime-image"),
                dockerfile: PathBuf::from("Dockerfile"),
                target: None,
            },
            platform: native_linux_platform(),
            resources: direct_resources("1", "512Mi", "4Gi"),
            init_system: sandbox::init::InitSystem::Backend,
            retention_policy: RetentionPolicy::Retain,
        },
    )
    .with_hostname(Hostname::new("integration-host").expect("test hostname should be valid"))
    .with_mounts([Mount::Volume {
        id: home.id.clone(),
        target: sandbox::SandboxPath::new("/workspace"),
        read_only: false,
    }]);
    let (mut sandbox, events) = collect_progress(service.ensure(&request))
        .await
        .expect("Sandbox should be built and started");
    assert_provisioning_progress(&events);
    assert_eq!(sandbox.state, SandboxState::Running);
    assert_hostname(backend.as_ref(), &sandbox, "integration-host").await;
    assert_direct_root_filesystem(backend.as_ref(), &sandbox).await;
    assert_nested_container_networking(backend.as_ref(), &sandbox).await;

    sandbox = assert_resource_update_and_root_growth(backend.as_ref(), &service, &mut request, sandbox).await;

    let output = run(backend.as_ref(), &sandbox.id, ExecutionSpec::image_entrypoint()).await;
    assert_eq!(output.stdout.as_ref(), b"default-entrypoint\n");

    assert_terminal_execution(backend.as_ref(), &sandbox).await;

    backend
        .write_file(
            &sandbox.id,
            &sandbox::SandboxPath::new("/workspace/retained.txt"),
            Box::pin(Cursor::new(b"retained".to_vec())),
        )
        .await
        .expect("file should stream into the Sandbox");
    assert_atomic_replacement(backend.as_ref(), &sandbox).await;
    backend.stop(&sandbox.id).await.expect("Sandbox should stop");

    drop(service);
    drop(backend);
    let backend = MicrosandboxProvider::open(&backend_home)
        .await
        .expect("Backend should reopen from the same home");
    assert_eq!(
        backend
            .find(request.name())
            .await
            .expect("Sandbox should be re-adopted")
            .state,
        SandboxState::Stopped
    );
    backend.start(&sandbox.id).await.expect("Sandbox should restart");

    assert_eq!(
        read(&backend, &sandbox.id, "/workspace/retained.txt").await,
        b"retained"
    );
    assert_immediate_restart_and_delete(&backend, &request, &sandbox).await;
    assert_build_cache_reused(backend, &request, &home.id).await;
    assert_reference_image_resolves(reference_backend_home).await;
}

/// A replacement must never expose a partial file: a reader polling the path throughout the
/// write sees the old or the new contents only, the replaced file keeps its mode, and no
/// staging file is left behind.
async fn assert_atomic_replacement(backend: &MicrosandboxProvider, sandbox: &Sandbox) {
    let path = "/workspace/replaced.txt";
    let old = vec![b'a'; 4 * 1024 * 1024];
    let new = vec![b'b'; 4 * 1024 * 1024];
    backend
        .write_file(
            &sandbox.id,
            &sandbox::SandboxPath::new(path),
            Box::pin(Cursor::new(old.clone())),
        )
        .await
        .expect("initial file should stream into the Sandbox");
    let mode = run(
        backend,
        &sandbox.id,
        shell(&format!("stat -c %a {path} && chmod 4750 {path} && stat -c %a {path}")),
    )
    .await;
    assert_eq!(mode.stdout.as_ref(), b"644\n4750\n", "a new file gets the default mode");
    // One digest per observation, each from a single open of the path, so an observation can
    // only be the complete old file, the complete new file, or a torn one. The reader marks
    // its first observation so the replacement provably overlaps with it.
    let old_digest = hex(&Sha256::digest(&old));
    let new_digest = hex(&Sha256::digest(&new));
    let ready = "/workspace/.reader-ready";
    let reader = backend
        .start_execution(
            &sandbox.id,
            StartExecutionRequest::new(shell(&format!(
                "end=$(($(date +%s) + 20)); while [ $(date +%s) -lt $end ]; do \
                 digest=$(sha256sum < {path} | cut -d ' ' -f 1); echo \"$digest\"; touch {ready}; \
                 [ \"$digest\" = {new_digest} ] && break; done"
            ))),
        )
        .await
        .expect("reader should start");
    for attempt in 0.. {
        let probe = run(backend, &sandbox.id, shell(&format!("test -f {ready}"))).await;
        if probe.status.success() {
            break;
        }
        assert!(attempt < 100, "reader never started observing the file");
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    backend
        .write_file(
            &sandbox.id,
            &sandbox::SandboxPath::new(path),
            Box::pin(Cursor::new(new.clone())),
        )
        .await
        .expect("replacement should stream into the Sandbox");
    let observed = reader.collect().await.expect("reader should exit");
    let lines = String::from_utf8(observed.stdout.to_vec()).expect("reader output should be UTF-8");
    assert!(!lines.is_empty(), "reader observed nothing");
    for line in lines.lines() {
        assert!(
            line == old_digest || line == new_digest,
            "reader observed a partial or mixed file: {line:?}"
        );
    }
    assert!(lines.contains(&old_digest), "reader never observed the original");
    assert!(lines.contains(&new_digest), "reader never observed the replacement");
    assert_eq!(read(backend, &sandbox.id, path).await, new);
    let after = run(
        backend,
        &sandbox.id,
        shell(&format!(
            "rm {ready}; stat -c %a {path}; ls -A /workspace | grep -c agent- || true"
        )),
    )
    .await;
    assert_eq!(after.stdout.as_ref(), b"4750\n0\n");
}

fn hex(bytes: &[u8]) -> String {
    use std::fmt::Write as _;

    bytes.iter().fold(String::new(), |mut hex, byte| {
        let _ = write!(hex, "{byte:02x}");
        hex
    })
}

async fn assert_hostname(backend: &MicrosandboxProvider, sandbox: &Sandbox, expected: &str) {
    assert_eq!(sandbox.hostname.as_str(), expected);
    let output = run(backend, &sandbox.id, shell("hostname")).await;
    assert!(output.status.success());
    assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), expected);
}

async fn assert_direct_root_filesystem(backend: &MicrosandboxProvider, sandbox: &Sandbox) {
    let output = run(
        backend,
        &sandbox.id,
        shell("awk '$2 == \"/\" { print $3 }' /proc/mounts"),
    )
    .await;
    assert_eq!(output.stdout.as_ref(), b"ext4\n");
}

async fn assert_nested_container_networking(backend: &MicrosandboxProvider, sandbox: &Sandbox) {
    let output = run(
        backend,
        &sandbox.id,
        shell(
            r"set -eu
cleanup() {
    iptables -t nat -F SBX_KUBE_PROXY_TEST 2>/dev/null || true
    iptables -t nat -X SBX_KUBE_PROXY_TEST 2>/dev/null || true
    nft delete table ip sandbox_test 2>/dev/null || true
}
trap cleanup EXIT
iptables -t nat -N SBX_KUBE_PROXY_TEST
iptables -t nat -A SBX_KUBE_PROXY_TEST -m statistic --mode random --probability 0.5 -j RETURN
nft add table ip sandbox_test
nft add chain ip sandbox_test service
nft add rule ip sandbox_test service meta mark set numgen random mod 2
",
        ),
    )
    .await;
    assert!(
        output.status.success(),
        "nested container networking kernel probes failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
}

async fn assert_resource_update_and_root_growth(
    backend: &MicrosandboxProvider,
    service: &SandboxService,
    request: &mut EnsureSandboxRequest,
    sandbox: Sandbox,
) -> Sandbox {
    request.spec_mut().resources = direct_resources("2", "768Mi", "5Gi");
    let (resized, events) = collect_progress(service.ensure(request))
        .await
        .expect("Sandbox resources should be updated");
    assert_eq!(resized.id, sandbox.id);
    assert_eq!(resized.resources, request.spec().resources);
    assert!(events.iter().any(
        |event| matches!(event, ProgressEvent::StepStarted { name, .. } if name == "Update Microsandbox VM resources")
    ));

    let root_size = run(backend, &resized.id, shell("df -kP / | awk 'END { print $2 }'")).await;
    let root_kib = String::from_utf8(root_size.stdout.to_vec())
        .expect("root filesystem size should be UTF-8")
        .trim()
        .parse::<u64>()
        .expect("root filesystem size should be numeric");
    assert!(
        root_kib > 4 * 1024 * 1024,
        "root filesystem should have grown past 4 GiB"
    );

    request.spec_mut().resources = direct_resources("2", "768Mi", "4Gi");
    let error = service
        .ensure(request)
        .await
        .expect_err("Microsandbox root filesystem shrink should be rejected");
    assert!(matches!(
        error,
        sandbox::Error::Component { source, .. }
            if matches!(*source, sandbox::Error::UnsupportedResourceChange { resource: "rootFilesystem", .. })
    ));
    request.spec_mut().resources = direct_resources("2", "768Mi", "5Gi");
    resized
}

async fn assert_reference_image_resolves(backend_home: PathBuf) {
    let backend = Rc::new(
        MicrosandboxProvider::open(backend_home)
            .await
            .expect("reference Backend should open"),
    );
    let service = SandboxService::new(backend.clone());
    let request = EnsureSandboxRequest::new(
        SandboxName::new("reference-worker").expect("test Sandbox name should be valid"),
        SandboxSpec {
            image: ImageSource::Reference {
                reference: "docker.io/library/alpine:3.22".to_string(),
            },
            platform: native_linux_platform(),
            resources: resources("1", "512Mi", "4Gi"),
            init_system: sandbox::init::InitSystem::Backend,
            retention_policy: RetentionPolicy::Delete,
        },
    );

    let (sandbox, events) = collect_progress(service.ensure(&request))
        .await
        .expect("OCI reference should resolve and start");
    assert!(
        events
            .iter()
            .any(|event| matches!(event, ProgressEvent::StepStarted { name, .. } if name == "Pull OCI image"))
    );
    let output = run(backend.as_ref(), &sandbox.id, shell("cat /etc/alpine-release")).await;
    assert!(output.status.success());
    assert!(String::from_utf8_lossy(&output.stdout).starts_with("3.22."));
    assert_hostname(backend.as_ref(), &sandbox, "reference-worker").await;

    service
        .release(request.name(), request.spec().retention_policy)
        .await
        .expect("reference Sandbox should be deleted");
}

async fn assert_immediate_restart_and_delete(
    backend: &MicrosandboxProvider,
    request: &EnsureSandboxRequest,
    sandbox: &Sandbox,
) {
    backend.stop(&sandbox.id).await.expect("Sandbox should stop again");
    assert_eq!(
        backend
            .find(request.name())
            .await
            .expect("stopped Sandbox should remain discoverable")
            .state,
        SandboxState::Stopped
    );
    backend
        .start(&sandbox.id)
        .await
        .expect("Sandbox should immediately restart again");

    backend.delete(&sandbox.id).await.expect("Sandbox should be deleted");
}

async fn assert_build_cache_reused(
    backend: MicrosandboxProvider,
    request: &EnsureSandboxRequest,
    home_id: &sandbox::volume::VolumeId,
) {
    let backend = Rc::new(backend);
    let service = SandboxService::new(backend.clone());
    let (sandbox, events) = collect_progress(service.ensure(request))
        .await
        .expect("Sandbox should rebuild from the retained Docker cache");
    assert!(
        step_output(&events, "Build Docker image").iter().any(|bytes| {
            [b"CACHED".as_slice(), b"Using cache".as_slice()]
                .iter()
                .any(|marker| bytes.windows(marker.len()).any(|window| window == *marker))
        }),
        "second Docker build should report a reused layer; events: {events:#?}"
    );
    for skipped in ["Export Docker image", "Import Microsandbox image"] {
        assert!(
            !events
                .iter()
                .any(|event| matches!(event, ProgressEvent::StepStarted { name, .. } if name == skipped)),
            "reused Microsandbox image should skip {skipped}"
        );
    }

    backend
        .delete(&sandbox.id)
        .await
        .expect("rebuilt Sandbox should be deleted");
    backend
        .delete_volume(home_id)
        .await
        .expect("retained volume should be deleted");
}

async fn assert_terminal_execution(backend: &dyn sandbox::backend::SandboxBackend, sandbox: &Sandbox) {
    let mut terminal = backend
        .start_terminal_execution(
            &sandbox.id,
            StartTerminalExecutionRequest::new(
                shell("read -r value; set -- $(stty size); printf 'terminal:%s:%sx%s\\n' \"$value\" \"$1\" \"$2\""),
                TerminalSize::new(31, 97).expect("initial terminal size should be valid"),
            ),
        )
        .await
        .expect("terminal Execution should start");
    terminal
        .control
        .resize(TerminalSize::new(42, 111).expect("resized terminal dimensions should be valid"))
        .await
        .expect("terminal should resize");
    terminal
        .control
        .write_input(Bytes::from_static(b"hello\n"))
        .await
        .expect("terminal input should be written");

    let mut output = Vec::new();
    let status = loop {
        match terminal
            .events
            .next()
            .await
            .expect("terminal event stream should report exit")
            .expect("terminal event should succeed")
        {
            TerminalEvent::Output(bytes) => output.extend_from_slice(&bytes),
            TerminalEvent::Exited(status) => break Ok(status),
            TerminalEvent::Failed { message } => break Err(message),
            _ => {}
        }
    }
    .expect("terminal process should start and exit");
    let output = String::from_utf8_lossy(&output);
    assert!(status.success());
    assert!(
        output.contains("terminal:hello:42x111"),
        "unexpected terminal output: {output}"
    );
}

async fn collect_progress(
    mut pending: sandbox::PendingSandbox<'_>,
) -> Result<(Sandbox, Vec<ProgressEvent>), sandbox::Error> {
    let mut events = Vec::new();
    while let Some(event) = pending.next().await {
        match event? {
            OperationEvent::Progress(event) => events.push(event),
            OperationEvent::Ready(sandbox) => return Ok((sandbox.snapshot().clone(), events)),
            _ => {}
        }
    }
    Err(sandbox::Error::OperationStreamEnded)
}

/// Output of every occurrence of the named step.
fn step_output<'a>(events: &'a [ProgressEvent], step: &str) -> Vec<&'a [u8]> {
    let ids = events
        .iter()
        .filter_map(|event| match event {
            ProgressEvent::StepStarted { id, name, .. } if name == step => Some(id),
            _ => None,
        })
        .collect::<Vec<_>>();
    events
        .iter()
        .filter_map(|event| match event {
            ProgressEvent::StepOutput { id, bytes, .. } if ids.contains(&id) => Some(bytes.as_ref()),
            _ => None,
        })
        .collect()
}

fn assert_provisioning_progress(events: &[ProgressEvent]) {
    for expected in [
        "Check Docker Engine",
        "Build Docker image",
        "Retain Docker build cache",
        "Look up imported Microsandbox image",
        "Create Microsandbox VM",
    ] {
        assert!(
            events
                .iter()
                .any(|event| { matches!(event, ProgressEvent::StepStarted { name, .. } if name == expected) })
        );
    }
}

struct RetainedOnFailureTempDir(Option<tempfile::TempDir>);

impl RetainedOnFailureTempDir {
    fn new() -> Self {
        Self(Some(
            tempfile::tempdir().expect("temporary integration home should be created"),
        ))
    }

    fn path(&self) -> &std::path::Path {
        self.0.as_ref().expect("temporary integration home should exist").path()
    }
}

impl Drop for RetainedOnFailureTempDir {
    fn drop(&mut self) {
        if std::thread::panicking()
            && let Some(temporary) = self.0.take()
        {
            eprintln!(
                "retaining failed Microsandbox integration home at {}",
                temporary.keep().display()
            );
        }
    }
}

async fn read(backend: &MicrosandboxProvider, id: &sandbox::SandboxId, path: &str) -> Vec<u8> {
    let mut reader = backend
        .read_file(id, &sandbox::SandboxPath::new(path))
        .await
        .expect("Sandbox file should open");
    let mut contents = Vec::new();
    reader
        .read_to_end(&mut contents)
        .await
        .expect("Sandbox file should stream out");
    contents
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

fn direct_resources(cpu: &str, memory: &str, root_filesystem: &str) -> SandboxResources {
    SandboxResources::new(
        cpu.parse::<CpuQuantity>().expect("test CPU should be valid"),
        memory.parse::<ByteQuantity>().expect("test memory should be valid"),
        RootFilesystem::direct(
            root_filesystem
                .parse::<ByteQuantity>()
                .expect("test root filesystem should be valid"),
        ),
    )
}

fn shell(script: &str) -> ExecutionSpec {
    ExecutionSpec::command(
        sandbox::SandboxPath::new("/bin/sh"),
        ["-c".to_string(), script.to_string()],
    )
}

async fn run(
    backend: &dyn sandbox::backend::SandboxBackend,
    sandbox_id: &sandbox::SandboxId,
    spec: ExecutionSpec,
) -> execution::ExecutionOutput {
    let execution = backend
        .start_execution(sandbox_id, StartExecutionRequest::new(spec))
        .await
        .expect("Execution should start");
    execution.collect().await.expect("Execution should exit")
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
