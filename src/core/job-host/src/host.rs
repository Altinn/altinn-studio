use std::{fmt, future, mem, rc::Rc, time::Duration};

use bytes::Bytes;
use serde::Serialize;
use tokio::{sync::watch, time::Instant};
use tokio_util::sync::CancellationToken;

use crate::run::{Command, Outcome, Run, RunError, Runner};

/// The id that the client gives a run: a UUID in the form with hyphens. The job host compares run ids in lower case.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RunId(String);

impl RunId {
    /// Returns `None` if `text` is not a UUID in the form with hyphens.
    #[must_use]
    pub fn parse(text: &str) -> Option<Self> {
        let is_uuid = text.len() == 36
            && text.bytes().enumerate().all(|(index, byte)| match index {
                8 | 13 | 18 | 23 => byte == b'-',
                _ => byte.is_ascii_hexdigit(),
            });
        is_uuid.then(|| Self(text.to_ascii_lowercase()))
    }

    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for RunId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    /// The command runs, or the VM starts.
    Running,
    /// The command ran. The result has its exit code, also when the command failed or timed out.
    Completed,
    /// The job host could not run the command.
    Failed,
}

/// The answer to a request for the result.
#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum Reply {
    Running,
    Completed(Outcome),
    Failed { error: String },
}

impl Reply {
    const fn status(&self) -> Status {
        match self {
            Self::Running => Status::Running,
            Self::Completed(_) => Status::Completed,
            Self::Failed { .. } => Status::Failed,
        }
    }
}

/// The status of a run without its output. A client can follow the run with it, because it does not count as the
/// fetch.
#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "lowercase", rename_all_fields = "camelCase")]
enum Summary<'a> {
    Running,
    Completed { exit_code: Option<i32>, timed_out: bool },
    Failed { error: &'a str },
}

impl<'a> From<&'a Reply> for Summary<'a> {
    fn from(reply: &'a Reply) -> Self {
        match reply {
            Reply::Running => Self::Running,
            Reply::Completed(outcome) => Self::Completed {
                exit_code: outcome.exit_code,
                timed_out: outcome.timed_out,
            },
            Reply::Failed { error } => Self::Failed { error },
        }
    }
}

/// What the job host answers about the run that claimed it.
#[derive(Debug, Eq, PartialEq)]
pub enum Answer {
    Running,
    /// The run ended. The body is JSON: the [`Reply`] for the result, or its summary for the status.
    Ended(Bytes),
}

/// What [`Host::start`] did.
#[derive(Debug, Eq, PartialEq)]
pub enum Start {
    /// The run claimed the job host, and its command starts.
    Started,
    /// This run claimed the job host before. The run has this status.
    AlreadyClaimed(Status),
    /// Another run claimed the job host.
    ClaimedByOther,
    Stopping,
}

/// The state of the one run that the job host serves.
///
/// The first request that delivers a complete archive claims the job host for its run id. The run continues when the
/// client goes away. The job host keeps the result until a client fetches it.
pub struct Host {
    state: watch::Sender<State>,
    runner: Rc<dyn Runner>,
    stopping: CancellationToken,
}

#[derive(Default)]
struct State {
    phase: Phase,
    /// The number of archives that arrive now. The job host does not stop as unclaimed while an archive arrives.
    uploads: usize,
}

#[derive(Default)]
enum Phase {
    #[default]
    Unclaimed,
    Running(RunId),
    Ended(Ended),
}

struct Ended {
    run_id: RunId,
    status: Status,
    /// The JSON of the [`Reply`].
    body: Bytes,
    /// The JSON of the [`Summary`].
    summary: Bytes,
    at: Instant,
    fetched: bool,
}

impl Phase {
    fn status_of(&self, run_id: &RunId) -> Option<Status> {
        match self {
            Self::Running(claimed) if claimed == run_id => Some(Status::Running),
            Self::Ended(ended) if &ended.run_id == run_id => Some(ended.status),
            _ => None,
        }
    }

    fn summary_of(&self, run_id: &RunId) -> Option<Answer> {
        match self {
            Self::Running(claimed) if claimed == run_id => Some(Answer::Running),
            Self::Ended(ended) if &ended.run_id == run_id => Some(Answer::Ended(ended.summary.clone())),
            _ => None,
        }
    }
}

/// Counts an archive that arrives, until the guard is dropped.
pub struct Upload<'a>(&'a Host);

impl Drop for Upload<'_> {
    fn drop(&mut self) {
        self.0
            .state
            .send_modify(|state| state.uploads = state.uploads.saturating_sub(1));
    }
}

impl Host {
    #[must_use]
    pub fn new(runner: Rc<dyn Runner>) -> Rc<Self> {
        Rc::new(Self {
            state: watch::Sender::new(State::default()),
            runner,
            stopping: CancellationToken::new(),
        })
    }

    /// Tells the job host to stop. A running command stops, and the job host starts no new run.
    pub fn stop(&self) {
        self.stopping.cancel();
    }

    #[must_use]
    pub fn is_stopping(&self) -> bool {
        self.stopping.is_cancelled()
    }

    pub async fn stopped(&self) {
        self.stopping.cancelled().await;
    }

    #[must_use]
    pub fn upload(&self) -> Upload<'_> {
        self.state.send_modify(|state| state.uploads += 1);
        Upload(self)
    }

    #[must_use]
    pub fn is_claimed(&self) -> bool {
        !matches!(self.state.borrow().phase, Phase::Unclaimed)
    }

    /// Returns the status of the run, or `None` if this run id did not claim the job host.
    #[must_use]
    pub fn status_of(&self, run_id: &RunId) -> Option<Status> {
        self.state.borrow().phase.status_of(run_id)
    }

    /// Claims the job host for the run and starts the run in its own task. The run does not depend on the request
    /// that started it.
    pub fn start(self: &Rc<Self>, run_id: &RunId, command: Command, archive: Bytes) -> Start {
        if self.is_stopping() {
            return Start::Stopping;
        }
        let mut start = Start::Started;
        self.state.send_if_modified(|state| {
            if matches!(state.phase, Phase::Unclaimed) {
                state.phase = Phase::Running(run_id.clone());
                return true;
            }
            start = state
                .phase
                .status_of(run_id)
                .map_or(Start::ClaimedByOther, Start::AlreadyClaimed);
            false
        });
        if start == Start::Started {
            tracing::info!(%run_id, command = command.name(), archive_bytes = archive.len(), "the run starts");
            let run = Run {
                command,
                archive,
                deadline: Instant::now() + command.timeout(),
            };
            tokio::task::spawn_local(self.clone().run_to_end(run_id.clone(), run));
        }
        start
    }

    /// Returns the result of the run, or `None` if this run id did not claim the job host. While the command runs,
    /// waits up to `wait` for the end of the run. The first answer with the end of the run counts as the fetch.
    pub async fn result(&self, run_id: &RunId, wait: Duration) -> Option<Answer> {
        self.wait_while_running(run_id, wait).await?;
        self.fetch(run_id)
    }

    /// Returns the status of the run without its output, or `None` if this run id did not claim the job host. While
    /// the command runs, waits up to `wait` for the end of the run. The answer does not count as the fetch.
    pub async fn summary(&self, run_id: &RunId, wait: Duration) -> Option<Answer> {
        self.wait_while_running(run_id, wait).await?;
        self.state.borrow().phase.summary_of(run_id)
    }

    /// Waits up to `wait` while the command of the run runs. Returns `None` if this run id did not claim the job host.
    async fn wait_while_running(&self, run_id: &RunId, wait: Duration) -> Option<()> {
        if self.status_of(run_id)? == Status::Running {
            // When the job host stops, the run ends at once, so this wait also ends.
            tokio::select! {
                () = self.idle() => {}
                () = tokio::time::sleep(wait) => {}
            }
        }
        Some(())
    }

    /// Completes when a run claimed the job host, or when no archive arrives. The time to wait for a run uses this, so
    /// that it does not stop the job host while an archive arrives.
    pub async fn claimed_or_idle(&self) {
        self.wait_until(|state| !matches!(state.phase, Phase::Unclaimed) || state.uploads == 0)
            .await;
    }

    /// Completes when the run ended, with the time when it ended.
    pub async fn ended(&self) -> Instant {
        self.wait_for(|state| match &state.phase {
            Phase::Ended(ended) => Some(ended.at),
            _ => None,
        })
        .await
    }

    /// Completes when a client fetched the result of the ended run.
    pub async fn fetched(&self) {
        self.wait_until(|state| matches!(&state.phase, Phase::Ended(ended) if ended.fetched))
            .await;
    }

    /// Completes when no command runs.
    pub async fn idle(&self) {
        self.wait_until(|state| !matches!(state.phase, Phase::Running(_))).await;
    }

    async fn wait_until(&self, mut condition: impl FnMut(&State) -> bool) {
        self.wait_for(|state| condition(state).then_some(())).await;
    }

    /// Waits until `pick` returns a value for the state.
    async fn wait_for<T>(&self, mut pick: impl FnMut(&State) -> Option<T>) -> T {
        let mut changes = self.state.subscribe();
        loop {
            let picked = pick(&changes.borrow_and_update());
            if let Some(value) = picked {
                return value;
            }
            // The host owns the sender, so the channel stays open while the host waits.
            if changes.changed().await.is_err() {
                return future::pending().await;
            }
        }
    }

    fn fetch(&self, run_id: &RunId) -> Option<Answer> {
        let mut answer = None;
        self.state.send_if_modified(|state| match &mut state.phase {
            Phase::Running(claimed) if claimed == run_id => {
                answer = Some(Answer::Running);
                false
            }
            Phase::Ended(ended) if &ended.run_id == run_id => {
                answer = Some(Answer::Ended(ended.body.clone()));
                if !ended.fetched {
                    tracing::info!(%run_id, "a client fetched the result");
                }
                !mem::replace(&mut ended.fetched, true)
            }
            _ => false,
        });
        answer
    }

    /// Runs the command and keeps its result. When the command ends, the job host deletes the VM at once. When the
    /// job host stops during the run, the job host deletes the VM later, before it exits.
    async fn run_to_end(self: Rc<Self>, run_id: RunId, run: Run) {
        let ran = tokio::select! {
            ran = self.runner.run(run) => Some(ran),
            () = self.stopping.cancelled() => None,
        };
        let reply = match ran {
            Some(ran) => {
                if let Err(error) = self.runner.delete_vm().await {
                    tracing::error!(%error, "could not delete the VM. The job host tries again before it exits");
                }
                reply_of(ran)
            }
            None => Reply::Failed {
                error: "The job host stopped before the command ended.".to_string(),
            },
        };
        self.end(&run_id, &reply);
    }

    fn end(&self, run_id: &RunId, reply: &Reply) {
        match reply {
            Reply::Completed(outcome) => {
                tracing::info!(%run_id, exit_code = ?outcome.exit_code, timed_out = outcome.timed_out, "the run ended");
            }
            Reply::Failed { error } => tracing::error!(%run_id, %error, "the run failed"),
            Reply::Running => {}
        }
        let failed;
        let (reply, body) = match serde_json::to_vec(reply) {
            Ok(body) => (reply, body),
            Err(error) => {
                failed = Reply::Failed {
                    error: format!("The job host could not write the result: {error}"),
                };
                (&failed, serde_json::to_vec(&failed).unwrap_or_default())
            }
        };
        let status = reply.status();
        let body = Bytes::from(body);
        let summary = Bytes::from(serde_json::to_vec(&Summary::from(reply)).unwrap_or_default());
        self.state.send_modify(|state| {
            state.phase = match mem::take(&mut state.phase) {
                Phase::Running(run_id) => Phase::Ended(Ended {
                    run_id,
                    status,
                    body,
                    summary,
                    at: Instant::now(),
                    fetched: false,
                }),
                phase => phase,
            };
        });
    }
}

fn reply_of(ran: Result<Outcome, RunError>) -> Reply {
    match ran {
        Ok(outcome) => Reply::Completed(outcome),
        Err(RunError::InvalidArchive(detail)) => Reply::Failed {
            error: format!("The archive does not extract: {detail}"),
        },
        Err(RunError::RefusedPatch(refusal)) => Reply::Failed {
            error: format!("The job host refused the changes of the command: {refusal}"),
        },
        Err(RunError::Failed(error)) => Reply::Failed {
            error: error.to_string(),
        },
    }
}

#[cfg(test)]
mod tests {
    use std::{io, rc::Rc, time::Duration};

    use bytes::Bytes;
    use futures_util::FutureExt as _;
    use serde_json::{Value, json};

    use super::{Answer, Host, Reply, RunId, Start, Status, Summary};
    use crate::{
        fake::{FakeRunner, RUN_ID},
        run::{Command, Outcome, RunError},
    };

    fn run_id() -> RunId {
        RunId::parse(RUN_ID).expect("RUN_ID is a UUID")
    }

    fn host(runner: &Rc<FakeRunner>) -> Rc<Host> {
        Host::new(runner.clone())
    }

    async fn result(host: &Host) -> Result<Value, Box<dyn std::error::Error>> {
        ended(host.result(&run_id(), Duration::from_secs(30)).await)
    }

    async fn summary(host: &Host) -> Result<Value, Box<dyn std::error::Error>> {
        ended(host.summary(&run_id(), Duration::from_secs(30)).await)
    }

    fn ended(answer: Option<Answer>) -> Result<Value, Box<dyn std::error::Error>> {
        match answer {
            Some(Answer::Ended(body)) => Ok(serde_json::from_slice(&body)?),
            other => Err(format!("the run did not end: {other:?}").into()),
        }
    }

    #[test]
    fn accepts_only_uuids_as_run_ids() {
        let upper = RunId::parse("0B6F3C1E-8D2A-4F5B-9C7E-1A2B3C4D5E6F");
        assert_eq!(
            upper.as_ref().map(RunId::as_str),
            Some("0b6f3c1e-8d2a-4f5b-9c7e-1a2b3c4d5e6f")
        );
        assert_eq!(upper, RunId::parse("0b6f3c1e-8d2a-4f5b-9c7e-1a2b3c4d5e6f"));
        for invalid in [
            "",
            "run",
            "0b6f3c1e8d2a4f5b9c7e1a2b3c4d5e6f",
            "0b6f3c1e-8d2a-4f5b-9c7e-1a2b3c4d5e6",
            "0b6f3c1e-8d2a-4f5b-9c7e-1a2b3c4d5e6fa",
            "0b6f3c1e-8d2a-4f5b-9c7e_1a2b3c4d5e6f",
            "0b6f3c1e-8d2a-4f5b-9c7e-1a2b3c4d5e6g",
            "../../../../../../../../../../../etc",
        ] {
            assert_eq!(RunId::parse(invalid), None, "{invalid}");
        }
    }

    #[tokio::test(flavor = "local")]
    async fn answers_with_the_outcome_and_deletes_the_vm_before() -> Result<(), Box<dyn std::error::Error>> {
        let runner = Rc::new(FakeRunner::default());
        let host = host(&runner);

        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        let result = result(&host).await?;

        assert_eq!(
            result,
            json!({
                "status": "completed", "exitCode": 0, "timedOut": false, "stdout": "", "stderr": "",
                "report": { "exitCode": 0 }, "patch": "ZGlmZgo="
            })
        );
        assert_eq!(runner.deletes.get(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn reports_a_failure_to_run_the_command() -> Result<(), Box<dyn std::error::Error>> {
        for (error, expected) in [
            (
                RunError::InvalidArchive("gzip: invalid header".to_string()),
                "The archive does not extract: gzip: invalid header",
            ),
            (
                RunError::Failed(io::Error::other("the VM did not start").into()),
                "the VM did not start",
            ),
        ] {
            let runner = Rc::new(FakeRunner::default());
            *runner.error.borrow_mut() = Some(error);
            let host = host(&runner);
            assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);

            assert_eq!(summary(&host).await?, json!({ "status": "failed", "error": expected }));
            assert_eq!(result(&host).await?, json!({ "status": "failed", "error": expected }));
            assert_eq!(host.status_of(&run_id()), Some(Status::Failed));
            assert_eq!(runner.deletes.get(), 1);
        }
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_the_status_without_the_output_and_without_a_fetch() -> Result<(), Box<dyn std::error::Error>> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = host(&runner);
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        runner.started.notified().await;

        let running = host.summary(&run_id(), Duration::ZERO).await;
        runner.release.notify_one();
        let completed = summary(&host).await?;
        let not_fetched = host.fetched().now_or_never().is_none();
        result(&host).await?;

        assert_eq!(running, Some(Answer::Running));
        assert_eq!(
            completed,
            json!({ "status": "completed", "exitCode": 0, "timedOut": false })
        );
        assert!(not_fetched, "a status read counted as the fetch");
        assert!(host.fetched().now_or_never().is_some());
        Ok(())
    }

    #[test]
    fn summarizes_a_command_that_timed_out_without_an_exit_code() -> serde_json::Result<()> {
        let reply = Reply::Completed(Outcome {
            exit_code: None,
            timed_out: true,
            stdout: "output".to_string(),
            stderr: String::new(),
            report: None,
            patch: None,
        });

        let summary = serde_json::to_value(Summary::from(&reply))?;

        assert_eq!(
            summary,
            json!({ "status": "completed", "exitCode": null, "timedOut": true })
        );
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn starts_one_run_only() {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = host(&runner);
        let other = RunId::parse("11111111-2222-3333-4444-555555555555").expect("a UUID");

        let first = host.start(&run_id(), Command::UpgradeV9, Bytes::new());
        runner.started.notified().await;
        let again = host.start(&run_id(), Command::UpgradeV9, Bytes::new());
        let by_other = host.start(&other, Command::UpgradeV9, Bytes::new());
        runner.release.notify_one();
        host.ended().await;
        let after = host.start(&run_id(), Command::UpgradeV9, Bytes::new());

        assert_eq!(first, Start::Started);
        assert_eq!(again, Start::AlreadyClaimed(Status::Running));
        assert_eq!(by_other, Start::ClaimedByOther);
        assert_eq!(after, Start::AlreadyClaimed(Status::Completed));
        assert_eq!(runner.archives.borrow().len(), 1);
        assert_eq!(host.result(&other, Duration::ZERO).await, None);
        assert_eq!(host.summary(&other, Duration::ZERO).await, None);
    }

    #[tokio::test(flavor = "local")]
    async fn stops_the_command_when_the_job_host_stops() -> Result<(), Box<dyn std::error::Error>> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = host(&runner);
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        runner.started.notified().await;

        host.stop();

        assert_eq!(
            result(&host).await?,
            json!({ "status": "failed", "error": "The job host stopped before the command ended." })
        );
        // The job host deletes the VM before it exits.
        assert_eq!(runner.deletes.get(), 0);
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Stopping);
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn waits_for_the_end_of_the_run_up_to_the_wait() {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = host(&runner);
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        runner.started.notified().await;

        let started = tokio::time::Instant::now();
        let running = host.result(&run_id(), Duration::from_secs(20)).await;
        assert_eq!(running, Some(Answer::Running));
        assert_eq!(started.elapsed(), Duration::from_secs(20));

        let waiting = {
            let host = host.clone();
            tokio::task::spawn_local(async move { host.result(&run_id(), Duration::from_secs(20)).await })
        };
        tokio::time::sleep(Duration::from_secs(3)).await;
        runner.release.notify_one();
        let ended = waiting.await.ok().flatten();

        assert!(matches!(ended, Some(Answer::Ended(_))), "{ended:?}");
        assert_eq!(started.elapsed(), Duration::from_secs(23));
    }
}
