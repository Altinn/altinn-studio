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

			// Verify kind config file was created
			if info, err := os.Stat(runtime.configPath); err != nil {
				t.Errorf("kind config was not created at %s: %v", runtime.configPath, err)
			} else if info.IsDir() {
				t.Errorf("kind config path is a directory, expected a file")
			}

			})
	}
}

func TestNew_KindConfigContent(t *testing.T) {
	tests := []struct {
		name            string
		variant         KindContainerRuntimeVariant
		expectedName    string
		expectedContent []string // Strings that should appear in the config
	}{
		{
			name:         "Standard variant config",
			variant:      KindContainerRuntimeVariantStandard,
			expectedName: "runtime-fixture-kind-standard",
			expectedContent: []string{
				"kind: Cluster",
				"apiVersion: kind.x-k8s.io/v1alpha4",
				"name: runtime-fixture-kind-standard",
				"role: control-plane",
				"role: worker",
			},
		},
		{
			name:         "Minimal variant config",
			variant:      KindContainerRuntimeVariantMinimal,
			expectedName: "runtime-fixture-kind-minimal",
			expectedContent: []string{
				"kind: Cluster",
				"apiVersion: kind.x-k8s.io/v1alpha4",
				"name: runtime-fixture-kind-minimal",
				"role: control-plane",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cachePath := filepath.Join(t.TempDir(), ".cache")

			runtime, err := New(tt.variant, cachePath, DefaultOptions())
			if err != nil {
				t.Fatalf("New() error = %v", err)
			}

			// Read the config file
			content, err := os.ReadFile(runtime.configPath)
			if err != nil {
				t.Fatalf("failed to read kind config: %v", err)
			}

			configStr := string(content)

			// Verify expected content is present
			for _, expected := range tt.expectedContent {
				if !strings.Contains(configStr, expected) {
					t.Errorf("kind config missing expected content: %q", expected)
				}
			}

			// Verify it's valid YAML (basic check)
			if !strings.HasPrefix(configStr, "kind:") && !strings.HasPrefix(configStr, "---") {
				t.Errorf("kind config does not appear to be valid YAML")
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

func TestNew_IdempotentFileWrites(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), ".cache")

	// Create runtime first time
	runtime1, err := New(KindContainerRuntimeVariantStandard, cachePath, DefaultOptions())
	if err != nil {
		t.Fatalf("First New() error = %v", err)
	}

	// Read initial file contents
	initialConfig, err := os.ReadFile(runtime1.configPath)
	if err != nil {
		t.Fatalf("failed to read initial config: %v", err)
	}

	// Create runtime second time (should overwrite)
	runtime2, err := New(KindContainerRuntimeVariantStandard, cachePath, DefaultOptions())
	if err != nil {
		t.Fatalf("Second New() error = %v", err)
	}

	// Read second file contents
	secondConfig, err := os.ReadFile(runtime2.configPath)
	if err != nil {
		t.Fatalf("failed to read second config: %v", err)
	}

	// Verify contents are identical (idempotent)
	if string(initialConfig) != string(secondConfig) {
		t.Error("kind config changed between calls to New()")
	}
}
