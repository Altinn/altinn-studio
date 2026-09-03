#![allow(clippy::expect_used)]

use sandbox_microsandbox::MicrosandboxProvider;
use tempfile::TempDir;

#[tokio::test(flavor = "local")]
async fn daemon_and_direct_attach_clients_can_open_the_same_microsandbox_home() {
    let directory = TempDir::new().expect("temporary directory");
    let daemon = MicrosandboxProvider::open(directory.path())
        .await
        .expect("daemon provider");
    let attach = MicrosandboxProvider::open(directory.path())
        .await
        .expect("direct attach provider");

    drop(attach);
    drop(daemon);
}
