package localtestv2

import (
	"slices"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/resource"
)

var monitoringContainers = []string{ //nolint:gochecknoglobals // A test fixture.
	"victoria-metrics", "victoria-traces", "victoria-logs", "otel-collector", "grafana",
}

func withMonitoring() *Options {
	opts := defaultOptions(testCertDir, testFilesDir)
	opts.Groups = []string{monitoringGroup}
	return opts
}

func TestTheMonitoringGroupStartsTheCollectorItsStoresAndGrafana(t *testing.T) {
	t.Parallel()
	got := selected(withMonitoring())
	for _, name := range monitoringContainers {
		if !slices.Contains(got, name) {
			t.Errorf("--with monitoring leaves out %s", name)
		}
	}
	for _, name := range selected(defaultOptions(testCertDir, testFilesDir)) {
		if slices.Contains(monitoringContainers, name) {
			t.Errorf("the default stack starts %s", name)
		}
	}
	everything, err := ResolveGroups([]string{GroupEverything}, nil)
	if err != nil || !slices.Contains(everything, monitoringGroup) {
		t.Fatalf("everything = %v, %v; want monitoring in it", everything, err)
	}
}

// While the collector runs, every other container gets the standard OpenTelemetry variables, its own name as the
// service name; the monitoring containers get none, so the collector does not export to itself.
func TestTheCollectorGivesEveryOtherContainerTheOTLPVariables(t *testing.T) {
	t.Parallel()
	for name, c := range containersOf(t, withMonitoring()) {
		env := envOf(c)
		if slices.Contains(monitoringContainers, name) {
			for _, key := range []string{
				otlpEndpointVariable, otlpProtocolVariable, otelServiceNameVariable, metricExportIntervalVariable,
			} {
				if value, ok := env[key]; ok {
					t.Errorf("%s: %s=%s", name, key, value)
				}
			}
			continue
		}
		if got := env[otlpEndpointVariable]; got != "http://otel-collector:4317" {
			t.Errorf("%s: endpoint %q", name, got)
		}
		if got := env[otlpProtocolVariable]; got != "grpc" {
			t.Errorf("%s: protocol %q", name, got)
		}
		if got := env[otelServiceNameVariable]; got != name {
			t.Errorf("%s: service name %q", name, got)
		}
		if got := env[metricExportIntervalVariable]; got != "5000" {
			t.Errorf("%s: metric export interval %q", name, got)
		}
	}
}

// While the collector runs, every other container depends on it besides its manifest dependsOn, so it starts once the
// collector is ready and stops before it; the monitoring containers keep their own dependencies, so there is no cycle.
func TestEveryOtherContainerStartsAfterTheCollector(t *testing.T) {
	t.Parallel()
	for _, opts := range []*Options{withMonitoring(), everythingOptions()} {
		for name, c := range containersOf(t, opts) {
			want := slices.Clone(stack().Containers[name].DependsOn)
			if !slices.Contains(monitoringContainers, name) {
				want = append(want, otelCollector)
			}
			var got []string
			for _, dep := range c.DependsOn {
				got = append(got, strings.TrimPrefix(dep.ID().String(), "container:"+containerPrefix))
			}
			if !slices.Equal(got, want) {
				t.Errorf("%s depends on %v, want %v", name, got, want)
			}
		}
		graph := resource.NewGraph("test")
		if err := graph.AddAll(resources(opts, nil)...); err != nil {
			t.Fatalf("graph: %v", err)
		}
		if _, err := graph.TopologicalOrder(); err != nil {
			t.Fatalf("start order: %v", err)
		}
	}
}

func TestWithoutTheCollectorNoContainerDependsOnIt(t *testing.T) {
	t.Parallel()
	for _, opts := range withoutTheCollector() {
		for name, c := range containersOf(t, opts) {
			if len(c.DependsOn) != len(stack().Containers[name].DependsOn) {
				t.Errorf("%s depends on %v, its manifest on %v", name, c.DependsOn, stack().Containers[name].DependsOn)
			}
		}
	}
}

func everythingOptions() *Options {
	opts := defaultOptions(testCertDir, testFilesDir)
	opts.Groups = OptionalGroups()
	return opts
}

// withoutTheCollector are the default stack, minimal mode and every optional group but monitoring.
func withoutTheCollector() []*Options {
	all := defaultOptions(testCertDir, testFilesDir)
	all.Groups = slices.DeleteFunc(OptionalGroups(), func(g string) bool { return g == monitoringGroup })
	return []*Options{defaultOptions(testCertDir, testFilesDir), minimalOptions(), all}
}

func TestWithoutTheCollectorNoContainerGetsTheOTLPVariables(t *testing.T) {
	t.Parallel()
	for _, opts := range withoutTheCollector() {
		for name, c := range containersOf(t, opts) {
			for key, value := range envOf(c) {
				if key == otlpEndpointVariable || key == otlpProtocolVariable || key == otelServiceNameVariable ||
					key == metricExportIntervalVariable || key == "services__otel-collector__http__0" ||
					key == engineGrafanaURLVariable || key == engineGrafanaDatasourceVariable {
					t.Errorf("%s: %s=%s without the collector", name, key, value)
				}
			}
		}
	}
}

// A container's own envs win over the runner's telemetry defaults.
func TestAContainersOwnEnvsWinOverTheOTLPDefaults(t *testing.T) {
	t.Parallel()
	env := containerEnv(
		telemetryEnv(stack().DefaultOrigin(), []string{otelCollector, workflowEngine}, workflowEngine),
		map[string]string{otelServiceNameVariable: "workflow-engine-app", metricExportIntervalVariable: "15000"},
		nil,
		nil,
	)
	for _, want := range []string{
		"OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317",
		"OTEL_EXPORTER_OTLP_PROTOCOL=grpc",
		"OTEL_SERVICE_NAME=workflow-engine-app",
		"OTEL_METRIC_EXPORT_INTERVAL=15000",
	} {
		if !slices.Contains(env, want) {
			t.Errorf("env %v lacks %s", env, want)
		}
	}
	if len(env) != 4 {
		t.Errorf("env %v, want 4 entries", env)
	}
}

// With Grafana running, the workflow engine's dashboard links a workflow's trace to Grafana on the public origin (and
// --host/--port); no other container gets the settings, and the manifest does not set them, so Aspire never gets them.
func TestTheWorkflowEngineLinksItsTracesToGrafanaWhileItRuns(t *testing.T) {
	t.Parallel()
	custom := withMonitoring()
	custom.Origin = stack().Origin("origin.test", 18000)
	for opts, url := range map[*Options]string{
		withMonitoring():    "http://local.altinn.cloud:8000/grafana",
		custom:              "http://origin.test:18000/grafana",
		everythingOptions(): "http://local.altinn.cloud:8000/grafana",
	} {
		for name, c := range containersOf(t, opts) {
			env := envOf(c)
			wantURL, wantUID := "", ""
			if name == workflowEngine {
				wantURL, wantUID = url, "altinn-studio-traces"
			}
			if got := env[engineGrafanaURLVariable]; got != wantURL {
				t.Errorf("%s: %s=%q, want %q", name, engineGrafanaURLVariable, got, wantURL)
			}
			if got := env[engineGrafanaDatasourceVariable]; got != wantUID {
				t.Errorf("%s: %s=%q, want %q", name, engineGrafanaDatasourceVariable, got, wantUID)
			}
		}
	}
	for _, key := range []string{engineGrafanaURLVariable, engineGrafanaDatasourceVariable} {
		if value, ok := stack().Containers[workflowEngine].Envs[key]; ok {
			t.Errorf("the manifest sets %s=%s", key, value)
		}
	}
	// The collector without Grafana: no link to a Grafana that does not run.
	env := telemetryEnv(stack().DefaultOrigin(), []string{otelCollector, workflowEngine}, workflowEngine)
	if _, ok := env[engineGrafanaURLVariable]; ok {
		t.Errorf("without Grafana: %v", env)
	}
}

// The UID the engine links to is the traces datasource Grafana is provisioned with.
func TestTheEngineLinksToGrafanasTracesDatasource(t *testing.T) {
	t.Parallel()
	data, err := stack().ReadFile("monitoring/grafana-datasources.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "uid: "+grafanaTracesDatasourceUID+"\n") {
		t.Errorf("monitoring/grafana-datasources.yaml has no datasource %s", grafanaTracesDatasourceUID)
	}
}

// The front door routes /otlp to the collector's OTLP/HTTP receiver, by its services__ variable, although the
// collector's health is a TCP check.
func TestTheCollectorsHTTPReceiverIsAnnounced(t *testing.T) {
	t.Parallel()
	containers := containersOf(t, withMonitoring())
	env := envOf(containers[frontDoor])
	if got := env["services__otel-collector__http__0"]; got != "http://otel-collector:4318" {
		t.Errorf("the collector is %q", got)
	}
	if got := env["services__grafana__http__0"]; got != "http://grafana:3000" {
		t.Errorf("grafana is %q", got)
	}
	if got := healthTargetOf(otelCollector).String(); got != "tcp otel-collector:4318" {
		t.Errorf("the collector's health is %s", got)
	}
	if got := healthTargetOf("grafana").String(); got != "http://grafana:3000/api/health" {
		t.Errorf("grafana's health is %s", got)
	}
}

func TestGrafanaAndTheCollectorMountTheirFiles(t *testing.T) {
	t.Parallel()
	containers := containersOf(t, withMonitoring())
	want := map[string][]string{
		otelCollector: {"/etc/otelcol-contrib/config.yaml"},
		"grafana": {
			"/etc/grafana/provisioning/dashboards/dashboards.yaml",
			"/etc/grafana/provisioning/datasources/datasources.yaml",
			"/var/lib/grafana/dashboards",
		},
	}
	for name, targets := range want {
		var got []string
		for _, v := range containers[name].Volumes {
			if v.ReadOnly && v.HostPath != testCertDir && v.ContainerPath != legacyCertificateFile {
				got = append(got, v.ContainerPath)
			}
		}
		if !slices.Equal(got, targets) {
			t.Errorf("%s mounts %v, want %v", name, got, targets)
		}
	}
	if got := envOf(containers["grafana"])["GF_SERVER_ROOT_URL"]; got != "http://local.altinn.cloud:8000/grafana/" {
		t.Errorf("grafana's root URL is %q", got)
	}
}
