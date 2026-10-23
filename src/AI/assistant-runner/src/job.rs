use std::{cell::Cell, io, time::Duration};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use bytes::Bytes;
use sandbox_authorization::LocalFuture;
use sandbox_host::AnyError;
use serde::Serialize;
use tokio::time::Instant;

use crate::{
    output::{Captured, Collected, Ending, Limits},
    vm::{Vm, Vms},
};

const MIB: usize = 1024 * 1024;
const ARCHIVE_PATH: &str = "/job/app.tar.gz";
const PATCH_PATH: &str = "/job/changes.patch";
const MAX_PATCH_BYTES: u64 = 20 * 1024 * 1024;
const PREPARE_TIMEOUT: Duration = Duration::from_mins(2);
const PATCH_TIMEOUT: Duration = Duration::from_mins(1);
const STEP_OUTPUT_LIMITS: Limits = Limits {
    stdout: 64 * 1024,
    stderr: 64 * 1024,
};

/// Extracts the app and commits it. The commit is where the patch starts, and studioctl needs a clean working tree.
const PREPARE_SCRIPT: &str = "set -eu
mkdir app
tar -xzf app.tar.gz --no-same-owner -C app
rm app.tar.gz
cd app
git init --quiet
git add -A
git commit --quiet --no-verify --allow-empty --message base";

/// The patch also has the changes that studioctl did not stage.
const PATCH_SCRIPT: &str = "set -eu
cd app
git add -A
git diff --cached --binary > /job/changes.patch";

const UPGRADE_SCRIPT: &str = "cd app && exec studioctl app upgrade v9 -p . --json";
/// studioctl stops an upgrade after 10 minutes, so this limit only stops a studioctl that hangs.
pub const UPGRADE_TIMEOUT: Duration = Duration::from_mins(11);
/// The upgrade writes its report as JSON to stdout.
const UPGRADE_OUTPUT_LIMITS: Limits = Limits {
    stdout: 8 * MIB,
    stderr: MIB,
};

/// A v9 upgrade of the app in the archive.
pub struct Job {
    pub archive: Bytes,
    /// The command stops at this time, so that the answer comes before the client stops to wait.
    pub deadline: Instant,
}

/// The answer to a job request.
#[derive(Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobOutcome {
    /// `None` when the command timed out.
    pub exit_code: Option<i32>,
    pub timed_out: bool,
    pub stdout: String,
    pub stderr: String,
    /// The changes of the upgrade as base64, because a patch can have content that is not UTF-8.
    pub patch: Option<String>,
}

#[derive(Debug)]
pub enum JobError {
    /// The archive does not extract.
    InvalidArchive(String),
    /// The client went away, or the job host stops, so no one reads the answer.
    Cancelled,
    Failed(AnyError),
}

impl From<AnyError> for JobError {
    fn from(error: AnyError) -> Self {
        Self::Failed(error)
    }
}

/// Runs jobs. The routes use this trait, so that the tests can use a fake.
pub trait Jobs {
    /// Runs one job. `cancelled` completes when the client goes away or the job host stops.
    fn run(&self, job: Job, cancelled: LocalFuture<'static, ()>) -> LocalFuture<'_, Result<JobOutcome, JobError>>;
}

/// Runs the job in a new VM, and deletes the VM when the job ends.
pub struct SandboxJobs {
    vms: Vms,
    has_undeleted_vm: Cell<bool>,
}

impl SandboxJobs {
    #[must_use]
    pub const fn new(vms: Vms) -> Self {
        Self {
            vms,
            has_undeleted_vm: Cell::new(false),
        }
    }

    /// True when the VM of the job could not be deleted. The job host then exits with an error after it clears the
    /// Provider home, because a Job pod is never restarted.
    #[must_use]
    pub const fn has_undeleted_vm(&self) -> bool {
        self.has_undeleted_vm.get()
    }
}

impl Jobs for SandboxJobs {
    fn run(&self, job: Job, cancelled: LocalFuture<'static, ()>) -> LocalFuture<'_, Result<JobOutcome, JobError>> {
        Box::pin(async move {
            let vm = self.vms.start().await?;
            let outcome = tokio::select! {
                outcome = run_in_vm(&vm, &job) => outcome,
                () = cancelled => Err(JobError::Cancelled),
            };
            if let Err(error) = vm.delete().await {
                // The command has ended, so the outcome is still valid. The job host stops after this job.
                tracing::error!(%error, "could not delete the VM of the job");
                self.has_undeleted_vm.set(true);
            }
            outcome
        })
    }
}

async fn run_in_vm(vm: &Vm, job: &Job) -> Result<JobOutcome, JobError> {
    prepare_app(vm, job).await?;
    let command = vm
        .run_script(UPGRADE_SCRIPT, job.deadline, UPGRADE_OUTPUT_LIMITS)
        .await?;
    let patch = patch_of(vm, command.ending).await?;
    Ok(to_outcome(&command, patch.as_deref()))
}

async fn prepare_app(vm: &Vm, job: &Job) -> Result<(), JobError> {
    vm.write_file(ARCHIVE_PATH, job.archive.clone()).await?;
    let deadline = job.deadline.min(Instant::now() + PREPARE_TIMEOUT);
    let prepared = vm.run_script(PREPARE_SCRIPT, deadline, STEP_OUTPUT_LIMITS).await?;
    if prepared.ending == Ending::Exited(0) {
        Ok(())
    } else {
        Err(JobError::InvalidArchive(to_text(&prepared.stderr)))
    }
}

/// An upgrade that timed out has no patch, because its changes are not complete.
async fn patch_of(vm: &Vm, ending: Ending) -> Result<Option<Vec<u8>>, AnyError> {
    if ending == Ending::TimedOut {
        return Ok(None);
    }
    read_patch(vm).await.map(Some)
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

fn to_outcome(command: &Collected, patch: Option<&[u8]>) -> JobOutcome {
    let exit_code = match command.ending {
        Ending::Exited(code) => Some(code),
        Ending::TimedOut => None,
    };
    JobOutcome {
        exit_code,
        timed_out: exit_code.is_none(),
        stdout: to_text(&command.stdout),
        stderr: to_text(&command.stderr),
        patch: patch.map(|patch| STANDARD.encode(patch)),
    }
}

/// Output as text. Bytes that are not UTF-8 become U+FFFD, and a note marks output that was cut.
fn to_text(captured: &Captured) -> String {
    let text = String::from_utf8_lossy(captured.bytes());
    if captured.is_cut() {
        format!("{text}\n[The runner cut the output here.]")
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
    use tokio::time::Instant;

    use super::{UPGRADE_OUTPUT_LIMITS, to_outcome};
    use crate::output::{Collected, collect};

    async fn collected(events: Vec<ExecutionEvent>) -> Result<Collected, AnyError> {
        let mut events: ExecutionEventStream =
            Box::pin(stream::iter(events.into_iter().map(Ok)).chain(stream::pending()));
        collect(
            &mut events,
            Instant::now() + Duration::from_secs(1),
            UPGRADE_OUTPUT_LIMITS,
        )
        .await
    }

    #[tokio::test]
    async fn answers_with_the_exit_code_the_output_and_the_patch_as_base64() -> Result<(), AnyError> {
        let command = collected(vec![
            ExecutionEvent::Stdout(Bytes::from_static(b"{}")),
            ExecutionEvent::Stderr(Bytes::from_static(b"warn \xff")),
            ExecutionEvent::Exited(ExitStatus { code: 3 }),
        ])
        .await?;

        let outcome = to_outcome(&command, Some(b"diff\n"));

        assert_eq!(outcome.exit_code, Some(3));
        assert!(!outcome.timed_out);
        assert_eq!(outcome.stdout, "{}");
        assert_eq!(outcome.stderr, "warn \u{fffd}");
        assert_eq!(outcome.patch.as_deref(), Some("ZGlmZgo="));
        Ok(())
    }

    #[tokio::test(start_paused = true)]
    async fn answers_without_an_exit_code_when_the_command_timed_out() -> Result<(), AnyError> {
        let command = collected(vec![ExecutionEvent::Stdout(Bytes::from_static(b"so far"))]).await?;

        let outcome = to_outcome(&command, None);

        assert_eq!(outcome.exit_code, None);
        assert!(outcome.timed_out);
        assert_eq!(outcome.stdout, "so far");
        assert_eq!(outcome.patch, None);
        Ok(())
    }
}
