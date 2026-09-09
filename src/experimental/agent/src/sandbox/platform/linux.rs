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
const SETUP_STDERR_LINES: usize = 3;
const SYSTEMD_READY_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(90);
const SYSTEMD_READY_POLL: std::time::Duration = std::time::Duration::from_secs(1);
// Podman reads these files when it creates containers. The default mount also
// reaches Buildah RUN containers and exposes the guest's superset bundle at a
// path no distro package owns. Distro trust paths are populated by an OCI hook
// that copies the bundle into the container root filesystem: a bind mount
// there would make the file a mount point, and package managers replacing the
// bundle (`apt-get install ca-certificates`) then fail with EBUSY. The hook
// also drops the mediator CA as an anchor into the distro's source directory
// so a regenerated bundle keeps trusting mediation. This is fail-open
// convenience; mediated networking remains the enforcement boundary if a
// workload bypasses the configuration.
const PODMAN_CONTAINERS_CONF: &str = "/etc/containers/containers.conf.d/50-agent-ca.conf";
const PODMAN_RUNTIME_CONF: &str = "/etc/containers/containers.conf.d/51-agent-runtime.conf";
const PODMAN_MOUNTS_CONF: &str = "/etc/containers/mounts.conf";
const PODMAN_REGISTRIES_CONF: &str = "/etc/containers/registries.conf.d/50-agent-docker-hub.conf";
const PODMAN_SOCKET_DROP_IN: &str = "/etc/systemd/system/podman.socket.d/50-agent-access.conf";
const PODMAN_HOOKS_DIR: &str = "/etc/containers/oci/hooks.d";
const PODMAN_CA_HOOK_CONF: &str = "/etc/containers/oci/hooks.d/50-agent-ca.json";
const PODMAN_CA_HOOK: &str = "/usr/local/libexec/agent-container-ca";
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
// Implicit hook directories are deprecated, so the directory is named explicitly.
const PODMAN_RUNTIME_CONF_CONTENTS: &[u8] = b"[engine]\ncgroup_manager = \"cgroupfs\"\ncompat_api_enforce_docker_hub = true\nhooks_dir = [\"/etc/containers/oci/hooks.d\"]\n";
const PODMAN_MOUNTS_CONF_CONTENTS: &[u8] = b"/etc/ssl/certs/ca-certificates.crt:/run/agent/tls/ca-bundle.pem\n";
const PODMAN_CA_HOOK_CONF_CONTENTS: &[u8] = br#"{"version":"1.0.0","hook":{"path":"/usr/local/libexec/agent-container-ca"},"when":{"always":true},"stages":["createRuntime"]}
"#;
// Runs as an OCI `createRuntime` hook with the container state on stdin and
// the root filesystem mounted. It must not depend on tools the guest image may
// lack, so it is POSIX sh plus sed. Failures are swallowed: trust wiring is a
// convenience and must never stop a container from starting.
const PODMAN_CA_HOOK_CONTENTS: &[u8] = br#"#!/bin/sh
# Installed by agentd. Copies the mediated CA bundle into distro trust paths of a
# starting container and adds the mediator CA as an anchor for bundle regeneration.
set -u
bundle_dir=$(cat | tr -d '\n' | sed -n 's/.*"bundle"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$bundle_dir" ] && [ -f "$bundle_dir/config.json" ] || exit 0
rootfs=$(tr -d '\n' <"$bundle_dir/config.json" \
    | sed -n 's/.*"root"[[:space:]]*:[[:space:]]*{[^}]*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$rootfs" ] || exit 0
case "$rootfs" in /*) ;; *) rootfs="$bundle_dir/$rootfs" ;; esac
[ -d "$rootfs" ] || exit 0
bundle=/etc/ssl/certs/ca-certificates.crt
anchor=/.msb/tls/ca.pem
[ -f "$bundle" ] || exit 0
install_copy() {
    rm -f "$2" 2>/dev/null
    cp "$1" "$2" 2>/dev/null && chmod 0644 "$2" 2>/dev/null
}
for target in etc/ssl/certs/ca-certificates.crt etc/pki/tls/certs/ca-bundle.crt etc/ssl/cert.pem; do
    directory="$rootfs/${target%/*}"
    [ -d "$directory" ] || continue
    if [ "$target" = etc/ssl/certs/ca-certificates.crt ] || [ -e "$rootfs/$target" ] || [ -L "$rootfs/$target" ]; then
        install_copy "$bundle" "$rootfs/$target"
    fi
done
if [ -f "$anchor" ]; then
    if [ -d "$rootfs/usr/local/share" ]; then
        mkdir -p "$rootfs/usr/local/share/ca-certificates" 2>/dev/null \
            && install_copy "$anchor" "$rootfs/usr/local/share/ca-certificates/agent-mediator.crt"
    fi
    if [ -d "$rootfs/etc/pki/ca-trust/source/anchors" ]; then
        install_copy "$anchor" "$rootfs/etc/pki/ca-trust/source/anchors/agent-mediator.crt"
    fi
fi
exit 0
"#;
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
        let skills = read_skills(record).await?;
        for installation in &record.agent.spec.harnesses {
            harness::bootstrap_linux(installation.kind, sandbox, HOME, instructions.as_deref(), &skills).await?;
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

    wait_for_systemd(sandbox).await?;
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
            PODMAN_HOOKS_DIR,
            "/usr/local/libexec",
        ],
    )
    .await?;
    write_file(sandbox, PODMAN_CONTAINERS_CONF, PODMAN_CONTAINERS_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_RUNTIME_CONF, PODMAN_RUNTIME_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_MOUNTS_CONF, PODMAN_MOUNTS_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_REGISTRIES_CONF, PODMAN_REGISTRIES_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_SOCKET_DROP_IN, PODMAN_SOCKET_DROP_IN_CONTENTS).await?;
    write_file(sandbox, PODMAN_CA_HOOK_CONF, PODMAN_CA_HOOK_CONF_CONTENTS).await?;
    write_file(sandbox, PODMAN_CA_HOOK, PODMAN_CA_HOOK_CONTENTS).await?;
    run_checked(sandbox, "/usr/bin/sudo", ["-n", "/bin/chmod", "0755", PODMAN_CA_HOOK]).await?;
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

/// Waits until systemd is PID 1 and has finished booting the guest.
///
/// Sandbox setup starts as soon as the Sandbox accepts Executions, which on an
/// image-init guest is before the image entrypoint has become systemd; `systemctl`
/// then reports "System has not been booted with systemd". `is-system-running
/// --wait` blocks until startup finishes once systemd is up. It runs as root
/// because the guest has no D-Bus system bus and only root reaches systemd's
/// private socket. A `degraded` system counts as ready: a failed optional unit,
/// such as a best-effort workspace clone, must not block the Podman configuration.
async fn wait_for_systemd(sandbox: &SandboxHandle) -> Result<(), Error> {
    let deadline = tokio::time::Instant::now() + SYSTEMD_READY_TIMEOUT;
    loop {
        // `--wait` blocks for as long as boot takes, so the deadline bounds the wait itself
        // and a still-running check is killed rather than left behind in the guest.
        let started = sandbox
            .start_execution(::sandbox::execution::StartExecutionRequest::new(
                ExecutionSpec::command(
                    SandboxPath::new("/usr/bin/sudo"),
                    ["-n", "/usr/bin/systemctl", "is-system-running", "--wait"].map(str::to_owned),
                ),
            ))
            .await?;
        let execution_id = started.id.clone();
        let output = match tokio::time::timeout_at(deadline, started.collect()).await {
            Ok(output) => output?,
            Err(_elapsed) => {
                let _ = sandbox.kill_execution(&execution_id).await;
                return Err(Error::SandboxSetup(format!(
                    "systemd did not finish booting within {}s",
                    SYSTEMD_READY_TIMEOUT.as_secs()
                )));
            }
        };
        let state = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        if output.status.success() || matches!(state.as_str(), "running" | "degraded") {
            return Ok(());
        }
        if tokio::time::Instant::now() >= deadline {
            let last = if state.is_empty() {
                String::from_utf8_lossy(&output.stderr).trim().to_owned()
            } else {
                state
            };
            return Err(Error::SandboxSetup(format!(
                "systemd did not become ready within {}s: {last}",
                SYSTEMD_READY_TIMEOUT.as_secs()
            )));
        }
        tokio::time::sleep(SYSTEMD_READY_POLL).await;
    }
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

async fn read_skills(record: &control_plane::AgentRecord) -> Result<Vec<harness::Skill>, Error> {
    let mut skills = Vec::with_capacity(record.agent.spec.skills.len());
    for (index, spec) in record.agent.spec.skills.iter().enumerate() {
        let field = format!("spec.skills[{index}].source");
        let name = spec
            .name()
            .ok_or_else(|| Error::Invalid(format!("{field} must end in the skill's directory name")))?;
        let source = resolve_source(&record.source_directory, &spec.source, &field)?;
        if !source.join("SKILL.md").is_file() {
            return Err(Error::Invalid(format!("{field} must contain SKILL.md")));
        }
        let files = tokio::task::spawn_blocking(move || read_skill_files(&source, &field))
            .await
            .map_err(|error| Error::Daemon(format!("Agent skill scan task failed: {error}")))??;
        skills.push(harness::Skill {
            name: name.to_owned(),
            files,
        });
    }
    Ok(skills)
}

fn read_skill_files(source: &Path, field: &str) -> Result<Vec<harness::SkillFile>, Error> {
    let mut files = Vec::new();
    walk_source(source, field, |relative, path, is_dir| {
        if is_dir {
            return Ok(());
        }
        let relative_path = relative
            .components()
            .map(|component| component.as_os_str().to_str())
            .collect::<Option<Vec<_>>>()
            .ok_or_else(|| Error::Invalid(format!("{field} contains a non-UTF-8 file name")))?
            .join("/");
        files.push(harness::SkillFile {
            relative_path,
            contents: std::fs::read(path)?,
        });
        Ok(())
    })?;
    Ok(files)
}

async fn archive_home(manifest_directory: std::path::PathBuf, source: std::path::PathBuf) -> Result<Vec<u8>, Error> {
    let source = resolve_source(&manifest_directory, &source, "spec.home.source")?;
    archive_directory(source, "spec.home.source".to_owned()).await
}

/// Archives a resolved host directory on a blocking thread; `field` names the manifest field in errors.
async fn archive_directory(source: std::path::PathBuf, field: String) -> Result<Vec<u8>, Error> {
    let task = format!("Agent {field} scan task failed");
    tokio::task::spawn_blocking(move || archive_directory_blocking(&source, &field))
        .await
        .map_err(|error| Error::Daemon(format!("{task}: {error}")))?
}

fn archive_directory_blocking(source: &Path, field: &str) -> Result<Vec<u8>, Error> {
    let mut archive = tar::Builder::new(Vec::new());
    walk_source(source, field, |relative, path, is_dir| {
        if is_dir {
            archive.append_dir(relative, path)?;
        } else {
            archive.append_path_with_name(path, relative)?;
        }
        Ok(())
    })?;
    archive.into_inner().map_err(Error::from)
}

/// Visits every entry below `source` with its relative path, rejecting symbolic links.
fn walk_source(
    source: &Path,
    field: &str,
    mut visit: impl FnMut(&Path, &Path, bool) -> Result<(), Error>,
) -> Result<(), Error> {
    for result in WalkBuilder::new(source)
        .hidden(false)
        .ignore(false)
        .git_ignore(false)
        .git_exclude(false)
        .parents(false)
        .follow_links(false)
        .build()
    {
        let entry = result.map_err(|error| Error::Invalid(format!("cannot traverse {field}: {error}")))?;
        let relative = entry
            .path()
            .strip_prefix(source)
            .map_err(|_| Error::Invalid(format!("{field} traversal escaped its root")))?;
        if relative.as_os_str().is_empty() {
            continue;
        }
        if entry.file_type().is_some_and(|kind| kind.is_symlink()) {
            return Err(Error::Invalid(format!(
                "{field} contains unsupported symbolic link {}",
                relative.display()
            )));
        }
        visit(
            relative,
            entry.path(),
            entry.file_type().is_some_and(|kind| kind.is_dir()),
        )?;
    }
    Ok(())
}

async fn sync_home(sandbox: &SandboxHandle, archive: Vec<u8>) -> Result<(), Error> {
    sandbox
        .write_file(&SandboxPath::new(HOME_ARCHIVE), Box::pin(Cursor::new(archive)))
        .await?;
    run_checked(sandbox, "/usr/bin/tar", ["-xf", HOME_ARCHIVE, "-C", HOME]).await
}

/// Runs one setup command in the Sandbox and fails with what it ran and what it printed.
///
/// # Errors
///
/// Returns an error when the Execution cannot start or exits unsuccessfully.
pub(crate) async fn run_checked<const N: usize>(
    sandbox: &SandboxHandle,
    executable: &str,
    args: [&str; N],
) -> Result<(), Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new(executable),
            args.into_iter().map(str::to_owned),
        ))
        .await?;
    if output.status.success() {
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stderr = stderr.trim();
    let detail = if stderr.is_empty() {
        String::new()
    } else {
        let tail = stderr
            .lines()
            .rev()
            .take(SETUP_STDERR_LINES)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect::<Vec<_>>()
            .join(" | ");
        format!(": {tail}")
    };
    Err(Error::SandboxSetup(format!(
        "command `{executable} {}` exited with code {}{detail}",
        args.join(" "),
        output.status.code
    )))
}

fn resolve_source(manifest_directory: &Path, source: &Path, field: &str) -> Result<std::path::PathBuf, Error> {
    let source = if source.is_absolute() {
        source.to_path_buf()
    } else {
        manifest_directory.join(source)
    };
    let source = std::fs::canonicalize(source)?;
    if !source.is_dir() {
        return Err(Error::Invalid(format!("{field} must identify a directory")));
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
