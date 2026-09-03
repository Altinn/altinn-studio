//! Idempotent Agent setup for Linux Sandboxes.

use std::{io::Cursor, path::Path};

use ::sandbox::{LocalFuture, Platform, SandboxHandle, SandboxPath, execution::ExecutionSpec};
use ignore::WalkBuilder;

use crate::{Error, control_plane, harness};

use super::super::PlatformAdapter;

pub(crate) const HOME: &str = "/home/agent";
pub(crate) const WORKING_DIRECTORY: &str = "/home/agent/code";
pub(crate) const CONTAINER_HOST: &str = "unix:///run/podman/podman.sock";
const HOME_ARCHIVE: &str = "/tmp/agent-home.tar";
const UTF8_LOCALE: &str = "C.UTF-8";
const PORTABLE_TERMINAL: &str = "xterm-256color";
const PODMAN: &str = "/usr/bin/podman";
// Podman reads these files when it creates containers. The default mounts also
// reach Buildah RUN containers and shadow common distro trust paths with the
// guest's superset bundle. This is fail-open convenience; mediated networking
// remains the enforcement boundary if a workload bypasses the configuration.
const PODMAN_CONTAINERS_CONF: &str = "/etc/containers/containers.conf.d/50-agent-ca.conf";
const PODMAN_RUNTIME_CONF: &str = "/etc/containers/containers.conf.d/51-agent-runtime.conf";
const PODMAN_MOUNTS_CONF: &str = "/etc/containers/mounts.conf";
const PODMAN_REGISTRIES_CONF: &str = "/etc/containers/registries.conf.d/50-agent-docker-hub.conf";
const PODMAN_SOCKET_DROP_IN: &str = "/etc/systemd/system/podman.socket.d/50-agent-access.conf";
const PODMAN_CONTAINERS_CONF_CONTENTS: &[u8] = br#"[containers]
env = [
  "SSL_CERT_FILE=/run/agent/tls/ca-bundle.pem",
  "CURL_CA_BUNDLE=/run/agent/tls/ca-bundle.pem",
  "REQUESTS_CA_BUNDLE=/run/agent/tls/ca-bundle.pem",
  "NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem",
  "GIT_SSL_CAINFO=/run/agent/tls/ca-bundle.pem",
  "NPM_CONFIG_CAFILE=/run/agent/tls/ca-bundle.pem",
]
"#;
// The minimal systemd guest has no D-Bus system bus. Podman's default systemd
// cgroup manager therefore made crun fail with `cannot open sd-bus`; cgroupfs
// keeps ownership inside Podman instead of relying on unavailable systemd APIs.
// Sandbox teardown owns final cleanup, rather than systemd tracking these
// container cgroups as units.
// The compatibility API must apply Docker's implicit docker.io resolution as
// well; it does not consult registries.conf for that behavior.
const PODMAN_RUNTIME_CONF_CONTENTS: &[u8] =
    b"[engine]\ncgroup_manager = \"cgroupfs\"\ncompat_api_enforce_docker_hub = true\n";
const PODMAN_MOUNTS_CONF_CONTENTS: &[u8] = br"/etc/ssl/certs/ca-certificates.crt:/run/agent/tls/ca-bundle.pem
/etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt
/etc/ssl/certs/ca-certificates.crt:/etc/pki/tls/certs/ca-bundle.crt
/etc/ssl/certs/ca-certificates.crt:/etc/ssl/cert.pem
";
// One search registry is deterministic in enforcing mode and reproduces
// Docker's implicit docker.io[/library] normalization without alias upkeep.
const PODMAN_REGISTRIES_CONF_CONTENTS: &[u8] =
    b"unqualified-search-registries = [\"docker.io\"]\nshort-name-mode = \"enforcing\"\n";
const PODMAN_SOCKET_DROP_IN_CONTENTS: &[u8] = b"[Socket]\nDirectoryMode=0755\nSocketGroup=agent\nSocketMode=0660\n";

/// Agent setup for Linux Sandboxes.
pub struct Linux;

pub(super) fn execution_spec(command: &[String], terminal: bool) -> Result<ExecutionSpec, Error> {
    let (executable, arguments) = command
        .split_first()
        .ok_or_else(|| Error::Invalid("command is required".into()))?;
    let mut environment = vec![
        ("HOME".into(), HOME.into()),
        ("LANG".into(), UTF8_LOCALE.into()),
        ("CONTAINER_HOST".into(), CONTAINER_HOST.into()),
    ];
    if terminal {
        // Host-specific TERM names are not necessarily installed in the guest.
        environment.push(("TERM".into(), PORTABLE_TERMINAL.into()));
    }
    Ok(
        ExecutionSpec::command(SandboxPath::new(executable), arguments.iter().cloned())
            .with_working_directory(SandboxPath::new(WORKING_DIRECTORY))
            .with_environment(environment),
    )
}

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
        for installation in &record.agent.spec.harnesses {
            harness::verify_linux(installation.kind, sandbox, installation.version.as_deref()).await?;
        }
        run_checked(sandbox, "/usr/bin/install", ["-d", "-m", "0755", WORKING_DIRECTORY]).await?;
        configure_podman(sandbox).await?;
        let archive = archive_home(record.source_directory.clone(), record.agent.spec.home.source.clone()).await?;
        sync_home(sandbox, archive).await?;
        let instructions = read_instructions(record).await?;
        for installation in &record.agent.spec.harnesses {
            harness::bootstrap_linux(installation.kind, sandbox, HOME, instructions.as_deref()).await?;
        }
        Ok(())
    }
}

async fn configure_podman(sandbox: &SandboxHandle) -> Result<(), Error> {
    let present = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/test"),
            ["-x".into(), PODMAN.into()],
        ))
        .await?;
    match present.status.code {
        1 => return Ok(()),
        0 => {}
        code => {
            return Err(Error::SandboxSetup(format!(
                "Podman presence check exited with code {code}"
            )));
        }
    }

    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "-n",
            "/usr/bin/install",
            "-d",
            "-m",
            "0755",
            "/etc/containers/containers.conf.d",
            "/etc/containers/registries.conf.d",
            "/etc/systemd/system/podman.socket.d",
        ],
    )
    .await?;
    write_file(sandbox, PODMAN_CONTAINERS_CONF, PODMAN_CONTAINERS_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_RUNTIME_CONF, PODMAN_RUNTIME_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_MOUNTS_CONF, PODMAN_MOUNTS_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_REGISTRIES_CONF, PODMAN_REGISTRIES_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_SOCKET_DROP_IN, PODMAN_SOCKET_DROP_IN_CONTENTS).await?;
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/usr/bin/install", "-d", "-m", "0755", "/run/podman"],
    )
    .await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/usr/bin/systemctl", "daemon-reload"]).await?;
    // An already-listening socket retains its old mode until the next Sandbox
    // boot; the compile-time drop-in is not changed independently at runtime.
    run_checked(
        sandbox,
        "/usr/bin/sudo",
        ["-n", "/usr/bin/systemctl", "enable", "--now", "podman.socket"],
    )
    .await
}

async fn write_file(sandbox: &SandboxHandle, path: &str, contents: &[u8]) -> Result<(), Error> {
    sandbox
        .write_file(&SandboxPath::new(path), Box::pin(Cursor::new(contents.to_vec())))
        .await
        .map_err(Error::from)
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

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use ::sandbox::execution::Program;

    #[test]
    fn transient_execution_uses_agent_home_and_portable_terminal() {
        let command = ["bash".to_owned(), "-l".to_owned()];
        let spec = super::execution_spec(&command, true).expect("Linux Execution spec");
        assert_eq!(
            spec.working_directory().map(::sandbox::SandboxPath::as_str),
            Some("/home/agent/code")
        );
        assert_eq!(spec.environment().get("HOME").map(String::as_str), Some("/home/agent"));
        assert_eq!(spec.environment().get("LANG").map(String::as_str), Some("C.UTF-8"));
        assert_eq!(
            spec.environment().get("CONTAINER_HOST").map(String::as_str),
            Some("unix:///run/podman/podman.sock")
        );
        assert_eq!(
            spec.environment().get("TERM").map(String::as_str),
            Some("xterm-256color")
        );
        assert!(matches!(
            spec.program(),
            Program::Command { executable, args }
                if executable.as_str() == "bash" && args == &["-l"]
        ));
    }
}
