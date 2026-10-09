package generator

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel/attribute"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"

	"altinn.studio/pdf3/internal/types"
)

func TestGeneratorMetrics(t *testing.T) {
	reader := sdkmetric.NewManualReader()
	provider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))
	metrics, err := newGeneratorMetrics(provider.Meter("test"))
	if err != nil {
		t.Fatalf("newGeneratorMetrics() error = %v", err)
	}

	ctx := context.Background()
	metrics.recordGeneration(ctx, nil)
	metrics.recordGeneration(ctx, nil)
	metrics.recordGeneration(ctx, types.NewPDFError(types.ErrQueueFull, "", nil))
	metrics.recordGeneration(ctx, types.NewPDFError(types.ErrElementNotReady, "", nil))

	var data metricdata.ResourceMetrics
	if err := reader.Collect(ctx, &data); err != nil {
		t.Fatalf("Collect() error = %v", err)
	}
	got := map[string]int64{}
	for _, scope := range data.ScopeMetrics {
		for _, m := range scope.Metrics {
			values, ok := m.Data.(metricdata.Sum[int64])
			if !ok {
				continue
			}
			for _, point := range values.DataPoints {
				errorType, _ := point.Attributes.Value(attribute.Key("error.type"))
				got[m.Name+"/"+errorType.AsString()] = point.Value
			}
		}
	}
	want := map[string]int64{
		generationsMetric + "/":                  2,
		generationsMetric + "/queue_full":        1,
		generationsMetric + "/element_not_ready": 1,
	}
	for key, value := range want {
		if got[key] != value {
			t.Errorf("%s = %d, want %d (all: %v)", key, got[key], value, got)
		}
	}
}

func TestErrorTypeName(t *testing.T) {
	for _, errType := range []error{
		types.ErrQueueFull,
		types.ErrTimeout,
		types.ErrClientDropped,
		types.ErrSetCookieFail,
		types.ErrElementNotReady,
		types.ErrGenerationFail,
		types.ErrUnhandledBrowserError,
	} {
		if name := errorTypeName(errType); name == "_OTHER" {
			t.Errorf("errorTypeName(%v) has no name of its own", errType)
		}
	}
}
