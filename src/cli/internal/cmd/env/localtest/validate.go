package localtest

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
)

// CheckForLegacyLocaltest checks if legacy localtest containers are running.
// Returns an error if containers exist without the studioctl management label.
// TODO: we should do something else for this. Need a smooth migration path
// and we can probably check docker/podman compose labels or something
// instead of matching on container names.
func CheckForLegacyLocaltest(
	ctx context.Context,
	client container.ContainerClient,
	resources []resource.Resource,
) error {
	containers := components.EnabledContainerNames(resources)
	var legacyContainers []string

	for _, name := range containers {
		info, err := client.ContainerInspect(ctx, name)
		if errors.Is(err, container.ErrContainerNotFound) {
			continue
		}
		if err != nil {
			return fmt.Errorf("inspect container %s: %w", name, err)
		}

		if !info.State.Running {
			continue
		}

		if isStudioctlManagedContainer(info.Labels) {
			continue
		}

		legacyContainers = append(legacyContainers, name)
	}

	if len(legacyContainers) > 0 {
		return fmt.Errorf("%w: %v", ErrLegacyLocaltestRunning, legacyContainers)
	}
	return nil
}

func isStudioctlManagedContainer(labels map[string]string) bool {
	return labels[resource.GraphIDLabel] == graphID
}
