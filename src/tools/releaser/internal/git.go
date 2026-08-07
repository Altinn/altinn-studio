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

// GitRemote describes one configured Git remote.
type GitRemote struct {
	Name     string
	FetchURL string
	PushURL  string
	PushURLs int
}

// GitRunner defines the interface for git operations.
type GitRunner interface {
	// TagExists checks if a tag exists in the repository.
	TagExists(ctx context.Context, remote, tag string) (bool, error)
	// CurrentBranch returns the current branch name.
	CurrentBranch(ctx context.Context) (string, error)
	// RemoteBranchExists checks if a branch exists on the authoritative source remote.
	RemoteBranchExists(ctx context.Context, remote, branch string) (bool, error)
	// RepoRoot returns the git repository root directory.
	RepoRoot(ctx context.Context) (string, error)
	// HeadCommit returns the current HEAD commit SHA.
	HeadCommit(ctx context.Context) (string, error)
	// WorkingTreeClean checks if working tree has no uncommitted changes.
	WorkingTreeClean(ctx context.Context) (bool, error)
	// Remotes returns configured Git remotes and their URLs.
	Remotes(ctx context.Context) ([]GitRemote, error)
	// PushRemote resolves Git's configured push destination.
	PushRemote(ctx context.Context, remotes []GitRemote) (GitRemote, error)
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

// TagExists checks if a tag exists in the requested remote repository.
func (g *GitCLI) TagExists(ctx context.Context, remote, tag string) (bool, error) {
	exitCode, err := g.runExitCode(
		ctx,
		"ls-remote",
		"--exit-code",
		"--tags",
		remote,
		"refs/tags/"+tag,
	)
	if err != nil {
		return false, err
	}
	return remoteRefExists(exitCode, remote)
}

// CurrentBranch returns the current branch name.
func (g *GitCLI) CurrentBranch(ctx context.Context) (string, error) {
	return g.run(ctx, "rev-parse", "--abbrev-ref", "HEAD")
}

// RemoteBranchExists checks if a branch exists in the requested remote repository.
func (g *GitCLI) RemoteBranchExists(ctx context.Context, remote, branch string) (bool, error) {
	code, err := g.runExitCode(ctx, "ls-remote", "--exit-code", "--heads", remote, branch)
	if err != nil {
		return false, err
	}
	return remoteRefExists(code, remote)
}

func remoteRefExists(exitCode int, remote string) (bool, error) {
	switch exitCode {
	case 0:
		return true, nil
	case 2:
		return false, nil
	default:
		return false, fmt.Errorf(
			"%w: git ls-remote for %s exited with code %d",
			ErrGitCommandFailed,
			remote,
			exitCode,
		)
	}
}

// Remotes returns the repository's configured fetch and push URLs.
func (g *GitCLI) Remotes(ctx context.Context) ([]GitRemote, error) {
	output, err := g.Run(ctx, "remote")
	if err != nil {
		return nil, err
	}
	names := strings.Fields(output)
	if len(names) == 0 {
		return nil, errNoGitRemotes
	}

	remotes := make([]GitRemote, 0, len(names))
	for _, name := range names {
		fetchURL, fetchErr := g.Run(ctx, "remote", "get-url", name)
		if fetchErr != nil {
			return nil, fmt.Errorf("get fetch URL for remote %s: %w", name, fetchErr)
		}
		pushURLs, pushErr := g.Run(ctx, "remote", "get-url", "--push", "--all", name)
		if pushErr != nil {
			return nil, fmt.Errorf("get push URL for remote %s: %w", name, pushErr)
		}
		pushURLList := make([]string, 0, 1)
		for pushURL := range strings.SplitSeq(pushURLs, "\n") {
			if pushURL = strings.TrimSpace(pushURL); pushURL != "" {
				pushURLList = append(pushURLList, pushURL)
			}
		}
		pushURL := ""
		if len(pushURLList) > 0 {
			pushURL = pushURLList[0]
		}
		remotes = append(remotes, GitRemote{
			Name:     name,
			FetchURL: fetchURL,
			PushURL:  pushURL,
			PushURLs: len(pushURLList),
		})
	}
	return remotes, nil
}

// PushRemote resolves Git's configured push destination for the current work.
func (g *GitCLI) PushRemote(ctx context.Context, remotes []GitRemote) (GitRemote, error) {
	currentBranch, err := g.CurrentBranch(ctx)
	if err != nil {
		return GitRemote{}, fmt.Errorf("get current branch: %w", err)
	}

	configKeys := make([]string, 0, 3)
	if currentBranch != "" && currentBranch != "HEAD" {
		configKeys = append(configKeys, "branch."+currentBranch+".pushRemote")
	}
	configKeys = append(configKeys, "remote.pushDefault")
	if currentBranch != "" && currentBranch != "HEAD" {
		configKeys = append(configKeys, "branch."+currentBranch+".remote")
	}
	for _, key := range configKeys {
		name, exists, configErr := g.optionalConfig(ctx, key)
		if configErr != nil {
			return GitRemote{}, configErr
		}
		if !exists || name == "." {
			continue
		}
		remote, found := findGitRemote(remotes, name)
		if !found {
			return GitRemote{}, fmt.Errorf("%w: %s from %s", errPushRemoteMissing, name, key)
		}
		return validatePushRemote(remote)
	}

	if len(remotes) == 1 {
		return validatePushRemote(remotes[0])
	}
	return GitRemote{}, fmt.Errorf(
		"%w: configure remote.pushDefault or branch.%s.pushRemote",
		errPushRemoteAmbiguous,
		currentBranch,
	)
}

func validatePushRemote(remote GitRemote) (GitRemote, error) {
	if remote.PushURLs != 1 {
		return GitRemote{}, fmt.Errorf("%w: %s", errPushRemoteMultipleURLs, remote.Name)
	}
	return remote, nil
}

func findGitRemote(remotes []GitRemote, name string) (GitRemote, bool) {
	for _, remote := range remotes {
		if remote.Name == name {
			return remote, true
		}
	}
	return GitRemote{Name: "", FetchURL: "", PushURL: "", PushURLs: 0}, false
}

// Run executes a git command and returns stdout.
func (g *GitCLI) Run(ctx context.Context, args ...string) (string, error) {
	return g.run(ctx, args...)
}

// HeadCommit returns the current HEAD commit SHA.
func (g *GitCLI) HeadCommit(ctx context.Context) (string, error) {
	return g.Run(ctx, "rev-parse", "HEAD")
}

// RepoRoot returns the git repository root directory.
// The result is cached after the first call per GitCLI instance.
func (g *GitCLI) RepoRoot(ctx context.Context) (string, error) {
	if g.repoRoot != "" {
		return g.repoRoot, nil
	}

	g.repoRootOnce.Do(func() {
		root, err := g.resolveRepoRoot(ctx)
		if err != nil {
			g.repoRootErr = fmt.Errorf("get repo root: %w", err)
			return
		}
		g.repoRoot = root
		if g.workdir == "" {
			// Default callers may run from nested directories; pin to repository
			// root so pathspec operations resolve against a stable base.
			g.workdir = root
		}
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
	if err := g.ensureWorkdir(ctx); err != nil {
		return "", err
	}

	g.log.Command("git", args)

	cmd := g.command(ctx, args...)

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
	if err := g.ensureWorkdir(ctx); err != nil {
		return -1, err
	}

	g.log.Command("git", args)

	cmd := g.command(ctx, args...)

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

func (g *GitCLI) optionalConfig(ctx context.Context, key string) (string, bool, error) {
	if err := g.ensureWorkdir(ctx); err != nil {
		return "", false, err
	}

	args := []string{"config", "--get", key}
	g.log.Command("git", args)

	cmd := g.command(ctx, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) && exitErr.ExitCode() == 1 {
			return "", false, nil
		}
		return "", false, fmt.Errorf(
			"%w: %s: %s",
			ErrGitCommandFailed,
			strings.Join(args, " "),
			stderr.String(),
		)
	}
	return strings.TrimSpace(stdout.String()), true, nil
}

func (g *GitCLI) command(ctx context.Context, args ...string) *exec.Cmd {
	//nolint:gosec // G204: executable is fixed to git; args are the intended wrapper input.
	cmd := exec.CommandContext(ctx, "git", args...)
	if g.workdir != "" {
		cmd.Dir = g.workdir
	}
	return cmd
}

func (g *GitCLI) ensureWorkdir(ctx context.Context) error {
	if g.workdir != "" {
		return nil
	}
	root, err := g.resolveRepoRoot(ctx)
	if err != nil {
		return fmt.Errorf("get repo root: %w", err)
	}
	g.repoRoot = root
	g.workdir = root
	return nil
}

func (g *GitCLI) resolveRepoRoot(ctx context.Context) (string, error) {
	const (
		repoRootArg    = "rev-parse"
		repoRootArgOpt = "--show-toplevel"
	)
	g.log.Command("git", []string{repoRootArg, repoRootArgOpt})

	cmd := exec.CommandContext(ctx, "git", repoRootArg, repoRootArgOpt)
	if g.workdir != "" {
		cmd.Dir = g.workdir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%w: %s %s: %s", ErrGitCommandFailed, repoRootArg, repoRootArgOpt, stderr.String())
	}
	return strings.TrimSpace(stdout.String()), nil
}
