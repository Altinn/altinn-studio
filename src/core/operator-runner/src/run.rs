use std::{io, time::Duration};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use bytes::Bytes;
use sandbox_authorization::LocalFuture;
use sandbox_hosting::AnyError;
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
/// The time after the command to read the report and to make and read the patch. The core operator's budget for the
/// result has room for it.
const FINISH_TIMEOUT: Duration = Duration::from_mins(1);
/// The output of a step only goes into the error of a failed run, which its status carries. The core operator reads a
/// status of at most 64 KiB, and JSON can escape a byte in six.
const STEP_OUTPUT_LIMITS: Limits = Limits {
    stdout: 8 * 1024,
    stderr: 8 * 1024,
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

/// What a command runs, what its VM can reach, and what the operator runner returns. Each command is one reviewed
/// entry, so a client names a command and never sends a command line.
///
/// A command runs in a VM from the guest image of its pod. The kind of the command in the core operator names the
/// `PodTemplate`, so a command that needs other tools than [`Dockerfile.guest`](../Dockerfile.guest) has needs a
/// `PodTemplate` with its own guest image. That `PodTemplate` also needs an entry in the Role of the operator and its
/// own binding of the admission policy, as [Add a command](../README.md#add-a-command) says.
pub struct Spec {
    pub name: &'static str,
    /// The shell script of the command. It starts in `/job`, with the app in `/job/app`.
    script: &'static str,
    output_limits: Limits,
    /// The hosts that the VM can reach with HTTPS.
    pub allowed_hosts: &'static [&'static str],
    /// Whether the command changes the app. The operator runner then returns the changes as a patch.
    pub changes_app: bool,
    /// The file in which the command writes a JSON object for the client, such as the report of an upgrade.
    pub report_file: Option<&'static str>,
}

/// `studioctl app upgrade v9` writes its report as JSON to stdout.
static UPGRADE_V9: Spec = Spec {
    name: "upgrade-v9",
    script: "cd app && exec studioctl app upgrade v9 -p . --json > /job/report.json",
    output_limits: Limits {
        stdout: MIB,
        stderr: MIB,
    },
    allowed_hosts: NUGET_HOSTS,
    changes_app: true,
    report_file: Some("/job/report.json"),
};

/// The commands that the operator runner can run. To add one, add a [`Spec`] and a variant.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Command {
    /// `studioctl app upgrade v9` of a v8 app.
    UpgradeV9,
}

impl Command {
    const ALL: [Self; 1] = [Self::UpgradeV9];

    /// Returns the command with this name, or `None` if the operator runner has no such command.
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
}

/// One command on the app in the archive.
pub struct Run {
    pub command: Command,
    pub archive: Bytes,
    /// The command stops at this time. The VM must also start, and the app be in it, before this time.
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

/// The operator runner could not run the command.
#[derive(Debug)]
pub enum RunError {
    /// The archive does not extract.
    InvalidArchive(String),
    /// The operator runner does not return the patch that the command made.
    RefusedPatch(Refusal),
    /// The VM did not start, or the operator runner could not make the patch.
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
    let finish = Instant::now() + FINISH_TIMEOUT;
    let report = match spec.report_file {
        Some(path) => read_report(vm, path, finish).await,
        None => None,
    };
    let patch = if spec.changes_app {
        patch_of(vm, command.ending, finish).await?
    } else {
        None
    };
    Ok(to_outcome(&command, report, patch.as_deref()))
}

/// Takes the archive, so that the operator runner does not keep it in memory after the write.
async fn prepare_app(vm: &Vm, archive: Bytes, deadline: Instant) -> Result<(), RunError> {
    let deadline = deadline.min(Instant::now() + PREPARE_TIMEOUT);
    vm.write_file(ARCHIVE_PATH, archive, deadline).await?;
    let prepared = vm.run_script(PREPARE_SCRIPT, deadline, STEP_OUTPUT_LIMITS).await?;
    if prepared.ending == Ending::Exited(0) {
        Ok(())
    } else {
        Err(RunError::InvalidArchive(to_text(&prepared.stderr)))
    }
}

/// Returns the report of the command, or `None` when the command wrote no JSON object. A command that stops early
/// writes none, and the client then has its output.
async fn read_report(vm: &Vm, path: &str, deadline: Instant) -> Option<Map<String, Value>> {
    match vm.read_file(path, MAX_REPORT_BYTES, deadline).await {
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

/// A command that timed out has no patch, because its changes are not complete. App code made the patch, so the
/// operator runner checks it before it returns it.
async fn patch_of(vm: &Vm, ending: Ending, deadline: Instant) -> Result<Option<Vec<u8>>, RunError> {
    if ending == Ending::TimedOut {
        return Ok(None);
    }
    let patch = read_patch(vm, deadline).await?;
    patch::check(&patch).map_err(RunError::RefusedPatch)?;
    Ok(Some(patch))
}

async fn read_patch(vm: &Vm, deadline: Instant) -> Result<Vec<u8>, AnyError> {
    let made = vm.run_script(PATCH_SCRIPT, deadline, STEP_OUTPUT_LIMITS).await?;
    if made.ending != Ending::Exited(0) {
        return Err(io::Error::other(format!("git could not make the patch: {}", to_text(&made.stderr))).into());
    }
    vm.read_file(PATCH_PATH, MAX_PATCH_BYTES, deadline).await
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

/// Converts the output to text. Bytes that are not UTF-8 become U+FFFD. A note shows where the operator runner cut the
/// output.
fn to_text(captured: &Captured) -> String {
    let text = String::from_utf8_lossy(captured.bytes());
    if captured.is_cut() {
        format!("{text}\n[The operator runner cut the output here.]")
    } else {
        text.into_owned()
    }
}

#[cfg(test)]
mod tests {
    use std::{rc::Rc, time::Duration};

    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use bytes::Bytes;
    use clap::{Args as _, FromArgMatches as _};
    use futures_util::{StreamExt as _, stream};
    use sandbox::{
        SandboxService,
        execution::{ExecutionEvent, ExecutionEventStream, ExecutionSpec, ExitStatus, Program},
        memory,
    };
    use sandbox_hosting::AnyError;
    use serde_json::{Value, json};
    use tokio::time::Instant;

    use super::{
        Command, Outcome, PATCH_PATH, PATCH_SCRIPT, PREPARE_SCRIPT, Run, RunError, Runner as _, parse_report,
        to_outcome,
    };
    use crate::{
        output::{Collected, Limits, collect},
        patch::Refusal,
        policy::AllowedHosts,
        vm::{VmArguments, Vms},
    };

    const PATCH: &str = "diff --git a/App/App.csproj b/App/App.csproj\nindex 1111111..2222222 100644\n--- a/App/App.csproj\n+++ b/App/App.csproj\n@@ -1 +1 @@\n-v8\n+v9\n";

    /// The real VMs over the in-memory Provider of the Sandbox SDK, which runs no script. A script exits with 0 and no
    /// output unless the test answers for it, and the VM has only the files that someone writes in it.
    struct Guest {
        provider: Rc<memory::Provider>,
        vms: Vms,
    }

    impl Guest {
        fn new() -> Result<Self, AnyError> {
            let provider = Rc::new(memory::Provider::new());
            let image = format!("registry.example/guest@sha256:{}", "0".repeat(64));
            let line = format!("test --image {image} --cpus 1 --memory 1Gi --root-filesystem 1Gi");
            let matches =
                VmArguments::augment_args(clap::Command::new("test")).try_get_matches_from(line.split(' '))?;
            let arguments = VmArguments::from_arg_matches(&matches)?;
            let service = SandboxService::new(provider.clone());
            let vms = Vms::new(service, arguments, AllowedHosts::default())?;
            Ok(Self { provider, vms })
        }

        fn answer(&self, script: &'static str, events: Vec<ExecutionEvent>) {
            self.provider
                .queue_execution_events_matching(move |spec| script_of(spec) == Some(script), events);
        }

        /// Runs the upgrade in a VM that has the report and the patch that studioctl and git would write. The run finds
        /// the VM by its name, so the test starts it first.
        async fn upgrade(&self, patch: &'static str) -> Result<Outcome, RunError> {
            let vm = self.vms.start(&[]).await?;
            let deadline = Instant::now() + Duration::from_mins(1);
            let report = Bytes::from_static(br#"{"exitCode": 0}"#);
            vm.write_file("/job/report.json", report, deadline).await?;
            vm.write_file(PATCH_PATH, Bytes::from_static(patch.as_bytes()), deadline)
                .await?;
            let run = Run {
                command: Command::UpgradeV9,
                archive: Bytes::from_static(b"app"),
                deadline,
            };
            self.vms.run(run).await
        }

        /// The scripts that ran, in order.
        fn scripts(&self) -> Vec<String> {
            let specs = self.provider.execution_specs();
            specs.iter().filter_map(script_of).map(str::to_owned).collect()
        }
    }

    fn script_of(spec: &ExecutionSpec) -> Option<&str> {
        match spec.program() {
            Program::Command { args, .. } => args.last().map(String::as_str),
            Program::ImageEntrypoint => None,
        }
    }

    #[tokio::test]
    async fn runs_the_command_in_the_vm_and_answers_with_its_output_report_and_patch() -> Result<(), AnyError> {
        let guest = Guest::new()?;
        let upgrade = Command::UpgradeV9.spec().script;
        guest.answer(
            upgrade,
            vec![
                ExecutionEvent::Stdout(Bytes::from_static(b"{}")),
                ExecutionEvent::Stderr(Bytes::from_static(b"warn \xff")),
                ExecutionEvent::Exited(ExitStatus { code: 3 }),
            ],
        );

        let outcome = guest.upgrade(PATCH).await.expect("the upgrade runs");

        let expected = Outcome {
            exit_code: Some(3),
            timed_out: false,
            stdout: "{}".to_string(),
            stderr: "warn \u{fffd}".to_string(),
            report: json!({ "exitCode": 0 }).as_object().cloned(),
            patch: Some(STANDARD.encode(PATCH)),
        };
        assert_eq!(outcome, expected);
        assert_eq!(guest.scripts(), [PREPARE_SCRIPT, upgrade, PATCH_SCRIPT]);
        Ok(())
    }

    /// App code made the patch, so the operator runner checks it before it returns it.
    #[tokio::test]
    async fn refuses_a_patch_that_changes_a_ci_workflow() -> Result<(), AnyError> {
        let workflow = "diff --git a/.github/workflows/build.yml b/.github/workflows/build.yml\nnew file mode 100644\nindex 0000000..e69de29\n";

        let result = Guest::new()?.upgrade(workflow).await;

        assert!(
            matches!(&result, Err(RunError::RefusedPatch(Refusal::Changes(changes)))
                if changes == &[".github/workflows/build.yml (a CI workflow folder)"]),
            "{result:?}"
        );
        Ok(())
    }

    #[tokio::test]
    async fn fails_without_running_the_command_when_the_archive_does_not_extract() -> Result<(), AnyError> {
        let guest = Guest::new()?;
        guest.answer(
            PREPARE_SCRIPT,
            vec![
                ExecutionEvent::Stderr(Bytes::from_static(b"gzip: invalid header")),
                ExecutionEvent::Exited(ExitStatus { code: 2 }),
            ],
        );

        let result = guest.upgrade(PATCH).await;

        assert!(
            matches!(&result, Err(RunError::InvalidArchive(stderr)) if stderr == "gzip: invalid header"),
            "{result:?}"
        );
        assert_eq!(guest.scripts(), [PREPARE_SCRIPT]);
        Ok(())
    }

    #[tokio::test]
    async fn fails_when_the_command_does_not_start_or_its_output_ends_before_it_exits() -> Result<(), AnyError> {
        let not_started = ExecutionEvent::Failed {
            message: "no such file".to_string(),
        };
        let ended_early = ExecutionEvent::Stdout(Bytes::from_static(b"x"));
        for events in [vec![not_started], vec![ended_early]] {
            let guest = Guest::new()?;
            guest.answer(Command::UpgradeV9.spec().script, events);

            let result = guest.upgrade(PATCH).await;

            assert!(matches!(&result, Err(RunError::Failed(_))), "{result:?}");
        }
        Ok(())
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

    #[tokio::test(start_paused = true)]
    async fn answers_without_an_exit_code_when_the_command_timed_out() -> Result<(), AnyError> {
        let command = collected(
            vec![ExecutionEvent::Stdout(Bytes::from_static(b"so far"))],
            Command::UpgradeV9.spec().output_limits,
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
    async fn marks_where_it_cut_the_output_and_reads_on_until_the_exit() -> Result<(), AnyError> {
        let command = collected(
            vec![
                ExecutionEvent::Stdout(Bytes::from_static(b"abc")),
                ExecutionEvent::Stdout(Bytes::from_static(b"def")),
                ExecutionEvent::Exited(ExitStatus { code: 0 }),
            ],
            Limits { stdout: 4, stderr: 4 },
        )
        .await?;

        let outcome = to_outcome(&command, None, None);

        assert_eq!(outcome.stdout, "abcd\n[The operator runner cut the output here.]");
        assert_eq!(outcome.exit_code, Some(0));
        Ok(())
    }
}
