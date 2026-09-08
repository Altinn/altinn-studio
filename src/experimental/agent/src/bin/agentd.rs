use std::{io::IsTerminal as _, path::PathBuf, process::ExitCode, rc::Rc, time::Duration};

use agent::{
    Error,
    control_api::Server,
    control_plane::{ControlPlane, Controller, Reconciler},
    local::home::ControlPlaneHome,
    persistence,
    sandbox::ExecutionService,
    sessions::Service as SessionService,
};
use clap::Parser;
use tokio::runtime::LocalRuntime;

#[derive(Parser)]
#[command(name = "agentd", about = "Run the per-user Agent control plane", version = agent_version())]
struct Arguments {
    /// Agent control-plane home.
    #[arg(long)]
    home: Option<PathBuf>,
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
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(agent::local::process::daemon_log_filter())),
        )
        .with_writer(std::io::stderr)
        .with_ansi(std::io::stderr().is_terminal())
        .init();
    let home = ControlPlaneHome::resolve(arguments.home.as_deref())?;
    let _lock = home.acquire_lock()?;
    let database = persistence::Database::open(&home.path().join("agent.db"))?;
    let runtime = LocalRuntime::new()?;
    runtime.block_on(run_control_plane(home, database))
}

type ErrorHandler<Key> = Rc<dyn Fn(Option<Key>, &Error)>;

/// Logs recoverable reconciliation errors for one durable resource kind.
fn reconciliation_errors<Key: std::fmt::Display + 'static>(resource: &'static str) -> ErrorHandler<Key> {
    Rc::new(move |id, error| {
        if let Some(id) = id {
            tracing::warn!(resource, %id, %error, "reconciliation failed");
        } else {
            tracing::error!(resource, %error, "reconciliation scan failed");
        }
    })
}

async fn open_sandboxes(
    home: &ControlPlaneHome,
    database: &persistence::Database,
    credentials: Rc<agent::harness::AuthenticationManager>,
    policy: Rc<agent::authorization::AgentPolicyEngine>,
    platform_api_port: u16,
) -> Result<(Rc<agent::sandbox::Service>, String), Error> {
    let microsandbox = Rc::new(
        agent::sandbox::microsandbox::Adapter::open(
            home.path(),
            database.clone(),
            credentials,
            policy,
            platform_api_port,
        )
        .await?,
    );
    let session_hook_url = microsandbox.platform_url("/v1/session/hooks/start")?;
    let provider: Rc<dyn agent::sandbox::Provider> = microsandbox;
    let platform: Rc<dyn agent::sandbox::PlatformAdapter> = Rc::new(agent::sandbox::platform::Linux);
    Ok((
        Rc::new(agent::sandbox::Service::new([provider], [platform])?),
        session_hook_url,
    ))
}

async fn run_control_plane(home: ControlPlaneHome, database: persistence::Database) -> Result<(), Error> {
    let store = Rc::new(database.clone());
    let credentials = Rc::new(agent::harness::AuthenticationManager::new(database.clone()));
    let policy = Rc::new(agent::authorization::AgentPolicyEngine::new());
    let platform_api_listener = agent::platform_api::bind_persistent(&home.path().join("platform-api-port")).await?;
    let platform_api_port = platform_api_listener.local_addr()?.port();
    let (sandboxes, session_hook_url) =
        open_sandboxes(&home, &database, credentials.clone(), policy, platform_api_port).await?;
    let session_store: Rc<dyn agent::sessions::SessionStore> = store.clone();
    let progress = agent::progress::Hub::new();
    let statuses = agent::control_plane::StatusWatch::new();

    let platform_api_server = Rc::new(agent::platform_api::Server::new(
        session_store.clone(),
        Rc::new(|error| tracing::error!(%error, "Platform API connection failed")),
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
        reconciliation_errors("Session"),
    );
    let session_notifier = Rc::new(agent::sessions::AgentNotifier::new(
        session_store.clone(),
        session_wakeup.clone(),
        Rc::new(|error| tracing::error!(%error, "Session notification scan failed")),
    ));
    let reconciler = Rc::new(
        Reconciler::new(store.clone(), sandboxes, progress.clone(), statuses.clone())
            .with_session_notifier(session_notifier),
    );
    let (controller, wakeup) = Controller::new(
        store.clone(),
        reconciler,
        Duration::from_secs(30),
        reconciliation_errors("Agent"),
    );
    let control_plane = Rc::new(ControlPlane::new(store.clone(), Rc::new(wakeup.clone())));
    let executions = Rc::new(ExecutionService::new(
        store.clone(),
        wakeup.clone(),
        progress.clone(),
        statuses.clone(),
    ));
    let sessions = Rc::new(SessionService::new(
        session_store,
        store,
        wakeup,
        session_wakeup,
        progress,
        statuses,
    ));
    let server = Rc::new(Server::new(
        control_plane,
        credentials.clone(),
        executions,
        sessions,
        Rc::new(|error| tracing::error!(%error, "Control API connection failed")),
    ));
    let mut controller_task = tokio::task::spawn_local(controller.run());
    let mut session_controller_task = tokio::task::spawn_local(session_controller.run());
    let mut platform_api_task = tokio::task::spawn_local(platform_api_server.serve(platform_api_listener));
    let socket_path = home.socket_path();

    let result = tokio::select! {
        result = server.serve_path(&socket_path) => result,
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
