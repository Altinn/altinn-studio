package telemetry

import (
	"context"
	"net/http"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/sdk/metric"
)

// Telemetry manages OpenTelemetry metrics collection and export.
type Telemetry struct {
	meterProvider *metric.MeterProvider
	exporter      *prometheus.Exporter
}

// New creates a new Telemetry instance with Prometheus exporter.
// serviceName should be "pdf3-proxy" or "pdf3-worker".
func New(serviceName string) (*Telemetry, error) {
	// Create Prometheus exporter
	exporter, err := prometheus.New()
	if err != nil {
		return nil, err
	}

	// Create view for customizing HTTP histogram buckets
	// Buckets tailored for PDF generation (0.5s to 30s)
	httpDurationView := metric.NewView(
		metric.Instrument{
			Name: "http.server.request.duration",
			Kind: metric.InstrumentKindHistogram,
		},
		metric.Stream{
			Aggregation: metric.AggregationExplicitBucketHistogram{
				Boundaries: []float64{0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.25, 25, 27.5, 30, 32.5, 35},
			},
		},
	)

	// Create meter provider with Prometheus reader and custom views
	meterProvider := metric.NewMeterProvider(
		metric.WithReader(exporter),
		metric.WithView(httpDurationView),
	)

	// Set as global meter provider
	otel.SetMeterProvider(meterProvider)

	err = runtime.Start(runtime.WithMinimumReadMemStatsInterval(15))
	if err != nil {
		return nil, err
	}

	return &Telemetry{
		meterProvider: meterProvider,
		exporter:      exporter,
	}, nil
}

// Handler returns an HTTP handler for the /metrics endpoint.
// This handler serves Prometheus-formatted metrics from the default registry.
func (t *Telemetry) Handler() http.Handler {
	return promhttp.Handler()
}

// Close gracefully shuts down the telemetry system.
// It flushes any pending metrics and releases resources.
func (t *Telemetry) Close(ctx context.Context) error {
	return t.meterProvider.Shutdown(ctx)
}
