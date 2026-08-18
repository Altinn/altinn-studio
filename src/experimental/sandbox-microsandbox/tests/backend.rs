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
