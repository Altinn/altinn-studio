use std::{future, time::Duration};

use crate::host::Host;

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
    /// The time from the first fetch that the operator runner keeps the result, so that a client that restarted can
    /// fetch it again.
    pub grace: Duration,
}

/// Waits until the operator runner must stop. After that, the operator runner refuses new runs.
///
/// When `signal` completes, this function stops the running command, and waits until the run has its result.
pub async fn wait_for_stop(host: &Host, timeouts: Timeouts, signal: impl Future<Output = ()>) -> Stop {
    let stop = tokio::select! {
        stop = served(host, timeouts) => stop,
        () = unclaimed_after(host, timeouts.request) => Stop::Unclaimed,
        () = signal => {
            host.stop();
            host.idle().await;
            Stop::Signaled
        }
    };
    host.stop();
    stop
}

/// Completes when a client fetched the result and the grace passed, or when the retention of the result passed.
async fn served(host: &Host, timeouts: Timeouts) -> Stop {
    let ended_at = host.ended().await;
    tokio::select! {
        () = host.fetched() => {
            tokio::time::sleep(timeouts.grace).await;
            Stop::Fetched
        }
        () = tokio::time::sleep_until(ended_at + timeouts.retention) => Stop::Expired,
    }
}

/// Completes after `timeout` if no run claimed the operator runner. If an archive arrives at that time, it waits for
/// the archive. If a run claimed the operator runner, the operator runner continues until the result is served.
async fn unclaimed_after(host: &Host, timeout: Duration) {
    tokio::time::sleep(timeout).await;
    host.claimed_or_idle().await;
    if host.is_claimed() {
        future::pending::<()>().await;
    }
}

#[cfg(test)]
mod tests {
    use std::{future, rc::Rc, time::Duration};

    use bytes::Bytes;
    use tokio::time::Instant;

    use super::{Stop, Timeouts, wait_for_stop};
    use crate::{
        fake::{FakeRunner, RUN_ID},
        host::{Answer, Host, RunId, Start, Status},
        run::Command,
    };

    const TIMEOUTS: Timeouts = Timeouts {
        request: Duration::from_mins(6),
        retention: Duration::from_mins(5),
        grace: Duration::from_secs(30),
    };

    fn run_id() -> RunId {
        RunId::parse(RUN_ID).expect("RUN_ID is a UUID")
    }

    fn waiting_for_stop(host: &Rc<Host>, signal: impl Future<Output = ()> + 'static) -> tokio::task::JoinHandle<Stop> {
        let host = host.clone();
        tokio::task::spawn_local(async move { wait_for_stop(&host, TIMEOUTS, signal).await })
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn stops_when_no_run_claims_it_in_time() {
        let host = Host::new(Rc::new(FakeRunner::default()));
        let started = Instant::now();

        let stop = wait_for_stop(&host, TIMEOUTS, future::pending()).await;

        assert_eq!(stop, Stop::Unclaimed);
        assert_eq!(started.elapsed(), TIMEOUTS.request);
        assert!(host.is_stopping());
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Stopping);
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn waits_for_an_archive_that_arrives_at_the_request_timeout() -> Result<(), tokio::task::JoinError> {
        let host = Host::new(Rc::new(FakeRunner::default()));
        let waiting = waiting_for_stop(&host, future::pending());
        let upload = host.upload();

        tokio::time::sleep(TIMEOUTS.request * 2).await;
        assert!(!waiting.is_finished());
        drop(upload);

        assert_eq!(waiting.await?, Stop::Unclaimed);
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn waits_for_a_claimed_run_past_the_request_timeout() -> Result<(), tokio::task::JoinError> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = Host::new(runner.clone());
        let waiting = waiting_for_stop(&host, future::pending());
        let upload = host.upload();
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        drop(upload);

        tokio::time::sleep(TIMEOUTS.request + TIMEOUTS.retention).await;
        assert!(!waiting.is_finished());
        runner.release.notify_one();
        host.ended().await;
        assert!(matches!(
            host.result(&run_id(), Duration::ZERO).await,
            Some(Answer::Ended(_))
        ));

        assert_eq!(waiting.await?, Stop::Fetched);
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn serves_the_result_for_the_grace_after_the_first_fetch() -> Result<(), tokio::task::JoinError> {
        let host = Host::new(Rc::new(FakeRunner::default()));
        let waiting = waiting_for_stop(&host, future::pending());
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        host.ended().await;
        tokio::time::sleep(Duration::from_mins(1)).await;

        let first = host.result(&run_id(), Duration::ZERO).await;
        let fetched_at = Instant::now();
        tokio::time::sleep(Duration::from_secs(29)).await;
        assert!(!waiting.is_finished());
        let again = host.result(&run_id(), Duration::ZERO).await;

        assert!(matches!(first, Some(Answer::Ended(_))), "{first:?}");
        assert_eq!(first, again);
        assert_eq!(waiting.await?, Stop::Fetched);
        assert_eq!(fetched_at.elapsed(), TIMEOUTS.grace);
        Ok(())
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn does_not_count_a_status_read_as_the_fetch() -> Result<(), tokio::task::JoinError> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = Host::new(runner.clone());
        let waiting = waiting_for_stop(&host, future::pending());
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        runner.started.notified().await;

        let running = host.summary(&run_id(), Duration::from_secs(30)).await;
        runner.release.notify_one();
        let mut ended = Vec::new();
        for _ in 0..4 {
            ended.push(host.summary(&run_id(), Duration::from_secs(30)).await);
            tokio::time::sleep(Duration::from_mins(1)).await;
        }
        let ended_at = host.ended().await;

        assert_eq!(running, Some(Answer::Running));
        assert!(
            ended.iter().all(|answer| matches!(answer, Some(Answer::Ended(_)))),
            "{ended:?}"
        );
        assert_eq!(waiting.await?, Stop::Expired);
        assert_eq!(ended_at.elapsed(), TIMEOUTS.retention);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn stops_at_once_on_a_signal_when_no_run_runs() {
        let host = Host::new(Rc::new(FakeRunner::default()));

        let stop = wait_for_stop(&host, TIMEOUTS, future::ready(())).await;

        assert_eq!(stop, Stop::Signaled);
        assert!(host.is_stopping());
    }

    #[tokio::test(flavor = "local")]
    async fn stops_the_running_command_on_a_signal_and_waits_for_its_result() -> Result<(), tokio::task::JoinError> {
        let runner = Rc::new(FakeRunner::default());
        runner.hold.set(true);
        let host = Host::new(runner.clone());
        assert_eq!(host.start(&run_id(), Command::UpgradeV9, Bytes::new()), Start::Started);
        runner.started.notified().await;

        let stop = waiting_for_stop(&host, future::ready(())).await?;

        assert_eq!(stop, Stop::Signaled);
        assert_eq!(host.status_of(&run_id()), Some(Status::Failed));
        Ok(())
    }
}
