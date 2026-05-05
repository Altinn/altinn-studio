package components

import (
	"path/filepath"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
)

func registerMonitoringComponents(manifest *Manifest, opts *Options) {
	enabled := opts.IncludeMonitoring
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerMonitoringTempo, opts.Images.Monitoring.Tempo.Ref()),
		monitoringTempoContainer(opts),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerMonitoringMimir, opts.Images.Monitoring.Mimir.Ref()),
		monitoringMimirContainer(opts),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerMonitoringLoki, opts.Images.Monitoring.Loki.Ref()),
		monitoringLokiContainer(opts),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerMonitoringOtelCollector, opts.Images.Monitoring.OtelCollector.Ref()),
		monitoringOTelCollectorContainer(opts),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerMonitoringGrafana, opts.Images.Monitoring.Grafana.Ref()),
		monitoringGrafanaContainer(opts),
		enabled,
	)
}

func monitoringImage(ctx *Options, name, ref string) resource.ImageResource {
	enabled := ctx.IncludeMonitoring
	return &resource.RemoteImage{
		Enabled:    resourceEnabledRef(enabled),
		Ref:        imageRef(ref, name, enabled),
		PullPolicy: resource.PullIfNotPresent,
	}
}

func monitoringTempoContainer(ctx *Options) *ContainerSpec {
	spec := newContainerSpec(
		ContainerMonitoringTempo,
		nil,
		nil,
		[]types.VolumeMount{
			newVolume(filepath.Join(ctx.Paths.InfraDir, "tempo.yaml"), "/etc/tempo.yaml"),
		},
		nil,
		nil,
		[]string{"-config.file=/etc/tempo.yaml", "-log.level=error"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringMimirContainer(ctx *Options) *ContainerSpec {
	spec := newContainerSpec(
		ContainerMonitoringMimir,
		nil,
		nil,
		[]types.VolumeMount{
			newVolume(filepath.Join(ctx.Paths.InfraDir, "mimir.yaml"), "/etc/mimir.yaml"),
		},
		nil,
		nil,
		[]string{"-config.file=/etc/mimir.yaml", "-target=all", "-log.level=error"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringLokiContainer(ctx *Options) *ContainerSpec {
	spec := newContainerSpec(
		ContainerMonitoringLoki,
		nil,
		nil,
		[]types.VolumeMount{
			newVolume(filepath.Join(ctx.Paths.InfraDir, "loki.yaml"), "/etc/loki.yaml"),
		},
		nil,
		nil,
		[]string{"-config.file=/etc/loki.yaml", "-target=all", "-log.level=error"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringOTelCollectorContainer(ctx *Options) *ContainerSpec {
	otel := ctx.Topology.MustComponent(envtopology.ComponentOTel)
	spec := newContainerSpec(
		ContainerMonitoringOtelCollector,
		[]types.PortMapping{newPort("4317", "4317")},
		nil,
		[]types.VolumeMount{
			newVolume(filepath.Join(ctx.Paths.InfraDir, "otel-collector.yaml"), "/etc/otel-collector.yaml"),
		},
		[]string{otel.Host()},
		[]string{ContainerMonitoringMimir, ContainerMonitoringTempo, ContainerMonitoringLoki},
		[]string{"--config=/etc/otel-collector.yaml"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringGrafanaContainer(ctx *Options) *ContainerSpec {
	app := ctx.Topology.MustComponent(envtopology.ComponentApp)
	spec := newContainerSpec(
		ContainerMonitoringGrafana,
		nil,
		map[string]string{
			"GF_AUTH_ANONYMOUS_ENABLED":     "true",
			"GF_AUTH_ANONYMOUS_ORG_ROLE":    "Admin",
			"GF_AUTH_DISABLE_LOGIN_FORM":    "true",
			"GF_LOG_LEVEL":                  "error",
			"GF_SERVER_DOMAIN":              app.Host(), // TODO: should be localtest/proxy, not app.
			"GF_SERVER_SERVE_FROM_SUB_PATH": "true",
			"GF_SERVER_ROOT_URL":            "%(protocol)s://%(domain)s:%(http_port)s/grafana/", // TODO: mirror real envs, /monitor.
		},
		[]types.VolumeMount{
			newVolume(
				filepath.Join(ctx.Paths.InfraDir, "grafana-datasources.yaml"),
				"/etc/grafana/provisioning/datasources/datasources.yaml",
			),
			newVolume(
				filepath.Join(ctx.Paths.InfraDir, "grafana-dashboards.yaml"),
				"/etc/grafana/provisioning/dashboards/dashboards.yaml",
			),
			newVolume(filepath.Join(ctx.Paths.InfraDir, "grafana-dashboards"), "/var/lib/grafana/dashboards"),
		},
		nil,
		[]string{
			ContainerMonitoringOtelCollector,
			ContainerMonitoringMimir,
			ContainerMonitoringTempo,
			ContainerMonitoringLoki,
		},
		nil,
	)
	spec.UseDefaultUser = true
	return spec
}
