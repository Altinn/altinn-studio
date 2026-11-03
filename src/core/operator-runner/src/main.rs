use std::{net::SocketAddr, num::NonZeroU64, process::ExitCode, rc::Rc, time::Duration};

use clap::Parser;
use operator_runner::{
    host::Host,
    http,
    lifecycle::{Stop, Timeouts, wait_for_stop},
    policy::{AllowedHosts, AllowlistPolicy},
    routes::Routes,
    vm::{VmArguments, Vms},
};
use sandbox::SandboxService;
use sandbox_hosting::{AnyError, ProviderArguments, ShutdownSignals, require_kvm};
use sandbox_microsandbox::{LOG_DIRECTIVES, MicrosandboxNetworkBackend};
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

/// The time after the first fetch of the result that the operator runner keeps it, so that a client that restarted can
/// fetch it again.
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
    /// The time in seconds to wait for a run after the operator runner is ready. If no run claims the operator runner,
    /// it exits with 0. This value has no default here, because the `PodTemplate` sets it.
    #[arg(long, env = "REQUEST_TIMEOUT_SECONDS")]
    request_timeout_seconds: NonZeroU64,
    /// The time in seconds that the operator runner keeps a result that no client fetched. Then it exits with 0.
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
        .run_with_service(async |service| serve_one_run(service, vm, listen_address, timeouts).await)
        .await
        .map(exit_code)
}

async fn serve_one_run(
    service: SandboxService,
    vm: VmArguments,
    listen_address: SocketAddr,
    timeouts: Timeouts,
) -> Result<Stop, AnyError> {
    let vms = Rc::new(open_vms(service, vm)?);
    let host = Host::new(vms.clone());
    let routes = Rc::new(Routes::new(host.clone()));
    let listener = TcpListener::bind(listen_address).await?;
    let mut signals = ShutdownSignals::new()?;
    tracing::info!(%listen_address, ?timeouts, "the operator runner is ready for one run");
    let stop = http::serve(listener, routes, wait_for_stop(&host, timeouts, signals.receive())).await;
    if stop == Stop::Expired {
        tracing::warn!("no client fetched the result in time, so the operator runner stops");
    } else {
        tracing::info!(?stop, "the operator runner stops");
    }
    // The run deletes its VM when the command ends. The operator runner deletes the VM again here, because a signal
    // stops the run before that, and because that delete can fail. If the operator runner cannot delete the VM, it
    // exits with an error.
    vms.delete().await.map(|()| stop)
}

fn open_vms(service: SandboxService, vm: VmArguments) -> Result<Vms, AnyError> {
    let hosts = AllowedHosts::default();
    let network = Rc::new(MicrosandboxNetworkBackend::new(Rc::new(AllowlistPolicy::new(
        hosts.clone(),
    ))));
    Ok(Vms::new(service.with_network_backend(network), vm, hosts)?)
}

fn exit_code(stop: Stop) -> ExitCode {
    match stop {
        Stop::Fetched | Stop::Expired | Stop::Unclaimed => ExitCode::SUCCESS,
        Stop::Signaled => ExitCode::from(ShutdownSignals::EXIT_CODE),
    }
}
