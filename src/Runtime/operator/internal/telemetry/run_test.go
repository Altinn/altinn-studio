package telemetry

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"testing"

	"github.com/go-logr/zapr"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
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

//nolint:paralleltest // StartRun records through the global providers, which this test replaces.
func TestStartRunRecordsEachRunOnce(t *testing.T) {
	samplers := map[string]sdktrace.Sampler{
		"sampled":   sdktrace.AlwaysSample(),
		"unsampled": sdktrace.NeverSample(),
	}
	for name, sampler := range samplers {
		t.Run(name, func(t *testing.T) {
			reader := useTestProviders(t, sampler)

			ctx, run := StartRun(context.Background(), "secretsync", "secretsync.SyncAll")
			_, step := StartRun(ctx, "secretsync", "secretsync.Reconcile")
			step.End()
			run.End()

			ctx, failed := StartRun(context.Background(), "secretsync", "secretsync.SyncAll")
			commontelemetry.SetError(trace.SpanFromContext(ctx), "get_source_secret", errTestRun)
			failed.End()

			counts := runCounts(t, reader)
			want := map[string]uint64{"secretsync/": 1, "secretsync/get_source_secret": 1}
			if len(counts) != len(want) || counts["secretsync/"] != 1 || counts["secretsync/get_source_secret"] != 1 {
				t.Errorf("runs recorded = %v, want %v", counts, want)
			}
		})
	}
}

//nolint:paralleltest // StartRun records through the global providers, which this test replaces.
func TestEndRunDistinguishesCancellationFromFailure(t *testing.T) {
	tests := map[string]struct {
		runError func(context.Context, context.CancelFunc) error
		canceled bool
		deadline bool
	}{
		"shutdown": {
			runError: func(ctx context.Context, cancel context.CancelFunc) error {
				cancel()
				return fmt.Errorf("sync mapping: %w", ctx.Err())
			},
			canceled: true,
		},
		"joined cancellations": {
			runError: func(_ context.Context, cancel context.CancelFunc) error {
				cancel()
				return fmt.Errorf("sync mappings: %w", errors.Join(context.Canceled, context.Canceled))
			},
			canceled: true,
		},
		"failure during shutdown": {
			runError: func(_ context.Context, cancel context.CancelFunc) error {
				cancel()
				return errTestRun
			},
		},
		"batch failure followed by shutdown": {
			runError: func(_ context.Context, cancel context.CancelFunc) error {
				cancel()
				return fmt.Errorf("sync mappings: %w", errors.Join(errTestRun, context.Canceled))
			},
		},
		"child cancellation": {
			runError: func(ctx context.Context, _ context.CancelFunc) error {
				child, cancel := context.WithCancel(ctx)
				cancel()
				return child.Err()
			},
		},
		"run deadline": {
			runError: func(ctx context.Context, _ context.CancelFunc) error { return ctx.Err() },
			deadline: true,
		},
		"child deadline": {
			runError: func(ctx context.Context, _ context.CancelFunc) error {
				child, cancel := context.WithTimeout(ctx, 0)
				defer cancel()
				return child.Err()
			},
		},
		"deadline followed by shutdown": {
			runError: func(ctx context.Context, cancel context.CancelFunc) error {
				child, stop := context.WithTimeout(ctx, 0)
				defer stop()
				cancel()
				return child.Err()
			},
		},
		"completed during shutdown": {
			runError: func(_ context.Context, cancel context.CancelFunc) error {
				cancel()
				return nil
			},
		},
	}
	samplers := map[string]sdktrace.Sampler{
		"sampled":   sdktrace.AlwaysSample(),
		"unsampled": sdktrace.NeverSample(),
	}
	for sampling, sampler := range samplers {
		for name, tt := range tests {
			t.Run(sampling+"/"+name, func(t *testing.T) {
				reader := useTestProviders(t, sampler)
				recorder := tracetest.NewSpanRecorder()
				provider, ok := otel.GetTracerProvider().(*sdktrace.TracerProvider)
				if !ok {
					t.Fatal("test tracer provider is not an SDK provider")
				}
				provider.RegisterSpanProcessor(recorder)
				console, logs := observer.New(zap.InfoLevel)
				ctx, cancel := context.WithCancel(
					log.IntoContext(context.Background(), zapr.NewLogger(zap.New(console))),
				)
				defer cancel()
				if tt.deadline {
					var stop context.CancelFunc
					ctx, stop = context.WithTimeout(ctx, 0)
					defer stop()
				}

				ctx, run := StartRun(ctx, "secretsync", "secretsync.SyncAll")
				_, step := StartRun(ctx, "secretsync", "secretsync.Reconcile")
				err := tt.runError(ctx, cancel)
				wantCounts := map[string]uint64{"secretsync/": 1}
				wantErrors := 0
				if err != nil {
					commontelemetry.SetError(step, "get_source_secret", err)
					commontelemetry.SetError(trace.SpanFromContext(ctx), "sync_mappings", err)
					wantCounts = map[string]uint64{"secretsync/sync_mappings": 1}
					wantErrors = 1
				}
				if tt.canceled {
					wantCounts = map[string]uint64{}
					wantErrors = 0
				}
				EndRun(ctx, step, err)
				EndRun(ctx, run, err)

				if counts := runCounts(t, reader); !maps.Equal(counts, wantCounts) {
					t.Errorf("runs recorded = %v, want %v", counts, wantCounts)
				}
				if got := logs.FilterLevelExact(zap.ErrorLevel).Len(); got != wantErrors {
					t.Errorf("ERROR records = %d, want %d", got, wantErrors)
				}
				if got := logs.FilterMessage("Controller run canceled").Len(); (got == 1) != tt.canceled {
					t.Errorf("cancellation records = %d, canceled = %v", got, tt.canceled)
				}
				if sampling == "sampled" && err != nil {
					assertRunSpansKeepError(t, recorder.Ended(), err)
				}
			})
		}
	}
}

func assertRunSpansKeepError(t *testing.T, ended []sdktrace.ReadOnlySpan, err error) {
	t.Helper()
	if len(ended) != 2 {
		t.Fatalf("spans = %d, want 2", len(ended))
	}
	for _, span := range ended {
		if got := span.Status(); got.Code != codes.Error || got.Description != err.Error() {
			t.Errorf("span %s status = %v, want the original error", span.Name(), got)
		}
		if got := findAttribute(span.Attributes(), string(semconv.ErrorTypeKey)); got.AsString() == "" {
			t.Errorf("span %s lost error.type", span.Name())
		}
	}
}

//nolint:paralleltest // StartRun records through the global providers, which this test replaces.
func TestEndRunKeepsAFailureRecordedBeforeShutdown(t *testing.T) {
	reader := useTestProviders(t, sdktrace.AlwaysSample())
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	_, run := StartRun(ctx, "secretsync", "secretsync.Reconcile")
	commontelemetry.SetError(run, "get_source_secret", errTestRun)
	cancel()
	EndRun(ctx, run, errTestRun)

	want := map[string]uint64{"secretsync/get_source_secret": 1}
	if counts := runCounts(t, reader); !maps.Equal(counts, want) {
		t.Errorf("runs recorded = %v, want %v", counts, want)
	}
}

// useTestProviders installs a tracer provider with sampler and a meter provider read by the
// returned reader, and restores the previous ones when the test ends.
func useTestProviders(t *testing.T, sampler sdktrace.Sampler) *sdkmetric.ManualReader {
	t.Helper()
	previousTracerProvider, previousMeterProvider := otel.GetTracerProvider(), otel.GetMeterProvider()
	tracerProvider := sdktrace.NewTracerProvider(sdktrace.WithSampler(sampler))
	reader := sdkmetric.NewManualReader()
	meterProvider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))
	otel.SetTracerProvider(tracerProvider)
	otel.SetMeterProvider(meterProvider)
	t.Cleanup(func() {
		otel.SetTracerProvider(previousTracerProvider)
		otel.SetMeterProvider(previousMeterProvider)
		if err := tracerProvider.Shutdown(context.Background()); err != nil {
			t.Error(err)
		}
		if err := meterProvider.Shutdown(context.Background()); err != nil {
			t.Error(err)
		}
	})
	return reader
}

// runCounts returns the number of runs recorded in RunDuration by controller/error.type.
func runCounts(t *testing.T, reader *sdkmetric.ManualReader) map[string]uint64 {
	t.Helper()
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
	return counts
}
