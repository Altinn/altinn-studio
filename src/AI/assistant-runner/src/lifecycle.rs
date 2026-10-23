use std::{cell::Cell, future, rc::Rc, time::Duration};

use tokio_util::sync::{CancellationToken, DropGuard};

/// The job host serves one job. The first job request takes the claim, and the claim is finished when that request
/// has ended.
#[derive(Clone, Default)]
pub struct Claim {
    is_taken: Rc<Cell<bool>>,
    finished: CancellationToken,
}

impl Claim {
    /// Takes the claim, or returns `None` when a request already took it. Dropping the guard finishes the claim.
    #[must_use]
    pub fn take(&self) -> Option<DropGuard> {
        (!self.is_taken.replace(true)).then(|| self.finished.clone().drop_guard())
    }

    #[must_use]
    pub fn is_taken(&self) -> bool {
        self.is_taken.get()
    }

    pub async fn finished(&self) {
        self.finished.cancelled().await;
    }
}

/// Why the job host stops.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Stop {
    /// The job request ended.
    Served,
    /// No job request came in time, for example because the assistant stopped before it sent the app.
    Unclaimed,
    /// A signal asked the job host to stop, for example because the assistant deleted the Job.
    Signaled,
}

/// Waits until the job host must stop. On `signal`, it cancels `stopping`, which stops a running job, and waits until
/// the request of that job has ended.
pub async fn wait_for_stop(
    claim: &Claim,
    stopping: &CancellationToken,
    request_timeout: Duration,
    signal: impl Future<Output = ()>,
) -> Stop {
    tokio::select! {
        () = claim.finished() => Stop::Served,
        () = unclaimed_after(claim, request_timeout) => Stop::Unclaimed,
        () = signal => {
            stopping.cancel();
            if claim.is_taken() {
                claim.finished().await;
            }
            Stop::Signaled
        }
    }
}

/// Completes after `timeout` if no request has taken the claim. A taken claim keeps the job host until its job ends.
async fn unclaimed_after(claim: &Claim, timeout: Duration) {
    tokio::time::sleep(timeout).await;
    if claim.is_taken() {
        future::pending::<()>().await;
    }
}

#[cfg(test)]
mod tests {
    use std::{future, time::Duration};

    use tokio_util::sync::CancellationToken;

    use super::{Claim, Stop, wait_for_stop};

    const REQUEST_TIMEOUT: Duration = Duration::from_mins(2);

    #[test]
    fn gives_the_claim_to_the_first_request_only() {
        let claim = Claim::default();
        let first = claim.take();
        assert!(first.is_some());
        drop(first);
        assert!(claim.take().is_none());
        assert!(claim.is_taken());
    }

    #[tokio::test(flavor = "local")]
    async fn finishes_the_claim_when_the_guard_is_dropped() {
        let claim = Claim::default();
        let guard = claim.take();
        let waiter = claim.clone();
        let waiting = tokio::task::spawn_local(async move { waiter.finished().await });
        tokio::task::yield_now().await;
        assert!(!waiting.is_finished());
        drop(guard);
        assert!(waiting.await.is_ok());
    }

    #[tokio::test(start_paused = true)]
    async fn stops_when_no_job_request_comes_in_time() {
        let stop = wait_for_stop(
            &Claim::default(),
            &CancellationToken::new(),
            REQUEST_TIMEOUT,
            future::pending(),
        )
        .await;

        assert_eq!(stop, Stop::Unclaimed);
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn waits_for_a_taken_claim_past_the_request_timeout() -> Result<(), tokio::task::JoinError> {
        let claim = Claim::default();
        let guard = claim.take();
        let waiter = claim.clone();
        let waiting = tokio::task::spawn_local(async move {
            wait_for_stop(&waiter, &CancellationToken::new(), REQUEST_TIMEOUT, future::pending()).await
        });

        tokio::time::sleep(REQUEST_TIMEOUT * 2).await;
        assert!(!waiting.is_finished());
        drop(guard);

        assert_eq!(waiting.await?, Stop::Served);
        Ok(())
    }

    #[tokio::test]
    async fn stops_at_once_on_a_signal_when_no_job_runs() {
        let stopping = CancellationToken::new();

        let stop = wait_for_stop(&Claim::default(), &stopping, REQUEST_TIMEOUT, future::ready(())).await;

        assert_eq!(stop, Stop::Signaled);
        assert!(stopping.is_cancelled());
    }

    #[tokio::test(flavor = "local")]
    async fn cancels_the_running_job_on_a_signal_and_waits_for_it() -> Result<(), tokio::task::JoinError> {
        let claim = Claim::default();
        let stopping = CancellationToken::new();
        let guard = claim.take();
        let (waiter, cancel) = (claim.clone(), stopping.clone());
        let waiting = tokio::task::spawn_local(async move {
            wait_for_stop(&waiter, &cancel, REQUEST_TIMEOUT, future::ready(())).await
        });

        tokio::task::yield_now().await;
        assert!(stopping.is_cancelled());
        assert!(!waiting.is_finished());
        drop(guard);

        assert_eq!(waiting.await?, Stop::Signaled);
        Ok(())
    }
}
