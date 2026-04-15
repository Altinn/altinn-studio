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

func TestCoreContainers_ColimaUsesDockerConfigFlavor(t *testing.T) {
	t.Parallel()

	containers := coreContainers(t.TempDir(), RuntimeConfig{
		HostGateway:      "127.0.0.1",
		LoadBalancerPort: "8000",
		LocalAppURL:      "http://host.docker.internal:5005",
		Platform:         container.PlatformColima,
	})

	if got := containers[0].Environment["DOTNET_ENVIRONMENT"]; got != "Docker" {
		t.Fatalf("DOTNET_ENVIRONMENT = %q, want %q", got, "Docker")
	}
}

func TestCoreContainers_LocaltestUsesNetworkAliasAndPdf3AvoidsHostOverride(t *testing.T) {
	t.Parallel()

	containers := coreContainers(t.TempDir(), RuntimeConfig{
		HostGateway:      "10.88.0.1",
		LoadBalancerPort: "8000",
		LocalAppURL:      "http://host.docker.internal:5005",
		Platform:         container.PlatformPodman,
	})

	if len(containers) != 2 {
		t.Fatalf("coreContainers() len = %d, want 2", len(containers))
	}

	localtest := containers[0]
	if got := localtest.NetworkAliases; len(got) != 1 || got[0] != "local.altinn.cloud" {
		t.Fatalf("localtest.NetworkAliases = %v, want [local.altinn.cloud]", got)
	}

	pdf3 := containers[1]
	for _, host := range pdf3.ExtraHosts {
		if strings.HasPrefix(host, "local.altinn.cloud:") {
			t.Fatalf("pdf3.ExtraHosts unexpectedly contains local.altinn.cloud host override: %v", pdf3.ExtraHosts)
		}
	}

	if got := pdf3.Environment["PDF3_LOCALTEST_PUBLIC_BASE_URL"]; got != "http://local.altinn.cloud:5101" {
		t.Fatalf(
			"pdf3.Environment[PDF3_LOCALTEST_PUBLIC_BASE_URL] = %q, want %q",
			got,
			"http://local.altinn.cloud:5101",
		)
	}
}

func TestLocaltestEnvironment(t *testing.T) {
	tests := map[container.ContainerPlatform]string{
		container.PlatformDocker:  "Docker",
		container.PlatformColima:  "Docker",
		container.PlatformPodman:  "Podman",
		container.PlatformUnknown: "Unknown",
	}

	for platform, want := range tests {
		if got := localtestEnvironment(platform); got != want {
			t.Fatalf("localtestEnvironment(%v) = %q, want %q", platform, got, want)
		}
	}
}

func newResourceBuildOptions(dataDir string, includeMonitoring bool) ResourceBuildOptions {
	return ResourceBuildOptions{
		DataDir: dataDir,
		RuntimeConfig: RuntimeConfig{
			HostGateway:      "127.0.0.1",
			LoadBalancerPort: "8000",
			LocalAppURL:      "http://host.docker.internal:5005",
			Platform:         container.PlatformDocker,
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
