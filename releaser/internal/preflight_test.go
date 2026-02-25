package internal_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/releaser/internal"
)

func TestRunPrepareWithDeps_FailsOnDirtyWorkingTree(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Existing unreleased

## [1.0.0] - 2025-01-01

### Added
- Initial release
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.0")
	t.Chdir(repo)

	if err := os.WriteFile(filepath.Join(repo, "dirty.txt"), []byte("dirty\n"), 0o644); err != nil {
		t.Fatalf("write dirty file: %v", err)
	}

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v1.0.1",
	}, git, gh, internal.NopLogger{})
	if !errors.Is(err, internal.ErrWorkingTreeDirty) {
		t.Fatalf("RunPrepareWithDeps() error = %v, want %v", err, internal.ErrWorkingTreeDirty)
	}
}

func TestRunBackportWithDeps_FailsOnDirtyWorkingTree(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Existing unreleased

## [1.0.0] - 2025-01-01

### Added
- Initial release
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.0")
	t.Chdir(repo)

	writeRepoFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

### Added
- Existing unreleased
- Backport candidate

## [1.0.0] - 2025-01-01

### Added
- Initial release
`)
	runGitCmd(t, repo, "add", "src/cli/CHANGELOG.md")
	runGitCmd(t, repo, "commit", "-m", "add backport candidate")
	commitSHA := revParseHead(t, repo)

	if err := os.WriteFile(filepath.Join(repo, "dirty.txt"), []byte("dirty\n"), 0o644); err != nil {
		t.Fatalf("write dirty file: %v", err)
	}

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}
	err := internal.RunBackportWithDeps(t.Context(), internal.BackportRequest{
		Component: "studioctl",
		Commit:    commitSHA,
		Branch:    "v1.0",
	}, git, gh, internal.NopLogger{})
	if !errors.Is(err, internal.ErrWorkingTreeDirty) {
		t.Fatalf("RunBackportWithDeps() error = %v, want %v", err, internal.ErrWorkingTreeDirty)
	}
}
