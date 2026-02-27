// Package main is the executable entrypoint for kubernetes-wrapper.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"altinn.studio/kubernetes-wrapper/internal/api"
	"altinn.studio/kubernetes-wrapper/internal/config"
	"altinn.studio/kubernetes-wrapper/internal/kube"
	otelcfg "altinn.studio/kubernetes-wrapper/internal/otel"

	"k8s.io/client-go/kubernetes"
)

const (
	serverReadHeaderTimeout = 10 * time.Second
	otelShutdownTimeout     = 5 * time.Second
	serverShutdownTimeout   = 15 * time.Second
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("kubernetes-wrapper exited with error", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.ReadFromEnv()
	if err != nil {
		return fmt.Errorf("read configuration: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	otelShutdown, err := otelcfg.Configure(ctx, cfg.OtelServiceName)
	if err != nil {
		return fmt.Errorf("configure OpenTelemetry: %w", err)
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), otelShutdownTimeout)
		defer cancel()
		shutdownErr := otelShutdown(shutdownCtx)
		if shutdownErr != nil {
			logger.Error("failed shutting down OpenTelemetry", "error", shutdownErr)
		}
	}()

	restConfig, err := kube.NewRESTConfig(cfg.Kubeconfig)
	if err != nil {
		return fmt.Errorf("build kubernetes rest config: %w", err)
	}

	kube.WrapTransportWithTelemetry(restConfig)
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("create kubernetes client: %w", err)
	}

	resourceCache := kube.NewResourceCache(clientset, cfg.Namespace)
	if err = resourceCache.Start(ctx); err != nil {
		return fmt.Errorf("start informer cache: %w", err)
	}

	handler := api.NewHandler(api.HandlerOptions{
		ResourceCache: resourceCache,
		Logger:        logger,
		Development:   cfg.Development,
	})

	var server http.Server
	server.Addr = cfg.ListenAddress
	server.Handler = handler
	server.ReadHeaderTimeout = serverReadHeaderTimeout

	go func() {
		logger.Info("starting http server", "addr", cfg.ListenAddress)
		listenErr := server.ListenAndServe()
		if listenErr != nil && !errors.Is(listenErr, http.ErrServerClosed) {
			logger.Error("http server exited unexpectedly", "error", listenErr)
			stop()
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), serverShutdownTimeout)
	defer cancel()
	if err = server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown http server: %w", err)
	}

	return nil
}
