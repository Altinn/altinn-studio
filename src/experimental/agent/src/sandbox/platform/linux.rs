//! Idempotent Agent setup for Linux Sandboxes.

use std::{io::Cursor, path::Path};

use ::sandbox::{LocalFuture, Platform, SandboxHandle, SandboxPath, execution::ExecutionSpec};
use ignore::WalkBuilder;

use crate::{Error, control_plane, harness};

use super::super::PlatformAdapter;

pub(crate) const HOME: &str = "/home/agent";
pub(crate) const WORKING_DIRECTORY: &str = "/home/agent/code";
const HOME_ARCHIVE: &str = "/tmp/agent-home.tar";

/// Agent setup for Linux Sandboxes.
pub struct Linux;

impl PlatformAdapter for Linux {
    fn supports(&self, platform: &Platform) -> bool {
        platform.os == "linux"
    }

    fn setup<'a>(
        &'a self,
        record: &'a control_plane::AgentRecord,
        sandbox: &'a SandboxHandle,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(self.setup(record, sandbox))
    }
}

impl Linux {
    async fn setup(&self, record: &control_plane::AgentRecord, sandbox: &SandboxHandle) -> Result<(), Error> {
        harness::verify_linux(
            record.agent.spec.harness.kind,
            sandbox,
            &record.agent.spec.harness.version,
        )
        .await?;
        run_checked(sandbox, "/usr/bin/install", ["-d", "-m", "0755", WORKING_DIRECTORY]).await?;
        let archive = archive_home(record.source_directory.clone(), record.agent.spec.home.source.clone()).await?;
        sync_home(sandbox, archive).await?;
        let instructions = read_instructions(record).await?;
        harness::bootstrap_linux(record.agent.spec.harness.kind, sandbox, HOME, instructions.as_deref()).await
    }
}

async fn read_instructions(record: &control_plane::AgentRecord) -> Result<Option<Vec<u8>>, Error> {
    let Some(spec) = &record.agent.spec.instructions else {
        return Ok(None);
    };
    let source = if spec.source.is_absolute() {
        spec.source.clone()
    } else {
        record.source_directory.join(&spec.source)
    };
    let metadata = tokio::fs::metadata(&source).await?;
    if !metadata.is_file() {
        return Err(Error::Invalid("spec.instructions.source must identify a file".into()));
    }
    tokio::fs::read(source).await.map(Some).map_err(Error::from)
}

async fn archive_home(manifest_directory: std::path::PathBuf, source: std::path::PathBuf) -> Result<Vec<u8>, Error> {
    tokio::task::spawn_blocking(move || archive_home_blocking(&manifest_directory, &source))
        .await
        .map_err(|error| Error::Daemon(format!("Agent home scan task failed: {error}")))?
}

fn archive_home_blocking(manifest_directory: &Path, source: &Path) -> Result<Vec<u8>, Error> {
    let source = resolve_source(manifest_directory, source)?;
    let mut archive = tar::Builder::new(Vec::new());
    for result in WalkBuilder::new(&source)
        .hidden(false)
        .ignore(false)
        .git_ignore(false)
        .git_exclude(false)
        .parents(false)
        .follow_links(false)
        .build()
    {
        let entry = result.map_err(|error| Error::Invalid(format!("cannot traverse spec.home.source: {error}")))?;
        let relative = entry
            .path()
            .strip_prefix(&source)
            .map_err(|_| Error::Invalid("spec.home.source traversal escaped its root".into()))?;
        if relative.as_os_str().is_empty() {
            continue;
        }
        if entry.file_type().is_some_and(|kind| kind.is_symlink()) {
            return Err(Error::Invalid(format!(
                "spec.home.source contains unsupported symbolic link {}",
                relative.display()
            )));
        }
        if entry.file_type().is_some_and(|kind| kind.is_dir()) {
            archive.append_dir(relative, entry.path())?;
        } else {
            archive.append_path_with_name(entry.path(), relative)?;
        }
    }
    archive.into_inner().map_err(Error::from)
}

async fn sync_home(sandbox: &SandboxHandle, archive: Vec<u8>) -> Result<(), Error> {
    sandbox
        .write_file(&SandboxPath::new(HOME_ARCHIVE), Box::pin(Cursor::new(archive)))
        .await?;
    run_checked(sandbox, "/usr/bin/tar", ["-xf", HOME_ARCHIVE, "-C", HOME]).await
}

async fn run_checked<const N: usize>(sandbox: &SandboxHandle, executable: &str, args: [&str; N]) -> Result<(), Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new(executable),
            args.into_iter().map(str::to_owned),
        ))
        .await?;
    if output.status.success() {
        Ok(())
    } else {
        Err(Error::SandboxSetup(format!(
            "command {executable:?} exited with code {}",
            output.status.code
        )))
    }
}

fn resolve_source(manifest_directory: &Path, source: &Path) -> Result<std::path::PathBuf, Error> {
    let source = if source.is_absolute() {
        source.to_path_buf()
    } else {
        manifest_directory.join(source)
    };
    let source = std::fs::canonicalize(source)?;
    if !source.is_dir() {
        return Err(Error::Invalid("spec.home.source must identify a directory".into()));
    }
    Ok(source)
}
