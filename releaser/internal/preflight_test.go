package internal_test

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
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

func TestRunPrepareWithDeps_FromNestedDir(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing unreleased
`)

	runnerDir := filepath.Join(repo, "releaser")
	if err := os.MkdirAll(runnerDir, 0o755); err != nil {
		t.Fatalf("create runner dir: %v", err)
	}
	t.Chdir(runnerDir)

	git := internal.NewGitCLI(internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v0.1.0-preview.1",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	content, err := os.ReadFile(filepath.Join(repo, "src", "cli", "CHANGELOG.md"))
	if err != nil {
		t.Fatalf("read changelog: %v", err)
	}
	if !strings.Contains(string(content), "## [0.1.0-preview.1] - ") {
		t.Fatalf("promoted changelog missing release section:\n%s", string(content))
	}

	branch, err := git.CurrentBranch(t.Context())
	if err != nil {
		t.Fatalf("CurrentBranch() error = %v", err)
	}
	const wantBranch = "release-prep/studioctl-v0.1.0-preview.1"
	if branch != wantBranch {
		t.Fatalf("CurrentBranch() = %q, want %q", branch, wantBranch)
	}
}

func TestRunPrepareWithDeps_PRBodyFormat(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Add feature A (#1234)

### Fixed

- Fix issue in parser (#1235)
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v0.1.0-preview.1",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if !gh.prCreated {
		t.Fatal("expected PR to be created")
	}
	if gh.prTitle != "chore: release studioctl v0.1.0-preview.1" {
		t.Fatalf("PR title = %q, want %q", gh.prTitle, "chore: release studioctl v0.1.0-preview.1")
	}
	if gh.prLabel != "release/studioctl" {
		t.Fatalf("PR label = %q, want %q", gh.prLabel, "release/studioctl")
	}

	const wantBody = `## Description

Prepare release v0.1.0-preview.1

- [Added] Add feature A (#1234)
- [Fixed] Fix issue in parser (#1235)`
	if gh.prBody != wantBody {
		t.Fatalf("PR body mismatch\nwant:\n%s\ngot:\n%s", wantBody, gh.prBody)
	}
}

func TestRunPrepareWithDeps_StopsWhenCommitNotConfirmed(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing unreleased
`)
	t.Chdir(repo)

	headBefore := revParseHead(t, repo)
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}
	prompter := &scriptedPrompter{
		answers: []bool{false},
	}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v0.1.0-preview.1",
		Prompter:  prompter,
	}, git, gh, internal.NopLogger{})
	if !errors.Is(err, internal.ErrActionNotConfirmed) {
		t.Fatalf("RunPrepareWithDeps() error = %v, want %v", err, internal.ErrActionNotConfirmed)
	}

	headAfter := revParseHead(t, repo)
	if headAfter != headBefore {
		t.Fatalf("HEAD changed after declined confirmation: before=%s after=%s", headBefore, headAfter)
	}
	if gh.prCreated {
		t.Fatal("expected PR to not be created")
	}
	if len(prompter.calls) != 1 {
		t.Fatalf("prompt calls = %d, want 1", len(prompter.calls))
	}
	const wantAction = "promote changelog and create commit"
	if prompter.calls[0].action != wantAction {
		t.Fatalf("prompt action = %q, want %q", prompter.calls[0].action, wantAction)
	}
}

func TestGitCLI_RunWrite_AutoResolvesRepoRootFromNestedDir(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing unreleased
`)
	runnerDir := filepath.Join(repo, "releaser")
	if err := os.MkdirAll(runnerDir, 0o755); err != nil {
		t.Fatalf("create runner dir: %v", err)
	}
	t.Chdir(runnerDir)

	writeRepoFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

### Added

- Existing unreleased
- Staging check
`)

	git := internal.NewGitCLI(internal.WithLogger(internal.NopLogger{}))
	if err := git.RunWrite(t.Context(), "add", "src/cli/CHANGELOG.md"); err != nil {
		t.Fatalf("RunWrite(add) error = %v", err)
	}

	staged, err := git.Run(t.Context(), "diff", "--cached", "--name-only")
	if err != nil {
		t.Fatalf("Run(diff --cached --name-only) error = %v", err)
	}
	if !strings.Contains(staged, "src/cli/CHANGELOG.md") {
		t.Fatalf("staged files %q missing src/cli/CHANGELOG.md", staged)
	}
}

type promptCall struct {
	action string
	detail []string
}

type scriptedPrompter struct {
	calls   []promptCall
	answers []bool
}

func (p *scriptedPrompter) Confirm(action string, details []string) (bool, error) {
	p.calls = append(p.calls, promptCall{
		action: action,
		detail: append([]string(nil), details...),
	})
	if len(p.answers) == 0 {
		return false, nil
	}
	answer := p.answers[0]
	p.answers = p.answers[1:]
	return answer, nil
}
