#[cfg(unix)]
use std::{
    fmt::Write as _,
    fs,
    os::unix::ffi::OsStrExt,
    os::unix::fs::{DirBuilderExt, MetadataExt},
};
use std::{
    future::Future,
    path::{Path, PathBuf},
    rc::Rc,
    sync::Arc,
};

use microsandbox::LocalBackend;
use sandbox::Error;
#[cfg(unix)]
use sha2::{Digest, Sha256};
use tokio::sync::OnceCell;

use crate::{backend::RuntimeBundle, error};

// Published runtime bundle digests for Microsandbox 0.7.4-digdir.1. Update these
// together with the pinned Microsandbox revisions in the workspace manifest.
const LINUX_X86_64_RUNTIME_SHA256: &str = "cd713ee0ff5e2b8bf47031ad785c5d968c59de883e09ec711a16b185f935565c";
const LINUX_AARCH64_RUNTIME_SHA256: &str = "61457ccc6d670329fb7b37e27a5d11769edc88b4f7a9d63cc19b53c9a3327955";
const MACOS_AARCH64_RUNTIME_SHA256: &str = "b015064ece800b173c032d66e7042a208a3a880e065709cedb02128a85d91a65";
const WINDOWS_X86_64_RUNTIME_SHA256: &str = "f4a399e4e75055ceaa090424a672057a778edf5befa44c25b47632cdad4647b5";
const WINDOWS_AARCH64_RUNTIME_SHA256: &str = "50fecbf4ce166b07f748d4bcf019d5659ea98062ec4d2096c47b42c6af910e10";

/// Keeps Microsandbox's thread-safe ownership model at the SDK boundary.
#[derive(Clone)]
pub(crate) struct Client {
    backend: Arc<LocalBackend>,
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
        // The Client owns this home, so its user configuration lives there
        // rather than in the process user's Microsandbox configuration.
        let mut builder = LocalBackend::builder()
            .config_path(microsandbox_home.join("config.json"))
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

    /// Installs the pinned host runtime into the Client's home, replacing any
    /// other version the SDK would refuse to launch. Runtime path overrides
    /// would bypass the pinned digest or embedded guest agent and are refused.
    pub(crate) async fn ensure_installed(&self) -> Result<(), Error> {
        self.installation
            .get_or_try_init(|| async {
                let config = self.backend.config();
                let paths = &config.paths;
                if let Some(path) = [&paths.msb, &paths.libkrunfw, &paths.agentd]
                    .into_iter()
                    .flatten()
                    .next()
                {
                    return Err(Error::Backend(format!(
                        "Microsandbox runtime override {} is not supported",
                        path.display()
                    )));
                }
                if let Ok(runtime) = microsandbox::setup::resolve_runtime(config)
                    && is_pinned_runtime(&runtime.msb_path)
                {
                    return Ok(());
                }
                let (source, sha256) = match &self.runtime_bundle {
                    Some(bundle) => (
                        microsandbox::setup::InstallSource::Archive(bundle.path.clone()),
                        bundle.sha256.clone(),
                    ),
                    None => (
                        microsandbox::setup::InstallSource::ReleaseDownload,
                        released_runtime_sha256()
                            .ok_or_else(|| Error::UnsupportedPlatform(sandbox::Platform::native("linux")))?
                            .to_owned(),
                    ),
                };
                microsandbox::setup::install_runtime(
                    config,
                    microsandbox::setup::InstallOptions {
                        source,
                        force: true,
                        expected_archive_sha256: Some(sha256),
                        ..Default::default()
                    },
                )
                .await
                .map(drop)
                .map_err(error::microsandbox)
            })
            .await?;
        Ok(())
    }

    /// Builds a sandbox whose unset settings come from this Client's backend
    /// when it is created inside [`Self::scope`], never from the process
    /// user's Microsandbox configuration.
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

    /// Returns the Microsandbox runtime of this name, or `None` when it has not been created.
    pub(crate) async fn runtime_handle(
        &self,
        name: &str,
    ) -> Result<Option<microsandbox::sandbox::SandboxHandle>, Error> {
        match self.scope(microsandbox::Sandbox::get(name)).await {
            Ok(handle) => Ok(Some(handle)),
            Err(microsandbox::MicrosandboxError::SandboxNotFound(_)) => Ok(None),
            Err(error) => Err(error::microsandbox(error)),
        }
    }

    pub(crate) async fn scope<F, T>(&self, future: F) -> T
    where
        F: Future<Output = T>,
    {
        let backend: Arc<dyn microsandbox::Backend> = self.backend.clone();
        microsandbox::with_backend(backend, future).await
    }
}

/// Builds within a Client whose home is private to the test, so neither the
/// host user's Microsandbox configuration nor another test leaks in.
#[cfg(test)]
#[allow(clippy::expect_used)]
pub(crate) async fn build_in_client_scope(
    builder: microsandbox::sandbox::SandboxBuilder,
) -> microsandbox::sandbox::SandboxConfig {
    let home = tempfile::tempdir().expect("temporary home should be created");
    let client = Client::open(home.path().join("microsandbox"), None, None)
        .await
        .expect("Client should open");
    Box::pin(client.scope(builder.build()))
        .await
        .expect("Sandbox configuration should build")
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

/// Whether an installed `msb` is the runtime this SDK build launches.
fn is_pinned_runtime(msb: &Path) -> bool {
    matches!(
        microsandbox::setup::resolve_runtime_version(msb),
        Ok(Some(version)) if version.to_string() == microsandbox::setup::InstallOptions::default().version
    )
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
// Test Clients live for the whole test; tightening their drop adds nothing.
#[allow(clippy::expect_used, clippy::significant_drop_tightening)]
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
    async fn runtime_paths_outside_the_home_are_refused() {
        let home = tempfile::tempdir().expect("temporary home should be created");
        let microsandbox_home = home.path().join("microsandbox");
        std::fs::create_dir_all(&microsandbox_home).expect("home should be created");
        std::fs::write(
            microsandbox_home.join("config.json"),
            br#"{"paths":{"agentd":"/opt/other/agentd"}}"#,
        )
        .expect("configuration should be written");
        let client = Client::open(microsandbox_home, None, None)
            .await
            .expect("Client should open");

        let error = client
            .ensure_installed()
            .await
            .expect_err("a configured guest agent should be refused");

        assert!(error.to_string().contains("/opt/other/agentd"), "{error}");
    }

    #[tokio::test(flavor = "local")]
    async fn sandbox_builders_use_explicit_resources_without_ambient_defaults() {
        let resources = SandboxResources::new(
            "2".parse::<CpuQuantity>().expect("CPU should parse"),
            "768Mi".parse::<ByteQuantity>().expect("memory should parse"),
            RootFilesystem::layered("4Gi".parse::<ByteQuantity>().expect("root filesystem should parse")),
        );
        let config = Box::pin(super::build_in_client_scope(
            Client::sandbox_builder("sandbox", "alpine", resources).expect("resources should map to Microsandbox"),
        ))
        .await;

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
        let config = Box::pin(super::build_in_client_scope(
            Client::sandbox_builder("sandbox", "alpine", resources).expect("resources should map to Microsandbox"),
        ))
        .await;

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
