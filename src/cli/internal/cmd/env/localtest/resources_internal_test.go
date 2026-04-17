package localtest

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
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

func TestCoreContainers_ServiceCallbacksUseLocaltestNetworkAlias(t *testing.T) {
	t.Setenv(config.EnvCI, "")

	containers := coreContainers(t.TempDir(), RuntimeConfig{
		HostGateway:      "10.88.0.1",
		LoadBalancerPort: "8000",
		LocalAppURL:      "http://host.docker.internal:5005",
		Platform:         container.PlatformPodman,
	})

	if len(containers) != len(coreContainerNames()) {
		t.Fatalf("coreContainers() len = %d, want %d", len(containers), len(coreContainerNames()))
	}

	if got := []string{containers[2].Name, containers[3].Name, containers[4].Name}; !slices.Equal(
		got,
		[]string{ContainerWorkflowEngineDb, ContainerWorkflowEngine, ContainerPgAdmin},
	) {
		t.Fatalf("added core container names = %v, want localtest-prefixed names", got)
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

	workflowEngine := containers[3]
	wantPorts := []struct {
		hostPort      string
		containerPort string
	}{
		{hostPort: "9080", containerPort: "8080"},
		{hostPort: "9081", containerPort: "8081"},
	}
	gotPorts := make([]struct {
		hostPort      string
		containerPort string
	}, 0, len(workflowEngine.Ports))
	for _, port := range workflowEngine.Ports {
		gotPorts = append(gotPorts, struct {
			hostPort      string
			containerPort string
		}{
			hostPort:      port.HostPort,
			containerPort: port.ContainerPort,
		})
	}
	if !slices.Equal(gotPorts, wantPorts) {
		t.Fatalf("workflowEngine.Ports = %v, want %v", gotPorts, wantPorts)
	}
	if got := workflowEngine.ExtraHosts; got != nil {
		t.Fatalf("workflowEngine.ExtraHosts = %v, want nil", got)
	}
	if got := workflowEngine.Environment["ConnectionStrings__WorkflowEngine"]; !strings.Contains(
		got,
		"Host=localtest-workflow-engine-db;",
	) {
		t.Fatalf(
			"workflowEngine.Environment[ConnectionStrings__WorkflowEngine] = %q, want localtest-workflow-engine-db host",
			got,
		)
	}
	if !slices.Equal(workflowEngine.Dependencies, []string{ContainerWorkflowEngineDb, ContainerLocaltest}) {
		t.Fatalf(
			"workflowEngine.Dependencies = %v, want [%s %s]",
			workflowEngine.Dependencies,
			ContainerWorkflowEngineDb,
			ContainerLocaltest,
		)
	}
	if got := workflowEngine.Environment["AppCommandSettings__CommandEndpoint"]; got != "http://local.altinn.cloud:5101/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks/" {
		t.Fatalf(
			"workflowEngine.Environment[AppCommandSettings__CommandEndpoint] = %q, want localtest network callback URL",
			got,
		)
	}
}

func TestCoreContainers_SkipsPgAdminInCI(t *testing.T) {
	t.Setenv(config.EnvCI, "true")

	containers := coreContainers(t.TempDir(), RuntimeConfig{
		HostGateway:      "10.88.0.1",
		LoadBalancerPort: "8000",
		LocalAppURL:      "http://host.docker.internal:5005",
		Platform:         container.PlatformPodman,
	})

	if slices.Contains(coreContainerNames(), ContainerPgAdmin) {
		t.Fatalf("coreContainerNames() contains %q in CI", ContainerPgAdmin)
	}
	if slices.ContainsFunc(containers, func(spec ContainerSpec) bool {
		return spec.Name == ContainerPgAdmin
	}) {
		t.Fatalf("coreContainers() contains %q in CI", ContainerPgAdmin)
	}
}

func TestBuildResources_FailsForUnknownContainerDependency(t *testing.T) {
	t.Setenv(config.EnvCI, "true")

	specs := []ContainerSpec{
		newContainerSpec(
			"localtest-dependent",
			nil,
			nil,
			nil,
			nil,
			nil,
			[]string{"missing-container"},
			nil,
		),
	}
	images := map[string]resource.ImageResource{
		"localtest-dependent": &resource.RemoteImage{Ref: "example.local/dependent:latest"},
	}
	network := resource.Ref(&resource.Network{Name: NetworkName})

	containerResource := newContainerResource(
		&specs[0],
		images["localtest-dependent"],
		network,
		nil,
		"",
		containerModeApply,
	)

	graph := resource.NewGraph()
	if err := graph.Add(&resource.Network{Name: NetworkName}); err != nil {
		t.Fatalf("graph.Add(network) error = %v", err)
	}
	if err := graph.Add(images["localtest-dependent"]); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}
	if err := graph.Add(containerResource); err != nil {
		t.Fatalf("graph.Add(container) error = %v", err)
	}

	if err := graph.Validate(); err == nil {
		t.Fatalf("graph.Validate() error = nil, want missing dependency error")
	}
}

func TestCoreContainers_PgAdminUsesImportedPassfile(t *testing.T) {
	t.Setenv(config.EnvCI, "")

	dataDir := t.TempDir()
	containers := coreContainers(dataDir, RuntimeConfig{
		HostGateway:      "10.88.0.1",
		LoadBalancerPort: "8000",
		LocalAppURL:      "http://host.docker.internal:5005",
		Platform:         container.PlatformPodman,
	})

	index := slices.IndexFunc(containers, func(spec ContainerSpec) bool {
		return spec.Name == ContainerPgAdmin
	})
	if index < 0 {
		t.Fatalf("coreContainers() missing %q", ContainerPgAdmin)
	}

	pgAdmin := containers[index]
	if got := pgAdmin.Environment["PGPASS_FILE"]; got != pgAdminConnectionSource {
		t.Fatalf("pgAdmin.Environment[PGPASS_FILE] = %q, want %q", got, pgAdminConnectionSource)
	}
	if _, ok := pgAdmin.Environment["PGPASSWORD"]; ok {
		t.Fatalf("pgAdmin.Environment unexpectedly contains PGPASSWORD")
	}
	hasPgpassMount := false
	for _, volume := range pgAdmin.Volumes {
		if volume.HostPath == workflowEngineInfraFilePath(dataDir, "pgpass") &&
			volume.ContainerPath == pgAdminConnectionSource &&
			volume.ReadOnly {
			hasPgpassMount = true
			break
		}
	}
	if !hasPgpassMount {
		t.Fatalf("pgAdmin.Volumes missing read-only pgpass mount: %v", pgAdmin.Volumes)
	}
}

func TestEnsurePgpassWritesReadableSourceFile(t *testing.T) {
	dataDir := t.TempDir()

	if err := ensurePgpass(dataDir); err != nil {
		t.Fatalf("ensurePgpass() error = %v", err)
	}

	path := workflowEngineInfraFilePath(dataDir, "pgpass")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read pgpass: %v", err)
	}
	want := "localtest-workflow-engine-db:5432:*:postgres:postgres\n"
	if string(content) != want {
		t.Fatalf("pgpass content = %q, want %q", string(content), want)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat pgpass: %v", err)
	}
	if runtime.GOOS != "windows" && info.Mode().Perm() != osutil.FilePermDefault {
		got := info.Mode().Perm()
		t.Fatalf("pgpass mode = %v, want %v", got, osutil.FilePermDefault)
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
		filepath.Join(dataDir, "infra"),
		filepath.Join(dataDir, "infra", "workflow-engine"),
	} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatalf("create directory %q: %v", dir, err)
		}
	}

	// Infrastructure config files needed by core containers
	for _, file := range []string{
		"postgres-init.sql",
		"pgadmin-servers.json",
		"pgpass",
	} {
		path := filepath.Join(dataDir, "infra", "workflow-engine", file)
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatalf("write %q: %v", path, err)
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
