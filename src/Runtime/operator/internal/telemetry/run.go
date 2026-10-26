package telemetry

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/go-logr/logr"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// The operator's own attributes, under altinn.operator
// (https://github.com/Altinn/altinn-studio/issues/21073, direction item 14).
const (
	// AttrController is the controller a run belongs to, from a fixed set: maskinporten,
	// maskinporten_rotation_rollout, secretsync, appcodesync, grafanapolicysync,
	// azurekeyvaultsync, cnpgsync and inactivityscaler.
	AttrController = attribute.Key("altinn.operator.controller")
	// AttrObjectKind, AttrObjectNamespace and AttrObjectName identify the Kubernetes object a
	// run or step works on. They are not k8s.* keys: on the resource, k8s.namespace.name is the
	// operator's own namespace.
	AttrObjectKind      = attribute.Key("altinn.operator.object.kind")
	AttrObjectNamespace = attribute.Key("altinn.operator.object.namespace")
	AttrObjectName      = attribute.Key("altinn.operator.object.name")
)

// traceContextKey is the key a run's context is logged under. The OpenTelemetry log bridge takes
// a record's trace context from it, and WithOTelLogs keeps it off the console.
const traceContextKey = "otel.context"

type runKey struct{}

// errRunFailed wraps the status description of a failed run in its ERROR log.
var errRunFailed = errors.New("controller run failed")

// StartRun starts one run of controller: a reconcile, or one pass of a periodic sync. Its span is
// the run's entry span, the root of its trace, and carries the controller's name and attrs. The
// logger in the returned context links the records it exports to that trace.
//
// When the span ends, a failed run (one SetError marked) logs one ERROR with its error type and
// status description, linked to its trace, so every failure has a correlated log record even where
// only controller-runtime logs the returned error. A run started inside another, such as the
// reconciles secretsync's SyncAll makes, is a step of the outer run: an ordinary span, not logged
// on its own.
//
//nolint:spancheck,ireturn // The caller owns ending the span, as with Tracer().Start.
func StartRun(
	ctx context.Context,
	controller string,
	spanName string,
	attrs ...attribute.KeyValue,
) (context.Context, trace.Span) {
	if ctx.Value(runKey{}) != nil {
		return Tracer().Start(ctx, spanName, trace.WithAttributes(attrs...))
	}
	ctx, span := Tracer().Start(ctx, spanName, trace.WithAttributes(append(attrs, AttrController.String(controller))...))
	run := &runSpan{Span: span, controller: controller}
	ctx = context.WithValue(trace.ContextWithSpan(ctx, run), runKey{}, run)
	run.logger = log.FromContext(ctx).WithValues(traceContextKey, ctx)
	return log.IntoContext(ctx, run.logger), run
}

// runSpan is a run's entry span. It is the span in the run's context, so SetError on
// trace.SpanFromContext reaches it too, and it sees the outcome: error.type and the status.
type runSpan struct {
	trace.Span

	logger      logr.Logger
	controller  string
	errorType   string
	description string
	mu          sync.Mutex
}

func (s *runSpan) SetAttributes(kv ...attribute.KeyValue) {
	for _, attr := range kv {
		if attr.Key == semconv.ErrorTypeKey {
			s.mu.Lock()
			s.errorType = attr.Value.AsString()
			s.mu.Unlock()
		}
	}
	s.Span.SetAttributes(kv...)
}

func (s *runSpan) SetStatus(code codes.Code, description string) {
	if code == codes.Error {
		s.mu.Lock()
		s.description = description
		s.mu.Unlock()
	}
	s.Span.SetStatus(code, description)
}

func (s *runSpan) End(options ...trace.SpanEndOption) {
	s.Span.End(options...)

	s.mu.Lock()
	errorType, description := s.errorType, s.description
	s.mu.Unlock()

	if errorType != "" {
		s.logger.Error(fmt.Errorf("%w: %s", errRunFailed, description), "Controller run failed",
			string(AttrController), s.controller, string(semconv.ErrorTypeKey), errorType)
	}
}
