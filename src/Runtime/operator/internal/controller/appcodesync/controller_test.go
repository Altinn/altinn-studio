package appcodesync

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"altinn.studio/operator/internal"
	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/operatorcontext"
)

type testHarness struct {
	reconciler *AppCodesSyncReconciler
	k8sClient  client.Client
	clock      *opclock.FakeClock
}

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		panic(err)
	}
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(initObjs...).
		Build()
}

func newTestHarness(t *testing.T, initObjs ...client.Object) *testHarness {
	t.Helper()

	k8sClient := newFakeK8sClient(initObjs...)
	clock := opclock.NewFakeClockAt(time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC))

	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			Environment: operatorcontext.EnvironmentLocal,
			ServiceOwner: operatorcontext.ServiceOwner{
				Id: "ttd",
			},
		}),
	)
	if err != nil {
		t.Fatalf("failed to create runtime: %v", err)
	}

	return &testHarness{
		reconciler: NewReconciler(rt, k8sClient),
		k8sClient:  k8sClient,
		clock:      clock,
	}
}

func (*testHarness) ctx() context.Context {
	return context.Background()
}

func (h *testHarness) reconcile(t *testing.T, key client.ObjectKey) ctrl.Result {
	t.Helper()

	result, err := h.reconciler.Reconcile(h.ctx(), ctrl.Request{NamespacedName: key})
	if err != nil {
		t.Fatalf("reconcile failed: %v", err)
	}
	return result
}

func TestReconciler_CreatesCodesForMatchingSecrets(t *testing.T) {
	g := NewWithT(t)

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{
			"existing-key": []byte("value"),
		},
	}
	other := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "nhn-testapp-deployment-secrets",
			Namespace: "default",
		},
	}

	h := newTestHarness(t, target, other)

	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	g.Expect(updated.Data).To(HaveKey("existing-key"))
	g.Expect(updated.Data).To(HaveKey(appCodesFileName))

	parsed := parseAppCodesFile(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.Monthly).To(HaveLen(1))
	g.Expect(parsed.AppCodes.Monthly[0]).To(HaveLen(monthlyCodeLength))
	g.Expect(isValidMonthlyCode(parsed.AppCodes.Monthly[0])).To(BeTrue())
	g.Expect(parseIssuedAtAnnotation(t, updated.Annotations[monthlyIssuedAtAnnotationKey])).To(HaveLen(1))

	untouched := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(other), untouched)).To(Succeed())
	g.Expect(untouched.Data).NotTo(HaveKey(appCodesFileName))
}

func TestReconciler_IgnoresMatchingSecretOutsideDefaultNamespace(t *testing.T) {
	g := NewWithT(t)

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "other",
		},
	}

	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	g.Expect(updated.Data).NotTo(HaveKey(appCodesFileName))
	g.Expect(updated.Annotations).NotTo(HaveKey(monthlyIssuedAtAnnotationKey))
	g.Expect(result.RequeueAfter).To(BeZero())
}

func TestReconciler_PrependsReplacementCodeBeforeExpiry(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	issuedAt := now.Add(-monthlyCodeRotationInterval)
	existing := []monthlyCode{{
		Value:    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
		IssuedAt: issuedAt,
	}}

	fileData, annotation, err := marshalMonthlyCodes(existing)
	g.Expect(err).NotTo(HaveOccurred())

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				monthlyIssuedAtAnnotationKey: annotation,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: fileData,
		},
	}

	h := newTestHarness(t, target)

	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFile(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.Monthly).To(HaveLen(2))
	g.Expect(parsed.AppCodes.Monthly[1]).To(Equal(existing[0].Value))
	g.Expect(parsed.AppCodes.Monthly[0]).NotTo(Equal(existing[0].Value))

	timestamps := parseIssuedAtAnnotation(t, updated.Annotations[monthlyIssuedAtAnnotationKey])
	g.Expect(timestamps).To(HaveLen(2))
	g.Expect(timestamps[1]).To(Equal(issuedAt.Format(time.RFC3339)))
	g.Expect(timestamps[0]).To(Equal(h.clock.Now().UTC().Format(time.RFC3339)))
}

func TestReconciler_KeepsCodePast31DaysForVerification(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	existing := []monthlyCode{{
		Value:    "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
		IssuedAt: now.Add(-32 * 24 * time.Hour),
	}}

	fileData, annotation, err := marshalMonthlyCodes(existing)
	g.Expect(err).NotTo(HaveOccurred())

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				monthlyIssuedAtAnnotationKey: annotation,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: fileData,
		},
	}

	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFile(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.Monthly).To(HaveLen(2))
	g.Expect(parsed.AppCodes.Monthly[1]).To(Equal(existing[0].Value))
}

func TestReconciler_RequeuesForNextRotationWhenSingleCodeIsFresh(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	existing := []monthlyCode{{
		Value:    "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
		IssuedAt: now,
	}}

	fileData, annotation, err := marshalMonthlyCodes(existing)
	g.Expect(err).NotTo(HaveOccurred())

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				monthlyIssuedAtAnnotationKey: annotation,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: fileData,
		},
	}

	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))
	g.Expect(result.RequeueAfter).To(Equal(monthlyCodeRotationInterval))
}

func TestReconciler_RequeuesForOldestCodeExpiryWhenTwoCodesExist(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	existing := []monthlyCode{
		{
			Value:    "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII",
			IssuedAt: now.Add(-7 * 24 * time.Hour),
		},
		{
			Value:    "JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ",
			IssuedAt: now.Add(-61 * 24 * time.Hour),
		},
	}

	fileData, annotation, err := marshalMonthlyCodes(existing)
	g.Expect(err).NotTo(HaveOccurred())

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				monthlyIssuedAtAnnotationKey: annotation,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: fileData,
		},
	}

	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))
	g.Expect(result.RequeueAfter).To(Equal(24 * time.Hour))
}

func TestReconciler_KeepsThreeCodeSteadyStateAndRequeuesForOldestExpiry(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	existing := []monthlyCode{
		{
			Value:    "LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL",
			IssuedAt: now.Add(-2 * 24 * time.Hour),
		},
		{
			Value:    "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
			IssuedAt: now.Add(-26 * 24 * time.Hour),
		},
		{
			Value:    "NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN",
			IssuedAt: now.Add(-50 * 24 * time.Hour),
		},
	}

	fileData, annotation, err := marshalMonthlyCodes(existing)
	g.Expect(err).NotTo(HaveOccurred())

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				monthlyIssuedAtAnnotationKey: annotation,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: fileData,
		},
	}

	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFile(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.Monthly).To(Equal([]string{
		"LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL",
		"MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
		"NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN",
	}))
	g.Expect(parseIssuedAtAnnotation(t, updated.Annotations[monthlyIssuedAtAnnotationKey])).To(Equal([]string{
		now.Add(-2 * 24 * time.Hour).Format(time.RFC3339),
		now.Add(-26 * 24 * time.Hour).Format(time.RFC3339),
		now.Add(-50 * 24 * time.Hour).Format(time.RFC3339),
	}))
	g.Expect(result.RequeueAfter).To(Equal(12 * 24 * time.Hour))
}

func TestReconciler_RemovesExpiredCodes(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	existing := []monthlyCode{
		{
			Value:    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
			IssuedAt: now.Add(-5 * 24 * time.Hour),
		},
		{
			Value:    "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
			IssuedAt: now.Add(-63 * 24 * time.Hour),
		},
	}

	fileData, annotation, err := marshalMonthlyCodes(existing)
	g.Expect(err).NotTo(HaveOccurred())

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				monthlyIssuedAtAnnotationKey: annotation,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: fileData,
		},
	}

	h := newTestHarness(t, target)

	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFile(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.Monthly).To(Equal([]string{"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"}))
	g.Expect(parseIssuedAtAnnotation(t, updated.Annotations[monthlyIssuedAtAnnotationKey])).
		To(Equal([]string{now.Add(-5 * 24 * time.Hour).Format(time.RFC3339)}))
}

func TestReconciler_ReplacesCodesWhenIssuedAtMetadataMissing(t *testing.T) {
	g := NewWithT(t)

	const oldCode = "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"
	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{
			appCodesFileName: []byte(`{"AppCodes":{"Monthly":["` + oldCode + `"]}}`),
		},
	}

	h := newTestHarness(t, target)

	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFile(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.Monthly).To(HaveLen(1))
	g.Expect(parsed.AppCodes.Monthly[0]).NotTo(Equal(oldCode))
	g.Expect(parseIssuedAtAnnotation(t, updated.Annotations[monthlyIssuedAtAnnotationKey])).
		To(Equal([]string{h.clock.Now().UTC().Format(time.RFC3339)}))
}

func TestReconciler_ReplacesCodesWhenIssuedAtMetadataIsInvalid(t *testing.T) {
	assertInvalidIssuedAtMetadataReplaced(t, `["not-a-timestamp"]`, "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE")
}

func TestReconciler_ReplacesCodesWhenIssuedAtMetadataCountMismatches(t *testing.T) {
	assertInvalidIssuedAtMetadataReplaced(t, `[]`, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")
}

func TestReconciler_ReplacesCodesWhenIssuedAtMetadataIsInFuture(t *testing.T) {
	assertInvalidIssuedAtMetadataReplaced(t, `["2026-03-24T12:00:00Z"]`, "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")
}

func assertInvalidIssuedAtMetadataReplaced(t *testing.T, annotationValue, oldCode string) {
	t.Helper()

	g := NewWithT(t)

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				monthlyIssuedAtAnnotationKey: annotationValue,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: []byte(`{"AppCodes":{"Monthly":["` + oldCode + `"]}}`),
		},
	}

	h := newTestHarness(t, target)

	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFile(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.Monthly).To(HaveLen(1))
	g.Expect(parsed.AppCodes.Monthly[0]).NotTo(Equal(oldCode))
	g.Expect(parseIssuedAtAnnotation(t, updated.Annotations[monthlyIssuedAtAnnotationKey])).
		To(Equal([]string{h.clock.Now().UTC().Format(time.RFC3339)}))
}

func parseAppCodesFile(t *testing.T, data []byte) appCodesFile {
	t.Helper()

	var parsed appCodesFile
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to parse app codes file: %v", err)
	}
	return parsed
}

func parseIssuedAtAnnotation(t *testing.T, data string) []string {
	t.Helper()

	var parsed []string
	if err := json.Unmarshal([]byte(data), &parsed); err != nil {
		t.Fatalf("failed to parse issued-at annotation: %v", err)
	}
	return parsed
}
