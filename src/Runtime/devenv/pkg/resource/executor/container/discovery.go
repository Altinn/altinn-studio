package containerbackend

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

func (b Backend) discoverContainerGraphResources(ctx context.Context, snapshot *executor.Snapshot) error {
	containers, err := b.client.ListContainers(ctx, types.ContainerListFilter{
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
		id := resource.ContainerID(info.Name)
		if observed, ok := snapshot.Resources[id]; ok && observed.Resource != nil {
			observed.RuntimeID = firstNonEmptyString(info.ID, info.Name)
			observed.Managed = true
			snapshot.Resources[id] = observed
			continue
		}
		dependencies, depErr := b.discoveredContainerDependencies(ctx, info)
		if depErr != nil {
			return depErr
		}
		snapshot.Resources[id] = executor.ObservedResource{
			RuntimeID:    firstNonEmptyString(info.ID, info.Name),
			Type:         executor.ResourceTypeContainer,
			Status:       containerInfoStatus(info),
			Managed:      true,
			Dependencies: dependencies,
		}
	}

	networks, err := b.client.ListNetworks(ctx, types.NetworkListFilter{
		Labels: map[string]string{GraphIDLabel: snapshot.GraphID.String()},
	})
	if err != nil {
		return fmt.Errorf("list graph networks: %w", err)
	}
	for _, network := range networks {
		if network.Name == "" {
			continue
		}
		id := resource.ResourceID(networkResourceIDPrefix + network.Name)
		if observed, ok := snapshot.Resources[id]; ok && observed.Resource != nil {
			observed.RuntimeID = firstNonEmptyString(network.ID, network.Name)
			observed.Managed = true
			snapshot.Resources[id] = observed
			continue
		}
		snapshot.Resources[id] = executor.ObservedResource{
			RuntimeID: firstNonEmptyString(network.ID, network.Name),
			Type:      executor.ResourceTypeNetwork,
			Status:    executor.StatusReady,
			Managed:   true,
		}
	}
	return nil
}

func (b Backend) discoveredContainerDependencies(
	ctx context.Context,
	info types.ContainerInfo,
) ([]resource.ResourceRef, error) {
	name := firstNonEmptyString(info.ID, info.Name)
	networks, err := b.client.ContainerNetworks(ctx, name)
	if errors.Is(err, types.ErrContainerNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("list container networks %s: %w", name, err)
	}

	dependencies := make([]resource.ResourceRef, 0, len(networks))
	for _, network := range networks {
		if network != "" {
			dependencies = append(dependencies, resource.RefID(resource.ResourceID(networkResourceIDPrefix+network)))
		}
	}
	return dependencies, nil
}
