package localtest

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"

	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

const testWindowsGOOS = "windows"

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

	t.Run("valid pgadmin layout when requested", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		createCoreLayout(t, dataDir)
		createPgAdminLayout(t, dataDir)

		err := ValidateResourceHostPaths(newResourceBuildOptions(dataDir, false, true))
		if err != nil {
			t.Fatalf("ValidateResourceHostPaths() error = %v, want nil", err)
		}
	})

	t.Run("missing pgadmin config when requested", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		createCoreLayout(t, dataDir)

		err := ValidateResourceHostPaths(newResourceBuildOptions(dataDir, false, true))
		if !errors.Is(err, ErrInvalidResourceLayout) {
			t.Fatalf("ValidateResourceHostPaths() error = %v, want ErrInvalidResourceLayout", err)
		}
		if !strings.Contains(err.Error(), filepath.Join(dataDir, "infra", "workflow-engine", "pgadmin-servers.json")) {
			t.Fatalf("error %q does not contain missing pgadmin path", err.Error())
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

func TestCoreContainers_ServiceCallbacksUseLocaltestNetworkAlias(t *testing.T) {
	t.Setenv(config.EnvCI, "")

	dataDir := t.TempDir()
	containers := coreContainers(dataDir, testTopology(), false, true)
	assertCoreContainerLayout(t, containers)
	assertLocaltestContainerConfig(t, containers[0], dataDir)
	assertPdf3ContainerConfig(t, containers[1])
	assertWorkflowEngineDbContainerConfig(t, containers[2])
	assertWorkflowEngineContainerConfig(t, containers[3])
}

func assertCoreContainerLayout(t *testing.T, containers []ContainerSpec) {
	t.Helper()
	if len(containers) != len(coreContainerNames(true)) {
		t.Fatalf("coreContainers() len = %d, want %d", len(containers), len(coreContainerNames(true)))
	}

	if got := []string{containers[2].Name, containers[3].Name, containers[4].Name}; !slices.Equal(
		got,
		[]string{ContainerWorkflowEngineDb, ContainerWorkflowEngine, ContainerPgAdmin},
	) {
		t.Fatalf("added core container names = %v, want localtest-prefixed names", got)
	}
}

func assertLocaltestContainerConfig(t *testing.T, localtest ContainerSpec, dataDir string) {
	t.Helper()
	topology := testTopology()
	assertLocaltestCoreContainer(t, localtest, topology, dataDir)
}

func assertPdf3ContainerConfig(t *testing.T, pdf3 ContainerSpec) {
	t.Helper()
	if got := pdf3.Ports; len(got) != 1 || got[0] != newPort("5300", "5031") {
		t.Fatalf("pdf3.Ports = %v, want [5300:5031]", got)
	}
	for _, host := range pdf3.ExtraHosts {
		if strings.HasPrefix(host, "local.altinn.cloud:") {
			t.Fatalf("pdf3.ExtraHosts unexpectedly contains local.altinn.cloud host override: %v", pdf3.ExtraHosts)
		}
	}

	if got := pdf3.Environment["PDF3_LOCALTEST_PUBLIC_BASE_URL"]; got != "http://local.altinn.cloud:8000" {
		t.Fatalf(
			"pdf3.Environment[PDF3_LOCALTEST_PUBLIC_BASE_URL] = %q, want %q",
			got,
			"http://local.altinn.cloud:8000",
		)
	}
}

func assertWorkflowEngineDbContainerConfig(t *testing.T, workflowEngineDb ContainerSpec) {
	t.Helper()
	if got := workflowEngineDb.Ports; got != nil {
		t.Fatalf("workflowEngineDb.Ports = %v, want nil", got)
	}
	wantDbVolume := newNamedVolume(workflowEngineDbVolume, "/var/lib/postgresql")
	if !slices.Contains(workflowEngineDb.Volumes, wantDbVolume) {
		t.Fatalf("workflowEngineDb.Volumes missing named data volume: %v", workflowEngineDb.Volumes)
	}
	for _, volume := range workflowEngineDb.Volumes {
		if volume.ContainerPath == "/var/lib/postgresql" && volume.Type != containertypes.VolumeMountTypeVolume {
			t.Fatalf("workflowEngineDb data volume Type = %q, want named volume", volume.Type)
		}
	}
}

func assertWorkflowEngineContainerConfig(t *testing.T, workflowEngine ContainerSpec) {
	t.Helper()
	if got := workflowEngine.Ports; got != nil {
		t.Fatalf("workflowEngine.Ports = %v, want nil", got)
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
	if got := workflowEngine.Environment["AppCommandSettings__CommandEndpoint"]; got != "http://local.altinn.cloud:8000/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks/" {
		t.Fatalf(
			"workflowEngine.Environment[AppCommandSettings__CommandEndpoint] = %q, want localtest network callback URL",
			got,
		)
	}
}

func TestResourceBuilder_AddsPgAdminOnlyWhenRequested(t *testing.T) {
	t.Setenv(config.EnvCI, "")

	tests := map[string]struct {
		includePgAdmin bool
		wantEnabled    bool
	}{
		"default": {
			includePgAdmin: false,
			wantEnabled:    false,
		},
		"requested": {
			includePgAdmin: true,
			wantEnabled:    true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			resources := buildResources(newResourceBuildOptions(t.TempDir(), false, tt.includePgAdmin))
			pgAdmin := findResource(resources, resource.ContainerID(ContainerPgAdmin))
			if pgAdmin == nil {
				t.Fatalf("buildResources() missing %q", ContainerPgAdmin)
			}
			if got := resource.IsEnabled(pgAdmin); got != tt.wantEnabled {
				t.Fatalf("pgAdmin enabled = %v, want %v", got, tt.wantEnabled)
			}
		})
	}
}

func TestMonitoringContainers_OtelUsesLocalDomainAlias(t *testing.T) {
	containers := monitoringContainers(t.TempDir(), testTopology())

	index := slices.IndexFunc(containers, func(spec ContainerSpec) bool {
		return spec.Name == ContainerMonitoringOtelCollector
	})
	if index < 0 {
		t.Fatalf("monitoringContainers() missing %q", ContainerMonitoringOtelCollector)
	}

	want := []string{testTopology().OTelHost()}
	if got := containers[index].NetworkAliases; !slices.Equal(got, want) {
		t.Fatalf("otel.NetworkAliases = %v, want %v", got, want)
	}
}

func TestResourceBuilder_FailsForUnknownContainerDependency(t *testing.T) {
	t.Setenv(config.EnvCI, "true")

	specs := []ContainerSpec{
		newContainerSpec(
			"localtest-dependent",
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
		nil,
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
	containers := coreContainers(dataDir, testTopology(), false, true)

	index := slices.IndexFunc(containers, func(spec ContainerSpec) bool {
		return spec.Name == ContainerPgAdmin
	})
	if index < 0 {
		t.Fatalf("coreContainers() missing %q", ContainerPgAdmin)
	}

	pgAdmin := containers[index]
	if got := pgAdmin.Ports; got != nil {
		t.Fatalf("pgAdmin.Ports = %v, want nil", got)
	}
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
	if runtime.GOOS != testWindowsGOOS && info.Mode().Perm() != osutil.FilePermDefault {
		got := info.Mode().Perm()
		t.Fatalf("pgpass mode = %v, want %v", got, osutil.FilePermDefault)
	}
}

func newResourceBuildOptions(dataDir string, includeMonitoring bool, includePgAdmin ...bool) ResourceBuildOptions {
	pgAdmin := false
	if len(includePgAdmin) > 0 {
		pgAdmin = includePgAdmin[0]
	}
	return ResourceBuildOptions{
		DataDir:           dataDir,
		RuntimeConfig:     RuntimeConfig{},
		Topology:          testTopology(),
		IncludeMonitoring: includeMonitoring,
		IncludePgAdmin:    pgAdmin,
	}
}

func testTopology() envtopology.Local {
	return envtopology.NewLocal("8000")
}

func assertEnvValue(t *testing.T, env map[string]string, key, want string) {
	t.Helper()
	if got := env[key]; got != want {
		t.Fatalf("env[%s] = %q, want %q", key, got, want)
	}
}

func assertEnvMissing(t *testing.T, env map[string]string, key string) {
	t.Helper()
	if got, ok := env[key]; ok {
		t.Fatalf("env[%s] unexpectedly present with value %q", key, got)
	}
}

func assertLocaltestCoreContainer(t *testing.T, spec ContainerSpec, topology envtopology.Local, dataDir string) {
	t.Helper()

	wantAliases := topology.LocaltestIngressHosts()
	if got := spec.NetworkAliases; !slices.Equal(got, wantAliases) {
		t.Fatalf("localtest.NetworkAliases = %v, want %v", got, wantAliases)
	}

	assertEnvValue(t, spec.Environment, "ASPNETCORE_URLS", "http://*:5101/;http://*:8000/")
	assertEnvValue(t, spec.Environment, "DOTNET_ENVIRONMENT", "Development")
	assertEnvValue(
		t,
		spec.Environment,
		envtopology.BoundTopologyOptionsBaseConfigPathEnv,
		envtopology.BoundTopologyBaseConfigContainerPath,
	)
	assertEnvValue(
		t,
		spec.Environment,
		envtopology.BoundTopologyOptionsConfigPathEnv,
		envtopology.BoundTopologyConfigContainerPath,
	)
	assertEnvMissing(t, spec.Environment, "LocalPlatformSettings__LocalGrafanaUrl")

	wantMount := newReadOnlyVolume(
		envtopology.BoundTopologyHostDir(dataDir),
		envtopology.BoundTopologyContainerDir,
	)
	if !slices.Contains(spec.Volumes, wantMount) {
		t.Fatalf("localtest.Volumes missing bound topology config mount: %v", spec.Volumes)
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

	for _, file := range []string{
		"postgres-init.sql",
	} {
		path := filepath.Join(dataDir, "infra", "workflow-engine", file)
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatalf("write %q: %v", path, err)
		}
	}

	path := envtopology.BoundTopologyHostPath(dataDir)
	if err := os.MkdirAll(envtopology.BoundTopologyHostDir(dataDir), 0o755); err != nil {
		t.Fatalf("create directory %q: %v", envtopology.BoundTopologyHostDir(dataDir), err)
	}
	if err := os.WriteFile(path, []byte("{}\n"), 0o644); err != nil {
		t.Fatalf("write %q: %v", path, err)
	}
}

func createPgAdminLayout(t *testing.T, dataDir string) {
	t.Helper()
	for _, file := range []string{
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

func findResource(resources []resource.Resource, id resource.ResourceID) *resource.Container {
	for _, res := range resources {
		if res.ID() == id {
			containerResource, ok := res.(*resource.Container)
			if !ok {
				return nil
			}
			return containerResource
		}
	}
	return nil
}
