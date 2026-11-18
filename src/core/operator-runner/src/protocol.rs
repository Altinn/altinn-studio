//! The answers of the operator runner, which only the core operator reads.
//!
//! [`examples/protocol.json`](../examples/protocol.json) has an example of each answer that its client tells apart.

use hyper::{
    Response, StatusCode,
    header::{CONTENT_TYPE, HeaderValue},
};
use serde::Serialize;
use serde_json::json;

use crate::{
    host::{Answer, RunId, Start},
    http::Body,
    run::{Outcome, RunError},
};

/// The core operator reads a status of at most 64 KiB, and JSON can write one byte of the error as six bytes.
const MAX_STATUS_ERROR_BYTES: usize = 10 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    /// The command runs, or the VM starts.
    Running,
    /// The command ran. The result has its exit code, also when the command failed or timed out.
    Completed,
    /// The operator runner could not run the command.
    Failed,
}

/// The result of a run.
#[derive(Debug, Eq, PartialEq, Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum Reply {
    Running,
    Completed(Outcome),
    Failed {
        /// Logs carry this reason and not the error, because the error can contain text from the app and the VM.
        #[serde(skip)]
        reason: &'static str,
        error: String,
    },
}

impl Reply {
    #[must_use]
    pub const fn status(&self) -> Status {
        match self {
            Self::Running => Status::Running,
            Self::Completed(_) => Status::Completed,
            Self::Failed { .. } => Status::Failed,
        }
    }
}

impl From<Result<Outcome, RunError>> for Reply {
    fn from(ran: Result<Outcome, RunError>) -> Self {
        match ran {
            Ok(outcome) => Self::Completed(outcome),
            Err(RunError::InvalidArchive(detail)) => Self::Failed {
                reason: "invalid-archive",
                error: format!("The archive does not extract: {detail}"),
            },
            Err(RunError::RefusedPatch(refusal)) => Self::Failed {
                reason: "refused-patch",
                error: format!("The operator runner refused the changes of the command: {refusal}"),
            },
            Err(RunError::Failed(error)) => Self::Failed {
                reason: "vm-error",
                error: error.to_string(),
            },
        }
    }
}

/// The status of a run: the result without the output, and with the start of the error.
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
            Reply::Failed { error, .. } => Self::Failed {
                error: &error[..error.floor_char_boundary(MAX_STATUS_ERROR_BYTES)],
            },
        }
    }
}

/// What the client reads about a run.
#[derive(Clone, Copy)]
pub enum Read {
    /// `GET /runs/{runId}`: the status. It does not count as the fetch, so the operator can follow the run with it.
    Status,
    /// `GET /runs/{runId}/result`: the result. The first answer with the end of the run counts as the fetch.
    Result,
}

/// Why the operator runner refuses a request. The core operator reads it, so a reason keeps its name.
#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Reason {
    NotClaimed,
    ClaimedByOther,
    /// The client must send another archive.
    InvalidArchive,
    /// The core operator does not send such a request, for example with a command that the operator runner lacks.
    InvalidRequest,
    BodyTimeout,
    Stopping,
}

#[must_use]
pub fn started(run_id: &RunId, start: Start) -> Response<Body> {
    let status = match start {
        Start::Started => Status::Running,
        Start::AlreadyClaimed(status) => status,
        Start::ClaimedByOther => {
            let detail = "Another run has claimed this operator runner. Each run needs a new operator runner.";
            return problem(StatusCode::CONFLICT, Reason::ClaimedByOther, detail);
        }
        Start::Stopping => return stopping(),
    };
    let accepted = json!({ "runId": run_id.as_str(), "status": status });
    json(StatusCode::ACCEPTED, &accepted)
}

#[must_use]
pub fn read(answer: Option<Answer>, read: Read) -> Response<Body> {
    match (answer, read) {
        (Some(Answer::Running), _) => json(StatusCode::OK, &Reply::Running),
        (Some(Answer::Ended(reply)), Read::Status) => json(StatusCode::OK, &Summary::from(&*reply)),
        (Some(Answer::Ended(reply)), Read::Result) => json(StatusCode::OK, &*reply),
        (None, _) => {
            let detail = "This run has not claimed the operator runner.";
            problem(StatusCode::NOT_FOUND, Reason::NotClaimed, detail)
        }
    }
}

#[must_use]
pub fn stopping() -> Response<Body> {
    let detail = "The operator runner is stopping.";
    problem(StatusCode::SERVICE_UNAVAILABLE, Reason::Stopping, detail)
}

/// An RFC 9457 problem detail, with the reason as an extension member.
#[must_use]
pub fn problem(status: StatusCode, reason: Reason, detail: &str) -> Response<Body> {
    let title = status.canonical_reason().unwrap_or_default();
    let problem = json!({ "title": title, "status": status.as_u16(), "reason": reason, "detail": detail });
    serialized(status, "application/problem+json", &problem)
}

fn json(status: StatusCode, value: &impl Serialize) -> Response<Body> {
    serialized(status, "application/json", value)
}

/// The answers have no map with keys that are not strings, so they always serialize.
fn serialized(status: StatusCode, content_type: &'static str, value: &impl Serialize) -> Response<Body> {
    let mut response = Response::new(Body::new(serde_json::to_vec(value).unwrap_or_default().into()));
    *response.status_mut() = status;
    response
        .headers_mut()
        .insert(CONTENT_TYPE, HeaderValue::from_static(content_type));
    response
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{Reply, Summary};
    use crate::run::Outcome;

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

    /// A patch can refuse many paths, and JSON writes a control character as six bytes.
    #[test]
    fn cuts_the_error_of_a_status_to_what_the_core_operator_reads() -> serde_json::Result<()> {
        let reply = Reply::Failed {
            reason: "refused-patch",
            error: "€\u{1}".repeat(64 * 1024),
        };

        let summary = serde_json::to_vec(&Summary::from(&reply))?;

        assert!(summary.len() <= 64 * 1024, "{}", summary.len());
        Ok(())
    }
}
