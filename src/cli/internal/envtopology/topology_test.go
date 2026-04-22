package envtopology_test

import (
	"slices"
	"testing"

	"altinn.studio/studioctl/internal/envtopology"
)

func TestLocalTopologyURLs(t *testing.T) {
	t.Parallel()

	topology := envtopology.NewLocal("9080")

	tests := map[string]string{
		"app":              topology.AppBaseURL(),
		"localtest":        topology.LocaltestBaseURL(),
		"localtest pretty": envtopology.NewLocal("80").LocaltestURL(),
		"otel":             topology.OTelURL(),
		"pdf":              topology.PDFURL(),
		"platform":         topology.PlatformAPIBaseURL(),
		"workflow engine":  topology.WorkflowEngineURL(),
	}
	want := map[string]string{
		"app":              "http://local.altinn.cloud:9080/{org}/{app}/",
		"localtest":        "http://local.altinn.cloud:9080",
		"localtest pretty": "http://local.altinn.cloud",
		"otel":             "http://otel.local.altinn.cloud:4317",
		"pdf":              "http://pdf.local.altinn.cloud:9080/pdf",
		"platform":         "http://local.altinn.cloud:9080",
		"workflow engine":  "http://workflow-engine.local.altinn.cloud:9080/api/v1/",
	}
	for name, got := range tests {
		if got != want[name] {
			t.Fatalf("%s URL = %q, want %q", name, got, want[name])
		}
	}
}

func TestLocaltestIngressHosts(t *testing.T) {
	t.Parallel()

	got := envtopology.NewLocal("8000").LocaltestIngressHosts()
	want := []string{
		"local.altinn.cloud",
		"pdf.local.altinn.cloud",
		"workflow-engine.local.altinn.cloud",
		"pgadmin.local.altinn.cloud",
		"app-frontend.local.altinn.cloud",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("LocaltestIngressHosts() = %v, want %v", got, want)
	}
}
