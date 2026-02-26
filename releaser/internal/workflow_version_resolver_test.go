package internal_test

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/releaser/internal"
)

func TestRunWorkflow_RequiresBaseBranch(t *testing.T) {
	t.Parallel()

	err := internal.RunWorkflow(t.Context(), internal.WorkflowRequest{
		Component: "studioctl",
	}, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunWorkflow() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "base branch is required") {
		t.Fatalf("RunWorkflow() error = %v, want message containing %q", err, "base branch is required")
	}
}

func TestRunWorkflow_InvalidBaseBranch(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		baseBranch string
		wantSubstr string
	}{
		{
			name:       "invalid format",
			baseBranch: "release/studioctl/main",
			wantSubstr: "base branch must be main or release/<component>/vX.Y",
		},
		{
			name:       "component mismatch",
			baseBranch: "release/other/v1.2",
			wantSubstr: "branch component other does not match studioctl",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			err := internal.RunWorkflow(t.Context(), internal.WorkflowRequest{
				Component:  "studioctl",
				BaseBranch: tt.baseBranch,
				DryRun:     true,
			}, internal.NopLogger{})
			if err == nil {
				t.Fatal("RunWorkflow() expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantSubstr) {
				t.Fatalf("RunWorkflow() error = %v, want message containing %q", err, tt.wantSubstr)
			}
		})
	}
}

func TestRunWorkflow_SelectsLatestPrereleaseForMain(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

## [1.2.0-preview.2] - 2025-01-02

### Added

- Latest preview notes

## [1.2.0-preview.1] - 2025-01-01

### Added

- Old preview notes
`)
	t.Chdir(repo)

	err := internal.RunWorkflow(t.Context(), internal.WorkflowRequest{
		Component:             "studioctl",
		BaseBranch:            "main",
		DryRun:                true,
		Draft:                 true,
		UnsafeSkipBranchCheck: true,
	}, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunWorkflow() error = %v", err)
	}

	notesPath := filepath.Join(repo, "build", "release", "release-notes.md")
	content, readErr := os.ReadFile(notesPath)
	if readErr != nil {
		t.Fatalf("read release notes: %v", readErr)
	}
	if !strings.Contains(string(content), "Latest preview notes") {
		t.Fatalf("release notes did not use latest prerelease:\n%s", string(content))
	}
}

func TestRunWorkflow_SelectsLatestStableForReleaseLine(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

## [1.1.0] - 2025-01-03

### Added

- Other line

## [1.0.2] - 2025-01-02

### Fixed

- Latest patch notes

## [1.0.1] - 2025-01-01

### Fixed

- Old patch notes
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.0")
	t.Chdir(repo)

	err := internal.RunWorkflow(t.Context(), internal.WorkflowRequest{
		Component:             "studioctl",
		BaseBranch:            "release/studioctl/v1.0",
		DryRun:                true,
		Draft:                 true,
		UnsafeSkipBranchCheck: true,
	}, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunWorkflow() error = %v", err)
	}

	notesPath := filepath.Join(repo, "build", "release", "release-notes.md")
	content, readErr := os.ReadFile(notesPath)
	if readErr != nil {
		t.Fatalf("read release notes: %v", readErr)
	}
	if !strings.Contains(string(content), "Latest patch notes") {
		t.Fatalf("release notes did not use latest stable patch:\n%s", string(content))
	}
}

func TestRunWorkflow_NoReleasedVersions(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Pending only
`)
	t.Chdir(repo)

	err := internal.RunWorkflow(t.Context(), internal.WorkflowRequest{
		Component:             "studioctl",
		BaseBranch:            "main",
		DryRun:                true,
		UnsafeSkipBranchCheck: true,
	}, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunWorkflow() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "no released version found in changelog") {
		t.Fatalf("RunWorkflow() error = %v, want no released version message", err)
	}
}

func TestRunWorkflow_NoMatchingReleaseLine(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

## [1.0.1] - 2025-01-01

### Fixed

- Existing line
`)
	createReleaseBranch(t, repo, "release/studioctl/v2.0")
	t.Chdir(repo)

	err := internal.RunWorkflow(t.Context(), internal.WorkflowRequest{
		Component:             "studioctl",
		BaseBranch:            "release/studioctl/v2.0",
		DryRun:                true,
		UnsafeSkipBranchCheck: true,
	}, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunWorkflow() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "no released version matching base branch") {
		t.Fatalf("RunWorkflow() error = %v, want no matching release message", err)
	}
}

func createStudioctlWorkflowRepo(t *testing.T, changelog string) string {
	t.Helper()

	repoDir := t.TempDir()
	runGitCmd(t, repoDir, "init", "-b", "main")
	runGitCmd(t, repoDir, "config", "user.email", "test@example.com")
	runGitCmd(t, repoDir, "config", "user.name", "Test User")

	writeRepoFile(t, repoDir, "go.mod", "module altinn.studio/studioctl\n\ngo 1.22.0\n")
	writeRepoFile(
		t,
		repoDir,
		"internal/cmd/version.go",
		"package cmd\n\nvar version = \"dev\"\n\nfunc Version() string { return version }\n",
	)
	writeRepoFile(
		t,
		repoDir,
		"src/cli/cmd/studioctl/main.go",
		"package main\n\nimport (\n\t\"fmt\"\n\tcmd \"altinn.studio/studioctl/internal/cmd\"\n)\n\nfunc main() { fmt.Println(cmd.Version()) }\n",
	)
	writeRepoFile(t, repoDir, "src/cli/cmd/studioctl/install.sh", "#!/usr/bin/env sh\necho install\n")
	writeRepoFile(t, repoDir, "src/cli/cmd/studioctl/install.ps1", "Write-Host 'install'\n")
	writeRepoFile(t, repoDir, "src/Runtime/localtest/testdata/data.txt", "data\n")
	writeRepoFile(t, repoDir, "src/Runtime/localtest/infra/config.json", "{}\n")
	writeRepoFile(t, repoDir, "src/cli/CHANGELOG.md", changelog)
	writeRepoFile(t, repoDir, "README.md", "test\n")

	runGitCmd(t, repoDir, "add", ".")
	runGitCmd(t, repoDir, "commit", "-m", "init")

	originDir := filepath.Join(t.TempDir(), "origin.git")
	if err := os.MkdirAll(originDir, 0o755); err != nil {
		t.Fatalf("mkdir origin: %v", err)
	}
	runGitCmd(t, originDir, "init", "--bare")
	runGitCmd(t, repoDir, "remote", "add", "origin", originDir)
	runGitCmd(t, repoDir, "push", "-u", "origin", "main")

	return repoDir
}

func createReleaseBranch(t *testing.T, repoDir, releaseBranch string) {
	t.Helper()

	runGitCmd(t, repoDir, "checkout", "-b", releaseBranch)
	runGitCmd(t, repoDir, "push", "-u", "origin", releaseBranch)
	runGitCmd(t, repoDir, "checkout", "main")
}

func runGitCmd(t *testing.T, dir string, args ...string) {
	t.Helper()

	cmd := exec.CommandContext(context.Background(), "git", args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, string(output))
	}
}

func writeRepoFile(t *testing.T, repoDir, relPath, content string) {
	t.Helper()

	fullPath := filepath.Join(repoDir, relPath)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", filepath.Dir(fullPath), err)
	}
	if err := os.WriteFile(fullPath, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", relPath, err)
	}
}
