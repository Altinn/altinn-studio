use std::{path::PathBuf, rc::Rc};

use sandbox::LocalFuture;

use crate::Error;

use super::{Connector, Server, client::Connection};

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
    crate::home::secure_directory(parent)?;
    match std::fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_socket() => std::fs::remove_file(path)?,
        Ok(_) => return Err(Error::Invalid("local API path exists and is not a socket".into())),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(Error::Io(error)),
    }
    let listener = tokio::net::UnixListener::bind(path)?;
    crate::home::secure_file(path)?;

    loop {
        let (stream, _) = listener.accept().await?;
        let connection_server = server.clone();
        tokio::task::spawn_local(async move {
            if let Err(error) = connection_server.serve_connection(stream).await {
                connection_server.report(&error);
            }
        });
    }
}

#[cfg(target_os = "windows")]
pub(crate) async fn serve(server: Rc<Server>, path: &std::path::Path) -> Result<(), Error> {
    use tokio_util::compat::FuturesAsyncReadCompatExt as _;

    let parent = path
        .parent()
        .ok_or_else(|| Error::Invalid("local API socket has no parent directory".into()))?;
    std::fs::create_dir_all(parent)?;
    crate::home::secure_directory(parent)?;
    if path.exists() {
        return Err(Error::Invalid("local API path is already occupied".into()));
    }
    let listener = win_uds::net::AsyncListener::bind(path)?;
    crate::home::secure_file(path)?;
    let _cleanup = SocketCleanup(path.to_path_buf());

    loop {
        let (stream, _) = listener.accept().await?;
        let connection_server = server.clone();
        tokio::task::spawn_local(async move {
            if let Err(error) = connection_server.serve_connection(stream.compat()).await {
                connection_server.report(&error);
            }
        });
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
