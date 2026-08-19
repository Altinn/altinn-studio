use std::process::ExitCode;

use clap::Parser;
use github_runner_coordinator::{CoordinatorArguments, provider::ProviderArguments};

#[derive(Parser)]
#[command(about = "Run one ephemeral GitHub Actions runner inside a Sandbox")]
struct Arguments {
    #[command(flatten)]
    provider: ProviderArguments,
    #[command(flatten)]
    coordinator: CoordinatorArguments,
}

#[tokio::main(flavor = "local")]
async fn main() -> Result<ExitCode, Box<dyn std::error::Error>> {
    let arguments = Arguments::parse();
    github_runner_coordinator::provider::require_kvm()?;
    let service = arguments.provider.open(None).await?;
    github_runner_coordinator::run(service, arguments.coordinator).await
}
