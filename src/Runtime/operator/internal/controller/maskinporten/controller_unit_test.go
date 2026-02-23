package maskinporten

import (
	"context"
	"testing"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
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
