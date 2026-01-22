package appdetect_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/appdetect"
	"altinn.studio/studioctl/internal/perm"
)

// testCase holds test parameters for Detector.Detect tests.
type testCase struct {
	wantErr      error
	setup        func(t *testing.T, root string) string
	name         string
	pathOverride string
	wantMethod   appdetect.DetectionMethod
}

// newDetectTestCase creates a test case expecting success with the given method.
func newDetectTestCase(
	name string,
	setup func(t *testing.T, root string) string,
	wantMethod appdetect.DetectionMethod,
) testCase {
	return testCase{
		wantErr:      nil,
		setup:        setup,
		name:         name,
		pathOverride: "",
		wantMethod:   wantMethod,
	}
}

// newDetectErrorCase creates a test case expecting an error.
func newDetectErrorCase(
	name string,
	setup func(t *testing.T, root string) string,
	pathOverride string,
	wantErr error,
) testCase {
	return testCase{
		wantErr:      wantErr,
		setup:        setup,
		name:         name,
		pathOverride: pathOverride,
		wantMethod:   0,
	}
}

func TestDetector_Detect(t *testing.T) {
	t.Parallel()

	tests := []testCase{
		newDetectTestCase("detect by metadata in current dir", func(t *testing.T, root string) string {
			t.Helper()
			createAppWithMetadata(t, root)
			return root
		}, appdetect.DetectedByMetadata),

		newDetectTestCase("detect by metadata in parent dir", func(t *testing.T, root string) string {
			t.Helper()
			createAppWithMetadata(t, root)
			subdir := filepath.Join(root, "App", "subdir")
			if err := os.MkdirAll(subdir, perm.DirPermDefault); err != nil {
				t.Fatal(err)
			}
			return subdir
		}, appdetect.DetectedByMetadata),

		newDetectTestCase("detect by csproj fallback", func(t *testing.T, root string) string {
			t.Helper()
			createAppWithCsproj(t, root)
			return root
		}, appdetect.DetectedByCsproj),

		{
			name: "path override success",
			setup: func(t *testing.T, root string) string {
				t.Helper()
				createAppWithMetadata(t, root)
				return t.TempDir() // start from different dir
			},
			pathOverride: "", // will be set to root in test loop
			wantMethod:   appdetect.DetectedByOverride,
			wantErr:      nil,
		},

		newDetectErrorCase("not found", func(t *testing.T, root string) string {
			t.Helper()
			return root // empty dir
		}, "", appdetect.ErrNotFound),

		newDetectErrorCase("path override not found", func(t *testing.T, root string) string {
			t.Helper()
			return root
		}, "/nonexistent/path", appdetect.ErrNotFound),
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			root := t.TempDir()
			startDir := tt.setup(t, root)

			pathOverride := tt.pathOverride
			if tt.name == "path override success" {
				pathOverride = root
			}

			detector := appdetect.NewDetector()
			result, err := detector.Detect(startDir, pathOverride)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("Detect() error = %v, want %v", err, tt.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("Detect() unexpected error = %v", err)
			}

			if result.DetectedFrom != tt.wantMethod {
				t.Errorf("DetectedFrom = %v, want %v", result.DetectedFrom, tt.wantMethod)
			}

			if result.Path == "" {
				t.Error("Path should not be empty")
			}
		})
	}
}

func TestDetector_WalkDepth(t *testing.T) {
	t.Parallel()

	// Create a deeply nested directory structure
	root := t.TempDir()
	createAppWithMetadata(t, root)

	// Create 25 levels of nesting
	deepPath := root
	for range 25 {
		deepPath = filepath.Join(deepPath, "level")
	}
	if err := os.MkdirAll(deepPath, perm.DirPermDefault); err != nil {
		t.Fatal(err)
	}

	detector := appdetect.NewDetector()

	// From 15 levels deep, should find the app (within MaxWalkDepth)
	shallowPath := root
	for range 15 {
		shallowPath = filepath.Join(shallowPath, "level")
	}
	result, err := detector.Detect(shallowPath, "")
	if err != nil {
		t.Errorf("Should find app at 15 levels: %v", err)
	}
	if result.Path != root {
		t.Errorf("Path = %q, want %q", result.Path, root)
	}

	// From 25 levels deep, should NOT find the app (exceeds MaxWalkDepth)
	_, err = detector.Detect(deepPath, "")
	if !errors.Is(err, appdetect.ErrNotFound) {
		t.Errorf("Should not find app at 25 levels, got err = %v", err)
	}
}

func TestDetectionMethod_String(t *testing.T) {
	t.Parallel()

	tests := []struct {
		want   string
		method appdetect.DetectionMethod
	}{
		{"applicationmetadata.json", appdetect.DetectedByMetadata},
		{"csproj with Altinn.App references", appdetect.DetectedByCsproj},
		{"explicit path", appdetect.DetectedByOverride},
		{"unknown", appdetect.DetectionMethod(99)},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			t.Parallel()
			if got := tt.method.String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

// Helper functions

func createAppWithMetadata(t *testing.T, root string) {
	t.Helper()

	configDir := filepath.Join(root, "App", "config")
	if err := os.MkdirAll(configDir, perm.DirPermDefault); err != nil {
		t.Fatal(err)
	}

	metadataPath := filepath.Join(configDir, "applicationmetadata.json")
	content := `{"id": "test/app", "org": "test"}`
	if err := os.WriteFile(metadataPath, []byte(content), perm.FilePermDefault); err != nil {
		t.Fatal(err)
	}
}

func createAppWithCsproj(t *testing.T, root string) {
	t.Helper()

	appDir := filepath.Join(root, "App")
	if err := os.MkdirAll(appDir, perm.DirPermDefault); err != nil {
		t.Fatal(err)
	}

	csprojPath := filepath.Join(appDir, "App.csproj")
	content := `<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Altinn.App.Api" Version="8.0.0" />
    <PackageReference Include="Altinn.App.Core" Version="8.0.0" />
  </ItemGroup>
</Project>`
	if err := os.WriteFile(csprojPath, []byte(content), perm.FilePermDefault); err != nil {
		t.Fatal(err)
	}
}
