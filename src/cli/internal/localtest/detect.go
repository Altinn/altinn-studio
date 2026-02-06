package localtest

import (
	"os"
	"os/exec"
	"path/filepath"
)

const (
	// EnvDevMode is the environment variable to enable dev mode.
	// When set to "true" or "1", studioctl will build images from source.
	EnvDevMode = "STUDIOCTL_INTERNAL_DEVMODE"

	// maxWalkDepth is the maximum number of directories to walk up when searching for repo root.
	maxWalkDepth = 20

	// localtestDockerfilePath is the path to the localtest Dockerfile relative to repo root.
	localtestDockerfilePath = "src/Runtime/localtest/Dockerfile"
)

// DetectImageMode determines whether to use dev or release mode.
// Dev mode is enabled when STUDIOCTL_INTERNAL_DEVMODE is set to "true" or "1"
// and the localtest Dockerfile can be found relative to the repo root.
func DetectImageMode(cwd string) (ImageMode, *DevImageConfig) {
	devModeEnv := os.Getenv(EnvDevMode)
	if devModeEnv != "true" && devModeEnv != "1" {
		return ReleaseMode, nil
	}

	// Dev mode requested - find repo root
	repoRoot, found := GetRepoRoot(cwd)
	if !found {
		return ReleaseMode, nil
	}

	// Verify localtest Dockerfile exists
	dockerfilePath := filepath.Join(repoRoot, localtestDockerfilePath)
	if _, err := os.Stat(dockerfilePath); err != nil {
		return ReleaseMode, nil
	}

	return DevMode, &DevImageConfig{RepoRoot: repoRoot}
}

// GetRepoRoot walks up from the given directory looking for a .git directory or file.
// Returns the repository root path and true if found, or empty string and false if not.
// Note: .git can be a file in git worktrees.
func GetRepoRoot(startPath string) (string, bool) {
	current, err := filepath.Abs(startPath)
	if err != nil {
		return "", false
	}

	for range maxWalkDepth {
		gitPath := filepath.Join(current, ".git")
		if _, err := os.Stat(gitPath); err == nil {
			return current, true
		}

		parent := filepath.Dir(current)
		if parent == current {
			// Reached filesystem root
			break
		}
		current = parent
	}

	return "", false
}

// IsPodmanAvailable checks if podman CLI is available in PATH.
func IsPodmanAvailable() bool {
	_, err := exec.LookPath("podman")
	return err == nil
}
