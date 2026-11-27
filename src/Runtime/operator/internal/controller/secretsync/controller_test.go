package secretsync

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/go-logr/zapr"
	. "github.com/onsi/gomega"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"altinn.studio/operator/internal"
	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/grafanaapi"
	"altinn.studio/operator/internal/operatorcontext"
)

var errTransformFailed = errors.New("transform failed")

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	for _, add := range []func(*k8sruntime.Scheme) error{
		corev1.AddToScheme,
		grafanaapi.AddToScheme,
	} {
		if err := add(scheme); err != nil {
			panic(err)
		}
	}
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(initObjs...).
		Build()
}

type testHarness struct {
	reconciler *SecretSyncReconciler
	k8sClient  client.Client
	clock      *opclock.FakeClock
}

func newTestHarness(t *testing.T, mappings []SecretSyncMapping, initObjs ...client.Object) *testHarness {
	t.Helper()

	k8sClient := newFakeK8sClient(initObjs...)
	clock := opclock.NewFakeClock()

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
	}
}

func (*testHarness) ctx() context.Context {
	return context.Background()
}

func (h *testHarness) reconcile(t *testing.T, name, namespace string) {
	t.Helper()
	_, err := h.reconciler.Reconcile(h.ctx(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: name, Namespace: namespace},
	})
	if err != nil {
		t.Fatalf("reconcile failed: %v", err)
	}
}

func (h *testHarness) getSecret(name, namespace string) (*corev1.Secret, error) {
	secret := &corev1.Secret{}
	err := h.k8sClient.Get(h.ctx(), client.ObjectKey{Name: name, Namespace: namespace}, secret)
	if err != nil {
		return nil, fmt.Errorf("get secret %s/%s: %w", namespace, name, err)
	}
	return secret, nil
}

func assertDestinationSecretValue(
	t *testing.T,
	mapping SecretSyncMapping,
	sourceSecret, destSecret *corev1.Secret,
	triggerName, triggerNamespace, key, expected string,
) {
	t.Helper()

	g := NewWithT(t)
	initObjs := make([]client.Object, 0, 2)
	if sourceSecret != nil {
		initObjs = append(initObjs, sourceSecret)
	}
	if destSecret != nil {
		initObjs = append(initObjs, destSecret)
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, initObjs...)
	h.reconcile(t, triggerName, triggerNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data[key]).To(Equal([]byte(expected)))
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

	assertDestinationSecretValue(
		t,
		mapping,
		sourceSecret,
		destSecret,
		mapping.SourceName,
		mapping.SourceNamespace,
		"key1",
		"updated-value",
	)
}

func TestReconciler_DeletesDestinationOnSourceDelete(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		CanDeleteDest:   true,
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

func TestReconciler_ClearsDestinationWhenCanDeleteDestFalse(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		CanDeleteDest:   false,
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

	// Dest should still exist but data should be cleared
	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data).To(BeNil())
}

func TestReconciler_ClearsDestinationWithCustomClearOutput(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		DestKey:         "config.json",
		CanDeleteDest:   false,
		ClearOutput:     func() []byte { return []byte("{}") },
	}

	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.DestName,
			Namespace: mapping.DestNamespace,
		},
		Data: map[string][]byte{
			"config.json": []byte(`{"key":"value"}`),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, destSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	// Dest should still exist with cleared data from ClearOutput
	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(string(dest.Data["config.json"])).To(Equal("{}"))
}

func TestReconciler_CorrectsDriftOnDestinationChange(t *testing.T) {
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

	assertDestinationSecretValue(
		t,
		mapping,
		sourceSecret,
		destSecret,
		mapping.DestName,
		mapping.DestNamespace,
		"key1",
		"correct-value",
	)
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

	err := h.reconciler.SyncAll(h.ctx())
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

	err := h.reconciler.SyncAll(h.ctx())
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

func TestReconciler_TransformsWithBuildOutput(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		DestKey:         "secrets.json",
		BuildOutput: func(_ context.Context, _ client.Client, data map[string][]byte) ([]byte, error) {
			return []byte(`{"Grafana":{"Token":"` + string(data["token"]) + `"}}`), nil
		},
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"token": []byte("abc123"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data).To(HaveKey("secrets.json"))
	g.Expect(string(dest.Data["secrets.json"])).To(Equal(`{"Grafana":{"Token":"abc123"}}`))
}

func TestReconciler_TransformUsesAllSourceKeys(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		DestKey:         "config.json",
		BuildOutput: func(_ context.Context, _ client.Client, data map[string][]byte) ([]byte, error) {
			return []byte(`{"user":"` + string(data["username"]) + `","pass":"` + string(data["password"]) + `"}`), nil
		},
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"username": []byte("admin"),
			"password": []byte("secret"),
		},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(string(dest.Data["config.json"])).To(Equal(`{"user":"admin","pass":"secret"}`))
}

func TestReconciler_FallsBackToRawCopyWhenNoTransform(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		// No DestKey or BuildOutput - should use raw copy
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
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
}

func TestReconciler_TransformErrorPropagates(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		DestKey:         "out.json",
		BuildOutput: func(_ context.Context, _ client.Client, _ map[string][]byte) ([]byte, error) {
			return nil, errTransformFailed
		},
	}

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{"key": []byte("value")},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, sourceSecret)

	_, err := h.reconciler.Reconcile(h.ctx(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: mapping.SourceName, Namespace: mapping.SourceNamespace},
	})
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("transform failed"))
}

func TestReconciler_DefaultMapping_GrafanaURLEnrichment(t *testing.T) {
	g := NewWithT(t)

	mappings := DefaultMappings()
	mapping := defaultMapping(t, "external-grafana-altinn-studio-gateway-token")

	grafanaCR := grafanaapi.NewGrafanaWithExternalURL(
		"grafana",
		"external-grafana",
		"https://grafana.example.com",
	)

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"token": []byte("test-token-123"),
		},
	}

	h := newTestHarness(t, mappings, sourceSecret, grafanaCR)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data).To(HaveKey("secrets.json"))
	g.Expect(string(dest.Data["secrets.json"])).
		To(Equal(`{"Grafana":{"Token":"test-token-123","Url":"https://grafana.example.com"}}`))
}

func TestReconciler_DefaultMapping_GrafanaCRMissing(t *testing.T) {
	g := NewWithT(t)

	mappings := DefaultMappings()
	mapping := defaultMapping(t, "external-grafana-altinn-studio-gateway-token")

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"token": []byte("test-token"),
		},
	}

	h := newTestHarness(t, mappings, sourceSecret)

	_, err := h.reconciler.Reconcile(h.ctx(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: mapping.SourceName, Namespace: mapping.SourceNamespace},
	})
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("get Grafana CR"))
}

func TestReconciler_DefaultMapping_GrafanaCRNoExternalSpec(t *testing.T) {
	g := NewWithT(t)

	mappings := DefaultMappings()
	mapping := defaultMapping(t, "external-grafana-altinn-studio-gateway-token")

	grafanaCR := grafanaapi.NewGrafana("grafana", "external-grafana")

	sourceSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.SourceName,
			Namespace: mapping.SourceNamespace,
		},
		Data: map[string][]byte{
			"token": []byte("test-token"),
		},
	}

	h := newTestHarness(t, mappings, sourceSecret, grafanaCR)

	_, err := h.reconciler.Reconcile(h.ctx(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: mapping.SourceName, Namespace: mapping.SourceNamespace},
	})
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("grafana CR has no external spec"))
}

func TestReconciler_SourceWithSeveralMappingsSyncsEach(t *testing.T) {
	g := NewWithT(t)

	failing := SecretSyncMapping{
		SourceName:      "shared",
		SourceNamespace: "source-ns",
		DestName:        "failing",
		DestNamespace:   "dest-ns",
		DestKey:         "out",
		BuildOutput: func(_ context.Context, _ client.Client, _ map[string][]byte) ([]byte, error) {
			return nil, errTransformFailed
		},
	}
	copied := SecretSyncMapping{
		SourceName:      "shared",
		SourceNamespace: "source-ns",
		DestName:        "copied",
		DestNamespace:   "other-ns",
	}
	source := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "shared", Namespace: "source-ns"},
		Data:       map[string][]byte{"key": []byte("value")},
	}

	h := newTestHarness(t, []SecretSyncMapping{failing, copied}, source)
	_, err := h.reconciler.Reconcile(h.ctx(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: "shared", Namespace: "source-ns"},
	})
	g.Expect(err).To(MatchError(errTransformFailed))

	dest, err := h.getSecret("copied", "other-ns")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data).To(Equal(source.Data))
	_, err = h.getSecret("failing", "dest-ns")
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_DestinationDriftResyncsOnlyItsMapping(t *testing.T) {
	g := NewWithT(t)

	builds := map[string]int{}
	mapping := func(dest string) SecretSyncMapping {
		return SecretSyncMapping{
			SourceName:      "shared",
			SourceNamespace: "source-ns",
			DestName:        dest,
			DestNamespace:   "dest-ns",
			BuildData: func(_ context.Context, _ client.Client, data map[string][]byte) (map[string][]byte, error) {
				builds[dest]++
				return data, nil
			},
		}
	}
	source := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "shared", Namespace: "source-ns"},
		Data:       map[string][]byte{"key": []byte("value")},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping("first"), mapping("second")}, source)
	h.reconcile(t, "second", "dest-ns")
	g.Expect(builds).To(Equal(map[string]int{"second": 1}))

	g.Expect(h.reconciler.SyncAll(h.ctx())).To(Succeed())
	g.Expect(builds).To(Equal(map[string]int{"first": 1, "second": 2}))
}

func TestReconciler_BuildDataWritesTheWholeDestination(t *testing.T) {
	g := NewWithT(t)

	mapping := SecretSyncMapping{
		SourceName:      "source-secret",
		SourceNamespace: "source-ns",
		DestName:        "dest-secret",
		DestNamespace:   "dest-ns",
		BuildData: func(_ context.Context, _ client.Client, data map[string][]byte) (map[string][]byte, error) {
			return map[string][]byte{"A": data["in"], "B": []byte("b")}, nil
		},
	}
	source := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: mapping.SourceName, Namespace: mapping.SourceNamespace},
		Data:       map[string][]byte{"in": []byte("a")},
	}
	dest := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: mapping.DestName, Namespace: mapping.DestNamespace},
		Data:       map[string][]byte{"stale": []byte("x")},
	}

	h := newTestHarness(t, []SecretSyncMapping{mapping}, source, dest)
	h.reconcile(t, mapping.SourceName, mapping.SourceNamespace)

	got, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(got.Data).To(Equal(map[string][]byte{"A": []byte("a"), "B": []byte("b")}))
}

func defaultMapping(t *testing.T, destName string) SecretSyncMapping {
	t.Helper()
	for _, mapping := range DefaultMappings() {
		if mapping.DestName == destName {
			return mapping
		}
	}
	t.Fatalf("no default mapping to %q", destName)
	return SecretSyncMapping{}
}

const (
	testInstrumentationKey = "00000000-0000-0000-0000-000000000001"
	testConnectionString   = "InstrumentationKey=" + testInstrumentationKey + ";" +
		"IngestionEndpoint=https://example.invalid/;LiveEndpoint=https://live.example.invalid/"
)

func appInsightsSource(connectionString string) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: appInsightsSourceName, Namespace: appInsightsSourceNamespace},
		Type:       corev1.SecretTypeOpaque,
		Data:       map[string][]byte{appInsightsSourceKey: []byte(connectionString)},
	}
}

func TestReconciler_DefaultMapping_V8AppsTelemetryEnv(t *testing.T) {
	g := NewWithT(t)

	h := newTestHarness(t, DefaultMappings(), appInsightsSource(" "+testConnectionString+";\n"))
	h.reconcile(t, appInsightsSourceName, appInsightsSourceNamespace)

	dest, err := h.getSecret("apps-runtime-telemetry-env", "default")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Type).To(Equal(corev1.SecretTypeOpaque))
	g.Expect(dest.Data).To(Equal(map[string][]byte{
		"ApplicationInsights__ConnectionString":   []byte(testConnectionString),
		"ApplicationInsights__InstrumentationKey": []byte(testInstrumentationKey),
	}))
}

func TestReconciler_DefaultMapping_V8AppsTelemetryEnvKeepsLastValid(t *testing.T) {
	g := NewWithT(t)

	mapping := defaultMapping(t, "apps-runtime-telemetry-env")
	last := map[string][]byte{"ApplicationInsights__ConnectionString": []byte("InstrumentationKey=last-valid")}
	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: mapping.DestName, Namespace: mapping.DestNamespace},
		Data:       last,
	}

	for _, source := range []*corev1.Secret{
		appInsightsSource("not a connection string"),
		appInsightsSource(""),
		// A rotation that appends the new key instead of replacing the old one, which the .NET SDKs reject.
		appInsightsSource(testConnectionString + ";instrumentationkey=00000000-0000-0000-0000-000000000002"),
		appInsightsSource(testConnectionString + ";ProfilerEndpoint=not-a-url"),
	} {
		h := newTestHarness(t, DefaultMappings(), source, destSecret.DeepCopy())
		_, err := h.reconciler.Reconcile(h.ctx(), reconcile.Request{
			NamespacedName: client.ObjectKey{Name: appInsightsSourceName, Namespace: appInsightsSourceNamespace},
		})
		g.Expect(err).To(HaveOccurred())

		dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(dest.Data).To(Equal(last))
	}
}

func TestReconciler_DefaultMapping_V8AppsTelemetryEnvHasOnlyOwnMetadata(t *testing.T) {
	g := NewWithT(t)

	mapping := defaultMapping(t, "apps-runtime-telemetry-env")
	source := appInsightsSource(testConnectionString)
	source.Labels = map[string]string{
		"reconcile.external-secrets.io/managed":    "true",
		"reconcile.external-secrets.io/created-by": "abc",
	}
	source.Annotations = map[string]string{"reconcile.external-secrets.io/data-hash": "def"}
	stale := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:        mapping.DestName,
			Namespace:   mapping.DestNamespace,
			Labels:      source.Labels,
			Annotations: source.Annotations,
		},
	}
	ownMetadata := func(g Gomega, dest *corev1.Secret) {
		g.Expect(dest.Labels).To(Equal(map[string]string{"app.kubernetes.io/managed-by": "altinn-studio-operator"}))
		g.Expect(dest.Annotations).To(BeEmpty())
	}

	created := newTestHarness(t, DefaultMappings(), source.DeepCopy())
	created.reconcile(t, appInsightsSourceName, appInsightsSourceNamespace)
	dest, err := created.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	ownMetadata(g, dest)

	updated := newTestHarness(t, DefaultMappings(), source.DeepCopy(), stale)
	updated.reconcile(t, appInsightsSourceName, appInsightsSourceNamespace)
	dest, err = updated.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	ownMetadata(g, dest)
}

func TestReconciler_DefaultMapping_V8AppsTelemetryEnvSourceDeleted(t *testing.T) {
	g := NewWithT(t)

	mapping := defaultMapping(t, "apps-runtime-telemetry-env")
	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: mapping.DestName, Namespace: mapping.DestNamespace},
		Data:       map[string][]byte{"ApplicationInsights__ConnectionString": []byte("old")},
	}

	h := newTestHarness(t, DefaultMappings(), destSecret)
	h.reconcile(t, appInsightsSourceName, appInsightsSourceNamespace)

	_, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_DefaultMapping_CollectorsConnectionString(t *testing.T) {
	g := NewWithT(t)

	h := newTestHarness(t, DefaultMappings(), appInsightsSource(" "+testConnectionString+";\n"))
	h.reconcile(t, appInsightsSourceName, appInsightsSourceNamespace)

	dest, err := h.getSecret("apps-azure-monitor-secret", "runtime-obs")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data).To(Equal(map[string][]byte{"connection-string": []byte(testConnectionString)}))
	g.Expect(dest.Labels).To(Equal(map[string]string{"app.kubernetes.io/managed-by": "altinn-studio-operator"}))

	// The same source also gives v8 apps theirs.
	_, err = h.getSecret("apps-runtime-telemetry-env", "default")
	g.Expect(err).NotTo(HaveOccurred())
}

func TestReconciler_DefaultMapping_CollectorsConnectionStringKeepsLastValid(t *testing.T) {
	g := NewWithT(t)

	mapping := defaultMapping(t, "apps-azure-monitor-secret")
	last := map[string][]byte{"connection-string": []byte("InstrumentationKey=last-valid")}
	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: mapping.DestName, Namespace: mapping.DestNamespace},
		Data:       last,
	}

	h := newTestHarness(t, DefaultMappings(), appInsightsSource(testConnectionString+";garbage"), destSecret)
	_, err := h.reconciler.Reconcile(h.ctx(), reconcile.Request{
		NamespacedName: client.ObjectKey{Name: appInsightsSourceName, Namespace: appInsightsSourceNamespace},
	})
	g.Expect(err).To(MatchError(errInvalidConnectionString))

	dest, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(dest.Data).To(Equal(last))
}

func TestReconciler_DefaultMapping_CollectorsConnectionStringSourceDeleted(t *testing.T) {
	g := NewWithT(t)

	mapping := defaultMapping(t, "apps-azure-monitor-secret")
	destSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: mapping.DestName, Namespace: mapping.DestNamespace},
		Data:       map[string][]byte{"connection-string": []byte("old")},
	}

	h := newTestHarness(t, DefaultMappings(), destSecret)
	h.reconcile(t, appInsightsSourceName, appInsightsSourceNamespace)

	_, err := h.getSecret(mapping.DestName, mapping.DestNamespace)
	g.Expect(err).To(HaveOccurred())
}

func TestParseConnectionString(t *testing.T) {
	const key = "InstrumentationKey=" + testInstrumentationKey
	const endpoint = "IngestionEndpoint=https://example.invalid/"
	valid := []struct{ name, in, want string }{
		{"as it is", key + ";" + endpoint, key + ";" + endpoint},
		{"trailing semicolon", key + ";" + endpoint + ";", key + ";" + endpoint},
		{"spaces and a newline", " " + key + " ; " + endpoint + "\n", key + ";" + endpoint},
		{"no endpoint", key, key},
		{
			"documented keys in another case",
			"instrumentationKey=" + testInstrumentationKey + ";INGESTIONENDPOINT=https://example.invalid/",
			key + ";" + endpoint,
		},
		{"an undocumented key as written", key + ";SomeNewKey=Value", key + ";SomeNewKey=Value"},
	}
	for _, tc := range valid {
		t.Run(tc.name, func(t *testing.T) {
			g := NewWithT(t)
			out, err := parseConnectionString([]byte(tc.in))
			g.Expect(err).NotTo(HaveOccurred())
			g.Expect(out.value).To(Equal(tc.want))
			g.Expect(out.instrumentationKey).To(Equal(testInstrumentationKey))
		})
	}

	invalid := []struct{ name, in string }{
		{"no instrumentation key", endpoint},
		{"an empty instrumentation key", "InstrumentationKey=;" + endpoint},
		{"a segment without =", key + ";garbage"},
		{"an endpoint that isn't HTTPS", key + ";IngestionEndpoint=http://example.invalid/"},
		{"another endpoint that isn't HTTPS", key + ";LiveEndpoint=http://example.invalid/"},
		{"an empty endpoint", key + ";SnapshotEndpoint="},
		{"a key twice", key + ";" + key},
		{"a key twice in another case", key + ";instrumentationkey=00000000-0000-0000-0000-000000000002"},
		{"too long", key + ";Other=" + strings.Repeat("x", maxConnectionStringLength)},
	}
	for _, tc := range invalid {
		t.Run(tc.name, func(t *testing.T) {
			g := NewWithT(t)
			_, err := parseConnectionString([]byte(tc.in))
			g.Expect(err).To(MatchError(errInvalidConnectionString))
			g.Expect(err.Error()).NotTo(ContainSubstring("00000000"))
		})
	}

	g := NewWithT(t)
	_, err := parseConnectionString([]byte("  "))
	g.Expect(err).To(MatchError(errNoConnectionString))
}

func TestSyncAll_StopsOnCancellationAndKeepsPriorFailures(t *testing.T) {
	for _, priorFailure := range []error{nil, errTransformFailed} {
		t.Run(fmt.Sprint(priorFailure), func(t *testing.T) {
			g := NewWithT(t)
			mappings := []SecretSyncMapping{
				{SourceName: "first", SourceNamespace: "default", DestName: "first", DestNamespace: "dest"},
				{SourceName: "second", SourceNamespace: "default", DestName: "second", DestNamespace: "dest"},
				{SourceName: "third", SourceNamespace: "default", DestName: "third", DestNamespace: "dest"},
			}
			h := newTestHarness(t, mappings)
			core, logs := observer.New(zap.InfoLevel)
			logger := zapr.NewLogger(zap.New(core))
			ctx, stop := context.WithCancel(log.IntoContext(context.Background(), logger))
			defer stop()
			h.reconciler.logger = logger
			var requested []string
			h.reconciler.k8sClient = fake.NewClientBuilder().WithInterceptorFuncs(interceptor.Funcs{
				Get: func(_ context.Context, _ client.WithWatch, key client.ObjectKey, _ client.Object, _ ...client.GetOption) error {
					requested = append(requested, key.Name)
					if priorFailure != nil && len(requested) == 1 {
						return priorFailure
					}
					stop()
					return context.Canceled
				},
			}).Build()

			err := h.reconciler.SyncAll(ctx)
			g.Expect(errors.Is(err, context.Canceled)).To(BeTrue())
			wantRequested := []string{"first"}
			wantErrors := 0
			if priorFailure != nil {
				g.Expect(errors.Is(err, priorFailure)).To(BeTrue())
				wantRequested = append(wantRequested, "second")
				wantErrors = 1 // The mapping failure. The run itself was canceled.
			}
			g.Expect(requested).To(Equal(wantRequested))
			g.Expect(logs.FilterLevelExact(zap.ErrorLevel).Len()).To(Equal(wantErrors))
		})
	}
}

func TestSyncAll_LogsAFailureThatCoincidesWithCancellation(t *testing.T) {
	g := NewWithT(t)
	mappings := []SecretSyncMapping{
		{SourceName: "first", SourceNamespace: "default", DestName: "first", DestNamespace: "dest"},
		{SourceName: "second", SourceNamespace: "default", DestName: "second", DestNamespace: "dest"},
	}
	h := newTestHarness(t, mappings)
	core, logs := observer.New(zap.InfoLevel)
	logger := zapr.NewLogger(zap.New(core))
	ctx, stop := context.WithCancel(log.IntoContext(context.Background(), logger))
	defer stop()
	h.reconciler.logger = logger
	var requested []string
	h.reconciler.k8sClient = fake.NewClientBuilder().WithInterceptorFuncs(interceptor.Funcs{
		Get: func(_ context.Context, _ client.WithWatch, key client.ObjectKey, _ client.Object, _ ...client.GetOption) error {
			requested = append(requested, key.Name)
			stop()
			return errTransformFailed
		},
	}).Build()

	err := h.reconciler.SyncAll(ctx)
	g.Expect(err).To(MatchError(errTransformFailed))
	g.Expect(requested).To(Equal([]string{"first"}))
	g.Expect(logs.FilterLevelExact(zap.ErrorLevel).Len()).To(Equal(1))
}
