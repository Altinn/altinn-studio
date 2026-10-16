use std::{cell::Cell, io, net::SocketAddr, process::ExitCode, rc::Rc};

use assistant_runner::{
    http,
    job::SandboxJobs,
    policy::AllowlistPolicy,
    routes::{MAX_ARCHIVE_BYTES, Routes},
    slot::Slot,
    vm::{VmArguments, Vms},
};
use clap::Parser;
use sandbox_host::{AnyError, ProviderArguments, require_kvm};
use sandbox_microsandbox::{LOG_DIRECTIVES, MicrosandboxNetworkBackend};
use tokio::{
    net::TcpListener,
    signal::unix::{SignalKind, signal},
};
use tracing_subscriber::EnvFilter;

#[derive(Parser)]
#[command(about = "Run app code for the Studio Assistant in a new microVM for each job")]
struct Arguments {
    #[command(flatten)]
    provider: ProviderArguments,
    #[command(flatten)]
    vm: VmArguments,
    /// Address of the HTTP API.
    #[arg(long, env = "LISTEN_ADDRESS", default_value = "0.0.0.0:8080")]
    listen_address: SocketAddr,
}

#[tokio::main(flavor = "local")]
async fn main() -> Result<ExitCode, AnyError> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new(format!("info,{LOG_DIRECTIVES}")))
        .init();
    let Arguments {
        provider,
        vm,
        listen_address,
    } = Arguments::parse();
    require_kvm()?;
    // A container that stopped during a job leaves the state of its VM in the Provider home of the pod.
    provider.clear_home().await?;
    let result = serve(&provider, vm, listen_address).await;
    let cleanup = provider.clear_home().await;
    match (result, cleanup) {
        (Ok(()), Ok(())) => Ok(ExitCode::SUCCESS),
        (Err(error), Ok(())) => Err(error),
        (Ok(()), Err(cleanup_error)) => Err(cleanup_error.into()),
        (Err(error), Err(cleanup_error)) => Err(io::Error::other(format!(
            "{error}; clearing the Sandbox Provider home also failed: {cleanup_error}"
        ))
        .into()),
    }
}

async fn serve(provider: &ProviderArguments, vm: VmArguments, listen_address: SocketAddr) -> Result<(), AnyError> {
    let network = Rc::new(MicrosandboxNetworkBackend::new(Rc::new(AllowlistPolicy)));
    let service = provider.open(None).await?.with_network_backend(network);
    let vms = Vms::new(service, vm)?;
    let slot = Slot::default();
    let stopping = Rc::new(Cell::new(false));
    let jobs = Rc::new(SandboxJobs::new(vms));
    let routes = Rc::new(Routes::new(jobs, slot.clone(), stopping.clone(), MAX_ARCHIVE_BYTES));
    let listener = TcpListener::bind(listen_address).await?;
    let mut terminate = signal(SignalKind::terminate())?;
    tracing::info!(%listen_address, "the runner is ready");
    http::serve(listener, routes, async move {
        terminate.recv().await;
        tracing::info!("stopping after the VM in use is deleted");
        stopping.set(true);
        slot.wait_until_free().await;
    })
    .await;
    Ok(())
}
