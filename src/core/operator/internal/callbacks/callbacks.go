// Package callbacks serves the callback API, which operator-workflow-engine calls for each step of an operator
// workflow. The README's "Callback contract" describes it, and the tests of both sides read the examples in
// api/callbacks.
package callbacks

import (
	"context"
	"encoding/json"
	"errors"
	"maps"
	"net/http"
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
	// deadlineMargin leaves time to send the answer before the engine gives up on the attempt.
	deadlineMargin = 2 * time.Second
)

// CommandType is the type of the engine command that calls the operator. operator-workflow-engine registers its
// OperatorCommand under it.
const CommandType = "operator"

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

// CommandData is the data of each step's command at enqueue, OperatorCommandData in operator-workflow-engine.
type CommandData struct {
	CommandKey string `json:"commandKey"`
}

// Response is the answer to a callback, OperatorCallbackResponse in operator-workflow-engine.
type Response struct {
	State *string `json:"state"`
	Defer *Defer  `json:"defer"`
}

// Defer asks the engine to call the step again after Delay. The engine stores Reason for status reads, so it is
// written for a person.
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

// Handler runs one step. An *End fails the step and the workflow; any other error makes the engine retry the step under
// its retry strategy.
type Handler func(ctx context.Context, payload *Payload) (Response, error)

// End ends the workflow with Reason, a code of the workflow's domain, and Detail, a sentence for whoever started it.
// The router answers it with a problem that carries both, which the engine keeps in the step's error history for Ended
// to read back. Err is for the log only. Expected marks an end that is not a fault, such as a run that waited in the
// queue longer than its kind allows: the router logs it as information and leaves the span unmarked.
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

// Ended reads the End that a step answered from the message of an error that the engine recorded for the step, which
// is the router's answer, as api/callbacks/response-end.json shows. It returns nil for an error of the engine's own,
// such as a wait budget that ran out.
func Ended(message string) *End {
	var details problem.Details
	if json.Unmarshal([]byte(message), &details) == nil &&
		details.Status == http.StatusUnprocessableEntity && details.Reason != "" {
		return &End{Reason: details.Reason, Detail: details.Detail}
	}
	return nil
}

// Group is the handlers of one domain by command key, such as the run.* steps. The configuration turns groups on, so
// a Deployment with other groups can run with another identity.
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
		// A step with less time left than the margin stops at once, since its answer would come too late.
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, payload.ExecutionDeadline.Sub(r.clock.Now())-deadlineMargin)
		defer cancel()
	}
	logger := logging.FromContext(ctx).WithValues("commandKey", key, "subjectId", payload.Context.SubjectID,
		"workflowId", payload.WorkflowID)
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
			// The workflow fails, so the error is worth an exported log record.
			commontelemetry.SetError(span, "permanent", err)
			logger.Error(err, "Callback failed the workflow", "reason", end.Reason)
		}
		// The engine does not retry a 422, and keeps the answer as the step's error, for Ended.
		problem.WriteDetails(w, req, problem.Details{
			Status: http.StatusUnprocessableEntity, Reason: end.Reason, Detail: end.Detail,
		})
	default:
		// The engine retries a 503, and fails the step itself when its retry strategy runs out.
		commontelemetry.SetError(span, "retryable", err)
		logger.Info("Callback failed, the engine retries it", "error", err.Error())
		problem.Write(w, req, http.StatusServiceUnavailable, err.Error())
	}
}
