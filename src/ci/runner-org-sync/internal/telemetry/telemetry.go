// Package telemetry configures OpenTelemetry traces and metrics, sets the
// default slog logger, and exposes package-level Tracer/Meter accessors.
//
// Mirrors the pattern used by src/Runtime/pdf3/internal/telemetry: callers
// invoke ConfigureOTel once at startup, defer the returned shutdown, and use
// telemetry.Tracer() / telemetry.Meter() anywhere they need an instrument.
// No per-handle struct to thread through call sites — OTel's global
// providers do that work.
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
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
)

const scope = "altinn.studio/runner-org-sync"

const metricExportInterval = 15 * time.Second

// Tracer returns the package's tracer. Safe to call before ConfigureOTel —
// the OTel SDK's default global provider is a no-op until a real one is
// installed, so the returned tracer always works.
func Tracer() trace.Tracer {
	return otel.Tracer(scope)
}

// Meter returns the package's meter. Same semantics as Tracer.
func Meter() metric.Meter {
	return otel.Meter(scope)
}

// ConfigureOTel bootstraps OpenTelemetry (traces + metrics) and sets the
// default slog logger. Always defer the returned shutdown on exit with a
// bounded context — 10s is plenty for our payload sizes.
//
// If OTEL_EXPORTER_OTLP_ENDPOINT is unset (typical for local dev) the OTLP
// exporters are skipped entirely and the global no-op providers continue to
// satisfy Tracer() / Meter() calls.
func ConfigureOTel(ctx context.Context, serviceName string) (func(context.Context) error, error) {
	if serviceName == "" {
		serviceName = "runner-org-sync"
	}

	// Default slog handler: JSON to stdout. Keeps `kubectl logs` readable
	// for humans and parseable for log aggregators.
	slog.SetDefault(
		slog.New(
			slog.NewJSONHandler(
				os.Stdout,
				&slog.HandlerOptions{
					Level: slog.LevelInfo,
				},
			),
		),
	)

	res, err := resource.New(ctx,
		resource.WithAttributes(semconv.ServiceName(serviceName)),
		resource.WithFromEnv(), // OTEL_RESOURCE_ATTRIBUTES
		resource.WithProcessPID(),
		resource.WithHost(),
	)
	if err != nil {
		return nil, fmt.Errorf("telemetry: resource: %w", err)
	}

	// Set propagator so any future cross-service call (HTTP/gRPC) preserves
	// trace context automatically. Free for us — costs nothing if unused.
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	noop := func(context.Context) error { return nil }
	if !otlpEndpointConfigured() {
		return noop, nil
	}

	var shutdownFuncs []func(context.Context) error
	shutdown := func(ctx context.Context) error {
		var shutdownErr error
		for _, fn := range shutdownFuncs {
			shutdownErr = errors.Join(shutdownErr, fn(ctx))
		}
		shutdownFuncs = nil
		return shutdownErr
	}

	traceExp, err := otlptracegrpc.New(ctx)
	if err != nil {
		return shutdown, fmt.Errorf("telemetry: trace exporter: %w", err)
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExp),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	otel.SetTracerProvider(tp)
	shutdownFuncs = append(shutdownFuncs, tp.Shutdown)

	metricExp, err := otlpmetricgrpc.New(ctx)
	if err != nil {
		return shutdown, fmt.Errorf("telemetry: metric exporter: %w", err)
	}
	mp := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		// Preserve pre-1.44 SDK behavior; our low-cardinality metric set is
		// controlled at call sites rather than by the provider default.
		sdkmetric.WithCardinalityLimit(0),
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExp,
			sdkmetric.WithInterval(metricExportInterval),
		)),
	)
	otel.SetMeterProvider(mp)
	shutdownFuncs = append(shutdownFuncs, mp.Shutdown)

	return shutdown, nil
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
