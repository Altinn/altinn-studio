use std::{
    io::IsTerminal as _,
    path::{Path, PathBuf},
    process::{Child, Command as ProcessCommand, ExitCode, Stdio},
    time::Duration,
};

use agent::{
    Agent, ConditionStatus, Error,
    control_api::Client,
    control_plane::ApplyRequest,
    local::home::ControlPlaneHome,
    manifest,
    sessions::{Session, SessionName},
};
use clap::{Parser, Subcommand};

mod format;
mod forward;
mod tui;

use format::{condition_status, format_age, format_harnesses, session_state};
use futures_util::StreamExt as _;
use sandbox::{execution::ExecutionEvent, terminal::TerminalAttachOutcome};
use tokio::io::AsyncWriteExt as _;
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
    /// Manage Codex CLI harness authentication.
    Codex {
        #[command(subcommand)]
        command: CodexCommand,
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
    /// Display one or more resources.
    Get {
        /// Resource kind, optionally combined with a name (for example `agent/worker`).
        resource: String,
        /// Optional resource name when it is not part of `resource`.
        name: Option<String>,
        /// Owning Agent for Session resources; inferred from the current directory when omitted.
        #[arg(long)]
        agent: Option<String>,
        /// List Sessions across every Agent instead of resolving one owner.
        #[arg(short = 'A', long, conflicts_with = "agent")]
        all_agents: bool,
    },
    /// Show detailed state and conditions for one resource.
    Describe {
        /// Agent resource, optionally combined with its name (for example `agent/worker`).
        resource: String,
        /// Optional Agent name when it is not part of `resource`.
        name: Option<String>,
    },
    /// Request deletion of a resource.
    Delete {
        /// Resource kind, optionally combined with a name (for example `agent/worker`).
        resource: String,
        /// Optional resource name when it is not part of `resource`.
        name: Option<String>,
    },
    /// Create or attach to a named Session in an Agent sandbox.
    Attach {
        /// Session resource, optionally combined with its name (for example `session/s1`).
        resource: String,
        /// Optional Session name when it is not part of `resource`.
        name: Option<String>,
        /// Owning Agent; inferred from the current directory when omitted.
        #[arg(long)]
        agent: Option<String>,
        /// Harness installation to bind when creating the Session.
        #[arg(long, value_parser = parse_harness)]
        harness: Option<agent::Harness>,
    },
    /// Execute a command in an Agent sandbox.
    Exec {
        /// Pass stdin to an allocated terminal.
        #[arg(short = 'i', long, requires = "tty")]
        stdin: bool,
        /// Allocate a terminal; currently used together with --stdin.
        #[arg(short = 't', long, requires = "stdin")]
        tty: bool,
        /// Agent resource or name; inferred from the current directory when omitted.
        resource: Option<String>,
        /// Agent name, as an alternative to the positional resource.
        #[arg(long, conflicts_with = "resource")]
        agent: Option<String>,
        /// Command and arguments to execute after `--`.
        #[arg(last = true, required = true, num_args = 1..)]
        command: Vec<String>,
    },
    /// Forward local ports to a running Agent sandbox until interrupted.
    PortForward {
        /// Agent name, as an alternative to a leading Agent argument.
        #[arg(long)]
        agent: Option<String>,
        /// Optional leading Agent resource or name, followed by port mappings
        /// written as GUEST, LOCAL:GUEST, or ADDRESS:LOCAL:GUEST. An empty
        /// local port (`:GUEST`) selects an ephemeral local port. The Agent is
        /// inferred from the current directory when no leading Agent is given.
        #[arg(required = true, num_args = 1..)]
        arguments: Vec<String>,
    },
    /// Open the interactive terminal UI.
    Tui,
    /// Wait for a resource condition.
    Wait {
        /// Condition expression. Only `condition=Ready` is currently supported.
        #[arg(long = "for", default_value = "condition=Ready")]
        condition: String,
        /// Maximum wait, written as seconds, minutes, or hours (for example `30s` or `10m`).
        #[arg(long, default_value = "10m", value_parser = parse_duration)]
        timeout: Duration,
        /// Agent resource, optionally combined with its name (for example `agent/worker`).
        resource: String,
        /// Optional Agent name when it is not part of `resource`.
        name: Option<String>,
    },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Resource {
    Agent,
    Session,
}

#[derive(Debug, thiserror::Error)]
enum CommandError {
    #[error(transparent)]
    Agent(#[from] Error),
    #[error("{0}")]
    Message(String),
}

type CommandResult<T> = Result<T, CommandError>;

#[derive(Subcommand)]
enum ClaudeCommand {
    /// Mint a long-lived Claude token on the host and store it for agents.
    Login,
}

#[derive(Subcommand)]
enum CodexCommand {
    /// Sign in with `ChatGPT` and store an Agent-only grant.
    Login,
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => code,
        Err(error) => {
            eprintln!("agentctl: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> CommandResult<ExitCode> {
    let arguments = Arguments::parse();
    let home = ControlPlaneHome::resolve(arguments.home.as_deref())?;
    let client = Client::for_path(home.socket_path());
    LocalRuntime::new().map_err(Error::from)?.block_on(async move {
        ensure_daemon(&home, &client).await?;
        execute(arguments.command, &home, &client).await
    })
}

async fn execute(command: Command, home: &ControlPlaneHome, client: &Client) -> CommandResult<ExitCode> {
    match command {
        Command::Claude {
            command: ClaudeCommand::Login,
        } => {
            let token = agent::harness::acquire_host_credential(agent::Harness::ClaudeCode, home.path())?;
            let imported = client.auth_login(agent::Harness::ClaudeCode, token.to_string()).await?;
            println!("{} authentication stored", imported.provider);
        }
        Command::Codex {
            command: CodexCommand::Login,
        } => {
            let credential = agent::harness::acquire_host_credential(agent::Harness::Codex, home.path())?;
            let imported = client.auth_login(agent::Harness::Codex, credential.to_string()).await?;
            println!("{} authentication stored", imported.provider);
        }
        Command::Apply { filename, name } => {
            let mut request = read_apply_request(filename).await?;
            if let Some(name) = name {
                request.agent.metadata.name = name;
            }
            let applied = client.apply(request).await?;
            println!("agent/{} applied", applied.metadata.name);
        }
        Command::Get {
            resource,
            name,
            agent,
            all_agents,
        } => get_resources(client, &resource, name, agent, all_agents).await?,
        Command::Describe { resource, name } => describe(client, &resource, name).await?,
        Command::Delete { resource, name } => {
            let (resource, name) = resource_reference(&resource, name)?;
            if resource != Resource::Agent {
                return Err(Error::Invalid("Session deletion is not supported".into()).into());
            }
            let name = require_name(name, "Agent")?;
            client.delete(&name).await?;
            println!("agent/{name} deleted");
        }
        Command::Attach {
            resource,
            name,
            agent,
            harness,
        } => attach(home, client, &resource, name, agent, harness).await?,
        Command::Exec {
            stdin,
            tty,
            resource,
            agent,
            command,
        } => return exec_command(home, client, resource, agent, &command, stdin, tty).await,
        Command::PortForward { agent, arguments } => {
            return port_forward(home, client, agent, &arguments).await;
        }
        Command::Tui => return tui::run(home, client).await,
        Command::Wait {
            condition,
            timeout,
            resource,
            name,
        } => wait(client, &condition, timeout, &resource, name).await?,
    }
    Ok(ExitCode::SUCCESS)
}

async fn get_resources(
    client: &Client,
    resource: &str,
    name: Option<String>,
    agent: Option<String>,
    all_agents: bool,
) -> CommandResult<()> {
    let (resource, name) = resource_reference(resource, name)?;
    match resource {
        Resource::Agent => {
            reject_session_scope(agent.as_deref(), all_agents)?;
            let agents = if let Some(name) = name {
                vec![client.get(&name).await?]
            } else {
                client.list_agents().await?
            };
            print_agents(&agents);
        }
        Resource::Session if name.is_some() => {
            if all_agents {
                return Err(
                    Error::Invalid("a named Session requires --agent or current-directory inference".into()).into(),
                );
            }
            let agent = resolve_agent_name(client, agent).await?;
            let session = client
                .get_session(&agent, SessionName::new(require_name(name, "Session")?)?)
                .await?;
            print_sessions(&[session], false);
        }
        Resource::Session if all_agents => print_sessions(&client.list_sessions(None).await?, true),
        Resource::Session => {
            let agent = resolve_agent_name(client, agent).await?;
            print_sessions(&client.list_sessions(Some(&agent)).await?, false);
        }
    }
    Ok(())
}

async fn attach(
    home: &ControlPlaneHome,
    client: &Client,
    resource: &str,
    name: Option<String>,
    agent: Option<String>,
    harness: Option<agent::Harness>,
) -> CommandResult<()> {
    let (resource, name) = resource_reference(resource, name)?;
    if resource != Resource::Session {
        return Err(Error::Invalid("attach requires a Session resource".into()).into());
    }
    let session = SessionName::new(require_name(name, "Session")?)?;
    let agent = resolve_agent_name(client, agent).await?;
    eprintln!(
        "Ensuring Agent {agent:?} and Session {session:?}; initial provisioning can take several minutes...",
        session = session.as_str()
    );
    let target = client.ensure_session(&agent, session, harness).await?;
    agent::sessions::attach(home.path(), &target).await?;
    Ok(())
}

async fn exec_command(
    home: &ControlPlaneHome,
    client: &Client,
    resource: Option<String>,
    agent: Option<String>,
    command: &[String],
    stdin: bool,
    tty: bool,
) -> CommandResult<ExitCode> {
    let agent = resolve_execution_agent(client, resource, agent).await?;
    if tty && (!std::io::stdin().is_terminal() || !std::io::stdout().is_terminal()) {
        return Err(Error::Invalid("-it requires an interactive local terminal".into()).into());
    }
    let current = client.get(&agent).await?;
    if !current
        .status
        .conditions
        .iter()
        .any(|condition| condition.kind == "Ready" && condition.status == ConditionStatus::True)
    {
        eprintln!("Ensuring Agent {agent:?}; initial provisioning can take several minutes...");
    }
    let target = client.ensure_execution(&agent).await?;
    let spec = agent::sandbox::platform::execution_spec(&target.operating_system, command, tty)?;
    let status = if stdin && tty {
        match agent::sandbox::attach_terminal(
            home.path(),
            &target.sandbox,
            ::sandbox::terminal::AttachTerminalRequest::new(spec),
        )
        .await?
        {
            TerminalAttachOutcome::Exited(status) => status,
            TerminalAttachOutcome::Detached => return Ok(ExitCode::SUCCESS),
            _ => return Err(Error::Session("terminal execution returned an unsupported outcome".into()).into()),
        }
    } else {
        let execution = agent::sandbox::start_execution(home.path(), &target, spec).await?;
        stream_execution(execution).await?
    };
    Ok(exit_code(status.code))
}

/// Splits a leading Agent reference from the port mappings.
///
/// A first argument containing ':' or made only of digits is a port mapping;
/// anything else names the Agent. Agent names cannot contain ':' and port
/// mappings cannot contain letters, so the shapes never overlap.
fn split_forward_arguments(arguments: &[String]) -> (Option<String>, &[String]) {
    match arguments.split_first() {
        Some((first, rest)) if !first.contains(':') && !first.bytes().all(|byte| byte.is_ascii_digit()) => {
            (Some(first.clone()), rest)
        }
        _ => (None, arguments),
    }
}

async fn port_forward(
    home: &ControlPlaneHome,
    client: &Client,
    agent: Option<String>,
    arguments: &[String],
) -> CommandResult<ExitCode> {
    let (resource, ports) = split_forward_arguments(arguments);
    if agent.is_some() && resource.is_some() {
        return Err(Error::Invalid("the Agent was supplied both as an argument and with --agent".into()).into());
    }
    if ports.is_empty() {
        return Err(Error::Invalid("at least one port mapping is required".into()).into());
    }
    let specs = ports
        .iter()
        .map(|port| forward::ForwardSpec::parse(port))
        .collect::<Result<Vec<_>, String>>()
        .map_err(CommandError::Message)?;
    let agent = resolve_execution_agent(client, resource, agent).await?;
    eprintln!("Ensuring Agent {agent:?}; initial provisioning can take several minutes...");
    let target = client.ensure_execution(&agent).await?;
    let mut forwards = Vec::new();
    for spec in specs {
        let forward = forward::PortForward::start(home.path().to_path_buf(), target.sandbox.clone(), spec).await?;
        println!(
            "Forwarding from {} -> {} (agent {agent:?})",
            forward.local_address(),
            forward.spec().guest_port
        );
        forwards.push(forward);
    }
    let mut reported = vec![None; forwards.len()];
    let mut poll = tokio::time::interval(Duration::from_secs(1));
    loop {
        tokio::select! {
            result = tokio::signal::ctrl_c() => {
                result.map_err(Error::from)?;
                return Ok(ExitCode::SUCCESS);
            }
            _ = poll.tick() => {
                for (forward, reported) in forwards.iter().zip(reported.iter_mut()) {
                    let status = forward.status();
                    if status != *reported {
                        if let Some(message) = &status {
                            eprintln!("{} -> {}: {message}", forward.local_address(), forward.spec().guest_port);
                        }
                        *reported = status;
                    }
                }
                if forwards.iter().all(forward::PortForward::finished) {
                    eprintln!("every port forward has stopped");
                    return Ok(ExitCode::FAILURE);
                }
            }
        }
    }
}

async fn resolve_execution_agent(
    client: &Client,
    resource: Option<String>,
    explicit: Option<String>,
) -> CommandResult<String> {
    if let Some(explicit) = explicit {
        return Ok(explicit);
    }
    let Some(resource) = resource else {
        return resolve_agent_name(client, None).await;
    };
    if !resource.contains('/') {
        return Ok(resource);
    }
    let (kind, name) = resource_reference(&resource, None)?;
    if kind != Resource::Agent {
        return Err(Error::Invalid("exec requires an Agent resource".into()).into());
    }
    require_name(name, "Agent").map_err(CommandError::from)
}

async fn stream_execution(
    mut execution: ::sandbox::execution::StartedExecution,
) -> Result<::sandbox::execution::ExitStatus, Error> {
    let id = execution.id.clone();
    let mut stdout = tokio::io::stdout();
    let mut stderr = tokio::io::stderr();
    while let Some(event) = execution.events.next().await {
        match event? {
            ExecutionEvent::Started { .. } => {}
            ExecutionEvent::Stdout(bytes) => stdout.write_all(&bytes).await?,
            ExecutionEvent::Stderr(bytes) => stderr.write_all(&bytes).await?,
            ExecutionEvent::Exited(status) => {
                stdout.flush().await?;
                stderr.flush().await?;
                return Ok(status);
            }
            ExecutionEvent::Failed { message } => {
                return Err(::sandbox::Error::ExecutionFailed { id, message }.into());
            }
            _ => {
                return Err(Error::Sandbox(::sandbox::Error::Backend(
                    "unsupported Execution event".into(),
                )));
            }
        }
    }
    Err(::sandbox::Error::ExecutionStreamEnded { id }.into())
}

fn exit_code(code: i32) -> ExitCode {
    u8::try_from(code).map_or(ExitCode::FAILURE, ExitCode::from)
}

async fn describe(client: &Client, resource: &str, name: Option<String>) -> CommandResult<()> {
    let (resource, name) = resource_reference(resource, name)?;
    if resource != Resource::Agent {
        return Err(Error::Invalid("describe currently supports only Agent resources".into()).into());
    }
    print_agent_description(&client.get(&require_name(name, "Agent")?).await?);
    Ok(())
}

async fn wait(
    client: &Client,
    condition: &str,
    timeout: Duration,
    resource: &str,
    name: Option<String>,
) -> CommandResult<()> {
    let (resource, name) = resource_reference(resource, name)?;
    if resource != Resource::Agent {
        return Err(Error::Invalid("wait currently supports only Agent resources".into()).into());
    }
    if condition != "condition=Ready" {
        return Err(Error::Invalid("only --for=condition=Ready is supported".into()).into());
    }
    let name = require_name(name, "Agent")?;
    wait_for_ready(client, &name, timeout).await?;
    println!("agent/{name} condition met");
    Ok(())
}

fn resource_reference(resource: &str, name: Option<String>) -> Result<(Resource, Option<String>), Error> {
    let (kind, embedded_name) = resource.split_once('/').map_or((resource, None), |(kind, name)| {
        (kind, (!name.is_empty()).then(|| name.to_owned()))
    });
    if resource.matches('/').count() > 1 || (resource.contains('/') && embedded_name.is_none()) {
        return Err(Error::Invalid("resource references must use TYPE/NAME".into()));
    }
    if embedded_name.is_some() && name.is_some() {
        return Err(Error::Invalid("resource name was supplied twice".into()));
    }
    let resource = match kind.to_ascii_lowercase().as_str() {
        "agent" | "agents" | "ag" => Resource::Agent,
        "session" | "sessions" => Resource::Session,
        _ => return Err(Error::Invalid(format!("unknown resource type {kind:?}"))),
    };
    Ok((resource, embedded_name.or(name)))
}

fn require_name(name: Option<String>, resource: &str) -> Result<String, Error> {
    name.ok_or_else(|| Error::Invalid(format!("{resource} name is required")))
}

fn reject_session_scope(agent: Option<&str>, all_agents: bool) -> Result<(), Error> {
    if agent.is_some() || all_agents {
        Err(Error::Invalid(
            "--agent and --all-agents apply only to Session resources".into(),
        ))
    } else {
        Ok(())
    }
}

async fn resolve_agent_name(client: &Client, explicit: Option<String>) -> CommandResult<String> {
    if let Some(agent) = explicit {
        return Ok(agent);
    }
    let directory = std::env::current_dir().map_err(Error::from)?;
    match client.resolve_agent(directory).await {
        Ok(agent) => Ok(agent.metadata.name),
        Err(error) => Err(inference_error(error)),
    }
}

fn inference_error(error: Error) -> CommandError {
    match error {
        Error::Rpc(error) if error.code == -32004 => {
            CommandError::Message("no Agent was applied from the current directory; specify --agent".into())
        }
        Error::Rpc(error) => CommandError::Message(error.message),
        error => error.into(),
    }
}

async fn wait_for_ready(client: &Client, name: &str, timeout: Duration) -> Result<(), Error> {
    const POLL_INTERVAL: Duration = Duration::from_secs(2);

    let deadline = tokio::time::Instant::now() + timeout;
    let mut last_ready = None;
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            return Err(Error::Invalid(wait_timeout_message(name, last_ready.as_ref())));
        }
        let agent = match tokio::time::timeout(remaining, client.get(name)).await {
            Ok(result) => result?,
            Err(_) => return Err(Error::Invalid(wait_timeout_message(name, last_ready.as_ref()))),
        };
        let ready = agent
            .status
            .conditions
            .iter()
            .find(|condition| condition.kind == "Ready");
        if ready.is_some_and(|condition| condition.status == ConditionStatus::True) {
            return Ok(());
        }
        last_ready = ready.cloned();
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        tokio::time::sleep(remaining.min(POLL_INTERVAL)).await;
    }
}

fn wait_timeout_message(name: &str, ready: Option<&agent::Condition>) -> String {
    let Some(ready) = ready else {
        return format!("timed out waiting for Agent {name:?} to become Ready; no Ready condition was reported");
    };
    let reason = if ready.reason.is_empty() {
        "Unknown"
    } else {
        ready.reason.as_str()
    };
    if ready.message.is_empty() {
        format!("timed out waiting for Agent {name:?} to become Ready: {reason}")
    } else {
        format!(
            "timed out waiting for Agent {name:?} to become Ready: {reason}: {}",
            ready.message
        )
    }
}

fn parse_duration(value: &str) -> Result<Duration, String> {
    let (number, multiplier) = match value.as_bytes().last() {
        Some(b's') => (&value[..value.len() - 1], 1),
        Some(b'm') => (&value[..value.len() - 1], 60),
        Some(b'h') => (&value[..value.len() - 1], 60 * 60),
        _ => return Err("duration must end in s, m, or h".into()),
    };
    let number = number
        .parse::<u64>()
        .map_err(|_| "duration must contain a positive whole number".to_string())?;
    if number == 0 {
        return Err("duration must be greater than zero".into());
    }
    Ok(Duration::from_secs(number.saturating_mul(multiplier)))
}

fn parse_harness(value: &str) -> Result<agent::Harness, String> {
    value.parse().map_err(|error: Error| error.to_string())
}

fn print_agents(agents: &[Agent]) {
    let rows = agents
        .iter()
        .map(|agent| {
            let ready = agent
                .status
                .conditions
                .iter()
                .find(|condition| condition.kind == "Ready");
            let ready_value = ready.map_or("Unknown", |condition| condition_status(condition.status));
            let status = if agent.metadata.deletion_timestamp.is_some() {
                "Terminating"
            } else {
                ready.map_or("Pending", |condition| condition.reason.as_str())
            };
            let harnesses = format_harnesses(&agent.spec);
            let provider = agent
                .status
                .sandbox
                .as_ref()
                .map_or("-", |assignment| assignment.provider().as_str());
            vec![
                agent.metadata.name.clone(),
                ready_value.into(),
                status.into(),
                harnesses,
                provider.into(),
            ]
        })
        .collect::<Vec<_>>();
    print_table(&["NAME", "READY", "STATUS", "HARNESSES", "PROVIDER"], &rows);
}

fn print_agent_description(agent: &Agent) {
    for line in format::describe_agent_lines(agent) {
        println!("{line}");
    }
}

fn print_sessions(sessions: &[Session], show_agent: bool) {
    let rows = sessions
        .iter()
        .map(|session| {
            let mut row = Vec::new();
            if show_agent {
                row.push(session.agent.clone());
            }
            row.extend([
                session.name.as_str().to_owned(),
                session.harness.as_str().into(),
                session_state(session.status.state).into(),
                format_age(session.created_at),
            ]);
            row
        })
        .collect::<Vec<_>>();
    let headers = if show_agent {
        vec!["AGENT", "NAME", "HARNESS", "STATE", "AGE"]
    } else {
        vec!["NAME", "HARNESS", "STATE", "AGE"]
    };
    print_table(&headers, &rows);
}

fn print_table(headers: &[&str], rows: &[Vec<String>]) {
    if rows.is_empty() {
        eprintln!("No resources found.");
        return;
    }
    for line in format::table_lines(headers, rows) {
        println!("{line}");
    }
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
    fn resource_references_follow_kubectl_shapes_and_aliases() {
        assert_eq!(
            resource_reference("agents", None).expect("Agent collection"),
            (Resource::Agent, None)
        );
        assert_eq!(
            resource_reference("ag/worker", None).expect("Agent reference"),
            (Resource::Agent, Some("worker".into()))
        );
        assert_eq!(
            resource_reference("session", Some("s1".into())).expect("Session reference"),
            (Resource::Session, Some("s1".into()))
        );
        assert!(resource_reference("agent/worker", Some("other".into())).is_err());
        assert!(resource_reference("pods", None).is_err());
    }

    #[test]
    fn exec_accepts_kubectl_style_interactive_and_inferred_shapes() {
        let explicit = Arguments::try_parse_from(["agentctl", "exec", "-it", "agent/worker", "--", "bash", "-l"])
            .expect("interactive exec arguments");
        let Command::Exec {
            stdin,
            tty,
            resource,
            agent,
            command,
        } = explicit.command
        else {
            panic!("expected exec command");
        };
        assert!(stdin);
        assert!(tty);
        assert_eq!(resource.as_deref(), Some("agent/worker"));
        assert!(agent.is_none());
        assert_eq!(command, ["bash", "-l"]);

        let inferred = Arguments::try_parse_from(["agentctl", "exec", "--", "pwd"]).expect("inferred exec arguments");
        let Command::Exec { resource, command, .. } = inferred.command else {
            panic!("expected exec command");
        };
        assert!(resource.is_none());
        assert_eq!(command, ["pwd"]);
    }

    #[test]
    fn port_forward_accepts_kubectl_shapes_and_inference() {
        let explicit = Arguments::try_parse_from(["agentctl", "port-forward", "agent/worker", "9090:80", ":5432"])
            .expect("explicit port-forward arguments");
        let Command::PortForward { agent, arguments } = explicit.command else {
            panic!("expected port-forward command");
        };
        assert!(agent.is_none());
        assert_eq!(
            split_forward_arguments(&arguments),
            (Some("agent/worker".into()), &arguments[1..])
        );

        let inferred =
            Arguments::try_parse_from(["agentctl", "port-forward", "8080"]).expect("inferred port-forward arguments");
        let Command::PortForward { arguments, .. } = inferred.command else {
            panic!("expected port-forward command");
        };
        assert_eq!(split_forward_arguments(&arguments), (None, arguments.as_slice()));

        let flagged = Arguments::try_parse_from(["agentctl", "port-forward", "--agent", "worker", "0.0.0.0:80:80"])
            .expect("flagged port-forward arguments");
        let Command::PortForward { agent, arguments } = flagged.command else {
            panic!("expected port-forward command");
        };
        assert_eq!(agent.as_deref(), Some("worker"));
        assert_eq!(split_forward_arguments(&arguments), (None, arguments.as_slice()));
    }

    #[test]
    fn codex_login_uses_an_isolated_chatgpt_grant() {
        let arguments =
            Arguments::try_parse_from(["agentctl", "codex", "login"]).expect("Codex ChatGPT login arguments");
        assert!(matches!(
            arguments.command,
            Command::Codex {
                command: CodexCommand::Login
            }
        ));
        assert!(Arguments::try_parse_from(["agentctl", "codex", "login", "--with-api-key"]).is_err());
    }

    #[test]
    fn wait_durations_are_bounded_and_explicit() {
        assert_eq!(parse_duration("30s").expect("seconds"), Duration::from_secs(30));
        assert_eq!(parse_duration("10m").expect("minutes"), Duration::from_mins(10));
        assert_eq!(parse_duration("2h").expect("hours"), Duration::from_hours(2));
        assert!(parse_duration("0s").is_err());
        assert!(parse_duration("forever").is_err());
    }

    #[test]
    fn wait_timeout_reports_the_last_ready_diagnostic() {
        let condition = agent::Condition {
            kind: "Ready".into(),
            status: ConditionStatus::False,
            reason: "SecretMissing".into(),
            message: ".env does not define required variable \"GITHUB_TOKEN\"".into(),
        };

        assert_eq!(
            wait_timeout_message("worker", Some(&condition)),
            "timed out waiting for Agent \"worker\" to become Ready: SecretMissing: .env does not define required variable \"GITHUB_TOKEN\""
        );
    }

    #[test]
    fn inference_errors_have_one_actionable_message() {
        let ambiguous = inference_error(Error::Rpc(agent::control_api::ResponseError {
            code: -32602,
            message: "multiple Agents were applied from this directory; specify --agent".into(),
        }));
        assert_eq!(
            ambiguous.to_string(),
            "multiple Agents were applied from this directory; specify --agent"
        );

        let missing = inference_error(Error::Rpc(agent::control_api::ResponseError {
            code: -32004,
            message: "Agent not found".into(),
        }));
        assert_eq!(
            missing.to_string(),
            "no Agent was applied from the current directory; specify --agent"
        );
    }

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
        let request = result.expect("read apply request");
        let actual_directory = std::fs::canonicalize(&request.source_directory).expect("canonical source directory");
        let expected_directory = std::fs::canonicalize(&directory).expect("canonical temporary directory");
        std::fs::remove_dir_all(&directory).expect("remove temporary directory");
        assert_eq!(actual_directory, expected_directory);
    }

    #[test]
    fn daemon_binary_is_resolved_beside_agentctl() {
        let directory = Path::new("opt").join("agent").join("bin");
        let agentctl = directory.join(format!("agentctl{}", std::env::consts::EXE_SUFFIX));
        let agentd = directory.join(format!("agentd{}", std::env::consts::EXE_SUFFIX));
        assert_eq!(daemon_executable(&agentctl), agentd);
    }
}
