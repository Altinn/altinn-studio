package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
)

func studioCredentials(_ context.Context, cfg *config.Config) error {
	path := auth.CredentialsPath(cfg.Home)
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove studio credentials: %w", err)
	}
	return nil
}
