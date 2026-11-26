// Package logging gives each package a logr.Logger, from its context or the process logger. Only internal/kube uses the
// logging of controller-runtime, and it logs through the same logger.
package logging

import (
	"context"
	"fmt"
	"sync"

	"github.com/go-logr/logr"
	"github.com/go-logr/zapr"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	mu   sync.RWMutex
	base = logr.Discard()
)

// New makes the process logger. It is zap in development mode, which writes readable lines to stderr. wrap also
// receives each record, for example to send it through OpenTelemetry.
func New(wrap func(zapcore.Core) zapcore.Core) (logr.Logger, error) {
	config := zap.NewDevelopmentConfig()
	logger, err := config.Build(zap.WrapCore(wrap))
	if err != nil {
		return logr.Discard(), fmt.Errorf("build the logger: %w", err)
	}
	return zapr.NewLogger(logger), nil
}

// SetDefault sets the logger that FromContext returns for a context without one.
func SetDefault(logger logr.Logger) {
	mu.Lock()
	defer mu.Unlock()
	base = logger
}

func Default() logr.Logger {
	mu.RLock()
	defer mu.RUnlock()
	return base
}

// FromContext returns the logger in ctx, or the process's logger, with ctx as a value, so that its records carry the
// trace context of ctx.
func FromContext(ctx context.Context) logr.Logger {
	logger, err := logr.FromContext(ctx)
	if err != nil {
		logger = Default()
	}
	return logger.WithValues("ctx", ctx)
}

func IntoContext(ctx context.Context, logger logr.Logger) context.Context {
	return logr.NewContext(ctx, logger)
}

// Warn logs a WARN record, which logr has no level for, through the zap logger under logger. Any other logger gets
// an info record.
func Warn(logger logr.Logger, msg string, keysAndValues ...any) {
	if underlier, ok := logger.GetSink().(zapr.Underlier); ok {
		underlier.GetUnderlying().Sugar().Warnw(msg, keysAndValues...)
		return
	}
	logger.Info(msg, keysAndValues...)
}
