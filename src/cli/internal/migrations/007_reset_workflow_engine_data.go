package migrations

import (
	"context"
	"errors"
	"fmt"

	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envregistry "altinn.studio/studioctl/internal/cmd/env/registry"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// resetWorkflowEngineData drops the local workflow-engine database. The app runtime changed the
// workflow callback contract (signed callback state now carries Storage versions, command
// payloads were renamed, and the instance-lock token was removed), so workflows persisted by
// earlier versions fail on their next step. Localtest instance data stays: instances left
// mid-transition continue from the process state Storage last committed.
func (r *Runner) resetWorkflowEngineData(ctx context.Context, cfg *config.Config) (err error) {
	client, err := r.containerClient(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close container client: %w", closeErr))
		}
	}()

	envs, err := envregistry.Envs(
		envregistry.WithConfig(cfg),
		envregistry.WithOutput(ui.NewOutput(r.stdout, r.stderr, cfg.Verbose)),
		envregistry.WithContainerClient(client),
	)
	if err != nil {
		return fmt.Errorf("build environment registry: %w", err)
	}

	for _, env := range envs {
		resetter, ok := env.(envtypes.WorkflowEngineResetter)
		if !ok {
			continue
		}
		if err := resetter.ResetWorkflowEngineData(ctx); err != nil {
			return fmt.Errorf("reset %s workflow-engine data: %w", env.Name(), err)
		}
	}

	return nil
}
