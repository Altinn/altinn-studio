package engine

import (
	"encoding/json"
	"time"
)

// The models mirror the ones in src/Runtime/workflow-engine/src/WorkflowEngine.Models, with the JSON names that the
// C# models declare. They hold only the fields the operator uses.

// EnqueueRequest is WorkflowEnqueueRequest. The engine hashes all fields except Context to find a reused idempotency
// key. A value that must make a replay a conflict must go in Labels or the steps.
type EnqueueRequest struct {
	Labels    map[string]string `json:"labels,omitempty"`
	Context   json.RawMessage   `json:"context,omitempty"`
	Workflows []WorkflowRequest `json:"workflows"`
}

type WorkflowRequest struct {
	// State is the initial state of the workflow. The first step receives it as its state. The engine does not read it.
	State       *string       `json:"state,omitempty"`
	OperationID string        `json:"operationId"`
	Steps       []StepRequest `json:"steps"`
}

type StepRequest struct {
	RetryStrategy *RetryStrategy    `json:"retryStrategy,omitempty"`
	OperationID   string            `json:"operationId"`
	Command       CommandDefinition `json:"command"`
}

type CommandDefinition struct {
	MaxExecutionTime *Duration       `json:"maxExecutionTime,omitempty"`
	WaitBudget       *Duration       `json:"waitBudget,omitempty"`
	Type             string          `json:"type"`
	Data             json.RawMessage `json:"data,omitempty"`
}

// BackoffExponential is the BackoffType that doubles the delay for each retry.
const BackoffExponential = "Exponential"

type RetryStrategy struct {
	MaxDelay     *Duration `json:"maxDelay,omitempty"`
	MaxDuration  *Duration `json:"maxDuration,omitempty"`
	BackoffType  string    `json:"backoffType"`
	BaseInterval Duration  `json:"baseInterval"`
}

// enqueueResponse is WorkflowEnqueueResponse.Accepted.
type enqueueResponse struct {
	Workflows []struct {
		DatabaseID string `json:"databaseId"`
	} `json:"workflows"`
}

// Status is PersistentItemStatus, as the engine writes it.
type Status string

const (
	StatusEnqueued         Status = "Enqueued"
	StatusProcessing       Status = "Processing"
	StatusRequeued         Status = "Requeued"
	StatusCompleted        Status = "Completed"
	StatusFailed           Status = "Failed"
	StatusCanceled         Status = "Canceled"
	StatusDependencyFailed Status = "DependencyFailed"
	StatusAbandoned        Status = "Abandoned"
	StatusWaiting          Status = "Waiting"
	StatusHeld             Status = "Held"
)

// Terminal reports whether the engine will run nothing more for a workflow in this status, unless someone resumes it.
func (s Status) Terminal() bool {
	switch s {
	case StatusCompleted, StatusFailed, StatusCanceled, StatusDependencyFailed, StatusAbandoned:
		return true
	case StatusEnqueued, StatusProcessing, StatusRequeued, StatusWaiting, StatusHeld:
		return false
	}
	return false
}

// Workflow is WorkflowStatusResponse.
type Workflow struct {
	UpdatedAt               *time.Time `json:"updatedAt"`
	CancellationRequestedAt *time.Time `json:"cancellationRequestedAt"`
	// InitialState is the state of the workflow at enqueue.
	InitialState  *string           `json:"initialState"`
	CreatedAt     time.Time         `json:"createdAt"`
	Labels        map[string]string `json:"labels"`
	DatabaseID    string            `json:"databaseId"`
	Namespace     string            `json:"namespace"`
	OverallStatus Status            `json:"overallStatus"`
	Steps         []Step            `json:"steps"`
}

// Step is StepStatusResponse.
type Step struct {
	UpdatedAt       *time.Time   `json:"updatedAt"`
	StateOut        *string      `json:"stateOut"`
	OperationID     string       `json:"operationId"`
	Status          Status       `json:"status"`
	ErrorHistory    []ErrorEntry `json:"errorHistory"`
	ProcessingOrder int          `json:"processingOrder"`
}

// ErrorEntry is a positional record that ASP.NET Core writes in camel case.
type ErrorEntry struct {
	Message string `json:"message"`
}

type listResponse struct {
	Data []Workflow `json:"data"`
}
