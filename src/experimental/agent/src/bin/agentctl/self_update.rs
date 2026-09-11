use std::{
    path::{Path, PathBuf},
    process::{Command as ProcessCommand, Stdio},
    time::{Duration, Instant},
};

use agent::{
    Error,
    control_api::{Client, PROTOCOL_VERSION},
    local::home::{ControlPlaneHome, Lock},
    upgrade::{self, InstallMetadata, InstallPaths, Release, StagedRelease, UpdateJournal, UpdatePhase},
};

use super::CommandResult;

const DEFAULT_REPOSITORY: &str = "Altinn/altinn-studio";
const DAEMON_STOP_TIMEOUT: Duration = Duration::from_secs(10);
const TARGET_VERIFY_TIMEOUT: Duration = Duration::from_secs(75);

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
                InstallPaths::new(install_root, bin_directory)?,
                home,
                target_release,
                target_version,
                previous_release,
                repository,
            )
            .await
        }
    }
}

pub(super) fn resume_pending_before_command(home: &ControlPlaneHome) -> CommandResult<()> {
    let paths = InstallPaths::resolve()?;
    let Some(journal) = UpdateJournal::read(&paths)?.filter(|journal| journal.phase != UpdatePhase::Complete) else {
        return Ok(());
    };
    let target_version = journal.target_version.clone();
    run_target_completion(&paths, home, &journal)?;
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
        return resume_in_process(&paths, home, journal).await;
    }
    let repository = repository(&paths);
    println!("Resolve release");
    let release = Release::resolve(version, repository).await?;
    compare_versions(agent::build_version(), &release.version, version.is_some())?;
    let previous = upgrade::current_release(&paths)?;
    if previous.is_some() && same_version(agent::build_version(), &release.version)? {
        println!("Agent {} is already installed", release.version);
        return Ok(());
    }
    if check {
        println!(
            "Agent {} is available (current {})",
            release.version,
            agent::build_version()
        );
        return Ok(());
    }

    println!("Download and verify package");
    let staged = upgrade::stage_release(&paths, release).await?;
    handoff(&paths, home, &staged, previous)
}

fn handoff(
    paths: &InstallPaths,
    home: &ControlPlaneHome,
    staged: &StagedRelease,
    previous: Option<PathBuf>,
) -> CommandResult<()> {
    let executable = staged.path.join(format!("agentctl{}", std::env::consts::EXE_SUFFIX));
    let mut command = ProcessCommand::new(executable);
    command
        .arg("--home")
        .arg(home.path())
        .args(["self", "__complete-update", "--install-root"])
        .arg(paths.root())
        .arg("--bin-directory")
        .arg(paths.bin())
        .arg("--agent-home")
        .arg(home.path())
        .arg("--target-release")
        .arg(&staged.path)
        .arg("--target-version")
        .arg(&staged.release.version)
        .arg("--repository")
        .arg(&staged.release.repository);
    if let Some(previous) = previous {
        command.arg("--previous-release").arg(previous);
    }
    let status = command.status().map_err(Error::from)?;
    if !status.success() {
        return Err(Error::Daemon(format!("target updater exited with {status}")).into());
    }
    Ok(())
}

async fn resume_in_process(paths: &InstallPaths, home: &ControlPlaneHome, journal: UpdateJournal) -> CommandResult<()> {
    let repository = repository(paths);
    complete(
        paths.clone(),
        home,
        journal.target_release,
        journal.target_version,
        journal.previous_release,
        repository,
    )
    .await
}

fn run_target_completion(paths: &InstallPaths, home: &ControlPlaneHome, journal: &UpdateJournal) -> Result<(), Error> {
    let repository = repository(paths);
    let mut command = ProcessCommand::new(
        journal
            .target_release
            .join(format!("agentctl{}", std::env::consts::EXE_SUFFIX)),
    );
    command
        .arg("--home")
        .arg(home.path())
        .args(["self", "__complete-update", "--install-root"])
        .arg(paths.root())
        .arg("--bin-directory")
        .arg(paths.bin())
        .arg("--agent-home")
        .arg(home.path())
        .arg("--target-release")
        .arg(&journal.target_release)
        .arg("--target-version")
        .arg(&journal.target_version)
        .arg("--repository")
        .arg(repository);
    if let Some(previous) = &journal.previous_release {
        command.arg("--previous-release").arg(previous);
    }
    let status = command.status()?;
    if !status.success() {
        return Err(Error::Daemon(format!("target updater exited with {status}")));
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn complete(
    paths: InstallPaths,
    home: &ControlPlaneHome,
    target_release: PathBuf,
    target_version: String,
    previous_release: Option<PathBuf>,
    repository: String,
) -> CommandResult<()> {
    validate_target_process(&paths, &target_release, &target_version)?;
    let _install_lock = paths.lock()?;
    let mut journal = if let Some(journal) = UpdateJournal::read(&paths)? {
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
    if journal.phase == UpdatePhase::Complete {
        return Ok(());
    }

    let client = Client::for_path(home.socket_path());
    let mut stopped_daemon = false;
    if journal.phase < UpdatePhase::DaemonStopped {
        println!("Check Agent activity");
        if let Ok(info) = client.health().await {
            if info.protocol_version.as_deref() != Some(PROTOCOL_VERSION) {
                return Err(Error::Daemon(
                    "preview 1 agentd cannot stop itself; finish active turns, stop agentd, and rerun the installer"
                        .into(),
                )
                .into());
            }
            println!("Stop agentd");
            client.shutdown_for_upgrade().await?;
            stopped_daemon = true;
        }
        journal.advance(&paths, UpdatePhase::DaemonStopped)?;
    }

    let home_lock = acquire_home_lock(home).await?;
    if journal.phase < UpdatePhase::Migrated {
        println!("Migrate Agent state");
        if let Err(error) = agent::persistence::Database::migrate(&home.path().join("agent.db")) {
            drop(home_lock);
            if stopped_daemon || previous_release.is_some() {
                let _ = start_daemon(previous_release.as_deref().unwrap_or(&target_release), home);
            }
            return Err(error.into());
        }
        upgrade::create_session_relaunch_marker(home, &target_version)?;
        journal.advance(&paths, UpdatePhase::Migrated)?;
    }

    if journal.phase < UpdatePhase::Activated {
        println!("Activate target package");
        upgrade::activate_release(&paths, &target_release)?;
        InstallMetadata::new(repository, paths.bin().to_path_buf()).write(&paths)?;
        journal.advance(&paths, UpdatePhase::Activated)?;
    }
    drop(home_lock);

    if journal.phase < UpdatePhase::Verified {
        println!("Start and verify target daemon");
        start_daemon(&target_release, home)?;
        verify_target(&client, home, &target_version).await?;
        journal.advance(&paths, UpdatePhase::Verified)?;
    }
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
    let executable = std::fs::canonicalize(std::env::current_exe()?)?;
    let expected = std::fs::canonicalize(target.join(format!("agentctl{}", std::env::consts::EXE_SUFFIX)))?;
    if executable != expected {
        return Err(Error::Invalid(
            "update completion must run from the target release".into(),
        ));
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
        if let Ok(info) = client.health().await
            && info.protocol_version.as_deref() == Some(PROTOCOL_VERSION)
            && info.build_version.as_deref() == Some(target_version)
            && !home.pending_session_relaunch_path().exists()
        {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    Err(Error::Daemon(format!(
        "target agentd {target_version:?} did not become healthy and finish Session relaunch within {} seconds",
        TARGET_VERIFY_TIMEOUT.as_secs()
    )))
}

fn compare_versions(current: &str, target: &str, explicit: bool) -> Result<(), Error> {
    let current = semver::Version::parse(current.strip_prefix('v').unwrap_or(current));
    let target = semver::Version::parse(target.strip_prefix('v').unwrap_or(target))
        .map_err(|error| Error::Invalid(format!("invalid target version: {error}")))?;
    if let Ok(ref current) = current
        && target < *current
    {
        return Err(Error::Invalid(format!(
            "downgrading Agent from v{current} to v{target} is not supported"
        )));
    }
    if current.is_err() && !explicit {
        return Err(Error::Invalid(
            "this development build needs an explicit self update --version".into(),
        ));
    }
    Ok(())
}

fn same_version(current: &str, target: &str) -> Result<bool, Error> {
    let current = semver::Version::parse(current.strip_prefix('v').unwrap_or(current))
        .map_err(|error| Error::Invalid(format!("invalid current version: {error}")))?;
    let target = semver::Version::parse(target.strip_prefix('v').unwrap_or(target))
        .map_err(|error| Error::Invalid(format!("invalid target version: {error}")))?;
    Ok(current == target)
}

fn repository(paths: &InstallPaths) -> String {
    InstallMetadata::read(paths).map_or_else(
        |_| std::env::var("AGENT_GITHUB_REPOSITORY").unwrap_or_else(|_| DEFAULT_REPOSITORY.into()),
        |metadata| metadata.repository().to_owned(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_comparison_rejects_downgrade() {
        assert!(compare_versions("v2.0.0", "v1.0.0", true).is_err());
        assert!(same_version("1.0.0", "v1.0.0").expect("version"));
    }

    #[test]
    fn self_help_hides_completion_command() {
        use clap::CommandFactory as _;
        let help = super::super::Arguments::command().render_long_help().to_string();
        assert!(!help.contains("__complete-update"));
    }
}
