package kind

import (
	"os"
	"path/filepath"
	"testing"

	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
)

// TestNew_ShowCachePathStructure demonstrates the file structure created in cachePath
func TestNew_ShowCachePathStructure(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), ".cache")

	runtime, err := New(KindContainerRuntimeVariantStandard, cachePath, DefaultOptions())
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
	t.Logf("  Kind config (in-memory):")
	t.Logf("    Cluster name: %s", runtime.kindConfig.Name)
	t.Logf("    Node count: %d", len(runtime.kindConfig.Nodes))
}

// TestNew_VerifyInMemoryConfig ensures kindConfig is properly constructed
func TestNew_VerifyInMemoryConfig(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), ".cache")

	runtime, err := New(KindContainerRuntimeVariantStandard, cachePath, DefaultOptions())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	// Verify kindConfig is not nil
	if runtime.kindConfig == nil {
		t.Fatal("kindConfig is nil")
	}

	t.Log("Verifying in-memory kind config:")

	// Verify API version
	if runtime.kindConfig.APIVersion != "kind.x-k8s.io/v1alpha4" {
		t.Errorf("  ✗ APIVersion: got %q, want 'kind.x-k8s.io/v1alpha4'", runtime.kindConfig.APIVersion)
	} else {
		t.Logf("  ✓ APIVersion: %s", runtime.kindConfig.APIVersion)
	}

	// Verify cluster name
	expectedName := "runtime-fixture-kind-standard"
	if runtime.kindConfig.Name != expectedName {
		t.Errorf("  ✗ Name: got %q, want %q", runtime.kindConfig.Name, expectedName)
	} else {
		t.Logf("  ✓ Name: %s", runtime.kindConfig.Name)
	}

	// Verify node count
	expectedNodes := 4 // 1 control-plane + 3 workers
	if len(runtime.kindConfig.Nodes) != expectedNodes {
		t.Errorf("  ✗ Nodes: got %d, want %d", len(runtime.kindConfig.Nodes), expectedNodes)
	} else {
		t.Logf("  ✓ Nodes: %d", len(runtime.kindConfig.Nodes))
	}

	// Verify control plane exists
	hasControlPlane := false
	for _, node := range runtime.kindConfig.Nodes {
		if node.Role == v1alpha4.ControlPlaneRole {
			hasControlPlane = true
			break
		}
	}
	if !hasControlPlane {
		t.Error("  ✗ Control plane: not found")
	} else {
		t.Log("  ✓ Control plane: present")
	}

	t.Log("")
	t.Log("All config checks passed ✓")
}

// TestNew_CompareVariants shows the difference between Standard and Minimal variants
func TestNew_CompareVariants(t *testing.T) {
	tests := []struct {
		name          string
		variant       KindContainerRuntimeVariant
		expectedNodes int
	}{
		{"Standard", KindContainerRuntimeVariantStandard, 4},
		{"Minimal", KindContainerRuntimeVariantMinimal, 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cachePath := filepath.Join(t.TempDir(), ".cache")

			runtime, err := New(tt.variant, cachePath, DefaultOptions())
			if err != nil {
				t.Fatalf("New() error = %v", err)
			}

			t.Logf("%s variant:", tt.name)
			t.Logf("  Cluster name: %s", runtime.clusterName)
			t.Logf("  Node count:   %d", len(runtime.kindConfig.Nodes))

			if len(runtime.kindConfig.Nodes) != tt.expectedNodes {
				t.Errorf("expected %d nodes, got %d", tt.expectedNodes, len(runtime.kindConfig.Nodes))
			}

			// List nodes with their roles
			for i, node := range runtime.kindConfig.Nodes {
				t.Logf("    Node %d: role=%s", i, node.Role)
				if zone, ok := node.Labels["topology.kubernetes.io/zone"]; ok {
					t.Logf("            zone=%s", zone)
				}
			}
		})
	}
}
