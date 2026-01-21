package internal

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"sync"
)

// Git operation errors.
var (
	ErrNotOnMain        = errors.New("prereleases must be triggered from main branch")
	ErrGitCommandFailed = errors.New("git command failed")
	ErrWorkingTreeDirty = errors.New("working tree has uncommitted changes")
)

// GitRunner defines the interface for git operations.
type GitRunner interface {
	// TagExists checks if a tag exists in the repository.
	TagExists(ctx context.Context, tag string) (bool, error)
	// CurrentBranch returns the current branch name.
	CurrentBranch(ctx context.Context) (string, error)
	// RemoteBranchExists checks if a branch exists on the remote.
	RemoteBranchExists(ctx context.Context, branch string) (bool, error)
	// Checkout switches to the specified ref.
	Checkout(ctx context.Context, ref string) error
	// Pull pulls the latest changes from the remote.
	Pull(ctx context.Context, remote, branch string) error
	// CreateBranch creates a new branch from the current HEAD.
	CreateBranch(ctx context.Context, name string) error
	// PushWithUpstream pushes and sets upstream tracking.
	PushWithUpstream(ctx context.Context, remote, branch string) error
	// RepoRoot returns the git repository root directory.
	RepoRoot(ctx context.Context) (string, error)
	// WorkingTreeClean checks if working tree has no uncommitted changes.
	WorkingTreeClean(ctx context.Context) (bool, error)
}

// GitCLI implements GitRunner by shelling out to the git CLI.
type GitCLI struct {
	log          Logger
	repoRootErr  error
	workdir      string
	repoRoot     string
	repoRootOnce sync.Once
	dryRun       bool
}

// GitCLIOption configures GitCLI.
type GitCLIOption func(*GitCLI)

// WithWorkdir sets the working directory for git commands.
func WithWorkdir(dir string) GitCLIOption {
	return func(g *GitCLI) { g.workdir = dir }
}

// WithDryRun enables dry-run mode (no writes).
func WithDryRun(dryRun bool) GitCLIOption {
	return func(g *GitCLI) { g.dryRun = dryRun }
}

// WithLogger sets the logger.
func WithLogger(log Logger) GitCLIOption {
	return func(g *GitCLI) { g.log = log }
}

// NewGitCLI creates a new GitCLI instance.
func NewGitCLI(opts ...GitCLIOption) *GitCLI {
	//nolint:exhaustruct // repoRoot fields initialized by sync.Once on first call
	g := &GitCLI{
		log:     NopLogger{},
		workdir: "",
		dryRun:  false,
	}
	for _, opt := range opts {
		opt(g)
	}
	return g
}

// TagExists checks if a tag exists in the repository.
func (g *GitCLI) TagExists(ctx context.Context, tag string) (bool, error) {
	code, err := g.runExitCode(ctx, "show-ref", "--tags", tag)
	if err != nil {
		return false, err
	}
	return code == 0, nil // exit 1 = not found
}

// CurrentBranch returns the current branch name.
func (g *GitCLI) CurrentBranch(ctx context.Context) (string, error) {
	return g.run(ctx, "rev-parse", "--abbrev-ref", "HEAD")
}

// RemoteBranchExists checks if a branch exists on the remote.
func (g *GitCLI) RemoteBranchExists(ctx context.Context, branch string) (bool, error) {
	code, err := g.runExitCode(ctx, "ls-remote", "--exit-code", "--heads", "origin", branch)
	if err != nil {
		return false, err
	}
	return code == 0, nil // exit 2 = not found
}

// Checkout switches to the specified ref.
func (g *GitCLI) Checkout(ctx context.Context, ref string) error {
	return g.runWrite(ctx, "checkout", ref)
}

// Pull pulls the latest changes from the remote.
func (g *GitCLI) Pull(ctx context.Context, remote, branch string) error {
	return g.runWrite(ctx, "pull", remote, branch)
}

// CreateBranch creates a new branch from the current HEAD.
func (g *GitCLI) CreateBranch(ctx context.Context, name string) error {
	return g.runWrite(ctx, "checkout", "-b", name)
}

// PushWithUpstream pushes and sets upstream tracking.
func (g *GitCLI) PushWithUpstream(ctx context.Context, remote, branch string) error {
	return g.runWrite(ctx, "push", "-u", remote, branch)
}

// Run executes a git command and returns stdout.
func (g *GitCLI) Run(ctx context.Context, args ...string) (string, error) {
	return g.run(ctx, args...)
}

// RepoRoot returns the git repository root directory.
// The result is cached after the first call per GitCLI instance.
func (g *GitCLI) RepoRoot(ctx context.Context) (string, error) {
	g.repoRootOnce.Do(func() {
		root, err := g.Run(ctx, "rev-parse", "--show-toplevel")
		if err != nil {
			g.repoRootErr = fmt.Errorf("get repo root: %w", err)
			return
		}
		g.repoRoot = root
	})
	return g.repoRoot, g.repoRootErr
}

// WorkingTreeClean checks if working tree has no uncommitted changes.
func (g *GitCLI) WorkingTreeClean(ctx context.Context) (bool, error) {
	output, err := g.Run(ctx, "status", "--porcelain")
	if err != nil {
		return false, err
	}
	return output == "", nil
}

// RunWrite executes a git command that mutates state.
func (g *GitCLI) RunWrite(ctx context.Context, args ...string) error {
	return g.runWrite(ctx, args...)
}

func (g *GitCLI) run(ctx context.Context, args ...string) (string, error) {
	g.log.Command("git", args)

	cmd := exec.CommandContext(ctx, "git", args...)
	if g.workdir != "" {
		cmd.Dir = g.workdir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%w: %s: %s", ErrGitCommandFailed, strings.Join(args, " "), stderr.String())
	}

	return strings.TrimSpace(stdout.String()), nil
}

func (g *GitCLI) runWrite(ctx context.Context, args ...string) error {
	if g.dryRun {
		g.log.Command("git", append([]string{"(dry-run)"}, args...))
		return nil
	}
	_, err := g.run(ctx, args...)
	return err
}

// runExitCode runs a command and returns exit code. Returns -1 on non-exit errors.
func (g *GitCLI) runExitCode(ctx context.Context, args ...string) (int, error) {
	g.log.Command("git", args)

	cmd := exec.CommandContext(ctx, "git", args...)
	if g.workdir != "" {
		cmd.Dir = g.workdir
	}

	err := cmd.Run()
	if err == nil {
		return 0, nil
	}

	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode(), nil
	}
	return -1, fmt.Errorf("%w: %s: %w", ErrGitCommandFailed, strings.Join(args, " "), err)
}
