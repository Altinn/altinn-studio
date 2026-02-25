// Package localtest provides localtest resource definitions.
package localtest

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/networking"
)

const (
	// LabelKey is the label used to identify studioctl-managed resources.
	LabelKey = "altinn.studio/cli"

	// LabelValue is the value for the localtest runtime.
	LabelValue = "localtest"

	// NetworkName is the name of the localtest network.
	NetworkName = "altinntestlocal_network"

	devImageTagLocaltest = "localtest:dev"
	devImageTagPDF3      = "localtest-pdf3:dev"
)

// ErrInvalidResourceLayout is returned when required host paths are missing or have wrong type.
var ErrInvalidResourceLayout = errors.New("invalid localtest resource layout")

// RuntimeConfig holds runtime-specific configuration for localtest.
type RuntimeConfig struct {
	HostGateway      string                        // resolved host gateway IP (e.g., "172.17.0.1")
	LoadBalancerPort string                        // port for localtest (default: "80" for Docker, "8000" for Podman)
	User             string                        // "uid:gid" to run containers as (prevents root-owned bind mount files)
	Installation     container.RuntimeInstallation // container runtime installation type
}

// ContainerSpec defines a container to run.
type ContainerSpec struct {
	Name         string
	Ports        []types.PortMapping
	Environment  map[string]string
	Volumes      []types.VolumeMount
	ExtraHosts   []string
	Dependencies []string
	Command      []string
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
}

func newPort(hostPort, containerPort string) types.PortMapping {
	return types.PortMapping{
		HostPort:      hostPort,
		ContainerPort: containerPort,
		HostIP:        "",
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

func newContainerSpec(
	name string,
	ports []types.PortMapping,
	env map[string]string,
	volumes []types.VolumeMount,
	extraHosts, deps, cmd []string,
) ContainerSpec {
	return ContainerSpec{
		Name:         name,
		Ports:        ports,
		Environment:  env,
		Volumes:      volumes,
		ExtraHosts:   extraHosts,
		Dependencies: deps,
		Command:      cmd,
	}
}

func newStatus() Status {
	return Status{
		Containers: []ContainerStatus{},
		Running:    false,
	}
}

func newContainerStatus(name, status string) ContainerStatus {
	return ContainerStatus{
		Name:   name,
		Status: status,
	}
}

func coreContainers(dataDir string, cfg RuntimeConfig) []ContainerSpec {
	extraHosts := []string{
		"host.docker.internal:" + cfg.HostGateway,
		"host.containers.internal:" + cfg.HostGateway,
		networking.LocalDomain + ":" + cfg.HostGateway,
	}

	dotnetEnv := cfg.Installation.String()

	return []ContainerSpec{
		newContainerSpec(
			ContainerLocaltest,
			[]types.PortMapping{
				newPort(cfg.LoadBalancerPort, "5101"), // Main port
				newPort("5101", "5101"),               // Internal port
			},
			map[string]string{
				"DOTNET_ENVIRONMENT":        dotnetEnv,
				"GeneralSettings__BaseUrl":  "http://" + networking.LocalDomain + ":" + cfg.LoadBalancerPort,
				"GeneralSettings__HostName": networking.LocalDomain,
			},
			[]types.VolumeMount{
				newVolume(filepath.Join(dataDir, "testdata"), "/testdata"),
				newVolume(filepath.Join(dataDir, "AltinnPlatformLocal"), "/AltinnPlatformLocal"),
			},
			extraHosts,
			nil,
			nil,
		),
		newContainerSpec(
			ContainerPDF3,
			[]types.PortMapping{newPort("5300", "5031")},
			map[string]string{
				"TZ":               "Europe/Oslo",
				"PDF3_ENVIRONMENT": "localtest",
				"PDF3_QUEUE_SIZE":  "3",
			},
			nil,
			extraHosts,
			[]string{ContainerLocaltest},
			nil,
		),
	}
}

//nolint:funlen // Container spec list is more readable as a single function
func monitoringContainers(dataDir string, cfg RuntimeConfig) []ContainerSpec {
	extraHosts := []string{
		"host.docker.internal:" + cfg.HostGateway,
		"host.containers.internal:" + cfg.HostGateway,
		networking.LocalDomain + ":" + cfg.HostGateway,
	}

	infraDir := filepath.Join(dataDir, "infra")

	return []ContainerSpec{
		newContainerSpec(
			ContainerMonitoringTempo,
			nil,
			nil,
			[]types.VolumeMount{
				newVolume(filepath.Join(infraDir, "tempo.yaml"), "/etc/tempo.yaml"),
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
				newVolume(filepath.Join(infraDir, "mimir.yaml"), "/etc/mimir.yaml"),
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
				newVolume(filepath.Join(infraDir, "loki.yaml"), "/etc/loki.yaml"),
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
				newVolume(filepath.Join(infraDir, "otel-collector.yaml"), "/etc/otel-collector.yaml"),
			},
			nil,
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
				"GF_SERVER_DOMAIN":              networking.LocalDomain,
				"GF_SERVER_SERVE_FROM_SUB_PATH": "true",
				"GF_SERVER_ROOT_URL":            "%(protocol)s://%(domain)s:%(http_port)s/grafana/",
			},
			[]types.VolumeMount{
				newVolume(
					filepath.Join(infraDir, "grafana-datasources.yaml"),
					"/etc/grafana/provisioning/datasources/datasources.yaml",
				),
				newVolume(
					filepath.Join(infraDir, "grafana-dashboards.yaml"),
					"/etc/grafana/provisioning/dashboards/dashboards.yaml",
				),
				newVolume(filepath.Join(infraDir, "grafana-dashboards"), "/var/lib/grafana/dashboards"),
			},
			extraHosts,
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
	RuntimeConfig     RuntimeConfig
	ImageMode         ImageMode
	IncludeMonitoring bool
}

// ResourceDestroyOptions holds minimal options for destroying resources.
type ResourceDestroyOptions struct {
	DataDir           string
	Images            config.ImagesConfig
	IncludeMonitoring bool
	Installation      container.RuntimeInstallation
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
		opts.IncludeMonitoring,
		buildCoreImages(opts),
		monitoringImageRefs(opts.Images.Monitoring),
		containerModeApply,
	)
}

// BuildResourcesForDestroy creates the list of resources need to shutdown localtest.
func BuildResourcesForDestroy(opts ResourceDestroyOptions) []resource.Resource {
	runtimeCfg := RuntimeConfig{
		Installation:     opts.Installation,
		HostGateway:      "", // not used for destroy
		LoadBalancerPort: "", // not used for destroy
		User:             "", // not used for destroy
	}

	return buildResourcesWithMode(
		opts.DataDir,
		runtimeCfg,
		opts.IncludeMonitoring,
		buildRemoteCoreImages(opts.Images.Core),
		monitoringImageRefs(opts.Images.Monitoring),
		containerModeDestroy,
	)
}

func buildCoreImages(opts ResourceBuildOptions) map[string]resource.ImageResource {
	images := make(map[string]resource.ImageResource, 2)

	if opts.ImageMode == DevMode && opts.DevConfig != nil {
		images[ContainerLocaltest] = &resource.LocalImage{
			ContextPath: opts.DevConfig.LocaltestContextPath(),
			Dockerfile:  opts.DevConfig.LocaltestDockerfile(),
			Tag:         devImageTagLocaltest,
		}
		images[ContainerPDF3] = &resource.LocalImage{
			ContextPath: opts.DevConfig.PDF3ContextPath(),
			Dockerfile:  opts.DevConfig.PDF3Dockerfile(),
			Tag:         devImageTagPDF3,
		}
	} else {
		images = buildRemoteCoreImages(opts.Images.Core)
	}

	return images
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
	}
}

func buildResourcesWithMode(
	dataDir string,
	runtimeCfg RuntimeConfig,
	includeMonitoring bool,
	coreImages map[string]resource.ImageResource,
	monImages map[string]string,
	mode containerResourceMode,
) []resource.Resource {
	core := coreContainers(dataDir, runtimeCfg)
	mon := monitoringContainers(dataDir, runtimeCfg)
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
	}
	resources = append(resources, network)

	for _, name := range coreContainerNames() {
		resources = append(resources, coreImages[name])
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
			Name:          spec.Name,
			Image:         resource.Ref(imageRes),
			Networks:      []resource.ResourceRef{network},
			Labels:        labels,
			Ports:         nil,
			Volumes:       nil,
			Env:           nil,
			Command:       nil,
			ExtraHosts:    nil,
			RestartPolicy: "",
			User:          "",
		}
	}

	return &resource.Container{
		Name:          spec.Name,
		Image:         resource.Ref(imageRes),
		Networks:      []resource.ResourceRef{network},
		Ports:         spec.Ports,
		Volumes:       spec.Volumes,
		Env:           toEnvSlice(spec.Environment),
		Labels:        labels,
		Command:       spec.Command,
		ExtraHosts:    spec.ExtraHosts,
		RestartPolicy: "",
		User:          user,
	}
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
	core := coreContainers(opts.DataDir, opts.RuntimeConfig)
	all := core
	if opts.IncludeMonitoring {
		all = append(all, monitoringContainers(opts.DataDir, opts.RuntimeConfig)...)
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
