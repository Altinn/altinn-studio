#[cfg(unix)]
use std::path::Path;
#[cfg(unix)]
use std::{
    fmt::Write as _,
    fs,
    os::unix::ffi::OsStrExt,
    os::unix::fs::{DirBuilderExt, MetadataExt},
};
use std::{future::Future, path::PathBuf, rc::Rc, sync::Arc};

use microsandbox::LocalBackend;
use sandbox::Error;
#[cfg(unix)]
use sha2::{Digest, Sha256};
use tokio::sync::OnceCell;

use crate::{backend::RuntimeBundle, error};

// Published runtime bundle digests for Microsandbox 0.6.18-digdir.3. Update these
// together with the pinned Microsandbox revisions in the workspace manifest.
const LINUX_X86_64_RUNTIME_SHA256: &str = "62be72cf92724092f0dbb758dc9fe2ef688fca35b25a122197dc8a8d532a77a1";
const LINUX_AARCH64_RUNTIME_SHA256: &str = "d99c24933fbcc7dd8064ab66e79d4a8529851870fe3912a4cbad8ecad8ea966a";
const MACOS_AARCH64_RUNTIME_SHA256: &str = "a3c439f5e89afa647f8b45318c3316e05d081c31e18a9c01663ec39855998957";
const WINDOWS_X86_64_RUNTIME_SHA256: &str = "88d89550ba569343a4dbc50d54bca1930e0cf15f3209c9db4364515dac08b630";
const WINDOWS_AARCH64_RUNTIME_SHA256: &str = "b066137c0a60e002654fa22a403948f6b28ac85c2c96051ea4c72cf6edd95b2e";

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
        #[cfg(unix)]
        let run_directory = run_directory(&microsandbox_home)?;
        #[cfg(not(unix))]
        let run_directory = microsandbox_home.join("run");
        let mut builder = LocalBackend::builder()
            .ignore_persisted_config()
            .home(&microsandbox_home)
            .run_dir(run_directory)
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

    /// Starts from Microsandbox's built-in sandbox defaults. Both
    /// `Sandbox::builder` and `SandboxBuilder::new` overlay the process-global
    /// Backend's `config.json` sandbox defaults, which this Client must not
    /// inherit.
    pub(crate) fn sandbox_builder(
        name: impl Into<String>,
        image: impl Into<String>,
        resources: sandbox::SandboxResources,
    ) -> Result<microsandbox::sandbox::SandboxBuilder, Error> {
        let root_filesystem_mode = resources.root_filesystem().mode();
        let resources = RuntimeResources::try_from(resources)?;
        let builder = microsandbox::sandbox::SandboxBuilder::from_builtin_defaults(name)
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

#[cfg(unix)]
fn run_directory(home: &Path) -> Result<PathBuf, Error> {
    let default = home.join("run");
    if microsandbox::runtime::run_directory_fits(&default) {
        return Ok(default);
    }
    let digest = Sha256::digest(home.as_os_str().as_bytes());
    let mut id = String::with_capacity(32);
    for byte in &digest[..16] {
        let _ = write!(&mut id, "{byte:02x}");
    }
    let path = PathBuf::from(format!("/tmp/microsandbox-{id}"));
    if !microsandbox::runtime::run_directory_fits(&path) {
        return Err(error::io(
            "select private Microsandbox runtime directory",
            std::io::Error::new(std::io::ErrorKind::InvalidInput, path.display().to_string()),
        ));
    }
    let home_uid = fs::metadata(home.parent().unwrap_or(home))
        .map_err(|source| error::io("inspect Microsandbox home", source))?
        .uid();
    match fs::symlink_metadata(&path) {
        Ok(metadata)
            if !metadata.file_type().is_dir() || metadata.uid() != home_uid || metadata.mode() & 0o077 != 0 =>
        {
            return Err(error::io(
                "validate private Microsandbox runtime directory",
                std::io::Error::new(std::io::ErrorKind::PermissionDenied, path.display().to_string()),
            ));
        }
        Ok(_) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            fs::DirBuilder::new()
                .mode(0o700)
                .create(&path)
                .map_err(|source| error::io("create private Microsandbox runtime directory", source))?;
        }
        Err(source) => return Err(error::io("inspect private Microsandbox runtime directory", source)),
    }
    Ok(path)
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
    #[cfg(unix)]
    use std::fmt::Write as _;
    #[cfg(unix)]
    use std::os::unix::ffi::OsStrExt;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;
    #[cfg(unix)]
    use std::path::PathBuf;

    #[cfg(unix)]
    use super::Sha256;
    #[cfg(unix)]
    use sha2::Digest;

    use crate::client::Client;

    #[cfg(unix)]
    #[test]
    fn run_directory_preserves_short_homes_and_shortens_long_socket_paths() {
        let normal = PathBuf::from("/Users/alice/.agent/runtime");
        assert_eq!(
            super::run_directory(&normal).expect("run directory"),
            normal.join("run")
        );

        let root = tempfile::tempdir().expect("temporary root");
        let long = root.path().join("username".repeat(20));
        std::fs::create_dir_all(long.parent().expect("long home parent")).expect("provider home");
        let run = super::run_directory(&long).expect("run directory");
        assert!(microsandbox::runtime::run_directory_fits(&run));
        std::fs::remove_dir(&run).expect("remove fallback directory");
        assert_ne!(run, long.join("run"));
    }

    #[cfg(unix)]
    #[test]
    fn run_directory_rejects_unsafe_existing_fallbacks() {
        let root = tempfile::tempdir().expect("temporary root");
        let home = root.path().join("home").join("longusername".repeat(20)).join("runtime");
        std::fs::create_dir_all(&home).expect("runtime home");
        let digest = Sha256::digest(home.as_os_str().as_bytes());
        let mut id = String::with_capacity(32);
        for byte in &digest[..16] {
            write!(&mut id, "{byte:02x}").expect("writing to String cannot fail");
        }
        let fallback = PathBuf::from(format!("/tmp/microsandbox-{id}"));

        std::os::unix::fs::symlink(root.path(), &fallback).expect("fallback symlink");
        assert!(super::run_directory(&home).is_err());
        std::fs::remove_file(&fallback).expect("remove fallback symlink");

        std::fs::write(&fallback, b"not a directory").expect("fallback file");
        assert!(super::run_directory(&home).is_err());
        std::fs::remove_file(&fallback).expect("remove fallback file");

        std::fs::create_dir(&fallback).expect("fallback directory");
        std::fs::set_permissions(&fallback, std::fs::Permissions::from_mode(0o755)).expect("fallback permissions");
        assert!(super::run_directory(&home).is_err());
        std::fs::remove_dir(&fallback).expect("remove fallback directory");
    }

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
