package azurekeyvaultsync

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"altinn.studio/operator/internal"
	"altinn.studio/operator/internal/fakes"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(initObjs...).
		Build()
}

func (m KeyVaultSecretMapping) objectKey() client.ObjectKey {
	return client.ObjectKey{Name: m.Name, Namespace: m.Namespace}
}

func (m KeyVaultSecretMapping) fileData(secret *corev1.Secret) []byte {
	return secret.Data[m.FileName]
}

type testHarness struct {
	reconciler *AzureKeyVaultReconciler
	kvClient   *fakes.FakeKeyVaultClient
	k8sClient  client.Client
	clock      *clockwork.FakeClock
	ctx        context.Context
}

func newTestHarness(t *testing.T, mappings []KeyVaultSecretMapping, initObjs ...client.Object) *testHarness {
	t.Helper()

	kvClient := fakes.NewFakeKeyVaultClient()
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

	reconciler := NewReconcilerForTesting(
		rt,
		k8sClient,
		kvClient,
		mappings,
	)

	return &testHarness{
		reconciler: reconciler,
		kvClient:   kvClient,
		k8sClient:  k8sClient,
		clock:      clock,
		ctx:        context.Background(),
	}
}

func TestReconciler_CreatesSecretOnSync(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"secret-1", "secret-2"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping})

	h.kvClient.SetSecret(mapping.Secrets[0], "value-1")
	h.kvClient.SetSecret(mapping.Secrets[1], "value-2")

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).NotTo(HaveOccurred())

	var parsed map[string]string
	err = json.Unmarshal(mapping.fileData(secret), &parsed)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(parsed[mapping.Secrets[0]]).To(Equal("value-1"))
	g.Expect(parsed[mapping.Secrets[1]]).To(Equal("value-2"))

	g.Expect(secret.Labels["app.kubernetes.io/managed-by"]).To(Equal("altinn-studio-operator"))
}

func TestReconciler_UpdatesExistingSecret(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"secret-1"},
	}

	existingSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.Name,
			Namespace: mapping.Namespace,
		},
		Data: map[string][]byte{
			mapping.FileName: []byte(`{"secret-1":"old-value"}`),
		},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping}, existingSecret)

	h.kvClient.SetSecret(mapping.Secrets[0], "new-value")

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).NotTo(HaveOccurred())

	var parsed map[string]string
	err = json.Unmarshal(mapping.fileData(secret), &parsed)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(parsed[mapping.Secrets[0]]).To(Equal("new-value"))
}

func TestReconciler_HandlesKVSecretNotFound(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"missing-secret"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping})

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).To(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_HandlesTransientKVFailure(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"flaky-secret"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping})

	h.kvClient.SetError(mapping.Secrets[0], fakes.TransientError())

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).To(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_ContinuesOnPartialFailure(t *testing.T) {
	g := NewWithT(t)

	goodMapping := KeyVaultSecretMapping{
		Name:      "good-k8s-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"good-secret"},
	}
	badMapping := KeyVaultSecretMapping{
		Name:      "bad-k8s-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"bad-secret"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{goodMapping, badMapping})

	h.kvClient.SetSecret(goodMapping.Secrets[0], "good-value")
	// bad-secret will return 404

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).To(HaveOccurred())

	// Good secret should be created
	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, goodMapping.objectKey(), secret)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(goodMapping.fileData(secret)).NotTo(BeEmpty())

	// Bad secret should not exist
	err = h.k8sClient.Get(h.ctx, badMapping.objectKey(), secret)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_SyncsMultipleMappings(t *testing.T) {
	g := NewWithT(t)

	mapping1 := KeyVaultSecretMapping{
		Name:      "first",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"secret-a", "secret-b"},
	}
	mapping2 := KeyVaultSecretMapping{
		Name:      "second",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"secret-c"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping1, mapping2})

	h.kvClient.SetSecret(mapping1.Secrets[0], "a")
	h.kvClient.SetSecret(mapping1.Secrets[1], "b")
	h.kvClient.SetSecret(mapping2.Secrets[0], "c")

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	// Verify first secret
	secret1 := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping1.objectKey(), secret1)
	g.Expect(err).NotTo(HaveOccurred())

	var parsed1 map[string]string
	err = json.Unmarshal(mapping1.fileData(secret1), &parsed1)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(parsed1[mapping1.Secrets[0]]).To(Equal("a"))
	g.Expect(parsed1[mapping1.Secrets[1]]).To(Equal("b"))

	// Verify second secret
	secret2 := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping2.objectKey(), secret2)
	g.Expect(err).NotTo(HaveOccurred())

	var parsed2 map[string]string
	err = json.Unmarshal(mapping2.fileData(secret2), &parsed2)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(parsed2[mapping2.Secrets[0]]).To(Equal("c"))
}

func TestReconciler_PreservesOtherKeysInSecret(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"new-secret"},
	}

	existingSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.Name,
			Namespace: mapping.Namespace,
		},
		Data: map[string][]byte{
			"other-file.txt": []byte("should-be-preserved"),
		},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping}, existingSecret)

	h.kvClient.SetSecret(mapping.Secrets[0], "new-value")

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).NotTo(HaveOccurred())

	g.Expect(mapping.fileData(secret)).NotTo(BeEmpty())
	g.Expect(string(secret.Data["other-file.txt"])).To(Equal("should-be-preserved"))
}

func TestReconciler_HandlesNilSecretData(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"secret-1"},
	}

	existingSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mapping.Name,
			Namespace: mapping.Namespace,
		},
		Data: nil,
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping}, existingSecret)

	h.kvClient.SetSecret(mapping.Secrets[0], "value-1")

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(mapping.fileData(secret)).NotTo(BeEmpty())
}

func TestReconciler_FailsIfAnySecretMissing(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"secret-1", "secret-2", "secret-3"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping})

	h.kvClient.SetSecret(mapping.Secrets[0], "value-1")
	// secret-2 missing
	h.kvClient.SetSecret(mapping.Secrets[2], "value-3")

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).To(HaveOccurred())

	// K8s secret should not be created when any KV secret is missing
	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).To(HaveOccurred())
}

func TestReconciler_NeedLeaderElection(t *testing.T) {
	g := NewWithT(t)

	h := newTestHarness(t, nil)

	g.Expect(h.reconciler.NeedLeaderElection()).To(BeTrue())
}

func TestReconciler_EmptyMappings(t *testing.T) {
	g := NewWithT(t)

	h := newTestHarness(t, []KeyVaultSecretMapping{})

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
}

func TestReconciler_RecoversFromTransientError(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test-secret",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"flaky-secret"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping})

	// First sync fails
	h.kvClient.SetError(mapping.Secrets[0], fakes.TransientError())

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).To(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).To(HaveOccurred())

	// Second sync succeeds
	h.kvClient.ClearError(mapping.Secrets[0])
	h.kvClient.SetSecret(mapping.Secrets[0], "recovered-value")

	err = h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).NotTo(HaveOccurred())

	var parsed map[string]string
	err = json.Unmarshal(mapping.fileData(secret), &parsed)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(parsed[mapping.Secrets[0]]).To(Equal("recovered-value"))
}

func TestReconciler_RawOutputStoresPlainString(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "raw-secret",
		Namespace: "default",
		FileName:  "connection-string",
		Secrets:   []string{"ConnectionString"},
		Raw:       true,
		BuildOutput: func(secrets map[string]string) any {
			return secrets["ConnectionString"]
		},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping})
	h.kvClient.SetSecret("ConnectionString", "InstrumentationKey=abc123")

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	secret := &corev1.Secret{}
	err = h.k8sClient.Get(h.ctx, mapping.objectKey(), secret)
	g.Expect(err).NotTo(HaveOccurred())

	// Raw output should NOT be JSON-encoded (no quotes)
	g.Expect(string(mapping.fileData(secret))).To(Equal("InstrumentationKey=abc123"))
}

func TestReconciler_StartExitsOnContextCancellation(t *testing.T) {
	g := NewWithT(t)

	mapping := KeyVaultSecretMapping{
		Name:      "test",
		Namespace: "default",
		FileName:  "secrets.json",
		Secrets:   []string{"secret-1"},
	}

	h := newTestHarness(t, []KeyVaultSecretMapping{mapping})
	h.kvClient.SetSecret(mapping.Secrets[0], "value-1")

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan error, 1)
	go func() {
		done <- h.reconciler.Start(ctx)
	}()

	// Cancel immediately - Start should exit
	cancel()

	select {
	case err := <-done:
		g.Expect(err).NotTo(HaveOccurred())
	case <-time.After(2 * time.Second):
		t.Fatal("Start did not exit after context cancellation")
	}
}
