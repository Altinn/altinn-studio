package runs

import (
	"slices"
	"time"
	"unicode/utf8"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/runner"
)

// Status is the status of a run, as the run API shows it.
type Status string

const (
	// StatusQueued means the run waits for sandbox capacity.
	StatusQueued Status = "queued"
	// StatusStarting means the operator creates the Job and waits for its pod.
	StatusStarting Status = "starting"
	// StatusAwaitingArchive means the Job is ready, and the caller uploads the archive within the kind's upload
	// timeout.
	StatusAwaitingArchive Status = "awaiting-archive"
	// StatusRunning means the command runs in the microVM.
	StatusRunning Status = "running"
	// StatusCompleted means the command ran and has a result, whatever its exit code. Whether it did what the caller
	// wanted is in the result, such as in its report. The caller fetches it by resultExpiresAt.
	StatusCompleted Status = "completed"
	// StatusFailed means the run could not complete, and its RunError says why. A new run may succeed.
	StatusFailed Status = "failed"
	// StatusCanceled means the caller canceled the run.
	StatusCanceled Status = "canceled"
	// StatusExpired means the run waited longer in the queue than its kind allows.
	StatusExpired Status = "expired"
)

// Final reports whether a run in this status has ended.
func (s Status) Final() bool {
	switch s {
	case StatusCompleted, StatusFailed, StatusCanceled, StatusExpired:
		return true
	case StatusQueued, StatusStarting, StatusAwaitingArchive, StatusRunning:
		return false
	}
	return false
}

// The reasons of a RunError.
const (
	// ReasonQueueTimeout means the run waited in the queue longer than its kind allows.
	ReasonQueueTimeout = "queue-timeout"
	// ReasonStartFailed means the Job or its pod did not start.
	ReasonStartFailed = "start-failed"
	// ReasonArchiveTimeout means no archive arrived within the kind's upload timeout.
	ReasonArchiveTimeout = "archive-timeout"
	// ReasonRunFailed means the command could not run, such as for an archive that does not extract.
	ReasonRunFailed = "run-failed"
	// ReasonInternal means the operator failed.
	ReasonInternal = "internal"
)

// RunError says why a run did not complete.
type RunError struct {
	Reason string `json:"reason"`
	Detail string `json:"detail"`
}

// Run is a run as the run API returns it.
type Run struct {
	CreatedAt       time.Time         `json:"createdAt"`
	QueuePosition   *int              `json:"queuePosition"`
	StartedAt       *time.Time        `json:"startedAt"`
	FinishedAt      *time.Time        `json:"finishedAt"`
	ResultExpiresAt *time.Time        `json:"resultExpiresAt"`
	Error           *RunError         `json:"error"`
	Labels          map[string]string `json:"labels"`
	ID              string            `json:"id"`
	Kind            string            `json:"kind"`
	Status          Status            `json:"status"`
}

// maxDetail bounds the error detail a caller gets.
const maxDetail = 500

// record is a run as its workflow in the engine keeps it. Only readRun reads the workflow's steps and states, so no
// other code knows which step keeps which fact.
type record struct {
	Run

	// state is the newest step state, which has what every step before it learned.
	state runState
	// settled means the engine has ended the workflow and runs no step anymore, so the Job is gone or about to be.
	settled bool
}

// keepsResult reports whether the run has completed and its Job still keeps the result for the caller to fetch.
func (r *record) keepsResult() bool {
	return r.Status == StatusCompleted && !r.settled
}

// readRun reads a run from its workflow.
func readRun(workflow *engine.Workflow) *record {
	steps := slices.Clone(workflow.Steps)
	slices.SortFunc(steps, func(a, b engine.Step) int { return a.ProcessingOrder - b.ProcessingOrder })
	rec := &record{settled: workflow.OverallStatus.Terminal(), Run: Run{
		ID:         workflow.Labels[workflowLabelRunID],
		Kind:       workflow.Labels[workflowLabelKind],
		Labels:     labelsOf(workflow.Labels),
		CreatedAt:  workflow.CreatedAt,
		FinishedAt: workflow.UpdatedAt,
	}}
	// Each step hands the state on with what it learned, so the newest state has all of it.
	if state, err := parseState(workflow.InitialState); err == nil {
		rec.state = *state
	}
	for _, step := range steps {
		if state, err := parseState(step.StateOut); err == nil {
			rec.state = *state
		}
	}
	// run.await-result runs the command, which the step before it started: run.await-archive once the archive arrived,
	// or run.await-pod for a kind that requires none.
	command := slices.IndexFunc(steps, func(step engine.Step) bool { return step.OperationID == StepAwaitResult })
	if command > 0 && steps[command-1].Status == engine.StatusCompleted {
		rec.StartedAt = steps[command-1].UpdatedAt
	}
	rec.describe(workflow, steps, command)
	if rec.keepsResult() && rec.FinishedAt != nil {
		expiresAt := rec.FinishedAt.Add(scaled(config.ResultTimeout, rec.state.Spec.TimeScale))
		rec.ResultExpiresAt = &expiresAt
	}
	return rec
}

// describe works out the run's status, its error and when it finished: from its outcome once it has one, and otherwise
// from the engine's status and the step the workflow is at.
func (r *record) describe(workflow *engine.Workflow, steps []engine.Step, command int) {
	current := slices.IndexFunc(steps, func(step engine.Step) bool { return step.Status != engine.StatusCompleted })
	switch {
	case r.state.Outcome != "" && command >= 0:
		// The outcome outlives the result in the Job, and a cancel or a failure in run.cleanup does not change it. The
		// run finished when run.await-result had it.
		if steps[command].UpdatedAt != nil {
			r.FinishedAt = steps[command].UpdatedAt
		}
		r.Status = StatusCompleted
		if r.state.Outcome == runner.StatusFailed {
			r.Status, r.Error = StatusFailed, &RunError{Reason: ReasonRunFailed, Detail: truncate(r.state.Error)}
		}
	case workflow.OverallStatus == engine.StatusCompleted:
		r.Status, r.Error = StatusFailed, &RunError{
			Reason: ReasonInternal,
			Detail: "The run finished without a result.",
		}
	case workflow.OverallStatus == engine.StatusCanceled, r.settled && workflow.CancellationRequestedAt != nil:
		// A step that failed because the cancel deleted the Job fails the workflow before the engine cancels it.
		r.Status = StatusCanceled
	case r.settled:
		r.Error = failure(steps, command)
		r.Status = endStatus(r.Error.Reason)
	case current < 0 || current >= command:
		// The engine marks a canceled workflow Canceled at its next fetch. From run.await-result on, the step may get the
		// result first, and the run completes, so the run follows the engine and does not show canceled and later
		// completed.
		r.Status, r.FinishedAt = StatusRunning, nil
	case workflow.CancellationRequestedAt != nil:
		// Before the command runs, the cancel is final, because the operator deletes the Job with it.
		r.Status, r.FinishedAt = StatusCanceled, workflow.CancellationRequestedAt
	case steps[current].OperationID == StepAdmit:
		r.Status, r.FinishedAt = StatusQueued, nil
	case steps[current].OperationID == StepAwaitArchive:
		r.Status, r.FinishedAt = StatusAwaitingArchive, nil
	default:
		r.Status, r.FinishedAt = StatusStarting, nil
	}
}

// endStatus is the status of a run that ended for reason without a result.
func endStatus(reason string) Status {
	if reason == ReasonQueueTimeout {
		return StatusExpired
	}
	return StatusFailed
}

// failure says why a settled workflow failed the run. A step that ended the run says why. The engine fails a step of
// its own accord when its retries or wait budget run out, and its error then says nothing that the caller can use.
func failure(steps []engine.Step, command int) *RunError {
	index := slices.IndexFunc(steps, func(step engine.Step) bool { return step.Status == engine.StatusFailed })
	if index < 0 {
		return &RunError{Reason: ReasonInternal, Detail: "A run this depends on failed."}
	}
	if end := callbacks.Ended(steps[index].LastError()); end != nil {
		return &RunError{Reason: end.Reason, Detail: truncate(end.Detail)}
	}
	switch {
	case index < command:
		return &RunError{Reason: ReasonStartFailed, Detail: "The run could not start."}
	case index == command:
		return &RunError{Reason: ReasonRunFailed, Detail: "The run could not finish."}
	}
	return &RunError{Reason: ReasonInternal, Detail: "The operator failed."}
}

func truncate(text string) string {
	if len(text) <= maxDetail {
		return text
	}
	cut := maxDetail
	for cut > 0 && !utf8.RuneStart(text[cut]) {
		cut--
	}
	return text[:cut]
}
