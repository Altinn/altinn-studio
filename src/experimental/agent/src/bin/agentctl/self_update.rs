use std::{
    path::{Path, PathBuf},
    process::{Command as ProcessCommand, Stdio},
    time::{Duration, Instant},
};

use agent::{
    Error,
    control_api::{Client, PROTOCOL_VERSION},
    local::home::{ControlPlaneHome, Lock},
    upgrade::{self, InstallMetadata, InstallPaths, Release, UpdateJournal, UpdatePhase},
};

use super::CommandResult;

const DEFAULT_REPOSITORY: &str = "Altinn/altinn-studio";
const DAEMON_STOP_TIMEOUT: Duration = Duration::from_secs(65);
const LIFECYCLE_REQUEST_TIMEOUT: Duration = Duration::from_secs(65);
const TARGET_VERIFY_TIMEOUT: Duration = Duration::from_secs(75);

struct Completion {
    paths: InstallPaths,
    target_release: PathBuf,
    target_version: String,
    previous_release: Option<PathBuf>,
    repository: String,
}

impl Completion {
    fn from_journal(paths: InstallPaths, journal: UpdateJournal) -> Result<Self, Error> {
        let repository = repository(&paths)?;
        Ok(Self {
            paths,
            target_release: journal.target_release,
            target_version: journal.target_version,
            previous_release: journal.previous_release,
            repository,
        })
    }

    fn run_target(&self, home: &ControlPlaneHome) -> Result<(), Error> {
        let mut command = ProcessCommand::new(
            self.target_release
                .join(format!("agentctl{}", std::env::consts::EXE_SUFFIX)),
        );
        command
            .arg("--home")
            .arg(home.path())
            .args(["self", "__complete-update", "--install-root"])
            .arg(self.paths.root())
            .arg("--bin-directory")
            .arg(self.paths.bin())
            .arg("--agent-home")
            .arg(home.path())
            .arg("--target-release")
            .arg(&self.target_release)
            .arg("--target-version")
            .arg(&self.target_version)
            .arg("--repository")
            .arg(&self.repository);
        if let Some(previous) = &self.previous_release {
            command.arg("--previous-release").arg(previous);
        }
        let status = command.status()?;
        if !status.success() {
            return Err(Error::Daemon(format!("target updater exited with {status}")));
        }
        Ok(())
    }
}

#[derive(clap::Subcommand)]
pub(super) enum SelfCommand {
    /// Check for or install a released Agent update.
    Update {
        /// Install this exact release version.
        #[arg(long)]
        version: Option<String>,
        /// Report whether an update is available without downloading it.
        #[arg(long)]
        check: bool,
    },
    /// Complete a target-owned package and state transition.
    #[command(name = "__complete-update", hide = true)]
    CompleteUpdate {
        #[arg(long)]
        install_root: PathBuf,
        #[arg(long)]
        bin_directory: PathBuf,
        #[arg(long)]
        agent_home: PathBuf,
        #[arg(long)]
        target_release: PathBuf,
        #[arg(long)]
        target_version: String,
        #[arg(long)]
        previous_release: Option<PathBuf>,
        #[arg(long, default_value = DEFAULT_REPOSITORY)]
        repository: String,
    },
    /// Publish an extracted release through the platform install lock.
    #[command(name = "__publish-release", hide = true)]
    PublishRelease {
        #[arg(long)]
        install_root: PathBuf,
        #[arg(long)]
        bin_directory: PathBuf,
        #[arg(long)]
        source_release: PathBuf,
        #[arg(long)]
        target_version: String,
    },
}

pub(super) async fn execute(command: SelfCommand, home: &ControlPlaneHome) -> CommandResult<()> {
    match command {
        SelfCommand::Update { version, check } => update(home, version.as_deref(), check).await,
        SelfCommand::CompleteUpdate {
            install_root,
            bin_directory,
            agent_home,
            target_release,
            target_version,
            previous_release,
            repository,
        } => {
            if agent_home != home.path() {
                return Err(Error::Invalid("--agent-home does not match the resolved Agent home".into()).into());
            }
            complete(
                Completion {
                    paths: InstallPaths::new(install_root, bin_directory)?,
                    target_release,
                    target_version,
                    previous_release,
                    repository,
                },
                home,
            )
            .await
        }
        SelfCommand::PublishRelease {
            install_root,
            bin_directory,
            source_release,
            target_version,
        } => {
            validate_source_process(&source_release)?;
            upgrade::publish_release(
                &InstallPaths::new(install_root, bin_directory)?,
                &source_release,
                &target_version,
            )
            .await?;
            Ok(())
        }
    }
}

pub(super) fn resume_pending_before_command(home: &ControlPlaneHome) -> CommandResult<()> {
    let paths = InstallPaths::resolve()?;
    let Some(journal) = UpdateJournal::read(&paths)?.filter(|journal| journal.phase != UpdatePhase::Complete) else {
        return Ok(());
    };
    let target_version = journal.target_version.clone();
    Completion::from_journal(paths, journal)?.run_target(home)?;
    if !same_version(agent::build_version(), &target_version)? {
        return Err(Error::Daemon(format!(
            "Agent update to {target_version} completed; rerun this command with the current agentctl"
        ))
        .into());
    }
    Ok(())
}

async fn update(home: &ControlPlaneHome, version: Option<&str>, check: bool) -> CommandResult<()> {
    let paths = InstallPaths::resolve()?;
    if let Some(journal) = UpdateJournal::read(&paths)?.filter(|journal| journal.phase != UpdatePhase::Complete) {
        Completion::from_journal(paths, journal)?.run_target(home)?;
        return Ok(());
    }
    if version.is_none() && agent::release_version().is_none() {
        return Err(Error::Invalid("this development build needs an explicit self update --version".into()).into());
    }
    let repository = repository(&paths)?;
    println!("Resolve release");
    let release = Release::resolve(version, repository).await?;
    let previous = upgrade::current_release(&paths)?;
    let current_version = previous
        .as_deref()
        .map(upgrade::managed_release_version)
        .transpose()?
        .unwrap_or_else(|| agent::build_version().to_owned());
    compare_versions(&current_version, &release.version)?;
    if previous.is_some() && same_version(&current_version, &release.version)? {
        println!("Agent {} is already installed", release.version);
        return Ok(());
    }
    if check {
        println!("Agent {} is available (current {})", release.version, current_version);
        return Ok(());
    }

    println!("Download and verify package");
    let staged = upgrade::stage_release(&paths, release).await?;
    Completion {
        paths,
        target_release: staged.path,
        target_version: staged.release.version,
        previous_release: previous,
        repository: staged.release.repository,
    }
    .run_target(home)
    .map_err(Into::into)
}

async fn complete(completion: Completion, home: &ControlPlaneHome) -> CommandResult<()> {
    let Completion {
        paths,
        target_release,
        target_version,
        previous_release,
        repository,
    } = completion;
    let _install_lock = paths.lock().await?;
    validate_target_process(&paths, &target_release, &target_version)?;
    let mut journal = if let Some(journal) =
        UpdateJournal::read(&paths)?.filter(|journal| journal.phase != UpdatePhase::Complete)
    {
        if journal.target_release != target_release
            || journal.target_version != target_version
            || journal.previous_release != previous_release
        {
            return Err(Error::Invalid("arguments do not match the unfinished Agent update".into()).into());
        }
        journal
    } else {
        let mut journal = UpdateJournal::new(previous_release.clone(), target_release.clone(), target_version.clone());
        journal.advance(&paths, UpdatePhase::Prepared)?;
        journal
    };
    let client = Client::for_path(home.socket_path());
    if journal.phase < UpdatePhase::Migrated {
        println!("Check Agent activity");
        match tokio::time::timeout(Duration::from_secs(2), client.health()).await {
            Ok(Ok(info)) => {
                if info.protocol_version.as_deref() != Some(PROTOCOL_VERSION) {
                    return Err(Error::Daemon(preview_stop_instruction().into()).into());
                }
                println!("Stop agentd");
                let warnings = tokio::time::timeout(LIFECYCLE_REQUEST_TIMEOUT, client.shutdown_for_upgrade())
                    .await
                    .map_err(|_| Error::Daemon("timed out waiting for agentd to prepare for upgrade".into()))??;
                for warning in warnings {
                    eprintln!("Warning: {warning}");
                }
            }
            Err(_) => {
                return Err(Error::Daemon(
                    "agentd did not answer its health check; retry the update or stop agentd".into(),
                )
                .into());
            }
            Ok(Err(_)) => {}
        }
    }
    let home_lock = if journal.phase < UpdatePhase::Activated {
        Some(acquire_home_lock(home).await?)
    } else {
        None
    };
    if journal.phase < UpdatePhase::Migrated {
        println!("Migrate Agent state");
        if let Err(error) = agent::persistence::Database::migrate(&home.path().join("agent.db")) {
            drop(home_lock);
            if let Some(previous_release) = &previous_release {
                let _ = start_daemon(previous_release, home);
            }
            return Err(error.into());
        }
        upgrade::create_session_relaunch_marker(home, &target_version)?;
        journal.advance(&paths, UpdatePhase::Migrated)?;
    }

    if journal.phase < UpdatePhase::Activated {
        println!("Activate target package");
        InstallMetadata::new(repository, paths.bin().to_path_buf()).write(&paths)?;
        upgrade::activate_release(&paths, &target_release)?;
        journal.advance(&paths, UpdatePhase::Activated)?;
    }
    drop(home_lock);

    println!("Start and verify target daemon");
    if !target_ready(&client, home, &target_version).await {
        start_daemon(&target_release, home)?;
    }
    verify_target(&client, home, &target_version).await?;
    journal.advance(&paths, UpdatePhase::Complete)?;
    upgrade::prune_releases(&paths, previous_release.as_deref())?;
    println!("Agent updated to {target_version}");
    Ok(())
}

fn validate_target_process(paths: &InstallPaths, target: &Path, version: &str) -> Result<(), Error> {
    if !paths.root().is_absolute() || !target.is_absolute() || target.parent() != Some(paths.releases().as_path()) {
        return Err(Error::Invalid("target updater paths are inconsistent".into()));
    }
    upgrade::validate_release_directory(target, version)?;
    validate_release_process(target, "update completion must run from the target release")
}

fn validate_source_process(source: &Path) -> Result<(), Error> {
    validate_release_process(source, "release publication must run from the source package")
}

fn validate_release_process(release: &Path, mismatch: &str) -> Result<(), Error> {
    let executable = std::fs::canonicalize(std::env::current_exe()?)?;
    let expected = std::fs::canonicalize(release.join(format!("agentctl{}", std::env::consts::EXE_SUFFIX)))?;
    if executable != expected {
        return Err(Error::Invalid(mismatch.into()));
    }
    Ok(())
}

async fn acquire_home_lock(home: &ControlPlaneHome) -> Result<Lock, Error> {
    let deadline = Instant::now() + DAEMON_STOP_TIMEOUT;
    loop {
        match home.acquire_lock() {
            Ok(lock) => return Ok(lock),
            Err(Error::Io(error)) if error.kind() == std::io::ErrorKind::WouldBlock && Instant::now() < deadline => {
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            Err(error) => return Err(error),
        }
    }
}

fn start_daemon(release: &Path, home: &ControlPlaneHome) -> Result<(), Error> {
    let log = home.open_daemon_log()?;
    let mut command = ProcessCommand::new(release.join(format!("agentd{}", std::env::consts::EXE_SUFFIX)));
    command
        .arg("--home")
        .arg(home.path())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(log);
    agent::local::process::configure_detached(&mut command);
    agent::local::process::configure_logging(&mut command);
    command.spawn()?;
    Ok(())
}

async fn verify_target(client: &Client, home: &ControlPlaneHome, target_version: &str) -> Result<(), Error> {
    let deadline = Instant::now() + TARGET_VERIFY_TIMEOUT;
    while Instant::now() < deadline {
        if target_ready(client, home, target_version).await {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    Err(Error::Daemon(format!(
        "target agentd {target_version:?} did not become healthy and finish Session relaunch within {} seconds",
        TARGET_VERIFY_TIMEOUT.as_secs()
    )))
}

async fn target_ready(client: &Client, home: &ControlPlaneHome, target_version: &str) -> bool {
    matches!(
        tokio::time::timeout(Duration::from_secs(1), client.health()).await,
        Ok(Ok(info))
            if info.protocol_version.as_deref() == Some(PROTOCOL_VERSION)
                && info.build_version.as_deref() == Some(target_version)
                && !home.pending_session_relaunch_path().exists()
    )
}

fn compare_versions(current: &str, target: &str) -> Result<(), Error> {
    let current = parse_version(current);
    let target = parse_version(target).map_err(|error| Error::Invalid(format!("invalid target version: {error}")))?;
    if let Ok(ref current) = current
        && target < *current
    {
        return Err(Error::Invalid(format!(
            "downgrading Agent from v{current} to v{target} is not supported"
        )));
    }
    Ok(())
}

fn same_version(current: &str, target: &str) -> Result<bool, Error> {
    let current =
        parse_version(current).map_err(|error| Error::Invalid(format!("invalid current version: {error}")))?;
    let target = parse_version(target).map_err(|error| Error::Invalid(format!("invalid target version: {error}")))?;
    Ok(current == target)
}

fn parse_version(version: &str) -> Result<semver::Version, semver::Error> {
    semver::Version::parse(version.strip_prefix('v').unwrap_or(version))
}

fn repository(paths: &InstallPaths) -> Result<String, Error> {
    match InstallMetadata::read(paths) {
        Ok(metadata) => Ok(metadata.repository().to_owned()),
        Err(Error::Io(error)) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok(std::env::var("AGENT_GITHUB_REPOSITORY").unwrap_or_else(|_| DEFAULT_REPOSITORY.into()))
        }
        Err(error) => Err(error),
    }
}

const fn preview_stop_instruction() -> &'static str {
    if cfg!(windows) {
        "preview 1 agentd cannot stop itself; finish active turns, run `Stop-Process -Name agentd` in PowerShell, and rerun the installer"
    } else {
        "preview 1 agentd cannot stop itself; finish active turns, run `pkill -x agentd`, and rerun the installer"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_comparison_rejects_downgrade() {
        assert!(compare_versions("v2.0.0", "v1.0.0").is_err());
        assert!(same_version("1.0.0", "v1.0.0").expect("version"));
    }

    #[test]
    fn self_help_hides_completion_command() {
        use clap::CommandFactory as _;
        let help = super::super::Arguments::command().render_long_help().to_string();
        assert!(!help.contains("__complete-update"));
        assert!(!help.contains("__publish-release"));
    }
}
