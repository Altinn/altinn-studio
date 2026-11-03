use std::{io, time::Duration};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use bytes::Bytes;
use sandbox_authorization::LocalFuture;
use sandbox_host::AnyError;
use serde::Serialize;
use serde_json::{Map, Value};
use tokio::time::Instant;

use crate::{
    output::{Captured, Collected, Ending, Limits},
    patch::{self, Refusal},
    policy::NUGET_HOSTS,
    vm::{Vm, Vms},
};

const MIB: usize = 1024 * 1024;
const ARCHIVE_PATH: &str = "/job/app.tar.gz";
const PATCH_PATH: &str = "/job/changes.patch";
const MAX_PATCH_BYTES: u64 = 20 * 1024 * 1024;
const MAX_REPORT_BYTES: u64 = 8 * 1024 * 1024;
const PREPARE_TIMEOUT: Duration = Duration::from_mins(2);
const PATCH_TIMEOUT: Duration = Duration::from_mins(1);
const STEP_OUTPUT_LIMITS: Limits = Limits {
    stdout: 64 * 1024,
    stderr: 64 * 1024,
};

/// Extracts the app and commits it. The patch starts at this commit. studioctl must have a clean working tree.
const PREPARE_SCRIPT: &str = "set -eu
mkdir app
tar -xzf app.tar.gz --no-same-owner -C app
rm app.tar.gz
cd app
git init --quiet
git add -A
git commit --quiet --no-verify --allow-empty --message base";

/// The patch also contains the changes that the command did not stage. The options give the format that
/// [`patch::check`] reads, also when the command changed the configuration of the repository.
const PATCH_SCRIPT: &str = "set -eu
cd app
git add -A
git diff --cached --binary --no-renames --no-color --no-ext-diff --no-textconv --src-prefix=a/ --dst-prefix=b/ \\
  > /job/changes.patch";

/// What a command runs, what its VM can reach, and what the job host returns. Each command is one reviewed entry, so a
/// client names a command and never sends a command line.
///
/// A command runs in a VM from the guest image of its pod. The kind of the command in the core operator names the
/// `PodTemplate`, so a command that needs other tools than [`Dockerfile.guest`](../Dockerfile.guest) has needs a
/// `PodTemplate` with its own guest image. That `PodTemplate` also needs an entry in the Role of the operator and its
/// own binding of the admission policy, as [Add a command](../README.md#add-a-command) says.
pub struct Spec {
    pub name: &'static str,
    /// The shell script of the command. It starts in `/job`, with the app in `/job/app`.
    script: &'static str,
    /// The time from the start of the run until the job host stops the command.
    pub timeout: Duration,
    output_limits: Limits,
    /// The hosts that the VM can reach with HTTPS.
    pub allowed_hosts: &'static [&'static str],
    /// Whether the command changes the app. The job host then returns the changes as a patch.
    pub changes_app: bool,
    /// The file in which the command writes a JSON object for the client, such as the report of an upgrade.
    pub report_file: Option<&'static str>,
}

/// `studioctl app upgrade v9` writes its report as JSON to stdout.
static UPGRADE_V9: Spec = Spec {
    name: "upgrade-v9",
    script: "cd app && exec studioctl app upgrade v9 -p . --json > /job/report.json",
    // studioctl stops an upgrade after 10 minutes. This limit stops only a studioctl process that hangs.
    timeout: Duration::from_mins(11),
    output_limits: Limits {
        stdout: MIB,
        stderr: MIB,
    },
    allowed_hosts: NUGET_HOSTS,
    changes_app: true,
    report_file: Some("/job/report.json"),
};

/// The commands that the job host can run. To add one, add a [`Spec`] and a variant.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Command {
    /// `studioctl app upgrade v9` of a v8 app.
    UpgradeV9,
}

impl Command {
    const ALL: [Self; 1] = [Self::UpgradeV9];

    /// Returns the command with this name, or `None` if the job host has no such command.
    #[must_use]
    pub fn from_name(name: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|command| command.name() == name)
    }

    #[must_use]
    pub fn spec(self) -> &'static Spec {
        match self {
            Self::UpgradeV9 => &UPGRADE_V9,
        }
    }

    #[must_use]
    pub fn name(self) -> &'static str {
        self.spec().name
    }

    /// The time from the start of the run until the job host stops the command.
    #[must_use]
    pub fn timeout(self) -> Duration {
        self.spec().timeout
    }
}

/// One command on the app in the archive.
pub struct Run {
    pub command: Command,
    pub archive: Bytes,
    /// The command stops at this time. The VM must also start before this time.
    pub deadline: Instant,
}

/// The result of a command that ran.
#[derive(Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    /// `None` when the command timed out.
    pub exit_code: Option<i32>,
    pub timed_out: bool,
    pub stdout: String,
    pub stderr: String,
    /// The JSON object in the report file of the command. `None` when the command has no report file, or wrote no JSON
    /// object to it.
    pub report: Option<Map<String, Value>>,
    /// The changes of the command as base64. A patch can contain bytes that are not UTF-8. `None` when the command
    /// does not change the app, or timed out.
    pub patch: Option<String>,
}

/// The job host could not run the command.
#[derive(Debug)]
pub enum RunError {
    /// The archive does not extract.
    InvalidArchive(String),
    /// The job host does not return the patch that the command made.
    RefusedPatch(Refusal),
    /// The VM did not start, or the job host could not make the patch.
    Failed(AnyError),
}

impl From<AnyError> for RunError {
    fn from(error: AnyError) -> Self {
        Self::Failed(error)
    }
}

/// Runs commands in a VM. The host uses this trait, so that the tests can use a fake.
pub trait Runner {
    /// Starts a VM and runs the command in it. When the caller drops the future, the command stops. The VM stays until
    /// [`Runner::delete_vm`].
    fn run(&self, run: Run) -> LocalFuture<'_, Result<Outcome, RunError>>;

    /// Deletes the VM of the run, if it exists.
    fn delete_vm(&self) -> LocalFuture<'_, Result<(), AnyError>>;
}

impl Runner for Vms {
    fn run(&self, run: Run) -> LocalFuture<'_, Result<Outcome, RunError>> {
        Box::pin(async move {
            let start = self.start(run.command.spec().allowed_hosts);
            let Ok(started) = tokio::time::timeout_at(run.deadline, start).await else {
                return Err(RunError::Failed(
                    io::Error::new(io::ErrorKind::TimedOut, "the VM did not start in time").into(),
                ));
            };
            run_in_vm(&started?, run).await
        })
    }

    fn delete_vm(&self) -> LocalFuture<'_, Result<(), AnyError>> {
        Box::pin(self.delete())
    }
}

async fn run_in_vm(vm: &Vm, run: Run) -> Result<Outcome, RunError> {
    let spec = run.command.spec();
    prepare_app(vm, run.archive, run.deadline).await?;
    let command = vm.run_script(spec.script, run.deadline, spec.output_limits).await?;
    let report = match spec.report_file {
        Some(path) => read_report(vm, path).await,
        None => None,
    };
    let patch = if spec.changes_app {
        patch_of(vm, command.ending).await?
    } else {
        None
    };
    Ok(to_outcome(&command, report, patch.as_deref()))
}

/// Takes the archive, so that the job host does not keep it in memory after the write.
async fn prepare_app(vm: &Vm, archive: Bytes, deadline: Instant) -> Result<(), RunError> {
    vm.write_file(ARCHIVE_PATH, archive).await?;
    let deadline = deadline.min(Instant::now() + PREPARE_TIMEOUT);
    let prepared = vm.run_script(PREPARE_SCRIPT, deadline, STEP_OUTPUT_LIMITS).await?;
    if prepared.ending == Ending::Exited(0) {
        Ok(())
    } else {
        Err(RunError::InvalidArchive(to_text(&prepared.stderr)))
    }
}

/// Returns the report of the command, or `None` when the command wrote no JSON object. A command that stops early
/// writes none, and the client then has its output.
async fn read_report(vm: &Vm, path: &str) -> Option<Map<String, Value>> {
    match vm.read_file(path, MAX_REPORT_BYTES).await {
        Ok(contents) => parse_report(&contents),
        Err(error) => {
            tracing::warn!(%error, "the command wrote no report");
            None
        }
    }
}

fn parse_report(contents: &[u8]) -> Option<Map<String, Value>> {
    match serde_json::from_slice(contents) {
        Ok(Value::Object(report)) => Some(report),
        Ok(_) => {
            tracing::warn!("the report of the command is not a JSON object");
            None
        }
        Err(error) => {
            tracing::warn!(%error, "the report of the command is not JSON");
            None
        }
    }
}

/// A command that timed out has no patch, because its changes are not complete. App code made the patch, so the job
/// host checks it before it returns it.
async fn patch_of(vm: &Vm, ending: Ending) -> Result<Option<Vec<u8>>, RunError> {
    if ending == Ending::TimedOut {
        return Ok(None);
    }
    let patch = read_patch(vm).await?;
    patch::check(&patch).map_err(RunError::RefusedPatch)?;
    Ok(Some(patch))
}

async fn read_patch(vm: &Vm) -> Result<Vec<u8>, AnyError> {
    let made = vm
        .run_script(PATCH_SCRIPT, Instant::now() + PATCH_TIMEOUT, STEP_OUTPUT_LIMITS)
        .await?;
    if made.ending != Ending::Exited(0) {
        return Err(io::Error::other(format!("git could not make the patch: {}", to_text(&made.stderr))).into());
    }
    vm.read_file(PATCH_PATH, MAX_PATCH_BYTES).await
}

fn to_outcome(command: &Collected, report: Option<Map<String, Value>>, patch: Option<&[u8]>) -> Outcome {
    let exit_code = match command.ending {
        Ending::Exited(code) => Some(code),
        Ending::TimedOut => None,
    };
    Outcome {
        exit_code,
        timed_out: exit_code.is_none(),
        stdout: to_text(&command.stdout),
        stderr: to_text(&command.stderr),
        report,
        patch: patch.map(|patch| STANDARD.encode(patch)),
    }
}

/// Converts the output to text. Bytes that are not UTF-8 become U+FFFD. A note shows where the job host cut the
/// output.
fn to_text(captured: &Captured) -> String {
    let text = String::from_utf8_lossy(captured.bytes());
    if captured.is_cut() {
        format!("{text}\n[The job host cut the output here.]")
    } else {
        text.into_owned()
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use bytes::Bytes;
    use futures_util::{StreamExt as _, stream};
    use sandbox::execution::{ExecutionEvent, ExecutionEventStream, ExitStatus};
    use sandbox_host::AnyError;
    use serde_json::{Value, json};
    use tokio::time::Instant;

    use super::{Command, parse_report, to_outcome};
    use crate::output::{Collected, Limits, collect};

    fn upgrade_output_limits() -> Limits {
        Command::UpgradeV9.spec().output_limits
    }

    async fn collected(events: Vec<ExecutionEvent>, limits: Limits) -> Result<Collected, AnyError> {
        let mut events: ExecutionEventStream =
            Box::pin(stream::iter(events.into_iter().map(Ok)).chain(stream::pending()));
        collect(&mut events, Instant::now() + Duration::from_secs(1), limits).await
    }

    #[test]
    fn knows_only_its_own_commands() {
        assert_eq!(Command::from_name("upgrade-v9"), Some(Command::UpgradeV9));
        assert_eq!(Command::UpgradeV9.name(), "upgrade-v9");
        for unknown in ["", "upgrade-v10", "UPGRADE-V9", "upgrade/v9", "sh"] {
            assert_eq!(Command::from_name(unknown), None, "{unknown}");
        }
    }

    #[test]
    fn reads_a_report_only_when_it_is_a_json_object() {
        let report = parse_report(br#"{"exitCode": 3, "steps": []}"#);
        assert_eq!(report.map(Value::Object), Some(json!({ "exitCode": 3, "steps": [] })));
        for not_a_report in [&b""[..], b"{\"exitCode\": 3", b"[]", b"null", b"not json"] {
            assert_eq!(
                parse_report(not_a_report),
                None,
                "{}",
                String::from_utf8_lossy(not_a_report)
            );
        }
    }

    #[tokio::test]
    async fn answers_with_the_exit_code_the_output_and_the_patch_as_base64() -> Result<(), AnyError> {
        let command = collected(
            vec![
                ExecutionEvent::Stdout(Bytes::from_static(b"{}")),
                ExecutionEvent::Stderr(Bytes::from_static(b"warn \xff")),
                ExecutionEvent::Exited(ExitStatus { code: 3 }),
            ],
            upgrade_output_limits(),
        )
        .await?;

        let report = parse_report(br#"{"exitCode": 3}"#);
        let outcome = to_outcome(&command, report, Some(b"diff\n"));

        assert_eq!(outcome.exit_code, Some(3));
        assert!(!outcome.timed_out);
        assert_eq!(outcome.stdout, "{}");
        assert_eq!(outcome.stderr, "warn \u{fffd}");
        assert_eq!(serde_json::to_value(&outcome)?["report"], json!({ "exitCode": 3 }));
        assert_eq!(outcome.patch.as_deref(), Some("ZGlmZgo="));
        Ok(())
    }

    #[tokio::test(start_paused = true)]
    async fn answers_without_an_exit_code_when_the_command_timed_out() -> Result<(), AnyError> {
        let command = collected(
            vec![ExecutionEvent::Stdout(Bytes::from_static(b"so far"))],
            upgrade_output_limits(),
        )
        .await?;

        let outcome = to_outcome(&command, None, None);

        assert_eq!(outcome.exit_code, None);
        assert!(outcome.timed_out);
        assert_eq!(outcome.stdout, "so far");
        assert_eq!(outcome.patch, None);
        Ok(())
    }

    #[tokio::test]
    async fn marks_where_it_cut_the_output() -> Result<(), AnyError> {
        let command = collected(
            vec![
                ExecutionEvent::Stdout(Bytes::from_static(b"abcdef")),
                ExecutionEvent::Exited(ExitStatus { code: 0 }),
            ],
            Limits { stdout: 3, stderr: 3 },
        )
        .await?;

        let outcome = to_outcome(&command, None, None);

        assert_eq!(outcome.stdout, "abc\n[The job host cut the output here.]");
        Ok(())
    }
}
