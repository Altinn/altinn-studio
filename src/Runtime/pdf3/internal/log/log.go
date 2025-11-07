package log

import (
	"log/slog"
	"os"
)

var logger *slog.Logger = slog.New(slog.NewTextHandler(os.Stdout, nil))

// NewComponent creates a new logger with a component name.
func NewComponent(name string) *slog.Logger {
	return logger.With("component", name)
}
