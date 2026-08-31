//nolint:revive // Resource method names are fixed by interfaces.
package resource

import (
	"errors"
	"fmt"
	"time"
)

var (
	errClusterReferenceRequired        = errors.New("cluster reference is required")
	errPathRequired                    = errors.New("path is required")
	errKubernetesObjectSourceAmbiguous = errors.New(
		"kubernetes object set cannot specify both path and manifest",
	)
	errKubernetesReadinessKindUnknown = errors.New("kubernetes readiness kind is unknown")
	errNamespaceRequired              = errors.New("namespace is required")
	errKubernetesObjectNameRequired   = errors.New("kubernetes object name is required")
	errTimeoutInvalid                 = errors.New("timeout must be zero or positive")
)

// KubernetesReadinessKind identifies a readiness condition for applied Kubernetes objects.
type KubernetesReadinessKind string

const (
	KubernetesReadinessDeploymentAvailable KubernetesReadinessKind = "deployment-available"
	KubernetesReadinessFluxKustomization   KubernetesReadinessKind = "flux-kustomization"
	KubernetesReadinessFluxHelmRelease     KubernetesReadinessKind = "flux-helm-release"
)

// KubernetesReadinessCheck describes a readiness condition for a Kubernetes object set.
type KubernetesReadinessCheck struct {
	Reconcile *KubernetesFluxReconcileOptions
	Kind      KubernetesReadinessKind
	Namespace string
	Name      string
	Timeout   time.Duration
}

// KubernetesFluxReconcileOptions configures readiness checks backed by Flux reconciliation.
type KubernetesFluxReconcileOptions struct {
	ShouldWait bool
	Timeout    time.Duration
}

// KubernetesObjectSet represents applying a rendered or static Kubernetes object set.
type KubernetesObjectSet struct {
	Enabled   *bool
	Name      string
	Cluster   ResourceRef
	Path      string
	Manifest  string
	DependsOn []ResourceRef
	Readiness []KubernetesReadinessCheck
}

func (r *KubernetesObjectSet) ID() ResourceID {
	return KubernetesObjectSetID(r.Name)
}

func (r *KubernetesObjectSet) Dependencies() []ResourceRef {
	return appendWithRequiredRef(r.DependsOn, r.Cluster)
}

func (r *KubernetesObjectSet) IsEnabled() bool {
	return Enabled(r.Enabled)
}

func (r *KubernetesObjectSet) Validate() error {
	if err := validateName(r.Name); err != nil {
		return err
	}
	if err := validateRef(r.Cluster, errClusterReferenceRequired); err != nil {
		return err
	}
	if r.Path == "" && r.Manifest == "" {
		return errPathRequired
	}
	if r.Path != "" && r.Manifest != "" {
		return errKubernetesObjectSourceAmbiguous
	}
	for _, readiness := range r.Readiness {
		if err := readiness.Validate(); err != nil {
			return err
		}
	}
	return nil
}

func (r KubernetesReadinessCheck) Validate() error {
	switch r.Kind {
	case KubernetesReadinessDeploymentAvailable,
		KubernetesReadinessFluxKustomization,
		KubernetesReadinessFluxHelmRelease:
	default:
		return fmt.Errorf("%w: %q", errKubernetesReadinessKindUnknown, r.Kind)
	}
	if r.Namespace == "" {
		return errNamespaceRequired
	}
	if r.Name == "" {
		return errKubernetesObjectNameRequired
	}
	if r.Timeout < 0 {
		return errTimeoutInvalid
	}
	if r.Reconcile != nil && r.Reconcile.Timeout < 0 {
		return errTimeoutInvalid
	}
	return nil
}

var (
	_ Resource           = (*KubernetesObjectSet)(nil)
	_ Validator          = (*KubernetesObjectSet)(nil)
	_ EnablementProvider = (*KubernetesObjectSet)(nil)
)

// KubernetesObjectSetID returns the stable resource ID for a Kubernetes object set name.
func KubernetesObjectSetID(name string) ResourceID {
	return ResourceID("kubernetes-object-set:" + name)
}
