// Package k8sstate provides the in-cluster reconcile primitives used by the
// runner-org-sync CronJob: listing the Secrets we own, creating and
// deleting per-org registration-token Secrets, and applying the runners
// ConfigMap idempotently.
//
// The Store is constructed around a kubernetes.Interface so the production
// path uses a real REST client while tests inject the fake clientset from
// k8s.io/client-go/kubernetes/fake.
package k8sstate

import (
	"bytes"
	"context"
	"fmt"
	"maps"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// Label keys and well-known values for resources this service owns.
const (
	LabelManagedBy = "app.kubernetes.io/managed-by"
	LabelComponent = "app.kubernetes.io/component"
	LabelOrg       = "runner-org-sync.altinn.studio/org"

	ManagedBy         = "runner-org-sync"
	ComponentRegToken = "runner-registration-token"
	ComponentRunnerCM = "runner-org-list"

	// SecretTokenKey is the data key inside per-org registration Secrets,
	// matching what the runner Deployment's secretKeyRef expects.
	SecretTokenKey = "token"
)

// Store is the package's only entry point for cluster I/O.
type Store struct {
	client    kubernetes.Interface
	namespace string
}

// NewStore constructs a Store bound to a single namespace.
func NewStore(client kubernetes.Interface, namespace string) *Store {
	return &Store{client: client, namespace: namespace}
}

// Namespace returns the namespace the Store operates in. Useful for logs.
func (s *Store) Namespace() string { return s.namespace }

// ListManagedSecrets returns all Secrets in the namespace that this service
// owns, matched by ManagedBy + Component labels.
func (s *Store) ListManagedSecrets(ctx context.Context) ([]corev1.Secret, error) {
	selector := fmt.Sprintf("%s=%s,%s=%s",
		LabelManagedBy, ManagedBy,
		LabelComponent, ComponentRegToken,
	)
	list, err := s.client.CoreV1().Secrets(s.namespace).List(ctx, metav1.ListOptions{
		LabelSelector: selector,
	})
	if err != nil {
		return nil, fmt.Errorf("k8sstate: list secrets: %w", err)
	}
	return list.Items, nil
}

// SecretExists reports whether a Secret with the given name exists in the
// store's namespace. A NotFound error is reported as ok=false, nil error.
func (s *Store) SecretExists(ctx context.Context, name string) (bool, error) {
	_, err := s.client.CoreV1().Secrets(s.namespace).Get(ctx, name, metav1.GetOptions{})
	if err == nil {
		return true, nil
	}
	if apierrors.IsNotFound(err) {
		return false, nil
	}
	return false, fmt.Errorf("k8sstate: get secret %s: %w", name, err)
}

// CreateRegistrationSecret creates an Opaque Secret carrying the
// registration token at key "token", labelled with ManagedBy / Component /
// Org. Returns the underlying error verbatim so callers can use apierrors.IsAlreadyExists.
func (s *Store) CreateRegistrationSecret(ctx context.Context, name, org, token string) error {
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
		return fmt.Errorf("k8sstate: create secret %s: %w", name, err)
	}
	return nil
}

// DeleteSecret removes the named Secret. NotFound is treated as success so
// the operation is idempotent across reconciles.
func (s *Store) DeleteSecret(ctx context.Context, name string) error {
	err := s.client.CoreV1().Secrets(s.namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("k8sstate: delete secret %s: %w", name, err)
	}
	return nil
}

// ApplyConfigMap creates or updates the named ConfigMap so its Data matches
// the supplied value. Returns true if a write actually occurred (create or
// update), false if the existing object already matched. Labels are
// preserved on update; managed labels are added or restored if missing.
func (s *Store) ApplyConfigMap(ctx context.Context, name string, data map[string]string) (bool, error) {
	desired := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: s.namespace,
			Labels: map[string]string{
				LabelManagedBy: ManagedBy,
				LabelComponent: ComponentRunnerCM,
			},
		},
		Data: data,
	}

	existing, err := s.client.CoreV1().ConfigMaps(s.namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		if _, err := s.client.CoreV1().ConfigMaps(s.namespace).Create(ctx, desired, metav1.CreateOptions{}); err != nil {
			return false, fmt.Errorf("k8sstate: create configmap %s: %w", name, err)
		}
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("k8sstate: get configmap %s: %w", name, err)
	}

	if existing.Labels == nil {
		existing.Labels = map[string]string{}
	}
	labelsChanged := ensureLabel(existing.Labels, LabelManagedBy, ManagedBy)
	labelsChanged = ensureLabel(existing.Labels, LabelComponent, ComponentRunnerCM) || labelsChanged
	if maps.Equal(existing.Data, data) && !labelsChanged {
		return false, nil
	}
	existing.Data = data

	if _, err := s.client.CoreV1().ConfigMaps(s.namespace).Update(ctx, existing, metav1.UpdateOptions{}); err != nil {
		return false, fmt.Errorf("k8sstate: update configmap %s: %w", name, err)
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
func (s *Store) ApplyOpaqueSecret(ctx context.Context, name, key, value string) (bool, error) {
	if key == "" {
		return false, fmt.Errorf("k8sstate: ApplyOpaqueSecret %s: key is required", name)
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
		if _, err := s.client.CoreV1().Secrets(s.namespace).Create(ctx, desired, metav1.CreateOptions{}); err != nil {
			return false, fmt.Errorf("k8sstate: create opaque secret %s: %w", name, err)
		}
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("k8sstate: get opaque secret %s: %w", name, err)
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
		return false, fmt.Errorf("k8sstate: update opaque secret %s: %w", name, err)
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
