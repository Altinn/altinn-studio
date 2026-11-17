package telemetry

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/sdk/metric"
	oteltrace "go.opentelemetry.io/otel/trace"

	commontelemetry "altinn.studio/common/telemetry"
)

const scopeName = "pdf3"

// serviceVersion is the build's version, the commit the deployment workflow builds from:
// go build -ldflags "-X altinn.studio/pdf3/internal/telemetry.serviceVersion=...".
var serviceVersion = "dev"

//nolint:ireturn // OpenTelemetry intentionally exposes interface-returning accessors.
func Tracer() oteltrace.Tracer {
	return otel.Tracer(scopeName)
}

//nolint:ireturn // OpenTelemetry intentionally exposes interface-returning accessors.
func Meter() otelmetric.Meter {
	return otel.Meter(scopeName)
}

// ConfigureOTel bootstraps the OpenTelemetry pipeline for the runtime environment pdf3 runs in,
// exporting the given signals. The others stay no-ops.
// pdf3 reports its environment itself, since in the DIS core cluster no router sets it.
// If it does not return an error, make sure to call shutdown for proper cleanup.
func ConfigureOTel(
	ctx context.Context,
	environment string,
	signals commontelemetry.Signals,
) (func(context.Context) error, error) {
	shutdown, err := commontelemetry.Setup(ctx, commontelemetry.Config{
		ServiceVersion: serviceVersion,
		Environment:    environment,
		MetricViews:    []metric.View{httpDurationView},
		Signals:        signals,
	})
	if err != nil {
		return nil, fmt.Errorf("configure OpenTelemetry: %w", err)
	}

	if signals.Metrics {
		if err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(15 * time.Second)); err != nil {
			err = fmt.Errorf("start runtime metrics instrumentation: %w", err)
			return nil, errors.Join(err, shutdown(ctx))
		}
	}

	return shutdown, nil
}

// Buckets tailored for PDF generation latencies (0.25s to 35s).
var httpDurationView = metric.NewView(
	metric.Instrument{
		Name: "http.server.request.duration",
		Kind: metric.InstrumentKindHistogram,
	},
	metric.Stream{
		Aggregation: metric.AggregationExplicitBucketHistogram{
			Boundaries: []float64{
				0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 5, 7.5,
				10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35,
			},
		},
	},
)
