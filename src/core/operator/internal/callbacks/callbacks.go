// Package callbacks serves the callback API: operator-workflow-engine runs each step of an operator workflow by
// posting it to /workflow-engine-callbacks/{commandKey}. The README's "Callback contract" describes the payload and
// the answers, and api/callbacks has examples that the tests of both sides read.
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

// Payload is the body of a callback, OperatorCallbackPayload in operator-workflow-engine, with the fields the
// operator reads. The engine sends more, such as stepId and deferCount, and decoding leaves them out.
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

// Handler runs one step. An error that wraps ErrPermanent or ErrExpected fails the workflow; any other error makes the
// engine retry the step under its retry strategy.
type Handler func(ctx context.Context, payload *Payload) (Response, error)

// ErrPermanent marks an error that a retry cannot fix, as in fmt.Errorf("%w: %w", callbacks.ErrPermanent, err). The
// engine fails the step and the workflow.
var ErrPermanent = errors.New("the step cannot succeed")

// ErrExpected marks an end of the workflow that is not a fault, such as a run that waited in the queue longer than
// its kind allows. The engine fails the step and the workflow as for ErrPermanent, but the router logs it as
// information and leaves the span unmarked.
var ErrExpected = errors.New("the step ends the workflow")

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
	span.SetAttributes(telemetry.AttrCommandKey.String(key))
	if payload.ExecutionDeadline != nil {
		if remaining := payload.ExecutionDeadline.Sub(r.clock.Now()) - deadlineMargin; remaining > 0 {
			var cancel context.CancelFunc
			ctx, cancel = context.WithTimeout(ctx, remaining)
			defer cancel()
		}
	}
	logger := logging.FromContext(ctx).WithValues("commandKey", key, "subjectId", payload.Context.SubjectID,
		"workflowId", payload.WorkflowID)
	ctx = logging.IntoContext(ctx, logger)

	response, err := handler(ctx, &payload)
	if err != nil {
		// 422 is a 4xx the engine does not retry; 408, 418 and 429 would make it retry.
		if errors.Is(err, ErrExpected) {
			logger.Info("Callback ended the workflow", "error", err.Error())
			problem.Write(w, req, http.StatusUnprocessableEntity, err.Error())
			return
		}
		if errors.Is(err, ErrPermanent) {
			// The run fails, so the error is worth an exported log record.
			commontelemetry.SetError(span, "permanent", err)
			logger.Error(err, "Callback failed the step")
			problem.Write(w, req, http.StatusUnprocessableEntity, err.Error())
			return
		}
		// The engine retries, and fails the step itself when its retry strategy runs out.
		commontelemetry.SetError(span, "retryable", err)
		logger.Info("Callback failed, the engine retries it", "error", err.Error())
		problem.Write(w, req, http.StatusServiceUnavailable, err.Error())
		return
	}

	problem.WriteJSON(w, req, http.StatusOK, response)
}
