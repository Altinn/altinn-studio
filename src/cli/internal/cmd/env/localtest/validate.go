package localtest

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container"
)

// CheckForLegacyLocaltest checks if legacy localtest containers are running.
// Returns an error if containers exist without the studioctl management label.
func CheckForLegacyLocaltest(ctx context.Context, client container.ContainerClient) error {
	containers := coreContainerNames()
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

		if info.Labels[LabelKey] == LabelValue {
			continue
		}

		legacyContainers = append(legacyContainers, name)
	}

	if len(legacyContainers) > 0 {
		return fmt.Errorf("%w: %v", ErrLegacyLocaltestRunning, legacyContainers)
	}
	return nil
}
