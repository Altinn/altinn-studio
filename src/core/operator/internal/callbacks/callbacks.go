// Package callbacks serves the callback API that operator-workflow-engine calls for each step of an operator workflow.
// It also reads the progress of the workflow from the engine. The section "Callback contract" in the README describes
// the API. The tests of both sides read the examples in testdata/callbacks.
package callbacks

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"strings"
	"time"

	"go.opentelemetry.io/otel/trace"

	"altinn.studio/core-operator/internal/logging"

	commontelemetry "altinn.studio/common/telemetry"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/problem"
	"altinn.studio/core-operator/internal/telemetry"
)

// PathPrefix is where the engine posts callbacks, followed by the commandKey.
const PathPrefix = "/workflow-engine-callbacks/"

const (
	maxPayloadBytes = 1 << 20
	// deadlineMargin reserves time to send the answer before the engine stops the attempt.
	deadlineMargin = 2 * time.Second
)

// stepErrorType gives the error.type of a failed step: its command key in snake_case, such as run_await_archive.
var stepErrorType = strings.NewReplacer(".", "_", "-", "_")

// commandType is the type of the engine command that calls the operator. operator-workflow-engine registers its
// OperatorCommand under it.
const commandType = "operator"

// Payload is the body of a callback, OperatorCallbackPayload in operator-workflow-engine, with the fields that the
// operator reads.
type Payload struct {
	ExecutionReferenceTime time.Time  `json:"executionReferenceTime"`
	State                  *string    `json:"state"`
	ExecutionDeadline      *time.Time `json:"executionDeadline"`
	Context                Context    `json:"context"`
	CommandKey             string     `json:"commandKey"`
	WorkflowID             string     `json:"workflowId"`
	IsFinalWaitCheck       bool       `json:"isFinalWaitCheck"`
}

// Context is the workflow context that the operator set at enqueue, OperatorWorkflowContext in
// operator-workflow-engine. SubjectID names what the workflow works on, such as the run id.
type Context struct {
	Domain    string `json:"domain"`
	Caller    string `json:"caller"`
	SubjectID string `json:"subjectId"`
}

// commandData is the data of each step's command at enqueue, OperatorCommandData in operator-workflow-engine.
type commandData struct {
	CommandKey string `json:"commandKey"`
}

// Response is the answer to a callback, OperatorCallbackResponse in operator-workflow-engine.
type Response struct {
	State *string `json:"state"`
	Defer *Defer  `json:"defer"`
}

// Defer asks the engine to call the step again after Delay. The engine stores Reason for status reads, so write Reason
// for a person.
type Defer struct {
	Reason string          `json:"reason"`
	Delay  engine.Duration `json:"delay"`
}

// Done answers that the step is done. state reaches the next step.
func Done(state *string) Response {
	return Response{State: state}
}

// Wait answers that the step waits. state reaches the next attempt of the same step.
func Wait(state *string, delay time.Duration, reason string) Response {
	return Response{State: state, Defer: &Defer{Delay: engine.Duration(delay), Reason: reason}}
}

// Handler runs one step. An *End fails the step and the workflow. After any other error, the engine retries the step
// under its retry strategy.
type Handler func(ctx context.Context, payload *Payload) (Response, error)

// End ends the workflow with Reason and Detail. Reason is a code of the workflow domain. Detail is a sentence for the
// person who started the workflow. The router answers with a problem that has both. The engine keeps this problem in
// the error history of the step, and Ended reads it back. Err is only for the log. Expected marks an end that is not a
// fault, for example a run that waited in the queue longer than its kind allows. The router logs an expected end as
// information and does not mark the span.
type End struct { //nolint:errname // An End that is Expected is not a fault, so End is no XxxError.
	Err      error
	Reason   string
	Detail   string
	Expected bool
}

func (e *End) Error() string {
	if e.Err == nil {
		return e.Detail
	}
	return e.Detail + " " + e.Err.Error()
}

// Ended reads the End of a step from an error message that the engine recorded for the step. That message is the answer
// of the router, as testdata/callbacks/response-end.json shows. Ended returns nil for an error from the engine itself,
// for example a wait budget that ran out.
func Ended(message string) *End {
	var details problem.Details
	if json.Unmarshal([]byte(message), &details) == nil &&
		details.Status == http.StatusUnprocessableEntity && details.Reason != "" {
		return &End{Reason: details.Reason, Detail: details.Detail}
	}
	return nil
}

// Workflow is an operator workflow to enqueue. The engine calls its steps in order and gives State to the first step.
// It retries each step under Retry. Name is the name of the workflow in the engine, and the labels find it.
type Workflow struct {
	Labels  map[string]string
	State   *string
	Context Context
	Name    string
	Steps   []Step
	Retry   Retry
}

// Step is a step of an operator workflow. WaitBudget is its total time in deferrals, and zero means it does not wait.
type Step struct {
	Key              string
	MaxExecutionTime time.Duration
	WaitBudget       time.Duration
}

// Retry is how the engine retries a step after an error. The first retry comes after BaseInterval. Each next delay is
// twice as long, up to MaxDelay. The engine stops after MaxDuration.
type Retry struct {
	BaseInterval, MaxDelay, MaxDuration time.Duration
}

// Request builds the engine request that enqueues the workflow. The engine hashes all of the request except the
// context, to tell a replay from a reused idempotency key. So the same workflow must build the same request.
func (w *Workflow) Request() (engine.EnqueueRequest, error) {
	workflowContext, err := json.Marshal(w.Context)
	if err != nil {
		return engine.EnqueueRequest{}, fmt.Errorf("encode workflow context: %w", err)
	}
	retry := &engine.RetryStrategy{
		BackoffType:  engine.BackoffExponential,
		BaseInterval: engine.Duration(w.Retry.BaseInterval),
		MaxDelay:     engine.DurationOf(w.Retry.MaxDelay),
		MaxDuration:  engine.DurationOf(w.Retry.MaxDuration),
	}
	steps := make([]engine.StepRequest, 0, len(w.Steps))
	for _, step := range w.Steps {
		data, err := json.Marshal(commandData{CommandKey: step.Key})
		if err != nil {
			return engine.EnqueueRequest{}, fmt.Errorf("encode command data: %w", err)
		}
		command := engine.CommandDefinition{
			Type: commandType, MaxExecutionTime: engine.DurationOf(step.MaxExecutionTime), Data: data,
		}
		if step.WaitBudget > 0 {
			command.WaitBudget = engine.DurationOf(step.WaitBudget)
		}
		steps = append(steps, engine.StepRequest{OperationID: step.Key, Command: command, RetryStrategy: retry})
	}
	return engine.EnqueueRequest{Labels: w.Labels, Context: workflowContext, Workflows: []engine.WorkflowRequest{
		{OperationID: w.Name, State: w.State, Steps: steps},
	}}, nil
}

// Progress is the position of the engine in an operator workflow, by step. A domain reads Progress to find the status
// of its workflow. The domain does not need the engine statuses, step order or error history.
type Progress struct {
	// UpdatedAt is the time of the last change to the workflow in the engine. After Settled, it is the time when the
	// workflow settled.
	UpdatedAt *time.Time
	// CancelRequestedAt is when someone canceled the workflow. The engine can run a step before the workflow settles.
	CancelRequestedAt *time.Time
	// State is the output of the newest step, or the initial state of the workflow if no step gave an output.
	State *string
	// End is the answer of Step that ended the workflow. It is nil if Step did not fail. It is also nil if the engine
	// failed Step itself, for example when its retries or its wait budget ran out.
	End *End
	// Step is the key of the first step that is not complete, or "" after all steps are complete.
	Step string
	// Settled means the engine runs no step of the workflow anymore.
	Settled bool
}

func Read(workflow *engine.Workflow) Progress {
	steps := slices.Clone(workflow.Steps)
	slices.SortFunc(steps, func(a, b engine.Step) int { return a.ProcessingOrder - b.ProcessingOrder })
	progress := Progress{UpdatedAt: workflow.UpdatedAt, CancelRequestedAt: workflow.CancellationRequestedAt,
		State: workflow.InitialState, Settled: workflow.OverallStatus.Terminal()}
	for _, step := range steps {
		if step.StateOut != nil && *step.StateOut != "" {
			progress.State = step.StateOut
		}
		if progress.Step == "" && step.Status != engine.StatusCompleted {
			progress.Step = step.OperationID
			if step.Status == engine.StatusFailed && len(step.ErrorHistory) > 0 {
				progress.End = Ended(step.ErrorHistory[len(step.ErrorHistory)-1].Message)
			}
		}
	}
	return progress
}

// Group holds the handlers of one domain by command key, for example the run.* steps. The configuration enables groups,
// so that a Deployment with other groups can run with another identity.
type Group map[string]Handler

// Router dispatches callbacks to the handlers of its groups.
type Router struct {
	handlers map[string]Handler
	clock    clock.Clock
}

// NewRouter serves the handlers of the groups that this process runs.
func NewRouter(clk clock.Clock, groups ...Group) *Router {
	router := &Router{clock: clk, handlers: make(map[string]Handler)}
	for _, group := range groups {
		maps.Copy(router.handlers, group)
	}
	return router
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problem.Write(w, req, http.StatusMethodNotAllowed, "")
		return
	}
	key := strings.TrimPrefix(req.URL.Path, PathPrefix)
	handler, ok := r.handlers[key]
	if !ok {
		problem.Write(w, req, http.StatusNotFound, "This process has no handler for the command key "+key+".")
		return
	}

	var payload Payload
	decoder := json.NewDecoder(http.MaxBytesReader(w, req.Body, maxPayloadBytes))
	if err := decoder.Decode(&payload); err != nil {
		problem.Write(w, req, http.StatusBadRequest, "The payload is not a callback payload: "+err.Error())
		return
	}
	if payload.CommandKey != key {
		problem.Write(w, req, http.StatusBadRequest, "The payload is for "+payload.CommandKey+", not "+key+".")
		return
	}

	ctx := req.Context()
	span := trace.SpanFromContext(ctx)
	span.SetAttributes(
		telemetry.AttrDomain.String(payload.Context.Domain),
		telemetry.AttrCommandKey.String(key),
		telemetry.AttrSubjectID.String(payload.Context.SubjectID),
	)
	if payload.ExecutionDeadline != nil {
		// A step with less time than the margin stops at once, because its answer comes too late.
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, payload.ExecutionDeadline.Sub(r.clock.Now())-deadlineMargin)
		defer cancel()
	}
	logger := logging.FromContext(ctx).WithValues(string(telemetry.AttrCommandKey), key,
		string(
			telemetry.AttrSubjectID,
		), payload.Context.SubjectID, string(telemetry.AttrWorkflowID), payload.WorkflowID)
	ctx = logging.IntoContext(ctx, logger)

	response, err := handler(ctx, &payload)
	var end *End
	switch {
	case err == nil:
		problem.WriteJSON(w, req, http.StatusOK, response)
	case errors.As(err, &end):
		if end.Expected {
			logger.Info("Callback ended the workflow", "reason", end.Reason, "error", err.Error())
		} else {
			commontelemetry.SetError(span, stepErrorType.Replace(key), err)
			logger.Error(err, "Callback failed the workflow", "reason", end.Reason)
		}
		// The engine does not retry a 422. It keeps the answer as the error of the step, for Ended.
		problem.WriteDetails(w, req, problem.Details{
			Status: http.StatusUnprocessableEntity, Reason: end.Reason, Detail: end.Detail,
		})
	default:
		// The engine retries a 503, and fails the step itself when its retry strategy runs out.
		commontelemetry.SetError(span, stepErrorType.Replace(key), err)
		logger.Error(err, "Callback failed, the engine retries it")
		problem.Write(w, req, http.StatusServiceUnavailable, err.Error())
	}
}
