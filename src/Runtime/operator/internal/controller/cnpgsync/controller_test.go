package cnpgsync

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	. "github.com/onsi/gomega"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"altinn.studio/operator/internal"
	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/cnpgapi"
	"altinn.studio/operator/internal/operatorcontext"
)

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	return newFakeK8sClientWithInterceptors(interceptor.Funcs{}, initObjs...)
}

func newFakeK8sClientWithInterceptors(interceptorFuncs interceptor.Funcs, initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	for _, add := range []func(*k8sruntime.Scheme) error{
		corev1.AddToScheme,
		batchv1.AddToScheme,
		storagev1.AddToScheme,
		helmv2.AddToScheme,
		sourcev1.AddToScheme,
		cnpgapi.AddToScheme,
	} {
		if err := add(scheme); err != nil {
			panic(err)
		}
	}
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithInterceptorFuncs(interceptorFuncs).
		WithObjects(initObjs...).
		WithStatusSubresource(&helmv2.HelmRelease{}, cnpgapi.NewCluster("", ""), cnpgapi.NewDatabase("", "")).
		Build()
}

type testHarness struct {
	reconciler *CnpgSyncReconciler
	k8sClient  client.Client
}

func (h *testHarness) setHelmReleaseReady(t *testing.T) {
	t.Helper()
	release := &helmv2.HelmRelease{}
	err := h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}, release)
	if err != nil {
		t.Fatalf("failed to get HelmRelease: %v", err)
	}
	release.Status.Conditions = []metav1.Condition{
		{
			Type:   "Ready",
			Status: metav1.ConditionTrue,
		},
	}
	if err := h.k8sClient.Status().Update(h.ctx(), release); err != nil {
		t.Fatalf("failed to update HelmRelease status: %v", err)
	}
}

func newTestHarness(t *testing.T, environment string, targets []CnpgTarget) *testHarness {
	t.Helper()

	return newTestHarnessWithClient(t, environment, targets, newFakeK8sClient())
}

func newTestHarnessWithClient(
	t *testing.T,
	environment string,
	targets []CnpgTarget,
	k8sClient client.Client,
) *testHarness {
	t.Helper()

	clock := opclock.NewFakeClock()

	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			ServiceOwner: operatorcontext.ServiceOwner{Id: "ttd"},
			Environment:  environment,
		}),
	)
	if err != nil {
		t.Fatalf("failed to create runtime: %v", err)
	}

	return &testHarness{
		reconciler: NewReconcilerForTesting(rt, k8sClient, targets),
		k8sClient:  k8sClient,
	}
}

func (*testHarness) ctx() context.Context {
	return context.Background()
}

func getImageCatalog(g *WithT, h *testHarness) *unstructured.Unstructured {
	catalog := cnpgapi.NewImageCatalog(cnpgNamespace, imageCatalogName)
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: imageCatalogName, Namespace: cnpgNamespace}, catalog)).
		To(Succeed())
	return catalog
}

func getCluster(g *WithT, h *testHarness) *unstructured.Unstructured {
	cluster := cnpgapi.NewCluster(cnpgNamespace, clusterName)
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	return cluster
}

func getDatabase(g *WithT, h *testHarness, name string) *unstructured.Unstructured {
	db := cnpgapi.NewDatabase(cnpgNamespace, name)
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: name, Namespace: cnpgNamespace}, db)).To(Succeed())
	return db
}

func setClusterReconciledRoles(g *WithT, h *testHarness, cluster *unstructured.Unstructured, roles ...string) {
	ensureObjectMap(cluster, "status")
	g.Expect(unstructured.SetNestedStringSlice(
		cluster.Object,
		roles,
		"status",
		"managedRolesStatus",
		"byStatus",
		cnpgapi.RoleStatusReconciled,
	)).To(Succeed())
	g.Expect(h.k8sClient.Status().Update(h.ctx(), cluster)).To(Succeed())
}

func setDatabaseApplied(g *WithT, h *testHarness, db *unstructured.Unstructured) {
	ensureObjectMap(db, "status")
	g.Expect(unstructured.SetNestedField(db.Object, true, "status", "applied")).To(Succeed())
	g.Expect(h.k8sClient.Status().Update(h.ctx(), db)).To(Succeed())
}

func ensureObjectMap(obj *unstructured.Unstructured, field string) {
	if _, ok := obj.Object[field].(map[string]any); !ok {
		obj.Object[field] = map[string]any{}
	}
}

func setManagedRolesInMemory(g *WithT, cluster *unstructured.Unstructured, roles ...map[string]any) {
	items := make([]any, 0, len(roles))
	for _, role := range roles {
		items = append(items, role)
	}
	g.Expect(unstructured.SetNestedSlice(cluster.Object, items, "spec", "managed", "roles")).To(Succeed())
}

func managedRoles(g *WithT, cluster *unstructured.Unstructured) []any {
	roles, found, err := unstructured.NestedSlice(cluster.Object, "spec", "managed", "roles")
	g.Expect(err).NotTo(HaveOccurred())
	if !found {
		return nil
	}
	return roles
}

func firstRole(g *WithT, cluster *unstructured.Unstructured) map[string]any {
	roles := managedRoles(g, cluster)
	g.Expect(roles).NotTo(BeEmpty())
	role, ok := roles[0].(map[string]any)
	g.Expect(ok).To(BeTrue())
	return role
}

func nestedString(g *WithT, obj *unstructured.Unstructured, fields ...string) string {
	value, found, err := unstructured.NestedString(obj.Object, fields...)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(found).To(BeTrue())
	return value
}

func nestedMap(g *WithT, obj *unstructured.Unstructured, fields ...string) map[string]any {
	value, found, err := unstructured.NestedMap(obj.Object, fields...)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(found).To(BeTrue())
	return value
}

func nestedSlice(g *WithT, obj *unstructured.Unstructured, fields ...string) []any {
	value, found, err := unstructured.NestedSlice(obj.Object, fields...)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(found).To(BeTrue())
	return value
}

func nestedInt64(g *WithT, obj *unstructured.Unstructured, fields ...string) int64 {
	value, found, err := unstructured.NestedInt64(obj.Object, fields...)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(found).To(BeTrue())
	return value
}

func nestedBool(g *WithT, obj *unstructured.Unstructured, fields ...string) bool {
	value, found, err := unstructured.NestedBool(obj.Object, fields...)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(found).To(BeTrue())
	return value
}

func (h *testHarness) mustSyncAll(g *WithT) {
	_, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
}

func assertCatalogProxyPrefix(t *testing.T, environment string, wantProxy bool) {
	t.Helper()

	g := NewWithT(t)
	h := newTestHarness(t, environment, []CnpgTarget{{ServiceOwnerId: "ttd", Environment: environment}})

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	h.setHelmReleaseReady(t)

	needsRetry, err = h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	catalog := getImageCatalog(g, h)
	images, found, err := unstructured.NestedSlice(catalog.Object, "spec", "images")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(found).To(BeTrue())
	g.Expect(images).NotTo(BeEmpty())
	image, ok := images[0].(map[string]any)
	g.Expect(ok).To(BeTrue())
	imageName, ok := image["image"].(string)
	g.Expect(ok).To(BeTrue())
	if wantProxy {
		g.Expect(imageName).To(HavePrefix(proxyRegistryPrefix))
		return
	}

	g.Expect(imageName).NotTo(HavePrefix(proxyRegistryPrefix))
}

func assertNamespaceCleanupBehavior(t *testing.T, labels map[string]string, wantDeleted bool) {
	t.Helper()

	g := NewWithT(t)
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   cnpgNamespace,
			Labels: labels,
		},
	}
	k8sClient := newFakeK8sClient(ns)
	clock := opclock.NewFakeClock()

	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			ServiceOwner: operatorcontext.ServiceOwner{Id: "ttd"},
			Environment:  "localtest",
		}),
	)
	g.Expect(err).NotTo(HaveOccurred())

	reconciler := NewReconcilerForTesting(rt, k8sClient, []CnpgTarget{{ServiceOwnerId: "other", Environment: "prod"}})
	needsRetry, err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	err = k8sClient.Get(context.Background(), client.ObjectKey{Name: cnpgNamespace}, &corev1.Namespace{})
	if wantDeleted {
		g.Expect(err).To(HaveOccurred())
		return
	}

	g.Expect(err).NotTo(HaveOccurred())
}

func TestReconciler_NeedLeaderElection(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "localtest", nil)
	g.Expect(h.reconciler.NeedLeaderElection()).To(BeTrue())
}

func TestReconciler_SkipsWhenNotTargeted(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "other", Environment: "prod"}}
	h := newTestHarness(t, "localtest", targets)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	ns := &corev1.Namespace{}
	err = h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: cnpgNamespace}, ns)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_CreatesResourcesWhenTargeted(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "tt02"}}
	h := newTestHarness(t, "tt02", targets)

	// First sync creates HelmRelease but not CNPG resources (not ready yet)
	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	// Verify resources created
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: cnpgNamespace}, &corev1.Namespace{})).To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: cnpgRepoName, Namespace: cnpgNamespace}, &sourcev1.HelmRepository{})).
		To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}, &helmv2.HelmRelease{})).
		To(Succeed())

	// Simulate HelmRelease becoming ready, then sync again
	h.setHelmReleaseReady(t)
	needsRetry, err = h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Verify CNPG resources created
	getImageCatalog(g, h)
	getCluster(g, h)
}

func TestReconciler_UsesLocalStorageClassForLocal(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "localtest", []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest"}})

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())
	h.setHelmReleaseReady(t)
	needsRetry, err = h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	cluster := getCluster(g, h)
	g.Expect(nestedString(g, cluster, "spec", "storage", "storageClass")).To(Equal(storageClassName))
}

func TestReconciler_UsesScaledClusterConfigForProd(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(
		t,
		"prod",
		[]CnpgTarget{{ServiceOwnerId: "ttd", Environment: "prod", Apps: []string{"testapp"}}},
	)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())
	h.setHelmReleaseReady(t)
	needsRetry, err = h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	cluster := getCluster(g, h)

	g.Expect(nestedInt64(g, cluster, "spec", "instances")).To(Equal(int64(1)))
	g.Expect(nestedBool(g, cluster, "spec", "enablePDB")).To(BeFalse())
	g.Expect(nestedString(g, cluster, "spec", "storage", "size")).To(Equal("8Gi"))
	g.Expect(nestedString(g, cluster, "spec", "walStorage", "size")).To(Equal("2Gi"))
	g.Expect(nestedString(g, cluster, "spec", "resources", "requests", "cpu")).To(Equal("200m"))
	g.Expect(nestedString(g, cluster, "spec", "resources", "requests", "memory")).To(Equal("2Gi"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "max_connections")).To(Equal("126"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "superuser_reserved_connections")).
		To(Equal("6"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "shared_buffers")).To(Equal("512MB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "effective_cache_size")).To(Equal("1536MB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "work_mem")).To(Equal("4854kB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "maintenance_work_mem")).To(Equal("128MB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "wal_buffers")).To(Equal("7864kB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "min_wal_size")).To(Equal("512MB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "max_wal_size")).To(Equal("1GB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "wal_writer_flush_after")).To(Equal("2MB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "checkpoint_flush_after")).To(Equal("2MB"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "autovacuum_vacuum_cost_limit")).
		To(Equal("2400"))
	g.Expect(nestedString(g, cluster, "spec", "postgresql", "parameters", "pg_stat_statements.max")).To(Equal("1000"))
}

func TestReconciler_UsesProxyRegistryForNonLocal(t *testing.T) {
	assertCatalogProxyPrefix(t, "tt02", true)
}

func TestReconciler_UsesDirectRegistryForLocal(t *testing.T) {
	assertCatalogProxyPrefix(t, "localtest", false)
}

func TestReconciler_BuildsImageCatalogWithCNPGJSONShape(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "localtest", []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest"}})

	catalog, err := h.reconciler.buildImageCatalog()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(catalog.GetName()).To(Equal(imageCatalogName))
	g.Expect(catalog.GetNamespace()).To(Equal(cnpgNamespace))
	g.Expect(catalog.GetLabels()).To(Equal(map[string]string{managedByLabelKey: managedByLabelValue}))

	images := nestedSlice(g, catalog, "spec", "images")
	g.Expect(images).To(Equal([]any{
		map[string]any{"major": int64(17), "image": "ghcr.io/cloudnative-pg/postgresql:17.7-standard-trixie"},
		map[string]any{"major": int64(18), "image": "ghcr.io/cloudnative-pg/postgresql:18.1-standard-trixie"},
	}))
}

func TestReconciler_BuildsClusterWithCNPGJSONShape(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "localtest", []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest"}})

	cluster := h.reconciler.buildCluster(1)
	g.Expect(cluster).NotTo(BeNil())
	g.Expect(cluster.GetName()).To(Equal(clusterName))
	g.Expect(cluster.GetNamespace()).To(Equal(cnpgNamespace))
	g.Expect(cluster.GetLabels()).To(Equal(map[string]string{managedByLabelKey: managedByLabelValue}))

	spec := nestedMap(g, cluster, "spec")
	g.Expect(spec).NotTo(HaveKey("managed"))
	g.Expect(spec).NotTo(HaveKey("failoverDelay"))
	g.Expect(spec).NotTo(HaveKey("maxSyncReplicas"))
	g.Expect(spec).NotTo(HaveKey("minSyncReplicas"))
	g.Expect(nestedInt64(g, cluster, "spec", "instances")).To(Equal(int64(1)))
	g.Expect(nestedBool(g, cluster, "spec", "enablePDB")).To(BeFalse())
	g.Expect(nestedBool(g, cluster, "spec", "enableSuperuserAccess")).To(BeTrue())
	g.Expect(nestedString(g, cluster, "spec", "bootstrap", "initdb", "encoding")).To(Equal("UTF8"))
	g.Expect(nestedString(g, cluster, "spec", "imageCatalogRef", "apiGroup")).To(Equal("postgresql.cnpg.io"))
	g.Expect(nestedString(g, cluster, "spec", "imageCatalogRef", "kind")).To(Equal("ImageCatalog"))
	g.Expect(nestedString(g, cluster, "spec", "imageCatalogRef", "name")).To(Equal(imageCatalogName))
	g.Expect(nestedInt64(g, cluster, "spec", "imageCatalogRef", "major")).To(Equal(int64(18)))
	g.Expect(nestedString(g, cluster, "spec", "storage", "storageClass")).To(Equal(storageClassName))
	g.Expect(nestedString(g, cluster, "spec", "storage", "size")).To(Equal("4Gi"))
	g.Expect(nestedString(g, cluster, "spec", "walStorage", "storageClass")).To(Equal(storageClassName))
	g.Expect(nestedString(g, cluster, "spec", "walStorage", "size")).To(Equal("2Gi"))
	g.Expect(nestedString(g, cluster, "spec", "resources", "requests", "cpu")).To(Equal("100m"))
	g.Expect(nestedString(g, cluster, "spec", "resources", "requests", "memory")).To(Equal("1Gi"))

	constraints := nestedSlice(g, cluster, "spec", "topologySpreadConstraints")
	g.Expect(constraints).To(HaveLen(1))
	constraint, ok := constraints[0].(map[string]any)
	g.Expect(ok).To(BeTrue())
	g.Expect(constraint["maxSkew"]).To(Equal(int64(1)))
	g.Expect(constraint["topologyKey"]).To(Equal("topology.kubernetes.io/zone"))
	g.Expect(constraint["whenUnsatisfiable"]).To(Equal("DoNotSchedule"))
}

func TestReconciler_SkipsClusterUpdateForDefaultedCNPGFields(t *testing.T) {
	g := NewWithT(t)
	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	liveHarness := newTestHarness(t, "localtest", targets)
	liveCluster := liveHarness.reconciler.buildCluster(1)
	g.Expect(liveCluster).NotTo(BeNil())

	spec := nestedMap(g, liveCluster, "spec")
	spec["failoverDelay"] = int64(0)
	spec["maxSyncReplicas"] = int64(0)
	spec["minSyncReplicas"] = int64(0)
	spec["monitoring"] = map[string]any{"enablePodMonitor": false}
	spec["logLevel"] = "info"
	spec["postgresUID"] = int64(26)
	spec["postgresGID"] = int64(26)
	spec["replicationSlots"] = map[string]any{
		"highAvailability": map[string]any{
			"enabled":    true,
			"slotPrefix": "_cnpg_",
		},
	}
	spec["probes"] = map[string]any{
		"liveness": map[string]any{
			"isolationCheck": map[string]any{
				"enabled":           true,
				"connectionTimeout": int64(1000),
				"requestTimeout":    int64(1000),
			},
		},
	}
	bootstrap, ok := spec["bootstrap"].(map[string]any)
	g.Expect(ok).To(BeTrue())
	initdb, ok := bootstrap["initdb"].(map[string]any)
	g.Expect(ok).To(BeTrue())
	initdb["database"] = "app"
	initdb["owner"] = "app"
	storage, ok := spec["storage"].(map[string]any)
	g.Expect(ok).To(BeTrue())
	storage["resizeInUseVolumes"] = true
	walStorage, ok := spec["walStorage"].(map[string]any)
	g.Expect(ok).To(BeTrue())
	walStorage["resizeInUseVolumes"] = true
	postgresql, ok := spec["postgresql"].(map[string]any)
	g.Expect(ok).To(BeTrue())
	parameters, ok := postgresql["parameters"].(map[string]any)
	g.Expect(ok).To(BeTrue())
	parameters["archive_mode"] = "on"
	parameters["log_destination"] = "csvlog"
	g.Expect(cnpgapi.SetSpec(liveCluster, spec)).To(Succeed())
	setManagedRolesInMemory(g, liveCluster, map[string]any{
		"name":  "testapp",
		"login": true,
		"passwordSecret": map[string]any{
			"name": "pg-apps-cluster-testapp-password",
		},
	})

	updateCalls := 0
	k8sClient := newFakeK8sClientWithInterceptors(
		interceptor.Funcs{
			Update: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
				updateCalls++
				return c.Update(ctx, obj, opts...)
			},
		},
		liveCluster,
	)
	h := newTestHarnessWithClient(t, "localtest", targets, k8sClient)

	g.Expect(h.reconciler.ensureCluster(h.ctx())).To(Succeed())
	g.Expect(updateCalls).To(Equal(0))
}

func TestReconciler_UpdatesClusterWhenOwnedSpecFieldDiffers(t *testing.T) {
	g := NewWithT(t)
	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	liveHarness := newTestHarness(t, "localtest", targets)
	liveCluster := liveHarness.reconciler.buildCluster(1)
	g.Expect(liveCluster).NotTo(BeNil())

	storage := nestedMap(g, liveCluster, "spec", "storage")
	storage["size"] = "8Gi"
	g.Expect(unstructured.SetNestedMap(liveCluster.Object, storage, "spec", "storage")).To(Succeed())
	setManagedRolesInMemory(g, liveCluster, map[string]any{
		"name":  "testapp",
		"login": true,
		"passwordSecret": map[string]any{
			"name": "pg-apps-cluster-testapp-password",
		},
	})

	updateCalls := 0
	k8sClient := newFakeK8sClientWithInterceptors(
		interceptor.Funcs{
			Update: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
				updateCalls++
				return c.Update(ctx, obj, opts...)
			},
		},
		liveCluster,
	)
	h := newTestHarnessWithClient(t, "localtest", targets, k8sClient)

	g.Expect(h.reconciler.ensureCluster(h.ctx())).To(Succeed())
	g.Expect(updateCalls).To(Equal(1))
	cluster := getCluster(g, h)
	g.Expect(nestedString(g, cluster, "spec", "storage", "size")).To(Equal("4Gi"))
	role := firstRole(g, cluster)
	g.Expect(role["name"]).To(Equal("testapp"))
}

func TestReconciler_CreatesDatabaseWithCNPGJSONShape(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "localtest", []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest"}})

	ready, err := h.reconciler.ensureDatabase(h.ctx(), "testapp")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(ready).To(BeFalse())

	db := getDatabase(g, h, "db-testapp")
	g.Expect(db.GetLabels()).To(Equal(map[string]string{
		managedByLabelKey:      managedByLabelValue,
		"altinn.studio/app-id": "testapp",
	}))
	g.Expect(nestedMap(g, db, "spec")).To(Equal(map[string]any{
		"cluster":               map[string]any{"name": clusterName},
		"name":                  "testapp",
		"owner":                 "testapp",
		"databaseReclaimPolicy": cnpgapi.ReclaimDelete,
	}))
}

func TestReconciler_DeletesNamespaceWhenNotTargeted(t *testing.T) {
	assertNamespaceCleanupBehavior(t, map[string]string{"app.kubernetes.io/managed-by": "altinn-studio-operator"}, true)
}

func TestReconciler_SkipsNamespaceDeletionIfNotManagedByUs(t *testing.T) {
	assertNamespaceCleanupBehavior(t, map[string]string{"app.kubernetes.io/managed-by": "someone-else"}, false)
}

func TestReconciler_DeletesClusterWhenBuildClusterReturnsNil(t *testing.T) {
	g := NewWithT(t)

	// Create cluster that should be deleted (environment doesn't support cluster)
	cluster := cnpgapi.NewCluster(cnpgNamespace, clusterName)
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
		},
	}
	k8sClient := newFakeK8sClient(ns, cluster)
	clock := opclock.NewFakeClock()

	// Use unsupported environment where buildCluster returns nil
	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			ServiceOwner: operatorcontext.ServiceOwner{Id: "ttd"},
			Environment:  "staging",
		}),
	)
	g.Expect(err).NotTo(HaveOccurred())

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "staging"}}
	reconciler := NewReconcilerForTesting(rt, k8sClient, targets)

	// First sync - creates HelmRelease
	_, err = reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())

	// Set HelmRelease ready
	release := &helmv2.HelmRelease{}
	g.Expect(k8sClient.Get(context.Background(), client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}, release)).
		To(Succeed())
	release.Status.Conditions = []metav1.Condition{{Type: "Ready", Status: metav1.ConditionTrue}}
	g.Expect(k8sClient.Status().Update(context.Background(), release)).To(Succeed())

	// Second sync - should delete cluster since buildCluster returns nil for unsupported env
	needsRetry, err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Cluster should be deleted
	err = k8sClient.Get(
		context.Background(),
		client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace},
		cnpgapi.NewCluster(cnpgNamespace, clusterName),
	)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_CreatesPasswordSecretForApp(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// First sync creates Helm resources
	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	// Second sync creates CNPG resources and password secret
	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue()) // Role not reconciled yet

	// Password secret should be created
	secret := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "pg-apps-cluster-testapp-password", Namespace: cnpgNamespace}, secret)).
		To(Succeed())
	g.Expect(secret.Data).To(HaveKey("password"))
	g.Expect(len(secret.Data["password"])).To(BeNumerically(">=", 20))
}

func TestReconciler_AddsManagedRoleToCluster(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// First sync creates Helm resources
	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	// Second sync creates CNPG resources and adds role
	_, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())

	// Cluster should have managed role
	cluster := getCluster(g, h)
	role := firstRole(g, cluster)
	g.Expect(role["name"]).To(Equal("testapp"))
	g.Expect(role["login"]).To(Equal(true))
	passwordSecret, ok := role["passwordSecret"].(map[string]any)
	g.Expect(ok).To(BeTrue())
	g.Expect(passwordSecret["name"]).To(Equal("pg-apps-cluster-testapp-password"))
}

func TestReconciler_ManagedRoleConflictDefersStatusCheckUntilNextSync(t *testing.T) {
	g := NewWithT(t)

	cluster := cnpgapi.NewCluster(cnpgNamespace, clusterName)
	conflictInjected := false
	k8sClient := newFakeK8sClientWithInterceptors(
		interceptor.Funcs{
			Update: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
				if conflictInjected || obj.GetNamespace() != cnpgNamespace || obj.GetName() != clusterName {
					return c.Update(ctx, obj, opts...)
				}

				conflictInjected = true
				liveCluster := cnpgapi.NewCluster(cnpgNamespace, clusterName)
				if err := c.Get(
					ctx,
					client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace},
					liveCluster,
				); err != nil {
					return fmt.Errorf("get live cluster: %w", err)
				}
				if err := unstructured.SetNestedSlice(liveCluster.Object, []any{
					map[string]any{
						"name":  "testapp",
						"login": true,
						"passwordSecret": map[string]any{
							"name": "pg-apps-cluster-testapp-password",
						},
					},
				}, "spec", "managed", "roles"); err != nil {
					return fmt.Errorf("set live cluster managed roles: %w", err)
				}
				if err := c.Update(ctx, liveCluster); err != nil {
					return fmt.Errorf("update live cluster: %w", err)
				}
				ensureObjectMap(liveCluster, "status")
				if err := unstructured.SetNestedStringSlice(
					liveCluster.Object,
					[]string{"testapp"},
					"status",
					"managedRolesStatus",
					"byStatus",
					cnpgapi.RoleStatusReconciled,
				); err != nil {
					return fmt.Errorf("set live cluster status: %w", err)
				}
				if err := c.Status().Update(ctx, liveCluster); err != nil {
					return fmt.Errorf("update live cluster status: %w", err)
				}
				return apierrors.NewConflict(
					schema.GroupResource{Group: "postgresql.cnpg.io", Resource: "clusters"},
					obj.GetName(),
					nil,
				)
			},
		},
		cluster,
	)
	h := newTestHarnessWithClient(
		t,
		"localtest",
		[]CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}},
		k8sClient,
	)

	ready, err := h.reconciler.ensureManagedRole(h.ctx(), "testapp")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(conflictInjected).To(BeTrue())
	g.Expect(ready).To(BeFalse())
}

func TestReconciler_RemoveManagedRoleConflictStopsAfterRefreshWhenRoleAlreadyGone(t *testing.T) {
	g := NewWithT(t)

	cluster := cnpgapi.NewCluster(cnpgNamespace, clusterName)
	setManagedRolesInMemory(g, cluster, map[string]any{"name": "testapp"})
	updateCalls := 0
	k8sClient := newFakeK8sClientWithInterceptors(
		interceptor.Funcs{
			Update: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
				if obj.GetNamespace() != cnpgNamespace || obj.GetName() != clusterName {
					return c.Update(ctx, obj, opts...)
				}

				updateCalls++
				if updateCalls > 1 {
					return c.Update(ctx, obj, opts...)
				}

				liveCluster := cnpgapi.NewCluster(cnpgNamespace, clusterName)
				if err := c.Get(
					ctx,
					client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace},
					liveCluster,
				); err != nil {
					return fmt.Errorf("get live cluster: %w", err)
				}
				unstructured.RemoveNestedField(liveCluster.Object, "spec", "managed", "roles")
				if err := c.Update(ctx, liveCluster); err != nil {
					return fmt.Errorf("update live cluster: %w", err)
				}
				return apierrors.NewConflict(
					schema.GroupResource{Group: "postgresql.cnpg.io", Resource: "clusters"},
					obj.GetName(),
					nil,
				)
			},
		},
		cluster,
	)
	h := newTestHarnessWithClient(t, "localtest", nil, k8sClient)

	err := h.reconciler.removeManagedRole(h.ctx(), "testapp")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(updateCalls).To(Equal(1))
}

func TestReconciler_CreatesDatabaseWhenRoleReconciled(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// Setup cluster and helm release
	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g) // Creates cluster and adds role
	h.mustSyncAll(g) // Role added, waiting for reconciliation

	// Simulate role being reconciled by CNPG
	cluster := getCluster(g, h)
	setClusterReconciledRoles(g, h, cluster, "testapp")

	// Sync again - should create database
	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue()) // Database not applied yet

	// Database should be created
	db := getDatabase(g, h, "db-testapp")
	g.Expect(nestedString(g, db, "spec", "name")).To(Equal("testapp"))
	g.Expect(nestedString(g, db, "spec", "owner")).To(Equal("testapp"))
	g.Expect(nestedString(g, db, "spec", "cluster", "name")).To(Equal(clusterName))
}

func TestReconciler_SkipsSecretUpdateWhenAppSecretMissing(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// Setup everything
	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g) // Creates cluster and adds role

	// Simulate role reconciled
	cluster := getCluster(g, h)
	setClusterReconciledRoles(g, h, cluster, "testapp")

	h.mustSyncAll(g) // Creates database

	// Simulate database applied
	db := getDatabase(g, h, "db-testapp")
	setDatabaseApplied(g, h, db)

	// Sync - should not error even though app secret doesn't exist
	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse()) // All resources ready, secret sync just skipped
}

func TestReconciler_UpdatesAppSecretWithConnectionString(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// Create app secret in default namespace
	appSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{
			"existing-key": []byte("existing-value"),
		},
	}
	g.Expect(h.k8sClient.Create(h.ctx(), appSecret)).To(Succeed())

	// Setup everything
	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g) // Creates cluster and adds role

	// Simulate role reconciled
	cluster := getCluster(g, h)
	setClusterReconciledRoles(g, h, cluster, "testapp")

	h.mustSyncAll(g) // Creates database

	// Simulate database applied
	db := getDatabase(g, h, "db-testapp")
	setDatabaseApplied(g, h, db)

	// Sync - should update app secret
	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Verify app secret updated
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "ttd-testapp-deployment-secrets", Namespace: "default"}, appSecret)).
		To(Succeed())
	g.Expect(appSecret.Data).To(HaveKey("existing-key"))    // Preserved
	g.Expect(appSecret.Data).To(HaveKey("postgresql.json")) // Added

	// Verify connection string format (nested under PostgreSQL)
	connJson := string(appSecret.Data["postgresql.json"])
	g.Expect(connJson).To(ContainSubstring(`"PostgreSQL"`))
	g.Expect(connJson).To(ContainSubstring("ConnectionString"))
	g.Expect(connJson).To(ContainSubstring("Host=pg-apps-cluster-rw.runtime-cnpg.svc.cluster.local"))
	g.Expect(connJson).To(ContainSubstring("Database=testapp"))
	g.Expect(connJson).To(ContainSubstring("Username=testapp"))
}

func TestReconciler_UpdatesExistingWorkflowEngineSecret(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{
		ServiceOwnerId:    "ttd",
		Environment:       "localtest",
		WorkflowEngineApp: true,
	}}
	h := newTestHarness(t, "localtest", targets)
	g.Expect(h.k8sClient.Create(h.ctx(), &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: workflowEngineSecretNamespace},
	})).To(Succeed())

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	passwordSecret := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pg-apps-cluster-workflow-engine-app-password", Namespace: cnpgNamespace},
		passwordSecret,
	)).To(Succeed())
	g.Expect(string(passwordSecret.Data["username"])).To(Equal(workflowEngineDatabaseName))
	g.Expect(passwordSecret.Labels[managedByLabelKey]).To(Equal(managedByLabelValue))
	g.Expect(passwordSecret.Labels[workflowEngineLabelKey]).To(Equal(workflowEngineLabelValue))

	cluster := getCluster(g, h)
	role := firstRole(g, cluster)
	g.Expect(role["name"]).To(Equal(workflowEngineDatabaseName))

	setClusterReconciledRoles(g, h, cluster, workflowEngineDatabaseName)

	h.mustSyncAll(g)

	db := getDatabase(g, h, "db-workflow-engine-app")
	g.Expect(nestedString(g, db, "spec", "name")).To(Equal(workflowEngineDatabaseName))
	g.Expect(nestedString(g, db, "spec", "owner")).To(Equal(workflowEngineDatabaseName))
	g.Expect(db.GetLabels()[workflowEngineLabelKey]).To(Equal(workflowEngineLabelValue))
	setDatabaseApplied(g, h, db)

	workflowSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      workflowEngineSecretName,
			Namespace: workflowEngineSecretNamespace,
		},
		Data: map[string][]byte{
			secretsJSONKey: []byte(`{"AppCommandSettings":{"ApiKey":"keep-me"}}`),
			"other-key":    []byte("keep-me"),
		},
	}
	g.Expect(h.k8sClient.Create(h.ctx(), workflowSecret)).To(Succeed())

	h.mustSyncAll(g)

	g.Expect(h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: workflowEngineSecretName, Namespace: workflowEngineSecretNamespace},
		workflowSecret,
	)).To(Succeed())
	g.Expect(workflowSecret.Data["other-key"]).To(Equal([]byte("keep-me")))
	g.Expect(workflowSecret.Data).To(HaveKey(secretsJSONKey))

	var payload struct {
		ConnectionStrings  map[string]string `json:"ConnectionStrings"`
		AppCommandSettings map[string]string `json:"AppCommandSettings"`
	}
	g.Expect(json.Unmarshal(workflowSecret.Data[secretsJSONKey], &payload)).To(Succeed())
	g.Expect(payload.ConnectionStrings["WorkflowEngine"]).To(ContainSubstring("Database=workflow_engine"))
	g.Expect(payload.ConnectionStrings["WorkflowEngine"]).To(ContainSubstring("Username=workflow_engine"))
	g.Expect(payload.AppCommandSettings["ApiKey"]).To(Equal("keep-me"))
}

func TestReconciler_DoesNotCreateWorkflowEngineTargetSecret(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{
		ServiceOwnerId:    "ttd",
		Environment:       "localtest",
		WorkflowEngineApp: true,
	}}
	h := newTestHarness(t, "localtest", targets)
	g.Expect(h.k8sClient.Create(h.ctx(), &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: workflowEngineSecretNamespace},
	})).To(Succeed())

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	cluster := getCluster(g, h)
	setClusterReconciledRoles(g, h, cluster, workflowEngineDatabaseName)

	h.mustSyncAll(g)

	db := getDatabase(g, h, "db-workflow-engine-app")
	setDatabaseApplied(g, h, db)

	h.mustSyncAll(g)

	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: workflowEngineSecretName, Namespace: workflowEngineSecretNamespace},
		&corev1.Secret{},
	)
	g.Expect(apierrors.IsNotFound(err)).To(BeTrue())
}

func TestReconciler_CleansUpRemovedWorkflowEngineAppWithoutDeletingSecret(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{
		ServiceOwnerId:    "ttd",
		Environment:       "localtest",
		WorkflowEngineApp: true,
	}}
	h := newTestHarness(t, "localtest", targets)
	g.Expect(h.k8sClient.Create(h.ctx(), &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: workflowEngineSecretNamespace},
	})).To(Succeed())

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g)

	cluster := getCluster(g, h)
	setClusterReconciledRoles(g, h, cluster, workflowEngineDatabaseName)

	h.mustSyncAll(g)

	db := getDatabase(g, h, "db-workflow-engine-app")
	setDatabaseApplied(g, h, db)

	workflowSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      workflowEngineSecretName,
			Namespace: workflowEngineSecretNamespace,
		},
		Data: map[string][]byte{
			secretsJSONKey: []byte(`{"ConnectionStrings":{"WorkflowEngine":"old"}}`),
		},
	}
	g.Expect(h.k8sClient.Create(h.ctx(), workflowSecret)).To(Succeed())

	h.mustSyncAll(g)

	h.reconciler.targets = []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "localtest",
	}}

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "db-workflow-engine-app", Namespace: cnpgNamespace},
		cnpgapi.NewDatabase(cnpgNamespace, "db-workflow-engine-app"),
	)
	g.Expect(err).To(HaveOccurred())

	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pg-apps-cluster-workflow-engine-app-password", Namespace: cnpgNamespace},
		&corev1.Secret{},
	)
	g.Expect(err).To(HaveOccurred())

	g.Expect(h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: workflowEngineSecretName, Namespace: workflowEngineSecretNamespace},
		workflowSecret,
	)).To(Succeed())
}

func TestReconciler_CleansUpPartialWorkflowEngineStateWhenTargetRemoved(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{
		ServiceOwnerId:    "ttd",
		Environment:       "localtest",
		WorkflowEngineApp: true,
	}}
	h := newTestHarness(t, "localtest", targets)

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	passwordSecret := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pg-apps-cluster-workflow-engine-app-password", Namespace: cnpgNamespace},
		passwordSecret,
	)).To(Succeed())

	cluster := getCluster(g, h)
	role := firstRole(g, cluster)
	g.Expect(role["name"]).To(Equal(workflowEngineDatabaseName))

	h.reconciler.targets = []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "localtest",
	}}

	needsRetry, err = h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pg-apps-cluster-workflow-engine-app-password", Namespace: cnpgNamespace},
		&corev1.Secret{},
	)
	g.Expect(apierrors.IsNotFound(err)).To(BeTrue())

	cluster = getCluster(g, h)
	g.Expect(managedRoles(g, cluster)).To(BeEmpty())
}

func TestReconciler_DoesNotDeleteUnmanagedWorkflowEngineDatabaseAfterCreatingPasswordSecret(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{
		ServiceOwnerId:    "ttd",
		Environment:       "localtest",
		WorkflowEngineApp: true,
	}}
	h := newTestHarness(t, "localtest", targets)

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	unmanagedDatabase := cnpgapi.NewDatabase(cnpgNamespace, "db-workflow-engine-app")
	unmanagedDatabase.SetLabels(map[string]string{managedByLabelKey: "someone-else"})
	g.Expect(h.k8sClient.Create(h.ctx(), unmanagedDatabase)).To(Succeed())

	h.reconciler.targets = []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "localtest",
	}}

	needsRetry, err = h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	g.Expect(h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "db-workflow-engine-app", Namespace: cnpgNamespace},
		cnpgapi.NewDatabase(cnpgNamespace, "db-workflow-engine-app"),
	)).To(Succeed())

	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pg-apps-cluster-workflow-engine-app-password", Namespace: cnpgNamespace},
		&corev1.Secret{},
	)
	g.Expect(apierrors.IsNotFound(err)).To(BeTrue())

	cluster := getCluster(g, h)
	g.Expect(managedRoles(g, cluster)).To(BeEmpty())
}

func TestReconciler_DoesNotAdoptExistingWorkflowEnginePasswordSecretOrRole(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{
		ServiceOwnerId:    "ttd",
		Environment:       "localtest",
		WorkflowEngineApp: true,
	}}
	h := newTestHarness(t, "localtest", targets)

	passwordSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "pg-apps-cluster-workflow-engine-app-password",
			Namespace: cnpgNamespace,
		},
		Data: map[string][]byte{
			"username": []byte("workflow_engine"),
			"password": []byte("not-ours"),
		},
	}
	g.Expect(h.k8sClient.Create(h.ctx(), passwordSecret)).To(Succeed())

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g)

	cluster := getCluster(g, h)
	setManagedRolesInMemory(g, cluster, map[string]any{
		"name": workflowEngineDatabaseName,
		"passwordSecret": map[string]any{
			"name": "pg-apps-cluster-workflow-engine-app-password",
		},
	})
	g.Expect(h.k8sClient.Update(h.ctx(), cluster)).To(Succeed())

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "db-workflow-engine-app", Namespace: cnpgNamespace},
		cnpgapi.NewDatabase(cnpgNamespace, "db-workflow-engine-app"),
	)
	g.Expect(apierrors.IsNotFound(err)).To(BeTrue())

	h.reconciler.targets = []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "localtest",
	}}

	needsRetry, err = h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	g.Expect(h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pg-apps-cluster-workflow-engine-app-password", Namespace: cnpgNamespace},
		&corev1.Secret{},
	)).To(Succeed())

	cluster = getCluster(g, h)
	role := firstRole(g, cluster)
	g.Expect(role["name"]).To(Equal(workflowEngineDatabaseName))
}

func TestReconciler_DoesNotCleanUpUnmanagedWorkflowEngineResources(t *testing.T) {
	g := NewWithT(t)

	h := newTestHarness(t, "localtest", []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "localtest",
	}})

	db := cnpgapi.NewDatabase(cnpgNamespace, "db-workflow-engine-app")
	db.SetLabels(map[string]string{managedByLabelKey: "someone-else"})
	g.Expect(h.k8sClient.Create(h.ctx(), db)).To(Succeed())

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	g.Expect(h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "db-workflow-engine-app", Namespace: cnpgNamespace},
		cnpgapi.NewDatabase(cnpgNamespace, "db-workflow-engine-app"),
	)).To(Succeed())
}

func TestReconciler_NoRetryWhenNoApps(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{}}}
	h := newTestHarness(t, "localtest", targets)

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse()) // No apps means no retry needed
}

func TestReconciler_CleansUpRemovedApp(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// Setup HelmRelease and cluster
	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g) // Creates cluster and adds role

	// Simulate role reconciled
	cluster := getCluster(g, h)
	setClusterReconciledRoles(g, h, cluster, "testapp")

	h.mustSyncAll(g) // Creates database

	// Simulate database applied
	db := getDatabase(g, h, "db-testapp")
	setDatabaseApplied(g, h, db)

	// Create app secret with postgresql.json
	appSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{
			"postgresql.json": []byte(`{"ConnectionString":"test"}`),
		},
	}
	g.Expect(h.k8sClient.Create(h.ctx(), appSecret)).To(Succeed())

	// Verify resources exist before cleanup
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, cnpgapi.NewDatabase(cnpgNamespace, "db-testapp"))).
		To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "pg-apps-cluster-testapp-password", Namespace: cnpgNamespace}, &corev1.Secret{})).
		To(Succeed())

	// Remove app from targets
	h.reconciler.targets = []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{}}}

	// Run cleanup
	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Verify database deleted
	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace},
		cnpgapi.NewDatabase(cnpgNamespace, "db-testapp"),
	)
	g.Expect(err).To(HaveOccurred())

	// Verify role removed from cluster
	cluster = getCluster(g, h)
	g.Expect(managedRoles(g, cluster)).To(BeEmpty())

	// Verify password secret deleted
	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pg-apps-cluster-testapp-password", Namespace: cnpgNamespace},
		&corev1.Secret{},
	)
	g.Expect(err).To(HaveOccurred())

	// Verify postgresql.json removed from app secret
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "ttd-testapp-deployment-secrets", Namespace: "default"}, appSecret)).
		To(Succeed())
	g.Expect(appSecret.Data).NotTo(HaveKey("postgresql.json"))
}

func TestReconciler_SanitizesHyphenatedAppId(t *testing.T) {
	g := NewWithT(t)

	// Use hyphenated app ID to verify PostgreSQL identifier sanitization
	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"my-test-app"}}}
	h := newTestHarness(t, "localtest", targets)

	// Create app secret
	appSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-my-test-app-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{},
	}
	g.Expect(h.k8sClient.Create(h.ctx(), appSecret)).To(Succeed())

	// Setup
	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g) // Creates cluster and adds role

	// Verify K8s resource names keep hyphens
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "pg-apps-cluster-my-test-app-password", Namespace: cnpgNamespace}, &corev1.Secret{})).
		To(Succeed())

	// Verify role name is sanitized (underscores)
	cluster := getCluster(g, h)
	role := firstRole(g, cluster)
	g.Expect(role["name"]).To(Equal("my_test_app"))

	// Simulate role reconciled with sanitized name
	setClusterReconciledRoles(g, h, cluster, "my_test_app")

	h.mustSyncAll(g) // Creates database

	// Verify K8s Database resource name keeps hyphens
	db := getDatabase(g, h, "db-my-test-app")

	// Verify PostgreSQL database name and owner are sanitized
	g.Expect(nestedString(g, db, "spec", "name")).To(Equal("my_test_app"))
	g.Expect(nestedString(g, db, "spec", "owner")).To(Equal("my_test_app"))

	// Simulate database applied
	setDatabaseApplied(g, h, db)

	// Sync to update app secret
	h.mustSyncAll(g)

	// Verify connection string uses sanitized names
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "ttd-my-test-app-deployment-secrets", Namespace: "default"}, appSecret)).
		To(Succeed())
	connJson := string(appSecret.Data["postgresql.json"])
	g.Expect(connJson).To(ContainSubstring("Database=my_test_app"))
	g.Expect(connJson).To(ContainSubstring("Username=my_test_app"))
}

func TestReconciler_CreatesBackupResourcesWhenEnabled(t *testing.T) {
	g := NewWithT(t)

	backupCfg := &PgDumpBackupConfig{
		Enabled:          true,
		Schedule:         "0 2 * * *",
		RetentionDays:    7,
		PvcName:          "test-pgdump-backups",
		PvcSize:          "10Gi",
		StorageClassName: backupStorageClass,
	}
	targets := []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "tt02",
		Apps:           []string{"testapp"},
		Backup:         backupCfg,
	}}
	h := newTestHarness(t, "tt02", targets)

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue()) // role/database readiness still pending

	backupSc := &storagev1.StorageClass{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: backupStorageClass}, backupSc)).To(Succeed())
	g.Expect(backupSc.Parameters["skuName"]).To(Equal("StandardSSD_ZRS"))

	pvc := &corev1.PersistentVolumeClaim{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "test-pgdump-backups-testapp", Namespace: cnpgNamespace}, pvc)).
		To(Succeed())
	g.Expect(*pvc.Spec.StorageClassName).To(Equal(backupStorageClass))

	cronJob := &batchv1.CronJob{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "pgdump-testapp", Namespace: cnpgNamespace}, cronJob)).
		To(Succeed())
	g.Expect(cronJob.Spec.Schedule).To(Equal("0 2 * * *"))
	g.Expect(cronJob.Spec.JobTemplate.Spec.Template.Spec.Volumes).To(HaveLen(1))
	g.Expect(cronJob.Spec.JobTemplate.Spec.Template.Spec.Volumes[0].PersistentVolumeClaim.ClaimName).
		To(Equal("test-pgdump-backups-testapp"))
	g.Expect(cronJob.Spec.JobTemplate.Spec.Template.Spec.Containers).To(HaveLen(1))
	g.Expect(cronJob.Spec.JobTemplate.Spec.Template.Spec.Containers[0].Command).To(HaveLen(3))
	g.Expect(cronJob.Spec.JobTemplate.Spec.Template.Spec.Containers[0].Command[2]).
		To(ContainSubstring("[pgdump] start"))
	g.Expect(cronJob.Spec.JobTemplate.Spec.Template.Spec.SecurityContext).NotTo(BeNil())
	g.Expect(cronJob.Spec.JobTemplate.Spec.Template.Spec.SecurityContext.FSGroup).NotTo(BeNil())
	g.Expect(*cronJob.Spec.JobTemplate.Spec.Template.Spec.SecurityContext.FSGroup).To(Equal(backupFSGroup))
}

func TestReconciler_CleansUpBackupCronJobsButKeepsStorage(t *testing.T) {
	g := NewWithT(t)

	backupCfg := &PgDumpBackupConfig{
		Enabled:          true,
		Schedule:         "0 2 * * *",
		RetentionDays:    7,
		PvcName:          "test-pgdump-backups",
		PvcSize:          "10Gi",
		StorageClassName: backupStorageClass,
	}
	targets := []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "tt02",
		Apps:           []string{"testapp"},
		Backup:         backupCfg,
	}}
	h := newTestHarness(t, "tt02", targets)

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g)

	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "pgdump-testapp", Namespace: cnpgNamespace}, &batchv1.CronJob{})).
		To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "test-pgdump-backups-testapp", Namespace: cnpgNamespace}, &corev1.PersistentVolumeClaim{})).
		To(Succeed())

	h.reconciler.targets = []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "tt02",
		Apps:           []string{},
		Backup:         backupCfg,
	}}

	_, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())

	err = h.k8sClient.Get(
		h.ctx(),
		client.ObjectKey{Name: "pgdump-testapp", Namespace: cnpgNamespace},
		&batchv1.CronJob{},
	)
	g.Expect(err).To(HaveOccurred())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "test-pgdump-backups-testapp", Namespace: cnpgNamespace}, &corev1.PersistentVolumeClaim{})).
		To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: backupStorageClass}, &storagev1.StorageClass{})).
		To(Succeed())
}

func TestReconciler_CreatesOneBackupPVCPerApp(t *testing.T) {
	g := NewWithT(t)

	backupCfg := &PgDumpBackupConfig{
		Enabled:          true,
		Schedule:         "0 2 * * *",
		RetentionDays:    7,
		PvcName:          "test-pgdump-backups",
		PvcSize:          "10Gi",
		StorageClassName: backupStorageClass,
	}
	targets := []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "tt02",
		Apps:           []string{"app-one", "app-two"},
		Backup:         backupCfg,
	}}
	h := newTestHarness(t, "tt02", targets)

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)
	h.mustSyncAll(g)

	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "test-pgdump-backups-app-one", Namespace: cnpgNamespace}, &corev1.PersistentVolumeClaim{})).
		To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "test-pgdump-backups-app-two", Namespace: cnpgNamespace}, &corev1.PersistentVolumeClaim{})).
		To(Succeed())

	cronJobOne := &batchv1.CronJob{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "pgdump-app-one", Namespace: cnpgNamespace}, cronJobOne)).
		To(Succeed())
	g.Expect(cronJobOne.Spec.JobTemplate.Spec.Template.Spec.Volumes[0].PersistentVolumeClaim.ClaimName).
		To(Equal("test-pgdump-backups-app-one"))

	cronJobTwo := &batchv1.CronJob{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "pgdump-app-two", Namespace: cnpgNamespace}, cronJobTwo)).
		To(Succeed())
	g.Expect(cronJobTwo.Spec.JobTemplate.Spec.Template.Spec.Volumes[0].PersistentVolumeClaim.ClaimName).
		To(Equal("test-pgdump-backups-app-two"))
}

func TestReconciler_FailsWhenBackupConfigIsUnderspecified(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{
		ServiceOwnerId: "ttd",
		Environment:    "tt02",
		Apps:           []string{"testapp"},
		Backup: &PgDumpBackupConfig{
			Enabled: true,
			// Missing required fields on purpose
		},
	}}
	h := newTestHarness(t, "tt02", targets)

	h.mustSyncAll(g)
	h.setHelmReleaseReady(t)

	_, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("backup schedule must be specified"))
}
