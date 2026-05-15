package migrations_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/migrations"
)

func TestRunRemovesLegacyAppManagerFiles(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "005-remove-legacy-app-manager-files")
	legacyDir := filepath.Join(cfg.BinDir, "app-manager")
	legacyLogDir := filepath.Join(cfg.LogDir, "app-manager")
	legacyPaths := []string{
		legacyDir,
		filepath.Join(cfg.Home, "app-manager.pid"),
		filepath.Join(cfg.SocketDir, "app-manager.sock"),
		filepath.Join(cfg.SocketDir, "app-manager.lock"),
		legacyLogDir,
	}

	if err := os.MkdirAll(legacyDir, 0o700); err != nil {
		t.Fatalf("create legacy install dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(legacyDir, "app-manager"), []byte("legacy\n"), 0o600); err != nil {
		t.Fatalf("write legacy binary: %v", err)
	}
	if err := os.MkdirAll(legacyLogDir, 0o700); err != nil {
		t.Fatalf("create legacy log dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(legacyLogDir, "2026-05-01-1.log"), []byte("legacy log\n"), 0o600); err != nil {
		t.Fatalf("write legacy log: %v", err)
	}
	for _, path := range legacyPaths[1:4] {
		if err := os.WriteFile(path, []byte("legacy\n"), 0o600); err != nil {
			t.Fatalf("write legacy file %s: %v", path, err)
		}
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	for _, path := range legacyPaths {
		if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
			t.Fatalf("legacy path %s stat error = %v, want not exist", path, err)
		}
	}
	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("second Run() error = %v", err)
	}
}
