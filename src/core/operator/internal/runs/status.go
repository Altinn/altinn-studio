package runs

import (
	"slices"
	"strings"
	"time"
	"unicode/utf8"

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

type description struct {
	finishedAt *time.Time
	// resultExpiresAt is set for a completed run.
	resultExpiresAt *time.Time
	err             *RunError
	status          Status
}

// describe works out a run's status from its workflow: the engine's status and the step the workflow is at.
func describe(workflow *engine.Workflow) description {
	steps := slices.Clone(workflow.Steps)
	slices.SortFunc(steps, func(a, b engine.Step) int { return a.ProcessingOrder - b.ProcessingOrder })

	finishedAt := workflow.UpdatedAt
	outcome := resultOutcome(steps, finishedAt)

	switch workflow.OverallStatus {
	case engine.StatusCompleted:
		if outcome != nil {
			return *outcome
		}
		return description{status: StatusFailed, finishedAt: finishedAt,
			err: &RunError{Reason: ReasonInternal, Detail: "The run finished without a result."}}

	case engine.StatusCanceled, engine.StatusFailed, engine.StatusDependencyFailed, engine.StatusAbandoned:
		// A cancel or a failure during cleanup does not take the result from the caller. The garbage collector
		// deletes the Job.
		if outcome != nil {
			return *outcome
		}
		// A step that failed because the cancel deleted the Job fails the workflow before the engine cancels it.
		if workflow.OverallStatus == engine.StatusCanceled || workflow.CancellationRequestedAt != nil {
			return description{status: StatusCanceled, finishedAt: finishedAt}
		}
		return describeFailure(steps, finishedAt)

	case engine.StatusEnqueued, engine.StatusProcessing, engine.StatusRequeued, engine.StatusWaiting,
		engine.StatusHeld:
	}

	// The engine marks a canceled workflow Canceled at its next fetch. Before the command runs, the cancel is final,
	// because the operator deletes the Job with it, so the caller sees it at once. From run.await-result on, the step
	// may get the result first, and the run completes; the status follows the engine then, so it does not show
	// canceled and later completed.
	current := currentStep(steps)
	switch current {
	case StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive:
		if workflow.CancellationRequestedAt != nil {
			return description{status: StatusCanceled, finishedAt: workflow.CancellationRequestedAt}
		}
		switch current {
		case StepAdmit:
			return description{status: StatusQueued}
		case StepAwaitArchive:
			return description{status: StatusAwaitingArchive}
		}
		return description{status: StatusStarting}
	case StepCleanup:
		if outcome != nil {
			return *outcome
		}
	}
	return description{status: StatusRunning}
}

// startedAt is when the command started: when run.await-archive saw the archive at the operator runner, or, for a
// kind that requires no archive, when run.await-pod started the command.
func startedAt(workflow *engine.Workflow) *time.Time {
	index := slices.IndexFunc(
		workflow.Steps,
		func(step engine.Step) bool { return step.OperationID == StepAwaitArchive },
	)
	if index < 0 {
		index = slices.IndexFunc(
			workflow.Steps,
			func(step engine.Step) bool { return step.OperationID == StepAwaitPod },
		)
	}
	if index < 0 || workflow.Steps[index].Status != engine.StatusCompleted {
		return nil
	}
	return workflow.Steps[index].UpdatedAt
}

// resultOutcome describes the outcome that run.await-result left in its state, which outlives the result in the Job.
// The run finished when the step did, or else at workflowFinishedAt.
func resultOutcome(steps []engine.Step, workflowFinishedAt *time.Time) *description {
	index := slices.IndexFunc(steps, func(step engine.Step) bool { return step.OperationID == StepAwaitResult })
	if index < 0 || steps[index].Status != engine.StatusCompleted {
		return nil
	}
	state, err := parseState(steps[index].StateOut)
	if err != nil {
		return nil
	}
	outcome := &description{finishedAt: firstSet(steps[index].UpdatedAt, workflowFinishedAt)}
	switch state.Outcome {
	case runner.StatusCompleted:
		outcome.status = StatusCompleted
		if outcome.finishedAt != nil {
			expiresAt := outcome.finishedAt.Add(config.ResultTimeout)
			outcome.resultExpiresAt = &expiresAt
		}
	case runner.StatusFailed:
		outcome.status = StatusFailed
		outcome.err = &RunError{Reason: ReasonRunFailed, Detail: truncate(state.Error)}
	default:
		return nil
	}
	return outcome
}

func describeFailure(steps []engine.Step, finishedAt *time.Time) description {
	index := slices.IndexFunc(steps, func(step engine.Step) bool { return step.Status == engine.StatusFailed })
	if index < 0 {
		return description{status: StatusFailed, finishedAt: finishedAt,
			err: &RunError{Reason: ReasonInternal, Detail: "A run this depends on failed."}}
	}
	step := steps[index]
	message := ""
	if last := step.LastError(); last != nil {
		message = last.Message
	}

	status, reason, detail := StatusFailed, ReasonInternal, truncate(message)
	switch step.OperationID {
	case StepAdmit:
		reason = ReasonStartFailed
		// The engine records the operator's error of a step that fails in the step's error history.
		if strings.Contains(message, errQueueTimeout.Error()) {
			status, reason = StatusExpired, ReasonQueueTimeout
			detail = "The run waited in the queue longer than its kind allows."
		}
	case StepAwaitArchive:
		reason = ReasonStartFailed
		if strings.Contains(message, errArchiveTimeout.Error()) {
			reason = ReasonArchiveTimeout
			detail = "No archive arrived within the upload timeout of the kind."
		}
	case StepCreateJob, StepAwaitPod:
		reason = ReasonStartFailed
	case StepAwaitResult:
		reason = ReasonRunFailed
	}
	return description{status: status, finishedAt: finishedAt, err: &RunError{Reason: reason, Detail: detail}}
}

// currentStep returns the first step that has not completed.
func currentStep(steps []engine.Step) string {
	for _, step := range steps {
		if step.Status != engine.StatusCompleted {
			return step.OperationID
		}
	}
	return ""
}

func firstSet(values ...*time.Time) *time.Time {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
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
