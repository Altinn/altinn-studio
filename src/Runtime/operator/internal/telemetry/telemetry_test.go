package telemetry

import (
	"context"
	"testing"
	"time"

	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func TestWithoutSpan(t *testing.T) {
	t.Parallel()

	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))
	tracer := provider.Tracer("test")

	type contextKey string

	baseCtx, cancel := context.WithCancel(context.Background())
	defer cancel()
	baseCtx = context.WithValue(baseCtx, contextKey("key"), "value")

	parentCtx, parentSpan := tracer.Start(baseCtx, "parent")
	detachedCtx := WithoutSpan(parentCtx)

	if got := detachedCtx.Value(contextKey("key")); got != "value" {
		t.Fatalf("detached context value mismatch, got %v", got)
	}

	cancel()
	select {
	case <-detachedCtx.Done():
	case <-time.After(100 * time.Millisecond):
		t.Fatal("detached context did not preserve cancellation")
	}

	_, childSpan := tracer.Start(detachedCtx, "child")
	childSpan.End()
	parentSpan.End()

	spans := recorder.Ended()
	if len(spans) != 2 {
		t.Fatalf("unexpected span count, got %d want 2", len(spans))
	}

	var parentRecorded, childRecorded sdktrace.ReadOnlySpan
	for _, span := range spans {
		switch span.Name() {
		case "parent":
			parentRecorded = span
		case "child":
			childRecorded = span
		}
	}

	if parentRecorded == nil || childRecorded == nil {
		t.Fatalf("missing recorded spans: parent=%v child=%v", parentRecorded != nil, childRecorded != nil)
	}
	if childRecorded.Parent().IsValid() {
		t.Fatalf("child span unexpectedly had a parent: %s", childRecorded.Parent().SpanID())
	}
	if childRecorded.SpanContext().TraceID() == parentRecorded.SpanContext().TraceID() {
		t.Fatal("child span unexpectedly reused parent trace")
	}
}
