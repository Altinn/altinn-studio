package kind

import (
	"os"
	"path/filepath"
	"testing"
)

// TestNew_TestserverInBothVariants verifies testserver.yaml is written for both variants
func TestNew_TestserverInBothVariants(t *testing.T) {
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

			// Verify testserver.yaml exists
			if _, err := os.Stat(runtime.testserverPath); err != nil {
				t.Fatalf("testserver.yaml not found for %s variant: %v", tt.name, err)
			}

			// Read and verify it has content
			content, err := os.ReadFile(runtime.testserverPath)
			if err != nil {
				t.Fatalf("failed to read testserver.yaml: %v", err)
			}

			if len(content) == 0 {
				t.Fatalf("testserver.yaml is empty for %s variant", tt.name)
			}

			t.Logf("✓ %s variant has testserver.yaml (%d bytes)", tt.name, len(content))
		})
	}
}
