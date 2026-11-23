package telemetry

import (
	"context"
	"sync"
	"testing"

	"github.com/go-logr/zapr"
	"go.opentelemetry.io/otel/log"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"
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

func TestWithOTelLogsLinksRecordsToTheirTraceAndKeepsContextOffTheConsole(t *testing.T) {
	t.Parallel()

	console, logged := observer.New(zapcore.DebugLevel)
	recorder := &recordingProcessor{}
	provider := sdklog.NewLoggerProvider(sdklog.WithProcessor(recorder))
	logger := zapr.NewLogger(zap.New(withOTelLogs(console, provider)))

	spanContext := trace.NewSpanContext(trace.SpanContextConfig{
		TraceID:    trace.TraceID{1},
		SpanID:     trace.SpanID{2},
		TraceFlags: trace.FlagsSampled,
	})
	ctx := trace.ContextWithSpanContext(context.Background(), spanContext)
	logger.WithValues("ctx", ctx).Error(context.DeadlineExceeded, "sync failed", "controller", "secretsync")

	if len(recorder.records) != 1 {
		t.Fatalf("exported records = %d, want 1", len(recorder.records))
	}
	record := recorder.records[0]
	if record.Severity() != log.SeverityError {
		t.Errorf("severity = %v, want %v", record.Severity(), log.SeverityError)
	}
	if record.TraceID() != spanContext.TraceID() || record.SpanID() != spanContext.SpanID() {
		t.Errorf("trace context = %v/%v, want the span's", record.TraceID(), record.SpanID())
	}

	entries := logged.All()
	if len(entries) != 1 {
		t.Fatalf("console entries = %d, want 1", len(entries))
	}
	fields := entries[0].ContextMap()
	if _, ok := fields["ctx"]; ok {
		t.Error("the console entry has the context field")
	}
	if fields["controller"] != "secretsync" {
		t.Errorf("console fields = %v, want controller=secretsync", fields)
	}
}
