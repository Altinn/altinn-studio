use std::{convert::Infallible, pin::pin, rc::Rc, time::Duration};

use bytes::Bytes;
use http_body_util::Full;
use hyper::{
    Response, StatusCode,
    header::{CONTENT_TYPE, HeaderValue},
    server::conn::http1,
    service::service_fn,
};
use hyper_util::{
    rt::TokioIo,
    server::graceful::{GracefulShutdown, Watcher},
};
use serde::Serialize;
use tokio::net::{TcpListener, TcpStream};

use crate::routes::Routes;

pub type Body = Full<Bytes>;

/// After the stop, open connections get this much time to finish.
const DRAIN_TIMEOUT: Duration = Duration::from_secs(30);

/// Serves the routes until `stop` completes, and returns the output of `stop`.
///
/// After the stop, it waits for the open connections, so that the answer to the job request is written. Each
/// connection serves one request, so no idle connection holds the stop.
pub async fn serve<T>(listener: TcpListener, routes: Rc<Routes>, stop: impl Future<Output = T>) -> T {
    let connections = GracefulShutdown::new();
    let mut stop = pin!(stop);
    let stopped = loop {
        tokio::select! {
            accepted = listener.accept() => match accepted {
                Ok((stream, _)) => {
                    tokio::task::spawn_local(serve_connection(connections.watcher(), stream, routes.clone()));
                }
                Err(error) => tracing::warn!(%error, "could not accept a connection"),
            },
            stopped = &mut stop => break stopped,
        }
    };
    drop(listener);
    if tokio::time::timeout(DRAIN_TIMEOUT, connections.shutdown())
        .await
        .is_err()
    {
        tracing::warn!("stopped with open connections");
    }
    stopped
}

async fn serve_connection(watcher: Watcher, stream: TcpStream, routes: Rc<Routes>) {
    let service = service_fn(move |request| {
        let routes = routes.clone();
        async move { Ok::<_, Infallible>(routes.handle(request).await) }
    });
    let connection = http1::Builder::new()
        .keep_alive(false)
        .serve_connection(TokioIo::new(stream), service);
    if let Err(error) = watcher.watch(connection).await {
        tracing::debug!(%error, "a connection ended with an error");
    }
}

#[must_use]
pub fn json(status: StatusCode, value: &impl Serialize) -> Response<Body> {
    serde_json::to_vec(value).map_or_else(
        |error| {
            problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("could not write the answer: {error}"),
            )
        },
        |body| with_body(status, "application/json", body),
    )
}

/// An RFC 9457 problem detail.
#[must_use]
pub fn problem(status: StatusCode, detail: &str) -> Response<Body> {
    #[derive(Serialize)]
    struct Problem<'a> {
        title: &'a str,
        status: u16,
        detail: &'a str,
    }
    let body = Problem {
        title: status.canonical_reason().unwrap_or_default(),
        status: status.as_u16(),
        detail,
    };
    let body = serde_json::to_vec(&body).unwrap_or_default();
    with_body(status, "application/problem+json", body)
}

#[must_use]
pub fn empty(status: StatusCode) -> Response<Body> {
    let mut response = Response::new(Body::default());
    *response.status_mut() = status;
    response
}

fn with_body(status: StatusCode, content_type: &'static str, body: Vec<u8>) -> Response<Body> {
    let mut response = Response::new(Body::new(Bytes::from(body)));
    *response.status_mut() = status;
    response
        .headers_mut()
        .insert(CONTENT_TYPE, HeaderValue::from_static(content_type));
    response
}
