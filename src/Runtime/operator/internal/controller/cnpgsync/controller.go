package cnpgsync

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"altinn.studio/operator/internal/assert"
	rt "altinn.studio/operator/internal/runtime"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/diff"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	cnpgNamespace       = "runtime-cnpg"
	cnpgReleaseName     = "cnpg"
	cnpgRepoName        = "cnpg"
	cnpgRepoURL         = "https://cloudnative-pg.github.io/charts"
	cnpgChartName       = "cloudnative-pg"
	cnpgChartVersion    = "0.27.0"
	cnpgImageRepo       = "ghcr.io/cloudnative-pg/cloudnative-pg"
	proxyRegistryPrefix = "altinncr.azurecr.io/"
	defaultPollInterval = 5 * time.Minute
)

// +kubebuilder:rbac:groups=helm.toolkit.fluxcd.io,resources=helmreleases,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups=source.toolkit.fluxcd.io,resources=helmrepositories,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create

// CnpgSyncReconciler provisions CNPG operator via Flux HelmRelease for specified targets.
// Implements manager.Runnable and manager.LeaderElectionRunnable.
type CnpgSyncReconciler struct {
	logger    logr.Logger
	k8sClient client.Client
	runtime   rt.Runtime
	targets   []CnpgTarget
}

// NewReconciler creates a new CNPG sync controller.
func NewReconciler(
	runtime rt.Runtime,
	k8sClient client.Client,
) *CnpgSyncReconciler {
	return &CnpgSyncReconciler{
		logger:    log.FromContext(context.Background()).WithName("cnpgsync"),
		k8sClient: k8sClient,
		runtime:   runtime,
		targets:   DefaultTargets(),
	}
}

// NewReconcilerForTesting creates a reconciler with custom targets for testing.
func NewReconcilerForTesting(
	runtime rt.Runtime,
	k8sClient client.Client,
	targets []CnpgTarget,
) *CnpgSyncReconciler {
	return &CnpgSyncReconciler{
		logger:    log.FromContext(context.Background()).WithName("cnpgsync"),
		k8sClient: k8sClient,
		runtime:   runtime,
		targets:   targets,
	}
}

// NeedLeaderElection returns true to ensure only one instance runs.
func (r *CnpgSyncReconciler) NeedLeaderElection() bool {
	return true
}

// Start implements manager.Runnable. It runs the sync loop until ctx is cancelled.
func (r *CnpgSyncReconciler) Start(ctx context.Context) error {
	clock := r.runtime.GetClock()

	defer func() {
		r.logger.Info("exiting CnpgSync controller")
		assert.That(ctx.Err() != nil, "context should be cancelled when shutting down")
	}()

	r.logger.Info("starting CnpgSync controller",
		"pollInterval", defaultPollInterval,
		"targets", len(r.targets),
	)

	// Initial sync with retries
	for range 10 {
		if err := r.SyncAll(ctx); err != nil {
			r.logger.Error(err, "initial sync failed")
			select {
			case <-ctx.Done():
				return nil
			case <-clock.After(10 * time.Second):
				continue
			}
		}
		break
	}

	ticker := clock.NewTicker(defaultPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.Chan():
			if err := r.SyncAll(ctx); err != nil {
				r.logger.Error(err, "sync failed")
			}
		}
	}
}

// SyncAll synchronizes CNPG resources if current context matches any target.
func (r *CnpgSyncReconciler) SyncAll(ctx context.Context) error {
	tracer := r.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "cnpgsync.SyncAll",
		trace.WithAttributes(attribute.Int("targets", len(r.targets))),
	)
	defer span.End()

	opCtx := r.runtime.GetOperatorContext()
	if !r.isTargeted(opCtx.ServiceOwner.Id, opCtx.Environment) {
		r.logger.V(1).Info("current context not targeted, skipping",
			"serviceOwner", opCtx.ServiceOwner.Id,
			"environment", opCtx.Environment,
		)
		return nil
	}

	r.logger.Info("syncing CNPG resources",
		"serviceOwner", opCtx.ServiceOwner.Id,
		"environment", opCtx.Environment,
	)

	if err := r.ensureNamespace(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure namespace")
		return fmt.Errorf("ensure namespace: %w", err)
	}

	if err := r.ensureHelmRepository(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure HelmRepository")
		return fmt.Errorf("ensure HelmRepository: %w", err)
	}

	if err := r.ensureHelmRelease(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure HelmRelease")
		return fmt.Errorf("ensure HelmRelease: %w", err)
	}

	r.logger.Info("CNPG resources synced successfully")
	return nil
}

func (r *CnpgSyncReconciler) isTargeted(serviceOwnerId, environment string) bool {
	for _, t := range r.targets {
		if t.ServiceOwnerId == serviceOwnerId && t.Environment == environment {
			return true
		}
	}
	return false
}

func (r *CnpgSyncReconciler) ensureNamespace(ctx context.Context) error {
	ns := &corev1.Namespace{}
	err := r.k8sClient.Get(ctx, client.ObjectKey{Name: cnpgNamespace}, ns)
	if err == nil {
		return nil
	}
	if !apierrors.IsNotFound(err) {
		return fmt.Errorf("get namespace: %w", err)
	}

	ns = &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
		},
	}
	if err := r.k8sClient.Create(ctx, ns); err != nil {
		return fmt.Errorf("create namespace: %w", err)
	}
	r.logger.Info("created namespace", "namespace", cnpgNamespace)
	return nil
}

func (r *CnpgSyncReconciler) ensureHelmRepository(ctx context.Context) error {
	repo := &sourcev1.HelmRepository{}
	key := client.ObjectKey{Name: cnpgRepoName, Namespace: cnpgNamespace}
	err := r.k8sClient.Get(ctx, key, repo)

	desired := r.buildHelmRepository()

	if apierrors.IsNotFound(err) {
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("create HelmRepository: %w", err)
		}
		r.logger.Info("created HelmRepository", "name", cnpgRepoName)
		return nil
	}
	if err != nil {
		return fmt.Errorf("get HelmRepository: %w", err)
	}

	// Update if spec differs
	if repo.Spec.URL != desired.Spec.URL || repo.Spec.Interval != desired.Spec.Interval {
		repo.Spec = desired.Spec
		if err := r.k8sClient.Update(ctx, repo); err != nil {
			return fmt.Errorf("update HelmRepository: %w", err)
		}
		r.logger.Info("updated HelmRepository", "name", cnpgRepoName)
	}
	return nil
}

func (r *CnpgSyncReconciler) buildHelmRepository() *sourcev1.HelmRepository {
	return &sourcev1.HelmRepository{
		ObjectMeta: metav1.ObjectMeta{
			Name:      cnpgRepoName,
			Namespace: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
		},
		Spec: sourcev1.HelmRepositorySpec{
			URL:      cnpgRepoURL,
			Interval: metav1.Duration{Duration: time.Hour},
		},
	}
}

func (r *CnpgSyncReconciler) ensureHelmRelease(ctx context.Context) error {
	release := &helmv2.HelmRelease{}
	key := client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}
	err := r.k8sClient.Get(ctx, key, release)

	desired := r.buildHelmRelease()

	if apierrors.IsNotFound(err) {
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("create HelmRelease: %w", err)
		}
		r.logger.Info("created HelmRelease", "name", cnpgReleaseName)
		return nil
	}
	if err != nil {
		return fmt.Errorf("get HelmRelease: %w", err)
	}

	if diff.Diff(release.Spec, desired.Spec) != "" {
		// Update spec
		release.Spec = desired.Spec
		if err := r.k8sClient.Update(ctx, release); err != nil {
			return fmt.Errorf("update HelmRelease: %w", err)
		}
		r.logger.Info("updated HelmRelease", "name", cnpgReleaseName)
	}
	return nil
}

func (r *CnpgSyncReconciler) buildHelmRelease() *helmv2.HelmRelease {
	return &helmv2.HelmRelease{
		ObjectMeta: metav1.ObjectMeta{
			Name:      cnpgReleaseName,
			Namespace: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
		},
		Spec: helmv2.HelmReleaseSpec{
			Interval: metav1.Duration{Duration: time.Hour},
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart:   cnpgChartName,
					Version: cnpgChartVersion,
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind:      "HelmRepository",
						Name:      cnpgRepoName,
						Namespace: cnpgNamespace,
					},
				},
			},
			Values: r.buildHelmValues(),
		},
	}
}

func (r *CnpgSyncReconciler) buildHelmValues() *apiextensionsv1.JSON {
	var repository string
	if !r.runtime.GetOperatorContext().IsLocal() {
		repository = proxyRegistryPrefix + cnpgImageRepo
	} else {
		repository = cnpgImageRepo
	}
	values := map[string]any{
		"config": map[string]any{
			"clusterWide": false,
		},
		"image": map[string]any{
			"repository": repository,
		},
		"resources": map[string]any{
			"requests": map[string]any{
				"cpu":    "50m",
				"memory": "64Mi",
			},
		},
	}
	raw, _ := json.Marshal(values)
	return &apiextensionsv1.JSON{Raw: raw}
}
