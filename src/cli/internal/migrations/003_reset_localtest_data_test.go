package migrations_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/studioctl/internal/migrations"
	"altinn.studio/studioctl/internal/osutil"
)

func TestRunResetsLocaltestData(t *testing.T) {
	t.Parallel()

	if os.Getenv("CI") != "" && (runtime.GOOS == osutil.OSDarwin || runtime.GOOS == osutil.OSWindows) {
		t.Skip("container runtime is unavailable on macOS and Windows CI")
	}

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "003-reset-localtest-data")

	localtestDataDir := filepath.Join(cfg.DataDir, "AltinnPlatformLocal")
	if err := os.MkdirAll(localtestDataDir, 0o755); err != nil {
		t.Fatalf("create localtest data dir: %v", err)
	}

	client := containermock.New()
	runner := migrations.NewRunner(
		migrations.WithContainerClient(func(context.Context) (container.ContainerClient, error) {
			return client, nil
		}),
	)

	if err := runner.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if _, err := os.Stat(localtestDataDir); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("localtest data stat error = %v, want not exist", err)
	}
}
