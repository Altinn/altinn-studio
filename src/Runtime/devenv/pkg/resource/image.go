package resource

import (
	"errors"

	"altinn.studio/devenv/pkg/container/types"
)

var (
	errImageReferenceRequired = errors.New("image reference is required")
	errContextPathRequired    = errors.New("context path is required")
	errImageTagRequired       = errors.New("image tag is required")
)

// PullPolicy specifies when to pull an image.
type PullPolicy int

const (
	// PullAlways always pulls the image.
	PullAlways PullPolicy = iota
	// PullIfNotPresent only pulls if the image doesn't exist locally.
	PullIfNotPresent
	// PullNever never pulls, fails if image doesn't exist.
	PullNever
)

// ImageResource provides access to the image reference.
// Used by Container to reference images.
type ImageResource interface {
	Resource
	ImageRef() string
}

// RemoteImage is a resource that references an image from a registry.
// It is a pure value type - use Executor to pull/apply to infrastructure.
type RemoteImage struct {
	Enabled    *bool
	Ref        string
	PullPolicy PullPolicy
}

// ID returns the unique identifier for this image.
func (r *RemoteImage) ID() ResourceID {
	return ResourceID("image:remote:" + r.Ref)
}

// Dependencies returns resources that must be applied before this image.
// Remote images have no dependencies.
func (r *RemoteImage) Dependencies() []ResourceRef {
	return nil
}

// ImageRef returns the image reference for container API calls.
func (r *RemoteImage) ImageRef() string {
	return r.Ref
}

// IsEnabled reports whether this image participates in graph execution.
func (r *RemoteImage) IsEnabled() bool {
	return Enabled(r.Enabled)
}

// Validate checks that the image configuration is valid.
func (r *RemoteImage) Validate() error {
	if r.Ref == "" {
		return errImageReferenceRequired
	}
	return nil
}

// LocalImage is a resource that builds an image from a Dockerfile.
// It is a pure value type - use Executor to build/apply to infrastructure.
type LocalImage struct {
	Enabled     *bool
	ContextPath string
	Dockerfile  string // relative to ContextPath, defaults to "Dockerfile"
	Tag         string
	Build       types.BuildOptions
}

// ID returns the unique identifier for this image.
func (l *LocalImage) ID() ResourceID {
	return ResourceID("image:local:" + l.Tag)
}

// Dependencies returns resources that must be applied before this image.
// Local images have no dependencies (build context is external).
func (l *LocalImage) Dependencies() []ResourceRef {
	return nil
}

// ImageRef returns the image tag for container API calls.
func (l *LocalImage) ImageRef() string {
	return l.Tag
}

// IsEnabled reports whether this image participates in graph execution.
func (l *LocalImage) IsEnabled() bool {
	return Enabled(l.Enabled)
}

// Validate checks that the image configuration is valid.
func (l *LocalImage) Validate() error {
	if l.ContextPath == "" {
		return errContextPathRequired
	}
	if l.Tag == "" {
		return errImageTagRequired
	}
	return nil
}

// Compile-time interface checks.
var (
	_ Resource           = (*RemoteImage)(nil)
	_ Resource           = (*LocalImage)(nil)
	_ ImageResource      = (*RemoteImage)(nil)
	_ ImageResource      = (*LocalImage)(nil)
	_ EnablementProvider = (*RemoteImage)(nil)
	_ EnablementProvider = (*LocalImage)(nil)
	_ Validator          = (*RemoteImage)(nil)
	_ Validator          = (*LocalImage)(nil)
)
