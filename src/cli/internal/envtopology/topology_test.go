package envtopology_test

import (
	"bytes"
	_ "embed"
	"slices"
	"testing"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/envtopology"
)

//go:embed topology.yaml
var embeddedTopology []byte

func TestLocalTopologyURLs(t *testing.T) {
	t.Parallel()

	topology := envtopology.NewLocal("9080")

	tests := map[string]string{
		"app":              topology.AppBaseURL(),
		"grafana route":    topology.PublicRouteURL(envtopology.ComponentGrafana),
		"localtest":        topology.LocaltestBaseURL(),
		"localtest pretty": envtopology.NewLocal("80").LocaltestURL(),
		"otel":             topology.OTelURL(),
		"pdf root":         topology.PublicBaseURL(envtopology.ComponentPDF),
		"platform":         topology.PlatformAPIBaseURL(),
		"workflow root":    topology.PublicBaseURL(envtopology.ComponentWorkflowEngine),
	}
	want := map[string]string{
		"app":              "http://local.altinn.cloud:9080/{org}/{app}/",
		"grafana route":    "http://local.altinn.cloud:9080/grafana",
		"localtest":        "http://local.altinn.cloud:9080",
		"localtest pretty": "http://local.altinn.cloud",
		"otel":             "http://otel.local.altinn.cloud:4317",
		"pdf root":         "http://pdf.local.altinn.cloud:9080",
		"platform":         "http://local.altinn.cloud:9080",
		"workflow root":    "http://workflow-engine.local.altinn.cloud:9080",
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

func TestHostFileHostnames(t *testing.T) {
	t.Parallel()

	got := envtopology.NewLocal("8000").HostFileHostnames()
	want := []string{
		"local.altinn.cloud",
		"pdf.local.altinn.cloud",
		"workflow-engine.local.altinn.cloud",
		"pgadmin.local.altinn.cloud",
		"app-frontend.local.altinn.cloud",
		"otel.local.altinn.cloud",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("HostFileHostnames() = %v, want %v", got, want)
	}
}

func TestEmbeddedTopologyYAMLRoundTrip(t *testing.T) {
	t.Parallel()

	var node yaml.Node
	if err := yaml.Unmarshal(embeddedTopology, &node); err != nil {
		t.Fatalf("yaml.Unmarshal(embeddedTopology) error = %v", err)
	}

	var buf bytes.Buffer
	encoder := yaml.NewEncoder(&buf)
	encoder.SetIndent(2)
	if err := encoder.Encode(&node); err != nil {
		t.Fatalf("encoder.Encode(...) error = %v", err)
	}
	if err := encoder.Close(); err != nil {
		t.Fatalf("encoder.Close() error = %v", err)
	}

	if !bytes.Equal(buf.Bytes(), embeddedTopology) {
		t.Fatalf(
			"embedded topology yaml roundtrip mismatch\n--- got ---\n%s\n--- want ---\n%s",
			buf.Bytes(),
			embeddedTopology,
		)
	}
}
