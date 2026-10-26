// Package telemetry sets up OpenTelemetry for a Studio service written in Go, the way the
// observability standards describe it (https://github.com/Altinn/altinn-studio/issues/21073):
// the resource every process reports, the per-process identity and start time, the export
// settings and the WARN floor for exported logs.
//
// A service keeps its own instrumentation scope, metric names, views and log bridge. This package
// only owns what has to be the same in every service.
package telemetry

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/propagation"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
)

const scopeName = "altinn.studio/common/telemetry"

// Signals are the telemetry signals a process exports. A signal it doesn't export keeps the
// global no-op provider.
type Signals struct {
	Traces  bool
	Metrics bool
	Logs    bool
}

// AllSignals exports traces, metrics and logs.
func AllSignals() Signals {
	return Signals{Traces: true, Metrics: true, Logs: true}
}

// Any reports whether any signal is exported.
func (s Signals) Any() bool {
	return s.Traces || s.Metrics || s.Logs
}

// Config describes the process to Setup.
type Config struct {
	// ServiceVersion is the build's version, reported as service.version. Services set it from
	// the commit the image is built from.
	ServiceVersion string
	// Environment is reported as deployment.environment.name when set. Leave it empty where the
	// cluster's router sets the attribute; only a service running outside such a cluster sets it.
	Environment string
	// MetricViews change how the service's instruments aggregate, such as histogram boundaries.
	MetricViews []metric.View
	Signals     Signals
}

// Setup configures the global OpenTelemetry providers and propagator for the signals in cfg,
// exporting over OTLP/gRPC to the endpoint the OTEL_EXPORTER_OTLP_* variables name.
//
// The export interval for metrics is OTEL_METRIC_EXPORT_INTERVAL, set in the deployment, never in
// code. With metrics, the process reports altinn.workload.start_time. With logs, only WARN and
// above are exported.
//
// If Setup returns no error, call shutdown before the process exits so buffered telemetry is sent.
func Setup(ctx context.Context, cfg Config) (shutdown func(context.Context) error, err error) {
	var shutdownFuncs []func(context.Context) error

	shutdown = func(ctx context.Context) error {
		var shutdownErr error
		for _, fn := range shutdownFuncs {
			shutdownErr = errors.Join(shutdownErr, fn(ctx))
		}
		shutdownFuncs = nil
		return shutdownErr
	}

	res, err := newResource(ctx, cfg.ServiceVersion, cfg.Environment)
	if err != nil {
		return nil, err
	}

	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	fail := func(inErr error) (func(context.Context) error, error) {
		return nil, errors.Join(inErr, shutdown(ctx))
	}

	if cfg.Signals.Traces {
		tracerProvider, err := newTracerProvider(ctx, res)
		if err != nil {
			return fail(err)
		}
		shutdownFuncs = append(shutdownFuncs, tracerProvider.Shutdown)
		otel.SetTracerProvider(tracerProvider)
	}

	if cfg.Signals.Metrics {
		meterProvider, err := newMeterProvider(ctx, res, cfg.MetricViews)
		if err != nil {
			return fail(err)
		}
		shutdownFuncs = append(shutdownFuncs, meterProvider.Shutdown)
		otel.SetMeterProvider(meterProvider)

		if err := registerStartTime(meterProvider.Meter(scopeName), processStartTime); err != nil {
			return fail(err)
		}
	}

	if cfg.Signals.Logs {
		loggerProvider, err := newLoggerProvider(ctx, res)
		if err != nil {
			return fail(err)
		}
		shutdownFuncs = append(shutdownFuncs, loggerProvider.Shutdown)
		global.SetLoggerProvider(loggerProvider)
	}

	return shutdown, nil
}

// newResource describes the build, the process and, if given, the environment it runs in, as the
// platform names it (prod, tt02, at22, ...). OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES set the
// rest of the service's identity, and take precedence.
func newResource(ctx context.Context, serviceVersion string, environment string) (*resource.Resource, error) {
	attributes := []resource.Option{
		resource.WithAttributes(
			semconv.ServiceVersion(serviceVersion),
			semconv.ServiceInstanceID(processInstanceID),
		),
	}
	if environment != "" {
		attributes = append(
			attributes,
			resource.WithAttributes(semconv.DeploymentEnvironmentNameKey.String(environment)),
		)
	}
	res, err := resource.New(ctx, append(attributes, resource.WithFromEnv())...)
	if err != nil {
		return nil, fmt.Errorf("create resource: %w", err)
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

func newMeterProvider(ctx context.Context, res *resource.Resource, views []metric.View) (*metric.MeterProvider, error) {
	// cluster-internal endpoint, no TLS needed
	exporter, err := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("create metric exporter: %w", err)
	}

	return metric.NewMeterProvider(
		// No interval here: one set in code overrides OTEL_METRIC_EXPORT_INTERVAL.
		metric.WithReader(metric.NewPeriodicReader(exporter)),
		metric.WithResource(res),
		metric.WithView(views...),
	), nil
}

func newLoggerProvider(ctx context.Context, res *resource.Resource) (*sdklog.LoggerProvider, error) {
	// cluster-internal endpoint, no TLS needed
	exporter, err := otlploggrpc.New(ctx, otlploggrpc.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("create log exporter: %w", err)
	}

	return sdklog.NewLoggerProvider(
		sdklog.WithResource(res),
		sdklog.WithProcessor(newMinSeverityProcessor(sdklog.NewBatchProcessor(exporter))),
	), nil
}
