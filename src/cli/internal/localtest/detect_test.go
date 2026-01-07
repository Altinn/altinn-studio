package localtest_test

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/localtest"
	"altinn.studio/studioctl/internal/perm"
)

func TestGetRepoRoot(t *testing.T) {
	t.Parallel()

	tests := []struct {
		setup     func(t *testing.T) string
		name      string
		wantFound bool
	}{
		{
			name: "finds repo root from subdirectory",
			setup: func(t *testing.T) string {
				t.Helper()
				root := t.TempDir()
				if err := os.Mkdir(filepath.Join(root, ".git"), perm.DirPermDefault); err != nil {
					t.Fatalf("create .git: %v", err)
				}
				nested := filepath.Join(root, "src", "app")
				if err := os.MkdirAll(nested, perm.DirPermDefault); err != nil {
					t.Fatalf("create nested: %v", err)
				}
				return nested
			},
			wantFound: true,
		},
		{
			name: "finds repo root from root",
			setup: func(t *testing.T) string {
				t.Helper()
				root := t.TempDir()
				if err := os.Mkdir(filepath.Join(root, ".git"), perm.DirPermDefault); err != nil {
					t.Fatalf("create .git: %v", err)
				}
				return root
			},
			wantFound: true,
		},
		{
			name: "finds repo root when .git is a file (worktree)",
			setup: func(t *testing.T) string {
				t.Helper()
				root := t.TempDir()
				// Git worktrees have .git as a file pointing to the main repo
				gitFile := filepath.Join(root, ".git")
				if err := os.WriteFile(gitFile, []byte("gitdir: /some/path"), perm.FilePermDefault); err != nil {
					t.Fatalf("create .git file: %v", err)
				}
				return root
			},
			wantFound: true,
		},
		{
			name: "returns false when no repo found",
			setup: func(t *testing.T) string {
				t.Helper()
				return t.TempDir()
			},
			wantFound: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			startPath := tc.setup(t)

			root, found := localtest.GetRepoRoot(startPath)

			if found != tc.wantFound {
				t.Errorf("GetRepoRoot() found = %v, want %v", found, tc.wantFound)
			}
			if tc.wantFound && root == "" {
				t.Error("GetRepoRoot() returned empty root when found=true")
			}
		})
	}
}

func TestDetectImageMode(t *testing.T) {
	tests := []struct {
		setup    func(t *testing.T) string
		name     string
		envValue string
		wantMode localtest.ImageMode
		wantDev  bool
	}{
		{
			name:     "release mode when env var not set",
			envValue: "",
			setup: func(t *testing.T) string {
				t.Helper()
				root := t.TempDir()
				if err := os.Mkdir(filepath.Join(root, ".git"), perm.DirPermDefault); err != nil {
					t.Fatalf("create .git: %v", err)
				}
				localtestDir := filepath.Join(root, "src", "Runtime", "localtest")
				if err := os.MkdirAll(localtestDir, perm.DirPermDefault); err != nil {
					t.Fatalf("create localtest dir: %v", err)
				}
				dockerfilePath := filepath.Join(localtestDir, "Dockerfile")
				if err := os.WriteFile(dockerfilePath, []byte("FROM alpine"), perm.FilePermDefault); err != nil {
					t.Fatalf("create Dockerfile: %v", err)
				}
				return root
			},
			wantMode: localtest.ReleaseMode,
			wantDev:  false,
		},
		{
			name:     "dev mode when env var is true and Dockerfile exists",
			envValue: "true",
			setup: func(t *testing.T) string {
				t.Helper()
				root := t.TempDir()
				if err := os.Mkdir(filepath.Join(root, ".git"), perm.DirPermDefault); err != nil {
					t.Fatalf("create .git: %v", err)
				}
				localtestDir := filepath.Join(root, "src", "Runtime", "localtest")
				if err := os.MkdirAll(localtestDir, perm.DirPermDefault); err != nil {
					t.Fatalf("create localtest dir: %v", err)
				}
				dockerfilePath := filepath.Join(localtestDir, "Dockerfile")
				if err := os.WriteFile(dockerfilePath, []byte("FROM alpine"), perm.FilePermDefault); err != nil {
					t.Fatalf("create Dockerfile: %v", err)
				}
				return root
			},
			wantMode: localtest.DevMode,
			wantDev:  true,
		},
		{
			name:     "dev mode when env var is 1 and Dockerfile exists",
			envValue: "1",
			setup: func(t *testing.T) string {
				t.Helper()
				root := t.TempDir()
				if err := os.Mkdir(filepath.Join(root, ".git"), perm.DirPermDefault); err != nil {
					t.Fatalf("create .git: %v", err)
				}
				localtestDir := filepath.Join(root, "src", "Runtime", "localtest")
				if err := os.MkdirAll(localtestDir, perm.DirPermDefault); err != nil {
					t.Fatalf("create localtest dir: %v", err)
				}
				dockerfilePath := filepath.Join(localtestDir, "Dockerfile")
				if err := os.WriteFile(dockerfilePath, []byte("FROM alpine"), perm.FilePermDefault); err != nil {
					t.Fatalf("create Dockerfile: %v", err)
				}
				return root
			},
			wantMode: localtest.DevMode,
			wantDev:  true,
		},
		{
			name:     "release mode when env var set but no repo found",
			envValue: "true",
			setup: func(t *testing.T) string {
				t.Helper()
				return t.TempDir()
			},
			wantMode: localtest.ReleaseMode,
			wantDev:  false,
		},
		{
			name:     "release mode when env var set but no Dockerfile",
			envValue: "true",
			setup: func(t *testing.T) string {
				t.Helper()
				root := t.TempDir()
				if err := os.Mkdir(filepath.Join(root, ".git"), perm.DirPermDefault); err != nil {
					t.Fatalf("create .git: %v", err)
				}
				return root
			},
			wantMode: localtest.ReleaseMode,
			wantDev:  false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Cannot run in parallel due to env var manipulation
			cwd := tc.setup(t)

			// Always set env var to ensure test isolation (empty string = unset)
			t.Setenv(localtest.EnvDevMode, tc.envValue)

			mode, devConfig := localtest.DetectImageMode(cwd)

			if mode != tc.wantMode {
				t.Errorf("DetectImageMode() mode = %v, want %v", mode, tc.wantMode)
			}
			if (devConfig != nil) != tc.wantDev {
				t.Errorf("DetectImageMode() devConfig nil = %v, want nil = %v", devConfig == nil, !tc.wantDev)
			}
		})
	}
}

func TestImageMode_String(t *testing.T) {
	t.Parallel()

	tests := []struct {
		want string
		mode localtest.ImageMode
	}{
		{mode: localtest.ReleaseMode, want: "release"},
		{mode: localtest.DevMode, want: "dev"},
		{mode: localtest.ImageMode(99), want: "unknown"},
	}

	for _, tc := range tests {
		t.Run(tc.want, func(t *testing.T) {
			t.Parallel()
			if got := tc.mode.String(); got != tc.want {
				t.Errorf("ImageMode.String() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestIsPodmanAvailable(t *testing.T) {
	t.Parallel()
	// Just verify the function runs without panicking.
	// Actual result depends on whether podman is installed.
	_ = localtest.IsPodmanAvailable()
}
