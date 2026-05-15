//nolint:testpackage // Tests package-private archive extraction helpers.
package install

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

func TestCreateResourcesArchiveOwnsResourcesLayout(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	outputDir := filepath.Join(dir, "dist")
	localtestDir := filepath.Join(dir, "localtest")
	writeTestFile(t, filepath.Join(localtestDir, "testdata", "apps", "app.json"), "{}")
	writeTestFile(t, filepath.Join(localtestDir, "infra", "compose.yaml"), "services: {}")
	writeTestFile(t, filepath.Join(localtestDir, "ignored.txt"), "ignored")

	serverDir := filepath.Join(dir, "published-"+resourcesServerDir)
	writeTestFile(t, filepath.Join(serverDir, config.StudioctlServerBinaryName), "binary")

	archivePath, err := CreateResourcesArchive(ResourcesArchiveOptions{
		GOOS:         osutil.OSLinux,
		GOARCH:       "amd64",
		OutputDir:    outputDir,
		ServerDir:    serverDir,
		LocaltestDir: localtestDir,
	})
	if err != nil {
		t.Fatalf("CreateResourcesArchive() error = %v", err)
	}
	if filepath.Base(archivePath) != "studioctl-resources-linux-amd64.tar.gz" {
		t.Fatalf("archive name = %q", filepath.Base(archivePath))
	}

	extractDir := filepath.Join(dir, "extract")
	if err := extractTarGzFile(archivePath, extractDir, extractTarGzOptions{}); err != nil {
		t.Fatalf("extractTarGzFile() error = %v", err)
	}

	assertFileContent(t, filepath.Join(extractDir, resourcesServerDir, config.StudioctlServerBinaryName), "binary")
	assertFileContent(t, filepath.Join(extractDir, "localtest", "testdata", "apps", "app.json"), "{}")
	assertFileContent(t, filepath.Join(extractDir, "localtest", "infra", "compose.yaml"), "services: {}")
	assertNoFile(t, filepath.Join(extractDir, "localtest", "ignored.txt"))
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(path, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatalf("writeFile() error = %v", err)
	}
}

func assertFileContent(t *testing.T, path, want string) {
	t.Helper()
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	if string(got) != want {
		t.Fatalf("ReadFile(%q) = %q, want %q", path, string(got), want)
	}
}

func assertNoFile(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("Stat(%q) error = %v, want not exists", path, err)
	}
}
