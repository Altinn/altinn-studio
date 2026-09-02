use std::{net::Ipv4Addr, path::PathBuf, process::ExitCode, rc::Rc, time::Duration};

use agent::{
    Error,
    control_api::Server,
    control_plane::{ControlPlane, Controller, Reconciler},
    local::home::ControlPlaneHome,
    persistence,
};
use clap::Parser;
use tokio::runtime::LocalRuntime;

#[derive(Parser)]
#[command(name = "agentd", about = "Run the per-user Agent control plane", version = agent_version())]
struct Arguments {
    /// Agent control-plane home.
    #[arg(long)]
    home: Option<PathBuf>,
    /// Listen on unauthenticated, unencrypted IPv4 loopback TCP.
    #[arg(short = 'p', long, value_parser = clap::value_parser!(u16).range(1..))]
    insecure_tcp_port: Option<u16>,
}

const fn agent_version() -> &'static str {
    match option_env!("AGENT_VERSION") {
        Some(version) => version,
        None => env!("CARGO_PKG_VERSION"),
    }
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
    let _lock = match home.acquire_lock() {
        Err(Error::Io(error))
            if arguments.insecure_tcp_port.is_some() && error.kind() == std::io::ErrorKind::WouldBlock =>
        {
            return Err(Error::Daemon(format!(
                "another agentd owns {}; stop it before relaunching with --insecure-tcp-port",
                home.path().display()
            )));
        }
        result => result?,
    };
    let database = persistence::Database::open(&home.path().join("agent.db"))?;
    let runtime = LocalRuntime::new()?;
    runtime.block_on(async move {
        let tcp_listener = bind_insecure_tcp(arguments.insecure_tcp_port).await?;
        run_control_plane(home, database, tcp_listener).await
    })
}

async fn run_control_plane(
    home: ControlPlaneHome,
    database: persistence::Database,
    tcp_listener: Option<tokio::net::TcpListener>,
) -> Result<(), Error> {
    let store = Rc::new(database.clone());
    let credentials = Rc::new(agent::harness::AuthenticationManager::new(database.clone()));
    let policy = Rc::new(agent::authorization::AgentPolicyEngine::new());
    let platform_api_listener = agent::platform_api::bind_persistent(&home.path().join("platform-api-port")).await?;
    let platform_api_port = platform_api_listener.local_addr()?.port();
    let microsandbox = Rc::new(
        agent::sandbox::microsandbox::Adapter::open(
            home.path(),
            database.clone(),
            credentials.clone(),
            policy.clone(),
            platform_api_port,
        )
        .await?,
    );
    let session_hook_url = microsandbox.platform_url("/v1/session/hooks/start")?;
    let provider: Rc<dyn agent::sandbox::Provider> = microsandbox;
    let platform: Rc<dyn agent::sandbox::PlatformAdapter> = Rc::new(agent::sandbox::platform::Linux);
    let sandboxes = Rc::new(agent::sandbox::Service::new([provider], [platform])?);
    let session_store: Rc<dyn agent::sessions::SessionStore> = store.clone();
    let platform_api_server = Rc::new(agent::platform_api::Server::new(
        session_store.clone(),
        Rc::new(|error| eprintln!("agentd Platform API: {error}")),
    ));
    let session_reconciler: Rc<dyn agent::sessions::Reconcile<agent::sessions::SessionId>> =
        Rc::new(agent::sessions::Reconciler::new(
            session_store.clone(),
            store.clone(),
            sandboxes.clone(),
            session_hook_url,
        ));
    let (session_controller, session_wakeup) = agent::sessions::Controller::new(
        session_store.clone(),
        session_reconciler,
        Duration::from_secs(30),
        Rc::new(|id, error| match id {
            Some(id) => eprintln!("agentd reconciliation for Session {id}: {error}"),
            None => eprintln!("agentd Session reconciliation scan: {error}"),
        }),
    );
    let session_notifier = Rc::new(agent::sessions::AgentNotifier::new(
        session_store.clone(),
        session_wakeup.clone(),
        Rc::new(|error| eprintln!("agentd Session notification scan: {error}")),
    ));
    let reconciler = Rc::new(Reconciler::new(store.clone(), sandboxes).with_session_notifier(session_notifier));
    let (controller, wakeup) = Controller::new(
        store.clone(),
        reconciler,
        Duration::from_secs(30),
        Rc::new(|id, error| match id {
            Some(id) => eprintln!("agentd reconciliation for Agent {id}: {error}"),
            None => eprintln!("agentd reconciliation scan: {error}"),
        }),
    );
    let control_plane = Rc::new(ControlPlane::new(store.clone(), Rc::new(wakeup.clone())));
    let executions = Rc::new(agent::sandbox::ExecutionService::new(store.clone(), wakeup.clone()));
    let sessions = Rc::new(agent::sessions::Service::new(
        session_store,
        store,
        wakeup,
        session_wakeup,
    ));
    let server = Rc::new(Server::new(
        control_plane,
        credentials.clone(),
        executions,
        sessions,
        Rc::new(|error| eprintln!("agentd Control API connection: {error}")),
    ));
    let mut controller_task = tokio::task::spawn_local(controller.run());
    let mut session_controller_task = tokio::task::spawn_local(session_controller.run());
    let mut platform_api_task = tokio::task::spawn_local(platform_api_server.serve(platform_api_listener));
    let socket_path = home.socket_path();
    let tcp_api = serve_insecure_tcp(server.clone(), tcp_listener);
    tokio::pin!(tcp_api);
    let result = tokio::select! {
        result = server.serve_path(&socket_path) => result,
        result = &mut tcp_api => result,
        result = tokio::signal::ctrl_c() => result.map_err(Error::from),
        result = &mut controller_task => match result {
            Ok(()) => Err(Error::Daemon("reconciliation controller stopped".into())),
            Err(error) => Err(Error::Daemon(format!("reconciliation controller task failed: {error}"))),
        },
        result = &mut session_controller_task => match result {
            Ok(()) => Err(Error::Daemon("Session reconciliation controller stopped".into())),
            Err(error) => Err(Error::Daemon(format!("Session reconciliation controller task failed: {error}"))),
        },
        result = &mut platform_api_task => match result {
            Ok(Ok(())) => Err(Error::Daemon("Platform API stopped".into())),
            Ok(Err(error)) => Err(Error::Daemon(format!("Platform API failed: {error}"))),
            Err(error) => Err(Error::Daemon(format!("Platform API task failed: {error}"))),
        },
    };
    controller_task.abort();
    session_controller_task.abort();
    platform_api_task.abort();
    result
}

async fn bind_insecure_tcp(port: Option<u16>) -> Result<Option<tokio::net::TcpListener>, Error> {
    let Some(port) = port else {
        return Ok(None);
    };
    let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, port)).await?;
    eprintln!(
        "agentd: WARNING: listening on {} without authentication or encryption",
        listener.local_addr()?
    );
    Ok(Some(listener))
}

async fn serve_insecure_tcp(server: Rc<Server>, listener: Option<tokio::net::TcpListener>) -> Result<(), Error> {
    match listener {
        Some(listener) => server.serve_tcp(listener).await,
        None => std::future::pending().await,
    }
}

#[cfg(test)]
mod tests {
    use clap::Parser as _;

    use super::Arguments;

    #[test]
    fn insecure_tcp_port_accepts_long_and_short_flags_but_not_zero() {
        let long =
            Arguments::try_parse_from(["agentd", "--insecure-tcp-port", "7463"]).expect("long TCP flag should parse");
        let short = Arguments::try_parse_from(["agentd", "-p", "8463"]).expect("short TCP flag should parse");

        assert_eq!(long.insecure_tcp_port, Some(7463));
        assert_eq!(short.insecure_tcp_port, Some(8463));
        assert!(Arguments::try_parse_from(["agentd", "-p", "0"]).is_err());
    }
}
