use std::{rc::Rc, time::Duration};

use bytes::Bytes;
use http_body_util::{BodyExt as _, LengthLimitError, Limited};
use hyper::{
    HeaderMap, Method, Request, Response, StatusCode,
    body::{Body as _, Incoming},
    header::CONTENT_TYPE,
};
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;

use crate::{
    http::{Body, empty, json, problem},
    job::{Job, JobError, JobOutcome, Jobs, UPGRADE_TIMEOUT},
    lifecycle::Claim,
};

/// The largest app archive that the job host accepts.
const MAX_ARCHIVE_BYTES: usize = 50 * 1024 * 1024;

const ARCHIVE_CONTENT_TYPE: &str = "application/gzip";
const BODY_TIMEOUT: Duration = Duration::from_mins(2);

/// The HTTP API of the job host. It runs one job: the first job request takes the claim, and later job requests get
/// 409.
pub struct Routes {
    jobs: Rc<dyn Jobs>,
    claim: Claim,
    stopping: CancellationToken,
    max_archive_bytes: usize,
}

impl Routes {
    #[must_use]
    pub fn new(jobs: Rc<dyn Jobs>, claim: Claim, stopping: CancellationToken) -> Self {
        Self {
            jobs,
            claim,
            stopping,
            max_archive_bytes: MAX_ARCHIVE_BYTES,
        }
    }

    pub async fn handle(&self, request: Request<Incoming>) -> Response<Body> {
        match (request.method(), request.uri().path()) {
            (&Method::GET, "/health") => empty(StatusCode::OK),
            (&Method::POST, "/api/v1/upgrades/v9") => self.job(request).await,
            _ => problem(StatusCode::NOT_FOUND, "No such route."),
        }
    }

    /// The first job request takes the claim, whatever its answer. The claim finishes when the handler ends, also when
    /// the handler is dropped because the client went away. Then the job host stops and deletes the VM.
    async fn job(&self, request: Request<Incoming>) -> Response<Body> {
        let deadline = Instant::now() + UPGRADE_TIMEOUT;
        if self.stopping.is_cancelled() {
            return problem(StatusCode::SERVICE_UNAVAILABLE, "The job host is stopping.");
        }
        let Some(_claim) = self.claim.take() else {
            return problem(
                StatusCode::CONFLICT,
                "This job host has already taken its job. Each run needs a new job host.",
            );
        };
        if !is_archive(request.headers()) {
            return problem(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "The content type must be application/gzip.",
            );
        }
        let archive = match self.read_archive(request).await {
            Ok(archive) => archive,
            Err(response) => return response,
        };
        let finished = tokio::select! {
            finished = self.jobs.run(Job { archive, deadline }) => finished,
            () = self.stopping.cancelled() => Err(JobError::Cancelled),
        };
        answer(finished)
    }

    async fn read_archive(&self, request: Request<Incoming>) -> Result<Bytes, Response<Body>> {
        // hyper has already parsed and checked Content-Length, and gives it as the lower bound of the size hint.
        if request.body().size_hint().lower() > self.max_archive_bytes as u64 {
            return Err(self.too_large());
        }
        let body = Limited::new(request.into_body(), self.max_archive_bytes);
        match tokio::time::timeout(BODY_TIMEOUT, body.collect()).await {
            Ok(Ok(collected)) => Ok(collected.to_bytes()),
            Ok(Err(error)) if error.is::<LengthLimitError>() => Err(self.too_large()),
            Ok(Err(error)) => Err(problem(
                StatusCode::BAD_REQUEST,
                &format!("Could not read the body: {error}"),
            )),
            Err(_) => Err(problem(StatusCode::REQUEST_TIMEOUT, "The body did not arrive in time.")),
        }
    }

    fn too_large(&self) -> Response<Body> {
        problem(
            StatusCode::PAYLOAD_TOO_LARGE,
            &format!("The archive is larger than {} bytes.", self.max_archive_bytes),
        )
    }
}

fn answer(finished: Result<JobOutcome, JobError>) -> Response<Body> {
    match finished {
        Ok(outcome) => json(StatusCode::OK, &outcome),
        Err(JobError::InvalidArchive(detail)) => problem(
            StatusCode::BAD_REQUEST,
            &format!("The archive does not extract: {detail}"),
        ),
        Err(JobError::Cancelled) => empty(StatusCode::SERVICE_UNAVAILABLE),
        Err(JobError::Failed(error)) => {
            tracing::error!(%error, "the upgrade failed");
            problem(StatusCode::INTERNAL_SERVER_ERROR, &error.to_string())
        }
    }
}

fn is_archive(headers: &HeaderMap) -> bool {
    headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .is_some_and(|media_type| media_type.trim().eq_ignore_ascii_case(ARCHIVE_CONTENT_TYPE))
}

#[cfg(test)]
mod tests {
    use std::{
        cell::{Cell, RefCell},
        future, io,
        net::SocketAddr,
        rc::Rc,
        time::Duration,
    };

    use bytes::Bytes;
    use sandbox_authorization::LocalFuture;
    use serde_json::Value;
    use tokio::{
        io::{AsyncReadExt as _, AsyncWriteExt as _},
        net::{TcpListener, TcpStream},
        sync::Notify,
    };
    use tokio_util::sync::CancellationToken;

    use super::Routes;
    use crate::{
        http,
        job::{Job, JobError, JobOutcome, Jobs},
        lifecycle::Claim,
    };

    const MAX_ARCHIVE_BYTES: usize = 10;

    #[derive(Default)]
    struct FakeJobs {
        error: RefCell<Option<JobError>>,
        hold: Cell<bool>,
        started: Notify,
        release: Notify,
        archives: RefCell<Vec<Bytes>>,
    }

    impl Jobs for FakeJobs {
        fn run(&self, job: Job) -> LocalFuture<'_, Result<JobOutcome, JobError>> {
            Box::pin(async move {
                self.archives.borrow_mut().push(job.archive);
                self.started.notify_one();
                if self.hold.get() {
                    self.release.notified().await;
                }
                if let Some(error) = self.error.borrow_mut().take() {
                    return Err(error);
                }
                Ok(JobOutcome {
                    exit_code: Some(0),
                    timed_out: false,
                    stdout: "{}".to_string(),
                    stderr: String::new(),
                    patch: Some("ZGlmZgo=".to_string()),
                })
            })
        }
    }

    struct JobHost {
        address: SocketAddr,
        jobs: Rc<FakeJobs>,
        claim: Claim,
        stopping: CancellationToken,
    }

    async fn start() -> io::Result<JobHost> {
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let address = listener.local_addr()?;
        let jobs = Rc::new(FakeJobs::default());
        let claim = Claim::default();
        let stopping = CancellationToken::new();
        let routes = Routes {
            jobs: jobs.clone(),
            claim: claim.clone(),
            stopping: stopping.clone(),
            max_archive_bytes: MAX_ARCHIVE_BYTES,
        };
        tokio::task::spawn_local(http::serve(listener, Rc::new(routes), future::pending::<()>()));
        Ok(JobHost {
            address,
            jobs,
            claim,
            stopping,
        })
    }

    fn claim_finished(claim: &Claim) -> tokio::task::JoinHandle<()> {
        let claim = claim.clone();
        tokio::task::spawn_local(async move { claim.finished().await })
    }

    async fn wait_until(condition: impl Fn() -> bool) {
        for _ in 0..100 {
            if condition() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }

    fn post(path: &str, content_type: &str, body: &str) -> String {
        format!(
            "POST {path} HTTP/1.1\r\nHost: runner\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        )
    }

    async fn send(address: SocketAddr, request: &str) -> io::Result<(u16, String)> {
        let mut stream = TcpStream::connect(address).await?;
        stream.write_all(request.as_bytes()).await?;
        let mut response = String::new();
        stream.read_to_string(&mut response).await?;
        let status = response
            .get(9..12)
            .and_then(|status| status.parse().ok())
            .unwrap_or_default();
        let body = response
            .split_once("\r\n\r\n")
            .map(|(_, body)| body.to_string())
            .unwrap_or_default();
        Ok((status, body))
    }

    #[tokio::test(flavor = "local")]
    async fn answers_health_and_unknown_routes() -> io::Result<()> {
        let host = start().await?;

        let (health, _) = send(host.address, "GET /health HTTP/1.1\r\nHost: runner\r\n\r\n").await?;
        let (unknown, _) = send(host.address, "GET /nothing HTTP/1.1\r\nHost: runner\r\n\r\n").await?;

        assert_eq!((health, unknown), (200, 404));
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn runs_an_upgrade_and_answers_with_the_outcome() -> Result<(), Box<dyn std::error::Error>> {
        let host = start().await?;

        let (status, body) = send(host.address, &post("/api/v1/upgrades/v9", "application/gzip", "app")).await?;

        assert_eq!(status, 200);
        let outcome: Value = serde_json::from_str(&body)?;
        assert_eq!(
            outcome,
            serde_json::json!({ "exitCode": 0, "timedOut": false, "stdout": "{}", "stderr": "", "patch": "ZGlmZgo=" })
        );
        assert_eq!(*host.jobs.archives.borrow(), [Bytes::from_static(b"app")]);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn accepts_the_archive_content_type_in_any_case_and_with_parameters() -> io::Result<()> {
        let host = start().await?;

        let (status, _) = send(
            host.address,
            &post("/api/v1/upgrades/v9", "Application/GZIP; foo=bar", "app"),
        )
        .await?;

        assert_eq!(status, 200);
        assert_eq!(host.jobs.archives.borrow().len(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_other_content_types() -> io::Result<()> {
        let host = start().await?;

        let (status, _) = send(host.address, &post("/api/v1/upgrades/v9", "application/json", "{}")).await?;

        assert_eq!(status, 415);
        assert!(host.jobs.archives.borrow().is_empty());
        assert!(host.claim.is_taken());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_every_job_request_after_the_first() -> io::Result<()> {
        let host = start().await?;
        host.jobs.hold.set(true);
        let address = host.address;
        let first = tokio::task::spawn_local(async move {
            send(address, &post("/api/v1/upgrades/v9", "application/gzip", "a")).await
        });
        host.jobs.started.notified().await;

        let (while_running, _) = send(host.address, &post("/api/v1/upgrades/v9", "application/gzip", "b")).await?;
        host.jobs.release.notify_one();
        let (first, _) = first.await??;
        let (after, _) = send(host.address, &post("/api/v1/upgrades/v9", "application/gzip", "c")).await?;

        assert_eq!((first, while_running, after), (200, 409, 409));
        assert_eq!(host.jobs.archives.borrow().len(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn finishes_the_claim_when_the_job_ends() -> io::Result<()> {
        let host = start().await?;
        let finished = claim_finished(&host.claim);

        let (status, _) = send(host.address, &post("/api/v1/upgrades/v9", "application/gzip", "a")).await?;
        wait_until(|| finished.is_finished()).await;

        assert_eq!(status, 200);
        assert!(finished.is_finished());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_jobs_while_it_stops() -> io::Result<()> {
        let host = start().await?;
        host.stopping.cancel();

        let (status, _) = send(host.address, &post("/api/v1/upgrades/v9", "application/gzip", "a")).await?;

        assert_eq!(status, 503);
        assert!(!host.claim.is_taken());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn stops_the_job_and_finishes_the_claim_when_the_job_host_stops() -> io::Result<()> {
        let host = start().await?;
        host.jobs.hold.set(true);
        let finished = claim_finished(&host.claim);
        let address = host.address;
        let running = tokio::task::spawn_local(async move {
            send(address, &post("/api/v1/upgrades/v9", "application/gzip", "a")).await
        });
        host.jobs.started.notified().await;

        host.stopping.cancel();

        assert_eq!(running.await??.0, 503);
        wait_until(|| finished.is_finished()).await;
        assert!(finished.is_finished());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_large_archive_from_its_length_and_finishes_the_claim() -> io::Result<()> {
        let host = start().await?;
        let declared = "POST /api/v1/upgrades/v9 HTTP/1.1\r\nHost: runner\r\nContent-Type: application/gzip\r\nContent-Length: 11\r\n\r\n";

        let (status, _) = send(host.address, declared).await?;
        let finished = claim_finished(&host.claim);
        wait_until(|| finished.is_finished()).await;

        assert_eq!(status, 413);
        assert!(host.jobs.archives.borrow().is_empty());
        assert!(finished.is_finished());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_large_archive_from_its_chunks() -> io::Result<()> {
        let host = start().await?;
        let chunked = "POST /api/v1/upgrades/v9 HTTP/1.1\r\nHost: runner\r\nContent-Type: application/gzip\r\nTransfer-Encoding: chunked\r\n\r\n6\r\n123456\r\n6\r\n123456\r\n0\r\n\r\n";

        let (status, _) = send(host.address, chunked).await?;

        assert_eq!(status, 413);
        assert!(host.jobs.archives.borrow().is_empty());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_an_archive_that_does_not_extract_with_a_problem_detail() -> Result<(), Box<dyn std::error::Error>>
    {
        let host = start().await?;
        *host.jobs.error.borrow_mut() = Some(JobError::InvalidArchive("gzip: invalid header".to_string()));

        let (status, body) = send(host.address, &post("/api/v1/upgrades/v9", "application/gzip", "x")).await?;

        assert_eq!(status, 400);
        let problem: Value = serde_json::from_str(&body)?;
        assert_eq!(problem["detail"], "The archive does not extract: gzip: invalid header");
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn stops_the_job_and_finishes_the_claim_when_the_client_goes_away() -> io::Result<()> {
        let host = start().await?;
        host.jobs.hold.set(true);
        let finished = claim_finished(&host.claim);
        let mut stream = TcpStream::connect(host.address).await?;
        stream
            .write_all(post("/api/v1/upgrades/v9", "application/gzip", "a").as_bytes())
            .await?;
        host.jobs.started.notified().await;

        drop(stream);
        wait_until(|| finished.is_finished()).await;

        assert!(finished.is_finished());
        Ok(())
    }
}
