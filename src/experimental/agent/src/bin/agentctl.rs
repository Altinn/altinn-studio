use std::{
    path::{Path, PathBuf},
    process::{Child, Command as ProcessCommand, ExitCode, Stdio},
    time::Duration,
};

use agent::{
    Error, control_api::Client, control_plane::ApplyRequest, local::home::ControlPlaneHome, manifest,
    sessions::SessionName,
};
use clap::{Parser, Subcommand};
use tokio::runtime::LocalRuntime;

#[derive(Parser)]
#[command(name = "agentctl", about = "Manage the per-user Agent control plane", version = agent_version())]
struct Arguments {
    /// Agent control-plane home.
    #[arg(long, global = true)]
    home: Option<PathBuf>,
    #[command(subcommand)]
    command: Command,
}

const fn agent_version() -> &'static str {
    match option_env!("AGENT_VERSION") {
        Some(version) => version,
        None => env!("CARGO_PKG_VERSION"),
    }
}

#[derive(Subcommand)]
enum Command {
    /// Manage Claude Code harness authentication.
    Claude {
        #[command(subcommand)]
        command: ClaudeCommand,
    },
    /// Create or update an Agent from a manifest.
    Apply {
        /// Agent manifest path.
        #[arg(short = 'f', long = "filename")]
        filename: PathBuf,
        /// Override metadata.name so one manifest can create multiple Agents.
        #[arg(long)]
        name: Option<String>,
    },
    /// Print one Agent as JSON.
    Get {
        /// Agent name.
        name: String,
    },
    /// Request deletion of one Agent.
    Delete {
        /// Agent name.
        name: String,
    },
    /// Create or attach to a named Session in an Agent sandbox.
    Attach {
        /// Agent name.
        agent: String,
        /// Stable Session name.
        session: String,
    },
    /// List host-tracked sessions for one Agent.
    Sessions {
        /// Agent name.
        agent: String,
    },
}

#[derive(Subcommand)]
enum ClaudeCommand {
    /// Mint a long-lived Claude token on the host and store it for agents.
    Login,
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("agentctl: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), Error> {
    let arguments = Arguments::parse();
    let home = ControlPlaneHome::resolve(arguments.home.as_deref())?;
    let client = Client::for_path(home.socket_path());
    LocalRuntime::new()?.block_on(async move {
        ensure_daemon(&home, &client).await?;
        match arguments.command {
            Command::Claude {
                command: ClaudeCommand::Login,
            } => {
                let token = agent::harness::acquire_host_token(agent::Harness::ClaudeCode)?;
                let imported = client.auth_login(agent::Harness::ClaudeCode, token.to_string()).await?;
                println!("{} authentication stored", imported.provider);
            }
            Command::Apply { filename, name } => {
                let mut request = read_apply_request(filename).await?;
                if let Some(name) = name {
                    request.agent.metadata.name = name;
                }
                let applied = client.apply(request).await?;
                println!("{}", serde_json::to_string_pretty(&applied)?);
            }
            Command::Get { name } => {
                let agent = client.get(&name).await?;
                println!("{}", serde_json::to_string_pretty(&agent)?);
            }
            Command::Delete { name } => {
                client.delete(&name).await?;
                println!("Agent {name:?} deleted");
            }
            Command::Attach { agent, session } => {
                let session = SessionName::new(session)?;
                eprintln!(
                    "Ensuring Agent {agent:?} and Session {session:?}; initial provisioning can take several minutes...",
                    session = session.as_str()
                );
                let target = client.ensure_session(&agent, session).await?;
                agent::sessions::attach(home.path(), &target).await?;
            }
            Command::Sessions { agent } => {
                let sessions = client.list_sessions(&agent).await?;
                println!("{}", serde_json::to_string_pretty(&sessions)?);
            }
        }
        Ok(())
    })
}

async fn ensure_daemon(home: &ControlPlaneHome, client: &Client) -> Result<(), Error> {
    if client.health().await.is_ok() {
        return Ok(());
    }
    let mut daemon = spawn_daemon(home)?;
    for _ in 0..100 {
        tokio::time::sleep(Duration::from_millis(100)).await;
        if client.health().await.is_ok() {
            return Ok(());
        }
        if let Some(status) = daemon.try_wait()? {
            return Err(Error::Daemon(format!(
                "automatic startup exited with {status}; see {}",
                home.daemon_log_path().display()
            )));
        }
    }
    Err(Error::Daemon(format!(
        "automatic startup did not become ready within 10 seconds; see {}",
        home.daemon_log_path().display()
    )))
}

fn spawn_daemon(home: &ControlPlaneHome) -> Result<Child, Error> {
    home.prepare()?;
    let log = home.open_daemon_log()?;
    let executable = daemon_executable(&std::env::current_exe()?);
    let mut command = ProcessCommand::new(executable);
    command
        .arg("--home")
        .arg(home.path())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(log);
    agent::local::process::configure_detached(&mut command);
    command.spawn().map_err(Error::from)
}

fn daemon_executable(agentctl: &Path) -> PathBuf {
    agentctl.with_file_name(format!("agentd{}", std::env::consts::EXE_SUFFIX))
}

async fn read_apply_request(filename: PathBuf) -> Result<ApplyRequest, Error> {
    let filename = absolute(filename)?;
    let bytes = tokio::fs::read(&filename).await?;
    let agent = manifest::decode(&bytes)?;
    let source_directory = filename
        .parent()
        .ok_or_else(|| Error::Invalid("manifest path has no parent directory".into()))?
        .to_path_buf();
    Ok(ApplyRequest {
        source_directory,
        agent,
    })
}

fn absolute(path: PathBuf) -> Result<PathBuf, Error> {
    if path.is_absolute() {
        Ok(path)
    } else {
        Ok(std::env::current_dir()?.join(path))
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use std::time::SystemTime;

    use super::*;

    #[test]
    fn apply_source_is_resolved_in_the_client_working_directory() {
        let nonce = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("system time should follow the epoch")
            .as_nanos();
        let directory = std::env::temp_dir().join(format!("agentctl-source-{}-{nonce}", std::process::id()));
        std::fs::create_dir_all(&directory).expect("temporary directory");
        let manifest_path = directory.join("agent.yaml");
        std::fs::copy(
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("examples/minimal/agent.yaml"),
            &manifest_path,
        )
        .expect("copy example manifest");
        let original_directory = std::env::current_dir().expect("current directory");
        std::env::set_current_dir(&directory).expect("enter temporary directory");

        let result = LocalRuntime::new()
            .expect("local runtime")
            .block_on(read_apply_request(PathBuf::from("agent.yaml")));

        std::env::set_current_dir(original_directory).expect("restore current directory");
        std::fs::remove_dir_all(&directory).expect("remove temporary directory");
        let request = result.expect("read apply request");
        assert_eq!(request.source_directory, directory);
    }

    #[test]
    fn daemon_binary_is_resolved_beside_agentctl() {
        let executable = daemon_executable(Path::new("/opt/agent/bin/agentctl"));
        assert_eq!(executable, Path::new("/opt/agent/bin/agentd"));
    }
}
