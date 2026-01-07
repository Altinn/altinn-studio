// Package localtest provides localtest resource definitions.
package localtest

import (
	"context"
	"path/filepath"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/interfaces"
	"altinn.studio/studioctl/internal/networking"
)

const (
	// LabelKey is the label used to identify studioctl-managed resources.
	LabelKey = "altinn.studio/cli"

	// LabelValue is the value for the localtest runtime.
	LabelValue = "localtest"

	// NetworkName is the name of the localtest network.
	NetworkName = "altinntestlocal_network"

	// Dev mode image tags.
	devImageTagLocaltest = "localtest:dev"
	devImageTagPDF3      = "localtest-pdf3:dev"
)

// RuntimeConfig holds runtime-specific configuration for localtest.
type RuntimeConfig struct {
	HostGateway      string // resolved host gateway IP (e.g., "172.17.0.1")
	LoadBalancerPort string // port for localtest (default: "80" for Docker, "8000" for Podman)
	User             string // "uid:gid" to run containers as (prevents root-owned bind mount files)
	IsPodman         bool   // true if using Podman runtime
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

// newPort creates a PortMapping with explicit zero values for optional fields.
func newPort(hostPort, containerPort string) types.PortMapping {
	return types.PortMapping{
		HostPort:      hostPort,
		ContainerPort: containerPort,
		HostIP:        "",
		Protocol:      "",
	}
}

// newVolume creates a VolumeMount with explicit zero values for optional fields.
func newVolume(hostPath, containerPath string) types.VolumeMount {
	return types.VolumeMount{
		HostPath:      hostPath,
		ContainerPath: containerPath,
		ReadOnly:      false,
	}
}

// newContainerSpec creates a ContainerSpec with all fields explicitly set.
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

// newLocaltestStatus creates an empty LocaltestStatus with all fields initialized.
func newLocaltestStatus() interfaces.LocaltestStatus {
	return interfaces.LocaltestStatus{
		Ports:        nil,
		Version:      "",
		Uptime:       "",
		HealthStatus: "",
		Containers:   []interfaces.ContainerInfo{},
		Running:      false,
	}
}

// newContainerInfo creates a ContainerInfo with all fields explicitly set.
func newContainerInfo(name, status string) interfaces.ContainerInfo {
	return interfaces.ContainerInfo{
		Name:   name,
		Image:  "",
		Status: status,
		Ports:  nil,
	}
}

// coreContainers returns the core localtest container specs (without image refs).
func coreContainers(dataDir string, cfg RuntimeConfig) []ContainerSpec {
	// Build extra hosts entries - map all hostnames to the probed gateway IP
	extraHosts := []string{
		"host.docker.internal:" + cfg.HostGateway,
		"host.containers.internal:" + cfg.HostGateway,
		networking.LocalDomain + ":" + cfg.HostGateway,
	}

	// Determine environment based on runtime
	dotnetEnv := "Docker"
	if cfg.IsPodman {
		dotnetEnv = "Podman"
	}

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

// monitoringContainers returns the monitoring stack container specs.
//
//nolint:funlen // Container spec list is more readable as a single function
func monitoringContainers(dataDir string, cfg RuntimeConfig) []ContainerSpec {
	// Build extra hosts entries for grafana
	extraHosts := []string{
		"host.docker.internal:" + cfg.HostGateway,
		"host.containers.internal:" + cfg.HostGateway,
		networking.LocalDomain + ":" + cfg.HostGateway,
	}

	// Infrastructure config directory
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

// monitoringImageRefs returns the image refs for monitoring containers from config.
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

// BuildResources creates the resource graph for localtest.
// Returns pure resource types that can be applied via an Executor.
func BuildResources(opts ResourceBuildOptions) []resource.Resource {
	core := coreContainers(opts.DataDir, opts.RuntimeConfig)
	mon := monitoringContainers(opts.DataDir, opts.RuntimeConfig)
	monImages := monitoringImageRefs(opts.Images.Monitoring)

	labels := map[string]string{LabelKey: LabelValue}

	// Pre-allocate: 1 network + images + core containers + optional monitoring containers
	capacity := 1 + len(core)*2 // network + (image + container) per core
	if opts.IncludeMonitoring {
		capacity += len(mon) * 2
	}
	resources := make([]resource.Resource, 0, capacity)

	// Network resource
	network := &resource.Network{
		Name:   NetworkName,
		Driver: "bridge",
		Labels: labels,
	}
	resources = append(resources, network)

	// Build core container resources based on image mode
	coreImages := buildCoreImages(opts)
	resources = append(resources, coreImages[ContainerLocaltest])
	resources = append(resources, coreImages[ContainerPDF3])

	// Add core containers
	for i := range core {
		spec := &core[i]
		imageRes := coreImages[spec.Name]

		env := make([]string, 0, len(spec.Environment))
		for k, v := range spec.Environment {
			env = append(env, k+"="+v)
		}

		ctr := &resource.Container{
			Name:          spec.Name,
			Image:         resource.Ref(imageRes),
			Networks:      []resource.ResourceRef{resource.Ref(network)},
			Ports:         spec.Ports,
			Volumes:       spec.Volumes,
			Env:           env,
			Labels:        labels,
			Command:       spec.Command,
			ExtraHosts:    spec.ExtraHosts,
			RestartPolicy: "",
			User:          opts.RuntimeConfig.User,
		}
		resources = append(resources, ctr)
	}

	// Add monitoring resources if requested
	if opts.IncludeMonitoring {
		for i := range mon {
			spec := &mon[i]

			// Monitoring always uses remote images
			image := &resource.RemoteImage{
				Ref:        monImages[spec.Name],
				PullPolicy: resource.PullIfNotPresent,
			}
			resources = append(resources, image)

			env := make([]string, 0, len(spec.Environment))
			for k, v := range spec.Environment {
				env = append(env, k+"="+v)
			}

			ctr := &resource.Container{
				Name:          spec.Name,
				Image:         resource.Ref(image),
				Networks:      []resource.ResourceRef{resource.Ref(network)},
				Ports:         spec.Ports,
				Volumes:       spec.Volumes,
				Env:           env,
				Labels:        labels,
				Command:       spec.Command,
				ExtraHosts:    spec.ExtraHosts,
				RestartPolicy: "",
				User:          "", // Monitoring containers use default user (config mounts are read-only)
			}
			resources = append(resources, ctr)
		}
	}

	return resources
}

// buildCoreImages creates image resources for core containers based on mode.
func buildCoreImages(opts ResourceBuildOptions) map[string]resource.ImageResource {
	images := make(map[string]resource.ImageResource, 2)

	if opts.ImageMode == DevMode && opts.DevConfig != nil {
		// Dev mode: build from local Dockerfiles
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
		// Release mode: pull from GHCR
		images[ContainerLocaltest] = &resource.RemoteImage{
			Ref:        opts.Images.Core.Localtest.Ref(),
			PullPolicy: resource.PullIfNotPresent,
		}
		images[ContainerPDF3] = &resource.RemoteImage{
			Ref:        opts.Images.Core.PDF3.Ref(),
			PullPolicy: resource.PullIfNotPresent,
		}
	}

	return images
}

// GetStatus returns the current status of localtest.
func GetStatus(ctx context.Context, client container.ContainerClient) (interfaces.LocaltestStatus, error) {
	status := newLocaltestStatus()

	// Check each expected container
	containers := []string{ContainerLocaltest, ContainerPDF3}
	for _, name := range containers {
		state, err := client.ContainerState(ctx, name)
		if err != nil {
			continue // container doesn't exist
		}

		info := newContainerInfo(name, state.Status)
		status.Containers = append(status.Containers, info)

		if state.Running {
			status.Running = true
		}
	}

	return status, nil
}
