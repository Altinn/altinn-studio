package migrations

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"runtime"

	"altinn.studio/devenv/pkg/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envregistry "altinn.studio/studioctl/internal/cmd/env/registry"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

func resetLocaltestData(ctx context.Context, cfg *config.Config) (err error) {
	if skipResetLocaltestDataMigration(runtime.GOOS, os.Getenv("CI")) {
		return nil
	}

	client, err := container.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close container client: %w", closeErr))
		}
	}()

	return resetLocaltestDataWithClient(ctx, cfg, client)
}

func skipResetLocaltestDataMigration(goos, ci string) bool {
	if ci == "" {
		return false
	}
	// CI on windows and mac doesnt have a container runtime currently.
	return goos == osutil.OSDarwin || goos == osutil.OSWindows
}

func resetLocaltestDataWithClient(
	ctx context.Context,
	cfg *config.Config,
	client container.ContainerClient,
) error {
	verbose := false
	if cfg != nil {
		verbose = cfg.Verbose
	}
	out := ui.NewOutput(io.Discard, io.Discard, verbose)
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
