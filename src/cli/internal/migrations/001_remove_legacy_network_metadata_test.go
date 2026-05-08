package migrations_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/migrations"
)

func TestRunRemovesLegacyNetworkMetadata(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "001-remove-legacy-network-metadata")
	path := filepath.Join(cfg.Home, "network-metadata.yaml")
	if err := os.WriteFile(path, []byte("hostGateway: 172.17.0.1\n"), 0o600); err != nil {
		t.Fatalf("write legacy network metadata: %v", err)
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("legacy network metadata stat error = %v, want not exist", err)
	}
	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("second Run() error = %v", err)
	}
}
