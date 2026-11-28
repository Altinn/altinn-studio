// Package log is the platform proxy's structured logger.
package log

import (
	"log/slog"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelslog"

	"altinn.studio/platform-proxy/internal/telemetry/attr"
)

// logger writes every record to stderr, and through the global OpenTelemetry LoggerProvider,
// once telemetry is configured, sends WARN and above with their trace context. Log with the
// request's context (WarnContext, ErrorContext) so a record links to the request's trace.
var logger = slog.New(slog.NewMultiHandler(
	slog.NewTextHandler(os.Stderr, nil),
	otelslog.NewHandler("platform-proxy"),
))

// NewComponent returns a logger for one part of the process.
func NewComponent(name string) *slog.Logger {
	return logger.With(attr.Component, name)
}
