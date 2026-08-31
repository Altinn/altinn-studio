#![allow(clippy::expect_used)]

use std::path::{Path, PathBuf};

use sandbox::{
    Platform, RootFilesystemMode, RootFilesystemModeSet,
    image::{
        ImageBackend as _, ImageOperationCapabilities, ImageSource, ImageSourceKind, ImageSourceKindSet, ResolveRequest,
    },
    memory::MemoryImageBackend,
};

#[test]
fn build_source_resolves_only_its_context_from_the_manifest_directory() {
    let source = ImageSource::Build {
        context: PathBuf::from("image"),
        dockerfile: PathBuf::from("containers/Agent.Dockerfile"),
    };

    assert_eq!(
        source.resolve_from(Path::new("/manifests/worker")),
        ImageSource::Build {
            context: PathBuf::from("/manifests/worker/image"),
            dockerfile: PathBuf::from("containers/Agent.Dockerfile"),
        }
    );
}

#[test]
fn reference_source_is_independent_of_the_manifest_directory() {
    let source = ImageSource::Reference {
        reference: "ghcr.io/example/agent@sha256:1234".to_string(),
    };

    assert_eq!(source.resolve_from(Path::new("/manifests/worker")), source);
}

#[test]
fn image_source_has_an_explicit_serialized_variant() {
    let build: ImageSource = serde_json::from_value(serde_json::json!({
        "type": "build",
        "context": ".",
        "dockerfile": "Dockerfile"
    }))
    .expect("build source should decode");
    let reference: ImageSource = serde_json::from_value(serde_json::json!({
        "type": "reference",
        "reference": "docker.io/library/alpine:3.22"
    }))
    .expect("reference source should decode");

    assert!(matches!(build, ImageSource::Build { .. }));
    assert!(matches!(reference, ImageSource::Reference { .. }));
}

#[test]
fn image_operation_requires_at_least_one_source_and_mode() {
    assert!(
        ImageOperationCapabilities::new([ImageSourceKind::Reference].into(), [RootFilesystemMode::Direct].into(),)
            .is_available()
    );
    assert!(
        !ImageOperationCapabilities::new([ImageSourceKind::Reference].into(), RootFilesystemModeSet::default(),)
            .is_available()
    );
    assert!(
        !ImageOperationCapabilities::new(ImageSourceKindSet::default(), [RootFilesystemMode::Direct].into(),)
            .is_available()
    );
}

#[tokio::test(flavor = "local")]
async fn memory_images_have_deterministic_sha256_manifest_digests() {
    let backend = MemoryImageBackend;
    let request = ResolveRequest {
        source: ImageSource::Reference {
            reference: "registry.example/worker:latest".to_string(),
        },
        platform: Platform::new("linux", "amd64"),
        root_filesystem_mode: RootFilesystemMode::Layered,
    };

    let first = backend.resolve(&request).await.expect("image should resolve");
    let second = backend.resolve(&request).await.expect("image should resolve again");
    let digest = first
        .manifest_digest
        .strip_prefix("sha256:")
        .expect("manifest digest should use SHA-256");

    assert_eq!(first.manifest_digest, second.manifest_digest);
    assert_eq!(digest.len(), 64);
    assert!(
        digest
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    );

    let different_source = backend
        .resolve(&ResolveRequest {
            source: ImageSource::Reference {
                reference: "registry.example/other:latest".to_string(),
            },
            platform: request.platform.clone(),
            root_filesystem_mode: request.root_filesystem_mode,
        })
        .await
        .expect("another image should resolve");
    let different_platform = backend
        .resolve(&ResolveRequest {
            platform: Platform::new("linux", "arm64"),
            ..request
        })
        .await
        .expect("image should resolve for another platform");
    assert_ne!(first.manifest_digest, different_source.manifest_digest);
    assert_ne!(first.manifest_digest, different_platform.manifest_digest);
}
