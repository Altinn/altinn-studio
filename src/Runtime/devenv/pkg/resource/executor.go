package resource

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"golang.org/x/sync/errgroup"
)

// Executor applies resources to infrastructure using a container client.
// It maintains resolved state (e.g., image IDs) across resource applications.
type Executor struct {
	client   container.ContainerClient
	observer Observer
	resolved map[ResourceID]any // Stores resolved state (image IDs, etc.)
}

// NewExecutor creates an executor with the given container client.
func NewExecutor(client container.ContainerClient) *Executor {
	return &Executor{
		client:   client,
		resolved: make(map[ResourceID]any),
	}
}

// SetObserver sets the observer for resource lifecycle events.
func (e *Executor) SetObserver(o Observer) {
	e.observer = o
}

// Apply creates/updates all resources in the graph in dependency order.
// Resources at the same dependency level are applied in parallel.
func (e *Executor) Apply(ctx context.Context, g *Graph) error {
	levels, err := g.TopologicalOrder()
	if err != nil {
		return err
	}

	for _, level := range levels {
		eg, ctx := errgroup.WithContext(ctx)
		for _, r := range level {
			eg.Go(func() error {
				e.notify(EventApplyStart, r.ID(), nil)
				if err := e.applyResource(ctx, r); err != nil {
					e.notify(EventApplyFailed, r.ID(), err)
					return fmt.Errorf("apply %s: %w", r.ID(), err)
				}
				e.notify(EventApplyDone, r.ID(), nil)
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			return err
		}
	}
	return nil
}

// Destroy removes all resources in the graph in reverse dependency order.
// Resources at the same dependency level are destroyed in parallel.
func (e *Executor) Destroy(ctx context.Context, g *Graph) error {
	levels, err := g.ReverseTopologicalOrder()
	if err != nil {
		return err
	}

	for _, level := range levels {
		eg, ctx := errgroup.WithContext(ctx)
		for _, r := range level {
			eg.Go(func() error {
				e.notify(EventDestroyStart, r.ID(), nil)
				if err := e.destroyResource(ctx, r); err != nil {
					e.notify(EventDestroyFailed, r.ID(), err)
					return fmt.Errorf("destroy %s: %w", r.ID(), err)
				}
				e.notify(EventDestroyDone, r.ID(), nil)
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			return err
		}
	}
	return nil
}

// Status returns the current status of all resources in the graph.
func (e *Executor) Status(ctx context.Context, g *Graph) (map[ResourceID]Status, error) {
	result := make(map[ResourceID]Status, len(g.All()))

	for _, r := range g.All() {
		status, err := e.resourceStatus(ctx, r)
		if err != nil {
			return nil, fmt.Errorf("status %s: %w", r.ID(), err)
		}
		result[r.ID()] = status
	}

	return result, nil
}

func (e *Executor) applyResource(ctx context.Context, r Resource) error {
	switch res := r.(type) {
	case *RemoteImage:
		return e.applyRemoteImage(ctx, res)
	case *LocalImage:
		return e.applyLocalImage(ctx, res)
	case *Network:
		return e.applyNetwork(ctx, res)
	case *Container:
		return e.applyContainer(ctx, res)
	default:
		return fmt.Errorf("unknown resource type: %T", r)
	}
}

func (e *Executor) destroyResource(ctx context.Context, r Resource) error {
	switch res := r.(type) {
	case *RemoteImage:
		// Images are shared, don't delete
		return nil
	case *LocalImage:
		// Images are shared, don't delete
		return nil
	case *Network:
		return e.destroyNetwork(ctx, res)
	case *Container:
		return e.destroyContainer(ctx, res)
	default:
		return fmt.Errorf("unknown resource type: %T", r)
	}
}

func (e *Executor) resourceStatus(ctx context.Context, r Resource) (Status, error) {
	switch res := r.(type) {
	case *RemoteImage:
		return e.imageStatus(ctx, res.Ref)
	case *LocalImage:
		return e.imageStatus(ctx, res.Tag)
	case *Network:
		return e.networkStatus(ctx, res)
	case *Container:
		return e.containerStatus(ctx, res)
	default:
		return StatusUnknown, nil
	}
}

// Image operations

func (e *Executor) applyRemoteImage(ctx context.Context, img *RemoteImage) error {
	// Check if image exists locally
	info, err := e.client.ImageInspect(ctx, img.Ref)
	imageExists := err == nil

	switch img.PullPolicy {
	case PullAlways:
		if err := e.client.ImagePull(ctx, img.Ref); err != nil {
			return fmt.Errorf("pull image %s: %w", img.Ref, err)
		}
	case PullIfNotPresent:
		if !imageExists {
			if err := e.client.ImagePull(ctx, img.Ref); err != nil {
				return fmt.Errorf("pull image %s: %w", img.Ref, err)
			}
		}
	case PullNever:
		if !imageExists {
			return fmt.Errorf("image %s not found locally and pull policy is Never", img.Ref)
		}
	}

	// Get the resolved image ID
	info, err = e.client.ImageInspect(ctx, img.Ref)
	if err != nil {
		return fmt.Errorf("inspect image %s: %w", img.Ref, err)
	}

	e.resolved[img.ID()] = info.ID
	return nil
}

func (e *Executor) applyLocalImage(ctx context.Context, img *LocalImage) error {
	dockerfile := img.Dockerfile
	if dockerfile == "" {
		dockerfile = "Dockerfile"
	}

	if err := e.client.Build(ctx, img.ContextPath, dockerfile, img.Tag); err != nil {
		return fmt.Errorf("build image %s: %w", img.Tag, err)
	}

	// Get the resolved image ID
	info, err := e.client.ImageInspect(ctx, img.Tag)
	if err != nil {
		return fmt.Errorf("inspect built image %s: %w", img.Tag, err)
	}

	e.resolved[img.ID()] = info.ID
	return nil
}

func (e *Executor) imageStatus(ctx context.Context, ref string) (Status, error) {
	_, err := e.client.ImageInspect(ctx, ref)
	if err != nil {
		return StatusUnknown, nil
	}
	return StatusReady, nil
}

// Network operations

func (e *Executor) applyNetwork(ctx context.Context, net *Network) error {
	_, err := e.client.NetworkInspect(ctx, net.Name)
	if err == nil {
		// Network exists
		// TODO: check labels match, recreate if needed
		return nil
	}

	if !errors.Is(err, types.ErrNetworkNotFound) {
		return fmt.Errorf("inspect network %s: %w", net.Name, err)
	}

	// Create network
	driver := net.Driver
	if driver == "" {
		driver = "bridge"
	}

	cfg := types.NetworkConfig{
		Name:   net.Name,
		Driver: driver,
		Labels: net.Labels,
	}

	if _, err := e.client.NetworkCreate(ctx, cfg); err != nil {
		return fmt.Errorf("create network %s: %w", net.Name, err)
	}

	return nil
}

func (e *Executor) destroyNetwork(ctx context.Context, net *Network) error {
	err := e.client.NetworkRemove(ctx, net.Name)
	if err != nil && !errors.Is(err, types.ErrNetworkNotFound) {
		return fmt.Errorf("remove network %s: %w", net.Name, err)
	}
	return nil
}

func (e *Executor) networkStatus(ctx context.Context, net *Network) (Status, error) {
	_, err := e.client.NetworkInspect(ctx, net.Name)
	if err != nil {
		if errors.Is(err, types.ErrNetworkNotFound) {
			return StatusDestroyed, nil
		}
		return StatusUnknown, err
	}
	return StatusReady, nil
}

// Container operations

func (e *Executor) applyContainer(ctx context.Context, c *Container) error {
	// Resolve image ID from previously applied image resource
	imageID, ok := e.resolved[c.Image.ID()].(string)
	if !ok {
		return fmt.Errorf("image %s not resolved (was it applied?)", c.Image.ID())
	}

	// Resolve network names from NetworkResource references
	networks := make([]string, len(c.Networks))
	for i, ref := range c.Networks {
		// Extract network name from resource ID "network:name"
		net := ref.Resource()
		if netRes, ok := net.(NetworkResource); ok {
			networks[i] = netRes.NetworkName()
		} else {
			// Fall back to extracting from ID
			id := string(ref.ID())
			if len(id) > 8 && id[:8] == "network:" {
				networks[i] = id[8:]
			} else {
				return fmt.Errorf("cannot resolve network name from %s", ref.ID())
			}
		}
	}

	// Check existing container
	info, err := e.client.ContainerInspect(ctx, c.Name)
	if err == nil {
		// Container exists - check if matches desired state
		if info.ImageID != imageID || !labelsMatch(c.Labels, info.Labels) {
			// Mismatch - recreate
			if err := e.stopAndRemoveContainer(ctx, c.Name); err != nil {
				return err
			}
			// Fall through to create
		} else if !info.State.Running {
			// Matches but stopped - start it
			return e.client.ContainerStart(ctx, c.Name)
		} else {
			// Already running with correct config
			return nil
		}
	} else if !errors.Is(err, types.ErrContainerNotFound) {
		return fmt.Errorf("inspect container %s: %w", c.Name, err)
	}

	// Create container
	cfg := types.ContainerConfig{
		Name:          c.Name,
		Image:         imageID,
		Command:       c.Command,
		Env:           c.Env,
		Ports:         c.Ports,
		Volumes:       c.Volumes,
		ExtraHosts:    c.ExtraHosts,
		RestartPolicy: c.RestartPolicy,
		Labels:        c.Labels,
		Detach:        true,
		User:          c.User,
	}

	cfg.Networks = networks

	_, err = e.client.CreateContainer(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create container %s: %w", c.Name, err)
	}

	// Connect to additional networks
	// TODO: implement NetworkConnect in container client for multiple networks

	return nil
}

func (e *Executor) destroyContainer(ctx context.Context, c *Container) error {
	return e.stopAndRemoveContainer(ctx, c.Name)
}

func (e *Executor) stopAndRemoveContainer(ctx context.Context, name string) error {
	timeout := 10
	_ = e.client.ContainerStop(ctx, name, &timeout)

	err := e.client.ContainerRemove(ctx, name, true)
	if err != nil && !errors.Is(err, types.ErrContainerNotFound) {
		return fmt.Errorf("remove container %s: %w", name, err)
	}
	return nil
}

func (e *Executor) containerStatus(ctx context.Context, c *Container) (Status, error) {
	info, err := e.client.ContainerInspect(ctx, c.Name)
	if err != nil {
		if errors.Is(err, types.ErrContainerNotFound) {
			return StatusDestroyed, nil
		}
		return StatusUnknown, err
	}

	switch {
	case info.State.Running:
		return StatusReady, nil
	case info.State.Status == "created":
		return StatusPending, nil
	case info.State.Status == "exited" && info.State.ExitCode == 0:
		return StatusReady, nil
	case info.State.Status == "exited":
		return StatusFailed, nil
	default:
		return StatusUnknown, nil
	}
}

func (e *Executor) notify(event EventType, id ResourceID, err error) {
	if e.observer != nil {
		e.observer.OnEvent(Event{
			Type:     event,
			Resource: id,
			Error:    err,
		})
	}
}

// labelsMatch checks if expected labels are present in actual labels.
// Additional labels in actual are ignored.
func labelsMatch(expected, actual map[string]string) bool {
	for k, v := range expected {
		if actual[k] != v {
			return false
		}
	}
	return true
}
