package main

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestValidateAppPackageArtifactsAcceptsNuGetPackages(t *testing.T) {
	outputDir := t.TempDir()
	writeTestFile(t, outputDir, "Altinn.App.Api.9.0.0-preview.1.nupkg")
	writeTestFile(t, outputDir, "Altinn.App.Api.9.0.0-preview.1.snupkg")

	if err := validateAppPackageArtifacts(outputDir); err != nil {
		t.Fatalf("validateAppPackageArtifacts() unexpected error: %v", err)
	}
}

func TestValidateAppPackageArtifactsRequiresNuGetPackages(t *testing.T) {
	err := validateAppPackageArtifacts(t.TempDir())
	if !errors.Is(err, errAppPackageArtifactsMissing) {
		t.Fatalf("validateAppPackageArtifacts() error = %v, want %v", err, errAppPackageArtifactsMissing)
	}
}

func writeTestFile(t *testing.T, dir string, name string) {
	t.Helper()

	if err := os.WriteFile(filepath.Join(dir, name), []byte("test"), 0o644); err != nil {
		t.Fatalf("write test file %s: %v", name, err)
	}
}
