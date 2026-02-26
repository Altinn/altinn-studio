package assert

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"runtime"
	"time"

	"altinn.studio/pdf3/internal/log"
	"go.opentelemetry.io/otel"
)

var logger *slog.Logger = log.NewComponent("assert")

func That(condition bool, message string, args ...any) {
	if !condition {
		panicking(message, args...)
	}
}

//go:noinline
func panicking(message string, userArgs ...any) {
	buf := make([]byte, 1<<16)
	n := runtime.Stack(buf, false)
	stackTrace := string(buf[:n])

	var args []any
	if message != "" {
		args = make([]any, 0, 2+len(userArgs))
		args = append(args, "message", message)
	} else {
		args = make([]any, 0, len(userArgs))
	}
	args = append(args, userArgs...)
	logger.Error("Assertion failed:", args...)
	_, _ = fmt.Fprintln(os.Stderr, stackTrace)
	flushOTel()
	os.Exit(1)
}

func flushOTel() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if tp, ok := otel.GetTracerProvider().(interface{ ForceFlush(context.Context) error }); ok {
		_ = tp.ForceFlush(ctx)
	}
	if mp, ok := otel.GetMeterProvider().(interface{ ForceFlush(context.Context) error }); ok {
		_ = mp.ForceFlush(ctx)
	}
}
