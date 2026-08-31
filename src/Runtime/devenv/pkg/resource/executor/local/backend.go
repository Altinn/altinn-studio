// Package localbackend applies local filesystem resource graph resources.
package localbackend

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
)

const (
	defaultFileMode = 0o644
	parentDirMode   = 0o755
)

var (
	errUnsupportedResource       = errors.New("unsupported local backend resource")
	errLocalPathNotGitRepo       = errors.New("local path exists but is not a Git repository")
	errGitCheckoutOriginMismatch = errors.New("git checkout origin URL mismatch")
)

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
	_ context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.Output, error) {
	switch res := r.(type) {
	case *resource.LocalFile:
		return executor.NoOutput{}, applyLocalFile(res)
	case *resource.GitCheckout:
		return executor.NoOutput{}, applyGitCheckout(res)
	default:
		return nil, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Observe reads current runtime state for one supported resource.
func (b Backend) Observe(
	_ context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.ObservedResource, error) {
	switch res := r.(type) {
	case *resource.LocalFile:
		return observeLocalFile(res)
	case *resource.GitCheckout:
		return observeGitCheckout(res)
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

func applyGitCheckout(checkout *resource.GitCheckout) error {
	refName := plumbing.NewBranchReferenceName(checkout.Ref)
	repo, err := git.PlainOpen(checkout.Path)
	if err != nil {
		if pathExists(checkout.Path) {
			return fmt.Errorf("%w: %s", errLocalPathNotGitRepo, checkout.Path)
		}
		if _, cloneErr := git.PlainClone(checkout.Path, false, &git.CloneOptions{
			URL:           checkout.RepoURL,
			ReferenceName: refName,
			SingleBranch:  true,
			Depth:         1,
		}); cloneErr != nil {
			return fmt.Errorf("clone Git checkout %s: %w", checkout.Name, cloneErr)
		}
		return nil
	}
	if originErr := validateGitCheckoutOrigin(repo, checkout); originErr != nil {
		return originErr
	}

	err = repo.Fetch(&git.FetchOptions{
		RemoteName: "origin",
		RefSpecs: []config.RefSpec{
			config.RefSpec("+" + refName.String() + ":refs/remotes/origin/" + checkout.Ref),
		},
		Depth: 1,
		Force: true,
	})
	if err != nil && !errors.Is(err, git.NoErrAlreadyUpToDate) {
		return fmt.Errorf("fetch Git checkout %s: %w", checkout.Name, err)
	}
	ref, err := repo.Reference(plumbing.NewRemoteReferenceName("origin", checkout.Ref), true)
	if err != nil {
		return fmt.Errorf("resolve Git checkout %s ref %s: %w", checkout.Name, checkout.Ref, err)
	}
	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("open Git checkout %s worktree: %w", checkout.Name, err)
	}
	if err := worktree.Reset(&git.ResetOptions{Commit: ref.Hash(), Mode: git.HardReset}); err != nil {
		return fmt.Errorf("reset Git checkout %s: %w", checkout.Name, err)
	}
	return nil
}

func observeGitCheckout(checkout *resource.GitCheckout) (executor.ObservedResource, error) {
	observed := executor.ObservedResource{
		Resource:  checkout,
		RuntimeID: checkout.Path,
		Type:      executor.ResourceTypeGitCheckout,
		Status:    executor.StatusReady,
		Managed:   false,
	}
	repo, err := git.PlainOpen(checkout.Path)
	if err != nil {
		if pathExists(checkout.Path) {
			observed.Status = executor.StatusFailed
			return observed, nil
		}
		observed.Status = executor.StatusDestroyed
		return observed, nil
	}
	if !gitCheckoutReady(repo, checkout) {
		observed.Status = executor.StatusPending
	}
	return observed, nil
}

func validateGitCheckoutOrigin(repo *git.Repository, checkout *resource.GitCheckout) error {
	remote, err := repo.Remote("origin")
	if err != nil {
		return fmt.Errorf("open Git checkout %s origin remote: %w", checkout.Name, err)
	}
	urls := remote.Config().URLs
	if len(urls) == 0 || urls[0] != checkout.RepoURL {
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

func gitCheckoutReady(repo *git.Repository, checkout *resource.GitCheckout) bool {
	if err := validateGitCheckoutOrigin(repo, checkout); err != nil {
		return false
	}
	ref, err := repo.Reference(plumbing.NewRemoteReferenceName("origin", checkout.Ref), true)
	if err != nil {
		return false
	}
	head, err := repo.Head()
	if err != nil {
		return false
	}
	return head.Hash() == ref.Hash()
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
