//! Level-triggered change notification for the Agent and Session resources.
//!
//! Every durable Agent or Session write and every provisioning update advances
//! one daemon-wide revision. Watchers never receive the changes themselves:
//! they wait for the revision to move past the one they last saw and then read
//! the current state, so a slow watcher can skip intermediate states but never miss the
//! latest one.

use std::{fmt, str::FromStr, time::Duration};

use tokio::sync::watch;

/// Daemon-wide change history of the Agent and Session resources.
#[derive(Clone)]
pub struct Changes {
    epoch: uuid::Uuid,
    sequence: watch::Sender<u64>,
}

/// Position in one daemon's change history.
///
/// The epoch is chosen when the daemon starts, so a revision from an earlier
/// daemon process never compares as current.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Revision {
    epoch: uuid::Uuid,
    sequence: u64,
}

impl Changes {
    /// Starts a new change history.
    #[must_use]
    pub fn new() -> Self {
        Self {
            epoch: uuid::Uuid::new_v4(),
            sequence: watch::Sender::new(0),
        }
    }

    /// Records that observable state changed.
    pub fn bump(&self) {
        self.sequence
            .send_modify(|sequence| *sequence = sequence.wrapping_add(1));
    }

    /// Returns the current position.
    #[must_use]
    pub fn revision(&self) -> Revision {
        Revision {
            epoch: self.epoch,
            sequence: *self.sequence.borrow(),
        }
    }

    /// Waits until state has changed since `after`, then for `settle` more so
    /// that a burst of changes produces one wake-up.
    ///
    /// Returns immediately when `after` is absent, belongs to another daemon
    /// process, or is already behind. Returns `false` when `timeout` passes
    /// without a change.
    pub async fn changed_since(&self, after: Option<Revision>, settle: Duration, timeout: Duration) -> bool {
        let Some(after) = after.filter(|after| after.epoch == self.epoch) else {
            return true;
        };
        let mut receiver = self.sequence.subscribe();
        if *receiver.borrow_and_update() != after.sequence {
            return true;
        }
        // `wait_for` returns a read guard on the sequence. Drop it before
        // settling: a change made while it is held would block its writer, and
        // with it the single-threaded runtime this guard is waiting on.
        let changed = tokio::time::timeout(timeout, receiver.wait_for(|sequence| *sequence != after.sequence))
            .await
            .is_ok_and(|changed| changed.is_ok());
        if changed {
            tokio::time::sleep(settle).await;
        }
        changed
    }
}

impl Default for Changes {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for Revision {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}:{}", self.epoch, self.sequence)
    }
}

impl FromStr for Revision {
    type Err = crate::Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let invalid = || crate::Error::Invalid(format!("invalid resource revision {value:?}"));
        let (epoch, sequence) = value.split_once(':').ok_or_else(invalid)?;
        Ok(Self {
            epoch: epoch.parse().map_err(|_| invalid())?,
            sequence: sequence.parse().map_err(|_| invalid())?,
        })
    }
}

impl serde::Serialize for Revision {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

impl<'de> serde::Deserialize<'de> for Revision {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        value.parse().map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SETTLE: Duration = Duration::from_millis(150);
    const TIMEOUT: Duration = Duration::from_secs(30);

    #[test]
    fn revision_round_trips_through_its_wire_form() {
        let changes = Changes::new();
        changes.bump();
        let revision = changes.revision();
        assert_eq!(revision.to_string().parse::<Revision>().expect("revision"), revision);
        let json = serde_json::to_value(revision).expect("revision JSON");
        assert_eq!(
            serde_json::from_value::<Revision>(json).expect("revision from JSON"),
            revision
        );
        assert!("not-a-revision".parse::<Revision>().is_err());
    }

    #[tokio::test(start_paused = true)]
    async fn missing_foreign_or_stale_revisions_return_immediately() {
        let changes = Changes::new();
        assert!(changes.changed_since(None, SETTLE, TIMEOUT).await);
        assert!(
            changes
                .changed_since(Some(Changes::new().revision()), SETTLE, TIMEOUT)
                .await
        );
        let stale = changes.revision();
        changes.bump();
        let started = tokio::time::Instant::now();
        assert!(changes.changed_since(Some(stale), SETTLE, TIMEOUT).await);
        assert_eq!(started.elapsed(), Duration::ZERO);
    }

    #[tokio::test(start_paused = true)]
    async fn current_revision_waits_for_a_change_or_times_out() {
        let changes = Changes::new();
        let current = changes.revision();
        assert!(!changes.changed_since(Some(current), SETTLE, TIMEOUT).await);

        let bumper = changes.clone();
        let waiting = changes.changed_since(Some(current), SETTLE, TIMEOUT);
        let bump = async {
            tokio::time::sleep(Duration::from_secs(1)).await;
            bumper.bump();
            bumper.bump();
        };
        let started = tokio::time::Instant::now();
        let (woke, ()) = tokio::join!(waiting, bump);
        assert!(woke);
        assert_eq!(
            started.elapsed(),
            Duration::from_secs(1) + SETTLE,
            "the watch settles after the first change so a burst wakes it once"
        );
        assert_eq!(changes.revision().sequence, current.sequence + 2);
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn changes_during_the_settle_window_do_not_block_the_writer() {
        let changes = Changes::new();
        let current = changes.revision();
        let bumper = changes.clone();
        let waiting = changes.changed_since(Some(current), SETTLE, TIMEOUT);
        let bump = async {
            tokio::time::sleep(Duration::from_secs(1)).await;
            bumper.bump();
            tokio::time::sleep(SETTLE / 2).await;
            bumper.bump();
        };
        let (woke, ()) = tokio::join!(waiting, bump);
        assert!(woke);
        assert_eq!(changes.revision().sequence, current.sequence + 2);
    }
}
