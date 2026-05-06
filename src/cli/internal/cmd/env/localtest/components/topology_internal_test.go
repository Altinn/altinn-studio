package components

import (
	"testing"

	"altinn.studio/studioctl/internal/envtopology"
)

func TestLocaltestManifest_Bindings(t *testing.T) {
	t.Parallel()

	got := NewManifest(newOptions(t.TempDir(), true, true)).Bindings
	want := map[envtopology.ComponentID]envtopology.RuntimeBinding{
		envtopology.ComponentApp:      enabledBinding(envtopology.ComponentApp, hostHTTPDestination("")),
		envtopology.ComponentPlatform: enabledBinding(envtopology.ComponentPlatform, emptyDestination()),
		envtopology.ComponentOTel:     enabledBinding(envtopology.ComponentOTel, emptyDestination()),
		envtopology.ComponentPDF: enabledBinding(
			envtopology.ComponentPDF,
			envHTTPDestination("http://"+ContainerPDF3+":5031"),
		),
		envtopology.ComponentGrafana: enabledBinding(
			envtopology.ComponentGrafana,
			envHTTPDestination("http://"+ContainerMonitoringGrafana+":3000"),
		),
		envtopology.ComponentWorkflowEngine: enabledBinding(
			envtopology.ComponentWorkflowEngine,
			envHTTPDestination("http://"+ContainerWorkflowEngine+":8080"),
		),
		envtopology.ComponentPgAdmin: enabledBinding(
			envtopology.ComponentPgAdmin,
			envHTTPDestination("http://"+ContainerPgAdmin+":80"),
		),
		envtopology.ComponentFrontendDevServer: enabledBinding(
			envtopology.ComponentFrontendDevServer,
			hostHTTPDestination("http://127.0.0.1:8080"),
		),
	}
	assertBindings(t, got, want)
}

func TestLocaltestManifest_BindingEnablement(t *testing.T) {
	t.Parallel()

	got := NewManifest(newOptions(t.TempDir(), false, false)).Bindings

	want := map[envtopology.ComponentID]bool{
		envtopology.ComponentApp:               true,
		envtopology.ComponentPlatform:          true,
		envtopology.ComponentOTel:              false,
		envtopology.ComponentPDF:               true,
		envtopology.ComponentGrafana:           false,
		envtopology.ComponentWorkflowEngine:    true,
		envtopology.ComponentPgAdmin:           false,
		envtopology.ComponentFrontendDevServer: true,
	}
	if len(got) != len(want) {
		t.Fatalf("bindings len = %d, want %d", len(got), len(want))
	}
	for _, binding := range got {
		wantEnabled, ok := want[binding.ComponentID]
		if !ok {
			t.Fatalf("unexpected binding for component %q", binding.ComponentID)
		}
		if binding.Enabled != wantEnabled {
			t.Fatalf("%s Enabled = %v, want %v", binding.ComponentID, binding.Enabled, wantEnabled)
		}
		delete(want, binding.ComponentID)
	}
	for componentID := range want {
		t.Fatalf("missing binding for component %q", componentID)
	}
}

func newOptions(dataDir string, includeMonitoring bool, includePgAdmin bool) *Options {
	return &Options{
		Paths:             NewPaths(dataDir),
		IncludeMonitoring: includeMonitoring,
		IncludePgAdmin:    includePgAdmin,
	}
}

func enabledBinding(
	componentID envtopology.ComponentID,
	destination envtopology.BoundTopologyDestination,
) envtopology.RuntimeBinding {
	return envtopology.RuntimeBinding{
		ComponentID: componentID,
		Destination: destination,
		Enabled:     true,
	}
}

func emptyDestination() envtopology.BoundTopologyDestination {
	return envtopology.BoundTopologyDestination{
		Location: "",
		Kind:     "",
		URL:      "",
	}
}

func envHTTPDestination(url string) envtopology.BoundTopologyDestination {
	return envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationEnv,
		Kind:     envtopology.DestinationKindHTTP,
		URL:      url,
	}
}

func hostHTTPDestination(url string) envtopology.BoundTopologyDestination {
	return envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationHost,
		Kind:     envtopology.DestinationKindHTTP,
		URL:      url,
	}
}

func assertBindings(
	t *testing.T,
	got []envtopology.RuntimeBinding,
	want map[envtopology.ComponentID]envtopology.RuntimeBinding,
) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("bindings len = %d, want %d", len(got), len(want))
	}
	for _, binding := range got {
		wantBinding, ok := want[binding.ComponentID]
		if !ok {
			t.Fatalf("unexpected binding for component %q", binding.ComponentID)
		}
		if binding != wantBinding {
			t.Fatalf("binding[%s] = %#v, want %#v", binding.ComponentID, binding, wantBinding)
		}
		delete(want, binding.ComponentID)
	}
	for componentID := range want {
		t.Fatalf("missing binding for component %q", componentID)
	}
}
