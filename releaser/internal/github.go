package internal

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

// GitHub operation errors.
var (
	ErrGHCommandFailed = errors.New("gh command failed")
	ErrGHNotAvailable  = errors.New("gh CLI not available")
)

// GitHubRunner defines the interface for GitHub operations.
type GitHubRunner interface {
	// CreateRelease creates a GitHub release.
	CreateRelease(ctx context.Context, opts Options) error
	// CreatePR creates a GitHub pull request.
	CreatePR(ctx context.Context, opts PullRequestOptions) error
	// SetWorkdir sets the working directory for gh commands.
	SetWorkdir(dir string)
}

// PullRequestOptions configures a GitHub pull request.
type PullRequestOptions struct {
	Title string
	Body  string
	Label string
	Base  string
}

// Options configures a GitHub release.
type Options struct {
	Tag             string   // Required: tag name
	Title           string   // Required: release title
	NotesFile       string   // Path to release notes file
	Target          string   // Target branch for tag creation (if tag doesn't exist)
	Assets          []string // Paths to assets to upload
	Draft           bool     // Create as draft
	Prerelease      bool     // Mark as prerelease
	FailOnNoCommits bool     // Fail if no new commits since last release
}

// GitHubCLI implements GitHubRunner by shelling out to the gh CLI.
type GitHubCLI struct {
	log     Logger
	workdir string
	dryRun  bool
}

// GitHubCLIOption configures GitHubCLI.
type GitHubCLIOption func(*GitHubCLI)

// WithGHDryRun enables dry-run mode.
func WithGHDryRun(dryRun bool) GitHubCLIOption {
	return func(g *GitHubCLI) { g.dryRun = dryRun }
}

// WithGHLogger sets the logger.
func WithGHLogger(log Logger) GitHubCLIOption {
	return func(g *GitHubCLI) { g.log = log }
}

// NewGitHubCLI creates a new GitHubCLI instance.
func NewGitHubCLI(opts ...GitHubCLIOption) *GitHubCLI {
	g := &GitHubCLI{
		log:     NopLogger{},
		workdir: "",
		dryRun:  false,
	}
	for _, opt := range opts {
		opt(g)
	}
	return g
}

// CreateRelease creates a GitHub release using the gh CLI.
// If the tag doesn't exist, gh will create it automatically at the target branch.
func (g *GitHubCLI) CreateRelease(ctx context.Context, opts Options) error {
	args := []string{"release", "create", opts.Tag}

	if opts.Title != "" {
		args = append(args, "--title", opts.Title)
	}

	if opts.NotesFile != "" {
		args = append(args, "--notes-file", opts.NotesFile)
	}

	if opts.Target != "" {
		args = append(args, "--target", opts.Target)
	}

	if opts.Draft {
		args = append(args, "--draft")
	}

	if opts.Prerelease {
		args = append(args, "--prerelease")
	}

	if opts.FailOnNoCommits {
		args = append(args, "--fail-on-no-commits")
	}

	// Add assets
	args = append(args, opts.Assets...)

	return g.runWrite(ctx, args...)
}

// CreatePR creates a GitHub pull request using the gh CLI.
func (g *GitHubCLI) CreatePR(ctx context.Context, opts PullRequestOptions) error {
	args := []string{"pr", "create"}

	if opts.Title != "" {
		args = append(args, "--title", opts.Title)
	}
	if opts.Body != "" {
		args = append(args, "--body", opts.Body)
	}
	if opts.Label != "" {
		args = append(args, "--label", opts.Label)
	}
	if opts.Base != "" {
		args = append(args, "--base", opts.Base)
	}

	return g.runWrite(ctx, args...)
}

// SetWorkdir sets the working directory for gh commands.
func (g *GitHubCLI) SetWorkdir(dir string) {
	g.workdir = dir
}

func (g *GitHubCLI) runWrite(ctx context.Context, args ...string) error {
	if g.dryRun {
		g.log.Command("gh", append([]string{"(dry-run)"}, args...))
		return nil
	}

	g.log.Command("gh", args)

	cmd := exec.CommandContext(ctx, "gh", args...)
	if g.workdir != "" {
		cmd.Dir = g.workdir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%w: %s: %s", ErrGHCommandFailed, strings.Join(args, " "), stderr.String())
	}

	return nil
}
