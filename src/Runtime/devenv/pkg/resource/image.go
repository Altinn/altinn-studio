package resource

import "errors"

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

// Validate checks that the image configuration is valid.
func (r *RemoteImage) Validate() error {
	if r.Ref == "" {
		return errors.New("image reference is required")
	}
	return nil
}

// LocalImage is a resource that builds an image from a Dockerfile.
// It is a pure value type - use Executor to build/apply to infrastructure.
type LocalImage struct {
	ContextPath string
	Dockerfile  string // relative to ContextPath, defaults to "Dockerfile"
	Tag         string
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

// Validate checks that the image configuration is valid.
func (l *LocalImage) Validate() error {
	if l.ContextPath == "" {
		return errors.New("context path is required")
	}
	if l.Tag == "" {
		return errors.New("image tag is required")
	}
	return nil
}

// Compile-time interface checks
var (
	_ Resource      = (*RemoteImage)(nil)
	_ Resource      = (*LocalImage)(nil)
	_ ImageResource = (*RemoteImage)(nil)
	_ ImageResource = (*LocalImage)(nil)
	_ Validator     = (*RemoteImage)(nil)
	_ Validator     = (*LocalImage)(nil)
)
