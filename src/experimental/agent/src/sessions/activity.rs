//! Harness activity, folded from the reports a running harness makes about itself.

use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

/// Coarse phase of the harness's current work, derived from activity events.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    /// No activity event has been observed yet.
    #[default]
    Unknown,
    /// The harness is mid-turn: a prompt was submitted or a tool is running.
    Working,
    /// The harness finished a turn or is blocked on the operator.
    WaitingForInput,
}

/// Harness activity folded from the harness's reports.
///
/// Shaped after the Agent Host Protocol's per-chat `activity`/`status` so a
/// later AHP runtime can populate it by field mapping. Owned by the
/// authenticated report handler; see [`super::Reported`].
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Activity {
    /// Current coarse work phase.
    #[serde(default)]
    pub phase: Phase,
    /// Reported turn endings (including interruption) observed for the running harness launch.
    #[serde(default)]
    pub turns: u64,
    /// Time of the most recent activity event, when one has been observed.
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "time::serde::rfc3339::option"
    )]
    pub last_event_at: Option<OffsetDateTime>,
}

/// One activity signal a harness reports, before it is folded into [`Activity`].
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ActivityEvent {
    /// The harness process started (also carries the native session ID).
    SessionStart,
    /// The operator submitted a prompt; a turn began.
    TurnStarted,
    /// The harness ended a turn and is awaiting input; this does not imply success.
    TurnCompleted,
    /// The harness is blocked awaiting an operator decision.
    WaitingForInput,
}

impl Activity {
    /// Folds one activity event into the accumulated activity, at `at`.
    #[must_use]
    pub const fn folded(mut self, event: ActivityEvent, at: OffsetDateTime) -> Self {
        match event {
            ActivityEvent::SessionStart | ActivityEvent::TurnStarted => {
                self.phase = Phase::Working;
            }
            ActivityEvent::TurnCompleted => {
                self.phase = Phase::WaitingForInput;
                self.turns = self.turns.saturating_add(1);
            }
            ActivityEvent::WaitingForInput => self.phase = Phase::WaitingForInput,
        }
        self.last_event_at = Some(at);
        self
    }
}

#[cfg(test)]
mod tests {
    use time::OffsetDateTime;

    use super::{Activity, ActivityEvent, Phase};

    fn at(seconds: i64) -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(seconds).expect("timestamp")
    }

    #[test]
    fn folds_events_into_phase_and_turn_count() {
        let cases: &[(ActivityEvent, Phase, u64)] = &[
            (ActivityEvent::SessionStart, Phase::Working, 0),
            (ActivityEvent::TurnStarted, Phase::Working, 0),
            (ActivityEvent::WaitingForInput, Phase::WaitingForInput, 0),
            (ActivityEvent::TurnCompleted, Phase::WaitingForInput, 1),
            (ActivityEvent::TurnStarted, Phase::Working, 1),
            (ActivityEvent::TurnCompleted, Phase::WaitingForInput, 2),
        ];
        let mut activity = Activity::default();
        for (index, (event, phase, turns)) in cases.iter().enumerate() {
            let now = at(i64::try_from(index).expect("index") + 1);
            activity = activity.folded(*event, now);
            assert_eq!(activity.phase, *phase, "phase after {event:?}");
            assert_eq!(activity.turns, *turns, "turns after {event:?}");
            assert_eq!(activity.last_event_at, Some(now), "timestamp after {event:?}");
        }
    }

    #[test]
    fn turn_count_saturates() {
        let activity = Activity {
            turns: u64::MAX,
            ..Activity::default()
        };
        assert_eq!(activity.folded(ActivityEvent::TurnCompleted, at(1)).turns, u64::MAX);
    }
}
