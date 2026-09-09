package internal_test

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"altinn.studio/releaser/internal"
)

const canonicalTestRepositoryName = "Altinn/altinn-studio"

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
		Line:      "v1.0",
	}, git, gh, internal.NopLogger{})
	if !errors.Is(err, internal.ErrWorkingTreeDirty) {
		t.Fatalf("RunBackportWithDeps() error = %v, want %v", err, internal.ErrWorkingTreeDirty)
	}
}

func TestRunBackportWithDeps_DiscoversCanonicalAndPushRemotes(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing unreleased

## [1.0.0] - 2025-01-01

### Added

- Initial release
`)
	runGitCmd(t, repo, "remote", "rename", "origin", "contributor-fork")
	upstream := addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "remote", "rename", "upstream", "canonical-altinn")
	const releaseBranch = "release/studioctl/v1.0"
	createRemoteBranch(t, upstream, releaseBranch)

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
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{
		canonicalRepositoryURL:  upstream,
		canonicalRepositoryName: canonicalTestRepositoryName,
		pushRepositoryName:      "martinothamar-agent/altinn-studio",
	}
	err := internal.RunBackportWithDeps(t.Context(), internal.BackportRequest{
		Component: "studioctl",
		Commit:    commitSHA,
		Line:      "v1.0",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunBackportWithDeps() error = %v", err)
	}

	if remoteBranchExists(t, repo, "contributor-fork", releaseBranch) {
		t.Fatalf("release branch %s should not be required in the fork", releaseBranch)
	}
	if gh.prBase != releaseBranch {
		t.Fatalf("PR base = %q, want %s", gh.prBase, releaseBranch)
	}
	if gh.prRepository != canonicalTestRepositoryName {
		t.Fatalf("PR repository = %q, want canonical repository", gh.prRepository)
	}
	if !strings.HasPrefix(gh.prHead, "martinothamar-agent:backport/studioctl-v1.0-") {
		t.Fatalf("PR head = %q, want contributor fork backport branch", gh.prHead)
	}
}

func TestRunPrepareWithDeps_FromNestedDir(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing unreleased
`)

	runnerDir := filepath.Join(repo, "src", "tools", "releaser")
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

	wantSnippets := []string{
		"## Description",
		"Prepare release v0.1.0-preview.1",
		"- [Added] Add feature A (#1234)",
		"- [Fixed] Fix issue in parser (#1235)",
		"@coderabbitai ignore",
	}
	for _, snippet := range wantSnippets {
		if !strings.Contains(gh.prBody, snippet) {
			t.Fatalf("PR body missing snippet %q\nbody:\n%s", snippet, gh.prBody)
		}
	}
}

func TestRunPrepareWithDeps_DryRunLogsOnlyPromotedReleaseSection(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, changelogWithPreviousRelease())
	t.Chdir(repo)

	var output bytes.Buffer
	logger := internal.NewConsoleLogger(internal.WithWriters(&output, &output))
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v0.1.0-preview.2",
		DryRun:    true,
	}, git, gh, logger)
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	assertPromotedReleaseLog(t, output.String())
}

func TestRunPrepareWithDeps_LogsOnlyPromotedReleaseSectionWhenUpdatingChangelog(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, changelogWithPreviousRelease())
	t.Chdir(repo)

	var output bytes.Buffer
	logger := internal.NewConsoleLogger(internal.WithWriters(&output, &output))
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v0.1.0-preview.2",
	}, git, gh, logger)
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	assertPromotedReleaseLog(t, output.String())
}

func TestRunPrepareWithDeps_PRBodyIncludesCompareLink(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Patch entry

## [1.0.0] - 2025-01-01

### Added

- Initial release
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.0")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v1.0.1",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	const want = "**Full Changelog**: https://github.com/Altinn/altinn-studio/compare/studioctl/v1.0.0...studioctl/v1.0.1"
	if !strings.Contains(gh.prBody, want) {
		t.Fatalf("PR body missing compare link %q\nbody:\n%s", want, gh.prBody)
	}
}

func TestRunPrepareWithDeps_InferredPrereleaseVersion(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next prerelease entry

## [1.2.0-rc.3] - 2025-01-03

### Added

- Previous prerelease

## [1.1.0] - 2025-01-01

### Added

- Previous stable
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if gh.prBase != "main" {
		t.Fatalf("PR base = %q, want main", gh.prBase)
	}
	if gh.prTitle != "chore: release studioctl v1.2.0-rc.4" {
		t.Fatalf("PR title = %q, want inferred prerelease", gh.prTitle)
	}
	assertChangelogContains(t, repo, "## [1.2.0-rc.4] - ")
}

func TestRunPrepareWithDeps_StartsPlannedPrereleaseLineAfterStabilization(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next release line entry

## [1.2.0-rc.3] - 2025-01-03

### Added

- Stabilizing prerelease
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.2")
	t.Chdir(repo)

	var output bytes.Buffer
	logger := internal.NewConsoleLogger(internal.WithWriters(&output, &output))
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		Line:      "v2.0",
		DryRun:    true,
	}, git, &fakeGH{}, logger)
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if !strings.Contains(output.String(), "Would promote changelog to: [v2.0.0-rc.1]") {
		t.Fatalf("dry-run did not start the planned prerelease line:\n%s", output.String())
	}
}

func TestRunPrepareWithDeps_StartsPlannedLineFromUnnumberedPrerelease(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next release line entry

## [1.2.0-rc] - 2025-01-03

### Added

- Stabilizing release candidate
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.2")
	t.Chdir(repo)

	var output bytes.Buffer
	logger := internal.NewConsoleLogger(internal.WithWriters(&output, &output))
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		Line:      "v1.3",
		DryRun:    true,
	}, git, &fakeGH{}, logger)
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}
	if !strings.Contains(output.String(), "Would promote changelog to: [v1.3.0-rc.1]") {
		t.Fatalf("dry-run did not carry the unnumbered prerelease channel:\n%s", output.String())
	}
}

func TestRunPrepareWithDeps_RejectsPrereleaseCandidateFromStaleMain(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Initially resolved entry

## [1.2.0-preview.3] - 2025-01-03

### Added

- Initial channel
`)
	upstream := addUpstreamRemote(t, repo)
	createRemoteBranch(t, upstream, "release/studioctl/v1.2")
	const canonicalMainBranch = "main"
	fetches := 0
	gitLog := &commandHookLogger{
		onCommand: func(command string, args []string) {
			if command != "git" || len(args) != 3 ||
				args[0] != "fetch" || args[1] != "upstream" || args[2] != canonicalMainBranch {
				return
			}
			fetches++
			if fetches != 2 {
				return
			}
			updateRemoteChangelog(t, upstream, `# Changelog

## [Unreleased]

### Added

- Concurrently resolved entry

## [1.2.0-rc.1] - 2025-01-04

### Added

- Concurrent channel
`)
		},
	}
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(gitLog))
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		Line:      "v1.3",
		DryRun:    true,
	}, git, &fakeGH{canonicalRepositoryURL: upstream}, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected stale candidate error, got nil")
	}
	if !strings.Contains(err.Error(), "prerelease candidate differs") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want stale candidate error", err)
	}
	if fetches != 2 {
		t.Fatalf("main fetches = %d, want concurrent update before pinned fetch", fetches)
	}
}

func TestRunPrepareWithDeps_IncrementsNewestPrereleaseAcrossHistoricalLines(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next prerelease entry

## [2.0.0-rc.1] - 2025-02-01

### Added

- Current release line

## [1.2.0-rc.3] - 2025-01-03

### Added

- Historical release line
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}
	if gh.prTitle != "chore: release studioctl v2.0.0-rc.2" {
		t.Fatalf("PR title = %q, want newest prerelease line increment", gh.prTitle)
	}
}

func TestRunPrepareWithDeps_RejectsPlannedPrereleaseLineBeforeStabilization(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next prerelease entry

## [1.2.0-preview.3] - 2025-01-03

### Added

- Active prerelease
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		Line:      "v1.3",
		DryRun:    true,
	}, git, &fakeGH{}, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "active prerelease line has not entered stabilization") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want open prerelease line error", err)
	}
}

func TestRunPrepareWithDeps_RejectsPlannedPrereleaseLineThatIsNotNewer(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next prerelease entry

## [1.2.0-preview.3] - 2025-01-03

### Added

- Stabilizing prerelease
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.2")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		Line:      "v1.2",
		DryRun:    true,
	}, git, &fakeGH{}, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "planned prerelease line must be newer") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want newer release line error", err)
	}
}

func TestRunPrepareWithDeps_InferredPrereleaseUsesDiscoveredCanonicalRemote(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Fork entry

## [1.2.0-rc.2] - 2025-01-02

### Added

- Fork prerelease
`)
	runGitCmd(t, repo, "remote", "rename", "origin", "my-fork")
	upstream := addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "remote", "rename", "upstream", "release-source")
	updateRemoteChangelog(t, upstream, `# Changelog

## [Unreleased]

### Added

- Canonical entry

## [1.2.0-rc.3] - 2025-01-03

### Added

- Canonical prerelease
`)
	t.Chdir(repo)

	var output bytes.Buffer
	logger := internal.NewConsoleLogger(internal.WithWriters(&output, &output))
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{canonicalRepositoryURL: upstream}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		DryRun:    true,
	}, git, gh, logger)
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if !strings.Contains(output.String(), "Would promote changelog to: [v1.2.0-rc.4]") {
		t.Fatalf("dry-run did not infer from canonical upstream:\n%s", output.String())
	}
	if strings.Contains(output.String(), "Fork entry") {
		t.Fatalf("dry-run used stale fork changelog:\n%s", output.String())
	}
}

func TestRunPrepareWithDeps_RejectsAmbiguousPushRemote(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next entry

## [1.2.0-preview.1] - 2025-01-02

### Added

- Previous prerelease
`)
	addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "config", "--unset", "branch.main.remote")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		DryRun:    true,
	}, git, &fakeGH{}, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected ambiguous push remote error, got nil")
	}
	if !strings.Contains(err.Error(), "git push remote is ambiguous") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want ambiguous push remote", err)
	}
}

func TestGitCLI_PushRemoteDoesNotInheritMainRemoteForUntrackedBranch(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]
`)
	addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "config", "branch.main.remote", "upstream")
	runGitCmd(t, repo, "checkout", "-b", "topic-without-upstream")

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	remotes, err := git.Remotes(t.Context())
	if err != nil {
		t.Fatalf("Remotes() error = %v", err)
	}
	_, err = git.PushRemote(t.Context(), remotes)
	if err == nil {
		t.Fatal("PushRemote() expected ambiguous remote error, got nil")
	}
	if !strings.Contains(err.Error(), "git push remote is ambiguous") {
		t.Fatalf("PushRemote() error = %v, want ambiguous push remote", err)
	}
}

func TestRunPrepareWithDeps_RejectsCanonicalPathOnDifferentHost(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next entry

## [1.2.0-preview.1] - 2025-01-02

### Added

- Previous prerelease
`)
	runGitCmd(
		t,
		repo,
		"remote",
		"add",
		"untrusted-source",
		"https://attacker.example/Altinn/altinn-studio.git",
	)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{
		canonicalRepositoryURL:  "https://github.com/Altinn/altinn-studio",
		canonicalRepositoryName: canonicalTestRepositoryName,
		pushRepositoryName:      "martinothamar-agent/altinn-studio",
	}
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected missing canonical remote error, got nil")
	}
	if !strings.Contains(err.Error(), "canonical GitHub repository has no matching git remote") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want canonical remote mismatch", err)
	}
}

func TestWorkflow_UsesDiscoveredCanonicalRepository(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

## [1.2.0-preview.2] - 2025-01-02

### Added

- Prerelease entry
`)
	runGitCmd(t, repo, "remote", "rename", "origin", "contributor-fork")
	canonicalURL := addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "remote", "rename", "upstream", "release-source")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{
		canonicalRepositoryURL:  canonicalURL,
		canonicalRepositoryName: canonicalTestRepositoryName,
		pushRepositoryName:      "martinothamar-agent/altinn-studio",
	}
	workflow, err := internal.NewWorkflow(
		t.Context(),
		internal.WorkflowConfig{
			Component:     "studioctl",
			Version:       "v1.2.0-preview.2",
			ChangelogPath: "src/cli/CHANGELOG.md",
			OutputDir:     filepath.Join(repo, "build", "release"),
			RepoRoot:      repo,
			DryRun:        false,
			Draft:         true,
		},
		git,
		gh,
		&fakeBuilder{},
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error = %v", err)
	}
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("Workflow.Run() error = %v", err)
	}
	if gh.releaseRepository != canonicalTestRepositoryName {
		t.Fatalf(
			"release repository = %q, want canonical repository",
			gh.releaseRepository,
		)
	}
}

func TestRunPrepareWithDeps_InferredStabilizationVersion(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Stabilization fix

## [1.2.0-beta.2] - 2025-01-03

### Fixed

- Beta two

## [1.2.0-beta.1] - 2025-01-02

### Added

- Beta one

## [1.1.0] - 2025-01-01

### Added

- Previous stable
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if gh.prBase != "release/studioctl/v1.2" {
		t.Fatalf("PR base = %q, want release/studioctl/v1.2", gh.prBase)
	}
	if gh.prTitle != "chore: release studioctl v1.2.0" {
		t.Fatalf("PR title = %q, want inferred stable", gh.prTitle)
	}
	assertChangelogContains(t, repo, "## [1.2.0] - ")
	assertChangelogContains(t, repo, "- Beta one")
	assertChangelogContains(t, repo, "- Beta two")
	assertChangelogContains(t, repo, "- Stabilization fix")
}

func TestRunPrepareWithDeps_StabilizationUsesDiscoveredRepositoryTopology(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Stabilization fix

## [1.2.0-preview.2] - 2025-01-03

### Added

- Preview two
`)
	runGitCmd(t, repo, "remote", "rename", "origin", "contributor-fork")
	upstream := addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "remote", "rename", "upstream", "canonical-altinn")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{
		canonicalRepositoryURL:  upstream,
		canonicalRepositoryName: canonicalTestRepositoryName,
		pushRepositoryName:      "martinothamar-agent/altinn-studio",
	}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps(stabilization) error = %v", err)
	}

	const releaseBranch = "release/studioctl/v1.2"
	if !remoteBranchExists(t, repo, "canonical-altinn", releaseBranch) {
		t.Fatalf("canonical remote missing %s", releaseBranch)
	}
	if remoteBranchExists(t, repo, "contributor-fork", releaseBranch) {
		t.Fatalf("release branch %s should not be created only in the fork", releaseBranch)
	}
	if gh.prBase != releaseBranch {
		t.Fatalf("PR base = %q, want %s", gh.prBase, releaseBranch)
	}
	if gh.prRepository != canonicalTestRepositoryName {
		t.Fatalf("PR repository = %q, want canonical repository", gh.prRepository)
	}
	if !strings.HasPrefix(gh.prHead, "martinothamar-agent:release-prep/studioctl-v1.2.0") {
		t.Fatalf("PR head = %q, want contributor fork prep branch", gh.prHead)
	}

	err = internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps(prerelease) expected stabilized-line error, got nil")
	}
	if !strings.Contains(err.Error(), "prerelease line is already stabilizing or stable") {
		t.Fatalf("RunPrepareWithDeps(prerelease) error = %v, want stabilized-line error", err)
	}

	err = internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v1.2.0-preview.3",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps(explicit prerelease) expected stabilized-line error, got nil")
	}
	if !strings.Contains(err.Error(), "prerelease line is already stabilizing or stable") {
		t.Fatalf(
			"RunPrepareWithDeps(explicit prerelease) error = %v, want stabilized-line error",
			err,
		)
	}
}

func TestRunPrepareWithDeps_StabilizationRejectsCanonicalRemoteWithForkPushURL(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Stabilization fix

## [1.2.0-preview.2] - 2025-01-03

### Added

- Preview two
	`)
	canonicalURL := addUpstreamRemote(t, repo)
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	const credential = "super-secret-token"
	runGitCmd(
		t,
		repo,
		"remote",
		"set-url",
		"--push",
		"upstream",
		"https://release-user:"+credential+"@fork.example/martinothamar-agent/altinn-studio.git",
	)
	t.Chdir(repo)

	gh := &fakeGH{canonicalRepositoryURL: canonicalURL}
	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected canonical push URL error, got nil")
	}
	if !strings.Contains(err.Error(), "canonical remote pushes to a different repository") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want canonical push mismatch", err)
	}
	if strings.Contains(err.Error(), credential) {
		t.Fatalf("RunPrepareWithDeps() leaked push URL credential: %v", err)
	}

	const releaseBranch = "release/studioctl/v1.2"
	if remoteBranchExists(t, repo, "origin", releaseBranch) {
		t.Fatalf("release branch %s must not be created in contributor fork", releaseBranch)
	}
	if remoteBranchExists(t, repo, "upstream", releaseBranch) {
		t.Fatalf("release branch %s must not be created after topology error", releaseBranch)
	}
}

func TestRunPrepareWithDeps_StabilizationUsesPrecreatedCanonicalBranch(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Stabilization fix

## [1.2.0-preview.2] - 2025-01-03

### Added

- Preview two
`)
	upstream := addUpstreamRemote(t, repo)
	const releaseBranch = "release/studioctl/v1.2"
	createRemoteBranch(t, upstream, releaseBranch)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{canonicalRepositoryURL: upstream}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}
	if gh.prBase != releaseBranch {
		t.Fatalf("PR base = %q, want %s", gh.prBase, releaseBranch)
	}
	assertChangelogContains(t, repo, "## [1.2.0] - ")
}

func TestRunPrepareWithDeps_StabilizationRejectsBranchAppearingWithDivergentCandidate(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Main stabilization fix

## [1.2.0-preview.2] - 2025-01-03

### Added

- Main preview
`)
	upstream := addUpstreamRemote(t, repo)
	const releaseBranch = "release/studioctl/v1.2"
	branchChecks := 0
	gitLog := &commandHookLogger{
		onCommand: func(command string, args []string) {
			if command != "git" || len(args) == 0 ||
				args[0] != "ls-remote" || args[len(args)-1] != releaseBranch {
				return
			}
			branchChecks++
			if branchChecks != 2 {
				return
			}
			createRemoteBranch(t, upstream, releaseBranch)
			updateRemoteBranchChangelog(t, upstream, releaseBranch, `# Changelog

## [Unreleased]

### Fixed

- Divergent stabilization fix

## [1.3.0-preview.1] - 2025-01-04

### Added

- Divergent preview
`)
		},
	}
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(gitLog))
	gh := &fakeGH{canonicalRepositoryURL: upstream}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected divergent stabilization error, got nil")
	}
	if !strings.Contains(err.Error(), "stabilization candidate differs") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want divergent stabilization error", err)
	}
	if branchChecks != 2 {
		t.Fatalf("release branch checks = %d, want branch created during second check", branchChecks)
	}
}

func TestRunPrepareWithDeps_StabilizationPinsValidatedCanonicalCommit(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Validated stabilization fix

## [1.2.0-preview.2] - 2025-01-03

### Added

- Validated preview
`)
	upstream := addUpstreamRemote(t, repo)
	const releaseBranch = "release/studioctl/v1.2"
	createRemoteBranch(t, upstream, releaseBranch)
	validatedCommit := remoteBranchHead(t, repo, "upstream", releaseBranch)
	runGitCmd(t, repo, "checkout", "-b", "feature/releaser-test")
	runGitCmd(t, repo, "config", "branch.feature/releaser-test.pushRemote", "origin")
	t.Chdir(repo)

	prompter := &callbackPrompter{
		onFirstConfirm: func() {
			updateRemoteBranchChangelog(t, upstream, releaseBranch, `# Changelog

## [Unreleased]

### Fixed

- Concurrent stabilization fix

## [1.2.0-preview.3] - 2025-01-04

### Added

- Concurrent preview
`)
		},
	}
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{canonicalRepositoryURL: upstream}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
		Prompter:  prompter,
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}
	if !prompter.called {
		t.Fatal("expected canonical branch update between validation and checkout")
	}

	concurrentCommit := remoteBranchHead(t, repo, "upstream", releaseBranch)
	if concurrentCommit == validatedCommit {
		t.Fatal("canonical release branch did not advance during prepare")
	}
	prepBase := revParseRef(t, repo, "HEAD^")
	if prepBase != validatedCommit {
		t.Fatalf("prep base = %s, want validated commit %s", prepBase, validatedCommit)
	}
}

func TestRunPrepareWithDeps_InferredStabilizationAllowsUnnumberedPrerelease(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Stabilization fix

## [1.2.0-alpha] - 2025-01-02

### Added

- Alpha release
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if gh.prTitle != "chore: release studioctl v1.2.0" {
		t.Fatalf("PR title = %q, want inferred stable from alpha", gh.prTitle)
	}
	assertChangelogContains(t, repo, "## [1.2.0] - ")
	assertChangelogContains(t, repo, "- Alpha release")
	assertChangelogContains(t, repo, "- Stabilization fix")
}

func TestRunPrepareWithDeps_LineRejectedForStabilizationKind(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next entry

## [1.2.0-rc.1] - 2025-01-02

### Added

- Release candidate
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "stabilization",
		Line:      "v1.2",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "conflicting release line input") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want line conflict", err)
	}
}

func TestRunPrepareWithDeps_InferredPatchVersion(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Pending patch

## [1.0.1] - 2025-01-02

### Fixed

- Previous patch

## [1.0.0] - 2025-01-01

### Added

- Initial release
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.0")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "patch",
		Line:      "v1.0",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if gh.prBase != "release/studioctl/v1.0" {
		t.Fatalf("PR base = %q, want release/studioctl/v1.0", gh.prBase)
	}
	if gh.prTitle != "chore: release studioctl v1.0.2" {
		t.Fatalf("PR title = %q, want inferred patch", gh.prTitle)
	}
	assertChangelogContains(t, repo, "## [1.0.2] - ")
}

func TestRunPrepareWithDeps_InferredPatchUsesCanonicalUpstreamBranch(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Pending patch

## [1.0.1] - 2025-01-02

### Fixed

- Previous patch

## [1.0.0] - 2025-01-01

### Added

- Initial release
`)
	upstream := addUpstreamRemote(t, repo)
	const releaseBranch = "release/studioctl/v1.0"
	createRemoteBranch(t, upstream, releaseBranch)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{canonicalRepositoryURL: upstream}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "patch",
		Line:      "v1.0",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if remoteBranchExists(t, repo, "origin", releaseBranch) {
		t.Fatalf("release branch %s should not be required in the fork", releaseBranch)
	}
	if gh.prBase != releaseBranch {
		t.Fatalf("PR base = %q, want %s", gh.prBase, releaseBranch)
	}
	if gh.prTitle != "chore: release studioctl v1.0.2" {
		t.Fatalf("PR title = %q, want inferred canonical patch", gh.prTitle)
	}
	assertChangelogContains(t, repo, "## [1.0.2] - ")
}

func TestRunPrepareWithDeps_InferredPatchLineFromCurrentBranch(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Pending patch

## [1.0.0] - 2025-01-01

### Added

- Initial release
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.0")
	runGitCmd(t, repo, "checkout", "release/studioctl/v1.0")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "patch",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	if gh.prTitle != "chore: release studioctl v1.0.1" {
		t.Fatalf("PR title = %q, want inferred patch from current branch", gh.prTitle)
	}
}

func TestRunPrepareWithDeps_InferredPatchRejectsBareCurrentLineBranch(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Pending patch

## [1.0.0] - 2025-01-01

### Added

- Initial release
`)
	runGitCmd(t, repo, "checkout", "-b", "v1.0")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "patch",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "release line is required") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want release line required", err)
	}
}

func TestRunPrepareWithDeps_InferredPrereleaseRequiresActivePrerelease(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next entry

## [1.1.0] - 2025-01-01

### Added

- Stable
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "no active prerelease release line found") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want no active prerelease line", err)
	}
}

func TestRunPrepareWithDeps_InferredPrereleaseRequiresNumericSuffix(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next entry

## [1.1.0-alpha] - 2025-01-01

### Added

- Alpha release
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Kind:      "prerelease",
		DryRun:    true,
	}, git, gh, internal.NopLogger{})
	if err == nil {
		t.Fatal("RunPrepareWithDeps() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "active prerelease version must end with numeric prerelease identifier") {
		t.Fatalf("RunPrepareWithDeps() error = %v, want numeric prerelease suffix error", err)
	}
}

func TestRunPrepareWithDeps_FirstStablePRBodyComparesToLatestStable(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- First stable entry

## [1.1.0-preview.2] - 2025-01-03

### Added

- Preview two

## [1.1.0-preview.1] - 2025-01-02

### Added

- Preview one

## [1.0.5] - 2025-01-01

### Fixed

- Latest stable
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v1.1.0",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	const want = "**Full Changelog**: https://github.com/Altinn/altinn-studio/compare/studioctl/v1.0.5...studioctl/v1.1.0"
	if !strings.Contains(gh.prBody, want) {
		t.Fatalf("PR body missing compare link %q\nbody:\n%s", want, gh.prBody)
	}
}

func TestRunPrepareWithDeps_FirstPrereleasePRBodyComparesToLatestStable(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Next major preview entry

## [1.9.3] - 2025-01-03

### Added

- Latest stable v1

## [1.9.3-preview.1] - 2025-01-02

### Added

- Historical preview
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v2.0.0-preview.1",
	}, git, gh, internal.NopLogger{})
	if err != nil {
		t.Fatalf("RunPrepareWithDeps() error = %v", err)
	}

	const want = "**Full Changelog**: https://github.com/Altinn/altinn-studio/compare/studioctl/v1.9.3...studioctl/v2.0.0-preview.1"
	if !strings.Contains(gh.prBody, want) {
		t.Fatalf("PR body missing compare link %q\nbody:\n%s", want, gh.prBody)
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
	if !containsDetail(prompter.calls[0].detail, "Previous version: (none found)") {
		t.Fatalf("prompt details missing previous version: %v", prompter.calls[0].detail)
	}
}

func TestRunPrepareWithDeps_CommitPromptIncludesPreviousVersion(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Fixed

- Pending patch

## [1.0.0] - 2025-01-01

### Added

- Initial release
`)
	createReleaseBranch(t, repo, "release/studioctl/v1.0")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	gh := &fakeGH{}
	prompter := &scriptedPrompter{
		answers: []bool{false},
	}

	err := internal.RunPrepareWithDeps(t.Context(), internal.PrepareRequest{
		Component: "studioctl",
		Version:   "v1.0.1",
		Prompter:  prompter,
	}, git, gh, internal.NopLogger{})
	if !errors.Is(err, internal.ErrActionNotConfirmed) {
		t.Fatalf("RunPrepareWithDeps() error = %v, want %v", err, internal.ErrActionNotConfirmed)
	}
	if len(prompter.calls) != 1 {
		t.Fatalf("prompt calls = %d, want 1", len(prompter.calls))
	}
	if !containsDetail(prompter.calls[0].detail, "Previous version: v1.0.0") {
		t.Fatalf("prompt details missing previous version: %v", prompter.calls[0].detail)
	}
}

func TestGitCLI_RunWrite_AutoResolvesRepoRootFromNestedDir(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing unreleased
`)
	runnerDir := filepath.Join(repo, "src", "tools", "releaser")
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

func TestGitCLI_TagExistsChecksRequestedRemote(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]
`)
	upstream := addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "remote", "rename", "upstream", "tag-source")
	const tag = "studioctl/v0.1.0-preview.1"
	createRemoteTag(t, upstream, tag)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	exists, err := git.TagExists(t.Context(), "tag-source", tag)
	if err != nil {
		t.Fatalf("TagExists() error = %v", err)
	}
	if !exists {
		t.Fatalf("TagExists() = false, want requested remote tag %s", tag)
	}
}

func TestGitCLI_RemoteRefChecksFailClosed(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]
`)
	addUpstreamRemote(t, repo)
	runGitCmd(t, repo, "remote", "rename", "upstream", "canonical")
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	checks := map[string]func(remote string) (bool, error){
		"tag": func(remote string) (bool, error) {
			return git.TagExists(t.Context(), remote, "studioctl/v9.9.9")
		},
		"branch": func(remote string) (bool, error) {
			return git.RemoteBranchExists(t.Context(), remote, "release/studioctl/v9.9")
		},
	}

	for name, check := range checks {
		t.Run(name+" missing ref", func(t *testing.T) {
			exists, err := check("canonical")
			if err != nil {
				t.Fatalf("check missing ref error = %v", err)
			}
			if exists {
				t.Fatal("check missing ref = true, want false")
			}
		})

		t.Run(name+" remote failure", func(t *testing.T) {
			exists, err := check("missing-remote")
			if !errors.Is(err, internal.ErrGitCommandFailed) {
				t.Fatalf("check failed remote error = %v, want ErrGitCommandFailed", err)
			}
			if exists {
				t.Fatal("check failed remote = true, want false")
			}
		})
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

type callbackPrompter struct {
	onFirstConfirm func()
	called         bool
}

func (p *callbackPrompter) Confirm(_ string, _ []string) (bool, error) {
	if !p.called {
		p.called = true
		p.onFirstConfirm()
	}
	return true, nil
}

type commandHookLogger struct {
	internal.NopLogger

	onCommand func(command string, args []string)
}

func (l *commandHookLogger) Command(command string, args []string) {
	l.onCommand(command, args)
}

func containsDetail(details []string, want string) bool {
	return slices.Contains(details, want)
}

func assertChangelogContains(t *testing.T, repo, want string) {
	t.Helper()

	content, err := os.ReadFile(filepath.Join(repo, "src", "cli", "CHANGELOG.md"))
	if err != nil {
		t.Fatalf("read changelog: %v", err)
	}
	if !strings.Contains(string(content), want) {
		t.Fatalf("changelog missing %q:\n%s", want, string(content))
	}
}

func changelogWithPreviousRelease() string {
	return `# Changelog

All notable changes to studioctl will be documented in this file.

## [Unreleased]

### Added

- New local harness command

### Fixed

- Launch profile migration

## [0.1.0-preview.1] - 2025-01-01

### Added

- Previous release entry
`
}

func assertPromotedReleaseLog(t *testing.T, output string) {
	t.Helper()

	wantSnippets := []string{
		"Promoted release changelog:",
		"## [0.1.0-preview.2] - ",
		"### Added",
		"- New local harness command",
		"### Fixed",
		"- Launch profile migration",
	}
	for _, snippet := range wantSnippets {
		if !strings.Contains(output, snippet) {
			t.Fatalf("output missing %q:\n%s", snippet, output)
		}
	}

	unwantedSnippets := []string{
		"# Changelog",
		"All notable changes to studioctl will be documented in this file.",
		"## [Unreleased]",
		"## [0.1.0-preview.1]",
		"- Previous release entry",
	}
	for _, snippet := range unwantedSnippets {
		if strings.Contains(output, snippet) {
			t.Fatalf("output should not contain %q:\n%s", snippet, output)
		}
	}
}
