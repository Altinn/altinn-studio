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

// GraphIDLabel is the runtime label used to identify resources owned by a graph.
const GraphIDLabel = "altinn.studio/devenv.graph"

const networkResourceIDPrefix = "network:"
const containerReadyTimeout = 2 * time.Minute
const containerReadyPollInterval = 500 * time.Millisecond
const containerStatusExited = "exited"
const containerStatusDead = "dead"

var (
	errUnknownResourceType       = errors.New("unknown resource type")
	errImageNotResolved          = errors.New("image not resolved")
	errNetworkNameUnresolvable   = errors.New("cannot resolve network name")
	errResourceOwnershipConflict = errors.New("resource exists but is not managed by this graph")
	errImageMissingForPullNever  = errors.New("image not found locally and pull policy is Never")
	errContainerExited           = errors.New("container exited before becoming ready")
	errContainerUnhealthy        = errors.New("container healthcheck failed")
	errContainerReadyTimeout     = errors.New("container did not become ready before timeout")
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
func (e *Executor) Apply(ctx context.Context, g *Graph, opts ...ApplyOption) (Outputs, error) {
	if err := validateGraphID(g); err != nil {
		return Outputs{}, err
	}
	options := newApplyOptions(opts)
	levels, err := g.TopologicalOrder()
	if err != nil {
		return Outputs{}, err
	}
	actual, err := e.Status(ctx, g)
	if err != nil {
		return Outputs{}, err
	}
	plan := buildApplyPlan(g, actual)
	if err := validateNoOwnershipConflicts(plan, actual); err != nil {
		return Outputs{}, err
	}
	if err := notifyApplyPlan(options, g, actual, plan); err != nil {
		return Outputs{}, err
	}
	if err := e.executeDestroyPlan(ctx, actual, plan.destroy); err != nil {
		return Outputs{}, err
	}

	return e.executeApplyPlan(ctx, g, levels, plan)
}

// Destroy removes all resources in the graph in reverse dependency order.
// Resources at the same dependency level are destroyed in parallel.
func (e *Executor) Destroy(ctx context.Context, g *Graph, opts ...DestroyOption) error {
	if err := validateGraphID(g); err != nil {
		return err
	}
	options := newDestroyOptions(opts)

	actual, err := e.Status(ctx, g)
	if err != nil {
		return err
	}
	plan := buildDestroyPlan(g, actual)
	if err := notifyDestroyPlan(options, g, actual, plan); err != nil {
		return err
	}
	return e.executeDestroyPlan(ctx, actual, plan.destroy)
}

// Status returns observed state for the requested graph and any labelled runtime resources it owns.
func (e *Executor) Status(ctx context.Context, g *Graph, opts ...StatusOption) (Snapshot, error) {
	if err := validateGraphID(g); err != nil {
		return Snapshot{}, err
	}

	options := newStatusOptions(opts)
	resources := g.All()
	snapshot := Snapshot{
		GraphID:   g.ID(),
		Resources: make(map[ResourceID]ObservedResource, len(resources)),
	}

	for _, r := range resources {
		if options.skipResource(r) {
			continue
		}
		observed, err := e.observeResource(ctx, g.ID(), r)
		if err != nil {
			return Snapshot{}, fmt.Errorf("status %s: %w", r.ID(), err)
		}
		snapshot.Resources[r.ID()] = observed
	}

	if err := e.discoverGraphResources(ctx, &snapshot); err != nil {
		return Snapshot{}, err
	}

	return snapshot, nil
}

func (e *Executor) executeApplyPlan(
	ctx context.Context,
	g *Graph,
	levels [][]Resource,
	plan applyPlan,
) (Outputs, error) {
	applyIDs := resourceIDSet(plan.reconcile)

	e.outputs.Reset()

	for _, level := range levels {
		eg, groupCtx := errgroup.WithContext(ctx)
		for _, r := range level {
			if _, ok := applyIDs[r.ID()]; !ok {
				continue
			}
			eg.Go(func() error {
				e.notify(EventApplyStart, r.ID(), nil)
				output, err := e.applyResource(groupCtx, g.ID(), r)
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

func (e *Executor) executeDestroyPlan(ctx context.Context, actual Snapshot, ids []ResourceID) error {
	if len(ids) == 0 {
		return nil
	}
	graph, err := buildObservedGraph(actual)
	if err != nil {
		return err
	}
	levels, err := graph.ReverseTopologicalOrderSubset(ids)
	if err != nil {
		return err
	}
	for _, level := range levels {
		eg, groupCtx := errgroup.WithContext(ctx)
		for _, r := range level {
			eg.Go(func() error {
				observed, ok := actual.Resources[r.ID()]
				if !ok {
					return fmt.Errorf("%w: %q", errGraphResourceNotFound, r.ID())
				}
				return e.destroyObservedResource(groupCtx, r.ID(), observed)
			})
		}
		if err := eg.Wait(); err != nil {
			return fmt.Errorf("destroy level: %w", err)
		}
	}
	return nil
}

func resourceIDSet(ids []ResourceID) map[ResourceID]struct{} {
	set := make(map[ResourceID]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	return set
}

func validateGraphID(g *Graph) error {
	if g == nil || g.ID() == "" {
		return errGraphEmptyID
	}
	return nil
}

func (e *Executor) discoverGraphResources(ctx context.Context, snapshot *Snapshot) error {
	containers, err := e.client.ListContainers(ctx, types.ContainerListFilter{
		All:    true,
		Labels: map[string]string{GraphIDLabel: snapshot.GraphID.String()},
	})
	if err != nil {
		return fmt.Errorf("list graph containers: %w", err)
	}
	for _, info := range containers {
		if info.Name == "" {
			continue
		}
		id := ContainerID(info.Name)
		if observed, ok := snapshot.Resources[id]; ok && observed.Resource != nil {
			observed.RuntimeID = firstNonEmptyString(info.ID, info.Name)
			observed.Managed = true
			snapshot.Resources[id] = observed
			continue
		}
		dependencies, depErr := e.discoveredContainerDependencies(ctx, info)
		if depErr != nil {
			return depErr
		}
		snapshot.Resources[id] = ObservedResource{
			RuntimeID:    firstNonEmptyString(info.ID, info.Name),
			Type:         resourceTypeContainer,
			Status:       containerInfoStatus(info),
			Managed:      true,
			Dependencies: dependencies,
		}
	}

	networks, err := e.client.ListNetworks(ctx, types.NetworkListFilter{
		Labels: map[string]string{GraphIDLabel: snapshot.GraphID.String()},
	})
	if err != nil {
		return fmt.Errorf("list graph networks: %w", err)
	}
	for _, network := range networks {
		if network.Name == "" {
			continue
		}
		id := ResourceID(networkResourceIDPrefix + network.Name)
		if observed, ok := snapshot.Resources[id]; ok && observed.Resource != nil {
			observed.Managed = true
			snapshot.Resources[id] = observed
			continue
		}
		snapshot.Resources[id] = ObservedResource{
			RuntimeID: firstNonEmptyString(network.ID, network.Name),
			Type:      resourceTypeNetwork,
			Status:    StatusReady,
			Managed:   true,
		}
	}
	return nil
}

func (e *Executor) discoveredContainerDependencies(
	ctx context.Context,
	info types.ContainerInfo,
) ([]ResourceRef, error) {
	name := firstNonEmptyString(info.ID, info.Name)
	networks, err := e.client.ContainerNetworks(ctx, name)
	if errors.Is(err, types.ErrContainerNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("list container networks %s: %w", name, err)
	}

	dependencies := make([]ResourceRef, 0, len(networks))
	for _, network := range networks {
		if network != "" {
			dependencies = append(dependencies, RefID(ResourceID(networkResourceIDPrefix+network)))
		}
	}
	return dependencies, nil
}

func (e *Executor) destroyObservedRuntimeResource(
	ctx context.Context,
	id ResourceID,
	observed ObservedResource,
) error {
	name := firstNonEmptyString(observed.RuntimeID, id.String())
	switch observed.Type {
	case resourceTypeContainer:
		return e.stopAndRemoveContainer(ctx, name)
	case resourceTypeNetwork:
		err := e.client.NetworkRemove(ctx, name)
		if err != nil && !errors.Is(err, types.ErrNetworkNotFound) {
			return fmt.Errorf("remove network %s: %w", name, err)
		}
		return nil
	case resourceTypeImage:
		return nil
	case resourceTypeUnknown:
		return fmt.Errorf("%w: %v", errUnknownResourceType, observed.Type)
	default:
		return fmt.Errorf("%w: %v", errUnknownResourceType, observed.Type)
	}
}

func (e *Executor) destroyObservedResource(ctx context.Context, id ResourceID, observed ObservedResource) error {
	e.notify(EventDestroyStart, id, nil)
	if err := e.destroyObservedRuntimeResource(ctx, id, observed); err != nil {
		if observed.Resource != nil && handleDestroyError(observed.Resource, err) == ErrorDecisionIgnore {
			e.notify(EventDestroyDone, id, nil)
			return nil
		}
		e.notify(EventDestroyFailed, id, err)
		return fmt.Errorf("destroy %s: %w", id, err)
	}
	e.notify(EventDestroyDone, id, nil)
	return nil
}

func resourceManagedByGraph(labels map[string]string, graphID GraphID) bool {
	return labels[GraphIDLabel] == graphID.String()
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func (e *Executor) applyResource(ctx context.Context, graphID GraphID, r Resource) (Output, error) {
	switch res := r.(type) {
	case *RemoteImage:
		return e.applyRemoteImage(ctx, res)
	case *LocalImage:
		return e.applyLocalImage(ctx, res)
	case *Network:
		return e.applyNetwork(ctx, graphID, res)
	case *Container:
		return e.applyContainer(ctx, graphID, res)
	default:
		return nil, fmt.Errorf("%w: %T", errUnknownResourceType, r)
	}
}

func (e *Executor) observeResource(ctx context.Context, graphID GraphID, r Resource) (ObservedResource, error) {
	switch res := r.(type) {
	case *RemoteImage:
		status, err := e.imageStatus(ctx, res.Ref)
		return ObservedResource{
			Resource:  r,
			Type:      resourceTypeImage,
			RuntimeID: res.Ref,
			Status:    status,
			Managed:   false,
		}, err
	case *LocalImage:
		status, err := e.imageStatus(ctx, res.Tag)
		return ObservedResource{
			Resource:  r,
			Type:      resourceTypeImage,
			RuntimeID: res.Tag,
			Status:    status,
			Managed:   false,
		}, err
	case *Network:
		return e.observeNetwork(ctx, graphID, res)
	case *Container:
		return e.observeContainer(ctx, graphID, res)
	default:
		return ObservedResource{}, fmt.Errorf("%w: %T", errUnknownResourceType, r)
	}
}

func (e *Executor) observeNetwork(ctx context.Context, graphID GraphID, net *Network) (ObservedResource, error) {
	observed := ObservedResource{
		Resource:  net,
		Type:      resourceTypeNetwork,
		RuntimeID: net.Name,
		Status:    StatusDestroyed,
		Managed:   false,
	}

	info, err := e.client.NetworkInspect(ctx, net.Name)
	if errors.Is(err, types.ErrNetworkNotFound) {
		return observed, nil
	}
	if err != nil {
		return observed, fmt.Errorf("inspect network %s: %w", net.Name, err)
	}

	observed.Status = StatusReady
	observed.RuntimeID = firstNonEmptyString(info.ID, net.Name)
	observed.Managed = resourceManagedByGraph(info.Labels, graphID)
	return observed, nil
}

func (e *Executor) observeContainer(ctx context.Context, graphID GraphID, c *Container) (ObservedResource, error) {
	observed := ObservedResource{
		Resource:  c,
		Type:      resourceTypeContainer,
		RuntimeID: c.Name,
		Status:    StatusDestroyed,
		Managed:   false,
	}

	info, err := e.client.ContainerInspect(ctx, c.Name)
	if errors.Is(err, types.ErrContainerNotFound) {
		return observed, nil
	}
	if err != nil {
		return observed, fmt.Errorf("inspect container %s: %w", c.Name, err)
	}

	observed.RuntimeID = firstNonEmptyString(info.ID, info.Name, c.Name)
	observed.Status = containerInfoStatus(info)
	observed.Managed = resourceManagedByGraph(info.Labels, graphID)
	return observed, nil
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

func (e *Executor) applyNetwork(ctx context.Context, graphID GraphID, net *Network) (Output, error) {
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
		Labels: normalizedResourceLabels(net.Labels, graphID),
	}

	if _, err := e.client.NetworkCreate(ctx, cfg); err != nil {
		return nil, fmt.Errorf("create network %s: %w", net.Name, err)
	}

	return noOutput{}, nil
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

func retainOnDestroy(r Resource) bool {
	provider, ok := r.(LifecycleOptionsProvider)
	if !ok {
		return defaultRetainOnDestroy(r)
	}
	return provider.LifecycleOptions().RetainOnDestroy
}

func defaultRetainOnDestroy(r Resource) bool {
	switch r.(type) {
	case *RemoteImage, *LocalImage:
		return true
	default:
		return false
	}
}

// Container operations

func (e *Executor) applyContainer(ctx context.Context, graphID GraphID, c *Container) (Output, error) {
	imageOutput, ok := e.outputs.Image(c.Image.ID())
	if !ok {
		return nil, fmt.Errorf("%w: %s", errImageNotResolved, c.Image.ID())
	}
	imageID := imageOutput.ImageID

	networks, err := e.resolveNetworkNames(c.Networks)
	if err != nil {
		return nil, err
	}

	desiredLabels := normalizedContainerLabels(c, graphID, imageID, networks)

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

func containerInfoStatus(info types.ContainerInfo) Status {
	switch {
	case info.State.Running && containerHealthReady(info.State.HealthStatus):
		return StatusReady
	case info.State.Running && containerHealthFailed(info.State.HealthStatus):
		return StatusFailed
	case info.State.Running:
		return StatusPending
	case info.State.Status == "created":
		return StatusPending
	case info.State.Status == containerStatusExited:
		return StatusFailed
	default:
		return StatusUnknown
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

func normalizedContainerLabels(c *Container, graphID GraphID, imageID string, networks []string) map[string]string {
	labels := normalizedResourceLabels(c.Labels, graphID)
	labels[containerSpecHashLabel] = containerSpecHash(c, imageID, networks)
	return labels
}

func normalizedResourceLabels(labels map[string]string, graphID GraphID) map[string]string {
	normalized := make(map[string]string, len(labels)+1)
	maps.Copy(normalized, labels)
	normalized[GraphIDLabel] = graphID.String()
	return normalized
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
