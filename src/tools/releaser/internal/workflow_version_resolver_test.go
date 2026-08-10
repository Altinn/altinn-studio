package internal_test

import (
	"context"
	"fmt"
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
				Version:    "v1.2.3-preview.1",
				Commit:     "0123456789abcdef",
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

func TestRunWorkflow_RejectsMismatchedCommit(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, triggerPlanChangelog)
	t.Chdir(repo)
	git := internal.NewGitCLI()

	err := internal.RunWorkflowWithDeps(t.Context(), internal.WorkflowRequest{
		Component:  "studioctl",
		Version:    "v1.2.3-preview.1",
		Commit:     "unexpected",
		BaseBranch: "main",
	}, git, &fakeGH{}, &fakeBuilder{}, internal.NopLogger{})
	if err == nil || !strings.Contains(err.Error(), "current HEAD does not match release commit") {
		t.Fatalf("RunWorkflowWithDeps() error = %v, want commit mismatch", err)
	}
}

func TestRunWorkflow_UsesPlannedBranchFromDetachedCommit(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, triggerPlanChangelog)
	runGitCmd(t, repo, "checkout", "--detach")
	t.Chdir(repo)

	err := runWorkflowWithFakeBuilder(t, internal.WorkflowRequest{
		Component:  "studioctl",
		Version:    "v1.2.3-preview.1",
		BaseBranch: "main",
		DryRun:     true,
		Draft:      true,
	})
	if err != nil {
		t.Fatalf("RunWorkflowWithDeps() error = %v", err)
	}
}

func TestRunWorkflow_RejectsVersionFromWrongBranch(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, triggerPlanChangelog)
	t.Chdir(repo)
	git := internal.NewGitCLI()

	err := internal.RunWorkflowWithDeps(t.Context(), internal.WorkflowRequest{
		Component:  "studioctl",
		Version:    "v1.2.3",
		Commit:     revParseRef(t, repo, "HEAD"),
		BaseBranch: "main",
	}, git, &fakeGH{}, &fakeBuilder{}, internal.NopLogger{})
	if err == nil || !strings.Contains(err.Error(), "must release from release/studioctl/v1.2") {
		t.Fatalf("RunWorkflowWithDeps() error = %v, want branch mismatch", err)
	}
}

const triggerPlanChangelog = `# Changelog

## [Unreleased]

## [v1.2.3-preview.1] - 2025-01-01

### Added

- Test release
`

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
	resolved, err := internal.ResolveWorkflowVersion("studioctl", "main", repo)
	if err != nil {
		t.Fatalf("ResolveWorkflowVersion() error = %v", err)
	}

	err = runWorkflowWithFakeBuilder(t, internal.WorkflowRequest{
		Component:             "studioctl",
		Version:               resolved,
		BaseBranch:            "main",
		DryRun:                true,
		Draft:                 true,
		UnsafeSkipBranchCheck: true,
	})
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
	for _, want := range []string{
		"## Install or update",
		"studioctl self update",
		"https://altinn.studio/designer/api/v1/studioctl/install.sh",
		"https://altinn.studio/designer/api/v1/studioctl/install.ps1",
		"## Changelog\n\n### Added",
	} {
		if !strings.Contains(string(content), want) {
			t.Fatalf("release notes missing expected content %q:\n%s", want, string(content))
		}
	}
	const prereleaseCompare = "**Full Changelog**: https://github.com/Altinn/altinn-studio/compare/studioctl/v1.2.0-preview.1...studioctl/v1.2.0-preview.2"
	if !strings.Contains(string(content), prereleaseCompare) {
		t.Fatalf("release notes missing compare link %q:\n%s", prereleaseCompare, string(content))
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
	resolved, err := internal.ResolveWorkflowVersion("studioctl", "release/studioctl/v1.0", repo)
	if err != nil {
		t.Fatalf("ResolveWorkflowVersion() error = %v", err)
	}

	err = runWorkflowWithFakeBuilder(t, internal.WorkflowRequest{
		Component:             "studioctl",
		Version:               resolved,
		BaseBranch:            "release/studioctl/v1.0",
		DryRun:                true,
		Draft:                 true,
		UnsafeSkipBranchCheck: true,
	})
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
	const patchCompare = "**Full Changelog**: https://github.com/Altinn/altinn-studio/compare/studioctl/v1.0.1...studioctl/v1.0.2"
	if !strings.Contains(string(content), patchCompare) {
		t.Fatalf("release notes missing compare link %q:\n%s", patchCompare, string(content))
	}
}

func TestRunWorkflow_NonDraftReleaseNotesExcludeFullChangelog(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

## [1.2.0-preview.1] - 2025-01-01

### Added

- Preview notes
`)
	t.Chdir(repo)

	err := runWorkflowWithFakeBuilder(t, internal.WorkflowRequest{
		Component:             "studioctl",
		Version:               "v1.2.0-preview.1",
		BaseBranch:            "main",
		DryRun:                true,
		Draft:                 false,
		UnsafeSkipBranchCheck: true,
	})
	if err != nil {
		t.Fatalf("RunWorkflow() error = %v", err)
	}

	notesPath := filepath.Join(repo, "build", "release", "release-notes.md")
	content, readErr := os.ReadFile(notesPath)
	if readErr != nil {
		t.Fatalf("read release notes: %v", readErr)
	}
	if strings.Contains(string(content), "**Full Changelog**:") {
		t.Fatalf("release notes unexpectedly included compare link:\n%s", string(content))
	}
}

func TestRunWorkflow_NoReleasedVersions(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Pending only
`)
	t.Chdir(repo)

	_, err := internal.ResolveWorkflowVersion("studioctl", "main", repo)
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

	_, err := internal.ResolveWorkflowVersion("studioctl", "release/studioctl/v2.0", repo)
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

	writeRepoFile(t, repoDir, "src/cli/CHANGELOG.md", changelog)
	writeRepoFile(t, repoDir, "src/cli/RELEASE_NOTES_INTRO.md", `## Install or update

Update an existing installation:

~~~sh
studioctl self update
~~~

Install a new copy:

Linux and macOS:

~~~sh
curl -sSL https://altinn.studio/designer/api/v1/studioctl/install.sh | sh
~~~

Windows PowerShell:

~~~powershell
iwr https://altinn.studio/designer/api/v1/studioctl/install.ps1 -useb | iex
~~~
`)
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

func addUpstreamRemote(t *testing.T, repoDir string) string {
	t.Helper()

	upstreamDir := filepath.Join(t.TempDir(), "upstream.git")
	if err := os.MkdirAll(upstreamDir, 0o755); err != nil {
		t.Fatalf("mkdir upstream: %v", err)
	}
	runGitCmd(t, upstreamDir, "init", "--bare")
	runGitCmd(t, repoDir, "remote", "add", "upstream", upstreamDir)
	runGitCmd(t, repoDir, "push", "upstream", "main")
	runGitCmd(t, upstreamDir, "symbolic-ref", "HEAD", "refs/heads/main")
	return upstreamDir
}

func updateRemoteChangelog(t *testing.T, remoteDir, changelog string) {
	t.Helper()

	updateRemoteBranchChangelog(t, remoteDir, "main", changelog)
}

func updateRemoteBranchChangelog(t *testing.T, remoteDir, branch, changelog string) {
	t.Helper()

	cloneDir := filepath.Join(t.TempDir(), "checkout")
	runGitCmd(t, filepath.Dir(cloneDir), "clone", remoteDir, cloneDir)
	runGitCmd(t, cloneDir, "config", "user.email", "test@example.com")
	runGitCmd(t, cloneDir, "config", "user.name", "Test User")
	runGitCmd(t, cloneDir, "checkout", branch)
	writeRepoFile(t, cloneDir, "src/cli/CHANGELOG.md", changelog)
	runGitCmd(t, cloneDir, "add", "src/cli/CHANGELOG.md")
	runGitCmd(t, cloneDir, "commit", "-m", "update canonical changelog")
	runGitCmd(t, cloneDir, "push", "origin", branch)
}

func createRemoteBranch(t *testing.T, remoteDir, branch string) {
	t.Helper()

	cloneDir := filepath.Join(t.TempDir(), "checkout")
	runGitCmd(t, filepath.Dir(cloneDir), "clone", remoteDir, cloneDir)
	runGitCmd(t, cloneDir, "checkout", "-b", branch)
	runGitCmd(t, cloneDir, "push", "origin", branch)
}

func createRemoteTag(t *testing.T, remoteDir, tag string) {
	t.Helper()

	cloneDir := filepath.Join(t.TempDir(), "checkout")
	runGitCmd(t, filepath.Dir(cloneDir), "clone", remoteDir, cloneDir)
	runGitCmd(t, cloneDir, "tag", tag)
	runGitCmd(t, cloneDir, "push", "origin", tag)
}

func remoteBranchExists(t *testing.T, repoDir, remote, branch string) bool {
	t.Helper()

	cmd := exec.CommandContext(
		context.Background(),
		"git",
		"ls-remote",
		"--heads",
		remote,
		"refs/heads/"+branch,
	)
	cmd.Dir = repoDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git ls-remote %s %s: %v\n%s", remote, branch, err, string(output))
	}
	return strings.TrimSpace(string(output)) != ""
}

func remoteBranchHead(t *testing.T, repoDir, remote, branch string) string {
	t.Helper()

	cmd := exec.CommandContext(
		context.Background(),
		"git",
		"ls-remote",
		"--heads",
		remote,
		"refs/heads/"+branch,
	)
	cmd.Dir = repoDir
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("git ls-remote %s %s: %v", remote, branch, err)
	}
	fields := strings.Fields(string(output))
	if len(fields) != 2 {
		t.Fatalf("git ls-remote %s %s output = %q", remote, branch, string(output))
	}
	return fields[0]
}

func revParseRef(t *testing.T, repoDir, ref string) string {
	t.Helper()

	cmd := exec.CommandContext(context.Background(), "git", "rev-parse", ref)
	cmd.Dir = repoDir
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("git rev-parse %s: %v", ref, err)
	}
	return strings.TrimSpace(string(output))
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

func runWorkflowWithFakeBuilder(t *testing.T, req internal.WorkflowRequest) error {
	t.Helper()

	git := internal.NewGitCLI(
		internal.WithDryRun(req.DryRun),
		internal.WithLogger(internal.NopLogger{}),
	)
	if req.Commit == "" {
		commit, err := git.HeadCommit(t.Context())
		if err != nil {
			t.Fatalf("resolve test HEAD: %v", err)
		}
		req.Commit = commit
	}

	if err := internal.RunWorkflowWithDeps(
		t.Context(),
		req,
		git,
		&fakeGH{},
		&fakeBuilder{},
		internal.NopLogger{},
	); err != nil {
		return fmt.Errorf("run workflow with fake builder: %w", err)
	}
	return nil
}
