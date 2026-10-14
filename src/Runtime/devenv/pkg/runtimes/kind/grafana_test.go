package kind

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

const (
	testDashboardsRepository = "testdata/dashboards"
	studioFolderTitle        = "Altinn Studio"
)

func TestLoadGrafanaContent(t *testing.T) {
	content, err := loadGrafanaContent(testDashboardsRepository, grafanaContentOptions{})
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
	if got := providers.Providers[0]["folder"]; got != studioFolderTitle {
		t.Errorf("dashboard folder = %v, want the GrafanaFolder's title", got)
	}
	if _, ok := content.Dashboards["sample.json"]; !ok || len(content.Dashboards) != 1 {
		t.Errorf("dashboards = %v, want sample.json", content.Dashboards)
	}
	if content.Digest == "" {
		t.Error("digest is empty")
	}
}

func TestLocalDatasource_EscapesTemplateVariables(t *testing.T) {
	entry, err := localDatasource(map[string]any{
		"uid": "altinn-studio-traces",
		"datasource": map[string]any{
			"url": publicObservabilityURL + "traces",
			"jsonData": map[string]any{
				"tracesToLogsV2": map[string]any{"query": `trace_id:="${__span.traceId}"`},
				"tags":           []any{map[string]any{"value": "$__tags"}},
			},
			"secureJsonData": map[string]any{"httpHeaderValue1": authorizationValue},
		},
	})
	if err != nil {
		t.Fatalf("localDatasource() error = %v", err)
	}
	want := map[string]any{
		"uid":   "altinn-studio-traces",
		"orgId": 1,
		"url":   localObservabilityURL + "traces",
		"jsonData": map[string]any{
			"tracesToLogsV2": map[string]any{"query": `trace_id:="$${__span.traceId}"`},
			"tags":           []any{map[string]any{"value": "$$__tags"}},
		},
		"secureJsonData": map[string]any{"httpHeaderValue1": "Bearer " + localQueryToken},
	}
	if !reflect.DeepEqual(entry, want) {
		t.Errorf("localDatasource() = %#v, want template variables escaped and the local query token: %#v", entry, want)
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
	content, err := loadGrafanaContent(repository, grafanaContentOptions{})
	if err != nil {
		t.Fatalf("loadGrafanaContent() error = %v", err)
	}
	if strings.Contains(content.Datasources, "example.invalid") {
		t.Errorf("datasources include one outside the proxy:\n%s", content.Datasources)
	}
}

func TestReadGrafanaResourceFile_MultipleDocuments(t *testing.T) {
	path := filepath.Join(t.TempDir(), "resources.yaml")
	resources := []byte(`---
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaFolder
metadata:
  name: studio
spec:
  title: Altinn Studio
---
---
# A document with only a comment.
---
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
spec:
  uid: altinn-studio-metrics
  datasource:
    type: prometheus
    url: https://altinn.studio/internal/observability/metrics
`)
	if err := os.WriteFile(path, resources, 0o600); err != nil {
		t.Fatal(err)
	}
	read := grafanaResources{folders: map[string]grafanaFolder{}, dashboardFolders: map[string]string{}}
	if err := readGrafanaResourceFile(path, &read); err != nil {
		t.Fatalf("readGrafanaResourceFile() error = %v", err)
	}
	if read.folders["studio"].title != studioFolderTitle {
		t.Errorf("folders = %v, want the GrafanaFolder's title", read.folders)
	}
	if len(read.datasources) != 1 || read.datasources[0]["uid"] != "altinn-studio-metrics" {
		t.Errorf("datasources = %v, want the one GrafanaDatasource", read.datasources)
	}
}
