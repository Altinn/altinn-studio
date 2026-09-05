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
            let stream = tokio::net::UnixStream::connect(&self.path)
                .await
                .map_err(|source| unavailable(&self.path, source))?;
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
                .map_err(|source| unavailable(&self.path, source))?
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
    let mut connections = FuturesUnordered::<ConnectionFuture>::new();

    loop {
        tokio::select! {
            accepted = listener.accept(), if connections.len() < MAX_CONCURRENT_CONNECTIONS => {
                let (stream, _) = accepted?;
                let connection_server = server.clone();
                connections.push(async move {
                    if let Err(error) = connection_server
                        .serve_connection(stream, super::Caller::Local)
                        .await
                    {
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
    let mut connections = FuturesUnordered::<ConnectionFuture>::new();

    loop {
        tokio::select! {
            accepted = listener.accept(), if connections.len() < MAX_CONCURRENT_CONNECTIONS => {
                let (stream, _) = accepted?;
                let connection_server = server.clone();
                connections.push(async move {
                    if let Err(error) = connection_server
                        .serve_connection(stream.compat(), super::Caller::Local)
                        .await
                    {
                        connection_server.report(&error);
                    }
                }.boxed_local());
            }
            Some(()) = connections.next(), if !connections.is_empty() => {}
        }
    }
}

fn unavailable(path: &std::path::Path, source: std::io::Error) -> Error {
    Error::ControlApiUnavailable {
        endpoint: path.display().to_string(),
        source,
    }
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
