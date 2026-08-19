#![allow(clippy::expect_used)]

use microsandbox_network::control::NETWORK_CONTROL_PROTOCOL;
use sandbox::{
    Platform, SandboxFeature,
    backend::SandboxBackend as _,
    network::{NetworkControlProtocolId, NetworkEndpointSelection},
};
use sandbox_microsandbox::MicrosandboxProvider;

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
}

#[tokio::test(flavor = "local")]
async fn cache_directory_can_be_shared_without_sharing_provider_state() {
    let temporary = tempfile::tempdir().expect("temporary home should be created");
    let shared_cache = temporary.path().join("shared-cache");
    let first_home = temporary.path().join("first-provider");
    let second_home = temporary.path().join("second-provider");

    let first = MicrosandboxProvider::builder(&first_home)
        .cache_directory(&shared_cache)
        .open()
        .await
        .expect("first Provider should open with the shared cache");
    let second = MicrosandboxProvider::builder(&second_home)
        .cache_directory(&shared_cache)
        .open()
        .await
        .expect("second Provider should open with the shared cache");

    assert_eq!(first.cache_directory(), shared_cache);
    assert_eq!(second.cache_directory(), shared_cache);
    assert!(shared_cache.is_dir());
    assert!(first_home.join("state/sandboxes").is_dir());
    assert!(second_home.join("state/sandboxes").is_dir());
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
