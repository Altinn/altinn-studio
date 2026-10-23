package localtestv2

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

// defaultDockerfile is the Dockerfile a --dev directory holds.
const defaultDockerfile = "Dockerfile"

var (
	errUnknownDevContainer = errors.New("unknown container for --dev")
	errDevPath             = errors.New("--dev path")
)

// resolveDevBuilds turns the --dev-<container>[=<path>] values (container name to path, empty for the current
// directory) into builds. A directory is the build context and holds the Dockerfile; a file is the Dockerfile, built
// with the current directory as its context when the file is inside it (cd localtest && --dev-postgres=postgres/Dockerfile)
// and with the file's own directory otherwise. Relative paths are relative to cwd.
func resolveDevBuilds(dev map[string]string, cwd string) (map[string]DevBuild, error) {
	if len(dev) == 0 {
		return nil, nil //nolint:nilnil // No dev build.
	}
	builds := make(map[string]DevBuild, len(dev))
	for name, path := range dev {
		if _, ok := stack().Containers[name]; !ok {
			return nil, fmt.Errorf(
				"%w: %s (one of %s)", errUnknownDevContainer, name, strings.Join(stack().Names(), ", "),
			)
		}
		build, err := devBuild(path, cwd)
		if err != nil {
			return nil, fmt.Errorf("--dev-%s: %w", name, err)
		}
		builds[name] = build
	}
	return builds, nil
}

func devBuild(path, cwd string) (DevBuild, error) {
	if strings.TrimSpace(path) == "" {
		path = cwd
	}
	if !filepath.IsAbs(path) {
		path = filepath.Join(cwd, path)
	}
	path = filepath.Clean(path)
	info, err := os.Stat(path)
	if err != nil {
		return DevBuild{}, fmt.Errorf("%w: %w", errDevPath, err)
	}
	if info.IsDir() {
		dockerfile := filepath.Join(path, defaultDockerfile)
		if _, err := os.Stat(dockerfile); err != nil {
			return DevBuild{}, fmt.Errorf("%w: %s has no %s: %w", errDevPath, path, defaultDockerfile, err)
		}
		return DevBuild{Context: path, Dockerfile: dockerfile}, nil
	}
	buildContext := filepath.Dir(path)
	if rel, err := filepath.Rel(cwd, path); err == nil && !strings.HasPrefix(rel, "..") {
		buildContext = filepath.Clean(cwd)
	}
	return DevBuild{Context: buildContext, Dockerfile: path}, nil
}

// DevContainers lists the containers --dev-<container> can build: every container of the manifest.
func DevContainers() []string {
	return slices.Clone(stack().Names())
}
