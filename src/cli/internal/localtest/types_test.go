package localtest_test

import (
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/localtest"
)

func TestDevImageConfig_Paths(t *testing.T) {
	t.Parallel()

	cfg := localtest.DevImageConfig{RepoRoot: "/home/user/altinn-studio"}

	tests := []struct {
		name     string
		got      string
		wantPath string
	}{
		{
			name:     "LocaltestContextPath",
			got:      cfg.LocaltestContextPath(),
			wantPath: "/home/user/altinn-studio/src/Runtime/localtest",
		},
		{
			name:     "LocaltestDockerfile is absolute",
			got:      cfg.LocaltestDockerfile(),
			wantPath: "/home/user/altinn-studio/src/Runtime/localtest/Dockerfile",
		},
		{
			name:     "PDF3ContextPath",
			got:      cfg.PDF3ContextPath(),
			wantPath: "/home/user/altinn-studio/src/Runtime/pdf3",
		},
		{
			name:     "PDF3Dockerfile is absolute",
			got:      cfg.PDF3Dockerfile(),
			wantPath: "/home/user/altinn-studio/src/Runtime/pdf3/Dockerfile.worker",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if tc.got != tc.wantPath {
				t.Errorf("got %q, want %q", tc.got, tc.wantPath)
			}
		})
	}
}

func TestDevImageConfig_DockerfileMustBeAbsolute(t *testing.T) {
	t.Parallel()

	cfg := localtest.DevImageConfig{RepoRoot: "/repo"}

	// Dockerfile paths must start with the repo root (be absolute)
	// This ensures docker -f flag works correctly from any cwd
	if !strings.HasPrefix(cfg.LocaltestDockerfile(), cfg.RepoRoot) {
		t.Errorf("LocaltestDockerfile() = %q, must start with RepoRoot %q", cfg.LocaltestDockerfile(), cfg.RepoRoot)
	}
	if !strings.HasPrefix(cfg.PDF3Dockerfile(), cfg.RepoRoot) {
		t.Errorf("PDF3Dockerfile() = %q, must start with RepoRoot %q", cfg.PDF3Dockerfile(), cfg.RepoRoot)
	}
}
