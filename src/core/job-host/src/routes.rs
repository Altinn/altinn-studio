use std::{rc::Rc, time::Duration};

use bytes::Bytes;
use http_body_util::{BodyExt as _, LengthLimitError, Limited};
use hyper::{
    HeaderMap, Method, Request, Response, StatusCode, Uri,
    body::{Body as _, Incoming},
    header::CONTENT_TYPE,
};
use serde::Serialize;

use crate::{
    host::{Answer, Host, Reply, RunId, Start, Status},
    http::{Body, empty, json, json_bytes, problem},
    run::Command,
};

/// The maximum size of an app archive that the job host accepts.
const MAX_ARCHIVE_BYTES: usize = 50 * 1024 * 1024;

const ARCHIVE_CONTENT_TYPE: &str = "application/gzip";
/// The first bytes of each gzip file.
const GZIP_MAGIC: &[u8] = &[0x1f, 0x8b];
const BODY_TIMEOUT: Duration = Duration::from_mins(2);
/// The longest time that a request for the status or the result waits for the end of the run.
const MAX_WAIT_SECONDS: u64 = 30;

/// The HTTP API of the job host. The first run that delivers a complete archive claims the job host.
pub struct Routes {
    host: Rc<Host>,
    max_archive_bytes: usize,
}

enum Route {
    Health,
    Start(String),
    Read(String, Read),
}

/// What a client reads about a run.
#[derive(Clone, Copy)]
enum Read {
    /// `GET /runs/{runId}`: the status without the output. It does not count as the fetch, so the operator can follow
    /// the run and leave the fetch to its caller.
    Status,
    /// `GET /runs/{runId}/result`: the result. The first answer with the end of the run counts as the fetch.
    Result,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Accepted<'a> {
    run_id: &'a str,
    status: Status,
}

impl Routes {
    #[must_use]
    pub const fn new(host: Rc<Host>) -> Self {
        Self {
            host,
            max_archive_bytes: MAX_ARCHIVE_BYTES,
        }
    }

    pub async fn handle(&self, request: Request<Incoming>) -> Response<Body> {
        match route(request.method(), request.uri().path()) {
            Some(Route::Health) => empty(StatusCode::OK),
            Some(Route::Start(run_id)) => self.start(request, &run_id).await,
            Some(Route::Read(run_id, read)) => self.read(request.uri(), &run_id, read).await,
            None => problem(StatusCode::NOT_FOUND, "No such route."),
        }
    }

    /// `PUT /runs/{runId}?command={command}`. The job host reads the whole archive before the run claims it, so a
    /// client can send an archive again after an upload that did not complete. A repeat for the claimed run answers
    /// with the status of the run, and the job host discards the archive.
    async fn start(&self, request: Request<Incoming>, run_id: &str) -> Response<Body> {
        if self.host.is_stopping() {
            return stopping();
        }
        let Some(run_id) = RunId::parse(run_id) else {
            return problem(StatusCode::BAD_REQUEST, "The run id must be a UUID.");
        };
        let Some(name) = query_value(request.uri(), "command") else {
            return problem(StatusCode::BAD_REQUEST, "The query must name a command.");
        };
        let Some(command) = Command::from_name(name) else {
            return problem(StatusCode::NOT_FOUND, &format!("The job host has no command {name}."));
        };
        if self.host.is_claimed() {
            self.discard(request.into_body()).await;
            return self
                .host
                .status_of(&run_id)
                .map_or_else(claimed_by_other, |status| accepted(&run_id, status));
        }
        if !is_archive(request.headers()) {
            return problem(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "The content type must be application/gzip.",
            );
        }
        let upload = self.host.upload();
        let archive = match self.read_archive(request).await {
            Ok(archive) => archive,
            Err(response) => return response,
        };
        if !archive.starts_with(GZIP_MAGIC) {
            return problem(StatusCode::BAD_REQUEST, "The body is not a gzip archive.");
        }
        let started = self.host.start(&run_id, command, archive);
        drop(upload);
        match started {
            Start::Started => accepted(&run_id, Status::Running),
            Start::AlreadyClaimed(status) => accepted(&run_id, status),
            Start::ClaimedByOther => claimed_by_other(),
            Start::Stopping => stopping(),
        }
    }

    /// `GET /runs/{runId}?wait={seconds}` and `GET /runs/{runId}/result?wait={seconds}`.
    async fn read(&self, uri: &Uri, run_id: &str, read: Read) -> Response<Body> {
        let Some(wait) = wait_of(uri) else {
            return problem(
                StatusCode::BAD_REQUEST,
                &format!("wait must be a whole number of seconds from 0 to {MAX_WAIT_SECONDS}."),
            );
        };
        let answer = match (RunId::parse(run_id), read) {
            (Some(run_id), Read::Status) => self.host.summary(&run_id, wait).await,
            (Some(run_id), Read::Result) => self.host.result(&run_id, wait).await,
            (None, _) => None,
        };
        match answer {
            Some(Answer::Running) => json(StatusCode::OK, &Reply::Running),
            Some(Answer::Ended(body)) => json_bytes(StatusCode::OK, body),
            None => problem(StatusCode::NOT_FOUND, "This run has not claimed the job host."),
        }
    }

    async fn read_archive(&self, request: Request<Incoming>) -> Result<Bytes, Response<Body>> {
        // hyper parsed and checked Content-Length before this step. It gives the value as the lower bound of the size
        // hint.
        if request.body().size_hint().lower() > self.max_archive_bytes as u64 {
            return Err(self.too_large());
        }
        let body = Limited::new(request.into_body(), self.max_archive_bytes);
        let read = tokio::select! {
            read = tokio::time::timeout(BODY_TIMEOUT, body.collect()) => read,
            () = self.host.stopped() => return Err(stopping()),
        };
        match read {
            Ok(Ok(collected)) => Ok(collected.to_bytes()),
            Ok(Err(error)) if error.is::<LengthLimitError>() => Err(self.too_large()),
            Ok(Err(error)) => Err(problem(
                StatusCode::BAD_REQUEST,
                &format!("Could not read the body: {error}"),
            )),
            Err(_) => Err(problem(StatusCode::REQUEST_TIMEOUT, "The body did not arrive in time.")),
        }
    }

    /// Reads the body and drops it, so that the client can send all of it and then read the answer.
    async fn discard(&self, body: Incoming) {
        let mut body = Limited::new(body, self.max_archive_bytes);
        let drain = async { while let Some(Ok(_)) = body.frame().await {} };
        tokio::select! {
            () = drain => {}
            () = tokio::time::sleep(BODY_TIMEOUT) => {}
            () = self.host.stopped() => {}
        }
    }

    fn too_large(&self) -> Response<Body> {
        problem(
            StatusCode::PAYLOAD_TOO_LARGE,
            &format!("The archive is larger than {} bytes.", self.max_archive_bytes),
        )
    }
}

fn route(method: &Method, path: &str) -> Option<Route> {
    if path == "/health" {
        return (method == Method::GET).then_some(Route::Health);
    }
    let rest = path.strip_prefix("/runs/")?;
    match (method, rest.split_once('/')) {
        (&Method::PUT, None) if !rest.is_empty() => Some(Route::Start(rest.to_string())),
        (&Method::GET, None) if !rest.is_empty() => Some(Route::Read(rest.to_string(), Read::Status)),
        (&Method::GET, Some((run_id, "result"))) if !run_id.is_empty() => {
            Some(Route::Read(run_id.to_string(), Read::Result))
        }
        _ => None,
    }
}

fn accepted(run_id: &RunId, status: Status) -> Response<Body> {
    json(
        StatusCode::ACCEPTED,
        &Accepted {
            run_id: run_id.as_str(),
            status,
        },
    )
}

fn claimed_by_other() -> Response<Body> {
    problem(
        StatusCode::CONFLICT,
        "Another run has claimed this job host. Each run needs a new job host.",
    )
}

fn stopping() -> Response<Body> {
    problem(StatusCode::SERVICE_UNAVAILABLE, "The job host is stopping.")
}

/// Returns the wait of a request for the status or the result, or `None` if the value is not valid. No `wait` means
/// that the request does not wait.
fn wait_of(uri: &Uri) -> Option<Duration> {
    let Some(value) = query_value(uri, "wait") else {
        return Some(Duration::ZERO);
    };
    value
        .parse::<u64>()
        .ok()
        .filter(|seconds| *seconds <= MAX_WAIT_SECONDS)
        .map(Duration::from_secs)
}

/// Returns the value of the first query parameter with this name. The values that the job host reads need no
/// percent-decoding.
fn query_value<'a>(uri: &'a Uri, name: &str) -> Option<&'a str> {
    uri.query()?
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find_map(|(key, value)| (key == name).then_some(value))
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
    use std::{future, io, net::SocketAddr, rc::Rc, time::Duration};

    use bytes::Bytes;
    use serde_json::{Value, json};
    use tokio::{
        io::{AsyncReadExt as _, AsyncWriteExt as _},
        net::{TcpListener, TcpStream},
        time::Instant,
    };

    use super::Routes;
    use crate::{
        fake::{FakeRunner, RUN_ID},
        host::Host,
        http,
        run::RunError,
    };

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    const MAX_ARCHIVE_BYTES: usize = 10;
    const OTHER_RUN_ID: &str = "11111111-2222-3333-4444-555555555555";
    /// The job host checks only that the archive starts as a gzip file. The fake runner does not extract it.
    const ARCHIVE: &[u8] = b"\x1f\x8bapp";
    const UPGRADE: &str = "?command=upgrade-v9";

    struct JobHost {
        address: SocketAddr,
        runner: Rc<FakeRunner>,
        host: Rc<Host>,
    }

    async fn start() -> io::Result<JobHost> {
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let address = listener.local_addr()?;
        let runner = Rc::new(FakeRunner::default());
        let host = Host::new(runner.clone());
        let routes = Routes {
            host: host.clone(),
            max_archive_bytes: MAX_ARCHIVE_BYTES,
        };
        tokio::task::spawn_local(http::serve(listener, Rc::new(routes), future::pending::<()>()));
        Ok(JobHost { address, runner, host })
    }

    /// The start of a `PUT` request, up to the empty line after the headers.
    fn put_head(run_id: &str, query: &str, headers: &[&str]) -> String {
        let mut head = format!("PUT /runs/{run_id}{query} HTTP/1.1\r\nHost: job-host\r\n");
        for header in headers {
            head.push_str(header);
            head.push_str("\r\n");
        }
        head.push_str("\r\n");
        head
    }

    fn put(run_id: &str, query: &str, content_type: &str, body: &[u8]) -> Vec<u8> {
        let content_type = format!("Content-Type: {content_type}");
        let content_length = format!("Content-Length: {}", body.len());
        let mut request = put_head(run_id, query, &[&content_type, &content_length]).into_bytes();
        request.extend_from_slice(body);
        request
    }

    fn put_archive(run_id: &str) -> Vec<u8> {
        put(run_id, UPGRADE, "application/gzip", ARCHIVE)
    }

    fn get(path: &str) -> Vec<u8> {
        format!("GET {path} HTTP/1.1\r\nHost: job-host\r\n\r\n").into_bytes()
    }

    fn get_status(run_id: &str, wait: u64) -> Vec<u8> {
        get(&format!("/runs/{run_id}?wait={wait}"))
    }

    fn get_result(run_id: &str, wait: u64) -> Vec<u8> {
        get(&format!("/runs/{run_id}/result?wait={wait}"))
    }

    async fn send(address: SocketAddr, request: &[u8]) -> io::Result<(u16, String)> {
        let mut stream = TcpStream::connect(address).await?;
        stream.write_all(request).await?;
        read_answer(stream).await
    }

    async fn read_answer(mut stream: TcpStream) -> io::Result<(u16, String)> {
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

    async fn send_json(address: SocketAddr, request: &[u8]) -> Result<(u16, Value), Box<dyn std::error::Error>> {
        let (status, body) = send(address, request).await?;
        Ok((status, serde_json::from_str(&body)?))
    }

    fn completed() -> Value {
        json!({
            "status": "completed", "exitCode": 0, "timedOut": false, "stdout": "", "stderr": "",
            "report": { "exitCode": 0 }, "patch": "ZGlmZgo="
        })
    }

    fn completed_summary() -> Value {
        json!({ "status": "completed", "exitCode": 0, "timedOut": false })
    }

    fn accepted(run_id: &str, status: &str) -> Value {
        json!({ "runId": run_id, "status": status })
    }

    #[tokio::test(flavor = "local")]
    async fn answers_health_and_unknown_routes() -> io::Result<()> {
        let host = start().await?;

        let mut statuses = Vec::new();
        for request in [
            get("/health"),
            get("/nothing"),
            get("/runs/"),
            get(&format!("/runs/{RUN_ID}/status")),
            get(&format!("/runs/{RUN_ID}/result/more")),
            get("/runs//result"),
            put("", UPGRADE, "application/gzip", ARCHIVE),
            put(&format!("{RUN_ID}/result"), UPGRADE, "application/gzip", ARCHIVE),
            b"POST /upgrade/v9 HTTP/1.1\r\nHost: job-host\r\nContent-Length: 0\r\n\r\n".to_vec(),
        ] {
            statuses.push(send(host.address, &request).await?.0);
        }

        assert_eq!(statuses, [200, 404, 404, 404, 404, 404, 404, 404, 404]);
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_at_once_and_runs_the_command_after_the_answer() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);

        let started = send_json(host.address, &put_archive(RUN_ID)).await?;
        host.runner.started.notified().await;
        let running = send_json(host.address, &get_result(RUN_ID, 0)).await?;
        host.runner.release.notify_one();
        let ended = send_json(host.address, &get_result(RUN_ID, 5)).await?;

        assert_eq!(started, (202, accepted(RUN_ID, "running")));
        assert_eq!(running, (200, json!({ "status": "running" })));
        assert_eq!(ended, (200, completed()));
        assert_eq!(*host.runner.archives.borrow(), [Bytes::from_static(ARCHIVE)]);
        assert_eq!(host.runner.deletes.get(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_the_status_of_the_run_without_its_output() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);
        send(host.address, &put_archive(RUN_ID)).await?;
        host.runner.started.notified().await;

        let at_once = send_json(host.address, &get(&format!("/runs/{RUN_ID}"))).await?;
        let started = Instant::now();
        let after_the_wait = send_json(host.address, &get_status(RUN_ID, 1)).await?;
        let waited = started.elapsed();
        let address = host.address;
        let waiting_since = Instant::now();
        let waiting = tokio::task::spawn_local(async move { send_json(address, &get_status(RUN_ID, 30)).await });
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(!waiting.is_finished());
        host.runner.release.notify_one();
        let ended = waiting.await??;
        let waited_for_the_end = waiting_since.elapsed();
        let in_upper_case = send_json(host.address, &get_status(&RUN_ID.to_uppercase(), 0)).await?;
        let result = send_json(host.address, &get_result(RUN_ID, 0)).await?;

        assert_eq!(at_once, (200, json!({ "status": "running" })));
        assert_eq!(after_the_wait, (200, json!({ "status": "running" })));
        assert!(waited >= Duration::from_secs(1), "{waited:?}");
        assert_eq!(ended, (200, completed_summary()));
        assert!(waited_for_the_end < Duration::from_secs(5), "{waited_for_the_end:?}");
        assert_eq!(in_upper_case, (200, completed_summary()));
        assert_eq!(result, (200, completed()));
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_404_for_the_status_of_a_run_that_has_not_claimed_the_job_host() -> TestResult {
        let host = start().await?;

        let (unclaimed, problem) = send_json(host.address, &get_status(RUN_ID, 0)).await?;
        assert!(!host.host.is_claimed());
        send(host.address, &put_archive(RUN_ID)).await?;
        let other = send(host.address, &get_status(OTHER_RUN_ID, 0)).await?.0;
        let not_a_uuid = send(host.address, &get("/runs/run-1")).await?.0;
        let claimed = send(host.address, &get_status(RUN_ID, 5)).await?.0;

        assert_eq!((unclaimed, other, not_a_uuid, claimed), (404, 404, 404, 200));
        assert_eq!(problem["detail"], "This run has not claimed the job host.");
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn accepts_the_archive_content_type_in_any_case_and_with_parameters() -> io::Result<()> {
        let host = start().await?;

        let (status, _) = send(
            host.address,
            &put(RUN_ID, UPGRADE, "Application/GZIP; foo=bar", ARCHIVE),
        )
        .await?;

        assert_eq!(status, 202);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn claims_the_job_host_only_when_the_whole_archive_arrived() -> TestResult {
        let host = start().await?;
        let request = put_archive(RUN_ID);
        let (head, rest) = request.split_at(request.len() - 2);
        let mut uploading = TcpStream::connect(host.address).await?;
        uploading.write_all(head).await?;
        tokio::time::sleep(Duration::from_millis(50)).await;

        let while_uploading = send(host.address, &get_result(RUN_ID, 0)).await?.0;
        let other = send_json(host.address, &put_archive(OTHER_RUN_ID)).await?;
        uploading.write_all(rest).await?;
        let after_upload = read_answer(uploading).await?.0;

        assert_eq!(while_uploading, 404);
        assert_eq!(other, (202, accepted(OTHER_RUN_ID, "running")));
        assert_eq!(after_upload, 409);
        assert_eq!(host.runner.archives.borrow().len(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn accepts_the_archive_again_after_an_upload_that_did_not_complete() -> TestResult {
        let host = start().await?;
        let request = put_archive(RUN_ID);
        let mut interrupted = TcpStream::connect(host.address).await?;
        interrupted.write_all(&request[..request.len() - 2]).await?;
        tokio::time::sleep(Duration::from_millis(50)).await;
        drop(interrupted);
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert!(!host.host.is_claimed());

        let retried = send_json(host.address, &request).await?;

        assert_eq!(retried, (202, accepted(RUN_ID, "running")));
        assert_eq!(*host.runner.archives.borrow(), [Bytes::from_static(ARCHIVE)]);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_a_repeat_for_the_same_run_with_its_status() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);

        let first = send_json(host.address, &put_archive(RUN_ID)).await?;
        let while_running = send_json(host.address, &put_archive(RUN_ID)).await?;
        let in_upper_case = send_json(host.address, &put_archive(&RUN_ID.to_uppercase())).await?;
        let with_other_body = send_json(host.address, &put(RUN_ID, UPGRADE, "text/plain", b"x")).await?;
        host.runner.release.notify_one();
        send(host.address, &get_result(RUN_ID, 5)).await?;
        let after_the_end = send_json(host.address, &put_archive(RUN_ID)).await?;

        for running in [&first, &while_running, &in_upper_case, &with_other_body] {
            assert_eq!(*running, (202, accepted(RUN_ID, "running")));
        }
        assert_eq!(after_the_end, (202, accepted(RUN_ID, "completed")));
        assert_eq!(host.runner.archives.borrow().len(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_another_run_after_the_claim() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);

        send(host.address, &put_archive(RUN_ID)).await?;
        let (while_running, problem) = send_json(host.address, &put_archive(OTHER_RUN_ID)).await?;
        let other_result = send(host.address, &get_result(OTHER_RUN_ID, 0)).await?.0;
        host.runner.release.notify_one();
        send(host.address, &get_result(RUN_ID, 5)).await?;
        let after_the_end = send(host.address, &put_archive(OTHER_RUN_ID)).await?.0;

        assert_eq!((while_running, after_the_end, other_result), (409, 409, 404));
        assert_eq!(problem["status"], 409);
        assert_eq!(host.runner.archives.borrow().len(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn continues_the_run_when_the_client_goes_away() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);
        let mut stream = TcpStream::connect(host.address).await?;
        stream.write_all(&put_archive(RUN_ID)).await?;
        host.runner.started.notified().await;

        drop(stream);
        tokio::time::sleep(Duration::from_millis(50)).await;
        host.runner.release.notify_one();

        assert_eq!(
            send_json(host.address, &get_result(RUN_ID, 5)).await?,
            (200, completed())
        );
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_a_waiting_request_when_the_run_ends() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);
        send(host.address, &put_archive(RUN_ID)).await?;
        let started = Instant::now();
        let address = host.address;
        let waiting = tokio::task::spawn_local(async move { send(address, &get_result(RUN_ID, 30)).await });
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(!waiting.is_finished());

        host.runner.release.notify_one();
        let (status, body) = waiting.await??;

        assert_eq!((status, serde_json::from_str::<Value>(&body)?), (200, completed()));
        assert!(started.elapsed() < Duration::from_secs(5), "{:?}", started.elapsed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn answers_running_when_the_wait_passes() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);
        send(host.address, &put_archive(RUN_ID)).await?;
        let started = Instant::now();

        let answer = send_json(host.address, &get_result(RUN_ID, 1)).await?;

        assert_eq!(answer, (200, json!({ "status": "running" })));
        assert!(started.elapsed() >= Duration::from_secs(1), "{:?}", started.elapsed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_wait_that_is_not_from_0_to_30_seconds() -> io::Result<()> {
        let host = start().await?;
        send(host.address, &put_archive(RUN_ID)).await?;

        let mut statuses = Vec::new();
        let mut without_wait = Vec::new();
        for path in [format!("/runs/{RUN_ID}"), format!("/runs/{RUN_ID}/result")] {
            for wait in ["31", "-1", "1.5", "soon", ""] {
                let request = get(&format!("{path}?wait={wait}"));
                statuses.push(send(host.address, &request).await?.0);
            }
            without_wait.push(send(host.address, &get(&path)).await?.0);
        }

        assert_eq!(statuses, [400; 10]);
        assert_eq!(without_wait, [200, 200]);
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_an_unknown_command_a_missing_command_and_a_run_id_that_is_not_a_uuid() -> TestResult {
        let host = start().await?;

        let (unknown, problem) =
            send_json(host.address, &put(RUN_ID, "?command=sh", "application/gzip", ARCHIVE)).await?;
        let missing = send(host.address, &put(RUN_ID, "", "application/gzip", ARCHIVE))
            .await?
            .0;
        let not_a_uuid = send(host.address, &put_archive("run-1")).await?.0;

        assert_eq!((unknown, missing, not_a_uuid), (404, 400, 400));
        assert_eq!(problem["detail"], "The job host has no command sh.");
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_body_that_is_not_gzip_without_a_claim() -> io::Result<()> {
        let host = start().await?;

        let (status, _) = send(host.address, &put(RUN_ID, UPGRADE, "application/gzip", b"app")).await?;

        assert_eq!(status, 400);
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_other_content_types_without_a_claim() -> io::Result<()> {
        let host = start().await?;

        let (status, _) = send(host.address, &put(RUN_ID, UPGRADE, "application/json", b"{}")).await?;

        assert_eq!(status, 415);
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_large_archive_from_its_length_without_a_claim() -> io::Result<()> {
        let host = start().await?;
        let declared = put_head(
            RUN_ID,
            UPGRADE,
            &["Content-Type: application/gzip", "Content-Length: 11"],
        );

        let (status, _) = send(host.address, declared.as_bytes()).await?;

        assert_eq!(status, 413);
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_a_large_archive_from_its_chunks_without_a_claim() -> io::Result<()> {
        let host = start().await?;
        let head = put_head(
            RUN_ID,
            UPGRADE,
            &["Content-Type: application/gzip", "Transfer-Encoding: chunked"],
        );
        let chunked = format!("{head}6\r\n123456\r\n6\r\n123456\r\n0\r\n\r\n");

        let (status, _) = send(host.address, chunked.as_bytes()).await?;

        assert_eq!(status, 413);
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_runs_while_it_stops() -> io::Result<()> {
        let host = start().await?;
        host.host.stop();

        let (status, _) = send(host.address, &put_archive(RUN_ID)).await?;

        assert_eq!(status, 503);
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn refuses_an_archive_that_arrives_while_it_stops() -> io::Result<()> {
        let host = start().await?;
        let request = put_archive(RUN_ID);
        let mut uploading = TcpStream::connect(host.address).await?;
        uploading.write_all(&request[..request.len() - 2]).await?;
        tokio::time::sleep(Duration::from_millis(50)).await;

        host.host.stop();

        assert_eq!(read_answer(uploading).await?.0, 503);
        assert!(!host.host.is_claimed());
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn reports_an_archive_that_does_not_extract_as_failed() -> TestResult {
        let host = start().await?;
        *host.runner.error.borrow_mut() = Some(RunError::InvalidArchive("gzip: invalid header".to_string()));

        let started = send(host.address, &put_archive(RUN_ID)).await?.0;
        let status = send_json(host.address, &get_status(RUN_ID, 5)).await?;
        let result = send_json(host.address, &get_result(RUN_ID, 5)).await?;

        assert_eq!(started, 202);
        let failed = json!({ "status": "failed", "error": "The archive does not extract: gzip: invalid header" });
        assert_eq!(status, (200, failed.clone()));
        assert_eq!(result, (200, failed));
        Ok(())
    }

    #[tokio::test(flavor = "local")]
    async fn reports_a_run_that_the_job_host_stopped_as_failed() -> TestResult {
        let host = start().await?;
        host.runner.hold.set(true);
        send(host.address, &put_archive(RUN_ID)).await?;
        host.runner.started.notified().await;
        let address = host.address;
        let waiting = tokio::task::spawn_local(async move { send(address, &get_result(RUN_ID, 30)).await });
        tokio::time::sleep(Duration::from_millis(50)).await;

        host.host.stop();
        let (status, body) = waiting.await??;

        assert_eq!(status, 200);
        assert_eq!(
            serde_json::from_str::<Value>(&body)?,
            json!({ "status": "failed", "error": "The job host stopped before the command ended." })
        );
        Ok(())
    }
}
