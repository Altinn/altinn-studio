package env

import (
	"context"
	"fmt"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/studioctlserver"
)

// EnsureBoundTopology prepares shared topology state required by environment runtimes.
func EnsureBoundTopology(
	ctx context.Context,
	cfg *config.Config,
	topology envtopology.Local,
	bindings []envtopology.RuntimeBinding,
) error {
	if err := topology.WriteBoundTopologyBaseConfig(cfg.BoundTopologyBaseConfigPath(), bindings); err != nil {
		return fmt.Errorf("write environment topology config: %w", err)
	}

	if err := studioctlserver.EnsureStarted(ctx, cfg, topology.IngressPort()); err != nil {
		return fmt.Errorf("ensure studioctl-server: %w", err)
	}

	return nil
}
