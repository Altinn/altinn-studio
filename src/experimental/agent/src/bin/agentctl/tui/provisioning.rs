//! The provisioning detail: one Agent's latest pass, followed while it is open.

use std::collections::VecDeque;

use agent::{
    ConditionStatus,
    progress::{AgentProgress, OutputPosition},
    resources::Revision,
};
use sandbox::progress::{ProgressCursor, Update};

use crate::format;

/// Output lines of the pass the detail keeps.
const OUTPUT_LINES: usize = 20;

/// What the detail knows of one Agent's provisioning. A reply carries each
/// output line once, so the most recent lines of the pass are kept here.
#[derive(Default)]
pub(crate) struct Followed {
    latest: Option<AgentProgress>,
    pass: Option<Revision>,
    cursor: ProgressCursor,
    output: VecDeque<String>,
}

impl Followed {
    /// Revision to follow from and the output already kept.
    pub(crate) fn position(&self) -> (Option<Revision>, Option<OutputPosition>) {
        let output = self.pass.map(|pass| OutputPosition {
            pass,
            sequence: self.cursor.output_sequence(),
        });
        (self.latest.as_ref().map(|latest| latest.revision), output)
    }

    pub(crate) fn apply(&mut self, progress: AgentProgress) {
        if let Some(provisioning) = &progress.provisioning {
            if self.pass != Some(provisioning.pass) {
                self.pass = Some(provisioning.pass);
                self.cursor = ProgressCursor::new();
                self.output.clear();
            }
            for update in self.cursor.updates(&provisioning.progress) {
                let line = match update {
                    Update::Output(line) => line.text.clone(),
                    Update::OutputSkipped(count) => format!("… {count} lines skipped"),
                    Update::StepFinished(_) | Update::PhaseFinished(_) => continue,
                };
                if self.output.len() == OUTPUT_LINES {
                    self.output.pop_front();
                }
                self.output.push_back(line);
            }
        }
        self.latest = Some(progress);
    }

    /// The Agent's readiness and failure class, then its latest pass.
    pub(crate) fn lines(&self) -> Vec<String> {
        let Some(latest) = &self.latest else {
            return vec!["Waiting for agentd…".to_owned()];
        };
        let ready = latest.status.ready_condition().map_or_else(
            || "Unknown".to_owned(),
            |ready| match ready.status {
                ConditionStatus::True => "True".to_owned(),
                status => format!("{} ({})", format::condition_status(status), ready.detail()),
            },
        );
        let mut lines = vec![format!("Ready:      {ready}")];
        if let Some(failure) = latest.status.failure {
            lines.push(format!("Failure:    {}", format::failure_kind(failure)));
        }
        match &latest.provisioning {
            Some(provisioning) => lines.extend(format::provisioning_lines(
                &provisioning.progress,
                self.output.iter().map(String::as_str),
            )),
            None => lines.push("Provisioning: no pass since agentd started".to_owned()),
        }
        lines
    }
}

#[cfg(test)]
mod tests {
    use sandbox::{OutputStream, ProgressEvent, SandboxPhase, StepId};

    use super::*;

    fn pass(number: u64) -> Revision {
        format!("00000000-0000-0000-0000-000000000001:{number}")
            .parse()
            .expect("test revision")
    }

    fn reply(number: u64, events: &[ProgressEvent]) -> AgentProgress {
        let mut progress = sandbox::progress::Progress::new();
        for event in events {
            progress.apply(event);
        }
        serde_json::from_value(serde_json::json!({
            "revision": pass(number),
            "status": {},
            "provisioning": {"pass": pass(number), "progress": progress},
        }))
        .expect("test reply")
    }

    fn output(step: &StepId, text: &str) -> ProgressEvent {
        ProgressEvent::StepOutput {
            id: step.clone(),
            stream: OutputStream::Stdout,
            bytes: text.as_bytes().to_vec().into(),
        }
    }

    #[test]
    fn output_is_kept_across_replies_and_starts_over_with_a_new_pass() {
        let step = StepId::generate();
        let started = [
            ProgressEvent::PhaseStarted {
                phase: SandboxPhase::ImageResolve.phase(),
            },
            ProgressEvent::StepStarted {
                id: step.clone(),
                name: "Build Docker image".into(),
                unit: None,
                total: None,
            },
        ];
        let mut followed = Followed::default();
        assert_eq!(followed.position(), (None, None));

        followed.apply(reply(
            1,
            &[started[0].clone(), started[1].clone(), output(&step, "one\n")],
        ));
        let (_, position) = followed.position();
        assert_eq!(
            position,
            Some(OutputPosition {
                pass: pass(1),
                sequence: 1
            })
        );
        // The daemon trims what the follower has already seen.
        let mut trimmed = reply(
            1,
            &[
                started[0].clone(),
                started[1].clone(),
                output(&step, "one\n"),
                output(&step, "two\n"),
            ],
        );
        if let Some(provisioning) = &mut trimmed.provisioning {
            provisioning.progress = provisioning.progress.output_from(1);
        }
        followed.apply(trimmed);
        let lines = followed.lines();
        assert!(
            lines.contains(&"  → Resolve Sandbox Image (0s)".to_owned()),
            "{lines:#?}"
        );
        assert!(lines.contains(&"    Build Docker image".to_owned()));
        assert!(lines.ends_with(&["  Output:".to_owned(), "    one".to_owned(), "    two".to_owned()]));

        followed.apply(reply(2, &[started[0].clone()]));
        assert!(!followed.lines().iter().any(|line| line.contains("one")));
        assert_eq!(
            followed.position().1,
            Some(OutputPosition {
                pass: pass(2),
                sequence: 0
            })
        );
    }
}
