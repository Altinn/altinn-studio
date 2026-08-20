use std::{path::PathBuf, process::ExitCode, rc::Rc, time::Duration};

use agent::{
    Error,
    control_api::Server,
    control_plane::{ControlPlane, Controller, Reconciler, memory},
    home::ControlPlaneHome,
};
use clap::Parser;
use sandbox::{
    SandboxService, memory as sandbox_memory,
    network::{NetworkEndpointSelection, PacketMedium},
};
use tokio::runtime::LocalRuntime;

#[derive(Parser)]
#[command(about = "Run the per-user Agent control plane")]
struct Arguments {
    /// Agent control-plane home.
    #[arg(long)]
    home: Option<PathBuf>,
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("agentd: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), Error> {
    let arguments = Arguments::parse();
    let home = ControlPlaneHome::resolve(arguments.home.as_deref())?;
    let _lock = home.acquire_lock()?;
    let runtime = LocalRuntime::new()?;
    runtime.block_on(run_control_plane(home))
}

async fn run_control_plane(home: ControlPlaneHome) -> Result<(), Error> {
    let store = Rc::new(memory::InMemoryAgentStore::new());
    let sandbox_backend = Rc::new(sandbox_memory::Provider::new());
    let sandbox_service = Rc::new(SandboxService::new(sandbox_backend).with_network_backend(Rc::new(
        sandbox_memory::NetworkBackend::for_endpoint(
            "memory",
            NetworkEndpointSelection::Packet(PacketMedium::Ethernet),
        ),
    )));
    let reconciler = Rc::new(Reconciler::new(
        store.clone(),
        sandbox_service,
        Rc::new(memory::InMemoryAgentRuntimeBundleResolver::new()),
        Rc::new(memory::InMemoryAgentRuntimeClient::new()),
    ));
    let (controller, wakeup) = Controller::new(
        store.clone(),
        reconciler,
        Duration::from_secs(30),
        Rc::new(|error| eprintln!("agentd reconciliation: {error}")),
    );
    let control_plane = Rc::new(ControlPlane::new(store, Rc::new(wakeup)));
    let server = Rc::new(Server::new(
        control_plane,
        Rc::new(|error| eprintln!("agentd local API connection: {error}")),
    ));
    let controller_task = tokio::task::spawn_local(controller.run());
    let socket_path = home.socket_path();

    let result = tokio::select! {
        result = server.serve_path(&socket_path) => result,
        result = tokio::signal::ctrl_c() => result.map_err(Error::from),
    };
    controller_task.abort();
    result
}
