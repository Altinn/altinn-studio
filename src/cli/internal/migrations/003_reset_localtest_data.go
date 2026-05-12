package migrations

import (
	"context"
	"errors"
	"fmt"
	"io"

	"altinn.studio/devenv/pkg/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envregistry "altinn.studio/studioctl/internal/cmd/env/registry"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func (r *Runner) resetLocaltestData(ctx context.Context, cfg *config.Config) (err error) {
	containerClient := r.containerClient
	client, err := containerClient(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close container client: %w", closeErr))
		}
	}()

	return r.resetLocaltestDataWithClient(ctx, cfg, client)
}

func (r *Runner) resetLocaltestDataWithClient(
	ctx context.Context,
	cfg *config.Config,
	client container.ContainerClient,
) error {
	verbose := false
	if cfg != nil {
		verbose = cfg.Verbose
	}
	stdout := r.stdout
	if stdout == nil {
		stdout = io.Discard
	}
	stderr := r.stderr
	if stderr == nil {
		stderr = io.Discard
	}
	out := ui.NewOutput(stdout, stderr, verbose)
	envs, err := envregistry.Envs(
		envregistry.WithConfig(cfg),
		envregistry.WithOutput(out),
		envregistry.WithContainerClient(client),
	)
	if err != nil {
		return fmt.Errorf("build environment registry: %w", err)
	}

	for _, env := range envs {
		resetter, ok := env.(envtypes.Resetter)
		if !ok {
			continue
		}
		if err := resetter.Reset(ctx); err != nil {
			return fmt.Errorf("reset %s data: %w", env.Name(), err)
		}
	}

	return nil
}
