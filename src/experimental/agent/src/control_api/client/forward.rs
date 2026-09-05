//! Validated port-forward updates shared by all Control API clients.

use crate::{
    Error,
    control_api::protocol::{MessageReader, PortForwardBinding, PortForwardServerMessage},
};

use super::BufferedConnection;

/// A listener update with its wire index resolved to the daemon's binding.
#[derive(Debug, Eq, PartialEq)]
pub struct PortForwardEvent {
    /// Host listener affected by this update.
    pub binding: PortForwardBinding,
    /// Whether this listener has stopped serving.
    pub stopped: bool,
    /// Latest relay error, or `None` when it recovered.
    pub message: Option<String>,
}

/// Daemon-owned port forwards tied to one live Control API connection.
///
/// Dropping the session releases the connection and its daemon-owned listeners.
pub struct PortForwardSession {
    bindings: Vec<PortForwardBinding>,
    stopped: Vec<bool>,
    reader: MessageReader<BufferedConnection>,
}

impl PortForwardSession {
    pub(super) fn new(
        bindings: Vec<PortForwardBinding>,
        expected_bindings: usize,
        stream: BufferedConnection,
    ) -> Result<Self, Error> {
        if bindings.is_empty() || bindings.len() != expected_bindings {
            return Err(Error::Invalid(
                "port-forward response has an unexpected binding count".into(),
            ));
        }
        Ok(Self {
            stopped: vec![false; bindings.len()],
            bindings,
            reader: MessageReader::new(stream),
        })
    }

    /// Returns host listeners in request order, with ephemeral ports resolved.
    #[must_use]
    pub fn bindings(&self) -> &[PortForwardBinding] {
        &self.bindings
    }

    /// Reads the next listener update, or `None` once every listener has stopped.
    ///
    /// # Errors
    ///
    /// Returns an error for invalid messages, unknown or stopped listeners, or
    /// a connection that closes before every listener reports completion.
    pub async fn next(&mut self) -> Result<Option<PortForwardEvent>, Error> {
        if self.stopped.iter().all(|stopped| *stopped) {
            return Ok(None);
        }
        let message = self
            .reader
            .next_json()
            .await?
            .ok_or_else(|| Error::Invalid("port-forward stream ended before every listener stopped".into()))?;
        let (index, stopped, message) = match message {
            PortForwardServerMessage::Status { index, message } => (index, false, message),
            PortForwardServerMessage::Stopped { index, message } => (index, true, message),
        };
        let state = self
            .stopped
            .get_mut(index as usize)
            .ok_or_else(|| Error::Invalid("port-forward event has an invalid index".into()))?;
        if *state {
            return Err(Error::Invalid("port-forward event refers to a stopped listener".into()));
        }
        *state = stopped;
        Ok(Some(PortForwardEvent {
            binding: self.bindings[index as usize].clone(),
            stopped,
            message,
        }))
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use serde_json::{Value, json};
    use tokio::io::BufReader;

    use super::*;
    use crate::control_api::protocol::write_stream_message;

    fn session(count: usize, expected: usize, messages: Vec<Value>) -> Result<PortForwardSession, Error> {
        let (client, mut server) = tokio::io::duplex(1024);
        tokio::task::spawn_local(async move {
            for message in messages {
                write_stream_message(&mut server, &message).await.expect("write event");
            }
        });
        let bindings = (0..count)
            .map(|index| PortForwardBinding {
                local_address: ([127, 0, 0, 1], 54_321 + u16::try_from(index).expect("test port offset")).into(),
                guest_port: 3000,
            })
            .collect();
        PortForwardSession::new(bindings, expected, BufReader::new(Box::new(client)))
    }

    #[tokio::test(flavor = "local")]
    async fn response_must_bind_every_requested_forward() {
        for (count, expected) in [(0, 0), (0, 1), (1, 2), (2, 1)] {
            assert!(matches!(session(count, expected, vec![]), Err(Error::Invalid(_))));
        }
    }

    #[tokio::test(flavor = "local")]
    async fn updates_resolve_bindings_and_complete_only_after_every_listener_stops() {
        let mut forwards = session(
            2,
            2,
            vec![
                json!({"type": "status", "index": 1, "message": "retrying"}),
                json!({"type": "status", "index": 1, "message": null}),
                json!({"type": "stopped", "index": 0, "message": "closed"}),
                json!({"type": "stopped", "index": 1, "message": null}),
            ],
        )
        .expect("session");
        for (index, stopped, message) in [
            (1, false, Some("retrying")),
            (1, false, None),
            (0, true, Some("closed")),
            (1, true, None),
        ] {
            assert_eq!(
                forwards.next().await.expect("update"),
                Some(PortForwardEvent {
                    binding: forwards.bindings()[index].clone(),
                    stopped,
                    message: message.map(str::to_owned),
                })
            );
        }
        assert_eq!(forwards.next().await.expect("completed"), None);
        assert_eq!(forwards.next().await.expect("still completed"), None);
    }

    #[tokio::test(flavor = "local")]
    async fn invalid_event_indexes_and_early_disconnects_are_rejected() {
        for kind in ["status", "stopped"] {
            for index in [1, u32::MAX] {
                let mut forwards =
                    session(1, 1, vec![json!({"type": kind, "index": index, "message": null})]).expect("session");
                assert!(
                    matches!(forwards.next().await, Err(Error::Invalid(message)) if message.contains("invalid index"))
                );
            }
        }
        let mut forwards = session(1, 1, vec![]).expect("session");
        assert!(
            matches!(forwards.next().await, Err(Error::Invalid(message)) if message.contains("before every listener stopped"))
        );
    }

    #[tokio::test(flavor = "local")]
    async fn stopped_listeners_cannot_emit_further_updates() {
        for kind in ["status", "stopped"] {
            let mut forwards = session(
                2,
                2,
                vec![
                    json!({"type": "stopped", "index": 0, "message": null}),
                    json!({"type": kind, "index": 0, "message": null}),
                ],
            )
            .expect("session");
            assert!(forwards.next().await.expect("stopped").expect("event").stopped);
            assert!(
                matches!(forwards.next().await, Err(Error::Invalid(message)) if message.contains("stopped listener"))
            );
        }
    }
}
