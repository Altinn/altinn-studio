package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/config"
)

func legacyNetworkMetadata(_ context.Context, cfg *config.Config) error {
	path := filepath.Join(cfg.Home, "network-metadata.yaml")
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove legacy network metadata: %w", err)
	}
	return nil
}
