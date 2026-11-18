use std::{fmt, future, mem, rc::Rc, time::Duration};

use bytes::Bytes;
use sandbox_hosting::AnyError;
use tokio::{sync::watch, time::Instant};
use tokio_util::sync::CancellationToken;

use crate::{
    protocol::{Reply, Status},
    run::{Command, Run, Runner},
};

/// The id that the client gives a run. It is a UUID with hyphens. The operator runner compares run ids in lower case.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RunId(String);

impl RunId {
    /// Returns `None` if `text` is not a UUID with hyphens.
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

/// What the operator runner answers about the run that claimed it.
#[derive(Debug, Eq, PartialEq)]
pub enum Answer {
    Running,
    Ended(Rc<Reply>),
}

/// What [`Host::start`] did.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Start {
    /// The run claimed the operator runner, and its command starts.
    Started,
    /// This run claimed the operator runner before. The run has this status.
    AlreadyClaimed(Status),
    ClaimedByOther,
    Stopping,
}

/// The reason why the operator runner stops.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Stop {
    /// A client fetched the result, and the grace after the first fetch passed.
    Fetched,
    /// No client fetched the result within the retention. For example, the operator stopped and did not come back.
    Expired,
    /// No run claimed the operator runner in time. For example, the operator stopped before it sent the archive.
    Unclaimed,
    /// A signal told the operator runner to stop. For example, the operator deleted the Job.
    Signaled,
}

/// The times that decide when the operator runner stops.
#[derive(Clone, Copy, Debug)]
pub struct Timeouts {
    /// The time from when the operator runner is ready until a run must claim it.
    pub request: Duration,
    /// The time from the end of the run that the operator runner keeps a result that no client fetched.
    pub retention: Duration,
    /// The time after the first fetch that the operator runner keeps the result, so that a client that restarted can
    /// fetch it again.
    pub grace: Duration,
}

/// The one run that the operator runner serves, from its claim until the operator runner exits. The first request that
/// delivers a complete archive claims the operator runner for its run id.
pub struct Host {
    state: watch::Sender<State>,
    runner: Rc<dyn Runner>,
    stopping: CancellationToken,
}

#[derive(Default)]
struct State {
    phase: Phase,
    /// The number of archives that arrive now. The operator runner does not stop as unclaimed while an archive arrives.
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
    reply: Rc<Reply>,
    at: Instant,
    fetched: bool,
}

impl Phase {
    fn status_of(&self, run_id: &RunId) -> Option<Status> {
        match self {
            Self::Running(claimed) if claimed == run_id => Some(Status::Running),
            Self::Ended(ended) if &ended.run_id == run_id => Some(ended.reply.status()),
            _ => None,
        }
    }

    fn answer_of(&self, run_id: &RunId) -> Option<Answer> {
        match self {
            Self::Running(claimed) if claimed == run_id => Some(Answer::Running),
            Self::Ended(ended) if &ended.run_id == run_id => Some(Answer::Ended(ended.reply.clone())),
            _ => None,
        }
    }
}

/// Counts an archive that arrives, until the caller drops the guard.
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

    /// Tells the operator runner to stop. A running command stops, and the operator runner starts no new run.
    pub fn stop(&self) {
        self.stopping.cancel();
    }

    fn is_stopping(&self) -> bool {
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

    /// Returns the status of the run, or `None` if this run id did not claim the operator runner.
    fn status_of(&self, run_id: &RunId) -> Option<Status> {
        self.state.borrow().phase.status_of(run_id)
    }

    /// Returns what a start of this run gets instead of a claim, or `None` if the run can claim the operator runner.
    /// The routes call it before they read the archive.
    #[must_use]
    pub fn refusal(&self, run_id: &RunId) -> Option<Start> {
        if self.is_stopping() {
            return Some(Start::Stopping);
        }
        self.is_claimed().then(|| {
            self.status_of(run_id)
                .map_or(Start::ClaimedByOther, Start::AlreadyClaimed)
        })
    }

    /// Claims the operator runner for the run and starts the run in its own task, unless [`Host::refusal`] refuses it.
    /// The run does not depend on the request that started it.
    pub fn start(self: &Rc<Self>, run_id: &RunId, command: Command, timeout: Duration, archive: Bytes) -> Start {
        if let Some(refused) = self.refusal(run_id) {
            return refused;
        }
        self.state
            .send_modify(|state| state.phase = Phase::Running(run_id.clone()));
        tracing::info!(%run_id, command = command.name(), archive_bytes = archive.len(), "the run starts");
        let run = Run {
            command,
            archive,
            deadline: Instant::now() + timeout,
        };
        tokio::task::spawn_local(self.clone().run_to_end(run_id.clone(), run));
        Start::Started
    }

    /// Returns the result of the run, or `None` if this run id did not claim the operator runner. While the command
    /// runs, waits up to `wait` for the end of the run. The first answer with the end of the run counts as the fetch.
    pub async fn result(&self, run_id: &RunId, wait: Duration) -> Option<Answer> {
        self.wait_while_running(run_id, wait).await?;
        self.fetch(run_id)
    }

    /// Returns the result of the run as [`Host::result`] does, but the answer does not count as the fetch.
    pub async fn status(&self, run_id: &RunId, wait: Duration) -> Option<Answer> {
        self.wait_while_running(run_id, wait).await?;
        self.state.borrow().phase.answer_of(run_id)
    }

    /// Waits up to `wait` while the command of the run runs. Returns `None` if this run id did not claim the operator
    /// runner.
    async fn wait_while_running(&self, run_id: &RunId, wait: Duration) -> Option<()> {
        if self.status_of(run_id)? == Status::Running {
            // When the operator runner stops, the run ends at once, so this wait also ends.
            tokio::select! {
                () = self.idle() => {}
                () = tokio::time::sleep(wait) => {}
            }
        }
        Some(())
    }

    /// Serves the run until the operator runner must stop, and then deletes the VM. The operator runner refuses new
    /// runs from then on.
    ///
    /// When `signal` completes, this stops the running command, and waits until the run has its result.
    ///
    /// # Errors
    ///
    /// Returns an error if the operator runner cannot delete the VM.
    pub async fn serve_until_stop(
        &self,
        timeouts: Timeouts,
        signal: impl Future<Output = ()>,
    ) -> Result<Stop, AnyError> {
        let stop = tokio::select! {
            stop = self.served(timeouts) => stop,
            () = self.unclaimed_after(timeouts.request) => Stop::Unclaimed,
            () = signal => {
                self.stop();
                self.idle().await;
                Stop::Signaled
            }
        };
        self.stop();
        if stop == Stop::Expired {
            tracing::warn!("no client fetched the result in time, so the operator runner stops");
        } else {
            tracing::info!(?stop, "the operator runner stops");
        }
        // The run deletes its VM when the command ends. The operator runner deletes the VM again here, because a signal
        // stops the run before that, and because that delete can fail.
        self.runner.delete_vm().await.map(|()| stop)
    }

    /// Completes when a client fetched the result and the grace passed, or when the retention of the result passed.
    async fn served(&self, timeouts: Timeouts) -> Stop {
        let ended_at = self.ended().await;
        tokio::select! {
            () = self.fetched() => {
                tokio::time::sleep(timeouts.grace).await;
                Stop::Fetched
            }
            () = tokio::time::sleep_until(ended_at + timeouts.retention) => Stop::Expired,
        }
    }

    /// Completes after `timeout` if no run claimed the operator runner. It waits for an archive that arrives then.
    async fn unclaimed_after(&self, timeout: Duration) {
        tokio::time::sleep(timeout).await;
        self.claimed_or_idle().await;
        if self.is_claimed() {
            future::pending::<()>().await;
        }
    }

    /// Completes when a run claimed the operator runner, or when no archive arrives.
    async fn claimed_or_idle(&self) {
        self.wait_until(|state| !matches!(state.phase, Phase::Unclaimed) || state.uploads == 0)
            .await;
    }

    /// Completes when the run ended, with the time when it ended.
    async fn ended(&self) -> Instant {
        self.wait_for(|state| match &state.phase {
            Phase::Ended(ended) => Some(ended.at),
            _ => None,
        })
        .await
    }

    async fn fetched(&self) {
        self.wait_until(|state| matches!(&state.phase, Phase::Ended(ended) if ended.fetched))
            .await;
    }

    /// Completes when no command runs.
    async fn idle(&self) {
        self.wait_until(|state| !matches!(state.phase, Phase::Running(_))).await;
    }

    async fn wait_until(&self, mut condition: impl FnMut(&State) -> bool) {
        self.wait_for(|state| condition(state).then_some(())).await;
    }

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
                answer = Some(Answer::Ended(ended.reply.clone()));
                if !ended.fetched {
                    tracing::info!(%run_id, "a client fetched the result");
                }
                !mem::replace(&mut ended.fetched, true)
            }
            _ => false,
        });
        answer
    }

    /// Runs the command, deletes the VM and keeps the result. When the operator runner stops during the run,
    /// [`Host::serve_until_stop`] deletes the VM.
    async fn run_to_end(self: Rc<Self>, run_id: RunId, run: Run) {
        let ran = tokio::select! {
            ran = self.runner.run(run) => Some(ran),
            () = self.stopping.cancelled() => None,
        };
        let reply = match ran {
            Some(ran) => {
                if let Err(error) = self.runner.delete_vm().await {
                    tracing::error!(%error, "could not delete the VM. The operator runner tries again before it exits");
                }
                Reply::from(ran)
            }
            None => Reply::Failed {
                error: "The operator runner stopped before the command ended.".to_string(),
            },
        };
        self.end(&run_id, reply);
    }

    fn end(&self, run_id: &RunId, reply: Reply) {
        match &reply {
            Reply::Completed(outcome) => {
                tracing::info!(%run_id, exit_code = ?outcome.exit_code, timed_out = outcome.timed_out, "the run ended");
            }
            Reply::Failed { error } => tracing::error!(%run_id, %error, "the run failed"),
            Reply::Running => {}
        }
        let reply = Rc::new(reply);
        self.state.send_modify(|state| {
            state.phase = match mem::take(&mut state.phase) {
                Phase::Running(run_id) => Phase::Ended(Ended {
                    run_id,
                    reply,
                    at: Instant::now(),
                    fetched: false,
                }),
                phase => phase,
            };
        });
    }
}

#[cfg(test)]
mod tests {
    use std::{future, io, rc::Rc, time::Duration};

    use bytes::Bytes;
    use serde_json::{Value, json};
    use tokio::time::Instant;

    use super::{Answer, Host, RunId, Start, Stop, Timeouts};
    use crate::{
        fake::{FakeRunner, RUN_ID},
        protocol::Status,
        run::{Command, RunError},
    };

    fn run_id() -> RunId {
        RunId::parse(RUN_ID).expect("RUN_ID is a UUID")
    }

    fn start(host: &Rc<Host>, run_id: &RunId) -> Start {
        host.start(run_id, Command::UpgradeV9, Duration::from_mins(11), Bytes::new())
    }

    fn host(runner: &Rc<FakeRunner>) -> Rc<Host> {
        Host::new(runner.clone())
    }

    const TIMEOUTS: Timeouts = Timeouts {
        request: Duration::from_mins(6),
        retention: Duration::from_mins(5),
        grace: Duration::from_secs(30),
    };

    fn waiting_for_stop(
        host: &Rc<Host>,
        signal: impl Future<Output = ()> + 'static,
    ) -> tokio::task::JoinHandle<Option<Stop>> {
        let host = host.clone();
        tokio::task::spawn_local(async move { host.serve_until_stop(TIMEOUTS, signal).await.ok() })
    }

    async fn result(host: &Host) -> Result<Value, Box<dyn std::error::Error>> {
        ended(host.result(&run_id(), Duration::from_secs(30)).await)
    }

    fn ended(answer: Option<Answer>) -> Result<Value, Box<dyn std::error::Error>> {
        match answer {
            Some(Answer::Ended(reply)) => Ok(serde_json::to_value(&*reply)?),
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
            assert_eq!(start(&host, &run_id()), Start::Started);

            assert_eq!(result(&host).await?, json!({ "status": "failed", "error": expected }));
            assert_eq!(host.status_of(&run_id()), Some(Status::Failed));
            assert_eq!(runner.deletes.get(), 1);
        }
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn starts_one_run_only() {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = host(&runner);
        let other = RunId::parse("11111111-2222-3333-4444-555555555555").expect("a UUID");

        let first = start(&host, &run_id());
        runner.started.notified().await;
        let again = start(&host, &run_id());
        let by_other = start(&host, &other);
        runner.release.notify_one();
        host.ended().await;
        let after = start(&host, &run_id());

        assert_eq!(first, Start::Started);
        assert_eq!(again, Start::AlreadyClaimed(Status::Running));
        assert_eq!(by_other, Start::ClaimedByOther);
        assert_eq!(after, Start::AlreadyClaimed(Status::Completed));
        assert_eq!(runner.archives.borrow().len(), 1);
        assert_eq!(host.result(&other, Duration::ZERO).await, None);
        assert_eq!(host.status(&other, Duration::ZERO).await, None);
    }

    #[tokio::test(flavor = "local")]
    async fn stops_the_command_when_the_operator_runner_stops() -> Result<(), Box<dyn std::error::Error>> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = host(&runner);
        assert_eq!(start(&host, &run_id()), Start::Started);
        runner.started.notified().await;

        host.stop();

        assert_eq!(
            result(&host).await?,
            json!({ "status": "failed", "error": "The operator runner stopped before the command ended." })
        );
        assert_eq!(start(&host, &run_id()), Start::Stopping);
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn waits_for_the_end_of_the_run_up_to_the_wait() {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = host(&runner);
        assert_eq!(start(&host, &run_id()), Start::Started);
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

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn stops_when_no_run_claims_it_in_time() {
        let host = Host::new(Rc::new(FakeRunner::default()));
        let started = Instant::now();

        let stop = host.serve_until_stop(TIMEOUTS, future::pending()).await.ok();

        assert_eq!(stop, Some(Stop::Unclaimed));
        assert_eq!(started.elapsed(), TIMEOUTS.request);
        assert!(host.is_stopping());
        assert_eq!(start(&host, &run_id()), Start::Stopping);
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn waits_for_an_archive_that_arrives_at_the_request_timeout() -> Result<(), tokio::task::JoinError> {
        let host = Host::new(Rc::new(FakeRunner::default()));
        let waiting = waiting_for_stop(&host, future::pending());
        let upload = host.upload();

        tokio::time::sleep(TIMEOUTS.request * 2).await;
        assert!(!waiting.is_finished());
        drop(upload);

        assert_eq!(waiting.await?, Some(Stop::Unclaimed));
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn waits_for_a_claimed_run_past_the_request_timeout() -> Result<(), tokio::task::JoinError> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = Host::new(runner.clone());
        let waiting = waiting_for_stop(&host, future::pending());
        let upload = host.upload();
        assert_eq!(start(&host, &run_id()), Start::Started);
        drop(upload);

        tokio::time::sleep(TIMEOUTS.request + TIMEOUTS.retention).await;
        assert!(!waiting.is_finished());
        runner.release.notify_one();
        host.ended().await;
        assert!(matches!(
            host.result(&run_id(), Duration::ZERO).await,
            Some(Answer::Ended(_))
        ));

        assert_eq!(waiting.await?, Some(Stop::Fetched));
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn serves_the_result_for_the_grace_after_the_first_fetch() -> Result<(), tokio::task::JoinError> {
        let host = Host::new(Rc::new(FakeRunner::default()));
        let waiting = waiting_for_stop(&host, future::pending());
        assert_eq!(start(&host, &run_id()), Start::Started);
        host.ended().await;
        tokio::time::sleep(Duration::from_mins(1)).await;

        let first = host.result(&run_id(), Duration::ZERO).await;
        let fetched_at = Instant::now();
        tokio::time::sleep(Duration::from_secs(29)).await;
        assert!(!waiting.is_finished());
        let again = host.result(&run_id(), Duration::ZERO).await;

        assert!(matches!(first, Some(Answer::Ended(_))), "{first:?}");
        assert_eq!(first, again);
        assert_eq!(waiting.await?, Some(Stop::Fetched));
        assert_eq!(fetched_at.elapsed(), TIMEOUTS.grace);
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn does_not_count_a_status_read_as_the_fetch() -> Result<(), tokio::task::JoinError> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = Host::new(runner.clone());
        let waiting = waiting_for_stop(&host, future::pending());
        assert_eq!(start(&host, &run_id()), Start::Started);
        runner.started.notified().await;

        let running = host.status(&run_id(), Duration::from_secs(30)).await;
        runner.release.notify_one();
        let mut ended = Vec::new();
        for _ in 0..4 {
            ended.push(host.status(&run_id(), Duration::from_secs(30)).await);
            tokio::time::sleep(Duration::from_mins(1)).await;
        }
        let ended_at = host.ended().await;

        assert_eq!(running, Some(Answer::Running));
        assert!(
            ended.iter().all(|answer| matches!(answer, Some(Answer::Ended(_)))),
            "{ended:?}"
        );
        assert_eq!(waiting.await?, Some(Stop::Expired));
        assert_eq!(ended_at.elapsed(), TIMEOUTS.retention);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn stops_at_once_on_a_signal_when_no_run_runs() {
        let host = Host::new(Rc::new(FakeRunner::default()));

        let stop = host.serve_until_stop(TIMEOUTS, future::ready(())).await.ok();

        assert_eq!(stop, Some(Stop::Signaled));
        assert!(host.is_stopping());
    }

    #[tokio::test(flavor = "local")]
    async fn stops_the_running_command_on_a_signal_and_waits_for_its_result() -> Result<(), tokio::task::JoinError> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = Host::new(runner.clone());
        assert_eq!(start(&host, &run_id()), Start::Started);
        runner.started.notified().await;

        let stop = waiting_for_stop(&host, future::ready(())).await?;

        assert_eq!(stop, Some(Stop::Signaled));
        assert_eq!(host.status_of(&run_id()), Some(Status::Failed));
        assert_eq!(
            runner.deletes.get(),
            1,
            "the operator runner deletes the VM of the stopped run before it exits"
        );
        Ok(())
    }
}
