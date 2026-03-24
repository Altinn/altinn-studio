package context_test

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
)

func TestDetect_App(t *testing.T) {
	t.Parallel()

	tests := []struct {
		setup      func(t *testing.T, root string) string
		name       string
		override   string
		wantFound  bool
		wantMethod repocontext.AppDetectionMethod
	}{
		{
			name: "detect by metadata in current dir",
			setup: func(t *testing.T, root string) string {
				t.Helper()
				createAppWithMetadata(t, root)
				return root
			},
			wantFound:  true,
			wantMethod: repocontext.AppDetectedByMetadata,
		},
		{
			name: "detect by metadata in parent dir",
			setup: func(t *testing.T, root string) string {
				t.Helper()
				createAppWithMetadata(t, root)
				subdir := filepath.Join(root, "App", "subdir")
				if err := os.MkdirAll(subdir, osutil.DirPermDefault); err != nil {
					t.Fatal(err)
				}
				return subdir
			},
			wantFound:  true,
			wantMethod: repocontext.AppDetectedByMetadata,
		},
		{
			name: "detect by csproj fallback",
			setup: func(t *testing.T, root string) string {
				t.Helper()
				createAppWithCsproj(t, root)
				return root
			},
			wantFound:  true,
			wantMethod: repocontext.AppDetectedByCsproj,
		},
		{
			name: "path override success",
			setup: func(t *testing.T, root string) string {
				t.Helper()
				createAppWithMetadata(t, root)
				return t.TempDir()
			},
			override:   "use-root",
			wantFound:  true,
			wantMethod: repocontext.AppDetectedByOverride,
		},
		{
			name: "not found",
			setup: func(t *testing.T, root string) string {
				t.Helper()
				return root
			},
			wantFound: false,
		},
		{
			name: "path override not found",
			setup: func(t *testing.T, root string) string {
				t.Helper()
				return root
			},
			override:  "/nonexistent/path",
			wantFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			root := t.TempDir()
			startDir := tt.setup(t, root)
			override := tt.override
			if override == "use-root" {
				override = root
			}

			result, err := repocontext.Detect(context.Background(), startDir, override)
			if err != nil {
				t.Fatalf("Detect() unexpected error = %v", err)
			}

			if result.InAppRepo != tt.wantFound {
				t.Fatalf("InAppRepo = %v, want %v", result.InAppRepo, tt.wantFound)
			}
			if !tt.wantFound {
				return
			}

			if result.AppDetectedFrom != tt.wantMethod {
				t.Errorf("AppDetectedFrom = %v, want %v", result.AppDetectedFrom, tt.wantMethod)
			}
			if result.AppRoot == "" {
				t.Error("AppRoot should not be empty")
			}
		})
	}
}

func TestDetect_WalkDepth(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	createAppWithMetadata(t, root)

	deepPath := root
	for range 25 {
		deepPath = filepath.Join(deepPath, "level")
	}
	if err := os.MkdirAll(deepPath, osutil.DirPermDefault); err != nil {
		t.Fatal(err)
	}

	shallowPath := root
	for range 15 {
		shallowPath = filepath.Join(shallowPath, "level")
	}

	result, err := repocontext.Detect(context.Background(), shallowPath, "")
	if err != nil {
		t.Fatalf("Detect() error = %v", err)
	}
	if !result.InAppRepo {
		t.Fatal("expected InAppRepo=true at 15 levels")
	}
	if result.AppRoot != root {
		t.Fatalf("AppRoot = %q, want %q", result.AppRoot, root)
	}

	result, err = repocontext.Detect(context.Background(), deepPath, "")
	if err != nil {
		t.Fatalf("Detect() error = %v", err)
	}
	if result.InAppRepo {
		t.Fatal("expected InAppRepo=false at 25 levels")
	}
}

func TestDetect_StudioRepo(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	createGitRepo(t, root, "https://github.com/Altinn/altinn-studio.git")
	start := filepath.Join(root, "src", "Designer")
	if err := os.MkdirAll(start, osutil.DirPermDefault); err != nil {
		t.Fatal(err)
	}

	result, err := repocontext.Detect(context.Background(), start, "")
	if err != nil {
		t.Fatalf("Detect() error = %v", err)
	}
	if !result.InStudioRepo {
		t.Fatal("expected InStudioRepo=true")
	}
	if result.StudioRoot != root {
		t.Fatalf("StudioRoot = %q, want %q", result.StudioRoot, root)
	}
}

func TestDetect_StudioRepo_NoMatchingRemote(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	createGitRepo(t, root, "https://github.com/example/other.git")

	result, err := repocontext.Detect(context.Background(), root, "")
	if err != nil {
		t.Fatalf("Detect() error = %v", err)
	}
	if result.InStudioRepo {
		t.Fatal("expected InStudioRepo=false")
	}
}

func createAppWithMetadata(t *testing.T, root string) {
	t.Helper()

	configDir := filepath.Join(root, "App", "config")
	if err := os.MkdirAll(configDir, osutil.DirPermDefault); err != nil {
		t.Fatal(err)
	}

	metadataPath := filepath.Join(configDir, "applicationmetadata.json")
	content := `{"id": "test/app", "org": "test"}`
	if err := os.WriteFile(metadataPath, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatal(err)
	}
}

func createAppWithCsproj(t *testing.T, root string) {
	t.Helper()

	appDir := filepath.Join(root, "App")
	if err := os.MkdirAll(appDir, osutil.DirPermDefault); err != nil {
		t.Fatal(err)
	}

	csprojPath := filepath.Join(appDir, "App.csproj")
	content := `<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Altinn.App.Api" Version="8.0.0" />
    <PackageReference Include="Altinn.App.Core" Version="8.0.0" />
  </ItemGroup>
</Project>`
	if err := os.WriteFile(csprojPath, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatal(err)
	}
}

func createGitRepo(t *testing.T, root, remoteURL string) {
	t.Helper()

	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not available")
	}

	runGit(t, root, "init")
	runGit(t, root, "remote", "add", "origin", remoteURL)
}

func runGit(t *testing.T, repoDir string, args ...string) {
	t.Helper()

	cmdArgs := append([]string{"-C", repoDir}, args...)
	cmd := exec.CommandContext(context.Background(), "git", cmdArgs...)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v failed: %v\n%s", args, err, out)
	}
}
