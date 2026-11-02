package helm_test

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/helm"
	"altinn.studio/devenv/pkg/oci"
	"altinn.studio/devenv/pkg/oci/ocitest"
)

const chartYAML = `apiVersion: v1
description: Test chart
# comment
name: demo
version: 1.2.3
`

// helmConfig is the config blob Helm v3.21.1 pushes for chartYAML.
const helmConfig = `{"name":"demo","version":"1.2.3","description":"Test chart","apiVersion":"v1"}`

func TestPackageAndPushChartMatchesHelm(t *testing.T) {
	t.Parallel()

	registry := ocitest.NewRegistry(t)
	client := helm.NewClient()
	chartDir := writeChart(t, map[string]string{
		".helmignore":           "\uFEFF# comment\n*.bak\n.git/\n/README.md\ntemplates/*.txt\n",
		"Chart.yaml":            chartYAML,
		"values.yaml":           "replicas: 1\n",
		"README.md":             "ignored by /README.md\n",
		"notes.bak":             "ignored by *.bak\n",
		".git/config":           "ignored by .git/\n",
		"templates/deploy.yaml": "kind: Deployment\n",
		"templates/.hidden":     "ignored by Helm's default rule\n",
		"templates/skip.txt":    "ignored by templates/*.txt\n",
		"docs/README.md":        "kept, because /README.md only matches at the root\n",
	})

	packaged, err := client.PackageChart(chartDir, t.TempDir())
	if err != nil {
		t.Fatalf("PackageChart() error = %v", err)
	}
	if filepath.Base(packaged) != "demo-1.2.3.tgz" {
		t.Errorf("package = %s", packaged)
	}
	if pushErr := client.PushChart(packaged, "oci://"+registry.Host()); pushErr != nil {
		t.Fatalf("PushChart() error = %v", pushErr)
	}

	manifest := registry.Manifest(t, "demo", "1.2.3")
	if manifest.Config.MediaType != helm.ConfigMediaType {
		t.Errorf("config media type = %q", manifest.Config.MediaType)
	}
	if config := registry.Blob(t, manifest.Config); string(config) != helmConfig {
		t.Errorf("config = %s, want Helm's %s", config, helmConfig)
	}
	if len(manifest.Layers) != 1 || manifest.Layers[0].MediaType != helm.ChartMediaType {
		t.Fatalf("layers = %+v", manifest.Layers)
	}
	assertChartAnnotations(t, manifest.Annotations)

	archive, err := os.ReadFile(packaged)
	if err != nil {
		t.Fatal(err)
	}
	if layer := registry.Blob(t, manifest.Layers[0]); string(layer) != string(archive) {
		t.Error("chart layer differs from the package")
	}
	entries, _ := ocitest.ReadTarball(t, archive)
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
		"demo/Chart.yaml", "demo/values.yaml", "demo/templates/deploy.yaml", "demo/.helmignore", "demo/docs/README.md",
	}
	slices.Sort(names)
	slices.Sort(want)
	if !slices.Equal(names, want) {
		t.Errorf("chart files = %v, want %v", names, want)
	}
}

func assertChartAnnotations(t *testing.T, annotations map[string]string) {
	t.Helper()
	created, err := time.Parse(time.RFC3339, annotations[oci.AnnotationCreated])
	if err != nil || time.Since(created) > time.Minute {
		t.Errorf("created annotation = %q", annotations[oci.AnnotationCreated])
	}
	delete(annotations, oci.AnnotationCreated)
	want := map[string]string{
		"org.opencontainers.image.description": "Test chart",
		"org.opencontainers.image.title":       "demo",
		"org.opencontainers.image.version":     "1.2.3",
	}
	if !reflect.DeepEqual(annotations, want) {
		t.Errorf("annotations = %v, want Helm's %v", annotations, want)
	}
}

func TestPackageChartRejectsWhatItDoesNotSupport(t *testing.T) {
	t.Parallel()

	chart := "apiVersion: v2\nname: demo\nversion: 1.0.0\n"
	tests := map[string]map[string]string{
		"vendored dependency": {"Chart.yaml": chart, "charts/dep/Chart.yaml": chart},
		"declared dependency": {"Chart.yaml": chart + "dependencies:\n- name: dep\n  repository: oci://x\n"},
		"negated ignore rule": {"Chart.yaml": chart, ".helmignore": "*.yaml\n!values.yaml\n"},
		"double star":         {"Chart.yaml": chart, ".helmignore": "**/*.bak\n"},
		"missing version":     {"Chart.yaml": "name: demo\n"},
		"version traversal":   {"Chart.yaml": "name: demo\nversion: /../../escaped\n"},
		"dot name":            {"Chart.yaml": "name: .\nversion: 1.0.0\n"},
		"parent name":         {"Chart.yaml": "name: ..\nversion: 1.0.0\n"},
		"nested name":         {"Chart.yaml": "name: a/b\nversion: 1.0.0\n"},
		"unknown metadata":    {"Chart.yaml": chart + "appVersion: 1.0.0\n"},
		"unknown API":         {"Chart.yaml": "apiVersion: v3\nname: demo\nversion: 1.0.0\n"},
		"ignored Chart.yaml":  {"Chart.yaml": chart, ".helmignore": "Chart.yaml\n"},
		"dependency lock":     {"Chart.yaml": chart, "Chart.lock": "dependencies: []\n"},
	}
	for name, files := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			_, err := helm.NewClient().PackageChart(writeChart(t, files), t.TempDir())
			if err == nil {
				t.Fatal("PackageChart() error = nil")
			}
			if _, isPathErr := errors.AsType[*os.PathError](err); isPathErr {
				t.Fatalf("PackageChart() error = %v, want a chart error", err)
			}
		})
	}
}

func TestPackageChartRejectsSymlinks(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"Chart.yaml", "templates/link.yaml"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			dir := writeChart(
				t,
				map[string]string{"Chart.yaml": chartYAML, "metadata": chartYAML, "templates/file": ""},
			)
			link := filepath.Join(dir, name)
			if name == "Chart.yaml" {
				if err := os.Remove(link); err != nil {
					t.Fatal(err)
				}
			}
			if err := os.Symlink(filepath.Join(dir, "metadata"), link); err != nil {
				t.Fatal(err)
			}
			if _, err := helm.NewClient().PackageChart(dir, t.TempDir()); err == nil {
				t.Fatal("PackageChart() accepted a symlink")
			}
		})
	}
}

func writeChart(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for name, content := range files {
		file := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(file), 0o750); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(file, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}
