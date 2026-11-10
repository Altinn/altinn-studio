package containerbackend

import (
	"context"
	"fmt"

	containerclient "altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
)

// GraphRunning reports whether any container owned by graphID is running. It reads the containers' ownership labels
// rather than a resource list, so it answers for whatever configuration the graph was applied with.
func GraphRunning(ctx context.Context, client containerclient.ContainerClient, graphID resource.GraphID) (bool, error) {
	containers, err := client.ListContainers(ctx, types.ContainerListFilter{
		Labels: map[string]string{GraphIDLabel: graphID.String()},
		All:    false,
	})
	if err != nil {
		return false, fmt.Errorf("list containers of %s: %w", graphID, err)
	}
	for _, ctr := range containers {
		if ctr.State.Running {
			return true, nil
		}
	}
	return false, nil
}
