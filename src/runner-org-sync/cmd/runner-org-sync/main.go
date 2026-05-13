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

	shutdown, err := telemetry.ConfigureOTel(ctx, serviceName)
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

	metrics, err := telemetry.NewMetrics()
	if err != nil {
		return fmt.Errorf("telemetry metrics: %w", err)
	}

	runID := uuid.NewString()
	logger := slog.With("run_id", runID, "service", serviceName)

	pat, patSource, err := loadSecretFromKV(ctx, cfg.GiteaPATOverride, cfg.KeyVaultName, cfg.KeyVaultSecretName)
	if err != nil {
		return fmt.Errorf("load admin PAT: %w", err)
	}
	logger.Info("pat.loaded", "scope", "admin", "source", string(patSource), "len", len(pat))

	kedaPAT, kedaPATSource, err := loadSecretFromKV(ctx, cfg.KedaPATOverride, cfg.KeyVaultName, cfg.KedaPATKeyVaultSecretName)
	if err != nil {
		return fmt.Errorf("load KEDA PAT: %w", err)
	}
	logger.Info("pat.loaded", "scope", "keda", "source", string(kedaPATSource), "len", len(kedaPAT))

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

	ctx, span := telemetry.Tracer().Start(ctx, "runner_org_sync.reconcile",
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

	// Independent of the per-org reconcile — runs even when its outcome is
	// "partial" because the KEDA Secret has its own lifecycle. Failure is
	// non-fatal: logged + counted, but the CronJob still exits 0 so the
	// next tick retries.
	applyKedaSecret(ctx, store, cfg, kedaPAT, metrics, logger)

	if report.Outcome == reconcile.OutcomePartial {
		// Continue-on-partial: still exit 0; metric + WARN log carries the signal.
		span.SetStatus(codes.Ok, "partial")
	} else {
		span.SetStatus(codes.Ok, "success")
	}
	return nil
}

// loadSecretFromKV resolves a single Key Vault secret, honouring an env-var
// override for local development. When override is non-empty it
// short-circuits without constructing the Azure SDK client; otherwise it
// fetches from KV via Workload Identity (DefaultAzureCredential). Generic
// over the value type — used today for the two Gitea PATs; any other
// KV-stored credential could reuse it.
func loadSecretFromKV(ctx context.Context, override, vaultName, vaultSecretName string) (string, keyvault.Source, error) {
	var getter keyvault.Getter
	if override == "" {
		g, err := keyvault.NewAzureGetter(vaultName)
		if err != nil {
			return "", "", fmt.Errorf("build keyvault getter: %w", err)
		}
		getter = g
	}
	loader := keyvault.NewLoader(override, getter, vaultSecretName)
	return loader.Load(ctx)
}

// applyKedaSecret writes the KEDA read-only PAT into a single-key Opaque
// Secret in the output namespace and emits its own metric / span event /
// log line. Separated from the per-org reconcile because it has an
// independent lifecycle (sourced from KV, not from Gitea) and an
// independent failure model (non-fatal — next tick retries).
func applyKedaSecret(
	ctx context.Context,
	store *k8sstate.Store,
	cfg config.Config,
	value string,
	metrics *telemetry.Metrics,
	logger *slog.Logger,
) {
	span := trace.SpanFromContext(ctx)
	changed, err := store.ApplyOpaqueSecret(ctx, cfg.KedaPATSecretName, cfg.KedaPATSecretKey, value)
	metrics.KedaSecretApplied.Add(ctx, 1, metric.WithAttributes(
		attribute.Bool("changed", changed),
		attribute.Bool("success", err == nil),
	))
	if err != nil {
		logger.Warn("keda.secret.apply.failed", "err", err.Error(), "secret", cfg.KedaPATSecretName)
		span.AddEvent("keda.secret.apply.failed", trace.WithAttributes(
			attribute.String("secret", cfg.KedaPATSecretName),
			attribute.String("err", err.Error()),
		))
		return
	}
	span.AddEvent("keda.secret.applied", trace.WithAttributes(
		attribute.String("secret", cfg.KedaPATSecretName),
		attribute.Bool("changed", changed),
	))
	logger.Info("keda.secret.applied", "secret", cfg.KedaPATSecretName, "changed", changed)
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
