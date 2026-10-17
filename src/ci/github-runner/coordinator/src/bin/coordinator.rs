use std::{io, process::ExitCode};

use clap::Parser;
use github_runner_coordinator::{AnyError, CoordinatorArguments};
use sandbox_host::{ProviderArguments, require_kvm};

#[derive(Parser)]
#[command(about = "Run one ephemeral GitHub Actions runner inside a Sandbox")]
struct Arguments {
    #[command(flatten)]
    provider: ProviderArguments,
    #[command(flatten)]
    coordinator: CoordinatorArguments,
}

#[tokio::main(flavor = "local")]
async fn main() -> Result<ExitCode, AnyError> {
    let arguments = Arguments::parse();
    require_kvm()?;
    let service = arguments.provider.open(None).await?;
    let result = github_runner_coordinator::run(service, arguments.coordinator).await;
    let cleanup = arguments.provider.clear_home().await;
    match (result, cleanup) {
        (Ok(exit_code), Ok(())) => Ok(exit_code),
        (Err(error), Ok(())) => Err(error),
        (Ok(_), Err(cleanup_error)) => Err(cleanup_error.into()),
        (Err(error), Err(cleanup_error)) => Err(io::Error::other(format!(
            "{error}; clearing the Sandbox Provider home also failed: {cleanup_error}"
        ))
        .into()),
    }
}
