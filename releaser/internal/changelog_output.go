package internal

import (
	"fmt"
	"strings"

	"altinn.studio/releaser/internal/changelog"
	semver "altinn.studio/releaser/internal/version"
)

const compareBaseURL = "https://github.com/Altinn/altinn-studio/compare"

func withFullChangelogLink(baseContent, previousVersion, currentVersion string) string {
	baseContent = strings.TrimRight(baseContent, "\n")
	previousVersion = strings.TrimSpace(previousVersion)
	currentVersion = strings.TrimSpace(currentVersion)
	if previousVersion == "" || currentVersion == "" {
		return baseContent
	}

	link := fmt.Sprintf("**Full Changelog**: %s/%s...%s", compareBaseURL, previousVersion, currentVersion)
	if baseContent == "" {
		return link
	}
	return baseContent + "\n\n" + link
}

func previousReleasedVersion(cl *changelog.Changelog, currentVersion string) string {
	if cl == nil {
		return ""
	}

	normalizedCurrent := strings.TrimPrefix(strings.TrimSpace(currentVersion), "v")
	currentIndex, current := findCurrentVersion(cl, normalizedCurrent)
	if current == nil {
		return ""
	}

	if current.IsPrerelease {
		// Compare prerelease increments within the same core first.
		if previous := findOlderVersion(cl, currentIndex, func(candidate *semver.Version) bool {
			return candidate.IsPrerelease &&
				candidate.Major == current.Major &&
				candidate.Minor == current.Minor &&
				candidate.Patch == current.Patch
		}); previous != "" {
			return previous
		}
		// First prerelease should compare to the latest prior stable release.
		return findOlderVersion(cl, currentIndex, func(candidate *semver.Version) bool {
			return !candidate.IsPrerelease
		})
	}

	if current.Patch > 0 {
		// Patch releases compare within their stable release line.
		return findOlderVersion(cl, currentIndex, func(candidate *semver.Version) bool {
			return !candidate.IsPrerelease &&
				candidate.Major == current.Major &&
				candidate.Minor == current.Minor
		})
	}

	// First stable in a line should skip prereleases and compare to latest stable before it.
	return findOlderVersion(cl, currentIndex, func(candidate *semver.Version) bool {
		return !candidate.IsPrerelease
	})
}

func findCurrentVersion(cl *changelog.Changelog, normalizedCurrent string) (int, *semver.Version) {
	for i, section := range cl.Versions {
		if section == nil || section.Version == nil {
			continue
		}
		if section.Version.Num == normalizedCurrent {
			return i, section.Version
		}
	}
	return -1, nil
}

func findOlderVersion(cl *changelog.Changelog, currentIndex int, matches func(*semver.Version) bool) string {
	for i := currentIndex + 1; i < len(cl.Versions); i++ {
		section := cl.Versions[i]
		if section == nil || section.Version == nil {
			continue
		}
		if matches(section.Version) {
			return section.Version.String()
		}
	}
	return ""
}
