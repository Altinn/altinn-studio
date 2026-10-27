package kind

import (
	"encoding/base64"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
)

const testDashboardsRepository = "testdata/dashboards"

func TestRenderGrafanaContent_Light(t *testing.T) {
	objects := renderTestContent(t, testDashboardsRepository, false)

	for _, name := range []string{
		"GrafanaFolder/external-grafana-studio",
		"GrafanaFolder/external-grafana-studio-observability",
		"GrafanaDashboard/sample",
		"ConfigMap/dashboard-sample",
		"GrafanaDatasource/altinn-studio-metrics",
		"Secret/altinn-studio-metrics-auth",
	} {
		if objects[name] == nil {
			t.Errorf("content lacks %s", name)
		}
	}
	for _, name := range []string{
		"ExternalSecret/altinn-studio-metrics-auth",
		"GrafanaContactPoint/studio-slack-critical",
		"Secret/grafana-slack-webhooks",
	} {
		if objects[name] != nil {
			t.Errorf("light content includes %s", name)
		}
	}

	folder := objects["GrafanaFolder/external-grafana-studio-observability"]
	if parent := testNestedString(folder.Object, "spec", "parentFolderRef"); parent != "external-grafana-studio" {
		t.Errorf("nested folder's parent = %q, want it unchanged", parent)
	}
	datasource := objects["GrafanaDatasource/altinn-studio-metrics"]
	url := testNestedString(datasource.Object, "spec", "datasource", "url")
	if url != localObservabilityURL+"metrics" {
		t.Errorf("datasource URL = %q, want the local proxy's", url)
	}
	header := testNestedString(datasource.Object, "spec", "datasource", "secureJsonData", "httpHeaderValue1")
	if header != "${authorization}" {
		t.Errorf("Authorization header = %q, want the placeholder grafana-operator fills in", header)
	}
	if got := secretValue(
		t,
		objects["Secret/altinn-studio-metrics-auth"],
		"authorization",
	); got != "Bearer "+localQueryToken {
		t.Errorf("datasource Secret = %q, want the local query token", got)
	}
}

func TestRenderGrafanaContent_FullHasAlerting(t *testing.T) {
	objects := renderTestContent(t, testDashboardsRepository, true)

	if objects["GrafanaContactPoint/studio-slack-critical"] == nil {
		t.Fatal("full content lacks the contact point")
	}
	want := "http://alert-recorder.grafana.svc.cluster.local/grafana-slack-webhooks/studio-critical"
	if got := secretValue(t, objects["Secret/grafana-slack-webhooks"], "studio-critical"); got != want {
		t.Errorf("webhook = %q, want %q", got, want)
	}
}

func TestRenderGrafanaContent_SkipsDatasourceOutsideProxy(t *testing.T) {
	repository := t.TempDir()
	dir := filepath.Join(repository, "products", dashboardsProduct, "datasources")
	if err := os.MkdirAll(dir, 0o750); err != nil {
		t.Fatal(err)
	}
	files := map[string]string{
		"kustomization.yaml": "resources:\n  - other.yaml\n",
		"other.yaml": `apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: other
spec:
  datasource:
    type: prometheus
    url: https://example.invalid/prometheus
`,
	}
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	if objects := renderTestContent(t, repository, true); len(objects) != 0 {
		t.Errorf("content = %v, want nothing", objects)
	}
}

func renderTestContent(t *testing.T, repository string, alerting bool) map[string]*unstructured.Unstructured {
	t.Helper()
	manifest, err := renderGrafanaContent(repository, alerting)
	if err != nil {
		t.Fatalf("renderGrafanaContent() error = %v", err)
	}
	objects := map[string]*unstructured.Unstructured{}
	decoder := utilyaml.NewYAMLOrJSONDecoder(strings.NewReader(manifest), len(manifest)+1)
	for {
		var object unstructured.Unstructured
		err := decoder.Decode(&object.Object)
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			t.Fatalf("decode content: %v", err)
		}
		if len(object.Object) > 0 {
			objects[object.GetKind()+"/"+object.GetName()] = &object
		}
	}
	return objects
}

func secretValue(t *testing.T, secret *unstructured.Unstructured, key string) string {
	t.Helper()
	if secret == nil {
		t.Fatal("no Secret")
	}
	encoded := testNestedString(secret.Object, "data", key)
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		t.Fatalf("decode Secret key %s: %v", key, err)
	}
	return string(decoded)
}

func testNestedString(object map[string]any, fields ...string) string {
	value, _, err := unstructured.NestedString(object, fields...)
	if err != nil {
		return ""
	}
	return value
}
