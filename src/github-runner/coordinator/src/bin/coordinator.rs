use std::{fs::OpenOptions, io, process::ExitCode};

use clap::Parser;
use github_runner_coordinator::{AnyError, CoordinatorArguments, provider::ProviderArguments};

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
    github_runner_coordinator::run(service, arguments.coordinator).await
}

fn require_kvm() -> Result<(), io::Error> {
    OpenOptions::new()
        .read(true)
        .write(true)
        .open("/dev/kvm")
        .map(|_| ())
        .map_err(|error| io::Error::new(error.kind(), format!("cannot open /dev/kvm: {error}")))
}
