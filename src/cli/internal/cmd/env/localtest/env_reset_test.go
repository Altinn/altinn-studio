//nolint:testpackage // Same-package test keeps reset-path coverage small and avoids test-only exports.
package localtest

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestReset_RemovesPersistedDataWhenAlreadyStopped(t *testing.T) {
	dataDir := t.TempDir()
	localtestDataDir := filepath.Join(dataDir, "AltinnPlatformLocal")
	workflowEngineDataDir := workflowEngineDbDataPath(dataDir)
	createDir(t, localtestDataDir)
	createDir(t, workflowEngineDataDir)

	env := NewEnv(
		&config.Config{
			DataDir: dataDir,
			Images:  testResetImages(),
		},
		ui.NewOutput(io.Discard, io.Discard, false),
		containermock.New(),
	)
	if err := env.Reset(context.Background()); err != nil {
		t.Fatalf("Reset() error = %v", err)
	}

	assertCallRecorded(t, clientCalls(env), "CreateContainer")
	assertCallRecorded(t, clientCalls(env), "ContainerWait")
	assertNotExists(t, localtestDataDir)
	assertNotExists(t, workflowEngineDataDir)
}

func TestReset_StopsManagedResourcesBeforeRemovingPersistedData(t *testing.T) {
	dataDir := t.TempDir()
	localtestDataDir := filepath.Join(dataDir, "AltinnPlatformLocal")
	workflowEngineDataDir := workflowEngineDbDataPath(dataDir)
	createDir(t, localtestDataDir)
	createDir(t, workflowEngineDataDir)

	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (containertypes.ContainerInfo, error) {
		return containertypes.ContainerInfo{}, nil
	}
	client.NetworkInspectFunc = func(context.Context, string) (containertypes.NetworkInfo, error) {
		return containertypes.NetworkInfo{}, nil
	}

	env := NewEnv(
		&config.Config{
			DataDir: dataDir,
			Images:  testResetImages(),
		},
		ui.NewOutput(io.Discard, io.Discard, false),
		client,
	)
	if err := env.Reset(context.Background()); err != nil {
		t.Fatalf("Reset() error = %v", err)
	}

	assertCallRecorded(t, client.Calls, "CreateContainer")
	assertCallRecorded(t, client.Calls, "ContainerWait")
	assertCallRecorded(t, client.Calls, "ContainerRemove")
	assertCallRecorded(t, client.Calls, "NetworkRemove")
	assertNotExists(t, localtestDataDir)
	assertNotExists(t, workflowEngineDataDir)
}

func TestReset_RefusesLegacyLocaltest(t *testing.T) {
	dataDir := t.TempDir()
	createDir(t, filepath.Join(dataDir, "AltinnPlatformLocal"))
	createDir(t, workflowEngineDbDataPath(dataDir))

	client := containermock.New()
	client.ContainerInspectFunc = func(_ context.Context, name string) (containertypes.ContainerInfo, error) {
		if name == ContainerLocaltest {
			return containertypes.ContainerInfo{
				Name:   ContainerLocaltest,
				Labels: map[string]string{},
				State:  containertypes.ContainerState{Running: true},
			}, nil
		}
		return containertypes.ContainerInfo{}, containertypes.ErrContainerNotFound
	}

	env := NewEnv(
		&config.Config{
			DataDir: dataDir,
			Images:  testResetImages(),
		},
		ui.NewOutput(io.Discard, io.Discard, false),
		client,
	)
	err := env.Reset(context.Background())
	if !errors.Is(err, ErrLegacyLocaltestRunning) {
		t.Fatalf("Reset() error = %v, want ErrLegacyLocaltestRunning", err)
	}
}

func TestReset_IncludesCleanupHelperLogsOnFailure(t *testing.T) {
	dataDir := t.TempDir()
	createDir(t, filepath.Join(dataDir, "AltinnPlatformLocal"))
	createDir(t, workflowEngineDbDataPath(dataDir))

	client := containermock.New()
	client.ContainerWaitFunc = func(context.Context, string) (int, error) {
		return 17, nil
	}
	client.ContainerLogsFunc = func(_ context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error) {
		if follow {
			t.Fatal("ContainerLogs() follow = true, want false")
		}
		if tail != cleanupHelperLogTail {
			t.Fatalf("ContainerLogs() tail = %q, want %q", tail, cleanupHelperLogTail)
		}
		return io.NopCloser(strings.NewReader("permission denied\nrm: cannot remove /cleanup/foo\n")), nil
	}

	env := NewEnv(
		&config.Config{
			DataDir: dataDir,
			Images:  testResetImages(),
		},
		ui.NewOutput(io.Discard, io.Discard, false),
		client,
	)
	err := env.Reset(context.Background())
	if err == nil {
		t.Fatal("Reset() error = nil, want non-nil")
	}
	if !errors.Is(err, errResetCleanupFailed) {
		t.Fatalf("Reset() error = %v, want errResetCleanupFailed", err)
	}
	if !strings.Contains(err.Error(), "permission denied") {
		t.Fatalf("Reset() error = %q, want helper log output", err)
	}
}

func TestRemoveResetDataPath_RejectsSymlink(t *testing.T) {
	if runtime.GOOS == osWindows {
		t.Skip("symlink creation requires elevated privileges on some Windows setups")
	}

	dataDir := t.TempDir()
	targetDir := t.TempDir()
	linkPath := filepath.Join(dataDir, workflowEngineDbDataDir)
	if err := os.Symlink(targetDir, linkPath); err != nil {
		t.Fatalf("Symlink() error = %v", err)
	}

	err := removeResetDataPath(dataDir, linkPath)
	if !errors.Is(err, errResetTargetSymlink) {
		t.Fatalf("removeResetDataPath() error = %v, want errResetTargetSymlink", err)
	}
}

func clientCalls(env *Env) []containermock.Call {
	client, ok := env.client.(*containermock.Client)
	if !ok {
		return nil
	}
	return client.Calls
}

func testResetImages() config.ImagesConfig {
	return config.ImagesConfig{
		Core: config.CoreImages{
			Localtest:        config.ImageSpec{Image: "ghcr.io/altinn/test-localtest", Tag: "latest"},
			PDF3:             config.ImageSpec{Image: "ghcr.io/altinn/test-pdf3", Tag: "latest"},
			WorkflowEngineDb: config.ImageSpec{Image: "postgres", Tag: "18"},
			WorkflowEngine:   config.ImageSpec{Image: "ghcr.io/altinn/test-workflow-engine", Tag: "latest"},
			PgAdmin:          config.ImageSpec{Image: "dpage/pgadmin4", Tag: "latest"},
		},
		Monitoring: config.MonitoringImages{
			Tempo:         config.ImageSpec{Image: "grafana/tempo", Tag: "latest"},
			Mimir:         config.ImageSpec{Image: "grafana/mimir", Tag: "latest"},
			Loki:          config.ImageSpec{Image: "grafana/loki", Tag: "latest"},
			OtelCollector: config.ImageSpec{Image: "otel/opentelemetry-collector-contrib", Tag: "latest"},
			Grafana:       config.ImageSpec{Image: "grafana/grafana", Tag: "latest"},
		},
	}
}

func createDir(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(path, 0o755); err != nil {
		t.Fatalf("MkdirAll(%q) error = %v", path, err)
	}
}

func assertNotExists(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("Stat(%q) error = %v, want not exists", path, err)
	}
}

func assertCallRecorded(t *testing.T, calls []containermock.Call, method string) {
	t.Helper()
	for _, call := range calls {
		if call.Method == method {
			return
		}
	}
	t.Fatalf("calls = %v, want method %q", calls, method)
}
