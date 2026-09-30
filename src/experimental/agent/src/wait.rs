//! Decides from stored state when a wait for a requested change is over.
//!
//! Every request a caller can wait for bumps a counter on its resource: an
//! Agent's `generation` or sync request, or a Session's `generation`. The
//! resource's reconciler records the matching observed counter together with
//! a final outcome. A waiter compares the two and reads the outcome; it never
//! needs the result of a particular reconciliation pass. The checks here are
//! pure, so the server and clients decide the same way.

use time::{Duration, OffsetDateTime};

use crate::{
    Error, FailureKind, Status,
    sessions::{LifecycleReason, LifecycleState, Phase, Session, State},
};

/// How long a completed turn's activity must stay unchanged before it counts:
/// a harness can report more work right after a completion.
pub const TURN_SETTLE: Duration = Duration::milliseconds(250);

/// How a wait treats a failure that reconciliation retries.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Policy {
    /// Keep waiting through transient failures, until Ready or a failure that ends waits.
    UntilReady,
    /// End at the first outcome, whatever it is.
    FirstPass,
}

/// The outcome a waiter reads, the same for every resource.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Outcome {
    /// Stable reason code.
    pub reason: String,
    /// Human-readable detail.
    pub message: String,
    /// Failure class, when the outcome is a failure.
    pub failure: Option<FailureKind>,
}

/// What a wait has seen so far.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Settled {
    /// The request has not been handled, or its outcome is not final yet.
    Pending,
    /// The request was handled with the expected outcome.
    Done,
    /// The request was handled and failed.
    Failed(Outcome),
    /// A later request was handled, and the resource no longer matches the one waited for.
    Superseded(Outcome),
}

/// The Agent counters a wait must see handled.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AgentRequest {
    /// Desired generation at the time of the request.
    pub generation: u64,
    /// Sync request the wait made, or 0 for none.
    #[serde(rename = "syncRequested")]
    pub sync: u64,
}

/// Decides an Agent wait: done once a pass that handled `request` left the
/// Agent Ready.
#[must_use]
pub fn agent(status: &Status, request: AgentRequest, policy: Policy) -> Settled {
    if status.observed_generation < request.generation || status.sync.observed < request.sync {
        return Settled::Pending;
    }
    if status.is_ready() {
        return Settled::Done;
    }
    let outcome = agent_outcome(status);
    match (outcome.failure, policy) {
        (Some(FailureKind::Invalid | FailureKind::Unavailable), _)
        | (Some(FailureKind::Transient), Policy::FirstPass) => Settled::Failed(outcome),
        _ => Settled::Pending,
    }
}

/// The Agent's outcome, from its Ready condition and failure class.
#[must_use]
pub fn agent_outcome(status: &Status) -> Outcome {
    status.ready_condition().map_or_else(
        || Outcome {
            reason: "Unknown".into(),
            message: "no Ready condition was reported".into(),
            failure: status.failure,
        },
        |ready| Outcome {
            reason: ready.reason.clone(),
            message: ready.detail(),
            failure: status.failure,
        },
    )
}

/// The error a waiter reports for an outcome that ended its wait, by its failure class.
#[must_use]
pub fn outcome_error(outcome: Outcome) -> Error {
    match outcome.failure {
        Some(FailureKind::Invalid) => Error::Invalid(outcome.message),
        Some(FailureKind::Unavailable) => Error::Unavailable(outcome.message),
        Some(FailureKind::Transient) | None => Error::Daemon(outcome.message),
    }
}

/// The Session state a wait expects its request to produce.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Expected {
    /// A running harness, after ensure.
    Running,
    /// A stopping or stopped harness, after archive.
    Archived,
    /// No longer archived, after unarchive.
    Unarchived,
    /// Gone, after delete. A Session still present is either not released
    /// yet or its release failed.
    Deleted,
}

/// Decides a Session wait for request `requested`.
///
/// The observed counter moves only with final outcomes, but a later hold or
/// resume can overwrite the lifecycle without moving it, and a watcher may
/// skip states. So a non-final lifecycle at the requested counter is still
/// pending. A final outcome that does not match is superseded: a later
/// request won, or the outcome has since changed on its own, such as an idle
/// stop after the harness ran.
#[must_use]
pub fn session(session: &Session, requested: u64, expected: Expected) -> Settled {
    if session.observed_generation < requested {
        return Settled::Pending;
    }
    let lifecycle = &session.status.lifecycle;
    let matches = match expected {
        Expected::Running => lifecycle.state == LifecycleState::Running && !session.is_archived(),
        // A stop that failed leaves the Session archived, but its outcome is
        // the failure. A turn still finishing keeps whatever lifecycle it had.
        Expected::Archived => {
            session.is_archived() && !(lifecycle.state == LifecycleState::Archived && lifecycle.failure_kind.is_some())
        }
        Expected::Unarchived => !session.is_archived(),
        Expected::Deleted => false,
    };
    if matches {
        return Settled::Done;
    }
    if !lifecycle.is_outcome() {
        return Settled::Pending;
    }
    let outcome = session_outcome(session);
    if outcome.failure.is_some() {
        return Settled::Failed(outcome);
    }
    // A later request's outcome, or this request's outcome that has since
    // changed on its own, such as an idle stop after the harness ran.
    Settled::Superseded(outcome)
}

/// The Session's outcome, from its lifecycle.
#[must_use]
pub fn session_outcome(session: &Session) -> Outcome {
    let lifecycle = &session.status.lifecycle;
    Outcome {
        reason: lifecycle
            .reason
            .map_or_else(|| format!("{:?}", lifecycle.state), |reason| format!("{reason:?}")),
        message: lifecycle
            .failure
            .clone()
            .unwrap_or_else(|| format!("{:?}", session.status.state)),
        failure: lifecycle.failure_kind,
    }
}

/// The error a waiter reports for a Session outcome that ended its wait.
///
/// An Agent that must change and a missing harness are invalid requests, as
/// the reasons say; everything else reads like a Session that is not running.
#[must_use]
pub fn session_error(session: &Session, outcome: Outcome) -> Error {
    match session.status.lifecycle.reason {
        Some(LifecycleReason::AgentInvalid | LifecycleReason::HarnessNotInstalled) => Error::Invalid(outcome.message),
        Some(LifecycleReason::AgentUnavailable) => Error::Unavailable(outcome.message),
        Some(LifecycleReason::AgentDeleted) => Error::Conflict,
        _ => session.not_running_error(),
    }
}

/// What a wait for a prompt's turn has seen.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Turn {
    /// A turn after the prompt completed and the harness waits for input.
    Completed,
    /// No completed turn yet; check again at `recheck_at` if nothing changes before.
    Pending {
        /// When the completion being settled counts, if one is.
        recheck_at: Option<OffsetDateTime>,
    },
    /// The Session left the states a turn can complete in.
    Ended(State),
}

/// Decides a turn wait, raising `before` when a newer turn is already running.
///
/// A turn counts once the completed-turn count exceeds `before`, the harness
/// waits for input, and no event has arrived for [`TURN_SETTLE`]. A newer
/// turn that started before the completion was seen must complete as well,
/// so its permission prompts never satisfy the wait. `now` is the daemon's
/// clock, which stamps the activity.
pub fn turn(before: &mut u64, session: &Session, now: OffsetDateTime) -> Turn {
    let activity = &session.status.reported.activity;
    let waiting = match session.status.state {
        State::Failed | State::Idle | State::Archived => return Turn::Ended(session.status.state),
        State::WaitingForInput => true,
        // An archive that has not stopped the harness yet leaves the turn to its own report.
        State::Archiving => activity.phase == Phase::WaitingForInput,
        State::Starting | State::Working => false,
    };
    if activity.turns > *before && waiting {
        let settled_at = activity.last_event_at.map(|at| at + TURN_SETTLE);
        return match settled_at {
            Some(settled_at) if settled_at > now => Turn::Pending {
                recheck_at: Some(settled_at),
            },
            _ => Turn::Completed,
        };
    }
    *before = (*before).max(activity.turns);
    Turn::Pending { recheck_at: None }
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use time::{Duration, OffsetDateTime};

    use super::{AgentRequest, Expected, Policy, Settled, TURN_SETTLE, Turn};
    use crate::{
        Condition, ConditionStatus, FailureKind, Status, SyncStatus,
        sessions::{Activity, Lifecycle, LifecycleReason, Phase, Reported, Session, Status as SessionStatus},
    };

    fn ready(ready: bool, failure: Option<FailureKind>) -> Status {
        let mut status = Status::observed(
            1,
            None,
            vec![Condition {
                kind: Condition::READY.into(),
                status: if ready {
                    ConditionStatus::True
                } else {
                    ConditionStatus::False
                },
                reason: if ready {
                    "SandboxReady"
                } else {
                    "SandboxReconcileFailed"
                }
                .into(),
                message: if ready { "" } else { "setup failed" }.into(),
                last_transition_time: None,
            }],
        );
        status.failure = failure;
        status.sync = SyncStatus {
            requested: 3,
            observed: 3,
        };
        status
    }

    const REQUEST: AgentRequest = AgentRequest { generation: 1, sync: 3 };

    #[test]
    fn an_agent_wait_needs_the_pass_that_handled_its_request() {
        let mut status = ready(true, None);
        status.sync.observed = 2;
        assert_eq!(super::agent(&status, REQUEST, Policy::UntilReady), Settled::Pending);
        status.sync.observed = 3;
        assert_eq!(super::agent(&status, REQUEST, Policy::UntilReady), Settled::Done);

        let mut stale = ready(true, None);
        stale.observed_generation = 0;
        assert_eq!(super::agent(&stale, REQUEST, Policy::UntilReady), Settled::Pending);
    }

    #[test]
    fn transient_agent_failures_end_only_first_pass_waits() {
        let status = ready(false, Some(FailureKind::Transient));
        assert_eq!(super::agent(&status, REQUEST, Policy::UntilReady), Settled::Pending);
        assert!(matches!(
            super::agent(&status, REQUEST, Policy::FirstPass),
            Settled::Failed(outcome) if outcome.message == "setup failed"
        ));
        for kind in [FailureKind::Invalid, FailureKind::Unavailable] {
            assert!(matches!(
                super::agent(&ready(false, Some(kind)), REQUEST, Policy::UntilReady),
                Settled::Failed(outcome) if outcome.failure == Some(kind)
            ));
        }
    }

    fn session(lifecycle: Lifecycle, generation: u64, observed: u64) -> Session {
        Session {
            id: "00000000-0000-4000-8000-000000000001".parse().expect("Session ID"),
            agent_id: "00000000-0000-4000-8000-000000000002".parse().expect("Agent ID"),
            agent: "worker".into(),
            name: "s1".to_string().try_into().expect("Session name"),
            harness: crate::harness::test_harness(),
            model_selection: crate::ModelSelection::default(),
            created_at: OffsetDateTime::UNIX_EPOCH,
            deletion_timestamp: None,
            archived_at: None,
            status: SessionStatus::new(lifecycle, Reported::default()),
            activation_generation: 0,
            observed_activation_generation: 0,
            generation,
            observed_generation: observed,
            agent_sync: 0,
        }
    }

    #[test]
    fn a_session_wait_ends_with_the_outcome_of_its_request() {
        assert_eq!(
            super::session(&session(Lifecycle::running(), 2, 1), 2, Expected::Running),
            Settled::Pending
        );
        assert_eq!(
            super::session(&session(Lifecycle::running(), 2, 2), 2, Expected::Running),
            Settled::Done
        );
        let failed = Lifecycle::failed(
            LifecycleReason::HarnessBackoff,
            "harness exited",
            FailureKind::Transient,
        );
        assert!(matches!(
            super::session(&session(failed, 2, 2), 2, Expected::Running),
            Settled::Failed(outcome) if outcome.message == "harness exited"
        ));
        let terminal = Lifecycle::held(LifecycleReason::HarnessNotInstalled, "no harness", false);
        assert!(matches!(
            super::session(&session(terminal, 2, 2), 2, Expected::Running),
            Settled::Failed(outcome) if outcome.reason == "HarnessNotInstalled"
        ));
    }

    #[test]
    fn a_hold_is_pending_and_only_a_later_request_supersedes() {
        let hold = Lifecycle::held(LifecycleReason::AgentNotReady, "Agent is not ready", false);
        // A hold written after this request's outcome, at the same counter.
        assert_eq!(
            super::session(&session(hold.clone(), 2, 2), 2, Expected::Running),
            Settled::Pending
        );
        assert_eq!(
            super::session(&session(hold, 3, 3), 2, Expected::Running),
            Settled::Pending
        );
        assert!(matches!(
            super::session(&session(Lifecycle::idle(), 3, 3), 2, Expected::Running),
            Settled::Superseded(outcome) if outcome.reason == "Idle"
        ));
    }

    #[test]
    fn a_resume_in_progress_is_not_an_outcome() {
        for resuming in [
            Lifecycle::resuming(),
            Lifecycle::resuming_with("interrupted", FailureKind::Transient),
        ] {
            assert_eq!(
                super::session(&session(resuming, 2, 2), 2, Expected::Running),
                Settled::Pending,
                "a later pass brings the resumed harness to its input prompt"
            );
        }
    }

    #[test]
    fn archive_is_done_once_its_pass_stops_or_waits_for_the_turn() {
        let mut archiving = session(Lifecycle::running(), 3, 3);
        archiving.archived_at = Some(OffsetDateTime::UNIX_EPOCH);
        assert_eq!(super::session(&archiving, 3, Expected::Archived), Settled::Done);
        assert!(matches!(
            super::session(&archiving, 3, Expected::Running),
            Settled::Superseded(_)
        ));
        let unarchived = session(Lifecycle::idle(), 4, 4);
        assert_eq!(super::session(&unarchived, 4, Expected::Unarchived), Settled::Done);

        let mut finishing_a_turn = session(
            Lifecycle::failed(
                LifecycleReason::HarnessBackoff,
                "harness exited",
                FailureKind::Transient,
            ),
            3,
            3,
        );
        finishing_a_turn.archived_at = Some(OffsetDateTime::UNIX_EPOCH);
        assert_eq!(
            super::session(&finishing_a_turn, 3, Expected::Archived),
            Settled::Done,
            "a pass that waits for the turn keeps the lifecycle it had, failure included"
        );

        let mut stop_failed = session(Lifecycle::archived_with("unreachable", FailureKind::Transient), 3, 3);
        stop_failed.archived_at = Some(OffsetDateTime::UNIX_EPOCH);
        assert!(matches!(
            super::session(&stop_failed, 3, Expected::Archived),
            Settled::Failed(outcome) if outcome.message == "unreachable"
        ));
    }

    #[test]
    fn a_delete_waits_for_the_session_to_go_or_its_release_to_fail() {
        let mut deleting = session(Lifecycle::running(), 5, 4);
        deleting.deletion_timestamp = Some(OffsetDateTime::UNIX_EPOCH);
        assert_eq!(super::session(&deleting, 5, Expected::Deleted), Settled::Pending);
        let release_failed = Lifecycle::failed(LifecycleReason::ReleaseFailed, "stop failed", FailureKind::Transient);
        deleting.status = SessionStatus::new(release_failed, Reported::default());
        deleting.observed_generation = 5;
        assert!(matches!(
            super::session(&deleting, 5, Expected::Deleted),
            Settled::Failed(outcome) if outcome.reason == "ReleaseFailed"
        ));
    }

    fn turn_session(state: Phase, turns: u64, last_event_at: OffsetDateTime) -> Session {
        let mut session = session(Lifecycle::running(), 1, 1);
        session.status = SessionStatus::new(
            Lifecycle::running(),
            Reported {
                harness_session_id: Some("native".into()),
                activity: Activity {
                    phase: state,
                    turns,
                    last_event_at: Some(last_event_at),
                    phase_since: Some(OffsetDateTime::UNIX_EPOCH),
                },
                ..Reported::default()
            },
        );
        session
    }

    #[test]
    fn a_turn_counts_once_its_activity_has_settled() {
        let at = OffsetDateTime::UNIX_EPOCH + Duration::hours(1);
        let completed = turn_session(Phase::WaitingForInput, 4, at);
        let mut before = 3;
        assert_eq!(
            super::turn(&mut before, &completed, at + Duration::milliseconds(100)),
            Turn::Pending {
                recheck_at: Some(at + TURN_SETTLE)
            }
        );
        assert_eq!(super::turn(&mut before, &completed, at + TURN_SETTLE), Turn::Completed);
    }

    #[test]
    fn a_newer_turn_already_running_raises_what_the_wait_needs() {
        let at = OffsetDateTime::UNIX_EPOCH + Duration::hours(1);
        let mut before = 3;
        assert_eq!(
            super::turn(&mut before, &turn_session(Phase::Working, 4, at), at),
            Turn::Pending { recheck_at: None }
        );
        assert_eq!(before, 4);
        let later = at + Duration::seconds(5);
        assert_eq!(
            super::turn(
                &mut before,
                &turn_session(Phase::WaitingForInput, 4, later),
                later + TURN_SETTLE
            ),
            Turn::Pending { recheck_at: None },
            "the completion seen while the newer turn ran does not count"
        );
        assert_eq!(
            super::turn(
                &mut before,
                &turn_session(Phase::WaitingForInput, 5, later),
                later + TURN_SETTLE
            ),
            Turn::Completed
        );
    }
}
