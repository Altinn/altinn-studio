package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/config"
)

// imageConfigFile removes the image override file studioctl read from the home directory.
// Image references now live in the binary, so a file left behind would look like it still
// selects images. STUDIOCTL_IMAGE_* replaces it.
func imageConfigFile(_ context.Context, cfg *config.Config) error {
	path := filepath.Join(cfg.Home, "config.yaml")
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove obsolete image config file %s: %w", path, err)
	}

	return nil
}
