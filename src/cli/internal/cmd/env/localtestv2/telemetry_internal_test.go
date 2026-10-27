package localtestv2

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/ui"
)

const (
	otelCollector = "otel-collector"
	otelFiles     = "otel-files"
	// testUser and testUsernsMode are a developer's runtime user under Podman.
	testUser       = "1000:1000"
	testUsernsMode = "keep-id"
)

var monitoringContainers = []string{ //nolint:gochecknoglobals // A test fixture.
	"victoria-metrics", "victoria-traces", "victoria-logs", otelCollector, "grafana",
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

// withoutTheCollector are the default stack and every optional group but monitoring: no receiver runs.
func withoutTheCollector() []*Options {
	all := defaultOptions(testCertDir, testFilesDir)
	all.Groups = slices.DeleteFunc(OptionalGroups(), func(g string) bool { return g == monitoringGroup })
	return []*Options{defaultOptions(testCertDir, testFilesDir), all}
}

func TestWithoutTheCollectorNoContainerGetsTheOTLPVariables(t *testing.T) {
	t.Parallel()
	for _, opts := range withoutTheCollector() {
		for name, c := range containersOf(t, opts) {
			for key, value := range envOf(c) {
				if key == otlpEndpointVariable || key == otlpProtocolVariable || key == otelServiceNameVariable ||
					key == metricExportIntervalVariable || key == "services__otlp__http__0" ||
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

// The front door routes /otlp to the running receiver's OTLP/HTTP port, by the service otlp's variable; the collector
// itself is not announced by name, its health being a TCP check.
func TestTheReceiversHTTPPortIsAnnouncedAsOTLP(t *testing.T) {
	t.Parallel()
	for opts, want := range map[*Options]string{
		withMonitoring(): "http://otel-collector:4318",
		minimalOptions(): "http://otel-files:4318",
	} {
		for name, c := range containersOf(t, opts) {
			env := envOf(c)
			if got := env["services__otlp__http__0"]; got != want {
				t.Errorf("%s: otlp is %q, want %q", name, got, want)
			}
			for _, receiver := range []string{otelCollector, otelFiles} {
				if value, ok := env["services__"+receiver+"__http__0"]; ok {
					t.Errorf("%s: %s announced as %s", name, receiver, value)
				}
			}
		}
	}
	containers := containersOf(t, withMonitoring())
	env := envOf(containers[frontDoor])
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
		otelCollector: {"/etc/otelcol-contrib/config.yaml", "/etc/otelcol-contrib/processors.yaml"},
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

// Minimal mode always runs otel-files, the receiver that writes files: every other container sends to it, starts after
// it, and the engine gets no Grafana links, since no Grafana runs.
func TestMinimalModeSendsEveryContainersTelemetryToTheFilesReceiver(t *testing.T) {
	t.Parallel()
	opts := minimalOptions()
	if !slices.Contains(selected(opts), otelFiles) || slices.Contains(selected(opts), otelCollector) {
		t.Fatalf("minimal mode starts %v", selected(opts))
	}
	for name, c := range containersOf(t, opts) {
		env := envOf(c)
		var deps []string
		for _, dep := range c.DependsOn {
			deps = append(deps, strings.TrimPrefix(dep.ID().String(), "container:"+containerPrefix))
		}
		if name == otelFiles {
			if _, ok := env[otlpEndpointVariable]; ok || len(deps) != 0 {
				t.Errorf("otel-files: endpoint %q, depends on %v", env[otlpEndpointVariable], deps)
			}
			continue
		}
		if got := env[otlpEndpointVariable]; got != "http://otel-files:4317" {
			t.Errorf("%s: endpoint %q", name, got)
		}
		if env[otlpProtocolVariable] != "grpc" || env[otelServiceNameVariable] != name ||
			env[metricExportIntervalVariable] != "5000" {
			t.Errorf("%s: %v", name, env)
		}
		if !slices.Contains(deps, otelFiles) {
			t.Errorf("%s depends on %v, not on otel-files", name, deps)
		}
		if _, ok := env[engineGrafanaURLVariable]; ok {
			t.Errorf("%s: a Grafana link in minimal mode", name)
		}
	}
}

// otel-files writes to the telemetry folder on the host, read-write, as the developer (their uid:gid, keep-id under
// Podman), so the files are theirs; no other container gets the folder or the user.
func TestTheFilesReceiverWritesToTheTelemetryFolderAsTheDeveloper(t *testing.T) {
	t.Parallel()
	opts := minimalOptions()
	opts.TelemetryDir = "/home/dev/.altinn-studio/telemetry"
	opts.User, opts.UsernsMode = testUser, testUsernsMode
	for name, c := range containersOf(t, opts) {
		var telemetry []string
		for _, v := range c.Volumes {
			if v.HostPath == opts.TelemetryDir {
				telemetry = append(telemetry, v.ContainerPath)
				if v.ReadOnly || v.Type != "bind" {
					t.Errorf("%s: the telemetry folder is mounted %+v", name, v)
				}
			}
		}
		if name == otelFiles {
			if !slices.Equal(telemetry, []string{"/telemetry"}) || c.User != testUser ||
				c.UsernsMode != testUsernsMode {
				t.Errorf("otel-files: telemetry at %v, user %q, userns %q", telemetry, c.User, c.UsernsMode)
			}
			continue
		}
		if len(telemetry) != 0 || c.User != "" || c.UsernsMode != "" {
			t.Errorf("%s: telemetry at %v, user %q, userns %q", name, telemetry, c.User, c.UsernsMode)
		}
	}
	if !writesTelemetryFiles(opts) || writesTelemetryFiles(withMonitoring()) ||
		writesTelemetryFiles(everythingOptions()) {
		t.Error("only minimal mode writes telemetry files")
	}
}

// writeTelemetry leaves a file in the telemetry folder, as otel-files does, and returns its path.
func writeTelemetry(t *testing.T, dir string) string {
	t.Helper()
	file := filepath.Join(dir, "storage", "traces.jsonl")
	if err := os.MkdirAll(filepath.Dir(file), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(file, []byte("{}\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	return file
}

// Stopping a minimal-mode stack deletes the telemetry folder; stopping the default stack leaves it alone.
func TestTeardownDeletesTheTelemetryFolderOfMinimalModeOnly(t *testing.T) {
	t.Parallel()
	for _, minimal := range []bool{true, false} {
		cfg := testConfig(t)
		writeTestState(t, cfg, minimal)
		file := writeTelemetry(t, localtestv2.TelemetryDir(cfg))
		_, client := newFakeRuntime()
		if err := NewEnv(
			cfg,
			ui.NewOutput(io.Discard, io.Discard, false),
			client,
		).teardown(t.Context(), ""); err != nil {
			t.Fatal(err)
		}
		_, err := os.Stat(localtestv2.TelemetryDir(cfg))
		if minimal && !errors.Is(err, os.ErrNotExist) {
			t.Errorf("minimal mode: the telemetry folder is still there (%v)", err)
		}
		if _, err := os.Stat(file); !minimal && err != nil {
			t.Errorf("default stack: the telemetry file is gone: %v", err)
		}
	}
}

// env up in minimal mode starts with an empty telemetry folder, unless otel-files runs (a converged stack keeps its
// receiver and its open files); another mode does not touch it.
func TestUpEmptiesTheTelemetryFolderUnlessTheReceiverRuns(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	f, client := newFakeRuntime()
	env := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), client)
	opts := minimalOptions()
	opts.TelemetryDir = localtestv2.TelemetryDir(cfg)

	file := writeTelemetry(t, opts.TelemetryDir)
	other := defaultOptions(testCertDir, testFilesDir)
	other.TelemetryDir = opts.TelemetryDir
	if err := env.emptyTelemetry(t.Context(), other); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(file); err != nil {
		t.Errorf("the default stack touched the telemetry folder: %v", err)
	}

	f.containers[containerOf(otelFiles)] = types.ContainerConfig{Name: containerOf(otelFiles)}
	if err := env.emptyTelemetry(t.Context(), opts); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(file); err != nil {
		t.Errorf("a running otel-files lost its file: %v", err)
	}

	delete(f.containers, containerOf(otelFiles))
	if err := env.emptyTelemetry(t.Context(), opts); err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(opts.TelemetryDir)
	if err != nil || len(entries) != 0 {
		t.Errorf("the telemetry folder holds %v (%v), want it empty", entries, err)
	}
}
