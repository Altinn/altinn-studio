//! Whether each running Sandbox's guest still makes progress.
//!
//! A Sandbox whose guest has stalled keeps its VM process, so its lifecycle
//! state stays running while every Execution into it waits forever. The
//! Backend reports the guest's heartbeat without a round trip to the guest;
//! this tracker records when each heartbeat last changed on the host clock and
//! calls a guest unresponsive once it has not changed for
//! [`UNRESPONSIVE_AFTER`]. Guest-written times are never compared: the guest
//! clock falls behind the host's while the guest is stalled.

use std::{cell::RefCell, collections::HashMap, time::Duration};

use ::sandbox::{GuestHeartbeat, Sandbox, SandboxId, SandboxState};
use tokio::{sync::Notify, time::Instant};

/// How long a running guest's heartbeat may stay unchanged before the guest
/// counts as unresponsive. The guest agent beats about once a second, also
/// while its vCPUs are saturated.
pub const UNRESPONSIVE_AFTER: Duration = Duration::from_secs(15);

/// What the host has observed about one Sandbox's guest.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Responsiveness {
    /// The guest's heartbeat has advanced within [`UNRESPONSIVE_AFTER`].
    Responsive,
    /// The guest's heartbeat has not advanced for [`UNRESPONSIVE_AFTER`].
    Unresponsive,
    /// Nothing is known yet: the Sandbox is not running, the guest has not
    /// reported a heartbeat, or it has not been observed for long enough.
    Unknown,
}

/// Describes a stalled guest for conditions and errors.
#[must_use]
pub fn stall_detail() -> String {
    format!(
        "the guest has not reported progress for {}s",
        UNRESPONSIVE_AFTER.as_secs()
    )
}

/// The error that ends guest-touching work once its guest has stalled.
#[must_use]
pub fn stalled() -> crate::Error {
    crate::Error::SandboxUnresponsive(stall_detail())
}

/// Host-observed heartbeats of running Sandboxes, keyed by Sandbox.
#[derive(Default)]
pub struct Tracker {
    sandboxes: RefCell<HashMap<SandboxId, Tracked>>,
    changed: Notify,
}

struct Tracked {
    heartbeat: GuestHeartbeat,
    /// When `heartbeat` was first observed, or when observation resumed.
    since: Instant,
    responsiveness: Responsiveness,
}

impl Tracker {
    /// Returns what is known about a Sandbox's guest.
    #[must_use]
    pub fn responsiveness(&self, id: &SandboxId) -> Responsiveness {
        self.sandboxes
            .borrow()
            .get(id)
            .map_or(Responsiveness::Unknown, |tracked| tracked.responsiveness)
    }

    /// Records one inspection of a Sandbox and returns the responsiveness it
    /// replaced when it changed.
    ///
    /// Only a changed heartbeat makes an unresponsive guest responsive again,
    /// so a pause in observation can delay, but never hide, a stall.
    pub fn observe(&self, sandbox: &Sandbox, now: Instant) -> Option<Responsiveness> {
        let heartbeat = sandbox
            .guest_heartbeat
            .filter(|_| sandbox.state == SandboxState::Running);
        let mut sandboxes = self.sandboxes.borrow_mut();
        let previous = sandboxes
            .get(&sandbox.id)
            .map_or(Responsiveness::Unknown, |tracked| tracked.responsiveness);
        let current = match (heartbeat, sandboxes.get_mut(&sandbox.id)) {
            (None, _) => {
                sandboxes.remove(&sandbox.id);
                Responsiveness::Unknown
            }
            (Some(heartbeat), Some(tracked)) if tracked.heartbeat != heartbeat => {
                tracked.heartbeat = heartbeat;
                tracked.since = now;
                tracked.responsiveness = Responsiveness::Responsive;
                Responsiveness::Responsive
            }
            (Some(_), Some(tracked)) => {
                if now.saturating_duration_since(tracked.since) >= UNRESPONSIVE_AFTER {
                    tracked.responsiveness = Responsiveness::Unresponsive;
                }
                tracked.responsiveness
            }
            (Some(heartbeat), None) => {
                sandboxes.insert(
                    sandbox.id.clone(),
                    Tracked {
                        heartbeat,
                        since: now,
                        responsiveness: Responsiveness::Unknown,
                    },
                );
                Responsiveness::Unknown
            }
        };
        drop(sandboxes);
        (current != previous).then(|| {
            self.changed.notify_waiters();
            previous
        })
    }

    /// Restarts every heartbeat's age after observation was suspended, such as
    /// while the host slept, so time the observer did not run is not counted
    /// against a guest.
    pub fn resume(&self, now: Instant) {
        for tracked in self.sandboxes.borrow_mut().values_mut() {
            tracked.since = now;
        }
    }

    /// Forgets every Sandbox not in `observed`.
    pub fn retain(&self, observed: &std::collections::HashSet<SandboxId>) {
        self.sandboxes.borrow_mut().retain(|id, _| observed.contains(id));
    }

    /// Completes once the Sandbox's guest is observed to be unresponsive.
    pub async fn unresponsive(&self, id: &SandboxId) {
        loop {
            // Registered before the check, so a change between the two wakes it.
            let changed = self.changed.notified();
            if self.responsiveness(id) == Responsiveness::Unresponsive {
                return;
            }
            changed.await;
        }
    }
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use std::collections::BTreeMap;

    use ::sandbox::{
        ByteQuantity, CpuQuantity, GuestHeartbeat, Hostname, Platform, RootFilesystem, Sandbox, SandboxName,
        SandboxResources, SandboxState, image, init::InitSystem,
    };
    use tokio::time::{Duration, Instant};

    use super::{Responsiveness, Tracker, UNRESPONSIVE_AFTER};

    fn sandbox(state: SandboxState, heartbeat: Option<u64>) -> Sandbox {
        Sandbox {
            image: image::ResolvedImage {
                source: image::ImageSource::Reference {
                    reference: "example.test/agent:latest".into(),
                },
                platform: Platform::new("linux", "amd64"),
                manifest_digest: "sha256:1234".into(),
            },
            id: "00000000-0000-4000-8000-000000000001".parse().expect("test Sandbox ID"),
            name: SandboxName::new("worker").expect("test Sandbox name"),
            hostname: Hostname::new("worker").expect("test hostname"),
            resources: SandboxResources::new(
                "1".parse::<CpuQuantity>().expect("test CPU"),
                "512Mi".parse::<ByteQuantity>().expect("test memory"),
                RootFilesystem::layered("4Gi".parse::<ByteQuantity>().expect("test root filesystem")),
            ),
            init_system: InitSystem::Backend,
            state,
            guest_heartbeat: heartbeat.map(GuestHeartbeat::new),
            mounts: Vec::new(),
            environment: BTreeMap::new(),
            network: None,
        }
    }

    fn running(heartbeat: u64) -> Sandbox {
        sandbox(SandboxState::Running, Some(heartbeat))
    }

    #[test]
    fn a_heartbeat_that_stops_advancing_makes_the_guest_unresponsive() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(1).id;

        assert_eq!(tracker.observe(&running(1), start), None);
        assert_eq!(tracker.responsiveness(&id), Responsiveness::Unknown);
        assert_eq!(
            tracker.observe(&running(2), start + Duration::from_secs(1)),
            Some(Responsiveness::Unknown)
        );
        assert_eq!(tracker.responsiveness(&id), Responsiveness::Responsive);

        let stalled = start + Duration::from_secs(1) + UNRESPONSIVE_AFTER;
        assert_eq!(tracker.observe(&running(2), stalled - Duration::from_millis(1)), None);
        assert_eq!(tracker.observe(&running(2), stalled), Some(Responsiveness::Responsive));
        assert_eq!(tracker.responsiveness(&id), Responsiveness::Unresponsive);

        assert_eq!(
            tracker.observe(&running(3), stalled + Duration::from_secs(1)),
            Some(Responsiveness::Unresponsive)
        );
        assert_eq!(tracker.responsiveness(&id), Responsiveness::Responsive);
    }

    #[test]
    fn a_guest_first_observed_stalled_becomes_unresponsive() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(48).id;

        tracker.observe(&running(48), start);
        tracker.observe(&running(48), start + UNRESPONSIVE_AFTER);

        assert_eq!(tracker.responsiveness(&id), Responsiveness::Unresponsive);
    }

    #[test]
    fn a_restarted_guest_starts_over_and_its_reset_sequence_counts_as_progress() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(1).id;
        tracker.observe(&running(40), start);
        tracker.observe(&running(40), start + UNRESPONSIVE_AFTER);
        assert_eq!(tracker.responsiveness(&id), Responsiveness::Unresponsive);

        // The runtime removes the heartbeat before every boot, and the new
        // boot counts from the start again.
        tracker.observe(&sandbox(SandboxState::Running, None), start + UNRESPONSIVE_AFTER);
        assert_eq!(tracker.responsiveness(&id), Responsiveness::Unknown);
        tracker.observe(&running(1), start + UNRESPONSIVE_AFTER * 2);
        tracker.observe(&running(2), start + UNRESPONSIVE_AFTER * 2 + Duration::from_secs(1));
        assert_eq!(tracker.responsiveness(&id), Responsiveness::Responsive);
    }

    #[test]
    fn a_stopped_sandbox_has_no_evidence_even_with_a_recorded_heartbeat() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(1).id;
        tracker.observe(&running(1), start);
        tracker.observe(&running(1), start + UNRESPONSIVE_AFTER);

        tracker.observe(&sandbox(SandboxState::Stopped, Some(1)), start + UNRESPONSIVE_AFTER);

        assert_eq!(tracker.responsiveness(&id), Responsiveness::Unknown);
    }

    #[test]
    fn resuming_observation_restarts_ages_without_clearing_a_stall() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let responsive = running(1);
        tracker.observe(&responsive, start);
        tracker.observe(&running(2), start + Duration::from_secs(1));

        // The host slept longer than the threshold.
        let woke = start + Duration::from_mins(10);
        tracker.resume(woke);
        tracker.observe(&running(2), woke);
        assert_eq!(tracker.responsiveness(&responsive.id), Responsiveness::Responsive);
        tracker.observe(&running(2), woke + UNRESPONSIVE_AFTER);
        assert_eq!(tracker.responsiveness(&responsive.id), Responsiveness::Unresponsive);

        tracker.resume(woke + UNRESPONSIVE_AFTER * 2);
        tracker.observe(&running(2), woke + UNRESPONSIVE_AFTER * 2);
        assert_eq!(tracker.responsiveness(&responsive.id), Responsiveness::Unresponsive);
    }

    #[tokio::test(flavor = "local", start_paused = true)]
    async fn a_waiter_completes_when_its_guest_becomes_unresponsive() {
        let tracker = std::rc::Rc::new(Tracker::default());
        let id = running(1).id;
        let start = Instant::now();
        tracker.observe(&running(1), start);
        let waiting = tokio::task::spawn_local({
            let tracker = tracker.clone();
            let id = id.clone();
            async move { tracker.unresponsive(&id).await }
        });
        tokio::task::yield_now().await;
        assert!(!waiting.is_finished());

        tracker.observe(&running(1), start + UNRESPONSIVE_AFTER);

        tokio::time::timeout(Duration::from_secs(1), waiting)
            .await
            .expect("the waiter should complete")
            .expect("the waiter should not panic");
    }
}
