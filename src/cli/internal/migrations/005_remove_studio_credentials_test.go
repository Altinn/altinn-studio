package migrations_test

import (
	"errors"
	"os"
	"testing"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/migrations"
	"altinn.studio/studioctl/internal/osutil"
)

func TestRunRemovesStudioCredentials(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "006-remove-studio-credentials")
	path := auth.CredentialsPath(cfg.Home)
	if err := os.WriteFile(path, []byte("envs:\n  prod:\n    token: legacy\n"), osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write credentials: %v", err)
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("credentials stat error = %v, want not exist", err)
	}
	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("second Run() error = %v", err)
	}
}
