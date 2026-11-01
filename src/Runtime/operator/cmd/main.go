package main

import (
	"context"
	"crypto/tls"
	"errors"
	"flag"
	"fmt"
	"os"
	"time"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/webhook"

	"go.opentelemetry.io/otel/trace"
	uberzap "go.uber.org/zap"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal"
	"altinn.studio/operator/internal/appinventory"
	"altinn.studio/operator/internal/cnpgapi"
	"altinn.studio/operator/internal/controller/appcodesync"
	"altinn.studio/operator/internal/controller/azurekeyvaultsync"
	"altinn.studio/operator/internal/controller/cnpgsync"
	"altinn.studio/operator/internal/controller/grafanapolicysync"
	"altinn.studio/operator/internal/controller/inactivityscaler"
	"altinn.studio/operator/internal/controller/maskinporten"
	"altinn.studio/operator/internal/controller/secretsync"
	"altinn.studio/operator/internal/grafanaapi"
	"altinn.studio/operator/internal/operatorcontext"
	operatorruntime "altinn.studio/operator/internal/runtime"
	"altinn.studio/operator/internal/telemetry"
	// +kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

const (
	managerGracefulShutdownTimeout = 30 * time.Second
	telemetryShutdownTimeout       = 5 * time.Second
)

//nolint:gochecknoinits // Scheme registration follows controller-runtime/Kubebuilder conventions.
func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(resourcesv1alpha1.AddToScheme(scheme))
	utilruntime.Must(grafanaapi.AddToScheme(scheme))
	utilruntime.Must(helmv2.AddToScheme(scheme))
	utilruntime.Must(sourcev1.AddToScheme(scheme))
	utilruntime.Must(cnpgapi.AddToScheme(scheme))
	// +kubebuilder:scaffold:scheme
}

// exitAfterStartupFailure ends the startup span and flushes telemetry, so the error just logged
// is exported, before exiting. os.Exit skips deferred calls.
func exitAfterStartupFailure(span trace.Span, shutdown func(context.Context) error) {
	span.End()
	shutdownTelemetry(shutdown)
	os.Exit(1)
}

// registerClusterMetrics registers the gauges that describe the cluster rather than one controller:
// leader election, and the service owner's apps.
func registerClusterMetrics(operatorRuntime operatorruntime.Runtime, mgr ctrl.Manager) error {
	if err := telemetry.RegisterLeader(mgr.Elected()); err != nil {
		return fmt.Errorf("report leader election: %w", err)
	}
	if err := appinventory.RegisterCountMetric(operatorRuntime, mgr.GetClient()); err != nil {
		return fmt.Errorf("report the app count: %w", err)
	}
	return nil
}

// newManager loads the Kubernetes configuration with ctrl.GetConfig rather than GetConfigOrDie,
// which exits without flushing telemetry.
func newManager(options ctrl.Options) (ctrl.Manager, error) {
	restConfig, err := ctrl.GetConfig()
	if err != nil {
		return nil, fmt.Errorf("load the Kubernetes configuration: %w", err)
	}
	telemetry.WrapTransport(restConfig)
	mgr, err := ctrl.NewManager(restConfig, options)
	if err != nil {
		return nil, fmt.Errorf("create the manager: %w", err)
	}
	return mgr, nil
}

func shutdownTelemetry(shutdown func(context.Context) error) {
	ctx, cancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
	defer cancel()
	if err := shutdown(ctx); err != nil {
		setupLog.Error(err, "unable to shut down OTel")
	}
}

//nolint:funlen,gocyclo,gocognit,gocritic // Keeping Kubebuilder's scaffolded manager setup shape intact is more important here.
func main() {
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
	var secureMetrics bool
	var enableHTTP2 bool
	flag.StringVar(&metricsAddr, "metrics-bind-address", "0", "The address the metric endpoint binds to. "+
		"Use the port :8080. If not set, it will be 0 in order to disable the metrics server")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.BoolVar(&secureMetrics, "metrics-secure", false,
		"If set the metrics endpoint is served securely")
	flag.BoolVar(&enableHTTP2, "enable-http2", false,
		"If set, HTTP/2 will be enabled for the metrics and webhook servers")
	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts), zap.RawZapOpts(uberzap.WrapCore(telemetry.WithOTelLogs))))

	ctx := ctrl.SetupSignalHandler()

	// Set up OpenTelemetry.
	otelShutdown, err := telemetry.ConfigureOTel(ctx)
	if err != nil {
		setupLog.Error(err, "unable to configure OTel")
		os.Exit(1)
	}

	ctx, span := telemetry.Tracer().Start(ctx, "operator.Startup")

	rt, err := internal.NewRuntime(ctx, internal.WithLogger(&setupLog))
	if err != nil {
		setupLog.Error(err, "unable to initialize runtime")
		exitAfterStartupFailure(span, otelShutdown)
	}

	// Handle shutdown properly so nothing leaks.
	defer shutdownTelemetry(otelShutdown)

	// if the enable-http2 flag is false (the default), http/2 should be disabled
	// due to its vulnerabilities. More specifically, disabling http/2 will
	// prevent from being vulnerable to the HTTP/2 Stream Cancellation and
	// Rapid Reset CVEs. For more information see:
	// - https://github.com/advisories/GHSA-qppj-fm5r-hxr3
	// - https://github.com/advisories/GHSA-4374-p667-p6c8
	disableHTTP2 := func(c *tls.Config) {
		setupLog.Info("disabling http/2")
		c.NextProtos = []string{"http/1.1"}
	}

	tlsOpts := []func(*tls.Config){}
	if !enableHTTP2 {
		tlsOpts = append(tlsOpts, disableHTTP2)
	}

	webhookServer := webhook.NewServer(webhook.Options{
		TLSOpts: tlsOpts,
	})

	syncPeriod := time.Hour * 5
	const (
		leaderElectionLeaseDuration = 30 * time.Second
		leaderElectionRenewDeadline = 20 * time.Second
		leaderElectionRetryPeriod   = 5 * time.Second
	)
	managerCtx := telemetry.WithoutSpan(ctx)
	mgr, err := newManager(ctrl.Options{
		Scheme: scheme,
		Metrics: metricsserver.Options{
			BindAddress:   metricsAddr,
			SecureServing: secureMetrics,
			TLSOpts:       tlsOpts,
		},
		WebhookServer:          webhookServer,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "ec156e4c.altinn.studio",
		// Stretch the lease timings to reduce steady-state renewal chatter while
		// keeping multiple renewal attempts before leadership is lost.
		LeaseDuration:           ptr.To(leaderElectionLeaseDuration),
		RenewDeadline:           ptr.To(leaderElectionRenewDeadline),
		RetryPeriod:             ptr.To(leaderElectionRetryPeriod),
		GracefulShutdownTimeout: new(managerGracefulShutdownTimeout),
		BaseContext: func() context.Context {
			return managerCtx
		},
		Cache: cache.Options{
			// SyncPeriod will force additional reconciliations periodically
			SyncPeriod: &syncPeriod,
		},
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		exitAfterStartupFailure(span, otelShutdown)
	}

	if err = (maskinporten.NewReconciler(
		rt,
		mgr.GetClient(),
		mgr.GetScheme(),
		nil,
	)).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "MaskinportenClient")
		exitAfterStartupFailure(span, otelShutdown)
	}

	if err = secretsync.NewReconciler(rt, mgr.GetClient()).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "SecretSync")
		exitAfterStartupFailure(span, otelShutdown)
	}

	if err = appcodesync.NewReconciler(rt, mgr.GetClient()).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AppCodesSync")
		exitAfterStartupFailure(span, otelShutdown)
	}
	// +kubebuilder:scaffold:builder

	grafanaPolicySyncController := grafanapolicysync.NewReconciler(rt, mgr.GetClient())
	if err = mgr.Add(grafanaPolicySyncController); err != nil {
		setupLog.Error(err, "unable to add GrafanaPolicySync controller to manager")
		exitAfterStartupFailure(span, otelShutdown)
	}

	kvSyncController, err := azurekeyvaultsync.NewReconciler(
		ctx,
		rt,
		mgr.GetClient(),
	)
	if errors.Is(err, azurekeyvaultsync.ErrDisabledInLocalEnv) {
		kvSyncController = nil
	} else if err != nil {
		setupLog.Error(err, "unable to create KeyVaultSync controller")
		exitAfterStartupFailure(span, otelShutdown)
	}
	if kvSyncController != nil {
		if err = mgr.Add(kvSyncController); err != nil {
			setupLog.Error(err, "unable to add KeyVaultSync controller to manager")
			exitAfterStartupFailure(span, otelShutdown)
		}
	}

	cnpgSyncController := cnpgsync.NewReconciler(rt, mgr.GetClient())
	if err = mgr.Add(cnpgSyncController); err != nil {
		setupLog.Error(err, "unable to add CnpgSync controller to manager")
		exitAfterStartupFailure(span, otelShutdown)
	}

	if rt.GetOperatorContext().Environment != operatorcontext.EnvironmentProd {
		inactivityScalerController := inactivityscaler.NewReconciler(rt, mgr.GetClient(), mgr.GetAPIReader())
		if err = mgr.Add(inactivityScalerController); err != nil {
			setupLog.Error(err, "unable to add InactivityScaler controller to manager")
			exitAfterStartupFailure(span, otelShutdown)
		}
	} else {
		setupLog.Info("skipping InactivityScaler controller in prod")
	}

	if err = registerClusterMetrics(rt, mgr); err != nil {
		setupLog.Error(err, "unable to report the cluster's gauges")
		exitAfterStartupFailure(span, otelShutdown)
	}

	if err = mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		exitAfterStartupFailure(span, otelShutdown)
	}
	if err = mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		exitAfterStartupFailure(span, otelShutdown)
	}

	setupLog.Info("starting manager")
	span.End()
	err = mgr.Start(managerCtx)
	telemetry.EndLeadership()
	if err != nil {
		setupLog.Error(err, "problem running manager")
		// os.Exit skips the deferred shutdown, which would leave this error unexported.
		shutdownTelemetry(otelShutdown)
		os.Exit(1)
	}
}
