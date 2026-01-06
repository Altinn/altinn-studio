package cnpgsync

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/operatorcontext"
	rt "altinn.studio/operator/internal/runtime"
	cnpgv1 "github.com/cloudnative-pg/cloudnative-pg/api/v1"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/diff"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	cnpgNamespace       = "runtime-cnpg"
	cnpgReleaseName     = "cnpg"
	cnpgRepoName        = "cnpg"
	cnpgRepoURL         = "https://cloudnative-pg.github.io/charts"
	cnpgChartName       = "cloudnative-pg"
	cnpgImageRepo       = "ghcr.io/cloudnative-pg/cloudnative-pg"
	proxyRegistryPrefix = "altinncr.azurecr.io/"
	defaultPollInterval = 5 * time.Minute
	shortPollInterval   = 10 * time.Second

	clusterName         = "pg-apps-cluster"
	imageCatalogName    = "pg-images"
	postgresqlImageRepo = "ghcr.io/cloudnative-pg/postgresql"
	storageClassName    = "cnpg-premium-v2"

	postgresqlJsonKey        = "postgresql.json"
	maxUpdateRetries         = 3
	passwordSecretNameFormat = "pg-apps-cluster-%s-password"
	databaseNameFormat       = "db-%s"

	connectionsPerApp   = 40
	reservedConnections = 3  // superuser_reserved_connections
	adminConnections    = 10 // buffer for admin/monitoring
	minBaseConnections  = 50 // minimum even with 0 apps
)

const cnpgChartVersion = "0.27.0"

var postgresqlImageTags = map[int]string{
	17: "17.7-standard-trixie",
	18: "18.1-standard-trixie",
}
var supportedPostgresqlMajorVersions = []int{17, 18}

func (r *CnpgSyncReconciler) getImageRef(major int) (string, error) {
	tag, ok := postgresqlImageTags[major]
	if !ok {
		return "", fmt.Errorf("unsupported PostgreSQL major version: %d", major)
	}
	imageRef := postgresqlImageRepo + ":" + tag
	if !r.runtime.GetOperatorContext().IsLocal() {
		imageRef = proxyRegistryPrefix + imageRef
	}
	return imageRef, nil
}

// +kubebuilder:rbac:groups=helm.toolkit.fluxcd.io,resources=helmreleases,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups=source.toolkit.fluxcd.io,resources=helmrepositories,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;delete
// +kubebuilder:rbac:groups=storage.k8s.io,resources=storageclasses,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups=postgresql.cnpg.io,resources=clusters,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups=postgresql.cnpg.io,resources=imagecatalogs,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups=postgresql.cnpg.io,resources=databases,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update

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
		needsRetry, err := r.SyncAll(ctx)
		if err != nil {
			r.logger.Error(err, "initial sync failed")
			select {
			case <-ctx.Done():
				return nil
			case <-clock.After(10 * time.Second):
				continue
			}
		}
		if !needsRetry {
			break
		}
		select {
		case <-ctx.Done():
			return nil
		case <-clock.After(shortPollInterval):
		}
	}

	ticker := clock.NewTicker(defaultPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.Chan():
			needsRetry, err := r.SyncAll(ctx)
			if err != nil {
				r.logger.Error(err, "sync failed")
			}
			if needsRetry {
				ticker.Reset(shortPollInterval)
			} else {
				ticker.Reset(defaultPollInterval)
			}
		}
	}
}

// SyncAll synchronizes CNPG resources if current context matches any target.
// Returns needsRetry=true when HelmRelease is not ready yet.
func (r *CnpgSyncReconciler) SyncAll(ctx context.Context) (needsRetry bool, err error) {
	tracer := r.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "cnpgsync.SyncAll",
		trace.WithAttributes(attribute.Int("targets", len(r.targets))),
	)
	defer span.End()

	opCtx := r.runtime.GetOperatorContext()
	if !r.isTargeted(opCtx.ServiceOwner.Id, opCtx.Environment) {
		r.logger.V(1).Info("current context not targeted, cleaning up",
			"serviceOwner", opCtx.ServiceOwner.Id,
			"environment", opCtx.Environment,
		)
		if err := r.deleteNamespaceIfExists(ctx); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, "failed to delete namespace")
			return false, fmt.Errorf("delete namespace: %w", err)
		}
		return false, nil
	}

	r.logger.Info("syncing CNPG resources",
		"serviceOwner", opCtx.ServiceOwner.Id,
		"environment", opCtx.Environment,
	)

	if err := r.ensureNamespace(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure namespace")
		return false, fmt.Errorf("ensure namespace: %w", err)
	}

	if err := r.ensureStorageClass(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure StorageClass")
		return false, fmt.Errorf("ensure StorageClass: %w", err)
	}

	if err := r.ensureHelmRepository(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure HelmRepository")
		return false, fmt.Errorf("ensure HelmRepository: %w", err)
	}

	if err := r.ensureHelmRelease(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure HelmRelease")
		return false, fmt.Errorf("ensure HelmRelease: %w", err)
	}

	ready, err := r.isHelmReleaseReady(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to check HelmRelease readiness")
		return false, fmt.Errorf("check HelmRelease readiness: %w", err)
	}
	if !ready {
		r.logger.Info("HelmRelease not ready, will retry shortly")
		return true, nil
	}

	if err := r.ensureImageCatalog(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure ImageCatalog")
		return false, fmt.Errorf("ensure ImageCatalog: %w", err)
	}

	if err := r.ensureCluster(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure Cluster")
		return false, fmt.Errorf("ensure Cluster: %w", err)
	}

	if err := r.cleanupRemovedApps(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to cleanup removed apps")
		return false, fmt.Errorf("cleanup removed apps: %w", err)
	}

	dbNeedsRetry, err := r.ensureAppDatabases(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure app databases")
		return false, fmt.Errorf("ensure app databases: %w", err)
	}
	if dbNeedsRetry {
		needsRetry = true
	}

	if err := r.syncDatabaseSecrets(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to sync database secrets")
		return false, fmt.Errorf("sync database secrets: %w", err)
	}

	r.logger.Info("CNPG resources synced successfully")
	return needsRetry, nil
}

func (r *CnpgSyncReconciler) isTargeted(serviceOwnerId, environment string) bool {
	for _, t := range r.targets {
		if t.ServiceOwnerId == serviceOwnerId && t.Environment == environment {
			return true
		}
	}
	return false
}

func (r *CnpgSyncReconciler) isHelmReleaseReady(ctx context.Context) (bool, error) {
	release := &helmv2.HelmRelease{}
	key := client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}
	if err := r.k8sClient.Get(ctx, key, release); err != nil {
		if apierrors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("get HelmRelease: %w", err)
	}
	return apimeta.IsStatusConditionTrue(release.Status.Conditions, "Ready"), nil
}

// updateWithRetry updates obj with retry on conflict. refreshFn re-fetches and re-applies changes.
func (r *CnpgSyncReconciler) updateWithRetry(
	ctx context.Context,
	obj client.Object,
	resourceName string,
	refreshFn func() error,
) error {
	for attempt := range maxUpdateRetries {
		err := r.k8sClient.Update(ctx, obj)
		if err == nil {
			return nil
		}
		if !apierrors.IsConflict(err) {
			return fmt.Errorf("update %s: %w", resourceName, err)
		}
		r.logger.Info("conflict updating resource, retrying",
			"resource", resourceName, "attempt", attempt+1)
		if err := refreshFn(); err != nil {
			return err
		}
	}
	return fmt.Errorf("failed to update %s after %d attempts", resourceName, maxUpdateRetries)
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

func (r *CnpgSyncReconciler) deleteNamespaceIfExists(ctx context.Context) error {
	ns := &corev1.Namespace{}
	err := r.k8sClient.Get(ctx, client.ObjectKey{Name: cnpgNamespace}, ns)
	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get namespace: %w", err)
	}

	if ns.Labels["app.kubernetes.io/managed-by"] != "altinn-studio-operator" {
		r.logger.Info("namespace exists but not managed by us, skipping deletion",
			"namespace", cnpgNamespace,
			"labels", ns.Labels,
		)
		return nil
	}

	if err := r.k8sClient.Delete(ctx, ns); err != nil {
		return fmt.Errorf("delete namespace: %w", err)
	}
	r.logger.Info("deleted namespace", "namespace", cnpgNamespace)
	return nil
}

type storageClassSpec struct {
	Provisioner          string
	Parameters           map[string]string
	ReclaimPolicy        *corev1.PersistentVolumeReclaimPolicy
	VolumeBindingMode    *storagev1.VolumeBindingMode
	AllowVolumeExpansion *bool
}

func storageClassSpecFrom(sc *storagev1.StorageClass) storageClassSpec {
	return storageClassSpec{
		Provisioner:          sc.Provisioner,
		Parameters:           sc.Parameters,
		ReclaimPolicy:        sc.ReclaimPolicy,
		VolumeBindingMode:    sc.VolumeBindingMode,
		AllowVolumeExpansion: sc.AllowVolumeExpansion,
	}
}

func (r *CnpgSyncReconciler) ensureStorageClass(ctx context.Context) error {
	sc := &storagev1.StorageClass{}
	err := r.k8sClient.Get(ctx, client.ObjectKey{Name: storageClassName}, sc)

	desired := r.buildStorageClass()

	if apierrors.IsNotFound(err) {
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("create StorageClass: %w", err)
		}
		r.logger.Info("created StorageClass", "name", storageClassName)
		return nil
	}
	if err != nil {
		return fmt.Errorf("get StorageClass: %w", err)
	}

	// StorageClass is immutable except for metadata - delete and recreate if spec differs
	// TODO: better way to handle storageclass changes? Not sure what happens to existing volumes
	if diff.Diff(storageClassSpecFrom(sc), storageClassSpecFrom(desired)) != "" {
		r.logger.Info("StorageClass spec mismatch, deleting and recreating",
			"name", storageClassName)
		if err := r.k8sClient.Delete(ctx, sc); err != nil {
			return fmt.Errorf("delete StorageClass: %w", err)
		}
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("recreate StorageClass: %w", err)
		}
		r.logger.Info("recreated StorageClass", "name", storageClassName)
	}
	return nil
}

func (r *CnpgSyncReconciler) buildStorageClass() *storagev1.StorageClass {
	waitForFirstConsumer := storagev1.VolumeBindingWaitForFirstConsumer
	reclaimDelete := corev1.PersistentVolumeReclaimDelete
	allowExpansion := true

	sc := &storagev1.StorageClass{
		ObjectMeta: metav1.ObjectMeta{
			Name: storageClassName,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
		},
		VolumeBindingMode:    &waitForFirstConsumer,
		ReclaimPolicy:        &reclaimDelete,
		AllowVolumeExpansion: &allowExpansion,
	}

	if r.runtime.GetOperatorContext().IsLocal() {
		sc.Provisioner = "rancher.io/local-path"
	} else {
		sc.Provisioner = "disk.csi.azure.com"
		sc.Parameters = map[string]string{
			"skuName":           "PremiumV2_LRS",
			"cachingMode":       "None",
			"DiskIOPSReadWrite": "3000",
			"DiskMBpsReadWrite": "125",
		}
	}

	return sc
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
		if err := r.updateWithRetry(ctx, repo, "HelmRepository", func() error {
			if err := r.k8sClient.Get(ctx, key, repo); err != nil {
				return fmt.Errorf("refresh HelmRepository: %w", err)
			}
			repo.Spec = desired.Spec
			return nil
		}); err != nil {
			return err
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
		release.Spec = desired.Spec
		if err := r.updateWithRetry(ctx, release, "HelmRelease", func() error {
			if err := r.k8sClient.Get(ctx, key, release); err != nil {
				return fmt.Errorf("refresh HelmRelease: %w", err)
			}
			release.Spec = desired.Spec
			return nil
		}); err != nil {
			return err
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
	raw, err := json.Marshal(values)
	if err != nil {
		r.logger.Error(err, "failed to marshal helm values, using empty object")
		return &apiextensionsv1.JSON{Raw: []byte("{}")}
	}
	return &apiextensionsv1.JSON{Raw: raw}
}

func (r *CnpgSyncReconciler) ensureImageCatalog(ctx context.Context) error {
	desired, err := r.buildImageCatalog()
	if err != nil {
		return fmt.Errorf("build ImageCatalog: %w", err)
	}

	catalog := &cnpgv1.ImageCatalog{}
	key := client.ObjectKey{Name: imageCatalogName, Namespace: cnpgNamespace}
	err = r.k8sClient.Get(ctx, key, catalog)

	if apierrors.IsNotFound(err) {
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("create ImageCatalog: %w", err)
		}
		r.logger.Info("created ImageCatalog", "name", imageCatalogName)
		return nil
	}
	if err != nil {
		return fmt.Errorf("get ImageCatalog: %w", err)
	}

	if diff.Diff(catalog.Spec, desired.Spec) != "" {
		catalog.Spec = desired.Spec
		if err := r.updateWithRetry(ctx, catalog, "ImageCatalog", func() error {
			if err := r.k8sClient.Get(ctx, key, catalog); err != nil {
				return fmt.Errorf("refresh ImageCatalog: %w", err)
			}
			catalog.Spec = desired.Spec
			return nil
		}); err != nil {
			return err
		}
		r.logger.Info("updated ImageCatalog", "name", imageCatalogName)
	}
	return nil
}

func (r *CnpgSyncReconciler) buildImageCatalog() (*cnpgv1.ImageCatalog, error) {
	images := make([]cnpgv1.CatalogImage, 0, len(supportedPostgresqlMajorVersions))
	for _, major := range supportedPostgresqlMajorVersions {
		var imageRef string
		imageRef, err := r.getImageRef(major)
		if err != nil {
			return nil, fmt.Errorf("get image ref for major version %d: %w", major, err)
		}
		images = append(images, cnpgv1.CatalogImage{
			Major: major,
			Image: imageRef,
		})
	}
	return &cnpgv1.ImageCatalog{
		ObjectMeta: metav1.ObjectMeta{
			Name:      imageCatalogName,
			Namespace: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
		},
		Spec: cnpgv1.ImageCatalogSpec{
			Images: images,
		},
	}, nil
}

func (r *CnpgSyncReconciler) ensureCluster(ctx context.Context) error {
	cluster := &cnpgv1.Cluster{}
	key := client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}
	err := r.k8sClient.Get(ctx, key, cluster)

	apps := r.getTargetApps()
	desired := r.buildCluster(len(apps))
	if desired == nil {
		return r.deleteClusterIfExists(ctx, cluster, err)
	}

	if apierrors.IsNotFound(err) {
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("create Cluster: %w", err)
		}
		r.logger.Info("created Cluster", "name", clusterName)
		return nil
	}
	if err != nil {
		return fmt.Errorf("get Cluster: %w", err)
	}

	if diff.Diff(cluster.Spec, desired.Spec) != "" {
		managed := cluster.Spec.Managed // Preserve managed roles added by ensureManagedRole
		cluster.Spec = desired.Spec
		cluster.Spec.Managed = managed
		if err := r.updateWithRetry(ctx, cluster, "Cluster", func() error {
			if err := r.k8sClient.Get(ctx, key, cluster); err != nil {
				return fmt.Errorf("refresh Cluster: %w", err)
			}
			managed := cluster.Spec.Managed
			cluster.Spec = desired.Spec
			cluster.Spec.Managed = managed
			return nil
		}); err != nil {
			return err
		}
		r.logger.Info("updated Cluster", "name", clusterName)
	}
	return nil
}

func (r *CnpgSyncReconciler) deleteClusterIfExists(ctx context.Context, cluster *cnpgv1.Cluster, getErr error) error {
	if apierrors.IsNotFound(getErr) {
		return nil
	}
	if getErr != nil {
		return fmt.Errorf("get Cluster: %w", getErr)
	}

	if err := r.k8sClient.Delete(ctx, cluster); err != nil {
		return fmt.Errorf("delete Cluster: %w", err)
	}
	r.logger.Info("deleted Cluster", "name", clusterName)
	return nil
}

func (r *CnpgSyncReconciler) buildCluster(numApps int) *cnpgv1.Cluster {
	storageClass := storageClassName
	apiGroup := "postgresql.cnpg.io"

	baseConnections := numApps * connectionsPerApp
	if baseConnections < minBaseConnections {
		baseConnections = minBaseConnections
	}
	maxConnections := baseConnections + reservedConnections + adminConnections

	opCtx := r.runtime.GetOperatorContext()
	var cluster *cnpgv1.Cluster = nil
	switch opCtx.Environment {
	case operatorcontext.EnvironmentLocal, "tt02":
		cluster = &cnpgv1.Cluster{
			ObjectMeta: metav1.ObjectMeta{
				Name:      clusterName,
				Namespace: cnpgNamespace,
				Labels: map[string]string{
					"app.kubernetes.io/managed-by": "altinn-studio-operator",
				},
			},
			Spec: cnpgv1.ClusterSpec{
				Instances: 1,
				EnablePDB: ptr.To(false), // PDB for single instance cluster would prevent node drain during upgrades
				Bootstrap: &cnpgv1.BootstrapConfiguration{
					InitDB: &cnpgv1.BootstrapInitDB{
						DataChecksums: ptr.To(true),
						Encoding:      "UTF8",
						LocaleCollate: "nb_NO.UTF8",
						LocaleCType:   "nb_NO.UTF8",
					},
				},
				Env: []corev1.EnvVar{
					{Name: "TZ", Value: "Europe/Oslo"},
				},
				EnableSuperuserAccess: ptr.To(true),
				PostgresConfiguration: cnpgv1.PostgresConfiguration{
					// Azure docs: https://learn.microsoft.com/en-us/azure/aks/deploy-postgresql-ha?tabs=azuredisk#postgresql-performance-parameters
					// pgtune: https://pgtune.leopard.in.ua/?dbVersion=18&osType=linux&dbType=web&cpuNum=1&totalMemory=1&totalMemoryUnit=GB&connectionNum=100&hdType=ssd
					Parameters: map[string]string{
						"timezone":                       "Europe/Oslo",
						"max_connections":                strconv.Itoa(maxConnections),
						"superuser_reserved_connections": strconv.Itoa(reservedConnections),
						// Memory
						"shared_buffers":       "256MB",
						"effective_cache_size": "768MB",
						"work_mem":             "2427kB",
						"maintenance_work_mem": "64MB",
						"huge_pages":           "off",
						// WAL
						"wal_compression":        "lz4",
						"wal_buffers":            "7864kB",
						"min_wal_size":           "512MB",
						"max_wal_size":           "1GB",
						"wal_writer_flush_after": "2MB",
						// Checkpoints
						"checkpoint_completion_target": "0.9",
						"checkpoint_flush_after":       "2MB",
						"checkpoint_timeout":           "15min",
						// IO
						"effective_io_concurrency":   "128",
						"maintenance_io_concurrency": "128",
						// Other
						"default_toast_compression": "lz4",
						// SSD cost tuning
						"random_page_cost": "1.1",
						// Autovacuum
						"autovacuum_vacuum_cost_limit": "2400",
						// Monitoring
						"pg_stat_statements.track":      "all",
						"pg_stat_statements.max":        "1000",
						"default_statistics_target":     "100",
						"log_checkpoints":               "on",
						"log_lock_waits":                "on",
						"log_min_duration_statement":    "1000",
						"log_statement":                 "ddl",
						"log_temp_files":                "1024",
						"log_autovacuum_min_duration":   "1s",
						"auto_explain.log_min_duration": "10s",
						// TCP Keepalive (detect dead connections holding locks)
						"tcp_keepalives_idle":              "60",
						"tcp_keepalives_interval":          "10",
						"tcp_keepalives_count":             "6",
						"client_connection_check_interval": "10000", // ms, poll socket during long queries
					},
				},
				ImageCatalogRef: &cnpgv1.ImageCatalogRef{
					TypedLocalObjectReference: corev1.TypedLocalObjectReference{
						APIGroup: &apiGroup,
						Kind:     "ImageCatalog",
						Name:     imageCatalogName,
					},
					Major: 18,
				},
				StorageConfiguration: cnpgv1.StorageConfiguration{
					StorageClass: &storageClass,
					Size:         "4Gi",
				},
				WalStorage: &cnpgv1.StorageConfiguration{
					StorageClass: &storageClass,
					Size:         "2Gi",
				},
				Resources: corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("100m"),
						corev1.ResourceMemory: resource.MustParse("1Gi"),
					},
				},
				Affinity: cnpgv1.AffinityConfiguration{
					EnablePodAntiAffinity: ptr.To(false),
				},
				TopologySpreadConstraints: []corev1.TopologySpreadConstraint{
					{
						MaxSkew:           1,
						TopologyKey:       "topology.kubernetes.io/zone",
						WhenUnsatisfiable: corev1.DoNotSchedule,
						LabelSelector: &metav1.LabelSelector{
							MatchLabels: map[string]string{
								"cnpg.io/cluster": clusterName,
							},
						},
					},
				},
			},
		}
	}

	return cluster
}

// getTargetApps returns the apps for the current operator context, or nil if not targeted.
func (r *CnpgSyncReconciler) getTargetApps() []string {
	opCtx := r.runtime.GetOperatorContext()
	for _, t := range r.targets {
		if t.ServiceOwnerId == opCtx.ServiceOwner.Id && t.Environment == opCtx.Environment {
			return t.Apps
		}
	}
	return nil
}

// ensureAppDatabases creates databases for all target apps.
// Returns needsRetry=true if any database is not ready yet.
func (r *CnpgSyncReconciler) ensureAppDatabases(ctx context.Context) (needsRetry bool, err error) {
	apps := r.getTargetApps()
	if len(apps) == 0 {
		return false, nil
	}

	for _, appId := range apps {
		ready, err := r.ensureAppDatabase(ctx, appId)
		if err != nil {
			return false, fmt.Errorf("ensure database for app %s: %w", appId, err)
		}
		if !ready {
			needsRetry = true
		}
	}
	return needsRetry, nil
}

// ensureAppDatabase ensures password secret, managed role, and database for an app.
// Returns ready=true when all resources are ready.
func (r *CnpgSyncReconciler) ensureAppDatabase(ctx context.Context, appId string) (ready bool, err error) {
	if err := r.ensurePasswordSecret(ctx, appId); err != nil {
		return false, fmt.Errorf("ensure password secret: %w", err)
	}

	roleReady, err := r.ensureManagedRole(ctx, appId)
	if err != nil {
		return false, fmt.Errorf("ensure managed role: %w", err)
	}
	if !roleReady {
		r.logger.Info("waiting for role to be reconciled", "appId", appId)
		return false, nil
	}

	dbReady, err := r.ensureDatabase(ctx, appId)
	if err != nil {
		return false, fmt.Errorf("ensure database: %w", err)
	}
	if !dbReady {
		r.logger.Info("waiting for database to be applied", "appId", appId)
		return false, nil
	}

	return true, nil
}

// ensurePasswordSecret creates a password secret for the app if it doesn't exist.
func (r *CnpgSyncReconciler) ensurePasswordSecret(ctx context.Context, appId string) error {
	secretName := fmt.Sprintf(passwordSecretNameFormat, appId)
	secret := &corev1.Secret{}
	err := r.k8sClient.Get(ctx, client.ObjectKey{Name: secretName, Namespace: cnpgNamespace}, secret)
	if err == nil {
		return nil
	}
	if !apierrors.IsNotFound(err) {
		return fmt.Errorf("get password secret: %w", err)
	}

	password, err := generatePassword(32)
	if err != nil {
		return fmt.Errorf("generate password: %w", err)
	}

	pgUser := sanitizePostgresIdentifier(appId)
	secret = &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
				"cnpg.io/cluster":              clusterName,
			},
		},
		Type: corev1.SecretTypeOpaque,
		Data: map[string][]byte{
			"username": []byte(pgUser),
			"password": []byte(password),
		},
	}

	if err := r.k8sClient.Create(ctx, secret); err != nil {
		return fmt.Errorf("create password secret: %w", err)
	}
	r.logger.Info("created password secret", "name", secretName, "appId", appId)
	return nil
}

func generatePassword(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes)[:length], nil
}

// sanitizePostgresIdentifier converts appId to valid PostgreSQL identifier.
// PostgreSQL identifiers with hyphens require quoting; underscores don't.
func sanitizePostgresIdentifier(s string) string {
	return strings.ReplaceAll(s, "-", "_")
}

// ensureManagedRole adds a role to the Cluster's managed.roles if not present.
// Returns ready=true if the role has been reconciled by CNPG.
func (r *CnpgSyncReconciler) ensureManagedRole(ctx context.Context, appId string) (ready bool, err error) {
	pgRole := sanitizePostgresIdentifier(appId)

	cluster := &cnpgv1.Cluster{}
	if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster); err != nil {
		return false, fmt.Errorf("get cluster: %w", err)
	}

	// Check if role already exists in spec
	roleExists := false
	if cluster.Spec.Managed != nil {
		for _, role := range cluster.Spec.Managed.Roles {
			if role.Name == pgRole {
				roleExists = true
				break
			}
		}
	}

	if !roleExists {
		secretName := fmt.Sprintf(passwordSecretNameFormat, appId)
		role := cnpgv1.RoleConfiguration{
			Name:            pgRole,
			Login:           true,
			ConnectionLimit: connectionsPerApp,
			PasswordSecret: &cnpgv1.LocalObjectReference{
				Name: secretName,
			},
		}

		if cluster.Spec.Managed == nil {
			cluster.Spec.Managed = &cnpgv1.ManagedConfiguration{}
		}
		cluster.Spec.Managed.Roles = append(cluster.Spec.Managed.Roles, role)

		for attempt := range maxUpdateRetries {
			err := r.k8sClient.Update(ctx, cluster)
			if err == nil {
				r.logger.Info("added managed role to cluster", "appId", appId)
				return false, nil // Not ready yet, just added
			}
			if !apierrors.IsConflict(err) {
				return false, fmt.Errorf("update cluster with role: %w", err)
			}
			r.logger.Info("conflict updating cluster, retrying", "appId", appId, "attempt", attempt+1)
			if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster); err != nil {
				return false, fmt.Errorf("refresh cluster: %w", err)
			}
			// Re-check if role was added by another process
			for _, existing := range cluster.Spec.Managed.Roles {
				if existing.Name == pgRole {
					return false, nil // Role already added, continue to status check
				}
			}
			cluster.Spec.Managed.Roles = append(cluster.Spec.Managed.Roles, role)
		}
		return false, fmt.Errorf("failed to add managed role after %d attempts due to conflicts", maxUpdateRetries)
	}

	// Check if role is reconciled
	if cluster.Status.ManagedRolesStatus.ByStatus == nil {
		return false, nil
	}
	reconciledRoles := cluster.Status.ManagedRolesStatus.ByStatus[cnpgv1.RoleStatusReconciled]
	for _, roleName := range reconciledRoles {
		if roleName == pgRole {
			return true, nil
		}
	}
	return false, nil
}

// ensureDatabase creates a Database resource for the app.
// Returns ready=true if the database has been applied by CNPG.
func (r *CnpgSyncReconciler) ensureDatabase(ctx context.Context, appId string) (ready bool, err error) {
	dbName := fmt.Sprintf(databaseNameFormat, appId)
	pgName := sanitizePostgresIdentifier(appId)
	database := &cnpgv1.Database{}
	err = r.k8sClient.Get(ctx, client.ObjectKey{Name: dbName, Namespace: cnpgNamespace}, database)

	if apierrors.IsNotFound(err) {
		database = &cnpgv1.Database{
			ObjectMeta: metav1.ObjectMeta{
				Name:      dbName,
				Namespace: cnpgNamespace,
				Labels: map[string]string{
					"app.kubernetes.io/managed-by": "altinn-studio-operator",
					"altinn.studio/app-id":         appId,
				},
			},
			Spec: cnpgv1.DatabaseSpec{
				ClusterRef: corev1.LocalObjectReference{
					Name: clusterName,
				},
				Name:          pgName, // PostgreSQL database name
				Owner:         pgName, // The managed role
				ReclaimPolicy: cnpgv1.DatabaseReclaimDelete,
			},
		}

		if err := r.k8sClient.Create(ctx, database); err != nil {
			return false, fmt.Errorf("create database: %w", err)
		}
		r.logger.Info("created database", "name", dbName, "appId", appId)
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("get database: %w", err)
	}

	// Check if database is applied
	if database.Status.Applied != nil && *database.Status.Applied {
		return true, nil
	}
	return false, nil
}

// syncDatabaseSecrets syncs connection strings to app secrets for ready databases.
func (r *CnpgSyncReconciler) syncDatabaseSecrets(ctx context.Context) error {
	apps := r.getTargetApps()
	if len(apps) == 0 {
		return nil
	}

	opCtx := r.runtime.GetOperatorContext()
	for _, appId := range apps {
		// Check if database is ready
		dbName := fmt.Sprintf(databaseNameFormat, appId)
		database := &cnpgv1.Database{}
		if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: dbName, Namespace: cnpgNamespace}, database); err != nil {
			if apierrors.IsNotFound(err) {
				continue // Database not created yet
			}
			return fmt.Errorf("get database %s: %w", dbName, err)
		}
		if database.Status.Applied == nil || !*database.Status.Applied {
			continue // Database not ready
		}

		if err := r.syncDatabaseSecret(ctx, opCtx, appId); err != nil {
			return fmt.Errorf("sync secret for app %s: %w", appId, err)
		}
	}
	return nil
}

// syncDatabaseSecret updates the app's secret with the PostgreSQL connection string.
func (r *CnpgSyncReconciler) syncDatabaseSecret(ctx context.Context, opCtx *operatorcontext.Context, appId string) error {
	// Read password from our secret
	passwordSecretName := fmt.Sprintf(passwordSecretNameFormat, appId)
	passwordSecret := &corev1.Secret{}
	if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: passwordSecretName, Namespace: cnpgNamespace}, passwordSecret); err != nil {
		return fmt.Errorf("get password secret: %w", err)
	}
	password := string(passwordSecret.Data["password"])

	// Build connection string
	pgName := sanitizePostgresIdentifier(appId)
	host := fmt.Sprintf("%s-rw.%s.svc.cluster.local", clusterName, cnpgNamespace)
	connStr := fmt.Sprintf("Host=%s;Port=5432;Database=%s;Username=%s;Password=%s;Application Name=%s;Maximum Pool Size=%d;Tcp Keepalive=true",
		host, pgName, pgName, password, appId, connectionsPerApp)

	// Find app secret
	appSecretName := fmt.Sprintf("%s-%s-deployment-secrets", opCtx.ServiceOwner.Id, appId)
	appNamespace := "default"

	appSecret := &corev1.Secret{}
	if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: appSecretName, Namespace: appNamespace}, appSecret); err != nil {
		if apierrors.IsNotFound(err) {
			r.logger.Info("app secret not found, skipping", "appId", appId, "secretName", appSecretName, "namespace", appNamespace)
			return nil
		}
		return fmt.Errorf("get app secret: %w", err)
	}

	// Build postgresql.json content
	postgresJson := map[string]any{
		"PostgreSQL": map[string]string{
			"ConnectionString": connStr,
		},
	}
	jsonBytes, err := json.Marshal(postgresJson)
	if err != nil {
		return fmt.Errorf("marshal postgresql.json: %w", err)
	}

	// Check if update needed
	if string(appSecret.Data[postgresqlJsonKey]) == string(jsonBytes) {
		return nil // Already up to date
	}

	return r.updateAppSecretWithRetry(ctx, appSecret, jsonBytes)
}

// updateAppSecretWithRetry updates the app secret with retry on conflict.
func (r *CnpgSyncReconciler) updateAppSecretWithRetry(ctx context.Context, appSecret *corev1.Secret, postgresJson []byte) error {
	for attempt := range maxUpdateRetries {
		updatedSecret := appSecret.DeepCopy()
		if updatedSecret.Data == nil {
			updatedSecret.Data = make(map[string][]byte)
		}
		updatedSecret.Data[postgresqlJsonKey] = postgresJson

		err := r.k8sClient.Update(ctx, updatedSecret)
		if err == nil {
			r.logger.Info("updated app secret with postgresql connection",
				"secretName", appSecret.Name,
				"namespace", appSecret.Namespace,
			)
			return nil
		}

		if !apierrors.IsConflict(err) {
			return fmt.Errorf("update app secret: %w", err)
		}

		r.logger.Info("conflict updating app secret, retrying",
			"attempt", attempt+1,
			"secretName", appSecret.Name,
		)

		if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: appSecret.Name, Namespace: appSecret.Namespace}, appSecret); err != nil {
			return fmt.Errorf("refresh app secret: %w", err)
		}
	}
	return fmt.Errorf("failed to update app secret after %d attempts", maxUpdateRetries)
}

// cleanupRemovedApps removes database resources for apps no longer in targets.
func (r *CnpgSyncReconciler) cleanupRemovedApps(ctx context.Context) error {
	targetApps := r.getTargetApps()
	targetSet := make(map[string]bool, len(targetApps))
	for _, app := range targetApps {
		targetSet[app] = true
	}

	// List all databases managed by us
	dbList := &cnpgv1.DatabaseList{}
	if err := r.k8sClient.List(ctx, dbList,
		client.InNamespace(cnpgNamespace),
		client.MatchingLabels{"app.kubernetes.io/managed-by": "altinn-studio-operator"},
	); err != nil {
		return fmt.Errorf("list databases: %w", err)
	}

	for _, db := range dbList.Items {
		appId := db.Labels["altinn.studio/app-id"]
		if appId == "" {
			continue // Skip databases without the app-id label
		}
		if targetSet[appId] {
			continue
		}

		r.logger.Info("cleaning up removed app", "appId", appId)
		if err := r.cleanupAppDatabase(ctx, appId); err != nil {
			return fmt.Errorf("cleanup app %s: %w", appId, err)
		}
	}

	return nil
}

// cleanupAppDatabase removes all database resources for an app.
func (r *CnpgSyncReconciler) cleanupAppDatabase(ctx context.Context, appId string) error {
	if err := r.deleteDatabaseIfExists(ctx, appId); err != nil {
		return fmt.Errorf("delete database: %w", err)
	}

	if err := r.removeManagedRole(ctx, appId); err != nil {
		return fmt.Errorf("remove managed role: %w", err)
	}

	if err := r.deletePasswordSecretIfExists(ctx, appId); err != nil {
		return fmt.Errorf("delete password secret: %w", err)
	}

	opCtx := r.runtime.GetOperatorContext()
	if err := r.removePostgresqlJsonFromAppSecret(ctx, opCtx, appId); err != nil {
		return fmt.Errorf("remove postgresql.json: %w", err)
	}

	return nil
}

func (r *CnpgSyncReconciler) deleteDatabaseIfExists(ctx context.Context, appId string) error {
	dbName := fmt.Sprintf(databaseNameFormat, appId)
	database := &cnpgv1.Database{}
	err := r.k8sClient.Get(ctx, client.ObjectKey{Name: dbName, Namespace: cnpgNamespace}, database)

	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get database: %w", err)
	}

	if err := r.k8sClient.Delete(ctx, database); err != nil {
		return fmt.Errorf("delete database: %w", err)
	}
	r.logger.Info("deleted database", "name", dbName, "appId", appId)
	return nil
}

func (r *CnpgSyncReconciler) removeManagedRole(ctx context.Context, appId string) error {
	pgRole := sanitizePostgresIdentifier(appId)

	cluster := &cnpgv1.Cluster{}
	if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("get cluster: %w", err)
	}

	if cluster.Spec.Managed == nil {
		return nil
	}

	newRoles := make([]cnpgv1.RoleConfiguration, 0, len(cluster.Spec.Managed.Roles))
	found := false
	for _, role := range cluster.Spec.Managed.Roles {
		if role.Name == pgRole {
			found = true
			continue
		}
		newRoles = append(newRoles, role)
	}

	if !found {
		return nil
	}

	cluster.Spec.Managed.Roles = newRoles
	for attempt := range maxUpdateRetries {
		err := r.k8sClient.Update(ctx, cluster)
		if err == nil {
			r.logger.Info("removed managed role from cluster", "appId", appId)
			return nil
		}
		if !apierrors.IsConflict(err) {
			return fmt.Errorf("update cluster to remove role: %w", err)
		}
		r.logger.Info("conflict removing role, retrying", "appId", appId, "attempt", attempt+1)
		if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster); err != nil {
			return fmt.Errorf("refresh cluster: %w", err)
		}
		if cluster.Spec.Managed == nil {
			return nil // Nothing to remove
		}
		// Rebuild newRoles excluding pgRole
		newRoles = make([]cnpgv1.RoleConfiguration, 0, len(cluster.Spec.Managed.Roles))
		found = false
		for _, role := range cluster.Spec.Managed.Roles {
			if role.Name == pgRole {
				found = true
				continue
			}
			newRoles = append(newRoles, role)
		}
		if !found {
			return nil // Already removed
		}
		cluster.Spec.Managed.Roles = newRoles
	}
	return fmt.Errorf("failed to remove managed role after %d attempts due to conflicts", maxUpdateRetries)
}

func (r *CnpgSyncReconciler) deletePasswordSecretIfExists(ctx context.Context, appId string) error {
	secretName := fmt.Sprintf(passwordSecretNameFormat, appId)
	secret := &corev1.Secret{}
	err := r.k8sClient.Get(ctx, client.ObjectKey{Name: secretName, Namespace: cnpgNamespace}, secret)

	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get password secret: %w", err)
	}

	if secret.Labels["app.kubernetes.io/managed-by"] != "altinn-studio-operator" {
		r.logger.Info("password secret not managed by us, skipping deletion",
			"secretName", secretName, "labels", secret.Labels)
		return nil
	}

	if err := r.k8sClient.Delete(ctx, secret); err != nil {
		return fmt.Errorf("delete password secret: %w", err)
	}
	r.logger.Info("deleted password secret", "name", secretName, "appId", appId)
	return nil
}

func (r *CnpgSyncReconciler) removePostgresqlJsonFromAppSecret(ctx context.Context, opCtx *operatorcontext.Context, appId string) error {
	appSecretName := fmt.Sprintf("%s-%s-deployment-secrets", opCtx.ServiceOwner.Id, appId)
	appNamespace := "default"

	appSecret := &corev1.Secret{}
	if err := r.k8sClient.Get(ctx, client.ObjectKey{Name: appSecretName, Namespace: appNamespace}, appSecret); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("get app secret: %w", err)
	}

	if _, exists := appSecret.Data[postgresqlJsonKey]; !exists {
		return nil
	}

	delete(appSecret.Data, postgresqlJsonKey)
	key := client.ObjectKey{Name: appSecretName, Namespace: appNamespace}
	for attempt := range maxUpdateRetries {
		err := r.k8sClient.Update(ctx, appSecret)
		if err == nil {
			r.logger.Info("removed postgresql.json from app secret", "appId", appId, "secretName", appSecretName)
			return nil
		}
		if !apierrors.IsConflict(err) {
			return fmt.Errorf("update app secret: %w", err)
		}
		r.logger.Info("conflict updating app secret, retrying", "appId", appId, "attempt", attempt+1)
		if err := r.k8sClient.Get(ctx, key, appSecret); err != nil {
			return fmt.Errorf("refresh app secret: %w", err)
		}
		if _, exists := appSecret.Data[postgresqlJsonKey]; !exists {
			return nil // Already removed
		}
		delete(appSecret.Data, postgresqlJsonKey)
	}
	return fmt.Errorf("failed to remove postgresql.json from app secret after %d attempts due to conflicts", maxUpdateRetries)
}
