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
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/migrations"
	"altinn.studio/studioctl/internal/osutil"
)

func TestRunResetsWorkflowEngineDataAndKeepsLocaltestData(t *testing.T) {
	t.Parallel()

	if os.Getenv("CI") != "" && (runtime.GOOS == osutil.OSDarwin || runtime.GOOS == osutil.OSWindows) {
		t.Skip("container runtime is unavailable on macOS and Windows CI")
	}

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "007-reset-workflow-engine-data")

	localtestDataDir := filepath.Join(cfg.DataDir, "AltinnPlatformLocal")
	instanceFile := filepath.Join(localtestDataDir, "instance.json")
	if err := os.MkdirAll(localtestDataDir, 0o755); err != nil {
		t.Fatalf("create localtest data dir: %v", err)
	}
	if err := os.WriteFile(instanceFile, []byte("{}"), 0o644); err != nil {
		t.Fatalf("write localtest instance file: %v", err)
	}
	legacyWorkflowEngineDataDir := components.WorkflowEngineDbDataPath(cfg.DataDir)
	if err := os.MkdirAll(legacyWorkflowEngineDataDir, 0o755); err != nil {
		t.Fatalf("create legacy workflow-engine data dir: %v", err)
	}

	client := containermock.New()
	removedVolumes := make([]string, 0, 1)
	client.VolumeRemoveFunc = func(_ context.Context, name string, force bool) error {
		if !force {
			t.Fatal("VolumeRemove() force = false, want true")
		}
		removedVolumes = append(removedVolumes, name)
		return nil
	}
	runner := migrations.NewRunner(
		migrations.WithContainerClient(func(context.Context) (container.ContainerClient, error) {
			return client, nil
		}),
	)

	if err := runner.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	if _, err := os.Stat(instanceFile); err != nil {
		t.Fatalf("localtest instance file stat error = %v, want kept", err)
	}
	if _, err := os.Stat(legacyWorkflowEngineDataDir); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("legacy workflow-engine data stat error = %v, want not exist", err)
	}
	if len(removedVolumes) != 1 || removedVolumes[0] != components.WorkflowEngineDbVolume {
		t.Fatalf("removed volumes = %v, want [%s]", removedVolumes, components.WorkflowEngineDbVolume)
	}
}

func TestRunResetsWorkflowEngineDataWithoutExistingVolume(t *testing.T) {
	t.Parallel()

	if os.Getenv("CI") != "" && (runtime.GOOS == osutil.OSDarwin || runtime.GOOS == osutil.OSWindows) {
		t.Skip("container runtime is unavailable on macOS and Windows CI")
	}

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "007-reset-workflow-engine-data")

	client := containermock.New()
	client.VolumeRemoveFunc = func(context.Context, string, bool) error {
		return containertypes.ErrVolumeNotFound
	}
	runner := migrations.NewRunner(
		migrations.WithContainerClient(func(context.Context) (container.ContainerClient, error) {
			return client, nil
		}),
	)

	if err := runner.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v, want nil", err)
	}
}
