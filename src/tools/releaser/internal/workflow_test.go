package internal_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/version"
)

const fakeHeadCommit = "1234567890abcdef1234567890abcdef12345678"

func TestWorkflow_Run_TagExists(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3] - 2025-01-01

### Added

- Test entry
`)

	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3",
		ChangelogPath: changelogPath,
		DryRun:        false,
		OutputDir:     t.TempDir(),
		RepoRoot:      os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(t.Context(),
		cfg,
		&fakeGit{tagExists: true, workingTreeClean: true},
		&fakeGH{},
		&fakeBuilder{},
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	err = workflow.Run(t.Context())

	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, internal.ErrTagExists) {
		t.Fatalf("error = %v, want %v", err, internal.ErrTagExists)
	}
}

func TestWorkflow_Run_DryRunAllowsExistingTag(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3-preview.1] - 2025-01-01

### Added

- Test entry
`)

	builder := &fakeBuilder{}
	gh := &fakeGH{}
	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3-preview.1",
		ChangelogPath: changelogPath,
		DryRun:        true,
		OutputDir:     t.TempDir(),
		RepoRoot:      os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(t.Context(),
		cfg,
		&fakeGit{tagExists: true, currentBranch: "main", workingTreeClean: true},
		gh,
		builder,
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}
	if !builder.called {
		t.Fatal("expected build to run during dry-run")
	}
	if gh.called {
		t.Fatal("expected no GitHub release creation during dry-run")
	}
}

func TestWorkflow_Run_ResumesMatchingDraft(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3-preview.1] - 2025-01-01

### Added

- Test entry
`)
	builder := &fakeBuilder{}
	gh := &fakeGH{existingRelease: &internal.GitHubRelease{
		TargetCommitish: fakeHeadCommit,
		IsDraft:         true,
	}}
	workflow, err := internal.NewWorkflow(t.Context(), internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3-preview.1",
		ChangelogPath: changelogPath,
		OutputDir:     t.TempDir(),
		RepoRoot:      os.TempDir(),
		Draft:         true,
	}, &fakeGit{currentBranch: "main"}, gh, builder, internal.NopLogger{})
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}
	if !builder.called || !gh.updated {
		t.Fatalf("resume called builder=%v updated=%v, want both true", builder.called, gh.updated)
	}
}

func TestWorkflow_Run_RejectsUnsafeExistingRelease(t *testing.T) {
	t.Parallel()

	tests := []struct {
		wantErr error
		name    string
		release internal.GitHubRelease
	}{
		{
			name: "published release",
			release: internal.GitHubRelease{
				TargetCommitish: fakeHeadCommit,
				IsDraft:         false,
			},
			wantErr: internal.ErrReleasePublished,
		},
		{
			name: "draft at another commit",
			release: internal.GitHubRelease{
				TargetCommitish: "another-commit",
				IsDraft:         true,
			},
			wantErr: internal.ErrReleaseTargetMismatch,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			builder := &fakeBuilder{}
			gh := &fakeGH{existingRelease: &tc.release}
			workflow, err := internal.NewWorkflow(t.Context(), internal.WorkflowConfig{
				Component: "studioctl",
				Version:   "v1.2.3-preview.1",
				OutputDir: t.TempDir(),
				RepoRoot:  os.TempDir(),
				Draft:     true,
			}, &fakeGit{currentBranch: "main"}, gh, builder, internal.NopLogger{})
			if err != nil {
				t.Fatalf("NewWorkflow() error: %v", err)
			}
			err = workflow.Run(t.Context())
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("workflow.Run() error = %v, want %v", err, tc.wantErr)
			}
			if builder.called || gh.called {
				t.Fatal("unsafe retry reached build or release mutation")
			}
		})
	}
}

func TestGitHubCLI_UpdateReleaseReplacesDraftAssets(t *testing.T) {
	t.Parallel()

	commands := make([]string, 0, 2)
	logger := &commandHookLogger{onCommand: func(command string, args []string) {
		commands = append(commands, command+" "+strings.Join(args, " "))
	}}
	gh := internal.NewGitHubCLI(
		internal.WithGHDryRun(true),
		internal.WithGHLogger(logger),
	)
	err := gh.UpdateRelease(t.Context(), internal.Options{
		Tag:             "studioctl/v1.2.3-preview.1",
		Title:           "studioctl v1.2.3-preview.1",
		NotesFile:       "/tmp/notes.md",
		Target:          fakeHeadCommit,
		Repository:      "Altinn/altinn-studio",
		Assets:          []string{"/tmp/studioctl.tar.gz"},
		Draft:           true,
		Prerelease:      true,
		FailOnNoCommits: false,
	})
	if err != nil {
		t.Fatalf("UpdateRelease() error: %v", err)
	}
	if len(commands) != 2 {
		t.Fatalf("commands = %v, want edit and upload", commands)
	}
	if !strings.Contains(commands[0], "release edit studioctl/v1.2.3-preview.1") ||
		!strings.Contains(commands[0], "--target "+fakeHeadCommit) {
		t.Fatalf("edit command = %q", commands[0])
	}
	if !strings.Contains(commands[1], "release upload studioctl/v1.2.3-preview.1") ||
		!strings.Contains(commands[1], "--clobber /tmp/studioctl.tar.gz") {
		t.Fatalf("upload command = %q", commands[1])
	}
}

func TestWorkflow_Run_PreviewMustBeOnMain(t *testing.T) {
	t.Parallel()

	cfg := internal.WorkflowConfig{
		Component: "studioctl",
		Version:   "v1.2.3-preview.1",
		DryRun:    true,
		OutputDir: t.TempDir(),
		RepoRoot:  os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(t.Context(),
		cfg,
		&fakeGit{currentBranch: "feature/foo", workingTreeClean: true},
		&fakeGH{},
		&fakeBuilder{},
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	err = workflow.Run(t.Context())

	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, internal.ErrNotOnMain) {
		t.Fatalf("error = %v, want %v", err, internal.ErrNotOnMain)
	}
}

func TestWorkflow_Run_PrereleaseStopsWhenLineClosesBeforePublication(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3-preview.2] - 2025-01-01

### Added

- Test entry
`)
	builder := &fakeBuilder{}
	gh := &fakeGH{}
	git := &fakeGit{
		currentBranch:               "main",
		remoteBranchExistsResponses: []bool{false, true},
		workingTreeClean:            true,
	}
	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3-preview.2",
		ChangelogPath: changelogPath,
		DryRun:        false,
		OutputDir:     t.TempDir(),
		RepoRoot:      os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(
		t.Context(),
		cfg,
		git,
		gh,
		builder,
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	err = workflow.Run(t.Context())

	if err == nil {
		t.Fatal("expected closed prerelease line error, got nil")
	}
	if !strings.Contains(err.Error(), "prerelease line is already stabilizing or stable") {
		t.Fatalf("error = %v, want closed prerelease line error", err)
	}
	if !builder.called {
		t.Fatal("expected build to complete before the final prerelease policy check")
	}
	if gh.called {
		t.Fatal("expected no GitHub release creation after prerelease line closed")
	}
}

func TestWorkflow_Run_ChangelogMissing(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]
`)
	builder := &fakeBuilder{}

	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3-preview.1",
		ChangelogPath: changelogPath,
		DryRun:        true,
		OutputDir:     t.TempDir(),
		RepoRoot:      os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(t.Context(),
		cfg,
		&fakeGit{currentBranch: "main", workingTreeClean: true},
		&fakeGH{},
		builder,
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	err = workflow.Run(t.Context())

	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, internal.ErrChangelogMissing) {
		t.Fatalf("error = %v, want %v", err, internal.ErrChangelogMissing)
	}
	if builder.called {
		t.Fatalf("expected no build calls, got build called")
	}
}

func TestWorkflow_Run_StableRejectsWrongBranch(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3] - 2025-01-01

### Added

- Test entry
`)

	outputDir := t.TempDir()
	builder := &fakeBuilder{}
	gh := &fakeGH{}
	git := &fakeGit{
		currentBranch:      "main",
		remoteBranchExists: true,
		workingTreeClean:   true,
	}

	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3",
		ChangelogPath: changelogPath,
		OutputDir:     outputDir,
		DryRun:        false,
		Draft:         true,
		RepoRoot:      os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(t.Context(), cfg, git, gh, builder, internal.NopLogger{})
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	if err := workflow.Run(t.Context()); err == nil {
		t.Fatal("workflow.Run() expected branch error, got nil")
	}
	if gh.target != "" {
		t.Fatalf("release target = %s, want no release", gh.target)
	}
}

func TestWorkflow_Run_PrereleaseTargetsHeadCommit(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3-preview.1] - 2025-01-01

### Added

- Test entry
`)

	const headCommit = "abcdef1234567890abcdef1234567890abcdef12"
	builder := &fakeBuilder{}
	gh := &fakeGH{}
	git := &fakeGit{
		currentBranch:    "main",
		headCommit:       headCommit,
		workingTreeClean: true,
	}

	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3-preview.1",
		ChangelogPath: changelogPath,
		OutputDir:     t.TempDir(),
		DryRun:        false,
		Draft:         true,
		RepoRoot:      os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(t.Context(), cfg, git, gh, builder, internal.NopLogger{})
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}

	if gh.target != headCommit {
		t.Fatalf("target = %s, want %s", gh.target, headCommit)
	}
	if !gh.prerelease {
		t.Fatal("expected prerelease GitHub release")
	}
}

func TestWorkflow_Run_UsesBuilderArtifacts(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3] - 2025-01-01

### Added

- Test entry
`)

	outputDir := t.TempDir()
	staleAsset := filepath.Join(outputDir, "stale.bin")
	if err := os.WriteFile(staleAsset, []byte("stale"), 0o644); err != nil {
		t.Fatalf("write stale asset: %v", err)
	}

	builder := &fakeBuilder{}
	gh := &fakeGH{}
	git := &fakeGit{
		currentBranch:      "release/studioctl/v1.2",
		remoteBranchExists: true,
		workingTreeClean:   true,
	}

	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3",
		ChangelogPath: changelogPath,
		OutputDir:     outputDir,
		DryRun:        false,
		Draft:         true,
		RepoRoot:      os.TempDir(),
	}

	workflow, err := internal.NewWorkflow(t.Context(), cfg, git, gh, builder, internal.NopLogger{})
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}

	for _, asset := range gh.assets {
		if filepath.Base(asset) == "stale.bin" {
			t.Fatalf("stale asset was uploaded: %s", asset)
		}
	}
	if len(gh.assets) != 1 || filepath.Base(gh.assets[0]) != "dummy-asset" {
		t.Fatalf("assets = %v, want only builder-returned dummy-asset", gh.assets)
	}
}

func TestNewWorkflow_InvalidComponent(t *testing.T) {
	t.Parallel()

	cfg := internal.WorkflowConfig{
		Component: "unknown",
		Version:   "v1.0.0",
	}

	_, err := internal.NewWorkflow(
		t.Context(),
		cfg,
		&fakeGit{workingTreeClean: true},
		&fakeGH{},
		nil,
		internal.NopLogger{},
	)
	if err == nil {
		t.Fatalf("expected error for invalid component, got nil")
	}
	if !errors.Is(err, internal.ErrComponentNotFound) {
		t.Fatalf("error = %v, want ErrComponentNotFound", err)
	}
}

func TestNewWorkflow_InvalidVersion(t *testing.T) {
	t.Parallel()

	cfg := internal.WorkflowConfig{
		Component: "studioctl",
		Version:   "invalid",
	}

	_, err := internal.NewWorkflow(
		t.Context(),
		cfg,
		&fakeGit{workingTreeClean: true},
		&fakeGH{},
		nil,
		internal.NopLogger{},
	)
	if err == nil {
		t.Fatalf("expected error for invalid version, got nil")
	}
	if !errors.Is(err, version.ErrInvalidFormat) {
		t.Fatalf("error = %v, want ErrInvalidFormat", err)
	}
}

func TestNewWorkflow_AcceptsVersionWithoutPrefix(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	cfg := internal.WorkflowConfig{
		Component: "studioctl",
		Version:   "1.2.3",
		OutputDir: filepath.Join(repoRoot, "build", "release"),
		RepoRoot:  repoRoot,
	}

	_, err := internal.NewWorkflow(
		t.Context(),
		cfg,
		&fakeGit{workingTreeClean: true},
		&fakeGH{},
		nil,
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error = %v, want bare version accepted", err)
	}
}

func TestNewWorkflow_OutputDirSafety(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	unsafeParent := filepath.Join(repoRoot, "..")
	unsafeOutside := t.TempDir()
	safeChild := filepath.Join(repoRoot, "build", "release")

	testCases := []struct {
		name      string
		outputDir string
		wantErr   bool
	}{
		{
			name:      "repo-root-is-unsafe",
			outputDir: repoRoot,
			wantErr:   true,
		},
		{
			name:      "parent-is-unsafe",
			outputDir: unsafeParent,
			wantErr:   true,
		},
		{
			name:      "outside-repo-is-unsafe",
			outputDir: unsafeOutside,
			wantErr:   true,
		},
		{
			name:      "child-dir-is-safe",
			outputDir: safeChild,
			wantErr:   false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			cfg := internal.WorkflowConfig{
				Component: "studioctl",
				Version:   "v1.2.3",
				RepoRoot:  repoRoot,
				OutputDir: tc.outputDir,
			}

			_, err := internal.NewWorkflow(
				t.Context(),
				cfg,
				&fakeGit{workingTreeClean: true},
				&fakeGH{},
				nil,
				internal.NopLogger{},
			)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestNewWorkflow_OutputDirSafety_RejectsSymlinkEscape(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(repoRoot, "build")); err != nil {
		t.Skipf("symlink setup not supported: %v", err)
	}

	cfg := internal.WorkflowConfig{
		Component: "studioctl",
		Version:   "v1.2.3",
		RepoRoot:  repoRoot,
		OutputDir: filepath.Join(repoRoot, "build", "release"),
	}

	_, err := internal.NewWorkflow(
		t.Context(),
		cfg,
		&fakeGit{workingTreeClean: true},
		&fakeGH{},
		nil,
		internal.NopLogger{},
	)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
}

type fakeGit struct {
	currentBranch               string
	headCommit                  string
	remoteBranchExistsResponses []bool
	remoteBranchExistsCallCount int
	tagExists                   bool
	remoteBranchExists          bool
	workingTreeClean            bool
}

func (g *fakeGit) TagExists(_ context.Context, _, _ string) (bool, error) {
	return g.tagExists, nil
}

func (g *fakeGit) CurrentBranch(_ context.Context) (string, error) {
	if g.currentBranch == "" {
		return "main", nil
	}
	return g.currentBranch, nil
}

func (g *fakeGit) RemoteBranchExists(_ context.Context, _, _ string) (bool, error) {
	if g.remoteBranchExistsCallCount < len(g.remoteBranchExistsResponses) {
		response := g.remoteBranchExistsResponses[g.remoteBranchExistsCallCount]
		g.remoteBranchExistsCallCount++
		return response, nil
	}
	return g.remoteBranchExists, nil
}

func (g *fakeGit) RepoRoot(_ context.Context) (string, error) {
	return ".", nil
}

func (g *fakeGit) HeadCommit(_ context.Context) (string, error) {
	if g.headCommit == "" {
		return fakeHeadCommit, nil
	}
	return g.headCommit, nil
}

func (g *fakeGit) WorkingTreeClean(_ context.Context) (bool, error) {
	if !g.workingTreeClean {
		return false, nil
	}
	return true, nil
}

func (g *fakeGit) Remotes(_ context.Context) ([]internal.GitRemote, error) {
	return []internal.GitRemote{{
		Name:     "test-remote",
		FetchURL: "https://github.com/Altinn/altinn-studio.git",
		PushURL:  "https://github.com/Altinn/altinn-studio.git",
		PushURLs: 1,
	}}, nil
}

func (g *fakeGit) PushRemote(
	_ context.Context,
	remotes []internal.GitRemote,
) (internal.GitRemote, error) {
	return remotes[0], nil
}

type fakeGH struct {
	existingRelease         *internal.GitHubRelease
	canonicalRepositoryName string
	pushRepositoryName      string
	prTitle                 string
	tag                     string
	prLabel                 string
	prHead                  string
	prRepository            string
	releaseRepository       string
	prBase                  string
	canonicalRepositoryURL  string
	prBody                  string
	target                  string
	assets                  []string
	assetCount              int
	prerelease              bool
	hasReleaseNotes         bool
	called                  bool
	updated                 bool
	prCreated               bool
}

func (g *fakeGH) CreateRelease(_ context.Context, opts internal.Options) error {
	return g.recordRelease(opts, false)
}

func (g *fakeGH) FindRelease(
	_ context.Context,
	_, _ string,
) (internal.GitHubRelease, bool, error) {
	if g.existingRelease == nil {
		return internal.GitHubRelease{}, false, nil
	}
	return *g.existingRelease, true, nil
}

func (g *fakeGH) UpdateRelease(_ context.Context, opts internal.Options) error {
	return g.recordRelease(opts, true)
}

func (g *fakeGH) CreatePR(_ context.Context, opts internal.PullRequestOptions) (string, error) {
	g.prCreated = true
	g.prBase = opts.Base
	g.prTitle = opts.Title
	g.prBody = opts.Body
	g.prLabel = opts.Label
	g.prHead = opts.Head
	g.prRepository = opts.Repository
	return "https://example.test/pr/1", nil
}

func (g *fakeGH) SetWorkdir(_ string) {}

func (g *fakeGH) Repository(
	_ context.Context,
	remoteURL string,
) (internal.Repository, *internal.Repository, error) {
	repository := internal.Repository{
		NameWithOwner: g.pushRepositoryName,
		URL:           remoteURL,
	}
	if g.canonicalRepositoryURL == "" || g.canonicalRepositoryURL == remoteURL {
		return repository, nil, nil
	}
	parent := &internal.Repository{
		NameWithOwner: g.canonicalRepositoryName,
		URL:           g.canonicalRepositoryURL,
	}
	return repository, parent, nil
}

func (g *fakeGH) recordRelease(opts internal.Options, updated bool) error {
	g.called = true
	g.updated = updated
	g.tag = opts.Tag
	g.target = opts.Target
	g.releaseRepository = opts.Repository
	g.prerelease = opts.Prerelease
	g.assetCount = len(opts.Assets)
	g.assets = append([]string(nil), opts.Assets...)
	for _, asset := range opts.Assets {
		if filepath.Base(asset) == "release-notes.md" {
			g.hasReleaseNotes = true
			break
		}
	}
	return nil
}

type fakeBuilder struct {
	called bool
}

func (b *fakeBuilder) Build(_ context.Context, _ *version.Version, outputDir string) ([]string, error) {
	b.called = true
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return nil, fmt.Errorf("mkdir output dir: %w", err)
	}
	assetPath := filepath.Join(outputDir, "dummy-asset")
	if err := os.WriteFile(assetPath, []byte("x"), 0o644); err != nil {
		return nil, fmt.Errorf("write dummy asset: %w", err)
	}
	return []string{assetPath}, nil
}

func writeChangelog(t *testing.T, content string) string {
	t.Helper()

	dir := t.TempDir()
	path := filepath.Join(dir, "CHANGELOG.md")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write changelog: %v", err)
	}
	return path
}
