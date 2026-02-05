package telemetry

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
)

const scopeName = "pdf3"

func Tracer() oteltrace.Tracer {
	return otel.Tracer(scopeName)
}

func Meter() otelmetric.Meter {
	return otel.Meter(scopeName)
}

// ConfigureOTel bootstraps the OpenTelemetry pipeline.
// If it does not return an error, make sure to call shutdown for proper cleanup.
func ConfigureOTel(ctx context.Context) (shutdown func(context.Context) error, err error) {
	var shutdownFuncs []func(context.Context) error

	shutdown = func(ctx context.Context) error {
		var err error
		for _, fn := range shutdownFuncs {
			err = errors.Join(err, fn(ctx))
		}
		shutdownFuncs = nil
		return err
	}

	handleErr := func(inErr error) {
		err = errors.Join(inErr, shutdown(ctx))
	}

	// OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES set the service identity
	res, err := resource.New(ctx,
		resource.WithFromEnv(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	tracerProvider, err := newTracerProvider(ctx, res)
	if err != nil {
		handleErr(err)
		return shutdown, err
	}
	shutdownFuncs = append(shutdownFuncs, tracerProvider.Shutdown)
	otel.SetTracerProvider(tracerProvider)

	meterProvider, err := newMeterProvider(ctx, res)
	if err != nil {
		handleErr(err)
		return shutdown, err
	}
	shutdownFuncs = append(shutdownFuncs, meterProvider.Shutdown)
	otel.SetMeterProvider(meterProvider)

	if err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(15 * time.Second)); err != nil {
		handleErr(err)
		return shutdown, err
	}

	return shutdown, nil
}

func newTracerProvider(ctx context.Context, res *resource.Resource) (*trace.TracerProvider, error) {
	// cluster-internal endpoint, no TLS needed
	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	return trace.NewTracerProvider(
		trace.WithBatcher(exporter, trace.WithBatchTimeout(5*time.Second)),
		trace.WithResource(res),
	), nil
}

// Buckets tailored for PDF generation latencies (0.25s to 35s)
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

func newMeterProvider(ctx context.Context, res *resource.Resource) (*metric.MeterProvider, error) {
	// cluster-internal endpoint, no TLS needed
	exporter, err := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	return metric.NewMeterProvider(
		metric.WithReader(metric.NewPeriodicReader(exporter, metric.WithInterval(30*time.Second))),
		metric.WithResource(res),
		metric.WithView(httpDurationView),
	), nil
}
