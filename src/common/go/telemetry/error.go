package telemetry

import (
	"go.opentelemetry.io/otel/codes"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"
)

// SetError marks span as failed: errorType, a low-cardinality class of failure, as error.type,
// and an error status. It records no exception event: the details of a failure go in a log
// record correlated by trace ID.
//
// err's message, if any, becomes the status description, which internal spans keep. On an
// HTTP server span otelhttp sets the status again after the handler, with no description for
// a 5xx, so error.type and that log record are what describe the failure there.
func SetError(span trace.Span, errorType string, err error) {
	if !span.IsRecording() {
		return
	}
	description := ""
	if err != nil {
		description = err.Error()
	}
	span.SetAttributes(semconv.ErrorTypeKey.String(errorType))
	span.SetStatus(codes.Error, description)
}
