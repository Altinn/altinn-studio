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
    /// Opens the configured Sandbox service and passes it to `run`. Then it empties the Provider home, also when the
    /// Provider cannot open or the run fails, so that the folder the pod leaves on the node holds nothing.
    ///
    /// # Errors
    ///
    /// Returns the error of opening the Provider, of `run` or of emptying the Provider home. When emptying the home
    /// also fails, the error has both messages.
    pub async fn run_with_service<T>(
        &self,
        registry_authentication: Option<RegistryAuthentication>,
        run: impl AsyncFnOnce(SandboxService) -> Result<T, AnyError>,
    ) -> Result<T, AnyError> {
        let result = match self.open(registry_authentication).await {
            Ok(service) => run(service).await,
            Err(error) => Err(error),
        };
        self.clear_home_after(result).await
    }

    async fn open(&self, registry_authentication: Option<RegistryAuthentication>) -> Result<SandboxService, AnyError> {
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
    async fn clear_home(&self) -> Result<(), io::Error> {
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

    /// Clears the Provider home after a run, also when the run failed, and returns the run's `result`.
    async fn clear_home_after<T>(&self, result: Result<T, AnyError>) -> Result<T, AnyError> {
        let cleared = self.clear_home().await;
        match (result, cleared) {
            (Ok(value), Ok(())) => Ok(value),
            (Err(error), Ok(())) => Err(error),
            (Ok(_), Err(clear_error)) => Err(clear_error.into()),
            (Err(error), Err(clear_error)) => Err(io::Error::other(format!(
                "{error}; clearing the Sandbox Provider home also failed: {clear_error}"
            ))
            .into()),
        }
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
    use crate::AnyError;
    use std::{io, path::Path, path::PathBuf};

    fn arguments(provider_home: &Path) -> ProviderArguments {
        ProviderArguments {
            provider_home: provider_home.to_path_buf(),
            cache_directory: PathBuf::from("/cache"),
            runtime_bundle: PathBuf::from("/runtime"),
            runtime_bundle_checksums: PathBuf::from("/checksums"),
        }
    }

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
    async fn clears_provider_home_contents_without_removing_mount_point() -> Result<(), AnyError> {
        let directory = tempfile::tempdir()?;
        std::fs::create_dir(directory.path().join("nested"))?;
        std::fs::write(directory.path().join("nested/file"), "state")?;
        std::fs::write(directory.path().join(".hidden"), "state")?;

        arguments(directory.path()).clear_home().await?;

        assert!(directory.path().is_dir());
        assert_eq!(std::fs::read_dir(directory.path())?.count(), 0);
        Ok(())
    }

    #[tokio::test]
    async fn clears_provider_home_also_when_the_run_fails() -> Result<(), AnyError> {
        let directory = tempfile::tempdir()?;
        let home = directory.path();
        std::fs::write(home.join("state"), "state")?;
        let run: Result<(), AnyError> = Err(io::Error::other("the run failed").into());

        let result = arguments(home).clear_home_after(run).await;

        assert_eq!(
            result.map_err(|error| error.to_string()),
            Err("the run failed".to_string())
        );
        assert_eq!(std::fs::read_dir(home)?.count(), 0);
        Ok(())
    }

    #[tokio::test]
    async fn clears_provider_home_when_the_provider_cannot_open() -> Result<(), AnyError> {
        let directory = tempfile::tempdir()?;
        let home = directory.path();
        std::fs::write(home.join("state"), "state")?;
        let mut ran = false;

        let result = arguments(home)
            .run_with_service(None, async |_service| {
                ran = true;
                Ok(())
            })
            .await;

        assert!(result.is_err_and(|error| error.to_string().contains("cannot read /checksums")));
        assert!(!ran);
        assert_eq!(std::fs::read_dir(home)?.count(), 0);
        Ok(())
    }

    #[tokio::test]
    async fn reports_a_provider_home_that_cannot_be_cleared() -> Result<(), AnyError> {
        let directory = tempfile::tempdir()?;
        let home = directory.path().join("not-a-directory");
        std::fs::write(&home, "state")?;
        let arguments = arguments(&home);

        assert!(arguments.clear_home_after(Ok(())).await.is_err());
        let Err(error) = arguments
            .clear_home_after::<()>(Err(io::Error::other("the run failed").into()))
            .await
        else {
            return Err("clearing a file as the Provider home succeeded".into());
        };
        assert!(
            error
                .to_string()
                .starts_with("the run failed; clearing the Sandbox Provider home also failed: ")
        );
        Ok(())
    }
}
