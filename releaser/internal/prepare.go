package internal

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"altinn.studio/releaser/internal/changelog"
	"altinn.studio/releaser/internal/perm"
	semver "altinn.studio/releaser/internal/version"
)

type releasePrepConfig struct {
	component           *Component
	version             *semver.Version
	branchName          string
	baseBranch          string
	releaseBranch       string
	prTitle             string
	prBody              string
	promoted            string
	createReleaseBranch bool
}

// PrepareRequest describes the inputs for a release prepare operation.
type PrepareRequest struct {
	Component     string // Component name (e.g., "studioctl")
	Version       string // Version string (e.g., "v1.0.0")
	ChangelogPath string // Optional: override component's default changelog path
	DryRun        bool
}

// RunPrepare executes the release prepare workflow.
func RunPrepare(ctx context.Context, req PrepareRequest, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	git := NewGitCLI(WithLogger(log))
	gh := NewGitHubCLI(WithGHLogger(log))
	return RunPrepareWithDeps(ctx, req, git, gh, log)
}

// RunPrepareWithDeps executes the release prepare workflow with injected dependencies.
func RunPrepareWithDeps(ctx context.Context, req PrepareRequest, git *GitCLI, gh GitHubRunner, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	if ctx == nil {
		return errContextRequired
	}
	if req.Component == "" {
		return errComponentRequired
	}
	if req.Version == "" {
		return errReleaseVersionRequired
	}

	comp, err := GetComponent(req.Component)
	if err != nil {
		return fmt.Errorf("get component: %w", err)
	}

	log.Step("Preparing release PR for " + comp.Name)
	current, err := git.CurrentBranch(ctx)
	if err != nil {
		return fmt.Errorf("get current branch: %w", err)
	}
	log.Detail("Current branch", current)
	repoRoot, err := git.RepoRoot(ctx)
	if err != nil {
		return err
	}
	log.Detail("Repo root", repoRoot)

	clPath := req.ChangelogPath
	if clPath == "" {
		clPath = comp.ChangelogPath
	}

	cfg, err := prepareReleasePrepConfig(ctx, git, comp, repoRoot, req.Version, clPath)
	if err != nil {
		return err
	}
	log.Detail("Prep branch", cfg.branchName)
	log.Detail("Base branch", cfg.baseBranch)
	if cfg.createReleaseBranch {
		log.Detail("Release branch", cfg.releaseBranch)
	}

	if req.DryRun {
		printReleasePrepDryRun(log, cfg)
		return nil
	}

	return executeReleasePrepare(ctx, git, gh, log, repoRoot, clPath, cfg)
}

func prepareReleasePrepConfig(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	repoRoot, version, clPath string,
) (*releasePrepConfig, error) {
	verStr := version
	if !strings.HasPrefix(verStr, "v") {
		verStr = "v" + verStr
	}

	ver, err := semver.Parse(verStr)
	if err != nil {
		return nil, fmt.Errorf("parse version: %w", err)
	}

	tag := NewTag(comp, ver)

	baseBranch, createReleaseBranch, err := determineBranchStrategy(ctx, git, tag)
	if err != nil {
		return nil, err
	}

	changelogFile := filepath.Join(repoRoot, clPath)
	//nolint:gosec // G304: changelog path comes from git rev-parse in the local repo.
	content, err := os.ReadFile(changelogFile)
	if err != nil {
		return nil, fmt.Errorf("read changelog: %w", err)
	}

	cl, err := changelog.Parse(string(content))
	if err != nil {
		return nil, fmt.Errorf("parse changelog: %w", err)
	}

	if valErr := cl.ValidateUnreleased(); valErr != nil {
		return nil, fmt.Errorf("invalid changelog: %w", valErr)
	}

	if cl.HasVersion(verStr) {
		return nil, fmt.Errorf("%w: %s", errChangelogVersionExists, verStr)
	}

	promotedCl, err := cl.Promote(verStr, time.Now())
	if err != nil {
		return nil, fmt.Errorf("promote changelog: %w", err)
	}
	promoted := promotedCl.String()

	return &releasePrepConfig{
		component:           comp,
		version:             ver,
		branchName:          comp.PrepBranch(verStr),
		baseBranch:          baseBranch,
		createReleaseBranch: createReleaseBranch,
		releaseBranch:       tag.ReleaseBranch(),
		prTitle:             "Release " + comp.ReleaseTitle(verStr),
		prBody: "Changelog promotion for " + comp.ReleaseTitle(verStr) +
			".\n\nMerging this PR will automatically trigger the release workflow.",
		promoted: promoted,
	}, nil
}

func determineBranchStrategy(ctx context.Context, git *GitCLI, tag *Tag) (string, bool, error) {
	releaseBranch := tag.ReleaseBranch()
	switch {
	case tag.Version.IsPrerelease:
		return mainBranch, false, nil
	case tag.Version.IsPatchRelease():
		exists, err := git.RemoteBranchExists(ctx, releaseBranch)
		if err != nil {
			return "", false, err
		}
		if !exists {
			return "", false, fmt.Errorf("%w: %s", errReleaseBranchMissing, releaseBranch)
		}
		return releaseBranch, false, nil
	default:
		exists, err := git.RemoteBranchExists(ctx, releaseBranch)
		if err != nil {
			return "", false, err
		}
		if exists {
			return "", false, fmt.Errorf("%w: %s", errReleaseBranchExists, releaseBranch)
		}
		return releaseBranch, true, nil
	}
}

func printReleasePrepDryRun(log Logger, cfg *releasePrepConfig) {
	log.Info("=== DRY RUN ===")
	if cfg.createReleaseBranch {
		log.Info("Would create release branch: %s", cfg.releaseBranch)
	}
	log.Info("Would create prep branch: %s", cfg.branchName)
	log.Info("Would promote changelog to: [%s]", cfg.version.String())
	log.Info("Would create PR targeting: %s", cfg.baseBranch)
	log.Info("Would set PR title: %s", cfg.prTitle)
	log.Info("Would add label: %s", cfg.component.ReleaseLabel())
	logPromotedChangelog(log, cfg.promoted)
}

func logPromotedChangelog(log Logger, promoted string) {
	log.Info("Promoted changelog:")
	for line := range strings.SplitSeq(strings.TrimRight(promoted, "\n"), "\n") {
		log.Info("  %s", line)
	}
}

func executeReleasePrepare(
	ctx context.Context,
	git *GitCLI,
	gh GitHubRunner,
	log Logger,
	repoRoot string,
	clPath string,
	cfg *releasePrepConfig,
) error {
	if err := setupBaseBranch(ctx, git, log, cfg); err != nil {
		return err
	}

	log.Step("Creating prep branch")
	if err := git.RunWrite(ctx, "checkout", "-b", cfg.branchName); err != nil {
		return fmt.Errorf("create prep branch: %w", err)
	}

	log.Step("Updating changelog")
	changelogFile := filepath.Join(repoRoot, clPath)
	if err := os.WriteFile(changelogFile, []byte(cfg.promoted), perm.FilePermDefault); err != nil {
		return fmt.Errorf("write changelog: %w", err)
	}
	logPromotedChangelog(log, cfg.promoted)

	log.Step("Committing changelog")
	if err := git.RunWrite(ctx, "add", clPath); err != nil {
		return fmt.Errorf("git add: %w", err)
	}
	commitMsg := "Release " + cfg.component.ReleaseTitle(cfg.version.String())
	if err := git.RunWrite(ctx, "commit", "-m", commitMsg); err != nil {
		return fmt.Errorf("git commit: %w", err)
	}

	log.Step("Pushing prep branch")
	if err := git.RunWrite(ctx, "push", "-u", "origin", cfg.branchName); err != nil {
		return fmt.Errorf("git push: %w", err)
	}

	log.Step("Creating release PR")
	if err := gh.CreatePR(ctx, PullRequestOptions{
		Title: cfg.prTitle,
		Body:  cfg.prBody,
		Label: cfg.component.ReleaseLabel(),
		Base:  cfg.baseBranch,
	}); err != nil {
		return fmt.Errorf("create PR: %w", err)
	}

	log.Success("Release PR created successfully")
	log.Info("Target branch: %s", cfg.baseBranch)
	log.Info("Once the PR is merged, the release workflow will trigger automatically.")
	return nil
}

func setupBaseBranch(ctx context.Context, git *GitCLI, log Logger, cfg *releasePrepConfig) error {
	if cfg.createReleaseBranch {
		if err := checkoutBranch(ctx, git, log, mainBranch); err != nil {
			return err
		}
		log.Info("Creating release branch %s from %s...", cfg.releaseBranch, mainBranch)
		if err := git.RunWrite(ctx, "checkout", "-b", cfg.releaseBranch); err != nil {
			return fmt.Errorf("create release branch: %w", err)
		}
		if err := git.RunWrite(ctx, "push", "-u", "origin", cfg.releaseBranch); err != nil {
			return fmt.Errorf("push release branch: %w", err)
		}
		return nil
	}

	return checkoutBranch(ctx, git, log, cfg.baseBranch)
}

func checkoutBranch(ctx context.Context, git *GitCLI, log Logger, branch string) error {
	log.Info("Checking out %s...", branch)
	if err := git.RunWrite(ctx, "fetch", "origin", branch); err != nil {
		return fmt.Errorf("fetch branch: %w", err)
	}
	if err := git.RunWrite(ctx, "checkout", branch); err != nil {
		return fmt.Errorf("checkout branch: %w", err)
	}
	if err := git.RunWrite(ctx, "pull", "origin", branch); err != nil {
		return fmt.Errorf("pull branch: %w", err)
	}
	return nil
}
