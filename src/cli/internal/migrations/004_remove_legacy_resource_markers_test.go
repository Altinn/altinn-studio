package migrations_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/migrations"
)

func TestRunRemovesLegacyResourceMarkers(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "004-remove-legacy-resource-markers")
	markers := []string{".version", ".source-marker"}
	for _, name := range markers {
		if err := os.WriteFile(filepath.Join(cfg.DataDir, name), []byte("legacy\n"), 0o600); err != nil {
			t.Fatalf("write legacy resource marker %s: %v", name, err)
		}
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	for _, name := range markers {
		if _, err := os.Stat(filepath.Join(cfg.DataDir, name)); !errors.Is(err, os.ErrNotExist) {
			t.Fatalf("legacy resource marker %s stat error = %v, want not exist", name, err)
		}
	}
	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("second Run() error = %v", err)
	}
}
