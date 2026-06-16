package maskinporten

import (
	"context"
	"math/rand/v2"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
	nooptrace "go.opentelemetry.io/otel/trace/noop"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	mpdomain "altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
)

const testRotationFingerprint = "rotation-fingerprint-1"

func newFakeClientForSecretTests(t *testing.T) *MaskinportenClientReconciler {
	t.Helper()

	scheme := k8sruntime.NewScheme()
	err := corev1.AddToScheme(scheme)
	NewWithT(t).Expect(err).NotTo(HaveOccurred())

	return &MaskinportenClientReconciler{
		Client: fake.NewClientBuilder().
			WithScheme(scheme).
			Build(),
		Scheme: scheme,
	}
}

func newFakeReconcilerForRotationRollout(
	t *testing.T,
	objects ...client.Object,
) *MaskinportenClientReconciler {
	t.Helper()

	scheme := k8sruntime.NewScheme()
	g := NewWithT(t)
	g.Expect(corev1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())
	g.Expect(resourcesv1alpha1.AddToScheme(scheme)).To(Succeed())

	return &MaskinportenClientReconciler{
		Client: fake.NewClientBuilder().
			WithScheme(scheme).
			WithObjects(objects...).
			WithStatusSubresource(&resourcesv1alpha1.MaskinportenClient{}).
			Build(),
		Scheme:  scheme,
		runtime: rotationRolloutTestRuntime{serviceOwnerID: "ttd"},
	}
}

func newReconcilerWithDeterministicRandom() *MaskinportenClientReconciler {
	return &MaskinportenClientReconciler{
		random: rand.New(rand.NewPCG(1, 2)),
	}
}

func TestUpdateSecretWithRetry_IgnoreNotFound(t *testing.T) {
	g := NewWithT(t)
	reconciler := newFakeClientForSecretTests(t)

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "missing-secret",
			Namespace: "default",
		},
		Type: corev1.SecretTypeOpaque,
	}

	err := reconciler.updateSecretWithRetry(context.Background(), secret, func(s *corev1.Secret) error {
		s.Data = map[string][]byte{"key": []byte("value")}
		return nil
	}, true)

	g.Expect(err).NotTo(HaveOccurred())
}

func TestUpdateSecretWithRetry_ReturnsNotFoundWhenNotIgnored(t *testing.T) {
	g := NewWithT(t)
	reconciler := newFakeClientForSecretTests(t)

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "missing-secret",
			Namespace: "default",
		},
		Type: corev1.SecretTypeOpaque,
	}

	err := reconciler.updateSecretWithRetry(context.Background(), secret, func(s *corev1.Secret) error {
		s.Data = map[string][]byte{"key": []byte("value")}
		return nil
	}, false)

	g.Expect(err).To(HaveOccurred())
	g.Expect(apierrors.IsNotFound(err)).To(BeTrue())
}

func TestHasAuthoritativeClientIdentity(t *testing.T) {
	g := NewWithT(t)

	g.Expect(hasAuthoritativeClientIdentity(nil, "")).To(BeFalse())
	g.Expect(hasAuthoritativeClientIdentity(nil, "   ")).To(BeFalse())
	g.Expect(hasAuthoritativeClientIdentity(&mpdomain.SecretStateContent{ClientId: ""}, "")).To(BeFalse())
	g.Expect(hasAuthoritativeClientIdentity(&mpdomain.SecretStateContent{ClientId: "mp-client"}, "")).To(BeTrue())
	g.Expect(hasAuthoritativeClientIdentity(nil, "status-client")).To(BeTrue())
}

func TestShouldRequireClientIdentityForDeletion(t *testing.T) {
	g := NewWithT(t)

	instance := &resourcesv1alpha1.MaskinportenClient{}
	g.Expect(shouldRequireClientIdentityForDeletion(instance)).To(BeFalse())

	instance.Status.Conditions = []metav1.Condition{
		{
			Type:   mpdomain.ConditionTypeClientRegistered,
			Status: metav1.ConditionTrue,
		},
	}
	g.Expect(shouldRequireClientIdentityForDeletion(instance)).To(BeTrue())

	instance.Status.Conditions = []metav1.Condition{
		{
			Type:   mpdomain.ConditionTypeClientRegistered,
			Status: metav1.ConditionFalse,
		},
	}
	g.Expect(shouldRequireClientIdentityForDeletion(instance)).To(BeFalse())
}

func TestGetMissingSecretRequeueAfter_CapsLongIntervals(t *testing.T) {
	g := NewWithT(t)
	reconciler := newReconcilerWithDeterministicRandom()
	cfg := &config.Config{
		MaskinportenController: config.MaskinportenControllerConfig{
			RequeueAfter: 24 * time.Hour,
		},
	}

	instance := &resourcesv1alpha1.MaskinportenClient{
		ObjectMeta: metav1.ObjectMeta{
			CreationTimestamp: metav1.NewTime(time.Now().UTC().Add(-48 * time.Hour)),
		},
	}

	d, _ := reconciler.getMissingSecretRequeueAfter(cfg, instance)
	g.Expect(d).To(BeNumerically(">=", 24*time.Hour*8/10))
	g.Expect(d).To(BeNumerically("<=", 24*time.Hour))
}

func TestGetMissingSecretRequeueAfter_RespectsShortIntervals(t *testing.T) {
	g := NewWithT(t)
	reconciler := newReconcilerWithDeterministicRandom()
	cfg := &config.Config{
		MaskinportenController: config.MaskinportenControllerConfig{
			RequeueAfter: 6 * time.Second,
		},
	}

	instance := &resourcesv1alpha1.MaskinportenClient{
		ObjectMeta: metav1.ObjectMeta{
			CreationTimestamp: metav1.NewTime(time.Now().UTC().Add(-48 * time.Hour)),
		},
	}

	d, _ := reconciler.getMissingSecretRequeueAfter(cfg, instance)
	g.Expect(d).To(BeNumerically(">=", 4800*time.Millisecond))
	g.Expect(d).To(BeNumerically("<=", 6*time.Second))
}

func TestGetMissingSecretBaseRequeueAfter_ProportionalToAge(t *testing.T) {
	g := NewWithT(t)
	configured := 24 * time.Hour

	g.Expect(getMissingSecretBaseRequeueAfter(0, configured)).To(Equal(1 * time.Second))
	g.Expect(getMissingSecretBaseRequeueAfter(5*time.Second, configured)).To(Equal(1 * time.Second))
	g.Expect(getMissingSecretBaseRequeueAfter(10*time.Second, configured)).To(Equal(20 * time.Second))
	g.Expect(getMissingSecretBaseRequeueAfter(30*time.Second, configured)).To(Equal(60 * time.Second))
	g.Expect(getMissingSecretBaseRequeueAfter(60*time.Second, configured)).To(Equal(120 * time.Second))
}

func TestGetMissingSecretBaseRequeueAfter_CappedByConfig(t *testing.T) {
	g := NewWithT(t)
	configured := 20 * time.Second
	g.Expect(getMissingSecretBaseRequeueAfter(30*time.Second, configured)).To(Equal(configured))
}

func TestRandomizeDuration_HandlesTinyDurations(t *testing.T) {
	g := NewWithT(t)
	reconciler := newReconcilerWithDeterministicRandom()
	g.Expect(reconciler.randomizeDuration(1*time.Nanosecond, 10.0)).To(Equal(1 * time.Nanosecond))
}

func TestRandomizeDuration_HandlesNilRandom(t *testing.T) {
	g := NewWithT(t)
	reconciler := &MaskinportenClientReconciler{}
	g.Expect(reconciler.randomizeDuration(5*time.Second, 10.0)).To(Equal(5 * time.Second))
}

func TestMarkRotationRestartPending_TracksNewRotation(t *testing.T) {
	g := NewWithT(t)
	detectedAt := time.Date(2026, 6, 15, 1, 30, 0, 0, time.UTC)
	instance := &resourcesv1alpha1.MaskinportenClient{}

	markRotationRestartPending(instance, testRotationFingerprint, detectedAt)

	g.Expect(instance.Status.PendingSecretRotationFingerprint).To(Equal(testRotationFingerprint))
	g.Expect(instance.Status.PendingSecretRotationDetectedAt.Time).To(Equal(detectedAt))
	g.Expect(instance.Status.Conditions).To(ContainElement(WithTransform(
		func(condition metav1.Condition) string { return condition.Type + ":" + string(condition.Status) },
		Equal(mpdomain.ConditionTypeRotationRestart+":"+string(metav1.ConditionTrue)),
	)))
}

func TestMarkRotationRestartPending_IgnoresAlreadyRestartedRotation(t *testing.T) {
	g := NewWithT(t)
	instance := &resourcesv1alpha1.MaskinportenClient{
		Status: resourcesv1alpha1.MaskinportenClientStatus{
			LastSecretRotationRestartedFingerprint: testRotationFingerprint,
		},
	}

	markRotationRestartPending(instance, testRotationFingerprint, time.Now())

	g.Expect(instance.Status.PendingSecretRotationFingerprint).To(BeEmpty())
}

func TestProcessPendingMaskinportenRotationRollouts_PatchesDeploymentTemplateAndStatus(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	now := time.Date(2026, 6, 15, 2, 0, 0, 0, time.UTC)
	fingerprint := testRotationFingerprint
	instance := rotationRolloutClient("ttd-testapp", fingerprint)
	deployment := rotationRolloutDeployment("ttd-testapp-deployment")
	reconciler := newFakeReconcilerForRotationRollout(t, instance, deployment)

	err := reconciler.processPendingMaskinportenRotationRollouts(ctx, now)

	g.Expect(err).NotTo(HaveOccurred())

	updatedDeployment := &appsv1.Deployment{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(deployment), updatedDeployment)).To(Succeed())
	g.Expect(updatedDeployment.Spec.Template.Annotations).To(HaveKeyWithValue(
		mpdomain.AnnotationSecretVersion,
		fingerprint,
	))
	g.Expect(updatedDeployment.Spec.Template.Annotations).To(HaveKeyWithValue(
		mpdomain.AnnotationSecretRotationRestartedAt,
		now.Format(time.RFC3339),
	))

	updatedClient := &resourcesv1alpha1.MaskinportenClient{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(instance), updatedClient)).To(Succeed())
	g.Expect(updatedClient.Status.PendingSecretRotationFingerprint).To(BeEmpty())
	g.Expect(updatedClient.Status.LastSecretRotationRestartedFingerprint).To(Equal(fingerprint))
	g.Expect(updatedClient.Status.LastSecretRotationRestartedAt.Time).To(BeTemporally("==", now))
}

func TestProcessPendingMaskinportenRotationRollouts_IsIdempotentForSameRotation(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	firstRun := time.Date(2026, 6, 15, 2, 0, 0, 0, time.UTC)
	secondRun := firstRun.Add(24 * time.Hour)
	fingerprint := testRotationFingerprint
	instance := rotationRolloutClient("ttd-testapp", fingerprint)
	deployment := rotationRolloutDeployment("ttd-testapp-deployment")
	reconciler := newFakeReconcilerForRotationRollout(t, instance, deployment)

	g.Expect(reconciler.processPendingMaskinportenRotationRollouts(ctx, firstRun)).To(Succeed())
	g.Expect(reconciler.processPendingMaskinportenRotationRollouts(ctx, secondRun)).To(Succeed())

	updatedDeployment := &appsv1.Deployment{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(deployment), updatedDeployment)).To(Succeed())
	g.Expect(updatedDeployment.Spec.Template.Annotations).To(HaveKeyWithValue(
		mpdomain.AnnotationSecretRotationRestartedAt,
		firstRun.Format(time.RFC3339),
	))
}

func TestProcessPendingMaskinportenRotationRollouts_OnlyPatchesPendingRotations(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	now := time.Date(2026, 6, 15, 2, 0, 0, 0, time.UTC)
	pendingFingerprint := testRotationFingerprint
	pendingClient := rotationRolloutClient("ttd-testapp", pendingFingerprint)
	nonPendingClient := rotationRolloutClient("ttd-otherapp", "")
	pendingDeployment := rotationRolloutDeployment("ttd-testapp-deployment")
	nonPendingDeployment := rotationRolloutDeployment("ttd-otherapp-deployment")
	reconciler := newFakeReconcilerForRotationRollout(
		t,
		pendingClient,
		nonPendingClient,
		pendingDeployment,
		nonPendingDeployment,
	)

	err := reconciler.processPendingMaskinportenRotationRollouts(ctx, now)

	g.Expect(err).NotTo(HaveOccurred())

	updatedPendingDeployment := &appsv1.Deployment{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(pendingDeployment), updatedPendingDeployment)).To(Succeed())
	g.Expect(updatedPendingDeployment.Spec.Template.Annotations).To(HaveKeyWithValue(
		mpdomain.AnnotationSecretVersion,
		pendingFingerprint,
	))

	updatedNonPendingDeployment := &appsv1.Deployment{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(nonPendingDeployment), updatedNonPendingDeployment)).
		To(Succeed())
	g.Expect(updatedNonPendingDeployment.Spec.Template.Annotations).NotTo(HaveKey(mpdomain.AnnotationSecretVersion))
}

func TestProcessPendingMaskinportenRotationRollouts_RecoversPendingRotationFromSecret(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	now := time.Date(2026, 6, 15, 2, 0, 0, 0, time.UTC)
	instance := rotationRolloutClient("ttd-testapp", "")
	deployment := rotationRolloutDeployment("ttd-testapp-deployment")
	secret := rotationRolloutSecret("ttd-testapp-deployment", testRotationFingerprint)
	reconciler := newFakeReconcilerForRotationRollout(t, instance, deployment, secret)

	err := reconciler.processPendingMaskinportenRotationRollouts(ctx, now)

	g.Expect(err).NotTo(HaveOccurred())

	updatedDeployment := &appsv1.Deployment{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(deployment), updatedDeployment)).To(Succeed())
	g.Expect(updatedDeployment.Spec.Template.Annotations).To(HaveKeyWithValue(
		mpdomain.AnnotationSecretVersion,
		testRotationFingerprint,
	))

	updatedClient := &resourcesv1alpha1.MaskinportenClient{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(instance), updatedClient)).To(Succeed())
	g.Expect(updatedClient.Status.LastSecretRotationRestartedFingerprint).To(Equal(testRotationFingerprint))
	g.Expect(updatedClient.Status.PendingSecretRotationFingerprint).To(BeEmpty())
}

func TestProcessPendingMaskinportenRotationRollouts_SkipsOtherServiceOwner(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	now := time.Date(2026, 6, 15, 2, 0, 0, 0, time.UTC)
	instance := rotationRolloutClient("other-testapp", testRotationFingerprint)
	deployment := rotationRolloutDeployment("other-testapp-deployment")
	reconciler := newFakeReconcilerForRotationRollout(t, instance, deployment)
	reconciler.runtime = rotationRolloutTestRuntime{serviceOwnerID: "ttd"}

	err := reconciler.processPendingMaskinportenRotationRollouts(ctx, now)

	g.Expect(err).NotTo(HaveOccurred())

	updatedDeployment := &appsv1.Deployment{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(deployment), updatedDeployment)).To(Succeed())
	g.Expect(updatedDeployment.Spec.Template.Annotations).NotTo(HaveKey(mpdomain.AnnotationSecretVersion))

	updatedClient := &resourcesv1alpha1.MaskinportenClient{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(instance), updatedClient)).To(Succeed())
	g.Expect(updatedClient.Status.PendingSecretRotationFingerprint).To(Equal(testRotationFingerprint))
	g.Expect(updatedClient.Status.LastSecretRotationRestartedFingerprint).To(BeEmpty())
}

func TestProcessPendingMaskinportenRotationRollouts_MarksAlreadyAnnotatedDeploymentComplete(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	now := time.Date(2026, 6, 16, 2, 0, 0, 0, time.UTC)
	restartedAt := time.Date(2026, 6, 15, 2, 0, 0, 0, time.UTC)
	fingerprint := testRotationFingerprint
	instance := rotationRolloutClient("ttd-testapp", fingerprint)
	deployment := rotationRolloutDeployment("ttd-testapp-deployment")
	deployment.Spec.Template.Annotations = map[string]string{
		mpdomain.AnnotationSecretVersion:             fingerprint,
		mpdomain.AnnotationSecretRotationRestartedAt: restartedAt.Format(time.RFC3339),
	}
	reconciler := newFakeReconcilerForRotationRollout(t, instance, deployment)

	err := reconciler.processPendingMaskinportenRotationRollouts(ctx, now)

	g.Expect(err).NotTo(HaveOccurred())

	updatedDeployment := &appsv1.Deployment{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(deployment), updatedDeployment)).To(Succeed())
	g.Expect(updatedDeployment.Spec.Template.Annotations).To(HaveKeyWithValue(
		mpdomain.AnnotationSecretRotationRestartedAt,
		restartedAt.Format(time.RFC3339),
	))

	updatedClient := &resourcesv1alpha1.MaskinportenClient{}
	g.Expect(reconciler.Get(ctx, client.ObjectKeyFromObject(instance), updatedClient)).To(Succeed())
	g.Expect(updatedClient.Status.PendingSecretRotationFingerprint).To(BeEmpty())
	g.Expect(updatedClient.Status.LastSecretRotationRestartedFingerprint).To(Equal(fingerprint))
	g.Expect(updatedClient.Status.LastSecretRotationRestartedAt.Time).To(BeTemporally("==", restartedAt))
}

func rotationRolloutClient(name string, pendingFingerprint string) *resourcesv1alpha1.MaskinportenClient {
	pendingAt := metav1.NewTime(time.Date(2026, 6, 15, 1, 0, 0, 0, time.UTC))
	instance := &resourcesv1alpha1.MaskinportenClient{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: "default",
		},
		Status: resourcesv1alpha1.MaskinportenClientStatus{
			PendingSecretRotationFingerprint: pendingFingerprint,
		},
	}
	if pendingFingerprint != "" {
		instance.Status.PendingSecretRotationDetectedAt = &pendingAt
	}
	return instance
}

func rotationRolloutDeployment(name string) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: "default",
		},
		Spec: appsv1.DeploymentSpec{
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{},
				},
			},
		},
	}
}

func rotationRolloutSecret(appLabel string, fingerprint string) *corev1.Secret {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      appLabel + "-secrets",
			Namespace: "default",
			Labels: map[string]string{
				"app": appLabel,
			},
		},
		Type: corev1.SecretTypeOpaque,
	}
	if fingerprint != "" {
		secret.Annotations = map[string]string{
			mpdomain.AnnotationSecretVersion: fingerprint,
		}
	}
	return secret
}

type rotationRolloutTestRuntime struct {
	serviceOwnerID string
}

func (r rotationRolloutTestRuntime) GetConfigMonitor() *config.ConfigMonitor {
	return nil
}

func (r rotationRolloutTestRuntime) GetOperatorContext() *operatorcontext.Context {
	return &operatorcontext.Context{
		ServiceOwner: operatorcontext.ServiceOwner{
			Id: r.serviceOwnerID,
		},
	}
}

func (r rotationRolloutTestRuntime) GetCrypto() *crypto.CryptoService {
	return nil
}

func (r rotationRolloutTestRuntime) GetMaskinportenApiClient() *mpdomain.HttpApiClient {
	return nil
}

func (r rotationRolloutTestRuntime) GetClock() opclock.Clock {
	return nil
}

func (r rotationRolloutTestRuntime) Tracer() trace.Tracer {
	return nooptrace.NewTracerProvider().Tracer("maskinporten-rotation-rollout-test")
}

func (r rotationRolloutTestRuntime) Meter() metric.Meter {
	return nil
}
