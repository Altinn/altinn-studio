package kind

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNew_CreatesRequiredFiles(t *testing.T) {
	tests := []struct {
		name    string
		variant KindContainerRuntimeVariant
	}{
		{
			name:    "Standard variant",
			variant: KindContainerRuntimeVariantStandard,
		},
		{
			name:    "Minimal variant",
			variant: KindContainerRuntimeVariantMinimal,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cachePath := filepath.Join(t.TempDir(), ".cache")

			runtime, err := New(tt.variant, cachePath, DefaultOptions())
			if err != nil {
				t.Fatalf("New() error = %v", err)
			}

			// Verify runtime is not nil
			if runtime == nil {
				t.Fatal("New() returned nil runtime")
			}

			// Verify cache directory was created
			if info, err := os.Stat(cachePath); err != nil {
				t.Errorf("cachePath was not created: %v", err)
			} else if !info.IsDir() {
				t.Errorf("cachePath is not a directory")
			}

			// Verify kind config was created in memory
			if runtime.kindConfig == nil {
				t.Error("kindConfig was not created")
			}
		})
	}
}

func TestNew_KindConfigContent(t *testing.T) {
	tests := []struct {
		name          string
		variant       KindContainerRuntimeVariant
		expectedName  string
		expectedNodes int
		expectedZones []string
	}{
		{
			name:          "Standard variant config",
			variant:       KindContainerRuntimeVariantStandard,
			expectedName:  "runtime-fixture-kind-standard",
			expectedNodes: 4, // 1 control-plane + 3 workers
			expectedZones: []string{"zone-1", "zone-2", "zone-3"},
		},
		{
			name:          "Minimal variant config",
			variant:       KindContainerRuntimeVariantMinimal,
			expectedName:  "runtime-fixture-kind-minimal",
			expectedNodes: 2, // 1 control-plane + 1 worker
			expectedZones: []string{"zone-1"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cachePath := filepath.Join(t.TempDir(), ".cache")

			runtime, err := New(tt.variant, cachePath, DefaultOptions())
			if err != nil {
				t.Fatalf("New() error = %v", err)
			}

			config := runtime.kindConfig
			if config == nil {
				t.Fatal("kindConfig is nil")
			}

			// Verify cluster name
			if config.Name != tt.expectedName {
				t.Errorf("kindConfig.Name = %q, want %q", config.Name, tt.expectedName)
			}

			// Verify node count
			if len(config.Nodes) != tt.expectedNodes {
				t.Errorf("kindConfig has %d nodes, want %d", len(config.Nodes), tt.expectedNodes)
			}

			// Verify API version
			if config.APIVersion != "kind.x-k8s.io/v1alpha4" {
				t.Errorf("kindConfig.APIVersion = %q, want 'kind.x-k8s.io/v1alpha4'", config.APIVersion)
			}

			// Verify zones are present
			var foundZones []string
			for _, node := range config.Nodes {
				if zone, ok := node.Labels["topology.kubernetes.io/zone"]; ok {
					foundZones = append(foundZones, zone)
				}
			}
			for _, expectedZone := range tt.expectedZones {
				found := false
				for _, zone := range foundZones {
					if zone == expectedZone {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("expected zone %q not found in config", expectedZone)
				}
			}
		})
	}
}

func TestNew_CachePathValidation(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(t *testing.T) string
		wantErr   bool
		errSubstr string
	}{
		{
			name: "valid new directory",
			setup: func(t *testing.T) string {
				return filepath.Join(t.TempDir(), "new-cache-dir")
			},
			wantErr: false,
		},
		{
			name: "valid existing directory",
			setup: func(t *testing.T) string {
				dir := filepath.Join(t.TempDir(), "existing-cache")
				if err := os.MkdirAll(dir, 0755); err != nil {
					t.Fatal(err)
				}
				return dir
			},
			wantErr: false,
		},
		{
			name: "path exists but is a file",
			setup: func(t *testing.T) string {
				file := filepath.Join(t.TempDir(), "file-not-dir")
				if err := os.WriteFile(file, []byte("test"), 0644); err != nil {
					t.Fatal(err)
				}
				return file
			},
			wantErr:   true,
			errSubstr: "not a directory",
		},
		{
			name: "nested path that needs creation",
			setup: func(t *testing.T) string {
				return filepath.Join(t.TempDir(), "deeply", "nested", "cache", "path")
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cachePath := tt.setup(t)

			_, err := New(KindContainerRuntimeVariantStandard, cachePath, DefaultOptions())

			if tt.wantErr {
				if err == nil {
					t.Error("New() expected error, got nil")
				} else if tt.errSubstr != "" && !strings.Contains(err.Error(), tt.errSubstr) {
					t.Errorf("New() error = %v, want substring %q", err, tt.errSubstr)
				}
			} else {
				if err != nil {
					t.Errorf("New() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestNew_InvalidVariant(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), ".cache")

	// Use an invalid variant (99)
	_, err := New(KindContainerRuntimeVariant(99), cachePath, DefaultOptions())

	if err == nil {
		t.Error("New() with invalid variant should return error")
	}

	if !strings.Contains(err.Error(), "unknown variant") {
		t.Errorf("New() error = %v, want error containing 'unknown variant'", err)
	}
}

func TestNew_IdempotentConfig(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), ".cache")

	// Create runtime first time
	runtime1, err := New(KindContainerRuntimeVariantStandard, cachePath, DefaultOptions())
	if err != nil {
		t.Fatalf("First New() error = %v", err)
	}

	// Create runtime second time
	runtime2, err := New(KindContainerRuntimeVariantStandard, cachePath, DefaultOptions())
	if err != nil {
		t.Fatalf("Second New() error = %v", err)
	}

	// Verify configs are equivalent
	if runtime1.kindConfig.Name != runtime2.kindConfig.Name {
		t.Error("kindConfig.Name changed between calls to New()")
	}
	if len(runtime1.kindConfig.Nodes) != len(runtime2.kindConfig.Nodes) {
		t.Error("kindConfig.Nodes count changed between calls to New()")
	}
}
