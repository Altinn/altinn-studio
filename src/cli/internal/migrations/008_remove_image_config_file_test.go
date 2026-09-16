package migrations_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/migrations"
)

func TestRunRemovesImageConfigFile(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "008-remove-image-config-file")
	path := filepath.Join(cfg.Home, "config.yaml")
	if err := os.WriteFile(path, []byte("images:\n  core:\n    localtest:\n      tag: \"abc\"\n"), 0o600); err != nil {
		t.Fatalf("write image config file: %v", err)
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("image config file stat error = %v, want not exist", err)
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("second Run() error = %v", err)
	}
}

func TestRunWithoutImageConfigFile(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "008-remove-image-config-file")

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
}
