package components

import "altinn.studio/devenv/pkg/resource"

// Container name constants - single source of truth for all container names.
const (
	// ContainerLocaltest is the main localtest container.
	ContainerLocaltest = "localtest"
	// ContainerPDF3 is the PDF service container.
	ContainerPDF3 = "localtest-pdf3"
	// ContainerWorkflowEngineDb is the workflow-engine PostgreSQL database container.
	ContainerWorkflowEngineDb = "localtest-workflow-engine-db"
	// ContainerWorkflowEngine is the workflow engine app container.
	ContainerWorkflowEngine = "localtest-workflow-engine"
	// ContainerPgAdmin is the pgAdmin web UI container.
	ContainerPgAdmin = "localtest-pgadmin"

	// ContainerMonitoringTempo is the Tempo tracing container.
	ContainerMonitoringTempo = "monitoring_tempo"
	// ContainerMonitoringMimir is the Mimir metrics container.
	ContainerMonitoringMimir = "monitoring_mimir"
	// ContainerMonitoringLoki is the Loki logging container.
	ContainerMonitoringLoki = "monitoring_loki"
	// ContainerMonitoringOtelCollector is the OpenTelemetry collector container.
	ContainerMonitoringOtelCollector = "monitoring_otel_collector"
	// ContainerMonitoringGrafana is the Grafana dashboard container.
	ContainerMonitoringGrafana = "monitoring_grafana"
)

// EnabledContainerNames returns enabled container names in manifest order.
func EnabledContainerNames(resources []resource.Resource) []string {
	names := make([]string, 0, len(resources))
	for _, res := range resources {
		containerResource, ok := res.(*resource.Container)
		if !ok || !resource.IsEnabled(containerResource) {
			continue
		}
		names = append(names, containerResource.Name)
	}
	return names
}
