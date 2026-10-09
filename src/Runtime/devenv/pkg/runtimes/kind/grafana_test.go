package kind

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

const testDashboardsRepository = "testdata/dashboards"

func TestLoadGrafanaContent(t *testing.T) {
	content, err := loadGrafanaContent(testDashboardsRepository)
	if err != nil {
		t.Fatalf("loadGrafanaContent() error = %v", err)
	}

	var datasources struct {
		Datasources []map[string]any `json:"datasources"`
	}
	if err := yaml.Unmarshal([]byte(content.Datasources), &datasources); err != nil {
		t.Fatalf("parse datasources: %v", err)
	}
	if len(datasources.Datasources) != 1 {
		t.Fatalf("datasources = %v, want the one GrafanaDatasource", datasources.Datasources)
	}
	metrics := datasources.Datasources[0]
	want := map[string]any{
		"uid":  "altinn-studio-metrics",
		"name": "altinn-studio-metrics",
		"type": "prometheus",
		"url":  "http://observability-proxy.observability.svc.cluster.local/internal/observability/metrics",
	}
	for key, value := range want {
		if metrics[key] != value {
			t.Errorf("datasource %s = %v, want %v", key, metrics[key], value)
		}
	}
	secure, ok := metrics["secureJsonData"].(map[string]any)
	if !ok {
		t.Fatalf("secureJsonData = %v", metrics["secureJsonData"])
	}
	if got := secure["httpHeaderValue1"]; got != "Bearer "+localQueryToken {
		t.Errorf("Authorization header = %v, want the local query token", got)
	}

	var providers struct {
		Providers []map[string]any `json:"providers"`
	}
	if err := yaml.Unmarshal([]byte(content.DashboardProviders), &providers); err != nil {
		t.Fatalf("parse dashboard providers: %v", err)
	}
	if got := providers.Providers[0]["folder"]; got != "Altinn Studio" {
		t.Errorf("dashboard folder = %v, want the GrafanaFolder's title", got)
	}
	if _, ok := content.Dashboards["sample.json"]; !ok || len(content.Dashboards) != 1 {
		t.Errorf("dashboards = %v, want sample.json", content.Dashboards)
	}
	if content.Digest == "" {
		t.Error("digest is empty")
	}
}

func TestLoadGrafanaContent_SkipsDatasourceOutsideProxy(t *testing.T) {
	repository := t.TempDir()
	dir := filepath.Join(repository, "products", dashboardsProduct, "datasources")
	if err := os.MkdirAll(dir, 0o750); err != nil {
		t.Fatal(err)
	}
	datasource := []byte(`apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
spec:
  uid: other
  datasource:
    type: prometheus
    url: https://example.invalid/prometheus
`)
	if err := os.WriteFile(filepath.Join(dir, "other.yaml"), datasource, 0o600); err != nil {
		t.Fatal(err)
	}
	content, err := loadGrafanaContent(repository)
	if err != nil {
		t.Fatalf("loadGrafanaContent() error = %v", err)
	}
	if strings.Contains(content.Datasources, "example.invalid") {
		t.Errorf("datasources include one outside the proxy:\n%s", content.Datasources)
	}
}
