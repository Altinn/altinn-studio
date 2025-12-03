package main

import (
	"context"
	"crypto/tls"
	"errors"
	"flag"
	"os"
	"time"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.

	"go.opentelemetry.io/otel"
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/webhook"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal"
	"altinn.studio/operator/internal/controller/azurekeyvaultsync"
	"altinn.studio/operator/internal/controller/maskinporten"
	"altinn.studio/operator/internal/telemetry"
	// +kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(resourcesv1alpha1.AddToScheme(scheme))
	// +kubebuilder:scaffold:scheme
}

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

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	ctx := ctrl.SetupSignalHandler()

	// Set up OpenTelemetry.
	otelShutdown, err := telemetry.ConfigureOTel(ctx)
	if err != nil {
		setupLog.Error(err, "unable to configure OTel")
		os.Exit(1)
	}

	ctx, span := otel.Tracer(telemetry.ServiceName).Start(ctx, "Main")

	rt, err := internal.NewRuntime(ctx, "", &setupLog)
	if err != nil {
		setupLog.Error(err, "unable to initialize runtime")
		span.End()
		os.Exit(1)
	}

	// Handle shutdown properly so nothing leaks.
	defer func() {
		err = errors.Join(err, otelShutdown(context.Background()))
	}()

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

	restConfig := ctrl.GetConfigOrDie()
	telemetry.WrapTransport(restConfig)
	syncPeriod := time.Hour * 5
	mgr, err := ctrl.NewManager(restConfig, ctrl.Options{
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
		// LeaderElectionReleaseOnCancel defines if the leader should step down voluntarily
		// when the Manager ends. This requires the binary to immediately end when the
		// Manager is stopped, otherwise, this setting is unsafe. Setting this significantly
		// speeds up voluntary leader transitions as the new leader don't have to wait
		// LeaseDuration time first.
		//
		// In the default scaffold provided, the program ends immediately after
		// the manager stops, so would be fine to enable this option. However,
		// if you are doing or is intended to do any operation such as perform cleanups
		// after the manager stops then its usage might be unsafe.
		// LeaderElectionReleaseOnCancel: true,

		Cache: cache.Options{
			// SyncPeriod will force additional reconciliations periodically
			SyncPeriod: &syncPeriod,
		},
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		span.End()
		os.Exit(1)
	}

	if err = (maskinporten.NewReconciler(
		rt,
		mgr.GetClient(),
		mgr.GetScheme(),
		nil,
	)).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "MaskinportenClient")
		span.End()
		os.Exit(1)
	}
	// +kubebuilder:scaffold:builder

	kvSyncController, err := azurekeyvaultsync.NewReconciler(
		ctx,
		mgr.GetClient(),
		rt.GetConfigMonitor(),
		rt.GetOperatorContext().Environment,
	)
	if err != nil {
		setupLog.Error(err, "unable to create KeyVaultSync controller")
		span.End()
		os.Exit(1)
	}
	if kvSyncController != nil {
		if err = mgr.Add(kvSyncController); err != nil {
			setupLog.Error(err, "unable to add KeyVaultSync controller to manager")
			span.End()
			os.Exit(1)
		}
	}

	if err = mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		span.End()
		os.Exit(1)
	}
	if err = mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		span.End()
		os.Exit(1)
	}

	setupLog.Info("starting manager")
	span.End()

	if err = mgr.Start(ctx); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}
