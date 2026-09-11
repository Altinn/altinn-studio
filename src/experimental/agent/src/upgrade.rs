//! Durable state shared by the target updater and its first daemon startup.

use serde::{Deserialize, Serialize};

use crate::{Error, local::home::ControlPlaneHome, sessions};

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct SessionRelaunchMarker {
    pub(crate) build_version: String,
}

/// Runs and acknowledges a pending post-upgrade Session relaunch pass.
///
/// The updater owns the update journal and only observes this separate marker.
/// The daemon is the marker's sole remover, after every Session is safe for
/// ordinary reconciliation under the new harness hooks.
///
/// # Errors
///
/// Returns an error while retaining the marker when it is malformed, belongs
/// to another build, or the bounded Session pass fails.
pub async fn consume_pending_session_relaunch(
    home: &ControlPlaneHome,
    service: &sessions::Service,
) -> Result<(), Error> {
    let path = home.pending_session_relaunch_path();
    let bytes = match tokio::fs::read(&path).await {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    crate::local::home::secure_file(&path)?;
    let marker: SessionRelaunchMarker = serde_json::from_slice(&bytes)?;
    if marker.build_version != crate::build_version() {
        return Err(Error::Daemon(format!(
            "Session relaunch marker targets build {:?}, but this agentd is {:?}",
            marker.build_version,
            crate::build_version()
        )));
    }
    service.relaunch_after_upgrade().await?;
    tokio::fs::remove_file(path).await?;
    sync_directory(home.path())?;
    Ok(())
}

#[cfg(unix)]
fn sync_directory(path: &std::path::Path) -> Result<(), Error> {
    std::fs::File::open(path)?.sync_all()?;
    Ok(())
}

#[cfg(windows)]
const fn sync_directory(_path: &std::path::Path) -> Result<(), Error> {
    Ok(())
}
