package internal

import (
	"fmt"
	"io"
	"os"
	"strings"
)

// Logger provides structured logging for release workflow operations.
type Logger interface {
	// Step logs a major workflow step (e.g., "Creating release branch...")
	Step(msg string)
	// Info logs informational messages
	Info(msg string, args ...any)
	// Command logs a command being executed
	Command(cmd string, args []string)
	// Success logs a success message
	Success(msg string)
	// Error logs an error message
	Error(msg string, args ...any)
	// Detail logs a detail line (indented)
	Detail(key, value string)
}

// ConsoleLogger implements Logger with formatted console output.
type ConsoleLogger struct {
	out io.Writer
	err io.Writer
}

// ConsoleLoggerOption configures ConsoleLogger.
type ConsoleLoggerOption func(*ConsoleLogger)

// WithWriters sets custom output writers.
func WithWriters(out, errOut io.Writer) ConsoleLoggerOption {
	return func(l *ConsoleLogger) {
		l.out = out
		l.err = errOut
	}
}

// NewConsoleLogger creates a new console logger.
func NewConsoleLogger(opts ...ConsoleLoggerOption) *ConsoleLogger {
	l := &ConsoleLogger{
		out: os.Stdout,
		err: os.Stderr,
	}
	for _, opt := range opts {
		opt(l)
	}
	return l
}

// Step logs a major workflow step.
func (l *ConsoleLogger) Step(msg string) {
	//nolint:errcheck // logging errors are non-critical
	fmt.Fprintf(l.out, "\n==> %s\n", msg)
}

// Info logs an informational message.
func (l *ConsoleLogger) Info(msg string, args ...any) {
	if len(args) > 0 {
		msg = fmt.Sprintf(msg, args...)
	}
	//nolint:errcheck // logging errors are non-critical
	fmt.Fprintf(l.out, "    %s\n", msg)
}

// Command logs a command being executed.
func (l *ConsoleLogger) Command(cmd string, args []string) {
	//nolint:errcheck // logging errors are non-critical
	fmt.Fprintf(l.out, "    [%s] %s\n", cmd, strings.Join(args, " "))
}

// Success logs a success message.
func (l *ConsoleLogger) Success(msg string) {
	//nolint:errcheck // logging errors are non-critical
	fmt.Fprintf(l.out, "    OK: %s\n", msg)
}

// Error logs an error message.
func (l *ConsoleLogger) Error(msg string, args ...any) {
	if len(args) > 0 {
		msg = fmt.Sprintf(msg, args...)
	}
	//nolint:errcheck // logging errors are non-critical
	fmt.Fprintf(l.err, "    ERROR: %s\n", msg)
}

// Detail logs a key-value detail line.
func (l *ConsoleLogger) Detail(key, value string) {
	//nolint:errcheck // logging errors are non-critical
	fmt.Fprintf(l.out, "    %s: %s\n", key, value)
}

// NopLogger is a no-op logger for testing.
type NopLogger struct{}

// Step implements Logger.
func (NopLogger) Step(_ string) {}

// Info implements Logger.
func (NopLogger) Info(_ string, _ ...any) {}

// Command implements Logger.
func (NopLogger) Command(_ string, _ []string) {}

// Success implements Logger.
func (NopLogger) Success(_ string) {}

// Error implements Logger.
func (NopLogger) Error(_ string, _ ...any) {}

// Detail implements Logger.
func (NopLogger) Detail(_, _ string) {}
