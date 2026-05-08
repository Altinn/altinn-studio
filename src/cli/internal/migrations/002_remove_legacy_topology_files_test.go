package migrations_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/migrations"
)

func TestRunRemovesLegacyTopologyFiles(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "002-remove-legacy-topology-files")
	topologyDir := cfg.BoundTopologyConfigDir()
	if err := os.MkdirAll(topologyDir, 0o700); err != nil {
		t.Fatalf("create topology dir: %v", err)
	}

	legacyFiles := []string{"base.json", "bound.json", "base.json.tmp", "bound.json.tmp"}
	for _, name := range legacyFiles {
		if err := os.WriteFile(filepath.Join(topologyDir, name), []byte("{}\n"), 0o600); err != nil {
			t.Fatalf("write legacy topology file %s: %v", name, err)
		}
	}

	currentFiles := []string{
		envtopology.BoundTopologyBaseConfigFileName,
		envtopology.BoundTopologyConfigFileName,
	}
	for _, name := range currentFiles {
		if err := os.WriteFile(filepath.Join(topologyDir, name), []byte("{}\n"), 0o600); err != nil {
			t.Fatalf("write current topology file %s: %v", name, err)
		}
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	for _, name := range legacyFiles {
		if _, err := os.Stat(filepath.Join(topologyDir, name)); !errors.Is(err, os.ErrNotExist) {
			t.Fatalf("legacy topology file %s stat error = %v, want not exist", name, err)
		}
	}
	for _, name := range currentFiles {
		if _, err := os.Stat(filepath.Join(topologyDir, name)); err != nil {
			t.Fatalf("current topology file %s stat error = %v, want exist", name, err)
		}
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("second Run() error = %v", err)
	}
}
