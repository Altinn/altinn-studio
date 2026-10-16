use std::{cell::Cell, rc::Rc, time::Duration};

use bytes::Bytes;
use http_body_util::{BodyExt as _, LengthLimitError, Limited};
use hyper::{
    HeaderMap, Method, Request, Response, StatusCode,
    body::Incoming,
    header::{CONTENT_LENGTH, CONTENT_TYPE},
};
use tokio::{sync::oneshot, task::JoinError, time::Instant};

use crate::{
    http::{Body, empty, json, problem},
    job::{Job, JobError, JobKind, JobOutcome, Jobs},
    slot::Slot,
};

/// The largest app archive that the runner accepts.
pub const MAX_ARCHIVE_BYTES: usize = 50 * 1024 * 1024;

const ARCHIVE_CONTENT_TYPE: &str = "application/gzip";
const BODY_TIMEOUT: Duration = Duration::from_mins(2);

/// The HTTP API of the runner.
pub struct Routes {
    jobs: Rc<dyn Jobs>,
    slot: Slot,
    stopping: Rc<Cell<bool>>,
    max_archive_bytes: usize,
}

impl Routes {
    #[must_use]
    pub fn new(jobs: Rc<dyn Jobs>, slot: Slot, stopping: Rc<Cell<bool>>, max_archive_bytes: usize) -> Self {
        Self {
            jobs,
            slot,
            stopping,
            max_archive_bytes,
        }
    }

    pub async fn handle(&self, request: Request<Incoming>) -> Response<Body> {
        match (request.method(), request.uri().path()) {
            (&Method::GET, "/health") => self.health(),
            (&Method::POST, "/api/v1/upgrades/v9") => self.job(request, JobKind::UpgradeV9).await,
            (&Method::POST, "/api/v1/builds") => self.job(request, JobKind::Build).await,
            _ => problem(StatusCode::NOT_FOUND, "No such route."),
        }
    }

    /// A stopping pod is not ready, so that Kubernetes sends new requests to another pod.
    fn health(&self) -> Response<Body> {
        empty(if self.stopping.get() {
            StatusCode::SERVICE_UNAVAILABLE
        } else {
            StatusCode::OK
        })
    }

    /// Runs the job in a separate task, so that the VM is deleted also when the client goes away.
    async fn job(&self, request: Request<Incoming>, kind: JobKind) -> Response<Body> {
        let deadline = Instant::now() + kind.timeout();
        if !is_archive(request.headers()) {
            return problem(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "The content type must be application/gzip.",
            );
        }
        let Some(slot) = self.slot.take().filter(|_| !self.stopping.get()) else {
            return problem(
                StatusCode::SERVICE_UNAVAILABLE,
                "The runner is busy or stopping. Try again after a short time.",
            );
        };
        let archive = match self.read_archive(request).await {
            Ok(archive) => archive,
            Err(response) => return response,
        };
        let (_cancel_when_dropped, cancelled) = oneshot::channel();
        let jobs = self.jobs.clone();
        let running = tokio::task::spawn_local(async move {
            let _slot = slot;
            jobs.run(
                Job {
                    kind,
                    archive,
                    deadline,
                },
                cancelled,
            )
            .await
        });
        answer(running.await, kind)
    }

    async fn read_archive(&self, request: Request<Incoming>) -> Result<Bytes, Response<Body>> {
        if content_length(request.headers()).is_some_and(|length| length > self.max_archive_bytes) {
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

fn answer(finished: Result<Result<JobOutcome, JobError>, JoinError>, kind: JobKind) -> Response<Body> {
    match finished {
        Ok(Ok(outcome)) => json(StatusCode::OK, &outcome),
        Ok(Err(JobError::InvalidArchive(detail))) => problem(
            StatusCode::BAD_REQUEST,
            &format!("The archive does not extract: {detail}"),
        ),
        Ok(Err(JobError::Cancelled)) => empty(StatusCode::SERVICE_UNAVAILABLE),
        Ok(Err(JobError::Failed(error))) => {
            tracing::error!(%error, ?kind, "a job failed");
            problem(StatusCode::INTERNAL_SERVER_ERROR, &error.to_string())
        }
        Err(error) => problem(StatusCode::INTERNAL_SERVER_ERROR, &format!("The job stopped: {error}")),
    }
}

fn is_archive(headers: &HeaderMap) -> bool {
    headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .is_some_and(|media_type| media_type.trim().eq_ignore_ascii_case(ARCHIVE_CONTENT_TYPE))
}

fn content_length(headers: &HeaderMap) -> Option<usize> {
    headers.get(CONTENT_LENGTH)?.to_str().ok()?.parse().ok()
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
        sync::{Notify, oneshot},
    };

    use super::Routes;
    use crate::{
        http,
        job::{Job, JobError, JobKind, JobOutcome, Jobs},
        slot::Slot,
    };

    const MAX_ARCHIVE_BYTES: usize = 10;

    #[derive(Default)]
    struct FakeJobs {
        error: RefCell<Option<JobError>>,
        hold: Cell<bool>,
        started: Notify,
        release: Notify,
        cancelled: Cell<bool>,
        jobs: RefCell<Vec<(JobKind, Bytes)>>,
    }

    impl Jobs for FakeJobs {
        fn run(&self, job: Job, cancelled: oneshot::Receiver<()>) -> LocalFuture<'_, Result<JobOutcome, JobError>> {
            Box::pin(async move {
                self.jobs.borrow_mut().push((job.kind, job.archive));
                self.started.notify_one();
                if self.hold.get() {
                    tokio::select! {
                        () = self.release.notified() => {}
                        _ = cancelled => {
                            self.cancelled.set(true);
                            return Err(JobError::Cancelled);
                        }
                    }
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

    struct Runner {
        address: SocketAddr,
        jobs: Rc<FakeJobs>,
        stopping: Rc<Cell<bool>>,
    }

    async fn start() -> io::Result<Runner> {
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let address = listener.local_addr()?;
        let jobs = Rc::new(FakeJobs::default());
        let stopping = Rc::new(Cell::new(false));
        let routes = Routes::new(jobs.clone(), Slot::default(), stopping.clone(), MAX_ARCHIVE_BYTES);
        tokio::task::spawn_local(http::serve(listener, Rc::new(routes), future::pending()));
        Ok(Runner {
            address,
            jobs,
            stopping,
        })
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
        let runner = start().await?;

        let (health, _) = send(runner.address, "GET /health HTTP/1.1\r\nHost: runner\r\n\r\n").await?;
        let (unknown, _) = send(runner.address, "GET /nothing HTTP/1.1\r\nHost: runner\r\n\r\n").await?;

        assert_eq!((health, unknown), (200, 404));
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn runs_an_upgrade_and_answers_with_the_outcome() -> Result<(), Box<dyn std::error::Error>> {
        let runner = start().await?;

        let (status, body) = send(runner.address, &post("/api/v1/upgrades/v9", "application/gzip", "app")).await?;

        assert_eq!(status, 200);
        let outcome: Value = serde_json::from_str(&body)?;
        assert_eq!(
            outcome,
            serde_json::json!({ "exitCode": 0, "timedOut": false, "stdout": "{}", "stderr": "", "patch": "ZGlmZgo=" })
        );
        assert_eq!(
            *runner.jobs.jobs.borrow(),
            [(JobKind::UpgradeV9, Bytes::from_static(b"app"))]
        );
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn accepts_the_archive_content_type_in_any_case_and_with_parameters() -> io::Result<()> {
        let runner = start().await?;

        let (status, _) = send(
            runner.address,
            &post("/api/v1/builds", "Application/GZIP; foo=bar", "app"),
        )
        .await?;

        assert_eq!(status, 200);
        assert_eq!(runner.jobs.jobs.borrow()[0].0, JobKind::Build);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_other_content_types() -> io::Result<()> {
        let runner = start().await?;

        let (status, _) = send(runner.address, &post("/api/v1/builds", "application/json", "{}")).await?;

        assert_eq!(status, 415);
        assert!(runner.jobs.jobs.borrow().is_empty());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_second_job_while_a_job_runs() -> io::Result<()> {
        let runner = start().await?;
        runner.jobs.hold.set(true);
        let address = runner.address;
        let first =
            tokio::task::spawn_local(
                async move { send(address, &post("/api/v1/builds", "application/gzip", "a")).await },
            );
        runner.jobs.started.notified().await;

        let (second, _) = send(runner.address, &post("/api/v1/builds", "application/gzip", "b")).await?;
        runner.jobs.release.notify_one();

        assert_eq!(second, 503);
        assert_eq!(first.await??.0, 200);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_jobs_and_is_not_ready_while_it_stops() -> io::Result<()> {
        let runner = start().await?;
        runner.stopping.set(true);

        let (job, _) = send(runner.address, &post("/api/v1/builds", "application/gzip", "a")).await?;
        let (health, _) = send(runner.address, "GET /health HTTP/1.1\r\nHost: runner\r\n\r\n").await?;

        assert_eq!((job, health), (503, 503));
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_large_archive_from_its_length_and_from_its_chunks() -> io::Result<()> {
        let runner = start().await?;
        let declared = "POST /api/v1/builds HTTP/1.1\r\nHost: runner\r\nContent-Type: application/gzip\r\nContent-Length: 11\r\n\r\n";
        let chunked = "POST /api/v1/builds HTTP/1.1\r\nHost: runner\r\nContent-Type: application/gzip\r\nTransfer-Encoding: chunked\r\n\r\n6\r\n123456\r\n6\r\n123456\r\n0\r\n\r\n";

        let (from_length, _) = send(runner.address, declared).await?;
        let (from_chunks, _) = send(runner.address, chunked).await?;

        assert_eq!((from_length, from_chunks), (413, 413));
        assert!(runner.jobs.jobs.borrow().is_empty());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_an_archive_that_does_not_extract_with_a_problem_detail() -> Result<(), Box<dyn std::error::Error>>
    {
        let runner = start().await?;
        *runner.jobs.error.borrow_mut() = Some(JobError::InvalidArchive("gzip: invalid header".to_string()));

        let (status, body) = send(runner.address, &post("/api/v1/builds", "application/gzip", "x")).await?;

        assert_eq!(status, 400);
        let problem: Value = serde_json::from_str(&body)?;
        assert_eq!(problem["detail"], "The archive does not extract: gzip: invalid header");
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn cancels_the_job_when_the_client_goes_away() -> io::Result<()> {
        let runner = start().await?;
        runner.jobs.hold.set(true);
        let mut stream = TcpStream::connect(runner.address).await?;
        stream
            .write_all(post("/api/v1/builds", "application/gzip", "a").as_bytes())
            .await?;
        runner.jobs.started.notified().await;

        drop(stream);
        for _ in 0..100 {
            if runner.jobs.cancelled.get() {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }

        assert!(runner.jobs.cancelled.get());
        Ok(())
    }
}
