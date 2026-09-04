#![allow(dead_code)]

use std::{path::PathBuf, time::SystemTime};

use agent::{
    API_VERSION, Agent, Harness, HarnessAuthMode, HarnessSpec, HomeSpec, InstructionsSpec, KIND, Metadata,
    NetworkAllow, NetworkMode, NetworkSpec, PlatformManifestSpec, SandboxManifestSpec, Spec, Status,
};
use sandbox::{
    ByteQuantity, CpuQuantity, Platform, RetentionPolicy, RootFilesystem, SandboxResources, image::ImageSource,
};
pub(crate) fn agent(name: &str) -> Agent {
    Agent {
        api_version: API_VERSION.into(),
        kind: KIND.into(),
        metadata: Metadata {
            name: name.into(),
            generation: 0,
            deletion_timestamp: None,
        },
        spec: Spec {
            sandbox: SandboxManifestSpec {
                image: ImageSource::Build {
                    context: PathBuf::from("image"),
                    dockerfile: PathBuf::from("Dockerfile"),
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
            instructions: Some(InstructionsSpec {
                source: PathBuf::from("instructions.md"),
            }),
            harnesses: vec![HarnessSpec {
                kind: Harness::ClaudeCode,
                version: Some("2.1.239".into()),
                auth: HarnessAuthMode::Mediated,
                default: false,
            }],
            secrets: Vec::new(),
            network: NetworkSpec {
                mode: NetworkMode::Mediated,
                allow: NetworkAllow::All,
                deny: Vec::new(),
            },
        },
        status: Status::default(),
    }
}

pub(crate) struct TempDirectory(PathBuf);

impl TempDirectory {
    pub(crate) fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("system time should follow the epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("agent-platform-{label}-{}-{nonce}", std::process::id()));
        std::fs::create_dir_all(&path).expect("temporary directory should be created");
        Self(path)
    }

    pub(crate) fn path(&self) -> &std::path::Path {
        &self.0
    }
}

impl Drop for TempDirectory {
    fn drop(&mut self) {
        let _ignored = std::fs::remove_dir_all(&self.0);
    }
}
