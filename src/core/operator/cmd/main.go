package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/metric/noop"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/core-operator/internal/auth"
	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/kube"
	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/runapi"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runs"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/telemetry"
)

const (
	telemetryShutdownTimeout = 5 * time.Second
	serverShutdownTimeout    = 20 * time.Second
	engineRequestTimeout     = 15 * time.Second
	readHeaderTimeout        = 10 * time.Second
	idleTimeout              = 2 * time.Minute
)

func main() {
	os.Exit(run())
}

func run() int {
	logger, err := logging.New(telemetry.WithOTelLogs)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	logging.SetDefault(logger)
	kube.SetLogger(logger)
	setupLog := logger.WithName("setup")
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	defer stop()

	otelShutdown, err := telemetry.ConfigureOTel(ctx)
	if err != nil {
		setupLog.Error(err, "unable to configure OTel")
		return 1
	}
	defer shutdownTelemetry(otelShutdown)

	cfg, err := config.Load()
	if err != nil {
		setupLog.Error(err, "unable to load the configuration")
		return 1
	}
	setupLog.Info("configuration loaded", "handlerGroups", cfg.HandlerGroups, "kinds", len(cfg.Kinds),
		"callers", len(cfg.Callers))

	cluster, err := newCluster(cfg, kube.Options{})
	if err != nil {
		setupLog.Error(err, "unable to connect to the cluster")
		return 1
	}
	// The operator runner calls have no client timeout. The execution deadline of a step limits the calls of that step.
	// The request of the caller limits an upload or a result that the operator forwards.
	// The client records no metrics, because they carry the pod IP, which is new for each run.
	noMetrics := otelhttp.WithMeterProvider(noop.NewMeterProvider())
	httpClient := &http.Client{Transport: otelhttp.NewTransport(withoutQuery{http.DefaultTransport}, noMetrics)}
	host := runner.NewClient(httpClient, runner.Port, cluster.Sandbox())
	if err = setup(cluster, cfg, clock.NewRealClock(), cluster.Sandbox(), host); err != nil {
		setupLog.Error(err, "unable to set up the operator")
		return 1
	}

	setupLog.Info("starting")
	if err = cluster.Start(ctx); err != nil {
		setupLog.Error(err, "problem running the operator")
		return 1
	}
	return 0
}

func shutdownTelemetry(shutdown func(context.Context) error) {
	ctx, cancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
	defer cancel()
	if err := shutdown(ctx); err != nil {
		logging.Default().Error(err, "unable to shut down OTel")
	}
}

// newCluster connects to the cluster, with a cache of the run Jobs and pods in the namespaces of the configured kinds.
func newCluster(cfg *config.Config, opts kube.Options) (*kube.Cluster, error) {
	opts.ProbeAddress = cfg.ProbeAddress
	opts.Namespaces = cfg.KindNamespaces()
	cluster, err := kube.New(opts)
	if err != nil {
		return nil, fmt.Errorf("set up the cluster: %w", err)
	}
	return cluster, nil
}

// setup adds the servers and the garbage collector of the enabled handler groups to the cluster.
func setup(cluster *kube.Cluster, cfg *config.Config, clk clock.Clock, box sandbox.Sandbox, host *runner.Client) error {
	authenticator := auth.NewAuthenticator(
		cluster.TokenReviewer(),
		clk,
		cfg.Audience,
		auth.Identities{Callers: cfg.CallerByServiceAccount, Engine: cfg.EngineServiceAccount},
	)

	var groups []callbacks.Group
	var onServe []func()
	if cfg.HandlerGroupEnabled(config.GroupRuns) {
		group, queue, err := setupRuns(cluster, cfg, clk, authenticator, box, host)
		if err != nil {
			return err
		}
		groups = append(groups, group)
		onServe = append(onServe, queue.Open)
	}

	router := callbacks.NewRouter(clk, groups...)
	callbackMux := http.NewServeMux()
	callbackMux.Handle("POST "+callbacks.PathPrefix, authenticator.RequireEngine(router))
	callbackServer := newServer("callbacks", cfg.CallbackAddress, callbackMux)
	callbackServer.onServe = onServe
	if err := cluster.Add(callbackServer); err != nil {
		return fmt.Errorf("add the callback server: %w", err)
	}
	return nil
}

func setupRuns(
	cluster *kube.Cluster,
	cfg *config.Config,
	clk clock.Clock,
	authenticator *auth.Authenticator,
	box sandbox.Sandbox,
	hostClient *runner.Client,
) (callbacks.Group, *runs.Queue, error) {
	engineClient := engine.NewClient(cfg.EngineURL, &http.Client{
		Transport: otelhttp.NewTransport(withoutQuery{http.DefaultTransport}),
		Timeout:   engineRequestTimeout,
	})
	queue := runs.NewQueue(cfg, box, clk)
	if err := runs.RegisterMetrics(queue); err != nil {
		return callbacks.Group{}, nil, fmt.Errorf("register run metrics: %w", err)
	}

	service := runs.NewService(cfg, queue, engineClient, hostClient, box, clk)
	api := runapi.New(service)
	if err := cluster.Add(newServer("api", cfg.APIAddress, authenticator.RequireCaller(api.Handler()))); err != nil {
		return callbacks.Group{}, nil, fmt.Errorf("add the run API server: %w", err)
	}
	if err := cluster.Add(runs.NewCollector(cfg, engineClient, box, clk)); err != nil {
		return callbacks.Group{}, nil, fmt.Errorf("add the garbage collector: %w", err)
	}
	return runs.NewSteps(queue, box, hostClient).Group(), queue, nil
}

// server is an HTTP server that the cluster starts after its cache is in sync.
type server struct {
	handler http.Handler
	name    string
	address string
	// onServe runs after the server listens.
	onServe []func()
}

func newServer(name, address string, handler http.Handler) *server {
	traced := otelhttp.NewHandler(handler, name, otelhttp.WithSpanNameFormatter(
		func(_ string, r *http.Request) string { return spanName(r.Method, r.URL.Path) },
	))
	return &server{name: name, address: address, handler: traced}
}

func (s *server) Start(ctx context.Context) error {
	logger := logging.FromContext(ctx).WithName(s.name)
	httpServer := &http.Server{
		Addr:              s.address,
		Handler:           s.handler,
		ReadHeaderTimeout: readHeaderTimeout,
		IdleTimeout:       idleTimeout,
		// Requests end when the cluster stops. A long poll then answers at once, and the engine retries an open
		// callback.
		BaseContext: func(net.Listener) context.Context { return logging.IntoContext(ctx, logger) },
	}
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(ctx, "tcp", s.address)
	if err != nil {
		return fmt.Errorf("listen for %s: %w", s.name, err)
	}
	logger.Info("listening", "address", s.address)
	for _, hook := range s.onServe {
		hook()
	}
	errs := make(chan error, 1)
	go func() {
		errs <- httpServer.Serve(listener)
	}()

	select {
	case err := <-errs:
		return fmt.Errorf("serve %s: %w", s.name, err)
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), serverShutdownTimeout)
		defer cancel()
		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shut down %s: %w", s.name, err)
		}
		return nil
	}
}

// spanName names a request span from the method and the route, as the semantic conventions do. It uses "HTTP" for a
// method that HTTP does not define, so that a client cannot put its own value in a span name.
func spanName(method, path string) string {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete,
		http.MethodConnect, http.MethodOptions, http.MethodTrace:
	default:
		method = "HTTP"
	}
	return strings.TrimSpace(method + " " + route(path))
}

// route gives the route of a path for span names, without run ids and command keys. A path that no route serves gets an
// empty name, so that no part of it gets into a span name.
func route(path string) string {
	if path == "/api/v1/kinds" || path == "/api/v1/runs" {
		return path
	}
	if run, ok := strings.CutPrefix(path, "/api/v1/runs/"); ok {
		switch _, tail, _ := strings.Cut(run, "/"); tail {
		case "":
			return "/api/v1/runs/{runId}"
		case "archive", "result", "cancel":
			return "/api/v1/runs/{runId}/" + tail
		}
		return ""
	}
	if strings.HasPrefix(path, callbacks.PathPrefix) {
		return callbacks.PathPrefix + "{commandKey}"
	}
	return ""
}

// withoutQuery keeps the query string out of url.full on the client span. otelhttp sets url.full before it calls this
// transport.
type withoutQuery struct{ next http.RoundTripper }

func (t withoutQuery) RoundTrip(r *http.Request) (*http.Response, error) {
	u := *r.URL
	u.RawQuery = ""
	trace.SpanFromContext(r.Context()).SetAttributes(semconv.URLFull(u.String()))
	return t.next.RoundTrip(r) //nolint:wrapcheck // A transport passes the error of the next transport on as it is.
}
