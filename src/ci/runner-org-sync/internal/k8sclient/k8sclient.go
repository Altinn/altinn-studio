// Package k8sclient wraps the Kubernetes REST client operations used by the
// runner-org-sync CronJob: listing the Secrets we own, creating and deleting
// per-org registration-token Secrets, and applying the runners ConfigMap
// idempotently.
//
// The NamespacedClient is bound to one namespace. It does not cache or store
// cluster state; each method talks to the supplied kubernetes.Interface.
package k8sclient

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"maps"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

var errOpaqueSecretKeyRequired = errors.New("opaque secret key is required")

// Label keys and well-known values for resources this service owns.
const (
	LabelManagedBy = "app.kubernetes.io/managed-by"
	LabelComponent = "app.kubernetes.io/component"
	LabelOrg       = "runner-org-sync.altinn.studio/org"
	LabelFluxWatch = "reconcile.fluxcd.io/watch"

	ManagedBy         = "runner-org-sync"
	ComponentRegToken = "runner-registration-token"
	ComponentRunnerCM = "runner-org-list"
	FluxWatchEnabled  = "Enabled"

	// SecretTokenKey is the data key inside per-org registration Secrets,
	// matching what the runner Deployment's secretKeyRef expects.
	SecretTokenKey = "token"
)

// RegistrationSecretState describes whether a per-org runner registration
// Secret is safe for the ConfigMap to reference.
type RegistrationSecretState string

const (
	// RegistrationSecretMissing means the named Secret does not exist.
	RegistrationSecretMissing RegistrationSecretState = "missing"
	// RegistrationSecretValid means the named Secret can be referenced by runners.
	RegistrationSecretValid RegistrationSecretState = "valid"
	// RegistrationSecretInvalid means the named Secret exists but has unsafe shape or ownership.
	RegistrationSecretInvalid RegistrationSecretState = "invalid"
)

// NamespacedClient performs the namespace-scoped Kubernetes I/O needed by the
// reconciler.
type NamespacedClient struct {
	client    kubernetes.Interface
	namespace string
}

// NewNamespacedClient constructs a NamespacedClient bound to a single namespace.
func NewNamespacedClient(client kubernetes.Interface, namespace string) *NamespacedClient {
	return &NamespacedClient{client: client, namespace: namespace}
}

// Namespace returns the namespace the NamespacedClient operates in. Useful for logs.
func (s *NamespacedClient) Namespace() string { return s.namespace }

// ListManagedSecrets returns all Secrets in the namespace that this service
// owns, matched by ManagedBy + Component labels.
func (s *NamespacedClient) ListManagedSecrets(ctx context.Context) ([]corev1.Secret, error) {
	selector := fmt.Sprintf("%s=%s,%s=%s",
		LabelManagedBy, ManagedBy,
		LabelComponent, ComponentRegToken,
	)
	list, err := s.client.CoreV1().Secrets(s.namespace).List(ctx, metav1.ListOptions{
		LabelSelector: selector,
	})
	if err != nil {
		return nil, fmt.Errorf("k8sclient: list secrets: %w", err)
	}
	return list.Items, nil
}

// RegistrationSecretStatus reports whether the named Secret exists and has
// the ownership labels and token data expected for the given org.
func (s *NamespacedClient) RegistrationSecretStatus(
	ctx context.Context,
	name, org string,
) (RegistrationSecretState, error) {
	sec, err := s.client.CoreV1().Secrets(s.namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return RegistrationSecretMissing, nil
	}
	if err != nil {
		return "", fmt.Errorf("k8sclient: get registration secret %s: %w", name, err)
	}
	if sec.Type != "" && sec.Type != corev1.SecretTypeOpaque {
		return RegistrationSecretInvalid, nil
	}
	if len(sec.Data[SecretTokenKey]) == 0 {
		return RegistrationSecretInvalid, nil
	}
	if hasConflictingLabel(sec.Labels, LabelManagedBy, ManagedBy) ||
		hasConflictingLabel(sec.Labels, LabelComponent, ComponentRegToken) ||
		hasConflictingLabel(sec.Labels, LabelOrg, org) {
		return RegistrationSecretInvalid, nil
	}
	if sec.Labels == nil {
		sec.Labels = map[string]string{}
	}
	labelsChanged := ensureLabel(sec.Labels, LabelManagedBy, ManagedBy)
	labelsChanged = ensureLabel(sec.Labels, LabelComponent, ComponentRegToken) || labelsChanged
	labelsChanged = ensureLabel(sec.Labels, LabelOrg, org) || labelsChanged
	if labelsChanged {
		if _, err := s.client.CoreV1().Secrets(s.namespace).Update(ctx, sec, metav1.UpdateOptions{}); err != nil {
			return "", fmt.Errorf("k8sclient: adopt registration secret %s: %w", name, err)
		}
	}
	return RegistrationSecretValid, nil
}

// CreateRegistrationSecret creates an Opaque Secret carrying the
// registration token at key "token", labelled with ManagedBy / Component /
// Org. Returns the underlying error verbatim so callers can use apierrors.IsAlreadyExists.
func (s *NamespacedClient) CreateRegistrationSecret(ctx context.Context, name, org, token string) error {
	sec := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: s.namespace,
			Labels: map[string]string{
				LabelManagedBy: ManagedBy,
				LabelComponent: ComponentRegToken,
				LabelOrg:       org,
			},
		},
		Type: corev1.SecretTypeOpaque,
		Data: map[string][]byte{
			SecretTokenKey: []byte(token),
		},
	}
	if _, err := s.client.CoreV1().Secrets(s.namespace).Create(ctx, sec, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("k8sclient: create secret %s: %w", name, err)
	}
	return nil
}

// DeleteSecret removes the named Secret. NotFound is treated as success so
// the operation is idempotent across reconciles.
func (s *NamespacedClient) DeleteSecret(ctx context.Context, name string) error {
	err := s.client.CoreV1().Secrets(s.namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("k8sclient: delete secret %s: %w", name, err)
	}
	return nil
}

// ApplyConfigMap creates or updates the named ConfigMap so its Data matches
// the supplied value. Returns true if a write actually occurred (create or
// update), false if the existing object already matched. Labels are
// preserved on update; managed labels are added or restored if missing.
func (s *NamespacedClient) ApplyConfigMap(ctx context.Context, name string, data map[string]string) (bool, error) {
	desired := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: s.namespace,
			Labels: map[string]string{
				LabelManagedBy: ManagedBy,
				LabelComponent: ComponentRunnerCM,
				LabelFluxWatch: FluxWatchEnabled,
			},
		},
		Data: data,
	}

	existing, err := s.client.CoreV1().ConfigMaps(s.namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		if _, createErr := s.client.CoreV1().
			ConfigMaps(s.namespace).
			Create(ctx, desired, metav1.CreateOptions{}); createErr != nil {
			return false, fmt.Errorf("k8sclient: create configmap %s: %w", name, createErr)
		}
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("k8sclient: get configmap %s: %w", name, err)
	}

	if existing.Labels == nil {
		existing.Labels = map[string]string{}
	}
	labelsChanged := ensureLabel(existing.Labels, LabelManagedBy, ManagedBy)
	labelsChanged = ensureLabel(existing.Labels, LabelComponent, ComponentRunnerCM) || labelsChanged
	labelsChanged = ensureLabel(existing.Labels, LabelFluxWatch, FluxWatchEnabled) || labelsChanged
	if maps.Equal(existing.Data, data) && !labelsChanged {
		return false, nil
	}
	existing.Data = data

	if _, err := s.client.CoreV1().ConfigMaps(s.namespace).Update(ctx, existing, metav1.UpdateOptions{}); err != nil {
		return false, fmt.Errorf("k8sclient: update configmap %s: %w", name, err)
	}
	return true, nil
}

// ApplyOpaqueSecret creates or updates a single-key Opaque Secret so its
// data[key] equals value. Returns true if a write occurred. Used for the
// KEDA PAT projection: the value originates from Key Vault, the Secret is
// consumed by KEDA's TriggerAuthentication.
//
// Labels are applied on create (ManagedBy). On update, the managed-by label
// is added or restored if missing; other existing labels are preserved.
func (s *NamespacedClient) ApplyOpaqueSecret(ctx context.Context, name, key, value string) (bool, error) {
	if key == "" {
		return false, fmt.Errorf("k8sclient: ApplyOpaqueSecret %s: %w", name, errOpaqueSecretKeyRequired)
	}
	encoded := []byte(value)

	existing, err := s.client.CoreV1().Secrets(s.namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		desired := &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: s.namespace,
				Labels: map[string]string{
					LabelManagedBy: ManagedBy,
				},
			},
			Type: corev1.SecretTypeOpaque,
			Data: map[string][]byte{key: encoded},
		}
		if _, createErr := s.client.CoreV1().
			Secrets(s.namespace).
			Create(ctx, desired, metav1.CreateOptions{}); createErr != nil {
			return false, fmt.Errorf("k8sclient: create opaque secret %s: %w", name, createErr)
		}
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("k8sclient: get opaque secret %s: %w", name, err)
	}

	if existing.Labels == nil {
		existing.Labels = map[string]string{}
	}
	labelsChanged := ensureLabel(existing.Labels, LabelManagedBy, ManagedBy)

	// Only writing the single key we manage; leave any other keys untouched.
	if bytes.Equal(existing.Data[key], encoded) && !labelsChanged {
		return false, nil
	}

	if existing.Data == nil {
		existing.Data = map[string][]byte{}
	}
	existing.Data[key] = encoded

	if _, err := s.client.CoreV1().Secrets(s.namespace).Update(ctx, existing, metav1.UpdateOptions{}); err != nil {
		return false, fmt.Errorf("k8sclient: update opaque secret %s: %w", name, err)
	}
	return true, nil
}

// OrgFromSecret extracts the org code from a managed Secret's label. Returns
// the empty string if the label is missing — callers should treat that as
// a foreign Secret and skip it.
func OrgFromSecret(s corev1.Secret) string {
	return s.Labels[LabelOrg]
}

func ensureLabel(labels map[string]string, key, value string) bool {
	if labels[key] == value {
		return false
	}
	labels[key] = value
	return true
}

func hasConflictingLabel(labels map[string]string, key, expected string) bool {
	value, ok := labels[key]
	return ok && value != expected
}
