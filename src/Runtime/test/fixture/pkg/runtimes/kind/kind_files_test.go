package kind

import (
	"os"
	"path/filepath"
	"testing"
)

// TestNew_ShowCachePathStructure demonstrates the file structure created in cachePath
func TestNew_ShowCachePathStructure(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), ".cache")

	runtime, err := New(KindContainerRuntimeVariantStandard, cachePath)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	t.Logf("Cache path structure for Standard variant:")
	t.Logf("  Cache Path: %s", cachePath)
	t.Logf("")
	t.Logf("  Files created:")

	// Walk the cache directory and list all files
	err = filepath.Walk(cachePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, _ := filepath.Rel(cachePath, path)
		if relPath == "." {
			return nil
		}

		if info.IsDir() {
			t.Logf("    %s/ (directory)", relPath)
		} else {
			t.Logf("    %s (%d bytes)", relPath, info.Size())
		}

		return nil
	})

	if err != nil {
		t.Fatalf("failed to walk cache directory: %v", err)
	}

	t.Logf("")
	t.Logf("  Key paths:")
	t.Logf("    Config path: %s", runtime.configPath)
	t.Logf("    Certs path:  %s", runtime.certsPath)
}

// TestNew_VerifyAllRequiredFiles ensures all required files are present
func TestNew_VerifyAllRequiredFiles(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), ".cache")

	runtime, err := New(KindContainerRuntimeVariantStandard, cachePath)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	// List of all files that MUST exist
	requiredFiles := map[string]string{
		"kind.config.yaml": runtime.configPath,
		"ca.crt":           filepath.Join(runtime.certsPath, "ca.crt"),
		"ca.key":           filepath.Join(runtime.certsPath, "ca.key"),
		"issuer.crt":       filepath.Join(runtime.certsPath, "issuer.crt"),
		"issuer.key":       filepath.Join(runtime.certsPath, "issuer.key"),
		"testserver.yaml":  runtime.testserverPath,
	}

	t.Log("Verifying all required files exist:")
	allExist := true
	for name, path := range requiredFiles {
		if info, err := os.Stat(path); err != nil {
			t.Errorf("  ✗ %s: missing (expected at %s)", name, path)
			allExist = false
		} else if info.IsDir() {
			t.Errorf("  ✗ %s: is a directory, expected a file", name)
			allExist = false
		} else {
			t.Logf("  ✓ %s (%d bytes)", name, info.Size())
		}
	}

	if !allExist {
		t.Fatal("Some required files are missing")
	}

	t.Log("")
	t.Log("All required files are present ✓")
}

// TestNew_CompareVariants shows the difference between Standard and Minimal variants
func TestNew_CompareVariants(t *testing.T) {
	tests := []struct {
		name    string
		variant KindContainerRuntimeVariant
	}{
		{"Standard", KindContainerRuntimeVariantStandard},
		{"Minimal", KindContainerRuntimeVariantMinimal},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cachePath := filepath.Join(t.TempDir(), ".cache")

			runtime, err := New(tt.variant, cachePath)
			if err != nil {
				t.Fatalf("New() error = %v", err)
			}

			t.Logf("%s variant cache structure:", tt.name)
			t.Logf("  Cluster name: %s", runtime.clusterName)
			t.Logf("  Config file:  %s", runtime.configPath)
			t.Logf("  Certs dir:    %s", runtime.certsPath)

			// Read and display config file size
			if info, err := os.Stat(runtime.configPath); err == nil {
				t.Logf("  Config size:  %d bytes", info.Size())
			}

			// Count cert files
			certFiles, _ := filepath.Glob(filepath.Join(runtime.certsPath, "*"))
			t.Logf("  Cert files:   %d files", len(certFiles))
		})
	}
}
