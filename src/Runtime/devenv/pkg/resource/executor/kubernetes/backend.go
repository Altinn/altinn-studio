// Package kubernetesbackend applies Kubernetes resource graph resources.
package kubernetesbackend

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

const (
	kindContextPrefix       = "kind-"
	defaultReadinessTimeout = 2 * time.Minute
)

var (
	errKindClusterNotResolved = errors.New("kind cluster is not resolved")
	errManifestPathRequired   = errors.New("manifest path is required")
	errReadinessKindUnknown   = errors.New("kubernetes readiness kind is unknown")
	errConcreteKubeRequired   = errors.New("concrete Kubernetes client is required")
	errUnsupportedResource    = errors.New("unsupported Kubernetes backend resource")
)

// Backend applies Kubernetes object sets and readiness checks.
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
	ApplyManifestContext(ctx context.Context, yamlContent string) (string, error)
	KustomizeRender(path string) (string, error)
	RolloutStatusContext(ctx context.Context, deployment, namespace string, timeout time.Duration) error
}

type fluxOperations interface {
	ReconcileHelmReleaseContext(
		ctx context.Context,
		name, namespace string,
		withSource bool,
		opts flux.ReconcileOptions,
	) error
	ReconcileKustomizationContext(
		ctx context.Context,
		name, namespace string,
		withSource bool,
		opts flux.ReconcileOptions,
	) error
}

// New creates a Kubernetes resource backend.
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
	case *resource.KubernetesObjectSet:
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
	case *resource.KubernetesObjectSet:
		return executor.NoOutput{}, b.applyObjectSet(ctx, res)
	default:
		return nil, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Observe reads current runtime state for one supported resource.
func (b *Backend) Observe(
	_ context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.ObservedResource, error) {
	switch r.(type) {
	case *resource.KubernetesObjectSet:
		return executor.ObservedResource{
			Resource: r,
			Status:   executor.StatusReady,
			Type:     executor.ResourceTypeKubernetes,
			Managed:  false,
		}, nil
	default:
		return executor.ObservedResource{}, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Destroy removes one observed runtime resource.
func (b *Backend) Destroy(context.Context, resource.ResourceID, executor.ObservedResource) error {
	return nil
}

func (b *Backend) applyObjectSet(ctx context.Context, objects *resource.KubernetesObjectSet) error {
	clients, err := b.ensureClusterClients(objects.Cluster)
	if err != nil {
		return err
	}
	manifest, err := renderObjectSet(clients.kube, objects)
	if err != nil {
		return err
	}
	if _, applyErr := clients.kube.ApplyManifestContext(ctx, manifest); applyErr != nil {
		return fmt.Errorf("apply Kubernetes object set %s: %w", objects.Name, applyErr)
	}
	for _, readiness := range objects.Readiness {
		updatedClients, readinessErr := b.applyReadiness(ctx, objects.Cluster, clients, readiness)
		if readinessErr != nil {
			return fmt.Errorf("readiness %s/%s: %w", readiness.Namespace, readiness.Name, readinessErr)
		}
		clients = updatedClients
	}
	return nil
}

func renderObjectSet(kube kubernetesOperations, objects *resource.KubernetesObjectSet) (string, error) {
	if objects.Manifest != "" {
		return objects.Manifest, nil
	}
	path := objects.Path
	if path == "" {
		return "", errManifestPathRequired
	}
	info, err := os.Stat(path)
	if err != nil {
		return "", fmt.Errorf("stat Kubernetes object set path %s: %w", path, err)
	}
	if info.IsDir() {
		manifest, renderErr := kube.KustomizeRender(path)
		if renderErr != nil {
			return "", fmt.Errorf("render kustomize path %s: %w", path, renderErr)
		}
		return manifest, nil
	}
	data, err := os.ReadFile(path) //nolint:gosec // Path is desired-state input from the local graph.
	if err != nil {
		return "", fmt.Errorf("read Kubernetes manifest %s: %w", path, err)
	}
	return string(data), nil
}

func (b *Backend) applyReadiness(
	ctx context.Context,
	cluster resource.ResourceRef,
	clients clusterClients,
	readiness resource.KubernetesReadinessCheck,
) (clusterClients, error) {
	timeout := readiness.Timeout
	if timeout == 0 {
		timeout = defaultReadinessTimeout
	}
	opts := fluxReconcileOptions(readiness, timeout)
	switch readiness.Kind {
	case resource.KubernetesReadinessDeploymentAvailable:
		if err := clients.kube.RolloutStatusContext(ctx, readiness.Name, readiness.Namespace, timeout); err != nil {
			return clients, fmt.Errorf("wait for deployment rollout: %w", err)
		}
		return clients, nil
	case resource.KubernetesReadinessFluxKustomization:
		updatedClients, fluxErr := b.ensureFluxClient(cluster, clients)
		if fluxErr != nil {
			return clients, fluxErr
		}
		if err := updatedClients.flux.ReconcileKustomizationContext(
			ctx,
			readiness.Name,
			readiness.Namespace,
			true,
			opts,
		); err != nil {
			return updatedClients, fmt.Errorf("reconcile Flux Kustomization: %w", err)
		}
		return updatedClients, nil
	case resource.KubernetesReadinessFluxHelmRelease:
		updatedClients, fluxErr := b.ensureFluxClient(cluster, clients)
		if fluxErr != nil {
			return clients, fluxErr
		}
		if err := updatedClients.flux.ReconcileHelmReleaseContext(
			ctx,
			readiness.Name,
			readiness.Namespace,
			true,
			opts,
		); err != nil {
			return updatedClients, fmt.Errorf("reconcile Flux HelmRelease: %w", err)
		}
		return updatedClients, nil
	default:
		return clients, fmt.Errorf("%w: %q", errReadinessKindUnknown, readiness.Kind)
	}
}

func fluxReconcileOptions(readiness resource.KubernetesReadinessCheck, timeout time.Duration) flux.ReconcileOptions {
	opts := flux.DefaultReconcileOptions()
	if readiness.Reconcile != nil {
		opts.ShouldWait = readiness.Reconcile.ShouldWait
		opts.Timeout = readiness.Reconcile.Timeout
		return opts
	}
	opts.Timeout = timeout
	return opts
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
	clients = clusterClients{kube: kubeClient}
	b.mu.Lock()
	b.clusters[id] = clients
	b.mu.Unlock()
	return clients, nil
}

func (b *Backend) ensureFluxClient(
	ref resource.ResourceRef,
	clients clusterClients,
) (clusterClients, error) {
	if clients.flux != nil {
		return clients, nil
	}
	id := ref.ID()
	if id == "" {
		return clients, errKindClusterNotResolved
	}
	fluxClient, err := b.newFlux(clients.kube)
	if err != nil {
		return clients, fmt.Errorf("create Flux client for %s: %w", id, err)
	}
	clients.flux = fluxClient
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
