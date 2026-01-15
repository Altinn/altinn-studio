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
	}

	workflow, err := internal.NewWorkflow(t.Context(),
		cfg,
		&fakeGit{tagExists: true},
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
	}

	workflow, err := internal.NewWorkflow(t.Context(),
		cfg,
		&fakeGit{currentBranch: "feature/foo"},
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
	}

	workflow, err := internal.NewWorkflow(t.Context(),
		cfg,
		&fakeGit{currentBranch: "main"},
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

func TestWorkflow_Run_PreviewSuccess(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.2.3-preview.1] - 2025-01-01

### Added
- Test entry
`)

	outputDir := t.TempDir()
	builder := &fakeBuilder{}
	gh := &fakeGH{}

	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3-preview.1",
		ChangelogPath: changelogPath,
		OutputDir:     outputDir,
		DryRun:        false,
		Draft:         true,
	}

	workflow, err := internal.NewWorkflow(
		t.Context(),
		cfg,
		&fakeGit{currentBranch: "main"},
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

	if !gh.called {
		t.Fatalf("expected gh CreateRelease to be called")
	}
	if gh.tag != "studioctl/v1.2.3-preview.1" {
		t.Fatalf("tag = %s, want studioctl/v1.2.3-preview.1", gh.tag)
	}
	if !gh.prerelease {
		t.Fatalf("expected prerelease true")
	}
	if gh.target != "main" {
		t.Fatalf("target = %s, want main", gh.target)
	}
	if gh.assetCount == 0 {
		t.Fatalf("expected assets to be uploaded")
	}
	if gh.hasReleaseNotes {
		t.Fatalf("release notes should not be an asset")
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
	}

	cfg := internal.WorkflowConfig{
		Component:     "studioctl",
		Version:       "v1.2.3",
		ChangelogPath: changelogPath,
		OutputDir:     outputDir,
		DryRun:        false,
		Draft:         true,
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

func TestWorkflow_Run_NilBuilder(t *testing.T) {
	t.Parallel()

	changelogPath := writeChangelog(t, `# Changelog

## [Unreleased]

## [v1.0.0-preview.1] - 2025-01-01

### Added
- Test entry
`)

	outputDir := t.TempDir()
	gh := &fakeGH{}

	// Use fileanalyzers which has no builder configured (changelog-only releases)
	cfg := internal.WorkflowConfig{
		Component:     "fileanalyzers",
		Version:       "v1.0.0-preview.1",
		ChangelogPath: changelogPath,
		OutputDir:     outputDir,
		DryRun:        false,
		Draft:         true,
	}

	// Pass nil builder and use component with no builder - should create changelog-only release
	workflow, err := internal.NewWorkflow(
		t.Context(),
		cfg,
		&fakeGit{currentBranch: "main"},
		gh,
		nil,
		internal.NopLogger{},
	)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}
	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}

	if !gh.called {
		t.Fatalf("expected gh CreateRelease to be called")
	}
	// No assets expected since component has no builder
	if gh.assetCount != 0 {
		t.Fatalf("assetCount = %d, want 0 (changelog-only release)", gh.assetCount)
	}
}

func TestNewWorkflow_InvalidComponent(t *testing.T) {
	t.Parallel()

	cfg := internal.WorkflowConfig{
		Component: "unknown",
		Version:   "v1.0.0",
	}

	_, err := internal.NewWorkflow(t.Context(), cfg, &fakeGit{}, &fakeGH{}, nil, internal.NopLogger{})
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

	_, err := internal.NewWorkflow(t.Context(), cfg, &fakeGit{}, &fakeGH{}, nil, internal.NopLogger{})
	if err == nil {
		t.Fatalf("expected error for invalid version, got nil")
	}
	if !errors.Is(err, version.ErrInvalidFormat) {
		t.Fatalf("error = %v, want ErrInvalidFormat", err)
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

type fakeGH struct {
	tag             string
	target          string
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
