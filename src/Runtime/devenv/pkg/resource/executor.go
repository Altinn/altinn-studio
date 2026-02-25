package resource

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"slices"
	"strings"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"golang.org/x/sync/errgroup"
)

// Executor applies resources to infrastructure using a container client.
// It maintains resolved state (e.g., image IDs) across resource applications.
type Executor struct {
	client   container.ContainerClient
	observer Observer
	resolved *resolvedMap // Stores resolved state (image IDs, etc.)
}

const containerSpecHashLabel = "altinn.studio/devenv-spec-hash"
const networkResourceIDPrefix = "network:"

// NewExecutor creates an executor with the given container client.
func NewExecutor(client container.ContainerClient) *Executor {
	return &Executor{
		client:   client,
		resolved: newResolvedMap(),
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
	if err != nil && !errors.Is(err, types.ErrImageNotFound) {
		return fmt.Errorf("inspect image %s: %w", img.Ref, err)
	}

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

	e.resolved.Set(img.ID(), info.ID)
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

	e.resolved.Set(img.ID(), info.ID)
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
	imageID, ok := e.resolved.Get(c.Image.ID())
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
			if networkName, ok := strings.CutPrefix(id, networkResourceIDPrefix); ok {
				networks[i] = networkName
			} else {
				return fmt.Errorf("cannot resolve network name from %s", ref.ID())
			}
		}
	}

	desiredLabels := normalizedContainerLabels(c, imageID, networks)

	// Check existing container
	info, err := e.client.ContainerInspect(ctx, c.Name)
	if err == nil {
		// TODO: getting the current state should probably be a separate/phase before execution
		actualNetworks, err := e.client.ContainerNetworks(ctx, c.Name)
		if err != nil {
			return fmt.Errorf("get container networks %s: %w", c.Name, err)
		}

		// Container exists - check if matches desired state
		if info.ImageID != imageID ||
			!labelsMatch(desiredLabels, info.Labels) ||
			!networksMatch(networks, actualNetworks) {
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
		Labels:        desiredLabels,
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
	stopErr := e.client.ContainerStop(ctx, name, &timeout)
	if errors.Is(stopErr, types.ErrContainerNotFound) {
		stopErr = nil
	}

	removeErr := e.client.ContainerRemove(ctx, name, true)
	if errors.Is(removeErr, types.ErrContainerNotFound) {
		removeErr = nil
	}

	if stopErr != nil && removeErr != nil {
		return errors.Join(
			fmt.Errorf("stop container %s: %w", name, stopErr),
			fmt.Errorf("remove container %s: %w", name, removeErr),
		)
	}
	if stopErr != nil {
		return fmt.Errorf("stop container %s: %w", name, stopErr)
	}
	if removeErr != nil {
		return fmt.Errorf("remove container %s: %w", name, removeErr)
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

// networksMatch checks if desired networks match actual (order-insensitive)
func networksMatch(desired, actual []string) bool {
	if len(desired) != len(actual) {
		return false
	}
	sortedDesired := make([]string, len(desired))
	copy(sortedDesired, desired)
	slices.Sort(sortedDesired)

	sortedActual := make([]string, len(actual))
	copy(sortedActual, actual)
	slices.Sort(sortedActual)

	return slices.Equal(sortedDesired, sortedActual)
}

func normalizedContainerLabels(c *Container, imageID string, networks []string) map[string]string {
	labels := make(map[string]string, len(c.Labels)+1)
	for k, v := range c.Labels {
		labels[k] = v
	}
	labels[containerSpecHashLabel] = containerSpecHash(c, imageID, networks)
	return labels
}

func containerSpecHash(c *Container, imageID string, networks []string) string {
	var b strings.Builder

	b.WriteString("image=")
	b.WriteString(imageID)
	b.WriteByte('\n')

	writeSortedList(&b, "networks", networks)
	writeSortedList(&b, "env", c.Env)
	writeSortedList(&b, "extraHosts", c.ExtraHosts)

	b.WriteString("command=")
	b.WriteString(strings.Join(c.Command, "\x00"))
	b.WriteByte('\n')

	b.WriteString("user=")
	b.WriteString(c.User)
	b.WriteByte('\n')

	b.WriteString("restartPolicy=")
	b.WriteString(c.RestartPolicy)
	b.WriteByte('\n')

	portEntries := make([]string, 0, len(c.Ports))
	for _, p := range c.Ports {
		portEntries = append(
			portEntries,
			fmt.Sprintf("%s|%s|%s|%s", p.HostIP, p.HostPort, p.ContainerPort, p.Protocol),
		)
	}
	writeSortedList(&b, "ports", portEntries)

	volumeEntries := make([]string, 0, len(c.Volumes))
	for _, v := range c.Volumes {
		volumeEntries = append(
			volumeEntries,
			fmt.Sprintf("%s|%s|%t", v.HostPath, v.ContainerPath, v.ReadOnly),
		)
	}
	writeSortedList(&b, "volumes", volumeEntries)

	sum := sha256.Sum256([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}

func writeSortedList(b *strings.Builder, key string, values []string) {
	copied := make([]string, len(values))
	copy(copied, values)
	slices.Sort(copied)

	b.WriteString(key)
	b.WriteByte('=')
	b.WriteString(strings.Join(copied, "\x00"))
	b.WriteByte('\n')
}
