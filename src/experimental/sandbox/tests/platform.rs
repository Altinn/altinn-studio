use std::collections::BTreeSet;

use sandbox::Platform;

#[test]
fn resolved_platform_may_refine_unspecified_oci_constraints() {
    let requested = Platform::new("windows", "amd64");
    let mut resolved = requested.clone();
    resolved.os_version = Some("10.0.26100.0".into());
    resolved.os_features = BTreeSet::from(["win32k".into()]);

    assert!(resolved.satisfies(&requested));
    assert!(!requested.satisfies(&resolved));
}

#[test]
fn resolved_platform_must_preserve_requested_constraints() {
    let mut requested = Platform::new("linux", "arm64");
    requested.variant = Some("v8".into());
    requested.os_features = BTreeSet::from(["feature-a".into()]);
    let mut wrong_variant = requested.clone();
    wrong_variant.variant = Some("v9".into());
    let mut missing_feature = requested.clone();
    missing_feature.os_features.clear();

    assert!(!wrong_variant.satisfies(&requested));
    assert!(!missing_feature.satisfies(&requested));
}
