//! Guest heartbeats read from a running runtime's host-side directory.
//!
//! Microsandbox's guest agent replaces `heartbeat.json` in the runtime
//! directory about once a second from a dedicated thread, and the runtime
//! removes it before every boot. Reading the file needs no round trip to the
//! guest, so a guest that stopped responding keeps reporting the sequence it
//! last wrote. Only the sequence is read: the guest-written timestamps follow
//! the guest clock, which falls behind the host's while the guest is stalled.
//!
//! The guest writes the file through a directory it shares with the host, so
//! anything in the guest can replace it, with up to the runtime directory's
//! quota (16 MiB). It is read only as a small regular file, within a time
//! bound, whatever the shared directory makes of a guest's special files.

use std::{io, path::Path, time::Duration};

use sandbox::GuestHeartbeat;
use serde::Deserialize;
use tokio::io::AsyncReadExt as _;

/// Heartbeat file in a runtime directory, written by the guest agent.
const HEARTBEAT_FILE: &str = "heartbeat.json";
/// Largest heartbeat file read; the guest agent writes a few hundred bytes.
const MAX_HEARTBEAT_BYTES: u64 = 4096;
/// Longest one read of the guest-controlled file may take.
const READ_TIMEOUT: Duration = Duration::from_secs(1);

#[derive(Deserialize)]
struct HeartbeatFile {
    heartbeat_seq: u64,
}

/// Reads the latest guest heartbeat, or none before the guest's first one.
///
/// A missing or unreadable file reports no heartbeat rather than failing
/// inspection: it is evidence about the guest, not about the Sandbox.
pub(crate) async fn read(runtime_directory: &Path) -> Option<GuestHeartbeat> {
    let path = runtime_directory.join(HEARTBEAT_FILE);
    let read = tokio::time::timeout(READ_TIMEOUT, read_bounded(&path))
        .await
        .unwrap_or_else(|_| Err(io::Error::new(io::ErrorKind::TimedOut, "reading timed out")));
    let contents = match read {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return None,
        Err(error) => {
            tracing::debug!(%error, path = %path.display(), "could not read Microsandbox guest heartbeat");
            return None;
        }
    };
    match serde_json::from_slice::<HeartbeatFile>(&contents) {
        Ok(file) => Some(GuestHeartbeat::new(file.heartbeat_seq)),
        Err(error) => {
            tracing::debug!(%error, path = %path.display(), "could not parse Microsandbox guest heartbeat");
            None
        }
    }
}

/// Reads at most [`MAX_HEARTBEAT_BYTES`] of a regular file, without following
/// a symlink to it. The file is checked before it is opened, so a FIFO is not
/// opened, and again once open, in case it was replaced in between.
async fn read_bounded(path: &Path) -> io::Result<Vec<u8>> {
    let not_heartbeat = || io::Error::new(io::ErrorKind::InvalidData, "not a small regular file");
    let metadata = tokio::fs::symlink_metadata(path).await?;
    if !metadata.is_file() || metadata.len() > MAX_HEARTBEAT_BYTES {
        return Err(not_heartbeat());
    }
    let file = tokio::fs::File::open(path).await?;
    if !file.metadata().await?.is_file() {
        return Err(not_heartbeat());
    }
    let mut contents = Vec::new();
    file.take(MAX_HEARTBEAT_BYTES).read_to_end(&mut contents).await?;
    Ok(contents)
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use sandbox::GuestHeartbeat;

    use super::{HEARTBEAT_FILE, read};

    #[tokio::test(flavor = "local")]
    async fn reads_the_sequence_of_the_guest_agents_heartbeat() {
        let directory = tempfile::tempdir().expect("temporary directory should be created");
        std::fs::write(
            directory.path().join(HEARTBEAT_FILE),
            br#"{"heartbeat_seq":20,"activity_seq":217,"timestamp":"2026-09-30T13:41:12.662733257Z",
"last_activity":"2026-09-30T13:40:59.618201064Z","active_exec_sessions":0,"active_fs_streams":0,
"active_tcp_streams":0,"activity_counters":{"host_messages":134,"guest_messages":83,
"exec_output_bytes":0,"fs_bytes":4096,"tcp_bytes":0}}"#,
        )
        .expect("heartbeat should be written");

        assert_eq!(read(directory.path()).await, Some(GuestHeartbeat::new(20)));
    }

    #[tokio::test(flavor = "local")]
    async fn a_missing_or_malformed_heartbeat_is_not_evidence() {
        let directory = tempfile::tempdir().expect("temporary directory should be created");
        assert_eq!(read(directory.path()).await, None);

        std::fs::write(directory.path().join(HEARTBEAT_FILE), b"{\"heartbeat_seq\":")
            .expect("heartbeat should be written");
        assert_eq!(read(directory.path()).await, None);
    }

    #[tokio::test(flavor = "local")]
    async fn a_large_heartbeat_file_is_not_read() {
        let directory = tempfile::tempdir().expect("temporary directory should be created");
        let mut large = br#"{"heartbeat_seq":20,"padding":""#.to_vec();
        large.resize(64 * 1024, b' ');
        large.extend_from_slice(br#""}"#);
        std::fs::write(directory.path().join(HEARTBEAT_FILE), large).expect("heartbeat should be written");

        assert_eq!(read(directory.path()).await, None);
    }

    #[cfg(unix)]
    #[tokio::test(flavor = "local")]
    async fn a_heartbeat_that_is_not_a_regular_file_is_not_read() {
        let directory = tempfile::tempdir().expect("temporary directory should be created");
        let target = directory.path().join("elsewhere.json");
        std::fs::write(&target, br#"{"heartbeat_seq":20}"#).expect("target should be written");
        std::os::unix::fs::symlink(&target, directory.path().join(HEARTBEAT_FILE)).expect("symlink");
        assert_eq!(read(directory.path()).await, None, "a symlink is not followed");

        std::fs::remove_file(directory.path().join(HEARTBEAT_FILE)).expect("symlink should be removed");
        let made = std::process::Command::new("mkfifo")
            .arg(directory.path().join(HEARTBEAT_FILE))
            .status()
            .expect("mkfifo should run");
        assert!(made.success());
        let read = tokio::time::timeout(std::time::Duration::from_secs(5), read(directory.path()))
            .await
            .expect("a FIFO must not block the read");
        assert_eq!(read, None);
    }
}
