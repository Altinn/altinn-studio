package runs

import (
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/engine"
)

// workflowAt builds a workflow whose steps before current have completed, as the engine reports it.
func workflowAt(overall engine.Status, current string, currentStatus engine.Status) *engine.Workflow {
	updated := time.Date(2026, 11, 3, 10, 30, 0, 0, time.UTC)
	keys := []string{StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive, StepAwaitResult, StepCleanup}
	workflow := &engine.Workflow{OverallStatus: overall, UpdatedAt: &updated}
	reached := current == ""
	for i, key := range keys {
		step := engine.Step{OperationID: key, ProcessingOrder: i, Status: engine.StatusEnqueued}
		switch {
		case key == current:
			step.Status = currentStatus
			reached = true
		case !reached:
			step.Status = engine.StatusCompleted
		}
		if current == "" {
			step.Status = engine.StatusCompleted
		}
		workflow.Steps = append(workflow.Steps, step)
	}
	return workflow
}

// atStep builds a workflow whose current step has the workflow's status, as workflowAt does.
func atStep(status engine.Status, current string) *engine.Workflow {
	return workflowAt(status, current, status)
}

// failedAt builds a workflow that failed at the step.
func failedAt(current string) *engine.Workflow {
	return atStep(engine.StatusFailed, current)
}

// withResult gives the workflow the state of a command that completed.
func withResult(workflow *engine.Workflow) *engine.Workflow {
	return withOutcome(workflow, "completed", "")
}

// withFailedCommand gives the workflow the state of a command that failed.
func withFailedCommand(workflow *engine.Workflow) *engine.Workflow {
	return withOutcome(workflow, "failed", "boom")
}

func withOutcome(workflow *engine.Workflow, outcome, message string) *engine.Workflow {
	for i := range workflow.Steps {
		if workflow.Steps[i].OperationID == StepAwaitResult {
			state := `{"kind":"upgrade-v9","spec":{"namespace":"sandbox-runs"},"podIP":"10.0.0.1","outcome":"` +
				outcome + `","error":"` + message + `"}`
			workflow.Steps[i].StateOut = &state
		}
	}
	return workflow
}

// withError gives the workflow's current step, the first that has not completed, an error with the message.
func withError(workflow *engine.Workflow, message string) *engine.Workflow {
	for i := range workflow.Steps {
		if workflow.Steps[i].Status != engine.StatusCompleted {
			workflow.Steps[i].ErrorHistory = []engine.ErrorEntry{{Message: message}}
			break
		}
	}
	return workflow
}

func TestDescribeMapsTheWorkflowToARunStatus(t *testing.T) {
	// The engine's own error when a wait budget runs out, which the operator does not let happen to run.admit.
	waitExpired := "Wait budget of 00:15:00 exhausted after 300 deferral(s): The run is number 3 in the queue."
	queueTimeout := `{"status":422,"reason":"queue-timeout","detail":"The run waited."}`
	noArchive := `{"status":422,"reason":"archive-timeout","detail":"No archive arrived."}`
	cases := []struct {
		name     string
		workflow *engine.Workflow
		status   Status
		reason   string
	}{
		{"new", atStep(engine.StatusEnqueued, StepAdmit), StatusQueued, ""},
		{"queued", atStep(engine.StatusWaiting, StepAdmit), StatusQueued, ""},
		{"creating the Job", atStep(engine.StatusProcessing, StepCreateJob), StatusStarting, ""},
		{"waiting for the pod", atStep(engine.StatusWaiting, StepAwaitPod), StatusStarting, ""},
		{"waiting for the archive", atStep(engine.StatusWaiting, StepAwaitArchive), StatusAwaitingArchive, ""},
		{"retrying the operator runner while waiting for the archive", atStep(engine.StatusRequeued, StepAwaitArchive),
			StatusAwaitingArchive, ""},
		{"running", atStep(engine.StatusWaiting, StepAwaitResult), StatusRunning, ""},
		{"cleaning up after a result", withResult(atStep(engine.StatusProcessing, StepCleanup)), StatusCompleted, ""},
		{"every step done before the workflow", withResult(atStep(engine.StatusProcessing, "")), StatusCompleted, ""},
		{"cleaning up after a failed command", withFailedCommand(atStep(engine.StatusProcessing, StepCleanup)),
			StatusFailed, ReasonRunFailed},
		{"completed", withResult(atStep(engine.StatusCompleted, "")), StatusCompleted, ""},
		{"completed without an outcome", atStep(engine.StatusCompleted, ""), StatusFailed, ReasonInternal},
		{"queue timeout", withError(failedAt(StepAdmit), queueTimeout), StatusExpired, ReasonQueueTimeout},
		{"wait budget of admit run out in the engine", withError(failedAt(StepAdmit), waitExpired),
			StatusFailed, ReasonStartFailed},
		{"Job refused", failedAt(StepCreateJob), StatusFailed, ReasonStartFailed},
		{"pod failed", failedAt(StepAwaitPod), StatusFailed, ReasonStartFailed},
		{"operator runner refused", failedAt(StepAwaitArchive), StatusFailed, ReasonStartFailed},
		{"no archive arrived", withError(failedAt(StepAwaitArchive), noArchive), StatusFailed, ReasonArchiveTimeout},
		{"pod gone while running", failedAt(StepAwaitResult), StatusFailed, ReasonRunFailed},
		{"cleanup failed after a result", withResult(failedAt(StepCleanup)), StatusCompleted, ""},
		{"cleanup failed without a result", failedAt(StepCleanup), StatusFailed, ReasonInternal},
		{"abandoned", workflowAt(engine.StatusAbandoned, StepAwaitArchive, engine.StatusFailed),
			StatusFailed, ReasonStartFailed},
		{"dependency failed", workflowAt(engine.StatusDependencyFailed, StepAdmit, engine.StatusEnqueued),
			StatusFailed, ReasonInternal},
		{"canceled", workflowAt(engine.StatusCanceled, StepAwaitPod, engine.StatusWaiting), StatusCanceled, ""},
		{"canceled after the result", withResult(workflowAt(engine.StatusCanceled, StepCleanup, engine.StatusEnqueued)),
			StatusCompleted, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			RegisterTestingT(t)
			described := readRun(tc.workflow)
			Expect(described.Status).To(Equal(tc.status))
			if tc.reason == "" {
				Expect(described.Error).To(BeNil())
			} else {
				Expect(described.Error).NotTo(BeNil())
				Expect(described.Error.Reason).To(Equal(tc.reason))
			}
			Expect(described.FinishedAt != nil).To(Equal(tc.status.Final()))
			keepsResult := tc.status == StatusCompleted && !tc.workflow.OverallStatus.Terminal()
			Expect(described.ResultExpiresAt != nil).To(Equal(keepsResult), "only while the Job keeps the result")
		})
	}
}

func TestDescribeTellsUntilWhenTheResultCanBeFetched(t *testing.T) {
	RegisterTestingT(t)

	ended := time.Date(2026, 11, 3, 10, 20, 0, 0, time.UTC)
	workflow := withResult(atStep(engine.StatusWaiting, StepCleanup))
	for i := range workflow.Steps {
		if workflow.Steps[i].OperationID == StepAwaitResult {
			workflow.Steps[i].UpdatedAt = &ended
		}
	}
	described := readRun(workflow)
	Expect(*described.FinishedAt).To(Equal(ended))
	Expect(*described.ResultExpiresAt).To(Equal(ended.Add(5 * time.Minute)))
}

func TestStartedAtIsWhenTheArchiveArrived(t *testing.T) {
	RegisterTestingT(t)

	starting := atStep(engine.StatusWaiting, StepAwaitArchive)
	Expect(readRun(starting).StartedAt).To(BeNil())

	sent := time.Date(2026, 11, 3, 10, 29, 0, 0, time.UTC)
	running := atStep(engine.StatusWaiting, StepAwaitResult)
	for i := range running.Steps {
		if running.Steps[i].OperationID == StepAwaitArchive {
			running.Steps[i].UpdatedAt = &sent
		}
	}
	Expect(readRun(running).StartedAt).To(Equal(&sent))

	// A kind without an archive has no run.await-archive. Its command starts when run.await-pod ends.
	started := time.Date(2026, 11, 3, 10, 28, 0, 0, time.UTC)
	withoutArchive := atStep(engine.StatusWaiting, StepAwaitResult)
	steps := withoutArchive.Steps[:0]
	for _, step := range withoutArchive.Steps {
		if step.OperationID == StepAwaitPod {
			step.UpdatedAt = &started
		}
		if step.OperationID != StepAwaitArchive {
			steps = append(steps, step)
		}
	}
	withoutArchive.Steps = steps
	Expect(readRun(withoutArchive).StartedAt).To(Equal(&started))
}

func TestDescribeShowsACancelBeforeTheCommandAtOnce(t *testing.T) {
	RegisterTestingT(t)

	requested := time.Date(2026, 11, 3, 10, 31, 0, 0, time.UTC)
	for _, step := range []string{StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive} {
		workflow := atStep(engine.StatusWaiting, step)
		workflow.CancellationRequestedAt = &requested
		described := readRun(workflow)
		Expect(described.Status).To(Equal(StatusCanceled), step)
		Expect(*described.FinishedAt).To(Equal(requested))
	}
}

func TestDescribeLetsAResultWinOverACancel(t *testing.T) {
	RegisterTestingT(t)

	requested := time.Date(2026, 11, 3, 10, 31, 0, 0, time.UTC)
	running := atStep(engine.StatusWaiting, StepAwaitResult)
	running.CancellationRequestedAt = &requested
	Expect(readRun(running).Status).To(Equal(StatusRunning))

	cleaning := withResult(atStep(engine.StatusProcessing, StepCleanup))
	cleaning.CancellationRequestedAt = &requested
	Expect(readRun(cleaning).Status).To(Equal(StatusCompleted))

	completed := withResult(atStep(engine.StatusCompleted, ""))
	completed.CancellationRequestedAt = &requested
	Expect(readRun(completed).Status).To(Equal(StatusCompleted))

	canceled := workflowAt(engine.StatusCanceled, StepAwaitResult, engine.StatusFailed)
	canceled.CancellationRequestedAt = &requested
	Expect(readRun(canceled).Status).To(Equal(StatusCanceled))

	// The cancel deleted the Job, so the step failed before the engine canceled the workflow.
	failed := failedAt(StepAwaitResult)
	failed.CancellationRequestedAt = &requested
	Expect(readRun(failed).Status).To(Equal(StatusCanceled))
}

func TestDescribeKeepsTheErrorDetailShort(t *testing.T) {
	RegisterTestingT(t)

	long := strings.Repeat("æ", maxDetail)
	problem := `{"status":422,"reason":"start-failed","detail":"` + long + `"}`
	described := readRun(withError(failedAt(StepAwaitArchive), problem))
	Expect(len(described.Error.Detail)).To(BeNumerically("<=", maxDetail))
	Expect(strings.ToValidUTF8(described.Error.Detail, "?")).To(Equal(described.Error.Detail))
}
