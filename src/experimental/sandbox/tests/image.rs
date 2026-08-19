#![allow(clippy::expect_used)]

use std::path::{Path, PathBuf};

use sandbox::{
    RootFilesystemMode, RootFilesystemModeSet,
    image::{ImageOperationCapabilities, ImageSource, ImageSourceKind, ImageSourceKindSet},
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
