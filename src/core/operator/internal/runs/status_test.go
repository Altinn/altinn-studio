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

func withError(workflow *engine.Workflow, key, message string) *engine.Workflow {
	for i := range workflow.Steps {
		if workflow.Steps[i].OperationID == key {
			workflow.Steps[i].ErrorHistory = []engine.ErrorEntry{{Message: message}}
		}
	}
	return workflow
}

func TestDescribeMapsTheWorkflowToARunStatus(t *testing.T) {
	// The engine records the body of the operator's 422 in the step's error history.
	queueTimeout := `OperatorCommand failed with client error UnprocessableEntity: {"title":"Unprocessable Entity",` +
		`"detail":"the step cannot succeed: the run waited in the queue longer than its kind allows","status":422}`
	// The engine's own error when a wait budget runs out, which the operator does not let happen to run.admit.
	waitExpired := "Wait budget of 00:15:00 exhausted after 300 deferral(s): The run is number 3 in the queue."
	cases := []struct {
		workflow *engine.Workflow
		name     string
		status   Status
		reason   string
	}{
		{name: "new", workflow: workflowAt(engine.StatusEnqueued, StepAdmit, engine.StatusEnqueued),
			status: StatusQueued},
		{name: "queued", workflow: workflowAt(engine.StatusWaiting, StepAdmit, engine.StatusWaiting),
			status: StatusQueued},
		{
			name:     "creating the Job",
			workflow: workflowAt(engine.StatusProcessing, StepCreateJob, engine.StatusProcessing),
			status:   StatusStarting,
		},
		{name: "waiting for the pod", workflow: workflowAt(engine.StatusWaiting, StepAwaitPod, engine.StatusWaiting),
			status: StatusStarting},
		{
			name:     "waiting for the archive",
			workflow: workflowAt(engine.StatusWaiting, StepAwaitArchive, engine.StatusWaiting),
			status:   StatusAwaitingArchive,
		},
		{
			name:     "retrying the operator runner while waiting for the archive",
			workflow: workflowAt(engine.StatusRequeued, StepAwaitArchive, engine.StatusRequeued),
			status:   StatusAwaitingArchive,
		},
		{name: "running", workflow: workflowAt(engine.StatusWaiting, StepAwaitResult, engine.StatusWaiting),
			status: StatusRunning},
		{name: "cleaning up after a result",
			workflow: withOutcome(workflowAt(engine.StatusProcessing, StepCleanup, engine.StatusProcessing),
				"completed", ""),
			status: StatusCompleted},
		{name: "cleaning up after a failed command",
			workflow: withOutcome(workflowAt(engine.StatusProcessing, StepCleanup, engine.StatusProcessing),
				"failed", "boom"),
			status: StatusFailed, reason: ReasonRunFailed},
		{name: "completed", workflow: withOutcome(workflowAt(engine.StatusCompleted, "", ""), "completed", ""),
			status: StatusCompleted},
		{name: "completed without an outcome", workflow: workflowAt(engine.StatusCompleted, "", ""),
			status: StatusFailed, reason: ReasonInternal},
		{
			name: "queue timeout",
			workflow: withError(
				workflowAt(engine.StatusFailed, StepAdmit, engine.StatusFailed),
				StepAdmit,
				queueTimeout,
			),
			status: StatusExpired,
			reason: ReasonQueueTimeout,
		},
		{
			name: "wait budget of admit run out in the engine",
			workflow: withError(
				workflowAt(engine.StatusFailed, StepAdmit, engine.StatusFailed),
				StepAdmit,
				waitExpired,
			),
			status: StatusFailed,
			reason: ReasonStartFailed,
		},
		{name: "admit failed otherwise",
			workflow: withError(workflowAt(engine.StatusFailed, StepAdmit, engine.StatusFailed), StepAdmit, "no kind"),
			status:   StatusFailed, reason: ReasonStartFailed},
		{name: "Job refused", workflow: workflowAt(engine.StatusFailed, StepCreateJob, engine.StatusFailed),
			status: StatusFailed, reason: ReasonStartFailed},
		{name: "pod failed", workflow: workflowAt(engine.StatusFailed, StepAwaitPod, engine.StatusFailed),
			status: StatusFailed, reason: ReasonStartFailed},
		{
			name:     "operator runner refused",
			workflow: workflowAt(engine.StatusFailed, StepAwaitArchive, engine.StatusFailed),
			status:   StatusFailed,
			reason:   ReasonStartFailed,
		},
		{
			name: "no archive arrived",
			workflow: withError(
				workflowAt(engine.StatusFailed, StepAwaitArchive, engine.StatusFailed),
				StepAwaitArchive,
				"the step cannot succeed: "+errArchiveTimeout.Error(),
			),
			status: StatusFailed,
			reason: ReasonArchiveTimeout,
		},
		{
			name:     "pod gone while running",
			workflow: workflowAt(engine.StatusFailed, StepAwaitResult, engine.StatusFailed),
			status:   StatusFailed,
			reason:   ReasonRunFailed,
		},
		{name: "cleanup failed after a result",
			workflow: withOutcome(workflowAt(engine.StatusFailed, StepCleanup, engine.StatusFailed), "completed", ""),
			status:   StatusCompleted},
		{name: "cleanup failed without a result",
			workflow: workflowAt(engine.StatusFailed, StepCleanup, engine.StatusFailed),
			status:   StatusFailed, reason: ReasonInternal},
		{name: "abandoned", workflow: workflowAt(engine.StatusAbandoned, StepAwaitArchive, engine.StatusFailed),
			status: StatusFailed, reason: ReasonStartFailed},
		{
			name:     "dependency failed",
			workflow: workflowAt(engine.StatusDependencyFailed, StepAdmit, engine.StatusEnqueued),
			status:   StatusFailed,
			reason:   ReasonInternal,
		},
		{name: "canceled", workflow: workflowAt(engine.StatusCanceled, StepAwaitPod, engine.StatusWaiting),
			status: StatusCanceled},
		{
			name: "canceled after the result",
			workflow: withOutcome(
				workflowAt(engine.StatusCanceled, StepCleanup, engine.StatusEnqueued),
				"completed",
				"",
			),
			status: StatusCompleted,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			RegisterTestingT(t)
			described := describe(tc.workflow)
			Expect(described.status).To(Equal(tc.status))
			if tc.reason == "" {
				Expect(described.err).To(BeNil())
			} else {
				Expect(described.err).NotTo(BeNil())
				Expect(described.err.Reason).To(Equal(tc.reason))
			}
			Expect(described.finishedAt != nil).To(Equal(tc.status.Final()))
			Expect(described.resultExpiresAt != nil).To(Equal(tc.status == StatusCompleted))
		})
	}
}

func TestDescribeTellsUntilWhenTheResultCanBeFetched(t *testing.T) {
	RegisterTestingT(t)

	ended := time.Date(2026, 11, 3, 10, 20, 0, 0, time.UTC)
	workflow := withOutcome(workflowAt(engine.StatusWaiting, StepCleanup, engine.StatusWaiting), "completed", "")
	for i := range workflow.Steps {
		if workflow.Steps[i].OperationID == StepAwaitResult {
			workflow.Steps[i].UpdatedAt = &ended
		}
	}
	described := describe(workflow)
	Expect(*described.finishedAt).To(Equal(ended))
	Expect(*described.resultExpiresAt).To(Equal(ended.Add(5 * time.Minute)))
}

func TestStartedAtIsWhenTheArchiveArrived(t *testing.T) {
	RegisterTestingT(t)

	starting := workflowAt(engine.StatusWaiting, StepAwaitArchive, engine.StatusWaiting)
	Expect(startedAt(starting)).To(BeNil())

	sent := time.Date(2026, 11, 3, 10, 29, 0, 0, time.UTC)
	running := workflowAt(engine.StatusWaiting, StepAwaitResult, engine.StatusWaiting)
	for i := range running.Steps {
		if running.Steps[i].OperationID == StepAwaitArchive {
			running.Steps[i].UpdatedAt = &sent
		}
	}
	Expect(startedAt(running)).To(Equal(&sent))

	// A kind without an archive has no run.await-archive. Its command starts when run.await-pod ends.
	started := time.Date(2026, 11, 3, 10, 28, 0, 0, time.UTC)
	withoutArchive := workflowAt(engine.StatusWaiting, StepAwaitResult, engine.StatusWaiting)
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
	Expect(startedAt(withoutArchive)).To(Equal(&started))
}

// Before the command runs, the cancel deletes the Job, so the run can only end canceled, and shows it at once.
func TestDescribeShowsACancelBeforeTheCommandAtOnce(t *testing.T) {
	RegisterTestingT(t)

	requested := time.Date(2026, 11, 3, 10, 31, 0, 0, time.UTC)
	for _, step := range []string{StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive} {
		workflow := workflowAt(engine.StatusWaiting, step, engine.StatusWaiting)
		workflow.CancellationRequestedAt = &requested
		described := describe(workflow)
		Expect(described.status).To(Equal(StatusCanceled), step)
		Expect(*described.finishedAt).To(Equal(requested))
	}
}

// A cancel that races the result may lose: the step that has the result completes, and so does the run. Until the
// engine settles it, the run shows what it does, so it never shows canceled and then completed.
func TestDescribeLetsAResultWinOverACancel(t *testing.T) {
	RegisterTestingT(t)

	requested := time.Date(2026, 11, 3, 10, 31, 0, 0, time.UTC)
	running := workflowAt(engine.StatusWaiting, StepAwaitResult, engine.StatusWaiting)
	running.CancellationRequestedAt = &requested
	Expect(describe(running).status).To(Equal(StatusRunning))

	cleaning := withOutcome(workflowAt(engine.StatusProcessing, StepCleanup, engine.StatusProcessing), "completed", "")
	cleaning.CancellationRequestedAt = &requested
	Expect(describe(cleaning).status).To(Equal(StatusCompleted))

	completed := withOutcome(workflowAt(engine.StatusCompleted, "", ""), "completed", "")
	completed.CancellationRequestedAt = &requested
	Expect(describe(completed).status).To(Equal(StatusCompleted))

	canceled := workflowAt(engine.StatusCanceled, StepAwaitResult, engine.StatusFailed)
	canceled.CancellationRequestedAt = &requested
	Expect(describe(canceled).status).To(Equal(StatusCanceled))

	// The cancel deleted the Job, so the step failed before the engine canceled the workflow.
	failed := workflowAt(engine.StatusFailed, StepAwaitResult, engine.StatusFailed)
	failed.CancellationRequestedAt = &requested
	Expect(describe(failed).status).To(Equal(StatusCanceled))
}

func TestDescribeKeepsTheErrorDetailShort(t *testing.T) {
	RegisterTestingT(t)

	long := strings.Repeat("æ", maxDetail)
	failed := workflowAt(engine.StatusFailed, StepAwaitArchive, engine.StatusFailed)
	described := describe(withError(failed, StepAwaitArchive, long))
	Expect(len(described.err.Detail)).To(BeNumerically("<=", maxDetail))
	Expect(strings.ToValidUTF8(described.err.Detail, "?")).To(Equal(described.err.Detail))
}
