package localtest

import (
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"

	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

func TestCoreContainers_ServiceCallbacksUseLocaltestNetworkAlias(t *testing.T) {
	t.Setenv(config.EnvCI, "")

	dataDir := t.TempDir()
	resources := localtestResources(dataDir, false, true)

	assertLocaltestContainerConfig(t, mustContainerSpec(t, resources, components.ContainerLocaltest), dataDir)
	assertPdf3ContainerConfig(t, mustContainerSpec(t, resources, components.ContainerPDF3))
	assertWorkflowEngineDbContainerConfig(t, mustContainerSpec(t, resources, components.ContainerWorkflowEngineDb))
	assertWorkflowEngineContainerConfig(t, mustContainerSpec(t, resources, components.ContainerWorkflowEngine))
}

func assertLocaltestContainerConfig(t *testing.T, localtest components.ContainerSpec, dataDir string) {
	t.Helper()
	topology := testTopology()
	assertLocaltestCoreContainer(t, localtest, topology, dataDir)
}

func assertPdf3ContainerConfig(t *testing.T, pdf3 components.ContainerSpec) {
	t.Helper()
	wantPort := containertypes.PortMapping{
		HostPort:      "5300",
		ContainerPort: "5031",
		HostIP:        "127.0.0.1",
		Protocol:      "",
	}
	if got := pdf3.Ports; len(got) != 1 || got[0] != wantPort {
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

func assertWorkflowEngineDbContainerConfig(t *testing.T, workflowEngineDb components.ContainerSpec) {
	t.Helper()
	if got := workflowEngineDb.Ports; got != nil {
		t.Fatalf("workflowEngineDb.Ports = %v, want nil", got)
	}
	wantDbVolume := containertypes.VolumeMount{
		HostPath:      "localtest-workflow-engine-db-data",
		ContainerPath: "/var/lib/postgresql",
		ReadOnly:      false,
		Type:          containertypes.VolumeMountTypeVolume,
	}
	if !slices.Contains(workflowEngineDb.Volumes, wantDbVolume) {
		t.Fatalf("workflowEngineDb.Volumes missing named data volume: %v", workflowEngineDb.Volumes)
	}
	for _, volume := range workflowEngineDb.Volumes {
		if volume.ContainerPath == "/var/lib/postgresql" && volume.Type != containertypes.VolumeMountTypeVolume {
			t.Fatalf("workflowEngineDb data volume Type = %q, want named volume", volume.Type)
		}
	}
}

func assertWorkflowEngineContainerConfig(t *testing.T, workflowEngine components.ContainerSpec) {
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
	if !slices.Equal(
		workflowEngine.Dependencies,
		[]string{components.ContainerWorkflowEngineDb, components.ContainerLocaltest},
	) {
		t.Fatalf(
			"workflowEngine.Dependencies = %v, want [%s %s]",
			workflowEngine.Dependencies,
			components.ContainerWorkflowEngineDb,
			components.ContainerLocaltest,
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
			resources := localtestResources(t.TempDir(), false, tt.includePgAdmin)
			pgAdmin := findResource(resources, resource.ContainerID(components.ContainerPgAdmin))
			if pgAdmin == nil {
				t.Fatalf("manifest missing %q", components.ContainerPgAdmin)
			}
			if got := resource.IsEnabled(pgAdmin); got != tt.wantEnabled {
				t.Fatalf("pgAdmin enabled = %v, want %v", got, tt.wantEnabled)
			}
		})
	}
}

func TestResourceBuilder_LocaltestAliasesDoNotChangeWithPgAdmin(t *testing.T) {
	t.Setenv(config.EnvCI, "")

	withoutPgAdmin := localtestResources(t.TempDir(), false, false)
	withPgAdmin := localtestResources(t.TempDir(), false, true)

	without := findResource(withoutPgAdmin, resource.ContainerID(components.ContainerLocaltest))
	with := findResource(withPgAdmin, resource.ContainerID(components.ContainerLocaltest))
	if without == nil || with == nil {
		t.Fatalf("manifest missing %q", components.ContainerLocaltest)
	}
	if !slices.Equal(without.NetworkAliases, with.NetworkAliases) {
		t.Fatalf(
			"localtest aliases changed with pgadmin: without=%v with=%v",
			without.NetworkAliases,
			with.NetworkAliases,
		)
	}
}

func TestMonitoringContainers_OtelUsesLocalDomainAlias(t *testing.T) {
	resources := localtestResources(t.TempDir(), true)
	container := mustContainerSpec(t, resources, components.ContainerMonitoringOtelCollector)

	want := []string{testTopology().OTelHost()}
	if got := container.NetworkAliases; !slices.Equal(got, want) {
		t.Fatalf("otel.NetworkAliases = %v, want %v", got, want)
	}
}

func TestResourceBuilder_FailsForUnknownContainerDependency(t *testing.T) {
	t.Setenv(config.EnvCI, "true")

	image := &resource.RemoteImage{Ref: "example.local/dependent:latest"}
	network := resource.Ref(&resource.Network{Name: components.NetworkName})
	containerResource := &resource.Container{
		Name:      "localtest-dependent",
		Image:     resource.Ref(image),
		Networks:  []resource.ResourceRef{network},
		DependsOn: []resource.ResourceRef{resource.RefID(resource.ContainerID("missing-container"))},
	}

	graph := resource.NewGraph(resource.GraphID(graphID))
	if err := graph.Add(&resource.Network{Name: components.NetworkName}); err != nil {
		t.Fatalf("graph.Add(network) error = %v", err)
	}
	if err := graph.Add(image); err != nil {
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
	opts := newResourceBuildOptions(dataDir, false, true)
	resources := components.NewManifest(opts).Resources
	pgAdmin := mustContainerSpec(t, resources, components.ContainerPgAdmin)
	if got := pgAdmin.Ports; got != nil {
		t.Fatalf("pgAdmin.Ports = %v, want nil", got)
	}
	if got := pgAdmin.Environment["PGPASS_FILE"]; got != components.PgAdminConnectionSource {
		t.Fatalf("pgAdmin.Environment[PGPASS_FILE] = %q, want %q", got, components.PgAdminConnectionSource)
	}
	if _, ok := pgAdmin.Environment["PGPASSWORD"]; ok {
		t.Fatalf("pgAdmin.Environment unexpectedly contains PGPASSWORD")
	}
	hasPgpassMount := false
	for _, volume := range pgAdmin.Volumes {
		if volume.HostPath == components.WorkflowEngineInfraFilePath(opts.Paths.InfraDir, "pgpass") &&
			volume.ContainerPath == components.PgAdminConnectionSource &&
			volume.ReadOnly {
			hasPgpassMount = true
			break
		}
	}
	if !hasPgpassMount {
		t.Fatalf("pgAdmin.Volumes missing read-only pgpass mount: %v", pgAdmin.Volumes)
	}
}

func TestManifestPrepareWritesLocalFiles(t *testing.T) {
	dataDir := t.TempDir()
	opts := newResourceBuildOptions(dataDir, false, true)
	manifest := components.NewManifest(opts)

	if err := manifest.Prepare(t.Context()); err != nil {
		t.Fatalf("Prepare() error = %v", err)
	}

	storagePath := filepath.Join(dataDir, "AltinnPlatformLocal")
	storageInfo, err := os.Stat(storagePath)
	if err != nil {
		t.Fatalf("stat localtest storage directory: %v", err)
	}
	if !storageInfo.IsDir() {
		t.Fatalf("localtest storage path is not a directory: %s", storagePath)
	}

	path := components.WorkflowEngineInfraFilePath(opts.Paths.InfraDir, "pgpass")
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
	if runtime.GOOS != osutil.OSWindows && info.Mode().Perm() != osutil.FilePermDefault {
		got := info.Mode().Perm()
		t.Fatalf("pgpass mode = %v, want %v", got, osutil.FilePermDefault)
	}
}

func newResourceBuildOptions(dataDir string, includeMonitoring bool, includePgAdmin ...bool) *components.Options {
	pgAdmin := false
	if len(includePgAdmin) > 0 {
		pgAdmin = includePgAdmin[0]
	}
	return &components.Options{
		Paths:             components.NewPaths(dataDir),
		Topology:          testTopology(),
		IncludeMonitoring: includeMonitoring,
		IncludePgAdmin:    pgAdmin,
	}
}

func localtestResources(dataDir string, includeMonitoring bool, includePgAdmin ...bool) []resource.Resource {
	return components.NewManifest(newResourceBuildOptions(dataDir, includeMonitoring, includePgAdmin...)).Resources
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

func assertLocaltestCoreContainer(
	t *testing.T,
	spec components.ContainerSpec,
	topology envtopology.Local,
	dataDir string,
) {
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

	wantMount := containertypes.VolumeMount{
		HostPath:      envtopology.BoundTopologyHostDir(dataDir),
		ContainerPath: envtopology.BoundTopologyContainerDir,
		ReadOnly:      true,
		Type:          containertypes.VolumeMountTypeBind,
	}
	if !slices.Contains(spec.Volumes, wantMount) {
		t.Fatalf("localtest.Volumes missing bound topology config mount: %v", spec.Volumes)
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

func mustContainerSpec(t *testing.T, resources []resource.Resource, name string) components.ContainerSpec {
	t.Helper()
	container := findResource(resources, resource.ContainerID(name))
	if container == nil {
		t.Fatalf("manifest missing %q", name)
	}
	return components.ContainerSpec{
		HealthCheck:    container.HealthCheck,
		Name:           container.Name,
		Ports:          container.Ports,
		Environment:    envMap(container.Env),
		Volumes:        container.Volumes,
		ExtraHosts:     container.ExtraHosts,
		NetworkAliases: container.NetworkAliases,
		Dependencies:   dependencyNames(container.DependsOn),
		Command:        container.Command,
		UseDefaultUser: false,
	}
}

func envMap(env []string) map[string]string {
	result := make(map[string]string, len(env))
	for _, entry := range env {
		key, value, ok := strings.Cut(entry, "=")
		if !ok {
			continue
		}
		result[key] = value
	}
	return result
}

func dependencyNames(deps []resource.ResourceRef) []string {
	if len(deps) == 0 {
		return nil
	}
	names := make([]string, 0, len(deps))
	for _, dep := range deps {
		id := dep.ID().String()
		name, ok := strings.CutPrefix(id, "container:")
		if !ok {
			continue
		}
		names = append(names, name)
	}
	return names
}
