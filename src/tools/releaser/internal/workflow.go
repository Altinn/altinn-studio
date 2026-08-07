package internal

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
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
	ErrChangelogMissing      = errors.New("changelog version section not found")
	ErrBuildFailed           = errors.New("build failed")
	ErrReleaseBranchMissing  = errors.New("release branch does not exist for stable release")
	ErrReleasePublished      = errors.New("release already exists and is not a draft")
	ErrReleaseTargetMismatch = errors.New("existing draft targets a different commit")
	ErrReleaseTagMismatch    = errors.New("release tag targets a different commit")
	ErrWrongReleaseBranch    = errors.New("release must run from its canonical branch")
	errReleaseTargetMissing  = errors.New("release target commit is empty")
)

// WorkflowConfig configures the release workflow.
type WorkflowConfig struct {
	Component             string // Required: component name (e.g., "studioctl")
	Version               string // Required: version to release (e.g., "v1.0.0")
	BaseBranch            string // Canonical branch supplied by an immutable release plan
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
	artifacts        []string
	topology         RepositoryTopology
	config           WorkflowConfig
	resumeDraft      bool
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

	config.Version = normalizeVersionPrefix(config.Version)
	if _, parseErr := version.Parse(config.Version); parseErr != nil {
		return nil, fmt.Errorf("parse version: %w", parseErr)
	}

	if config.ChangelogPath == "" {
		config.ChangelogPath = comp.ChangelogPath
	}

	if config.RepoRoot == "" {
		root, rootErr := git.RepoRoot(ctx)
		if rootErr != nil {
			return nil, fmt.Errorf("get repo root: %w", rootErr)
		}
		config.RepoRoot = root
	}

	if config.OutputDir == "" {
		config.OutputDir = filepath.Join(config.RepoRoot, "build", "release")
	} else if !filepath.IsAbs(config.OutputDir) {
		config.OutputDir = filepath.Join(config.RepoRoot, config.OutputDir)
	}
	if normalizeErr := normalizeAndValidatePaths(&config); normalizeErr != nil {
		return nil, normalizeErr
	}
	gh.SetWorkdir(config.RepoRoot)
	topology, err := discoverRepositoryTopology(ctx, git, gh)
	if err != nil {
		return nil, fmt.Errorf("discover repository topology: %w", err)
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
		artifacts:        nil,
		topology:         topology,
		resumeDraft:      false,
	}, nil
}

func normalizeAndValidatePaths(config *WorkflowConfig) error {
	repoRoot, err := filepath.Abs(config.RepoRoot)
	if err != nil {
		return fmt.Errorf("resolve repo root path: %w", err)
	}
	outputDir, err := filepath.Abs(config.OutputDir)
	if err != nil {
		return fmt.Errorf("resolve output dir path: %w", err)
	}

	repoRoot = filepath.Clean(repoRoot)
	outputDir = filepath.Clean(outputDir)

	resolvedRepoRoot, err := filepath.EvalSymlinks(repoRoot)
	if err != nil {
		return fmt.Errorf("resolve repo root symlinks: %w", err)
	}
	resolvedOutputDir, err := resolvePathWithExistingParent(outputDir)
	if err != nil {
		return fmt.Errorf("resolve output dir symlinks: %w", err)
	}

	rel, err := filepath.Rel(resolvedRepoRoot, resolvedOutputDir)
	if err != nil {
		return fmt.Errorf("evaluate output dir path: %w", err)
	}
	if rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return fmt.Errorf("%w: %s", errUnsafeCleanDirPath, config.OutputDir)
	}

	config.RepoRoot = resolvedRepoRoot
	config.OutputDir = resolvedOutputDir
	return nil
}

func resolvePathWithExistingParent(path string) (string, error) {
	path = filepath.Clean(path)
	current := path
	missingParts := make([]string, 0, 4)

	for {
		_, err := os.Lstat(current)
		if err == nil {
			resolvedCurrent, evalErr := filepath.EvalSymlinks(current)
			if evalErr != nil {
				return "", fmt.Errorf("eval symlinks for %s: %w", current, evalErr)
			}
			resolved := resolvedCurrent
			for i := len(missingParts) - 1; i >= 0; i-- {
				resolved = filepath.Join(resolved, missingParts[i])
			}
			return filepath.Clean(resolved), nil
		}
		if !os.IsNotExist(err) {
			return "", fmt.Errorf("stat %s: %w", current, err)
		}

		parent := filepath.Dir(current)
		if parent == current {
			return "", fmt.Errorf("%w: %s", errNoExistingParentPath, path)
		}

		missingParts = append(missingParts, filepath.Base(current))
		current = parent
	}
}

// Run executes the release workflow.
func (w *Workflow) Run(ctx context.Context) error {
	if err := w.parseTag(); err != nil {
		return err
	}

	if err := w.prepareReleaseState(ctx); err != nil {
		return err
	}

	if err := w.enforceRefPolicy(ctx); err != nil {
		return err
	}

	if err := w.handleChangelog(ctx); err != nil {
		return err
	}

	if err := w.prepareOutputDir(); err != nil {
		return err
	}

	if err := w.buildArtifacts(ctx); err != nil {
		return err
	}

	if w.tag.Version.IsPrerelease {
		w.log.Step("Rechecking prerelease line before publication")
		if err := w.ensurePrereleaseLineOpen(ctx); err != nil {
			return err
		}
	}

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

func (w *Workflow) prepareReleaseState(ctx context.Context) error {
	w.log.Step("Checking release state")

	tagFull := w.tag.Full()
	if !w.config.DryRun {
		resumed, err := w.prepareExistingDraft(ctx, tagFull)
		if err != nil {
			return err
		}
		if resumed {
			return nil
		}
	}

	exists, err := w.git.TagExists(ctx, w.topology.SourceRemote, tagFull)
	if err != nil {
		return fmt.Errorf("check tag exists: %w", err)
	}

	if exists {
		if w.config.DryRun {
			w.log.Info("(dry-run) Tag %s already exists; continuing to validate build and release packaging", tagFull)
			return nil
		}
		w.log.Error("Tag %s already exists. Create a new patch version instead.", tagFull)
		return fmt.Errorf("%w: %s", ErrTagExists, tagFull)
	}

	w.log.Success("Tag does not exist")
	return nil
}

func (w *Workflow) prepareExistingDraft(ctx context.Context, tag string) (bool, error) {
	existingRelease, found, err := w.gh.FindRelease(
		ctx,
		w.topology.BaseRepository.NameWithOwner,
		tag,
	)
	if err != nil {
		return false, fmt.Errorf("check existing release: %w", err)
	}
	if !found {
		return false, nil
	}
	if !existingRelease.IsDraft {
		return false, fmt.Errorf("%w: %s", ErrReleasePublished, tag)
	}
	target, err := w.determineReleaseTarget(ctx)
	if err != nil {
		return false, err
	}
	if existingRelease.TargetCommitish != target {
		return false, fmt.Errorf(
			"%w: %s targets %s, expected %s",
			ErrReleaseTargetMismatch,
			tag,
			existingRelease.TargetCommitish,
			target,
		)
	}
	w.resumeDraft = true
	w.log.Success("Existing draft matches release plan; publication will resume")
	return true, nil
}

// enforceRefPolicy validates the planned ref against release type rules.
func (w *Workflow) enforceRefPolicy(ctx context.Context) error {
	w.log.Step("Enforcing ref policy")

	baseBranch := w.config.BaseBranch
	if baseBranch == "" {
		currentBranch, err := w.git.CurrentBranch(ctx)
		if err != nil {
			return fmt.Errorf("get current branch: %w", err)
		}
		baseBranch = currentBranch
	}
	w.log.Detail("Base branch", baseBranch)

	if w.tag.Version.IsPrerelease {
		return w.enforcePrereleasePolicy(ctx, baseBranch)
	}

	return w.enforceStablePolicy(ctx, baseBranch)
}

func (w *Workflow) enforcePrereleasePolicy(ctx context.Context, currentBranch string) error {
	if currentBranch != mainBranch {
		if w.config.UnsafeSkipBranchCheck {
			w.log.Info("(unsafe-skip-branch-check) Ignoring branch requirement, on %s", currentBranch)
		} else {
			w.log.Error("Prerelease versions must be triggered from main branch")
			return fmt.Errorf("%w: got %s", ErrNotOnMain, currentBranch)
		}
	} else {
		w.log.Success("Prerelease release from main branch")
	}

	return w.ensurePrereleaseLineOpen(ctx)
}

func (w *Workflow) ensurePrereleaseLineOpen(ctx context.Context) error {
	releaseBranch := w.tag.ReleaseBranch()
	exists, err := w.git.RemoteBranchExists(ctx, w.topology.SourceRemote, releaseBranch)
	if err != nil {
		return fmt.Errorf("check release branch: %w", err)
	}
	if exists {
		w.log.Error(
			"Prerelease line for %s is closed by canonical branch %s",
			w.tag.Version.String(),
			releaseBranch,
		)
		return fmt.Errorf("%w: %s", errPrereleaseLineClosed, releaseBranch)
	}

	w.log.Success("Prerelease line is open")
	return nil
}

func (w *Workflow) prepareOutputDir() error {
	w.log.Step("Preparing output directory")
	if err := EnsureCleanDir(w.config.OutputDir); err != nil {
		return fmt.Errorf("clean output dir: %w", err)
	}
	w.log.Success("Output directory is ready")
	return nil
}

func (w *Workflow) enforceStablePolicy(ctx context.Context, currentBranch string) error {
	releaseBranch := w.tag.ReleaseBranch()
	branchExists, err := w.git.RemoteBranchExists(ctx, w.topology.SourceRemote, releaseBranch)
	if err != nil {
		return fmt.Errorf("check release branch: %w", err)
	}

	if !branchExists {
		w.log.Error("Release branch %s does not exist for stable release %s", releaseBranch, w.tag.Version.String())
		return fmt.Errorf("%w: %s", ErrReleaseBranchMissing, releaseBranch)
	}

	w.log.Detail("Release branch exists", releaseBranch)

	if currentBranch != releaseBranch && w.config.UnsafeSkipBranchCheck {
		w.log.Info("(unsafe-skip-branch-check) Ignoring branch requirement, on %s", currentBranch)
		return nil
	}
	if currentBranch != releaseBranch {
		return fmt.Errorf(
			"%w: expected %s, current branch is %s",
			ErrWrongReleaseBranch,
			releaseBranch,
			currentBranch,
		)
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

	builder := w.builder
	if builder == nil {
		builder = w.component.Builder
	}

	if builder == nil {
		w.log.Info("Component has no builder - creating changelog-only release")
		return nil
	}

	w.log.Info("Building release artifacts...")
	artifacts, err := builder.Build(ctx, w.tag.Version, w.config.OutputDir)
	if err != nil {
		return fmt.Errorf("build: %w", err)
	}

	w.log.Success(fmt.Sprintf("Built %d artifacts successfully", len(artifacts)))
	w.artifacts = append([]string(nil), artifacts...)
	return nil
}

// createGitHubRelease creates the GitHub release. The gh CLI will automatically
// create the tag at the target branch if it doesn't exist.
func (w *Workflow) createGitHubRelease(ctx context.Context) error {
	w.log.Step("Creating GitHub release")

	verStr := w.tag.Version.String()

	w.log.Info("Extracting release notes...")
	notes, err := w.parsedChangelog.ExtractNotes(verStr)
	if err != nil {
		return fmt.Errorf("extract release notes: %w", err)
	}
	notes, err = w.withComponentReleaseNotesIntro(notes)
	if err != nil {
		return fmt.Errorf("read release notes intro: %w", err)
	}
	if w.config.Draft {
		previousVersion := previousReleasedVersion(w.parsedChangelog, verStr)
		previousTag := ""
		if previousVersion != "" {
			previousTag = w.component.Tag(previousVersion)
		}
		notes = withFullChangelogLink(notes, previousTag, w.component.Tag(verStr))
	}
	w.log.Info("Release notes:")
	for line := range strings.SplitSeq(notes, "\n") {
		w.log.Info("  %s", line)
	}

	if dirErr := EnsureDir(w.config.OutputDir); dirErr != nil {
		return fmt.Errorf("ensure output dir: %w", dirErr)
	}

	notesFile := filepath.Join(w.config.OutputDir, releaseNotesFile)
	if writeErr := os.WriteFile(notesFile, []byte(notes), perm.FilePermDefault); writeErr != nil {
		return fmt.Errorf("write release notes: %w", writeErr)
	}

	assets := append([]string(nil), w.artifacts...)

	target, err := w.determineReleaseTarget(ctx)
	if err != nil {
		return err
	}
	tagFull := w.tag.Full()
	title := w.component.ReleaseTitle(verStr)

	w.log.Info("Creating release with %d assets...", len(assets))
	w.log.Detail("Target commit", target)

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
		Repository:      w.topology.BaseRepository.NameWithOwner,
		Assets:          assets,
		Draft:           w.config.Draft,
		Prerelease:      w.tag.Version.IsPrerelease,
		FailOnNoCommits: true,
	}

	// gh CLI needs to run from repo root
	w.gh.SetWorkdir(w.config.RepoRoot)
	if err := w.validateRemoteTagTarget(ctx, target); err != nil {
		return err
	}
	return w.publishGitHubRelease(ctx, opts)
}

func (w *Workflow) validateRemoteTagTarget(ctx context.Context, target string) error {
	tag := w.tag.Full()
	remoteTarget, exists, err := w.git.RemoteTagCommit(ctx, w.topology.SourceRemote, tag)
	if err != nil {
		return fmt.Errorf("resolve remote release tag: %w", err)
	}
	if !exists {
		return nil
	}
	if remoteTarget != target {
		return fmt.Errorf(
			"%w: %s targets %s, expected %s",
			ErrReleaseTagMismatch,
			tag,
			remoteTarget,
			target,
		)
	}
	w.log.Success("Existing release tag matches release plan")
	return nil
}

func (w *Workflow) publishGitHubRelease(ctx context.Context, opts Options) error {
	if w.resumeDraft {
		if err := w.gh.UpdateRelease(ctx, opts); err != nil {
			return fmt.Errorf("update draft release: %w", err)
		}
		w.log.Success("GitHub draft release updated")
		return nil
	}
	if err := w.gh.CreateRelease(ctx, opts); err != nil {
		return fmt.Errorf("create release: %w", err)
	}

	w.log.Success("GitHub release created")
	return nil
}

func (w *Workflow) determineReleaseTarget(ctx context.Context) (string, error) {
	target, err := w.git.HeadCommit(ctx)
	if err != nil {
		return "", fmt.Errorf("resolve release target commit: %w", err)
	}
	target = strings.TrimSpace(target)
	if target == "" {
		return "", errReleaseTargetMissing
	}
	return target, nil
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

const releaseNotesIntroFile = "RELEASE_NOTES_INTRO.md"

func (w *Workflow) withComponentReleaseNotesIntro(notes string) (string, error) {
	introPath, err := w.componentReleaseNotesIntroPath()
	if err != nil {
		return "", err
	}
	intro, err := fs.ReadFile(os.DirFS(w.config.RepoRoot), introPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return strings.TrimSpace(notes), nil
		}
		return "", fmt.Errorf("read %s: %w", introPath, err)
	}
	return withReleaseNotesIntro(notes, string(intro)), nil
}

func (w *Workflow) componentReleaseNotesIntroPath() (string, error) {
	introPath := filepath.Join(w.config.RepoRoot, w.component.SourcePath, releaseNotesIntroFile)
	rel, err := filepath.Rel(w.config.RepoRoot, introPath)
	if err != nil {
		return "", fmt.Errorf("evaluate release notes intro path: %w", err)
	}
	if rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("%w: %s", errUnsafeReleaseNotesPath, introPath)
	}
	rel = filepath.ToSlash(rel)
	if !fs.ValidPath(rel) {
		return "", fmt.Errorf("%w: %s", errUnsafeReleaseNotesPath, introPath)
	}
	return rel, nil
}

func withReleaseNotesIntro(notes, intro string) string {
	intro = strings.TrimSpace(intro)
	notes = strings.TrimSpace(notes)
	if intro == "" {
		return notes
	}
	if notes == "" {
		return intro
	}
	return intro + "\n\n## Changelog\n\n" + notes
}
