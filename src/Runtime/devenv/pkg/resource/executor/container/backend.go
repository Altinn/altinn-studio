// Package containerbackend implements resource executor backends for Docker-compatible containers.
package containerbackend

import (
	"context"
	"errors"
	"fmt"

	containerclient "altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

// GraphIDLabel is the runtime label used to identify resources owned by a graph.
const GraphIDLabel = "altinn.studio/devenv.graph"

const networkResourceIDPrefix = "network:"

var (
	errUnknownResourceType        = errors.New("unknown resource type")
	errImageNotResolved           = errors.New("image not resolved")
	errNetworkNameUnresolvable    = errors.New("cannot resolve network name")
	errImageMissingForPullNever   = errors.New("image not found locally and pull policy is Never")
	errImagePullPolicyUnsupported = errors.New("unsupported image pull policy")
	errContainerExited            = errors.New("container exited before becoming ready")
	errContainerUnhealthy         = errors.New("container healthcheck failed")
	errContainerReadyTimeout      = errors.New("container did not become ready before timeout")
)

// Backend applies and observes image, network, and container resources.
type Backend struct {
	client containerclient.ContainerClient
}

// New creates a container resource backend using client.
func New(client containerclient.ContainerClient) Backend {
	return Backend{client: client}
}

// Supports reports whether this backend can apply and observe r.
func (b Backend) Supports(r resource.Resource) bool {
	switch r.(type) {
	case *resource.PulledImage, *resource.BuiltImage, *resource.PublishedImage, *resource.Network, *resource.Container:
		return true
	default:
		return false
	}
}

// SupportsObserved reports whether this backend can destroy a discovered runtime resource.
func (b Backend) SupportsObserved(observed executor.ObservedResource) bool {
	switch observed.Type {
	case executor.ResourceTypeImage, executor.ResourceTypeNetwork, executor.ResourceTypeContainer:
		return true
	case executor.ResourceTypeUnknown:
		return false
	default:
		return false
	}
}

// Apply creates or updates one supported resource.
func (b Backend) Apply(
	ctx context.Context,
	backendCtx executor.BackendContext,
	r resource.Resource,
) (executor.Output, error) {
	switch res := r.(type) {
	case *resource.PulledImage:
		return b.applyPulledImage(ctx, backendCtx, res)
	case *resource.BuiltImage:
		return b.applyBuiltImage(ctx, backendCtx, res)
	case *resource.PublishedImage:
		return b.applyPublishedImage(ctx, backendCtx, res)
	case *resource.Network:
		return b.applyNetwork(ctx, backendCtx.GraphID, res)
	case *resource.Container:
		return b.applyContainer(ctx, backendCtx, res)
	default:
		return nil, fmt.Errorf("%w: %T", errUnknownResourceType, r)
	}
}

// Observe reads current runtime state for one supported resource.
func (b Backend) Observe(
	ctx context.Context,
	backendCtx executor.BackendContext,
	r resource.Resource,
) (executor.ObservedResource, error) {
	switch res := r.(type) {
	case *resource.PulledImage:
		status, err := b.imageStatus(ctx, res.Ref)
		return executor.ObservedResource{
			Resource:  r,
			Type:      executor.ResourceTypeImage,
			RuntimeID: res.Ref,
			Status:    status,
			Managed:   false,
		}, err
	case *resource.BuiltImage:
		status, err := b.imageStatus(ctx, res.Tag)
		return executor.ObservedResource{
			Resource:  r,
			Type:      executor.ResourceTypeImage,
			RuntimeID: res.Tag,
			Status:    status,
			Managed:   false,
		}, err
	case *resource.PublishedImage:
		status, err := b.imageStatus(ctx, res.Ref)
		return executor.ObservedResource{
			Resource:  r,
			Type:      executor.ResourceTypeImage,
			RuntimeID: res.Ref,
			Status:    status,
			Managed:   false,
		}, err
	case *resource.Network:
		return b.observeNetwork(ctx, backendCtx.GraphID, res)
	case *resource.Container:
		return b.observeContainer(ctx, backendCtx.GraphID, res)
	default:
		return executor.ObservedResource{}, fmt.Errorf("%w: %T", errUnknownResourceType, r)
	}
}

// Destroy removes one observed runtime resource.
func (b Backend) Destroy(ctx context.Context, id resource.ResourceID, observed executor.ObservedResource) error {
	name := firstNonEmptyString(observed.RuntimeID, id.String())
	switch observed.Type {
	case executor.ResourceTypeContainer:
		return b.stopAndRemoveContainer(ctx, name)
	case executor.ResourceTypeNetwork:
		err := b.client.NetworkRemove(ctx, name)
		if err != nil && !errors.Is(err, types.ErrNetworkNotFound) {
			return fmt.Errorf("remove network %s: %w", name, err)
		}
		return nil
	case executor.ResourceTypeImage:
		return nil
	case executor.ResourceTypeUnknown:
		return fmt.Errorf("%w: %v", errUnknownResourceType, observed.Type)
	default:
		return fmt.Errorf("%w: %v", errUnknownResourceType, observed.Type)
	}
}

// Discover adds labelled runtime resources owned by the graph to snapshot.
func (b Backend) Discover(ctx context.Context, _ executor.BackendContext, snapshot *executor.Snapshot) error {
	return b.discoverContainerGraphResources(ctx, snapshot)
}

var (
	_ executor.Backend         = Backend{}
	_ executor.ObservedBackend = Backend{}
	_ executor.Discoverer      = Backend{}
)
