package localtest

import (
	"path/filepath"
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

// DevImageConfig holds build context information for dev mode.
type DevImageConfig struct {
	RepoRoot string // Path to the repository root
}

// LocaltestContextPath returns the build context path for the localtest image.
func (c DevImageConfig) LocaltestContextPath() string {
	return filepath.ToSlash(filepath.Join(c.RepoRoot, "src/Runtime/localtest"))
}

// LocaltestDockerfile returns the full Dockerfile path for localtest.
func (c DevImageConfig) LocaltestDockerfile() string {
	return filepath.ToSlash(filepath.Join(c.LocaltestContextPath(), "Dockerfile"))
}

// PDF3ContextPath returns the build context path for the pdf3 image.
func (c DevImageConfig) PDF3ContextPath() string {
	return filepath.ToSlash(filepath.Join(c.RepoRoot, "src/Runtime/pdf3"))
}

// PDF3Dockerfile returns the full Dockerfile path for pdf3.
func (c DevImageConfig) PDF3Dockerfile() string {
	return filepath.ToSlash(filepath.Join(c.PDF3ContextPath(), "Dockerfile.worker"))
}
