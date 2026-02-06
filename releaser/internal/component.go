// Package internal provides release workflow orchestration for components.
package internal

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/releaser/internal/version"
)

// Component errors.
var (
	ErrComponentNotFound = errors.New("component not found")
)

// ComponentBuilder builds release artifacts for GitHub Release.
// Components with nil Builder create changelog-only releases (YAML handles build/publish).
type ComponentBuilder interface {
	// Build produces release artifacts in outputDir.
	// Returns the list of artifact paths relative to outputDir.
	Build(ctx context.Context, ver *version.Version, outputDir string) ([]string, error)
}

// Component represents a releasable component in the repository.
type Component struct {
	Builder       ComponentBuilder
	Name          string
	ChangelogPath string
	SourcePath    string
}

// Component registry.
//
//nolint:gochecknoglobals // registry pattern
var components = map[string]*Component{
	"studioctl": {
		Name:          "studioctl",
		ChangelogPath: "src/cli/CHANGELOG.md",
		SourcePath:    "src/cli",
		Builder:       nil, // set later to avoid import cycle, see init in builder_go.go
	},
	"fileanalyzers": {
		Name:          "fileanalyzers",
		ChangelogPath: "src/App/fileanalyzers/CHANGELOG.md",
		SourcePath:    "src/App/fileanalyzers",
		Builder:       nil, // YAML handles dotnet pack/push
	},
}

// GetComponent returns a component by name.
func GetComponent(name string) (*Component, error) {
	c, ok := components[name]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrComponentNotFound, name)
	}
	return c, nil
}

// ReleaseBranch returns the release branch name (e.g., "release/studioctl/v1.0").
func (c *Component) ReleaseBranch(major, minor int) string {
	return fmt.Sprintf("release/%s/v%d.%d", c.Name, major, minor)
}

// PrepBranch returns the release prep branch name (e.g., "release-prep/studioctl-v1.0.0").
func (c *Component) PrepBranch(ver string) string {
	return fmt.Sprintf("release-prep/%s-%s", c.Name, ver)
}

// BackportBranch returns the backport branch name (e.g., "backport/studioctl-v1.0-abc12345").
func (c *Component) BackportBranch(ver, sha string) string {
	shortSHA := sha
	if len(sha) > backportShortSHALen {
		shortSHA = sha[:backportShortSHALen]
	}
	return fmt.Sprintf("backport/%s-%s-%s", c.Name, ver, shortSHA)
}

// ReleaseLabel returns the PR label for releases (e.g., "studioctl-release").
func (c *Component) ReleaseLabel() string {
	return c.Name + "-release"
}

// ReleaseTitle returns the GitHub release title (e.g., "studioctl v1.0.0").
func (c *Component) ReleaseTitle(ver string) string {
	return c.Name + " " + ver
}

// Tag returns the full git tag (e.g., "studioctl/v1.0.0").
func (c *Component) Tag(ver string) string {
	return c.Name + "/" + ver
}
