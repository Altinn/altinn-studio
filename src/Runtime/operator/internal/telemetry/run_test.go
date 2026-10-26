package telemetry

import (
	"context"
	"errors"
	"testing"

	"github.com/go-logr/zapr"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
	"sigs.k8s.io/controller-runtime/pkg/log"

	commontelemetry "altinn.studio/common/telemetry"
)

var errTestRun = errors.New("source secret missing")

//nolint:paralleltest // StartRun uses the global tracer provider, which this test replaces.
func TestStartRunNamesTheControllerAndLinksLogsToTheRun(t *testing.T) {
	recorder := tracetest.NewSpanRecorder()
	previous := otel.GetTracerProvider()
	otel.SetTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder)))
	t.Cleanup(func() { otel.SetTracerProvider(previous) })

	console, _ := observer.New(zap.InfoLevel)
	logs := &recordingProcessor{}
	provider := sdklog.NewLoggerProvider(sdklog.WithProcessor(logs))
	ctx := log.IntoContext(context.Background(), zapr.NewLogger(zap.New(withOTelLogs(console, provider))))

	ctx, span := StartRun(ctx, "secretsync", "secretsync.Reconcile", AttrObjectName.String("my-secret"))
	log.FromContext(ctx).Error(errTestRun, "sync failed")
	commontelemetry.SetError(span, "get_source_secret", errTestRun)
	span.End()

	ended := recorder.Ended()
	if len(ended) != 1 {
		t.Fatalf("spans = %d, want 1", len(ended))
	}
	run := ended[0]
	if got := findAttribute(run.Attributes(), string(AttrController)); got.AsString() != "secretsync" {
		t.Errorf("%s = %q, want secretsync", AttrController, got.AsString())
	}
	if got := findAttribute(run.Attributes(), string(AttrObjectName)); got.AsString() != "my-secret" {
		t.Errorf("%s = %q, want my-secret", AttrObjectName, got.AsString())
	}
	// The record logged during the run, and the one the failed run logs when it ends.
	if len(logs.records) != 2 {
		t.Fatalf("exported records = %d, want 2", len(logs.records))
	}
	for i, record := range logs.records {
		if got := record.TraceID(); got != run.SpanContext().TraceID() {
			t.Errorf("record %d trace ID = %s, want the run's %s", i, got, run.SpanContext().TraceID())
		}
	}
	failure := logs.records[1]
	var errorType string
	failure.WalkAttributes(func(kv attribute.KeyValue) bool {
		if kv.Key == semconv.ErrorTypeKey {
			errorType = kv.Value.AsString()
		}
		return true
	})
	if errorType != "get_source_secret" {
		t.Errorf("failed run's record error.type = %q, want get_source_secret", errorType)
	}
}

//nolint:paralleltest // StartRun records through the global meter provider, which this test sets.
func TestStartRunRecordsEachRunOnce(t *testing.T) {
	previous := otel.GetTracerProvider()
	otel.SetTracerProvider(sdktrace.NewTracerProvider())
	t.Cleanup(func() { otel.SetTracerProvider(previous) })
	reader := sdkmetric.NewManualReader()
	otel.SetMeterProvider(sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader)))

	ctx, run := StartRun(context.Background(), "secretsync", "secretsync.SyncAll")
	_, step := StartRun(ctx, "secretsync", "secretsync.Reconcile")
	step.End()
	run.End()

	ctx, failed := StartRun(context.Background(), "secretsync", "secretsync.SyncAll")
	commontelemetry.SetError(trace.SpanFromContext(ctx), "get_source_secret", errTestRun)
	failed.End()

	var data metricdata.ResourceMetrics
	if err := reader.Collect(context.Background(), &data); err != nil {
		t.Fatal(err)
	}
	counts := map[string]uint64{}
	for _, scope := range data.ScopeMetrics {
		for _, m := range scope.Metrics {
			if m.Name != RunDuration || m.Unit != "s" {
				continue
			}
			histogram, ok := m.Data.(metricdata.Histogram[float64])
			if !ok {
				t.Fatalf("%s is %T, want a histogram", RunDuration, m.Data)
			}
			for _, point := range histogram.DataPoints {
				controller, _ := point.Attributes.Value(AttrController)
				errorType, _ := point.Attributes.Value(semconv.ErrorTypeKey)
				counts[controller.AsString()+"/"+errorType.AsString()] += point.Count
			}
		}
	}
	want := map[string]uint64{"secretsync/": 1, "secretsync/get_source_secret": 1}
	if len(counts) != len(want) || counts["secretsync/"] != 1 || counts["secretsync/get_source_secret"] != 1 {
		t.Errorf("runs recorded = %v, want %v", counts, want)
	}
}
