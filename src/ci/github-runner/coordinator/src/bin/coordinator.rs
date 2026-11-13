use std::process::ExitCode;

use clap::Parser;
use github_runner_coordinator::CoordinatorArguments;
use sandbox_hosting::{AnyError, ProviderArguments, require_kvm};

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
    let Arguments { provider, coordinator } = Arguments::parse();
    require_kvm()?;
    provider
        .run_with_service(async |service| github_runner_coordinator::run(service, coordinator).await)
        .await
}
