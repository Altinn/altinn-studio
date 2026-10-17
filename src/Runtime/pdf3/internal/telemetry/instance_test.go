package telemetry

import (
	"testing"
	"time"

	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
)

func TestInstanceMetricReportsStartTimeOnEveryCollection(t *testing.T) {
	reader := metric.NewManualReader()
	provider := metric.NewMeterProvider(metric.WithReader(reader))
	t.Cleanup(func() {
		if err := provider.Shutdown(t.Context()); err != nil {
			t.Error(err)
		}
	})
	started := time.Unix(1_700_000_000, 500_000_000)
	if err := registerInstanceMetric(provider.Meter(scopeName), started); err != nil {
		t.Fatal(err)
	}
	// No HTTP requests or record calls: the idle process must keep reporting the original value.
	for range 2 {
		var data metricdata.ResourceMetrics
		if err := reader.Collect(t.Context(), &data); err != nil {
			t.Fatal(err)
		}
		if len(data.ScopeMetrics) != 1 || len(data.ScopeMetrics[0].Metrics) != 1 {
			t.Fatalf("unexpected metrics: %+v", data)
		}
		got := data.ScopeMetrics[0].Metrics[0]
		if got.Name != "altinn.instance.start_time" || got.Unit != "s" {
			t.Fatalf("metric = %s (%s)", got.Name, got.Unit)
		}
		gauge, ok := got.Data.(metricdata.Gauge[float64])
		if !ok || len(gauge.DataPoints) != 1 {
			t.Fatalf("expected one gauge point, got %+v", got.Data)
		}
		if value := gauge.DataPoints[0].Value; value != 1_700_000_000.5 {
			t.Errorf("start time = %v, want 1700000000.5", value)
		}
		if gauge.DataPoints[0].Attributes.Len() != 0 {
			t.Error("identity belongs on the resource, not the metric")
		}
	}
}
