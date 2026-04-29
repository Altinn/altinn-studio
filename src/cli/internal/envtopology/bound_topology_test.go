package envtopology_test

import (
	"testing"

	"altinn.studio/studioctl/internal/envtopology"
)

func TestResolveBindings(t *testing.T) {
	t.Parallel()

	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	bindings := topology.ResolveBindings([]envtopology.RuntimeBinding{
		{
			ComponentID: envtopology.ComponentApp,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationHost,
				Kind:     envtopology.DestinationKindHTTP,
			},
			Enabled: true,
		},
		{
			ComponentID: envtopology.ComponentPDF,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationEnv,
				Kind:     envtopology.DestinationKindHTTP,
				URL:      "http://pdf:5031",
			},
			Enabled: true,
		},
	})

	if len(bindings) != 2 {
		t.Fatalf("len(bindings) = %d, want 2", len(bindings))
	}
	if bindings[0].Host != "local.altinn.cloud" || bindings[0].PathPrefix != "" {
		t.Fatalf("app binding did not use topology host: %#v", bindings[0])
	}
	if bindings[1].Host != "pdf.local.altinn.cloud" || bindings[1].PathPrefix != "" {
		t.Fatalf("pdf binding did not use topology route shape: %#v", bindings[1])
	}
}

func TestResolveBindingMissing(t *testing.T) {
	t.Parallel()

	if _, ok := envtopology.NewLocal(envtopology.DefaultIngressPortString()).ResolveBinding(
		envtopology.ComponentID("missing"),
		nil,
	); ok {
		t.Fatal(`ResolveBinding("missing") ok = true, want false`)
	}
}

func TestBoundTopologyConfig(t *testing.T) {
	t.Parallel()

	got := envtopology.NewLocal(envtopology.DefaultIngressPortString()).BoundTopologyConfig(
		[]envtopology.RuntimeBinding{
			{
				ComponentID: envtopology.ComponentApp,
				Destination: envtopology.BoundTopologyDestination{
					Location: envtopology.DestinationLocationHost,
					Kind:     envtopology.DestinationKindHTTP,
				},
				Enabled: true,
			},
			{
				ComponentID: envtopology.ComponentPDF,
				Destination: envtopology.BoundTopologyDestination{
					Location: envtopology.DestinationLocationEnv,
					Kind:     envtopology.DestinationKindHTTP,
					URL:      "http://pdf:5031",
				},
				Enabled: true,
			},
		},
	)

	if got.Version != envtopology.BoundTopologyConfigVersion {
		t.Fatalf("Version = %d, want %d", got.Version, envtopology.BoundTopologyConfigVersion)
	}
	if got.AppRouteTemplate.Host != "local.altinn.cloud" {
		t.Fatalf("AppRouteTemplate.Host = %q, want local.altinn.cloud", got.AppRouteTemplate.Host)
	}
	if got.AppRouteTemplate.PathPrefixTemplate != "/{org}/{app}" {
		t.Fatalf(
			"AppRouteTemplate.PathPrefixTemplate = %q, want /{org}/{app}",
			got.AppRouteTemplate.PathPrefixTemplate,
		)
	}
	if len(got.Routes) != 1 {
		t.Fatalf("len(Routes) = %d, want 1", len(got.Routes))
	}
	if got.Routes[0].Component != envtopology.ComponentPDF {
		t.Fatalf("Routes[0].Component = %q, want %q", got.Routes[0].Component, envtopology.ComponentPDF)
	}
	if got.Routes[0].Destination.URL != "http://pdf:5031" {
		t.Fatalf("pdf destination url = %q, want %q", got.Routes[0].Destination.URL, "http://pdf:5031")
	}
}

func TestBoundTopologyConfigKeepsDisabledRoutes(t *testing.T) {
	t.Parallel()

	got := envtopology.NewLocal(envtopology.DefaultIngressPortString()).BoundTopologyConfig(
		[]envtopology.RuntimeBinding{
			{
				ComponentID: envtopology.ComponentPgAdmin,
				Destination: envtopology.BoundTopologyDestination{
					Location: envtopology.DestinationLocationEnv,
					Kind:     envtopology.DestinationKindHTTP,
					URL:      "http://pgadmin:80",
				},
				Enabled: false,
			},
		},
	)

	if len(got.Routes) != 1 {
		t.Fatalf("len(Routes) = %d, want 1", len(got.Routes))
	}
	if got.Routes[0].Enabled {
		t.Fatal("Routes[0].Enabled = true, want false")
	}
}
