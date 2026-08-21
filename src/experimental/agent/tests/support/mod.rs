#![allow(dead_code)]

use std::{path::PathBuf, time::SystemTime};

use agent::{API_VERSION, Agent, KIND, Metadata, Spec, Status};
use sandbox::{
    ByteQuantity, CpuQuantity, Platform, RetentionPolicy, RootFilesystem, SandboxResources, SandboxSpec,
    image::ImageSource,
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
            sandbox: SandboxSpec {
                image: ImageSource::Build {
                    context: PathBuf::from("image"),
                    dockerfile: PathBuf::from("Dockerfile"),
                },
                platform: Platform::new("linux", "amd64"),
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
                retention_policy: RetentionPolicy::Retain,
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
