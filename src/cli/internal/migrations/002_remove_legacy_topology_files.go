package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/config"
)

func legacyTopologyFiles(_ context.Context, cfg *config.Config) error {
	for _, name := range []string{"base.json", "bound.json", "base.json.tmp", "bound.json.tmp"} {
		path := filepath.Join(cfg.BoundTopologyConfigDir(), name)
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("remove legacy topology file %s: %w", path, err)
		}
	}

	return nil
}
