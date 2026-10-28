package localtest

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/envtopology"
)

// RunningCollector reports whether the environment's OpenTelemetry collector runs, and where it receives OTLP when it
// does. It reads the collector container's state rather than how the environment was started, so it answers for an
// environment an earlier command started, at the cost of one inspect.
func RunningCollector(
	ctx context.Context,
	client container.ContainerClient,
	topology envtopology.Local,
) (envtopology.OTLPCollector, bool, error) {
	var none envtopology.OTLPCollector
	state, err := client.ContainerState(ctx, components.ContainerOtelCollector)
	if errors.Is(err, types.ErrContainerNotFound) {
		return none, false, nil
	}
	if err != nil {
		return none, false, fmt.Errorf("check %s: %w", components.ContainerOtelCollector, err)
	}
	if !state.Running {
		return none, false, nil
	}
	return components.OTLPCollector(topology), true, nil
}
