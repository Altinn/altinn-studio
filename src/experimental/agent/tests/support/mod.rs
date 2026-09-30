#![allow(dead_code)]

use std::{path::PathBuf, rc::Rc};

use agent::{
    API_VERSION, Agent, Harness, HarnessAuthMode, HarnessSpec, HomeSpec, InstructionsSpec, KIND, Metadata,
    ModelSelection, NetworkAllow, NetworkMode, NetworkSpec, PlatformManifestSpec, SandboxManifestSpec, Spec, Status,
};
use sandbox::{
    ByteQuantity, CpuQuantity, Platform, RetentionPolicy, RootFilesystem, SandboxResources, image::ImageSource,
};
pub(crate) fn agent(name: &str) -> Agent {
    Agent {
        api_version: API_VERSION.into(),
        kind: KIND.into(),
        metadata: Metadata {
            uid: None,
            name: name.into(),
            generation: 0,
            deletion_timestamp: None,
        },
        spec: Spec {
            sandbox: SandboxManifestSpec {
                image: ImageSource::Build {
                    context: PathBuf::from("image"),
                    dockerfile: PathBuf::from("Dockerfile"),
                    target: None,
                },
                platform: PlatformManifestSpec {
                    os: "linux".into(),
                    architecture: Some(Platform::native("linux").architecture),
                    variant: None,
                    os_version: None,
                    os_features: std::collections::BTreeSet::new(),
                },
                resources: SandboxResources::new(
                    "2".parse::<CpuQuantity>().expect("test CPU should be valid"),
                    "1Gi".parse::<ByteQuantity>().expect("test memory should be valid"),
                    RootFilesystem::layered(
                        "4Gi"
                            .parse::<ByteQuantity>()
                            .expect("test root filesystem should be valid"),
                    ),
                ),
                init_system: sandbox::init::InitSystem::Backend,
                retention_policy: Some(RetentionPolicy::Retain),
                mounts: Vec::new(),
            },
            home: HomeSpec {
                source: PathBuf::from("home"),
            },
            instructions: vec![InstructionsSpec {
                source: PathBuf::from("instructions.md"),
            }],
            skills: vec![],
            harnesses: vec![HarnessSpec {
                kind: Harness::ClaudeCode,
                version: Some("2.1.266".into()),
                auth: HarnessAuthMode::Mediated,
                optional: false,
                default: false,
                defaults: ModelSelection::default(),
            }],
            environment: Vec::new(),
            secrets: Vec::new(),
            access: Vec::new(),
            network: NetworkSpec {
                mode: NetworkMode::Mediated,
                allow: NetworkAllow::All,
                deny: Vec::new(),
            },
        },
        status: Status::default(),
    }
}

pub(crate) struct TempDirectory(tempfile::TempDir);

impl TempDirectory {
    pub(crate) fn new(label: &str) -> Self {
        Self(
            tempfile::Builder::new()
                .prefix(&format!("agent-platform-{label}-"))
                .tempdir()
                .expect("temporary directory should be created"),
        )
    }

    pub(crate) fn path(&self) -> &std::path::Path {
        self.0.path()
    }
}

/// Serves a Control API server over in-memory streams, one per call, as
/// agentd serves agentctl over its socket.
pub(crate) struct InProcess(pub(crate) Rc<agent::control_api::Server>);

impl agent::control_api::Connector for InProcess {
    fn connect(&self) -> sandbox::LocalFuture<'_, Result<Box<dyn agent::control_api::Connection>, agent::Error>> {
        Box::pin(async move {
            let (client, server) = tokio::io::duplex(64 * 1024);
            let api = self.0.clone();
            tokio::task::spawn_local(async move {
                let _ignored = api.serve_connection(server).await;
            });
            Ok(Box::new(client) as Box<dyn agent::control_api::Connection>)
        })
    }
}

/// A client of a server over `agents`, `executions` and `sessions`, whose
/// watches follow `changes`. Authentication and access are unreachable.
pub(crate) fn in_process_client(
    agents: Rc<dyn agent::control_api::AgentApi>,
    executions: Rc<dyn agent::control_api::ExecutionApi>,
    sessions: Rc<dyn agent::control_api::SessionApi>,
    changes: agent::resources::Changes,
) -> agent::control_api::Client {
    let server = agent::control_api::Server::new(
        agents,
        Rc::new(Unreachable),
        executions,
        sessions,
        Rc::new(Unreachable),
        Rc::new(Unreachable),
        changes,
        // A failed connection reaches the client that made it.
        Rc::new(|_error| {}),
    );
    agent::control_api::Client::new(Rc::new(InProcess(Rc::new(server))))
}

/// Every API a test does not reach, and a notifier that wakes nothing.
pub(crate) struct Unreachable;

type Reply<'a, T> = sandbox::LocalFuture<'a, Result<T, agent::Error>>;

fn unreachable<'a, T: 'a>() -> Reply<'a, T> {
    Box::pin(async { Err(agent::Error::NotFound) })
}

impl agent::control_api::AuthenticationApi for Unreachable {
    fn login<'a>(
        &'a self,
        _harness: Harness,
        _credential: &'a str,
        _imported: bool,
    ) -> Reply<'a, agent::harness::ImportedAuthentication> {
        unreachable()
    }
}

impl agent::control_api::SshAccessApi for Unreachable {
    fn describe<'a>(&'a self, _name: &'a str) -> Reply<'a, agent::ssh::AccessInfo> {
        unreachable()
    }
}

impl agent::control_api::VncAccessApi for Unreachable {
    fn describe<'a>(&'a self, _name: &'a str) -> Reply<'a, agent::vnc::AccessInfo> {
        unreachable()
    }
}

impl agent::control_plane::Notifier for Unreachable {
    fn notify(&self, _id: agent::AgentId) {}

    fn wake(&self, _id: agent::AgentId) -> Reply<'_, ()> {
        Box::pin(async { Ok(()) })
    }
}

impl agent::control_api::SessionApi for Unreachable {
    fn ensure<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
        _request: agent::sessions::SessionRequest,
    ) -> Reply<'a, agent::sessions::Requested> {
        unreachable()
    }

    fn attach_target(&self, _id: agent::sessions::SessionId) -> Reply<'_, agent::sessions::AttachTarget> {
        unreachable()
    }

    fn get_by_id(&self, _id: agent::sessions::SessionId) -> Reply<'_, agent::sessions::Session> {
        unreachable()
    }

    fn get<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
    ) -> Reply<'a, agent::sessions::Session> {
        unreachable()
    }

    fn list<'a>(&'a self, _agent: Option<&'a str>) -> Reply<'a, Vec<agent::sessions::Session>> {
        Box::pin(async { Ok(Vec::new()) })
    }

    fn prompt<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
        _prompt: &'a str,
    ) -> Reply<'a, agent::sessions::Delivered> {
        unreachable()
    }

    fn turns<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
        _last: Option<usize>,
    ) -> Reply<'a, Vec<agent::sessions::Turn>> {
        unreachable()
    }

    fn delete<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
    ) -> Reply<'a, agent::sessions::Requested> {
        unreachable()
    }

    fn set_archived<'a>(
        &'a self,
        _agent: &'a str,
        _name: &'a agent::sessions::SessionName,
        _archived: bool,
    ) -> Reply<'a, agent::sessions::Requested> {
        unreachable()
    }

    fn upgrade_readiness(&self) -> Reply<'_, agent::sessions::UpgradeReadiness> {
        Box::pin(async { Ok(agent::sessions::UpgradeReadiness::default()) })
    }
}
