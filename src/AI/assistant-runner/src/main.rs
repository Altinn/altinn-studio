use std::{
    cell::Cell,
    io,
    net::{IpAddr, SocketAddr},
    process::ExitCode,
    rc::Rc,
    time::Duration,
};

use assistant_runner::{
    http,
    policy::AllowlistPolicy,
    routes::Routes,
    slot::Slot,
    ssh::SandboxSshVms,
    vm::{VmArguments, Vms},
};
use clap::Parser;
use sandbox::SandboxService;
use sandbox_host::{AnyError, ProviderArguments, require_kvm};
use sandbox_microsandbox::{LOG_DIRECTIVES, MicrosandboxNetworkBackend, MicrosandboxProvider};
use tokio::{
    net::TcpListener,
    signal::unix::{SignalKind, signal},
};
use tracing_subscriber::EnvFilter;

/// A job uses a VM for up to 11 minutes. The pod gets 14 minutes to stop, so the timer deletes each VM before that.
const VM_LIFETIME: Duration = Duration::from_mins(13);

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
    /// Address of this pod. The client sends all calls for a VM to the pod that has it.
    #[arg(long, env = "POD_IP")]
    pod_ip: IpAddr,
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
        pod_ip,
    } = Arguments::parse();
    require_kvm()?;
    // A container that stopped during a job leaves the state of its VM in the Provider home of the pod.
    provider.clear_home().await?;
    let base_url = format!("http://{}", SocketAddr::new(pod_ip, listen_address.port()));
    let result = serve(&provider, vm, listen_address, base_url).await;
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

async fn serve(
    provider: &ProviderArguments,
    vm: VmArguments,
    listen_address: SocketAddr,
    base_url: String,
) -> Result<(), AnyError> {
    let slot = Slot::default();
    let stopping = Rc::new(Cell::new(false));
    let routes = Rc::new(Routes::new(
        Rc::new(start_vms(provider.open_provider(None).await?, vm, slot.clone())?),
        stopping.clone(),
        base_url,
        VM_LIFETIME,
    ));
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

fn start_vms(microsandbox: Rc<MicrosandboxProvider>, vm: VmArguments, slot: Slot) -> Result<SandboxSshVms, io::Error> {
    let network = Rc::new(MicrosandboxNetworkBackend::new(Rc::new(AllowlistPolicy)));
    let service = SandboxService::new(microsandbox.clone()).with_network_backend(network);
    Ok(SandboxSshVms::new(Vms::new(service, vm)?, microsandbox, slot))
}
