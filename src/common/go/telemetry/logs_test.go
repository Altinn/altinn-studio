package telemetry

import (
	"context"
	"sync"
	"testing"

	otellog "go.opentelemetry.io/otel/log"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/trace"
)

type recordingProcessor struct {
	records []sdklog.Record
	mu      sync.Mutex
}

func (p *recordingProcessor) OnEmit(_ context.Context, record *sdklog.Record) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.records = append(p.records, record.Clone())
	return nil
}

func (*recordingProcessor) Enabled(context.Context, sdklog.EnabledParameters) bool { return true }
func (*recordingProcessor) Shutdown(context.Context) error                         { return nil }
func (*recordingProcessor) ForceFlush(context.Context) error                       { return nil }

func TestMinSeverityProcessorExportsWarningsWithTraceContext(t *testing.T) {
	recorder := &recordingProcessor{}
	provider := sdklog.NewLoggerProvider(sdklog.WithProcessor(newMinSeverityProcessor(recorder)))
	logger := provider.Logger("test")

	spanContext := trace.NewSpanContext(trace.SpanContextConfig{
		TraceID:    trace.TraceID{1},
		SpanID:     trace.SpanID{2},
		TraceFlags: trace.FlagsSampled,
	})
	ctx := trace.ContextWithSpanContext(t.Context(), spanContext)
	for _, severity := range []otellog.Severity{
		otellog.SeverityUndefined,
		otellog.SeverityDebug,
		otellog.SeverityInfo,
		otellog.SeverityWarn,
		otellog.SeverityError,
	} {
		var record otellog.Record
		record.SetSeverity(severity)
		logger.Emit(ctx, record)
	}

	if len(recorder.records) != 2 {
		t.Fatalf("exported records = %d, want the warning and the error", len(recorder.records))
	}
	for i, want := range []otellog.Severity{otellog.SeverityWarn, otellog.SeverityError} {
		record := recorder.records[i]
		if record.Severity() != want {
			t.Errorf("record %d severity = %v, want %v", i, record.Severity(), want)
		}
		if record.TraceID() != spanContext.TraceID() || record.SpanID() != spanContext.SpanID() {
			t.Errorf("record %d trace context = %v/%v, want the span's", i, record.TraceID(), record.SpanID())
		}
	}
}
