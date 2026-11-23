package runs

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/callbacks"
)

var (
	// commandEnded is when run.await-result had the outcome in the progress that the tests build.
	commandEnded    = time.Date(2026, 11, 3, 10, 20, 0, 0, time.UTC)
	cancelRequested = time.Date(2026, 11, 3, 10, 31, 0, 0, time.UTC)
)

// atStep is the progress of a workflow at the step. "" means that all steps are complete.
func atStep(step string) callbacks.Progress {
	return callbacks.Progress{Step: step, UpdatedAt: new(time.Date(2026, 11, 3, 10, 30, 0, 0, time.UTC))}
}

// settled is the progress of a workflow that the engine settled at the step. ended is the progress of a workflow that
// the step ended for the reason.
func settled(step string) callbacks.Progress {
	progress := atStep(step)
	progress.Settled = true
	return progress
}

func ended(step, reason string) callbacks.Progress {
	progress := settled(step)
	progress.End = &callbacks.End{Reason: reason, Detail: "It ended."}
	return progress
}

func canceled(progress callbacks.Progress) callbacks.Progress {
	progress.CancelRequestedAt = &cancelRequested
	return progress
}

// withResult gives the progress the state of a completed command. withOutcome gives it the state of a command that
// ended with the outcome and the error.
func withResult(progress callbacks.Progress) callbacks.Progress {
	return withOutcome(progress, "completed", "")
}

func withOutcome(progress callbacks.Progress, outcome, message string) callbacks.Progress {
	progress.State = new(string(must(json.Marshal(runState{Kind: testKind, Spec: KindSpec{Namespace: testNamespace},
		Outcome: outcome, Error: message, StartedAt: new(commandEnded.Add(-time.Minute)), FinishedAt: &commandEnded}))))
	return progress
}

func TestDescribeMapsTheProgressToARunStatus(t *testing.T) {
	cases := []struct {
		name     string
		status   Status
		reason   string
		progress callbacks.Progress
	}{
		{"queued", StatusQueued, "", atStep(StepAdmit)},
		{"creating the Job", StatusStarting, "", atStep(StepCreateJob)},
		{"waiting for the pod", StatusStarting, "", atStep(StepAwaitPod)},
		{"waiting for the archive", StatusAwaitingArchive, "", atStep(StepAwaitArchive)},
		{"running", StatusRunning, "", atStep(StepAwaitResult)},
		{"cleaning up after a result", StatusCompleted, "", withResult(atStep(StepCleanup))},
		{"every step done before the workflow", StatusCompleted, "", withResult(atStep(""))},
		{"cleaning up after a failed command", StatusFailed, ReasonRunFailed,
			withOutcome(atStep(StepCleanup), "failed", "boom")},
		{"completed", StatusCompleted, "", withResult(settled(""))},
		{"completed without an outcome", StatusFailed, ReasonInternal, settled("")},
		{"queue timeout", StatusExpired, ReasonQueueTimeout, ended(StepAdmit, ReasonQueueTimeout)},
		{"admit failed in the engine", StatusFailed, ReasonStartFailed, settled(StepAdmit)},
		{"Job refused", StatusFailed, ReasonStartFailed, settled(StepCreateJob)},
		{"pod failed", StatusFailed, ReasonStartFailed, settled(StepAwaitPod)},
		{"operator runner refused", StatusFailed, ReasonStartFailed, settled(StepAwaitArchive)},
		{"no archive arrived", StatusFailed, ReasonArchiveTimeout, ended(StepAwaitArchive, ReasonArchiveTimeout)},
		{"pod gone while running", StatusFailed, ReasonRunFailed, settled(StepAwaitResult)},
		{"cleanup failed after a result", StatusCompleted, "", withResult(settled(StepCleanup))},
		{"cleanup failed without a result", StatusFailed, ReasonInternal, settled(StepCleanup)},
		{"canceled", StatusCanceled, "", canceled(settled(StepAwaitPod))},
		{"canceled after the result", StatusCompleted, "", withResult(canceled(settled(StepCleanup)))},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			RegisterTestingT(t)
			described := describe(tc.progress)
			Expect(described.Status).To(Equal(tc.status))
			if tc.reason == "" {
				Expect(described.Error).To(BeNil())
			} else {
				Expect(described.Error).NotTo(BeNil())
				Expect(described.Error.Reason).To(Equal(tc.reason))
			}
			Expect(described.FinishedAt != nil).To(Equal(tc.status.Final()))
			keepsResult := tc.status == StatusCompleted && !tc.progress.Settled
			Expect(described.ResultExpiresAt != nil).To(Equal(keepsResult), "only while the Job keeps the result")
		})
	}
}

func TestDescribeTellsWhenTheRunRanAndUntilWhenTheResultCanBeFetched(t *testing.T) {
	RegisterTestingT(t)

	described := describe(withResult(atStep(StepCleanup)))
	Expect(*described.StartedAt).To(Equal(commandEnded.Add(-time.Minute)))
	Expect(*described.FinishedAt).To(Equal(commandEnded))
	Expect(*described.ResultExpiresAt).To(Equal(commandEnded.Add(5 * time.Minute)))
}

func TestDescribeShowsACancelBeforeTheCommandAtOnce(t *testing.T) {
	RegisterTestingT(t)

	for _, step := range []string{StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive} {
		described := describe(canceled(atStep(step)))
		Expect(described.Status).To(Equal(StatusCanceled), step)
		Expect(*described.FinishedAt).To(Equal(cancelRequested))
	}
}

func TestDescribeLetsAResultWinOverACancel(t *testing.T) {
	RegisterTestingT(t)

	Expect(describe(canceled(atStep(StepAwaitResult))).Status).To(Equal(StatusRunning))
	Expect(describe(withResult(canceled(atStep(StepCleanup)))).Status).To(Equal(StatusCompleted))
	Expect(describe(withResult(canceled(settled("")))).Status).To(Equal(StatusCompleted))
	// The cancel deleted the Job, so the step failed before the engine canceled the workflow.
	Expect(describe(canceled(settled(StepAwaitResult))).Status).To(Equal(StatusCanceled))
}

func TestDescribeKeepsTheErrorDetailShort(t *testing.T) {
	RegisterTestingT(t)

	progress := ended(StepAwaitArchive, ReasonStartFailed)
	progress.End.Detail = "x" + strings.Repeat("æ", maxDetail)
	described := describe(progress)
	Expect(len(described.Error.Detail)).To(BeNumerically("<=", maxDetail))
	Expect(strings.ToValidUTF8(described.Error.Detail, "?")).To(Equal(described.Error.Detail))
}
