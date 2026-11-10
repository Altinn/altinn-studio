package localtestv2

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
	"testing/fstest"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
)

const filesManifest = `{
	"groups": [{"name": "default", "containers": ["collector"]}],
	"public": {"host": "local.altinn.cloud", "port": 8000},
	"containers": {
		"collector": {
			"registry": "example.test/collector",
			"tag": "1.0",
			"files": {
				"/etc/collector/config.yaml": "monitoring/collector.yaml",
				"/etc/dashboards": "monitoring/dashboards"
			},
			"volumes": {"collector-data": "/data"}
		}
	}
}`

func parseFilesManifest(t *testing.T, files fstest.MapFS) *manifest.Manifest {
	t.Helper()
	m, err := manifest.Parse([]byte(filesManifest), files)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func shippedTestFiles() fstest.MapFS {
	return fstest.MapFS{
		"monitoring/collector.yaml":      {Data: []byte("receivers: {}\n")},
		"monitoring/dashboards/app.json": {Data: []byte("{}\n")},
	}
}

func TestAContainersFilesAreMountedReadOnlyFromTheFilesDirectory(t *testing.T) {
	t.Parallel()
	c := parseFilesManifest(t, shippedTestFiles()).Containers["collector"]
	for _, relabel := range []bool{false, true} {
		opts := defaultOptions(testCertDir, testFilesDir)
		opts.RelabelBinds = relabel
		want := types.SELinuxRelabelNone
		if relabel {
			want = types.SELinuxRelabelShared
		}
		volumes := containerVolumes(opts, c)
		// The certificate's two mounts, the files sorted by their path in the container, then the volumes.
		got := volumes[2:]
		expected := []types.VolumeMount{
			{
				HostPath:       filepath.Join(testFilesDir, "monitoring", "collector.yaml"),
				ContainerPath:  "/etc/collector/config.yaml",
				Type:           types.VolumeMountTypeBind,
				SELinuxRelabel: want,
				ReadOnly:       true,
			},
			{
				HostPath:       filepath.Join(testFilesDir, "monitoring", "dashboards"),
				ContainerPath:  "/etc/dashboards",
				Type:           types.VolumeMountTypeBind,
				SELinuxRelabel: want,
				ReadOnly:       true,
			},
			{
				HostPath:      volumeName("collector-data"),
				ContainerPath: "/data",
				Type:          types.VolumeMountTypeVolume,
			},
		}
		if !slices.Equal(got, expected) {
			t.Fatalf("relabel %v: mounts %+v, want %+v", relabel, got, expected)
		}
		if volumes[0].ContainerPath != certificateDir || volumes[1].ContainerPath != legacyCertificateFile {
			t.Fatalf("the certificate's mounts do not come first: %+v", volumes[:2])
		}
	}
}

func TestEnsureFilesWritesTheShippedFilesReadableByEveryone(t *testing.T) {
	t.Parallel()
	dir := filepath.Join(t.TempDir(), "files")
	// What an earlier manifest shipped: a file and a folder no longer shipped, and a changed file kept in place.
	stale := filepath.Join(dir, "monitoring", "old.yaml")
	staleDir := filepath.Join(dir, "grafana")
	config := filepath.Join(dir, "monitoring", "collector.yaml")
	for _, path := range []string{stale, filepath.Join(staleDir, "dashboard.json"), config} {
		if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("old"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	before, err := os.Stat(config)
	if err != nil {
		t.Fatal(err)
	}

	m := parseFilesManifest(t, shippedTestFiles())
	if ensureErr := ensureFiles(dir, m); ensureErr != nil {
		t.Fatal(ensureErr)
	}

	for name, want := range map[string]string{
		"monitoring/collector.yaml":      "receivers: {}\n",
		"monitoring/dashboards/app.json": "{}\n",
	} {
		path := filepath.Join(dir, filepath.FromSlash(name))
		data, readErr := os.ReadFile(path)
		if readErr != nil || string(data) != want {
			t.Fatalf("%s: %q, %v; want %q", name, data, readErr, want)
		}
		assertMode(t, path, 0o644)
	}
	for _, path := range []string{dir, filepath.Join(dir, "monitoring"), filepath.Join(dir, "monitoring", "dashboards")} {
		assertMode(t, path, 0o755)
	}
	after, err := os.Stat(config)
	if err != nil {
		t.Fatal(err)
	}
	if !os.SameFile(before, after) {
		t.Error("the changed file was replaced, not rewritten in place: a running container's mount loses it")
	}
	for _, path := range []string{stale, staleDir} {
		if _, err := os.Stat(path); !os.IsNotExist(err) {
			t.Errorf("%s is still there: %v", path, err)
		}
	}
	// Again, with nothing to change.
	if err := ensureFiles(dir, m); err != nil {
		t.Fatal(err)
	}
}

func TestEnsureFilesWithNothingShippedLeavesAnEmptyDirectory(t *testing.T) {
	t.Parallel()
	m, err := manifest.Parse([]byte(`{"groups": [{"name": "default", "containers": ["a"]}], `+
		`"public": {"host": "local.altinn.cloud", "port": 8000}, "containers": {"a": {"registry": "r", "tag": "t"}}}`), nil)
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	if err = ensureFiles(dir, m); err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) != 0 {
		t.Fatalf("entries %v, %v", entries, err)
	}
}

func TestEnsureFilesWritesTheEmbeddedManifestsFiles(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	m := manifest.MustDefault()
	if err := ensureFiles(dir, m); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{
		"monitoring/otel-collector.yaml",
		"monitoring/grafana-datasources.yaml",
		"monitoring/grafana-dashboards.yaml",
		"monitoring/grafana-dashboards/app.json",
	} {
		want, err := m.ReadFile(name)
		if err != nil {
			t.Fatal(err)
		}
		got, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(name)))
		if err != nil || !slices.Equal(got, want) {
			t.Errorf("%s: %d bytes, %v; want the shipped %d bytes", name, len(got), err, len(want))
		}
	}
}

func assertMode(t *testing.T, path string, want os.FileMode) {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != want {
		t.Errorf("%s: mode %v, want %v", path, got, want)
	}
}
