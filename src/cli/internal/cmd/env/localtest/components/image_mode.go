package components

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
