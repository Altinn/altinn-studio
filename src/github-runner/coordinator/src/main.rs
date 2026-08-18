use std::{
    collections::BTreeMap,
    env,
    error::Error,
    fs::{self, OpenOptions},
    io,
    num::NonZeroU64,
    path::{Path, PathBuf},
    process::ExitCode,
    rc::Rc,
    time::{Duration, Instant},
};

use clap::{Parser, ValueEnum};
use futures_util::StreamExt as _;
use sandbox::{
    ByteQuantity, CpuQuantity, EnsureSandboxRequest, OperationEvent, Platform, RetentionPolicy,
    RootFilesystem, SandboxEvent, SandboxFeature, SandboxHandle, SandboxName, SandboxPath,
    SandboxResources, SandboxService, SandboxSpec,
    execution::{ExecutionEvent, ExecutionId, ExecutionSpec, ExitStatus, StartExecutionRequest},
    image::ImageSource,
    init::InitSystem,
};
use sandbox_microsandbox::MicrosandboxProvider;
use tokio::signal::unix::{Signal, SignalKind, signal};

mod github;

use github::{GithubClient, GithubConfig};

const DEFAULT_PROVIDER_HOME: &str = "/var/lib/altinn/sandbox-provider";
const DEFAULT_CACHE_DIRECTORY: &str = "/var/cache/altinn/microsandbox";
const DEFAULT_RUNTIME_BUNDLE: &str = "/opt/altinn/microsandbox/microsandbox-linux-x86_64.tar.gz";
const DEFAULT_RUNTIME_BUNDLE_CHECKSUMS: &str = "/opt/altinn/microsandbox/checksums.sha256";
const DEFAULT_RUNNER_HOME: &str = "/home/runner";
const DEFAULT_RUNNER_LABELS: &str = "self-hosted-sandbox";
const RUNNER_ENTRYPOINT: &str = "/usr/local/bin/altinn-github-runner-sandbox";
const CLEANUP_TIMEOUT: Duration = Duration::from_mins(1);
const RUNNER_CLAIM_POLL_INTERVAL: Duration = Duration::from_secs(5);

type AnyError = Box<dyn Error>;

#[derive(Clone, Copy, ValueEnum)]
enum RunnerScope {
    Repo,
    Org,
}

#[derive(Parser)]
#[command(about = "Run one ephemeral GitHub Actions runner inside a Microsandbox")]
struct Arguments {
    /// Writable, per-Job Microsandbox provider home.
    #[arg(long, env = "SANDBOX_PROVIDER_HOME", default_value = DEFAULT_PROVIDER_HOME)]
    provider_home: PathBuf,

    /// Node-local cache shared by Microsandbox Provider instances.
    #[arg(
        long,
        env = "MICROSANDBOX_CACHE_HOME",
        default_value = DEFAULT_CACHE_DIRECTORY
    )]
    cache_directory: PathBuf,

    /// Preinstalled Microsandbox host runtime bundle.
    #[arg(
        long,
        env = "MICROSANDBOX_RUNTIME_BUNDLE",
        default_value = DEFAULT_RUNTIME_BUNDLE
    )]
    runtime_bundle: PathBuf,

    /// Published checksum file covering the preinstalled runtime bundle.
    #[arg(
        long,
        env = "MICROSANDBOX_RUNTIME_BUNDLE_CHECKSUMS",
        default_value = DEFAULT_RUNTIME_BUNDLE_CHECKSUMS
    )]
    runtime_bundle_checksums: PathBuf,

    /// Immutable OCI reference for the runner guest image.
    #[arg(long, env = "SANDBOX_GUEST_IMAGE")]
    guest_image: String,

    /// Sandbox name. Defaults to the Kubernetes Pod name.
    #[arg(long, env = "SANDBOX_NAME")]
    sandbox_name: Option<SandboxName>,

    /// Virtual CPUs assigned to the guest.
    #[arg(long, env = "SANDBOX_CPUS", default_value = "4")]
    cpus: CpuQuantity,

    /// Memory assigned to the guest.
    #[arg(long, env = "SANDBOX_MEMORY", default_value = "12Gi")]
    memory: ByteQuantity,

    /// Capacity of the private direct ext4 guest root.
    #[arg(long, env = "SANDBOX_ROOT_FILESYSTEM", default_value = "100Gi")]
    root_filesystem: ByteQuantity,

    /// GitHub App identifier.
    #[arg(long, env = "APP_ID", hide_env_values = true)]
    app_id: u64,

    /// Installation identifier for the GitHub App on the selected owner.
    #[arg(long, env = "APP_INSTALLATION_ID", hide_env_values = true)]
    app_installation_id: u64,

    /// PEM-encoded GitHub App private key.
    #[arg(long, env = "APP_PRIVATE_KEY", hide_env_values = true)]
    app_private_key: String,

    /// GitHub REST API base URL.
    #[arg(long, env = "GITHUB_API_URL", default_value = "https://api.github.com")]
    github_api_url: String,

    /// GitHub web base URL.
    #[arg(long, env = "GITHUB_SERVER_URL", default_value = "https://github.com")]
    github_server_url: String,

    /// GitHub organization or repository owner.
    #[arg(long, env = "GITHUB_OWNER")]
    github_owner: String,

    /// Repository name when `RUNNER_SCOPE` is repo.
    #[arg(long, env = "GITHUB_REPOSITORY")]
    github_repository: Option<String>,

    /// Scope at which the ephemeral runner is registered.
    #[arg(long, env = "RUNNER_SCOPE", value_enum, default_value = "repo")]
    runner_scope: RunnerScope,

    /// Ephemeral runner name. Defaults to the Kubernetes Pod name.
    #[arg(long, env = "RUNNER_NAME")]
    runner_name: Option<String>,

    /// Comma-separated GitHub runner labels.
    #[arg(long, env = "RUNNER_LABELS", default_value = DEFAULT_RUNNER_LABELS)]
    runner_labels: String,

    /// GitHub runner group.
    #[arg(long, env = "RUNNER_GROUP", default_value = "Default")]
    runner_group: String,

    /// Runner working directory inside the guest.
    #[arg(long, env = "RUNNER_WORKDIR", default_value = "/home/runner/_work")]
    runner_workdir: String,

    /// Maximum time to wait for the online runner to claim a queued job.
    #[arg(long, env = "RUNNER_CLAIM_TIMEOUT_SECONDS", default_value = "600")]
    runner_claim_timeout_seconds: NonZeroU64,

    /// Optional registry mirror used by guest dockerd.
    #[arg(
        long,
        env = "DOCKER_REGISTRY_MIRROR",
        default_value = "https://mirror.gcr.io"
    )]
    docker_registry_mirror: String,
}

enum EnsureOutcome {
    Ready(Box<SandboxHandle>),
    Interrupted,
}

enum RunnerOutcome {
    Exited(ExitStatus),
    Interrupted,
    Unclaimed,
}

struct ShutdownSignals {
    interrupt: Signal,
    terminate: Signal,
}

impl ShutdownSignals {
    fn new() -> Result<Self, io::Error> {
        Ok(Self {
            interrupt: signal(SignalKind::interrupt())?,
            terminate: signal(SignalKind::terminate())?,
        })
    }

    async fn receive(&mut self) {
        tokio::select! {
            _ = self.interrupt.recv() => {}
            _ = self.terminate.recv() => {}
        }
    }
}

#[tokio::main(flavor = "local")]
async fn main() -> Result<ExitCode, AnyError> {
    let started = Instant::now();
    let arguments = Arguments::parse();
    validate_arguments(&arguments)?;
    let runtime_bundle_sha256 = read_runtime_bundle_sha256(
        &arguments.runtime_bundle,
        &arguments.runtime_bundle_checksums,
    )?;
    verify_kvm_device()?;
    let sandbox_name = sandbox_name(arguments.sandbox_name.clone())?;
    let runner_name = runner_name(arguments.runner_name.as_deref())?;
    let runner_url = runner_url(&arguments)?;
    println!("provider home: {}", arguments.provider_home.display());
    println!("sandbox name: {sandbox_name}");
    println!("runner name: {runner_name}");

    let provider = Rc::new(
        MicrosandboxProvider::builder(&arguments.provider_home)
            .cache_directory(&arguments.cache_directory)
            .runtime_bundle(&arguments.runtime_bundle, runtime_bundle_sha256)
            .open()
            .await?,
    );
    println!(
        "Microsandbox cache: {}",
        provider.cache_directory().display()
    );
    let service = SandboxService::new(provider);
    let request = sandbox_request(&arguments, sandbox_name.clone());
    let mut shutdown = ShutdownSignals::new()?;
    let ensure_started = Instant::now();
    let ensure = wait_for_sandbox(service.ensure(&request), &mut shutdown).await;
    println!("timing ensure_ms={}", ensure_started.elapsed().as_millis());

    let sandbox = match ensure {
        Ok(EnsureOutcome::Ready(sandbox)) => *sandbox,
        Ok(EnsureOutcome::Interrupted) => {
            eprintln!("shutdown requested while creating Sandbox");
            cleanup_named_sandbox(&service, &sandbox_name).await?;
            return Ok(ExitCode::from(143));
        }
        Err(error) => {
            let cleanup = cleanup_named_sandbox(&service, &sandbox_name).await;
            return Err(combine_errors(error, cleanup));
        }
    };

    let github = match GithubClient::authenticate(github_config(&arguments)?).await {
        Ok(client) => client,
        Err(error) => {
            let cleanup = cleanup_sandbox(sandbox).await;
            return Err(combine_errors(error, cleanup));
        }
    };
    let registration_token = match github.registration_token().await {
        Ok(token) => token,
        Err(error) => {
            let cleanup = cleanup_sandbox(sandbox).await;
            return Err(combine_errors(error, cleanup));
        }
    };

    let runner_started = Instant::now();
    let runner = run_runner(
        &sandbox,
        &github,
        &runner_name,
        Duration::from_secs(arguments.runner_claim_timeout_seconds.get()),
        runner_environment(&arguments, &runner_name, &runner_url, registration_token),
        &mut shutdown,
    )
    .await;
    println!("timing runner_ms={}", runner_started.elapsed().as_millis());

    let cleanup_started = Instant::now();
    let (sandbox_cleanup, registration_cleanup) = tokio::join!(
        cleanup_sandbox(sandbox),
        cleanup_runner_registration(&github, &runner_name),
    );
    let cleanup = combine_cleanup(sandbox_cleanup, registration_cleanup);
    println!(
        "timing cleanup_ms={}",
        cleanup_started.elapsed().as_millis()
    );
    println!("timing total_ms={}", started.elapsed().as_millis());

    match (runner, cleanup) {
        (Ok(RunnerOutcome::Exited(status)), Ok(())) => Ok(exit_code(status.code)),
        (Ok(RunnerOutcome::Interrupted), Ok(())) => Ok(ExitCode::from(143)),
        (Ok(RunnerOutcome::Unclaimed), Ok(())) => Ok(ExitCode::SUCCESS),
        (Err(error), Ok(())) | (Ok(_), Err(error)) => Err(error),
        (Err(error), Err(cleanup_error)) => Err(io::Error::other(format!(
            "{error}; deleting the Sandbox also failed: {cleanup_error}"
        ))
        .into()),
    }
}

fn validate_arguments(arguments: &Arguments) -> Result<(), io::Error> {
    validate_immutable_image_reference(&arguments.guest_image)?;
    if arguments.app_id == 0 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "APP_ID must be greater than zero",
        ));
    }
    require_nonempty("APP_PRIVATE_KEY", &arguments.app_private_key)?;
    if arguments.app_installation_id == 0 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "APP_INSTALLATION_ID must be greater than zero",
        ));
    }
    require_nonempty("GITHUB_API_URL", &arguments.github_api_url)?;
    require_nonempty("GITHUB_SERVER_URL", &arguments.github_server_url)?;
    require_nonempty("GITHUB_OWNER", &arguments.github_owner)?;
    if matches!(arguments.runner_scope, RunnerScope::Repo) {
        require_nonempty(
            "GITHUB_REPOSITORY",
            arguments.github_repository.as_deref().unwrap_or_default(),
        )?;
    }
    require_nonempty("RUNNER_LABELS", &arguments.runner_labels)?;
    require_nonempty("RUNNER_GROUP", &arguments.runner_group)?;
    require_nonempty("RUNNER_WORKDIR", &arguments.runner_workdir)?;
    Ok(())
}

fn validate_immutable_image_reference(reference: &str) -> Result<(), io::Error> {
    let Some((repository, digest)) = reference.rsplit_once("@sha256:") else {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "SANDBOX_GUEST_IMAGE must be pinned by sha256 digest",
        ));
    };
    if repository.is_empty()
        || digest.len() != 64
        || !digest.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "SANDBOX_GUEST_IMAGE must contain a repository and a 64-character sha256 digest",
        ));
    }
    Ok(())
}

fn require_nonempty(name: &str, value: &str) -> Result<(), io::Error> {
    if value.trim().is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must not be empty"),
        ));
    }
    Ok(())
}

fn read_runtime_bundle_sha256(bundle: &Path, checksums: &Path) -> Result<String, io::Error> {
    let filename = bundle
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "MICROSANDBOX_RUNTIME_BUNDLE must have a UTF-8 filename",
            )
        })?;
    let contents = fs::read_to_string(checksums).map_err(|error| {
        io::Error::new(
            error.kind(),
            format!("cannot read {}: {error}", checksums.display()),
        )
    })?;
    parse_runtime_bundle_sha256(&contents, filename)
}

fn parse_runtime_bundle_sha256(contents: &str, filename: &str) -> Result<String, io::Error> {
    contents
        .lines()
        .find_map(|line| {
            let mut fields = line.split_whitespace();
            let digest = fields.next()?;
            let candidate = fields.next()?.trim_start_matches('*');
            (candidate == filename && fields.next().is_none()).then_some(digest)
        })
        .filter(|digest| digest.len() == 64 && digest.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .map(str::to_owned)
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("checksum file has no valid SHA-256 entry for {filename}"),
            )
        })
}

fn verify_kvm_device() -> Result<(), io::Error> {
    OpenOptions::new()
        .read(true)
        .write(true)
        .open("/dev/kvm")
        .map(|_| ())
        .map_err(|error| io::Error::new(error.kind(), format!("cannot open /dev/kvm: {error}")))
}

fn sandbox_name(argument: Option<SandboxName>) -> Result<SandboxName, sandbox::InvalidSandboxName> {
    argument.map_or_else(
        || {
            SandboxName::new(
                env::var("POD_NAME").unwrap_or_else(|_| "github-runner-sandbox".to_string()),
            )
        },
        Ok,
    )
}

fn runner_name(argument: Option<&str>) -> Result<String, io::Error> {
    let name = argument
        .map(ToOwned::to_owned)
        .or_else(|| env::var("POD_NAME").ok())
        .unwrap_or_else(|| "github-runner-sandbox".to_string());
    require_nonempty("RUNNER_NAME", &name)?;
    Ok(name)
}

fn sandbox_request(arguments: &Arguments, name: SandboxName) -> EnsureSandboxRequest {
    EnsureSandboxRequest::new(
        name,
        SandboxSpec {
            image: ImageSource::Reference {
                reference: arguments.guest_image.clone(),
            },
            platform: native_linux_platform(),
            resources: SandboxResources::new(
                arguments.cpus,
                arguments.memory,
                RootFilesystem::direct(arguments.root_filesystem),
            ),
            init_system: InitSystem::Backend,
            retention_policy: RetentionPolicy::Delete,
        },
    )
    .requiring_features([SandboxFeature::NestedContainers])
}

fn github_config(arguments: &Arguments) -> Result<GithubConfig, io::Error> {
    let owner = &arguments.github_owner;
    let (registration_path, runners_path) = match arguments.runner_scope {
        RunnerScope::Repo => {
            let repository = arguments.github_repository.as_deref().ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "GITHUB_REPOSITORY is required for repo scope",
                )
            })?;
            (
                format!("/repos/{owner}/{repository}/actions/runners/registration-token"),
                format!("/repos/{owner}/{repository}/actions/runners"),
            )
        }
        RunnerScope::Org => (
            format!("/orgs/{owner}/actions/runners/registration-token"),
            format!("/orgs/{owner}/actions/runners"),
        ),
    };
    Ok(GithubConfig {
        api_url: arguments.github_api_url.clone(),
        app_id: arguments.app_id,
        installation_id: arguments.app_installation_id,
        private_key: arguments.app_private_key.clone(),
        registration_path,
        runners_path,
    })
}

fn runner_url(arguments: &Arguments) -> Result<String, io::Error> {
    let base = arguments.github_server_url.trim_end_matches('/');
    Ok(match arguments.runner_scope {
        RunnerScope::Repo => format!(
            "{base}/{}/{}",
            arguments.github_owner,
            arguments.github_repository.as_deref().ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "GITHUB_REPOSITORY is required for repo scope",
                )
            })?
        ),
        RunnerScope::Org => format!("{base}/{}", arguments.github_owner),
    })
}

fn runner_environment(
    arguments: &Arguments,
    runner_name: &str,
    runner_url: &str,
    registration_token: String,
) -> BTreeMap<String, String> {
    BTreeMap::from([
        (
            "DOCKER_REGISTRY_MIRROR".to_string(),
            arguments.docker_registry_mirror.clone(),
        ),
        ("RUNNER_GROUP".to_string(), arguments.runner_group.clone()),
        ("RUNNER_LABELS".to_string(), arguments.runner_labels.clone()),
        ("RUNNER_NAME".to_string(), runner_name.to_string()),
        ("RUNNER_REGISTRATION_TOKEN".to_string(), registration_token),
        ("RUNNER_URL".to_string(), runner_url.to_string()),
        (
            "RUNNER_WORKDIR".to_string(),
            arguments.runner_workdir.clone(),
        ),
    ])
}

async fn wait_for_sandbox(
    mut pending: sandbox::PendingSandbox<'_>,
    shutdown: &mut ShutdownSignals,
) -> Result<EnsureOutcome, AnyError> {
    loop {
        tokio::select! {
            event = pending.next() => {
                match event {
                    Some(Ok(OperationEvent::Progress(progress))) => log_sandbox_event(&progress),
                    Some(Ok(OperationEvent::Ready(sandbox))) => {
                        return Ok(EnsureOutcome::Ready(Box::new(sandbox)));
                    }
                    Some(Ok(_)) => {}
                    Some(Err(error)) => return Err(error.into()),
                    None => return Err(sandbox::Error::OperationStreamEnded.into()),
                }
            }
            () = shutdown.receive() => return Ok(EnsureOutcome::Interrupted),
        }
    }
}

fn log_sandbox_event(event: &SandboxEvent) {
    match event {
        SandboxEvent::PhaseStarted { phase } => println!("starting: {phase}"),
        SandboxEvent::PhaseCompleted {
            phase,
            outcome,
            elapsed,
        } => println!(
            "completed: {phase}; outcome={outcome:?}; elapsed_ms={}",
            elapsed.as_millis()
        ),
        SandboxEvent::StepStarted { name, .. } => println!("  starting: {name}"),
        SandboxEvent::StepCompleted { name, elapsed, .. } => {
            println!("  completed: {name}; elapsed_ms={}", elapsed.as_millis());
        }
        _ => {}
    }
}

async fn run_runner(
    sandbox: &SandboxHandle,
    github: &GithubClient,
    runner_name: &str,
    claim_timeout: Duration,
    environment: BTreeMap<String, String>,
    shutdown: &mut ShutdownSignals,
) -> Result<RunnerOutcome, AnyError> {
    let spec = ExecutionSpec::command(SandboxPath::new(RUNNER_ENTRYPOINT), Vec::<String>::new())
        .with_working_directory(SandboxPath::new(DEFAULT_RUNNER_HOME))
        .with_environment(environment);
    let request = StartExecutionRequest::new(spec);
    let started = tokio::select! {
        result = sandbox.start_execution(request) => result?,
        () = shutdown.receive() => return Ok(RunnerOutcome::Interrupted),
    };
    let execution_id = started.id.clone();
    let mut events = started.events;
    let claim_deadline = tokio::time::sleep(claim_timeout);
    tokio::pin!(claim_deadline);
    let mut claim_poll = tokio::time::interval(RUNNER_CLAIM_POLL_INTERVAL);
    claim_poll.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let mut claimed = false;

    loop {
        tokio::select! {
            event = events.next() => {
                match event {
                    Some(Ok(ExecutionEvent::Started { process_id })) => {
                        println!("runner execution started; pid={process_id:?}");
                    }
                    Some(Ok(ExecutionEvent::Stdout(bytes))) => write_output(io::stdout(), &bytes)?,
                    Some(Ok(ExecutionEvent::Stderr(bytes))) => write_output(io::stderr(), &bytes)?,
                    Some(Ok(ExecutionEvent::Exited(status))) => return Ok(RunnerOutcome::Exited(status)),
                    Some(Ok(ExecutionEvent::Failed { message })) => {
                        return Err(io::Error::other(format!("runner execution failed: {message}")).into());
                    }
                    Some(Ok(_)) => {}
                    Some(Err(error)) => return Err(error.into()),
                    None => return Err(io::Error::other("runner execution event stream ended before exit").into()),
                }
            }
            () = &mut claim_deadline, if !claimed => {
                match github.runner_busy(runner_name).await {
                    Ok(Some(true)) => {
                        claimed = true;
                        println!("runner claimed a job at the claim deadline");
                        continue;
                    }
                    Ok(Some(false) | None) => {}
                    Err(error) => {
                        eprintln!("could not perform final runner claim check: {error}");
                    }
                }
                eprintln!(
                    "runner did not claim a job within {} seconds; terminating",
                    claim_timeout.as_secs()
                );
                terminate_runner_execution(sandbox, &execution_id).await?;
                return Ok(RunnerOutcome::Unclaimed);
            }
            _ = claim_poll.tick(), if !claimed => {
                match github.runner_busy(runner_name).await {
                    Ok(Some(true)) => {
                        claimed = true;
                        println!("runner claimed a job");
                    }
                    Ok(Some(false) | None) => {}
                    Err(error) => {
                        eprintln!("could not check whether the runner claimed a job: {error}");
                    }
                }
            }
            () = shutdown.receive() => {
                eprintln!("shutdown requested; terminating runner execution");
                terminate_runner_execution(sandbox, &execution_id).await?;
                return Ok(RunnerOutcome::Interrupted);
            }
        }
    }
}

async fn terminate_runner_execution(
    sandbox: &SandboxHandle,
    execution_id: &ExecutionId,
) -> Result<(), AnyError> {
    if let Err(error) = sandbox.terminate_execution(execution_id).await {
        eprintln!("graceful runner termination failed: {error}");
        sandbox.kill_execution(execution_id).await?;
    }
    Ok(())
}

fn write_output(mut writer: impl io::Write, bytes: &[u8]) -> Result<(), io::Error> {
    writer.write_all(bytes)?;
    writer.flush()
}

async fn cleanup_sandbox(sandbox: SandboxHandle) -> Result<(), AnyError> {
    tokio::time::timeout(CLEANUP_TIMEOUT, sandbox.delete())
        .await
        .map_or_else(
            |_| Err(cleanup_timeout_error()),
            |result| result.map_err(Into::into),
        )
}

async fn cleanup_named_sandbox(
    service: &SandboxService,
    name: &SandboxName,
) -> Result<(), AnyError> {
    tokio::time::timeout(CLEANUP_TIMEOUT, service.delete(name))
        .await
        .map_or_else(
            |_| Err(cleanup_timeout_error()),
            |result| result.map_err(Into::into),
        )
}

async fn cleanup_runner_registration(
    github: &GithubClient,
    runner_name: &str,
) -> Result<(), AnyError> {
    let removed = tokio::time::timeout(CLEANUP_TIMEOUT, github.remove_runner(runner_name))
        .await
        .map_err(|_| {
            io::Error::new(
                io::ErrorKind::TimedOut,
                "GitHub runner-registration cleanup timed out",
            )
        })??;
    if removed {
        println!("removed stale GitHub runner registration");
    } else {
        println!("GitHub runner registration already absent");
    }
    Ok(())
}

fn cleanup_timeout_error() -> AnyError {
    io::Error::new(io::ErrorKind::TimedOut, "Sandbox deletion timed out").into()
}

fn combine_errors(primary: AnyError, cleanup: Result<(), AnyError>) -> AnyError {
    match cleanup {
        Ok(()) => primary,
        Err(cleanup_error) => io::Error::other(format!(
            "{primary}; deleting the Sandbox also failed: {cleanup_error}"
        ))
        .into(),
    }
}

fn combine_cleanup(
    first: Result<(), AnyError>,
    second: Result<(), AnyError>,
) -> Result<(), AnyError> {
    match (first, second) {
        (Ok(()), Ok(())) => Ok(()),
        (Err(error), Ok(())) | (Ok(()), Err(error)) => Err(error),
        (Err(first), Err(second)) => Err(io::Error::other(format!(
            "Sandbox cleanup failed: {first}; runner-registration cleanup also failed: {second}"
        ))
        .into()),
    }
}

fn exit_code(code: i32) -> ExitCode {
    u8::try_from(code).map_or(ExitCode::FAILURE, ExitCode::from)
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

#[cfg(test)]
mod tests {
    use super::{exit_code, parse_runtime_bundle_sha256, validate_immutable_image_reference};
    use std::process::ExitCode;

    #[test]
    fn accepts_digest_pinned_image() {
        let reference = format!("registry.example/runner@sha256:{}", "a".repeat(64));
        assert!(validate_immutable_image_reference(&reference).is_ok());
    }

    #[test]
    fn rejects_tagged_or_malformed_image() {
        for reference in [
            "registry.example/runner:latest",
            "registry.example/runner@sha256:abc",
            "@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "registry.example/runner@sha256:gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
        ] {
            assert!(validate_immutable_image_reference(reference).is_err());
        }
    }

    #[test]
    fn maps_only_process_exit_codes_to_portable_exit_codes() {
        assert_eq!(exit_code(0), ExitCode::SUCCESS);
        assert_eq!(exit_code(255), ExitCode::from(255));
        assert_eq!(exit_code(-1), ExitCode::FAILURE);
        assert_eq!(exit_code(256), ExitCode::FAILURE);
    }

    #[test]
    fn selects_the_runtime_bundle_published_checksum() {
        let expected = "a".repeat(64);
        let checksums = format!(
            "{}  agentd-x86_64\n{}  microsandbox-linux-x86_64.tar.gz\n",
            "b".repeat(64),
            expected
        );

        let result = parse_runtime_bundle_sha256(&checksums, "microsandbox-linux-x86_64.tar.gz");
        assert!(matches!(result, Ok(ref digest) if digest == &expected));
    }

    #[test]
    fn rejects_a_missing_or_malformed_runtime_bundle_checksum() {
        assert!(parse_runtime_bundle_sha256("", "runtime.tar.gz").is_err());
        assert!(parse_runtime_bundle_sha256("abc  runtime.tar.gz\n", "runtime.tar.gz").is_err());
    }
}
