package main

import (
	"context"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	uberzap "go.uber.org/zap"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"

	"altinn.studio/core-operator/internal/auth"
	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/jobhost"
	"altinn.studio/core-operator/internal/runapi"
	"altinn.studio/core-operator/internal/runs"
	"altinn.studio/core-operator/internal/telemetry"
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

const (
	managerGracefulShutdownTimeout = 30 * time.Second
	telemetryShutdownTimeout       = 5 * time.Second
	serverShutdownTimeout          = 20 * time.Second
	engineRequestTimeout           = 15 * time.Second
	readHeaderTimeout              = 10 * time.Second
	idleTimeout                    = 2 * time.Minute
)

//nolint:gochecknoinits // Scheme registration in init follows the controller-runtime convention.
func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
}

func main() {
	os.Exit(run())
}

func run() int {
	var leaderElect bool
	flag.BoolVar(&leaderElect, "leader-elect", true,
		"Elect a leader, which runs the garbage collector. Turn it off only to run the operator outside a cluster.")
	opts := zap.Options{Development: true}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts), zap.RawZapOpts(uberzap.WrapCore(telemetry.WithOTelLogs))))
	ctx := ctrl.SetupSignalHandler()

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

	restConfig, err := ctrl.GetConfig()
	if err != nil {
		setupLog.Error(err, "unable to load the Kubernetes configuration")
		return 1
	}
	mgr, err := newManager(restConfig, cfg, leaderElect)
	if err != nil {
		setupLog.Error(err, "unable to create the manager")
		return 1
	}
	if err = setup(mgr, cfg, clock.NewRealClock()); err != nil {
		setupLog.Error(err, "unable to set up the operator")
		return 1
	}

	setupLog.Info("starting manager")
	err = mgr.Start(ctx)
	telemetry.EndLeadership()
	if err != nil {
		setupLog.Error(err, "problem running manager")
		return 1
	}
	return 0
}

func shutdownTelemetry(shutdown func(context.Context) error) {
	ctx, cancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
	defer cancel()
	if err := shutdown(ctx); err != nil {
		setupLog.Error(err, "unable to shut down OTel")
	}
}

// newManager sets up a manager whose cache holds only the operator's own Jobs and pods, in the namespaces of the
// configured kinds. The operator's Role in those namespaces allows no more.
func newManager(restConfig *rest.Config, cfg *config.Config, leaderElect bool) (ctrl.Manager, error) {
	// Without kinds, as in staging, nothing reads Jobs or pods, so the cache starts no informer for them.
	managed := labels.SelectorFromSet(labels.Set{runs.LabelManagedBy: runs.ManagedBy})
	byObject := make(map[client.Object]cache.ByObject)
	if kindNamespaces := cfg.KindNamespaces(); len(kindNamespaces) > 0 {
		namespaces := make(map[string]cache.Config, len(kindNamespaces))
		for _, namespace := range kindNamespaces {
			namespaces[namespace] = cache.Config{}
		}
		byObject[&batchv1.Job{}] = cache.ByObject{Label: managed, Namespaces: namespaces}
		byObject[&corev1.Pod{}] = cache.ByObject{Label: managed, Namespaces: namespaces}
	}

	const (
		leaseDuration = 30 * time.Second
		renewDeadline = 20 * time.Second
		retryPeriod   = 5 * time.Second
	)
	mgr, err := ctrl.NewManager(restConfig, ctrl.Options{
		Scheme:                        scheme,
		Metrics:                       metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress:        cfg.ProbeAddress,
		LeaderElection:                leaderElect,
		LeaderElectionID:              "core-operator.altinn.studio",
		LeaderElectionReleaseOnCancel: true,
		LeaseDuration:                 new(leaseDuration),
		RenewDeadline:                 new(renewDeadline),
		RetryPeriod:                   new(retryPeriod),
		GracefulShutdownTimeout:       new(managerGracefulShutdownTimeout),
		Cache:                         cache.Options{ByObject: byObject},
	})
	if err != nil {
		return nil, fmt.Errorf("create the manager: %w", err)
	}
	return mgr, nil
}

// setup adds the servers and the garbage collector of the enabled handler groups to the manager.
func setup(mgr ctrl.Manager, cfg *config.Config, clk clock.Clock) error {
	authenticator := auth.NewAuthenticator(
		auth.KubernetesReviewer{Client: mgr.GetClient()},
		clk,
		cfg.Audience,
		auth.Identities{Callers: cfg.CallerByServiceAccount, Engine: cfg.EngineServiceAccount},
	)

	var groups []callbacks.Group
	var onServe []func()
	if cfg.HandlerGroupEnabled(config.GroupRuns) {
		group, queue, err := setupRuns(mgr, cfg, clk, authenticator)
		if err != nil {
			return err
		}
		groups = append(groups, group)
		onServe = append(onServe, queue.Open)
	}

	router := callbacks.NewRouter(clk, groups...)
	callbackMux := http.NewServeMux()
	callbackMux.Handle("POST "+callbacks.PathPrefix, authenticator.RequireEngine(router))
	// The manager starts the servers once its cache has synced. The queue's warmup starts with the callbacks, since
	// the engine's retries reach the queue only from then.
	callbackServer := newServer("callbacks", cfg.CallbackAddress, callbackMux)
	callbackServer.onServe = onServe
	if err := mgr.Add(callbackServer); err != nil {
		return fmt.Errorf("add the callback server: %w", err)
	}

	if err := telemetry.RegisterLeader(mgr.Elected()); err != nil {
		return fmt.Errorf("report leader election: %w", err)
	}
	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		return fmt.Errorf("add health check: %w", err)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		return fmt.Errorf("add ready check: %w", err)
	}
	return nil
}

func setupRuns(
	mgr ctrl.Manager,
	cfg *config.Config,
	clk clock.Clock,
	authenticator *auth.Authenticator,
) (callbacks.Group, *runs.Queue, error) {
	engineClient := engine.NewClient(cfg.EngineURL, &http.Client{
		Transport: otelhttp.NewTransport(http.DefaultTransport),
		Timeout:   engineRequestTimeout,
	})
	// The job host calls have no client timeout. Each step's execution deadline bounds the steps' calls, and the
	// caller's request bounds an upload or a result that the operator passes on.
	hostClient := jobhost.NewClient(&http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)}, jobhost.Port)
	kube := &runs.Kube{Client: mgr.GetClient(), Reader: mgr.GetAPIReader()}
	queue := runs.NewQueue(clk)
	if err := runs.RegisterMetrics(queue); err != nil {
		return callbacks.Group{}, nil, fmt.Errorf("register run metrics: %w", err)
	}

	service := runs.NewService(cfg, queue, engineClient, hostClient, kube, clk)
	api := runapi.New(service)
	if err := mgr.Add(newServer("api", cfg.APIAddress, authenticator.RequireCaller(api.Handler()))); err != nil {
		return callbacks.Group{}, nil, fmt.Errorf("add the run API server: %w", err)
	}
	if err := mgr.Add(runs.NewCollector(cfg, engineClient, kube, clk)); err != nil {
		return callbacks.Group{}, nil, fmt.Errorf("add the garbage collector: %w", err)
	}
	return runs.NewSteps(cfg, queue, kube, hostClient, clk).Group(), queue, nil
}

// server is an HTTP server that the manager starts on every replica, also before leader election.
type server struct {
	handler http.Handler
	name    string
	address string
	// onServe runs once the server listens.
	onServe []func()
}

func newServer(name, address string, handler http.Handler) *server {
	traced := otelhttp.NewHandler(handler, name, otelhttp.WithSpanNameFormatter(
		func(_ string, r *http.Request) string { return r.Method + " " + route(r.URL.Path) },
	))
	return &server{name: name, address: address, handler: traced}
}

func (s *server) NeedLeaderElection() bool {
	return false
}

func (s *server) Start(ctx context.Context) error {
	logger := log.FromContext(ctx).WithName(s.name)
	httpServer := &http.Server{
		Addr:              s.address,
		Handler:           s.handler,
		ReadHeaderTimeout: readHeaderTimeout,
		IdleTimeout:       idleTimeout,
		// Requests end with the manager, so a long poll answers at once and a callback in flight is retried by the
		// engine.
		BaseContext: func(net.Listener) context.Context { return log.IntoContext(ctx, logger) },
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

// route names the route of a path for span names, with run ids and command keys left out.
func route(path string) string {
	if run, ok := strings.CutPrefix(path, "/api/v1/runs/"); ok {
		if _, tail, found := strings.Cut(run, "/"); found {
			return "/api/v1/runs/{runId}/" + tail
		}
		return "/api/v1/runs/{runId}"
	}
	if strings.HasPrefix(path, callbacks.PathPrefix) {
		return callbacks.PathPrefix + "{commandKey}"
	}
	return path
}
