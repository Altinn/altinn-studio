use std::{io, net::SocketAddr, num::NonZeroU64, process::ExitCode, rc::Rc, time::Duration};

use assistant_runner::{
    http,
    lifecycle::{Claim, Stop, wait_for_stop},
    policy::AllowlistPolicy,
    routes::Routes,
    vm::{VmArguments, Vms},
};
use clap::Parser;
use sandbox_host::{AnyError, ProviderArguments, require_kvm};
use sandbox_microsandbox::{LOG_DIRECTIVES, MicrosandboxNetworkBackend};
use tokio::{
    net::TcpListener,
    signal::unix::{SignalKind, signal},
};
use tokio_util::sync::CancellationToken;
use tracing_subscriber::EnvFilter;

// The usual shell exit status for SIGTERM: 128 + 15. The GitHub runner coordinator uses the same value.
const SIGNALED_EXIT_CODE: u8 = 143;

#[derive(Parser)]
#[command(about = "Run one job for the Studio Assistant in a new microVM, then exit")]
struct Arguments {
    #[command(flatten)]
    provider: ProviderArguments,
    #[command(flatten)]
    vm: VmArguments,
    /// The address of the HTTP API.
    #[arg(long, env = "LISTEN_ADDRESS", default_value = "0.0.0.0:8080")]
    listen_address: SocketAddr,
    /// The time in seconds to wait for the job request after the job host is ready. If no request arrives, the job
    /// host exits with 0. This value has no default here, because the `PodTemplate` sets it.
    #[arg(long, env = "REQUEST_TIMEOUT_SECONDS")]
    request_timeout_seconds: NonZeroU64,
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
        request_timeout_seconds,
    } = Arguments::parse();
    require_kvm()?;
    // If a container stopped during a job, the state of its VM stays in the Provider home of the pod.
    provider.clear_home().await?;
    let request_timeout = Duration::from_secs(request_timeout_seconds.get());
    let result = serve_one_job(&provider, vm, listen_address, request_timeout).await;
    let cleanup = provider.clear_home().await;
    match (result, cleanup) {
        (Ok(stop), Ok(())) => Ok(exit_code(stop)),
        (Err(error), Ok(())) => Err(error),
        (Ok(_), Err(cleanup_error)) => Err(cleanup_error.into()),
        (Err(error), Err(cleanup_error)) => Err(io::Error::other(format!(
            "{error}; clearing the Sandbox Provider home also failed: {cleanup_error}"
        ))
        .into()),
    }
}

async fn serve_one_job(
    provider: &ProviderArguments,
    vm: VmArguments,
    listen_address: SocketAddr,
    request_timeout: Duration,
) -> Result<Stop, AnyError> {
    let vms = Rc::new(open_vms(provider, vm).await?);
    let claim = Claim::default();
    let stopping = CancellationToken::new();
    let routes = Rc::new(Routes::new(vms.clone(), claim.clone(), stopping.clone()));
    let listener = TcpListener::bind(listen_address).await?;
    let signaled = shutdown_signal()?;
    tracing::info!(%listen_address, ?request_timeout, "the job host is ready for one job");
    let stop = http::serve(
        listener,
        routes,
        wait_for_stop(&claim, &stopping, request_timeout, signaled),
    )
    .await;
    tracing::info!(?stop, "the job host stops");
    // A job does not delete its VM. The job host deletes the VM here, because no job runs after the server stops. If
    // the job host cannot delete the VM, it exits with an error. This is also true after it sent the response.
    vms.delete().await.map(|()| stop)
}

async fn open_vms(provider: &ProviderArguments, vm: VmArguments) -> Result<Vms, AnyError> {
    let network = Rc::new(MicrosandboxNetworkBackend::new(Rc::new(AllowlistPolicy)));
    let service = provider.open(None).await?.with_network_backend(network);
    Ok(Vms::new(service, vm)?)
}

/// Completes when the process receives SIGINT or SIGTERM. The GitHub runner coordinator does the same.
fn shutdown_signal() -> io::Result<impl Future<Output = ()>> {
    let mut interrupt = signal(SignalKind::interrupt())?;
    let mut terminate = signal(SignalKind::terminate())?;
    Ok(async move {
        tokio::select! {
            _ = interrupt.recv() => {}
            _ = terminate.recv() => {}
        }
    })
}

fn exit_code(stop: Stop) -> ExitCode {
    match stop {
        Stop::Served | Stop::Unclaimed => ExitCode::SUCCESS,
        Stop::Signaled => ExitCode::from(SIGNALED_EXIT_CODE),
    }
}
