package secretsync

import (
	"context"
	"testing"

	"altinn.studio/operator/internal"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(initObjs...).
		Build()
}

type testHarness struct {
	reconciler *SecretSyncReconciler
	k8sClient  client.Client
	clock      *clockwork.FakeClock
	ctx        context.Context
}

func newTestHarness(t *testing.T, mappings []SecretSyncMapping, initObjs ...client.Object) *testHarness {
	t.Helper()

	k8sClient := newFakeK8sClient(initObjs...)
	clock := clockwork.NewFakeClock()

	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			Environment: operatorcontext.EnvironmentLocal,
		}),
	)
	if err != nil {
		t.Fatalf("failed to create runtime: %v", err)
	}

	reconciler := NewReconcilerForTesting(rt, k8sClient, mappings)

	return &testHarness{
		reconciler: reconciler,
		k8sClient:  k8sClient,
		clock:      clock,
		ctx:        context.Background(),
	}
}

func (h *testHarness) reconcile(t *testing.T, name, namespace string) {
	t.Helper()
	_, err := h.reconciler.Reconcile(h.ctx, reconcile.Request{
		NamespacedName: client.ObjectKey{Name: name, Namespace: namespace},
	})
	if err != nil {
		t.Fatalf("reconcile failed: %v", err)
	}
}

func (h *testHarness) getSecret(name, namespace string) (*corev1.Secret, error) {
	secret := &corev1.Secret{}
	err := h.k8sClient.Get(h.ctx, client.ObjectKey{Name: name, Namespace: namespace}, secret)
	return secret, err
}

func TestReconciler_CreatesDestinationOnSourceCreate(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
			Labels:    map[string]string{"app": "myapp"},
		},
		Data: map[string][]byte{
			"key1": []byte("value1"),
			"key2": []byte("value2"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data["key1"]).To(Equal(sourceSecret.Data["key1"]))
	g.Expect(dest.Data["key2"]).To(Equal(sourceSecret.Data["key2"]))
	g.Expect(dest.Labels["app"]).To(Equal(sourceSecret.Labels["app"]))
	g.Expect(dest.Labels["app.kubernetes.io/managed-by"]).To(Equal("altinn-studio-operator"))
}

func TestReconciler_UpdatesDestinationOnSourceUpdate(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"key1": []byte("updated-value"),
		},
	}

	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.DestName,
			Namespace: mapping.DestNamespace,
		},
		Data: map[string][]byte{
			"key1": []byte("old-value"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret, destSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data["key1"]).To(Equal(sourceSecret.Data["key1"]))
}

func TestReconciler_DeletesDestinationOnSourceDelete(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.DestName,
			Namespace: mapping.DestNamespace,
		},
		Data: map[string][]byte{
			"key1": []byte("value1"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, destSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	_, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_CorrectsDriftOnDestinationChange(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"key1": []byte("correct-value"),
		},
	}

	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.DestName,
			Namespace: mapping.DestNamespace,
		},
		Data: map[string][]byte{
			"key1": []byte("drifted-value"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret, destSecret)

	// Reconcile triggered by destination change (drift)
	h.reconcile(t, mapping.DestName, mapping.DestNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data["key1"]).To(Equal(sourceSecret.Data["key1"]))
}

func TestReconciler_FullOverwriteRemovesExtraKeys(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"key1": []byte("value1"),
		},
	}

	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.DestName,
			Namespace: mapping.DestNamespace,
		},
		Data: map[string][]byte{
			"key1":      []byte("old"),
			"extra-key": []byte("should-be-removed"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret, destSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data["key1"]).To(Equal(sourceSecret.Data["key1"]))
	g.Expect(dest.Data).NotTo(HaveKey("extra-key"))
}

func TestReconciler_SyncsMultipleMappings(t *testing.T) {
	g := NewWithT(t)

	mapping1 := SecretSyncMapping{
		SourceName:      "source-1",
		SourceNamespace: "ns-1",
		DestName:        "dest-1",
		DestNamespace:   "ns-dest",
	}
	mapping2 := SecretSyncMapping{
		SourceName:      "source-2",
		SourceNamespace: "ns-2",
		DestName:        "dest-2",
		DestNamespace:   "ns-dest",
	}

	source1 := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping1.SourceName,
			Namespace: mapping1.SourceNamespace,
		},
		Data: map[string][]byte{"data": []byte("source1")},
	}
	source2 := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping2.SourceName,
			Namespace: mapping2.SourceNamespace,
		},
		Data: map[string][]byte{"data": []byte("source2")},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping1, mapping2}, source1, source2)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	dest1, err := h.getSecret(mapping1.DestName, mapping1.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest1.Data["data"]).To(Equal(source1.Data["data"]))

	dest2, err := h.getSecret(mapping2.DestName, mapping2.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest2.Data["data"]).To(Equal(source2.Data["data"]))
}

func TestReconciler_IgnoresUnmappedSecrets(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping})

	// Reconcile a secret that doesn't match any mapping
	h.reconcile(t, "unrelated-secret", "other-ns")

	// No destination should be created
	_, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_CopiesLabelsAndAnnotations(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
			Labels: map[string]string{
				"env":  "prod",
				"team": "platform",
			},
			Annotations: map[string]string{
				"note": "important",
			},
		},
		Data: map[string][]byte{"key": []byte("value")},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Labels["env"]).To(Equal(sourceSecret.Labels["env"]))
	g.Expect(dest.Labels["team"]).To(Equal(sourceSecret.Labels["team"]))
	g.Expect(dest.Labels["app.kubernetes.io/managed-by"]).To(Equal("altinn-studio-operator"))
	g.Expect(dest.Annotations["note"]).To(Equal(sourceSecret.Annotations["note"]))
}

func TestReconciler_CopiesSecretType(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Type: corev1.SecretTypeTLS,
		Data: map[string][]byte{
			"tls.crt": []byte("cert"),
			"tls.key": []byte("key"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Type).To(Equal(sourceSecret.Type))
	g.Expect(dest.Data["tls.crt"]).To(Equal(sourceSecret.Data["tls.crt"]))
	g.Expect(dest.Data["tls.key"]).To(Equal(sourceSecret.Data["tls.key"]))
}

func TestReconciler_EmptyMappings(t *testing.T) {
	g := NewWithT(t)

	h := newTestHarness(t, []SecretSyncMapping{})

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
}

func TestReconciler_HandlesNilSourceData(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: nil,
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data).To(BeNil())
}

func TestReconciler_Predicate_FiltersCorrectly(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping})

	pred := h.reconciler.secretPredicate()

	// Source should match
	sourceObj := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
	}
	g.Expect(pred.Create(event.CreateEvent{Object: sourceObj})).To(BeTrue())

	// Dest should match
	destObj := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.DestName,
			Namespace: mapping.DestNamespace,
		},
	}
	g.Expect(pred.Create(event.CreateEvent{Object: destObj})).To(BeTrue())

	// Unrelated should not match
	otherObj := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "other",
			Namespace: "other-ns",
		},
	}
	g.Expect(pred.Create(event.CreateEvent{Object: otherObj})).To(BeFalse())
}
