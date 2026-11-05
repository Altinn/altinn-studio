use std::{net::SocketAddr, num::NonZeroU64, process::ExitCode, rc::Rc, time::Duration};

use clap::Parser;
use job_host::{
    host::Host,
    http,
    lifecycle::{Stop, Timeouts, wait_for_stop},
    policy::{AllowedHosts, AllowlistPolicy},
    routes::Routes,
    vm::{VmArguments, Vms},
};
use sandbox_host::{AnyError, ProviderArguments, ShutdownSignals, require_kvm};
use sandbox_microsandbox::{LOG_DIRECTIVES, MicrosandboxNetworkBackend};
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

/// The time after the first fetch of the result that the job host keeps it, so that a client that restarted can fetch
/// it again.
const RESULT_GRACE: Duration = Duration::from_secs(30);

#[derive(Parser)]
#[command(about = "Run one command on app code in a new microVM for the core operator, then exit")]
struct Arguments {
    #[command(flatten)]
    provider: ProviderArguments,
    #[command(flatten)]
    vm: VmArguments,
    /// The address of the HTTP API.
    #[arg(long, env = "LISTEN_ADDRESS", default_value = "0.0.0.0:8080")]
    listen_address: SocketAddr,
    /// The time in seconds to wait for a run after the job host is ready. If no run claims the job host, it exits with
    /// 0. This value has no default here, because the `PodTemplate` sets it.
    #[arg(long, env = "REQUEST_TIMEOUT_SECONDS")]
    request_timeout_seconds: NonZeroU64,
    /// The time in seconds that the job host keeps a result that no client fetched. Then it exits with 0.
    #[arg(long, env = "RESULT_RETENTION_SECONDS", default_value = "300")]
    result_retention_seconds: NonZeroU64,
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
        result_retention_seconds,
    } = Arguments::parse();
    require_kvm()?;
    // If a container stopped during a run, the state of its VM stays in the Provider home of the pod.
    provider.clear_home().await?;
    let timeouts = Timeouts {
        request: Duration::from_secs(request_timeout_seconds.get()),
        retention: Duration::from_secs(result_retention_seconds.get()),
        grace: RESULT_GRACE,
    };
    provider
        .run_then_clear_home(Box::pin(serve_one_run(&provider, vm, listen_address, timeouts)))
        .await
        .map(exit_code)
}

async fn serve_one_run(
    provider: &ProviderArguments,
    vm: VmArguments,
    listen_address: SocketAddr,
    timeouts: Timeouts,
) -> Result<Stop, AnyError> {
    let vms = Rc::new(open_vms(provider, vm).await?);
    let host = Host::new(vms.clone());
    let routes = Rc::new(Routes::new(host.clone()));
    let listener = TcpListener::bind(listen_address).await?;
    let mut signals = ShutdownSignals::new()?;
    tracing::info!(%listen_address, ?timeouts, "the job host is ready for one run");
    let stop = http::serve(listener, routes, wait_for_stop(&host, timeouts, signals.receive())).await;
    if stop == Stop::Expired {
        tracing::warn!("no client fetched the result in time, so the job host stops");
    } else {
        tracing::info!(?stop, "the job host stops");
    }
    // The run deletes its VM when the command ends. The job host deletes the VM again here, because a signal stops the
    // run before that, and because that delete can fail. If the job host cannot delete the VM, it exits with an error.
    vms.delete().await.map(|()| stop)
}

async fn open_vms(provider: &ProviderArguments, vm: VmArguments) -> Result<Vms, AnyError> {
    let hosts = AllowedHosts::default();
    let network = Rc::new(MicrosandboxNetworkBackend::new(Rc::new(AllowlistPolicy::new(
        hosts.clone(),
    ))));
    let service = provider.open(None).await?.with_network_backend(network);
    Ok(Vms::new(service, vm, hosts)?)
}

fn exit_code(stop: Stop) -> ExitCode {
    match stop {
        Stop::Fetched | Stop::Expired | Stop::Unclaimed => ExitCode::SUCCESS,
        Stop::Signaled => ExitCode::from(ShutdownSignals::EXIT_CODE),
    }
}
