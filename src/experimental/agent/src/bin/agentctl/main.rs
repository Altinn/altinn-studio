use std::{
    io::IsTerminal as _,
    path::{Path, PathBuf},
    process::{Child, Command as ProcessCommand, ExitCode, Stdio},
    time::Duration,
};

use agent::{
    Agent, Error,
    control_api::Client,
    control_plane::ApplyRequest,
    control_plane::WaitPolicy,
    local::home::ControlPlaneHome,
    manifest,
    sessions::{Session, SessionName},
};
use clap::{Parser, Subcommand, ValueEnum};

mod format;
mod forward;
mod progress;
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
    /// Create a Session and wait until its harness is ready, without attaching.
    Create {
        #[command(flatten)]
        target: SessionTarget,
        /// Harness installation to bind when creating the Session.
        #[arg(long, value_parser = parse_harness)]
        harness: Option<agent::Harness>,
        /// Maximum wait, written as seconds, minutes, or hours.
        #[arg(long, default_value = "10m", value_parser = parse_duration)]
        timeout: Duration,
        /// First prompt, handed to the harness at launch.
        #[command(flatten)]
        input: PromptInput,
    },
    /// Deliver a prompt to a running Session's harness.
    Prompt {
        #[command(flatten)]
        target: SessionTarget,
        #[command(flatten)]
        input: PromptInput,
        #[command(flatten)]
        answer: AnswerOptions,
    },
    /// Read a Session's conversation as turns.
    Turns {
        #[command(flatten)]
        target: SessionTarget,
        /// Print only the last N turns.
        #[arg(long)]
        last: Option<usize>,
        /// Print only the harness's final message of the last turn, as plain text.
        #[arg(long, conflicts_with = "last")]
        last_message: bool,
    },
    /// Create or update an Agent from a manifest.
    Apply {
        /// Agent manifest path.
        #[arg(short = 'f', long = "filename")]
        filename: PathBuf,
        /// Override metadata.name so one manifest can create multiple Agents.
        #[arg(long)]
        name: Option<String>,
        /// File supplying manifest secret values; defaults to `.env` beside the manifest. Use a
        /// path outside any bind-mounted directory so real values never enter the Sandbox.
        #[arg(long)]
        env_file: Option<PathBuf>,
        /// Stay attached after applying and show provisioning progress until the Agent is Ready.
        #[arg(long)]
        wait: bool,
        /// Maximum wait with `--wait`, written as seconds, minutes, or hours (for example `10m`).
        #[arg(long, default_value = "10m", value_parser = parse_duration, requires = "wait")]
        timeout: Duration,
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
        /// Output format.
        #[arg(short = 'o', long, default_value = "table", value_enum)]
        output: OutputFormat,
    },
    /// Show detailed state and conditions for one resource.
    Describe {
        /// Agent resource, optionally combined with its name (for example `agent/worker`).
        resource: String,
        /// Optional Agent name when it is not part of `resource`.
        name: Option<String>,
        /// Output format.
        #[arg(short = 'o', long, default_value = "table", value_enum)]
        output: OutputFormat,
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

/// The Session a verb acts on: `session/NAME` or `session NAME`, plus its owning Agent.
#[derive(clap::Args)]
struct SessionTarget {
    /// Session resource, optionally combined with its name (for example `session/s1`).
    resource: String,
    /// Optional Session name when it is not part of `resource`.
    name: Option<String>,
    /// Owning Agent; inferred from the current directory when omitted.
    #[arg(long)]
    agent: Option<String>,
}

/// Whether and how a prompt waits for its answer.
#[derive(clap::Args)]
struct AnswerOptions {
    /// Block until the harness answers, then print the turns it produced.
    #[arg(long)]
    wait: bool,
    /// Maximum wait with --wait, written as seconds, minutes, or hours.
    #[arg(long, default_value = "10m", value_parser = parse_duration, requires = "wait")]
    timeout: Duration,
    /// With --wait, print only the harness's final message as plain text.
    #[arg(long, requires = "wait")]
    last_message: bool,
}

/// Prompt text from --prompt, --file, or piped standard input.
#[derive(clap::Args)]
struct PromptInput {
    /// Prompt text. Read from a file with --file, or from standard input when
    /// neither is given and stdin is piped.
    #[arg(long, conflicts_with = "file", allow_hyphen_values = true)]
    prompt: Option<String>,
    /// Read the prompt from a file instead of --prompt.
    #[arg(short = 'f', long, conflicts_with = "prompt")]
    file: Option<PathBuf>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum)]
enum OutputFormat {
    Table,
    Json,
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
    Login {
        /// Read an existing credential from standard input instead of signing in. Inside an Agent
        /// this accepts the mediated placeholder, so a nested `agentd` chains through the outer
        /// mediation without ever holding a real credential.
        #[arg(long)]
        from_stdin: bool,
    },
}

#[derive(Subcommand)]
enum SessionCommand {
    /// Create a Session and wait until its harness is ready, without attaching.
    Create {
        /// Session name.
        name: String,
        /// Owning Agent; inferred from the current directory when omitted.
        #[arg(long)]
        agent: Option<String>,
        /// Harness installation to bind when creating the Session.
        #[arg(long, value_parser = parse_harness)]
        harness: Option<agent::Harness>,
        /// First prompt to deliver once the harness is ready. Read from a file
        /// with --file, or from standard input when neither is given.
        #[arg(long, conflicts_with = "file", allow_hyphen_values = true)]
        message: Option<String>,
        /// Read the first prompt from a file instead of --message.
        #[arg(short = 'f', long, conflicts_with = "message")]
        file: Option<PathBuf>,
    },
    /// Send a message to a running Session's harness.
    Send {
        /// Session name.
        name: String,
        /// Owning Agent; inferred from the current directory when omitted.
        #[arg(long)]
        agent: Option<String>,
        /// Message to deliver. Read from a file with --file, or from standard
        /// input when neither is given.
        #[arg(long, conflicts_with = "file", allow_hyphen_values = true)]
        message: Option<String>,
        /// Read the message from a file instead of --message.
        #[arg(short = 'f', long, conflicts_with = "message")]
        file: Option<PathBuf>,
        /// Block until the harness finishes the turn, then print what it produced.
        #[arg(long)]
        wait: bool,
        /// Maximum wait with --wait, written as seconds, minutes, or hours.
        #[arg(long, default_value = "10m", value_parser = parse_duration, requires = "wait")]
        timeout: Duration,
        /// With --wait, print only the harness's final message of the turn as plain text.
        #[arg(long, requires = "wait")]
        last_message: bool,
    },
    /// Read the harness transcript of a Session as turns.
    Turns {
        /// Session name.
        name: String,
        /// Owning Agent; inferred from the current directory when omitted.
        #[arg(long)]
        agent: Option<String>,
        /// Print only the last N turns.
        #[arg(long)]
        last: Option<usize>,
        /// Print only the harness's final message of the last turn, as plain text.
        #[arg(long, conflicts_with = "last")]
        last_message: bool,
    },
}

#[derive(Subcommand)]
enum CodexCommand {
    /// Sign in with `ChatGPT` and store an Agent-only grant.
    Login {
        /// Read the harness's credential file from standard input instead of signing in. Inside
        /// an Agent this accepts the file the harness already has, whose placeholders let a nested
        /// `agentd` chain through the outer mediation without ever holding a real credential.
        #[arg(long)]
        from_stdin: bool,
    },
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => code,
        // The daemon rejected the desired state; the message is the whole story.
        Err(CommandError::Agent(Error::Rpc(error))) if error.is_invalid_params() => {
            eprintln!("agentctl: {}", error.message);
            ExitCode::FAILURE
        }
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
        let prompt_timeout = match &arguments.command {
            Command::Prompt { answer, .. } if answer.wait => Some(answer.timeout),
            _ => None,
        };
        let operation = async {
            if !matches!(arguments.command, Command::Create { .. }) {
                ensure_daemon(&home, &client).await?;
            }
            execute(arguments.command, &home, &client).await
        };
        if let Some(timeout) = prompt_timeout {
            tokio::time::timeout(timeout, operation).await.map_err(|_| {
                CommandError::Message(
                    "timed out prompting Session; delivery may have started; inspect turns before retrying".into(),
                )
            })?
        } else {
            operation.await
        }
    })
}

#[allow(
    clippy::too_many_lines,
    reason = "keep command dispatch together; behavior lives in the handlers"
)]
async fn execute(command: Command, home: &ControlPlaneHome, client: &Client) -> CommandResult<ExitCode> {
    match command {
        Command::Claude {
            command: ClaudeCommand::Login { from_stdin },
        } => {
            let token = if from_stdin {
                read_token_from_stdin()?
            } else {
                agent::harness::acquire_host_credential(agent::Harness::ClaudeCode, home.path())?
            };
            let imported = client
                .auth_login(agent::Harness::ClaudeCode, token.to_string(), from_stdin)
                .await?;
            println!("{} authentication stored", imported.provider);
        }
        Command::Codex {
            command: CodexCommand::Login { from_stdin },
        } => {
            let credential = if from_stdin {
                read_stdin_to_end()?
            } else {
                agent::harness::acquire_host_credential(agent::Harness::Codex, home.path())?
            };
            let imported = client
                .auth_login(agent::Harness::Codex, credential.to_string(), from_stdin)
                .await?;
            println!("{} authentication stored", imported.provider);
        }
        Command::Apply {
            filename,
            name,
            env_file,
            wait,
            timeout,
        } => {
            let mut request = read_apply_request(filename, env_file).await?;
            if let Some(name) = name {
                request.agent.metadata.name = name;
            }
            let applied = client.apply(request).await?;
            let name = applied.metadata.name;
            println!("agent/{name} applied");
            if wait {
                wait_for_ready(client, &name, timeout).await?;
                println!("agent/{name} ready");
            }
        }
        Command::Get {
            resource,
            name,
            agent,
            all_agents,
            output,
        } => get_resources(client, &resource, name, agent, all_agents, output).await?,
        Command::Describe { resource, name, output } => describe(client, &resource, name, output).await?,
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
        Command::Create {
            target,
            harness,
            input,
            timeout,
        } => create_session(home, client, target, harness, input, timeout).await?,
        Command::Prompt { target, input, answer } => prompt_session(client, target, input, answer).await?,
        Command::Turns {
            target,
            last,
            last_message,
        } => turns(client, target, last, last_message).await?,
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
    output: OutputFormat,
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
            match output {
                OutputFormat::Json => print_json(&agents)?,
                OutputFormat::Table => print_agents(&agents),
            }
        }
        Resource::Session => {
            let sessions = if name.is_some() {
                if all_agents {
                    return Err(Error::Invalid(
                        "a named Session requires --agent or current-directory inference".into(),
                    )
                    .into());
                }
                let agent = resolve_agent_name(client, agent).await?;
                vec![
                    client
                        .get_session(&agent, SessionName::new(require_name(name, "Session")?)?)
                        .await?,
                ]
            } else if all_agents {
                client.list_sessions(None).await?
            } else {
                let agent = resolve_agent_name(client, agent).await?;
                client.list_sessions(Some(&agent)).await?
            };
            match output {
                OutputFormat::Json => print_json(&sessions)?,
                OutputFormat::Table => print_sessions(&sessions, all_agents),
            }
        }
    }
    Ok(())
}

fn print_json<T: serde::Serialize>(value: &T) -> CommandResult<()> {
    println!(
        "{}",
        serde_json::to_string_pretty(value).map_err(|error| Error::Invalid(error.to_string()))?
    );
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
    let wait = progress::Wait::start();
    let target = wait
        .until(client.ensure_session(
            &agent,
            session,
            harness,
            None,
            WaitPolicy::UntilReady,
            Some(&mut wait.sink()),
        ))
        .await?;
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
    let wait = progress::Wait::start();
    let target = wait
        .until(client.ensure_execution(&agent, WaitPolicy::UntilReady, Some(&mut wait.sink())))
        .await?;
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
    let wait = progress::Wait::start();
    let target = wait
        .until(client.ensure_execution(&agent, WaitPolicy::UntilReady, Some(&mut wait.sink())))
        .await?;
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

/// Resolves a [`SessionTarget`] into the owning Agent and Session name.
async fn session_target(client: &Client, target: SessionTarget) -> CommandResult<(String, SessionName)> {
    let (resource, name) = resource_reference(&target.resource, target.name)?;
    if resource != Resource::Session {
        return Err(Error::Invalid("this command requires a Session resource".into()).into());
    }
    let session = SessionName::new(require_name(name, "Session")?)?;
    let agent = resolve_agent_name(client, target.agent).await?;
    Ok((agent, session))
}

async fn create_session(
    home: &ControlPlaneHome,
    client: &Client,
    target: SessionTarget,
    harness: Option<agent::Harness>,
    input: PromptInput,
    timeout: Duration,
) -> CommandResult<()> {
    let resource = target.resource.clone();
    let initial = read_prompt_arg(input)?;
    let wait = progress::Wait::start();
    let (agent, session) = wait.until(tokio::time::timeout(timeout, async {
        ensure_daemon(home, client).await?;
        let (agent, session) = session_target(client, target).await?;
        client.ensure_session(
            &agent, session.clone(), harness, initial, WaitPolicy::UntilReady, Some(&mut wait.sink()),
        ).await?;
        Ok::<_, CommandError>((agent, session))
    })).await.map_err(|_| CommandError::Message(format!(
        "timed out creating {resource}; Agent resolution or provisioning did not finish; provisioning may continue"
    )))??;
    println!("session/{agent}/{session} ready");
    Ok(())
}

async fn prompt_session(
    client: &Client,
    target: SessionTarget,
    input: PromptInput,
    answer: AnswerOptions,
) -> CommandResult<()> {
    let (agent, session) = session_target(client, target).await?;
    let prompt = read_prompt_arg(input)?.ok_or_else(|| Error::Invalid("a prompt is required".into()))?;
    let produced = client
        .prompt_session(
            &agent,
            session.clone(),
            prompt,
            answer.wait,
            answer.wait.then_some(answer.timeout),
        )
        .await?;
    if !answer.wait {
        println!("session/{agent}/{session} prompted");
    } else if answer.last_message {
        print_last_message(&produced);
    } else {
        print_turns(&produced);
    }
    Ok(())
}

async fn turns(client: &Client, target: SessionTarget, last: Option<usize>, last_message: bool) -> CommandResult<()> {
    let (agent, session) = session_target(client, target).await?;
    let effective_last = if last_message { Some(1) } else { last };
    let turns = client.session_turns(&agent, session, effective_last).await?;
    if last_message {
        print_last_message(&turns);
    } else {
        print_turns(&turns);
    }
    Ok(())
}

/// Resolves the prompt from --prompt, --file, or piped standard input.
///
/// With neither flag and an interactive terminal there is no prompt.
fn read_prompt_arg(input: PromptInput) -> CommandResult<Option<String>> {
    if let Some(prompt) = input.prompt {
        return Ok(Some(prompt));
    }
    if let Some(file) = input.file {
        return Ok(Some(std::fs::read_to_string(&file).map_err(Error::from)?));
    }
    if !std::io::stdin().is_terminal() {
        let mut buffer = String::new();
        std::io::Read::read_to_string(&mut std::io::stdin(), &mut buffer).map_err(Error::from)?;
        if !buffer.is_empty() {
            return Ok(Some(buffer));
        }
    }
    Ok(None)
}

/// Prints the harness's final message of the newest turn, or says why there is none.
fn print_last_message(turns: &[agent::sessions::Turn]) {
    match turns.last() {
        None => eprintln!("No turns yet."),
        Some(turn) => match turn.final_assistant_message() {
            Some(text) => println!("{text}"),
            None => eprintln!("The turn has no final message yet."),
        },
    }
}

fn print_turns(turns: &[agent::sessions::Turn]) {
    use agent::sessions::{Part, Role};
    if turns.is_empty() {
        eprintln!("No turns yet.");
        return;
    }
    for (index, turn) in turns.iter().enumerate() {
        if index > 0 {
            println!();
        }
        println!("=== turn {} ===", index + 1);
        for message in &turn.messages {
            let who = match message.role {
                Role::User => "user",
                Role::Assistant => "assistant",
            };
            for part in &message.parts {
                match part {
                    Part::Text { text } => println!("[{who}] {text}"),
                    Part::ToolCall { name, failed } => {
                        let mark = if *failed { " (failed)" } else { "" };
                        println!("[{who}] -> {name}{mark}");
                    }
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

async fn describe(client: &Client, resource: &str, name: Option<String>, output: OutputFormat) -> CommandResult<()> {
    let (resource, name) = resource_reference(resource, name)?;
    if resource != Resource::Agent {
        return Err(Error::Invalid("describe currently supports only Agent resources".into()).into());
    }
    let agent = client.get(&require_name(name, "Agent")?).await?;
    match output {
        OutputFormat::Json => print_json(&agent)?,
        OutputFormat::Table => print_agent_description(&agent),
    }
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
        Error::Rpc(error) if error.is_not_found() => {
            CommandError::Message("no Agent was applied from the current directory; specify --agent".into())
        }
        Error::Rpc(error) => CommandError::Message(error.message),
        error => error.into(),
    }
}

/// Follows Agent convergence with live progress until Ready, a terminal error, the timeout, or Ctrl-C.
async fn wait_for_ready(client: &Client, name: &str, timeout: Duration) -> CommandResult<()> {
    let wait = progress::Wait::start();
    let waited = wait
        .until(tokio::time::timeout(
            timeout,
            client.ensure_execution(name, WaitPolicy::UntilReady, Some(&mut wait.sink())),
        ))
        .await;
    match waited {
        Ok(result) => result.map(|_target| ()).map_err(CommandError::from),
        Err(_elapsed) => {
            let ready = match client.get(name).await {
                Ok(agent) => agent.status.ready_condition().cloned(),
                Err(_) => None,
            };
            Err(CommandError::Message(wait_timeout_message(name, ready.as_ref())))
        }
    }
}

fn wait_timeout_message(name: &str, ready: Option<&agent::Condition>) -> String {
    let Some(ready) = ready else {
        return format!("timed out waiting for Agent {name:?} to become Ready; no Ready condition was reported");
    };
    format!(
        "timed out waiting for Agent {name:?} to become Ready: {}",
        ready.summary()
    )
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
            let ready = agent.status.ready_condition();
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
    agent::local::process::configure_logging(&mut command);
    command.spawn().map_err(Error::from)
}

fn daemon_executable(agentctl: &Path) -> PathBuf {
    agentctl.with_file_name(format!("agentd{}", std::env::consts::EXE_SUFFIX))
}

async fn read_apply_request(filename: PathBuf, env_file: Option<PathBuf>) -> Result<ApplyRequest, Error> {
    let filename = absolute(filename)?;
    let env_file = env_file.map(absolute).transpose()?;
    let bytes = tokio::fs::read(&filename).await?;
    let agent = manifest::decode(&bytes)?;
    let source_directory = filename
        .parent()
        .ok_or_else(|| Error::Invalid("manifest path has no parent directory".into()))?
        .to_path_buf();
    Ok(ApplyRequest {
        source_directory,
        manifest_path: Some(filename),
        env_file,
        create_only: false,
        agent,
    })
}

fn read_token_from_stdin() -> Result<zeroize::Zeroizing<String>, Error> {
    let mut line = zeroize::Zeroizing::new(String::new());
    std::io::stdin()
        .read_line(&mut line)
        .map_err(|error| Error::Invalid(format!("could not read the token from standard input: {error}")))?;
    let token = zeroize::Zeroizing::new(line.trim().to_owned());
    if token.is_empty() {
        return Err(Error::Invalid("no token was provided on standard input".into()));
    }
    Ok(token)
}

fn read_stdin_to_end() -> Result<zeroize::Zeroizing<String>, Error> {
    use std::io::Read as _;

    let mut text = zeroize::Zeroizing::new(String::new());
    std::io::stdin()
        .read_to_string(&mut text)
        .map_err(|error| Error::Invalid(format!("could not read the credential from standard input: {error}")))?;
    if text.trim().is_empty() {
        return Err(Error::Invalid("no credential was provided on standard input".into()));
    }
    Ok(text)
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

    struct StalledConnector {
        healthy: bool,
    }

    impl agent::control_api::Connector for StalledConnector {
        fn connect(&self) -> sandbox::LocalFuture<'_, Result<Box<dyn agent::control_api::Connection>, Error>> {
            Box::pin(async move {
                use tokio::io::AsyncBufReadExt as _;
                if !self.healthy {
                    return std::future::pending().await;
                }
                let (client, server) = tokio::io::duplex(4096);
                tokio::task::spawn_local(async move {
                    let mut server = tokio::io::BufReader::new(server);
                    let mut line = String::new();
                    server.read_line(&mut line).await.expect("request");
                    let request: serde_json::Value = serde_json::from_str(&line).expect("RPC");
                    if request["method"] == "control.v1.health" {
                        let response = serde_json::json!({ "jsonrpc": "2.0", "id": request["id"], "result": {} });
                        server
                            .write_all(format!("{response}\n").as_bytes())
                            .await
                            .expect("health response");
                    } else {
                        std::future::pending::<()>().await;
                        drop(server);
                    }
                });
                Ok(Box::new(client) as Box<dyn agent::control_api::Connection>)
            })
        }
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn create_stops_waiting_at_its_deadline() {
        for (owner, healthy) in [(Some("worker"), false), (Some("worker"), true), (None, true)] {
            let client = Client::new(std::rc::Rc::new(StalledConnector { healthy }));
            let directory = tempfile::TempDir::new().expect("temporary home");
            let home = ControlPlaneHome::resolve(Some(directory.path())).expect("home");
            let result = tokio::time::timeout(
                Duration::from_secs(2),
                create_session(
                    &home,
                    &client,
                    SessionTarget {
                        resource: "session/s1".into(),
                        name: None,
                        agent: owner.map(str::to_owned),
                    },
                    None,
                    PromptInput {
                        prompt: Some("go".into()),
                        file: None,
                    },
                    Duration::from_secs(1),
                ),
            )
            .await
            .expect("the command's own deadline must include Agent inference");
            assert!(matches!(result, Err(CommandError::Message(message)) if message.contains("timed out")));
        }
    }

    #[test]
    fn create_accepts_a_bounded_wait() {
        assert!(Arguments::try_parse_from(["agentctl", "create", "session/s1", "--timeout", "1s"]).is_ok());
    }

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
                command: CodexCommand::Login { from_stdin: false }
            }
        ));
        assert!(Arguments::try_parse_from(["agentctl", "codex", "login", "--with-api-key"]).is_err());
        let nested = Arguments::try_parse_from(["agentctl", "codex", "login", "--from-stdin"])
            .expect("Codex credential-file login arguments");
        assert!(matches!(
            nested.command,
            Command::Codex {
                command: CodexCommand::Login { from_stdin: true }
            }
        ));
    }

    #[test]
    fn claude_login_accepts_a_token_on_standard_input() {
        let arguments =
            Arguments::try_parse_from(["agentctl", "claude", "login", "--from-stdin"]).expect("Claude login arguments");
        assert!(matches!(
            arguments.command,
            Command::Claude {
                command: ClaudeCommand::Login { from_stdin: true }
            }
        ));
    }

    #[test]
    fn apply_accepts_a_secret_file_outside_the_manifest_directory() {
        let arguments = Arguments::try_parse_from([
            "agentctl",
            "apply",
            "-f",
            "agent.yaml",
            "--env-file",
            "/srv/secrets/worker.env",
        ])
        .expect("apply arguments");
        assert!(matches!(
            arguments.command,
            Command::Apply { env_file: Some(path), .. } if path == Path::new("/srv/secrets/worker.env")
        ));
    }

    #[test]
    fn apply_wait_is_opt_in_and_owns_the_timeout() {
        let plain = Arguments::try_parse_from(["agentctl", "apply", "-f", "agent.yaml"]).expect("plain apply");
        assert!(matches!(plain.command, Command::Apply { wait: false, .. }));
        let waited = Arguments::try_parse_from(["agentctl", "apply", "-f", "agent.yaml", "--wait", "--timeout", "2m"])
            .expect("apply --wait");
        assert!(matches!(
            waited.command,
            Command::Apply { wait: true, timeout, .. } if timeout == Duration::from_mins(2)
        ));
        assert!(Arguments::try_parse_from(["agentctl", "apply", "-f", "agent.yaml", "--timeout", "2m"]).is_err());
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
            status: agent::ConditionStatus::False,
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
            .block_on(read_apply_request(PathBuf::from("agent.yaml"), None));

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
