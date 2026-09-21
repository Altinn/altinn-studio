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

	// ContainerVictoriaMetrics is the localtest VictoriaMetrics container.
	ContainerVictoriaMetrics = "localtest_victoria_metrics"
	// ContainerVictoriaTraces is the localtest VictoriaTraces container.
	ContainerVictoriaTraces = "localtest_victoria_traces"
	// ContainerVictoriaLogs is the localtest VictoriaLogs container.
	ContainerVictoriaLogs = "localtest_victoria_logs"
	// ContainerOtelCollector is the localtest OpenTelemetry collector container.
	ContainerOtelCollector = "localtest_otel_collector"
	// ContainerGrafana is the localtest Grafana dashboard container.
	ContainerGrafana = "localtest_grafana"
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
