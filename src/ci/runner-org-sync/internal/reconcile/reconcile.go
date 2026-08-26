// Package reconcile implements the pure orchestration loop of
// runner-org-sync: fetch the org list, filter it, diff against the cluster,
// mint missing tokens, delete unwanted Secrets, and project the runners
// ConfigMap.
//
// The Reconciler depends on small interfaces and never imports OpenTelemetry
// or slog — observability is the caller's responsibility, driven by the
// Report returned from Run. This keeps unit tests free of any global setup.
package reconcile

import (
	"context"
	"errors"
	"fmt"
	"sort"

	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/yaml"

	"altinn.studio/runner-org-sync/internal/cdn"
	"altinn.studio/runner-org-sync/internal/gitea"
	"altinn.studio/runner-org-sync/internal/k8sclient"
)

var (
	errSourceRequired        = errors.New("reconcile: Source is required")
	errMinterRequired        = errors.New("reconcile: Minter is required")
	errStoreRequired         = errors.New("reconcile: Store is required")
	errSecretNameForRequired = errors.New("reconcile: SecretNameFor is required")
	errConfigMapNameRequired = errors.New("reconcile: ConfigMapName is required")
	errOrgSelectionRequired  = errors.New("reconcile: either SyncAll=true or a non-empty Whitelist is required")
	errInvalidRunnerSecret   = errors.New("registration secret exists but is not a valid runner token secret")
)

// Defaults used when the caller does not override.
const (
	ConfigMapDataKey      = "runners.yaml"
	FilterReasonNoEnv     = "no_environments"
	FilterReasonWhitelist = "not_in_whitelist"
)

// Failure stages, surfaced on Report.FailedOrgs[*].Stage.
const (
	StageValidate = "validate"
	StageMint     = "mint"
	StageCreate   = "create"
	StageDelete   = "delete"
)

// OrgSource produces the discovered org population (typically the CDN client).
type OrgSource interface {
	Fetch(ctx context.Context) ([]cdn.Org, error)
}

// TokenMinter produces a fresh registration token for an org. The
// implementation must be safe to call concurrently with itself; the
// Reconciler currently calls it serially, but that may change.
type TokenMinter interface {
	MintRegistrationToken(ctx context.Context, org string) (string, error)
}

// SecretStore is the cluster I/O surface the Reconciler needs.
type SecretStore interface {
	ListManagedSecrets(ctx context.Context) ([]corev1.Secret, error)
	RegistrationSecretStatus(ctx context.Context, name, org string) (k8sclient.RegistrationSecretState, error)
	CreateRegistrationSecret(ctx context.Context, name, org, token string) error
	DeleteSecret(ctx context.Context, name string) error
	ApplyConfigMap(ctx context.Context, name string, data map[string]string) (bool, error)
}

// Outcome summarises how a run ended.
type Outcome string

const (
	// OutcomeSuccess means the run completed without fatal or per-org errors.
	OutcomeSuccess Outcome = "success"
	// OutcomePartial means the run completed with one or more per-org errors.
	OutcomePartial Outcome = "partial"
	// OutcomeFailure means the run failed before producing a complete report.
	OutcomeFailure Outcome = "failure"
)

// OrgFailure records a single per-org error captured during reconciliation.
// It does not abort the run; the org is simply omitted from this tick's
// ConfigMap so the chart never references a Secret that does not exist.
type OrgFailure struct {
	Err   error
	Org   string
	Stage string
}

// Report is the structured result of a single Run. The caller derives all
// telemetry (logs, metrics, span events) from this value.
type Report struct {
	Outcome           Outcome
	FilteredNoEnv     []string
	FilteredWhitelist []string
	Desired           []string
	SecretsCreated    []string
	SecretsDeleted    []string
	SecretsSkipped    []string
	FailedOrgs        []OrgFailure
	Discovered        int
	ConfigMapChanged  bool
}

// Reconciler ties the dependencies together. Construct with New.
type Reconciler struct {
	source        OrgSource
	minter        TokenMinter
	store         SecretStore
	secretNameFor func(org string) string
	whitelist     map[string]struct{}
	configMapName string
	syncAll       bool
}

// Options configure a Reconciler. The zero value is invalid; all four
// dependency fields are required by New.
type Options struct {
	Source        OrgSource
	Minter        TokenMinter
	Store         SecretStore
	SecretNameFor func(org string) string
	ConfigMapName string
	Whitelist     []string // empty + SyncAll=false → error at construction
	SyncAll       bool
}

// New constructs a Reconciler from validated Options.
func New(opts Options) (*Reconciler, error) {
	switch {
	case opts.Source == nil:
		return nil, errSourceRequired
	case opts.Minter == nil:
		return nil, errMinterRequired
	case opts.Store == nil:
		return nil, errStoreRequired
	case opts.SecretNameFor == nil:
		return nil, errSecretNameForRequired
	case opts.ConfigMapName == "":
		return nil, errConfigMapNameRequired
	case !opts.SyncAll && len(opts.Whitelist) == 0:
		return nil, errOrgSelectionRequired
	}
	wl := make(map[string]struct{}, len(opts.Whitelist))
	for _, w := range opts.Whitelist {
		wl[w] = struct{}{}
	}
	return &Reconciler{
		source:        opts.Source,
		minter:        opts.Minter,
		store:         opts.Store,
		secretNameFor: opts.SecretNameFor,
		configMapName: opts.ConfigMapName,
		whitelist:     wl,
		syncAll:       opts.SyncAll,
	}, nil
}

// Run executes one full reconciliation cycle. It returns a non-nil error
// only for fatal failures (CDN unreachable, listing Secrets fails, applying
// the ConfigMap fails). Per-org failures are captured in Report.FailedOrgs;
// the function still returns nil error and Outcome=Partial so the CronJob
// exits zero and the next tick retries.
//
//nolint:gocognit,gocyclo,funlen // Reconcile flow is kept linear so partial/fatal handling stays visible.
func (r *Reconciler) Run(ctx context.Context) (Report, error) {
	report := Report{Outcome: OutcomeFailure}

	orgs, err := r.source.Fetch(ctx)
	if err != nil {
		return report, fmt.Errorf("reconcile: fetch orgs: %w", err)
	}
	report.Discovered = len(orgs)

	desired := r.filter(orgs, &report)
	report.Desired = orgCodes(desired)
	sort.Strings(report.Desired)

	existing, err := r.store.ListManagedSecrets(ctx)
	if err != nil {
		return report, fmt.Errorf("reconcile: list managed secrets: %w", err)
	}

	// For each desired org, ensure its Secret exists. Per-org failures are
	// recorded but do not abort the run.
	orgHasSecret := make(map[string]bool, len(desired))
	for _, org := range desired {
		name := r.secretNameFor(org.Code)
		status, statusErr := r.store.RegistrationSecretStatus(ctx, name, org.Code)
		if statusErr != nil {
			// The lookup hitting a transient apiserver error is fatal for
			// this run — without this lookup we cannot decide mint-or-skip.
			return report, fmt.Errorf("reconcile: check registration secret %s: %w", name, statusErr)
		}
		switch status {
		case k8sclient.RegistrationSecretValid:
			report.SecretsSkipped = append(report.SecretsSkipped, org.Code)
			orgHasSecret[org.Code] = true
			continue
		case k8sclient.RegistrationSecretInvalid:
			report.FailedOrgs = append(report.FailedOrgs, OrgFailure{
				Org:   org.Code,
				Stage: StageValidate,
				Err:   fmt.Errorf("%w: %s", errInvalidRunnerSecret, name),
			})
			continue
		case k8sclient.RegistrationSecretMissing:
		}
		token, tokenErr := r.minter.MintRegistrationToken(ctx, org.Code)
		if tokenErr != nil {
			// Auth failures hit every subsequent org with the same PAT —
			// fail fast instead of cascading the same root cause across
			// the whole desired set. K8s records the CronJob failure and
			// the next tick retries with whatever the latest PAT in KV is.
			if errors.Is(tokenErr, gitea.ErrUnauthorized) {
				return report, fmt.Errorf("reconcile: mint token for %s: %w", org.Code, tokenErr)
			}
			report.FailedOrgs = append(report.FailedOrgs, OrgFailure{Org: org.Code, Stage: StageMint, Err: tokenErr})
			continue
		}
		if createErr := r.store.CreateRegistrationSecret(ctx, name, org.Code, token); createErr != nil {
			report.FailedOrgs = append(report.FailedOrgs, OrgFailure{Org: org.Code, Stage: StageCreate, Err: createErr})
			continue
		}
		report.SecretsCreated = append(report.SecretsCreated, org.Code)
		orgHasSecret[org.Code] = true
	}

	// Delete Secrets we own whose org is no longer desired.
	desiredSet := make(map[string]struct{}, len(desired))
	for _, o := range desired {
		desiredSet[o.Code] = struct{}{}
	}
	for _, sec := range existing {
		org := k8sclient.OrgFromSecret(sec)
		if org == "" {
			// Defence in depth: a managed Secret missing the org label is a
			// drift signal; skip rather than delete on uncertain attribution.
			continue
		}
		if _, keep := desiredSet[org]; keep {
			continue
		}
		if deleteErr := r.store.DeleteSecret(ctx, sec.Name); deleteErr != nil {
			report.FailedOrgs = append(report.FailedOrgs, OrgFailure{Org: org, Stage: StageDelete, Err: deleteErr})
			continue
		}
		report.SecretsDeleted = append(report.SecretsDeleted, org)
	}

	// Project the ConfigMap from orgs whose Secret currently exists. This is
	// what guarantees the chart never points at a missing Secret: if a mint
	// failed earlier this run, the org silently drops out this tick.
	projected := make([]string, 0, len(desired))
	for _, o := range desired {
		if orgHasSecret[o.Code] {
			projected = append(projected, o.Code)
		}
	}
	sort.Strings(projected)
	sort.Strings(report.SecretsCreated)
	sort.Strings(report.SecretsDeleted)
	sort.Strings(report.SecretsSkipped)

	data := map[string]string{
		ConfigMapDataKey: renderRunners(projected, r.secretNameFor),
	}
	changed, err := r.store.ApplyConfigMap(ctx, r.configMapName, data)
	if err != nil {
		return report, fmt.Errorf("reconcile: apply configmap %s: %w", r.configMapName, err)
	}
	report.ConfigMapChanged = changed

	if len(report.FailedOrgs) > 0 {
		report.Outcome = OutcomePartial
	} else {
		report.Outcome = OutcomeSuccess
	}
	return report, nil
}

// filter applies the environments-non-empty and whitelist filters,
// recording filtered-out org codes in the report for visibility.
func (r *Reconciler) filter(orgs []cdn.Org, report *Report) []cdn.Org {
	out := make([]cdn.Org, 0, len(orgs))
	for _, o := range orgs {
		if len(o.Environments) == 0 {
			report.FilteredNoEnv = append(report.FilteredNoEnv, o.Code)
			continue
		}
		if !r.syncAll {
			if _, ok := r.whitelist[o.Code]; !ok {
				report.FilteredWhitelist = append(report.FilteredWhitelist, o.Code)
				continue
			}
		}
		out = append(out, o)
	}
	sort.Strings(report.FilteredNoEnv)
	sort.Strings(report.FilteredWhitelist)
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}

// renderRunners emits Helm values consumed by the gitea-org-runner-config
// HelmRelease via Flux valuesFrom. Determinism via sorted input is required
// so unchanged state produces unchanged output and ApplyConfigMap detects
// "no change" correctly.
//
// Replica count is deliberately omitted: scaling is owned by KEDA ScaledJobs
// on the consumer side, so a runner-org-sync-supplied replicas field would
// be ignored at best and misleading at worst.
func renderRunners(orgs []string, secretNameFor func(org string) string) string {
	runners := make([]runnerConfig, 0, len(orgs))
	for _, org := range orgs {
		runners = append(runners, runnerConfig{
			Name:                        org,
			RegistrationTokenSecretName: secretNameFor(org),
		})
	}
	out, err := yaml.Marshal(runnerValues{Runners: runners})
	if err != nil {
		// The input is a simple slice of strings rendered into a static struct;
		// yaml.Marshal should not fail. Keep an empty runner list if it ever
		// does, so the chart does not reference stale runners.
		return "runners: []\n"
	}
	return string(out)
}

type runnerValues struct {
	Runners []runnerConfig `json:"runners"`
}

type runnerConfig struct {
	Name                        string `json:"name"`
	RegistrationTokenSecretName string `json:"registrationTokenSecretName"`
}

func orgCodes(orgs []cdn.Org) []string {
	out := make([]string, 0, len(orgs))
	for _, o := range orgs {
		out = append(out, o.Code)
	}
	return out
}
