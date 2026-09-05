#![allow(clippy::expect_used)]

mod support;

#[cfg(unix)]
use std::path::Path;

use agent::{
    control_api::TcpEndpoint,
    local::contexts::{Contexts, Endpoint, LOCAL_CONTEXT},
};

use support::TempDirectory;

#[test]
fn absent_configuration_uses_the_implicit_local_context() {
    let temporary = TempDirectory::new("contexts-absent");
    let path = temporary.path().join("missing.yaml");
    let contexts = Contexts::load(&path).expect("absent configuration should load");

    assert_eq!(contexts.current(), LOCAL_CONTEXT);
    assert_eq!(
        contexts.select(None, None).expect("implicit context").endpoint(),
        &Endpoint::Local
    );
    assert!(!path.exists());
}

#[test]
fn context_mutations_follow_kubectl_replacement_and_selection_semantics() {
    let mut contexts = Contexts::default();
    let first = endpoint("tcp://first.example:7463");
    let replacement = endpoint("tcp://second.example:8463");

    contexts.set_tcp("mac-host", &first).expect("create context");
    contexts.use_context("mac-host").expect("select context");
    contexts
        .set_tcp("mac-host", &replacement)
        .expect("replace existing context");

    assert_eq!(contexts.current(), "mac-host");
    assert_eq!(
        contexts.select(None, None).expect("selected context").endpoint(),
        &Endpoint::Tcp(replacement)
    );

    contexts.delete_context("mac-host").expect("delete context");
    assert_eq!(contexts.current(), LOCAL_CONTEXT);
    assert!(contexts.delete_context(LOCAL_CONTEXT).is_err());
    assert!(contexts.set_tcp(LOCAL_CONTEXT, &first).is_err());
}

#[test]
fn command_line_and_environment_override_the_configured_context() {
    let mut contexts = Contexts::default();
    let first = endpoint("tcp://first.example:7463");
    let second = endpoint("tcp://second.example:7463");
    contexts.set_tcp("first", &first).expect("first context");
    contexts.set_tcp("second", &second).expect("second context");
    contexts.use_context("first").expect("configured context");

    assert_eq!(
        contexts
            .select(None, Some("second"))
            .expect("environment context")
            .name(),
        "second"
    );
    assert_eq!(
        contexts
            .select(Some(LOCAL_CONTEXT), Some("second"))
            .expect("command-line context")
            .endpoint(),
        &Endpoint::Local
    );
    assert!(contexts.select(Some("missing"), None).is_err());
}

#[test]
fn configuration_round_trips_and_replaces_atomically() {
    let temporary = TempDirectory::new("contexts-round-trip");
    let path = temporary.path().join("nested").join("config.yaml");
    let mut contexts = Contexts::default();
    contexts
        .set_tcp("mac-host", &endpoint("tcp://host.docker.internal:7463"))
        .expect("create context");
    contexts.use_context("mac-host").expect("select context");
    contexts.save(&path).expect("write configuration");

    let mut loaded = Contexts::load(&path).expect("read configuration");
    assert_eq!(loaded.current(), "mac-host");
    assert_eq!(
        loaded.tcp_contexts().collect::<Vec<_>>(),
        vec![("mac-host", "host.docker.internal:7463")]
    );

    loaded.use_context(LOCAL_CONTEXT).expect("select local");
    loaded.save(&path).expect("replace configuration");
    assert_eq!(
        Contexts::load(&path).expect("read replacement").current(),
        LOCAL_CONTEXT
    );
    assert_eq!(
        std::fs::read_dir(path.parent().expect("configuration parent"))
            .expect("read configuration directory")
            .count(),
        1
    );
}

#[test]
fn existing_invalid_configuration_never_falls_back_to_local() {
    let temporary = TempDirectory::new("contexts-invalid");
    let cases = [
        "kind: Config\napiVersion: wrong\n",
        "kind: Wrong\napiVersion: agents.platform/v1alpha1\n",
        "kind: Config\napiVersion: agents.platform/v1alpha1\nunknown: true\n",
        "kind: Config\napiVersion: agents.platform/v1alpha1\ncurrentContext: missing\n",
        "kind: Config\napiVersion: agents.platform/v1alpha1\ncontexts: invalid\n",
    ];

    for (index, contents) in cases.into_iter().enumerate() {
        let path = temporary.path().join(format!("invalid-{index}.yaml"));
        std::fs::write(&path, contents).expect("write invalid configuration");
        assert!(Contexts::load(&path).is_err(), "configuration {index} should fail");
    }
}

#[test]
fn tcp_endpoints_require_a_scheme_host_and_nonzero_port() {
    for valid in [
        "tcp://host.docker.internal:7463",
        "tcp://127.0.0.1:1",
        "tcp://[::1]:65535",
    ] {
        assert_eq!(endpoint(valid).to_string(), valid);
    }
    for invalid in [
        "host:7463",
        "tcp://",
        "tcp://host",
        "tcp://host:0",
        "tcp://host:65536",
        "tcp://host/path:7463",
        "tcp://::1:7463",
    ] {
        assert!(invalid.parse::<TcpEndpoint>().is_err(), "{invalid} should fail");
    }
}

#[cfg(unix)]
#[test]
fn configuration_directory_and_file_are_private() {
    let temporary = TempDirectory::new("contexts-permissions");
    let path = temporary.path().join("config").join("config.yaml");
    Contexts::default().save(&path).expect("write configuration");

    assert_eq!(mode(path.parent().expect("configuration parent")), 0o700);
    assert_eq!(mode(&path), 0o600);
}

#[cfg(unix)]
#[test]
fn configuration_does_not_change_permissions_of_an_existing_parent() {
    use std::os::unix::fs::PermissionsExt as _;

    let temporary = TempDirectory::new("contexts-existing-parent");
    let parent = temporary.path().join("shared");
    std::fs::create_dir(&parent).expect("create existing parent");
    std::fs::set_permissions(&parent, std::fs::Permissions::from_mode(0o755)).expect("set parent permissions");
    let path = parent.join("config.yaml");

    Contexts::default().save(&path).expect("write configuration");

    assert_eq!(mode(&parent), 0o755);
    assert_eq!(mode(&path), 0o600);
}

fn endpoint(value: &str) -> TcpEndpoint {
    value.parse().expect("valid TCP endpoint")
}

#[cfg(unix)]
fn mode(path: &Path) -> u32 {
    use std::os::unix::fs::PermissionsExt as _;

    std::fs::metadata(path).expect("path metadata").permissions().mode() & 0o777
}
