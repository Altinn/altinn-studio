package internal_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/version"
)

func TestWorkflow_Run_TagExists(t *testing.T) {
	t.Parallel()

	cfg := internal.WorkflowConfig{
		Component: "studioctl",
		Version:   "v1.2.3",
		DryRun:    true,
		OutputDir: t.TempDir(),
		RepoRoot:  os.TempDir(),
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

func TestWorkflow_Run_StableChecksOutReleaseBranch(t *testing.T) {
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
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}

	if git.checkoutCount != 1 {
		t.Fatalf("expected checkout to be called once, got %d", git.checkoutCount)
	}
	if git.pullCount != 1 {
		t.Fatalf("expected pull to be called once, got %d", git.pullCount)
	}
	if gh.target != "release/studioctl/v1.2" {
		t.Fatalf("target = %s, want release/studioctl/v1.2", gh.target)
	}
}

func TestWorkflow_Run_CleansOutputDirBeforeCollectingAssets(t *testing.T) {
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
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}

	for _, asset := range gh.assets {
		if filepath.Base(asset) == "stale.bin" {
			t.Fatalf("stale asset was uploaded: %s", asset)
		}
	}
}

func TestWorkflow_Run_DirtyWorkingTree(t *testing.T) {
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
		workingTreeClean:   false,
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
	err = workflow.Run(t.Context())

	if err == nil {
		t.Fatalf("expected error for dirty working tree, got nil")
	}
	if !errors.Is(err, internal.ErrWorkingTreeDirty) {
		t.Fatalf("error = %v, want ErrWorkingTreeDirty", err)
	}
	if git.checkoutCount != 0 {
		t.Fatalf("expected checkout not to be called, got %d calls", git.checkoutCount)
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
	currentBranch      string
	lastCheckout       string
	lastPull           string
	checkoutCount      int
	pullCount          int
	tagExists          bool
	remoteBranchExists bool
	workingTreeClean   bool
}

func (g *fakeGit) TagExists(_ context.Context, _ string) (bool, error) {
	return g.tagExists, nil
}

func (g *fakeGit) CurrentBranch(_ context.Context) (string, error) {
	if g.currentBranch == "" {
		return "main", nil
	}
	return g.currentBranch, nil
}

func (g *fakeGit) RemoteBranchExists(_ context.Context, _ string) (bool, error) {
	return g.remoteBranchExists, nil
}

func (g *fakeGit) Checkout(_ context.Context, ref string) error {
	g.lastCheckout = ref
	g.checkoutCount++
	return nil
}

func (g *fakeGit) Pull(_ context.Context, remote, branch string) error {
	g.lastPull = remote + "/" + branch
	g.pullCount++
	return nil
}

func (g *fakeGit) CreateBranch(_ context.Context, _ string) error {
	return nil
}

func (g *fakeGit) PushWithUpstream(_ context.Context, _, _ string) error {
	return nil
}

func (g *fakeGit) RepoRoot(_ context.Context) (string, error) {
	return ".", nil
}

func (g *fakeGit) WorkingTreeClean(_ context.Context) (bool, error) {
	if !g.workingTreeClean {
		return false, nil
	}
	return true, nil
}

type fakeGH struct {
	tag             string
	target          string
	assets          []string
	assetCount      int
	prerelease      bool
	hasReleaseNotes bool
	called          bool
}

func (g *fakeGH) CreateRelease(_ context.Context, opts internal.Options) error {
	g.called = true
	g.tag = opts.Tag
	g.target = opts.Target
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

func (g *fakeGH) CreatePR(_ context.Context, _ internal.PullRequestOptions) error {
	return nil
}

func (g *fakeGH) SetWorkdir(_ string) {}

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
