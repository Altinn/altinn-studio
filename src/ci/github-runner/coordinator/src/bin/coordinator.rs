use std::process::ExitCode;

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
    arguments
        .provider
        .run_then_clear_home(Box::pin(github_runner_coordinator::run(service, arguments.coordinator)))
        .await
}
