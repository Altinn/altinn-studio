//! Guest heartbeats read from a running runtime's host-side directory.
//!
//! Microsandbox's guest agent replaces `heartbeat.json` in the runtime
//! directory about once a second from a dedicated thread, and the runtime
//! removes it before every boot. Reading the file needs no round trip to the
//! guest, so a guest that stopped responding keeps reporting the sequence it
//! last wrote. Only the sequence is read: the guest-written timestamps follow
//! the guest clock, which falls behind the host's while the guest is stalled.

use std::path::Path;

use sandbox::GuestHeartbeat;
use serde::Deserialize;

/// Heartbeat file in a runtime directory, written by the guest agent.
const HEARTBEAT_FILE: &str = "heartbeat.json";

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
    let contents = match tokio::fs::read(&path).await {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return None,
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
}
