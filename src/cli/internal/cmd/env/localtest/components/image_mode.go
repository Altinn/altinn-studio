package components

import (
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
)

// ImageMode specifies whether to use pre-built images or build from source.
type ImageMode int

const (
	// ReleaseMode uses pre-built images from GHCR.
	ReleaseMode ImageMode = iota
	// DevMode builds images from local Dockerfiles.
	DevMode
)

// String returns a human-readable representation of the ImageMode.
func (m ImageMode) String() string {
	switch m {
	case ReleaseMode:
		return "release"
	case DevMode:
		return "dev"
	default:
		return "unknown"
	}
}

// DevImageConfig holds the source repository root for dev image builds.
type DevImageConfig struct {
	RepoRoot string // Path to the repository root
}

func localDevImage(prebuilt bool, image *resource.BuiltImage) resource.ImageResource {
	if prebuilt {
		return &resource.PulledImage{
			Enabled:    nil,
			Ref:        image.Tag,
			PullPolicy: resource.PullNever,
		}
	}
	return image
}

// pullPolicyFor returns the pull policy for a configured image. A floating reference is
// re-pulled on every apply so the environment tracks the build its tag points at, while a
// pinned reference is only pulled when it is missing.
func pullPolicyFor(spec config.ImageSpec) resource.PullPolicy {
	if spec.Floating {
		return resource.PullAlwaysAllowStale
	}
	return resource.PullIfNotPresent
}
