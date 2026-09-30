//! Whether each running Sandbox's guest still makes progress.
//!
//! A Sandbox whose guest has stalled keeps its VM process, so its lifecycle
//! state stays running while every Execution into it waits forever. The
//! Backend reports the guest's heartbeat without a round trip to the guest;
//! this tracker records when each heartbeat last changed on the host clock and
//! calls a guest stalled once it has not changed for [`UNRESPONSIVE_AFTER`].
//! Guest-written times are never compared: the guest clock falls behind the
//! host's while the guest is stalled.

use std::{cell::RefCell, collections::HashMap, time::Duration};

use ::sandbox::{GuestHeartbeat, Sandbox, SandboxId, SandboxState};
use tokio::time::Instant;

/// How long a running guest's heartbeat may stay unchanged before the guest
/// counts as stalled. The guest agent beats about once a second, also while
/// its vCPUs are saturated.
pub const UNRESPONSIVE_AFTER: Duration = Duration::from_secs(15);

/// How often guest-touching work inspects its Sandbox's heartbeat.
pub const OBSERVATION_INTERVAL: Duration = Duration::from_secs(2);

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

/// When each running Sandbox's heartbeat last changed, keyed by Sandbox.
#[derive(Default)]
pub struct Tracker {
    sandboxes: RefCell<HashMap<SandboxId, Tracked>>,
}

struct Tracked {
    heartbeat: GuestHeartbeat,
    /// When `heartbeat` was first observed.
    since: Instant,
}

impl Tracker {
    /// Records one inspection of a Sandbox. A Sandbox that is not running, or
    /// reports no heartbeat, has no evidence and is forgotten.
    pub fn observe(&self, sandbox: &Sandbox, now: Instant) {
        let mut sandboxes = self.sandboxes.borrow_mut();
        let Some(heartbeat) = sandbox
            .guest_heartbeat
            .filter(|_| sandbox.state == SandboxState::Running)
        else {
            sandboxes.remove(&sandbox.id);
            return;
        };
        if sandboxes
            .get(&sandbox.id)
            .is_none_or(|tracked| tracked.heartbeat != heartbeat)
        {
            sandboxes.insert(sandbox.id.clone(), Tracked { heartbeat, since: now });
        }
    }

    /// Whether the Sandbox's heartbeat has not changed for [`UNRESPONSIVE_AFTER`].
    /// Only a changed heartbeat clears a stall, so a pause in observation can
    /// delay, but never hide, one.
    #[must_use]
    pub fn stalled(&self, id: &SandboxId, now: Instant) -> bool {
        self.sandboxes
            .borrow()
            .get(id)
            .is_some_and(|tracked| now.saturating_duration_since(tracked.since) >= UNRESPONSIVE_AFTER)
    }

    /// Forgets a released Sandbox.
    pub fn forget(&self, id: &SandboxId) {
        self.sandboxes.borrow_mut().remove(id);
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

    use super::{Tracker, UNRESPONSIVE_AFTER};

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
    fn a_heartbeat_that_stops_advancing_makes_the_guest_stalled() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(1).id;

        tracker.observe(&running(1), start);
        tracker.observe(&running(2), start + Duration::from_secs(1));
        let stalled = start + Duration::from_secs(1) + UNRESPONSIVE_AFTER;
        tracker.observe(&running(2), stalled - Duration::from_millis(1));
        assert!(!tracker.stalled(&id, stalled - Duration::from_millis(1)));
        assert!(tracker.stalled(&id, stalled));

        tracker.observe(&running(3), stalled + Duration::from_secs(1));
        assert!(!tracker.stalled(&id, stalled + Duration::from_secs(1)));
    }

    #[test]
    fn a_guest_first_observed_stalled_becomes_stalled() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(48).id;

        tracker.observe(&running(48), start);
        tracker.observe(&running(48), start + UNRESPONSIVE_AFTER);

        assert!(tracker.stalled(&id, start + UNRESPONSIVE_AFTER));
    }

    #[test]
    fn a_restarted_guest_starts_over_and_its_reset_sequence_counts_as_progress() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(1).id;
        tracker.observe(&running(40), start);
        assert!(tracker.stalled(&id, start + UNRESPONSIVE_AFTER));

        // The runtime removes the heartbeat before every boot, and the new
        // boot counts from the start again.
        tracker.observe(&sandbox(SandboxState::Running, None), start + UNRESPONSIVE_AFTER);
        assert!(!tracker.stalled(&id, start + UNRESPONSIVE_AFTER));
        tracker.observe(&running(1), start + UNRESPONSIVE_AFTER * 2);
        assert!(!tracker.stalled(&id, start + UNRESPONSIVE_AFTER * 2));
    }

    #[test]
    fn a_stopped_sandbox_has_no_evidence_even_with_a_recorded_heartbeat() {
        let tracker = Tracker::default();
        let start = Instant::now();
        let id = running(1).id;
        tracker.observe(&running(1), start);

        tracker.observe(&sandbox(SandboxState::Stopped, Some(1)), start + UNRESPONSIVE_AFTER);

        assert!(!tracker.stalled(&id, start + UNRESPONSIVE_AFTER));
    }
}
