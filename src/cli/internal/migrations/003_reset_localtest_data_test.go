//nolint:testpackage // Same-package test keeps migration helper unexported.
package migrations

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/studioctl/internal/config"
)

func TestResetLocaltestDataRemovesPersistedData(t *testing.T) {
	t.Parallel()

	cfg := testMigrationConfig(t)
	localtestDataDir := filepath.Join(cfg.DataDir, "AltinnPlatformLocal")
	if err := os.MkdirAll(localtestDataDir, 0o755); err != nil {
		t.Fatalf("create localtest data dir: %v", err)
	}

	client := containermock.New()
	if err := resetLocaltestDataWithClient(t.Context(), cfg, client); err != nil {
		t.Fatalf("resetLocaltestDataWithClient() error = %v", err)
	}

	if _, err := os.Stat(localtestDataDir); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("localtest data still exists after migration: %v", err)
	}
	assertMigrationCallRecorded(t, client.Calls, "VolumeRemove")
}

func testMigrationConfig(t *testing.T) *config.Config {
	t.Helper()

	cfg, err := config.New(config.Flags{Home: t.TempDir()}, "test-version")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}
	return cfg
}

func assertMigrationCallRecorded(t *testing.T, calls []containermock.Call, method string) {
	t.Helper()

	for _, call := range calls {
		if call.Method == method {
			return
		}
	}
	t.Fatalf("%s not recorded in calls: %+v", method, calls)
}
