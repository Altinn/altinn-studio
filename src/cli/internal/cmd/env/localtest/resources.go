// Package localtest provides localtest resource definitions.
package localtest

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
)

const (
	// LabelKey is the label used to identify studioctl-managed resources.
	LabelKey = "altinn.studio/cli"

	// LabelValue is the value for the localtest runtime.
	LabelValue = "localtest"

	// NetworkName is the name of the localtest network.
	NetworkName = "altinntestlocal_network"

	devImageTagLocaltest      = "localtest:dev"
	devImageTagPDF3           = "localtest-pdf3:dev"
	devImageTagWorkflowEngine = "localtest-workflow-engine:dev"
	buildCacheRefLocaltest    = "ghcr.io/altinn/altinn-studio/localtest-main-cache:latest"
	buildCacheRefPDF3         = "ghcr.io/altinn/altinn-studio/localtest-pdf3-cache:latest"
	infraDir                  = "infra"
	workflowEngineInfraDir    = "workflow-engine"
	workflowEngineDbDataDir   = "workflow-engine-db"
	localtestServicePort      = "5101"

	postgresHealthInterval    = 10 * time.Second
	postgresHealthTimeout     = 5 * time.Second
	postgresHealthRetries     = 5
	postgresHealthStartPeriod = 5 * time.Second

	postgresUser            = "postgres"
	postgresPassword        = "postgres"
	postgresDB              = "postgres"
	postgresPort            = "5432"
	workflowEngineDB        = "workflow_engine"
	pgAdminEmail            = "admin@altinn.no"
	pgAdminPassword         = "admin123"
	pgAdminContainerPort    = "80"
	pgAdminConnectionSource = "/pgadmin4/connection-source.conf"
)

// ErrInvalidResourceLayout is returned when required host paths are missing or have wrong type.
var ErrInvalidResourceLayout = errors.New("invalid localtest resource layout")

// RuntimeConfig holds runtime-specific configuration for localtest.
type RuntimeConfig struct {
	User string // "uid:gid" to run containers as (prevents root-owned bind mount files)
}

// ContainerSpec defines a container to run.
type ContainerSpec struct {
	HealthCheck    *types.HealthCheck
	Name           string
	Ports          []types.PortMapping
	Environment    map[string]string
	Volumes        []types.VolumeMount
	ExtraHosts     []string
	NetworkAliases []string
	Dependencies   []string
	Command        []string
	UseDefaultUser bool // When true, ignore host user override and use the image's default user
}

// ContainerStatus describes one localtest container.
type ContainerStatus struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

// Status is the localtest-specific runtime status payload.
type Status struct {
	Containers []ContainerStatus `json:"containers"`
	Running    bool              `json:"running"`
	AnyRunning bool              `json:"anyRunning"`
}

func newPort(hostPort, containerPort string) types.PortMapping {
	return types.PortMapping{
		HostPort:      hostPort,
		ContainerPort: containerPort,
		HostIP:        "127.0.0.1",
		Protocol:      "",
	}
}

func newVolume(hostPath, containerPath string) types.VolumeMount {
	return types.VolumeMount{
		HostPath:      hostPath,
		ContainerPath: containerPath,
		ReadOnly:      false,
	}
}

func newReadOnlyVolume(hostPath, containerPath string) types.VolumeMount {
	return types.VolumeMount{
		HostPath:      hostPath,
		ContainerPath: containerPath,
		ReadOnly:      true,
	}
}

func newContainerSpec(
	name string,
	ports []types.PortMapping,
	env map[string]string,
	volumes []types.VolumeMount,
	networkAliases, deps, cmd []string,
) ContainerSpec {
	return ContainerSpec{
		HealthCheck:    nil,
		Name:           name,
		Ports:          ports,
		Environment:    env,
		Volumes:        volumes,
		ExtraHosts:     nil,
		NetworkAliases: networkAliases,
		Dependencies:   deps,
		Command:        cmd,
		UseDefaultUser: false,
	}
}

func newStatus() Status {
	return Status{
		Containers: []ContainerStatus{},
		Running:    false,
		AnyRunning: false,
	}
}

func newContainerStatus(name, status string) ContainerStatus {
	return ContainerStatus{
		Name:   name,
		Status: status,
	}
}

func localtestListenURLs(loadBalancerPort string) string {
	if loadBalancerPort == localtestServicePort {
		return "http://*:" + localtestServicePort + "/"
	}
	return "http://*:" + localtestServicePort + "/;http://*:" + loadBalancerPort + "/"
}

func coreContainers(dataDir string, topology envtopology.Local, includePgAdmin bool) []ContainerSpec {
	ingressPort := topology.IngressPort()

	containers := []ContainerSpec{
		newContainerSpec(
			ContainerLocaltest,
			[]types.PortMapping{
				newPort(ingressPort, localtestServicePort), // Main port
				// TODO: internal port below is kept to keep compatibility with "dotnet run" apps,
				// as PlatformSettings default values is what is used when users do "dotnet run --project App"
				// and similar. We only use the topology ingress port when running through "studioctl [app] run"
				// Whenever we are comfortable completely relying on studioctl run or v8 is completely unsupported
				// we can remove this port mapping
				newPort(localtestServicePort, localtestServicePort), // Internal port
			},
			map[string]string{
				"ASPNETCORE_URLS":                                       localtestListenURLs(ingressPort),
				"DOTNET_ENVIRONMENT":                                    "Development",
				"GeneralSettings__BaseUrl":                              topology.LocaltestBaseURL(),
				"GeneralSettings__HostName":                             topology.AppHostName(),
				"LocalPlatformSettings__LocalAppMode":                   "http",
				"LocalPlatformSettings__LocalAppUrl":                    "",
				"LocalPlatformSettings__LocalTestingStorageBasePath":    "/AltinnPlatformLocal/",
				"LocalPlatformSettings__LocalTestingStaticTestDataPath": "/testdata/",
				"LocalPlatformSettings__LocalGrafanaUrl":                "http://monitoring_grafana:3000",
				"LocalPlatformSettings__LocalPdfServiceUrl":             "http://" + ContainerPDF3 + ":5031",
				"LocalPlatformSettings__LocalWorkflowEngineUrl":         "http://" + ContainerWorkflowEngine + ":8080",
				"LocalPlatformSettings__LocalPgAdminUrl":                "http://" + ContainerPgAdmin + ":80",
			},
			[]types.VolumeMount{
				newVolume(filepath.Join(dataDir, "testdata"), "/testdata"),
				newVolume(filepath.Join(dataDir, "AltinnPlatformLocal"), "/AltinnPlatformLocal"),
			},
			topology.LocaltestIngressHosts(),
			nil,
			nil,
		),
		newContainerSpec(
			ContainerPDF3,
			// TODO: same as above, we only need host port mapping here because old
			[]types.PortMapping{newPort("5300", "5031")},
			map[string]string{
				"TZ":                             "Europe/Oslo",
				"PDF3_ENVIRONMENT":               "localtest",
				"PDF3_QUEUE_SIZE":                "3",
				"PDF3_LOCALTEST_PUBLIC_BASE_URL": topology.LocaltestBaseURL(),
			},
			nil,
			nil,
			[]string{ContainerLocaltest},
			nil,
		),
		workflowEngineDbContainerSpec(dataDir),
		workflowEngineContainerSpec(topology),
	}
	if includePgAdmin {
		containers = append(containers, pgAdminContainerSpec(dataDir))
	}
	return containers
}

func workflowEngineDbContainerSpec(dataDir string) ContainerSpec {
	spec := newContainerSpec(
		ContainerWorkflowEngineDb,
		nil,
		map[string]string{
			"POSTGRES_DB":       postgresDB,
			"POSTGRES_USER":     postgresUser,
			"POSTGRES_PASSWORD": postgresPassword,
			"TZ":                "Europe/Oslo",
		},
		[]types.VolumeMount{
			newVolume(
				workflowEngineDbDataPath(dataDir),
				"/var/lib/postgresql",
			),
			newReadOnlyVolume(
				workflowEngineInfraFilePath(dataDir, "postgres-init.sql"),
				"/docker-entrypoint-initdb.d/01-tuning.sql",
			),
		},
		nil,
		nil,
		[]string{"postgres", "-c", "shared_preload_libraries=pg_stat_statements"},
	)
	spec.HealthCheck = &types.HealthCheck{
		Test:        []string{"CMD-SHELL", "pg_isready -h 127.0.0.1 -p " + postgresPort + " -U " + postgresUser},
		Interval:    postgresHealthInterval,
		Timeout:     postgresHealthTimeout,
		Retries:     postgresHealthRetries,
		StartPeriod: postgresHealthStartPeriod,
	}
	spec.UseDefaultUser = true
	return spec
}

func workflowEngineContainerSpec(topology envtopology.Local) ContainerSpec {
	return newContainerSpec(
		ContainerWorkflowEngine,
		nil,
		map[string]string{
			"ASPNETCORE_ENVIRONMENT":              "Docker",
			"ConnectionStrings__WorkflowEngine":   "Host=" + ContainerWorkflowEngineDb + ";Port=" + postgresPort + ";Database=" + workflowEngineDB + ";Username=" + postgresUser + ";Password=" + postgresPassword,
			"AppCommandSettings__CommandEndpoint": topology.LocaltestBaseURL() + "/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks/",
		},
		nil,
		nil,
		[]string{ContainerWorkflowEngineDb, ContainerLocaltest},
		nil,
	)
}

func pgAdminContainerSpec(dataDir string) ContainerSpec {
	spec := newContainerSpec(
		ContainerPgAdmin,
		nil,
		map[string]string{
			"PGADMIN_DEFAULT_EMAIL":                   pgAdminEmail,
			"PGADMIN_DEFAULT_PASSWORD":                pgAdminPassword,
			"PGADMIN_CONFIG_SERVER_MODE":              "False",
			"PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED": "False",
			"PGPASS_FILE":                             pgAdminConnectionSource,
			"GUNICORN_ACCESS_LOGFILE":                 "/dev/null",
		},
		[]types.VolumeMount{
			newReadOnlyVolume(
				workflowEngineInfraFilePath(dataDir, "pgadmin-servers.json"),
				"/pgadmin4/servers.json",
			),
			newReadOnlyVolume(
				workflowEngineInfraFilePath(dataDir, "pgpass"),
				pgAdminConnectionSource,
			),
		},
		nil,
		[]string{ContainerWorkflowEngineDb},
		nil,
	)
	spec.UseDefaultUser = true
	return spec
}

func workflowEngineInfraFilePath(dataDir, name string) string {
	return filepath.Join(workflowEngineInfraPath(dataDir), name)
}

func workflowEngineInfraPath(dataDir string) string {
	return filepath.Join(dataDir, infraDir, workflowEngineInfraDir)
}

func workflowEngineDbDataPath(dataDir string) string {
	return filepath.Join(dataDir, workflowEngineDbDataDir)
}

func monitoringContainers(dataDir string, topology envtopology.Local) []ContainerSpec {
	infraPath := filepath.Join(dataDir, infraDir)

	return []ContainerSpec{
		newContainerSpec(
			ContainerMonitoringTempo,
			nil,
			nil,
			[]types.VolumeMount{
				newVolume(filepath.Join(infraPath, "tempo.yaml"), "/etc/tempo.yaml"),
			},
			nil,
			nil,
			[]string{"-config.file=/etc/tempo.yaml", "-log.level=error"},
		),
		newContainerSpec(
			ContainerMonitoringMimir,
			nil,
			nil,
			[]types.VolumeMount{
				newVolume(filepath.Join(infraPath, "mimir.yaml"), "/etc/mimir.yaml"),
			},
			nil,
			nil,
			[]string{"-config.file=/etc/mimir.yaml", "-target=all", "-log.level=error"},
		),
		newContainerSpec(
			ContainerMonitoringLoki,
			nil,
			nil,
			[]types.VolumeMount{
				newVolume(filepath.Join(infraPath, "loki.yaml"), "/etc/loki.yaml"),
			},
			nil,
			nil,
			[]string{"-config.file=/etc/loki.yaml", "-target=all", "-log.level=error"},
		),
		newContainerSpec(
			ContainerMonitoringOtelCollector,
			[]types.PortMapping{newPort("4317", "4317")},
			nil,
			[]types.VolumeMount{
				newVolume(filepath.Join(infraPath, "otel-collector.yaml"), "/etc/otel-collector.yaml"),
			},
			[]string{topology.OTelHost()},
			[]string{ContainerMonitoringMimir, ContainerMonitoringTempo, ContainerMonitoringLoki},
			[]string{"--config=/etc/otel-collector.yaml"},
		),
		newContainerSpec(
			ContainerMonitoringGrafana,
			nil,
			map[string]string{
				"GF_AUTH_ANONYMOUS_ENABLED":     "true",
				"GF_AUTH_ANONYMOUS_ORG_ROLE":    "Admin",
				"GF_AUTH_DISABLE_LOGIN_FORM":    "true",
				"GF_LOG_LEVEL":                  "error",
				"GF_SERVER_DOMAIN":              topology.AppHostName(),
				"GF_SERVER_SERVE_FROM_SUB_PATH": "true",
				"GF_SERVER_ROOT_URL":            "%(protocol)s://%(domain)s:%(http_port)s/grafana/",
			},
			[]types.VolumeMount{
				newVolume(
					filepath.Join(infraPath, "grafana-datasources.yaml"),
					"/etc/grafana/provisioning/datasources/datasources.yaml",
				),
				newVolume(
					filepath.Join(infraPath, "grafana-dashboards.yaml"),
					"/etc/grafana/provisioning/dashboards/dashboards.yaml",
				),
				newVolume(filepath.Join(infraPath, "grafana-dashboards"), "/var/lib/grafana/dashboards"),
			},
			nil,
			[]string{
				ContainerMonitoringOtelCollector,
				ContainerMonitoringMimir,
				ContainerMonitoringTempo,
				ContainerMonitoringLoki,
			},
			nil,
		),
	}
}

func monitoringImageRefs(mon config.MonitoringImages) map[string]string {
	return map[string]string{
		ContainerMonitoringTempo:         mon.Tempo.Ref(),
		ContainerMonitoringMimir:         mon.Mimir.Ref(),
		ContainerMonitoringLoki:          mon.Loki.Ref(),
		ContainerMonitoringOtelCollector: mon.OtelCollector.Ref(),
		ContainerMonitoringGrafana:       mon.Grafana.Ref(),
	}
}

// ResourceBuildOptions holds options for building the resource graph.
type ResourceBuildOptions struct {
	DevConfig         *DevImageConfig
	Images            config.ImagesConfig
	DataDir           string
	Topology          envtopology.Local
	RuntimeConfig     RuntimeConfig
	ImageMode         ImageMode
	IncludeMonitoring bool
	IncludePgAdmin    bool
}

// ResourceDestroyOptions holds minimal options for destroying resources.
type ResourceDestroyOptions struct {
	DataDir           string
	Images            config.ImagesConfig
	IncludeMonitoring bool
}

type containerResourceMode int

const (
	containerModeApply containerResourceMode = iota
	containerModeDestroy
)

// BuildResources creates the resource graph for localtest.
// Returns pure resource types that can be applied via an Executor.
func BuildResources(opts ResourceBuildOptions) []resource.Resource {
	return buildResourcesWithMode(
		opts.DataDir,
		opts.RuntimeConfig,
		opts.Topology,
		opts.IncludeMonitoring,
		opts.IncludePgAdmin,
		buildCoreImages(opts),
		monitoringImageRefs(opts.Images.Monitoring),
		containerModeApply,
	)
}

// BuildResourcesForDestroy creates the list of resources need to shutdown localtest.
func BuildResourcesForDestroy(opts ResourceDestroyOptions) []resource.Resource {
	runtimeCfg := RuntimeConfig{
		User: "", // not used for destroy
	}

	return buildResourcesWithMode(
		opts.DataDir,
		runtimeCfg,
		envtopology.NewLocal(envtopology.DefaultIngressPortString()),
		opts.IncludeMonitoring,
		true,
		buildRemoteCoreImages(opts.Images.Core),
		monitoringImageRefs(opts.Images.Monitoring),
		containerModeDestroy,
	)
}

func buildCoreImages(opts ResourceBuildOptions) map[string]resource.ImageResource {
	if opts.ImageMode != DevMode || opts.DevConfig == nil {
		return buildRemoteCoreImages(opts.Images.Core)
	}

	images := buildRemoteCoreImages(opts.Images.Core)

	images[ContainerLocaltest] = &resource.LocalImage{
		ContextPath: opts.DevConfig.LocaltestContextPath(),
		Dockerfile:  opts.DevConfig.LocaltestDockerfile(),
		Build:       buildCacheOptions(buildCacheRefLocaltest),
		Tag:         devImageTagLocaltest,
	}
	images[ContainerPDF3] = &resource.LocalImage{
		ContextPath: opts.DevConfig.PDF3ContextPath(),
		Dockerfile:  opts.DevConfig.PDF3Dockerfile(),
		Build:       buildCacheOptions(buildCacheRefPDF3),
		Tag:         devImageTagPDF3,
	}
	images[ContainerWorkflowEngine] = &resource.LocalImage{
		ContextPath: opts.DevConfig.WorkflowEngineContextPath(),
		Dockerfile:  opts.DevConfig.WorkflowEngineDockerfile(),
		Build: types.BuildOptions{
			CacheFrom: nil,
			CacheTo:   nil,
		},
		Tag: devImageTagWorkflowEngine,
	}

	return images
}

func buildCacheOptions(ref string) types.BuildOptions {
	if ref == "" || !config.IsCI() {
		return types.BuildOptions{
			CacheFrom: nil,
			CacheTo:   nil,
		}
	}

	opts := types.BuildOptions{
		CacheFrom: []string{"type=registry,ref=" + ref},
		CacheTo:   nil,
	}
	if config.IsTruthyEnv(os.Getenv(config.EnvRegistryCacheWrite)) {
		opts.CacheTo = []string{"type=registry,ref=" + ref + ",mode=max"}
	}
	return opts
}

func buildRemoteCoreImages(core config.CoreImages) map[string]resource.ImageResource {
	return map[string]resource.ImageResource{
		ContainerLocaltest: &resource.RemoteImage{
			Ref:        core.Localtest.Ref(),
			PullPolicy: resource.PullIfNotPresent,
		},
		ContainerPDF3: &resource.RemoteImage{
			Ref:        core.PDF3.Ref(),
			PullPolicy: resource.PullIfNotPresent,
		},
		ContainerWorkflowEngineDb: &resource.RemoteImage{
			Ref:        core.WorkflowEngineDb.Ref(),
			PullPolicy: resource.PullIfNotPresent,
		},
		ContainerWorkflowEngine: &resource.RemoteImage{
			Ref:        core.WorkflowEngine.Ref(),
			PullPolicy: resource.PullIfNotPresent,
		},
		ContainerPgAdmin: &resource.RemoteImage{
			Ref:        core.PgAdmin.Ref(),
			PullPolicy: resource.PullIfNotPresent,
		},
	}
}

func buildResourcesWithMode(
	dataDir string,
	runtimeCfg RuntimeConfig,
	topology envtopology.Local,
	includeMonitoring bool,
	includePgAdmin bool,
	coreImages map[string]resource.ImageResource,
	monImages map[string]string,
	mode containerResourceMode,
) []resource.Resource {
	core := coreContainers(dataDir, topology, includePgAdmin)
	mon := monitoringContainers(dataDir, topology)
	labels := map[string]string{LabelKey: LabelValue}

	capacity := 1 + len(core)*2
	if includeMonitoring {
		capacity += len(mon) * 2
	}
	resources := make([]resource.Resource, 0, capacity)

	network := &resource.Network{
		Name:   NetworkName,
		Driver: "bridge",
		Labels: labels,
		Lifecycle: resource.LifecycleOptions{
			// When apps are started with `studioctl run --mode container ..`
			// we might have active containers attached to the network
			HandleDestroyError: func(err error) resource.ErrorDecision {
				if errors.Is(err, types.ErrNetworkInUse) {
					return resource.ErrorDecisionIgnore
				}
				return resource.ErrorDecisionDefault
			},
		},
	}
	resources = append(resources, network)

	for i := range core {
		resources = append(resources, coreImages[core[i].Name])
	}

	for i := range core {
		spec := &core[i]
		resources = append(resources, newContainerResource(
			spec,
			coreImages[spec.Name],
			resource.Ref(network),
			labels,
			runtimeCfg.User,
			mode,
		))
	}

	if includeMonitoring {
		for i := range mon {
			spec := &mon[i]
			image := &resource.RemoteImage{
				Ref:        monImages[spec.Name],
				PullPolicy: resource.PullIfNotPresent,
			}
			resources = append(resources, image)
			resources = append(resources, newContainerResource(
				spec,
				image,
				resource.Ref(network),
				labels,
				"", // Monitoring containers use default user (config mounts are read-only)
				mode,
			))
		}
	}

	return resources
}

func newContainerResource(
	spec *ContainerSpec,
	imageRes resource.ImageResource,
	network resource.ResourceRef,
	labels map[string]string,
	user string,
	mode containerResourceMode,
) *resource.Container {
	if mode == containerModeDestroy {
		return &resource.Container{
			HealthCheck: nil,
			Name:        spec.Name,
			Image:       resource.Ref(imageRes),
			Networks:    []resource.ResourceRef{network},
			DependsOn:   nil,
			Lifecycle: resource.ContainerLifecycleOptions{
				LifecycleOptions: resource.LifecycleOptions{
					HandleDestroyError: nil,
				},
				WaitForReady: false,
			},
			Labels:         labels,
			Ports:          nil,
			Volumes:        nil,
			Env:            nil,
			Command:        nil,
			ExtraHosts:     nil,
			NetworkAliases: nil,
			RestartPolicy:  "",
			User:           "",
		}
	}

	containerUser := user
	if spec.UseDefaultUser {
		containerUser = ""
	}

	return &resource.Container{
		HealthCheck: spec.HealthCheck,
		Name:        spec.Name,
		Image:       resource.Ref(imageRes),
		Networks:    []resource.ResourceRef{network},
		DependsOn:   containerDependencyRefs(spec.Dependencies),
		Ports:       spec.Ports,
		Volumes:     spec.Volumes,
		Env:         toEnvSlice(spec.Environment),
		Labels:      labels,
		Command:     spec.Command,
		ExtraHosts:  spec.ExtraHosts,
		Lifecycle: resource.ContainerLifecycleOptions{
			LifecycleOptions: resource.LifecycleOptions{
				HandleDestroyError: nil,
			},
			WaitForReady: true,
		},
		NetworkAliases: spec.NetworkAliases,
		RestartPolicy:  "",
		User:           containerUser,
	}
}

func containerDependencyRefs(names []string) []resource.ResourceRef {
	if len(names) == 0 {
		return nil
	}
	refs := make([]resource.ResourceRef, len(names))
	for i, name := range names {
		refs[i] = resource.RefID(resource.ContainerID(name))
	}
	return refs
}

func toEnvSlice(env map[string]string) []string {
	if len(env) == 0 {
		return nil
	}
	result := make([]string, 0, len(env))
	for k, v := range env {
		result = append(result, k+"="+v)
	}
	return result
}

type hostPathExpectation struct {
	hostPath  string
	expectDir bool
}

func hostPathExpectations(opts ResourceBuildOptions) []hostPathExpectation {
	core := coreContainers(opts.DataDir, opts.Topology, opts.IncludePgAdmin)
	all := core
	if opts.IncludeMonitoring {
		all = append(all, monitoringContainers(opts.DataDir, opts.Topology)...)
	}

	// Dedupe by host path while preserving first expectation.
	seen := make(map[string]struct{}, len(all))
	result := make([]hostPathExpectation, 0, len(all))
	for i := range all {
		spec := &all[i]
		for j := range spec.Volumes {
			volume := spec.Volumes[j]
			if _, ok := seen[volume.HostPath]; ok {
				continue
			}
			seen[volume.HostPath] = struct{}{}
			result = append(result, hostPathExpectation{
				hostPath:  volume.HostPath,
				expectDir: filepath.Ext(filepath.Base(volume.ContainerPath)) == "",
			})
		}
	}
	return result
}

// ValidateResourceHostPaths ensures all bind-mounted host paths exist and have expected type.
func ValidateResourceHostPaths(opts ResourceBuildOptions) error {
	expectations := hostPathExpectations(opts)
	missing := make([]string, 0)
	wrongType := make([]string, 0)

	for i := range expectations {
		exp := expectations[i]
		info, err := os.Stat(exp.hostPath)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				missing = append(missing, exp.hostPath)
				continue
			}
			return fmt.Errorf("stat mounted path %q: %w", exp.hostPath, err)
		}

		if exp.expectDir && !info.IsDir() {
			wrongType = append(wrongType, exp.hostPath+" (expected directory)")
		}
		if !exp.expectDir && info.IsDir() {
			wrongType = append(wrongType, exp.hostPath+" (expected file)")
		}
	}

	if len(missing) == 0 && len(wrongType) == 0 {
		return nil
	}

	slices.Sort(missing)
	slices.Sort(wrongType)

	parts := make([]string, 0, 2)
	if len(missing) > 0 {
		parts = append(parts, "missing: "+strings.Join(missing, ", "))
	}
	if len(wrongType) > 0 {
		parts = append(parts, "wrong type: "+strings.Join(wrongType, ", "))
	}
	return fmt.Errorf("%w: %s", ErrInvalidResourceLayout, strings.Join(parts, "; "))
}
