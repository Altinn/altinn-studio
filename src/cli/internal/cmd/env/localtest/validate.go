package localtest

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/resource"
)

const localtestContainerName = "localtest"

// CheckForLegacyLocaltest checks if the localtest container name is owned by
// something other than studioctl.
func CheckForLegacyLocaltest(
	ctx context.Context,
	client container.ContainerClient,
) error {
	info, err := client.ContainerInspect(ctx, localtestContainerName)
	if errors.Is(err, container.ErrContainerNotFound) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("inspect container %s: %w", localtestContainerName, err)
	}

	if !info.State.Running || info.Labels[resource.GraphIDLabel] == graphID {
		return nil
	}
	return fmt.Errorf("%w: %s", ErrLegacyLocaltestRunning, localtestContainerName)
}
