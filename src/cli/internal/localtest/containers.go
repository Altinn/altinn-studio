package localtest

// Container name constants - single source of truth for all container names.
const (
	// ContainerLocaltest is the main localtest container.
	ContainerLocaltest = "localtest"
	// ContainerPDF3 is the PDF service container.
	ContainerPDF3 = "localtest-pdf3"

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

// coreContainerNames returns the core container names in order.
func coreContainerNames() []string {
	return []string{
		ContainerLocaltest,
		ContainerPDF3,
	}
}

// monitoringContainerNames returns monitoring container names in order.
func monitoringContainerNames() []string {
	return []string{
		ContainerMonitoringTempo,
		ContainerMonitoringMimir,
		ContainerMonitoringLoki,
		ContainerMonitoringOtelCollector,
		ContainerMonitoringGrafana,
	}
}

// AllContainerNames returns all container names in order (for log streaming).
// If includeMonitoring is true, monitoring containers are included.
func AllContainerNames(includeMonitoring bool) []string {
	core := coreContainerNames()
	if !includeMonitoring {
		return core
	}

	monitoring := monitoringContainerNames()
	result := make([]string, 0, len(core)+len(monitoring))
	result = append(result, core...)
	result = append(result, monitoring...)
	return result
}
