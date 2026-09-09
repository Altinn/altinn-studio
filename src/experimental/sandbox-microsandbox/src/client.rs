use std::{future::Future, path::PathBuf, rc::Rc, sync::Arc};

use microsandbox::LocalBackend;
use sandbox::Error;
use tokio::sync::OnceCell;

use crate::{backend::RuntimeBundle, error};

// Published runtime bundle digests for Microsandbox 0.6.9-digdir.3. Update these
// together with the pinned Microsandbox revisions in the workspace manifest.
const LINUX_X86_64_RUNTIME_SHA256: &str = "92d228f36124ad6ff3f6a9392c5c738444d96f490e12dfddf625582c43fb6c8a";
const LINUX_AARCH64_RUNTIME_SHA256: &str = "6f0f95b88d3ca3e4eb20c5b7c4e1b3afb1180bc2e7469fc5cdc305e204f0ba08";
const MACOS_AARCH64_RUNTIME_SHA256: &str = "f00e7502be920da08d26b6320c3b2a948dd3137f404c85a2e4d5aea09aab2eeb";
const WINDOWS_X86_64_RUNTIME_SHA256: &str = "8f66798f2f5a07a7b03aba55388ca287c9c327d3e0fabbbc18d9b6167aea2789";
const WINDOWS_AARCH64_RUNTIME_SHA256: &str = "a1bd058f98d89a6a3dc42a32bf0c970ff6fbefd6858568e67c549516cb6a17ce";

/// Keeps Microsandbox's thread-safe ownership model at the SDK boundary.
#[derive(Clone)]
pub(crate) struct Client {
    backend: Arc<LocalBackend>,
    microsandbox_home: PathBuf,
    runtime_bundle: Option<RuntimeBundle>,
    installation: Rc<OnceCell<()>>,
}

#[derive(Clone, Copy)]
pub(crate) struct RuntimeResources {
    pub(crate) cpus: u8,
    pub(crate) memory_mib: u32,
    pub(crate) root_filesystem_mib: u32,
}

impl TryFrom<sandbox::SandboxResources> for RuntimeResources {
    type Error = Error;

    fn try_from(resources: sandbox::SandboxResources) -> Result<Self, Self::Error> {
        let cpus = resources.cpu().whole_cpus().ok_or_else(|| {
            unsupported_resource(
                "cpu",
                resources.cpu(),
                "Microsandbox requires a whole number of virtual CPUs",
            )
        })?;
        let cpus = u8::try_from(cpus).map_err(|_| {
            unsupported_resource(
                "cpu",
                resources.cpu(),
                "Microsandbox virtual CPU count must fit in an unsigned 8-bit integer",
            )
        })?;
        let memory_mib = exact_mib("memory", resources.memory())?;
        let root_filesystem_mib = exact_mib("rootFilesystem.capacity", resources.root_filesystem().capacity())?;
        Ok(Self {
            cpus,
            memory_mib,
            root_filesystem_mib,
        })
    }
}

pub(crate) fn exact_mib(resource: &'static str, quantity: sandbox::ByteQuantity) -> Result<u32, Error> {
    let mebibytes = quantity.whole_mebibytes().ok_or_else(|| {
        unsupported_resource(
            resource,
            quantity,
            "Microsandbox requires an exact whole number of mebibytes",
        )
    })?;
    u32::try_from(mebibytes).map_err(|_| {
        unsupported_resource(
            resource,
            quantity,
            "Microsandbox mebibyte value must fit in an unsigned 32-bit integer",
        )
    })
}

fn unsupported_resource(resource: &'static str, value: impl std::fmt::Display, reason: &'static str) -> Error {
    Error::UnsupportedResourceValue {
        resource,
        value: value.to_string(),
        reason,
    }
}

impl Client {
    pub(crate) async fn open(
        microsandbox_home: PathBuf,
        cache_directory: Option<PathBuf>,
        runtime_bundle: Option<RuntimeBundle>,
    ) -> Result<Self, Error> {
        if let Some(cache_directory) = &cache_directory {
            tokio::fs::create_dir_all(cache_directory)
                .await
                .map_err(|source| error::io("create Microsandbox cache directory", source))?;
        }
        let mut builder = LocalBackend::builder()
            .ignore_persisted_config()
            .home(&microsandbox_home)
            .disable_metrics_sample(true)
            .deployment_profile(microsandbox::sandbox::DeploymentProfile::SingleTenant);
        if let Some(cache_directory) = cache_directory {
            builder = builder.cache_dir(cache_directory);
        }
        let backend = builder.build().await.map_err(error::microsandbox)?;
        Ok(Self {
            backend: Arc::new(backend),
            microsandbox_home,
            runtime_bundle,
            installation: Rc::new(OnceCell::new()),
        })
    }

    pub(crate) fn local(&self) -> &LocalBackend {
        &self.backend
    }

    pub(crate) async fn bind_network_controller(
        &self,
        name: &str,
    ) -> Result<microsandbox_network::control::NetworkControlHost, Error> {
        self.backend
            .bind_network_controller(name)
            .await
            .map_err(error::microsandbox)
    }

    pub(crate) async fn ensure_installed(&self) -> Result<(), Error> {
        self.installation
            .get_or_try_init(|| async {
                if let Some(bundle) = &self.runtime_bundle {
                    microsandbox::setup::Setup::builder()
                        .base_dir(&self.microsandbox_home)
                        .bundle_path(&bundle.path)
                        .expected_bundle_sha256(&bundle.sha256)
                        .allow_ci_local_bundle(false)
                        .build()
                        .install()
                        .await
                } else {
                    let sha256 = released_runtime_sha256()
                        .ok_or_else(|| Error::UnsupportedPlatform(sandbox::Platform::native("linux")))?;
                    microsandbox::setup::Setup::builder()
                        .base_dir(&self.microsandbox_home)
                        .expected_bundle_sha256(sha256)
                        .allow_ci_local_bundle(false)
                        .build()
                        .install()
                        .await
                }
                .map_err(error::microsandbox)
            })
            .await?;
        Ok(())
    }

    /// Uses SDK defaults rather than `Sandbox::builder`, which reads the
    /// process-global Microsandbox Backend before returning its builder.
    pub(crate) fn sandbox_builder(
        name: impl Into<String>,
        image: impl Into<String>,
        resources: sandbox::SandboxResources,
    ) -> Result<microsandbox::sandbox::SandboxBuilder, Error> {
        let root_filesystem_mode = resources.root_filesystem().mode();
        let resources = RuntimeResources::try_from(resources)?;
        let builder = microsandbox::sandbox::SandboxBuilder::new(name)
            .image(image.into())
            .cpus(resources.cpus)
            .memory(resources.memory_mib);
        Ok(match root_filesystem_mode {
            sandbox::RootFilesystemMode::Layered => builder.root_disk(resources.root_filesystem_mib),
            sandbox::RootFilesystemMode::Direct => {
                builder.root_disk_with(|disk| disk.flat().size(resources.root_filesystem_mib))
            }
            mode => return Err(Error::UnsupportedRootFilesystemMode(mode)),
        })
    }

    pub(crate) async fn scope<F, T>(&self, future: F) -> T
    where
        F: Future<Output = T>,
    {
        let backend: Arc<dyn microsandbox::Backend> = self.backend.clone();
        microsandbox::with_backend(backend, future).await
    }
}

fn released_runtime_sha256() -> Option<&'static str> {
    runtime_sha256(std::env::consts::OS, std::env::consts::ARCH)
}

pub(crate) fn runtime_sha256(os: &str, architecture: &str) -> Option<&'static str> {
    match (os, architecture) {
        ("linux", "x86_64") => Some(LINUX_X86_64_RUNTIME_SHA256),
        ("linux", "aarch64") => Some(LINUX_AARCH64_RUNTIME_SHA256),
        ("macos", "aarch64") => Some(MACOS_AARCH64_RUNTIME_SHA256),
        ("windows", "x86_64") => Some(WINDOWS_X86_64_RUNTIME_SHA256),
        ("windows", "aarch64") => Some(WINDOWS_AARCH64_RUNTIME_SHA256),
        _ => None,
    }
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use sandbox::{ByteQuantity, CpuQuantity, RootFilesystem, SandboxResources};

    use crate::client::Client;

    #[test]
    fn every_supported_host_runtime_download_is_digest_pinned() {
        for (os, architecture) in [
            ("linux", "x86_64"),
            ("linux", "aarch64"),
            ("macos", "aarch64"),
            ("windows", "x86_64"),
            ("windows", "aarch64"),
        ] {
            let digest = super::runtime_sha256(os, architecture).expect("supported host digest");
            assert_eq!(digest.len(), 64);
            assert!(digest.bytes().all(|byte| byte.is_ascii_hexdigit()));
        }
    }

    #[tokio::test(flavor = "local")]
    async fn sandbox_builders_use_explicit_resources_without_ambient_defaults() {
        let resources = SandboxResources::new(
            "2".parse::<CpuQuantity>().expect("CPU should parse"),
            "768Mi".parse::<ByteQuantity>().expect("memory should parse"),
            RootFilesystem::layered("4Gi".parse::<ByteQuantity>().expect("root filesystem should parse")),
        );
        let config = Client::sandbox_builder("sandbox", "alpine", resources)
            .expect("resources should map to Microsandbox")
            .build()
            .await
            .expect("Sandbox configuration should build");

        assert_eq!(config.spec.resources.cpus, 2);
        assert_eq!(config.spec.resources.memory_mib, 768);
        assert_eq!(config.spec.image.oci_managed_root_disk_size_mib(), Some(4 * 1024));
        assert_eq!(config.spec.runtime.workdir, None);
    }

    #[tokio::test(flavor = "local")]
    async fn direct_root_filesystems_map_to_flat_microsandbox_disks() {
        let resources = SandboxResources::new(
            "2".parse::<CpuQuantity>().expect("CPU should parse"),
            "768Mi".parse::<ByteQuantity>().expect("memory should parse"),
            RootFilesystem::direct("4Gi".parse::<ByteQuantity>().expect("root filesystem should parse")),
        );
        let config = Client::sandbox_builder("sandbox", "alpine", resources)
            .expect("resources should map to Microsandbox")
            .build()
            .await
            .expect("Sandbox configuration should build");

        assert_eq!(
            config.spec.image.oci_root_disk(),
            Some(&microsandbox::sandbox::RootDisk::flat(4 * 1024))
        );
    }

    #[test]
    fn resource_conversion_rejects_values_microsandbox_cannot_represent_exactly() {
        let fractional_cpu = SandboxResources::new(
            "500m".parse::<CpuQuantity>().expect("CPU should parse"),
            "768Mi".parse::<ByteQuantity>().expect("memory should parse"),
            RootFilesystem::layered("4Gi".parse::<ByteQuantity>().expect("root filesystem should parse")),
        );
        let decimal_memory = SandboxResources::new(
            "2".parse::<CpuQuantity>().expect("CPU should parse"),
            "1G".parse::<ByteQuantity>().expect("memory should parse"),
            RootFilesystem::layered("4Gi".parse::<ByteQuantity>().expect("root filesystem should parse")),
        );

        assert!(Client::sandbox_builder("sandbox", "alpine", fractional_cpu).is_err());
        assert!(Client::sandbox_builder("sandbox", "alpine", decimal_memory).is_err());
    }
}
