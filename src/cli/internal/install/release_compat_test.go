//nolint:testpackage // Tests package-private preview compatibility helpers.
package install

import (
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestCreatePreviewCompatibilityAssetsCreatesLegacyAppManagerArchive(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	outputDir := filepath.Join(dir, "dist")
	appManagerDir := filepath.Join(dir, "published-app-manager")
	writeTestFile(t, filepath.Join(appManagerDir, "app-manager"), "binary")
	writeTestFile(t, filepath.Join(appManagerDir, "config.json"), "{}")

	artifacts, err := CreatePreviewCompatibilityAssets(PreviewCompatibilityOptions{
		GOOS:          osutil.OSLinux,
		GOARCH:        "amd64",
		OutputDir:     outputDir,
		AppManagerDir: appManagerDir,
	})
	if err != nil {
		t.Fatalf("CreatePreviewCompatibilityAssets() error = %v", err)
	}
	if len(artifacts) != 1 {
		t.Fatalf("len(artifacts) = %d, want 1", len(artifacts))
	}
	archivePath := artifacts[0]
	if filepath.Base(archivePath) != "app-manager-linux-amd64.tar.gz" {
		t.Fatalf("archive name = %q", filepath.Base(archivePath))
	}

	extractDir := filepath.Join(dir, "extract")
	if err := extractTarGzFile(archivePath, extractDir, extractTarGzOptions{}); err != nil {
		t.Fatalf("extractTarGzFile() error = %v", err)
	}

	assertFileContent(t, filepath.Join(extractDir, "app-manager"), "binary")
	assertFileContent(t, filepath.Join(extractDir, "config.json"), "{}")
	assertNoFile(t, filepath.Join(extractDir, "published-app-manager", "app-manager"))
}
