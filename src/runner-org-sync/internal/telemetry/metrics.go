package telemetry

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// Metrics is the typed bundle of instruments emitted by runner-org-sync.
// Construct once at startup with NewMetrics; record from the run summary
// after Reconciler.Run returns.
type Metrics struct {
	ReconcileDuration  metric.Float64Histogram
	ReconcileRuns      metric.Int64Counter
	OrgsDiscovered     metric.Int64Gauge
	OrgsDesired        metric.Int64Gauge
	OrgsFiltered       metric.Int64Counter
	SecretsCreated     metric.Int64Counter
	SecretsDeleted     metric.Int64Counter
	SecretsSkipped     metric.Int64Counter
	OrgReconcileErrors metric.Int64Counter
	GiteaCallDuration  metric.Float64Histogram
	KeyVaultDuration   metric.Float64Histogram
	CDNCallDuration    metric.Float64Histogram
	ConfigMapApplied   metric.Int64Counter
}

// NewMetrics constructs every instrument from the supplied Meter. Returns
// an error if any instrument cannot be created; in practice this only fires
// on misconfigured SDKs.
func NewMetrics(m metric.Meter) (*Metrics, error) {
	mk := func(target *metric.Float64Histogram, name, desc, unit string) error {
		h, err := m.Float64Histogram(name, metric.WithDescription(desc), metric.WithUnit(unit))
		if err != nil {
			return fmt.Errorf("telemetry: histogram %s: %w", name, err)
		}
		*target = h
		return nil
	}
	mc := func(target *metric.Int64Counter, name, desc string) error {
		c, err := m.Int64Counter(name, metric.WithDescription(desc))
		if err != nil {
			return fmt.Errorf("telemetry: counter %s: %w", name, err)
		}
		*target = c
		return nil
	}
	mg := func(target *metric.Int64Gauge, name, desc string) error {
		g, err := m.Int64Gauge(name, metric.WithDescription(desc))
		if err != nil {
			return fmt.Errorf("telemetry: gauge %s: %w", name, err)
		}
		*target = g
		return nil
	}

	out := &Metrics{}
	if err := mk(&out.ReconcileDuration, "runner_org_sync.reconcile.duration", "End-to-end reconcile run duration.", "s"); err != nil {
		return nil, err
	}
	if err := mc(&out.ReconcileRuns, "runner_org_sync.reconcile.runs", "Reconcile run count by outcome."); err != nil {
		return nil, err
	}
	if err := mg(&out.OrgsDiscovered, "runner_org_sync.orgs.discovered", "Orgs returned by the CDN."); err != nil {
		return nil, err
	}
	if err := mg(&out.OrgsDesired, "runner_org_sync.orgs.desired", "Orgs after environment + whitelist filter."); err != nil {
		return nil, err
	}
	if err := mc(&out.OrgsFiltered, "runner_org_sync.orgs.filtered", "Orgs filtered out, by reason."); err != nil {
		return nil, err
	}
	if err := mc(&out.SecretsCreated, "runner_org_sync.secrets.created", "Per-org Secrets created this run."); err != nil {
		return nil, err
	}
	if err := mc(&out.SecretsDeleted, "runner_org_sync.secrets.deleted", "Per-org Secrets deleted this run."); err != nil {
		return nil, err
	}
	if err := mc(&out.SecretsSkipped, "runner_org_sync.secrets.skipped", "Per-org Secrets left untouched (already existed)."); err != nil {
		return nil, err
	}
	if err := mc(&out.OrgReconcileErrors, "runner_org_sync.org.reconcile_errors", "Per-org reconcile failures by stage."); err != nil {
		return nil, err
	}
	if err := mk(&out.GiteaCallDuration, "runner_org_sync.gitea.call.duration", "Gitea admin API call duration.", "s"); err != nil {
		return nil, err
	}
	if err := mk(&out.KeyVaultDuration, "runner_org_sync.keyvault.call.duration", "Azure Key Vault secret fetch duration.", "s"); err != nil {
		return nil, err
	}
	if err := mk(&out.CDNCallDuration, "runner_org_sync.cdn.call.duration", "CDN fetch duration for altinn-orgs.json.", "s"); err != nil {
		return nil, err
	}
	if err := mc(&out.ConfigMapApplied, "runner_org_sync.configmap.applied", "ConfigMap apply attempts by changed=true|false."); err != nil {
		return nil, err
	}
	return out, nil
}

// RecordFiltered increments OrgsFiltered with the given reason attribute.
func (m *Metrics) RecordFiltered(ctx context.Context, reason string, n int) {
	if n <= 0 {
		return
	}
	m.OrgsFiltered.Add(ctx, int64(n), metric.WithAttributes(attribute.String("reason", reason)))
}
