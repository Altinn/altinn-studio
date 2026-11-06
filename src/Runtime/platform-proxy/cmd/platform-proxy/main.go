// The platform proxy runs in each runtime cluster and forwards apps' requests to the Altinn Platform's APIs.
// It adds a platform access token, signed with the cluster's certificate, to each request that has none, so
// the platform can tell that a request comes from a runtime cluster without trusting where it comes from on
// the network.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"

	"altinn.studio/platform-proxy/internal/accesstoken"
	"altinn.studio/platform-proxy/internal/log"
	"altinn.studio/platform-proxy/internal/proxy"
	"altinn.studio/platform-proxy/internal/signingsecret"
	"altinn.studio/platform-proxy/internal/telemetry"
	"altinn.studio/platform-proxy/internal/telemetry/attr"
)

const (
	listenAddress = ":5040"
	livePath      = "/health/live"
	readyPath     = "/health/ready"
	// readinessDrainDelay is how long the proxy keeps serving after it is told to stop and reports itself not
	// ready, while Kubernetes and Linkerd stop sending it requests.
	readinessDrainDelay = 5 * time.Second
	// shutdownTimeout is how long requests in flight get to finish, such as uploads of large data elements.
	// The Deployment's terminationGracePeriodSeconds covers the drain delay, this and Linkerd's shutdown.
	shutdownTimeout = 45 * time.Second
	// telemetryShutdownTimeout bounds the flush of buffered telemetry at exit.
	telemetryShutdownTimeout = 5 * time.Second
)

func main() {
	logger := log.NewComponent("main")
	if err := run(logger); err != nil {
		logger.Error("The platform proxy failed", attr.Error, err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := readConfig()
	if err != nil {
		return err
	}

	shutdownTelemetry, err := telemetry.Configure(context.Background())
	if err != nil {
		return fmt.Errorf("start: %w", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
		defer cancel()
		if shutdownErr := shutdownTelemetry(ctx); shutdownErr != nil {
			logger.Warn("Failed to flush telemetry", attr.Error, shutdownErr)
		}
	}()

	kubeConfig, err := rest.InClusterConfig()
	if err != nil {
		return fmt.Errorf("configure the Kubernetes client: %w", err)
	}
	clientset, err := kubernetes.NewForConfig(kubeConfig)
	if err != nil {
		return fmt.Errorf("create the Kubernetes client: %w", err)
	}

	issuer := accesstoken.NewIssuer(cfg.serviceOwner)
	watcherCtx, stopWatcher := context.WithCancel(context.Background())
	defer stopWatcher()
	go signingsecret.NewWatcher(log.NewComponent("signingsecret"), clientset.CoreV1(), issuer).Run(watcherCtx)

	platformProxy, err := proxy.New(log.NewComponent("proxy"), cfg.upstream, issuer)
	if err != nil {
		return fmt.Errorf("start: %w", err)
	}

	var shuttingDown atomic.Bool
	server := &http.Server{
		Addr: listenAddress,
		Handler: handler(
			logger,
			platformProxy,
			func() bool { return issuer.Ready() && !shuttingDown.Load() },
		),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       2 * time.Minute,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelInfo),
	}
	listener, err := (&net.ListenConfig{}).Listen(context.Background(), "tcp", listenAddress)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	logger.Info(
		"Forwarding requests to the platform",
		attr.UpstreamAddress, cfg.upstream.String(),
		attr.ServiceOwner, cfg.serviceOwner,
	)
	serveErr := make(chan error, 1)
	go func() { serveErr <- server.Serve(listener) }()

	signals, stopSignals := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stopSignals()
	select {
	case err := <-serveErr:
		return fmt.Errorf("serve: %w", err)
	case <-signals.Done():
	}

	shuttingDown.Store(true)
	time.Sleep(readinessDrainDelay)
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Warn("Requests were still in flight when the platform proxy stopped", attr.Error, err)
	}
	return nil
}

// handler answers the probes, and passes every other request to the proxy. It does not use a ServeMux, which
// would redirect paths it considers unclean instead of forwarding them as the app sent them.
func handler(logger *slog.Logger, platformProxy http.Handler, ready func() bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case livePath:
			writeProbe(logger, w, r, true)
		case readyPath:
			// Not ready until the proxy can sign tokens, and no longer once it is stopping.
			writeProbe(logger, w, r, ready())
		default:
			platformProxy.ServeHTTP(w, r)
		}
	})
}

func writeProbe(logger *slog.Logger, w http.ResponseWriter, r *http.Request, ok bool) {
	status, body := http.StatusOK, "OK"
	if !ok {
		status, body = http.StatusServiceUnavailable, "Not ready"
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	if _, err := io.WriteString(w, body); err != nil {
		logger.InfoContext(r.Context(), "Failed to answer a probe", attr.Error, err)
	}
}
