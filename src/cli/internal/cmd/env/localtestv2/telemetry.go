package localtestv2

import (
	"context"
	"fmt"
	"maps"
	"os"
	"slices"
	"strconv"

	"altinn.studio/studioctl/internal/localtestv2/manifest"
	"altinn.studio/studioctl/internal/osutil"
)

// Telemetry: the manifest marks the stack's OpenTelemetry receiver (otlpReceiver): the monitoring group's collector,
// which exports to the Victoria stores Grafana reads, or minimal mode's otel-files, which writes JSON Lines files to a
// folder on the host. The manifest's groups never run two at once. While one runs, every other container is told where
// to send its telemetry through the standard OpenTelemetry variables. A component exports exactly when they are set.
const (
	// monitoringGroup is the manifest group of the collector, its stores and Grafana.
	monitoringGroup = "monitoring"
	// otlpService is the service name under which the running receiver's OTLP/HTTP port (its manifest port) is
	// announced: the front door's /otlp route forwards to services__otlp__http__0, whichever receiver runs.
	otlpService = "otlp"

	otlpEndpointVariable    = "OTEL_EXPORTER_OTLP_ENDPOINT"
	otlpProtocolVariable    = "OTEL_EXPORTER_OTLP_PROTOCOL"
	otelServiceNameVariable = "OTEL_SERVICE_NAME"
	// metricExportIntervalVariable is the SDKs' metric export interval in milliseconds. Locally 5 s instead of the
	// specification's 60 s, so a dashboard shows a request within seconds.
	metricExportIntervalVariable = "OTEL_METRIC_EXPORT_INTERVAL"
	metricExportInterval         = "5000"

	// grafana is Grafana's manifest name. The front door serves it under grafanaPath on the public origin.
	grafana     = "grafana"
	grafanaPath = "/grafana"
	// workflowEngine is the workflow engine's manifest name. Its dashboard links a workflow's trace to Grafana's Explore
	// when it has Grafana's URL and the traces datasource's UID (grafanaTracesDatasourceUID, the UID in
	// monitoring/grafana-datasources.yaml).
	workflowEngine                  = "workflow-engine"
	engineGrafanaURLVariable        = "EngineSettings__Dashboard__GrafanaUrl"
	engineGrafanaDatasourceVariable = "EngineSettings__Dashboard__GrafanaTracesDatasourceUid"
	grafanaTracesDatasourceUID      = "altinn-studio-traces"
)

// receiver is the running OTLP receiver's manifest name, or "" when none runs.
func receiver(running []string) string {
	receivers := stack().Receivers(running)
	if len(receivers) == 0 {
		return ""
	}
	return receivers[0]
}

// sendsTelemetry reports whether a container is given the receiver: while a receiver runs, every container but the
// receiver, what it depends on (the collector's stores) and the monitoring group (Grafana reads the stores).
func sendsTelemetry(running []string, name string) bool {
	r := receiver(running)
	if r == "" {
		return false
	}
	return !slices.Contains(dependencyClosure(r), name) &&
		!slices.Contains(stack().Select([]string{monitoringGroup}), name)
}

// dependencyClosure is the container and everything it depends on, transitively.
func dependencyClosure(name string) []string {
	out := []string{name}
	for i := 0; i < len(out); i++ {
		for _, dep := range stack().Containers[out[i]].DependsOn {
			if !slices.Contains(out, dep) {
				out = append(out, dep)
			}
		}
	}
	return out
}

// telemetryEnv is what a container gets while a receiver runs: the receiver's gRPC address, the protocol, its own name
// as the service name and the metric export interval, and for the workflow engine its dashboard's trace links
// (engineTraceLinks). The receiver's side gets none, so the receiver never exports to itself, and nothing is added
// while no receiver runs. The container's own envs win (containerEnv).
func telemetryEnv(origin manifest.Origin, running []string, name string) map[string]string {
	if !sendsTelemetry(running, name) {
		return nil
	}
	r := receiver(running)
	env := map[string]string{
		otlpEndpointVariable:         "http://" + r + ":" + strconv.Itoa(stack().Containers[r].OTLPReceiver.GRPCPort),
		otlpProtocolVariable:         "grpc",
		otelServiceNameVariable:      name,
		metricExportIntervalVariable: metricExportInterval,
	}
	maps.Copy(env, engineTraceLinks(origin, running, name))
	return env
}

// engineTraceLinks are the workflow engine's dashboard settings that link a workflow's trace to Grafana on the public
// origin, while Grafana runs (the monitoring group, whose collector receives the engine's traces). They are runner
// data, not manifest envs: without the group the links would lead to the front door's "not running" page, and the
// Aspire host, which ignores the group, links its own dashboard. Minimal mode's receiver has no Grafana, so no links.
func engineTraceLinks(origin manifest.Origin, running []string, name string) map[string]string {
	if name != workflowEngine || !slices.Contains(running, grafana) {
		return nil
	}
	return map[string]string{
		engineGrafanaURLVariable:        origin.URL() + grafanaPath,
		engineGrafanaDatasourceVariable: grafanaTracesDatasourceUID,
	}
}

// telemetryDependsOn is the runner's dependency of a container that sends telemetry on the receiver, besides its
// manifest dependsOn: it starts once the receiver is ready, so its first export finds it, and stops before the
// receiver, so its last one does too. The receiver's side gets no such dependency, so it cannot make a cycle. The
// receiver's readiness, a TCP connection to its OTLP/HTTP port (4318), also covers the gRPC port the containers use
// (4317): the collector starts its receivers after its exporters and processors, and the OTLP receiver opens its gRPC
// listener before its HTTP one (otlpReceiver.Start).
func telemetryDependsOn(running []string, name string) []string {
	if !sendsTelemetry(running, name) {
		return nil
	}
	return []string{receiver(running)}
}

// otlpServiceVariable announces the running receiver's OTLP/HTTP port as the service otlp, for the front door's /otlp
// route. nil while no receiver runs, so the route answers "not running".
func otlpServiceVariable(running []string) map[string]string {
	r := receiver(running)
	if r == "" {
		return nil
	}
	return map[string]string{
		"services__" + otlpService + "__http__0": "http://" + r + ":" + strconv.Itoa(stack().Containers[r].HTTPPort()),
	}
}

// writesTelemetryFiles reports whether the options start an OTLP receiver that writes to the telemetry folder on the
// host (minimal mode's otel-files).
func writesTelemetryFiles(opts *Options) bool {
	for _, name := range selected(opts) {
		if writesToHost(stack().Containers[name]) {
			return true
		}
	}
	return false
}

// emptyTelemetry starts a stack that writes telemetry files with an empty, existing telemetry folder, which also
// clears what a stack that crashed without env down left. A running receiver keeps its folder: env up on a converged
// minimal-mode stack (another dev build, say) leaves the receiver as it is, writing to open files.
func (e *Env) emptyTelemetry(ctx context.Context, opts *Options) error {
	if !writesTelemetryFiles(opts) {
		return nil
	}
	r := receiver(selected(opts))
	if info, err := e.client.ContainerInspect(ctx, containerOf(r)); err == nil && info.State.Running {
		return nil
	}
	if err := os.RemoveAll(opts.TelemetryDir); err != nil {
		return fmt.Errorf("empty the telemetry folder: %w", err)
	}
	if err := os.MkdirAll(opts.TelemetryDir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create the telemetry folder: %w", err)
	}
	return nil
}
