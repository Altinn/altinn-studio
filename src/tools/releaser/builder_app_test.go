package main

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestAppReleaseAssetsExcludesNuGetPackages(t *testing.T) {
	outputDir := t.TempDir()
	writeTestFile(t, outputDir, "Altinn.App.Api.9.0.0-preview.1.nupkg")
	writeTestFile(t, outputDir, "Altinn.App.Api.9.0.0-preview.1.snupkg")

	assets, err := appReleaseAssets(outputDir)
	if err != nil {
		t.Fatalf("appReleaseAssets() unexpected error: %v", err)
	}
	if len(assets) != 0 {
		t.Fatalf("appReleaseAssets() returned %d assets, want 0: %v", len(assets), assets)
	}
}

func TestAppReleaseAssetsRequiresNuGetPackages(t *testing.T) {
	_, err := appReleaseAssets(t.TempDir())
	if !errors.Is(err, errAppPackageArtifactsMissing) {
		t.Fatalf("appReleaseAssets() error = %v, want %v", err, errAppPackageArtifactsMissing)
	}
}

func writeTestFile(t *testing.T, dir string, name string) {
	t.Helper()

	if err := os.WriteFile(filepath.Join(dir, name), []byte("test"), 0o644); err != nil {
		t.Fatalf("write test file %s: %v", name, err)
	}
}
