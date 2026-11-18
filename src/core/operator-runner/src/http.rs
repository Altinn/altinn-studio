use std::{convert::Infallible, pin::pin, rc::Rc, time::Duration};

use bytes::Bytes;
use http_body_util::Full;
use hyper::{server::conn::http1, service::service_fn};
use hyper_util::{
    rt::TokioIo,
    server::graceful::{GracefulShutdown, Watcher},
};
use tokio::net::{TcpListener, TcpStream};

use crate::routes::Routes;

pub type Body = Full<Bytes>;

/// After the stop, open connections have this much time to complete.
const DRAIN_TIMEOUT: Duration = Duration::from_secs(30);

/// Serves the routes until `stop` completes.
///
/// After the stop, the server waits for the open connections, so that it writes the answers that it prepares. No idle
/// connection can delay the stop, because each connection serves only one request.
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
