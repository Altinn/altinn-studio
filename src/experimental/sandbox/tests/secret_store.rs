#![allow(clippy::expect_used)]

use sandbox::{
    Error,
    memory::MemorySecretStore,
    secret_store::{SecretMaterial, SecretStore as _},
};

#[tokio::test(flavor = "local")]
async fn rotating_a_secret_preserves_its_reference() {
    let store = MemorySecretStore::default();
    let reference = store.set("provider-token", b"first").await.expect("store secret");

    assert_eq!(
        store
            .resolve(&reference)
            .await
            .expect("resolve initial secret")
            .expose(),
        b"first"
    );

    let rotated = store.set("provider-token", b"second").await.expect("rotate secret");

    assert_eq!(rotated, reference);
    assert_eq!(
        store
            .resolve(&reference)
            .await
            .expect("resolve rotated secret")
            .expose(),
        b"second"
    );
}

#[tokio::test(flavor = "local")]
async fn resolving_an_unknown_reference_fails_closed() {
    let store = MemorySecretStore::default();
    let reference = store.set("known", b"value").await.expect("store secret");
    let unknown = sandbox::secret_store::SecretReference::from_opaque("unknown");

    assert!(matches!(store.resolve(&unknown).await, Err(Error::NotFound { .. })));
    assert_ne!(reference, unknown);
}

#[test]
fn secret_material_debug_output_is_redacted() {
    let material = SecretMaterial::new(b"must-not-appear".to_vec());

    let debug = format!("{material:?}");

    assert_eq!(debug, "SecretMaterial([REDACTED])");
    assert!(!debug.contains("must-not-appear"));
}
