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
	"go.opentelemetry.io/otel/log/global"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	oteltrace "go.opentelemetry.io/otel/trace"
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

// ConfigureOTel bootstraps the OpenTelemetry pipeline for the runtime environment pdf3 runs in.
// If it does not return an error, make sure to call shutdown for proper cleanup.
func ConfigureOTel(ctx context.Context, environment string) (shutdown func(context.Context) error, err error) {
	var shutdownFuncs []func(context.Context) error

	shutdown = func(ctx context.Context) error {
		var shutdownErr error
		for _, fn := range shutdownFuncs {
			shutdownErr = errors.Join(shutdownErr, fn(ctx))
		}
		shutdownFuncs = nil
		return shutdownErr
	}

	handleErr := func(inErr error) {
		err = errors.Join(inErr, shutdown(ctx))
	}

	res, err := newResource(ctx, environment)
	if err != nil {
		return nil, err
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

	loggerProvider, err := newLoggerProvider(ctx, res)
	if err != nil {
		handleErr(err)
		return shutdown, err
	}
	shutdownFuncs = append(shutdownFuncs, loggerProvider.Shutdown)
	global.SetLoggerProvider(loggerProvider)

	if err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(15 * time.Second)); err != nil {
		handleErr(err)
		return shutdown, fmt.Errorf("start runtime metrics instrumentation: %w", err)
	}

	return shutdown, nil
}

// newResource describes this build and the environment it runs in. The environment is the one
// the runtime cluster's syncroot substitutes, the same value its telemetry router sets.
// OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES set the rest of the service identity, and take
// precedence.
func newResource(ctx context.Context, environment string) (*resource.Resource, error) {
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceVersion(serviceVersion),
			semconv.DeploymentEnvironmentNameKey.String(environment),
		),
		resource.WithFromEnv(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}
	return res, nil
}

func newTracerProvider(ctx context.Context, res *resource.Resource) (*trace.TracerProvider, error) {
	// cluster-internal endpoint, no TLS needed
	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("create trace exporter: %w", err)
	}

	return trace.NewTracerProvider(
		trace.WithBatcher(exporter, trace.WithBatchTimeout(5*time.Second)),
		trace.WithResource(res),
	), nil
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

func newMeterProvider(ctx context.Context, res *resource.Resource) (*metric.MeterProvider, error) {
	// cluster-internal endpoint, no TLS needed
	exporter, err := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("create metric exporter: %w", err)
	}

	return metric.NewMeterProvider(
		// OTEL_METRIC_EXPORT_INTERVAL, set in the deployment manifests, sets the export interval.
		metric.WithReader(metric.NewPeriodicReader(exporter)),
		metric.WithResource(res),
		metric.WithView(httpDurationView),
	), nil
}
