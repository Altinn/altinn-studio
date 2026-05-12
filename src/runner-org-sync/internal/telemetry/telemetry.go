// Package telemetry configures OpenTelemetry traces and metrics, plus a
// structured slog logger writing JSON to stdout.
//
// Init returns a Telemetry value carrying ready-to-use Logger, Tracer, and
// Meter, and a Shutdown closer that flushes both the trace and metric
// pipelines. When OTEL_EXPORTER_OTLP_ENDPOINT is unset the OTLP exporters
// are skipped entirely — the no-op providers from the OTel SDK keep working
// so callers do not need conditional code paths.
package telemetry

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
)

// Telemetry exposes the three observability handles the rest of the service
// uses. None of them require a non-nil OTLP endpoint to be safe to call.
type Telemetry struct {
	Logger *slog.Logger
	Tracer trace.Tracer
	Meter  metric.Meter
}

// Shutdown flushes and stops the OTel pipelines. Always call on exit, with
// a short bounded context (10s is plenty).
type Shutdown func(ctx context.Context) error

// scope is the instrumentation scope name used for the tracer and meter.
const scope = "altinn.studio/runner-org-sync"

// Init configures providers and returns ready-to-use handles. serviceName
// defaults to "runner-org-sync" when empty and overrides any value the SDK
// would otherwise pick up from OTEL_SERVICE_NAME.
func Init(ctx context.Context, serviceName string) (*Telemetry, Shutdown, error) {
	if serviceName == "" {
		serviceName = "runner-org-sync"
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	res, err := resource.New(ctx,
		resource.WithAttributes(semconv.ServiceName(serviceName)),
		resource.WithFromEnv(),     // OTEL_RESOURCE_ATTRIBUTES
		resource.WithProcessPID(),
		resource.WithHost(),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("telemetry: resource: %w", err)
	}

	// If no OTLP endpoint is configured (typical for local dev) skip exporters
	// entirely. The default global TracerProvider / MeterProvider are no-ops,
	// so call sites do not need conditional logic.
	if !otlpEndpointConfigured() {
		t := &Telemetry{
			Logger: logger,
			Tracer: otel.Tracer(scope),
			Meter:  otel.Meter(scope),
		}
		return t, func(context.Context) error { return nil }, nil
	}

	traceExp, err := otlptracegrpc.New(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("telemetry: trace exporter: %w", err)
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExp),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	otel.SetTracerProvider(tp)

	metricExp, err := otlpmetricgrpc.New(ctx)
	if err != nil {
		// Best-effort cleanup of the already-installed trace exporter so we
		// do not leave background goroutines if Init returns an error.
		_ = tp.Shutdown(ctx)
		return nil, nil, fmt.Errorf("telemetry: metric exporter: %w", err)
	}
	mp := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExp,
			sdkmetric.WithInterval(15*time.Second),
		)),
	)
	otel.SetMeterProvider(mp)

	shutdown := func(ctx context.Context) error {
		return errors.Join(
			tp.Shutdown(ctx),
			mp.Shutdown(ctx),
		)
	}

	return &Telemetry{
		Logger: logger,
		Tracer: otel.Tracer(scope),
		Meter:  otel.Meter(scope),
	}, shutdown, nil
}

func otlpEndpointConfigured() bool {
	for _, k := range []string{
		"OTEL_EXPORTER_OTLP_ENDPOINT",
		"OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
		"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
	} {
		if os.Getenv(k) != "" {
			return true
		}
	}
	return false
}
