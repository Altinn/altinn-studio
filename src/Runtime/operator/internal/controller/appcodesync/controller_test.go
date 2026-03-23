package appcodesync

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"altinn.studio/operator/internal"
	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/operatorcontext"
)

var errSimulatedConflict = errors.New("simulated conflict")

type testHarness struct {
	reconciler *AppCodesSyncReconciler
	k8sClient  client.Client
	clock      *opclock.FakeClock
}

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	return newFakeK8sClientWithInterceptors(interceptor.Funcs{}, initObjs...)
}

func newFakeK8sClientWithInterceptors(interceptorFuncs interceptor.Funcs, initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		panic(err)
	}
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithInterceptorFuncs(interceptorFuncs).
		WithObjects(initObjs...).
		Build()
}

func newTestHarness(t *testing.T, initObjs ...client.Object) *testHarness {
	t.Helper()

	return newTestHarnessWithClient(t, newFakeK8sClient(initObjs...))
}

func newTestHarnessWithClient(t *testing.T, k8sClient client.Client) *testHarness {
	t.Helper()

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

func TestReconciler_CreatesCodesForAllTypes(t *testing.T) {
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
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	g.Expect(updated.Data).To(HaveKey("existing-key"))
	g.Expect(updated.Data).To(HaveKey(appCodesFileName))

	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.PaymentsCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback).To(HaveLen(1))
	g.Expect(isValidCode(parsed.AppCodes.NotificationCallback[0], defaultCodeLength)).To(BeTrue())
	g.Expect(isValidCode(parsed.AppCodes.PaymentsCallback[0], defaultCodeLength)).To(BeTrue())
	g.Expect(isValidCode(parsed.AppCodes.WorkflowEngineCallback[0], defaultCodeLength)).To(BeTrue())
	g.Expect(parseIssuedAtAnnotationForTest(t, updated.Annotations[notificationCallbackIssuedAtAnnotationKey])).
		To(HaveLen(1))
	g.Expect(parseIssuedAtAnnotationForTest(t, updated.Annotations[paymentsCallbackIssuedAtAnnotationKey])).
		To(HaveLen(1))
	g.Expect(parseIssuedAtAnnotationForTest(t, updated.Annotations[workflowIssuedAtAnnotationKey])).To(HaveLen(1))
	g.Expect(result.RequeueAfter).To(Equal(baseIssueLifetime - baseRotationLeadTime))

	untouched := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(other), untouched)).To(Succeed())
	g.Expect(untouched.Data).NotTo(HaveKey(appCodesFileName))
}

func TestReconciler_PreservesUnrelatedAnnotations(t *testing.T) {
	g := NewWithT(t)

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				"other-annotation": "preserved",
			},
		},
	}

	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	g.Expect(updated.Annotations).To(HaveKeyWithValue("other-annotation", "preserved"))
	g.Expect(updated.Annotations).To(HaveKey(notificationCallbackIssuedAtAnnotationKey))
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
	g.Expect(updated.Annotations).NotTo(HaveKey(notificationCallbackIssuedAtAnnotationKey))
	g.Expect(result.RequeueAfter).To(BeZero())
}

func TestReconciler_RotatesNotificationAndPaymentsBeforeWorkflow(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []issuedCode{{
		Value:    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
		IssuedAt: now.Add(-baseIssueLifetime + baseRotationLeadTime),
	}}
	paymentsCodes := []issuedCode{{
		Value:    "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
		IssuedAt: now.Add(-baseIssueLifetime + baseRotationLeadTime),
	}}
	workflowCodes := []issuedCode{{
		Value:    "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
		IssuedAt: now.Add(-10 * 24 * time.Hour),
	}}

	target := buildSecretWithCodes(t, notificationCodes, paymentsCodes, workflowCodes)
	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(2))
	g.Expect(parsed.AppCodes.NotificationCallback[1]).To(Equal(notificationCodes[0].Value))
	g.Expect(parsed.AppCodes.PaymentsCallback).To(HaveLen(2))
	g.Expect(parsed.AppCodes.PaymentsCallback[1]).To(Equal(paymentsCodes[0].Value))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback).To(Equal([]string{workflowCodes[0].Value}))
}

func TestReconciler_WorkflowUsesLongerTimings(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	workflowSpec := specByPropertyName("WorkflowEngineCallback")
	workflowCodes := []issuedCode{{
		Value:    "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
		IssuedAt: now.Add(-workflowSpec.rotationInterval()),
	}}

	target := buildSecretWithCodes(t, nil, nil, workflowCodes)
	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.PaymentsCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback).To(HaveLen(2))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback[1]).To(Equal(workflowCodes[0].Value))
	g.Expect(result.RequeueAfter).To(Equal(baseIssueLifetime - baseRotationLeadTime))
}

func TestReconciler_RequeuesForEarliestTypeEvent(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []issuedCode{{
		Value:    "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
		IssuedAt: now,
	}}
	paymentsCodes := []issuedCode{{
		Value:    "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
		IssuedAt: now.Add(-2 * 24 * time.Hour),
	}}
	workflowCodes := []issuedCode{{
		Value:    "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
		IssuedAt: now,
	}}

	target := buildSecretWithCodes(t, notificationCodes, paymentsCodes, workflowCodes)
	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))
	g.Expect(result.RequeueAfter).To(Equal(baseIssueLifetime - baseRotationLeadTime - 2*24*time.Hour))
}

func TestReconciler_KeepsThreeNotificationCodesAndRequeuesForOldestExpiry(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []issuedCode{
		{
			Value:    "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII",
			IssuedAt: now.Add(-2 * 24 * time.Hour),
		},
		{
			Value:    "JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ",
			IssuedAt: now.Add(-26 * 24 * time.Hour),
		},
		{
			Value:    "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
			IssuedAt: now.Add(-50 * 24 * time.Hour),
		},
	}

	target := buildSecretWithCodes(t, notificationCodes, nil, nil)
	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(Equal([]string{
		notificationCodes[0].Value,
		notificationCodes[1].Value,
		notificationCodes[2].Value,
	}))
	g.Expect(result.RequeueAfter).To(Equal(12 * 24 * time.Hour))
}

func TestReconciler_RemovesExpiredNotificationCode(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []issuedCode{
		{
			Value:    "LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL",
			IssuedAt: now.Add(-5 * 24 * time.Hour),
		},
		{
			Value:    "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
			IssuedAt: now.Add(-(baseAcceptLifetime + 24*time.Hour)),
		},
	}

	target := buildSecretWithCodes(t, notificationCodes, nil, nil)
	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(Equal([]string{notificationCodes[0].Value}))
}

func TestReconciler_PreservesNotificationCodesWhenIssuedAtMetadataMissing(t *testing.T) {
	g := NewWithT(t)

	const oldCode = "NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN"
	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{
			appCodesFileName: []byte(`{"AppCodes":{"NotificationCallback":["` + oldCode + `"]}}`),
		},
	}

	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.NotificationCallback[0]).To(Equal(oldCode))
	g.Expect(parseIssuedAtAnnotationForTest(t, updated.Annotations[notificationCallbackIssuedAtAnnotationKey])).
		To(Equal([]string{h.clock.Now().UTC().Format(time.RFC3339)}))
}

func TestReconciler_PreservesNotificationCodesWhenIssuedAtMetadataIsInvalid(t *testing.T) {
	g := NewWithT(t)

	const oldCode = "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO"
	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				notificationCallbackIssuedAtAnnotationKey: `["not-a-timestamp"]`,
			},
		},
		Data: map[string][]byte{
			appCodesFileName: []byte(`{"AppCodes":{"NotificationCallback":["` + oldCode + `"]}}`),
		},
	}

	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.NotificationCallback[0]).To(Equal(oldCode))
	g.Expect(parseIssuedAtAnnotationForTest(t, updated.Annotations[notificationCallbackIssuedAtAnnotationKey])).
		To(Equal([]string{h.clock.Now().UTC().Format(time.RFC3339)}))
}

func TestReconciler_RetriesOnConflictAndPreservesConcurrentChanges(t *testing.T) {
	g := NewWithT(t)

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				"existing-annotation": "before",
			},
		},
		Data: map[string][]byte{
			"existing-key": []byte("before"),
		},
	}

	conflictInjected := false
	k8sClient := newFakeK8sClientWithInterceptors(
		interceptor.Funcs{
			Update: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
				if conflictInjected || obj.GetNamespace() != target.Namespace || obj.GetName() != target.Name {
					return c.Update(ctx, obj, opts...)
				}

				conflictInjected = true
				if err := applyConcurrentSecretMutation(ctx, c, client.ObjectKeyFromObject(target)); err != nil {
					return err
				}

				return apierrors.NewConflict(
					schema.GroupResource{Group: "", Resource: "secrets"},
					obj.GetName(),
					errSimulatedConflict,
				)
			},
		},
		target,
	)

	h := newTestHarnessWithClient(t, k8sClient)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	g.Expect(conflictInjected).To(BeTrue())
	g.Expect(updated.Annotations).To(HaveKeyWithValue("existing-annotation", "after-conflict"))
	g.Expect(updated.Data).To(HaveKeyWithValue("existing-key", []byte("after-conflict")))
	g.Expect(updated.Data).To(HaveKey(appCodesFileName))
	g.Expect(updated.Annotations).To(HaveKey(notificationCallbackIssuedAtAnnotationKey))
}

func buildSecretWithCodes(
	t *testing.T,
	notificationCodes []issuedCode,
	paymentsCodes []issuedCode,
	workflowCodes []issuedCode,
) *corev1.Secret {
	t.Helper()

	appCodes := appCodesFile{AppCodes: appCodesSection{}}
	annotations := make(map[string]string)

	if len(notificationCodes) > 0 {
		appCodes.AppCodes.NotificationCallback = codeValues(notificationCodes)
		issuedAt, err := marshalIssuedAtAnnotation(notificationCodes)
		if err != nil {
			t.Fatalf("marshal notification issued-at: %v", err)
		}
		annotations[notificationCallbackIssuedAtAnnotationKey] = issuedAt
	}
	if len(paymentsCodes) > 0 {
		appCodes.AppCodes.PaymentsCallback = codeValues(paymentsCodes)
		issuedAt, err := marshalIssuedAtAnnotation(paymentsCodes)
		if err != nil {
			t.Fatalf("marshal payments issued-at: %v", err)
		}
		annotations[paymentsCallbackIssuedAtAnnotationKey] = issuedAt
	}
	if len(workflowCodes) > 0 {
		appCodes.AppCodes.WorkflowEngineCallback = codeValues(workflowCodes)
		issuedAt, err := marshalIssuedAtAnnotation(workflowCodes)
		if err != nil {
			t.Fatalf("marshal workflow issued-at: %v", err)
		}
		annotations[workflowIssuedAtAnnotationKey] = issuedAt
	}

	data, err := json.Marshal(appCodes)
	if err != nil {
		t.Fatalf("marshal app codes file: %v", err)
	}

	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:        "ttd-testapp-deployment-secrets",
			Namespace:   "default",
			Annotations: annotations,
		},
		Data: map[string][]byte{
			appCodesFileName: data,
		},
	}
}

func parseAppCodesFileForTest(t *testing.T, data []byte) appCodesFile {
	t.Helper()

	var parsed appCodesFile
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to parse app codes file: %v", err)
	}
	return parsed
}

func parseIssuedAtAnnotationForTest(t *testing.T, data string) []string {
	t.Helper()

	var parsed []string
	if err := json.Unmarshal([]byte(data), &parsed); err != nil {
		t.Fatalf("failed to parse issued-at annotation: %v", err)
	}
	return parsed
}

func applyConcurrentSecretMutation(ctx context.Context, c client.WithWatch, target client.ObjectKey) error {
	current := &corev1.Secret{}
	if err := c.Get(ctx, target, current); err != nil {
		return fmt.Errorf("get secret during conflict injection: %w", err)
	}
	if current.Annotations == nil {
		current.Annotations = make(map[string]string)
	}
	if current.Data == nil {
		current.Data = make(map[string][]byte)
	}
	current.Annotations["existing-annotation"] = "after-conflict"
	current.Data["existing-key"] = []byte("after-conflict")
	if err := c.Update(ctx, current); err != nil {
		return fmt.Errorf("update secret during conflict injection: %w", err)
	}
	return nil
}

func specByPropertyName(name string) codeTypeSpec {
	for _, spec := range codeTypeSpecs {
		if spec.PropertyName == name {
			return spec
		}
	}
	panic("unknown code type spec: " + name)
}
