package localtest

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
)

func TestValidateResourceHostPaths(t *testing.T) {
	t.Parallel()

	t.Run("valid core layout", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		createCoreLayout(t, dataDir)

		err := ValidateResourceHostPaths(newResourceBuildOptions(dataDir, false))
		if err != nil {
			t.Fatalf("ValidateResourceHostPaths() error = %v, want nil", err)
		}
	})

	t.Run("missing monitoring config file", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		createCoreLayout(t, dataDir)
		createMonitoringLayout(t, dataDir)
		if err := os.Remove(filepath.Join(dataDir, "infra", "tempo.yaml")); err != nil {
			t.Fatalf("remove file: %v", err)
		}

		err := ValidateResourceHostPaths(newResourceBuildOptions(dataDir, true))
		if !errors.Is(err, ErrInvalidResourceLayout) {
			t.Fatalf("ValidateResourceHostPaths() error = %v, want ErrInvalidResourceLayout", err)
		}
		if !strings.Contains(err.Error(), filepath.Join(dataDir, "infra", "tempo.yaml")) {
			t.Fatalf("error %q does not contain missing path", err.Error())
		}
	})

	t.Run("wrong type for monitoring file", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		createCoreLayout(t, dataDir)
		createMonitoringLayout(t, dataDir)
		target := filepath.Join(dataDir, "infra", "mimir.yaml")
		if err := os.Remove(target); err != nil {
			t.Fatalf("remove file: %v", err)
		}
		if err := os.MkdirAll(target, 0o755); err != nil {
			t.Fatalf("create wrong-type directory: %v", err)
		}

		err := ValidateResourceHostPaths(newResourceBuildOptions(dataDir, true))
		if !errors.Is(err, ErrInvalidResourceLayout) {
			t.Fatalf("ValidateResourceHostPaths() error = %v, want ErrInvalidResourceLayout", err)
		}
		if !strings.Contains(err.Error(), "expected file") {
			t.Fatalf("error %q does not contain expected type mismatch", err.Error())
		}
	})
}

func newResourceBuildOptions(dataDir string, includeMonitoring bool) ResourceBuildOptions {
	return ResourceBuildOptions{
		DataDir: dataDir,
		RuntimeConfig: RuntimeConfig{
			HostGateway:      "127.0.0.1",
			LoadBalancerPort: "8000",
			Installation:     container.InstallationDocker,
		},
		IncludeMonitoring: includeMonitoring,
	}
}

func createCoreLayout(t *testing.T, dataDir string) {
	t.Helper()
	for _, dir := range []string{
		filepath.Join(dataDir, "testdata"),
		filepath.Join(dataDir, "AltinnPlatformLocal"),
	} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatalf("create directory %q: %v", dir, err)
		}
	}
}

func createMonitoringLayout(t *testing.T, dataDir string) {
	t.Helper()
	infraDir := filepath.Join(dataDir, "infra")
	if err := os.MkdirAll(infraDir, 0o755); err != nil {
		t.Fatalf("create infra directory: %v", err)
	}

	for _, file := range []string{
		"tempo.yaml",
		"mimir.yaml",
		"loki.yaml",
		"otel-collector.yaml",
		"grafana-datasources.yaml",
		"grafana-dashboards.yaml",
	} {
		path := filepath.Join(infraDir, file)
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatalf("write %q: %v", path, err)
		}
	}

	if err := os.MkdirAll(filepath.Join(infraDir, "grafana-dashboards"), 0o755); err != nil {
		t.Fatalf("create grafana dashboards directory: %v", err)
	}
}
