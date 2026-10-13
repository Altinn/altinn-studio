package log

import (
	"log/slog"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelslog"
)

// logger writes every record to stderr, and through the global OpenTelemetry LoggerProvider,
// once telemetry is configured, sends WARN and above with their trace context. Log with the
// request's context (WarnContext, ErrorContext) so a record links to the request's trace.
var logger *slog.Logger = slog.New(slog.NewMultiHandler(
	slog.NewTextHandler(os.Stderr, nil),
	otelslog.NewHandler("pdf3"),
))

// NewComponent creates a new logger with a component name.
func NewComponent(name string) *slog.Logger {
	return logger.With("component", name)
}
