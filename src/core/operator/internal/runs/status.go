package runs

import (
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
	// StatusCompleted means the command ran and has a result, whatever its exit code. The caller fetches it by
	// resultExpiresAt.
	StatusCompleted Status = "completed"
	// StatusFailed means the run could not complete, and its RunError says why. A new run can succeed.
	StatusFailed Status = "failed"
	// StatusCanceled means the caller canceled the run.
	StatusCanceled Status = "canceled"
	// StatusExpired means the run waited longer in the queue than its kind allows.
	StatusExpired Status = "expired"
)

// Final reports whether a run in this status is ended.
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

// maxDetail limits the error detail that a caller gets.
const maxDetail = 500

// record is a run as its workflow in the engine keeps it. Only describe reads the workflow's progress and states.
type record struct {
	Run

	// state is the newest step state, which has what every step before it learned.
	state runState
	// settled means that the engine ended the workflow and runs no more steps. So the Job is gone, or it will be gone
	// soon.
	settled bool
}

// keepsResult reports whether the run has completed and its Job still keeps the result for the caller to fetch.
func (r *record) keepsResult() bool {
	return r.Status == StatusCompleted && !r.settled
}

func readRun(workflow *engine.Workflow) *record {
	run := describe(callbacks.Read(workflow))
	run.ID, run.Kind = workflow.Labels[config.LabelRunID], workflow.Labels[config.LabelKind]
	run.Labels, run.CreatedAt = labelsOf(workflow.Labels), workflow.CreatedAt
	return run
}

// describe finds the status, error and times of the run. It uses the outcome if the run has one, and otherwise the
// current step of the workflow. After all steps are complete, the run is running until the engine settles the workflow.
func describe(progress callbacks.Progress) *record {
	r := &record{settled: progress.Settled, Run: Run{FinishedAt: progress.UpdatedAt}}
	if state, err := parseState(progress.State); err == nil {
		r.state = *state
	}
	r.StartedAt = r.state.StartedAt
	at := StatusRunning
	if progress.Step != "" {
		at = stepMeanings[progress.Step].status
	}
	switch {
	case r.state.Outcome != "":
		// A cancel or a failure in run.cleanup does not change the outcome.
		r.Status, r.FinishedAt = StatusCompleted, r.state.FinishedAt
		if r.state.Outcome == runner.StatusFailed {
			r.Status, r.Error = StatusFailed, &RunError{Reason: ReasonRunFailed, Detail: truncate(r.state.Error)}
		}
	case r.settled && progress.Step == "":
		r.Status, r.Error = StatusFailed, &RunError{
			Reason: ReasonInternal,
			Detail: "The run finished without a result.",
		}
	case r.settled && progress.CancelRequestedAt != nil:
		// A step that failed because the cancel deleted the Job fails the workflow before the engine cancels it.
		r.Status = StatusCanceled
	case r.settled:
		r.Error = failure(progress)
		r.Status = endStatus(r.Error.Reason)
	case progress.CancelRequestedAt != nil && at != StatusRunning:
		// Before the command runs, the cancel is final, because the operator deletes the Job with it. After the command
		// starts, the step can get the result before the engine marks a cancel. So the run shows running until the
		// engine settles it, and never shows canceled and then completed.
		r.Status, r.FinishedAt = StatusCanceled, progress.CancelRequestedAt
	default:
		r.Status, r.FinishedAt = at, nil
	}
	if r.keepsResult() && r.FinishedAt != nil {
		expiresAt := r.FinishedAt.Add(scaled(config.ResultTimeout, r.state.Spec.TimeScale))
		r.ResultExpiresAt = &expiresAt
	}
	return r
}

// endStatus is the status of a run that ended for reason without a result.
func endStatus(reason string) Status {
	if reason == ReasonQueueTimeout {
		return StatusExpired
	}
	return StatusFailed
}

// failure says why a settled workflow failed the run. A step that ended the run says why. The engine itself fails a
// step when its retries or wait budget run out. Its error then has nothing that the caller can use.
func failure(progress callbacks.Progress) *RunError {
	if end := progress.End; end != nil {
		return &RunError{Reason: end.Reason, Detail: truncate(end.Detail)}
	}
	switch reason := stepMeanings[progress.Step].reason; reason {
	case ReasonStartFailed:
		return &RunError{Reason: reason, Detail: "The run could not start."}
	case ReasonRunFailed:
		return &RunError{Reason: reason, Detail: "The run could not finish."}
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
