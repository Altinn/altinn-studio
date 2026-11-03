// Package logging gives each package a logr.Logger: the one in its context, or the process's logger. Only
// internal/kube uses the logging of controller-runtime, and it logs through the same logger.
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

// New makes the process's logger: zap in development mode, which writes readable lines to stderr, with each record
// also passed to wrap, such as to send it through OpenTelemetry.
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

// Default returns the process's logger.
func Default() logr.Logger {
	mu.RLock()
	defer mu.RUnlock()
	return base
}

// FromContext returns the logger in ctx, or the process's logger.
func FromContext(ctx context.Context) logr.Logger {
	if logger, err := logr.FromContext(ctx); err == nil {
		return logger
	}
	return Default()
}

// IntoContext returns a context with logger, which FromContext then returns.
func IntoContext(ctx context.Context, logger logr.Logger) context.Context {
	return logr.NewContext(ctx, logger)
}
