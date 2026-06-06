package resource

import (
	"errors"

	"altinn.studio/devenv/pkg/container/types"
)

var (
	errImageReferenceRequired = errors.New("image reference is required")
	errContextPathRequired    = errors.New("context path is required")
	errImageTagRequired       = errors.New("image tag is required")
	errImageSourceRequired    = errors.New("image source reference is required")
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

// PulledImage is a local runtime image pulled from a registry.
// It is a pure value type - use Executor to pull/apply to infrastructure.
type PulledImage struct {
	Enabled    *bool
	Ref        string
	PullPolicy PullPolicy
}

// ID returns the unique identifier for this image.
func (r *PulledImage) ID() ResourceID {
	return ResourceID("image:pulled:" + r.Ref)
}

// Dependencies returns resources that must be applied before this image.
// Pulled images have no dependencies.
func (r *PulledImage) Dependencies() []ResourceRef {
	return nil
}

// ImageRef returns the image reference for container API calls.
func (r *PulledImage) ImageRef() string {
	return r.Ref
}

// IsEnabled reports whether this image participates in graph execution.
func (r *PulledImage) IsEnabled() bool {
	return Enabled(r.Enabled)
}

// Validate checks that the image configuration is valid.
func (r *PulledImage) Validate() error {
	if r.Ref == "" {
		return errImageReferenceRequired
	}
	return nil
}

// BuiltImage is a local runtime image built from a Dockerfile.
// It is a pure value type - use Executor to build/apply to infrastructure.
type BuiltImage struct {
	Enabled     *bool
	ContextPath string
	Dockerfile  string // relative to ContextPath, defaults to "Dockerfile"
	Tag         string
	Build       types.BuildOptions
}

// ID returns the unique identifier for this image.
func (l *BuiltImage) ID() ResourceID {
	return ResourceID("image:built:" + l.Tag)
}

// Dependencies returns resources that must be applied before this image.
// Built images have no dependencies (build context is external).
func (l *BuiltImage) Dependencies() []ResourceRef {
	return nil
}

// ImageRef returns the image tag for container API calls.
func (l *BuiltImage) ImageRef() string {
	return l.Tag
}

// IsEnabled reports whether this image participates in graph execution.
func (l *BuiltImage) IsEnabled() bool {
	return Enabled(l.Enabled)
}

// Validate checks that the image configuration is valid.
func (l *BuiltImage) Validate() error {
	if l.ContextPath == "" {
		return errContextPathRequired
	}
	if l.Tag == "" {
		return errImageTagRequired
	}
	return nil
}

// PublishedImage is a registry image reference published from another image resource.
type PublishedImage struct {
	Enabled *bool
	Ref     string
	Source  ResourceRef
}

// ID returns the unique identifier for this image.
func (p *PublishedImage) ID() ResourceID {
	return ResourceID("image:published:" + p.Ref)
}

// Dependencies returns resources that must be applied before this image.
func (p *PublishedImage) Dependencies() []ResourceRef {
	return appendWithRequiredRef(nil, p.Source)
}

// ImageRef returns the registry reference for container API calls.
func (p *PublishedImage) ImageRef() string {
	return p.Ref
}

// IsEnabled reports whether this image participates in graph execution.
func (p *PublishedImage) IsEnabled() bool {
	return Enabled(p.Enabled)
}

// Validate checks that the image configuration is valid.
func (p *PublishedImage) Validate() error {
	if p.Ref == "" {
		return errImageReferenceRequired
	}
	return validateRef(p.Source, errImageSourceRequired)
}

// Compile-time interface checks.
var (
	_ Resource           = (*PulledImage)(nil)
	_ Resource           = (*BuiltImage)(nil)
	_ Resource           = (*PublishedImage)(nil)
	_ ImageResource      = (*PulledImage)(nil)
	_ ImageResource      = (*BuiltImage)(nil)
	_ ImageResource      = (*PublishedImage)(nil)
	_ EnablementProvider = (*PulledImage)(nil)
	_ EnablementProvider = (*BuiltImage)(nil)
	_ EnablementProvider = (*PublishedImage)(nil)
	_ Validator          = (*PulledImage)(nil)
	_ Validator          = (*BuiltImage)(nil)
	_ Validator          = (*PublishedImage)(nil)
)
