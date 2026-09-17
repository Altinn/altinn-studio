#![allow(clippy::expect_used)]

mod support;

use std::{collections::BTreeMap, path::PathBuf, rc::Rc};

use agent::{
    AccessSpec, AgentId, Error, FailureKind, ReconcileFailure,
    control_plane::{AgentRecord, AgentStore as _, memory::InMemoryAgentStore},
    local::home::ControlPlaneHome,
    ssh::{self, Access, memory::InMemoryHostKeyStore},
};
use sandbox::{
    EnsureSandboxRequest, Platform, SandboxHandle, SandboxPath, SandboxService,
    execution::{ExecutionEvent, ExecutionSpec, ExitStatus, Program},
    memory,
};
use tempfile::TempDir;
use tokio::io::AsyncReadExt as _;

const AGENTCTL: &str = "/usr/local/bin/agentctl";

fn command(spec: &ExecutionSpec) -> Option<(&str, Vec<&str>)> {
    match spec.program() {
        Program::Command { executable, args } => Some((executable.as_str(), args.iter().map(String::as_str).collect())),
        Program::ImageEntrypoint => None,
    }
}

fn is_command(spec: &ExecutionSpec, executable: &str, expected: &[&str]) -> bool {
    command(spec).is_some_and(|(actual, args)| actual == executable && args == expected)
}

fn is_server_check(spec: &ExecutionSpec) -> bool {
    is_command(spec, "/usr/bin/test", &["-x", "/usr/sbin/sshd"])
}

fn is_unit_check(spec: &ExecutionSpec) -> bool {
    is_command(spec, "/usr/bin/test", &["-f", "/etc/systemd/system/agent-ssh.service"])
}

fn is_systemd_running_check(spec: &ExecutionSpec) -> bool {
    is_command(spec, "/usr/bin/test", &["-d", "/run/systemd/system"])
}

fn is_disable(spec: &ExecutionSpec) -> bool {
    is_command(
        spec,
        "/usr/bin/sudo",
        &["-n", "/usr/bin/systemctl", "disable", "--now", "agent-ssh.service"],
    )
}

fn is_state_check(spec: &ExecutionSpec) -> bool {
    is_command(spec, "/usr/bin/test", &["-e", "/var/lib/agent/ssh"])
}

fn exited(code: i32) -> Vec<ExecutionEvent> {
    vec![
        ExecutionEvent::Started { process_id: None },
        ExecutionEvent::Exited(ExitStatus { code }),
    ]
}

fn count_sudo(backend: &memory::Provider, expected: &[&str]) -> usize {
    backend
        .execution_specs()
        .iter()
        .filter(|spec| is_command(spec, "/usr/bin/sudo", expected))
        .count()
}

async fn read_guest_file(sandbox: &SandboxHandle, path: &str) -> Option<Vec<u8>> {
    let mut reader = sandbox.read_file(&SandboxPath::new(path)).await.ok()?;
    let mut bytes = Vec::new();
    reader.read_to_end(&mut bytes).await.expect("guest file bytes");
    Some(bytes)
}

fn record(name: &str, id: &str, ssh: bool) -> AgentRecord {
    let mut resource = support::agent(name);
    resource.metadata.generation = 1;
    if ssh {
        resource.spec.access = vec![AccessSpec::Ssh {}];
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
    _directory: TempDir,
    home: ControlPlaneHome,
    store: Rc<InMemoryAgentStore>,
    keys: Rc<InMemoryHostKeyStore>,
    access: Access,
    backend: Rc<memory::Provider>,
}

impl Fixture {
    fn new() -> Self {
        let directory = TempDir::new().expect("temporary directory");
        let home = ControlPlaneHome::resolve(Some(&directory.path().join("agent-home"))).expect("home");
        home.prepare().expect("prepare home");
        let store = Rc::new(InMemoryAgentStore::new());
        let keys = Rc::new(InMemoryHostKeyStore::new());
        let access = Access::new(&home, PathBuf::from(AGENTCTL), keys.clone(), store.clone()).with_user_home(None);
        Self {
            _directory: directory,
            home,
            store,
            keys,
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

    fn ssh_home(&self) -> ssh::SshHome {
        ssh::SshHome::new(&self.home)
    }

    fn config(&self) -> String {
        std::fs::read_to_string(self.ssh_home().config_path()).expect("generated config")
    }

    fn known_hosts(&self) -> String {
        std::fs::read_to_string(self.ssh_home().known_hosts_path()).unwrap_or_default()
    }
}

#[tokio::test(flavor = "local")]
async fn access_is_idempotent_and_only_public_material_enters_the_guest() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    for _ in 0..2 {
        fixture
            .backend
            .queue_execution_events_matching(is_server_check, exited(0));
    }

    assert!(fixture.access.reconcile(&record, &sandbox).await.expect("first pass"));
    let host_key = read_guest_file(&sandbox, "/var/lib/agent/ssh/ssh_host_ed25519_key")
        .await
        .expect("host key in guest");
    let host_public = read_guest_file(&sandbox, "/var/lib/agent/ssh/ssh_host_ed25519_key.pub")
        .await
        .expect("host public key in guest");
    let authorized = read_guest_file(&sandbox, "/var/lib/agent/ssh/authorized_keys")
        .await
        .expect("authorized_keys in guest");
    let ssh_home = fixture.ssh_home();
    let client_private = std::fs::read_to_string(ssh_home.identity_path(record.id)).expect("client private key");
    let client_public = std::fs::read_to_string(ssh_home.public_identity_path(record.id)).expect("client public key");

    assert!(fixture.keys.contains(record.id));
    assert!(host_key.starts_with(b"-----BEGIN OPENSSH PRIVATE KEY-----"));
    assert!(client_private.starts_with("-----BEGIN OPENSSH PRIVATE KEY-----"));
    assert_ne!(host_key, client_private.as_bytes(), "host and client keys differ");
    assert_eq!(authorized, client_public.as_bytes());
    assert!(client_public.starts_with("ssh-ed25519 AAAA"));
    let host_public = String::from_utf8(host_public).expect("UTF-8 public key");
    assert_eq!(
        fixture.known_hosts(),
        format!(
            "agent-{id} {host_public}altinn-agent-worker {host_public}",
            id = record.id
        ),
        "known_hosts is pre-seeded under the incarnation alias and, for clients without HostKeyAlias, the Host alias"
    );
    let expected_config = format!(
        "\nHost altinn-agent-worker\n    User agent\n    ProxyCommand {AGENTCTL} ssh-proxy agent/worker\n    HostKeyAlias agent-{id}\n    IdentityFile {identity}\n    UserKnownHostsFile {known_hosts}\n    IdentitiesOnly yes\n",
        id = record.id,
        // The same renderer the config uses: on Windows the paths are quoted with escaped backslashes.
        identity = ssh::render_path(&ssh_home.identity_path(record.id), None),
        known_hosts = ssh::render_path(&ssh_home.known_hosts_path(), None),
    );
    assert!(fixture.config().ends_with(&expected_config), "{}", fixture.config());
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = |path: &std::path::Path| std::fs::metadata(path).expect("metadata").permissions().mode() & 0o777;
        assert_eq!(mode(&ssh_home.identity_path(record.id)), 0o600);
        assert_eq!(mode(&ssh_home.agent_directory(record.id)), 0o700);
        assert_eq!(mode(ssh_home.root()), 0o700);
    }
    let info = fixture.access.describe("worker").await.expect("descriptor");
    assert_eq!(info.alias, "altinn-agent-worker");
    assert_eq!(info.identity_file, ssh_home.identity_path(record.id));
    assert_eq!(info.proxy_command, format!("{AGENTCTL} ssh-proxy agent/worker"));

    assert!(fixture.access.reconcile(&record, &sandbox).await.expect("second pass"));
    assert_eq!(
        read_guest_file(&sandbox, "/var/lib/agent/ssh/ssh_host_ed25519_key").await,
        Some(host_key),
        "the incarnation keeps its host key"
    );
    assert_eq!(
        std::fs::read_to_string(ssh_home.identity_path(record.id)).expect("client key"),
        client_private,
        "the incarnation keeps its client key"
    );
    assert_eq!(fixture.known_hosts().lines().count(), 2);
    assert_eq!(
        count_sudo(
            &fixture.backend,
            &["-n", "/usr/bin/systemctl", "enable", "--now", "agent-ssh.service"]
        ),
        2
    );
    assert_eq!(
        count_sudo(
            &fixture.backend,
            &["-n", "/bin/chmod", "0600", "/var/lib/agent/ssh/ssh_host_ed25519_key"]
        ),
        2
    );
    let guest_files = [
        "/var/lib/agent/ssh/ssh_host_ed25519_key",
        "/var/lib/agent/ssh/ssh_host_ed25519_key.pub",
        "/var/lib/agent/ssh/authorized_keys",
    ];
    for path in guest_files {
        let contents = read_guest_file(&sandbox, path).await.expect("guest file");
        assert!(
            !String::from_utf8_lossy(&contents).contains(client_private.trim()),
            "{path} must not carry the client private key"
        );
    }
}

#[tokio::test(flavor = "local")]
async fn an_image_without_a_server_fails_permanently_before_any_key_exists() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    fixture
        .backend
        .queue_execution_events_matching(is_server_check, exited(1));

    let error = fixture
        .access
        .reconcile(&record, &sandbox)
        .await
        .expect_err("missing server");
    assert!(
        matches!(&error, Error::Invalid(message) if message.contains("cannot provide SSH access") && message.contains("/usr/sbin/sshd is missing") && message.contains("re-apply"))
    );
    assert_eq!(ReconcileFailure::classify(&error).kind, FailureKind::Invalid);
    assert!(!fixture.keys.contains(record.id));
    assert!(!fixture.ssh_home().agent_directory(record.id).exists());
    assert!(!fixture.ssh_home().known_hosts_path().exists());
    assert!(
        read_guest_file(&sandbox, "/var/lib/agent/ssh/authorized_keys")
            .await
            .is_none()
    );
}

#[tokio::test(flavor = "local")]
async fn an_image_without_the_unit_or_systemd_fails_permanently() {
    for (predicate, expected) in [
        (
            is_unit_check as fn(&ExecutionSpec) -> bool,
            "agent-ssh.service unit is missing",
        ),
        (is_systemd_running_check, "systemd is not the running init"),
    ] {
        let fixture = Fixture::new();
        let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
        fixture.store(&record, 0).await;
        let sandbox = fixture.sandbox(&record).await;
        fixture.backend.queue_execution_events_matching(predicate, exited(1));

        let error = fixture
            .access
            .reconcile(&record, &sandbox)
            .await
            .expect_err("incomplete image contract");
        assert!(
            matches!(&error, Error::Invalid(message) if message.contains(expected)),
            "{error}"
        );
        assert!(!fixture.keys.contains(record.id));
    }
}

#[tokio::test(flavor = "local")]
async fn a_failed_server_stop_keeps_the_state_for_the_next_pass() {
    let fixture = Fixture::new();
    let mut record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    assert!(fixture.access.reconcile(&record, &sandbox).await.expect("grant"));

    record.agent.spec.access.clear();
    record.agent.metadata.generation = 2;
    fixture.store(&record, 1).await;
    fixture.backend.queue_execution_events_matching(
        is_disable,
        vec![
            ExecutionEvent::Started { process_id: None },
            ExecutionEvent::Stderr("Failed to stop agent-ssh.service: Connection timed out\n".into()),
            ExecutionEvent::Exited(ExitStatus { code: 1 }),
        ],
    );
    let error = fixture
        .access
        .reconcile(&record, &sandbox)
        .await
        .expect_err("a running server is not forgotten");
    assert!(
        matches!(&error, Error::SandboxSetup(message) if message.contains("Connection timed out")),
        "{error}"
    );
    assert_eq!(
        count_sudo(&fixture.backend, &["-n", "/bin/rm", "-rf", "/var/lib/agent/ssh"]),
        0
    );
    assert!(
        read_guest_file(&sandbox, "/var/lib/agent/ssh/authorized_keys")
            .await
            .is_some(),
        "guest state stays until the server is confirmed stopped"
    );

    // A unit the image never shipped is the one failure that is not a running server.
    fixture.backend.queue_execution_events_matching(
        is_disable,
        vec![
            ExecutionEvent::Started { process_id: None },
            ExecutionEvent::Stderr("Failed to disable unit: Unit file agent-ssh.service does not exist.\n".into()),
            ExecutionEvent::Exited(ExitStatus { code: 1 }),
        ],
    );
    assert!(!fixture.access.reconcile(&record, &sandbox).await.expect("withdraw"));
    assert_eq!(
        count_sudo(&fixture.backend, &["-n", "/bin/rm", "-rf", "/var/lib/agent/ssh"]),
        1
    );
}

#[tokio::test(flavor = "local")]
async fn withdrawing_access_without_systemd_removes_only_the_files() {
    let fixture = Fixture::new();
    let record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", false);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    fixture
        .backend
        .queue_execution_events_matching(is_state_check, exited(0));
    fixture
        .backend
        .queue_execution_events_matching(is_systemd_running_check, exited(1));
    assert!(!fixture.access.reconcile(&record, &sandbox).await.expect("withdraw"));
    assert!(!fixture.backend.execution_specs().iter().any(is_disable));
    assert_eq!(
        count_sudo(&fixture.backend, &["-n", "/bin/rm", "-rf", "/var/lib/agent/ssh"]),
        1
    );
}

#[tokio::test(flavor = "local")]
async fn withdrawing_access_removes_guest_and_host_state() {
    let fixture = Fixture::new();
    let mut record = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&record, 0).await;
    let sandbox = fixture.sandbox(&record).await;
    fixture
        .backend
        .queue_execution_events_matching(is_server_check, exited(0));
    assert!(fixture.access.reconcile(&record, &sandbox).await.expect("grant"));

    record.agent.spec.access.clear();
    record.agent.metadata.generation = 2;
    fixture.store(&record, 1).await;
    fixture
        .backend
        .queue_execution_events_matching(is_state_check, exited(0));
    assert!(!fixture.access.reconcile(&record, &sandbox).await.expect("withdraw"));

    assert_eq!(
        count_sudo(
            &fixture.backend,
            &["-n", "/usr/bin/systemctl", "disable", "--now", "agent-ssh.service"]
        ),
        1
    );
    assert_eq!(
        count_sudo(&fixture.backend, &["-n", "/bin/rm", "-rf", "/var/lib/agent/ssh"]),
        1
    );
    assert!(!fixture.keys.contains(record.id));
    assert!(!fixture.ssh_home().agent_directory(record.id).exists());
    assert_eq!(fixture.known_hosts(), "");
    assert!(!fixture.config().contains("Host "));

    // A later pass finds no guest state and leaves systemd alone.
    fixture
        .backend
        .queue_execution_events_matching(is_state_check, exited(1));
    assert!(!fixture.access.reconcile(&record, &sandbox).await.expect("steady"));
    assert_eq!(
        count_sudo(
            &fixture.backend,
            &["-n", "/usr/bin/systemctl", "disable", "--now", "agent-ssh.service"]
        ),
        1
    );
}

#[tokio::test(flavor = "local")]
async fn deletion_removes_host_material_and_config_lists_only_active_ssh_agents() {
    let fixture = Fixture::new();
    let worker = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    let reviewer = record("reviewer", "5c1f4a1e-0ad5-4a37-9c94-4c0f2e6d7a10", true);
    let plain = record("plain", "9e2d6b5a-3d3a-4a2b-8a3c-1f9d2c3b4a55", false);
    let mut leaving = record("leaving", "0b7e2f31-6a94-4d0e-9d61-3ac7d1a2b3c4", true);
    leaving.agent.metadata.deletion_timestamp = Some(time::OffsetDateTime::now_utc());
    for record in [&worker, &reviewer, &plain, &leaving] {
        fixture.store(record, 0).await;
    }
    let sandbox = fixture.sandbox(&worker).await;
    fixture
        .backend
        .queue_execution_events_matching(is_server_check, exited(0));
    assert!(fixture.access.reconcile(&worker, &sandbox).await.expect("grant"));

    let aliases = fixture
        .config()
        .lines()
        .filter_map(|line| line.strip_prefix("Host "))
        .map(str::to_owned)
        .collect::<Vec<_>>();
    assert_eq!(aliases, ["altinn-agent-reviewer", "altinn-agent-worker"]);

    assert!(matches!(
        fixture.access.describe("plain").await,
        Err(Error::Invalid(message)) if message.contains("does not declare SSH access")
    ));
    assert!(matches!(fixture.access.describe("nobody").await, Err(Error::NotFound)));

    fixture.access.remove(&worker).await.expect("remove on deletion");
    assert!(!fixture.keys.contains(worker.id));
    assert!(!fixture.ssh_home().agent_directory(worker.id).exists());
    assert_eq!(fixture.known_hosts(), "");
    fixture.access.remove(&worker).await.expect("removal is idempotent");
}

#[tokio::test(flavor = "local")]
async fn descriptor_json_is_the_documented_shape() {
    let fixture = Fixture::new();
    let worker = record("worker", "38f41de4-6ff7-4679-ae46-678bc61e4dcb", true);
    fixture.store(&worker, 0).await;
    let info = fixture.access.describe("worker").await.expect("descriptor");
    let value = serde_json::to_value(&info).expect("JSON");
    let object = value.as_object().expect("object");
    let mut expected = [
        "type",
        "agent",
        "agentId",
        "alias",
        "user",
        "identityFile",
        "knownHostsFile",
        "configFile",
        "proxyCommand",
    ];
    expected.sort_unstable();
    assert_eq!(object.keys().map(String::as_str).collect::<Vec<_>>(), expected);
    assert_eq!(value["type"], "ssh");
    assert_eq!(value["agent"], "worker");
    assert_eq!(value["agentId"], "38f41de4-6ff7-4679-ae46-678bc61e4dcb");
    assert_eq!(value["alias"], "altinn-agent-worker");
    assert_eq!(value["user"], "agent");
    assert_eq!(value["proxyCommand"], format!("{AGENTCTL} ssh-proxy agent/worker"));
    let decoded: ssh::AccessInfo = serde_json::from_value(value).expect("round trip");
    assert_eq!(decoded, info);
}

fn repository_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn sshd_directives(text: &str) -> BTreeMap<String, Vec<String>> {
    let mut directives = BTreeMap::<String, Vec<String>>::new();
    for line in text.lines().map(str::trim) {
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let (key, value) = line.split_once(char::is_whitespace).expect("directive with a value");
        directives
            .entry(key.to_owned())
            .or_default()
            .push(value.trim().to_owned());
    }
    directives
}

#[test]
fn image_sshd_policy_is_hardened_and_shared_by_every_image() {
    let root = repository_root();
    let published = root.join("agents/common");
    let self_dev = root.join("src/experimental/agent/examples/self-dev");
    for file in ["sshd_config", "ssh.service", "ssh-tmpfiles.conf"] {
        assert_eq!(
            std::fs::read_to_string(published.join(file)).expect(file),
            std::fs::read_to_string(self_dev.join(file)).expect(file),
            "{file} must be identical in agents/common and the self-dev example"
        );
    }

    let config = std::fs::read_to_string(published.join("sshd_config")).expect("sshd_config");
    let directives = sshd_directives(&config);
    let single = |key: &str| {
        let values = directives.get(key).unwrap_or_else(|| panic!("{key} is set"));
        assert_eq!(values.len(), 1, "{key} is set once");
        values[0].as_str()
    };
    assert_eq!(single("ListenAddress"), "127.0.0.1");
    assert_eq!(single("Port"), ssh::GUEST_PORT.to_string());
    assert_eq!(single("PubkeyAuthentication"), "yes");
    assert_eq!(single("PasswordAuthentication"), "no");
    assert_eq!(single("KbdInteractiveAuthentication"), "no");
    assert_eq!(single("PermitRootLogin"), "no");
    assert_eq!(single("AllowUsers"), ssh::GUEST_USER);
    assert_eq!(single("AllowAgentForwarding"), "no");
    assert_eq!(single("X11Forwarding"), "no");
    assert_eq!(single("PermitTunnel"), "no");
    assert_eq!(single("AllowTcpForwarding"), "yes");
    assert_eq!(single("Subsystem"), "sftp internal-sftp");
    assert_eq!(single("HostKey"), "/var/lib/agent/ssh/ssh_host_ed25519_key");
    assert_eq!(single("AuthorizedKeysFile"), "/var/lib/agent/ssh/authorized_keys");
    assert!(
        !directives.contains_key("Include"),
        "the policy is not overridable by drop-ins"
    );

    let unit = std::fs::read_to_string(published.join("ssh.service")).expect("ssh.service");
    assert!(unit.contains("ConditionPathExists=/var/lib/agent/ssh/ssh_host_ed25519_key"));
    assert!(unit.contains("ExecStart=/usr/sbin/sshd -D -e -f /etc/agent/sshd_config"));
    assert!(unit.contains("WantedBy=multi-user.target"));
    let tmpfiles = std::fs::read_to_string(published.join("ssh-tmpfiles.conf")).expect("tmpfiles");
    assert!(tmpfiles.lines().any(|line| line.starts_with("d /run/sshd ")));

    let dockerfile = std::fs::read_to_string(root.join("agents/Dockerfile")).expect("Dockerfile");
    let base_stage = dockerfile.split("FROM base AS minimal").next().expect("base stage");
    assert!(base_stage.contains("openssh-server"));
    assert!(base_stage.contains("COPY common/ssh.service /etc/systemd/system/agent-ssh.service"));
    assert!(base_stage.contains("systemctl mask ssh.service ssh.socket"));
    for manifest in [
        "agents/full/agent.yaml",
        "agents/minimal/agent.yaml",
        "agents/worktree/agent.yaml",
        "src/experimental/agent/examples/self-dev/checkout/agent.yaml",
        "src/experimental/agent/examples/self-dev/nested/agent.yaml",
        "src/experimental/agent/examples/self-dev/worktree/agent.yaml",
    ] {
        let bytes = std::fs::read(root.join(manifest)).expect(manifest);
        let decoded = agent::manifest::decode(&bytes).unwrap_or_else(|error| panic!("{manifest}: {error}"));
        assert!(decoded.spec.ssh_access(), "{manifest} declares SSH access");
    }
}
