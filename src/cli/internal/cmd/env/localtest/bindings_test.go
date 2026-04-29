package localtest_test

import (
	"slices"
	"testing"

	"altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/envtopology"
)

func TestRuntimeBindings(t *testing.T) {
	t.Parallel()

	got := localtest.RuntimeBindings(localtest.BindingOptions{
		IncludeMonitoring: true,
		IncludePgAdmin:    true,
	})

	wantIDs := []envtopology.ComponentID{
		envtopology.ComponentApp,
		envtopology.ComponentPlatform,
		envtopology.ComponentOTel,
		envtopology.ComponentPDF,
		envtopology.ComponentGrafana,
		envtopology.ComponentWorkflowEngine,
		envtopology.ComponentPgAdmin,
		envtopology.ComponentFrontendDevServer,
	}
	gotIDs := make([]envtopology.ComponentID, 0, len(got))
	for _, binding := range got {
		gotIDs = append(gotIDs, binding.ComponentID)
	}
	if !slices.Equal(gotIDs, wantIDs) {
		t.Fatalf("binding ids = %v, want %v", gotIDs, wantIDs)
	}

	assertEnabledBinding(t, got[0], envtopology.ComponentApp, envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationHost,
		Kind:     envtopology.DestinationKindHTTP,
	})
	assertEnabledBinding(t, got[3], envtopology.ComponentPDF, envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationEnv,
		Kind:     envtopology.DestinationKindHTTP,
		URL:      "http://" + localtest.ContainerPDF3 + ":5031",
	})
	assertEnabledBinding(t, got[4], envtopology.ComponentGrafana, envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationEnv,
		Kind:     envtopology.DestinationKindHTTP,
		URL:      "http://" + localtest.ContainerMonitoringGrafana + ":3000",
	})
	assertEnabledBinding(t, got[5], envtopology.ComponentWorkflowEngine, envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationEnv,
		Kind:     envtopology.DestinationKindHTTP,
		URL:      "http://" + localtest.ContainerWorkflowEngine + ":8080",
	})
	assertEnabledBinding(t, got[6], envtopology.ComponentPgAdmin, envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationEnv,
		Kind:     envtopology.DestinationKindHTTP,
		URL:      "http://" + localtest.ContainerPgAdmin + ":80",
	})
	assertEnabledBinding(t, got[7], envtopology.ComponentFrontendDevServer, envtopology.BoundTopologyDestination{
		Location: envtopology.DestinationLocationHost,
		Kind:     envtopology.DestinationKindHTTP,
		URL:      "http://127.0.0.1:8080",
	})
}

func TestRuntimeBindingsEnabled(t *testing.T) {
	t.Parallel()

	got := localtest.RuntimeBindings(localtest.BindingOptions{
		IncludeMonitoring: false,
		IncludePgAdmin:    false,
	})

	if got[2].Enabled {
		t.Fatalf("otel Enabled = true, want false")
	}
	if got[4].Enabled {
		t.Fatalf("grafana Enabled = true, want false")
	}
	if got[6].Enabled {
		t.Fatalf("pgadmin Enabled = true, want false")
	}
	if !got[3].Enabled || !got[5].Enabled {
		t.Fatalf("pdf/workflow bindings should stay enabled: %#v %#v", got[3], got[5])
	}
}

func assertEnabledBinding(
	t *testing.T,
	got envtopology.RuntimeBinding,
	componentID envtopology.ComponentID,
	destination envtopology.BoundTopologyDestination,
) {
	t.Helper()
	if got.ComponentID != componentID {
		t.Fatalf("ComponentID = %q, want %q", got.ComponentID, componentID)
	}
	if !got.Enabled {
		t.Fatal("Enabled = false, want true")
	}
	if got.Destination != destination {
		t.Fatalf("Destination = %#v, want %#v", got.Destination, destination)
	}
}
