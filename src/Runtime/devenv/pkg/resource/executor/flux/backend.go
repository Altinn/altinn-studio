// Package fluxbackend applies Flux resource graph resources.
package fluxbackend

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"

	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	kindContextPrefix       = "kind-"
	defaultReadinessTimeout = 2 * time.Minute
)

var (
	errKindClusterNotResolved = errors.New("kind cluster is not resolved")
	errConcreteKubeRequired   = errors.New("concrete Kubernetes client is required")
	errUnsupportedResource    = errors.New("unsupported Flux backend resource")
)

// Backend applies Flux installation resources.
type Backend struct {
	newKube  func(contextName string) (kubernetesOperations, error)
	newFlux  func(kubernetesOperations) (fluxOperations, error)
	clusters map[resource.ResourceID]clusterClients
	mu       sync.Mutex
}

type clusterClients struct {
	kube kubernetesOperations
	flux fluxOperations
}

type kubernetesOperations interface {
	GetContext(ctx context.Context, gvr schema.GroupVersionResource, name, namespace string) error
	RolloutStatusContext(ctx context.Context, deployment, namespace string, timeout time.Duration) error
}

type fluxOperations interface {
	InstallContext(ctx context.Context, components []string, installOpts flux.InstallOptions) error
}

// New creates a Flux resource backend.
func New() *Backend {
	return &Backend{
		newKube:  newKubernetesClient,
		newFlux:  newFluxClient,
		clusters: make(map[resource.ResourceID]clusterClients),
	}
}

func newKubernetesClient(contextName string) (kubernetesOperations, error) {
	client, err := kubernetes.New(contextName)
	if err != nil {
		return nil, fmt.Errorf("create Kubernetes client: %w", err)
	}
	return client, nil
}

func newFluxClient(kube kubernetesOperations) (fluxOperations, error) {
	concrete, ok := kube.(*kubernetes.KubernetesClient)
	if !ok {
		return nil, errConcreteKubeRequired
	}
	client, err := flux.New(concrete)
	if err != nil {
		return nil, fmt.Errorf("create Flux client: %w", err)
	}
	return client, nil
}

// Supports reports whether this backend can apply and observe r.
func (b *Backend) Supports(r resource.Resource) bool {
	switch r.(type) {
	case *resource.FluxInstallation:
		return true
	default:
		return false
	}
}

// Apply creates or updates one supported resource.
func (b *Backend) Apply(
	ctx context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.Output, error) {
	switch res := r.(type) {
	case *resource.FluxInstallation:
		return executor.NoOutput{}, b.applyFluxInstallation(ctx, res)
	default:
		return nil, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Observe reads current runtime state for one supported resource.
func (b *Backend) Observe(
	ctx context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.ObservedResource, error) {
	observed := executor.ObservedResource{
		Resource: r,
		Status:   executor.StatusReady,
		Type:     executor.ResourceTypeFlux,
		Managed:  false,
	}
	switch res := r.(type) {
	case *resource.FluxInstallation:
		installed, err := b.fluxInstalled(ctx, res)
		if err != nil || !installed {
			observed.Status = executor.StatusDestroyed
		}
	default:
		return executor.ObservedResource{}, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
	return observed, nil
}

// Destroy removes one observed runtime resource.
func (b *Backend) Destroy(context.Context, resource.ResourceID, executor.ObservedResource) error {
	return nil
}

func (b *Backend) applyFluxInstallation(ctx context.Context, installation *resource.FluxInstallation) error {
	clients, err := b.ensureClusterClients(installation.Cluster)
	if err != nil {
		return err
	}
	components := installation.Components
	if len(components) == 0 {
		components = []string{"source-controller", "helm-controller", "kustomize-controller"}
	}
	if err := clients.flux.InstallContext(ctx, components, flux.LocalInstallOptions()); err != nil {
		return fmt.Errorf("install flux controllers: %w", err)
	}
	for _, component := range components {
		if err := clients.kube.RolloutStatusContext(
			ctx,
			component,
			"flux-system",
			defaultReadinessTimeout,
		); err != nil {
			return fmt.Errorf("wait for flux controller %s: %w", component, err)
		}
	}
	return nil
}

func (b *Backend) fluxInstalled(ctx context.Context, installation *resource.FluxInstallation) (bool, error) {
	clients, err := b.ensureClusterClients(installation.Cluster)
	if err != nil {
		return false, err
	}
	return clients.kube.GetContext(ctx, kubernetes.NamespaceGVR, "flux-system", "") == nil &&
		clients.kube.GetContext(ctx, kubernetes.DeploymentGVR, "source-controller", "flux-system") == nil, nil
}

func (b *Backend) ensureClusterClients(ref resource.ResourceRef) (clusterClients, error) {
	id := ref.ID()
	if id == "" {
		return clusterClients{}, errKindClusterNotResolved
	}
	b.mu.Lock()
	clients, ok := b.clusters[id]
	b.mu.Unlock()
	if ok {
		return clients, nil
	}

	clusterName, err := clusterNameFromRef(ref)
	if err != nil {
		return clusterClients{}, err
	}
	kubeClient, err := b.newKube(kindContextPrefix + clusterName)
	if err != nil {
		return clusterClients{}, fmt.Errorf("create Kubernetes client for %s: %w", clusterName, err)
	}
	fluxClient, err := b.newFlux(kubeClient)
	if err != nil {
		return clusterClients{}, fmt.Errorf("create Flux client for %s: %w", clusterName, err)
	}
	clients = clusterClients{kube: kubeClient, flux: fluxClient}
	b.mu.Lock()
	b.clusters[id] = clients
	b.mu.Unlock()
	return clients, nil
}

func clusterNameFromRef(ref resource.ResourceRef) (string, error) {
	name, ok := resource.KindClusterNameFromRef(ref)
	if !ok || name == "" {
		return "", fmt.Errorf("%w: %s", errKindClusterNotResolved, ref.ID())
	}
	return name, nil
}

var _ executor.Backend = (*Backend)(nil)
