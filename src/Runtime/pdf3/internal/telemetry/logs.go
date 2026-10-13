package telemetry

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	otellog "go.opentelemetry.io/otel/log"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
)

// minExportedSeverity is the lowest severity pdf3 exports. Logs are for conditions someone should
// act on, and the telemetry pipeline drops everything below WARN anyway.
const minExportedSeverity = otellog.SeverityWarn

func newLoggerProvider(ctx context.Context, res *resource.Resource) (*sdklog.LoggerProvider, error) {
	// cluster-internal endpoint, no TLS needed
	exporter, err := otlploggrpc.New(ctx, otlploggrpc.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("create log exporter: %w", err)
	}

	return sdklog.NewLoggerProvider(
		sdklog.WithResource(res),
		sdklog.WithProcessor(minSeverityProcessor{
			Processor: sdklog.NewBatchProcessor(exporter),
			minimum:   minExportedSeverity,
		}),
	), nil
}

// minSeverityProcessor passes on only records at or above minimum. Records without a severity
// are dropped, as the pipeline would.
type minSeverityProcessor struct {
	sdklog.Processor

	minimum otellog.Severity
}

func (p minSeverityProcessor) Enabled(ctx context.Context, param sdklog.EnabledParameters) bool {
	return param.Severity >= p.minimum && p.Processor.Enabled(ctx, param)
}

func (p minSeverityProcessor) OnEmit(ctx context.Context, record *sdklog.Record) error {
	if record.Severity() < p.minimum {
		return nil
	}
	if err := p.Processor.OnEmit(ctx, record); err != nil {
		return fmt.Errorf("emit log record: %w", err)
	}
	return nil
}
