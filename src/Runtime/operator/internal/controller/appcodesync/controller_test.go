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

func (h *testHarness) reconcileErr(key client.ObjectKey) error {
	_, err := h.reconciler.Reconcile(h.ctx(), ctrl.Request{NamespacedName: key})
	return err
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
	g.Expect(updated.Annotations).NotTo(HaveKey("altinn.studio/app-codes-notificationcallback-issued-at"))

	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.PaymentsCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback).To(HaveLen(1))
	assertGeneratedEntry(
		g,
		parsed.AppCodes.NotificationCallback[0],
		h.clock.Now().UTC(),
		specByPropertyName("NotificationCallback"),
	)
	assertGeneratedEntry(
		g,
		parsed.AppCodes.PaymentsCallback[0],
		h.clock.Now().UTC(),
		specByPropertyName("PaymentsCallback"),
	)
	assertGeneratedEntry(
		g,
		parsed.AppCodes.WorkflowEngineCallback[0],
		h.clock.Now().UTC(),
		specByPropertyName("WorkflowEngineCallback"),
	)
	g.Expect(result.RequeueAfter).To(Equal(baseIssueLifetime - baseRotationLeadTime))

	untouched := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(other), untouched)).To(Succeed())
	g.Expect(untouched.Data).NotTo(HaveKey(appCodesFileName))
}

func TestReconciler_PreservesUnrelatedAnnotationsAndRemovesObsoleteAppCodeAnnotations(t *testing.T) {
	g := NewWithT(t)

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				"other-annotation":                                       "preserved",
				"altinn.studio/app-codes-monthly-issued-at":              `["2026-03-01T12:00:00Z"]`,
				"altinn.studio/app-codes-notificationcallback-issued-at": `["2026-03-01T12:00:00Z"]`,
			},
		},
	}

	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	g.Expect(updated.Annotations).To(HaveKeyWithValue("other-annotation", "preserved"))
	g.Expect(updated.Annotations).NotTo(HaveKey("altinn.studio/app-codes-monthly-issued-at"))
	g.Expect(updated.Annotations).NotTo(HaveKey("altinn.studio/app-codes-notificationcallback-issued-at"))
}

func TestReconciler_ReturnsErrorAndPreservesSecretWhenAppCodesFileIsMalformed(t *testing.T) {
	g := NewWithT(t)

	const malformedFile = `{"AppCodes":{"NotificationCallback":[{"Id":"abcdefghijklmnopqrstuv","Code":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","IssuedAt":123}]}}`
	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{
			appCodesFileName: []byte(malformedFile),
			"existing-key":   []byte("value"),
		},
	}

	h := newTestHarness(t, target)
	err := h.reconcileErr(client.ObjectKeyFromObject(target))
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("unmarshal app codes file"))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	g.Expect(string(updated.Data[appCodesFileName])).To(Equal(malformedFile))
	g.Expect(updated.Data).To(HaveKeyWithValue("existing-key", []byte("value")))
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
	g.Expect(result.RequeueAfter).To(BeZero())
}

func TestReconciler_RotatesNotificationAndPaymentsBeforeWorkflow(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []appCode{
		testCode(
			"NotificationCallback",
			"bbbbbbbbbbbbbbbbbbbbbb",
			"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
			now.Add(-baseIssueLifetime+baseRotationLeadTime),
		),
	}
	paymentsCodes := []appCode{
		testCode(
			"PaymentsCallback",
			"cccccccccccccccccccccc",
			"CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
			now.Add(-baseIssueLifetime+baseRotationLeadTime),
		),
	}
	workflowCodes := []appCode{
		testCode(
			"WorkflowEngineCallback",
			"dddddddddddddddddddddd",
			"DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
			now.Add(-10*24*time.Hour),
		),
	}

	target := buildSecretWithCodes(t, notificationCodes, paymentsCodes, workflowCodes)
	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(2))
	g.Expect(parsed.AppCodes.NotificationCallback[1].Code).To(Equal(notificationCodes[0].Code))
	g.Expect(parsed.AppCodes.NotificationCallback[1].ID).To(Equal(notificationCodes[0].ID))
	g.Expect(parsed.AppCodes.PaymentsCallback).To(HaveLen(2))
	g.Expect(parsed.AppCodes.PaymentsCallback[1].Code).To(Equal(paymentsCodes[0].Code))
	g.Expect(parsed.AppCodes.PaymentsCallback[1].ID).To(Equal(paymentsCodes[0].ID))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback[0].Code).To(Equal(workflowCodes[0].Code))
}

func TestReconciler_WorkflowUsesLongerTimings(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	workflowSpec := specByPropertyName("WorkflowEngineCallback")
	workflowCodes := []appCode{
		testCode(
			"WorkflowEngineCallback",
			"eeeeeeeeeeeeeeeeeeeeee",
			"EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
			now.Add(-workflowSpec.rotationInterval()),
		),
	}

	target := buildSecretWithCodes(t, nil, nil, workflowCodes)
	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.PaymentsCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback).To(HaveLen(2))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback[1].Code).To(Equal(workflowCodes[0].Code))
	g.Expect(parsed.AppCodes.WorkflowEngineCallback[1].ID).To(Equal(workflowCodes[0].ID))
	g.Expect(result.RequeueAfter).To(Equal(baseIssueLifetime - baseRotationLeadTime))
}

func TestReconciler_RequeuesForEarliestTypeEvent(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []appCode{
		testCode(
			"NotificationCallback",
			"ffffffffffffffffffffff",
			"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
			now,
		),
	}
	paymentsCodes := []appCode{
		testCode(
			"PaymentsCallback",
			"gggggggggggggggggggggg",
			"GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
			now.Add(-2*24*time.Hour),
		),
	}
	workflowCodes := []appCode{
		testCode(
			"WorkflowEngineCallback",
			"hhhhhhhhhhhhhhhhhhhhhh",
			"HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
			now,
		),
	}

	target := buildSecretWithCodes(t, notificationCodes, paymentsCodes, workflowCodes)
	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))
	g.Expect(result.RequeueAfter).To(Equal(baseIssueLifetime - baseRotationLeadTime - 2*24*time.Hour))
}

func TestReconciler_ReordersOutOfOrderNotificationCodesByIssuedAt(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []appCode{
		testCode(
			"NotificationCallback",
			"oldoldoldoldoldoldold1",
			"OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
			now.Add(-26*24*time.Hour),
		),
		testCode(
			"NotificationCallback",
			"newnewnewnewnewnewnew1",
			"NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN",
			now.Add(-2*24*time.Hour),
		),
	}

	target := buildSecretWithCodes(t, notificationCodes, nil, nil)
	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(entryCodes(parsed.AppCodes.NotificationCallback)).To(Equal([]string{
		notificationCodes[1].Code,
		notificationCodes[0].Code,
	}))
	g.Expect(result.RequeueAfter).To(Equal(22 * 24 * time.Hour))
}

func TestReconciler_KeepsThreeNotificationCodesAndRequeuesForOldestExpiry(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []appCode{
		testCode(
			"NotificationCallback",
			"iiiiiiiiiiiiiiiiiiiiii",
			"IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII",
			now.Add(-2*24*time.Hour),
		),
		testCode(
			"NotificationCallback",
			"jjjjjjjjjjjjjjjjjjjjjj",
			"JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ",
			now.Add(-26*24*time.Hour),
		),
		testCode(
			"NotificationCallback",
			"kkkkkkkkkkkkkkkkkkkkkk",
			"KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
			now.Add(-50*24*time.Hour),
		),
	}

	target := buildSecretWithCodes(t, notificationCodes, nil, nil)
	h := newTestHarness(t, target)
	result := h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(entryCodes(parsed.AppCodes.NotificationCallback)).To(Equal([]string{
		notificationCodes[0].Code,
		notificationCodes[1].Code,
		notificationCodes[2].Code,
	}))
	g.Expect(result.RequeueAfter).To(Equal(12 * 24 * time.Hour))
}

func TestReconciler_RemovesExpiredNotificationCode(t *testing.T) {
	g := NewWithT(t)

	now := time.Date(2026, 3, 23, 12, 0, 0, 0, time.UTC)
	notificationCodes := []appCode{
		testCode(
			"NotificationCallback",
			"llllllllllllllllllllll",
			"LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL",
			now.Add(-5*24*time.Hour),
		),
		testCode(
			"NotificationCallback",
			"mmmmmmmmmmmmmmmmmmmmmm",
			"MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
			now.Add(-(baseAcceptLifetime + 24*time.Hour)),
		),
	}

	target := buildSecretWithCodes(t, notificationCodes, nil, nil)
	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(entryCodes(parsed.AppCodes.NotificationCallback)).To(Equal([]string{notificationCodes[0].Code}))
}

func TestReconciler_PreservesNotificationCodesWhenIssuedAtMissing(t *testing.T) {
	assertNotificationCodeIssuedAtFallback(
		t,
		"nnnnnnnnnnnnnnnnnnnnnn",
		"NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN",
		"",
	)
}

func TestReconciler_PreservesNotificationCodesWhenIssuedAtIsInvalid(t *testing.T) {
	assertNotificationCodeIssuedAtFallback(
		t,
		"oooooooooooooooooooooo",
		"OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
		`,"IssuedAt":"not-a-timestamp"`,
	)
}

func TestReconciler_RetriesOnConflictAndPreservesConcurrentChanges(t *testing.T) {
	g := NewWithT(t)

	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
			Annotations: map[string]string{
				"existing-annotation": "before",
				"altinn.studio/app-codes-notificationcallback-issued-at": `["2026-03-01T12:00:00Z"]`,
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
	g.Expect(updated.Annotations).NotTo(HaveKey("altinn.studio/app-codes-notificationcallback-issued-at"))
	g.Expect(updated.Data).To(HaveKeyWithValue("existing-key", []byte("after-conflict")))
	g.Expect(updated.Data).To(HaveKey(appCodesFileName))
}

func buildSecretWithCodes(
	t *testing.T,
	notificationCodes []appCode,
	paymentsCodes []appCode,
	workflowCodes []appCode,
) *corev1.Secret {
	t.Helper()

	appCodes := appCodesFile{AppCodes: appCodesSection{}}
	if len(notificationCodes) > 0 {
		appCodes.AppCodes.NotificationCallback = marshalCodeEntries(notificationCodes)
	}
	if len(paymentsCodes) > 0 {
		appCodes.AppCodes.PaymentsCallback = marshalCodeEntries(paymentsCodes)
	}
	if len(workflowCodes) > 0 {
		appCodes.AppCodes.WorkflowEngineCallback = marshalCodeEntries(workflowCodes)
	}

	data, err := json.Marshal(appCodes)
	if err != nil {
		t.Fatalf("marshal app codes file: %v", err)
	}

	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
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

func assertGeneratedEntry(g *WithT, entry appCodeEntry, now time.Time, spec codeTypeSpec) {
	g.Expect(isValidURLSafeToken(entry.Code, spec.CodeLength)).To(BeTrue())
	g.Expect(isValidURLSafeToken(entry.ID, codeIDLength)).To(BeTrue())
	g.Expect(entry.IssuedAt).To(Equal(now.Format(time.RFC3339)))
	g.Expect(entry.ExpiresAt).To(Equal(now.Add(spec.AcceptLifetime).Format(time.RFC3339)))
}

func assertNotificationCodeIssuedAtFallback(t *testing.T, oldID, oldCode, extraFields string) {
	t.Helper()

	g := NewWithT(t)
	rawFile := fmt.Sprintf(
		`{"AppCodes":{"NotificationCallback":[{"Id":"%s","Code":"%s"%s}]}}`,
		oldID,
		oldCode,
		extraFields,
	)
	target := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-testapp-deployment-secrets",
			Namespace: "default",
		},
		Data: map[string][]byte{
			appCodesFileName: []byte(rawFile),
		},
	}

	h := newTestHarness(t, target)
	h.reconcile(t, client.ObjectKeyFromObject(target))

	updated := &corev1.Secret{}
	g.Expect(h.k8sClient.Get(h.ctx(), client.ObjectKeyFromObject(target), updated)).To(Succeed())
	parsed := parseAppCodesFileForTest(t, updated.Data[appCodesFileName])
	g.Expect(parsed.AppCodes.NotificationCallback).To(HaveLen(1))
	g.Expect(parsed.AppCodes.NotificationCallback[0].Code).To(Equal(oldCode))
	g.Expect(parsed.AppCodes.NotificationCallback[0].ID).To(Equal(oldID))
	g.Expect(parsed.AppCodes.NotificationCallback[0].IssuedAt).To(Equal(h.clock.Now().UTC().Format(time.RFC3339)))
	g.Expect(parsed.AppCodes.NotificationCallback[0].ExpiresAt).
		To(Equal(h.clock.Now().UTC().Add(baseAcceptLifetime).Format(time.RFC3339)))
}

func entryCodes(entries []appCodeEntry) []string {
	values := make([]string, 0, len(entries))
	for _, entry := range entries {
		values = append(values, entry.Code)
	}
	return values
}

func testCode(propertyName, id, code string, issuedAt time.Time) appCode {
	spec := specByPropertyName(propertyName)
	return appCode{
		Code:      code,
		ID:        id,
		IssuedAt:  issuedAt.UTC(),
		ExpiresAt: issuedAt.UTC().Add(spec.AcceptLifetime),
	}
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
