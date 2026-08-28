package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"altinn.studio/sandbox-node/internal/plugin"
)

func main() {
	os.Exit(run())
}

func run() int {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := plugin.New(logger).Run(ctx); err != nil {
		logger.ErrorContext(ctx, "KVM device plugin stopped", "error", err)

		return 1
	}

	return 0
}
