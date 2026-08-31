package containerbackend

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

const containerReadyTimeout = 2 * time.Minute
const containerReadyPollInterval = 500 * time.Millisecond
const containerStatusExited = "exited"
const containerStatusDead = "dead"

func (b Backend) observeContainer(
	ctx context.Context,
	graphID resource.GraphID,
	c *resource.Container,
) (executor.ObservedResource, error) {
	observed := executor.ObservedResource{
		Resource:  c,
		Type:      executor.ResourceTypeContainer,
		RuntimeID: c.Name,
		Status:    executor.StatusDestroyed,
		Managed:   false,
	}

	info, err := b.client.ContainerInspect(ctx, c.Name)
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

func (b Backend) applyContainer(
	ctx context.Context,
	backendCtx executor.BackendContext,
	c *resource.Container,
) (executor.Output, error) {
	imageOutput, ok := backendCtx.Outputs().Image(c.Image.ID())
	if !ok {
		return nil, fmt.Errorf("%w: %s", errImageNotResolved, c.Image.ID())
	}
	imageID := imageOutput.ImageID

	networks, err := b.resolveNetworkNames(c.Networks)
	if err != nil {
		return nil, err
	}

	desiredLabels := normalizedContainerLabels(c, backendCtx.GraphID, imageID, networks)

	needsCreate, err := b.reconcileExistingContainer(ctx, c.Name, imageID, desiredLabels, networks)
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
			UsernsMode:     c.UsernsMode,
			Networks:       networks,
		}

		if _, err = b.client.CreateContainer(ctx, cfg); err != nil {
			return nil, fmt.Errorf("create container %s: %w", c.Name, err)
		}
	}

	if readyErr := b.waitForContainerReadyIfEnabled(ctx, c); readyErr != nil {
		return nil, readyErr
	}

	info, err := b.client.ContainerInspect(ctx, c.Name)
	if err != nil {
		return nil, fmt.Errorf("inspect container %s for outputs: %w", c.Name, err)
	}

	return executor.ContainerOutput{
		ContainerID: info.ID,
		HostPorts:   clonePublishedPorts(info.Ports),
	}, nil
}

// resolveNetworkNames extracts network names from resource.NetworkResource references.
func (b Backend) resolveNetworkNames(refs []resource.ResourceRef) ([]string, error) {
	networks := make([]string, len(refs))
	for i, ref := range refs {
		net := ref.Resource()
		if netRes, ok := net.(resource.NetworkResource); ok {
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
func (b Backend) reconcileExistingContainer(
	ctx context.Context,
	name string,
	imageID string,
	desiredLabels map[string]string,
	networks []string,
) (bool, error) {
	info, err := b.client.ContainerInspect(ctx, name)
	if errors.Is(err, types.ErrContainerNotFound) {
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("inspect container %s: %w", name, err)
	}

	actualNetworks, err := b.client.ContainerNetworks(ctx, name)
	if err != nil {
		return false, fmt.Errorf("get container networks %s: %w", name, err)
	}

	configMatches := info.ImageID == imageID &&
		labelsMatch(desiredLabels, info.Labels) &&
		networksMatch(networks, actualNetworks)

	if !configMatches {
		if stopErr := b.stopAndRemoveContainer(ctx, name); stopErr != nil {
			return false, stopErr
		}
		return true, nil
	}

	if !info.State.Running {
		if startErr := b.client.ContainerStart(ctx, name); startErr != nil {
			return false, fmt.Errorf("start container %s: %w", name, startErr)
		}
	}

	return false, nil
}

func (b Backend) stopAndRemoveContainer(ctx context.Context, name string) error {
	timeout := 10
	stopErr := b.client.ContainerStop(ctx, name, &timeout)
	if errors.Is(stopErr, types.ErrContainerNotFound) {
		stopErr = nil
	}

	removeErr := b.client.ContainerRemove(ctx, name, true)
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

func (b Backend) waitForContainerReady(ctx context.Context, name string) error {
	waitCtx, cancel := context.WithTimeout(ctx, containerReadyTimeout)
	defer cancel()

	for {
		info, err := b.client.ContainerInspect(waitCtx, name)
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

func (b Backend) waitForContainerReadyIfEnabled(ctx context.Context, c *resource.Container) error {
	if !c.Lifecycle.WaitForReady {
		return nil
	}
	return b.waitForContainerReady(ctx, c.Name)
}
