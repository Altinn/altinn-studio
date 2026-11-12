package helm_test

import (
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/helm"
	"altinn.studio/devenv/pkg/oci/ocitest"
)

const chartYAML = `apiVersion: v1
description: Test chart
# comment
name: demo
version: 1.2.3+build
`

// helmConfig is the config blob Helm v3.22.1 pushes for chartYAML.
const helmConfig = `{"name":"demo","version":"1.2.3+build","description":"Test chart","apiVersion":"v1"}`

func TestPushChartMatchesHelm(t *testing.T) {
	t.Parallel()

	registry := ocitest.NewRegistry(t, false)
	chartDir := writeChart(t, map[string]string{
		".helmignore":           "# comment\n*.bak\n.git/\nskip/\n",
		"Chart.yaml":            chartYAML,
		"values.yaml":           "replicas: 1\n",
		"notes.bak":             "ignored by *.bak\n",
		".git/config":           "ignored by .git/\n",
		"docs/skip/README.md":   "ignored by skip/\n",
		"templates/deploy.yaml": "kind: Deployment\n",
		"templates/skip":        "kept, because skip/ only matches directories\n",
		"templates/.hidden":     "ignored by Helm's default rule\n",
	})

	if err := helm.NewClient().PushChart(chartDir, "oci://"+registry.Host()); err != nil {
		t.Fatalf("PushChart() error = %v", err)
	}

	manifest := registry.Manifest(t, "demo:1.2.3_build")
	if manifest.Config.MediaType != "application/vnd.cncf.helm.config.v1+json" {
		t.Errorf("config media type = %q", manifest.Config.MediaType)
	}
	if config := registry.Blob(t, manifest.Config); string(config) != helmConfig {
		t.Errorf("config = %s, want Helm's %s", config, helmConfig)
	}
	if len(manifest.Layers) != 1 ||
		manifest.Layers[0].MediaType != "application/vnd.cncf.helm.chart.content.v1.tar+gzip" {
		t.Fatalf("layers = %+v", manifest.Layers)
	}
	const createdKey = "org.opencontainers.image.created"
	if created, err := time.Parse(time.RFC3339, manifest.Annotations[createdKey]); err != nil ||
		time.Since(created) > time.Minute {
		t.Errorf("created annotation = %q", manifest.Annotations[createdKey])
	}
	delete(manifest.Annotations, createdKey)
	wantAnnotations := map[string]string{
		"org.opencontainers.image.description": "Test chart",
		"org.opencontainers.image.title":       "demo",
		"org.opencontainers.image.version":     "1.2.3+build",
	}
	if !reflect.DeepEqual(manifest.Annotations, wantAnnotations) {
		t.Errorf("annotations = %v, want Helm's %v", manifest.Annotations, wantAnnotations)
	}

	entries, _ := ocitest.ReadTarball(t, registry.Blob(t, manifest.Layers[0]))
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.Mode != 0o644 {
			t.Errorf("%s has mode %o", entry.Name, entry.Mode)
		}
		if entry.Name == "demo/Chart.yaml" && entry.Content != chartYAML {
			t.Errorf("Chart.yaml = %q, want the file as on disk", entry.Content)
		}
		names = append(names, entry.Name)
	}
	// Compare files rather than tar order; Helm groups templates separately.
	want := []string{
		"demo/.helmignore", "demo/Chart.yaml", "demo/templates/deploy.yaml", "demo/templates/skip", "demo/values.yaml",
	}
	slices.Sort(names)
	if !slices.Equal(names, want) {
		t.Errorf("chart files = %v, want %v", names, want)
	}
}

func TestPushChartRejectsWhatItDoesNotSupport(t *testing.T) {
	t.Parallel()

	chart := "apiVersion: v2\nname: demo\nversion: 1.0.0\n"
	tests := map[string]map[string]string{
		"vendored dependency": {"Chart.yaml": chart, "charts/dep/Chart.yaml": chart},
		"declared dependency": {"Chart.yaml": chart + "dependencies:\n- name: dep\n  repository: oci://x\n"},
		"dependency lock":     {"Chart.yaml": chart, "Chart.lock": "dependencies: []\n"},
		"negated ignore rule": {"Chart.yaml": chart, ".helmignore": "*.yaml\n!values.yaml\n"},
		"double star":         {"Chart.yaml": chart, ".helmignore": "**/*.bak\n"},
		"path ignore rule":    {"Chart.yaml": chart, ".helmignore": "templates/*.txt\n"},
		"missing version":     {"Chart.yaml": "name: demo\n"},
		"invalid tag":         {"Chart.yaml": "name: demo\nversion: /../escaped\n"},
		"symlink":             {"Chart.yaml": chart, "templates/link": "->Chart.yaml"},
	}
	for name, files := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			registry := ocitest.NewRegistry(t, false)
			if err := helm.NewClient().PushChart(writeChart(t, files), "oci://"+registry.Host()); err == nil {
				t.Fatal("PushChart() error = nil")
			}
		})
	}
}

// writeChart writes files into a new directory. Content starting with -> makes a symlink to the rest.
func writeChart(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for name, content := range files {
		file := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(file), 0o750); err != nil {
			t.Fatal(err)
		}
		var err error
		if target, ok := strings.CutPrefix(content, "->"); ok {
			err = os.Symlink(filepath.Join(dir, target), file)
		} else {
			err = os.WriteFile(file, []byte(content), 0o600)
		}
		if err != nil {
			t.Fatal(err)
		}
	}
	return dir
}
