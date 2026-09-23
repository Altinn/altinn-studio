use std::{path::PathBuf, rc::Rc, time::Duration};

use futures_util::{FutureExt as _, Stream, StreamExt as _, stream::FuturesUnordered};
use sandbox::LocalFuture;

use crate::Error;

use super::{Caller, Connector, Server, client::Connection};

const MAX_CONCURRENT_CONNECTIONS: usize = 64;
const CONNECTION_DRAIN_TIMEOUT: Duration = Duration::from_mins(1);
const ACCEPT_RETRY_DELAY: Duration = Duration::from_millis(100);
type ConnectionFuture = futures_util::future::LocalBoxFuture<'static, ()>;

async fn drain_connections(connections: &mut FuturesUnordered<ConnectionFuture>, timeout: Duration) {
    if tokio::time::timeout(timeout, async { while connections.next().await.is_some() {} })
        .await
        .is_err()
    {
        tracing::warn!("cancelled Control API calls that did not finish during the shutdown drain");
    }
}

/// Connector for the fixed per-user Agent Control API socket path.
pub(super) struct PathConnector {
    path: PathBuf,
}

impl PathConnector {
    #[must_use]
    pub(super) const fn new(path: PathBuf) -> Self {
        Self { path }
    }
}

#[cfg(unix)]
impl Connector for PathConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            let stream = tokio::net::UnixStream::connect(&self.path)
                .await
                .map_err(Error::Connect)?;
            Ok(Box::new(stream) as Box<dyn Connection>)
        })
    }
}

#[cfg(target_os = "windows")]
impl Connector for PathConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            use tokio_util::compat::FuturesAsyncReadCompatExt as _;

            let stream = win_uds::net::AsyncStream::connect(&self.path)
                .await
                .map_err(Error::Connect)?
                .compat();
            Ok(Box::new(stream) as Box<dyn Connection>)
        })
    }
}

#[cfg(unix)]
pub(crate) async fn serve(server: Rc<Server>, path: &std::path::Path) -> Result<(), Error> {
    use std::os::unix::fs::FileTypeExt;

    let parent = path
        .parent()
        .ok_or_else(|| Error::Invalid("local API socket has no parent directory".into()))?;
    std::fs::create_dir_all(parent)?;
    crate::local::home::secure_directory(parent)?;
    match std::fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_socket() => std::fs::remove_file(path)?,
        Ok(_) => return Err(Error::Invalid("local API path exists and is not a socket".into())),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(Error::Io(error)),
    }
    let listener = tokio::net::UnixListener::bind(path)?;
    crate::local::home::secure_file(path)?;
    serve_listener(server, Caller::Local, || async { Ok(listener.accept().await?.0) }).await
}

#[cfg(target_os = "windows")]
pub(crate) async fn serve(server: Rc<Server>, path: &std::path::Path) -> Result<(), Error> {
    use tokio_util::compat::FuturesAsyncReadCompatExt as _;

    let parent = path
        .parent()
        .ok_or_else(|| Error::Invalid("local API socket has no parent directory".into()))?;
    std::fs::create_dir_all(parent)?;
    crate::local::home::secure_directory(parent)?;
    sweep_quarantined_socket_directories(parent);
    match std::fs::symlink_metadata(path) {
        Ok(_) => {
            // Windows leaves the AF_UNIX path behind after an abnormal exit.
            // Refuse a path with a live listener, but remove an unreachable
            // entry before binding. agentd holds the exclusive home lock while
            // calling this function, so another daemon cannot race recovery.
            if win_uds::net::AsyncStream::connect(path).await.is_ok() {
                return Err(Error::Invalid("local API path is already occupied".into()));
            }
            // afd.sys can keep a stale socket file undeletable and unbindable
            // until reboot. Renaming its directory aside still works then, so
            // quarantine it and recreate the directory before binding.
            if std::fs::remove_file(path).is_err() {
                quarantine_socket_directory(parent)?;
                std::fs::create_dir_all(parent)?;
                crate::local::home::secure_directory(parent)?;
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(Error::Io(error)),
    }
    // The socket inherits the user-only ACL from the home directory secured
    // above; icacls cannot open an AF_UNIX socket reparse point (error 1920).
    let listener = win_uds::net::AsyncListener::bind(path)?;
    let _cleanup = SocketCleanup(path.to_path_buf());
    serve_listener(server, Caller::Local, || async {
        Ok(listener.accept().await?.0.compat())
    })
    .await
}

/// Keeps admission and shutdown draining identical across stream transports.
pub(super) async fn serve_listener<S, F>(
    server: Rc<Server>,
    caller: Caller,
    accept: impl FnMut() -> F,
) -> Result<(), Error>
where
    S: Connection + 'static,
    F: Future<Output = Result<S, Error>>,
{
    let mut connections = FuturesUnordered::<ConnectionFuture>::new();
    let mut incoming = std::pin::pin!(incoming_connections(accept, |error| server.report(error)));

    loop {
        if server.is_draining() {
            break;
        }
        tokio::select! {
            Some(stream) = incoming.next(), if connections.len() < MAX_CONCURRENT_CONNECTIONS => {
                let connection_server = server.clone();
                connections.push(async move {
                    if let Err(error) = connection_server.serve_connection(stream, caller).await {
                        connection_server.report(&error);
                    }
                }.boxed_local());
            }
            Some(()) = connections.next(), if !connections.is_empty() => {}
            () = server.shutdown_requested() => break,
        }
    }
    drain_connections(&mut connections, CONNECTION_DRAIN_TIMEOUT).await;
    Ok(())
}

/// Retain the retry delay across select iterations while other connections run.
/// Accept failures do not invalidate the listener (for example descriptor pressure
/// or a peer disconnecting before accept). Binding errors still fail startup.
fn incoming_connections<S, F>(accept: impl FnMut() -> F, report: impl Fn(&Error)) -> impl Stream<Item = S>
where
    F: Future<Output = Result<S, Error>>,
{
    futures_util::stream::unfold((accept, report), |(mut accept, report)| async move {
        loop {
            match accept().await {
                Ok(stream) => return Some((stream, (accept, report))),
                Err(error) => report(&error),
            }
            tokio::time::sleep(ACCEPT_RETRY_DELAY).await;
        }
    })
}

#[cfg(target_os = "windows")]
const QUARANTINE_INFIX: &str = ".stale-";
#[cfg(target_os = "windows")]
const QUARANTINE_ATTEMPTS: u32 = 1000;

/// Renames the socket directory to an unused `<name>.stale-<n>` sibling.
#[cfg(target_os = "windows")]
fn quarantine_socket_directory(directory: &std::path::Path) -> Result<(), Error> {
    let name = directory
        .file_name()
        .ok_or_else(|| Error::Invalid("local API socket directory has no name".into()))?;
    for attempt in 0..QUARANTINE_ATTEMPTS {
        let mut candidate = name.to_os_string();
        candidate.push(format!("{QUARANTINE_INFIX}{attempt}"));
        let candidate = directory.with_file_name(candidate);
        if candidate.exists() {
            continue;
        }
        match std::fs::rename(directory, &candidate) {
            Ok(()) => return Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(Error::Io(error)),
        }
    }
    Err(Error::Invalid(
        "no free quarantine name for the local API socket directory".into(),
    ))
}

/// Best-effort removal of quarantined socket directories; stale `AF_UNIX`
/// files become deletable again after a reboot.
#[cfg(target_os = "windows")]
fn sweep_quarantined_socket_directories(directory: &std::path::Path) {
    let (Some(parent), Some(name)) = (directory.parent(), directory.file_name().and_then(|name| name.to_str())) else {
        return;
    };
    let prefix = format!("{name}{QUARANTINE_INFIX}");
    let Ok(entries) = std::fs::read_dir(parent) else {
        return;
    };
    for entry in entries.flatten() {
        if entry.file_name().to_str().is_some_and(|name| name.starts_with(&prefix)) {
            let _ignored = std::fs::remove_dir_all(entry.path());
        }
    }
}

#[cfg(target_os = "windows")]
struct SocketCleanup(PathBuf);

#[cfg(target_os = "windows")]
impl Drop for SocketCleanup {
    fn drop(&mut self) {
        let _ignored = std::fs::remove_file(&self.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(flavor = "current_thread", start_paused = true)]
    async fn accept_errors_back_off_without_blocking_other_work() {
        use std::{cell::RefCell, collections::VecDeque, io};

        let mut results = VecDeque::from([
            Err(Error::Io(io::ErrorKind::ConnectionAborted.into())),
            Err(Error::Io(io::Error::other("too many open files"))),
            Ok(42),
        ]);
        let errors = RefCell::new(Vec::new());
        let mut incoming = std::pin::pin!(incoming_connections(
            || std::future::ready(results.pop_front().expect("accept attempt")),
            |error| errors.borrow_mut().push(error.to_string()),
        ));
        let started = tokio::time::Instant::now();
        // Like the serve loop, keep polling other work during accept backoff.
        // Canceling next() must not reset the stream's retry timer.
        tokio::select! {
            _ = incoming.next() => panic!("accept skipped its backoff"),
            () = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
        assert_eq!(errors.borrow().len(), 1);
        assert_eq!(incoming.next().await, Some(42));
        assert_eq!(errors.borrow().len(), 2);
        assert_eq!(started.elapsed(), ACCEPT_RETRY_DELAY * 2);
    }

    #[tokio::test(flavor = "current_thread", start_paused = true)]
    async fn persistent_accept_errors_remain_cancellable() {
        let attempts = std::cell::Cell::new(0);
        let mut incoming = std::pin::pin!(incoming_connections(
            || {
                attempts.set(attempts.get() + 1);
                std::future::ready(Err::<(), _>(Error::Io(std::io::Error::other("descriptor pressure"))))
            },
            |_| {},
        ));
        assert!(
            tokio::time::timeout(Duration::from_millis(250), incoming.next())
                .await
                .is_err()
        );
        assert_eq!(attempts.get(), 3, "persistent errors must not spin");
    }

    #[tokio::test(flavor = "current_thread")]
    async fn shutdown_drain_is_bounded_by_its_deadline() {
        let mut connections = FuturesUnordered::new();
        connections.push(std::future::pending::<()>().boxed_local());

        tokio::time::timeout(
            Duration::from_millis(100),
            drain_connections(&mut connections, Duration::ZERO),
        )
        .await
        .expect("bounded drain");
        assert_eq!(connections.len(), 1);
        drop(connections);
    }
}
