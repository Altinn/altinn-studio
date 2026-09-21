package components

import (
	"path/filepath"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
)

func registerMonitoringComponents(manifest *Manifest, opts *Options) {
	enabled := opts.IncludeMonitoring
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerVictoriaMetrics, opts.Images.Monitoring.VictoriaMetrics),
		monitoringVictoriaMetricsContainer(),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerVictoriaTraces, opts.Images.Monitoring.VictoriaTraces),
		monitoringVictoriaTracesContainer(),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerVictoriaLogs, opts.Images.Monitoring.VictoriaLogs),
		monitoringVictoriaLogsContainer(),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerOtelCollector, opts.Images.Monitoring.OtelCollector),
		monitoringOTelCollectorContainer(opts),
		enabled,
	)
	manifest.addContainer(
		opts,
		monitoringImage(opts, ContainerGrafana, opts.Images.Monitoring.Grafana),
		monitoringGrafanaContainer(opts),
		enabled,
	)
}

func monitoringImage(ctx *Options, name string, spec config.ImageSpec) resource.ImageResource {
	enabled := ctx.IncludeMonitoring
	return &resource.PulledImage{
		Enabled:    resourceEnabledRef(enabled),
		Ref:        imageRef(spec.Ref(), name, enabled),
		PullPolicy: pullPolicyFor(spec),
	}
}

func monitoringVictoriaMetricsContainer() *ContainerSpec {
	spec := newContainerSpec(
		ContainerVictoriaMetrics,
		nil,
		nil,
		nil,
		nil,
		nil,
		[]string{"-storageDataPath=/tmp/victoria-metrics-data", "-retentionPeriod=1d"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringVictoriaTracesContainer() *ContainerSpec {
	spec := newContainerSpec(
		ContainerVictoriaTraces,
		nil,
		nil,
		nil,
		nil,
		nil,
		[]string{"-storageDataPath=/tmp/victoria-traces-data", "-retentionPeriod=1d"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringVictoriaLogsContainer() *ContainerSpec {
	spec := newContainerSpec(
		ContainerVictoriaLogs,
		nil,
		nil,
		nil,
		nil,
		nil,
		[]string{"-storageDataPath=/tmp/victoria-logs-data", "-retentionPeriod=1d"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringOTelCollectorContainer(ctx *Options) *ContainerSpec {
	otel := ctx.Topology.MustComponent(envtopology.ComponentOTel)
	spec := newContainerSpec(
		ContainerOtelCollector,
		[]types.PortMapping{newPort("4317", "4317")},
		nil,
		[]types.VolumeMount{
			newVolume(filepath.Join(ctx.Paths.InfraDir, "otel-collector.yaml"), "/etc/otel-collector.yaml"),
		},
		[]string{otel.Host()},
		[]string{ContainerVictoriaMetrics, ContainerVictoriaTraces, ContainerVictoriaLogs},
		[]string{"--config=/etc/otel-collector.yaml"},
	)
	spec.UseDefaultUser = true
	return spec
}

func monitoringGrafanaContainer(ctx *Options) *ContainerSpec {
	app := ctx.Topology.MustComponent(envtopology.ComponentApp)
	spec := newContainerSpec(
		ContainerGrafana,
		nil,
		map[string]string{
			"GF_AUTH_ANONYMOUS_ENABLED":     "true",
			"GF_INSTALL_PLUGINS":            "victoriametrics-logs-datasource",
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
			ContainerOtelCollector,
			ContainerVictoriaMetrics,
			ContainerVictoriaTraces,
			ContainerVictoriaLogs,
		},
		nil,
	)
	spec.UseDefaultUser = true
	return spec
}
