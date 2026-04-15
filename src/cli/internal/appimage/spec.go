// Package appimage builds container image specifications for Altinn apps.
package appimage

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/appnaming"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
)

const (
	defaultLocalTagPrefix           = "localtest-app:"
	generatedDockerfilePattern      = "localtest-app-*.Dockerfile"
	generatedAppBuildCacheRefPrefix = "ghcr.io/altinn/altinn-studio/app-cache:"
	maxDockerTagLength              = 128
)

// ErrDockerfileNotFound is returned when an app Dockerfile cannot be found.
var ErrDockerfileNotFound = errors.New("dockerfile not found")

// BuildSpec contains container image build details for an app.
type BuildSpec struct {
	ContextPath       string
	Dockerfile        string
	DockerfileContent string
	ImageTag          string
	Build             types.BuildOptions
}

// BuildSpecForApp builds image build configuration for an app container.
func BuildSpecForApp(result repocontext.Detection, imageTag string) (BuildSpec, error) {
	runRepo, err := newRepoContext(result)
	if err != nil {
		return BuildSpec{}, err
	}
	contextPath, dockerfile, dockerfileContent, err := dockerBuildInputs(runRepo)
	if err != nil {
		return BuildSpec{}, err
	}
	var buildOptions types.BuildOptions
	if runRepo.UseGeneratedDockerfile {
		buildCacheRef, err := generatedAppBuildCacheRef(runRepo)
		if err != nil {
			return BuildSpec{}, err
		}
		buildOptions = buildCacheOptions(buildCacheRef)
	}

	if imageTag == "" {
		imageTag = DefaultLocalTag(result.AppRoot)
	}

	return BuildSpec{
		ContextPath:       contextPath,
		Dockerfile:        dockerfile,
		DockerfileContent: dockerfileContent,
		ImageTag:          imageTag,
		Build:             buildOptions,
	}, nil
}

// DefaultLocalTag returns the local app image tag used when no tag is specified.
func DefaultLocalTag(appPath string) string {
	return defaultLocalTagPrefix + appnaming.AppNameFromPath(appPath)
}

// MaterializeDockerfile writes a generated Dockerfile to disk when needed.
func MaterializeDockerfile(spec *BuildSpec) (func() error, error) {
	cleanup := func() error { return nil }
	if spec.DockerfileContent != "" {
		dockerfile, err := writeGeneratedDockerfile(spec.DockerfileContent)
		if err != nil {
			return cleanup, err
		}
		spec.Dockerfile = dockerfile
		cleanup = func() error { return os.Remove(dockerfile) }
	}
	if _, statErr := os.Stat(spec.Dockerfile); statErr != nil {
		cleanupErr := cleanup()
		if os.IsNotExist(statErr) {
			return cleanup, fmt.Errorf("%w: %s", ErrDockerfileNotFound, spec.Dockerfile)
		}
		return cleanup, fmt.Errorf("stat dockerfile: %w", errors.Join(statErr, cleanupErr))
	}
	return cleanup, nil
}

func dockerBuildInputs(runRepo repoContext) (string, string, string, error) {
	if !runRepo.UseGeneratedDockerfile {
		content, ok, err := appDockerfileWithConfigCopy(runRepo)
		if err != nil {
			return "", "", "", err
		}
		if ok {
			return runRepo.BuildRoot, "", content, nil
		}
		return runRepo.BuildRoot, filepath.Join(runRepo.AppRoot, "Dockerfile"), "", nil
	}

	content, err := generateDockerfile(runRepo)
	if err != nil {
		return "", "", "", err
	}
	return runRepo.BuildRoot, "", content, nil
}

func generatedAppBuildCacheRef(runRepo repoContext) (string, error) {
	rel, err := relPathWithin(runRepo.BuildRoot, runRepo.AppRoot)
	if err != nil {
		return "", err
	}
	return generatedAppBuildCacheRefPrefix + dockerTagFromPath(rel), nil
}

func dockerTagFromPath(path string) string {
	tag := appnaming.DockerNameFragment(path)
	if tag == "" {
		tag = "app"
	}
	if len(tag) <= maxDockerTagLength {
		return tag
	}

	hash := sha256.Sum256([]byte(tag))
	suffix := "-" + hex.EncodeToString(hash[:])[:12]
	return strings.Trim(tag[:maxDockerTagLength-len(suffix)], "-") + suffix
}

func buildCacheOptions(ref string) types.BuildOptions {
	if ref == "" || !config.IsTruthyEnv(os.Getenv("CI")) {
		return types.BuildOptions{
			CacheFrom: nil,
			CacheTo:   nil,
		}
	}

	opts := types.BuildOptions{
		CacheFrom: []string{"type=registry,ref=" + ref},
		CacheTo:   nil,
	}
	if config.IsTruthyEnv(os.Getenv(config.EnvRegistryCacheWrite)) {
		opts.CacheTo = []string{"type=registry,ref=" + ref + ",mode=max"}
	}
	return opts
}

func writeGeneratedDockerfile(content string) (string, error) {
	file, err := os.CreateTemp("", generatedDockerfilePattern)
	if err != nil {
		return "", fmt.Errorf("create generated dockerfile: %w", err)
	}
	if _, err := file.WriteString(content); err != nil {
		closeErr := file.Close()
		removeErr := os.Remove(file.Name())
		return "", fmt.Errorf("write generated dockerfile: %w", errors.Join(err, closeErr, removeErr))
	}
	if err := file.Close(); err != nil {
		if removeErr := os.Remove(file.Name()); removeErr != nil {
			return "", fmt.Errorf("close generated dockerfile: %w", errors.Join(err, removeErr))
		}
		return "", fmt.Errorf("close generated dockerfile: %w", err)
	}
	return file.Name(), nil
}
