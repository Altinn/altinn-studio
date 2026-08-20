use std::{
    collections::BTreeMap,
    env,
    error::Error,
    io,
    path::{Path, PathBuf},
    process::Command as ProcessCommand,
    rc::Rc,
};

use clap::{Parser, Subcommand, ValueEnum};
use sandbox::{
    ByteQuantity, CpuQuantity, EnsureSandboxRequest, Platform, RetentionPolicy, RootFilesystem, SandboxFeature,
    SandboxName, SandboxPath, SandboxResources, SandboxService, SandboxSpec,
    execution::{ExecutionSpec, ExitStatus, Program},
    image::ImageSource,
    mount::Mount,
    terminal::{AttachTerminalRequest, TerminalAttachOutcome},
};
use sandbox_microsandbox::MicrosandboxProvider;
use sha2::{Digest as _, Sha256};

mod progress;

const SANDBOX_HOME: &str = "/home/agent";
const SANDBOX_REPOSITORY: &str = "/workspace/altinn-studio";
const SANDBOX_WORKSPACE: &str = "/workspace/altinn-studio";
const WORKTREE_ID_HEX_LENGTH: usize = 12;

#[derive(Debug, Parser)]
#[command(about = "Develop the Sandbox SDK from a retained Microsandbox VM")]
struct Arguments {
    /// Sandbox name. Defaults to a stable name derived from the current worktree.
    #[arg(long, global = true)]
    name: Option<SandboxName>,

    /// CPU assigned to the development Sandbox.
    #[arg(long, default_value = "4")]
    cpu: CpuQuantity,

    /// Memory assigned to the development Sandbox.
    #[arg(long, default_value = "8Gi")]
    memory: ByteQuantity,

    /// Writable root filesystem capacity.
    #[arg(long, default_value = "64Gi")]
    root_filesystem: ByteQuantity,

    /// Interactive coding harness to start.
    #[arg(long, value_enum, default_value_t)]
    harness: Harness,

    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum Harness {
    #[default]
    Codex,
    Claude,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Delete the Sandbox.
    Delete,
}

struct HostPaths {
    claude_home: PathBuf,
    codex_home: PathBuf,
    repository: PathBuf,
}

#[tokio::main(flavor = "local")]
async fn main() -> Result<(), Box<dyn Error>> {
    let arguments = Arguments::parse();
    let host_home = host_home()?;
    let repository = self_dev_repository()?;
    let sandbox_name = arguments
        .name
        .clone()
        .map_or_else(|| worktree_sandbox_name(&repository), Ok)?;
    let state_home = resolve_state_home(&host_home)?;
    let provider = Rc::new(MicrosandboxProvider::open(state_home.join("microsandbox")).await?);
    let service = SandboxService::new(provider);
    match arguments.command {
        Some(Command::Delete) => {
            progress::wait_for_operation("Delete Sandbox", service.delete(&sandbox_name)).await?;
            return Ok(());
        }
        None => {}
    }

    let paths = resolve_host_paths(&host_home, repository)?;
    let request = EnsureSandboxRequest::new(
        sandbox_name.clone(),
        SandboxSpec {
            image: ImageSource::Build {
                context: PathBuf::from(env!("CARGO_MANIFEST_DIR")),
                dockerfile: PathBuf::from("Dockerfile"),
            },
            platform: native_linux_platform(),
            resources: SandboxResources::new(
                arguments.cpu,
                arguments.memory,
                RootFilesystem::direct(arguments.root_filesystem),
            ),
            init_system: sandbox::init::InitSystem::Image,
            retention_policy: RetentionPolicy::Retain,
        },
    )
    .with_mounts([
        Mount::Bind {
            source: paths.codex_home,
            target: SandboxPath::new(format!("{SANDBOX_HOME}/.codex")),
            read_only: false,
        },
        Mount::Bind {
            source: paths.claude_home,
            target: SandboxPath::new(format!("{SANDBOX_HOME}/.claude")),
            read_only: false,
        },
        Mount::Bind {
            source: paths.repository,
            target: SandboxPath::new(SANDBOX_REPOSITORY),
            read_only: false,
        },
        Mount::Tmpfs {
            target: SandboxPath::new("/tmp"),
            capacity: "4Gi".parse()?,
        },
    ])
    .requiring_features([SandboxFeature::NestedContainers, SandboxFeature::TerminalAttach]);
    let sandbox = progress::wait_for_sandbox(service.ensure(&request)).await?;

    let run_result = match sandbox
        .attach_terminal(AttachTerminalRequest::new(interactive_spec(arguments.harness)))
        .await
    {
        Ok(TerminalAttachOutcome::Exited(status)) => Ok(status),
        Ok(TerminalAttachOutcome::Detached) => Ok(ExitStatus { code: 0 }),
        Ok(_) => Err(io::Error::other("unsupported terminal attachment outcome").into()),
        Err(error) => Err(Box::new(error) as Box<dyn Error>),
    };
    let release_result = progress::wait_for_operation("Stop Sandbox", sandbox.release()).await;
    let status = combine_run_and_release(run_result, release_result)?;
    if !status.success() {
        std::process::exit(status.code);
    }
    Ok(())
}

fn combine_run_and_release(
    run: Result<ExitStatus, Box<dyn Error>>,
    release: Result<(), Box<dyn Error>>,
) -> Result<ExitStatus, Box<dyn Error>> {
    match (run, release) {
        (Ok(status), Ok(())) => Ok(status),
        (Err(run), Ok(())) => Err(run),
        (Ok(_), Err(release)) => Err(release),
        (Err(run), Err(release)) => Err(io::Error::other(format!(
            "Terminal Execution failed: {run}; stopping the Sandbox also failed: {release}"
        ))
        .into()),
    }
}

fn interactive_spec(harness: Harness) -> ExecutionSpec {
    ExecutionSpec::new(harness.program())
        .with_working_directory(SandboxPath::new(SANDBOX_WORKSPACE))
        .with_environment(sandbox_environment())
}

impl Harness {
    fn program(self) -> Program {
        let (executable, args) = match self {
            Self::Codex => ("/usr/local/bin/codex", vec!["--yolo".to_string()]),
            Self::Claude => (
                "/usr/local/bin/claude",
                vec!["--dangerously-skip-permissions".to_string()],
            ),
        };
        Program::Command {
            executable: SandboxPath::new(executable),
            args,
        }
    }
}

fn sandbox_environment() -> BTreeMap<String, String> {
    BTreeMap::from([
        ("CARGO_HOME".to_string(), format!("{SANDBOX_HOME}/.cargo")),
        (
            "CARGO_TARGET_DIR".to_string(),
            format!("{SANDBOX_HOME}/.cache/sandbox-self-dev/target"),
        ),
        ("CODEX_HOME".to_string(), format!("{SANDBOX_HOME}/.codex")),
        ("CLAUDE_CONFIG_DIR".to_string(), format!("{SANDBOX_HOME}/.claude")),
        ("HOME".to_string(), SANDBOX_HOME.to_string()),
    ])
}

fn resolve_host_paths(host_home: &Path, repository: PathBuf) -> Result<HostPaths, Box<dyn Error>> {
    let codex_home = harness_home("CODEX_HOME", ".codex", "Codex home", host_home)?;
    let claude_home = harness_home("CLAUDE_CONFIG_DIR", ".claude", "Claude home", host_home)?;
    Ok(HostPaths {
        claude_home,
        codex_home,
        repository,
    })
}

fn self_dev_repository() -> Result<PathBuf, Box<dyn Error>> {
    let repository = current_git_repository()?;
    if !repository.join("Cargo.toml").is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!(
                "{} does not contain the Altinn Studio Rust workspace",
                repository.display()
            ),
        )
        .into());
    }
    Ok(repository)
}

fn worktree_sandbox_name(repository: &Path) -> Result<SandboxName, sandbox::InvalidSandboxName> {
    let digest = Sha256::digest(repository.as_os_str().as_encoded_bytes());
    let mut suffix = String::with_capacity(WORKTREE_ID_HEX_LENGTH);
    for &byte in &digest[..WORKTREE_ID_HEX_LENGTH / 2] {
        const DIGITS: &[u8; 16] = b"0123456789abcdef";
        suffix.push(char::from(DIGITS[usize::from(byte >> 4)]));
        suffix.push(char::from(DIGITS[usize::from(byte & 0x0f)]));
    }
    SandboxName::new(format!("self-dev-{suffix}"))
}

fn harness_home(variable: &str, default: &str, label: &str, host_home: &Path) -> Result<PathBuf, io::Error> {
    let path = env::var_os(variable).map_or_else(|| host_home.join(default), PathBuf::from);
    std::fs::create_dir_all(&path)?;
    canonical_directory(&path, label)
}

fn resolve_state_home(host_home: &Path) -> Result<PathBuf, io::Error> {
    let state_home = host_home.join(".sandbox/self-dev");
    std::fs::create_dir_all(&state_home)?;
    canonical_directory(&state_home, "Sandbox state home")
}

fn current_git_repository() -> Result<PathBuf, Box<dyn Error>> {
    let output = ProcessCommand::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .output()?;
    if !output.status.success() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "current directory is not inside a Git repository",
        )
        .into());
    }
    let path = String::from_utf8(output.stdout)?;
    Ok(canonical_directory(Path::new(path.trim()), "repository")?)
}

fn canonical_directory(path: &Path, label: &str) -> Result<PathBuf, io::Error> {
    let path = std::fs::canonicalize(path)?;
    if !path.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{label} {} is not a directory", path.display()),
        ));
    }
    Ok(path)
}

fn host_home() -> Result<PathBuf, io::Error> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "HOME is not set"))
}

fn native_linux_platform() -> Platform {
    Platform::new(
        "linux",
        match env::consts::ARCH {
            "x86_64" => "amd64",
            "aarch64" => "arm64",
            architecture => architecture,
        },
    )
}
