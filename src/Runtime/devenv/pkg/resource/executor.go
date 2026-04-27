package resource

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"

	"golang.org/x/sync/errgroup"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
)

// Executor applies resources to infrastructure using a container client.
// It stores runtime outputs while applying resources.
type Executor struct {
	client   container.ContainerClient
	observer Observer
	outputs  *outputStore
}

const containerSpecHashLabel = "altinn.studio/devenv-spec-hash"
const networkResourceIDPrefix = "network:"
const containerReadyTimeout = 2 * time.Minute
const containerReadyPollInterval = 500 * time.Millisecond
const containerStatusExited = "exited"
const containerStatusDead = "dead"

var (
	errUnknownResourceType      = errors.New("unknown resource type")
	errImageNotResolved         = errors.New("image not resolved")
	errNetworkNameUnresolvable  = errors.New("cannot resolve network name")
	errImageMissingForPullNever = errors.New("image not found locally and pull policy is Never")
	errContainerExited          = errors.New("container exited before becoming ready")
	errContainerUnhealthy       = errors.New("container healthcheck failed")
	errContainerReadyTimeout    = errors.New("container did not become ready before timeout")
)

// NewExecutor creates an executor with the given container client.
func NewExecutor(client container.ContainerClient) *Executor {
	return &Executor{
		client:  client,
		outputs: newOutputStore(),
	}
}

// SetObserver sets the observer for resource lifecycle events.
func (e *Executor) SetObserver(o Observer) {
	e.observer = o
}

// Apply creates/updates all resources in the graph in dependency order.
// Resources at the same dependency level are applied in parallel.
func (e *Executor) Apply(ctx context.Context, g *Graph) (Outputs, error) {
	levels, err := g.TopologicalOrder()
	if err != nil {
		return Outputs{}, err
	}

	e.outputs.Reset()

	for _, level := range levels {
		eg, groupCtx := errgroup.WithContext(ctx)
		for _, r := range level {
			eg.Go(func() error {
				e.notify(EventApplyStart, r.ID(), nil)
				output, err := e.applyResource(groupCtx, r)
				if err != nil {
					e.notify(EventApplyFailed, r.ID(), err)
					return fmt.Errorf("apply %s: %w", r.ID(), err)
				}
				if output != nil && !isNoOutput(output) {
					e.outputs.Set(r.ID(), output)
				}
				e.notify(EventApplyDone, r.ID(), nil)
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			return Outputs{}, fmt.Errorf("apply level: %w", err)
		}
	}
	return e.outputs.Snapshot(), nil
}

// Destroy removes all resources in the graph in reverse dependency order.
// Resources at the same dependency level are destroyed in parallel.
func (e *Executor) Destroy(ctx context.Context, g *Graph) error {
	levels, err := g.ReverseTopologicalOrder()
	if err != nil {
		return err
	}

	for _, level := range levels {
		eg, groupCtx := errgroup.WithContext(ctx)
		for _, r := range level {
			eg.Go(func() error {
				e.notify(EventDestroyStart, r.ID(), nil)
				if err := e.destroyResource(groupCtx, r); err != nil {
					if handleDestroyError(r, err) == ErrorDecisionIgnore {
						e.notify(EventDestroyDone, r.ID(), nil)
						return nil
					}
					e.notify(EventDestroyFailed, r.ID(), err)
					return fmt.Errorf("destroy %s: %w", r.ID(), err)
				}
				e.notify(EventDestroyDone, r.ID(), nil)
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			return fmt.Errorf("destroy level: %w", err)
		}
	}
	return nil
}

// Status returns the current status of all resources in the graph.
func (e *Executor) Status(ctx context.Context, g *Graph) (map[ResourceID]Status, error) {
	resources := g.Enabled()
	result := make(map[ResourceID]Status, len(resources))

	for _, r := range resources {
		status, err := e.resourceStatus(ctx, r)
		if err != nil {
			return nil, fmt.Errorf("status %s: %w", r.ID(), err)
		}
		result[r.ID()] = status
	}

	return result, nil
}

func (e *Executor) applyResource(ctx context.Context, r Resource) (Output, error) {
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
		return nil, fmt.Errorf("%w: %T", errUnknownResourceType, r)
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
		return fmt.Errorf("%w: %T", errUnknownResourceType, r)
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
		return StatusUnknown, fmt.Errorf("%w: %T", errUnknownResourceType, r)
	}
}

// Image operations

func (e *Executor) applyRemoteImage(ctx context.Context, img *RemoteImage) (Output, error) {
	// Check if image exists locally
	_, err := e.client.ImageInspect(ctx, img.Ref)
	imageExists := err == nil
	if err != nil && !errors.Is(err, types.ErrImageNotFound) {
		return nil, fmt.Errorf("inspect image %s: %w", img.Ref, err)
	}

	switch img.PullPolicy {
	case PullAlways:
		if pullErr := e.client.ImagePullWithProgress(ctx, img.Ref, func(update types.ProgressUpdate) {
			e.notifyProgress(img.ID(), progressFromContainerUpdate(update))
		}); pullErr != nil {
			return nil, fmt.Errorf("pull image %s: %w", img.Ref, pullErr)
		}
	case PullIfNotPresent:
		if !imageExists {
			if pullErr := e.client.ImagePullWithProgress(ctx, img.Ref, func(update types.ProgressUpdate) {
				e.notifyProgress(img.ID(), progressFromContainerUpdate(update))
			}); pullErr != nil {
				return nil, fmt.Errorf("pull image %s: %w", img.Ref, pullErr)
			}
		}
	case PullNever:
		if !imageExists {
			return nil, fmt.Errorf("%w: %s", errImageMissingForPullNever, img.Ref)
		}
	}

	// Get the resolved image ID
	info, err := e.client.ImageInspect(ctx, img.Ref)
	if err != nil {
		return nil, fmt.Errorf("inspect image %s: %w", img.Ref, err)
	}

	return ImageOutput{ImageID: info.ID}, nil
}

func (e *Executor) applyLocalImage(ctx context.Context, img *LocalImage) (Output, error) {
	dockerfile := img.Dockerfile
	if dockerfile == "" {
		dockerfile = "Dockerfile"
	}

	if err := e.client.BuildWithProgress(ctx, img.ContextPath, dockerfile, img.Tag, func(update types.ProgressUpdate) {
		e.notifyProgress(img.ID(), progressFromContainerUpdate(update))
	}, img.Build); err != nil {
		return nil, fmt.Errorf("build image %s: %w", img.Tag, err)
	}

	// Get the resolved image ID
	info, err := e.client.ImageInspect(ctx, img.Tag)
	if err != nil {
		return nil, fmt.Errorf("inspect built image %s: %w", img.Tag, err)
	}

	return ImageOutput{ImageID: info.ID}, nil
}

func (e *Executor) imageStatus(ctx context.Context, ref string) (Status, error) {
	_, err := e.client.ImageInspect(ctx, ref)
	if err != nil {
		if errors.Is(err, types.ErrImageNotFound) {
			return StatusDestroyed, nil
		}
		return StatusUnknown, fmt.Errorf("inspect image %s: %w", ref, err)
	}
	return StatusReady, nil
}

// Network operations

func (e *Executor) applyNetwork(ctx context.Context, net *Network) (Output, error) {
	_, err := e.client.NetworkInspect(ctx, net.Name)
	if err == nil {
		// Network exists
		// TODO: check labels match, recreate if needed
		return noOutput{}, nil
	}

	if !errors.Is(err, types.ErrNetworkNotFound) {
		return nil, fmt.Errorf("inspect network %s: %w", net.Name, err)
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
		return nil, fmt.Errorf("create network %s: %w", net.Name, err)
	}

	return noOutput{}, nil
}

func (e *Executor) destroyNetwork(ctx context.Context, net *Network) error {
	err := e.client.NetworkRemove(ctx, net.Name)
	if err != nil && !errors.Is(err, types.ErrNetworkNotFound) {
		return fmt.Errorf("remove network %s: %w", net.Name, err)
	}
	return nil
}

func handleDestroyError(r Resource, err error) ErrorDecision {
	provider, ok := r.(LifecycleOptionsProvider)
	if !ok {
		return ErrorDecisionDefault
	}

	options := provider.LifecycleOptions()
	if options.HandleDestroyError == nil {
		return ErrorDecisionDefault
	}

	return options.HandleDestroyError(err)
}

func (e *Executor) networkStatus(ctx context.Context, net *Network) (Status, error) {
	_, err := e.client.NetworkInspect(ctx, net.Name)
	if err != nil {
		if errors.Is(err, types.ErrNetworkNotFound) {
			return StatusDestroyed, nil
		}
		return StatusUnknown, fmt.Errorf("inspect network %s: %w", net.Name, err)
	}
	return StatusReady, nil
}

// Container operations

func (e *Executor) applyContainer(ctx context.Context, c *Container) (Output, error) {
	imageOutput, ok := e.outputs.Image(c.Image.ID())
	if !ok {
		return nil, fmt.Errorf("%w: %s", errImageNotResolved, c.Image.ID())
	}
	imageID := imageOutput.ImageID

	networks, err := e.resolveNetworkNames(c.Networks)
	if err != nil {
		return nil, err
	}

	desiredLabels := normalizedContainerLabels(c, imageID, networks)

	needsCreate, err := e.reconcileExistingContainer(ctx, c.Name, imageID, desiredLabels, networks)
	if err != nil {
		return nil, err
	}
	if needsCreate {
		cfg := types.ContainerConfig{
			HealthCheck:    c.HealthCheck,
			Name:           c.Name,
			Image:          imageID,
			Command:        c.Command,
			Env:            c.Env,
			Ports:          c.Ports,
			Volumes:        c.Volumes,
			ExtraHosts:     c.ExtraHosts,
			NetworkAliases: c.NetworkAliases,
			RestartPolicy:  c.RestartPolicy,
			Labels:         desiredLabels,
			Detach:         true,
			User:           c.User,
			Networks:       networks,
		}

		if _, err = e.client.CreateContainer(ctx, cfg); err != nil {
			return nil, fmt.Errorf("create container %s: %w", c.Name, err)
		}
	}

	if readyErr := e.waitForContainerReadyIfEnabled(ctx, c); readyErr != nil {
		return nil, readyErr
	}

	info, err := e.client.ContainerInspect(ctx, c.Name)
	if err != nil {
		return nil, fmt.Errorf("inspect container %s for outputs: %w", c.Name, err)
	}

	return ContainerOutput{
		ContainerID: info.ID,
		HostPorts:   clonePublishedPorts(info.Ports),
	}, nil
}

// resolveNetworkNames extracts network names from NetworkResource references.
func (e *Executor) resolveNetworkNames(refs []ResourceRef) ([]string, error) {
	networks := make([]string, len(refs))
	for i, ref := range refs {
		net := ref.Resource()
		if netRes, ok := net.(NetworkResource); ok {
			networks[i] = netRes.NetworkName()
			continue
		}
		id := string(ref.ID())
		networkName, ok := strings.CutPrefix(id, networkResourceIDPrefix)
		if !ok {
			return nil, fmt.Errorf("%w: %s", errNetworkNameUnresolvable, ref.ID())
		}
		networks[i] = networkName
	}
	return networks, nil
}

// reconcileExistingContainer checks if a container exists and whether it needs recreation.
// Returns true if a new container should be created.
func (e *Executor) reconcileExistingContainer(
	ctx context.Context,
	name string,
	imageID string,
	desiredLabels map[string]string,
	networks []string,
) (bool, error) {
	info, err := e.client.ContainerInspect(ctx, name)
	if errors.Is(err, types.ErrContainerNotFound) {
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("inspect container %s: %w", name, err)
	}

	actualNetworks, err := e.client.ContainerNetworks(ctx, name)
	if err != nil {
		return false, fmt.Errorf("get container networks %s: %w", name, err)
	}

	configMatches := info.ImageID == imageID &&
		labelsMatch(desiredLabels, info.Labels) &&
		networksMatch(networks, actualNetworks)

	if !configMatches {
		if stopErr := e.stopAndRemoveContainer(ctx, name); stopErr != nil {
			return false, stopErr
		}
		return true, nil
	}

	if !info.State.Running {
		if startErr := e.client.ContainerStart(ctx, name); startErr != nil {
			return false, fmt.Errorf("start container %s: %w", name, startErr)
		}
	}

	return false, nil
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
		return StatusUnknown, fmt.Errorf("inspect container %s: %w", c.Name, err)
	}

	switch {
	case info.State.Running && containerHealthReady(info.State.HealthStatus):
		return StatusReady, nil
	case info.State.Running && containerHealthFailed(info.State.HealthStatus):
		return StatusFailed, nil
	case info.State.Running:
		return StatusPending, nil
	case info.State.Status == "created":
		return StatusPending, nil
	case info.State.Status == containerStatusExited && info.State.ExitCode == 0:
		return StatusReady, nil
	case info.State.Status == containerStatusExited:
		return StatusFailed, nil
	default:
		return StatusUnknown, nil
	}
}

func (e *Executor) waitForContainerReady(ctx context.Context, name string) error {
	waitCtx, cancel := context.WithTimeout(ctx, containerReadyTimeout)
	defer cancel()

	for {
		info, err := e.client.ContainerInspect(waitCtx, name)
		if err != nil {
			return fmt.Errorf("inspect container %s: %w", name, err)
		}

		if containerReady(info.State) {
			return nil
		}
		if err := containerReadinessError(name, info.State); err != nil {
			return err
		}

		timer := time.NewTimer(containerReadyPollInterval)
		select {
		case <-waitCtx.Done():
			timer.Stop()
			if errors.Is(waitCtx.Err(), context.DeadlineExceeded) {
				return fmt.Errorf("%w: %s", errContainerReadyTimeout, name)
			}
			return fmt.Errorf("wait for container %s: %w", name, waitCtx.Err())
		case <-timer.C:
		}
	}
}

func (e *Executor) waitForContainerReadyIfEnabled(ctx context.Context, c *Container) error {
	if !c.Lifecycle.WaitForReady {
		return nil
	}
	return e.waitForContainerReady(ctx, c.Name)
}

func containerReady(state types.ContainerState) bool {
	return state.Running && containerHealthReady(state.HealthStatus)
}

func containerHealthReady(status string) bool {
	return status == "" || strings.EqualFold(status, "healthy")
}

func containerHealthFailed(status string) bool {
	return strings.EqualFold(status, "unhealthy")
}

func containerReadinessError(name string, state types.ContainerState) error {
	if containerHealthFailed(state.HealthStatus) {
		return fmt.Errorf("%w: %s", errContainerUnhealthy, name)
	}
	if state.Status == containerStatusExited || state.Status == containerStatusDead {
		return fmt.Errorf("%w: %s (status %s, exit code %d)", errContainerExited, name, state.Status, state.ExitCode)
	}
	return nil
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

func (e *Executor) notifyProgress(id ResourceID, progress Progress) {
	if e.observer != nil {
		e.observer.OnEvent(Event{
			Type:     EventApplyProgress,
			Resource: id,
			Progress: &progress,
		})
	}
}

func progressFromContainerUpdate(update types.ProgressUpdate) Progress {
	return Progress{
		Message:       update.Message,
		Current:       update.Current,
		Total:         update.Total,
		Indeterminate: update.Indeterminate,
	}
}

func clonePublishedPorts(ports []types.PublishedPort) []types.PublishedPort {
	if len(ports) == 0 {
		return nil
	}

	cloned := make([]types.PublishedPort, len(ports))
	copy(cloned, ports)
	return cloned
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

// networksMatch checks if desired networks match actual (order-insensitive).
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
	maps.Copy(labels, c.Labels)
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
	writeSortedList(&b, "networkAliases", c.NetworkAliases)

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
			fmt.Sprintf("%s|%s|%t|%s", v.HostPath, v.ContainerPath, v.ReadOnly, normalizedVolumeMountType(v.Type)),
		)
	}
	writeSortedList(&b, "volumes", volumeEntries)

	if c.HealthCheck != nil {
		b.WriteString("healthcheck=")
		b.WriteString(strings.Join(c.HealthCheck.Test, "\x00"))
		fmt.Fprintf(&b, "|%s|%s|%d|%s",
			c.HealthCheck.Interval, c.HealthCheck.Timeout,
			c.HealthCheck.Retries, c.HealthCheck.StartPeriod)
		b.WriteByte('\n')
	}

	sum := sha256.Sum256([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}

func normalizedVolumeMountType(mountType types.VolumeMountType) types.VolumeMountType {
	if mountType == "" {
		return types.VolumeMountTypeBind
	}
	return mountType
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
