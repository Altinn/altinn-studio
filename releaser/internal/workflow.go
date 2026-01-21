package internal

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"altinn.studio/releaser/internal/changelog"
	"altinn.studio/releaser/internal/perm"
	"altinn.studio/releaser/internal/version"
)

// Workflow errors.
var (
	ErrChangelogMissing     = errors.New("changelog version section not found")
	ErrBuildFailed          = errors.New("build failed")
	ErrReleaseBranchMissing = errors.New("release branch does not exist for stable release")
)

// WorkflowConfig configures the release workflow.
type WorkflowConfig struct {
	Component             string // Required: component name (e.g., "studioctl")
	Version               string // Required: version to release (e.g., "v1.0.0")
	ChangelogPath         string // Optional: override component's default changelog path
	OutputDir             string // Directory for build artifacts (default: build/release)
	RepoRoot              string // Repository root directory (for gh CLI, default: ../..)
	DryRun                bool   // If true, validate but don't create tags/branches/releases
	Draft                 bool   // If true, create release as draft
	UnsafeSkipBranchCheck bool   // If true, skip branch validation (for testing)
}

// Workflow orchestrates the release process.
type Workflow struct {
	git              GitRunner
	gh               GitHubRunner
	builder          ComponentBuilder // optional: overrides component's builder for testing
	log              Logger
	component        *Component
	tag              *Tag
	changelogContent string
	parsedChangelog  *changelog.Changelog
	config           WorkflowConfig
}

// NewWorkflow creates a new Workflow instance.
// The builder parameter is optional - if nil, uses the component's builder.
func NewWorkflow(
	ctx context.Context,
	config WorkflowConfig,
	git GitRunner,
	gh GitHubRunner,
	builder ComponentBuilder,
	log Logger,
) (*Workflow, error) {
	if config.Component == "" {
		return nil, errComponentRequired
	}
	if config.Version == "" {
		return nil, errReleaseVersionRequired
	}

	comp, err := GetComponent(config.Component)
	if err != nil {
		return nil, fmt.Errorf("get component: %w", err)
	}

	// Validate version format upfront
	if _, err := version.Parse(config.Version); err != nil {
		return nil, fmt.Errorf("parse version: %w", err)
	}

	if config.ChangelogPath == "" {
		config.ChangelogPath = comp.ChangelogPath
	}

	// Resolve RepoRoot if not set
	if config.RepoRoot == "" {
		gitCLI := NewGitCLI()
		root, err := gitCLI.RepoRoot(ctx)
		if err != nil {
			return nil, fmt.Errorf("get repo root: %w", err)
		}
		config.RepoRoot = root
	}

	// Resolve OutputDir relative to repo root if not absolute
	if config.OutputDir == "" {
		config.OutputDir = filepath.Join(config.RepoRoot, "build", "release")
	} else if !filepath.IsAbs(config.OutputDir) {
		config.OutputDir = filepath.Join(config.RepoRoot, config.OutputDir)
	}

	return &Workflow{
		config:           config,
		git:              git,
		gh:               gh,
		builder:          builder,
		log:              log,
		component:        comp,
		tag:              nil,
		changelogContent: "",
		parsedChangelog:  nil,
	}, nil
}

// Run executes the release workflow.
func (w *Workflow) Run(ctx context.Context) error {
	// Step 1: Parse and validate tag
	if err := w.parseTag(); err != nil {
		return err
	}

	// Step 2: Validate tag doesn't already exist
	if err := w.validateTagNotExists(ctx); err != nil {
		return err
	}

	// Step 3: Enforce ref policy and determine target ref
	if err := w.enforceRefPolicy(ctx); err != nil {
		return err
	}

	// Step 4: Validate changelog has version section
	if err := w.handleChangelog(ctx); err != nil {
		return err
	}

	// Step 5: Build artifacts
	if err := w.buildArtifacts(ctx); err != nil {
		return err
	}

	// Step 6: Create GitHub release (gh will create the tag automatically)
	if err := w.createGitHubRelease(ctx); err != nil {
		return err
	}

	w.printSummary()
	return nil
}

func (w *Workflow) parseTag() error {
	w.log.Step("Validating version format")

	verStr := w.config.Version
	if !strings.HasPrefix(verStr, "v") {
		verStr = "v" + verStr
	}

	ver, err := version.Parse(verStr)
	if err != nil {
		return fmt.Errorf("parse version: %w", err)
	}

	w.tag = NewTag(w.component, ver)
	w.log.Detail("Tag", w.tag.Full())
	w.log.Detail("Version", ver.String())
	w.log.Detail("Release branch", w.tag.ReleaseBranch())
	w.log.Detail("Prerelease", strconv.FormatBool(ver.IsPrerelease))

	return nil
}

func (w *Workflow) validateTagNotExists(ctx context.Context) error {
	w.log.Step("Checking tag does not exist")

	tagFull := w.tag.Full()
	exists, err := w.git.TagExists(ctx, tagFull)
	if err != nil {
		return fmt.Errorf("check tag exists: %w", err)
	}

	if exists {
		w.log.Error("Tag %s already exists. Create a new patch version instead.", tagFull)
		return fmt.Errorf("%w: %s", ErrTagExists, tagFull)
	}

	w.log.Success("Tag does not exist")
	return nil
}

// enforceRefPolicy validates the current ref against release type rules.
func (w *Workflow) enforceRefPolicy(ctx context.Context) error {
	w.log.Step("Enforcing ref policy")

	currentBranch, err := w.git.CurrentBranch(ctx)
	if err != nil {
		return fmt.Errorf("get current branch: %w", err)
	}
	w.log.Detail("Current branch", currentBranch)

	if w.tag.Version.IsPrerelease {
		return w.enforcePrereleasePolicy(currentBranch)
	}

	return w.enforceStablePolicy(ctx, currentBranch)
}

func (w *Workflow) enforcePrereleasePolicy(currentBranch string) error {
	if currentBranch != mainBranch {
		if w.config.UnsafeSkipBranchCheck {
			w.log.Info("(unsafe-skip-branch-check) Ignoring branch requirement, on %s", currentBranch)
			return nil
		}
		w.log.Error("Prerelease versions must be triggered from main branch")
		return fmt.Errorf("%w: got %s", ErrNotOnMain, currentBranch)
	}
	w.log.Success("Prerelease release from main branch")
	return nil
}

func (w *Workflow) validateWorkingTreeClean(ctx context.Context) error {
	clean, err := w.git.WorkingTreeClean(ctx)
	if err != nil {
		return fmt.Errorf("check working tree: %w", err)
	}
	if !clean {
		w.log.Error("Working tree has uncommitted changes")
		w.log.Error("Commit or stash changes before releasing:")
		w.log.Error("  git add -A && git commit -m 'your message'")
		w.log.Error("  or: git stash")
		return ErrWorkingTreeDirty
	}
	return nil
}

func (w *Workflow) enforceStablePolicy(ctx context.Context, currentBranch string) error {
	releaseBranch := w.tag.ReleaseBranch()
	branchExists, err := w.git.RemoteBranchExists(ctx, releaseBranch)
	if err != nil {
		return fmt.Errorf("check release branch: %w", err)
	}

	if !branchExists {
		w.log.Error("Release branch %s does not exist for stable release %s", releaseBranch, w.tag.Version.String())
		return fmt.Errorf("%w: %s", ErrReleaseBranchMissing, releaseBranch)
	}

	w.log.Detail("Release branch exists", releaseBranch)

	if currentBranch == releaseBranch {
		w.log.Success("Using release branch")
		return nil
	}

	if w.config.UnsafeSkipBranchCheck {
		w.log.Info("(unsafe-skip-branch-check) Ignoring branch requirement, on %s", currentBranch)
		return nil
	}

	// Pre-flight validation before checkout
	if err := w.validateWorkingTreeClean(ctx); err != nil {
		return err
	}

	w.log.Info("Checking out release branch")
	if err := w.git.Checkout(ctx, releaseBranch); err != nil {
		return fmt.Errorf("checkout release branch: %w", err)
	}
	if err := w.git.Pull(ctx, "origin", releaseBranch); err != nil {
		return fmt.Errorf("pull release branch: %w", err)
	}

	w.log.Success("Using release branch")
	return nil
}

// handleChangelog validates that the changelog contains a section for the release version.
// Changelog promotion must be done via PR before triggering the release workflow.
func (w *Workflow) handleChangelog(_ context.Context) error {
	w.log.Step("Validating changelog")

	changelogFile := w.config.ChangelogPath
	if !filepath.IsAbs(changelogFile) {
		changelogFile = filepath.Join(w.config.RepoRoot, changelogFile)
	}
	//nolint:gosec // G304: changelog path is from config, not user input.
	content, err := os.ReadFile(changelogFile)
	if err != nil {
		return fmt.Errorf("read changelog: %w", err)
	}

	verStr := w.tag.Version.String()
	cl, err := changelog.Parse(string(content))
	if err != nil {
		return fmt.Errorf("parse changelog: %w", err)
	}

	if !cl.HasVersion(verStr) {
		w.log.Error("Changelog section [%s] not found", verStr)
		w.log.Error("Create a PR to promote [Unreleased] before releasing:")
		w.log.Error("  make release-prepare COMPONENT=%s VERSION=%s", w.component.Name, verStr)
		return fmt.Errorf("%w: %s", ErrChangelogMissing, verStr)
	}

	w.changelogContent = string(content)
	w.parsedChangelog = cl
	w.log.Success("Changelog section found")
	return nil
}

func (w *Workflow) buildArtifacts(ctx context.Context) error {
	w.log.Step("Building release artifacts")

	// Use injected builder if available, otherwise use component's builder
	builder := w.builder
	if builder == nil {
		builder = w.component.Builder
	}

	// Skip build if no builder available (changelog-only release)
	if builder == nil {
		w.log.Info("Component has no builder - creating changelog-only release")
		return nil
	}

	// Build using builder
	w.log.Info("Building release artifacts...")
	artifacts, err := builder.Build(ctx, w.tag.Version, w.config.OutputDir)
	if err != nil {
		return fmt.Errorf("build: %w", err)
	}

	w.log.Success(fmt.Sprintf("Built %d artifacts successfully", len(artifacts)))
	return nil
}

// createGitHubRelease creates the GitHub release. The gh CLI will automatically
// create the tag at the target branch if it doesn't exist.
func (w *Workflow) createGitHubRelease(ctx context.Context) error {
	w.log.Step("Creating GitHub release")

	verStr := w.tag.Version.String()

	// Extract release notes from parsed changelog (set by handleChangelog)
	w.log.Info("Extracting release notes...")
	notes, err := w.parsedChangelog.ExtractNotes(verStr)
	if err != nil {
		return fmt.Errorf("extract release notes: %w", err)
	}
	w.log.Info("Release notes:")
	for line := range strings.SplitSeq(notes, "\n") {
		w.log.Info("  %s", line)
	}

	// Ensure output dir exists for release notes
	if dirErr := EnsureDir(w.config.OutputDir); dirErr != nil {
		return fmt.Errorf("ensure output dir: %w", dirErr)
	}

	// Write notes to temp file
	notesFile := filepath.Join(w.config.OutputDir, releaseNotesFile)
	if writeErr := os.WriteFile(notesFile, []byte(notes), perm.FilePermDefault); writeErr != nil {
		return fmt.Errorf("write release notes: %w", writeErr)
	}

	// Collect assets (may be empty for changelog-only releases)
	assets, err := w.collectAssets()
	if err != nil {
		return fmt.Errorf("collect assets: %w", err)
	}

	// Determine target branch for tag creation
	target := w.determineTargetBranch()
	tagFull := w.tag.Full()
	title := w.component.ReleaseTitle(verStr)

	w.log.Info("Creating release with %d assets...", len(assets))
	w.log.Detail("Target branch", target)

	if w.config.DryRun {
		w.log.Info("(dry-run) Would create release:")
		w.log.Detail("Tag", tagFull)
		w.log.Detail("Title", title)
		w.log.Detail("Draft", strconv.FormatBool(w.config.Draft))
		w.log.Detail("Prerelease", strconv.FormatBool(w.tag.Version.IsPrerelease))
		for _, asset := range assets {
			w.log.Info("  Asset: %s", filepath.Base(asset))
		}
		return nil
	}

	opts := Options{
		Tag:             tagFull,
		Title:           title,
		NotesFile:       notesFile,
		Target:          target,
		Assets:          assets,
		Draft:           w.config.Draft,
		Prerelease:      w.tag.Version.IsPrerelease,
		FailOnNoCommits: true,
	}

	// gh CLI needs to run from repo root
	w.gh.SetWorkdir(w.config.RepoRoot)

	if err := w.gh.CreateRelease(ctx, opts); err != nil {
		return fmt.Errorf("create release: %w", err)
	}

	w.log.Success("GitHub release created")
	return nil
}

// determineTargetBranch returns the branch where the tag should be created.
func (w *Workflow) determineTargetBranch() string {
	if w.tag.Version.IsPrerelease {
		return mainBranch
	}
	// Stable release: use the release branch
	return w.tag.ReleaseBranch()
}

func (w *Workflow) collectAssets() ([]string, error) {
	entries, err := os.ReadDir(w.config.OutputDir)
	if err != nil {
		return nil, fmt.Errorf("read output dir: %w", err)
	}

	var assets []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		// Skip the release notes file
		if entry.Name() == releaseNotesFile {
			continue
		}
		assets = append(assets, filepath.Join(w.config.OutputDir, entry.Name()))
	}

	return assets, nil
}

func (w *Workflow) printSummary() {
	w.log.Step("Release Summary")
	w.log.Detail("Component", w.component.Name)
	w.log.Detail("Tag", w.tag.Full())
	w.log.Detail("Version", w.tag.Version.String())
	w.log.Detail("Prerelease", strconv.FormatBool(w.tag.Version.IsPrerelease))
	w.log.Detail("Draft", strconv.FormatBool(w.config.Draft))
	w.log.Detail("Dry run", strconv.FormatBool(w.config.DryRun))

	if w.config.DryRun {
		w.log.Info("")
		w.log.Info("Dry run completed - no changes were made")
	} else {
		w.log.Info("")
		w.log.Success("Release workflow completed successfully!")
	}
}
