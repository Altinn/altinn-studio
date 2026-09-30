//nolint:revive // Resource method names are fixed by interfaces.
package resource

import (
	"errors"
	"io/fs"
)

var (
	errGitRepositoryURLRequired = errors.New("git repository url is required")
	errGitReferenceRequired     = errors.New("git reference is required")
)

// LocalFile represents a file written on the local filesystem.
type LocalFile struct {
	Enabled   *bool
	Name      string
	Path      string
	Content   []byte
	DependsOn []ResourceRef
	Mode      fs.FileMode
}

func (r *LocalFile) ID() ResourceID {
	return ResourceID("local-file:" + r.Name)
}

func (r *LocalFile) Dependencies() []ResourceRef {
	return cloneRefs(r.DependsOn)
}

func (r *LocalFile) IsEnabled() bool {
	return Enabled(r.Enabled)
}

func (r *LocalFile) Validate() error {
	if err := validateName(r.Name); err != nil {
		return err
	}
	if r.Path == "" {
		return errPathRequired
	}
	return nil
}

// GitCheckout represents a local checkout of a remote Git repository.
type GitCheckout struct {
	Enabled   *bool
	Name      string
	RepoURL   string
	Ref       string
	Path      string
	DependsOn []ResourceRef
}

func (r *GitCheckout) ID() ResourceID {
	return ResourceID("git-checkout:" + r.Name)
}

func (r *GitCheckout) Dependencies() []ResourceRef {
	return cloneRefs(r.DependsOn)
}

func (r *GitCheckout) IsEnabled() bool {
	return Enabled(r.Enabled)
}

func (r *GitCheckout) Validate() error {
	if err := validateName(r.Name); err != nil {
		return err
	}
	if r.RepoURL == "" {
		return errGitRepositoryURLRequired
	}
	if r.Ref == "" {
		return errGitReferenceRequired
	}
	if r.Path == "" {
		return errPathRequired
	}
	return nil
}

var (
	_ Resource           = (*LocalFile)(nil)
	_ Validator          = (*LocalFile)(nil)
	_ EnablementProvider = (*LocalFile)(nil)
	_ Resource           = (*GitCheckout)(nil)
	_ Validator          = (*GitCheckout)(nil)
	_ EnablementProvider = (*GitCheckout)(nil)
)
