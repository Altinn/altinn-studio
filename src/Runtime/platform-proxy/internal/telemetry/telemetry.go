// Package telemetry sets up OpenTelemetry for the platform proxy.
package telemetry

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	otelmetric "go.opentelemetry.io/otel/metric"
	oteltrace "go.opentelemetry.io/otel/trace"

	commontelemetry "altinn.studio/common/telemetry"
)

const scopeName = "platform-proxy"

// serviceVersion is the build's version, the commit the deployment workflow builds from:
// go build -ldflags "-X altinn.studio/platform-proxy/internal/telemetry.serviceVersion=...".
var serviceVersion = "dev"

// Tracer returns the proxy's tracer.
//
//nolint:ireturn // OpenTelemetry intentionally exposes interface-returning accessors.
func Tracer() oteltrace.Tracer {
	return otel.Tracer(scopeName)
}

// Meter returns the proxy's meter.
//
//nolint:ireturn // OpenTelemetry intentionally exposes interface-returning accessors.
func Meter() otelmetric.Meter {
	return otel.Meter(scopeName)
}

// Configure exports all signals when the deployment names a collector in OTEL_EXPORTER_OTLP_ENDPOINT,
// and none otherwise. The runtime cluster's router sets the environment and the service owner. If it
// does not return an error, call shutdown before the process exits.
func Configure(ctx context.Context) (func(context.Context) error, error) {
	signals := commontelemetry.Signals{}
	if os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT") != "" {
		signals = commontelemetry.AllSignals()
	}
	shutdown, err := commontelemetry.Setup(ctx, commontelemetry.Config{
		ServiceVersion: serviceVersion,
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
