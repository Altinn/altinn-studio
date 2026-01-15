package internal

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/releaser/internal/changelog"
	"altinn.studio/releaser/internal/perm"
)

// BackportRequest describes the inputs for a backport operation.
type BackportRequest struct {
	Component     string // Component name (e.g., "studioctl")
	Commit        string
	Branch        string
	ChangelogPath string // Optional: override component's default changelog path
	DryRun        bool
}

type backportConfig struct {
	component      *Component
	commit         string
	commitMsg      string
	releaseBranch  string
	backportBranch string
	shortSHA       string
	versionParts   []string
	dryRun         bool
}

// RunBackport executes the backport workflow.
func RunBackport(ctx context.Context, req BackportRequest, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	git := NewGitCLI(WithLogger(log))
	gh := NewGitHubCLI(WithGHLogger(log))
	return RunBackportWithDeps(ctx, req, git, gh, log)
}

// RunBackportWithDeps executes the backport workflow with injected dependencies.
func RunBackportWithDeps(ctx context.Context, req BackportRequest, git *GitCLI, gh GitHubRunner, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	if ctx == nil {
		return errContextRequired
	}
	if req.Component == "" {
		return errComponentRequired
	}

	comp, err := GetComponent(req.Component)
	if err != nil {
		return fmt.Errorf("get component: %w", err)
	}

	cfg, err := parseBackportConfig(req, comp)
	if err != nil {
		return err
	}

	clPath := req.ChangelogPath
	if clPath == "" {
		clPath = comp.ChangelogPath
	}

	repoRoot, err := git.RepoRoot(ctx)
	if err != nil {
		return err
	}

	log.Step("Extracting changelog entries")
	entries, commitMsg, err := extractEntriesFromCommit(ctx, git, cfg.commit, clPath)
	if err != nil {
		return err
	}
	cfg.commitMsg = commitMsg
	log.Info("Found %d changelog entries", len(entries))

	logBackportState(log, cfg, repoRoot)

	if cfg.dryRun {
		printBackportDryRun(log, cfg, entries)
		return nil
	}

	if err := executeBackport(
		ctx,
		git,
		gh,
		log,
		repoRoot,
		clPath,
		cfg,
		entries,
	); err != nil {
		return err
	}

	log.Success("Backport complete")
	log.Info("Commit %s (%s) has been backported to %s", cfg.shortSHA, cfg.commitMsg, cfg.releaseBranch)
	log.Info("Next steps:")
	log.Info("  1. Merge the backport PR targeting %s", cfg.releaseBranch)
	log.Info("  2. Run: go run ./cmd/dev release prepare -version v%s.%s.X", cfg.versionParts[0], cfg.versionParts[1])
	log.Info("  3. Merge the release PR to trigger the release workflow")
	return nil
}

func parseBackportConfig(req BackportRequest, comp *Component) (*backportConfig, error) {
	if req.Commit == "" {
		return nil, errBackportCommitRequired
	}
	if req.Branch == "" {
		return nil, errBackportBranchRequired
	}

	branchVer := req.Branch
	if !strings.HasPrefix(branchVer, "v") {
		branchVer = "v" + branchVer
	}

	parts := strings.Split(strings.TrimPrefix(branchVer, "v"), ".")
	if len(parts) < 2 {
		return nil, errBackportInvalidVersion
	}

	// Parse major/minor as integers for ReleaseBranch
	major, minor := 0, 0
	_, _ = fmt.Sscanf(parts[0], "%d", &major) //nolint:errcheck // best effort parse
	_, _ = fmt.Sscanf(parts[1], "%d", &minor) //nolint:errcheck // best effort parse

	releaseBranch := comp.ReleaseBranch(major, minor)

	shortSHA := req.Commit
	if len(shortSHA) > backportShortSHALen {
		shortSHA = shortSHA[:backportShortSHALen]
	}

	backportBranch := comp.BackportBranch(branchVer, req.Commit)

	return &backportConfig{
		component:      comp,
		commit:         req.Commit,
		commitMsg:      "", // populated after extractEntriesFromCommit
		releaseBranch:  releaseBranch,
		backportBranch: backportBranch,
		shortSHA:       shortSHA,
		versionParts:   parts,
		dryRun:         req.DryRun,
	}, nil
}

func logBackportState(log Logger, cfg *backportConfig, repoRoot string) {
	log.Step("Preparing backport")
	log.Detail("Repo root", repoRoot)
	log.Detail("Commit", fmt.Sprintf("%s (%s)", cfg.shortSHA, cfg.commitMsg))
	log.Detail("Release branch", cfg.releaseBranch)
	log.Detail("Backport branch", cfg.backportBranch)
}

func extractEntriesFromCommit(
	ctx context.Context,
	git *GitCLI,
	commitSHA, clPath string,
) ([]changelog.Entry, string, error) {
	output, err := git.Run(ctx, "show", "--format=%s", commitSHA, "--", clPath)
	if err != nil {
		return nil, "", fmt.Errorf("git show: %w", err)
	}

	lines := strings.SplitN(output, "\n", 2)
	commitMsg := strings.TrimSpace(lines[0])

	if len(lines) < 2 || strings.TrimSpace(lines[1]) == "" {
		return nil, commitMsg, errBackportNoEntries
	}

	cl, err := changelog.ParseWithDiff("", lines[1], clPath)
	if err != nil {
		return nil, commitMsg, fmt.Errorf("parse diff: %w", err)
	}

	if len(cl.AddedEntries) == 0 {
		return nil, commitMsg, errBackportNoEntries
	}

	return cl.AddedEntries, commitMsg, nil
}

func executeBackport(
	ctx context.Context,
	git *GitCLI,
	gh GitHubRunner,
	log Logger,
	repoRoot string,
	clPath string,
	cfg *backportConfig,
	entries []changelog.Entry,
) error {
	if err := prepareBackportBranch(ctx, git, cfg.releaseBranch, cfg.backportBranch); err != nil {
		return err
	}
	if err := applyBackportChanges(ctx, git, log, repoRoot, clPath, cfg.commit, entries); err != nil {
		return err
	}
	logChangelogEntries(log, entries)
	if err := commitBackport(ctx, git, cfg.shortSHA, cfg.commitMsg, cfg.commit); err != nil {
		return err
	}
	if err := pushBackportBranch(ctx, git, cfg.backportBranch); err != nil {
		return err
	}
	return createBackportPR(ctx, gh, cfg)
}

func prepareBackportBranch(ctx context.Context, git *GitCLI, releaseBranch, backportBranch string) error {
	if err := git.RunWrite(ctx, "fetch", "origin", releaseBranch); err != nil {
		return fmt.Errorf("fetch release branch: %w", err)
	}
	if err := git.RunWrite(ctx, "checkout", releaseBranch); err != nil {
		return fmt.Errorf("checkout release branch: %w", err)
	}
	if err := git.RunWrite(ctx, "pull", "origin", releaseBranch); err != nil {
		return fmt.Errorf("pull release branch: %w", err)
	}
	if err := git.RunWrite(ctx, "checkout", "-b", backportBranch); err != nil {
		return fmt.Errorf("create backport branch: %w", err)
	}
	return nil
}

func applyBackportChanges(
	ctx context.Context,
	git *GitCLI,
	log Logger,
	repoRoot string,
	clPath string,
	commitSHA string,
	entries []changelog.Entry,
) error {
	log.Step("Applying backport changes")
	if err := git.RunWrite(ctx, "cherry-pick", "-x", "--no-commit", commitSHA); err != nil {
		return fmt.Errorf("cherry-pick commit: %w", err)
	}
	if err := git.RunWrite(ctx, "checkout", "HEAD", "--", clPath); err != nil {
		return fmt.Errorf("restore changelog: %w", err)
	}

	changelogFile := filepath.Join(repoRoot, clPath)
	//nolint:gosec // G304: changelog path comes from git rev-parse in the local repo.
	changelogContent, err := os.ReadFile(changelogFile)
	if err != nil {
		return fmt.Errorf("read changelog: %w", err)
	}

	cl, err := changelog.Parse(string(changelogContent))
	if err != nil {
		return fmt.Errorf("parse changelog: %w", err)
	}

	updatedCl, err := cl.InsertEntries(entries)
	if err != nil {
		return fmt.Errorf("insert changelog entries: %w", err)
	}

	if err := os.WriteFile(changelogFile, []byte(updatedCl.String()), perm.FilePermDefault); err != nil {
		return fmt.Errorf("write changelog: %w", err)
	}
	return nil
}

func commitBackport(ctx context.Context, git *GitCLI, shortSHA, originalMsg, commitSHA string) error {
	commitMsg := fmt.Sprintf("Backport %s: %s\n\n(cherry picked from commit %s)", shortSHA, originalMsg, commitSHA)
	if err := git.RunWrite(ctx, "add", "."); err != nil {
		return fmt.Errorf("git add: %w", err)
	}
	if err := git.RunWrite(ctx, "commit", "-m", commitMsg); err != nil {
		return fmt.Errorf("git commit: %w", err)
	}
	return nil
}

func pushBackportBranch(ctx context.Context, git *GitCLI, backportBranch string) error {
	if err := git.RunWrite(ctx, "push", "-u", "origin", backportBranch); err != nil {
		return fmt.Errorf("git push: %w", err)
	}
	return nil
}

func createBackportPR(ctx context.Context, gh GitHubRunner, cfg *backportConfig) error {
	prTitle := fmt.Sprintf("Backport %s to v%s.%s", cfg.shortSHA, cfg.versionParts[0], cfg.versionParts[1])
	prBody := fmt.Sprintf(
		"Backport of %s.\n\nOriginal commit: %s\n\nOriginal message: %s\n",
		cfg.shortSHA,
		cfg.commit,
		cfg.commitMsg,
	)
	if err := gh.CreatePR(ctx, PullRequestOptions{
		Title: prTitle,
		Body:  prBody,
		Label: backportLabel,
		Base:  cfg.releaseBranch,
	}); err != nil {
		return fmt.Errorf("create PR: %w", err)
	}
	return nil
}

func printBackportDryRun(log Logger, cfg *backportConfig, entries []changelog.Entry) {
	log.Info("=== DRY RUN ===")
	log.Info("Would cherry-pick commit: %s (%s)", cfg.shortSHA, cfg.commitMsg)
	log.Info("Would target branch: %s", cfg.releaseBranch)
	log.Info("Would create backport branch: %s", cfg.backportBranch)
	logChangelogEntries(log, entries)
	log.Info("Would create commit: Backport %s: %s", cfg.shortSHA, cfg.commitMsg)
	log.Info("Would push to origin/%s", cfg.backportBranch)
	log.Info("Would create PR: Backport %s to %s (label: %s)", cfg.shortSHA, cfg.releaseBranch, backportLabel)
}

func logChangelogEntries(log Logger, entries []changelog.Entry) {
	log.Info("Changelog entries (%d):", len(entries))
	for _, e := range entries {
		log.Info("  [%s] %s", e.Category, e.Text)
	}
}
