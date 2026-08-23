use std::{path::PathBuf, rc::Rc};

use futures_util::{FutureExt as _, StreamExt as _, stream::FuturesUnordered};
use sandbox::LocalFuture;

use crate::Error;

use super::{Connector, Server, client::Connection};

const MAX_CONCURRENT_CONNECTIONS: usize = 64;
type ConnectionFuture = futures_util::future::LocalBoxFuture<'static, ()>;

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
            let stream = tokio::net::UnixStream::connect(&self.path).await?;
            Ok(Box::new(stream) as Box<dyn Connection>)
        })
    }
}

#[cfg(target_os = "windows")]
impl Connector for PathConnector {
    fn connect(&self) -> LocalFuture<'_, Result<Box<dyn Connection>, Error>> {
        Box::pin(async move {
            use tokio_util::compat::FuturesAsyncReadCompatExt as _;

            let stream = win_uds::net::AsyncStream::connect(&self.path).await?.compat();
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
    let mut connections = FuturesUnordered::<ConnectionFuture>::new();

    loop {
        tokio::select! {
            accepted = listener.accept(), if connections.len() < MAX_CONCURRENT_CONNECTIONS => {
                let (stream, _) = accepted?;
                let connection_server = server.clone();
                connections.push(async move {
                    if let Err(error) = connection_server.serve_connection(stream).await {
                        connection_server.report(&error);
                    }
                }.boxed_local());
            }
            Some(()) = connections.next(), if !connections.is_empty() => {}
        }
    }
}

#[cfg(target_os = "windows")]
pub(crate) async fn serve(server: Rc<Server>, path: &std::path::Path) -> Result<(), Error> {
    use tokio_util::compat::FuturesAsyncReadCompatExt as _;

    let parent = path
        .parent()
        .ok_or_else(|| Error::Invalid("local API socket has no parent directory".into()))?;
    std::fs::create_dir_all(parent)?;
    crate::local::home::secure_directory(parent)?;
    match std::fs::symlink_metadata(path) {
        Ok(_) => {
            // Windows leaves the AF_UNIX path behind after an abnormal exit.
            // Refuse a path with a live listener, but remove an unreachable
            // entry before binding. agentd holds the exclusive home lock while
            // calling this function, so another daemon cannot race recovery.
            if win_uds::net::AsyncStream::connect(path).await.is_ok() {
                return Err(Error::Invalid("local API path is already occupied".into()));
            }
            std::fs::remove_file(path)?;
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(Error::Io(error)),
    }
    let listener = win_uds::net::AsyncListener::bind(path)?;
    crate::local::home::secure_file(path)?;
    let _cleanup = SocketCleanup(path.to_path_buf());
    let mut connections = FuturesUnordered::<ConnectionFuture>::new();

    loop {
        tokio::select! {
            accepted = listener.accept(), if connections.len() < MAX_CONCURRENT_CONNECTIONS => {
                let (stream, _) = accepted?;
                let connection_server = server.clone();
                connections.push(async move {
                    if let Err(error) = connection_server.serve_connection(stream.compat()).await {
                        connection_server.report(&error);
                    }
                }.boxed_local());
            }
            Some(()) = connections.next(), if !connections.is_empty() => {}
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
