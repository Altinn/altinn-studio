//! Linux tmux Session runtime and terminal capability.
//!
//! Tmux is the M0 Unix Sandbox implementation detail behind Sessions: it owns
//! the harness PTY, retained terminal state, scrollback and client
//! attachment. Nothing tmux-native is persisted; the tmux session name is
//! derived from the platform `SessionId`.

use ::sandbox::{
    SandboxHandle, SandboxPath,
    execution::{ExecutionSpec, ExitStatus},
    terminal::{AttachTerminalRequest, TerminalAttachOutcome},
};

use crate::{Error, control_plane::AgentRecord, harness};

use super::{AttachTarget, LaunchToken, Session, State};

/// Guest-observed tmux state. The idle age is calculated against the guest's
/// clock so host/microVM clock skew cannot make an active Session look idle.
pub(super) enum Observation {
    Missing,
    Alive { attached: bool, idle_seconds: u64 },
}

fn session_name(session: &Session) -> String {
    format!("agent-session-{}", session.id)
}

fn exact_target(session: &Session) -> String {
    format!("={}", session_name(session))
}

/// Observes attachment and activity for the Session's tmux runtime.
pub(super) async fn observe(session: &Session, sandbox: &SandboxHandle) -> Result<Observation, Error> {
    const SCRIPT: &str = "values=$(/usr/bin/tmux list-sessions -F '#{session_attached} #{session_activity}' -f \"#{==:#{session_name},$1}\")\n\
        status=$?\n\
        case $status in 0) ;; 1) exit 10 ;; *) exit 11 ;; esac\n\
        set -- $values\n\
        [ \"$#\" -eq 0 ] && exit 10\n\
        [ \"$#\" -eq 2 ] || exit 11\n\
        now=$(/usr/bin/date +%s) || exit 11\n\
        age=$((now - $2))\n\
        [ \"$age\" -ge 0 ] || age=0\n\
        printf '%s %s\\n' \"$1\" \"$age\"";
    let inspected = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/bin/sh"),
            [
                "-c".into(),
                SCRIPT.into(),
                "agent-session-observe".into(),
                session_name(session),
            ],
        ))
        .await?;
    classify_observation(inspected.status, &inspected.stdout)
}

fn classify_observation(status: ExitStatus, stdout: &[u8]) -> Result<Observation, Error> {
    if status.code == 10 {
        return Ok(Observation::Missing);
    }
    if !status.success() {
        return Err(Error::Session(format!(
            "tmux observation failed with exit code {}",
            status.code
        )));
    }
    let output = std::str::from_utf8(stdout)
        .map_err(|error| Error::Session(format!("tmux returned non-UTF-8 observation: {error}")))?;
    parse_observation(output)
}

fn parse_observation(output: &str) -> Result<Observation, Error> {
    let mut fields = output.split_ascii_whitespace();
    let attached = fields
        .next()
        .ok_or_else(|| Error::Session("tmux returned an empty observation".into()))?;
    let idle_seconds = fields
        .next()
        .ok_or_else(|| Error::Session("tmux omitted its activity age".into()))?
        .parse::<u64>()
        .map_err(|error| Error::Session(format!("tmux returned an invalid activity age: {error}")))?;
    if fields.next().is_some() || !matches!(attached, "0" | "1") {
        return Err(Error::Session("tmux returned an invalid observation".into()));
    }
    Ok(Observation::Alive {
        attached: attached == "1",
        idle_seconds,
    })
}

/// Stops a deliberately idle tmux Session.
pub(super) async fn stop(session: &Session, sandbox: &SandboxHandle) -> Result<(), Error> {
    let stopped = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/usr/bin/tmux"),
            ["kill-session".into(), "-t".into(), exact_target(session)],
        ))
        .await?;
    if stopped.status.success() {
        Ok(())
    } else {
        Err(Error::Session(format!(
            "tmux failed to stop idle Session {} with exit code {}",
            session.id, stopped.status.code
        )))
    }
}

/// Creates the named detached tmux session running the harness.
///
/// Per-launch values travel as tmux session environment (`-e`) rather than
/// becoming defaults for subsequently created sessions. Sessions share one
/// Unix identity and tmux server, so this is not a security boundary between
/// sibling Sessions; the token only rejects stale or accidental reports.
pub(super) async fn create(
    agent: &AgentRecord,
    session: &Session,
    sandbox: &SandboxHandle,
    session_hook_url: &str,
    token: &LaunchToken,
    resume: Option<&str>,
) -> Result<(), Error> {
    let launch = harness::launch_linux(agent.agent.spec.harness.kind, crate::sandbox::platform::HOME, resume);
    let mut arguments = vec!["new-session".into(), "-d".into(), "-s".into(), session_name(session)];
    let session_environment = launch.environment.iter().cloned().chain([
        ("AGENT_SESSION_ID".into(), session.id.to_string()),
        ("AGENT_SESSION_TOKEN".into(), token.expose()),
        ("AGENT_SESSION_HOOK_URL".into(), session_hook_url.into()),
    ]);
    for (name, value) in session_environment {
        arguments.push("-e".into());
        arguments.push(format!("{name}={value}"));
    }
    arguments.push(launch.command);
    let created = sandbox
        .run_execution(
            ExecutionSpec::command(SandboxPath::new("/usr/bin/tmux"), arguments)
                .with_working_directory(SandboxPath::new(crate::sandbox::platform::WORKING_DIRECTORY))
                .with_environment(std::iter::once(("HOME".into(), crate::sandbox::platform::HOME.into()))),
        )
        .await?;
    if created.status.success() {
        return Ok(());
    }
    // Concurrent creation is excluded by per-Session serialization, but an
    // "already exists" result from a raced earlier pass still converges.
    if matches!(observe(session, sandbox).await?, Observation::Alive { .. }) {
        return Ok(());
    }
    Err(Error::Session(format!(
        "tmux failed to create Session {} with exit code {}",
        session.id, created.status.code
    )))
}

/// Attaches a local terminal to an existing tmux-backed Session.
///
/// This client capability is separate from daemon-owned lifecycle
/// convergence. It never creates or resumes a Session.
///
/// # Errors
///
/// Returns an error unless the Session is ready and the Sandbox Provider
/// supports direct terminal attachment.
pub(super) async fn attach(home: &std::path::Path, target: &AttachTarget) -> Result<(), Error> {
    if target.session.status.state != State::Running {
        return Err(Error::Invalid(format!("Session {} is not ready", target.session.id)));
    }
    let spec = ExecutionSpec::command(
        SandboxPath::new("/usr/bin/tmux"),
        ["attach-session".into(), "-t".into(), exact_target(&target.session)],
    );
    match crate::sandbox::attach_terminal(home, &target.sandbox, AttachTerminalRequest::new(spec)).await? {
        TerminalAttachOutcome::Exited(status) if status.success() => Ok(()),
        TerminalAttachOutcome::Detached => Ok(()),
        TerminalAttachOutcome::Exited(status) => Err(Error::Session(format!(
            "tmux attachment exited with code {}",
            status.code
        ))),
        _ => Err(Error::Session(
            "terminal attachment returned an unsupported outcome".into(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use sandbox::execution::ExitStatus;

    use super::Observation;

    #[test]
    fn parses_guest_calculated_idle_age() {
        let Observation::Alive { attached, idle_seconds } =
            super::parse_observation("0 301\n").expect("valid observation")
        else {
            panic!("expected a live Session");
        };
        assert!(!attached);
        assert_eq!(idle_seconds, 301);
    }

    #[test]
    fn distinguishes_a_missing_session_from_an_observation_failure() {
        assert!(matches!(
            super::classify_observation(ExitStatus { code: 10 }, &[]).expect("missing observation"),
            Observation::Missing
        ));

        let Err(error) = super::classify_observation(ExitStatus { code: 2 }, &[]) else {
            panic!("tmux failure must not look like a missing Session");
        };
        assert!(error.to_string().contains("exit code 2"));
    }
}
