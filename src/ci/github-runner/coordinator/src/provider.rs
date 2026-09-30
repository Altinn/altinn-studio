use std::{fs, io, path::Path, path::PathBuf, rc::Rc};

use clap::Args;
use sandbox::{Platform, SandboxService, image::RegistryAuthentication};
use sandbox_microsandbox::MicrosandboxProvider;

use crate::AnyError;

const DEFAULT_PROVIDER_HOME: &str = "/var/lib/altinn/sandbox-provider";
const DEFAULT_CACHE_DIRECTORY: &str = "/var/cache/altinn/sandbox";
const DEFAULT_RUNTIME_BUNDLE: &str = "/opt/altinn/microsandbox/microsandbox-linux-x86_64.tar.gz";
const DEFAULT_RUNTIME_BUNDLE_CHECKSUMS: &str = "/opt/altinn/microsandbox/checksums.sha256";

/// Host configuration for the currently deployed Sandbox Provider.
#[derive(Args)]
pub struct ProviderArguments {
    /// Writable, per-process Sandbox Provider home.
    #[arg(long, env = "SANDBOX_PROVIDER_HOME", default_value = DEFAULT_PROVIDER_HOME)]
    provider_home: PathBuf,

    /// Reusable image materialization cache shared by Provider instances.
    #[arg(long, env = "SANDBOX_CACHE_HOME", default_value = DEFAULT_CACHE_DIRECTORY)]
    cache_directory: PathBuf,

    /// Preinstalled Microsandbox host runtime bundle.
    #[arg(
        long,
        env = "MICROSANDBOX_RUNTIME_BUNDLE",
        default_value = DEFAULT_RUNTIME_BUNDLE
    )]
    runtime_bundle: PathBuf,

    /// Published checksums covering the Microsandbox runtime bundle.
    #[arg(
        long,
        env = "MICROSANDBOX_RUNTIME_BUNDLE_CHECKSUMS",
        default_value = DEFAULT_RUNTIME_BUNDLE_CHECKSUMS
    )]
    runtime_bundle_checksums: PathBuf,
}

impl ProviderArguments {
    /// Opens the configured Sandbox service.
    ///
    /// # Errors
    ///
    /// Returns an error when the runtime bundle cannot be validated or the Provider cannot open.
    pub async fn open(
        &self,
        registry_authentication: Option<RegistryAuthentication>,
    ) -> Result<SandboxService, AnyError> {
        let runtime_bundle_sha256 = read_runtime_bundle_sha256(&self.runtime_bundle, &self.runtime_bundle_checksums)?;
        let builder = self
            .provider_builder(registry_authentication)
            .runtime_bundle(&self.runtime_bundle, runtime_bundle_sha256);
        self.open_builder(builder).await
    }

    /// Opens only the Provider image domain without installing its runtime.
    ///
    /// # Errors
    ///
    /// Returns an error when the Provider image domain cannot open.
    pub async fn open_images(
        &self,
        registry_authentication: Option<RegistryAuthentication>,
    ) -> Result<SandboxService, AnyError> {
        self.open_builder(self.provider_builder(registry_authentication)).await
    }

    /// Removes all state inside the per-process Provider home while preserving its mount point.
    ///
    /// # Errors
    ///
    /// Returns an error when the directory cannot be read or one of its entries cannot be removed.
    pub async fn clear_home(&self) -> Result<(), io::Error> {
        let mut entries = match tokio::fs::read_dir(&self.provider_home).await {
            Ok(entries) => entries,
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
            Err(error) => return Err(error),
        };
        while let Some(entry) = entries.next_entry().await? {
            if entry.file_type().await?.is_dir() {
                tokio::fs::remove_dir_all(entry.path()).await?;
            } else {
                tokio::fs::remove_file(entry.path()).await?;
            }
        }
        Ok(())
    }

    fn provider_builder(
        &self,
        registry_authentication: Option<RegistryAuthentication>,
    ) -> sandbox_microsandbox::MicrosandboxProviderBuilder {
        let mut builder = MicrosandboxProvider::builder(&self.provider_home).cache_directory(&self.cache_directory);
        if let Some(authentication) = registry_authentication {
            builder = builder.registry_authentication(authentication);
        }
        builder
    }

    async fn open_builder(
        &self,
        builder: sandbox_microsandbox::MicrosandboxProviderBuilder,
    ) -> Result<SandboxService, AnyError> {
        let provider = Rc::new(builder.open().await?);
        println!("Sandbox Provider home: {}", self.provider_home.display());
        println!("Sandbox image cache: {}", self.cache_directory.display());
        Ok(SandboxService::new(provider))
    }
}

/// Returns the native Linux Platform using OCI architecture names.
#[must_use]
pub fn native_linux_platform() -> Platform {
    Platform::new(
        "linux",
        match std::env::consts::ARCH {
            "x86_64" => "amd64",
            "aarch64" => "arm64",
            architecture => architecture,
        },
    )
}

fn read_runtime_bundle_sha256(bundle: &Path, checksums: &Path) -> Result<String, io::Error> {
    let filename = bundle.file_name().and_then(|name| name.to_str()).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "MICROSANDBOX_RUNTIME_BUNDLE must have a UTF-8 filename",
        )
    })?;
    let contents = fs::read_to_string(checksums)
        .map_err(|error| io::Error::new(error.kind(), format!("cannot read {}: {error}", checksums.display())))?;
    parse_runtime_bundle_sha256(&contents, filename)
}

fn parse_runtime_bundle_sha256(contents: &str, filename: &str) -> Result<String, io::Error> {
    contents
        .lines()
        .find_map(|line| {
            let mut fields = line.split_whitespace();
            let digest = fields.next()?;
            let candidate = fields.next()?.trim_start_matches('*');
            (candidate == filename && fields.next().is_none()).then_some(digest)
        })
        .filter(|digest| digest.len() == 64 && digest.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .map(str::to_owned)
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("checksum file has no valid SHA-256 entry for {filename}"),
            )
        })
}

#[cfg(test)]
mod tests {
    use super::{ProviderArguments, parse_runtime_bundle_sha256};
    use std::path::PathBuf;

    #[test]
    fn selects_the_runtime_bundle_published_checksum() {
        let expected = "a".repeat(64);
        let checksums = format!(
            "{}  agentd-x86_64\n{}  microsandbox-linux-x86_64.tar.gz\n",
            "b".repeat(64),
            expected
        );

        let result = parse_runtime_bundle_sha256(&checksums, "microsandbox-linux-x86_64.tar.gz");
        assert!(matches!(result, Ok(ref digest) if digest == &expected));
    }

    #[test]
    fn rejects_a_missing_or_malformed_runtime_bundle_checksum() {
        assert!(parse_runtime_bundle_sha256("", "runtime.tar.gz").is_err());
        assert!(parse_runtime_bundle_sha256("abc  runtime.tar.gz\n", "runtime.tar.gz").is_err());
    }

    #[tokio::test]
    async fn clears_provider_home_contents_without_removing_mount_point() -> Result<(), Box<dyn std::error::Error>> {
        let directory = tempfile::tempdir()?;
        std::fs::create_dir(directory.path().join("nested"))?;
        std::fs::write(directory.path().join("nested/file"), "state")?;
        std::fs::write(directory.path().join(".hidden"), "state")?;
        let arguments = ProviderArguments {
            provider_home: directory.path().to_path_buf(),
            cache_directory: PathBuf::from("/cache"),
            runtime_bundle: PathBuf::from("/runtime"),
            runtime_bundle_checksums: PathBuf::from("/checksums"),
        };

        arguments.clear_home().await?;

        assert!(directory.path().is_dir());
        assert_eq!(std::fs::read_dir(directory.path())?.count(), 0);
        Ok(())
    }
}
