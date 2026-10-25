package localtestv2

import (
	"context"
	"errors"
	"fmt"

	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/localtestv2"
)

// teardown stops the environment: the container-mode apps on its network first, which the network's removal would
// otherwise fail on, then the resource graph.
func (e *Env) teardown(ctx context.Context, logStartMessage string) error {
	if err := e.removeAppContainers(ctx); err != nil {
		return err
	}
	return e.destroyResources(ctx, resources(e.teardownOptions(), nil), logStartMessage)
}

// removeAppContainers removes the container-mode apps (studioctl run --mode container) on the network, running or not,
// with their anonymous volumes: they are not in the resource graph, and they belong to the environment.
func (e *Env) removeAppContainers(ctx context.Context) error {
	apps, err := e.client.ListContainers(ctx, containertypes.ContainerListFilter{
		Labels: map[string]string{localtestv2.Label: localtestv2.LabelAppContainer},
		All:    true,
	})
	if err != nil {
		return fmt.Errorf("list the app containers on %s: %w", localtestv2.Network, err)
	}
	var errs []error
	for _, app := range apps {
		name := app.Name
		if name == "" {
			name = app.ID
		}
		err := e.client.ContainerRemove(ctx, app.ID, true)
		switch {
		case err == nil:
			e.out.Printlnf("Removed app container %s", name)
		case !errors.Is(err, containertypes.ErrContainerNotFound):
			errs = append(errs, fmt.Errorf("remove app container %s: %w", name, err))
		}
	}
	return errors.Join(errs...)
}
