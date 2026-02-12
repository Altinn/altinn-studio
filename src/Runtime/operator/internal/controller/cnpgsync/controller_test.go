package cnpgsync

import (
	"context"
	"testing"

	"altinn.studio/operator/internal"
	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/operatorcontext"
	cnpgv1 "github.com/cloudnative-pg/cloudnative-pg/api/v1"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = storagev1.AddToScheme(scheme)
	_ = helmv2.AddToScheme(scheme)
	_ = sourcev1.AddToScheme(scheme)
	_ = cnpgv1.AddToScheme(scheme)
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(initObjs...).
		WithStatusSubresource(&helmv2.HelmRelease{}, &cnpgv1.Cluster{}, &cnpgv1.Database{}).
		Build()
}

type testHarness struct {
	reconciler *CnpgSyncReconciler
	k8sClient  client.Client
	ctx        context.Context
}

func (h *testHarness) setHelmReleaseReady(t *testing.T) {
	t.Helper()
	release := &helmv2.HelmRelease{}
	err := h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}, release)
	if err != nil {
		t.Fatalf("failed to get HelmRelease: %v", err)
	}
	release.Status.Conditions = []metav1.Condition{
		{
			Type:   "Ready",
			Status: metav1.ConditionTrue,
		},
	}
	if err := h.k8sClient.Status().Update(h.ctx, release); err != nil {
		t.Fatalf("failed to update HelmRelease status: %v", err)
	}
}

func newTestHarness(t *testing.T, environment string, targets []CnpgTarget) *testHarness {
	t.Helper()

	k8sClient := newFakeK8sClient()
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
		ctx:        context.Background(),
	}
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

	needsRetry, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	ns := &corev1.Namespace{}
	err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgNamespace}, ns)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_CreatesResourcesWhenTargeted(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "tt02"}}
	h := newTestHarness(t, "tt02", targets)

	// First sync creates HelmRelease but not CNPG resources (not ready yet)
	needsRetry, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue())

	// Verify resources created
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgNamespace}, &corev1.Namespace{})).To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgRepoName, Namespace: cnpgNamespace}, &sourcev1.HelmRepository{})).To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}, &helmv2.HelmRelease{})).To(Succeed())

	// Simulate HelmRelease becoming ready, then sync again
	h.setHelmReleaseReady(t)
	needsRetry, err = h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Verify CNPG resources created
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: imageCatalogName, Namespace: cnpgNamespace}, &cnpgv1.ImageCatalog{})).To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, &cnpgv1.Cluster{})).To(Succeed())
}

func TestReconciler_UsesLocalStorageClassForLocal(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "localtest", []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest"}})

	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx)

	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	g.Expect(*cluster.Spec.StorageConfiguration.StorageClass).To(Equal(storageClassName))
}

func TestReconciler_UsesProxyRegistryForNonLocal(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "tt02", []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "tt02"}})

	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx)

	catalog := &cnpgv1.ImageCatalog{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: imageCatalogName, Namespace: cnpgNamespace}, catalog)).To(Succeed())
	g.Expect(catalog.Spec.Images[0].Image).To(HavePrefix(proxyRegistryPrefix))
}

func TestReconciler_UsesDirectRegistryForLocal(t *testing.T) {
	g := NewWithT(t)
	h := newTestHarness(t, "localtest", []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest"}})

	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx)

	catalog := &cnpgv1.ImageCatalog{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: imageCatalogName, Namespace: cnpgNamespace}, catalog)).To(Succeed())
	g.Expect(catalog.Spec.Images[0].Image).NotTo(HavePrefix(proxyRegistryPrefix))
}

func TestReconciler_DeletesNamespaceWhenNotTargeted(t *testing.T) {
	g := NewWithT(t)

	// Create namespace with our managed-by label
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "altinn-studio-operator",
			},
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

	// Targets don't include our context
	targets := []CnpgTarget{{ServiceOwnerId: "other", Environment: "prod"}}
	reconciler := NewReconcilerForTesting(rt, k8sClient, targets)

	needsRetry, err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Namespace should be deleted
	err = k8sClient.Get(context.Background(), client.ObjectKey{Name: cnpgNamespace}, &corev1.Namespace{})
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_SkipsNamespaceDeletionIfNotManagedByUs(t *testing.T) {
	g := NewWithT(t)

	// Create namespace without our label
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: cnpgNamespace,
			Labels: map[string]string{
				"app.kubernetes.io/managed-by": "someone-else",
			},
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

	// Targets don't include our context
	targets := []CnpgTarget{{ServiceOwnerId: "other", Environment: "prod"}}
	reconciler := NewReconcilerForTesting(rt, k8sClient, targets)

	needsRetry, err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Namespace should still exist
	err = k8sClient.Get(context.Background(), client.ObjectKey{Name: cnpgNamespace}, &corev1.Namespace{})
	g.Expect(err).NotTo(HaveOccurred())
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

	// Use prod environment where buildCluster returns nil
	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			ServiceOwner: operatorcontext.ServiceOwner{Id: "ttd"},
			Environment:  "prod",
		}),
	)
	g.Expect(err).NotTo(HaveOccurred())

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "prod"}}
	reconciler := NewReconcilerForTesting(rt, k8sClient, targets)

	// First sync - creates HelmRelease
	_, _ = reconciler.SyncAll(context.Background())

	// Set HelmRelease ready
	release := &helmv2.HelmRelease{}
	g.Expect(k8sClient.Get(context.Background(), client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}, release)).To(Succeed())
	release.Status.Conditions = []metav1.Condition{{Type: "Ready", Status: metav1.ConditionTrue}}
	g.Expect(k8sClient.Status().Update(context.Background(), release)).To(Succeed())

	// Second sync - should delete cluster since buildCluster returns nil for prod
	needsRetry, err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Cluster should be deleted
	err = k8sClient.Get(context.Background(), client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, &cnpgv1.Cluster{})
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_CreatesPasswordSecretForApp(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// First sync creates Helm resources
	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)

	// Second sync creates CNPG resources and password secret
	needsRetry, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue()) // Role not reconciled yet

	// Password secret should be created
	secret := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "pg-apps-cluster-testapp-password", Namespace: cnpgNamespace}, secret)).To(Succeed())
	g.Expect(secret.Data).To(HaveKey("password"))
	g.Expect(len(secret.Data["password"])).To(BeNumerically(">=", 20))
}

func TestReconciler_AddsManagedRoleToCluster(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// First sync creates Helm resources
	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)

	// Second sync creates CNPG resources and adds role
	_, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	// Cluster should have managed role
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	g.Expect(cluster.Spec.Managed).NotTo(BeNil())
	g.Expect(cluster.Spec.Managed.Roles).To(HaveLen(1))
	g.Expect(cluster.Spec.Managed.Roles[0].Name).To(Equal("testapp"))
	g.Expect(cluster.Spec.Managed.Roles[0].Login).To(BeTrue())
	g.Expect(cluster.Spec.Managed.Roles[0].PasswordSecret.Name).To(Equal("pg-apps-cluster-testapp-password"))
}

func TestReconciler_CreatesDatabaseWhenRoleReconciled(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// Setup cluster and helm release
	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx) // Creates cluster and adds role
	_, _ = h.reconciler.SyncAll(h.ctx) // Role added, waiting for reconciliation

	// Simulate role being reconciled by CNPG
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx, cluster)).To(Succeed())

	// Sync again - should create database
	needsRetry, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeTrue()) // Database not applied yet

	// Database should be created
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	g.Expect(db.Spec.Name).To(Equal("testapp"))
	g.Expect(db.Spec.Owner).To(Equal("testapp"))
	g.Expect(db.Spec.ClusterRef.Name).To(Equal(clusterName))
}

func TestReconciler_SkipsSecretUpdateWhenAppSecretMissing(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// Setup everything
	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx) // Creates cluster and adds role

	// Simulate role reconciled
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx, cluster)).To(Succeed())

	_, _ = h.reconciler.SyncAll(h.ctx) // Creates database

	// Simulate database applied
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx, db)).To(Succeed())

	// Sync - should not error even though app secret doesn't exist
	needsRetry, err := h.reconciler.SyncAll(h.ctx)
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
	g.Expect(h.k8sClient.Create(h.ctx, appSecret)).To(Succeed())

	// Setup everything
	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx) // Creates cluster and adds role

	// Simulate role reconciled
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx, cluster)).To(Succeed())

	_, _ = h.reconciler.SyncAll(h.ctx) // Creates database

	// Simulate database applied
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx, db)).To(Succeed())

	// Sync - should update app secret
	needsRetry, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Verify app secret updated
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "ttd-testapp-deployment-secrets", Namespace: "default"}, appSecret)).To(Succeed())
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

	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)

	needsRetry, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse()) // No apps means no retry needed
}

func TestReconciler_CleansUpRemovedApp(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"testapp"}}}
	h := newTestHarness(t, "localtest", targets)

	// Setup HelmRelease and cluster
	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx) // Creates cluster and adds role

	// Simulate role reconciled
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"testapp"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx, cluster)).To(Succeed())

	_, _ = h.reconciler.SyncAll(h.ctx) // Creates database

	// Simulate database applied
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, db)).To(Succeed())
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx, db)).To(Succeed())

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
	g.Expect(h.k8sClient.Create(h.ctx, appSecret)).To(Succeed())

	// Verify resources exist before cleanup
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, &cnpgv1.Database{})).To(Succeed())
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "pg-apps-cluster-testapp-password", Namespace: cnpgNamespace}, &corev1.Secret{})).To(Succeed())

	// Remove app from targets
	h.reconciler.targets = []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{}}}

	// Run cleanup
	needsRetry, err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(needsRetry).To(BeFalse())

	// Verify database deleted
	err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "db-testapp", Namespace: cnpgNamespace}, &cnpgv1.Database{})
	g.Expect(err).To(HaveOccurred())

	// Verify role removed from cluster
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	g.Expect(cluster.Spec.Managed.Roles).To(BeEmpty())

	// Verify password secret deleted
	err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "pg-apps-cluster-testapp-password", Namespace: cnpgNamespace}, &corev1.Secret{})
	g.Expect(err).To(HaveOccurred())

	// Verify postgresql.json removed from app secret
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "ttd-testapp-deployment-secrets", Namespace: "default"}, appSecret)).To(Succeed())
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
	g.Expect(h.k8sClient.Create(h.ctx, appSecret)).To(Succeed())

	// Setup
	_, _ = h.reconciler.SyncAll(h.ctx)
	h.setHelmReleaseReady(t)
	_, _ = h.reconciler.SyncAll(h.ctx) // Creates cluster and adds role

	// Verify K8s resource names keep hyphens
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "pg-apps-cluster-my-test-app-password", Namespace: cnpgNamespace}, &corev1.Secret{})).To(Succeed())

	// Verify role name is sanitized (underscores)
	cluster := &cnpgv1.Cluster{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: clusterName, Namespace: cnpgNamespace}, cluster)).To(Succeed())
	g.Expect(cluster.Spec.Managed.Roles).To(HaveLen(1))
	g.Expect(cluster.Spec.Managed.Roles[0].Name).To(Equal("my_test_app"))

	// Simulate role reconciled with sanitized name
	cluster.Status.ManagedRolesStatus = cnpgv1.ManagedRoles{
		ByStatus: map[cnpgv1.RoleStatus][]string{
			cnpgv1.RoleStatusReconciled: {"my_test_app"},
		},
	}
	g.Expect(h.k8sClient.Status().Update(h.ctx, cluster)).To(Succeed())

	_, _ = h.reconciler.SyncAll(h.ctx) // Creates database

	// Verify K8s Database resource name keeps hyphens
	db := &cnpgv1.Database{}
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "db-my-test-app", Namespace: cnpgNamespace}, db)).To(Succeed())

	// Verify PostgreSQL database name and owner are sanitized
	g.Expect(db.Spec.Name).To(Equal("my_test_app"))
	g.Expect(db.Spec.Owner).To(Equal("my_test_app"))

	// Simulate database applied
	applied := true
	db.Status.Applied = &applied
	g.Expect(h.k8sClient.Status().Update(h.ctx, db)).To(Succeed())

	// Sync to update app secret
	_, _ = h.reconciler.SyncAll(h.ctx)

	// Verify connection string uses sanitized names
	g.Expect(h.k8sClient.Get(h.ctx, client.ObjectKey{Name: "ttd-my-test-app-deployment-secrets", Namespace: "default"}, appSecret)).To(Succeed())
	connJson := string(appSecret.Data["postgresql.json"])
	g.Expect(connJson).To(ContainSubstring("Database=my_test_app"))
	g.Expect(connJson).To(ContainSubstring("Username=my_test_app"))
}
