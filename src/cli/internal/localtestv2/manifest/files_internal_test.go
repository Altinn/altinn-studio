package manifest

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"slices"
	"strings"
	"testing"
	"testing/fstest"
)

// testFiles is a manifest directory with a folder of files beside the manifest.
func testFiles() fstest.MapFS {
	return fstest.MapFS{
		"manifest.json":                     {Data: manifestJSON},
		"monitoring/otel-collector.yaml":    {Data: []byte("receivers: {}\n")},
		"monitoring/dashboards/app.json":    {Data: []byte("{}\n")},
		"monitoring/dashboards/engine.json": {Data: []byte("{}\n")},
	}
}

// withFiles parses the embedded manifest with storage's files set to files, against testFiles.
func withFiles(t *testing.T, files map[string]any) (*Manifest, error) {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatal(err)
	}
	// Only storage mounts files, from testFiles.
	containers, ok := m["containers"].(map[string]any)
	if !ok {
		t.Fatal("no containers")
	}
	for name := range containers {
		delete(containerNamed(m, name), "files")
	}
	containerNamed(m, "storage")["files"] = files
	data, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	return Parse(data, testFiles())
}

func TestParseReadsFilesAndFolders(t *testing.T) {
	t.Parallel()
	m, err := withFiles(t, map[string]any{
		"/etc/otelcol-contrib/config.yaml": "monitoring/otel-collector.yaml",
		"/var/lib/grafana/dashboards":      "monitoring/dashboards",
	})
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"/etc/otelcol-contrib/config.yaml": "monitoring/otel-collector.yaml",
		"/var/lib/grafana/dashboards":      "monitoring/dashboards",
	}
	if got := m.Containers["storage"].Files; len(got) != len(want) ||
		got["/var/lib/grafana/dashboards"] != want["/var/lib/grafana/dashboards"] ||
		got["/etc/otelcol-contrib/config.yaml"] != want["/etc/otelcol-contrib/config.yaml"] {
		t.Fatalf("files %v, want %v", got, want)
	}
	// The manifest itself is not shipped as a file: only the folders beside it are.
	shipped := []string{
		"monitoring/dashboards/app.json", "monitoring/dashboards/engine.json", "monitoring/otel-collector.yaml",
	}
	if got := m.ShippedFiles(); !slices.Equal(got, shipped) {
		t.Fatalf("shipped %v, want %v", got, shipped)
	}
	data, err := m.ReadFile("monitoring/otel-collector.yaml")
	if err != nil || string(data) != "receivers: {}\n" {
		t.Fatalf("ReadFile = %q, %v", data, err)
	}
	if _, err := m.ReadFile("manifest.json"); !errors.Is(err, errNoFile) {
		t.Fatalf("ReadFile(manifest.json) = %v, want %v", err, errNoFile)
	}
}

func TestParseRefusesBadFiles(t *testing.T) {
	t.Parallel()
	cases := map[string]struct {
		files map[string]any
		want  error
	}{
		"relative container path":    {map[string]any{"etc/config.yaml": "monitoring/otel-collector.yaml"}, errValue},
		"the root as container path": {map[string]any{"/": "monitoring/dashboards"}, errValue},
		"unclean container path":     {map[string]any{"/etc//config.yaml": "monitoring/otel-collector.yaml"}, errValue},
		"container path with a trailing slash": {
			map[string]any{"/var/lib/grafana/dashboards/": "monitoring/dashboards"}, errValue,
		},
		"container path with ..": {map[string]any{"/etc/../config.yaml": "monitoring/otel-collector.yaml"}, errValue},
		"absolute source":        {map[string]any{"/etc/config.yaml": "/monitoring/otel-collector.yaml"}, errValue},
		"source with ..":         {map[string]any{"/etc/config.yaml": "../monitoring/otel-collector.yaml"}, errValue},
		"source through ..": {
			map[string]any{"/etc/config.yaml": "monitoring/../monitoring/otel-collector.yaml"}, errValue,
		},
		"source with .":      {map[string]any{"/etc/config.yaml": "./monitoring/otel-collector.yaml"}, errValue},
		"the directory":      {map[string]any{"/etc/config": "."}, errValue},
		"empty source":       {map[string]any{"/etc/config.yaml": ""}, errValue},
		"backslash source":   {map[string]any{"/etc/config.yaml": `monitoring\otel-collector.yaml`}, errValue},
		"source not shipped": {map[string]any{"/etc/config.yaml": "monitoring/grafana.yaml"}, errNoFile},
		"a name's prefix":    {map[string]any{"/etc/config.yaml": "monitoring/otel"}, errNoFile},
		"the manifest":       {map[string]any{"/etc/manifest.json": "manifest.json"}, errNoFile},
		"a volume's path":    {map[string]any{"/data/blobs": "monitoring/dashboards"}, errDuplicate},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			_, err := withFiles(t, c.files)
			if !errors.Is(err, c.want) || !errors.Is(err, errInvalid) {
				t.Fatalf("got %v, want %v", err, c.want)
			}
		})
	}
}

func TestParseRefusesAContainerPathNamedTwiceAndANonStringSource(t *testing.T) {
	t.Parallel()
	const manifest = `{"groups":[{"name":"default","containers":["a"]}],"public":{"host":"local.altinn.cloud",` +
		`"port":8000},"containers":{"a":{"registry":"r","tag":"t",` +
		`"files":{"/etc/config.yaml":"monitoring/otel-collector.yaml","/etc/config.yaml":"monitoring/dashboards/app.json"}}}}`
	if _, err := Parse([]byte(manifest), testFiles()); !errors.Is(err, errDuplicate) {
		t.Fatalf("container path named twice: %v", err)
	}
	nonString := strings.Replace(manifest, `"monitoring/dashboards/app.json"`, `1`, 1)
	if _, err := Parse([]byte(nonString), testFiles()); err == nil || !errors.Is(err, errInvalid) {
		t.Fatalf("non-string source: %v", err)
	}
	once := strings.Replace(manifest, `,"/etc/config.yaml":"monitoring/dashboards/app.json"`, ``, 1)
	if _, err := Parse([]byte(once), testFiles()); err != nil {
		t.Fatalf("container path named once: %v", err)
	}
	if _, err := Parse([]byte(once), nil); !errors.Is(err, errNoFile) {
		t.Fatalf("nothing shipped: %v", err)
	}
}

// Every file in a folder beside manifest.json ships with it (the bundle's go:embed directive names the folder), so the
// Aspire package, which embeds every such folder, and studioctl ship the same files.
func TestEveryFolderBesideTheManifestShips(t *testing.T) {
	t.Parallel()
	shipped := MustDefault().ShippedFiles()
	var onDisk []string
	err := fs.WalkDir(os.DirFS("."), ".", func(name string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && strings.Contains(name, "/") {
			onDisk = append(onDisk, name)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(onDisk, shipped) {
		t.Fatalf("files beside the manifest %v, shipped %v: name each folder in bundle's go:embed directive", onDisk,
			shipped)
	}
}

// The collectors read monitoring/otel-processors.yaml through their file provider, which expands the file's text,
// comments included: a dollar-brace anywhere in it fails the collector's start ("too many recursive expansions").
func TestTheSharedProcessorsExpandNothing(t *testing.T) {
	t.Parallel()
	data, err := MustDefault().ReadFile("monitoring/otel-processors.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "${") {
		t.Error("monitoring/otel-processors.yaml contains ${")
	}
}
