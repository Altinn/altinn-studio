// Command runner-org-sync runs one reconcile cycle: discover orgs from the
// Altinn CDN, mint missing per-org Gitea runner registration tokens, delete
// Secrets for orgs that fell out of the desired set, and project the runners
// ConfigMap. It is designed to run as a Kubernetes CronJob; each invocation
// is a fresh pod that reads what it needs, performs the work, and exits.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"altinn.studio/runner-org-sync/internal/cdn"
	"altinn.studio/runner-org-sync/internal/config"
	"altinn.studio/runner-org-sync/internal/gitea"
	"altinn.studio/runner-org-sync/internal/k8sstate"
	"altinn.studio/runner-org-sync/internal/keyvault"
	"altinn.studio/runner-org-sync/internal/reconcile"
	"altinn.studio/runner-org-sync/internal/telemetry"
)

const (
	telemetryShutdownTimeout = 10 * time.Second
	serviceName              = "runner-org-sync"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err.Error())
		os.Exit(1)
	}
}

func run() error {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}

	tel, shutdown, err := telemetry.Init(ctx, serviceName)
	if err != nil {
		return fmt.Errorf("telemetry init: %w", err)
	}
	defer func() {
		sctx, scancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
		defer scancel()
		if err := shutdown(sctx); err != nil {
			slog.Warn("telemetry shutdown returned error", "err", err.Error())
		}
	}()

	metrics, err := telemetry.NewMetrics(tel.Meter)
	if err != nil {
		return fmt.Errorf("telemetry metrics: %w", err)
	}

	runID := uuid.NewString()
	logger := tel.Logger.With("run_id", runID, "service", serviceName)

	pat, patSource, err := loadPAT(ctx, cfg)
	if err != nil {
		return fmt.Errorf("load PAT: %w", err)
	}
	logger.Info("pat.loaded", "source", string(patSource), "len", len(pat))

	k8sClient, err := buildK8sClient()
	if err != nil {
		return fmt.Errorf("build kubernetes client: %w", err)
	}
	store := k8sstate.NewStore(k8sClient, cfg.OutputNamespace)
	giteaClient := gitea.NewClient(cfg.GiteaURL, pat)
	cdnClient := cdn.NewClient(cfg.OrgsJSONURL)

	rec, err := reconcile.New(reconcile.Options{
		Source:        cdnClient,
		Minter:        giteaClient,
		Store:         store,
		SecretNameFor: cfg.SecretNameFor,
		ConfigMapName: cfg.ConfigMapName,
		Whitelist:     cfg.WhitelistedOrgs,
		SyncAll:       cfg.SyncAll,
	})
	if err != nil {
		return fmt.Errorf("build reconciler: %w", err)
	}

	ctx, span := tel.Tracer.Start(ctx, "runner_org_sync.reconcile",
		trace.WithAttributes(attribute.String("run_id", runID)),
	)
	defer span.End()

	logger.Info("reconcile.start")
	start := time.Now()
	report, runErr := rec.Run(ctx)
	duration := time.Since(start)

	emitMetrics(ctx, metrics, report, duration)
	addSpanEvents(span, report)

	if len(report.Desired) > 0 {
		logger.Info("orgs.kept", "count", len(report.Desired), "orgs", report.Desired)
	}
	for _, f := range report.FailedOrgs {
		logger.Warn("org.reconcile.failed",
			"org", f.Org, "stage", f.Stage, "err", f.Err.Error())
	}

	logger.Info("reconcile.end",
		"duration_ms", duration.Milliseconds(),
		"outcome", string(report.Outcome),
		"discovered", report.Discovered,
		"desired", len(report.Desired),
		"created", len(report.SecretsCreated),
		"deleted", len(report.SecretsDeleted),
		"skipped", len(report.SecretsSkipped),
		"failed", len(report.FailedOrgs),
		"configmap_changed", report.ConfigMapChanged,
	)

	if runErr != nil {
		span.RecordError(runErr)
		span.SetStatus(codes.Error, runErr.Error())
		return runErr
	}
	if report.Outcome == reconcile.OutcomePartial {
		// Continue-on-partial: still exit 0; metric + WARN log carries the signal.
		span.SetStatus(codes.Ok, "partial")
	} else {
		span.SetStatus(codes.Ok, "success")
	}
	return nil
}

// loadPAT resolves the Gitea admin PAT, honouring the env-var override for
// local development. In-cluster it goes through Azure Key Vault using
// Workload Identity via DefaultAzureCredential.
func loadPAT(ctx context.Context, cfg config.Config) (string, keyvault.Source, error) {
	var getter keyvault.Getter
	if cfg.GiteaPATOverride == "" {
		g, err := keyvault.NewAzureGetter(cfg.KeyVaultName)
		if err != nil {
			return "", "", fmt.Errorf("build keyvault getter: %w", err)
		}
		getter = g
	}
	loader := keyvault.NewLoader(cfg.GiteaPATOverride, getter, cfg.KeyVaultSecretName)
	return loader.Load(ctx)
}

// buildK8sClient returns a clientset that prefers in-cluster config and
// falls back to a local kubeconfig (KUBECONFIG / $HOME/.kube/config) so a
// developer can run the binary directly against a kind cluster.
func buildK8sClient() (kubernetes.Interface, error) {
	if cfg, err := rest.InClusterConfig(); err == nil {
		return kubernetes.NewForConfig(cfg)
	} else if !errors.Is(err, rest.ErrNotInCluster) {
		return nil, fmt.Errorf("in-cluster config: %w", err)
	}
	loading := clientcmd.NewDefaultClientConfigLoadingRules()
	kubeCfg, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loading, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("local kubeconfig: %w", err)
	}
	return kubernetes.NewForConfig(kubeCfg)
}

func emitMetrics(ctx context.Context, m *telemetry.Metrics, r reconcile.Report, d time.Duration) {
	outcomeAttr := attribute.String("outcome", string(r.Outcome))
	m.ReconcileDuration.Record(ctx, d.Seconds(), metric.WithAttributes(outcomeAttr))
	m.ReconcileRuns.Add(ctx, 1, metric.WithAttributes(outcomeAttr))
	m.OrgsDiscovered.Record(ctx, int64(r.Discovered))
	m.OrgsDesired.Record(ctx, int64(len(r.Desired)))
	m.RecordFiltered(ctx, reconcile.FilterReasonNoEnv, len(r.FilteredNoEnv))
	m.RecordFiltered(ctx, reconcile.FilterReasonWhitelist, len(r.FilteredWhitelist))

	for _, org := range r.SecretsCreated {
		m.SecretsCreated.Add(ctx, 1, metric.WithAttributes(attribute.String("org", org)))
	}
	for _, org := range r.SecretsDeleted {
		m.SecretsDeleted.Add(ctx, 1, metric.WithAttributes(attribute.String("org", org)))
	}
	m.SecretsSkipped.Add(ctx, int64(len(r.SecretsSkipped)))

	for _, f := range r.FailedOrgs {
		m.OrgReconcileErrors.Add(ctx, 1, metric.WithAttributes(
			attribute.String("org", f.Org),
			attribute.String("stage", f.Stage),
		))
	}

	m.ConfigMapApplied.Add(ctx, 1, metric.WithAttributes(
		attribute.Bool("changed", r.ConfigMapChanged),
	))
}

func addSpanEvents(span trace.Span, r reconcile.Report) {
	for _, org := range r.SecretsCreated {
		span.AddEvent("org.secret.created", trace.WithAttributes(attribute.String("org", org)))
	}
	for _, org := range r.SecretsDeleted {
		span.AddEvent("org.secret.deleted", trace.WithAttributes(attribute.String("org", org)))
	}
	for _, org := range r.SecretsSkipped {
		span.AddEvent("org.skipped", trace.WithAttributes(attribute.String("org", org)))
	}
	for _, f := range r.FailedOrgs {
		span.AddEvent("org.reconcile.failed", trace.WithAttributes(
			attribute.String("org", f.Org),
			attribute.String("stage", f.Stage),
			attribute.String("err", f.Err.Error()),
		))
	}
}
