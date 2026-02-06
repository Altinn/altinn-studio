package internal

import (
	"errors"

	"altinn.studio/releaser/internal/version"
)

// ErrTagExists indicates the tag already exists.
var ErrTagExists = errors.New("tag already exists")

// Tag represents a release tag combining component and version.
type Tag struct {
	Component *Component
	Version   *version.Version
}

// NewTag creates a Tag from a component and version.
func NewTag(comp *Component, ver *version.Version) *Tag {
	return &Tag{
		Component: comp,
		Version:   ver,
	}
}

// Full returns the full tag string (e.g., "studioctl/v1.2.3").
func (t *Tag) Full() string {
	return t.Component.Tag(t.Version.String())
}

// ReleaseBranch returns the release branch for this tag (e.g., "release/studioctl/v1.2").
func (t *Tag) ReleaseBranch() string {
	return t.Component.ReleaseBranch(t.Version.Major, t.Version.Minor)
}
