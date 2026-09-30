package containerbackend

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

func (b Backend) observeNetwork(
	ctx context.Context,
	graphID resource.GraphID,
	net *resource.Network,
) (executor.ObservedResource, error) {
	observed := executor.ObservedResource{
		Resource:  net,
		Type:      executor.ResourceTypeNetwork,
		RuntimeID: net.Name,
		Status:    executor.StatusDestroyed,
		Managed:   false,
	}

	info, err := b.client.NetworkInspect(ctx, net.Name)
	if errors.Is(err, types.ErrNetworkNotFound) {
		return observed, nil
	}
	if err != nil {
		return observed, fmt.Errorf("inspect network %s: %w", net.Name, err)
	}

	observed.Status = executor.StatusReady
	observed.RuntimeID = firstNonEmptyString(info.ID, net.Name)
	observed.Managed = resourceManagedByGraph(info.Labels, graphID)
	return observed, nil
}

func (b Backend) applyNetwork(
	ctx context.Context,
	graphID resource.GraphID,
	net *resource.Network,
) (executor.Output, error) {
	_, err := b.client.NetworkInspect(ctx, net.Name)
	if err == nil {
		// resource.Network exists
		// TODO: check labels match, recreate if needed
		return executor.NoOutput{}, nil
	}

	if !errors.Is(err, types.ErrNetworkNotFound) {
		return nil, fmt.Errorf("inspect network %s: %w", net.Name, err)
	}

	driver := net.Driver
	if driver == "" {
		driver = "bridge"
	}

	cfg := types.NetworkConfig{
		Name:   net.Name,
		Driver: driver,
		Labels: normalizedResourceLabels(net.Labels, graphID),
	}

	if _, err := b.client.NetworkCreate(ctx, cfg); err != nil {
		return nil, fmt.Errorf("create network %s: %w", net.Name, err)
	}

	return executor.NoOutput{}, nil
}
