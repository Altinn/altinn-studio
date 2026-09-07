#![allow(clippy::expect_used)]

use microsandbox_network::control::NETWORK_CONTROL_PROTOCOL;
use sandbox::{
    Platform, RootFilesystemMode, SandboxFeature,
    backend::SandboxBackend as _,
    image::{ImageSource, ImageSourceKind, ResolveRequest},
    network::{NetworkControlProtocolId, NetworkEndpointSelection},
    provider::SandboxProvider as _,
};
use sandbox_microsandbox::MicrosandboxProvider;

const ALPINE_3_22_INDEX_DIGEST: &str = "sha256:14358309a308569c32bdc37e2e0e9694be33a9d99e68afb0f5ff33cc1f695dce";

#[tokio::test(flavor = "local")]
async fn backend_state_and_runtime_are_rooted_in_the_explicit_home() {
    let home = tempfile::tempdir().expect("temporary home should be created");
    let backend_home = home.path().join("microsandbox");
    let backend = MicrosandboxProvider::open(&backend_home)
        .await
        .expect("Backend should open without starting a VM");

    assert!(backend_home.join("state/sandboxes").is_dir());
    assert!(backend_home.join("state/volumes").is_dir());
    assert!(backend_home.join("runtime").is_dir());

    let architecture = match std::env::consts::ARCH {
        "x86_64" => "amd64",
        "aarch64" => "arm64",
        architecture => architecture,
    };
    let platform = Platform::new("linux", architecture);
    let host_supported = matches!(std::env::consts::OS, "linux" | "windows")
        || (std::env::consts::OS == "macos" && std::env::consts::ARCH == "aarch64");
    let result = backend.capabilities(&platform).await;
    if !host_supported {
        assert!(result.is_err());
        return;
    }
    let capabilities = result.expect("native Linux capabilities should be reported");
    assert!(capabilities.features.contains(SandboxFeature::Execution));
    assert!(capabilities.features.contains(SandboxFeature::TerminalExecution));
    assert!(capabilities.features.contains(SandboxFeature::TerminalAttach));
    assert!(capabilities.features.contains(SandboxFeature::FileTransfer));
    assert!(capabilities.features.contains(SandboxFeature::PersistentVolumes));
    assert!(capabilities.features.contains(SandboxFeature::NestedContainers));
    assert!(
        capabilities
            .network
            .supports(&NetworkEndpointSelection::Control(NetworkControlProtocolId::new(
                NETWORK_CONTROL_PROTOCOL
            )))
    );

    let image_capabilities = backend
        .image_backend()
        .capabilities(&platform)
        .await
        .expect("native Image Backend capabilities should be reported");
    assert!(image_capabilities.resolve.sources.contains(ImageSourceKind::Build));
    assert!(image_capabilities.resolve.sources.contains(ImageSourceKind::Reference));
    assert!(
        image_capabilities
            .resolve
            .root_filesystem_modes
            .contains(RootFilesystemMode::Layered)
    );
    assert!(
        image_capabilities
            .resolve
            .root_filesystem_modes
            .contains(RootFilesystemMode::Direct)
    );
    for prepared in [
        &image_capabilities.prepared_image_export,
        &image_capabilities.prepared_image_import,
    ] {
        assert!(prepared.sources.contains(ImageSourceKind::Reference));
        assert!(!prepared.sources.contains(ImageSourceKind::Build));
        assert!(prepared.root_filesystem_modes.contains(RootFilesystemMode::Direct));
        assert!(!prepared.root_filesystem_modes.contains(RootFilesystemMode::Layered));
    }
}

#[tokio::test(flavor = "local")]
async fn cache_directory_can_be_shared_without_sharing_provider_state() {
    let temporary = tempfile::tempdir().expect("temporary home should be created");
    let shared_cache = temporary.path().join("shared-cache");
    let first_home = temporary.path().join("first-provider");
    let second_home = temporary.path().join("second-provider");

    MicrosandboxProvider::builder(&first_home)
        .cache_directory(&shared_cache)
        .open()
        .await
        .expect("first Provider should open with the shared cache");
    MicrosandboxProvider::builder(&second_home)
        .cache_directory(&shared_cache)
        .open()
        .await
        .expect("second Provider should open with the shared cache");

    assert!(shared_cache.is_dir());
    assert!(first_home.join("state/sandboxes").is_dir());
    assert!(second_home.join("state/sandboxes").is_dir());
}

#[tokio::test(flavor = "local")]
#[ignore = "requires access to the public Docker registry"]
async fn multi_platform_index_resolves_to_the_native_image_manifest() {
    let (architecture, expected_manifest_digest) = match std::env::consts::ARCH {
        "x86_64" => (
            "amd64",
            "sha256:7c8cb692ae09657cbc4a3f3cbd0e8d5a2690ba38386aaaf252dbb060bf5eb2e6",
        ),
        "aarch64" => (
            "arm64",
            "sha256:2c9d26f410d032d5b1525aa8a873e238b05b90c4ae8618743d4311f0cc827e37",
        ),
        _ => return,
    };
    let temporary = tempfile::tempdir().expect("temporary home should be created");
    let provider = MicrosandboxProvider::open(temporary.path().join("provider"))
        .await
        .expect("Provider should open");
    let request = ResolveRequest {
        source: ImageSource::Reference {
            reference: format!("docker.io/library/alpine@{ALPINE_3_22_INDEX_DIGEST}"),
        },
        platform: Platform::new("linux", architecture),
        root_filesystem_mode: RootFilesystemMode::Layered,
    };

    let resolved = provider
        .image_backend()
        .resolve(&request)
        .await
        .expect("multi-platform index should resolve");

    assert_eq!(resolved.manifest_digest, expected_manifest_digest);
    assert_ne!(resolved.manifest_digest, ALPINE_3_22_INDEX_DIGEST);
}

#[tokio::test(flavor = "local")]
async fn cache_directory_must_not_be_empty() {
    let result = MicrosandboxProvider::builder("private-provider")
        .cache_directory("")
        .open()
        .await;

    assert!(matches!(
        result,
        Err(sandbox::Error::Invalid {
            field: "provider.cacheDirectory",
            ..
        })
    ));
}

#[tokio::test(flavor = "local")]
async fn runtime_bundle_must_be_a_regular_file() {
    let temporary = tempfile::tempdir().expect("temporary home should be created");
    let result = MicrosandboxProvider::builder(temporary.path().join("provider"))
        .runtime_bundle(temporary.path().join("missing.tar.gz"), "0".repeat(64))
        .open()
        .await;

    assert!(matches!(
        result,
        Err(sandbox::Error::Invalid {
            field: "provider.runtimeBundle.path",
            ..
        })
    ));
}

#[tokio::test(flavor = "local")]
async fn runtime_bundle_digest_must_be_sha256() {
    let temporary = tempfile::tempdir().expect("temporary home should be created");
    let bundle = temporary.path().join("runtime.tar.gz");
    std::fs::write(&bundle, []).expect("placeholder runtime bundle should be written");
    let result = MicrosandboxProvider::builder(temporary.path().join("provider"))
        .runtime_bundle(bundle, "not-a-sha256")
        .open()
        .await;

    assert!(matches!(
        result,
        Err(sandbox::Error::Invalid {
            field: "provider.runtimeBundle.sha256",
            ..
        })
    ));
}
