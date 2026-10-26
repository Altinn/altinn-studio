package telemetry

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/go-logr/logr"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/operator/internal/assert"
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

// RunDuration is the histogram of controller runs: one point per reconcile or pass of a periodic
// sync, with AttrController and, for a failed run, error.type.
const RunDuration = "altinn.operator.run.duration"

// Controller runs take from milliseconds (a reconcile with nothing to do) to about a minute (a
// CNPG sync waiting on Flux).
var runDurationBuckets = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60}

var runDuration = sync.OnceValue(func() metric.Float64Histogram {
	histogram, err := Meter().Float64Histogram(
		RunDuration,
		metric.WithUnit("s"),
		metric.WithDescription("Duration of a controller run: a reconcile, or one pass of a periodic sync."),
		metric.WithExplicitBucketBoundaries(runDurationBuckets...),
	)
	assert.That(err == nil, "create run duration histogram", "error", err)
	return histogram
})

type runKey struct{}

// errRunFailed wraps the status description of a failed run in its ERROR log.
var errRunFailed = errors.New("controller run failed")

// StartRun starts one run of controller: a reconcile, or one pass of a periodic sync. Its span is
// the run's entry span, the root of its trace, and carries the controller's name and attrs. The
// logger in the returned context links the records it exports to that trace.
//
// When the span ends, the run is recorded in RunDuration, with the error.type that SetError put on
// the span. A failed run also logs one ERROR with its error type and status description, linked to
// its trace, so every failure has a correlated log record even where only controller-runtime
// logs the returned error. A run started inside another, such as the reconciles secretsync's
// SyncAll makes, is a step of the outer run: an ordinary span, neither recorded nor logged on its
// own.
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
	run := &runSpan{Span: span, controller: controller, start: time.Now()}
	ctx = context.WithValue(trace.ContextWithSpan(ctx, run), runKey{}, run)
	run.logger = log.FromContext(ctx).WithValues(traceContextKey, ctx)
	return log.IntoContext(ctx, run.logger), run
}

// runSpan is a run's entry span. It is the span in the run's context, so SetError on
// trace.SpanFromContext reaches it too, and it sees the outcome: error.type and the status.
type runSpan struct {
	trace.Span

	start       time.Time
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

	attrs := []attribute.KeyValue{AttrController.String(s.controller)}
	if errorType != "" {
		attrs = append(attrs, semconv.ErrorTypeKey.String(errorType))
		s.logger.Error(fmt.Errorf("%w: %s", errRunFailed, description), "Controller run failed",
			string(AttrController), s.controller, string(semconv.ErrorTypeKey), errorType)
	}
	runDuration().Record(context.Background(), time.Since(s.start).Seconds(), metric.WithAttributes(attrs...))
}
