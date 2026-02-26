package maskinporten

import (
	"context"
	"math/rand/v2"
	"testing"
	"time"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
	mpdomain "altinn.studio/operator/internal/maskinporten"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func newFakeClientForSecretTests(t *testing.T) *MaskinportenClientReconciler {
	t.Helper()

	scheme := k8sruntime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	return &MaskinportenClientReconciler{
		Client: fake.NewClientBuilder().
			WithScheme(scheme).
			Build(),
		Scheme: scheme,
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
