// Package localbackend applies local filesystem resource graph resources.
package localbackend

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

const (
	defaultFileMode = 0o644
	parentDirMode   = 0o755
	gitWaitDelay    = 5 * time.Second
)

var (
	errUnsupportedResource       = errors.New("unsupported local backend resource")
	errLocalPathNotGitRepo       = errors.New("local path exists but is not a Git repository")
	errGitCheckoutOriginMismatch = errors.New("git checkout origin URL mismatch")
	errGitNotFound               = errors.New("git checkouts need the git command, which was not found on PATH")
)

// gitEnvironmentOverrides are set for every git command; gitEnvironment says why.
var gitEnvironmentOverrides = []string{
	"GIT_TERMINAL_PROMPT=0",
	"GIT_ASKPASS=",
	"SSH_ASKPASS=",
	"GCM_INTERACTIVE=never",
	"GIT_CONFIG_NOSYSTEM=1",
	"GIT_CONFIG_GLOBAL=" + os.DevNull,
}

// gitRepositoryEnvironment lists the variables that select a repository or pass configuration,
// as printed by `git rev-parse --local-env-vars`. gitEnvironment also removes GIT_CONFIG_*.
var gitRepositoryEnvironment = []string{
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_COMMON_DIR",
	"GIT_CONFIG",
	"GIT_DIR",
	"GIT_GRAFT_FILE",
	"GIT_IMPLICIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_NO_REPLACE_OBJECTS",
	"GIT_OBJECT_DIRECTORY",
	"GIT_PREFIX",
	"GIT_REPLACE_REF_BASE",
	"GIT_SHALLOW_FILE",
	"GIT_WORK_TREE",
}

// Backend applies local file and Git checkout resources.
type Backend struct{}

// New creates a local filesystem resource backend.
func New() Backend {
	return Backend{}
}

// Supports reports whether this backend can apply and observe r.
func (b Backend) Supports(r resource.Resource) bool {
	switch r.(type) {
	case *resource.LocalFile, *resource.GitCheckout:
		return true
	default:
		return false
	}
}

// Apply creates or updates one supported resource.
func (b Backend) Apply(
	ctx context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.Output, error) {
	switch res := r.(type) {
	case *resource.LocalFile:
		return executor.NoOutput{}, applyLocalFile(res)
	case *resource.GitCheckout:
		return executor.NoOutput{}, applyGitCheckout(ctx, res, 0)
	default:
		return nil, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Observe reads current runtime state for one supported resource.
func (b Backend) Observe(
	ctx context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.ObservedResource, error) {
	switch res := r.(type) {
	case *resource.LocalFile:
		return observeLocalFile(res)
	case *resource.GitCheckout:
		return observeGitCheckout(ctx, res)
	default:
		return executor.ObservedResource{}, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Destroy removes one observed runtime resource.
func (b Backend) Destroy(context.Context, resource.ResourceID, executor.ObservedResource) error {
	return nil
}

func applyLocalFile(file *resource.LocalFile) error {
	mode := file.Mode
	if mode == 0 {
		mode = defaultFileMode
	}
	if err := os.MkdirAll(filepath.Dir(file.Path), parentDirMode); err != nil {
		return fmt.Errorf("create parent directory for %s: %w", file.Path, err)
	}
	if existing, err := os.ReadFile(file.Path); err == nil && bytes.Equal(existing, file.Content) {
		if chmodErr := os.Chmod(file.Path, mode); chmodErr != nil {
			return fmt.Errorf("chmod local file %s: %w", file.Path, chmodErr)
		}
		return nil
	} else if err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("read local file %s: %w", file.Path, err)
	}

	tmp, err := os.CreateTemp(filepath.Dir(file.Path), "."+filepath.Base(file.Path)+".tmp-*")
	if err != nil {
		return fmt.Errorf("create temp file for %s: %w", file.Path, err)
	}
	tmpPath := tmp.Name()
	removeTmp := true
	defer func() {
		if removeTmp {
			removeFileBestEffort(tmpPath)
		}
	}()
	if _, err := tmp.Write(file.Content); err != nil {
		closeFileBestEffort(tmp)
		return fmt.Errorf("write temp file for %s: %w", file.Path, err)
	}
	if err := tmp.Chmod(mode); err != nil {
		closeFileBestEffort(tmp)
		return fmt.Errorf("chmod temp file for %s: %w", file.Path, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp file for %s: %w", file.Path, err)
	}
	if err := os.Rename(tmpPath, file.Path); err != nil {
		return fmt.Errorf("replace local file %s: %w", file.Path, err)
	}
	removeTmp = false
	return nil
}

func observeLocalFile(file *resource.LocalFile) (executor.ObservedResource, error) {
	observed := executor.ObservedResource{
		Resource:  file,
		RuntimeID: file.Path,
		Type:      executor.ResourceTypeLocalFile,
		Status:    executor.StatusReady,
		Managed:   false,
	}
	data, err := os.ReadFile(file.Path)
	if errors.Is(err, os.ErrNotExist) {
		observed.Status = executor.StatusDestroyed
		return observed, nil
	}
	if err != nil {
		return observed, fmt.Errorf("read local file %s: %w", file.Path, err)
	}
	if !bytes.Equal(data, file.Content) {
		observed.Status = executor.StatusPending
	}
	return observed, nil
}

// EnsureGitCheckout clones a checkout, or resets an existing one to its remote ref, as
// applying the resource does. For callers that need the files before a graph is built.
// A positive networkTimeout bounds the clone or fetch, but not the local steps, so that it
// cannot stop a reset partway through the working tree.
func EnsureGitCheckout(ctx context.Context, checkout *resource.GitCheckout, networkTimeout time.Duration) error {
	if err := checkout.Validate(); err != nil {
		return fmt.Errorf("validate Git checkout %s: %w", checkout.Name, err)
	}
	return applyGitCheckout(ctx, checkout, networkTimeout)
}

func applyGitCheckout(ctx context.Context, checkout *resource.GitCheckout, networkTimeout time.Duration) error {
	if !isGitCheckout(checkout.Path) {
		if pathExists(checkout.Path) {
			return fmt.Errorf("%w: %s", errLocalPathNotGitRepo, checkout.Path)
		}
		if err := cloneGitCheckout(ctx, checkout, networkTimeout); err != nil {
			// git removes a clone that fails, but not one killed on cancellation, which a later
			// apply would take for a complete checkout. The path did not exist before the clone.
			return errors.Join(err, os.RemoveAll(checkout.Path))
		}
		return nil
	}
	if err := validateGitCheckoutOrigin(ctx, checkout); err != nil {
		return err
	}

	refSpec := "+refs/heads/" + checkout.Ref + ":" + remoteRefName(checkout)
	if err := runGitNetwork(
		ctx,
		networkTimeout,
		checkout.Path,
		"fetch",
		"--depth=1",
		"--force",
		"--no-tags",
		"origin",
		refSpec,
	); err != nil {
		return fmt.Errorf("fetch Git checkout %s: %w", checkout.Name, err)
	}
	if _, err := runGit(ctx, checkout.Path, "reset", "--hard", "--quiet", remoteRefName(checkout)); err != nil {
		return fmt.Errorf("reset Git checkout %s: %w", checkout.Name, err)
	}
	return nil
}

func cloneGitCheckout(ctx context.Context, checkout *resource.GitCheckout, networkTimeout time.Duration) error {
	if err := runGitNetwork(ctx, networkTimeout, "", "clone", "--depth=1", "--single-branch", "--no-tags",
		"--no-local", "--template=", "--branch", checkout.Ref, "--", checkout.RepoURL, checkout.Path); err != nil {
		return fmt.Errorf("clone Git checkout %s: %w", checkout.Name, err)
	}
	// clone --branch also accepts tags, which have no remote branch to fetch on later applies.
	ref := remoteRefName(checkout)
	if _, err := runGit(ctx, checkout.Path, "show-ref", "--verify", "--quiet", ref); err != nil {
		return fmt.Errorf("resolve Git checkout %s branch %s: %w", checkout.Name, checkout.Ref, err)
	}
	return nil
}

func observeGitCheckout(ctx context.Context, checkout *resource.GitCheckout) (executor.ObservedResource, error) {
	observed := executor.ObservedResource{
		Resource:  checkout,
		RuntimeID: checkout.Path,
		Type:      executor.ResourceTypeGitCheckout,
		Status:    executor.StatusReady,
		Managed:   false,
	}
	if !isGitCheckout(checkout.Path) {
		if pathExists(checkout.Path) {
			observed.Status = executor.StatusFailed
			return observed, nil
		}
		observed.Status = executor.StatusDestroyed
		return observed, nil
	}
	if !gitCheckoutReady(ctx, checkout) {
		observed.Status = executor.StatusPending
	}
	return observed, nil
}

// isGitCheckout reports whether path is the top of a Git working tree. It looks for .git
// rather than asking git, which would also accept a directory inside an enclosing repository.
func isGitCheckout(path string) bool {
	return pathExists(filepath.Join(path, ".git"))
}

func validateGitCheckoutOrigin(ctx context.Context, checkout *resource.GitCheckout) error {
	// Read the configured URL rather than `git remote get-url`, which applies url.*.insteadOf.
	output, err := runGit(ctx, checkout.Path, "config", "--get-all", "remote.origin.url")
	if err != nil {
		return fmt.Errorf("open Git checkout %s origin remote: %w", checkout.Name, err)
	}
	urls := strings.Split(output, "\n")
	if urls[0] != checkout.RepoURL {
		return fmt.Errorf(
			"%w for %s: got %q want %q",
			errGitCheckoutOriginMismatch,
			checkout.Name,
			strings.Join(urls, ","),
			checkout.RepoURL,
		)
	}
	return nil
}

func gitCheckoutReady(ctx context.Context, checkout *resource.GitCheckout) bool {
	if err := validateGitCheckoutOrigin(ctx, checkout); err != nil {
		return false
	}
	output, err := runGit(ctx, checkout.Path, "rev-parse", "HEAD", remoteRefName(checkout))
	if err != nil {
		return false
	}
	hashes := strings.Fields(output)
	return len(hashes) == 2 && hashes[0] == hashes[1]
}

func remoteRefName(checkout *resource.GitCheckout) string {
	return "refs/remotes/origin/" + checkout.Ref
}

// runGit runs git in dir and returns its trimmed standard output. An empty dir runs it in
// the current directory.
func runGit(ctx context.Context, dir string, args ...string) (string, error) {
	cmd := processutil.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	cmd.Env = gitEnvironment(dir)
	// git starts helpers such as git-remote-https that keep the output pipes open after git
	// itself is killed on cancellation.
	cmd.WaitDelay = gitWaitDelay
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return "", fmt.Errorf("%w: %w", errGitNotFound, err)
		}
		if message := strings.TrimSpace(stderr.String()); message != "" {
			return "", fmt.Errorf("git %s: %w: %s", args[0], err, message)
		}
		return "", fmt.Errorf("git %s: %w", args[0], err)
	}
	return strings.TrimSpace(stdout.String()), nil
}

// runGitNetwork runs a git command that reaches the remote, as runGit does, within timeout when
// it is positive.
func runGitNetwork(ctx context.Context, timeout time.Duration, dir string, args ...string) error {
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}
	_, err := runGit(ctx, dir, args...)
	return err
}

// gitEnvironment returns the environment for git commands in dir. Checkouts come from public
// repositories and must be the same on every machine, so git may not prompt for credentials or
// read the user's and system's configuration, such as core.autocrlf, URL rewrites, credential
// helpers and templates with hooks. It drops variables that point git at another repository,
// as set inside a Git hook, and does not let git look above dir, where a checkout in a cache
// inside a repository with a broken .git would otherwise reset the enclosing repository.
func gitEnvironment(dir string) []string {
	env := make([]string, 0, len(os.Environ())+len(gitEnvironmentOverrides)+1)
	for _, entry := range os.Environ() {
		name, _, _ := strings.Cut(entry, "=")
		// Windows treats environment variable names case-insensitively.
		name = strings.ToUpper(name)
		if !slices.Contains(gitRepositoryEnvironment, name) && !strings.HasPrefix(name, "GIT_CONFIG_") {
			env = append(env, entry)
		}
	}
	env = append(env, gitEnvironmentOverrides...)
	if dir != "" {
		if absolute, err := filepath.Abs(dir); err == nil {
			env = append(env, "GIT_CEILING_DIRECTORIES="+filepath.Dir(absolute))
		}
	}
	return env
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil || !errors.Is(err, os.ErrNotExist)
}

func closeFileBestEffort(file *os.File) {
	if err := file.Close(); err != nil {
		return
	}
}

func removeFileBestEffort(path string) {
	if err := os.Remove(path); err != nil {
		return
	}
}

var _ executor.Backend = Backend{}
