#![allow(clippy::expect_used)]

mod support;

use std::{path::PathBuf, rc::Rc};

use agent::{
    AccessSpec, AgentId, Error, FailureKind, ReconcileFailure,
    control_plane::{AgentRecord, AgentStore as _, memory::InMemoryAgentStore},
    vnc::Access,
};
use sandbox::{
    EnsureSandboxRequest, Platform, SandboxHandle, SandboxService,
    execution::{ExecutionEvent, ExecutionSpec, ExitStatus, Program},
    memory,
};

const AGENTCTL: &str = "/usr/local/bin/agentctl";
const DESCRIPTOR: &str = "/etc/agent-access.d/vnc.conf";
const UNITS: [&str; 2] = ["agent-vnc.socket", "agent-vnc-web.service"];

fn command(spec: &ExecutionSpec) -> Option<(&str, Vec<&str>)> {
    match spec.program() {
        Program::Command { executable, args } => Some((executable.as_str(), args.iter().map(String::as_str).collect())),
        Program::ImageEntrypoint => None,
    }
}

fn is_command(spec: &ExecutionSpec, executable: &str, expected: &[&str]) -> bool {
    command(spec).is_some_and(|(actual, args)| actual == executable && args == expected)
}

fn is_test(path: &'static str, test: &'static str) -> impl Fn(&ExecutionSpec) -> bool {
    move |spec| is_command(spec, "/usr/bin/test", &[test, path])
}

fn is_descriptor_read(spec: &ExecutionSpec) -> bool {
    is_command(spec, "/bin/cat", &[DESCRIPTOR])
}

fn is_listener_check(port: u16) -> impl Fn(&ExecutionSpec) -> bool {
    move |spec| {
        command(spec).is_some_and(|(executable, args)| {
            executable == "/usr/bin/ss" && args == ["-ltnH", "sport", "=", &format!(":{port}")]
        })
    }
}

fn is_enable(spec: &ExecutionSpec) -> bool {
    is_command(
        spec,
        "/usr/bin/sudo",
        &["-n", "/usr/bin/systemctl", "enable", "--now", UNITS[0], UNITS[1]],
    )
}

fn is_disable(spec: &ExecutionSpec) -> bool {
    is_command(
        spec,
        "/usr/bin/sudo",
        &["-n", "/usr/bin/systemctl", "disable", "--now", UNITS[0], UNITS[1]],
    )
}

fn is_active_check(spec: &ExecutionSpec) -> bool {
    is_command(
        spec,
        "/usr/bin/sudo",
        &["-n", "/usr/bin/systemctl", "is-active", UNITS[0], UNITS[1]],
    )
}

fn is_any_listener_check(spec: &ExecutionSpec) -> bool {
    command(spec).is_some_and(|(executable, _)| executable == "/usr/bin/ss")
}

fn exited(code: i32) -> Vec<ExecutionEvent> {
    vec![
        ExecutionEvent::Started { process_id: None },
        ExecutionEvent::Exited(ExitStatus { code }),
    ]
}

fn output(contents: &'static [u8]) -> Vec<ExecutionEvent> {
    vec![
        ExecutionEvent::Started { process_id: None },
        ExecutionEvent::Stdout(contents.into()),
        ExecutionEvent::Exited(ExitStatus { code: 0 }),
    ]
}

fn valid_descriptor() -> Vec<ExecutionEvent> {
    output(b"units=agent-vnc.socket agent-vnc-web.service\nport=5900\nweb-port=6080\n")
}

/// Answers every image-contract probe affirmatively and hands back the descriptor.
fn queue_desktop_image(backend: &memory::Provider) {
    for path in ["/usr/bin/systemctl", "/usr/bin/ss"] {
        backend.queue_execution_events_matching(is_test(path, "-x"), exited(0));
    }
    backend.queue_execution_events_matching(is_test("/run/systemd/system", "-d"), exited(0));
    backend.queue_execution_events_matching(is_test(DESCRIPTOR, "-f"), exited(0));
    backend.queue_execution_events_matching(is_descriptor_read, valid_descriptor());
}

fn queue_listening(backend: &memory::Provider, listening: bool) {
    for port in [5900u16, 6080] {
        let events = if listening {
            output(b"LISTEN 0 0 127.0.0.1:port 0.0.0.0:*\n")
        } else {
            output(b"")
        };
        backend.queue_execution_events_matching(is_listener_check(port), events);
    }
}

fn record(name: &str, id: &str, vnc: bool) -> AgentRecord {
    let mut resource = support::agent(name);
    resource.metadata.generation = 1;
    if vnc {
        resource.spec.access = vec![AccessSpec::Vnc {}];
    }
    AgentRecord {
        id: id.parse::<AgentId>().expect("Agent ID"),
        source_directory: PathBuf::from("/source").join(name),
        manifest_path: None,
        env_file: None,
        agent: resource,
    }
}

struct Fixture {
    store: Rc<InMemoryAgentStore>,
    access: Access,
    backend: Rc<memory::Provider>,
}

impl Fixture {
    fn new() -> Self {
        let store = Rc::new(InMemoryAgentStore::new());
        let access = Access::new(PathBuf::from(AGENTCTL), store.clone());
        Self {
            store,
            access,
            backend: Rc::new(memory::Provider::new()),
        }
    }

    async fn store(&self, record: &AgentRecord, expected_generation: u64) {
        self.store
            .put(record.clone(), expected_generation)
            .await
            .expect("store record");
    }

    async fn sandbox(&self, record: &AgentRecord) -> SandboxHandle {
        let service = SandboxService::new(self.backend.clone());
        let spec = record
            .agent
            .spec
            .sandbox
            .resolve_from(&record.source_directory, &Platform::native("linux").architecture);
        service
            .ensure(&EnsureSandboxRequest::new(
                record.sandbox_name().expect("Sandbox name"),
                spec,
            ))
            .await
            .expect("Sandbox")
    }
}

#[tokio::test(flavor = "local")]
async fn granting_access_enables_the_units_the_image_declared() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    queue_desktop_image(&fixture.backend);
    queue_listening(&fixture.backend, true);

    assert!(fixture.access.reconcile(&record, &sandbox).await.expect("grant"));

    assert_eq!(
        fixture
            .access
            .describe("worker")
            .await
            .expect("described")
            .web_guest_port,
        Some(6080),
        "a granted Agent reports the viewer port its image declared"
    );
    assert!(
        fixture.backend.execution_specs().iter().any(is_enable),
        "the units named by the image are enabled, and no unit file is written"
    );
    assert!(
        !fixture
            .backend
            .execution_specs()
            .iter()
            .any(|spec| command(spec).is_some_and(|(executable, _)| executable == "/bin/chmod")),
        "the units belong to the image, so nothing here installs or chmods one"
    );
}

#[tokio::test(flavor = "local")]
async fn an_image_offering_no_browser_viewer_is_granted_and_described_without_one() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    for path in ["/usr/bin/systemctl", "/usr/bin/ss"] {
        fixture
            .backend
            .queue_execution_events_matching(is_test(path, "-x"), exited(0));
    }
    fixture
        .backend
        .queue_execution_events_matching(is_test("/run/systemd/system", "-d"), exited(0));
    fixture
        .backend
        .queue_execution_events_matching(is_test(DESCRIPTOR, "-f"), exited(0));
    fixture
        .backend
        .queue_execution_events_matching(is_descriptor_read, output(b"units=agent-vnc.socket\nport=5900\n"));
    fixture.backend.queue_execution_events_matching(
        is_listener_check(5900),
        output(b"LISTEN 0 0 127.0.0.1:5900 0.0.0.0:*\n"),
    );

    assert!(fixture.access.reconcile(&record, &sandbox).await.expect("grant"));
    assert!(
        !fixture
            .backend
            .execution_specs()
            .iter()
            .any(|spec| is_listener_check(6080)(spec)),
        "a port the image never promised is not checked"
    );
    let info = fixture.access.describe("worker").await.expect("declared access");
    assert_eq!(
        info.web_guest_port, None,
        "the descriptor reports the absence rather than a port that serves nothing"
    );
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn a_viewer_that_binds_its_port_after_being_enabled_is_waited_for() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    queue_desktop_image(&fixture.backend);
    fixture.backend.queue_execution_events_matching(
        is_listener_check(5900),
        output(b"LISTEN 0 0 127.0.0.1:5900 0.0.0.0:*\n"),
    );
    // systemd reports a simple service started once it has forked, before it has bound its port.
    fixture
        .backend
        .queue_execution_events_matching(is_listener_check(6080), output(b""));
    fixture.backend.queue_execution_events_matching(
        is_listener_check(6080),
        output(b"LISTEN 0 0 127.0.0.1:6080 0.0.0.0:*\n"),
    );

    assert!(fixture.access.reconcile(&record, &sandbox).await.expect("grant"));
    assert_eq!(
        fixture
            .backend
            .execution_specs()
            .iter()
            .filter(|spec| is_listener_check(6080)(spec))
            .count(),
        2,
        "the viewer port is checked again rather than failing the pass"
    );
}

#[tokio::test(flavor = "local", start_paused = true)]
async fn a_grant_that_leaves_a_declared_port_silent_is_a_failure() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    queue_desktop_image(&fixture.backend);
    fixture
        .backend
        .queue_execution_events_matching(is_listener_check(5900), output(b""));

    let error = fixture
        .access
        .reconcile(&record, &sandbox)
        .await
        .expect_err("a silent port is an error");
    assert!(
        error
            .to_string()
            .contains("nothing is listening on guest port 5900 after 10s"),
        "{error}"
    );
}

#[tokio::test(flavor = "local")]
async fn withdrawing_access_disables_the_units_and_proves_they_stopped() {
    let fixture = Fixture::new();
    let withdrawn = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", false);
    fixture.store(&withdrawn, 0).await;
    let sandbox = fixture.sandbox(&withdrawn).await;
    queue_withdrawable_image(&fixture.backend);
    // The Agent's own server on the viewer port is none of withdrawal's business.
    queue_listening(&fixture.backend, true);

    assert!(!fixture.access.reconcile(&withdrawn, &sandbox).await.expect("withdraw"));
    let specs = fixture.backend.execution_specs();
    assert!(
        specs.iter().any(is_disable),
        "the declared units are disabled and stopped"
    );
    assert!(specs.iter().any(is_active_check), "the units are confirmed inactive");
    assert!(
        !specs.iter().any(is_any_listener_check),
        "once access is withdrawn the declared ports are ordinary guest ports"
    );
}

/// Answers a withdrawal's probes: systemd running and a desktop image's descriptor.
fn queue_withdrawable_image(backend: &memory::Provider) {
    backend.queue_execution_events_matching(is_test("/usr/bin/systemctl", "-x"), exited(0));
    backend.queue_execution_events_matching(is_test("/run/systemd/system", "-d"), exited(0));
    backend.queue_execution_events_matching(is_test(DESCRIPTOR, "-f"), exited(0));
    backend.queue_execution_events_matching(is_descriptor_read, valid_descriptor());
    backend.queue_execution_events_matching(is_active_check, output(b"inactive\ninactive\n"));
}

#[tokio::test(flavor = "local")]
async fn a_withdrawal_that_succeeded_is_not_repeated_until_the_incarnation_is_forgotten() {
    let fixture = Fixture::new();
    let withdrawn = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", false);
    fixture.store(&withdrawn, 0).await;
    let sandbox = fixture.sandbox(&withdrawn).await;
    let disables = || {
        fixture
            .backend
            .execution_specs()
            .iter()
            .filter(|spec| is_disable(spec))
            .count()
    };

    queue_withdrawable_image(&fixture.backend);
    assert!(!fixture.access.reconcile(&withdrawn, &sandbox).await.expect("withdraw"));
    let probes = fixture.backend.execution_specs().len();
    assert!(!fixture.access.reconcile(&withdrawn, &sandbox).await.expect("resync"));
    assert_eq!(
        fixture.backend.execution_specs().len(),
        probes,
        "a resync after a successful withdrawal runs nothing in the guest"
    );
    assert_eq!(disables(), 1);

    fixture.access.forget(withdrawn.id);
    queue_withdrawable_image(&fixture.backend);
    assert!(
        !fixture
            .access
            .reconcile(&withdrawn, &sandbox)
            .await
            .expect("withdraw again")
    );
    assert_eq!(disables(), 2, "a forgotten incarnation is withdrawn again");
}

#[tokio::test(flavor = "local")]
async fn a_unit_still_active_after_withdrawal_is_reported() {
    let fixture = Fixture::new();
    let withdrawn = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", false);
    fixture.store(&withdrawn, 0).await;
    let sandbox = fixture.sandbox(&withdrawn).await;
    fixture
        .backend
        .queue_execution_events_matching(is_active_check, output(b"inactive\nactive\n"));
    queue_withdrawable_image(&fixture.backend);

    let error = fixture
        .access
        .reconcile(&withdrawn, &sandbox)
        .await
        .expect_err("a surviving unit is an error");
    assert!(
        error.to_string().contains("agent-vnc-web.service is active"),
        "withdrawal is verified rather than assumed: {error}"
    );
}

#[tokio::test(flavor = "local")]
async fn an_image_that_declares_no_vnc_access_is_reported_as_an_image_problem() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    for path in ["/usr/bin/systemctl", "/usr/bin/ss"] {
        fixture
            .backend
            .queue_execution_events_matching(is_test(path, "-x"), exited(0));
    }
    fixture
        .backend
        .queue_execution_events_matching(is_test("/run/systemd/system", "-d"), exited(0));
    fixture
        .backend
        .queue_execution_events_matching(is_test(DESCRIPTOR, "-f"), exited(1));

    let error = fixture
        .access
        .reconcile(&record, &sandbox)
        .await
        .expect_err("a missing descriptor is an error");
    assert!(matches!(error, Error::Invalid(_)), "{error:?}");
    let message = error.to_string();
    assert!(message.contains("/etc/agent-access.d/vnc.conf is missing"), "{message}");
    assert!(
        message.contains("remove `vnc` from spec.access"),
        "the message names the remedies: {message}"
    );
    assert_eq!(
        ReconcileFailure::classify(&error).kind,
        FailureKind::Invalid,
        "an immutable image cannot be fixed by retrying"
    );
}

#[tokio::test(flavor = "local")]
async fn a_descriptor_declaring_the_wrong_port_is_refused() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    for path in ["/usr/bin/systemctl", "/usr/bin/ss"] {
        fixture
            .backend
            .queue_execution_events_matching(is_test(path, "-x"), exited(0));
    }
    fixture
        .backend
        .queue_execution_events_matching(is_test("/run/systemd/system", "-d"), exited(0));
    fixture
        .backend
        .queue_execution_events_matching(is_test(DESCRIPTOR, "-f"), exited(0));
    fixture.backend.queue_execution_events_matching(
        is_descriptor_read,
        output(b"units=agent-vnc.socket\nport=5901\nweb-port=6080\n"),
    );

    let error = fixture
        .access
        .reconcile(&record, &sandbox)
        .await
        .expect_err("a port the caller could not be told about is an error");
    assert!(
        error.to_string().contains("but VNC access uses guest port 5900"),
        "{error}"
    );
}

#[tokio::test(flavor = "local")]
async fn an_image_without_the_descriptor_is_left_alone_when_no_access_is_declared() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", false);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    fixture
        .backend
        .queue_execution_events_matching(is_test("/usr/bin/systemctl", "-x"), exited(0));
    fixture
        .backend
        .queue_execution_events_matching(is_test("/run/systemd/system", "-d"), exited(0));
    fixture
        .backend
        .queue_execution_events_matching(is_test(DESCRIPTOR, "-f"), exited(1));

    assert!(!fixture.access.reconcile(&record, &sandbox).await.expect("pass"));
    assert!(
        !fixture.backend.execution_specs().iter().any(is_disable),
        "an image with no VNC access to withdraw is not touched"
    );
}

#[tokio::test(flavor = "local")]
async fn describing_an_agent_without_declared_access_names_the_remedy() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", false);
    fixture.store(&record, 0).await;

    let error = fixture.access.describe("worker").await.expect_err("no declared access");
    assert!(error.to_string().contains("access: [{type: vnc}]"), "{error}");

    let declared = self::record("viewer", "9a5b0a5a-6a4f-4f22-9f2a-2d1a3c4b5e6f", true);
    fixture.store(&declared, 0).await;
    let info = fixture.access.describe("viewer").await.expect("declared access");
    assert_eq!(info.kind, "vnc");
    assert_eq!(info.guest_port, 5900);
    assert_eq!(
        info.web_guest_port, None,
        "which ports the image offers is observed, so it is unknown until a pass has looked"
    );
    assert_eq!(
        info.forward_command,
        format!("{AGENTCTL} port-forward agent/viewer 5900")
    );
}
