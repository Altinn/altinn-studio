package cnpgsync

import (
	"context"
	"fmt"
	"testing"

	cnpgv1 "github.com/cloudnative-pg/cloudnative-pg/api/v1"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	. "github.com/onsi/gomega"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"altinn.studio/operator/internal"
	opclock "altinn.studio/operator/internal/clock"
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
		cnpgv1.AddToScheme,
	} {
		if err := add(scheme); err != nil {
			panic(err)
		}
	}
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithInterceptorFuncs(interceptorFuncs).
		WithObjects(initObjs...).
		WithStatusSubresource(&helmv2.HelmRelease{}, &cnpgv1.Cluster{}, &cnpgv1.Database{}).
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

	catalog := &cnpgv1.ImageCatalog{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: imageCatalogName, Namespace: cnpgNamespace}, catalog)).
		To(Succeed())
	if wantProxy {
		g.Expect(catalog.Spec.Images[0].Image).To(HavePrefix(proxyRegistryPrefix))
		return
	}

	g.Expect(catalog.Spec.Images[0].Image).NotTo(HavePrefix(proxyRegistryPrefix))
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
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: imageCatalogName, Namespace: cnpgNamespace}, &cnpgv1.ImageCatalog{})).
		To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, &cnpgv1.Cluster{})).
		To(Succeed())
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

	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	g.Expect(*cluster.Spec.StorageConfiguration.StorageClass).To(Equal(storageClassName))
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

	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())

	g.Expect(cluster.Spec.Instances).To(Equal(1))
	g.Expect(cluster.Spec.EnablePDB).NotTo(BeNil())
	g.Expect(*cluster.Spec.EnablePDB).To(BeFalse())
	g.Expect(cluster.Spec.StorageConfiguration.Size).To(Equal("8Gi"))
	g.Expect(cluster.Spec.WalStorage).NotTo(BeNil())
	g.Expect(cluster.Spec.WalStorage.Size).To(Equal("2Gi"))
	g.Expect(cluster.Spec.Resources.Requests.Cpu().String()).To(Equal("200m"))
	g.Expect(cluster.Spec.Resources.Requests.Memory().String()).To(Equal("2Gi"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["max_connections"]).To(Equal("126"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["superuser_reserved_connections"]).To(Equal("6"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["shared_buffers"]).To(Equal("512MB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["effective_cache_size"]).To(Equal("1536MB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["work_mem"]).To(Equal("4854kB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["maintenance_work_mem"]).To(Equal("128MB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["wal_buffers"]).To(Equal("7864kB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["min_wal_size"]).To(Equal("512MB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["max_wal_size"]).To(Equal("1GB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["wal_writer_flush_after"]).To(Equal("2MB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["checkpoint_flush_after"]).To(Equal("2MB"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["autovacuum_vacuum_cost_limit"]).To(Equal("2400"))
	g.Expect(cluster.Spec.PostgresConfiguration.Parameters["pg_stat_statements.max"]).To(Equal("1000"))
}

func TestReconciler_UsesProxyRegistryForNonLocal(t *testing.T) {
	assertCatalogProxyPrefix(t, "tt02", true)
}

func TestReconciler_UsesDirectRegistryForLocal(t *testing.T) {
	assertCatalogProxyPrefix(t, "localtest", false)
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
	cluster := &cnpgv1.Cluster{
		ObjectMeta: metav1.ObjectMeta{
			Name:      clusterName,
			Namespace: cnpgNamespace,
		},
	}
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
		&cnpgv1.Cluster{},
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
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	g.Expect(cluster.Spec.Managed).NotTo(BeNil())
	g.Expect(cluster.Spec.Managed.Roles).To(HaveLen(1))
	g.Expect(cluster.Spec.Managed.Roles[0].Name).To(Equal("testapp"))
	g.Expect(cluster.Spec.Managed.Roles[0].Login).To(BeTrue())
	g.Expect(cluster.Spec.Managed.Roles[0].PasswordSecret.Name).To(Equal("pg-apps-cluster-testapp-password"))
}

func TestReconciler_ManagedRoleConflictDefersStatusCheckUntilNextSync(t *testing.T) {
	g := NewWithT(t)

	cluster := &cnpgv1.Cluster{
		ObjectMeta: metav1.ObjectMeta{
			Name:      clusterName,
			Namespace: cnpgNamespace,
		},
	}
	conflictInjected := false
	k8sClient := newFakeK8sClientWithInterceptors(
		interceptor.Funcs{
			Update: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
				if conflictInjected || obj.GetNamespace() != cnpgNamespace || obj.GetName() != clusterName {
					return c.Update(ctx, obj, opts...)
				}

				conflictInjected = true
				liveCluster := &cnpgv1.Cluster{}
				if err := c.Get(
					ctx,
					client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace},
					liveCluster,
				); err != nil {
					return fmt.Errorf("get live cluster: %w", err)
				}
				liveCluster.Spec.Managed = &cnpgv1.ManagedConfiguration{
					Roles: []cnpgv1.RoleConfiguration{{
						Name:  "testapp",
						Login: true,
						PasswordSecret: &cnpgv1.LocalObjectReference{
							Name: "pg-apps-cluster-testapp-password",
						},
					}},
				}
				if err := c.Update(ctx, liveCluster); err != nil {
					return fmt.Errorf("update live cluster: %w", err)
				}
				liveCluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
					ByStatus: map[cnpgv1.RoleStatus][]string{
						cnpgv1.RoleStatusReconciled: {"testapp"},
					},
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

	cluster := &cnpgv1.Cluster{
		ObjectMeta: metav1.ObjectMeta{
			Name:      clusterName,
			Namespace: cnpgNamespace,
		},
		Spec: cnpgv1.ClusterSpec{
			Managed: &cnpgv1.ManagedConfiguration{
				Roles: []cnpgv1.RoleConfiguration{{Name: "testapp"}},
			},
		},
	}
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

				liveCluster := &cnpgv1.Cluster{}
				if err := c.Get(
					ctx,
					client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace},
					liveCluster,
				); err != nil {
					return fmt.Errorf("get live cluster: %w", err)
				}
				liveCluster.Spec.Managed = &cnpgv1.ManagedConfiguration{}
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
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx(), cluster)).To(Succeed())

	// Sync again - should create database
	needsRetry, err := h.reconciler.SyncAll(h.ctx())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue()) // Database not applied yet

	// Database should be created
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	g.Expect(db.Spec.Name).To(Equal("testapp"))
	g.Expect(db.Spec.Owner).To(Equal("testapp"))
	g.Expect(db.Spec.ClusterRef.Name).To(Equal(clusterName))
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
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx(), cluster)).To(Succeed())

	h.mustSyncAll(g) // Creates database

	// Simulate database applied
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx(), db)).To(Succeed())

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
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx(), cluster)).To(Succeed())

	h.mustSyncAll(g) // Creates database

	// Simulate database applied
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx(), db)).To(Succeed())

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
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx(), cluster)).To(Succeed())

	h.mustSyncAll(g) // Creates database

	// Simulate database applied
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx(), db)).To(Succeed())

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
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, &cnpgv1.Database{})).
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
	err = h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, &cnpgv1.Database{})
	g.Expect(err).To(HaveOccurred())

	// Verify role removed from cluster
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	g.Expect(cluster.Spec.Managed.Roles).To(BeEmpty())

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
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).
		To(Succeed())
	g.Expect(cluster.Spec.Managed.Roles).To(HaveLen(1))
	g.Expect(cluster.Spec.Managed.Roles[0].Name).To(Equal("my_test_app"))

	// Simulate role reconciled with sanitized name
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"my_test_app"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx(), cluster)).To(Succeed())

	h.mustSyncAll(g) // Creates database

	// Verify K8s Database resource name keeps hyphens
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: "db-my-test-app", Namespace: cnpgNamespace}, db)).
		To(Succeed())

	// Verify PostgreSQL database name and owner are sanitized
	g.Expect(db.Spec.Name).To(Equal("my_test_app"))
	g.Expect(db.Spec.Owner).To(Equal("my_test_app"))

	// Simulate database applied
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx(), db)).To(Succeed())

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
