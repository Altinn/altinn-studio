package cnpgsync

import (
	"context"
	"testing"

	"altinn.studio/operator/internal"
	"altinn.studio/operator/internal/operatorcontext"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = helmv2.AddToScheme(scheme)
	_ = sourcev1.AddToScheme(scheme)
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(initObjs...).
		Build()
}

type testHarness struct {
	reconciler *CnpgSyncReconciler
	k8sClient  client.Client
	ctx        context.Context
}

func newTestHarness(t *testing.T, serviceOwnerId, environment string, targets []CnpgTarget) *testHarness {
	t.Helper()

	k8sClient := newFakeK8sClient()
	clock := clockwork.NewFakeClock()

	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			ServiceOwner: operatorcontext.ServiceOwner{Id: serviceOwnerId},
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
	h := newTestHarness(t, "ttd", "localtest", nil)
	g.Expect(h.reconciler.NeedLeaderElection()).To(BeTrue())
}

func TestReconciler_SkipsWhenNotTargeted(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "other", Environment: "prod"}}
	h := newTestHarness(t, "ttd", "localtest", targets)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	ns := &corev1.Namespace{}
	err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgNamespace}, ns)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_CreatesResourcesWhenTargeted(t *testing.T) {
	g := NewWithT(t)

	targets := []CnpgTarget{{ServiceOwnerId: "ttd", Environment: "tt02"}}
	h := newTestHarness(t, "ttd", "tt02", targets)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	// Namespace
	ns := &corev1.Namespace{}
	err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgNamespace}, ns)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(ns.Labels["app.kubernetes.io/managed-by"]).To(Equal("altinn-studio-operator"))

	// HelmRepository
	repo := &sourcev1.HelmRepository{}
	err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgRepoName, Namespace: cnpgNamespace}, repo)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(repo.Spec.URL).To(Equal(cnpgRepoURL))

	// HelmRelease
	release := &helmv2.HelmRelease{}
	err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: cnpgReleaseName, Namespace: cnpgNamespace}, release)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(release.Spec.Chart.Spec.Chart).To(Equal(cnpgChartName))
	g.Expect(release.Spec.Chart.Spec.Version).To(Equal(cnpgChartVersion))
}
