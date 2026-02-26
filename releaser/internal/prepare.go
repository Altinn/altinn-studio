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
	Prompter      ConfirmationPrompter
	Component     string
	Version       string
	ChangelogPath string
	Open          bool
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

	cfg, err := prepareReleasePrepConfig(ctx, git, comp, req.Version, clPath)
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

	if err := ensureWorkingTreeClean(ctx, git, log); err != nil {
		return err
	}
	remoteBase := "origin/" + cfg.baseBranch
	if cfg.createReleaseBranch {
		remoteBase = "origin/" + mainBranch
	}
	if err := confirmNonMainBranch(req.Prompter, current, "prepare",
		"Will create and switch to new working branches from latest "+remoteBase+".",
		"This changes your current branch context; cancel if you do not want to branch right now.",
	); err != nil {
		return err
	}

	return executeReleasePrepare(ctx, git, gh, log, repoRoot, clPath, cfg, req.Prompter, req.Open)
}

func prepareReleasePrepConfig(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	version, clPath string,
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

	sourceBranch := baseBranch
	if createReleaseBranch {
		// First stable release lines are cut from main before promotion.
		sourceBranch = mainBranch
	}
	content, err := readRemoteFile(ctx, git, sourceBranch, clPath)
	if err != nil {
		return nil, fmt.Errorf("read changelog: %w", err)
	}

	cl, err := changelog.Parse(content)
	if err != nil {
		return nil, fmt.Errorf("parse changelog: %w", err)
	}

	if cl.HasVersion(verStr) {
		return nil, fmt.Errorf("%w: %s", errChangelogVersionExists, verStr)
	}

	promotedCl, err := cl.Promote(verStr, time.Now())
	if err != nil {
		return nil, fmt.Errorf("promote changelog: %w", err)
	}
	promoted := promotedCl.String()
	prBody, err := buildPreparePRBody(verStr, promotedCl)
	if err != nil {
		return nil, fmt.Errorf("build PR body: %w", err)
	}

	return &releasePrepConfig{
		component:           comp,
		version:             ver,
		branchName:          comp.PrepBranch(verStr),
		baseBranch:          baseBranch,
		createReleaseBranch: createReleaseBranch,
		releaseBranch:       tag.ReleaseBranch(),
		prTitle:             "chore: release " + comp.ReleaseTitle(verStr),
		prBody:              prBody,
		promoted:            promoted,
	}, nil
}

func readRemoteFile(ctx context.Context, git *GitCLI, branch, path string) (string, error) {
	if _, err := git.Run(ctx, "fetch", "origin", branch); err != nil {
		return "", fmt.Errorf("fetch origin/%s: %w", branch, err)
	}
	return git.Run(ctx, "show", "origin/"+branch+":"+path)
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

func buildPreparePRBody(version string, promotedCl *changelog.Changelog) (string, error) {
	if promotedCl == nil {
		return "", errChangelogNil
	}

	section := promotedCl.GetVersion(version)
	if section == nil {
		return "", fmt.Errorf("%w: %s", changelog.ErrVersionNotFound, version)
	}

	var b strings.Builder
	b.WriteString("## Description\n\n")
	b.WriteString("Prepare release ")
	b.WriteString(version)
	b.WriteString("\n\n")

	entryCount := 0
	for _, category := range section.Categories {
		for _, entry := range category.Entries {
			b.WriteString("- [")
			b.WriteString(category.Name)
			b.WriteString("] ")
			b.WriteString(entry)
			b.WriteString("\n")
			entryCount++
		}
	}
	if entryCount == 0 {
		b.WriteString("- No changelog entries found\n")
	}

	return strings.TrimRight(b.String(), "\n"), nil
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
	prompter ConfirmationPrompter,
	openPR bool,
) error {
	prepBaseRef, setupErr := setupBaseBranch(ctx, git, log, cfg, prompter)
	if setupErr != nil {
		return setupErr
	}

	log.Step("Creating prep branch")
	if err := git.RunWrite(ctx, "checkout", "-b", cfg.branchName, prepBaseRef); err != nil {
		return fmt.Errorf("create prep branch: %w", err)
	}

	commitMsg := "Release " + cfg.component.ReleaseTitle(cfg.version.String())
	if err := confirmMutatingAction(prompter, "promote changelog and create commit",
		"Branch: "+cfg.branchName,
		"File: "+clPath,
		"Version: "+cfg.version.String(),
		"Commit message: "+commitMsg,
	); err != nil {
		return err
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
	if err := git.RunWrite(ctx, "commit", "-m", commitMsg); err != nil {
		return fmt.Errorf("git commit: %w", err)
	}

	if err := confirmMutatingAction(prompter, "push prep branch",
		"Push: "+cfg.branchName+" -> origin/"+cfg.branchName,
	); err != nil {
		return err
	}

	log.Step("Pushing prep branch")
	if err := git.RunWrite(ctx, "push", "-u", "origin", cfg.branchName); err != nil {
		return fmt.Errorf("git push: %w", err)
	}

	prDetails := buildPreparePRPromptDetails(cfg)
	if err := confirmMutatingAction(prompter, "create GitHub PR", prDetails...); err != nil {
		return err
	}

	log.Step("Creating release PR")
	prURL, createErr := createPreparePR(ctx, gh, cfg)
	if createErr != nil {
		return createErr
	}
	handlePreparePRResult(ctx, log, openPR, prURL)

	log.Success("Release PR created successfully")
	log.Info("Target branch: %s", cfg.baseBranch)
	log.Info("Once the PR is merged, the release workflow will trigger automatically.")
	return nil
}

func handlePreparePRResult(ctx context.Context, log Logger, openPR bool, prURL string) {
	if prURL == "" {
		log.Error("PR created, but URL could not be determined")
	} else {
		log.Info("PR: %s", prURL)
	}
	if !openPR {
		return
	}
	if prURL == "" {
		log.Error("Could not open PR in browser: PR URL is unavailable")
		return
	}
	if openErr := OpenBrowser(ctx, prURL); openErr != nil {
		log.Error("Could not open PR in browser: %v", openErr)
	}
}

func createPreparePR(ctx context.Context, gh GitHubRunner, cfg *releasePrepConfig) (string, error) {
	// Keep PR creation as a separate step so execution flow stays simple and lint-compliant.
	prURL, err := gh.CreatePR(ctx, PullRequestOptions{
		Title: cfg.prTitle,
		Body:  cfg.prBody,
		Label: cfg.component.ReleaseLabel(),
		Base:  cfg.baseBranch,
	})
	if err != nil {
		return "", fmt.Errorf("create PR: %w", err)
	}
	return prURL, nil
}

func setupBaseBranch(
	ctx context.Context,
	git *GitCLI,
	log Logger,
	cfg *releasePrepConfig,
	prompter ConfirmationPrompter,
) (string, error) {
	if !cfg.createReleaseBranch {
		if err := git.RunWrite(ctx, "fetch", "origin", cfg.baseBranch); err != nil {
			return "", fmt.Errorf("fetch base branch: %w", err)
		}
		return "origin/" + cfg.baseBranch, nil
	}

	if err := git.RunWrite(ctx, "fetch", "origin", mainBranch); err != nil {
		return "", fmt.Errorf("fetch main branch: %w", err)
	}
	if err := confirmMutatingAction(prompter, "create and push release branch",
		"Source branch: "+mainBranch,
		"New branch: "+cfg.releaseBranch,
		"Push: "+cfg.releaseBranch+" -> origin/"+cfg.releaseBranch,
	); err != nil {
		return "", err
	}
	log.Info("Creating release branch %s from origin/%s...", cfg.releaseBranch, mainBranch)
	if err := git.RunWrite(ctx, "checkout", "-b", cfg.releaseBranch, "origin/"+mainBranch); err != nil {
		return "", fmt.Errorf("create release branch: %w", err)
	}
	if err := git.RunWrite(ctx, "push", "-u", "origin", cfg.releaseBranch); err != nil {
		return "", fmt.Errorf("push release branch: %w", err)
	}
	return cfg.releaseBranch, nil
}

func buildPreparePRPromptDetails(cfg *releasePrepConfig) []string {
	bodyLines := strings.Split(cfg.prBody, "\n")
	prDetails := make([]string, 0, 4+len(bodyLines))
	prDetails = append(prDetails,
		"Base branch: "+cfg.baseBranch,
		"Title: "+cfg.prTitle,
		"Label: "+cfg.component.ReleaseLabel(),
		"Body:",
	)
	return append(prDetails, bodyLines...)
}
