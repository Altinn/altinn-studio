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

	cnpgv1 "github.com/cloudnative-pg/cloudnative-pg/api/v1"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/diff"
	"k8s.io/apimachinery/pkg/util/validation"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/operatorcontext"
	rt "altinn.studio/operator/internal/runtime"
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
	backupStorageClass  = "cnpg-backup-standard"
	backupPGVersion     = 18

	postgresqlJsonKey              = "postgresql.json"
	maxUpdateRetries               = 3
	passwordSecretNameFormat       = "pg-apps-cluster-%s-password"
	databaseNameFormat             = "db-%s"
	backupCronJobNameFormat        = "pgdump-%s"
	managedByLabelValue            = "altinn-studio-operator"
	managedByLabelKey              = "app.kubernetes.io/managed-by"
	backupRoleLabelValue           = "pgdump-backup"
	backupRoleLabelKey             = "altinn.studio/component"
	backupFSGroup            int64 = 102

	connectionsPerApp   = 40
	reservedConnections = 3  // superuser_reserved_connections
	adminConnections    = 10 // buffer for admin/monitoring
	minBaseConnections  = 50 // minimum even with 0 apps

	baseClusterScale = 1
	prodClusterScale = 2
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
// +kubebuilder:rbac:groups=batch,resources=cronjobs,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups=batch,resources=jobs,verbs=get;list;watch
// +kubebuilder:rbac:groups="",resources=persistentvolumeclaims,verbs=get;list;watch;create

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

	if err := r.ensureBackupResources(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to ensure backup resources")
		return false, fmt.Errorf("ensure backup resources: %w", err)
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
	scale, ok := clusterScaleForEnvironment(r.runtime.GetOperatorContext().Environment)
	if !ok {
		return nil
	}

	cfg, err := newBuildClusterConfig(numApps, scale)
	if err != nil {
		r.logger.Error(err, "invalid cluster scaling config", "scale", scale, "numApps", numApps)
		return nil
	}

	storageClass := storageClassName
	apiGroup := "postgresql.cnpg.io"
	return &cnpgv1.Cluster{
		ObjectMeta: metav1.ObjectMeta{
			Name:      clusterName,
			Namespace: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
		},
		Spec: cnpgv1.ClusterSpec{
			Instances: cfg.Instances,
			EnablePDB: ptr.To(cfg.EnablePDB),
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
					"max_connections":                strconv.Itoa(cfg.MaxConnections),
					"superuser_reserved_connections": strconv.Itoa(cfg.SuperuserReservedConnections),
					// Memory
					"shared_buffers":       cfg.SharedBuffers,
					"effective_cache_size": cfg.EffectiveCacheSize,
					"work_mem":             cfg.WorkMem,
					"maintenance_work_mem": cfg.MaintenanceWorkMem,
					"huge_pages":           "off",
					// WAL
					"wal_compression":        "lz4",
					"wal_buffers":            cfg.WalBuffers,
					"min_wal_size":           cfg.MinWalSize,
					"max_wal_size":           cfg.MaxWalSize,
					"wal_writer_flush_after": cfg.WalWriterFlushAfter,
					// Checkpoints
					"checkpoint_completion_target": "0.9",
					"checkpoint_flush_after":       cfg.CheckpointFlushAfter,
					"checkpoint_timeout":           "15min",
					// IO
					"effective_io_concurrency":   "128",
					"maintenance_io_concurrency": "128",
					// Other
					"default_toast_compression": "lz4",
					// SSD cost tuning
					"random_page_cost": "1.1",
					// Autovacuum
					"autovacuum_vacuum_cost_limit": cfg.AutovacuumVacuumCostLimit,
					// Monitoring
					"pg_stat_statements.track":      "all",
					"pg_stat_statements.max":        cfg.PgStatStatementsMax,
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
				Size:         cfg.StorageSize,
			},
			WalStorage: &cnpgv1.StorageConfiguration{
				StorageClass: &storageClass,
				Size:         cfg.WalStorageSize,
			},
			Resources: corev1.ResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse(cfg.CPURequest),
					corev1.ResourceMemory: resource.MustParse(cfg.MemoryRequest),
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

func clusterScaleForEnvironment(environment string) (int, bool) {
	switch environment {
	case operatorcontext.EnvironmentLocal, "tt02":
		return baseClusterScale, true
	case operatorcontext.EnvironmentProd:
		return prodClusterScale, true
	default:
		return 0, false
	}
}

type buildClusterConfig struct {
	Instances                    int
	EnablePDB                    bool
	MaxConnections               int
	SuperuserReservedConnections int
	StorageSize                  string
	WalStorageSize               string
	CPURequest                   string
	MemoryRequest                string
	SharedBuffers                string
	EffectiveCacheSize           string
	WorkMem                      string
	MaintenanceWorkMem           string
	WalBuffers                   string
	MinWalSize                   string
	MaxWalSize                   string
	WalWriterFlushAfter          string
	CheckpointFlushAfter         string
	AutovacuumVacuumCostLimit    string
	PgStatStatementsMax          string
}

func newBuildClusterConfig(numApps, scale int) (*buildClusterConfig, error) {
	if scale < 1 {
		return nil, fmt.Errorf("cluster scale must be >= 1, got %d", scale)
	}

	connectionsPerAppScaled := scaleInt(connectionsPerApp, scale)
	baseConnections := numApps * connectionsPerAppScaled
	minConnections := scaleInt(minBaseConnections, scale)
	if baseConnections < minConnections {
		baseConnections = minConnections
	}

	superuserReservedConnections := scaleInt(reservedConnections, scale)
	adminConnectionsScaled := scaleInt(adminConnections, scale)
	maxConnections := baseConnections + superuserReservedConnections + adminConnectionsScaled

	return &buildClusterConfig{
		Instances:                    1,
		EnablePDB:                    false,
		MaxConnections:               maxConnections,
		SuperuserReservedConnections: superuserReservedConnections,
		StorageSize:                  scaleSizeWithUnit(4, scale, "Gi"),
		WalStorageSize:               "2Gi",
		CPURequest:                   scaleSizeWithUnit(100, scale, "m"),
		MemoryRequest:                scaleSizeWithUnit(1, scale, "Gi"),
		SharedBuffers:                scaleSizeWithUnit(256, scale, "MB"),
		EffectiveCacheSize:           scaleSizeWithUnit(768, scale, "MB"),
		WorkMem:                      scaleSizeWithUnit(2427, scale, "kB"),
		MaintenanceWorkMem:           scaleSizeWithUnit(64, scale, "MB"),
		WalBuffers:                   "7864kB",
		MinWalSize:                   "512MB",
		MaxWalSize:                   "1GB",
		WalWriterFlushAfter:          "2MB",
		CheckpointFlushAfter:         "2MB",
		AutovacuumVacuumCostLimit:    "2400",
		PgStatStatementsMax:          "1000",
	}, nil
}

func scaleInt(base, scale int) int {
	return base * scale
}

func scaleSizeWithUnit(base, scale int, unit string) string {
	return fmt.Sprintf("%d%s", scaleInt(base, scale), unit)
}

func (r *CnpgSyncReconciler) ensureBackupResources(ctx context.Context) error {
	cfg, err := r.resolveBackupConfig()
	if err != nil {
		return fmt.Errorf("resolve backup config: %w", err)
	}

	if cfg == nil {
		// Intentionally keep backup StorageClass/PVC even when backups are disabled.
		// Backup storage is treated as retained operational state and must not be
		// reclaimed automatically by this controller.
		return r.cleanupRemovedBackupCronJobs(ctx, nil)
	}

	if err := r.ensureBackupStorageClass(ctx, cfg); err != nil {
		return fmt.Errorf("ensure backup StorageClass: %w", err)
	}
	if err := r.ensureBackupPVCs(ctx, cfg); err != nil {
		return fmt.Errorf("ensure backup PVCs: %w", err)
	}
	if err := r.ensureBackupCronJobs(ctx, cfg); err != nil {
		return fmt.Errorf("ensure backup CronJobs: %w", err)
	}

	return nil
}

func (r *CnpgSyncReconciler) ensureBackupStorageClass(ctx context.Context, cfg *resolvedBackupConfig) error {
	sc := &storagev1.StorageClass{}
	key := client.ObjectKey{Name: cfg.StorageClassName}
	err := r.k8sClient.Get(ctx, key, sc)
	desired := r.buildBackupStorageClass(cfg.StorageClassName)

	if apierrors.IsNotFound(err) {
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("create StorageClass: %w", err)
		}
		r.logger.Info("created backup StorageClass", "name", cfg.StorageClassName)
		return nil
	}
	if err != nil {
		return fmt.Errorf("get StorageClass: %w", err)
	}

	if diff.Diff(storageClassSpecFrom(sc), storageClassSpecFrom(desired)) != "" {
		r.logger.Info("backup StorageClass differs from desired spec, leaving as-is",
			"name", cfg.StorageClassName)
	}

	return nil
}

func (r *CnpgSyncReconciler) buildBackupStorageClass(name string) *storagev1.StorageClass {
	waitForFirstConsumer := storagev1.VolumeBindingWaitForFirstConsumer
	reclaimRetain := corev1.PersistentVolumeReclaimRetain
	allowExpansion := true

	sc := &storagev1.StorageClass{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Labels: map[string]string{
				managedByLabelKey:  managedByLabelValue,
				backupRoleLabelKey: backupRoleLabelValue,
			},
		},
		VolumeBindingMode:    &waitForFirstConsumer,
		ReclaimPolicy:        &reclaimRetain,
		AllowVolumeExpansion: &allowExpansion,
	}

	if r.runtime.GetOperatorContext().IsLocal() {
		sc.Provisioner = "rancher.io/local-path"
	} else {
		sc.Provisioner = "disk.csi.azure.com"
		sc.Parameters = map[string]string{
			"skuName":     "StandardSSD_ZRS",
			"cachingMode": "None",
		}
	}

	return sc
}

func (r *CnpgSyncReconciler) ensureBackupPVCs(ctx context.Context, cfg *resolvedBackupConfig) error {
	for _, appId := range r.getTargetApps() {
		if err := r.ensureBackupPVC(ctx, appId, cfg); err != nil {
			return fmt.Errorf("ensure backup PVC for app %s: %w", appId, err)
		}
	}
	return nil
}

func (r *CnpgSyncReconciler) ensureBackupPVC(ctx context.Context, appId string, cfg *resolvedBackupConfig) error {
	pvcName, err := backupPVCName(cfg.PvcName, appId)
	if err != nil {
		return err
	}

	pvc := &corev1.PersistentVolumeClaim{}
	key := client.ObjectKey{Name: pvcName, Namespace: cnpgNamespace}
	err = r.k8sClient.Get(ctx, key, pvc)

	if apierrors.IsNotFound(err) {
		size := resource.MustParse(cfg.PvcSize)
		pvc = &corev1.PersistentVolumeClaim{
			ObjectMeta: metav1.ObjectMeta{
				Name:      pvcName,
				Namespace: cnpgNamespace,
				Labels: map[string]string{
					managedByLabelKey:      managedByLabelValue,
					backupRoleLabelKey:     backupRoleLabelValue,
					"altinn.studio/app-id": appId,
				},
			},
			Spec: corev1.PersistentVolumeClaimSpec{
				AccessModes: []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
				Resources: corev1.VolumeResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceStorage: size,
					},
				},
				StorageClassName: ptr.To(cfg.StorageClassName),
			},
		}
		if err := r.k8sClient.Create(ctx, pvc); err != nil {
			return fmt.Errorf("create PVC: %w", err)
		}
		r.logger.Info("created backup PVC", "name", pvcName, "namespace", cnpgNamespace, "appId", appId)
		return nil
	}
	if err != nil {
		return fmt.Errorf("get PVC: %w", err)
	}

	existingSC := ""
	if pvc.Spec.StorageClassName != nil {
		existingSC = *pvc.Spec.StorageClassName
	}
	if existingSC != cfg.StorageClassName {
		r.logger.Info("backup PVC uses different StorageClass than configured, leaving as-is",
			"pvc", pvcName, "currentStorageClass", existingSC, "desiredStorageClass", cfg.StorageClassName)
	}

	return nil
}

func (r *CnpgSyncReconciler) ensureBackupCronJobs(ctx context.Context, cfg *resolvedBackupConfig) error {
	apps := r.getTargetApps()
	targetSet := make(map[string]bool, len(apps))
	for _, appId := range apps {
		targetSet[appId] = true
		if err := r.ensureBackupCronJob(ctx, appId, cfg); err != nil {
			return fmt.Errorf("ensure CronJob for app %s: %w", appId, err)
		}
	}

	return r.cleanupRemovedBackupCronJobs(ctx, targetSet)
}

func (r *CnpgSyncReconciler) ensureBackupCronJob(ctx context.Context, appId string, cfg *resolvedBackupConfig) error {
	cronJobName := fmt.Sprintf(backupCronJobNameFormat, appId)
	cronJob := &batchv1.CronJob{}
	key := client.ObjectKey{Name: cronJobName, Namespace: cnpgNamespace}
	getErr := r.k8sClient.Get(ctx, key, cronJob)

	desired, buildErr := r.buildBackupCronJob(appId, cfg)
	if buildErr != nil {
		return fmt.Errorf("build CronJob: %w", buildErr)
	}

	if apierrors.IsNotFound(getErr) {
		if err := r.k8sClient.Create(ctx, desired); err != nil {
			return fmt.Errorf("create CronJob: %w", err)
		}
		r.logger.Info("created backup CronJob", "name", cronJobName, "appId", appId)
		return nil
	}
	if getErr != nil {
		return fmt.Errorf("get CronJob: %w", getErr)
	}

	if diff.Diff(cronJob.Spec, desired.Spec) == "" && diff.Diff(cronJob.Labels, desired.Labels) == "" {
		return nil
	}

	cronJob.Spec = desired.Spec
	cronJob.Labels = desired.Labels
	if err := r.updateWithRetry(ctx, cronJob, "CronJob", func() error {
		if err := r.k8sClient.Get(ctx, key, cronJob); err != nil {
			return fmt.Errorf("refresh CronJob: %w", err)
		}
		cronJob.Spec = desired.Spec
		cronJob.Labels = desired.Labels
		return nil
	}); err != nil {
		return err
	}

	r.logger.Info("updated backup CronJob", "name", cronJobName, "appId", appId)
	return nil
}

func (r *CnpgSyncReconciler) buildBackupCronJob(appId string, cfg *resolvedBackupConfig) (*batchv1.CronJob, error) {
	imageRef, err := r.getImageRef(backupPGVersion)
	if err != nil {
		return nil, fmt.Errorf("get backup image: %w", err)
	}
	pvcName, err := backupPVCName(cfg.PvcName, appId)
	if err != nil {
		return nil, fmt.Errorf("build backup PVC name: %w", err)
	}

	pgName := sanitizePostgresIdentifier(appId)
	secretName := fmt.Sprintf(passwordSecretNameFormat, appId)
	host := fmt.Sprintf("%s-rw.%s.svc.cluster.local", clusterName, cnpgNamespace)
	cronJobName := fmt.Sprintf(backupCronJobNameFormat, appId)

	script := fmt.Sprintf(`
app_id="%s"
ts="$(date -u +%%Y%%m%%dT%%H%%M%%SZ)"
start_epoch="$(date +%%s)"
out_dir="/backups/%s"
mkdir -p "${out_dir}"
dump_file="${out_dir}/%s-${ts}.dump"

echo "[pgdump] start app=${app_id} db=${PGDATABASE} host=${PGHOST}:${PGPORT} retention_days=%d ts=${ts}"
pg_dump --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="${PGDATABASE}" --format=custom --file="${dump_file}"
dump_size_bytes="$(wc -c < "${dump_file}")"
echo "[pgdump] dump_complete app=${app_id} file=${dump_file} bytes=${dump_size_bytes}"

sha256sum "${dump_file}" > "${dump_file}.sha256"
echo "[pgdump] checksum_complete app=${app_id} file=${dump_file}.sha256"

deleted_dumps="$(find "${out_dir}" -type f -name '*.dump' -mtime +%d -print -delete | wc -l)"
deleted_checksums="$(find "${out_dir}" -type f -name '*.sha256' -mtime +%d -print -delete | wc -l)"
echo "[pgdump] retention_cleanup app=${app_id} deleted_dumps=${deleted_dumps} deleted_checksums=${deleted_checksums}"

elapsed="$(( $(date +%%s) - start_epoch ))"
echo "[pgdump] done app=${app_id} seconds=${elapsed} file=${dump_file}"
`, appId, appId, appId, cfg.RetentionDays, cfg.RetentionDays, cfg.RetentionDays)

	successfulJobsHistoryLimit := int32(1)
	failedJobsHistoryLimit := int32(3)
	backoffLimit := int32(1)
	ttlSecondsAfterFinished := int32(86400)
	automountServiceAccountToken := false
	fsGroupChangePolicy := corev1.FSGroupChangeOnRootMismatch

	return &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:      cronJobName,
			Namespace: cnpgNamespace,
			Labels: map[string]string{
				managedByLabelKey:      managedByLabelValue,
				backupRoleLabelKey:     backupRoleLabelValue,
				"altinn.studio/app-id": appId,
			},
		},
		Spec: batchv1.CronJobSpec{
			Schedule:                   cfg.Schedule,
			ConcurrencyPolicy:          batchv1.ForbidConcurrent,
			SuccessfulJobsHistoryLimit: &successfulJobsHistoryLimit,
			FailedJobsHistoryLimit:     &failedJobsHistoryLimit,
			JobTemplate: batchv1.JobTemplateSpec{
				Spec: batchv1.JobSpec{
					BackoffLimit:            &backoffLimit,
					TTLSecondsAfterFinished: &ttlSecondsAfterFinished,
					Template: corev1.PodTemplateSpec{
						ObjectMeta: metav1.ObjectMeta{
							Labels: map[string]string{
								managedByLabelKey:      managedByLabelValue,
								backupRoleLabelKey:     backupRoleLabelValue,
								"altinn.studio/app-id": appId,
							},
						},
						Spec: corev1.PodSpec{
							RestartPolicy:                corev1.RestartPolicyNever,
							AutomountServiceAccountToken: &automountServiceAccountToken,
							SecurityContext: &corev1.PodSecurityContext{
								// pg_dump container runs as non-root in the postgres image.
								// Ensure mounted backup PVC is group-writable for the pod.
								FSGroup:             ptr.To(backupFSGroup),
								FSGroupChangePolicy: &fsGroupChangePolicy,
							},
							Containers: []corev1.Container{
								{
									Name:            "pgdump",
									Image:           imageRef,
									ImagePullPolicy: corev1.PullIfNotPresent,
									Command:         []string{"/bin/sh", "-ceu", script},
									Env: []corev1.EnvVar{
										{Name: "PGHOST", Value: host},
										{Name: "PGPORT", Value: "5432"},
										{Name: "PGDATABASE", Value: pgName},
										{Name: "PGUSER", Value: pgName},
										{
											Name: "PGPASSWORD",
											ValueFrom: &corev1.EnvVarSource{
												SecretKeyRef: &corev1.SecretKeySelector{
													LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
													Key:                  "password",
												},
											},
										},
									},
									Resources: corev1.ResourceRequirements{
										Requests: corev1.ResourceList{
											corev1.ResourceCPU:    resource.MustParse("50m"),
											corev1.ResourceMemory: resource.MustParse("128Mi"),
										},
									},
									VolumeMounts: []corev1.VolumeMount{
										{
											Name:      "backups",
											MountPath: "/backups",
										},
									},
								},
							},
							Volumes: []corev1.Volume{
								{
									Name: "backups",
									VolumeSource: corev1.VolumeSource{
										PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
											ClaimName: pvcName,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}, nil
}

// cleanupRemovedBackupCronJobs only removes CronJobs.
// Backup StorageClass/PVC lifecycle is intentionally non-destructive.
func (r *CnpgSyncReconciler) cleanupRemovedBackupCronJobs(ctx context.Context, targetApps map[string]bool) error {
	cronJobList := &batchv1.CronJobList{}
	if err := r.k8sClient.List(ctx, cronJobList,
		client.InNamespace(cnpgNamespace),
		client.MatchingLabels{
			managedByLabelKey:  managedByLabelValue,
			backupRoleLabelKey: backupRoleLabelValue,
		},
	); err != nil {
		return fmt.Errorf("list CronJobs: %w", err)
	}

	for _, cronJob := range cronJobList.Items {
		appId := cronJob.Labels["altinn.studio/app-id"]
		if appId == "" {
			continue
		}
		if targetApps != nil && targetApps[appId] {
			continue
		}
		if err := r.k8sClient.Delete(ctx, &cronJob); err != nil && !apierrors.IsNotFound(err) {
			return fmt.Errorf("delete CronJob %s: %w", cronJob.Name, err)
		}
		r.logger.Info("deleted backup CronJob", "name", cronJob.Name, "appId", appId)
	}

	return nil
}

func backupPVCName(baseName, appId string) (string, error) {
	name := fmt.Sprintf("%s-%s", baseName, appId)
	if errs := validation.IsDNS1123Label(name); len(errs) > 0 {
		return "", fmt.Errorf("invalid backup PVC name %q: %s", name, strings.Join(errs, ", "))
	}
	return name, nil
}

// getTargetApps returns the apps for the current operator context, or nil if not targeted.
func (r *CnpgSyncReconciler) getTargetApps() []string {
	target := r.getCurrentTarget()
	if target == nil {
		return nil
	}
	return target.Apps
}

func (r *CnpgSyncReconciler) getCurrentTarget() *CnpgTarget {
	opCtx := r.runtime.GetOperatorContext()
	for i := range r.targets {
		target := &r.targets[i]
		if target.ServiceOwnerId == opCtx.ServiceOwner.Id && target.Environment == opCtx.Environment {
			return target
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

type resolvedBackupConfig struct {
	Schedule         string
	RetentionDays    int
	PvcName          string
	PvcSize          string
	StorageClassName string
}

func (r *CnpgSyncReconciler) resolveBackupConfig() (*resolvedBackupConfig, error) {
	target := r.getCurrentTarget()
	if target == nil || target.Backup == nil || !target.Backup.Enabled {
		return nil, nil
	}

	cfg := target.Backup
	schedule := strings.TrimSpace(cfg.Schedule)
	pvcName := strings.TrimSpace(cfg.PvcName)
	pvcSize := strings.TrimSpace(cfg.PvcSize)
	storageClassName := strings.TrimSpace(cfg.StorageClassName)

	if schedule == "" {
		return nil, fmt.Errorf("backup schedule must be specified")
	}
	if cfg.RetentionDays < 1 {
		return nil, fmt.Errorf("backup retentionDays must be >= 1")
	}
	if pvcName == "" {
		return nil, fmt.Errorf("backup pvcName must be specified")
	}
	if pvcSize == "" {
		return nil, fmt.Errorf("backup pvcSize must be specified")
	}
	if storageClassName == "" {
		return nil, fmt.Errorf("backup storageClassName must be specified")
	}

	resolved := &resolvedBackupConfig{
		Schedule:         schedule,
		RetentionDays:    cfg.RetentionDays,
		PvcName:          pvcName,
		PvcSize:          pvcSize,
		StorageClassName: storageClassName,
	}

	if _, err := resource.ParseQuantity(resolved.PvcSize); err != nil {
		return nil, fmt.Errorf("invalid backup pvc size %q: %w", resolved.PvcSize, err)
	}

	return resolved, nil
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
	connectionLimit := int64(connectionsPerApp)
	if scale, ok := clusterScaleForEnvironment(r.runtime.GetOperatorContext().Environment); ok {
		connectionLimit = int64(scaleInt(connectionsPerApp, scale))
	}

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
			ConnectionLimit: connectionLimit,
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
			if err := r.k8sClient.Get(
				ctx,
				client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace},
				cluster,
			); err != nil {
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
func (r *CnpgSyncReconciler) syncDatabaseSecret(
	ctx context.Context,
	opCtx *operatorcontext.Context,
	appId string,
) error {
	// Read password from our secret
	passwordSecretName := fmt.Sprintf(passwordSecretNameFormat, appId)
	passwordSecret := &corev1.Secret{}
	if err := r.k8sClient.Get(
		ctx,
		client.ObjectKey{Name: passwordSecretName, Namespace: cnpgNamespace},
		passwordSecret,
	); err != nil {
		return fmt.Errorf("get password secret: %w", err)
	}
	password := string(passwordSecret.Data["password"])

	// Build connection string
	pgName := sanitizePostgresIdentifier(appId)
	host := fmt.Sprintf("%s-rw.%s.svc.cluster.local", clusterName, cnpgNamespace)
	connStr := fmt.Sprintf(
		"Host=%s;Port=5432;Database=%s;Username=%s;Password=%s;Application Name=%s;Maximum Pool Size=%d;Tcp Keepalive=true",
		host,
		pgName,
		pgName,
		password,
		appId,
		connectionsPerApp,
	)

	// Find app secret
	appSecretName := fmt.Sprintf("%s-%s-deployment-secrets", opCtx.ServiceOwner.Id, appId)
	appNamespace := "default"

	appSecret := &corev1.Secret{}
	if err := r.k8sClient.Get(
		ctx,
		client.ObjectKey{Name: appSecretName, Namespace: appNamespace},
		appSecret,
	); err != nil {
		if apierrors.IsNotFound(err) {
			r.logger.Info(
				"app secret not found, skipping",
				"appId",
				appId,
				"secretName",
				appSecretName,
				"namespace",
				appNamespace,
			)
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
func (r *CnpgSyncReconciler) updateAppSecretWithRetry(
	ctx context.Context,
	appSecret *corev1.Secret,
	postgresJson []byte,
) error {
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

		if err := r.k8sClient.Get(
			ctx,
			client.ObjectKey{Name: appSecret.Name, Namespace: appSecret.Namespace},
			appSecret,
		); err != nil {
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
		if err := r.k8sClient.Get(
			ctx,
			client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace},
			cluster,
		); err != nil {
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

func (r *CnpgSyncReconciler) removePostgresqlJsonFromAppSecret(
	ctx context.Context,
	opCtx *operatorcontext.Context,
	appId string,
) error {
	appSecretName := fmt.Sprintf("%s-%s-deployment-secrets", opCtx.ServiceOwner.Id, appId)
	appNamespace := "default"

	appSecret := &corev1.Secret{}
	if err := r.k8sClient.Get(
		ctx,
		client.ObjectKey{Name: appSecretName, Namespace: appNamespace},
		appSecret,
	); err != nil {
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
	return fmt.Errorf(
		"failed to remove postgresql.json from app secret after %d attempts due to conflicts",
		maxUpdateRetries,
	)
}
