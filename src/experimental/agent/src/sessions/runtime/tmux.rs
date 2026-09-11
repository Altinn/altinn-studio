//! Linux tmux Session runtime and terminal capability.
//!
//! Tmux is the M0 Unix Sandbox implementation detail behind Sessions: it owns
//! the harness PTY, retained terminal state, scrollback and client
//! attachment. Nothing tmux-native is persisted; the tmux session name is
//! derived from the platform `SessionId`. The conversation record is the
//! harness's own transcript file, located by the path the harness reported.

use ::sandbox::{
    SandboxHandle, SandboxPath,
    execution::{ExecutionSpec, ExitStatus},
    terminal::{AttachTerminalRequest, TerminalAttachOutcome},
};

use crate::{
    Error, harness,
    sandbox::platform::{PORTABLE_TERMINAL, UTF8_LOCALE},
};

use super::Observation;
use crate::sessions::{Activity, AttachTarget, LaunchToken, LifecycleState, Phase, Session, Turn};

/// Quiet period after the latest hook event before input is pasted into a
/// harness that is not waiting for input. The start hook fires before the
/// harness TUI's input loop is up, and a paste that lands in that gap is lost;
/// tmux has no readiness signal of its own, so recent hook activity stands in.
const INPUT_READY_GRACE: std::time::Duration = std::time::Duration::from_secs(2);

fn session_name(session: &Session) -> String {
    format!("agent-session-{}", session.id)
}

fn exact_target(session: &Session) -> String {
    format!("={}", session_name(session))
}

/// Exact-session pane target (`=name:`) for commands that address a pane rather
/// than a session; a bare `=name` resolves only for session-targeting commands.
fn pane_target(session: &Session) -> String {
    format!("={}:", session_name(session))
}

// Both timestamps come from the Sandbox. A missing transcript is normal before
// the harness creates its conversation; its contents are not needed here.
const OBSERVE_SCRIPT: &str = include_str!("observe.sh");

/// Observes attachment and the freshest terminal or transcript activity.
async fn observe(session: &Session, sandbox: &SandboxHandle) -> Result<Observation, Error> {
    let inspected = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/bin/sh"),
            [
                "-c".into(),
                OBSERVE_SCRIPT.into(),
                "agent-session-observe".into(),
                session_name(session),
                session
                    .status
                    .reported
                    .harness_transcript_path
                    .clone()
                    .unwrap_or_default(),
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
async fn stop(session: &Session, sandbox: &SandboxHandle) -> Result<(), Error> {
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
async fn launch(
    session: &Session,
    sandbox: &SandboxHandle,
    session_hook_url: &str,
    token: &LaunchToken,
    resume: Option<&str>,
    initial_message: Option<&str>,
) -> Result<(), Error> {
    let launch = harness::launch_linux(session.harness, crate::sandbox::platform::HOME, resume, initial_message);
    let mut arguments = vec!["new-session".into(), "-d".into(), "-s".into(), session_name(session)];
    let session_environment = launch.environment.iter().cloned().chain([
        ("CONTAINER_HOST".into(), crate::sandbox::platform::CONTAINER_HOST.into()),
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
                .with_environment([
                    ("HOME".into(), crate::sandbox::platform::HOME.into()),
                    ("LANG".into(), UTF8_LOCALE.into()),
                ]),
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
async fn attach_terminal(home: &std::path::Path, target: &AttachTarget) -> Result<(), Error> {
    if target.session.status.lifecycle.state != LifecycleState::Running {
        return Err(target.session.not_running_error());
    }
    let spec = attach_spec(&target.session);
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

fn attach_spec(session: &Session) -> ExecutionSpec {
    ExecutionSpec::command(
        SandboxPath::new("/usr/bin/tmux"),
        ["attach-session".into(), "-t".into(), exact_target(session)],
    )
    // Host-specific TERM names are not necessarily installed in the guest.
    // Use the broadly available baseline while tmux mediates the terminal.
    .with_environment([
        ("LANG".into(), UTF8_LOCALE.into()),
        ("TERM".into(), PORTABLE_TERMINAL.into()),
    ])
}

/// The M0 Unix Session runtime backed by tmux.
#[derive(Clone, Copy, Debug, Default)]
pub struct Tmux;

impl super::SessionRuntime for Tmux {
    fn observe<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
    ) -> ::sandbox::LocalFuture<'a, Result<Observation, Error>> {
        Box::pin(observe(session, sandbox))
    }

    fn start<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
        session_hook_url: &'a str,
        token: &'a LaunchToken,
        resume: Option<&'a str>,
        initial_prompt: Option<&'a str>,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>> {
        Box::pin(launch(
            session,
            sandbox,
            session_hook_url,
            token,
            resume,
            initial_prompt,
        ))
    }

    fn stop<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>> {
        Box::pin(stop(session, sandbox))
    }

    fn input_ready<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
    ) -> ::sandbox::LocalFuture<'a, Result<bool, Error>> {
        Box::pin(async move {
            let output = sandbox.run_execution(ExecutionSpec::command(
                SandboxPath::new("/bin/sh"),
                ["-c".into(),
                 "/usr/bin/tmux display-message -p -t \"$1\" '#{cursor_flag} #{cursor_y} #{pane_title}' && /usr/bin/tmux capture-pane -p -t \"$1\"".into(),
                 "agent-input-ready".into(), pane_target(session)],
            )).await?;
            // Provisioning publishes the launch before its pane necessarily exists.
            // tmux exits 1 while there is no server or target pane to inspect.
            if output.status.code == 1 {
                return Ok(false);
            }
            if !output.status.success() {
                return Err(Error::Session("could not inspect the harness input readiness".into()));
            }
            let screen = std::str::from_utf8(&output.stdout)
                .map_err(|error| Error::Session(format!("invalid terminal input state: {error}")))?;
            Ok(ready_input(screen)
                .is_some_and(|(line, title)| harness::input_ready_without_report(session.harness, line, title)))
        })
    }

    fn prompt<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
        prompt: &'a str,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>> {
        Box::pin(deliver(session, sandbox, prompt))
    }

    fn turns<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
        last: Option<usize>,
    ) -> ::sandbox::LocalFuture<'a, Result<Vec<Turn>, Error>> {
        Box::pin(turns(session, sandbox, last))
    }

    fn attach<'a>(
        &'a self,
        home: &'a std::path::Path,
        target: &'a AttachTarget,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>> {
        Box::pin(attach_terminal(home, target))
    }
}

/// Selects the current input cursor's line from a terminal snapshot. Readiness
/// must not be inferred from a prompt retained elsewhere in terminal history.
fn ready_input(screen: &str) -> Option<(&str, &str)> {
    let mut lines = screen.lines();
    let mut cursor = lines.next()?.split_whitespace();
    if cursor.next()? != "1" {
        return None;
    }
    let row = cursor.next()?.parse::<usize>().ok()?;
    let title = cursor.next()?;
    if cursor.next().is_some() {
        return None;
    }
    lines.nth(row).map(|line| (line, title))
}

/// Delivers operator input to a running tmux Session.
///
/// Input is held for [`INPUT_READY_GRACE`] after the latest reported hook
/// event unless the harness is waiting for input (see [`input_ready_in`]). The
/// prompt is then written to a Sandbox file and loaded into a private tmux
/// buffer, pasted into the Session's pane with bracketed paste so newlines
/// stay literal input, then submitted with a trailing Enter after a short settling
/// interval so the TUI can consume the paste before handling submission. Bracketed paste
/// is why a multi-line prompt is not submitted line by line by the harness TUI.
///
/// File and buffer carry a per-delivery name, so two deliveries in flight for
/// the same Session cannot overwrite each other's payload; the Session service
/// additionally serializes deliveries per Session.
async fn deliver(session: &Session, sandbox: &SandboxHandle, prompt: &str) -> Result<(), Error> {
    use std::io::Cursor;

    let buffer = format!("agent-prompt-{}-{}", session.id, uuid::Uuid::new_v4());
    let file = format!("/tmp/{buffer}");
    if let Some(quiet) = input_ready_in(&session.status.reported.activity, time::OffsetDateTime::now_utc()) {
        tokio::time::sleep(quiet).await;
    }
    sandbox
        .write_file(
            &SandboxPath::new(file.clone()),
            Box::pin(Cursor::new(prompt.as_bytes().to_vec())),
        )
        .await?;
    let delivered = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/bin/sh"),
            [
                "-c".into(),
                include_str!("deliver.sh").into(),
                "agent-session-deliver".into(),
                file,
                buffer,
                pane_target(session),
            ],
        ))
        .await?;
    if delivered.status.success() {
        Ok(())
    } else {
        Err(Error::Session(format!(
            "tmux failed to deliver input to Session {} with exit code {}",
            session.id, delivered.status.code
        )))
    }
}

/// How much longer to hold input for a harness whose latest hook event is
/// recent, or `None` when it can take input now: a harness waiting for input
/// is ready by definition, and one whose last event is older than
/// [`INPUT_READY_GRACE`] has had its input loop up for at least that long.
fn input_ready_in(activity: &Activity, now: time::OffsetDateTime) -> Option<std::time::Duration> {
    if activity.phase == Phase::WaitingForInput {
        return None;
    }
    let last = activity.last_event_at?;
    let quiet = now - last;
    let grace = time::Duration::try_from(INPUT_READY_GRACE).ok()?;
    if quiet >= grace {
        None
    } else {
        std::time::Duration::try_from(grace - quiet).ok()
    }
}

/// Reads the harness transcript the Session reported and parses it into turns.
///
/// The path travels as a positional argument, never interpolated into shell
/// text. A harness that has not reported a transcript yet, or has reported one
/// it has not created yet, has an empty conversation.
async fn turns(session: &Session, sandbox: &SandboxHandle, last: Option<usize>) -> Result<Vec<Turn>, Error> {
    const MAX_TRANSCRIPT_BYTES: usize = 2 * 1024 * 1024;
    const SCRIPT: &str = "[ -f \"$1\" ] || exit 0; exec /usr/bin/tail -c \"$2\" -- \"$1\"";
    let Some(path) = session.status.reported.harness_transcript_path.as_deref() else {
        return Ok(Vec::new());
    };
    if last == Some(0) {
        return Ok(Vec::new());
    }
    let read = sandbox
        .run_execution(ExecutionSpec::command(
            SandboxPath::new("/bin/sh"),
            [
                "-c".into(),
                SCRIPT.into(),
                "agent-session-transcript".into(),
                path.into(),
                (MAX_TRANSCRIPT_BYTES + 1).to_string(),
            ],
        ))
        .await?;
    if !read.status.success() {
        return Err(Error::Session(format!(
            "reading the conversation of Session {} failed with exit code {}",
            session.id, read.status.code
        )));
    }
    parse_transcript_suffix(session.harness, &read.stdout, last, MAX_TRANSCRIPT_BYTES)
}

fn parse_transcript_suffix(
    kind: crate::Harness,
    bytes: &[u8],
    last: Option<usize>,
    max_bytes: usize,
) -> Result<Vec<Turn>, Error> {
    let truncated = bytes.len() > max_bytes;
    if truncated && last.is_none() {
        return Err(Error::Session(format!(
            "conversation exceeds the {} MiB read limit; retry with --last",
            max_bytes / 1024 / 1024
        )));
    }
    let bytes = if truncated {
        let after_partial_line = bytes
            .iter()
            .position(|byte| *byte == b'\n')
            .map_or_else(|| &bytes[bytes.len()..], |newline| &bytes[newline + 1..]);
        harness::trim_partial_transcript(kind, after_partial_line)
    } else {
        bytes
    };
    let mut turns = harness::parse_transcript(kind, bytes)?;
    if let Some(last) = last {
        if truncated && turns.len() < last {
            return Err(Error::Session(format!(
                "the last {last} complete turns do not fit within the {} MiB transcript read limit; request fewer turns",
                max_bytes / 1024 / 1024
            )));
        }
        if turns.len() > last {
            turns.drain(0..turns.len() - last);
        }
    }
    Ok(turns)
}

#[cfg(test)]
mod tests {
    use sandbox::execution::ExitStatus;
    use time::OffsetDateTime;

    use crate::{
        harness,
        sessions::{Activity, Lifecycle, Part, Phase, Reported, Status},
    };

    use super::{Observation, Session, input_ready_in, parse_transcript_suffix};

    #[test]
    fn a_truncated_suffix_starts_at_the_first_complete_turn() {
        let transcript = concat!(
            "partial record\n",
            r#"{"type":"assistant","message":{"id":"old","content":[{"type":"text","text":"partial answer"}]}}"#,
            "\n",
            r#"{"type":"user","message":{"content":"latest prompt"}}"#,
            "\n",
            r#"{"type":"assistant","message":{"id":"new","content":[{"type":"text","text":"latest answer"}]}}"#,
            "\n",
        );
        let turns = parse_transcript_suffix(
            harness::test_harness(),
            transcript.as_bytes(),
            Some(1),
            transcript.len() - 1,
        )
        .expect("last complete turn");
        assert!(matches!(
            turns[0].messages[0].parts[0],
            Part::Text { ref text } if text == "latest prompt"
        ));
    }

    #[test]
    fn a_truncated_transcript_requires_a_satisfiable_last_bound() {
        let transcript = concat!(
            "partial record\n",
            r#"{"type":"user","message":{"content":"only complete prompt"}}"#,
            "\n",
        );
        let max_bytes = transcript.len() - 1;

        let unbounded = parse_transcript_suffix(harness::test_harness(), transcript.as_bytes(), None, max_bytes)
            .expect_err("unbounded truncated transcript");
        assert!(unbounded.to_string().contains("retry with --last"));

        let too_many = parse_transcript_suffix(harness::test_harness(), transcript.as_bytes(), Some(2), max_bytes)
            .expect_err("too many complete turns");
        assert!(too_many.to_string().contains("request fewer turns"));
    }

    #[test]
    #[ignore = "requires Node.js and tmux; exercises input in an isolated terminal server"]
    fn delivery_and_transcript_freshness_in_a_real_terminal() {
        let output = std::process::Command::new("node")
            .arg(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/tmux_delivery.mjs"))
            .arg(concat!(env!("CARGO_MANIFEST_DIR"), "/src/sessions/runtime/deliver.sh"))
            .arg(concat!(env!("CARGO_MANIFEST_DIR"), "/src/sessions/runtime/observe.sh"))
            .output()
            .expect("Node.js");
        assert!(
            output.status.success(),
            "{}\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }

    #[test]
    fn readiness_requires_a_visible_cursor_on_the_current_line() {
        assert_eq!(
            super::ready_input("1 1 title\nold prompt\ncurrent input\n"),
            Some(("current input", "title"))
        );
        assert_eq!(super::ready_input("0 1 title\nold prompt\ncurrent input\n"), None);
        assert_eq!(super::ready_input("1 8 title\nold prompt\n"), None);
        assert_eq!(super::ready_input("invalid\nold prompt\n"), None);
    }

    #[test]
    fn input_waits_out_the_grace_after_a_recent_event_unless_the_harness_is_waiting() {
        let now = time::OffsetDateTime::from_unix_timestamp(10_000).expect("timestamp");
        let just_started = Activity {
            phase: Phase::Working,
            last_event_at: Some(now - time::Duration::milliseconds(500)),
            ..Activity::default()
        };
        assert_eq!(
            input_ready_in(&just_started, now),
            Some(std::time::Duration::from_millis(1_500))
        );
        let quiet = Activity {
            phase: Phase::Working,
            last_event_at: Some(now - time::Duration::seconds(30)),
            ..Activity::default()
        };
        assert_eq!(input_ready_in(&quiet, now), None);
        let waiting = Activity {
            phase: Phase::WaitingForInput,
            ..just_started
        };
        assert_eq!(
            input_ready_in(&waiting, now),
            None,
            "a completed turn means the input loop is up"
        );
        assert_eq!(
            input_ready_in(&Activity::default(), now),
            None,
            "nothing reported yet imposes no grace"
        );
    }

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

    #[test]
    fn attachment_uses_portable_utf8_terminal_environment() {
        let session = Session {
            id: "dd4cdbaf-9ea0-477e-96dd-bbd6b1e4f7dc".parse().expect("Session ID"),
            agent_id: "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID"),
            agent: "worker".into(),
            name: "s1".to_string().try_into().expect("Session name"),
            harness: crate::harness::test_harness(),
            created_at: OffsetDateTime::UNIX_EPOCH,
            status: Status::new(Lifecycle::running(), Reported::default()),
            activation_generation: 0,
            observed_activation_generation: 0,
        };

        let spec = super::attach_spec(&session);

        assert_eq!(spec.environment().get("LANG").map(String::as_str), Some("C.UTF-8"));
        assert_eq!(
            spec.environment().get("TERM").map(String::as_str),
            Some("xterm-256color")
        );
    }
}
