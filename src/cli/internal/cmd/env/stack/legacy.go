package stack

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"altinn.studio/devenv/pkg/container"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
)

const (
	legacyLocaltestContainerName = "localtest"
	// graphIDPrefix starts the graph ID of every studioctl runtime.
	graphIDPrefix = "studioctl-"
)

// ErrLegacyLocaltestRunning is returned when a localtest started outside studioctl is running.
var ErrLegacyLocaltestRunning = errors.New("legacy localtest is running (started outside this CLI)")

// CheckForLegacyLocaltest reports a running container named localtest that no studioctl runtime owns: a localtest
// started outside studioctl, which holds the public origin's port and host names every runtime needs.
func CheckForLegacyLocaltest(ctx context.Context, client container.ContainerClient) error {
	info, err := client.ContainerInspect(ctx, legacyLocaltestContainerName)
	if errors.Is(err, container.ErrContainerNotFound) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("inspect container %s: %w", legacyLocaltestContainerName, err)
	}

	if !info.State.Running || strings.HasPrefix(info.Labels[containerbackend.GraphIDLabel], graphIDPrefix) {
		return nil
	}
	return fmt.Errorf("%w: %s", ErrLegacyLocaltestRunning, legacyLocaltestContainerName)
}
