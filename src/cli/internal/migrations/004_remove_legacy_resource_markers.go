package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/config"
)

func legacyResourceMarkers(_ context.Context, cfg *config.Config) error {
	for _, name := range []string{".version", ".source-marker"} {
		path := filepath.Join(cfg.DataDir, name)
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("remove legacy resource marker %s: %w", path, err)
		}
	}

	return nil
}
