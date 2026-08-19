use std::{error::Error, io, path::PathBuf, time::Instant};

use clap::{Parser, Subcommand};
use github_runner_sandbox_coordinator::provider::ProviderArguments;
use sandbox::{
    Platform, RootFilesystemMode,
    image::{ImageSource, RegistryAuthentication, ResolveRequest},
};

type AnyError = Box<dyn Error>;

#[derive(Parser)]
#[command(about = "Export or import a prepared Sandbox image")]
struct Arguments {
    #[command(flatten)]
    provider: ProviderArguments,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Resolve an OCI image and export its prepared representation.
    Export {
        /// Digest-pinned source OCI image.
        #[arg(long, env = "SANDBOX_IMAGE")]
        image: String,
        /// Directory that receives the opaque prepared image.
        #[arg(long, env = "PREPARED_IMAGE_DIRECTORY")]
        destination: PathBuf,
        /// Registry username used only while creating the prepared image.
        #[arg(long, env = "REGISTRY_USERNAME", hide_env_values = true)]
        registry_username: Option<String>,
        /// Registry password or access token used only while creating the prepared image.
        #[arg(long, env = "REGISTRY_PASSWORD", hide_env_values = true)]
        registry_password: Option<String>,
    },
    /// Validate and import a prepared image into the Provider's image domain.
    Import {
        /// Digest-pinned source OCI image recorded by the prepared image.
        #[arg(long, env = "SANDBOX_IMAGE")]
        image: String,
        /// Directory containing the opaque prepared image.
        #[arg(long, env = "PREPARED_IMAGE_DIRECTORY")]
        source: PathBuf,
    },
}

#[tokio::main(flavor = "local")]
async fn main() -> Result<(), AnyError> {
    let Arguments { provider, command } = Arguments::parse();
    match command {
        Command::Export {
            image,
            destination,
            registry_username,
            registry_password,
        } => {
            let service = provider
                .open_images(registry_authentication(
                    registry_username,
                    registry_password,
                )?)
                .await?;
            export(&service, image, destination).await
        }
        Command::Import { image, source } => {
            let service = provider.open_images(None).await?;
            import(&service, image, source).await
        }
    }
}

async fn export(
    service: &sandbox::SandboxService,
    image: String,
    destination: PathBuf,
) -> Result<(), AnyError> {
    let started = Instant::now();
    let request = prepared_image_request(image);
    let prepared = service
        .export_prepared_image(&request, &destination)
        .await?;
    println!(
        "prepared image exported; manifest={}; artifact={}; virtual_size_bytes={}; total_ms={}",
        prepared.image.manifest_digest,
        prepared.artifact_digest,
        prepared.virtual_size_bytes,
        started.elapsed().as_millis()
    );
    Ok(())
}

async fn import(
    service: &sandbox::SandboxService,
    image: String,
    source: PathBuf,
) -> Result<(), AnyError> {
    let started = Instant::now();
    let request = prepared_image_request(image);
    let prepared = service.import_prepared_image(&request, &source).await?;
    println!(
        "prepared image imported; manifest={}; artifact={}; elapsed_ms={}",
        prepared.image.manifest_digest,
        prepared.artifact_digest,
        started.elapsed().as_millis()
    );
    Ok(())
}

fn prepared_image_request(reference: String) -> ResolveRequest {
    ResolveRequest {
        source: ImageSource::Reference { reference },
        platform: native_linux_platform(),
        root_filesystem_mode: RootFilesystemMode::Direct,
    }
}

fn native_linux_platform() -> Platform {
    Platform::new(
        "linux",
        match std::env::consts::ARCH {
            "x86_64" => "amd64",
            "aarch64" => "arm64",
            architecture => architecture,
        },
    )
}

fn registry_authentication(
    username: Option<String>,
    password: Option<String>,
) -> Result<Option<RegistryAuthentication>, io::Error> {
    match (username, password) {
        (None, None) => Ok(None),
        (Some(username), Some(password)) if !username.is_empty() && !password.is_empty() => {
            Ok(Some(RegistryAuthentication::Basic { username, password }))
        }
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "REGISTRY_USERNAME and REGISTRY_PASSWORD must be supplied together",
        )),
    }
}
