package internal

import (
	"errors"
	"fmt"
	"strings"

	"altinn.studio/releaser/internal/version"
)

// ReleasePublisher identifies a statically wired reusable publisher workflow.
type ReleasePublisher string

// Supported release publishers.
const (
	ReleasePublisherNone      ReleasePublisher = ""
	ReleasePublisherApp       ReleasePublisher = "app"
	ReleasePublisherStudioctl ReleasePublisher = "studioctl"
)

// ReleaseEnvironment identifies the protected GitHub environment for publication.
type ReleaseEnvironment string

// Supported release environments.
const (
	ReleaseEnvironmentDev     ReleaseEnvironment = "dev"
	ReleaseEnvironmentStaging ReleaseEnvironment = "staging"
	ReleaseEnvironmentProd    ReleaseEnvironment = "prod"
)

var (
	errReleaseChannelUnsupported   = errors.New("unsupported prerelease channel")
	errReleasePublisherUnavailable = errors.New("component has no release publisher")
)

func resolveReleaseEnvironment(releaseVersion string) (ReleaseEnvironment, error) {
	parsed, err := version.Parse(normalizeVersionPrefix(releaseVersion))
	if err != nil {
		return "", fmt.Errorf("parse release version: %w", err)
	}
	if !parsed.IsPrerelease {
		return ReleaseEnvironmentProd, nil
	}

	channel, _, _ := strings.Cut(parsed.Prerelease, ".")
	switch channel {
	case "preview":
		return ReleaseEnvironmentDev, nil
	case "rc":
		return ReleaseEnvironmentStaging, nil
	default:
		return "", fmt.Errorf("%w: %s", errReleaseChannelUnsupported, channel)
	}
}
